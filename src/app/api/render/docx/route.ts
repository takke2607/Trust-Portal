import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import prisma from '@/lib/db';
import mammoth from 'mammoth';
import { verifyAccess } from '@/lib/access';

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
      return new Response('Unauthorized', { status: 403 });
    }
    
    const version = await prisma.documentVersion.findUnique({
      where: { id: versionId }
    });
    
    if (!version) {
      return new Response('Version not found', { status: 404 });
    }
    
    const fileBuffer = await fs.readFile(version.filePath);
    const result = await mammoth.convertToHtml({ buffer: fileBuffer });
    
    return NextResponse.json(
      { html: result.value },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }
    );
  } catch (error: any) {
    console.error('DOCX render error:', error);
    return NextResponse.json({ error: 'Failed to render DOCX document.' }, { status: 500 });
  }
}
