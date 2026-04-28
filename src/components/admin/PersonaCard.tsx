"use client";

import { Brain, FileText, Pencil, Trash2, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/i18n/I18nProvider";

interface PersonaCardProps {
  persona: {
    id: string;
    name: string;
    role: string;
    cluster: string;
    updated_at: string;
  };
  onEdit: () => void;
  onTrain: () => void;
  onViewDossier: () => void;
  onDelete: () => void;
}

export function PersonaCard({ persona, onEdit, onTrain, onViewDossier, onDelete }: PersonaCardProps) {
  const { formatDate } = useI18n();

  return (
    <div className="group relative bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 hover:border-indigo-500/30 rounded-2xl p-5 transition-all duration-300 shadow-lg hover:shadow-indigo-500/10 flex flex-col justify-between overflow-hidden">
      {/* Decorative Gradient Background */}
      <div className="absolute -right-4 -top-4 w-24 h-24 bg-indigo-500/5 blur-3xl group-hover:bg-indigo-500/10 transition-colors" />

      <div className="space-y-4">
        {/* Cluster Badge */}
        <div className="flex items-center justify-between">
          <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-[10px] uppercase font-black tracking-widest">
            {persona.cluster}
          </span>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
              onClick={onDelete} 
              className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
              title="Eliminar"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div>
          <h3 className="text-lg font-bold text-white group-hover:text-indigo-300 transition-colors truncate">
            {persona.name}
          </h3>
          <p className="text-sm text-zinc-400 line-clamp-1 mt-1 font-medium italic">
            {persona.role || "Sin rol definido"}
          </p>
        </div>

        {/* Knowledge Indicator Placeholder */}
        <div className="flex items-center gap-2 pt-2">
            <div className="h-1 flex-1 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full w-2/3 bg-indigo-500/40 rounded-full" />
            </div>
            <span className="text-[10px] text-zinc-500 font-bold uppercase">Health: 60%</span>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-6 flex items-center gap-2 pt-4 border-t border-white/5">
        <Button 
          className="flex-1 h-8 bg-white/5 hover:bg-indigo-500/20 text-zinc-300 hover:text-indigo-200 border-none transition-all shadow-none"
          onClick={onTrain}
        >
          <Brain className="w-3.5 h-3.5 mr-2" />
          Entrenar
        </Button>
        <button 
          onClick={onViewDossier}
          className="p-2 bg-white/5 hover:bg-blue-500/20 text-zinc-400 hover:text-blue-300 rounded-lg transition-all"
          title="Ver Dossier"
        >
          <FileText className="w-4 h-4" />
        </button>
        <button 
          onClick={onEdit}
          className="p-2 bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white rounded-lg transition-all"
          title="Editar Metadata"
        >
          <Pencil className="w-4 h-4" />
        </button>
      </div>
      
      <div className="mt-4 flex items-center gap-1.5 text-[10px] text-zinc-500 font-medium">
        <Calendar className="w-3 h-3" />
        {formatDate(persona.updated_at)}
      </div>
    </div>
  );
}
