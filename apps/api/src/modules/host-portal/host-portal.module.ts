import { Module, forwardRef } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { SecurityModule } from '../security/security.module';
import { AuthModule } from '../auth/auth.module';
import { HostPortalController } from './host-portal.controller';
import { HostPortalService } from './host-portal.service';
import { TenantIsolationGuard } from './guards/tenant-isolation.guard';

@Module({
  imports: [
    DatabaseModule,
    SecurityModule,
    forwardRef(() => AuthModule),
  ],
  controllers: [HostPortalController],
  providers: [HostPortalService, TenantIsolationGuard],
  exports: [HostPortalService, TenantIsolationGuard],
})
export class HostPortalModule {}
