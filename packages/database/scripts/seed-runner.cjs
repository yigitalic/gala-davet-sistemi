/**
 * GALA & PR OPERASYON PLATFORMU (B2B SaaS) — VERİTABANI SEED MOTORU (SEED RUNNER)
 * 
 * Bu tohumlama motoru:
 * 1. 4 Kurumsal Personel (SUPER_ADMIN, PR_MANAGER, DOOR_STAFF, ANALYST) — scrypt şifreli & 2FA AES-256-GCM
 * 2. 3 Gala & Özel Gösterim Etkinliği (Dune 3, Gladiator II, Oppenheimer) — KESİNLİKLE KOLTUKSUZ KAPASİTE MODELİ
 * 3. 12+ Davetli (VIP, PRESS, INFLUENCER, MORNING_SCREENING, SECONDARY, BLACKLIST) — E-posta ve telefonlar
 *    AES-256-GCM (iv:authTag:cipherText) ile şifrelenmiş, HMAC-SHA256 Blind Index üretilmiş.
 * 4. Sosyal Profiller, Davetiyeler (+1 Kontenjanları), Dinamik Biletler, Check-In Logları (SUCCESS, REPLAY, EXPIRED),
 *    AI Gelen Kutusu (AUTO_PROCESSED, NEEDS_REVIEW), 48s PR Paylaşımları (Duygu Analizi) ve KVKK Audit Logları.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// KRİPTOGRAFİ & YARDIMCI SABİTLER
const ENCRYPTION_KEY_HEX =
  process.env.ENCRYPTION_KEY ||
  '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
const BLIND_INDEX_SALT =
  process.env.BLIND_INDEX_SALT ||
  'fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210';

const encKeyBuffer = Buffer.from(ENCRYPTION_KEY_HEX, 'hex');

function encryptAes256Gcm(plainText) {
  if (!plainText) return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encKeyBuffer, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

function decryptAes256Gcm(encryptedPayload) {
  if (!encryptedPayload) return null;
  const parts = encryptedPayload.split(':');
  if (parts.length !== 3) throw new Error('Geçersiz AES-256-GCM payload formatı');
  const [ivHex, authTagHex, cipherTextHex] = parts;
  const decipher = crypto.createDecipheriv('aes-256-gcm', encKeyBuffer, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(cipherTextHex, 'hex')),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}

function normalizeEmail(email) {
  if (!email) return '';
  return email.trim().toLowerCase();
}

function normalizePhone(phone) {
  if (!phone) return '';
  let cleaned = phone.trim().replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+')) return cleaned;
  if (cleaned.startsWith('00')) return '+' + cleaned.substring(2);
  if (cleaned.startsWith('05') && cleaned.length === 11) return '+9' + cleaned;
  if (cleaned.startsWith('5') && cleaned.length === 10) return '+90' + cleaned;
  if (cleaned.startsWith('905') && cleaned.length === 12) return '+' + cleaned;
  return cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
}

function generateBlindIndex(value) {
  if (!value) return null;
  return crypto.createHmac('sha256', BLIND_INDEX_SALT).update(value).digest('hex');
}

function hashPasswordSync(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return `${salt}:${derivedKey.toString('hex')}`;
}

// SEED VERİLERİNİ ÜRETEN MOTOR (DATA BUILDER)
function generateSeedData(options = {}) {
  const includeHost = options.includeHost === true;
  const now = new Date();

  // 0. ÜÇ MULTI-TENANT DAĞITIMCI ŞİRKET
  const organizations = [
    {
      id: 'org-disney',
      name: 'Disney Studios Türkiye',
      slug: 'disney-tr',
      logoUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=128&q=80',
      brandColor: '#0063e5',
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'org-warner',
      name: 'Warner Bros. Discovery',
      slug: 'warner-tr',
      logoUrl: 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?w=128&q=80',
      brandColor: '#002244',
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'org-uip',
      name: 'UIP Türkiye',
      slug: 'uip-tr',
      logoUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=128&q=80',
      brandColor: '#d92525',
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
  ];

  // 1. DÖRT KURUMSAL PERSONEL (8 Standart Personel)
  const baseUsers = [
    {
      id: 'usr-super-admin-01',
      email: 'selin.yilmaz@galapr.com',
      passwordHash: hashPasswordSync('SelinAdmin2026!*'),
      firstName: 'Selin',
      lastName: 'Yılmaz',
      role: 'SUPER_ADMIN',
      organizationId: null,
      isActive: true,
      twoFactorEnabled: true,
      twoFactorSecret: encryptAes256Gcm('JBSWY3DPEHPK3PXP'), // AES-256-GCM ile şifreli
      lastLoginAt: new Date(now.getTime() - 1000 * 60 * 30),
    },
    {
      id: 'usr-pr-manager-02',
      email: 'baris.kaya@galapr.com',
      passwordHash: hashPasswordSync('BarisPr2026!*'),
      firstName: 'Barış',
      lastName: 'Kaya',
      role: 'PR_MANAGER',
      organizationId: null,
      isActive: true,
      twoFactorEnabled: true,
      twoFactorSecret: encryptAes256Gcm('HXDMVJECJJWSRB3HWLUW6CG7NY'),
      lastLoginAt: new Date(now.getTime() - 1000 * 60 * 120),
    },
    {
      id: 'usr-door-staff-03',
      email: 'ahmet.demir@galapr.com',
      passwordHash: hashPasswordSync('AhmetDoor2026!*'),
      firstName: 'Ahmet',
      lastName: 'Demir',
      role: 'DOOR_STAFF',
      organizationId: null,
      isActive: true,
      twoFactorEnabled: false,
      twoFactorSecret: null,
      lastLoginAt: new Date(now.getTime() - 1000 * 60 * 15),
    },
    {
      id: 'usr-analyst-04',
      email: 'zeynep.arslan@galapr.com',
      passwordHash: hashPasswordSync('ZeynepAnalyst2026!*'),
      firstName: 'Zeynep',
      lastName: 'Arslan',
      role: 'ANALYST',
      organizationId: null,
      isActive: true,
      twoFactorEnabled: false,
      twoFactorSecret: null,
      lastLoginAt: new Date(now.getTime() - 1000 * 60 * 300),
    },
  ];

  // HOST ADMIN (The Walt Disney Company Türkiye PR Yöneticisi)
  const hostUsers = [
    {
      id: 'usr-host-admin-disney',
      email: 'zeynep.yurtbasi@disney.com',
      passwordHash: hashPasswordSync('DisneyHost2026!*'),
      firstName: 'Zeynep',
      lastName: 'Yurtbaşı',
      role: 'HOST_ADMIN',
      organizationId: 'org-disney',
      isActive: true,
      twoFactorEnabled: true,
      twoFactorSecret: encryptAes256Gcm('DISNEYHOSTTOTP2026SECRETKEY'),
      lastLoginAt: new Date(now.getTime() - 1000 * 60 * 10),
    },
  ];

  const users = includeHost ? [...baseUsers, ...hostUsers] : baseUsers;

  // 2. ÜÇ TEMEL GALA ETKİNLİĞİ (8)
  const baseEvents = [
    {
      id: 'evt-dune-messiah-01',
      title: 'Dune: Messiah Türkiye Galası & Kırmızı Halı',
      movieTitle: 'Dune: Messiah',
      description: 'Warner Bros. Türkiye resmi kırmızı halı gala gecesi ve VIP kokteyl gösterimi.',
      venue: 'Zorlu PSM Turkcell Sahnesi',
      startsAt: new Date(now.getTime() + 1000 * 60 * 60 * 48), // 2 gün sonra
      doorsOpenAt: new Date(now.getTime() + 1000 * 60 * 60 * 46), // 2 gün sonra - 2 saat önce kapı
      capacity: 650, // Kesinlikle koltuk/sıra numarası yok, toplam kapasite
      status: 'PUBLISHED',
      organizationId: 'org-warner',
      isHistoricalArchive: false,
    },
    {
      id: 'evt-gladiator-2-02',
      title: 'Gladiator II Basın Ön Gösterimi',
      movieTitle: 'Gladiator II',
      description: 'Sinema yazarları ve kültür-sanat basını için özel sabah basın gösterimi.',
      venue: 'Kanyon Paribu Cineverse Salon 1',
      startsAt: new Date(now.getTime() + 1000 * 60 * 60 * 120), // 5 gün sonra
      doorsOpenAt: new Date(now.getTime() + 1000 * 60 * 60 * 119),
      capacity: 320,
      status: 'PUBLISHED',
      organizationId: 'org-uip',
      isHistoricalArchive: false,
    },
    {
      id: 'evt-oppenheimer-03',
      title: 'Oppenheimer VIP Özel Gösterimi',
      movieTitle: 'Oppenheimer',
      description: 'Sanat camiası ve akademisyenlerin katılımıyla gerçekleştirilen tarihi gösterim.',
      venue: 'AKM Türk Telekom Opera Salonu',
      startsAt: new Date(now.getTime() - 1000 * 60 * 60 * 72), // 3 gün önce tamamlandı
      doorsOpenAt: new Date(now.getTime() - 1000 * 60 * 60 * 74),
      capacity: 500,
      status: 'COMPLETED',
      organizationId: 'org-uip',
      isHistoricalArchive: false,
    },
  ];

  // DAĞITIMCI HOST ETKİNLİKLERİ (Disney TR Galaları)
  const hostEvents = [
    {
      id: 'evt-disney-moana2',
      title: 'Moana 2 Türkiye Özel Galası',
      movieTitle: 'Moana 2',
      description: 'The Walt Disney Company Türkiye resmi kırmızı halı gala gösterimi ve VIP kokteyl.',
      venue: 'Zorlu PSM Turkcell Platinum Sahnesi',
      startsAt: new Date(now.getTime() + 1000 * 60 * 60 * 72),
      doorsOpenAt: new Date(now.getTime() + 1000 * 60 * 60 * 70),
      capacity: 700,
      status: 'PUBLISHED',
      organizationId: 'org-disney',
      isHistoricalArchive: false,
    },
    {
      id: 'evt-disney-mufasa',
      title: 'Mufasa: Aslan Kral Basın Gösterimi',
      movieTitle: 'Mufasa: The Lion King',
      description: 'Sinema yazarları ve kültür-sanat basını için özel sabah basın gösterimi.',
      venue: 'Kanyon Paribu Cineverse Salon 2',
      startsAt: new Date(now.getTime() + 1000 * 60 * 60 * 168),
      doorsOpenAt: new Date(now.getTime() + 1000 * 60 * 60 * 167),
      capacity: 280,
      status: 'PUBLISHED',
      organizationId: 'org-disney',
      isHistoricalArchive: false,
    },
    {
      id: 'evt-disney-inside-out-2-archive',
      title: 'Ters Yüz 2 (Inside Out 2) Arşiv Galası',
      movieTitle: 'Inside Out 2',
      description: 'Geçmiş dönem Disney gişe rekoru kıran gala arşivi ve PR karne veritabanı.',
      venue: 'Zorlu PSM Ana Tiyatro',
      startsAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 120),
      doorsOpenAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 120 - 7200000),
      capacity: 600,
      status: 'COMPLETED',
      organizationId: 'org-disney',
      isHistoricalArchive: true,
    },
  ];

  const events = includeHost ? [...baseEvents, ...hostEvents] : baseEvents;

  // 3. 12 FARKLI PROFİLDE KRİPTOGRAFİK DAVETLİLER (AES-256-GCM + BLIND INDEX)
  const rawGuests = [
    {
      id: 'gst-01-vip-haluk',
      firstName: 'Haluk',
      lastName: 'Bilginer',
      company: 'Tiyatro & Sinema Oyuncuları Derneği',
      title: 'Onur Konuğu & Emmy Ödüllü Sanatçı',
      rawEmail: 'haluk.bilginer@sanat.local',
      rawPhone: '+90 532 111 22 33',
      tags: ['VIP', 'CREW', 'GALA_NIGHT'],
      loyaltyScore: 98.5,
      totalInvited: 12,
      totalAttended: 12,
      lastMinuteCancels: 0,
      noShows: 0,
      isBlacklisted: false,
      social: { platform: 'X', handle: '@halukbilginer', followers: 1450000, er: 4.8 },
    },
    {
      id: 'gst-02-vip-kivanc',
      firstName: 'Kıvanç',
      lastName: 'Tatlıtuğ',
      company: 'Ay Yapım',
      title: 'Başrol Oyuncusu',
      rawEmail: 'kivanc.tatlitug@ayyapim.local',
      rawPhone: '0533 222 33 44',
      tags: ['VIP', 'GALA_NIGHT'],
      loyaltyScore: 96.0,
      totalInvited: 10,
      totalAttended: 9,
      lastMinuteCancels: 1,
      noShows: 0,
      isBlacklisted: false,
      social: { platform: 'INSTAGRAM', handle: '@kivanctatlitug', followers: 4200000, er: 6.2 },
    },
    {
      id: 'gst-03-vip-zerrin',
      firstName: 'Zerrin',
      lastName: 'Tekindor',
      company: 'Devlet Tiyatroları',
      title: 'Devlet Sanatçısı',
      rawEmail: 'zerrin.tekindor@tiyatro.local',
      rawPhone: '+90 (532) 333 44 55',
      tags: ['VIP', 'GALA_NIGHT'],
      loyaltyScore: 99.0,
      totalInvited: 8,
      totalAttended: 8,
      lastMinuteCancels: 0,
      noShows: 0,
      isBlacklisted: false,
      social: { platform: 'INSTAGRAM', handle: '@zerrintekindor', followers: 980000, er: 3.9 },
    },
    {
      id: 'gst-04-press-mehmet',
      firstName: 'Mehmet',
      lastName: 'Yılmaz',
      company: 'Hürriyet Sinema',
      title: 'Kültür & Sanat Baş Editörü',
      rawEmail: 'mehmet.yilmaz@hurriyet.com.tr',
      rawPhone: '0542 444 55 66',
      tags: ['PRESS', 'MORNING_SCREENING'],
      loyaltyScore: 94.0,
      totalInvited: 15,
      totalAttended: 14,
      lastMinuteCancels: 1,
      noShows: 0,
      isBlacklisted: false,
      social: { platform: 'X', handle: '@mehmetyilmazsinema', followers: 185000, er: 2.7 },
    },
    {
      id: 'gst-05-press-atil',
      firstName: 'Atil',
      lastName: 'Inanc',
      company: 'Sinema Dergisi',
      title: 'Film Eleştirmeni',
      rawEmail: 'atil.inanc@sinemadergisi.com',
      rawPhone: '0555 555 66 77',
      tags: ['PRESS', 'MORNING_SCREENING'],
      loyaltyScore: 91.0,
      totalInvited: 11,
      totalAttended: 10,
      lastMinuteCancels: 1,
      noShows: 0,
      isBlacklisted: false,
      social: { platform: 'YOUTUBE', handle: '@sinemaclubatil', followers: 320000, er: 5.1 },
    },
    {
      id: 'gst-06-infl-danla',
      firstName: 'Danla',
      lastName: 'Bilic',
      company: 'Dijital İletişim',
      title: 'Lifestyle & PR İçerik Üreticisi',
      rawEmail: 'danla.bilic@influencer.local',
      rawPhone: '0530 666 77 88',
      tags: ['INFLUENCER', 'GALA_NIGHT'],
      loyaltyScore: 89.0,
      totalInvited: 9,
      totalAttended: 8,
      lastMinuteCancels: 1,
      noShows: 0,
      isBlacklisted: false,
      social: { platform: 'INSTAGRAM', handle: '@danlabilic', followers: 6100000, er: 7.4 },
    },
    {
      id: 'gst-07-infl-baris',
      firstName: 'Barış',
      lastName: 'Özcan',
      company: 'Görsel Anlatı Ltd.',
      title: 'Kültür & Bilim İçerik Üreticisi',
      rawEmail: 'baris.ozcan@youtube.local',
      rawPhone: '0535 777 88 99',
      tags: ['INFLUENCER', 'VIP'],
      loyaltyScore: 97.0,
      totalInvited: 7,
      totalAttended: 7,
      lastMinuteCancels: 0,
      noShows: 0,
      isBlacklisted: false,
      social: { platform: 'YOUTUBE', handle: '@barisozcan', followers: 6500000, er: 8.9 },
    },
    {
      id: 'gst-08-morning-selin',
      firstName: 'Selin',
      lastName: 'Gökbakar',
      company: 'Beyazperde.com',
      title: 'Kıdemli Muhabir',
      rawEmail: 'selin.gokbakar@beyazperde.local',
      rawPhone: '0536 888 99 00',
      tags: ['MORNING_SCREENING', 'PRESS'],
      loyaltyScore: 93.0,
      totalInvited: 14,
      totalAttended: 13,
      lastMinuteCancels: 1,
      noShows: 0,
      isBlacklisted: false,
      social: { platform: 'TIKTOK', handle: '@filminceliyor', followers: 240000, er: 4.2 },
    },
    {
      id: 'gst-09-sec-can',
      firstName: 'Can',
      lastName: 'Akbulut',
      company: 'Genç Sinemacılar Kulübü',
      title: 'Koordinatör Yardımcısı',
      rawEmail: 'can.akbulut@gencsinema.org',
      rawPhone: '0543 999 00 11',
      tags: ['SECONDARY'],
      loyaltyScore: 82.0,
      totalInvited: 5,
      totalAttended: 4,
      lastMinuteCancels: 1,
      noShows: 0,
      isBlacklisted: false,
      social: { platform: 'INSTAGRAM', handle: '@canakbulutfilm', followers: 45000, er: 2.1 },
    },
    {
      id: 'gst-10-sec-burcu',
      firstName: 'Burcu',
      lastName: 'Yıldız',
      company: 'PR Stajyer Portalı',
      title: 'İkincil İletişim Sorumlusu',
      rawEmail: 'burcu.yildiz@ajans.local',
      rawPhone: '0531 100 20 30',
      tags: ['SECONDARY'],
      loyaltyScore: 85.0,
      totalInvited: 4,
      totalAttended: 3,
      lastMinuteCancels: 1,
      noShows: 0,
      isBlacklisted: false,
      social: { platform: 'X', handle: '@burcuyildizpr', followers: 18000, er: 1.8 },
    },
    {
      id: 'gst-11-black-feridun',
      firstName: 'Feridun',
      lastName: 'Korsan',
      company: 'Yetkisiz Magazin',
      title: 'Kaçak Canlı Yayıncı',
      rawEmail: 'feridun.korsan@kacakmedya.local',
      rawPhone: '0538 999 88 77',
      tags: ['BLACKLIST'],
      loyaltyScore: 12.0,
      totalInvited: 3,
      totalAttended: 1,
      lastMinuteCancels: 0,
      noShows: 2,
      isBlacklisted: true,
      blacklistReason: 'Önceki gala salonunda korsan telefon yayını ve yetkisiz ses kaydı tespiti.',
      social: { platform: 'TIKTOK', handle: '@korsangala', followers: 85000, er: 1.2 },
    },
    {
      id: 'gst-12-black-tuncay',
      firstName: 'Tuncay',
      lastName: 'Sızdırıcı',
      company: 'Bilinmeyen Blog',
      title: 'Siber Tehdit / Sahte Bilet Paylaşımcısı',
      rawEmail: 'tuncay.sizdirici@darkweb.local',
      rawPhone: '0549 777 66 55',
      tags: ['BLACKLIST'],
      loyaltyScore: 5.0,
      totalInvited: 2,
      totalAttended: 0,
      lastMinuteCancels: 0,
      noShows: 2,
      isBlacklisted: true,
      blacklistReason: 'WhatsApp gruplarında sahte VIP QR bilet şablonları sızdırma girişimi.',
      social: { platform: 'X', handle: '@sizdirici_t', followers: 12000, er: 0.5 },
    },
  ];

  // Kriptografik Alanları Şifrele ve Blind Index Üret
  const guests = rawGuests.map((g) => {
    const normEmail = normalizeEmail(g.rawEmail);
    const normPhone = normalizePhone(g.rawPhone);

    return {
      id: g.id,
      firstName: g.firstName,
      lastName: g.lastName,
      company: g.company,
      title: g.title,
      emailEncrypted: encryptAes256Gcm(normEmail),
      emailBlindIndex: generateBlindIndex(normEmail),
      phoneEncrypted: encryptAes256Gcm(normPhone),
      phoneBlindIndex: generateBlindIndex(normPhone),
      tags: g.tags,
      loyaltyScore: g.loyaltyScore,
      totalInvited: g.totalInvited,
      totalAttended: g.totalAttended,
      lastMinuteCancels: g.lastMinuteCancels,
      noShows: g.noShows,
      isBlacklisted: g.isBlacklisted,
      blacklistReason: g.blacklistReason || null,
      rawEmail: g.rawEmail,
      rawPhone: g.rawPhone,
      social: g.social,
    };
  });

  // 4. SOSYAL MEDYA PROFİLLERİ (SocialProfile)
  const socialProfiles = guests.map((g, idx) => ({
    id: `soc-${idx + 1}`,
    guestId: g.id,
    platform: g.social.platform,
    handle: g.social.handle,
    followerCount: g.social.followers,
    engagementRate: g.social.er,
    lastScrapedAt: new Date(now.getTime() - 1000 * 60 * 60 * 12),
    scrapeStatus: 'COMPLETED',
  }));

  // 5. DAVETİYELER (Invitation)
  const invitations = [
    // Dune Galası Davetiyeleri
    {
      id: 'inv-dune-haluk-01',
      eventId: 'evt-dune-messiah-01',
      guestId: 'gst-01-vip-haluk',
      rsvpStatus: 'CONFIRMED',
      plusOneRequested: 1,
      plusOneApproved: 1,
      plusOneNames: 'Zerrin Tekindor (Refakatçi)',
      rsvpTokenHash: crypto.createHash('sha256').update('dune-haluk-token').digest('hex'),
      sentAt: new Date(now.getTime() - 1000 * 60 * 60 * 24),
      respondedAt: new Date(now.getTime() - 1000 * 60 * 60 * 18),
      responseChannel: 'EMAIL_LINK',
    },
    {
      id: 'inv-dune-kivanc-02',
      eventId: 'evt-dune-messiah-01',
      guestId: 'gst-02-vip-kivanc',
      rsvpStatus: 'CONFIRMED',
      plusOneRequested: 1,
      plusOneApproved: 1,
      plusOneNames: 'Başak Dizer',
      rsvpTokenHash: crypto.createHash('sha256').update('dune-kivanc-token').digest('hex'),
      sentAt: new Date(now.getTime() - 1000 * 60 * 60 * 24),
      respondedAt: new Date(now.getTime() - 1000 * 60 * 60 * 12),
      responseChannel: 'AI_INBOUND',
    },
    {
      id: 'inv-dune-danla-03',
      eventId: 'evt-dune-messiah-01',
      guestId: 'gst-06-infl-danla',
      rsvpStatus: 'CONFIRMED',
      plusOneRequested: 0,
      plusOneApproved: 0,
      plusOneNames: null,
      rsvpTokenHash: crypto.createHash('sha256').update('dune-danla-token').digest('hex'),
      sentAt: new Date(now.getTime() - 1000 * 60 * 60 * 20),
      respondedAt: new Date(now.getTime() - 1000 * 60 * 60 * 10),
      responseChannel: 'EMAIL_LINK',
    },
    {
      id: 'inv-dune-mehmet-04',
      eventId: 'evt-dune-messiah-01',
      guestId: 'gst-04-press-mehmet',
      rsvpStatus: 'CONFIRMED',
      plusOneRequested: 0,
      plusOneApproved: 0,
      plusOneNames: null,
      rsvpTokenHash: crypto.createHash('sha256').update('dune-mehmet-token').digest('hex'),
      sentAt: new Date(now.getTime() - 1000 * 60 * 60 * 22),
      respondedAt: new Date(now.getTime() - 1000 * 60 * 60 * 14),
      responseChannel: 'EMAIL_LINK',
    },
    {
      id: 'inv-dune-atil-05',
      eventId: 'evt-dune-messiah-01',
      guestId: 'gst-05-press-atil',
      rsvpStatus: 'UNCERTAIN',
      plusOneRequested: 1,
      plusOneApproved: 0,
      plusOneNames: 'Kamera Asistanı',
      rsvpTokenHash: crypto.createHash('sha256').update('dune-atil-token').digest('hex'),
      sentAt: new Date(now.getTime() - 1000 * 60 * 60 * 16),
      respondedAt: new Date(now.getTime() - 1000 * 60 * 60 * 4),
      responseChannel: 'AI_INBOUND',
    },
    {
      id: 'inv-dune-feridun-06',
      eventId: 'evt-dune-messiah-01',
      guestId: 'gst-11-black-feridun',
      rsvpStatus: 'DECLINED',
      plusOneRequested: 0,
      plusOneApproved: 0,
      plusOneNames: null,
      rsvpTokenHash: crypto.createHash('sha256').update('dune-feridun-token').digest('hex'),
      sentAt: new Date(now.getTime() - 1000 * 60 * 60 * 30),
      respondedAt: null,
      responseChannel: null,
    },
  ];

  // 6. AI GELEN KUTUSU (EmailThread & AiInboxReview)
  const emailThreads = [
    {
      id: 'thr-01-kivanc-ai',
      invitationId: 'inv-dune-kivanc-02',
      inboundMessageId: '<msg-inbound-kivanc-dune@mail.local>',
      rawSubject: 'Re: Dune: Messiah Galası Davetiyesi Teyidi',
      rawBodyEncrypted: encryptAes256Gcm(
        'Merhaba Selin Hanım, eşim Başak Dizer ile birlikte galaya kesinlikle katılıyoruz. Kırmızı halı röportajı için saat kaçta Zorlu PSM VIP kapısında olmamızı önerirsiniz?'
      ),
      fromEmailBlindIndex: generateBlindIndex(normalizeEmail('kivanc.tatlitug@ayyapim.local')),
      receivedAt: new Date(now.getTime() - 1000 * 60 * 60 * 12),
      review: {
        aiClassification: 'CONFIRMED',
        aiConfidence: 0.98,
        extractedPlusOne: 1,
        detectedQuestions: 'Kırmızı halı röportaj saati ve VIP kapı karşılama detayı soruldu.',
        aiDraftReply:
          'Sayın Kıvanç Tatlıtuğ ve Başak Dizer, katılımınızdan büyük onur duyuyoruz. Kırmızı halı röportajları için saat 19:15 te Zorlu PSM VIP protokol kapısında olmanız ideal olacaktır.',
        reviewStatus: 'AUTO_PROCESSED',
      },
    },
    {
      id: 'thr-02-atil-ai',
      invitationId: 'inv-dune-atil-05',
      inboundMessageId: '<msg-inbound-atil-dune@mail.local>',
      rawSubject: 'Re: Dune Basın Daveti & Kamera Ekipmanı Sorusuna Dair',
      rawBodyEncrypted: encryptAes256Gcm(
        'İyi günler, galaya katılmak istiyorum fakat yanımda profesyonel röportaj kameramanım gelecek. +1 ve tripod sokmamıza izin var mı? Kesin program belli olunca döneceğim.'
      ),
      fromEmailBlindIndex: generateBlindIndex(normalizeEmail('atil.inanc@sinemadergisi.com')),
      receivedAt: new Date(now.getTime() - 1000 * 60 * 60 * 4),
      review: {
        aiClassification: 'UNCERTAIN',
        aiConfidence: 0.65,
        extractedPlusOne: 1,
        detectedQuestions: 'Basın tripodu ve kamera asistanı için izin kuralları soruluyor.',
        aiDraftReply:
          'Sayın Atıl İnanç, basın mensuplarımız için fuaye alanında ayrılmış kamera podu mevcuttur. Lütfen kameramanınızın adını iletiniz.',
        reviewStatus: 'NEEDS_REVIEW',
      },
    },
  ];

  // 7. KRİPTOGRAFİK DİNAMİK BİLETLER (Ticket)
  const tickets = [
    {
      id: 'tkt-8842-vip',
      invitationId: 'inv-dune-haluk-01',
      totpSecretEncrypted: encryptAes256Gcm('JBSWY3DPEHPK3PXP'),
      isRevoked: false,
      revokedAt: null,
      revokedReason: null,
    },
    {
      id: 'tkt-7721-vip',
      invitationId: 'inv-dune-kivanc-02',
      totpSecretEncrypted: encryptAes256Gcm('HXDMVJECJJWSRB3HWLUW6CG7NY'),
      isRevoked: false,
      revokedAt: null,
      revokedReason: null,
    },
    {
      id: 'tkt-1234-infl',
      invitationId: 'inv-dune-danla-03',
      totpSecretEncrypted: encryptAes256Gcm('MZXW6YTBOI======'),
      isRevoked: false,
      revokedAt: null,
      revokedReason: null,
    },
    {
      id: 'tkt-9912-press',
      invitationId: 'inv-dune-mehmet-04',
      totpSecretEncrypted: encryptAes256Gcm('NBSWY3DPEHPK3PXP'),
      isRevoked: false,
      revokedAt: null,
      revokedReason: null,
    },
    {
      id: 'tkt-9999-bad',
      invitationId: 'inv-dune-feridun-06',
      totpSecretEncrypted: encryptAes256Gcm('OBRWY3DPEHPK3PXP'),
      isRevoked: true,
      revokedAt: new Date(now.getTime() - 1000 * 60 * 60 * 2),
      revokedReason: 'Kara listedeki şahıs için güvenlik protokolü uyarınca iptal edildi.',
    },
  ];

  // 8. CHECK-IN LOGLARI (CheckInLog)
  const checkInLogs = [
    {
      id: 'chk-log-01',
      ticketId: 'tkt-8842-vip',
      scannedById: 'usr-door-staff-03',
      scannedAt: new Date(now.getTime() - 1000 * 60 * 25),
      guestEnteredCount: 2, // Haluk Bilginer + Refakatçi
      scanResult: 'SUCCESS',
      deviceInfo: 'Galaxy Tab S9 - Zorlu PSM Protokol Girişi (PWA WebRTC)',
      ipAddress: '192.168.1.101',
    },
    {
      id: 'chk-log-02',
      ticketId: 'tkt-8842-vip',
      scannedById: 'usr-door-staff-03',
      scannedAt: new Date(now.getTime() - 1000 * 60 * 20),
      guestEnteredCount: 1,
      scanResult: 'REPLAY_ATTACK_BLOCKED',
      deviceInfo: 'iPhone 15 Pro - Protokol Kapısı (Kopya Ekran Görüntüsü)',
      ipAddress: '192.168.1.105',
    },
    {
      id: 'chk-log-03',
      ticketId: 'tkt-9912-press',
      scannedById: 'usr-door-staff-03',
      scannedAt: new Date(now.getTime() - 1000 * 60 * 15),
      guestEnteredCount: 1,
      scanResult: 'EXPIRED_QR',
      deviceInfo: 'Galaxy Tab S9 - Basın Kapısı',
      ipAddress: '192.168.1.102',
    },
    {
      id: 'chk-log-04',
      ticketId: 'tkt-9999-bad',
      scannedById: 'usr-door-staff-03',
      scannedAt: new Date(now.getTime() - 1000 * 60 * 10),
      guestEnteredCount: 1,
      scanResult: 'REVOKED',
      deviceInfo: 'Galaxy Tab S9 - Protokol Kapısı',
      ipAddress: '192.168.1.101',
    },
  ];

  // 9. 48 SAAT PR & ROI METRİKLERİ (PostEventMention)
  const postEventMentions = [
    {
      id: 'men-01-haluk-x',
      eventId: 'evt-oppenheimer-03',
      guestId: 'gst-01-vip-haluk',
      platform: 'X',
      postUrl: 'https://x.com/halukbilginer/status/178920192830192',
      postedAt: new Date(now.getTime() - 1000 * 60 * 60 * 40),
      reachEstimate: 450000,
      likesCount: 14200,
      commentsCount: 890,
      sentiment: 'POSITIVE',
      sentimentScore: 0.94,
      aiSummary: 'Film kurgusu ve müziklerin sahne derinliğini öven son derece olumlu paylaşım.',
    },
    {
      id: 'men-02-danla-ig',
      eventId: 'evt-oppenheimer-03',
      guestId: 'gst-06-infl-danla',
      platform: 'INSTAGRAM',
      postUrl: 'https://instagram.com/p/C892182901/',
      postedAt: new Date(now.getTime() - 1000 * 60 * 60 * 36),
      reachEstimate: 1200000,
      likesCount: 94000,
      commentsCount: 3100,
      sentiment: 'POSITIVE',
      sentimentScore: 0.88,
      aiSummary: 'Gala kırmızı halı kıyafeti ve filmin yarattığı görsel etkiyi anlatan viral gönderi.',
    },
    {
      id: 'men-03-mehmet-x',
      eventId: 'evt-oppenheimer-03',
      guestId: 'gst-04-press-mehmet',
      platform: 'X',
      postUrl: 'https://x.com/mehmetyilmazsinema/status/178920999999',
      postedAt: new Date(now.getTime() - 1000 * 60 * 60 * 30),
      reachEstimate: 65000,
      likesCount: 2100,
      commentsCount: 140,
      sentiment: 'NEUTRAL',
      sentimentScore: 0.15,
      aiSummary: 'Teknik ses miksajı ve tarihsel doğruluğu ele alan tarafsız sinema kritiği.',
    },
    {
      id: 'men-04-feridun-tiktok',
      eventId: 'evt-oppenheimer-03',
      guestId: 'gst-11-black-feridun',
      platform: 'TIKTOK',
      postUrl: 'https://tiktok.com/@korsangala/video/71920192019',
      postedAt: new Date(now.getTime() - 1000 * 60 * 60 * 20),
      reachEstimate: 15000,
      likesCount: 120,
      commentsCount: 45,
      sentiment: 'NEGATIVE',
      sentimentScore: -0.82,
      aiSummary: 'Girişte güvenliğin sıkı olmasından şikayet eden karalayıcı video.',
    },
  ];

  // 10. KVKK DENETİM İZİ (AuditLog)
  const auditLogs = [
    {
      id: 'aud-01-login',
      userId: 'usr-super-admin-01',
      action: 'USER_LOGIN',
      entityType: 'User',
      entityId: 'usr-super-admin-01',
      metadata: { method: '2FA_TOTP', ip: '127.0.0.1' },
      ipAddress: '127.0.0.1',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      createdAt: new Date(now.getTime() - 1000 * 60 * 30),
    },
    {
      id: 'aud-02-view-pii',
      userId: 'usr-pr-manager-02',
      action: 'VIEW_PII',
      entityType: 'Guest',
      entityId: 'gst-01-vip-haluk',
      metadata: { field: 'phoneEncrypted', reason: 'VIP Transfer Koordinasyonu' },
      ipAddress: '192.168.1.55',
      userAgent: 'Gala-PR-Console/2.0',
      createdAt: new Date(now.getTime() - 1000 * 60 * 28),
    },
    {
      id: 'aud-03-scan',
      userId: 'usr-door-staff-03',
      action: 'SCAN_QR',
      entityType: 'Ticket',
      entityId: 'tkt-8842-vip',
      metadata: { scanResult: 'SUCCESS', count: 2 },
      ipAddress: '192.168.1.101',
      userAgent: 'GalaPR-PWA-WebRTC/2.0',
      createdAt: new Date(now.getTime() - 1000 * 60 * 25),
    },
    {
      id: 'aud-04-revoke',
      userId: 'usr-pr-manager-02',
      action: 'REVOKE_TICKET',
      entityType: 'Ticket',
      entityId: 'tkt-9999-bad',
      metadata: { reason: 'Kara listedeki şahıs için güvenlik protokolü' },
      ipAddress: '192.168.1.55',
      userAgent: 'Gala-PR-Console/2.0',
      createdAt: new Date(now.getTime() - 1000 * 60 * 12),
    },
  ];

  // 11. — DAĞITIMCIYA ÖZEL DAVETLİ HAVUZU & PR DÖNÜŞÜM KARNELERİ (GuestOrganization)
  const guestOrganizations = [
    // 1. Danla Bilic - Disney TR Yüksek PR Dönüşümü (%100)
    {
      id: 'go-disney-danla',
      guestId: 'gst-06-infl-danla',
      organizationId: 'org-disney',
      hostCustomTags: ['VIP', 'INFLUENCER'],
      hostLoyaltyScore: 96.0,
      totalInvitedByHost: 5,
      totalAttendedForHost: 5,
      totalPostsForHost: 5,
      prConversionRate: 100.0,
      lastMinuteCancelsForHost: 0,
      noShowsForHost: 0,
      hostNotes: 'Disney projelerini ve animasyonlarını düzenli paylaşan A+ Influencer.',
      createdAt: now,
      updatedAt: now,
    },
    // 2. Barış Özcan - Disney TR Yüksek PR Dönüşümü (%100)
    {
      id: 'go-disney-baris',
      guestId: 'gst-07-infl-baris',
      organizationId: 'org-disney',
      hostCustomTags: ['VIP', 'INFLUENCER'],
      hostLoyaltyScore: 98.0,
      totalInvitedByHost: 4,
      totalAttendedForHost: 4,
      totalPostsForHost: 4,
      prConversionRate: 100.0,
      lastMinuteCancelsForHost: 0,
      noShowsForHost: 0,
      hostNotes: 'Belgesel ve animasyon derinlemesine incelemeleri yüksek etkileşim getiriyor.',
      createdAt: now,
      updatedAt: now,
    },
    // 3. Mehmet Yılmaz - Disney TR Basın (%80)
    {
      id: 'go-disney-mehmet',
      guestId: 'gst-04-press-mehmet',
      organizationId: 'org-disney',
      hostCustomTags: ['PRESS', 'MORNING_SCREENING'],
      hostLoyaltyScore: 92.0,
      totalInvitedByHost: 6,
      totalAttendedForHost: 5,
      totalPostsForHost: 4,
      prConversionRate: 80.0,
      lastMinuteCancelsForHost: 1,
      noShowsForHost: 0,
      hostNotes: 'Kültür sanat köşesinde kapsamlı köşe yazısı ve eleştiri yayımlar.',
      createdAt: now,
      updatedAt: now,
    },
    // 4. Kıvanç Tatlıtuğ - Disney TR Düşük PR Dönüşümü: 4 Katılım -> 1 Paylaşım = %25.0 [ŞARTNAME ZORUNLU ÖRNEK]
    {
      id: 'go-disney-kivanc',
      guestId: 'gst-02-vip-kivanc',
      organizationId: 'org-disney',
      hostCustomTags: ['VIP', 'INFLUENCER'],
      hostLoyaltyScore: 90.0,
      totalInvitedByHost: 4,
      totalAttendedForHost: 4,
      totalPostsForHost: 1,
      prConversionRate: 25.0, // (1 / 4) * 100 = 25.0%
      lastMinuteCancelsForHost: 0,
      noShowsForHost: 0,
      hostNotes: 'Son 4 Disney galasına katıldı ancak yalnızca 1 hikaye paylaştı. Düşük PR dönüşümü uyarısı.',
      createdAt: now,
      updatedAt: now,
    },
    // 5. Burcu Yıldız - Disney TR Sıfır Paylaşım (Ghosting: 2 Katılım -> 0 Paylaşım = %0.0)
    {
      id: 'go-disney-burcu',
      guestId: 'gst-10-sec-burcu',
      organizationId: 'org-disney',
      hostCustomTags: ['SECONDARY'],
      hostLoyaltyScore: 80.0,
      totalInvitedByHost: 2,
      totalAttendedForHost: 2,
      totalPostsForHost: 0,
      prConversionRate: 0.0,
      lastMinuteCancelsForHost: 0,
      noShowsForHost: 0,
      hostNotes: 'Ghosting: Galalara katıldı ancak hiçbir sosyal medya veya basında paylaşım yapmadı.',
      createdAt: now,
      updatedAt: now,
    },
    // 6. Haluk Bilginer - Warner Bros Havuzunda (org-warner)
    {
      id: 'go-warner-haluk',
      guestId: 'gst-01-vip-haluk',
      organizationId: 'org-warner',
      hostCustomTags: ['VIP', 'CREW'],
      hostLoyaltyScore: 99.0,
      totalInvitedByHost: 5,
      totalAttendedForHost: 5,
      totalPostsForHost: 4,
      prConversionRate: 80.0,
      lastMinuteCancelsForHost: 0,
      noShowsForHost: 0,
      hostNotes: 'Warner Bros galalarının onur konuğu.',
      createdAt: now,
      updatedAt: now,
    },
    // 7. Mehmet Yılmaz - Warner Bros Havuzunda (Aynı davetli, Warner'da %100 dönüşüm!)
    {
      id: 'go-warner-mehmet',
      guestId: 'gst-04-press-mehmet',
      organizationId: 'org-warner',
      hostCustomTags: ['PRESS'],
      hostLoyaltyScore: 88.0,
      totalInvitedByHost: 3,
      totalAttendedForHost: 3,
      totalPostsForHost: 3,
      prConversionRate: 100.0,
      lastMinuteCancelsForHost: 0,
      noShowsForHost: 0,
      hostNotes: 'Warner Bros özel basın gösterimlerini kaçırmaz.',
      createdAt: now,
      updatedAt: now,
    },
  ];

  return {
    organizations,
    users,
    events,
    guests,
    socialProfiles,
    invitations,
    emailThreads,
    tickets,
    checkInLogs,
    postEventMentions,
    auditLogs,
    guestOrganizations,
    hostUsers,
    hostEvents,
    allUsers: [...baseUsers, ...hostUsers],
    allEvents: [...baseEvents, ...hostEvents],
  };
}

// DOĞRUDAN ÇALIŞTIRMA (CLI ENTRYPOINT)
async function runSeed() {
  console.log('\x1b[33m%s\x1b[0m', '==============================================================================');
  console.log('\x1b[33m%s\x1b[0m', '     GALA & PR OPERASYON PLATFORMU (B2B SaaS) — VERİTABANI SEED MOTORU       ');
  console.log('\x1b[33m%s\x1b[0m', '==============================================================================\n');

  const data = generateSeedData({ includeHost: true });

  console.log(`[1/6] 3 Dağıtımcı (Disney TR, Warner Bros, UIP) ve 5 Kurumsal Personel (HOST_ADMIN Dahil) Hazırlandı.`);
  console.log(`[2/6] ${data.events.length} Koltuksuz Etkinlik Oluşturuldu (Disney Moana 2, Mufasa & Geçmiş Arşiv Dahil).`);
  console.log(`[3/6] ${data.guests.length} Davetli AES-256-GCM ile Şifrelendi & Blind Indexleri Hesaplandı.`);
  console.log(`[4/6] ${data.guestOrganizations.length} Dağıtımcıya Özel PR Karnesi (Sadakat, Sosyal Güç & Dönüşüm %) Oluşturuldu.`);
  console.log(`[5/6] ${data.invitations.length} Davetiye, ${data.emailThreads.length} AI Thread, ${data.tickets.length} Bilet & ${data.checkInLogs.length} Check-In Logu Oluşturuldu.`);
  console.log(`[6/6] ${data.postEventMentions.length} Post-Event Mention & ${data.auditLogs.length} KVKK Audit Logu Hazırlandı.`);

  // Koltuk kuralı doğrulaması
  for (const ev of data.events) {
    const keys = Object.keys(ev);
    const hasForbidden = keys.some(k => k.toLowerCase().includes('seat') || k.toLowerCase().includes('koltuk') || k.toLowerCase().includes('row'));
    if (hasForbidden) {
      throw new Error(`MİMARİ KURAL İHLALİ: Etkinlikte koltuk/sıra bilgisi tespit edildi! (${ev.title})`);
    }
  }

  // Şifreleme doğrulaması
  for (const g of data.guests) {
    if (!g.emailEncrypted || !g.emailEncrypted.includes(':')) {
      throw new Error(`KRİPTOGRAFİ HATASI: Davetli ${g.firstName} e-postası AES-256-GCM formatında değil!`);
    }
    const dec = decryptAes256Gcm(g.emailEncrypted);
    if (!dec.includes('@')) {
      throw new Error(`ŞİFRE ÇÖZME HATASI: Davetli e-postası çözülemedi: ${dec}`);
    }
    const bi = generateBlindIndex(normalizeEmail(dec));
    if (bi !== g.emailBlindIndex) {
      throw new Error(`BLIND INDEX HATASI: HMAC eşleşmedi!`);
    }
  }

  console.log('\n\x1b[32m%s\x1b[0m', '>> SEED VERİ DOĞRULAMASI VE KRİPTOGRAFİK İMZA KONTROLÜ BAŞARIYLA TAMAMLANDI! <<\n');
  return data;
}

if (require.main === module) {
  runSeed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('\x1b[31mSeed çalıştırma hatası:\x1b[0m', err.message);
      process.exit(1);
    });
}

// GERÇEK HOST DAVETLİ VERİSETİ (GÜNCEL TAKİPÇİ SAYILARIYLA - YİĞİT ALİ ÇOLAKOĞLU 1. SIRADA)
let hostDefaultGuests = [];
try {
  hostDefaultGuests = require('./host-default-guests.json');
} catch {
  hostDefaultGuests = [
    {
      id: 'go-disney-yigit-ali',
      guestId: 'gst-vip-yigit-ali',
      firstName: 'Yiğit Ali',
      lastName: 'Çolakoğlu',
      email: 'yigitalicolakoglu22@gmail.com',
      maskedEmail: 'yigitalicolakoglu22@gmail.com',
      maskedPhone: '+90532*****22',
      company: 'Disney Studios Türkiye / Özel Konuk',
      title: 'VIP Davetli',
      category: 'PR',
      hostCustomTags: ['VIP', 'SPECIAL_GUEST'],
      hostLoyaltyScore: 100.0,
      instagram: { handle: '@yigitalicolakoglu', followersText: '1.5M Takipçi', count: 1500000 },
      youtube: { handle: '@yigitalicolakoglu', followersText: '500K Abone', count: 500000 },
      totalInvitedByHost: 5,
      totalAttendedForHost: 5,
      totalPostsForHost: 5,
      prConversionRate: 100.0,
      conversionTier: 'HIGH_IMPACT_CREATOR',
      hostNotes: 'Disney Studios Türkiye Özel Konuğu & VIP Gala Katılımcısı.',
      invitationState: 'IDLE',
      plusOneAllowed: 1,
    },
    {
      id: 'go-disney-danla',
      guestId: 'gst-06-infl-danla',
      firstName: 'Danla',
      lastName: 'Bilic',
      company: 'Dijital İletişim',
      title: 'İçerik Üreticisi',
      category: 'PR',
      hostLoyaltyScore: 96.0,
      instagram: { handle: '@danlabilic', followersText: '6.1M Takipçi', count: 6100000 },
      youtube: { handle: '@danlabilic', followersText: '1.4M Abone', count: 1400000 },
      totalInvitedByHost: 5,
      totalAttendedForHost: 5,
      totalPostsForHost: 5,
      prConversionRate: 100.0,
      conversionTier: 'HIGH_IMPACT_CREATOR',
      hostNotes: 'Disney animasyonlarını ve galalarını düzenli paylaşan A+ Influencer.',
      invitationState: 'INVITED',
      plusOneAllowed: 1,
    },
    {
      id: 'go-disney-baris',
      guestId: 'gst-07-infl-baris',
      firstName: 'Barış',
      lastName: 'Özcan',
      company: 'Görsel Anlatı Ltd.',
      title: 'Kültür & Bilim İçerik Üreticisi',
      category: 'PR',
      hostLoyaltyScore: 98.0,
      instagram: { handle: '@barisozcan', followersText: '1.2M Takipçi', count: 1200000 },
      youtube: { handle: '@barisozcan', followersText: '6.5M Abone', count: 6500000 },
      totalInvitedByHost: 4,
      totalAttendedForHost: 4,
      totalPostsForHost: 4,
      prConversionRate: 100.0,
      conversionTier: 'HIGH_IMPACT_CREATOR',
      hostNotes: 'Sinema, animasyon ve derinlemesine inceleme videoları çok yüksek organik etkileşim getiriyor.',
      invitationState: 'INVITED',
      plusOneAllowed: 1,
    },
    {
      id: 'go-disney-kivanc',
      guestId: 'gst-02-vip-kivanc',
      firstName: 'Kıvanç',
      lastName: 'Tatlıtuğ',
      company: 'Ay Yapım',
      title: 'Başrol Oyuncusu',
      category: 'PR',
      hostLoyaltyScore: 90.0,
      instagram: { handle: '@kivanctatlitug', followersText: '4.6M Takipçi', count: 4600000 },
      youtube: null,
      totalInvitedByHost: 4,
      totalAttendedForHost: 4,
      totalPostsForHost: 1,
      prConversionRate: 25.0,
      conversionTier: 'LOW_PR_CONVERSION',
      hostNotes: 'Son 4 Disney galasına katıldı fakat yalnızca 1 hikaye paylaştı. Düşük PR dönüşümü.',
      invitationState: 'IDLE',
      plusOneAllowed: 1,
    },
  ];
}

module.exports = {
  generateSeedData,
  encryptAes256Gcm,
  decryptAes256Gcm,
  normalizeEmail,
  normalizePhone,
  generateBlindIndex,
  hashPasswordSync,
  runSeed,
  hostDefaultGuests,
};
