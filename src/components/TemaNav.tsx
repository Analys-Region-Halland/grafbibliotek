import { useRef, useEffect, useCallback } from "react";
import { TEMAN, TEMA_FARG_KLASSER } from "../teman";

interface Props {
  aktivtTema: string;
  onChange: (temaId: string) => void;
}

export default function TemaNav({ aktivtTema, onChange }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const checkOverflow = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    // Scroll-indikation kan läggas till i framtiden
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
          const active = tema.temaId === aktivtTema;
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
      </nav>
    </div>
  );
}
