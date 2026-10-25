import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { HostPortalService } from './host-portal.service';
import { TenantIsolationGuard } from './guards/tenant-isolation.guard';
import {
  CreateHostEventDto,
  ImportHostCsvDto,
  HostGuestScorecardDto,
  HostOverviewDto,
} from './dto/host-portal.dto';

@Controller('api/v1/host-portal')
@UseGuards(TenantIsolationGuard)
export class HostPortalController {
  constructor(private readonly hostPortalService: HostPortalService) {}

  /**
   * Dağıtımcı Şirket Genel Bakış ve KPI Özeti
   * GET /api/v1/host-portal/overview
   */
  @Get('overview')
  async getOverview(@Req() req: any, @Query('organizationId') queryOrgId?: string): Promise<HostOverviewDto> {
    const orgId = req.tenantOrgId || queryOrgId || 'org-disney';
    return await this.hostPortalService.getOverview(orgId);
  }

  /**
   * Sadece ilgili dağıtımcıya ait davetliler ve PR dönüşüm karneleri
   * GET /api/v1/host-portal/guests
   */
  @Get('guests')
  async getGuests(
    @Req() req: any,
    @Query('organizationId') queryOrgId?: string,
    @Query('filter') filter?: string
  ): Promise<HostGuestScorecardDto[]> {
    const orgId = req.tenantOrgId || queryOrgId || 'org-disney';
    return await this.hostPortalService.getGuests(orgId, filter);
  }

  /**
   * Dağıtımcıya özel CSV/Excel içe aktarma & Platform tekilleştirme (Deduping)
   * POST /api/v1/host-portal/guests/import-csv
   */
  @Post('guests/import-csv')
  @HttpCode(HttpStatus.OK)
  async importCsv(
    @Req() req: any,
    @Body() dto: ImportHostCsvDto,
    @Query('organizationId') queryOrgId?: string
  ) {
    const orgId = req.tenantOrgId || queryOrgId || 'org-disney';
    return await this.hostPortalService.importHostGuestsCsv(orgId, dto.csvContent);
  }

  /**
   * Dağıtımcı için Yeni Gala veya Geçmiş Arşiv Etkinliği Oluşturma
   * POST /api/v1/host-portal/events
   */
  @Post('events')
  @HttpCode(HttpStatus.CREATED)
  async createEvent(
    @Req() req: any,
    @Body() dto: CreateHostEventDto,
    @Query('organizationId') queryOrgId?: string
  ) {
    const orgId = req.tenantOrgId || queryOrgId || 'org-disney';
    return await this.hostPortalService.createHostEvent(orgId, dto);
  }

  /**
   * Gelen LCV E-postası / Sorusu için Host AI Agent Yanıtı Onaylama
   * POST /api/v1/host-portal/inbound-mails/approve
   */
  @Post('inbound-mails/approve')
  @HttpCode(HttpStatus.OK)
  async approveInboundReply(
    @Req() req: any,
    @Body() body: { mailId: string; action: 'APPROVE_VIP' | 'APPROVE_PRESS_ACCREDITATION' | 'MOVE_TO_WAITLIST' },
    @Query('organizationId') queryOrgId?: string
  ) {
    const orgId = req.tenantOrgId || queryOrgId || 'org-disney';
    return await this.hostPortalService.approveHostInboundReply(orgId, body.mailId, body.action);
  }

  /**
   * Dağıtımcı Hesap Ayarları & Şifre Güncelleme ()
   * POST /api/v1/host-portal/settings/account
   */
  @Post('settings/account')
  @HttpCode(HttpStatus.OK)
  async updateAccountSettings(
    @Req() req: any,
    @Body()
    payload: {
      currentPassword?: string;
      newPassword?: string;
      emailSignature?: string;
      vipNotifications?: boolean;
    },
    @Query('organizationId') queryOrgId?: string
  ) {
    const orgId = req.tenantOrgId || queryOrgId || 'org-disney';
    const userId = req.user?.id || 'usr-host-admin-disney';
    return await this.hostPortalService.updateHostAccountSettings(orgId, userId, payload);
  }

  /**
   * Gala Sonrası Tek Tıkla Paylaşım Kaydı ve PR Karnesi Güncelleme ()
   * POST /api/v1/host-portal/guests/record-post
   */
  @Post('guests/record-post')
  @HttpCode(HttpStatus.OK)
  async recordGuestPost(
    @Req() req: any,
    @Body() body: { guestId: string },
    @Query('organizationId') queryOrgId?: string
  ) {
    const orgId = req.tenantOrgId || queryOrgId || 'org-disney';
    return await this.hostPortalService.recordGuestPostForHost(orgId, body.guestId);
  }
}
