import { useEffect, useState } from "react";

/** En AI-genererad analystext (från R/kap03-ai-analys.R) */
export interface AnalysText {
  rubrik: string;
  ingress: string;
  i_korthet: { ledtext: string; text: string }[];
  stycken: string[];
  /** Senaste period i underlaget, t.ex. "2025" eller "augusti 2026" */
  period: string;
  /** true om varje siffra i texten återfanns i underlaget */
  kontrollerad: boolean;
}

export interface EnhetAnalys {
  namn: string;
  oversikt?: AnalysText;
  teman: Record<string, AnalysText>;
}

export interface AnalysData {
  genererad: string;
  modell?: string;
  enheter: Record<string, EnhetAnalys>;
}

let cache: Promise<AnalysData | null> | null = null;

/** Laddar halland-analys.json en gång (lazy, ~150 kB) */
export function useAnalys(): AnalysData | null {
  const [data, setData] = useState<AnalysData | null>(null);
  useEffect(() => {
    if (!cache) {
      cache = fetch(`${import.meta.env.BASE_URL}data/halland-analys.json`)
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null);
    }
    let aktiv = true;
    cache.then((d) => { if (aktiv) setData(d); });
    return () => { aktiv = false; };
  }, []);
  return data;
}
