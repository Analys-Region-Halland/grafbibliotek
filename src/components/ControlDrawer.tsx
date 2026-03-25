import { useState, useEffect, useCallback, useMemo } from "react";
import type { KommunEntry, KpiRow } from "../types";
import { HALLAND_KODER } from "../types";
import { fmt } from "../utils/format";
import type { ComparisonBand } from "../charts/LineChart";

// ─── Typer ───

export interface KommunGrupp {
  kod: string;
  namn: string;
  huvudgrupp: string;
}

export interface KommunGruppData {
  grupper: KommunGrupp[];
  kommuner: Record<string, string>; // kommun_kod → gruppkod
}

interface Props {
  open: boolean;
  tab: "urval" | "installningar";
  onClose: () => void;

  valdKommunKod: string;
  valdKommunNamn: string;
  isRegion: boolean;

  kommunRegister: KommunEntry[];
  kommunGrupper: KommunGruppData | null;

  // KPI-data för att visa senaste värden
  kpiId: string;
  enhet: string;
  allData: KpiRow[];

  // Jämförelseband
  bands: ComparisonBand[];
  onSetBands: (bands: ComparisonBand[]) => void;

  visibleKoder: Set<string>;
  highlightKoder: Set<string>;
  onSetVisible: (koder: Set<string>) => void;
  onSetHighlight: (koder: Set<string>) => void;

  showRiksnitt: boolean;
  showMedian: boolean;
  onSetShowRiksnitt: (v: boolean) => void;
  onSetShowMedian: (v: boolean) => void;

  indexMode: boolean;
  visaNoll: boolean;
  onSetIndexMode: (v: boolean) => void;
  onSetVisaNoll: (v: boolean) => void;

  highlightMode: boolean;
  onSetHighlightMode: (v: boolean) => void;
  referenceMode: boolean;
  onSetReferenceMode: (v: boolean) => void;

  harPar: boolean;
  visaAntal: boolean;
  onSetVisaAntal: (v: boolean) => void;
  andelLabel: string;

  isNetto: boolean;
  nettoRatt: boolean;
  onSetNettoRatt: (v: boolean) => void;

  kanVisaIndex: boolean;
  isRelativt: boolean;
}

// ─── Mikro-komponenter ───

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-2.5 py-[5px] cursor-pointer group">
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative w-8 h-[18px] rounded-full transition-colors duration-200 cursor-pointer shrink-0 ${
          checked ? "bg-gron-2" : "bg-neutral-300"
        }`}
      >
        <span className={`absolute top-[2px] left-[2px] w-[14px] h-[14px] bg-white rounded-full shadow-sm transition-transform duration-200 ${
          checked ? "translate-x-[14px]" : ""
        }`} />
      </button>
      <span className="text-[12px] text-neutral-600 group-hover:text-neutral-800 select-none leading-tight">{label}</span>
    </label>
  );
}

function Segment({ options, value, onChange }: {
  options: { label: string; value: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex bg-neutral-100 rounded-md p-0.5 gap-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`flex-1 text-[11px] py-1 px-1.5 rounded transition-all duration-150 cursor-pointer ${
            value === opt.value
              ? "bg-white text-neutral-800 shadow-sm font-medium"
              : "text-neutral-500 hover:text-neutral-700"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-semibold tracking-widest uppercase text-neutral-400 mt-4 mb-1.5 select-none">
      {children}
    </div>
  );
}

/** Formatera KPI-värde kompakt */
function fmtKort(v: number | null, enhet: string): string {
  if (v == null) return "–";
  if (enhet === "antal") return fmt(v, 0);
  return fmt(v, Math.abs(v) >= 100 ? 0 : Math.abs(v) < 10 ? 2 : 1);
}

// ─── Huvudkomponent ───

export default function ControlDrawer({
  open, tab, onClose,
  valdKommunKod, valdKommunNamn, isRegion,
  kommunRegister, kommunGrupper,
  kpiId, enhet, allData,
  bands, onSetBands,
  visibleKoder, highlightKoder, onSetVisible, onSetHighlight,
  showRiksnitt, showMedian, onSetShowRiksnitt, onSetShowMedian,
  indexMode, visaNoll, onSetIndexMode, onSetVisaNoll,
  highlightMode, onSetHighlightMode,
  referenceMode, onSetReferenceMode,
  harPar, visaAntal, onSetVisaAntal, andelLabel,
  isNetto, nettoRatt, onSetNettoRatt,
  kanVisaIndex, isRelativt,
}: Props) {

  // Escape stänger
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // ── Senaste KPI-värden per kommun ──
  const senasteVarden = useMemo(() => {
    const map = new Map<string, number | null>();
    const kpiRows = allData.filter((d) => d.kpi_id === kpiId);
    const maxAr = Math.max(...kpiRows.filter(d => d.varde != null).map(d => d.ar));
    for (const d of kpiRows) {
      if (d.ar === maxAr) map.set(d.kommun_kod, d.varde);
    }
    return map;
  }, [allData, kpiId]);

  // ── Storleksklasser (baserat på befolkning) ──
  const storleksklasser = useMemo(() => {
    const popRows = allData.filter((d) => d.kpi_id === "N01951" && d.varde != null);
    const maxAr = popRows.length > 0 ? Math.max(...popRows.map((d) => d.ar)) : 0;
    const popMap = new Map<string, number>();
    for (const d of popRows) { if (d.ar === maxAr) popMap.set(d.kommun_kod, d.varde!); }

    const klasser: { label: string; koder: string[] }[] = [
      { label: "0–10 000 inv.", koder: [] },
      { label: "10–20 000", koder: [] },
      { label: "20–50 000", koder: [] },
      { label: "50–100 000", koder: [] },
      { label: "100 000+", koder: [] },
    ];
    const jTyp = isRegion ? "L" : "K";
    kommunRegister.forEach((k) => {
      if (k.t !== jTyp || k.k === "0000") return;
      const pop = popMap.get(k.k);
      if (pop == null) return;
      if (pop < 10000) klasser[0].koder.push(k.k);
      else if (pop < 20000) klasser[1].koder.push(k.k);
      else if (pop < 50000) klasser[2].koder.push(k.k);
      else if (pop < 100000) klasser[3].koder.push(k.k);
      else klasser[4].koder.push(k.k);
    });
    return klasser.filter((k) => k.koder.length > 0);
  }, [allData, kommunRegister, isRegion]);

  // Vald kommuns storleksklass
  const valdStorleksklass = useMemo(() => {
    return storleksklasser.find((k) => k.koder.includes(valdKommunKod)) ?? null;
  }, [storleksklasser, valdKommunKod]);

  // Vald kommuns kommungrupp
  const valdKommunGrupp = useMemo(() => {
    if (!kommunGrupper) return null;
    const gruppKod = kommunGrupper.kommuner[valdKommunKod];
    if (!gruppKod) return null;
    const grupp = kommunGrupper.grupper.find((g) => g.kod === gruppKod);
    return grupp ? { ...grupp, gruppKod } : null;
  }, [kommunGrupper, valdKommunKod]);

  // ── Band-toggle ──
  const toggleBand = useCallback((id: string, label: string, koder: string[], colorIndex: number) => {
    const exists = bands.find((b) => b.id === id);
    if (exists) {
      onSetBands(bands.filter((b) => b.id !== id));
    } else {
      onSetBands([...bands, { id, label, koder: koder.filter((k) => k !== valdKommunKod), colorIndex }]);
    }
  }, [bands, onSetBands, valdKommunKod]);

  const hasBand = (id: string) => bands.some((b) => b.id === id);

  // ── Kommungrupp-mappning ──
  const gruppKoder = useMemo(() => {
    if (!kommunGrupper) return new Map<string, string[]>();
    const map = new Map<string, string[]>();
    for (const [kod, grupp] of Object.entries(kommunGrupper.kommuner)) {
      if (!map.has(grupp)) map.set(grupp, []);
      map.get(grupp)!.push(kod);
    }
    return map;
  }, [kommunGrupper]);

  // ── Filter-state ──
  const [gruppFilter, setGruppFilter] = useState<string>("alla");
  const [searchQuery, setSearchQuery] = useState("");

  // ── Alla valbara kommuner (filtrerade) ──
  const jmfTyp = isRegion ? "L" : "K";
  const filteredKommuner = useMemo(() => {
    let list = kommunRegister.filter(
      (k) => k.t === jmfTyp && k.k !== valdKommunKod && k.k !== "0000"
    );

    // Kommungrupp-filter
    if (gruppFilter === "_halland") {
      const hallandSet = new Set(HALLAND_KODER);
      list = list.filter((k) => hallandSet.has(k.k));
    } else if (gruppFilter !== "alla" && kommunGrupper) {
      const koderIGrupp = new Set(gruppKoder.get(gruppFilter) ?? []);
      list = list.filter((k) => koderIGrupp.has(k.k));
    }

    // Sök-filter
    if (searchQuery.length >= 2) {
      const q = searchQuery.toLowerCase();
      list = list.filter((k) => k.n.toLowerCase().includes(q));
    }

    // Sortera: valda först, sen efter namn
    const allaValda = new Set([...visibleKoder, ...highlightKoder]);
    list.sort((a, b) => {
      const aVald = allaValda.has(a.k) ? 0 : 1;
      const bVald = allaValda.has(b.k) ? 0 : 1;
      if (aVald !== bVald) return aVald - bVald;
      return a.n.localeCompare(b.n, "sv");
    });

    return list;
  }, [kommunRegister, jmfTyp, valdKommunKod, gruppFilter, kommunGrupper, gruppKoder, searchQuery, visibleKoder, highlightKoder]);

  // ── Toggle-funktioner ──
  const toggleKommun = useCallback((kod: string) => {
    // Toggla i visible (synlig som linje)
    const nextVisible = new Set(visibleKoder);
    if (nextVisible.has(kod)) {
      nextVisible.delete(kod);
      // Ta också bort från highlight
      const nextHl = new Set(highlightKoder);
      nextHl.delete(kod);
      onSetHighlight(nextHl);
    } else {
      nextVisible.add(kod);
    }
    onSetVisible(nextVisible);
  }, [visibleKoder, highlightKoder, onSetVisible, onSetHighlight]);

  // Välj alla i aktuellt filter
  const selectAll = useCallback(() => {
    const next = new Set(visibleKoder);
    filteredKommuner.forEach((k) => next.add(k.k));
    onSetVisible(next);
  }, [filteredKommuner, visibleKoder, onSetVisible]);

  const deselectAll = useCallback(() => {
    const toRemove = new Set(filteredKommuner.map((k) => k.k));
    const nextVisible = new Set([...visibleKoder].filter((k) => !toRemove.has(k)));
    const nextHl = new Set([...highlightKoder].filter((k) => !toRemove.has(k)));
    onSetVisible(nextVisible);
    onSetHighlight(nextHl);
  }, [filteredKommuner, visibleKoder, highlightKoder, onSetVisible, onSetHighlight]);

  const allaValda = useMemo(() => new Set([...visibleKoder, ...highlightKoder]), [visibleKoder, highlightKoder]);
  const antalValda = filteredKommuner.filter((k) => allaValda.has(k.k)).length;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`absolute inset-0 z-10 transition-opacity duration-300 ${
          open ? "bg-black/8 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`absolute top-0 right-0 bottom-0 z-20 w-[300px] max-w-[85vw]
                    bg-white border-l border-neutral-200
                    shadow-[-4px_0_20px_rgba(0,0,0,0.06)]
                    flex flex-col
                    transition-transform duration-300 ease-out
                    ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        {/* Header */}
        <div className="shrink-0 px-4 py-3 border-b border-neutral-100 flex items-center justify-between">
          <span className="text-[13px] font-semibold text-neutral-700">
            {tab === "urval" ? "Urval & jämförelser" : "Inställningar"}
          </span>
          <button
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-neutral-100
                       text-neutral-400 hover:text-neutral-600 transition-colors cursor-pointer"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Scrollbar innehåll */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 pb-4">

          {tab === "urval" && (<>

          {/* ═══ VALD KOMMUN + SNABBJÄMFÖRELSER ═══ */}
          <div className="mt-3 rounded-lg border border-neutral-100 overflow-hidden">

            {/* Vald kommun */}
            <div className="flex items-center gap-2 px-3 py-[7px] bg-gron-4/30">
              <span className="w-2 h-2 rounded-full bg-gron-1 shrink-0" />
              <span className="text-[12px] text-gron-1 font-semibold flex-1 truncate">{valdKommunNamn}</span>
              <span className="text-[10px] text-gron-1 font-data">{fmtKort(senasteVarden.get(valdKommunKod) ?? null, enhet)}</span>
            </div>

            {/* Rikssnitt — visas bara vid relativa tal eller index */}
            {(isRelativt || indexMode) && (
              <label className="flex items-center gap-2 px-3 py-[6px] cursor-pointer hover:bg-neutral-50 border-t border-neutral-100">
                <input type="checkbox" checked={showRiksnitt} onChange={(e) => onSetShowRiksnitt(e.target.checked)}
                  className="w-3 h-3 rounded accent-neutral-600 cursor-pointer shrink-0" />
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: showRiksnitt ? "#444" : "#ddd" }} />
                <span className={`text-[12px] flex-1 select-none ${showRiksnitt ? "text-neutral-800" : "text-neutral-500"}`}>Rikssnitt</span>
                <span className="text-[10px] text-neutral-400 font-data">{fmtKort(senasteVarden.get("0000") ?? null, enhet)}</span>
              </label>
            )}

            {/* Median */}
            <label className="flex items-center gap-2 px-3 py-[6px] cursor-pointer hover:bg-neutral-50 border-t border-neutral-50">
              <input type="checkbox" checked={showMedian} onChange={(e) => onSetShowMedian(e.target.checked)}
                className="w-3 h-3 rounded accent-neutral-600 cursor-pointer shrink-0" />
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: showMedian ? "#666" : "#ddd" }} />
              <span className={`text-[12px] flex-1 select-none ${showMedian ? "text-neutral-800" : "text-neutral-500"}`}>Median</span>
            </label>

            {/* Halland (band) */}
            {!isRegion && (
              <label className="flex items-center gap-2 px-3 py-[6px] cursor-pointer hover:bg-neutral-50 border-t border-neutral-50">
                <input type="checkbox" checked={hasBand("halland")}
                  onChange={() => toggleBand("halland", "Halland", HALLAND_KODER, 1)}
                  className="w-3 h-3 rounded accent-gron-2 cursor-pointer shrink-0" />
                <span className="w-1.5 h-1.5 rounded-full bg-gron-2 shrink-0" />
                <span className={`text-[12px] flex-1 select-none ${hasBand("halland") ? "text-gron-1 font-medium" : "text-neutral-600"}`}>
                  Hallands kommuner
                </span>
                <span className="text-[10px] text-neutral-400 font-data">6</span>
              </label>
            )}

            {/* Kommungrupp (band) — visa bara den egna */}
            {valdKommunGrupp && !isRegion && (() => {
              const koder = Object.entries(kommunGrupper!.kommuner)
                .filter(([, g]) => g === valdKommunGrupp.gruppKod)
                .map(([k]) => k);
              return (
                <label className="flex items-center gap-2 px-3 py-[6px] cursor-pointer hover:bg-neutral-50 border-t border-neutral-50">
                  <input type="checkbox" checked={hasBand("kommungrupp")}
                    onChange={() => toggleBand("kommungrupp", valdKommunGrupp.namn, koder, 0)}
                    className="w-3 h-3 rounded accent-bla-2 cursor-pointer shrink-0" />
                  <span className="w-1.5 h-1.5 rounded-full bg-bla-2 shrink-0" />
                  <span className={`text-[12px] flex-1 select-none truncate ${hasBand("kommungrupp") ? "text-bla-1 font-medium" : "text-neutral-600"}`}>
                    {valdKommunGrupp.kod} {valdKommunGrupp.namn}
                  </span>
                  <span className="text-[10px] text-neutral-400 font-data">{koder.length}</span>
                </label>
              );
            })()}

            {/* Storleksklass (band) — visa bara den egna */}
            {valdStorleksklass && !isRegion && (() => {
              const idx = storleksklasser.indexOf(valdStorleksklass);
              const id = `storlek_${idx}`;
              return (
                <label className="flex items-center gap-2 px-3 py-[6px] cursor-pointer hover:bg-neutral-50 border-t border-neutral-50">
                  <input type="checkbox" checked={hasBand(id)}
                    onChange={() => toggleBand(id, valdStorleksklass.label, valdStorleksklass.koder, 2)}
                    className="w-3 h-3 rounded accent-lila-2 cursor-pointer shrink-0" />
                  <span className="w-1.5 h-1.5 rounded-full bg-lila-2 shrink-0" />
                  <span className={`text-[12px] flex-1 select-none ${hasBand(id) ? "text-lila-1 font-medium" : "text-neutral-600"}`}>
                    Samma storlek ({valdStorleksklass.label})
                  </span>
                  <span className="text-[10px] text-neutral-400 font-data">{valdStorleksklass.koder.length}</span>
                </label>
              );
            })()}

            {/* Alla kommuner (band) */}
            {!isRegion && (() => {
              const allaKoder = kommunRegister.filter((k) => k.t === "K" && k.k !== "0000").map((k) => k.k);
              return (
                <label className="flex items-center gap-2 px-3 py-[6px] cursor-pointer hover:bg-neutral-50 border-t border-neutral-50">
                  <input type="checkbox" checked={hasBand("alla_kommuner")}
                    onChange={() => toggleBand("alla_kommuner", "Alla kommuner", allaKoder, 0)}
                    className="w-3 h-3 rounded accent-neutral-500 cursor-pointer shrink-0" />
                  <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 shrink-0" />
                  <span className={`text-[12px] flex-1 select-none ${hasBand("alla_kommuner") ? "text-neutral-800 font-medium" : "text-neutral-600"}`}>
                    Alla kommuner
                  </span>
                  <span className="text-[10px] text-neutral-400 font-data">{allaKoder.length}</span>
                </label>
              );
            })()}
          </div>

          {/* ═══ EGET URVAL ═══ */}
          <SectionHeader>Eget urval</SectionHeader>

          {/* Sök + gruppfilter */}
          <div className="flex gap-1.5 mb-1.5">
            <div className="relative flex-1 min-w-0">
              <svg className="absolute left-2 top-1/2 -translate-y-1/2 text-neutral-400"
                width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2.5" strokeLinecap="round">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Sök kommun..."
                className="w-full pl-6 pr-2 py-1.5 text-[11px] bg-neutral-50 border border-neutral-200
                           rounded focus:outline-none focus:border-gron-2 placeholder:text-neutral-400" />
            </div>
            {kommunGrupper && !isRegion && (
              <select value={gruppFilter} onChange={(e) => setGruppFilter(e.target.value)}
                className="text-[10px] py-1.5 px-1.5 bg-neutral-50 border border-neutral-200
                           rounded text-neutral-600 cursor-pointer shrink-0 max-w-[110px]
                           focus:outline-none focus:border-gron-2">
                <option value="alla">Filtrera</option>
                {kommunGrupper.grupper.map((g) => (
                  <option key={g.kod} value={g.kod}>{g.kod} {g.namn.length > 12 ? g.namn.slice(0, 12) + "…" : g.namn}</option>
                ))}
              </select>
            )}
          </div>

          <div className="flex items-center gap-1.5 mb-1">
            <button onClick={selectAll} className="text-[10px] text-gron-1 hover:underline cursor-pointer">
              Alla{gruppFilter !== "alla" ? " i grupp" : ""}
            </button>
            <span className="text-neutral-300 text-[8px]">·</span>
            <button onClick={deselectAll} className="text-[10px] text-neutral-400 hover:underline cursor-pointer">Rensa</button>
            <span className="flex-1" />
            <span className="text-[10px] text-neutral-400 font-data">{antalValda} valda</span>
          </div>

          <div className="rounded border border-neutral-100 overflow-hidden max-h-[180px] overflow-y-auto">
            {filteredKommuner.length === 0 ? (
              <div className="px-3 py-3 text-[11px] text-neutral-400 text-center">Inga träffar</div>
            ) : filteredKommuner.map((k) => {
              const vald = allaValda.has(k.k);
              const val = senasteVarden.get(k.k) ?? null;
              const isHalland = HALLAND_KODER.includes(k.k);
              return (
                <label key={k.k}
                  className={`flex items-center gap-2 px-2.5 py-[4px] cursor-pointer transition-colors text-[11px]
                    border-b border-neutral-50 last:border-0
                    ${vald ? "bg-gron-4/30" : "hover:bg-neutral-50"}`}>
                  <input type="checkbox" checked={vald} onChange={() => toggleKommun(k.k)}
                    className="w-3 h-3 rounded accent-gron-2 cursor-pointer shrink-0" />
                  <span className={`flex-1 truncate ${vald ? "text-gron-1 font-medium" : "text-neutral-600"}`}>
                    {k.n}{isHalland && <span className="ml-0.5 text-[8px] text-gron-2">●</span>}
                  </span>
                  <span className="text-[10px] text-neutral-400 font-data shrink-0 tabular-nums">{fmtKort(val, enhet)}</span>
                </label>
              );
            })}
          </div>
          </>)}

          {tab === "installningar" && (<>
          {/* ═══ INSTÄLLNINGAR ═══ */}
          <SectionHeader>Visning</SectionHeader>

          <div className="space-y-0.5">
            {kanVisaIndex && (
              <Toggle checked={indexMode} onChange={onSetIndexMode} label="Indexerat (basår = 100)" />
            )}
            <Toggle checked={visaNoll} onChange={onSetVisaNoll} label="Visa noll på y-axeln" />
          </div>

          {harPar && (
            <div className="mt-2">
              <Segment
                options={[
                  { label: andelLabel, value: "andel" },
                  { label: "Antal", value: "antal" },
                ]}
                value={visaAntal ? "antal" : "andel"}
                onChange={(v) => onSetVisaAntal(v === "antal")}
              />
            </div>
          )}

          {isNetto && (
            <div className="mt-2">
              <Segment
                options={[
                  { label: "Per 1 000 inv.", value: "per1000" },
                  { label: "Antal", value: "antal" },
                ]}
                value={nettoRatt ? "antal" : "per1000"}
                onChange={(v) => onSetNettoRatt(v === "antal")}
              />
            </div>
          )}

          {/* ── Grafens beteende ── */}
          <SectionHeader>Beteende</SectionHeader>
          <div className="space-y-0.5">
            <Toggle checked={highlightMode} onChange={onSetHighlightMode} label="Framhäv vald kommun (dimma övriga)" />
            <Toggle checked={referenceMode} onChange={onSetReferenceMode} label="Nedtonade referenslinjer" />
          </div>
          </>)}

        </div>
      </div>
    </>
  );
}
