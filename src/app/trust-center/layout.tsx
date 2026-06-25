'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShieldCheck, LayoutDashboard, LogIn, Menu, X } from 'lucide-react';

export default function TrustCenterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [settings, setSettings] = useState({
    websiteName: 'Trust Center',
    tabName: 'Trust Center',
    portalIconUrl: '',
    footerText: 'Trust Center Portal. All rights reserved.'
  });

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
        document.title = data.tabName || 'Trust Center';
        
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
      console.error('Failed to fetch settings:', err);
    }
  };

  useEffect(() => {
    fetchSettings();
    
    // Listen to custom settings updated event to reload branding instantly
    const handleSettingsUpdate = () => {
      fetchSettings();
    };
    window.addEventListener('portal-settings-updated', handleSettingsUpdate);
    return () => {
      window.removeEventListener('portal-settings-updated', handleSettingsUpdate);
    };
  }, []);

  const navigation = [
    {
      name: 'Dashboard',
      href: '/trust-center',
      icon: LayoutDashboard,
      active: pathname === '/trust-center' || pathname.startsWith('/trust-center/projects'),
    },
    {
      name: 'User Login',
      href: '/login',
      icon: LogIn,
      active: pathname === '/login',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col md:flex-row font-sans">
      {/* Mobile Top Header */}
      <header className="md:hidden relative z-40 flex items-center justify-between px-6 py-4 border-b border-slate-900 bg-slate-950/80 backdrop-blur w-full">
        <Link href="/trust-center" className="flex items-center space-x-2 text-indigo-400 font-semibold text-base">
          {settings.portalIconUrl ? (
            <img src={settings.portalIconUrl} alt="Logo" className="h-5 object-contain shrink-0 -translate-y-[1px]" />
          ) : (
            <ShieldCheck className="w-5 h-5" />
          )}
          <span className="text-white font-bold tracking-tight">{settings.websiteName}</span>
        </Link>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="text-slate-400 hover:text-white focus:outline-none"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-60 bg-slate-950/95 border-r border-slate-900 relative z-30 shrink-0 select-none">
        <div className="px-6 py-5 border-b border-slate-900 flex items-center space-x-2 text-indigo-400">
          {settings.portalIconUrl ? (
            <img src={settings.portalIconUrl} alt="Logo" className="h-5 object-contain shrink-0 -translate-y-[1px]" />
          ) : (
            <ShieldCheck className="w-5 h-5 text-indigo-450" />
          )}
          <span className="text-white font-bold text-sm tracking-tight">{settings.websiteName}</span>
        </div>
        <nav className="flex-1 px-3 py-6 space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`
                  flex items-center space-x-2.5 px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all duration-150 group
                  ${item.active 
                    ? 'bg-slate-900 text-white border border-slate-800' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'}
                `}
              >
                <Icon className={`w-4 h-4 shrink-0 ${item.active ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-350'}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Sidebar - Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-slate-950/98 flex flex-col">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-900">
            <span className="text-white font-bold tracking-tight flex items-center space-x-2 text-sm">
              {settings.portalIconUrl ? (
                <img src={settings.portalIconUrl} alt="Logo" className="h-5 object-contain shrink-0 -translate-y-[1px]" />
              ) : (
                <ShieldCheck className="w-5 h-5 text-indigo-400" />
              )}
              <span>{settings.websiteName}</span>
            </span>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="text-slate-400 hover:text-white focus:outline-none"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <nav className="flex-1 px-6 py-8 space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`
                    flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-150
                    ${item.active 
                      ? 'bg-slate-900 text-white' 
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'}
                  `}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
          <div className="p-6 border-t border-slate-900 text-center">
            <p className="text-xs text-slate-500 mb-2">© {new Date().getFullYear()} {settings.websiteName}</p>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative z-10 min-w-0 overflow-y-auto">
        <div className="flex-1">
          {children}
        </div>
        {/* Footer */}
        <footer className="border-t border-slate-900/60 bg-slate-950/40 py-6 px-6 md:px-12">
          <div className="max-w-5xl mx-auto text-center text-xs text-slate-500 font-medium">
            <p>{settings.footerText}</p>
          </div>
        </footer>
      </main>
    </div>
  );
}
