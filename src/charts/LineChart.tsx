import { useRef, useEffect, useCallback, useMemo } from "react";
import * as d3 from "d3";
import type { KpiRow } from "../types";
import { fmt, fmtPeriod, isMonthly } from "../utils/format";

// ─── Konstanter ───

const FONT = "'Inter', system-ui, sans-serif";
const FONT_DATA = "'IBM Plex Sans', sans-serif";

// Färgpalett för highlightade serier (Region Halland, utan grön)
const HIGHLIGHT_COLORS = ["#004990", "#FF7E00", "#433C9D", "#2DB8F6", "#A51300", "#895B42"];

// Band-färger — neutral grå, professionell, låter datan tala
const BAND_COLORS = [
  { fill: "#e0e0e0", edge: "#aaa", stroke: "#666", line: "#bbb" },
  { fill: "#e0e0e0", edge: "#aaa", stroke: "#666", line: "#bbb" },
  { fill: "#e0e0e0", edge: "#aaa", stroke: "#666", line: "#bbb" },
  { fill: "#e0e0e0", edge: "#aaa", stroke: "#666", line: "#bbb" },
];

// ─── Props ───

export interface ComparisonBand {
  id: string;
  label: string;
  koder: string[];
  colorIndex: number;  // index i BAND_COLORS
}

export interface LineChartProps {
  valdKommunKod: string;
  valdKommunNamn: string;
  kpiId: string;
  enhet: string;
  allData: KpiRow[];
  isRegion?: boolean;

  // Vad som visas — styrs av kontrollpanelen
  visibleKoder: Set<string>;
  highlightKoder: Set<string>;
  bands: ComparisonBand[];
  bandMode: "band" | "linjer"; // band = area, linjer = individuella linjer
  showRiksnitt: boolean;
  showMedian: boolean;
  indexMode: boolean;
  visaNoll: boolean;
  highlightMode: boolean;
  referenceMode: boolean;

  // Callbacks
  onToggleHighlight?: (kod: string) => void;

  // Dimensioner
  width: number;
  height: number;
}

// ─── Hjälpfunktioner ───

interface Label {
  text: string;
  naturalY: number;
  yPos: number;
  color: string;
  weight: number;
  size: string;
}

function resolveOverlap(labels: Label[], minGap: number, yMin: number, yMax: number) {
  labels.sort((a, b) => a.yPos - b.yPos);
  for (let iter = 0; iter < 20; iter++) {
    let moved = false;
    for (let i = 1; i < labels.length; i++) {
      const gap = labels[i].yPos - labels[i - 1].yPos;
      if (gap < minGap) {
        const shift = (minGap - gap) / 2 + 0.5;
        labels[i - 1].yPos -= shift;
        labels[i].yPos += shift;
        moved = true;
      }
    }
    for (const l of labels) {
      l.yPos = Math.max(yMin + 6, Math.min(yMax - 6, l.yPos));
    }
    if (!moved) break;
  }
}

function fmtY(v: number, enhet?: string): string {
  if (enhet === "antal") return fmt(v, 0);
  return fmt(v, Math.abs(v) >= 100 ? 0 : Math.abs(v) < 10 ? 2 : 1);
}

// Netto-KPI:er
const PER_1000_KPIS = new Set(["N01803", "N01806", "N01964"]);
const FOLKMANGD_KPI = "N01951";

// ─── Export-funktioner ───

function cleanSvgClone(svgEl: SVGSVGElement): SVGSVGElement {
  const clone = svgEl.cloneNode(true) as SVGSVGElement;
  clone.querySelectorAll("rect[pointer-events]").forEach((r) => r.remove());
  return clone;
}

export function downloadSvgAsPng(
  svgEl: SVGSVGElement, filename: string, exportWidth?: number, exportHeight?: number,
) {
  const clone = cleanSvgClone(svgEl);
  if (exportWidth && exportHeight) {
    const origW = svgEl.width.baseVal.value;
    const origH = svgEl.height.baseVal.value;
    clone.setAttribute("viewBox", `0 0 ${origW} ${origH}`);
    clone.setAttribute("width", String(exportWidth));
    clone.setAttribute("height", String(exportHeight));
  }
  const svgData = new XMLSerializer().serializeToString(clone);
  const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);
  const img = new Image();
  const scale = 2;
  const w = exportWidth ?? svgEl.width.baseVal.value;
  const h = exportHeight ?? svgEl.height.baseVal.value;
  img.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = w * scale;
    canvas.height = h * scale;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(url);
    const a = document.createElement("a");
    a.download = filename;
    a.href = canvas.toDataURL("image/png");
    a.click();
  };
  img.src = url;
}

export function downloadSvgAsFile(
  svgEl: SVGSVGElement, filename: string, exportWidth?: number, exportHeight?: number,
) {
  const clone = cleanSvgClone(svgEl);
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  if (exportWidth && exportHeight) {
    const origW = svgEl.width.baseVal.value;
    const origH = svgEl.height.baseVal.value;
    clone.setAttribute("viewBox", `0 0 ${origW} ${origH}`);
    clone.setAttribute("width", String(exportWidth));
    clone.setAttribute("height", String(exportHeight));
  }
  const svgData = new XMLSerializer().serializeToString(clone);
  const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
  const a = document.createElement("a");
  a.download = filename;
  a.href = URL.createObjectURL(blob);
  a.click();
  URL.revokeObjectURL(a.href);
}

// ─── Komponent ───

export default function LineChart({
  valdKommunKod, valdKommunNamn, kpiId, enhet, allData,
  isRegion = false,
  visibleKoder, highlightKoder, bands, bandMode,
  showRiksnitt, showMedian,
  indexMode, visaNoll, highlightMode, referenceMode,
  onToggleHighlight,
  width, height,
}: LineChartProps) {
  const compact = width < 500;
  const ref = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const focusedKodRef = useRef<string | null>(null);

  const axisFontSize = compact ? 11 : 12;
  const labelFontSize = compact ? 11 : 12;
  const labelSmFontSize = compact ? 10 : 11;

  // Dynamisk vänstermarginal
  const leftMargin = useMemo(() => {
    if (indexMode || PER_1000_KPIS.has(kpiId)) return 56;
    const kpiVals = allData
      .filter((d) => d.kpi_id === kpiId && d.varde != null)
      .map((d) => d.varde!);
    if (kpiVals.length === 0) return 56;
    const maxAbs = Math.max(...kpiVals.map((v) => Math.abs(v)));
    const sample = fmtY(maxAbs, enhet);
    return Math.max(56, sample.length * 8 + 16);
  }, [allData, kpiId, indexMode, enhet]);

  const draw = useCallback(() => {
    if (!ref.current) return;
    const svg = d3.select(ref.current);
    svg.selectAll("*").remove();

    // ─── Data-förberedelse ───
    const kpiDataRaw = allData.filter((d) => d.kpi_id === kpiId && d.varde != null);

    // Per 1 000 invånare
    let kpiDataNorm: typeof kpiDataRaw;
    if (PER_1000_KPIS.has(kpiId) && enhet !== "antal") {
      const popMap = new Map<string, number>();
      for (const d of allData) {
        if (d.kpi_id === FOLKMANGD_KPI && d.varde != null) {
          popMap.set(`${d.kommun_kod}_${d.ar}`, d.varde);
        }
      }
      kpiDataNorm = kpiDataRaw.map((d) => {
        const pop = popMap.get(`${d.kommun_kod}_${d.ar}`);
        return { ...d, varde: d.varde != null && pop && pop > 0 ? (d.varde / pop) * 1000 : null };
      }).filter((d) => d.varde != null);
    } else {
      kpiDataNorm = kpiDataRaw;
    }

    // Index-transformation
    let kpiData: typeof kpiDataNorm;
    if (indexMode) {
      const baseYear = Math.min(...kpiDataNorm.map((d) => d.ar));
      const baseVal = new Map<string, number>();
      for (const d of kpiDataNorm) {
        if (d.ar === baseYear && d.varde != null && !baseVal.has(d.kommun_kod)) {
          baseVal.set(d.kommun_kod, d.varde);
        }
      }
      kpiData = kpiDataNorm
        .filter((d) => baseVal.has(d.kommun_kod) && baseVal.get(d.kommun_kod) !== 0)
        .map((d) => ({
          ...d,
          varde: d.varde != null ? (d.varde / baseVal.get(d.kommun_kod)!) * 100 : null,
        }));
    } else {
      kpiData = kpiDataNorm;
    }

    const perKommun = d3.group(kpiData, (d) => d.kommun_kod);
    const kommunData = perKommun.get(valdKommunKod) ?? [];
    const riksData = showRiksnitt ? (perKommun.get("0000") ?? []) : [];

    const jmfTyp = isRegion ? "L" : "K";
    const kommunKoder = [...perKommun.keys()].filter(
      (k) => k !== "0000" && kpiData.find((d) => d.kommun_kod === k)?.kommun_typ === jmfTyp
    );

    // Median per år
    const medianPerAr = [...new Set(kpiData.map((d) => d.ar))].sort().map((yr) => {
      const vals = kommunKoder
        .map((k) => perKommun.get(k)?.find((d) => d.ar === yr)?.varde)
        .filter((v): v is number => v != null);
      return { ar: yr, varde: vals.length > 0 ? d3.median(vals)! : null };
    }).filter((d) => d.varde != null) as { ar: number; varde: number }[];

    // ─── Marginaler ───
    const longestName = [valdKommunNamn, "Riket", "Median"].reduce(
      (a, b) => a.length >= b.length ? a : b, ""
    );
    const rightMargin = compact
      ? Math.min(80, Math.max(50, longestName.length * 5 + 8))
      : Math.max(100, longestName.length * 7 + 20);

    const margin = { top: 12, right: rightMargin, bottom: 36, left: leftMargin };
    const w = width - margin.left - margin.right;
    const h = height - margin.top - margin.bottom;
    if (w <= 0 || h <= 0) return;

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    // ─── Y-domän ───
    let relevantValues: number[] = kommunData.filter((d) => d.varde != null).map((d) => d.varde!);

    // Inkludera synliga kommuners data
    visibleKoder.forEach((kod) => {
      const rows = perKommun.get(kod);
      if (rows) relevantValues.push(...rows.filter((d) => d.varde != null).map((d) => d.varde!));
    });
    highlightKoder.forEach((kod) => {
      const rows = perKommun.get(kod);
      if (rows) relevantValues.push(...rows.filter((d) => d.varde != null).map((d) => d.varde!));
    });
    if (showRiksnitt) relevantValues.push(...riksData.map((d) => d.varde!));
    if (showMedian) relevantValues.push(...medianPerAr.map((d) => d.varde));
    // Band-data i domänen
    bands.forEach((band) => {
      band.koder.forEach((kod) => {
        const rows = perKommun.get(kod);
        if (rows) relevantValues.push(...rows.filter((d) => d.varde != null).map((d) => d.varde!));
      });
    });

    // KI-gränser
    const kommunKI = kommunData.filter(d => d.ki_lower != null && d.ki_upper != null);
    if (kommunKI.length > 0) {
      relevantValues.push(...kommunKI.map(d => d.ki_lower!));
      relevantValues.push(...kommunKI.map(d => d.ki_upper!));
    }

    if (relevantValues.length === 0) return;
    let [yMin, yMax] = d3.extent(relevantValues) as [number, number];

    // Padding om få serier
    const fewSeries = visibleKoder.size === 0 && highlightKoder.size === 0;
    if (fewSeries) {
      const span = yMax - yMin || Math.abs(yMax) * 0.1 || 1;
      const pad = span * 0.12;
      yMin -= pad;
      yMax += pad;
    }
    if (visaNoll) {
      yMin = Math.min(yMin, 0);
      yMax = Math.max(yMax, 0);
    }

    const allYears = kpiData.map((d) => d.ar);
    const monthly = allYears.length > 0 && isMonthly(allYears[0]);
    const uniquePeriods = [...new Set(allYears)].sort((a, b) => a - b);
    const periodIndex = new Map(uniquePeriods.map((p, i) => [p, i]));
    const toX = (ar: number) => periodIndex.get(ar) ?? 0;

    // Log-skala vid extremt spann
    const useLog = !indexMode && visibleKoder.size > 50 && yMin > 0 && yMax / yMin > 20;

    const x = d3.scaleLinear()
      .domain(monthly ? [0, uniquePeriods.length - 1] : d3.extent(allYears) as [number, number])
      .range([0, w]);
    const xp = (ar: number) => monthly ? x(toX(ar)) : x(ar);

    // Tight y-skala med minimal padding
    const ySpan = yMax - yMin || 1;
    const yPad = ySpan * 0.04;
    const yMinPad = yMin - yPad;
    const yMaxPad = yMax + yPad;

    const y = useLog
      ? d3.scaleLog().domain([yMin, yMax]).range([h, 0])
      : d3.scaleLinear().domain([yMinPad, yMaxPad]).range([h, 0]);

    const yDom = y.domain() as [number, number];

    // ─── Grid — tightare, fler linjer, subtila ───
    const nTicks = Math.max(4, Math.min(8, Math.round(h / 50)));
    const gridTicks = useLog ? (y.ticks() as number[]) : (y.ticks(nTicks) as number[]);

    // Gridlines — horisontella, inkl övre och undre
    gridTicks.forEach((t) => {
      const px = y(t);
      if (px < 1 || px > h - 1) return;
      g.append("line")
        .attr("x1", 0).attr("x2", w)
        .attr("y1", px).attr("y2", px)
        .attr("stroke", "#ebebeb")
        .attr("stroke-width", 0.6)
        .attr("stroke-dasharray", "4,3");
    });

    // Baslinje (x=0) — heldragna, lite starkare
    g.append("line")
      .attr("x1", 0).attr("x2", w)
      .attr("y1", h).attr("y2", h)
      .attr("stroke", "#ddd").attr("stroke-width", 0.8);

    // ─── Y-axel — tick-text vid varje gridlinje ───
    const minTickGap = 28;
    const occupiedPx: number[] = [];
    gridTicks.forEach((t) => {
      const px = y(t);
      if (px < 1 || px > h - 1) return;
      if (occupiedPx.some((op) => Math.abs(px - op) < minTickGap)) return;
      occupiedPx.push(px);
      g.append("text")
        .attr("x", -8).attr("y", px + 4)
        .attr("text-anchor", "end")
        .attr("fill", "#999").attr("font-size", `${axisFontSize}px`)
        .attr("font-family", FONT_DATA)
        .text(fmtY(t, enhet));
    });

    // Log-skala etikett
    if (useLog) {
      g.append("text")
        .attr("x", 4).attr("y", y(yDom[1]) - 6)
        .attr("text-anchor", "start")
        .attr("fill", "#999").attr("font-size", "10px").attr("font-style", "italic")
        .text("Logaritmisk skala");
    }

    // Referenslinje (100 vid index, 1 vid kvot, 0 annars)
    if (!useLog) {
      const refVal = indexMode ? 100 : (enhet === "kvot" ? 1 : 0);
      if (yDom[0] <= refVal && yDom[1] >= refVal) {
        g.append("line")
          .attr("x1", 0).attr("x2", w)
          .attr("y1", y(refVal)).attr("y2", y(refVal))
          .attr("stroke", "#bbb").attr("stroke-width", 1)
          .attr("stroke-dasharray", "6,4");
      }
    }

    // ─── X-axel ───

    const years = [...new Set(allYears)].sort();
    const yearDom = d3.extent(years) as [number, number];
    let tickYears: number[];
    if (monthly) {
      tickYears = years.filter((yr) => yr % 100 === 1 || yr === yearDom[1]);
      const maxTicks = compact ? 4 : 8;
      if (tickYears.length > maxTicks) {
        tickYears = tickYears.filter((yr, i) => yr % 200 === 1 || yr === yearDom[1] || i === 0);
      }
    } else {
      tickYears = years.filter((yr) => yr % 5 === 0 || yr === yearDom[0] || yr === yearDom[1]);
    }
    tickYears.forEach((yr) => {
      g.append("text")
        .attr("x", xp(yr)).attr("y", h + 18)
        .attr("text-anchor", "middle")
        .attr("fill", "#666").attr("font-size", `${axisFontSize}px`)
        .attr("font-family", FONT)
        .text(monthly ? fmtPeriod(yr) : String(yr));
    });

    // ─── Linjeritning ───
    const line = d3.line<KpiRow>()
      .defined((d) => d.varde != null)
      .x((d) => xp(d.ar))
      .y((d) => y(d.varde!))
      .curve(d3.curveMonotoneX);

    // 0. Jämförelseband
    // Samla band-etiketter för resolveOverlap
    const bandLabels: { bandIdx: number; text: string; naturalY: number; yPos: number; color: string; type: "median" | "high" | "low" }[] = [];

    bands.forEach((band, bi) => {
      const colors = BAND_COLORS[band.colorIndex % BAND_COLORS.length];
      // Inkludera vald kommun i bandet så det alltid har spann
      const allBandKoder = [...new Set([...band.koder, valdKommunKod])];
      const bandRows = allBandKoder
        .map((kod) => ({ kod, rows: perKommun.get(kod) }))
        .filter((r): r is { kod: string; rows: KpiRow[] } => r.rows != null);
      if (bandRows.length < 2) return;

      // Beräkna min/max/median per år + identifiera högsta/lägsta kommun
      const bandYears = [...new Set(kpiData.map((d) => d.ar))].sort();
      const bandEnvelope = bandYears.map((yr) => {
        const entries = bandRows
          .map(({ kod, rows }) => ({ kod, val: rows.find((d) => d.ar === yr)?.varde }))
          .filter((e): e is { kod: string; val: number } => e.val != null);
        if (entries.length === 0) return null;
        const vals = entries.map((e) => e.val).sort((a, b) => a - b);
        return {
          ar: yr,
          min: vals[0],
          max: vals[vals.length - 1],
          median: vals[Math.floor(vals.length / 2)],
          highKod: entries.reduce((best, e) => e.val > best.val ? e : best).kod,
          lowKod: entries.reduce((best, e) => e.val < best.val ? e : best).kod,
        };
      }).filter((d): d is NonNullable<typeof d> => d != null);

      if (bandEnvelope.length < 2) return;

      // Identifiera senaste årets högsta/lägsta kommun
      const lastEnv = bandEnvelope[bandEnvelope.length - 1];
      const highKod = lastEnv.highKod;
      const lowKod = lastEnv.lowKod;
      const highNamn = bandRows.find((r) => r.kod === highKod)?.rows[0]?.kommun_namn ?? "";
      const lowNamn = bandRows.find((r) => r.kod === lowKod)?.rows[0]?.kommun_namn ?? "";

      // Är detta ett litet band (Halland = 6 kommuner)?
      const isSmallBand = band.koder.length <= 10;
      // Band-läge: visa area. Linjer-läge: visa individuella linjer.
      // Små band visar alltid area + linjer i band-läge, bara linjer i linjer-läge.
      const showArea = bandMode === "band";
      const showAsLines = bandMode === "linjer" || (isSmallBand && bandMode === "band");

      // ── Band-area ──
      const area = d3.area<typeof bandEnvelope[0]>()
        .x((d) => xp(d.ar))
        .y0((d) => y(d.min))
        .y1((d) => y(d.max))
        .curve(d3.curveMonotoneX);

      // Band-area
      if (showArea) {
        g.append("path")
          .datum(bandEnvelope)
          .attr("d", area)
          .attr("fill", "#f0f0f0")
          .attr("fill-opacity", 0.75)
          .attr("stroke", "none");
        const topLine = d3.line<typeof bandEnvelope[0]>()
          .x((d) => xp(d.ar)).y((d) => y(d.max)).curve(d3.curveMonotoneX);
        const botLine = d3.line<typeof bandEnvelope[0]>()
          .x((d) => xp(d.ar)).y((d) => y(d.min)).curve(d3.curveMonotoneX);
        g.append("path").datum(bandEnvelope).attr("d", topLine)
          .attr("fill", "none").attr("stroke", "#ccc").attr("stroke-width", 1.2);
        g.append("path").datum(bandEnvelope).attr("d", botLine)
          .attr("fill", "none").attr("stroke", "#ccc").attr("stroke-width", 1.2);
      }

      // Ingående linjer (alltid vid showAsLines, eller vid små band)
      if (showAsLines) {
        bandRows.forEach(({ kod, rows }) => {
          if (kod === valdKommunKod) return;
          const sorted = [...rows].sort((a, b) => a.ar - b.ar);
          const isExtreme = kod === highKod || kod === lowKod;
          g.append("path")
            .datum(sorted)
            .attr("d", line)
            .attr("fill", "none")
            .attr("stroke", isExtreme ? "#999" : "#b8b8b8")
            .attr("stroke-width", isExtreme ? 1.4 : 0.9)
            .attr("stroke-opacity", isExtreme ? 0.8 : 0.45);
        });
      }

      // ── Ändpunkter + etiketter ──
      if (highKod !== valdKommunKod) {
        g.append("circle")
          .attr("cx", xp(lastEnv.ar)).attr("cy", y(lastEnv.max))
          .attr("r", isSmallBand ? 4 : 3.5)
          .attr("fill", isSmallBand ? "#888" : "#aaa")
          .attr("stroke", "#fff").attr("stroke-width", 2);
        bandLabels.push({
          bandIdx: bi, type: "high", text: highNamn,
          naturalY: y(lastEnv.max), yPos: y(lastEnv.max),
          color: isSmallBand ? "#666" : "#888",
        });
      }
      if (lowKod !== valdKommunKod && lowKod !== highKod) {
        g.append("circle")
          .attr("cx", xp(lastEnv.ar)).attr("cy", y(lastEnv.min))
          .attr("r", isSmallBand ? 4 : 3.5)
          .attr("fill", isSmallBand ? "#888" : "#aaa")
          .attr("stroke", "#fff").attr("stroke-width", 2);
        bandLabels.push({
          bandIdx: bi, type: "low", text: lowNamn,
          naturalY: y(lastEnv.min), yPos: y(lastEnv.min),
          color: isSmallBand ? "#666" : "#888",
        });
      }

      // ── Gruppgenomsnitt (streckad) — bara stora band ──
      if (!isSmallBand && bandEnvelope.length > 1) {
        const medLine = d3.line<typeof bandEnvelope[0]>()
          .x((d) => xp(d.ar)).y((d) => y(d.median)).curve(d3.curveMonotoneX);
        g.append("path")
          .datum(bandEnvelope)
          .attr("d", medLine)
          .attr("fill", "none")
          .attr("stroke", "#999")
          .attr("stroke-width", 1.5)
          .attr("stroke-opacity", 0.7)
          .attr("stroke-dasharray", "6,3");
        g.append("circle")
          .attr("cx", xp(lastEnv.ar)).attr("cy", y(lastEnv.median))
          .attr("r", 2.5).attr("fill", "#999").attr("stroke", "#fff").attr("stroke-width", 1);
        bandLabels.push({
          bandIdx: bi, type: "median", text: `Snitt ${band.label.toLowerCase()}`,
          naturalY: y(lastEnv.median), yPos: y(lastEnv.median), color: "#888",
        });
      }

      // ── Alla kommuner i bandet som etiketter (linjer-läge eller småband) ──
      if (showAsLines) {
        bandRows.forEach(({ kod, rows }) => {
          if (kod === valdKommunKod || kod === highKod || kod === lowKod) return;
          const sorted = [...rows].sort((a, b) => a.ar - b.ar);
          const last = sorted[sorted.length - 1];
          if (!last?.varde) return;
          g.append("circle")
            .attr("cx", xp(last.ar)).attr("cy", y(last.varde))
            .attr("r", 2.5).attr("fill", "#b0b0b0").attr("stroke", "#fff").attr("stroke-width", 1);
          bandLabels.push({
            bandIdx: bi, type: "median", text: last.kommun_namn,
            naturalY: y(last.varde), yPos: y(last.varde), color: "#aaa",
          });
        });
      }
    });

    // 1. Bakgrundslinjer (visible ∖ highlight ∖ vald kommun)
    const bgKoder = [...visibleKoder].filter(
      (k) => k !== valdKommunKod && k !== "0000" && !highlightKoder.has(k)
    );
    const bgColor = highlightMode ? "#d0d0d0" : "#999";
    const bgOpacity = highlightMode ? 0.3 : 1;
    const bgStroke = highlightMode ? 0.6 : 1.2;

    bgKoder.forEach((kod) => {
      const rows = perKommun.get(kod);
      if (!rows) return;
      if (isRegion && rows[0]?.kommun_typ !== "L") return;
      const sorted = [...rows].sort((a, b) => a.ar - b.ar);
      g.append("path")
        .datum(sorted)
        .attr("d", line)
        .attr("fill", "none")
        .attr("stroke", bgColor)
        .attr("stroke-width", bgStroke)
        .attr("stroke-opacity", bgOpacity)
        .attr("class", "bg-line")
        .attr("data-kod", kod);
      // Ändpunkt (bara när tydligt synliga)
      if (!highlightMode) {
        const last = sorted[sorted.length - 1];
        if (last?.varde != null) {
          g.append("circle")
            .attr("cx", xp(last.ar)).attr("cy", y(last.varde))
            .attr("r", 2).attr("fill", "#999")
            .attr("class", "bg-dot").attr("data-kod", kod);
        }
      }
    });

    // 2. Median
    const medianLine = d3.line<{ ar: number; varde: number }>()
      .x((d) => xp(d.ar)).y((d) => y(d.varde)).curve(d3.curveMonotoneX);
    const medianLast = showMedian ? medianPerAr[medianPerAr.length - 1] : undefined;

    if (showMedian && medianPerAr.length > 1) {
      const medPath = g.append("path")
        .datum(medianPerAr)
        .attr("d", medianLine)
        .attr("fill", "none");
      if (referenceMode) {
        medPath.attr("stroke", "#bbb").attr("stroke-width", 1.0)
          .attr("stroke-dasharray", "4,4").attr("stroke-opacity", 0.6);
      } else {
        medPath.attr("stroke", "#666").attr("stroke-width", 2.0);
      }
      if (medianLast) {
        g.append("circle")
          .attr("cx", xp(medianLast.ar)).attr("cy", y(medianLast.varde))
          .attr("r", referenceMode ? 2.5 : 3.5)
          .attr("fill", referenceMode ? "#bbb" : "#777")
          .attr("stroke", "#fff").attr("stroke-width", 1.5);
      }
    }

    // 3. Rikssnitt
    const riksSorted = showRiksnitt ? [...riksData].sort((a, b) => a.ar - b.ar) : [];
    const riksLast = riksSorted[riksSorted.length - 1];

    if (riksSorted.length > 0) {
      const riksPath = g.append("path")
        .datum(riksSorted)
        .attr("d", line)
        .attr("fill", "none");
      if (referenceMode) {
        riksPath.attr("stroke", "#aaa").attr("stroke-width", 1.0)
          .attr("stroke-dasharray", "8,4").attr("stroke-opacity", 0.6);
      } else {
        riksPath.attr("stroke", "#444").attr("stroke-width", 2.0);
      }
      if (riksLast?.varde != null) {
        g.append("circle")
          .attr("cx", xp(riksLast.ar)).attr("cy", y(riksLast.varde))
          .attr("r", referenceMode ? 2.5 : 3.5)
          .attr("fill", referenceMode ? "#aaa" : "#444")
          .attr("stroke", "#fff").attr("stroke-width", 1.5);
      }
    }

    // 4. Highlight-linjer (pinnade/valda kommuner, utom vald kommun)
    const hlArray = [...highlightKoder].filter((k) => k !== valdKommunKod && k !== "0000");
    hlArray.forEach((kod, i) => {
      const rows = perKommun.get(kod);
      if (!rows) return;
      const color = HIGHLIGHT_COLORS[i % HIGHLIGHT_COLORS.length];
      const sorted = [...rows].sort((a, b) => a.ar - b.ar);
      g.append("path")
        .datum(sorted)
        .attr("d", line)
        .attr("fill", "none")
        .attr("stroke", color)
        .attr("stroke-width", 2.0);
      const last = sorted[sorted.length - 1];
      if (last?.varde != null) {
        g.append("circle")
          .attr("cx", xp(last.ar)).attr("cy", y(last.varde))
          .attr("r", 3.5).attr("fill", color)
          .attr("stroke", "#fff").attr("stroke-width", 1.5);
      }
    });

    // 5. Vald kommun — alltid överst
    const kommunSorted = [...kommunData].sort((a, b) => a.ar - b.ar);
    const kommunLast = kommunSorted[kommunSorted.length - 1];

    // KI-band
    const hasKI = kommunSorted.some(d => d.ki_lower != null && d.ki_upper != null);
    if (hasKI) {
      const kiArea = d3.area<KpiRow>()
        .defined(d => d.ki_lower != null && d.ki_upper != null)
        .x(d => xp(d.ar))
        .y0(d => y(d.ki_lower!))
        .y1(d => y(d.ki_upper!))
        .curve(d3.curveMonotoneX);
      g.append("path")
        .datum(kommunSorted)
        .attr("d", kiArea)
        .attr("fill", "#00664D")
        .attr("fill-opacity", 0.06)
        .attr("stroke", "none");
    }

    if (kommunSorted.length > 0) {
      // Vit outline bakom linjen — smalare så den inte täcker rikssnitt/median
      g.append("path")
        .datum(kommunSorted)
        .attr("d", line)
        .attr("fill", "none")
        .attr("stroke", "#fff")
        .attr("stroke-width", 3.5);
      // Grön linje
      g.append("path")
        .datum(kommunSorted)
        .attr("d", line)
        .attr("fill", "none")
        .attr("stroke", "#00664D")
        .attr("stroke-width", 2.5);

      if (kommunLast?.varde != null) {
        g.append("circle")
          .attr("cx", xp(kommunLast.ar)).attr("cy", y(kommunLast.varde))
          .attr("r", 4).attr("fill", "#00664D")
          .attr("stroke", "#fff").attr("stroke-width", 2);
      }
    }

    // ─── Etiketter (bara namn) ───
    const labels: Label[] = [];
    const maxNameLen = compact ? 8 : 999;
    const trunc = (s: string) => s.length > maxNameLen ? s.slice(0, maxNameLen) + "…" : s;

    if (kommunLast?.varde != null) {
      labels.push({
        text: compact ? trunc(valdKommunNamn) : valdKommunNamn,
        naturalY: y(kommunLast.varde), yPos: y(kommunLast.varde),
        color: "#00664D", weight: 600, size: `${labelFontSize}px`,
      });
    }
    if (riksLast?.varde != null) {
      labels.push({
        text: "Riket",
        naturalY: y(riksLast.varde), yPos: y(riksLast.varde),
        color: referenceMode ? "#aaa" : "#444", weight: 500, size: `${labelSmFontSize}px`,
      });
    }
    if (medianLast) {
      labels.push({
        text: compact ? "Median" : "Mediankommun",
        naturalY: y(medianLast.varde), yPos: y(medianLast.varde),
        color: referenceMode ? "#bbb" : "#777", weight: 500, size: `${labelSmFontSize}px`,
      });
    }
    // Highlight-etiketter
    hlArray.forEach((kod, i) => {
      const rows = perKommun.get(kod);
      if (!rows) return;
      const sorted = [...rows].sort((a, b) => a.ar - b.ar);
      const last = sorted[sorted.length - 1];
      if (!last?.varde) return;
      const color = HIGHLIGHT_COLORS[i % HIGHLIGHT_COLORS.length];
      labels.push({
        text: compact ? trunc(last.kommun_namn) : last.kommun_namn,
        naturalY: y(last.varde), yPos: y(last.varde),
        color, weight: 500, size: `${labelSmFontSize}px`,
      });
    });

    // Etiketter för synliga kommuner (inte dimmade)
    if (!highlightMode && bgKoder.length > 0 && bgKoder.length <= 30) {
      bgKoder.forEach((kod) => {
        const rows = perKommun.get(kod);
        if (!rows) return;
        const sorted = [...rows].sort((a, b) => a.ar - b.ar);
        const last = sorted[sorted.length - 1];
        if (!last?.varde) return;
        labels.push({
          text: compact ? trunc(last.kommun_namn) : last.kommun_namn,
          naturalY: y(last.varde), yPos: y(last.varde),
          color: "#999", weight: 400, size: compact ? "9px" : "11px",
        });
      });
    }

    // Band-etiketter (högsta/lägsta = större, mittkommuner = mindre)
    bandLabels.forEach((bl) => {
      if (!bl.text) return;
      const isExtreme = bl.type === "high" || bl.type === "low";
      labels.push({
        text: bl.text,
        naturalY: bl.naturalY, yPos: bl.yPos,
        color: bl.color,
        weight: isExtreme ? 600 : 400,
        size: isExtreme ? `${labelFontSize}px` : (compact ? "9px" : "10px"),
      });
    });

    resolveOverlap(labels, compact ? 13 : 16, 0, h);

    labels.forEach((lbl) => {
      const displaced = Math.abs(lbl.yPos - lbl.naturalY) > 3;
      if (displaced) {
        g.append("path")
          .attr("d", `M${w + 3},${lbl.naturalY} L${w + 7},${lbl.naturalY} L${w + 9},${lbl.yPos}`)
          .attr("fill", "none").attr("stroke", lbl.color)
          .attr("stroke-width", 0.7).attr("opacity", 0.3);
      }
      g.append("text")
        .attr("x", w + 12).attr("y", lbl.yPos + 4)
        .attr("fill", lbl.color).attr("font-size", lbl.size)
        .attr("font-weight", lbl.weight).attr("font-family", FONT)
        .text(lbl.text);
    });

    // ─── Crosshair + tooltip + hover ───
    const tooltipEl = tooltipRef.current;
    if (!tooltipEl) return;

    const focusLine = g.append("line")
      .attr("y1", 0).attr("y2", h)
      .attr("stroke", "#ddd").attr("stroke-width", 0.8)
      .attr("opacity", 0).attr("pointer-events", "none");
    const focusDot = g.append("circle")
      .attr("r", 4).attr("fill", "#00664D").attr("stroke", "#fff").attr("stroke-width", 2)
      .attr("opacity", 0).attr("pointer-events", "none");

    // Hover-label för bakgrundslinjer
    const hoverLabel = g.append("text")
      .attr("font-size", `${labelSmFontSize}px`)
      .attr("font-weight", "500")
      .attr("font-family", FONT)
      .attr("opacity", 0)
      .attr("pointer-events", "none");

    // Lookup-map för alla hovrbara linjer (bg + band)
    const hoverMap = new Map<string, { namn: string; perAr: Map<number, number>; lastY: number; source: "bg" | "band"; bandColor?: string }>();
    bgKoder.forEach((kod) => {
      const rows = perKommun.get(kod);
      if (!rows) return;
      const sorted = [...rows].sort((a, b) => a.ar - b.ar);
      const perAr = new Map<number, number>();
      sorted.forEach(d => { if (d.varde != null) perAr.set(d.ar, d.varde); });
      const last = sorted[sorted.length - 1];
      if (last?.varde != null) {
        hoverMap.set(kod, { namn: last.kommun_namn, perAr, lastY: y(last.varde), source: "bg" });
      }
    });
    // Lägg till band-kommuner
    bands.forEach((band) => {
      const colors = BAND_COLORS[band.colorIndex % BAND_COLORS.length];
      band.koder.forEach((kod) => {
        if (hoverMap.has(kod) || kod === valdKommunKod || kod === "0000") return;
        const rows = perKommun.get(kod);
        if (!rows) return;
        const sorted = [...rows].sort((a, b) => a.ar - b.ar);
        const perAr = new Map<number, number>();
        sorted.forEach(d => { if (d.varde != null) perAr.set(d.ar, d.varde); });
        const last = sorted[sorted.length - 1];
        if (last?.varde != null) {
          hoverMap.set(kod, { namn: last.kommun_namn, perAr, lastY: y(last.varde), source: "band", bandColor: colors.stroke });
        }
      });
    });

    // Fokuserad band-linje (ritas ovanpå vid hover)
    const focusBandLine = g.append("path")
      .attr("fill", "none").attr("stroke-width", 2.5)
      .attr("opacity", 0).attr("pointer-events", "none");
    const focusBandDot = g.append("circle")
      .attr("r", 3.5).attr("stroke", "#fff").attr("stroke-width", 1.5)
      .attr("opacity", 0).attr("pointer-events", "none");

    const resetHover = () => {
      g.selectAll(".bg-line")
        .attr("stroke", bgColor)
        .attr("stroke-width", bgStroke)
        .attr("stroke-opacity", bgOpacity);
      focusBandLine.attr("opacity", 0);
      focusBandDot.attr("opacity", 0);
      hoverLabel.attr("opacity", 0);
      focusedKodRef.current = null;
    };

    g.append("rect")
      .attr("width", w).attr("height", h)
      .attr("fill", "none").attr("pointer-events", "all")
      .style("cursor", "default")
      .on("mousemove", (event) => {
        const [mx, my] = d3.pointer(event);
        let year: number;
        if (monthly) {
          const idx = Math.round(x.invert(mx));
          year = uniquePeriods[Math.max(0, Math.min(uniquePeriods.length - 1, idx))];
        } else {
          year = Math.round(x.invert(mx));
        }
        const kommunRow = kommunSorted.find((d) => d.ar === year);
        const riksRow = riksSorted.find((d) => d.ar === year);
        if (!kommunRow?.varde) return;

        focusLine.attr("x1", xp(year)).attr("x2", xp(year)).attr("opacity", 0.4);
        focusDot.attr("cx", xp(year)).attr("cy", y(kommunRow.varde)).attr("opacity", 1);

        // Hover-detektion — bg-linjer + band-linjer
        let focused: { kod: string; namn: string; val: number; source: "bg" | "band"; color: string } | null = null;
        if (hoverMap.size > 0) {
          let minDist = 20;
          hoverMap.forEach(({ namn, perAr, source, bandColor }, kod) => {
            const val = perAr.get(year);
            if (val == null) return;
            const dist = Math.abs(my - y(val));
            if (dist < minDist) {
              minDist = dist;
              focused = { kod, namn, val, source, color: bandColor ?? "#444" };
            }
          });

          if (focused) {
            const f = focused;
            focusedKodRef.current = f.kod;

            // Lyfta bg-linje
            if (f.source === "bg") {
              g.selectAll(".bg-line")
                .attr("stroke-opacity", (_, i, nodes) =>
                  (nodes[i] as SVGPathElement).getAttribute("data-kod") === f.kod ? 1 : (highlightMode ? 0.1 : 0.25))
                .attr("stroke-width", (_, i, nodes) =>
                  (nodes[i] as SVGPathElement).getAttribute("data-kod") === f.kod ? 2.5 : (highlightMode ? 0.4 : 0.7))
                .attr("stroke", (_, i, nodes) =>
                  (nodes[i] as SVGPathElement).getAttribute("data-kod") === f.kod ? "#444" : (highlightMode ? "#d0d0d0" : "#bbb"));
              focusBandLine.attr("opacity", 0);
              focusBandDot.attr("opacity", 0);
            }

            // Lyfta band-linje — rita ovanpå
            if (f.source === "band") {
              const rows = perKommun.get(f.kod);
              if (rows) {
                const sorted = [...rows].sort((a, b) => a.ar - b.ar);
                focusBandLine
                  .datum(sorted)
                  .attr("d", line)
                  .attr("stroke", f.color)
                  .attr("opacity", 1);
                // Punkt vid hovrat år
                focusBandDot
                  .attr("cx", xp(year)).attr("cy", y(f.val))
                  .attr("fill", f.color)
                  .attr("opacity", 1);
              }
              // Dimma bg-linjer
              g.selectAll(".bg-line")
                .attr("stroke-opacity", highlightMode ? 0.1 : 0.15);
            }

            // Etikett
            const entry = hoverMap.get(f.kod)!;
            hoverLabel.attr("x", w + 12).attr("y", entry.lastY + 4)
              .attr("fill", f.color).attr("opacity", 1).text(f.namn);
            d3.select(event.currentTarget).style("cursor", "pointer");
          } else {
            resetHover();
            d3.select(event.currentTarget).style("cursor", "default");
          }
        }

        // Tooltip
        const riksText = riksRow?.varde != null
          ? `<br><span style="color:#555">Riket: ${fmtY(riksRow.varde, enhet)}</span>` : "";
        const rangText = kommunRow.rang_total != null
          ? `<br><span style="color:#888">${kommunRow.rang_total}/${kommunRow.antal_kommuner}</span>` : "";
        const kiText = kommunRow.ki_lower != null && kommunRow.ki_upper != null
          ? `<br><span style="color:#aaa;font-size:10px">95 % KI: ${fmtY(kommunRow.ki_lower, enhet)}–${fmtY(kommunRow.ki_upper, enhet)}</span>` : "";

        // Highlight-värden
        let hlText = "";
        const hlParts: string[] = [];
        hlArray.forEach((kod, i) => {
          const rows = perKommun.get(kod);
          if (!rows) return;
          const row = rows.find((d) => d.ar === year);
          if (row?.varde == null) return;
          const color = HIGHLIGHT_COLORS[i % HIGHLIGHT_COLORS.length];
          hlParts.push(`<span style="color:${color}">${row.kommun_namn}: ${fmtY(row.varde, enhet)}</span>`);
        });
        if (hlParts.length > 0) hlText = "<br>" + hlParts.join("<br>");

        let focusText = "";
        if (focused && !highlightKoder.has(focused.kod)) {
          focusText = `<br><span style="color:${focused.color};font-weight:500">${focused.namn}: ${fmtY(focused.val, enhet)}</span>` +
            `<br><span style="color:#bbb;font-size:9px">Klicka för att markera</span>`;
        }

        tooltipEl.style.opacity = "1";
        const tipX = margin.left + xp(year);
        tooltipEl.style.left = `${tipX > 180 ? tipX - 160 : tipX + 14}px`;
        tooltipEl.style.top = `${margin.top + y(kommunRow.varde) - 28}px`;
        tooltipEl.innerHTML =
          `<span style="color:#666">${monthly ? fmtPeriod(year) : year}</span><br>` +
          `<span style="color:#00664D;font-weight:600">${valdKommunNamn}: ${fmtY(kommunRow.varde, enhet)}</span>` +
          riksText + rangText + kiText + hlText + focusText;
      })
      .on("mouseleave", () => {
        focusLine.attr("opacity", 0);
        focusDot.attr("opacity", 0);
        tooltipEl.style.opacity = "0";
        resetHover();
      })
      .on("click", () => {
        const kod = focusedKodRef.current;
        if (kod && onToggleHighlight) onToggleHighlight(kod);
      });
  }, [
    valdKommunKod, valdKommunNamn, kpiId, enhet, allData, isRegion,
    visibleKoder, highlightKoder, showRiksnitt, showMedian,
    indexMode, visaNoll, highlightMode, referenceMode, bands, bandMode, onToggleHighlight,
    leftMargin, width, height, compact, axisFontSize, labelFontSize, labelSmFontSize,
  ]);

  useEffect(() => { draw(); }, [draw]);

  return (
    <div className="relative">
      <svg ref={ref} width={width} height={height} />
      <div
        ref={tooltipRef}
        className="absolute pointer-events-none font-data text-[12px] leading-snug
                   bg-white/95 border border-neutral-200 rounded-lg px-3 py-2 shadow-md
                   transition-opacity duration-75"
        style={{ opacity: 0 }}
      />
    </div>
  );
}
