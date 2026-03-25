import { useRef, useEffect, useCallback, useMemo } from "react";
import * as d3 from "d3";
import type { KpiRow } from "../types";
import { HALLAND_KODER } from "../types";
import { fmt, fmtPeriod, isMonthly } from "../utils/format";

export type VisningsLage = "alla" | "halland" | "egen";

// Färgpalett för extra jämförelselinjer
const EXTRA_COLORS = ["#004990", "#FF7E00", "#433C9D", "#2DB8F6", "#A51300", "#895B42"];

interface Props {
  valdKommunKod: string;
  valdKommunNamn: string;
  kpiId: string;
  enhet: string;
  allData: KpiRow[];
  isRegion?: boolean;
  visningsLage?: VisningsLage;
  visaNoll?: boolean;
  indexMode?: boolean;
  titel?: string;
  subtitelEnhet?: string;
  subtitelGeografi?: string;
  subtitelKontext?: string;
  subtitelPeriod?: string;
  kalla?: string;
  width: number;
  height: number;

  // Popup-läge (nya props)
  showRiksnitt?: boolean;
  showLanssnitt?: boolean;
  showMedian?: boolean;
  bandKoder?: string[];
  bandLabel?: string;
  bandVisning?: "band" | "linjer";
  extraLinjer?: Set<string>;
}

interface Label {
  text: string;
  naturalY: number;
  yPos: number;
  color: string;
  weight: number;
  size: string;
}

// Typsnitt
const FONT_TITEL = "'Source Serif 4', Georgia, serif";
const FONT = "'IBM Plex Sans', system-ui, sans-serif";
const FONT_DATA = "'IBM Plex Sans', system-ui, sans-serif";

/** Iterativ relaxering — skjuter isär etiketter tills ingen överlappar */
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

/** Bryt text i rader med max ~maxChars tecken per rad */
function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if (current && (current.length + 1 + word.length) > maxChars) {
      lines.push(current);
      current = word;
    } else {
      current = current ? current + " " + word : word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/** Formatera y-axelvärde */
function fmtY(v: number, enhet?: string): string {
  if (enhet === "antal") return fmt(v, 0);
  return fmt(v, Math.abs(v) >= 100 ? 0 : Math.abs(v) < 10 ? 2 : 1);
}

/** Export-header: titel + subtitel som kan injiceras i SVG-klon vid nedladdning */
export interface ExportHeader {
  titel: string;
  subtitel?: string;
  kalla?: string;
  leftMargin?: number; // matcha grafens vänstermarginal
}

/** Rensa SVG-klon för export */
function cleanSvgClone(svgEl: SVGSVGElement): SVGSVGElement {
  const clone = svgEl.cloneNode(true) as SVGSVGElement;
  clone.querySelectorAll("rect[pointer-events]").forEach((r) => r.remove());
  return clone;
}

/** Injicera titel + subtitel i SVG-klonens topp och skjut ner grafinnehållet */
function injectHeader(clone: SVGSVGElement, header: ExportHeader, origW: number, origH: number) {
  const ns = "http://www.w3.org/2000/svg";
  const xStart = String(header.leftMargin ?? 16);

  // Radbrytning: dela undertitel i rader som ryms
  const subFontPx = 13;
  const charsPerLine = Math.floor((origW - 32) / (subFontPx * 0.55));
  const subLines: string[] = [];
  if (header.subtitel) {
    const words = header.subtitel.split(" ");
    let line = "";
    for (const word of words) {
      if (line && (line.length + 1 + word.length) > charsPerLine) {
        subLines.push(line);
        line = word;
      } else {
        line = line ? line + " " + word : word;
      }
    }
    if (line) subLines.push(line);
  }

  const titelBaseline = 22;
  const subLineH = 17;
  const gapTitelSub = 4;
  const totalSubH = subLines.length > 0 ? gapTitelSub + subLines.length * subLineH : 0;
  const headerH = titelBaseline + totalSubH + 12; // 12px luft till graf
  const newH = origH + headerH;

  clone.setAttribute("viewBox", `0 0 ${origW} ${newH}`);
  clone.setAttribute("width", String(origW));
  clone.setAttribute("height", String(newH));

  // Skjut ner befintligt innehåll
  const wrapper = clone.ownerDocument.createElementNS(ns, "g");
  wrapper.setAttribute("transform", `translate(0,${headerH})`);
  while (clone.firstChild) wrapper.appendChild(clone.firstChild);
  clone.appendChild(wrapper);

  // Titel — Source Serif 4, 400, 21px — alignad med grafens y-etiketter
  const titleEl = clone.ownerDocument.createElementNS(ns, "text");
  titleEl.setAttribute("x", xStart);
  titleEl.setAttribute("y", String(titelBaseline));
  titleEl.setAttribute("fill", "#2d2e2d");
  titleEl.setAttribute("font-size", "21px");
  titleEl.setAttribute("font-weight", "400");
  titleEl.setAttribute("font-family", "'Source Serif 4', Georgia, serif");
  titleEl.textContent = header.titel;
  clone.appendChild(titleEl);

  // Undertitel — IBM Plex Sans 400, radbruten med tspan
  if (subLines.length > 0) {
    const subEl = clone.ownerDocument.createElementNS(ns, "text");
    subEl.setAttribute("x", xStart);
    subEl.setAttribute("fill", "#5b5b5b");
    subEl.setAttribute("font-size", `${subFontPx}px`);
    subEl.setAttribute("font-weight", "400");
    subEl.setAttribute("font-family", "'IBM Plex Sans', system-ui, sans-serif");
    subLines.forEach((line, i) => {
      const tspan = clone.ownerDocument.createElementNS(ns, "tspan");
      tspan.setAttribute("x", xStart);
      tspan.setAttribute("y", String(titelBaseline + gapTitelSub + subLineH * (i + 1)));
      tspan.textContent = line;
      subEl.appendChild(tspan);
    });
    clone.appendChild(subEl);
  }

  // Källa
  if (header.kalla) {
    const kallaEl = clone.ownerDocument.createElementNS(ns, "text");
    kallaEl.setAttribute("x", String(origW - 8));
    kallaEl.setAttribute("y", String(newH - 4));
    kallaEl.setAttribute("text-anchor", "end");
    kallaEl.setAttribute("fill", "#aaa");
    kallaEl.setAttribute("font-size", "11px");
    kallaEl.setAttribute("font-weight", "400");
    kallaEl.setAttribute("font-family", "'IBM Plex Sans', system-ui, sans-serif");
    kallaEl.textContent = `Källa: ${header.kalla}`;
    clone.appendChild(kallaEl);
  }

  return newH;
}

/** Ladda ner SVG som PNG (2x retina). */
export function downloadSvgAsPng(
  svgEl: SVGSVGElement,
  filename: string,
  exportWidth?: number,
  exportHeight?: number,
  header?: ExportHeader,
) {
  const clone = cleanSvgClone(svgEl);
  const origW = svgEl.width.baseVal.value;
  const origH = svgEl.height.baseVal.value;

  let finalH = origH;
  if (header) {
    finalH = injectHeader(clone, header, origW, origH);
  }

  // Exportdimensioner
  if (exportWidth && exportHeight) {
    const scaledH = Math.round(exportWidth * (finalH / origW));
    clone.setAttribute("viewBox", `0 0 ${origW} ${finalH}`);
    clone.setAttribute("width", String(exportWidth));
    clone.setAttribute("height", String(scaledH));
  }

  const svgData = new XMLSerializer().serializeToString(clone);
  const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);

  const img = new Image();
  const scale = 2;
  const w = exportWidth ?? origW;
  const h = exportHeight ? Math.round(exportWidth! * (finalH / origW)) : finalH;
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

/** Ladda ner SVG som .svg-fil. */
export function downloadSvgAsFile(
  svgEl: SVGSVGElement,
  filename: string,
  exportWidth?: number,
  exportHeight?: number,
  header?: ExportHeader,
) {
  const clone = cleanSvgClone(svgEl);
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  const origW = svgEl.width.baseVal.value;
  const origH = svgEl.height.baseVal.value;

  let finalH = origH;
  if (header) {
    finalH = injectHeader(clone, header, origW, origH);
  }

  if (exportWidth && exportHeight) {
    const scaledH = Math.round(exportWidth * (finalH / origW));
    clone.setAttribute("viewBox", `0 0 ${origW} ${finalH}`);
    clone.setAttribute("width", String(exportWidth));
    clone.setAttribute("height", String(scaledH));
  }

  const svgData = new XMLSerializer().serializeToString(clone);
  const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
  const a = document.createElement("a");
  a.download = filename;
  a.href = URL.createObjectURL(blob);
  a.click();
  URL.revokeObjectURL(a.href);
}

// Netto-KPI:er som visas per 1 000 invånare
const PER_1000_KPIS = new Set(["N01803", "N01806", "N01964"]);
const FOLKMANGD_KPI = "N01951";

/** Beräkna vänstermarginal — exporterad så KpiPopup kan aligna titel */
export function calcLeftMargin(allData: KpiRow[], kpiId: string, enhet: string, indexMode: boolean): number {
  if (indexMode || PER_1000_KPIS.has(kpiId)) return 64;
  const kpiVals = allData
    .filter((d) => d.kpi_id === kpiId && d.varde != null)
    .map((d) => d.varde!);
  if (kpiVals.length === 0) return 64;
  const maxAbs = Math.max(...kpiVals.map((v) => Math.abs(v)));
  const sample = fmtY(maxAbs, enhet);
  return Math.max(64, sample.length * 8.5 + 20);
}


export default function Tidsserie({
  valdKommunKod, valdKommunNamn, kpiId, enhet, allData,
  isRegion = false, visningsLage = "alla", visaNoll = false, indexMode = false,
  titel, subtitelEnhet, subtitelGeografi, subtitelKontext, subtitelPeriod,
  kalla,
  width, height,
  showRiksnitt: showRiksnittProp,
  showLanssnitt: showLanssnittprop,
  showMedian: showMedianProp,
  bandKoder,
  bandLabel,
  bandVisning = "band",
  extraLinjer,
}: Props) {
  // Popup-läge: styrs av nya props istället för visningsLage
  const popupMode = showRiksnittProp !== undefined;
  const compact = width < 500;
  const ref = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const titelMaxChars = compact ? 40 : 75;
  const titelFontSize = compact ? 15 : 18;
  const titelLineH = compact ? 20 : 24;
  const subFontSize = compact ? 11 : 13;
  const axisFontSize = compact ? 11 : 14;
  const axisSmFontSize = compact ? 11 : 13;
  const labelFontSize = compact ? 11 : 13;
  const labelSmFontSize = compact ? 10 : 12;

  const titelLines = useMemo(() => titel ? wrapText(titel, titelMaxChars) : [], [titel, titelMaxChars]);
  const harSubtitel = !!(subtitelEnhet || subtitelGeografi || subtitelKontext || subtitelPeriod);
  // Popup-läge: ingen titel i SVG (KpiPopup visar den redan)
  const visaTitel = !popupMode && !!titel;
  const titelOffset = visaTitel
    ? titelLines.length * titelLineH + (harSubtitel ? (compact ? 18 : 22) : 0) + 6
    : 0;

  // Dynamisk vänstermarginal baserad på största y-axelvärde
  const leftMargin = useMemo(() => {
    if (indexMode || PER_1000_KPIS.has(kpiId)) return 64; // Kompakta värden
    const kpiVals = allData
      .filter((d) => d.kpi_id === kpiId && d.varde != null)
      .map((d) => d.varde!);
    if (kpiVals.length === 0) return 64;
    const maxAbs = Math.max(...kpiVals.map((v) => Math.abs(v)));
    const sample = fmtY(maxAbs, enhet);
    return Math.max(64, sample.length * 8.5 + 20);
  }, [allData, kpiId, indexMode]);

  const draw = useCallback(() => {
    if (!ref.current) return;
    const svg = d3.select(ref.current);
    svg.selectAll("*").remove();

    // ─── Titel ───
    if (visaTitel) {
      const titelEl = svg.append("text")
        .attr("x", leftMargin).attr("y", titelLineH)
        .attr("fill", "#2d2e2d")
        .attr("font-size", "21px")
        .attr("font-weight", "400")
        .attr("font-family", FONT_TITEL);

      titelLines.forEach((line, i) => {
        titelEl.append("tspan")
          .attr("x", leftMargin)
          .attr("dy", i === 0 ? 0 : titelLineH)
          .text(line);
      });

      // ─── Undertitel: Enhet, Geografi (grön), Period ───
      if (harSubtitel) {
        const subY = titelLineH + (titelLines.length - 1) * titelLineH + (compact ? 18 : 22);
        const subEl = svg.append("text")
          .attr("x", leftMargin).attr("y", subY)
          .attr("font-size", "13px")
          .attr("font-weight", "400")
          .attr("font-family", FONT);

        const parts: { text: string; fill: string; weight: string }[] = [];
        if (subtitelEnhet) parts.push({ text: subtitelEnhet, fill: "#888", weight: "400" });
        if (subtitelGeografi) parts.push({ text: subtitelGeografi, fill: "#00664D", weight: "600" });
        if (subtitelKontext) parts.push({ text: subtitelKontext, fill: "#999", weight: "400" });
        if (subtitelPeriod) parts.push({ text: subtitelPeriod, fill: "#888", weight: "400" });

        parts.forEach((p, i) => {
          if (i > 0) subEl.append("tspan").attr("fill", "#ccc").text("  \u00B7  ");
          subEl.append("tspan")
            .attr("fill", p.fill)
            .attr("font-weight", p.weight)
            .text(p.text);
        });
      }
    }

    // Alla rader för detta KPI
    const kpiDataRaw = allData.filter((d) => d.kpi_id === kpiId && d.varde != null);

    // Dynamisk högermarginal: connector (30px) + längsta etikettnamn (utan värden)
    const longestName = "Snittkommun (riket)"; // längsta möjliga namn
    const charWidth = compact ? 5 : 7;
    const connectorWidth = 30; // H→V→H connector
    const rightMargin = compact
      ? Math.min(90, Math.max(65, longestName.length * charWidth + connectorWidth))
      : Math.max(140, longestName.length * charWidth + connectorWidth);

    const margin = { top: (popupMode ? 8 : 24) + titelOffset, right: rightMargin, bottom: 44, left: leftMargin };
    const w = width - margin.left - margin.right;
    const h = (height + titelOffset) - margin.top - margin.bottom;
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    // Per 1 000 invånare för netto-KPI:er (om enhet inte explicit är "antal")
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
        return {
          ...d,
          varde: d.varde != null && pop && pop > 0 ? (d.varde / pop) * 1000 : null,
        };
      }).filter((d) => d.varde != null);
    } else {
      kpiDataNorm = kpiDataRaw;
    }

    // Index-transformation: varje kommun baseras till 100 vid första tillgängliga år
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

    const visaRiket = popupMode ? (showRiksnittProp ?? false) : (indexMode || enhet !== "antal");
    const riksData = visaRiket ? (perKommun.get("0000") ?? []) : [];

    const visaLanssnitt = popupMode ? (showLanssnittprop ?? false) : false;
    const lansData = visaLanssnitt ? (perKommun.get("0013") ?? []) : [];

    const jmfTyp = isRegion ? "L" : "K";
    const kommunKoder = [...perKommun.keys()].filter(
      (k) => k !== "0000" && kpiData.find((d) => d.kommun_kod === k)?.kommun_typ === jmfTyp
    );

    // Median per år
    const years0 = [...new Set(kpiData.map((d) => d.ar))].sort();
    const visaMedian = popupMode ? (showMedianProp ?? false) : (visningsLage !== "egen");
    const medianPerAr = visaMedian ? years0.map((yr) => {
      const vals = kommunKoder
        .map((k) => perKommun.get(k)?.find((d) => d.ar === yr)?.varde)
        .filter((v): v is number => v != null);
      return { ar: yr, varde: vals.length > 0 ? d3.median(vals)! : null };
    }).filter((d) => d.varde != null) as { ar: number; varde: number }[] : [];

    // Band (referensområde) — min/max per år
    const hasBand = bandKoder && bandKoder.length > 0;
    const bandMinMax = hasBand ? years0.map((yr) => {
      const vals = bandKoder!
        .map((k) => perKommun.get(k)?.find((d) => d.ar === yr)?.varde)
        .filter((v): v is number => v != null);
      if (vals.length === 0) return null;
      return { ar: yr, min: Math.min(...vals), max: Math.max(...vals) };
    }).filter((d): d is { ar: number; min: number; max: number } => d != null) : [];

    // Extra jämförelselinjer
    const extraKoder = extraLinjer ? [...extraLinjer] : [];
    const extraDataArr = extraKoder.map((kod, i) => ({
      kod,
      namn: kpiData.find((d) => d.kommun_kod === kod)?.kommun_namn ?? kod,
      data: [...(perKommun.get(kod) ?? [])].sort((a, b) => a.ar - b.ar),
      color: EXTRA_COLORS[i % EXTRA_COLORS.length],
    })).filter((e) => e.data.length > 0);

    // Y-domän
    let relevantValues: number[];
    if (popupMode) {
      // Popup: vald kommun + allt som visas
      relevantValues = kommunData.filter((d) => d.varde != null).map((d) => d.varde!);
      if (visaRiket) relevantValues.push(...riksData.filter(d => d.varde != null).map((d) => d.varde!));
      if (visaLanssnitt) relevantValues.push(...lansData.filter(d => d.varde != null).map((d) => d.varde!));
      if (visaMedian) relevantValues.push(...medianPerAr.map((d) => d.varde));
      if (bandMinMax.length > 0) {
        relevantValues.push(...bandMinMax.map((d) => d.min));
        relevantValues.push(...bandMinMax.map((d) => d.max));
      }
      extraDataArr.forEach((e) => relevantValues.push(...e.data.filter(d => d.varde != null).map((d) => d.varde!)));
    } else if (visningsLage === "alla") {
      let domainData = visaRiket ? kpiData : kpiData.filter((d) => d.kommun_kod !== "0000");
      if (isRegion) domainData = domainData.filter((d) => d.kommun_typ === "L" || d.kommun_kod === "0000" || d.kommun_kod === valdKommunKod);
      relevantValues = domainData.map((d) => d.varde!);
    } else if (visningsLage === "halland") {
      const hallandData = kpiData.filter((d) => HALLAND_KODER.includes(d.kommun_kod) || d.kommun_kod === valdKommunKod);
      relevantValues = hallandData.map((d) => d.varde!);
    } else {
      relevantValues = kommunData.filter((d) => d.varde != null).map((d) => d.varde!);
    }
    if (!popupMode && visningsLage !== "egen") {
      if (visaRiket) relevantValues.push(...riksData.map((d) => d.varde!));
      relevantValues.push(...medianPerAr.map((d) => d.varde));
    }

    const allYears = kpiData.map((d) => d.ar);
    const monthly = allYears.length > 0 && isMonthly(allYears[0]);

    // Månadsdata: konvertera YYYYMM till sekventiellt index för jämn x-skala
    // (annars blir det 89 enheters hopp vid varje årsskifte)
    const uniquePeriods = [...new Set(allYears)].sort((a, b) => a - b);
    const periodIndex = new Map(uniquePeriods.map((p, i) => [p, i]));
    const toX = (ar: number) => periodIndex.get(ar) ?? 0;

    const x = d3.scaleLinear()
      .domain(monthly ? [0, uniquePeriods.length - 1] : d3.extent(allYears) as [number, number])
      .range([0, w]);

    // Wrapper: period → pixel
    const xp = (ar: number) => monthly ? x(toX(ar)) : x(ar);

    // Inkludera KI-gränser i y-domänen så bandet inte klipps
    const kommunKI = kommunData.filter(d => d.ki_lower != null && d.ki_upper != null);
    if (kommunKI.length > 0) {
      relevantValues.push(...kommunKI.map(d => d.ki_lower!));
      relevantValues.push(...kommunKI.map(d => d.ki_upper!));
    }

    let [yMin, yMax] = d3.extent(relevantValues) as [number, number];
    if (popupMode || visningsLage === "egen") {
      const span = yMax - yMin || Math.abs(yMax) * 0.1 || 1;
      const pad = span * (popupMode ? 0.08 : 0.15);
      yMin -= pad;
      yMax += pad;
    }
    if (visaNoll) {
      yMin = Math.min(yMin, 0);
      yMax = Math.max(yMax, 0);
    }

    // Log-skala vid extremt spann (t.ex. invånarantal alla kommuner)
    const useLog = !indexMode && visningsLage === "alla" && yMin > 0 && yMax / yMin > 20;

    const y = useLog
      ? d3.scaleLog().domain([yMin, yMax]).range([h, 0])
      : d3.scaleLinear().domain([yMin, yMax]).nice().range([h, 0]);

    const yDom = y.domain() as [number, number];

    // ─── Y-axel — OWID-stil: streckade horisontella gridlines, ingen vertikal linje ───
    // Antal ticks: OWID-formel — skalbaserat, 3–5 st ger jämnt spacing
    const tickTarget = Math.round(Math.max(3, Math.min(5, h / (axisSmFontSize * 4))));
    const yTicks = useLog ? (y.ticks() as number[]) : (y.ticks(tickTarget) as number[]);

    for (const t of yTicks) {
      const px = y(t);

      // Streckad gridline (OWID: dash 4,4)
      const isZero = !indexMode && Math.abs(t) < 0.001;
      g.append("line")
        .attr("x1", 0).attr("x2", w)
        .attr("y1", px).attr("y2", px)
        .attr("stroke", isZero ? "#aaa" : "#d2d2d2")
        .attr("stroke-width", isZero ? 1 : 0.7)
        .attr("stroke-dasharray", isZero ? "none" : "4,4");

      // Etikett — IBM Plex Sans 400 tnum
      g.append("text")
        .attr("x", -8).attr("y", px + 5)
        .attr("text-anchor", "end")
        .attr("fill", "#5b5b5b").attr("font-size", `${axisSmFontSize}px`)
        .attr("font-weight", "400")
        .attr("font-family", FONT_DATA)
        .style("font-feature-settings", '"tnum"')
        .text(fmtY(t, enhet));
    }

    // Logaritmisk skala-etikett
    if (useLog) {
      g.append("text")
        .attr("x", 4)
        .attr("y", y(yDom[1]) - 6)
        .attr("text-anchor", "start")
        .attr("fill", "#999")
        .attr("font-size", "10px")
        .attr("font-style", "italic")
        .text("Logaritmisk skala");
    }

    // Referenslinje: 100 vid index, 1,00 för kvoter (solid, starkare — OWID-stil)
    if (!useLog) {
      const refVal = indexMode ? 100 : (enhet === "kvot" ? 1 : null);
      if (refVal != null && yDom[0] <= refVal && yDom[1] >= refVal) {
        g.append("line")
          .attr("x1", 0).attr("x2", w)
          .attr("y1", y(refVal)).attr("y2", y(refVal))
          .attr("stroke", "#999").attr("stroke-width", 1);
      }
    }

    // ─── X-axel ───
    g.append("line")
      .attr("x1", 0).attr("x2", w)
      .attr("y1", h).attr("y2", h)
      .attr("stroke", "#ddd").attr("stroke-width", 0.5);

    const years = [...new Set(allYears)].sort();
    const yearDom = d3.extent(years) as [number, number];

    // X-axel-ticks: januarimånader för månadsdata, var 5:e år för årsdata
    let tickYears: number[];
    if (monthly) {
      // Visa januari-ticks (YYYY01) + senaste punkt
      tickYears = years.filter(
        (yr) => yr % 100 === 1 || yr === yearDom[1]
      );
      // Glesa ut om det blir för tätt (mobil: max 4 ticks, desktop: max 8)
      const maxTicks = compact ? 4 : 8;
      if (tickYears.length > maxTicks) {
        tickYears = tickYears.filter(
          (yr, i) => yr % 200 === 1 || yr === yearDom[1] || i === 0
        );
      }
      if (compact && tickYears.length > maxTicks) {
        // Behåll bara första, sista och varannan
        tickYears = tickYears.filter(
          (_yr, i, arr) => i === 0 || i === arr.length - 1 || i % 2 === 0
        );
      }
    } else {
      tickYears = years.filter(
        (yr) => yr % 5 === 0 || yr === yearDom[0] || yr === yearDom[1]
      );
    }
    tickYears.forEach((yr) => {
      g.append("line")
        .attr("x1", xp(yr)).attr("x2", xp(yr))
        .attr("y1", h).attr("y2", h + 5)
        .attr("stroke", "#ddd").attr("stroke-width", 0.5);
      g.append("text")
        .attr("x", xp(yr)).attr("y", h + 20)
        .attr("text-anchor", "middle")
        .attr("fill", "#5b5b5b").attr("font-size", `${compact ? axisSmFontSize : axisFontSize}px`)
        .attr("font-weight", "400")
        .attr("font-family", FONT)
        .text(monthly ? fmtPeriod(yr) : String(yr));
    });

    const line = d3.line<KpiRow>()
      .defined((d) => d.varde != null)
      .x((d) => xp(d.ar))
      .y((d) => y(d.varde!))
      .curve(d3.curveMonotoneX);

    // ─── Referensområde: band eller individuella linjer ───
    if (hasBand && bandVisning === "band" && bandMinMax.length > 1) {
      const bandArea = d3.area<{ ar: number; min: number; max: number }>()
        .x((d) => xp(d.ar))
        .y0((d) => y(d.min))
        .y1((d) => y(d.max))
        .curve(d3.curveMonotoneX);
      g.append("path")
        .datum(bandMinMax)
        .attr("d", bandArea)
        .attr("fill", "#000")
        .attr("fill-opacity", 0.04)
        .attr("stroke", "none");
    } else if (hasBand && bandVisning === "linjer") {
      bandKoder!.forEach((kod) => {
        if (kod === valdKommunKod) return;
        const rows = perKommun.get(kod);
        if (!rows) return;
        const sorted = [...rows].sort((a, b) => a.ar - b.ar);
        g.append("path")
          .datum(sorted)
          .attr("d", line)
          .attr("fill", "none")
          .attr("stroke", "#DCDCDC")
          .attr("stroke-width", 0.5);
      });
    }

    // ─── Extra jämförelselinjer ───
    extraDataArr.forEach((extra) => {
      g.append("path")
        .datum(extra.data)
        .attr("d", line)
        .attr("fill", "none")
        .attr("stroke", extra.color)
        .attr("stroke-width", 1.5)
        .attr("stroke-opacity", 0.7);
      const last = extra.data[extra.data.length - 1];
      if (last?.varde != null) {
        g.append("circle")
          .attr("cx", xp(last.ar)).attr("cy", y(last.varde))
          .attr("r", 2.5).attr("fill", extra.color).attr("fill-opacity", 0.7);
      }
    });

    // ─── Bakgrundslinjer ───
    if (visningsLage === "alla") {
      perKommun.forEach((rows, kod) => {
        if (kod === valdKommunKod || kod === "0000") return;
        if (isRegion && rows[0]?.kommun_typ !== "L") return;
        const sorted = [...rows].sort((a, b) => a.ar - b.ar);
        g.append("path")
          .datum(sorted)
          .attr("d", line)
          .attr("fill", "none")
          .attr("stroke", "#DCDCDC")
          .attr("stroke-width", 0.4);
      });
    }

    // ─── Mediankommun ───
    const visaRef = popupMode ? visaMedian : (visningsLage !== "egen");
    const medianLine = d3.line<{ ar: number; varde: number }>()
      .x((d) => xp(d.ar))
      .y((d) => y(d.varde))
      .curve(d3.curveMonotoneX);

    const medianLast = visaRef ? medianPerAr[medianPerAr.length - 1] : undefined;

    if (visaRef && medianPerAr.length > 1) {
      g.append("path")
        .datum(medianPerAr)
        .attr("d", medianLine)
        .attr("fill", "none")
        .attr("stroke", "#888")
        .attr("stroke-width", 1.5)
        .attr("stroke-dasharray", popupMode ? "4,3" : "none");
      if (medianLast) {
        g.append("circle")
          .attr("cx", xp(medianLast.ar)).attr("cy", y(medianLast.varde))
          .attr("r", 3).attr("fill", "#888");
      }
    }

    // ─── Länssnitt (Region Halland 0013) ───
    const lansSorted = visaLanssnitt ? [...lansData].sort((a, b) => a.ar - b.ar) : [];
    const lansLast = lansSorted[lansSorted.length - 1];

    if (lansSorted.length > 0) {
      g.append("path")
        .datum(lansSorted)
        .attr("d", line)
        .attr("fill", "none")
        .attr("stroke", "#00AB60")
        .attr("stroke-width", 1.5)
        .attr("stroke-opacity", 0.6);
      if (lansLast?.varde != null) {
        g.append("circle")
          .attr("cx", xp(lansLast.ar)).attr("cy", y(lansLast.varde))
          .attr("r", 3).attr("fill", "#00AB60").attr("fill-opacity", 0.6);
      }
    }

    // ─── Rikssnitt ───
    const visaRiks = popupMode ? visaRiket : visaRef;
    const riksSorted = visaRiks ? [...riksData].sort((a, b) => a.ar - b.ar) : [];
    const riksLast = riksSorted[riksSorted.length - 1];

    if (riksSorted.length > 0) {
      g.append("path")
        .datum(riksSorted)
        .attr("d", line)
        .attr("fill", "none")
        .attr("stroke", "#555")
        .attr("stroke-width", 1.5);
      if (riksLast?.varde != null) {
        g.append("circle")
          .attr("cx", xp(riksLast.ar)).attr("cy", y(riksLast.varde))
          .attr("r", 3).attr("fill", "#555");
      }
    }

    // ─── Halländska kommuner — samma stil som bakgrundslinjer ───
    if (visningsLage === "halland") {
      HALLAND_KODER.forEach((kod) => {
        if (kod === valdKommunKod) return;
        const rows = perKommun.get(kod);
        if (!rows) return;
        const sorted = [...rows].sort((a, b) => a.ar - b.ar);
        g.append("path")
          .datum(sorted)
          .attr("d", line)
          .attr("fill", "none")
          .attr("stroke", "#DCDCDC")
          .attr("stroke-width", 0.4);
        const last = sorted[sorted.length - 1];
        if (last?.varde != null) {
          g.append("circle")
            .attr("cx", xp(last.ar)).attr("cy", y(last.varde))
            .attr("r", 2).attr("fill", "#DCDCDC");
        }
      });
    }

    // ─── Vald kommun ───
    const kommunSorted = [...kommunData].sort((a, b) => a.ar - b.ar);
    const kommunLast = kommunSorted[kommunSorted.length - 1];

    // KI-band (konfidensintervall) — ritas före linjen så det hamnar bakom
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
        .attr("fill-opacity", 0.07)
        .attr("stroke", "none");
    }

    if (kommunSorted.length > 0) {
      g.append("path")
        .datum(kommunSorted)
        .attr("d", line)
        .attr("fill", "none")
        .attr("stroke", "#00664D")
        .attr("stroke-width", 2.5);

      // Månadsdata: referenspunkter vid samma månad alla föregående år
      if (monthly && kommunLast) {
        const lastMonth = kommunLast.ar % 100;
        kommunSorted.forEach((d) => {
          if (d.ar !== kommunLast.ar && d.ar % 100 === lastMonth && d.varde != null) {
            g.append("circle")
              .attr("cx", xp(d.ar)).attr("cy", y(d.varde))
              .attr("r", 3)
              .attr("fill", "#00664D")
              .attr("opacity", 0.4);
          }
        });
      }

      if (kommunLast?.varde != null) {
        g.append("circle")
          .attr("cx", xp(kommunLast.ar)).attr("cy", y(kommunLast.varde))
          .attr("r", 4.5).attr("fill", "#00664D");
      }

      const kommunFirst = kommunSorted[0];
      if (kommunFirst?.varde != null) {
        g.append("circle")
          .attr("cx", xp(kommunFirst.ar)).attr("cy", y(kommunFirst.varde))
          .attr("r", 2.5).attr("fill", "#00664D").attr("opacity", 0.5);
      }
    }

    // ─── Direkta etiketter ───
    const labels: Label[] = [];

    // Trunkera namn på mobil
    const maxNameLen = compact ? 8 : 999;
    const trunc = (s: string) => s.length > maxNameLen ? s.slice(0, maxNameLen) + "…" : s;

    if (kommunLast?.varde != null) {
      const yp = y(kommunLast.varde);
      labels.push({
        text: valdKommunNamn,
        naturalY: yp, yPos: yp,
        color: "#00664D", weight: 500, size: `${labelFontSize}px`,
      });
    }
    if (riksLast?.varde != null) {
      const yp = y(riksLast.varde);
      labels.push({
        text: "Riket",
        naturalY: yp, yPos: yp,
        color: "#555", weight: 400, size: `${labelSmFontSize}px`,
      });
    }

    if (lansLast?.varde != null) {
      const yp = y(lansLast.varde);
      labels.push({
        text: "Halland",
        naturalY: yp, yPos: yp,
        color: "#00AB60", weight: 400, size: `${labelSmFontSize}px`,
      });
    }

    if (medianLast) {
      const yp = y(medianLast.varde);
      labels.push({
        text: "Median",
        naturalY: yp, yPos: yp,
        color: "#888", weight: 400, size: `${labelSmFontSize}px`,
      });
    }

    // Extra jämförelselinjer — etiketter
    extraDataArr.forEach((extra) => {
      const last = extra.data[extra.data.length - 1];
      if (!last?.varde) return;
      const yp = y(last.varde);
      labels.push({
        text: trunc(extra.namn),
        naturalY: yp, yPos: yp,
        color: extra.color, weight: 500, size: `${labelSmFontSize}px`,
      });
    });

    if (!popupMode && visningsLage === "halland") {
      HALLAND_KODER.forEach((kod) => {
        if (kod === valdKommunKod) return;
        const rows = perKommun.get(kod);
        if (!rows) return;
        const sorted = [...rows].sort((a, b) => a.ar - b.ar);
        const last = sorted[sorted.length - 1];
        if (!last?.varde) return;
        const yp = y(last.varde);
        labels.push({
          text: trunc(last.kommun_namn),
          naturalY: yp, yPos: yp,
          color: "#bbb", weight: 400, size: compact ? "9px" : "11px",
        });
      });
    }

    resolveOverlap(labels, compact ? 14 : 18, 0, h);

    // OWID-stil connectors: alltid H→V→H (3-segment path)
    const connMargin = 4;       // avstånd från linjens sista punkt till connector-start
    const connMidX = w + connMargin + 12; // mittpunkt för vertikalt segment
    const connEndX = w + connMargin + 22; // där texten börjar
    const textX = connEndX + 4;

    labels.forEach((lbl) => {
      // Connector: horisontell → vertikal → horisontell
      g.append("path")
        .attr("d", `M${w + connMargin},${lbl.naturalY} H${connMidX} V${lbl.yPos} H${connEndX}`)
        .attr("fill", "none")
        .attr("stroke", "#999")
        .attr("stroke-width", 0.5);

      // Liten cirkel vid linjens ändpunkt
      g.append("circle")
        .attr("cx", w + connMargin).attr("cy", lbl.naturalY)
        .attr("r", 0).attr("fill", "none");

      g.append("text")
        .attr("x", textX)
        .attr("y", lbl.yPos + 4)
        .attr("fill", lbl.color)
        .attr("font-size", lbl.size)
        .attr("font-weight", lbl.weight)
        .attr("font-family", FONT)
        .text(lbl.text);
    });

    // ─── Källa ───
    svg.append("text")
      .attr("x", width - 8).attr("y", height + titelOffset - 4)
      .attr("text-anchor", "end")
      .attr("fill", "#aaa").attr("font-size", "11px")
      .attr("font-weight", "400")
      .attr("font-family", FONT)
      .text(kalla ? `Källa: ${kalla}` : "Källa: SCB och bearbetningar av Region Halland");

    // ─── Crosshair + tooltip ───
    const tooltipEl = tooltipRef.current;
    if (!tooltipEl) return;

    const focusLine = g.append("line")
      .attr("y1", 0).attr("y2", h)
      .attr("stroke", "#00664D").attr("stroke-width", 0.8)
      .attr("opacity", 0).attr("pointer-events", "none");
    const focusDot = g.append("circle")
      .attr("r", 4.5).attr("fill", "#00664D").attr("stroke", "#fff").attr("stroke-width", 2)
      .attr("opacity", 0).attr("pointer-events", "none");

    g.append("rect")
      .attr("width", w).attr("height", h)
      .attr("fill", "none").attr("pointer-events", "all")
      .on("mousemove", (event) => {
        const [mx] = d3.pointer(event);
        let year: number;
        if (monthly) {
          const idx = Math.round(x.invert(mx));
          const clamped = Math.max(0, Math.min(uniquePeriods.length - 1, idx));
          year = uniquePeriods[clamped];
        } else {
          year = Math.round(x.invert(mx));
        }
        const kommunRow = kommunSorted.find((d) => d.ar === year);
        if (!kommunRow?.varde) return;

        focusLine.attr("x1", xp(year)).attr("x2", xp(year)).attr("opacity", 0.12);
        focusDot.attr("cx", xp(year)).attr("cy", y(kommunRow.varde)).attr("opacity", 1);

        // ── Bygg kolumnbaserad tooltip ──

        // Beräkna ranking dynamiskt: alla kommuners värde detta år, sorterat
        const allaVardenAr = kommunKoder
          .map((k) => {
            const r = perKommun.get(k)?.find((d) => d.ar === year);
            return r?.varde != null ? { kod: k, varde: r.varde } : null;
          })
          .filter((v): v is { kod: string; varde: number } => v != null)
          .sort((a, b) => b.varde - a.varde);
        const rangMap = new Map(allaVardenAr.map((v, i) => [v.kod, i + 1]));
        const totalRank = allaVardenAr.length;

        type TipRow = { namn: string; varde: number; color: string; rang?: number; totalRank?: number; isVald: boolean; isAggregate: boolean };
        const rows: TipRow[] = [];

        // Vald kommun
        rows.push({
          namn: valdKommunNamn,
          varde: kommunRow.varde,
          color: "#00664D",
          rang: rangMap.get(valdKommunKod),
          totalRank,
          isVald: true,
          isAggregate: false,
        });

        // Rikssnitt
        const riksRow = riksSorted.find((d) => d.ar === year);
        if (riksRow?.varde != null) {
          rows.push({ namn: "Riket", varde: riksRow.varde, color: "#555", isVald: false, isAggregate: true });
        }

        // Länssnitt
        const lansRow = lansSorted.find((d) => d.ar === year);
        if (lansRow?.varde != null) {
          rows.push({ namn: "Halland", varde: lansRow.varde, color: "#00AB60", isVald: false, isAggregate: true });
        }

        // Median
        if (medianPerAr.length > 0) {
          const medRow = medianPerAr.find((d) => d.ar === year);
          if (medRow) {
            rows.push({ namn: "Median", varde: medRow.varde, color: "#888", isVald: false, isAggregate: true });
          }
        }

        // Extra linjer (faktiska kommuner — har ranking)
        extraDataArr.forEach((extra) => {
          const row = extra.data.find((d) => d.ar === year);
          if (row?.varde != null) {
            rows.push({
              namn: extra.namn,
              varde: row.varde,
              color: extra.color,
              rang: rangMap.get(extra.kod),
              totalRank,
              isVald: false,
              isAggregate: false,
            });
          }
        });

        // Sortera efter värde (dynamisk ranking-ordning, högst först)
        rows.sort((a, b) => b.varde - a.varde);

        // Bredaste namn för kolumn-alignment
        const yearLabel = monthly ? fmtPeriod(year) : String(year);

        // Header
        let html = `<div style="font-weight:600;color:#2d2e2d;font-size:13px;padding-bottom:4px;border-bottom:1px solid #eee;margin-bottom:4px">${yearLabel}</div>`;

        // Tabellrader
        html += `<table style="border-collapse:collapse;width:100%">`;
        rows.forEach((r) => {
          const fw = r.isVald ? "font-weight:600" : "font-weight:400";
          const opacity = r.isVald ? "1" : "0.85";
          // Rang: visa för faktiska kommuner/regioner, inte aggregat (Riket, Median)
          const rangText = (!r.isAggregate && r.rang != null && r.totalRank)
            ? `<span style="color:#aaa;font-size:10px">${r.rang}/${r.totalRank}</span>`
            : "";
          html += `<tr style="opacity:${opacity}">`;
          html += `<td style="padding:1.5px 0;white-space:nowrap">`;
          html += `<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${r.color};margin-right:6px;vertical-align:middle"></span>`;
          html += `<span style="color:${r.color};${fw};font-size:12px">${r.namn}</span>`;
          html += `</td>`;
          html += `<td style="padding:1.5px 0 1.5px 14px;text-align:right;${fw};font-size:12px;color:#2d2e2d">${fmtY(r.varde, enhet)}</td>`;
          html += `<td style="padding:1.5px 0 1.5px 10px;text-align:right;min-width:36px">${rangText}</td>`;
          html += `</tr>`;
        });
        html += `</table>`;

        // KI
        if (kommunRow.ki_lower != null && kommunRow.ki_upper != null) {
          html += `<div style="margin-top:4px;padding-top:4px;border-top:1px solid #eee;color:#999;font-size:10px">95 % KI: ${fmtY(kommunRow.ki_lower, enhet)}–${fmtY(kommunRow.ki_upper, enhet)}</div>`;
        }

        // Positionera med fixed (via getBoundingClientRect) så tooltip kan spilla utanför containern
        const svgRect = ref.current?.getBoundingClientRect();
        const tipX = (svgRect?.left ?? 0) + margin.left + xp(year) + 14;
        const tipY = (svgRect?.top ?? 0) + margin.top + y(kommunRow.varde) - 28;
        tooltipEl.style.opacity = "1";
        tooltipEl.style.left = `${tipX}px`;
        tooltipEl.style.top = `${tipY}px`;
        tooltipEl.innerHTML = html;
      })
      .on("mouseleave", () => {
        focusLine.attr("opacity", 0);
        focusDot.attr("opacity", 0);
        tooltipEl.style.opacity = "0";
      });
  }, [valdKommunKod, valdKommunNamn, kpiId, enhet, allData, isRegion, visningsLage, visaNoll, indexMode, leftMargin, titel, titelLines, harSubtitel, visaTitel, subtitelEnhet, subtitelGeografi, subtitelKontext, subtitelPeriod, titelOffset, width, height, compact, titelFontSize, titelLineH, subFontSize, axisFontSize, axisSmFontSize, labelFontSize, labelSmFontSize, popupMode, showRiksnittProp, showLanssnittprop, showMedianProp, bandKoder, bandLabel, bandVisning, extraLinjer]);

  useEffect(() => { draw(); }, [draw]);

  return (
    <>
      <svg ref={ref} width={width} height={height + titelOffset} />
      <div
        ref={tooltipRef}
        className="fixed pointer-events-none text-[12px] leading-snug z-[100]
                   bg-white/97 border border-neutral-200 rounded-xl px-3.5 py-2.5 shadow-lg shadow-black/8
                   transition-opacity duration-100"
        style={{ opacity: 0, fontFamily: "'IBM Plex Sans', system-ui, sans-serif", fontFeatureSettings: '"tnum"', minWidth: 180 }}
      />
    </>
  );
}
