import { useState, useEffect, useMemo, useRef } from "react";
import type { KpiRow, KpiMeta, SlimRow, KommunEntry } from "../types";

interface DataState {
  data: KpiRow[];
  meta: KpiMeta[];
  loading: boolean;
  temaLoading: boolean;
  error: string | null;
  temaError: string | null;
  progress: number;
  retryTema: () => void;
}

// Halland-koder (region + kommuner) — för halland-flagga
const HALLAND_SET = new Set(["0013", "1380", "1381", "1382", "1383", "1384", "1315"]);

/** Hämta med progress-tracking via ReadableStream */
async function fetchMedProgress(
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

/** Hydrera slim-rader till fulla KpiRow med data från meta + kommun-register */
function hydrate(
  slim: SlimRow[],
  metaMap: Map<string, KpiMeta>,
  kommunMap: Map<string, { namn: string; typ: string }>,
): KpiRow[] {
  const rows: KpiRow[] = new Array(slim.length);
  for (let i = 0; i < slim.length; i++) {
    const s = slim[i];
    const m = metaMap.get(s.k);
    const km = kommunMap.get(s.m);
    const v = s.v;
    const r = s.r;
    rows[i] = {
      kpi_id: s.k,
      kommun_kod: s.m,
      kommun_typ: s.t,
      ar: s.a,
      varde: v,
      riksvarde: r,
      rang_total: s.rg,
      antal_kommuner: s.n,
      trend_5ar: s.t5,
      trend_10ar: s.t10 ?? null,
      ki_lower: s.kl ?? null,
      ki_upper: s.kh ?? null,
      // Hydrerade fält
      kpi_namn: m?.kpi_namn ?? "",
      enhet: m?.enhet ?? "",
      tema: m?.tema ?? "",
      kommun_namn: km?.namn ?? "",
      halland: HALLAND_SET.has(s.m),
      diff_riket: v != null && r != null ? Math.round((v - r) * 100) / 100 : null,
      diff_riket_pct: v != null && r != null && r !== 0
        ? Math.round((v - r) / r * 10000) / 100 : null,
      trend_riktning: s.t5 != null ? (s.t5 > 0 ? "upp" : s.t5 < 0 ? "ned" : "oforandrad") : null,
    };
  }
  return rows;
}

/**
 * Lazy-laddar per-tema datasfiler (slim-format).
 * Befolkning laddas initialt (med progress), övriga teman vid behov.
 * Varje tema cachas efter första laddning för omedelbar återväxling.
 */
export function useData(aktivtTema: string): DataState {
  const [meta, setMeta] = useState<KpiMeta[]>([]);
  const [cache, setCache] = useState<Record<string, KpiRow[]>>({});
  const [initialLoading, setInitialLoading] = useState(true);
  const [temaLoading, setTemaLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [temaError, setTemaError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const loadingRef = useRef<Set<string>>(new Set());
  // Lookup-maps byggs en gång vid initial laddning
  const metaMapRef = useRef<Map<string, KpiMeta>>(new Map());
  const kommunMapRef = useRef<Map<string, { namn: string; typ: string }>>(new Map());
  const base = import.meta.env.BASE_URL;

  // Initial: meta + kommun-register + befolkning
  useEffect(() => {
    Promise.all([
      fetch(`${base}data/halland-meta.json`).then((r) => r.json()),
      fetch(`${base}data/kommun-register.json`).then((r) => r.json()),
      fetchMedProgress(`${base}data/halland-data-befolkning.json`, setProgress),
    ])
      .then(([metaData, kommunData, befSlim]) => {
        const metaArr = metaData as KpiMeta[];
        setMeta(metaArr);

        // Bygg lookup-maps
        const mMap = new Map<string, KpiMeta>();
        for (const m of metaArr) mMap.set(m.kpi_id, m);
        metaMapRef.current = mMap;

        const kMap = new Map<string, { namn: string; typ: string }>();
        for (const k of kommunData as KommunEntry[]) kMap.set(k.k, { namn: k.n, typ: k.t });
        kommunMapRef.current = kMap;

        // Hydrera befolkningsdata
        const befRows = hydrate(befSlim as SlimRow[], mMap, kMap);
        setCache({ befolkning: befRows });
        setInitialLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setInitialLoading(false);
      });
  }, []);

  // Ladda aktivt tema vid behov
  useEffect(() => {
    if (initialLoading) return;
    if (cache[aktivtTema]) return;
    if (loadingRef.current.has(aktivtTema)) return;

    loadingRef.current.add(aktivtTema);
    setTemaLoading(true);
    setTemaError(null);

    fetch(`${base}data/halland-data-${aktivtTema}.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((slim) => {
        const rows = hydrate(
          slim as SlimRow[],
          metaMapRef.current,
          kommunMapRef.current,
        );
        setCache((prev) => ({ ...prev, [aktivtTema]: rows }));
        loadingRef.current.delete(aktivtTema);
        setTemaLoading(false);
      })
      .catch((err) => {
        loadingRef.current.delete(aktivtTema);
        setTemaError(`Kunde inte ladda tema: ${err.message}`);
        setTemaLoading(false);
      });
  }, [aktivtTema, initialLoading, cache, retryCount]);

  const retryTema = () => {
    setTemaError(null);
    setRetryCount((c) => c + 1);
  };

  const data = useMemo(() => cache[aktivtTema] ?? [], [cache, aktivtTema]);

  return {
    data,
    meta,
    loading: initialLoading,
    temaLoading: temaLoading && !cache[aktivtTema],
    error,
    temaError: cache[aktivtTema] ? null : temaError,
    progress,
    retryTema,
  };
}
