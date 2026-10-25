import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AuditAction, Prisma } from '@prisma/client';

export interface CreateAuditLogParams {
  userId?: string | null;
  action: AuditAction;
  entityType: string;
  entityId: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuditLogFilterParams {
  userId?: string;
  action?: AuditAction;
  entityType?: string;
  entityId?: string;
  startDate?: string | Date;
  endDate?: string | Date;
  page?: number;
  limit?: number;
}

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * KVKK / GDPR Uyumlu Denetim İzi Kaydı Oluşturur
   * Asenkron çalışır, ana akışı kilitlemez, hata durumunda sistem loguna düşer.
   */
  async log(params: CreateAuditLogParams): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: params.userId || null,
          action: params.action,
          entityType: params.entityType,
          entityId: params.entityId,
          metadata: (params.metadata as Prisma.InputJsonValue) ?? Prisma.JsonNull,
          ipAddress: params.ipAddress || null,
          userAgent: params.userAgent || null,
        },
      });

      this.logger.debug(
        `[AUDIT] Action: ${params.action} | Entity: ${params.entityType}#${params.entityId} | User: ${params.userId || 'ANONYMOUS'}`
      );
    } catch (error) {
      // Denetim izi başarısızlığı iş akışını düşürmemeli, ancak kritik seviyede loglanmalı
      this.logger.error(
        `[AUDIT_ERROR] Denetim izi kaydedilemedi! Action: ${params.action}, Entity: ${params.entityType}#${params.entityId}`,
        error instanceof Error ? error.stack : error
      );
    }
  }

  /**
   * Süper Yöneticiler için filtrelenebilir denetim izi sorgulama
   */
  async findAll(filters: AuditLogFilterParams = {}) {
    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(filters.limit) || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.AuditLogWhereInput = {};

    if (filters.userId) {
      where.userId = filters.userId;
    }

    if (filters.action) {
      where.action = filters.action;
    }

    if (filters.entityType) {
      where.entityType = {
        contains: filters.entityType,
        mode: 'insensitive',
      };
    }

    if (filters.entityId) {
      where.entityId = filters.entityId;
    }

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        where.createdAt.lte = new Date(filters.endDate);
      }
    }

    const [total, items] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              role: true,
            },
          },
        },
      }),
    ]);

    return {
      items,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
