"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { isAdminRole } from "@/lib/rbac";
import { useI18n } from "@/components/i18n/I18nProvider";
import { PersonaDossier } from "@/components/admin/PersonaDossier";
import { IntelligenceDrawer } from "@/components/admin/IntelligenceDrawer";
import { Search, Plus, ArrowUpDown, Brain, Pencil, Trash2, FileText, Loader2, Filter, ChevronDown, RefreshCcw } from "lucide-react";

type PersonaRecord = {
  id: string;
  name: string;
  role: string;
  cluster: string;
  metadata: any;
  context: string;
  updated_at: string;
};

type ClusterRecord = {
  id: string;
  name: string;
};

export default function AdminPersonasPage() {
  const { t, formatDate } = useI18n();
  const { data: session, status } = useSession();
  const isAdmin = useMemo(() => isAdminRole(session?.user?.roles), [session?.user?.roles]);

  // Data states
  const [personas, setPersonas] = useState<PersonaRecord[]>([]);
  const [clusters, setClusters] = useState<ClusterRecord[]>([]);
  
  // UI states
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  
  // Interaction states
  const [activePersona, setActivePersona] = useState<PersonaRecord | null>(null);
  const [drawerMode, setDrawerMode] = useState<'train' | 'edit' | null>(null);
  const [viewingDossier, setViewingDossier] = useState<PersonaRecord | null>(null);
  
  // Filter/Sort states
  const [searchQuery, setSearchBar] = useState("");
  const [filterCluster, setFilterCluster] = useState("all");
  const [sortBy, setSortBy] = useState<"name" | "updated_at">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Create Modal state
  const [isAddingPersona, setIsAddingPersona] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createRole, setCreateRole] = useState("");
  const [createCluster, setCreateCluster] = useState("General");

  // Derive clusters from personas as a fallback
  const availableClusters = useMemo(() => {
    const fromDb = (clusters || []).map(c => c.name);
    const fromPersonas = (personas || []).map(p => p.cluster);
    const unique = Array.from(new Set([...fromDb, ...fromPersonas])).filter(Boolean).sort();
    return unique.length > 0 ? unique : ["General"];
  }, [clusters, personas]);

  const loadData = async () => {
    try {
      const [pRes, cRes] = await Promise.all([
        fetch("/api/admin/personas"),
        fetch("/api/admin/clusters")
      ]);
      const pData = await pRes.json();
      const cData = await cRes.json();
      
      if (!pRes.ok) throw new Error(pData.error);
      setPersonas(pData.personas);
      setClusters(cData.clusters || []);
    } catch (err: any) {
      setError(t("admin.personas.error.load"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated" && isAdmin) {
      void loadData();
    }
  }, [status, isAdmin]);

  const handleSync = async () => {
    setSyncing(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/personas/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessage(`Sincronización exitosa: ${data.migrated.length} personas actualizadas.`);
      await loadData();
    } catch (err: any) {
      setError("Fallo en la sincronización: " + err.message);
    } finally {
      setSyncing(false);
    }
  };

  const handleCreatePersona = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/personas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: createName,
          role: createRole,
          cluster: createCluster,
          metadata: { pains: [], goals: [], channels: [], quotes: [] }
        }),
      });
      if (!response.ok) throw new Error("Failed to create");
      setCreateName("");
      setCreateRole("");
      setIsAddingPersona(false);
      await loadData();
    } catch (err: any) {
      setError(t("admin.personas.error.create"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveEdit = async (updatedData: any) => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/personas/${updatedData.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedData),
      });
      if (!res.ok) throw new Error("Failed to save");
      setDrawerMode(null);
      await loadData();
    } catch (err) {
      setError("No se pudo guardar los cambios.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePersona = async (id: string, name: string) => {
    if (!window.confirm(`¿Estás seguro de eliminar a ${name}?`)) return;
    try {
      await fetch(`/api/admin/personas/${id}`, { method: "DELETE" });
      await loadData();
    } catch (err: any) {
      setError("No se pudo eliminar.");
    }
  };

  const filteredPersonas = useMemo(() => {
    let result = [...personas];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p => p.name.toLowerCase().includes(q) || (p.role || "").toLowerCase().includes(q));
    }
    if (filterCluster !== "all") {
      result = result.filter(p => p.cluster === filterCluster);
    }
    result.sort((a, b) => {
      const valA = a[sortBy] || "";
      const valB = b[sortBy] || "";
      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
    return result;
  }, [personas, searchQuery, filterCluster, sortBy, sortOrder]);

  if (status === "loading") {
    return (
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            <p className="text-sm text-zinc-500 animate-pulse font-medium tracking-widest uppercase text-center">IntelAgent Systems Loading...</p>
        </div>
    );
  }

  if (!session?.user || !isAdmin) {
    return (
      <div className="mx-auto w-full max-w-4xl rounded-3xl border border-red-500/20 bg-red-500/5 p-8 text-center backdrop-blur-md mt-10">
        <h1 className="text-2xl font-bold text-red-200">Acceso Restringido</h1>
        <p className="mt-2 text-zinc-400">Esta terminal está reservada para el protocolo de administración.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20 px-4">
      {/* High-Performance Header */}
      <div className="bg-white/[0.02] border border-white/10 rounded-3xl p-6 shadow-2xl backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-2xl font-black text-white tracking-tighter uppercase">Intelligence Factory</h1>
            <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-[10px] text-zinc-500 font-black tracking-[0.2em] uppercase">Control Center Active</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
             {/* Sync Button */}
             <Button 
                onClick={handleSync}
                disabled={syncing}
                className="rounded-xl h-10 border-white/10 bg-transparent hover:bg-white/5 text-zinc-400 hover:text-white transition-all shadow-none border"
                title="Sincronizar con archivos del repositorio"
            >
                {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
                <span className="ml-2 hidden md:inline">Sincronizar DB</span>
            </Button>

             {/* Search */}
             <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchBar(e.target.value)}
                    placeholder="Search agents..."
                    className="bg-black/20 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white outline-none focus:border-indigo-500/40 w-48 md:w-64 transition-all"
                />
            </div>
            
            <div className="relative group">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                <select
                    value={filterCluster}
                    onChange={(e) => setFilterCluster(e.target.value)}
                    className="bg-black/20 border border-white/10 rounded-xl pl-9 pr-10 py-2.5 text-xs text-zinc-300 outline-none hover:border-white/20 transition-colors appearance-none cursor-pointer w-full md:w-auto"
                >
                    <option value="all">All Clusters</option>
                    {availableClusters.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-500 pointer-events-none" />
            </div>

            <Button 
                onClick={() => setIsAddingPersona(true)}
                className="rounded-xl h-10 px-6 font-bold shadow-lg shadow-indigo-500/20"
            >
                <Plus className="w-4 h-4 mr-2" />
                Add Agent
            </Button>
          </div>
        </div>
      </div>

      {/* Modern High-Density Table */}
      <section className="bg-white/[0.02] border border-white/10 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-white/[0.03] border-b border-white/10">
                        <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest cursor-pointer hover:text-white transition-colors" onClick={() => { setSortBy("name"); setSortOrder(sortOrder === "asc" ? "desc" : "asc"); }}>
                            <div className="flex items-center gap-2">
                                Agent Name
                                <ArrowUpDown className="w-3 h-3" />
                            </div>
                        </th>
                        <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Cluster</th>
                        <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Core Role</th>
                        <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest cursor-pointer hover:text-white transition-colors" onClick={() => { setSortBy("updated_at"); setSortOrder(sortOrder === "asc" ? "desc" : "asc"); }}>
                            <div className="flex items-center gap-2">
                                Last Sync
                                <ArrowUpDown className="w-3 h-3" />
                            </div>
                        </th>
                        <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {loading ? (
                        [1,2,3,4,5].map(i => (
                            <tr key={i} className="animate-pulse">
                                <td colSpan={5} className="px-6 py-8"><div className="h-4 bg-white/5 rounded-full w-full" /></td>
                            </tr>
                        ))
                    ) : filteredPersonas.map((p) => (
                        <tr key={p.id} className="hover:bg-white/[0.02] transition-colors group">
                            <td className="px-6 py-4">
                                <div className="flex flex-col">
                                    <span className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">{p.name}</span>
                                    <span className="text-[10px] text-zinc-600 font-mono tracking-tighter uppercase">{p.id}</span>
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[9px] font-black tracking-widest uppercase">
                                    {p.cluster}
                                </span>
                            </td>
                            <td className="px-6 py-4">
                                <span className="text-sm text-zinc-400 font-medium italic">{p.role || "—"}</span>
                            </td>
                            <td className="px-6 py-4">
                                <span className="text-[11px] text-zinc-500 font-medium">{formatDate(p.updated_at)}</span>
                            </td>
                            <td className="px-6 py-4">
                                <div className="flex justify-end gap-1">
                                    <button onClick={() => setViewingDossier(p)} title="Dossier" className="p-2 text-zinc-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-xl transition-all">
                                        <FileText className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => { setActivePersona(p); setDrawerMode('train'); }} title="Entrenar" className="p-2 text-zinc-500 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-xl transition-all">
                                        <Brain className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => { setActivePersona(p); setDrawerMode('edit'); }} title="Editar" className="p-2 text-zinc-500 hover:text-white hover:bg-white/10 rounded-xl transition-all">
                                        <Pencil className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => handleDeletePersona(p.id, p.name)} title="Borrar" className="p-2 text-zinc-600 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {!loading && filteredPersonas.length === 0 && (
                <div className="py-20 text-center space-y-3">
                    <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto">
                        <Search className="w-5 h-5 text-zinc-600" />
                    </div>
                    <p className="text-zinc-500 text-sm font-medium tracking-tight">No intelligence nodes found for current parameters.</p>
                </div>
            )}
        </div>
      </section>

      {/* Modals & Drawer */}
      {isAddingPersona && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#09090b] border border-white/10 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-scale-in">
            <div className="p-8 space-y-6">
                <div className="space-y-1">
                    <h2 className="text-2xl font-bold text-white tracking-tight">Add Cognitive Agent</h2>
                    <p className="text-sm text-zinc-500">Initialize a new persona in the factory.</p>
                </div>
                <form onSubmit={handleCreatePersona} className="space-y-5">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">Name</label>
                        <input type="text" value={createName} onChange={(e) => setCreateName(e.target.value)} required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-indigo-500/50 transition-colors" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">Role</label>
                        <input type="text" value={createRole} onChange={(e) => setCreateRole(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-indigo-500/50 transition-colors" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">Cluster</label>
                        <div className="relative">
                            <select
                                value={createCluster}
                                onChange={(e) => setCreateCluster(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-indigo-500/50 transition-colors appearance-none"
                            >
                                {availableClusters.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                        </div>
                    </div>
                    <div className="flex gap-3 pt-4">
                        <Button variant="outline" type="button" onClick={() => setIsAddingPersona(false)} className="flex-1 h-12 rounded-xl border border-white/10 bg-transparent hover:bg-white/5 text-white shadow-none">Cancel</Button>
                        <Button type="submit" disabled={submitting} className="flex-1 h-12 rounded-xl shadow-indigo-500/20 shadow-lg">Initialize</Button>
                    </div>
                </form>
            </div>
          </div>
        </div>
      )}

      {viewingDossier && <PersonaDossier persona={viewingDossier} onClose={() => setViewingDossier(null)} />}
      {activePersona && drawerMode && (
          <IntelligenceDrawer 
            key={`${activePersona.id}-${drawerMode}`}
            persona={activePersona}
            clusters={availableClusters.map(name => ({ id: name, name }))}
            mode={drawerMode}
            onClose={() => { setActivePersona(null); setDrawerMode(null); }}
            onSave={handleSaveEdit}
            submitting={submitting}
          />
      )}
    </div>
  );
}
