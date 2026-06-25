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

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';

    if (action === 'restart') {
      // Log audit log
      await logAudit({
        userId: session.userId as string,
        action: 'SYSTEM_RESTART_TRIGGERED',
        ipAddress: ip,
        metadata: { success: true }
      });

      // Exit process after a short timeout so response returns cleanly
      setTimeout(() => {
        console.log('Admin triggered server restart. Exiting process...');
        process.exit(0);
      }, 1000);

      return NextResponse.json({
        success: true,
        message: 'Server process exiting. If running under PM2, systemd, or Docker, the container/process will restart automatically.'
      });
    }

    // Default Update Action
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

    // 2. Run npm install
    try {
      const { stdout, stderr } = await execPromise('npm install');
      stdoutLogs += `[npm install stdout]\n${stdout}\n`;
      if (stderr) {
        stderrLogs += `[npm install stderr]\n${stderr}\n`;
      }
    } catch (err: any) {
      console.error('Update npm install error:', err);
      stdoutLogs += `[npm install failed]\n`;
      stderrLogs += `${err.stderr || err.message}\n`;
    }

    // 3. Regenerate Prisma Client in case schema.prisma changed
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

    // 4. Run npm run build to compile the Next.js bundle
    try {
      const { stdout, stderr } = await execPromise('npm run build');
      stdoutLogs += `[npm run build stdout]\n${stdout}\n`;
      if (stderr) {
        stderrLogs += `[npm run build stderr]\n${stderr}\n`;
      }
    } catch (err: any) {
      console.error('Update npm run build error:', err);
      stdoutLogs += `[npm run build failed]\n`;
      stderrLogs += `${err.stderr || err.message}\n`;
    }

    // Write audit log
    await logAudit({
      userId: session.userId as string,
      action: 'SYSTEM_UPDATE_PULL_AND_BUILD',
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
