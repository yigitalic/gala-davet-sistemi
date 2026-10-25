import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  Res,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { Request, Response } from 'express';
import { Role, AuditAction } from '@prisma/client';
import { CrmService } from './crm.service';
import { CsvImportExportService } from './csv-import-export.service';
import {
  CreateGuestDto,
  UpdateGuestDto,
  GuestFilterQueryDto,
  BulkImportCsvDto,
  BlacklistToggleDto,
  AttendanceOutcomeDto,
} from './dto/crm.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Audit } from '../security/decorators/audit.decorator';
import { AuditLogInterceptor } from '../security/interceptors/audit-log.interceptor';

@ApiTags('Davetli & PR CRM Yönetimi (CRM)')
@Controller('api/v1/crm')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditLogInterceptor)
@ApiBearerAuth()
export class CrmController {
  constructor(
    private readonly crmService: CrmService,
    private readonly csvImportExportService: CsvImportExportService
  ) {}

  // --------------------------------------------------------------------------
  // 1. DAVETLİ LİSTELEME & ARAMA (KVKK MASKELENMİŞ)
  // --------------------------------------------------------------------------
  @Get('guests')
  @Roles(Role.SUPER_ADMIN, Role.PR_MANAGER, Role.ANALYST)
  @ApiOperation({
    summary: 'Filtrelenmiş ve Sayfalanmış Davetli Listesi',
    description:
      'Tüm davetlileri döner. KVKK uyumu için e-posta ve telefonlar maskelenmiştir (ah***@medya.com). Arama kutusuna @ girilirse Blind Index tam eşleşmesi ile aranır.',
  })
  @ApiResponse({ status: 200, description: 'Davetli listesi ve özet istatistikler' })
  async getGuests(@Query() query: GuestFilterQueryDto) {
    return this.crmService.findAllGuests(query);
  }

  // --------------------------------------------------------------------------
  // 2. TEKİL DAVETLİ OLUŞTURMA
  // --------------------------------------------------------------------------
  @Post('guests')
  @Roles(Role.SUPER_ADMIN, Role.PR_MANAGER)
  @Audit(AuditAction.CREATE_GUEST, 'Guest')
  @ApiOperation({
    summary: 'Yeni Davetli Oluşturma (Kriptografik Koruma & Deduping)',
    description:
      'Hassas iletişim alanlarını AES-256-GCM ile şifreler, HMAC Blind Index üretir ve başlangıç sadakat skorunu hesaplar.',
  })
  @ApiResponse({ status: 201, description: 'Davetli başarıyla oluşturuldu' })
  @ApiResponse({ status: 409, description: 'Bu e-posta veya telefon numarası zaten mevcut' })
  async createGuest(@Body() dto: CreateGuestDto) {
    return this.crmService.createGuest(dto);
  }

  // --------------------------------------------------------------------------
  // 3. TEKİL DAVETLİ DETAYI (MASKELİ)
  // --------------------------------------------------------------------------
  @Get('guests/:id')
  @Roles(Role.SUPER_ADMIN, Role.PR_MANAGER, Role.ANALYST)
  @ApiOperation({ summary: 'Davetli Detayı (Maskelenmiş İletişim Bilgileri)' })
  @ApiParam({ name: 'id', description: 'Davetli UUID' })
  @ApiResponse({ status: 200, description: 'Davetli detay bilgisi' })
  @ApiResponse({ status: 404, description: 'Davetli bulunamadı' })
  async getGuestById(@Param('id') id: string) {
    return this.crmService.findOneGuest(id);
  }

  // --------------------------------------------------------------------------
  // 4. DAVETLİ GÜNCELLEME
  // --------------------------------------------------------------------------
  @Patch('guests/:id')
  @Roles(Role.SUPER_ADMIN, Role.PR_MANAGER)
  @Audit(AuditAction.UPDATE_GUEST, 'Guest')
  @ApiOperation({ summary: 'Davetli Bilgilerini Güncelleme' })
  @ApiParam({ name: 'id', description: 'Davetli UUID' })
  @ApiResponse({ status: 200, description: 'Davetli güncellendi' })
  @ApiResponse({ status: 404, description: 'Davetli bulunamadı' })
  async updateGuest(@Param('id') id: string, @Body() dto: UpdateGuestDto) {
    return this.crmService.updateGuest(id, dto);
  }

  // --------------------------------------------------------------------------
  // 5. DAVETLİ SİLME (KVKK SİLME HAKKI)
  // --------------------------------------------------------------------------
  @Delete('guests/:id')
  @Roles(Role.SUPER_ADMIN)
  @Audit(AuditAction.DELETE_GUEST, 'Guest')
  @ApiOperation({ summary: 'Davetli Kaydını Silme (Sadece SUPER_ADMIN)' })
  @ApiParam({ name: 'id', description: 'Davetli UUID' })
  @ApiResponse({ status: 200, description: 'Davetli ve ilişkileri silindi' })
  @ApiResponse({ status: 403, description: 'Yetki yetersiz (SUPER_ADMIN gereklidir)' })
  async deleteGuest(@Param('id') id: string) {
    return this.crmService.deleteGuest(id);
  }

  // --------------------------------------------------------------------------
  // 6. AÇIK PII GÖRÜNTÜLEME (ZORUNLU AUDIT LOG: VIEW_PII)
  // --------------------------------------------------------------------------
  @Get('guests/:id/pii')
  @Roles(Role.SUPER_ADMIN, Role.PR_MANAGER)
  @Audit(AuditAction.VIEW_PII, 'Guest')
  @ApiOperation({
    summary: 'Açık PII İletişim Bilgisi Görüntüleme (KVKK VIEW_PII Denetim İzi)',
    description:
      'Davetlinin şifreli e-posta ve telefonunu çözer. Bu işlem KVKK gereğince denetim kütüğüne (AuditLog) silinemez şekilde işlenir.',
  })
  @ApiParam({ name: 'id', description: 'Davetli UUID' })
  @ApiResponse({ status: 200, description: 'Açık e-posta ve telefon bilgisi' })
  async revealGuestPii(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Req() req: Request
  ) {
    const ip =
      req.ip ||
      (req.headers['x-forwarded-for'] as string) ||
      req.socket?.remoteAddress;
    const userAgent = req.headers['user-agent'];

    return this.crmService.revealGuestPii(id, user, ip, userAgent);
  }

  // --------------------------------------------------------------------------
  // 7. KARA LİSTE DURUMU DEĞİŞTİRME
  // --------------------------------------------------------------------------
  @Patch('guests/:id/blacklist')
  @Roles(Role.SUPER_ADMIN, Role.PR_MANAGER)
  @Audit(AuditAction.UPDATE_GUEST, 'Guest')
  @ApiOperation({
    summary: 'Davetliyi Kara Listeye Alma veya Çıkarma',
    description:
      'Kara listeye alınan davetlinin sadakat skoru derhal 0.0 puan ve HIGH_NO_SHOW_RISK seviyesine düşürülür.',
  })
  @ApiParam({ name: 'id', description: 'Davetli UUID' })
  @ApiResponse({ status: 200, description: 'Kara liste durumu güncellendi' })
  async toggleBlacklist(
    @Param('id') id: string,
    @Body() dto: BlacklistToggleDto,
    @CurrentUser() user: any
  ) {
    return this.crmService.toggleBlacklist(
      id,
      dto.isBlacklisted,
      dto.reason,
      user?.id
    );
  }

  // --------------------------------------------------------------------------
  // 8. ETKİNLİK KATILIM SONUCU SİMÜLASYONU
  // --------------------------------------------------------------------------
  @Post('guests/:id/attendance-outcome')
  @Roles(Role.SUPER_ADMIN, Role.PR_MANAGER)
  @ApiOperation({
    summary: 'Etkinlik Katılım Çıktısını İşleme ve Sadakat Puanını Güncelleme',
    description:
      'Katılım (+2.5 bonus), Son Dakika İptal (-12.0 ceza) veya Habersiz Gelmeme (-25.0 ceza) sonuçlarına göre sayaçları ve skoru günceller.',
  })
  @ApiParam({ name: 'id', description: 'Davetli UUID' })
  @ApiResponse({ status: 200, description: 'Katılım sonucu işlendi ve puan güncellendi' })
  async recordAttendanceOutcome(
    @Param('id') id: string,
    @Body() dto: AttendanceOutcomeDto
  ) {
    return this.crmService.recordAttendanceOutcome(id, dto.outcome);
  }

  // --------------------------------------------------------------------------
  // 9. TOPLU CSV İÇE AKTARMA (DEDUPING & UPSERT)
  // --------------------------------------------------------------------------
  @Post('guests/import-csv')
  @Roles(Role.SUPER_ADMIN, Role.PR_MANAGER)
  @ApiOperation({
    summary: 'Toplu CSV / Excel İçe Aktarma (Akıllı Deduping & Upsert)',
    description:
      'RFC 4180 uyumlu CSV verisini ayrıştırır. Blind Index eşleşmesi durumunda mükerrer kayıt açmak yerine etiketleri birleştirir ve kaydı günceller.',
  })
  @ApiResponse({ status: 200, description: 'İçe aktarma işlem raporu' })
  async importCsv(@Body() dto: BulkImportCsvDto) {
    return this.csvImportExportService.importGuestsFromCsv(
      dto.csvContent,
      dto.delimiter
    );
  }

  // --------------------------------------------------------------------------
  // 10. KVKK DENETİMLİ CSV DIŞA AKTARMA (EXPORT WITH BOM & AUDIT LOG)
  // --------------------------------------------------------------------------
  @Get('guests/export-csv')
  @Roles(Role.SUPER_ADMIN, Role.PR_MANAGER)
  @Audit(AuditAction.EXPORT_CSV, 'Guest')
  @ApiOperation({
    summary: 'Davetlileri Excel Uyumlu CSV Olarak Dışa Aktarma',
    description:
      'Filtrelenen davetlileri Excel UTF-8 BOM (\uFEFF) başlığıyla indirir. Bu işlem zorunlu EXPORT_CSV denetim izi kaydı oluşturur.',
  })
  async exportCsv(
    @Query() query: GuestFilterQueryDto,
    @CurrentUser() user: any,
    @Req() req: Request,
    @Res() res: Response
  ) {
    const ip =
      req.ip ||
      (req.headers['x-forwarded-for'] as string) ||
      req.socket?.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const csvContent = await this.csvImportExportService.exportGuestsToCsv(
      query,
      user,
      ip,
      userAgent
    );

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="gala_davetli_listesi.csv"'
    );

    return res.send(csvContent);
  }
}
