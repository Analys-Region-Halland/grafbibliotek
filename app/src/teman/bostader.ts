import type { TemaConfig } from "./tema-config";

const G = {
  BESTAND: "Bostadsbestånd och byggande",
  PRISER: "Priser och trångboddhet",
};

const bostader: TemaConfig = {
  temaId: "bostader",
  temaNamn: "Bostäder",
  temaFarg: "gul",
  sektioner: [
    {
      id: "bestand",
      gruppRubrik: G.BESTAND,
      namn: "Bostadsbestånd",
      kpiIds: ["N07913"],
      undersektioner: [{ namn: "upplåtelseformerna", kpiIds: ["N07956", "N07957", "N07958"] }],
    },
    {
      id: "byggande",
      gruppRubrik: G.BESTAND,
      namn: "Nybyggda bostäder",
      kpiIds: ["N07917"],
      undersektioner: [{ namn: "småhus och flerbostadshus", kpiIds: ["N07905", "N07906"] }],
    },
    {
      id: "planberedskap",
      gruppRubrik: G.BESTAND,
      namn: "Planberedskap",
      kpiIds: ["N07923"],
    },
    {
      id: "priser",
      gruppRubrik: G.PRISER,
      namn: "Priser och trångboddhet",
      kpiIds: ["N07908", "N07909", "N07907"],
    },
  ],
  kortNamn: {
    N07956: "Hyresrätter",
    N07957: "Bostadsrätter",
    N07958: "Äganderätter",
    N07905: "Småhus",
    N07906: "Lägenheter i flerbostadshus",
  },
  visningsnamn: {
    "N07913": "Antal bostäder per 1 000 invånare",
    "B_TOT": "Antal bostäder, totalt",
    "N07956": "Hyresrätter per 1 000 invånare",
    "B_HYRA_N": "Hyresrätter, antal",
    "N07957": "Bostadsrätter per 1 000 invånare",
    "B_BOST_N": "Bostadsrätter, antal",
    "N07958": "Äganderätter per 1 000 invånare",
    "B_AGAN_N": "Äganderätter, antal",
    "N07917": "Nybyggda bostäder per 1 000 invånare",
    "B_NY_TOT": "Nybyggda bostäder, antal",
    "N07905": "Färdigställda småhus per 1 000 invånare",
    "B_NY_SMAHUS": "Färdigställda småhus, antal",
    "N07906": "Färdigställda lägenheter i flerbostadshus per 1 000 invånare",
    "B_NY_FLERBO": "Färdigställda lägenheter i flerbostadshus, antal",
    "N07923": "Planberedskap för bostadsbyggande, antal bostäder i detaljplan",
    "N07908": "Genomsnittligt pris för bostadsrätter, kr/kvm",
    "N07909": "Genomsnittligt pris för småhus, tkr",
    "N07907": "Trångbodda hushåll, andel (%)",
  },
};

export default bostader;
