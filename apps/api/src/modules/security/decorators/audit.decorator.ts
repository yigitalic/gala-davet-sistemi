import { SetMetadata } from '@nestjs/common';
import { AuditAction } from '@prisma/client';

export const AUDIT_METADATA_KEY = 'AUDIT_METADATA_KEY';

export interface AuditMetadataOptions {
  action: AuditAction;
  entityType: string;
}

/**
 * Endpoint'e KVKK Audit Log kaydı düşülmesi gerektiğini belirten decorator
 */
export const Audit = (action: AuditAction, entityType: string) =>
  SetMetadata(AUDIT_METADATA_KEY, { action, entityType } as AuditMetadataOptions);
