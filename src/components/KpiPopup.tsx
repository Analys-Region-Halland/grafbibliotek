import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import type { KpiRow, KpiMeta, KommunEntry } from "../types";
import Tidsserie, { downloadSvgAsPng, downloadSvgAsFile, calcLeftMargin } from "../charts/Tidsserie";
import type { ExportHeader } from "../charts/Tidsserie";
import KartaVy from "../charts/KartaVy";
import type { KommunGruppData } from "./ControlDrawer";
import { getAllVisningsnamn, getAllNettoKpis, getAllIngetIndex } from "../teman";
import { fullKalla } from "../utils/kalla";
import { fmtPeriod, fmt, isMonthly, sameMonthLastYear } from "../utils/format";
import { useContainerWidth } from "../hooks/useContainerWidth";
import { useMapData } from "../hooks/useMapData";
import { getKpiText } from "../utils/kpi-texter";
import JamforPanel from "./JamforPanel";
import { useJamfor } from "../hooks/useJamfor";

// ─── Konstanter ───

const VISNINGSNAMN = getAllVisningsnamn();
const INGET_INDEX = getAllIngetIndex();
const NETTO_KPIS = getAllNettoKpis();
const EXPORT_W = 900;
const EXPORT_H = 556;

// Sydvästsverige — regionkoder
// Sydvästsverige-koder definierade i JamforPanel

function visningsNamn(kpiId: string, fallback: string): string {
  if (VISNINGSNAMN[kpiId]) return VISNINGSNAMN[kpiId];
  return fallback
    .replace(/,\s*(antal|procent|andel\s*\(%?\)|år)\s*$/i, "")
    .replace(/\s+i antal invånare\s+/i, " ")
    .trim();
}

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

function fmtKort(v: number | null, enhet: string): string {
  if (v == null) return "–";
  if (enhet === "antal") return fmt(v, 0);
  return fmt(v, Math.abs(v) >= 100 ? 0 : Math.abs(v) < 10 ? 2 : 1);
}

// ─── Generisk click-outside hook ───

function useClickOutside(ref: React.RefObject<HTMLDivElement | null>, open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onClose]);
}

// ─── Tvådelad chip ───

function SplitChip({
  label,
  value,
  open,
  onToggle,
  children,
}: {
  label: string;
  value: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, open, onToggle);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={onToggle}
        className="inline-flex items-center rounded-full border border-neutral-200 hover:border-neutral-400
                   transition-all cursor-pointer select-none overflow-hidden"
      >
        <span className="text-[11px] px-2.5 py-1.5 text-neutral-400 bg-neutral-50 border-r border-neutral-200">
          {label}
        </span>
        <span className="text-[12px] px-2.5 py-1.5 text-neutral-700 font-medium flex items-center gap-1">
          {value}
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
               className={`transition-transform text-neutral-400 ${open ? "rotate-180" : ""}`}>
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1.5 z-50 bg-white rounded-xl border border-neutral-200
                        shadow-lg shadow-black/8 min-w-[220px] overflow-hidden animate-[fadeIn_100ms_ease-out]">
          {children}
        </div>
      )}
    </div>
  );
}

// ─── Props ───

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
  kommunRegister: KommunEntry[];
  kommunGrupper: KommunGruppData | null;
  onClose: () => void;
}

// ─── Huvudkomponent ───

export default function KpiPopup({
  kpiId, kpiNamn, enhet, kommunKod, kommunNamn, isRegion,
  allData, allMeta, kommunRegister, kommunGrupper,
  onClose,
}: Props) {
  // ── Visning ──
  const [visning, setVisning] = useState<"graf" | "karta">("graf");

  // ── Par-KPI (andel↔antal) ──
  const currentMeta = allMeta.find((m) => m.kpi_id === kpiId);
  const parKpiId = currentMeta?.par_kpi_id ?? null;
  const parMeta = parKpiId ? allMeta.find((m) => m.kpi_id === parKpiId) : null;
  const harPar = parMeta != null && !NETTO_KPIS.has(kpiId);
  const isNetto = NETTO_KPIS.has(kpiId);

  // ── Mått-state ──
  const [visaAntal, setVisaAntal] = useState(false);
  const [visaIndex, setVisaIndex] = useState(false);
  const [visaNoll, setVisaNoll] = useState(false);
  const [nettoRatt, setNettoRatt] = useState(false);

  // ── Aktivt KPI ──
  const aktivtKpiId = visaAntal && parKpiId ? parKpiId : kpiId;
  const aktivtMeta = visaAntal && parMeta ? parMeta : currentMeta;
  const aktivtEnhet = isNetto
    ? (nettoRatt ? "antal" : "per 1 000 inv.")
    : (aktivtMeta?.enhet ?? enhet);
  const aktivtNamn = aktivtMeta?.kpi_namn ?? kpiNamn;

  const titel = visningsNamn(aktivtKpiId, aktivtNamn);
  const kanVisaIndex = aktivtEnhet === "antal" && !isNetto && !INGET_INDEX.has(kpiId);

  // ── Jämför — samlad panel (ersätter gamla Referensområde + Jämför) ──
  const { state: jamfor, dispatch: jamforDispatch, totalActive: antalJamforelser } = useJamfor();
  const [openJamfor, setOpenJamfor] = useState(false);
  const jamforRef = useRef<HTMLDivElement>(null);
  useClickOutside(jamforRef, openJamfor, () => setOpenJamfor(false));

  // ── Mått-dropdown ──
  const [openMattMenu, setOpenMattMenu] = useState(false);

  // ── Referenslinjer (från jamfor-state) ──
  // Riket/Länssnitt inte meningsfullt vid absoluta tal (antal), utom i index-läge
  const isAbsolut = aktivtEnhet === "antal" && !visaIndex;
  const showRiksnitt = !isAbsolut && jamfor.refs.has("__rikssnitt__");
  const showLanssnitt = !isAbsolut && jamfor.refs.has("__lanssnitt__") && !isRegion;
  const showMedian = jamfor.refs.has("__median__");

  // ── Refs ──
  const chartRef = useRef<HTMLDivElement>(null);
  const [measureRef, chartWidth] = useContainerWidth();
  const setChartRefs = useCallback((node: HTMLDivElement | null) => {
    (chartRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
    measureRef(node);
  }, [measureRef]);

  const { mapData, loading: mapLoading } = useMapData(visning === "karta");

  // ── Responsiv höjd ──
  const chartHeight = chartWidth > 0
    ? visning === "karta"
      ? (chartWidth < 500
        ? Math.min(Math.round(window.innerHeight * 0.65), 520)
        : Math.round(chartWidth * 0.7))
      : (chartWidth < 500
        ? Math.min(Math.round(window.innerHeight * 0.50), 400)
        : Math.round(chartWidth * 0.65))
    : 0;

  // ── Tidsperiod ──
  const period = useMemo(() => {
    const years = allData
      .filter((d) => d.kpi_id === aktivtKpiId && d.varde != null)
      .map((d) => d.ar);
    if (years.length === 0) return "";
    const min = Math.min(...years);
    const max = Math.max(...years);
    return min === max ? fmtPeriod(min) : `${fmtPeriod(min)}–${fmtPeriod(max)}`;
  }, [allData, aktivtKpiId]);

  const basAr = useMemo(() => {
    const years = allData
      .filter((d) => d.kpi_id === aktivtKpiId && d.varde != null)
      .map((d) => d.ar);
    return years.length > 0 ? Math.min(...years) : null;
  }, [allData, aktivtKpiId]);

  const subtitelEnhet = visaIndex && basAr ? `Index (${basAr} = 100)` : enhetEtikett(aktivtEnhet);
  const subtitelGeografi = isRegion ? kommunNamn : `${kommunNamn} kommun`;

  // ── Adapter: jamfor-state → Tidsserie-props ──
  // Alla valda kommuner ritas som färgade linjer (extraLinjer).

  // ── Senaste rad för vald kommun (värde, rang, period) ──
  const senaste = useMemo(() => {
    const rows = allData
      .filter((d) => d.kpi_id === aktivtKpiId && d.kommun_kod === kommunKod && d.varde != null)
      .sort((a, b) => b.ar - a.ar);
    return rows[0] ?? null;
  }, [allData, aktivtKpiId, kommunKod]);

  // Ranking hämtas direkt från senaste raden (rang_total, antal_kommuner)

  // ── Titel: ämne, enhet, tidsperiod — deduplikerad ──
  const fullTitel = useMemo(() => {
    // Enhetstext
    const enhetText = visaIndex && basAr
      ? `index (${basAr} = 100)`
      : enhetEtikett(aktivtEnhet).toLowerCase();

    // Undvik dubbla enheter om titeln redan innehåller enheten
    const titelLower = titel.toLowerCase();
    const skipEnhet = enhetText && (
      titelLower.includes(enhetText) ||
      titelLower.includes("antal") && enhetText === "antal" ||
      titelLower.includes("procent") && enhetText === "procent" ||
      titelLower.includes("andel") && enhetText === "procent"
    );

    const delar = [titel];
    if (!skipEnhet && enhetText) delar.push(enhetText);
    if (period) delar.push(period);
    return delar.join(", ");
  }, [titel, aktivtEnhet, visaIndex, basAr, period]);

  // ── Undertitel: tre systematiska delar ──
  //   1. Nuvarande värde (via kpi-texter intro)
  //   2. Riksgenomsnitt + ranking
  //   3. Trend
  //
  // Failproof: fungerar för alla KPI:er oavsett enhet, urval eller grupp.
  // Snittjämförelse bara vid relativa mått. Ranking alltid.
  type Segment = { text: string; accent?: boolean };

  const forsta = useMemo(() => {
    const rows = allData
      .filter((d) => d.kpi_id === aktivtKpiId && d.kommun_kod === kommunKod && d.varde != null)
      .sort((a, b) => a.ar - b.ar);
    return rows[0] ?? null;
  }, [allData, aktivtKpiId, kommunKod]);

  const naturalText = useMemo(() => getKpiText(aktivtKpiId, aktivtEnhet), [aktivtKpiId, aktivtEnhet]);

  // Ranking: använd rang_total om tillgänglig, annars beräkna dynamiskt
  const ranking = useMemo(() => {
    if (senaste?.rang_total != null && senaste?.antal_kommuner != null) {
      return { rang: senaste.rang_total, av: senaste.antal_kommuner };
    }
    if (!senaste?.varde) return null;
    const typ = isRegion ? "L" : "K";
    const vals = allData
      .filter((d) => d.kpi_id === aktivtKpiId && d.kommun_typ === typ && d.ar === senaste.ar && d.varde != null && d.kommun_kod !== "0000")
      .map((d) => ({ kod: d.kommun_kod, varde: d.varde! }))
      .sort((a, b) => b.varde - a.varde);
    const pos = vals.findIndex((v) => v.kod === kommunKod);
    return pos >= 0 ? { rang: pos + 1, av: vals.length } : null;
  }, [senaste, allData, aktivtKpiId, kommunKod, isRegion]);

  const undertitelSegment = useMemo((): Segment[] => {
    const seg: Segment[] = [];
    const geo = kommunNamn;
    const { intro, pronomen } = naturalText;
    const v = senaste?.varde;
    const val = v != null ? fmtKort(v, aktivtEnhet) : null;

    // Fallback: ingen data
    if (v == null || val == null) {
      seg.push({ text: "Visar utvecklingen för " });
      seg.push({ text: isRegion ? geo : `${geo} kommun`, accent: true });
      seg.push({ text: "." });
      return seg;
    }

    // ── DEL 1: Värde ──
    const rawIntro = intro(geo, val);
    const introText = rawIntro.charAt(0).toUpperCase() + rawIntro.slice(1);
    const geoIdx = introText.indexOf(geo);
    if (geoIdx >= 0) {
      if (geoIdx > 0) seg.push({ text: introText.slice(0, geoIdx) });
      seg.push({ text: geo, accent: true });
      seg.push({ text: introText.slice(geoIdx + geo.length) });
    } else {
      seg.push({ text: introText });
    }

    // ── DEL 2: Riksgenomsnitt + ranking ──
    const relativ = aktivtEnhet !== "antal" || visaIndex;
    const riksVal = senaste.riksvarde;
    const rang = ranking?.rang ?? null;
    const av = ranking?.av ?? null;
    const geoTyp = isRegion ? "regioner" : "kommuner";

    if (relativ && riksVal != null) {
      const diff = v - riksVal;
      const jmfOrd = Math.abs(diff) < 0.1
        ? "i nivå med"
        : (diff > 0 ? "över" : "under");
      seg.push({ text: `, vilket är ${jmfOrd} riksgenomsnittet (${fmtKort(riksVal, aktivtEnhet)}).` });
    } else {
      seg.push({ text: "." });
    }

    if (rang != null && av != null) {
      seg.push({ text: ` Bland landets ${geoTyp} intar ` });
      seg.push({ text: geo, accent: true });
      seg.push({ text: ` plats ${rang} av ${av}.` });
    }

    // ── DEL 3: Trend ──
    // Förändringstal (förändring, tillväxt, nettoflytt) beskriver redan en förändring.
    // Att säga "förändringen har minskat" är en meta-trend som förvirrar — hoppa över.
    const isForandring = /förändring|tillväxt|netto/i.test(pronomen);

    if (!isForandring && forsta && forsta.ar !== senaste.ar && forsta.varde != null) {
      const totalDiff = v - forsta.varde;

      if (Math.abs(totalDiff) > 0.001) {
        const riktning = totalDiff > 0 ? "ökat" : "minskat";

        const monthly = isMonthly(senaste.ar);
        const jmfAr = monthly ? sameMonthLastYear(senaste.ar) : null;
        const nästSenaste = monthly
          ? allData.find((d) => d.kpi_id === aktivtKpiId && d.kommun_kod === kommunKod && d.varde != null && d.ar === jmfAr) ?? null
          : allData
              .filter((d) => d.kpi_id === aktivtKpiId && d.kommun_kod === kommunKod && d.varde != null && d.ar < senaste.ar)
              .sort((a, b) => b.ar - a.ar)[0];

        // Bara 2 datapunkter → kort text utan upprepning
        if (!nästSenaste || nästSenaste.ar === forsta.ar) {
          seg.push({ text: ` Sedan ${fmtPeriod(forsta.ar)} har ${pronomen} ${riktning}.` });
        } else {
          seg.push({ text: ` Över tid har ${pronomen} ${riktning}` });

          const arsDiff = v - (nästSenaste.varde ?? v);
          if (Math.abs(arsDiff) < 0.001) {
            seg.push({ text: ", medan den senaste perioden var i stort sett oförändrad." });
          } else {
            const byteRikt = (totalDiff > 0 && arsDiff < 0) || (totalDiff < 0 && arsDiff > 0);
            if (byteRikt) {
              seg.push({ text: `, men den senaste perioden visade ${arsDiff > 0 ? "en ökning" : "en minskning"}.` });
            } else {
              seg.push({ text: ` och den senaste perioden visade en fortsatt ${totalDiff > 0 ? "ökning" : "minskning"}.` });
            }
          }
        }
      }
    }

    return seg;
  }, [kommunNamn, isRegion, senaste, forsta, aktivtKpiId, aktivtEnhet, visaIndex, naturalText, allData, kommunKod]);

  // ── Alla valda kommuner som färgade linjer ──
  const riktaExtraLinjer = jamfor.selected;

  // ── Jämför-panelens sökbara kommun-lista ──
  const senasteVarden = useMemo(() => {
    const map = new Map<string, number | null>();
    const kpiRows = allData.filter((d) => d.kpi_id === aktivtKpiId);
    const maxAr = kpiRows.length > 0 ? Math.max(...kpiRows.filter(d => d.varde != null).map(d => d.ar)) : 0;
    for (const d of kpiRows) {
      if (d.ar === maxAr) map.set(d.kommun_kod, d.varde);
    }
    return map;
  }, [allData, aktivtKpiId]);

  // filteredKommuner, toggleExtra, clearAllJamfor — flyttade till JamforPanel

  // ── Keyboard ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  // ── Download ──
  const getSvgAndSlug = () => {
    const svg = chartRef.current?.querySelector("svg");
    if (!svg) return null;
    const slug = titel.toLowerCase().replace(/[^a-zåäö0-9]+/g, "-").replace(/-+$/, "");
    return { svg, slug };
  };
  // Export-header: titel + subtitel injiceras i nedladdad fil
  // Bara första meningen (för kartvy)
  const forstaMeningen = useMemo((): Segment[] => {
    const result: Segment[] = [];
    let hittadPunkt = false;
    for (const s of undertitelSegment) {
      if (hittadPunkt) break;
      const dotIdx = s.text.indexOf(".");
      if (dotIdx >= 0) {
        result.push({ ...s, text: s.text.slice(0, dotIdx + 1) });
        hittadPunkt = true;
      } else {
        result.push(s);
      }
    }
    return result;
  }, [undertitelSegment]);

  // Vänstermarginal för titel-alignment (matchar grafens y-etiketter)
  const grafLeftMargin = useMemo(
    () => calcLeftMargin(allData, aktivtKpiId, aktivtEnhet, visaIndex),
    [allData, aktivtKpiId, aktivtEnhet, visaIndex]
  );

  const exportSegments = visning === "karta" ? forstaMeningen : undertitelSegment;
  const exportHeader: ExportHeader = {
    titel: fullTitel,
    segments: exportSegments.map((s) => ({ text: s.text, accent: s.accent })),
    kalla: fullKalla(aktivtMeta?.beskrivning) || "SCB och bearbetningar av Region Halland",
    leftMargin: (chartWidth < 500 ? 12 : 20) + grafLeftMargin,
  };

  const handleDownloadPng = () => {
    const res = getSvgAndSlug();
    if (res) downloadSvgAsPng(res.svg, `${kommunNamn}-${res.slug}.png`, EXPORT_W, EXPORT_H, exportHeader);
  };
  const handleDownloadSvg = () => {
    const res = getSvgAndSlug();
    if (res) downloadSvgAsFile(res.svg, `${kommunNamn}-${res.slug}.svg`, EXPORT_W, EXPORT_H, exportHeader);
  };

  const andelLabel = enhet === "procent" ? "Andel (%)" : enhet === "kvot" ? "Kvot" : enhetEtikett(enhet);
  const harMattVal = harPar || isNetto || kanVisaIndex;

  // ── Mått-värde för chip-label ──
  const mattValue = visaIndex ? "Index"
    : isNetto ? (nettoRatt ? "Antal" : "Per 1 000 inv.")
    : visaAntal ? "Antal"
    : andelLabel;

  // Stäng andra dropdowns
  const closeAll = () => { setOpenJamfor(false); setOpenMattMenu(false); };

  // CheckRow borttagen — nu i JamforPanel

  // Ikon-komponent för verktygsfältet
  const TbIcon = ({ d, size = 14 }: { d: string; size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/25 backdrop-blur-[2px]"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white w-full h-full rounded-none
                      sm:rounded-2xl sm:max-w-[960px] sm:w-[95vw] sm:max-h-[92vh] sm:h-auto
                      overflow-hidden flex flex-col relative">

        {/* ═══════════ VERKTYGSFÄLT ═══════════ */}
        <div className="shrink-0 border-b border-neutral-100 bg-neutral-50/60">
          <div className="px-4 sm:px-6 py-2 flex items-center gap-1.5 flex-wrap">

            {/* ── Vänster: Graf/Karta toggle ── */}
            <div className="flex items-center bg-white rounded-lg border border-neutral-200 overflow-hidden mr-1">
              <button
                onClick={() => setVisning("graf")}
                className={`text-[11px] px-2.5 py-[5px] flex items-center gap-1 cursor-pointer transition-colors ${
                  visning === "graf" ? "bg-neutral-800 text-white" : "text-neutral-500 hover:bg-neutral-100"
                }`}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                     strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
                Graf
              </button>
              <button
                onClick={() => setVisning("karta")}
                className={`text-[11px] px-2.5 py-[5px] flex items-center gap-1 cursor-pointer transition-colors ${
                  visning === "karta" ? "bg-neutral-800 text-white" : "text-neutral-500 hover:bg-neutral-100"
                }`}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                     strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
                  <line x1="8" y1="2" x2="8" y2="18" />
                  <line x1="16" y1="6" x2="16" y2="22" />
                </svg>
                Karta
              </button>
            </div>

            <span className="w-px h-4 bg-neutral-200 mx-0.5 hidden sm:block" />

            {/* ── Jämför: samlad panel ── */}
            <div ref={jamforRef} className="relative">
              <button
                onClick={() => { closeAll(); setOpenJamfor(!openJamfor); }}
                className={`inline-flex items-center rounded-full border transition-all cursor-pointer select-none overflow-hidden ${
                  openJamfor ? "border-neutral-400" : "border-neutral-200 hover:border-neutral-400"
                }`}
              >
                <span className="text-[11px] px-2.5 py-1.5 text-neutral-400 bg-neutral-50 border-r border-neutral-200">
                  Jämför
                </span>
                <span className="text-[12px] px-2.5 py-1.5 text-neutral-700 font-medium flex items-center gap-1">
                  {antalJamforelser > 0 ? `${antalJamforelser} valda` : "Lägg till"}
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                       strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
                       className={`transition-transform text-neutral-400 ${openJamfor ? "rotate-180" : ""}`}>
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </span>
              </button>
              {openJamfor && (
                <div className="absolute top-full left-0 mt-1.5 z-50 bg-white rounded-xl border border-neutral-200
                                shadow-lg shadow-black/8 overflow-hidden animate-[fadeIn_100ms_ease-out]">
                  <JamforPanel
                    isRegion={isRegion}
                    kommunKod={kommunKod}
                    kommunRegister={kommunRegister}
                    kommunGrupper={kommunGrupper}
                    senasteVarden={senasteVarden}
                    aktivtEnhet={aktivtEnhet}
                    visaIndex={visaIndex}
                    state={jamfor}
                    dispatch={jamforDispatch}
                  />
                </div>
              )}
            </div>

            {harMattVal && (
              <SplitChip label="Mått" value={mattValue} open={openMattMenu}
                onToggle={() => { closeAll(); setOpenMattMenu(!openMattMenu); }}>
                <div className="py-1">
                  {harPar && (<>
                    <button onClick={() => { setVisaAntal(false); setVisaIndex(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left cursor-pointer transition-colors ${!visaAntal && !visaIndex ? "bg-neutral-50" : "hover:bg-neutral-50"}`}>
                      <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${!visaAntal && !visaIndex ? "border-gron-2" : "border-neutral-300"}`}>
                        {!visaAntal && !visaIndex && <span className="w-2 h-2 rounded-full bg-gron-2" />}
                      </span>
                      <span className={`text-[12px] ${!visaAntal && !visaIndex ? "font-medium text-neutral-800" : "text-neutral-600"}`}>{andelLabel}</span>
                    </button>
                    <button onClick={() => { setVisaAntal(true); setVisaIndex(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left cursor-pointer transition-colors ${visaAntal && !visaIndex ? "bg-neutral-50" : "hover:bg-neutral-50"}`}>
                      <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${visaAntal && !visaIndex ? "border-gron-2" : "border-neutral-300"}`}>
                        {visaAntal && !visaIndex && <span className="w-2 h-2 rounded-full bg-gron-2" />}
                      </span>
                      <span className={`text-[12px] ${visaAntal && !visaIndex ? "font-medium text-neutral-800" : "text-neutral-600"}`}>Antal</span>
                    </button>
                  </>)}
                  {isNetto && (<>
                    <button onClick={() => setNettoRatt(false)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left cursor-pointer transition-colors ${!nettoRatt ? "bg-neutral-50" : "hover:bg-neutral-50"}`}>
                      <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${!nettoRatt ? "border-gron-2" : "border-neutral-300"}`}>
                        {!nettoRatt && <span className="w-2 h-2 rounded-full bg-gron-2" />}
                      </span>
                      <span className={`text-[12px] ${!nettoRatt ? "font-medium text-neutral-800" : "text-neutral-600"}`}>Per 1 000 inv.</span>
                    </button>
                    <button onClick={() => setNettoRatt(true)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left cursor-pointer transition-colors ${nettoRatt ? "bg-neutral-50" : "hover:bg-neutral-50"}`}>
                      <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${nettoRatt ? "border-gron-2" : "border-neutral-300"}`}>
                        {nettoRatt && <span className="w-2 h-2 rounded-full bg-gron-2" />}
                      </span>
                      <span className={`text-[12px] ${nettoRatt ? "font-medium text-neutral-800" : "text-neutral-600"}`}>Antal</span>
                    </button>
                  </>)}
                  {kanVisaIndex && (<>
                    {(harPar || isNetto) && <div className="mx-3 my-1 border-t border-neutral-100" />}
                    <button onClick={() => setVisaIndex(!visaIndex)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left cursor-pointer transition-colors ${visaIndex ? "bg-neutral-50" : "hover:bg-neutral-50"}`}>
                      <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${visaIndex ? "bg-bla-1 border-bla-1" : "border-neutral-300"}`}>
                        {visaIndex && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
                      </span>
                      <div>
                        <span className={`text-[12px] ${visaIndex ? "font-medium text-neutral-800" : "text-neutral-600"}`}>Index</span>
                        <span className="text-[10px] text-neutral-400 ml-1.5">(basår = 100)</span>
                      </div>
                    </button>
                  </>)}
                </div>
              </SplitChip>
            )}

            <button onClick={() => setVisaNoll(!visaNoll)}
              className={`text-[11px] px-2.5 py-[5px] rounded-full border transition-all cursor-pointer select-none ${
                visaNoll ? "bg-neutral-800 border-neutral-800 text-white" : "border-neutral-200 text-neutral-500 hover:border-neutral-400"
              }`}>
              {visaNoll ? "✓ " : ""}Visa 0
            </button>

            {/* ── Höger: spacer + download + stäng ── */}
            <span className="flex-1" />

            <span className="w-px h-4 bg-neutral-200 mx-0.5 hidden sm:block" />

            <button onClick={handleDownloadPng} title="Ladda ner PNG"
              className="h-7 px-1.5 flex items-center justify-center gap-1 rounded-md text-neutral-400 hover:text-neutral-600 hover:bg-white cursor-pointer transition-colors text-[10px]">
              <TbIcon d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" size={13} />
              PNG
            </button>
            <button onClick={handleDownloadSvg} title="Ladda ner SVG"
              className="h-7 px-1.5 flex items-center justify-center gap-1 rounded-md text-neutral-400 hover:text-neutral-600 hover:bg-white cursor-pointer transition-colors text-[10px]">
              <TbIcon d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" size={13} />
              SVG
            </button>

            <button onClick={onClose} title="Stäng (Esc)"
              className="h-7 px-2 flex items-center justify-center gap-1 rounded-md
                         text-neutral-400 hover:text-neutral-600 hover:bg-white cursor-pointer transition-colors">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   strokeWidth="2.5" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
              <span className="text-[11px] hidden sm:inline">Stäng</span>
            </button>
          </div>
        </div>

        {/* ═══════════ GRAFBLOCK: titel → undertitel → graf (obrutet) ═══════════ */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden">

          {/* Titel + undertitel — OWID/FT-spacing: 6px titel→sub, 16px sub→graf */}
          {/* Högerpad: titel/sub slutar vid ~85% av grafbredden så text aldrig krockar med etiketter */}
          <div className="pt-5 pb-0"
               style={{
                 paddingLeft: `${(chartWidth < 500 ? 12 : 20) + grafLeftMargin}px`,
                 paddingRight: `${Math.max(20, Math.round(chartWidth * 0.15))}px`,
               }}>
            <h2 className="text-[21px] text-[#2d2e2d] leading-[1.2]"
                style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontWeight: 400 }}>
              {fullTitel}
            </h2>
            <p className="text-[13px] mt-[6px] text-[#5b5b5b] leading-[1.45]"
               style={{ fontFamily: "'IBM Plex Sans', system-ui, sans-serif", fontWeight: 400 }}>
              {(visning === "karta" ? forstaMeningen : undertitelSegment).map((s, i) =>
                s.accent
                  ? <span key={i} className="text-gron-1" style={{ fontWeight: 500, fontFeatureSettings: '"tnum"' }}>{s.text}</span>
                  : <span key={i}>{s.text}</span>
              )}
            </p>
          </div>

          {/* Graf / Karta — 16px gap från undertitel */}
          <div className="px-3 sm:px-5 pt-4 pb-2" ref={setChartRefs}>
            {chartWidth > 0 && visning === "graf" && (
              <Tidsserie
                valdKommunKod={kommunKod}
                valdKommunNamn={kommunNamn}
                isRegion={isRegion}
                kpiId={aktivtKpiId}
                enhet={aktivtEnhet}
                allData={allData}
                visningsLage="egen"
                visaNoll={visaNoll}
                indexMode={visaIndex}
                titel={titel}
                subtitelEnhet={subtitelEnhet}
                subtitelGeografi={subtitelGeografi}
                subtitelPeriod={period}
                kalla={fullKalla(aktivtMeta?.beskrivning)}
                width={chartWidth}
                height={chartHeight}
                showRiksnitt={showRiksnitt}
                showLanssnitt={showLanssnitt}
                showMedian={showMedian}
                extraLinjer={riktaExtraLinjer}
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
                titel={undefined}
                subtitelEnhet={undefined}
                subtitelGeografi={undefined}
                kalla={fullKalla(aktivtMeta?.beskrivning)}
                width={chartWidth}
                height={chartHeight}
                mapData={mapData}
              />
            )}
          </div>
        </div>

        {/* ── Mobil: sticky stäng-knapp i botten ── */}
        <div className="sm:hidden shrink-0 border-t border-neutral-200 bg-white px-4 py-3">
          <button onClick={onClose}
            className="w-full py-2.5 rounded-lg bg-neutral-800 text-white text-[14px] font-medium
                       cursor-pointer active:bg-neutral-900 transition-colors">
            Stäng
          </button>
        </div>
      </div>
    </div>
  );
}
