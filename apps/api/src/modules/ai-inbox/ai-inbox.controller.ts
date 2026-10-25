import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Headers,
  Req,
  Ip,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiHeader,
} from '@nestjs/swagger';
import { Request } from 'express';
import { Role, AuditAction } from '@prisma/client';
import { AiInboxService } from './ai-inbox.service';
import {
  InboundEmailWebhookDto,
  SimulateInboundDto,
  ApproveAiReviewDto,
  RejectAiReviewDto,
  AiInboxFilterQueryDto,
} from './dto/ai-inbox.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RateLimit } from '../../common/decorators/rate-limit.decorator';
import { RateLimitGuard } from '../../common/guards/rate-limit.guard';
import { Audit } from '../security/decorators/audit.decorator';
import { AuditLogInterceptor } from '../security/interceptors/audit-log.interceptor';

@ApiTags('Çift Yönlü Otonom AI Gelen Kutusu (AI Inbox & Inbound Webhook)')
@Controller('api/v1/ai-inbox')
@UseGuards(JwtAuthGuard, RolesGuard, RateLimitGuard)
@UseInterceptors(AuditLogInterceptor)
@ApiBearerAuth()
export class AiInboxController {
  constructor(private readonly aiInboxService: AiInboxService) {}

  // --------------------------------------------------------------------------
  // 1. INBOUND EMAIL WEBHOOK (Resend / Svix / SMTP)
  // --------------------------------------------------------------------------

  @Post('webhook/inbound')
  @Public()
  @RateLimit({ limit: 30, windowSeconds: 60 })
  @ApiOperation({
    summary: 'Gelen E-Posta Webhook Uç Noktası (Resend Inbound)',
    description:
      'Davetlilerin LCV yanıt e-postalarını yakalar, HMAC imzasını doğrular, gövdeyi AES-256-GCM ile şifreler ve LLM Structured Output ile otonom işler.',
  })
  @ApiHeader({
    name: 'resend-signature',
    required: false,
    description: 'Resend Webhook HMAC-SHA256 İmzası',
  })
  @ApiResponse({
    status: 201,
    description: 'E-posta başarıyla işlendi (AUTO_PROCESSED veya NEEDS_REVIEW)',
  })
  async handleInboundWebhook(
    @Body() payload: InboundEmailWebhookDto,
    @Headers('resend-signature') signature?: string,
    @Headers('svix-signature') svixSignature?: string
  ) {
    const effectiveSignature = signature || svixSignature;
    return this.aiInboxService.processInboundEmailWebhook(payload, effectiveSignature);
  }

  // --------------------------------------------------------------------------
  // 2. GELEN E-POSTA SİMÜLATÖRÜ (Test & Panel İçin)
  // --------------------------------------------------------------------------

  @Post('simulate-inbound')
  @Roles(Role.SUPER_ADMIN, Role.PR_MANAGER)
  @ApiOperation({
    summary: 'Canlı E-Posta Yanıt Simülatörü',
    description:
      'PR Yöneticisinin panel üzerinden farklı senaryoları (Net onay + eş, soru içeren yanıt, kibar red) canlı test etmesini sağlar.',
  })
  @ApiResponse({ status: 201, description: 'Simülasyon başarıyla tamamlandı' })
  async simulateInbound(@Body() dto: SimulateInboundDto) {
    return this.aiInboxService.simulateInboundEmail(dto);
  }

  // --------------------------------------------------------------------------
  // 3. GELEN KUTUSU İNCELEME LİSTESİ & KPI İSTATİSTİKLERİ
  // --------------------------------------------------------------------------

  @Get('reviews')
  @Roles(Role.SUPER_ADMIN, Role.PR_MANAGER, Role.ANALYST)
  @ApiOperation({
    summary: 'AI Gelen Kutusu İnceleme Listesi ve KPI Metrikleri',
    description:
      'İnceleme bekleyen (NEEDS_REVIEW), otonom işlenen (AUTO_PROCESSED), onaylanan ve reddedilen e-posta listesini ve üst metrikleri döner.',
  })
  @ApiResponse({ status: 200, description: 'Gelen kutusu listesi ve KPI verileri' })
  async getReviews(@Query() query: AiInboxFilterQueryDto) {
    return this.aiInboxService.getReviews(query);
  }

  // --------------------------------------------------------------------------
  // 4. PR YÖNETİCİSİ ONAY VE YANIT GÖNDERİMİ
  // --------------------------------------------------------------------------

  @Post('reviews/:id/approve')
  @Roles(Role.SUPER_ADMIN, Role.PR_MANAGER)
  @Audit(AuditAction.APPROVE_AI_INBOX, 'AiInboxReview')
  @ApiOperation({
    summary: 'AI Taslak Yanıtını Onayla, E-Posta Gönder ve LCV Güncelle',
    description:
      'PR Yöneticisi AI taslağını düzenler/onaylar, nihai LCV durumunu belirler, davetliye yanıt gönderilir ve bilet üretilir.',
  })
  @ApiParam({ name: 'id', description: 'AiInboxReview ID' })
  @ApiResponse({ status: 200, description: 'Taslak onaylandı ve gönderildi' })
  async approveReview(
    @Param('id') id: string,
    @Body() dto: ApproveAiReviewDto,
    @CurrentUser('id') userId: string,
    @Ip() ip: string,
    @Req() req: Request
  ) {
    const userAgent = req.headers['user-agent'];
    return this.aiInboxService.approveAndSendReview(id, dto, userId, ip, userAgent);
  }

  // --------------------------------------------------------------------------
  // 5. PR YÖNETİCİSİ TASLAK REDDİ
  // --------------------------------------------------------------------------

  @Post('reviews/:id/reject')
  @Roles(Role.SUPER_ADMIN, Role.PR_MANAGER)
  @ApiOperation({
    summary: 'AI Taslak Yanıtını Reddet / Manuel İşaretle',
    description:
      'AI taslağını reddeder ve durumu REJECTED olarak işaretler.',
  })
  @ApiParam({ name: 'id', description: 'AiInboxReview ID' })
  @ApiResponse({ status: 200, description: 'Taslak reddedildi' })
  async rejectReview(
    @Param('id') id: string,
    @Body() dto: RejectAiReviewDto,
    @CurrentUser('id') userId: string,
    @Ip() ip: string,
    @Req() req: Request
  ) {
    const userAgent = req.headers['user-agent'];
    return this.aiInboxService.rejectReview(id, dto, userId, ip, userAgent);
  }
}
