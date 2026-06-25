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
    
    const { name, parentId } = await request.json();
    
    const folder = await prisma.folder.update({
      where: { id },
      data: {
        name: name !== undefined ? name : undefined,
        parentId: parentId !== undefined ? (parentId || null) : undefined
      }
    });
    
    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
    await logAudit({
      userId: session.userId as string,
      action: 'FOLDER_UPDATE',
      ipAddress: ip,
      metadata: { folderId: folder.id, folderName: folder.name, parentId: folder.parentId }
    });
    
    return NextResponse.json(folder);
  } catch (error) {
    console.error('Folders PUT error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getSession();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'COMPLIANCE_MANAGER')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    
    const folder = await prisma.folder.findUnique({ where: { id } });
    if (!folder) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }
    
    await prisma.folder.delete({
      where: { id }
    });
    
    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
    await logAudit({
      userId: session.userId as string,
      action: 'FOLDER_DELETE',
      ipAddress: ip,
      metadata: { folderId: id, folderName: folder.name, projectId: folder.projectId }
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Folders DELETE error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
