import { useRef, useEffect, useCallback, useMemo, useState } from "react";
import * as d3 from "d3";
import type { KpiRow } from "../types";
import { fmt } from "../utils/format";
import type { MapData } from "../hooks/useMapData";

const FONT = "'Inter', system-ui, sans-serif";
const FONT_DATA = "'IBM Plex Sans', sans-serif";

// Neutral divergerande palett (teal–orange) — undviker rött/grönt
const FARG_LAG = "#c25100";   // Mörk orange (låga värden)
const FARG_LAG_LJUS = "#fdd8b5"; // Ljus orange
const FARG_HOG = "#00664D";   // Mörk teal/grön (höga värden)
const _FARG_HOG_LJUS = "#c1e8c4"; // Ljus teal (reserv)
const FARG_MITT = "#f5f5f0";  // Neutral mittpunkt

const PER_1000_KPIS = new Set(["N01803", "N01806", "N01964"]);
const FOLKMANGD_KPI = "N01951";
const _HALLAND_LAN_KOD = "13"; // Används av cirkelfilter (reserv)

interface Props {
  valdKommunKod: string;
  valdKommunNamn: string;
  kpiId: string;
  enhet: string;
  allData: KpiRow[];
  isRegion: boolean;
  indexMode: boolean;
  titel?: string;
  subtitelEnhet?: string;
  subtitelGeografi?: string;
  kalla?: string;
  width: number;
  height: number;
  mapData: MapData;
}

interface VardeEntry {
  varde: number;
  namn: string;
  rang: number | null;
  total: number | null;
}

function fmtKarta(v: number, enhet?: string): string {
  if (enhet === "antal") return fmt(v, 0);
  return fmt(v, Math.abs(v) >= 100 ? 0 : Math.abs(v) < 10 ? 2 : 1);
}

export default function KartaVy({
  valdKommunKod, valdKommunNamn, kpiId, enhet, allData,
  isRegion, indexMode, titel, subtitelEnhet, subtitelGeografi,
  kalla, width, height, mapData,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const compact = width < 500;

  // Alltid choropleth — inga proportionella cirklar
  const useCircles = false;

  // ─── Steg 1: Transformera all data ───
  const transformed = useMemo(() => {
    let kpiRows = allData.filter((d) => d.kpi_id === kpiId && d.varde != null);

    if (PER_1000_KPIS.has(kpiId) && enhet !== "antal") {
      const popMap = new Map<string, number>();
      for (const d of allData) {
        if (d.kpi_id === FOLKMANGD_KPI && d.varde != null)
          popMap.set(`${d.kommun_kod}_${d.ar}`, d.varde);
      }
      kpiRows = kpiRows
        .map((d) => {
          const pop = popMap.get(`${d.kommun_kod}_${d.ar}`);
          return { ...d, varde: d.varde != null && pop && pop > 0 ? (d.varde / pop) * 1000 : null };
        })
        .filter((d) => d.varde != null);
    }

    if (indexMode) {
      const baseYear = Math.min(...kpiRows.map((d) => d.ar));
      const baseVal = new Map<string, number>();
      for (const d of kpiRows) {
        if (d.ar === baseYear && d.varde != null && !baseVal.has(d.kommun_kod))
          baseVal.set(d.kommun_kod, d.varde);
      }
      kpiRows = kpiRows
        .filter((d) => baseVal.has(d.kommun_kod) && baseVal.get(d.kommun_kod) !== 0)
        .map((d) => ({
          ...d,
          varde: d.varde != null ? (d.varde / baseVal.get(d.kommun_kod)!) * 100 : null,
        }));
    }

    const years = [...new Set(kpiRows.map((d) => d.ar))].sort((a, b) => a - b);
    const maxYear = years.length > 0 ? years[years.length - 1] : 2024;
    return { kpiRows, years, maxYear };
  }, [allData, kpiId, enhet, indexMode]);

  const { kpiRows, years, maxYear } = transformed;
  const [valdAr, setValdAr] = useState<number | null>(null);
  const aktivtAr = valdAr ?? maxYear;
  useEffect(() => { setValdAr(null); }, [kpiId, enhet, indexMode]);

  // ─── Steg 2: Filtrera till valt år ───
  const prepared = useMemo(() => {
    const jmfTyp = isRegion ? "L" : "K";
    const latestRows = kpiRows.filter((d) => d.ar === aktivtAr && d.kommun_typ === jmfTyp);

    const valueMap = new Map<string, VardeEntry>();
    for (const d of latestRows) {
      if (d.varde != null) {
        valueMap.set(d.kommun_kod, {
          varde: d.varde,
          namn: d.kommun_namn,
          rang: d.rang_total,
          total: d.antal_kommuner,
        });
      }
    }

    const values = [...valueMap.values()].map((d) => d.varde).sort((a, b) => a - b);
    if (values.length === 0) {
      return { valueMap, colorScale: () => "#eee", domain: [0, 1] as [number, number], median: 0 };
    }

    const median: number = d3.median(values) ?? values[Math.floor(values.length / 2)] ?? 0;

    // Avgör skala-typ
    const hasNeg = values.some((v) => v < 0);
    const isChange = indexMode || hasNeg;

    let colorScale: (v: number) => string;
    let domain: [number, number];

    if (isChange) {
      // Förändring: divergerande kring 0 (eller 100 för index)
      const center = indexMode ? 100 : 0;
      const dists = values.map((v) => Math.abs(v - center)).sort((a, b) => a - b);
      const maxDist = d3.quantile(dists, 0.95) ?? dists[dists.length - 1];
      domain = [center - maxDist, center + maxDist];
      const divScale = d3.scaleDiverging<string>()
        .domain([domain[0], center, domain[1]])
        .interpolator((t: number) => {
          if (t < 0.5) return d3.interpolateRgb(FARG_LAG, FARG_MITT)(t * 2);
          return d3.interpolateRgb(FARG_MITT, FARG_HOG)((t - 0.5) * 2);
        })
        .clamp(true);
      colorScale = (v: number) => divScale(v);
    } else {
      // Nivåvärden: divergerande kring MEDIANEN
      const p2 = d3.quantile(values, 0.02) ?? values[0];
      const p98 = d3.quantile(values, 0.98) ?? values[values.length - 1];
      domain = [p2, p98];
      const divScale = d3.scaleDiverging<string>()
        .domain([domain[0], median, domain[1]])
        .interpolator((t: number) => {
          if (t < 0.5) return d3.interpolateRgb(FARG_LAG_LJUS, FARG_MITT)(t * 2);
          return d3.interpolateRgb(FARG_MITT, FARG_HOG)((t - 0.5) * 2);
        })
        .clamp(true);
      colorScale = (v: number) => divScale(v);
    }

    return { valueMap, colorScale, domain, median };
  }, [kpiRows, aktivtAr, isRegion, indexMode, enhet, useCircles]);

  const { valueMap, colorScale, domain, median } = prepared;

  // Filter hanteras helt via D3 DOM — inget React state (undviker re-render under drag)

  // ─── Rita kartan ───
  const draw = useCallback(() => {
    if (!svgRef.current || !mapData) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const titelH = titel ? (compact ? 46 : 56) : 0;
    const bottomPad = 18;
    const mapAreaW = width - 8; // Kartan tar full bredd, legenden överlappar
    const mapAreaH = height - titelH - bottomPad;

    // ─── Titel ───
    if (titel) {
      svg.append("text").attr("x", 16).attr("y", compact ? 22 : 26)
        .attr("fill", "#111").attr("font-size", compact ? "15px" : "18px")
        .attr("font-weight", 600).attr("font-family", FONT).text(titel);

      const parts: { text: string; fill: string; weight: string }[] = [];
      if (subtitelEnhet) parts.push({ text: subtitelEnhet, fill: "#888", weight: "400" });
      if (subtitelGeografi) parts.push({ text: subtitelGeografi, fill: FARG_HOG, weight: "600" });
      parts.push({ text: String(aktivtAr), fill: "#888", weight: "400" });
      parts.push({ text: isRegion ? "samtliga regioner" : "samtliga kommuner", fill: "#999", weight: "400" });

      const subEl = svg.append("text").attr("x", 16).attr("y", compact ? 38 : 48)
        .attr("font-size", compact ? "11px" : "13px").attr("font-family", FONT);
      parts.forEach((p, i) => {
        if (i > 0) subEl.append("tspan").attr("fill", "#ccc").text("  \u00B7  ");
        subEl.append("tspan").attr("fill", p.fill).attr("font-weight", p.weight).text(p.text);
      });
    }

    // ─── Projektion ───
    const geoFeatures = isRegion ? mapData.lan : mapData.kommuner;
    const projection = d3.geoMercator()
      .fitSize([mapAreaW, mapAreaH], geoFeatures as d3.ExtendedFeatureCollection);
    const pathGen = d3.geoPath(projection);
    const pathFn = (d: GeoJSON.Feature) => pathGen(d) ?? "";

    const mapG = svg.append("g").attr("transform", `translate(0, ${titelH})`);
    const tooltipEl = tooltipRef.current;

    // Highlight-overlay
    const highlightEl = useCircles
      ? mapG.append("circle")
          .attr("fill", "none").attr("stroke", "#111").attr("stroke-width", 2.5)
          .attr("pointer-events", "none").style("display", "none")
      : mapG.append("path")
          .attr("fill", "none").attr("stroke", "#111").attr("stroke-width", 2.5)
          .attr("pointer-events", "none").style("display", "none");

    // Legend hover-markör (sätts av drawLegend, anropas av kart-hover)
    let legendHoverShow: (kod: string) => void = () => {};
    let legendHoverHide: () => void = () => {};

    function showTooltip(_ev: MouseEvent, kod: string, namn: string) {
      legendHoverShow(kod);
      if (!tooltipEl) return;
      const entry = valueMap.get(kod);
      if (entry) {
        const rang = entry.rang != null && entry.total != null
          ? `<br><span style="color:#444">${entry.rang} av ${entry.total}</span>` : "";
        tooltipEl.innerHTML =
          `<span style="font-weight:600">${entry.namn || namn}</span><br>` +
          `<span style="color:${FARG_HOG};font-weight:600">${fmtKarta(entry.varde, enhet)}</span>` + rang;
      } else {
        tooltipEl.innerHTML = `<span style="font-weight:600">${namn}</span><br><span style="color:#999">Uppgift saknas</span>`;
      }
      tooltipEl.style.opacity = "1";
    }
    function moveTooltip(ev: MouseEvent) {
      if (!tooltipEl || !svgRef.current) return;
      const r = svgRef.current.getBoundingClientRect();
      const tt = tooltipEl.getBoundingClientRect();
      let left = ev.clientX - r.left + 14;
      if (left + tt.width > width - 10) left = ev.clientX - r.left - tt.width - 14;
      tooltipEl.style.left = `${left}px`;
      tooltipEl.style.top = `${ev.clientY - r.top - 10}px`;
    }
    function hideTooltip() {
      if (tooltipEl) tooltipEl.style.opacity = "0";
      legendHoverHide();
    }

    // ═══════════════════════════════════════════════════════
    // PROPORTIONELLA CIRKLAR (med force-simulation)
    // ═══════════════════════════════════════════════════════
    if (useCircles) {
      // Baskarta — kommun-polygoner med vald geografi framhävd
      mapG.selectAll<SVGPathElement, GeoJSON.Feature>("path.bas")
        .data(mapData.kommuner.features).join("path").attr("class", "bas")
        .attr("d", (d: GeoJSON.Feature) => pathFn(d))
        .attr("fill", (d: GeoJSON.Feature) => {
          const kod = (d.properties as { kod: string }).kod;
          return kod === valdKommunKod ? "#e8e8e8" : "#f3f3f3";
        })
        .attr("stroke", (d: GeoJSON.Feature) => {
          const kod = (d.properties as { kod: string }).kod;
          return kod === valdKommunKod ? "#bbb" : "#e8e8e8";
        })
        .attr("stroke-width", (d: GeoJSON.Feature) => {
          const kod = (d.properties as { kod: string }).kod;
          return kod === valdKommunKod ? 1.2 : 0.2;
        });

      // ─── Vald kommun: halo-effekt på baskartan (vit ring runt polygonen) ───
      if (!isRegion) {
        const valdBas = mapData.kommuner.features.find(
          (f) => (f.properties as { kod: string }).kod === valdKommunKod,
        );
        if (valdBas) {
          // Vit yttre glow
          mapG.append("path").datum(valdBas)
            .attr("d", (d: GeoJSON.Feature) => pathFn(d))
            .attr("fill", "none").attr("stroke", "#fff").attr("stroke-width", 4)
            .attr("pointer-events", "none");
          mapG.append("path").datum(valdBas)
            .attr("d", (d: GeoJSON.Feature) => pathFn(d))
            .attr("fill", "none").attr("stroke", "#999").attr("stroke-width", 1.2)
            .attr("pointer-events", "none");
        }
      }

      // Förbered cirkeldata — välj geometri baserat på region/kommun
      const geoSource = isRegion ? mapData.lan : mapData.kommuner;
      const kodFn = isRegion
        ? (f: GeoJSON.Feature) => "00" + (f.properties as { kod: string }).kod
        : (f: GeoJSON.Feature) => (f.properties as { kod: string }).kod;

      const allVals = [...valueMap.values()].map((d) => Math.abs(d.varde));
      const maxVal = d3.max(allVals) ?? 1;

      // Mindre cirklar: 0.035 istället för 0.055, med minimum 1.5px
      const maxR = Math.min(mapAreaW, mapAreaH) * (isRegion ? 0.06 : 0.032);
      const minR = isRegion ? 4 : 1.5;
      const rScale = d3.scaleSqrt().domain([0, maxVal]).range([0, maxR]);

      // Bygg cirkel-noder med start-position = centroid
      interface CNode extends d3.SimulationNodeDatum {
        cx: number; cy: number; // ursprunglig centroid
        r: number; kod: string; namn: string; entry: VardeEntry;
      }
      const nodes: CNode[] = [];
      for (const feature of geoSource.features) {
        const kod = kodFn(feature);
        const entry = valueMap.get(kod);
        if (!entry) continue;
        const c = pathGen.centroid(feature);
        if (isNaN(c[0])) continue;
        const r = Math.max(minR, rScale(Math.abs(entry.varde)));
        nodes.push({
          cx: c[0], cy: c[1], x: c[0], y: c[1], r,
          kod, namn: (feature.properties as { namn: string }).namn, entry,
        });
      }

      // d3-force: knuffa isär överlappande cirklar
      // men behåll dem nära sin geografiska position
      const sim = d3.forceSimulation(nodes)
        .force("x", d3.forceX<CNode>((d) => d.cx).strength(0.9))
        .force("y", d3.forceY<CNode>((d) => d.cy).strength(0.9))
        .force("collide", d3.forceCollide<CNode>((d) => d.r + 0.6).strength(0.7).iterations(3))
        .stop();

      // Kör simulationen synkront (snabbt, ~5ms)
      for (let i = 0; i < 80; i++) sim.tick();

      // Sortera: stora underst, små överst
      nodes.sort((a, b) => b.r - a.r);

      // Vit halo bakom vald kommuns cirkel
      const valdNode = nodes.find((n) => n.kod === valdKommunKod);
      if (valdNode) {
        mapG.append("circle")
          .attr("cx", valdNode.x!).attr("cy", valdNode.y!).attr("r", valdNode.r + 3)
          .attr("fill", "#fff").attr("stroke", "#fff").attr("stroke-width", 2)
          .attr("pointer-events", "none");
      }

      // Flytta highlight-overlay överst
      highlightEl.raise();

      // Rita cirklar — använd simulationens x/y (inte cx/cy)
      mapG.selectAll<SVGCircleElement, CNode>("circle.prop")
        .data(nodes).join("circle").attr("class", "prop")
        .attr("cx", (d) => d.x!).attr("cy", (d) => d.y!)
        .attr("r", (d) => d.r)
        .attr("fill", FARG_HOG)
        .attr("fill-opacity", (d) => 0.35 + 0.3 * (1 - d.r / maxR))
        .attr("stroke", FARG_HOG)
        .attr("stroke-width", (d) => d.kod === valdKommunKod ? 2 : 0.5)
        .attr("stroke-opacity", (d) => d.kod === valdKommunKod ? 1 : 0.5)
        .style("cursor", "pointer")
        .on("mouseenter", function (ev: MouseEvent, d: CNode) {
          (highlightEl as d3.Selection<SVGCircleElement, unknown, null, undefined>)
            .attr("cx", d.x!).attr("cy", d.y!).attr("r", d.r + 1)
            .style("display", null).raise();
          showTooltip(ev, d.kod, d.namn); moveTooltip(ev);
        })
        .on("mousemove", (ev: MouseEvent) => moveTooltip(ev))
        .on("mouseleave", () => { highlightEl.style("display", "none"); hideTooltip(); });

      // ─── Cirkel-legend (2 referenscirklar + vald kommun) ───
      const legX = width - (compact ? 100 : 130);
      const legBot = titelH + mapAreaH - 6;
      const legG = svg.append("g").attr("transform", `translate(${legX}, ${legBot})`);

      // Välj exakt 2 referensvärden: stort + litet (undviker överlapp)
      const rawTicks = d3.ticks(0, maxVal, 3).filter((v) => v > 0);
      const legVals = rawTicks.length >= 2
        ? [rawTicks[rawTicks.length - 1], rawTicks[0]]
        : rawTicks;

      const lcx = maxR + 2;
      const labelX = lcx + maxR + 6;
      legVals.forEach((v) => {
        const r = Math.max(minR, rScale(v));
        legG.append("circle").attr("cx", lcx).attr("cy", -r).attr("r", r)
          .attr("fill", "none").attr("stroke", "#aaa").attr("stroke-width", 0.6)
          .attr("stroke-dasharray", "2,1.5");
        legG.append("text").attr("x", labelX).attr("y", -2 * r + 3)
          .attr("fill", "#888").attr("font-size", compact ? "8px" : "9px")
          .attr("font-family", FONT_DATA).text(fmtKarta(v, enhet));
      });

      // Vald kommun — fylld referenscirkel
      const vE = valueMap.get(valdKommunKod);
      if (vE) {
        const vR = Math.max(minR, rScale(Math.abs(vE.varde)));
        legG.append("circle").attr("cx", lcx).attr("cy", -vR).attr("r", vR)
          .attr("fill", FARG_HOG).attr("fill-opacity", 0.2)
          .attr("stroke", FARG_HOG).attr("stroke-width", 1.2);
        // Etikett bredvid — med namn
        const labelY = -2 * vR + 3;
        legG.append("text").attr("x", labelX).attr("y", labelY)
          .attr("fill", FARG_HOG).attr("font-weight", 600)
          .attr("font-size", compact ? "8px" : "10px").attr("font-family", FONT_DATA)
          .text(fmtKarta(vE.varde, enhet));
        legG.append("text").attr("x", labelX).attr("y", labelY + 12)
          .attr("fill", FARG_HOG).attr("font-weight", 400)
          .attr("font-size", compact ? "7px" : "9px").attr("font-family", FONT)
          .text(valdKommunNamn);
      }

    // ═══════════════════════════════════════════════════════
    // KOROPLET
    // ═══════════════════════════════════════════════════════
    } else {
      const getKod = isRegion
        ? (d: GeoJSON.Feature) => "00" + (d.properties as { kod: string }).kod
        : (d: GeoJSON.Feature) => (d.properties as { kod: string }).kod;

      if (isRegion) {
        mapG.selectAll<SVGPathElement, GeoJSON.Feature>("path.bg")
          .data(mapData.kommuner.features).join("path").attr("class", "bg")
          .attr("d", (d: GeoJSON.Feature) => pathFn(d))
          .attr("fill", "#f0f0f0").attr("stroke", "#e0e0e0").attr("stroke-width", 0.3);
      }

      const mainFeatures = isRegion ? mapData.lan.features : mapData.kommuner.features;
      const mainClass = isRegion ? "region" : "kommun";

      const mainPaths = mapG.selectAll<SVGPathElement, GeoJSON.Feature>(`path.${mainClass}`)
        .data(mainFeatures).join("path").attr("class", mainClass)
        .attr("d", (d: GeoJSON.Feature) => pathFn(d))
        .attr("fill", (d: GeoJSON.Feature) => {
          const entry = valueMap.get(getKod(d));
          return entry ? colorScale(entry.varde) : "#eee";
        })
        .attr("opacity", 1)
        .attr("stroke", "#fff").attr("stroke-width", isRegion ? 1 : 0.3)
        .style("cursor", "pointer")
        .on("mouseenter", function (ev: MouseEvent, d: GeoJSON.Feature) {
          (highlightEl as d3.Selection<SVGPathElement, unknown, null, undefined>)
            .attr("d", pathFn(d)).style("display", null).raise();
          showTooltip(ev, getKod(d), (d.properties as { namn: string }).namn); moveTooltip(ev);
        })
        .on("mousemove", (ev: MouseEvent) => moveTooltip(ev))
        .on("mouseleave", () => { highlightEl.style("display", "none"); hideTooltip(); });

      // Permanent markering av vald kommun/region — dubbel-stroke "pop"
      const valdKodMatch = isRegion ? valdKommunKod.replace(/^00/, "") : valdKommunKod;
      const valdFeatures = (isRegion ? mapData.lan : mapData.kommuner).features;
      const valdF = valdFeatures.find((f) => (f.properties as { kod: string }).kod === valdKodMatch);
      if (valdF) {
        // Vit yttre glow
        mapG.append("path").datum(valdF)
          .attr("d", (d: GeoJSON.Feature) => pathFn(d))
          .attr("fill", "none").attr("stroke", "#fff").attr("stroke-width", 5)
          .attr("pointer-events", "none");
        // Mörk inre kant
        mapG.append("path").datum(valdF)
          .attr("d", (d: GeoJSON.Feature) => pathFn(d))
          .attr("fill", "none").attr("stroke", "#333").attr("stroke-width", 1.8)
          .attr("pointer-events", "none");
      }

      highlightEl.raise();

      // ─── Legend med drag-reglage ───
      drawLegend(mainPaths, getKod);
    }

    // ─── Källa ───
    svg.append("text").attr("x", width - 8).attr("y", height - 4)
      .attr("text-anchor", "end").attr("fill", "#aaa")
      .attr("font-size", "10px").attr("font-family", FONT)
      .text(kalla ? `Källa: ${kalla}` : "Källa: SCB och bearbetningar av Region Halland");

    // ─── Legend — overlay-panel som överlappar kartan ───
    function drawLegend(
      mainPaths: d3.Selection<SVGPathElement, GeoJSON.Feature, SVGGElement, unknown>,
      getKod: (d: GeoJSON.Feature) => string,
    ) {
      const legendH = Math.min(mapAreaH * 0.65, 280);
      const barW = compact ? 12 : 16;
      const panelW = compact ? 150 : 200;
      const barX = compact ? 70 : 100; // utrymme för vänster-etiketter + connectors
      const panelX = width - panelW - 8;
      const panelY = titelH + (mapAreaH - legendH) / 2 - 14;
      const panelH = legendH + 28;

      const legG = svg.append("g").attr("transform", `translate(${panelX}, ${panelY})`);

      // Halvtransparent bakgrund
      legG.append("rect").attr("width", panelW).attr("height", panelH).attr("rx", 6)
        .attr("fill", "#fff").attr("opacity", 0.88);

      // Gradient-bar inuti panelen
      const barY = 14;
      const barG = legG.append("g").attr("transform", `translate(${barX}, ${barY})`);

      // Styckevis linjär skala: median alltid i MITTEN av baren
      // Löser problemet med skev data (t.ex. befolkningstäthet: median 29, max 6 483)
      const lScale = d3.scaleLinear()
        .domain([domain[0], med, domain[1]])
        .range([legendH, legendH / 2, 0]);

      // Gradient-stops samplar via lScale (inte linjärt i domänen)
      const gradId = "kartaGrad";
      const defs = svg.append("defs");
      const grad = defs.append("linearGradient")
        .attr("id", gradId).attr("x1", "0%").attr("y1", "100%").attr("x2", "0%").attr("y2", "0%");
      const nStops = 40;
      for (let i = 0; i <= nStops; i++) {
        const yFrac = i / nStops; // 0 = botten, 1 = topp
        const yPx = legendH * (1 - yFrac);
        const val = lScale.invert(yPx);
        grad.append("stop")
          .attr("offset", `${(yFrac * 100).toFixed(1)}%`)
          .attr("stop-color", colorScale(val));
      }
      barG.append("rect").attr("width", barW).attr("height", legendH).attr("rx", 3)
        .attr("fill", `url(#${gradId})`).attr("stroke", "#ddd").attr("stroke-width", 0.5);

      const fsSmall = compact ? "8px" : "9px";
      const fsVal = compact ? "9px" : "10px";

      // Tick-värden till HÖGER — min, max, och jämna steg i varje halva
      const med = median ?? 0;
      const lowerTicks = d3.ticks(domain[0], med, 2).filter((v) => v > domain[0] * 1.1 && v < med * 0.9);
      const upperTicks = d3.ticks(med, domain[1], 2).filter((v) => v > med * 1.1 && v < domain[1] * 0.9);
      const allTicks = [
        { v: domain[0], bold: true },
        ...lowerTicks.map((v) => ({ v, bold: false })),
        ...upperTicks.map((v) => ({ v, bold: false })),
        { v: domain[1], bold: true },
      ];
      allTicks.forEach(({ v, bold }) => {
        const yp = lScale(v);
        barG.append("line").attr("x1", barW).attr("x2", barW + (bold ? 5 : 3))
          .attr("y1", yp).attr("y2", yp)
          .attr("stroke", bold ? "#666" : "#bbb").attr("stroke-width", bold ? 0.8 : 0.5);
        barG.append("text").attr("x", barW + 6).attr("y", yp + 3)
          .attr("fill", bold ? "#444" : "#888")
          .attr("font-size", bold ? fsVal : fsSmall)
          .attr("font-weight", bold ? 600 : 400)
          .attr("font-family", FONT_DATA).text(fmtKarta(v, enhet));
      });

      // ─── Vänster-etiketter med connector lines ───
      const fsLabel = compact ? "9px" : "11px";
      const _labelX = 8; // x i legG-coords (reserv)
      const connMidX = barX - 12; // x där connector-linjen svänger vertikalt
      const minGap = compact ? 14 : 16;

      interface LegLabel {
        naturalY: number; yPos: number;
        label: string; color: string; dash: boolean;
      }

      function resolveLabels(labels: LegLabel[]) {
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
          for (const l of labels) l.yPos = Math.max(4, Math.min(legendH - 4, l.yPos));
          if (!moved) break;
        }
      }

      function drawLabel(lbl: LegLabel) {
        // Tick på baren
        barG.append("line")
          .attr("x1", -3).attr("x2", barW + 3)
          .attr("y1", lbl.naturalY).attr("y2", lbl.naturalY)
          .attr("stroke", lbl.color)
          .attr("stroke-width", lbl.dash ? 1.5 : 1)
          .attr("stroke-dasharray", lbl.dash ? "3,2" : "none")
          .attr("opacity", 0.8);

        // Prick vid baren
        barG.append("circle")
          .attr("cx", -3).attr("cy", lbl.naturalY).attr("r", 1.5)
          .attr("fill", lbl.color).attr("opacity", 0.6);

        // Connector: bar → etikett (slutar precis vid texten)
        const displaced = Math.abs(lbl.yPos - lbl.naturalY) > 3;
        if (displaced) {
          legG.append("path")
            .attr("d", `M${barX - 4},${barY + lbl.naturalY} L${connMidX},${barY + lbl.naturalY} L${connMidX},${barY + lbl.yPos}`)
            .attr("fill", "none").attr("stroke", lbl.color).attr("stroke-width", 0.7)
            .attr("opacity", 0.35);
        }

        // Etikett-text
        legG.append("text")
          .attr("x", connMidX - 4).attr("y", barY + lbl.yPos + 4)
          .attr("text-anchor", "end").attr("fill", lbl.color)
          .attr("font-size", fsLabel).attr("font-weight", 600)
          .attr("font-family", FONT_DATA).text(lbl.label);
      }

      // Statiska etiketter
      const staticLabels: LegLabel[] = [];
      const medY = lScale(Math.max(domain[0], Math.min(domain[1], med)));
      staticLabels.push({
        naturalY: medY, yPos: medY,
        label: `Median ${fmtKarta(med, enhet)}`,
        color: "#444", dash: true,
      });

      const vE = valueMap.get(valdKommunKod);
      if (vE) {
        const vY = lScale(Math.max(domain[0], Math.min(domain[1], vE.varde)));
        staticLabels.push({
          naturalY: vY, yPos: vY,
          label: `${valdKommunNamn} ${fmtKarta(vE.varde, enhet)}`,
          color: FARG_HOG, dash: false,
        });
      }

      resolveLabels(staticLabels);
      const staticYPositions = staticLabels.map((l) => l.yPos);
      for (const lbl of staticLabels) drawLabel(lbl);

      // ─── Hover-etikett med connector (visas vid mouseover) ───
      // Pre-create elements (hidden)
      const hoverTickLine = barG.append("line")
        .attr("x1", -3).attr("x2", barW + 3)
        .attr("stroke", "#111").attr("stroke-width", 1.2)
        .attr("pointer-events", "none").style("display", "none");
      const hoverConnector = legG.append("path")
        .attr("fill", "none").attr("stroke", "#111").attr("stroke-width", 0.7)
        .attr("opacity", 0.5).attr("pointer-events", "none").style("display", "none");
      const hoverLabel = legG.append("text")
        .attr("fill", "#111").attr("font-size", fsLabel).attr("font-weight", 600)
        .attr("font-family", FONT_DATA).attr("pointer-events", "none").style("display", "none");

      legendHoverShow = (kod: string) => {
        const entry = valueMap.get(kod);
        if (!entry) return;
        const clamp = Math.max(domain[0], Math.min(domain[1], entry.varde));
        const natY = lScale(clamp);

        // Hitta ledig y-position som undviker statiska etiketter
        let yPos = natY;
        for (let iter = 0; iter < 15; iter++) {
          let ok = true;
          for (const sy of staticYPositions) {
            const gap = Math.abs(yPos - sy);
            if (gap < minGap) {
              yPos += yPos <= sy ? -(minGap - gap + 1) : (minGap - gap + 1);
              ok = false;
            }
          }
          yPos = Math.max(4, Math.min(legendH - 4, yPos));
          if (ok) break;
        }

        // Tick
        hoverTickLine.attr("y1", natY).attr("y2", natY).style("display", null);

        // Connector: bar → nedåt connMidX (samma mönster som statiska etiketter)
        const displaced = Math.abs(yPos - natY) > 3;
        if (displaced) {
          hoverConnector
            .attr("d", `M${barX - 4},${barY + natY} L${connMidX},${barY + natY} L${connMidX},${barY + yPos}`)
            .style("display", null);
        } else {
          hoverConnector.style("display", "none");
        }

        // Label — högerställd vid connMidX (samma som statiska)
        const namn = entry.namn || "";
        hoverLabel
          .attr("x", connMidX - 4).attr("y", barY + yPos + 4)
          .attr("text-anchor", "end")
          .text(`${namn} ${fmtKarta(entry.varde, enhet)}`)
          .style("display", null);
      };

      legendHoverHide = () => {
        hoverTickLine.style("display", "none");
        hoverConnector.style("display", "none");
        hoverLabel.style("display", "none");
      };

      // ─── Drag-handles med filter-indikator ───
      const totalCount = valueMap.size;
      const overflow = 8; // handtag kan dras utanför baren

      // Dimmat område
      const dimTop = barG.append("rect").attr("x", -1).attr("width", barW + 2)
        .attr("y", 0).attr("height", 0)
        .attr("fill", "#fff").attr("opacity", 0.75).attr("pointer-events", "none");
      const dimBot = barG.append("rect").attr("x", -1).attr("width", barW + 2)
        .attr("y", legendH).attr("height", 0)
        .attr("fill", "#fff").attr("opacity", 0.75).attr("pointer-events", "none");

      // Filter-info — visas på kartan
      const filterInfoG = mapG.append("g")
        .attr("transform", `translate(14, ${mapAreaH - 8})`)
        .style("display", "none");
      filterInfoG.append("rect").attr("x", -6).attr("y", -28).attr("width", 160).attr("height", 32)
        .attr("rx", 4).attr("fill", "#fff").attr("opacity", 0.88);
      const filterLine1 = filterInfoG.append("text")
        .attr("y", -14).attr("fill", "#333").attr("font-size", "11px")
        .attr("font-weight", 600).attr("font-family", FONT);
      const filterLine2 = filterInfoG.append("text")
        .attr("y", 0).attr("fill", "#666").attr("font-size", "10px")
        .attr("font-family", FONT_DATA);

      // Handtag: tunn visuell linje med cirkelgrepp + bred osynlig klickyta
      function makeHandle(yInit: number) {
        const h = barG.append("g").attr("transform", `translate(0, ${yInit})`).style("cursor", "ns-resize");
        // Osynlig klickyta
        h.append("rect").attr("x", -10).attr("width", barW + 20).attr("y", -8).attr("height", 16)
          .attr("fill", "transparent");
        // Visuell linje
        h.append("line").attr("x1", -5).attr("x2", barW + 5)
          .attr("y1", 0).attr("y2", 0)
          .attr("stroke", "#444").attr("stroke-width", 1.5).attr("stroke-linecap", "round");
        // Grepp-prickar i ändarna
        h.append("circle").attr("cx", -5).attr("cy", 0).attr("r", 2.5).attr("fill", "#444");
        h.append("circle").attr("cx", barW + 5).attr("cy", 0).attr("r", 2.5).attr("fill", "#444");
        return h;
      }

      const topHandle = makeHandle(-overflow);
      const botHandle = makeHandle(legendH + overflow);

      let topY = -overflow;
      let botY = legendH + overflow;

      function applyFilter() {
        // Dim-rektanglar klippas till barens synliga yta
        const dimTopH = Math.max(0, topY);
        const dimBotStart = Math.min(legendH, botY);
        dimTop.attr("height", dimTopH);
        dimBot.attr("y", dimBotStart).attr("height", legendH - dimBotStart);

        const isActive = topY > -overflow + 2 || botY < legendH + overflow - 2;
        if (isActive) {
          const hi = lScale.invert(topY);
          const lo = lScale.invert(botY);

          let matchCount = 0;
          mainPaths.attr("opacity", (d) => {
            const entry = valueMap.get(getKod(d));
            if (!entry) return 0.08;
            const ok = entry.varde >= lo && entry.varde <= hi;
            if (ok) matchCount++;
            return ok ? 1 : 0.08;
          });

          // Visa filter-info på kartan
          filterInfoG.style("display", null);
          filterLine1.text(`${matchCount} av ${totalCount} ${isRegion ? "regioner" : "kommuner"}`);
          filterLine2.text(`${fmtKarta(lo, enhet)} – ${fmtKarta(hi, enhet)}`);
        } else {
          mainPaths.attr("opacity", 1);
          filterInfoG.style("display", "none");
        }
      }

      // Robust drag — raw mousedown/mousemove/mouseup med kända konstanta offset
      // (d3.drag + getBoundingClientRect på <g> ger fel pga etiketter utanför baren)
      const svgEl = svgRef.current!;

      function barYFromEvent(e: MouseEvent): number {
        const svgRect = svgEl.getBoundingClientRect();
        return e.clientY - svgRect.top - panelY - barY;
      }

      function setupDrag(
        handle: d3.Selection<SVGGElement, unknown, null, undefined>,
        isTop: boolean,
      ) {
        handle.on("mousedown", (event: MouseEvent) => {
          event.preventDefault();
          event.stopPropagation();

          const onMove = (e: MouseEvent) => {
            e.preventDefault();
            const my = barYFromEvent(e);
            if (isTop) {
              topY = Math.max(-overflow, Math.min(botY, my));
              handle.attr("transform", `translate(0, ${topY})`);
            } else {
              botY = Math.max(topY, Math.min(legendH + overflow, my));
              handle.attr("transform", `translate(0, ${botY})`);
            }
            applyFilter();
          };

          const onUp = () => {
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup", onUp);
          };

          window.addEventListener("mousemove", onMove);
          window.addEventListener("mouseup", onUp);
        });
      }

      setupDrag(topHandle as d3.Selection<SVGGElement, unknown, null, undefined>, true);
      setupDrag(botHandle as d3.Selection<SVGGElement, unknown, null, undefined>, false);
    }
  }, [
    mapData, valueMap, colorScale, domain, median, aktivtAr,
    valdKommunKod, valdKommunNamn, isRegion, useCircles,
    width, height, titel, compact, subtitelEnhet, subtitelGeografi, enhet, kalla,
  ]);

  useEffect(() => { draw(); }, [draw]);

  const harFleraAr = years.length > 1;

  return (
    <div className="relative">
      <svg ref={svgRef} width={width} height={height} />
      <div
        ref={tooltipRef}
        className="absolute pointer-events-none font-data text-[12px] leading-snug
                   bg-white/95 border border-neutral-200 rounded-lg px-3 py-2 shadow-md
                   transition-opacity duration-75"
        style={{ opacity: 0 }}
      />
      {harFleraAr && (
        <div className="flex items-center gap-3 px-4 pt-1 pb-1">
          <span className="text-[11px] text-neutral-400 font-data tabular-nums w-9 text-right">
            {years[0]}
          </span>
          <input
            type="range"
            min={years[0]}
            max={years[years.length - 1]}
            step={1}
            value={aktivtAr}
            onChange={(e) => setValdAr(Number(e.target.value))}
            className="flex-1 h-1.5 accent-[#00664D] cursor-pointer"
          />
          <span className="text-[13px] font-data tabular-nums font-semibold min-w-[3ch] text-right"
            style={{ color: FARG_HOG }}>
            {aktivtAr}
          </span>
        </div>
      )}
    </div>
  );
}
