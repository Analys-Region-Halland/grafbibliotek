import { useState, useEffect } from "react";
import type { ArtikelMeta, Artikel } from "../types";

const BASE = import.meta.env.BASE_URL;

// Modul-nivå cache
let manifestCache: ArtikelMeta[] | null = null;
let manifestPromise: Promise<ArtikelMeta[]> | null = null;
const artikelCache: Record<string, Artikel> = {};

/** Ladda artikelmanifestet (cachat) */
export function useArtiklar() {
  const [artiklar, setArtiklar] = useState<ArtikelMeta[]>(manifestCache ?? []);
  const [loading, setLoading] = useState(!manifestCache);

  useEffect(() => {
    if (manifestCache) return;
    if (!manifestPromise) {
      manifestPromise = fetch(`${BASE}data/artiklar/index.json`)
        .then((r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.json();
        })
        .then((data: unknown) => {
          const arr = data as ArtikelMeta[];
          manifestCache = arr;
          return arr;
        })
        .catch(() => {
          manifestCache = [];
          return [];
        });
    }
    manifestPromise.then((arr) => {
      setArtiklar(arr);
      setLoading(false);
    });
  }, []);

  return { artiklar, loading };
}

/** Ladda en enskild artikel (cachat) */
export function useArtikel(slug: string | null) {
  const [artikel, setArtikel] = useState<Artikel | null>(
    slug && artikelCache[slug] ? artikelCache[slug] : null,
  );
  const [loading, setLoading] = useState<boolean>(!!slug && !artikelCache[slug!]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    if (artikelCache[slug]) {
      setArtikel(artikelCache[slug]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    fetch(`${BASE}data/artiklar/${slug}.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`Artikeln hittades inte`);
        return r.json();
      })
      .then((data: unknown) => {
        const art = data as Artikel;
        artikelCache[slug] = art;
        setArtikel(art);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [slug]);

  return { artikel, loading, error };
}
