import {
  Controller,
  Get,
  Post,
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
import { AnalyticsService } from './analytics.service';
import { ScanMentionsDto, GhostingPenaltyDto } from './dto/analytics.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Audit } from '../security/decorators/audit.decorator';
import { AuditLogInterceptor } from '../security/interceptors/audit-log.interceptor';
import { AuthenticatedUser } from '@gala/shared';

@ApiTags('Gala Sonrası PR & ROI Analitiği (Analytics)')
@Controller('api/v1/analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditLogInterceptor)
@ApiBearerAuth()
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  // --------------------------------------------------------------------------
  // 1. TEK SAYFALIK YÖNETİCİ GALA PR & ERİŞİM RAPORU (EXECUTIVE PR REPORT)
  // --------------------------------------------------------------------------
  @Get('events/:eventId/executive-report')
  @Roles(Role.SUPER_ADMIN, Role.PR_MANAGER, Role.ANALYST)
  @ApiOperation({
    summary: 'Tek Sayfalık Yönetici Gala PR & Erişim Raporu (Executive PR & ROI Report)',
    description:
      'Üst yönetime sunulmak üzere etkinlik kapı operasyonu, 48 saatlik sosyal medya erişimi, duygu analizi dağılımı ve ghosting influencer verilerini tek bir raporda döner.',
  })
  @ApiParam({ name: 'eventId', description: 'Etkinlik UUID' })
  @ApiResponse({
    status: 200,
    description: 'Yönetici PR ve ROI raporu başarıyla üretildi.',
  })
  async getExecutiveReport(@Param('eventId') eventId: string) {
    return this.analyticsService.getExecutivePrReport(eventId);
  }

  // --------------------------------------------------------------------------
  // 2. 48 SAATLİK SOSYAL MEDYA TARAMASI & PAYLAŞIM KAYDI
  // --------------------------------------------------------------------------
  @Post('events/:eventId/scan-mentions')
  @Roles(Role.SUPER_ADMIN, Role.PR_MANAGER)
  @ApiOperation({
    summary: '48 Saatlik Sosyal Medya Taramasını Tetikle ve Paylaşımları Kaydet',
    description:
      'Etkinlik başlangıcından itibaren 48 saatlik penceredeki paylaşımları tarar, otomatik duygu analizinden (Sentiment Analysis) geçirir ve PostEventMention tablosuna kaydeder.',
  })
  @ApiParam({ name: 'eventId', description: 'Etkinlik UUID' })
  @ApiResponse({
    status: 201,
    description: 'Sosyal medya taraması tamamlandı ve paylaşımlar işlendi.',
  })
  async scanMentions(
    @Param('eventId') eventId: string,
    @Body() dto: ScanMentionsDto,
  ) {
    return this.analyticsService.scanPostEventMentions(
      eventId,
      dto.simulatedPosts,
    );
  }

  // --------------------------------------------------------------------------
  // 3. PAYLAŞIM YAPMAYAN INFLUENCER & BASIN TESPİTİ (GHOSTING DETECTOR)
  // --------------------------------------------------------------------------
  @Get('events/:eventId/non-posting-influencers')
  @Roles(Role.SUPER_ADMIN, Role.PR_MANAGER, Role.ANALYST)
  @ApiOperation({
    summary: 'Galaya Katılıp Paylaşım Yapmayan (Ghosting) Influencer & Basın Listesi',
    description:
      'Etkinliğe fiilen giriş yapmış (CheckInLog: SUCCESS) fakat 48 saat içinde hiçbir paylaşım yapmamış INFLUENCER, PRESS ve VIP davetlileri tespit eder; kaçırılan potansiyel erişimi hesaplar.',
  })
  @ApiParam({ name: 'eventId', description: 'Etkinlik UUID' })
  @ApiResponse({
    status: 200,
    description: 'Ghosting influencer listesi ve analiz metrikleri döner.',
  })
  async getNonPostingInfluencers(@Param('eventId') eventId: string) {
    return this.analyticsService.detectNonPostingParticipants(eventId);
  }

  // --------------------------------------------------------------------------
  // 4. GHOSTING CEZASI UYGULAMA (SADAKAT PUANI DÜŞÜRME / UYARI)
  // --------------------------------------------------------------------------
  @Post('guests/:guestId/ghosting-penalty')
  @Roles(Role.SUPER_ADMIN, Role.PR_MANAGER)
  @Audit(AuditAction.UPDATE_GUEST, 'Guest')
  @ApiOperation({
    summary: 'Paylaşım Yapmayan Influencer İçin PR Sadakat Cezası Uygulama',
    description:
      'Etkinliğe gelip paylaşım yapmayan davetlinin sadakat puanını düşürür ve gerektiğinde kara liste notu ekler. KVKK denetim kütüğüne işlenir.',
  })
  @ApiParam({ name: 'guestId', description: 'Davetli UUID' })
  @ApiResponse({
    status: 200,
    description: 'Ghosting cezası başarıyla uygulandı ve denetim kütüğüne yazıldı.',
  })
  async applyGhostingPenalty(
    @Param('guestId') guestId: string,
    @Body() dto: GhostingPenaltyDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.analyticsService.applyGhostingPenalty(
      guestId,
      dto,
      user ? user.id : undefined,
    );
  }
}
