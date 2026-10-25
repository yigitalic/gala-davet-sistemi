'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Film,
  Calendar,
  Clock,
  MapPin,
  Send,
  QrCode,
  BarChart3,
  Users,
  ShieldCheck,
  Sparkles,
  Bot,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ArrowRight,
  TrendingUp,
  UserCheck,
  Ticket,
  Lock,
  ChevronRight,
  Eye,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';

export default function DashboardCommandCenter() {
  const [lastRefreshed, setLastRefreshed] = useState<string>('Şimdi');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Canlı Geri Sayım State (Dune: Messiah Galası - 2026-11-20T20:00:00Z)
  const [countdown, setCountdown] = useState({
    days: 28,
    hours: 21,
    minutes: 4,
    seconds: 1,
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: 59, seconds: 59 };
        if (prev.hours > 0) return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };
        if (prev.days > 0) return { ...prev, days: prev.days - 1, hours: 23, minutes: 59, seconds: 59 };
        return prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      setLastRefreshed(new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 600);
  };

  // Bekleyen AI İncelemeleri (NEEDS_REVIEW)
  const urgentAiReviews = [
    {
      id: 'rev-01',
      guestName: 'Defne Samyeli',
      guestRole: 'VIP Protokol / Sunucu',
      receivedTime: '4 dk önce',
      confidence: 68,
      classification: 'CONFIRMED',
      subject: 'Dune: Messiah Gala Katılımı ve Refakatçi',
      snippet: 'Galaya eşimle birlikte katılmak istiyorum. VIP otopark ve kırmızı halı giriş kartımız tek bilette geçerli olacak mı?',
      plusOneRequested: 1,
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    },
    {
      id: 'rev-02',
      guestName: 'Uğur Vardan',
      guestRole: 'Basın / Hürriyet Sinema Yazarı',
      receivedTime: '18 dk önce',
      confidence: 72,
      classification: 'UNCERTAIN',
      subject: 'Basın Ön Gösterimi ve Röportaj Talebi',
      snippet: 'Akşam galasına yetişemeyebilirim, صباح 11:00 basın gösterimi kontenjanına kaydımı aktarabilir misiniz?',
      plusOneRequested: 0,
      badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
    },
    {
      id: 'rev-03',
      guestName: 'Mert Ramazan Demir',
      guestRole: 'VIP Oyuncu / Influencer',
      receivedTime: '32 dk önce',
      confidence: 65,
      classification: 'CONFIRMED',
      subject: 'Gala Katılım Teyidi & Menajer İletişimi',
      snippet: 'Dizi setinden saat 19:30 gibi çıkıp galaya geçeceğim, yanımda stilistim de olacak (+1).',
      plusOneRequested: 1,
      badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    },
  ];

  // Canlı Saha & Kapı Hareketleri Zaman Çizelgesi
  const liveOperationalEvents = [
    {
      id: 'op-01',
      time: '22:48',
      type: 'CHECK_IN_SUCCESS',
      title: 'VIP Kapı Geçişi Onaylandı',
      detail: 'Haluk Bilginer (+1 Refakatçi) ana protokol kapısından giriş yaptı.',
      icon: CheckCircle2,
      iconColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    },
    {
      id: 'op-02',
      time: '22:42',
      type: 'REPLAY_ATTACK_BLOCKED',
      title: 'Engellenen Replay Attack (Ekran Görüntüsü)',
      detail: 'Süresi dolmuş dinamik QR ile giriş denendi (Bilet ID: tkt-8812). Güvenlik duvarı engelledi.',
      icon: AlertTriangle,
      iconColor: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
    },
    {
      id: 'op-03',
      time: '22:31',
      type: 'PR_POST_DETECTED',
      title: 'Yeni Sosyal Medya PR Paylaşımı',
      detail: '@danlabilic Instagram Story: "Dune galası için hazır mıyız?" (Pozitif Duygu, 2.9M Takipçi).',
      icon: TrendingUp,
      iconColor: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    },
    {
      id: 'op-04',
      time: '22:15',
      type: 'RSVP_CONFIRMED',
      title: 'Kriptografik LCV Onayı',
      detail: 'Ceyda Karan tek tıkla e-posta linkiyle katılımını ve +1 kontenjanını teyit etti.',
      icon: Ticket,
      iconColor: 'text-sky-400 bg-sky-500/10 border-sky-500/30',
    },
    {
      id: 'op-05',
      time: '21:50',
      type: 'AUDIT_LOG_RECORDED',
      title: 'KVKK Şifre Çözme Denetimi',
      detail: 'PR Yöneticisi Selin Y. tarafından 12 VIP davetlinin PII verisi VIEW_PII logu ile görüntülendi.',
      icon: ShieldCheck,
      iconColor: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30',
    },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      {/* --------------------------------------------------------------------- */}
      {/* 1. AKTİF GALA GERİ SAYIM & KOMUTA BANNER'I */}
      {/* --------------------------------------------------------------------- */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/40 border border-amber-500/30 p-6 sm:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold">
              <Film className="w-3.5 h-3.5 text-amber-400" />
              <span>ANA AKTİF GALA OPERASYONU</span>
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-tight">
              Dune: Messiah Türkiye Galası & Kırmızı Halı
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 pt-1">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-amber-400" />
                <span>Zorlu PSM Turkcell Sahnesi, İstanbul</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-amber-400" />
                <span>20 Kasım 2026, Cuma</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>Kapı: 19:00 • Başlangıç: 20:00</span>
              </div>
            </div>

            {/* Geri Sayım Sayacı */}
            <div className="pt-2 flex items-center gap-2 sm:gap-3 font-mono">
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-center min-w-[60px]">
                <div className="text-xl sm:text-2xl font-bold text-amber-400">{countdown.days}</div>
                <div className="text-[10px] text-slate-400 uppercase font-sans">GÜN</div>
              </div>
              <span className="text-amber-500 font-bold text-xl">:</span>
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-center min-w-[60px]">
                <div className="text-xl sm:text-2xl font-bold text-amber-400">
                  {String(countdown.hours).padStart(2, '0')}
                </div>
                <div className="text-[10px] text-slate-400 uppercase font-sans">SAAT</div>
              </div>
              <span className="text-amber-500 font-bold text-xl">:</span>
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-center min-w-[60px]">
                <div className="text-xl sm:text-2xl font-bold text-amber-400">
                  {String(countdown.minutes).padStart(2, '0')}
                </div>
                <div className="text-[10px] text-slate-400 uppercase font-sans">DAKİKA</div>
              </div>
              <span className="text-amber-500 font-bold text-xl">:</span>
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-center min-w-[60px]">
                <div className="text-xl sm:text-2xl font-bold text-amber-400">
                  {String(countdown.seconds).padStart(2, '0')}
                </div>
                <div className="text-[10px] text-slate-400 uppercase font-sans">SANİYE</div>
              </div>
            </div>
          </div>

          {/* Hızlı Aksiyon Butonları */}
          <div className="flex flex-col sm:flex-row lg:flex-col gap-3 w-full lg:w-auto shrink-0">
            <Link
              href="/dashboard/campaigns"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm shadow-lg shadow-amber-500/20 transition group"
            >
              <Send className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              <span>+ Yeni Davetiye Kampanyası</span>
            </Link>

            <Link
              href="/dashboard/check-in"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-amber-500/40 text-white font-semibold text-xs sm:text-sm transition"
            >
              <QrCode className="w-4 h-4 text-emerald-400" />
              <span>Kapı Check-in Ekranını Aç</span>
            </Link>

            <Link
              href="/dashboard/analytics"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-slate-900/60 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs sm:text-sm transition"
            >
              <BarChart3 className="w-4 h-4 text-amber-400" />
              <span>48s PR & ROI Raporu</span>
            </Link>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------------------- */}
      {/* 2. 6 ANAHTAR KPI KARTI */}
      {/* --------------------------------------------------------------------- */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 font-mono">
            Temel Operasyon & Güvenlik KPI Göstergeleri
          </h2>
          <button
            onClick={handleRefresh}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-amber-400 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-amber-400' : ''}`} />
            <span>Güncellendi: {lastRefreshed}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* KPI 1: Toplam CRM Davetlisi & VIP Oranı */}
          <div className="bg-slate-900/80 border border-slate-800 hover:border-amber-500/30 rounded-2xl p-5 space-y-3 transition group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">Davetli CRM & VIP Oranı</span>
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white tracking-tight">1.250 Davetli</div>
              <p className="text-xs text-amber-300/90 font-medium mt-0.5">475 VIP Protokol (%38 Oran)</p>
            </div>
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
              <span>Basın: 280 • Influencer: 195</span>
              <Link href="/dashboard/guests" className="text-amber-400 hover:underline flex items-center gap-0.5">
                CRM &rarr;
              </Link>
            </div>
          </div>

          {/* KPI 2: Aktif Gala LCV Doluluk Hunisi */}
          <div className="bg-slate-900/80 border border-slate-800 hover:border-amber-500/30 rounded-2xl p-5 space-y-3 transition group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">LCV Doluluk Hunisi</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <UserCheck className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-white tracking-tight">485 Katılımcı</span>
                <span className="text-xs font-semibold text-emerald-400 font-mono">%74.6 Dolu</span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">Salon Kapasitesi: 650 (Asil + +1)</p>
            </div>
            {/* İlerleme Çubuğu */}
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div className="bg-gradient-to-r from-amber-400 to-emerald-400 h-full rounded-full" style={{ width: '74.6%' }} />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>95 Bekleyen • 40 Red</span>
              <span className="text-amber-300">Kalan: 165 Koltuk Yok Kontenjan</span>
            </div>
          </div>

          {/* KPI 3: AI Gelen Kutusu Otonom Çözüm */}
          <div className="bg-slate-900/80 border border-slate-800 hover:border-amber-500/30 rounded-2xl p-5 space-y-3 transition group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">AI Gelen Kutusu (RSVP Agent)</span>
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <Bot className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-white tracking-tight">%88 Otonom</span>
                <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  3 Bekleyen
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">Ort. Yanıtlama Süresi: 4.2 saniye</p>
            </div>
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
              <span>Otomatik Biletlenen: 214</span>
              <Link href="/dashboard/ai-inbox" className="text-amber-400 hover:underline flex items-center gap-0.5">
                İncele &rarr;
              </Link>
            </div>
          </div>

          {/* KPI 4: Canlı Kapı Check-in & Replay Attack Koruması */}
          <div className="bg-slate-900/80 border border-slate-800 hover:border-amber-500/30 rounded-2xl p-5 space-y-3 transition group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">Kapı Check-in & Güvenlik</span>
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                <QrCode className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white tracking-tight">342 Giriş Yapıldı</div>
              <p className="text-xs text-rose-400 font-semibold mt-0.5">4 Engellenen Replay Attack</p>
            </div>
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
              <span>Ortalama Geçiş Hızı: 3.1 sn</span>
              <span className="text-emerald-400 font-mono">Anti-Replay Aktif</span>
            </div>
          </div>

          {/* KPI 5: Sosyal Medya PR Erişim Gücü */}
          <div className="bg-slate-900/80 border border-slate-800 hover:border-amber-500/30 rounded-2xl p-5 space-y-3 transition group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">Sosyal PR Erişim Havuzu</span>
              <div className="w-8 h-8 rounded-lg bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white tracking-tight">18.4M Takipçi</div>
              <p className="text-xs text-pink-300 font-medium mt-0.5">Potansiyel Etkileşim: 1.2M</p>
            </div>
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
              <span>42 Onaylı Basın & Influencer</span>
              <Link href="/dashboard/analytics" className="text-amber-400 hover:underline flex items-center gap-0.5">
                ROI Raporu &rarr;
              </Link>
            </div>
          </div>

          {/* KPI 6: KVKK & Kriptografik Denetim */}
          <div className="bg-slate-900/80 border border-slate-800 hover:border-amber-500/30 rounded-2xl p-5 space-y-3 transition group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">KVKK Kripto & Denetim</span>
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Lock className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white tracking-tight">128 Audit Log</div>
              <p className="text-xs text-emerald-400 font-medium mt-0.5">AES-256-GCM • Sıfır İhlal</p>
            </div>
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
              <span>HMAC Blind Index Aktif</span>
              <Link href="/dashboard/security" className="text-amber-400 hover:underline flex items-center gap-0.5">
                Loglar &rarr;
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------------------- */}
      {/* 3. ORTA BÖLÜM: İKİ SÜTUNLU CANLI OPERASYON AKIŞI */}
      {/* --------------------------------------------------------------------- */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SOL SÜTUN: ACİL İNSAN ONAYI BEKLEYEN AI E-POSTALARI */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">İnsan Onayı Bekleyen AI E-postaları</h3>
                <p className="text-xs text-slate-400">Güven eşiği &lt;%85 olan veya özel refakatçi talepleri</p>
              </div>
            </div>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
              3 İnceleme
            </span>
          </div>

          <div className="space-y-3">
            {urgentAiReviews.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 hover:border-amber-500/40 transition space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white">{item.guestName}</span>
                      <span className="text-[10px] text-slate-400">({item.guestRole})</span>
                    </div>
                    <p className="text-xs font-semibold text-amber-300/90 mt-0.5">{item.subject}</p>
                  </div>
                  <span className="text-[10px] text-slate-400 whitespace-nowrap">{item.receivedTime}</span>
                </div>

                <p className="text-xs text-slate-300 bg-slate-900/80 p-2.5 rounded-xl border border-slate-800/80 italic">
                  &quot;{item.snippet}&quot;
                </p>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded-md font-semibold border ${item.badgeColor}`}>
                      {item.classification === 'CONFIRMED' ? 'Onay Eğilimli' : 'Belirsiz'} (%{item.confidence} Güven)
                    </span>
                    {item.plusOneRequested > 0 && (
                      <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                        +{item.plusOneRequested} Refakatçi Talebi
                      </span>
                    )}
                  </div>

                  <Link
                    href={`/dashboard/ai-inbox`}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition"
                  >
                    <span>İncele & Onayla</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 text-center">
            <Link
              href="/dashboard/ai-inbox"
              className="text-xs text-amber-400 hover:text-amber-300 font-semibold inline-flex items-center gap-1.5"
            >
              <span>Tüm AI Gelen Kutusunu ve Taslakları Görüntüle</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* SAĞ SÜTUN: SON OPERASYONEL & KAPI HAREKETLERİ ZAMAN ÇİZELGESİ */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">Canlı Saha & Kapı Hareketleri</h3>
                <p className="text-xs text-slate-400">Gerçek zamanlı giriş, LCV ve güvenlik olayları</p>
              </div>
            </div>
            <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-mono font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              CANLI AKIŞ
            </span>
          </div>

          {/* Dikey Zaman Çizelgesi */}
          <div className="space-y-4 relative before:absolute before:inset-0 before:left-4 before:w-0.5 before:bg-slate-800 pl-2">
            {liveOperationalEvents.map((event) => {
              const Icon = event.icon;
              return (
                <div key={event.id} className="relative flex items-start gap-3.5 group">
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 border z-10 transition-transform group-hover:scale-110 ${event.iconColor}`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0 bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-bold text-slate-200 truncate">{event.title}</span>
                      <span className="text-[10px] font-mono text-slate-400">{event.time}</span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">{event.detail}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-2 text-center">
            <Link
              href="/dashboard/security"
              className="text-xs text-slate-400 hover:text-amber-400 font-semibold inline-flex items-center gap-1.5 transition"
            >
              <span>Tüm Güvenlik ve Kriptografik Denetim Logları &rarr;</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
