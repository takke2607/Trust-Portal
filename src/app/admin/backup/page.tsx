'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Database, 
  Download, 
  Upload, 
  Plus, 
  Loader2, 
  Calendar, 
  HardDrive, 
  AlertTriangle,
  CheckCircle,
  FileArchive,
  Trash2
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';

interface BackupRecord {
  id: string;
  fileName: string;
  filePath: string;
  status: string;
  createdAt: string;
}

export default function BackupPage() {
  const [backups, setBackups] = useState<BackupRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [backingUp, setBackingUp] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [resetting, setResetting] = useState(false);

  const handleResetPortal = () => {
    triggerConfirm(
      "FACTORY RESET PORTAL",
      "WARNING: This will permanently delete all projects, folders, compliance documents, backups, and access requests. This action is irreversible. Do you want to proceed?",
      async () => {
        setResetting(true);
        try {
          const res = await fetch('/api/backup?action=reset', {
            method: 'POST'
          });
          if (res.ok) {
            alert('Portal reset successfully. Reloading page...');
            window.location.reload();
          } else {
            const data = await res.json();
            alert(data.error || 'Reset failed');
          }
        } catch (err) {
          console.error(err);
        } finally {
          setResetting(false);
        }
      }
    );
  };

  // Confirmation dialog state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState('');
  const [confirmDescription, setConfirmDescription] = useState('');
  const [onConfirm, setOnConfirm] = useState<() => void>(() => {});

  const triggerConfirm = (title: string, description: string, action: () => void) => {
    setConfirmTitle(title);
    setConfirmDescription(description);
    setOnConfirm(() => action);
    setConfirmOpen(true);
  };

  const fetchBackups = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/backup');
      if (res.ok) {
        const data = await res.json();
        setBackups(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBackups();
  }, []);

  const handleCreateBackup = async () => {
    setBackingUp(true);
    try {
      const res = await fetch('/api/backup?action=backup', { method: 'POST' });
      if (res.ok) {
        fetchBackups();
        alert('Backup created successfully');
      } else {
        const data = await res.json();
        alert(data.error || 'Backup failed');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setBackingUp(false);
    }
  };

  const handleRestoreSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restoreFile) return;

    triggerConfirm(
      "Restore System Backup",
      "WARNING: Restoring will overwrite all current folders, compliance documents, and user sessions. Do you want to proceed?",
      async () => {
        setRestoring(true);
        try {
          const formData = new FormData();
          formData.append('file', restoreFile);

          const res = await fetch('/api/backup?action=restore', {
            method: 'POST',
            body: formData
          });

          if (res.ok) {
            setRestoreFile(null);
            alert('System restored successfully. Reloading session...');
            window.location.reload();
          } else {
            const data = await res.json();
            alert(data.error || 'Restore failed');
          }
        } catch (err) {
          console.error(err);
        } finally {
          setRestoring(false);
        }
      }
    );
  };

  return (
    <div className="space-y-6">
      {/* Warning callout */}
      <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-start space-x-3">
        <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-sm font-bold">Disaster Recovery Protocol</p>
          <p className="text-xs text-amber-500/80">
            Backups contain absolute dumps of the database registry and all version-controlled document files on disk. Keep downloads secured. Overwriting database files during restore drops active sessions.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Actions panel */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-slate-900 bg-slate-900/40 backdrop-blur-md">
            <CardHeader>
              <CardTitle className="text-base font-bold text-white">Trigger Actions</CardTitle>
              <CardDescription className="text-xs text-slate-400">Generate packages or import nodes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Backup Generation */}
              <div className="space-y-2">
                <Label className="text-slate-300">Generate Single Backup Package</Label>
                <Button
                  onClick={handleCreateBackup}
                  disabled={backingUp || restoring}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center space-x-2 cursor-pointer h-10"
                >
                  {backingUp ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Packaging System...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>Generate Full Backup (.zip)</span>
                    </>
                  )}
                </Button>
              </div>

              <hr className="border-slate-800" />

              {/* Restore Trigger */}
              <form onSubmit={handleRestoreSubmit} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="restore-upload" className="text-slate-300">Restore from Backup Package</Label>
                  <Input
                    id="restore-upload"
                    type="file"
                    accept=".zip"
                    onChange={(e) => setRestoreFile(e.target.files?.[0] || null)}
                    disabled={backingUp || restoring}
                    className="bg-slate-950/60 border-slate-800 text-white text-xs"
                    required
                  />
                </div>
                <Button
                  type="submit"
                  disabled={!restoreFile || backingUp || restoring}
                  className="w-full bg-teal-600 hover:bg-teal-500 text-white flex items-center justify-center space-x-2 cursor-pointer h-10"
                >
                  {restoring ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Extracting & Overwriting...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      <span>Run System Restore</span>
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-red-950 bg-red-950/5 border-red-500/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold text-red-400 flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <span>Danger Zone</span>
              </CardTitle>
              <CardDescription className="text-[10px] text-red-500/70">
                Destructive administrative operations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label className="text-slate-350 text-[11px] font-semibold">Reset Portal to Factory Defaults</Label>
                <p className="text-[10px] text-red-400/80 leading-normal mb-1.5">
                  Wipes all projects, directories, compliance records, backups, access requests, and audit logs. Active administrator credentials remain.
                </p>
                <Button
                  type="button"
                  onClick={handleResetPortal}
                  disabled={backingUp || restoring || resetting}
                  className="w-full bg-red-650 hover:bg-red-550 text-white flex items-center justify-center space-x-2 cursor-pointer h-10 text-xs font-bold"
                >
                  {resetting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                      <span>Resetting Portal...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 shrink-0" />
                      <span>Factory Reset Portal</span>
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Backups list table */}
        <div className="lg:col-span-2">
          <Card className="border-slate-900 bg-slate-900/40 backdrop-blur-md">
            <CardHeader className="pb-4 border-b border-slate-900">
              <div className="flex items-center space-x-2 text-indigo-400">
                <Database className="w-5 h-5" />
                <CardTitle className="text-base font-bold text-white">Available Backups</CardTitle>
              </div>
              <CardDescription className="text-xs text-slate-400">Archives stored inside local packages directory</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-24">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                </div>
              ) : backups.length === 0 ? (
                <div className="text-center py-24 text-slate-500">
                  <FileArchive className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                  <p className="text-sm font-semibold">No backups generated</p>
                </div>
              ) : (
                <Table>
                  <TableHeader className="border-slate-800">
                    <TableRow className="hover:bg-transparent border-slate-800">
                      <TableHead className="text-slate-400 text-xs uppercase font-bold pl-6">Filename</TableHead>
                      <TableHead className="text-slate-400 text-xs uppercase font-bold">Generated</TableHead>
                      <TableHead className="text-slate-400 text-xs uppercase font-bold">Status</TableHead>
                      <TableHead className="text-slate-400 text-xs uppercase font-bold text-right pr-6">Download</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {backups.map((b) => (
                      <TableRow key={b.id} className="border-slate-800/50 hover:bg-slate-800/20">
                        <TableCell className="pl-6 py-4 font-mono text-xs max-w-xs truncate text-slate-200">
                          {b.fileName}
                        </TableCell>
                        <TableCell className="text-xs text-slate-400">
                          <div className="flex items-center space-x-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-500" />
                            <span>{new Date(b.createdAt).toLocaleString()}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={`
                            px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider inline-flex items-center space-x-1
                            ${b.status === 'SUCCESS' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}
                          `}>
                            {b.status === 'SUCCESS' ? <CheckCircle className="w-3 h-3 mr-1" /> : null}
                            <span>{b.status}</span>
                          </span>
                        </TableCell>
                        <TableCell className="text-right pr-6 py-4">
                          <a
                            href={`/api/backup?download=${b.id}`}
                            className="inline-flex items-center justify-center p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded transition-all cursor-pointer"
                            title="Download ZIP"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      {/* --- CONFIRMATION DIALOG --- */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white text-lg font-bold">{confirmTitle}</DialogTitle>
            <DialogDescription className="text-slate-400">
              {confirmDescription}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setConfirmOpen(false)}
              className="border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              variant="destructive"
              onClick={() => {
                onConfirm();
                setConfirmOpen(false);
              }}
              className="bg-red-650 hover:bg-red-550 text-white cursor-pointer"
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  </div>
);
}
