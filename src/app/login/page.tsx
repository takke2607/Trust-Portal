'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Shield, Eye, EyeOff, Loader2 } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/admin';
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [branding, setBranding] = useState({
    websiteName: 'Trust Center',
    portalIconUrl: ''
  });

  React.useEffect(() => {
    const fetchBranding = async () => {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const data = await res.json();
          setBranding({
            websiteName: data.websiteName || 'Trust Center',
            portalIconUrl: data.portalIconUrl || ''
          });
          document.title = `${data.tabName || 'Trust Center'} - Login`;
        }
      } catch (err) {
        console.error('Failed to load branding:', err);
      }
    };
    fetchBranding();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Authentication failed');
      } else {
        setSuccess(true);
        setTimeout(() => {
          window.location.href = callbackUrl;
        }, 800);
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-950 font-sans">
      <div className="w-full max-w-sm px-4">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-indigo-400 mb-3 select-none">
            {branding.portalIconUrl ? (
              <img src={branding.portalIconUrl} alt="Logo" className="h-6 object-contain shrink-0" />
            ) : (
              <Shield className="w-6 h-6 text-indigo-450" />
            )}
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            {branding.websiteName} Portal
          </h1>
          <p className="mt-1.5 text-xs text-slate-400">
            Sign in to manage compliance documentation
          </p>
        </div>

        <Card className="border-slate-900 bg-slate-950">
          <CardHeader>
            <CardTitle className="text-base font-bold text-white tracking-tight">Welcome Back</CardTitle>
            <CardDescription className="text-slate-400 text-xs">
              Enter your credentials to access the admin dashboard.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/10 text-red-400 text-xs font-semibold">
                  {error}
                </div>
              )}
              {success && (
                <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10 text-emerald-450 text-xs font-semibold">
                  Authentication successful! Redirecting...
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-slate-350 text-xs font-semibold uppercase tracking-wider">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@trustcenter.local"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading || success}
                  className="bg-slate-950 border-slate-900 focus:border-slate-850 text-white placeholder-slate-650 text-xs py-5 focus-visible:ring-0"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-slate-350 text-xs font-semibold uppercase tracking-wider">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading || success}
                    className="bg-slate-950 border-slate-900 focus:border-slate-850 text-white placeholder-slate-650 pr-10 text-xs py-5 focus-visible:ring-0"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loading || success}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button
                type="submit"
                disabled={loading || success}
                className="w-full bg-white hover:bg-slate-200 text-black font-semibold text-xs py-2 rounded-lg transition-colors cursor-pointer select-none"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin text-black" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
              <div className="text-center w-full">
                <a
                  href="/trust-center"
                  className="text-xs text-slate-500 hover:text-slate-300 transition-colors inline-block font-medium"
                >
                  ← Go back to Public Trust Center
                </a>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-950 text-white">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
