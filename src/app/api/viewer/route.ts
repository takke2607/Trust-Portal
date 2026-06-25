import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getFileBuffer } from '@/lib/storage';
import { logAudit } from '@/lib/audit';
import { verifyAccess } from '@/lib/access';
import { convertDocxToPdf } from '@/lib/converter';
import path from 'path';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const versionId = searchParams.get('versionId');
    const token = searchParams.get('token');
    
    if (!versionId) {
      return new Response('versionId is required', { status: 400 });
    }
    
    const isAllowed = await verifyAccess(versionId, token);
    if (!isAllowed) {
      return new Response('Unauthorized to access this document', { status: 403 });
    }
    
    const version = await prisma.documentVersion.findUnique({
      where: { id: versionId },
      include: { document: true }
    });
    
    if (!version) {
      return new Response('File not found', { status: 404 });
    }
    
    const download = searchParams.get('download') === 'true';
    const ext = (version.filePath || '').split('.').pop()?.toLowerCase();
    
    let fileBuffer: Buffer;
    let mimeType = version.mimeType;
    let dispositionFilename = version.document.name;
    
    if (ext === 'docx' && !download) {
      const UPLOAD_DIR = process.env.LOCAL_UPLOAD_DIR || './uploads';
      const cachePdfPath = path.resolve(path.join(UPLOAD_DIR, `cache-${versionId}.pdf`));
      try {
        const pdfPath = await convertDocxToPdf(version.filePath, cachePdfPath, versionId);
        fileBuffer = await getFileBuffer(pdfPath);
        mimeType = 'application/pdf';
        dispositionFilename = dispositionFilename.replace(/\.docx$/i, '.pdf');
      } catch (err) {
        console.error('Failed to convert DOCX to PDF:', err);
        return new Response('Failed to render DOCX document as PDF.', { status: 500 });
      }
    } else {
      fileBuffer = await getFileBuffer(version.filePath);
    }
    
    const contentDisposition = download 
      ? `attachment; filename="${encodeURIComponent(dispositionFilename)}"` 
      : 'inline';
    
    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
    await logAudit({
      userId: null,
      action: download ? 'DOCUMENT_DOWNLOAD' : 'DOCUMENT_VIEW',
      ipAddress: ip,
      metadata: {
        documentId: version.documentId,
        versionId,
        fileName: version.document.name,
        tokenUsed: !!token
      }
    });
    
    return new Response(new Uint8Array(fileBuffer), {
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': contentDisposition,
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    console.error('Viewer GET error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
