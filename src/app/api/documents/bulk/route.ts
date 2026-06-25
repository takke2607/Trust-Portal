import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import fs from 'fs/promises';
import path from 'path';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'COMPLIANCE_MANAGER')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const { action, documentIds, targetFolderId, targetProjectId } = body;

    if (!action || !documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';

    if (action === 'delete') {
      // Bulk soft delete
      await prisma.document.updateMany({
        where: { id: { in: documentIds } },
        data: { isDeleted: true, updatedAt: new Date() }
      });

      // Log bulk audit
      await logAudit({
        userId: session.userId as string,
        action: 'DOCUMENT_BULK_DELETE',
        ipAddress: ip,
        metadata: { documentIds }
      });

      return NextResponse.json({ success: true });
    }

    if (action === 'move') {
      const folderId = targetFolderId === 'root' ? null : targetFolderId;
      const updateData: any = { folderId, updatedAt: new Date() };
      if (targetProjectId) {
        updateData.projectId = targetProjectId;
      }
      
      // Bulk move
      await prisma.document.updateMany({
        where: { id: { in: documentIds } },
        data: updateData
      });

      await logAudit({
        userId: session.userId as string,
        action: 'DOCUMENT_BULK_MOVE',
        ipAddress: ip,
        metadata: { documentIds, targetFolderId: folderId, targetProjectId }
      });

      return NextResponse.json({ success: true });
    }

    if (action === 'copy') {
      const folderId = targetFolderId === 'root' ? null : targetFolderId;

      // Bulk copy documents
      const docsToCopy = await prisma.document.findMany({
        where: { id: { in: documentIds } },
        include: { 
          tags: true,
          versions: {
            orderBy: { versionNumber: 'desc' }
          }
        }
      });

      const UPLOAD_DIR = process.env.LOCAL_UPLOAD_DIR || './uploads';

      for (const doc of docsToCopy) {
        const latestVersion = doc.versions[0];
        if (!latestVersion) continue;

        // 1. Duplicate physical file on disk
        const oldPath = latestVersion.filePath;
        const ext = oldPath.split('.').pop() || '';
        const newFileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}-copy.${ext}`;
        const newPath = path.resolve(path.join(UPLOAD_DIR, newFileName));

        try {
          await fs.copyFile(oldPath, newPath);
        } catch (err) {
          console.error(`Failed to copy file from ${oldPath} to ${newPath}:`, err);
          continue; // Skip if file copying fails
        }

        // 2. Create new Document in database
        const newDoc = await prisma.document.create({
          data: {
            name: `${doc.name} (Copy)`,
            description: doc.description,
            projectId: targetProjectId || doc.projectId,
            folderId,
            isPublicApproved: doc.isPublicApproved,
            tags: {
              create: doc.tags.map(t => ({ name: t.name }))
            }
          }
        });

        // 3. Create DocumentVersion in database
        const newVersion = await prisma.documentVersion.create({
          data: {
            documentId: newDoc.id,
            versionNumber: 1,
            filePath: newPath,
            fileSize: latestVersion.fileSize,
            mimeType: latestVersion.mimeType,
            uploadedById: session.userId as string
          }
        });

        // Duplicate the cached PDF file if it exists (for instant preview on cloned files)
        if (ext === 'docx') {
          const oldCachePdfPath = path.resolve(path.join(UPLOAD_DIR, `cache-${latestVersion.id}.pdf`));
          const newCachePdfPath = path.resolve(path.join(UPLOAD_DIR, `cache-${newVersion.id}.pdf`));
          try {
            const { existsSync } = require('fs');
            if (existsSync(oldCachePdfPath)) {
              await fs.copyFile(oldCachePdfPath, newCachePdfPath);
            }
          } catch (err) {
            console.error('Failed to copy cached PDF for cloned document:', err);
          }
        }
      }

      await logAudit({
        userId: session.userId as string,
        action: 'DOCUMENT_BULK_COPY',
        ipAddress: ip,
        metadata: { documentIds, targetFolderId: folderId, targetProjectId }
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
  } catch (error: any) {
    console.error('Bulk documents action error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
