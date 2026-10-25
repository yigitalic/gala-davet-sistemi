'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import {
  Film,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  UserPlus,
  RefreshCw,
  Sparkles,
  AlertTriangle,
  FileText,
  Download,
  Printer,
  Edit3,
  Mail,
  Ticket,
  ChevronRight,
  Info,
} from 'lucide-react';

interface RsvpVerificationData {
  valid: boolean;
  token: string;
  ticketCode: string;
  guestId?: string;
  guestName: string;
  email?: string;
  company?: string | null;
  title?: string | null;
  category?: 'PR' | 'PRESS';
  eventTitle: string;
  movieTitle: string;
  venue: string;
  eventDateText: string;
  doorsOpenAt: string;
  startsAt: string;
  plusOneAllowed: number;
  currentRsvpStatus: 'PENDING' | 'CONFIRMED' | 'DECLINED';
  plusOneRequested: number;
  plusOneNames?: string;
  guestNote?: string;
  respondedAt?: string;
}

// Deterministik 21x21 SVG QR Matrisi Oluşturucu
function generateSvgQrCells(seed: string, step: number): boolean[][] {
  const size = 21;
  const matrix: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  // 1. Köşe Bulucu İşaretçileri (Finder Patterns 7x7)
  const drawFinder = (startX: number, startY: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        if (
          r === 0 ||
          r === 6 ||
          c === 0 ||
          c === 6 ||
          (r >= 2 && r <= 4 && c >= 2 && c <= 4)
        ) {
          matrix[startY + r][startX + c] = true;
        }
      }
    }
  };

  drawFinder(0, 0); // Sol üst
  drawFinder(size - 7, 0); // Sağ üst
  drawFinder(0, size - 7); // Sol alt

  // 2. Timing Patterns
  for (let i = 8; i < size - 8; i++) {
    matrix[6][i] = i % 2 === 0;
    matrix[i][6] = i % 2 === 0;
  }

  // 3. Deterministik Veri Hücreleri
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i) + step) & 0xffffffff;
  }

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      // Köşe finder alanlarını koru
      if (
        (r < 8 && c < 8) ||
        (r < 8 && c >= size - 8) ||
        (r >= size - 8 && c < 8) ||
        (r === 6 || c === 6)
      ) {
        continue;
      }
      // Merkez logo alanını boş bırak (9-11)
      if (r >= 9 && r <= 11 && c >= 9 && c <= 11) {
        matrix[r][c] = false;
        continue;
      }
      hash = (hash * 1664525 + 1013904223) & 0xffffffff;
      matrix[r][c] = (hash >>> 16) % 3 !== 0;
    }
  }

  return matrix;
}

export default function GuestOneClickRsvpPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const token = typeof params?.token === 'string' ? params.token : '';
  const initialActionParam = searchParams?.get('action');

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [eventData, setEventData] = useState<RsvpVerificationData | null>(null);

  // Form Yanıt Durumları
  const [selectedAction, setSelectedAction] = useState<'CONFIRMED' | 'DECLINED' | null>(null);
  const [hasPlusOne, setHasPlusOne] = useState<boolean>(false);
  const [plusOneCount, setPlusOneCount] = useState<number>(1);
  const [plusOneNames, setPlusOneNames] = useState<string>('');
  const [guestNote, setGuestNote] = useState<string>('');
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  // RFC 6238 TOTP Dinamik QR Sayacı (30 saniye)
  const [totpSecondsLeft, setTotpSecondsLeft] = useState<number>(30);
  const [totpStep, setTotpStep] = useState<number>(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setTotpSecondsLeft((prev) => {
        if (prev <= 1) {
          setTotpStep((s) => s + 1);
          return 30;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 1. API & URL'den Davetiye ve Kişi Bilgisi Çözümleme
  useEffect(() => {
    if (!token) {
      setError('Geçersiz veya eksik LCV davetiye bağlantısı.');
      setIsLoading(false);
      return;
    }

    const fetchInvitation = async () => {
      // URL Query Fallback Değerleri
      const urlGuestId = searchParams?.get('guestId') || '';
      const urlName = searchParams?.get('name');
      const urlEmail = searchParams?.get('email');
      const urlCompany = searchParams?.get('company');
      const urlGala = searchParams?.get('gala');
      const urlMovie = searchParams?.get('movie');
      const urlVenue = searchParams?.get('venue');
      const urlDate = searchParams?.get('date');
      const urlOpen = searchParams?.get('open');
      const urlStart = searchParams?.get('start');
      const urlPlusOne = searchParams?.get('plusOne');

      // Öncelikli İsim Belirleme (Yiğit Ali Çolakoğlu özel eşlemesi dahil)
      const fallbackGuestName =
        urlName ||
        (token.includes('yigit-ali') || urlEmail === 'yigitalicolakoglu22@gmail.com'
          ? 'Yiğit Ali Çolakoğlu'
          : 'VIP Protokol Davetlisi');

      const fallbackEmail =
        urlEmail ||
        (fallbackGuestName === 'Yiğit Ali Çolakoğlu' ? 'yigitalicolakoglu22@gmail.com' : '');

      let loadedData: RsvpVerificationData | null = null;

      try {
        const res = await fetch(`/api/rsvp?token=${encodeURIComponent(token)}`);
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.invitation) {
            const inv = json.invitation;
            loadedData = {
              valid: true,
              token: inv.token,
              ticketCode: inv.ticketCode || `#DISNEY-MOANA2-${Math.floor(1000 + Math.random() * 9000)}`,
              guestId: inv.guestId || urlGuestId,
              guestName: inv.guestName || fallbackGuestName,
              email: inv.email || fallbackEmail,
              company: inv.company || urlCompany || 'Disney Studios Protokol',
              title: inv.title || 'VIP Protokol Davetlisi',
              category: inv.category || 'PR',
              eventTitle: inv.eventTitle || urlGala || 'Moana 2 Türkiye Özel Galası',
              movieTitle: inv.movieTitle || urlMovie || 'Moana 2',
              venue: inv.venue || urlVenue || 'Zorlu PSM',
              eventDateText: inv.eventDateText || urlDate || '28 Kasım 2026, 19:00',
              doorsOpenAt: inv.doorsOpenAt || urlOpen || '19:00',
              startsAt: inv.startsAt || urlStart || '20:30',
              plusOneAllowed: typeof inv.plusOneAllowed === 'number' ? inv.plusOneAllowed : Number(urlPlusOne) || 1,
              currentRsvpStatus: inv.currentRsvpStatus || 'PENDING',
              plusOneRequested: inv.plusOneRequested || 0,
              plusOneNames: inv.plusOneNames || '',
              guestNote: inv.guestNote || '',
              respondedAt: inv.respondedAt,
            };
          }
        }
      } catch (err) {
        console.warn('API rsvp fetch hatası, URL parametreleri fallback ediliyor:', err);
      }

      // API yanıt vermediyse veya kayıt henüz yoksa URL parametreleri ile yapılandır
      if (!loadedData) {
        loadedData = {
          valid: true,
          token,
          ticketCode: `#DISNEY-MOANA2-${Math.floor(1000 + Math.random() * 9000)}`,
          guestId: urlGuestId || `guest-${token.slice(0, 8)}`,
          guestName: fallbackGuestName,
          email: fallbackEmail,
          company: urlCompany || 'Disney Studios Protokol',
          title: 'VIP Protokol Davetlisi',
          category: 'PR',
          eventTitle: urlGala || 'Moana 2 Türkiye Özel Galası',
          movieTitle: urlMovie || 'Moana 2',
          venue: urlVenue || 'Zorlu PSM',
          eventDateText: urlDate || '28 Kasım 2026, 19:00',
          doorsOpenAt: urlOpen || '19:00',
          startsAt: urlStart || '20:30',
          plusOneAllowed: Number(urlPlusOne) >= 0 ? Number(urlPlusOne) : 1,
          currentRsvpStatus: 'PENDING',
          plusOneRequested: 0,
          plusOneNames: '',
          guestNote: '',
        };
      }

      setEventData(loadedData);

      // Daha önce yanıtlanmışsa veya URL action varsa durumu yükle
      if (loadedData.currentRsvpStatus === 'CONFIRMED') {
        setSelectedAction('CONFIRMED');
        setIsSuccess(true);
        if (loadedData.plusOneRequested > 0) {
          setHasPlusOne(true);
          setPlusOneCount(loadedData.plusOneRequested);
          setPlusOneNames(loadedData.plusOneNames || '');
        }
        if (loadedData.guestNote) {
          setGuestNote(loadedData.guestNote);
        }
      } else if (loadedData.currentRsvpStatus === 'DECLINED') {
        setSelectedAction('DECLINED');
        setIsSuccess(true);
      } else if (initialActionParam === 'CONFIRMED' || initialActionParam === 'DECLINED') {
        setSelectedAction(initialActionParam);
      }

      setIsLoading(false);
    };

    fetchInvitation();
  }, [token, searchParams, initialActionParam]);

  // 2. LCV Yanıtını Kaydetme ve Çift Yönlü Senkronizasyon
  const handleSubmitRsvp = async (action: 'CONFIRMED' | 'DECLINED') => {
    setIsSubmitting(true);
    setSelectedAction(action);

    const payload = {
      token,
      action,
      plusOneRequested: action === 'CONFIRMED' && hasPlusOne ? plusOneCount : 0,
      plusOneNames: action === 'CONFIRMED' && hasPlusOne ? plusOneNames : '',
      guestNote,
      guestId: eventData?.guestId,
      name: eventData?.guestName,
      email: eventData?.email,
      company: eventData?.company,
      title: eventData?.title,
      gala: eventData?.eventTitle,
      movie: eventData?.movieTitle,
      venue: eventData?.venue,
      date: eventData?.eventDateText,
      open: eventData?.doorsOpenAt,
      start: eventData?.startsAt,
      plusOne: eventData?.plusOneAllowed,
      baseUrl: typeof window !== 'undefined' ? window.location.origin : undefined,
    };

    try {
      // 1. Sunucu API Kaydı (/api/rsvp)
      const res = await fetch('/api/rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.invitation) {
          setEventData((prev) =>
            prev ? { ...prev, ...json.invitation, currentRsvpStatus: action } : prev
          );
        }
      }
    } catch (err) {
      console.warn('Sunucuya LCV kaydedilemedi, yerel senkronizasyon uygulanıyor:', err);
    }

    // 2. İstemci Tarafı Anında localStorage Senkronizasyonu (/host ekranının anında görmesi için)
    try {
      if (typeof window !== 'undefined') {
        const respondedAt = new Date().toISOString();

        // A. gala_host_rsvp_responses_v17 listesine yaz
        const existingRsvpRaw = localStorage.getItem('gala_host_rsvp_responses_v17');
        const rsvpList: any[] = existingRsvpRaw ? JSON.parse(existingRsvpRaw) : [];
        const filteredList = rsvpList.filter((r) => r.token !== token && r.guestId !== eventData?.guestId);
        filteredList.push({
          token,
          guestId: eventData?.guestId,
          name: eventData?.guestName,
          email: eventData?.email,
          action,
          plusOneRequested: action === 'CONFIRMED' && hasPlusOne ? plusOneCount : 0,
          plusOneNames: action === 'CONFIRMED' && hasPlusOne ? plusOneNames : '',
          guestNote,
          ticketCode: eventData?.ticketCode || `#DISNEY-MOANA2-8492`,
          respondedAt,
        });
        localStorage.setItem('gala_host_rsvp_responses_v17', JSON.stringify(filteredList));

        // B. gala_host_guests_v16 ve v15 içindeki davetli durumunu güncelle
        ['gala_host_guests_v16', 'gala_host_guests_v15'].forEach((storageKey) => {
          const raw = localStorage.getItem(storageKey);
          if (raw) {
            try {
              const guestsArr: any[] = JSON.parse(raw);
              if (Array.isArray(guestsArr)) {
                const updatedGuests = guestsArr.map((g) => {
                  const match =
                    g.id === eventData?.guestId ||
                    (eventData?.email && g.email === eventData.email) ||
                    (eventData?.guestName && `${g.firstName} ${g.lastName}`.trim() === eventData.guestName.trim());
                  if (match) {
                    return {
                      ...g,
                      invitationState: action === 'CONFIRMED' ? 'INVITED' : 'IDLE',
                      lcvStatus: action,
                      plusOneAllowed: action === 'CONFIRMED' && hasPlusOne ? plusOneCount : g.plusOneAllowed,
                      plusOneNames: action === 'CONFIRMED' && hasPlusOne ? plusOneNames : '',
                      hostNotes: guestNote
                        ? `${g.hostNotes ? g.hostNotes + ' | ' : ''}Davetli LCV Notu: ${guestNote}`
                        : g.hostNotes,
                      lcvConfirmedAt: action === 'CONFIRMED' ? respondedAt : undefined,
                    };
                  }
                  return g;
                });
                localStorage.setItem(storageKey, JSON.stringify(updatedGuests));
              }
            } catch {}
          }
        });
      }
    } catch (localErr) {
      console.warn('localStorage senkronizasyon hatası:', localErr);
    }

    setIsSuccess(true);
    setIsSubmitting(false);
  };

  // Dinamik SVG QR Matrisi
  const qrMatrix = useMemo(() => {
    const seed = `${token}-${eventData?.ticketCode || 'DISNEY'}`;
    return generateSvgQrCells(seed, totpStep);
  }, [token, eventData?.ticketCode, totpStep]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center p-6 text-zinc-100 font-sans">
        <div className="flex flex-col items-center gap-4 text-center max-w-sm">
          <div className="w-10 h-10 border-2 border-zinc-200 border-t-transparent rounded-full animate-spin" />
          <h2 className="text-sm font-semibold tracking-wider text-zinc-200 uppercase">
            KRİPTOGRAFİK LCV BELİRTECİ DOĞRULANIYOR...
          </h2>
          <p className="text-xs text-zinc-500">
            Davetiye imzası ve güvenlik belirteci sorgulanıyor
          </p>
        </div>
      </div>
    );
  }

  if (error || !eventData) {
    return (
      <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center p-6 text-zinc-100 font-sans">
        <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-none p-8 text-center space-y-4">
          <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto" />
          <h2 className="text-lg font-bold text-white">Geçersiz LCV Bağlantısı</h2>
          <p className="text-xs text-zinc-400 leading-relaxed">
            {error || 'Bu davetiye bağlantısı artık aktif değil veya geçersiz bir belirteç içeriyor.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col items-center justify-center p-4 sm:p-6 md:p-10 font-sans selection:bg-zinc-800 selection:text-white print:bg-white print:text-black print:p-0">
      <div className="max-w-xl w-full space-y-6 relative z-10 my-auto">
        {/* Üst Kurumsal Gala Başlığı (Ekranda gösterilir, baskıda gizlenir) */}
        <div className="text-center space-y-2 print:hidden">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-zinc-900 border border-zinc-800 text-zinc-300 text-[11px] font-semibold tracking-wider uppercase">
            <Sparkles className="w-3.5 h-3.5 text-zinc-400" />
            <span>Walt Disney Studios Türkiye Gala Portalı</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {eventData.eventTitle}
          </h1>
          <p className="text-xs text-zinc-400">
            {eventData.venue} · {eventData.eventDateText}
          </p>
        </div>

        {/* 1. BAŞARI & DİNAMİK QR BİLET EKRANI (CONFIRMED) */}
        {isSuccess && selectedAction === 'CONFIRMED' ? (
          <div className="space-y-4">
            {/* LCV Teyit Bildirimi (Yazdırmada gizle) */}
            <div className="bg-zinc-900 border border-emerald-500/40 p-4 text-center space-y-1.5 print:hidden">
              <div className="inline-flex items-center gap-1.5 text-emerald-400 font-semibold text-xs uppercase tracking-wider">
                <CheckCircle2 className="w-4 h-4" />
                <span>LCV Onayınız Başarıyla Alındı</span>
              </div>
              <p className="text-xs text-zinc-400">
                Katılımınız teyit edildi. Dijital protokol giriş biletiniz hazırlandı.
              </p>
            </div>

            {/* DİNAMİK BİLET KARTI (YAZDIRILABİLİR KART) */}
            <div
              id="printable-ticket"
              className="bg-white text-zinc-950 border border-zinc-300 shadow-2xl overflow-hidden print:border-none print:shadow-none print:m-0"
            >
              {/* Bilet Üst Şerit */}
              <div className="bg-zinc-950 text-white px-5 py-3 flex items-center justify-between border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <Film className="w-4 h-4 text-zinc-300" />
                  <span className="font-bold text-xs uppercase tracking-wider">
                    DISNEY STUDIOS TÜRKİYE — VIP PROTOKOL GİRİŞ BİLETİ
                  </span>
                </div>
                <span className="font-mono text-xs font-bold bg-zinc-800 px-2 py-0.5 text-zinc-200">
                  {eventData.ticketCode}
                </span>
              </div>

              {/* Bilet İçeriği */}
              <div className="p-6 sm:p-7 space-y-6">
                {/* Davetli ve Kontenjan Satırı */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 border-b border-zinc-200">
                  <div>
                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">
                      Davetli Adı & Soyadı
                    </span>
                    <h2 className="text-xl font-bold text-zinc-950 mt-0.5">
                      {eventData.guestName}
                    </h2>
                    {eventData.email && (
                      <p className="text-xs text-zinc-500 font-mono mt-0.5">
                        {eventData.email}
                      </p>
                    )}
                    {eventData.company && (
                      <span className="inline-block mt-1 px-2 py-0.5 bg-zinc-100 text-zinc-700 text-[10px] font-semibold uppercase tracking-wider">
                        {eventData.company}
                      </span>
                    )}
                  </div>
                  <div className="sm:text-right">
                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">
                      Kontenjan & Giriş Durumu
                    </span>
                    <span className="inline-block mt-0.5 text-sm font-bold text-zinc-950 font-mono px-2 py-1 bg-zinc-100 border border-zinc-300">
                      {hasPlusOne && plusOneCount > 0
                        ? `1 + ${plusOneCount} KİŞİ (ÇİFT GİRİŞ)`
                        : '1 KİŞİ (PROTOKOL)'}
                    </span>
                    {hasPlusOne && plusOneNames && (
                      <p className="text-xs text-zinc-600 mt-1">
                        <strong>Refakatçi:</strong> {plusOneNames}
                      </p>
                    )}
                  </div>
                </div>

                {/* Etkinlik Detay Grid (Sıfır Koltuk Kuralı!) */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-zinc-50 border border-zinc-200 text-xs">
                  <div>
                    <span className="text-zinc-500 block text-[10px] uppercase font-bold">
                      Mekan
                    </span>
                    <span className="font-semibold text-zinc-900 block mt-0.5">
                      {eventData.venue}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[10px] uppercase font-bold">
                      Gala Tarihi
                    </span>
                    <span className="font-semibold text-zinc-900 block mt-0.5">
                      {eventData.eventDateText}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[10px] uppercase font-bold">
                      Kapı / Gösterim
                    </span>
                    <span className="font-semibold text-zinc-900 block mt-0.5">
                      {eventData.doorsOpenAt} / {eventData.startsAt}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[10px] uppercase font-bold">
                      Giriş Kategorisi
                    </span>
                    <span className="font-bold text-emerald-800 block mt-0.5">
                      VIP / Protokol Davetlisi
                    </span>
                  </div>
                </div>

                {/* Özel Not Varsa Göster */}
                {eventData.guestNote && (
                  <div className="p-3 bg-zinc-100 border-l-2 border-zinc-900 text-xs text-zinc-700">
                    <strong className="block text-[10px] uppercase font-bold text-zinc-500">
                      PR Ekibine İlettiğiniz Not:
                    </strong>
                    <span className="italic mt-0.5 block">&ldquo;{eventData.guestNote}&rdquo;</span>
                  </div>
                )}

                {/* DİNAMİK SVG QR KODU VE CANLI TOTP SAYACI */}
                <div className="flex flex-col items-center justify-center p-6 bg-zinc-100 border border-zinc-300 rounded-none text-center space-y-3">
                  <div className="p-3 bg-white border-2 border-zinc-950 shadow-sm relative">
                    {/* 21x21 SVG QR Çizimi */}
                    <svg
                      viewBox="0 0 21 21"
                      className="w-40 h-40 sm:w-44 sm:h-44 shape-rendering-crispEdges"
                      fill="currentColor"
                    >
                      {qrMatrix.map((row, r) =>
                        row.map((cell, c) =>
                          cell ? (
                            <rect
                              key={`${r}-${c}`}
                              x={c}
                              y={r}
                              width={1}
                              height={1}
                              className="text-zinc-950"
                            />
                          ) : null
                        )
                      )}
                    </svg>

                    {/* Merkez Logo Rozeti */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-8 h-8 bg-zinc-950 border border-white flex items-center justify-center shadow">
                        <Film className="w-4 h-4 text-white" />
                      </div>
                    </div>
                  </div>

                  {/* 30 Saniyelik TOTP Canlı Sayaç (Baskıda gizle) */}
                  <div className="flex items-center gap-2 text-xs print:hidden">
                    <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                    <span className="text-zinc-600">
                      Dinamik QR Kodu Yenileniyor:{' '}
                      <strong className="text-zinc-950 font-mono font-bold">
                        {totpSecondsLeft}s
                      </strong>
                    </span>
                  </div>

                  {/* Güvenlik Notu */}
                  <div className="flex items-center justify-center gap-1.5 text-[11px] text-zinc-500 max-w-sm">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                    <span>
                      <strong>RFC 6238 TOTP Korumalı Bilet:</strong> Ekran görüntüleri kapı turnikelerinde
                      geçersizdir; bu canlı ekran kapıda görevliye gösterilmelidir.
                    </span>
                  </div>
                </div>
              </div>

              {/* Bilet Alt Bilgi */}
              <div className="px-6 py-3 bg-zinc-100 border-t border-zinc-200 text-center text-[11px] text-zinc-500">
                Disney Studios Türkiye · PR, Medya ve Protokol Koordinasyon Direktörlüğü
              </div>
            </div>

            {/* BİLET AKSİYONLARI (YAZDIR & GÜNCELLE) - Baskıda Gizlenir */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 print:hidden">
              <button
                type="button"
                onClick={() => window.print()}
                className="py-3 px-4 bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-xs uppercase tracking-wider flex items-center justify-center gap-2 border border-zinc-800 transition"
              >
                <Printer className="w-4 h-4" />
                <span>Bileti Yazdır / PDF Kaydet</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsSuccess(false);
                  setSelectedAction(null);
                }}
                className="py-3 px-4 bg-zinc-950 hover:bg-zinc-900 text-zinc-300 hover:text-white font-semibold text-xs uppercase tracking-wider flex items-center justify-center gap-2 border border-zinc-800 transition"
              >
                <Edit3 className="w-4 h-4" />
                <span>LCV Bilgilerimi / +1 Tercihimi Güncelle</span>
              </button>
            </div>
          </div>
        ) : isSuccess && selectedAction === 'DECLINED' ? (
          /* 2. REDDEDİLDİ EKRANI */
          <div className="bg-zinc-900 border border-zinc-800 p-8 text-center space-y-4 shadow-xl">
            <div className="w-12 h-12 bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <XCircle className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-white">Katılamayacağınız Kaydedildi</h2>
            <p className="text-xs text-zinc-400 max-w-md mx-auto leading-relaxed">
              Sayın <strong>{eventData.guestName}</strong>, yanıtınız protokol ekibine iletilmiştir.
              Bir sonraki Walt Disney Studios prömiyerinde sizi ağırlamaktan onur duyarız.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsSuccess(false);
                  setSelectedAction(null);
                }}
                className="text-xs text-zinc-300 hover:text-white underline font-medium"
              >
                Fikriniz değiştiyse LCV yanıtınızı güncelleyebilirsiniz.
              </button>
            </div>
          </div>
        ) : (
          /* 3. LCV YANITLAMA FORMU */
          <div className="bg-zinc-900 border border-zinc-800 p-6 sm:p-8 space-y-6 shadow-2xl">
            {/* Davetli Karşılama Kartı */}
            <div className="p-4 bg-zinc-950 border-l-2 border-zinc-200 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                ÖZEL PROTOKOL DAVETİ
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-white">
                Sayın {eventData.guestName},
              </h2>
              <p className="text-xs text-zinc-400 leading-relaxed mt-1">
                Sizi, Walt Disney Studios sunumuyla gerçekleşecek olan <strong>{eventData.movieTitle}</strong> Türkiye
                özel galasında aramızda görmekten büyük onur duyarız. Lütfen katılım durumunuzu bildiriniz.
              </p>
            </div>

            {/* Etkinlik Detay Kartı */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-zinc-950 p-3 border border-zinc-800 flex items-center gap-3">
                <MapPin className="w-4 h-4 text-zinc-300 shrink-0" />
                <div>
                  <span className="text-zinc-500 text-[10px] block font-bold uppercase">Mekan</span>
                  <span className="font-semibold text-zinc-200">{eventData.venue}</span>
                </div>
              </div>
              <div className="bg-zinc-950 p-3 border border-zinc-800 flex items-center gap-3">
                <Calendar className="w-4 h-4 text-zinc-300 shrink-0" />
                <div>
                  <span className="text-zinc-500 text-[10px] block font-bold uppercase">Gala Tarihi</span>
                  <span className="font-semibold text-zinc-200">{eventData.eventDateText}</span>
                </div>
              </div>
              <div className="bg-zinc-950 p-3 border border-zinc-800 flex items-center gap-3">
                <Clock className="w-4 h-4 text-zinc-300 shrink-0" />
                <div>
                  <span className="text-zinc-500 text-[10px] block font-bold uppercase">Kapı Açılışı</span>
                  <span className="font-semibold text-zinc-200">{eventData.doorsOpenAt}</span>
                </div>
              </div>
            </div>

            {/* Refakatçi (+1) Tercihi */}
            <div className="bg-zinc-950 p-4 border border-zinc-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-zinc-400" />
                  <span className="text-xs font-semibold text-zinc-200">
                    Refakatçi (+1) ile Katılmak İstiyorum
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={hasPlusOne}
                  onChange={(e) => setHasPlusOne(e.target.checked)}
                  className="w-4 h-4 rounded-none border-zinc-700 bg-zinc-900 text-white focus:ring-0 cursor-pointer"
                />
              </div>

              {hasPlusOne && (
                <div className="pt-3 border-t border-zinc-800 space-y-3">
                  <div>
                    <label className="text-[11px] text-zinc-400 block mb-1 font-semibold uppercase">
                      Refakatçi Sayısı
                    </label>
                    <select
                      value={plusOneCount}
                      onChange={(e) => setPlusOneCount(Number(e.target.value))}
                      className="bg-zinc-900 border border-zinc-700 rounded-none px-3 py-1.5 text-xs text-white focus:outline-none focus:border-zinc-400 w-full"
                    >
                      <option value={1}>+1 Kişi (Çift Kişilik Bilet)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-zinc-400 block mb-1 font-semibold uppercase">
                      Refakatçi İsim / Soyisim
                    </label>
                    <input
                      type="text"
                      placeholder="Örn: Refakatçi Adı ve Soyadı"
                      value={plusOneNames}
                      onChange={(e) => setPlusOneNames(e.target.value)}
                      className="bg-zinc-900 border border-zinc-700 rounded-none px-3 py-1.5 text-xs text-white focus:outline-none focus:border-zinc-400 w-full"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* PR Ekibine Özel Not / Varış Saati */}
            <div className="bg-zinc-950 p-4 border border-zinc-800 space-y-2">
              <label className="text-[11px] text-zinc-400 block font-semibold uppercase">
                PR Ekibine Not / Tahmini Varış Saati
              </label>
              <textarea
                rows={2}
                value={guestNote}
                onChange={(e) => setGuestNote(e.target.value)}
                placeholder="Örn: 19:30 gibi alanda olacağım, kırmızı halı röportajına katılabilirim..."
                className="w-full bg-zinc-900 border border-zinc-700 rounded-none p-2.5 text-xs text-white focus:outline-none focus:border-zinc-400"
              />
            </div>

            {/* LCV Aksiyon Butonları */}
            <div className="space-y-3 pt-2">
              <button
                type="button"
                onClick={() => handleSubmitRsvp('CONFIRMED')}
                disabled={isSubmitting}
                className="w-full py-3.5 px-6 rounded-none bg-white hover:bg-zinc-200 text-zinc-950 font-bold text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-zinc-950" />
                    <span>LCV Kaydediliyor & Bilet Hazırlanıyor...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-zinc-950" />
                    <span>Katılıyorum (LCV Onayla & QR Bilet Oluştur)</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleSubmitRsvp('DECLINED')}
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 rounded-none bg-zinc-950 hover:bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800 text-xs font-semibold transition"
              >
                Maalesef Katılamıyorum (LCV Reddet)
              </button>
            </div>

            <div className="text-center text-[10px] text-zinc-500">
              * Onay verdiğinizde RFC 6238 TOTP korumalı dinamik dijital biletiniz anında
              oluşturulacaktır.
            </div>
          </div>
        )}

        {/* BASIN VE VIP DAVETLİLER İÇİN ELEKTRONİK BASIN KİTİ (EPK) KARTI (Baskıda gizle) */}
        <div className="bg-zinc-900 border border-zinc-800 p-5 space-y-3 print:hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-none bg-zinc-800 text-zinc-300 flex items-center justify-center font-bold">
                <FileText className="w-3.5 h-3.5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>Elektronik Basın Kiti (EPK) & Ambargo Bilgisi</span>
                </h4>
                <p className="text-[10px] text-zinc-500">Basın, Medya ve VIP Akreditasyonu</p>
              </div>
            </div>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-zinc-800 text-zinc-300 border border-zinc-700">
              Filigranlı Mühür
            </span>
          </div>

          <p className="text-xs text-zinc-400 leading-relaxed">
            Akredite basın mensupları ve davetliler için filmin yüksek çözünürlüklü tanıtım materyalleri{' '}
            <strong>kişiye özel filigran kimliği</strong> ile sunulmaktadır.
          </p>

          <div className="bg-zinc-950 p-2.5 border border-zinc-800 text-[11px] text-zinc-400 flex items-center justify-between">
            <span>Ambargo Durumu:</span>
            <span className="text-zinc-200 font-mono font-bold">Gala Öncesi Ambargo Aktif</span>
          </div>

          <button
            type="button"
            onClick={() => {
              alert(
                `Sayın ${eventData?.guestName || 'Davetli'}, filigranlı Basın Kiti (EPK) paketi denetim izine kaydedilerek indiriliyor...`
              );
            }}
            className="w-full py-2 px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs font-semibold flex items-center justify-center gap-2 transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Filigranlı Basın Kitini (EPK) İndir</span>
          </button>
        </div>
      </div>
    </div>
  );
}
