import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getSession();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'COMPLIANCE_MANAGER')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    
    const body = await request.json();
    const { name, description, folderId, isPublicApproved, isDeleted, tagsString } = body;
    
    const data: any = {};
    if (name !== undefined) data.name = name;
    if (description !== undefined) data.description = description;
    if (folderId !== undefined) data.folderId = folderId || null;
    if (isPublicApproved !== undefined) data.isPublicApproved = !!isPublicApproved;
    if (isDeleted !== undefined) data.isDeleted = !!isDeleted;
    
    if (tagsString !== undefined) {
      const tagsList = tagsString.split(',').map((t: string) => t.trim()).filter(Boolean);
      await prisma.tag.deleteMany({
        where: { documentId: id }
      });
      data.tags = {
        create: tagsList.map((name: string) => ({ name }))
      };
    }
    
    const document = await prisma.document.update({
      where: { id },
      data,
      include: { tags: true }
    });
    
    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
    const action = isDeleted ? 'DOCUMENT_SOFT_DELETE' : 'DOCUMENT_UPDATE';
    
    await logAudit({
      userId: session.userId as string,
      action,
      ipAddress: ip,
      metadata: { documentId: id, name: document.name, isPublicApproved: document.isPublicApproved, isDeleted: document.isDeleted }
    });
    
    return NextResponse.json(document);
  } catch (error) {
    console.error('Documents PUT error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const document = await prisma.document.findUnique({
      where: { id },
      include: { versions: true }
    });
    
    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }
    
    // Clean up local disk files
    const { deleteFile } = await import('@/lib/storage');
    for (const version of document.versions) {
      await deleteFile(version.filePath);
    }
    
    await prisma.document.delete({
      where: { id }
    });
    
    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
    await logAudit({
      userId: session.userId as string,
      action: 'DOCUMENT_PERMANENT_DELETE',
      ipAddress: ip,
      metadata: { documentId: id, name: document.name }
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Documents DELETE error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
