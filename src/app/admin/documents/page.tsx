'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  FileText, 
  Upload, 
  Search, 
  Eye, 
  Trash2, 
  Edit, 
  FileCode,
  Tag, 
  Calendar, 
  HardDrive, 
  Loader2,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  ExternalLink,
  Info,
  X,
  Download,
  Copy
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface Project {
  id: string;
  name: string;
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
  updatedAt: string;
  tags: DBTag[];
  versions: DocumentVersion[];
  isPreRendering?: boolean;
}

export default function DocumentManagerPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [folders, setFolders] = useState<DBFolder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string>('all'); // 'all', 'root', or folderId
  
  // Collapsed folders state
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});

  // Document selection and bulk action states
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [targetDocId, setTargetDocId] = useState<string | null>(null);
  const [bulkFolderModalOpen, setBulkFolderModalOpen] = useState(false);
  const [bulkActionType, setBulkActionType] = useState<'move' | 'copy' | null>(null);
  const [bulkTargetProjectId, setBulkTargetProjectId] = useState<string>('');
  const [bulkTargetFolderId, setBulkTargetFolderId] = useState<string>('root');
  const [bulkFolders, setBulkFolders] = useState<DBFolder[]>([]);

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

  // Alert dialog state
  const [alertDialogOpen, setAlertDialogOpen] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertDescription, setAlertDescription] = useState('');

  const triggerAlert = (title: string, description: string) => {
    setAlertTitle(title);
    setAlertDescription(description);
    setAlertDialogOpen(true);
  };

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

  const buildFolderSelectTree = (foldersList: DBFolder[]) => {
    const result: { id: string; name: string; indentName: string }[] = [];
    
    const getSubFoldersList = (parentId: string | null) => {
      return foldersList.filter(f => f.parentId === parentId);
    };
    
    const getRootFoldersList = () => {
      return foldersList.filter(f => !f.parentId || !foldersList.some(p => p.id === f.parentId));
    };

    const traverse = (folder: DBFolder, depth = 0) => {
      const prefix = depth > 0 ? '\u00A0\u00A0'.repeat(depth) + '└─ ' : '';
      result.push({
        id: folder.id,
        name: folder.name,
        indentName: `${prefix}${folder.name}`
      });
      const children = getSubFoldersList(folder.id);
      children.forEach(child => traverse(child, depth + 1));
    };

    const roots = getRootFoldersList();
    roots.forEach(root => traverse(root, 0));
    
    return result;
  };

  const renderFolderNode = (folder: DBFolder, depth = 0) => {
    const childs = getSubFolders(folder.id);
    const isCollapsed = collapsedFolders[folder.id];
    const isSelected = selectedFolderId === folder.id;

    return (
      <div key={folder.id} className="space-y-1">
        <div 
          className={`
            w-full flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all border
            ${isSelected 
              ? 'bg-indigo-600/10 text-indigo-400 border-indigo-500/20' 
              : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200 border-transparent'}
          `}
          style={{ paddingLeft: `${Math.max(8, depth * 16)}px` }}
          onClick={() => setSelectedFolderId(folder.id)}
        >
          <div className="flex items-center space-x-2 min-w-0">
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
            <span className="text-xs font-semibold truncate">{folder.name}</span>
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
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingDocs, setLoadingDocs] = useState(false);

  // Modals state
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [newVersionModalOpen, setNewVersionModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);

  const [uploading, setUploading] = useState(false);

  // Form states
  const [docName, setDocName] = useState('');
  const [docDesc, setDocDesc] = useState('');
  const [docTags, setDocTags] = useState('');
  const [docPublic, setDocPublic] = useState(false);
  const [docFiles, setDocFiles] = useState<FileList | null>(null);
  const [targetFolderId, setTargetFolderId] = useState<string>('root');

  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [versionFile, setVersionFile] = useState<File | null>(null);

  // Viewer state
  const [viewerVersion, setViewerVersion] = useState<DocumentVersion | null>(null);
  const [viewerHtml, setViewerHtml] = useState<string>('');
  const [viewerSheets, setViewerSheets] = useState<{ sheetName: string; html: string }[]>([]);
  const [activeSheetIndex, setActiveSheetIndex] = useState(0);
  const [loadingViewer, setLoadingViewer] = useState(false);

  const fetchProjects = async () => {
    setLoadingProjects(true);
    try {
      const res = await fetch('/api/projects');
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
        if (data.length > 0) {
          setSelectedProjectId(data[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingProjects(false);
    }
  };

  const fetchFolders = async (projectId: string) => {
    try {
      const res = await fetch(`/api/folders?projectId=${projectId}`);
      if (res.ok) {
        const data = await res.json();
        setFolders(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchDocuments = async (projectId: string, folderId: string, silent = false) => {
    if (!silent) setLoadingDocs(true);
    try {
      let url = `/api/documents?projectId=${projectId}`;
      if (folderId !== 'all') {
        url += `&folderId=${folderId}`;
      }
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setDocuments(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (!silent) setLoadingDocs(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  // Fetch folders and default selected folder to root when the active project changes
  useEffect(() => {
    if (selectedProjectId) {
      fetchFolders(selectedProjectId);
      setSelectedFolderId('root');
    }
  }, [selectedProjectId]);

  // Fetch documents when the selected project or folder changes
  useEffect(() => {
    if (selectedProjectId) {
      fetchDocuments(selectedProjectId, selectedFolderId);
    }
  }, [selectedProjectId, selectedFolderId]);

  // Poll documents while any document is pre-rendering
  useEffect(() => {
    if (!selectedProjectId) return;
    
    const hasPreRendering = documents.some(doc => doc.isPreRendering);
    if (!hasPreRendering) return;

    const interval = setInterval(() => {
      fetchDocuments(selectedProjectId, selectedFolderId, true);
    }, 3000);

    return () => clearInterval(interval);
  }, [selectedProjectId, selectedFolderId, documents]);

  useEffect(() => {
    setTargetFolderId('root');
  }, [selectedProjectId]);

  useEffect(() => {
    setSelectedDocIds([]);
  }, [selectedProjectId, selectedFolderId]);

  const fetchBulkFolders = async (projectId: string) => {
    try {
      const res = await fetch(`/api/folders?projectId=${projectId}`);
      if (res.ok) {
        const data = await res.json();
        setBulkFolders(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Load folders for the target project in bulk copy/move dialog
  useEffect(() => {
    if (bulkTargetProjectId && bulkFolderModalOpen) {
      if (bulkTargetProjectId === selectedProjectId) {
        setBulkFolders(folders);
      } else {
        fetchBulkFolders(bulkTargetProjectId);
      }
      setBulkTargetFolderId('root');
    }
  }, [bulkTargetProjectId, bulkFolderModalOpen]);

  // Upload new document
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId || !docFiles || docFiles.length === 0) return;

    const isBulk = docFiles.length > 1;
    if (!isBulk && !docName) return;

    setLoadingDocs(true);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('projectId', selectedProjectId);
      formData.append('folderId', targetFolderId === 'root' ? '' : targetFolderId);
      formData.append('isPublicApproved', String(docPublic));
      formData.append('tags', docTags);

      if (isBulk) {
        // Bulk upload flow
        Array.from(docFiles).forEach(file => {
          formData.append('files', file);
        });

        const res = await fetch('/api/documents/bulk-upload', {
          method: 'POST',
          body: formData
        });

        if (res.ok) {
          setUploadModalOpen(false);
          setDocName('');
          setDocDesc('');
          setDocTags('');
          setDocPublic(false);
          setDocFiles(null);
          fetchDocuments(selectedProjectId, selectedFolderId);
        } else {
          const data = await res.json();
          alert(data.error || 'Bulk upload failed');
        }
      } else {
        // Single file upload flow
        const file = docFiles[0];
        formData.append('file', file);
        formData.append('name', docName);
        formData.append('description', docDesc);

        const res = await fetch('/api/documents', {
          method: 'POST',
          body: formData
        });

        if (res.ok) {
          setUploadModalOpen(false);
          setDocName('');
          setDocDesc('');
          setDocTags('');
          setDocPublic(false);
          setDocFiles(null);
          fetchDocuments(selectedProjectId, selectedFolderId);
        } else {
          const data = await res.json();
          alert(data.error || 'Upload failed');
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDocs(false);
      setUploading(false);
    }
  };

  // Upload new version
  const handleVersionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoc || !versionFile) return;

    setLoadingDocs(true);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', versionFile);
      formData.append('documentId', selectedDoc.id);

      const res = await fetch('/api/documents', {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        setNewVersionModalOpen(false);
        setVersionFile(null);
        setSelectedDoc(null);
        fetchDocuments(selectedProjectId, selectedFolderId);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDocs(false);
      setUploading(false);
    }
  };

  // Edit metadata
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoc) return;

    setLoadingDocs(true);
    try {
      const res = await fetch(`/api/documents/${selectedDoc.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: docName,
          description: docDesc,
          folderId: targetFolderId === 'root' ? '' : targetFolderId,
          isPublicApproved: docPublic,
          tagsString: docTags
        })
      });

      if (res.ok) {
        setEditModalOpen(false);
        setSelectedDoc(null);
        fetchDocuments(selectedProjectId, selectedFolderId);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDocs(false);
    }
  };

  // Soft delete document
  const handleSoftDelete = async (doc: Document) => {
    triggerConfirm(
      "Delete Document",
      `Are you sure you want to delete the document "${doc.name}"?`,
      async () => {
        try {
          const res = await fetch(`/api/documents/${doc.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isDeleted: true })
          });
          if (res.ok) {
            fetchDocuments(selectedProjectId, selectedFolderId);
          }
        } catch (err) {
          console.error(err);
        }
      }
    );
  };

  // Bulk documents actions (move, copy, delete)
  const handleBulkAction = async (action: 'move' | 'copy' | 'delete', targetFolderId?: string, targetProjectId?: string) => {
    const ids = targetDocId ? [targetDocId] : selectedDocIds;
    if (ids.length === 0) return;

    try {
      setLoadingDocs(true);
      const res = await fetch('/api/documents/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          documentIds: ids,
          targetFolderId,
          targetProjectId
        })
      });

      if (res.ok) {
        if (!targetDocId) {
          setSelectedDocIds([]);
        }
        setTargetDocId(null);
        setBulkFolderModalOpen(false);
        fetchDocuments(selectedProjectId, selectedFolderId);
      } else {
        const data = await res.json();
        triggerAlert('Action Failed', data.error || `Failed to perform bulk ${action}`);
      }
    } catch (err) {
      console.error('Failed to perform bulk action:', err);
      triggerAlert('Action Error', `Failed to perform bulk ${action}`);
    } finally {
      setLoadingDocs(false);
    }
  };

  const handleBulkFolderActionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkActionType) return;
    handleBulkAction(bulkActionType, bulkTargetFolderId, bulkTargetProjectId);
  };

  // Trigger single document folder action
  const triggerSingleFolderAction = (docId: string, type: 'move' | 'copy') => {
    setTargetDocId(docId);
    setBulkActionType(type);
    setBulkTargetProjectId(selectedProjectId);
    setBulkTargetFolderId('root');
    setBulkFolderModalOpen(true);
  };

  // Handle in-browser document preview
  const openViewer = async (doc: Document, version: DocumentVersion) => {
    setSelectedDoc(doc);
    setViewerVersion(version);
    setViewerHtml('');
    setViewerSheets([]);
    setActiveSheetIndex(0);
    setViewerOpen(true);
    setLoadingViewer(true);

    try {
      const ext = (version.filePath || doc.name).split('.').pop()?.toLowerCase();
      if (ext === 'docx') {
        // Docx uses PDF conversion, loading is handled directly by iframe
      } else if (ext === 'md' || ext === 'markdown') {
        const res = await fetch(`/api/render/md?versionId=${version.id}`);
        if (res.ok) {
          const data = await res.json();
          setViewerHtml(data.html);
        }
      } else if (ext === 'xlsx' || ext === 'xls') {
        const res = await fetch(`/api/render/xlsx?versionId=${version.id}`);
        if (res.ok) {
          const data = await res.json();
          setViewerSheets(data.sheets);
        }
      }
    } catch (err) {
      console.error('Failed to render preview:', err);
    } finally {
      setLoadingViewer(false);
    }
  };

  // Filter documents by search query
  const filteredDocs = documents.filter(doc => {
    const query = searchQuery.toLowerCase();
    const matchesName = doc.name.toLowerCase().includes(query);
    const matchesDesc = (doc.description || '').toLowerCase().includes(query);
    const matchesTag = doc.tags.some(t => t.name.toLowerCase().includes(query));
    return matchesName || matchesDesc || matchesTag;
  });

  return (
    <div className="space-y-6">
      {/* Search and Upload bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input
            placeholder="Search documents by name, description, or tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-slate-900/60 border-slate-800 focus:border-indigo-500 text-white placeholder-slate-500 pl-10"
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
          <Select value={selectedProjectId} onValueChange={(val) => { setSelectedProjectId(val || ''); setSelectedFolderId('all'); }}>
            <SelectTrigger className="bg-slate-900/60 border-slate-800 focus:border-indigo-500 hover:bg-slate-850/50 text-white w-full md:w-56 transition-all">
              <SelectValue placeholder="Select project">
                {projects.find(p => p.id === selectedProjectId)?.name || (loadingProjects ? "Loading projects..." : "Select project")}
              </SelectValue>
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false} className="bg-slate-900 border-slate-800 text-white">
              {projects.map(p => (
                <SelectItem key={p.id} value={p.id} className="focus:bg-slate-800 cursor-pointer">{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button 
            onClick={() => {
              setDocName('');
              setDocDesc('');
              setDocTags('');
              setDocPublic(false);
              setDocFiles(null);
              setTargetFolderId(selectedFolderId === 'all' || selectedFolderId === 'root' ? 'root' : selectedFolderId);
              setUploadModalOpen(true);
            }}
            disabled={!selectedProjectId}
            className="bg-indigo-600 hover:bg-indigo-500 text-white flex items-center space-x-2 shrink-0 cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Document</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Directory Structure panel */}
        <div className="md:col-span-1">
          <Card className="border-slate-900 bg-slate-900/40 backdrop-blur-md">
            <CardHeader className="pb-3 border-b border-slate-900">
              <CardTitle className="text-sm font-bold text-white flex items-center space-x-2">
                <FolderOpen className="w-4 h-4 text-indigo-400" />
                <span>Directories</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 px-2">
              <div className="space-y-1">
                {/* Root Folder option */}
                <div 
                  className={`
                    w-full flex items-center space-x-2 p-2 rounded-lg cursor-pointer transition-all border
                    ${selectedFolderId === 'root' 
                      ? 'bg-indigo-600/10 text-indigo-400 border-indigo-500/20' 
                      : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200 border-transparent'}
                  `}
                  style={{ paddingLeft: '8px' }}
                  onClick={() => setSelectedFolderId('root')}
                >
                  <div className="w-4.5" />
                  <FolderOpen className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span className="text-xs font-semibold truncate">Root Folder</span>
                </div>
                {getRootFolders().map(rootFolder => renderFolderNode(rootFolder))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Documents list table */}
        <div className="md:col-span-3">
          <Card className="border-slate-900 bg-slate-900/40 backdrop-blur-md">
            <CardContent className="p-0">
              {/* Bulk Action Bar */}
              {selectedDocIds.length > 0 && (
                <div className="bg-slate-900 border-b border-slate-800 px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 animate-in slide-in-from-top-4 duration-200">
                  <div className="flex items-center space-x-2">
                    <span className="text-[11px] font-bold text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full uppercase tracking-wider">
                      {selectedDocIds.length} selected
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setBulkActionType('move');
                        setBulkTargetProjectId(selectedProjectId);
                        setBulkTargetFolderId('root');
                        setBulkFolderModalOpen(true);
                      }}
                      className="border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-semibold cursor-pointer h-8 px-3"
                    >
                      <FolderOpen className="w-3.5 h-3.5 mr-1.5 text-indigo-400" />
                      <span>Move to Folder</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setBulkActionType('copy');
                        setBulkTargetProjectId(selectedProjectId);
                        setBulkTargetFolderId('root');
                        setBulkFolderModalOpen(true);
                      }}
                      className="border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-semibold cursor-pointer h-8 px-3"
                    >
                      <Copy className="w-3.5 h-3.5 mr-1.5 text-teal-400" />
                      <span>Copy to Folder</span>
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        triggerConfirm(
                          `Delete ${selectedDocIds.length} Document(s)`,
                          `Are you sure you want to delete the ${selectedDocIds.length} selected document(s)? This will soft-delete them from the active list.`,
                          () => handleBulkAction('delete')
                        );
                      }}
                      className="bg-red-600 hover:bg-red-500 text-white text-xs font-semibold cursor-pointer h-8 px-3"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                      <span>Delete Selected</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setSelectedDocIds([])}
                      className="text-slate-400 hover:text-slate-200 text-xs cursor-pointer h-8"
                    >
                      Clear
                    </Button>
                  </div>
                </div>
              )}

              {loadingDocs ? (
                <div className="flex items-center justify-center py-24">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                </div>
              ) : filteredDocs.length === 0 ? (
                <div className="text-center py-24 text-slate-500">
                  <FileText className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                  <p className="text-sm font-semibold">No documents found</p>
                  <p className="text-xs text-slate-600 mt-1">Upload a document or change the active filter.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader className="border-slate-800">
                    <TableRow className="hover:bg-transparent border-slate-800">
                      <TableHead className="w-12 pl-6">
                        <Checkbox
                          checked={filteredDocs.length > 0 && selectedDocIds.length === filteredDocs.length}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedDocIds(filteredDocs.map(d => d.id));
                            } else {
                              setSelectedDocIds([]);
                            }
                          }}
                          className="border-slate-800 data-[state=checked]:bg-indigo-600"
                        />
                      </TableHead>
                      <TableHead className="text-slate-400 text-xs uppercase font-bold">Name</TableHead>
                      <TableHead className="text-slate-400 text-xs uppercase font-bold">Visibility</TableHead>
                      <TableHead className="text-slate-400 text-xs uppercase font-bold">Tags</TableHead>
                      <TableHead className="text-slate-400 text-xs uppercase font-bold">Type</TableHead>
                      <TableHead className="text-slate-400 text-xs uppercase font-bold">Versions</TableHead>
                      <TableHead className="text-slate-400 text-xs uppercase font-bold text-right pr-6">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDocs.map((doc) => {
                      const latestVersion = doc.versions[0];
                      return (
                        <TableRow key={doc.id} className="border-slate-800/50 hover:bg-slate-800/20">
                          <TableCell className="pl-6 w-12">
                            <Checkbox
                              checked={selectedDocIds.includes(doc.id)}
                              disabled={doc.isPreRendering}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedDocIds(prev => [...prev, doc.id]);
                                } else {
                                  setSelectedDocIds(prev => prev.filter(id => id !== doc.id));
                                }
                              }}
                              className="border-slate-800 data-[state=checked]:bg-indigo-600 disabled:opacity-30 disabled:cursor-not-allowed"
                            />
                          </TableCell>
                          <TableCell className="py-4">
                            <div className="min-w-0">
                              <div className="flex items-center space-x-2">
                                <p className="text-sm font-bold text-white tracking-wide truncate">{doc.name}</p>
                                {doc.isPreRendering && (
                                  <span className="inline-flex items-center space-x-1 text-[9px] text-indigo-400 bg-indigo-500/10 border border-indigo-500/15 px-2 py-0.5 rounded-full font-bold animate-pulse shrink-0">
                                    <Loader2 className="w-2.5 h-2.5 animate-spin" />
                                    <span>Rendering...</span>
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-500 truncate mt-0.5">{doc.description || 'No description'}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className={`
                              px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider
                              ${doc.isPublicApproved ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}
                            `}>
                              {doc.isPublicApproved ? 'Public Approved' : 'Restricted'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {doc.tags.map(t => (
                                <span key={t.id} className="inline-flex items-center text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700">
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
                          <TableCell>
                            <span className="text-xs font-semibold text-slate-300">
                              v{latestVersion?.versionNumber || 1}
                            </span>
                          </TableCell>
                          <TableCell className="text-right pr-6 py-4 whitespace-nowrap">
                            <div className="flex items-center justify-end space-x-1.5">
                              {latestVersion && (
                                <>
                                  <button
                                    onClick={() => openViewer(doc, latestVersion)}
                                    disabled={doc.isPreRendering}
                                    className={`p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded transition-all ${doc.isPreRendering ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                    title={doc.isPreRendering ? "Rendering preview..." : "In-Browser Preview"}
                                  >
                                    {doc.isPreRendering ? (
                                      <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                                    ) : (
                                      <Eye className="w-4 h-4" />
                                    )}
                                  </button>
                                  {doc.isPreRendering ? (
                                    <span
                                      className="p-1.5 text-slate-600 cursor-not-allowed inline-flex items-center justify-center opacity-50"
                                      title="Rendering in progress..."
                                    >
                                      <Download className="w-4 h-4" />
                                    </span>
                                  ) : (
                                    <a
                                      href={`/api/viewer?versionId=${latestVersion.id}&download=true`}
                                      className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded transition-all cursor-pointer inline-flex items-center justify-center"
                                      title="Download Document"
                                    >
                                      <Download className="w-4 h-4" />
                                    </a>
                                  )}
                                </>
                              )}
                              <button
                                onClick={() => {
                                  setSelectedDoc(doc);
                                  setVersionFile(null);
                                  setNewVersionModalOpen(true);
                                }}
                                disabled={doc.isPreRendering}
                                className={`p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded transition-all ${doc.isPreRendering ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                title={doc.isPreRendering ? "Rendering in progress..." : "Upload New Version"}
                              >
                                <Upload className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedDoc(doc);
                                  setDocName(doc.name);
                                  setDocDesc(doc.description || '');
                                  setDocTags(doc.tags.map(t => t.name).join(', '));
                                  setDocPublic(doc.isPublicApproved);
                                  setTargetFolderId(doc.folderId || 'root');
                                  setEditModalOpen(true);
                                }}
                                disabled={doc.isPreRendering}
                                className={`p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded transition-all ${doc.isPreRendering ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                title={doc.isPreRendering ? "Rendering in progress..." : "Edit Metadata"}
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => triggerSingleFolderAction(doc.id, 'move')}
                                disabled={doc.isPreRendering}
                                className={`p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded transition-all ${doc.isPreRendering ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                title={doc.isPreRendering ? "Rendering in progress..." : "Move to Folder"}
                              >
                                <FolderOpen className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => triggerSingleFolderAction(doc.id, 'copy')}
                                disabled={doc.isPreRendering}
                                className={`p-1.5 text-slate-400 hover:text-teal-400 hover:bg-slate-800 rounded transition-all ${doc.isPreRendering ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                title={doc.isPreRendering ? "Rendering in progress..." : "Copy to Folder"}
                              >
                                <Copy className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleSoftDelete(doc)}
                                disabled={doc.isPreRendering}
                                className={`p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded transition-all ${doc.isPreRendering ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                title={doc.isPreRendering ? "Rendering in progress..." : "Soft Delete"}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
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

      {/* --- UPLOAD DOCUMENT DIALOG --- */}
      <Dialog open={uploadModalOpen} onOpenChange={setUploadModalOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white text-lg font-bold">Upload Compliance Document</DialogTitle>
            <DialogDescription className="text-slate-400">Save a compliance record inside active projects directories.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUploadSubmit} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="text-slate-300">Target Project</Label>
              <Select value={selectedProjectId} onValueChange={(val) => { setSelectedProjectId(val || ''); setSelectedFolderId('all'); }}>
                <SelectTrigger className="bg-slate-950/60 border-slate-800 focus:border-indigo-500 text-white transition-all">
                  <SelectValue placeholder="Select project">
                    {projects.find(p => p.id === selectedProjectId)?.name || (loadingProjects ? "Loading projects..." : "Select project")}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false} className="bg-slate-900 border-slate-800 text-white">
                  {projects.map(p => (
                    <SelectItem key={p.id} value={p.id} className="focus:bg-slate-800 cursor-pointer">{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="u-name" className="text-slate-300">Document Name</Label>
                <Input
                  id="u-name"
                  placeholder={docFiles && docFiles.length > 1 ? "Using filenames..." : "System Security Plan"}
                  value={docFiles && docFiles.length > 1 ? "" : docName}
                  onChange={(e) => setDocName(e.target.value)}
                  className="bg-slate-950/60 border-slate-800 focus:border-indigo-500 text-white disabled:opacity-50"
                  required={docFiles ? docFiles.length <= 1 : true}
                  disabled={docFiles ? docFiles.length > 1 : false}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Target Folder</Label>
                <Select value={targetFolderId} onValueChange={(val) => setTargetFolderId(val || 'root')}>
                  <SelectTrigger className="bg-slate-950/60 border-slate-800 text-white">
                    <SelectValue placeholder="Select folder">
                      {targetFolderId === 'root' ? '[Root Folder]' : (folders.find(f => f.id === targetFolderId)?.name || "Select folder")}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent alignItemWithTrigger={false} className="bg-slate-900 border-slate-800 text-white">
                    <SelectItem value="root" className="focus:bg-slate-800">[Root Folder]</SelectItem>
                    {buildFolderSelectTree(folders).map(f => (
                      <SelectItem key={f.id} value={f.id} className="focus:bg-slate-800">
                        <span className="whitespace-pre">{f.indentName}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="u-desc" className="text-slate-300">Description</Label>
              <Input
                id="u-desc"
                placeholder={docFiles && docFiles.length > 1 ? "Auto-generated bulk descriptions" : "Overview description of this document"}
                value={docFiles && docFiles.length > 1 ? "" : docDesc}
                onChange={(e) => setDocDesc(e.target.value)}
                className="bg-slate-950/60 border-slate-800 focus:border-indigo-500 text-white disabled:opacity-50"
                disabled={docFiles ? docFiles.length > 1 : false}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="u-tags" className="text-slate-300">Tags (comma separated)</Label>
              <Input
                id="u-tags"
                placeholder="audit, soc2, 2026"
                value={docTags}
                onChange={(e) => setDocTags(e.target.value)}
                className="bg-slate-950/60 border-slate-800 focus:border-indigo-500 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="u-file" className="text-slate-300">Select Files</Label>
              <Input
                id="u-file"
                type="file"
                multiple
                onChange={(e) => setDocFiles(e.target.files)}
                className="bg-slate-950/60 border-slate-800 text-white cursor-pointer"
                required
              />
              <p className="text-[10px] text-slate-500">Supports selecting multiple files. Supports PDF, Word (docx), Excel (xlsx), Markdown (md), Images.</p>
            </div>
            <div className="flex items-center space-x-2 pt-2">
              <Checkbox
                id="u-public"
                checked={docPublic}
                onCheckedChange={(checked) => setDocPublic(!!checked)}
                className="border-slate-800 data-[state=checked]:bg-indigo-600"
              />
              <Label htmlFor="u-public" className="text-sm font-medium text-slate-300 cursor-pointer">
                Mark as Public Approved (Visible to unauthenticated visitors)
              </Label>
            </div>
            <DialogFooter className="pt-4 items-center justify-center">
              {uploading ? (
                <div className="flex items-center justify-center space-x-2 text-xs text-indigo-400 bg-indigo-500/5 border border-indigo-500/10 px-3 py-2 rounded-lg font-semibold w-full">
                  <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                  <span>
                    {docFiles && docFiles.length > 1 
                      ? `Uploading ${docFiles.length} files in bulk...` 
                      : (docFiles?.[0]?.name.toLowerCase().endsWith('.docx') 
                          ? "Pre-rendering Word layout for instant preview..." 
                          : "Uploading document...")}
                  </span>
                </div>
              ) : (
                <div className="flex items-center space-x-2 w-full justify-end">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setUploadModalOpen(false);
                      setDocFiles(null);
                    }}
                    className="border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer">
                    {docFiles && docFiles.length > 1 ? "Upload Bulk Files" : "Upload File"}
                  </Button>
                </div>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* --- NEW VERSION DIALOG --- */}
      <Dialog open={newVersionModalOpen} onOpenChange={setNewVersionModalOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100">
          <DialogHeader>
            <DialogTitle className="text-white text-lg font-bold">Upload New Version</DialogTitle>
            <DialogDescription className="text-slate-400">
              Submit a revision for document &quot;{selectedDoc?.name}&quot;. The version number will auto-increment.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleVersionSubmit} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="v-file" className="text-slate-300">Select File Revision</Label>
              <Input
                id="v-file"
                type="file"
                onChange={(e) => setVersionFile(e.target.files?.[0] || null)}
                className="bg-slate-950/60 border-slate-800 text-white"
                required
              />
            </div>
            <DialogFooter className="pt-4 items-center justify-center">
              {uploading ? (
                <div className="flex items-center justify-center space-x-2 text-xs text-indigo-400 bg-indigo-500/5 border border-indigo-500/10 px-3 py-2 rounded-lg font-semibold w-full">
                  <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                  <span>
                    {versionFile?.name.toLowerCase().endsWith('.docx') 
                      ? "Pre-rendering Word layout for instant preview..." 
                      : "Uploading version..."}
                  </span>
                </div>
              ) : (
                <div className="flex items-center space-x-2 w-full justify-end">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setNewVersionModalOpen(false)}
                    className="border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer">Upload Version</Button>
                </div>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* --- EDIT METADATA DIALOG --- */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white text-lg font-bold">Edit Document Metadata</DialogTitle>
            <DialogDescription className="text-slate-400">Modify indices or tags relating to this file.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="e-name" className="text-slate-300">Document Name</Label>
                <Input
                  id="e-name"
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  className="bg-slate-950/60 border-slate-800 focus:border-indigo-500 text-white"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Move to Folder</Label>
                <Select value={targetFolderId} onValueChange={(val) => setTargetFolderId(val || 'root')}>
                  <SelectTrigger className="bg-slate-950/60 border-slate-800 text-white">
                    <SelectValue placeholder="Select folder">
                      {targetFolderId === 'root' ? '[Root Folder]' : (folders.find(f => f.id === targetFolderId)?.name || "Select folder")}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent alignItemWithTrigger={false} className="bg-slate-900 border-slate-800 text-white">
                    <SelectItem value="root" className="focus:bg-slate-800">[Root Folder]</SelectItem>
                    {buildFolderSelectTree(folders).map(f => (
                      <SelectItem key={f.id} value={f.id} className="focus:bg-slate-800">
                        <span className="whitespace-pre">{f.indentName}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="e-desc" className="text-slate-300">Description</Label>
              <Input
                id="e-desc"
                value={docDesc}
                onChange={(e) => setDocDesc(e.target.value)}
                className="bg-slate-950/60 border-slate-800 focus:border-indigo-500 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="e-tags" className="text-slate-300">Tags (comma separated)</Label>
              <Input
                id="e-tags"
                value={docTags}
                onChange={(e) => setDocTags(e.target.value)}
                className="bg-slate-950/60 border-slate-800 focus:border-indigo-500 text-white"
              />
            </div>
            <div className="flex items-center space-x-2 pt-2">
              <Checkbox
                id="e-public"
                checked={docPublic}
                onCheckedChange={(checked) => setDocPublic(!!checked)}
                className="border-slate-800 data-[state=checked]:bg-indigo-600"
              />
              <Label htmlFor="e-public" className="text-sm font-medium text-slate-300 cursor-pointer">
                Mark as Public Approved
              </Label>
            </div>
            <DialogFooter className="pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setEditModalOpen(false)}
                className="border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer">Save Changes</Button>
            </DialogFooter>
          </form>
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
              {selectedDoc && selectedDoc.versions.length > 1 && (
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-slate-500 font-semibold">Version:</span>
                  <Select 
                    value={viewerVersion?.id} 
                    onValueChange={(val) => {
                      const ver = selectedDoc.versions.find(v => v.id === val);
                      if (ver) openViewer(selectedDoc, ver);
                    }}
                  >
                    <SelectTrigger className="h-8 bg-slate-950 border-slate-800 text-white text-xs w-28">
                      <SelectValue placeholder="v1" />
                    </SelectTrigger>
                    <SelectContent alignItemWithTrigger={false} className="bg-slate-900 border-slate-800 text-white">
                      {selectedDoc.versions.map(v => (
                        <SelectItem key={v.id} value={v.id} className="focus:bg-slate-850 text-xs">v{v.versionNumber}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {viewerVersion && (
                <>
                  <a
                    href={`/api/viewer?versionId=${viewerVersion.id}`}
                    target="_blank"
                    className="inline-flex items-center space-x-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-bold bg-indigo-500/5 hover:bg-indigo-500/10 px-2.5 py-1.5 rounded border border-indigo-500/15 transition-all"
                  >
                    <span>Open in New Tab</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <a
                    href={`/api/viewer?versionId=${viewerVersion.id}&download=true`}
                    className="inline-flex items-center space-x-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-bold bg-indigo-500/5 hover:bg-indigo-500/10 px-2.5 py-1.5 rounded border border-indigo-500/15 transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </a>
                </>
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
              
              if (ext === 'pdf' || ext === 'docx') {
                return (
                  <iframe
                    src={`/api/viewer?versionId=${viewerVersion.id}#toolbar=0`}
                    className="w-full h-full border-0 bg-slate-900"
                  />
                );
              }

              if (ext === 'md' || ext === 'markdown') {
                return (
                  <div className="p-8 max-w-3xl mx-auto bg-slate-950/80 border border-slate-850 rounded-xl my-6 text-slate-350 prose-custom font-sans overflow-hidden">
                    <div dangerouslySetInnerHTML={{ __html: viewerHtml || '<p className="text-center text-slate-600">No content</p>' }} />
                  </div>
                );
              }

              if (ext === 'xlsx' || ext === 'xls') {
                return (
                  <div className="h-full flex flex-col">
                    {/* Sheet Selection tabs */}
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
                    {/* Table Render */}
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
                      src={`/api/viewer?versionId=${viewerVersion.id}`}
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
                    href={`/api/viewer?versionId=${viewerVersion.id}`}
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

      {/* --- BULK FOLDER ACTION DIALOG (MOVE / COPY) --- */}
      <Dialog open={bulkFolderModalOpen} onOpenChange={(open) => {
        setBulkFolderModalOpen(open);
        if (!open) {
          setTargetDocId(null);
        }
      }}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white text-lg font-bold">
              {bulkActionType === 'move' ? 'Move' : 'Copy'} Document{targetDocId ? '' : 's'}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              {targetDocId ? (
                <>Select the destination folder for the document <strong>&quot;{documents.find(d => d.id === targetDocId)?.name}&quot;</strong>.</>
              ) : (
                <>Select the destination folder for the <strong>{selectedDocIds.length}</strong> selected document{selectedDocIds.length > 1 ? 's' : ''}.</>
              )}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleBulkFolderActionSubmit} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="text-slate-300">Target Project</Label>
              <Select value={bulkTargetProjectId} onValueChange={(val) => setBulkTargetProjectId(val || '')}>
                <SelectTrigger className="bg-slate-950/60 border-slate-800 focus:border-indigo-500 text-white transition-all">
                  <SelectValue placeholder="Select project">
                    {projects.find(p => p.id === bulkTargetProjectId)?.name || "Select project"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false} className="bg-slate-900 border-slate-800 text-white">
                  {projects.map(p => (
                    <SelectItem key={p.id} value={p.id} className="focus:bg-slate-800 cursor-pointer">{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Destination Folder</Label>
              <Select value={bulkTargetFolderId} onValueChange={(val) => setBulkTargetFolderId(val || 'root')}>
                <SelectTrigger className="bg-slate-950/60 border-slate-800 text-white">
                  <SelectValue placeholder="Select destination folder">
                    {bulkTargetFolderId === 'root' ? '[Root Folder]' : (bulkFolders.find(f => f.id === bulkTargetFolderId)?.name || "Select folder")}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false} className="bg-slate-900 border-slate-800 text-white">
                  <SelectItem value="root" className="focus:bg-slate-800">[Root Folder]</SelectItem>
                  {buildFolderSelectTree(bulkFolders).map(f => (
                    <SelectItem key={f.id} value={f.id} className="focus:bg-slate-800">
                      <span className="whitespace-pre">{f.indentName}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setBulkFolderModalOpen(false);
                  setTargetDocId(null);
                }}
                className="border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer">
                {bulkActionType === 'move' ? 'Move' : 'Copy'} Document{targetDocId ? '' : 's'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* --- ALERT DIALOG --- */}
      <Dialog open={alertDialogOpen} onOpenChange={setAlertDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white text-lg font-bold flex items-center space-x-2">
              <Info className="w-5 h-5 text-indigo-400" />
              <span>{alertTitle}</span>
            </DialogTitle>
            <DialogDescription className="text-slate-400 pt-1">
              {alertDescription}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-4">
            <Button 
              type="button" 
              onClick={() => setAlertDialogOpen(false)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer"
            >
              OK
            </Button>
          </DialogFooter>
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
              className="bg-red-600 hover:bg-red-500 text-white cursor-pointer"
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
