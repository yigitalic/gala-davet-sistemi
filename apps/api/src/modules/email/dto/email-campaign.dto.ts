import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsArray,
  Min,
  Max,
  IsISO8601,
} from 'class-validator';
import { GuestTag, EventStatus, RsvpStatus } from '@prisma/client';

export class CreateEventDto {
  @ApiProperty({ example: 'Dune: Çöl Gezegeni 3 Türkiye Galası' })
  @IsString()
  @IsNotEmpty({ message: 'Etkinlik başlığı zorunludur.' })
  title!: string;

  @ApiProperty({ example: 'Dune: Part Three' })
  @IsString()
  @IsNotEmpty({ message: 'Film adı zorunludur.' })
  movieTitle!: string;

  @ApiPropertyOptional({ example: 'Özel Kırmızı Halı Galası ve Basın Gösterimi' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'Zorlu PSM Turkcell Sahnesi, İstanbul' })
  @IsString()
  @IsNotEmpty({ message: 'Mekan adı zorunludur.' })
  venue!: string;

  @ApiProperty({ example: '2026-11-20T20:00:00.000Z' })
  @IsISO8601({}, { message: 'Geçerli bir ISO 8601 başlangıç tarihi giriniz.' })
  startsAt!: string;

  @ApiProperty({ example: '2026-11-20T19:00:00.000Z' })
  @IsISO8601({}, { message: 'Geçerli bir ISO 8601 kapı açılış tarihi giriniz.' })
  doorsOpenAt!: string;

  @ApiProperty({ example: 650 })
  @IsInt({ message: 'Kapasite tam sayı olmalıdır.' })
  @Min(1, { message: 'Kapasite en az 1 olmalıdır.' })
  capacity!: number;

  @ApiPropertyOptional({ enum: EventStatus, default: EventStatus.PUBLISHED })
  @IsOptional()
  @IsEnum(EventStatus)
  status?: EventStatus;
}

export class SendCampaignDto {
  @ApiPropertyOptional({
    description: 'Hedef segment etiketleri (VIP, PRESS, INFLUENCER, MORNING_SCREENING vb.)',
    enum: GuestTag,
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  filterTags?: GuestTag[];

  @ApiPropertyOptional({
    description: 'Belirli davetli UUID listesi',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  guestIds?: string[];

  @ApiPropertyOptional({
    example: '{{movieTitle}} Türkiye Galası Özel Davetiyeniz',
  })
  @IsOptional()
  @IsString()
  customSubject?: string;

  @ApiPropertyOptional({
    description: 'Özel HTML Şablonu (Kişiselleştirme değişkenleri içerir: {{firstName}}, {{confirmUrl}} vb.)',
  })
  @IsOptional()
  @IsString()
  customTemplate?: string;
}

export class RsvpRespondDto {
  @ApiProperty({ description: 'Kriptografik 32-byte tek kullanımlık ham LCV belirteci' })
  @IsString()
  @IsNotEmpty()
  token!: string;

  @ApiProperty({ enum: ['CONFIRMED', 'DECLINED', 'UNCERTAIN'] })
  @IsEnum(['CONFIRMED', 'DECLINED', 'UNCERTAIN'])
  action!: 'CONFIRMED' | 'DECLINED' | 'UNCERTAIN';

  @ApiPropertyOptional({ example: 1, minimum: 0, maximum: 5 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(5)
  plusOneRequested?: number;

  @ApiPropertyOptional({ example: 'Zeynep Yılmaz' })
  @IsOptional()
  @IsString()
  plusOneNames?: string;
}

export class OverrideRsvpDto {
  @ApiPropertyOptional({ enum: RsvpStatus })
  @IsOptional()
  @IsEnum(RsvpStatus)
  rsvpStatus?: RsvpStatus;

  @ApiPropertyOptional({ example: 1, minimum: 0, maximum: 5 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(5)
  plusOneApproved?: number;

  @ApiPropertyOptional({ example: 1, minimum: 0, maximum: 5 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(5)
  plusOneRequested?: number;

  @ApiPropertyOptional({ example: 'Refakatçi isimleri' })
  @IsOptional()
  @IsString()
  plusOneNames?: string;

  @ApiPropertyOptional({ example: 'PR Ekibi tarafından telefon teyidi alındı.' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateEventDto {
  @ApiPropertyOptional({ example: 'Dune: Çöl Gezegeni 3 Türkiye Galası' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ example: 'Dune: Part Three' })
  @IsOptional()
  @IsString()
  movieTitle?: string;

  @ApiPropertyOptional({ example: 'Özel Kırmızı Halı Galası ve Basın Gösterimi' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'Zorlu PSM Turkcell Sahnesi, İstanbul' })
  @IsOptional()
  @IsString()
  venue?: string;

  @ApiPropertyOptional({ example: '2026-11-20T20:00:00.000Z' })
  @IsOptional()
  @IsISO8601({}, { message: 'Geçerli bir ISO 8601 başlangıç tarihi giriniz.' })
  startsAt?: string;

  @ApiPropertyOptional({ example: '2026-11-20T19:00:00.000Z' })
  @IsOptional()
  @IsISO8601({}, { message: 'Geçerli bir ISO 8601 kapı açılış tarihi giriniz.' })
  doorsOpenAt?: string;

  @ApiPropertyOptional({ example: 650 })
  @IsOptional()
  @IsInt({ message: 'Kapasite tam sayı olmalıdır.' })
  @Min(1, { message: 'Kapasite en az 1 olmalıdır.' })
  capacity?: number;

  @ApiPropertyOptional({ enum: EventStatus })
  @IsOptional()
  @IsEnum(EventStatus)
  status?: EventStatus;
}

export class WaitlistPromoteDto {
  @ApiPropertyOptional({
    description: 'Terfi ettirilecek maksimum davetli adedi (boş bırakılırsa tüm boşalan kontenjan doldurulur)',
    example: 2,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  targetCount?: number;
}

export class SendReminderDto {
  @ApiPropertyOptional({
    description: 'Hatırlatma gönderim kanalı',
    enum: ['WHATSAPP', 'SMS'],
    default: 'WHATSAPP',
  })
  @IsOptional()
  @IsEnum(['WHATSAPP', 'SMS'])
  channel?: 'WHATSAPP' | 'SMS';

  @ApiPropertyOptional({
    description: 'Özel şablon veya bildirim mesajı (opsiyonel)',
    example: 'Sayın {{fullName}}, yarın akşamki galada yeriniz hazır!',
  })
  @IsOptional()
  @IsString()
  overrideMessage?: string;
}

export class EpkDownloadDto {
  @ApiPropertyOptional({
    description: 'Davetlinin LCV ham belirteci (token) veya misafir ID',
    example: 'a1b2c3d4e5f6',
  })
  @IsOptional()
  @IsString()
  rawToken?: string;

  @ApiPropertyOptional({
    description: 'Davetlinin misafir IDsi (alternatif kimlik)',
  })
  @IsOptional()
  @IsString()
  guestId?: string;
}

