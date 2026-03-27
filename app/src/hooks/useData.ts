import { useState, useEffect, useMemo, useRef } from "react";
import type { KpiRow, KpiMeta, SlimRow } from "../types";
import {
  cleanRegionName,
  fetchMedProgress,
  hydrate,
  ensureMeta,
  putTema,
  hasTema,
  loadTema as loadTemaFromCache,
} from "./dataCache";

// Re-exportera cleanRegionName för App.tsx som importerar det härifrån
export { cleanRegionName };

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
  const metaMapRef = useRef<Map<string, KpiMeta>>(new Map());
  const kommunMapRef = useRef<Map<string, { namn: string; typ: string }>>(new Map());
  const base = import.meta.env.BASE_URL;

  // Initial: meta + kommun-register + befolkning
  useEffect(() => {
    Promise.all([
      ensureMeta(),
      fetchMedProgress(`${base}data/halland-data-befolkning.json`, setProgress),
    ])
      .then(([{ meta: metaArr, metaMap, kommunMap }, befSlim]) => {
        setMeta(metaArr);
        metaMapRef.current = metaMap;
        kommunMapRef.current = kommunMap;

        const befRows = hydrate(befSlim as SlimRow[], metaMap, kommunMap);
        putTema("befolkning", befRows);
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

    // Om redan i delad cache (laddad av artikelvy) — använd direkt
    if (hasTema(aktivtTema)) {
      loadTemaFromCache(aktivtTema).then((rows) => {
        setCache((prev) => ({ ...prev, [aktivtTema]: rows }));
      });
      return;
    }

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
        putTema(aktivtTema, rows);
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
