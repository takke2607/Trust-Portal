import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';
import { saveFile } from '@/lib/storage';
import { logAudit } from '@/lib/audit';
import { convertDocxToPdf } from '@/lib/converter';
import path from 'path';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'COMPLIANCE_MANAGER')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const projectId = formData.get('projectId') as string;
    const folderId = formData.get('folderId') as string || null;
    const isPublicApproved = formData.get('isPublicApproved') === 'true';
    const tagsString = formData.get('tags') as string || '';

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }
    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    const tagsList = tagsString.split(',').map(t => t.trim()).filter(Boolean);
    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
    const uploadedDocs = [];

    for (const file of files) {
      // 1. Save file to disk
      const fileInfo = await saveFile(file);

      // 2. Create document record using original filename
      const name = file.name || 'Unnamed Document';

      const document = await prisma.document.create({
        data: {
          name,
          description: `Bulk uploaded: ${name}`,
          projectId,
          folderId: folderId === 'root' ? null : folderId,
          isPublicApproved,
          tags: {
            create: tagsList.map(tagName => ({ name: tagName }))
          }
        }
      });

      // 3. Create document version record
      const version = await prisma.documentVersion.create({
        data: {
          documentId: document.id,
          versionNumber: 1,
          filePath: fileInfo.filePath,
          fileSize: fileInfo.fileSize,
          mimeType: fileInfo.mimeType,
          uploadedById: session.userId as string
        }
      });

      // 4. Background conversion for docx
      const ext = (fileInfo.filePath || '').split('.').pop()?.toLowerCase();
      if (ext === 'docx') {
        const UPLOAD_DIR = process.env.LOCAL_UPLOAD_DIR || './uploads';
        const cachePdfPath = path.resolve(path.join(UPLOAD_DIR, `cache-${version.id}.pdf`));
        convertDocxToPdf(fileInfo.filePath, cachePdfPath, version.id).catch(err => {
          console.error(`Pre-conversion of bulk uploaded DOCX failed for ${name}:`, err);
        });
      }

      uploadedDocs.push({ document, version });
    }

    // Log bulk upload action in audit logs
    await logAudit({
      userId: session.userId as string,
      action: 'DOCUMENT_BULK_UPLOAD',
      ipAddress: ip,
      metadata: { 
        count: files.length, 
        projectId, 
        folderId,
        filenames: files.map(f => f.name)
      }
    });

    return NextResponse.json({ success: true, count: files.length });
  } catch (error: any) {
    console.error('Bulk documents upload error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
