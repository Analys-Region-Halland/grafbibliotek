import { useState, useEffect, useMemo } from "react";
import type { LoggPost } from "../types";
import { useArtiklar } from "../hooks/useArtiklar";
import { TEMAN, TEMA_FARG_KLASSER } from "../teman";
import ArtikelKort from "./ArtikelKort";

// ─── Uppdateringslogg ───

function useLogg() {
  const [logg, setLogg] = useState<LoggPost[]>([]);
  useEffect(() => {
    const base = import.meta.env.BASE_URL;
    fetch(`${base}data/uppdateringslogg.json`)
      .then((r) => r.ok ? r.json() : [])
      .then((data: unknown) => setLogg(data as LoggPost[]))
      .catch(() => {});
  }, []);
  return logg;
}

function loggIkon(typ: LoggPost["typ"]) {
  switch (typ) {
    case "artikel":
      return (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gron-2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
      );
    case "data":
      return (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-bla-2">
          <ellipse cx="12" cy="5" rx="9" ry="3" />
          <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
          <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
        </svg>
      );
    case "funktion":
      return (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-lila-2">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      );
  }
}

function formatDatumKort(isoDate: string): string {
  const d = new Date(isoDate + "T00:00:00");
  return d.toLocaleDateString("sv-SE", { day: "numeric", month: "short" });
}

// ─── Temafilter-chips ───

function TemaChips({
  aktivt,
  onChange,
  temaIds,
}: {
  aktivt: string | null;
  onChange: (id: string | null) => void;
  temaIds: Set<string>;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <button
        onClick={() => onChange(null)}
        className={`text-[11px] font-medium px-3 py-1.5 rounded-full border transition-all cursor-pointer
                   focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gron-2 ${
          aktivt === null
            ? "bg-gron-1 text-white border-gron-1"
            : "bg-white text-neutral-500 border-neutral-200 hover:border-neutral-400"
        }`}
      >
        Alla
      </button>
      {TEMAN.filter((t) => temaIds.has(t.temaId)).map((tema) => {
        const active = aktivt === tema.temaId;
        const farg = TEMA_FARG_KLASSER[tema.temaFarg];
        return (
          <button
            key={tema.temaId}
            onClick={() => onChange(active ? null : tema.temaId)}
            className={`text-[11px] font-medium px-3 py-1.5 rounded-full border transition-all cursor-pointer
                       focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gron-2 ${
              active
                ? `${farg.pillBg} ${farg.pillText} border-transparent font-semibold`
                : "bg-white text-neutral-500 border-neutral-200 hover:border-neutral-400"
            }`}
          >
            {tema.temaNamn}
          </button>
        );
      })}
    </div>
  );
}

// ─── Huvudkomponent ───

interface Props {
  onOpenArtikel: (slug: string) => void;
}

export default function AnalysFeed({ onOpenArtikel }: Props) {
  const { artiklar, loading } = useArtiklar();
  const logg = useLogg();
  const [temaFilter, setTemaFilter] = useState<string | null>(null);

  const sorterade = useMemo(
    () => [...artiklar].sort((a, b) => b.datum.localeCompare(a.datum)),
    [artiklar],
  );

  const temaIds = useMemo(() => {
    const ids = new Set<string>();
    for (const a of artiklar) for (const t of a.tema) ids.add(t);
    return ids;
  }, [artiklar]);

  const filtrerade = useMemo(
    () => temaFilter
      ? sorterade.filter((a) => a.tema.includes(temaFilter))
      : sorterade,
    [sorterade, temaFilter],
  );

  const senasteLogg = useMemo(
    () => [...logg].sort((a, b) => b.datum.localeCompare(a.datum)).slice(0, 5),
    [logg],
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 artikel-fade-in">
        <div className="h-5 w-5 border-2 border-neutral-200 border-t-neutral-500 rounded-full animate-spin" />
        <p className="text-neutral-400 text-[12px]">Laddar…</p>
      </div>
    );
  }

  return (
    <div className="artikel-fade-in max-w-[860px] mx-auto">

      {/* ── Intro ── */}
      <header className="mb-14 sm:mb-16">
        <h2 className="text-[28px] sm:text-[34px] font-bold text-gron-1 tracking-tight leading-[1.15] mb-5"
            style={{ fontFamily: "'Merriweather', Georgia, serif" }}>
          Analys
        </h2>
        <div className="max-w-[640px]">
          <p className="text-[15px] sm:text-[16px] leading-[1.75] text-neutral-600 mb-4"
             style={{ fontFamily: "'Merriweather', Georgia, serif", fontWeight: 300 }}>
            Siffror berättar sällan hela historien. I dessa artiklar sätter vi Hallands statistik
            i sammanhang — jämför med relevanta regioner, lyfter mönster som inte syns i
            tabellerna och resonerar kring vad förändringarna kan betyda.
          </p>
          <p className="text-[14px] sm:text-[15px] leading-[1.75] text-neutral-500"
             style={{ fontFamily: "'Merriweather', Georgia, serif", fontWeight: 300 }}>
            Artiklarna är tänkta som en ingång till att själv arbeta med datan. Varje graf
            är fullt interaktiv — byt kommun, lägg till jämförelser, testa andra perspektiv.
            Tanken är inte att ge färdiga svar utan att visa hur man kan ställa frågor till
            statistiken och vad det innebär att sätta sin geografi i ett sammanhang.
          </p>
        </div>
      </header>

      {/* ── Artiklar ── */}
      <section>
        {/* Filter + rubrik */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <h3 className="text-[11px] font-bold text-neutral-400 uppercase tracking-[0.1em]"
              style={{ fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}>
            Publicerat
          </h3>
          {temaIds.size > 1 && (
            <TemaChips aktivt={temaFilter} onChange={setTemaFilter} temaIds={temaIds} />
          )}
        </div>

        {filtrerade.length === 0 ? (
          <p className="text-[14px] text-neutral-400 text-center py-16"
             style={{ fontFamily: "'Merriweather', Georgia, serif", fontWeight: 300 }}>
            {artiklar.length === 0
              ? "Första analysen är på väg."
              : "Inga analyser matchar filtret."}
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {filtrerade.map((artikel, i) => (
              <ArtikelKort
                key={artikel.slug}
                artikel={artikel}
                onClick={() => onOpenArtikel(artikel.slug)}
                animDelay={i * 60}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── Senaste uppdateringar ── */}
      {senasteLogg.length > 0 && (
        <section className="mt-16 pt-10 border-t border-neutral-200/60">
          <h3 className="text-[11px] font-bold text-neutral-400 uppercase tracking-[0.1em] mb-4"
              style={{ fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}>
            Senaste nytt
          </h3>
          <div className="space-y-0 divide-y divide-neutral-100">
            {senasteLogg.map((post, i) => (
              <div
                key={i}
                className={`flex items-start gap-3 py-3 ${
                  post.artikelSlug ? "hover:bg-neutral-50/50 -mx-3 px-3 rounded-lg cursor-pointer transition-colors" : ""
                }`}
                onClick={post.artikelSlug ? () => onOpenArtikel(post.artikelSlug!) : undefined}
              >
                <span className="mt-0.5 shrink-0">{loggIkon(post.typ)}</span>
                <div className="min-w-0 flex-1">
                  <span className="text-[12px] font-medium text-neutral-700">{post.titel}</span>
                  {post.beskrivning && (
                    <span className="text-[11px] text-neutral-400 ml-1.5">— {post.beskrivning}</span>
                  )}
                </div>
                <time className="text-[10px] text-neutral-400 shrink-0 mt-0.5 tabular-nums" dateTime={post.datum}>
                  {formatDatumKort(post.datum)}
                </time>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
