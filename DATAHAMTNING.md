# Datahämtning från svenska offentliga API:er i R

Heltäckande guide för att hämta kommundata från SCB, Kolada, Folkhälsomyndigheten, Tillväxtverket och Trafikanalys. Dokumentet täcker API-scanning, variabelkontroll, query-uppbyggnad, cachning och sparning till RDS.

---

## Innehåll

1. [Paket och beroenden](#1-paket-och-beroenden)
2. [SCB PxWeb API](#2-scb-pxweb-api)
3. [Kolada API (rKolada)](#3-kolada-api-rkolada)
4. [Folkhälsomyndigheten (FoHM) API](#4-folkhälsomyndigheten-fohm-api)
5. [Tillväxtverket öppna data](#5-tillväxtverket-öppna-data)
6. [Trafikanalys API](#6-trafikanalys-api)
7. [Cachning och inkrementell uppdatering](#7-cachning-och-inkrementell-uppdatering)
8. [Standardformat och sparning](#8-standardformat-och-sparning)
9. [Regionkoder och mappningar](#9-regionkoder-och-mappningar)
10. [Fallgropar och lärdommar](#10-fallgropar-och-lärdommar)

---

## 1. Paket och beroenden

```r
library(pxweb)        # PxWeb-API:er (SCB, FoHM)
library(rKolada)      # Kolada-API:t
library(httr2)        # HTTP-anrop (Trafikanalys m.fl.)
library(jsonlite)     # JSON-parsning
library(readr)        # TSV/CSV-läsning (Tillväxtverket)
library(readxl)       # Excel-filer
library(dplyr)        # Datamanipulation
library(tidyr)        # Pivotering
library(stringr)      # Stränghantering
library(glue)         # Stränginterpolering
library(purrr)        # Funktionell iteration
```

---

## 2. SCB PxWeb API

### 2.1 Översikt

| Egenskap | Värde |
|---|---|
| Bas-URL | `https://api.scb.se/OV0104/v1/doris/sv/ssd/` |
| Protokoll | PxWeb v1 (REST + JSON-stat) |
| Autentisering | Ingen (öppen data) |
| Rate limit | Max 10 anrop per 10 sekunder |
| Celltak | Max 100 000 celler per anrop |
| R-paket | `pxweb` |

### 2.2 Steg 1 — Hitta rätt tabell (scanning)

SCB:s API är hierarkiskt. Man navigerar ner genom ämnesområden till enskilda tabeller.

#### Interaktiv utforskning (i konsolen)

```r
# Öppnar en interaktiv meny — bra för att lära känna strukturen
pxweb::pxweb_interactive("https://api.scb.se/OV0104/v1/doris/sv/ssd/")
```

Menyn visar ämnesområden (AM = Arbetsmarknad, BE = Befolkning osv.). Man klickar sig ner och får till slut en tabell-URL och en färdig query att kopiera till sitt skript.

#### Programmatisk utforskning

```r
# Lista ämnesområden
scb_rot <- pxweb::pxweb_get("https://api.scb.se/OV0104/v1/doris/sv/ssd/")

# Lista undertabeller i Arbetsmarknad
scb_am <- pxweb::pxweb_get("https://api.scb.se/OV0104/v1/doris/sv/ssd/AM/")

# Lista tabeller i en specifik underkategori
scb_tab <- pxweb::pxweb_get(
  "https://api.scb.se/OV0104/v1/doris/sv/ssd/AM/AM0210/AM0210A/"
)
```

Varje nivå returnerar en lista med `id` och `text`. Tabeller har `type == "t"`.

### 2.3 Steg 2 — Granska tabellens variabler

När du hittat en tabell-URL, inspektera vilka variabler (dimensioner) den innehåller och vilka koder som finns.

```r
tabell_url <- "https://api.scb.se/OV0104/v1/doris/sv/ssd/AM/AM0210/AM0210A/ArbStatusM"

# Hämta metadata (utan data)
tabell_meta <- pxweb::pxweb_get(tabell_url)

# Skriv ut alla variabler, koder och etiketter
for (var in tabell_meta$variables) {
  cat("\n---", var$code, "---\n")
  cat("Text:", var$text, "\n")
  cat("Antal värden:", length(var$values), "\n")
  # Visa första 10 koder + etiketter
  n <- min(10, length(var$values))
  for (i in seq_len(n)) {
    cat("  ", var$values[i], "=", var$valueTexts[i], "\n")
  }
  if (length(var$values) > 10) cat("  ... och", length(var$values) - 10, "till\n")
}
```

**Viktigt att notera:**

- `Region` — vilka geografiska nivåer som finns (kommun, län, riket)
- `Kon` — könsvariabel: `"1"` = män, `"2"` = kvinnor, `"1+2"` = totalt
- `Alder` — ibland 1-årsklasser (100+), ibland färdiga grupper ("20-64")
- `ContentsCode` — de faktiska måtten (sysselsatta, arbetslösa osv.)
- `Tid` — tidsperioder som strängar ("2024", "2024M01" för månadsdata)

### 2.4 Steg 3 — Bygg query och hämta

```r
# Definiera vilka värden vi vill ha för varje variabel
query <- list(
  Region       = c("1380", "1381", "1382", "1383", "1384", "1315", "13", "00"),
  Kon          = c("1+2"),           # Bara totalt
  Alder        = c("20-64"),         # Bara den åldersgruppen vi vill ha
  ContentsCode = c("000002NS"),      # Specifikt mått
  Tid          = as.character(2015:2025)
)

px_query <- pxweb::pxweb_query(query)

# Hämta data
px_data <- pxweb::pxweb_get(url = tabell_url, query = px_query)
```

#### Konvertera till data.frame — KRITISKT: använd kodformat

```r
df <- as.data.frame(px_data,
  column.name.type    = "code",    # Kolumnnamn som koder ("Region"), inte text
  variable.value.type = "code",    # Värden som koder ("1380"), inte text ("Halmstad")
  stringsAsFactors    = FALSE
)
```

**Varför kodformat?** Med `"text"` får man "Halmstads kommun" i stället för "1380", vilket gör joins och mappningar opålitliga. Koder är stabila; etiketter kan ändras.

### 2.5 Steg 4 — Validera resultatet

```r
# Kontrollera dimensioner
cat("Rader:", nrow(df), "\n")
cat("Kolumner:", paste(names(df), collapse = ", "), "\n")

# Kontrollera att alla regioner finns med
unique(df$Region)

# Kontrollera att alla år finns med
sort(unique(df$Tid))

# Kontrollera NA-andel
cat("NA-värden:", sum(is.na(df[[ncol(df)]])), "av", nrow(df), "\n")
```

### 2.6 Hantera stora tabeller (gruppinhämtning)

SCB:s celltak på 100 000 celler innebär att man ibland behöver dela upp hämtningen. Antalet celler beräknas som produkten av alla valda värden:

```
celler = length(Region) × length(Kon) × length(Alder) × length(ContentsCode) × length(Tid)
```

Om man behöver alla 290 kommuner × 20 år × 5 mått = 29 000 celler (OK). Men om tabellen har 100 åldersgrupper × 290 kommuner × 20 år = 580 000 celler (för mycket).

#### Strategi: dela upp på den största dimensionen

```r
# Dela kommuner i grupper om max 50
alla_kommuner <- c("0114", "0115", "0120", ...) # 290 kommuner
grupper <- split(alla_kommuner, ceiling(seq_along(alla_kommuner) / 50))

resultat <- purrr::map_dfr(grupper, function(kommun_grupp) {
  query$Region <- kommun_grupp
  px_query <- pxweb::pxweb_query(query)
  px_data <- pxweb::pxweb_get(url = tabell_url, query = px_query)

  as.data.frame(px_data,
    column.name.type    = "code",
    variable.value.type = "code",
    stringsAsFactors    = FALSE
  )
})

cat("Totalt hämtade rader:", nrow(resultat), "\n")
```

#### Pausa mellan anrop (rate limit)

```r
resultat <- purrr::map_dfr(grupper, function(kommun_grupp) {
  Sys.sleep(1)  # 1 sekund mellan anrop — håller oss under 10/10s
  # ... hämtning som ovan
})
```

### 2.7 Månadsdata från SCB

Vissa SCB-tabeller har månadsperioder i formatet `"2024M01"`, `"2024M03"` osv.

```r
# Generera månadskoder
generera_manadskoder <- function(startar, slutar) {
  ar <- rep(startar:slutar, each = 12)
  manad <- rep(sprintf("%02d", 1:12), times = slutar - startar + 1)
  paste0(ar, "M", manad)
}

query$Tid <- generera_manadskoder(2020, 2025)

# Parsa tillbaka efter hämtning
df <- df |>
  mutate(
    ar    = as.integer(str_sub(Tid, 1, 4)),
    manad = as.integer(str_sub(Tid, 6, 7))
  )
```

---

## 3. Kolada API (rKolada)

### 3.1 Översikt

| Egenskap | Värde |
|---|---|
| Bas-URL | `https://api.kolada.se/v2/` |
| R-paket | `rKolada` |
| Autentisering | Ingen |
| Nyckelkoncept | KPI-ID:n (t.ex. "N01951" = Folkmängd) |

Kolada aggregerar nyckeltal från kommuner och regioner — ofta samma underliggande data som SCB men förbearbetad och standardiserad.

### 3.2 Steg 1 — Sök efter nyckeltal

```r
# Sök KPI:er med fritextsökning
sokresultat <- rKolada::get_kpi(q = "sysselsättning")

# Visa relevanta kolumner
sokresultat |>
  select(id, title, description) |>
  print(n = 20)
```

Varje KPI har ett ID som börjar med N (nationell) eller U (jämförelse). Exempel:
- `N01951` — Folkmängd totalt
- `N02267` — Sysselsättningsgrad 20-64 år, procent
- `N02268` — Sysselsatta 20-64 år, antal

### 3.3 Steg 2 — Hämta kommunregister

```r
# Hämta alla kommuner och regioner
alla_enheter <- rKolada::get_municipality()

# Inspektera: 312 enheter (290 K + 21 L + riket)
alla_enheter |> count(type)
#   type     n
#   K      290
#   L       21
#   R        1   (riket, id = "0000")
```

**KRITISKT:** Spara alla koder du behöver, och skicka dem ALLTID i API-anropet (se nästa steg).

### 3.4 Steg 3 — Hämta data

```r
# Definiera vilka kommuner vi vill ha
kommun_koder <- c("1380", "1381", "1382", "1383", "1384", "1315",  # Hallands kommuner
                   "0013",                                           # Region Halland
                   "0000")                                           # Riket

# Hämta data för specifika KPI:er, kommuner och år
radata <- rKolada::get_values(
  kpi    = c("N01951", "N02267", "N02268"),
  municipality = kommun_koder,   # ALDRIG utelämna denna parameter
  period = 2010:2025,
  simplify = TRUE                # Returnerar data.frame istället för lista
)
```

#### Kolumnnamn vid `simplify = TRUE`

| Kolumn | Typ | Beskrivning |
|---|---|---|
| `kpi` | chr | KPI-ID ("N01951") |
| `municipality_id` | chr | Kommunkod ("1380") |
| `year` | int | År (2024) |
| `gender` | chr | "T" = totalt, "K" = kvinnor, "M" = män |
| `value` | dbl | Värdet |
| `municipality` | chr | Kommunnamn ("Halmstad") |
| `municipality_type` | chr | "K", "L" eller "R" |

### 3.5 Steg 4 — Filtrera direkt efter hämtning

```r
radata <- radata |>
  filter(gender == "T")  # Behåll bara totalnivån

# Om du behöver könsuppdelning för specifika KPI:er:
kon_data <- radata_full |>
  filter(
    (gender == "T") |
    (kpi %in% c("N01803", "N01804") & gender %in% c("K", "M"))
  )
```

### 3.6 Validera

```r
# Kontrollera att vi inte fick stadsdelar eller historiska koder
radata |> distinct(municipality_id) |> nrow()
# Förväntat: lika många som vi skickade in

# Kontrollera KPI-täckning
radata |>
  group_by(kpi) |>
  summarise(
    ar_min   = min(year),
    ar_max   = max(year),
    n_kommun = n_distinct(municipality_id),
    na_andel = mean(is.na(value))
  )
```

### 3.7 Varning: utan municipality-filter

Om du utelämnar `municipality`-parametern returnerar Kolada data för **alla ~3 900 enheter** — inklusive stadsdelar (t.ex. Stockholms "0180C1A03"), historiska koder och samverkansområden. Det ger ~12× mer data än nödvändigt och är svårt att filtrera i efterhand.

---

## 4. Folkhälsomyndigheten (FoHM) API

### 4.1 Översikt

| Egenskap | Värde |
|---|---|
| Bas-URL | `https://fohm-app.folkhalsomyndigheten.se/Folkhalsodata/api/v1/sv` |
| Protokoll | PxWeb v1 (samma som SCB) |
| R-paket | `pxweb` |
| Autentisering | Ingen |
| Rate limit | 1 000 anrop per 10 sekunder, max 1 000 värden per anrop |

FoHM exponerar folkhälsodata via PxWeb — samma teknik som SCB. Tabeller med suffix `yreg.px` eller `Reg.px` har kommundata.

### 4.2 Steg 1 — Hitta tabeller

Tabellstrukturen ligger under `A_Folkhalsodata/`:

```r
# Lista huvudkategorier
fohm_rot <- pxweb::pxweb_get(
  "https://fohm-app.folkhalsomyndigheten.se/Folkhalsodata/api/v1/sv/A_Folkhalsodata/"
)

# Lista underkategorier (t.ex. hälsoutfall)
fohm_halsa <- pxweb::pxweb_get(
  "https://fohm-app.folkhalsomyndigheten.se/Folkhalsodata/api/v1/sv/A_Folkhalsodata/A_Mo8/"
)
```

#### Viktiga tabeller med kommundata

| Tabell | Sökväg | Typ | Perioder |
|---|---|---|---|
| halsgodyreg.px | Halsoutfall/01Overgrip/01.01halsgod | Enkät | 4-årsperioder |
| DinkReg.px | 4_Inkomst/01Fordelink/04.01Dink | Register | Enskilda år |
| SuicidVuxReg.px | Halsoutfall/02Pyskhals/02.07.02SuicidVux | Register | 5-årsperioder |
| ValReg.px | 7_Kontroll/01Demokrati/07.01Val | Register | Valår |

### 4.3 Steg 2 — Granska variabler

Samma mönster som SCB:

```r
tabell_url <- paste0(
  "https://fohm-app.folkhalsomyndigheten.se/Folkhalsodata/api/v1/sv/",
  "A_Folkhalsodata/A_Mo8/Halsoutfall/01Overgrip/01.01halsgod/halsgodyreg.px"
)

meta <- pxweb::pxweb_get(tabell_url)
for (var in meta$variables) {
  cat("\n---", var$code, "---\n")
  cat("Antal värden:", length(var$values), "\n")
  for (i in seq_len(min(5, length(var$values)))) {
    cat("  ", var$values[i], "=", var$valueTexts[i], "\n")
  }
}
```

### 4.4 Steg 3 — Hämta och hantera specialfall

#### Enkätdata med konfidensintervall

Många FoHM-tabeller har en variabel `"Andel och konfidensintervall"` med fyra nivåer: Andel, KI nedre, KI övre och Antal svar. Dessa behöver pivoteras.

```r
query <- list(
  Region                          = c("1380", "00"),
  KonGrupp                        = c("00"),            # "00" = totalt
  `Andel och konfidensintervall`  = c("Andel", "KI Nedre", "KI Övre"),
  Tid                             = c("2021-2024")
)

px_query <- pxweb::pxweb_query(query)
px_data <- pxweb::pxweb_get(url = tabell_url, query = px_query)

df <- as.data.frame(px_data,
  column.name.type    = "code",
  variable.value.type = "text",    # FoHM-text behövs ibland för KI-etiketter
  stringsAsFactors    = FALSE
)

# Pivotera KI-variabeln till separata kolumner
df_pivoterad <- df |>
  pivot_wider(
    names_from  = `Andel och konfidensintervall`,
    values_from = values
  ) |>
  rename(
    varde    = Andel,
    ki_lower = `KI Nedre`,
    ki_upper = `KI Övre`
  )
```

#### Rullande perioder

FoHM enkätdata använder 4-årsperioder ("2021-2024"). Extrahera slutåret för att kunna jämföra med andra datakällor:

```r
df <- df |>
  mutate(ar = as.integer(str_sub(Tid, 6, 9)))  # "2021-2024" → 2024
```

#### Könskoder varierar mellan tabeller

| Tabelltyp | Totalt | Kvinnor | Män |
|---|---|---|---|
| Enkättabeller | `"00"` | `"01"` | `"02"` |
| Registertabeller | `"1+2"` | `"1"` | `"2"` |

Kontrollera alltid vilka koder som gäller för den specifika tabellen.

### 4.5 Pacing

```r
# FoHM klarar många anrop, men var trevlig:
Sys.sleep(0.5)  # Mellan varje tabellanrop
```

---

## 5. Tillväxtverket öppna data

### 5.1 Översikt

| Egenskap | Värde |
|---|---|
| Bas-URL | `https://oppnadata.tillvaxtverket.se/data/inkvartering/` |
| Format | Tabbseparerad text (TSV), Latin-1-kodning |
| Licens | CC0 (public domain) |
| Uppdatering | Månatligen |

Tillväxtverkets inkvarteringsstatistik laddas ner som platta filer — inget API-anrop i vanlig mening.

### 5.2 Tillgängliga filer

| Fil | Innehåll |
|---|---|
| `GuestNights_Capacity_Revenue_Year.txt` | Gästnätter + kapacitet + intäkter per år × kommun × anläggningstyp |
| `GuestNights_Capacity_Revenue_Month.txt` | Samma, månadsdata |
| `GuestNights_Country_Year.txt` | Gästnätter per hemland (svenskt/utländskt) |
| `GuestNights_Country_Month.txt` | Samma, månadsdata |

### 5.3 Hämta och läs

```r
url <- "https://oppnadata.tillvaxtverket.se/data/inkvartering/GuestNights_Capacity_Revenue_Year.txt"

# Ladda ner till tempfil (stor fil, undvik att läsa direkt från URL)
tempfil <- tempfile(fileext = ".txt")
download.file(url, tempfil, mode = "wb")

# Läs med korrekt kodning
df <- readr::read_tsv(
  tempfil,
  locale = readr::locale(encoding = "latin1"),
  show_col_types = FALSE
)
```

### 5.4 Geografimappning

Filen har kolumnerna `NIVA_NAMN`, `KOMMUN_KOD` och `LAN_KOD`:

```r
df <- df |>
  mutate(
    municipality_id = case_when(
      NIVA_NAMN == "Riket"  ~ "0000",
      NIVA_NAMN == "Län"    ~ str_pad(LAN_KOD, 4, pad = "0", side = "left"),  # "13" → "0013"
      NIVA_NAMN == "Kommun" ~ KOMMUN_KOD                                       # "1380" → "1380"
    )
  ) |>
  filter(!is.na(municipality_id))  # Filtrera bort "Sekretesskyddad"
```

### 5.5 Aggregering per anläggningstyp

Data kommer uppdelat per anläggningstyp (Hotell, Camping, Vandrarhem osv.). Summera till totaler:

```r
totalt <- df |>
  group_by(municipality_id, AR) |>
  summarise(
    gast_totalt = sum(GASTNATTER, na.rm = TRUE),
    ankomster   = sum(ANKOMSTER, na.rm = TRUE),
    .groups = "drop"
  )
```

---

## 6. Trafikanalys API

### 6.1 Översikt

| Egenskap | Värde |
|---|---|
| Data-URL | `https://api.trafa.se/api/data` |
| Struktur-URL | `https://api.trafa.se/api/structure` |
| Format | JSON (egenutvecklat, ej PxWeb) |
| R-paket | `httr` + `jsonlite` |

### 6.2 Utforska tillgängliga tabeller

```r
# Hämta alla tabeller
struktur <- httr::GET("https://api.trafa.se/api/structure") |>
  httr::content(as = "text", encoding = "UTF-8") |>
  jsonlite::fromJSON(simplifyVector = TRUE)
```

### 6.3 Hämta data (pipe-separerad query)

Trafikanalys använder ett eget query-format med pipe-separerade segment:

```r
# Format: Tabell|mått|dimension:filter|dimension:filter
query_str <- "T10026|itrfslut|ar:2023|reglan:13|regkom"

url <- paste0("https://api.trafa.se/api/data?query=", URLencode(query_str))

resp <- httr::GET(url)
json <- httr::content(resp, as = "text", encoding = "UTF-8")
data_raw <- jsonlite::fromJSON(json, simplifyVector = TRUE)
```

### 6.4 Parsa svaret

Svaret har en nästlad struktur med `Header$Column` (kolumnnamn) och `DataRows` (rader med `Cell`):

```r
# Extrahera kolumnnamn
kolnamn <- data_raw$Header$Column$Name

# Extrahera rader
rader <- purrr::map_dfr(data_raw$DataRows, function(rad) {
  varden <- rad$Cell$Value
  names(varden) <- kolnamn
  as_tibble(t(varden))
})
```

---

## 7. Cachning och inkrementell uppdatering

### 7.1 Princip

API-anrop tar tid och belastar källorna. Ett cache-system bör:

1. Spara metadata om vad som hämtats (tidsstämpel, perioder, KPI:er)
2. Bara hämta nya perioder vid uppdatering
3. Ha en minsta tid mellan kontroller (t.ex. 30 dagar)
4. Kunna tvinga omhämtning vid behov

### 7.2 Metadata-struktur

```r
# Spara cache-metadata efter varje lyckad hämtning
meta <- list(
  tidsstampel    = Sys.time(),
  kpi_ids        = kpi_ids,            # Vilka KPI:er som hämtades
  perioder       = perioder,           # Vilka perioder som finns i cachen
  senaste_period = max(as.integer(perioder)),
  antal_rader    = nrow(radata)
)

saveRDS(meta, glue("data/hamtning-meta-{tema_id}.rds"))
```

### 7.3 Beslutsfunktion

```r
kontrollera_cache <- function(tema_id, kpi_ids, alla_perioder, min_dagar = 30) {

  meta_fil <- glue("data/hamtning-meta-{tema_id}.rds")

  # Ingen cache → hämta allt

if (!file.exists(meta_fil)) return("full")

  meta <- readRDS(meta_fil)

  # KPI-lista ändrad → hämta allt
  if (!setequal(meta$kpi_ids, kpi_ids)) return("full")

  # Tvinga omhämtning (sätt force <- TRUE i .GlobalEnv)
  if (exists("force", envir = .GlobalEnv) && isTRUE(get("force", envir = .GlobalEnv))) {
    return("full")
  }

  # Beräkna dagar sedan senaste hämtning
  dagar_sedan <- as.numeric(difftime(Sys.time(), meta$tidsstampel, units = "days"))

  # Finns nya perioder som inte hämtats?
  nya_perioder <- setdiff(alla_perioder, meta$perioder)

  if (dagar_sedan < min_dagar && length(nya_perioder) == 0) {
    return("ingen")         # Allt är uppdaterat
  }

  if (length(nya_perioder) > 0) {
    return("inkrementell")  # Hämta bara nya perioder
  }

  return("kontrollera")     # Gammalt men inget nytt att hämta — kolla API
}
```

### 7.4 Inkrementell uppdatering

```r
cache_status <- kontrollera_cache(tema_id, kpi_ids, alla_perioder)

if (cache_status == "ingen") {
  message("Cache aktuell — hoppar över hämtning")
  radata <- readRDS(glue("data/radata-{tema_id}.rds"))

} else if (cache_status == "inkrementell") {
  nya_perioder <- setdiff(alla_perioder, meta$perioder)
  message(glue("Hämtar {length(nya_perioder)} nya perioder"))

  nya_data <- hamta_data(kpi_ids, perioder = nya_perioder)
  befintlig <- readRDS(glue("data/radata-{tema_id}.rds"))

  radata <- bind_rows(befintlig, nya_data)

} else {
  message("Full hämtning")
  radata <- hamta_data(kpi_ids, perioder = alla_perioder)
}
```

---

## 8. Standardformat och sparning

### 8.1 Gemensamt format

Oavsett datakälla transformeras all data till samma format innan sparning:

| Kolumn | Typ | Beskrivning | Exempel |
|---|---|---|---|
| `kpi` | chr | Nyckeltal-ID | "N01951", "S_SYSS_TOT", "F_HALSGOD" |
| `municipality_id` | chr | 4-siffrig kommunkod | "1380", "0013", "0000" |
| `municipality` | chr | Namn | "Halmstad", "Region Halland" |
| `municipality_type` | chr | Enhetstyp | "K" (kommun), "L" (län/region), "R" (riket) |
| `year` | int | År | 2024 |
| `gender` | chr | Kön | "T" (totalt), "K" (kvinnor), "M" (män) |
| `value` | dbl | Värdet | 105234 |

### 8.2 Transformering från SCB-format

```r
transformera_scb <- function(scb_df, kpi_id, region_kol, ar_kol, varde_kol,
                             kommun_register) {
  scb_df |>
    transmute(
      kpi            = kpi_id,
      municipality_id = case_when(
        .data[[region_kol]] == "00"                       ~ "0000",
        nchar(.data[[region_kol]]) == 2                   ~ paste0("00", .data[[region_kol]]),
        TRUE                                              ~ .data[[region_kol]]
      ),
      year           = as.integer(.data[[ar_kol]]),
      gender         = "T",
      value          = as.numeric(.data[[varde_kol]])
    ) |>
    left_join(
      kommun_register |> select(municipality_id = id, municipality = title, municipality_type = type),
      by = "municipality_id"
    )
}
```

### 8.3 Spara som RDS

```r
# Säkerställ att data/-mappen finns
if (!dir.exists("data")) dir.create("data", recursive = TRUE)

# Spara rådata
saveRDS(radata, glue("data/radata-{tema_id}.rds"))

# Spara cache-metadata
meta <- list(
  tidsstampel    = Sys.time(),
  kpi_ids        = unique(radata$kpi),
  perioder       = as.character(sort(unique(radata$year))),
  senaste_period = max(radata$year),
  antal_rader    = nrow(radata)
)
saveRDS(meta, glue("data/hamtning-meta-{tema_id}.rds"))

message(glue(
  "Sparade {nrow(radata)} rader för {tema_id} ",
  "({n_distinct(radata$kpi)} KPI:er, ",
  "{min(radata$year)}-{max(radata$year)})"
))
```

---

## 9. Regionkoder och mappningar

### 9.1 Kodformat per källa

| Enhet | Kolada | SCB | FoHM | Tillväxtverket |
|---|---|---|---|---|
| Riket | `"0000"` | `"00"` | `"00"` | NIVA_NAMN="Riket" |
| Region (t.ex. Halland) | `"0013"` | `"13"` | `"13"` | LAN_KOD="13" |
| Kommun (t.ex. Halmstad) | `"1380"` | `"1380"` | `"1380"` | KOMMUN_KOD="1380" |

### 9.2 Standardisering till 4-siffrig Kolada-kod

```r
standardisera_regionkod <- function(kod, niva = NULL) {
  case_when(
    kod == "00" | niva == "Riket"  ~ "0000",
    nchar(kod) == 2                ~ paste0("00", kod),
    TRUE                           ~ kod
  )
}
```

### 9.3 Enhetstyp

```r
# Bestäm typ utifrån kod
bestam_typ <- function(municipality_id) {
  case_when(
    municipality_id == "0000"                          ~ "R",  # Riket
    str_detect(municipality_id, "^00[0-9]{2}$")        ~ "L",  # Län/region
    TRUE                                               ~ "K"   # Kommun
  )
}
```

---

## 10. Fallgropar och lärdommar

### 10.1 Alltid explicit municipality/region-filter

**Kolada:** Utan `municipality`-parameter returneras ~3 900 enheter (stadsdelar, historiska koder, samverkansorgan). Filtrera inte i efterhand — skicka koderna i anropet.

**SCB:** Utan `Region`-filter hämtas alla regioner. Mindre kritiskt men ger onödigt stora svar.

### 10.2 Alltid totalnivå först

Hämta bara totalvärden (kön = totalt, alla åldrar sammanslaget) om inte köns- eller åldersuppdelning explicit behövs. Detaljerade nedbrytningar ger exponentiellt fler celler och riskerar att spräcka celltaket.

### 10.3 Alltid kodformat (SCB/FoHM)

Använd `column.name.type = "code"` och `variable.value.type = "code"` vid `as.data.frame()`. Textetiketter kan ändras mellan API-versioner och innehåller ibland specialtecken som bryter joins.

### 10.4 Hämta både andel OCH antal

När ett mått finns som både andel (procent) och antal (absoluta tal), hämta båda. Det gör det möjligt att visa relativa och absoluta jämförelser utan att beräkna baklänges.

### 10.5 Encoding (Tillväxtverket)

Tillväxtverkets filer är Latin-1-kodade. Utan `locale(encoding = "latin1")` blir svenska tecken korrupta.

### 10.6 Rullande perioder (FoHM)

FoHM enkätdata rapporteras som fyraårsperioder ("2021-2024"). Använd slutåret som referensår för jämförelse med årliga datakällor.

### 10.7 Konfidensintervall (FoHM)

Enkätdata har KI-kolumner inbakade i en variabel som måste pivoteras. Glöm inte att ta med dem — de behövs för att bedöma tillförlitligheten i kommundata (små kommuner = breda intervall).

### 10.8 Celltaket (SCB)

Räkna ut antal celler innan du anropar. Vid >100 000 celler: dela upp i grupper och iterera med `purrr::map_dfr()`. Lägg in `Sys.sleep(1)` mellan anrop.

### 10.9 NA-hantering

Alla API:er kan returnera NA (uppgift saknas, sekretesskyddad, ej applicerbar). Filtrera bort NA-rader efter hämtning men *innan* beräkningar:

```r
radata <- radata |> filter(!is.na(value))
```

### 10.10 Rate limiting per källa

| Källa | Begränsning | Rekommenderad paus |
|---|---|---|
| SCB | 10 anrop / 10 sek | `Sys.sleep(1)` |
| Kolada | Ej dokumenterat | Inget behov vid normal användning |
| FoHM | 1 000 anrop / 10 sek | `Sys.sleep(0.5)` |
| Trafikanalys | Ej dokumenterat | `Sys.sleep(1)` |
| Tillväxtverket | N/A (filedladdning) | N/A |
