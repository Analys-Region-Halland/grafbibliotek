import type { TemaConfig } from "./tema-config";

const G = {
  BESTAND: "Bostadsbestånd och byggande",
  HUSHALL: "Hushåll och boende",
  PRISER: "Priser",
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
      id: "hushall",
      gruppRubrik: G.HUSHALL,
      namn: "Hushåll och boende",
      kpiIds: ["N02938", "N07914", "N07907", "N66081", "N45920"],
      undersektioner: [
        { namn: "hushållstyperna", delAv: "N02938", kpiIds: ["N02942", "N02943", "N02944"] },
      ],
    },
    {
      id: "priser",
      gruppRubrik: G.PRISER,
      namn: "Priser",
      kpiIds: ["N07908", "N07909"],
    },
  ],
  kortNamn: {
    N07956: "Hyresrätter",
    N07957: "Bostadsrätter",
    N07958: "Äganderätter",
    N07905: "Småhus",
    N07906: "Lägenheter i flerbostadshus",
    N02942: "Ensamstående",
    N02943: "Sammanboende",
    N02944: "Övriga hushåll",
  },
  visningsnamn: {
    "N07913": "Antal bostäder per 1 000 invånare",
    "B_TOT": "Antal bostäder, totalt",
    "N07956": "Hyresrätter i bostadsbeståndet, andel (%)",
    "B_HYRA_N": "Hyresrätter, antal",
    "N07957": "Bostadsrätter i bostadsbeståndet, andel (%)",
    "B_BOST_N": "Bostadsrätter, antal",
    "N07958": "Äganderätter i bostadsbeståndet, andel (%)",
    "B_AGAN_N": "Äganderätter, antal",
    "N07917": "Nybyggda bostäder per 1 000 invånare",
    "B_NY_TOT": "Nybyggda bostäder, antal",
    "N07905": "Färdigställda småhus per 1 000 invånare",
    "B_NY_SMAHUS": "Färdigställda småhus, antal",
    "N07906": "Färdigställda lägenheter i flerbostadshus per 1 000 invånare",
    "B_NY_FLERBO": "Färdigställda lägenheter i flerbostadshus, antal",
    "N07923": "Planberedskap, möjliga nya bostäder i gällande detaljplaner per 1 000 invånare",
    "N07908": "Pris för bostadsrätter, kr per kvm",
    "N07909": "Pris för småhus, kr per kvm",
    "N02938": "Hushåll, antal",
    "N02942": "Ensamstående hushåll, andel (%)",
    "N02943": "Sammanboende hushåll, andel (%)",
    "N02944": "Övriga hushåll, andel (%)",
    "N07914": "Trångbodda i flerbostadshus enligt norm 3, andel (%)",
    "N07907": "Trångbodda i flerbostadshus enligt norm 2, andel (%)",
    "N66081": "Invånare med ansträngd boendeekonomi, andel (%)",
    "N45920": "Hushållens energianvändning, MWh per invånare",
  },
  lagtArBra: ["N07914", "N07907", "N66081", "N45920"],
};

export default bostader;
