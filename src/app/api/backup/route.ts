import { NextResponse } from 'next/server';
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import { ZipArchive } from 'archiver';
import unzipper from 'unzipper';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

const BACKUP_DIR = './backups';
const UPLOAD_DIR = './uploads';
const DB_FILE = './prisma/dev.db';

async function ensureDir(dirPath: string) {
  try {
    await fsp.access(dirPath);
  } catch {
    await fsp.mkdir(dirPath, { recursive: true });
  }
}

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const { searchParams } = new URL(request.url);
    const downloadId = searchParams.get('download');
    
    if (downloadId) {
      const record = await prisma.backupRecord.findUnique({
        where: { id: downloadId }
      });
      
      if (!record || !fs.existsSync(record.filePath)) {
        return new Response('Backup file not found', { status: 404 });
      }
      
      const fileBuffer = await fsp.readFile(record.filePath);
      return new Response(new Uint8Array(fileBuffer), {
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': `attachment; filename="${record.fileName}"`
        }
      });
    }
    
    const backups = await prisma.backupRecord.findMany({
      orderBy: { createdAt: 'desc' }
    });
    
    return NextResponse.json(backups);
  } catch (error) {
    console.error('Backup GET error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action'); // "backup" or "restore"
    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
    
    if (action === 'backup') {
      await ensureDir(BACKUP_DIR);
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFileName = `trust-center-backup-${timestamp}.zip`;
      const backupFilePath = path.join(BACKUP_DIR, backupFileName);
      
      const outputStream = fs.createWriteStream(backupFilePath);
      const archive = new ZipArchive({ zlib: { level: 9 } });
      
      const zipPromise = new Promise<void>((resolve, reject) => {
        outputStream.on('close', () => resolve());
        outputStream.on('error', (err: any) => reject(err));
        archive.on('error', (err: any) => reject(err));
      });
      
      archive.pipe(outputStream);
      
      if (fs.existsSync(DB_FILE)) {
        archive.file(DB_FILE, { name: 'database.db' });
      }
      
      if (fs.existsSync(UPLOAD_DIR)) {
        archive.directory(UPLOAD_DIR, 'uploads');
      }
      
      archive.finalize();
      await zipPromise;
      
      const record = await prisma.backupRecord.create({
        data: {
          fileName: backupFileName,
          filePath: path.resolve(backupFilePath),
          status: 'SUCCESS',
          createdById: session.userId as string
        }
      });
      
      await logAudit({
        userId: session.userId as string,
        action: 'BACKUP_CREATE',
        ipAddress: ip,
        metadata: { backupId: record.id, fileName: backupFileName }
      });
      
      return NextResponse.json({ success: true, backup: record });
      
    } else if (action === 'restore') {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      
      if (!file) {
        return NextResponse.json({ error: 'Backup zip file is required' }, { status: 400 });
      }
      
      await ensureDir(BACKUP_DIR);
      
      const tempZipPath = path.join(BACKUP_DIR, 'temp-restore.zip');
      const buffer = Buffer.from(await file.arrayBuffer());
      await fsp.writeFile(tempZipPath, buffer);
      
      const tempExtractDir = path.join(BACKUP_DIR, 'temp-extract');
      await ensureDir(tempExtractDir);
      
      // Extract the ZIP archive contents
      await fs.createReadStream(tempZipPath)
        .pipe(unzipper.Extract({ path: tempExtractDir }))
        .promise();
        
      const extractedDb = path.join(tempExtractDir, 'database.db');
      const extractedUploads = path.join(tempExtractDir, 'uploads');
      
      if (fs.existsSync(extractedDb)) {
        await prisma.$disconnect();
        await fsp.copyFile(extractedDb, DB_FILE);
        await prisma.$connect();
      }
      
      if (fs.existsSync(extractedUploads)) {
        await ensureDir(UPLOAD_DIR);
        const files = await fsp.readdir(extractedUploads);
        for (const f of files) {
          const src = path.join(extractedUploads, f);
          const dest = path.join(UPLOAD_DIR, f);
          await fsp.copyFile(src, dest);
        }
      }
      
      await fsp.unlink(tempZipPath);
      await fsp.rm(tempExtractDir, { recursive: true, force: true });
      
      await logAudit({
        userId: session.userId as string,
        action: 'BACKUP_RESTORE',
        ipAddress: ip,
        metadata: { fileName: file.name }
      });
      
      return NextResponse.json({ success: true });
    } else if (action === 'reset') {
      // 1. Delete all relational and schema data (except users)
      await prisma.accessRequest.deleteMany();
      await prisma.documentVersion.deleteMany();
      await prisma.tag.deleteMany();
      await prisma.document.deleteMany();
      await prisma.folder.deleteMany();
      await prisma.project.deleteMany();
      await prisma.certification.deleteMany();
      await prisma.backupRecord.deleteMany();
      await prisma.auditLog.deleteMany();
      
      // 2. Remove files inside the uploads directory
      if (fs.existsSync(UPLOAD_DIR)) {
        const files = await fsp.readdir(UPLOAD_DIR);
        for (const file of files) {
          if (file === '.gitkeep' || file === 'placeholder') continue;
          await fsp.unlink(path.join(UPLOAD_DIR, file));
        }
      }
      
      // 3. Remove files inside the backups directory
      if (fs.existsSync(BACKUP_DIR)) {
        const files = await fsp.readdir(BACKUP_DIR);
        for (const file of files) {
          if (file === '.gitkeep' || file === 'placeholder') continue;
          await fsp.unlink(path.join(BACKUP_DIR, file));
        }
      }
      
      // 4. Create a fresh audit log entry as the sole record
      await logAudit({
        userId: session.userId as string,
        action: 'PORTAL_FACTORY_RESET',
        ipAddress: ip,
        metadata: { resetAt: new Date() }
      });
      
      return NextResponse.json({ success: true });
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Backup POST error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
