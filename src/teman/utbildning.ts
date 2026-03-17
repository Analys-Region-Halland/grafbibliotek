import type { TemaConfig } from "./tema-config";

const utbildning: TemaConfig = {
  temaId: "utbildning",
  temaNamn: "Utbildning och kompetens",
  temaFarg: "lila",
  kortNamn: {
    "N01982_KV": "Kvinnor",
    "N01982_MAN": "Män",
    "N01983_KV": "Kvinnor",
    "N01983_MAN": "Män",
    "N01984_KV": "Kvinnor",
    "N01984_MAN": "Män",
    "N15507_KV": "Flickor",
    "N15507_MAN": "Pojkar",
    "N15428_KV": "Flickor",
    "N15428_MAN": "Pojkar",
    "N17473_KV": "Kvinnor",
    "N17473_MAN": "Män",
  },
  sektioner: [
    {
      id: "forgymnasial",
      namn: "Förgymnasial utbildning, 25–64 år",
      kpiIds: ["N01984"],
      undersektioner: [
        { namn: "Kvinnor och män", kpiIds: ["N01984_KV", "N01984_MAN"] },
      ],
    },
    {
      id: "gymnasial",
      namn: "Gymnasial utbildning, 25–64 år",
      kpiIds: ["N01983"],
      undersektioner: [
        { namn: "Kvinnor och män", kpiIds: ["N01983_KV", "N01983_MAN"] },
      ],
    },
    {
      id: "eftergymnasial",
      namn: "Eftergymnasial utbildning, 25–64 år",
      kpiIds: ["N01982"],
      undersektioner: [
        { namn: "Kvinnor och män", kpiIds: ["N01982_KV", "N01982_MAN"] },
      ],
    },
    {
      id: "meritvarde",
      namn: "Meritvärde åk 9",
      kpiIds: ["N15507"],
      undersektioner: [
        { namn: "Flickor och pojkar", kpiIds: ["N15507_KV", "N15507_MAN"] },
      ],
    },
    {
      id: "behorighet",
      namn: "Behörighet till yrkesprogram",
      kpiIds: ["N15428"],
      undersektioner: [
        { namn: "Flickor och pojkar", kpiIds: ["N15428_KV", "N15428_MAN"] },
      ],
    },
    {
      id: "hogskolebeh",
      namn: "Högskolebehörighet inom 3 år",
      kpiIds: ["N17473"],
      undersektioner: [
        { namn: "Kvinnor och män", kpiIds: ["N17473_KV", "N17473_MAN"] },
      ],
    },
  ],
  visningsnamn: {
    "N01982": "Invånare 25–64 år med eftergymnasial utbildning, andel (%)",
    "N01982_KV": "Kvinnor 25–64 år med eftergymnasial utbildning, andel (%)",
    "N01982_MAN": "Män 25–64 år med eftergymnasial utbildning, andel (%)",
    "N01983": "Invånare 25–64 år med gymnasial utbildning, andel (%)",
    "N01983_KV": "Kvinnor 25–64 år med gymnasial utbildning, andel (%)",
    "N01983_MAN": "Män 25–64 år med gymnasial utbildning, andel (%)",
    "N01984": "Invånare 25–64 år med förgymnasial utbildning, andel (%)",
    "N01984_KV": "Kvinnor 25–64 år med förgymnasial utbildning, andel (%)",
    "N01984_MAN": "Män 25–64 år med förgymnasial utbildning, andel (%)",
    "N15507": "Genomsnittligt meritvärde i årskurs 9, poäng",
    "N15507_KV": "Genomsnittligt meritvärde i årskurs 9, flickor, poäng",
    "N15507_MAN": "Genomsnittligt meritvärde i årskurs 9, pojkar, poäng",
    "N15428": "Behöriga till gymnasiets yrkesprogram efter årskurs 9, andel (%)",
    "N15428_KV": "Behöriga till yrkesprogram efter årskurs 9, flickor, andel (%)",
    "N15428_MAN": "Behöriga till yrkesprogram efter årskurs 9, pojkar, andel (%)",
    "N17473": "Högskolebehörighet inom 3 år efter gymnasiet, andel (%)",
    "N17473_KV": "Högskolebehörighet inom 3 år efter gymnasiet, kvinnor, andel (%)",
    "N17473_MAN": "Högskolebehörighet inom 3 år efter gymnasiet, män, andel (%)",
  },
};

export default utbildning;
