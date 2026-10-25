import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  RATE_LIMIT_KEY,
  RateLimitOptions,
} from '../decorators/rate-limit.decorator';

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);
  private readonly storage = new Map<string, RateLimitRecord>();

  constructor(private readonly reflector: Reflector) {
    // Bellek sızıntısını önlemek için her 5 dakikada bir süresi geçmiş anahtarları temizle
    setInterval(() => this.cleanup(), 5 * 60 * 1000).unref();
  }

  canActivate(context: ExecutionContext): boolean {
    const options = this.reflector.getAllAndOverride<RateLimitOptions>(
      RATE_LIMIT_KEY,
      [context.getHandler(), context.getClass()]
    );

    // Eğer endpoint'te @RateLimit decorator'ı yoksa geçişe izin ver
    if (!options) {
      return true;
    }

    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest();
    const response = httpContext.getResponse();

    const clientIp =
      request.ip ||
      request.headers['x-forwarded-for'] ||
      request.socket?.remoteAddress ||
      'unknown-ip';

    const routePath = request.route?.path || request.url.split('?')[0];
    const key = `${clientIp}:${routePath}`;

    const now = Date.now();
    const record = this.storage.get(key);

    if (!record || now > record.resetAt) {
      // Yeni zaman penceresi başlat
      this.storage.set(key, {
        count: 1,
        resetAt: now + options.windowSeconds * 1000,
      });

      if (response && typeof response.setHeader === 'function') {
        response.setHeader('X-RateLimit-Limit', options.limit);
        response.setHeader('X-RateLimit-Remaining', options.limit - 1);
        response.setHeader(
          'X-RateLimit-Reset',
          Math.ceil((now + options.windowSeconds * 1000) / 1000)
        );
      }
      return true;
    }

    // Mevcut pencere devam ediyor
    if (record.count < options.limit) {
      record.count += 1;
      const remaining = Math.max(0, options.limit - record.count);

      if (response && typeof response.setHeader === 'function') {
        response.setHeader('X-RateLimit-Limit', options.limit);
        response.setHeader('X-RateLimit-Remaining', remaining);
        response.setHeader('X-RateLimit-Reset', Math.ceil(record.resetAt / 1000));
      }
      return true;
    }

    // Limit aşıldı! 429 Too Many Requests
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((record.resetAt - now) / 1000)
    );

    this.logger.warn(
      `[RATE_LIMIT_EXCEEDED] IP: ${clientIp} | Route: ${routePath} | Limit: ${options.limit}/${options.windowSeconds}s`
    );

    if (response && typeof response.setHeader === 'function') {
      response.setHeader('Retry-After', retryAfterSeconds);
      response.setHeader('X-RateLimit-Limit', options.limit);
      response.setHeader('X-RateLimit-Remaining', 0);
      response.setHeader('X-RateLimit-Reset', Math.ceil(record.resetAt / 1000));
    }

    throw new HttpException(
      {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        error: 'Too Many Requests',
        message: `İstek sınırı aşıldı. Lütfen ${retryAfterSeconds} saniye sonra tekrar deneyiniz.`,
        retryAfter: retryAfterSeconds,
      },
      HttpStatus.TOO_MANY_REQUESTS
    );
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.storage.entries()) {
      if (now > record.resetAt) {
        this.storage.delete(key);
      }
    }
  }
}
