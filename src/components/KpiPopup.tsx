import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import type { KpiRow, KpiMeta, KommunEntry } from "../types";
import { HALLAND_KODER } from "../types";
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

// ─── Konstanter ───

const VISNINGSNAMN = getAllVisningsnamn();
const INGET_INDEX = getAllIngetIndex();
const NETTO_KPIS = getAllNettoKpis();
const EXPORT_W = 900;
const EXPORT_H = 556;

// Sydvästsverige — regionkoder
const SYDVASTSVERIGE_KODER = ["0013", "0014", "0006", "0007", "0008", "0010", "0012"];
// 0013=Halland, 0014=Västra Götaland, 0006=Jönköping, 0007=Kronoberg, 0008=Kalmar, 0010=Blekinge, 0012=Skåne

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

type RefOmrade = "halland" | "alla" | "kommungrupp" | "sydvastsverige" | null;

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

  // ── Referensområde (band) — INGET default ──
  const [refOmrade, setRefOmrade] = useState<RefOmrade>(null);
  const [refVisning, setRefVisning] = useState<"band" | "linjer">("band");
  const [openRefMenu, setOpenRefMenu] = useState(false);

  // ── Jämför — helt omgjord ──
  const [extraLinjer, setExtraLinjer] = useState<Set<string>>(new Set());
  const [openJamfor, setOpenJamfor] = useState(false);
  const [jamforSearch, setJamforSearch] = useState("");
  const jamforRef = useRef<HTMLDivElement>(null);
  useClickOutside(jamforRef, openJamfor, () => setOpenJamfor(false));

  // ── Mått-dropdown ──
  const [openMattMenu, setOpenMattMenu] = useState(false);

  // ── Referenslinjer — INGET default, allt styrs av extraLinjer ──
  // Riket, länssnitt, median hanteras nu som "snabbval" i Jämför-panelen
  const showRiksnitt = extraLinjer.has("__rikssnitt__");
  const showLanssnitt = extraLinjer.has("__lanssnitt__") && !isRegion;
  const showMedian = extraLinjer.has("__median__");

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

  // ── Band-koder ──
  const bandKoder = useMemo(() => {
    if (!refOmrade) return [];
    if (refOmrade === "halland") return [...HALLAND_KODER];
    if (refOmrade === "sydvastsverige") return [...SYDVASTSVERIGE_KODER];
    if (refOmrade === "alla") {
      return kommunRegister
        .filter((k) => k.t === (isRegion ? "L" : "K") && k.k !== "0000")
        .map((k) => k.k);
    }
    if (refOmrade === "kommungrupp" && kommunGrupper) {
      const gruppKod = kommunGrupper.kommuner[kommunKod];
      if (!gruppKod) return [];
      return Object.entries(kommunGrupper.kommuner)
        .filter(([, g]) => g === gruppKod)
        .map(([k]) => k);
    }
    return [];
  }, [refOmrade, kommunKod, kommunRegister, kommunGrupper, isRegion]);

  const bandLabel = useMemo(() => {
    if (refOmrade === "halland") return "halländska kommuner";
    if (refOmrade === "sydvastsverige") return "regioner i Sydvästsverige";
    if (refOmrade === "alla") return isRegion ? "samtliga regioner" : "samtliga kommuner";
    if (refOmrade === "kommungrupp" && kommunGrupper) {
      const gruppKod = kommunGrupper.kommuner[kommunKod];
      const grupp = kommunGrupper?.grupper.find((g) => g.kod === gruppKod);
      return grupp ? grupp.namn.toLowerCase() : "kommungruppen";
    }
    return "";
  }, [refOmrade, kommunGrupper, kommunKod, isRegion]);

  // ── Senaste rad för vald kommun (värde, rang, period) ──
  const senaste = useMemo(() => {
    const rows = allData
      .filter((d) => d.kpi_id === aktivtKpiId && d.kommun_kod === kommunKod && d.varde != null)
      .sort((a, b) => b.ar - a.ar);
    return rows[0] ?? null;
  }, [allData, aktivtKpiId, kommunKod]);

  // Rang inom kommungrupp
  const rangIGrupp = useMemo(() => {
    if (!refOmrade || !senaste || bandKoder.length === 0) return null;
    const maxAr = senaste.ar;
    const vals = bandKoder
      .map((k) => {
        const row = allData.find((d) => d.kpi_id === aktivtKpiId && d.kommun_kod === k && d.ar === maxAr);
        return row?.varde != null ? { kod: k, varde: row.varde } : null;
      })
      .filter((v): v is { kod: string; varde: number } => v != null)
      .sort((a, b) => b.varde - a.varde); // högst först
    const pos = vals.findIndex((v) => v.kod === kommunKod);
    return pos >= 0 ? { plats: pos + 1, av: vals.length } : null;
  }, [refOmrade, senaste, bandKoder, allData, aktivtKpiId, kommunKod]);

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

  // ── Undertitel: JSX-segment som renderas inline ──
  // Kommunnamnet markeras i grön (inline-legend). Texten ska vara en
  // sammanhängande, flytande mening — aldrig stelt eller upprepande.
  //
  // Struktur beroende på tillgänglig data:
  //   Bas:  "{År} låg {Kommun} på {värde} ({enhet}), plats {rang} av {N} i riket."
  type Segment = { text: string; accent?: boolean };

  // Första datapunkt för vald kommun (för trend)
  const forsta = useMemo(() => {
    const rows = allData
      .filter((d) => d.kpi_id === aktivtKpiId && d.kommun_kod === kommunKod && d.varde != null)
      .sort((a, b) => a.ar - b.ar);
    return rows[0] ?? null;
  }, [allData, aktivtKpiId, kommunKod]);

  // Extrahera ämne från titeln genom att ta bort enhet-suffix
  // "Behöriga till gymnasiets yrkesprogram efter årskurs 9, andel (%)" → "behöriga till gymnasiets yrkesprogram efter årskurs 9"
  // KPI-specifik text: intro, pronomen, suffix — från explicit mappning
  const naturalText = useMemo(() => getKpiText(aktivtKpiId, aktivtEnhet), [aktivtKpiId, aktivtEnhet]);

  const undertitelSegment = useMemo((): Segment[] => {
    const seg: Segment[] = [];
    const geo = kommunNamn;
    const { intro, pronomen, den: denExplicit, suffix } = naturalText;
    const val = senaste?.varde != null ? fmtKort(senaste.varde, aktivtEnhet) : "–";

    // Tillbakasyftande pronomen: "den", "det" eller "de"
    const ref = denExplicit ?? (() => {
      const ord = pronomen.split(" ");
      if (ord[0] === "de") return "de";
      if (ord[0] === "det") return "det";
      if (ord[0] === "antalet") return "det";
      if (ord.some((o) => /erna$|arna$|orna$/.test(o))) return "de";
      const sista = ord[ord.length - 1];
      if (/ppen$/.test(sista)) return "de";
      if (/et$|ot$/.test(sista)) return "det";
      return "den";
    })();

    if (!senaste?.varde) {
      seg.push({ text: "Visar utvecklingen för " });
      seg.push({ text: isRegion ? geo : `${geo} kommun`, accent: true });
      seg.push({ text: "." });
      return seg;
    }

    // ── Mening 1: "Halmstad har 106 315 invånare." ──
    // intro() returnerar hela meningen med geo inbakat — vi splittar på geo för att kunna accenta det
    const introText = intro(geo, val);
    const geoIdx = introText.indexOf(geo);
    if (geoIdx >= 0) {
      if (geoIdx > 0) seg.push({ text: introText.slice(0, geoIdx) });
      seg.push({ text: geo, accent: true });
      seg.push({ text: introText.slice(geoIdx + geo.length) + "." });
    } else {
      seg.push({ text: introText + "." });
    }

    // ── Mening 2: trend ──
    if (forsta && forsta.ar !== senaste.ar && forsta.varde != null) {
      const arForsta = fmtPeriod(forsta.ar);
      const totalDiff = senaste.varde - forsta.varde;
      const isProcentuellt = aktivtEnhet === "procent" || aktivtEnhet === "kvot";

      if (Math.abs(totalDiff) > 0.001) {
        if (isProcentuellt) {
          // Procentmått: visa från→till istället för "ökat med X procentenheter"
          const valForsta = fmtKort(forsta.varde, aktivtEnhet);
          const riktning = totalDiff > 0 ? "stigit" : "sjunkit";
          seg.push({ text: ` Sedan ${arForsta} har ${pronomen} ${riktning} från ${valForsta} till ${fmtKort(senaste.varde, aktivtEnhet)}${aktivtEnhet === "procent" ? " procent" : ""}` });
        } else {
          const totalVal = fmtKort(Math.abs(totalDiff), aktivtEnhet);
          const riktning = totalDiff > 0 ? "ökat" : "minskat";
          seg.push({ text: ` Sedan ${arForsta} har ${pronomen} ${riktning} med ${totalVal}${suffix}` });
        }

        // Senaste årets förändring — för månadsdata: samma månad föregående år
        const monthly = isMonthly(senaste.ar);
        const jmfAr = monthly ? sameMonthLastYear(senaste.ar) : null;
        const nästSenaste = monthly
          ? allData.find((d) => d.kpi_id === aktivtKpiId && d.kommun_kod === kommunKod && d.varde != null && d.ar === jmfAr) ?? null
          : allData
              .filter((d) => d.kpi_id === aktivtKpiId && d.kommun_kod === kommunKod && d.varde != null && d.ar < senaste.ar)
              .sort((a, b) => b.ar - a.ar)[0];

        if (nästSenaste?.varde != null) {
          const arsDiff = senaste.varde - nästSenaste.varde;
          if (Math.abs(arsDiff) > 0.001) {
            const byteRiktning = (totalDiff > 0 && arsDiff < 0) || (totalDiff < 0 && arsDiff > 0);
            const konjunktion = byteRiktning ? "men" : "och";
            const arsVal = fmtKort(Math.abs(arsDiff), aktivtEnhet);
            const arsRikt = arsDiff > 0 ? "ökade" : "minskade";
            const arsSuffix = isProcentuellt ? " procentenheter" : suffix;
            const jmfText = monthly
              ? `jämfört med ${fmtPeriod(jmfAr!)} ${arsRikt} ${ref} med ${arsVal}${arsSuffix}.`
              : `det senaste året ${arsRikt} ${ref} med ${arsVal}${arsSuffix}.`;
            seg.push({ text: `, ${konjunktion} ${jmfText}` });
          } else {
            seg.push({ text: "." });
          }
        } else {
          seg.push({ text: "." });
        }
      }
    }

    // ── Mening 3: ranking (bara med referensområde) ──
    if (refOmrade && bandKoder.length > 0 && rangIGrupp) {
      if (refOmrade === "alla") {
        seg.push({ text: ` Bland landets ${isRegion ? "regioner" : "kommuner"} placerar sig ` });
        seg.push({ text: geo, accent: true });
        seg.push({ text: ` på plats ${rangIGrupp.plats} av ${rangIGrupp.av}.` });
      } else {
        seg.push({ text: ` Bland ${bandLabel} placerar sig ` });
        seg.push({ text: geo, accent: true });
        seg.push({ text: ` på plats ${rangIGrupp.plats} av ${rangIGrupp.av}.` });
      }

      if (refVisning === "band") {
        seg.push({ text: ` Det skuggade fältet visar spridningen inom gruppen.` });
      } else {
        seg.push({ text: ` De tunna linjerna visar övriga ${isRegion ? "regioner" : "kommuner"} i gruppen.` });
      }
    }

    return seg;
  }, [kommunNamn, isRegion, senaste, forsta, aktivtKpiId, aktivtEnhet, naturalText, rangIGrupp, bandLabel, refOmrade, bandKoder, refVisning, allData, kommunKod]);

  const valdKommunGrupp = useMemo(() => {
    if (!kommunGrupper) return null;
    const gruppKod = kommunGrupper.kommuner[kommunKod];
    if (!gruppKod) return null;
    return kommunGrupper.grupper.find((g) => g.kod === gruppKod) ?? null;
  }, [kommunGrupper, kommunKod]);

  // ── Riktiga extra kommun-koder (utan pseudo-keys) ──
  const riktaExtraLinjer = useMemo(() => {
    const s = new Set<string>();
    extraLinjer.forEach((k) => { if (!k.startsWith("__")) s.add(k); });
    return s;
  }, [extraLinjer]);

  // Antal aktiva jämförelser (synliga i chip)
  const antalJamforelser = useMemo(() => {
    let n = riktaExtraLinjer.size;
    if (showRiksnitt) n++;
    if (showLanssnitt) n++;
    if (showMedian) n++;
    return n;
  }, [riktaExtraLinjer, showRiksnitt, showLanssnitt, showMedian]);

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

  const jmfTyp = isRegion ? "L" : "K";
  const filteredKommuner = useMemo(() => {
    let list = kommunRegister.filter(
      (k) => k.t === jmfTyp && k.k !== kommunKod && k.k !== "0000" && k.k !== "0013"
    );
    if (jamforSearch.length >= 2) {
      const q = jamforSearch.toLowerCase();
      list = list.filter((k) => k.n.toLowerCase().includes(q));
    }
    list.sort((a, b) => {
      const aVald = riktaExtraLinjer.has(a.k) ? 0 : 1;
      const bVald = riktaExtraLinjer.has(b.k) ? 0 : 1;
      if (aVald !== bVald) return aVald - bVald;
      return a.n.localeCompare(b.n, "sv");
    });
    return list;
  }, [kommunRegister, jmfTyp, kommunKod, jamforSearch, riktaExtraLinjer]);

  const toggleExtra = useCallback((key: string) => {
    setExtraLinjer((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }, []);

  const clearAllJamfor = useCallback(() => {
    setExtraLinjer(new Set());
  }, []);

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

  const exportHeader: ExportHeader = {
    titel: fullTitel,
    subtitel: undertitelSegment.map((s) => s.text).join(""),
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
  const closeAll = () => { setOpenRefMenu(false); setOpenJamfor(false); setOpenMattMenu(false); };

  // ── Checkbox-rad (används i Jämför-panelen) ──
  const CheckRow = ({ checked, onChange, label, sub, color }: {
    checked: boolean; onChange: () => void; label: string; sub?: string; color?: string;
  }) => (
    <button
      onClick={onChange}
      className={`w-full flex items-center gap-2.5 px-3 py-[7px] text-left transition-colors cursor-pointer ${
        checked ? "bg-gron-4/30" : "hover:bg-neutral-50"
      }`}
    >
      <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
        checked ? "bg-gron-2 border-gron-2" : "border-neutral-300"
      }`}>
        {checked && (
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white"
               strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </span>
      {color && <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />}
      <span className={`text-[12px] flex-1 truncate ${checked ? "text-gron-1 font-medium" : "text-neutral-600"}`}>
        {label}
      </span>
      {sub && <span className="text-[10px] text-neutral-400 font-data tabular-nums shrink-0">{sub}</span>}
    </button>
  );

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

            {/* ── Chips: Referensområde, Jämför, Mått, Visa 0 ── */}
            <SplitChip
              label="Referensområde"
              value={refOmrade === "halland" ? "Halland"
                : refOmrade === "sydvastsverige" ? "Sydvästsverige"
                : refOmrade === "alla" ? (isRegion ? "Alla regioner" : "Alla kommuner")
                : refOmrade === "kommungrupp" ? (valdKommunGrupp?.namn ?? "Kommungrupp")
                : "Inget valt"}
              open={openRefMenu}
              onToggle={() => { closeAll(); setOpenRefMenu(!openRefMenu); }}
            >
              <div className="py-1">
                {[
                  { val: null as RefOmrade, label: "Inget valt", desc: isRegion ? "Visa enbart regionens linje" : "Visa enbart kommunens linje" },
                  ...(isRegion ? [
                    { val: "sydvastsverige" as RefOmrade, label: "Sydvästsverige", desc: `${SYDVASTSVERIGE_KODER.length} regioner` },
                    { val: "alla" as RefOmrade, label: "Alla regioner", desc: `${kommunRegister.filter((k) => k.t === "L" && k.k !== "0000").length} regioner` },
                  ] : [
                    { val: "halland" as RefOmrade, label: "Hallands kommuner", desc: `${HALLAND_KODER.length} kommuner` },
                    { val: "alla" as RefOmrade, label: "Alla kommuner", desc: `${kommunRegister.filter((k) => k.t === "K" && k.k !== "0000").length} kommuner` },
                    ...(valdKommunGrupp ? [{
                      val: "kommungrupp" as RefOmrade,
                      label: valdKommunGrupp.namn,
                      desc: `Kommungrupp ${valdKommunGrupp.kod}`,
                    }] : []),
                  ]),
                ].map((opt) => (
                    <button
                      key={opt.val ?? "none"}
                      onClick={() => { setRefOmrade(opt.val); if (!opt.val) setOpenRefMenu(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors cursor-pointer ${
                        refOmrade === opt.val ? "bg-neutral-50" : "hover:bg-neutral-50"
                      }`}
                    >
                      <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        refOmrade === opt.val ? "border-gron-2" : "border-neutral-300"
                      }`}>
                        {refOmrade === opt.val && <span className="w-2 h-2 rounded-full bg-gron-2" />}
                      </span>
                      <div className="min-w-0">
                        <div className={`text-[12px] ${refOmrade === opt.val ? "font-medium text-neutral-800" : "text-neutral-600"}`}>{opt.label}</div>
                        <div className="text-[10px] text-neutral-400">{opt.desc}</div>
                      </div>
                    </button>
                  ))}
                  {refOmrade && (
                    <div className="mx-3 mt-1 mb-2 pt-2 border-t border-neutral-100">
                      <div className="text-[10px] font-semibold tracking-wider uppercase text-neutral-400 mb-1.5">Visa som</div>
                      <div className="flex bg-neutral-100 rounded-md p-0.5 gap-0.5">
                        {([["band", "Band"], ["linjer", "Linjer"]] as const).map(([val, label]) => (
                          <button key={val} onClick={() => setRefVisning(val)}
                            className={`flex-1 text-[11px] py-1 px-2 rounded transition-all duration-150 cursor-pointer ${
                              refVisning === val ? "bg-white text-neutral-800 shadow-sm font-medium" : "text-neutral-500 hover:text-neutral-700"
                            }`}>{label}</button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </SplitChip>

            <div ref={jamforRef} className="relative">
              <SplitChip
                label="Jämför"
                value={antalJamforelser > 0 ? `${antalJamforelser} valda` : "Lägg till"}
                open={openJamfor}
                onToggle={() => { closeAll(); setOpenJamfor(!openJamfor); }}
              >
                <div className="w-[300px]">
                  <div className="px-3 pt-2.5 pb-1">
                    <div className="text-[10px] font-semibold tracking-wider uppercase text-neutral-400 mb-1">Snabbval</div>
                  </div>
                  <div className="border-b border-neutral-100">
                    <CheckRow checked={showRiksnitt} onChange={() => toggleExtra("__rikssnitt__")}
                      label="Riksgenomsnitt" color="#555"
                      sub={fmtKort(senasteVarden.get("0000") ?? null, aktivtEnhet)} />
                    {!isRegion && (
                      <CheckRow checked={showLanssnitt} onChange={() => toggleExtra("__lanssnitt__")}
                        label="Länsgenomsnitt (Halland)" color="#00AB60"
                        sub={fmtKort(senasteVarden.get("0013") ?? null, aktivtEnhet)} />
                    )}
                    <CheckRow checked={showMedian} onChange={() => toggleExtra("__median__")}
                      label={isRegion ? "Regionmedian (riket)" : "Mediankommun (riket)"} color="#888" />
                    {isRegion && (() => {
                      const sydOvriga = SYDVASTSVERIGE_KODER.filter((k) => k !== kommunKod);
                      const allaValdaSyd = sydOvriga.every((k) => riktaExtraLinjer.has(k));
                      return (
                        <CheckRow checked={allaValdaSyd}
                          onChange={() => {
                            setExtraLinjer((p) => { const n = new Set(p); sydOvriga.forEach((k) => allaValdaSyd ? n.delete(k) : n.add(k)); return n; });
                          }}
                          label="Sydvästsveriges regioner" color="#A2D9F8"
                          sub={`${sydOvriga.length} st`} />
                      );
                    })()}
                    {!isRegion && (
                      <CheckRow
                        checked={HALLAND_KODER.filter((k) => k !== kommunKod).every((k) => riktaExtraLinjer.has(k))}
                        onChange={() => {
                          const hl = HALLAND_KODER.filter((k) => k !== kommunKod);
                          const alla = hl.every((k) => riktaExtraLinjer.has(k));
                          setExtraLinjer((p) => { const n = new Set(p); hl.forEach((k) => alla ? n.delete(k) : n.add(k)); return n; });
                        }}
                        label="Hallands kommuner" color="#C1E8C4"
                        sub={`${HALLAND_KODER.filter((k) => k !== kommunKod).length} st`} />
                    )}
                    {valdKommunGrupp && !isRegion && (() => {
                      const gk = kommunGrupper!.kommuner[kommunKod];
                      const koder = Object.entries(kommunGrupper!.kommuner).filter(([k, g]) => g === gk && k !== kommunKod).map(([k]) => k);
                      const alla = koder.length > 0 && koder.every((k) => riktaExtraLinjer.has(k));
                      return (
                        <CheckRow checked={alla}
                          onChange={() => { setExtraLinjer((p) => { const n = new Set(p); koder.forEach((k) => alla ? n.delete(k) : n.add(k)); return n; }); }}
                          label={valdKommunGrupp.namn} color="#C0C6FF" sub={`${koder.length} st`} />
                      );
                    })()}
                  </div>
                  <div className="px-3 pt-2.5 pb-1">
                    <div className="text-[10px] font-semibold tracking-wider uppercase text-neutral-400 mb-1">{isRegion ? "Lägg till region" : "Lägg till kommun"}</div>
                    <div className="relative">
                      <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400"
                        width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                      </svg>
                      <input type="text" value={jamforSearch} onChange={(e) => setJamforSearch(e.target.value)}
                        placeholder={isRegion ? "Sök region…" : "Sök kommun…"}
                        className="w-full pl-7 pr-2 py-1.5 text-[12px] bg-neutral-50 border border-neutral-200 rounded-lg focus:outline-none focus:border-gron-2 placeholder:text-neutral-400" />
                    </div>
                  </div>
                  {antalJamforelser > 0 && (
                    <div className="px-3 py-1 flex justify-end">
                      <button onClick={clearAllJamfor} className="text-[10px] text-neutral-400 hover:text-neutral-600 cursor-pointer">Rensa alla</button>
                    </div>
                  )}
                  <div className="max-h-[200px] overflow-y-auto border-t border-neutral-100">
                    {filteredKommuner.length === 0 ? (
                      <div className="px-3 py-4 text-[11px] text-neutral-400 text-center">Inga träffar</div>
                    ) : filteredKommuner.slice(0, 60).map((k) => (
                      <CheckRow key={k.k} checked={riktaExtraLinjer.has(k.k)} onChange={() => toggleExtra(k.k)}
                        label={k.n + (HALLAND_KODER.includes(k.k) ? " ●" : "")}
                        sub={fmtKort(senasteVarden.get(k.k) ?? null, aktivtEnhet)} />
                    ))}
                  </div>
                </div>
              </SplitChip>
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
              className="w-7 h-7 flex items-center justify-center rounded-md text-neutral-400 hover:text-neutral-600 hover:bg-white cursor-pointer transition-colors">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   strokeWidth="2" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* ═══════════ GRAFBLOCK: titel → undertitel → graf (obrutet) ═══════════ */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden">

          {/* Titel + undertitel — alignad med grafens y-etiketter */}
          <div className="pt-4 pb-0"
               style={{ paddingLeft: `${(chartWidth < 500 ? 12 : 20) + grafLeftMargin}px`, paddingRight: 20 }}>
            <h2 className="text-[21px] text-[#2d2e2d] leading-[1.25]"
                style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontWeight: 400 }}>
              {fullTitel}
            </h2>
            <p className="text-[13px] mt-1 text-[#5b5b5b] leading-[1.45]"
               style={{ fontFamily: "'IBM Plex Sans', system-ui, sans-serif", fontWeight: 400 }}>
              {(visning === "karta" ? forstaMeningen : undertitelSegment).map((s, i) =>
                s.accent
                  ? <span key={i} className="text-gron-1" style={{ fontWeight: 500, fontFeatureSettings: '"tnum"' }}>{s.text}</span>
                  : <span key={i}>{s.text}</span>
              )}
            </p>
          </div>

          {/* Graf / Karta — 16px gap från undertitel (OWID) */}
          <div className="px-3 sm:px-5 pt-2 pb-2" ref={setChartRefs}>
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
                bandKoder={bandKoder}
                bandLabel={bandLabel}
                bandVisning={refVisning}
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
      </div>
    </div>
  );
}
