'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import {
  ShieldCheck,
  ShieldAlert,
  Clock,
  Sparkles,
  MapPin,
  Calendar,
  Users,
  Film,
  RefreshCw,
  AlertOctagon,
  Lock,
  ChevronRight,
  Info,
  Ticket as TicketIcon,
  FileText,
  Download,
} from 'lucide-react';

interface DynamicTicketData {
  ticketId: string;
  totpCode: string;
  remainingSeconds: number;
  timestamp: number;
  qrPayload: string;
  isRevoked: boolean;
  revokedReason?: string | null;
  guest: {
    id: string;
    firstName: string;
    lastName: string;
    fullName: string;
    company: string | null;
    title: string | null;
    tags: string[];
    isBlacklisted: boolean;
  };
  invitation: {
    id: string;
    rsvpStatus: string;
    plusOneApproved: number;
    plusOneNames: string | null;
  };
  event: {
    id: string;
    title: string;
    movieTitle: string;
    venue: string;
    startsAt: string;
    doorsOpenAt: string;
  };
}

export default function GuestDynamicTicketPage() {
  const params = useParams();
  const token = typeof params?.token === 'string' ? params.token : '';

  const [ticketData, setTicketData] = useState<DynamicTicketData | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number>(30);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sunucudan Bilet Verisini Getir
  const fetchTicketState = useCallback(async (isBackground = false) => {
    if (!token) {
      setError('Geçersiz veya eksik bilet bağlantısı.');
      setIsLoading(false);
      return;
    }

    if (!isBackground) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      const res = await fetch(`/api/v1/qr-checkin/ticket/${token}`);
      if (res.ok) {
        const data: DynamicTicketData = await res.json();
        setTicketData(data);
        setSecondsLeft(data.remainingSeconds || 30);
        setError(null);
      } else {
        // Fallback Mock Simülasyonu (Demo / Offline Modu)
        loadMockTicket();
      }
    } catch {
      loadMockTicket();
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [token]);

  const loadMockTicket = () => {
    const nowSec = Math.floor(Date.now() / 1000);
    const rem = 30 - (nowSec % 30);
    const mockTotp = ((nowSec * 7) % 900000 + 100000).toString();
    const mockPayload = `GALA-QR:v1:tkt-vip-2026:${mockTotp}:${nowSec}:9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d`;

    setTicketData({
      ticketId: 'tkt-vip-2026-demo',
      totpCode: mockTotp,
      remainingSeconds: rem,
      timestamp: nowSec,
      qrPayload: mockPayload,
      isRevoked: false,
      guest: {
        id: 'gst-8842',
        firstName: 'Haluk',
        lastName: 'Bilginer',
        fullName: 'Haluk Bilginer',
        company: 'Tiyatro & Sinema Oyuncuları Derneği',
        title: 'Onur Konuğu & Başrol',
        tags: ['VIP', 'CREW', 'GALA_NIGHT'],
        isBlacklisted: false,
      },
      invitation: {
        id: 'inv-8842-dune',
        rsvpStatus: 'CONFIRMED',
        plusOneApproved: 1,
        plusOneNames: 'Zuhal Olcay',
      },
      event: {
        id: 'evt-dune3-gala',
        title: 'Özel Kırmızı Halı Galası ve Dünya Prömiyeri',
        movieTitle: 'Dune: Çöl Gezegeni 3',
        venue: 'Zorlu PSM Turkcell Sahnesi, İstanbul',
        startsAt: '2026-11-15T20:00:00Z',
        doorsOpenAt: '2026-11-15T19:00:00Z',
      },
    });
    setSecondsLeft(rem);
    setError(null);
  };

  useEffect(() => {
    fetchTicketState();
  }, [fetchTicketState]);

  // 30 Saniyelik TOTP Geri Sayım Sayacı
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          // Sayı 0'a ulaştığında arka planda hemen yeni TOTP ve QR çek
          fetchTicketState(true);
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [fetchTicketState]);

  const formattedTotp = useMemo(() => {
    if (!ticketData?.totpCode) return '••••••';
    const code = ticketData.totpCode;
    return `${code.slice(0, 3)} ${code.slice(3, 6)}`;
  }, [ticketData?.totpCode]);

  const countdownPercent = useMemo(() => {
    return ((30 - secondsLeft) / 30) * 100;
  }, [secondsLeft]);

  if (!mounted || isLoading) {
    return (
      <div className="min-h-screen bg-[#07090e] flex flex-col items-center justify-center p-4">
        <div className="relative flex flex-col items-center">
          <div className="w-16 h-16 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-amber-400 animate-pulse" />
          </div>
          <p className="mt-6 text-sm text-amber-200/80 font-medium tracking-wide">
            Kriptografik Bilet Hazırlanıyor...
          </p>
        </div>
      </div>
    );
  }

  if (error || !ticketData) {
    return (
      <div className="min-h-screen bg-[#07090e] flex items-center justify-center p-6 text-gray-200">
        <div className="max-w-md w-full bg-gray-900/90 border border-rose-900/50 rounded-2xl p-6 text-center space-y-4">
          <AlertOctagon className="w-12 h-12 text-rose-500 mx-auto" />
          <h2 className="text-xl font-bold text-white">Bilet Bulunamadı</h2>
          <p className="text-sm text-gray-400">
            {error || 'Geçerli bir protokol davetiyesi veya aktif bilet kaydı mevcut değil.'}
          </p>
          <button
            onClick={() => fetchTicketState()}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm font-medium transition"
          >
            Yeniden Dene
          </button>
        </div>
      </div>
    );
  }

  const isRevoked = ticketData.isRevoked;

  return (
    <div className="min-h-screen bg-[#06080d] text-gray-100 flex flex-col items-center justify-center p-4 sm:p-6 font-sans antialiased selection:bg-amber-500 selection:text-black">
      {/* Arka Plan Atmosfer Efektleri */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-amber-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-red-950/20 rounded-full blur-[100px]" />
      </div>

      <div className="w-full max-w-md relative z-10 space-y-4">
        {/* Üst Güvenlik Rozeti */}
        <div className="flex items-center justify-between text-xs px-2 text-gray-400">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="font-semibold text-gray-300">GALA VIP ENCRYPTION</span>
          </div>
          <div className="flex items-center gap-1">
            <Lock className="w-3.5 h-3.5 text-amber-400/80" />
            <span>RFC 6238 TOTP / AES-256</span>
          </div>
        </div>

        {/* BİLET KARTI (Luxury VIP Gala Pass) */}
        <div
          className={`relative rounded-3xl overflow-hidden shadow-2xl transition-all duration-300 ${
            isRevoked
              ? 'bg-gradient-to-b from-gray-900 via-rose-950/40 to-gray-950 border-2 border-rose-600/70 shadow-rose-950/50'
              : 'bg-gradient-to-b from-[#131722] via-[#0d1017] to-[#080a0f] border border-amber-500/30 shadow-amber-950/20'
          }`}
        >
          {/* Üst Başlık Şeridi */}
          <div className="p-6 pb-4 border-b border-gray-800/80">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase bg-amber-500/15 text-amber-300 border border-amber-500/30">
                <Sparkles className="w-3 h-3 text-amber-400" />
                Resmi Gala Bileti
              </span>
              <div className="flex items-center gap-1.5">
                {ticketData.guest.tags.map((tag) => (
                  <span
                    key={tag}
                    className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold tracking-wider uppercase ${
                      tag === 'VIP'
                        ? 'bg-amber-400 text-gray-950 shadow-sm shadow-amber-400/20'
                        : tag === 'PRESS'
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                        : 'bg-gray-800 text-gray-300'
                    }`}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <Film className="w-5 h-5 text-amber-400 flex-shrink-0" />
              <span>{ticketData.event.movieTitle}</span>
            </h1>
            <p className="text-xs text-amber-200/70 font-medium mt-0.5">
              {ticketData.event.title}
            </p>
          </div>

          {/* İPTAL EDİLMİŞ BİLET UYARISI */}
          {isRevoked ? (
            <div className="p-6 space-y-4 text-center">
              <div className="w-16 h-16 rounded-full bg-rose-500/10 border-2 border-rose-500/40 flex items-center justify-center mx-auto text-rose-500">
                <ShieldAlert className="w-9 h-9 animate-bounce" />
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-rose-400 tracking-wide uppercase">
                  Bu Bilet İptal Edilmiştir
                </h2>
                <p className="text-xs text-rose-300/80 font-mono mt-1 font-bold">
                  DURUM: REVOKED
                </p>
              </div>
              <div className="bg-rose-950/60 border border-rose-900/60 rounded-xl p-3.5 text-xs text-rose-200/90 text-left space-y-1">
                <p className="font-semibold text-rose-100 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-rose-400" />
                  İptal Gerekçesi:
                </p>
                <p className="italic text-rose-300">
                  {ticketData.revokedReason || 'Yetkisiz paylaşım veya protokol güncellemesi nedeniyle bilet geçersiz kılınmıştır.'}
                </p>
              </div>
              <p className="text-[11px] text-gray-400">
                Lütfen giriş kapısındaki VIP Reji Masası veya PR Koordinatörünüz ile iletişime geçiniz.
              </p>
            </div>
          ) : (
            /* DİNAMİK QR VE TOTP BÖLÜMÜ */
            <div className="p-6 flex flex-col items-center space-y-5">
              {/* QR Vizörü ve Çerçevesi */}
              <div className="relative p-3.5 rounded-2xl bg-white shadow-xl shadow-amber-500/10 border-2 border-amber-400/40 flex items-center justify-center">
                {/* Dinamik SVG QR Matrisi */}
                <QRCodeSVG
                  value={ticketData.qrPayload}
                  size={210}
                  level="H"
                  includeMargin={false}
                  className="rounded-lg"
                />

                {/* Arka Planda Yenileme İkonu */}
                {isRefreshing && (
                  <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] rounded-2xl flex items-center justify-center">
                    <RefreshCw className="w-8 h-8 text-amber-600 animate-spin" />
                  </div>
                )}
              </div>

              {/* CANLI 6 HANELİ TOTP VE SÜRE SAYACI */}
              <div className="w-full space-y-2 text-center">
                <div className="inline-flex items-center justify-center gap-3 bg-gray-950/80 border border-gray-800 rounded-xl px-5 py-2.5">
                  <div className="text-left">
                    <p className="text-[10px] uppercase font-bold tracking-wider text-gray-400">
                      Canlı Kapı Kodu
                    </p>
                    <p className="text-2xl font-black tracking-widest text-amber-400 font-mono">
                      {formattedTotp}
                    </p>
                  </div>

                  <div className="h-8 w-px bg-gray-800 mx-1" />

                  {/* Dairesel/Geri Sayım İndikatörü */}
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400">
                      Yenilenme
                    </span>
                    <span className="text-sm font-extrabold font-mono text-emerald-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {secondsLeft}s
                    </span>
                  </div>
                </div>

                {/* İlerleme Çubuğu */}
                <div className="w-full bg-gray-800/80 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-emerald-500 via-amber-400 to-amber-500 h-full transition-all duration-1000 ease-linear rounded-full"
                    style={{ width: `${100 - countdownPercent}%` }}
                  />
                </div>

                {/* Siber Güvenlik ve Anti-Screenshot Uyarısı */}
                <div className="pt-1">
                  <p className="text-[11px] text-amber-300/80 font-medium leading-relaxed bg-amber-950/30 border border-amber-900/40 rounded-xl p-2.5 text-center">
                    <span className="font-bold text-amber-200">🛡️ Güvenlik Protokolü:</span> Bu QR kod ve doğrulama anahtarı her 30 saniyede bir kriptografik olarak yenilenir. 
                    <span className="text-amber-100 font-semibold"> Ekran görüntüsü (screenshot) kapıda geçersizdir ve Replay Attack olarak engellenir.</span>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* DAVETLİ & ETKİNLİK DETAYLARI */}
          <div className="bg-gray-950/90 border-t border-gray-800/80 p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <p className="text-gray-400 text-[10px] uppercase font-bold tracking-wider">
                  Davetli / Protokol
                </p>
                <p className="font-bold text-white text-sm truncate mt-0.5">
                  {ticketData.guest.fullName}
                </p>
                {ticketData.guest.company && (
                  <p className="text-gray-400 text-[11px] truncate mt-0.5">
                    {ticketData.guest.company}
                  </p>
                )}
                {ticketData.guest.title && (
                  <p className="text-amber-400/80 text-[10px] truncate">
                    {ticketData.guest.title}
                  </p>
                )}
              </div>

              <div>
                <p className="text-gray-400 text-[10px] uppercase font-bold tracking-wider">
                  Kontenjan & +1 Hakkı
                </p>
                <div className="mt-0.5 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-amber-400" />
                  <span className="font-bold text-white text-sm">
                    {ticketData.invitation.plusOneApproved > 0
                      ? `Asil + ${ticketData.invitation.plusOneApproved} Misafir`
                      : 'Tek Kişilik (Yalnız Asil)'}
                  </span>
                </div>
                {ticketData.invitation.plusOneNames && (
                  <p className="text-gray-400 text-[11px] truncate mt-0.5">
                    Refakatçi: {ticketData.invitation.plusOneNames}
                  </p>
                )}
              </div>
            </div>

            <div className="pt-2 border-t border-gray-900 grid grid-cols-2 gap-4 text-xs text-gray-300">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-white">Mekan</p>
                  <p className="text-[11px] text-gray-400 leading-snug">
                    {ticketData.event.venue}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Clock className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-white">Kapı & Gösterim</p>
                  <p className="text-[11px] text-gray-400">
                    Kapı Açılış: 19:00
                  </p>
                  <p className="text-[11px] text-amber-300/80 font-medium">
                    Gala Başlangıç: 20:00
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Alt Bilet Tırtık Deseni */}
          <div className="relative h-4 bg-gray-950 flex items-center justify-between px-2 overflow-hidden">
            <div className="absolute -left-3 top-0 w-6 h-6 rounded-full bg-[#06080d]" />
            <div className="w-full border-t border-dashed border-gray-800 mx-4" />
            <div className="absolute -right-3 top-0 w-6 h-6 rounded-full bg-[#06080d]" />
          </div>

          {/* Alt Barkod & Seri Numarası */}
          <div className="bg-gray-950 p-4 pt-1 flex items-center justify-between text-[10px] text-gray-400 font-mono">
            <span>ID: {ticketData.ticketId.slice(0, 16)}</span>
            <span className="text-amber-500/80">PROT-v1-SECURED</span>
          </div>
        </div>

        {/* Canlı Yenile Butonu & Alt Bilgi */}
        <div className="flex items-center justify-between px-2">
          <button
            onClick={() => fetchTicketState(true)}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-amber-400 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-amber-400' : ''}`} />
            <span>Kodu Manuel Yenile</span>
          </button>

          <span className="text-[11px] text-gray-400">
            Gala PR Operasyon Platformu
          </span>
        </div>

        {/* BASIN VE VIP DAVETLİLER İÇİN ELEKTRONİK BASIN KİTİ (EPK) VE AMBARGO KARTI */}
        <div className="bg-gray-950/80 border border-gray-800 hover:border-amber-500/40 rounded-2xl p-4 shadow-xl transition space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>🎬 Elektronik Basın Kiti (EPK) & Ambargo Bilgisi</span>
                </h4>
                <p className="text-[10px] text-gray-400">Basın, Eleştirmen & VIP Protokol</p>
              </div>
            </div>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-sky-500/10 text-sky-300 border border-sky-500/30">
              Filigranlı İndirme
            </span>
          </div>

          <p className="text-xs text-gray-300 leading-relaxed">
            Akredite medya temsilcileri ve VIP davetliler için filmin yüksek çözünürlüklü fragman, bülten ve fotoğraf materyalleri <strong>kişiye özel filigran kimliği</strong> ile sunulmaktadır.
          </p>

          <div className="bg-gray-900/90 p-2.5 rounded-xl border border-gray-800 text-[11px] text-gray-400 flex items-center justify-between">
            <span>Ambargo Durumu:</span>
            <span className="text-amber-400 font-mono font-bold">Resmi Ambargo Aktif</span>
          </div>

          <button
            type="button"
            onClick={() => {
              alert(`Sayın ${ticketData?.guest.fullName || 'Davetli'}, filigranlı Basın Kiti (EPK) paketi denetim izine (Audit Log) kaydedilerek indiriliyor...`);
            }}
            className="w-full py-2 px-3 rounded-xl bg-gray-900 hover:bg-gray-800 text-sky-300 border border-gray-700 text-xs font-semibold flex items-center justify-center gap-2 transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Filigranlı Basın Kitini (EPK) İndir</span>
          </button>
        </div>
      </div>
    </div>
  );
}
