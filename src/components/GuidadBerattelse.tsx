import React, { useState, useEffect, useCallback, useMemo } from "react";
import * as d3 from "d3";
import type { KpiRow, KpiMeta } from "../types";
import Beeswarm from "../charts/Beeswarm";
import { fmtInt, fmt } from "../utils/format";
import { useContainerWidth } from "../hooks/useContainerWidth";

interface SlideConfig {
  kpiId: string;
  titel: string;
  undertitel: (ar: number) => string;
  enhet: string;
  useLog: boolean;
  berattelse: (ctx: NarrativeCtx) => string;
}

/** Markera kommunnamn i grönt i en textsträng */
function highlightKommun(text: string, namn: string): React.ReactNode {
  if (!namn || !text.includes(namn)) return text;
  const parts = text.split(namn);
  return parts.map((part, i) => (
    <span key={i}>
      {part}
      {i < parts.length - 1 && (
        <span className="text-white font-semibold">{namn}</span>
      )}
    </span>
  ));
}

interface NarrativeCtx {
  kommunNamn: string;
  value: number | null;
  rang: number | null;
  total: number;
  median: number | null;
  riket: number | null;
  min: { namn: string; value: number } | null;
  max: { namn: string; value: number } | null;
}

const SLIDES: SlideConfig[] = [
  {
    kpiId: "N01951",
    titel: "Var finns människorna?",
    undertitel: (ar) => `Folkmängd per kommun · ${ar}`,
    enhet: "antal",
    useLog: true,
    berattelse: ({ kommunNamn, value, rang, total, min, max }) => {
      if (value == null || rang == null) return "";
      const pos = rang <= total * 0.1
        ? `bland de tio procent största`
        : rang <= total * 0.25
        ? `bland den övre fjärdedelen`
        : rang <= total * 0.5
        ? `i den övre halvan`
        : rang <= total * 0.75
        ? `i den undre halvan`
        : `bland de minsta fjärdedelen`;
      const spread = min && max
        ? ` Spridningen är enorm — från ${min.namn} med ${fmtInt(min.value)} invånare till ${max.namn} med drygt ${fmtInt(max.value)}.`
        : "";
      return `Med ${fmtInt(value)} invånare placerar sig ${kommunNamn} ${pos} av Sveriges ${total} kommuner.${spread}`;
    },
  },
  {
    kpiId: "N02937",
    titel: "Hur tätt bor vi?",
    undertitel: (ar) => `Invånare per kvadratkilometer · ${ar}`,
    enhet: "inv/kvm",
    useLog: true,
    berattelse: ({ kommunNamn, value, rang, total, median, riket }) => {
      if (value == null) return "";
      const valFmt = fmt(value, 1);
      const rel = median != null
        ? value > median * 1.5
          ? `betydligt tätare än mediankommunens ${fmt(median, 1)}`
          : value > median
          ? `något tätare än mediankommunens ${fmt(median, 1)}`
          : value > median * 0.5
          ? `något glesare än mediankommunens ${fmt(median, 1)}`
          : `betydligt glesare än mediankommunens ${fmt(median, 1)}`
        : "";
      const riksText = riket != null ? ` Rikssnittet ligger på ${fmt(riket, 1)} invånare per km².` : "";
      const rangText = rang != null ? ` Det ger plats ${rang} av ${total}.` : "";
      return `I ${kommunNamn} bor det ${valFmt} invånare per kvadratkilometer — ${rel}.${riksText}${rangText}`;
    },
  },
];

interface Props {
  kommunKod: string;
  kommunNamn: string;
  isRegion: boolean;
  allData: KpiRow[];
  allMeta: KpiMeta[];
  onClose: () => void;
}

export default function GuidadBerattelse({
  kommunKod, kommunNamn, isRegion, allData, onClose,
}: Props) {
  const [slideIdx, setSlideIdx] = useState(0);
  const [textVisible, setTextVisible] = useState(true);
  const slide = SLIDES[slideIdx];

  // Mät Beeswarm-containerns bredd
  const [beeRef, beeWidth] = useContainerWidth();

  // Tangentbordsnavigering
  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") onClose();
    if (e.key === "ArrowRight" || e.key === " ") {
      e.preventDefault();
      setSlideIdx((i) => Math.min(i + 1, SLIDES.length - 1));
    }
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      setSlideIdx((i) => Math.max(i - 1, 0));
    }
  }, [onClose]);

  useEffect(() => {
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [handleKey]);

  // Textövergång vid slidebyte
  useEffect(() => {
    setTextVisible(false);
    const timer = setTimeout(() => setTextVisible(true), 150);
    return () => clearTimeout(timer);
  }, [slideIdx]);

  // Beräkna kontextdata för narrativet
  const narrativeCtx = useMemo((): NarrativeCtx => {
    const jmfTyp = isRegion ? "L" : "K";
    const latestYear = d3.max(
      allData.filter((d) => d.kpi_id === slide.kpiId && d.kommun_typ === jmfTyp),
      (d) => d.ar
    ) ?? 0;

    const rows = allData.filter(
      (d) => d.kpi_id === slide.kpiId && d.ar === latestYear && d.kommun_typ === jmfTyp && d.varde != null
    );
    const vals = rows.map((d) => d.varde!).sort((a, b) => a - b);
    const kommunRow = rows.find((d) => d.kommun_kod === kommunKod);
    const riketRow = allData.find(
      (d) => d.kpi_id === slide.kpiId && d.ar === latestYear && d.kommun_kod === "0000" && d.varde != null
    );

    let rang: number | null = null;
    if (kommunRow?.varde != null) {
      rang = rows.filter((d) => d.varde! > kommunRow.varde!).length + 1;
    }

    const sorted = [...rows].sort((a, b) => a.varde! - b.varde!);
    const minRow = sorted[0];
    const maxRow = sorted[sorted.length - 1];

    return {
      kommunNamn,
      value: kommunRow?.varde ?? null,
      rang,
      total: rows.length,
      median: vals.length > 0 ? d3.median(vals)! : null,
      riket: riketRow?.varde ?? null,
      min: minRow ? { namn: minRow.kommun_namn, value: minRow.varde! } : null,
      max: maxRow ? { namn: maxRow.kommun_namn, value: maxRow.varde! } : null,
    };
  }, [allData, slide.kpiId, kommunKod, kommunNamn, isRegion]);

  const latestYear = useMemo(() => {
    const jmfTyp = isRegion ? "L" : "K";
    return d3.max(
      allData.filter((d) => d.kpi_id === slide.kpiId && d.kommun_typ === jmfTyp),
      (d) => d.ar
    ) ?? 0;
  }, [allData, slide.kpiId, isRegion]);

  // Responsiv Beeswarm-storlek
  const effectiveBeeWidth = Math.min(beeWidth, 740);
  const beeHeight = beeWidth < 500 ? 180 : 220;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-[3px]"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full h-full rounded-none
                   sm:rounded-2xl sm:shadow-2xl sm:max-w-[780px] sm:w-[92vw] sm:max-h-[90vh] sm:h-auto
                   overflow-y-auto border-0 sm:border sm:border-white/[0.08]"
        style={{ background: "#00392B" }}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-4 sm:px-7 pt-4 sm:pt-5 pb-1">
          <div className="flex items-center gap-4">
            <img src={`${import.meta.env.BASE_URL}logo_vit.svg`} alt="Region Halland"
                 className="h-7 opacity-70 hidden sm:block" />
            <div className="sm:border-l sm:border-white/15 sm:pl-4">
              <p className="text-[10px] uppercase tracking-[0.2em] text-white/50 font-medium">
                Guidad berättelse
              </p>
              <p className="text-[12px] text-white/60 mt-0.5">
                Befolkning & demografi · <span className="text-white font-semibold">{kommunNamn}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-lg bg-white/8 hover:bg-white/15 flex items-center justify-center
                       text-white/50 hover:text-white/80 transition-all cursor-pointer"
            aria-label="Stäng"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* ── Titel + berättelse (ovanför grafen) ── */}
        <div className="px-4 sm:px-7 pt-3 pb-1">
          <div
            className="transition-all duration-500 ease-out"
            style={{ opacity: textVisible ? 1 : 0, transform: textVisible ? "translateY(0)" : "translateY(6px)" }}
          >
            <h2 className="text-[22px] sm:text-[28px] font-bold text-white tracking-tight leading-tight">
              {slide.titel}
            </h2>
            <p className="text-[13px] text-white/55 mt-1">
              {slide.undertitel(latestYear)}
            </p>
            <p className="text-[14px] leading-relaxed text-white/90 mt-3 max-w-2xl">
              {highlightKommun(slide.berattelse(narrativeCtx), kommunNamn)}
            </p>
          </div>
        </div>

        {/* ── Beeswarm ── */}
        <div className="px-2 sm:px-3 flex justify-center" ref={beeRef}>
          {beeWidth > 0 && (
            <Beeswarm
              allData={allData}
              kpiId={slide.kpiId}
              enhet={slide.enhet}
              valdKommunKod={kommunKod}
              valdKommunNamn={kommunNamn}
              isRegion={isRegion}
              width={effectiveBeeWidth}
              height={beeHeight}
              useLog={slide.useLog}
              animate={true}
            />
          )}
        </div>

        {/* ── Navigation ── */}
        <div className="px-4 sm:px-7 pb-4 pt-0 flex items-center justify-between">
          <button
            onClick={() => setSlideIdx((i) => Math.max(i - 1, 0))}
            disabled={slideIdx === 0}
            className="flex items-center gap-2 text-[12px] text-white/45 hover:text-white/75
                       disabled:opacity-20 disabled:cursor-default transition-colors cursor-pointer"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Föregående
          </button>

          <div className="flex items-center gap-2">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                onClick={() => setSlideIdx(i)}
                className={`transition-all duration-300 rounded-full cursor-pointer ${
                  i === slideIdx
                    ? "w-5 h-1.5 bg-white/80"
                    : "w-1.5 h-1.5 bg-white/25 hover:bg-white/45"
                }`}
              />
            ))}
          </div>

          <button
            onClick={() => {
              if (slideIdx === SLIDES.length - 1) onClose();
              else setSlideIdx((i) => i + 1);
            }}
            className="flex items-center gap-2 text-[12px] text-white/45 hover:text-white/75
                       transition-colors cursor-pointer"
          >
            {slideIdx === SLIDES.length - 1 ? "Stäng" : "Nästa"}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {slideIdx === SLIDES.length - 1
                ? <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>
                : <polyline points="9 18 15 12 9 6" />
              }
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
