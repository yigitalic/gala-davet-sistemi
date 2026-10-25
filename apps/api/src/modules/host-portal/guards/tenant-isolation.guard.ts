import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
  organizationId?: string | null;
}

@Injectable()
export class TenantIsolationGuard implements CanActivate {
  private readonly logger = new Logger(TenantIsolationGuard.name);

  constructor(private readonly prisma?: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user: AuthenticatedUser = request.user || {
      // Fallback: Headers veya simülasyon parametresi
      id: request.headers['x-user-id'] || 'usr-host-admin-disney',
      email: request.headers['x-user-email'] || 'zeynep.yurtbasi@disney.com',
      role: request.headers['x-user-role'] || 'HOST_ADMIN',
      organizationId: request.headers['x-organization-id'] || 'org-disney',
    };

    // SUPER_ADMIN tüm organizasyonları ve sistem kaynaklarını denetleyebilir
    if (user.role === 'SUPER_ADMIN') {
      return true;
    }

    // HOST_ADMIN için katı organizasyon kontrolü
    if (user.role === 'HOST_ADMIN') {
      if (!user.organizationId) {
        throw new ForbiddenException(
          'TENANT_ISOLATION_VIOLATION: HOST_ADMIN kullanıcısının bağlı olduğu bir organizasyon bulunmamaktadır.'
        );
      }

      // Talep edilen organizasyon kimliği (query, params, body veya header)
      const targetOrgId =
        request.params?.organizationId ||
        request.params?.orgId ||
        request.query?.organizationId ||
        request.query?.orgId ||
        request.body?.organizationId ||
        request.headers['x-target-organization-id'] ||
        user.organizationId; // Belirtilmemişse kullanıcının kendi organizasyonu

      // Eğer kullanıcı başka bir organizasyonun verisine erişmeye çalışırsa
      if (targetOrgId && targetOrgId !== user.organizationId) {
        this.logger.warn(
          `TENANT İZOLASYON İHLALİ ENGELLENDİ: User ${user.email} (${user.organizationId}) -> Hedef ${targetOrgId}`
        );

        // AuditLog'a güvenlik ihlalini kaydet
        if (this.prisma) {
          try {
            await this.prisma.auditLog.create({
              data: {
                userId: user.id,
                action: 'VIEW_PII', // Denetim loguna izinsiz erişim girişimi
                entityType: 'OrganizationViolation',
                entityId: targetOrgId,
                metadata: {
                  attemptedTenant: targetOrgId,
                  userTenant: user.organizationId,
                  reason: 'TENANT_ISOLATION_VIOLATION',
                  path: request.url,
                  method: request.method,
                },
                ipAddress: request.ip || '127.0.0.1',
                userAgent: request.headers['user-agent'] || 'Host-Portal-Guard',
              },
            });
          } catch {
            // Loglama hatası ana engellemeyi aksatmamalı
          }
        }

        throw new ForbiddenException(
          'TENANT_ISOLATION_VIOLATION: Bu organizasyonun verilerine erişim yetkiniz yoktur.'
        );
      }

      // İlgili organizasyona atanmış olduğunu onaylayarak devam et
      request.tenantOrgId = user.organizationId;
      return true;
    }

    // Diğer roller için (PR_MANAGER, DOOR_STAFF, ANALYST) eğer host portalına erişmeye çalışıyorsa
    throw new ForbiddenException(
      'TENANT_ISOLATION_VIOLATION: Bu portala yalnızca Dağıtımcı PR Yöneticisi (HOST_ADMIN) veya SUPER_ADMIN erişebilir.'
    );
  }
}
