'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Users, 
  Plus, 
  Trash2, 
  Edit, 
  Lock, 
  Loader2, 
  UserX, 
  UserCheck, 
  Mail, 
  ShieldCheck, 
  Check, 
  X 
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  isEnabled: boolean;
  createdAt: string;
}

export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);

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

  // Form states
  const [modalAction, setModalAction] = useState<'create' | 'edit'>('create');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('COMPLIANCE_MANAGER');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (modalAction === 'create' && !password) {
      setError('Password is required');
      return;
    }

    if (password && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      let res;
      if (modalAction === 'create') {
        res = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, name, role })
        });
      } else {
        if (!selectedUser) return;
        res = await fetch(`/api/users/${selectedUser.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, name, role })
        });
      }

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Operation failed');
      } else {
        setUserModalOpen(false);
        clearForm();
        fetchUsers();
      }
    } catch (err) {
      setError('An error occurred');
    }
  };

  const handleToggleStatus = async (user: User) => {
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isEnabled: !user.isEnabled })
      });
      if (res.ok) {
        fetchUsers();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update status');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!selectedUser) return;

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      const res = await fetch(`/api/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });

      if (res.ok) {
        setResetPasswordOpen(false);
        clearForm();
        alert('Password reset successfully');
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to reset password');
      }
    } catch (err) {
      setError('An error occurred');
    }
  };

  const handleDeleteUser = async (user: User) => {
    triggerConfirm(
      "Delete User Account",
      `Are you sure you want to permanently delete user "${user.name || user.email}"? This action cannot be undone.`,
      async () => {
        try {
          const res = await fetch(`/api/users/${user.id}`, { method: 'DELETE' });
          if (res.ok) {
            fetchUsers();
          } else {
            const data = await res.json();
            alert(data.error || 'Failed to delete user');
          }
        } catch (err) {
          console.error(err);
        }
      }
    );
  };

  const clearForm = () => {
    setSelectedUser(null);
    setEmail('');
    setName('');
    setRole('COMPLIANCE_MANAGER');
    setPassword('');
    setConfirmPassword('');
    setError('');
  };

  return (
    <div className="space-y-6">
      <Card className="border-slate-900 bg-slate-900/40 backdrop-blur-md">
        <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-slate-900">
          <div>
            <div className="flex items-center space-x-2 text-indigo-400">
              <Users className="w-5 h-5" />
              <CardTitle className="text-base font-bold text-white">User Accounts</CardTitle>
            </div>
            <CardDescription className="text-xs text-slate-400">Manage admins and compliance managers.</CardDescription>
          </div>
          <Button
            size="sm"
            onClick={() => {
              setModalAction('create');
              clearForm();
              setUserModalOpen(true);
            }}
            className="bg-indigo-600 hover:bg-indigo-500 text-white flex items-center space-x-1.5 text-xs px-2.5 h-8 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add User</span>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-24 text-slate-500">
              <Users className="w-12 h-12 text-slate-700 mx-auto mb-3" />
              <p className="text-sm font-semibold">No users registered</p>
            </div>
          ) : (
            <Table>
              <TableHeader className="border-slate-800">
                <TableRow className="hover:bg-transparent border-slate-800">
                  <TableHead className="text-slate-400 text-xs uppercase font-bold pl-6">Name / Details</TableHead>
                  <TableHead className="text-slate-400 text-xs uppercase font-bold">Email</TableHead>
                  <TableHead className="text-slate-400 text-xs uppercase font-bold">Role</TableHead>
                  <TableHead className="text-slate-400 text-xs uppercase font-bold">Status</TableHead>
                  <TableHead className="text-slate-400 text-xs uppercase font-bold">Created</TableHead>
                  <TableHead className="text-slate-400 text-xs uppercase font-bold text-right pr-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id} className="border-slate-800/50 hover:bg-slate-800/20">
                    <TableCell className="pl-6 py-4">
                      <span className="text-sm font-bold text-white tracking-wide">{u.name || 'No Name'}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2 text-xs">
                        <Mail className="w-4 h-4 text-slate-500 shrink-0" />
                        <span className="text-slate-200">{u.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`
                        px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider
                        ${u.role === 'ADMIN' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}
                      `}>
                        {u.role === 'ADMIN' ? 'Admin' : 'Manager'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => handleToggleStatus(u)}
                        className={`
                          inline-flex items-center space-x-1.5 px-2.5 py-1 rounded text-xs font-semibold cursor-pointer border
                          ${u.isEnabled 
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-950/20' 
                            : 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-950/20'}
                        `}
                        title={u.isEnabled ? 'Click to Disable' : 'Click to Enable'}
                      >
                        {u.isEnabled ? <UserCheck className="w-3.5 h-3.5" /> : <UserX className="w-3.5 h-3.5" />}
                        <span>{u.isEnabled ? 'Active' : 'Disabled'}</span>
                      </button>
                    </TableCell>
                    <TableCell className="text-xs text-slate-400">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right pr-6 py-4 whitespace-nowrap">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          onClick={() => {
                            setModalAction('edit');
                            setSelectedUser(u);
                            setEmail(u.email);
                            setName(u.name || '');
                            setRole(u.role);
                            setUserModalOpen(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded transition-all cursor-pointer"
                          title="Edit User Info"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedUser(u);
                            setPassword('');
                            setConfirmPassword('');
                            setError('');
                            setResetPasswordOpen(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded transition-all cursor-pointer"
                          title="Reset Password"
                        >
                          <Lock className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(u)}
                          className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded transition-all cursor-pointer"
                          title="Delete User"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* --- ADD/EDIT USER DIALOG --- */}
      <Dialog open={userModalOpen} onOpenChange={setUserModalOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white text-lg font-bold">
              {modalAction === 'create' ? 'Add User Account' : 'Edit User Info'}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Configure system roles and identity parameters.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUserSubmit} className="space-y-4 pt-2">
            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="u-email" className="text-slate-300">Email Address</Label>
              <Input
                id="u-email"
                type="email"
                placeholder="manager@trustcenter.local"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-slate-950/60 border-slate-800 focus:border-indigo-500 text-white placeholder-slate-650"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="u-realname" className="text-slate-300">Full Name</Label>
              <Input
                id="u-realname"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-slate-950/60 border-slate-800 focus:border-indigo-500 text-white placeholder-slate-650"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">System Role</Label>
              <Select value={role} onValueChange={(val) => setRole(val || 'COMPLIANCE_MANAGER')}>
                <SelectTrigger className="bg-slate-950/60 border-slate-800 text-white">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false} className="bg-slate-900 border-slate-800 text-white">
                  <SelectItem value="ADMIN" className="focus:bg-slate-800">Admin</SelectItem>
                  <SelectItem value="COMPLIANCE_MANAGER" className="focus:bg-slate-800">Compliance Manager</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {modalAction === 'create' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="u-pass" className="text-slate-300">Password</Label>
                  <Input
                    id="u-pass"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-slate-950/60 border-slate-800 focus:border-indigo-500 text-white"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="u-conf" className="text-slate-300">Confirm Password</Label>
                  <Input
                    id="u-conf"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="bg-slate-950/60 border-slate-800 focus:border-indigo-500 text-white"
                    required
                  />
                </div>
              </div>
            )}
            <DialogFooter className="pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setUserModalOpen(false)}
                className="border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer">
                {modalAction === 'create' ? 'Create Account' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* --- RESET PASSWORD DIALOG --- */}
      <Dialog open={resetPasswordOpen} onOpenChange={setResetPasswordOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100">
          <DialogHeader>
            <DialogTitle className="text-white text-lg font-bold">Reset Password</DialogTitle>
            <DialogDescription className="text-slate-400">
              Reset password for user &quot;{selectedUser?.name || selectedUser?.email}&quot;.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleResetPassword} className="space-y-4 pt-2">
            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="rp-pass" className="text-slate-300">New Password</Label>
              <Input
                id="rp-pass"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-slate-950/60 border-slate-800 focus:border-indigo-500 text-white"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rp-conf" className="text-slate-300">Confirm Password</Label>
              <Input
                id="rp-conf"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="bg-slate-950/60 border-slate-800 focus:border-indigo-500 text-white"
                required
              />
            </div>
            <DialogFooter className="pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setResetPasswordOpen(false)}
                className="border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer">Reset Password</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
