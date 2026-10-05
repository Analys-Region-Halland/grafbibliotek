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
  # rKolada ger bara en varning (och ett ofullständigt eller tomt svar) när API:t inte svarar.
  # Det räknas här som fel: anropet görs om, och misslyckas det igen avbryts hämtningen
  # innan något sparas, så att cachen aldrig skrivs över med ofullständig data.
  for (forsok in 1:3) {
    varningar <- character()
    radata <- withCallingHandlers(
      get_values(kpi = kpi_ids, municipality = kommun_koder, period = perioder, simplify = TRUE),
      warning = function(w) {
        varningar <<- c(varningar, conditionMessage(w))
        invokeRestart("muffleWarning")
      }
    )
    if (!any(grepl("connect", varningar, ignore.case = TRUE))) break
    message(glue("  Kolada svarade inte (försök {forsok} av 3)"))
    if (forsok == 3) stop("Kolada svarade inte efter tre försök; cachen lämnas orörd")
    Sys.sleep(15 * forsok)
  }
  # get_values() returnerar NULL när frågan saknar träffar
  if (is.null(radata) || nrow(radata) == 0) {
    message("  Rådata: 0 rader")
    return(tibble())
  }
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
#' @param tema_config Lista med tema-konfiguration (tema_id, kpier, startar; startar_kolada
#'   när Kolada-serierna ska börja tidigare än temats övriga källor)
#' @param tvinga Tvinga omhämtning (default FALSE)
hamta_tema_kolada <- function(tema_config, tvinga = FALSE) {
  tema_id <- tema_config$tema_id
  kpi_ids <- tema_config$kpier
  startar <- tema_config$startar_kolada %||% tema_config$startar %||% 2010

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
    # Kolada fyller på och reviderar de senaste åren löpande (värden för 2025 publiceras
    # under hela 2026). Att bara leta efter innevarande år missar dem, så de fyra senaste
    # åren hämtas om och ersätter cachens värden för de KPI:er som kom tillbaka.
    omhamta <- as.character((nuvarande_ar - 3):nuvarande_ar)
    message(glue("  Hämtar om {min(omhamta)}–{max(omhamta)} (nya och reviderade värden)"))
    ny_data <- hamta_och_filtrera_kolada(kpi_ids, alla_kommun_koder, omhamta,
                                         behall_kon_for = tema_config$konuppdelning %||% character(0))
    befintlig <- readRDS(radata_fil)
    if (nrow(ny_data) > 0) {
      fore <- befintlig |> filter(kpi %in% kpi_ids) |> group_by(kpi) |>
        summarise(senaste = max(year), .groups = "drop")
      kombinerad <- befintlig |>
        filter(!(kpi %in% unique(ny_data$kpi) & as.character(year) %in% omhamta)) |>
        bind_rows(ny_data)
      efter <- kombinerad |> filter(kpi %in% kpi_ids) |> group_by(kpi) |>
        summarise(senaste = max(year), .groups = "drop")
      nya_ar <- inner_join(fore, efter, by = "kpi") |> filter(senaste.y > senaste.x)
      saveRDS(kombinerad, radata_fil)
      message(glue("  Uppdaterat: {nrow(kombinerad)} rader; {nrow(nya_ar)} KPI:er fick ett nyare år"))
    } else {
      message("  Inga värden tillbaka från API:t — behåller cachen")
      kombinerad <- befintlig
    }
    spara_cache_meta(tema_id, kpi_ids, alla_perioder, nrow(kombinerad))
    return(invisible(NULL))
  }

  if (cache_status$behov == "full") {
    behall_kon <- tema_config$konuppdelning %||% character(0)
    message(glue("  Fullständig hämtning: {length(kpi_ids)} KPI:er × {length(alla_perioder)} år"))
    filtrerad <- hamta_och_filtrera_kolada(kpi_ids, alla_kommun_koder, alla_perioder,
                                           behall_kon_for = behall_kon)
    if (nrow(filtrerad) == 0) stop("Kolada gav inga värden vid fullständig hämtning; cachen lämnas orörd")
    # Teman med flera källor (t.ex. SCB och Kolada) delar rådatafil: behåll de andra källornas rader
    if (file.exists(radata_fil)) {
      befintlig <- readRDS(radata_fil)
      if (nrow(befintlig) > 0 && "kpi" %in% names(befintlig)) {
        filtrerad <- bind_rows(befintlig |> filter(!kpi %in% kpi_ids), filtrerad)
      }
    }
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
