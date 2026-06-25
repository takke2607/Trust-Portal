'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  KeyRound, 
  Check, 
  X, 
  Copy, 
  Loader2, 
  Calendar, 
  Mail, 
  FileText,
  Clock,
  Link as LinkIcon,
  Trash2
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';

interface RequestDocument {
  name: string;
  projectId: string;
  versions: { id: string }[];
}

interface AccessRequest {
  id: string;
  requesterEmail: string;
  reason: string | null;
  documentId: string;
  status: string; // PENDING, APPROVED, REJECTED
  token: string | null;
  expiresAt: string | null;
  createdAt: string;
  document: RequestDocument;
}

export default function AccessRequestsPage() {
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

  const handleDeleteRequest = async (id: string) => {
    setActionLoadingId(id);
    try {
      const res = await fetch(`/api/requests/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchRequests();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/requests');
      if (res.ok) {
        const data = await res.json();
        setRequests(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleAction = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    setActionLoadingId(id);
    try {
      const res = await fetch(`/api/requests/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        fetchRequests();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const getMagicLink = (req: AccessRequest) => {
    if (!req.token || !req.document.versions[0] || !req.document.projectId) return '';
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    return `${origin}/trust-center/projects/${req.document.projectId}?versionId=${req.document.versions[0].id}&token=${req.token}`;
  };

  const copyToClipboard = (req: AccessRequest) => {
    const link = getMagicLink(req);
    if (!link) return;
    navigator.clipboard.writeText(link);
    setCopiedId(req.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      <Card className="border-slate-900 bg-slate-900/40 backdrop-blur-md">
        <CardHeader className="border-b border-slate-900 pb-4">
          <div className="flex items-center space-x-2 text-indigo-400">
            <KeyRound className="w-5 h-5" />
            <CardTitle className="text-base font-bold text-white">Secure Access Requests</CardTitle>
          </div>
          <CardDescription className="text-xs text-slate-400">
            Review and approve customer access requests for restricted SOC 2 / private compliance documentation.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-24 text-slate-500">
              <KeyRound className="w-12 h-12 text-slate-700 mx-auto mb-3" />
              <p className="text-sm font-semibold">No access requests</p>
              <p className="text-xs text-slate-600 mt-1">Pending customer access requests will appear here.</p>
            </div>
          ) : (
            <Table>
              <TableHeader className="border-slate-800">
                <TableRow className="hover:bg-transparent border-slate-800">
                  <TableHead className="text-slate-400 text-xs uppercase font-bold pl-6">Requester</TableHead>
                  <TableHead className="text-slate-400 text-xs uppercase font-bold">Document Requested</TableHead>
                  <TableHead className="text-slate-400 text-xs uppercase font-bold">Reason for Access</TableHead>
                  <TableHead className="text-slate-400 text-xs uppercase font-bold">Status</TableHead>
                  <TableHead className="text-slate-400 text-xs uppercase font-bold">Expires At</TableHead>
                  <TableHead className="text-slate-400 text-xs uppercase font-bold text-right pr-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((req) => (
                  <TableRow key={req.id} className="border-slate-800/50 hover:bg-slate-800/20">
                    <TableCell className="pl-6 py-4">
                      <div className="flex items-center space-x-2">
                        <Mail className="w-4 h-4 text-slate-500 shrink-0" />
                        <span className="text-sm font-medium text-white">{req.requesterEmail}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2 text-xs">
                        <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
                        <span className="font-semibold text-slate-200">{req.document.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-xs text-slate-400">
                      {req.reason || <span className="text-slate-600">None provided</span>}
                    </TableCell>
                    <TableCell>
                      <span className={`
                        px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider
                        ${req.status === 'PENDING' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 
                          req.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
                          'bg-red-500/10 text-red-400 border border-red-500/20'}
                      `}>
                        {req.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-slate-400">
                      {req.expiresAt ? (
                        <div className="flex items-center space-x-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          <span>{new Date(req.expiresAt).toLocaleDateString()}</span>
                        </div>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right pr-6 py-4 whitespace-nowrap">
                      {actionLoadingId === req.id ? (
                        <div className="flex items-center justify-end">
                          <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                        </div>
                      ) : (
                        <div className="flex items-center justify-end space-x-2">
                          {req.status === 'PENDING' && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleAction(req.id, 'APPROVED')}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white flex items-center space-x-1 text-xs py-1 h-8 cursor-pointer"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Approve</span>
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleAction(req.id, 'REJECTED')}
                                className="bg-red-950/20 border border-red-500/20 text-red-400 hover:bg-red-900/30 text-xs py-1 h-8 cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>Reject</span>
                              </Button>
                            </>
                          )}
                          {req.status === 'APPROVED' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => copyToClipboard(req)}
                              className="border-slate-800 hover:bg-slate-800 text-indigo-400 hover:text-indigo-300 text-xs py-1 h-8 cursor-pointer"
                            >
                              {copiedId === req.id ? (
                                <span className="text-emerald-400 flex items-center space-x-1">
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Copied!</span>
                                </span>
                              ) : (
                                <span className="flex items-center space-x-1">
                                  <Copy className="w-3.5 h-3.5" />
                                  <span>Copy Link</span>
                                </span>
                              )}
                            </Button>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => triggerConfirm(
                              'Delete Access Request',
                              `Are you sure you want to delete the access request from "${req.requesterEmail}"? This will immediately invalidate/decompose any active magic links for this request.`,
                              () => handleDeleteRequest(req.id)
                            )}
                            className="h-8 w-8 text-slate-400 hover:text-red-400 hover:bg-slate-800 cursor-pointer"
                            title="Delete Request"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

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
  );
}
