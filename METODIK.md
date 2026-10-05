# METODIK — Kommundata Halland

## 1. Projektöversikt

Dashboard för samhällsekonomisk och ekonomiskgeografisk analys av
Hallands sex kommuner och Region Halland. Data hämtas från flera
källor (Kolada, SCB, Excel), bearbetas i R och presenteras i ett
React/D3-gränssnitt.

**Målgrupp:** Kommunala beslutsfattare, analytiker, journalister.
**Syfte:** Ge snabb överblick och kontextuell förståelse av kommunens
position relativt andra Hallandskommuner och rikssnittet.


## 2. Arkitekturprincip — temabaserad modularisering

Projektet är byggt kring **teman** (Befolkning, Sysselsättning,
Ekonomi, Utbildning osv.). Varje tema är en självständig modul med
egen konfiguration, datahämtning och bearbetning. Den gemensamma
infrastrukturen (cache, hämtningsfunktioner, bearbetningslogik,
frontend-komponenter) återanvänds av alla teman.

**Varför:** Med 10+ teman behöver varje tema kunna läggas till,
ändras och felsökas utan att röra andra temans kod. En AI-assistent
behöver bara läsa temats config-fil och den gemensamma modulen
som berörs — inte hela kodbasen.

**Princip för nya teman:**

1. Skapa `R/teman/<tema_id>/config.R` — definierar KPI:er, sektioner, enheter
2. Skapa `app/src/teman/<tema_id>.ts` — frontend-config (sektioner, visningsnamn, färg)
3. Registrera i `R/teman/register.R` (automatiskt via mappstruktur)
4. Registrera i `app/src/teman/index.ts` (import + lägg till i TEMAN-array)
5. Kör pipeline: `kap01-hamta.R` → `kap02-bearbeta.R` → `kap04-exportera.R`

Ingen annan fil behöver ändras.


## 3. Mappstruktur

```
kommundata/
├── R/                              # Datapipeline
│   ├── paket.R                     # Paketladdning (source:as av alla skript)
│   ├── sok-kpi.R                   # Sök i lokalt cachat KPI-register
│   ├── komplettera-kpier.R         # Inkrementell hämtning (legacy, mall)
│   │
│   ├── gemensam/                   # Delad infrastruktur
│   │   ├── cache.R                 # Cache-metadata: läs/skriv/kontrollera
│   │   ├── hamta-kolada.R          # Generisk Kolada-hämtning
│   │   ├── hamta-scb.R             # Generisk SCB/PxWeb-hämtning
│   │   ├── hamta-excel.R           # Excel-läsning till standardformat
│   │   └── bearbeta.R              # Rikssnitt, trender, ranking, beräknade KPI:er
│   │
│   ├── teman/                      # Tema-konfigurationer
│   │   ├── register.R              # Ladda/lista alla teman (autodetect via mappar)
│   │   ├── befolkning/
│   │   │   ├── config.R            # KPI:er, sektioner, enheter, par, beräknade
│   │   │   └── bearbeta.R          # Tema-specifik bearbetning (mall, tom för bef.)
│   │   ├── sysselsattning/         # (skapas vid behov)
│   │   │   ├── config.R
│   │   │   └── bearbeta.R
│   │   └── ...                     # Fler teman
│   │
│   ├── kap01-hamta.R               # Steg 1: Hämta rådata (alla teman)
│   ├── kap02-bearbeta.R            # Steg 2: Bearbeta data (alla teman)
│   ├── kap03-ai-analys.R           # Steg 3: underlag + kontroll av analystexter
│   └── kap04-exportera.R           # Steg 4: Exportera till JSON + tema-config
│
├── data/                           # Genererade datafiler (gitignore:ade)
│   ├── hamtning-meta-{tema_id}.rds # Cache-metadata per tema
│   ├── kommun-register.rds         # Kommunlista (hämtas en gång)
│   ├── kolada-kpi-register.rds     # KPI-register (6 200+ indikatorer)
│   ├── radata-{tema_id}.rds        # Rådata per tema
│   ├── bearbetad-{tema_id}.rds     # Bearbetad data per tema
│   ├── kpi-meta-{tema_id}.rds      # KPI-metadata per tema
│   ├── halland-data.json           # Sammanfogad data alla teman
│   ├── halland-meta.json           # Sammanfogad metadata alla teman
│   ├── halland-senaste.json        # Senaste år, bara Halland
│   ├── halland-teman.json          # Tema-konfiguration för frontend
│   └── excel/                      # Excel-källfiler (gitignore:ade)
│
├── app/                            # React + Vite frontend
│   ├── public/data/                # JSON-filer kopierade från data/
│   ├── src/
│   │   ├── main.tsx                # Entry point
│   │   ├── App.tsx                 # Huvudkomponent — renderar teman dynamiskt
│   │   ├── types.ts                # Datatyper, Hallands kommun-koder
│   │   ├── teman/                  # Tema-konfigurationer (frontend)
│   │   │   ├── tema-config.ts      # Typer + färgklasser
│   │   │   ├── index.ts            # Tema-register + hjälpfunktioner
│   │   │   ├── befolkning.ts       # Sektioner, visningsnamn, färg
│   │   │   └── ...                 # Fler teman
│   │   ├── components/
│   │   │   ├── TemaBlock.tsx       # Generisk tema-container med sektioner
│   │   │   ├── KommunValjare.tsx   # Kommun/region-väljare
│   │   │   ├── KpiKort.tsx         # Nyckeltalskort med sparklines
│   │   │   ├── KpiModal.tsx        # Detaljvy med tidsserie
│   │   │   └── GuidadBerattelse.tsx # Guidad berättelse-modal
│   │   ├── charts/                 # D3-visualiseringar
│   │   │   ├── Tidsserie.tsx       # Tidsseriediagram
│   │   │   ├── Sparkline.tsx       # Liten sparkline
│   │   │   ├── Beeswarm.tsx        # Beeswarm-distribution
│   │   │   └── RangIndikator.tsx   # Rankingsindikator
│   │   ├── hooks/useData.ts        # Dataladdning
│   │   ├── utils/format.ts         # Svensk talformatering
│   │   └── styles/index.css        # Tailwind
│   ├── package.json
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── .Renviron                       # API-nyckel (GITIGNORE:AD)
├── .gitignore
├── METODIK.md                      # Denna fil
└── kommundata.Rproj
```


## 4. Namnkonventioner

| Kontext          | Format         | Exempel                    |
|------------------|----------------|----------------------------|
| R-variabler      | snake_case     | `skattekraft_per_inv`      |
| R-filer          | gemener-bindestreck | `hamta-kolada.R`      |
| JS/TSX-variabler | camelCase      | `selectedKommun`           |
| TSX-komponenter  | PascalCase     | `KpiKort.tsx`              |
| JSON-nycklar     | snake_case     | `{ "kommun_kod": "1380" }` |
| CSS-klasser      | kebab-case     | `.kpi-kort-header`         |
| Tema-ID:n        | gemener        | `befolkning`, `sysselsattning` |
| Data-filer       | `{prefix}-{tema_id}` | `radata-befolkning.rds` |


## 5. Datakällor

### 5.1 Kolada API

- **Bas-URL:** `https://api.kolada.se/v2/`
- **R-paket:** `rKolada` (CRAN)
- **Autentisering:** Ingen krävs
- **Format:** JSON, max 5 000 poster/sida
- **Lokalt KPI-register:** `data/kolada-kpi-register.rds` (6 200+ KPI:er,
  uppdateras automatiskt var 90:e dag)

#### Hitta KPI-ID:n

Sök ALLTID i det lokala registret innan du frågar API:t:

```r
SOKNING <- "fruktsamhet"
source("R/sok-kpi.R")

# Eller från terminal:
Rscript R/sok-kpi.R "befolkningstäthet"
```

Resultatet visar `id`, `title`, `municipality_type` (K/L/A) och
om KPI:n har könsuppdelning. Sök efter par-KPI:er (andel↔antal)
genom att söka på samma ämnesord.

#### Kolumner från rKolada (simplify=TRUE)

`kpi`, `municipality_id`, `year`, `gender`, `value`, `municipality`
(namn), `municipality_type`

### 5.2 SCB:s API (PxWeb)

- **Bas-URL:** `https://api.scb.se/OV0104/v1/doris/sv/ssd/`
- **R-paket:** `pxweb` (CRAN)
- **Autentisering:** Ingen krävs
- **Rate limit:** Max 10 anrop per 10 sekunder, max 100 000 celler per anrop
- **Format:** Tabulär data (kub-format)

#### Steg för att hitta rätt SCB-tabell

**1. Interaktiv utforskning (i R-konsolen, INTE i skript):**

```r
library(pxweb)
pxweb_interactive("https://api.scb.se/OV0104/v1/doris/sv/ssd/")
```

Navigera genom menyerna, välj tabell, granska variabler.
Kopiera tabell-URL och variabelkoder.

**2. Programmatisk utforskning (lista undermappar):**

```r
# Lista ämnesområden
levels <- pxweb_get("https://api.scb.se/OV0104/v1/doris/sv/ssd/")

# Lista tabeller under Arbetsmarknad
am_levels <- pxweb_get("https://api.scb.se/OV0104/v1/doris/sv/ssd/AM/")
```

**3. Tabell-metadata (variabler och värden):**

```r
# Se vilka variabler en tabell har
meta <- pxweb_get(
  "https://api.scb.se/OV0104/v1/doris/sv/ssd/AM/AM0401/AM0401A/ArbStatusAr"
)

# Eller använd hjälpfunktionen:
source("R/gemensam/hamta-scb.R")
utforska_scb_tabell(
  "https://api.scb.se/OV0104/v1/doris/sv/ssd/AM/AM0401/AM0401A/ArbStatusAr"
)
```

Visar alla variabler, deras koder och tillåtna värden.

**4. Variabelkoder att känna till:**

| Variabel      | SCB-kod   | Exempel                              |
|---------------|-----------|--------------------------------------|
| Region        | Region    | "1380" = Halmstad (samma som Kolada) |
| Kön           | Kon       | "1" = män, "2" = kvinnor, "1+2" = totalt |
| Mätvariabel   | ContentsCode | Unik per tabell                   |
| Tid           | Tid       | "2023", "2024"                       |

**5. Regionkoder SCB vs Kolada:**

| Enhet          | SCB    | Kolada |
|----------------|--------|--------|
| Riket          | `"00"` | `"0000"` |
| Region Halland | `"13"` | `"0013"` |
| Kommuner       | Samma  | Samma  |

Transformeringsfunktionen `transformera_scb_till_kolada_format()` hanterar
denna mappning automatiskt.

**6. Hämta data (efter att du identifierat tabell + variabler):**

```r
# Definiera i tema-configens scb_tabeller-lista:
list(
  url = "https://api.scb.se/OV0104/v1/doris/sv/ssd/AM/AM0210/AM0210D/ArRegArbStatus",
  kpi_id = "S_SYSS_TOT",
  query = list(
    Region = scb_regioner,            # Alla kommuner + regioner + riket
    Kon = c("1+2"),
    Alder = c("20-64"),
    Fodelseregion = c("tot"),
    ContentsCode = c("000002NS"),
    Tid = as.character(2020:2026)      # Breda intervall OK — filtreras automatiskt
  ),
  region_kolumn = "Region",            # ALLTID kodformat (versaler)
  ar_kolumn = "Tid"                    # ALLTID kodformat (versaler)
)
```

**VIKTIGT — undvik onödiga anrop:**
- Filtrera Region till bara Hallands kommuner + riket i query:n
- Begränsa Tid till relevanta år
- Begränsa Kon till "1+2" (totalt) om könsuppdelning inte behövs
- Begränsa ContentsCode till de mätvärden du faktiskt behöver
- Testa ALLTID med ett minimalt anrop först

**Eliminate-principen (se 5.6 nedan):** Variabler som inte är
Region eller Tid ska normalt elimineras till sin totalnivå.
Välj ALDRIG ut 1-årsklasser, enskilda branscher eller
undergrupper om det inte explicit efterfrågas.

#### SCB-specifika tekniska detaljer — VIKTIGT

**Kodformat vs textformat:** `hamta_scb_data()` använder `pxweb_get`
+ `as.data.frame(column.name.type = "code", variable.value.type = "code")`.
Det innebär:

- Kolumnnamn blir **kodnamn** ("Region", "Kon", "Tid"), inte textnamn
  ("region", "kön", "år")
- Regionvärden blir **koder** ("1380"), inte textnamn ("Halmstad")
- Kommun-namn hämtas automatiskt från `kommun-register.rds` vid transformation

Ange därför alltid `region_kolumn = "Region"` och `ar_kolumn = "Tid"` i
SCB-tabellkonfigurationer. Använd ALDRIG `"region"` eller `"år"`.

**Automatisk periodvalidering:** `hamta_tema_scb()` hämtar tabellens
metadata och filtrerar bort år som inte finns i tabellen. Det är säkert
att ange bredare perioder (t.ex. `2020:2026`) — ej tillgängliga år
tas bort automatiskt med ett loggmeddelande.

**KPI-ID-konvention för SCB-teman:**

| Prefix | Betydelse               | Exempel          |
|--------|-------------------------|------------------|
| `S_`   | Andelsmått från SCB     | `S_SYSS_TOT`    |
| `_N`   | Antal-variant (suffix)  | `S_SYSS_TOT_N`  |
| `_INR` | Inrikes födda           | `S_SYSS_INR`    |
| `_UTR` | Utrikes födda           | `S_SYSS_UTR`    |
| `_KV`  | Kvinnor                 | `S_SYSS_KV`     |
| `_MAN` | Män                     | `S_SYSS_MAN`    |

Namngivningen är fri men bör vara konsekvent inom temat. `S_`-prefix
flaggar att KPI:n kommer från SCB (inte Kolada). Bearbetningssteget
hoppar över Kolada-beskrivningshämtning för KPI:er med `S_`-prefix.

### 5.3 Excel-filer

- **Placering:** `data/excel/` (gitignore:ad)
- **R-paket:** `readxl`
- **Användning:** Undantag för data som inte finns i Kolada/SCB
- **Format:** Varje fil spåras i tema-configens `excel_filer`-lista

```r
# I tema-config:
excel_filer = list(
  list(
    filnamn = "pendlingsdata-2024.xlsx",
    kpi_id = "E_PENDLING",
    blad = 1,
    region_kolumn = "kommun_kod",
    varde_kolumn = "antal_pendlare",
    ar_kolumn = "ar"
  )
)
```

### 5.4 Kommuner i scope

| Kommun         | Kod  | Typ |
|----------------|------|-----|
| Halmstad       | 1380 | K   |
| Laholm         | 1381 | K   |
| Falkenberg     | 1382 | K   |
| Varberg        | 1383 | K   |
| Kungsbacka     | 1384 | K   |
| Hylte          | 1315 | K   |
| Region Halland | 0013 | L   |

### 5.5 Rikssnitt

Riket hämtas med kod `0000` (Kolada) / `"00"` (SCB) för jämförelse.


### 5.6 Standardprinciper för datainhämtning — KRITISKT

Dessa principer gäller oavsett datakälla (Kolada, SCB, Excel) och
ska följas strikt vid varje hämtning.

#### Totalnivå som standard

När användaren ber om att hämta ett mått (t.ex. "sysselsättningsgrad",
"antal arbetstillfällen", "medianinkomst") avses **alltid totalen**
om inget annat anges explicit. Det innebär:

- **Kön:** Hämta totalt ("T" i Kolada, "1+2" i SCB). Hämta ALDRIG
  uppdelat på kön om det inte specifikt efterfrågas.
- **Ålder:** Använd den fördefinierade åldersgrupp som måttet avser
  (t.ex. "20–64 år" för sysselsättningsgrad). Hämta ALDRIG enskilda
  1-årsklasser. Om tabellen erbjuder en totalkategori ("totalt 16+ år"),
  välj den.
- **Bransch/sektor:** Hämta totalen ("Samtliga branscher", "Totalt").
  Hämta ALDRIG nedbrytning per SNI-kod om det inte explicit begärs.
- **Utbildningsnivå:** Hämta totalen. Inte per nivå.
- **Övriga dimensioner:** Samma princip — eliminera till totalnivå.

Enda undantagen är **Region** och **Tid**, som alltid ska specificeras
explicit (alla kommuner + riket, relevanta år).

#### Eliminate-mönstret i PxWeb (SCB)

PxWeb-tabeller har ofta många variabler (dimensioner). Principen är:

1. **Behåll:** Region och Tid — dessa specificerar vi alltid explicit.
2. **Eliminera:** Alla andra variabler ska sättas till sin totalnivå.

Konkret i pxweb-queryn:

```r
# BRA — hämtar totalen:
query = list(
  Region = c("1315","1380","1381","1382","1383","1384","00"),
  Kon = c("1+2"),                        # Eliminerat till total
  Alder = c("20-64"),                    # Fördefinierad åldersgrupp
  ContentsCode = c("AM0401I1"),          # Bara den mätvariabel vi behöver
  Tid = as.character(2015:2025)
)

# DÅLIGT — hämtar allt:
query = list(
  Region = c("*"),                       # FEL: alla regioner
  Kon = c("1", "2", "1+2"),             # FEL: alla kön
  Alder = c("16", "17", "18", ...),     # FEL: 1-årsklasser
  ContentsCode = c("*"),                 # FEL: alla mätvärden
  Tid = c("*")                           # FEL: alla år
)
```

#### I Kolada

Kolada-KPI:er är redan aggregerade till rätt nivå (t.ex. "N02267" =
sysselsättningsgrad 20–64 år). Filtrera `gender == "T"` direkt efter
hämtning. Välj ALDRIG könsuppdelad data om det inte explicit begärs.

#### När nedbrytning efterfrågas

Om användaren explicit ber om undergrupper (t.ex. "hämta
sysselsättningsgrad uppdelat på kön" eller "branschfördelning per
SNI-kod"), då och **bara då** hämtas de relevanta underkategorierna.
Dokumentera i tema-configens kommentarer att detta är en medveten
nedbrytning.

#### Sammanfattning — beslutsmodell

```
Användaren ber om ett mått
  → Nämner specifika undergrupper?
    JA  → Hämta de specifika undergrupperna
    NEJ → Hämta totalen, eliminera alla dimensioner utom Region + Tid
```


## 6. Tema-konfiguration — detaljerad guide

### 6.1 R-sidan (R/teman/<tema_id>/config.R)

Varje tema-config returnerar en namngiven lista:

```r
mitt_tema_config <- function() {
  list(
    # ── Obligatoriskt ──
    tema_id    = "mitt_tema",          # Unik identifierare (gemener, inga mellanslag)
    tema_namn  = "Mitt temanamn",      # Visningsnamn
    tema_farg  = "bla",               # Temafärg: gron/bla/rod/lila/gul/brun
    datakalla  = "kolada",            # "kolada", "scb", "excel" eller c("kolada","scb")
    startar    = 2010,                # Första år att hämta

    # ── KPI:er (Kolada) ──
    kpier = c("N02267", "N02268"),    # Vektor med Kolada KPI-ID:n

    # ── Sektioner (frontend-gruppering) ──
    sektioner = list(
      list(
        id = "sektion_id",
        namn = "Sektionsnamn",
        kpi_ids = c("N02267", "N02268")
      )
    ),

    # ── KPI-metadata ──
    kpi_meta = tribble(
      ~kpi_id,   ~enhet,     ~tema,        ~par_kpi_id,
      "N02267",  "procent",  "mitt_tema",  NA_character_,
      "N02268",  "procent",  "mitt_tema",  NA_character_
    ),

    # ── Valfritt: beräknade KPI:er ──
    beraknade_kpier = tribble(
      ~kpi_id,   ~kpi_namn,          ~beskrivning,
      "C99001",  "Beräknat antal X", "Beräknat från andel × population."
    ),
    berakna_antal = list(
      list(andel_kpi_id = "NXXXXX", antal_kpi_id = "CXXXXX")
    ),

    # ── Valfritt: SCB-tabeller ──
    scb_tabeller = list(
      list(
        url = "https://api.scb.se/...",
        kpi_id = "S_XXX",
        query = list(Region = c("1380",...), Tid = c("2020",...)),
        varde_kolumn = "Kolumnnamn i SCB-data",
        region_kolumn = "Region"
      )
    ),

    # ── Valfritt: Excel-filer ──
    excel_filer = list(
      list(filnamn = "fil.xlsx", kpi_id = "E_XXX", ...)
    ),

    # ── Visningsnamn (frontend) ──
    visningsnamn = list(
      "N02267" = "Sysselsättningsgrad",
      "N02268" = "Sysselsättningsgrad, utrikes födda"
    )
  )
}
```

### 6.2 Frontend-sidan (app/src/teman/<tema_id>.ts)

```typescript
import type { TemaConfig } from "./tema-config";

const G = { SYSS: "Sysselsättning" };   // bandens rubriker

const mittTema: TemaConfig = {
  temaId: "mitt_tema",
  temaNamn: "Mitt temanamn",
  temaFarg: "bla",
  nettoKpis: [],           // KPI:er som visas per 1 000 inv.
  ingetIndex: [],           // KPI:er utan index-toggle
  sektioner: [
    {
      id: "sektion_id",
      gruppRubrik: G.SYSS,  // bandet i tabellen
      namn: "Sektionsnamn",
      kpiIds: ["N02267", "N02270"],
      undersektioner: [
        // namn är en nominalfras i gemener: knappen blir "Visa kvinnor och män"
        { namn: "kvinnor och män", delAv: "N02267", kpiIds: ["N02267_KV", "N02267_MAN"] },
      ],
    },
  ],
  visningsnamn: {
    "N02267": "Sysselsättningsgrad",
    "N02270": "Arbetslöshet",
  },
  kortNamn: {               // korta namn på uppdelningens rader
    "N02267_KV": "Kvinnor",
    "N02267_MAN": "Män",
  },
};

export default mittTema;
```

Registrera i `app/src/teman/index.ts`:

```typescript
import mittTema from "./mitt_tema";
export const TEMAN: TemaConfig[] = [befolkning, mittTema];
```

### 6.3 Enhetstyper

| Enhet        | Beskrivning                     | Andel/antal-par? |
|--------------|---------------------------------|------------------|
| `procent`    | Procentandel                    | Ja (sök antal)   |
| `antal`      | Heltal                          | Ja (sök andel)   |
| `kvot`       | Kvotmått (t.ex. försörjningskvot) | Nej            |
| `år`         | Ålder, t.ex. medelålder         | Nej              |
| `barn/kvinna`| Summerad fruktsamhet            | Nej              |
| `inv/kvm`    | Befolkningstäthet               | Nej              |
| `kr/inv`     | Kronor per invånare             | Nej              |
| `tkr/inv`    | Tusen kronor per invånare       | Nej              |
| `per 1 000 inv.` | Netto-KPI:er normaliserade  | Nej              |

**Regel: Hämta alltid både andel- och antal-variant** av KPI:er som
har par i Kolada. Frontenden behöver båda för andel/antal-toggle.


## 7. Datapipeline — steg för steg

### 7.0 Datapolicy — KRITISKT

**Kolada API har ingen dokumenterad rate limit men vi behandlar det
som en begränsad resurs. SCB har explicit rate limit (10 anrop/10 sek).**

1. **Specificera municipality-koder explicit** i varje API-anrop.
   Hämta ALDRIG med bara kpi + period.
2. **Filtrera kön=T direkt efter hämtning** — sparar 2/3 av raderna.
3. **Cache med metadata per tema** — `data/hamtning-meta-{tema_id}.rds`.
4. **Inkrementell uppdatering** — vid ny körning hämtas BARA perioder
   som inte redan finns i cachen.
5. **Minst 30 dagar mellan uppdateringskontroller** mot API:t.
6. **`force <- TRUE`** i .GlobalEnv tvingar omhämtning av alla teman.

### Steg 0: Hitta KPI-ID:n / SCB-tabeller

**Kolada:** Sök i lokalt register med `R/sok-kpi.R`.

**SCB:**

```r
# 1. Utforska interaktivt
pxweb_interactive("https://api.scb.se/OV0104/v1/doris/sv/ssd/")

# 2. Granska tabell
source("R/gemensam/hamta-scb.R")
utforska_scb_tabell("https://api.scb.se/OV0104/v1/doris/sv/ssd/AM/AM0401/...")
```

### Steg 1: Hämta (kap01-hamta.R)

Loopar över alla registrerade teman i `R/teman/`:

```bash
Rscript R/kap01-hamta.R
```

Per tema:
- Läser `R/teman/{tema_id}/config.R`
- Kontrollerar cache (`data/hamtning-meta-{tema_id}.rds`)
- Hämtar via Kolada, SCB och/eller Excel beroende på `datakalla`
- Sparar till `data/radata-{tema_id}.rds`

### Steg 2: Bearbeta (kap02-bearbeta.R)

Loopar över alla teman:

```bash
Rscript R/kap02-bearbeta.R
```

Per tema:
- Läser `data/radata-{tema_id}.rds`
- Hämtar KPI-beskrivningar från Kolada
- Beräknar antal-KPI:er (andel × totalbefolkning)
- Kopplar rikssnitt och differenser
- Beräknar trender (5-årsförändring, eller kortare om data saknas)
- Rangordnar bland alla 290 kommuner
- Sparar till `data/bearbetad-{tema_id}.rds`

### Steg 3: AI-analys (kap03-ai-analys.R)

- En analys per tema och enhet (Halland + sex kommuner)
- Underlag ur bearbetad data, siffror kontrolleras mot underlaget, cache per hash
- Se CLAUDE.md avsnitt "AI-analys" och R/analys/systemprompt.md

### Steg 4: Exportera (kap04-exportera.R)

Sammanfogar alla teman:

```bash
Rscript R/kap04-exportera.R
```

- Samlar `bearbetad-{tema_id}.rds` och `kpi-meta-{tema_id}.rds` från alla teman
- Exporterar fyra JSON-filer:
  - `halland-data.json` — all data alla teman
  - `halland-meta.json` — all KPI-metadata
  - `halland-senaste.json` — senaste år per KPI, bara Halland
  - `halland-teman.json` — tema-konfiguration (sektioner, visningsnamn, färger)
- Kopierar till `app/public/data/`


## 8. Indikatorurval (KPI:er)

### 8.0 Band, indikatorer och uppdelningar

Tabellen har tre nivåer, och temats config bestämmer var varje KPI hamnar:

1. **Band** (`gruppRubrik`, eller sektionens `namn` när sektionen har flera indikatorer):
   en grupp av indikatorer som hör ihop, till exempel *Födda, döda och flyttningar*.
   Varje tema har två till fyra band med tre till sex indikatorer (konjunktur har fler).
2. **Indikator** (`kpiIds`): ett mått med egen innebörd. Andel utrikes födda, andel
   kvinnor, medelålder och försörjningskvot är indikatorer, inte uppdelningar av folkmängden.
3. **Uppdelning** (`undersektioner`): visar hur en indikators helhet fördelar sig, antingen
   samma mått för delgrupper (kön, födelseregion, åldersgrupper, bransch, boendeform) eller
   flödena bakom ett netto (födda och döda, in- och utflyttningar, in- och utpendlare).
   En uppdelning hör till exakt en indikator (`delAv`, krävs när sektionen har flera) och är
   ihopfälld tills läsaren klickar på knappen under indikatorns namn. Uppdelningens `namn`
   skrivs som nominalfras i gemener eftersom knappen blir *Visa {namn}*.

Samma mått i en annan enhet (andel och antal, per invånare och per bil) är inte en uppdelning
utan ett par: ange `par_kpi_id` i R-metan så att popupen kan växla mellan dem.

En KPI förekommer en gång per tema. `node app/scripts/exportera-teman.mjs` kontrollerar
strukturen (dubbletter, `delAv`, tomma och delade band) och avbryter med fel; kap03 stannar då.
Analysunderlaget i kap03 följer samma ordning: varje uppdelning står direkt efter sin indikator.

### 8.1 Indikatorerna per tema (oktober 2026)

Konfigurationerna är källan: `R/teman/<tema>/config.R` (KPI:er, enheter,
beskrivningar) och `app/src/teman/<tema>.ts` (band, ordning, uppdelningar,
visningsnamn). Listan nedan är en överblick: band, indikatorer och inom hakparentes
uppdelningarna som fälls ut under indikatorn.

**Befolkning & demografi** (grön; SCB)
- Folkmängd och tillväxt: folkmängd [åldersgrupperna], årlig befolkningsförändring, befolkningstäthet
- Födda, döda och flyttningar: födelsenetto [födda och döda], summerad fruktsamhet, inrikes flyttnetto [in- och utflyttningar], utrikes flyttnetto [in- och utvandringar]
- Ålder och sammansättning: medelålder, försörjningskvot [yngre och äldre], utrikes födda, kvinnor

**Arbetsmarknad** (blå; SCB BAS 20–64 år från 2020, Kolada)
- Befolkningen 20–64 år: sysselsättning, arbetskraftsdeltagande och arbetslöshet [kvinnor och män; inrikes och utrikes födda], sammanräknad förvärvsinkomst (median)
- Unga och långtidsarbetslösa: arbetslöshet 18–24 år (från 2023), unga 16–24 år som varken arbetar eller studerar, långtidsarbetslösa av de arbetslösa

**Utbildning och kompetens** (lila; Kolada)
- Utbildningsnivå 25–64 år: förgymnasial, gymnasial, eftergymnasial [kvinnor och män]
- Skolresultat: meritvärde åk 9, behörighet till yrkesprogram [flickor och pojkar], högskolebehörighet inom tre år [kvinnor och män]

**Bostäder** (gul; Kolada)
- Bostadsbestånd och byggande: bostäder per 1 000 invånare [upplåtelseformerna], nybyggda bostäder [småhus och flerbostadshus], planberedskap
- Hushåll och boende: hushåll [hushållstyperna], trångboddhet i flerbostadshus enligt norm 3 och norm 2, ansträngd boendeekonomi, hushållens energianvändning
- Priser: bostadsrätter och småhus, kr per kvm

**Näringsliv** (röd; SCB, Kolada)
- Sysselsatta efter arbetsställe: totalt [kön; födelseregion; branscherna; utbildningsnivåerna], näringslivet och offentlig sektor [kön; födelseregion]
- Tillväxt i antal sysselsatta: samma indelning som ovan, årlig förändring
- Yrkesställning och företagande: anställda, företagare i AB, egenföretagare [födelseregion; andelen kvinnor], nystartade företag, företagsförekomster

**Turism & besöksnäring** (röd; Tillväxtverkets inkvarteringsstatistik)
- Gästnätter: totalt [svenska och utländska gäster; boendeformerna], per invånare, årlig förändring, andel utländska
- Gästankomster: svenska, utländska, andel utländska
- Kapacitet och beläggning: anläggningar, gästnätter per anläggning, rums- och bäddbeläggning
- Intäkter: logiintäkter, per gästnatt, årlig förändring

**Konjunktur** (blå; SCB månad och kvartal, Tillväxtverket; preliminära uppgifter)
- Sysselsättning, arbetslöshet och arbetskraft [kön; födelseregion], dagbefolkning [branscherna], gästnätter [svenska och utländska], folkmängd och påbörjade lägenheter [småhus och flerbostadshus]

**Miljö & klimat** (grön; Kolada)
- Utsläpp till luft: växthusgaser per invånare [sektorerna, sorterade efter storlek], kväveoxider, partiklar (PM2,5)
- Energi och omställning: energianvändning i transporter, förnybar elproduktion, ekologiskt brukad åkermark
- Avfall och skyddad natur: insamlat kommunalt avfall, materialåtervinning, skyddad natur [land, hav och inlandsvatten]

**Kollektivtrafik & transport** (lila; Kolada, SCB, Trafikanalys)
- Pendling: pendlingskvot, in- och utpendlingsandel, nettopendling [in- och utpendlare; dag- och nattbefolkning]
- Kollektivtrafik och resande: resor per invånare, kollektivtrafiknära läge [inom och utanför tätort], nytillkomna bostäder i kollektivtrafiknära läge, förnybara drivmedel, nettokostnad, färdtjänst
- Fordonsflotta och elektrifiering: personbilar per 1 000 invånare, andel elbilar, laddhybrider och fossiloberoende bilar, laddpunkter [normal- och snabbladdare]
- Bilresande och trafiksäkerhet: körsträcka, drivmedelsleveranser, trafikolyckor med räddningsinsats

**Socioekonomi & hälsa** (röd; Kolada, Folkhälsomyndigheten)
- Hälsa, psykisk hälsa och levnadsvanor: de flesta [kvinnor och män]
- Inkomster och försörjning: ekonomisk standard [kvinnor och män], ginikoefficienter, varaktigt låg ekonomisk standard, ekonomiskt bistånd

**Önskvärd riktning (`lagtArBra`, `hogtArBra`).** Förändringar, platsens färg och spårets
tonade ytterfjärdedelar färgas bara där riktningen är entydig. Lågt är bra: arbetslöshet,
trångboddhet, ansträngd boendeekonomi, utsläpp, ohälsa, olyckor. Högt är bra:
sysselsättning och arbetskraftsdeltagande, meritvärde och behörighet, förnybar el,
materialåtervinning, ekologisk åkermark, skyddad natur, kollektivtrafiknära läge och
resande, förnybart i kollektivtrafiken, elbilar och fossiloberoende bilar, självskattad
hälsa och medellivslängd. Övriga visas neutralt (befolkning, priser, branschstruktur,
utbildningsnivå, inkomster), eftersom ett högre eller lägre värde där inte i sig är bättre.

**Beskrivningarna** följer källans definition (för Kolada: KPI:ns definition i
Kolada) och slutar med källan. Tolkningar ("måttet visar att ...") hör inte hemma i
beskrivningen. Kontroll: hämta Koladas definitioner med `https://api.kolada.se/v3/kpi/<id>`
och jämför, se §12 Steg 4.

**Jämförbarhet.** Två inställningar skyddar mot jämförelser som datan inte bär:

- `serie_fran` (R-config) tar bort åren före ett seriebrott i kap02. Bostäder: hushåll,
  hushållstyper, upplåtelseformer och bostäder per 1 000 invånare börjar 2016 (hushållen i riket
  ökar med 206 000 mellan 2015 och 2016 mot cirka 60 000 andra år).
- `lanEjJamforbar` och `lanEjJamforbarText` (frontend-config) markerar KPI:er där länets värde
  mäter något annat än kommunernas: pendlingsandelar och pendlingskvot (länsgränsen mot
  kommungränsen) och folkhälsoenkätens mått (nationellt urval för länet, regionalt urval för
  kommunerna). Länet visas då inte som jämförelse för en kommun, varken i tabellen, figurerna
  eller analysunderlaget.

Kända egenheter i källorna som inte rättas i pipelinen: Koladas utsläppsserier saknar
2011–2014 (ingen tioårsförändring), turismens logiintäkter hoppar 2019 utan motsvarande
ökning i gästnätterna, och befolkningens komponenter 2025 (CKM) summerar inte exakt till
folkmängdens förändring.

## 9. AI-analys — specifikation

### 9.1 Arbetssätt
- Texterna skrivs av Claude Code i en session (Max-planen), inte via API. kap03 bygger
  underlag och uppdragslista, Claude Code skriver, kap03 kontrollerar och sammanställer.
  Se CLAUDE.md avsnitt "AI-analys".

### 9.2 Systemprompt (sammanfattad; fullständig i R/analys/systemprompt.md)
- Saklig, resonerande ton — public policy-text
- Siffror i kontext via jämförelser (rikssnitt, grannkommuner)
- Förklara varför, inte bara vad
- Procent utskrivet, decimalkomma, mellanslag i tusental
- Inga värdeladdade ord
- Max 150 ord per temaanalys


## 10. Frontend — specifikation

### 10.1 Teknikstack
- **Bundler:** Vite
- **Framework:** React 19 + TypeScript
- **Visualisering:** D3.js
- **Styling:** Tailwind CSS 4
- **Typsnitt:** Inter (brödtext), JetBrains Mono (siffror/data)

### 10.2 Tema-rendering

App.tsx renderar teman dynamiskt från `TEMAN`-arrayen i
`app/src/teman/index.ts`. Varje tema renderas av `TemaBlock.tsx` som
tar emot tema-config, metadata och KPI-data. Inga temaspecifika
if-satser eller switch-cases i App.tsx — allt styrs av konfigurationen.

### 10.3 Dataarkitektur
- Sidan laddar bara det aktiva områdets kompakta tabellfil, `halland-tabell-<tema>.json`
  (0,2–2 MB): riket, Halland och de sex kommunerna med alla år och fält, övriga kommuner och
  regioner bara vid de perioder som någon av de åtta har som senaste. Det räcker för
  tabellen, tooltipen och jämförelsen; kap04 skriver filen ur temats config.
- Hela temafilen, `halland-data-<tema>.json` (alla 312 enheter och år, 6–29 MB), hämtas
  först när graf och karta öppnas (`useHelaTemat` i `hooks/useData.ts`).
- Regionernas rang bland landets 21 regioner räknas i kap04, så att även Hallands plats
  vid basåret finns.
- Jämförelsepunkter (rikssnitt, rangordning bland 290) alltid synliga
- Filerna laddas en gång per område och cachas i minnet

### 10.4 Vyer och komponenter

**Adress.** `#/<enhet>/<tema>` är ett område och `#/<enhet>/<tema>/<kpi>` en öppen
indikator. Enheten är `halland`, en kommun eller `alla`. Startsidan är första området för
Halland; det finns ingen översiktssida, så att datan står i förgrunden. Kommunväljaren i
sidhuvudet har Halland, kommunerna norr till söder och *Alla sida vid sida*.

**Område**
1. Ingång: analysens rubrik och ingress med genväg till hela texten
2. Tabellen (`TemaTabell`): band, indikatorer och uppdelningar (§8.0), med spår, plats och
   tooltip per rad. Med *Alla sida vid sida* visas kommunerna i kolumner (`JamforTabell`)
   tillsammans med länets analys.
3. Hela analysen under tabellen

**Detaljvy (klick på en indikator → popup)**
1. Tidsserie (D3) — vald kommun + rikssnitt + alla kommuner, direktetiketterad
2. Växling mellan parade mått (andel och antal med mera), index, per 1 000 invånare
3. Karta och jämförelser
4. PNG/SVG-nedladdning

### 10.5 Designsystem — Tufte-principer

Gränssnittet följer Edward Tuftes principer för informationsdesign.

**Grundprinciper:**
1. **Hög data-ink-kvot** — varje pixel ska bära information
2. **Inga chart-junk** — inga rutlinjer, 3D, gradients
3. **Direktetikettering** — data-labels direkt på element
4. **Sparklines** — små, ordlösa grafer integrerade med siffror
5. **Small multiples** — samma graf upprepad per KPI
6. **Kontextuell jämförelse** — rikssnitt + median alltid synligt
7. **Vitt utrymme** — generöst whitespace
8. **Minimal interaktion** — allt viktigt syns direkt

**Grafspecifikationer:**
- Tidsserier: tunn linje (1.5px), inga punkter förutom senaste värde
- Rikssnitt: tunn grå linje, ingen etikett förrän hover
- Sparklines: 40–80px breda, ingen axel, bara linje + start/slutvärde
- Stapeldiagram: horisontella, sorterade, direktetiketterade
- Inga animationer utom snabb fade-in (150ms)
- Inga tooltips som primär informationskälla

### 10.6 Färgsystem

**Primärfärger:**

| Namn    | 1 (djup)  | 2 (medel) | 3 (ljus)  | 4 (bakgrund) |
|---------|-----------|-----------|-----------|---------------|
| Grön    | #00664D   | #00AB60   | #C1E8C4   | #E3F4E2       |
| Blå     | #004990   | #2DB8F6   | #A2D9F8   | #E2F6FF       |
| Röd     | #A51300   | #FF5F4A   | #FFBFC1   | #FEE6E7       |

**Sekundärfärger:**

| Namn    | 1 (djup)  | 2 (medel) | 3 (ljus)  | 4 (bakgrund) |
|---------|-----------|-----------|-----------|---------------|
| Lila    | #433C9D   | #6473D9   | #C0C6FF   | #E8EBFF       |
| Gul     | #FF7E00   | #FFD939   | #FFEA96   | #FEF8E8       |
| Brun    | #59392E   | #895B42   | #C69675   | #EFCDB6       |

**Neutrala:**

| Svart   | Grå 1     | Grå 2     | Vit       |
|---------|-----------|-----------|-----------|
| #000000 | #83888A   | #D6D6D6   | #FFFFFF   |

**Temafärger** (`temaFarg` i temats config; `TEMA_FARG_HEX` i `tema-config.ts`):
- Grön: Befolkning & demografi, Miljö & klimat
- Blå: Arbetsmarknad, Konjunktur
- Lila: Utbildning och kompetens, Kollektivtrafik & transport
- Gul: Bostäder
- Röd: Näringsliv, Turism & besöksnäring, Socioekonomi & hälsa

**Kommunernas fasta färger** (`ENHET_FARG` i `types.ts`, grafriktlinjen VIS-01):
Kungsbacka #0C8C7E, Varberg #004990, Falkenberg #FF7E00, Halmstad #A51300,
Laholm #8cd211, Hylte #7b2d8e. Halland #555555 (streckad i spåret), riket svart streck
i spåret och #999999 i diagram.

**Önskvärd riktning:** förbättring #00664D (grön 1) och försämring #A51300 (röd 1) på
förändringen och platsen; i spåret ljusgrön #E3F4E2 och ljusröd #FEE6E7 på de yttre
fjärdedelarna, grå #EEF0F2 på den mittersta hälften. Bara när `lagtArBra` eller `hogtArBra` är satt.

**Jämför kommuner:** cellfärgen visar läget bland landets kommuner i en neutral blå
skala, inte önskvärdhet.

### 10.7 Typografi

- Rubriker: Inter 600, 1.1rem
- Brödtext: Inter 400, 0.875rem
- Datavärden: JetBrains Mono 500, 1rem
- Små etiketter: Inter 400, 0.75rem, Grå 1
- Svensk formatering: decimalkomma, mellanslag i tusental


## 11. Körordning

```bash
# 1. Kör R-pipeline (alla teman bearbetas automatiskt)
Rscript R/kap01-hamta.R
Rscript R/kap02-bearbeta.R
# Rscript R/kap03-ai-analys.R  # Valfritt
Rscript R/kap04-exportera.R

# 2. Starta frontend
cd app && npm install && npm run dev
```


## 12. Checklista — lägga till nytt tema

### Steg 1: Identifiera data

- [ ] Identifiera KPI:er via `R/sok-kpi.R` (Kolada) och/eller `utforska_scb_tabell()` (SCB)
- [ ] Hämta alltid andel + antal där par finns
- [ ] **SCB:** Notera exakta variabelkoder (ContentsCode) från tabellens metadata
- [ ] **SCB:** Verifiera vilka år som finns tillgängliga (`Tid`-variabeln i metadata)

### Steg 2: Skapa config-filer

- [ ] Skapa `R/teman/<tema_id>/config.R` med alla obligatoriska fält
  - **SCB:** `region_kolumn = "Region"`, `ar_kolumn = "Tid"` (versaler, kodformat)
  - **SCB:** KPI-ID:n med `S_`-prefix, `_N`-suffix för antal
  - Alla KPI:er behöver entry i `kpi_meta` (enhet, tema, par_kpi_id)
  - Alla KPI:er behöver entry i `beraknade_kpier` (kpi_namn, beskrivning)
  - Alla KPI:er behöver entry i `visningsnamn`
- [ ] Skapa `R/teman/<tema_id>/bearbeta.R` (kan vara tom mall)
- [ ] Skapa `app/src/teman/<tema_id>.ts` med sektioner och visningsnamn
  - Sektioner listar bara andels-KPI:er (inte `_N`), antal nås via `par_kpi_id` i modal
  - `visningsnamn` ska inkludera BÅDE andel- och antal-KPI:er
- [ ] Registrera i `app/src/teman/index.ts` (import + lägg till i TEMAN-array)

### Steg 3: Kör pipeline

- [ ] `Rscript R/kap01-hamta.R` — kontrollera att hämtning lyckas
  - SCB: Verifiera att municipality_id-matchning fungerar (inte alla NA)
  - Kontrollera radantal (regioner × år × KPI:er)
- [ ] `Rscript R/kap02-bearbeta.R` — kontrollera radantal
  - Trender beräknas automatiskt; om data < 5 år används kortare intervall
- [ ] `Rscript R/kap04-exportera.R` — kontrollera JSON
  - `halland-senaste.json` ska inkludera det nya temat (per-KPI senaste år)

### Steg 4: Verifiera

- [ ] `npm run build` i `app/`: inga TypeScript-fel (samma kontroll som CI)
- [ ] Temat i tabellen: alla indikatorer har data för Halland, kommunerna och riket; uppdelningarna fälls ut
- [ ] Raden öppnar graf och karta (tidsserie, andel/antal där `par_kpi_id` finns)
- [ ] Visningsnamnets enhet stämmer med `enhet` i R-metan (andel, per 1 000 invånare, kr per kvm …)
- [ ] Beskrivningarna följer källans definition och slutar med källan. För Kolada: jämför med
      `https://api.kolada.se/v3/kpi/<id>` (tröskelvärden, avstånd, åldrar, period, nämnare, källa).
      Granskningen 2026-10-05 hittade påhittade definitioner i transport och miljö.
- [ ] Svensk formatering på alla siffror
- [ ] Inga hemligheter i git

### Steg 5: Dokumentera

- [ ] Uppdatera sektion 8 i denna fil med det nya temats KPI:er

### Kända gotchas

- **SCB returnerar kodformat** när `hamta_scb_data()` anropas — kolumnnamn
  och värden är koder ("Region", "1380"), inte text ("region", "Halmstad")
- **Olika teman har olika senaste år** — export-steget hanterar detta med
  per-KPI senaste år i `halland-senaste.json`
- **SCB:s tidsperioder kan vara begränsade** — auto-filtrering tar bort
  år som inte finns, men kontrollera loggmeddelanden
- **Alla 312 regioner hämtas** för ranking (290 K + 21 L + riket) —
  kommun-register.rds styr vilka som accepteras
- **bearbeta.R hoppar automatiskt** över Kolada-beskrivningshämtning
  för KPI:er med prefix `S_`, `C_` eller `E_` — dessa måste ha
  `beraknade_kpier` i config


## 13. Stilguide — analystext

Se CLAUDE.md sektion "Textstil" och "Vid textskrivning".

Kortfattat:
- Saklig, resonerande ton
- Jämförelser ger kontext: "Hyltes sysselsättningsgrad på 78,3 procent
  ligger 3,1 procentenheter under rikssnittet och är lägst i Halland"
- Förklara samband: "Den höga utpendlingen hänger samman med närheten
  till Göteborgs arbetsmarknad"
- Undvik: "hög", "låg", "bra", "dålig" utan referenspunkt
- Format: decimalkomma, mellanslag som tusenavsavskiljare
