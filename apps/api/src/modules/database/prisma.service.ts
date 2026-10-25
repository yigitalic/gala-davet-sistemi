import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log:
        process.env.NODE_ENV === 'development'
          ? ['query', 'error', 'warn']
          : ['error'],
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Veritabanı bağlantısı (PostgreSQL / Prisma) başarıyla kuruldu.');
    } catch (error) {
      this.logger.error('Veritabanı bağlantısı kurulamadı:', error);
      // Geliştirme ortamında veya mock senaryolarında fail-fast davranışı kontrollü tutulur
      if (process.env.NODE_ENV === 'production') {
        throw error;
      }
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Veritabanı bağlantısı kapatıldı.');
  }
}
