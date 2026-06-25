'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { 
  History, 
  Search, 
  Loader2, 
  Calendar, 
  Monitor, 
  User, 
  ChevronDown, 
  ChevronRight,
  ShieldCheck,
  ShieldAlert
} from 'lucide-react';

interface AuditUser {
  email: string;
  name: string | null;
}

interface AuditLog {
  id: string;
  userId: string | null;
  action: string;
  ipAddress: string | null;
  metadata: string | null; // stored as JSON string in SQLite
  timestamp: string;
  user: AuditUser | null;
}

export default function LogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/logs');
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedLogId(expandedLogId === id ? null : id);
  };

  const filteredLogs = logs.filter(log => {
    const query = searchQuery.toLowerCase();
    const matchesAction = log.action.toLowerCase().includes(query);
    const matchesIp = (log.ipAddress || '').toLowerCase().includes(query);
    const matchesUser = log.user 
      ? log.user.email.toLowerCase().includes(query) || (log.user.name || '').toLowerCase().includes(query)
      : 'system'.includes(query);
    return matchesAction || matchesIp || matchesUser;
  });

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="relative max-w-md w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <Input
          placeholder="Filter logs by action, actor, or IP address..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="bg-slate-900/60 border-slate-800 focus:border-indigo-500 text-white placeholder-slate-500 pl-10"
        />
      </div>

      <Card className="border-slate-900 bg-slate-900/40 backdrop-blur-md">
        <CardHeader className="border-b border-slate-900 pb-4">
          <div className="flex items-center space-x-2 text-indigo-400">
            <History className="w-5 h-5" />
            <CardTitle className="text-base font-bold text-white">Security Audit Log</CardTitle>
          </div>
          <CardDescription className="text-xs text-slate-400">
            Comprehensive audit trailing of all configuration changes, authentication operations, and document views.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-24 text-slate-500">
              <History className="w-12 h-12 text-slate-700 mx-auto mb-3" />
              <p className="text-sm font-semibold">No audit logs found</p>
            </div>
          ) : (
            <Table>
              <TableHeader className="border-slate-800">
                <TableRow className="hover:bg-transparent border-slate-800">
                  <TableHead className="w-6"></TableHead>
                  <TableHead className="text-slate-400 text-xs uppercase font-bold pl-2">Timestamp</TableHead>
                  <TableHead className="text-slate-400 text-xs uppercase font-bold">Action Event</TableHead>
                  <TableHead className="text-slate-400 text-xs uppercase font-bold">Actor</TableHead>
                  <TableHead className="text-slate-400 text-xs uppercase font-bold">IP Address</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => {
                  const isExpanded = expandedLogId === log.id;
                  const isSuspicious = log.action.includes('FAIL') || log.action.includes('DELETE') || log.action.includes('REJECT');
                  
                  return (
                    <React.Fragment key={log.id}>
                      <TableRow 
                        onClick={() => toggleExpand(log.id)}
                        className="border-slate-800/50 hover:bg-slate-800/20 cursor-pointer transition-all"
                      >
                        <TableCell className="pl-4 py-4 w-6">
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-slate-500" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-slate-500" />
                          )}
                        </TableCell>
                        <TableCell className="pl-2">
                          <div className="flex items-center space-x-1.5 text-xs text-slate-400">
                            <Calendar className="w-3.5 h-3.5 text-slate-650" />
                            <span>{new Date(log.timestamp).toLocaleString()}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={`
                            inline-flex items-center space-x-1 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border
                            ${isSuspicious 
                              ? 'bg-red-500/10 text-red-400 border-red-500/20' 
                              : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'}
                          `}>
                            {isSuspicious ? <ShieldAlert className="w-3 h-3 mr-1" /> : <ShieldCheck className="w-3 h-3 mr-1" />}
                            <span>{log.action.replace(/_/g, ' ')}</span>
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2 text-xs">
                            <User className="w-3.5 h-3.5 text-slate-500" />
                            <span className="font-semibold text-slate-200">
                              {log.user ? log.user.name || log.user.email : 'System'}
                            </span>
                            {log.user && (
                              <span className="text-[10px] text-slate-500">({log.user.email})</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-1.5 text-xs text-slate-400">
                            <Monitor className="w-3.5 h-3.5 text-slate-605" />
                            <span>{log.ipAddress || '127.0.0.1'}</span>
                          </div>
                        </TableCell>
                      </TableRow>
                      
                      {isExpanded && (
                        <TableRow className="bg-slate-950/60 hover:bg-slate-950/60 border-slate-800">
                          <TableCell colSpan={5} className="pl-12 pr-6 py-4">
                            <div className="space-y-2">
                              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Log Metadata Payload</p>
                              <pre className="p-4 bg-slate-950 border border-slate-850 rounded-lg text-xs font-mono text-indigo-400 overflow-x-auto max-w-full">
                                {log.metadata ? JSON.stringify(JSON.parse(log.metadata), null, 2) : 'No metadata payload.'}
                              </pre>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
