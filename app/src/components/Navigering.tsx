import { useEffect, useRef } from "react";
import { TEMAN, TEMA_FARG_HEX } from "../teman";

interface Props {
  /** Aktivt område */
  aktiv: string;
  /** Adressen till ett område för den valda enheten */
  href: (temaId: string) => string;
}

const fokus = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gron-2";

/** Sidomeny för bred skärm: områdena */
export function Sidomeny({ aktiv, href }: Props) {
  return (
    <nav className="sticky top-[84px]" aria-label="Områden">
      <p className="text-[10.5px] font-semibold tracking-[0.08em] uppercase text-neutral-400 px-3 mb-2">
        Områden
      </p>
      <ul className="flex flex-col gap-px">
        {TEMAN.map((t) => {
          const ar = t.temaId === aktiv;
          const farg = TEMA_FARG_HEX[t.temaFarg];
          return (
            <li key={t.temaId}>
              <a
                href={href(t.temaId)}
                aria-current={ar ? "page" : undefined}
                className={`w-full flex items-center gap-2.5 px-3 py-[7px] rounded-md text-[13px] transition-colors ${fokus} ${
                  ar ? "font-semibold text-neutral-900" : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100"
                }`}
                style={ar ? { background: farg.ljus } : undefined}
              >
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: ar ? farg.medel : "#C4C7C9" }} />
                {t.temaNamn}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Mobil och surfplatta: områdena i en vågrätt rullbar rad */
export function MobilNav({ aktiv, href }: Props) {
  const scrollRef = useRef<HTMLElement>(null);
  // Håll aktivt område synligt i raden
  useEffect(() => {
    const el = scrollRef.current?.querySelector<HTMLElement>("[aria-current='page']");
    el?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [aktiv]);

  return (
    <nav ref={scrollRef} className="flex gap-1 overflow-x-auto scrollbar-hide py-2 -mr-4 pr-4" aria-label="Områden">
      {TEMAN.map((t) => {
        const ar = t.temaId === aktiv;
        const farg = TEMA_FARG_HEX[t.temaFarg];
        return (
          <a
            key={t.temaId}
            href={href(t.temaId)}
            aria-current={ar ? "page" : undefined}
            className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] whitespace-nowrap ${fokus} ${
              ar ? "font-semibold text-neutral-900" : "text-neutral-600"
            }`}
            style={ar ? { background: farg.ljus } : undefined}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: ar ? farg.medel : "#C4C7C9" }} />
            {t.temaNamn}
          </a>
        );
      })}
    </nav>
  );
}
