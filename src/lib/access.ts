import prisma from './db';
import { getSession } from './auth';

export async function verifyAccess(versionId: string, token?: string | null): Promise<boolean> {
  try {
    const version = await prisma.documentVersion.findUnique({
      where: { id: versionId },
      include: {
        document: {
          include: {
            project: true
          }
        }
      }
    });
    
    if (!version) return false;
    
    const document = version.document;
    const project = document.project;
    
    // 1. Check if public approved
    if (document.isPublicApproved && project.isPublic && !project.isArchived && !document.isDeleted) {
      return true;
    }
    
    // 2. Check token validity (if token is provided, it must be valid to grant access)
    if (token) {
      const accessRequest = await prisma.accessRequest.findUnique({
        where: { token }
      });
      
      if (
        accessRequest &&
        accessRequest.status === 'APPROVED' &&
        accessRequest.documentId === document.id &&
        accessRequest.expiresAt &&
        new Date(accessRequest.expiresAt) > new Date()
      ) {
        return true;
      }
      return false; // Token provided is invalid/expired/deleted -> deny access immediately!
    }
    
    // 3. Check if logged in compliance manager or admin (only if no token is provided)
    const session = await getSession();
    if (session && (session.role === 'ADMIN' || session.role === 'COMPLIANCE_MANAGER')) {
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('VerifyAccess helper error:', error);
    return false;
  }
}
