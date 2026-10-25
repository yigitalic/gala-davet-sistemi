import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsBoolean,
  MinLength,
  Length,
} from 'class-validator';
import { Role } from '@prisma/client';

export class LoginDto {
  @ApiProperty({
    example: 'admin@gala.local',
    description: 'Personel kurumsal e-posta adresi',
  })
  @IsEmail({}, { message: 'Geçerli bir kurumsal e-posta adresi giriniz.' })
  @IsNotEmpty({ message: 'E-posta boş bırakılamaz.' })
  email!: string;

  @ApiProperty({
    example: 'S3cur3P@ssw0rd!',
    description: 'Personel oturum açma şifresi',
  })
  @IsString()
  @MinLength(8, { message: 'Şifre en az 8 karakter olmalıdır.' })
  @IsNotEmpty({ message: 'Şifre boş bırakılamaz.' })
  password!: string;

  @ApiPropertyOptional({
    example: '123456',
    description: '2FA aktif personel için 6 haneli TOTP doğrulama kodu',
  })
  @IsOptional()
  @IsString()
  @Length(6, 6, { message: '2FA doğrulama kodu 6 haneli olmalıdır.' })
  totpCode?: string;
}

export class Verify2FaDto {
  @ApiProperty({
    example: '123456',
    description: 'Authenticator uygulamasından alınan 6 haneli kod',
  })
  @IsString()
  @Length(6, 6, { message: 'TOTP doğrulama kodu 6 haneli olmalıdır.' })
  @IsNotEmpty({ message: 'Doğrulama kodu boş bırakılamaz.' })
  totpCode!: string;
}

export class Setup2FaResponseDto {
  @ApiProperty({
    example: 'JBSWY3DPEHPK3PXP',
    description: 'Base32 formatında üretilmiş gizli anahtar (secret)',
  })
  secret!: string;

  @ApiProperty({
    example: 'otpauth://totp/Gala%20PR:admin%40gala.local?secret=...&issuer=Gala%20PR',
    description: 'QR kod üretimi veya Authenticator uygulamasına aktarım URI',
  })
  otpauthUrl!: string;
}

export class CreateStaffUserDto {
  @ApiProperty({
    example: 'pr.manager@gala.local',
    description: 'Yeni personelin e-posta adresi',
  })
  @IsEmail({}, { message: 'Geçerli bir kurumsal e-posta adresi giriniz.' })
  @IsNotEmpty()
  email!: string;

  @ApiProperty({
    example: 'P@ssw0rd2026!',
    description: 'Yeni personelin ilk şifresi',
  })
  @IsString()
  @MinLength(8, { message: 'Şifre en az 8 karakter olmalıdır.' })
  @IsNotEmpty()
  password!: string;

  @ApiProperty({ example: 'Ayşe', description: 'Personelin adı' })
  @IsString()
  @MinLength(2, { message: 'Ad en az 2 karakter olmalıdır.' })
  @IsNotEmpty()
  firstName!: string;

  @ApiProperty({ example: 'Yılmaz', description: 'Personelin soyadı' })
  @IsString()
  @MinLength(2, { message: 'Soyad en az 2 karakter olmalıdır.' })
  @IsNotEmpty()
  lastName!: string;

  @ApiProperty({
    enum: Role,
    example: Role.PR_MANAGER,
    description: 'Personel yetki rolü',
  })
  @IsEnum(Role, { message: 'Geçerli bir personel rolü seçiniz.' })
  @IsNotEmpty()
  role!: Role;
}

export class UpdateStaffStatusDto {
  @ApiPropertyOptional({ example: false, description: 'Personelin hesap aktifliği (true: aktif, false: askıda)' })
  @IsOptional()
  @IsBoolean({ message: 'isActive değeri boolean olmalıdır.' })
  isActive?: boolean;

  @ApiPropertyOptional({ enum: Role, example: Role.PR_MANAGER, description: 'Yeni personel yetki rolü' })
  @IsOptional()
  @IsEnum(Role, { message: 'Geçerli bir personel rolü seçiniz.' })
  role?: Role;
}
