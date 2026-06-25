import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    
    const response = NextResponse.json({ success: true });
    response.cookies.delete('token');
    
    if (session) {
      const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
      await logAudit({
        userId: session.userId as string,
        action: 'LOGOUT',
        ipAddress: ip,
        metadata: { email: session.email }
      });
    }
    
    return response;
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
