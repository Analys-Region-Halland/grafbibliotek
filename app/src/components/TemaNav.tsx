import { useRef, useEffect, useCallback } from "react";
import { TEMAN, TEMA_FARG_KLASSER } from "../teman";

interface Props {
  aktivtTema: string;
  onChange: (temaId: string) => void;
  onAnalysClick?: () => void;
  isAnalysActive?: boolean;
}

export default function TemaNav({ aktivtTema, onChange, onAnalysClick, isAnalysActive }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const checkOverflow = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    void (el.scrollLeft > 2);
    void (el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkOverflow();
    el.addEventListener("scroll", checkOverflow, { passive: true });
    window.addEventListener("resize", checkOverflow);
    return () => {
      el.removeEventListener("scroll", checkOverflow);
      window.removeEventListener("resize", checkOverflow);
    };
  }, [checkOverflow]);

  return (
    <div className="relative">
      <nav
        ref={scrollRef}
        className="flex flex-wrap items-center gap-1 -mx-4 sm:-mx-6 px-4 sm:px-6"
        aria-label="Temanavigation"
      >
        {TEMAN.map((tema) => {
          const active = !isAnalysActive && tema.temaId === aktivtTema;
          const farg = TEMA_FARG_KLASSER[tema.temaFarg];
          return (
            <button
              key={tema.temaId}
              onClick={() => onChange(tema.temaId)}
              className={`font-data flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px]
                         whitespace-nowrap transition-all duration-150 cursor-pointer
                         focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gron-2 ${
                active
                  ? `${farg.pillBg} ${farg.pillText} font-semibold`
                  : "text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 font-medium"
              }`}
            >
              <div className={`w-1.5 h-1.5 rounded-full shrink-0 transition-colors ${
                active ? farg.dot : "bg-neutral-300"
              }`} />
              {tema.temaNamn}
            </button>
          );
        })}

        {/* Separator + Analys-knapp */}
        {onAnalysClick && (
          <>
            <div className="w-px h-4 bg-neutral-200 mx-1 shrink-0" />
            <button
              onClick={onAnalysClick}
              className={`font-data flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px]
                         whitespace-nowrap transition-all duration-150 cursor-pointer
                         focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gron-2 ${
                isAnalysActive
                  ? "bg-bla-4 text-bla-1 font-semibold"
                  : "text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 font-medium"
              }`}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                   className={`shrink-0 ${isAnalysActive ? "text-bla-2" : "text-neutral-400"}`}>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
              Analys
            </button>
          </>
        )}
      </nav>
    </div>
  );
}
