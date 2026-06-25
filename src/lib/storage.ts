import fs from 'fs/promises';
import path from 'path';

const UPLOAD_DIR = process.env.LOCAL_UPLOAD_DIR || './uploads';

async function ensureDir(dirPath: string) {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
  }
}

export async function saveFile(file: File): Promise<{ filePath: string; fileName: string; fileSize: number; mimeType: string }> {
  await ensureDir(UPLOAD_DIR);
  
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  
  // Use a unique name to avoid naming collisions on disk
  const cleanName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
  const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}-${cleanName}`;
  const filePath = path.join(UPLOAD_DIR, uniqueName);
  
  await fs.writeFile(filePath, buffer);
  
  return {
    filePath: path.resolve(filePath), // Store absolute path
    fileName: file.name,
    fileSize: file.size,
    mimeType: file.type || 'application/octet-stream'
  };
}

export async function deleteFile(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    console.error(`Failed to delete file at ${filePath}:`, error);
  }
}

export async function getFileBuffer(filePath: string): Promise<Buffer> {
  return await fs.readFile(filePath);
}
