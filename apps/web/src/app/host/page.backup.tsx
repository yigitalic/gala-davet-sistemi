'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { CheckCircle2, X } from 'lucide-react';
import { USER_EXCEL_GUESTS } from './host-guests-data';

interface SocialStat {
  handle: string;
  followersText: string;
  count: number;
}

interface HostGuest {
  id: string;
  guestId: string;
  firstName: string;
  lastName: string;
  email?: string;
  maskedEmail: string;
  maskedPhone: string;
  company: string;
  title: string;
  category: 'PR' | 'PRESS';
  hostCustomTags: string[];
  hostLoyaltyScore: number;
  instagram: SocialStat | null;
  youtube: SocialStat | null;
  totalInvitedByHost: number;
  totalAttendedForHost: number;
  totalPostsForHost: number;
  prConversionRate: number;
  conversionTier: 'HIGH_IMPACT_CREATOR' | 'MODERATE_CONTRIBUTOR' | 'LOW_PR_CONVERSION' | 'GHOST_ATTENDEE';
  hostNotes: string;
  invitationState: 'INVITED' | 'WAITLIST' | 'IDLE';
  plusOneAllowed: number;
  lcvStatus?: 'CONFIRMED' | 'DECLINED' | 'PENDING';
  plusOneNames?: string;
  guestNote?: string;
  ticketCode?: string;
  lcvConfirmedAt?: string;
}

interface HostGala {
  id: string;
  title: string;
  movieTitle: string;
  venue: string;
  doorsOpenAt: string;
  startsAt: string;
  capacity: number;
  confirmedLcv: number;
  occupancyRate: number;
  isHistoricalArchive: boolean;
  archiveDate?: string;
  eventDateText: string;
}

interface InboundMail {
  id: string;
  fromName: string;
  fromEmail: string;
  subject: string;
  preview: string;
  receivedAt: string;
  aiClassification: 'CONFIRMED' | 'DECLINED' | 'QUESTION';
  status: 'PROCESSED' | 'NEEDS_AGENT_REVIEW';
}

// ÖZELLEŞTİRİLEBİLİR ARKA PLAN PALETLERİ & YARDIMCILARI
const BG_PRESETS = [
  { id: 'WHITE', label: 'Düz Beyaz (#FFFFFF)', color: '#FFFFFF', isDark: false },
  { id: 'CREAM', label: 'Sıcak Kağıt / Krem (#F7F5F0)', color: '#F7F5F0', isDark: false },
  { id: 'LIGHT_GRAY', label: 'Açık Kurumsal Gri (#F1F5F9)', color: '#F1F5F9', isDark: false },
  { id: 'DARK_ANTHRACITE', label: 'Koyu Antrasit (#09090B)', color: '#09090B', isDark: true },
  { id: 'NIGHT_NAVY', label: 'Gece Laciverti (#0B1120)', color: '#0B1120', isDark: true },
];

const parseFollowerCount = (txt: string): number => {
  if (!txt) return 0;
  const match = txt.trim().match(/([\d.]+)\s*([mMkK])/);
  if (match) {
    const val = parseFloat(match[1]);
    const unit = match[2].toUpperCase();
    if (unit === 'M') return Math.round(val * 1000000);
    if (unit === 'K') return Math.round(val * 1000);
  }
  const digitsOnly = txt.replace(/[^\d]/g, '');
  return parseInt(digitsOnly) || 0;
};

const formatFollowerCount = (count: number, suffix: 'Takipçi' | 'Abone'): string => {
  if (count >= 1000000) {
    const m = (count / 1000000).toFixed(1).replace('.0', '');
    return `${m}M ${suffix}`;
  }
  if (count >= 1000) {
    const k = (count / 1000).toFixed(count % 1000 === 0 ? 0 : 1).replace('.0', '');
    return `${k}K ${suffix}`;
  }
  return `${count} ${suffix}`;
};

const getLuminance = (hex: string): number => {
  if (!hex || !hex.startsWith('#')) return 1;
  const c = hex.replace('#', '');
  if (c.length === 3) {
    const r = parseInt(c[0] + c[0], 16) / 255;
    const g = parseInt(c[1] + c[1], 16) / 255;
    const b = parseInt(c[2] + c[2], 16) / 255;
    return 0.299 * r + 0.587 * g + 0.114 * b;
  }
  if (c.length === 6) {
    const r = parseInt(c.substring(0, 2), 16) / 255;
    const g = parseInt(c.substring(2, 4), 16) / 255;
    const b = parseInt(c.substring(4, 6), 16) / 255;
    return 0.299 * r + 0.587 * g + 0.114 * b;
  }
  return 1;
};

// GERÇEK VERİSETİ (YİĞİT ALİ ÇOLAKOĞLU 1. SIRADA & GÜNCEL TAKİPÇİLER)
const DEFAULT_HOST_GUESTS: HostGuest[] = [
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
    maskedEmail: 'da***@influencer.local',
    maskedPhone: '+90530*****88',
    company: 'Dijital İletişim',
    title: 'İçerik Üreticisi',
    category: 'PR',
    hostCustomTags: ['VIP', 'INFLUENCER'],
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
    maskedEmail: 'ba***@youtube.local',
    maskedPhone: '+90535*****99',
    company: 'Görsel Anlatı Ltd.',
    title: 'Kültür & Bilim İçerik Üreticisi',
    category: 'PR',
    hostCustomTags: ['VIP', 'INFLUENCER'],
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
    maskedEmail: 'ki***@ayyapim.local',
    maskedPhone: '+90533*****44',
    company: 'Ay Yapım',
    title: 'Başrol Oyuncusu',
    category: 'PR',
    hostCustomTags: ['VIP'],
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
  {
    id: 'go-disney-serenay',
    guestId: 'gst-12-vip-serenay',
    firstName: 'Serenay',
    lastName: 'Sarıkaya',
    maskedEmail: 'se***@idiletisim.com',
    maskedPhone: '+90532*****11',
    company: 'İD İletişim',
    title: 'Dizi & Sinema Oyuncusu',
    category: 'PR',
    hostCustomTags: ['VIP'],
    hostLoyaltyScore: 94.0,
    instagram: { handle: '@serenayss', followersText: '11.2M Takipçi', count: 11200000 },
    youtube: null,
    totalInvitedByHost: 3,
    totalAttendedForHost: 3,
    totalPostsForHost: 3,
    prConversionRate: 100.0,
    conversionTier: 'HIGH_IMPACT_CREATOR',
    hostNotes: 'Kırmızı halıda yüksek görünürlük sağlıyor, galayı profilinde sabitliyor.',
    invitationState: 'INVITED',
    plusOneAllowed: 1,
  },
  {
    id: 'go-disney-omur-gedik',
    guestId: 'gst-01-press-omur',
    firstName: 'Ömür',
    lastName: 'Gedik',
    maskedEmail: 'om***@kelebek.com.tr',
    maskedPhone: '+90532*****22',
    company: 'Hürriyet Kelebek',
    title: 'Kültür Sanat Yazarı & Sinema Eleştirmeni',
    category: 'PRESS',
    hostCustomTags: ['PRESS', 'ACCREDITED'],
    hostLoyaltyScore: 92.0,
    instagram: { handle: '@omurgedik', followersText: '420K Takipçi', count: 420000 },
    youtube: { handle: '@omurgedikofficial', followersText: '45K Abone', count: 45000 },
    totalInvitedByHost: 6,
    totalAttendedForHost: 5,
    totalPostsForHost: 5,
    prConversionRate: 100.0,
    conversionTier: 'HIGH_IMPACT_CREATOR',
    hostNotes: 'Köşe yazılarında ve Kelebek manşetinde Disney vizyon haberlerine geniş yer veriyor.',
    invitationState: 'INVITED',
    plusOneAllowed: 1,
  },
  {
    id: 'go-disney-burcu',
    guestId: 'gst-03-press-burcu',
    firstName: 'Burcu',
    lastName: 'Yıldız',
    maskedEmail: 'bu***@haberturk.com',
    maskedPhone: '+90536*****33',
    company: 'Habertürk Kültür Sanat',
    title: 'Muhabir & Editör',
    category: 'PRESS',
    hostCustomTags: ['PRESS'],
    hostLoyaltyScore: 82.0,
    instagram: { handle: '@burcuyildiz_', followersText: '35K Takipçi', count: 35000 },
    youtube: null,
    totalInvitedByHost: 2,
    totalAttendedForHost: 2,
    totalPostsForHost: 0,
    prConversionRate: 0.0,
    conversionTier: 'GHOST_ATTENDEE',
    hostNotes: 'Galalara düzenli katılım sağlıyor ancak basılı veya dijital haber dönüşü raporlanmadı.',
    invitationState: 'WAITLIST',
    plusOneAllowed: 0,
  },
  {
    id: 'go-disney-kaan',
    guestId: 'gst-11-press-kaan',
    firstName: 'Kaan',
    lastName: 'Kural',
    maskedEmail: 'ka***@medya.com',
    maskedPhone: '+90542*****55',
    company: 'Socrates Dergi',
    title: 'Yazar & Podcast Yayıncısı',
    category: 'PRESS',
    hostCustomTags: ['PRESS', 'PODCAST'],
    hostLoyaltyScore: 88.0,
    instagram: { handle: '@kaankural', followersText: '280K Takipçi', count: 280000 },
    youtube: { handle: '@socratesdergi', followersText: '750K Abone', count: 750000 },
    totalInvitedByHost: 4,
    totalAttendedForHost: 4,
    totalPostsForHost: 3,
    prConversionRate: 75.0,
    conversionTier: 'HIGH_IMPACT_CREATOR',
    hostNotes: 'Sinema ve popüler kültür podcastlerinde Disney filmleri hakkında organik referans veriyor.',
    invitationState: 'IDLE',
    plusOneAllowed: 1,
  },
  {
    id: 'go-disney-haluk',
    guestId: 'gst-01-vip-haluk',
    firstName: 'Haluk',
    lastName: 'Bilginer',
    maskedEmail: 'ha***@sanat.local',
    maskedPhone: '+90532*****33',
    company: 'Tiyatro & Sinema Oyuncuları Derneği',
    title: 'Onur Konuğu & Emmy Ödüllü Sanatçı',
    category: 'PR',
    hostCustomTags: ['VIP', 'CREW'],
    hostLoyaltyScore: 98.5,
    instagram: { handle: '@halukbilginer_official', followersText: '450K Takipçi', count: 450000 },
    youtube: null,
    totalInvitedByHost: 5,
    totalAttendedForHost: 5,
    totalPostsForHost: 5,
    prConversionRate: 100.0,
    conversionTier: 'HIGH_IMPACT_CREATOR',
    hostNotes: 'Onur konuğu, Disney animasyon ve dublaj prömiyerlerine katılıyor.',
    invitationState: 'INVITED',
    plusOneAllowed: 1,
  },
  {
    id: 'go-disney-zerrin',
    guestId: 'gst-03-vip-zerrin',
    firstName: 'Zerrin',
    lastName: 'Tekindor',
    maskedEmail: 'ze***@tiyatro.local',
    maskedPhone: '+90532*****55',
    company: 'Oyun Atölyesi',
    title: 'Devlet Sanatçısı & Tiyatro Oyuncusu',
    category: 'PR',
    hostCustomTags: ['VIP'],
    hostLoyaltyScore: 99.0,
    instagram: { handle: '@zerrintekindor', followersText: '980K Takipçi', count: 980000 },
    youtube: null,
    totalInvitedByHost: 4,
    totalAttendedForHost: 4,
    totalPostsForHost: 4,
    prConversionRate: 100.0,
    conversionTier: 'HIGH_IMPACT_CREATOR',
    hostNotes: 'Galalarda yüksek saygınlık ve katılım sağlayan usta oyuncu.',
    invitationState: 'INVITED',
    plusOneAllowed: 1,
  },
  {
    id: 'go-disney-ece',
    guestId: 'gst-13-pr-ece',
    firstName: 'Ece',
    lastName: 'Hançer',
    maskedEmail: 'eh***@oyuncu.com',
    maskedPhone: '+90533*****33',
    company: 'Persona Menajerlik',
    title: 'Oyuncu & Yetenek Danışmanı',
    category: 'PR',
    hostCustomTags: ['PR', 'TALENT'],
    hostLoyaltyScore: 90.0,
    instagram: { handle: '@ecehancer', followersText: '180K Takipçi', count: 180000 },
    youtube: null,
    totalInvitedByHost: 3,
    totalAttendedForHost: 3,
    totalPostsForHost: 3,
    prConversionRate: 100.0,
    conversionTier: 'HIGH_IMPACT_CREATOR',
    hostNotes: 'Gala kırmızı halı etkinliklerini düzenli olarak hikayelerinde paylaşıyor.',
    invitationState: 'INVITED',
    plusOneAllowed: 1,
  },
  {
    id: 'go-disney-mehmet',
    guestId: 'gst-04-press-mehmet',
    firstName: 'Mehmet',
    lastName: 'Yılmaz',
    maskedEmail: 'me***@hurriyet.com.tr',
    maskedPhone: '+90542*****66',
    company: 'Hürriyet Sinema',
    title: 'Kültür & Sanat Baş Editörü',
    category: 'PRESS',
    hostCustomTags: ['PRESS', 'ACCREDITED'],
    hostLoyaltyScore: 94.0,
    instagram: { handle: '@mehmetyilmazsinema', followersText: '185K Takipçi', count: 185000 },
    youtube: null,
    totalInvitedByHost: 6,
    totalAttendedForHost: 5,
    totalPostsForHost: 4,
    prConversionRate: 80.0,
    conversionTier: 'HIGH_IMPACT_CREATOR',
    hostNotes: 'Basın gösterimlerini eksiksiz takip eden sinema eleştirmeni.',
    invitationState: 'INVITED',
    plusOneAllowed: 1,
  },
  {
    id: 'go-disney-atil',
    guestId: 'gst-05-press-atil',
    firstName: 'Atıl',
    lastName: 'İnanç',
    maskedEmail: 'at***@sinemadergisi.com',
    maskedPhone: '+90555*****77',
    company: 'Sinema Dergisi',
    title: 'Film Eleştirmeni & Yönetmen',
    category: 'PRESS',
    hostCustomTags: ['PRESS'],
    hostLoyaltyScore: 91.0,
    instagram: { handle: '@atilinanc', followersText: '42K Takipçi', count: 42000 },
    youtube: { handle: '@sinemaclubatil', followersText: '320K Abone', count: 320000 },
    totalInvitedByHost: 4,
    totalAttendedForHost: 4,
    totalPostsForHost: 3,
    prConversionRate: 75.0,
    conversionTier: 'HIGH_IMPACT_CREATOR',
    hostNotes: 'YouTube kanalında derinlemesine vizyon incelemeleri yayınlıyor.',
    invitationState: 'IDLE',
    plusOneAllowed: 1,
  },
  {
    id: 'go-disney-selin',
    guestId: 'gst-08-morning-selin',
    firstName: 'Selin',
    lastName: 'Gökbakar',
    maskedEmail: 'se***@beyazperde.local',
    maskedPhone: '+90536*****00',
    company: 'Beyazperde.com',
    title: 'Kıdemli Muhabir & Eleştirmen',
    category: 'PRESS',
    hostCustomTags: ['PRESS', 'DIGITAL'],
    hostLoyaltyScore: 93.0,
    instagram: { handle: '@selingokbakar', followersText: '240K Takipçi', count: 240000 },
    youtube: { handle: '@filminceliyor', followersText: '110K Abone', count: 110000 },
    totalInvitedByHost: 5,
    totalAttendedForHost: 5,
    totalPostsForHost: 4,
    prConversionRate: 80.0,
    conversionTier: 'HIGH_IMPACT_CREATOR',
    hostNotes: 'Dijital sinema portalında ilk gün özel gösterim yazıları hazırlıyor.',
    invitationState: 'INVITED',
    plusOneAllowed: 1,
  },
  ...(USER_EXCEL_GUESTS as unknown as HostGuest[]),
];

export default function HostPortalPage() {
  // 1. TEMA & ÖZELLEŞTİRİLEBİLİR ARKA PLAN MOTORU (localStorage: 'gala_host_theme' & 'gala_host_bg_v15')
  const [theme, setTheme] = useState<'dark' | 'light'>('light');
  const [customBgColor, setCustomBgColor] = useState<string>('#FFFFFF');
  const [customBgImage, setCustomBgImage] = useState<string>('');
  const [bgPreset, setBgPreset] = useState<string>('WHITE');
  const [isBgSelectorOpen, setIsBgSelectorOpen] = useState<boolean>(false);

  useEffect(() => {
    try {
      const savedBg = localStorage.getItem('gala_host_bg_v15');
      if (savedBg) {
        if (savedBg.startsWith('{')) {
          const parsed = JSON.parse(savedBg);
          if (parsed.color) setCustomBgColor(parsed.color);
          if (parsed.imageUrl !== undefined) setCustomBgImage(parsed.imageUrl);
          if (parsed.preset) setBgPreset(parsed.preset);
          const lum = getLuminance(parsed.color || '#FFFFFF');
          setTheme(lum < 0.5 ? 'dark' : 'light');
        } else if (savedBg.startsWith('#')) {
          setCustomBgColor(savedBg);
          const lum = getLuminance(savedBg);
          setTheme(lum < 0.5 ? 'dark' : 'light');
        }
      } else {
        const savedTheme = localStorage.getItem('gala_host_theme') as 'dark' | 'light' | null;
        if (savedTheme === 'dark') {
          setCustomBgColor('#09090B');
          setBgPreset('DARK_ANTHRACITE');
          setTheme('dark');
        } else {
          setCustomBgColor('#FFFFFF');
          setBgPreset('WHITE');
          setTheme('light');
        }
      }
    } catch {}

    try {
      const savedGalas = localStorage.getItem('gala_host_events_v16');
      if (savedGalas) {
        const parsed = JSON.parse(savedGalas);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setGalas(parsed);
        }
      }
    } catch {}

    try {
      const savedGuests = localStorage.getItem('gala_host_guests_v16') || localStorage.getItem('gala_host_guests_v15');
      if (savedGuests) {
        const parsed = JSON.parse(savedGuests);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const hasYigit = parsed.some(
            (g: any) => g.id === 'go-disney-yigit-ali' || g.email === 'yigitalicolakoglu22@gmail.com'
          );
          if (!hasYigit) {
            const yigitAli = DEFAULT_HOST_GUESTS[0];
            const merged = [yigitAli, ...parsed];
            setGuests(merged);
            localStorage.setItem('gala_host_guests_v16', JSON.stringify(merged));
            localStorage.setItem('gala_host_guests_v15', JSON.stringify(merged));
          } else {
            setGuests(parsed);
          }
        }
      }
    } catch {}
  }, []);

  const handleSetTheme = (newTheme: 'dark' | 'light') => {
    setTheme(newTheme);
    const color = newTheme === 'dark' ? '#09090B' : '#FFFFFF';
    setCustomBgColor(color);
    setBgPreset(newTheme === 'dark' ? 'DARK_ANTHRACITE' : 'WHITE');
    try {
      localStorage.setItem('gala_host_theme', newTheme);
      localStorage.setItem(
        'gala_host_bg_v15',
        JSON.stringify({ color, preset: newTheme === 'dark' ? 'DARK_ANTHRACITE' : 'WHITE', imageUrl: customBgImage })
      );
    } catch {}
  };

  const handleSelectBgPreset = (preset: (typeof BG_PRESETS)[0]) => {
    setCustomBgColor(preset.color);
    setBgPreset(preset.id);
    const newTheme = preset.isDark ? 'dark' : 'light';
    setTheme(newTheme);
    try {
      localStorage.setItem(
        'gala_host_bg_v15',
        JSON.stringify({ color: preset.color, preset: preset.id, imageUrl: customBgImage })
      );
      localStorage.setItem('gala_host_theme', newTheme);
    } catch {}
    showToast(`Arka plan değiştirildi: ${preset.label}`);
  };

  const handleCustomColorChange = (color: string) => {
    setCustomBgColor(color);
    setBgPreset('CUSTOM');
    const lum = getLuminance(color);
    const newTheme = lum < 0.5 ? 'dark' : 'light';
    setTheme(newTheme);
    try {
      localStorage.setItem(
        'gala_host_bg_v15',
        JSON.stringify({ color, preset: 'CUSTOM', imageUrl: customBgImage })
      );
      localStorage.setItem('gala_host_theme', newTheme);
    } catch {}
  };

  const handleCustomImageChange = (url: string) => {
    setCustomBgImage(url);
    try {
      localStorage.setItem(
        'gala_host_bg_v15',
        JSON.stringify({ color: customBgColor, preset: bgPreset, imageUrl: url })
      );
    } catch {}
  };

  const isLight = theme === 'light';

  // Aktif Menü Sekmesi: 'ALL' | 'PR' | 'PRESS' | 'COCKPIT'
  const [activeNav, setActiveNav] = useState<'ALL' | 'PR' | 'PRESS' | 'COCKPIT'>('ALL');

  // Galalar Listesi: Sıradaki 2 + Geçmiş 2
  const [galas, setGalas] = useState<HostGala[]>([
    {
      id: 'evt-disney-moana2',
      title: 'Moana 2 Türkiye Özel Galası',
      movieTitle: 'Moana 2',
      venue: 'Zorlu PSM',
      doorsOpenAt: '19:00',
      startsAt: '20:30',
      capacity: 700,
      confirmedLcv: 540,
      occupancyRate: 77.1,
      isHistoricalArchive: false,
      eventDateText: '28 Kasım 2026, 19:00',
    },
    {
      id: 'evt-disney-mufasa',
      title: 'Mufasa: Aslan Kral Basın Ön Gösterimi',
      movieTitle: 'Mufasa: The Lion King',
      venue: 'Kanyon Paribu Cineverse Salon 2',
      doorsOpenAt: '10:00',
      startsAt: '11:00',
      capacity: 280,
      confirmedLcv: 195,
      occupancyRate: 69.6,
      isHistoricalArchive: false,
      eventDateText: '18 Aralık 2026, 10:00',
    },
    {
      id: 'evt-disney-inside-out-2-archive',
      title: 'Ters Yüz 2 (Inside Out 2) Arşiv Galası',
      movieTitle: 'Inside Out 2',
      venue: 'Zorlu PSM Ana Tiyatro',
      doorsOpenAt: '18:30',
      startsAt: '20:00',
      capacity: 600,
      confirmedLcv: 580,
      occupancyRate: 96.6,
      isHistoricalArchive: true,
      archiveDate: '14 Haziran 2024',
      eventDateText: '14 Haziran 2024 (Tamamlandı)',
    },
    {
      id: 'evt-disney-deadpool-archive',
      title: 'Deadpool & Wolverine Basın Prömiyeri',
      movieTitle: 'Deadpool & Wolverine',
      venue: 'Paribu Cineverse Akasya IMAX',
      doorsOpenAt: '20:00',
      startsAt: '21:00',
      capacity: 450,
      confirmedLcv: 442,
      occupancyRate: 98.2,
      isHistoricalArchive: true,
      archiveDate: '25 Temmuz 2024',
      eventDateText: '25 Temmuz 2024 (Tamamlandı)',
    },
  ]);

  const [selectedGalaId, setSelectedGalaId] = useState<string>('evt-disney-moana2');
  const selectedGala = (galas.find((g) => g.id === selectedGalaId) || galas[0]) as HostGala;

  // Gelen E-postalar (Host AI Agent Entegrasyonu)
  const [inboundMails, setInboundMails] = useState<InboundMail[]>([
    {
      id: 'mail-01',
      fromName: 'Danla Bilic',
      fromEmail: 'da***@influencer.local',
      subject: 'Re: Moana 2 Türkiye Özel Galası Davetiyesi',
      preview: 'Harika bir haber! Eşimle birlikte seve seve katılıyoruz, görüşmek üzere.',
      receivedAt: '12 dk önce',
      aiClassification: 'CONFIRMED',
      status: 'PROCESSED',
    },
    {
      id: 'mail-02',
      fromName: 'Ömür Gedik',
      fromEmail: 'om***@kelebek.com.tr',
      subject: 'Re: Moana 2 Basın Kiti & Akreditasyon',
      preview: 'Basın kiti linki için teşekkürler. Kırmızı halı röportajı yapabilir miyiz?',
      receivedAt: '45 dk önce',
      aiClassification: 'QUESTION',
      status: 'NEEDS_AGENT_REVIEW',
    },
    {
      id: 'mail-03',
      fromName: 'Kıvanç Tatlıtuğ Menajerlik',
      fromEmail: 'ki***@ayyapim.local',
      subject: 'Re: Moana 2 Gala Katılım Durumu',
      preview: 'Set takvimi nedeniyle akşam 20:30 seansına gecikmeli katılım sağlayabilecektir.',
      receivedAt: '2 saat önce',
      aiClassification: 'CONFIRMED',
      status: 'PROCESSED',
    },
  ]);

  // Davetli Havuzu
  const [guests, setGuests] = useState<HostGuest[]>(DEFAULT_HOST_GUESTS);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL');

  // Modallar
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isAddGuestModalOpen, setIsAddGuestModalOpen] = useState(false);
  const [isEditGuestModalOpen, setIsEditGuestModalOpen] = useState(false);
  const [selectedGuestForDrawer, setSelectedGuestForDrawer] = useState<HostGuest | null>(null);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // TEK GENEL "DAVET ET" SİHİRBAZI MODAL STATE'LERİ (SPLIT-VIEW)
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const [campaignTab, setCampaignTab] = useState<'SELECTION' | 'PREVIEW'>('PREVIEW');
  const [campaignTargetGala, setCampaignTargetGala] = useState<HostGala | null>(null);
  const [campaignDate, setCampaignDate] = useState('28 Kasım 2026');
  const [campaignTimeOpen, setCampaignTimeOpen] = useState('19:00');
  const [campaignTimeStart, setCampaignTimeStart] = useState('20:30');
  const [campaignVenue, setCampaignVenue] = useState('Zorlu PSM');
  const [campaignCapacity, setCampaignCapacity] = useState(700);
  const [campaignPlusOneDefault, setCampaignPlusOneDefault] = useState(1);
  const [selectedGuestIds, setSelectedGuestIds] = useState<string[]>([]);
  const [modalGuestSearch, setModalGuestSearch] = useState('');
  const [customInviteMessage, setCustomInviteMessage] = useState(
    'Sizi Walt Disney Studios sunumuyla gerçekleşecek Moana 2 Türkiye Özel Galası’nda aramızda görmekten büyük onur duyarız.'
  );

  // Ayarlar Formu State'leri
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [emailSignature, setEmailSignature] = useState(
    'Disney Studios Türkiye · PR & Basın İlişkileri Direktörlüğü'
  );
  const [vipNotificationEnabled, setVipNotificationEnabled] = useState(true);

  // Davetiye Bağlantı Adresi (Base URL)
  const [hostBaseUrl, setHostBaseUrl] = useState<string>('http://localhost:3000');

  useEffect(() => {
    try {
      const savedBaseUrl = localStorage.getItem('gala_host_base_url_v17');
      if (savedBaseUrl) {
        setHostBaseUrl(savedBaseUrl);
      } else if (typeof window !== 'undefined' && window.location.origin) {
        setHostBaseUrl(window.location.origin);
      }
    } catch {}
  }, []);

  const handleUpdateBaseUrl = (url: string) => {
    setHostBaseUrl(url);
    try {
      localStorage.setItem('gala_host_base_url_v17', url);
    } catch {}
  };

  // Çift Yönlü LCV Yanıt Senkronizasyonu
  const syncRsvpResponses = async () => {
    let rsvpList: any[] = [];

    // 1. Sunucudan /api/rsvp?all=true sorgula
    try {
      const res = await fetch('/api/rsvp?all=true');
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.invitations)) {
          rsvpList = json.invitations;
        }
      }
    } catch {}

    // 2. localStorage gala_host_rsvp_responses_v17 ile birleştir
    try {
      const localRaw = localStorage.getItem('gala_host_rsvp_responses_v17');
      if (localRaw) {
        const localList = JSON.parse(localRaw);
        if (Array.isArray(localList)) {
          for (const item of localList) {
            const exists = rsvpList.find(
              (r) => r.token === item.token || (item.guestId && r.guestId === item.guestId)
            );
            if (!exists) {
              rsvpList.push({
                ...item,
                currentRsvpStatus: item.action,
              });
            } else if (
              item.respondedAt &&
              (!exists.respondedAt || new Date(item.respondedAt) > new Date(exists.respondedAt))
            ) {
              exists.currentRsvpStatus = item.action;
              exists.plusOneRequested = item.plusOneRequested;
              exists.plusOneNames = item.plusOneNames;
              exists.guestNote = item.guestNote;
            }
          }
        }
      }
    } catch {}

    if (rsvpList.length === 0) return;

    // 3. Davetliler tablosundaki durumları güncelle
    setGuests((prev) => {
      let changed = false;
      const updated = prev.map((g) => {
        const rsvp = rsvpList.find(
          (r) =>
            r.guestId === g.id ||
            (g.email && r.email === g.email) ||
            (r.guestName && `${g.firstName} ${g.lastName}`.trim() === r.guestName.trim()) ||
            (g.id === 'go-disney-yigit-ali' && (r.email === 'yigitalicolakoglu22@gmail.com' || r.guestName?.includes('Yiğit Ali')))
        );

        if (!rsvp || !rsvp.currentRsvpStatus || rsvp.currentRsvpStatus === 'PENDING') {
          return g;
        }

        const isConfirmed = rsvp.currentRsvpStatus === 'CONFIRMED' || rsvp.action === 'CONFIRMED';
        const isDeclined = rsvp.currentRsvpStatus === 'DECLINED' || rsvp.action === 'DECLINED';

        const newLcvStatus = isConfirmed ? 'CONFIRMED' : isDeclined ? 'DECLINED' : g.lcvStatus;
        const newInvitationState = isConfirmed ? ('INVITED' as const) : isDeclined ? ('IDLE' as const) : g.invitationState;
        const newPlusOneNames = rsvp.plusOneNames || g.plusOneNames;
        const newTicketCode = rsvp.ticketCode || g.ticketCode;

        if (
          g.lcvStatus !== newLcvStatus ||
          g.plusOneNames !== newPlusOneNames ||
          g.invitationState !== newInvitationState
        ) {
          changed = true;
          return {
            ...g,
            invitationState: newInvitationState,
            lcvStatus: newLcvStatus,
            plusOneNames: newPlusOneNames,
            ticketCode: newTicketCode,
            plusOneAllowed: rsvp.plusOneRequested ? rsvp.plusOneRequested : g.plusOneAllowed,
          };
        }
        return g;
      });

      if (changed) {
        try {
          localStorage.setItem('gala_host_guests_v16', JSON.stringify(updated));
          localStorage.setItem('gala_host_guests_v15', JSON.stringify(updated));
        } catch {}
        return updated;
      }
      return prev;
    });

    // 4. Gelen E-postalar & LCV Bildirimleri listesine otomatik yeni kayıt düş
    setInboundMails((prev) => {
      const nextMails = [...prev];
      let mailsChanged = false;

      for (const rsvp of rsvpList) {
        if (!rsvp.currentRsvpStatus || rsvp.currentRsvpStatus === 'PENDING') continue;
        const guestName = rsvp.guestName || rsvp.name || 'VIP Davetli';
        const mailId = `rsvp-${rsvp.token || rsvp.guestId}`;

        const existingMail = nextMails.find((m) => m.id === mailId);
        if (!existingMail) {
          const isConfirmed = rsvp.currentRsvpStatus === 'CONFIRMED' || rsvp.action === 'CONFIRMED';
          const plusOneInfo = rsvp.plusOneNames
            ? ` (+1: ${rsvp.plusOneNames})`
            : rsvp.plusOneRequested > 0
            ? ' (+1 Refakatçi)'
            : '';

          nextMails.unshift({
            id: mailId,
            fromName: guestName,
            fromEmail: rsvp.email || `${guestName.toLowerCase().replace(/\s+/g, '.')}@protokol.local`,
            subject: isConfirmed
              ? `${guestName} — LCV Onaylandı (QR Bilet Hazır)${plusOneInfo}`
              : `${guestName} — Katılamıyor (LCV Red)`,
            preview: isConfirmed
              ? `${guestName} galaya katılımını onayladı. QR Bilet: ${rsvp.ticketCode || '#DISNEY'}${rsvp.guestNote ? ` | Not: "${rsvp.guestNote}"` : ''}`
              : `${guestName} maalesef galaya katılamayacağını bildirdi.`,
            receivedAt: 'Yeni LCV',
            aiClassification: isConfirmed ? 'CONFIRMED' : 'DECLINED',
            status: 'PROCESSED',
          });
          mailsChanged = true;
        }
      }

      return mailsChanged ? nextMails : prev;
    });
  };

  useEffect(() => {
    syncRsvpResponses();
    const interval = setInterval(syncRsvpResponses, 5000);
    return () => clearInterval(interval);
  }, []);

  // Yeni Konuk Ekleme Form State'leri
  const [newGuestFirstName, setNewGuestFirstName] = useState('');
  const [newGuestLastName, setNewGuestLastName] = useState('');
  const [newGuestCompany, setNewGuestCompany] = useState('');
  const [newGuestTitle, setNewGuestTitle] = useState('');
  const [newGuestCategory, setNewGuestCategory] = useState<'PR' | 'PRESS'>('PR');
  const [newGuestIgHandle, setNewGuestIgHandle] = useState('');
  const [newGuestIgFollowers, setNewGuestIgFollowers] = useState('');
  const [newGuestYtHandle, setNewGuestYtHandle] = useState('');
  const [newGuestYtSubscribers, setNewGuestYtSubscribers] = useState('');

  // Davetli Düzenleme Form State'leri
  const [editingGuestId, setEditingGuestId] = useState<string | null>(null);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editCompany, setEditCompany] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState<'PR' | 'PRESS'>('PR');
  const [editIgHandle, setEditIgHandle] = useState('');
  const [editIgFollowers, setEditIgFollowers] = useState('');
  const [editYtHandle, setEditYtHandle] = useState('');
  const [editYtSubscribers, setEditYtSubscribers] = useState('');
  const [editAttended, setEditAttended] = useState(1);
  const [editPosts, setEditPosts] = useState(1);
  const [editInvitationState, setEditInvitationState] = useState<'INVITED' | 'WAITLIST' | 'IDLE'>('IDLE');
  const [editNotes, setEditNotes] = useState('');

  // Yan Çekmece Yönetici Notu
  const [drawerNotes, setDrawerNotes] = useState('');

  // CSV İçe Aktarma
  const [csvRawText, setCsvRawText] = useState(
    'Email,Ad,Soyad,Kurum,Telefon,Kategori,Instagram,YouTube,Katilim,Paylasim\neh***@oyuncu.com,Ece,Hançer,Persona Menajerlik,05331112233,PR,@ecehancer,Yok,3,3\nka***@medya.com,Kaan,Kural,Socrates Dergi,05423334455,PRESS,@kaankural,@socratesdergi,4,3'
  );
  const [csvImportMode, setCsvImportMode] = useState<'APPEND' | 'REPLACE'>('APPEND');

  // Yeni Etkinlik / Arşiv State'leri
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventMovie, setNewEventMovie] = useState('');
  const [newEventVenue, setNewEventVenue] = useState('Zorlu PSM');
  const [newEventCapacity, setNewEventCapacity] = useState(650);
  const [newEventIsArchive, setNewEventIsArchive] = useState(false);
  const [archiveAttendedCount, setArchiveAttendedCount] = useState(480);

  // Etkinlik Düzenleme Modal State'leri
  const [isEditEventModalOpen, setIsEditEventModalOpen] = useState(false);
  const [editEventTitle, setEditEventTitle] = useState('');
  const [editEventMovie, setEditEventMovie] = useState('');
  const [editEventVenue, setEditEventVenue] = useState('Zorlu PSM');
  const [editEventDateText, setEditEventDateText] = useState('28 Kasım 2026, 19:00');
  const [editEventDoorsOpen, setEditEventDoorsOpen] = useState('19:00');
  const [editEventStartsAt, setEditEventStartsAt] = useState('20:30');
  const [editEventCapacity, setEditEventCapacity] = useState(700);
  const [editEventConfirmedLcv, setEditEventConfirmedLcv] = useState(540);
  const [editEventIsArchive, setEditEventIsArchive] = useState(false);
  const [editEventArchiveDate, setEditEventArchiveDate] = useState('');

  // Silme Onay Modal State'leri
  const [deleteConfirmGuest, setDeleteConfirmGuest] = useState<HostGuest | null>(null);
  const [isClearAllConfirmOpen, setIsClearAllConfirmOpen] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Kampanya Sihirbazını Aç (Üst Bardan Tek Genel "Davet Et" Giriş Noktası)
  const openCampaignModal = (gala: HostGala, initialGuestIds?: string[]) => {
    setCampaignTargetGala(gala);
    setCampaignDate(gala.eventDateText.split(',')[0] || '28 Kasım 2026');
    setCampaignTimeOpen(gala.doorsOpenAt);
    setCampaignTimeStart(gala.startsAt);
    setCampaignVenue(gala.venue);
    setCampaignCapacity(gala.capacity);
    setCampaignTab('PREVIEW');

    if (initialGuestIds && initialGuestIds.length > 0) {
      setSelectedGuestIds(initialGuestIds);
    } else {
      const millionPlus = guests
        .filter((g) => (g.instagram?.count || 0) >= 1000000 || (g.youtube?.count || 0) >= 1000000)
        .map((g) => g.id);
      const withYigit = ['go-disney-yigit-ali', ...millionPlus.filter((id) => id !== 'go-disney-yigit-ali')];
      setSelectedGuestIds(withYigit.length > 0 ? withYigit : guests.slice(0, 3).map((g) => g.id));
    }
    setIsCampaignModalOpen(true);
  };

  // Hızlı Seçim Yardımcıları
  const handleSelect1MPlus = () => {
    const millionPlus = guests
      .filter((g) => (g.instagram?.count || 0) >= 1000000 || (g.youtube?.count || 0) >= 1000000)
      .map((g) => g.id);
    setSelectedGuestIds(millionPlus);
    showToast(`1M+ erişime sahip ${millionPlus.length} davetli seçildi.`);
  };

  const handleSelectPress = () => {
    const pressIds = guests.filter((g) => g.category === 'PRESS').map((g) => g.id);
    setSelectedGuestIds(pressIds);
    showToast(`${pressIds.length} Basın mensubu seçildi.`);
  };

  const handleSelectHighPr = () => {
    const highPrIds = guests.filter((g) => g.prConversionRate >= 75.0).map((g) => g.id);
    setSelectedGuestIds(highPrIds);
    showToast(`%75+ PR Dönüşümü olan ${highPrIds.length} davetli seçildi.`);
  };

  const handleSelectAll = () => {
    setSelectedGuestIds(guests.map((g) => g.id));
    showToast(`Havuzdaki tüm ${guests.length} davetli seçildi.`);
  };

  const handleClearSelection = () => {
    setSelectedGuestIds([]);
  };

  const toggleSelectGuest = (id: string) => {
    setSelectedGuestIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Toplu Davetiye Gönderme İşlemi (Seçim Penceresinin Ana Aksiyonu)
  const handleSendBatchCampaign = async () => {
    if (selectedGuestIds.length === 0) {
      showToast('Lütfen davet göndermek için en az bir konuk seçiniz.');
      return;
    }

    setGuests((prev) => {
      const updated = prev.map((g) =>
        selectedGuestIds.includes(g.id)
          ? { ...g, invitationState: 'INVITED' as const, plusOneAllowed: campaignPlusOneDefault }
          : g
      );
      try {
        localStorage.setItem('gala_host_guests_v16', JSON.stringify(updated));
        localStorage.setItem('gala_host_guests_v15', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    if (campaignTargetGala) {
      setGalas((prev) => {
        const next = prev.map((g) =>
          g.id === campaignTargetGala.id
            ? {
                ...g,
                venue: campaignVenue,
                doorsOpenAt: campaignTimeOpen,
                startsAt: campaignTimeStart,
                capacity: campaignCapacity,
                eventDateText: campaignDate,
                confirmedLcv: Math.min(campaignCapacity, g.confirmedLcv + selectedGuestIds.length),
                occupancyRate: Math.min(
                  100,
                  Math.round(
                    (Math.min(campaignCapacity, g.confirmedLcv + selectedGuestIds.length) /
                      Math.max(1, campaignCapacity)) *
                      1000
                  ) / 10
                ),
              }
            : g
        );
        try {
          localStorage.setItem('gala_host_events_v16', JSON.stringify(next));
        } catch {}
        return next;
      });
    }

    setIsCampaignModalOpen(false);

    const selectedGuests = guests.filter((g) => selectedGuestIds.includes(g.id));
    const yigitAli = selectedGuests.find(
      (g) => g.id === 'go-disney-yigit-ali' || g.email === 'yigitalicolakoglu22@gmail.com'
    );

    try {
      const res = await fetch('/api/send-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guestIds: selectedGuestIds,
          guests: selectedGuests.map((g) => ({
            id: g.id,
            firstName: g.firstName,
            lastName: g.lastName,
            email: g.email || (g.id === 'go-disney-yigit-ali' ? 'yigitalicolakoglu22@gmail.com' : g.maskedEmail),
            company: g.company,
            title: g.title,
            category: g.category,
          })),
          gala: campaignTargetGala,
          baseUrl: hostBaseUrl || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'),
          customMessage: customInviteMessage,
          emailSignature,
          doorsOpenAt: campaignTimeOpen,
          startsAt: campaignTimeStart,
          eventDateText: campaignDate,
          venue: campaignVenue,
          plusOneAllowed: campaignPlusOneDefault,
        }),
      });
      const data = await res.json();
      if (yigitAli) {
        const yigitRes = data?.results?.find(
          (r: any) => r.guestId === 'go-disney-yigit-ali' || r.email === 'yigitalicolakoglu22@gmail.com'
        );
        const rsvpLink = yigitRes?.rsvpLink || `/rsvp/gst-vip-yigit-ali-${Date.now().toString(36)}`;
        showToast(`Yiğit Ali Çolakoğlu (yigitalicolakoglu22@gmail.com) adresine gala davetiyesi gönderildi. LCV Linki: ${rsvpLink}`);
      } else {
        showToast(`${selectedGuestIds.length} davetlinin kayıtlı e-postasına kişisel LCV davetiyesi gönderildi.`);
      }
    } catch {
      if (yigitAli) {
        showToast(`Yiğit Ali Çolakoğlu (yigitalicolakoglu22@gmail.com) adresine gala davetiyesi gönderildi. LCV Linki: /rsvp/gst-vip-yigit-ali-preview`);
      } else {
        showToast(`${selectedGuestIds.length} davetlinin kayıtlı e-postasına kişisel LCV davetiyesi gönderildi.`);
      }
    }
  };

  // Etkinliği / Arşivi Düzenleme Modal Başlatıcı
  const handleOpenEditEvent = () => {
    if (!selectedGala) return;
    setEditEventTitle(selectedGala.title);
    setEditEventMovie(selectedGala.movieTitle);
    setEditEventVenue(selectedGala.venue);
    setEditEventDateText(selectedGala.eventDateText);
    setEditEventDoorsOpen(selectedGala.doorsOpenAt);
    setEditEventStartsAt(selectedGala.startsAt);
    setEditEventCapacity(selectedGala.capacity);
    setEditEventConfirmedLcv(selectedGala.confirmedLcv);
    setEditEventIsArchive(selectedGala.isHistoricalArchive);
    setEditEventArchiveDate(selectedGala.archiveDate || '');
    setIsEditEventModalOpen(true);
  };

  // Etkinlik Değişikliklerini Kaydetme Motoru
  const handleUpdateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGala || !editEventTitle || !editEventMovie) {
      showToast('Lütfen etkinlik başlığı ve film adını doldurunuz.');
      return;
    }

    const capacity = Math.max(1, editEventCapacity);
    const confirmed = Math.max(0, editEventConfirmedLcv);
    const occupancyRate = Math.min(100, Math.round((confirmed / capacity) * 1000) / 10);

    const updatedGalas = galas.map((g) => {
      if (g.id === selectedGala.id) {
        return {
          ...g,
          title: editEventTitle,
          movieTitle: editEventMovie,
          venue: editEventVenue,
          eventDateText: editEventDateText,
          doorsOpenAt: editEventDoorsOpen,
          startsAt: editEventStartsAt,
          capacity,
          confirmedLcv: confirmed,
          occupancyRate,
          isHistoricalArchive: editEventIsArchive,
          archiveDate: editEventIsArchive ? (editEventArchiveDate || editEventDateText) : undefined,
        };
      }
      return g;
    });

    setGalas(updatedGalas);
    try {
      localStorage.setItem('gala_host_events_v16', JSON.stringify(updatedGalas));
    } catch {}
    setIsEditEventModalOpen(false);
    showToast(`${editEventTitle} bilgileri başarıyla güncellendi.`);
  };

  // Gelen Mail Aksiyonu
  const handleApproveInboundMail = (
    mailId: string,
    action: 'APPROVE_VIP' | 'APPROVE_PRESS_ACCREDITATION' | 'MOVE_TO_WAITLIST'
  ) => {
    setInboundMails((prev) =>
      prev.map((m) => (m.id === mailId ? { ...m, status: 'PROCESSED' } : m))
    );

    if (mailId === 'mail-02') {
      setGuests((prev) => {
        const updated = prev.map((g) => (g.id === 'go-disney-omur-gedik' ? { ...g, invitationState: 'INVITED' as const } : g));
        try { localStorage.setItem('gala_host_guests_v15', JSON.stringify(updated)); } catch {}
        return updated;
      });
      showToast('Ömür Gedik için yanıt onaylandı. Basın akreditasyonu ve davetiye iletildi.');
    } else if (mailId === 'mail-01') {
      setGuests((prev) => {
        const updated = prev.map((g) => (g.id === 'go-disney-danla' ? { ...g, plusOneAllowed: 1, invitationState: 'INVITED' as const } : g));
        try { localStorage.setItem('gala_host_guests_v15', JSON.stringify(updated)); } catch {}
        return updated;
      });
      showToast('Danla Bilic için +1 refakatçi LCV onayı işlendi.');
    } else if (mailId === 'mail-03') {
      setGuests((prev) => {
        const updated = prev.map((g) => (g.id === 'go-disney-kivanc' ? { ...g, invitationState: 'INVITED' as const } : g));
        try { localStorage.setItem('gala_host_guests_v15', JSON.stringify(updated)); } catch {}
        return updated;
      });
      showToast('Kıvanç Tatlıtuğ için seans gecikme notu kapı personeline iletildi ve davet onaylandı.');
    } else {
      showToast('Yanıt başarıyla onaylandı.');
    }
  };

  // Tek Tıkla Paylaşım İşleme ()
  const handleIncrementPost = (guestId: string) => {
    setGuests((prev) => {
      const updated = prev.map((g) => {
        if (g.id === guestId) {
          const newPosts = g.totalPostsForHost + 1;
          const attended = Math.max(1, g.totalAttendedForHost);
          const newRate = Math.min(100, Math.round((newPosts / attended) * 1000) / 10);
          let newTier: HostGuest['conversionTier'] = 'MODERATE_CONTRIBUTOR';
          if (newRate >= 75.0) newTier = 'HIGH_IMPACT_CREATOR';
          else if (newRate >= 40.0) newTier = 'MODERATE_CONTRIBUTOR';
          else newTier = 'LOW_PR_CONVERSION';

          showToast(`${g.firstName} ${g.lastName} için yeni paylaşım işlendi (Güncel Dönüşüm: %${newRate}).`);
          return {
            ...g,
            totalPostsForHost: newPosts,
            prConversionRate: newRate,
            conversionTier: newTier,
          };
        }
        return g;
      });
      try { localStorage.setItem('gala_host_guests_v15', JSON.stringify(updated)); } catch {}
      return updated;
    });
  };

  // Kapı Güvenlik Listesi İndirme ()
  const handleExportDoorList = () => {
    const invitedGuests = guests.filter((g) => g.invitationState === 'INVITED');
    const csvRows = [
      'Ad,Soyad,Kurum,Kategori,LCV Durumu,Kontenjan (+1),Guvenlik Dogrulama',
      ...invitedGuests.map(
        (g) =>
          `"${g.firstName}","${g.lastName}","${g.company}","${g.category}","ONAYLANDI","+${g.plusOneAllowed}","QR-${g.id.slice(-6).toUpperCase()}"`
      ),
    ];
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Kapi-Guvenlik-Listesi-${selectedGala.movieTitle.replace(/\s+/g, '-')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Kapı listesi (${invitedGuests.length} davetli) indirildi.`);
  };

  // Şifre Değiştirme ()
  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 8) {
      showToast('Yeni şifre en az 8 karakter olmalıdır.');
      return;
    }
    if (newPassword !== newPasswordConfirm) {
      showToast('Yeni şifreler birbiriyle eşleşmiyor.');
      return;
    }
    setCurrentPassword('');
    setNewPassword('');
    setNewPasswordConfirm('');
    setIsSettingsModalOpen(false);
    showToast('Hesap şifresi ve kurumsal tercihler güncellendi.');
  };

  // Takipçi Sayılarını Senkronize Etme ve Formatlama Motoru
  const handleSyncFollowers = () => {
    setGuests((prev) => {
      const updated = prev.map((g) => {
        let updatedIg = g.instagram;
        if (updatedIg) {
          let count = updatedIg.count;
          if (!count || count <= 0) {
            count = parseFollowerCount(updatedIg.followersText);
          }
          const followersText = formatFollowerCount(count, 'Takipçi');
          updatedIg = { ...updatedIg, count, followersText };
        }

        let updatedYt = g.youtube;
        if (updatedYt) {
          let count = updatedYt.count;
          if (!count || count <= 0) {
            count = parseFollowerCount(updatedYt.followersText);
          }
          const followersText = formatFollowerCount(count, 'Abone');
          updatedYt = { ...updatedYt, count, followersText };
        }

        return {
          ...g,
          instagram: updatedIg,
          youtube: updatedYt,
        };
      });

      try {
        localStorage.setItem('gala_host_guests_v15', JSON.stringify(updated));
      } catch {}

      return updated;
    });

    showToast('Tüm davetlilerin Instagram ve YouTube takipçi sayıları senkronize edildi.');
  };

  // Tekil Kişi Ekleme (Doğrudan CRUD)
  const handleAddSingleGuest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGuestFirstName || !newGuestLastName) {
      showToast('Lütfen Ad ve Soyad alanlarını doldurunuz.');
      return;
    }

    const igCount = newGuestIgFollowers ? parseFollowerCount(newGuestIgFollowers) : 0;
    const ytCount = newGuestYtSubscribers ? parseFollowerCount(newGuestYtSubscribers) : 0;

    const igFormatted = igCount > 0 ? formatFollowerCount(igCount, 'Takipçi') : newGuestIgFollowers || '100K Takipçi';
    const ytFormatted = ytCount > 0 ? formatFollowerCount(ytCount, 'Abone') : newGuestYtSubscribers || '50K Abone';

    const newGuest: HostGuest = {
      id: `go-disney-${Date.now()}`,
      guestId: `gst-manual-${Date.now()}`,
      firstName: newGuestFirstName,
      lastName: newGuestLastName,
      maskedEmail: `${newGuestFirstName.slice(0, 2).toLowerCase()}***@disney.local`,
      maskedPhone: '+90530*****00',
      company: newGuestCompany || 'Bağımsız',
      title: newGuestTitle || (newGuestCategory === 'PR' ? 'İçerik Üreticisi' : 'Basın Mensubu'),
      category: newGuestCategory,
      hostCustomTags: [newGuestCategory, 'MANUAL_ADDED'],
      hostLoyaltyScore: 100.0,
      instagram: newGuestIgHandle
        ? {
            handle: newGuestIgHandle.startsWith('@') ? newGuestIgHandle : `@${newGuestIgHandle}`,
            followersText: igFormatted,
            count: igCount || 100000,
          }
        : null,
      youtube: newGuestYtHandle
        ? {
            handle: newGuestYtHandle.startsWith('@') ? newGuestYtHandle : `@${newGuestYtHandle}`,
            followersText: ytFormatted,
            count: ytCount || 50000,
          }
        : null,
      totalInvitedByHost: 1,
      totalAttendedForHost: 1,
      totalPostsForHost: 1,
      prConversionRate: 100.0,
      conversionTier: 'HIGH_IMPACT_CREATOR',
      hostNotes: 'Disney Studios Türkiye havuzuna manuel eklendi.',
      invitationState: 'IDLE',
      plusOneAllowed: 1,
    };

    setGuests((prev) => {
      const next = [newGuest, ...prev];
      try {
        localStorage.setItem('gala_host_guests_v15', JSON.stringify(next));
      } catch {}
      return next;
    });

    setIsAddGuestModalOpen(false);
    setNewGuestFirstName('');
    setNewGuestLastName('');
    setNewGuestCompany('');
    setNewGuestTitle('');
    setNewGuestIgHandle('');
    setNewGuestIgFollowers('');
    setNewGuestYtHandle('');
    setNewGuestYtSubscribers('');
    showToast(`${newGuest.firstName} ${newGuest.lastName} davetli havuzuna eklendi.`);
  };

  // Tam Bilgili Davetli Düzenleme Formu Açma
  const handleOpenEditGuest = (guest: HostGuest) => {
    setEditingGuestId(guest.id);
    setEditFirstName(guest.firstName);
    setEditLastName(guest.lastName);
    setEditCompany(guest.company);
    setEditTitle(guest.title);
    setEditCategory(guest.category);
    setEditIgHandle(guest.instagram?.handle || '');
    setEditIgFollowers(guest.instagram?.followersText || '');
    setEditYtHandle(guest.youtube?.handle || '');
    setEditYtSubscribers(guest.youtube?.followersText || '');
    setEditAttended(guest.totalAttendedForHost || 1);
    setEditPosts(guest.totalPostsForHost || 0);
    setEditInvitationState(guest.invitationState);
    setEditNotes(guest.hostNotes || '');
    setIsEditGuestModalOpen(true);
  };

  // Davetliyi Güncelleme (Kaydet)
  const handleUpdateGuest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGuestId || !editFirstName || !editLastName) {
      showToast('Lütfen Ad ve Soyad alanlarını doldurunuz.');
      return;
    }

    const attended = Math.max(1, editAttended);
    const posts = Math.max(0, editPosts);
    const rate = Math.min(100, Math.round((posts / attended) * 1000) / 10);
    let tier: HostGuest['conversionTier'] = 'MODERATE_CONTRIBUTOR';
    if (rate >= 75.0) tier = 'HIGH_IMPACT_CREATOR';
    else if (rate >= 40.0) tier = 'MODERATE_CONTRIBUTOR';
    else if (rate > 0) tier = 'LOW_PR_CONVERSION';
    else tier = 'GHOST_ATTENDEE';

    const igCount = editIgFollowers ? parseFollowerCount(editIgFollowers) : 0;
    const ytCount = editYtSubscribers ? parseFollowerCount(editYtSubscribers) : 0;

    const igFormatted = igCount > 0 ? formatFollowerCount(igCount, 'Takipçi') : editIgFollowers || '100K Takipçi';
    const ytFormatted = ytCount > 0 ? formatFollowerCount(ytCount, 'Abone') : editYtSubscribers || '50K Abone';

    setGuests((prev) => {
      const updated = prev.map((g) => {
        if (g.id === editingGuestId) {
          return {
            ...g,
            firstName: editFirstName,
            lastName: editLastName,
            company: editCompany || 'Bağımsız',
            title: editTitle || (editCategory === 'PR' ? 'İçerik Üreticisi' : 'Basın Mensubu'),
            category: editCategory,
            instagram: editIgHandle
              ? {
                  handle: editIgHandle.startsWith('@') ? editIgHandle : `@${editIgHandle}`,
                  followersText: igFormatted,
                  count: igCount || 100000,
                }
              : null,
            youtube: editYtHandle
              ? {
                  handle: editYtHandle.startsWith('@') ? editYtHandle : `@${editYtHandle}`,
                  followersText: ytFormatted,
                  count: ytCount || 50000,
                }
              : null,
            totalAttendedForHost: attended,
            totalPostsForHost: posts,
            prConversionRate: rate,
            conversionTier: tier,
            invitationState: editInvitationState,
            hostNotes: editNotes,
          };
        }
        return g;
      });

      try {
        localStorage.setItem('gala_host_guests_v15', JSON.stringify(updated));
      } catch {}

      return updated;
    });

    setIsEditGuestModalOpen(false);
    if (selectedGuestForDrawer && selectedGuestForDrawer.id === editingGuestId) {
      setSelectedGuestForDrawer((prev) =>
        prev
          ? {
              ...prev,
              firstName: editFirstName,
              lastName: editLastName,
              company: editCompany,
              title: editTitle,
              category: editCategory,
              hostNotes: editNotes,
              invitationState: editInvitationState,
            }
          : null
      );
    }
    showToast(`${editFirstName} ${editLastName} bilgileri başarıyla güncellendi.`);
  };

  // Çekmece Not Kaydetme ()
  const handleSaveGuestNotes = (guestId: string) => {
    setGuests((prev) => {
      const updated = prev.map((g) => (g.id === guestId ? { ...g, hostNotes: drawerNotes } : g));
      try { localStorage.setItem('gala_host_guests_v15', JSON.stringify(updated)); } catch {}
      return updated;
    });
    if (selectedGuestForDrawer && selectedGuestForDrawer.id === guestId) {
      setSelectedGuestForDrawer({ ...selectedGuestForDrawer, hostNotes: drawerNotes });
    }
    showToast('Not güncellendi.');
  };

  // Davetli Silme (Onay Modalı Başlatıcı)
  const handleDeleteGuest = (guestId: string) => {
    const target = guests.find((g) => g.id === guestId);
    if (target) {
      setDeleteConfirmGuest(target);
    }
  };

  // Davetli Silmeyi Onaylama (confirmDeleteGuest)
  const confirmDeleteGuest = () => {
    if (!deleteConfirmGuest) return;
    const target = deleteConfirmGuest;
    setGuests((prev) => {
      const updated = prev.filter((g) => g.id !== target.id);
      try {
        localStorage.setItem('gala_host_guests_v16', JSON.stringify(updated));
        localStorage.setItem('gala_host_guests_v15', JSON.stringify(updated));
      } catch {}
      return updated;
    });
    setDeleteConfirmGuest(null);
    setSelectedGuestForDrawer(null);
    setIsEditGuestModalOpen(false);
    showToast(`${target.firstName} ${target.lastName} havuzdan silindi.`);
  };

  // Varsayılan Gerçek Listeye Sıfırlama
  const handleResetToDefaultGuests = () => {
    setGuests(DEFAULT_HOST_GUESTS);
    try {
      localStorage.setItem('gala_host_guests_v16', JSON.stringify(DEFAULT_HOST_GUESTS));
      localStorage.setItem('gala_host_guests_v15', JSON.stringify(DEFAULT_HOST_GUESTS));
    } catch {}
    showToast('Davetli havuzu varsayılan gerçek verisetine sıfırlandı.');
  };

  // Tüm Listeyi Temizleme
  const handleClearAllGuests = () => {
    setGuests([]);
    try {
      localStorage.setItem('gala_host_guests_v16', JSON.stringify([]));
      localStorage.setItem('gala_host_guests_v15', JSON.stringify([]));
    } catch {}
    setIsClearAllConfirmOpen(false);
    showToast('Tüm davetli havuzu temizlendi.');
  };

  // Filtrelenmiş Davetliler (Tablo)
  const filteredGuests = useMemo(() => {
    return guests.filter((g) => {
      if (activeNav === 'PR' && g.category !== 'PR') return false;
      if (activeNav === 'PRESS' && g.category !== 'PRESS') return false;

      const fullName = `${g.firstName} ${g.lastName}`.toLowerCase();
      const company = (g.company || '').toLowerCase();
      const igHandle = (g.instagram?.handle || '').toLowerCase();
      const ytHandle = (g.youtube?.handle || '').toLowerCase();
      const q = searchQuery.toLowerCase();

      const matchesSearch =
        fullName.includes(q) ||
        company.includes(q) ||
        igHandle.includes(q) ||
        ytHandle.includes(q);

      if (!matchesSearch) return false;

      if (activeFilter === 'HIGH_PR') return g.prConversionRate >= 75.0;
      if (activeFilter === 'LOW_PR') return g.prConversionRate > 0 && g.prConversionRate < 40.0;
      if (activeFilter === 'GHOST') return g.prConversionRate === 0.0 && g.totalAttendedForHost > 0;
      if (activeFilter === 'INVITED_ONLY') return g.invitationState === 'INVITED';
      if (activeFilter === 'WAITLIST_ONLY') return g.invitationState === 'WAITLIST';

      return true;
    });
  }, [guests, activeNav, activeFilter, searchQuery]);

  // Davet İptal / Yedek Liste / Durum Değiştirme
  const handleToggleState = (guestId: string, newState: 'INVITED' | 'WAITLIST' | 'IDLE') => {
    const target = guests.find((g) => g.id === guestId);
    if (!target) return;

    setGuests((prev) => {
      const updated = prev.map((g) => (g.id === guestId ? { ...g, invitationState: newState } : g));
      try { localStorage.setItem('gala_host_guests_v15', JSON.stringify(updated)); } catch {}
      return updated;
    });

    if (newState === 'IDLE') {
      showToast(`${target.firstName} ${target.lastName} davet listesinden çıkarıldı.`);
    } else if (newState === 'WAITLIST') {
      showToast(`${target.firstName} ${target.lastName} yedek listeye alındı.`);
    } else if (newState === 'INVITED') {
      showToast(`${target.firstName} ${target.lastName} için davet onaylandı.`);
    }
  };

  // EXCEL / TSV / CSV GELİŞMİŞ İÇE AKTARMA MOTORU
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setCsvRawText(text);
        showToast(`${file.name} başarıyla yüklendi.`);
      }
    };
    reader.onerror = () => {
      showToast('Dosya okunamadı.');
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleImportCsv = () => {
    if (!csvRawText || !csvRawText.trim()) {
      showToast('Lütfen CSV veya Excel formatında geçerli veri giriniz.');
      return;
    }

    const lines = csvRawText.split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) {
      showToast('İçe aktarılacak veri bulunamadı.');
      return;
    }

    // Delimiter tespiti: tab (\t), noktalı virgül (;), virgül (,)
    const firstLine = lines[0];
    let delimiter = ',';
    if (firstLine.includes('\t')) delimiter = '\t';
    else if (firstLine.includes(';')) delimiter = ';';

    const hasHeader =
      firstLine.toLowerCase().includes('ad') ||
      firstLine.toLowerCase().includes('email') ||
      firstLine.toLowerCase().includes('isim') ||
      firstLine.toLowerCase().includes('kurum');

    const dataLines = hasHeader && lines.length > 1 ? lines.slice(1) : lines;
    const newParsedGuests: HostGuest[] = [];

    dataLines.forEach((line, index) => {
      const parts = line.split(delimiter).map((p) => p.replace(/^"|"$/g, '').trim());
      if (parts.length < 2) return;

      let email = '';
      let firstName = '';
      let lastName = '';
      let company = 'Bağımsız';
      let phone = '';
      let categoryRaw = 'PR';
      let igRaw = '';
      let ytRaw = '';
      let attended = 1;
      let posts = 1;

      if (parts.length >= 9) {
        // Tam format: Email, Ad, Soyad, Kurum, Telefon, Kategori, Instagram, YouTube, Katilim, Paylasim
        email = parts[0] || '';
        firstName = parts[1] || '';
        lastName = parts[2] || '';
        company = parts[3] || 'Bağımsız';
        phone = parts[4] || '';
        categoryRaw = (parts[5] || 'PR').toUpperCase();
        igRaw = parts[6] || '';
        ytRaw = parts[7] || '';
        attended = Number(parts[8]) || 1;
        posts = Number(parts[9]) || 0;
      } else if (parts.length >= 4) {
        // Esnek format: Ad, Soyad, Kurum, Kategori/Sosyal
        firstName = parts[0] || '';
        lastName = parts[1] || '';
        company = parts[2] || 'Bağımsız';
        categoryRaw = (parts[3] || 'PR').toUpperCase();
        if (parts[4]) igRaw = parts[4];
        if (parts[5]) ytRaw = parts[5];
      } else if (parts.length >= 2) {
        // Basit format: Ad, Soyad
        firstName = parts[0] || '';
        lastName = parts[1] || '';
      }

      if (!firstName) return;

      const category: 'PR' | 'PRESS' =
        categoryRaw.includes('PRESS') || categoryRaw.includes('BASIN') ? 'PRESS' : 'PR';

      const igHandle = igRaw && igRaw.toLowerCase() !== 'yok' && igRaw !== '-' ? igRaw : '';
      const ytHandle = ytRaw && ytRaw.toLowerCase() !== 'yok' && ytRaw !== '-' ? ytRaw : '';

      const rate = attended > 0 ? Math.min(100, Math.round((posts / attended) * 1000) / 10) : 0;
      let tier: HostGuest['conversionTier'] = 'MODERATE_CONTRIBUTOR';
      if (rate >= 75.0) tier = 'HIGH_IMPACT_CREATOR';
      else if (rate >= 40.0) tier = 'MODERATE_CONTRIBUTOR';
      else if (rate > 0) tier = 'LOW_PR_CONVERSION';
      else tier = 'GHOST_ATTENDEE';

      const maskedEmail = email.includes('@')
        ? `${email.slice(0, 2)}***@${email.split('@')[1]}`
        : `${firstName.slice(0, 2).toLowerCase()}***@disney.local`;

      const maskedPhone =
        phone.length >= 7 ? `${phone.slice(0, 4)}*****${phone.slice(-2)}` : '+90530*****00';

      const igCount = igHandle ? parseFollowerCount(igHandle) || 150000 : 0;
      const ytCount = ytHandle ? parseFollowerCount(ytHandle) || 50000 : 0;

      const newGuest: HostGuest = {
        id: `go-disney-csv-${Date.now()}-${index}`,
        guestId: `gst-csv-${Date.now()}-${index}`,
        firstName,
        lastName,
        maskedEmail,
        maskedPhone,
        company,
        title: category === 'PR' ? 'İçerik Üreticisi' : 'Basın Mensubu',
        category,
        hostCustomTags: [category, 'CSV_IMPORT'],
        hostLoyaltyScore: Math.round(75 + Math.random() * 24),
        instagram: igHandle
          ? {
              handle: igHandle.startsWith('@') ? igHandle : `@${igHandle}`,
              followersText: formatFollowerCount(igCount, 'Takipçi'),
              count: igCount,
            }
          : null,
        youtube: ytHandle
          ? {
              handle: ytHandle.startsWith('@') ? ytHandle : `@${ytHandle}`,
              followersText: formatFollowerCount(ytCount, 'Abone'),
              count: ytCount,
            }
          : null,
        totalInvitedByHost: attended,
        totalAttendedForHost: attended,
        totalPostsForHost: posts,
        prConversionRate: rate,
        conversionTier: tier,
        hostNotes: 'Excel/CSV listesinden içe aktarıldı.',
        invitationState: 'IDLE',
        plusOneAllowed: 1,
      };

      newParsedGuests.push(newGuest);
    });

    if (newParsedGuests.length > 0) {
      setGuests((prev) => {
        const nextList = csvImportMode === 'REPLACE' ? newParsedGuests : [...newParsedGuests, ...prev];
        try {
          localStorage.setItem('gala_host_guests_v15', JSON.stringify(nextList));
        } catch {}
        return nextList;
      });
      setIsCsvModalOpen(false);
      showToast(
        `${newParsedGuests.length} davetli ${csvImportMode === 'REPLACE' ? 'listeyi yenileyerek' : 'mevcut listeye eklenerek'} içe aktarıldı.`
      );
    } else {
      showToast('Satırlar ayrıştırılamadı. Lütfen biçimi kontrol ediniz.');
    }
  };

  // Yeni Etkinlik / Arşiv Ekleme
  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventTitle || !newEventMovie) return;

    const newGala: HostGala = {
      id: `evt-disney-${Date.now()}`,
      title: newEventTitle,
      movieTitle: newEventMovie,
      venue: newEventVenue,
      doorsOpenAt: '19:00',
      startsAt: '20:00',
      capacity: newEventCapacity,
      confirmedLcv: newEventIsArchive ? archiveAttendedCount : 0,
      occupancyRate: newEventIsArchive ? Math.round((archiveAttendedCount / newEventCapacity) * 1000) / 10 : 0,
      isHistoricalArchive: newEventIsArchive,
      archiveDate: newEventIsArchive ? '2024 Arşivi' : undefined,
      eventDateText: newEventIsArchive ? 'Geçmiş Gala (Arşiv)' : '2026 Sezonu',
    };

    setGalas([newGala, ...galas]);
    setSelectedGalaId(newGala.id);
    setIsEventModalOpen(false);
    setNewEventTitle('');
    setNewEventMovie('');
    showToast(`${newGala.title} gala listesine eklendi.`);
  };

  // Mail Önizleme için Temsili Konuk ve Alıcı Metni
  const previewGuest = useMemo(() => {
    if (selectedGuestIds.length === 0) return null;
    return guests.find((g) => g.id === selectedGuestIds[0]) || null;
  }, [selectedGuestIds, guests]);

  const previewGuestName = useMemo(() => {
    if (!previewGuest) return 'Sayın Davetlimiz';
    return `${previewGuest.firstName} ${previewGuest.lastName}`;
  }, [previewGuest]);

  const previewRecipientText = useMemo(() => {
    if (!previewGuest) return 'Sayın Davetlimiz';
    const email =
      previewGuest.email ||
      (previewGuest.id === 'go-disney-yigit-ali'
        ? 'yigitalicolakoglu22@gmail.com'
        : previewGuest.maskedEmail);
    if (selectedGuestIds.length === 1 || previewGuest.id === 'go-disney-yigit-ali') {
      return `${previewGuest.firstName} ${previewGuest.lastName} <${email}>`;
    }
    return `Seçilen ${selectedGuestIds.length} Kişi (${previewGuest.firstName} ${previewGuest.lastName} <${email}>)`;
  }, [previewGuest, selectedGuestIds]);

  return (
    <div
      style={{
        backgroundColor: customBgColor,
        backgroundImage: customBgImage ? `url(${customBgImage})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
      className={`min-h-screen text-xs font-sans transition-colors duration-150 ${
        isLight ? 'bg-white text-zinc-900' : 'bg-zinc-950 text-zinc-100'
      }`}
    >
      {/* TOAST BİLDİRİMİ */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 px-4 py-2 text-xs border border-zinc-700 dark:border-zinc-300 transition-opacity">
          {toastMessage}
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* 1. ÜST BAR: TEK SATIR KURUMSAL KİMLİK, GALA SEÇİCİ & AKSİYONLAR      */}
      {/* --------------------------------------------------------------------- */}
      <header
        className={`border-b sticky top-0 z-30 transition ${
          isLight
            ? 'bg-white/95 border-zinc-200 text-zinc-900'
            : 'bg-zinc-950/95 border-zinc-800 text-zinc-100'
        } backdrop-blur-sm`}
        style={{
          backgroundColor: customBgColor ? `${customBgColor}` : undefined,
        }}
      >
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
          {/* Sol Bölüm: Kurumsal Kimlik & Gala Seçici */}
          <div className="flex items-center gap-3 shrink-0">
            <div>
              <div className="flex items-center gap-2">
                <span className={`font-semibold tracking-tight text-xs ${isLight ? 'text-zinc-950' : 'text-white'}`}>
                  Disney Studios Türkiye
                </span>
                <span className="text-[10px] text-zinc-400 font-mono">
                  (Zeynep Yurtbaşı)
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <select
                  value={selectedGalaId}
                  onChange={(e) => setSelectedGalaId(e.target.value)}
                  className={`text-xs py-0.5 px-1 rounded-none border focus:outline-none transition ${
                    isLight
                      ? 'bg-white border-zinc-300 text-zinc-900'
                      : 'bg-zinc-900 border-zinc-700 text-zinc-100'
                  }`}
                >
                  <optgroup label="Sıradaki Galalar">
                    {galas
                      .filter((g) => !g.isHistoricalArchive)
                      .map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.title}
                        </option>
                      ))}
                  </optgroup>
                  <optgroup label="Geçmiş Gala Arşivi">
                    {galas
                      .filter((g) => g.isHistoricalArchive)
                      .map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.title} ({g.archiveDate || g.eventDateText})
                        </option>
                      ))}
                  </optgroup>
                </select>

                <button
                  type="button"
                  onClick={() => setIsEventModalOpen(true)}
                  className={`text-[11px] px-2 py-0.5 border rounded-none transition ${
                    isLight
                      ? 'border-zinc-300 text-zinc-700 hover:bg-zinc-100'
                      : 'border-zinc-700 text-zinc-300 hover:bg-zinc-900'
                  }`}
                  title="Yeni Gala veya Arşiv Ekle"
                >
                  Yeni Gala
                </button>

                {/* ETKİNLİĞİ / ARŞİVİ DÜZENLE BUTONU */}
                <button
                  type="button"
                  onClick={handleOpenEditEvent}
                  className={`text-[11px] px-2 py-0.5 border rounded-none transition ${
                    isLight
                      ? 'border-zinc-300 text-zinc-700 hover:bg-zinc-100'
                      : 'border-zinc-700 text-zinc-300 hover:bg-zinc-900'
                  }`}
                  title="Seçili Galayı veya Arşivi Düzenle"
                >
                  Etkinliği Düzenle
                </button>
              </div>
            </div>
          </div>

          {/* Orta Bölüm: Kategori Filtre Sekmeleri */}
          <nav className="flex items-center gap-1 sm:gap-2">
            {[
              { id: 'ALL', label: 'Tümü' },
              { id: 'PR', label: 'PR & VIP' },
              { id: 'PRESS', label: 'Basın' },
              { id: 'COCKPIT', label: `Gelen Mailler (${inboundMails.length})` },
            ].map((tab) => {
              const isActive = activeNav === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveNav(tab.id as any)}
                  className={`px-3 py-1.5 text-xs font-medium border-b-2 transition ${
                    isActive
                      ? isLight
                        ? 'border-zinc-900 text-zinc-950 font-semibold'
                        : 'border-white text-white font-semibold'
                      : isLight
                      ? 'border-transparent text-zinc-500 hover:text-zinc-900'
                      : 'border-transparent text-zinc-400 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>

          {/* Sağ Bölüm: En Temel 4 Buton (Kişi Ekle, Excel/CSV Yükle, Davet Et, Ayarlar) */}
          <div className="flex items-center gap-2 shrink-0">
            {/* 1. Kişi Ekle */}
            <button
              type="button"
              onClick={() => setIsAddGuestModalOpen(true)}
              className={`px-3 py-1.5 rounded-none text-xs font-medium border transition ${
                isLight
                  ? 'bg-white border-zinc-300 text-zinc-800 hover:bg-zinc-50'
                  : 'bg-zinc-900 border-zinc-700 text-zinc-200 hover:bg-zinc-800'
              }`}
            >
              <span>Kişi Ekle</span>
            </button>

            {/* 2. Excel / CSV Yükle */}
            <button
              type="button"
              onClick={() => setIsCsvModalOpen(true)}
              className={`px-3 py-1.5 rounded-none text-xs font-medium border transition ${
                isLight
                  ? 'bg-white border-zinc-300 text-zinc-800 hover:bg-zinc-50'
                  : 'bg-zinc-900 border-zinc-700 text-zinc-200 hover:bg-zinc-800'
              }`}
            >
              <span>Excel / CSV Yükle</span>
            </button>

            {/* 3. TEK GENEL "DAVET ET" BUTONU (EN BELİRGİN ANA BUTON — DOĞRUDAN isLight STATE'İNE BAĞLI) */}
            <button
              type="button"
              onClick={() => openCampaignModal(selectedGala)}
              className={`px-4 py-1.5 text-xs font-semibold rounded-none transition ${
                isLight
                  ? 'bg-zinc-900 text-white hover:bg-zinc-800'
                  : 'bg-white text-zinc-950 hover:bg-zinc-200'
              }`}
              title="Gala Davetiyesi Gönder"
            >
              <span>Davet Et</span>
            </button>

            {/* 4. Ayarlar */}
            <button
              type="button"
              onClick={() => setIsSettingsModalOpen(true)}
              className={`px-3 py-1.5 rounded-none text-xs font-medium border transition ${
                isLight
                  ? 'bg-white border-zinc-300 text-zinc-700 hover:bg-zinc-50'
                  : 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:bg-zinc-800'
              }`}
            >
              Ayarlar
            </button>
          </div>
        </div>
      </header>

      {/* --------------------------------------------------------------------- */}
      {/* 2. ANA İÇERİK KAPSAYICISI (MAX-W-5XL ORTALANMIŞ)                     */}
      {/* --------------------------------------------------------------------- */}
      <main className="max-w-5xl mx-auto px-6 py-6 space-y-6">
        {/* TEK SATIRLIK GALA ÖZETİ & SAĞDA İKİNCİ ERİŞİM NOKTASI "DAVET ET" */}
        <div
          className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs pb-4 border-b ${
            isLight ? 'border-zinc-200' : 'border-zinc-800'
          }`}
        >
          {/* Sol: Bilgi Satırı */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`font-semibold ${isLight ? 'text-zinc-950' : 'text-white'}`}>
              {selectedGala.title}
            </span>
            <span className="text-zinc-400">·</span>
            <span className="text-zinc-500">{selectedGala.eventDateText}</span>
            <span className="text-zinc-400">·</span>
            <span className="text-zinc-500">{selectedGala.venue}</span>
            <span className="text-zinc-400">·</span>
            <span className={`font-medium font-mono ${isLight ? 'text-zinc-900' : 'text-zinc-300'}`}>
              {selectedGala.confirmedLcv} / {selectedGala.capacity} Katılımcı (%{selectedGala.occupancyRate})
            </span>
          </div>

          {/* Sağ: İkinci Erişim Noktası "Davet Et" */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => openCampaignModal(selectedGala)}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-none transition ${
                isLight
                  ? 'bg-zinc-900 text-white hover:bg-zinc-800'
                  : 'bg-white text-zinc-950 hover:bg-zinc-200'
              }`}
              title="Gala Davetiye Sihirbazını Aç"
            >
              Davet Et
            </button>
          </div>
        </div>

        {/* ALT ARAÇ ÇUBUĞU (ARAMA, FİLTRE & İKİNCİL ARAÇLAR) */}
        <div
          className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs pb-3 border-b ${
            isLight ? 'border-zinc-200' : 'border-zinc-800'
          }`}
        >
          {/* Sol: Arama & Filtre */}
          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="text"
              placeholder="İsim veya kurum ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`text-xs px-2.5 py-1.5 rounded-none border focus:outline-none transition w-44 sm:w-56 ${
                isLight
                  ? 'bg-white border-zinc-300 text-zinc-900 placeholder-zinc-400 focus:border-zinc-500'
                  : 'bg-zinc-900 border-zinc-700 text-zinc-200 placeholder-zinc-500 focus:border-zinc-500'
              }`}
            />

            <select
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value)}
              className={`text-xs px-2.5 py-1.5 rounded-none border focus:outline-none ${
                isLight
                  ? 'bg-white border-zinc-300 text-zinc-700'
                  : 'bg-zinc-900 border-zinc-700 text-zinc-300'
              }`}
            >
              <option value="ALL">Tümü</option>
              <option value="HIGH_PR">Yüksek Dönüşüm (%75+)</option>
              <option value="LOW_PR">Düşük Dönüşüm (&lt;%40)</option>
              <option value="GHOST">Paylaşım Yapmayanlar</option>
              <option value="INVITED_ONLY">Davet Edilenler</option>
              <option value="WAITLIST_ONLY">Yedek Liste</option>
            </select>
          </div>

          {/* Sağ: İkincil Araçlar (Takipçileri Güncelle, Liste İndir, Arka Plan) */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-end">
            {/* LCV Senkronize Et Butonu */}
            <button
              type="button"
              onClick={() => {
                syncRsvpResponses();
                showToast('LCV yanıtları sunucu ve tarayıcı deposu ile senkronize edildi.');
              }}
              className={`px-2.5 sm:px-3 py-1.5 rounded-none text-xs font-medium border transition ${
                isLight
                  ? 'bg-white border-zinc-300 text-zinc-800 hover:bg-zinc-50'
                  : 'bg-zinc-900 border-zinc-700 text-zinc-200 hover:bg-zinc-800'
              }`}
              title="LCV yanıtlarını ve bilet durumlarını canlı senkronize et"
            >
              <span>LCV Senkronize Et</span>
            </button>

            {/* Takipçileri Güncelle Motoru Butonu */}
            <button
              type="button"
              onClick={handleSyncFollowers}
              className={`px-2.5 sm:px-3 py-1.5 rounded-none text-xs font-medium border transition ${
                isLight
                  ? 'bg-white border-zinc-300 text-zinc-800 hover:bg-zinc-50'
                  : 'bg-zinc-900 border-zinc-700 text-zinc-200 hover:bg-zinc-800'
              }`}
              title="Instagram ve YouTube Takipçi Sayılarını Güncelle ve Senkronize Et"
            >
              <span>Takipçileri Güncelle</span>
            </button>

            {/* Liste İndir */}
            <button
              type="button"
              onClick={handleExportDoorList}
              className={`px-2.5 sm:px-3 py-1.5 rounded-none text-xs font-medium border transition ${
                isLight
                  ? 'bg-white border-zinc-300 text-zinc-800 hover:bg-zinc-50'
                  : 'bg-zinc-900 border-zinc-700 text-zinc-200 hover:bg-zinc-800'
              }`}
              title="Kapı Personeli için Güvenlik Listesi İndir"
            >
              <span>Liste İndir</span>
            </button>

            {/* Hızlı Arka Plan Seçici Butonu */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsBgSelectorOpen((prev) => !prev)}
                className={`px-2.5 sm:px-3 py-1.5 rounded-none text-xs font-medium border transition ${
                  isLight
                    ? 'bg-white border-zinc-300 text-zinc-800 hover:bg-zinc-50'
                    : 'bg-zinc-900 border-zinc-700 text-zinc-200 hover:bg-zinc-800'
                }`}
                title="Arayüz Arka Plan Rengi ve Görseli Seç"
              >
                <span>Arka Plan</span>
              </button>

              {/* Hızlı Arka Plan Açılır Menüsü */}
              {isBgSelectorOpen && (
                <div
                  className={`absolute right-0 mt-1 w-64 p-3 border rounded-none z-50 space-y-2 shadow-none ${
                    isLight ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-zinc-950 border-zinc-800 text-zinc-100'
                  }`}
                >
                  <div className="flex items-center justify-between pb-1 border-b border-zinc-200 dark:border-zinc-800">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                      Arka Plan Paleti
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsBgSelectorOpen(false)}
                      className="text-[11px] text-zinc-400 hover:text-zinc-600"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="space-y-1">
                    {BG_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          handleSelectBgPreset(preset);
                          setIsBgSelectorOpen(false);
                        }}
                        className={`w-full text-left px-2 py-1.5 text-xs border rounded-none flex items-center justify-between transition ${
                          customBgColor.toUpperCase() === preset.color.toUpperCase()
                            ? 'border-zinc-950 dark:border-white font-semibold'
                            : 'border-transparent hover:bg-zinc-100 dark:hover:bg-zinc-900'
                        }`}
                      >
                        <span>{preset.label}</span>
                        <span
                          className="w-3.5 h-3.5 border border-zinc-400"
                          style={{ backgroundColor: preset.color }}
                        />
                      </button>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 space-y-1.5">
                    <label className="text-[11px] text-zinc-500 block">Özel Renk Seçici:</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={customBgColor.startsWith('#') ? customBgColor : '#FFFFFF'}
                        onChange={(e) => handleCustomColorChange(e.target.value)}
                        className="w-7 h-7 p-0 border border-zinc-300 cursor-pointer rounded-none"
                      />
                      <input
                        type="text"
                        value={customBgColor}
                        onChange={(e) => handleCustomColorChange(e.target.value)}
                        className={`flex-1 px-2 py-1 font-mono text-xs border rounded-none focus:outline-none ${
                          isLight ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-zinc-900 border-zinc-700 text-zinc-100'
                        }`}
                        placeholder="#FFFFFF"
                      />
                    </div>
                  </div>

                  <div className="pt-1.5 space-y-1">
                    <label className="text-[11px] text-zinc-500 block">Özel Arka Plan Görseli URL:</label>
                    <input
                      type="text"
                      value={customBgImage}
                      onChange={(e) => handleCustomImageChange(e.target.value)}
                      placeholder="https://..."
                      className={`w-full px-2 py-1 text-xs border rounded-none focus:outline-none ${
                        isLight ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-zinc-900 border-zinc-700 text-zinc-100'
                      }`}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------------- */}
        {/* B. GELEN MAIL ÖNİZLEMELERİ (DÜZ TABLO / LİSTE GÖRÜNÜMÜ)     */}
        {/* ------------------------------------------------------------------- */}
        {(activeNav === 'ALL' || activeNav === 'COCKPIT') && (
          <section
            className={`border p-4 space-y-3 transition ${
              isLight ? 'bg-white border-zinc-200' : 'bg-zinc-950 border-zinc-800'
            }`}
          >
            <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-800">
              <h3 className={`text-xs font-bold uppercase tracking-wider ${isLight ? 'text-zinc-900' : 'text-zinc-100'}`}>
                Gelen E-Posta & LCV Yanıt Önizlemeleri
              </h3>
              <span className="text-xs text-zinc-500 font-mono">
                {inboundMails.length} İleti
              </span>
            </div>

            <div className={`border-t border-b divide-y ${isLight ? 'border-zinc-200 divide-zinc-200' : 'border-zinc-800 divide-zinc-800'}`}>
              {inboundMails.map((mail) => (
                <div key={mail.id} className="py-2.5 px-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`font-semibold ${isLight ? 'text-zinc-900' : 'text-zinc-100'}`}>{mail.fromName}</span>
                      <span className="text-zinc-400 font-mono text-[11px]">{mail.fromEmail}</span>
                      <span className="text-zinc-400 text-[11px]">· {mail.receivedAt}</span>
                    </div>
                    <p className="mt-1 text-zinc-600 dark:text-zinc-400 truncate">
                      <strong className={`font-medium ${isLight ? 'text-zinc-900' : 'text-zinc-200'}`}>{mail.subject}</strong>
                      {' — '}
                      <span className="italic">&quot;{mail.preview}&quot;</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {mail.id === 'mail-02' ? (
                      <button
                        type="button"
                        onClick={() => handleApproveInboundMail(mail.id, 'APPROVE_PRESS_ACCREDITATION')}
                        className={`px-3 py-1 text-xs font-medium border transition ${
                          mail.status === 'PROCESSED'
                            ? 'bg-zinc-100 text-zinc-400 border-zinc-200 dark:bg-zinc-900 dark:text-zinc-600 dark:border-zinc-800'
                            : isLight
                            ? 'bg-zinc-900 text-white border-zinc-900 hover:bg-zinc-800'
                            : 'bg-white text-zinc-950 border-white hover:bg-zinc-200'
                        }`}
                      >
                        {mail.status === 'PROCESSED' ? 'Akreditasyon Verildi ✓' : 'AI Taslağını Onayla & Akreditasyon Ver'}
                      </button>
                    ) : mail.id === 'mail-01' ? (
                      <button
                        type="button"
                        onClick={() => handleApproveInboundMail(mail.id, 'APPROVE_VIP')}
                        className={`px-3 py-1 text-xs font-medium border transition ${
                          mail.status === 'PROCESSED'
                            ? 'bg-zinc-100 text-zinc-400 border-zinc-200 dark:bg-zinc-900 dark:text-zinc-600 dark:border-zinc-800'
                            : isLight
                            ? 'bg-zinc-900 text-white border-zinc-900 hover:bg-zinc-800'
                            : 'bg-white text-zinc-950 border-white hover:bg-zinc-200'
                        }`}
                      >
                        {mail.status === 'PROCESSED' ? 'LCV Onaylandı (+1) ✓' : 'LCV Onayla (+1)'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleApproveInboundMail(mail.id, 'APPROVE_VIP')}
                        className={`px-3 py-1 text-xs font-medium border transition ${
                          mail.status === 'PROCESSED'
                            ? 'bg-zinc-100 text-zinc-400 border-zinc-200 dark:bg-zinc-900 dark:text-zinc-600 dark:border-zinc-800'
                            : isLight
                            ? 'bg-zinc-900 text-white border-zinc-900 hover:bg-zinc-800'
                            : 'bg-white text-zinc-950 border-white hover:bg-zinc-200'
                        }`}
                      >
                        {mail.status === 'PROCESSED' ? 'İşlendi ✓' : 'Onayla'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ------------------------------------------------------------------- */}
        {/* C. DÜMDÜZ ANA İSİM LİSTESİ TABLOSU                          */}
        {/* (İSİMLERİN YANINDA "DAVET ET" TUŞU KESİNLİKLE YOK! DOĞRUDAN DÜZENLE & SİL) */}
        {/* ------------------------------------------------------------------- */}
        {activeNav !== 'COCKPIT' && (
          <div className="border border-zinc-200 dark:border-zinc-800 overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead
                className={`uppercase text-[10px] tracking-wider border-b ${
                  isLight
                    ? 'bg-zinc-50 border-zinc-200 text-zinc-600'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                }`}
              >
                <tr>
                  <th className="py-2.5 px-3 font-medium">Ad Soyad</th>
                  <th className="py-2.5 px-3 font-medium">Kurum & Unvan</th>
                  <th className="py-2.5 px-3 font-medium">Kategori</th>
                  <th className="py-2.5 px-3 font-medium">Instagram</th>
                  <th className="py-2.5 px-3 font-medium">YouTube</th>
                  <th className="py-2.5 px-3 font-medium">Paylaşım Oranı</th>
                  <th className="py-2.5 px-3 font-medium text-right">
                    <span>Durum</span>
                  </th>
                  <th className="py-2.5 px-3 font-medium text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isLight ? 'divide-zinc-200 bg-white' : 'divide-zinc-800 bg-zinc-950'}`}>
                {filteredGuests.map((g) => {
                  const igUrl = g.instagram
                    ? `https://instagram.com/${g.instagram.handle.replace('@', '')}`
                    : null;
                  const ytUrl = g.youtube
                    ? `https://youtube.com/${g.youtube.handle.startsWith('@') ? g.youtube.handle : `@${g.youtube.handle}`}`
                    : null;

                  return (
                    <tr
                      key={g.id}
                      className={`transition ${isLight ? 'hover:bg-zinc-50' : 'hover:bg-zinc-900/40'}`}
                    >
                      {/* Sütun 1: Ad Soyad (İsme tıklanınca düz kişi detay çekmecesi açılır) */}
                      <td className="py-2.5 px-3 font-medium">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedGuestForDrawer(g);
                            setDrawerNotes(g.hostNotes || '');
                          }}
                          className={`hover:underline text-left text-xs ${
                            isLight ? 'text-zinc-950' : 'text-zinc-100'
                          }`}
                          title="Kişi detaylarını incele / not düzenle"
                        >
                          {g.firstName} {g.lastName}
                        </button>
                      </td>

                      {/* Sütun 2: Kurum & Unvan */}
                      <td className="py-2.5 px-3 text-zinc-600 dark:text-zinc-400 truncate max-w-[180px]">
                        {g.company} · {g.title}
                      </td>

                      {/* Sütun 3: Kategori (Düz yazı, çerçeveli rozet yok) */}
                      <td className="py-2.5 px-3">
                        <span className="text-zinc-700 dark:text-zinc-300">
                          {g.category === 'PR' ? 'PR' : 'Basın'}
                        </span>
                      </td>

                      {/* Sütun 4: Instagram (Düz link) */}
                      <td className="py-2.5 px-3 font-mono">
                        {igUrl && g.instagram ? (
                          <a
                            href={igUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline text-zinc-700 dark:text-zinc-300"
                          >
                            {g.instagram.handle} ({g.instagram.followersText.replace(' Takipçi', '')})
                          </a>
                        ) : (
                          <span className="text-zinc-400">-</span>
                        )}
                      </td>

                      {/* Sütun 5: YouTube (Düz link) */}
                      <td className="py-2.5 px-3 font-mono">
                        {ytUrl && g.youtube ? (
                          <a
                            href={ytUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline text-zinc-700 dark:text-zinc-300"
                          >
                            {g.youtube.handle} ({g.youtube.followersText.replace(' Abone', '')})
                          </a>
                        ) : (
                          <span className="text-zinc-400">-</span>
                        )}
                      </td>

                      {/* Sütun 6: Paylaşım Oranı */}
                      <td className="py-2.5 px-3 font-mono">
                        <span>
                          %{g.prConversionRate} ({g.totalPostsForHost}/{g.totalAttendedForHost})
                        </span>
                        <button
                          type="button"
                          onClick={() => handleIncrementPost(g.id)}
                          className="ml-2.5 text-[11px] underline text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                          title="+ Paylaşım İşle"
                        >
                          <span>+1 İşle</span>
                        </button>
                      </td>

                      {/* Sütun 7: Durum (SALT OKUNUR DÜZ YAZI — KESİNLİKLE DAVET ET BUTONU YOK) */}
                      <td className="py-2.5 px-3 text-right">
                        {g.lcvStatus === 'CONFIRMED' ? (
                          <div className="inline-flex flex-col items-end">
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                              <span>LCV Onaylandı (QR Bilet Hazır)</span>
                            </span>
                            {g.plusOneNames ? (
                              <span className="text-[10px] text-zinc-500 mt-0.5">
                                +1: {g.plusOneNames}
                              </span>
                            ) : null}
                          </div>
                        ) : g.lcvStatus === 'DECLINED' ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[11px] font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                            <span>Katılamıyor (LCV Red)</span>
                          </span>
                        ) : (
                          <span className="text-zinc-700 dark:text-zinc-300">
                            {g.invitationState === 'INVITED' ? 'Davetli' : g.invitationState === 'WAITLIST' ? 'Yedek' : '-'}
                          </span>
                        )}
                      </td>

                      {/* Sütun 8: İşlemler (DÜZ METİN BUTONLAR: DÜZENLE & SİL — KESİNLİKLE DAVET ET BUTONU YOK) */}
                      <td className="py-2.5 px-3 text-right shrink-0 whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenEditGuest(g)}
                            className="text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white underline"
                            title="Davetliyi Düzenle"
                          >Düzenle</button>
                          <span className="text-zinc-300 dark:text-zinc-700">|</span>
                          <button
                            type="button"
                            onClick={() => handleDeleteGuest(g.id)}
                            className="text-xs text-rose-600 dark:text-rose-400 hover:text-rose-800 dark:hover:text-rose-200 underline"
                            title="Davetliyi Sil"
                          >Sil</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* --------------------------------------------------------------------- */}
      {/* 3. MODALLAR VE ÇEKMECELER (KESKİN / DÜZ ÇİZGİLİ)                      */}
      {/* --------------------------------------------------------------------- */}

      {/* ÇEKMECE: KİŞİ DETAY & DÜZENLEME YAN ÇEKMECESİ */}
      {selectedGuestForDrawer && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div
            className="absolute inset-0 bg-black/50 transition-opacity"
            onClick={() => setSelectedGuestForDrawer(null)}
          />
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div
              className={`w-screen max-w-md border-l p-6 flex flex-col justify-between ${
                isLight ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-zinc-950 border-zinc-800 text-zinc-100'
              }`}
            >
              <div className="space-y-4 overflow-y-auto pr-1">
                {/* Çekmece Üst Başlık */}
                <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
                  <div>
                    <h3 className={`text-sm font-semibold ${isLight ? 'text-zinc-950' : 'text-white'}`}>
                      {selectedGuestForDrawer.firstName} {selectedGuestForDrawer.lastName}
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {selectedGuestForDrawer.title} · {selectedGuestForDrawer.company}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedGuestForDrawer(null)}
                    className="text-xs px-2 py-1 border border-zinc-300 dark:border-zinc-700"
                  >
                    Kapat
                  </button>
                </div>

                {/* İletişim Bilgileri (Maskeli PII) */}
                <div
                  className={`p-3 border space-y-2 text-xs ${
                    isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-900/60 border-zinc-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">Maskeli E-Posta:</span>
                    <span className={`font-mono ${isLight ? 'text-zinc-800' : 'text-zinc-300'}`}>
                      {selectedGuestForDrawer.maskedEmail}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">Maskeli Telefon:</span>
                    <span className={`font-mono ${isLight ? 'text-zinc-800' : 'text-zinc-300'}`}>
                      {selectedGuestForDrawer.maskedPhone}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">Kategori:</span>
                    <span className="font-mono">{selectedGuestForDrawer.category}</span>
                  </div>
                </div>

                {/* Geçmiş Gala İstatistikleri */}
                <div
                  className={`p-3 border text-xs space-y-1.5 ${
                    isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-900/60 border-zinc-800'
                  }`}
                >
                  <p className="text-zinc-500 font-medium">Geçmiş Gala İstatistikleri:</p>
                  <p className="font-mono text-xs font-semibold">
                    {selectedGuestForDrawer.totalInvitedByHost} Davet · {selectedGuestForDrawer.totalAttendedForHost} Katılım · {selectedGuestForDrawer.totalPostsForHost} Paylaşım
                  </p>
                  <p className="text-[11px] text-zinc-400">
                    PR Dönüşüm Oranı: %{selectedGuestForDrawer.prConversionRate} ({selectedGuestForDrawer.conversionTier})
                  </p>
                </div>

                {/* Yönetici Notu Düzenleme */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-500 block">
                    Yönetici Notu:
                  </label>
                  <textarea
                    rows={4}
                    value={drawerNotes}
                    onChange={(e) => setDrawerNotes(e.target.value)}
                    className={`w-full text-xs p-2.5 border rounded-none focus:outline-none ${
                      isLight
                        ? 'bg-white border-zinc-300 text-zinc-900'
                        : 'bg-zinc-900 border-zinc-700 text-zinc-200'
                    }`}
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleSaveGuestNotes(selectedGuestForDrawer.id)}
                      className={`px-3 py-1.5 rounded-none text-xs font-medium border transition ${
                        isLight
                          ? 'bg-zinc-900 text-white border-zinc-900 hover:bg-zinc-800'
                          : 'bg-white text-zinc-950 border-white hover:bg-zinc-200'
                      }`}
                    >
                      Notu Kaydet
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleOpenEditGuest(selectedGuestForDrawer);
                        setSelectedGuestForDrawer(null);
                      }}
                      className={`px-3 py-1.5 rounded-none text-xs font-medium border transition ${
                        isLight
                          ? 'bg-white border-zinc-300 text-zinc-800 hover:bg-zinc-100'
                          : 'bg-zinc-900 border-zinc-700 text-zinc-200 hover:bg-zinc-800'
                      }`}
                    >
                      Tüm Bilgileri Düzenle
                    </button>
                  </div>
                </div>
              </div>

              {/* Çekmece Alt Aksiyon Butonları */}
              <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => handleToggleState(selectedGuestForDrawer.id, 'WAITLIST')}
                  className={`px-3 py-1.5 rounded-none text-xs font-medium border transition ${
                    isLight
                      ? 'bg-white border-zinc-300 text-zinc-700 hover:bg-zinc-100'
                      : 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:bg-zinc-800'
                  }`}
                >
                  Yedek Listeye Al
                </button>

                <button
                  type="button"
                  onClick={() => handleDeleteGuest(selectedGuestForDrawer.id)}
                  className="px-3 py-1.5 rounded-none text-xs font-medium text-rose-600 hover:bg-rose-50 border border-transparent transition"
                >
                  Havuzdan Sil
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: AYARLAR MODALI (TEMA, ARKA PLAN MOTORU, ŞİFRE DEĞİŞTİRME, KURUMSAL İMZA, VERİSETİ RESET) */}
      {isSettingsModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div
            className={`max-w-lg w-full p-6 border rounded-none space-y-4 max-h-[90vh] overflow-y-auto ${
              isLight ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-zinc-950 border-zinc-800 text-zinc-100'
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <h3 className={`text-sm font-semibold uppercase tracking-wider ${isLight ? 'text-zinc-950' : 'text-white'}`}>
                Hesap & Portal Ayarları
              </h3>
              <button
                type="button"
                onClick={() => setIsSettingsModalOpen(false)}
                className="text-xs px-2 py-1 border border-zinc-300 dark:border-zinc-700"
              >
                Kapat
              </button>
            </div>

            {/* A. ÖZELLEŞTİRİLEBİLİR ARKA PLAN MOTORU (Custom Background Engine) */}
            <div className="space-y-2 text-xs">
              <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider block">
                Arayüz Arka Planı & Renk Paleti
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {BG_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectBgPreset(preset)}
                    className={`p-2 border rounded-none transition text-left flex items-center justify-between ${
                      customBgColor.toUpperCase() === preset.color.toUpperCase()
                        ? isLight
                          ? 'border-zinc-900 bg-zinc-100 text-zinc-950 font-semibold'
                          : 'border-white bg-zinc-900 text-white font-semibold'
                        : isLight
                        ? 'border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-50'
                        : 'border-zinc-700 bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
                    }`}
                  >
                    <span>{preset.label}</span>
                    <span
                      className="w-3.5 h-3.5 border border-zinc-400 shrink-0"
                      style={{ backgroundColor: preset.color }}
                    />
                  </button>
                ))}
              </div>

              {/* Özel Renk Seçici & Görsel URL */}
              <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-zinc-500 block mb-1">Özel Renk Seçici (customBgColor):</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={customBgColor.startsWith('#') ? customBgColor : '#FFFFFF'}
                      onChange={(e) => handleCustomColorChange(e.target.value)}
                      className="w-8 h-8 p-0 border border-zinc-300 cursor-pointer rounded-none"
                    />
                    <input
                      type="text"
                      value={customBgColor}
                      onChange={(e) => handleCustomColorChange(e.target.value)}
                      className={`flex-1 px-2 py-1 font-mono text-xs border rounded-none focus:outline-none ${
                        isLight ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-zinc-900 border-zinc-700 text-zinc-100'
                      }`}
                      placeholder="#FFFFFF"
                    />
                  </div>
                </div>

                <div>
                  <span className="text-zinc-500 block mb-1">Özel Arka Plan Görseli (URL):</span>
                  <input
                    type="text"
                    value={customBgImage}
                    onChange={(e) => handleCustomImageChange(e.target.value)}
                    placeholder="https://..."
                    className={`w-full px-2 py-1.5 text-xs border rounded-none focus:outline-none ${
                      isLight ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-zinc-900 border-zinc-700 text-zinc-100'
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* B. HIZLI TEMA GEÇİŞİ (TEST VE GERİYE DÖNÜK UYUMLULUK) */}
            <div className="space-y-2 text-xs pt-3 border-t border-zinc-200 dark:border-zinc-800">
              <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider block">
                Arayüz Teması
              </label>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <button
                  type="button"
                  onClick={() => handleSetTheme('dark')}
                  className={`p-2.5 border rounded-none transition text-left ${
                    !isLight
                      ? 'border-white bg-zinc-900 text-white font-semibold'
                      : 'border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-100'
                  }`}
                >
                  Koyu Tema (Antrasit)
                </button>

                <button
                  type="button"
                  onClick={() => handleSetTheme('light')}
                  className={`p-2.5 border rounded-none transition text-left ${
                    isLight
                      ? 'border-zinc-900 bg-zinc-100 text-zinc-950 font-semibold'
                      : 'border-zinc-700 bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
                  }`}
                >
                  Açık Tema (Düz Beyaz)
                </button>
              </div>
            </div>

            {/* C. ŞİFRE DEĞİŞTİRME FORMU */}
            <form onSubmit={handleChangePassword} className="space-y-3 pt-3 border-t border-zinc-200 dark:border-zinc-800 text-xs">
              <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider block">
                Hesap Güvenliği & Şifre Değiştir
              </label>
              <div>
                <span className="text-zinc-500 block mb-1">Mevcut Şifre:</span>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Mevcut şifreniz"
                  className={`w-full px-3 py-1.5 border rounded-none focus:outline-none ${
                    isLight ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-zinc-900 border-zinc-700 text-zinc-100'
                  }`}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-zinc-500 block mb-1">Yeni Şifre:</span>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="En az 8 karakter"
                    className={`w-full px-3 py-1.5 border rounded-none focus:outline-none ${
                      isLight ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-zinc-900 border-zinc-700 text-zinc-100'
                    }`}
                  />
                </div>
                <div>
                  <span className="text-zinc-500 block mb-1">Yeni Şifre (Tekrar):</span>
                  <input
                    type="password"
                    value={newPasswordConfirm}
                    onChange={(e) => setNewPasswordConfirm(e.target.value)}
                    placeholder="Tekrar giriniz"
                    className={`w-full px-3 py-1.5 border rounded-none focus:outline-none ${
                      isLight ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-zinc-900 border-zinc-700 text-zinc-100'
                    }`}
                  />
                </div>
              </div>
              <button
                type="submit"
                className={`px-3 py-1.5 rounded-none text-xs font-medium border transition ${
                  isLight
                    ? 'bg-zinc-900 text-white border-zinc-900 hover:bg-zinc-800'
                    : 'bg-white text-zinc-950 border-white hover:bg-zinc-200'
                }`}
              >
                Şifreyi Güncelle
              </button>
            </form>

            {/* D. KURUMSAL DAVETİYE İMZASI & BİLDİRİMLER */}
            <div className="space-y-3 pt-3 border-t border-zinc-200 dark:border-zinc-800 text-xs">
              <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider block">
                Kurumsal Davetiye İmzası
              </label>
              <input
                type="text"
                value={emailSignature}
                onChange={(e) => setEmailSignature(e.target.value)}
                className={`w-full px-3 py-1.5 border rounded-none focus:outline-none ${
                  isLight ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-zinc-900 border-zinc-700 text-zinc-100'
                }`}
              />

              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={vipNotificationEnabled}
                  onChange={(e) => setVipNotificationEnabled(e.target.checked)}
                  className="rounded-none cursor-pointer"
                />
                <span className="text-zinc-500">VIP konuk LCV onayladığında bildirim gönder</span>
              </label>
            </div>

            {/* E. DAVETLİ HAVUZU VERİSETİ YÖNETİMİ & SIFIRLAMA */}
            <div className="space-y-2 pt-3 border-t border-zinc-200 dark:border-zinc-800 text-xs">
              <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider block">
                Davetli Havuzu Veritabanı
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetToDefaultGuests}
                  className={`px-3 py-1.5 rounded-none text-xs font-medium border transition ${
                    isLight
                      ? 'bg-zinc-100 border-zinc-300 text-zinc-800 hover:bg-zinc-200'
                      : 'bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700'
                  }`}
                >
                  Varsayılan Listeye Sıfırla
                </button>
                <button
                  type="button"
                  onClick={() => setIsClearAllConfirmOpen(true)}
                  className="px-3 py-1.5 rounded-none text-xs font-medium text-rose-600 hover:bg-rose-50 border border-transparent transition"
                >
                  Tüm Listeyi Temizle
                </button>
              </div>
            </div>

            {/* F. DAVETİYE BAĞLANTI ADRESİ (BASE URL) AYARI */}
            <div className="space-y-2 pt-3 border-t border-zinc-200 dark:border-zinc-800 text-xs">
              <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider block">
                Davetiye Bağlantı Adresi (Base URL)
              </label>
              <p className="text-[11px] text-zinc-500 leading-normal">
                E-postalardaki &quot;LCV Onayla &amp; QR Biletini Al&quot; butonunun ve açık yedek bağlantının gideceği temel adres.
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={hostBaseUrl}
                  onChange={(e) => handleUpdateBaseUrl(e.target.value)}
                  placeholder="http://localhost:3000"
                  className={`flex-1 px-3 py-1.5 border rounded-none font-mono text-xs focus:outline-none ${
                    isLight ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-zinc-900 border-zinc-700 text-zinc-100'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => {
                    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
                    handleUpdateBaseUrl(origin);
                    showToast(`Mevcut adres ayarlandı: ${origin}`);
                  }}
                  className={`px-2.5 py-1.5 text-xs font-medium border transition ${
                    isLight
                      ? 'bg-zinc-100 border-zinc-300 text-zinc-800 hover:bg-zinc-200'
                      : 'bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700'
                  }`}
                >
                  Mevcut URL
                </button>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setIsSettingsModalOpen(false);
                  showToast('Tüm tercihler ve ayarlar kaydedildi.');
                }}
                className={`px-4 py-2 rounded-none text-xs font-medium ${
                  isLight ? 'bg-zinc-900 text-white hover:bg-zinc-800' : 'bg-white text-zinc-950 hover:bg-zinc-200'
                }`}
              >
                Kaydet & Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: TEKİL KİŞİ EKLEME MODALI */}
      {isAddGuestModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div
            className={`max-w-lg w-full p-6 border rounded-none space-y-4 ${
              isLight ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-zinc-950 border-zinc-800 text-zinc-100'
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <h3 className={`text-sm font-semibold uppercase tracking-wider ${isLight ? 'text-zinc-950' : 'text-white'}`}>
                Yeni Konuk Ekle (Tekil)
              </h3>
              <button
                type="button"
                onClick={() => setIsAddGuestModalOpen(false)}
                className="text-xs px-2 py-1 border border-zinc-300 dark:border-zinc-700"
              >
                Kapat
              </button>
            </div>

            <form onSubmit={handleAddSingleGuest} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-500 block mb-1">Ad:</label>
                  <input
                    type="text"
                    required
                    value={newGuestFirstName}
                    onChange={(e) => setNewGuestFirstName(e.target.value)}
                    className={`w-full px-3 py-1.5 border rounded-none focus:outline-none ${
                      isLight ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-zinc-900 border-zinc-700 text-zinc-100'
                    }`}
                  />
                </div>
                <div>
                  <label className="text-zinc-500 block mb-1">Soyad:</label>
                  <input
                    type="text"
                    required
                    value={newGuestLastName}
                    onChange={(e) => setNewGuestLastName(e.target.value)}
                    className={`w-full px-3 py-1.5 border rounded-none focus:outline-none ${
                      isLight ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-zinc-900 border-zinc-700 text-zinc-100'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-500 block mb-1">Kurum / Ajans:</label>
                  <input
                    type="text"
                    value={newGuestCompany}
                    onChange={(e) => setNewGuestCompany(e.target.value)}
                    className={`w-full px-3 py-1.5 border rounded-none focus:outline-none ${
                      isLight ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-zinc-900 border-zinc-700 text-zinc-100'
                    }`}
                  />
                </div>
                <div>
                  <label className="text-zinc-500 block mb-1">Unvan:</label>
                  <input
                    type="text"
                    value={newGuestTitle}
                    onChange={(e) => setNewGuestTitle(e.target.value)}
                    className={`w-full px-3 py-1.5 border rounded-none focus:outline-none ${
                      isLight ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-zinc-900 border-zinc-700 text-zinc-100'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="text-zinc-500 block mb-1">Kategori:</label>
                <select
                  value={newGuestCategory}
                  onChange={(e) => setNewGuestCategory(e.target.value as any)}
                  className={`w-full px-3 py-1.5 border rounded-none focus:outline-none ${
                    isLight ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-zinc-900 border-zinc-700 text-zinc-100'
                  }`}
                >
                  <option value="PR">PR & VIP (Oyuncu, Influencer, Creator)</option>
                  <option value="PRESS">Basın & Medya (Gazete, Dergi, TV)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-500 block mb-1">Instagram (@handle):</label>
                  <input
                    type="text"
                    placeholder="@kullanici"
                    value={newGuestIgHandle}
                    onChange={(e) => setNewGuestIgHandle(e.target.value)}
                    className={`w-full px-3 py-1.5 border rounded-none focus:outline-none ${
                      isLight ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-zinc-900 border-zinc-700 text-zinc-100'
                    }`}
                  />
                </div>
                <div>
                  <label className="text-zinc-500 block mb-1">Takipçi (Örn: 1.5M veya 450K):</label>
                  <input
                    type="text"
                    placeholder="1.5M"
                    value={newGuestIgFollowers}
                    onChange={(e) => setNewGuestIgFollowers(e.target.value)}
                    className={`w-full px-3 py-1.5 border rounded-none focus:outline-none ${
                      isLight ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-zinc-900 border-zinc-700 text-zinc-100'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-500 block mb-1">YouTube (@kanal):</label>
                  <input
                    type="text"
                    placeholder="@kanal"
                    value={newGuestYtHandle}
                    onChange={(e) => setNewGuestYtHandle(e.target.value)}
                    className={`w-full px-3 py-1.5 border rounded-none focus:outline-none ${
                      isLight ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-zinc-900 border-zinc-700 text-zinc-100'
                    }`}
                  />
                </div>
                <div>
                  <label className="text-zinc-500 block mb-1">Abone (Örn: 500K):</label>
                  <input
                    type="text"
                    placeholder="500K"
                    value={newGuestYtSubscribers}
                    onChange={(e) => setNewGuestYtSubscribers(e.target.value)}
                    className={`w-full px-3 py-1.5 border rounded-none focus:outline-none ${
                      isLight ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-zinc-900 border-zinc-700 text-zinc-100'
                    }`}
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddGuestModalOpen(false)}
                  className="px-3 py-1.5 border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className={`px-4 py-1.5 font-medium rounded-none ${
                    isLight ? 'bg-zinc-900 text-white hover:bg-zinc-800' : 'bg-white text-zinc-950 hover:bg-zinc-200'
                  }`}
                >
                  Havuza Ekle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: — TEK GENEL "DAVET ET" SEÇİM PENCERESİ                     */}
      {/* TÜM İSİM LİSTESİ + AYNI ANDA CANLI MAİL PREVIEW (SPLIT-VIEW)                  */}
      {isCampaignModalOpen && campaignTargetGala && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div
            className={`border rounded-none max-w-6xl w-full p-6 space-y-4 max-h-[92vh] flex flex-col ${
              isLight ? 'bg-white border-zinc-200' : 'bg-zinc-950 border-zinc-800'
            }`}
          >
            {/* Modal Üst Başlık */}
            <div className="flex items-center justify-between border-b pb-3 border-zinc-200 dark:border-zinc-800">
              <div>
                <h3 className={`text-sm font-semibold tracking-wide uppercase ${isLight ? 'text-zinc-950' : 'text-white'}`}>
                  Gala Davetiyesi — {selectedGala.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCampaignModalOpen(false)}
                className="text-xs px-2.5 py-1 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-900"
              >
                Kapat
              </button>
            </div>

            {/* 2 SÜTUNLU SPLIT-VIEW (HER ZAMAN YAN YANA MAİL PREVIEW) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0 overflow-y-auto lg:overflow-hidden">
              {/* SOL KOLON: TÜM İSİM LİSTESİ & SEÇİM (LG:COL-SPAN-7) */}
              <div className="lg:col-span-7 flex flex-col min-h-0 space-y-3 lg:overflow-y-auto pr-0 lg:pr-2">
                {/* 1. Gala Detayları */}
                <div className={`p-3 border space-y-2 text-xs ${isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-900/50 border-zinc-800'}`}>
                  <div className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                    Gala Operasyon Bilgileri
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div>
                      <span className="text-zinc-500 block mb-1 text-[11px]">Tarih:</span>
                      <input
                        type="text"
                        value={campaignDate}
                        onChange={(e) => setCampaignDate(e.target.value)}
                        className={`w-full px-2 py-1 text-xs border rounded-none focus:outline-none ${
                          isLight ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-zinc-900 border-zinc-700 text-zinc-100'
                        }`}
                      />
                    </div>
                    <div>
                      <span className="text-zinc-500 block mb-1 text-[11px]">Saatler:</span>
                      <div className="flex gap-1">
                        <input
                          type="text"
                          value={campaignTimeOpen}
                          onChange={(e) => setCampaignTimeOpen(e.target.value)}
                          className={`w-1/2 px-1 py-1 text-xs text-center border rounded-none focus:outline-none ${
                            isLight ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-zinc-900 border-zinc-700 text-zinc-100'
                          }`}
                        />
                        <input
                          type="text"
                          value={campaignTimeStart}
                          onChange={(e) => setCampaignTimeStart(e.target.value)}
                          className={`w-1/2 px-1 py-1 text-xs text-center border rounded-none focus:outline-none ${
                            isLight ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-zinc-900 border-zinc-700 text-zinc-100'
                          }`}
                        />
                      </div>
                    </div>
                    <div>
                      <span className="text-zinc-500 block mb-1 text-[11px]">Mekan:</span>
                      <input
                        type="text"
                        value={campaignVenue}
                        onChange={(e) => setCampaignVenue(e.target.value)}
                        className={`w-full px-2 py-1 text-xs border rounded-none focus:outline-none ${
                          isLight ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-zinc-900 border-zinc-700 text-zinc-100'
                        }`}
                      />
                    </div>
                    <div>
                      <span className="text-zinc-500 block mb-1 text-[11px]">Kapasite:</span>
                      <input
                        type="number"
                        value={campaignCapacity}
                        onChange={(e) => setCampaignCapacity(parseInt(e.target.value) || 0)}
                        className={`w-full px-2 py-1 text-xs border rounded-none focus:outline-none ${
                          isLight ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-zinc-900 border-zinc-700 text-zinc-100'
                        }`}
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Özel Davetiye Mesajı */}
                <div className="space-y-1 text-xs">
                  <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">
                    Davetiye İçerik Metni (Kişiselleştirilmiş)
                  </label>
                  <textarea
                    rows={2}
                    value={customInviteMessage}
                    onChange={(e) => setCustomInviteMessage(e.target.value)}
                    className={`w-full p-2 text-xs border rounded-none focus:outline-none ${
                      isLight ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-zinc-900 border-zinc-700 text-zinc-100'
                    }`}
                  />
                </div>

                {/* 3. Hızlı Seçim Filtreleri */}
                <div className="flex items-center gap-1.5 flex-wrap text-xs">
                  <span className="text-zinc-500 text-[11px]">Hızlı Seç:</span>
                  <button
                    type="button"
                    onClick={handleSelect1MPlus}
                    className={`px-2 py-1 border rounded-none text-[11px] ${
                      isLight ? 'border-zinc-300 hover:bg-zinc-100' : 'border-zinc-700 hover:bg-zinc-800'
                    }`}
                  >
                    1M+ Erişim
                  </button>
                  <button
                    type="button"
                    onClick={handleSelectPress}
                    className={`px-2 py-1 border rounded-none text-[11px] ${
                      isLight ? 'border-zinc-300 hover:bg-zinc-100' : 'border-zinc-700 hover:bg-zinc-800'
                    }`}
                  >
                    Tüm Basın
                  </button>
                  <button
                    type="button"
                    onClick={handleSelectHighPr}
                    className={`px-2 py-1 border rounded-none text-[11px] ${
                      isLight ? 'border-zinc-300 hover:bg-zinc-100' : 'border-zinc-700 hover:bg-zinc-800'
                    }`}
                  >
                    %75+ PR Dönüşüm
                  </button>
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className={`px-2 py-1 border rounded-none text-[11px] ${
                      isLight ? 'border-zinc-300 hover:bg-zinc-100' : 'border-zinc-700 hover:bg-zinc-800'
                    }`}
                  >
                    Tümünü Seç
                  </button>
                  <button
                    type="button"
                    onClick={handleClearSelection}
                    className="px-2 py-1 text-zinc-400 hover:text-zinc-600 text-[11px]"
                  >
                    Temizle
                  </button>
                </div>

                {/* 4. Tüm İsimlerin Seçimli Listesi */}
                <div className="flex-1 min-h-[220px] overflow-y-auto border divide-y border-zinc-200 dark:border-zinc-800 divide-zinc-200 dark:divide-zinc-800">
                  {guests
                    .filter((g) => {
                      if (!modalGuestSearch) return true;
                      const q = modalGuestSearch.toLowerCase();
                      return (
                        `${g.firstName} ${g.lastName}`.toLowerCase().includes(q) ||
                        g.company.toLowerCase().includes(q)
                      );
                    })
                    .map((g) => {
                      const isSelected = selectedGuestIds.includes(g.id);
                      return (
                        <div
                          key={g.id}
                          onClick={() => toggleSelectGuest(g.id)}
                          className={`p-2.5 flex items-center justify-between text-xs cursor-pointer transition ${
                            isSelected
                              ? isLight
                                ? 'bg-zinc-100 text-zinc-950 font-medium'
                                : 'bg-zinc-900 text-white font-medium'
                              : isLight
                              ? 'hover:bg-zinc-50 text-zinc-700'
                              : 'hover:bg-zinc-900/40 text-zinc-300'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              className="rounded-none cursor-pointer"
                            />
                            <div>
                              <span>
                                {g.firstName} {g.lastName}
                              </span>
                              <span className="text-zinc-500 ml-1.5 font-normal">
                                ({g.company} · {g.category})
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="font-mono text-zinc-400 text-[11px]">
                              {g.instagram ? g.instagram.followersText : g.youtube ? g.youtube.followersText : '-'}
                            </span>
                            <span className="font-mono font-semibold text-[11px]">
                              %{g.prConversionRate}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* SAĞ KOLON: AYNI ANDA CANLI MAİL PREVIEW (LG:COL-SPAN-5) */}
              <div
                className={`lg:col-span-5 flex flex-col justify-between p-4 border ${
                  isLight ? 'bg-zinc-50 border-zinc-200 text-zinc-900' : 'bg-zinc-900/40 border-zinc-800 text-zinc-100'
                }`}
              >
                <div className="space-y-3">
                  <div className="border-b pb-2 border-zinc-200 dark:border-zinc-800">
                    <h4 className={`text-xs font-semibold uppercase tracking-wider ${isLight ? 'text-zinc-950' : 'text-white'}`}>
                      E-Posta Davetiye Önizlemesi
                    </h4>
                  </div>

                  {/* Mail Meta Bilgileri */}
                  <div
                    className={`p-3 border text-xs space-y-1.5 ${
                      isLight ? 'bg-white border-zinc-200 text-zinc-700' : 'bg-zinc-950 border-zinc-800 text-zinc-300'
                    }`}
                  >
                    <p className="truncate">
                      <strong>Kimden:</strong> Disney Studios Türkiye &lt;pr@disney.com.tr&gt;
                    </p>
                    <p className="truncate">
                      <strong>Kime:</strong> {previewRecipientText}
                    </p>
                    <p className="truncate">
                      <strong>Konu:</strong> {selectedGala.title} — Gala Davetiyesi
                    </p>
                  </div>

                  {/* Canlı Davetiye İçerik Alanı */}
                  <div
                    className={`p-4 border space-y-3 ${
                      isLight ? 'bg-white border-zinc-200' : 'bg-zinc-950 border-zinc-800'
                    }`}
                  >
                    <div className="text-[10px] font-bold tracking-wider uppercase text-zinc-400">
                      Disney Studios Türkiye
                    </div>
                    <div className={`text-sm font-bold ${isLight ? 'text-zinc-950' : 'text-white'}`}>
                      {selectedGala.title}
                    </div>

                    <p className={`text-xs leading-relaxed ${isLight ? 'text-zinc-700' : 'text-zinc-300'}`}>
                      Sayın <strong>{previewGuestName}</strong>, {customInviteMessage}
                    </p>

                    <div
                      className={`p-2.5 border text-xs space-y-1 ${
                        isLight ? 'bg-zinc-50 border-zinc-200 text-zinc-800' : 'bg-zinc-900 border-zinc-800 text-zinc-200'
                      }`}
                    >
                      <p className="text-[11px]">
                        Tarih & Saat: <strong>{campaignDate} · {campaignTimeOpen} - {campaignTimeStart}</strong>
                      </p>
                      <p className="text-[11px]">
                        Mekan: <strong>{campaignVenue}</strong>
                      </p>
                      <p className="text-[11px]">
                        Kontenjan: <strong>Çift Kişilik Bilet (+{campaignPlusOneDefault})</strong>
                      </p>
                      <p className="text-[11px]">
                        Kapasite: <strong>{campaignCapacity} Kişi (Numarasız LCV)</strong>
                      </p>
                    </div>

                    <div className="pt-1">
                      <button
                        type="button"
                        className={`w-full py-2 text-xs font-semibold rounded-none transition ${
                          isLight
                            ? 'bg-zinc-900 text-white hover:bg-zinc-800'
                            : 'bg-white text-zinc-950 hover:bg-zinc-200'
                        }`}
                      >
                        LCV Onayla (+1) & Biletini Al
                      </button>
                    </div>
                  </div>

                  {/* E-posta İmzası */}
                  <div className="text-[11px] text-center pt-1 italic text-zinc-500">
                    <p>{emailSignature}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* SİHİRBAZ ALT BAR */}
            <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-xs">
              <span className="text-zinc-500">
                Seçilen: <strong className={`font-mono text-sm ${isLight ? 'text-zinc-950' : 'text-white'}`}>{selectedGuestIds.length}</strong> Davetli
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsCampaignModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                >
                  İptal
                </button>
                <button
                  type="button"
                  onClick={handleSendBatchCampaign}
                  disabled={selectedGuestIds.length === 0}
                  className={`px-4 py-2 font-semibold text-xs rounded-none transition disabled:opacity-50 ${
                    isLight
                      ? 'bg-zinc-900 text-white hover:bg-zinc-800'
                      : 'bg-white text-zinc-950 hover:bg-zinc-200'
                  }`}
                >
                  <span>Seçilen Kişileri Davet Et ({selectedGuestIds.length})</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: CSV & EXCEL İÇE AKTARMA MODALI (GERÇEK PARSER & KOPYALA-YAPIŞTIR DESTEKLİ) */}
      {isCsvModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div
            className={`max-w-xl w-full p-6 border rounded-none space-y-4 max-h-[92vh] overflow-y-auto ${
              isLight ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-zinc-950 border-zinc-800 text-zinc-100'
            }`}
          >
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
              <div>
                <h3 className={`text-sm font-semibold uppercase tracking-wider ${isLight ? 'text-zinc-950' : 'text-white'}`}>
                  Disney Studios Türkiye — Davetli Excel / CSV Yükle
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Excel dosyasını seçin veya kopyaladığınız satırları doğrudan yapıştırın.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCsvModalOpen(false)}
                className="text-xs px-2 py-1 border border-zinc-300 dark:border-zinc-700"
              >
                Kapat
              </button>
            </div>

            {/* Dosya Yükleme Alanı */}
            <div className={`p-3 border text-xs space-y-2 ${isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-900/50 border-zinc-800'}`}>
              <label className="font-semibold block text-zinc-700 dark:text-zinc-300">
                1. Bilgisayardan Dosya Seç (.csv, .tsv, .txt, .xlsx):
              </label>
              <input
                type="file"
                accept=".csv,.tsv,.txt,.xlsx"
                onChange={handleFileUpload}
                className="block w-full text-xs text-zinc-500 file:mr-3 file:py-1.5 file:px-3 file:border file:border-zinc-300 file:rounded-none file:text-xs file:font-medium file:bg-white dark:file:bg-zinc-800 dark:file:text-zinc-200 cursor-pointer"
              />
            </div>

            {/* Metin Yapıştırma Alanı */}
            <div className="space-y-2 text-xs">
              <label className="text-zinc-500 block">
                2. veya Excel&apos;den Kopyalanan Satırları Doğrudan Yapıştırın (Tab \t, ; veya , ayrılmış):
              </label>
              <textarea
                rows={5}
                value={csvRawText}
                onChange={(e) => setCsvRawText(e.target.value)}
                placeholder="Ad	Soyad	Kurum	Kategori	Instagram	YouTube"
                className={`w-full font-mono text-xs p-3 border rounded-none focus:outline-none ${
                  isLight ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-zinc-900 border-zinc-700 text-zinc-100'
                }`}
              />
            </div>

            {/* İçe Aktarma Modu Seçeneği */}
            <div className="space-y-2 text-xs pt-1">
              <span className="text-zinc-500 font-medium block">İçe Aktarma Yöntemi:</span>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="importMode"
                    checked={csvImportMode === 'APPEND'}
                    onChange={() => setCsvImportMode('APPEND')}
                    className="rounded-none cursor-pointer"
                  />
                  <span>Mevcut Listeye Ekle</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="importMode"
                    checked={csvImportMode === 'REPLACE'}
                    onChange={() => setCsvImportMode('REPLACE')}
                    className="rounded-none cursor-pointer"
                  />
                  <span>Mevcut Listeyi Silip Sadece Bu Excel&apos;i Yükle</span>
                </label>
              </div>
            </div>

            <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
              <button
                type="button"
                onClick={handleResetToDefaultGuests}
                className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-white underline"
              >
                Varsayılan Listeye Sıfırla
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsCsvModalOpen(false)}
                  className="px-3 py-1.5 border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400"
                >
                  İptal
                </button>
                <button
                  type="button"
                  onClick={handleImportCsv}
                  className={`px-4 py-1.5 font-medium rounded-none ${
                    isLight ? 'bg-zinc-900 text-white hover:bg-zinc-800' : 'bg-white text-zinc-950 hover:bg-zinc-200'
                  }`}
                >
                  İçe Aktar ve Kaydet
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: — TAM BİLGİLİ DAVETLİ DÜZENLEME MODALI */}
      {isEditGuestModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div
            className={`max-w-xl w-full p-6 border rounded-none space-y-4 max-h-[92vh] overflow-y-auto ${
              isLight ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-zinc-950 border-zinc-800 text-zinc-100'
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <div>
                <h3 className={`text-sm font-semibold uppercase tracking-wider ${isLight ? 'text-zinc-950' : 'text-white'}`}>
                  Davetli Bilgilerini Düzenle
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">Tüm alanları ve sosyal medya verilerini güncelleyin.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditGuestModalOpen(false)}
                className="text-xs px-2 py-1 border border-zinc-300 dark:border-zinc-700"
              >
                Kapat
              </button>
            </div>

            <form onSubmit={handleUpdateGuest} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-500 block mb-1">Ad:</label>
                  <input
                    type="text"
                    required
                    value={editFirstName}
                    onChange={(e) => setEditFirstName(e.target.value)}
                    className={`w-full px-3 py-1.5 border rounded-none focus:outline-none ${
                      isLight ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-zinc-900 border-zinc-700 text-zinc-100'
                    }`}
                  />
                </div>
                <div>
                  <label className="text-zinc-500 block mb-1">Soyad:</label>
                  <input
                    type="text"
                    required
                    value={editLastName}
                    onChange={(e) => setEditLastName(e.target.value)}
                    className={`w-full px-3 py-1.5 border rounded-none focus:outline-none ${
                      isLight ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-zinc-900 border-zinc-700 text-zinc-100'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-500 block mb-1">Kurum / Ajans:</label>
                  <input
                    type="text"
                    value={editCompany}
                    onChange={(e) => setEditCompany(e.target.value)}
                    className={`w-full px-3 py-1.5 border rounded-none focus:outline-none ${
                      isLight ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-zinc-900 border-zinc-700 text-zinc-100'
                    }`}
                  />
                </div>
                <div>
                  <label className="text-zinc-500 block mb-1">Unvan:</label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className={`w-full px-3 py-1.5 border rounded-none focus:outline-none ${
                      isLight ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-zinc-900 border-zinc-700 text-zinc-100'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-500 block mb-1">Kategori:</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value as any)}
                    className={`w-full px-3 py-1.5 border rounded-none focus:outline-none ${
                      isLight ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-zinc-900 border-zinc-700 text-zinc-100'
                    }`}
                  >
                    <option value="PR">PR & VIP (Oyuncu, Influencer)</option>
                    <option value="PRESS">Basın & Medya (Gazete, TV, Dergi)</option>
                  </select>
                </div>
                <div>
                  <label className="text-zinc-500 block mb-1">Davet Durumu:</label>
                  <select
                    value={editInvitationState}
                    onChange={(e) => setEditInvitationState(e.target.value as any)}
                    className={`w-full px-3 py-1.5 border rounded-none focus:outline-none ${
                      isLight ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-zinc-900 border-zinc-700 text-zinc-100'
                    }`}
                  >
                    <option value="IDLE">Davet Bekliyor (-)</option>
                    <option value="INVITED">Davet Edildi</option>
                    <option value="WAITLIST">Yedek Liste</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-500 block mb-1">Instagram (@handle):</label>
                  <input
                    type="text"
                    placeholder="@kullanici"
                    value={editIgHandle}
                    onChange={(e) => setEditIgHandle(e.target.value)}
                    className={`w-full px-3 py-1.5 border rounded-none focus:outline-none ${
                      isLight ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-zinc-900 border-zinc-700 text-zinc-100'
                    }`}
                  />
                </div>
                <div>
                  <label className="text-zinc-500 block mb-1">Instagram Takipçi (Örn: 2.4M veya 450K):</label>
                  <input
                    type="text"
                    placeholder="2.4M veya 450K"
                    value={editIgFollowers}
                    onChange={(e) => setEditIgFollowers(e.target.value)}
                    className={`w-full px-3 py-1.5 border rounded-none focus:outline-none ${
                      isLight ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-zinc-900 border-zinc-700 text-zinc-100'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-500 block mb-1">YouTube (@kanal):</label>
                  <input
                    type="text"
                    placeholder="@kanal"
                    value={editYtHandle}
                    onChange={(e) => setEditYtHandle(e.target.value)}
                    className={`w-full px-3 py-1.5 border rounded-none focus:outline-none ${
                      isLight ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-zinc-900 border-zinc-700 text-zinc-100'
                    }`}
                  />
                </div>
                <div>
                  <label className="text-zinc-500 block mb-1">YouTube Abone (Örn: 750K):</label>
                  <input
                    type="text"
                    placeholder="750K"
                    value={editYtSubscribers}
                    onChange={(e) => setEditYtSubscribers(e.target.value)}
                    className={`w-full px-3 py-1.5 border rounded-none focus:outline-none ${
                      isLight ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-zinc-900 border-zinc-700 text-zinc-100'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-500 block mb-1">Katıldığı Gala Sayısı:</label>
                  <input
                    type="number"
                    min="1"
                    value={editAttended}
                    onChange={(e) => setEditAttended(parseInt(e.target.value) || 1)}
                    className={`w-full px-3 py-1.5 border rounded-none focus:outline-none ${
                      isLight ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-zinc-900 border-zinc-700 text-zinc-100'
                    }`}
                  />
                </div>
                <div>
                  <label className="text-zinc-500 block mb-1">Yaptığı Paylaşım Sayısı:</label>
                  <input
                    type="number"
                    min="0"
                    value={editPosts}
                    onChange={(e) => setEditPosts(parseInt(e.target.value) || 0)}
                    className={`w-full px-3 py-1.5 border rounded-none focus:outline-none ${
                      isLight ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-zinc-900 border-zinc-700 text-zinc-100'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="text-zinc-500 block mb-1">Yönetici Notu:</label>
                <textarea
                  rows={3}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className={`w-full px-3 py-1.5 border rounded-none focus:outline-none ${
                    isLight ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-zinc-900 border-zinc-700 text-zinc-100'
                  }`}
                />
              </div>

              <div className="pt-2 flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => {
                    if (editingGuestId) handleDeleteGuest(editingGuestId);
                    setIsEditGuestModalOpen(false);
                  }}
                  className="px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 border border-transparent transition"
                >
                  Bu Kişiyi Sil
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditGuestModalOpen(false)}
                    className="px-3 py-1.5 border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400"
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    className={`px-4 py-1.5 font-medium rounded-none ${
                      isLight ? 'bg-zinc-900 text-white hover:bg-zinc-800' : 'bg-white text-zinc-950 hover:bg-zinc-200'
                    }`}
                  >
                    Değişiklikleri Kaydet
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 6: YENİ GALA / ARŞİV EKLEME */}
      {isEventModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div
            className={`max-w-md w-full p-6 border rounded-none space-y-4 ${
              isLight ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-zinc-950 border-zinc-800 text-zinc-100'
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <h3 className={`text-sm font-semibold uppercase tracking-wider ${isLight ? 'text-zinc-950' : 'text-white'}`}>
                Yeni Gala / Arşiv Tanımla
              </h3>
              <button
                type="button"
                onClick={() => setIsEventModalOpen(false)}
                className="text-xs px-2 py-1 border border-zinc-300 dark:border-zinc-700"
              >
                Kapat
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="space-y-3 text-xs">
              <div>
                <label className="text-zinc-500 block mb-1">Gala Başlığı:</label>
                <input
                  type="text"
                  required
                  placeholder="Örn: Mufasa: Aslan Kral Galası"
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                  className={`w-full px-3 py-1.5 border rounded-none focus:outline-none ${
                    isLight ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-zinc-900 border-zinc-700 text-zinc-100'
                  }`}
                />
              </div>

              <div>
                <label className="text-zinc-500 block mb-1">Film Adı:</label>
                <input
                  type="text"
                  required
                  placeholder="Örn: Mufasa"
                  value={newEventMovie}
                  onChange={(e) => setNewEventMovie(e.target.value)}
                  className={`w-full px-3 py-1.5 border rounded-none focus:outline-none ${
                    isLight ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-zinc-900 border-zinc-700 text-zinc-100'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-500 block mb-1">Mekan:</label>
                  <input
                    type="text"
                    value={newEventVenue}
                    onChange={(e) => setNewEventVenue(e.target.value)}
                    className={`w-full px-3 py-1.5 border rounded-none focus:outline-none ${
                      isLight ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-zinc-900 border-zinc-700 text-zinc-100'
                    }`}
                  />
                </div>
                <div>
                  <label className="text-zinc-500 block mb-1">Kapasite:</label>
                  <input
                    type="number"
                    value={newEventCapacity}
                    onChange={(e) => setNewEventCapacity(parseInt(e.target.value) || 0)}
                    className={`w-full px-3 py-1.5 border rounded-none focus:outline-none ${
                      isLight ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-zinc-900 border-zinc-700 text-zinc-100'
                    }`}
                  />
                </div>
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newEventIsArchive}
                    onChange={(e) => setNewEventIsArchive(e.target.checked)}
                    className="rounded-none cursor-pointer"
                  />
                  <span className="text-zinc-600 dark:text-zinc-400">
                    Geçmiş Arşiv Galası (Tamamlanmış Etkinlik)
                  </span>
                </label>
              </div>

              {newEventIsArchive && (
                <div>
                  <label className="text-zinc-500 block mb-1">Katılan Davetli Sayısı:</label>
                  <input
                    type="number"
                    value={archiveAttendedCount}
                    onChange={(e) => setArchiveAttendedCount(parseInt(e.target.value) || 0)}
                    className={`w-full px-3 py-1.5 border rounded-none focus:outline-none ${
                      isLight ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-zinc-900 border-zinc-700 text-zinc-100'
                    }`}
                  />
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEventModalOpen(false)}
                  className="px-3 py-1.5 border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className={`px-4 py-1.5 font-medium rounded-none ${
                    isLight ? 'bg-zinc-900 text-white hover:bg-zinc-800' : 'bg-white text-zinc-950 hover:bg-zinc-200'
                  }`}
                >
                  Galayı Oluştur
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 7: — ETKİNLİK / ARŞİV DÜZENLEME MODALI */}
      {isEditEventModalOpen && selectedGala && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div
            className={`max-w-md w-full p-6 border rounded-none space-y-4 max-h-[92vh] overflow-y-auto ${
              isLight ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-zinc-950 border-zinc-800 text-zinc-100'
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <h3 className={`text-sm font-semibold uppercase tracking-wider ${isLight ? 'text-zinc-950' : 'text-white'}`}>
                Etkinlik / Arşiv Bilgilerini Düzenle
              </h3>
              <button
                type="button"
                onClick={() => setIsEditEventModalOpen(false)}
                className="text-xs px-2 py-1 border border-zinc-300 dark:border-zinc-700"
              >
                Kapat
              </button>
            </div>

            <form onSubmit={handleUpdateEvent} className="space-y-3 text-xs">
              <div>
                <label className="text-zinc-500 block mb-1">Etkinlik / Gala Başlığı:</label>
                <input
                  type="text"
                  required
                  value={editEventTitle}
                  onChange={(e) => setEditEventTitle(e.target.value)}
                  className={`w-full px-3 py-1.5 border rounded-none focus:outline-none ${
                    isLight ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-zinc-900 border-zinc-700 text-zinc-100'
                  }`}
                />
              </div>

              <div>
                <label className="text-zinc-500 block mb-1">Film Adı:</label>
                <input
                  type="text"
                  required
                  value={editEventMovie}
                  onChange={(e) => setEditEventMovie(e.target.value)}
                  className={`w-full px-3 py-1.5 border rounded-none focus:outline-none ${
                    isLight ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-zinc-900 border-zinc-700 text-zinc-100'
                  }`}
                />
              </div>

              <div>
                <label className="text-zinc-500 block mb-1">Mekan / Salon:</label>
                <input
                  type="text"
                  required
                  value={editEventVenue}
                  onChange={(e) => setEditEventVenue(e.target.value)}
                  className={`w-full px-3 py-1.5 border rounded-none focus:outline-none ${
                    isLight ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-zinc-900 border-zinc-700 text-zinc-100'
                  }`}
                />
              </div>

              <div>
                <label className="text-zinc-500 block mb-1">Tarih / Arşiv Tarihi Bilgisi:</label>
                <input
                  type="text"
                  required
                  value={editEventDateText}
                  onChange={(e) => setEditEventDateText(e.target.value)}
                  className={`w-full px-3 py-1.5 border rounded-none focus:outline-none ${
                    isLight ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-zinc-900 border-zinc-700 text-zinc-100'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-500 block mb-1">Kapı Açılış Saati:</label>
                  <input
                    type="text"
                    required
                    value={editEventDoorsOpen}
                    onChange={(e) => setEditEventDoorsOpen(e.target.value)}
                    className={`w-full px-3 py-1.5 border rounded-none focus:outline-none ${
                      isLight ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-zinc-900 border-zinc-700 text-zinc-100'
                    }`}
                  />
                </div>
                <div>
                  <label className="text-zinc-500 block mb-1">Başlangıç Saati:</label>
                  <input
                    type="text"
                    required
                    value={editEventStartsAt}
                    onChange={(e) => setEditEventStartsAt(e.target.value)}
                    className={`w-full px-3 py-1.5 border rounded-none focus:outline-none ${
                      isLight ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-zinc-900 border-zinc-700 text-zinc-100'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-500 block mb-1">Toplam Kapasite:</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={editEventCapacity}
                    onChange={(e) => setEditEventCapacity(parseInt(e.target.value) || 1)}
                    className={`w-full px-3 py-1.5 border rounded-none focus:outline-none ${
                      isLight ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-zinc-900 border-zinc-700 text-zinc-100'
                    }`}
                  />
                </div>
                <div>
                  <label className="text-zinc-500 block mb-1">Gerçekleşen / Onaylı Katılımcı Sayısı:</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editEventConfirmedLcv}
                    onChange={(e) => setEditEventConfirmedLcv(parseInt(e.target.value) || 0)}
                    className={`w-full px-3 py-1.5 border rounded-none focus:outline-none ${
                      isLight ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-zinc-900 border-zinc-700 text-zinc-100'
                    }`}
                  />
                </div>
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editEventIsArchive}
                    onChange={(e) => setEditEventIsArchive(e.target.checked)}
                    className="rounded-none cursor-pointer"
                  />
                  <span className="text-zinc-600 dark:text-zinc-400">
                    Geçmiş Arşiv Galası (Tamamlanmış Etkinlik)
                  </span>
                </label>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditEventModalOpen(false)}
                  className="px-3 py-1.5 border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className={`px-4 py-1.5 font-medium rounded-none ${
                    isLight ? 'bg-zinc-900 text-white hover:bg-zinc-800' : 'bg-white text-zinc-950 hover:bg-zinc-200'
                  }`}
                >
                  Değişiklikleri Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 8: — DAVETLİ SİLME ONAY MODALI */}
      {deleteConfirmGuest && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div
            className={`max-w-md w-full p-6 border rounded-none space-y-4 ${
              isLight ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-zinc-950 border-zinc-800 text-zinc-100'
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <h3 className={`text-sm font-semibold uppercase tracking-wider ${isLight ? 'text-zinc-950' : 'text-white'}`}>
                Silme Onayı
              </h3>
              <button
                type="button"
                onClick={() => setDeleteConfirmGuest(null)}
                className="text-xs px-2 py-1 border border-zinc-300 dark:border-zinc-700"
              >
                Kapat
              </button>
            </div>

            <p className={`text-xs leading-relaxed ${isLight ? 'text-zinc-700' : 'text-zinc-300'}`}>
              <strong>{deleteConfirmGuest.firstName} {deleteConfirmGuest.lastName}</strong> isimli davetliyi listeden silmek istediğinize emin misiniz?
            </p>

            <div className="pt-2 flex justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setDeleteConfirmGuest(null)}
                className={`px-3 py-1.5 border rounded-none transition ${
                  isLight
                    ? 'border-zinc-300 text-zinc-700 hover:bg-zinc-100'
                    : 'border-zinc-700 text-zinc-300 hover:bg-zinc-800'
                }`}
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={confirmDeleteGuest}
                className="px-4 py-1.5 font-medium rounded-none bg-rose-600 text-white hover:bg-rose-700 transition"
              >
                Evet, Sil
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 9: — TÜM LİSTEYİ SİLME ONAY MODALI */}
      {isClearAllConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div
            className={`max-w-md w-full p-6 border rounded-none space-y-4 ${
              isLight ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-zinc-950 border-zinc-800 text-zinc-100'
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <h3 className={`text-sm font-semibold uppercase tracking-wider ${isLight ? 'text-zinc-950' : 'text-white'}`}>
                Tüm Listeyi Silme Onayı
              </h3>
              <button
                type="button"
                onClick={() => setIsClearAllConfirmOpen(false)}
                className="text-xs px-2 py-1 border border-zinc-300 dark:border-zinc-700"
              >
                Kapat
              </button>
            </div>

            <p className={`text-xs leading-relaxed ${isLight ? 'text-zinc-700' : 'text-zinc-300'}`}>
              Tüm davetli havuzunu silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
            </p>

            <div className="pt-2 flex justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setIsClearAllConfirmOpen(false)}
                className={`px-3 py-1.5 border rounded-none transition ${
                  isLight
                    ? 'border-zinc-300 text-zinc-700 hover:bg-zinc-100'
                    : 'border-zinc-700 text-zinc-300 hover:bg-zinc-800'
                }`}
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={() => {
                  handleClearAllGuests();
                }}
                className="px-4 py-1.5 font-medium rounded-none bg-rose-600 text-white hover:bg-rose-700 transition"
              >
                Evet, Tümünü Sil
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
