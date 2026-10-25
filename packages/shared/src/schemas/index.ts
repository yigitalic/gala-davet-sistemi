import { z } from 'zod';
import { GUEST_TAGS, ROLES, RSVP_STATUSES } from '../constants/index.js';

// ------------------------------------------------------------------------------
// AUTH SCHEMAS
// ------------------------------------------------------------------------------
export const loginSchema = z.object({
  email: z.string().email('Geçerli bir kurumsal e-posta giriniz.'),
  password: z.string().min(8, 'Şifre en az 8 karakter olmalıdır.'),
  totpCode: z.string().length(6, '2FA kodu 6 haneli olmalıdır.').optional(),
  twoFactorCode: z.string().length(6, '2FA kodu 6 haneli olmalıdır.').optional(),
});

export type LoginDto = z.infer<typeof loginSchema>;

export const verify2FaSchema = z.object({
  totpCode: z.string().length(6, 'TOTP doğrulama kodu 6 haneli olmalıdır.'),
});

export type Verify2FaDto = z.infer<typeof verify2FaSchema>;

export const registerStaffSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  role: z.enum([
    ROLES.SUPER_ADMIN,
    ROLES.PR_MANAGER,
    ROLES.DOOR_STAFF,
    ROLES.ANALYST,
  ]),
});

export type RegisterStaffDto = z.infer<typeof registerStaffSchema>;

// ------------------------------------------------------------------------------
// GUEST CRM SCHEMAS
// ------------------------------------------------------------------------------
export const guestTagEnum = z.enum([
  GUEST_TAGS.VIP,
  GUEST_TAGS.PRESS,
  GUEST_TAGS.INFLUENCER,
  GUEST_TAGS.MORNING_SCREENING,
  GUEST_TAGS.GALA_NIGHT,
  GUEST_TAGS.SECONDARY,
  GUEST_TAGS.CREW,
  GUEST_TAGS.SPONSOR,
  GUEST_TAGS.BLACKLIST,
]);

export const createGuestSchema = z.object({
  firstName: z.string().min(2, 'Ad en az 2 karakter olmalıdır.'),
  lastName: z.string().min(2, 'Soyad en az 2 karakter olmalıdır.'),
  email: z.string().email('Geçerli bir e-posta adresi giriniz.'),
  phone: z.string().optional().nullable(),
  company: z.string().optional().nullable(),
  title: z.string().optional().nullable(),
  tags: z.array(guestTagEnum).default([]),
});

export type CreateGuestDto = z.infer<typeof createGuestSchema>;

export const updateGuestSchema = createGuestSchema.partial();
export type UpdateGuestDto = z.infer<typeof updateGuestSchema>;

// ------------------------------------------------------------------------------
// EVENT SCHEMAS
// ------------------------------------------------------------------------------
export const createEventSchema = z.object({
  title: z.string().min(3),
  movieTitle: z.string().min(1),
  description: z.string().optional().nullable(),
  venue: z.string().min(3),
  startsAt: z.string().datetime(),
  doorsOpenAt: z.string().datetime(),
  capacity: z.number().int().positive(),
});

export type CreateEventDto = z.infer<typeof createEventSchema>;

// ------------------------------------------------------------------------------
// INVITATION & RSVP SCHEMAS
// ------------------------------------------------------------------------------
export const updateRsvpStatusSchema = z.object({
  rsvpStatus: z.enum([
    RSVP_STATUSES.CONFIRMED,
    RSVP_STATUSES.DECLINED,
    RSVP_STATUSES.UNCERTAIN,
  ]),
  plusOneCount: z.number().int().min(0).max(5).default(0),
  plusOneNames: z.string().optional().nullable(),
});

export type UpdateRsvpStatusDto = z.infer<typeof updateRsvpStatusSchema>;

// ------------------------------------------------------------------------------
// CHECK-IN & DYNAMIC QR SCHEMAS
// ------------------------------------------------------------------------------
export const scanTicketSchema = z.object({
  ticketId: z.string().uuid('Geçerli bir bilet kimliği gereklidir.'),
  totpCode: z.string().length(6, 'TOTP kodu 6 haneli olmalıdır.'),
  timestamp: z.number().int().positive(),
  enteredCount: z.number().int().positive().default(1),
  deviceInfo: z.string().optional(),
});

export type ScanTicketDto = z.infer<typeof scanTicketSchema>;

// ------------------------------------------------------------------------------
// AI INBOX REVIEW SCHEMAS
// ------------------------------------------------------------------------------
export const reviewAiInboxSchema = z.object({
  reviewStatus: z.enum(['APPROVED_AND_SENT', 'REJECTED']),
  customReplyText: z.string().optional(),
  overrideRsvpStatus: z
    .enum([RSVP_STATUSES.CONFIRMED, RSVP_STATUSES.DECLINED, RSVP_STATUSES.UNCERTAIN])
    .optional(),
  overridePlusOneApproved: z.number().int().min(0).optional(),
});

export type ReviewAiInboxDto = z.infer<typeof reviewAiInboxSchema>;
