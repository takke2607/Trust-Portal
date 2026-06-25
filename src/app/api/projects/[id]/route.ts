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
    
    const { name, description, isPublic, isArchived } = await request.json();
    
    const project = await prisma.project.update({
      where: { id },
      data: {
        name,
        description,
        isPublic: isPublic !== undefined ? !!isPublic : undefined,
        isArchived: isArchived !== undefined ? !!isArchived : undefined
      }
    });
    
    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
    await logAudit({
      userId: session.userId as string,
      action: 'PROJECT_UPDATE',
      ipAddress: ip,
      metadata: { projectId: project.id, projectName: project.name, isPublic: project.isPublic, isArchived: project.isArchived }
    });
    
    return NextResponse.json(project);
  } catch (error) {
    console.error('Projects PUT error:', error);
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
    
    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    
    await prisma.project.delete({
      where: { id }
    });
    
    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
    await logAudit({
      userId: session.userId as string,
      action: 'PROJECT_DELETE',
      ipAddress: ip,
      metadata: { projectId: id, projectName: project.name }
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Projects DELETE error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
