import { Fragment } from "react";
import { HALLAND_KOMMUNER } from "../types";

interface Props {
  vald: string;
  onChange: (kod: string) => void;
}

export default function KommunValjare({ vald, onChange }: Props) {
  return (
    <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
      {HALLAND_KOMMUNER.map((k, i) => (
        <Fragment key={k.kod}>
          {i === 1 && <span className="w-px h-4 bg-neutral-200 mx-0.5" />}
          <button
            onClick={() => onChange(k.kod)}
            className={`font-data px-2.5 sm:px-3 py-1.5 text-[12px] rounded-lg
                       transition-all duration-150 cursor-pointer
                       focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gron-2 ${
              vald === k.kod
                ? "bg-neutral-900 text-white font-semibold shadow-sm"
                : "text-neutral-600 hover:text-neutral-800 hover:bg-neutral-100 font-medium"
            }`}
          >
            {k.namn}
          </button>
        </Fragment>
      ))}
    </div>
  );
}
