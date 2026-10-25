import { Module, forwardRef } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { SecurityModule } from '../security/security.module';
import { AuthModule } from '../auth/auth.module';
import { CrmController } from './crm.controller';
import { CrmService } from './crm.service';
import { CsvImportExportService } from './csv-import-export.service';

@Module({
  imports: [
    DatabaseModule,
    SecurityModule,
    forwardRef(() => AuthModule),
  ],
  controllers: [CrmController],
  providers: [CrmService, CsvImportExportService],
  exports: [CrmService, CsvImportExportService],
})
export class CrmModule {}
