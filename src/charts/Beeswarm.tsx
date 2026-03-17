import { useRef, useEffect, useCallback } from "react";
import * as d3 from "d3";
import type { KpiRow } from "../types";
import { fmt, fmtInt } from "../utils/format";

const FONT = "'Inter', system-ui, sans-serif";
const FONT_DATA = "'IBM Plex Sans', sans-serif";

interface BeeNode extends d3.SimulationNodeDatum {
  kommunKod: string;
  kommunNamn: string;
  value: number;
  r: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  opacity: number;
  isSelected: boolean;
}

interface Props {
  allData: KpiRow[];
  kpiId: string;
  enhet: string;
  valdKommunKod: string;
  valdKommunNamn: string;
  isRegion: boolean;
  width: number;
  height: number;
  useLog?: boolean;
  animate?: boolean;
}

function fmtVal(v: number, enhet: string): string {
  if (enhet === "antal") return fmtInt(v);
  if (enhet === "inv/kvm") return fmt(v, 1);
  return fmt(v, Math.abs(v) >= 100 ? 0 : Math.abs(v) < 10 ? 2 : 1);
}

export default function Beeswarm({
  allData, kpiId, enhet, valdKommunKod, valdKommunNamn,
  isRegion, width, height, useLog = false, animate = true,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const prevKpiRef = useRef<string | null>(null);

  const compact = width < 400;

  const draw = useCallback(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    const isTransition = prevKpiRef.current !== null && prevKpiRef.current !== kpiId;
    prevKpiRef.current = kpiId;

    const margin = { top: 18, right: 16, bottom: 26, left: 16 };
    const w = width - margin.left - margin.right;
    const h = height - margin.top - margin.bottom;
    const centerY = h / 2;
    const axisY = h + 6;
    const tickLabelY = h + 20;

    const jmfTyp = isRegion ? "L" : "K";

    const latestYear = d3.max(
      allData.filter((d) => d.kpi_id === kpiId && d.kommun_typ === jmfTyp),
      (d) => d.ar
    );
    if (!latestYear) return;

    const kpiData = allData.filter(
      (d) => d.kpi_id === kpiId && d.ar === latestYear && d.kommun_typ === jmfTyp && d.varde != null
    );
    if (kpiData.length === 0) return;

    const isAbsoluteCount = enhet === "antal";
    const riketRow = !isAbsoluteCount
      ? allData.find(
          (d) => d.kpi_id === kpiId && d.ar === latestYear && d.kommun_kod === "0000" && d.varde != null
        )
      : null;
    const riketValue = riketRow?.varde ?? null;

    const vals = kpiData.map((d) => d.varde!).sort((a, b) => a - b);
    const medianValue = d3.median(vals) ?? null;
    const dataMin = vals[0];
    const dataMax = vals[vals.length - 1];

    // Bygg noder
    const nodes: BeeNode[] = kpiData.map((d) => {
      const isSel = d.kommun_kod === valdKommunKod;
      const rBase = isSel ? 7 : (isRegion ? 5 : 3.5);
      const r = compact ? rBase * 0.7 : rBase;
      return {
        kommunKod: d.kommun_kod,
        kommunNamn: d.kommun_namn,
        value: d.varde!,
        r,
        fill: isSel ? "#fff" : "rgba(255,255,255,0.4)",
        stroke: isSel ? "#00AB60" : "rgba(255,255,255,0.12)",
        strokeWidth: isSel ? 2.5 : 0.5,
        opacity: isSel ? 1 : 0.7,
        isSelected: isSel,
      };
    });

    // X-skala med padding så min/max inte sitter på pixel 0/w
    const pad = 20;
    const xScale = useLog
      ? d3.scaleLog().domain([Math.max(dataMin, 1), dataMax]).range([pad, w - pad]).clamp(true)
      : d3.scaleLinear().domain([dataMin, dataMax]).range([pad, w - pad]);

    // Kraftsimulering
    const sim = d3.forceSimulation(nodes)
      .force("x", d3.forceX<BeeNode>((d) => xScale(d.value)).strength(1))
      .force("y", d3.forceY<BeeNode>(centerY).strength(0.06))
      .force("collide", d3.forceCollide<BeeNode>((d) => d.r + 1).strength(0.85))
      .stop();

    for (let i = 0; i < 300; i++) sim.tick();

    nodes.forEach((n) => {
      n.y = Math.max(n.r + 4, Math.min(h - n.r - 4, n.y ?? centerY));
    });

    if (!isTransition) {
      svg.selectAll("*").remove();
    }

    let g = svg.select<SVGGElement>("g.main");
    if (g.empty()) {
      g = svg.append("g").attr("class", "main").attr("transform", `translate(${margin.left},${margin.top})`);
      g.append("g").attr("class", "axis-layer");
      g.append("g").attr("class", "ref-layer");
      g.append("g").attr("class", "circles-layer");
      g.append("g").attr("class", "labels-layer");
      g.append("g").attr("class", "hover-layer");
    }

    const dur = isTransition ? 800 : (animate ? 600 : 0);
    const ease = d3.easeCubicInOut;

    // ═══════════════════════════════════════════════
    //  X-AXEL — min/max som endpoints, filtrerade mellanticks
    // ═══════════════════════════════════════════════
    const axisG = g.select<SVGGElement>("g.axis-layer");
    axisG.selectAll("*").remove();

    const minPx = xScale(dataMin);
    const maxPx = xScale(dataMax);

    // Axellinje från min till max
    axisG.append("line")
      .attr("x1", minPx).attr("x2", maxPx)
      .attr("y1", axisY).attr("y2", axisY)
      .attr("stroke", "rgba(255,255,255,0.4)").attr("stroke-width", 1);

    // Endpoint-ticks
    [minPx, maxPx].forEach((px) => {
      axisG.append("line")
        .attr("x1", px).attr("x2", px)
        .attr("y1", axisY).attr("y2", axisY + 5)
        .attr("stroke", "rgba(255,255,255,0.6)").attr("stroke-width", 1);
    });

    // Min-etikett (centrerad under tick)
    axisG.append("text")
      .attr("x", minPx).attr("y", tickLabelY)
      .attr("text-anchor", "middle")
      .attr("fill", "rgba(255,255,255,0.75)")
      .attr("font-size", "11px").attr("font-weight", "500")
      .attr("font-family", FONT_DATA)
      .text(fmtVal(dataMin, enhet));

    // Max-etikett (centrerad under tick)
    axisG.append("text")
      .attr("x", maxPx).attr("y", tickLabelY)
      .attr("text-anchor", "middle")
      .attr("fill", "rgba(255,255,255,0.75)")
      .attr("font-size", "11px").attr("font-weight", "500")
      .attr("font-family", FONT_DATA)
      .text(fmtVal(dataMax, enhet));


    // ═══════════════════════════════════════════════
    //  REFERENSLINJER — median/riket
    //  Etiketter vid "fötterna" (strax under svärmen)
    // ═══════════════════════════════════════════════
    const refG = g.select<SVGGElement>("g.ref-layer");
    refG.selectAll("*").remove();

    // Hitta överkant av svärmen — etikett strax ovanför
    const swarmTop = Math.min(...nodes.map((n) => (n.y ?? centerY) - n.r));
    const labelTopY = Math.max(swarmTop - 6, -margin.top + 12);

    // Samla annotationer
    const annots: { px: number; text: string; dash: string; lineAlpha: number; labelY: number }[] = [];

    if (medianValue != null) {
      const px = xScale(Math.max(medianValue, useLog ? 1 : -Infinity));
      if (px >= 0 && px <= w) {
        annots.push({ px, text: "Median", dash: "4,4", lineAlpha: 0.5, labelY: labelTopY });
      }
    }

    if (riketValue != null) {
      const px = xScale(Math.max(riketValue, useLog ? 1 : -Infinity));
      if (px >= 0 && px <= w) {
        annots.push({ px, text: "Riket", dash: "2,3", lineAlpha: 0.4, labelY: labelTopY });
      }
    }

    // Överlapp: om nära, flytta den andra uppåt
    if (annots.length === 2 && Math.abs(annots[0].px - annots[1].px) < 50) {
      annots[1].labelY = labelTopY - 12;
    }

    annots.forEach((a) => {
      // Vertikal streckad linje
      refG.append("line")
        .attr("x1", a.px).attr("x2", a.px)
        .attr("y1", a.labelY + 3).attr("y2", axisY)
        .attr("stroke", `rgba(255,255,255,${a.lineAlpha})`)
        .attr("stroke-width", 1)
        .attr("stroke-dasharray", a.dash);

      // Etikett tight vid linjens topp
      refG.append("text")
        .attr("x", a.px + 4).attr("y", a.labelY)
        .attr("text-anchor", "start")
        .attr("fill", "rgba(255,255,255,0.8)")
        .attr("font-size", "10px").attr("font-weight", "500")
        .attr("font-family", FONT)
        .text(a.text);
    });

    // ═══════════════════════════════════════════════
    //  CIRKLAR
    // ═══════════════════════════════════════════════
    const circlesG = g.select<SVGGElement>("g.circles-layer");

    const sorted = [...nodes].sort((a, b) => (a.isSelected ? 1 : 0) - (b.isSelected ? 1 : 0));

    const circles = circlesG.selectAll<SVGCircleElement, BeeNode>("circle")
      .data(sorted, (d) => d.kommunKod);

    circles.exit().transition().duration(dur / 2).attr("r", 0).remove();

    const entered = circles.enter()
      .append("circle")
      .attr("cx", (d) => animate ? w / 2 + (Math.random() - 0.5) * w * 0.3 : d.x!)
      .attr("cy", (d) => animate ? centerY + (Math.random() - 0.5) * h * 0.4 : d.y!)
      .attr("r", 0)
      .attr("fill", (d) => d.fill)
      .attr("stroke", (d) => d.stroke)
      .attr("stroke-width", (d) => d.strokeWidth)
      .attr("opacity", (d) => d.opacity)
      .style("cursor", "pointer");

    const merged = entered.merge(circles);

    merged
      .on("mouseenter", function (_, d) {
        d3.select(this)
          .attr("stroke", "#fff")
          .attr("stroke-width", 2)
          .attr("opacity", 1);

        const hoverG = g.select("g.hover-layer");
        hoverG.selectAll("*").remove();

        const col = d.isSelected ? "#fff" : "rgba(255,255,255,0.6)";
        const textCol = d.isSelected ? "#fff" : "rgba(255,255,255,0.9)";

        // Linje från cirkel ner till x-axeln
        hoverG.append("line")
          .attr("x1", d.x!).attr("x2", d.x!)
          .attr("y1", d.y! + d.r).attr("y2", axisY)
          .attr("stroke", col).attr("stroke-width", 1);

        // Värde vid axeln
        hoverG.append("text")
          .attr("x", d.x!).attr("y", tickLabelY)
          .attr("text-anchor", "middle")
          .attr("fill", textCol)
          .attr("font-size", "11px").attr("font-weight", "600")
          .attr("font-family", FONT_DATA)
          .text(fmtVal(d.value, enhet));

        // Kommunnamn precis ovanför x-axeln, bredvid linjen
        const nameAnchor = d.x! > w / 2 ? "end" as const : "start" as const;
        const nameOffsetX = d.x! > w / 2 ? -6 : 6;
        hoverG.append("text")
          .attr("x", d.x! + nameOffsetX).attr("y", axisY - 4)
          .attr("text-anchor", nameAnchor)
          .attr("fill", textCol)
          .attr("font-size", "10px").attr("font-weight", "600")
          .attr("font-family", FONT)
          .text(d.kommunNamn);
      })
      .on("mouseleave", function (_, d) {
        d3.select(this)
          .attr("stroke", d.stroke)
          .attr("stroke-width", d.strokeWidth)
          .attr("opacity", d.opacity);

        g.select("g.hover-layer").selectAll("*").remove();
      });

    if (dur > 0) {
      merged.transition().duration(dur).ease(ease)
        .attr("cx", (d) => d.x!)
        .attr("cy", (d) => d.y!)
        .attr("r", (d) => d.r)
        .attr("fill", (d) => d.fill)
        .attr("stroke", (d) => d.stroke)
        .attr("stroke-width", (d) => d.strokeWidth)
        .attr("opacity", (d) => d.opacity);
    } else {
      merged
        .attr("cx", (d) => d.x!)
        .attr("cy", (d) => d.y!)
        .attr("r", (d) => d.r)
        .attr("fill", (d) => d.fill)
        .attr("stroke", (d) => d.stroke)
        .attr("stroke-width", (d) => d.strokeWidth)
        .attr("opacity", (d) => d.opacity);
    }

    // ═══════════════════════════════════════════════
    //  VALD KOMMUN — linje ner till x-axeln med värde
    // ═══════════════════════════════════════════════
    const labelsG = g.select<SVGGElement>("g.labels-layer");
    labelsG.selectAll("*").remove();

    const selNode = nodes.find((n) => n.isSelected);
    if (selNode && selNode.x != null && selNode.y != null) {
      // Vit linje från cirkelns underkant ner till axeln
      labelsG.append("line")
        .attr("x1", selNode.x).attr("x2", selNode.x)
        .attr("y1", selNode.y + selNode.r).attr("y2", axisY)
        .attr("stroke", "#fff").attr("stroke-width", 1.5)
        .attr("opacity", 0.6);

      // Värde vid axeln
      labelsG.append("text")
        .attr("x", selNode.x).attr("y", tickLabelY)
        .attr("text-anchor", "middle")
        .attr("fill", "#fff")
        .attr("font-size", "11px").attr("font-weight", "700")
        .attr("font-family", FONT_DATA)
        .text(fmtVal(selNode.value, enhet))
        .attr("opacity", 0)
        .transition().delay(dur * 0.5).duration(350)
        .attr("opacity", 1);
    }
  }, [allData, kpiId, enhet, valdKommunKod, valdKommunNamn, isRegion, width, height, useLog, animate, compact]);

  useEffect(() => { draw(); }, [draw]);

  return (
    <div className="relative">
      <svg ref={svgRef} width={width} height={height} />
    </div>
  );
}
