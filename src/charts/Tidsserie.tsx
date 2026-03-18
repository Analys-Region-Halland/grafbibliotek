import { useRef, useEffect, useCallback, useMemo } from "react";
import * as d3 from "d3";
import type { KpiRow } from "../types";
import { HALLAND_KODER } from "../types";
import { fmt, fmtPeriod, isMonthly } from "../utils/format";

export type VisningsLage = "alla" | "halland" | "egen";

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
const FONT = "'Inter', system-ui, sans-serif";
const FONT_DATA = "'IBM Plex Sans', sans-serif";

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

/** Rensa SVG-klon för export */
function cleanSvgClone(svgEl: SVGSVGElement): SVGSVGElement {
  const clone = svgEl.cloneNode(true) as SVGSVGElement;
  clone.querySelectorAll("rect[pointer-events]").forEach((r) => r.remove());
  return clone;
}

/** Ladda ner SVG som PNG (2x retina). Valfria exportWidth/exportHeight sätter klonens storlek. */
export function downloadSvgAsPng(
  svgEl: SVGSVGElement,
  filename: string,
  exportWidth?: number,
  exportHeight?: number,
) {
  const clone = cleanSvgClone(svgEl);

  // Om exportdimensioner anges: sätt viewBox till originalstorlek, explicit width/height till export
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

/** Ladda ner SVG som .svg-fil. Valfria exportWidth/exportHeight sätter klonens storlek. */
export function downloadSvgAsFile(
  svgEl: SVGSVGElement,
  filename: string,
  exportWidth?: number,
  exportHeight?: number,
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

// Netto-KPI:er som visas per 1 000 invånare
const PER_1000_KPIS = new Set(["N01803", "N01806", "N01964"]);
const FOLKMANGD_KPI = "N01951";


export default function Tidsserie({
  valdKommunKod, valdKommunNamn, kpiId, enhet, allData,
  isRegion = false, visningsLage = "alla", visaNoll = false, indexMode = false,
  titel, subtitelEnhet, subtitelGeografi, subtitelKontext, subtitelPeriod,
  kalla,
  width, height,
}: Props) {
  const compact = width < 500;
  const ref = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const titelMaxChars = compact ? 40 : 75;
  const titelFontSize = compact ? 15 : 18;
  const titelLineH = compact ? 20 : 24;
  const subFontSize = compact ? 11 : 13;
  const axisFontSize = compact ? 11 : 13;
  const axisSmFontSize = compact ? 10 : 12;
  const labelFontSize = compact ? 11 : 13;
  const labelSmFontSize = compact ? 10 : 12;

  const titelLines = useMemo(() => titel ? wrapText(titel, titelMaxChars) : [], [titel, titelMaxChars]);
  const harSubtitel = !!(subtitelEnhet || subtitelGeografi || subtitelKontext || subtitelPeriod);
  const titelOffset = titel
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
    if (titel) {
      const titelEl = svg.append("text")
        .attr("x", leftMargin).attr("y", titelLineH)
        .attr("fill", "#111")
        .attr("font-size", `${titelFontSize}px`)
        .attr("font-weight", "600")
        .attr("font-family", FONT);

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
          .attr("font-size", `${subFontSize}px`)
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

    // Dynamisk högermarginal baserad på längsta möjliga etikett
    const kpiValsForMargin = kpiDataRaw
      .filter((d) => d.varde != null)
      .map((d) => d.varde!);
    const maxVal = kpiValsForMargin.length > 0
      ? Math.max(...kpiValsForMargin.map((v) => Math.abs(v)))
      : 0;
    const longestLabel = `Snittkommun (riket)  ${fmtY(maxVal, enhet)}`;
    const charWidth = compact ? 4.5 : 7;
    const rightMargin = compact
      ? Math.min(110, Math.max(80, longestLabel.length * charWidth + 8))
      : Math.max(150, longestLabel.length * charWidth + 20);

    const margin = { top: 24 + titelOffset, right: rightMargin, bottom: 44, left: leftMargin };
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

    const visaRiket = indexMode || enhet !== "antal";
    const riksData = visaRiket ? (perKommun.get("0000") ?? []) : [];

    const jmfTyp = isRegion ? "L" : "K";
    const kommunKoder = [...perKommun.keys()].filter(
      (k) => k !== "0000" && kpiData.find((d) => d.kommun_kod === k)?.kommun_typ === jmfTyp
    );

    // Median per år
    const years0 = [...new Set(kpiData.map((d) => d.ar))].sort();
    const medianPerAr = years0.map((yr) => {
      const vals = kommunKoder
        .map((k) => perKommun.get(k)?.find((d) => d.ar === yr)?.varde)
        .filter((v): v is number => v != null);
      return { ar: yr, varde: vals.length > 0 ? d3.median(vals)! : null };
    }).filter((d) => d.varde != null) as { ar: number; varde: number }[];

    // Y-domän
    let relevantValues: number[];
    if (visningsLage === "alla") {
      let domainData = visaRiket ? kpiData : kpiData.filter((d) => d.kommun_kod !== "0000");
      if (isRegion) domainData = domainData.filter((d) => d.kommun_typ === "L" || d.kommun_kod === "0000" || d.kommun_kod === valdKommunKod);
      relevantValues = domainData.map((d) => d.varde!);
    } else if (visningsLage === "halland") {
      const hallandData = kpiData.filter((d) => HALLAND_KODER.includes(d.kommun_kod) || d.kommun_kod === valdKommunKod);
      relevantValues = hallandData.map((d) => d.varde!);
    } else {
      relevantValues = kommunData.filter((d) => d.varde != null).map((d) => d.varde!);
    }
    if (visningsLage !== "egen") {
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

    let [yMin, yMax] = d3.extent(relevantValues) as [number, number];
    if (visningsLage === "egen") {
      const span = yMax - yMin || Math.abs(yMax) * 0.1 || 1;
      const pad = span * 0.15;
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

    // ─── Y-axel ───
    g.append("line")
      .attr("x1", 0).attr("x2", 0)
      .attr("y1", y(yDom[0])).attr("y2", y(yDom[1]))
      .attr("stroke", "#000").attr("stroke-width", 1.2);

    [yDom[0], yDom[1]].forEach((val) => {
      g.append("line")
        .attr("x1", -5).attr("x2", 0)
        .attr("y1", y(val)).attr("y2", y(val))
        .attr("stroke", "#000").attr("stroke-width", 1.2);
      g.append("text")
        .attr("x", -10).attr("y", y(val) + 5)
        .attr("text-anchor", "end")
        .attr("fill", "#000").attr("font-size", `${axisFontSize}px`)
        .attr("font-family", FONT_DATA)
        .text(fmtY(val, enhet));
    });

    // Mellanliggande tick-markeringar — filtrera så etiketter aldrig överlappar
    const rawTicks = useLog ? y.ticks() : y.ticks(5);
    const minTickGap = 30;
    const occupiedPixels = [y(yDom[0]), y(yDom[1])];

    const filteredTicks = (rawTicks as number[])
      .filter((t) => t > yDom[0] && t < yDom[1])
      .sort((a, b) => y(a) - y(b));

    for (const t of filteredTicks) {
      const px = y(t);
      if (occupiedPixels.some((op) => Math.abs(px - op) < minTickGap)) continue;
      occupiedPixels.push(px);

      g.append("line")
        .attr("x1", -3).attr("x2", 0)
        .attr("y1", px).attr("y2", px)
        .attr("stroke", "#555").attr("stroke-width", 0.6);
      g.append("text")
        .attr("x", -10).attr("y", px + 5)
        .attr("text-anchor", "end")
        .attr("fill", "#666").attr("font-size", `${axisSmFontSize}px`)
        .attr("font-family", FONT_DATA)
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

    // Referenslinje: 100 vid index, 1,00 för kvoter, 0 annars (dölj vid log)
    if (!useLog) {
      const refVal = indexMode ? 100 : (enhet === "kvot" ? 1 : 0);
      if (yDom[0] <= refVal && yDom[1] >= refVal) {
        g.append("line")
          .attr("x1", 0).attr("x2", w)
          .attr("y1", y(refVal)).attr("y2", y(refVal))
          .attr("stroke", "#000").attr("stroke-width", 1.2)
          .attr("stroke-dasharray", "6,4")
          .attr("opacity", 0.6);
        if (enhet === "kvot" && !indexMode) {
          g.append("text")
            .attr("x", w + 4).attr("y", y(refVal) + 4)
            .attr("fill", "#666").attr("font-size", "11px")
            .attr("font-weight", "500")
            .attr("font-family", FONT_DATA)
            .text("1,00");
        }
      }
    }

    // ─── X-axel ───
    g.append("line")
      .attr("x1", 0).attr("x2", w)
      .attr("y1", h).attr("y2", h)
      .attr("stroke", "#000").attr("stroke-width", 1.2);

    const years = [...new Set(allYears)].sort();
    const yearDom = d3.extent(years) as [number, number];

    // X-axel-ticks: januarimånader för månadsdata, var 5:e år för årsdata
    let tickYears: number[];
    if (monthly) {
      // Visa januari-ticks (YYYY01) + senaste punkt
      tickYears = years.filter(
        (yr) => yr % 100 === 1 || yr === yearDom[1]
      );
      // Glesa ut om det blir för tätt
      if (tickYears.length > 8) {
        tickYears = tickYears.filter(
          (yr, i) => yr % 200 === 1 || yr === yearDom[1] || i === 0
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
        .attr("y1", h).attr("y2", h + 6)
        .attr("stroke", "#000").attr("stroke-width", 0.8);
      g.append("text")
        .attr("x", xp(yr)).attr("y", h + 22)
        .attr("text-anchor", "middle")
        .attr("fill", "#000").attr("font-size", `${axisFontSize}px`)
        .attr("font-family", FONT)
        .text(monthly ? fmtPeriod(yr) : String(yr));
    });

    const line = d3.line<KpiRow>()
      .defined((d) => d.varde != null)
      .x((d) => xp(d.ar))
      .y((d) => y(d.varde!))
      .curve(d3.curveMonotoneX);

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

    // ─── Mediankommun — visas i alla + halland ───
    const visaRef = visningsLage !== "egen";
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
        .attr("stroke", "#777")
        .attr("stroke-width", 1.4);
      if (medianLast) {
        g.append("circle")
          .attr("cx", xp(medianLast.ar)).attr("cy", y(medianLast.varde))
          .attr("r", 3.5).attr("fill", "#777");
      }
    }

    // ─── Rikssnitt ───
    const riksSorted = visaRef ? [...riksData].sort((a, b) => a.ar - b.ar) : [];
    const riksLast = riksSorted[riksSorted.length - 1];

    if (riksSorted.length > 0) {
      g.append("path")
        .datum(riksSorted)
        .attr("d", line)
        .attr("fill", "none")
        .attr("stroke", "#444")
        .attr("stroke-width", 1.8);
      if (riksLast?.varde != null) {
        g.append("circle")
          .attr("cx", xp(riksLast.ar)).attr("cy", y(riksLast.varde))
          .attr("r", 3.5).attr("fill", "#444");
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

    if (kommunSorted.length > 0) {
      g.append("path")
        .datum(kommunSorted)
        .attr("d", line)
        .attr("fill", "none")
        .attr("stroke", "#00664D")
        .attr("stroke-width", 3);

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

        g.append("line")
          .attr("x1", -5).attr("x2", 4)
          .attr("y1", y(kommunLast.varde)).attr("y2", y(kommunLast.varde))
          .attr("stroke", "#00664D").attr("stroke-width", 1.5);
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
        text: compact ? fmtY(kommunLast.varde, enhet) : `${valdKommunNamn}  ${fmtY(kommunLast.varde, enhet)}`,
        naturalY: yp, yPos: yp,
        color: "#00664D", weight: 600, size: `${labelFontSize}px`,
      });
    }
    if (riksLast?.varde != null) {
      const yp = y(riksLast.varde);
      labels.push({
        text: compact ? fmtY(riksLast.varde, enhet) : `Riket  ${fmtY(riksLast.varde, enhet)}`,
        naturalY: yp, yPos: yp,
        color: "#444", weight: 500, size: `${labelSmFontSize}px`,
      });
    }

    if (medianLast) {
      const yp = y(medianLast.varde);
      labels.push({
        text: `Median  ${fmtY(medianLast.varde, enhet)}`,
        naturalY: yp, yPos: yp,
        color: "#777", weight: 500, size: `${labelSmFontSize}px`,
      });
    }

    if (visningsLage === "halland") {
      HALLAND_KODER.forEach((kod) => {
        if (kod === valdKommunKod) return;
        const rows = perKommun.get(kod);
        if (!rows) return;
        const sorted = [...rows].sort((a, b) => a.ar - b.ar);
        const last = sorted[sorted.length - 1];
        if (!last?.varde) return;
        const yp = y(last.varde);
        labels.push({
          text: compact ? fmtY(last.varde, enhet) : `${trunc(last.kommun_namn)}  ${fmtY(last.varde, enhet)}`,
          naturalY: yp, yPos: yp,
          color: "#bbb", weight: 400, size: compact ? "9px" : "11px",
        });
      });
    }

    resolveOverlap(labels, compact ? 13 : 17, 0, h);

    labels.forEach((lbl) => {
      const displaced = Math.abs(lbl.yPos - lbl.naturalY) > 3;

      if (displaced) {
        g.append("path")
          .attr("d", `M${w + 3},${lbl.naturalY} L${w + 7},${lbl.naturalY} L${w + 9},${lbl.yPos}`)
          .attr("fill", "none")
          .attr("stroke", lbl.color)
          .attr("stroke-width", 0.8)
          .attr("opacity", 0.35);
      }

      g.append("text")
        .attr("x", w + 12)
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
      .attr("fill", "#aaa").attr("font-size", "10px")
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
        // Hitta närmaste period (index-baserat för månadsdata)
        let year: number;
        if (monthly) {
          const idx = Math.round(x.invert(mx));
          const clamped = Math.max(0, Math.min(uniquePeriods.length - 1, idx));
          year = uniquePeriods[clamped];
        } else {
          year = Math.round(x.invert(mx));
        }
        const kommunRow = kommunSorted.find((d) => d.ar === year);
        const riksRow = riksSorted.find((d) => d.ar === year);
        if (!kommunRow?.varde) return;

        focusLine.attr("x1", xp(year)).attr("x2", xp(year)).attr("opacity", 0.15);
        focusDot.attr("cx", xp(year)).attr("cy", y(kommunRow.varde)).attr("opacity", 1);

        const riksText = riksRow?.varde != null
          ? `<br><span style="color:#555">Riket: ${fmtY(riksRow.varde, enhet)}</span>`
          : "";
        const rangText = kommunRow.rang_total != null
          ? `<br><span style="color:#444">${kommunRow.rang_total}/${kommunRow.antal_kommuner}</span>`
          : "";

        tooltipEl.style.opacity = "1";
        tooltipEl.style.left = `${margin.left + xp(year) + 14}px`;
        tooltipEl.style.top = `${margin.top + y(kommunRow.varde) - 28}px`;
        tooltipEl.innerHTML =
          `<span style="color:#444">${monthly ? fmtPeriod(year) : year}</span><br>` +
          `<span style="color:#00664D;font-weight:600">${valdKommunNamn}: ${fmtY(kommunRow.varde, enhet)}</span>` +
          riksText + rangText;
      })
      .on("mouseleave", () => {
        focusLine.attr("opacity", 0);
        focusDot.attr("opacity", 0);
        tooltipEl.style.opacity = "0";
      });
  }, [valdKommunKod, valdKommunNamn, kpiId, enhet, allData, isRegion, visningsLage, visaNoll, indexMode, leftMargin, titel, titelLines, harSubtitel, subtitelEnhet, subtitelGeografi, subtitelKontext, subtitelPeriod, titelOffset, width, height, compact, titelFontSize, titelLineH, subFontSize, axisFontSize, axisSmFontSize, labelFontSize, labelSmFontSize]);

  useEffect(() => { draw(); }, [draw]);

  return (
    <div className="relative">
      <svg ref={ref} width={width} height={height + titelOffset} />
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
