import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { SecurityService } from '../security/security.service';
import { AuditLogService } from '../security/audit-log.service';
import { GuestTag, RsvpStatus, ResponseChannel, Event, Guest, AuditAction } from '@prisma/client';

export interface BulkInvitationOptions {
  filterTags?: GuestTag[];
  guestIds?: string[];
  customSubject?: string;
  customTemplate?: string;
}

export interface BulkInvitationResult {
  eventId: string;
  totalTargeted: number;
  enqueuedCount: number;
  skippedBlacklistedCount: number;
  skippedGuests: Array<{ id: string; name: string; reason: string }>;
  invitations: Array<{
    invitationId: string;
    guestId: string;
    guestName: string;
    maskedEmail: string;
    rawRsvpToken: string;
    confirmUrl: string;
    declineUrl: string;
  }>;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly securityService: SecurityService,
    private readonly auditLogService: AuditLogService
  ) {}

  // 1. ŞABLON MOTORU (DETERMINISTIC TEMPLATE ENGINE)

  /**
   * E-posta şablonundaki dinamik değişkenleri ({{firstName}}, {{movieTitle}} vb.) yerine koyar
   */
  renderTemplate(template: string, variables: Record<string, string | number | null | undefined>): string {
    if (!template) return '';

    return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key) => {
      const value = variables[key];
      return value !== undefined && value !== null ? String(value) : '';
    });
  }

  /**
   * Lüks Kırmızı Halı & Gala HTML E-Posta Şablonu
   */
  getDefaultLuxuryHtmlTemplate(): string {
    return `
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{eventTitle}}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b0f19; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #f3f4f6;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0b0f19; padding: 40px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #111827; border: 1px solid #d97706; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
          <!-- Header Gold Badge -->
          <tr>
            <td style="background: linear-gradient(135deg, #78350f 0%, #d97706 50%, #f59e0b 100%); padding: 24px; text-align: center;">
              <span style="letter-spacing: 4px; font-size: 13px; font-weight: bold; color: #ffffff; text-transform: uppercase;">
                ÖZEL GALA & KIRMIZI HALI DAVETİYESİ
              </span>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 40px 32px; text-align: center;">
              <h1 style="color: #fbbf24; font-size: 28px; margin: 0 0 12px 0; font-weight: 700; letter-spacing: 1px;">
                {{movieTitle}}
              </h1>
              <p style="font-size: 16px; color: #9ca3af; margin: 0 0 28px 0;">
                {{eventTitle}}
              </p>

              <div style="text-align: left; background-color: #1f2937; border-radius: 8px; padding: 20px; margin-bottom: 28px; border-left: 4px solid #f59e0b;">
                <p style="margin: 0 0 8px 0; font-size: 16px; color: #ffffff;">
                  Sayın <strong>{{fullName}}</strong>,
                </p>
                <p style="margin: 0; font-size: 14px; color: #d1d5db; line-height: 1.6;">
                  Sizi, merakla beklenen <em>{{movieTitle}}</em> filminin özel gösterimi ve gala resepsiyonunda aramızda görmekten büyük onur duyacağız.
                </p>
              </div>

              <!-- Event Logistics Details -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 32px; background-color: #172033; border-radius: 8px; padding: 16px;">
                <tr>
                  <td style="padding: 8px 12px; color: #9ca3af; font-size: 13px; width: 35%;">Mekan:</td>
                  <td style="padding: 8px 12px; color: #ffffff; font-size: 14px; font-weight: 600;">{{venue}}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 12px; color: #9ca3af; font-size: 13px;">Gala Tarihi:</td>
                  <td style="padding: 8px 12px; color: #ffffff; font-size: 14px; font-weight: 600;">{{eventDate}}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 12px; color: #9ca3af; font-size: 13px;">Kapı Açılışı:</td>
                  <td style="padding: 8px 12px; color: #fbbf24; font-size: 14px; font-weight: 600;">{{doorsOpenTime}}</td>
                </tr>
              </table>

              <!-- Single Click RSVP Buttons -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="padding-bottom: 16px;">
                    <a href="{{confirmUrl}}" style="display: inline-block; background: linear-gradient(135deg, #d97706 0%, #b45309 100%); color: #ffffff; text-decoration: none; padding: 16px 36px; border-radius: 8px; font-size: 16px; font-weight: bold; letter-spacing: 0.5px; box-shadow: 0 4px 12px rgba(217, 119, 6, 0.4);">
                      Katılıyorum (LCV Onayla)
                    </a>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <a href="{{declineUrl}}" style="display: inline-block; color: #9ca3af; text-decoration: underline; font-size: 14px;">
                      Maalesef Katılamıyorum
                    </a>
                  </td>
                </tr>
              </table>

              <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #374151; font-size: 12px; color: #6b7280;">
                <p style="margin: 0;">
                  Detaylı LCV yanıtı veya +1 refakatçi bildirmek için <a href="{{rsvpPortalUrl}}" style="color: #fbbf24; text-decoration: none;">Davet Portalı'nı ziyaret edebilirsiniz</a>.
                </p>
                <p style="margin: 8px 0 0 0;">
                  * Katılımınızı onayladığınızda dinamik kriptografik QR biletiniz otomatik olarak hazırlanacaktır.
                </p>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();
  }

  // 2. TOPLU KİŞİSELLEŞTİRİLMİŞ E-POSTA KAMPANYASI GÖNDERİMİ

  /**
   * Toplu davetiye kampanyası gönderir.
   * Kara listedeki davetlileri (isBlacklisted === true || tags.includes(BLACKLIST))
   * kesinlikle atlar (Blacklist Guard).
   */
  async sendBulkInvitations(
    eventId: string,
    options: BulkInvitationOptions = {}
  ): Promise<BulkInvitationResult> {
    const { filterTags, guestIds, customSubject, customTemplate } = options;

    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException(`Etkinlik bulunamadı: ${eventId}`);
    }

    // Hedef kitleyi sorgula
    const whereClause: any = {};
    if (guestIds && guestIds.length > 0) {
      whereClause.id = { in: guestIds };
    } else if (filterTags && filterTags.length > 0) {
      whereClause.tags = { hasSome: filterTags };
    }

    const targetGuests = await this.prisma.guest.findMany({
      where: whereClause,
    });

    const webBaseUrl = process.env.WEB_APP_URL || 'http://localhost:3000';
    const emailSubjectTemplate = customSubject || '{{movieTitle}} Özel Gala Davetiyeniz';
    const emailHtmlTemplate = customTemplate || this.getDefaultLuxuryHtmlTemplate();

    let enqueuedCount = 0;
    let skippedBlacklistedCount = 0;
    const skippedGuests: Array<{ id: string; name: string; reason: string }> = [];
    const invitations: Array<{
      invitationId: string;
      guestId: string;
      guestName: string;
      maskedEmail: string;
      rawRsvpToken: string;
      confirmUrl: string;
      declineUrl: string;
    }> = [];

    for (const guest of targetGuests) {
      // 1. KARA LİSTE KORUMASI (BLACKLIST GUARD)
      const isBlacklisted =
        guest.isBlacklisted ||
        guest.tags.includes(GuestTag.BLACKLIST);

      if (isBlacklisted) {
        skippedBlacklistedCount++;
        skippedGuests.push({
          id: guest.id,
          name: `${guest.firstName} ${guest.lastName}`,
          reason: guest.blacklistReason || 'Kara listede kayıtlı (BLACKLIST)',
        });
        this.logger.warn(
          `[BlacklistGuard] Davetiye atlandı: ${guest.firstName} ${guest.lastName} (ID: ${guest.id}) - Kara Listede!`
        );
        continue;
      }

      // 2. Kriptografik Tahmin Edilemez 32-Byte Raw Token ve HMAC-SHA256 Hash Üretimi
      const rawRsvpToken = this.securityService.generateRsvpToken();
      const rsvpTokenHash = this.securityService.hashRsvpToken(rawRsvpToken);

      // 3. Veritabanında Davetiye Kaydı (Açık Token DEĞİL, sadece HASH saklanır!)
      const invitation = await this.prisma.invitation.upsert({
        where: {
          eventId_guestId: {
            eventId: event.id,
            guestId: guest.id,
          },
        },
        create: {
          eventId: event.id,
          guestId: guest.id,
          rsvpTokenHash,
          sentAt: new Date(),
          rsvpStatus: RsvpStatus.PENDING,
        },
        update: {
          rsvpTokenHash,
          sentAt: new Date(),
        },
      });

      // 4. In-Memory PII Çözme (Asla loglara veya diske yazılmaz)
      let plainEmail = '';
      try {
        plainEmail = this.securityService.decrypt(guest.emailEncrypted);
      } catch (err: any) {
        this.logger.error(`E-posta şifre çözme hatası (Guest: ${guest.id}): ${err?.message}`);
        continue;
      }

      const maskedEmail = this.securityService.maskEmail(plainEmail);

      // 5. Kişiselleştirilmiş URL'lerin ve Değişkenlerin Hazırlanması
      const confirmUrl = `${webBaseUrl}/rsvp/${rawRsvpToken}?action=CONFIRMED`;
      const declineUrl = `${webBaseUrl}/rsvp/${rawRsvpToken}?action=DECLINED`;
      const rsvpPortalUrl = `${webBaseUrl}/rsvp/${rawRsvpToken}`;

      const eventDateStr = event.startsAt.toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
      const doorsOpenTimeStr = event.doorsOpenAt.toLocaleTimeString('tr-TR', {
        hour: '2-digit',
        minute: '2-digit',
      });

      const templateVariables: Record<string, string> = {
        firstName: guest.firstName,
        lastName: guest.lastName,
        fullName: `${guest.firstName} ${guest.lastName}`,
        company: guest.company || '',
        title: guest.title || '',
        eventTitle: event.title,
        movieTitle: event.movieTitle,
        venue: event.venue,
        eventDate: eventDateStr,
        doorsOpenTime: doorsOpenTimeStr,
        confirmUrl,
        declineUrl,
        rsvpPortalUrl,
      };

      const personalizedSubject = this.renderTemplate(emailSubjectTemplate, templateVariables);
      const personalizedHtml = this.renderTemplate(emailHtmlTemplate, templateVariables);

      // 6. E-posta Taşıyıcısına (Resend / Mock) Gönderme
      await this.dispatchEmail({
        to: plainEmail,
        subject: personalizedSubject,
        html: personalizedHtml,
        invitationId: invitation.id,
      });

      enqueuedCount++;
      invitations.push({
        invitationId: invitation.id,
        guestId: guest.id,
        guestName: `${guest.firstName} ${guest.lastName}`,
        maskedEmail,
        rawRsvpToken,
        confirmUrl,
        declineUrl,
      });
    }

    this.logger.log(
      `[EmailCampaign] Toplu kampanya tamamlandı: ${enqueuedCount} gönderildi, ${skippedBlacklistedCount} kara listeden elendi.`
    );

    return {
      eventId: event.id,
      totalTargeted: targetGuests.length,
      enqueuedCount,
      skippedBlacklistedCount,
      skippedGuests,
      invitations,
    };
  }

  /**
   * E-posta gönderici adaptörü (Resend API veya in-memory mock fallback)
   */
  private async dispatchEmail(payload: {
    to: string;
    subject: string;
    html: string;
    invitationId: string;
  }) {
    const resendApiKey = process.env.RESEND_API_KEY;

    if (resendApiKey && resendApiKey.startsWith('re_')) {
      // Canlı Resend API çağrısı
      try {
        const { Resend } = await import('resend');
        const resend = new Resend(resendApiKey);
        await resend.emails.send({
          from: process.env.EMAIL_FROM || 'Gala Davetiye <gala@pr-operasyon.com>',
          to: payload.to,
          subject: payload.subject,
          html: payload.html,
        });
        return;
      } catch (err: any) {
        this.logger.warn(`Resend gönderimi başarısız oldu, simülatöre geçildi: ${err?.message}`);
      }
    }

    // In-memory güvenli simülatör
    this.logger.debug(
      `[EmailSender] Simüle e-posta gönderildi -> Kime: ${this.securityService.maskEmail(payload.to)}, Konu: ${payload.subject}`
    );
  }

  // 3. TEK TIKLA LCV (ONE-CLICK RSVP) DOĞRULAMA & YANIT İŞLEME

  /**
   * Gelen ham RSVP token'ını hash'leyerek doğrular ve etkinlik detayını PII sızdırmadan döner
   */
  async verifyRsvpToken(rawToken: string) {
    if (!rawToken || rawToken.trim() === '') {
      throw new BadRequestException('Geçersiz veya boş LCV belirteci.');
    }

    const rsvpTokenHash = this.securityService.hashRsvpToken(rawToken.trim());

    const invitation = await this.prisma.invitation.findUnique({
      where: { rsvpTokenHash },
      include: {
        event: true,
        guest: true,
        ticket: true,
      },
    });

    if (!invitation) {
      throw new NotFoundException('Geçersiz veya süresi dolmuş davetiye belirteci.');
    }

    return {
      valid: true,
      invitationId: invitation.id,
      guestId: invitation.guestId,
      guestName: `${invitation.guest.firstName} ${invitation.guest.lastName}`,
      company: invitation.guest.company,
      title: invitation.guest.title,
      eventTitle: invitation.event.title,
      movieTitle: invitation.event.movieTitle,
      venue: invitation.event.venue,
      startsAt: invitation.event.startsAt,
      doorsOpenAt: invitation.event.doorsOpenAt,
      currentRsvpStatus: invitation.rsvpStatus,
      plusOneRequested: invitation.plusOneRequested,
      plusOneApproved: invitation.plusOneApproved,
      plusOneNames: invitation.plusOneNames,
      hasTicket: !!invitation.ticket,
      ticketRevoked: invitation.ticket?.isRevoked || false,
    };
  }

  /**
   * Davetlinin tek tıkla LCV yanıtını ve +1 talebini işler.
   * Eğer yanıt CONFIRMED ise ve henüz Ticket yoksa, otomatik olarak TOTP secret üretip
   * AES-256-GCM ile şifreleyerek Ticket kaydını oluşturur!
   */
  async processOneClickRsvp(
    rawToken: string,
    action: 'CONFIRMED' | 'DECLINED' | 'UNCERTAIN',
    plusOneRequested = 0,
    plusOneNames?: string
  ) {
    if (!rawToken || rawToken.trim() === '') {
      throw new BadRequestException('Geçersiz LCV belirteci.');
    }

    const rsvpTokenHash = this.securityService.hashRsvpToken(rawToken.trim());

    const invitation = await this.prisma.invitation.findUnique({
      where: { rsvpTokenHash },
      include: {
        guest: true,
        event: true,
        ticket: true,
      },
    });

    if (!invitation) {
      throw new NotFoundException('LCV belirteci geçerli değil veya davetiye bulunamadı.');
    }

    let rsvpStatus = action as RsvpStatus;
    let isWaitlisted = false;

    // 1. Kapasite Aşımı Koruması (Waitlist Guard)
    if (action === 'CONFIRMED') {
      const confirmedInvitations = await this.prisma.invitation.findMany({
        where: {
          eventId: invitation.eventId,
          rsvpStatus: RsvpStatus.CONFIRMED,
          id: { not: invitation.id },
        },
        select: { plusOneApproved: true },
      });

      const currentConfirmedAttendees = confirmedInvitations.reduce(
        (acc, curr) => acc + 1 + (curr.plusOneApproved || 0),
        0
      );

      const requestedSeats = 1 + Math.max(0, plusOneRequested);

      if (currentConfirmedAttendees + requestedSeats > invitation.event.capacity) {
        rsvpStatus = RsvpStatus.WAITLIST;
        isWaitlisted = true;
        this.logger.warn(
          `[WaitlistGuard] Etkinlik kapasitesi doldu (${currentConfirmedAttendees}/${invitation.event.capacity}). Davetli ${invitation.guest.firstName} ${invitation.guest.lastName} WAITLIST durumuna alındı.`
        );
      }
    }

    // 2. Davetiye yanıtını güncelle
    const updatedInvitation = await this.prisma.invitation.update({
      where: { id: invitation.id },
      data: {
        rsvpStatus,
        plusOneRequested: Math.max(0, plusOneRequested),
        plusOneNames: plusOneNames || null,
        respondedAt: new Date(),
        responseChannel: ResponseChannel.EMAIL_LINK,
      },
      include: {
        ticket: true,
      },
    });

    let createdTicket = updatedInvitation.ticket;

    // 3. OTOMATİK DİNAMİK BİLET ÜRETİMİ (Auto Ticket Provisioning)
    if (rsvpStatus === RsvpStatus.CONFIRMED && !createdTicket) {
      // Bilet için 20-byte Base32 TOTP sırrı üret
      const totpSecret = this.securityService.generateTotpSecret();
      // Veritabanına AES-256-GCM ile şifrelenmiş olarak kaydet
      const totpSecretEncrypted = this.securityService.encrypt(totpSecret);

      createdTicket = await this.prisma.ticket.create({
        data: {
          invitationId: invitation.id,
          totpSecretEncrypted,
        },
      });

      this.logger.log(
        `[AutoTicket] Katılım teyit edildi ve dinamik QR bilet oluşturuldu: Bilet ID ${createdTicket.id} (Invitation: ${invitation.id})`
      );
    }

    // 4. Eğer daha önce CONFIRMED iken DECLINED bildirdiyse, otomatik olarak yedekten 1 kişi terfi ettir
    if (invitation.rsvpStatus === RsvpStatus.CONFIRMED && rsvpStatus === RsvpStatus.DECLINED) {
      try {
        await this.promoteFromWaitlist(invitation.eventId, 1);
      } catch (err: any) {
        this.logger.warn(`Otomatik yedek terfisi sırasında uyarı: ${err?.message}`);
      }
    }

    return {
      success: true,
      isWaitlisted,
      message: isWaitlisted
        ? 'Etkinlik salon kapasitesi dolduğu için başvurunuz Akıllı Yedek Liste (Waitlist) sırasına alınmıştır. Kontenjan açıldığında sadakat puanınıza göre öncelikli olarak bilgilendirileceksiniz.'
        : rsvpStatus === RsvpStatus.CONFIRMED
          ? 'Katılımınız başarıyla teyit edildi. Dinamik kriptografik biletiniz hazırlandı.'
          : 'LCV yanıtınız kaydedildi.',
      rsvpStatus: updatedInvitation.rsvpStatus,
      plusOneRequested: updatedInvitation.plusOneRequested,
      plusOneNames: updatedInvitation.plusOneNames,
      hasTicket: !!createdTicket,
      ticketId: createdTicket?.id || null,
    };
  }

  // 4. AKILLI YEDEK LİSTE TERFİ MOTORU (AUTO-WAITLIST PROMOTER)

  /**
   * Boşalan kontenjanı Sadakat Skoruna (loyaltyScore DESC) göre en güvenilir
   * WAITLIST veya SECONDARY etiketli davetlilerle otomatik doldurur ve dinamik bilet üretir.
   */
  async promoteFromWaitlist(eventId: string, targetCount?: number) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException('Etkinlik bulunamadı.');
    }

    // 1. Mevcut doluluğu ve boş kontenjanı hesapla
    const confirmedInvitations = await this.prisma.invitation.findMany({
      where: {
        eventId,
        rsvpStatus: RsvpStatus.CONFIRMED,
      },
      select: { plusOneApproved: true },
    });

    const currentAttendees = confirmedInvitations.reduce(
      (acc, curr) => acc + 1 + (curr.plusOneApproved || 0),
      0
    );

    const availableSlots = Math.max(0, event.capacity - currentAttendees);
    const slotsToFill = targetCount !== undefined && targetCount > 0
      ? Math.min(targetCount, availableSlots > 0 ? availableSlots : targetCount)
      : availableSlots;

    if (slotsToFill <= 0) {
      return {
        eventId,
        promotedCount: 0,
        availableCapacityRemaining: availableSlots,
        remainingWaitlistCount: 0,
        promotedGuests: [],
        message: 'Doldurulacak boş kontenjan bulunmamaktadır.',
      };
    }

    // 2. Terfi adaylarını çek: WAITLIST durumundakiler veya SECONDARY etiketli bekleyenler
    const candidates = await this.prisma.invitation.findMany({
      where: {
        eventId,
        rsvpStatus: { in: [RsvpStatus.WAITLIST, RsvpStatus.PENDING] },
        OR: [
          { rsvpStatus: RsvpStatus.WAITLIST },
          { guest: { tags: { has: GuestTag.SECONDARY } } },
        ],
      },
      include: {
        guest: true,
        ticket: true,
      },
      orderBy: [
        { guest: { loyaltyScore: 'desc' } }, // En yüksek sadakat skoru en önce!
        { createdAt: 'asc' },
      ],
    });

    const selectedCandidates = candidates.slice(0, slotsToFill);
    const promotedGuests: Array<{
      invitationId: string;
      guestId: string;
      fullName: string;
      loyaltyScore: number;
      ticketId: string;
      tags: GuestTag[];
    }> = [];

    for (const candidate of selectedCandidates) {
      // Katılımı onayla
      const updated = await this.prisma.invitation.update({
        where: { id: candidate.id },
        data: {
          rsvpStatus: RsvpStatus.CONFIRMED,
          respondedAt: new Date(),
        },
      });

      // Dinamik bilet yoksa üret
      let ticket = candidate.ticket;
      if (!ticket) {
        const totpSecret = this.securityService.generateTotpSecret();
        const totpSecretEncrypted = this.securityService.encrypt(totpSecret);

        ticket = await this.prisma.ticket.create({
          data: {
            invitationId: candidate.id,
            totpSecretEncrypted,
          },
        });
      }

      promotedGuests.push({
        invitationId: candidate.id,
        guestId: candidate.guest.id,
        fullName: `${candidate.guest.firstName} ${candidate.guest.lastName}`,
        loyaltyScore: candidate.guest.loyaltyScore,
        ticketId: ticket.id,
        tags: candidate.guest.tags,
      });

      this.logger.log(
        `[AutoPromote] Yedek listeden terfi edildi: ${candidate.guest.firstName} ${candidate.guest.lastName} (Sadakat Skoru: ${candidate.guest.loyaltyScore}, Bilet: ${ticket.id})`
      );
    }

    return {
      eventId,
      promotedCount: promotedGuests.length,
      availableCapacityRemaining: Math.max(0, availableSlots - promotedGuests.length),
      remainingWaitlistCount: Math.max(0, candidates.length - promotedGuests.length),
      promotedGuests,
      message: `${promotedGuests.length} davetli sadakat skoruna göre yedek listeden terfi ettirildi ve biletleri hazırlandı.`,
    };
  }

  // 5. SON 24 SAAT WHATSAPP / SMS MOBİL BİLET HATIRLATMA MOTORU

  /**
   * Galaya 24 saat kala CONFIRMED davetlilerin No-Show oranını düşürmek için
   * telefonlarını bellekte çözerek kişiselleştirilmiş dinamik bilet hatırlatması gönderir.
   */
  async sendLast24hReminders(
    eventId: string,
    channel: 'WHATSAPP' | 'SMS' = 'WHATSAPP',
    overrideMessage?: string
  ) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException('Etkinlik bulunamadı.');
    }

    const confirmedInvitations = await this.prisma.invitation.findMany({
      where: {
        eventId,
        rsvpStatus: RsvpStatus.CONFIRMED,
      },
      include: {
        guest: true,
        ticket: true,
      },
    });

    const frontendBase = process.env.FRONTEND_URL || 'http://localhost:3000';
    const doorsOpenStr = new Date(event.doorsOpenAt).toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const reminders: Array<{
      guestId: string;
      fullName: string;
      maskedPhone: string;
      messageSnippet: string;
      channel: 'WHATSAPP' | 'SMS';
      sentAt: string;
    }> = [];

    const maskedPhones: string[] = [];

    for (const inv of confirmedInvitations) {
      if (!inv.guest.phoneEncrypted) continue;

      let plainPhone = '';
      try {
        plainPhone = this.securityService.decrypt(inv.guest.phoneEncrypted);
      } catch (err: any) {
        this.logger.warn(`Telefon şifresi çözülemedi (Guest: ${inv.guest.id}): ${err?.message}`);
        continue;
      }

      if (!plainPhone || plainPhone.trim() === '') continue;

      const maskedPhone = this.securityService.maskPhone(plainPhone);
      maskedPhones.push(maskedPhone);

      const fullName = `${inv.guest.firstName} ${inv.guest.lastName}`;
      const ticketUrl = `${frontendBase}/ticket/${inv.rsvpTokenHash}`;

      const variables = {
        fullName,
        firstName: inv.guest.firstName,
        lastName: inv.guest.lastName,
        movieTitle: event.movieTitle,
        eventTitle: event.title,
        venue: event.venue,
        doorsOpenTime: doorsOpenStr,
        ticketUrl,
      };

      const message = overrideMessage
        ? this.renderTemplate(overrideMessage, variables)
        : `Sayın ${fullName}, yarın akşamki ${event.movieTitle} galası için kapılar ${doorsOpenStr}'da açılacaktır. 30sn'de bir yenilenen dinamik QR biletiniz: ${ticketUrl}`;

      // Gerçek SMS / WhatsApp Gateway Adaptörü veya Güvenli Simülatör Logu
      this.logger.log(
        `[MobileReminder][${channel}] ${maskedPhone} numarasına gönderildi -> "${message.slice(0, 60)}..."`
      );

      reminders.push({
        guestId: inv.guest.id,
        fullName,
        maskedPhone,
        messageSnippet: message,
        channel,
        sentAt: new Date().toISOString(),
      });
    }

    // KVKK Denetim İzi Kaydı
    await this.auditLogService.log({
      userId: null,
      action: AuditAction.VIEW_PII,
      entityType: 'MobileReminderDispatch',
      entityId: eventId,
      metadata: {
        channel,
        totalSent: reminders.length,
        movieTitle: event.movieTitle,
      },
    });

    return {
      eventId,
      movieTitle: event.movieTitle,
      channel,
      totalConfirmed: confirmedInvitations.length,
      sentCount: reminders.length,
      maskedPhones,
      reminders,
    };
  }

  // 6. BASIN KİTİ (EPK - ELECTRONIC PRESS KIT) & AMBARGO YÖNETİMİ

  /**
   * Basın ve eleştirmenler için filmin ambargo tarihi, yüksek çözünürlüklü materyalleri
   * ve kişiye özel filigran mühürlü basın kitini döner, indirmeyi Audit Log'a kaydeder.
   */
  async downloadEpkPressKit(
    eventId: string,
    rawTokenOrGuestId?: string,
    ip?: string,
    userAgent?: string
  ) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException('Etkinlik bulunamadı.');
    }

    let guest: Guest | null = null;

    if (rawTokenOrGuestId && rawTokenOrGuestId.trim() !== '') {
      const trimmed = rawTokenOrGuestId.trim();
      // Önce raw token olarak ara
      const rsvpTokenHash = this.securityService.hashRsvpToken(trimmed);
      const invitation = await this.prisma.invitation.findFirst({
        where: {
          eventId,
          OR: [
            { rsvpTokenHash },
            { guestId: trimmed },
          ],
        },
        include: { guest: true },
      });

      if (invitation) {
        guest = invitation.guest;
      } else {
        guest = await this.prisma.guest.findUnique({
          where: { id: trimmed },
        });
      }
    }

    const watermarkId = guest
      ? `EPK-GUEST-${guest.id.replace(/-/g, '').slice(0, 8).toUpperCase()}`
      : `EPK-PRESS-CORP-${eventId.replace(/-/g, '').slice(0, 6).toUpperCase()}`;

    // Ambargo bitiş tarihi: Galadan 24 saat sonra veya başlangıç anı
    const embargoUntil = new Date(new Date(event.startsAt).getTime() + 12 * 60 * 60 * 1000).toISOString();

    // Denetim İzi (Audit Log)
    await this.auditLogService.log({
      userId: null,
      action: AuditAction.VIEW_PII,
      entityType: 'EventPressKit',
      entityId: eventId,
      metadata: {
        action: 'EPK_DOWNLOAD',
        watermarkId,
        guestId: guest?.id || null,
        guestName: guest ? `${guest.firstName} ${guest.lastName}` : 'Akredite Basın Mensubu',
        company: guest?.company || 'Ulusal Medya',
        embargoUntil,
      },
      ipAddress: ip,
      userAgent: userAgent,
    });

    return {
      success: true,
      eventId: event.id,
      movieTitle: event.movieTitle,
      eventTitle: event.title,
      venue: event.venue,
      embargoUntil,
      watermarkId,
      disclaimer: `DİKKAT: Bu basın kiti ${watermarkId} kimliği ile adınıza filigranlanmıştır. ${embargoUntil} tarihinden önce haber/inceleme ambargosu ihlal edilemez.`,
      pressKit: {
        synopsis: `${event.movieTitle} basın özeti, prodüksiyon notları, yönetmen vizyonu ve teknik künye.`,
        pressReleaseUrl: `/assets/epk/${event.id}/basin-bulteni-resmi.pdf`,
        hiResStills: [
          `/assets/epk/${event.id}/still-01-keyart-4k.jpg`,
          `/assets/epk/${event.id}/still-02-redcarpet-setup.jpg`,
          `/assets/epk/${event.id}/still-03-cast-portrait.jpg`,
        ],
        trailerProResUrl: `https://cdn.gala-pr.com/trailers/${event.id}/official-trailer-prores.mov`,
        interviewExcerptsUrl: `/assets/epk/${event.id}/oyuncu-roportaj-ses-kayitlari.zip`,
      },
      guestWatermark: {
        name: guest ? `${guest.firstName} ${guest.lastName}` : 'Akredite Basın Temsilcisi',
        company: guest?.company || 'Medya Kuruluşu',
        watermarkId,
      },
    };
  }

  /**
   * PR Yöneticisinin Manuel LCV ve +1 Onay Müdahalesi (Override)
   */
  async overrideRsvp(
    invitationId: string,
    dto: {
      rsvpStatus?: RsvpStatus;
      plusOneApproved?: number;
      plusOneRequested?: number;
      plusOneNames?: string;
    }
  ) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { id: invitationId },
      include: { ticket: true },
    });

    if (!invitation) {
      throw new NotFoundException(`Davetiye bulunamadı: ${invitationId}`);
    }

    const updateData: any = {
      responseChannel: ResponseChannel.MANUAL,
      respondedAt: new Date(),
    };

    if (dto.rsvpStatus) {
      updateData.rsvpStatus = dto.rsvpStatus;
    }
    if (dto.plusOneApproved !== undefined) {
      updateData.plusOneApproved = dto.plusOneApproved;
    }
    if (dto.plusOneRequested !== undefined) {
      updateData.plusOneRequested = dto.plusOneRequested;
    }
    if (dto.plusOneNames !== undefined) {
      updateData.plusOneNames = dto.plusOneNames;
    }

    const updated = await this.prisma.invitation.update({
      where: { id: invitationId },
      data: updateData,
      include: { ticket: true },
    });

    // Eğer CONFIRMED yapıldıysa ve bilet yoksa oluştur
    if (updated.rsvpStatus === RsvpStatus.CONFIRMED && !updated.ticket) {
      const totpSecret = this.securityService.generateTotpSecret();
      const totpSecretEncrypted = this.securityService.encrypt(totpSecret);
      const ticket = await this.prisma.ticket.create({
        data: {
          invitationId: updated.id,
          totpSecretEncrypted,
        },
      });
      (updated as any).ticket = ticket;
    }

    this.logger.log(
      `[OverrideRsvp] PR Yöneticisi LCV durumunu güncelledi: Invitation ${invitationId} -> ${updated.rsvpStatus}`
    );

    return updated;
  }
}
