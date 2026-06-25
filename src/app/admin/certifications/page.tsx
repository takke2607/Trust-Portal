'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Shield, 
  Plus, 
  Trash2, 
  Edit, 
  Loader2, 
  X
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Certification {
  id: string;
  name: string;
  description: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export default function CertificationsPage() {
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Form states
  const [modalAction, setModalAction] = useState<'create' | 'edit'>('create');
  const [selectedCert, setSelectedCert] = useState<Certification | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('Certified');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchCertifications = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/certifications');
      if (res.ok) {
        const data = await res.json();
        setCertifications(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCertifications();
  }, []);

  const openCreateModal = () => {
    setModalAction('create');
    setSelectedCert(null);
    setName('');
    setDescription('');
    setStatus('Certified');
    setError('');
    setModalOpen(true);
  };

  const openEditModal = (cert: Certification) => {
    setModalAction('edit');
    setSelectedCert(cert);
    setName(cert.name);
    setDescription(cert.description || '');
    setStatus(cert.status);
    setError('');
    setModalOpen(true);
  };

  const openDeleteDialog = (cert: Certification) => {
    setSelectedCert(cert);
    setDeleteDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !status) {
      setError('Name and Status are required');
      return;
    }

    setSaving(true);
    setError('');

    try {
      let res;
      if (modalAction === 'create') {
        res = await fetch('/api/certifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, description, status })
        });
      } else {
        if (!selectedCert) return;
        res = await fetch(`/api/certifications/${selectedCert.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, description, status })
        });
      }

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Operation failed');
      } else {
        setModalOpen(false);
        fetchCertifications();
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedCert) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/certifications/${selectedCert.id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setDeleteDialogOpen(false);
        fetchCertifications();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to delete certification');
      }
    } catch (err) {
      console.error(err);
      setError('An error occurred during deletion');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-indigo-400">
            <Shield className="w-5 h-5" />
            <h1 className="text-base font-bold text-white">Organizational Certifications</h1>
          </div>
          <p className="text-slate-400 text-xs mt-1">
            Manage public-facing security, privacy, and compliance certifications (e.g. ISO 27001, SOC 2).
          </p>
        </div>
        <Button onClick={openCreateModal} className="bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer shrink-0">
          <Plus className="w-4 h-4 mr-2" />
          Add Certification
        </Button>
      </div>

      <Card className="border-slate-900 bg-slate-900/40 backdrop-blur-md">
        <CardHeader>
          <CardTitle className="text-sm font-bold text-white">Active Frameworks & Badges</CardTitle>
          <CardDescription className="text-slate-400 text-xs">
            Certifications currently listed on the public dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            </div>
          ) : certifications.length === 0 ? (
            <div className="text-center py-16 text-slate-500">
              <Shield className="w-12 h-12 text-slate-700 mx-auto mb-3" />
              <p className="text-sm font-semibold">No certifications added</p>
              <p className="text-xs text-slate-650 mt-1">Click Add Certification to list your first standard.</p>
            </div>
          ) : (
            <Table>
              <TableHeader className="border-slate-800 bg-slate-950/40">
                <TableRow className="hover:bg-transparent border-slate-800">
                  <TableHead className="text-slate-400 font-bold pl-6">Name</TableHead>
                  <TableHead className="text-slate-400 font-bold">Description</TableHead>
                  <TableHead className="text-slate-400 font-bold">Status Badge</TableHead>
                  <TableHead className="text-slate-400 font-bold text-right pr-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {certifications.map((cert) => (
                  <TableRow key={cert.id} className="border-slate-800/60 hover:bg-slate-800/10">
                    <TableCell className="pl-6 py-4 font-semibold text-white">
                      {cert.name}
                    </TableCell>
                    <TableCell className="text-slate-400 max-w-xs truncate">
                      {cert.description || 'No description provided'}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <span className="h-1.5 w-1.5 bg-emerald-400 rounded-full mr-1.5"></span>
                        {cert.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right pr-6 space-x-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => openEditModal(cert)}
                        className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                        title="Edit Certification"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => openDeleteDialog(cert)}
                        className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-950/20 cursor-pointer"
                        title="Delete Certification"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* CREATE / EDIT DIALOG */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white text-lg font-bold">
              {modalAction === 'create' ? 'Add Certification' : 'Edit Certification'}
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              Fill in the details for the compliance framework or standard.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium rounded-lg">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="cert-name" className="text-slate-200 font-semibold text-xs uppercase tracking-wide">
                Certification Name *
              </Label>
              <Input
                id="cert-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. ISO/IEC 27001, SOC 2 Type II"
                className="bg-slate-950 border-slate-800 text-white focus:border-indigo-500 focus:ring-indigo-500"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cert-desc" className="text-slate-200 font-semibold text-xs uppercase tracking-wide">
                Description / Details
              </Label>
              <Input
                id="cert-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Information Security Management System"
                className="bg-slate-950 border-slate-800 text-white focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cert-status" className="text-slate-200 font-semibold text-xs uppercase tracking-wide">
                Status Badge *
              </Label>
              <Select value={status} onValueChange={(val) => setStatus(val || 'Certified')}>
                <SelectTrigger id="cert-status" className="bg-slate-950 border-slate-800 text-white">
                  <SelectValue placeholder="Select status badge" />
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false} className="bg-slate-950 border-slate-800 text-white">
                  <SelectItem value="Certified" className="hover:bg-slate-900 focus:bg-slate-900 cursor-pointer">Certified</SelectItem>
                  <SelectItem value="Audited" className="hover:bg-slate-900 focus:bg-slate-900 cursor-pointer">Audited</SelectItem>
                  <SelectItem value="Compliant" className="hover:bg-slate-900 focus:bg-slate-900 cursor-pointer">Compliant</SelectItem>
                  <SelectItem value="Aligned" className="hover:bg-slate-900 focus:bg-slate-900 cursor-pointer">Aligned</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-4 border-t border-slate-850">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer hover:bg-slate-800"
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer"
                disabled={saving}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRM DIALOG */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white text-lg font-bold flex items-center space-x-2">
              <X className="w-5 h-5 text-red-500" />
              <span>Delete Certification</span>
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-xs mt-2">
              Are you sure you want to delete <span className="text-white font-bold">{selectedCert?.name}</span>? This action is permanent and will remove it from the public homepage.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-4 space-x-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDeleteDialogOpen(false)}
              className="text-slate-400 hover:text-white cursor-pointer hover:bg-slate-800"
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-500 text-white cursor-pointer"
              disabled={saving}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
