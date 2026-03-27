# gemensam/hamta-trafa.R — Hämtning från Trafikanalys öppna data API
#
# Trafikanalys API är REST (INTE PxWeb) med pipe-separerad query-syntax:
#   https://api.trafa.se/api/data?query={tabell}|{mått}|{dim:filter}|...
#
# Exempel:
#   T10026|itrfslut|ar:2023|reglan:13|regkom
#   → Personbilar i trafik, Halland, per kommun, 2023
#
# Kommun-koder: samma som SCB/Kolada (1380 = Halmstad etc.)
# Län-koder: 2-siffriga (13 = Halland), "00" = Riket saknas i alla tabeller
#
# Bas-URL: https://api.trafa.se/api/
# Ingen autentisering krävs. Caching rekommenderas starkt.

source("R/paket.R")
source("R/gemensam/cache.R")

TRAFA_DATA_URL <- "https://api.trafa.se/api/data"
TRAFA_STRUCT_URL <- "https://api.trafa.se/api/structure"

#' Hämta data från Trafikanalys API
#' @param query_str Pipe-separerad query-sträng (utan bas-URL)
#' @return tibble med kolumner från API-svaret
hamta_trafa_data <- function(query_str) {
  message(glue("  Hämtar från Trafikanalys: {query_str}"))

  url <- paste0(TRAFA_DATA_URL, "?query=", utils::URLencode(query_str, reserved = TRUE))
  resp <- httr::GET(url, httr::timeout(60))

  if (httr::status_code(resp) != 200) {
    stop(glue("Trafikanalys API svarade med status {httr::status_code(resp)}"))
  }

  json <- httr::content(resp, as = "text", encoding = "UTF-8")
  parsed <- jsonlite::fromJSON(json, simplifyVector = FALSE)

  if (!is.null(parsed$Errors)) {
    stop(glue("Trafikanalys API-fel: {parsed$Errors}"))
  }

  # Parsa med simplifyVector=TRUE för att få flat struktur
  parsed <- jsonlite::fromJSON(json, simplifyVector = TRUE, flatten = TRUE)

  if (is.null(parsed$Rows) || length(parsed$Rows) == 0 ||
      (is.data.frame(parsed$Rows) && nrow(parsed$Rows) == 0)) {
    warning(glue("  Tom respons för query: {query_str}"))
    return(tibble())
  }

  # Kolumnnamn från Header
  kolnamn <- parsed$Header$Column$Name

  # Rader har en nested Column-lista (Cell) — extrahera Value + FormattedValue
  rader <- parsed$Rows
  # Cell-kolumnen innehåller listor med Value, FormattedValue etc.
  cell_data <- rader$Cell
  if (is.null(cell_data)) cell_data <- rader$Column

  # Bygg en lista av namngivna vektorer, en per kolumn
  kol_lista <- setNames(
    lapply(seq_along(kolnamn), function(i) {
      sapply(seq_len(nrow(rader)), function(r) {
        celler <- cell_data[[r]]
        if (is.data.frame(celler) && nrow(celler) >= i) {
          celler$FormattedValue[i] %||% celler$Value[i] %||% NA_character_
        } else if (is.list(celler) && length(celler) >= i) {
          cel <- celler[[i]]
          cel$FormattedValue %||% cel$Value %||% NA_character_
        } else {
          NA_character_
        }
      })
    }),
    kolnamn
  )

  df <- as_tibble(kol_lista)
  message(glue("  Hämtat: {nrow(df)} rader × {ncol(df)} kolumner"))
  df
}

#' Transformera Trafikanalys-data till Kolada-format
#' @param trafa_df tibble från hamta_trafa_data()
#' @param kpi_id Internt KPI-ID (t.ex. "TR_KOLLEKTIV_PASTIG")
#' @param region_kolumn Kolumnnamn för region (kommun eller län)
#' @param varde_kolumn Kolumnnamn för värdet
#' @param ar_kolumn Kolumnnamn för år
#' @param region_typ "kommun" eller "lan"
transformera_trafa_till_kolada_format <- function(trafa_df, kpi_id,
                                                    region_kolumn, varde_kolumn,
                                                    ar_kolumn = "ar",
                                                    region_typ = "kommun") {
  kommun_df <- readRDS("data/kommun-register.rds")
  namn_map <- setNames(kommun_df$title, kommun_df$id)

  # Trafikanalys returnerar kommunNAMN (inte koder) — skapa omvänd mappning
  kod_map <- setNames(kommun_df$id, kommun_df$title)

  trafa_df |>
    filter(.data[[region_kolumn]] != "Totalt") |>  # Hoppa över totalrader
    mutate(
      kpi = kpi_id,
      gender = "T",
      raw_region = as.character(.data[[region_kolumn]]),
      # Rensa alla icke-numeriska tecken utom punkt och minus (hanterar nbsp, tusenavskiljare etc.)
      value = as.numeric(gsub("[^0-9.,-]", "", gsub(",", ".", .data[[varde_kolumn]]))),
      year = as.integer(.data[[ar_kolumn]]),
      municipality_id = case_when(
        region_typ == "lan" & raw_region == "00" ~ "0000",
        region_typ == "lan" ~ paste0("00", raw_region),
        # Kommunnamn → kommuned (via namn-mappning)
        region_typ == "kommun_namn" ~ unname(kod_map[raw_region]),
        TRUE ~ raw_region
      ),
      municipality_type = if_else(
        region_typ == "lan" | nchar(municipality_id) <= 2, "L", "K"
      ),
      municipality = unname(namn_map[municipality_id])
    ) |>
    filter(!is.na(value), !is.na(municipality_id)) |>
    select(kpi, municipality_id, year, gender, value, municipality, municipality_type)
}

#' Kör hämtning för ett tema med Trafikanalys som källa
#' @param tema_config Lista med tema-konfiguration (trafa_tabeller)
#' @param tvinga Tvinga omhämtning (default FALSE)
hamta_tema_trafa <- function(tema_config, tvinga = FALSE) {
  tema_id <- tema_config$tema_id
  message(glue("\n--- Trafikanalys-hämtning: {tema_config$tema_namn} ---"))

  if (is.null(tema_config$trafa_tabeller) || length(tema_config$trafa_tabeller) == 0) {
    message("  Inga Trafikanalys-tabeller definierade — hoppar över")
    return(invisible(NULL))
  }

  trafa_ids <- sapply(tema_config$trafa_tabeller, \(t) t$kpi_id)
  radata_fil <- file.path("data", glue("radata-{tema_id}.rds"))

  # Enkel cache-kontroll
  if (!tvinga && file.exists(radata_fil)) {
    befintlig <- readRDS(radata_fil)
    befintliga_trafa <- intersect(unique(befintlig$kpi), trafa_ids)
    if (length(befintliga_trafa) == length(trafa_ids)) {
      message("  Trafikanalys-data finns redan — hoppar över (använd force för omhämtning)")
      return(invisible(NULL))
    }
  }

  alla_rader <- list()

  for (tab in tema_config$trafa_tabeller) {
    message(glue("  {tab$kpi_id}:"))
    tryCatch({
      trafa_df <- hamta_trafa_data(tab$query_str)

      if (nrow(trafa_df) == 0) {
        warning(glue("  Inga rader för {tab$kpi_id}"))
        next
      }

      transformerad <- transformera_trafa_till_kolada_format(
        trafa_df,
        kpi_id        = tab$kpi_id,
        region_kolumn = tab$region_kolumn,
        varde_kolumn  = tab$varde_kolumn,
        ar_kolumn     = tab$ar_kolumn %||% "ar",
        region_typ    = tab$region_typ %||% "kommun"
      )

      alla_rader[[tab$kpi_id]] <- transformerad
      message(glue("    {nrow(transformerad)} rader"))
    }, error = function(e) {
      warning(glue("  FEL vid hämtning av {tab$kpi_id}: {e$message}"))
    })

    Sys.sleep(0.5)
  }

  kombinerad <- bind_rows(alla_rader)
  message(glue("  Totalt {nrow(kombinerad)} rader från Trafikanalys"))

  # Bevara befintlig data från andra källor
  if (file.exists(radata_fil)) {
    befintlig <- readRDS(radata_fil)
    trafa_pattern <- paste0("^(", paste(trafa_ids, collapse = "|"), ")")
    befintlig <- befintlig |> filter(!grepl(trafa_pattern, kpi))
    kombinerad <- bind_rows(befintlig, kombinerad)
  }

  saveRDS(kombinerad, radata_fil)
  message(glue("  Sparat: {nrow(kombinerad)} rader totalt"))

  invisible(NULL)
}
