import { useEffect, useRef } from "react";
import { TEMAN, TEMA_FARG_HEX } from "../teman";

export type Vy = "nyckeltal" | "analys";

interface Props {
  vy: Vy;
  aktivtTema: string;
  onVy: (vy: Vy) => void;
  onTema: (temaId: string) => void;
}

const fokus = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gron-2";

/** Växel mellan nyckeltal och analys */
function VyVaxel({ vy, onVy, kompakt }: { vy: Vy; onVy: (v: Vy) => void; kompakt?: boolean }) {
  const knapp = (v: Vy, etikett: string) => (
    <button
      onClick={() => onVy(v)}
      aria-pressed={vy === v}
      className={`flex-1 rounded-md ${kompakt ? "px-3 py-1 text-[12px]" : "px-3 py-1.5 text-[12.5px]"}
                  font-medium cursor-pointer transition-colors ${fokus} ${
        vy === v ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-800"
      }`}
    >
      {etikett}
    </button>
  );
  return (
    <div className="flex p-0.5 bg-neutral-100 rounded-lg" role="group" aria-label="Visa">
      {knapp("nyckeltal", "Nyckeltal")}
      {knapp("analys", "Analys")}
    </div>
  );
}

/** Sidomeny för bred skärm: vy + områden */
export function Sidomeny({ vy, aktivtTema, onVy, onTema }: Props) {
  return (
    <nav className="sticky top-[84px] flex flex-col gap-6" aria-label="Områden">
      <VyVaxel vy={vy} onVy={onVy} />
      <div>
        <p className="text-[10.5px] font-semibold tracking-[0.08em] uppercase text-neutral-400 px-3 mb-2">
          Områden
        </p>
        <ul className="flex flex-col gap-px">
          {TEMAN.map((t) => {
            const aktiv = t.temaId === aktivtTema;
            const farg = TEMA_FARG_HEX[t.temaFarg];
            return (
              <li key={t.temaId}>
                <button
                  onClick={() => onTema(t.temaId)}
                  aria-current={aktiv ? "page" : undefined}
                  className={`w-full text-left flex items-center gap-2.5 px-3 py-[7px] rounded-md text-[13px]
                              cursor-pointer transition-colors ${fokus} ${
                    aktiv ? "font-semibold text-neutral-900" : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100"
                  }`}
                  style={aktiv ? { background: farg.ljus } : undefined}
                >
                  <span className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ background: aktiv ? farg.medel : "#C4C7C9" }} />
                  {t.temaNamn}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}

/** Mobil/surfplatta: vyväxel + områden i en horisontellt scrollbar rad */
export function MobilNav({ vy, aktivtTema, onVy, onTema }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  // Håll aktivt tema synligt i raden
  useEffect(() => {
    const el = scrollRef.current?.querySelector<HTMLElement>("[aria-current='page']");
    el?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [aktivtTema]);

  return (
    <div className="flex items-center gap-2 py-2">
      <div className="shrink-0 w-[164px]"><VyVaxel vy={vy} onVy={onVy} kompakt /></div>
      <div ref={scrollRef} className="flex gap-1 overflow-x-auto scrollbar-hide -mr-4 pr-4" aria-label="Områden">
        {TEMAN.map((t) => {
          const aktiv = t.temaId === aktivtTema;
          const farg = TEMA_FARG_HEX[t.temaFarg];
          return (
            <button
              key={t.temaId}
              onClick={() => onTema(t.temaId)}
              aria-current={aktiv ? "page" : undefined}
              className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] whitespace-nowrap
                          cursor-pointer ${fokus} ${aktiv ? "font-semibold text-neutral-900" : "text-neutral-600"}`}
              style={aktiv ? { background: farg.ljus } : undefined}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: aktiv ? farg.medel : "#C4C7C9" }} />
              {t.temaNamn}
            </button>
          );
        })}
      </div>
    </div>
  );
}
