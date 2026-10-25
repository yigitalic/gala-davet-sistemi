import { Module, forwardRef } from '@nestjs/common';
import { SecurityService } from './security.service';
import { AuditLogService } from './audit-log.service';
import { AuditLogInterceptor } from './interceptors/audit-log.interceptor';
import { SecurityController } from './security.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [forwardRef(() => AuthModule)],
  controllers: [SecurityController],
  providers: [SecurityService, AuditLogService, AuditLogInterceptor],
  exports: [SecurityService, AuditLogService, AuditLogInterceptor],
})
export class SecurityModule {}
