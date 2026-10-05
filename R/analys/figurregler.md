# Figurer i analysen

Analysen står under tabellen med alla nyckeltal. Figurerna ska visa det som tabellen inte
visar, och varje figur ska bära ett påstående i stycket före den. Läs listan över tillåtna
KPI:er i `data/analys-underlag/<id>.figurer.json` (id, namn, enhet, roll och perioder).
Använd bara de id:na.

## Antal och placering

- En till tre figurer per text, högst en efter varje stycke.
- `efter` är styckets index (0 för första stycket). Figuren står efter stycket vars
  påstående den visar, aldrig före det.
- Ingen figur för något som texten inte tar upp.

## Typerna

| Typ | KPI:er | Visar | Använd när |
|---|---|---|---|
| `utveckling` | 1 | Enheten över tid med Halland och riket (för antal bara enheten) | Den långa trenden och var det senaste året hamnar i den. Förstahandsvalet för stycket om det centrala mönstret. |
| `delar` | 2–5 komponenter, `summa` = totalen | Staplade komponenter per år, totalen som punkt | Vad en förändring består av, till exempel befolkningsförändringen: födelsenetto, inrikes och utrikes flyttnetto. |
| `halland` | 1 | Hallands kommuner som staplar, länet och riket som linjer, senaste året | Jämförelsen med grannkommunerna och länet. |
| `uppdelning` | 2–5 | Delgruppernas serier för enheten, till exempel kvinnor och män | Skillnader eller förändringar mellan grupper som texten tar upp. |
| `landet` | 1 | Enheten bland landets kommuner (för länet: regioner), med kvartilerna | När placeringen i landet är poängen. Tabellen visar redan detta per rad, så använd den sparsamt. |

För befolkningsförändringens komponenter: `{"typ": "delar", "kpi": ["S_FODELSENETTO_ANTAL",
"S_INRIKES_NETTO_ANTAL", "S_UTRIKES_NETTO_ANTAL"], "summa": "S_BEF_FORANDR_ANTAL"}`.

`fran` (första period) är valfri. Utelämna den, så visas hela serien: figuren ska ge den
långa trenden. Ange `fran` bara när serien har ett brott eller när en tidigare del saknar
betydelse för påståendet, aldrig för att förstora en förändring.

## Rubriken

- Rubriken är budskapet: vad figuren visar, i en mening utan punkt, högst tio ord.
  "Tillväxten har bromsat in efter tjugo år av ökning", inte "Befolkningsförändring
  2000–2025". Måttet, enheten och perioden står redan under rubriken.
- Samma regler som texten: siffror bara ur underlaget, inga tankstreck, inget procenttecken.
- Samma tidsperspektiv som texten: en rubrik får inte bygga på det senaste året ensamt när
  den långa trenden säger något annat.
- Rubriken ska stämma för det figuren faktiskt visar (enheten, perioden, jämförelsen).

## Format

```json
"figurer": [
  {"efter": 0, "typ": "utveckling", "kpi": ["S_BEF_FORANDR_PCT"],
   "rubrik": "Tillväxten har bromsat in efter tjugo år av ökning"},
  {"efter": 1, "typ": "halland", "kpi": ["S_BEF_FORANDR_PCT"],
   "rubrik": "Kungsbacka och Varberg växer snabbast i länet"}
]
```

`kap03` och `kontrollera-text.R` kontrollerar typ, antal KPI:er, att id:na finns för texten,
placeringen och rubrikens siffror. En ogiltig figur publiceras inte; texten publiceras ändå.
