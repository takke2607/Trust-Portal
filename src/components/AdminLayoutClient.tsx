'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, 
  FolderTree, 
  FileText, 
  KeyRound, 
  Users, 
  Database, 
  History, 
  LogOut, 
  ExternalLink,
  Shield,
  Menu,
  X,
  Settings
} from 'lucide-react';

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
}

interface AdminLayoutClientProps {
  user: User;
  children: React.ReactNode;
}

export default function AdminLayoutClient({ user, children }: AdminLayoutClientProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [branding, setBranding] = useState({
    websiteName: 'Trust Center',
    portalIconUrl: ''
  });

  const fetchBranding = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setBranding({
          websiteName: data.websiteName || 'Trust Center',
          portalIconUrl: data.portalIconUrl || ''
        });
        document.title = `${data.tabName || 'Trust Center'} - Admin`;
        
        // Update favicon dynamically if portalIconUrl is provided
        if (data.portalIconUrl) {
          let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
          if (!link) {
            link = document.createElement('link');
            link.rel = 'icon';
            document.getElementsByTagName('head')[0].appendChild(link);
          }
          link.href = data.portalIconUrl;
        }
      }
    } catch (err) {
      console.error('Failed to load branding:', err);
    }
  };

  React.useEffect(() => {
    fetchBranding();
    
    // Listen to custom settings updated event to reload branding instantly
    const handleSettingsUpdate = () => {
      fetchBranding();
    };
    window.addEventListener('portal-settings-updated', handleSettingsUpdate);
    return () => {
      window.removeEventListener('portal-settings-updated', handleSettingsUpdate);
    };
  }, []);

  const handleLogout = async () => {
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      if (res.ok) {
        router.push('/login');
        router.refresh();
      }
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const navItems = [
    { name: 'Overview', href: '/admin', icon: LayoutDashboard, role: 'all' },
    { name: 'Projects & Folders', href: '/admin/projects', icon: FolderTree, role: 'all' },
    { name: 'Document Manager', href: '/admin/documents', icon: FileText, role: 'all' },
    { name: 'Access Requests', href: '/admin/requests', icon: KeyRound, role: 'all' },
    { name: 'Certifications', href: '/admin/certifications', icon: Shield, role: 'ADMIN' },
    { name: 'User Management', href: '/admin/users', icon: Users, role: 'ADMIN' },
    { name: 'Portal Settings', href: '/admin/settings', icon: Settings, role: 'ADMIN' },
    { name: 'Backup & Restore', href: '/admin/backup', icon: Database, role: 'ADMIN' },
    { name: 'Audit Logs', href: '/admin/logs', icon: History, role: 'ADMIN' },
  ];

  const filteredNavItems = navItems.filter(item => item.role === 'all' || item.role === user.role);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-slate-950 border-b border-slate-900 md:hidden z-20">
        <div className="flex items-center space-x-2 text-indigo-400 font-bold text-base">
          {branding.portalIconUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={branding.portalIconUrl} alt="Logo" className="h-5 object-contain shrink-0 -translate-y-[1px]" />
          ) : (
            <Shield className="w-5 h-5 text-indigo-455 shrink-0" />
          )}
          <span>{branding.websiteName} Admin</span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="text-slate-400 hover:text-white transition-colors"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Sidebar Navigation */}
      <aside className={`
        fixed inset-y-0 left-0 transform ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        md:relative md:translate-x-0 transition-transform duration-300 ease-in-out
        w-60 bg-slate-950 border-r border-slate-900 flex flex-col justify-between z-30 md:z-10
        pt-16 md:pt-0 select-none
      `}>
        <div>
          {/* Logo */}
          <div className="hidden md:flex items-center space-x-2 px-6 py-5 border-b border-slate-900 text-indigo-400">
            {branding.portalIconUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={branding.portalIconUrl} alt="Logo" className="h-5 object-contain shrink-0 -translate-y-[1px]" />
            ) : (
              <Shield className="w-5 h-5 text-indigo-455 shrink-0" />
            )}
            <span className="font-bold text-sm tracking-tight text-white">{branding.websiteName}</span>
          </div>

          {/* Navigation Items */}
          <nav className="mt-6 px-3 space-y-1">
            {filteredNavItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`
                    flex items-center space-x-2.5 px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all group
                    ${isActive 
                      ? 'bg-slate-900 text-white border border-slate-800' 
                      : 'text-slate-400 hover:bg-slate-900/30 hover:text-slate-200'}
                  `}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-450' : 'text-slate-500 group-hover:text-slate-350'}`} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Card & Logout */}
        <div className="p-4 border-t border-slate-900 bg-slate-950/40">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center font-bold text-xs text-white uppercase shrink-0">
              {user.name ? user.name.substring(0, 2) : user.email.substring(0, 2)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{user.name || 'Admin User'}</p>
              <div className="flex items-center space-x-1.5 mt-0.5">
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-slate-900 border border-slate-850 text-slate-450">
                  {user.role === 'ADMIN' ? 'Admin' : 'Manager'}
                </span>
                <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
              </div>
            </div>
          </div>

          <div className="flex space-x-2">
            <Link
              href="/trust-center"
              target="_blank"
              className="flex-1 flex items-center justify-center space-x-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-850 text-[11px] font-semibold rounded-lg text-slate-350 hover:text-white transition-colors"
            >
              <span>Portal</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center justify-center px-3 py-2 bg-slate-900 hover:bg-red-950/20 border border-slate-850 hover:border-red-900/20 text-slate-400 hover:text-red-400 rounded-lg transition-all cursor-pointer"
              title="Logout"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 min-h-screen">
        <header className="hidden md:flex items-center justify-between px-8 py-5 border-b border-slate-900 bg-slate-950/50 backdrop-blur">
          <div>
            <h2 className="text-sm font-bold text-white tracking-tight">
              {pathname === '/admin' ? 'Dashboard Overview' : 
               pathname === '/admin/projects' ? 'Project Frameworks' : 
               pathname === '/admin/documents' ? 'Document Registry' : 
               pathname === '/admin/requests' ? 'Access Requests' : 
               pathname === '/admin/settings' ? 'Portal Settings' : 
               pathname === '/admin/users' ? 'User Accounts' : 
               pathname === '/admin/backup' ? 'Backup & Disaster Recovery' : 
               pathname === '/admin/logs' ? 'Security Audit Logs' : 'Admin Panel'}
            </h2>
          </div>
          <div className="flex items-center space-x-4">
            <Link
              href="/trust-center"
              target="_blank"
              className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-350 hover:text-white transition-colors bg-slate-900 hover:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-850"
            >
              <span>View Public Trust Center</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </header>

        {/* Content Children wrapper */}
        <div className="flex-1 p-6 md:p-8 overflow-y-auto w-full">
          {children}
        </div>
      </main>
    </div>
  );
}
