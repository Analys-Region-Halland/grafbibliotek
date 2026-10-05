import { useState, useEffect, useCallback } from "react";
import { ENHET_SLUG } from "../types";
import { TEMAN } from "../teman";

/**
 * Adressen bär hela läget, så att en länk öppnar exakt det man tittar på:
 * #/<enhet>/<tema> är ett område och #/<enhet>/<tema>/<kpi> en öppen indikator.
 * Enheten är länet, en kommun eller "alla" (kommunerna sida vid sida).
 */
export interface Route {
  enhet: string;
  tema: string;
  kpi: string | null;
}

const KOD_FOR_SLUG = new Map(Object.entries(ENHET_SLUG).map(([kod, slug]) => [slug, kod]));
const TEMA_IDS = new Set(TEMAN.map((t) => t.temaId));
const FORSTA_TEMA = TEMAN[0].temaId;

/** Okänd enhet eller tema (även tomma och gamla adresser som #/analys) ger Halland och första området */
export function parseHash(hash: string): Route {
  const delar = hash.replace(/^#\/?/, "").split("/").filter(Boolean).map(decodeURIComponent);
  const enhet = KOD_FOR_SLUG.get((delar[0] ?? "").toLowerCase()) ?? "0013";
  const tema = delar[1] && TEMA_IDS.has(delar[1]) ? delar[1] : FORSTA_TEMA;
  const kpi = tema === delar[1] ? delar[2] ?? null : null;
  return { enhet, tema, kpi };
}

export function hashFor(r: Route): string {
  const e = ENHET_SLUG[r.enhet] ?? ENHET_SLUG["0013"];
  return `#/${e}/${r.tema}${r.kpi ? `/${encodeURIComponent(r.kpi)}` : ""}`;
}

/** Skriver om adressen till sin kanoniska form utan ny post i historiken */
function kanonisera(): Route {
  const r = parseHash(window.location.hash);
  const h = hashFor(r);
  if (window.location.hash !== h) history.replaceState(null, "", h);
  return r;
}

export function useHash() {
  const [route, setRoute] = useState<Route>(kanonisera);

  useEffect(() => {
    const handler = () => setRoute(kanonisera());
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, []);

  /** Gå till ett läge; ersatt = utan ny post i historiken */
  const navigate = useCallback((r: Route, ersatt = false) => {
    const h = hashFor(r);
    if (ersatt) {
      history.replaceState(null, "", h);
      setRoute(r);
    } else if (window.location.hash !== h) {
      window.location.hash = h;
    }
  }, []);

  return { route, navigate };
}
