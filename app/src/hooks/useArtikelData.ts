import { useState, useEffect } from "react";
import type { KpiRow, KpiMeta } from "../types";
import { ensureMeta, loadTema } from "./dataCache";

interface ArtikelDataState {
  data: KpiRow[];
  meta: KpiMeta[];
  loading: boolean;
}

/**
 * Ladda temadata för artikelgrafer.
 * Använder samma delade cache som useData — ingen dubblerad hämtning.
 */
export function useArtikelData(temaId: string): ArtikelDataState {
  const [data, setData] = useState<KpiRow[]>([]);
  const [meta, setMeta] = useState<KpiMeta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    Promise.all([ensureMeta(), loadTema(temaId)])
      .then(([{ meta: metaArr }, rows]) => {
        if (cancelled) return;
        setMeta(metaArr);
        setData(rows);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [temaId]);

  return { data, meta, loading };
}
