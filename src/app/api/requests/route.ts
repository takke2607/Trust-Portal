import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'COMPLIANCE_MANAGER')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    
    const requests = await prisma.accessRequest.findMany({
      include: {
        document: {
          select: {
            name: true,
            projectId: true,
            versions: {
              orderBy: { versionNumber: 'desc' },
              take: 1,
              select: { id: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    return NextResponse.json(requests);
  } catch (error) {
    console.error('Requests GET error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { documentId, requesterEmail, reason } = await request.json();
    
    if (!documentId || !requesterEmail) {
      return NextResponse.json({ error: 'documentId and requesterEmail are required' }, { status: 400 });
    }
    
    const doc = await prisma.document.findUnique({
      where: { id: documentId }
    });
    
    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }
    
    const accessRequest = await prisma.accessRequest.create({
      data: {
        documentId,
        requesterEmail: requesterEmail.toLowerCase(),
        reason,
        status: 'PENDING'
      }
    });
    
    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
    await logAudit({
      userId: null,
      action: 'ACCESS_REQUEST_SUBMIT',
      ipAddress: ip,
      metadata: { requestId: accessRequest.id, documentId, requesterEmail }
    });
    
    return NextResponse.json(accessRequest);
  } catch (error) {
    console.error('Requests POST error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
