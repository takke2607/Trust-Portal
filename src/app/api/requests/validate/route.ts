import { NextResponse } from 'next/server';
import { verifyAccess } from '@/lib/access';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const versionId = searchParams.get('versionId');
    
    if (!versionId || !token) {
      return NextResponse.json({ valid: false, error: 'Missing parameters' }, { status: 400 });
    }
    
    const isValid = await verifyAccess(versionId, token);
    return NextResponse.json(
      { valid: isValid },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }
    );
  } catch (error) {
    console.error('Validate token error:', error);
    return NextResponse.json({ valid: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
