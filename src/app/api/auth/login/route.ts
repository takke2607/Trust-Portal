import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/db';
import { signJWT } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }
    
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });
    
    if (!user || !user.isEnabled) {
      return NextResponse.json({ error: 'Invalid credentials or user disabled' }, { status: 401 });
    }
    
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Invalid credentials or user disabled' }, { status: 401 });
    }
    
    const token = await signJWT({
      userId: user.id,
      email: user.email,
      role: user.role
    });
    
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
    
    response.cookies.set({
      name: 'token',
      value: token,
      httpOnly: true,
      secure: request.url.startsWith('https:') || request.headers.get('x-forwarded-proto') === 'https',
      sameSite: 'lax', // Use 'lax' to prevent navigation redirect-loops on external domains
      maxAge: 60 * 60 * 24 // 24 hours
    });
    
    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
    await logAudit({
      userId: user.id,
      action: 'LOGIN_SUCCESS',
      ipAddress: ip,
      metadata: { email: user.email }
    });
    
    return response;
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
