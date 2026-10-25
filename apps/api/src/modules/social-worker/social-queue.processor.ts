import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { SocialPlatform, GuestTag, ScrapeStatus } from '@prisma/client';
import * as crypto from 'crypto';

export interface SocialScrapeJobData {
  jobId: string;
  profileId: string;
  guestId: string;
  platform: SocialPlatform;
  handle: string;
  tags: GuestTag[];
}

export interface SocialScrapeJob {
  id: string;
  data: SocialScrapeJobData;
  attempts: number;
  maxAttempts: number;
  status: ScrapeStatus;
  error?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export type JobProcessorFn = (job: SocialScrapeJob) => Promise<void>;

@Injectable()
export class SocialQueueProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SocialQueueProcessor.name);

  // Hibrit Kuyruk Durumu
  private readonly concurrency = 3;
  private readonly maxAttempts = 3;
  private isProcessing = false;
  private isShuttingDown = false;

  private queue: SocialScrapeJob[] = [];
  private activeJobs = new Map<string, SocialScrapeJob>();
  private completedCount = 0;
  private failedCount = 0;
  private jobHistory = new Map<string, SocialScrapeJob>();

  private processorFn: JobProcessorFn | null = null;
  private processInterval: NodeJS.Timeout | null = null;

  async onModuleInit() {
    this.logger.log(
      `[SocialQueue] Hibrit Asenkron Kuyruk Başlatıldı (Concurrency: ${this.concurrency}, MaxRetries: ${this.maxAttempts})`
    );
    // Kuyruk döngüsünü tetikle
    this.processInterval = setInterval(() => {
      this.tick();
    }, 100);
  }

  onModuleDestroy() {
    this.isShuttingDown = true;
    if (this.processInterval) {
      clearInterval(this.processInterval);
    }
  }

  /**
   * Kuyruk işleyicisini (Worker Handler) bağlar
   */
  registerProcessor(fn: JobProcessorFn) {
    this.processorFn = fn;
  }

  /**
   * Yeni bir sosyal medya tarama işini kuyruğa ekler
   */
  async addJob(data: Omit<SocialScrapeJobData, 'jobId'>): Promise<SocialScrapeJob> {
    const jobId = `job_${crypto.randomBytes(8).toString('hex')}`;
    const job: SocialScrapeJob = {
      id: jobId,
      data: { ...data, jobId },
      attempts: 0,
      maxAttempts: this.maxAttempts,
      status: ScrapeStatus.PENDING,
      createdAt: new Date(),
    };

    this.queue.push(job);
    this.jobHistory.set(jobId, job);
    this.logger.debug(
      `[SocialQueue] Yeni iş eklendi: ${job.id} (${job.data.platform} - ${job.data.handle}) [Kuyruktaki: ${this.queue.length}]`
    );

    // Derhal çalıştırmayı dene
    this.tick();
    return job;
  }

  /**
   * Toplu iş ekleme
   */
  async addBulkJobs(
    items: Array<Omit<SocialScrapeJobData, 'jobId'>>
  ): Promise<SocialScrapeJob[]> {
    const jobs: SocialScrapeJob[] = [];
    for (const item of items) {
      const job = await this.addJob(item);
      jobs.push(job);
    }
    return jobs;
  }

  /**
   * Kuyruk döngüsü (Worker loop): Eşzamanlılık sınırına (3) uyarak işleri çeker
   */
  private async tick() {
    if (this.isShuttingDown || !this.processorFn) {
      return;
    }

    while (this.activeJobs.size < this.concurrency && this.queue.length > 0) {
      const job = this.queue.shift();
      if (!job) break;

      this.activeJobs.set(job.id, job);
      job.startedAt = new Date();
      job.attempts += 1;

      this.executeJob(job).catch((err) => {
        this.logger.error(`[SocialQueue] Beklenmeyen hata: ${err.message}`);
      });
    }
  }

  /**
   * Tekil iş yürütme & Üstel Geri Çekilmeli Yeniden Deneme (Exponential Backoff)
   */
  private async executeJob(job: SocialScrapeJob) {
    try {
      if (this.processorFn) {
        await this.processorFn(job);
      }

      // Başarılı tamamlandı
      job.status = ScrapeStatus.COMPLETED;
      job.completedAt = new Date();
      this.completedCount += 1;
      this.activeJobs.delete(job.id);
      this.logger.debug(
        `[SocialQueue] İş tamamlandı: ${job.id} (${job.data.platform} - ${job.data.handle})`
      );
    } catch (error: any) {
      const errorMessage = error?.message || 'Bilinmeyen iş hatası';
      job.error = errorMessage;

      if (job.attempts < job.maxAttempts) {
        // Üstel geri çekilme (exponential backoff: 100ms * 2^(attempts-1))
        const backoffMs = Math.round(100 * Math.pow(2, job.attempts - 1));
        this.logger.warn(
          `[SocialQueue] İş başarısız oldu (${job.attempts}/${job.maxAttempts}). ${backoffMs}ms sonra tekrar denenecek: ${job.id} - ${errorMessage}`
        );

        this.activeJobs.delete(job.id);

        setTimeout(() => {
          if (!this.isShuttingDown) {
            this.queue.push(job);
            this.tick();
          }
        }, backoffMs);
      } else {
        // Maksimum deneme aşıldı, kalıcı hata
        job.status = ScrapeStatus.FAILED;
        job.completedAt = new Date();
        this.failedCount += 1;
        this.activeJobs.delete(job.id);
        this.logger.error(
          `[SocialQueue] İş tamamen başarısız oldu (${job.maxAttempts} deneme tükendi): ${job.id} - ${errorMessage}`
        );
      }
    } finally {
      // Bir sonraki iş için kuyruğu tetikle
      this.tick();
    }
  }

  /**
   * Kuyruk istatistikleri ve durum özeti
   */
  getStats() {
    return {
      queuedJobs: this.queue.length,
      activeJobs: this.activeJobs.size,
      completedJobs: this.completedCount,
      failedJobs: this.failedCount,
      concurrency: this.concurrency,
    };
  }

  /**
   * Kuyruktaki veya tamamlanan belirli bir işin detayını getirir
   */
  getJob(jobId: string): SocialScrapeJob | undefined {
    return this.jobHistory.get(jobId);
  }

  /**
   * Kuyrukta bekleyen tüm işlerin temizlenmesi (test amaçlı)
   */
  clear() {
    this.queue = [];
    this.activeJobs.clear();
    this.completedCount = 0;
    this.failedCount = 0;
    this.jobHistory.clear();
  }
}
