import { useEffect, useState } from "react";
import { useArtikel } from "../hooks/useArtiklar";
import { TEMA_FARG_KLASSER } from "../teman/tema-config";
import { TEMAN } from "../teman";
import type { ArtikelBlock } from "../types";
import ArtikelGraf from "./ArtikelGraf";

// ─── Inline text-rendering med **fetstil** och *kursiv* ───

function renderInline(text: string) {
  const parts: (string | React.ReactElement)[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    const italicMatch = remaining.match(/\*(.+?)\*/);
    const boldIdx = boldMatch?.index ?? Infinity;
    const italicIdx = italicMatch?.index ?? Infinity;

    if (boldIdx === Infinity && italicIdx === Infinity) {
      parts.push(remaining);
      break;
    }

    if (boldIdx <= italicIdx && boldMatch) {
      if (boldIdx > 0) parts.push(remaining.slice(0, boldIdx));
      parts.push(<strong key={key++} className="font-bold">{boldMatch[1]}</strong>);
      remaining = remaining.slice(boldIdx + boldMatch[0].length);
    } else if (italicMatch) {
      const idx = italicMatch.index!;
      if (idx > 0) parts.push(remaining.slice(0, idx));
      parts.push(<em key={key++} className="italic">{italicMatch[1]}</em>);
      remaining = remaining.slice(idx + italicMatch[0].length);
    }
  }

  return parts;
}

// ─── Block-renderare ───

function TextBlock({ innehall }: { innehall: string }) {
  return (
    <p className="artikel-body mb-7">
      {renderInline(innehall)}
    </p>
  );
}

function RubrikBlock({ innehall, niva }: { innehall: string; niva: 2 | 3 }) {
  if (niva === 2) {
    return (
      <h2 className="artikel-h2 mt-14 mb-4">
        {innehall}
      </h2>
    );
  }
  return (
    <h3 className="artikel-h3 mt-10 mb-3">
      {innehall}
    </h3>
  );
}

function CitatBlock({ innehall, kalla }: { innehall: string; kalla?: string }) {
  return (
    <blockquote className="artikel-kolumn my-10">
      <div className="border-l-[3px] border-gron-2 pl-6 py-2">
        <p className="text-[18px] sm:text-[19px] leading-[1.65] text-gron-1 italic"
           style={{ fontFamily: "'Merriweather', Georgia, serif", fontWeight: 300 }}>
          "{renderInline(innehall)}"
        </p>
        {kalla && (
          <cite className="block mt-3 text-[12px] text-neutral-500 not-italic font-medium tracking-wide uppercase"
                style={{ fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}>
            {kalla}
          </cite>
        )}
      </div>
    </blockquote>
  );
}

function FaktaBlock({ titel, innehall }: { titel: string; innehall: string }) {
  return (
    <div className="artikel-kolumn my-10">
      <div className="bg-gradient-to-br from-gron-4/80 to-gron-4/30 border border-gron-3/40 rounded-xl p-6 sm:p-7">
        <p className="text-[10px] font-bold text-gron-2 mb-3 uppercase tracking-[0.12em]"
           style={{ fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}>
          {titel}
        </p>
        <p className="text-[15px] leading-[1.7] text-gron-1"
           style={{ fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}>
          {renderInline(innehall)}
        </p>
      </div>
    </div>
  );
}

function renderBlock(block: ArtikelBlock, index: number) {
  switch (block.typ) {
    case "text":
      return <TextBlock key={index} innehall={block.innehall} />;
    case "rubrik":
      return <RubrikBlock key={index} innehall={block.innehall} niva={block.niva} />;
    case "citat":
      return <CitatBlock key={index} innehall={block.innehall} kalla={block.kalla} />;
    case "graf":
      return <ArtikelGraf key={index} config={block.config} />;
    case "fakta":
      return <FaktaBlock key={index} titel={block.titel} innehall={block.innehall} />;
    default:
      return null;
  }
}

// ─── Datumformatering ───

function formatDatum(isoDate: string): string {
  const d = new Date(isoDate + "T00:00:00");
  return d.toLocaleDateString("sv-SE", { day: "numeric", month: "long", year: "numeric" });
}

// ─── Huvudkomponent ───

interface Props {
  slug: string;
  onBack: () => void;
}

export default function ArtikelVy({ slug, onBack }: Props) {
  const { artikel, loading, error } = useArtikel(slug);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [slug]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3 artikel-fade-in">
        <div className="h-5 w-5 border-2 border-neutral-200 border-t-neutral-500 rounded-full animate-spin" />
        <p className="text-neutral-400 text-[12px]">Laddar artikel…</p>
      </div>
    );
  }

  if (error || !artikel) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4 artikel-fade-in">
        <p className="text-neutral-500 text-sm">{error ?? "Artikeln hittades inte."}</p>
        <button
          onClick={onBack}
          className="text-[12px] text-gron-2 underline hover:no-underline cursor-pointer"
        >
          Tillbaka till analys
        </button>
      </div>
    );
  }

  const farg = TEMA_FARG_KLASSER[artikel.temaFarg];
  const temaNamn = artikel.tema
    .map((id) => TEMAN.find((t) => t.temaId === id)?.temaNamn ?? id)
    .join(", ");

  const handleCopy = () => {
    navigator.clipboard.writeText(window.location.href).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <article className="artikel-fade-in">
      {/* Vit bakgrundspanel */}
      <div className="bg-white -mx-4 sm:-mx-6 sm:mx-auto sm:max-w-[960px] sm:rounded-2xl
                      sm:border sm:border-neutral-200/50 sm:shadow-[0_4px_40px_rgba(0,0,0,0.04)]
                      pb-16 sm:pb-20 mb-8">

        {/* Färgad toppaccent */}
        <div className={`h-[3px] sm:rounded-t-2xl bg-gradient-to-r ${farg.barTop}`} />

        {/* Tillbaka-knapp */}
        <div className="px-5 sm:px-10 pt-5 pb-2">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-[11px] text-neutral-400 hover:text-neutral-700
                       font-medium transition-colors cursor-pointer py-1 tracking-wide uppercase"
            style={{ fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Tillbaka
          </button>
        </div>

        {/* Header */}
        <header className="artikel-kolumn mb-12 sm:mb-16 pt-4">
          {/* Tema-badge + datum */}
          <div className="flex items-center gap-3 mb-6">
            <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] ${farg.text}`}>
              <span className={`w-2 h-2 rounded-full ${farg.dot}`} />
              {temaNamn}
            </span>
            <span className="text-neutral-200">|</span>
            <time className="text-[11px] text-neutral-400 font-medium tracking-wide" dateTime={artikel.datum}
                  style={{ fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}>
              {formatDatum(artikel.datum)}
            </time>
          </div>

          {/* Titel */}
          <h1 className="artikel-titel mb-6">
            {artikel.titel}
          </h1>

          {/* Ingress */}
          <p className="text-[17px] sm:text-[19px] leading-[1.65] text-neutral-600"
             style={{ fontFamily: "'Merriweather', Georgia, serif", fontWeight: 300 }}>
            {artikel.ingress}
          </p>

          {/* Divider + författare */}
          <div className="mt-10 flex items-center gap-4">
            <div className={`h-[2px] w-12 rounded-full ${farg.dot}`} />
            {artikel.forfattare && (
              <div className="flex flex-col gap-0.5" style={{ fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}>
                <span className="text-[11px] text-neutral-500 font-semibold tracking-wide">
                  {artikel.forfattare}
                </span>
                {artikel.epost && (
                  <a href={`mailto:${artikel.epost}`}
                     className="text-[11px] text-neutral-400 hover:text-gron-2 transition-colors">
                    {artikel.epost}
                  </a>
                )}
              </div>
            )}
          </div>
        </header>

        {/* Artikel-block */}
        <div className="artikel-text">
          {artikel.block.map((block, i) => renderBlock(block, i))}
        </div>

        {/* Footer — dela */}
        <footer className="artikel-kolumn mt-16 pt-8 border-t border-neutral-100">
          <div className="flex items-center justify-between">
            <button
              onClick={onBack}
              className="text-[12px] text-neutral-400 hover:text-neutral-700 font-medium transition-colors cursor-pointer"
              style={{ fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}
            >
              ← Fler analyser
            </button>
            <button
              onClick={handleCopy}
              className={`inline-flex items-center gap-1.5 text-[12px] font-medium transition-all cursor-pointer px-4 py-2
                         rounded-full border ${
                           copied
                             ? "bg-gron-2 text-white border-gron-2"
                             : "text-gron-2 border-gron-3/60 hover:border-gron-2/40 hover:bg-gron-4/40"
                         }`}
              style={{ fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}
            >
              {copied ? (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                       strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Kopierad
                </>
              ) : (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                       strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                  </svg>
                  Dela artikel
                </>
              )}
            </button>
          </div>
        </footer>
      </div>
    </article>
  );
}
