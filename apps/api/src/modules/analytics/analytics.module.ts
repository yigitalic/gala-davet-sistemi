import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { SecurityModule } from '../security/security.module';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { SentimentRoiEngine } from './sentiment-roi.engine';

@Module({
  imports: [DatabaseModule, SecurityModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, SentimentRoiEngine],
  exports: [AnalyticsService, SentimentRoiEngine],
})
export class AnalyticsModule {}
