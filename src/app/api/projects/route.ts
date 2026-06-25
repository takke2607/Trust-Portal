import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    const isAuthorized = session && (session.role === 'ADMIN' || session.role === 'COMPLIANCE_MANAGER');
    
    const projects = await prisma.project.findMany({
      where: isAuthorized 
        ? {} 
        : { isPublic: true, isArchived: false },
      orderBy: { createdAt: 'desc' }
    });
    
    return NextResponse.json(projects);
  } catch (error) {
    console.error('Projects GET error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'COMPLIANCE_MANAGER')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    
    const { name, description, isPublic } = await request.json();
    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    
    const project = await prisma.project.create({
      data: {
        name,
        description,
        isPublic: !!isPublic
      }
    });
    
    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
    await logAudit({
      userId: session.userId as string,
      action: 'PROJECT_CREATE',
      ipAddress: ip,
      metadata: { projectId: project.id, projectName: project.name }
    });
    
    return NextResponse.json(project);
  } catch (error) {
    console.error('Projects POST error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
