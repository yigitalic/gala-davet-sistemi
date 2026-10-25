import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsEnum,
  Min,
  IsUUID,
  IsArray,
  ValidateNested,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SocialPlatform } from '@prisma/client';

export class CreateMentionDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Davetli ID (Katılımcı / Influencer / Basın)',
  })
  @IsNotEmpty()
  @IsString()
  guestId: string;

  @ApiProperty({
    enum: SocialPlatform,
    example: SocialPlatform.INSTAGRAM,
    description: 'Sosyal Medya Platformu (INSTAGRAM, YOUTUBE, TIKTOK, X)',
  })
  @IsNotEmpty()
  @IsEnum(SocialPlatform)
  platform: SocialPlatform;

  @ApiProperty({
    example: 'https://instagram.com/p/DB123456789/',
    description: 'Paylaşım URL adresi',
  })
  @IsNotEmpty()
  @IsString()
  postUrl: string;

  @ApiProperty({
    example: 'Bu akşam Dune 3 galasındaydık! Gerçekten bir başyapıt, görsel bir şölen! 10/10.',
    description: 'Paylaşım açıklaması / Caption metni (Duygu analizi bu metin üzerinden yapılır)',
  })
  @IsNotEmpty()
  @IsString()
  captionText: string;

  @ApiPropertyOptional({
    example: 125000,
    description: 'Tahmini tekil erişim adedi',
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  reachEstimate?: number;

  @ApiPropertyOptional({
    example: 14200,
    description: 'Beğeni sayısı',
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  likesCount?: number;

  @ApiPropertyOptional({
    example: 850,
    description: 'Yorum sayısı',
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  commentsCount?: number;

  @ApiPropertyOptional({
    example: '2026-10-22T21:45:00.000Z',
    description: 'Paylaşım yapılma zamanı (ISO 8601)',
  })
  @IsOptional()
  @IsString()
  postedAt?: string;
}

export class ScanMentionsDto {
  @ApiPropertyOptional({
    type: [CreateMentionDto],
    description: '48 saatlik tarama sırasında işlenecek simüle edilmiş veya taranmış paylaşımlar',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateMentionDto)
  simulatedPosts?: CreateMentionDto[];
}

export class GhostingPenaltyDto {
  @ApiPropertyOptional({
    example: 15.0,
    description: 'Düşürülecek PR sadakat puanı (Loyalty Score Penalty)',
    default: 15.0,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  penaltyPoints?: number;

  @ApiPropertyOptional({
    example: 'Galaya katılım sağlandı fakat 48 saat içinde hiçbir paylaşım yapılmadı (Ghosting)',
    description: 'Ceza veya not açıklama metni',
  })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({
    example: false,
    description: 'Davetliyi doğrudan kara listeye (BLACKLIST) alma seçeneği',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  blacklist?: boolean;
}
