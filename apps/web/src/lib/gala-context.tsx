'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export interface GalaEvent {
  id: string;
  movieTitle: string;
  title: string;
  venue: string;
  dateStr: string;
  doorsOpen: string;
  capacity?: number;
  confirmedCount?: number;
  waitlistCount?: number;
  occupancyRate?: number;
}

export interface VipArrivalAlert {
  id: string;
  guestName: string;
  guestTag: 'VIP' | 'PRESS' | 'INFLUENCER' | 'CREW' | string;
  company?: string | null;
  gateName: string;
  plusOneCount: number;
  arrivedAt: string;
  timestamp: number;
  notificationText: string;
}

export interface GalaContextType {
  events: GalaEvent[];
  selectedEvent: GalaEvent;
  setSelectedEvent: (event: GalaEvent) => void;
  vipAlerts: VipArrivalAlert[];
  triggerVipArrivalAlert: (data: {
    guestName: string;
    guestTag: 'VIP' | 'PRESS' | 'INFLUENCER' | 'CREW' | string;
    company?: string | null;
    gateName?: string;
    plusOneCount?: number;
  }) => void;
  dismissVipAlert: (id: string) => void;
  clearAllVipAlerts: () => void;
}

export const DEFAULT_GALA_EVENTS: GalaEvent[] = [
  {
    id: 'evt-dune-3',
    movieTitle: 'Dune: Messiah',
    title: 'Dune: Messiah Türkiye Galası & Kırmızı Halı',
    venue: 'Zorlu PSM Turkcell Sahnesi, İstanbul',
    dateStr: '2026-11-20T20:00:00Z',
    doorsOpen: '19:00',
    capacity: 650,
    confirmedCount: 650,
    waitlistCount: 14,
    occupancyRate: 100,
  },
  {
    id: 'evt-gladiator-2',
    movieTitle: 'Gladiator II',
    title: 'Gladiator II Basın Ön Gösterimi & Protokol',
    venue: 'Kanyon Cinemaximum Salon 1, Levent',
    dateStr: '2026-11-25T11:00:00Z',
    doorsOpen: '10:15',
    capacity: 320,
    confirmedCount: 285,
    waitlistCount: 0,
    occupancyRate: 89.1,
  },
  {
    id: 'evt-kuru-otlar',
    movieTitle: 'Kuru Otlar Üstüne',
    title: 'Kuru Otlar Üstüne Özel Gala & Yönetmen Söyleşisi',
    venue: 'Atlas 1948 Sineması, Beyoğlu',
    dateStr: '2026-12-05T19:30:00Z',
    doorsOpen: '18:30',
    capacity: 450,
    confirmedCount: 420,
    waitlistCount: 8,
    occupancyRate: 93.3,
  },
];

const GalaContext = createContext<GalaContextType | undefined>(undefined);

const STORAGE_KEY = 'gala_selected_event_id';
const CUSTOM_EVENT_NAME = 'gala:event-changed';
const VIP_ALERT_EVENT_NAME = 'gala:vip-arrival';

export function GalaEventProvider({ children }: { children: React.ReactNode }) {
  const [events] = useState<GalaEvent[]>(DEFAULT_GALA_EVENTS);
  const [selectedEvent, setSelectedEventState] = useState<GalaEvent>(DEFAULT_GALA_EVENTS[0]);
  const [vipAlerts, setVipAlerts] = useState<VipArrivalAlert[]>([]);

  // 1. LocalStorage ve başlangıç senkronizasyonu
  useEffect(() => {
    try {
      const savedId = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
      if (savedId) {
        const found = DEFAULT_GALA_EVENTS.find((e) => e.id === savedId);
        if (found) {
          setSelectedEventState(found);
        }
      }
    } catch {
      // sessizce varsayılanı kullan
    }
  }, []);

  // 2. CustomEvent dinleyicisi (farklı sekmeler veya bağımsız bileşenler arası köprü)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleExternalEventChange = (e: Event) => {
      const customEvt = e as CustomEvent<GalaEvent>;
      if (customEvt.detail && customEvt.detail.id !== selectedEvent.id) {
        setSelectedEventState(customEvt.detail);
      }
    };

    const handleExternalVipAlert = (e: Event) => {
      const customEvt = e as CustomEvent<VipArrivalAlert>;
      if (customEvt.detail) {
        setVipAlerts((prev) => [customEvt.detail, ...prev.slice(0, 9)]);
      }
    };

    window.addEventListener(CUSTOM_EVENT_NAME, handleExternalEventChange);
    window.addEventListener(VIP_ALERT_EVENT_NAME, handleExternalVipAlert);

    return () => {
      window.removeEventListener(CUSTOM_EVENT_NAME, handleExternalEventChange);
      window.removeEventListener(VIP_ALERT_EVENT_NAME, handleExternalVipAlert);
    };
  }, [selectedEvent.id]);

  // 3. Etkinlik Değiştirme Fonksiyonu
  const setSelectedEvent = useCallback((event: GalaEvent) => {
    setSelectedEventState(event);
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, event.id);
        window.dispatchEvent(
          new CustomEvent(CUSTOM_EVENT_NAME, {
            detail: event,
          })
        );
      }
    } catch {
      // localStorage hatası
    }
  }, []);

  // 4. Canlı VIP & Basın Kapı Giriş Alarm Tetikleyicisi
  const triggerVipArrivalAlert = useCallback(
    (data: {
      guestName: string;
      guestTag: 'VIP' | 'PRESS' | 'INFLUENCER' | 'CREW' | string;
      company?: string | null;
      gateName?: string;
      plusOneCount?: number;
    }) => {
      const gate = data.gateName || 'Kapı A (Ana Protokol Girişi)';
      const plusOneText = data.plusOneCount && data.plusOneCount > 0 ? ` (+${data.plusOneCount})` : '';
      const notificationText = `🌟 CANLI KIRMIZI HALI / KAPI BİLDİRİMİ: [${data.guestName}]${plusOneText} şu an ${gate}'dan giriş yaptı! PR Karşılama Ekibi yönlendiriliyor.`;

      const newAlert: VipArrivalAlert = {
        id: `vip-alert-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        guestName: data.guestName,
        guestTag: data.guestTag,
        company: data.company || null,
        gateName: gate,
        plusOneCount: data.plusOneCount || 0,
        arrivedAt: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        timestamp: Date.now(),
        notificationText,
      };

      setVipAlerts((prev) => [newAlert, ...prev.slice(0, 9)]);

      // Sistem genelinde duyur
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent(VIP_ALERT_EVENT_NAME, {
            detail: newAlert,
          })
        );
      }
    },
    []
  );

  const dismissVipAlert = useCallback((id: string) => {
    setVipAlerts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const clearAllVipAlerts = useCallback(() => {
    setVipAlerts([]);
  }, []);

  return (
    <GalaContext.Provider
      value={{
        events,
        selectedEvent,
        setSelectedEvent,
        vipAlerts,
        triggerVipArrivalAlert,
        dismissVipAlert,
        clearAllVipAlerts,
      }}
    >
      {children}
    </GalaContext.Provider>
  );
}

export function useGalaEvent(): GalaContextType {
  const context = useContext(GalaContext);
  if (!context) {
    throw new Error('useGalaEvent must be used within a GalaEventProvider');
  }
  return context;
}
