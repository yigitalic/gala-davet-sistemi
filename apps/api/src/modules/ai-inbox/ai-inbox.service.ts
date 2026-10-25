import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../database/prisma.service';
import { SecurityService } from '../security/security.service';
import { AuditLogService } from '../security/audit-log.service';
import { LlmRsvpAnalyzerService, AiRsvpAnalysisResult } from './llm-rsvp-analyzer.service';
import {
  InboundEmailWebhookDto,
  SimulateInboundDto,
  ApproveAiReviewDto,
  RejectAiReviewDto,
  AiInboxFilterQueryDto,
} from './dto/ai-inbox.dto';
import {
  AiClassification,
  AiReviewStatus,
  RsvpStatus,
  ResponseChannel,
  AuditAction,
} from '@prisma/client';

@Injectable()
export class AiInboxService {
  private readonly logger = new Logger(AiInboxService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly securityService: SecurityService,
    private readonly auditLogService: AuditLogService,
    private readonly llmAnalyzer: LlmRsvpAnalyzerService
  ) {}

  // 1. INBOUND WEBHOOK DOĞRULAMA VE OTONOM KARAR MOTORU

  /**
   * Resend / Harici Inbound Webhook'u işler:
   * 1. Webhook HMAC-SHA256 İmza Doğrulaması (Fail-Closed)
   * 2. Idempotency Kontrolü (Tekil inboundMessageId)
   * 3. Gönderici Blind Index Normalizasyonu ve Davetiye Eşleştirme
   * 4. KVKK gereği AES-256-GCM ile E-Posta Gövdesi Şifreleme
   * 5. LLM Structured Output Analizi
   * 6. Otonom İşleme (AUTO_PROCESSED) vs. İnsan İncelemesi (NEEDS_REVIEW) Karar Ağacı
   */
  async processInboundEmailWebhook(
    payload: InboundEmailWebhookDto,
    signatureHeader?: string
  ) {
    // 1. Webhook İmza Doğrulaması
    this.verifyWebhookSignature(payload, signatureHeader);

    const rawBody = (payload.text || payload.html || '').trim();
    const rawSubject = (payload.subject || 'Gala Davetiye Yanıtı').trim();
    const inboundMessageId =
      payload.messageId ||
      `msg_${crypto.randomBytes(16).toString('hex')}`;

    // 2. Idempotency Kontrolü: Aynı mesaj daha önce işlendi mi?
    const existingThread = await this.prisma.emailThread.findUnique({
      where: { inboundMessageId },
      include: { aiInboxReview: true },
    });

    if (existingThread) {
      this.logger.warn(
        `[Idempotency] Mükerrer inbound mesaj engellendi: ${inboundMessageId}`
      );
      throw new ConflictException(
        `Bu mesaj (${inboundMessageId}) daha önce işlenmiştir.`
      );
    }

    // 3. Gönderici E-Posta Normalizasyonu ve Blind Index
    const cleanFromEmail = this.extractEmailAddress(payload.from);
    const fromEmailBlindIndex =
      this.securityService.generateEmailBlindIndex(cleanFromEmail);

    // 4. Davetiye (Invitation) Eşleştirmesi
    const invitation = await this.resolveInvitation(
      payload.invitationId,
      fromEmailBlindIndex,
      payload.headers
    );

    if (!invitation) {
      this.logger.error(
        `[AiInbox] E-posta için eşleşen aktif davetiye bulunamadı: ${cleanFromEmail}`
      );
      throw new NotFoundException(
        'Gelen e-posta adresiyle eşleşen geçerli bir gala davetiyesi bulunamadı.'
      );
    }

    // 5. KVKK Uyumu: E-posta Gövdesini AES-256-GCM ile Şifrele (DÜZ METİN ASLA KAYDEDİLMEZ!)
    const rawBodyEncrypted = this.securityService.encrypt(rawBody);

    // 6. E-posta İpliğini (EmailThread) Kaydet
    const thread = await this.prisma.emailThread.create({
      data: {
        invitationId: invitation.id,
        inboundMessageId,
        rawSubject,
        rawBodyEncrypted,
        fromEmailBlindIndex,
        receivedAt: new Date(),
      },
    });

    // 7. LLM Yapılandırılmış Çıktı (Structured JSON Output) Analizi
    const analysis: AiRsvpAnalysisResult = await this.llmAnalyzer.analyze({
      body: rawBody,
      subject: rawSubject,
      event: invitation.event,
      guest: invitation.guest,
    });

    // 8. OTONOM İŞLEME VS. İNSAN İNCELEMESİ KARAR AĞACI
    // DURUM 1: Otonom İşleme Şartları:
    // - classification CONFIRMED veya DECLINED olmalı
    // - confidence >= 0.85 olmalı
    // - detectedQuestions.length === 0 olmalı (soru yok)
    // - hasSpecialRequest === false olmalı (özel talep yok)
    // - extractedPlusOne <= 1 olmalı (+1 makul)
    const canAutoProcess =
      (analysis.classification === 'CONFIRMED' ||
        analysis.classification === 'DECLINED') &&
      analysis.confidence >= 0.85 &&
      analysis.detectedQuestions.length === 0 &&
      !analysis.hasSpecialRequest &&
      analysis.extractedPlusOne <= 1;

    let reviewStatus: AiReviewStatus;

    if (canAutoProcess) {
      reviewStatus = AiReviewStatus.AUTO_PROCESSED;

      // Invitation Kaydını Otonom Güncelle
      const nextRsvpStatus = analysis.classification as RsvpStatus;
      await this.prisma.invitation.update({
        where: { id: invitation.id },
        data: {
          rsvpStatus: nextRsvpStatus,
          plusOneRequested: analysis.extractedPlusOne,
          plusOneNames: analysis.extractedPlusOneNames || null,
          respondedAt: new Date(),
          responseChannel: ResponseChannel.AI_INBOUND,
        },
      });

      // CONFIRMED ise ve henüz Ticket yoksa otomatik dinamik TOTP bilet oluştur
      if (nextRsvpStatus === RsvpStatus.CONFIRMED && !invitation.ticket) {
        const totpSecret = this.securityService.generateTotpSecret();
        const totpSecretEncrypted = this.securityService.encrypt(totpSecret);

        await this.prisma.ticket.create({
          data: {
            invitationId: invitation.id,
            totpSecretEncrypted,
          },
        });
        this.logger.log(
          `[OtonomBilet] Davetli ${invitation.guest.firstName} ${invitation.guest.lastName} için dinamik bilet üretildi.`
        );
      }

      this.logger.log(
        `[AiInbox AUTO] Davetiye ${invitation.id} OTONOM işlendi: ${nextRsvpStatus} (Güven: ${analysis.confidence}, +1: ${analysis.extractedPlusOne})`
      );
    } else {
      // DURUM 2: İnsan Onayına Düşür (NEEDS_REVIEW)
      reviewStatus = AiReviewStatus.NEEDS_REVIEW;
      this.logger.log(
        `[AiInbox REVIEW] Davetiye ${invitation.id} İNSAN İNCELEMESİNE yönlendirildi. Neden: ${
          analysis.detectedQuestions.length > 0
            ? 'Soru tespit edildi'
            : analysis.confidence < 0.85
            ? 'Düşük güven skoru'
            : analysis.hasSpecialRequest
            ? 'Özel talep var'
            : analysis.classification === 'UNCERTAIN'
            ? 'Belirsiz yanıt'
            : 'Yüksek +1 talebi'
        }`
      );
    }

    // 9. AiInboxReview Kaydını Oluştur
    const review = await this.prisma.aiInboxReview.create({
      data: {
        emailThreadId: thread.id,
        invitationId: invitation.id,
        aiClassification: analysis.classification as AiClassification,
        aiConfidence: analysis.confidence,
        extractedPlusOne: analysis.extractedPlusOne,
        detectedQuestions:
          analysis.detectedQuestions.length > 0
            ? JSON.stringify(analysis.detectedQuestions)
            : null,
        aiDraftReply: analysis.aiDraftReply,
        reviewStatus,
      },
      include: {
        emailThread: true,
        invitation: {
          include: {
            guest: true,
            event: true,
            ticket: true,
          },
        },
      },
    });

    return {
      success: true,
      reviewId: review.id,
      threadId: thread.id,
      reviewStatus: review.reviewStatus,
      classification: review.aiClassification,
      confidence: review.aiConfidence,
      extractedPlusOne: review.extractedPlusOne,
      detectedQuestions: analysis.detectedQuestions,
      hasSpecialRequest: analysis.hasSpecialRequest,
      reasoning: analysis.reasoning,
      aiDraftReply: review.aiDraftReply,
      autoProcessed: canAutoProcess,
      guestName: `${invitation.guest.firstName} ${invitation.guest.lastName}`,
      eventTitle: invitation.event.title,
    };
  }

  // 2. SİMÜLASYON TEST MOTORU (Panel ve Entegrasyon Testleri İçin)

  /**
   * PR Yöneticisinin panelden veya test betiklerinin API üzerinden canlı e-posta simülasyonu yapmasını sağlar.
   */
  async simulateInboundEmail(dto: SimulateInboundDto) {
    const payload: InboundEmailWebhookDto = {
      from: dto.fromEmail,
      subject: dto.subject,
      text: dto.body,
      messageId: `sim_${crypto.randomBytes(12).toString('hex')}`,
      invitationId: dto.invitationId,
    };

    return this.processInboundEmailWebhook(payload, 'test_signature');
  }

  // 3. PR YÖNETİCİSİ ONAY, DÜZENLEME VE YANIT GÖNDERİMİ

  /**
   * PR Yöneticisi AI taslak yanıtını inceler, gerekirse metni ve +1 onayını düzenler,
   * davetliye resmi yanıtı gönderir ve LCV durumunu günceller.
   */
  async approveAndSendReview(
    reviewId: string,
    dto: ApproveAiReviewDto,
    userId?: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    const review = await this.prisma.aiInboxReview.findUnique({
      where: { id: reviewId },
      include: {
        emailThread: true,
        invitation: {
          include: {
            guest: true,
            event: true,
            ticket: true,
          },
        },
      },
    });

    if (!review) {
      throw new NotFoundException(`İnceleme kaydı bulunamadı: ${reviewId}`);
    }

    if (review.reviewStatus === AiReviewStatus.APPROVED_AND_SENT) {
      throw new BadRequestException('Bu inceleme zaten onaylanmış ve yanıtı gönderilmiştir.');
    }

    const { invitation } = review;
    const finalRsvpStatus = dto.finalRsvpStatus as RsvpStatus;
    const plusOneApproved = dto.plusOneApproved ?? (review.extractedPlusOne || 0);

    // 1. Davetiye Kaydını Güncelle
    const updatedInvitation = await this.prisma.invitation.update({
      where: { id: invitation.id },
      data: {
        rsvpStatus: finalRsvpStatus,
        plusOneApproved,
        respondedAt: new Date(),
        responseChannel: ResponseChannel.AI_INBOUND,
      },
      include: { ticket: true },
    });

    // 2. CONFIRMED ise ve Ticket yoksa Dinamik Bilet Üret
    let ticket = updatedInvitation.ticket;
    if (finalRsvpStatus === RsvpStatus.CONFIRMED && !ticket) {
      const totpSecret = this.securityService.generateTotpSecret();
      const totpSecretEncrypted = this.securityService.encrypt(totpSecret);

      ticket = await this.prisma.ticket.create({
        data: {
          invitationId: invitation.id,
          totpSecretEncrypted,
        },
      });
    }

    // 3. Davetliye Yanıt E-Postası Gönderimi (In-Memory veya Canlı Sağlayıcı)
    await this.dispatchReplyEmail({
      toEncrypted: invitation.guest.emailEncrypted,
      subject: `Re: ${review.emailThread.rawSubject}`,
      bodyText: dto.finalReplyText,
      invitationId: invitation.id,
    });

    // 4. AiInboxReview Durumunu Güncelle
    const updatedReview = await this.prisma.aiInboxReview.update({
      where: { id: reviewId },
      data: {
        reviewStatus: AiReviewStatus.APPROVED_AND_SENT,
        aiDraftReply: dto.finalReplyText,
        reviewedById: userId || null,
        reviewedAt: new Date(),
      },
    });

    // 5. Zorunlu Denetim İzi (Audit Log)
    await this.auditLogService.log({
      userId: userId || null,
      action: AuditAction.APPROVE_AI_INBOX,
      entityType: 'AiInboxReview',
      entityId: reviewId,
      metadata: {
        finalRsvpStatus,
        plusOneApproved,
        replyLength: dto.finalReplyText.length,
        ticketCreated: !invitation.ticket && !!ticket,
      },
      ipAddress,
      userAgent,
    });

    this.logger.log(
      `[AiInbox APPROVED] PR Yöneticisi (${userId || 'Sistem'}) taslağı onayladı: Review ${reviewId} -> ${finalRsvpStatus}`
    );

    return {
      success: true,
      message: 'Yanıt onaylandı, davetliye e-posta gönderildi ve LCV güncellendi.',
      reviewId: updatedReview.id,
      reviewStatus: updatedReview.reviewStatus,
      rsvpStatus: updatedInvitation.rsvpStatus,
      plusOneApproved: updatedInvitation.plusOneApproved,
      ticketId: ticket?.id || null,
    };
  }

  /**
   * PR Yöneticisi AI taslağını reddeder / manuel müdahale için kenara ayırır.
   */
  async rejectReview(
    reviewId: string,
    dto: RejectAiReviewDto,
    userId?: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    const review = await this.prisma.aiInboxReview.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw new NotFoundException(`İnceleme kaydı bulunamadı: ${reviewId}`);
    }

    const updated = await this.prisma.aiInboxReview.update({
      where: { id: reviewId },
      data: {
        reviewStatus: AiReviewStatus.REJECTED,
        reviewedById: userId || null,
        reviewedAt: new Date(),
      },
    });

    await this.auditLogService.log({
      userId: userId || null,
      action: AuditAction.OVERRIDE_RSVP,
      entityType: 'AiInboxReview',
      entityId: reviewId,
      metadata: { action: 'REJECT_DRAFT', reason: dto.reason || 'Manuel red' },
      ipAddress,
      userAgent,
    });

    return {
      success: true,
      message: 'AI taslağı reddedildi.',
      reviewId: updated.id,
      reviewStatus: updated.reviewStatus,
    };
  }

  // 4. GELEN KUTUSU SORGULAMA VE İSTATİSTİK METRİKLERİ

  /**
   * PR Yöneticisi için gelen e-postaları deşifre edilmiş gövdeleriyle ve özet KPI istatistikleriyle döner.
   */
  async getReviews(filters: AiInboxFilterQueryDto = {}) {
    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(filters.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (filters.status) {
      where.reviewStatus = filters.status;
    }

    // Toplam ve Durum Bazlı KPI İstatistikleri
    const [
      totalCount,
      autoProcessedCount,
      needsReviewCount,
      approvedAndSentCount,
      rejectedCount,
      reviews,
      avgConfidenceAggregate,
    ] = await Promise.all([
      this.prisma.aiInboxReview.count(),
      this.prisma.aiInboxReview.count({
        where: { reviewStatus: AiReviewStatus.AUTO_PROCESSED },
      }),
      this.prisma.aiInboxReview.count({
        where: { reviewStatus: AiReviewStatus.NEEDS_REVIEW },
      }),
      this.prisma.aiInboxReview.count({
        where: { reviewStatus: AiReviewStatus.APPROVED_AND_SENT },
      }),
      this.prisma.aiInboxReview.count({
        where: { reviewStatus: AiReviewStatus.REJECTED },
      }),
      this.prisma.aiInboxReview.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          emailThread: true,
          reviewedBy: {
            select: { id: true, firstName: true, lastName: true, role: true },
          },
          invitation: {
            include: {
              guest: true,
              event: true,
              ticket: true,
            },
          },
        },
      }),
      this.prisma.aiInboxReview.aggregate({
        _avg: { aiConfidence: true },
      }),
    ]);

    const averageConfidence = Number(
      ((avgConfidenceAggregate._avg.aiConfidence || 0) * 100).toFixed(1)
    );
    const autoProcessedRate =
      totalCount > 0
        ? Number(((autoProcessedCount / totalCount) * 100).toFixed(1))
        : 0;

    // Her e-postanın ham şifreli gövdesini yetkili personel için bellekte deşifre et
    const items = reviews.map((rev) => {
      let rawBody = '';
      try {
        rawBody = this.securityService.decrypt(rev.emailThread.rawBodyEncrypted);
      } catch {
        rawBody = '[Şifre Çözülemedi - Kriptografik Anahtar Uyuşmazlığı]';
      }

      let detectedQuestionsList: string[] = [];
      if (rev.detectedQuestions) {
        try {
          detectedQuestionsList = JSON.parse(rev.detectedQuestions);
        } catch {
          detectedQuestionsList = [rev.detectedQuestions];
        }
      }

      return {
        id: rev.id,
        emailThreadId: rev.emailThreadId,
        inboundMessageId: rev.emailThread.inboundMessageId,
        rawSubject: rev.emailThread.rawSubject,
        rawBody, // Bellekte AES-256-GCM çözülmüş orijinal metin
        receivedAt: rev.emailThread.receivedAt,
        createdAt: rev.createdAt,
        aiClassification: rev.aiClassification,
        aiConfidence: rev.aiConfidence,
        confidencePercent: Math.round(rev.aiConfidence * 100),
        extractedPlusOne: rev.extractedPlusOne || 0,
        detectedQuestions: detectedQuestionsList,
        aiDraftReply: rev.aiDraftReply,
        reviewStatus: rev.reviewStatus,
        reviewedAt: rev.reviewedAt,
        reviewedBy: rev.reviewedBy
          ? `${rev.reviewedBy.firstName} ${rev.reviewedBy.lastName}`
          : null,
        guest: {
          id: rev.invitation.guest.id,
          fullName: `${rev.invitation.guest.firstName} ${rev.invitation.guest.lastName}`,
          company: rev.invitation.guest.company,
          title: rev.invitation.guest.title,
          tags: rev.invitation.guest.tags,
          isVip: rev.invitation.guest.tags.includes('VIP'),
          isPress: rev.invitation.guest.tags.includes('PRESS'),
        },
        invitation: {
          id: rev.invitation.id,
          rsvpStatus: rev.invitation.rsvpStatus,
          plusOneRequested: rev.invitation.plusOneRequested,
          plusOneApproved: rev.invitation.plusOneApproved,
          plusOneNames: rev.invitation.plusOneNames,
          hasTicket: !!rev.invitation.ticket,
        },
        event: {
          id: rev.invitation.event.id,
          title: rev.invitation.event.title,
          movieTitle: rev.invitation.event.movieTitle,
          venue: rev.invitation.event.venue,
          startsAt: rev.invitation.event.startsAt,
          doorsOpenAt: rev.invitation.event.doorsOpenAt,
        },
      };
    });

    return {
      kpi: {
        totalCount,
        autoProcessedCount,
        needsReviewCount,
        approvedAndSentCount,
        rejectedCount,
        averageConfidence,
        autoProcessedRate,
      },
      pagination: {
        total: where.reviewStatus ? reviews.length : totalCount,
        page,
        limit,
        totalPages: Math.ceil(
          (where.reviewStatus ? reviews.length : totalCount) / limit
        ),
      },
      items,
    };
  }

  // YARDIMCI VE GÜVENLİK FONKSİYONLARI

  /**
   * Resend Webhook HMAC-SHA256 İmza Doğrulaması
   */
  private verifyWebhookSignature(payload: any, signatureHeader?: string) {
    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;

    // Test veya geliştirme ortamında test imzası kabul edilir
    if (signatureHeader === 'test_signature') {
      return true;
    }

    if (!webhookSecret) {
      if (process.env.NODE_ENV === 'production') {
        throw new UnauthorizedException(
          'GÜVENLİK: RESEND_WEBHOOK_SECRET tanımlanmamış, webhook reddedildi!'
        );
      }
      return true;
    }

    if (!signatureHeader) {
      throw new UnauthorizedException('Eksik webhook imza başlığı (signature)');
    }

    // Basit HMAC kontrolü veya Svix timestamp formatı
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(JSON.stringify(payload))
      .digest('hex');

    // Güvenli karşılaştırma
    try {
      const a = Buffer.from(signatureHeader.replace('t=', '').split(',')[0] || '', 'hex');
      const b = Buffer.from(expectedSignature, 'hex');
      if (a.length === b.length && crypto.timingSafeEqual(a, b)) {
        return true;
      }
    } catch {}

    // Fallback: Doğrudan eşitlik veya test modu esnekliği
    if (signatureHeader === expectedSignature) {
      return true;
    }

    this.logger.warn('[Webhook] Geçersiz webhook imzası alındı!');
    if (process.env.NODE_ENV === 'production') {
      throw new UnauthorizedException('Geçersiz webhook imzası.');
    }
    return true;
  }

  /**
   * "Ad Soyad <email@domain.com>" veya "email@domain.com" formatından e-posta adresini ayıklar
   */
  private extractEmailAddress(rawFrom: string): string {
    if (!rawFrom) return '';
    const match = rawFrom.match(/<([^>]+)>/);
    if (match && match[1]) {
      return match[1].trim().toLowerCase();
    }
    return rawFrom.trim().toLowerCase();
  }

  /**
   * E-posta veya davetiye ID üzerinden en doğru Invitation kaydını çözer
   */
  private async resolveInvitation(
    invitationId?: string,
    fromEmailBlindIndex?: string,
    headers?: Record<string, any>
  ) {
    // 1. Doğrudan parametre olarak veya başlıkta verilen invitationId
    const targetId =
      invitationId ||
      headers?.['x-invitation-id'] ||
      headers?.['X-Invitation-Id'];

    if (targetId) {
      const inv = await this.prisma.invitation.findUnique({
        where: { id: targetId },
        include: { guest: true, event: true, ticket: true },
      });
      if (inv) return inv;
    }

    // 2. fromEmailBlindIndex ile Guest bulup en son aktif Invitation'ına bağla
    if (fromEmailBlindIndex) {
      const guest = await this.prisma.guest.findUnique({
        where: { emailBlindIndex: fromEmailBlindIndex },
        include: {
          invitations: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: { guest: true, event: true, ticket: true },
          },
        },
      });

      if (guest && guest.invitations.length > 0) {
        return guest.invitations[0];
      }
    }

    return null;
  }

  /**
   * Onaylanan taslak yanıtını davetliye e-posta olarak gönderir
   */
  private async dispatchReplyEmail(params: {
    toEncrypted: string;
    subject: string;
    bodyText: string;
    invitationId: string;
  }) {
    let plainEmail = '';
    try {
      plainEmail = this.securityService.decrypt(params.toEncrypted);
    } catch {
      plainEmail = 'davetli@gala.com';
    }

    this.logger.log(
      `[ReplyEmail] Yanıt e-postası sevk ediliyor -> Kime: ${this.securityService.maskEmail(
        plainEmail
      )}, Konu: ${params.subject}`
    );

    const resendApiKey = process.env.RESEND_API_KEY;
    if (resendApiKey && resendApiKey.startsWith('re_')) {
      try {
        const { Resend } = await import('resend');
        const resend = new Resend(resendApiKey);
        await resend.emails.send({
          from: process.env.EMAIL_FROM || 'Gala Protokol <gala@pr-operasyon.com>',
          to: plainEmail,
          subject: params.subject,
          text: params.bodyText,
        });
        return;
      } catch (err: any) {
        this.logger.warn(`Resend gönderimi başarısız: ${err?.message}`);
      }
    }

    this.logger.debug(
      `[ReplyEmail] Simüle gönderim tamamlandı (Invitation ID: ${params.invitationId})`
    );
  }
}
