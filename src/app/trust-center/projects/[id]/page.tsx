'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { 
  ShieldCheck, 
  Search, 
  Eye, 
  Lock, 
  FolderOpen, 
  ArrowLeft, 
  ChevronRight, 
  ChevronDown,
  FileText, 
  Loader2, 
  Globe, 
  Tag, 
  KeyRound,
  ExternalLink,
  FileCode,
  AlertCircle,
  X,
  Download
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface Project {
  id: string;
  name: string;
  description: string | null;
  isPublic: boolean;
}

interface DBFolder {
  id: string;
  name: string;
  projectId: string;
  parentId: string | null;
}

interface DBTag {
  id: string;
  name: string;
}

interface DocumentVersion {
  id: string;
  versionNumber: number;
  filePath?: string;
  fileSize: number;
  mimeType: string;
  createdAt: string;
}

interface Document {
  id: string;
  name: string;
  description: string | null;
  projectId: string;
  folderId: string | null;
  isPublicApproved: boolean;
  isDeleted: boolean;
  tags: DBTag[];
  versions: DocumentVersion[];
}

function PublicProjectDocumentsContent({ params }: { params: { id: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // URL token params for magic links
  const urlToken = searchParams.get('token');
  const urlVersionId = searchParams.get('versionId');

  const projectId = params.id;

  const [project, setProject] = useState<Project | null>(null);
  const [folders, setFolders] = useState<DBFolder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string>('all');
  
  // Collapsed folders state
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});

  const toggleCollapse = (folderId: string) => {
    setCollapsedFolders(prev => ({
      ...prev,
      [folderId]: !prev[folderId]
    }));
  };

  const getSubFolders = (parentId: string | null) => {
    return folders.filter(f => f.parentId === parentId);
  };

  const getRootFolders = () => {
    return folders.filter(f => !f.parentId || !folders.some(p => p.id === f.parentId));
  };

  const renderFolderNode = (folder: DBFolder, depth = 0) => {
    const childs = getSubFolders(folder.id);
    const isCollapsed = collapsedFolders[folder.id];
    const isSelected = selectedFolderId === folder.id;

    return (
      <div key={folder.id} className="space-y-1">
        <div 
          className={`
            w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-semibold rounded-lg cursor-pointer transition-colors
            ${isSelected ? 'bg-slate-900 text-white' : 'text-slate-400 hover:bg-slate-900/40 hover:text-slate-250'}
          `}
          style={{ paddingLeft: `${depth * 16 + 14}px` }}
          onClick={() => setSelectedFolderId(folder.id)}
        >
          <div className="flex items-center space-x-1.5 min-w-0">
            {childs.length > 0 ? (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  toggleCollapse(folder.id);
                }}
                className="p-0.5 text-slate-500 hover:text-slate-200 transition-colors cursor-pointer"
              >
                {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            ) : (
              <div className="w-4.5" />
            )}
            <FolderOpen className="w-4 h-4 text-indigo-400 shrink-0" />
            <span className="truncate">{folder.name}</span>
          </div>
        </div>

        {childs.length > 0 && !isCollapsed && (
          <div className="space-y-1">
            {childs.map(child => renderFolderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const [documents, setDocuments] = useState<Document[]>([]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [isTokenValid, setIsTokenValid] = useState<boolean | null>(null);

  // Modals
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);

  // Request Access form states
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [requesterEmail, setRequesterEmail] = useState('');
  const [requestReason, setRequestReason] = useState('');
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [requestSuccess, setRequestSuccess] = useState(false);

  // Viewer state
  const [viewerVersion, setViewerVersion] = useState<DocumentVersion | null>(null);
  const [viewerHtml, setViewerHtml] = useState<string>('');
  const [viewerSheets, setViewerSheets] = useState<{ sheetName: string; html: string }[]>([]);
  const [activeSheetIndex, setActiveSheetIndex] = useState(0);
  const [loadingViewer, setLoadingViewer] = useState(false);

  const fetchProjectData = async () => {
    setLoading(true);
    try {
      // 1. Fetch project info
      const projRes = await fetch('/api/projects');
      if (projRes.ok) {
        const projs = await projRes.json();
        const activeProj = projs.find((p: Project) => p.id === projectId);
        setProject(activeProj || null);
      }

      // 2. Fetch project folders
      const foldersRes = await fetch(`/api/folders?projectId=${projectId}`);
      if (foldersRes.ok) {
        const folderData = await foldersRes.json();
        setFolders(folderData);
        // Default to root folder on load
        setSelectedFolderId('root');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDocuments = async (folderId: string) => {
    try {
      let url = `/api/documents?projectId=${projectId}`;
      if (folderId !== 'all') {
        url += `&folderId=${folderId}`;
      }
      const res = await fetch(url);
      if (res.ok) {
        setDocuments(await res.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchProjectData();
  }, [projectId]);

  useEffect(() => {
    if (projectId) {
      const fetchFolderId = searchQuery ? 'all' : selectedFolderId;
      fetchDocuments(fetchFolderId);
    }
  }, [selectedFolderId, projectId, searchQuery]);

  // Validate the magic link token if present
  useEffect(() => {
    if (urlToken && urlVersionId) {
      fetch(`/api/requests/validate?token=${urlToken}&versionId=${urlVersionId}&t=${Date.now()}`, {
        cache: 'no-store'
      })
        .then(res => res.json())
        .then(data => {
          setIsTokenValid(data.valid);
        })
        .catch(err => {
          console.error('Failed to validate token:', err);
          setIsTokenValid(false);
        });
    }
  }, [urlToken, urlVersionId]);

  // Autoload previewer modal if token & versionId are in URL and token is verified valid
  useEffect(() => {
    if (urlVersionId && urlToken && isTokenValid === true && documents.length > 0) {
      // Find the document that belongs to this version
      const doc = documents.find(d => 
        d.versions.some(v => v.id === urlVersionId) || 
        // For private documents, versions is stripped, so let's try to match by name or metadata?
        // Actually, if we don't have the version object loaded in the list, we can create a mock version object to preview it!
        true
      );

      if (doc) {
        // If document versions list is stripped (since it is private), we create a mock version object
        const mockVersion = doc.versions.find(v => v.id === urlVersionId) || {
          id: urlVersionId,
          versionNumber: 1,
          filePath: doc.name,
          fileSize: 0,
          mimeType: doc.name.endsWith('.pdf') ? 'application/pdf' : 
                    doc.name.endsWith('.docx') ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' :
                    doc.name.endsWith('.xlsx') ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'image/png',
          createdAt: new Date().toISOString()
        };
        openViewer(doc, mockVersion, urlToken);
      }
    }
  }, [urlVersionId, urlToken, isTokenValid, documents]);

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoc || !requesterEmail) return;

    setSubmittingRequest(true);
    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: selectedDoc.id,
          requesterEmail,
          reason: requestReason
        })
      });
      if (res.ok) {
        setRequestSuccess(true);
        setTimeout(() => {
          setRequestModalOpen(false);
          setRequesterEmail('');
          setRequestReason('');
          setRequestSuccess(false);
          setSelectedDoc(null);
        }, 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingRequest(false);
    }
  };

  const openViewer = async (doc: Document, version: DocumentVersion, token?: string | null) => {
    setSelectedDoc(doc);
    setViewerVersion(version);
    setViewerHtml('');
    setViewerSheets([]);
    setActiveSheetIndex(0);
    setViewerOpen(true);
    setLoadingViewer(true);

    try {
      const ext = (version.filePath || doc.name).split('.').pop()?.toLowerCase();
      const tokenParam = token ? `&token=${token}` : '';
      
      if (ext === 'docx') {
        // Docx uses PDF conversion, loading is handled directly by iframe
      } else if (ext === 'md' || ext === 'markdown') {
        const res = await fetch(`/api/render/md?versionId=${version.id}${tokenParam}`);
        if (res.ok) {
          const data = await res.json();
          setViewerHtml(data.html);
        }
      } else if (ext === 'xlsx' || ext === 'xls') {
        const res = await fetch(`/api/render/xlsx?versionId=${version.id}${tokenParam}`);
        if (res.ok) {
          const data = await res.json();
          setViewerSheets(data.sheets);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingViewer(false);
    }
  };

  const filteredDocs = documents.filter(doc => {
    const query = searchQuery.toLowerCase();
    const matchesName = doc.name.toLowerCase().includes(query);
    const matchesDesc = (doc.description || '').toLowerCase().includes(query);
    const matchesTag = doc.tags.some(t => t.name.toLowerCase().includes(query));
    return matchesName || matchesDesc || matchesTag;
  });

  return (
    <div className="w-full px-6 py-12 md:py-16 space-y-10">
      {/* Hero */}
      <section className="space-y-4">
        <Link 
          href="/trust-center"
          className="inline-flex items-center space-x-1.5 text-xs text-slate-500 hover:text-slate-200 transition-colors font-medium"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to framework list</span>
        </Link>
        {project && (
          <div className="space-y-1.5 pt-2">
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">{project.name}</h1>
            <p className="text-xs md:text-sm text-slate-400 max-w-4xl leading-relaxed">{project.description || 'Access framework repository documents.'}</p>
          </div>
        )}
      </section>

      {isTokenValid === false && (
        <Card className="border-red-950 bg-red-950/20 text-red-200">
          <CardContent className="flex items-center space-x-3 p-4">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 animate-pulse" />
            <div>
              <p className="text-sm font-bold text-white">This access link has expired or is invalid</p>
              <p className="text-xs text-red-400/80 mt-0.5">The compliance authorization token has been deleted or expired. Please submit a new access request to view this document.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Layout Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Directories Navigation */}
        <div className="md:col-span-1">
          <Card className="border-slate-900 bg-slate-950">
            <CardHeader className="pb-3 border-b border-slate-900">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center space-x-2">
                <FolderOpen className="w-4 h-4 text-indigo-400" />
                <span>Directories</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 px-2">
              <div className="space-y-1">
                {/* Root Folder selection */}
                <div 
                  className={`
                    w-full flex items-center px-3.5 py-2.5 text-xs font-semibold rounded-lg cursor-pointer transition-colors
                    ${selectedFolderId === 'root' ? 'bg-slate-900 text-white' : 'text-slate-400 hover:bg-slate-900/40 hover:text-slate-250'}
                  `}
                  style={{ paddingLeft: '14px' }}
                  onClick={() => setSelectedFolderId('root')}
                >
                  <div className="flex items-center space-x-1.5 min-w-0">
                    <div className="w-4.5" />
                    <FolderOpen className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span className="truncate">Root Folder</span>
                  </div>
                </div>
                {getRootFolders().map(rootFolder => renderFolderNode(rootFolder))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Documents catalog list */}
        <div className="md:col-span-3 space-y-6">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input
              placeholder="Search approved files by name, description, or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-950 border-slate-900 focus:border-slate-800 text-white placeholder-slate-500 pl-10 text-xs py-5"
            />
          </div>

          <Card className="border-slate-900 bg-slate-950">
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-24">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                </div>
              ) : filteredDocs.length === 0 ? (
                <div className="text-center py-20 text-slate-500">
                  <FileText className="w-10 h-10 text-slate-850 mx-auto mb-3" />
                  <p className="text-xs font-semibold text-slate-400">No files published</p>
                  <p className="text-[11px] text-slate-650 mt-1">No documentation meets the search filters.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader className="border-slate-900 bg-slate-950/50">
                    <TableRow className="hover:bg-transparent border-slate-900">
                      <TableHead className="text-slate-400 text-xs font-semibold uppercase pl-6">Document Name</TableHead>
                      <TableHead className="text-slate-400 text-xs font-semibold uppercase">Tags</TableHead>
                      <TableHead className="text-slate-400 text-xs font-semibold uppercase">Type</TableHead>
                      <TableHead className="text-slate-400 text-xs font-semibold uppercase text-right pr-6">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDocs.map((doc) => {
                      const latestVersion = doc.versions[0];
                      const isPublic = doc.isPublicApproved;
                      
                      return (
                        <TableRow key={doc.id} className="border-slate-900/50 hover:bg-slate-900/20">
                          <TableCell className="pl-6 py-4">
                            <div className="min-w-0">
                              <div className="flex items-center space-x-2">
                                <p className="text-xs font-bold text-white tracking-tight truncate">{doc.name}</p>
                                {!isPublic && (
                                  <span title="Restricted document"><Lock className="w-3 h-3 text-amber-500 shrink-0" /></span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500 truncate mt-0.5">{doc.description || 'No description provided'}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {doc.tags.map(t => (
                                <span key={t.id} className="inline-flex items-center text-[10px] bg-slate-900 text-slate-450 px-2 py-0.5 rounded border border-slate-900">
                                  {t.name}
                                </span>
                              ))}
                              {doc.tags.length === 0 && <span className="text-xs text-slate-650">—</span>}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-[11px] lowercase text-slate-500 font-semibold font-mono">
                              {latestVersion ? `.${(latestVersion.filePath || doc.name).split('.').pop()?.toLowerCase()}` : '—'}
                            </span>
                          </TableCell>
                          <TableCell className="text-right pr-6 py-4">
                            {isPublic ? (
                              latestVersion ? (
                                 <div className="flex items-center justify-end space-x-2">
                                   <Button
                                     size="sm"
                                     onClick={() => openViewer(doc, latestVersion, urlToken)}
                                     className="bg-slate-900 hover:bg-slate-800 text-slate-350 hover:text-white border border-slate-850 hover:border-slate-750 text-xs h-8 cursor-pointer font-medium"
                                   >
                                     <Eye className="w-3.5 h-3.5 mr-1.5" />
                                     <span>Preview</span>
                                   </Button>
                                   <a
                                     href={`/api/viewer?versionId=${latestVersion.id}${urlToken ? `&token=${urlToken}` : ''}&download=true`}
                                     className="inline-flex items-center justify-center bg-slate-900 hover:bg-slate-800 text-slate-350 hover:text-white border border-slate-850 hover:border-slate-750 text-xs h-8 px-3 rounded-md cursor-pointer font-medium transition-colors"
                                     title="Download Document"
                                   >
                                     <Download className="w-3.5 h-3.5 mr-1.5" />
                                     <span>Download</span>
                                   </a>
                                 </div>
                              ) : (
                                <span className="text-xs text-slate-650">Pending file</span>
                              )
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => {
                                  setSelectedDoc(doc);
                                  setRequestModalOpen(true);
                                }}
                                className="bg-amber-500/5 hover:bg-amber-550/20 text-amber-450 hover:text-amber-300 border border-amber-500/10 hover:border-amber-500/20 text-xs h-8 cursor-pointer font-medium"
                              >
                                <KeyRound className="w-3.5 h-3.5 mr-1.5" />
                                <span>Request Access</span>
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* --- REQUEST SECURE ACCESS DIALOG --- */}
      <Dialog open={requestModalOpen} onOpenChange={setRequestModalOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white text-lg font-bold flex items-center space-x-2">
              <KeyRound className="w-5 h-5 text-amber-400" />
              <span>Request Secure Access</span>
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Submit an access request for private document &quot;{selectedDoc?.name}&quot;. Administrators will review and grant a time-bound magic link.
            </DialogDescription>
          </DialogHeader>
          {requestSuccess ? (
            <div className="py-8 text-center space-y-3">
              <ShieldCheck className="w-12 h-12 text-emerald-400 mx-auto animate-bounce" />
              <p className="text-sm font-bold text-white">Access Request Registered!</p>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                Your request has been successfully queued. Check your email for instructions once administrators review and approve the request.
              </p>
            </div>
          ) : (
            <form onSubmit={handleRequestSubmit} className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="req-email" className="text-slate-300">Your Email Address</Label>
                <Input
                  id="req-email"
                  type="email"
                  placeholder="name@company.com"
                  value={requesterEmail}
                  onChange={(e) => setRequesterEmail(e.target.value)}
                  className="bg-slate-950/60 border-slate-800 focus:border-indigo-500 text-white placeholder-slate-650"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="req-reason" className="text-slate-300">Reason for Request (e.g. SOC2 Auditor / Security Audit)</Label>
                <Textarea
                  id="req-reason"
                  placeholder="Briefly state why you require access to this restricted document."
                  value={requestReason}
                  onChange={(e) => setRequestReason(e.target.value)}
                  className="bg-slate-950/60 border-slate-800 focus:border-indigo-500 text-white placeholder-slate-650 h-24 text-xs resize-none"
                  required
                />
              </div>
              <DialogFooter className="pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setRequestModalOpen(false)}
                  className="border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submittingRequest} className="bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer">
                  {submittingRequest ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    'Submit Request'
                  )}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* --- IN-BROWSER SECURE VIEWER DIALOG --- */}
      <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
        <DialogContent 
          showCloseButton={false}
          className="bg-slate-950 border-0 text-slate-100 max-w-none sm:max-w-none w-screen h-screen flex flex-col p-0 overflow-hidden rounded-none fixed inset-0 translate-x-0 translate-y-0 sm:translate-x-0 sm:translate-y-0"
        >
          {/* Header toolbar */}
          <div className="flex items-center justify-between px-6 py-4 bg-slate-900 border-b border-slate-800 shrink-0">
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-indigo-400 shrink-0" />
                <h3 className="text-sm font-bold text-white truncate">{selectedDoc?.name}</h3>
                <span className="text-[11px] font-semibold text-slate-500">v{viewerVersion?.versionNumber}</span>
              </div>
              <p className="text-xs text-slate-400 truncate mt-0.5">{selectedDoc?.description || 'No description provided'}</p>
            </div>
            <div className="flex items-center space-x-3 shrink-0 ml-4">
              {urlToken && (
                <div className="flex items-center space-x-2 bg-indigo-500/5 border border-indigo-500/10 px-3 py-1.5 rounded-lg text-[10px] uppercase font-bold text-indigo-400 tracking-wider">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Authorized Link Active</span>
                </div>
              )}
              {viewerVersion && (
                <a
                  href={`/api/viewer?versionId=${viewerVersion.id}${urlToken ? `&token=${urlToken}` : ''}&download=true`}
                  className="inline-flex items-center space-x-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-bold bg-indigo-500/5 hover:bg-indigo-500/10 px-2.5 py-1.5 rounded border border-indigo-500/15 transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </a>
              )}
              <Button
                variant="ghost"
                onClick={() => setViewerOpen(false)}
                className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                size="icon"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Render Area */}
          <div className="flex-1 bg-slate-900/40 relative min-h-0 overflow-y-auto">
            {loadingViewer ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-2" />
                <span className="text-xs font-semibold">Parsing document layout...</span>
              </div>
            ) : (() => {
              if (!selectedDoc || !viewerVersion) return null;
              const ext = (viewerVersion.filePath || selectedDoc.name).split('.').pop()?.toLowerCase();
              const tokenParam = urlToken ? `&token=${urlToken}` : '';
              
              if (ext === 'pdf' || ext === 'docx') {
                return (
                  <iframe
                    src={`/api/viewer?versionId=${viewerVersion.id}${tokenParam}#toolbar=0`}
                    className="w-full h-full border-0 bg-slate-900"
                  />
                );
              }

              if (ext === 'md' || ext === 'markdown') {
                return (
                  <div className="p-8 max-w-3xl mx-auto bg-slate-950/80 border border-slate-850 rounded-xl my-6 text-slate-350 prose-custom font-sans overflow-hidden">
                    <div dangerouslySetInnerHTML={{ __html: viewerHtml || '<p className="text-center text-slate-650">No content</p>' }} />
                  </div>
                );
              }

              if (ext === 'xlsx' || ext === 'xls') {
                return (
                  <div className="h-full flex flex-col">
                    {/* Sheet tabs */}
                    {viewerSheets.length > 0 && (
                      <div className="flex bg-slate-950 border-b border-slate-800 overflow-x-auto px-4 py-1 shrink-0">
                        {viewerSheets.map((sheet, index) => (
                          <button
                            key={sheet.sheetName}
                            onClick={() => setActiveSheetIndex(index)}
                            className={`
                              px-3 py-1.5 text-xs font-semibold border-b-2 whitespace-nowrap cursor-pointer
                              ${activeSheetIndex === index 
                                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5' 
                                : 'border-transparent text-slate-400 hover:text-slate-200'}
                            `}
                          >
                            {sheet.sheetName}
                          </button>
                        ))}
                      </div>
                    )}
                    {/* Table */}
                    <div className="flex-1 p-6 overflow-auto">
                      <div 
                        className="excel-table-container border border-slate-850 rounded-xl max-w-full"
                        dangerouslySetInnerHTML={{ __html: viewerSheets[activeSheetIndex]?.html || '<p className="text-center text-slate-600 p-8">Sheet empty</p>' }}
                      />
                    </div>
                  </div>
                );
              }

              if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext || '')) {
                return (
                  <div className="w-full h-full flex items-center justify-center p-8">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/viewer?versionId=${viewerVersion.id}${tokenParam}`}
                      alt={selectedDoc.name}
                      className="max-w-full max-h-full object-contain rounded-lg border border-slate-800 shadow-2xl"
                    />
                  </div>
                );
              }

              return (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 text-sm">
                  <FileCode className="w-12 h-12 text-slate-700 mb-2" />
                  <p className="font-semibold text-slate-400">Viewer not available for this format ({ext})</p>
                  <a
                    href={`/api/viewer?versionId=${viewerVersion.id}${tokenParam}`}
                    download={selectedDoc.name}
                    className="mt-3 inline-flex items-center space-x-2 text-indigo-400 hover:text-indigo-300 font-bold bg-slate-900 border border-slate-800 px-4 py-2 rounded-lg"
                  >
                    <span>Download original file</span>
                  </a>
                </div>
              );
            })()}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function PublicProjectDocumentsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = React.use(params);
  return (
    <Suspense fallback={
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-950 text-white">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    }>
      <PublicProjectDocumentsContent params={resolvedParams} />
    </Suspense>
  );
}
