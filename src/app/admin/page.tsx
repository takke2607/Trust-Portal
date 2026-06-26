import React from 'react';
import Link from 'next/link';
import prisma from '@/lib/db';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { 
  FolderTree, 
  FileText, 
  KeyRound, 
  Database, 
  Plus, 
  Upload, 
  UserCheck, 
  ChevronRight,
  ShieldAlert,
  Clock
} from 'lucide-react';
import { getUserFromSession } from '@/lib/auth';

export const revalidate = 0; // Disable caching to fetch live stats on every reload

export default async function AdminDashboardPage() {
  const user = await getUserFromSession();
  const isAdmin = user?.role === 'ADMIN';

  // Fetch metrics in parallel
  const [projectCount, documentCount, pendingRequestsCount, lastBackup, recentLogs] = await Promise.all([
    prisma.project.count(),
    prisma.document.count({ where: { isDeleted: false } }),
    prisma.accessRequest.count({ where: { status: 'PENDING' } }),
    prisma.backupRecord.findFirst({ orderBy: { createdAt: 'desc' } }),
    prisma.auditLog.findMany({
      take: 5,
      orderBy: { timestamp: 'desc' },
      include: {
        user: {
          select: { name: true, email: true }
        }
      }
    })
  ]);

  const stats = [
    { name: 'Active Frameworks', value: projectCount, icon: FolderTree, color: 'text-indigo-400', bg: 'bg-indigo-500/5' },
    { name: 'Documents Indexed', value: documentCount, icon: FileText, color: 'text-emerald-400', bg: 'bg-emerald-500/5' },
    { name: 'Pending Access Requests', value: pendingRequestsCount, icon: KeyRound, color: 'text-amber-400', bg: 'bg-amber-500/5', alert: pendingRequestsCount > 0 },
    { 
      name: 'System Backup Status', 
      value: lastBackup ? (lastBackup.status === 'SUCCESS' ? 'Healthy' : 'Failed') : 'None', 
      icon: Database, 
      color: lastBackup?.status === 'SUCCESS' ? 'text-teal-400' : 'text-red-400', 
      bg: 'bg-teal-500/5' 
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="relative rounded-xl bg-slate-900 border border-slate-800 p-6 md:p-8 overflow-hidden shadow-sm">
        <div className="absolute top-0 right-0 w-24 h-24 border-b border-l border-slate-800/60 pointer-events-none opacity-40 hidden sm:block">
          <div className="w-full h-full border-b border-l border-dashed border-slate-800/40 translate-x-2 -translate-y-2" />
        </div>
        <div className="relative z-10 space-y-2">
          <div className="text-[10px] font-mono tracking-[0.12em] text-indigo-600 font-bold uppercase">
            01 — SYSTEM MANAGEMENT CONSOLE
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-100">
            Welcome back, {user?.name || 'Administrator'}!
          </h1>
          <p className="text-slate-600 text-xs md:text-sm max-w-xl leading-relaxed">
            You have full authorization to manage, review, and configure the compliance repositories, access protocols, and disaster recovery processes.
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.name} className="border-slate-900 bg-slate-900/40 backdrop-blur-md">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  {stat.alert && (
                    <span className="flex h-2.5 w-2.5 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                    </span>
                  )}
                </div>
                <div className="mt-4 space-y-1">
                  <p className="text-2xl font-bold text-white tracking-tight">{stat.value}</p>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{stat.name}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Quick Actions */}
        <Card className="border-slate-900 bg-slate-900/40 backdrop-blur-md lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base font-bold text-white">Quick Actions</CardTitle>
            <CardDescription className="text-slate-400">Common management commands</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link 
              href="/admin/projects"
              className="flex items-center justify-between p-3 rounded-lg bg-slate-900/60 border border-slate-800 hover:border-indigo-500/40 hover:bg-slate-800/40 text-slate-300 hover:text-white transition-all group"
            >
              <div className="flex items-center space-x-3">
                <Plus className="w-4 h-4 text-indigo-400" />
                <span className="text-sm font-medium">Create Compliance Project</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:translate-x-0.5 transition-transform" />
            </Link>

            <Link 
              href="/admin/documents"
              className="flex items-center justify-between p-3 rounded-lg bg-slate-900/60 border border-slate-800 hover:border-emerald-500/40 hover:bg-slate-800/40 text-slate-300 hover:text-white transition-all group"
            >
              <div className="flex items-center space-x-3">
                <Upload className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-medium">Upload Compliance Document</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:translate-x-0.5 transition-transform" />
            </Link>

            <Link 
              href="/admin/requests"
              className="flex items-center justify-between p-3 rounded-lg bg-slate-900/60 border border-slate-800 hover:border-amber-500/40 hover:bg-slate-800/40 text-slate-300 hover:text-white transition-all group"
            >
              <div className="flex items-center space-x-3">
                <UserCheck className="w-4 h-4 text-amber-400" />
                <span className="text-sm font-medium">Review Access Requests</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:translate-x-0.5 transition-transform" />
            </Link>

            {isAdmin && (
              <Link 
                href="/admin/backup"
                className="flex items-center justify-between p-3 rounded-lg bg-slate-900/60 border border-slate-800 hover:border-teal-500/40 hover:bg-slate-800/40 text-slate-300 hover:text-white transition-all group"
              >
                <div className="flex items-center space-x-3">
                  <Database className="w-4 h-4 text-teal-400" />
                  <span className="text-sm font-medium">Manage System Backups</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            )}
          </CardContent>
        </Card>

        {/* Recent Audit Logs */}
        <Card className="border-slate-900 bg-slate-900/40 backdrop-blur-md lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-white">Recent Security Activity</CardTitle>
              <CardDescription className="text-slate-400">Live feed of authentication & operations</CardDescription>
            </div>
            {isAdmin && (
              <Link 
                href="/admin/logs"
                className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                View all logs
              </Link>
            )}
          </CardHeader>
          <CardContent>
            {recentLogs.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-sm">
                No recent security activity logged.
              </div>
            ) : (
              <div className="flow-root">
                <ul className="-my-5 divide-y divide-slate-800/50">
                  {recentLogs.map((log) => (
                    <li key={log.id} className="py-4">
                      <div className="flex items-center space-x-4">
                        <div className={`p-2 rounded-lg bg-slate-900 border border-slate-800`}>
                          {log.action.includes('FAIL') || log.action.includes('DELETE') ? (
                            <ShieldAlert className="w-4 h-4 text-red-400" />
                          ) : (
                            <Clock className="w-4 h-4 text-indigo-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">
                            {log.action.replace(/_/g, ' ')}
                          </p>
                          <p className="text-xs text-slate-400 truncate">
                            By {log.user?.name || log.user?.email || 'System'} • IP: {log.ipAddress || 'Unknown'}
                          </p>
                        </div>
                        <div>
                          <span className="inline-flex items-center text-xs text-slate-500">
                            {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
