'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import {
  Film,
  Calendar,
  Users,
  Mail,
  Send,
  Plus,
  CheckCircle2,
  Clock,
  Sparkles,
  Search,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Instagram,
  Youtube,
  ShieldCheck,
  Building2,
  UserCheck,
  Moon,
  Sun,
  Filter,
  Check,
  AlertCircle,
  X,
  Compass,
  FileText,
  Flame,
  Award,
  ChevronDown,
  Layers,
  ArrowUpRight,
  Download,
  Share2,
} from 'lucide-react';
import { USER_EXCEL_GUESTS } from './host-guests-data';

// --- VERİ TİPLERİ ---
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
  distributor: string;
  venue: string;
  doorsOpenAt: string;
  startsAt: string;
  capacity: number;
  confirmedLcv: number;
  occupancyRate: number;
  isHistoricalArchive: boolean;
  archiveDate?: string;
  eventDateText: string;
  bannerGradient: string;
  synopsis: string;
  targetAudience: string;
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
  galaTitle: string;
}

// --- MOCK VERİ SETİ (GÜNCEL & ZENGİN) ---
const INITIAL_GALAS: HostGala[] = [
  {
    id: 'evt-disney-moana2',
    title: 'Moana 2 Türkiye Özel Prömiyeri & Gala',
    movieTitle: 'Moana 2',
    distributor: 'Walt Disney Studios Türkiye',
    venue: 'Zorlu PSM Turkcell Sahnesi & Kırmızı Halı, İstanbul',
    doorsOpenAt: '18:30',
    startsAt: '20:00',
    capacity: 650,
    confirmedLcv: 498,
    occupancyRate: 76.6,
    isHistoricalArchive: false,
    eventDateText: '27 Kasım 2024, Çarşamba',
    bannerGradient: 'from-amber-600/30 via-orange-950/40 to-zinc-950',
    synopsis: 'Okyanusların çağrısına kulak veren Moana ve Maui, yeni maceraları için Türkiye prömiyerinde sinemaseverlerle buluşuyor.',
    targetAudience: 'VIP Aileler, Popüler Kültür Influencerları, Ana Akım Basın',
  },
  {
    id: 'evt-disney-mufasa',
    title: 'Mufasa: Aslan Kral Özel Gösterimi',
    movieTitle: 'Mufasa: Aslan Kral',
    distributor: 'Walt Disney Studios Türkiye',
    venue: 'Paribu Cineverse Kanyon VIP Salonu, İstanbul',
    doorsOpenAt: '19:00',
    startsAt: '20:15',
    capacity: 380,
    confirmedLcv: 290,
    occupancyRate: 76.3,
    isHistoricalArchive: false,
    eventDateText: '18 Aralık 2024, Çarşamba',
    bannerGradient: 'from-yellow-600/30 via-amber-950/40 to-zinc-950',
    synopsis: 'Efsanevi kral Mufasa’nın yükselişi ve aslan krallığının başlangıç hikayesi özel basın ve davetli gösterimiyle sahnede.',
    targetAudience: 'Kültür & Sanat Yazarları, Sinema Eleştirmenleri, A+ Oyuncular',
  },
  {
    id: 'evt-disney-deadpool',
    title: 'Deadpool & Wolverine Fan & VIP Galası (Arşiv)',
    movieTitle: 'Deadpool & Wolverine',
    distributor: 'Marvel Studios / Disney Türkiye',
    venue: 'Kanyon AVM Özel Alanı',
    doorsOpenAt: '19:30',
    startsAt: '20:30',
    capacity: 500,
    confirmedLcv: 496,
    occupancyRate: 99.2,
    isHistoricalArchive: true,
    archiveDate: '24 Temmuz 2024',
    eventDateText: '24 Temmuz 2024 (Tamamlandı)',
    bannerGradient: 'from-red-900/40 via-zinc-900/40 to-zinc-950',
    synopsis: 'Yılın en çok ses getiren Marvel gişe rekortmeni için düzenlenen kırmızı halı ve cosplayer galası.',
    targetAudience: 'Marvel Fan Kulüpleri, Sinema Basını, VIP Oyuncular',
  },
  {
    id: 'evt-disney-insideout2',
    title: 'Ters Yüz 2 (Inside Out 2) Basın & VIP Gösterimi (Arşiv)',
    movieTitle: 'Ters Yüz 2',
    distributor: 'Pixar / Disney Studios Türkiye',
    venue: 'Akasya IMAX & VIP Fuaye, İstanbul',
    doorsOpenAt: '18:00',
    startsAt: '19:15',
    capacity: 450,
    confirmedLcv: 442,
    occupancyRate: 98.2,
    isHistoricalArchive: true,
    archiveDate: '12 Haziran 2024',
    eventDateText: '12 Haziran 2024 (Tamamlandı)',
    bannerGradient: 'from-blue-800/30 via-indigo-950/40 to-zinc-950',
    synopsis: 'Pixar’ın duygular evreni ergenlik dönemiyle genişlerken basın ve davetlilerden tam not aldı.',
    targetAudience: 'Psikoloji & Aile Yazarları, Çocuklu Influencerlar, Çizerler',
  },
];

const INITIAL_HOST_GUESTS: HostGuest[] = [
  {
    id: 'gst-yigit-ali',
    guestId: 'gst-vip-yigit-ali',
    firstName: 'Yiğit Ali',
    lastName: 'Çolakoğlu',
    email: 'yigitalicolakoglu22@gmail.com',
    maskedEmail: 'yigitalicolakoglu22@gmail.com',
    maskedPhone: '+90532*****22',
    company: 'Disney Studios Türkiye / Özel Protokol',
    title: 'VIP Davetli & Sistem Yöneticisi',
    category: 'PR',
    hostCustomTags: ['VIP', 'PROTOKOL', 'A_LIST'],
    hostLoyaltyScore: 100.0,
    instagram: { handle: '@yigitalicolakoglu', followersText: '1.5M', count: 1500000 },
    youtube: { handle: '@yigitalicolakoglu', followersText: '500K', count: 500000 },
    totalInvitedByHost: 5,
    totalAttendedForHost: 5,
    totalPostsForHost: 5,
    prConversionRate: 100.0,
    conversionTier: 'HIGH_IMPACT_CREATOR',
    hostNotes: 'Disney Türkiye A+ Protokol Misafiri. Her galada özel koltuk tahsisi.',
    invitationState: 'INVITED',
    plusOneAllowed: 2,
    lcvStatus: 'CONFIRMED',
    lcvConfirmedAt: '1 saat önce',
  },
  {
    id: 'gst-danla-bilic',
    guestId: 'gst-06-infl-danla',
    firstName: 'Danla',
    lastName: 'Bilic',
    maskedEmail: 'da***@influencer.local',
    maskedPhone: '+90530*****88',
    company: 'Dijital İletişim & Medya',
    title: 'A+ İçerik Üreticisi',
    category: 'PR',
    hostCustomTags: ['VIP', 'INFLUENCER', 'BEAUTY'],
    hostLoyaltyScore: 96.0,
    instagram: { handle: '@danlabilic', followersText: '6.1M', count: 6100000 },
    youtube: { handle: '@danlabilic', followersText: '1.4M', count: 1400000 },
    totalInvitedByHost: 5,
    totalAttendedForHost: 5,
    totalPostsForHost: 5,
    prConversionRate: 100.0,
    conversionTier: 'HIGH_IMPACT_CREATOR',
    hostNotes: 'Disney animasyon galalarında organik kırmızı halı ve story paylaşımları çok yüksek geri dönüş sağlıyor.',
    invitationState: 'INVITED',
    plusOneAllowed: 1,
    lcvStatus: 'CONFIRMED',
    lcvConfirmedAt: '12 dk önce',
  },
  {
    id: 'gst-baris-ozcan',
    guestId: 'gst-07-infl-baris',
    firstName: 'Barış',
    lastName: 'Özcan',
    maskedEmail: 'ba***@youtube.local',
    maskedPhone: '+90535*****99',
    company: 'Görsel Anlatı & Medya',
    title: 'Kültür & Hikaye Anlatıcısı',
    category: 'PR',
    hostCustomTags: ['VIP', 'INFLUENCER', 'CULTURE'],
    hostLoyaltyScore: 98.0,
    instagram: { handle: '@barisozcan', followersText: '1.2M', count: 1200000 },
    youtube: { handle: '@barisozcan', followersText: '6.5M', count: 6500000 },
    totalInvitedByHost: 4,
    totalAttendedForHost: 4,
    totalPostsForHost: 4,
    prConversionRate: 100.0,
    conversionTier: 'HIGH_IMPACT_CREATOR',
    hostNotes: 'Sinematografi ve animasyon teknolojisi odaklı derinlemesine YouTube videoları milyonlarca organik izlenme üretiyor.',
    invitationState: 'INVITED',
    plusOneAllowed: 1,
    lcvStatus: 'CONFIRMED',
  },
  {
    id: 'gst-serenay-sarikaya',
    guestId: 'gst-12-vip-serenay',
    firstName: 'Serenay',
    lastName: 'Sarıkaya',
    maskedEmail: 'se***@idiletisim.com',
    maskedPhone: '+90532*****11',
    company: 'İD İletişim',
    title: 'Sinema & Dizi Oyuncusu',
    category: 'PR',
    hostCustomTags: ['VIP', 'ACTOR', 'A_LIST'],
    hostLoyaltyScore: 94.0,
    instagram: { handle: '@serenayss', followersText: '11.2M', count: 11200000 },
    youtube: null,
    totalInvitedByHost: 3,
    totalAttendedForHost: 3,
    totalPostsForHost: 3,
    prConversionRate: 100.0,
    conversionTier: 'HIGH_IMPACT_CREATOR',
    hostNotes: 'Kırmızı halı fotoğrafları ulusal magazin basınında ilk sırada manşet oluyor.',
    invitationState: 'INVITED',
    plusOneAllowed: 1,
    lcvStatus: 'CONFIRMED',
  },
  {
    id: 'gst-kivanc-tatlitug',
    guestId: 'gst-02-vip-kivanc',
    firstName: 'Kıvanç',
    lastName: 'Tatlıtuğ',
    maskedEmail: 'ki***@ayyapim.local',
    maskedPhone: '+90533*****44',
    company: 'Ay Yapım',
    title: 'Başrol Oyuncusu',
    category: 'PR',
    hostCustomTags: ['VIP', 'ACTOR'],
    hostLoyaltyScore: 89.0,
    instagram: { handle: '@kivanctatlitug', followersText: '4.6M', count: 4600000 },
    youtube: null,
    totalInvitedByHost: 4,
    totalAttendedForHost: 4,
    totalPostsForHost: 1,
    prConversionRate: 25.0,
    conversionTier: 'LOW_PR_CONVERSION',
    hostNotes: 'Galalara fiziken katılıyor fakat sosyal medya paylaşım oranı düşük (%25). Özel röportaj için önceliklendirilmeli.',
    invitationState: 'IDLE',
    plusOneAllowed: 1,
    lcvStatus: 'PENDING',
  },
  {
    id: 'gst-omur-gedik',
    guestId: 'gst-01-press-omur',
    firstName: 'Ömür',
    lastName: 'Gedik',
    maskedEmail: 'om***@kelebek.com.tr',
    maskedPhone: '+90532*****22',
    company: 'Hürriyet Kelebek',
    title: 'Kültür Sanat Yazarı & Sinema Eleştirmeni',
    category: 'PRESS',
    hostCustomTags: ['PRESS', 'ACCREDITED', 'CRITIC'],
    hostLoyaltyScore: 95.0,
    instagram: { handle: '@omurgedik', followersText: '420K', count: 420000 },
    youtube: { handle: '@omurgedikofficial', followersText: '45K', count: 45000 },
    totalInvitedByHost: 6,
    totalAttendedForHost: 5,
    totalPostsForHost: 5,
    prConversionRate: 100.0,
    conversionTier: 'HIGH_IMPACT_CREATOR',
    hostNotes: 'Hürriyet Kelebek ve internet sayfasında filmlere tam sayfa vizyon değerlendirmesi ve röportaj ayırıyor.',
    invitationState: 'INVITED',
    plusOneAllowed: 1,
    lcvStatus: 'CONFIRMED',
  },
  {
    id: 'gst-mehmet-yilmaz',
    guestId: 'gst-04-press-mehmet',
    firstName: 'Mehmet',
    lastName: 'Yılmaz',
    maskedEmail: 'me***@hurriyet.com.tr',
    maskedPhone: '+90542*****66',
    company: 'Hürriyet Kültür Sanat',
    title: 'Kültür & Sanat Baş Editörü',
    category: 'PRESS',
    hostCustomTags: ['PRESS', 'ACCREDITED'],
    hostLoyaltyScore: 94.0,
    instagram: { handle: '@mehmetyilmazsinema', followersText: '185K', count: 185000 },
    youtube: null,
    totalInvitedByHost: 6,
    totalAttendedForHost: 5,
    totalPostsForHost: 4,
    prConversionRate: 80.0,
    conversionTier: 'HIGH_IMPACT_CREATOR',
    hostNotes: 'Gazete manşetlerinde Disney basın bültenlerini düzenli olarak işleyen kıdemli gazeteci.',
    invitationState: 'INVITED',
    plusOneAllowed: 1,
    lcvStatus: 'CONFIRMED',
  },
  {
    id: 'gst-kaan-kural',
    guestId: 'gst-11-press-kaan',
    firstName: 'Kaan',
    lastName: 'Kural',
    maskedEmail: 'ka***@medya.com',
    maskedPhone: '+90542*****55',
    company: 'Socrates Medya',
    title: 'Yazar & Podcast Yayıncısı',
    category: 'PRESS',
    hostCustomTags: ['PRESS', 'PODCAST'],
    hostLoyaltyScore: 91.0,
    instagram: { handle: '@kaankural', followersText: '280K', count: 280000 },
    youtube: { handle: '@socratesdergi', followersText: '750K', count: 750000 },
    totalInvitedByHost: 4,
    totalAttendedForHost: 4,
    totalPostsForHost: 3,
    prConversionRate: 75.0,
    conversionTier: 'HIGH_IMPACT_CREATOR',
    hostNotes: 'Kültür ve sinema sohbetlerinde Disney vizyon yapımlarına geniş yer veriyor.',
    invitationState: 'IDLE',
    plusOneAllowed: 1,
    lcvStatus: 'PENDING',
  },
  {
    id: 'gst-atil-inanc',
    guestId: 'gst-05-press-atil',
    firstName: 'Atıl',
    lastName: 'İnanç',
    maskedEmail: 'at***@sinemadergisi.com',
    maskedPhone: '+90555*****77',
    company: 'Sinema Kulübü & Dergisi',
    title: 'Film Eleştirmeni & Yönetmen',
    category: 'PRESS',
    hostCustomTags: ['PRESS', 'CRITIC'],
    hostLoyaltyScore: 92.0,
    instagram: { handle: '@atilinanc', followersText: '42K', count: 42000 },
    youtube: { handle: '@sinemaclubatil', followersText: '320K', count: 320000 },
    totalInvitedByHost: 4,
    totalAttendedForHost: 4,
    totalPostsForHost: 3,
    prConversionRate: 75.0,
    conversionTier: 'HIGH_IMPACT_CREATOR',
    hostNotes: 'Vizyon haftasında YouTube kanalında detaylı inceleme videosu yayınlıyor.',
    invitationState: 'INVITED',
    plusOneAllowed: 1,
    lcvStatus: 'CONFIRMED',
  },
  {
    id: 'gst-burcu-yildiz',
    guestId: 'gst-03-press-burcu',
    firstName: 'Burcu',
    lastName: 'Yıldız',
    maskedEmail: 'bu***@haberturk.com',
    maskedPhone: '+90536*****33',
    company: 'Habertürk Kültür Sanat',
    title: 'Muhabir & Editör',
    category: 'PRESS',
    hostCustomTags: ['PRESS'],
    hostLoyaltyScore: 80.0,
    instagram: { handle: '@burcuyildiz_', followersText: '35K', count: 35000 },
    youtube: null,
    totalInvitedByHost: 2,
    totalAttendedForHost: 2,
    totalPostsForHost: 0,
    prConversionRate: 0.0,
    conversionTier: 'GHOST_ATTENDEE',
    hostNotes: 'Son 2 galaya katıldı fakat haber dönüşü raporlanmadı. Kota takip edilmeli.',
    invitationState: 'WAITLIST',
    plusOneAllowed: 0,
    lcvStatus: 'PENDING',
  },
  ...(USER_EXCEL_GUESTS as unknown as HostGuest[]),
];

const INITIAL_INBOUND_MAILS: InboundMail[] = [
  {
    id: 'mail-01',
    fromName: 'Danla Bilic',
    fromEmail: 'da***@influencer.local',
    subject: 'Re: Moana 2 Türkiye Özel Prömiyeri Davetiyesi',
    preview: 'Harika bir haber! Eşimle birlikte seve seve katılıyoruz, kırmızı halıda görüşmek üzere ✨',
    receivedAt: '12 dk önce',
    aiClassification: 'CONFIRMED',
    status: 'PROCESSED',
    galaTitle: 'Moana 2',
  },
  {
    id: 'mail-02',
    fromName: 'Ömür Gedik',
    fromEmail: 'om***@kelebek.com.tr',
    subject: 'Re: Moana 2 Basın Kiti & Akreditasyon',
    preview: 'Basın kiti linki ve VIP bilet için teşekkürler. Fuaye alanında yönetmen röportajı yapabilir miyiz?',
    receivedAt: '45 dk önce',
    aiClassification: 'QUESTION',
    status: 'NEEDS_AGENT_REVIEW',
    galaTitle: 'Moana 2',
  },
  {
    id: 'mail-03',
    fromName: 'Barış Özcan',
    fromEmail: 'ba***@youtube.local',
    subject: 'Re: Özel Gösterim LCV Onayı',
    preview: 'Davetiniz için teşekkür ederim. Gösterimde olacağım, animasyon tekniği hakkında kısa bir video planlıyorum.',
    receivedAt: '2 saat önce',
    aiClassification: 'CONFIRMED',
    status: 'PROCESSED',
    galaTitle: 'Moana 2',
  },
  {
    id: 'mail-04',
    fromName: 'Kıvanç Tatlıtuğ (Asistanı Melis)',
    fromEmail: 'ki***@ayyapim.local',
    subject: 'Set Programı & LCV Durumu',
    preview: 'Kıvanç Bey dizi setindeki çekim takvimine göre durumu yarın öğleye kadar kesinleştirecek.',
    receivedAt: '3 saat önce',
    aiClassification: 'QUESTION',
    status: 'NEEDS_AGENT_REVIEW',
    galaTitle: 'Moana 2',
  },
];

export default function LuxuryHostPortal() {
  // --- TEMA VE NAVİGASYON DURUMU ---
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const isDark = theme === 'dark';

  // Aktif Sekme: 'hub' (Ana Merkez) | 'gala' (Seçili Gala Detayı) | 'pr' (PR & VIP Listesi) | 'press' (Basın Listesi) | 'archive' (Geçmiş Arşiv)
  const [activeTab, setActiveTab] = useState<'hub' | 'gala' | 'pr' | 'press' | 'archive'>('hub');

  // Galalar ve Seçili Gala
  const [galas, setGalas] = useState<HostGala[]>(INITIAL_GALAS);
  const [selectedGalaId, setSelectedGalaId] = useState<string>('evt-disney-moana2');
  const selectedGala = useMemo(
    () => galas.find((g) => g.id === selectedGalaId) || galas[0],
    [galas, selectedGalaId]
  );

  // Misafir Veritabanı
  const [guests, setGuests] = useState<HostGuest[]>(INITIAL_HOST_GUESTS);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<'ALL' | 'PR' | 'PRESS'>('ALL');
  const [selectedConversionFilter, setSelectedConversionFilter] = useState<string>('ALL');

  // Gelen E-postalar
  const [inboundMails, setInboundMails] = useState<InboundMail[]>(INITIAL_INBOUND_MAILS);

  // Yan Çekmece (Guest Detail Drawer)
  const [selectedGuestForDrawer, setSelectedGuestForDrawer] = useState<HostGuest | null>(null);

  // Yeni Davet Oluşturma Modalı
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteSelectedGuestIds, setInviteSelectedGuestIds] = useState<string[]>([]);
  const [inviteModalFilter, setInviteModalFilter] = useState<string>('ALL');

  // Toast Bildirimleri
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3800);
  };

  // Tema Değişimi
  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    showToast(`${next === 'dark' ? 'Koyu' : 'Açık'} temaya geçildi.`);
  };

  // Filtrelenmiş Misafirler
  const filteredGuests = useMemo(() => {
    return guests.filter((guest) => {
      // Sekme bazlı filtre: Eğer 'pr' sekmesindeyse sadece PR, 'press'teyse sadece PRESS
      if (activeTab === 'pr' && guest.category !== 'PR') return false;
      if (activeTab === 'press' && guest.category !== 'PRESS') return false;

      // Kategori filtresi
      if (selectedCategoryFilter !== 'ALL' && guest.category !== selectedCategoryFilter) return false;

      // Dönüşüm filtresi
      if (selectedConversionFilter === 'HIGH' && guest.prConversionRate < 75) return false;
      if (selectedConversionFilter === 'LOW' && (guest.prConversionRate >= 75 || guest.prConversionRate === 0)) return false;
      if (selectedConversionFilter === 'GHOST' && guest.prConversionRate !== 0) return false;
      if (selectedConversionFilter === 'INVITED' && guest.invitationState !== 'INVITED') return false;

      // Arama filtresi
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const fullName = `${guest.firstName} ${guest.lastName}`.toLowerCase();
        const company = guest.company.toLowerCase();
        const ig = guest.instagram?.handle.toLowerCase() || '';
        const yt = guest.youtube?.handle.toLowerCase() || '';
        return fullName.includes(q) || company.includes(q) || ig.includes(q) || yt.includes(q);
      }
      return true;
    });
  }, [guests, activeTab, selectedCategoryFilter, selectedConversionFilter, searchQuery]);

  // Sayısal İstatistikler
  const stats = useMemo(() => {
    const totalPr = guests.filter((g) => g.category === 'PR').length;
    const totalPress = guests.filter((g) => g.category === 'PRESS').length;
    const confirmedCount = guests.filter((g) => g.lcvStatus === 'CONFIRMED').length;
    const totalReach = guests.reduce((acc, g) => {
      const ig = g.instagram?.count || 0;
      const yt = g.youtube?.count || 0;
      return acc + ig + yt;
    }, 0);
    return {
      totalPr,
      totalPress,
      confirmedCount,
      totalReachText: `${(totalReach / 1000000).toFixed(1)}M+`,
    };
  }, [guests]);

  // Toplu Davet Fonksiyonları
  const handleBulkSelectRule = (rule: 'ALL' | 'OVER_1M' | 'PRESS' | 'CLEAR') => {
    if (rule === 'CLEAR') {
      setInviteSelectedGuestIds([]);
      return;
    }
    if (rule === 'ALL') {
      setInviteSelectedGuestIds(guests.map((g) => g.id));
      return;
    }
    if (rule === 'OVER_1M') {
      const matched = guests
        .filter((g) => (g.instagram?.count || 0) >= 1000000 || (g.youtube?.count || 0) >= 1000000)
        .map((g) => g.id);
      setInviteSelectedGuestIds(matched);
      return;
    }
    if (rule === 'PRESS') {
      const matched = guests.filter((g) => g.category === 'PRESS').map((g) => g.id);
      setInviteSelectedGuestIds(matched);
      return;
    }
  };

  const toggleInviteGuest = (id: string) => {
    setInviteSelectedGuestIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSendBulkInvites = () => {
    if (inviteSelectedGuestIds.length === 0) {
      showToast('Lütfen en az bir davetli seçin.');
      return;
    }
    setGuests((prev) =>
      prev.map((g) =>
        inviteSelectedGuestIds.includes(g.id)
          ? { ...g, invitationState: 'INVITED', lcvStatus: g.lcvStatus || 'PENDING' }
          : g
      )
    );
    showToast(`${inviteSelectedGuestIds.length} kişiye kişiselleştirilmiş gala davetiyesi gönderildi! ✉️`);
    setIsInviteModalOpen(false);
    setInviteSelectedGuestIds([]);
  };

  return (
    <div
      className={`min-h-screen flex ${
        isDark ? 'bg-[#09090b] text-zinc-100' : 'bg-[#fafafa] text-zinc-900'
      } font-sans transition-colors duration-200 antialiased`}
    >
      {/* =========================================================================
          SOL SABİT SİDEBAR (PREMIUM NAVIGATION)
         ========================================================================= */}
      <aside
        className={`w-64 shrink-0 flex flex-col justify-between border-r ${
          isDark ? 'bg-[#0e0e12] border-zinc-800/80' : 'bg-white border-zinc-200/90'
        } p-4 select-none z-30`}
      >
        <div className="space-y-6">
          {/* Logo & Kurumsal Dağıtımcı Kartı */}
          <div className="flex items-center gap-3 px-2 py-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-amber-600 to-orange-500 flex items-center justify-center text-white shadow-lg shadow-amber-500/20 font-bold text-lg">
              <Film className="w-5 h-5 text-zinc-950" />
            </div>
            <div>
              <div className="text-xs font-bold tracking-tight uppercase flex items-center gap-1.5 text-amber-500">
                <span>Disney Studios</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <div className="text-[13px] font-semibold tracking-tight leading-tight">
                Zeynep Yurtbaşı
              </div>
              <div className="text-[10px] text-zinc-400">Gala & PR Operasyon Direktörü</div>
            </div>
          </div>

          {/* Ana Menü Sekmeleri */}
          <div className="space-y-1">
            <div className="px-2 pb-1.5 text-[10px] font-bold tracking-wider uppercase text-zinc-500">
              Operasyon Merkezi
            </div>

            <button
              onClick={() => setActiveTab('hub')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition ${
                activeTab === 'hub'
                  ? isDark
                    ? 'bg-amber-500/15 text-amber-400 font-semibold shadow-sm'
                    : 'bg-amber-100/70 text-amber-900 font-semibold'
                  : isDark
                  ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                  : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Compass className="w-4 h-4" />
                <span>Etkinlik & Mesaj Hub'ı</span>
              </div>
              {inboundMails.filter((m) => m.status === 'NEEDS_AGENT_REVIEW').length > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-500" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('pr')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition ${
                activeTab === 'pr'
                  ? isDark
                    ? 'bg-amber-500/15 text-amber-400 font-semibold shadow-sm'
                    : 'bg-amber-100/70 text-amber-900 font-semibold'
                  : isDark
                  ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                  : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Award className="w-4 h-4" />
                <span>PR & VIP Davetlileri</span>
              </div>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${
                  isDark ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-100 text-zinc-700'
                }`}
              >
                {stats.totalPr}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('press')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition ${
                activeTab === 'press'
                  ? isDark
                    ? 'bg-amber-500/15 text-amber-400 font-semibold shadow-sm'
                    : 'bg-amber-100/70 text-amber-900 font-semibold'
                  : isDark
                  ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                  : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <FileText className="w-4 h-4" />
                <span>Basın & Medya Listesi</span>
              </div>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${
                  isDark ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-100 text-zinc-700'
                }`}
              >
                {stats.totalPress}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('archive')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition ${
                activeTab === 'archive'
                  ? isDark
                    ? 'bg-amber-500/15 text-amber-400 font-semibold shadow-sm'
                    : 'bg-amber-100/70 text-amber-900 font-semibold'
                  : isDark
                  ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                  : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Layers className="w-4 h-4" />
                <span>Geçmiş Galalar Arşivi</span>
              </div>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-md ${
                  isDark ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-100 text-zinc-500'
                }`}
              >
                2 Gala
              </span>
            </button>
          </div>

          {/* DİNAMİK KISAYOLLAR: SIRADAKİ 2 & GEÇMİŞ 2 */}
          <div className="space-y-2 pt-2 border-t border-zinc-800/40">
            <div className="px-2 text-[10px] font-bold tracking-wider uppercase text-zinc-500">
              Sıradaki 2 Gala (Kısayol)
            </div>
            {galas
              .filter((g) => !g.isHistoricalArchive)
              .slice(0, 2)
              .map((g) => (
                <button
                  key={g.id}
                  onClick={() => {
                    setSelectedGalaId(g.id);
                    setActiveTab('gala');
                    showToast(`"${g.title}" detayları açıldı.`);
                  }}
                  className={`w-full text-left p-2.5 rounded-xl border transition group ${
                    selectedGalaId === g.id && activeTab === 'gala'
                      ? isDark
                        ? 'border-amber-500/50 bg-amber-500/10'
                        : 'border-amber-500 bg-amber-50'
                      : isDark
                      ? 'border-zinc-800/70 bg-zinc-900/40 hover:bg-zinc-900'
                      : 'border-zinc-200 bg-zinc-50 hover:bg-zinc-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold truncate group-hover:text-amber-500 transition">
                      {g.movieTitle}
                    </span>
                    <span className="text-[10px] text-amber-500 font-mono">
                      %{g.occupancyRate.toFixed(0)}
                    </span>
                  </div>
                  <div className="text-[10px] text-zinc-400 truncate mt-0.5">
                    {g.eventDateText.split(',')[0]}
                  </div>
                </button>
              ))}

            <div className="px-2 pt-2 text-[10px] font-bold tracking-wider uppercase text-zinc-500">
              Geçmiş 2 Arşiv (Kısayol)
            </div>
            {galas
              .filter((g) => g.isHistoricalArchive)
              .slice(0, 2)
              .map((g) => (
                <button
                  key={g.id}
                  onClick={() => {
                    setSelectedGalaId(g.id);
                    setActiveTab('gala');
                    showToast(`"${g.title}" arşivi açıldı.`);
                  }}
                  className={`w-full text-left p-2.5 rounded-xl border transition ${
                    selectedGalaId === g.id && activeTab === 'gala'
                      ? isDark
                        ? 'border-zinc-600 bg-zinc-800'
                        : 'border-zinc-400 bg-zinc-100'
                      : isDark
                      ? 'border-zinc-800/60 bg-zinc-900/30 hover:bg-zinc-900/70'
                      : 'border-zinc-200/80 bg-zinc-50/60 hover:bg-zinc-100'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-medium text-zinc-400">
                    <span className="truncate">{g.movieTitle}</span>
                    <span className="text-[9px] px-1 rounded bg-zinc-800 text-zinc-300">Arşiv</span>
                  </div>
                  <div className="text-[10px] text-zinc-400 truncate mt-0.5">{g.archiveDate}</div>
                </button>
              ))}
          </div>
        </div>

        {/* Sidebar Alt: Tema & Hızlı Bilgi */}
        <div className="pt-4 border-t border-zinc-800/50 space-y-2">
          {/* Önceki Arayüz Linki (Yedek) */}
          <Link
            href="/host-v1"
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-[11px] transition ${
              isDark
                ? 'bg-zinc-900/80 text-zinc-400 hover:text-zinc-200'
                : 'bg-zinc-100 text-zinc-600 hover:text-zinc-900'
            }`}
            title="Eski Arayüz Versiyonu"
          >
            <span>Önceki UI (V1 Yedek)</span>
            <ExternalLink className="w-3 h-3 opacity-60" />
          </Link>

          <button
            onClick={toggleTheme}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium border transition ${
              isDark
                ? 'border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800'
                : 'border-zinc-200 bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {isDark ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-indigo-600" />}
              <span>{isDark ? 'Açık Temaya Geç' : 'Koyu Temaya Geç'}</span>
            </div>
            <span className="text-[10px] opacity-60 font-mono">{theme.toUpperCase()}</span>
          </button>
        </div>
      </aside>

      {/* =========================================================================
          ANA İÇERİK ALANI
         ========================================================================= */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Üst Bar: Seçili Gala Başlığı & Hızlı Aksiyon */}
        <header
          className={`h-16 shrink-0 border-b px-8 flex items-center justify-between backdrop-blur-md sticky top-0 z-20 ${
            isDark ? 'bg-[#09090b]/80 border-zinc-800/80' : 'bg-white/80 border-zinc-200/90'
          }`}
        >
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-bold tracking-tight">
              {activeTab === 'hub' && 'Operasyon Hub & Gala Akışı'}
              {activeTab === 'gala' && `${selectedGala.title}`}
              {activeTab === 'pr' && 'PR & VIP Davetli Rehberi'}
              {activeTab === 'press' && 'Ulusal Basın & Medya Akreditasyonu'}
              {activeTab === 'archive' && 'Geçmiş Galalar Arşivi'}
            </h1>
            <span className="text-zinc-500">·</span>
            <span className="text-xs text-amber-500 font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              {selectedGala.movieTitle} (27 Kasım 2024)
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Toplu Davet Oluştur Butonu */}
            <button
              onClick={() => {
                setInviteSelectedGuestIds([]);
                setIsInviteModalOpen(true);
              }}
              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-zinc-950 font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 transition active:scale-95"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Yeni Davet Oluştur</span>
            </button>
          </div>
        </header>

        {/* =====================================================================
            SEKME 1: ETKİNLİK & MESAJ HUB'I (WELCOME-FREE HIGH-END DASHBOARD)
           ===================================================================== */}
        {activeTab === 'hub' && (
          <div className="p-8 space-y-8 max-w-7xl mx-auto w-full">
            {/* Canlı Gala Hero Banner */}
            <div
              className={`relative overflow-hidden rounded-3xl border p-8 bg-gradient-to-r ${selectedGala.bannerGradient} ${
                isDark ? 'border-zinc-800' : 'border-zinc-300'
              } shadow-2xl`}
            >
              <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
                <div className="lg:col-span-2 space-y-3">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-semibold">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Sıradaki Ana Prömiyer</span>
                  </div>
                  <h2 className="text-3xl font-extrabold tracking-tight leading-tight">
                    {selectedGala.title}
                  </h2>
                  <p className="text-xs text-zinc-300 max-w-2xl leading-relaxed">
                    {selectedGala.synopsis}
                  </p>

                  <div className="pt-2 flex flex-wrap gap-4 text-xs text-zinc-300">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-amber-400" />
                      <span>{selectedGala.eventDateText}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-amber-400" />
                      <span>Kapı Açılış: {selectedGala.doorsOpenAt} · Film: {selectedGala.startsAt}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-amber-400" />
                      <span>{selectedGala.venue}</span>
                    </div>
                  </div>
                </div>

                {/* Doluluk ve Kapasite Göstergesi */}
                <div
                  className={`p-6 rounded-2xl border ${
                    isDark ? 'bg-zinc-950/70 border-zinc-800' : 'bg-white/80 border-zinc-200'
                  } backdrop-blur-md space-y-4`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-zinc-400">LCV Onay Durumu</span>
                    <span className="font-bold text-amber-500 font-mono">
                      {selectedGala.confirmedLcv} / {selectedGala.capacity} Koltuk
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-zinc-800 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-amber-500 to-orange-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${selectedGala.occupancyRate}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-zinc-400">
                    <span>%{selectedGala.occupancyRate.toFixed(1)} Doluluk</span>
                    <span>{selectedGala.capacity - selectedGala.confirmedLcv} Kalan Kontenjan</span>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedCategoryFilter('ALL');
                      setActiveTab('pr');
                    }}
                    className="w-full py-2 rounded-xl text-xs font-semibold bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition flex items-center justify-center gap-1.5"
                  >
                    <span>Davetli Listesini İncele</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Grid: 2 Sütun — Sol: Gelen E-postalar & AI Yanıtları | Sağ: Hızlı Metrikler */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Sol: Gelen LCV E-postaları & AI Agent Teyitleri */}
              <div
                className={`lg:col-span-2 rounded-2xl border ${
                  isDark ? 'bg-[#0e0e12] border-zinc-800' : 'bg-white border-zinc-200'
                } p-6 space-y-4 shadow-sm`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold tracking-tight flex items-center gap-2">
                      <Mail className="w-4 h-4 text-amber-500" />
                      <span>Gelen LCV E-postaları & AI Analiz Akışı</span>
                    </h3>
                    <p className="text-[11px] text-zinc-400">
                      Davetlilerden dönen e-postalar LLM tarafından sınıflandırılır ve otomatik işlenir.
                    </p>
                  </div>
                  <span className="text-[10px] px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                    AI Agent Aktif
                  </span>
                </div>

                <div className="space-y-3">
                  {inboundMails.map((mail) => (
                    <div
                      key={mail.id}
                      className={`p-4 rounded-xl border transition ${
                        mail.status === 'NEEDS_AGENT_REVIEW'
                          ? isDark
                            ? 'bg-amber-500/5 border-amber-500/30'
                            : 'bg-amber-50/60 border-amber-300'
                          : isDark
                          ? 'bg-zinc-900/40 border-zinc-800/60'
                          : 'bg-zinc-50 border-zinc-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold">{mail.fromName}</span>
                          <span className="text-[10px] text-zinc-400">({mail.fromEmail})</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-md font-semibold ${
                              mail.aiClassification === 'CONFIRMED'
                                ? 'bg-emerald-500/15 text-emerald-400'
                                : mail.aiClassification === 'DECLINED'
                                ? 'bg-rose-500/15 text-rose-400'
                                : 'bg-amber-500/15 text-amber-400'
                            }`}
                          >
                            {mail.aiClassification === 'CONFIRMED' && '✓ LCV Onaylandı'}
                            {mail.aiClassification === 'DECLINED' && '✗ Katılamıyor'}
                            {mail.aiClassification === 'QUESTION' && '❓ Özel Talep'}
                          </span>
                          <span className="text-[10px] text-zinc-500">{mail.receivedAt}</span>
                        </div>
                      </div>

                      <div className="text-xs font-medium mt-1 text-zinc-300">{mail.subject}</div>
                      <div className="text-xs text-zinc-400 mt-0.5 leading-relaxed">
                        "{mail.preview}"
                      </div>

                      {mail.status === 'NEEDS_AGENT_REVIEW' && (
                        <div className="mt-3 pt-2 border-t border-zinc-800/40 flex items-center justify-between">
                          <span className="text-[10px] text-amber-500 font-semibold flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            <span>Özel talep inceleme bekliyor</span>
                          </span>
                          <button
                            onClick={() => {
                              setInboundMails((prev) =>
                                prev.map((m) =>
                                  m.id === mail.id ? { ...m, status: 'PROCESSED' } : m
                                )
                              );
                              showToast(`"${mail.fromName}" talebi yanıtlandı ve arşivlendi.`);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold text-[11px] transition"
                          >
                            Talebi Onayla & Yanıtla
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Sağ: Dağıtımcı PR Özeti & Hızlı Göstergeler */}
              <div className="space-y-6">
                <div
                  className={`rounded-2xl border ${
                    isDark ? 'bg-[#0e0e12] border-zinc-800' : 'bg-white border-zinc-200'
                  } p-6 space-y-4 shadow-sm`}
                >
                  <h3 className="text-sm font-bold tracking-tight">Kümülatif PR & Medya Gücü</h3>

                  <div className="space-y-3">
                    <div className="p-3.5 rounded-xl bg-zinc-900/50 border border-zinc-800 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold">
                          <TrendingUp className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-[11px] text-zinc-400">Toplam Organik Erişim</div>
                          <div className="text-sm font-bold text-zinc-100">{stats.totalReachText}</div>
                        </div>
                      </div>
                      <span className="text-[10px] text-emerald-400 font-semibold">+%24 Artış</span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-zinc-900/50 border border-zinc-800 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
                          <UserCheck className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-[11px] text-zinc-400">Kayıtlı VIP & Basın</div>
                          <div className="text-sm font-bold text-zinc-100">{guests.length} Konuk</div>
                        </div>
                      </div>
                      <span className="text-[10px] text-zinc-400 font-mono">100% Doğrulanmış</span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-zinc-900/50 border border-zinc-800 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                          <ShieldCheck className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-[11px] text-zinc-400">Dinamik QR Kripto Kapı</div>
                          <div className="text-sm font-bold text-zinc-100">Aktif & Hazır</div>
                        </div>
                      </div>
                      <span className="text-[10px] text-emerald-400 font-mono">30s TOTP</span>
                    </div>
                  </div>
                </div>

                {/* Hızlı Aksiyon Kartı */}
                <div
                  className={`rounded-2xl border p-6 space-y-3 ${
                    isDark ? 'bg-gradient-to-br from-amber-950/20 to-zinc-950 border-amber-900/30' : 'bg-amber-50 border-amber-200'
                  }`}
                >
                  <div className="text-xs font-bold text-amber-500 uppercase tracking-wider">
                    Operasyon İpucu
                  </div>
                  <h4 className="text-sm font-bold">Takipçisi 1M+ Olanlara Özel Öncelik</h4>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Kırmızı halı röportajları için yüksek takipçili PR davetlilerine WhatsApp ve e-posta üzerinden VIP akreditasyon bileti atayabilirsiniz.
                  </p>
                  <button
                    onClick={() => {
                      setActiveTab('pr');
                      setSelectedConversionFilter('HIGH');
                    }}
                    className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold rounded-xl text-xs transition"
                  >
                    Yüksek Dönüşümlüleri Listele
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================================
            SEKME 2 & 3: PR & VIP VE BASIN & MEDYA LİSTESİ
           ===================================================================== */}
        {(activeTab === 'pr' || activeTab === 'press') && (
          <div className="p-8 space-y-6 max-w-7xl mx-auto w-full">
            {/* Üst Filtre & Arama Barı */}
            <div
              className={`p-4 rounded-2xl border ${
                isDark ? 'bg-[#0e0e12] border-zinc-800' : 'bg-white border-zinc-200'
              } flex flex-wrap items-center justify-between gap-4`}
            >
              <div className="flex items-center gap-3 flex-1 min-w-[280px]">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="İsim, kurum, @instagram veya @youtube ara..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={`w-full pl-9 pr-4 py-2 rounded-xl text-xs border focus:outline-none transition ${
                      isDark
                        ? 'bg-zinc-900 border-zinc-800 text-zinc-200 placeholder-zinc-500 focus:border-amber-500'
                        : 'bg-zinc-50 border-zinc-200 text-zinc-900 placeholder-zinc-400 focus:border-amber-500'
                    }`}
                  />
                </div>

                {/* Hızlı Dönüşüm Filtresi */}
                <select
                  value={selectedConversionFilter}
                  onChange={(e) => setSelectedConversionFilter(e.target.value)}
                  className={`px-3 py-2 rounded-xl text-xs border focus:outline-none cursor-pointer ${
                    isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-200' : 'bg-zinc-50 border-zinc-200 text-zinc-800'
                  }`}
                  style={{ colorScheme: isDark ? 'dark' : 'light' }}
                >
                  <option value="ALL">Tüm Sadakat Düzeyleri</option>
                  <option value="HIGH">Yüksek Dönüşüm (%75+ Paylaşım)</option>
                  <option value="LOW">Düşük Dönüşüm (&lt;%50)</option>
                  <option value="GHOST">Paylaşım Yapmayanlar (Ghosted)</option>
                  <option value="INVITED">Yalnızca Davet Edilenler</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    handleBulkSelectRule('OVER_1M');
                    setIsInviteModalOpen(true);
                  }}
                  className="px-3 py-2 rounded-xl text-xs font-semibold border border-amber-500/40 text-amber-400 hover:bg-amber-500/10 transition flex items-center gap-1.5"
                >
                  <Flame className="w-3.5 h-3.5" />
                  <span>1M+ Takipçilileri Davet Et</span>
                </button>
              </div>
            </div>

            {/* Misafir Tablosu / Kart Listesi */}
            <div
              className={`rounded-2xl border overflow-hidden ${
                isDark ? 'bg-[#0e0e12] border-zinc-800' : 'bg-white border-zinc-200'
              } shadow-sm`}
            >
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr
                      className={`border-b ${
                        isDark ? 'border-zinc-800/80 bg-zinc-900/50 text-zinc-400' : 'border-zinc-200 bg-zinc-50 text-zinc-600'
                      }`}
                    >
                      <th className="py-3 px-4 font-semibold">Davetli / Kurum</th>
                      <th className="py-3 px-4 font-semibold">Instagram İstatistiği</th>
                      <th className="py-3 px-4 font-semibold">YouTube İstatistiği</th>
                      <th className="py-3 px-4 font-semibold">Sadakat & Katılım Oranı</th>
                      <th className="py-3 px-4 font-semibold">LCV & Davet Durumu</th>
                      <th className="py-3 px-4 font-semibold text-right">Aksiyon</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/40">
                    {filteredGuests.map((guest) => {
                      const igUrl = guest.instagram
                        ? `https://instagram.com/${guest.instagram.handle.replace('@', '')}`
                        : null;
                      const ytUrl = guest.youtube
                        ? `https://youtube.com/${guest.youtube.handle.replace('@', '')}`
                        : null;

                      return (
                        <tr
                          key={guest.id}
                          className={`group transition ${
                            isDark ? 'hover:bg-zinc-900/50' : 'hover:bg-zinc-50'
                          }`}
                        >
                          {/* İsim & Kurum */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-500/20 to-orange-500/30 text-amber-400 flex items-center justify-center font-bold text-xs uppercase border border-amber-500/20">
                                {guest.firstName[0]}
                                {guest.lastName[0]}
                              </div>
                              <div>
                                <button
                                  onClick={() => setSelectedGuestForDrawer(guest)}
                                  className="font-bold text-xs hover:text-amber-500 transition text-left"
                                >
                                  {guest.firstName} {guest.lastName}
                                </button>
                                <div className="text-[11px] text-zinc-400 truncate max-w-[200px]">
                                  {guest.company} · {guest.title}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Instagram Bilgisi (Yeni Sekmede Açılır) */}
                          <td className="py-3.5 px-4">
                            {guest.instagram ? (
                              <a
                                href={igUrl!}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-pink-500/10 text-pink-400 hover:bg-pink-500/20 transition font-medium text-[11px] group/link"
                              >
                                <Instagram className="w-3.5 h-3.5 text-pink-400" />
                                <span>{guest.instagram.handle}</span>
                                <span className="font-bold text-zinc-200 font-mono">
                                  ({guest.instagram.followersText})
                                </span>
                                <ArrowUpRight className="w-3 h-3 opacity-0 group-hover/link:opacity-100 transition" />
                              </a>
                            ) : (
                              <span className="text-[11px] text-zinc-500 italic">Yok</span>
                            )}
                          </td>

                          {/* YouTube Bilgisi (Yeni Sekmede Açılır) */}
                          <td className="py-3.5 px-4">
                            {guest.youtube ? (
                              <a
                                href={ytUrl!}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition font-medium text-[11px] group/link"
                              >
                                <Youtube className="w-3.5 h-3.5 text-red-400" />
                                <span>{guest.youtube.handle}</span>
                                <span className="font-bold text-zinc-200 font-mono">
                                  ({guest.youtube.followersText})
                                </span>
                                <ArrowUpRight className="w-3 h-3 opacity-0 group-hover/link:opacity-100 transition" />
                              </a>
                            ) : (
                              <span className="text-[11px] text-zinc-500 italic">Yok</span>
                            )}
                          </td>

                          {/* Sadakat Skoru & Katılım Rasyosu */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded font-bold font-mono ${
                                  guest.hostLoyaltyScore >= 95
                                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                    : guest.hostLoyaltyScore >= 85
                                    ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                                    : 'bg-zinc-800 text-zinc-400'
                                }`}
                              >
                                {guest.hostLoyaltyScore.toFixed(0)} Puan
                              </span>
                              <span className="text-[11px] text-zinc-400">
                                {guest.totalAttendedForHost}/{guest.totalInvitedByHost} Katılım ({guest.totalPostsForHost} Paylaşım)
                              </span>
                            </div>
                          </td>

                          {/* LCV & Davet Durumu */}
                          <td className="py-3.5 px-4">
                            {guest.invitationState === 'INVITED' ? (
                              <span
                                className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                                  guest.lcvStatus === 'CONFIRMED'
                                    ? 'bg-emerald-500/15 text-emerald-400'
                                    : 'bg-amber-500/15 text-amber-400'
                                }`}
                              >
                                <CheckCircle2 className="w-3 h-3" />
                                {guest.lcvStatus === 'CONFIRMED' ? 'LCV Onaylı (+1)' : 'Davet İletildi'}
                              </span>
                            ) : (
                              <span className="text-[11px] text-zinc-500">Davet Edilmedi</span>
                            )}
                          </td>

                          {/* Aksiyon */}
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => setSelectedGuestForDrawer(guest)}
                              className="px-2.5 py-1 text-xs rounded-lg border border-zinc-700 hover:border-amber-500 hover:text-amber-400 transition"
                            >
                              Detay & Kart
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================================
            SEKME 4: SEÇİLİ GALA DETAYI VEYA GEÇMİŞ ARŞİV
           ===================================================================== */}
        {(activeTab === 'gala' || activeTab === 'archive') && (
          <div className="p-8 space-y-8 max-w-7xl mx-auto w-full">
            {/* Gala Detay Kartı */}
            <div
              className={`rounded-3xl border p-8 bg-gradient-to-r ${selectedGala.bannerGradient} ${
                isDark ? 'border-zinc-800' : 'border-zinc-300'
              } shadow-xl`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500 text-zinc-950 font-bold uppercase">
                      {selectedGala.isHistoricalArchive ? 'Geçmiş Arşiv' : 'Sıradaki Gala'}
                    </span>
                    <span className="text-xs text-zinc-400">{selectedGala.distributor}</span>
                  </div>
                  <h2 className="text-2xl font-bold">{selectedGala.title}</h2>
                  <p className="text-xs text-zinc-300 max-w-2xl">{selectedGala.synopsis}</p>
                </div>

                <div className="flex items-center gap-3">
                  {!selectedGala.isHistoricalArchive && (
                    <button
                      onClick={() => {
                        setInviteSelectedGuestIds([]);
                        setIsInviteModalOpen(true);
                      }}
                      className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold rounded-xl text-xs transition shadow-lg shadow-amber-500/20"
                    >
                      Bu Gala İçin Davetiye Gönder
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Arşiv Galaları Koleksiyonu (Eğer Archive sekmesindeyse) */}
            {activeTab === 'archive' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {galas
                  .filter((g) => g.isHistoricalArchive)
                  .map((archived) => (
                    <div
                      key={archived.id}
                      className={`p-6 rounded-2xl border ${
                        isDark ? 'bg-[#0e0e12] border-zinc-800' : 'bg-white border-zinc-200'
                      } space-y-4`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-500">{archived.movieTitle}</span>
                        <span className="text-xs text-zinc-400">{archived.archiveDate}</span>
                      </div>
                      <h3 className="text-base font-bold">{archived.title}</h3>
                      <p className="text-xs text-zinc-400">{archived.synopsis}</p>
                      <div className="pt-2 flex items-center justify-between text-xs border-t border-zinc-800/50">
                        <span className="text-zinc-400">Katılım Oranı</span>
                        <span className="font-bold text-emerald-400">%{archived.occupancyRate} (Kapasite Doldu)</span>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* =========================================================================
          YAN ÇEKMECE: DAVETLİ DETAY KARTI (SLIDE-OVER DRAWER)
         ========================================================================= */}
      {selectedGuestForDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setSelectedGuestForDrawer(null)}
          />
          <div
            className={`relative w-full max-w-md h-full shadow-2xl p-6 overflow-y-auto border-l flex flex-col justify-between ${
              isDark ? 'bg-[#0e0e12] border-zinc-800 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900'
            }`}
          >
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b pb-4 border-zinc-800/60">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-amber-500 uppercase tracking-wider">
                    Davetli PR Profili
                  </span>
                </div>
                <button
                  onClick={() => setSelectedGuestForDrawer(null)}
                  className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* İsim ve Başlık */}
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-zinc-950 font-bold text-lg shadow-lg">
                  {selectedGuestForDrawer.firstName[0]}
                  {selectedGuestForDrawer.lastName[0]}
                </div>
                <div>
                  <h3 className="text-lg font-bold">
                    {selectedGuestForDrawer.firstName} {selectedGuestForDrawer.lastName}
                  </h3>
                  <div className="text-xs text-zinc-400">
                    {selectedGuestForDrawer.company} · {selectedGuestForDrawer.title}
                  </div>
                  <div className="flex gap-1.5 mt-1.5">
                    {selectedGuestForDrawer.hostCustomTags.map((t) => (
                      <span
                        key={t}
                        className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-semibold"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Sosyal Medya Metrikleri */}
              <div className="space-y-3 pt-2">
                <div className="text-xs font-bold uppercase text-zinc-500 tracking-wider">
                  Sosyal Medya Kanalları
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-zinc-900/50 border border-zinc-800">
                    <div className="flex items-center justify-between text-xs text-pink-400 font-semibold mb-1">
                      <span>Instagram</span>
                      <Instagram className="w-3.5 h-3.5" />
                    </div>
                    {selectedGuestForDrawer.instagram ? (
                      <div>
                        <div className="font-bold text-sm text-zinc-100">
                          {selectedGuestForDrawer.instagram.followersText}
                        </div>
                        <a
                          href={`https://instagram.com/${selectedGuestForDrawer.instagram.handle.replace('@', '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-zinc-400 hover:text-amber-400 transition flex items-center gap-1 mt-0.5"
                        >
                          <span>{selectedGuestForDrawer.instagram.handle}</span>
                          <ArrowUpRight className="w-3 h-3" />
                        </a>
                      </div>
                    ) : (
                      <div className="text-xs text-zinc-500">Mevcut Değil</div>
                    )}
                  </div>

                  <div className="p-3 rounded-xl bg-zinc-900/50 border border-zinc-800">
                    <div className="flex items-center justify-between text-xs text-red-400 font-semibold mb-1">
                      <span>YouTube</span>
                      <Youtube className="w-3.5 h-3.5" />
                    </div>
                    {selectedGuestForDrawer.youtube ? (
                      <div>
                        <div className="font-bold text-sm text-zinc-100">
                          {selectedGuestForDrawer.youtube.followersText}
                        </div>
                        <a
                          href={`https://youtube.com/${selectedGuestForDrawer.youtube.handle.replace('@', '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-zinc-400 hover:text-amber-400 transition flex items-center gap-1 mt-0.5"
                        >
                          <span>{selectedGuestForDrawer.youtube.handle}</span>
                          <ArrowUpRight className="w-3 h-3" />
                        </a>
                      </div>
                    ) : (
                      <div className="text-xs text-zinc-500">Mevcut Değil</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Geçmiş Katılım ve Sadakat Karnesi */}
              <div className="space-y-3 pt-2">
                <div className="text-xs font-bold uppercase text-zinc-500 tracking-wider">
                  Etkinlik Sadakat Karnesi
                </div>
                <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400">Sadakat Skoru</span>
                    <span className="font-bold text-amber-500 font-mono">
                      {selectedGuestForDrawer.hostLoyaltyScore} / 100
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400">Toplam Davet & Katılım</span>
                    <span className="font-medium text-zinc-200">
                      {selectedGuestForDrawer.totalAttendedForHost} Katılım / {selectedGuestForDrawer.totalInvitedByHost} Davet
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400">Gala Paylaşım Oranı</span>
                    <span className="font-bold text-emerald-400">
                      %{selectedGuestForDrawer.prConversionRate.toFixed(0)} Dönüşüm
                    </span>
                  </div>
                </div>
              </div>

              {/* Notlar */}
              <div className="space-y-2 pt-2">
                <div className="text-xs font-bold uppercase text-zinc-500 tracking-wider">
                  Host Direktör Notları
                </div>
                <p className="text-xs text-zinc-300 p-3 rounded-xl bg-zinc-900/30 border border-zinc-800/80 leading-relaxed italic">
                  "{selectedGuestForDrawer.hostNotes}"
                </p>
              </div>
            </div>

            {/* Alt Aksiyon Butonları */}
            <div className="pt-6 border-t border-zinc-800/60 space-y-2">
              <button
                onClick={() => {
                  setGuests((prev) =>
                    prev.map((g) =>
                      g.id === selectedGuestForDrawer.id
                        ? { ...g, invitationState: 'INVITED', lcvStatus: 'CONFIRMED' }
                        : g
                    )
                  );
                  showToast(`${selectedGuestForDrawer.firstName} için davet ve LCV teyidi yapıldı!`);
                  setSelectedGuestForDrawer(null);
                }}
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold text-xs transition"
              >
                Bu Konuğa VIP Davetiye Ata (+1 Kontenjan)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: YENİ TOPLU DAVETİYE OLUŞTURMA MOTORU (CREATE INVITATION WIZARD)
         ========================================================================= */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setIsInviteModalOpen(false)}
          />
          <div
            className={`relative w-full max-w-2xl rounded-3xl border shadow-2xl p-6 overflow-hidden flex flex-col max-h-[85vh] ${
              isDark ? 'bg-[#0e0e12] border-zinc-800 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900'
            }`}
          >
            {/* Modal Başlık */}
            <div className="flex items-center justify-between border-b pb-4 border-zinc-800/60">
              <div>
                <h3 className="text-base font-bold flex items-center gap-2">
                  <Send className="w-4 h-4 text-amber-500" />
                  <span>Yeni Gala Davetiyesi Oluştur</span>
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Hedef Gala: <strong className="text-zinc-200">{selectedGala.title}</strong>
                </p>
              </div>
              <button
                onClick={() => setIsInviteModalOpen(false)}
                className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Hızlı Kural Seçicileri */}
            <div className="py-4 border-b border-zinc-800/40 space-y-3">
              <div className="text-xs font-semibold text-zinc-400">Akıllı Filtreleme ile Seç:</div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleBulkSelectRule('OVER_1M')}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30 transition flex items-center gap-1.5"
                >
                  <Flame className="w-3.5 h-3.5" />
                  <span>1M+ Takipçili VIP'ler</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleBulkSelectRule('PRESS')}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30 transition flex items-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Tüm Basın & Eleştirmenler</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleBulkSelectRule('ALL')}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition"
                >
                  Tüm Listeyi Seç ({guests.length})
                </button>
                <button
                  type="button"
                  onClick={() => handleBulkSelectRule('CLEAR')}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-zinc-500 hover:text-zinc-300 transition"
                >
                  Seçimi Temizle
                </button>
              </div>
            </div>

            {/* Davetli Seçim Listesi (Kaydırılabilir) */}
            <div className="flex-1 overflow-y-auto py-3 space-y-2">
              <div className="text-xs font-semibold text-zinc-400 px-1">
                Seçilen Davetliler ({inviteSelectedGuestIds.length} Kişi)
              </div>
              {guests.map((guest) => {
                const isSelected = inviteSelectedGuestIds.includes(guest.id);
                return (
                  <div
                    key={guest.id}
                    onClick={() => toggleInviteGuest(guest.id)}
                    className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between transition ${
                      isSelected
                        ? isDark
                          ? 'bg-amber-500/10 border-amber-500/40 text-zinc-100'
                          : 'bg-amber-50 border-amber-300 text-zinc-900'
                        : isDark
                        ? 'bg-zinc-900/30 border-zinc-800/60 hover:bg-zinc-900/60'
                        : 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-5 h-5 rounded-md border flex items-center justify-center transition ${
                          isSelected
                            ? 'bg-amber-500 border-amber-500 text-zinc-950 font-bold'
                            : 'border-zinc-600 bg-transparent'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                      </div>
                      <div>
                        <div className="font-bold text-xs">
                          {guest.firstName} {guest.lastName}
                        </div>
                        <div className="text-[11px] text-zinc-400">
                          {guest.company} · {guest.title}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs font-bold text-zinc-200">
                        {guest.instagram ? guest.instagram.followersText : 'Instagram Yok'}
                      </div>
                      <div className="text-[10px] text-zinc-400">
                        {guest.category === 'PR' ? 'PR & VIP' : 'Basın & Medya'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Alt: Gönderim & Konfigürasyon */}
            <div className="pt-4 border-t border-zinc-800/60 flex items-center justify-between">
              <div className="text-xs text-zinc-400">
                Seçilen: <strong className="text-amber-500">{inviteSelectedGuestIds.length}</strong> konuğa kriptolu QR davetiyesi iletilecektir.
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold border border-zinc-700 hover:bg-zinc-800 transition"
                >
                  İptal
                </button>
                <button
                  type="button"
                  onClick={handleSendBulkInvites}
                  disabled={inviteSelectedGuestIds.length === 0}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-950 transition shadow-lg shadow-amber-500/20"
                >
                  Davetiyeleri Gönder
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TOAST BİLDİRİMİ
         ========================================================================= */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-zinc-900 text-zinc-100 border border-zinc-700 shadow-2xl text-xs font-medium animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
