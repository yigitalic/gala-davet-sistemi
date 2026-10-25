import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class SecurityService {
  private readonly logger = new Logger(SecurityService.name);
  private readonly encryptionKey: Buffer;
  private readonly blindIndexSalt: string;

  constructor() {
    const rawKey = process.env.FIELD_ENCRYPTION_KEY;
    const rawSalt = process.env.BLIND_INDEX_SALT;
    const isProduction = process.env.NODE_ENV === 'production';

    // 1. Fail-Fast Koruması: Production modunda zorunlu güvenlik parametreleri
    if (isProduction) {
      if (!rawKey || Buffer.byteLength(rawKey, 'utf8') < 32) {
        throw new Error(
          'GÜVENLİK KRİTİK HATASI: FIELD_ENCRYPTION_KEY production ortamında tanımlı olmalı ve en az 32 byte (256-bit) uzunluğunda olmalıdır!'
        );
      }
      if (!rawSalt || Buffer.byteLength(rawSalt, 'utf8') < 32) {
        throw new Error(
          'GÜVENLİK KRİTİK HATASI: BLIND_INDEX_SALT production ortamında tanımlı olmalı ve en az 32 byte uzunluğunda olmalıdır!'
        );
      }
    }

    // Geliştirme / Test varsayılan anahtarları (32-byte)
    const effectiveKey =
      rawKey ||
      '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    const effectiveSalt =
      rawSalt ||
      'fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210';

    this.encryptionKey =
      effectiveKey.length === 64 && /^[0-9a-fA-F]+$/.test(effectiveKey)
        ? Buffer.from(effectiveKey, 'hex')
        : Buffer.from(effectiveKey, 'utf-8').subarray(0, 32);

    this.blindIndexSalt = effectiveSalt;
  }

  // NORMALİZASYON YARDIMCILARI

  /**
   * E-posta normalizasyonu (lowercase, trim)
   */
  normalizeEmail(email: string): string {
    if (!email) return '';
    return email.trim().toLowerCase();
  }

  /**
   * Telefon numarası E.164 normalizasyonu
   * Türkiye formatlarını (+90, 05xx, 5xx) standartlaştırır:
   * "0532 123 45 67" -> "+905321234567"
   * "532 123 45 67"  -> "+905321234567"
   * "+90 (532) 123-4567" -> "+905321234567"
   */
  normalizePhone(phone: string): string {
    if (!phone) return '';
    // Sadece rakamları ve başlangıçtaki artı işaretini koru
    let cleaned = phone.trim().replace(/[^\d+]/g, '');

    // Başında + varsa ve ülke kodu içeriyorsa
    if (cleaned.startsWith('+')) {
      return cleaned;
    }

    // 00 ile başlıyorsa uluslararası formatı + ile değiştir
    if (cleaned.startsWith('00')) {
      return '+' + cleaned.substring(2);
    }

    // Türkiye formatları:
    // 05xx (11 hane) -> +905xx
    if (cleaned.startsWith('05') && cleaned.length === 11) {
      return '+9' + cleaned;
    }

    // 5xx (10 hane) -> +905xx
    if (cleaned.startsWith('5') && cleaned.length === 10) {
      return '+90' + cleaned;
    }

    // 905xx (12 hane) -> +905xx
    if (cleaned.startsWith('905') && cleaned.length === 12) {
      return '+' + cleaned;
    }

    // Genel fallback: başında + yoksa ekle
    return cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
  }

  // KRİPTOGRAFİK ALAN ŞİFRELEME (AES-256-GCM)

  /**
   * AES-256-GCM ile Field-Level Şifreleme
   * Format: iv:authTag:cipherText (Hex)
   */
  encrypt(plainText: string): string {
    if (!plainText) return plainText;
    const iv = crypto.randomBytes(12); // GCM için önerilen 12-byte IV
    const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);

    const encrypted = Buffer.concat([
      cipher.update(plainText, 'utf8'),
      cipher.final(),
    ]);

    const authTag = cipher.getAuthTag();

    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
  }

  /**
   * AES-256-GCM ile Şifre Çözme
   */
  decrypt(encryptedPayload: string): string {
    if (!encryptedPayload) return encryptedPayload;
    try {
      const parts = encryptedPayload.split(':');
      if (parts.length !== 3) {
        throw new Error('Geçersiz şifrelenmiş veri formatı');
      }

      const [ivHex, authTagHex, cipherTextHex] = parts;
      const iv = Buffer.from(ivHex!, 'hex');
      const authTag = Buffer.from(authTagHex!, 'hex');
      const cipherText = Buffer.from(cipherTextHex!, 'hex');

      const decipher = crypto.createDecipheriv('aes-256-gcm', this.encryptionKey, iv);
      decipher.setAuthTag(authTag);

      const decrypted = Buffer.concat([
        decipher.update(cipherText),
        decipher.final(),
      ]);

      return decrypted.toString('utf8');
    } catch (error) {
      this.logger.error('Veri şifre çözme hatası:', error);
      throw new Error('Hassas veri şifresi çözülemedi');
    }
  }

  // DETERMINİSTİK BLIND INDEX (HMAC-SHA256)

  /**
   * Genel Blind Index üretimi
   */
  generateBlindIndex(value: string): string {
    if (!value) return '';
    return crypto
      .createHmac('sha256', this.blindIndexSalt)
      .update(value)
      .digest('hex');
  }

  /**
   * 32-byte kriptografik rastgele LCV (RSVP) ham belirteci (token) üretir (64 karakter hex)
   */
  generateRsvpToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Ham RSVP token'ının HMAC-SHA256 özetini (hash) hesaplar.
   * Veritabanında (Invitation.rsvpTokenHash) ASLA düz metin token tutulmaz!
   */
  hashRsvpToken(rawToken: string): string {
    if (!rawToken) return '';
    return crypto
      .createHmac('sha256', this.blindIndexSalt)
      .update(rawToken)
      .digest('hex');
  }

  /**
   * E-posta için normalizasyon uygulanmış Blind Index
   */
  generateEmailBlindIndex(email: string): string {
    if (!email) return '';
    const normalized = this.normalizeEmail(email);
    return this.generateBlindIndex(normalized);
  }

  /**
   * Telefon için normalizasyon uygulanmış Blind Index
   */
  generatePhoneBlindIndex(phone: string): string {
    if (!phone) return '';
    const normalized = this.normalizePhone(phone);
    return this.generateBlindIndex(normalized);
  }

  // ŞİFRE HASHLEME VE DOĞRULAMA (scrypt + timingSafeEqual)

  /**
   * Güvenli şifre hashleme (crypto.scrypt ile salt:hash formatı)
   */
  async hashPassword(password: string): Promise<string> {
    const salt = crypto.randomBytes(16).toString('hex');
    return new Promise((resolve, reject) => {
      crypto.scrypt(password, salt, 64, (err, derivedKey) => {
        if (err) return reject(err);
        resolve(`${salt}:${derivedKey.toString('hex')}`);
      });
    });
  }

  /**
   * Şifre doğrulama (timingSafeEqual ile zamanlama saldırılarına karşı korumalı)
   */
  async verifyPassword(password: string, storedHash: string): Promise<boolean> {
    if (!storedHash || !storedHash.includes(':')) return false;
    const [salt, keyHex] = storedHash.split(':');
    if (!salt || !keyHex) return false;

    const originalKey = Buffer.from(keyHex, 'hex');

    return new Promise((resolve) => {
      crypto.scrypt(password, salt, originalKey.length, (err, derivedKey) => {
        if (err) return resolve(false);
        try {
          // timingSafeEqual sabit zamanlı karşılaştırma yapar
          const matches = crypto.timingSafeEqual(originalKey, derivedKey);
          resolve(matches);
        } catch {
          resolve(false);
        }
      });
    });
  }

  // RFC 6238 TOTP (2FA & DİNAMİK BİLET QR MOTORU)

  /**
   * 20-byte kriptografik rastgele RFC 4648 Base32 Secret üretir
   */
  generateTotpSecret(): string {
    const randomBuffer = crypto.randomBytes(20);
    return this.base32Encode(randomBuffer);
  }

  /**
   * RFC 6238 uyumlu 6 haneli TOTP kodu üretir
   * @param secret Base32 formatında secret
   * @param timeStepSeconds Zaman adımı (varsayılan: 30sn)
   * @param windowOffset Zaman penceresi ötelemesi (-1, 0, +1)
   * @param timestamp Unix zaman damgası (saniye bazında, opsiyonel)
   */
  generateTotpCode(
    secret: string,
    timeStepSeconds = 30,
    windowOffset = 0,
    timestamp?: number
  ): string {
    const currentEpoch = timestamp ?? Math.floor(Date.now() / 1000);
    const counter = Math.floor(currentEpoch / timeStepSeconds) + windowOffset;

    // 8-byte Big-Endian Counter Buffer
    const counterBuffer = Buffer.alloc(8);
    counterBuffer.writeBigInt64BE(BigInt(counter));

    const secretBuffer = this.base32Decode(secret);

    // RFC 6238 standardı HMAC-SHA1
    const hmac = crypto.createHmac('sha1', secretBuffer);
    hmac.update(counterBuffer);
    const digest = hmac.digest();

    // Dinamik Truncation (RFC 4226 Bölüm 5.4)
    const offset = digest[digest.length - 1] & 0x0f;
    const binary =
      ((digest[offset] & 0x7f) << 24) |
      ((digest[offset + 1] & 0xff) << 16) |
      ((digest[offset + 2] & 0xff) << 8) |
      (digest[offset + 3] & 0xff);

    const otp = binary % 1_000_000;
    return otp.toString().padStart(6, '0');
  }

  /**
   * TOTP Kodunu zaman tolerans pencereleriyle doğrular
   */
  verifyTotpCode(
    secret: string,
    code: string,
    timeStepSeconds = 30,
    allowedWindows = 1,
    timestamp?: number
  ): boolean {
    if (!code || code.length !== 6 || !secret) return false;

    const inputCodeBuf = Buffer.from(code, 'utf8');

    for (let offset = -allowedWindows; offset <= allowedWindows; offset++) {
      const generatedCode = this.generateTotpCode(
        secret,
        timeStepSeconds,
        offset,
        timestamp
      );
      const generatedBuf = Buffer.from(generatedCode, 'utf8');

      if (
        inputCodeBuf.length === generatedBuf.length &&
        crypto.timingSafeEqual(inputCodeBuf, generatedBuf)
      ) {
        return true;
      }
    }

    return false;
  }

  /**
   * Google Authenticator / Microsoft Authenticator uyumlu otpauth:// URI'si üretir
   */
  getTotpUri(accountEmail: string, secret: string, issuer = 'Gala PR Platform'): string {
    const encodedIssuer = encodeURIComponent(issuer);
    const encodedAccount = encodeURIComponent(accountEmail);
    return `otpauth://totp/${encodedIssuer}:${encodedAccount}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`;
  }

  // PII MASKELEME YARDIMCILARI (KVKK LİSTE GÖRÜNÜMÜ)

  /**
   * E-posta maskeleme
   * Örnek: "ahmet.yilmaz@medya.com" -> "ah***@medya.com"
   */
  maskEmail(email: string): string {
    if (!email || !email.includes('@')) return '***';
    const [local, domain] = email.split('@');
    if (!local || !domain) return '***';

    if (local.length <= 2) {
      return `${local.charAt(0)}***@${domain}`;
    }

    const prefix = local.substring(0, 2);
    return `${prefix}***@${domain}`;
  }

  /**
   * Telefon numarası maskeleme
   * Örnek: "+905321234567" -> "+90532*****67"
   */
  maskPhone(phone: string): string {
    if (!phone) return '***';
    const normalized = this.normalizePhone(phone);
    if (normalized.length <= 6) return '***';

    const prefix = normalized.substring(0, 6); // Ülke + operatör başlangıcı (+90532)
    const suffix = normalized.slice(-2); // Son 2 hane (67)
    return `${prefix}*****${suffix}`;
  }

  // ÖZEL BASE32 ENCODER / DECODER (RFC 4648)

  private readonly BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

  private base32Encode(buffer: Buffer): string {
    let bits = 0;
    let value = 0;
    let output = '';

    for (let i = 0; i < buffer.length; i++) {
      value = (value << 8) | buffer[i];
      bits += 8;
      while (bits >= 5) {
        output += this.BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
        bits -= 5;
      }
    }

    if (bits > 0) {
      output += this.BASE32_ALPHABET[(value << (5 - bits)) & 31];
    }

    return output;
  }

  private base32Decode(base32String: string): Buffer {
    const cleaned = base32String
      .toUpperCase()
      .replace(/=+$/, '')
      .replace(/\s+/g, '');
    let bits = 0;
    let value = 0;
    const bytes: number[] = [];

    for (let i = 0; i < cleaned.length; i++) {
      const idx = this.BASE32_ALPHABET.indexOf(cleaned[i]);
      if (idx === -1) continue;

      value = (value << 5) | idx;
      bits += 5;

      if (bits >= 8) {
        bytes.push((value >>> (bits - 8)) & 255);
        bits -= 8;
      }
    }

    return Buffer.from(bytes);
  }
}
