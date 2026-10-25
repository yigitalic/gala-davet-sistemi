import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './modules/database/database.module';
import { SecurityModule } from './modules/security/security.module';
import { AuthModule } from './modules/auth/auth.module';
import { CrmModule } from './modules/crm/crm.module';
import { SocialWorkerModule } from './modules/social-worker/social-worker.module';
import { EmailModule } from './modules/email/email.module';
import { AiInboxModule } from './modules/ai-inbox/ai-inbox.module';
import { QrCheckinModule } from './modules/qr-checkin/qr-checkin.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { HostPortalModule } from './modules/host-portal/host-portal.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),
    DatabaseModule,
    SecurityModule,
    AuthModule,
    CrmModule,
    SocialWorkerModule,
    EmailModule,
    AiInboxModule,
    QrCheckinModule,
    AnalyticsModule,
    HostPortalModule,
  ],
})
export class AppModule {}
