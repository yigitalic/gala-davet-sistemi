import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { SecurityModule } from '../security/security.module';
import { QrCheckinService } from './qr-checkin.service';
import { QrCheckinController } from './qr-checkin.controller';

@Module({
  imports: [DatabaseModule, SecurityModule],
  controllers: [QrCheckinController],
  providers: [QrCheckinService],
  exports: [QrCheckinService],
})
export class QrCheckinModule {}
