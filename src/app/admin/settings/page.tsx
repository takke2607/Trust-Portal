'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { 
  Settings, 
  Save, 
  Image as ImageIcon, 
  Globe, 
  FileText, 
  Loader2, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';

export default function PortalSettingsPage() {
  const [websiteName, setWebsiteName] = useState('');
  const [tabName, setTabName] = useState('');
  const [portalIconUrl, setPortalIconUrl] = useState('');
  const [footerText, setFooterText] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setWebsiteName(data.websiteName || '');
        setTabName(data.tabName || '');
        setPortalIconUrl(data.portalIconUrl || '');
        setFooterText(data.footerText || '');
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load system branding settings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);
    setError('');

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          websiteName,
          tabName,
          portalIconUrl,
          footerText
        })
      });

      if (res.ok) {
        setSuccess(true);
        // Dispatch custom event to notify layout sidebar to reload settings instantly
        window.dispatchEvent(new Event('portal-settings-updated'));
        setTimeout(() => setSuccess(false), 3000);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to save settings.');
      }
    } catch (err) {
      console.error(err);
      setError('An unexpected error occurred while saving.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {success && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-start space-x-3 animate-in fade-in duration-200">
          <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-white">Settings saved successfully</p>
            <p className="text-xs text-emerald-400/80">Portal branding and layout modifications have been updated globally.</p>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-start space-x-3 animate-in fade-in duration-200">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-white">Branding error</p>
            <p className="text-xs text-red-400/80">{error}</p>
          </div>
        </div>
      )}

      <Card className="border-slate-900 bg-slate-900/40 backdrop-blur-md">
        <CardHeader className="border-b border-slate-900 pb-4">
          <div className="flex items-center space-x-2 text-indigo-400">
            <Settings className="w-5 h-5" />
            <CardTitle className="text-base font-bold text-white">Portal Branding & Settings</CardTitle>
          </div>
          <CardDescription className="text-xs text-slate-400">
            Customize the logos, titles, and attribution details across the entire enterprise Trust Center portal.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Website name */}
                <div className="space-y-2">
                  <Label htmlFor="s-webname" className="text-slate-350 flex items-center space-x-1.5 text-xs font-semibold">
                    <Globe className="w-3.5 h-3.5 text-slate-400" />
                    <span>Website Name</span>
                  </Label>
                  <Input
                    id="s-webname"
                    placeholder="e.g. Enterprise Trust Center"
                    value={websiteName}
                    onChange={(e) => setWebsiteName(e.target.value)}
                    className="bg-slate-950/60 border-slate-800 focus:border-indigo-500 text-white placeholder-slate-600"
                    required
                  />
                  <p className="text-[10px] text-slate-500">Displayed in headers and sidebars on both admin and visitor portals.</p>
                </div>

                {/* Tab name */}
                <div className="space-y-2">
                  <Label htmlFor="s-tabname" className="text-slate-350 flex items-center space-x-1.5 text-xs font-semibold">
                    <Globe className="w-3.5 h-3.5 text-slate-400" />
                    <span>Browser Tab Name</span>
                  </Label>
                  <Input
                    id="s-tabname"
                    placeholder="e.g. Acme Systems Pvt Ltd"
                    value={tabName}
                    onChange={(e) => setTabName(e.target.value)}
                    className="bg-slate-950/60 border-slate-800 focus:border-indigo-500 text-white placeholder-slate-600"
                    required
                  />
                  <p className="text-[10px] text-slate-500">Controls the main title string loaded inside the browser tab.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Icon URL */}
                <div className="space-y-2">
                  <Label htmlFor="s-icon" className="text-slate-350 flex items-center space-x-1.5 text-xs font-semibold">
                    <ImageIcon className="w-3.5 h-3.5 text-slate-400" />
                    <span>Portal Icon / Logo URL</span>
                  </Label>
                  <Input
                    id="s-icon"
                    placeholder="e.g. https://domain.com/logo.png"
                    value={portalIconUrl}
                    onChange={(e) => setPortalIconUrl(e.target.value)}
                    className="bg-slate-950/60 border-slate-800 focus:border-indigo-500 text-white placeholder-slate-600"
                  />
                  <p className="text-[10px] text-slate-500">URL path pointing to your enterprise brand logo (replaces the default shield check).</p>
                </div>

                {/* Preview Box */}
                <div className="space-y-2">
                  <Label className="text-slate-350 flex items-center space-x-1.5 text-xs font-semibold">
                    <span>Branding Logo Preview</span>
                  </Label>
                  <div className="h-10.5 rounded-lg border border-dashed border-slate-800 bg-slate-950/20 flex items-center px-4">
                    {portalIconUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={portalIconUrl}
                        alt="Logo Preview"
                        className="max-h-6 object-contain"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <span className="text-[10px] text-slate-600">No logo URL configured (using default shield check icon)</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer text */}
              <div className="space-y-2">
                <Label htmlFor="s-footer" className="text-slate-350 flex items-center space-x-1.5 text-xs font-semibold">
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  <span>Footer Attribution Text</span>
                </Label>
                <Input
                  id="s-footer"
                  placeholder="e.g. Trust Center Portal. Acme Systems Pvt Ltd."
                  value={footerText}
                  onChange={(e) => setFooterText(e.target.value)}
                  className="bg-slate-950/60 border-slate-800 focus:border-indigo-500 text-white placeholder-slate-600"
                  required
                />
                <p className="text-[10px] text-slate-500">Attribution copyright text displayed at the bottom of the public visitor layout.</p>
              </div>

              <div className="pt-4 border-t border-slate-900 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs h-10 px-5 transition-colors cursor-pointer select-none disabled:opacity-50 disabled:pointer-events-none shadow-sm active:translate-y-px space-x-2"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 shrink-0" />
                      <span>Save Config</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
