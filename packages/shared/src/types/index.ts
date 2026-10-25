import {
  UserRole,
  GuestTagValue,
  ScanResultValue,
} from '../constants/index.js';

export interface DecryptedGuestPii {
  email: string;
  phone?: string | null;
}

export interface EncryptedFieldPayload {
  cipherText: string; // base64 / hex
  iv: string; // base64 / hex
  authTag: string; // base64 / hex
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  twoFactorEnabled: boolean;
}

export interface JwtTokenPayload {
  sub: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export interface DynamicQrPayload {
  ticketId: string;
  totpCode: string;
  timestamp: number;
}

export interface CheckInVerificationResult {
  allowed: boolean;
  scanResult: ScanResultValue;
  guestName?: string;
  company?: string;
  tags?: GuestTagValue[];
  plusOneApproved?: number;
  message: string;
}

export interface AiInboundClassificationResult {
  classification: 'CONFIRMED' | 'DECLINED' | 'UNCERTAIN';
  confidence: number;
  extractedPlusOne?: number;
  detectedQuestions?: string[];
  suggestedReply?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    timestamp: string;
    correlationId?: string;
  };
}
