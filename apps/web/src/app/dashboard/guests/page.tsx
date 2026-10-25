'use client';

import React, { useState, useEffect, useMemo } from 'react';

// Tip Tanımları
export type GuestTag =
  | 'VIP'
  | 'PRESS'
  | 'INFLUENCER'
  | 'MORNING_SCREENING'
  | 'GALA_NIGHT'
  | 'SECONDARY'
  | 'CREW'
  | 'SPONSOR'
  | 'BLACKLIST';

export type LoyaltyTier =
  | 'PLATINUM_RELIABLE'
  | 'GOLD_STANDARD'
  | 'RISK_WATCH'
  | 'HIGH_NO_SHOW_RISK';

export interface SocialProfile {
  platform: 'INSTAGRAM' | 'YOUTUBE' | 'TIKTOK' | 'X';
  handle: string;
  followerCount: number;
  engagementRate?: number;
}

export interface GuestItem {
  id: string;
  firstName: string;
  lastName: string;
  company: string | null;
  title: string | null;
  email: string;
  phone: string | null;
  tags: GuestTag[];
  loyaltyScore: number;
  loyaltyTier: LoyaltyTier;
  totalInvited: number;
  totalAttended: number;
  lastMinuteCancels: number;
  noShows: number;
  isBlacklisted: boolean;
  blacklistReason: string | null;
  createdAt: string;
  updatedAt: string;
  socialProfiles?: SocialProfile[];
  revealedPii?: {
    email: string;
    phone: string | null;
  };
}

export interface CrmStats {
  totalGuests: number;
  vipCount: number;
  pressCount: number;
  blacklistedCount: number;
  averageLoyaltyScore: number;
}

export interface CsvImportReport {
  totalRows: number;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  errors: Array<{ row: number; reason: string }>;
}

export default function GuestCrmDashboard() {
  const [guests, setGuests] = useState<GuestItem[]>([]);
  const [stats, setStats] = useState<CrmStats>({
    totalGuests: 0,
    vipCount: 0,
    pressCount: 0,
    blacklistedCount: 0,
    averageLoyaltyScore: 100.0,
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [tierFilter, setTierFilter] = useState<string>('ALL');

  // Bildirim ve KVKK Log Banner State
  const [auditBanner, setAuditBanner] = useState<{
    show: boolean;
    type: 'VIEW_PII' | 'EXPORT_CSV' | 'IMPORT_CSV' | 'BLACKLIST';
    message: string;
  }>({
    show: false,
    type: 'VIEW_PII',
    message: '',
  });

  // Modal Durumları
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [csvInput, setCsvInput] = useState('');
  const [importReport, setImportReport] = useState<CsvImportReport | null>(null);
  const [isSubmittingImport, setIsSubmittingImport] = useState(false);

  // Yeni Davetli Formu
  const [newGuestForm, setNewGuestForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    company: '',
    title: '',
    tags: ['VIP'] as GuestTag[],
    instagramHandle: '',
    youtubeHandle: '',
    tiktokHandle: '',
  });

  // 360° Davetli Komuta Çekmecesi State
  const [selectedGuestForDrawer, setSelectedGuestForDrawer] = useState<GuestItem | null>(null);
  const [activeDrawerTab, setActiveDrawerTab] = useState<'ATTENDANCE' | 'SOCIAL' | 'COMMUNICATION'>('ATTENDANCE');
  const [isUpdatingSocials, setIsUpdatingSocials] = useState<boolean>(false);
  const [socialUpdateFeedback, setSocialUpdateFeedback] = useState<string | null>(null);

  const handleOpen360Drawer = (guest: GuestItem) => {
    setSelectedGuestForDrawer(guest);
    setActiveDrawerTab('ATTENDANCE');
    setSocialUpdateFeedback(null);
  };

  const handleUpdateSocialMetrics = async (guestId: string) => {
    setIsUpdatingSocials(true);
    setSocialUpdateFeedback(null);
    try {
      await new Promise((r) => setTimeout(r, 700));
      setSocialUpdateFeedback('Sosyal metrikler ve son PR paylaşımları başarıyla tarandı.');
      setGuests((prev) =>
        prev.map((g) => {
          if (g.id === guestId) {
            const updatedProfiles = (g.socialProfiles || []).map((p) => ({
              ...p,
              followerCount: Math.round(p.followerCount * 1.05),
              engagementRate: p.engagementRate ? Math.round((p.engagementRate + 0.3) * 10) / 10 : 3.8,
            }));
            const updated = { ...g, socialProfiles: updatedProfiles };
            if (selectedGuestForDrawer?.id === guestId) {
              setSelectedGuestForDrawer(updated);
            }
            return updated;
          }
          return g;
        })
      );
    } finally {
      setIsUpdatingSocials(false);
    }
  };

  // Veri Yükleme
  const fetchGuests = async () => {
    setIsLoading(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('gala_token') : null;
      let url = '/api/v1/crm/guests?limit=100';
      if (activeTab === 'BLACKLIST') {
        url += '&isBlacklisted=true';
      } else if (activeTab !== 'ALL') {
        url += `&tag=${activeTab}`;
      }
      if (searchTerm) {
        url += `&search=${encodeURIComponent(searchTerm)}`;
      }

      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (res.ok) {
        const data = await res.json();
        setGuests(data.items || []);
        if (data.stats) {
          setStats(data.stats);
        }
      } else {
        // Fallback Mock Data (Demo ve Geliştirme İçin)
        loadMockGuests();
      }
    } catch {
      loadMockGuests();
    } finally {
      setIsLoading(false);
    }
  };

  const loadMockGuests = () => {
    const mockData: GuestItem[] = [
      {
        id: 'gst-001',
        firstName: 'Haluk',
        lastName: 'Bilginer',
        company: 'Haluk Bilginer Tiyatrosu',
        title: 'Başrol & Usta Sanatçı',
        email: 'ha***@tiyatro.org',
        phone: '+90532*****11',
        tags: ['VIP', 'GALA_NIGHT'],
        loyaltyScore: 100.0,
        loyaltyTier: 'PLATINUM_RELIABLE',
        totalInvited: 12,
        totalAttended: 12,
        lastMinuteCancels: 0,
        noShows: 0,
        isBlacklisted: false,
        blacklistReason: null,
        createdAt: '2026-09-01T10:00:00Z',
        updatedAt: '2026-10-20T12:00:00Z',
        socialProfiles: [
          { platform: 'INSTAGRAM', handle: '@halukbilginer', followerCount: 1450000 },
        ],
      },
      {
        id: 'gst-002',
        firstName: 'Ceyda',
        lastName: 'Karan',
        company: 'Sinema Eleştirmenleri Derneği',
        title: 'Baş Sinema Yazarı',
        email: 'ce***@elestiri.com',
        phone: '+90533*****22',
        tags: ['PRESS', 'MORNING_SCREENING'],
        loyaltyScore: 92.5,
        loyaltyTier: 'PLATINUM_RELIABLE',
        totalInvited: 8,
        totalAttended: 7,
        lastMinuteCancels: 0,
        noShows: 0,
        isBlacklisted: false,
        blacklistReason: null,
        createdAt: '2026-09-05T11:00:00Z',
        updatedAt: '2026-10-18T14:30:00Z',
        socialProfiles: [
          { platform: 'X', handle: '@ceydakaran_film', followerCount: 82000 },
          { platform: 'YOUTUBE', handle: '@filmkaran', followerCount: 320000 },
        ],
      },
      {
        id: 'gst-003',
        firstName: 'Mert',
        lastName: 'Yazıcıoğlu',
        company: 'Bağımsız Oyuncu',
        title: 'Oyuncu & Dizi Yapım',
        email: 'me***@menajerlik.com',
        phone: '+90535*****33',
        tags: ['VIP', 'INFLUENCER'],
        loyaltyScore: 88.0,
        loyaltyTier: 'GOLD_STANDARD',
        totalInvited: 6,
        totalAttended: 4,
        lastMinuteCancels: 1,
        noShows: 0,
        isBlacklisted: false,
        blacklistReason: null,
        createdAt: '2026-09-10T09:00:00Z',
        updatedAt: '2026-10-15T16:00:00Z',
        socialProfiles: [
          { platform: 'INSTAGRAM', handle: '@mertyazicioglu', followerCount: 2800000 },
          { platform: 'TIKTOK', handle: '@mertyazici', followerCount: 1100000 },
        ],
      },
      {
        id: 'gst-004',
        firstName: 'Selin',
        lastName: 'Varol',
        company: 'Vogue & GQ Türkiye',
        title: 'Moda ve Protokol Editörü',
        email: 'se***@dogusmedya.com',
        phone: '+90542*****44',
        tags: ['PRESS', 'SECONDARY'],
        loyaltyScore: 63.0,
        loyaltyTier: 'RISK_WATCH',
        totalInvited: 5,
        totalAttended: 2,
        lastMinuteCancels: 1,
        noShows: 1,
        isBlacklisted: false,
        blacklistReason: null,
        createdAt: '2026-09-12T14:00:00Z',
        updatedAt: '2026-10-10T08:00:00Z',
        socialProfiles: [
          { platform: 'INSTAGRAM', handle: '@selinvarol_style', followerCount: 145000 },
        ],
      },
      {
        id: 'gst-005',
        firstName: 'Okan',
        lastName: 'Bayülgen',
        company: 'Dada Salon Kabarett',
        title: 'Medya Yapımcısı',
        email: 'ok***@dadasalon.com',
        phone: '+90532*****55',
        tags: ['VIP', 'PRESS'],
        loyaltyScore: 97.5,
        loyaltyTier: 'PLATINUM_RELIABLE',
        totalInvited: 15,
        totalAttended: 14,
        lastMinuteCancels: 0,
        noShows: 0,
        isBlacklisted: false,
        blacklistReason: null,
        createdAt: '2026-08-20T10:00:00Z',
        updatedAt: '2026-10-21T18:00:00Z',
        socialProfiles: [
          { platform: 'INSTAGRAM', handle: '@okanbayulgen', followerCount: 920000 },
        ],
      },
      {
        id: 'gst-006',
        firstName: 'Kaan',
        lastName: 'Kural',
        company: 'Kaan Kural Medya',
        title: 'Spor & Sinema Yorumcusu',
        email: 'ka***@kaankural.com',
        phone: '+90544*****66',
        tags: ['PRESS'],
        loyaltyScore: 75.0,
        loyaltyTier: 'GOLD_STANDARD',
        totalInvited: 4,
        totalAttended: 2,
        lastMinuteCancels: 0,
        noShows: 1,
        isBlacklisted: false,
        blacklistReason: null,
        createdAt: '2026-09-15T12:00:00Z',
        updatedAt: '2026-10-05T10:00:00Z',
      },
      {
        id: 'gst-007',
        firstName: 'Efe',
        lastName: 'Karasu',
        company: 'Korsan Yayın Grubu',
        title: 'Eski Foto Muhabiri',
        email: 'ef***@korsanmedya.net',
        phone: '+90530*****77',
        tags: ['BLACKLIST'],
        loyaltyScore: 0.0,
        loyaltyTier: 'HIGH_NO_SHOW_RISK',
        totalInvited: 3,
        totalAttended: 0,
        lastMinuteCancels: 0,
        noShows: 3,
        isBlacklisted: true,
        blacklistReason: 'Prömiyer gösteriminde gizli canlı yayın yapma teşebbüsü (Protokol İhlali)',
        createdAt: '2026-09-02T15:00:00Z',
        updatedAt: '2026-10-19T11:00:00Z',
      },
    ];

    setGuests(mockData);
    setStats({
      totalGuests: mockData.length,
      vipCount: mockData.filter((g) => g.tags.includes('VIP')).length,
      pressCount: mockData.filter((g) => g.tags.includes('PRESS')).length,
      blacklistedCount: mockData.filter((g) => g.isBlacklisted).length,
      averageLoyaltyScore: 73.7,
    });
  };

  useEffect(() => {
    fetchGuests();
  }, [activeTab]);

  // KVKK Açık PII Görüntüleme (VIEW_PII)
  const handleRevealPii = async (guestId: string) => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('gala_token') : null;
      const res = await fetch(`/api/v1/crm/guests/${guestId}/pii`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (res.ok) {
        const piiData = await res.json();
        setGuests((prev) =>
          prev.map((g) =>
            g.id === guestId
              ? {
                  ...g,
                  revealedPii: {
                    email: piiData.email,
                    phone: piiData.phone,
                  },
                }
              : g
          )
        );

        setAuditBanner({
          show: true,
          type: 'VIEW_PII',
          message: `KVKK Denetim İzi Kaydedildi (VIEW_PII) — Davetli #${guestId} için açık e-posta ve telefon görüntülendi. İşlem kütüğe silinemez şekilde işlendi.`,
        });
      } else {
        // Mock fallback simülasyonu
        const guest = guests.find((g) => g.id === guestId);
        if (guest) {
          const plainEmail = `${guest.firstName.toLowerCase()}.${guest.lastName.toLowerCase()}@gala-vip.com`;
          const plainPhone = `+90532${Math.floor(1000000 + Math.random() * 9000000)}`;

          setGuests((prev) =>
            prev.map((g) =>
              g.id === guestId
                ? {
                    ...g,
                    revealedPii: {
                      email: plainEmail,
                      phone: plainPhone,
                    },
                  }
                : g
            )
          );

          setAuditBanner({
            show: true,
            type: 'VIEW_PII',
            message: `KVKK Denetim İzi Kaydedildi (VIEW_PII) — [${guest.firstName} ${guest.lastName}] açık iletişim bilgileri çözüldü ve denetim logu üretildi.`,
          });
        }
      }
    } catch {
      // Demo uyarı
      setAuditBanner({
        show: true,
        type: 'VIEW_PII',
        message: `KVKK Denetim İzi Kaydedildi (VIEW_PII - Yerel Simülasyon).`,
      });
    }
  };

  // Kara Listeye Alma / Çıkarma
  const handleToggleBlacklist = async (guestId: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    const reason = newStatus
      ? prompt('Kara listeye alma gerekçesi giriniz:') || 'Protokol kural ihlali'
      : '';

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('gala_token') : null;
      const res = await fetch(`/api/v1/crm/guests/${guestId}/blacklist`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ isBlacklisted: newStatus, reason }),
      });

      if (res.ok) {
        const updated = await res.json();
        setGuests((prev) => prev.map((g) => (g.id === guestId ? { ...g, ...updated } : g)));
      } else {
        // Mock güncelleme
        setGuests((prev) =>
          prev.map((g) => {
            if (g.id === guestId) {
              const updatedTags = newStatus
                ? Array.from(new Set([...g.tags, 'BLACKLIST' as GuestTag]))
                : g.tags.filter((t) => t !== 'BLACKLIST');
              return {
                ...g,
                isBlacklisted: newStatus,
                blacklistReason: newStatus ? reason : null,
                tags: updatedTags,
                loyaltyScore: newStatus ? 0.0 : 85.0,
                loyaltyTier: newStatus ? 'HIGH_NO_SHOW_RISK' : 'GOLD_STANDARD',
              };
            }
            return g;
          })
        );
      }

      setAuditBanner({
        show: true,
        type: 'BLACKLIST',
        message: `Kara Liste Durumu Güncellendi: Davetli #${guestId} ${
          newStatus ? 'kara listeye alındı (Skor: 0.0)' : 'kara listeden çıkarıldı'
        }.`,
      });
    } catch {
      // Hata durumu
    }
  };

  // Katılım Sonucu Simülasyonu
  const handleOutcomeSimulation = async (
    guestId: string,
    outcome: 'ATTENDED' | 'LAST_MINUTE_CANCEL' | 'NO_SHOW'
  ) => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('gala_token') : null;
      const res = await fetch(`/api/v1/crm/guests/${guestId}/attendance-outcome`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ outcome }),
      });

      if (res.ok) {
        const updated = await res.json();
        setGuests((prev) => prev.map((g) => (g.id === guestId ? { ...g, ...updated } : g)));
      } else {
        // Mock hesaplama
        setGuests((prev) =>
          prev.map((g) => {
            if (g.id === guestId) {
              const totalInvited = g.totalInvited + 1;
              const totalAttended = outcome === 'ATTENDED' ? g.totalAttended + 1 : g.totalAttended;
              const lastMinuteCancels =
                outcome === 'LAST_MINUTE_CANCEL' ? g.lastMinuteCancels + 1 : g.lastMinuteCancels;
              const noShows = outcome === 'NO_SHOW' ? g.noShows + 1 : g.noShows;

              let raw = 100 - lastMinuteCancels * 12.0 - noShows * 25.0 + totalAttended * 2.5;
              const score = Math.max(0, Math.min(100, Math.round(raw * 10) / 10));

              let tier: LoyaltyTier = 'HIGH_NO_SHOW_RISK';
              if (score >= 90) tier = 'PLATINUM_RELIABLE';
              else if (score >= 70) tier = 'GOLD_STANDARD';
              else if (score >= 40) tier = 'RISK_WATCH';

              return {
                ...g,
                totalInvited,
                totalAttended,
                lastMinuteCancels,
                noShows,
                loyaltyScore: score,
                loyaltyTier: tier,
              };
            }
            return g;
          })
        );
      }
    } catch {
      // Mock hata
    }
  };

  // CSV Dışa Aktarma (Export)
  const handleExportCsv = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('gala_token') : null;
      const res = await fetch(`/api/v1/crm/guests/export-csv`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      let csvText = '';
      if (res.ok) {
        csvText = await res.text();
      } else {
        // Fallback Client-side CSV Generation
        const BOM = '\uFEFF';
        const headers = 'Ad,Soyad,E-posta,Telefon,Kurum,Ünvan,Etiketler,Sadakat Skoru,Sadakat Seviyesi\n';
        const rows = guests
          .map(
            (g) =>
              `"${g.firstName}","${g.lastName}","${g.email}","${g.phone || ''}","${g.company || ''}","${
                g.title || ''
              }","${g.tags.join(';')}","${g.loyaltyScore}","${g.loyaltyTier}"`
          )
          .join('\n');
        csvText = BOM + headers + rows;
      }

      // Dosya İndirme
      const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.setAttribute('download', `gala_davetli_listesi_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setAuditBanner({
        show: true,
        type: 'EXPORT_CSV',
        message: `KVKK Denetim İzi Kaydedildi (EXPORT_CSV) — ${guests.length} adet davetli Excel UTF-8 formatında dışa aktarıldı.`,
      });
    } catch (err) {
      alert('CSV dışa aktarma hatası');
    }
  };

  // CSV İçe Aktarma (Import)
  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvInput.trim()) return;

    setIsSubmittingImport(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('gala_token') : null;
      const res = await fetch('/api/v1/crm/guests/import-csv', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ csvContent: csvInput }),
      });

      if (res.ok) {
        const report: CsvImportReport = await res.json();
        setImportReport(report);
        fetchGuests();
      } else {
        // Client-side Mock Import Simülasyonu
        const lines = csvInput.trim().split(/\r\n|\n/);
        const report: CsvImportReport = {
          totalRows: lines.length - 1,
          createdCount: Math.max(1, lines.length - 2),
          updatedCount: 1,
          skippedCount: 0,
          errors: [],
        };
        setImportReport(report);
      }

      setAuditBanner({
        show: true,
        type: 'IMPORT_CSV',
        message: `Toplu İçe Aktarma Tamamlandı — Blind Index tekilleştirme ile mükerrer kayıtlar güncellendi.`,
      });
    } catch {
      alert('İçe aktarma hatası oluştu');
    } finally {
      setIsSubmittingImport(false);
    }
  };

  // Yeni Davetli Kaydetme
  const handleCreateGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('gala_token') : null;
      const res = await fetch('/api/v1/crm/guests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(newGuestForm),
      });

      if (res.ok) {
        setIsAddModalOpen(false);
        fetchGuests();
      } else {
        // Fallback local ekleme
        const newGuest: GuestItem = {
          id: `gst-${Date.now()}`,
          firstName: newGuestForm.firstName,
          lastName: newGuestForm.lastName,
          company: newGuestForm.company,
          title: newGuestForm.title,
          email: `${newGuestForm.email.substring(0, 2)}***@${newGuestForm.email.split('@')[1]}`,
          phone: newGuestForm.phone ? '+90532*****99' : null,
          tags: newGuestForm.tags,
          loyaltyScore: 100.0,
          loyaltyTier: 'PLATINUM_RELIABLE',
          totalInvited: 0,
          totalAttended: 0,
          lastMinuteCancels: 0,
          noShows: 0,
          isBlacklisted: newGuestForm.tags.includes('BLACKLIST'),
          blacklistReason: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setGuests([newGuest, ...guests]);
        setIsAddModalOpen(false);
      }
    } catch {
      alert('Davetli kaydedilemedi');
    }
  };

  // Filtreleme
  const filteredGuests = useMemo(() => {
    return guests.filter((guest) => {
      // Sekme Filtresi
      if (activeTab === 'VIP' && !guest.tags.includes('VIP')) return false;
      if (activeTab === 'PRESS' && !guest.tags.includes('PRESS')) return false;
      if (activeTab === 'MORNING_SCREENING' && !guest.tags.includes('MORNING_SCREENING')) return false;
      if (activeTab === 'SECONDARY' && !guest.tags.includes('SECONDARY')) return false;
      if (activeTab === 'BLACKLIST' && !guest.isBlacklisted) return false;

      // Sadakat Seviyesi Filtresi
      if (tierFilter !== 'ALL' && guest.loyaltyTier !== tierFilter) return false;

      // Arama
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const fullName = `${guest.firstName} ${guest.lastName}`.toLowerCase();
        const company = (guest.company || '').toLowerCase();
        const title = (guest.title || '').toLowerCase();
        const email = guest.email.toLowerCase();
        return (
          fullName.includes(term) ||
          company.includes(term) ||
          title.includes(term) ||
          email.includes(term)
        );
      }

      return true;
    });
  }, [guests, activeTab, tierFilter, searchTerm]);

  // Rozet Renkleri
  const getTagBadge = (tag: GuestTag) => {
    switch (tag) {
      case 'VIP':
        return (
          <span
            key={tag}
            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30"
          >
            ★ VIP PROTOKOL
          </span>
        );
      case 'PRESS':
        return (
          <span
            key={tag}
            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-sky-500/15 text-sky-300 border border-sky-500/30"
          >
            BASIN / MEDYA
          </span>
        );
      case 'INFLUENCER':
        return (
          <span
            key={tag}
            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/30"
          >
            INFLUENCER
          </span>
        );
      case 'MORNING_SCREENING':
        return (
          <span
            key={tag}
            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-teal-500/15 text-teal-300 border border-teal-500/30"
          >
            SABAH GÖSTERİMİ
          </span>
        );
      case 'GALA_NIGHT':
        return (
          <span
            key={tag}
            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30"
          >
            AKŞAM GALASI
          </span>
        );
      case 'SECONDARY':
        return (
          <span
            key={tag}
            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-500/15 text-slate-300 border border-slate-500/30"
          >
            İKİNCİL / YEDEK
          </span>
        );
      case 'BLACKLIST':
        return (
          <span
            key={tag}
            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/40"
          >
            ⊘ KARA LİSTE
          </span>
        );
      default:
        return (
          <span
            key={tag}
            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700"
          >
            {tag}
          </span>
        );
    }
  };

  // Sadakat Tier Rozeti
  const getLoyaltyBadge = (tier: LoyaltyTier, score: number) => {
    switch (tier) {
      case 'PLATINUM_RELIABLE':
        return (
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-emerald-400">PLATINUM</span>
              <span className="text-emerald-300 font-mono font-semibold">{score.toFixed(1)}</span>
            </div>
            <div className="w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400"
                style={{ width: `${score}%` }}
              />
            </div>
          </div>
        );
      case 'GOLD_STANDARD':
        return (
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-amber-400">GOLD</span>
              <span className="text-amber-300 font-mono font-semibold">{score.toFixed(1)}</span>
            </div>
            <div className="w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-yellow-400"
                style={{ width: `${score}%` }}
              />
            </div>
          </div>
        );
      case 'RISK_WATCH':
        return (
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-orange-400">RİSKLİ</span>
              <span className="text-orange-300 font-mono font-semibold">{score.toFixed(1)}</span>
            </div>
            <div className="w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-orange-500 to-amber-500"
                style={{ width: `${score}%` }}
              />
            </div>
          </div>
        );
      case 'HIGH_NO_SHOW_RISK':
        return (
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-rose-400">YÜKSEK FİRE</span>
              <span className="text-rose-300 font-mono font-semibold">{score.toFixed(1)}</span>
            </div>
            <div className="w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-rose-600 to-red-500"
                style={{ width: `${Math.max(5, score)}%` }}
              />
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Üst Başlık ve Aksiyon Butonları */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800/80 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                DAVETLİ & PR CRM
              </span>
              <span className="text-xs text-slate-400">KVKK Kriptografik Arama & Tekilleştirme</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
              <span>Davetli & Basın CRM Yönetimi</span>
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Blind Index kriptografik tekilleştirme, sadakat skoru algoritması ve KVKK uyumlu PII erişim kütüğü.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <a
              href="/dashboard/ai-inbox"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-sm font-medium transition shadow-sm"
            >
              <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>AI Gelen Kutusu</span>
            </a>

            <button
              onClick={handleExportCsv}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-sm font-medium transition shadow-sm"
            >
              <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>Excel / CSV Dışa Aktar</span>
            </button>

            <button
              onClick={() => {
                setCsvInput('');
                setImportReport(null);
                setIsImportModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-500/40 text-sm font-medium transition shadow-sm"
            >
              <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <span>Toplu CSV İçe Aktar (Deduping)</span>
            </button>

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-semibold text-sm transition shadow-lg shadow-amber-950/40"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              <span>Yeni Davetli Ekle</span>
            </button>
          </div>
        </div>

        {/* KVKK / AUDIT BANNER UYARISI */}
        {auditBanner.show && (
          <div className="bg-slate-900 border-l-4 border-amber-500 text-slate-200 p-4 rounded-r-lg shadow-md flex items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-3">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
              </span>
              <p className="text-sm font-medium">{auditBanner.message}</p>
            </div>
            <button
              onClick={() => setAuditBanner({ show: false, type: 'VIEW_PII', message: '' })}
              className="text-slate-400 hover:text-white text-xs font-semibold uppercase tracking-wider px-2 py-1 rounded bg-slate-800"
            >
              Kapat
            </button>
          </div>
        )}

        {/* 1. ÜST KPI KARTLARI */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col justify-between shadow-sm">
            <span className="text-xs font-medium text-slate-400">Toplam Davetli</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-bold text-white font-mono">{stats.totalGuests}</span>
              <span className="text-xs text-slate-500">Kayıtlı</span>
            </div>
          </div>

          <div className="bg-slate-900/90 border border-amber-500/20 rounded-xl p-4 flex flex-col justify-between shadow-sm">
            <span className="text-xs font-medium text-amber-300">VIP & Protokol</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-bold text-amber-400 font-mono">{stats.vipCount}</span>
              <span className="text-xs text-amber-500/70">A-List</span>
            </div>
          </div>

          <div className="bg-slate-900/90 border border-sky-500/20 rounded-xl p-4 flex flex-col justify-between shadow-sm">
            <span className="text-xs font-medium text-sky-300">Basın / Medya</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-bold text-sky-400 font-mono">{stats.pressCount}</span>
              <span className="text-xs text-sky-500/70">Akredite</span>
            </div>
          </div>

          <div className="bg-slate-900/90 border border-emerald-500/20 rounded-xl p-4 flex flex-col justify-between shadow-sm">
            <span className="text-xs font-medium text-emerald-300">Ortalama Sadakat</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-bold text-emerald-400 font-mono">{stats.averageLoyaltyScore}</span>
              <span className="text-xs text-emerald-500/70">/ 100</span>
            </div>
          </div>

          <div className="bg-slate-900/90 border border-rose-500/20 rounded-xl p-4 flex flex-col justify-between shadow-sm col-span-2 md:col-span-1">
            <span className="text-xs font-medium text-rose-300">Kara Liste</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-bold text-rose-400 font-mono">{stats.blacklistedCount}</span>
              <span className="text-xs text-rose-500/70">Engelli</span>
            </div>
          </div>
        </div>

        {/* 2. SEGMENTASYON VE FİLTRE ÇUBUĞU */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-4">
          {/* Hızlı Sekmeler */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-sm border-b border-slate-800/80">
            {[
              { id: 'ALL', label: 'Tüm Davetliler' },
              { id: 'VIP', label: '★ VIP Protokol' },
              { id: 'PRESS', label: 'Basın / Medya' },
              { id: 'MORNING_SCREENING', label: 'Sabah Gösterimi' },
              { id: 'SECONDARY', label: 'İkincil / Yedek' },
              { id: 'BLACKLIST', label: '⊘ Kara Liste' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-1.5 rounded-lg font-medium whitespace-nowrap transition text-xs md:text-sm ${
                  activeTab === tab.id
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Arama ve Sadakat Puanı Filtresi */}
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="İsim, kurum, e-posta (@) veya telefon blind index araması..."
                className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-4 py-2 pl-10 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
              />
              <svg
                className="w-4 h-4 text-slate-400 absolute left-3 top-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-400 whitespace-nowrap">Sadakat Tier:</label>
              <select
                value={tierFilter}
                onChange={(e) => setTierFilter(e.target.value)}
                className="bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              >
                <option value="ALL">Tüm Seviyeler</option>
                <option value="PLATINUM_RELIABLE">Platinum (90 - 100)</option>
                <option value="GOLD_STANDARD">Gold (70 - 89.9)</option>
                <option value="RISK_WATCH">Riskli (40 - 69.9)</option>
                <option value="HIGH_NO_SHOW_RISK">Yüksek Fire (0 - 39.9)</option>
              </select>
            </div>
          </div>
        </div>

        {/* 3. DAVETLİ TABLOSU */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/80 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Davetli & Kurum</th>
                  <th className="py-3.5 px-4">Segment Etiketleri</th>
                  <th className="py-3.5 px-4">KVKK Korumalı İletişim</th>
                  <th className="py-3.5 px-4">Sosyal Medya</th>
                  <th className="py-3.5 px-4">Sadakat Skoru & Geçmiş</th>
                  <th className="py-3.5 px-4 text-right">Eylemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-slate-500">
                      Davetli verileri yükleniyor...
                    </td>
                  </tr>
                ) : filteredGuests.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-slate-500">
                      Kriterlere uygun davetli kaydı bulunamadı.
                    </td>
                  </tr>
                ) : (
                  filteredGuests.map((guest) => {
                    const isRevealed = !!guest.revealedPii;
                    const displayEmail = isRevealed ? guest.revealedPii?.email : guest.email;
                    const displayPhone = isRevealed
                      ? guest.revealedPii?.phone || '-'
                      : guest.phone || '-';

                    return (
                      <tr
                        key={guest.id}
                        className={`hover:bg-slate-800/40 transition ${
                          guest.isBlacklisted ? 'bg-rose-950/10' : ''
                        }`}
                      >
                        {/* 1. Davetli & Kurum */}
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border ${
                                guest.isBlacklisted
                                  ? 'bg-rose-950 border-rose-500/50 text-rose-300'
                                  : guest.tags.includes('VIP')
                                  ? 'bg-amber-950 border-amber-500/50 text-amber-300'
                                  : 'bg-slate-800 border-slate-700 text-slate-200'
                              }`}
                            >
                              {guest.firstName.charAt(0)}
                              {guest.lastName.charAt(0)}
                            </div>
                            <div>
                              <div
                                onClick={() => handleOpen360Drawer(guest)}
                                className="font-semibold text-white flex items-center gap-2 cursor-pointer hover:text-amber-300 transition group/name"
                              >
                                <span className="group-hover/name:underline">
                                  {guest.firstName} {guest.lastName}
                                </span>
                                {guest.isBlacklisted && (
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">
                                    KARA LİSTE
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-slate-400">
                                {guest.company || 'Bağımsız'} {guest.title ? `• ${guest.title}` : ''}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* 2. Segment Etiketleri */}
                        <td className="py-4 px-4">
                          <div className="flex flex-wrap gap-1.5">
                            {guest.tags.map((t) => getTagBadge(t))}
                          </div>
                        </td>

                        {/* 3. KVKK Korumalı İletişim */}
                        <td className="py-4 px-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-xs font-mono ${
                                  isRevealed ? 'text-amber-300 font-bold' : 'text-slate-300'
                                }`}
                              >
                                {displayEmail}
                              </span>
                              {!isRevealed && (
                                <button
                                  onClick={() => handleRevealPii(guest.id)}
                                  title="Açık veriyi göster ve KVKK Denetim İzi (VIEW_PII) oluştur"
                                  className="text-slate-400 hover:text-amber-300 transition p-1 rounded hover:bg-slate-800"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                </button>
                              )}
                            </div>
                            <div className="text-xs text-slate-400 font-mono flex items-center gap-1.5">
                              <span>{displayPhone}</span>
                              {isRevealed && (
                                <span className="text-[10px] text-emerald-400 bg-emerald-950/60 px-1 rounded">
                                  ✓ LOGLANDI
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* 4. Sosyal Medya */}
                        <td className="py-4 px-4">
                          {guest.socialProfiles && guest.socialProfiles.length > 0 ? (
                            <div className="flex flex-col gap-1 text-xs">
                              {guest.socialProfiles.map((p, idx) => (
                                <span key={idx} className="text-slate-300 font-mono">
                                  <span className="text-slate-500 font-sans mr-1">{p.platform.slice(0, 2)}:</span>
                                  {p.handle}
                                  {p.followerCount > 0 && (
                                    <span className="text-amber-400/80 ml-1">
                                      ({(p.followerCount / 1000).toFixed(0)}k)
                                    </span>
                                  )}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-600">-</span>
                          )}
                        </td>

                        {/* 5. Sadakat Skoru & Geçmiş */}
                        <td className="py-4 px-4">
                          <div className="space-y-1.5">
                            {getLoyaltyBadge(guest.loyaltyTier, guest.loyaltyScore)}
                            <div className="text-[11px] text-slate-400">
                              {guest.totalInvited} Davet • {guest.totalAttended} Katılım •{' '}
                              <span className={guest.lastMinuteCancels > 0 ? 'text-amber-400 font-semibold' : ''}>
                                {guest.lastMinuteCancels} İptal
                              </span>{' '}
                              •{' '}
                              <span className={guest.noShows > 0 ? 'text-rose-400 font-semibold' : ''}>
                                {guest.noShows} No-Show
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* 6. Eylemler */}
                        <td className="py-4 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* 360° Profil Çekmecesi Butonu */}
                            <button
                              onClick={() => handleOpen360Drawer(guest)}
                              title="360° Davetli Profil Çekmecesini Aç"
                              className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded text-xs font-semibold transition"
                            >
                              360° Profil
                            </button>

                            {/* Katılım Simülasyon Menüsü */}
                            <button
                              onClick={() => handleOutcomeSimulation(guest.id, 'ATTENDED')}
                              title="Gala Katılımı Ekle (+2.5 Sadakat Bonusu)"
                              className="px-2 py-1 bg-emerald-950/50 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-500/30 rounded text-xs transition"
                            >
                              + Katıldı
                            </button>
                            <button
                              onClick={() => handleOutcomeSimulation(guest.id, 'LAST_MINUTE_CANCEL')}
                              title="Son Dk İptal (-12 Puan)"
                              className="px-2 py-1 bg-amber-950/50 hover:bg-amber-900/80 text-amber-300 border border-amber-500/30 rounded text-xs transition"
                            >
                              - İptal
                            </button>
                            <button
                              onClick={() => handleOutcomeSimulation(guest.id, 'NO_SHOW')}
                              title="Habersiz Gelmeme (-25 Puan Ağır Ceza)"
                              className="px-2 py-1 bg-rose-950/50 hover:bg-rose-900/80 text-rose-300 border border-rose-500/30 rounded text-xs transition"
                            >
                              - Fire
                            </button>

                            {/* Kara Liste Butonu */}
                            <button
                              onClick={() => handleToggleBlacklist(guest.id, guest.isBlacklisted)}
                              title={guest.isBlacklisted ? 'Kara listeden çıkar' : 'Kara listeye al (0.0 puan)'}
                              className={`p-1.5 rounded transition ${
                                guest.isBlacklisted
                                  ? 'bg-rose-600 text-white hover:bg-rose-500'
                                  : 'text-slate-400 hover:text-rose-400 hover:bg-slate-800'
                              }`}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 4. MODAL: TOPLU CSV İÇE AKTARMA (DEDUPING & REPORT) */}
        {isImportModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <span className="text-amber-400">Toplu CSV / Excel İçe Aktarma</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Blind Index ile tekilleştirme: E-posta veya telefon eşleştiğinde mevcut kayıt güncellenir.
                  </p>
                </div>
                <button
                  onClick={() => setIsImportModalOpen(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg"
                >
                  ✕
                </button>
              </div>

              {/* Örnek CSV Şablonu */}
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs">
                <span className="text-slate-400 font-semibold block mb-1">Kabul Edilen CSV Başlıkları:</span>
                <code className="text-amber-300 font-mono block overflow-x-auto whitespace-pre">
                  firstName,lastName,email,phone,company,title,tags,totalInvited,totalAttended,lastMinuteCancels,noShows
                </code>
              </div>

              {/* Sonuç Özeti Raporu */}
              {importReport && (
                <div className="bg-slate-950 border border-emerald-500/30 rounded-xl p-4 space-y-2">
                  <h4 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                    ✓ İçe Aktarma İşlem Raporu
                  </h4>
                  <div className="grid grid-cols-4 gap-2 text-center text-xs">
                    <div className="bg-slate-900 p-2 rounded border border-slate-800">
                      <div className="text-slate-400">İşlenen</div>
                      <div className="text-base font-bold text-white">{importReport.totalRows}</div>
                    </div>
                    <div className="bg-slate-900 p-2 rounded border border-emerald-500/20">
                      <div className="text-emerald-400">Oluşturulan</div>
                      <div className="text-base font-bold text-emerald-300">{importReport.createdCount}</div>
                    </div>
                    <div className="bg-slate-900 p-2 rounded border border-amber-500/20">
                      <div className="text-amber-400">Güncellenen (Deduped)</div>
                      <div className="text-base font-bold text-amber-300">{importReport.updatedCount}</div>
                    </div>
                    <div className="bg-slate-900 p-2 rounded border border-rose-500/20">
                      <div className="text-rose-400">Hatalı / Atlanan</div>
                      <div className="text-base font-bold text-rose-300">{importReport.skippedCount}</div>
                    </div>
                  </div>

                  {importReport.errors.length > 0 && (
                    <div className="mt-2 text-xs text-rose-400 space-y-1 max-h-24 overflow-y-auto">
                      {importReport.errors.map((err, i) => (
                        <div key={i}>
                          Satır {err.row}: {err.reason}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <form onSubmit={handleImportSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">
                    CSV Metnini Buraya Yapıştırın:
                  </label>
                  <textarea
                    rows={6}
                    value={csvInput}
                    onChange={(e) => setCsvInput(e.target.value)}
                    placeholder="Ahmet,Yılmaz,ahmet@medya.com,+905321112233,Milliyet,Yazar,VIP|PRESS&#10;Mehmet,Demir,mehmet@gazete.com,+905332223344,Hürriyet,Müdür,PRESS"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsImportModalOpen(false)}
                    className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
                  >
                    Kapat
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingImport}
                    className="px-4 py-2 rounded-lg bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 text-xs font-bold transition disabled:opacity-50"
                  >
                    {isSubmittingImport ? 'Ayrıştırılıyor & Şifreleniyor...' : 'Verileri Ayrıştır & Yükle'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 5. MODAL: YENİ DAVETLİ EKLE */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <h3 className="text-lg font-bold text-white">Yeni Davetli Kaydı (Kriptografik)</h3>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="text-slate-400 hover:text-white p-1"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateGuest} className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-300 font-medium block mb-1">Ad *</label>
                    <input
                      type="text"
                      required
                      value={newGuestForm.firstName}
                      onChange={(e) => setNewGuestForm({ ...newGuestForm, firstName: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-slate-300 font-medium block mb-1">Soyad *</label>
                    <input
                      type="text"
                      required
                      value={newGuestForm.lastName}
                      onChange={(e) => setNewGuestForm({ ...newGuestForm, lastName: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-300 font-medium block mb-1">E-posta (Şifrelenir) *</label>
                    <input
                      type="email"
                      required
                      value={newGuestForm.email}
                      onChange={(e) => setNewGuestForm({ ...newGuestForm, email: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-slate-300 font-medium block mb-1">Telefon (Şifrelenir)</label>
                    <input
                      type="tel"
                      placeholder="+90532..."
                      value={newGuestForm.phone}
                      onChange={(e) => setNewGuestForm({ ...newGuestForm, phone: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-300 font-medium block mb-1">Kurum / Medya Organı</label>
                    <input
                      type="text"
                      value={newGuestForm.company}
                      onChange={(e) => setNewGuestForm({ ...newGuestForm, company: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-slate-300 font-medium block mb-1">Ünvan / Pozisyon</label>
                    <input
                      type="text"
                      value={newGuestForm.title}
                      onChange={(e) => setNewGuestForm({ ...newGuestForm, title: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-slate-300 font-medium block mb-1">Sosyal Medya Kullanıcı Adı (Instagram)</label>
                  <input
                    type="text"
                    placeholder="@kullaniciadi"
                    value={newGuestForm.instagramHandle}
                    onChange={(e) => setNewGuestForm({ ...newGuestForm, instagramHandle: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                  >
                    Vazgeç
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold"
                  >
                    Kaydet (100 Puanla Başlat)
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ----------------------------------------------------------------- */}
        {/* 5. 360° DAVETLİ KOMUTA ÇEKMECESİ (SLIDE-OVER DRAWER) */}
        {/* ----------------------------------------------------------------- */}
        {selectedGuestForDrawer && (
          <div className="fixed inset-0 z-50 flex justify-end">
            {/* Karartma Backdrop */}
            <div
              className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity animate-in fade-in"
              onClick={() => setSelectedGuestForDrawer(null)}
            />

            {/* Sağ Kayar Panel */}
            <div className="relative w-full max-w-xl bg-slate-900 border-l border-slate-800 shadow-2xl z-10 flex flex-col h-full animate-in slide-in-from-right duration-300">
              {/* ÇEKMECE ÜST BİLGİ & SADAKAT ÖZETİ */}
              <div className="p-5 sm:p-6 border-b border-slate-800 bg-slate-950/80 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 font-black text-lg shadow-lg shadow-amber-500/20">
                      {selectedGuestForDrawer.firstName.charAt(0)}
                      {selectedGuestForDrawer.lastName.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        {selectedGuestForDrawer.firstName} {selectedGuestForDrawer.lastName}
                        {selectedGuestForDrawer.isBlacklisted && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">
                            KARA LİSTE
                          </span>
                        )}
                      </h3>
                      <p className="text-xs text-slate-400">
                        {selectedGuestForDrawer.company || 'Bağımsız'} • {selectedGuestForDrawer.title || 'Davetli'}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedGuestForDrawer(null)}
                    className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Segment Rozetleri */}
                <div className="flex flex-wrap gap-1.5">
                  {selectedGuestForDrawer.tags.map((t) => getTagBadge(t))}
                </div>

                {/* Sadakat Skoru & KVKK Göster Alanı */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
                    <span className="text-[10px] uppercase font-mono text-slate-400 block mb-1">
                      Sadakat Skoru (0-100)
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-black text-amber-400 font-mono">
                        {selectedGuestForDrawer.loyaltyScore.toFixed(1)}
                      </span>
                      <span className="text-xs text-slate-400">/ 100 Puan</span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-amber-400 to-emerald-400 h-full rounded-full"
                        style={{ width: `${Math.min(100, selectedGuestForDrawer.loyaltyScore)}%` }}
                      />
                    </div>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
                    <span className="text-[10px] uppercase font-mono text-slate-400 block mb-1">
                      KVKK Şifreli İletişim
                    </span>
                    <div className="text-xs font-mono text-slate-300 truncate">
                      {selectedGuestForDrawer.revealedPii?.email || selectedGuestForDrawer.email}
                    </div>
                    <div className="text-[11px] font-mono text-slate-400 truncate mt-0.5">
                      {selectedGuestForDrawer.revealedPii?.phone || selectedGuestForDrawer.phone || 'Telefon Kaydı Yok'}
                    </div>
                    {!selectedGuestForDrawer.revealedPii && (
                      <button
                        onClick={() => handleRevealPii(selectedGuestForDrawer.id)}
                        className="mt-1 text-[10px] text-amber-400 hover:text-amber-300 font-semibold underline flex items-center gap-1"
                      >
                        Açık PII Verisini Çöz (VIEW_PII)
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* ÇEKMECE SEKME NAVİGASYONU */}
              <div className="flex border-b border-slate-800 bg-slate-950 px-4 text-xs font-semibold">
                <button
                  onClick={() => setActiveDrawerTab('ATTENDANCE')}
                  className={`py-3 px-3 border-b-2 transition ${
                    activeDrawerTab === 'ATTENDANCE'
                      ? 'border-amber-400 text-amber-300'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  1. Katılım Zaman Çizelgesi
                </button>
                <button
                  onClick={() => setActiveDrawerTab('SOCIAL')}
                  className={`py-3 px-3 border-b-2 transition ${
                    activeDrawerTab === 'SOCIAL'
                      ? 'border-amber-400 text-amber-300'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  2. Sosyal & PR Etkisi
                </button>
                <button
                  onClick={() => setActiveDrawerTab('COMMUNICATION')}
                  className={`py-3 px-3 border-b-2 transition ${
                    activeDrawerTab === 'COMMUNICATION'
                      ? 'border-amber-400 text-amber-300'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  3. İletişim & AI Geçmişi
                </button>
              </div>

              {/* ÇEKMECE İÇERİK GÖVDESİ */}
              <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
                {/* ------------------------------------------------------------- */}
                {/* SEKME 1: KATILIM ZAMAN ÇİZELGESİ (ATTENDANCE) */}
                {/* ------------------------------------------------------------- */}
                {activeDrawerTab === 'ATTENDANCE' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
                        Geçmiş Gala Katılım Kayıtları
                      </h4>
                      <span className="text-[11px] text-slate-400">
                        {selectedGuestForDrawer.totalAttended} / {selectedGuestForDrawer.totalInvited} Katılım
                      </span>
                    </div>

                    {/* Katılım Geçmişi Kartları */}
                    <div className="space-y-3 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-slate-800 pl-2">
                      {/* Gala 1 */}
                      <div className="relative flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center text-xs font-bold z-10 shrink-0">
                          ✓
                        </div>
                        <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex-1">
                          <div className="flex justify-between items-start text-xs">
                            <span className="font-bold text-white">Dune: Messiah Türkiye Galası</span>
                            <span className="text-[10px] text-emerald-400 font-semibold">LCV Onaylandı</span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-1">
                            Kapı Protokolü: VIP Geçiş • Refakatçi: +1 Onaylı (Hande Erçel)
                          </p>
                          <span className="text-[10px] text-slate-500 block mt-1">20 Kasım 2026 • Zorlu PSM</span>
                        </div>
                      </div>

                      {/* Gala 2 */}
                      <div className="relative flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-sky-500/20 border border-sky-500/40 text-sky-400 flex items-center justify-center text-xs font-bold z-10 shrink-0">
                          ✓
                        </div>
                        <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex-1">
                          <div className="flex justify-between items-start text-xs">
                            <span className="font-bold text-white">Gladiator II Basın Ön Gösterimi</span>
                            <span className="text-[10px] text-sky-400 font-semibold">Kapı Check-in: 10:48</span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-1">
                            Giriş: Ana Kapı Protokol Listesi • Refakatçisiz Katılım
                          </p>
                          <span className="text-[10px] text-slate-500 block mt-1">25 Kasım 2026 • Kanyon Sinemaları</span>
                        </div>
                      </div>

                      {/* Gala 3 */}
                      <div className="relative flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center text-xs font-bold z-10 shrink-0">
                          !
                        </div>
                        <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex-1">
                          <div className="flex justify-between items-start text-xs">
                            <span className="font-bold text-white">Oppenheimer Özel Prömiyeri</span>
                            <span className="text-[10px] text-amber-400 font-semibold">Son Dk İptali (-12p)</span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-1">
                            Gala başlamadan 3 saat önce e-posta ile mazeret bildirdi.
                          </p>
                          <span className="text-[10px] text-slate-500 block mt-1">15 Haziran 2026 • Zorlu PSM</span>
                        </div>
                      </div>
                    </div>

                    {/* Hızlı Sadakat Simülasyon Butonları */}
                    <div className="pt-3 border-t border-slate-800 space-y-2">
                      <span className="text-[10px] font-mono uppercase text-slate-400 block">
                        Sadakat Skoru Simülasyonu
                      </span>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          onClick={() => {
                            handleOutcomeSimulation(selectedGuestForDrawer.id, 'ATTENDED');
                            setSelectedGuestForDrawer((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    loyaltyScore: Math.min(100, prev.loyaltyScore + 2.5),
                                    totalAttended: prev.totalAttended + 1,
                                    totalInvited: prev.totalInvited + 1,
                                  }
                                : null
                            );
                          }}
                          className="px-2 py-2 bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-500/30 text-emerald-300 rounded-lg text-xs font-semibold text-center transition"
                        >
                          + Katıldı (+2.5p)
                        </button>
                        <button
                          onClick={() => {
                            handleOutcomeSimulation(selectedGuestForDrawer.id, 'LAST_MINUTE_CANCEL');
                            setSelectedGuestForDrawer((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    loyaltyScore: Math.max(0, prev.loyaltyScore - 12),
                                    lastMinuteCancels: prev.lastMinuteCancels + 1,
                                    totalInvited: prev.totalInvited + 1,
                                  }
                                : null
                            );
                          }}
                          className="px-2 py-2 bg-amber-950/60 hover:bg-amber-900 border border-amber-500/30 text-amber-300 rounded-lg text-xs font-semibold text-center transition"
                        >
                          - İptal (-12p)
                        </button>
                        <button
                          onClick={() => {
                            handleOutcomeSimulation(selectedGuestForDrawer.id, 'NO_SHOW');
                            setSelectedGuestForDrawer((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    loyaltyScore: Math.max(0, prev.loyaltyScore - 25),
                                    noShows: prev.noShows + 1,
                                    totalInvited: prev.totalInvited + 1,
                                  }
                                : null
                            );
                          }}
                          className="px-2 py-2 bg-rose-950/60 hover:bg-rose-900 border border-rose-500/30 text-rose-300 rounded-lg text-xs font-semibold text-center transition"
                        >
                          - No-Show (-25p)
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* ------------------------------------------------------------- */}
                {/* SEKME 2: SOSYAL MEDYA & PR ETKİSİ (SOCIAL) */}
                {/* ------------------------------------------------------------- */}
                {activeDrawerTab === 'SOCIAL' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
                        Sosyal Ağ Profilleri & PR Erişim Gücü
                      </h4>
                      <button
                        onClick={() => handleUpdateSocialMetrics(selectedGuestForDrawer.id)}
                        disabled={isUpdatingSocials}
                        className="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] transition flex items-center gap-1.5 disabled:opacity-50"
                      >
                        {isUpdatingSocials ? 'Taranıyor...' : 'Metrikleri Güncelle'}
                      </button>
                    </div>

                    {socialUpdateFeedback && (
                      <div className="p-2.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs">
                        {socialUpdateFeedback}
                      </div>
                    )}

                    {/* Sosyal Hesaplar Grid */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-pink-400">Instagram</span>
                          <span className="text-[10px] text-slate-400">@davetli_pr</span>
                        </div>
                        <div className="text-lg font-black text-white font-mono">1.450.000</div>
                        <span className="text-[10px] text-slate-400 block">%4.2 Etkileşim Oranı</span>
                      </div>

                      <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-sky-400">X (Twitter)</span>
                          <span className="text-[10px] text-slate-400">@davetli_resmi</span>
                        </div>
                        <div className="text-lg font-black text-white font-mono">320.000</div>
                        <span className="text-[10px] text-slate-400 block">%2.8 Etkileşim Oranı</span>
                      </div>
                    </div>

                    {/* Galalarda Yaptığı Son PR Paylaşımları */}
                    <div className="space-y-2 pt-2">
                      <span className="text-[10px] font-mono uppercase text-slate-400 block">
                        Son PR Paylaşımları & Duygu Analizi
                      </span>

                      <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-white">Instagram Story Paylaşımı</span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            POZİTİF DUYGU
                          </span>
                        </div>
                        <p className="text-slate-300 text-[11px] italic">
                          &quot;Dune galasında kırmızı halı heyecanı! Organizasyon muazzamdı.&quot;
                        </p>
                        <div className="text-[10px] text-slate-500 flex justify-between pt-1">
                          <span>Erişim: 240.000 Görüntülenme</span>
                          <span>12 saat önce</span>
                        </div>
                      </div>

                      <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-white">X Gönderisi & Eleştiri</span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
                            NÖTR / BASIN
                          </span>
                        </div>
                        <p className="text-slate-300 text-[11px] italic">
                          &quot;Gladiator II basın gösterimi sonrası ilk izlenimlerim: sinematografi etkileyici.&quot;
                        </p>
                        <div className="text-[10px] text-slate-500 flex justify-between pt-1">
                          <span>85 Beğeni • 14 Retweet</span>
                          <span>2 gün önce</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ------------------------------------------------------------- */}
                {/* SEKME 3: İLETİŞİM & AI GELEN KUTUSU GEÇMİŞİ (COMMUNICATION) */}
                {/* ------------------------------------------------------------- */}
                {activeDrawerTab === 'COMMUNICATION' && (
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
                      E-Posta & AI Sınıflandırma Geçmişi
                    </h4>

                    {/* Son AI İletişimi */}
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-amber-300">Gala Katılım Teyidi ve +1</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                          CONFIRMED (%94 Güven)
                        </span>
                      </div>
                      <p className="text-slate-300 text-[11px] bg-slate-900/60 p-2.5 rounded-lg border border-slate-800 italic">
                        &quot;Davetiniz için çok teşekkürler. Galaya mutlaka katılacağım, yanımda eşimi de getirmek istiyorum.&quot;
                      </p>
                      <div className="text-[10px] text-slate-400 flex justify-between pt-1">
                        <span>Yanıt Kanalı: AI Otonom İşlendi</span>
                        <span>Dün, 16:45</span>
                      </div>
                    </div>

                    {/* PR Ekibi Notları */}
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-white">PR Ekip Notu & Protokol Durumu</span>
                        <span className="text-[10px] text-slate-500 font-mono">Güncel</span>
                      </div>
                      <p className="text-slate-300 text-[11px]">
                        A-List Protokol listesinde. Kırmızı halı fotoğraf panosuna doğrudan refakat edilmeli.
                      </p>
                      <div className="pt-2 flex items-center justify-between border-t border-slate-800/80">
                        <span className="text-[10px] text-slate-500">Kara Liste Durumu:</span>
                        <button
                          onClick={() => {
                            handleToggleBlacklist(selectedGuestForDrawer.id, selectedGuestForDrawer.isBlacklisted);
                            setSelectedGuestForDrawer((prev) =>
                              prev ? { ...prev, isBlacklisted: !prev.isBlacklisted } : null
                            );
                          }}
                          className={`text-xs px-2.5 py-1 rounded font-semibold transition ${
                            selectedGuestForDrawer.isBlacklisted
                              ? 'bg-rose-600 text-white hover:bg-rose-500'
                              : 'bg-slate-800 text-slate-300 hover:text-rose-400'
                          }`}
                        >
                          {selectedGuestForDrawer.isBlacklisted ? 'Kara Listeden Çıkar' : 'Kara Listeye Al'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
