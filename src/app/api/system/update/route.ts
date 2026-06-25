import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { getSession } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

const execPromise = promisify(exec);

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
    let stdoutLogs = '';
    let stderrLogs = '';

    // 1. Run git pull origin main
    try {
      const { stdout, stderr } = await execPromise('git pull origin main');
      stdoutLogs += `[git pull stdout]\n${stdout}\n`;
      if (stderr) {
        stderrLogs += `[git pull stderr]\n${stderr}\n`;
      }
    } catch (err: any) {
      console.error('Update Git Pull error:', err);
      return NextResponse.json({
        success: false,
        error: 'Git pull failed. You might have uncommitted changes or connection issues.',
        stdout: err.stdout || '',
        stderr: err.stderr || err.message || ''
      }, { status: 500 });
    }

    // 2. Regenerate Prisma Client in case schema.prisma changed
    try {
      const { stdout, stderr } = await execPromise('node node_modules/prisma/build/index.js generate');
      stdoutLogs += `[prisma generate stdout]\n${stdout}\n`;
      if (stderr) {
        stderrLogs += `[prisma generate stderr]\n${stderr}\n`;
      }
    } catch (err: any) {
      console.error('Update Prisma Generate error:', err);
      stdoutLogs += `[prisma generate failed]\n`;
      stderrLogs += `${err.stderr || err.message}\n`;
    }

    // Write audit log
    await logAudit({
      userId: session.userId as string,
      action: 'SYSTEM_UPDATE_PULL',
      ipAddress: ip,
      metadata: { success: true }
    });

    return NextResponse.json({
      success: true,
      stdout: stdoutLogs,
      stderr: stderrLogs
    });

  } catch (error: any) {
    console.error('Update POST error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
