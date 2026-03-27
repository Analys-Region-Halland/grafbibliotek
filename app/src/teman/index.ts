/** Centralt register över alla teman i frontend */
import type { TemaConfig } from "./tema-config";
import befolkning from "./befolkning";
import arbetsmarknad from "./arbetsmarknad";
import utbildning from "./utbildning";
import bostader from "./bostader";
import naringsliv from "./naringsliv";
import turism from "./turism";
import konjunktur from "./konjunktur";
import miljoKlimat from "./miljo_klimat";
import transport from "./transport";
import socioekonomi from "./socioekonomi";

// Lägg till nya teman här i den ordning de ska visas
export const TEMAN: TemaConfig[] = [
  befolkning,
  arbetsmarknad,
  utbildning,
  bostader,
  naringsliv,
  turism,
  konjunktur,
  miljoKlimat,
  transport,
  socioekonomi,
];

/** Hämta ett tema baserat på ID */
export function getTema(temaId: string): TemaConfig | undefined {
  return TEMAN.find((t) => t.temaId === temaId);
}

/** Samla alla netto-KPI:er från alla teman */
export function getAllNettoKpis(): Set<string> {
  const ids = new Set<string>();
  for (const tema of TEMAN) {
    for (const id of tema.nettoKpis ?? []) ids.add(id);
  }
  return ids;
}

/** Samla alla KPI:er som inte ska ha index-toggle */
export function getAllIngetIndex(): Set<string> {
  const ids = new Set<string>();
  for (const tema of TEMAN) {
    for (const id of tema.ingetIndex ?? []) ids.add(id);
  }
  return ids;
}

/** Samla alla visningsnamn från alla teman */
export function getAllVisningsnamn(): Record<string, string> {
  const result: Record<string, string> = {};
  for (const tema of TEMAN) {
    Object.assign(result, tema.visningsnamn);
  }
  return result;
}

export type { TemaConfig, Sektion, Undersektion, TemaFarg } from "./tema-config";
export { TEMA_FARG_KLASSER } from "./tema-config";
