import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  IsArray,
  IsEnum,
  IsBoolean,
  IsNumber,
  IsIn,
  Min,
  Max,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GuestTag } from '@prisma/client';

export class CreateGuestDto {
  @ApiProperty({ example: 'Ahmet', description: 'Davetlinin adı' })
  @IsString()
  @IsNotEmpty({ message: 'Ad alanı zorunludur' })
  firstName: string;

  @ApiProperty({ example: 'Yılmaz', description: 'Davetlinin soyadı' })
  @IsString()
  @IsNotEmpty({ message: 'Soyad alanı zorunludur' })
  lastName: string;

  @ApiProperty({ example: 'ahmet.yilmaz@medya.com', description: 'E-posta adresi (şifrelenecektir)' })
  @IsEmail({}, { message: 'Geçerli bir e-posta adresi giriniz' })
  @IsNotEmpty({ message: 'E-posta alanı zorunludur' })
  email: string;

  @ApiPropertyOptional({ example: '+905321234567', description: 'Telefon numarası (şifrelenecektir)' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'Milliyet Gazetesi', description: 'Çalıştığı kurum / medya organı' })
  @IsOptional()
  @IsString()
  company?: string;

  @ApiPropertyOptional({ example: 'Kültür Sanat Editörü', description: 'Ünvan / Pozisyon' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({
    enum: GuestTag,
    isArray: true,
    example: [GuestTag.VIP, GuestTag.PRESS],
    description: 'Segmentasyon etiketleri',
  })
  @IsOptional()
  @IsArray()
  @IsEnum(GuestTag, { each: true, message: 'Geçersiz etiket değeri' })
  tags?: GuestTag[];

  @ApiPropertyOptional({ example: '@ahmetyilmaz', description: 'Instagram kullanıcı adı' })
  @IsOptional()
  @IsString()
  instagramHandle?: string;

  @ApiPropertyOptional({ example: '@ahmetyilmaz_yt', description: 'YouTube kanal adı' })
  @IsOptional()
  @IsString()
  youtubeHandle?: string;

  @ApiPropertyOptional({ example: '@ahmetyilmaz_tok', description: 'TikTok kullanıcı adı' })
  @IsOptional()
  @IsString()
  tiktokHandle?: string;

  @ApiPropertyOptional({ example: '@ahmetyilmaz_x', description: 'X (Twitter) kullanıcı adı' })
  @IsOptional()
  @IsString()
  xHandle?: string;
}

export class UpdateGuestDto {
  @ApiPropertyOptional({ example: 'Ahmet' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ example: 'Yılmaz' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ example: 'ahmet.yeni@medya.com' })
  @IsOptional()
  @IsEmail({}, { message: 'Geçerli bir e-posta adresi giriniz' })
  email?: string;

  @ApiPropertyOptional({ example: '+905329876543' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'Hürriyet' })
  @IsOptional()
  @IsString()
  company?: string;

  @ApiPropertyOptional({ example: 'Başyazar' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ enum: GuestTag, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(GuestTag, { each: true })
  tags?: GuestTag[];

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isBlacklisted?: boolean;

  @ApiPropertyOptional({ example: 'Basın protokolüne aykırı tutum' })
  @IsOptional()
  @IsString()
  blacklistReason?: string;

  @ApiPropertyOptional({ example: '@yeni_insta' })
  @IsOptional()
  @IsString()
  instagramHandle?: string;

  @ApiPropertyOptional({ example: '@yeni_yt' })
  @IsOptional()
  @IsString()
  youtubeHandle?: string;

  @ApiPropertyOptional({ example: '@yeni_tt' })
  @IsOptional()
  @IsString()
  tiktokHandle?: string;

  @ApiPropertyOptional({ example: '@yeni_x' })
  @IsOptional()
  @IsString()
  xHandle?: string;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsNumber()
  totalInvited?: number;

  @ApiPropertyOptional({ example: 4 })
  @IsOptional()
  @IsNumber()
  totalAttended?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  lastMinuteCancels?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  noShows?: number;
}

export class GuestFilterQueryDto {
  @ApiPropertyOptional({
    description: 'İsim, kurum veya e-posta (@)/telefon Blind Index tam eşleşme araması',
    example: 'Ahmet',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    enum: GuestTag,
    description: 'Tekil segment etiketi filtresi',
    example: GuestTag.VIP,
  })
  @IsOptional()
  @IsString()
  tag?: string;

  @ApiPropertyOptional({
    description: 'Virgülle ayrılmış segment etiketleri (örn: VIP,PRESS)',
    example: 'VIP,PRESS',
  })
  @IsOptional()
  @IsString()
  tags?: string;

  @ApiPropertyOptional({ example: 70, description: 'Minimum sadakat puanı filtresi' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  minLoyaltyScore?: number;

  @ApiPropertyOptional({ example: 100, description: 'Maksimum sadakat puanı filtresi' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  maxLoyaltyScore?: number;

  @ApiPropertyOptional({ example: false, description: 'Kara listedeki davetliler' })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return undefined;
  })
  @IsBoolean()
  isBlacklisted?: boolean;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class BulkImportCsvDto {
  @ApiProperty({
    description: 'RFC 4180 uyumlu CSV/TSV formatında davetli verisi metni',
    example: 'firstName,lastName,email,phone,company,title,tags\nAhmet,Yılmaz,ahmet@medya.com,+905321112233,Milliyet,Yazar,VIP|PRESS',
  })
  @IsString()
  @IsNotEmpty({ message: 'CSV içeriği boş olamaz' })
  csvContent: string;

  @ApiPropertyOptional({
    description: 'Özel ayraç karakteri (boş bırakılırsa otomatik algılanır: virgül, noktalı virgül veya sekme)',
    example: ',',
  })
  @IsOptional()
  @IsString()
  delimiter?: string;
}

export class BlacklistToggleDto {
  @ApiProperty({ example: true, description: 'Kara liste durumu' })
  @IsBoolean()
  isBlacklisted: boolean;

  @ApiPropertyOptional({ example: 'Geçersiz bilet kullanımı', description: 'Gerekçe' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class AttendanceOutcomeDto {
  @ApiProperty({
    enum: ['ATTENDED', 'LAST_MINUTE_CANCEL', 'NO_SHOW'],
    example: 'ATTENDED',
    description: 'Gala katılım sonucu',
  })
  @IsString()
  @IsIn(['ATTENDED', 'LAST_MINUTE_CANCEL', 'NO_SHOW'], {
    message: 'Geçersiz katılım sonucu! (ATTENDED, LAST_MINUTE_CANCEL veya NO_SHOW olmalıdır)',
  })
  outcome: 'ATTENDED' | 'LAST_MINUTE_CANCEL' | 'NO_SHOW';
}
