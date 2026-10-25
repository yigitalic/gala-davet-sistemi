'use client';

import React, { useState, useEffect } from 'react';

interface AuditLogItem {
  id: string;
  userId: string | null;
  action: 'VIEW_PII' | 'EXPORT_CSV' | 'SCAN_QR' | 'USER_LOGIN' | 'CREATE_GUEST' | 'UPDATE_GUEST' | 'DELETE_GUEST' | 'REVOKE_TICKET';
  entityType: string;
  entityId: string;
  metadata?: Record<string, any>;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  } | null;
}

export default function SecurityAuditDashboard() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [filterAction, setFilterAction] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  // Mock / Canlı veri yükleyici
  useEffect(() => {
    async function fetchAuditLogs() {
      setIsLoading(true);
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('gala_token') : null;
        const res = await fetch(`/api/v1/security/audit-logs${filterAction !== 'ALL' ? `?action=${filterAction}` : ''}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          setLogs(data.items || []);
        } else {
          // Geliştirme/Demo ortamı için örnek zengin denetim izi verisi
          setLogs([
            {
              id: 'log-101',
              userId: 'usr-admin-1',
              action: 'VIEW_PII',
              entityType: 'Guest',
              entityId: 'gst-8842',
              metadata: { field: 'emailEncrypted', reason: 'VIP Davetiye Doğrulama' },
              ipAddress: '192.168.1.45',
              userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
              createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
              user: {
                id: 'usr-admin-1',
                email: 'super.admin@gala.local',
                firstName: 'Başak',
                lastName: 'Yılmaz',
                role: 'SUPER_ADMIN',
              },
            },
            {
              id: 'log-102',
              userId: 'usr-pr-2',
              action: 'EXPORT_CSV',
              entityType: 'GuestList',
              entityId: 'evt-gala-2026',
              metadata: { totalExported: 450, filterTag: 'VIP' },
              ipAddress: '88.241.112.90',
              userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
              createdAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
              user: {
                id: 'usr-pr-2',
                email: 'merve.kaya@gala.local',
                firstName: 'Merve',
                lastName: 'Kaya',
                role: 'PR_MANAGER',
              },
            },
            {
              id: 'log-103',
              userId: 'usr-door-3',
              action: 'SCAN_QR',
              entityType: 'Ticket',
              entityId: 'tck-9901',
              metadata: { scanResult: 'SUCCESS', venueGate: 'A-Protokol Kapısı' },
              ipAddress: '172.16.0.12',
              userAgent: 'GalaScannerPWA/2.0 (Mobile Android)',
              createdAt: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
              user: {
                id: 'usr-door-3',
                email: 'ali.demir@gala.local',
                firstName: 'Ali',
                lastName: 'Demir',
                role: 'DOOR_STAFF',
              },
            },
            {
              id: 'log-104',
              userId: 'usr-admin-1',
              action: 'USER_LOGIN',
              entityType: 'User',
              entityId: 'usr-admin-1',
              metadata: { twoFactorUsed: true, authMethod: 'TOTP_RFC6238' },
              ipAddress: '192.168.1.45',
              userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
              createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
              user: {
                id: 'usr-admin-1',
                email: 'super.admin@gala.local',
                firstName: 'Başak',
                lastName: 'Yılmaz',
                role: 'SUPER_ADMIN',
              },
            },
          ]);
        }
      } catch {
        // Fallback demo logları
      } finally {
        setIsLoading(false);
      }
    }

    fetchAuditLogs();
  }, [filterAction]);

  const filteredLogs = logs.filter((item) => {
    if (filterAction !== 'ALL' && item.action !== filterAction) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchIp = item.ipAddress?.toLowerCase().includes(term);
      const matchEntity = item.entityId.toLowerCase().includes(term) || item.entityType.toLowerCase().includes(term);
      const matchUser = item.user?.email.toLowerCase().includes(term) || item.user?.lastName.toLowerCase().includes(term);
      return matchIp || matchEntity || matchUser;
    }
    return true;
  });

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'VIEW_PII':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30">HASSAS VERİ ERİŞİMİ</span>;
      case 'EXPORT_CSV':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">DIŞA AKTARIM (CSV)</span>;
      case 'SCAN_QR':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">KAPI CHECK-IN (QR)</span>;
      case 'USER_LOGIN':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/30">GÜVENLİ GİRİŞ (2FA)</span>;
      default:
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-zinc-700/50 text-zinc-300 border border-zinc-600">{action}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-8 space-y-8 font-sans">
      {/* Üst Başlık ve Yönetici Rozeti */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-amber-400 animate-pulse shadow-[0_0_10px_rgba(251,191,36,0.8)]" />
            <h1 className="text-2xl font-bold tracking-tight text-white">
              KVKK & GÜVENLİK DENETİM İZİ PANELİ
            </h1>
          </div>
          <p className="text-sm text-zinc-400 mt-1">
            Yasal KVKK / GDPR Uyumlu Erişim İnceleme, PII Kriptografi ve Brute-Force Kalkanı
          </p>
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900 border border-amber-500/30 text-amber-400 text-xs font-mono">
          <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          SUPER_ADMIN YETKİSİ AKTİF
        </div>
      </div>

      {/* Kriptografik Güvenlik Durum Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 shadow-lg">
          <div className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Field Encryption</div>
          <div className="mt-2 text-lg font-bold text-white flex items-center justify-between">
            <span>AES-256-GCM</span>
            <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">AKTİF</span>
          </div>
          <p className="mt-1 text-xs text-zinc-500">12-Byte Rastgele IV & AuthTag Doğrulaması</p>
        </div>

        <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 shadow-lg">
          <div className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Arama Güvenliği</div>
          <div className="mt-2 text-lg font-bold text-white flex items-center justify-between">
            <span>HMAC Blind Index</span>
            <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">TUZLANMIŞ</span>
          </div>
          <p className="mt-1 text-xs text-zinc-500">SHA-256 Deterministik E.164 & E-Posta İndeksi</p>
        </div>

        <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 shadow-lg">
          <div className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Personel & Bilet Güvenliği</div>
          <div className="mt-2 text-lg font-bold text-white flex items-center justify-between">
            <span>RFC 6238 TOTP</span>
            <span className="text-xs px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">30s DÖNGÜ</span>
          </div>
          <p className="mt-1 text-xs text-zinc-500">2FA + Dinamik QR Replay-Attack Koruması</p>
        </div>

        <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 shadow-lg">
          <div className="text-xs font-medium text-zinc-400 uppercase tracking-wider">API Savunma Katmanı</div>
          <div className="mt-2 text-lg font-bold text-white flex items-center justify-between">
            <span>Rate Limiter</span>
            <span className="text-xs px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/30">5/DK SINIR</span>
          </div>
          <p className="mt-1 text-xs text-zinc-500">Sliding Window IP Tabanlı Brute-Force Engeli</p>
        </div>
      </div>

      {/* Filtre ve Arama Çubuğu */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-zinc-900/60 p-4 rounded-xl border border-zinc-800">
        <div className="flex flex-wrap gap-2">
          {['ALL', 'VIEW_PII', 'EXPORT_CSV', 'SCAN_QR', 'USER_LOGIN'].map((action) => (
            <button
              key={action}
              onClick={() => setFilterAction(action)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                filterAction === action
                  ? 'bg-amber-500 text-zinc-950 font-bold shadow-md shadow-amber-500/20'
                  : 'bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700'
              }`}
            >
              {action === 'ALL' ? 'TÜM LOGLAR' : action}
            </button>
          ))}
        </div>

        <div className="w-full md:w-72">
          <input
            type="text"
            placeholder="IP, Personel veya Varlık ID Ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-700 text-white placeholder-zinc-500 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>
      </div>

      {/* Denetim İzi Tablosu */}
      <div className="rounded-xl border border-zinc-800 overflow-hidden bg-zinc-900/40 shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-300">
            <thead className="bg-zinc-900/90 text-zinc-400 uppercase tracking-wider text-[11px] border-b border-zinc-800">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Zaman Damgası</th>
                <th className="py-3.5 px-4 font-semibold">Personel</th>
                <th className="py-3.5 px-4 font-semibold">Aksiyon Türü</th>
                <th className="py-3.5 px-4 font-semibold">Hedef Varlık</th>
                <th className="py-3.5 px-4 font-semibold">İstemci IP & Cihaz</th>
                <th className="py-3.5 px-4 font-semibold text-right">Detay</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 font-mono">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-zinc-500 font-sans">
                    Denetim kayıtları yükleniyor...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-zinc-500 font-sans">
                    Kriterlere uygun denetim izi kaydı bulunamadı.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((item) => (
                  <tr key={item.id} className="hover:bg-zinc-800/40 transition">
                    <td className="py-3 px-4 text-zinc-400">
                      {new Date(item.createdAt).toLocaleString('tr-TR')}
                    </td>
                    <td className="py-3 px-4 font-sans">
                      {item.user ? (
                        <div>
                          <div className="font-semibold text-white">
                            {item.user.firstName} {item.user.lastName}
                          </div>
                          <div className="text-[11px] text-zinc-500">{item.user.role}</div>
                        </div>
                      ) : (
                        <span className="text-zinc-500 italic">Sistem / Anonim</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-sans">{getActionBadge(item.action)}</td>
                    <td className="py-3 px-4">
                      <span className="text-amber-400/90">{item.entityType}</span>
                      <span className="text-zinc-500 mx-1">#</span>
                      <span className="text-zinc-300">{item.entityId}</span>
                    </td>
                    <td className="py-3 px-4 text-zinc-400 font-mono text-[11px]">
                      <div>{item.ipAddress || 'Bilinmiyor'}</div>
                      <div className="text-[10px] text-zinc-600 truncate max-w-xs">{item.userAgent}</div>
                    </td>
                    <td className="py-3 px-4 text-right font-sans">
                      <button
                        onClick={() => setSelectedLog(item)}
                        className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs transition"
                      >
                        İncele
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detay Modalı */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-lg bg-zinc-900 border border-zinc-700 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>Denetim İzi Detayı</span>
                <span className="text-xs text-zinc-500">#{selectedLog.id}</span>
              </h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-zinc-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-zinc-500 block">İşlem & Varlık:</span>
                <span className="text-zinc-200 font-semibold">{selectedLog.action} — {selectedLog.entityType} ({selectedLog.entityId})</span>
              </div>

              <div>
                <span className="text-zinc-500 block">Kullanıcı:</span>
                <span className="text-zinc-200">{selectedLog.user?.email || 'Anonim / Sistem'}</span>
              </div>

              <div>
                <span className="text-zinc-500 block">Metadata / JSON Yükü:</span>
                <pre className="mt-1 p-3 rounded bg-zinc-950 border border-zinc-800 text-amber-300 font-mono text-[11px] overflow-x-auto">
                  {JSON.stringify(selectedLog.metadata || {}, null, 2)}
                </pre>
              </div>
            </div>

            <div className="pt-3 border-t border-zinc-800 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-xs font-semibold"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
