export interface KpiRow {
  kpi_id: string;
  kpi_namn: string;
  enhet: string;
  tema: string;
  kommun_kod: string;
  kommun_namn: string;
  kommun_typ: string;
  ar: number;
  varde: number | null;
  riksvarde: number | null;
  diff_riket: number | null;
  diff_riket_pct: number | null;
  halland: boolean;
  rang_total: number | null;
  antal_kommuner: number | null;
  trend_5ar: number | null;
  trend_10ar: number | null;
  trend_riktning: string | null;
  ki_lower: number | null;
  ki_upper: number | null;
}

/** Slim JSON-format från per-tema-filer (korta nycklar, inga redundanta kolumner) */
export interface SlimRow {
  k: string;   // kpi_id
  m: string;   // kommun_kod
  t: string;   // kommun_typ
  a: number;   // ar
  v: number | null;   // varde
  r: number | null;   // riksvarde
  rg: number | null;  // rang_total
  n: number | null;   // antal_kommuner
  t5: number | null;  // trend_5ar
  t10: number | null; // trend_10ar
  kl: number | null;  // ki_lower
  kh: number | null;  // ki_upper
}

/** Kommun-register: kort nyckelformat */
export interface KommunEntry {
  k: string;  // kommun_kod
  n: string;  // kommun_namn
  t: string;  // kommun_typ
}

export interface KpiMeta {
  kpi_id: string;
  kpi_namn: string;
  beskrivning: string;
  enhet: string;
  tema: string;
  par_kpi_id: string | null;
}

export const HALLAND_KOMMUNER = [
  { kod: "0013", namn: "Halland", typ: "L" as const },
  { kod: "1380", namn: "Halmstad", typ: "K" as const },
  { kod: "1381", namn: "Laholm", typ: "K" as const },
  { kod: "1382", namn: "Falkenberg", typ: "K" as const },
  { kod: "1383", namn: "Varberg", typ: "K" as const },
  { kod: "1384", namn: "Kungsbacka", typ: "K" as const },
  { kod: "1315", namn: "Hylte", typ: "K" as const },
] as const;

export const HALLAND_KODER: string[] = HALLAND_KOMMUNER
  .filter((k) => k.typ === "K")
  .map((k) => k.kod);
