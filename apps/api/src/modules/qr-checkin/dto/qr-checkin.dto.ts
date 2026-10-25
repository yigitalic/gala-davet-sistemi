import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  Min,
  Max,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ScanQrDto {
  @ApiPropertyOptional({
    example: 'GALA-QR:v1:tkt-9901:482910:1771680000:a1b2c3d4e5f60718293a4b5c6d7e8f90',
    description: 'Kriptografik İmzalı QR Payload (GALA-QR:v1:ticketId:totpCode:timestamp:hmacSignature)',
  })
  @IsOptional()
  @IsString()
  qrPayload?: string;

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Bilet ID (qrPayload verilmemişse zorunludur)',
  })
  @IsOptional()
  @IsString()
  ticketId?: string;

  @ApiPropertyOptional({
    example: '482910',
    description: '6 Haneli Canlı TOTP Kodu',
  })
  @IsOptional()
  @IsString()
  totpCode?: string;

  @ApiPropertyOptional({
    example: 1771680000,
    description: 'İstemci veya QR Üretim Zaman Damgası (Unix Epoch)',
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  timestamp?: number;

  @ApiPropertyOptional({
    example: 1,
    description: 'Kapıdan içeri giren misafir adedi (Asil + Onaylı +1)',
    default: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  @Type(() => Number)
  guestEnteredCount?: number;

  @ApiPropertyOptional({
    example: 'Gala PWA Scanner v2.0 (Samsung Galaxy S24 Ultra)',
    description: 'Kapı görevlisi tarayıcı veya cihaz bilgisi',
  })
  @IsOptional()
  @IsString()
  deviceInfo?: string;
}

export class RevokeTicketDto {
  @ApiProperty({
    example: 'WhatsApp üzerinden ekran görüntüsü sızdırıldığı tespit edildi',
    description: 'Biletin iptal edilme gerekçesi',
  })
  @IsString()
  @IsNotEmpty({ message: 'İptal gerekçesi boş bırakılamaz' })
  reason: string;
}

export class CheckInStatsQueryDto {
  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Filtrelenecek Etkinlik ID (Opsiyonel)',
  })
  @IsOptional()
  @IsString()
  eventId?: string;
}
