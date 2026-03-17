import type { TemaConfig } from "./tema-config";

const befolkning: TemaConfig = {
  temaId: "befolkning",
  temaNamn: "Befolkning & demografi",
  temaFarg: "gron",
  nettoKpis: ["N01803", "N01806", "N01964"],
  ingetIndex: ["N01803", "N01806", "N01964"],
  sektioner: [
    {
      id: "folkmagd",
      namn: "Folkmängd",
      kpiIds: ["N01951"],
      undersektioner: [
        { namn: "Sammansättning", kpiIds: ["N02926", "N02923"] },
      ],
    },
    {
      id: "tathet",
      namn: "Befolkningstäthet",
      kpiIds: ["N02937"],
    },
    {
      id: "forandring",
      namn: "Befolkningsförändring",
      kpiIds: ["N01963"],
      undersektioner: [
        { namn: "Komponenter", kpiIds: ["N01803", "N01964", "N01806"] },
      ],
    },
    {
      id: "fruktsamhet",
      namn: "Fruktsamhet",
      kpiIds: ["N01770"],
    },
    {
      id: "alder",
      namn: "Medelålder",
      kpiIds: ["N00959"],
      undersektioner: [
        { namn: "Åldersgrupper", kpiIds: ["N01994", "N01961", "N01812", "N01813"] },
      ],
    },
    {
      id: "forssorjning",
      namn: "Försörjningskvot",
      kpiIds: ["N00927"],
      undersektioner: [
        { namn: "Uppdelning", kpiIds: ["C_FORSORJ_UNG", "C_FORSORJ_ALD"] },
      ],
    },
  ],
  visningsnamn: {
    "N01951": "Folkmängd, antal invånare",
    "N02937": "Befolkningstäthet, invånare per kvadratkilometer",
    "N01963": "Årlig befolkningsförändring, andel (%)",
    "N01803": "Födelsenetto, antal per 1 000 invånare",
    "N01964": "Inrikes flyttnetto, antal per 1 000 invånare",
    "N01806": "Utrikes flyttnetto, antal per 1 000 invånare",
    "N01770": "Summerad fruktsamhet, barn per kvinna",
    "N00959": "Befolkningens medelålder, år",
    "N00927": "Demografisk försörjningskvot, antal icke arbetsföra per arbetsför",
    "N01994": "Invånare 0–19 år, andel av befolkningen (%)",
    "N01961": "Invånare 20–64 år, andel av befolkningen (%)",
    "N01812": "Invånare 65–79 år, andel av befolkningen (%)",
    "N01813": "Invånare 80 år och äldre, andel av befolkningen (%)",
    "N02923": "Kvinnor i befolkningen, andel (%)",
    "N02926": "Utrikes födda i befolkningen, andel (%)",
    // Par-KPI:er (visas i modal-toggle)
    "N01919": "Invånare 0–19 år, antal",
    "N01955": "Invånare 20–64 år, antal",
    "N01956": "Invånare 65–79 år, antal",
    "N01957": "Invånare 80 år och äldre, antal",
    "N02012": "Årlig befolkningsförändring, antal",
    "N02100": "Födelsenetto, antal",
    "N02101": "Inrikes flyttnetto, antal",
    "N02102": "Utrikes flyttnetto, antal",
    // Beräknade försörjningskvoter
    "C_FORSORJ_UNG": "Försörjningskvot, yngre (0–19 / 20–64)",
    "C_FORSORJ_ALD": "Försörjningskvot, äldre (65+ / 20–64)",
  },
  kortNamn: {
    // Under Folkmängd
    "N02926": "Utrikes födda",
    "N02923": "Andel kvinnor",
    // Under Befolkningsförändring
    "N01803": "Födelsenetto",
    "N01964": "Inrikes flyttnetto",
    "N01806": "Utrikes flyttnetto",
    // Åldersgrupper
    "N01994": "0–19 år",
    "N01961": "20–64 år",
    "N01812": "65–79 år",
    "N01813": "80+ år",
    // Beräknade försörjningskvoter
    "C_FORSORJ_UNG": "Från yngre (0–19 / 20–64)",
    "C_FORSORJ_ALD": "Från äldre (65+ / 20–64)",
  },
};

export default befolkning;
