import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const { name, description, status } = await request.json();
    if (!name || !status) {
      return NextResponse.json({ error: 'Name and Status are required' }, { status: 400 });
    }

    const certification = await prisma.certification.update({
      where: { id },
      data: {
        name,
        description,
        status
      }
    });

    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
    await logAudit({
      userId: session.userId as string,
      action: 'CERTIFICATION_UPDATE',
      ipAddress: ip,
      metadata: { certificationId: certification.id, name: certification.name }
    });

    return NextResponse.json(certification);
  } catch (error) {
    console.error('Certification PUT error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const certification = await prisma.certification.delete({
      where: { id }
    });

    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
    await logAudit({
      userId: session.userId as string,
      action: 'CERTIFICATION_DELETE',
      ipAddress: ip,
      metadata: { certificationId: certification.id, name: certification.name }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Certification DELETE error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
