import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { SecurityService } from '../security/security.service';
import { AuditLogService } from '../security/audit-log.service';
import { AuditAction, GuestTag, SocialPlatform, Prisma } from '@prisma/client';
import {
  CreateGuestDto,
  UpdateGuestDto,
  GuestFilterQueryDto,
} from './dto/crm.dto';
import {
  calculateLoyaltyScore,
  resolveLoyaltyTier,
} from './loyalty-score.calculator';

export interface MaskedGuestResponse {
  id: string;
  firstName: string;
  lastName: string;
  company: string | null;
  title: string | null;
  email: string;
  phone: string | null;
  tags: GuestTag[];
  loyaltyScore: number;
  loyaltyTier: string;
  totalInvited: number;
  totalAttended: number;
  lastMinuteCancels: number;
  noShows: number;
  isBlacklisted: boolean;
  blacklistReason: string | null;
  createdAt: Date;
  updatedAt: Date;
  socialProfiles?: Array<{
    platform: SocialPlatform;
    handle: string;
    followerCount: number;
    engagementRate: number;
  }>;
}

@Injectable()
export class CrmService {
  private readonly logger = new Logger(CrmService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly securityService: SecurityService,
    private readonly auditLogService: AuditLogService
  ) {}

  // 1. TEKİL DAVETLİ OLUŞTURMA (KRİPTOGRAFİK ŞİFRELEME & BLIND INDEX)

  /**
   * Yeni Davetli Oluşturma
   * E-posta ve telefon normalize edilir, HMAC Blind Index üretilir,
   * AES-256-GCM ile şifrelenir ve sadakat puanı hesaplanır.
   */
  async createGuest(dto: CreateGuestDto): Promise<MaskedGuestResponse> {
    const normalizedEmail = this.securityService.normalizeEmail(dto.email);
    const emailBlindIndex = this.securityService.generateEmailBlindIndex(normalizedEmail);

    let normalizedPhone: string | null = null;
    let phoneBlindIndex: string | null = null;

    if (dto.phone) {
      normalizedPhone = this.securityService.normalizePhone(dto.phone);
      if (normalizedPhone) {
        phoneBlindIndex = this.securityService.generatePhoneBlindIndex(normalizedPhone);
      }
    }

    // Mükerrer Kayıt Engelleme (Deduping Check)
    const orConditions: Prisma.GuestWhereInput[] = [{ emailBlindIndex }];
    if (phoneBlindIndex) {
      orConditions.push({ phoneBlindIndex });
    }

    const existing = await this.prisma.guest.findFirst({
      where: { OR: orConditions },
    });

    if (existing) {
      throw new ConflictException(
        'Bu e-posta adresi veya telefon numarası ile kayıtlı bir davetli zaten mevcut.'
      );
    }

    // Şifreleme (AES-256-GCM)
    const emailEncrypted = this.securityService.encrypt(normalizedEmail);
    const phoneEncrypted = normalizedPhone
      ? this.securityService.encrypt(normalizedPhone)
      : null;

    const tags = dto.tags || [];
    const isBlacklisted = tags.includes(GuestTag.BLACKLIST);

    // Sadakat Skoru Hesaplama (Yeni davetli = 100.0)
    const { score: loyaltyScore } = calculateLoyaltyScore({
      totalInvited: 0,
      totalAttended: 0,
      lastMinuteCancels: 0,
      noShows: 0,
      isBlacklisted,
      tags,
    });

    const guest = await this.prisma.guest.create({
      data: {
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        company: dto.company?.trim() || null,
        title: dto.title?.trim() || null,
        emailEncrypted,
        emailBlindIndex,
        phoneEncrypted,
        phoneBlindIndex,
        tags,
        loyaltyScore,
        isBlacklisted,
      },
    });

    // Sosyal Medya Profillerini Kaydet
    await this.saveSocialProfiles(guest.id, dto);

    const guestWithProfiles = await this.prisma.guest.findUniqueOrThrow({
      where: { id: guest.id },
      include: { socialProfiles: true },
    });

    return this.toMaskedResponse(guestWithProfiles);
  }

  // 2. DAVETLİ GÜNCELLEME

  /**
   * Davetli Bilgilerini Güncelleme
   */
  async updateGuest(id: string, dto: UpdateGuestDto): Promise<MaskedGuestResponse> {
    const existing = await this.prisma.guest.findUnique({
      where: { id },
      include: { socialProfiles: true },
    });

    if (!existing) {
      throw new NotFoundException('Güncellenecek davetli bulunamadı.');
    }

    const updateData: Prisma.GuestUpdateInput = {};

    if (dto.firstName) updateData.firstName = dto.firstName.trim();
    if (dto.lastName) updateData.lastName = dto.lastName.trim();
    if (dto.company !== undefined) updateData.company = dto.company?.trim() || null;
    if (dto.title !== undefined) updateData.title = dto.title?.trim() || null;

    // E-posta değişikliği
    if (dto.email) {
      const normalizedEmail = this.securityService.normalizeEmail(dto.email);
      const emailBlindIndex = this.securityService.generateEmailBlindIndex(normalizedEmail);

      // Başka kullanıcıda var mı kontrol et
      const duplicate = await this.prisma.guest.findFirst({
        where: { emailBlindIndex, id: { not: id } },
      });
      if (duplicate) {
        throw new ConflictException('Bu e-posta adresi başka bir davetli tarafından kullanılıyor.');
      }

      updateData.emailBlindIndex = emailBlindIndex;
      updateData.emailEncrypted = this.securityService.encrypt(normalizedEmail);
    }

    // Telefon değişikliği
    if (dto.phone !== undefined) {
      if (dto.phone) {
        const normalizedPhone = this.securityService.normalizePhone(dto.phone);
        const phoneBlindIndex = this.securityService.generatePhoneBlindIndex(normalizedPhone);

        const duplicate = await this.prisma.guest.findFirst({
          where: { phoneBlindIndex, id: { not: id } },
        });
        if (duplicate) {
          throw new ConflictException('Bu telefon numarası başka bir davetli tarafından kullanılıyor.');
        }

        updateData.phoneBlindIndex = phoneBlindIndex;
        updateData.phoneEncrypted = this.securityService.encrypt(normalizedPhone);
      } else {
        updateData.phoneBlindIndex = null;
        updateData.phoneEncrypted = null;
      }
    }

    // Etiketler ve Kara Liste
    let currentTags = dto.tags !== undefined ? dto.tags : existing.tags;
    let currentIsBlacklisted =
      dto.isBlacklisted !== undefined ? dto.isBlacklisted : existing.isBlacklisted;

    if (dto.isBlacklisted !== undefined) {
      updateData.isBlacklisted = dto.isBlacklisted;
      updateData.blacklistReason = dto.blacklistReason || null;

      if (dto.isBlacklisted && !currentTags.includes(GuestTag.BLACKLIST)) {
        currentTags = [...currentTags, GuestTag.BLACKLIST];
      } else if (!dto.isBlacklisted && currentTags.includes(GuestTag.BLACKLIST)) {
        currentTags = currentTags.filter((t) => t !== GuestTag.BLACKLIST);
      }
    }

    if (dto.tags !== undefined) {
      updateData.tags = currentTags;
    }

    // Metrikler
    const totalInvited = dto.totalInvited !== undefined ? dto.totalInvited : existing.totalInvited;
    const totalAttended = dto.totalAttended !== undefined ? dto.totalAttended : existing.totalAttended;
    const lastMinuteCancels =
      dto.lastMinuteCancels !== undefined ? dto.lastMinuteCancels : existing.lastMinuteCancels;
    const noShows = dto.noShows !== undefined ? dto.noShows : existing.noShows;

    if (dto.totalInvited !== undefined) updateData.totalInvited = totalInvited;
    if (dto.totalAttended !== undefined) updateData.totalAttended = totalAttended;
    if (dto.lastMinuteCancels !== undefined) updateData.lastMinuteCancels = lastMinuteCancels;
    if (dto.noShows !== undefined) updateData.noShows = noShows;

    // Sadakat Skoru Yeniden Hesaplama
    const { score: loyaltyScore } = calculateLoyaltyScore({
      totalInvited,
      totalAttended,
      lastMinuteCancels,
      noShows,
      isBlacklisted: currentIsBlacklisted,
      tags: currentTags,
    });
    updateData.loyaltyScore = loyaltyScore;

    const updated = await this.prisma.guest.update({
      where: { id },
      data: updateData,
      include: { socialProfiles: true },
    });

    // Sosyal Profiller
    await this.saveSocialProfiles(id, dto);

    const refetched = await this.prisma.guest.findUniqueOrThrow({
      where: { id },
      include: { socialProfiles: true },
    });

    return this.toMaskedResponse(refetched);
  }

  // 3. KVKK UYUMLU LİSTELEME VE KRİPTOGRAFİK ARAMA (findAllGuests)

  /**
   * Davetlileri Listeleme (Maskeli PII + Özet İstatistikler)
   * Arama kutusunda e-posta (@) veya telefon girilirse deterministik Blind Index tam eşleşmesi yapar.
   * Metin aramalarında firstName, lastName, company alanlarında arar.
   */
  async findAllGuests(query: GuestFilterQueryDto = {}) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.GuestWhereInput = {};

    // 1. Kriptografik Arama Mantığı
    if (query.search && query.search.trim()) {
      const searchTerm = query.search.trim();

      if (searchTerm.includes('@')) {
        // E-posta Blind Index ile tam eşleşme araması
        const emailBlindIndex = this.securityService.generateEmailBlindIndex(searchTerm);
        where.emailBlindIndex = emailBlindIndex;
      } else if (this.isPhoneLike(searchTerm)) {
        // Telefon Blind Index ile tam eşleşme araması
        const phoneBlindIndex = this.securityService.generatePhoneBlindIndex(searchTerm);
        where.phoneBlindIndex = phoneBlindIndex;
      } else {
        // İsim, Soyisim, Kurum veya Ünvan Metin Araması
        where.OR = [
          { firstName: { contains: searchTerm, mode: 'insensitive' } },
          { lastName: { contains: searchTerm, mode: 'insensitive' } },
          { company: { contains: searchTerm, mode: 'insensitive' } },
          { title: { contains: searchTerm, mode: 'insensitive' } },
        ];
      }
    }

    // 2. Segmentasyon Etiket Filtresi
    if (query.tag) {
      where.tags = { has: query.tag as GuestTag };
    } else if (query.tags) {
      const tagList = query.tags.split(',').map((t) => t.trim().toUpperCase()) as GuestTag[];
      where.tags = { hasSome: tagList };
    }

    // 3. Kara Liste Durumu
    if (query.isBlacklisted !== undefined) {
      where.isBlacklisted = query.isBlacklisted;
    }

    // 4. Sadakat Skoru Filtresi
    if (query.minLoyaltyScore !== undefined || query.maxLoyaltyScore !== undefined) {
      where.loyaltyScore = {};
      if (query.minLoyaltyScore !== undefined) {
        where.loyaltyScore.gte = Number(query.minLoyaltyScore);
      }
      if (query.maxLoyaltyScore !== undefined) {
        where.loyaltyScore.lte = Number(query.maxLoyaltyScore);
      }
    }

    // Veritabanı Sorguları (Paralel)
    const [guests, total, totalCount, vipCount, pressCount, blacklistedCount, avgLoyalty] =
      await Promise.all([
        this.prisma.guest.findMany({
          where,
          include: { socialProfiles: true },
          orderBy: [{ loyaltyScore: 'desc' }, { createdAt: 'desc' }],
          skip,
          take: limit,
        }),
        this.prisma.guest.count({ where }),
        this.prisma.guest.count(),
        this.prisma.guest.count({ where: { tags: { has: GuestTag.VIP } } }),
        this.prisma.guest.count({ where: { tags: { has: GuestTag.PRESS } } }),
        this.prisma.guest.count({ where: { isBlacklisted: true } }),
        this.prisma.guest.aggregate({
          _avg: { loyaltyScore: true },
        }),
      ]);

    const items = guests.map((guest) => this.toMaskedResponse(guest));

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
      stats: {
        totalGuests: totalCount,
        vipCount,
        pressCount,
        blacklistedCount,
        averageLoyaltyScore: Math.round((avgLoyalty._avg.loyaltyScore || 100) * 10) / 10,
      },
    };
  }

  /**
   * Tekil Davetli Detayı (Maskelenmiş PII)
   */
  async findOneGuest(id: string): Promise<MaskedGuestResponse> {
    const guest = await this.prisma.guest.findUnique({
      where: { id },
      include: { socialProfiles: true },
    });

    if (!guest) {
      throw new NotFoundException('Davetli bulunamadı.');
    }

    return this.toMaskedResponse(guest);
  }

  // 4. AÇIK PII GÖRÜNTÜLEME (ZORUNLU AUDIT LOG KAYDI: VIEW_PII)

  /**
   * Açık PII Verisi Görüntüleme
   * Yetkili PR yöneticisi veya yönetici açık e-posta ve telefonu görmek istediğinde çağrılır.
   * Zorunlu olarak AuditAction.VIEW_PII kaydını düşer.
   */
  async revealGuestPii(
    guestId: string,
    user?: any,
    ip?: string,
    userAgent?: string
  ) {
    const guest = await this.prisma.guest.findUnique({
      where: { id: guestId },
    });

    if (!guest) {
      throw new NotFoundException('Davetli bulunamadı.');
    }

    let email = '';
    let phone: string | null = null;

    try {
      email = this.securityService.decrypt(guest.emailEncrypted);
    } catch {
      email = 'Şifre Çözülemedi';
    }

    if (guest.phoneEncrypted) {
      try {
        phone = this.securityService.decrypt(guest.phoneEncrypted);
      } catch {
        phone = 'Şifre Çözülemedi';
      }
    }

    // KVKK ZORUNLU DENETİM İZİ KAYDI
    await this.auditLogService.log({
      userId: user?.id || user?.sub || null,
      action: AuditAction.VIEW_PII,
      entityType: 'Guest',
      entityId: guestId,
      metadata: {
        guestName: `${guest.firstName} ${guest.lastName}`,
        revealedFields: ['email', phone ? 'phone' : null].filter(Boolean),
        reason: 'PR Yetkilisi tarafından açık iletişim bilgisi talep edildi.',
      },
      ipAddress: ip,
      userAgent: userAgent,
    });

    this.logger.warn(
      `[KVKK_AUDIT] Davetli PII görüntülendi! GuestID: ${guestId}, Personel: ${user?.id || 'ANONYMOUS'}, IP: ${ip || 'Bilinmiyor'}`
    );

    return {
      id: guest.id,
      firstName: guest.firstName,
      lastName: guest.lastName,
      email,
      phone,
      revealedAt: new Date().toISOString(),
    };
  }

  // 5. KARA LİSTE VE GEÇMİŞ ETKİNLİK SİMÜLASYONU

  /**
   * Kara Listeye Alma / Çıkarma
   * BLACKLIST etiketini senkronize eder ve sadakat skorunu anında 0.0 (veya normal) yapar.
   */
  async toggleBlacklist(
    guestId: string,
    isBlacklisted: boolean,
    reason?: string,
    userId?: string
  ): Promise<MaskedGuestResponse> {
    const guest = await this.prisma.guest.findUnique({
      where: { id: guestId },
      include: { socialProfiles: true },
    });

    if (!guest) {
      throw new NotFoundException('Davetli bulunamadı.');
    }

    let updatedTags = [...guest.tags];
    if (isBlacklisted && !updatedTags.includes(GuestTag.BLACKLIST)) {
      updatedTags.push(GuestTag.BLACKLIST);
    } else if (!isBlacklisted && updatedTags.includes(GuestTag.BLACKLIST)) {
      updatedTags = updatedTags.filter((t) => t !== GuestTag.BLACKLIST);
    }

    const { score: loyaltyScore } = calculateLoyaltyScore({
      totalInvited: guest.totalInvited,
      totalAttended: guest.totalAttended,
      lastMinuteCancels: guest.lastMinuteCancels,
      noShows: guest.noShows,
      isBlacklisted,
      tags: updatedTags,
    });

    const updated = await this.prisma.guest.update({
      where: { id: guestId },
      data: {
        isBlacklisted,
        blacklistReason: reason || (isBlacklisted ? 'PR Yöneticisi tarafından kara listeye alındı.' : null),
        tags: updatedTags,
        loyaltyScore,
      },
      include: { socialProfiles: true },
    });

    this.logger.log(
      `[CRM_BLACKLIST] Davetli #${guestId} kara liste durumu güncellendi: ${isBlacklisted} (Yapan: ${userId || 'SYSTEM'})`
    );

    return this.toMaskedResponse(updated);
  }

  /**
   * Etkinlik Katılım Çıktısını Kaydetme ve Sadakat Puanını Güncelleme
   */
  async recordAttendanceOutcome(
    guestId: string,
    outcome: 'ATTENDED' | 'LAST_MINUTE_CANCEL' | 'NO_SHOW'
  ): Promise<MaskedGuestResponse> {
    const guest = await this.prisma.guest.findUnique({
      where: { id: guestId },
      include: { socialProfiles: true },
    });

    if (!guest) {
      throw new NotFoundException('Davetli bulunamadı.');
    }

    const totalInvited = guest.totalInvited + 1;
    let totalAttended = guest.totalAttended;
    let lastMinuteCancels = guest.lastMinuteCancels;
    let noShows = guest.noShows;

    if (outcome === 'ATTENDED') {
      totalAttended += 1;
    } else if (outcome === 'LAST_MINUTE_CANCEL') {
      lastMinuteCancels += 1;
    } else if (outcome === 'NO_SHOW') {
      noShows += 1;
    }

    const { score: loyaltyScore } = calculateLoyaltyScore({
      totalInvited,
      totalAttended,
      lastMinuteCancels,
      noShows,
      isBlacklisted: guest.isBlacklisted,
      tags: guest.tags,
    });

    const updated = await this.prisma.guest.update({
      where: { id: guestId },
      data: {
        totalInvited,
        totalAttended,
        lastMinuteCancels,
        noShows,
        loyaltyScore,
      },
      include: { socialProfiles: true },
    });

    return this.toMaskedResponse(updated);
  }

  /**
   * Davetli Silme (KVKK Silme Hakkı)
   */
  async deleteGuest(id: string): Promise<{ success: boolean; message: string }> {
    const guest = await this.prisma.guest.findUnique({
      where: { id },
    });

    if (!guest) {
      throw new NotFoundException('Silinecek davetli bulunamadı.');
    }

    await this.prisma.guest.delete({
      where: { id },
    });

    return {
      success: true,
      message: `${guest.firstName} ${guest.lastName} isimli davetli ve ilişkili tüm verileri başarıyla silindi.`,
    };
  }

  // YARDIMCI VE DÖNÜŞTÜRÜCÜ METOTLAR

  /**
   * Arama teriminin telefon numarası benzeri olup olmadığını kontrol eder
   */
  private isPhoneLike(term: string): boolean {
    const digitsOnly = term.replace(/[^\d]/g, '');
    return digitsOnly.length >= 6 || (term.startsWith('+') && digitsOnly.length >= 4);
  }

  /**
   * Veritabanı kaydını KVKK maskelenmiş güvenli frontend yanıtına dönüştürür
   */
  private toMaskedResponse(guest: any): MaskedGuestResponse {
    let plainEmail = '';
    let plainPhone: string | null = null;

    try {
      plainEmail = this.securityService.decrypt(guest.emailEncrypted);
    } catch {
      plainEmail = '***@***.com';
    }

    if (guest.phoneEncrypted) {
      try {
        plainPhone = this.securityService.decrypt(guest.phoneEncrypted);
      } catch {
        plainPhone = '***';
      }
    }

    const maskedEmail = this.securityService.maskEmail(plainEmail);
    const maskedPhone = plainPhone ? this.securityService.maskPhone(plainPhone) : null;
    const loyaltyTier = resolveLoyaltyTier(guest.loyaltyScore);

    return {
      id: guest.id,
      firstName: guest.firstName,
      lastName: guest.lastName,
      company: guest.company,
      title: guest.title,
      email: maskedEmail,
      phone: maskedPhone,
      tags: guest.tags,
      loyaltyScore: guest.loyaltyScore,
      loyaltyTier,
      totalInvited: guest.totalInvited,
      totalAttended: guest.totalAttended,
      lastMinuteCancels: guest.lastMinuteCancels,
      noShows: guest.noShows,
      isBlacklisted: guest.isBlacklisted,
      blacklistReason: guest.blacklistReason,
      createdAt: guest.createdAt,
      updatedAt: guest.updatedAt,
      socialProfiles: guest.socialProfiles?.map((p: any) => ({
        platform: p.platform,
        handle: p.handle,
        followerCount: p.followerCount,
        engagementRate: p.engagementRate,
      })),
    };
  }

  /**
   * Sosyal medya kullanıcı adlarını kaydeder
   */
  private async saveSocialProfiles(
    guestId: string,
    dto: {
      instagramHandle?: string;
      youtubeHandle?: string;
      tiktokHandle?: string;
      xHandle?: string;
    }
  ) {
    const list: Array<{ platform: SocialPlatform; handle?: string }> = [
      { platform: SocialPlatform.INSTAGRAM, handle: dto.instagramHandle },
      { platform: SocialPlatform.YOUTUBE, handle: dto.youtubeHandle },
      { platform: SocialPlatform.TIKTOK, handle: dto.tiktokHandle },
      { platform: SocialPlatform.X, handle: dto.xHandle },
    ];

    for (const item of list) {
      if (item.handle && item.handle.trim()) {
        const handle = item.handle.trim().startsWith('@')
          ? item.handle.trim()
          : `@${item.handle.trim()}`;

        await this.prisma.socialProfile.upsert({
          where: {
            guestId_platform: {
              guestId,
              platform: item.platform,
            },
          },
          update: { handle },
          create: {
            guestId,
            platform: item.platform,
            handle,
          },
        });
      }
    }
  }
}
