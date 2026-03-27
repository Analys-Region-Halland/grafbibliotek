import type { TemaConfig } from "./tema-config";

const befolkning: TemaConfig = {
  temaId: "befolkning",
  temaNamn: "Befolkning & demografi",
  temaFarg: "gron",
  // Inga netto-KPI:er som behöver klient-sidans per-1000-beräkning
  // — promille-värdena är förberäknade från SCB
  nettoKpis: [],
  ingetIndex: [],
  sektioner: [
    {
      id: "folkmagd",
      namn: "Folkmängd",
      kpiIds: ["S_BEF_TOTALT"],
      undersektioner: [
        {
          namn: "Sammansättning",
          kpiIds: ["S_UTRIKES_FODDA_ANDEL", "S_KVINNOR_ANDEL"],
        },
      ],
    },
    {
      id: "tathet",
      namn: "Befolkningstäthet",
      kpiIds: ["S_BEF_TATHET"],
    },
    {
      id: "forandring",
      namn: "Befolkningsförändring",
      kpiIds: ["S_BEF_FORANDR_PCT"],
    },
    {
      id: "fodelsenetto",
      namn: "Födelsenetto",
      kpiIds: ["S_FODELSENETTO_PROMILLE"],
      undersektioner: [
        {
          namn: "Ingående",
          kpiIds: ["S_FODDA_ANTAL", "S_DODA_ANTAL"],
        },
      ],
    },
    {
      id: "inrikes_flytt",
      namn: "Inrikes flyttnetto",
      kpiIds: ["S_INRIKES_NETTO_PROMILLE"],
      undersektioner: [
        {
          namn: "Ingående",
          kpiIds: ["S_INRIKES_INFLYTT_ANTAL", "S_INRIKES_UTFLYTT_ANTAL"],
        },
      ],
    },
    {
      id: "utrikes_flytt",
      namn: "Utrikes flyttnetto",
      kpiIds: ["S_UTRIKES_NETTO_PROMILLE"],
      undersektioner: [
        {
          namn: "Ingående",
          kpiIds: ["S_INVANDRING_ANTAL", "S_UTVANDRING_ANTAL"],
        },
      ],
    },
    {
      id: "fruktsamhet",
      namn: "Fruktsamhet",
      kpiIds: ["S_FRUKTSAMHET"],
    },
    {
      id: "alder",
      namn: "Medelålder",
      kpiIds: ["S_MEDELALDER"],
      undersektioner: [
        {
          namn: "Åldersgrupper",
          kpiIds: [
            "S_BEF_0_19_ANDEL",
            "S_BEF_20_64_ANDEL",
            "S_BEF_65_79_ANDEL",
            "S_BEF_80_ANDEL",
          ],
        },
      ],
    },
    {
      id: "forssorjning",
      namn: "Försörjningskvot",
      kpiIds: ["S_FORSORJ_TOTAL"],
      undersektioner: [
        { namn: "Uppdelning", kpiIds: ["S_FORSORJ_UNG", "S_FORSORJ_ALD"] },
      ],
    },
  ],
  visningsnamn: {
    S_BEF_TOTALT: "Folkmängd, antal invånare",
    S_BEF_TATHET: "Befolkningstäthet, invånare per kvadratkilometer",
    S_BEF_FORANDR_PCT: "Årlig befolkningsförändring, andel (%)",
    S_BEF_FORANDR_ANTAL: "Årlig befolkningsförändring, antal",
    S_FODELSENETTO_PROMILLE: "Födelsenetto per 1 000 invånare",
    S_FODELSENETTO_ANTAL: "Födelsenetto, antal",
    S_INRIKES_NETTO_PROMILLE: "Inrikes flyttnetto per 1 000 invånare",
    S_INRIKES_NETTO_ANTAL: "Inrikes flyttnetto, antal",
    S_UTRIKES_NETTO_PROMILLE: "Utrikes flyttnetto per 1 000 invånare",
    S_UTRIKES_NETTO_ANTAL: "Utrikes flyttnetto, antal",
    S_FODDA_ANTAL: "Antal födda",
    S_DODA_ANTAL: "Antal döda",
    S_INVANDRING_ANTAL: "Invandringar, antal",
    S_UTVANDRING_ANTAL: "Utvandringar, antal",
    S_INRIKES_INFLYTT_ANTAL: "Inrikes inflyttningar, antal",
    S_INRIKES_UTFLYTT_ANTAL: "Inrikes utflyttningar, antal",
    S_FRUKTSAMHET: "Summerad fruktsamhet, barn per kvinna",
    S_MEDELALDER: "Befolkningens medelålder, år",
    S_FORSORJ_TOTAL: "Demografisk försörjningskvot",
    S_FORSORJ_UNG: "Försörjningskvot, yngre (0–19 / 20–64)",
    S_FORSORJ_ALD: "Försörjningskvot, äldre (65+ / 20–64)",
    S_BEF_0_19_ANDEL: "Invånare 0–19 år, andel av befolkningen (%)",
    S_BEF_0_19_ANTAL: "Invånare 0–19 år, antal",
    S_BEF_20_64_ANDEL: "Invånare 20–64 år, andel av befolkningen (%)",
    S_BEF_20_64_ANTAL: "Invånare 20–64 år, antal",
    S_BEF_65_79_ANDEL: "Invånare 65–79 år, andel av befolkningen (%)",
    S_BEF_65_79_ANTAL: "Invånare 65–79 år, antal",
    S_BEF_80_ANDEL: "Invånare 80 år och äldre, andel av befolkningen (%)",
    S_BEF_80_ANTAL: "Invånare 80 år och äldre, antal",
    S_KVINNOR_ANDEL: "Kvinnor i befolkningen, andel (%)",
    S_KVINNOR_ANTAL: "Kvinnor i befolkningen, antal",
    S_UTRIKES_FODDA_ANDEL: "Utrikes födda i befolkningen, andel (%)",
    S_UTRIKES_FODDA_ANTAL: "Utrikes födda i befolkningen, antal",
  },
  kortNamn: {
    // Under Folkmängd
    S_UTRIKES_FODDA_ANDEL: "Utrikes födda",
    S_KVINNOR_ANDEL: "Andel kvinnor",
    // Under Födelsenetto
    S_FODDA_ANTAL: "Födda",
    S_DODA_ANTAL: "Döda",
    // Under Inrikes flytt
    S_INRIKES_INFLYTT_ANTAL: "Inflyttade",
    S_INRIKES_UTFLYTT_ANTAL: "Utflyttade",
    // Under Utrikes flytt
    S_INVANDRING_ANTAL: "Invandrade",
    S_UTVANDRING_ANTAL: "Utvandrade",
    // Åldersgrupper
    S_BEF_0_19_ANDEL: "0–19 år",
    S_BEF_20_64_ANDEL: "20–64 år",
    S_BEF_65_79_ANDEL: "65–79 år",
    S_BEF_80_ANDEL: "80+ år",
    // Försörjningskvoter
    S_FORSORJ_UNG: "Från yngre (0–19 / 20–64)",
    S_FORSORJ_ALD: "Från äldre (65+ / 20–64)",
  },
};

export default befolkning;
