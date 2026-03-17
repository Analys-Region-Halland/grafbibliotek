import { useState, useEffect, useMemo, useRef } from "react";
import type { KpiRow, KpiMeta } from "../types";

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

/**
 * Lazy-laddar per-tema datasfiler.
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
  const base = import.meta.env.BASE_URL;

  // Initial: meta + befolkning
  useEffect(() => {
    Promise.all([
      fetch(`${base}data/halland-meta.json`).then((r) => r.json()),
      fetchMedProgress(`${base}data/halland-data-befolkning.json`, setProgress),
    ])
      .then(([metaData, befData]) => {
        setMeta(metaData as KpiMeta[]);
        setCache({ befolkning: befData as KpiRow[] });
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
      .then((rows) => {
        setCache((prev) => ({ ...prev, [aktivtTema]: rows as KpiRow[] }));
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
