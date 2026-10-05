import type { KpiRow } from "../types";
import { HALLAND_KODER, KOMMUNER_NORR_SODER } from "../types";
import { LAN_EJ_JAMFORBAR } from "../teman";

/** kpi_id → kommun_kod → rader sorterade på period */
export type KpiIndex = Map<string, Map<string, KpiRow[]>>;

export function indexera(data: KpiRow[]): KpiIndex {
  const idx: KpiIndex = new Map();
  for (const d of data) {
    let perEnhet = idx.get(d.kpi_id);
    if (!perEnhet) { perEnhet = new Map(); idx.set(d.kpi_id, perEnhet); }
    const arr = perEnhet.get(d.kommun_kod);
    if (arr) arr.push(d); else perEnhet.set(d.kommun_kod, [d]);
  }
  for (const perEnhet of idx.values()) {
    for (const arr of perEnhet.values()) arr.sort((a, b) => a.ar - b.ar);
  }
  return idx;
}

/** Allt en tabellrad behöver för en indikator och en enhet */
export interface KpiSammanfattning {
  kpiId: string;
  period: number;
  /** Senaste period som någon enhet har värde för; äldre värden märks i tabellen */
  nyastePeriod: number;
  varde: number;
  riket: number | null;
  halland: number | null;
  /** Jämförbara enheters värden samma period: kommuner (290) eller regioner (21) */
  fordelning: number[];
  /** Samma enheter med koder (för namn i tooltips) */
  enheter: { kod: string; varde: number }[];
  /** Hallands kommuner samma period */
  hallandKommuner: { kod: string; varde: number }[];
  /** Rang bland jämförbara enheter, 1 = högsta värdet */
  rang: number | null;
  n: number;
  /** Andel jämförbara enheter med lägre värde (0–1) */
  percentil: number | null;
  /** Den valda enhetens serie */
  serie: KpiRow[];
  /** Förändring mot 1/5/10 år tidigare; saknas basåret används seriens första värde */
  forandring: Record<1 | 5 | 10, { varde: number; sedan: number } | null>;
  ki: [number, number] | null;
}

const vardeVid = (rows: KpiRow[] | undefined, ar: number) =>
  rows?.find((r) => r.ar === ar)?.varde ?? null;

export function sammanfatta(idx: KpiIndex, kpiId: string, kod: string): KpiSammanfattning | null {
  const perEnhet = idx.get(kpiId);
  const serie = perEnhet?.get(kod)?.filter((r) => r.varde != null);
  if (!perEnhet || !serie || serie.length === 0) return null;
  const senaste = serie[serie.length - 1];
  const p = senaste.ar;
  const varde = senaste.varde!;
  const arRegion = kod === "0013" || senaste.kommun_typ === "L";

  let nyastePeriod = p;
  for (const rows of perEnhet.values()) {
    for (let i = rows.length - 1; i >= 0 && rows[i].ar > nyastePeriod; i--) {
      if (rows[i].varde != null) { nyastePeriod = rows[i].ar; break; }
    }
  }
  const enheter: { kod: string; varde: number }[] = [];
  for (const [k, rows] of perEnhet) {
    if (k === "0000") continue;
    const typ = rows[0]?.kommun_typ;
    if (arRegion ? typ !== "L" : typ !== "K") continue;
    const v = vardeVid(rows, p);
    if (v != null) enheter.push({ kod: k, varde: v });
  }
  enheter.sort((a, b) => a.varde - b.varde);
  const fordelning = enheter.map((e) => e.varde);

  const hallandKommuner = HALLAND_KODER
    .map((k) => ({ kod: k, varde: vardeVid(perEnhet.get(k), p) }))
    .filter((x): x is { kod: string; varde: number } => x.varde != null);

  const n = fordelning.length;
  const rang = n > 1 ? fordelning.filter((v) => v > varde).length + 1 : null;
  const percentil = n > 1 ? fordelning.filter((v) => v < varde).length / (n - 1) : null;

  const riket = vardeVid(perEnhet.get("0000"), p) ?? senaste.riksvarde ?? null;
  const halland = kod === "0013" || LAN_EJ_JAMFORBAR.has(kpiId) ? null : vardeVid(perEnhet.get("0013"), p);

  // Förändring: årsdata mot 1/5/10 år tidigare, månadsdata mot samma månad året innan
  const manad = p > 9999;
  const forsta = serie[0];
  const forandringMot = (steg: number) => {
    const bas = manad ? p - 100 * steg : p - steg;
    const v0 = vardeVid(serie, bas);
    if (v0 != null) return { varde: varde - v0, sedan: bas };
    // Kortare serie än horisonten: jämför med första året om det ligger efter basåret
    if (forsta && forsta.ar > bas && forsta.ar < p && forsta.varde != null) {
      return { varde: varde - forsta.varde, sedan: forsta.ar };
    }
    return null;
  };

  return {
    kpiId, period: p, nyastePeriod, varde, riket, halland, fordelning, enheter, hallandKommuner,
    rang, n, percentil, serie,
    forandring: { 1: forandringMot(1), 5: manad ? null : forandringMot(5), 10: manad ? null : forandringMot(10) },
    ki: senaste.ki_lower != null && senaste.ki_upper != null ? [senaste.ki_lower, senaste.ki_upper] : null,
  };
}

/** Hallands kommuner (norr → söder), länet och riket: kolumnerna i jämförelsen */
export const HALLAND_KOLUMNER = [...KOMMUNER_NORR_SODER, "0013", "0000"];

export interface HallandCell { varde: number | null; percentil: number | null; rang: number | null; n: number }

/**
 * Kommunerna, länet och riket vid en gemensam period: länets senaste år, annars det senaste
 * bland kommunerna. Percentil och rang gäller läget bland landets kommuner (1 = högst).
 */
export function hallandsCeller(idx: KpiIndex, kpiId: string): { period: number; celler: Map<string, HallandCell> } | null {
  const perEnhet = idx.get(kpiId);
  if (!perEnhet) return null;
  const senaste = (kod: string) => {
    const rows = perEnhet.get(kod)?.filter((r) => r.varde != null);
    return rows && rows.length ? rows[rows.length - 1].ar : null;
  };
  const p = senaste("0013") ?? Math.max(...KOMMUNER_NORR_SODER.map((k) => senaste(k) ?? -Infinity));
  if (!isFinite(p)) return null;
  const vid = (kod: string) => perEnhet.get(kod)?.find((r) => r.ar === p)?.varde ?? null;
  const kommunVarden: number[] = [];
  for (const [kod, rows] of perEnhet) {
    if (kod === "0000" || rows[0]?.kommun_typ !== "K") continue;
    const v = vid(kod);
    if (v != null) kommunVarden.push(v);
  }
  const n = kommunVarden.length;
  const celler = new Map<string, HallandCell>();
  for (const kod of HALLAND_KOLUMNER) {
    const v = vid(kod);
    const arKommun = KOMMUNER_NORR_SODER.includes(kod);
    celler.set(kod, {
      varde: v,
      percentil: v != null && arKommun && n > 1 ? kommunVarden.filter((x) => x < v).length / (n - 1) : null,
      rang: v != null && arKommun && n > 1 ? kommunVarden.filter((x) => x > v).length + 1 : null,
      n,
    });
  }
  return { period: p, celler };
}

/** Kvantil ur en sorterad vektor */
export function kvantil(sorted: number[], q: number): number {
  if (sorted.length === 0) return NaN;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos), hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}
