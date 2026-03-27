/**
 * Delad datacache — modul-nivå singleton som lever hela sessionen.
 * Används av både useData (dashboard) och useArtikelData (artiklar).
 */
import type { KpiRow, KpiMeta, SlimRow, KommunEntry } from "../types";

// ─── Konstanter ───

export const HALLAND_SET = new Set([
  "0013", "1380", "1381", "1382", "1383", "1384", "1315",
]);

const REGION_NAMN_MAP: Record<string, string> = {
  "Region Stockholm": "Stockholm",
  "Region Uppsala": "Uppsala",
  "Region Sörmland": "Södermanland",
  "Region Östergötland": "Östergötland",
  "Region Jönköpings län": "Jönköping",
  "Region Kronoberg": "Kronoberg",
  "Region Kalmar": "Kalmar",
  "Region Gotland": "Gotland",
  "Region Blekinge": "Blekinge",
  "Region Skåne": "Skåne",
  "Region Halland": "Halland",
  "Västra Götalandsregionen": "Västra Götaland",
  "Region Värmland": "Värmland",
  "Region Örebro län": "Örebro",
  "Region Västmanland": "Västmanland",
  "Region Dalarna": "Dalarna",
  "Region Gävleborg": "Gävleborg",
  "Region Västernorrland": "Västernorrland",
  "Region Jämtland Härjedalen": "Jämtland",
  "Region Västerbotten": "Västerbotten",
  "Region Norrbotten": "Norrbotten",
};

export function cleanRegionName(namn: string, typ: string): string {
  if (typ !== "L" || namn === "Riket") return namn;
  return REGION_NAMN_MAP[namn] ?? namn;
}

// ─── Fetch med progress ───

export async function fetchMedProgress(
  url: string,
  onProgress: (frac: number) => void,
): Promise<unknown> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const contentLength = res.headers.get("Content-Length");
  if (!contentLength || !res.body) {
    return res.json();
  }

  const total = parseInt(contentLength, 10);
  let loaded = 0;
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.length;
    onProgress(Math.min(loaded / total, 1));
  }

  const combined = new Uint8Array(loaded);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.length;
  }

  const text = new TextDecoder().decode(combined);
  return JSON.parse(text);
}

// ─── Hydrera slim → full ───

export function hydrate(
  slim: SlimRow[],
  metaMap: Map<string, KpiMeta>,
  kommunMap: Map<string, { namn: string; typ: string }>,
): KpiRow[] {
  const rows: KpiRow[] = new Array(slim.length);
  for (let i = 0; i < slim.length; i++) {
    const s = slim[i];
    const m = metaMap.get(s.k);
    const km = kommunMap.get(s.m);
    const v = s.v ?? null;
    const r = s.r ?? null;
    rows[i] = {
      kpi_id: s.k,
      kommun_kod: s.m,
      kommun_typ: s.t,
      ar: s.a,
      varde: v,
      riksvarde: r,
      rang_total: s.rg ?? null,
      antal_kommuner: s.n ?? null,
      trend_1ar: s.t1 ?? null,
      trend_5ar: s.t5 ?? null,
      trend_10ar: s.t10 ?? null,
      ki_lower: s.kl ?? null,
      ki_upper: s.kh ?? null,
      kpi_namn: m?.kpi_namn ?? "",
      enhet: m?.enhet ?? "",
      tema: m?.tema ?? "",
      kommun_namn: km ? cleanRegionName(km.namn, km.typ) : "",
      halland: HALLAND_SET.has(s.m),
      diff_riket: v != null && r != null ? Math.round((v - r) * 100) / 100 : null,
      diff_riket_pct: v != null && r != null && r !== 0
        ? Math.round((v - r) / r * 10000) / 100 : null,
      trend_riktning: (s.t1 ?? s.t5) != null
        ? ((s.t1 ?? s.t5)! > 0 ? "upp" : (s.t1 ?? s.t5)! < 0 ? "ned" : "oforandrad")
        : null,
    };
  }
  return rows;
}

// ─── Modul-nivå cache ───

let metaPromise: Promise<{
  meta: KpiMeta[];
  metaMap: Map<string, KpiMeta>;
  kommunMap: Map<string, { namn: string; typ: string }>;
}> | null = null;

const temaCache: Record<string, KpiRow[]> = {};
const temaPromises: Record<string, Promise<KpiRow[]>> = {};

const BASE = import.meta.env.BASE_URL;

/** Ladda meta + kommun-register (cachas, anropas bara en gång) */
export function ensureMeta() {
  if (!metaPromise) {
    metaPromise = Promise.all([
      fetch(`${BASE}data/halland-meta.json`).then((r) => r.json()),
      fetch(`${BASE}data/kommun-register.json`).then((r) => r.json()),
    ]).then(([metaData, kommunData]) => {
      const meta = metaData as KpiMeta[];
      const metaMap = new Map<string, KpiMeta>();
      for (const m of meta) metaMap.set(m.kpi_id, m);

      const kommunMap = new Map<string, { namn: string; typ: string }>();
      for (const k of kommunData as KommunEntry[]) {
        kommunMap.set(k.k, { namn: k.n, typ: k.t });
      }

      return { meta, metaMap, kommunMap };
    });
  }
  return metaPromise;
}

/** Ladda en temafil (cachas per temaId) */
export async function loadTema(temaId: string): Promise<KpiRow[]> {
  if (temaCache[temaId]) return temaCache[temaId];

  if (!temaPromises[temaId]) {
    temaPromises[temaId] = (async () => {
      const { metaMap, kommunMap } = await ensureMeta();
      const res = await fetch(`${BASE}data/halland-data-${temaId}.json`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const slim = (await res.json()) as SlimRow[];
      const rows = hydrate(slim, metaMap, kommunMap);
      temaCache[temaId] = rows;
      return rows;
    })();
  }

  return temaPromises[temaId];
}

/** Spara temadata i cachen (används av useData vid initial laddning med progress) */
export function putTema(temaId: string, rows: KpiRow[]) {
  temaCache[temaId] = rows;
}

/** Kolla om ett tema redan finns i cachen */
export function hasTema(temaId: string): boolean {
  return temaId in temaCache;
}
