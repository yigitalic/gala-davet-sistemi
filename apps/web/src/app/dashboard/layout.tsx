'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Film,
  Users,
  Mail,
  Bot,
  QrCode,
  BarChart3,
  ShieldCheck,
  Settings,
  Ticket,
  CheckSquare,
  Home,
  Menu,
  X,
  ChevronDown,
  Bell,
  Lock,
  Sparkles,
  LogOut,
  ExternalLink,
  ShieldAlert,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Radio,
  UserCheck,
  Building2,
} from 'lucide-react';
import { GalaEventProvider, useGalaEvent, GalaEvent, VipArrivalAlert } from '@/lib/gala-context';

export type { GalaEvent as ActiveGalaEvent };

function DashboardLayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  // Gala Context
  const {
    events,
    selectedEvent,
    setSelectedEvent,
    vipAlerts,
    dismissVipAlert,
    clearAllVipAlerts,
  } = useGalaEvent();

  // Mobil menü açılır-kapanır durumu
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Aktif Gala Seçimi Dropdown
  const [isEventDropdownOpen, setIsEventDropdownOpen] = useState(false);

  // Bildirim Açılır Kutusu
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  // VIP Radarı Açılır Paneli
  const [isVipRadarOpen, setIsVipRadarOpen] = useState(false);

  // Aktif Personel Bilgisi
  const [currentUser, setCurrentUser] = useState({
    firstName: 'Selin',
    lastName: 'Yılmaz',
    role: 'SUPER_ADMIN',
    email: 'selin.yilmaz@galapr.com',
  });

  // Sayfa değiştiğinde mobil menüyü ve dropdownları kapat
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsEventDropdownOpen(false);
    setIsNotificationOpen(false);
    setIsVipRadarOpen(false);
  }, [pathname]);

  // localStorage'dan veya oturumdan kullanıcı yükleme
  useEffect(() => {
    try {
      const stored = localStorage.getItem('gala_staff_user');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.firstName) {
          setCurrentUser(parsed);
        }
      }
    } catch {
      // sessizce varsayılanı kullan
    }
  }, []);

  const handleLogout = () => {
    try {
      localStorage.removeItem('gala_access_token');
      localStorage.removeItem('gala_staff_user');
    } catch {}
    router.push('/login');
  };

  // Navigasyon Grupları
  const navigationGroups = [
    {
      groupTitle: 'Komuta & Operasyon',
      items: [
        {
          name: 'Genel Bakış (Komuta Özeti)',
          href: '/dashboard',
          icon: LayoutDashboard,
          badge: null,
          exact: true,
        },
        {
          name: 'Gala & Etkinlik Yönetimi',
          href: '/dashboard/events',
          icon: Film,
          badge: `Aktif ${events.length}`,
        },
        {
          name: 'Davetli & PR CRM',
          href: '/dashboard/guests',
          icon: Users,
          badge: null,
        },
        {
          name: 'E-Posta & LCV Kampanya',
          href: '/dashboard/campaigns',
          icon: Mail,
          badge: selectedEvent.waitlistCount ? `${selectedEvent.waitlistCount} Yedek` : null,
          badgeColor: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
        },
        {
          name: 'AI Gelen Kutusu (RSVP Agent)',
          href: '/dashboard/ai-inbox',
          icon: Bot,
          badge: '3 İnceleme',
          badgeColor: 'bg-amber-500 text-slate-950 font-bold',
        },
      ],
    },
    {
      groupTitle: 'Saha & Analitik',
      items: [
        {
          name: 'Kapı Check-in PWA',
          href: '/dashboard/check-in',
          icon: QrCode,
          badge: 'Canlı TOTP',
          badgeColor: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
        },
        {
          name: '48s PR & ROI Analitiği',
          href: '/dashboard/analytics',
          icon: BarChart3,
          badge: null,
        },
      ],
    },
    {
      groupTitle: 'Yönetim & Güvenlik',
      items: [
        {
          name: 'KVKK & Denetim İzi',
          href: '/dashboard/security',
          icon: ShieldCheck,
          badge: 'AES-256',
          badgeColor: 'bg-sky-500/20 text-sky-300 border border-sky-500/30',
        },
        {
          name: 'Ekip (RBAC) & 2FA Ayarları',
          href: '/dashboard/settings',
          icon: Settings,
          badge: null,
        },
      ],
    },
  ];

  const quickLinks = [
    {
      name: '🏢 Dağıtımcı / Host Portalı (Disney TR - /host)',
      href: '/host',
      icon: Building2,
    },
    {
      name: 'Misafir LCV Ekranı (/rsvp)',
      href: '/rsvp/demo-token',
      icon: CheckSquare,
    },
    {
      name: 'Canlı Dinamik Bilet (/ticket)',
      href: '/ticket/demo-token',
      icon: Ticket,
    },
    {
      name: 'Ana Portala Dön (/)',
      href: '/',
      icon: Home,
    },
  ];

  const isLinkActive = (href: string, exact = false) => {
    if (exact) {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased">
      {/* --------------------------------------------------------------------- */}
      {/* 0. CANLI VIP & KIRMIZI HALI KAPI GİRİŞ BİLDİRİM BANNERI */}
      {/* --------------------------------------------------------------------- */}
      {vipAlerts.length > 0 && (
        <div className="bg-gradient-to-r from-amber-600 via-yellow-500 to-emerald-600 text-slate-950 px-4 py-2.5 text-xs font-bold shadow-xl flex items-center justify-between z-50 animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-950 animate-ping shrink-0" />
            <Sparkles className="w-4 h-4 shrink-0 text-slate-950" />
            <p className="truncate text-slate-950 font-extrabold tracking-wide">
              {vipAlerts[0].notificationText}
            </p>
            <span className="hidden sm:inline-block text-[10px] bg-slate-950/25 text-slate-950 px-2 py-0.5 rounded-full font-mono font-bold">
              {vipAlerts[0].arrivedAt}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-3">
            <button
              onClick={() => setIsVipRadarOpen(true)}
              className="text-[11px] underline font-bold px-2 py-0.5 rounded hover:bg-slate-950/10 transition"
            >
              Radarda Gör ({vipAlerts.length})
            </button>
            <button
              onClick={() => dismissVipAlert(vipAlerts[0].id)}
              className="p-1 hover:bg-black/20 rounded transition text-slate-950"
              title="Bildirimi Kapat"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* 1. ÜST KOMUTA ÇUBUĞU (TOPBAR) */}
      {/* --------------------------------------------------------------------- */}
      <header className="sticky top-0 z-40 h-16 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-6 flex items-center justify-between shadow-lg">
        {/* Sol Kısım: Mobil Menü Butonu & Platform Markası */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-amber-400 hover:border-amber-500/40 transition"
            aria-label="Menüyü Aç/Kapat"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20 group-hover:scale-105 transition">
              <Film className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base tracking-tight text-white group-hover:text-amber-300 transition">
                  GALA & PR
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 font-semibold uppercase">
                  SaaS 3.8
                </span>
              </div>
              <p className="text-[10px] text-slate-400 hidden sm:block">Kurumsal Komuta Portalı</p>
            </div>
          </Link>
        </div>

        {/* Orta Kısım: Global Aktif Gala Seçici (Event Switcher) */}
        <div className="relative hidden md:block">
          <button
            onClick={() => setIsEventDropdownOpen(!isEventDropdownOpen)}
            className="flex items-center gap-2.5 px-3.5 py-1.5 bg-slate-900/90 hover:bg-slate-850 border border-slate-800 hover:border-amber-500/40 rounded-xl text-left transition shadow-inner"
          >
            <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <div className="max-w-[240px] truncate">
              <div className="text-[11px] font-semibold text-white truncate">
                {selectedEvent.title}
              </div>
              <div className="text-[10px] text-slate-400 truncate">
                {selectedEvent.venue}
              </div>
            </div>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isEventDropdownOpen ? 'rotate-180 text-amber-400' : ''}`} />
          </button>

          {isEventDropdownOpen && (
            <div className="absolute left-0 mt-2 w-80 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 p-2 animate-in fade-in zoom-in-95">
              <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800/80 mb-1">
                Aktif Gala Seçimi (Global Context)
              </div>
              <div className="space-y-1">
                {events.map((event) => (
                  <button
                    key={event.id}
                    onClick={() => {
                      setSelectedEvent(event);
                      setIsEventDropdownOpen(false);
                    }}
                    className={`w-full text-left p-2.5 rounded-lg transition text-xs flex items-start gap-2.5 ${
                      selectedEvent.id === event.id
                        ? 'bg-amber-500/15 border border-amber-500/40 text-amber-200'
                        : 'hover:bg-slate-800/60 text-slate-300'
                    }`}
                  >
                    <Film className={`w-4 h-4 mt-0.5 shrink-0 ${selectedEvent.id === event.id ? 'text-amber-400' : 'text-slate-500'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{event.title}</p>
                      <p className="text-[10px] text-slate-400 truncate">{event.venue}</p>
                      <p className="text-[10px] text-amber-400/80 mt-0.5">Kapı Açılış: {event.doorsOpen}</p>
                    </div>
                  </button>
                ))}
              </div>
              <div className="mt-2 pt-2 border-t border-slate-800/80">
                <Link
                  href="/dashboard/events"
                  onClick={() => setIsEventDropdownOpen(false)}
                  className="block text-center text-xs text-amber-400 hover:text-amber-300 font-medium py-1"
                >
                  Tüm Galaları Yönet &rarr;
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Sağ Kısım: VIP Radarı, Kripto Rozeti, Bildirim Zili & Personel Profili */}
        <div className="flex items-center gap-3">
          {/* Canlı VIP Giriş Radarı Butonu */}
          <div className="relative">
            <button
              onClick={() => setIsVipRadarOpen(!isVipRadarOpen)}
              className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition shadow-sm ${
                vipAlerts.length > 0
                  ? 'bg-gradient-to-r from-amber-500/20 to-emerald-500/20 border-amber-500/50 text-amber-300 hover:border-amber-400'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
              title="Canlı VIP & Basın Giriş Radarı"
            >
              <Radio className={`w-3.5 h-3.5 ${vipAlerts.length > 0 ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`} />
              <span className="hidden sm:inline">VIP Radarı</span>
              {vipAlerts.length > 0 && (
                <span className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-extrabold flex items-center justify-center animate-pulse">
                  {vipAlerts.length}
                </span>
              )}
            </button>

            {/* VIP Radarı Açılır Paneli */}
            {isVipRadarOpen && (
              <div className="absolute right-0 mt-2 w-96 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 p-3 animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      Canlı VIP & Basın Kapı Radarı
                    </span>
                  </div>
                  {vipAlerts.length > 0 && (
                    <button
                      onClick={clearAllVipAlerts}
                      className="text-[10px] text-slate-400 hover:text-rose-400 transition"
                    >
                      Temizle
                    </button>
                  )}
                </div>

                <div className="mt-3 space-y-2 max-h-72 overflow-y-auto">
                  {vipAlerts.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-500">
                      <Radio className="w-6 h-6 mx-auto mb-2 text-slate-600" />
                      Henüz kapıdan VIP veya Basın girişi kaydedilmedi. Radar aktif olarak dinliyor...
                    </div>
                  ) : (
                    vipAlerts.map((alert) => (
                      <div
                        key={alert.id}
                        className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 hover:border-amber-500/40 transition"
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            alert.guestTag === 'VIP'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          }`}>
                            {alert.guestTag} PROTOKOL
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            {alert.arrivedAt}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-slate-200 mt-1">
                          {alert.guestName} {alert.plusOneCount > 0 ? `(+${alert.plusOneCount})` : ''}
                        </p>
                        {alert.company && (
                          <p className="text-[11px] text-slate-400">{alert.company}</p>
                        )}
                        <p className="text-[10px] text-amber-400/90 mt-1 flex items-center gap-1 font-mono">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          {alert.gateName} • PR Karşılama Hazır
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Canlı Kripto ve AI Durumu (Desktop) */}
          <div className="hidden xl:flex items-center gap-2 px-2.5 py-1 bg-slate-900/80 border border-slate-800 rounded-lg text-[11px]">
            <span className="flex items-center gap-1 text-emerald-400 font-mono">
              <Lock className="w-3 h-3" />
              AES-256-GCM
            </span>
            <span className="text-slate-600">•</span>
            <span className="flex items-center gap-1 text-amber-300">
              <Sparkles className="w-3 h-3 text-amber-400" />
              AI Agent Online
            </span>
          </div>

          {/* Bildirim Zili (AI Inbox Hızlı Uyarısı) */}
          <div className="relative">
            <button
              onClick={() => setIsNotificationOpen(!isNotificationOpen)}
              className="relative p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-amber-300 hover:border-amber-500/40 transition"
              title="Operasyonel Bildirimler"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-slate-950 text-[10px] font-bold flex items-center justify-center animate-pulse">
                3
              </span>
            </button>

            {isNotificationOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 p-3 animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    AI Gelen Kutusu Uyarısı
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-semibold">
                    3 Bekleyen İnceleme
                  </span>
                </div>
                <div className="mt-2.5 space-y-2 text-xs">
                  <div className="p-2 rounded-lg bg-slate-950 border border-slate-800/80">
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span className="font-semibold text-slate-200">Defne Samyeli (+1 Talebi)</span>
                      <span>5 dk önce</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">
                      &quot;Galaya eşimle katılmak istiyorum, VIP girişi onaylar mısınız?&quot;
                    </p>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-950 border border-slate-800/80">
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span className="font-semibold text-slate-200">Cem Yılmaz (Özel Soru)</span>
                      <span>18 dk önce</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">
                      &quot;Kırmızı halı geçiş saati kaçta başlıyor?&quot;
                    </p>
                  </div>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-800 text-center">
                  <Link
                    href="/dashboard/ai-inbox"
                    onClick={() => setIsNotificationOpen(false)}
                    className="text-xs text-amber-400 hover:text-amber-300 font-medium"
                  >
                    AI Gelen Kutusuna Git &rarr;
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Personel Profil Kapsülü */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
            <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700/80 flex items-center justify-center font-bold text-xs text-amber-300">
              {currentUser.firstName[0]}
              {currentUser.lastName[0]}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-semibold text-white leading-tight">
                {currentUser.firstName} {currentUser.lastName}
              </p>
              <span className="text-[10px] font-mono text-amber-400/90 leading-tight">
                {currentUser.role}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-900 transition"
              title="Oturumu Kapat"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* --------------------------------------------------------------------- */}
      {/* 2. ANA GÖVDE: SOL MENÜ (SIDEBAR) & SAYFA İÇERİĞİ */}
      {/* --------------------------------------------------------------------- */}
      <div className="flex-1 flex overflow-hidden">
        {/* DESKTOP SOL MENÜ (SIDEBAR) */}
        <aside className="hidden lg:flex w-64 flex-col bg-slate-950 border-r border-slate-800/80 p-4 space-y-6 overflow-y-auto">
          {/* Menü Grupları */}
          <div className="space-y-6 flex-1">
            {navigationGroups.map((group) => (
              <div key={group.groupTitle} className="space-y-1">
                <h4 className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                  {group.groupTitle}
                </h4>
                <div className="space-y-0.5 pt-1">
                  {group.items.map((item) => {
                    const active = isLinkActive(item.href, item.exact);
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition ${
                          active
                            ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30 shadow-sm'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon className={`w-4 h-4 ${active ? 'text-amber-400' : 'text-slate-400'}`} />
                          <span>{item.name}</span>
                        </div>
                        {item.badge && (
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                              item.badgeColor || 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Alt Kısım: Hızlı Misafir Bağlantıları ve Sistem Durumu */}
          <div className="pt-4 border-t border-slate-800/80 space-y-3">
            <div className="space-y-1">
              <h5 className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                Misafir Portalları
              </h5>
              <div className="space-y-0.5">
                {quickLinks.map((link) => {
                  const Icon = link.icon;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      target="_blank"
                      className="flex items-center justify-between px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-amber-300 hover:bg-slate-900/40 transition group"
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-400" />
                        <span>{link.name}</span>
                      </div>
                      <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition" />
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Sistem Durum Kartı */}
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 text-[11px] space-y-1">
              <div className="flex items-center justify-between text-slate-400 font-mono text-[10px]">
                <span>SİSTEM DURUMU</span>
                <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  %100 AKTİF
                </span>
              </div>
              <p className="text-slate-400 text-[10px] leading-tight pt-1">
                Zero Seating Chart • Güvenli Kontenjan & Akıllı Yedek Liste Motoru Aktif
              </p>
            </div>
          </div>
        </aside>

        {/* MOBİL SLIDE-OVER MENÜ */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            <div
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <div className="relative w-72 max-w-full bg-slate-950 border-r border-slate-800 p-5 flex flex-col justify-between overflow-y-auto">
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center">
                      <Film className="w-4 h-4 text-slate-950" />
                    </div>
                    <span className="font-bold text-white text-sm">GALA & PR SaaS</span>
                  </div>
                  <button
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="p-1 text-slate-400 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Mobil Navigasyon */}
                {navigationGroups.map((group) => (
                  <div key={group.groupTitle} className="space-y-1">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                      {group.groupTitle}
                    </h4>
                    <div className="space-y-1 pt-1">
                      {group.items.map((item) => {
                        const active = isLinkActive(item.href, item.exact);
                        const Icon = item.icon;
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition ${
                              active
                                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <Icon className="w-4 h-4" />
                              <span>{item.name}</span>
                            </div>
                            {item.badge && (
                              <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${item.badgeColor || 'bg-slate-800 text-slate-300'}`}>
                                {item.badge}
                              </span>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {/* Hızlı Bağlantılar */}
                <div className="pt-3 border-t border-slate-800 space-y-1">
                  <h5 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                    Misafir Portalları
                  </h5>
                  {quickLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      target="_blank"
                      className="block px-3 py-1.5 text-xs text-slate-400 hover:text-amber-300"
                    >
                      {link.name} &rarr;
                    </Link>
                  ))}
                </div>
              </div>

              {/* Çıkış */}
              <div className="pt-3 border-t border-slate-800">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-rose-500/10 text-rose-300 border border-rose-500/20 text-xs font-semibold hover:bg-rose-500/20 transition"
                >
                  <LogOut className="w-4 h-4" />
                  Oturumu Kapat
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ANA İÇERİK ALANI */}
        <main className="flex-1 overflow-y-auto bg-slate-950 min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <GalaEventProvider>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </GalaEventProvider>
  );
}
