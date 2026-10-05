import { ALLA, HALLAND_KOMMUNER, KOMMUNER_NORR_SODER } from "../types";

interface Props {
  /** Vald enhet: länets eller en kommuns kod, eller ALLA */
  vald: string;
  onChange: (enhet: string) => void;
  /** Adressen för en enhet, så att valen går att öppna i en ny flik */
  href: (enhet: string) => string;
}

const fokus = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gron-2";

/** Länet, kommunerna norr till söder och sist alla sida vid sida */
const VAL = [
  { kod: "0013", namn: "Halland" },
  ...KOMMUNER_NORR_SODER.map((kod) => ({ kod, namn: HALLAND_KOMMUNER.find((k) => k.kod === kod)!.namn })),
  { kod: ALLA, namn: "Alla sida vid sida" },
];

/** Bred skärm: länet och kommunerna som segment, jämförelsen avskild sist */
export default function KommunValjare({ vald, onChange, href }: Props) {
  return (
    <div className="flex items-center gap-0.5" role="group" aria-label="Välj län, kommun eller alla kommuner">
      {VAL.map((v, i) => (
        <span key={v.kod} className="contents">
          {(i === 1 || v.kod === ALLA) && <span className="w-px h-4 bg-neutral-200 mx-1.5" aria-hidden />}
          <a
            href={href(v.kod)}
            onClick={(e) => { e.preventDefault(); onChange(v.kod); }}
            aria-current={vald === v.kod ? "true" : undefined}
            className={`px-2.5 py-1.5 text-[13px] rounded-md whitespace-nowrap transition-colors ${fokus} ${
              vald === v.kod
                ? "bg-neutral-900 text-white font-semibold"
                : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 font-medium"
            }`}
          >
            {v.namn}
          </a>
        </span>
      ))}
    </div>
  );
}

/** Mobil: rullgardin */
export function KommunSelect({ vald, onChange }: Omit<Props, "href">) {
  return (
    <label className="relative">
      <span className="sr-only">Välj län, kommun eller alla kommuner</span>
      <select
        value={vald}
        onChange={(e) => onChange(e.target.value)}
        className={`appearance-none bg-neutral-900 text-white text-[13px] font-semibold
                    pl-3 pr-7 py-1.5 rounded-md cursor-pointer ${fokus}`}
      >
        {VAL.map((v) => (
          <option key={v.kod} value={v.kod}>{v.namn}</option>
        ))}
      </select>
      <svg className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-white/70"
           width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M2.5 4.5L6 8L9.5 4.5" />
      </svg>
    </label>
  );
}
