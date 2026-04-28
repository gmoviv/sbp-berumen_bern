"use client";

import { useMemo } from "react";

export type PersonaOption = { id: string; name: string; cluster?: string };

type Props = {
  options?: PersonaOption[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
  labelText?: string;
};

export default function PersonaSelect({ options, value, onChange, className, labelText }: Props) {
  const grouped = useMemo(() => {
    const src = options ?? [];
    const groups: Record<string, PersonaOption[]> = {};
    const seen = new Set<string>();

    for (const opt of src) {
      const id = (opt?.id ?? "").trim();
      const name = (opt?.name ?? "").trim();
      const cluster = (opt?.cluster ?? "General").trim();

      if (!id || seen.has(id)) continue;
      seen.add(id);

      if (!groups[cluster]) groups[cluster] = [];
      groups[cluster].push({ id, name: name || id, cluster });
    }
    return groups;
  }, [options]);

  const clusterNames = Object.keys(grouped).sort();
  const hasOptions = clusterNames.length > 0;

  return (
    <label className={`space-y-1 ${className ?? ""}`}>
      <span className="text-sm font-medium text-gray-700">{labelText ?? "Elige una persona"}</span>
      <select
        className="w-full rounded-xl border border-gray-300 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Persona select"
        disabled={!hasOptions}
      >
        {hasOptions ? (
          <>
            <option value="" disabled>Selecciona una opción...</option>
            {clusterNames.map((cluster) => (
              <optgroup key={cluster} label={cluster}>
                {grouped[cluster].map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </>
        ) : (
          <option value="">(sin opciones)</option>
        )}
      </select>
      {!hasOptions && (
        <p className="text-xs text-gray-500">Carga una persona para continuar.</p>
      )}
    </label>
  );
}