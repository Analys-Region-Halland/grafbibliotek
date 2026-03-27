# gemensam/hamta-kolada.R — Generisk Kolada-hämtning för alla teman
# Anropas av kap01-hamta.R per tema.
#
# DATAPOLICY:
# 1. Specificera municipality-koder EXPLICIT
# 2. Filtrera kön=T direkt efter hämtning
# 3. Cache med metadata per tema
# 4. Inkrementell uppdatering — bara nya år
# 5. Minst 30 dagar mellan uppdateringar

source("R/paket.R")
source("R/gemensam/cache.R")

KOMMUN_REG_FIL <- file.path(CACHE_DIR, "kommun-register.rds")

# ============================================================
# KOMMUNREGISTER
# ============================================================

#' Hämta kommunregister (cachas på disk)
hamta_kommun_register <- function() {
  if (file.exists(KOMMUN_REG_FIL)) {
    return(readRDS(KOMMUN_REG_FIL))
  }
  message("  Hämtar kommunregister från Kolada (engångshämtning)...")
  kommun_df <- get_municipality(cache = TRUE)
  saveRDS(kommun_df, KOMMUN_REG_FIL)
  message(glue("  {nrow(kommun_df)} enheter sparade"))
  kommun_df
}

# ============================================================
# HÄMTNING
# ============================================================

#' Hämta och filtrera data från Kolada
#' @param kpi_ids Vektor med KPI-ID:n
#' @param kommun_koder Vektor med kommun/region-koder
#' @param perioder Vektor med år (som strängar)
#' @param behall_kon_for KPI-ID:n att behålla alla kön för (för könsuppdelning)
#' @return Filtrerad data.frame (kön=T + eventuella K/M för angivna KPI:er)
hamta_och_filtrera_kolada <- function(kpi_ids, kommun_koder, perioder,
                                      behall_kon_for = character(0)) {
  message(glue("  Hämtar {length(kpi_ids)} KPI:er × {length(perioder)} år × {length(kommun_koder)} kommuner..."))
  radata <- get_values(
    kpi = kpi_ids,
    municipality = kommun_koder,
    period = perioder,
    simplify = TRUE
  )
  message(glue("  Rådata: {nrow(radata)} rader"))

  filtrerad <- radata |>
    filter(
      gender == "T" | kpi %in% behall_kon_for,
      municipality_id %in% kommun_koder
    )
  message(glue("  Efter filtrering: {nrow(filtrerad)} rader (kön=T + {length(behall_kon_for)} könsuppdelade KPI:er)"))
  filtrerad
}

#' Kör hämtning för ett tema med Kolada som källa
#' @param tema_config Lista med tema-konfiguration (tema_id, kpier, startar)
#' @param tvinga Tvinga omhämtning (default FALSE)
hamta_tema_kolada <- function(tema_config, tvinga = FALSE) {
  tema_id <- tema_config$tema_id
  kpi_ids <- tema_config$kpier
  startar <- tema_config$startar %||% 2010

  message(glue("\n--- Kolada-hämtning: {tema_config$tema_namn} ---"))

  # Kommunregister

  kommun_df <- hamta_kommun_register()
  alla_kommun_koder <- kommun_df$id

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

  if (cache_status$behov == "kontrollera") {
    # Snabbkontroll mot API (1 KPI, 1 kommun, senaste år)
    kontroll <- get_values(
      kpi = kpi_ids[1],
      municipality = "0000",
      period = as.character(nuvarande_ar),
      simplify = TRUE
    )
    if (nrow(kontroll) > 0) {
      message("  Ny data finns — inkrementell uppdatering")
      cache_status$behov <- "inkrementell"
      cache_status$nya_perioder <- as.character(nuvarande_ar)
    } else {
      message("  Ingen ny data — uppdaterar tidsstämpel")
      meta <- las_cache_meta(tema_id)
      spara_cache_meta(tema_id, kpi_ids, meta$perioder, meta$antal_rader)
      return(invisible(NULL))
    }
  }

  if (cache_status$behov == "full") {
    behall_kon <- tema_config$konuppdelning %||% character(0)
    message(glue("  Fullständig hämtning: {length(kpi_ids)} KPI:er × {length(alla_perioder)} år"))
    filtrerad <- hamta_och_filtrera_kolada(kpi_ids, alla_kommun_koder, alla_perioder,
                                           behall_kon_for = behall_kon)
    saveRDS(filtrerad, radata_fil)
    spara_cache_meta(tema_id, kpi_ids, alla_perioder, nrow(filtrerad))
    message(glue("  Sparat: {nrow(filtrerad)} rader"))

  } else if (cache_status$behov == "inkrementell") {
    nya_perioder <- cache_status$nya_perioder
    ny_data <- hamta_och_filtrera_kolada(kpi_ids, alla_kommun_koder, nya_perioder,
                                         behall_kon_for = tema_config$konuppdelning %||% character(0))
    befintlig <- readRDS(radata_fil)
    kombinerad <- bind_rows(befintlig, ny_data)
    saveRDS(kombinerad, radata_fil)
    spara_cache_meta(tema_id, kpi_ids, alla_perioder, nrow(kombinerad))
    message(glue("  Uppdaterat: {nrow(kombinerad)} rader (+{nrow(ny_data)} nya)"))
  }

  invisible(NULL)
}
