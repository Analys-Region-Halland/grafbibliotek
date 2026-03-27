/**
 * JamforPanel — Jämförelsepanel med två tydliga sektioner:
 *
 *   1. STATISTISKA SNITT — checkbox-rader med streckad linje-preview
 *   2. JÄMFÖR — grupppills + sökbar kommun/region-lista
 */

import { useState, useMemo } from "react";
import type { KommunEntry } from "../types";
import { HALLAND_KODER } from "../types";
import type { KommunGruppData } from "./ControlDrawer";
import type { JamforState, JamforAction } from "../hooks/useJamfor";
import { fmt } from "../utils/format";

// ─── Konstanter & hjälp ───

const SYDVASTSVERIGE_KODER = ["0013", "0014", "0006", "0007", "0008", "0010", "0012"];

function fmtKort(v: number | null, enhet: string): string {
  if (v == null) return "–";
  if (enhet === "antal") return fmt(v, 0);
  return fmt(v, Math.abs(v) >= 100 ? 0 : Math.abs(v) < 10 ? 2 : 1);
}

function getGroupKoder(
  groupId: string, kommunKod: string, kommunRegister: KommunEntry[],
  kommunGrupper: KommunGruppData | null, isRegion: boolean,
): string[] {
  switch (groupId) {
    case "halland": return HALLAND_KODER.filter((k) => k !== kommunKod);
    case "sydvastsverige": return SYDVASTSVERIGE_KODER.filter((k) => k !== kommunKod);
    case "kommungrupp": {
      if (!kommunGrupper) return [];
      const gk = kommunGrupper.kommuner[kommunKod];
      if (!gk) return [];
      return Object.entries(kommunGrupper.kommuner)
        .filter(([k, g]) => g === gk && k !== kommunKod).map(([k]) => k);
    }
    case "alla":
      return kommunRegister
        .filter((k) => k.t === (isRegion ? "L" : "K") && k.k !== "0000" && k.k !== kommunKod)
        .map((k) => k.k);
    default: return [];
  }
}

function groupLabel(
  groupId: string, isRegion: boolean,
  kommunGrupper: KommunGruppData | null, kommunKod: string,
): string {
  switch (groupId) {
    case "halland": return "Hallands kommuner";
    case "sydvastsverige": return "Sydvästsverige";
    case "alla": return isRegion ? "Alla regioner" : "Alla kommuner";
    case "kommungrupp": {
      if (!kommunGrupper) return "Liknande kommuner";
      const gk = kommunGrupper.kommuner[kommunKod];
      return kommunGrupper.grupper.find((g) => g.kod === gk)?.namn ?? "Liknande kommuner";
    }
    default: return groupId;
  }
}

/** Liten SVG streckad linje-preview */
function DashPreview({ color, active }: { color: string; active: boolean }) {
  return (
    <svg width="28" height="6" viewBox="0 0 28 6" className="shrink-0">
      <line x1="0" y1="3" x2="28" y2="3"
        stroke={color} strokeWidth={active ? 2 : 1.5}
        strokeDasharray="5,3" strokeLinecap="round"
        opacity={active ? 0.9 : 0.35} />
    </svg>
  );
}

// ─── Props ───

interface Props {
  isRegion: boolean;
  kommunKod: string;
  kommunRegister: KommunEntry[];
  kommunGrupper: KommunGruppData | null;
  senasteVarden: Map<string, number | null>;
  aktivtEnhet: string;
  visaIndex: boolean;
  state: JamforState;
  dispatch: React.Dispatch<JamforAction>;
}

// ─── Komponent ───

export default function JamforPanel({
  isRegion, kommunKod, kommunRegister, kommunGrupper,
  senasteVarden, aktivtEnhet, visaIndex, state, dispatch,
}: Props) {
  const [search, setSearch] = useState("");

  const isAbsolut = aktivtEnhet === "antal" && !visaIndex;
  const typ = isRegion ? "L" : "K";

  // ── Beräkna medianvärde ──
  const medianVarde = useMemo(() => {
    const vals: number[] = [];
    kommunRegister.forEach((k) => {
      if (k.t !== typ || k.k === "0000" || k.k === "0013") return;
      const v = senasteVarden.get(k.k);
      if (v != null) vals.push(v);
    });
    if (vals.length === 0) return null;
    vals.sort((a, b) => a - b);
    const mid = Math.floor(vals.length / 2);
    return vals.length % 2 === 0 ? (vals[mid - 1] + vals[mid]) / 2 : vals[mid];
  }, [kommunRegister, typ, senasteVarden]);

  // ── Snitt-definitioner ──
  const snittDefs = useMemo(() => {
    const items: { key: string; label: string; color: string; value: string }[] = [];
    if (!isAbsolut) {
      items.push({ key: "__rikssnitt__", label: "Rikssnitt", color: "#555",
        value: fmtKort(senasteVarden.get("0000") ?? null, aktivtEnhet) });
      if (!isRegion) {
        items.push({ key: "__lanssnitt__", label: "Länssnitt (Halland)", color: "#00AB60",
          value: fmtKort(senasteVarden.get("0013") ?? null, aktivtEnhet) });
      }
    }
    items.push({ key: "__median__",
      label: isRegion ? "Medianregion (riket)" : "Mediankommun (riket)",
      color: "#888", value: fmtKort(medianVarde, aktivtEnhet) });
    return items;
  }, [isAbsolut, isRegion, senasteVarden, aktivtEnhet, medianVarde]);

  // ── Grupp-definitioner ──
  const groupDefs = useMemo(() => {
    const items: { id: string; label: string; koder: string[] }[] = [];
    if (!isRegion) {
      items.push({ id: "halland", label: "Hallands kommuner",
        koder: HALLAND_KODER.filter((k) => k !== kommunKod) });
    }
    if (isRegion) {
      items.push({ id: "sydvastsverige", label: "Sydvästsverige",
        koder: SYDVASTSVERIGE_KODER.filter((k) => k !== kommunKod) });
    }
    if (!isRegion && kommunGrupper) {
      const gk = kommunGrupper.kommuner[kommunKod];
      if (gk) {
        const koder = Object.entries(kommunGrupper.kommuner)
          .filter(([k, g]) => g === gk && k !== kommunKod).map(([k]) => k);
        const grupp = kommunGrupper.grupper.find((g) => g.kod === gk);
        items.push({ id: "kommungrupp", label: grupp?.namn ?? "Liknande kommuner", koder });
      }
    }
    items.push({ id: "alla",
      label: isRegion ? "Alla regioner" : "Alla kommuner",
      koder: kommunRegister.filter((k) => k.t === (isRegion ? "L" : "K") && k.k !== "0000" && k.k !== kommunKod).map((k) => k.k) });
    return items;
  }, [isRegion, kommunKod, kommunRegister, kommunGrupper]);

  // ── Är en grupp helt markerad? ──
  const isGroupOn = (koder: string[]) =>
    koder.length > 0 && koder.every((k) => state.selected.has(k));

  // ── Kommun-lista ──
  const allItems = useMemo(() => {
    let list = kommunRegister.filter(
      (k) => k.t === typ && k.k !== kommunKod && k.k !== "0000" && k.k !== "0013"
    );
    if (search.length >= 1) {
      const q = search.toLowerCase();
      list = list.filter((k) => k.n.toLowerCase().includes(q));
    }
    list.sort((a, b) => {
      const aV = state.selected.has(a.k) ? 0 : 1;
      const bV = state.selected.has(b.k) ? 0 : 1;
      if (aV !== bV) return aV - bV;
      return a.n.localeCompare(b.n, "sv");
    });
    return list;
  }, [kommunRegister, typ, kommunKod, search, state.selected]);

  // ─── RENDER ───
  return (
    <div className="w-[360px] flex flex-col" style={{ maxHeight: "min(75vh, 560px)" }}>

      {/* ═══ RENSA (överst, tydlig) ═══ */}
      {(state.refs.size + state.selected.size) > 0 && (
        <div className="px-3 pt-2.5 pb-0 flex items-center justify-between">
          <span className="text-[11px] text-neutral-500 tabular-nums">
            {state.refs.size + state.selected.size} jämförelser valda
          </span>
          <button onClick={() => dispatch({ type: "CLEAR_ALL" })}
            className="text-[11px] text-red-500/70 hover:text-red-600 cursor-pointer transition-colors
                       font-medium flex items-center gap-1">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
            Rensa alla
          </button>
        </div>
      )}

      {/* ═══ SNITT + GRUPPER ═══ */}
      <div className="px-3 pt-2.5 pb-2 flex flex-col gap-2">

        {/* Snitt — vertikala rader, vänsterjusterade */}
        <div>
          <span className="text-[9px] font-semibold tracking-wider uppercase text-neutral-400">Snitt</span>
          <div className="mt-1 flex flex-col">
            {snittDefs.map((s) => {
              const on = state.refs.has(s.key);
              return (
                <button key={s.key}
                  onClick={() => dispatch({ type: "TOGGLE_REF", key: s.key })}
                  className={`flex items-center gap-2 py-[4px] px-1 rounded transition-colors cursor-pointer ${
                    on ? "bg-neutral-100" : "hover:bg-neutral-50"
                  }`}
                >
                  <span className={`w-[14px] h-[14px] rounded flex items-center justify-center shrink-0 ${
                    on ? "bg-gron-2" : "border-[1.5px] border-neutral-300"
                  }`}>
                    {on && (
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white"
                           strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </span>
                  <span className={`text-[11px] flex-1 text-left ${on ? "text-neutral-800 font-medium" : "text-neutral-500"}`}>
                    {s.label}
                  </span>
                  <DashPreview color={s.color} active={on} />
                  {s.value && (
                    <span className="text-[10px] text-neutral-400 tabular-nums w-[36px] text-right shrink-0">{s.value}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Grupper — samma radstil som snitt */}
        <div>
          <span className="text-[9px] font-semibold tracking-wider uppercase text-neutral-400">Grupp</span>
          <div className="mt-1 flex flex-col">
            {groupDefs.map((g) => {
              const on = isGroupOn(g.koder);
              return (
                <button key={g.id}
                  onClick={() => dispatch({ type: "SET_GROUP", koder: g.koder, active: !on })}
                  className={`flex items-center gap-2 py-[4px] px-1 rounded transition-colors cursor-pointer ${
                    on ? "bg-gron-4/40" : "hover:bg-neutral-50"
                  }`}
                >
                  <span className={`w-[14px] h-[14px] rounded flex items-center justify-center shrink-0 ${
                    on ? "bg-gron-2" : "border-[1.5px] border-neutral-300"
                  }`}>
                    {on && (
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white"
                           strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </span>
                  <span className={`text-[11px] flex-1 text-left ${on ? "text-gron-1 font-medium" : "text-neutral-500"}`}>
                    {g.label}
                  </span>
                  <span className="text-[10px] text-neutral-400 tabular-nums w-[36px] text-right shrink-0">
                    {g.koder.length}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ═══ SÖK + LISTA ═══ */}
      <div className="flex-1 flex flex-col min-h-0 border-t border-neutral-150">

        {/* Sök */}
        <div className="px-3 py-1.5">
          <div className="relative">
            <svg className="absolute left-2 top-1/2 -translate-y-1/2 text-neutral-400"
                 width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 strokeWidth="2.5" strokeLinecap="round">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder={isRegion ? "Sök region…" : "Sök kommun…"}
              className="w-full pl-7 pr-2 py-[5px] text-[12px] bg-neutral-50 border border-neutral-200 rounded-md
                         focus:outline-none focus:ring-1 focus:ring-gron-2/30 focus:border-gron-2
                         placeholder:text-neutral-400" />
          </div>
        </div>

        {/* Lista */}
        <div className="overflow-y-auto flex-1 min-h-0">
          {allItems.length === 0 && search.length >= 1 && (
            <div className="px-3 py-4 text-[11px] text-neutral-400 text-center">Inga träffar</div>
          )}
          {allItems.map((k) => {
            const vald = state.selected.has(k.k);
            return (
              <button key={k.k}
                onClick={() => dispatch({ type: "TOGGLE_ITEM", kod: k.k })}
                className={`w-full flex items-center gap-2 px-3 py-[5px] text-left transition-colors cursor-pointer ${
                  vald
                    ? "bg-gron-4/40 border-l-[3px] border-l-gron-2"
                    : "hover:bg-neutral-50 border-l-[3px] border-l-transparent"
                }`}
              >
                <span className={`w-[15px] h-[15px] rounded-full flex items-center justify-center shrink-0 ${
                  vald ? "bg-gron-2 text-white" : "border border-neutral-300 text-neutral-300"
                }`}>
                  {vald ? (
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                         strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                         strokeWidth="2" strokeLinecap="round">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  )}
                </span>
                <span className={`text-[12px] flex-1 truncate ${
                  vald ? "text-gron-1 font-semibold" : "text-neutral-600"
                }`}>
                  {k.n}
                </span>
                <span className={`text-[10px] tabular-nums shrink-0 ${
                  vald ? "text-gron-1/60" : "text-neutral-400"
                }`}>
                  {fmtKort(senasteVarden.get(k.k) ?? null, aktivtEnhet)}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export { getGroupKoder, groupLabel, SYDVASTSVERIGE_KODER };
