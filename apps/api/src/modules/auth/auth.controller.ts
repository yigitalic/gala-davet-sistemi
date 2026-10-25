import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthService } from './auth.service';
import {
  LoginDto,
  Verify2FaDto,
  Setup2FaResponseDto,
  CreateStaffUserDto,
  UpdateStaffStatusDto,
} from './dto/auth.dto';
import { Public } from './decorators/public.decorator';
import { Roles } from './decorators/roles.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { RateLimitGuard } from '../../common/guards/rate-limit.guard';
import { RateLimit } from '../../common/decorators/rate-limit.decorator';
import { Audit } from '../security/decorators/audit.decorator';
import { AuditAction, Role } from '@prisma/client';

@ApiTags('Kimlik Doğrulama ve Personel Yönetimi (Auth)')
@Controller('api/v1/auth')
@UseGuards(JwtAuthGuard, RolesGuard, RateLimitGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @RateLimit({ limit: 5, windowSeconds: 60 })
  @ApiOperation({
    summary: 'Personel Girişi (JWT + Opsiyonel 2FA TOTP)',
    description:
      'Brute-force koruması kapsamında dakikada maksimum 5 deneme kabul edilir. 2FA aktif kullanıcılarda totpCode gönderilmemişse requiresTwoFactor=true ve tempAuthToken döner.',
  })
  @ApiResponse({ status: 200, description: 'Başarılı giriş veya 2FA isteği' })
  @ApiResponse({ status: 401, description: 'Hatalı e-posta, şifre veya 2FA kodu' })
  @ApiResponse({ status: 429, description: 'Çok fazla istek (Rate Limit)' })
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    const ip =
      req.ip ||
      (req.headers['x-forwarded-for'] as string) ||
      req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    return this.authService.login(dto, ip, userAgent);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Oturum Açmış Personel Profil Bilgileri' })
  @ApiResponse({ status: 200, description: 'Mevcut personel bilgisi' })
  @ApiResponse({ status: 401, description: 'Oturum geçersiz veya süresi dolmuş' })
  async getProfile(@CurrentUser('sub') userId: string) {
    return this.authService.getMe(userId);
  }

  @Post('2fa/setup')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Personel İki Faktörlü Doğrulama (2FA) Kurulumu Başlatma',
    description:
      'Yeni bir TOTP gizli anahtarı üretir ve Authenticator uygulamalarıyla taranabilir otpauth:// URI döner.',
  })
  @ApiResponse({ status: 200, type: Setup2FaResponseDto })
  async setup2Fa(@CurrentUser('sub') userId: string): Promise<Setup2FaResponseDto> {
    return this.authService.setupTwoFactor(userId);
  }

  @Post('2fa/enable')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '2FA TOTP Kodunu Doğrulayarak İki Faktörlü Korumayı Aktifleştirme',
  })
  @ApiResponse({ status: 200, description: '2FA başarıyla etkinleştirildi' })
  @ApiResponse({ status: 400, description: 'Hatalı veya süresi geçmiş kod' })
  async enable2Fa(
    @CurrentUser('sub') userId: string,
    @Body() dto: Verify2FaDto
  ) {
    return this.authService.enableTwoFactor(userId, dto.totpCode);
  }

  @Post('staff')
  @ApiBearerAuth()
  @Roles(Role.SUPER_ADMIN)
  @Audit(AuditAction.USER_LOGIN, 'User')
  @ApiOperation({
    summary: 'Yeni Personel Hesabı Oluşturma (Sadece SUPER_ADMIN)',
    description:
      'Süper yöneticiler PR_MANAGER, DOOR_STAFF veya ANALYST yetkisine sahip yeni personel oluşturabilir.',
  })
  @ApiResponse({ status: 201, description: 'Personel oluşturuldu' })
  @ApiResponse({ status: 403, description: 'Yetkisiz erişim (SUPER_ADMIN rolü zorunludur)' })
  @ApiResponse({ status: 409, description: 'E-posta zaten kayıtlı' })
  async createStaff(
    @Body() dto: CreateStaffUserDto,
    @CurrentUser('sub') currentUserId: string
  ) {
    return this.authService.createStaffUser(dto, currentUserId);
  }

  @Get('staff')
  @ApiBearerAuth()
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Sistemdeki Tüm Personel Listesi (Sadece SUPER_ADMIN)',
    description: 'Süper yöneticiler tüm personellerin durumunu, rollerini ve 2FA durumlarını görüntüler.',
  })
  @ApiResponse({ status: 200, description: 'Personel listesi' })
  async getStaffList() {
    return this.authService.getAllStaff();
  }

  @Patch('staff/:id/status')
  @ApiBearerAuth()
  @Roles(Role.SUPER_ADMIN)
  @Audit(AuditAction.USER_LOGIN, 'User')
  @ApiOperation({
    summary: 'Personel Durumunu (Aktif/Askıda) veya Rolünü Güncelle (Sadece SUPER_ADMIN)',
    description: 'Personelin sistem erişimini askıya alır veya yetki rolünü değiştirir.',
  })
  @ApiParam({ name: 'id', description: 'Personel Kullanıcı UUID' })
  @ApiResponse({ status: 200, description: 'Personel bilgisi güncellendi' })
  async updateStaffStatus(
    @Param('id') id: string,
    @Body() dto: UpdateStaffStatusDto,
    @CurrentUser('sub') currentUserId: string
  ) {
    return this.authService.updateStaffStatus(id, dto, currentUserId);
  }
}
