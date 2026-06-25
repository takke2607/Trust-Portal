import prisma from './db';

interface AuditParams {
  userId?: string | null;
  action: string;
  ipAddress?: string | null;
  metadata?: any;
}

export async function logAudit({ userId, action, ipAddress, metadata }: AuditParams) {
  try {
    const metaString = metadata ? JSON.stringify(metadata) : null;
    await prisma.auditLog.create({
      data: {
        userId: userId || null,
        action,
        ipAddress: ipAddress || null,
        metadata: metaString,
      },
    });
  } catch (error) {
    console.error('Failed to write audit log:', error);
  }
}
