import { useEffect, useState } from "react";

/**
 * En figur i analysen, placerad efter ett stycke (R/analys/figurregler.md):
 * utveckling = enheten, Halland och riket över tid; uppdelning = delgruppernas serier;
 * halland = kommunerna, länet och riket senaste året; landet = enheten bland landets
 * kommuner; delar = komponenter per år staplade, med totalen (summa) som punkt.
 */
export type FigurTyp = "utveckling" | "uppdelning" | "halland" | "landet" | "delar";

export interface Figur {
  /** Styckets index (0-baserat); figuren står efter stycket */
  efter: number;
  typ: FigurTyp;
  kpi: string[];
  summa?: string;
  /** Första period som visas */
  fran?: number;
  /** Budskapet, högst tio ord, samma regler som texten */
  rubrik: string;
}

/** En AI-genererad analystext (från R/kap03-ai-analys.R) */
export interface AnalysText {
  rubrik: string;
  ingress: string;
  i_korthet: { ledtext: string; text: string }[];
  stycken: string[];
  figurer?: Figur[];
  /** Senaste period i underlaget, t.ex. "2025" eller "augusti 2026" */
  period: string;
  /** true om varje siffra i texten återfanns i underlaget */
  kontrollerad: boolean;
}

export interface EnhetAnalys {
  namn: string;
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
