import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
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
    
    const body = await request.clone().json();
    if (session.userId === id) {
      if (body.isEnabled === false || (body.role && body.role !== 'ADMIN')) {
        return NextResponse.json({ error: 'Cannot disable yourself or change your own admin role' }, { status: 400 });
      }
    }
    
    const { email, password, name, role, isEnabled } = body;
    
    const data: any = {};
    if (email) data.email = email.toLowerCase();
    if (name !== undefined) data.name = name;
    if (role) data.role = role;
    if (isEnabled !== undefined) data.isEnabled = !!isEnabled;
    
    if (password) {
      data.passwordHash = await bcrypt.hash(password, 10);
    }
    
    const user = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isEnabled: true
      }
    });
    
    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
    await logAudit({
      userId: session.userId as string,
      action: 'USER_UPDATE',
      ipAddress: ip,
      metadata: { updatedUserId: id, email: user.email, role: user.role, isEnabled: user.isEnabled, passwordReset: !!password }
    });
    
    return NextResponse.json(user);
  } catch (error) {
    console.error('Users PUT error:', error);
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
    
    if (session.userId === id) {
      return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 });
    }
    
    const user = await prisma.user.findUnique({
      where: { id }
    });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    await prisma.user.delete({
      where: { id }
    });
    
    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
    await logAudit({
      userId: session.userId as string,
      action: 'USER_DELETE',
      ipAddress: ip,
      metadata: { deletedUserId: id, email: user.email }
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Users DELETE error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
