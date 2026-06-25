import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';
import { saveFile } from '@/lib/storage';
import { logAudit } from '@/lib/audit';
import { convertDocxToPdf } from '@/lib/converter';
import path from 'path';
import { existsSync } from 'fs';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const folderId = searchParams.get('folderId');
    
    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }
    
    const session = await getSession();
    const isAuthorized = session && (session.role === 'ADMIN' || session.role === 'COMPLIANCE_MANAGER');
    
    // Fetch all documents that are not deleted
    const documents = await prisma.document.findMany({
      where: {
        projectId,
        folderId: folderId === 'root' ? null : (folderId ? folderId : undefined),
        isDeleted: false,
      },
      include: {
        tags: true,
        versions: {
          orderBy: { versionNumber: 'desc' }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });
    
    const UPLOAD_DIR = process.env.LOCAL_UPLOAD_DIR || './uploads';

    // Secure private document version structures for public users and check pre-rendering status
    const securedDocuments = documents.map(doc => {
      const latestVersion = doc.versions[0];
      let isPreRendering = false;
      if (latestVersion) {
        const ext = (latestVersion.filePath || '').split('.').pop()?.toLowerCase();
        if (ext === 'docx') {
          const cachePdfPath = path.resolve(path.join(UPLOAD_DIR, `cache-${latestVersion.id}.pdf`));
          if (!existsSync(cachePdfPath)) {
            isPreRendering = true;
          }
        }
      }

      const docWithStatus = { ...doc, isPreRendering };

      // If user is staff, return full data
      if (isAuthorized) return docWithStatus;
      
      // If the document is public approved, they can download/preview it
      if (doc.isPublicApproved) return docWithStatus;
      
      // If private, return document metadata but clear file path versions to prevent unauth downloads
      return {
        ...docWithStatus,
        versions: [] // Stripped!
      };
    });
    
    return NextResponse.json(securedDocuments);
  } catch (error) {
    console.error('Documents GET error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'COMPLIANCE_MANAGER')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const documentId = formData.get('documentId') as string | null;
    
    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }
    
    const fileInfo = await saveFile(file);
    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
    
    if (documentId) {
      const document = await prisma.document.findUnique({
        where: { id: documentId },
        include: { versions: true }
      });
      
      if (!document) {
        return NextResponse.json({ error: 'Document not found' }, { status: 404 });
      }
      
      const maxVersion = await prisma.documentVersion.aggregate({
        where: { documentId },
        _max: { versionNumber: true }
      });
      const nextVersion = (maxVersion._max.versionNumber || 0) + 1;
      
      const newVersion = await prisma.documentVersion.create({
        data: {
          documentId,
          versionNumber: nextVersion,
          filePath: fileInfo.filePath,
          fileSize: fileInfo.fileSize,
          mimeType: fileInfo.mimeType,
          uploadedById: session.userId as string
        }
      });

      // Pre-convert DOCX to PDF for instant preview (ASYNCHRONOUSLY in the background)
      const ext = (fileInfo.filePath || '').split('.').pop()?.toLowerCase();
      if (ext === 'docx') {
        const UPLOAD_DIR = process.env.LOCAL_UPLOAD_DIR || './uploads';
        const cachePdfPath = path.resolve(path.join(UPLOAD_DIR, `cache-${newVersion.id}.pdf`));
        convertDocxToPdf(fileInfo.filePath, cachePdfPath, newVersion.id).catch(err => {
          console.error('Asynchronous pre-conversion of uploaded DOCX version failed:', err);
        });
      }
      
      await prisma.document.update({
        where: { id: documentId },
        data: { updatedAt: new Date() }
      });
      
      await logAudit({
        userId: session.userId as string,
        action: 'DOCUMENT_VERSION_UPLOAD',
        ipAddress: ip,
        metadata: { documentId, versionNumber: nextVersion, name: document.name }
      });
      
      return NextResponse.json({ success: true, version: newVersion });
    } else {
      const projectId = formData.get('projectId') as string;
      const folderId = formData.get('folderId') as string || null;
      const name = formData.get('name') as string;
      const description = formData.get('description') as string || '';
      const isPublicApproved = formData.get('isPublicApproved') === 'true';
      const tagsString = formData.get('tags') as string || '';
      
      if (!projectId || !name) {
        return NextResponse.json({ error: 'Name and projectId are required' }, { status: 400 });
      }
      
      const tagsList = tagsString.split(',').map(t => t.trim()).filter(Boolean);
      
      const document = await prisma.document.create({
        data: {
          name,
          description,
          projectId,
          folderId: folderId || null,
          isPublicApproved,
          tags: {
            create: tagsList.map(name => ({ name }))
          }
        }
      });
      
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

      // Pre-convert DOCX to PDF for instant preview (ASYNCHRONOUSLY in the background)
      const ext = (fileInfo.filePath || '').split('.').pop()?.toLowerCase();
      if (ext === 'docx') {
        const UPLOAD_DIR = process.env.LOCAL_UPLOAD_DIR || './uploads';
        const cachePdfPath = path.resolve(path.join(UPLOAD_DIR, `cache-${version.id}.pdf`));
        convertDocxToPdf(fileInfo.filePath, cachePdfPath, version.id).catch(err => {
          console.error('Pre-conversion of uploaded DOCX document failed:', err);
        });
      }
      
      await logAudit({
        userId: session.userId as string,
        action: 'DOCUMENT_UPLOAD',
        ipAddress: ip,
        metadata: { documentId: document.id, name: document.name, versionNumber: 1 }
      });
      
      return NextResponse.json({ success: true, document, version });
    }
  } catch (error: any) {
    console.error('Documents POST error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
