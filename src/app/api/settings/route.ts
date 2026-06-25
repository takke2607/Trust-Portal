import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

const DEFAULT_SETTINGS = {
  websiteName: 'Trust Center',
  tabName: 'Trust Center',
  portalIconUrl: '',
  footerText: 'Trust Center Portal. All rights reserved.'
};

export async function GET() {
  try {
    const settingsList = await prisma.systemSetting.findMany();
    
    // Convert key-value records array to object
    const settingsObj: Record<string, string> = {};
    settingsList.forEach(setting => {
      settingsObj[setting.key] = setting.value;
    });
    
    // Merge with defaults to ensure all keys are returned
    const result = {
      websiteName: settingsObj.websiteName || DEFAULT_SETTINGS.websiteName,
      tabName: settingsObj.tabName || DEFAULT_SETTINGS.tabName,
      portalIconUrl: settingsObj.portalIconUrl || DEFAULT_SETTINGS.portalIconUrl,
      footerText: settingsObj.footerText || DEFAULT_SETTINGS.footerText
    };
    
    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    console.error('Settings GET error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

async function handleSave(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const body = await request.json();
    const { websiteName, tabName, portalIconUrl, footerText } = body;
    
    const settingsToSave = [
      { key: 'websiteName', value: websiteName || '' },
      { key: 'tabName', value: tabName || '' },
      { key: 'portalIconUrl', value: portalIconUrl || '' },
      { key: 'footerText', value: footerText || '' }
    ];
    
    for (const setting of settingsToSave) {
      await prisma.systemSetting.upsert({
        where: { key: setting.key },
        update: { value: setting.value },
        create: { key: setting.key, value: setting.value }
      });
    }
    
    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
    await logAudit({
      userId: session.userId as string,
      action: 'SETTINGS_UPDATE',
      ipAddress: ip,
      metadata: { updatedKeys: Object.keys(body) }
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Settings save error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return handleSave(request);
}

export async function PUT(request: Request) {
  return handleSave(request);
}
