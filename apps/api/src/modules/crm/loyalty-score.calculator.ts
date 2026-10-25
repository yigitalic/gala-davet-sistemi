import { GuestTag } from '@prisma/client';

export type LoyaltyTier =
  | 'PLATINUM_RELIABLE'
  | 'GOLD_STANDARD'
  | 'RISK_WATCH'
  | 'HIGH_NO_SHOW_RISK';

export interface LoyaltyScoreInput {
  totalInvited: number;
  totalAttended: number;
  lastMinuteCancels: number;
  noShows: number;
  isBlacklisted?: boolean;
  tags?: (GuestTag | string)[];
}

export interface LoyaltyScoreResult {
  score: number;
  tier: LoyaltyTier;
  attendanceRate: number;
}

/**
 * GALA & PR DAVETLİ SADAKAT VE GÜVENİLİRLİK PUANI MOTORU
 * 
 * Davetlilerin geçmiş etkinlik davranışlarına göre 0.0 ile 100.0 arasında
 * dinamik bir sadakat puanı hesaplayan saf (pure) ve deterministik fonksiyon.
 * 
 * Kurallar:
 * 1. Başlangıç (Baz) Puanı: 100.0 (Yeni davetli 100.0 puanla başlar).
 * 2. Katsayılar (totalInvited > 0 ise):
 *    - attendanceRate = totalAttended / totalInvited
 *    - Her katılım (totalAttended): Güvenilirliği korur/artırır (+2.5 bonus, tavan 100.0).
 *    - Her son dakika iptali (lastMinuteCancels - son 24 saat kala iptal): -12.0 puan ceza.
 *    - Her habersiz gelmeme (noShows - LCV teyit edip kapıda check-in yapmama): -25.0 puan ağır ceza.
 *    - Eğer isBlacklisted === true veya tags içinde 'BLACKLIST' varsa: Sadakat skoru doğrudan 0.0 olur!
 * 3. Sadakat Seviyesi (Tier) Eşikleri:
 *    - 90.0 - 100.0 : PLATINUM_RELIABLE (Çok Güvenilir / Protokol)
 *    - 70.0 - 89.9  : GOLD_STANDARD (Standart Güvenilir)
 *    - 40.0 - 69.9  : RISK_WATCH (Riskli / Yedek Öncelikli)
 *    - 0.0  - 39.9  : HIGH_NO_SHOW_RISK (Yüksek Fire Riski / Kara Liste Adayı)
 */
export function calculateLoyaltyScore(input: LoyaltyScoreInput): LoyaltyScoreResult {
  const {
    totalInvited = 0,
    totalAttended = 0,
    lastMinuteCancels = 0,
    noShows = 0,
    isBlacklisted = false,
    tags = [],
  } = input;

  // 1. Kara Liste Kuralı: Doğrudan 0.0 puan ve HIGH_NO_SHOW_RISK
  const hasBlacklistTag = tags.some(
    (tag) => String(tag).toUpperCase() === 'BLACKLIST'
  );

  if (isBlacklisted || hasBlacklistTag) {
    const attendanceRate =
      totalInvited > 0 ? Math.min(1.0, Math.max(0.0, totalAttended / totalInvited)) : 0.0;

    return {
      score: 0.0,
      tier: 'HIGH_NO_SHOW_RISK',
      attendanceRate: Math.round(attendanceRate * 1000) / 1000,
    };
  }

  // 2. Hiç davet edilmemiş yeni davetli: 100.0 Baz Puan
  if (totalInvited <= 0) {
    return {
      score: 100.0,
      tier: 'PLATINUM_RELIABLE',
      attendanceRate: 1.0,
    };
  }

  // 3. Geçmiş Etkinlik Davranışlarına Göre Dinamik Hesaplama
  const rawAttendanceRate = totalAttended / totalInvited;
  const attendanceRate = Math.min(1.0, Math.max(0.0, rawAttendanceRate));

  // Formül: 100 Baz - (İptal Cezası) - (NoShow Cezası) + (Katılım Bonusu)
  const penaltyCancels = lastMinuteCancels * 12.0;
  const penaltyNoShows = noShows * 25.0;
  const bonusAttended = totalAttended * 2.5;

  const rawScore = 100.0 - penaltyCancels - penaltyNoShows + bonusAttended;

  // Sınırlandırma (0.0 ile 100.0 arası) ve 1 ondalık basamağa yuvarlama
  const clampedScore = Math.max(0.0, Math.min(100.0, rawScore));
  const finalScore = Math.round(clampedScore * 10) / 10;

  // 4. Sadakat Seviyesi (Tier) Tespiti
  const tier = resolveLoyaltyTier(finalScore);

  return {
    score: finalScore,
    tier,
    attendanceRate: Math.round(attendanceRate * 1000) / 1000,
  };
}

/**
 * Sadakat Puanına Göre Seviye (Tier) Belirleme
 */
export function resolveLoyaltyTier(score: number): LoyaltyTier {
  if (score >= 90.0) {
    return 'PLATINUM_RELIABLE';
  }
  if (score >= 70.0) {
    return 'GOLD_STANDARD';
  }
  if (score >= 40.0) {
    return 'RISK_WATCH';
  }
  return 'HIGH_NO_SHOW_RISK';
}
