import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  PrismaService,
  GuestTag,
  ScanResult,
  SentimentType,
  SocialPlatform,
  AuditAction,
} from '../database/prisma.service';
import { SentimentRoiEngine } from './sentiment-roi.engine';
import { CreateMentionDto, GhostingPenaltyDto } from './dto/analytics.dto';

export interface ParticipantSummary {
  guestId: string;
  fullName: string;
  company?: string | null;
  tags: GuestTag[];
  status: 'ACTIVE_CONTRIBUTOR';
  postsCount: number;
  totalReach: number;
  totalLikes: number;
  totalComments: number;
  emvUsd: number;
  emvTry: number;
  averageSentimentScore: number;
  sentiment: SentimentType;
  primaryPlatform: SocialPlatform;
  checkedInAt?: string;
}

export interface GhostedParticipantSummary {
  guestId: string;
  fullName: string;
  company?: string | null;
  title?: string | null;
  tags: GuestTag[];
  status: 'GHOSTED_NO_POST';
  checkedInAt: string;
  guestEnteredCount: number;
  missedReachPotential: number;
  loyaltyScore: number;
  registeredSocialHandles: Array<{
    platform: SocialPlatform;
    handle: string;
    followerCount: number;
  }>;
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sentimentRoiEngine: SentimentRoiEngine,
  ) {}

  // 1. 48 SAATLİK POST-EVENT SOSYAL MEDYA TARAMA VE KAYIT
  async scanPostEventMentions(
    eventId: string,
    simulatedPosts?: CreateMentionDto[],
  ) {
    this.logger.log(`48 saatlik sosyal medya taraması başlatıldı: ${eventId}`);

    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException(`Etkinlik bulunamadı (ID: ${eventId})`);
    }

    const eventStartTime = new Date(event.startsAt).getTime();
    const fortyEightHoursMs = 48 * 60 * 60 * 1000;
    const windowEndTime = eventStartTime + fortyEightHoursMs;

    const createdMentions = [];

    // Gelen paylaşımları işle
    if (simulatedPosts && simulatedPosts.length > 0) {
      for (const post of simulatedPosts) {
        // Duygu analizi motorunu çalıştır
        const sentimentResult = this.sentimentRoiEngine.analyzePostSentiment(
          post.captionText,
          event.movieTitle,
        );

        // EMV (Earned Media Value) hesapla
        const emvResult = this.sentimentRoiEngine.calculateEmv({
          platform: post.platform,
          reachEstimate: post.reachEstimate || 0,
          likesCount: post.likesCount || 0,
          commentsCount: post.commentsCount || 0,
        });

        const postedDate = post.postedAt ? new Date(post.postedAt) : new Date();

        // 48 saatlik pencere kontrolü (bilgi amaçlı)
        const isWithin48Hours =
          postedDate.getTime() >= eventStartTime - 4 * 60 * 60 * 1000 &&
          postedDate.getTime() <= windowEndTime;

        const mention = await this.prisma.postEventMention.create({
          data: {
            eventId,
            guestId: post.guestId,
            platform: post.platform,
            postUrl: post.postUrl,
            postedAt: postedDate,
            reachEstimate: post.reachEstimate || 0,
            likesCount: post.likesCount || 0,
            commentsCount: post.commentsCount || 0,
            sentiment: sentimentResult.sentiment,
            sentimentScore: sentimentResult.sentimentScore,
            aiSummary: sentimentResult.aiSummary,
          },
        });

        createdMentions.push({
          ...mention,
          emvUsd: emvResult.emvUsd,
          emvTry: emvResult.emvTry,
          isWithin48Hours,
        });
      }
    }

    // Güncel mention toplamlarını çek
    const allMentions = await this.prisma.postEventMention.findMany({
      where: { eventId },
      include: {
        guest: {
          select: {
            firstName: true,
            lastName: true,
            tags: true,
          },
        },
      },
    });

    const positiveCount = allMentions.filter(
      (m) => m.sentiment === SentimentType.POSITIVE,
    ).length;
    const neutralCount = allMentions.filter(
      (m) => m.sentiment === SentimentType.NEUTRAL,
    ).length;
    const negativeCount = allMentions.filter(
      (m) => m.sentiment === SentimentType.NEGATIVE,
    ).length;

    return {
      eventId,
      eventTitle: event.title,
      scannedAt: new Date().toISOString(),
      newMentionsAdded: createdMentions.length,
      totalMentionsCount: allMentions.length,
      sentimentSummary: {
        positiveCount,
        neutralCount,
        negativeCount,
        positiveRatio: allMentions.length
          ? parseFloat(((positiveCount / allMentions.length) * 100).toFixed(1))
          : 0,
      },
      mentions: allMentions,
    };
  }

  // 2. GHOSTING INFLUENCER & BASIN TESPİT DEDEKTÖRÜ (ÇOK KRİTİK!)
  async detectNonPostingParticipants(eventId: string) {
    this.logger.log(`Ghosting influencer taraması yapılıyor: ${eventId}`);

    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException(`Etkinlik bulunamadı (ID: ${eventId})`);
    }

    // 1. Hedef kitle: Davet edilmiş, etiketlerinde INFLUENCER, PRESS veya VIP olanlar
    // VE FİİLEN KAPI'DAN GİRİŞ YAPMIŞ (CheckInLog: ScanResult.SUCCESS) olanlar!
    const targetInvitations = await this.prisma.invitation.findMany({
      where: {
        eventId,
        guest: {
          tags: {
            hasSome: [GuestTag.INFLUENCER, GuestTag.PRESS, GuestTag.VIP],
          },
        },
        ticket: {
          checkInLogs: {
            some: {
              scanResult: ScanResult.SUCCESS,
            },
          },
        },
      },
      include: {
        guest: {
          include: {
            socialProfiles: true,
          },
        },
        ticket: {
          include: {
            checkInLogs: {
              where: { scanResult: ScanResult.SUCCESS },
              orderBy: { scannedAt: 'asc' },
            },
          },
        },
      },
    });

    // 2. Bu etkinliğe ait tüm paylaşımları çek
    const mentions = await this.prisma.postEventMention.findMany({
      where: { eventId },
    });

    // GuestId bazında paylaşımları grupla
    const mentionsByGuestId = new Map<string, typeof mentions>();
    for (const mention of mentions) {
      const list = mentionsByGuestId.get(mention.guestId) || [];
      list.push(mention);
      mentionsByGuestId.set(mention.guestId, list);
    }

    const activeContributors: ParticipantSummary[] = [];
    const ghostedParticipants: GhostedParticipantSummary[] = [];

    let totalMissedReach = 0;

    for (const inv of targetInvitations) {
      const guest = inv.guest;
      const guestMentions = mentionsByGuestId.get(guest.id);
      const firstCheckIn = inv.ticket?.checkInLogs[0];
      const checkInTimeStr = firstCheckIn
        ? firstCheckIn.scannedAt.toISOString()
        : new Date().toISOString();
      const enteredCount = firstCheckIn ? firstCheckIn.guestEnteredCount : 1;

      // Katılımcının sosyal medya takipçi potansiyeli
      const totalFollowers = guest.socialProfiles.reduce(
        (sum, profile) => sum + (profile.followerCount || 0),
        0,
      );
      // Profil girilmemişse etiket bazlı varsayılan potansiyel (INFLUENCER için 50k, PRESS için 30k)
      const fallbackPotential = guest.tags.includes(GuestTag.INFLUENCER)
        ? 50000
        : guest.tags.includes(GuestTag.PRESS)
          ? 30000
          : 15000;
      const calculatedPotential =
        totalFollowers > 0 ? totalFollowers : fallbackPotential;

      if (guestMentions && guestMentions.length > 0) {
        // En az 1 paylaşım yapmış -> ACTIVE_CONTRIBUTOR
        let totalReach = 0;
        let totalLikes = 0;
        let totalComments = 0;
        let totalSentimentScore = 0;
        let totalEmvUsd = 0;
        let totalEmvTry = 0;

        for (const m of guestMentions) {
          totalReach += m.reachEstimate;
          totalLikes += m.likesCount;
          totalComments += m.commentsCount;
          totalSentimentScore += m.sentimentScore;

          const emv = this.sentimentRoiEngine.calculateEmv({
            platform: m.platform,
            reachEstimate: m.reachEstimate,
            likesCount: m.likesCount,
            commentsCount: m.commentsCount,
          });
          totalEmvUsd += emv.emvUsd;
          totalEmvTry += emv.emvTry;
        }

        const avgSentimentScore = parseFloat(
          (totalSentimentScore / guestMentions.length).toFixed(2),
        );
        const overallSentiment: SentimentType =
          avgSentimentScore > 0.2
            ? SentimentType.POSITIVE
            : avgSentimentScore < -0.2
              ? SentimentType.NEGATIVE
              : SentimentType.NEUTRAL;

        activeContributors.push({
          guestId: guest.id,
          fullName: `${guest.firstName} ${guest.lastName}`,
          company: guest.company,
          tags: guest.tags,
          status: 'ACTIVE_CONTRIBUTOR',
          postsCount: guestMentions.length,
          totalReach,
          totalLikes,
          totalComments,
          emvUsd: parseFloat(totalEmvUsd.toFixed(2)),
          emvTry: parseFloat(totalEmvTry.toFixed(2)),
          averageSentimentScore: avgSentimentScore,
          sentiment: overallSentiment,
          primaryPlatform: guestMentions[0].platform,
          checkedInAt: checkInTimeStr,
        });
      } else {
        // Kapıdan fiilen geçmiş ancak 48 saat içinde HİÇ PAYLAŞIM YAPMAMIŞ -> GHOSTED_NO_POST
        totalMissedReach += calculatedPotential;

        ghostedParticipants.push({
          guestId: guest.id,
          fullName: `${guest.firstName} ${guest.lastName}`,
          company: guest.company,
          title: guest.title,
          tags: guest.tags,
          status: 'GHOSTED_NO_POST',
          checkedInAt: checkInTimeStr,
          guestEnteredCount: enteredCount,
          missedReachPotential: calculatedPotential,
          loyaltyScore: guest.loyaltyScore,
          registeredSocialHandles: guest.socialProfiles.map((p) => ({
            platform: p.platform,
            handle: p.handle,
            followerCount: p.followerCount,
          })),
        });
      }
    }

    const totalTargetAttendees = targetInvitations.length;
    const ghostingRate = totalTargetAttendees
      ? parseFloat(
          ((ghostedParticipants.length / totalTargetAttendees) * 100).toFixed(
            1,
          ),
        )
      : 0;

    return {
      eventId,
      eventTitle: event.title,
      totalTargetAttendees,
      activeContributorsCount: activeContributors.length,
      ghostedCount: ghostedParticipants.length,
      ghostingRate,
      totalMissedReach,
      activeContributors,
      ghostedParticipants,
    };
  }

  // 3. GHOSTING CEZASI UYGULAMA (SADAKAT PUANI DÜŞÜRME & KARA LİSTE)
  async applyGhostingPenalty(
    guestId: string,
    penaltyDto?: GhostingPenaltyDto,
    userId?: string,
  ) {
    const penaltyPoints = penaltyDto?.penaltyPoints ?? 15.0;
    const reason =
      penaltyDto?.reason ??
      'Galaya katılım sağlandığı halde 48 saat içinde filmle ilgili paylaşım yapılmadı (Ghosting).';
    const isBlacklist = penaltyDto?.blacklist ?? false;

    const guest = await this.prisma.guest.findUnique({
      where: { id: guestId },
    });

    if (!guest) {
      throw new NotFoundException(`Davetli bulunamadı (ID: ${guestId})`);
    }

    const updatedLoyaltyScore = Math.max(0, guest.loyaltyScore - penaltyPoints);
    const updatedTags = isBlacklist
      ? Array.from(new Set([...guest.tags, GuestTag.BLACKLIST]))
      : guest.tags;

    const updatedGuest = await this.prisma.guest.update({
      where: { id: guestId },
      data: {
        loyaltyScore: parseFloat(updatedLoyaltyScore.toFixed(1)),
        isBlacklisted: isBlacklist ? true : guest.isBlacklisted,
        blacklistReason: isBlacklist
          ? `${guest.blacklistReason ? guest.blacklistReason + ' | ' : ''}${reason}`
          : guest.blacklistReason,
        tags: updatedTags,
        noShows: guest.noShows + 1, // Uyarı metriğini artır
      },
    });

    // KVKK Denetim İzi (Audit Log)
    await this.prisma.auditLog.create({
      data: {
        userId: userId || null,
        action: AuditAction.UPDATE_GUEST,
        entityType: 'Guest',
        entityId: guestId,
        metadata: {
          actionType: 'GHOSTING_PENALTY_APPLIED',
          penaltyPoints,
          oldLoyaltyScore: guest.loyaltyScore,
          newLoyaltyScore: updatedLoyaltyScore,
          reason,
          blacklistApplied: isBlacklist,
        },
      },
    });

    return {
      success: true,
      guestId,
      fullName: `${updatedGuest.firstName} ${updatedGuest.lastName}`,
      newLoyaltyScore: updatedGuest.loyaltyScore,
      isBlacklisted: updatedGuest.isBlacklisted,
      message: `Davetliye ${penaltyPoints} puan ghosting cezası uygulandı. Yeni sadakat skoru: ${updatedGuest.loyaltyScore}`,
    };
  }

  // 4. TEK SAYFALIK YÖNETİCİ GALA PR & ERİŞİM RAPORU (EXECUTIVE PR REPORT)
  async getExecutivePrReport(eventId: string) {
    this.logger.log(`Yönetici PR & ROI Raporu hazırlanıyor: ${eventId}`);

    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: {
        invitations: {
          include: {
            ticket: {
              include: {
                checkInLogs: true,
              },
            },
            guest: {
              include: {
                socialProfiles: true,
              },
            },
          },
        },
        mentions: {
          include: {
            guest: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                company: true,
                tags: true,
              },
            },
          },
        },
      },
    });

    if (!event) {
      throw new NotFoundException(`Etkinlik bulunamadı (ID: ${eventId})`);
    }

    // ------------------------------------------------------------------------
    // BÖLÜM 1: OPERASYON & KAPI ÖZETİ
    // ------------------------------------------------------------------------
    const totalCapacity = event.capacity;
    const totalInvited = event.invitations.length;

    let confirmedCount = 0;
    let declinedCount = 0;
    let pendingCount = 0;

    const checkedInTicketIds = new Set<string>();
    let totalGuestsEntered = 0;

    // Siber Güvenlik İhlal İstatistikleri
    let replayAttackBlocked = 0;
    let expiredQrBlocked = 0;
    let revokedBlocked = 0;
    let alreadyCheckedInBlocked = 0;
    let invalidTokenBlocked = 0;

    for (const inv of event.invitations) {
      if (inv.rsvpStatus === 'CONFIRMED') confirmedCount++;
      else if (inv.rsvpStatus === 'DECLINED') declinedCount++;
      else pendingCount++;

      if (inv.ticket && inv.ticket.checkInLogs) {
        for (const log of inv.ticket.checkInLogs) {
          if (log.scanResult === ScanResult.SUCCESS) {
            checkedInTicketIds.add(inv.ticket.id);
            totalGuestsEntered += log.guestEnteredCount;
          } else if (log.scanResult === ScanResult.REPLAY_ATTACK_BLOCKED) {
            replayAttackBlocked++;
          } else if (log.scanResult === ScanResult.EXPIRED_QR) {
            expiredQrBlocked++;
          } else if (log.scanResult === ScanResult.REVOKED) {
            revokedBlocked++;
          } else if (log.scanResult === ScanResult.ALREADY_CHECKED_IN) {
            alreadyCheckedInBlocked++;
          } else if (log.scanResult === ScanResult.INVALID_TOKEN) {
            invalidTokenBlocked++;
          }
        }
      }
    }

    const actualCheckedInCount = checkedInTicketIds.size;
    const attendanceRate = confirmedCount
      ? parseFloat(((actualCheckedInCount / confirmedCount) * 100).toFixed(1))
      : 0;
    const noShowCount = Math.max(0, confirmedCount - actualCheckedInCount);
    const noShowRate = confirmedCount
      ? parseFloat(((noShowCount / confirmedCount) * 100).toFixed(1))
      : 0;
    const totalBlockedCyberAttacks =
      replayAttackBlocked +
      expiredQrBlocked +
      revokedBlocked +
      alreadyCheckedInBlocked +
      invalidTokenBlocked;

    // ------------------------------------------------------------------------
    // BÖLÜM 2: 48 SAATLİK PR & SOSYAL MEDYA ERİŞİM ÖZETİ
    // ------------------------------------------------------------------------
    const totalPostsCount = event.mentions.length;
    let totalOrganicReach = 0;
    let totalLikes = 0;
    let totalComments = 0;
    let earnedMediaValueUsd = 0;
    let earnedMediaValueTry = 0;

    const platformBreakdown: Record<
      SocialPlatform,
      {
        postsCount: number;
        reach: number;
        likes: number;
        comments: number;
        emvUsd: number;
      }
    > = {
      [SocialPlatform.INSTAGRAM]: {
        postsCount: 0,
        reach: 0,
        likes: 0,
        comments: 0,
        emvUsd: 0,
      },
      [SocialPlatform.TIKTOK]: {
        postsCount: 0,
        reach: 0,
        likes: 0,
        comments: 0,
        emvUsd: 0,
      },
      [SocialPlatform.YOUTUBE]: {
        postsCount: 0,
        reach: 0,
        likes: 0,
        comments: 0,
        emvUsd: 0,
      },
      [SocialPlatform.X]: {
        postsCount: 0,
        reach: 0,
        likes: 0,
        comments: 0,
        emvUsd: 0,
      },
    };

    let totalSentimentScore = 0;
    let positiveCount = 0;
    let neutralCount = 0;
    let negativeCount = 0;
    const highlightedSummaries: string[] = [];

    // Davetli bazında performans haritası
    const guestPerformanceMap = new Map<
      string,
      {
        guestId: string;
        fullName: string;
        company?: string | null;
        tags: GuestTag[];
        reach: number;
        likes: number;
        comments: number;
        emvUsd: number;
        sentimentScore: number;
        postsCount: number;
      }
    >();

    for (const m of event.mentions) {
      totalOrganicReach += m.reachEstimate;
      totalLikes += m.likesCount;
      totalComments += m.commentsCount;
      totalSentimentScore += m.sentimentScore;

      const emv = this.sentimentRoiEngine.calculateEmv({
        platform: m.platform,
        reachEstimate: m.reachEstimate,
        likesCount: m.likesCount,
        commentsCount: m.commentsCount,
      });

      earnedMediaValueUsd += emv.emvUsd;
      earnedMediaValueTry += emv.emvTry;

      // Platform breakdown
      if (platformBreakdown[m.platform]) {
        platformBreakdown[m.platform].postsCount += 1;
        platformBreakdown[m.platform].reach += m.reachEstimate;
        platformBreakdown[m.platform].likes += m.likesCount;
        platformBreakdown[m.platform].comments += m.commentsCount;
        platformBreakdown[m.platform].emvUsd = parseFloat(
          (platformBreakdown[m.platform].emvUsd + emv.emvUsd).toFixed(2),
        );
      }

      // Duygu skorları
      if (m.sentiment === SentimentType.POSITIVE) positiveCount++;
      else if (m.sentiment === SentimentType.NEGATIVE) negativeCount++;
      else neutralCount++;

      if (m.aiSummary && highlightedSummaries.length < 5) {
        highlightedSummaries.push(m.aiSummary);
      }

      // Davetli performans birikimi
      const existing = guestPerformanceMap.get(m.guestId) || {
        guestId: m.guestId,
        fullName: `${m.guest.firstName} ${m.guest.lastName}`,
        company: m.guest.company,
        tags: m.guest.tags,
        reach: 0,
        likes: 0,
        comments: 0,
        emvUsd: 0,
        sentimentScore: 0,
        postsCount: 0,
      };

      existing.reach += m.reachEstimate;
      existing.likes += m.likesCount;
      existing.comments += m.commentsCount;
      existing.emvUsd += emv.emvUsd;
      existing.sentimentScore += m.sentimentScore;
      existing.postsCount += 1;

      guestPerformanceMap.set(m.guestId, existing);
    }

    const totalEngagements = totalLikes + totalComments;

    // ------------------------------------------------------------------------
    // BÖLÜM 3: DUYGU ANALİZİ DAĞILIMI
    // ------------------------------------------------------------------------
    const positivePercentage = totalPostsCount
      ? parseFloat(((positiveCount / totalPostsCount) * 100).toFixed(1))
      : 0;
    const neutralPercentage = totalPostsCount
      ? parseFloat(((neutralCount / totalPostsCount) * 100).toFixed(1))
      : 0;
    const negativePercentage = totalPostsCount
      ? parseFloat(((negativeCount / totalPostsCount) * 100).toFixed(1))
      : 0;
    const averageSentimentScore = totalPostsCount
      ? parseFloat((totalSentimentScore / totalPostsCount).toFixed(2))
      : 0.0;

    // ------------------------------------------------------------------------
    // BÖLÜM 4: INFLUENCER PERFORMANS VE GHOSTING TABLOSU
    // ------------------------------------------------------------------------
    // Top 5 Katılımcı
    const topInfluencers = Array.from(guestPerformanceMap.values())
      .sort((a, b) => b.reach - a.reach)
      .slice(0, 5)
      .map((item) => ({
        ...item,
        emvUsd: parseFloat(item.emvUsd.toFixed(2)),
        averageSentiment: parseFloat(
          (item.sentimentScore / item.postsCount).toFixed(2),
        ),
      }));

    // Ghosting Analizi Çağrısı
    const ghostingAnalysis = await this.detectNonPostingParticipants(eventId);

    // Üst Yönetim için 1 Cümlelik Yönetici Özeti (Executive Synthesis)
    const executiveSummaryStatement =
      `"${event.title}" galası %${attendanceRate} fiili kapı katılımı ile gerçekleştirilmiş olup, ` +
      `48 saat içinde ${totalPostsCount} adet paylaşımla toplam ${totalOrganicReach.toLocaleString('tr-TR')} organik erişim ve ` +
      `$${earnedMediaValueUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })} EMV reklam eşdeğerine ulaşmıştır. ` +
      `Paylaşımların %${positivePercentage}'i son derece pozitif duygu içermekte; kapıdan giriş yapan ${ghostingAnalysis.ghostedCount} davetli hiç paylaşım yapmamıştır.`;

    return {
      reportGeneratedAt: new Date().toISOString(),
      event: {
        id: event.id,
        title: event.title,
        movieTitle: event.movieTitle,
        venue: event.venue,
        startsAt: event.startsAt,
        doorsOpenAt: event.doorsOpenAt,
        capacity: event.capacity,
      },
      // Bölüm 1: Operasyon & Kapı Özeti
      operationDoorSummary: {
        totalCapacity,
        totalInvited,
        confirmedCount,
        declinedCount,
        pendingCount,
        actualCheckedInCount,
        totalGuestsEntered,
        attendanceRate,
        noShowCount,
        noShowRate,
        securityAttacksBlocked: {
          replayAttackBlocked,
          expiredQrBlocked,
          revokedBlocked,
          alreadyCheckedInBlocked,
          invalidTokenBlocked,
          totalBlocked: totalBlockedCyberAttacks,
        },
      },
      // Bölüm 2: 48 Saatlik PR & Sosyal Medya Erişim Özeti
      socialPrSummary: {
        totalPostsCount,
        totalOrganicReach,
        totalEngagements,
        totalLikes,
        totalComments,
        earnedMediaValueUsd: parseFloat(earnedMediaValueUsd.toFixed(2)),
        earnedMediaValueTry: parseFloat(earnedMediaValueTry.toFixed(2)),
        platformBreakdown,
      },
      // Bölüm 3: Duygu Analizi Dağılımı
      sentimentAnalysisSummary: {
        positiveCount,
        positivePercentage,
        neutralCount,
        neutralPercentage,
        negativeCount,
        negativePercentage,
        averageSentimentScore,
        highlightedSummaries,
      },
      // Bölüm 4: Influencer Performans & Ghosting
      influencerPerformanceSummary: {
        topInfluencers,
        ghostingMetrics: {
          totalTargetAttendees: ghostingAnalysis.totalTargetAttendees,
          activeContributorsCount: ghostingAnalysis.activeContributorsCount,
          ghostedCount: ghostingAnalysis.ghostedCount,
          ghostingRate: ghostingAnalysis.ghostingRate,
          totalMissedReach: ghostingAnalysis.totalMissedReach,
        },
        ghostedParticipants: ghostingAnalysis.ghostedParticipants,
      },
      executiveSummaryStatement,
    };
  }
}
