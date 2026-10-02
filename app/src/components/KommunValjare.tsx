import { Fragment } from "react";
import { HALLAND_KOMMUNER } from "../types";

interface Props {
  vald: string;
  onChange: (kod: string) => void;
}

const fokus = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gron-2";

/** Bred skärm: länet + sex kommuner som segment */
export default function KommunValjare({ vald, onChange }: Props) {
  return (
    <div className="flex items-center gap-0.5" role="group" aria-label="Välj län eller kommun">
      {HALLAND_KOMMUNER.map((k, i) => (
        <Fragment key={k.kod}>
          {i === 1 && <span className="w-px h-4 bg-neutral-200 mx-1.5" />}
          <button
            onClick={() => onChange(k.kod)}
            aria-pressed={vald === k.kod}
            className={`px-2.5 py-1.5 text-[13px] rounded-md transition-colors cursor-pointer ${fokus} ${
              vald === k.kod
                ? "bg-neutral-900 text-white font-semibold"
                : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 font-medium"
            }`}
          >
            {k.namn}
          </button>
        </Fragment>
      ))}
    </div>
  );
}

/** Mobil: rullgardin */
export function KommunSelect({ vald, onChange }: Props) {
  return (
    <label className="relative">
      <span className="sr-only">Välj län eller kommun</span>
      <select
        value={vald}
        onChange={(e) => onChange(e.target.value)}
        className={`appearance-none bg-neutral-900 text-white text-[13px] font-semibold
                    pl-3 pr-7 py-1.5 rounded-md cursor-pointer ${fokus}`}
      >
        {HALLAND_KOMMUNER.map((k) => (
          <option key={k.kod} value={k.kod}>{k.namn}</option>
        ))}
      </select>
      <svg className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-white/70"
           width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M2.5 4.5L6 8L9.5 4.5" />
      </svg>
    </label>
  );
}
