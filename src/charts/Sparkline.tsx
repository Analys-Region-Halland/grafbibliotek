import { memo, useRef, useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import * as d3 from "d3";
import type { KpiRow } from "../types";
import { fmt, fmtInt } from "../utils/format";

interface Props {
  data: KpiRow[];
  width?: number;
  height?: number;
  mode?: "value" | "rank";
  enhet?: string;
}

const LINJE = "#00664D"; // gron-1 — enhetlig linjefärg

/** Rankingetikett: "högsta 14%" eller "lägsta 22%" beroende på position */
function rankLabel(rang: number, n: number): string {
  const pct = Math.round((rang / n) * 100);
  if (pct <= 50) return `högsta ${pct}%`;
  return `lägsta ${100 - pct}%`;
}

interface TipState {
  text: string;
  x: number;
  y: number;
  visible: boolean;
}

function SparklineInner({
  data, width = 130, height = 52, mode = "value", enhet = "",
}: Props) {
  const ref = useRef<SVGSVGElement>(null);
  const [tip, setTip] = useState<TipState>({ text: "", x: 0, y: 0, visible: false });

  const hideTip = useCallback(() => {
    setTip((prev) => ({ ...prev, visible: false }));
  }, []);

  useEffect(() => {
    if (!ref.current || data.length < 2) return;
    const svg = d3.select(ref.current);
    svg.selectAll("*").remove();

    const sorted = [...data].sort((a, b) => a.ar - b.ar);

    if (mode === "rank") {
      const rankData = sorted.filter((d) => d.rang_total != null);
      if (rankData.length < 2) return;

      const percentiler = rankData.map((d) => {
        const n = d.antal_kommuner ?? 290;
        return (d.rang_total! / n) * 100;
      });

      const x = d3.scaleLinear().domain([0, percentiler.length - 1]).range([2, width - 2]);
      const y = d3.scaleLinear().domain([100, 0]).range([height - 3, 3]);

      [
        { from: 0, to: 25, fill: "rgba(0, 171, 96, 0.10)" },
        { from: 25, to: 50, fill: "rgba(0, 171, 96, 0.04)" },
        { from: 50, to: 75, fill: "rgba(165, 19, 0, 0.04)" },
        { from: 75, to: 100, fill: "rgba(165, 19, 0, 0.10)" },
      ].forEach(({ from, to, fill }) => {
        svg.append("rect")
          .attr("x", 0).attr("width", width)
          .attr("y", y(from)).attr("height", y(to) - y(from))
          .attr("fill", fill);
      });

      [25, 50, 75].forEach((pctLine) => {
        svg.append("line")
          .attr("x1", 0).attr("x2", width)
          .attr("y1", y(pctLine)).attr("y2", y(pctLine))
          .attr("stroke", pctLine === 50 ? "rgba(0,0,0,0.10)" : "rgba(0,0,0,0.05)")
          .attr("stroke-width", pctLine === 50 ? 0.75 : 0.5)
          .attr("stroke-dasharray", pctLine === 50 ? "none" : "2,2");
      });

      const line = d3.line<number>()
        .x((_, i) => x(i))
        .y((d) => y(d))
        .curve(d3.curveMonotoneX);

      svg.append("path")
        .datum(percentiler)
        .attr("d", line)
        .attr("fill", "none")
        .attr("stroke", LINJE)
        .attr("stroke-width", 1.8);

      svg.append("circle")
        .attr("cx", x(percentiler.length - 1))
        .attr("cy", y(percentiler[percentiler.length - 1]))
        .attr("r", 2.5)
        .attr("fill", LINJE);

      const focusLine = svg.append("line")
        .attr("y1", 0).attr("y2", height)
        .attr("stroke", LINJE).attr("stroke-width", 0.5)
        .attr("opacity", 0).attr("pointer-events", "none");
      const focusDot = svg.append("circle")
        .attr("r", 3).attr("fill", LINJE).attr("stroke", "#fff").attr("stroke-width", 1.5)
        .attr("opacity", 0).attr("pointer-events", "none");

      const svgEl = ref.current;
      svg.append("rect")
        .attr("width", width).attr("height", height)
        .attr("fill", "none").attr("pointer-events", "all")
        .on("mousemove", (event) => {
          const [mx] = d3.pointer(event);
          const rawIdx = Math.round(((mx - 2) / (width - 4)) * (rankData.length - 1));
          const idx = Math.max(0, Math.min(rankData.length - 1, rawIdx));
          const row = rankData[idx];
          if (!row) return;

          const pct = percentiler[idx];
          focusLine.attr("x1", x(idx)).attr("x2", x(idx)).attr("opacity", 0.2);
          focusDot.attr("cx", x(idx)).attr("cy", y(pct)).attr("opacity", 1);

          const rect = svgEl.getBoundingClientRect();
          const n = row.antal_kommuner ?? 290;
          const label = rankLabel(row.rang_total!, n);
          setTip({
            text: `${row.ar}: ${label} (${row.rang_total}/${n})`,
            x: rect.left + x(idx),
            y: rect.top - 4,
            visible: true,
          });
        })
        .on("mouseleave", () => {
          focusLine.attr("opacity", 0);
          focusDot.attr("opacity", 0);
          setTip((prev) => ({ ...prev, visible: false }));
        });
    } else {
      const valueData = sorted.filter((d) => d.varde != null);
      const values = valueData.map((d) => d.varde!);
      if (values.length < 2) return;

      const x = d3.scaleLinear().domain([0, values.length - 1]).range([2, width - 2]);
      const y = d3.scaleLinear().domain(d3.extent(values) as [number, number]).range([height - 3, 3]);

      const line = d3.line<number>()
        .x((_, i) => x(i))
        .y((d) => y(d))
        .curve(d3.curveMonotoneX);

      svg.append("path")
        .datum(values)
        .attr("d", line)
        .attr("fill", "none")
        .attr("stroke", LINJE)
        .attr("stroke-width", 1.8);

      svg.append("circle")
        .attr("cx", x(values.length - 1))
        .attr("cy", y(values[values.length - 1]))
        .attr("r", 2.5)
        .attr("fill", LINJE);

      const focusLine = svg.append("line")
        .attr("y1", 0).attr("y2", height)
        .attr("stroke", LINJE).attr("stroke-width", 0.5)
        .attr("opacity", 0).attr("pointer-events", "none");
      const focusDot = svg.append("circle")
        .attr("r", 3).attr("fill", LINJE).attr("stroke", "#fff").attr("stroke-width", 1.5)
        .attr("opacity", 0).attr("pointer-events", "none");

      const svgEl = ref.current;
      svg.append("rect")
        .attr("width", width).attr("height", height)
        .attr("fill", "none").attr("pointer-events", "all")
        .on("mousemove", (event) => {
          const [mx] = d3.pointer(event);
          const rawIdx = Math.round(((mx - 2) / (width - 4)) * (values.length - 1));
          const idx = Math.max(0, Math.min(values.length - 1, rawIdx));
          const row = valueData[idx];
          if (!row?.varde) return;

          focusLine.attr("x1", x(idx)).attr("x2", x(idx)).attr("opacity", 0.2);
          focusDot.attr("cx", x(idx)).attr("cy", y(row.varde)).attr("opacity", 1);

          const rect = svgEl.getBoundingClientRect();
          const dec = Math.abs(row.varde) < 10 ? 2 : 1;
          const v = enhet === "antal" ? fmtInt(row.varde) : fmt(row.varde, dec);
          setTip({
            text: `${row.ar}: ${v}`,
            x: rect.left + x(idx),
            y: rect.top - 4,
            visible: true,
          });
        })
        .on("mouseleave", () => {
          focusLine.attr("opacity", 0);
          focusDot.attr("opacity", 0);
          setTip((prev) => ({ ...prev, visible: false }));
        });
    }
  }, [data, width, height, mode, enhet]);

  return (
    <div className="relative" onMouseLeave={hideTip}>
      <svg ref={ref} width={width} height={height} />
      {tip.visible && createPortal(
        <div
          className="fixed -translate-x-1/2 font-data text-[10px] font-semibold
                     bg-white border border-neutral-300 rounded px-1.5 py-0.5 shadow
                     pointer-events-none whitespace-nowrap z-[9999]"
          style={{
            left: tip.x,
            top: tip.y,
            color: LINJE,
            transform: "translate(-50%, -100%)",
          }}
        >
          {tip.text}
        </div>,
        document.body,
      )}
    </div>
  );
}

const Sparkline = memo(SparklineInner, (prev, next) =>
  prev.width === next.width &&
  prev.height === next.height &&
  prev.mode === next.mode &&
  prev.data === next.data
);
export default Sparkline;
