import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsEmail,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AiReviewStatus, RsvpStatus } from '@prisma/client';

export class InboundEmailWebhookDto {
  @ApiProperty({ description: 'Gönderici e-posta adresi (Örn: "oyuncu@ajans.com" veya "Ahmet Yılmaz <ahmet@ajans.com>")' })
  @IsNotEmpty()
  @IsString()
  from!: string;

  @ApiPropertyOptional({ description: 'Alıcı e-posta adresi veya adresleri' })
  @IsOptional()
  to?: string | string[];

  @ApiProperty({ description: 'E-posta konu başlığı' })
  @IsNotEmpty()
  @IsString()
  subject!: string;

  @ApiPropertyOptional({ description: 'Düz metin e-posta gövdesi' })
  @IsOptional()
  @IsString()
  text?: string;

  @ApiPropertyOptional({ description: 'HTML e-posta gövdesi' })
  @IsOptional()
  @IsString()
  html?: string;

  @ApiPropertyOptional({ description: 'Resend / SMTP Inbound Message-ID (Idempotency için)' })
  @IsOptional()
  @IsString()
  messageId?: string;

  @ApiPropertyOptional({ description: 'E-posta başlıkları (X-Invitation-Id vb.)' })
  @IsOptional()
  headers?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Doğrudan davetiye ID eşleştirmesi' })
  @IsOptional()
  @IsString()
  invitationId?: string;
}

export class SimulateInboundDto {
  @ApiPropertyOptional({ description: 'İlişkili Davetiye ID (Belirtilmezse e-posta adresinden aranır)' })
  @IsOptional()
  @IsString()
  invitationId?: string;

  @ApiProperty({ description: 'Simüle edilen gönderici e-posta adresi', example: 'ayse.yilmaz@vipdavetli.com' })
  @IsNotEmpty()
  @IsEmail()
  fromEmail!: string;

  @ApiProperty({ description: 'E-posta konu başlığı', example: 'Re: Dune 3 Türkiye Galası Özel Davetiyeniz' })
  @IsNotEmpty()
  @IsString()
  subject!: string;

  @ApiProperty({
    description: 'E-posta yanıt gövdesi',
    example: 'Merhaba, davetiniz için çok teşekkürler. Eşim Ayşe Yılmaz ile birlikte memnuniyetle katılacağım.',
  })
  @IsNotEmpty()
  @IsString()
  body!: string;
}

export class ApproveAiReviewDto {
  @ApiProperty({
    description: 'PR Yöneticisi tarafından onaylanan / düzenlenen nihai yanıt metni',
    example: 'Sayın Ayşe Yılmaz, katılım teyidiniz için teşekkür ederiz. Kırmızı halıda görüşmek üzere.',
  })
  @IsNotEmpty()
  @IsString()
  finalReplyText!: string;

  @ApiProperty({
    description: 'Nihai LCV durumu',
    enum: [RsvpStatus.CONFIRMED, RsvpStatus.DECLINED],
    example: RsvpStatus.CONFIRMED,
  })
  @IsEnum([RsvpStatus.CONFIRMED, RsvpStatus.DECLINED])
  finalRsvpStatus!: 'CONFIRMED' | 'DECLINED';

  @ApiPropertyOptional({
    description: 'Onaylanan +1 refakatçi sayısı',
    example: 1,
    default: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  @Type(() => Number)
  plusOneApproved?: number;
}

export class RejectAiReviewDto {
  @ApiPropertyOptional({
    description: 'Taslağı reddetme veya manuel müdahale gerekçesi',
    example: 'Davetli telefonla arandı, manuel işlem yapıldı.',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class AiInboxFilterQueryDto {
  @ApiPropertyOptional({
    description: 'AI İnceleme Durumu Filtresi',
    enum: AiReviewStatus,
  })
  @IsOptional()
  @IsEnum(AiReviewStatus)
  status?: AiReviewStatus;

  @ApiPropertyOptional({ description: 'Sayfa numarası (varsayılan: 1)', default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Sayfa başına kayıt sayısı (varsayılan: 20)', default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;
}
