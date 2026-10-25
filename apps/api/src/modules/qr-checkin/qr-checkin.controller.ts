import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Ip,
  Headers,
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
import { QrCheckinService } from './qr-checkin.service';
import {
  ScanQrDto,
  RevokeTicketDto,
  CheckInStatsQueryDto,
} from './dto/qr-checkin.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '@gala/shared';
import { RateLimit } from '../../common/decorators/rate-limit.decorator';
import { RateLimitGuard } from '../../common/guards/rate-limit.guard';
import { Audit } from '../security/decorators/audit.decorator';
import { AuditLogInterceptor } from '../security/interceptors/audit-log.interceptor';

@ApiTags('Kriptografik Dinamik QR Bilet & Kapı Check-in (PWA)')
@Controller('api/v1/qr-checkin')
@UseGuards(JwtAuthGuard, RolesGuard, RateLimitGuard)
@UseInterceptors(AuditLogInterceptor)
export class QrCheckinController {
  constructor(private readonly qrCheckinService: QrCheckinService) {}

  // --------------------------------------------------------------------------
  // 1. DAVETLİ MOBİL DİNAMİK BİLET DURUMU & CANLI TOTP
  // --------------------------------------------------------------------------
  @Get('ticket/:token')
  @Public()
  @RateLimit({ limit: 60, windowSeconds: 60 })
  @ApiOperation({
    summary: 'Davetli Kriptografik Dinamik Bilet Durumu (Canlı TOTP & İmzalı QR Payload)',
    description:
      'Davetlinin mobil bilet sayfasını (/ticket/[token]) açtığında çağrılır. Ham TOTP sırrı çözülür, anlık 30 saniyelik pencere için TOTP kodu, kalan saniye ve HMAC-SHA256 imzalı QR payload döner.',
  })
  @ApiParam({
    name: 'token',
    description: 'Davetiyenin raw RSVP tokenı veya Bilet IDsi',
  })
  @ApiResponse({
    status: 200,
    description: 'Canlı bilet ve dinamik QR verileri başarıyla üretildi.',
  })
  async getTicketState(@Param('token') token: string) {
    return this.qrCheckinService.getDynamicTicketState(token);
  }

  // --------------------------------------------------------------------------
  // 2. KAPI GÖREVLİSİ MOBİL CHECK-IN & SİBER GÜVENLİK DOĞRULAMA PIPELINE'I
  // --------------------------------------------------------------------------
  @Post('scan')
  @Roles(Role.SUPER_ADMIN, Role.PR_MANAGER, Role.DOOR_STAFF)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Kapı Görevlisi QR Tarama & 6 Katmanlı Güvenlik Doğrulaması',
    description:
      'QR Payload doğrular: 1.HMAC İmzası, 2.Bilet İptal (Revoked), 3.Kara Liste (Blacklist), 4.TOTP 30sn Pencere, 5.Anti-Replay Nonce (Kopya Ekran Görüntüsü Koruması), 6.Mükerrer Giriş / Kontenjan Kontrolü.',
  })
  @ApiResponse({
    status: 200,
    description: 'Kapı tarama değerlendirmesi (Başarılı giriş veya engelleme alarmı)',
  })
  async scanQr(
    @Body() dto: ScanQrDto,
    @CurrentUser() user: AuthenticatedUser,
    @Ip() ip: string,
    @Headers('user-agent') userAgent?: string
  ) {
    return this.qrCheckinService.verifyAndScanQr(dto, user.id, ip, userAgent);
  }

  // --------------------------------------------------------------------------
  // 3. BİLET İPTALİ (REVOKE TICKET)
  // --------------------------------------------------------------------------
  @Post('tickets/:ticketId/revoke')
  @Roles(Role.SUPER_ADMIN, Role.PR_MANAGER)
  @Audit(AuditAction.REVOKE_TICKET, 'Ticket')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Bileti Anında İptal Et (Revoke Ticket)',
    description:
      'Yetkisiz paylaşıldığı veya protokol dışı bırakıldığı tespit edilen bileti derhal iptal eder ve denetim logu düşer.',
  })
  @ApiParam({
    name: 'ticketId',
    description: 'İptal edilecek biletin IDsi',
  })
  @ApiResponse({
    status: 200,
    description: 'Bilet başarıyla iptal edildi.',
  })
  async revokeTicket(
    @Param('ticketId') ticketId: string,
    @Body() dto: RevokeTicketDto,
    @CurrentUser() user: AuthenticatedUser,
    @Ip() ip: string,
    @Headers('user-agent') userAgent?: string
  ) {
    return this.qrCheckinService.revokeTicket(
      ticketId,
      dto.reason,
      user.id,
      ip,
      userAgent
    );
  }

  // --------------------------------------------------------------------------
  // 4. CANLI KAPI İSTATİSTİKLERİ VE CHECK-IN GÜVENLİK GÜNLÜĞÜ
  // --------------------------------------------------------------------------
  @Get('stats')
  @Roles(Role.SUPER_ADMIN, Role.PR_MANAGER, Role.DOOR_STAFF, Role.ANALYST)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Canlı Kapı Giriş ve Siber Güvenlik İstatistikleri',
    description:
      'Gala salonuna giren davetli sayısı, kalan kontenjan, engellenen Replay Attack ve süresi dolmuş QR girişimleri ile son check-in olaylarını listeler.',
  })
  @ApiResponse({
    status: 200,
    description: 'Kapı giriş metrikleri ve son olay logları',
  })
  async getStats(@Query() query: CheckInStatsQueryDto) {
    return this.qrCheckinService.getCheckInDashboardStats(query.eventId);
  }
}
