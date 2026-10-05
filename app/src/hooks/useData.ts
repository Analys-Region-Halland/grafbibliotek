import { useState, useEffect, useMemo } from "react";
import type { KpiRow, KpiMeta } from "../types";
import { cleanRegionName, ensureMeta, loadTabell, loadTema } from "./dataCache";

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
 * Laddar metadata och det aktiva områdets kompakta tabellfil (några hundra kB).
 * Första laddningen visar förlopp; områden cachas för omedelbar återväxling.
 * Hela temafilen, som graf och karta behöver, laddas av useHelaTemat.
 */
export function useData(aktivtTema: string): DataState {
  const [meta, setMeta] = useState<KpiMeta[]>([]);
  const [cache, setCache] = useState<Record<string, KpiRow[]>>({});
  const [forsta, setForsta] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [temaError, setTemaError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [forsok, setForsok] = useState(0);

  useEffect(() => {
    ensureMeta().then(({ meta: m }) => setMeta(m)).catch((e: Error) => setError(e.message));
  }, []);

  useEffect(() => {
    if (cache[aktivtTema]) return;
    let aktiv = true;
    setTemaError(null);
    loadTabell(aktivtTema, forsta ? setProgress : undefined)
      .then((rows) => {
        if (!aktiv) return;
        setCache((prev) => ({ ...prev, [aktivtTema]: rows }));
        setForsta(false);
      })
      .catch((e: Error) => {
        if (!aktiv) return;
        if (forsta) setError(e.message);
        else setTemaError(`Kunde inte ladda området: ${e.message}`);
      });
    return () => { aktiv = false; };
  }, [aktivtTema, cache, forsta, forsok]);

  const data = useMemo(() => cache[aktivtTema] ?? [], [cache, aktivtTema]);

  return {
    data,
    meta,
    loading: forsta && error == null,
    temaLoading: !forsta && !cache[aktivtTema] && temaError == null,
    error,
    temaError: cache[aktivtTema] ? null : temaError,
    progress,
    retryTema: () => { setTemaError(null); setForsok((n) => n + 1); },
  };
}

/** Hela temafilen (alla kommuner och år) för graf och karta; laddas först när den behövs */
export function useHelaTemat(temaId: string | null): { rows: KpiRow[] | null; fel: string | null } {
  const [laddat, setLaddat] = useState<{ temaId: string; rows: KpiRow[] } | null>(null);
  const [fel, setFel] = useState<string | null>(null);

  useEffect(() => {
    if (!temaId) return;
    let aktiv = true;
    setFel(null);
    loadTema(temaId)
      .then((rows) => { if (aktiv) setLaddat({ temaId, rows }); })
      .catch((e: Error) => { if (aktiv) setFel(e.message); });
    return () => { aktiv = false; };
  }, [temaId]);

  return { rows: laddat && laddat.temaId === temaId ? laddat.rows : null, fel };
}
