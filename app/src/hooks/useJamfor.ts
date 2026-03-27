/**
 * useJamfor — Enkel state för jämförelser.
 *
 * Två sets:
 *   - refs: pseudo-nycklar (__rikssnitt__, __lanssnitt__, __median__)
 *   - selected: kommun-koder som ska visas som färgade linjer
 *
 * Gruppknappar i UI:t är bara genvägar som batch-lägger till/tar bort
 * koder från selected. Ingen separat grupp-state.
 */

import { useReducer } from "react";

// ─── State ───

export interface JamforState {
  refs: Set<string>;
  selected: Set<string>;
}

// ─── Actions ───

export type JamforAction =
  | { type: "TOGGLE_REF"; key: string }
  | { type: "TOGGLE_ITEM"; kod: string }
  | { type: "SET_GROUP"; koder: string[]; active: boolean }
  | { type: "CLEAR_ALL" };

// ─── Reducer ───

const INITIAL: JamforState = {
  refs: new Set(),
  selected: new Set(),
};

function reducer(state: JamforState, action: JamforAction): JamforState {
  switch (action.type) {
    case "TOGGLE_REF": {
      const next = new Set(state.refs);
      if (next.has(action.key)) next.delete(action.key);
      else next.add(action.key);
      return { ...state, refs: next };
    }

    case "TOGGLE_ITEM": {
      const next = new Set(state.selected);
      if (next.has(action.kod)) next.delete(action.kod);
      else next.add(action.kod);
      return { ...state, selected: next };
    }

    case "SET_GROUP": {
      const next = new Set(state.selected);
      if (action.active) {
        action.koder.forEach((k) => next.add(k));
      } else {
        action.koder.forEach((k) => next.delete(k));
      }
      return { ...state, selected: next };
    }

    case "CLEAR_ALL":
      return { refs: new Set(), selected: new Set() };

    default:
      return state;
  }
}

// ─── Hook ───

export function useJamfor() {
  const [state, dispatch] = useReducer(reducer, INITIAL);
  const totalActive = state.refs.size + state.selected.size;
  return { state, dispatch, totalActive };
}
