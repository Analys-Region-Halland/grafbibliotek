import type { ArtikelMeta } from "../types";
import { TEMA_FARG_KLASSER } from "../teman/tema-config";
import { TEMAN } from "../teman";

function formatDatum(isoDate: string): string {
  const d = new Date(isoDate + "T00:00:00");
  return d.toLocaleDateString("sv-SE", { day: "numeric", month: "short" });
}

interface Props {
  artikel: ArtikelMeta;
  onClick: () => void;
  animDelay?: number;
}

export default function ArtikelKort({ artikel, onClick, animDelay = 0 }: Props) {
  const farg = TEMA_FARG_KLASSER[artikel.temaFarg];
  const temaNamn = artikel.tema
    .map((id) => TEMAN.find((t) => t.temaId === id)?.temaNamn ?? id)
    .join(", ");

  return (
    <button
      onClick={onClick}
      className="group/card text-left w-full bg-white rounded-xl border border-neutral-200/80
                 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)]
                 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer
                 overflow-hidden card-enter
                 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gron-2"
      style={{ animationDelay: `${animDelay}ms` }}
    >
      {/* Färgad toppaccent */}
      <div className={`h-[3px] bg-gradient-to-r ${farg.barTop}`} />

      <div className="p-5 sm:p-6">
        {/* Tema + datum */}
        <div className="flex items-center gap-2 mb-3">
          <span className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider ${farg.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${farg.dot}`} />
            {temaNamn}
          </span>
          <span className="text-neutral-300 text-[10px]">·</span>
          <time className="text-[10px] text-neutral-400 font-medium" dateTime={artikel.datum}>
            {formatDatum(artikel.datum)}
          </time>
        </div>

        {/* Titel */}
        <h3 className="text-[16px] sm:text-[17px] font-bold text-gron-1 leading-snug mb-2
                       group-hover/card:text-gron-2 transition-colors"
            style={{ fontFamily: "'Merriweather', Georgia, serif" }}>
          {artikel.titel}
        </h3>

        {/* Ingress */}
        <p className="text-[13px] text-neutral-500 leading-relaxed line-clamp-3">
          {artikel.ingress}
        </p>

        {/* Läs mer */}
        <span className="inline-block mt-4 text-[11px] font-medium text-gron-2 opacity-60
                        group-hover/card:opacity-100 transition-opacity">
          Läs analys →
        </span>
      </div>
    </button>
  );
}
