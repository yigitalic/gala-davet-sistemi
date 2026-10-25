import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { SocialWorkerService } from './social-worker.service';
import { SyncAllSocialDto } from './dto/social-worker.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Sosyal Medya Metrik İşçisi (Social Worker)')
@Controller('api/v1/social-worker')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class SocialWorkerController {
  constructor(private readonly socialWorkerService: SocialWorkerService) {}

  @Post('sync-all')
  @Roles(Role.SUPER_ADMIN, Role.PR_MANAGER)
  @ApiOperation({
    summary: 'Tüm Davetlilerin Sosyal Medya Profillerini Asenkron Kuyruğa Ekle',
    description:
      'Tüm profilleri veya opsiyonel olarak belirtilen segmenti (VIP, INFLUENCER, PRESS) asenkron BullMQ / In-Memory kuyruğuna alır.',
  })
  @ApiResponse({ status: 200, description: 'Toplu senkronizasyon işi kuyruğa alındı' })
  async syncAllProfiles(@Body() dto: SyncAllSocialDto) {
    return this.socialWorkerService.enqueueBatchScrape(dto.tag);
  }

  @Post('sync-guest/:guestId')
  @Roles(Role.SUPER_ADMIN, Role.PR_MANAGER)
  @ApiOperation({
    summary: 'Tek Bir Davetlinin Tüm Sosyal Medya Profillerini Güncelle',
    description:
      'Belirtilen davetlinin tüm platformlardaki profillerini anında kuyruğa ekler ve senkronize eder.',
  })
  @ApiParam({ name: 'guestId', description: 'Davetli UUID' })
  @ApiResponse({ status: 200, description: 'Davetli profilleri kuyruğa alındı' })
  async syncGuest(@Param('guestId') guestId: string) {
    return this.socialWorkerService.syncGuestProfiles(guestId);
  }

  @Get('status')
  @Roles(Role.SUPER_ADMIN, Role.PR_MANAGER, Role.ANALYST)
  @ApiOperation({
    summary: 'Kuyruk Durumu, Toplam Erişim ve Platform Metrikleri',
    description:
      'Aktif ve bekleyen iş sayıları, toplam takipçi erişimi ve son taranan profillerin listesini döner.',
  })
  @ApiResponse({ status: 200, description: 'Metrik ve kuyruk durum raporu' })
  async getStatus() {
    return this.socialWorkerService.getQueueStatus();
  }
}
