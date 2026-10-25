/**
 * Sabitler ve Sistem Değerleri
 */

export const SECURITY_CONSTANTS = {
  FIELD_ENCRYPTION_ALGORITHM: 'aes-256-gcm',
  BLIND_INDEX_ALGORITHM: 'sha256',
  IV_LENGTH_BYTES: 12, // AES-GCM standard IV length
  AUTH_TAG_LENGTH_BYTES: 16, // AES-GCM standard Auth Tag length
  TOTP_STEP_SECONDS: 30, // 30 saniyelik dinamik QR kodu döngüsü
  TOTP_WINDOW_TOLERANCE: 1, // +/- 1 adım (toplam 90 saniyelik tolerans)
  NONCE_TTL_SECONDS: 120, // Redis Replay-Attack Nonce önbellek süresi
  BCRYPT_SALT_ROUNDS: 12,
} as const;

export const QUEUE_NAMES = {
  EMAIL_SEND: 'gala-email-send-queue',
  EMAIL_INBOUND_PROCESS: 'gala-email-inbound-queue',
  SOCIAL_SCRAPER: 'gala-social-scraper-queue',
  AUDIT_LOG_PERSIST: 'gala-audit-log-queue',
} as const;

export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  PR_MANAGER: 'PR_MANAGER',
  DOOR_STAFF: 'DOOR_STAFF',
  ANALYST: 'ANALYST',
} as const;

export type UserRole = (typeof ROLES)[keyof typeof ROLES];

export const GUEST_TAGS = {
  VIP: 'VIP',
  PRESS: 'PRESS',
  INFLUENCER: 'INFLUENCER',
  MORNING_SCREENING: 'MORNING_SCREENING',
  GALA_NIGHT: 'GALA_NIGHT',
  SECONDARY: 'SECONDARY',
  CREW: 'CREW',
  SPONSOR: 'SPONSOR',
  BLACKLIST: 'BLACKLIST',
} as const;

export type GuestTagValue = (typeof GUEST_TAGS)[keyof typeof GUEST_TAGS];

export const RSVP_STATUSES = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  DECLINED: 'DECLINED',
  UNCERTAIN: 'UNCERTAIN',
  WAITLIST: 'WAITLIST',
} as const;

export type RsvpStatusValue = (typeof RSVP_STATUSES)[keyof typeof RSVP_STATUSES];

export const SCAN_RESULTS = {
  SUCCESS: 'SUCCESS',
  REPLAY_ATTACK_BLOCKED: 'REPLAY_ATTACK_BLOCKED',
  EXPIRED_QR: 'EXPIRED_QR',
  REVOKED: 'REVOKED',
  ALREADY_CHECKED_IN: 'ALREADY_CHECKED_IN',
  INVALID_TOKEN: 'INVALID_TOKEN',
} as const;

export type ScanResultValue = (typeof SCAN_RESULTS)[keyof typeof SCAN_RESULTS];
