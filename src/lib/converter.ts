import { execFile } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';

// Standard LibreOffice install path on Windows
const standardSofficePath = 'C:\\Program Files\\LibreOffice\\program\\soffice.exe';

export async function convertDocxToPdf(docxPath: string, cachePdfPath: string, versionId: string): Promise<string> {
  // If the cached PDF is already generated, return it
  if (existsSync(cachePdfPath)) {
    return cachePdfPath;
  }

  // Determine soffice command path
  let sofficePath = 'soffice';
  if (existsSync(standardSofficePath)) {
    sofficePath = standardSofficePath;
  }

  const outDir = path.dirname(cachePdfPath);
  const tempDocxName = `temp-${versionId}.docx`;
  const tempDocxPath = path.resolve(path.join(outDir, tempDocxName));
  const tempPdfName = `temp-${versionId}.pdf`;
  const tempPdfPath = path.resolve(path.join(outDir, tempPdfName));
  const docxAbsPath = path.resolve(docxPath);

  try {
    // Copy the original DOCX to outDir using tempDocxPath
    await fs.copyFile(docxAbsPath, tempDocxPath);
  } catch (err) {
    console.error('Failed to copy DOCX to temp path:', err);
    throw new Error('Failed to copy document to conversion workspace.');
  }

  const args = [
    '--headless',
    '--convert-to',
    'pdf',
    '--outdir',
    outDir,
    tempDocxPath
  ];

  return new Promise((resolve, reject) => {
    execFile(sofficePath, args, async (error, stdout, stderr) => {
      // Always cleanup tempDocxPath
      try {
        await fs.unlink(tempDocxPath);
      } catch (e) {
        // ignore
      }

      if (error) {
        console.error('LibreOffice execution failed:', error, stderr, stdout);
        // Cleanup tempPdfPath if exists
        try {
          await fs.unlink(tempPdfPath);
        } catch (e) {}
        return reject(new Error('Failed to convert DOCX to PDF using LibreOffice. Ensure LibreOffice is installed correctly.'));
      }

      try {
        if (existsSync(tempPdfPath)) {
          // Rename tempPdfPath to cachePdfPath
          await fs.rename(tempPdfPath, cachePdfPath);
          resolve(cachePdfPath);
        } else {
          reject(new Error('PDF output file was not found after conversion.'));
        }
      } catch (err) {
        reject(err);
      }
    });
  });
}
