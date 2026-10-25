import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditLogService } from '../audit-log.service';
import {
  AUDIT_METADATA_KEY,
  AuditMetadataOptions,
} from '../decorators/audit.decorator';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly auditLogService: AuditLogService
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const auditOptions = this.reflector.getAllAndOverride<AuditMetadataOptions>(
      AUDIT_METADATA_KEY,
      [context.getHandler(), context.getClass()]
    );

    if (!auditOptions) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const ip =
      request.ip ||
      request.headers['x-forwarded-for'] ||
      request.socket?.remoteAddress;
    const userAgent = request.headers['user-agent'];

    return next.handle().pipe(
      tap({
        next: (responseBody) => {
          // Entity ID tespiti: Rota parametresi, response ID veya body ID
          const entityId =
            request.params?.id ||
            responseBody?.id ||
            responseBody?.data?.id ||
            request.body?.id ||
            'SYSTEM_ACTION';

          // Hassas şifre alanlarını log metadata'sından çıkar
          const safeMetadata: Record<string, any> = {
            method: request.method,
            path: request.url,
            params: request.params,
            query: request.query,
          };

          this.auditLogService.log({
            userId: user?.id || user?.sub || null,
            action: auditOptions.action,
            entityType: auditOptions.entityType,
            entityId: String(entityId),
            metadata: safeMetadata,
            ipAddress: typeof ip === 'string' ? ip : Array.isArray(ip) ? ip[0] : undefined,
            userAgent: typeof userAgent === 'string' ? userAgent : undefined,
          });
        },
      })
    );
  }
}
