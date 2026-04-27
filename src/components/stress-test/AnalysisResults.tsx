// src/components/stress-test/AnalysisResults.tsx
"use client";

import { MessageSquare, TrendingUp, Shield, Award, AlertTriangle, Target, HelpCircle, Sparkles, AlertCircle, XCircle } from 'lucide-react';
import { clsx } from 'clsx';
import { useI18n } from "@/components/i18n/I18nProvider";
import { StressResult } from "./types";
import { ScoringBreakdown } from "./ScoringBreakdown";

interface AnalysisResultsProps {
    result: StressResult;
    personaNames: Record<string, string>;
    personaType: string;
    selectedPersonaName: string;
    showDebug: boolean;
    loading?: boolean;
}

export function AnalysisResults({
    result,
    personaNames,
    personaType,
    selectedPersonaName,
    showDebug,
    loading = false,
}: AnalysisResultsProps) {
    const { t } = useI18n();

    const getConfidenceBadgeColor = (score: number) => {
        if (score === 0) return 'bg-gray-500/20 text-gray-400 border-gray-500/30 animate-pulse';
        if (score >= 70) return 'bg-green-500/20 text-green-400 border-green-500/30';
        if (score >= 40) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
        return 'bg-red-500/20 text-red-400 border-red-500/30';
    };

    const strengths = result.strengths || [];
    const gaps = result.gaps || [];
    const actionPlan = result.actionPlan || [];
    const followUpQuestions = result.followUpQuestions || [];

    return (
        <div className="mt-8 space-y-6 overflow-anchor-none">
            <div className="animate-scale-in bg-gradient-to-br from-[#171717] to-[#0a0a0a] border border-[rgba(255,255,255,0.15)] rounded-xl p-6 shadow-xl">
                <div className="flex items-start justify-between">
                    <div className="space-y-1">
                        <h2 className="text-2xl font-semibold tracking-tight">{selectedPersonaName}</h2>
                        <p className="text-sm text-[#a1a1aa]">{t("stress.result.analysis_title")}</p>
                    </div>
                    <div className={clsx(
                        "px-4 py-2 rounded-full text-sm font-bold border-2 shadow-lg transition-colors duration-500",
                        getConfidenceBadgeColor(result.confidenceScore || 0)
                    )}>
                        {result.confidenceScore && result.confidenceScore > 0 
                            ? t("stress.result.confidence", { value: result.confidenceScore })
                            : t("stress.result.analyzing") || "..."}
                    </div>
                </div>
            </div>

            {result.confidenceBreakdown && (
              <div className="animate-slide-in-up">
                <ScoringBreakdown
                  confidenceScore={result.confidenceScore || 0}
                  breakdown={result.confidenceBreakdown}
                  rationale={result.scoringRationale}
                />
              </div>
            )}

            <div className="animate-slide-in-up bg-gradient-to-r from-[#4F46E5]/10 via-[#4F46E5]/5 to-transparent border-l-4 border-[#4F46E5] rounded-r-xl overflow-hidden shadow-lg min-h-[140px]">
                <div className="p-6">
                    <div className="flex items-center gap-3 pb-4 border-b border-[#4F46E5]/20 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#4F46E5]/30 to-[#4F46E5]/10 flex items-center justify-center shadow-md">
                            <MessageSquare className="w-6 h-6 text-[#4F46E5]" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold uppercase tracking-wider text-[#4F46E5]">
                                {t("stress.result.persona_reaction_title")}
                            </h3>
                            <p className="text-xs text-[#a1a1aa] mt-0.5">{t("stress.result.persona_reaction_subtitle")}</p>
                        </div>
                    </div>
                    <p className={clsx(
                        "text-base leading-relaxed text-[#ededed] transition-opacity",
                        loading && !result.personaReaction ? "opacity-50" : "opacity-100"
                    )}>
                        {result.personaReaction || (loading ? "..." : "")}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="animate-slide-in-up bg-gradient-to-br from-green-500/10 to-green-500/5 border-2 border-green-500/30 rounded-xl overflow-hidden shadow-lg min-h-[200px]">
                    <div className="p-6">
                        <div className="flex items-center gap-3 pb-4 border-b border-green-500/20 mb-5">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500/30 to-green-500/10 flex items-center justify-center shadow-md">
                                <TrendingUp className="w-6 h-6 text-green-400" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold uppercase tracking-wider text-green-400">
                                    {t("stress.result.strengths_title")}
                                </h3>
                                <p className="text-xs text-green-400/60 mt-0.5">{t("stress.result.strengths_count", { count: strengths.length })}</p>
                            </div>
                        </div>
                        <ul className="space-y-3">
                            {strengths.map((strength, idx) => {
                                const icons = [Shield, Award, TrendingUp];
                                const Icon = icons[idx % icons.length];
                                return (
                                    <li key={idx} className="flex items-start gap-3 text-sm bg-green-500/5 p-3.5 rounded-lg border border-green-500/10 hover:bg-green-500/10 transition-all hover:border-green-500/20">
                                        <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0">
                                            <Icon className="w-4 h-4 text-green-400" />
                                        </div>
                                        <span className="text-[#ededed] pt-1">{strength}</span>
                                    </li>
                                );
                            })}
                            {loading && strengths.length === 0 && <li className="animate-pulse text-sm text-green-400/50">...</li>}
                        </ul>
                    </div>
                </div>

                <div className="animate-slide-in-up bg-gradient-to-br from-red-500/10 to-red-500/5 border-2 border-red-500/30 rounded-xl overflow-hidden shadow-lg min-h-[200px]">
                    <div className="p-6">
                        <div className="flex items-center gap-3 pb-4 border-b border-red-500/20 mb-5">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500/30 to-red-500/10 flex items-center justify-center shadow-md">
                                <AlertTriangle className="w-6 h-6 text-red-400" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold uppercase tracking-wider text-red-400">
                                    {t("stress.result.gaps_title")}
                                </h3>
                                <p className="text-xs text-red-400/60 mt-0.5">{t("stress.result.gaps_count", { count: gaps.length })}</p>
                            </div>
                        </div>
                        <ul className="space-y-3">
                            {gaps.map((gap, idx) => {
                                const icons = [AlertCircle, XCircle, AlertTriangle];
                                const Icon = icons[idx % icons.length];
                                return (
                                    <li key={idx} className="flex items-start gap-3 text-sm bg-red-500/5 p-3.5 rounded-lg border border-red-500/10 hover:bg-red-500/10 transition-all hover:border-red-500/20">
                                        <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center flex-shrink-0">
                                            <Icon className="w-4 h-4 text-red-400" />
                                        </div>
                                        <span className="text-[#ededed] pt-1">{gap}</span>
                                    </li>
                                );
                            })}
                            {loading && gaps.length === 0 && <li className="animate-pulse text-sm text-red-400/50">...</li>}
                        </ul>
                    </div>
                </div>
            </div>

            <div className="animate-slide-in-up bg-gradient-to-br from-[#171717] to-[#0a0a0a] border border-[rgba(255,255,255,0.15)] rounded-xl overflow-hidden shadow-lg min-h-[200px]">
                <div className="p-6">
                    <div className="flex items-center gap-3 pb-4 border-b border-[rgba(255,255,255,0.1)] mb-5">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#4F46E5]/30 to-[#4F46E5]/10 flex items-center justify-center shadow-md">
                            <Target className="w-6 h-6 text-[#4F46E5]" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold uppercase tracking-wider text-[#4F46E5]">
                                {t("stress.result.action_plan_title")}
                            </h3>
                            <p className="text-xs text-[#a1a1aa] mt-0.5">{t("stress.result.action_plan_subtitle")}</p>
                        </div>
                    </div>
                    <ul className="space-y-3">
                        {actionPlan.map((action, idx) => (
                            <li key={idx} className="flex items-start gap-4 p-4 bg-[rgba(255,255,255,0.03)] rounded-lg border border-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.06)] transition-all hover:border-[#4F46E5]/30 hover:shadow-md group">
                                <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-[#4F46E5] to-[#6366F1] text-white flex items-center justify-center text-sm font-bold shadow-md group-hover:shadow-lg transition-shadow">
                                    {idx + 1}
                                </span>
                                <span className="text-sm text-[#ededed] pt-1.5 leading-relaxed">{action}</span>
                            </li>
                        ))}
                        {loading && actionPlan.length === 0 && <li className="animate-pulse text-sm text-[#4F46E5]/50">...</li>}
                    </ul>
                </div>
            </div>

            <div className="animate-fade-in bg-gradient-to-br from-[#171717] to-[#0a0a0a] border border-[rgba(255,255,255,0.15)] rounded-xl overflow-hidden shadow-lg">
                <div className="p-6">
                    <div className="flex items-center gap-3 pb-4 border-b border-[rgba(255,255,255,0.1)] mb-5">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-500/30 to-yellow-500/10 flex items-center justify-center shadow-md">
                            <HelpCircle className="w-6 h-6 text-yellow-400" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold uppercase tracking-wider text-yellow-400">
                                {t("stress.result.followup_title")}
                            </h3>
                            <p className="text-xs text-[#a1a1aa] mt-0.5">{t("stress.result.followup_subtitle")}</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                        {followUpQuestions.map((question, idx) => (
                            <button
                                key={idx}
                                className="group px-4 py-3.5 bg-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)] hover:border-[#4F46E5]/40 rounded-lg text-sm transition-all text-left shadow-sm hover:shadow-md hover:translate-x-1"
                            >
                                <span className="text-[#4F46E5] mr-2 group-hover:mr-3 transition-all">→</span>
                                <span className="text-[#ededed]">{question}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {showDebug && (
                <div className="animate-fade-in bg-gradient-to-br from-[#171717] to-[#0a0a0a] border border-[rgba(255,255,255,0.15)] rounded-xl overflow-hidden shadow-lg">
                    <div className="p-6">
                        <div className="flex items-center gap-3 pb-4 border-b border-[rgba(255,255,255,0.1)] mb-5">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#4F46E5]/30 to-[#4F46E5]/10 flex items-center justify-center shadow-md">
                                <Sparkles className="w-6 h-6 text-[#4F46E5]" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold uppercase tracking-wider text-[#4F46E5]">
                                    {t("stress.result.pitch_title")}
                                </h3>
                                <p className="text-xs text-[#a1a1aa] mt-0.5">{t("stress.result.pitch_subtitle")}</p>
                            </div>
                        </div>
                        <p className="text-sm text-[#ededed] leading-relaxed whitespace-pre-line">{result.presentation}</p>
                    </div>
                </div>
            )}
        </div>
    );
}
