# gemensam/hamta-fohm.R — Hämtning från Folkhälsomyndighetens Folkhälsodata (PxWeb)
#
# FoHM:s API är PxWeb (samma som SCB) men med:
# - Annan bas-URL
# - Enkätdata med konfidensintervall (andel, KI nedre, KI övre, antal svar)
# - Rullande perioder (4-årsperioder enkät, 5-årsperioder register)
# - Variabla könskoder: "00"/"01"/"02" (enkät) eller "1+2"/"1"/"2" (register)
#
# Konfidensintervall lagras som extra kolumner (ki_lower, ki_upper) i rådata.
# Rullande perioder konverteras till årtal (sista året i perioden).

source("R/paket.R")
source("R/gemensam/cache.R")

FOHM_BAS_URL <- "https://fohm-app.folkhalsomyndigheten.se/Folkhalsodata/api/v1/sv"

#' Tolka rullande period till årtal (sista året)
#' "2021-2024" → 2024, "2023" → 2023
tolka_period <- function(period_str) {
  ifelse(
    grepl("-", period_str),
    as.integer(sub(".*-", "", period_str)),
    as.integer(period_str)
  )
}

#' Hämta data från en FoHM PxWeb-tabell
#' @param tabell_url Full URL till .px-filen
#' @param query Lista med variabel-filter
#' @return data.frame med hämtad data
hamta_fohm_data <- function(tabell_url, query) {
  message(glue("  Hämtar från FoHM: {basename(tabell_url)}"))

  px_query <- pxweb::pxweb_query(query)
  px_data <- pxweb::pxweb_get(url = tabell_url, query = px_query)

  df <- as.data.frame(px_data,
    column.name.type = "code",
    variable.value.type = "code",
    stringsAsFactors = FALSE
  )
  message(glue("  Hämtat: {nrow(df)} rader × {ncol(df)} kolumner"))
  df
}

#' Hitta den numeriska värdekolumnen i en PxWeb data.frame
#' @param df data.frame från pxweb
#' @param exkludera Kolumner att utesluta från sökningen
#' @return Namn på värdekolumnen
hitta_vardekolumn <- function(df, exkludera = character()) {
  numeriska <- names(df)[sapply(df, is.numeric)]
  numeriska <- setdiff(numeriska, exkludera)
  if (length(numeriska) == 0) stop("Ingen numerisk kolumn hittad i FoHM-data")
  numeriska[1]
}

#' Transformera FoHM enkätdata (med KI) till Kolada-format
#' Pivoterar KI-variabeln till separata kolumner: value, ki_lower, ki_upper
transformera_fohm_enkat <- function(fohm_df, tab_config) {
  ki_kol <- tab_config$ki_kolumn
  region_kol <- tab_config$region_kolumn %||% "Region"
  ar_kol <- tab_config$ar_kolumn %||% "År"
  kon_kol <- tab_config$kon_kolumn %||% "Kön"
  varde_kol <- hitta_vardekolumn(fohm_df)

  message(glue("    KI-kolumn: '{ki_kol}', värdekolumn: '{varde_kol}'"))

  # Välj bara de kolumner vi behöver + mappa KI-typ
  arbetsdata <- fohm_df |>
    select(all_of(c(region_kol, kon_kol, ar_kol, ki_kol)), varde = all_of(varde_kol)) |>
    mutate(
      ki_typ = case_when(
        .data[[ki_kol]] == tab_config$ki_andel  ~ "value",
        .data[[ki_kol]] == tab_config$ki_lower  ~ "ki_lower",
        .data[[ki_kol]] == tab_config$ki_upper  ~ "ki_upper",
        TRUE ~ NA_character_
      )
    ) |>
    filter(!is.na(ki_typ))

  # Pivotera KI till separata kolumner
  pivoterad <- arbetsdata |>
    select(-all_of(ki_kol)) |>
    pivot_wider(
      id_cols = all_of(c(region_kol, kon_kol, ar_kol)),
      names_from = ki_typ,
      values_from = varde
    )

  # Skapa resultat per kön (totalt + eventuella könsvarianter)
  alla <- list()

  # Totalt
  tot <- pivoterad |>
    filter(.data[[kon_kol]] == tab_config$kon_total) |>
    mutate(gender = "T", kpi = tab_config$kpi_id)
  alla[["tot"]] <- tot

  # Kvinnor (KPI_KV)
  if (!is.null(tab_config$kon_kv) && tab_config$kpi_id %in% (tab_config$konuppdelning %||% character())) {
    kv <- pivoterad |>
      filter(.data[[kon_kol]] == tab_config$kon_kv) |>
      mutate(gender = "T", kpi = paste0(tab_config$kpi_id, "_KV"))
    alla[["kv"]] <- kv
  }

  # Män (KPI_MAN)
  if (!is.null(tab_config$kon_man) && tab_config$kpi_id %in% (tab_config$konuppdelning %||% character())) {
    man <- pivoterad |>
      filter(.data[[kon_kol]] == tab_config$kon_man) |>
      mutate(gender = "T", kpi = paste0(tab_config$kpi_id, "_MAN"))
    alla[["man"]] <- man
  }

  resultat <- bind_rows(alla)

  # Mappa till Kolada-format
  kommun_df <- readRDS("data/kommun-register.rds")
  namn_map <- setNames(kommun_df$title, kommun_df$id)

  resultat |>
    mutate(
      scb_kod = as.character(.data[[region_kol]]),
      year = tolka_period(.data[[ar_kol]]),
      municipality_id = case_when(
        scb_kod == "00" ~ "0000",
        nchar(scb_kod) == 2 ~ paste0("00", scb_kod),
        TRUE ~ scb_kod
      ),
      municipality_type = if_else(
        scb_kod == "00" | nchar(scb_kod) == 2, "L", "K"
      ),
      municipality = unname(namn_map[municipality_id])
    ) |>
    select(kpi, municipality_id, year, gender, value,
           ki_lower, ki_upper,
           municipality, municipality_type)
}

#' Transformera FoHM registerdata (utan KI) till Kolada-format
transformera_fohm_register <- function(fohm_df, tab_config) {
  region_kol <- tab_config$region_kolumn %||% "Region"
  ar_kol <- tab_config$ar_kolumn %||% "År"
  kon_kol <- tab_config$kon_kolumn %||% "Kön"
  varde_kol <- hitta_vardekolumn(fohm_df)

  alla <- list()

  # Totalt (eller enda könet om inget totalt finns)
  tot <- fohm_df |>
    filter(.data[[kon_kol]] == tab_config$kon_total) |>
    mutate(gender = "T", kpi = tab_config$kpi_id, value = as.numeric(.data[[varde_kol]]))
  alla[["tot"]] <- tot

  # Könsvarianter
  if (!is.null(tab_config$kon_kv) && tab_config$kpi_id %in% (tab_config$konuppdelning %||% character())) {
    kv <- fohm_df |>
      filter(.data[[kon_kol]] == tab_config$kon_kv) |>
      mutate(gender = "T", kpi = paste0(tab_config$kpi_id, "_KV"),
             value = as.numeric(.data[[varde_kol]]))
    alla[["kv"]] <- kv
  }
  if (!is.null(tab_config$kon_man) && tab_config$kpi_id %in% (tab_config$konuppdelning %||% character())) {
    man <- fohm_df |>
      filter(.data[[kon_kol]] == tab_config$kon_man) |>
      mutate(gender = "T", kpi = paste0(tab_config$kpi_id, "_MAN"),
             value = as.numeric(.data[[varde_kol]]))
    alla[["man"]] <- man
  }

  resultat <- bind_rows(alla)

  kommun_df <- readRDS("data/kommun-register.rds")
  namn_map <- setNames(kommun_df$title, kommun_df$id)

  resultat |>
    mutate(
      scb_kod = as.character(.data[[region_kol]]),
      year = tolka_period(.data[[ar_kol]]),
      municipality_id = case_when(
        scb_kod == "00" ~ "0000",
        nchar(scb_kod) == 2 ~ paste0("00", scb_kod),
        TRUE ~ scb_kod
      ),
      municipality_type = if_else(
        scb_kod == "00" | nchar(scb_kod) == 2, "L", "K"
      ),
      municipality = unname(namn_map[municipality_id]),
      ki_lower = NA_real_,
      ki_upper = NA_real_
    ) |>
    select(kpi, municipality_id, year, gender, value,
           ki_lower, ki_upper,
           municipality, municipality_type)
}

#' Kör hämtning för ett tema med FoHM som källa
#' @param tema_config Lista med tema-konfiguration (fohm_tabeller)
#' @param tvinga Tvinga omhämtning (default FALSE)
hamta_tema_fohm <- function(tema_config, tvinga = FALSE) {
  tema_id <- tema_config$tema_id
  message(glue("\n--- FoHM-hämtning: {tema_config$tema_namn} ---"))

  if (is.null(tema_config$fohm_tabeller) || length(tema_config$fohm_tabeller) == 0) {
    message("  Inga FoHM-tabeller definierade — hoppar över")
    return(invisible(NULL))
  }

  fohm_ids <- sapply(tema_config$fohm_tabeller, \(t) t$kpi_id)
  radata_fil <- file.path("data", glue("radata-{tema_id}.rds"))

  # Enkel cache-kontroll: finns rådata + FoHM-KPI:er redan?
  if (!tvinga && file.exists(radata_fil)) {
    befintlig <- readRDS(radata_fil)
    befintliga_fohm <- intersect(unique(befintlig$kpi), fohm_ids)
    if (length(befintliga_fohm) == length(fohm_ids)) {
      message("  FoHM-data finns redan — hoppar över (använd force för omhämtning)")
      return(invisible(NULL))
    }
  }

  # Hämta varje tabell
  alla_rader <- list()

  for (tab in tema_config$fohm_tabeller) {
    message(glue("  {tab$kpi_id}: {basename(tab$url)}"))
    tryCatch({
      fohm_df <- hamta_fohm_data(tab$url, tab$query)

      if (isTRUE(tab$har_ki)) {
        transformerad <- transformera_fohm_enkat(fohm_df, tab)
      } else {
        transformerad <- transformera_fohm_register(fohm_df, tab)
      }

      alla_rader[[tab$kpi_id]] <- transformerad
      message(glue("    {nrow(transformerad)} rader"))
    }, error = function(e) {
      warning(glue("  FEL vid hämtning av {tab$kpi_id}: {e$message}"))
    })

    # Kort paus för att inte överbelasta API:t
    Sys.sleep(0.5)
  }

  kombinerad <- bind_rows(alla_rader)
  message(glue("  Totalt {nrow(kombinerad)} rader från FoHM"))

  # Bevara befintlig data från andra källor (Kolada)
  if (file.exists(radata_fil)) {
    befintlig <- readRDS(radata_fil)
    # Ta bort gamla FoHM-KPI:er (inkl. _KV/_MAN-varianter), behåll Kolada
    fohm_pattern <- paste0("^(", paste(fohm_ids, collapse = "|"), ")")
    befintlig <- befintlig |> filter(!grepl(fohm_pattern, kpi))
    # Säkerställ att befintlig data har KI-kolumner (NA)
    if (!"ki_lower" %in% names(befintlig)) {
      befintlig <- befintlig |> mutate(ki_lower = NA_real_, ki_upper = NA_real_)
    }
    kombinerad <- bind_rows(befintlig, kombinerad)
  }

  saveRDS(kombinerad, radata_fil)
  message(glue("  Sparat: {nrow(kombinerad)} rader totalt"))

  invisible(NULL)
}
