import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../database/prisma.service';
import { SecurityService } from '../security/security.service';
import { AuditLogService } from '../security/audit-log.service';
import { ScanResult, AuditAction, GuestTag } from '@prisma/client';
import { ScanQrDto } from './dto/qr-checkin.dto';

export interface DynamicTicketState {
  ticketId: string;
  totpCode: string;
  remainingSeconds: number;
  timestamp: number;
  qrPayload: string;
  isRevoked: boolean;
  revokedReason?: string | null;
  guest: {
    id: string;
    firstName: string;
    lastName: string;
    fullName: string;
    company: string | null;
    title: string | null;
    tags: GuestTag[];
    isBlacklisted: boolean;
  };
  invitation: {
    id: string;
    rsvpStatus: string;
    plusOneApproved: number;
    plusOneNames: string | null;
  };
  event: {
    id: string;
    title: string;
    movieTitle: string;
    venue: string;
    startsAt: Date;
    doorsOpenAt: Date;
  };
}

export interface GateScanResult {
  allowed: boolean;
  scanResult: ScanResult;
  message: string;
  guest?: {
    id: string;
    firstName: string;
    lastName: string;
    fullName: string;
    company: string | null;
    title: string | null;
    tags: GuestTag[];
  };
  invitation?: {
    id: string;
    plusOneApproved: number;
    plusOneNames: string | null;
    totalAllowed: number;
    currentlyEntered: number;
  };
  event?: {
    id: string;
    title: string;
    venue: string;
  };
  checkedInAt?: string;
  alreadyCheckedInDetails?: {
    firstCheckInAt?: Date;
    totalEntered: number;
    maxAllowed: number;
  };
}

@Injectable()
export class QrCheckinService {
  private readonly logger = new Logger(QrCheckinService.name);
  private readonly qrHmacSecret: string;

  // Anti-Replay Nonce Önbelleği (In-Memory Fallback + 90s TTL)
  // Key: `checkin:nonce:${ticketId}:${totpCode}`, Value: expiresAtMs
  private readonly nonceCache = new Map<string, number>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly securityService: SecurityService,
    private readonly auditLogService: AuditLogService
  ) {
    this.qrHmacSecret =
      process.env.QR_HMAC_SECRET ||
      process.env.BLIND_INDEX_SALT ||
      'gala-qr-signature-secret-key-2026-sha256-production';

    // Periyodik Nonce Önbellek Temizleyici (Her 60 saniyede bir eskiyenleri siler)
    setInterval(() => {
      this.cleanupExpiredNonces();
    }, 60_000);
  }

  // KRİPTOGRAFİK PAYLOAD İMZALAMA VE DOĞRULAMA (HMAC-SHA256)

  /**
   * QR Payload için 32 karakterlik HMAC-SHA256 imzası üretir
   */
  computePayloadSignature(ticketId: string, totpCode: string, timestamp: number): string {
    const data = `${ticketId}:${totpCode}:${timestamp}`;
    return crypto
      .createHmac('sha256', this.qrHmacSecret)
      .update(data)
      .digest('hex')
      .substring(0, 32);
  }

  /**
   * QR Payload HMAC-SHA256 imzasını sabit zamanlı karşılaştırma (timingSafeEqual) ile doğrular
   */
  verifyPayloadSignature(
    ticketId: string,
    totpCode: string,
    timestamp: number,
    providedSignature: string
  ): boolean {
    if (!providedSignature || providedSignature.length !== 32) {
      return false;
    }
    const expectedSignature = this.computePayloadSignature(ticketId, totpCode, timestamp);
    const expectedBuf = Buffer.from(expectedSignature, 'utf8');
    const providedBuf = Buffer.from(providedSignature, 'utf8');

    if (expectedBuf.length !== providedBuf.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuf, providedBuf);
  }

  // 1. DİNAMİK BİLET DURUMU VE CANLI TOTP ÜRETİMİ

  /**
   * Davetlinin mobil bilet sayfasını (/ticket/[token]) açtığında çalışır.
   * Ham TOTP sırrını çözüp 30sn pencereli canlı TOTP ve HMAC imzalı QR payload üretir.
   */
  async getDynamicTicketState(rawRsvpTokenOrTicketId: string): Promise<DynamicTicketState> {
    if (!rawRsvpTokenOrTicketId) {
      throw new BadRequestException('Bilet kimliği veya LCV belirteci gereklidir.');
    }

    // 1. Arama: RSVP token hash üzerinden
    const tokenHash = this.securityService.hashRsvpToken(rawRsvpTokenOrTicketId);

    let ticket = await this.prisma.ticket.findFirst({
      where: {
        invitation: {
          rsvpTokenHash: tokenHash,
        },
      },
      include: {
        invitation: {
          include: {
            guest: true,
            event: true,
          },
        },
      },
    });

    // 2. Arama: Doğrudan Ticket ID üzerinden fallback
    if (!ticket) {
      ticket = await this.prisma.ticket.findUnique({
        where: { id: rawRsvpTokenOrTicketId },
        include: {
          invitation: {
            include: {
              guest: true,
              event: true,
            },
          },
        },
      });
    }

    if (!ticket) {
      throw new NotFoundException('Geçerli bir bilet veya davetiye bulunamadı.');
    }

    // Şifreli TOTP sırrını bellekte çöz (Asla istemciye gönderilmez!)
    let plainSecret = '';
    try {
      plainSecret = this.securityService.decrypt(ticket.totpSecretEncrypted);
    } catch (err) {
      this.logger.error(`Bilet #${ticket.id} TOTP sırrı çözülemedi:`, err);
      throw new BadRequestException('Bilet güvenlik sırrı doğrulanamadı.');
    }

    // 30 saniyelik zaman penceresi hesabı
    const nowSec = Math.floor(Date.now() / 1000);
    const remainingSeconds = 30 - (nowSec % 30);
    const totpCode = this.securityService.generateTotpCode(plainSecret, 30, 0, nowSec);

    // Kriptografik İmzalı QR Payload
    // Format: GALA-QR:v1:${ticketId}:${totpCode}:${timestamp}:${hmacSignature}
    const hmacSignature = this.computePayloadSignature(ticket.id, totpCode, nowSec);
    const qrPayload = `GALA-QR:v1:${ticket.id}:${totpCode}:${nowSec}:${hmacSignature}`;

    const { guest, event } = ticket.invitation;

    return {
      ticketId: ticket.id,
      totpCode,
      remainingSeconds,
      timestamp: nowSec,
      qrPayload,
      isRevoked: ticket.isRevoked,
      revokedReason: ticket.revokedReason,
      guest: {
        id: guest.id,
        firstName: guest.firstName,
        lastName: guest.lastName,
        fullName: `${guest.firstName} ${guest.lastName}`,
        company: guest.company,
        title: guest.title,
        tags: guest.tags,
        isBlacklisted: guest.isBlacklisted,
      },
      invitation: {
        id: ticket.invitation.id,
        rsvpStatus: ticket.invitation.rsvpStatus,
        plusOneApproved: ticket.invitation.plusOneApproved,
        plusOneNames: ticket.invitation.plusOneNames,
      },
      event: {
        id: event.id,
        title: event.title,
        movieTitle: event.movieTitle,
        venue: event.venue,
        startsAt: event.startsAt,
        doorsOpenAt: event.doorsOpenAt,
      },
    };
  }

  // 2. ÇOK KATMANLI KAPI CHECK-IN DOĞRULAMA PIPELINE'I (6 GÜVENLİK DUVARI)

  /**
   * Kapı görevlisi QR okuttuğunda çalışır.
   * 6 Güvenlik Duvarı:
   *   1. QR Payload & HMAC Bütünlük Kontrolü
   *   2. Bilet & İptal (isRevoked) Kontrolü
   *   3. Kara Liste (isBlacklisted) Kontrolü
   *   4. TOTP Zaman Penceresi (30sn, w=[-1,0,+1]) Kontrolü
   *   5. Anti-Replay Nonce Önbelleği (Atomik Nonce Kontrolü)
   *   6. Mükerrer Giriş (ALREADY_CHECKED_IN) ve Başarılı Giriş (SUCCESS)
   */
  async verifyAndScanQr(
    dto: ScanQrDto,
    staffUserId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<GateScanResult> {
    let ticketId = dto.ticketId?.trim();
    let totpCode = dto.totpCode?.trim();
    let qrTimestamp = dto.timestamp || Math.floor(Date.now() / 1000);

    // ------------------------------------------------------------------------
    // ADIM 1: QR Payload & HMAC Bütünlük Kontrolü
    // ------------------------------------------------------------------------
    if (dto.qrPayload) {
      const parts = dto.qrPayload.trim().split(':');
      if (parts.length !== 6 || parts[0] !== 'GALA-QR' || parts[1] !== 'v1') {
        await this.logCheckInAttempt(
          ticketId || 'unknown-ticket',
          staffUserId,
          ScanResult.INVALID_TOKEN,
          dto.guestEnteredCount || 1,
          dto.deviceInfo,
          ipAddress
        );
        return {
          allowed: false,
          scanResult: ScanResult.INVALID_TOKEN,
          message: 'GEÇERSİZ BİLET PAYLOAD FORMATI / BOZUK QR KOD',
        };
      }

      const [, , parsedTicketId, parsedTotpCode, parsedTimestampStr, signature] = parts;
      ticketId = parsedTicketId;
      totpCode = parsedTotpCode;
      qrTimestamp = parseInt(parsedTimestampStr, 10);

      // HMAC İmzası Kontrolü
      const isSignatureValid = this.verifyPayloadSignature(
        ticketId,
        totpCode,
        qrTimestamp,
        signature
      );

      if (!isSignatureValid) {
        await this.logCheckInAttempt(
          ticketId,
          staffUserId,
          ScanResult.INVALID_TOKEN,
          dto.guestEnteredCount || 1,
          dto.deviceInfo,
          ipAddress
        );
        return {
          allowed: false,
          scanResult: ScanResult.INVALID_TOKEN,
          message: 'KRİPTOGRAFİK İMZA UYUŞMAZLIĞI (GEÇERSİZ / SAHTE QR PAYLOAD)',
        };
      }
    }

    if (!ticketId || !totpCode) {
      return {
        allowed: false,
        scanResult: ScanResult.INVALID_TOKEN,
        message: 'Bilet ID ve TOTP kodu zorunludur.',
      };
    }

    // ------------------------------------------------------------------------
    // ADIM 2: Bilet & İptal (isRevoked) Kontrolü
    // ------------------------------------------------------------------------
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        invitation: {
          include: {
            guest: true,
            event: true,
          },
        },
        checkInLogs: {
          orderBy: { scannedAt: 'asc' },
        },
      },
    });

    if (!ticket) {
      await this.logCheckInAttempt(
        ticketId,
        staffUserId,
        ScanResult.REVOKED,
        dto.guestEnteredCount || 1,
        dto.deviceInfo,
        ipAddress
      );
      return {
        allowed: false,
        scanResult: ScanResult.REVOKED,
        message: 'BİLET BULUNAMADI VEYA SİSTEMDE MEVCUT DEĞİL',
      };
    }

    if (ticket.isRevoked) {
      await this.logCheckInAttempt(
        ticket.id,
        staffUserId,
        ScanResult.REVOKED,
        dto.guestEnteredCount || 1,
        dto.deviceInfo,
        ipAddress
      );
      return {
        allowed: false,
        scanResult: ScanResult.REVOKED,
        message: `BU BİLET İPTAL EDİLMİŞTİR (REVOKED)${ticket.revokedReason ? `: ${ticket.revokedReason}` : ''}`,
      };
    }

    const { guest, invitation } = ticket;

    // ------------------------------------------------------------------------
    // ADIM 3: Kara Liste Kontrolü
    // ------------------------------------------------------------------------
    if (guest.isBlacklisted || guest.tags.includes(GuestTag.BLACKLIST)) {
      await this.logCheckInAttempt(
        ticket.id,
        staffUserId,
        ScanResult.REVOKED,
        dto.guestEnteredCount || 1,
        dto.deviceInfo,
        ipAddress
      );
      return {
        allowed: false,
        scanResult: ScanResult.REVOKED,
        message: 'GİRİŞ REDDEDİLDİ: BU DAVETLİ PROTOKOL KARA LİSTESİNDEDİR (BLACKLIST)',
      };
    }

    // ------------------------------------------------------------------------
    // ADIM 4: TOTP Zaman Penceresi (30sn, w=[-1,0,+1]) Kontrolü
    // ------------------------------------------------------------------------
    let plainSecret = '';
    try {
      plainSecret = this.securityService.decrypt(ticket.totpSecretEncrypted);
    } catch {
      await this.logCheckInAttempt(
        ticket.id,
        staffUserId,
        ScanResult.INVALID_TOKEN,
        dto.guestEnteredCount || 1,
        dto.deviceInfo,
        ipAddress
      );
      return {
        allowed: false,
        scanResult: ScanResult.INVALID_TOKEN,
        message: 'BİLET KRİPTOGRAFİK GÜVENLİK HATASI',
      };
    }

    // Zaman toleransı [-1, 0, +1] pencerelerinde TOTP doğrulama
    const isTotpValid = this.securityService.verifyTotpCode(plainSecret, totpCode, 30, 1);

    if (!isTotpValid) {
      await this.logCheckInAttempt(
        ticket.id,
        staffUserId,
        ScanResult.EXPIRED_QR,
        dto.guestEnteredCount || 1,
        dto.deviceInfo,
        ipAddress
      );
      return {
        allowed: false,
        scanResult: ScanResult.EXPIRED_QR,
        message: 'SÜRESİ DOLMUŞ QR KOD! (Ekran Görüntüsü Kabul Edilmez)',
      };
    }

    // ------------------------------------------------------------------------
    // ADIM 5: Anti-Replay Nonce Önbelleği (Atomik Nonce Kontrolü - 90sn TTL)
    // ------------------------------------------------------------------------
    const nonceKey = `checkin:nonce:${ticket.id}:${totpCode}`;
    const now = Date.now();
    const existingNonceExpiry = this.nonceCache.get(nonceKey);

    if (existingNonceExpiry && existingNonceExpiry > now) {
      // Replay Attack Tespit Edildi!
      await this.logCheckInAttempt(
        ticket.id,
        staffUserId,
        ScanResult.REPLAY_ATTACK_BLOCKED,
        dto.guestEnteredCount || 1,
        dto.deviceInfo,
        ipAddress
      );
      return {
        allowed: false,
        scanResult: ScanResult.REPLAY_ATTACK_BLOCKED,
        message: 'SİBER GÜVENLİK UYARISI: REPLAY ATTACK / KOPYA EKRAN GÖRÜNTÜSÜ ENGELLENDİ!',
      };
    }

    // Nonce'u önbelleğe 90 saniye TTL ile kaydet
    this.nonceCache.set(nonceKey, now + 90_000);

    // ------------------------------------------------------------------------
    // ADIM 6: Mükerrer Giriş (ALREADY_CHECKED_IN) ve Başarılı Giriş (SUCCESS)
    // ------------------------------------------------------------------------
    const existingSuccessLogs = ticket.checkInLogs.filter(
      (log) => log.scanResult === ScanResult.SUCCESS
    );
    const totalAlreadyEntered = existingSuccessLogs.reduce(
      (sum, log) => sum + log.guestEnteredCount,
      0
    );
    const maxAllowedCapacity = 1 + (invitation.plusOneApproved || 0);

    if (totalAlreadyEntered >= maxAllowedCapacity) {
      await this.logCheckInAttempt(
        ticket.id,
        staffUserId,
        ScanResult.ALREADY_CHECKED_IN,
        dto.guestEnteredCount || 1,
        dto.deviceInfo,
        ipAddress
      );
      return {
        allowed: false,
        scanResult: ScanResult.ALREADY_CHECKED_IN,
        message: 'BU BİLETLE DAHA ÖNCE GİRİŞ YAPILMIŞTIR (KONTENJAN DOLDU)',
        alreadyCheckedInDetails: {
          firstCheckInAt: existingSuccessLogs[0]?.scannedAt,
          totalEntered: totalAlreadyEntered,
          maxAllowed: maxAllowedCapacity,
        },
      };
    }

    // Giriş adedi belirleme
    const requestedCount = Math.max(1, dto.guestEnteredCount || 1);
    const remainingQuota = maxAllowedCapacity - totalAlreadyEntered;
    const actualEnteredCount = Math.min(requestedCount, remainingQuota);

    // Başarılı Check-in Kaydı
    await this.prisma.checkInLog.create({
      data: {
        ticketId: ticket.id,
        scannedById: staffUserId,
        guestEnteredCount: actualEnteredCount,
        scanResult: ScanResult.SUCCESS,
        deviceInfo: dto.deviceInfo || 'Gate PWA Scanner',
        ipAddress: ipAddress || null,
      },
    });

    // Davetlinin CRM Sadakat Skoru ve Katılım Sayısını Güncelle
    await this.prisma.guest.update({
      where: { id: guest.id },
      data: {
        totalAttended: { increment: 1 },
        loyaltyScore: Math.min(100.0, guest.loyaltyScore + 2.5),
      },
    });

    // Denetim İzi (AuditLog)
    await this.auditLogService.log({
      userId: staffUserId,
      action: AuditAction.SCAN_QR,
      entityType: 'Ticket',
      entityId: ticket.id,
      metadata: {
        guestId: guest.id,
        guestName: `${guest.firstName} ${guest.lastName}`,
        tags: guest.tags,
        enteredCount: actualEnteredCount,
        plusOneApproved: invitation.plusOneApproved,
        totalNowEntered: totalAlreadyEntered + actualEnteredCount,
        maxAllowed: maxAllowedCapacity,
      },
      ipAddress,
      userAgent,
    });

    return {
      allowed: true,
      scanResult: ScanResult.SUCCESS,
      message: 'GİRİŞ ONAYLANDI — HOŞ GELDİNİZ',
      guest: {
        id: guest.id,
        firstName: guest.firstName,
        lastName: guest.lastName,
        fullName: `${guest.firstName} ${guest.lastName}`,
        company: guest.company,
        title: guest.title,
        tags: guest.tags,
      },
      invitation: {
        id: invitation.id,
        plusOneApproved: invitation.plusOneApproved,
        plusOneNames: invitation.plusOneNames,
        totalAllowed: maxAllowedCapacity,
        currentlyEntered: totalAlreadyEntered + actualEnteredCount,
      },
      event: {
        id: invitation.event.id,
        title: invitation.event.title,
        venue: invitation.event.venue,
      },
      checkedInAt: new Date().toISOString(),
    };
  }

  // 3. BİLET İPTALİ (REVOKE) VE KAPI İSTATİSTİKLERİ

  /**
   * Sızdırıldığı tespit edilen veya protokol dışı bırakılan bileti anında iptal eder.
   */
  async revokeTicket(
    ticketId: string,
    reason: string,
    staffUserId: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        invitation: {
          include: { guest: true },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException('İptal edilecek bilet bulunamadı.');
    }

    const updated = await this.prisma.ticket.update({
      where: { id: ticketId },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
        revokedReason: reason,
      },
    });

    await this.auditLogService.log({
      userId: staffUserId,
      action: AuditAction.REVOKE_TICKET,
      entityType: 'Ticket',
      entityId: ticketId,
      metadata: {
        guestId: ticket.invitation.guest.id,
        guestName: `${ticket.invitation.guest.firstName} ${ticket.invitation.guest.lastName}`,
        reason,
      },
      ipAddress,
      userAgent,
    });

    return {
      success: true,
      message: 'Bilet başarıyla iptal edildi (REVOKED).',
      ticket: {
        id: updated.id,
        isRevoked: updated.isRevoked,
        revokedAt: updated.revokedAt,
        revokedReason: updated.revokedReason,
      },
    };
  }

  /**
   * Canlı kapı giriş istatistikleri ve güvenlik olay günlüğü (CheckInLog)
   */
  async getCheckInDashboardStats(eventId?: string) {
    // 1. Beklenen davetli hesabı (CONFIRMED olan davetiyeler: 1 + plusOneApproved)
    const confirmedInvitations = await this.prisma.invitation.findMany({
      where: {
        rsvpStatus: 'CONFIRMED',
        ...(eventId ? { eventId } : {}),
      },
      select: {
        plusOneApproved: true,
      },
    });

    const totalExpected = confirmedInvitations.reduce(
      (sum, inv) => sum + 1 + (inv.plusOneApproved || 0),
      0
    );

    // 2. Kapı check-in logları
    const logs = await this.prisma.checkInLog.findMany({
      where: eventId
        ? {
            ticket: {
              invitation: { eventId },
            },
          }
        : undefined,
      include: {
        ticket: {
          include: {
            invitation: {
              include: {
                guest: true,
                event: true,
              },
            },
          },
        },
        scannedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: { scannedAt: 'desc' },
      take: 100,
    });

    // Başarılı giriş yapan kişi sayısı toplamı
    const checkedInGuests = logs
      .filter((l) => l.scanResult === ScanResult.SUCCESS)
      .reduce((sum, l) => sum + l.guestEnteredCount, 0);

    const remainingGuests = Math.max(0, totalExpected - checkedInGuests);

    // Güvenlik olayları sayaçları
    const replayAttacksBlocked = logs.filter(
      (l) => l.scanResult === ScanResult.REPLAY_ATTACK_BLOCKED
    ).length;
    const expiredQrBlocked = logs.filter(
      (l) => l.scanResult === ScanResult.EXPIRED_QR
    ).length;
    const revokedBlocked = logs.filter(
      (l) => l.scanResult === ScanResult.REVOKED
    ).length;
    const alreadyCheckedInBlocked = logs.filter(
      (l) => l.scanResult === ScanResult.ALREADY_CHECKED_IN
    ).length;

    return {
      kpi: {
        totalExpected,
        checkedInGuests,
        remainingGuests,
        occupancyRate: totalExpected > 0 ? Math.round((checkedInGuests / totalExpected) * 100) : 0,
        replayAttacksBlocked,
        expiredQrBlocked,
        revokedBlocked,
        alreadyCheckedInBlocked,
        totalSecurityIncidents:
          replayAttacksBlocked + expiredQrBlocked + revokedBlocked + alreadyCheckedInBlocked,
      },
      recentLogs: logs.slice(0, 50).map((log) => ({
        id: log.id,
        scannedAt: log.scannedAt,
        scanResult: log.scanResult,
        guestEnteredCount: log.guestEnteredCount,
        deviceInfo: log.deviceInfo,
        ipAddress: log.ipAddress,
        ticketId: log.ticketId,
        scannedBy: {
          id: log.scannedBy.id,
          name: `${log.scannedBy.firstName} ${log.scannedBy.lastName}`,
          role: log.scannedBy.role,
        },
        guest: log.ticket?.invitation?.guest
          ? {
              id: log.ticket.invitation.guest.id,
              name: `${log.ticket.invitation.guest.firstName} ${log.ticket.invitation.guest.lastName}`,
              company: log.ticket.invitation.guest.company,
              title: log.ticket.invitation.guest.title,
              tags: log.ticket.invitation.guest.tags,
            }
          : null,
        eventTitle: log.ticket?.invitation?.event?.title || 'Bilinmeyen Etkinlik',
      })),
    };
  }

  // YARDIMCI METODLAR

  private async logCheckInAttempt(
    ticketId: string,
    scannedById: string,
    scanResult: ScanResult,
    guestEnteredCount = 1,
    deviceInfo?: string,
    ipAddress?: string
  ): Promise<void> {
    try {
      // Eğer ticketId veritabanında yoksa veya sahte ise foreign key hatası vermesin
      const exists = await this.prisma.ticket.findUnique({
        where: { id: ticketId },
        select: { id: true },
      });

      if (exists) {
        await this.prisma.checkInLog.create({
          data: {
            ticketId,
            scannedById,
            scanResult,
            guestEnteredCount,
            deviceInfo: deviceInfo || 'Gate PWA Scanner',
            ipAddress: ipAddress || null,
          },
        });
      }
    } catch (err) {
      this.logger.warn(`Kapı tarama log kaydı yazılamadı: ticketId=${ticketId}, result=${scanResult}`, err);
    }
  }

  private cleanupExpiredNonces(): void {
    const now = Date.now();
    for (const [key, expiresAt] of this.nonceCache.entries()) {
      if (expiresAt <= now) {
        this.nonceCache.delete(key);
      }
    }
  }
}
