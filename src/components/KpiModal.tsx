import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import type { KpiRow, KpiMeta } from "../types";
import Tidsserie, { downloadSvgAsPng, downloadSvgAsFile } from "../charts/Tidsserie";
import type { VisningsLage } from "../charts/Tidsserie";
import KartaVy from "../charts/KartaVy";
import { getAllVisningsnamn, getAllNettoKpis, getAllIngetIndex } from "../teman";
import { fullKalla } from "../utils/kalla";
import { fmtPeriod } from "../utils/format";
import { useContainerWidth } from "../hooks/useContainerWidth";
import { useMapData } from "../hooks/useMapData";

// Hämta visningsnamn, netto-KPI:er och index-undantag från tema-registret
const VISNINGSNAMN = getAllVisningsnamn();
const INGET_INDEX = getAllIngetIndex();

/** Rensat visningsnamn med fallback */
function visningsNamn(kpiId: string, fallback: string): string {
  if (VISNINGSNAMN[kpiId]) return VISNINGSNAMN[kpiId];
  return fallback
    .replace(/,\s*(antal|procent|andel\s*\(%?\)|år)\s*$/i, "")
    .replace(/\s+i antal invånare\s+/i, " ")
    .trim();
}

// Netto-KPI:er som visas per 1 000 invånare (döljer andel/antal-toggle + index)
const NETTO_KPIS = getAllNettoKpis();

// Fasta exportdimensioner — fullupplöst oavsett skärmstorlek
const EXPORT_W = 900;
const EXPORT_H = 556;

/** Enhetsetikett för undertitel */
function enhetEtikett(enhet: string): string {
  switch (enhet) {
    case "antal": return "Antal";
    case "procent": return "Procent";
    case "kvot": return "Kvot";
    case "år": return "År";
    case "barn/kvinna": return "Barn per kvinna";
    case "inv/kvm": return "Invånare per km²";
    default: return enhet.charAt(0).toUpperCase() + enhet.slice(1);
  }
}

interface Props {
  kpiId: string;
  kpiNamn: string;
  beskrivning: string;
  enhet: string;
  kommunKod: string;
  kommunNamn: string;
  isRegion: boolean;
  allData: KpiRow[];
  allMeta: KpiMeta[];
  onClose: () => void;
}

export default function KpiModal({
  kpiId, kpiNamn, enhet, kommunKod, kommunNamn, isRegion, allData, allMeta, onClose,
}: Props) {
  const [lage, setLage] = useState<VisningsLage>("alla");
  const [visaAntal, setVisaAntal] = useState(false);
  const [visaNoll, setVisaNoll] = useState(false);
  const [visaIndex, setVisaIndex] = useState(false);
  const [visning, setVisning] = useState<"graf" | "karta">("graf");
  const chartRef = useRef<HTMLDivElement>(null);

  // Mät chartRef-divens bredd med ResizeObserver
  const [measureRef, chartWidth] = useContainerWidth();

  // Callback-ref: koppla ihop chartRef (för export) och measureRef (för breddmätning)
  const setChartRefs = useCallback((node: HTMLDivElement | null) => {
    (chartRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
    measureRef(node);
  }, [measureRef]);

  // Lazy-ladda kartdata (bara när kartfliken är aktiv)
  const { mapData, loading: mapLoading } = useMapData(visning === "karta");

  // Responsiv höjd — mobil: fasta höjder baserade på viewport, desktop: ratio
  const chartHeight = chartWidth > 0
    ? visning === "karta"
      ? (chartWidth < 500
        ? Math.min(Math.round(window.innerHeight * 0.6), 500)
        : Math.round(chartWidth * 0.7))
      : (chartWidth < 500
        ? Math.min(Math.round(window.innerHeight * 0.5), 400)
        : Math.round(chartWidth * 0.62))
    : 0;

  // Hitta par-KPI (andel↔antal)
  const currentMeta = allMeta.find((m) => m.kpi_id === kpiId);
  const parKpiId = currentMeta?.par_kpi_id ?? null;
  const parMeta = parKpiId ? allMeta.find((m) => m.kpi_id === parKpiId) : null;
  const harPar = parMeta != null && !NETTO_KPIS.has(kpiId);

  // Netto-KPI: toggle mellan per 1 000 och råa antal
  const isNetto = NETTO_KPIS.has(kpiId);
  const [nettoRatt, setNettoRatt] = useState(false); // false = per 1 000, true = antal

  // Aktivt KPI baserat på toggle
  const aktivtKpiId = visaAntal && parKpiId ? parKpiId : kpiId;
  const aktivtMeta = visaAntal && parMeta ? parMeta : currentMeta;
  const aktivtEnhet = isNetto
    ? (nettoRatt ? "antal" : "per 1 000 inv.")
    : (aktivtMeta?.enhet ?? enhet);
  const aktivtNamn = aktivtMeta?.kpi_namn ?? kpiNamn;

  // Ren titel
  const titel = visningsNamn(aktivtKpiId, aktivtNamn);

  // Tidsperiod
  const period = useMemo(() => {
    const years = allData
      .filter((d) => d.kpi_id === aktivtKpiId && d.varde != null)
      .map((d) => d.ar);
    if (years.length === 0) return "";
    const min = Math.min(...years);
    const max = Math.max(...years);
    return min === max ? fmtPeriod(min) : `${fmtPeriod(min)}–${fmtPeriod(max)}`;
  }, [allData, aktivtKpiId]);

  // Basår för index
  const basAr = useMemo(() => {
    const years = allData
      .filter((d) => d.kpi_id === aktivtKpiId && d.varde != null)
      .map((d) => d.ar);
    return years.length > 0 ? Math.min(...years) : null;
  }, [allData, aktivtKpiId]);

  // Undertiteldelar
  const subtitelEnhet = visaIndex && basAr ? `Index (${basAr} = 100)` : enhetEtikett(aktivtEnhet);
  const subtitelGeografi = isRegion ? kommunNamn : `${kommunNamn} kommun`;
  const subtitelKontext = lage === "alla"
    ? (isRegion ? "samtliga regioner" : "samtliga kommuner")
    : lage === "halland"
    ? "halländska kommuner"
    : undefined;

  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") onClose();
  }, [onClose]);

  useEffect(() => {
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [handleKey]);

  const getSvgAndSlug = () => {
    const svg = chartRef.current?.querySelector("svg");
    if (!svg) return null;
    const slug = titel.toLowerCase().replace(/[^a-zåäö0-9]+/g, "-").replace(/-+$/, "");
    return { svg, slug };
  };

  const handleDownloadPng = () => {
    const res = getSvgAndSlug();
    if (res) downloadSvgAsPng(res.svg, `${kommunNamn}-${res.slug}.png`, EXPORT_W, EXPORT_H);
  };

  const handleDownloadSvg = () => {
    const res = getSvgAndSlug();
    if (res) downloadSvgAsFile(res.svg, `${kommunNamn}-${res.slug}.svg`, EXPORT_W, EXPORT_H);
  };

  const pill = (val: VisningsLage, label: string) => (
    <button
      onClick={() => setLage(val)}
      className={`text-[11px] px-3 min-h-[36px] sm:min-h-0 py-1.5 sm:py-1 rounded-full cursor-pointer transition-colors ${
        lage === val
          ? "bg-neutral-800 text-white"
          : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"
      }`}
    >
      {label}
    </button>
  );

  const andelLabel = enhet === "procent" ? "Andel (%)" : enhet === "kvot" ? "Kvot" : enhetEtikett(enhet);
  const antalLabel = "Antal";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/25 backdrop-blur-[2px]"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white w-full h-full rounded-none
                      sm:rounded-xl sm:max-w-[960px] sm:w-[95vw] sm:max-h-[92vh] sm:h-auto
                      overflow-y-auto">
        {/* Kontroller */}
        <div className="px-4 sm:px-6 pt-4 pb-1">
          <div className="flex flex-wrap gap-1.5 items-center">
            {/* Flik-toggle: Graf / Karta */}
            <button
              onClick={() => setVisning("graf")}
              className={`text-[11px] px-3 min-h-[36px] sm:min-h-0 py-1.5 sm:py-1 rounded-full cursor-pointer transition-colors flex items-center gap-1 ${
                visning === "graf"
                  ? "bg-neutral-800 text-white"
                  : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"
              }`}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
              Graf
            </button>
            <button
              onClick={() => setVisning("karta")}
              className={`text-[11px] px-3 min-h-[36px] sm:min-h-0 py-1.5 sm:py-1 rounded-full cursor-pointer transition-colors flex items-center gap-1 ${
                visning === "karta"
                  ? "bg-neutral-800 text-white"
                  : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"
              }`}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
                <line x1="8" y1="2" x2="8" y2="18" />
                <line x1="16" y1="6" x2="16" y2="22" />
              </svg>
              Karta
            </button>

            {visning === "graf" && (
              <>
                <span className="w-px h-4 bg-neutral-200 mx-0.5 sm:mx-1.5 hidden sm:block" />
                {pill("alla", isRegion ? "Alla regioner" : "Alla kommuner")}
                {pill("halland", "Halland")}
                {pill("egen", `Bara ${kommunNamn}`)}
              </>
            )}

            {harPar && (
              <>
                <span className="w-px h-4 bg-neutral-200 mx-0.5 sm:mx-1.5 hidden sm:block" />
                <button
                  onClick={() => setVisaAntal(false)}
                  className={`text-[11px] px-3 min-h-[36px] sm:min-h-0 py-1.5 sm:py-1 rounded-full cursor-pointer transition-colors ${
                    !visaAntal
                      ? "bg-gron-1 text-white"
                      : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"
                  }`}
                >
                  {andelLabel}
                </button>
                <button
                  onClick={() => setVisaAntal(true)}
                  className={`text-[11px] px-3 min-h-[36px] sm:min-h-0 py-1.5 sm:py-1 rounded-full cursor-pointer transition-colors ${
                    visaAntal
                      ? "bg-gron-1 text-white"
                      : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"
                  }`}
                >
                  {antalLabel}
                </button>
              </>
            )}

            {isNetto && (
              <>
                <span className="w-px h-4 bg-neutral-200 mx-0.5 sm:mx-1.5 hidden sm:block" />
                <button
                  onClick={() => setNettoRatt(false)}
                  className={`text-[11px] px-3 min-h-[36px] sm:min-h-0 py-1.5 sm:py-1 rounded-full cursor-pointer transition-colors ${
                    !nettoRatt
                      ? "bg-gron-1 text-white"
                      : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"
                  }`}
                >
                  Per 1 000 inv.
                </button>
                <button
                  onClick={() => setNettoRatt(true)}
                  className={`text-[11px] px-3 min-h-[36px] sm:min-h-0 py-1.5 sm:py-1 rounded-full cursor-pointer transition-colors ${
                    nettoRatt
                      ? "bg-gron-1 text-white"
                      : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"
                  }`}
                >
                  Antal
                </button>
              </>
            )}

            {aktivtEnhet === "antal" && !isNetto && !INGET_INDEX.has(kpiId) && (
              <>
                <span className="w-px h-4 bg-neutral-200 mx-0.5 sm:mx-1.5 hidden sm:block" />
                <button
                  onClick={() => setVisaIndex((v) => !v)}
                  className={`text-[11px] px-3 min-h-[36px] sm:min-h-0 py-1.5 sm:py-1 rounded-full cursor-pointer transition-colors ${
                    visaIndex
                      ? "bg-bla-1 text-white"
                      : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"
                  }`}
                >
                  Index
                </button>
              </>
            )}

            {visning === "graf" && lage === "egen" && (
              <>
                <span className="w-px h-4 bg-neutral-200 mx-0.5 sm:mx-1.5 hidden sm:block" />
                <button
                  onClick={() => setVisaNoll((v) => !v)}
                  className={`text-[11px] px-3 min-h-[36px] sm:min-h-0 py-1.5 sm:py-1 rounded-full cursor-pointer transition-colors ${
                    visaNoll
                      ? "bg-neutral-800 text-white"
                      : "bg-neutral-100 text-neutral-400 hover:bg-neutral-200"
                  }`}
                >
                  Visa 0
                </button>
              </>
            )}
          </div>

          {/* Download + stäng */}
          <div className="flex items-center justify-end gap-3 mt-2 sm:mt-0">
            <button
              onClick={handleDownloadPng}
              className="text-[11px] text-neutral-500 hover:text-neutral-800 cursor-pointer
                         flex items-center gap-1 transition-colors"
              title="Ladda ner som PNG"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              PNG
            </button>
            <button
              onClick={handleDownloadSvg}
              className="text-[11px] text-neutral-500 hover:text-neutral-800 cursor-pointer
                         flex items-center gap-1 transition-colors"
              title="Ladda ner som SVG"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              SVG
            </button>
            <button
              onClick={onClose}
              className="text-neutral-400 hover:text-black text-xl leading-none px-1 cursor-pointer"
              aria-label="Stäng"
            >
              ×
            </button>
          </div>
        </div>

        {/* Visualisering: Graf eller Karta */}
        <div className="px-2 sm:px-4 pt-1 pb-2" ref={setChartRefs}>
          {chartWidth > 0 && visning === "graf" && (
            <Tidsserie
              valdKommunKod={kommunKod}
              valdKommunNamn={kommunNamn}
              isRegion={isRegion}
              kpiId={aktivtKpiId}
              enhet={aktivtEnhet}
              allData={allData}
              visningsLage={lage}
              visaNoll={visaNoll}
              indexMode={visaIndex}
              titel={titel}
              subtitelEnhet={subtitelEnhet}
              subtitelGeografi={subtitelGeografi}
              subtitelKontext={subtitelKontext}
              subtitelPeriod={period}
              kalla={fullKalla(aktivtMeta?.beskrivning)}
              width={chartWidth}
              height={chartHeight}
            />
          )}
          {chartWidth > 0 && visning === "karta" && mapLoading && (
            <div className="flex items-center justify-center" style={{ height: chartHeight }}>
              <span className="text-sm text-neutral-400">Laddar karta…</span>
            </div>
          )}
          {chartWidth > 0 && visning === "karta" && mapData && (
            <KartaVy
              valdKommunKod={kommunKod}
              valdKommunNamn={kommunNamn}
              isRegion={isRegion}
              kpiId={aktivtKpiId}
              enhet={aktivtEnhet}
              allData={allData}
              indexMode={visaIndex}
              titel={titel}
              subtitelEnhet={subtitelEnhet}
              subtitelGeografi={subtitelGeografi}
              kalla={fullKalla(aktivtMeta?.beskrivning)}
              width={chartWidth}
              height={chartHeight}
              mapData={mapData}
            />
          )}
        </div>

        {/* Stäng */}
        <div className="px-4 sm:px-6 py-3 border-t border-neutral-100 text-right">
          <button
            onClick={onClose}
            className="text-xs text-neutral-400 hover:text-gron-1 cursor-pointer"
          >
            Stäng · Esc
          </button>
        </div>
      </div>
    </div>
  );
}
