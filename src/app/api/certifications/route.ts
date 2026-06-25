import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export async function GET(request: Request) {
  try {
    const certifications = await prisma.certification.findMany({
      orderBy: { name: 'asc' }
    });
    return NextResponse.json(certifications);
  } catch (error) {
    console.error('Certifications GET error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const { name, description, status } = await request.json();
    if (!name || !status) {
      return NextResponse.json({ error: 'Name and Status are required' }, { status: 400 });
    }
    
    const certification = await prisma.certification.create({
      data: {
        name,
        description,
        status
      }
    });
    
    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
    await logAudit({
      userId: session.userId as string,
      action: 'CERTIFICATION_CREATE',
      ipAddress: ip,
      metadata: { certificationId: certification.id, name: certification.name }
    });
    
    return NextResponse.json(certification);
  } catch (error) {
    console.error('Certifications POST error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
