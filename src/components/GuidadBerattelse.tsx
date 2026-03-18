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
    titel: "Folkmängd",
    undertitel: (ar) => `Antal invånare · ${ar}`,
    enhet: "antal",
    useLog: true,
    berattelse: ({ kommunNamn, value, rang, total }) => {
      if (value == null || rang == null) return "";
      return `${kommunNamn} har ${fmtInt(value)} invånare — plats ${rang} av ${total} kommuner.`;
    },
  },
  {
    kpiId: "N01963",
    titel: "Befolkningsförändring",
    undertitel: (ar) => `Förändring sedan föregående år, procent · ${ar}`,
    enhet: "procent",
    useLog: false,
    berattelse: ({ kommunNamn, value, riket }) => {
      if (value == null) return "";
      const riktning = value > 0 ? "växer" : value < 0 ? "krymper" : "är oförändrad";
      const riketText = riket != null ? ` Rikssnittet är ${fmt(riket, 1)} procent.` : "";
      return `${kommunNamn} ${riktning} med ${fmt(Math.abs(value), 1)} procent.${riketText} Förändringen drivs av tre komponenter: födelsenetto, inrikes och utrikes flyttnetto.`;
    },
  },
  {
    kpiId: "N02100",
    titel: "Födelsenetto",
    undertitel: (ar) => `Födda minus döda, per 1 000 invånare · ${ar}`,
    enhet: "procent",
    useLog: false,
    berattelse: ({ kommunNamn, value, median }) => {
      if (value == null) return "";
      const netto = value > 0 ? "födelseöverskott" : value < 0 ? "födelseunderskott" : "balans mellan födda och döda";
      const medText = median != null ? ` Mediankommunen ligger på ${fmt(median, 1)}.` : "";
      return `${kommunNamn} har ${netto} — ${fmt(value, 1)} per 1 000 invånare.${medText}`;
    },
  },
  {
    kpiId: "N02101",
    titel: "Inrikes flyttnetto",
    undertitel: (ar) => `Inflyttade minus utflyttade inom Sverige, per 1 000 invånare · ${ar}`,
    enhet: "procent",
    useLog: false,
    berattelse: ({ kommunNamn, value, median }) => {
      if (value == null) return "";
      const netto = value > 0 ? "fler som flyttar in än ut" : value < 0 ? "fler som flyttar ut än in" : "balans i inrikes flyttningar";
      const medText = median != null ? ` Mediankommunen ligger på ${fmt(median, 1)}.` : "";
      return `${kommunNamn} har ${netto} inom Sverige — nettot är ${fmt(value, 1)} per 1 000 invånare.${medText}`;
    },
  },
  {
    kpiId: "N02102",
    titel: "Utrikes flyttnetto",
    undertitel: (ar) => `Invandring minus utvandring, per 1 000 invånare · ${ar}`,
    enhet: "procent",
    useLog: false,
    berattelse: ({ kommunNamn, value, median, riket }) => {
      if (value == null) return "";
      const riketText = riket != null ? ` Rikssnittet är ${fmt(riket, 1)}.` : "";
      const medText = median != null ? ` Mediankommunen ligger på ${fmt(median, 1)}.` : "";
      return `${kommunNamn} har ett utrikes flyttnetto på ${fmt(value, 1)} per 1 000 invånare.${riketText}${medText}`;
    },
  },
  {
    kpiId: "N00927",
    titel: "Försörjningskvot",
    undertitel: (ar) => `Unga och äldre per person i arbetsför ålder · ${ar}`,
    enhet: "kvot",
    useLog: false,
    berattelse: ({ kommunNamn, value, rang, total, riket }) => {
      if (value == null) return "";
      const riketText = riket != null ? ` Rikssnittet är ${fmt(riket, 1)}.` : "";
      const rangText = rang != null ? ` Plats ${rang} av ${total}.` : "";
      return `Försörjningskvoten i ${kommunNamn} är ${fmt(value, 1)} — det antal unga (0–19) och äldre (65+) per person i arbetsför ålder (20–64).${riketText}${rangText}`;
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
