"use client";

import { X, Brain, Pencil, Save, Loader2, Sparkles, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KnowledgeDropzone } from "./KnowledgeDropzone";
import React, { useState } from "react";

interface IntelligenceDrawerProps {
  persona: any;
  clusters: any[];
  mode: 'train' | 'edit';
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  submitting: boolean;
}

export function IntelligenceDrawer({ persona, clusters, mode, onClose, onSave, submitting }: IntelligenceDrawerProps) {
  const [form, setForm] = useState(persona);

  if (!persona) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-fade-in">
      {/* Backdrop Area (Click to close) */}
      <div className="flex-1" onClick={onClose} />

      {/* Drawer */}
      <div className="w-full max-w-xl bg-[#09090b] border-l border-white/10 shadow-2xl flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-gradient-to-br from-indigo-500/10 via-transparent to-transparent">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
                {mode === 'train' ? <Brain className="w-5 h-5" /> : <Pencil className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                {mode === 'train' ? `Entrenar: ${persona.name}` : `Editar Persona`}
              </h2>
              <p className="text-xs text-zinc-500 font-medium uppercase tracking-widest mt-0.5">Intelligence Studio v1.0</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
            <X className="w-6 h-6 text-zinc-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-10">
          {mode === 'train' ? (
            <div className="space-y-6">
              <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 space-y-4">
                <div className="flex items-center gap-2 text-indigo-300">
                    <Sparkles className="w-4 h-4" />
                    <h3 className="text-sm font-bold uppercase tracking-wider">Inyección de Conocimiento</h3>
                </div>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Sube documentos estratégicos para que la persona aprenda nuevos comportamientos, sesgos y conocimientos técnicos.
                </p>
                <KnowledgeDropzone personaId={persona.id} />
              </div>
              
              <div className="p-6 rounded-2xl bg-indigo-500/5 border border-indigo-500/10">
                 <h4 className="text-xs font-black text-indigo-300 uppercase tracking-[0.2em] mb-3">Health Status</h4>
                 <div className="space-y-3">
                    <div className="flex justify-between items-end">
                        <span className="text-xs text-zinc-400">Contextual Depth</span>
                        <span className="text-xs font-bold text-white">Advanced</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full w-4/5 bg-indigo-500 rounded-full shadow-[0_0_8px_rgba(79,70,229,0.5)]" />
                    </div>
                 </div>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              <div className="space-y-2">
                <label className="text-xs font-black text-zinc-500 uppercase tracking-widest">Nombre de la Persona</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-indigo-500/50 transition-colors"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-zinc-500 uppercase tracking-widest">Cluster Organizacional</label>
                <div className="relative">
                    <select
                        value={form.cluster}
                        onChange={(e) => setForm({ ...form, cluster: e.target.value })}
                        className="w-full bg-[#0d0e10] border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-indigo-500/50 transition-colors appearance-none cursor-pointer"
                    >
                        {clusters.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-zinc-500 uppercase tracking-widest">Rol / Profesión</label>
                <input
                  type="text"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-indigo-500/50 transition-colors"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-zinc-500 uppercase tracking-widest">Profundidad Estratégica (Dossier)</label>
                <textarea
                  value={form.context}
                  onChange={(e) => setForm({ ...form, context: e.target.value })}
                  rows={8}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-indigo-500/50 transition-colors text-sm leading-relaxed resize-none font-mono"
                  placeholder="Escribe la profundidad estratégica aquí..."
                />
              </div>
              
              <div className="pt-4">
                <Button 
                    onClick={() => onSave(form)} 
                    disabled={submitting} 
                    className="w-full h-12 text-md font-bold shadow-indigo-500/20 shadow-lg"
                >
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5 mr-2" /> Guardar Cambios</>}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/10 bg-white/[0.02]">
            <p className="text-[10px] text-zinc-600 text-center uppercase tracking-widest font-medium">
                IntelAgent Systems • Access Restricted to Administrator
            </p>
        </div>
      </div>
    </div>
  );
}
