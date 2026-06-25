import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const { status } = await request.json();
    if (status !== 'APPROVED' && status !== 'REJECTED') {
      return NextResponse.json({ error: 'Status must be APPROVED or REJECTED' }, { status: 400 });
    }
    
    const accessRequest = await prisma.accessRequest.findUnique({
      where: { id },
      include: { document: true }
    });
    
    if (!accessRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }
    
    let updatedRequest;
    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
    
    if (status === 'APPROVED') {
      const token = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      
      updatedRequest = await prisma.accessRequest.update({
        where: { id },
        data: {
          status: 'APPROVED',
          token,
          expiresAt,
          approvedById: session.userId as string
        }
      });
      
      await logAudit({
        userId: session.userId as string,
        action: 'ACCESS_REQUEST_APPROVE',
        ipAddress: ip,
        metadata: { requestId: id, requesterEmail: accessRequest.requesterEmail, documentId: accessRequest.documentId, expiresAt }
      });
    } else {
      updatedRequest = await prisma.accessRequest.update({
        where: { id },
        data: {
          status: 'REJECTED',
          token: null,
          expiresAt: null
        }
      });
      
      await logAudit({
        userId: session.userId as string,
        action: 'ACCESS_REQUEST_REJECT',
        ipAddress: ip,
        metadata: { requestId: id, requesterEmail: accessRequest.requesterEmail, documentId: accessRequest.documentId }
      });
    }
    
    return NextResponse.json(updatedRequest);
  } catch (error) {
    console.error('Requests PUT error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getSession();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'COMPLIANCE_MANAGER')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const accessRequest = await prisma.accessRequest.findUnique({
      where: { id }
    });
    
    if (!accessRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }
    
    await prisma.accessRequest.delete({
      where: { id }
    });
    
    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
    await logAudit({
      userId: session.userId as string,
      action: 'ACCESS_REQUEST_DELETE',
      ipAddress: ip,
      metadata: { requestId: id, requesterEmail: accessRequest.requesterEmail, documentId: accessRequest.documentId }
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Requests DELETE error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
