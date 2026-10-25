import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { Role, AuditAction } from '@prisma/client';
import { EventCampaignService } from './event-campaign.service';
import { EmailService } from './email.service';
import {
  CreateEventDto,
  UpdateEventDto,
  SendCampaignDto,
  RsvpRespondDto,
  OverrideRsvpDto,
  WaitlistPromoteDto,
  SendReminderDto,
  EpkDownloadDto,
} from './dto/email-campaign.dto';
import { Request } from 'express';
import { Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { RateLimit } from '../../common/decorators/rate-limit.decorator';
import { RateLimitGuard } from '../../common/guards/rate-limit.guard';
import { Audit } from '../security/decorators/audit.decorator';
import { AuditLogInterceptor } from '../security/interceptors/audit-log.interceptor';

@ApiTags('Gala Etkinlik & Toplu E-Posta / Kriptografik LCV (Email & Events)')
@Controller('api/v1/email')
@UseGuards(JwtAuthGuard, RolesGuard, RateLimitGuard)
@UseInterceptors(AuditLogInterceptor)
@ApiBearerAuth()
export class EmailController {
  constructor(
    private readonly eventCampaignService: EventCampaignService,
    private readonly emailService: EmailService
  ) {}

  // --------------------------------------------------------------------------
  // 1. ETKİNLİK LİSTELEME & DETAY
  // --------------------------------------------------------------------------

  @Get('events')
  @Roles(Role.SUPER_ADMIN, Role.PR_MANAGER, Role.ANALYST)
  @ApiOperation({
    summary: 'Tüm Gala Etkinliklerini ve LCV Doluluk İstatistiklerini Listele',
    description:
      'Etkinlik kapasitesi, toplam davetli, onaylanan, reddedilen, bekleyen ve +1 kontenjanı istatistiklerini hesaplayarak döner.',
  })
  @ApiResponse({ status: 200, description: 'Etkinlikler ve LCV hunisi istatistikleri' })
  async getEvents() {
    return this.eventCampaignService.findAllEvents();
  }

  @Post('events')
  @Roles(Role.SUPER_ADMIN, Role.PR_MANAGER)
  @ApiOperation({
    summary: 'Yeni Gala / Özel Gösterim Etkinliği Oluştur',
    description: 'Etkinlik başlığı, film adı, mekan, kapasite ve kapı açılış saatlerini kaydeder.',
  })
  @ApiResponse({ status: 201, description: 'Etkinlik başarıyla oluşturuldu' })
  async createEvent(@Body() dto: CreateEventDto) {
    return this.eventCampaignService.createEvent(dto);
  }

  @Get('events/:eventId')
  @Roles(Role.SUPER_ADMIN, Role.PR_MANAGER, Role.ANALYST)
  @ApiOperation({ summary: 'Tekil Etkinlik Detayı ve Davetiye Listesi (KVKK Maskeli)' })
  @ApiParam({ name: 'eventId', description: 'Etkinlik UUID' })
  @ApiResponse({ status: 200, description: 'Etkinlik detayları ve davetiye listesi' })
  async getEventDetail(@Param('eventId') eventId: string) {
    return this.eventCampaignService.findOneEvent(eventId);
  }

  @Patch('events/:eventId')
  @Roles(Role.SUPER_ADMIN, Role.PR_MANAGER)
  @ApiOperation({
    summary: 'Etkinlik Bilgilerini, Kapasitesini ve Durumunu Güncelle',
    description: 'Etkinlik durumunu (DRAFT, PUBLISHED, COMPLETED, ARCHIVED), mekanını veya kapasitesini günceller.',
  })
  @ApiParam({ name: 'eventId', description: 'Etkinlik UUID' })
  @ApiResponse({ status: 200, description: 'Etkinlik başarıyla güncellendi' })
  async updateEvent(
    @Param('eventId') eventId: string,
    @Body() dto: UpdateEventDto
  ) {
    return this.eventCampaignService.updateEvent(eventId, dto);
  }

  // --------------------------------------------------------------------------
  // 2. TOPLU KAMPANYA GÖNDERİMİ
  // --------------------------------------------------------------------------

  @Post('events/:eventId/send-campaign')
  @Roles(Role.SUPER_ADMIN, Role.PR_MANAGER)
  @ApiOperation({
    summary: 'Seçili Segmentlere / Davetlilere Kişiselleştirilmiş Toplu Davetiye Gönder',
    description:
      'Kara listedeki şahısları otomatik olarak atlar (Blacklist Guard). Her davetli için 32-byte kriptografik LCV token üretir, veritabanına sadece hash kaydeder, e-posta şablonunu kişiselleştirir ve asenkron gönderir.',
  })
  @ApiParam({ name: 'eventId', description: 'Etkinlik UUID' })
  @ApiResponse({ status: 200, description: 'Kampanya başarıyla gönderildi' })
  async sendCampaign(
    @Param('eventId') eventId: string,
    @Body() dto: SendCampaignDto
  ) {
    return this.emailService.sendBulkInvitations(eventId, {
      filterTags: dto.filterTags,
      guestIds: dto.guestIds,
      customSubject: dto.customSubject,
      customTemplate: dto.customTemplate,
    });
  }

  // --------------------------------------------------------------------------
  // 3. TEK TIKLA LCV (ONE-CLICK RSVP) DOĞRULAMA & YANITLAMA (PUBLIC)
  // --------------------------------------------------------------------------

  @Get('rsvp/verify/:token')
  @Public()
  @RateLimit({ limit: 15, windowSeconds: 60 })
  @ApiOperation({
    summary: 'Tek Tıkla LCV Linkini Doğrula ve Etkinlik Özetini Getir (Public)',
    description:
      'Gelen raw token değerinin HMAC-SHA256 hash özeti alınarak davetiye bulunur. PII sızdırmadan davetli adı, film, mekan ve mevcut LCV durumunu döner.',
  })
  @ApiParam({ name: 'token', description: '32-byte hex ham RSVP belirteci' })
  @ApiResponse({ status: 200, description: 'LCV token doğrulandı' })
  @ApiResponse({ status: 404, description: 'Geçersiz veya süresi dolmuş token' })
  async verifyRsvpToken(@Param('token') token: string) {
    return this.emailService.verifyRsvpToken(token);
  }

  @Post('rsvp/respond')
  @Public()
  @RateLimit({ limit: 10, windowSeconds: 60 })
  @ApiOperation({
    summary: 'Davetlinin Tek Tıkla LCV Onay/Red ve +1 Yanıtını İşle (Public)',
    description:
      'LCV yanıtını kaydeder. Eğer yanıt CONFIRMED ise ve davetlinin henüz bileti yoksa, otomatik olarak TOTP secret üretip AES-256-GCM ile şifreleyerek bilet (Ticket) kaydını oluşturur!',
  })
  @ApiResponse({ status: 200, description: 'LCV yanıtı başarıyla işlendi' })
  async respondRsvp(@Body() dto: RsvpRespondDto) {
    return this.emailService.processOneClickRsvp(
      dto.token,
      dto.action,
      dto.plusOneRequested,
      dto.plusOneNames
    );
  }

  // --------------------------------------------------------------------------
  // 4. PR YÖNETİCİSİ MANUEL MÜDAHALE (OVERRIDE)
  // --------------------------------------------------------------------------

  @Patch('invitations/:id/override')
  @Roles(Role.SUPER_ADMIN, Role.PR_MANAGER)
  @Audit(AuditAction.OVERRIDE_RSVP, 'Invitation')
  @ApiOperation({
    summary: 'PR Yöneticisi Manuel LCV ve +1 Onayı Müdahalesi',
    description:
      'PR yöneticisi davetlinin LCV durumunu veya onaylanan +1 kontenjanını günceller. Yapılan müdahale OVERRIDE_RSVP olarak denetim kütüğüne (Audit Log) kaydedilir.',
  })
  @ApiParam({ name: 'id', description: 'Davetiye (Invitation) UUID' })
  @ApiResponse({ status: 200, description: 'LCV durumu güncellendi' })
  async overrideRsvp(
    @Param('id') id: string,
    @Body() dto: OverrideRsvpDto
  ) {
    return this.emailService.overrideRsvp(id, dto);
  }

  // --------------------------------------------------------------------------
  // 5. AKILLI YEDEK LİSTE TERFİSİ (WAITLIST PROMOTER)
  // --------------------------------------------------------------------------

  @Post('events/:eventId/waitlist/promote')
  @Roles(Role.SUPER_ADMIN, Role.PR_MANAGER)
  @ApiOperation({
    summary: 'Boşalan Kontenjanı Sadakat Skoruna Göre Otomatik Doldur',
    description:
      'Kapasite boşaldığında yedek listedeki (WAITLIST) veya ikincil (SECONDARY) davetlileri sadakat puanına göre en yüksekten düşüğe doğru otomatik olarak CONFIRMED yapar ve bilet üretir.',
  })
  @ApiParam({ name: 'eventId', description: 'Etkinlik UUID' })
  @ApiResponse({ status: 200, description: 'Yedek liste başarıyla terfi ettirildi' })
  async promoteWaitlist(
    @Param('eventId') eventId: string,
    @Body() dto: WaitlistPromoteDto
  ) {
    return this.emailService.promoteFromWaitlist(eventId, dto?.targetCount);
  }

  // --------------------------------------------------------------------------
  // 6. SON 24 SAAT WHATSAPP / SMS MOBİL BİLET HATIRLATMA
  // --------------------------------------------------------------------------

  @Post('events/:eventId/reminders/send')
  @Roles(Role.SUPER_ADMIN, Role.PR_MANAGER)
  @ApiOperation({
    summary: 'Teyitli Davetlilere Son 24 Saat WhatsApp/SMS Mobil Bilet Hatırlatması Gönder',
    description:
      'No-Show oranını düşürmek için CONFIRMED davetlilerin şifreli telefonlarını bellekte çözerek dinamik bilet linki içeren WhatsApp veya SMS bildirimi yollar. Çıktıda KVKK maskeli telefon döner.',
  })
  @ApiParam({ name: 'eventId', description: 'Etkinlik UUID' })
  @ApiResponse({ status: 200, description: 'Hatırlatma gönderim raporu' })
  async sendReminders(
    @Param('eventId') eventId: string,
    @Body() dto: SendReminderDto
  ) {
    return this.emailService.sendLast24hReminders(
      eventId,
      dto?.channel || 'WHATSAPP',
      dto?.overrideMessage
    );
  }

  // --------------------------------------------------------------------------
  // 7. BASIN KİTİ (EPK) & AMBARGO TAAHHÜDÜ İNDİRME (PUBLIC)
  // --------------------------------------------------------------------------

  @Post('events/:eventId/epk-download')
  @Public()
  @RateLimit({ limit: 30, windowSeconds: 60 })
  @ApiOperation({
    summary: 'Basın Kiti (EPK) ve Ambargo Bilgisini Filigranlı Olarak İndir (Public)',
    description:
      'Basın mensupları için yüksek çözünürlüklü materyalleri, fragman ve bülteni döner. İndiren şahıs adına özel Watermark ID üretir ve VIEW_PII denetim izine kaydeder.',
  })
  @ApiParam({ name: 'eventId', description: 'Etkinlik UUID' })
  @ApiResponse({ status: 200, description: 'Basın kiti ve filigran bilgisi' })
  async downloadEpk(
    @Param('eventId') eventId: string,
    @Body() dto: EpkDownloadDto,
    @Req() req: Request
  ) {
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket?.remoteAddress;
    const userAgent = req.headers['user-agent'];
    const tokenOrId = dto?.rawToken || dto?.guestId;
    return this.emailService.downloadEpkPressKit(eventId, tokenOrId, ip, userAgent);
  }
}
