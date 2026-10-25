import { Injectable, Logger, OnModuleInit, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { SocialScraperProvider } from './social-scraper.provider';
import {
  SocialQueueProcessor,
  SocialScrapeJob,
} from './social-queue.processor';
import { GuestTag, SocialPlatform, ScrapeStatus } from '@prisma/client';
import * as crypto from 'crypto';

@Injectable()
export class SocialWorkerService implements OnModuleInit {
  private readonly logger = new Logger(SocialWorkerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly scraperProvider: SocialScraperProvider,
    private readonly queueProcessor: SocialQueueProcessor
  ) {}

  onModuleInit() {
    // Kuyruk işlemcisini servis iş mantığına bağla
    this.queueProcessor.registerProcessor(async (job: SocialScrapeJob) => {
      await this.processJob(job);
    });
    this.logger.log('SocialWorkerService kuyruk işlemcisi başarıyla bağlandı.');
  }

  /**
   * Kuyruktan gelen tekil işi yürütür ve veritabanını günceller
   */
  async processJob(job: SocialScrapeJob): Promise<void> {
    const { profileId, platform, handle, tags } = job.data;

    // Durumu PENDING yap
    await this.prisma.socialProfile.update({
      where: { id: profileId },
      data: { scrapeStatus: ScrapeStatus.PENDING },
    });

    // Metrikleri çek
    const metrics = await this.scraperProvider.scrapeProfile(platform, handle, tags);

    // Başarıyla tamamlandıysa veritabanına yaz
    await this.prisma.socialProfile.update({
      where: { id: profileId },
      data: {
        followerCount: metrics.followerCount,
        engagementRate: metrics.engagementRate,
        scrapeStatus: ScrapeStatus.COMPLETED,
        lastScrapedAt: metrics.lastScrapedAt,
      },
    });

    this.logger.log(
      `[SocialWorker] Profil güncellendi: ${platform} - ${handle} -> ${metrics.followerCount.toLocaleString()} takipçi, %${metrics.engagementRate} etkileşim`
    );
  }

  /**
   * Tüm davetlilerin veya seçilen segmentteki davetlilerin profillerini kuyruğa ekler
   */
  async enqueueBatchScrape(tag?: GuestTag): Promise<{
    batchId: string;
    enqueuedCount: number;
    message: string;
  }> {
    const batchId = `batch_${crypto.randomBytes(6).toString('hex')}`;

    // Filtreleme: İsteğe bağlı etiket bazlı filtreleme
    const whereClause: any = {};
    if (tag) {
      whereClause.tags = { has: tag };
    }

    const guests = await this.prisma.guest.findMany({
      where: whereClause,
      include: {
        socialProfiles: true,
      },
    });

    let enqueuedCount = 0;

    for (const guest of guests) {
      // Eğer davetlinin hiç profili yoksa örnek bir Instagram profili oluşturalım
      if (guest.socialProfiles.length === 0) {
        const defaultHandle = `@${guest.firstName.toLowerCase()}_${guest.lastName.toLowerCase()}`.replace(/[^a-z0-9_]/g, '');
        const newProfile = await this.prisma.socialProfile.create({
          data: {
            guestId: guest.id,
            platform: SocialPlatform.INSTAGRAM,
            handle: defaultHandle,
            scrapeStatus: ScrapeStatus.IDLE,
          },
        });
        guest.socialProfiles.push(newProfile);
      }

      for (const profile of guest.socialProfiles) {
        await this.queueProcessor.addJob({
          profileId: profile.id,
          guestId: guest.id,
          platform: profile.platform,
          handle: profile.handle,
          tags: guest.tags,
        });
        enqueuedCount++;
      }
    }

    this.logger.log(
      `[SocialWorker] Toplu senkronizasyon kuyruğa alındı (Batch: ${batchId}, Profil Sayısı: ${enqueuedCount})`
    );

    return {
      batchId,
      enqueuedCount,
      message: `${enqueuedCount} adet sosyal medya profili asenkron güncelleme kuyruğuna alındı.`,
    };
  }

  /**
   * Tekil bir davetlinin tüm sosyal profillerini anında kuyruğa alır
   */
  async syncGuestProfiles(guestId: string): Promise<{
    guestId: string;
    guestName: string;
    profilesSynced: number;
    jobs: SocialScrapeJob[];
  }> {
    const guest = await this.prisma.guest.findUnique({
      where: { id: guestId },
      include: { socialProfiles: true },
    });

    if (!guest) {
      throw new NotFoundException(`Davetli bulunamadı: ${guestId}`);
    }

    // Profil yoksa varsayılan profiller oluştur
    if (guest.socialProfiles.length === 0) {
      const cleanName = `${guest.firstName.toLowerCase()}_${guest.lastName.toLowerCase()}`.replace(/[^a-z0-9_]/g, '');
      const ig = await this.prisma.socialProfile.create({
        data: {
          guestId: guest.id,
          platform: SocialPlatform.INSTAGRAM,
          handle: `@${cleanName}`,
        },
      });
      const yt = await this.prisma.socialProfile.create({
        data: {
          guestId: guest.id,
          platform: SocialPlatform.YOUTUBE,
          handle: `@${cleanName}_official`,
        },
      });
      guest.socialProfiles.push(ig, yt);
    }

    const jobs: SocialScrapeJob[] = [];
    for (const profile of guest.socialProfiles) {
      const job = await this.queueProcessor.addJob({
        profileId: profile.id,
        guestId: guest.id,
        platform: profile.platform,
        handle: profile.handle,
        tags: guest.tags,
      });
      jobs.push(job);
    }

    return {
      guestId: guest.id,
      guestName: `${guest.firstName} ${guest.lastName}`,
      profilesSynced: guest.socialProfiles.length,
      jobs,
    };
  }

  /**
   * Kuyruk ve Metrik Durum Raporu
   */
  async getQueueStatus() {
    const queueStats = this.queueProcessor.getStats();

    // Toplam erişim (Total Reach) ve platform bazlı istatistikler
    const allProfiles = await this.prisma.socialProfile.findMany({
      include: {
        guest: {
          select: { firstName: true, lastName: true },
        },
      },
      orderBy: { lastScrapedAt: 'desc' },
      take: 100,
    });

    const totalReach = allProfiles.reduce((acc, p) => acc + (p.followerCount || 0), 0);

    const platformGroupMap = new Map<
      SocialPlatform,
      { count: number; totalFollowers: number; sumEngagement: number }
    >();

    for (const platform of Object.values(SocialPlatform)) {
      platformGroupMap.set(platform, { count: 0, totalFollowers: 0, sumEngagement: 0 });
    }

    for (const p of allProfiles) {
      const entry = platformGroupMap.get(p.platform) || {
        count: 0,
        totalFollowers: 0,
        sumEngagement: 0,
      };
      entry.count += 1;
      entry.totalFollowers += p.followerCount || 0;
      entry.sumEngagement += p.engagementRate || 0;
      platformGroupMap.set(p.platform, entry);
    }

    const platformStats = Array.from(platformGroupMap.entries()).map(
      ([platform, data]) => ({
        platform,
        profileCount: data.count,
        totalFollowers: data.totalFollowers,
        avgEngagementRate:
          data.count > 0 ? Math.round((data.sumEngagement / data.count) * 100) / 100 : 0.0,
      })
    );

    const recentProfiles = allProfiles.slice(0, 15).map((p) => ({
      id: p.id,
      guestName: `${p.guest.firstName} ${p.guest.lastName}`,
      platform: p.platform,
      handle: p.handle,
      followerCount: p.followerCount,
      engagementRate: p.engagementRate,
      lastScrapedAt: p.lastScrapedAt,
      scrapeStatus: p.scrapeStatus,
    }));

    return {
      queueStats,
      totalReach,
      platformStats,
      recentProfiles,
    };
  }
}
