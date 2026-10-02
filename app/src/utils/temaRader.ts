import type { KpiMeta } from "../types";
import type { TemaConfig } from "../teman/tema-config";
import type { KpiIndex } from "./kpiStats";

export interface TabellRad {
  kpiId: string;
  namn: string;
  enhet: string;
  beskrivning: string;
  lagtArBra: boolean;
  /** Nedbrytningar (undersektioner), med gruppnamn */
  nedbrytningar: { grupp: string; rader: TabellRad[] }[];
}

export interface TabellGrupp {
  rubrik: string | null;
  rader: TabellRad[];
}

/** Visningsnamn utan "(%)" och liknande, enheten står på egen rad */
function rensaNamn(n: string): string {
  return n.replace(/\s*\(%\)\s*$/, "").replace(/,\s*andel\s*\(%\)/, ", andel").trim();
}

/**
 * Bygger tabellens grupper ur temats sektioner. Sektioner med grupprubrik samlas under
 * den; sektioner med flera KPI:er får sitt eget namn som rubrik; ensamma KPI:er utan
 * grupprubrik hamnar i en grupp utan rubrik.
 */
export function byggGrupper(tema: TemaConfig, meta: KpiMeta[], idx: KpiIndex): TabellGrupp[] {
  const lagt = new Set(tema.lagtArBra ?? []);
  const metaMap = new Map(meta.map((m) => [m.kpi_id, m]));
  const rad = (id: string, nedbrytningar: TabellRad["nedbrytningar"] = []): TabellRad | null => {
    const m = metaMap.get(id);
    if (!m || !idx.has(id)) return null;
    return {
      kpiId: id,
      namn: rensaNamn(tema.visningsnamn[id] ?? m.kpi_namn),
      enhet: m.enhet,
      beskrivning: m.beskrivning,
      lagtArBra: lagt.has(id),
      nedbrytningar,
    };
  };

  const grupper: TabellGrupp[] = [];
  const grupp = (rubrik: string | null) => {
    const sista = grupper[grupper.length - 1];
    if (sista && sista.rubrik === rubrik) return sista;
    const ny = { rubrik, rader: [] as TabellRad[] };
    grupper.push(ny);
    return ny;
  };

  for (const s of tema.sektioner) {
    const ned = (s.undersektioner ?? [])
      .map((us) => ({ grupp: us.namn, rader: us.kpiIds.map((id) => rad(id)).filter((r): r is TabellRad => r != null) }))
      .filter((g) => g.rader.length > 0);
    const huvud = s.kpiIds.map((id, i) => rad(id, i === 0 && s.kpiIds.length === 1 ? ned : []))
      .filter((r): r is TabellRad => r != null);
    if (huvud.length === 0) continue;
    const rubrik = s.gruppRubrik ?? (s.kpiIds.length > 1 ? s.namn : null);
    grupp(rubrik).rader.push(...huvud);
  }
  return grupper.filter((g) => g.rader.length > 0);
}
