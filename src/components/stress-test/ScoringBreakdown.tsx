"use client";

import { ShieldCheck, Zap, Eye, Info } from 'lucide-react';
import { clsx } from 'clsx';

interface ScoringBreakdownProps {
  confidenceScore: number;
  breakdown: {
    problemValidity: number;
    solutionLogic: number;
    pitchClarity: number;
  };
  rationale?: {
    problemValidity: string;
    solutionLogic: string;
    pitchClarity: string;
  };
}

export function ScoringBreakdown({ confidenceScore, breakdown, rationale }: ScoringBreakdownProps) {
  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-400';
    if (score >= 40) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getBarColor = (score: number) => {
    if (score >= 70) return 'bg-green-500';
    if (score >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const metrics = [
    {
      label: 'Validez del Problema',
      weight: '50%',
      score: breakdown.problemValidity,
      icon: ShieldCheck,
      desc: rationale?.problemValidity || 'Evaluación del dolor y urgencia para la persona.',
      color: 'indigo'
    },
    {
      label: 'Lógica de Solución',
      weight: '30%',
      score: breakdown.solutionLogic,
      icon: Zap,
      desc: rationale?.solutionLogic || 'Evaluación de factibilidad y recursos.',
      color: 'blue'
    },
    {
      label: 'Claridad del Pitch',
      weight: '20%',
      score: breakdown.pitchClarity,
      icon: Eye,
      desc: rationale?.pitchClarity || 'Evaluación bajo el lente específico solicitado.',
      color: 'purple'
    }
  ];

  return (
    <div className="bg-[#171717] border border-[rgba(255,255,255,0.1)] rounded-xl overflow-hidden shadow-2xl">
      <div className="p-5 border-b border-[rgba(255,255,255,0.1)] bg-gradient-to-r from-[#1f1f1f] to-transparent flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Info className="w-5 h-5 text-[#4F46E5]" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#ededed]">
            Desglose de Confianza (DSE)
          </h3>
        </div>
        <div className={clsx("text-lg font-black", getScoreColor(confidenceScore))}>
          {confidenceScore}%
        </div>
      </div>
      
      <div className="p-6 space-y-6">
        {metrics.map((m, idx) => (
          <div key={idx} className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <m.icon className="w-4 h-4 text-[#a1a1aa]" />
                <span className="text-sm font-medium text-[#ededed]">{m.label}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-white/40 font-bold uppercase tracking-tighter border border-white/10">
                  W: {m.weight}
                </span>
              </div>
              <span className={clsx("text-sm font-bold", getScoreColor(m.score))}>
                {m.score}/100
              </span>
            </div>
            
            <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
              <div 
                className={clsx("h-full transition-all duration-1000 ease-out rounded-full", getBarColor(m.score))}
                style={{ width: `${m.score}%` }}
              />
            </div>
            
            <p className="text-xs text-[#a1a1aa] leading-relaxed italic bg-white/5 p-3 rounded-lg border border-white/5">
              “{m.desc}”
            </p>
          </div>
        ))}
      </div>
      
      <div className="px-6 py-4 bg-white/[0.02] border-t border-white/5">
        <p className="text-[10px] text-[#a1a1aa] uppercase tracking-widest text-center">
          Motor de Puntuación Determinista v1.0
        </p>
      </div>
    </div>
  );
}
