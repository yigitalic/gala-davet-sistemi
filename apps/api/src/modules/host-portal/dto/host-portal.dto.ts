import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, IsArray, Min, Max } from 'class-validator';

export class CreateHostEventDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  movieTitle!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsNotEmpty()
  venue!: string;

  @IsNotEmpty()
  startsAt!: string | Date;

  @IsNotEmpty()
  doorsOpenAt!: string | Date;

  @IsNumber()
  @Min(1)
  capacity!: number; // Toplam mekan kapasitesi (KOLTUKSUZ)

  @IsBoolean()
  @IsOptional()
  isHistoricalArchive?: boolean;

  @IsNumber()
  @IsOptional()
  historicalGuestCount?: number;

  @IsNumber()
  @IsOptional()
  historicalPostCount?: number;
}

export class ImportHostCsvDto {
  @IsString()
  @IsNotEmpty()
  csvContent!: string;

  @IsBoolean()
  @IsOptional()
  updateExisting?: boolean;
}

export type ConversionTier =
  | 'HIGH_IMPACT_CREATOR' // >= 75%
  | 'MODERATE_CONTRIBUTOR' // 40% - 74.9%
  | 'LOW_PR_CONVERSION'    // 1% - 39.9%
  | 'GHOST_ATTENDEE';      // 0% (totalAttendedForHost > 0)

export interface HostGuestScorecardDto {
  id: string; // guestOrganization id
  guestId: string;
  firstName: string;
  lastName: string;
  maskedEmail: string;
  maskedPhone?: string;
  company?: string;
  title?: string;
  category?: 'PR' | 'PRESS';
  hostCustomTags: string[];
  hostLoyaltyScore: number;
  socialPlatform?: string;
  socialHandle?: string;
  followerCount: number;
  instagramHandle?: string;
  instagramFollowers?: number;
  youtubeHandle?: string;
  youtubeSubscribers?: number;
  totalInvitedByHost: number;
  totalAttendedForHost: number;
  totalPostsForHost: number;
  prConversionRate: number; // % (örn: 25.0)
  conversionTier: ConversionTier;
  hostNotes?: string;
}

export interface HostOverviewDto {
  organization: {
    id: string;
    name: string;
    slug: string;
    brandColor: string | null;
    logoUrl: string | null;
  };
  stats: {
    totalGuestsInPool: number;
    averageLoyaltyScore: number;
    totalReachPower: number; // Toplam takipçi sayısı
    averagePrConversionRate: number; // Ortalama PR paylaşım dönüşümü %
    activeEventsCount: number;
    archiveEventsCount: number;
  };
  events: Array<{
    id: string;
    title: string;
    movieTitle: string;
    venue: string;
    startsAt: Date | string;
    doorsOpenAt: Date | string;
    capacity: number;
    status: string;
    isHistoricalArchive: boolean;
    confirmedCount?: number;
    occupancyRate?: number;
  }>;
}
