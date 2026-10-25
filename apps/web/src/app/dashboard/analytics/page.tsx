'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  BarChart3,
  Users,
  AlertTriangle,
  Printer,
  RefreshCw,
  Sparkles,
  Share2,
  DollarSign,
  Heart,
  MessageCircle,
  ShieldAlert,
  CheckCircle2,
  ArrowUpRight,
  Instagram,
  Youtube,
  Twitter,
  Film,
  Building,
  Calendar,
  Clock,
  Eye,
  Sliders,
  Award,
  UserX,
  FileText,
  BadgeAlert,
  ChevronRight,
} from 'lucide-react';

interface MentionItem {
  id: string;
  guestName: string;
  company: string;
  platform: 'INSTAGRAM' | 'TIKTOK' | 'YOUTUBE' | 'X';
  postUrl: string;
  captionText: string;
  reachEstimate: number;
  likesCount: number;
  commentsCount: number;
  sentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
  sentimentScore: number;
  aiSummary: string;
  postedAt: string;
  emvUsd: number;
}

interface GhostedParticipant {
  guestId: string;
  fullName: string;
  company: string;
  title: string;
  tags: string[];
  checkedInAt: string;
  guestEnteredCount: number;
  missedReachPotential: number;
  loyaltyScore: number;
  penalized: boolean;
}

const INITIAL_MENTIONS: MentionItem[] = [
  {
    id: 'm-1',
    guestName: 'Zeynep Aksoy',
    company: 'Sinema Dergisi',
    platform: 'INSTAGRAM',
    postUrl: 'https://instagram.com/p/DB98124',
    captionText: 'Dune 3 Türkiye Galasındaydık! Tek kelimeyle bir başyapıt! Oyunculuklar harika, görsel şölen resmen büyüleyici. Kesinlikle izleyin! 10/10.',
    reachEstimate: 4200000,
    likesCount: 285000,
    commentsCount: 14200,
    sentiment: 'POSITIVE',
    sentimentScore: 0.94,
    aiSummary: '"Dune 3" hakkında coşkulu övgüde bulundu; görsel efektleri, oyunculukları ve atmosferi kusursuz bir başyapıt olarak nitelendirdi.',
    postedAt: '22 Ekim 2026, 21:45',
    emvUsd: 56800,
  },
  {
    id: 'm-2',
    guestName: 'Barış Özdemir',
    company: 'FilmLab YouTube',
    platform: 'YOUTUBE',
    postUrl: 'https://youtube.com/watch?v=galareview99',
    captionText: 'Gala prömiyerinde izlediğim en sürükleyici yapımdı. Sinematografi enfes, soluksuz izledik. Yönetmenin en olgun işi olmuş.',
    reachEstimate: 3600000,
    likesCount: 198000,
    commentsCount: 12400,
    sentiment: 'POSITIVE',
    sentimentScore: 0.88,
    aiSummary: 'Gala prömiyeri sonrası derinlikli sinematografi övgüsü sundu; temponun sürükleyiciliğini ve yönetmenlik vizyonunu övdü.',
    postedAt: '22 Ekim 2026, 23:10',
    emvUsd: 48900,
  },
  {
    id: 'm-3',
    guestName: 'Ece Vural',
    company: 'TrendBuzz TikTok',
    platform: 'TIKTOK',
    postUrl: 'https://tiktok.com/@ecevural/video/71928374',
    captionText: 'Bu akşam Zorlu PSM kırmızı halıdayız! Galadan ilk kareler ve kostüm detayları. Gösterim şimdi başlıyor!',
    reachEstimate: 2800000,
    likesCount: 220000,
    commentsCount: 8900,
    sentiment: 'NEUTRAL',
    sentimentScore: 0.12,
    aiSummary: 'Kırmızı halı ambiyansını ve gala katılımcı kıyafetlerini aktardı; gösterim başlangıcını paylaştı.',
    postedAt: '22 Ekim 2026, 19:50',
    emvUsd: 29400,
  },
  {
    id: 'm-4',
    guestName: 'Kemal Tekin',
    company: 'Kritik Sinema',
    platform: 'X',
    postUrl: 'https://x.com/kemaltekin/status/18920192',
    captionText: 'Dune 3 prömiyeri bitti. Görsellik tatmin etse de ikinci yarıda senaryo zayıf ve oldukça sıkıcı bir tempoya bürünüyor. Beklentimin altında kaldı.',
    reachEstimate: 1800000,
    likesCount: 74000,
    commentsCount: 6100,
    sentiment: 'NEGATIVE',
    sentimentScore: -0.68,
    aiSummary: 'Görsel kaliteyi teyit etmekle birlikte senaryo temposu ve ikinci yarı hikaye akışında hayal kırıklığı bildirdi.',
    postedAt: '23 Ekim 2026, 00:25',
    emvUsd: 13400,
  },
];

const INITIAL_GHOSTED: GhostedParticipant[] = [
  {
    guestId: 'g-vip-1',
    fullName: 'Canberk Yılmaz',
    company: 'Influencer / Moda & Sinema',
    title: 'İçerik Üreticisi',
    tags: ['INFLUENCER', 'GALA_NIGHT'],
    checkedInAt: '22 Ekim 2026, 19:42',
    guestEnteredCount: 2,
    missedReachPotential: 1850000,
    loyaltyScore: 95.0,
    penalized: false,
  },
  {
    guestId: 'g-vip-2',
    fullName: 'Selin Doğan',
    company: 'Vogue Türkiye',
    title: 'Kültür & Sanat Editörü',
    tags: ['PRESS', 'VIP'],
    checkedInAt: '22 Ekim 2026, 20:14',
    guestEnteredCount: 1,
    missedReachPotential: 920000,
    loyaltyScore: 90.0,
    penalized: false,
  },
  {
    guestId: 'g-vip-3',
    fullName: 'Mert Aksoy',
    company: 'Dijital Sinema Topluluğu',
    title: 'YouTuber & Eleştirmen',
    tags: ['INFLUENCER'],
    checkedInAt: '22 Ekim 2026, 19:55',
    guestEnteredCount: 2,
    missedReachPotential: 1450000,
    loyaltyScore: 85.0,
    penalized: false,
  },
];

export default function AnalyticsDashboardPage() {
  const [mentions, setMentions] = useState<MentionItem[]>(INITIAL_MENTIONS);
  const [ghostedList, setGhostedList] = useState<GhostedParticipant[]>(INITIAL_GHOSTED);
  const [isScanning, setIsScanning] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Toplam Metrikler
  const totalReach = useMemo(() => mentions.reduce((acc, m) => acc + m.reachEstimate, 0), [mentions]);
  const totalLikes = useMemo(() => mentions.reduce((acc, m) => acc + m.likesCount, 0), [mentions]);
  const totalComments = useMemo(() => mentions.reduce((acc, m) => acc + m.commentsCount, 0), [mentions]);
  const totalEngagements = totalLikes + totalComments;
  const totalEmvUsd = useMemo(() => mentions.reduce((acc, m) => acc + m.emvUsd, 0), [mentions]);
  const totalEmvTry = totalEmvUsd * 35.0;

  const sentimentStats = useMemo(() => {
    const total = mentions.length || 1;
    const pos = mentions.filter((m) => m.sentiment === 'POSITIVE').length;
    const neu = mentions.filter((m) => m.sentiment === 'NEUTRAL').length;
    const neg = mentions.filter((m) => m.sentiment === 'NEGATIVE').length;
    return {
      pos,
      neu,
      neg,
      posPercent: Math.round((pos / total) * 100),
      neuPercent: Math.round((neu / total) * 100),
      negPercent: Math.round((neg / total) * 100),
    };
  }, [mentions]);

  const totalMissedReach = useMemo(
    () => ghostedList.reduce((acc, g) => acc + g.missedReachPotential, 0),
    [ghostedList]
  );

  // 48 Saatlik Sosyal Medya Taramasını Çalıştır Simülasyonu
  const handleScanMentions = () => {
    setIsScanning(true);
    setTimeout(() => {
      const newPost: MentionItem = {
        id: `m-${Date.now()}`,
        guestName: 'Burak Sergen',
        company: 'Sinema Eleştirmenleri Birliği',
        platform: 'INSTAGRAM',
        postUrl: 'https://instagram.com/p/DB999012',
        captionText: 'Dune 3 galasından yeni çıktık. Yılın en iyi sinema deneyimi, büyüleyici bir şölen! Mutlaka salonda izlenmeli.',
        reachEstimate: 1250000,
        likesCount: 94000,
        commentsCount: 4200,
        sentiment: 'POSITIVE',
        sentimentScore: 0.91,
        aiSummary: '"Dune 3" için "yılın en iyi sinema deneyimi" nitelemesinde bulundu; sinema salonunda izlenmesini şiddetle önerdi.',
        postedAt: 'Az önce',
        emvUsd: 19850,
      };
      setMentions((prev) => [newPost, ...prev]);
      setIsScanning(false);
      showToast('✅ 48 Saatlik Sosyal Medya Taraması tamamlandı! Yeni 1 adet pozitif paylaşım tespit edildi.');
    }, 1200);
  };

  // Ceza Uygula
  const handleApplyPenalty = (guestId: string, name: string) => {
    setGhostedList((prev) =>
      prev.map((g) => {
        if (g.guestId === guestId) {
          return {
            ...g,
            loyaltyScore: Math.max(0, g.loyaltyScore - 15),
            penalized: true,
          };
        }
        return g;
      })
    );
    showToast(`⚠️ ${name} için -15 puan PR sadakat cezası uygulandı ve denetim loguna işlendi.`);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 space-y-8 font-sans print:bg-white print:text-black print:p-0">
      {/* Toast Bildirimi */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-amber-500/40 text-amber-300 px-5 py-3 rounded-xl shadow-2xl backdrop-blur flex items-center gap-3 animate-fade-in print:hidden">
          <Sparkles className="w-5 h-5 text-amber-400 animate-spin" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Üst Navigasyon & Aksiyon Başlığı */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6 print:border-b-2 print:border-black">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-amber-400 mb-1">
            <Link href="/" className="hover:underline flex items-center gap-1">
              <span>Komuta Merkezi</span>
            </Link>
            <ChevronRight className="w-3 h-3 text-slate-600" />
            <span>Final PR Analitiği & ROI</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-amber-200 via-amber-400 to-amber-500 bg-clip-text text-transparent print:text-black">
            Gala Sonrası 48 Saat PR Etki & ROI Analitiği
          </h1>
          <p className="text-xs md:text-sm text-slate-400 mt-1 print:text-slate-700">
            Etkinlik: <strong className="text-slate-200 print:text-black">Dune 3 Türkiye Galası</strong> • Zorlu PSM Turkcell Sahnesi • 48 Saatlik Dinamik Tarama & Non-Posting Tespiti
          </p>
        </div>

        <div className="flex items-center gap-3 print:hidden">
          <button
            onClick={handleScanMentions}
            disabled={isScanning}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold text-xs shadow-lg transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
            <span>{isScanning ? 'Taranıyor...' : '48s Sosyal Medya Taramasını Çalıştır'}</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 font-medium text-xs transition-colors"
          >
            <Printer className="w-4 h-4 text-slate-400" />
            <span>Yönetici Raporunu Yazdır / PDF</span>
          </button>
        </div>
      </div>

      {/* 1. BÖLÜM: ÜST YÖNETİCİ ROI & ERİŞİM KPI KARTLARI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Toplam Organik Erişim */}
        <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur print:border-slate-300 print:bg-slate-50">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Toplam Organik Erişim</span>
            <Eye className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400 print:text-black">
            {(totalReach / 1000000).toFixed(1)}M+
          </div>
          <div className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1 font-mono">
            <TrendingUp className="w-3 h-3" />
            <span>%142 Hedef Aşıldı (48 Saat)</span>
          </div>
        </div>

        {/* Toplam Etkileşim */}
        <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur print:border-slate-300 print:bg-slate-50">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Toplam Etkileşim</span>
            <Heart className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-black text-slate-100 print:text-black">
            {(totalEngagements / 1000).toFixed(0)}K+
          </div>
          <div className="text-[11px] text-slate-400 mt-1 font-mono">
            {(totalLikes / 1000).toFixed(0)}K Beğeni • {(totalComments / 1000).toFixed(1)}K Yorum
          </div>
        </div>

        {/* Tahmini Reklam Eşdeğeri (EMV) */}
        <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur print:border-slate-300 print:bg-slate-50">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Tahmini Medya Değeri</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400 print:text-black">
            ${(totalEmvUsd / 1000).toFixed(1)}K
          </div>
          <div className="text-[11px] text-slate-400 mt-1 font-mono">
            ≈ ₺{(totalEmvTry / 1000000).toFixed(2)}M Reklam Eşdeğeri
          </div>
        </div>

        {/* Pozitif Duygu Skoru */}
        <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur print:border-slate-300 print:bg-slate-50">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Duygu (Sentiment)</span>
            <Sparkles className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400 print:text-black">
            %{sentimentStats.posPercent} Pozitif
          </div>
          <div className="text-[11px] text-slate-400 mt-1 font-mono">
            {sentimentStats.pos} Pozitif • {sentimentStats.neu} Nötr • {sentimentStats.neg} Negatif
          </div>
        </div>

        {/* Ghosting Influencer Uyarısı */}
        <div className="p-5 rounded-xl border border-amber-900/40 bg-amber-950/20 backdrop-blur print:border-slate-300 print:bg-slate-50">
          <div className="flex items-center justify-between text-amber-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Ghosting Influencer</span>
            <BadgeAlert className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400 print:text-black">
            {ghostedList.length} Davetli
          </div>
          <div className="text-[11px] text-rose-400 mt-1 font-mono">
            -{(totalMissedReach / 1000000).toFixed(1)}M Kaçırılan Erişim
          </div>
        </div>
      </div>

      {/* 2. BÖLÜM: DUYGU ANALİZİ DAĞILIMI & PLATFORM KIRILIMI */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Duygu Analizi Çubuğu & Özet */}
        <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/50 space-y-4 print:border-slate-300 print:bg-slate-50">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 print:text-black flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-amber-400" />
              Sinema Eleştirisi Duygu Dağılımı
            </h3>
            <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              AI NLP Doğrulandı
            </span>
          </div>

          {/* Görsel Dağılım Çubuğu */}
          <div className="space-y-2">
            <div className="h-4 w-full rounded-full bg-slate-800 flex overflow-hidden">
              <div
                style={{ width: `${sentimentStats.posPercent}%` }}
                className="bg-emerald-500 h-full transition-all"
                title={`Pozitif: %${sentimentStats.posPercent}`}
              />
              <div
                style={{ width: `${sentimentStats.neuPercent}%` }}
                className="bg-slate-500 h-full transition-all"
                title={`Nötr: %${sentimentStats.neuPercent}`}
              />
              <div
                style={{ width: `${sentimentStats.negPercent}%` }}
                className="bg-rose-500 h-full transition-all"
                title={`Negatif: %${sentimentStats.negPercent}`}
              />
            </div>
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Pozitif: %{sentimentStats.posPercent}
              </span>
              <span className="flex items-center gap-1.5 text-slate-400">
                <span className="h-2 w-2 rounded-full bg-slate-400" />
                Nötr: %{sentimentStats.neuPercent}
              </span>
              <span className="flex items-center gap-1.5 text-rose-400">
                <span className="h-2 w-2 rounded-full bg-rose-500" />
                Negatif: %{sentimentStats.negPercent}
              </span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 text-xs text-slate-300 leading-relaxed print:bg-white print:text-black">
            <strong className="text-amber-400">Yapay Zeka Sentezi:</strong> İzleyicilerin ve sinema eleştirmenlerinin ezici çoğunluğu yapıma tam not vererek görsel efektler ve başrol oyunculuklarını öne çıkarmıştır. Negatif bildirimler yalnızca 2. yarıdaki senaryo temposuyla sınırlı kalmıştır.
          </div>
        </div>

        {/* Platform Bazlı Erişim Kırılımı */}
        <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/50 space-y-4 print:border-slate-300 print:bg-slate-50">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 print:text-black flex items-center gap-2">
            <Share2 className="w-4 h-4 text-amber-400" />
            Platform Bazlı Erişim Dağılımı
          </h3>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/50 border border-slate-800/80">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded bg-pink-500/20 text-pink-400">
                  <Instagram className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-200">Instagram</div>
                  <div className="text-[10px] text-slate-400">Reels & Kırmızı Halı Gönderileri</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs font-mono font-bold text-amber-400">5.4M Erişim</div>
                <div className="text-[10px] text-emerald-400 font-mono">$76.6K EMV</div>
              </div>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/50 border border-slate-800/80">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded bg-red-500/20 text-red-400">
                  <Youtube className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-200">YouTube</div>
                  <div className="text-[10px] text-slate-400">Detaylı İnceleme Videoları</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs font-mono font-bold text-amber-400">3.6M Erişim</div>
                <div className="text-[10px] text-emerald-400 font-mono">$48.9K EMV</div>
              </div>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/50 border border-slate-800/80">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded bg-cyan-500/20 text-cyan-400">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-200">TikTok</div>
                  <div className="text-[10px] text-slate-400">Viral Atmosfer & Kostüm Trendleri</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs font-mono font-bold text-amber-400">2.8M Erişim</div>
                <div className="text-[10px] text-emerald-400 font-mono">$29.4K EMV</div>
              </div>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/50 border border-slate-800/80">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded bg-slate-500/20 text-slate-300">
                  <Twitter className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-200">X (Twitter)</div>
                  <div className="text-[10px] text-slate-400">Anlık Sinema Eleştirileri</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs font-mono font-bold text-amber-400">1.8M Erişim</div>
                <div className="text-[10px] text-emerald-400 font-mono">$13.4K EMV</div>
              </div>
            </div>
          </div>
        </div>

        {/* Kapı & Siber Güvenlik Duvarı Özeti */}
        <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/50 space-y-4 print:border-slate-300 print:bg-slate-50">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 print:text-black flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-emerald-400" />
              Kapı Operasyonu & Güvenlik
            </h3>
            <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              %94.8 Katılım
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-slate-950/50 border border-slate-800/80">
              <div className="text-slate-400">Mekan Kapasitesi</div>
              <div className="text-base font-bold font-mono text-slate-100">1.200 Koltuk</div>
            </div>
            <div className="p-3 rounded-lg bg-slate-950/50 border border-slate-800/80">
              <div className="text-slate-400">Fiilen Giren (+1)</div>
              <div className="text-base font-bold font-mono text-emerald-400">1.138 Davetli</div>
            </div>
            <div className="p-3 rounded-lg bg-slate-950/50 border border-slate-800/80">
              <div className="text-slate-400">No-Show (Gelmeyen)</div>
              <div className="text-base font-bold font-mono text-amber-400">62 Davetli (%5.2)</div>
            </div>
            <div className="p-3 rounded-lg bg-slate-950/50 border border-slate-800/80">
              <div className="text-slate-400">Engellenen Siber Saldırı</div>
              <div className="text-base font-bold font-mono text-rose-400">4 Giriş Engellendi</div>
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-rose-950/20 border border-rose-900/30 text-[11px] text-rose-300">
            <strong>Siber Savunma Metriği:</strong> 2 adet Replay-Attack (ekran görüntüsü paylaşımı), 1 adet süresi dolmuş dinamik QR ve 1 mükerrer bilet kapıda görevliler tarafından saniyeler içinde engellenmiştir.
          </div>
        </div>
      </div>

      {/* 3. BÖLÜM: GALAYA GELİP PAYLAŞIM YAPMAYAN INFLUENCERLAR (GHOSTING DETECTOR) */}
      <div className="p-6 rounded-xl border border-amber-900/40 bg-slate-900/60 space-y-4 print:border-slate-300 print:bg-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
                <UserX className="w-5 h-5" />
              </span>
              <h2 className="text-lg font-bold text-amber-300 print:text-black">
                Paylaşım Yapmayan (Ghosting) Influencer & Basın Dedektörü
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1 print:text-slate-600">
              Kapıda kriptografik QR biletle fiilen giriş yapmış (<code className="text-amber-300 font-mono">CheckInLog: SUCCESS</code>) fakat gala sonrasındaki 48 saat içinde tek bir paylaşım dahi yapmamış profiller.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-mono px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/30">
              Toplam Kaçırılan Potansiyel: <strong>{(totalMissedReach / 1000000).toFixed(1)}M Takipçi</strong>
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-mono text-[11px] border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Davetli & Kurum</th>
                <th className="py-3 px-4">Segment Etiketleri</th>
                <th className="py-3 px-4">Kapı Giriş Saati</th>
                <th className="py-3 px-4">Kaçırılan Takipçi / Potansiyel</th>
                <th className="py-3 px-4">Sadakat Skoru</th>
                <th className="py-3 px-4 text-right">Aksiyon</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {ghostedList.map((g) => (
                <tr key={g.guestId} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-200">{g.fullName}</div>
                    <div className="text-[11px] text-slate-400">{g.company} • {g.title}</div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex flex-wrap gap-1">
                      {g.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 text-[10px] rounded font-mono bg-amber-500/10 text-amber-300 border border-amber-500/20"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-300">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{g.checkedInAt} (+{g.guestEnteredCount - 1} Misafir)</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-rose-400">
                    {(g.missedReachPotential / 1000).toLocaleString('tr-TR')}K Takipçi
                  </td>
                  <td className="py-3 px-4 font-mono">
                    <span className={g.loyaltyScore < 80 ? 'text-rose-400' : 'text-amber-300'}>
                      {g.loyaltyScore.toFixed(1)} Puan
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    {g.penalized ? (
                      <span className="inline-flex items-center gap-1 text-[11px] text-rose-400 font-mono bg-rose-500/10 px-2.5 py-1 rounded border border-rose-500/20">
                        <AlertTriangle className="w-3 h-3" />
                        Ceza Uygulandı (-15)
                      </span>
                    ) : (
                      <button
                        onClick={() => handleApplyPenalty(g.guestId, g.fullName)}
                        className="px-3 py-1.5 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs font-semibold transition-colors"
                      >
                        Sadakat Puanı Düşür (-15)
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. BÖLÜM: 48 SAATLİK GERÇEKLEŞEN PAYLAŞIMLAR VE AI ÖZETLERİ */}
      <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/50 space-y-4 print:border-slate-300 print:bg-white">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-100 print:text-black flex items-center gap-2">
              <FileText className="w-5 h-5 text-amber-400" />
              48 Saatlik Taranan Paylaşımlar & Yapay Zeka Duygu Analizi
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Katılımcıların Instagram, YouTube, TikTok ve X üzerinde paylaştığı içeriklerin anlık analitiği
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400">
            Toplam: <strong className="text-slate-200">{mentions.length} Paylaşım</strong>
          </span>
        </div>

        <div className="space-y-3">
          {mentions.map((m) => (
            <div
              key={m.id}
              className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition-all space-y-2 print:border-slate-300 print:bg-slate-50"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-slate-800 flex items-center justify-center font-bold text-xs text-amber-400">
                    {m.guestName[0]}
                  </div>
                  <div>
                    <div className="font-bold text-sm text-slate-200">{m.guestName}</div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      {m.company} • {m.platform} • {m.postedAt}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-1 rounded text-xs font-mono font-bold ${
                      m.sentiment === 'POSITIVE'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        : m.sentiment === 'NEGATIVE'
                        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                        : 'bg-slate-500/10 text-slate-300 border border-slate-500/30'
                    }`}
                  >
                    {m.sentiment === 'POSITIVE' ? 'POZİTİF' : m.sentiment === 'NEGATIVE' ? 'NEGATİF' : 'NÖTR'} ({(m.sentimentScore > 0 ? '+' : '') + m.sentimentScore})
                  </span>

                  <span className="px-2.5 py-1 rounded text-xs font-mono text-amber-300 bg-amber-500/10 border border-amber-500/20">
                    ${m.emvUsd.toLocaleString('en-US')} EMV
                  </span>
                </div>
              </div>

              {/* Caption */}
              <div className="text-xs text-slate-300 italic bg-slate-900/60 p-2.5 rounded border border-slate-800/80">
                &ldquo;{m.captionText}&rdquo;
              </div>

              {/* AI Summary */}
              <div className="flex items-start gap-2 text-xs text-slate-400">
                <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-slate-300">Yapay Zeka Sentezi:</strong> {m.aiSummary}
                </span>
              </div>

              {/* İstatistik Çubuğu */}
              <div className="flex items-center gap-6 pt-1 text-[11px] font-mono text-slate-400">
                <span>Erişim: <strong className="text-slate-200">{(m.reachEstimate / 1000).toLocaleString('tr-TR')}K</strong></span>
                <span>Beğeni: <strong className="text-slate-200">{(m.likesCount / 1000).toLocaleString('tr-TR')}K</strong></span>
                <span>Yorum: <strong className="text-slate-200">{m.commentsCount.toLocaleString('tr-TR')}</strong></span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Rapor Sonu Alt Bilgi */}
      <div className="pt-6 border-t border-slate-800 text-center text-xs text-slate-500 font-mono">
        Gala & PR Operasyon Platformu • PR & ROI Analitiği • Deterministik NLP Sözlüğü & Dinamik Bilet Entegrasyonu
      </div>
    </div>
  );
}
