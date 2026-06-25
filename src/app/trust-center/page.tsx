import React from 'react';
import Link from 'next/link';
import prisma from '@/lib/db';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { 
  ShieldCheck, 
  ArrowRight, 
  Lock, 
  FileCheck,
  Clock
} from 'lucide-react';

export const revalidate = 0; // Live reload stats

export default async function PublicTrustCenterPage() {
  // Query only public, non-archived projects
  const projects = await prisma.project.findMany({
    where: {
      isPublic: true,
      isArchived: false
    },
    include: {
      documents: {
        where: {
          isDeleted: false,
          isPublicApproved: true
        }
      }
    },
    orderBy: { name: 'asc' }
  });

  // Query certifications from database
  const certifications = await prisma.certification.findMany({
    orderBy: { name: 'asc' }
  });

  return (
    <div className="w-full px-6 py-12 md:py-16 space-y-16">
      {/* Hero Banner Section */}
      <section className="space-y-4 max-w-4xl">
        <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">
          Security, Privacy &amp; Compliance Portal
        </h1>
        <p className="text-slate-400 text-sm md:text-base leading-relaxed">
          Access our real-time compliance frameworks, security certifications, and public audit documents. Click any framework below to browse public records/documents
        </p>
      </section>

      {/* Security Badges Grid */}
      {certifications.length > 0 && (
        <section className="space-y-6">
          <div className="border-b border-slate-900 pb-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
              Active Certifications &amp; Attestations
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {certifications.map((cert) => (
              <div 
                key={cert.id} 
                className="bg-slate-950 border border-slate-900 rounded-xl p-5 flex items-start space-x-3.5 transition-colors hover:border-slate-800"
              >
                <div className="p-1.5 bg-indigo-500/5 text-indigo-400 rounded-lg shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xs font-bold text-white tracking-tight">{cert.name}</h3>
                  {cert.description && (
                    <p className="text-[11px] text-slate-500 leading-normal">{cert.description}</p>
                  )}
                  <div className="pt-1.5 flex items-center space-x-1.5 text-[10px] font-bold text-emerald-450 uppercase tracking-wider select-none">
                    <span className="h-1 w-1 bg-emerald-400 rounded-full"></span>
                    <span>{cert.status}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Projects Repositories Grid */}
      <section className="space-y-6">
        <div className="border-b border-slate-900 pb-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
            Compliance Frameworks &amp; Repositories
          </h2>
        </div>
        
        {projects.length === 0 ? (
          <div className="border border-dashed border-slate-900 rounded-2xl py-16 text-center text-slate-500">
            <Lock className="w-10 h-10 text-slate-800 mx-auto mb-4" />
            <p className="text-xs font-medium text-slate-400">No public repositories are currently active</p>
            <p className="text-[11px] text-slate-600 mt-1">Please contact your administrator for custom access.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {projects.map((project) => (
              <div 
                key={project.id} 
                className="bg-slate-950 border border-slate-900 rounded-xl p-5 hover:border-indigo-500/20 transition-all flex flex-col justify-between group"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="p-2 bg-slate-900/50 rounded-lg text-slate-400">
                      <FileCheck className="w-4 h-4 text-indigo-400" />
                    </div>
                    <span className="text-[10px] text-slate-500 font-semibold bg-slate-900/40 px-2.5 py-0.5 rounded border border-slate-900">
                      {project.documents.length} approved {project.documents.length === 1 ? 'doc' : 'docs'}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="text-sm font-bold text-white tracking-tight group-hover:text-indigo-400 transition-colors">
                      {project.name}
                    </h3>
                    <p className="text-xs text-slate-400 leading-normal line-clamp-2">
                      {project.description || 'Access approved audit and framework documentation.'}
                    </p>
                  </div>
                </div>
                
                <div className="pt-6">
                  <Link
                    href={`/trust-center/projects/${project.id}`}
                    className="inline-flex items-center space-x-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-semibold tracking-tight"
                  >
                    <span>Browse Repository</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
