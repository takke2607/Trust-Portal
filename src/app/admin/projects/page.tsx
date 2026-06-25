'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  FolderTree, 
  Folder, 
  FolderPlus, 
  Plus, 
  Trash2, 
  Edit, 
  ChevronRight, 
  ChevronDown, 
  Move, 
  Globe, 
  Lock, 
  Loader2,
  Archive
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Project {
  id: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  isArchived: boolean;
}

interface DBFolder {
  id: string;
  name: string;
  projectId: string;
  parentId: string | null;
}

export default function ProjectsPage() {
  // State
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [folders, setFolders] = useState<DBFolder[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingFolders, setLoadingFolders] = useState(false);
  
  // Collapsed folders state
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});

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

  // Modals state
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [editProjectOpen, setEditProjectOpen] = useState(false);
  const [folderModalOpen, setFolderModalOpen] = useState(false); // Add/Edit Folder
  const [moveFolderOpen, setMoveFolderOpen] = useState(false);

  // Form states
  const [projectName, setProjectName] = useState('');
  const [projectDesc, setProjectDesc] = useState('');
  const [projectPublic, setProjectPublic] = useState(false);
  const [projectArchived, setProjectArchived] = useState(false);

  const [folderAction, setFolderAction] = useState<'create' | 'edit'>('create');
  const [folderName, setFolderName] = useState('');
  const [targetFolder, setTargetFolder] = useState<DBFolder | null>(null); // For subfolder parent or folder being edited
  const [newParentId, setNewParentId] = useState<string>('root');

  // Fetch projects
  const fetchProjects = async () => {
    setLoadingProjects(true);
    try {
      const res = await fetch('/api/projects');
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
        if (data.length > 0 && !selectedProject) {
          setSelectedProject(data[0]);
        } else if (selectedProject) {
          const updated = data.find((p: Project) => p.id === selectedProject.id);
          setSelectedProject(updated || data[0] || null);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingProjects(false);
    }
  };

  // Fetch folders for selected project
  const fetchFolders = async (projectId: string) => {
    setLoadingFolders(true);
    try {
      const res = await fetch(`/api/folders?projectId=${projectId}`);
      if (res.ok) {
        const data = await res.json();
        setFolders(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingFolders(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      fetchFolders(selectedProject.id);
    } else {
      setFolders([]);
    }
  }, [selectedProject?.id]);

  // Project Actions
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName) return;
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: projectName, description: projectDesc, isPublic: projectPublic })
      });
      if (res.ok) {
        const p = await res.json();
        setCreateProjectOpen(false);
        setProjectName('');
        setProjectDesc('');
        setProjectPublic(false);
        await fetchProjects();
        setSelectedProject(p);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !projectName) return;
    try {
      const res = await fetch(`/api/projects/${selectedProject.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: projectName, 
          description: projectDesc, 
          isPublic: projectPublic,
          isArchived: projectArchived
        })
      });
      if (res.ok) {
        setEditProjectOpen(false);
        await fetchProjects();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteProject = async () => {
    if (!selectedProject) return;
    triggerConfirm(
      "Delete Project",
      `Are you sure you want to permanently delete the project "${selectedProject.name}" and all its contents? This action cannot be undone.`,
      async () => {
        try {
          const res = await fetch(`/api/projects/${selectedProject.id}`, { method: 'DELETE' });
          if (res.ok) {
            setSelectedProject(null);
            await fetchProjects();
          }
        } catch (err) {
          console.error(err);
        }
      }
    );
  };

  // Folder Actions
  const handleFolderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !folderName) return;

    try {
      if (folderAction === 'create') {
        const res = await fetch('/api/folders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: folderName,
            projectId: selectedProject.id,
            parentId: targetFolder?.id || null
          })
        });
        if (res.ok) {
          setFolderModalOpen(false);
          setFolderName('');
          fetchFolders(selectedProject.id);
        }
      } else {
        // Edit action
        if (!targetFolder) return;
        const res = await fetch(`/api/folders/${targetFolder.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: folderName })
        });
        if (res.ok) {
          setFolderModalOpen(false);
          setFolderName('');
          fetchFolders(selectedProject.id);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteFolder = async (folder: DBFolder) => {
    triggerConfirm(
      "Delete Folder",
      `Delete folder "${folder.name}" and all nested subfolders/documents? This action cannot be undone.`,
      async () => {
        try {
          const res = await fetch(`/api/folders/${folder.id}`, { method: 'DELETE' });
          if (res.ok) {
            fetchFolders(folder.projectId);
          }
        } catch (err) {
          console.error(err);
        }
      }
    );
  };

  const handleMoveFolderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetFolder) return;
    try {
      const res = await fetch(`/api/folders/${targetFolder.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parentId: newParentId === 'root' ? null : newParentId })
      });
      if (res.ok) {
        setMoveFolderOpen(false);
        fetchFolders(targetFolder.projectId);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const toggleCollapse = (folderId: string) => {
    setCollapsedFolders(prev => ({
      ...prev,
      [folderId]: !prev[folderId]
    }));
  };

  // Build tree structures locally from flat list
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

  // Recursive tree render helper
  const renderFolderNode = (folder: DBFolder, depth = 0) => {
    const childs = getSubFolders(folder.id);
    const isCollapsed = collapsedFolders[folder.id];
    
    return (
      <div key={folder.id} className="space-y-1.5">
        <div 
          className="flex items-center justify-between p-2 rounded-lg bg-slate-900/40 hover:bg-slate-800/40 border border-slate-800/50 group transition-all"
          style={{ marginLeft: `${depth * 20}px` }}
        >
          <div className="flex items-center space-x-2 min-w-0">
            {childs.length > 0 ? (
              <button 
                onClick={() => toggleCollapse(folder.id)}
                className="p-0.5 text-slate-500 hover:text-slate-200 transition-colors"
              >
                {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            ) : (
              <div className="w-5" />
            )}
            <Folder className="w-4.5 h-4.5 text-indigo-400 shrink-0" />
            <span className="text-sm font-medium truncate text-slate-200">{folder.name}</span>
          </div>

          <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => {
                setFolderAction('create');
                setTargetFolder(folder);
                setFolderName('');
                setFolderModalOpen(true);
              }}
              className="p-1 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded transition-all cursor-pointer"
              title="Add Subfolder"
            >
              <FolderPlus className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                setFolderAction('edit');
                setTargetFolder(folder);
                setFolderName(folder.name);
                setFolderModalOpen(true);
              }}
              className="p-1 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded transition-all cursor-pointer"
              title="Rename Folder"
            >
              <Edit className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                setTargetFolder(folder);
                setNewParentId(folder.parentId || 'root');
                setMoveFolderOpen(true);
              }}
              className="p-1 text-slate-400 hover:text-teal-400 hover:bg-slate-800 rounded transition-all cursor-pointer"
              title="Move Folder"
            >
              <Move className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleDeleteFolder(folder)}
              className="p-1 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded transition-all cursor-pointer"
              title="Delete Folder"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {childs.length > 0 && !isCollapsed && (
          <div className="space-y-1.5">
            {childs.map(child => renderFolderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      {/* Left Column: Projects List */}
      <div className="md:col-span-1 space-y-6">
        <Card className="border-slate-900 bg-slate-900/40 backdrop-blur-md">
          <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-slate-900">
            <div>
              <CardTitle className="text-base font-bold text-white">Projects</CardTitle>
              <CardDescription className="text-xs text-slate-400">Select compliance framework</CardDescription>
            </div>
            <Button
              size="sm"
              onClick={() => {
                setProjectName('');
                setProjectDesc('');
                setProjectPublic(false);
                setCreateProjectOpen(true);
              }}
              className="bg-indigo-600 hover:bg-indigo-500 text-white flex items-center space-x-1.5 text-xs px-2.5 h-8 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add</span>
            </Button>
          </CardHeader>
          <CardContent className="pt-4 px-2.5">
            {loadingProjects ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
              </div>
            ) : projects.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-sm">
                No compliance frameworks created yet.
              </div>
            ) : (
              <div className="space-y-1">
                {projects.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => setSelectedProject(project)}
                    className={`
                      w-full text-left px-4 py-3 rounded-lg flex items-center justify-between transition-all cursor-pointer
                      ${selectedProject?.id === project.id 
                        ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20' 
                        : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200 border border-transparent'}
                    `}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate text-white">{project.name}</p>
                      <p className="text-xs text-slate-500 truncate mt-0.5">{project.description || 'No description'}</p>
                    </div>
                    <div className="flex items-center space-x-1 shrink-0 ml-2">
                      {project.isPublic ? (
                        <span title="Publicly Visible"><Globe className="w-3.5 h-3.5 text-emerald-400" /></span>
                      ) : (
                        <span title="Private"><Lock className="w-3.5 h-3.5 text-slate-500" /></span>
                      )}
                      {project.isArchived && (
                        <span title="Archived"><Archive className="w-3.5 h-3.5 text-amber-500" /></span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Right Column: Selected Project Detail & Folders */}
      <div className="md:col-span-2 space-y-6">
        {selectedProject ? (
          <>
            {/* Project Header details card */}
            <Card className="border-slate-900 bg-slate-900/40 backdrop-blur-md">
              <CardContent className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <h2 className="text-lg font-bold text-white tracking-wide">{selectedProject.name}</h2>
                    <span className={`
                      px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider
                      ${selectedProject.isPublic ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-400 border border-slate-700'}
                    `}>
                      {selectedProject.isPublic ? 'Public' : 'Private'}
                    </span>
                    {selectedProject.isArchived && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        Archived
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-400">{selectedProject.description || 'No description provided.'}</p>
                </div>
                <div className="flex items-center space-x-2 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setProjectName(selectedProject.name);
                      setProjectDesc(selectedProject.description || '');
                      setProjectPublic(selectedProject.isPublic);
                      setProjectArchived(selectedProject.isArchived);
                      setEditProjectOpen(true);
                    }}
                    className="border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white text-xs h-9 cursor-pointer"
                  >
                    Edit Info
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={handleDeleteProject}
                    className="bg-red-950/20 border border-red-500/20 text-red-400 hover:bg-red-900/30 text-xs h-9 cursor-pointer"
                  >
                    Delete Project
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Folders tree editor */}
            <Card className="border-slate-900 bg-slate-900/40 backdrop-blur-md">
              <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-slate-900">
                <div>
                  <CardTitle className="text-base font-bold text-white">Folder Tree</CardTitle>
                  <CardDescription className="text-xs text-slate-400">Hierarchical folder structure editor</CardDescription>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    setFolderAction('create');
                    setTargetFolder(null);
                    setFolderName('');
                    setFolderModalOpen(true);
                  }}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white flex items-center space-x-1.5 text-xs px-2.5 h-8 cursor-pointer"
                >
                  <FolderPlus className="w-4 h-4" />
                  <span>Add Root Folder</span>
                </Button>
              </CardHeader>
              <CardContent className="pt-6">
                {loadingFolders ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                  </div>
                ) : folders.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 text-sm border-2 border-dashed border-slate-800 rounded-xl">
                    <FolderTree className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <span>No folders created. Add a root folder to get started.</span>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {getSubFolders(null).map(rootFolder => renderFolderNode(rootFolder))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        ) : (
          <Card className="border-slate-900 bg-slate-900/40 backdrop-blur-md border-dashed border-2">
            <CardContent className="flex flex-col items-center justify-center py-24 text-slate-500">
              <FolderTree className="w-12 h-12 text-slate-700 mb-4 animate-pulse" />
              <p className="text-base font-semibold text-slate-400">No framework selected</p>
              <p className="text-xs text-slate-500 mt-1">Select a compliance framework or add a new one to manage directories.</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* --- CREATE PROJECT MODAL --- */}
      <Dialog open={createProjectOpen} onOpenChange={setCreateProjectOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100">
          <DialogHeader>
            <DialogTitle className="text-white text-lg font-bold">Create Compliance Project</DialogTitle>
            <DialogDescription className="text-slate-400">Add a new standard framework program (e.g. SOC2, ISO 27001).</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateProject} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="create-p-name" className="text-slate-300">Project Name</Label>
              <Input
                id="create-p-name"
                placeholder="ISO 27001 Compliance"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="bg-slate-950/60 border-slate-800 focus:border-indigo-500 text-white placeholder-slate-600"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-p-desc" className="text-slate-300">Description</Label>
              <Input
                id="create-p-desc"
                placeholder="International Information Security standard audit documentation"
                value={projectDesc}
                onChange={(e) => setProjectDesc(e.target.value)}
                className="bg-slate-950/60 border-slate-800 focus:border-indigo-500 text-white placeholder-slate-600"
              />
            </div>
            <div className="flex items-center space-x-2 pt-2">
              <Checkbox
                id="create-p-public"
                checked={projectPublic}
                onCheckedChange={(checked) => setProjectPublic(!!checked)}
                className="border-slate-800 data-[state=checked]:bg-indigo-600"
              />
              <Label htmlFor="create-p-public" className="text-sm font-medium text-slate-300 cursor-pointer">
                Mark Publicly Visible (No Auth required to read)
              </Label>
            </div>
            <DialogFooter className="pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setCreateProjectOpen(false)}
                className="border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer">Create Project</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* --- EDIT PROJECT MODAL --- */}
      <Dialog open={editProjectOpen} onOpenChange={setEditProjectOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100">
          <DialogHeader>
            <DialogTitle className="text-white text-lg font-bold">Edit Project Information</DialogTitle>
            <DialogDescription className="text-slate-400">Modify details of this compliance framework program.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditProject} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="edit-p-name" className="text-slate-300">Project Name</Label>
              <Input
                id="edit-p-name"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="bg-slate-950/60 border-slate-800 focus:border-indigo-500 text-white"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-p-desc" className="text-slate-300">Description</Label>
              <Input
                id="edit-p-desc"
                value={projectDesc}
                onChange={(e) => setProjectDesc(e.target.value)}
                className="bg-slate-950/60 border-slate-800 focus:border-indigo-500 text-white"
              />
            </div>
            <div className="flex items-center space-x-2 pt-2">
              <Checkbox
                id="edit-p-public"
                checked={projectPublic}
                onCheckedChange={(checked) => setProjectPublic(!!checked)}
                className="border-slate-800 data-[state=checked]:bg-indigo-600"
              />
              <Label htmlFor="edit-p-public" className="text-sm font-medium text-slate-300 cursor-pointer">
                Mark Publicly Visible
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="edit-p-archived"
                checked={projectArchived}
                onCheckedChange={(checked) => setProjectArchived(!!checked)}
                className="border-slate-800 data-[state=checked]:bg-amber-600"
              />
              <Label htmlFor="edit-p-archived" className="text-sm font-medium text-slate-300 cursor-pointer">
                Archive Project (Hides from list, keeps database contents)
              </Label>
            </div>
            <DialogFooter className="pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setEditProjectOpen(false)}
                className="border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer">Save Changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* --- ADD/EDIT FOLDER MODAL --- */}
      <Dialog open={folderModalOpen} onOpenChange={setFolderModalOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100">
          <DialogHeader>
            <DialogTitle className="text-white text-lg font-bold">
              {folderAction === 'create' ? 'Add Folder' : 'Rename Folder'}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              {folderAction === 'create' 
                ? `Create a folder ${targetFolder ? `nested inside "${targetFolder.name}"` : 'at the root level'}.` 
                : `Enter a new name for "${targetFolder?.name}".`}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleFolderSubmit} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="f-name" className="text-slate-300">Folder Name</Label>
              <Input
                id="f-name"
                placeholder="Audit Reports 2026"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                className="bg-slate-950/60 border-slate-800 focus:border-indigo-500 text-white placeholder-slate-600"
                required
              />
            </div>
            <DialogFooter className="pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setFolderModalOpen(false)}
                className="border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer">
                {folderAction === 'create' ? 'Create Folder' : 'Rename'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* --- MOVE FOLDER MODAL --- */}
      <Dialog open={moveFolderOpen} onOpenChange={setMoveFolderOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100">
          <DialogHeader>
            <DialogTitle className="text-white text-lg font-bold">Move Folder</DialogTitle>
            <DialogDescription className="text-slate-400">
              Select the new parent location for folder &quot;{targetFolder?.name}&quot;.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleMoveFolderSubmit} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="text-slate-300">New Parent Location</Label>
              <Select value={newParentId} onValueChange={(val) => setNewParentId(val || 'root')}>
                <SelectTrigger className="bg-slate-950/60 border-slate-800 text-white">
                  <SelectValue placeholder="Select location">
                    {newParentId === 'root' ? '[Root Level]' : (folders.find(f => f.id === newParentId)?.name || "Select location")}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false} className="bg-slate-900 border-slate-800 text-white">
                  <SelectItem value="root" className="focus:bg-slate-800">
                    [Root Level]
                  </SelectItem>
                  {buildFolderSelectTree(folders)
                    // Filter out folder itself to avoid self-nesting
                    .filter(f => f.id !== targetFolder?.id)
                    .map(f => (
                      <SelectItem key={f.id} value={f.id} className="focus:bg-slate-800">
                        <span className="whitespace-pre">{f.indentName}</span>
                      </SelectItem>
                    ))
                  }
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setMoveFolderOpen(false)}
                className="border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer">Move Folder</Button>
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
