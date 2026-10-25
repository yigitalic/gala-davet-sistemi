'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Film,
  Calendar,
  Clock,
  MapPin,
  Users,
  Send,
  QrCode,
  BarChart3,
  Plus,
  Edit3,
  CheckCircle2,
  AlertCircle,
  Archive,
  Play,
  RotateCcw,
  Sparkles,
  Search,
  Filter,
  ChevronRight,
  TrendingUp,
  X,
  Check,
} from 'lucide-react';

export type EventStatus = 'DRAFT' | 'PUBLISHED' | 'COMPLETED' | 'ARCHIVED';

export interface EventItem {
  id: string;
  title: string;
  movieTitle: string;
  venue: string;
  startsAt: string;
  doorsOpenAt: string;
  capacity: number;
  status: EventStatus;
  description?: string | null;
  totalGuests: number;
  confirmedCount: number;
  declinedCount: number;
  uncertainCount: number;
  pendingCount: number;
  plusOneRequestedTotal: number;
  plusOneApprovedTotal: number;
  totalAttendeesExpected: number;
  occupancyRate: number; // örn: 74.5
  remainingCapacity: number;
}

const INITIAL_EVENTS: EventItem[] = [
  {
    id: 'evt-001',
    title: 'Dune: Messiah Türkiye Galası & Kırmızı Halı',
    movieTitle: 'Dune: Part Three (Messiah)',
    venue: 'Zorlu PSM Turkcell Sahnesi, İstanbul',
    startsAt: '2026-11-20T20:00:00Z',
    doorsOpenAt: '2026-11-20T19:00:00Z',
    capacity: 650,
    status: 'PUBLISHED',
    description: 'Resmi Türkiye gala prömiyeri, A-list protokol, basın toplantısı ve kırmızı halı organizasyonu.',
    totalGuests: 520,
    confirmedCount: 380,
    declinedCount: 40,
    uncertainCount: 15,
    pendingCount: 85,
    plusOneRequestedTotal: 120,
    plusOneApprovedTotal: 105,
    totalAttendeesExpected: 485,
    occupancyRate: 74.6,
    remainingCapacity: 165,
  },
  {
    id: 'evt-002',
    title: 'Gladiator II Basın Ön Gösterimi & Protokol',
    movieTitle: 'Gladiator II',
    venue: 'Kanyon Cinemaximum Salon 1, Levent',
    startsAt: '2026-11-25T11:00:00Z',
    doorsOpenAt: '2026-11-25T10:15:00Z',
    capacity: 320,
    status: 'PUBLISHED',
    description: 'Sabah basın gösterimi, sinema eleştirmenleri paneli ve yapımcı soru-cevap oturumu.',
    totalGuests: 290,
    confirmedCount: 220,
    declinedCount: 25,
    uncertainCount: 10,
    pendingCount: 35,
    plusOneRequestedTotal: 40,
    plusOneApprovedTotal: 30,
    totalAttendeesExpected: 250,
    occupancyRate: 78.1,
    remainingCapacity: 70,
  },
  {
    id: 'evt-003',
    title: 'Kuru Otlar Üstüne Özel Gala & Yönetmen Söyleşisi',
    movieTitle: 'Kuru Otlar Üstüne',
    venue: 'Atlas 1948 Sineması, Beyoğlu',
    startsAt: '2026-12-05T19:30:00Z',
    doorsOpenAt: '2026-12-05T18:30:00Z',
    capacity: 450,
    status: 'DRAFT',
    description: 'Cannes Film Festivali ödüllü film için özel retrospektif gala ve yönetmen söyleşisi.',
    totalGuests: 180,
    confirmedCount: 45,
    declinedCount: 5,
    uncertainCount: 20,
    pendingCount: 110,
    plusOneRequestedTotal: 20,
    plusOneApprovedTotal: 15,
    totalAttendeesExpected: 60,
    occupancyRate: 13.3,
    remainingCapacity: 390,
  },
  {
    id: 'evt-004',
    title: 'Oppenheimer Türkiye Özel Prömiyeri (VIP Arşiv)',
    movieTitle: 'Oppenheimer',
    venue: 'Zorlu PSM Ana Tiyatro, İstanbul',
    startsAt: '2026-06-15T20:30:00Z',
    doorsOpenAt: '2026-06-15T19:00:00Z',
    capacity: 700,
    status: 'COMPLETED',
    description: '70mm IMAX prömiyeri, akademi üyeleri ve protokol gösterimi.',
    totalGuests: 680,
    confirmedCount: 590,
    declinedCount: 50,
    uncertainCount: 0,
    pendingCount: 40,
    plusOneRequestedTotal: 100,
    plusOneApprovedTotal: 95,
    totalAttendeesExpected: 685,
    occupancyRate: 97.9,
    remainingCapacity: 15,
  },
  {
    id: 'evt-005',
    title: 'Barbie Basın & Influencer Pembe Halı Partisi',
    movieTitle: 'Barbie',
    venue: 'Soho House İstanbul Kış Bahçesi',
    startsAt: '2026-05-10T18:00:00Z',
    doorsOpenAt: '2026-05-10T17:30:00Z',
    capacity: 250,
    status: 'ARCHIVED',
    description: 'Tematik basın partisi, influencer resepsiyonu ve özel gösterim.',
    totalGuests: 240,
    confirmedCount: 235,
    declinedCount: 5,
    uncertainCount: 0,
    pendingCount: 0,
    plusOneRequestedTotal: 15,
    plusOneApprovedTotal: 15,
    totalAttendeesExpected: 250,
    occupancyRate: 100.0,
    remainingCapacity: 0,
  },
];

export default function EventsManagementPage() {
  const [events, setEvents] = useState<EventItem[]>(INITIAL_EVENTS);
  const [activeTab, setActiveTab] = useState<'ALL' | EventStatus>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Modal Durumları
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    movieTitle: '',
    venue: '',
    startsAt: '',
    doorsOpenAt: '',
    capacity: 500,
    status: 'PUBLISHED' as EventStatus,
    description: '',
  });

  // Backend'den veri çekme (fallback ile)
  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/v1/email/events');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setEvents(data);
        }
      }
    } catch {
      // API çevrimdışıysa mevcut mock verileri kullan
    } finally {
      setIsLoading(false);
    }
  };

  // Yeni veya Düzenle Modalını Aç
  const handleOpenModal = (event?: EventItem) => {
    if (event) {
      setEditingEvent(event);
      setFormData({
        title: event.title,
        movieTitle: event.movieTitle,
        venue: event.venue,
        startsAt: event.startsAt ? event.startsAt.substring(0, 16) : '',
        doorsOpenAt: event.doorsOpenAt ? event.doorsOpenAt.substring(0, 16) : '',
        capacity: event.capacity,
        status: event.status,
        description: event.description || '',
      });
    } else {
      setEditingEvent(null);
      setFormData({
        title: '',
        movieTitle: '',
        venue: '',
        startsAt: new Date(Date.now() + 7 * 86400000).toISOString().substring(0, 16),
        doorsOpenAt: new Date(Date.now() + 7 * 86400000 - 3600000).toISOString().substring(0, 16),
        capacity: 500,
        status: 'PUBLISHED',
        description: '',
      });
    }
    setIsModalOpen(true);
  };

  // Form Gönder
  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      ...formData,
      startsAt: new Date(formData.startsAt).toISOString(),
      doorsOpenAt: new Date(formData.doorsOpenAt).toISOString(),
      capacity: Number(formData.capacity),
    };

    if (editingEvent) {
      // Düzenleme
      try {
        await fetch(`/api/v1/email/events/${editingEvent.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } catch {}

      setEvents((prev) =>
        prev.map((ev) =>
          ev.id === editingEvent.id
            ? {
                ...ev,
                ...payload,
                remainingCapacity: Math.max(0, payload.capacity - ev.totalAttendeesExpected),
                occupancyRate:
                  payload.capacity > 0
                    ? Math.round((ev.totalAttendeesExpected / payload.capacity) * 1000) / 10
                    : 0,
              }
            : ev
        )
      );
    } else {
      // Yeni Oluşturma
      const newEvent: EventItem = {
        id: `evt-${Date.now().toString().slice(-4)}`,
        ...payload,
        totalGuests: 0,
        confirmedCount: 0,
        declinedCount: 0,
        uncertainCount: 0,
        pendingCount: 0,
        plusOneRequestedTotal: 0,
        plusOneApprovedTotal: 0,
        totalAttendeesExpected: 0,
        occupancyRate: 0,
        remainingCapacity: payload.capacity,
      };

      try {
        await fetch('/api/v1/email/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } catch {}

      setEvents((prev) => [newEvent, ...prev]);
    }

    setIsModalOpen(false);
  };

  // Hızlı Durum Değiştirme
  const handleChangeStatus = async (eventId: string, newStatus: EventStatus) => {
    try {
      await fetch(`/api/v1/email/events/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
    } catch {}

    setEvents((prev) =>
      prev.map((ev) => (ev.id === eventId ? { ...ev, status: newStatus } : ev))
    );
  };

  // Filtrelenmiş Etkinlikler
  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      if (activeTab !== 'ALL' && ev.status !== activeTab) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return (
          ev.title.toLowerCase().includes(term) ||
          ev.movieTitle.toLowerCase().includes(term) ||
          ev.venue.toLowerCase().includes(term)
        );
      }
      return true;
    });
  }, [events, activeTab, searchTerm]);

  // Durum Rozet Rengi
  const getStatusBadge = (status: EventStatus) => {
    switch (status) {
      case 'PUBLISHED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Yayında (PUBLISHED)
          </span>
        );
      case 'DRAFT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
            Taslak (DRAFT)
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-500/15 text-sky-300 border border-sky-500/30">
            <CheckCircle2 className="w-3 h-3" />
            Tamamlandı (COMPLETED)
          </span>
        );
      case 'ARCHIVED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-500/15 text-slate-400 border border-slate-700">
            <Archive className="w-3 h-3" />
            Arşiv (ARCHIVED)
          </span>
        );
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* --------------------------------------------------------------------- */}
      {/* ÜST BAŞLIK VE YENİ ETKİNLİK BUTONU */}
      {/* --------------------------------------------------------------------- */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Film className="w-4 h-4" />
            </div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">
              Gala & Özel Gösterim Yönetimi
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Toplam salon kapasitesi, VIP/Basın kontenjanı ve kapı protokol girişleri üzerinden merkezi yönetim (Koltuksuz Düzen).
          </p>
        </div>

        <button
          onClick={() => handleOpenModal()}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm shadow-lg shadow-amber-500/20 transition"
        >
          <Plus className="w-4 h-4" />
          <span>+ Yeni Gala / Gösterim Oluştur</span>
        </button>
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* FİLTRE VE ARAMA ÇUBUĞU */}
      {/* --------------------------------------------------------------------- */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Durum Sekmeleri */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-xl overflow-x-auto text-xs">
          {[
            { id: 'ALL', label: 'Tüm Gösterimler' },
            { id: 'PUBLISHED', label: 'Yayında' },
            { id: 'DRAFT', label: 'Taslak' },
            { id: 'COMPLETED', label: 'Tamamlanan' },
            { id: 'ARCHIVED', label: 'Arşiv' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Arama Kutusu */}
        <div className="relative min-w-[260px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Film adı, etkinlik veya mekan ara..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 transition"
          />
        </div>
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* GALA KARTLARI LİSTESİ / GRİD */}
      {/* --------------------------------------------------------------------- */}
      <div className="space-y-4">
        {filteredEvents.length === 0 ? (
          <div className="text-center py-12 bg-slate-900/40 rounded-3xl border border-slate-800">
            <Film className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-slate-300">Etkinlik Bulunamadı</h4>
            <p className="text-xs text-slate-500 mt-1">Arama kriterlerine uygun gala etkinliği bulunmuyor.</p>
          </div>
        ) : (
          filteredEvents.map((event) => {
            const startsDate = new Date(event.startsAt);
            const doorsDate = new Date(event.doorsOpenAt);

            return (
              <div
                key={event.id}
                className="bg-slate-900/80 border border-slate-800 hover:border-amber-500/40 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xl transition group"
              >
                {/* Kart Üst Başlık & Durum */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-amber-300 font-semibold">
                        {event.movieTitle}
                      </span>
                      {getStatusBadge(event.status)}
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold text-white mt-1.5 group-hover:text-amber-300 transition">
                      {event.title}
                    </h3>
                  </div>

                  {/* Düzenle Butonu */}
                  <button
                    onClick={() => handleOpenModal(event)}
                    className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold transition"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                    <span>Etkinliği Düzenle</span>
                  </button>
                </div>

                {/* Mekan & Zaman Bilgileri */}
                <div className="flex flex-wrap items-center gap-y-2 gap-x-6 text-xs text-slate-300">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>{event.venue}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>
                      {startsDate.toLocaleDateString('tr-TR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        weekday: 'short',
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>
                      Kapı: {doorsDate.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })} • Başlangıç:{' '}
                      {startsDate.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                {/* KAPASİTE & LCV DOLULUK ÇUBUĞU */}
                <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4 space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">Salon Doluluk Durumu:</span>
                      <span className="text-amber-300 font-semibold font-mono">
                        {event.totalAttendeesExpected} / {event.capacity} Katılımcı
                      </span>
                      <span className="text-slate-500">•</span>
                      <span className="text-slate-400">
                        ({event.confirmedCount} Asil Onay + {event.plusOneApprovedTotal} Onaylı +1)
                      </span>
                    </div>
                    <div className="flex items-center gap-3 font-mono">
                      <span className="text-emerald-400 font-bold">%{event.occupancyRate} Dolu</span>
                      <span className="text-slate-500">•</span>
                      <span className="text-slate-400">Kalan Kontenjan: {event.remainingCapacity}</span>
                    </div>
                  </div>

                  {/* Doluluk Çubuğu */}
                  <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        event.occupancyRate >= 90
                          ? 'bg-gradient-to-r from-amber-400 to-rose-500'
                          : 'bg-gradient-to-r from-amber-400 to-emerald-400'
                      }`}
                      style={{ width: `${Math.min(100, event.occupancyRate)}%` }}
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400 pt-1">
                    <span>
                      Toplam Davet: <strong className="text-slate-200">{event.totalGuests}</strong> • Bekleyen:{' '}
                      <strong className="text-amber-300">{event.pendingCount}</strong> • Red:{' '}
                      <strong className="text-rose-400">{event.declinedCount}</strong> • Belirsiz:{' '}
                      <strong className="text-sky-300">{event.uncertainCount}</strong>
                    </span>
                    <span className="text-slate-500 italic">
                      Zero Seating Plan: Girişler QR bilet ve kapı protokol listesiyle sağlanır.
                    </span>
                  </div>
                </div>

                {/* HIZLI DURUM DEĞİŞTİRME & OPERASYONEL AKSİYON BUTONLARI */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
                  {/* Durum Değiştir Butonları */}
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-slate-500 text-[11px] mr-1">Durumu Değiştir:</span>
                    {event.status !== 'PUBLISHED' && (
                      <button
                        onClick={() => handleChangeStatus(event.id, 'PUBLISHED')}
                        className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold transition"
                      >
                        Yayına Al
                      </button>
                    )}
                    {event.status !== 'DRAFT' && event.status !== 'COMPLETED' && (
                      <button
                        onClick={() => handleChangeStatus(event.id, 'DRAFT')}
                        className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold transition"
                      >
                        Taslağa Al
                      </button>
                    )}
                    {event.status !== 'COMPLETED' && (
                      <button
                        onClick={() => handleChangeStatus(event.id, 'COMPLETED')}
                        className="px-2.5 py-1 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/30 font-semibold transition"
                      >
                        Tamamlandı Yap
                      </button>
                    )}
                    {event.status !== 'ARCHIVED' && (
                      <button
                        onClick={() => handleChangeStatus(event.id, 'ARCHIVED')}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700 font-semibold transition"
                      >
                        Arşivle
                      </button>
                    )}
                  </div>

                  {/* Hızlı Geçiş Butonları */}
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/dashboard/campaigns`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-semibold transition"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Kampanya Gönder</span>
                    </Link>

                    <Link
                      href={`/dashboard/check-in`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-semibold transition"
                    >
                      <QrCode className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Kapı Check-in</span>
                    </Link>

                    <Link
                      href={`/dashboard/analytics`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-semibold transition"
                    >
                      <BarChart3 className="w-3.5 h-3.5 text-sky-400" />
                      <span>PR ROI</span>
                    </Link>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* YENİ GALA / DÜZENLEME MODALI */}
      {/* --------------------------------------------------------------------- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl p-6 sm:p-8 space-y-6 shadow-2xl animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                  <Film className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-white">
                    {editingEvent ? 'Gala Etkinliğini Düzenle' : 'Yeni Gala / Özel Gösterim Oluştur'}
                  </h3>
                  <p className="text-xs text-slate-400">Etkinlik detaylarını ve toplam salon kapasitesini giriniz.</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEvent} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Film Adı <span className="text-amber-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.movieTitle}
                  onChange={(e) => setFormData({ ...formData, movieTitle: e.target.value })}
                  placeholder="örn: Dune: Messiah"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Gala / Etkinlik Başlığı <span className="text-amber-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="örn: Dune: Messiah Türkiye Galası & Kırmızı Halı"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Mekan & Şehir <span className="text-amber-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.venue}
                  onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                  placeholder="örn: Zorlu PSM Turkcell Sahnesi, İstanbul"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Gala Başlangıç Tarih & Saati <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.startsAt}
                    onChange={(e) => setFormData({ ...formData, startsAt: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Kapı Açılış Saati <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.doorsOpenAt}
                    onChange={(e) => setFormData({ ...formData, doorsOpenAt: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Toplam Salon Kapasitesi <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 1 })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500/50"
                  />
                  <span className="text-[10px] text-slate-500 block mt-1">Koltuksuz düzen — Toplam kişi sayısı</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Etkinlik Durumu
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as EventStatus })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500/50"
                  >
                    <option value="PUBLISHED">Yayında (PUBLISHED)</option>
                    <option value="DRAFT">Taslak (DRAFT)</option>
                    <option value="COMPLETED">Tamamlandı (COMPLETED)</option>
                    <option value="ARCHIVED">Arşiv (ARCHIVED)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Etkinlik Açıklaması / PR Protokol Notları
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Kırmızı halı protokolü, basın röportaj alanı ve kokteyl detayları..."
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-lg shadow-amber-500/20 transition"
                >
                  {editingEvent ? 'Değişiklikleri Kaydet' : 'Etkinliği Oluştur'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
