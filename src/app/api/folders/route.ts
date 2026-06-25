import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    
    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }
    
    const folders = await prisma.folder.findMany({
      where: { projectId },
      orderBy: { name: 'asc' }
    });
    
    return NextResponse.json(folders);
  } catch (error) {
    console.error('Folders GET error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'COMPLIANCE_MANAGER')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    
    const { name, projectId, parentId } = await request.json();
    if (!name || !projectId) {
      return NextResponse.json({ error: 'Name and projectId are required' }, { status: 400 });
    }
    
    const folder = await prisma.folder.create({
      data: {
        name,
        projectId,
        parentId: parentId || null
      }
    });
    
    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
    await logAudit({
      userId: session.userId as string,
      action: 'FOLDER_CREATE',
      ipAddress: ip,
      metadata: { folderId: folder.id, folderName: folder.name, projectId }
    });
    
    return NextResponse.json(folder);
  } catch (error) {
    console.error('Folders POST error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
