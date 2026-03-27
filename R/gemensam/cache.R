# gemensam/cache.R — Cache-hantering för alla datakällor
# Hanterar metadata-spårning: vilka KPI:er/tabeller som hämtats, när, vilka perioder.

source("R/paket.R")

CACHE_DIR <- "data"

# ============================================================
# CACHE-METADATA
# ============================================================

#' Läs cache-metadata för ett tema
#' @param tema_id Tema-identifierare (t.ex. "befolkning")
#' @return Lista med tidsstampel, kpi_ids, perioder, antal_rader — eller NULL
las_cache_meta <- function(tema_id) {
  fil <- file.path(CACHE_DIR, glue("hamtning-meta-{tema_id}.rds"))
  if (!file.exists(fil)) return(NULL)
  readRDS(fil)
}

#' Spara cache-metadata efter hämtning
#' @param tema_id Tema-identifierare
#' @param kpi_ids Vektor med hämtade KPI-ID:n (eller tabell-ID:n för SCB)
#' @param perioder Vektor med hämtade perioder (årtal som strängar)
#' @param antal_rader Antal rader i sparad datafil
spara_cache_meta <- function(tema_id, kpi_ids, perioder, antal_rader) {
  meta <- list(
    tidsstampel = Sys.time(),
    kpi_ids     = kpi_ids,
    perioder    = perioder,
    senaste_period = max(as.integer(perioder)),
    antal_rader = antal_rader
  )
  fil <- file.path(CACHE_DIR, glue("hamtning-meta-{tema_id}.rds"))
  saveRDS(meta, fil)
}

#' Kontrollera om hämtning behövs
#' @param tema_id Tema-identifierare
#' @param kpi_ids Förväntade KPI-ID:n
#' @param alla_perioder Alla perioder som ska finnas
#' @param min_dagar Minsta dagar mellan uppdateringar (default 30)
#' @param tvinga Tvinga omhämtning (default FALSE)
#' @return Lista med: behov ("full", "inkrementell", "ingen"), nya_perioder
kontrollera_cache <- function(tema_id, kpi_ids, alla_perioder,
                              min_dagar = 30, tvinga = FALSE) {
  radata_fil <- file.path(CACHE_DIR, glue("radata-{tema_id}.rds"))

  if (tvinga) {
    message("  force=TRUE — tvingar fullständig omhämtning")
    return(list(behov = "full", nya_perioder = alla_perioder))
  }

  cache_meta <- las_cache_meta(tema_id)

  if (is.null(cache_meta) || !file.exists(radata_fil)) {
    message("  Ingen cache finns — fullständig hämtning")
    return(list(behov = "full", nya_perioder = alla_perioder))
  }

  dagar_sedan <- as.numeric(difftime(Sys.time(), cache_meta$tidsstampel, units = "days"))
  samma_kpier <- setequal(cache_meta$kpi_ids, kpi_ids)
  nya_perioder <- setdiff(alla_perioder, cache_meta$perioder)

  message(glue("  Cache från {format(cache_meta$tidsstampel, '%Y-%m-%d %H:%M')}"))
  message(glue("  {cache_meta$antal_rader} rader, {round(dagar_sedan, 1)} dagar sedan"))

  if (!samma_kpier) {
    message("  KPI-listan ändrad — fullständig omhämtning")
    return(list(behov = "full", nya_perioder = alla_perioder))
  }

  if (length(nya_perioder) > 0) {
    message(glue("  Nya perioder: {paste(nya_perioder, collapse=', ')}"))
    return(list(behov = "inkrementell", nya_perioder = nya_perioder))
  }

  if (dagar_sedan < min_dagar) {
    message(glue("  Data är uppdaterad — hoppar över ({round(min_dagar - dagar_sedan)} dagar kvar)"))
    return(list(behov = "ingen", nya_perioder = character(0)))
  }

  message("  Cache äldre än 30 dagar — kontrollerar mot API...")
  return(list(behov = "kontrollera", nya_perioder = character(0)))
}
