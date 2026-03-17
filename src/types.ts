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
  trend_riktning: string | null;
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
