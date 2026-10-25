import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { GuestTag, SocialPlatform } from '@prisma/client';

export class SyncAllSocialDto {
  @ApiPropertyOptional({
    description: 'Yalnızca belirli bir segmentteki davetlileri senkronize et (VIP, INFLUENCER, PRESS)',
    enum: GuestTag,
  })
  @IsOptional()
  @IsEnum(GuestTag)
  tag?: GuestTag;
}

export class SyncGuestParamDto {
  @ApiProperty({ description: 'Davetli UUID' })
  @IsUUID('4', { message: 'Geçerli bir davetli UUID giriniz.' })
  guestId!: string;
}

export class SocialJobStatusDto {
  @ApiProperty()
  queuedJobs!: number;

  @ApiProperty()
  activeJobs!: number;

  @ApiProperty()
  completedJobs!: number;

  @ApiProperty()
  failedJobs!: number;

  @ApiProperty()
  concurrency!: number;
}

export class PlatformReachStatsDto {
  @ApiProperty({ enum: ['INSTAGRAM', 'YOUTUBE', 'TIKTOK', 'X'] })
  platform!: SocialPlatform;

  @ApiProperty()
  profileCount!: number;

  @ApiProperty()
  totalFollowers!: number;

  @ApiProperty()
  avgEngagementRate!: number;
}

export class SocialWorkerStatusResponseDto {
  @ApiProperty({ type: SocialJobStatusDto })
  queueStats!: SocialJobStatusDto;

  @ApiProperty()
  totalReach!: number;

  @ApiProperty({ type: [PlatformReachStatsDto] })
  platformStats!: PlatformReachStatsDto[];

  @ApiProperty()
  recentProfiles!: Array<{
    id: string;
    guestName: string;
    platform: SocialPlatform;
    handle: string;
    followerCount: number;
    engagementRate: number;
    lastScrapedAt: Date | null;
    scrapeStatus: string;
  }>;
}
