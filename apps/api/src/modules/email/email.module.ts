import { Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { EventCampaignService } from './event-campaign.service';
import { EmailController } from './email.controller';
import { DatabaseModule } from '../database/database.module';
import { SecurityModule } from '../security/security.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [DatabaseModule, SecurityModule, AuthModule],
  controllers: [EmailController],
  providers: [EmailService, EventCampaignService],
  exports: [EmailService, EventCampaignService],
})
export class EmailModule {}
