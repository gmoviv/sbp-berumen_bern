"use client";

import { X, User, Brain, Target, Zap, MessageSquare, Globe, ShieldAlert, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PersonaDossierProps {
  persona: any;
  onClose: () => void;
}

export function PersonaDossier({ persona, onClose }: PersonaDossierProps) {
  if (!persona) return null;

  const metadata = persona.metadata || {};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
      <div className="bg-[#09090b] border border-white/10 rounded-[2.5rem] w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col shadow-[0_0_50px_rgba(79,70,229,0.15)] animate-scale-in">
        
        {/* Header - Executive Style */}
        <div className="p-8 border-b border-white/5 flex items-start justify-between bg-gradient-to-br from-indigo-500/10 via-transparent to-transparent">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px] font-black tracking-[0.2em] uppercase">
                    {persona.cluster}
                </span>
                <span className="text-zinc-600 text-[10px] font-mono tracking-tighter uppercase">{persona.id}</span>
            </div>
            <h2 className="text-4xl font-black text-white tracking-tighter uppercase">{persona.name}</h2>
            <p className="text-zinc-400 text-lg font-medium italic">{persona.role}</p>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-white/5 rounded-full transition-colors group">
            <X className="w-8 h-8 text-zinc-500 group-hover:text-white transition-colors" />
          </button>
        </div>

        {/* Content - Multi-column Executive Summary */}
        <div className="flex-1 overflow-y-auto p-10 space-y-12">
          
          {/* Top Section: Synthesis & Demographics */}
          <div className="grid lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2 space-y-6">
                <div className="flex items-center gap-2 text-indigo-400">
                    <Sparkles className="w-5 h-5" />
                    <h3 className="text-xs font-black uppercase tracking-[0.3em]">Síntesis Ejecutiva</h3>
                </div>
                <p className="text-xl text-zinc-300 leading-relaxed font-medium">
                    {metadata.strategic_synthesis || "Analizando el núcleo estratégico de esta persona..."}
                </p>
                
                <div className="pt-4 grid sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                        <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-2">Ubicación</span>
                        <span className="text-white font-bold flex items-center gap-2">
                            <Globe className="w-4 h-4 text-indigo-500" />
                            {metadata.city || "Nacional"}
                        </span>
                    </div>
                </div>
            </div>

            <div className="space-y-6 bg-white/[0.02] border border-white/5 rounded-3xl p-6">
                <div className="flex items-center gap-2 text-zinc-400">
                    <User className="w-4 h-4" />
                    <h3 className="text-xs font-black uppercase tracking-[0.2em]">Demografía</h3>
                </div>
                <ul className="space-y-3">
                    {(metadata.demographics || []).map((d: string, i: number) => (
                    <li key={i} className="text-xs text-zinc-400 leading-tight flex gap-2">
                        <span className="text-indigo-500 font-black">•</span> {d}
                    </li>
                    ))}
                </ul>
            </div>
          </div>

          {/* Middle Section: Psychographics (Pains & Motivations) */}
          <div className="grid md:grid-cols-2 gap-10">
            <section className="space-y-6">
                <div className="flex items-center gap-2 text-amber-400">
                    <Zap className="w-5 h-5" />
                    <h3 className="text-xs font-black uppercase tracking-[0.3em]">Psicografía: Dolores</h3>
                </div>
                <div className="space-y-3">
                    {(metadata.pains || []).map((p: string, i: number) => (
                    <div key={i} className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10 text-sm text-zinc-300">
                        {p}
                    </div>
                    ))}
                </div>
            </section>

            <section className="space-y-6">
                <div className="flex items-center gap-2 text-emerald-400">
                    <Target className="w-5 h-5" />
                    <h3 className="text-xs font-black uppercase tracking-[0.3em]">Psicografía: Metas</h3>
                </div>
                <div className="space-y-3">
                    {(metadata.goals || []).map((g: string, i: number) => (
                    <div key={i} className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 text-sm text-zinc-300">
                        {g}
                    </div>
                    ))}
                </div>
            </section>
          </div>

          {/* Bottom Section: Objections & Regional Context */}
          <div className="grid md:grid-cols-2 gap-10 pt-6 border-t border-white/5">
             <section className="space-y-6">
                <div className="flex items-center gap-2 text-red-400">
                    <ShieldAlert className="w-5 h-5" />
                    <h3 className="text-xs font-black uppercase tracking-[0.3em]">Barreras de Decisión</h3>
                </div>
                <ul className="space-y-2">
                    {(metadata.objections || []).map((o: string, i: number) => (
                    <li key={i} className="text-sm text-zinc-400 flex gap-3">
                        <span className="text-red-500 font-black">!</span> {o}
                    </li>
                    ))}
                </ul>
            </section>

            <section className="space-y-6">
                <div className="flex items-center gap-2 text-blue-400">
                    <MessageSquare className="w-5 h-5" />
                    <h3 className="text-xs font-black uppercase tracking-[0.3em]">Voz del Cliente</h3>
                </div>
                <div className="grid gap-3">
                {(metadata.quotes || []).map((q: string, i: number) => (
                    <p key={i} className="text-sm italic text-zinc-400 bg-white/[0.03] p-4 rounded-2xl border-l-4 border-indigo-500">
                    "{q}"
                    </p>
                ))}
                </div>
            </section>
          </div>

          {/* Advanced Section: Full Strategic Depth */}
          <section className="pt-10 border-t border-white/5 space-y-6">
             <details className="group">
                <summary className="flex items-center justify-between cursor-pointer list-none">
                    <div className="flex items-center gap-2 text-zinc-500 group-hover:text-zinc-300 transition-colors">
                        <Brain className="w-5 h-5" />
                        <h3 className="text-xs font-black uppercase tracking-[0.3em]">Detalles Estratégicos Avanzados</h3>
                    </div>
                    <span className="text-zinc-500 group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <div className="mt-6 p-8 rounded-[2rem] bg-black border border-white/5 text-zinc-500 text-sm leading-relaxed whitespace-pre-line font-mono">
                    {persona.context || "No hay información técnica adicional cargada en el núcleo."}
                </div>
             </details>
          </section>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/5 bg-white/[0.01] flex justify-center">
            <p className="text-[10px] text-zinc-600 font-black uppercase tracking-[0.4em]">
                IntelAgent Systems • Confidential Persona Dossier
            </p>
        </div>
      </div>
    </div>
  );
}
