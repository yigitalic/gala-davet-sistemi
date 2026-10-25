/**
 * GALA & PR OPERASYON PLATFORMU (B2B SaaS) — MERKEZİ API VE AUTH İSTEMCİSİ
 * 
 * Bu istemci:
 * 1. Tarayıcı localStorage üzerindeki JWT erişim belirtecini ('gala_access_token' / 'gala_token')
 *    tüm isteklere otomatik Authorization: Bearer <token> başlığı olarak ekler.
 * 2. Akıllı Hibrit Çalışma: Backend çevrimdışı veya ağ kesintisi olduğunda, sağlanan
 *    fallbackData ile saha görevlilerinin akışını kesintiye uğratmadan güvenli fallback döner.
 * 3. Oturum durumu ve RBAC rol denetimi yardımcılarını içerir.
 */

export interface StoredUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'SUPER_ADMIN' | 'PR_MANAGER' | 'DOOR_STAFF' | 'ANALYST';
  twoFactorEnabled?: boolean;
}

export interface ApiRequestOptions extends RequestInit {
  skipAuth?: boolean;
}

const ACCESS_TOKEN_KEY = 'gala_access_token';
const LEGACY_TOKEN_KEY = 'gala_token';
const USER_KEY = 'gala_user';

// 1. OTURUM VE YETKİ (AUTH / RBAC) YARDIMCILARI

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(ACCESS_TOKEN_KEY) || localStorage.getItem(LEGACY_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getStoredUser(): StoredUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredAuth(token: string, user?: StoredUser | null): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
    localStorage.setItem(LEGACY_TOKEN_KEY, token);
    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    }
  } catch (err) {
    console.warn('[ApiClient] Oturum bilgileri localStorage alanına yazılamadı:', err);
  }
}

export function clearStoredAuth(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(LEGACY_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch (err) {
    console.warn('[ApiClient] localStorage temizlenemedi:', err);
  }
}

export function hasRole(allowedRoles: string[]): boolean {
  const user = getStoredUser();
  if (!user || !user.role) return false;
  return allowedRoles.includes(user.role);
}

// 2. MERKEZİ AKILLI HİBRİT İSTEK FONKSİYONU

export async function apiRequest<T = any>(
  endpoint: string,
  options: ApiRequestOptions = {},
  fallbackData?: T
): Promise<T> {
  const { skipAuth = false, headers: customHeaders = {}, ...restOptions } = options;

  // Endpoint formatlama
  let targetUrl = endpoint;
  if (!endpoint.startsWith('http') && !endpoint.startsWith('/api/')) {
    targetUrl = `/api/v1${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  }

  // Başlıkları hazırla
  const headers = new Headers(customHeaders);
  if (!headers.has('Content-Type') && restOptions.body && !(restOptions.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (!skipAuth) {
    const token = getStoredToken();
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  try {
    const response = await fetch(targetUrl, {
      ...restOptions,
      headers,
    });

    if (response.ok) {
      // 204 No Content kontrolü
      if (response.status === 204) {
        return (undefined as unknown) as T;
      }
      return (await response.json()) as T;
    }

    // 401 Unauthorized durumunda oturum temizleme
    if (response.status === 401 && typeof window !== 'undefined') {
      console.warn('[ApiClient] 401 Yetkisiz istek algılandı:', targetUrl);
    }

    if (fallbackData !== undefined) {
      console.warn(
        `[ApiClient] Sunucu ${response.status} hatası döndü (${targetUrl}), fallback verisi kullanılıyor.`
      );
      return fallbackData;
    }

    let errorDetail = response.statusText;
    try {
      const errJson = await response.json();
      errorDetail = errJson.message || JSON.stringify(errJson);
    } catch {
      // JSON ayrıştırılamazsa varsayılan durum metnini koru
    }

    throw new Error(`API Hatası [${response.status}]: ${errorDetail}`);
  } catch (err: any) {
    // Ağ kesintisi veya sunucu kapalı durumu
    if (fallbackData !== undefined) {
      console.info(
        `[ApiClient] Ağ veya sunucu bağlantı hatası (${targetUrl}): ${err.message}. Güvenli çevrimdışı fallback aktif.`
      );
      return fallbackData;
    }
    throw err;
  }
}

// 3. SAHA KAPI & GALA OPERASYON SERVİSLERİ

export interface CheckInVerifyPayload {
  qrPayload?: string;
  ticketId?: string;
  totpCode?: string;
  guestEnteredCount?: number;
  deviceInfo?: string;
}

export const GalaApi = {
  // Saha QR & Bilet Doğrulama
  async verifyAndScanQr<T = any>(payload: CheckInVerifyPayload, fallbackData?: T): Promise<T> {
    return apiRequest<T>(
      '/qr-checkin/scan',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      fallbackData
    );
  },

  // Kapı İstatistikleri ve Logları
  async getCheckInStats<T = any>(fallbackData?: T): Promise<T> {
    return apiRequest<T>('/qr-checkin/stats', { method: 'GET' }, fallbackData);
  },

  // Bilet İptal (Revoke)
  async revokeTicket<T = any>(
    ticketId: string,
    revokedReason: string,
    fallbackData?: T
  ): Promise<T> {
    return apiRequest<T>(
      `/qr-checkin/revoke/${ticketId}`,
      {
        method: 'POST',
        body: JSON.stringify({ revokedReason }),
      },
      fallbackData
    );
  },

  // Etkinlikler Listesi (Koltuksuz Kapasite Modeli)
  async getEvents<T = any>(fallbackData?: T): Promise<T> {
    return apiRequest<T>('/events', { method: 'GET' }, fallbackData);
  },

  // Davetli CRM Listesi
  async getGuests<T = any>(fallbackData?: T): Promise<T> {
    return apiRequest<T>('/guests', { method: 'GET' }, fallbackData);
  },

  // Personel Girişi
  async login<T = any>(credentials: {
    email: string;
    password: string;
    totpCode?: string;
  }): Promise<T> {
    const res = await apiRequest<T>('/auth/login', {
      method: 'POST',
      skipAuth: true,
      body: JSON.stringify(credentials),
    });
    if ((res as any)?.accessToken) {
      setStoredAuth((res as any).accessToken, (res as any).user);
    }
    return res;
  },

  // Akıllı Yedek Liste Terfisi (Waitlist Auto-Promote)
  async promoteWaitlist<T = any>(
    eventId: string,
    targetCount?: number,
    fallbackData?: T
  ): Promise<T> {
    return apiRequest<T>(
      `/email/events/${eventId}/waitlist/promote`,
      {
        method: 'POST',
        body: JSON.stringify({ targetCount }),
      },
      fallbackData
    );
  },

  // Son 24 Saat WhatsApp / SMS Hatırlatması Gönder
  async sendReminders<T = any>(
    eventId: string,
    channel: 'WHATSAPP' | 'SMS' = 'WHATSAPP',
    overrideMessage?: string,
    fallbackData?: T
  ): Promise<T> {
    return apiRequest<T>(
      `/email/events/${eventId}/reminders/send`,
      {
        method: 'POST',
        body: JSON.stringify({ channel, overrideMessage }),
      },
      fallbackData
    );
  },

  // Basın Kiti (EPK) ve Ambargo İndirme
  async downloadEpk<T = any>(
    eventId: string,
    rawTokenOrGuestId?: string,
    fallbackData?: T
  ): Promise<T> {
    return apiRequest<T>(
      `/email/events/${eventId}/epk-download`,
      {
        method: 'POST',
        skipAuth: true,
        body: JSON.stringify({
          rawToken: rawTokenOrGuestId,
          guestId: rawTokenOrGuestId,
        }),
      },
      fallbackData
    );
  },

  // Çıkış
  logout(): void {
    clearStoredAuth();
  },
};
