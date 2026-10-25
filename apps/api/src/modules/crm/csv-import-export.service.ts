import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { SecurityService } from '../security/security.service';
import { AuditLogService } from '../security/audit-log.service';
import { AuditAction, GuestTag, SocialPlatform, Prisma } from '@prisma/client';
import { calculateLoyaltyScore, resolveLoyaltyTier } from './loyalty-score.calculator';
import { GuestFilterQueryDto } from './dto/crm.dto';

export interface CsvImportRowError {
  row: number;
  reason: string;
}

export interface CsvImportResult {
  totalRows: number;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  errors: CsvImportRowError[];
}

@Injectable()
export class CsvImportExportService {
  private readonly logger = new Logger(CsvImportExportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly securityService: SecurityService,
    private readonly auditLogService: AuditLogService
  ) {}

  // RFC 4180 CSV / TSV PARSER (SIFIR DIŞ BAĞIMLILIK)

  /**
   * RFC 4180 uyumlu yerleşik CSV/TSV ayrıştırıcı
   * - UTF-8 BOM (\uFEFF) temizler
   * - Ayraç karakterini (, ; \t) otomatik algılar
   * - Tırnak içi virgülleri, noktalı virgülleri ve satır sonlarını hatasız ayrıştırır
   * - Çift tırnak kaçışlarını ("") düzgün çözer
   */
  parseCsv(csvContent: string, explicitDelimiter?: string): Array<Record<string, string>> {
    if (!csvContent || !csvContent.trim()) {
      return [];
    }

    // 1. UTF-8 BOM karakterini temizle
    let content = csvContent.replace(/^\uFEFF/, '');

    // 2. Ayraç tespiti
    const delimiter = explicitDelimiter || this.detectDelimiter(content);

    // 3. Karakter bazlı durum makinesi (State Machine)
    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentField = '';
    let insideQuotes = false;
    let i = 0;

    while (i < content.length) {
      const char = content[i];
      const nextChar = content[i + 1];

      if (char === '"') {
        if (insideQuotes && nextChar === '"') {
          // Kaçış yapılmış çift tırnak ("") -> tek tırnak
          currentField += '"';
          i += 2;
          continue;
        } else {
          // Tırnak içine giriş veya çıkış
          insideQuotes = !insideQuotes;
          i++;
          continue;
        }
      }

      if (!insideQuotes) {
        if (char === delimiter) {
          // Alan sonu
          currentRow.push(currentField.trim());
          currentField = '';
          i++;
          continue;
        }

        if (char === '\r' && nextChar === '\n') {
          // CRLF Satır sonu
          currentRow.push(currentField.trim());
          rows.push(currentRow);
          currentRow = [];
          currentField = '';
          i += 2;
          continue;
        }

        if (char === '\n' || char === '\r') {
          // LF veya CR Satır sonu
          currentRow.push(currentField.trim());
          rows.push(currentRow);
          currentRow = [];
          currentField = '';
          i++;
          continue;
        }
      }

      currentField += char;
      i++;
    }

    // Son kalan alan ve satırı ekle
    if (currentField.length > 0 || currentRow.length > 0) {
      currentRow.push(currentField.trim());
      rows.push(currentRow);
    }

    // Boş satırları filtrele
    const validRows = rows.filter((r) => r.length > 0 && r.some((f) => f.length > 0));
    if (validRows.length <= 1) {
      return [];
    }

    // 4. Başlık satırını haritala
    const headerRow = validRows[0]!;
    const normalizedHeaders = headerRow.map((h) => this.normalizeHeader(h));

    const records: Array<Record<string, string>> = [];
    for (let rowIndex = 1; rowIndex < validRows.length; rowIndex++) {
      const row = validRows[rowIndex]!;
      const record: Record<string, string> = {};

      for (let colIndex = 0; colIndex < normalizedHeaders.length; colIndex++) {
        const headerKey = normalizedHeaders[colIndex]!;
        record[headerKey] = row[colIndex] ?? '';
      }

      records.push(record);
    }

    return records;
  }

  /**
   * Ayraç karakterini içeriğin ilk satırına göre belirler (, ; \t)
   */
  private detectDelimiter(content: string): string {
    const firstLine = content.split(/\r\n|\n|\r/)[0] || '';
    const semicolonCount = (firstLine.match(/;/g) || []).length;
    const tabCount = (firstLine.match(/\t/g) || []).length;
    const commaCount = (firstLine.match(/,/g) || []).length;

    if (semicolonCount > commaCount && semicolonCount > tabCount) return ';';
    if (tabCount > commaCount && tabCount > semicolonCount) return '\t';
    return ',';
  }

  /**
   * Sütun başlıklarını kanonik anahtarlara eşler (Türkçe ve İngilizce esnek uyum)
   */
  private normalizeHeader(header: string): string {
    const clean = header
      .toLowerCase()
      .replace(/[\s\-_]/g, '')
      .replace(/["']/g, '');

    switch (clean) {
      case 'firstname':
      case 'first_name':
      case 'ad':
      case 'adi':
      case 'isim':
        return 'firstName';
      case 'lastname':
      case 'last_name':
      case 'soyad':
      case 'soyadi':
        return 'lastName';
      case 'email':
      case 'eposta':
      case 'e-posta':
      case 'mail':
        return 'email';
      case 'phone':
      case 'telefon':
      case 'tel':
      case 'gsm':
      case 'cep':
        return 'phone';
      case 'company':
      case 'kurum':
      case 'sirket':
      case 'sirketi':
      case 'medya':
        return 'company';
      case 'title':
      case 'unvan':
      case 'ünvan':
      case 'gorev':
      case 'pozisyon':
        return 'title';
      case 'tags':
      case 'etiketler':
      case 'segment':
      case 'segmentasyon':
        return 'tags';
      case 'instagram':
      case 'instagramhandle':
      case 'ig':
        return 'instagramHandle';
      case 'youtube':
      case 'youtubehandle':
      case 'yt':
        return 'youtubeHandle';
      case 'tiktok':
      case 'tiktokhandle':
      case 'tt':
        return 'tiktokHandle';
      case 'x':
      case 'xhandle':
      case 'twitter':
        return 'xHandle';
      case 'totalinvited':
      case 'davetsayisi':
        return 'totalInvited';
      case 'totalattended':
      case 'katilimsayisi':
        return 'totalAttended';
      case 'lastminutecancels':
      case 'sondakikaiptal':
        return 'lastMinuteCancels';
      case 'noshows':
      case 'habersizgelmeme':
        return 'noShows';
      default:
        return clean;
    }
  }

  // TOPLU CSV İÇE AKTARMA (DEDUPING & UPSERT)

  /**
   * CSV İçeriğinden Davetlileri İçe Aktarır
   * - E-posta ve telefon normalizasyonu yapar
   * - Blind Index ile mükerrer kayıt kontrolü (Deduping)
   * - Eşleşen kayıt varsa: Bilgileri günceller ve etiketleri birleştirir (Merge Tags)
   * - Eşleşmeyen kayıt varsa: AES-256-GCM ile şifreleyerek yeni kayıt açar
   */
  async importGuestsFromCsv(
    csvContent: string,
    delimiter?: string
  ): Promise<CsvImportResult> {
    const records = this.parseCsv(csvContent, delimiter);
    const result: CsvImportResult = {
      totalRows: records.length,
      createdCount: 0,
      updatedCount: 0,
      skippedCount: 0,
      errors: [],
    };

    if (records.length === 0) {
      return result;
    }

    for (let index = 0; index < records.length; index++) {
      const row = records[index]!;
      const rowNumber = index + 2; // Başlık satırı 1 kabul edildiğinde veri 2'den başlar

      const firstName = row.firstName?.trim();
      const lastName = row.lastName?.trim();
      const rawEmail = row.email?.trim();
      const rawPhone = row.phone?.trim();
      const company = row.company?.trim() || null;
      const title = row.title?.trim() || null;

      // Zorunlu alan kontrolü
      if (!firstName || !lastName || !rawEmail || !rawEmail.includes('@')) {
        result.skippedCount++;
        result.errors.push({
          row: rowNumber,
          reason: 'Ad, soyad veya geçerli e-posta adresi eksik.',
        });
        continue;
      }

      try {
        // Normalizasyon ve Deterministik Blind Index
        const normalizedEmail = this.securityService.normalizeEmail(rawEmail);
        const emailBlindIndex = this.securityService.generateEmailBlindIndex(normalizedEmail);

        let normalizedPhone: string | null = null;
        let phoneBlindIndex: string | null = null;

        if (rawPhone) {
          normalizedPhone = this.securityService.normalizePhone(rawPhone);
          if (normalizedPhone) {
            phoneBlindIndex = this.securityService.generatePhoneBlindIndex(normalizedPhone);
          }
        }

        // Etiketlerin ayrıştırılması (Virgül, noktalı virgül veya | ile ayrılmış)
        const rowTags = this.parseTags(row.tags);

        // Sayısal sayaçlar
        const rowTotalInvited = row.totalInvited ? Math.max(0, parseInt(row.totalInvited, 10) || 0) : 0;
        const rowTotalAttended = row.totalAttended ? Math.max(0, parseInt(row.totalAttended, 10) || 0) : 0;
        const rowLastMinuteCancels = row.lastMinuteCancels ? Math.max(0, parseInt(row.lastMinuteCancels, 10) || 0) : 0;
        const rowNoShows = row.noShows ? Math.max(0, parseInt(row.noShows, 10) || 0) : 0;

        // Deduping Arama Koşulu: E-posta Blind Index VEYA Telefon Blind Index
        const orConditions: Prisma.GuestWhereInput[] = [{ emailBlindIndex }];
        if (phoneBlindIndex) {
          orConditions.push({ phoneBlindIndex });
        }

        const existingGuest = await this.prisma.guest.findFirst({
          where: { OR: orConditions },
          include: { socialProfiles: true },
        });

        if (existingGuest) {
          // --- MEVCUT KAYDI GÜNCELLE (UPSERT & MERGE TAGS) ---
          const mergedTags = Array.from(
            new Set([...existingGuest.tags, ...rowTags])
          ) as GuestTag[];

          const updatedTotalInvited = Math.max(existingGuest.totalInvited, rowTotalInvited);
          const updatedTotalAttended = Math.max(existingGuest.totalAttended, rowTotalAttended);
          const updatedCancels = Math.max(existingGuest.lastMinuteCancels, rowLastMinuteCancels);
          const updatedNoShows = Math.max(existingGuest.noShows, rowNoShows);

          const { score: loyaltyScore } = calculateLoyaltyScore({
            totalInvited: updatedTotalInvited,
            totalAttended: updatedTotalAttended,
            lastMinuteCancels: updatedCancels,
            noShows: updatedNoShows,
            isBlacklisted: existingGuest.isBlacklisted,
            tags: mergedTags,
          });

          // PII Şifreleme (Mevcut varsa koru, yeni geldiyse güncelle)
          const emailEncrypted = this.securityService.encrypt(normalizedEmail);
          const phoneEncrypted = normalizedPhone
            ? this.securityService.encrypt(normalizedPhone)
            : existingGuest.phoneEncrypted;

          await this.prisma.guest.update({
            where: { id: existingGuest.id },
            data: {
              firstName: firstName || existingGuest.firstName,
              lastName: lastName || existingGuest.lastName,
              company: company || existingGuest.company,
              title: title || existingGuest.title,
              emailEncrypted,
              emailBlindIndex,
              phoneEncrypted,
              phoneBlindIndex: phoneBlindIndex || existingGuest.phoneBlindIndex,
              tags: mergedTags,
              totalInvited: updatedTotalInvited,
              totalAttended: updatedTotalAttended,
              lastMinuteCancels: updatedCancels,
              noShows: updatedNoShows,
              loyaltyScore,
            },
          });

          // Sosyal Medya Profillerini Eşitle
          await this.syncSocialProfiles(existingGuest.id, row);

          result.updatedCount++;
        } else {
          // --- YENİ DAVETLİ OLUŞTUR (INSERT) ---
          const emailEncrypted = this.securityService.encrypt(normalizedEmail);
          const phoneEncrypted = normalizedPhone
            ? this.securityService.encrypt(normalizedPhone)
            : null;

          const { score: loyaltyScore } = calculateLoyaltyScore({
            totalInvited: rowTotalInvited,
            totalAttended: rowTotalAttended,
            lastMinuteCancels: rowLastMinuteCancels,
            noShows: rowNoShows,
            isBlacklisted: false,
            tags: rowTags,
          });

          const newGuest = await this.prisma.guest.create({
            data: {
              firstName,
              lastName,
              company,
              title,
              emailEncrypted,
              emailBlindIndex,
              phoneEncrypted,
              phoneBlindIndex,
              tags: rowTags,
              loyaltyScore,
              totalInvited: rowTotalInvited,
              totalAttended: rowTotalAttended,
              lastMinuteCancels: rowLastMinuteCancels,
              noShows: rowNoShows,
              isBlacklisted: rowTags.includes(GuestTag.BLACKLIST),
            },
          });

          // Sosyal Medya Profillerini Oluştur
          await this.syncSocialProfiles(newGuest.id, row);

          result.createdCount++;
        }
      } catch (err) {
        this.logger.error(`Satır ${rowNumber} işlenirken hata oluştu:`, err);
        result.skippedCount++;
        result.errors.push({
          row: rowNumber,
          reason: err instanceof Error ? err.message : 'Bilinmeyen veritabanı hatası',
        });
      }
    }

    return result;
  }

  // KVKK DENETİMLİ CSV DIŞA AKTARMA (EXPORT WITH UTF-8 BOM & AUDIT LOG)

  /**
   * Davetlileri Excel Uyumlu (UTF-8 BOM Başlıklı) CSV Formatında Dışa Aktarır
   * Zorunlu olarak AuditAction.EXPORT_CSV denetim kaydı oluşturur.
   */
  async exportGuestsToCsv(
    filters: GuestFilterQueryDto = {},
    user?: any,
    ip?: string,
    userAgent?: string
  ): Promise<string> {
    const where: Prisma.GuestWhereInput = {};

    if (filters.tag) {
      where.tags = { has: filters.tag as GuestTag };
    }

    if (filters.isBlacklisted !== undefined) {
      where.isBlacklisted = filters.isBlacklisted;
    }

    if (filters.minLoyaltyScore !== undefined || filters.maxLoyaltyScore !== undefined) {
      where.loyaltyScore = {};
      if (filters.minLoyaltyScore !== undefined) {
        where.loyaltyScore.gte = Number(filters.minLoyaltyScore);
      }
      if (filters.maxLoyaltyScore !== undefined) {
        where.loyaltyScore.lte = Number(filters.maxLoyaltyScore);
      }
    }

    const guests = await this.prisma.guest.findMany({
      where,
      include: {
        socialProfiles: true,
      },
      orderBy: [{ loyaltyScore: 'desc' }, { lastName: 'asc' }],
    });

    // Excel için UTF-8 BOM başlığı
    const BOM = '\uFEFF';

    // CSV Başlık Satırı
    const headers = [
      'Ad',
      'Soyad',
      'E-posta',
      'Telefon',
      'Kurum',
      'Ünvan',
      'Etiketler',
      'Sadakat Skoru',
      'Sadakat Seviyesi',
      'Davet Sayısı',
      'Katılım',
      'Son Dakika İptal',
      'No-Show',
      'Kara Liste',
      'Instagram',
      'YouTube',
      'TikTok',
    ];

    const lines: string[] = [headers.join(',')];

    for (const guest of guests) {
      let plainEmail = '';
      let plainPhone = '';

      try {
        plainEmail = this.securityService.decrypt(guest.emailEncrypted);
      } catch {
        plainEmail = 'Şifre Çözülemedi';
      }

      if (guest.phoneEncrypted) {
        try {
          plainPhone = this.securityService.decrypt(guest.phoneEncrypted);
        } catch {
          plainPhone = 'Şifre Çözülemedi';
        }
      }

      const loyaltyTier = resolveLoyaltyTier(guest.loyaltyScore);
      const tagsStr = guest.tags.join(';');

      const ig = guest.socialProfiles.find((s) => s.platform === SocialPlatform.INSTAGRAM)?.handle || '';
      const yt = guest.socialProfiles.find((s) => s.platform === SocialPlatform.YOUTUBE)?.handle || '';
      const tt = guest.socialProfiles.find((s) => s.platform === SocialPlatform.TIKTOK)?.handle || '';

      const rowValues = [
        this.escapeCsvField(guest.firstName),
        this.escapeCsvField(guest.lastName),
        this.escapeCsvField(plainEmail),
        this.escapeCsvField(plainPhone),
        this.escapeCsvField(guest.company || ''),
        this.escapeCsvField(guest.title || ''),
        this.escapeCsvField(tagsStr),
        guest.loyaltyScore.toFixed(1),
        loyaltyTier,
        guest.totalInvited.toString(),
        guest.totalAttended.toString(),
        guest.lastMinuteCancels.toString(),
        guest.noShows.toString(),
        guest.isBlacklisted ? 'EVET' : 'HAYIR',
        this.escapeCsvField(ig),
        this.escapeCsvField(yt),
        this.escapeCsvField(tt),
      ];

      lines.push(rowValues.join(','));
    }

    const csvOutput = BOM + lines.join('\r\n');

    // KVKK Denetim İzi: EXPORT_CSV kaydını düş
    await this.auditLogService.log({
      userId: user?.id || user?.sub || null,
      action: AuditAction.EXPORT_CSV,
      entityType: 'Guest',
      entityId: 'BULK_EXPORT',
      metadata: {
        rowCount: guests.length,
        filters: {
          tag: filters.tag,
          isBlacklisted: filters.isBlacklisted,
          minLoyaltyScore: filters.minLoyaltyScore,
          maxLoyaltyScore: filters.maxLoyaltyScore,
        },
      },
      ipAddress: ip,
      userAgent: userAgent,
    });

    this.logger.log(
      `[CRM_EXPORT] ${guests.length} adet davetli CSV formatında dışa aktarıldı (Kullanıcı: ${user?.id || 'ANONYMOUS'})`
    );

    return csvOutput;
  }

  // YARDIMCI METOTLAR

  /**
   * CSV Hücresini RFC 4180'e göre kaçış karakterleriyle güvenli hale getirir
   */
  private escapeCsvField(val: string): string {
    if (!val) return '';
    const str = String(val);
    if (str.includes(',') || str.includes(';') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  /**
   * CSV metin etiketlerini GuestTag enum dizisine dönüştürür
   */
  private parseTags(rawTags?: string): GuestTag[] {
    if (!rawTags) return [];
    const parts = rawTags.split(/[,|;]/).map((t) => t.trim().toUpperCase());
    const validTags = Object.values(GuestTag) as string[];

    const result: GuestTag[] = [];
    for (const part of parts) {
      if (validTags.includes(part)) {
        result.push(part as GuestTag);
      }
    }
    return result;
  }

  /**
   * Sosyal medya kullanıcı adlarını SocialProfile tablosu ile senkronize eder
   */
  private async syncSocialProfiles(guestId: string, row: Record<string, string>) {
    const platforms: Array<{ platform: SocialPlatform; handle?: string }> = [
      { platform: SocialPlatform.INSTAGRAM, handle: row.instagramHandle },
      { platform: SocialPlatform.YOUTUBE, handle: row.youtubeHandle },
      { platform: SocialPlatform.TIKTOK, handle: row.tiktokHandle },
      { platform: SocialPlatform.X, handle: row.xHandle },
    ];

    for (const item of platforms) {
      if (item.handle && item.handle.trim()) {
        const handle = item.handle.trim().startsWith('@')
          ? item.handle.trim()
          : `@${item.handle.trim()}`;

        await this.prisma.socialProfile.upsert({
          where: {
            guestId_platform: {
              guestId,
              platform: item.platform,
            },
          },
          update: { handle },
          create: {
            guestId,
            platform: item.platform,
            handle,
          },
        });
      }
    }
  }
}
