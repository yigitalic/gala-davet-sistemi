import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../database/prisma.service';
import { SecurityService } from '../security/security.service';
import { AuditLogService } from '../security/audit-log.service';
import { LoginDto, CreateStaffUserDto, Setup2FaResponseDto } from './dto/auth.dto';
import { AuditAction, Role } from '@prisma/client';

export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
  firstName: string;
  lastName: string;
  iat?: number;
  exp?: number;
}

export interface Temp2FaPayload {
  sub: string;
  isTemp2Fa: true;
  iat?: number;
  exp?: number;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly jwtSecret: string;
  private readonly jwtExpiresInSeconds = 24 * 60 * 60; // 24 saat

  constructor(
    private readonly prisma: PrismaService,
    private readonly securityService: SecurityService,
    private readonly auditLogService: AuditLogService
  ) {
    this.jwtSecret =
      process.env.JWT_SECRET ||
      'gala-pr-super-secure-jwt-signing-key-minimum-32-bytes!';
  }

  // JWT İMZALAMA VE DOĞRULAMA (RFC 7519 Uyumlu HMAC-SHA256)

  generateJwtToken(payload: Record<string, any>, expiresInSeconds = this.jwtExpiresInSeconds): string {
    const header = { alg: 'HS256', typ: 'JWT' };
    const now = Math.floor(Date.now() / 1000);
    const fullPayload = {
      ...payload,
      iat: now,
      exp: now + expiresInSeconds,
    };

    const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
    const payloadB64 = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
    const message = `${headerB64}.${payloadB64}`;

    const signature = crypto
      .createHmac('sha256', this.jwtSecret)
      .update(message)
      .digest('base64url');

    return `${message}.${signature}`;
  }

  async verifyJwtToken(token: string): Promise<JwtPayload> {
    if (!token || typeof token !== 'string') {
      throw new UnauthorizedException('Eksik token.');
    }

    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new UnauthorizedException('Geçersiz token formatı.');
    }

    const [headerB64, payloadB64, signature] = parts;
    const message = `${headerB64}.${payloadB64}`;

    const expectedSignature = crypto
      .createHmac('sha256', this.jwtSecret)
      .update(message)
      .digest('base64url');

    const expectedSigBuf = Buffer.from(expectedSignature);
    const actualSigBuf = Buffer.from(signature);

    if (
      expectedSigBuf.length !== actualSigBuf.length ||
      !crypto.timingSafeEqual(expectedSigBuf, actualSigBuf)
    ) {
      throw new UnauthorizedException('Token imza doğrulaması başarısız.');
    }

    let payload: any;
    try {
      const decodedJson = Buffer.from(payloadB64, 'base64url').toString('utf8');
      payload = JSON.parse(decodedJson);
    } catch {
      throw new UnauthorizedException('Token verisi okunamadı.');
    }

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      throw new UnauthorizedException('Oturum anahtarının süresi dolmuş.');
    }

    return payload as JwtPayload;
  }

  // PERSONEL OTURUM AÇMA (LOGIN & 2FA DOĞRULAMA)

  async login(
    dto: LoginDto,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{
    requiresTwoFactor?: boolean;
    tempAuthToken?: string;
    accessToken?: string;
    user?: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      role: Role;
      twoFactorEnabled: boolean;
    };
  }> {
    const normalizedEmail = this.securityService.normalizeEmail(dto.email);

    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      throw new UnauthorizedException('E-posta veya şifre hatalı.');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Hesabınız askıya alınmıştır. Lütfen yöneticiye başvurunuz.');
    }

    const isPasswordValid = await this.securityService.verifyPassword(
      dto.password,
      user.passwordHash
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('E-posta veya şifre hatalı.');
    }

    // 2FA Kontrolü
    if (user.twoFactorEnabled) {
      if (!dto.totpCode) {
        // İki adımlı doğrulama gerekli, geçici token üret (5 dakika geçerli)
        const tempAuthToken = this.generateJwtToken(
          { sub: user.id, isTemp2Fa: true },
          5 * 60
        );

        return {
          requiresTwoFactor: true,
          tempAuthToken,
        };
      }

      // Kullanıcının şifreli 2FA secret'ını çöz ve doğrula
      if (!user.twoFactorSecret) {
        throw new BadRequestException('2FA yapılandırması bulunamadı.');
      }

      const plainSecret = this.securityService.decrypt(user.twoFactorSecret);
      const isTotpValid = this.securityService.verifyTotpCode(
        plainSecret,
        dto.totpCode,
        30,
        1
      );

      if (!isTotpValid) {
        throw new UnauthorizedException('Geçersiz veya süresi dolmuş 2FA doğrulama kodu.');
      }
    }

    // Başarılı Giriş: Token üret, lastLoginAt güncelle, Audit Log kaydet
    const accessToken = this.generateJwtToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
    });

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    await this.auditLogService.log({
      userId: user.id,
      action: AuditAction.USER_LOGIN,
      entityType: 'User',
      entityId: user.id,
      metadata: {
        email: user.email,
        role: user.role,
        twoFactorUsed: user.twoFactorEnabled,
      },
      ipAddress,
      userAgent,
    });

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        twoFactorEnabled: user.twoFactorEnabled,
      },
    };
  }

  // 2FA KURULUM VE ETKİNLEŞTİRME

  async setupTwoFactor(userId: string): Promise<Setup2FaResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Kullanıcı bulunamadı.');
    }

    const secret = this.securityService.generateTotpSecret();
    const encryptedSecret = this.securityService.encrypt(secret);

    // Henüz etkinleştirilmemiş secret'ı şifreli olarak kaydet
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorSecret: encryptedSecret,
      },
    });

    const otpauthUrl = this.securityService.getTotpUri(
      user.email,
      secret,
      'Gala PR Platform'
    );

    return {
      secret,
      otpauthUrl,
    };
  }

  async enableTwoFactor(userId: string, totpCode: string): Promise<{ success: boolean; message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.twoFactorSecret) {
      throw new BadRequestException('Önce 2FA kurulumu başlatılmalıdır.');
    }

    const plainSecret = this.securityService.decrypt(user.twoFactorSecret);
    const isValid = this.securityService.verifyTotpCode(plainSecret, totpCode, 30, 1);

    if (!isValid) {
      throw new BadRequestException('Girilen 2FA kodu geçersiz veya süresi dolmuş.');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: true,
      },
    });

    await this.auditLogService.log({
      userId,
      action: AuditAction.USER_LOGIN, // veya güvenlik ayarı güncellemesi
      entityType: 'User',
      entityId: userId,
      metadata: { event: 'TWO_FACTOR_ENABLED' },
    });

    return {
      success: true,
      message: 'İki faktörlü kimlik doğrulama (2FA) başarıyla aktifleştirildi.',
    };
  }

  // PERSONEL YÖNETİMİ & KULLANICI PROFİLİ

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        twoFactorEnabled: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Kullanıcı profili bulunamadı.');
    }

    return user;
  }

  async createStaffUser(dto: CreateStaffUserDto, createdByUserId?: string) {
    const normalizedEmail = this.securityService.normalizeEmail(dto.email);

    const existingUser = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      throw new ConflictException('Bu e-posta adresiyle kayıtlı bir personel zaten mevcuttur.');
    }

    const passwordHash = await this.securityService.hashPassword(dto.password);

    const newUser = await this.prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        role: dto.role,
        isActive: true,
        twoFactorEnabled: false,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        twoFactorEnabled: true,
        createdAt: true,
      },
    });

    await this.auditLogService.log({
      userId: createdByUserId,
      action: AuditAction.USER_LOGIN, // Sistem işlem logu
      entityType: 'User',
      entityId: newUser.id,
      metadata: {
        event: 'STAFF_USER_CREATED',
        role: newUser.role,
        email: newUser.email,
      },
    });

    return newUser;
  }

  /**
   * Sistemdeki tüm personelleri listeler (Sadece SUPER_ADMIN)
   */
  async getAllStaff() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        twoFactorEnabled: true,
        lastLoginAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Personel aktiflik durumunu (isActive) veya rolünü (role) günceller (Sadece SUPER_ADMIN)
   */
  async updateStaffStatus(
    id: string,
    dto: { isActive?: boolean; role?: Role },
    updatedByUserId?: string
  ) {
    const existing = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Güncellenecek personel bulunamadı.');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        ...(dto.role !== undefined ? { role: dto.role } : {}),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        twoFactorEnabled: true,
        lastLoginAt: true,
      },
    });

    await this.auditLogService.log({
      userId: updatedByUserId,
      action: AuditAction.USER_LOGIN,
      entityType: 'User',
      entityId: updatedUser.id,
      metadata: {
        event: 'STAFF_STATUS_UPDATED',
        changedFields: dto,
        targetEmail: updatedUser.email,
      },
    });

    return updatedUser;
  }
}
