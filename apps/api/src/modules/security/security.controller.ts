import {
  Controller,
  Get,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuditLogService } from './audit-log.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuditAction, Role } from '@prisma/client';

@ApiTags('Kurumsal Güvenlik ve KVKK Denetim İzi (Security)')
@Controller('api/v1/security')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class SecurityController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get('audit-logs')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({
    summary: 'KVKK Denetim İzi Loglarını Listeleme (Sadece SUPER_ADMIN)',
    description:
      'Tüm hassas veri erişimleri (VIEW_PII), dışa aktarımlar (EXPORT_CSV), bilet taramaları (SCAN_QR) ve oturum açma kayıtlarını sayfalanmış olarak listeler.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'action', required: false, enum: AuditAction })
  @ApiQuery({ name: 'entityType', required: false, type: String })
  @ApiQuery({ name: 'userId', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Denetim izi kayıtları listesi' })
  @ApiResponse({ status: 403, description: 'Yetkisiz erişim (SUPER_ADMIN gereklidir)' })
  async getAuditLogs(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('action') action?: AuditAction,
    @Query('entityType') entityType?: string,
    @Query('userId') userId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    return this.auditLogService.findAll({
      page,
      limit,
      action,
      entityType,
      userId,
      startDate,
      endDate,
    });
  }
}
