# demo.R — Hämta och bearbeta befolkningsdata från SCB via pxweb
#
# Visar steg för steg hur man:
#   1. Utforskar en SCB-tabell (metadata)
#   2. Bygger en query
#   3. Hämtar data
#   4. Konverterar till data.frame
#   5. Transformerar till långformat
#   6. Beräknar index, procentuell förändring, trender

library(pxweb)
library(dplyr)
library(tidyr)

# ══════════════════════════════════════════════════════════════════════════════
# DEL 1 — HÄMTNING
# ══════════════════════════════════════════════════════════════════════════════

# ── 1. Tabell-URL ────────────────────────────────────────────────────────────
# SCB:s befolkningstabell "Folkmängd efter region, civilstånd, ålder och kön"
tabell_url <- "https://api.scb.se/OV0104/v1/doris/sv/ssd/BE/BE0101/BE0101A/BefolkningNy"

# ── 2. Utforska tabellen — se vilka variabler och värden som finns ───────────
meta <- pxweb_get(tabell_url)
meta  # Skriv ut variabelnamn, koder och antal värden

# ── 3. Bygg query ───────────────────────────────────────────────────────────
# Hallands kommuner + Region Halland + Riket, totalt kön, totalålder, 2000–2024
query <- list(
  Region       = c("00", "13", "1315", "1380", "1381", "1382", "1383", "1384"),
  Civilstand   = "OG+G+SK+EP",
  Alder        = "tot",
  Kon          = "1+2",
  ContentsCode = "BE0101N1",
  Tid          = as.character(2000:2024)
)

# ── 4. Hämta data ───────────────────────────────────────────────────────────
px_data <- pxweb_get(url = tabell_url, query = query)

# ── 5. Konvertera till data.frame ────────────────────────────────────────────
# Med klartext (läsbart)
df_ratt <- as.data.frame(px_data,
  column.name.type    = "text",
  variable.value.type = "text"
)

head(df_ratt)
str(df_ratt)

# ══════════════════════════════════════════════════════════════════════════════
# DEL 2 — TRANSFORMERING: brett → långt format
# ══════════════════════════════════════════════════════════════════════════════

# pxweb ger oss en bred data.frame med kolumner för region, civilstånd, ålder,
# kön, år och folkmängd. Vi plockar ut det vi behöver och ger svenska namn.

df <- df_ratt |>
  select(
    region = region,
    ar     = år,
    varde  = `Folkmängden den 1 november`
  ) |>
  mutate(
    ar    = as.integer(ar),
    varde = as.numeric(varde)
  ) |>
  arrange(region, ar)

head(df)

# ══════════════════════════════════════════════════════════════════════════════
# DEL 3 — BERÄKNINGAR
# ══════════════════════════════════════════════════════════════════════════════

# ── 3a. Index (basår 2000 = 100) ────────────────────────────────────────────
# Visar relativ utveckling oberoende av befolkningsstorlek

basar <- df |>
  filter(ar == 2000) |>
  select(region, basvarde = varde)

df <- df |>
  left_join(basar, by = "region") |>
  mutate(
    index = round(varde / basvarde * 100, 1)
  )

df |> filter(region == "Halmstad") |> head()

# ── 3b. Årlig förändring (absolut och procentuell) ──────────────────────────
# Jämför varje år med föregående år

df <- df |>
  group_by(region) |>
  arrange(ar) |>
  mutate(
    forandring_abs = varde - lag(varde),
    forandring_pct = round((varde - lag(varde)) / lag(varde) * 100, 2)
  ) |>
  ungroup()

df |> filter(region == "Halmstad") |> head()

# ── 3c. Kumulativ procentuell förändring sedan basåret ──────────────────────

df <- df |>
  mutate(
    kumulativ_pct = round((varde - basvarde) / basvarde * 100, 2)
  )

# ── 3d. Förändring 5 år och 10 år ──────────────────────────────────────────

varden_5ar <- df |>
  select(region, ar, v_5 = varde) |>
  mutate(ar = ar + 5L)

varden_10ar <- df |>
  select(region, ar, v_10 = varde) |>
  mutate(ar = ar + 10L)

df <- df |>
  left_join(varden_5ar, by = c("region", "ar")) |>
  left_join(varden_10ar, by = c("region", "ar")) |>
  mutate(
    forandring_5ar_abs = varde - v_5,
    forandring_5ar_pct = round((varde - v_5) / v_5 * 100, 2),
    forandring_10ar_abs = varde - v_10,
    forandring_10ar_pct = round((varde - v_10) / v_10 * 100, 2)
  ) |>
  select(-v_5, -v_10, -basvarde)

# ══════════════════════════════════════════════════════════════════════════════
# DEL 4 — RESULTAT
# ══════════════════════════════════════════════════════════════════════════════

# Komplett tabell
glimpse(df)

# Senaste år, sorterat på index (vem har vuxit mest sedan 2000?)
df |>
  filter(ar == max(ar)) |>
  arrange(desc(index)) |>
  select(region, ar, varde, index, kumulativ_pct, forandring_5ar_pct)

# Tidsserie för en kommun
df |>
  filter(region == "Halmstad") |>
  select(ar, varde, index, forandring_abs, forandring_pct)
