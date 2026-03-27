# gemensam/hamta-tillvaxtverket.R — Hämtning av inkvarteringsstatistik
# Källa: Tillväxtverkets öppna data (oppnadata.tillvaxtverket.se)
# Format: Tabbseparerade textfiler, Latin-1-kodning, CC0-licens
# Uppdateras månatligen av Tillväxtverket.

source("R/paket.R")
source("R/gemensam/cache.R")

TILLVAXTVERKET_BASE <- "https://oppnadata.tillvaxtverket.se/data/inkvartering/"

# Tillgängliga filer och deras KPI-mappning
TILLVAXTVERKET_FILER <- list(
  # Årsdata med logiintäkter, gästnätter, kapacitet, ankomster, antal anläggningar
  revenue_year = "GuestNights_Capacity_Revenue_Year.txt",
  # Gästnätter per hemland och år (för sv/utl-uppdelning)
  country_year = "GuestNights_Country_Year.txt"
)

# ============================================================
# NEDLADDNING
# ============================================================

#' Ladda ner en TSV-fil från Tillväxtverket
#' @param filnamn Filnamn (t.ex. "GuestNights_Capacity_Revenue_Year.txt")
#' @return tibble med rådata
hamta_tillvaxtverket_fil <- function(filnamn) {
  url <- paste0(TILLVAXTVERKET_BASE, filnamn)
  message(glue("  Hämtar {filnamn} från Tillväxtverket..."))

  radata <- read_tsv(
    url,
    locale = locale(encoding = "latin1"),
    col_types = cols(
      KOMMUN_KOD = col_character(),
      LAN_KOD    = col_character(),
      .default   = col_guess()
    ),
    show_col_types = FALSE
  )

  message(glue("  {nrow(radata)} rader nedladdade"))
  radata
}

# ============================================================
# TRANSFORMATION TILL KOLADA-FORMAT
# ============================================================

#' Mappa geografisk nivå till Kolada-kompatibel municipality_id
#' Kommun: KOMMUN_KOD direkt (4-siffrig)
#' Län: LAN_KOD → "00XX" (4-siffrig med ledande nollor)
#' Riket: "0000"
mappa_geografi <- function(df) {
  df |>
    mutate(
      municipality_id = case_when(
        NIVA_NAMN == "Kommun" ~ KOMMUN_KOD,
        NIVA_NAMN == "Län"    ~ str_pad(LAN_KOD, 4, pad = "0"),
        NIVA_NAMN == "Riket"  ~ "0000"
      )
    ) |>
    filter(!is.na(municipality_id))
}

#' Aggregera per kommun × år (summerar alla anläggningstyper)
#' Returnerar en bred tabell med alla mått som kolumner
aggregera_totaler <- function(df) {
  df |>
    group_by(municipality_id, AR) |>
    summarise(
      gastnatter      = sum(ANTAL_GASTNATTER, na.rm = TRUE),
      logiintakt      = sum(LOGIINTAKT, na.rm = TRUE),
      ankomster_sve   = sum(ANKOMSTER_SVE, na.rm = TRUE),
      ankomster_utl   = sum(ANKOMSTER_UTL, na.rm = TRUE),
      anlaggningar    = sum(ANTAL_ANLAGGNINGAR, na.rm = TRUE),
      belagda_rum     = sum(BELAGDA_RUM, na.rm = TRUE),
      disponibla_rum  = sum(DISPONIBLA_RUM, na.rm = TRUE),
      belagda_baddar  = sum(BELAGDA_BADDAR, na.rm = TRUE),
      disponibla_baddar = sum(DISPONIBLA_BADDAR, na.rm = TRUE),
      .groups = "drop"
    )
}

#' Extrahera gästnätter per anläggningstyp
#' Returnerar en lång tabell med en rad per kommun × år × typ
gastnatter_per_typ <- function(df) {
  # Inkludera namngivna typer (inte "Sekretesskyddad")
  typ_map <- c(
    "Hotell"      = "T_GAST_HOTELL",
    "Camping"     = "T_GAST_CAMPING",
    "Stugbyar"    = "T_GAST_STUGBY",
    "Vandrarhem"  = "T_GAST_VANDRARHEM",
    "SoL"         = "T_GAST_SOL"
  )

  df |>
    filter(ANLAGGNINGSTYP_NAMN %in% names(typ_map)) |>
    group_by(municipality_id, AR, ANLAGGNINGSTYP_NAMN) |>
    summarise(value = sum(ANTAL_GASTNATTER, na.rm = TRUE), .groups = "drop") |>
    mutate(kpi = typ_map[ANLAGGNINGSTYP_NAMN]) |>
    select(kpi, municipality_id, year = AR, value)
}

#' Transformera aggregerad data till Kolada-format (lång tabell)
#' En rad per kpi × municipality × year
skapa_kpi_rader <- function(totaler) {
  kpi_specs <- list(
    list(kpi = "T_GAST_TOT",     kolumn = "gastnatter"),
    list(kpi = "T_LOGIINTAKT",   kolumn = "logiintakt"),
    list(kpi = "T_ANKOMST_SVE",  kolumn = "ankomster_sve"),
    list(kpi = "T_ANKOMST_UTL",  kolumn = "ankomster_utl"),
    list(kpi = "T_ANLAGGNINGAR", kolumn = "anlaggningar")
  )

  rader <- map(kpi_specs, function(spec) {
    totaler |>
      transmute(
        kpi = spec$kpi,
        municipality_id,
        year = AR,
        value = .data[[spec$kolumn]]
      )
  })

  # Härledda: beläggningsgrad (procent)
  belagg_rum <- totaler |>
    filter(disponibla_rum > 0) |>
    transmute(
      kpi = "T_BELAGG_RUM",
      municipality_id,
      year = AR,
      value = round(belagda_rum / disponibla_rum * 100, 1)
    )

  belagg_badd <- totaler |>
    filter(disponibla_baddar > 0) |>
    transmute(
      kpi = "T_BELAGG_BADD",
      municipality_id,
      year = AR,
      value = round(belagda_baddar / disponibla_baddar * 100, 1)
    )

  # Härledda: andel utländska ankomster
  andel_utl <- totaler |>
    mutate(ankomst_tot = ankomster_sve + ankomster_utl) |>
    filter(ankomst_tot > 0) |>
    transmute(
      kpi = "T_ANDEL_UTL",
      municipality_id,
      year = AR,
      value = round(ankomster_utl / ankomst_tot * 100, 1)
    )

  # Härledda: logiintäkt per gästnatt
  intakt_per_gast <- totaler |>
    filter(gastnatter > 0, logiintakt > 0) |>
    transmute(
      kpi = "T_INTAKT_PER_GAST",
      municipality_id,
      year = AR,
      value = round(logiintakt / gastnatter)
    )

  # Härledda: gästnätter per anläggning
  gast_per_anlagg <- totaler |>
    filter(anlaggningar > 0) |>
    transmute(
      kpi = "T_GAST_PER_ANLAGG",
      municipality_id,
      year = AR,
      value = round(gastnatter / anlaggningar)
    )

  bind_rows(c(rader, list(belagg_rum, belagg_badd, andel_utl,
                           intakt_per_gast, gast_per_anlagg)))
}

#' Extrahera svenska/utländska gästnätter från Country-filen
#' Aggregerar per kommun × år × Sverige/Utland (alla anläggningstyper)
gastnatter_sveutl <- function(country_raw) {
  geo <- mappa_geografi(country_raw)

  # Summera per kommun × år × Sverige/Utland
  sveutl <- geo |>
    filter(LANDGRP_SVUTL_NAMN %in% c("Sverige", "Utland")) |>
    group_by(municipality_id, AR, LANDGRP_SVUTL_NAMN) |>
    summarise(gastnatter = sum(ANTAL_GASTNATTER, na.rm = TRUE), .groups = "drop")

  # Svenska gästnätter
  sve <- sveutl |>
    filter(LANDGRP_SVUTL_NAMN == "Sverige") |>
    transmute(kpi = "T_GAST_SVE", municipality_id, year = AR, value = gastnatter)

  # Utländska gästnätter
  utl <- sveutl |>
    filter(LANDGRP_SVUTL_NAMN == "Utland") |>
    transmute(kpi = "T_GAST_UTL", municipality_id, year = AR, value = gastnatter)

  # Andel utländska gästnätter
  bred <- sveutl |>
    pivot_wider(names_from = LANDGRP_SVUTL_NAMN, values_from = gastnatter, values_fill = 0) |>
    mutate(totalt = Sverige + Utland) |>
    filter(totalt > 0)

  andel_utl_natter <- bred |>
    transmute(
      kpi = "T_ANDEL_UTL_NATTER",
      municipality_id,
      year = AR,
      value = round(Utland / totalt * 100, 1)
    )

  bind_rows(sve, utl, andel_utl_natter)
}

#' Huvudtransformation: rådata → Kolada-format
#' @param revenue_raw Rådata från Revenue-filen
#' @param country_raw Rådata från Country-filen (Sverige/Utland-uppdelning)
#' @param kommun_df Kommunregister (från Kolada)
#' @return tibble i Kolada-format (kpi, municipality_id, municipality, municipality_type, year, gender, value)
transformera_tillvaxtverket <- function(revenue_raw, country_raw, kommun_df) {
  geo <- mappa_geografi(revenue_raw)

  # Totaler per kommun × år
  totaler <- aggregera_totaler(geo)
  total_kpier <- skapa_kpi_rader(totaler)

  # Per-typ gästnätter
  typ_kpier <- gastnatter_per_typ(geo)

  # Svenska/utländska gästnätter (från Country-filen)
  sveutl_kpier <- gastnatter_sveutl(country_raw)

  # Sammanfoga alla KPI-rader
  alla <- bind_rows(total_kpier, typ_kpier, sveutl_kpier)

  # Lägg till metadata från kommunregistret
  alla <- alla |>
    mutate(gender = "T") |>
    left_join(
      kommun_df |> select(id, municipality = title, municipality_type = type),
      by = c("municipality_id" = "id")
    ) |>
    filter(!is.na(municipality))  # Exkludera okända koder

  message(glue("  {nrow(alla)} KPI-rader, {n_distinct(alla$kpi)} KPI:er, {n_distinct(alla$municipality_id)} enheter"))
  alla
}

# ============================================================
# HUVUDFUNKTION — ANROPAS FRÅN kap01-hamta.R
# ============================================================

#' Hämta Tillväxtverkets inkvarteringsdata för ett tema
#' @param tema_config Lista med tema-konfiguration
#' @param tvinga Tvinga omhämtning (default FALSE)
hamta_tema_tillvaxtverket <- function(tema_config, tvinga = FALSE) {
  tema_id <- tema_config$tema_id
  kpi_ids <- tema_config$kpier
  startar <- tema_config$startar %||% 2008

  message(glue("\n--- Tillväxtverket-hämtning: {tema_config$tema_namn} ---"))

  # Kommunregister (krävs för namn och typ)
  kommun_fil <- file.path(CACHE_DIR, "kommun-register.rds")
  if (!file.exists(kommun_fil)) {
    stop("Kommunregister saknas — kör befolkningstemat först (behöver kommun-register.rds)")
  }
  kommun_df <- readRDS(kommun_fil)

  # Perioder
  nuvarande_ar <- as.integer(format(Sys.Date(), "%Y"))
  alla_perioder <- as.character(startar:nuvarande_ar)

  # Cache-kontroll
  cache_status <- kontrollera_cache(
    tema_id, kpi_ids, alla_perioder,
    min_dagar = 30, tvinga = tvinga
  )

  radata_fil <- file.path(CACHE_DIR, glue("radata-{tema_id}.rds"))

  if (cache_status$behov == "ingen") {
    return(invisible(NULL))
  }

  # Tillväxtverket publicerar hela filen varje gång — alltid full hämtning
  if (cache_status$behov == "kontrollera") {
    message("  Cache äldre än 30 dagar — hämtar om hela filen")
  }

  # Ladda ner och transformera
  revenue_raw <- hamta_tillvaxtverket_fil(TILLVAXTVERKET_FILER$revenue_year)
  country_raw <- hamta_tillvaxtverket_fil(TILLVAXTVERKET_FILER$country_year)
  resultat <- transformera_tillvaxtverket(revenue_raw, country_raw, kommun_df)

  # Filtrera till önskat startår
  resultat <- resultat |> filter(year >= startar)

  # Spara
  saveRDS(resultat, radata_fil)
  sparade_perioder <- as.character(sort(unique(resultat$year)))
  spara_cache_meta(tema_id, kpi_ids, sparade_perioder, nrow(resultat))
  message(glue("  Sparat: {nrow(resultat)} rader ({min(sparade_perioder)}–{max(sparade_perioder)})"))

  invisible(NULL)
}

# Månadsdata — samma struktur men med MANAD_NUMMER-kolumn
TILLVAXTVERKET_MANAD_FILER <- list(
  revenue_month = "GuestNights_Capacity_Revenue_Month.txt",
  country_month = "GuestNights_Country_Month.txt"
)

# ============================================================
# MÅNADSDATA — Samma mönster men behåller månad-kolumn
# ============================================================

#' Aggregera per kommun × år × månad (summerar alla anläggningstyper)
aggregera_totaler_manad <- function(df) {
  df |>
    mutate(manad = as.integer(MANAD_NUMMER)) |>
    group_by(municipality_id, AR, manad) |>
    summarise(
      gastnatter = sum(ANTAL_GASTNATTER, na.rm = TRUE),
      .groups = "drop"
    )
}

#' Extrahera svenska/utländska gästnätter per månad från Country-filen
gastnatter_sveutl_manad <- function(country_raw) {
  geo <- mappa_geografi(country_raw)

  sveutl <- geo |>
    mutate(manad = as.integer(MANAD_NUMMER)) |>
    filter(LANDGRP_SVUTL_NAMN %in% c("Sverige", "Utland")) |>
    group_by(municipality_id, AR, manad, LANDGRP_SVUTL_NAMN) |>
    summarise(gastnatter = sum(ANTAL_GASTNATTER, na.rm = TRUE), .groups = "drop")

  sve <- sveutl |>
    filter(LANDGRP_SVUTL_NAMN == "Sverige") |>
    transmute(kpi = "K_GAST_SVE", municipality_id, year = AR, month = manad, value = gastnatter)

  utl <- sveutl |>
    filter(LANDGRP_SVUTL_NAMN == "Utland") |>
    transmute(kpi = "K_GAST_UTL", municipality_id, year = AR, month = manad, value = gastnatter)

  bind_rows(sve, utl)
}

#' Transformera Tillväxtverkets månadsdata till internt format
#' @param revenue_raw Rådata från Revenue_Month-filen
#' @param country_raw Rådata från Country_Month-filen
#' @param kommun_df Kommunregister
#' @return tibble med kpi, municipality_id, municipality, municipality_type, year, month, period, gender, value
transformera_tillvaxtverket_manad <- function(revenue_raw, country_raw, kommun_df) {
  geo <- mappa_geografi(revenue_raw)

  # Totala gästnätter per kommun × år × månad
  totaler <- aggregera_totaler_manad(geo)
  tot_kpier <- totaler |>
    transmute(kpi = "K_GAST_TOT", municipality_id, year = AR, month = manad, value = gastnatter)

  # Svenska/utländska gästnätter
  sveutl_kpier <- gastnatter_sveutl_manad(country_raw)

  # Sammanfoga alla KPI-rader
  alla <- bind_rows(tot_kpier, sveutl_kpier) |>
    mutate(
      gender = "T",
      period = paste0(year, "M", sprintf("%02d", month))
    ) |>
    left_join(
      kommun_df |> select(id, municipality = title, municipality_type = type),
      by = c("municipality_id" = "id")
    ) |>
    filter(!is.na(municipality))

  message(glue("  {nrow(alla)} KPI-rader (månad), {n_distinct(alla$kpi)} KPI:er"))
  alla
}

#' Hämta Tillväxtverkets månadsdata för ett tema
#' @param tema_config Lista med tema-konfiguration
#' @param tvinga Tvinga omhämtning (default FALSE)
hamta_tema_tillvaxtverket_manad <- function(tema_config, tvinga = FALSE) {
  tema_id <- tema_config$tema_id
  message(glue("\n--- Tillväxtverket-månadshämtning: {tema_config$tema_namn} ---"))

  kommun_fil <- file.path(CACHE_DIR, "kommun-register.rds")
  if (!file.exists(kommun_fil)) {
    stop("Kommunregister saknas — kör befolkningstemat först")
  }
  kommun_df <- readRDS(kommun_fil)

  startar <- tema_config$startar %||% 2020

  # Ladda ner månadsfiler
  revenue_raw <- hamta_tillvaxtverket_fil(TILLVAXTVERKET_MANAD_FILER$revenue_month)
  country_raw <- hamta_tillvaxtverket_fil(TILLVAXTVERKET_MANAD_FILER$country_month)

  resultat <- transformera_tillvaxtverket_manad(revenue_raw, country_raw, kommun_df)

  # Filtrera till önskat startår
  resultat <- resultat |> filter(year >= startar)

  message(glue("  Tillväxtverket månad: {nrow(resultat)} rader ({min(resultat$year)}–{max(resultat$year)})"))

  # Bevara befintlig SCB-data i radata-filen (merge-logik)
  radata_fil <- file.path(CACHE_DIR, glue("radata-{tema_id}.rds"))
  if (file.exists(radata_fil)) {
    befintlig <- readRDS(radata_fil)
    # Ta bort gamla Tillväxtverket-KPI:er och ersätt med nya
    tv_kpier <- c("K_GAST_TOT", "K_GAST_SVE", "K_GAST_UTL")
    befintlig <- befintlig |> filter(!kpi %in% tv_kpier)
    kombinerad <- bind_rows(befintlig, resultat)
    saveRDS(kombinerad, radata_fil)
    message(glue("  Sammanfogat med befintlig data: {nrow(kombinerad)} rader totalt"))
  } else {
    saveRDS(resultat, radata_fil)
  }

  invisible(NULL)
}
