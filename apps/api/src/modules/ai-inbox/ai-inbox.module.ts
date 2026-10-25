import { Module } from '@nestjs/common';
import { AiInboxService } from './ai-inbox.service';
import { LlmRsvpAnalyzerService } from './llm-rsvp-analyzer.service';
import { AiInboxController } from './ai-inbox.controller';
import { DatabaseModule } from '../database/database.module';
import { SecurityModule } from '../security/security.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [DatabaseModule, SecurityModule, AuthModule],
  controllers: [AiInboxController],
  providers: [AiInboxService, LlmRsvpAnalyzerService],
  exports: [AiInboxService, LlmRsvpAnalyzerService],
})
export class AiInboxModule {}
