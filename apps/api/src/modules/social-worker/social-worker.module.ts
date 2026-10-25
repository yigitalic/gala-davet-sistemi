import { Module } from '@nestjs/common';
import { SocialWorkerService } from './social-worker.service';
import { SocialWorkerController } from './social-worker.controller';
import { SocialScraperProvider } from './social-scraper.provider';
import { SocialQueueProcessor } from './social-queue.processor';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [SocialWorkerController],
  providers: [
    SocialWorkerService,
    SocialScraperProvider,
    SocialQueueProcessor,
  ],
  exports: [
    SocialWorkerService,
    SocialScraperProvider,
    SocialQueueProcessor,
  ],
})
export class SocialWorkerModule {}
