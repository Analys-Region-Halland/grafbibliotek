# gemensam/hamta-scb-manad.R — Hämtning av månadsdata från SCB:s API
#
# Anpassad för tabeller med månadskoder ("2020M01", "2025M12") istället
# för årskoder. Resultatet sparas med kolumnerna year, month och period
# intakta så att förbearbetningsfunktionen kan välja referensmånad
# och konvertera till årsformat.
#
# SCB rate limit: max 10 anrop per 10 sekunder, max 100 000 celler per anrop.
# Månadsdata ger ~72 perioder (2020M01–2025M12) istället för ~6 år,
# så cellbudgeten slår i snabbare — dela upp vid behov.

source("R/paket.R")
source("R/gemensam/cache.R")

#' Generera månadskoder för SCB-format
#' @param startar Startår (t.ex. 2020)
#' @param slutar Slutår (default: innevarande år)
#' @return Vektor med strängar "2020M01", "2020M02", ..., "2025M12"
generera_manadskoder <- function(startar, slutar = NULL) {
  if (is.null(slutar)) slutar <- as.integer(format(Sys.Date(), "%Y"))
  ar <- startar:slutar
  manader <- sprintf("%02d", 1:12)
  # Bygg alla kombinationer
  koder <- as.vector(outer(ar, manader, function(y, m) paste0(y, "M", m)))
  sort(koder)
}

#' Generera kvartalskoder för SCB-format
#' @param startar Startår (t.ex. 2020)
#' @param slutar Slutår (default: innevarande år)
#' @return Vektor med strängar "2020K1", "2020K2", ..., "2025K4"
generera_kvartalskoder <- function(startar, slutar = NULL) {
  if (is.null(slutar)) slutar <- as.integer(format(Sys.Date(), "%Y"))
  ar <- startar:slutar
  kvartal <- 1:4
  koder <- as.vector(outer(ar, kvartal, function(y, q) paste0(y, "K", q)))
  sort(koder)
}

#' Parsa månadskod eller kvartalskod till år och månad
#' Hanterar både "2020M01" (månad) och "2020K3" (kvartal → sista månaden i kvartalet)
#' @param period Vektor med strängar ("2020M01", "2024K3", ...)
#' @return tibble med kolumner: period, year, month
parsa_manadskod <- function(period) {
  tibble(
    period = period,
    year   = as.integer(str_extract(period, "^\\d{4}")),
    month  = case_when(
      grepl("M", period) ~ as.integer(str_extract(period, "(?<=M)\\d+")),
      grepl("K", period) ~ as.integer(str_extract(period, "(?<=K)\\d")) * 3L,
      TRUE ~ NA_integer_
    )
  )
}

#' Transformera SCB-månadsdata till internt format med month-kolumn
#' @param scb_df data.frame från pxweb
#' @param kpi_id KPI-identifierare
#' @param region_kolumn Namn på region-kolumnen
#' @param ar_kolumn Namn på tidskolumnen (innehåller "2020M01"-format)
#' @param varde_kolumn Namn på värdekolumnen (NULL = auto)
#' @return tibble med kpi, municipality_id, municipality, municipality_type,
#'         year, month, period, gender, value
transformera_scb_manad <- function(scb_df, kpi_id,
                                    region_kolumn = "Region",
                                    ar_kolumn = "Tid",
                                    varde_kolumn = NULL) {

  # Identifiera värdekolumn automatiskt om inte angiven
  if (is.null(varde_kolumn)) {
    numeriska <- names(scb_df)[sapply(scb_df, is.numeric)]
    if (length(numeriska) == 0) stop("Ingen numerisk kolumn hittad i SCB-data")
    varde_kolumn <- numeriska[1]
    message(glue("  Använder värdekolumn: {varde_kolumn}"))
  }

  # Kommunregister för namn och typ
  kommun_df <- readRDS("data/kommun-register.rds")
  namn_map <- setNames(kommun_df$title, kommun_df$id)
  typ_map  <- setNames(kommun_df$type, kommun_df$id)

  df <- scb_df |>
    mutate(
      scb_region_kod = as.character(.data[[region_kolumn]]),
      period         = as.character(.data[[ar_kolumn]]),
      kpi            = kpi_id,
      gender         = "T",
      value          = as.numeric(.data[[varde_kolumn]]),
      # Mappa SCB:s regionkoder till Kolada-format
      municipality_id = case_when(
        scb_region_kod == "00" ~ "0000",
        nchar(scb_region_kod) == 2 ~ paste0("00", scb_region_kod),
        TRUE ~ scb_region_kod
      )
    ) |>
    # Parsa månadskod eller kvartalskod
    mutate(
      year  = as.integer(str_extract(period, "^\\d{4}")),
      month = case_when(
        grepl("M", period) ~ as.integer(str_extract(period, "(?<=M)\\d+")),
        grepl("K", period) ~ as.integer(str_extract(period, "(?<=K)\\d")) * 3L,
        TRUE ~ NA_integer_
      )
    ) |>
    mutate(
      municipality      = unname(namn_map[municipality_id]),
      municipality_type = unname(typ_map[municipality_id])
    ) |>
    select(kpi, municipality_id, municipality, municipality_type,
           year, month, period, gender, value) |>
    filter(!is.na(municipality))

  df
}

#' Hämta rådata från en SCB-tabell
#' Wrapper kring pxweb som hanterar rate limiting och loggning.
#' @param tabell_url Full URL till SCB-tabellen
#' @param query Lista med variabelfilter
#' @return data.frame med kodade kolumnnamn
hamta_scb_manad_data <- function(tabell_url, query) {
  if (!requireNamespace("pxweb", quietly = TRUE)) {
    stop("Paketet 'pxweb' krävs. Installera med: install.packages('pxweb')")
  }

  message(glue("  Hämtar från SCB (månad): {tabell_url}"))

  px_query <- pxweb::pxweb_query(query)
  px_data <- pxweb::pxweb_get(
    url   = tabell_url,
    query = px_query
  )

  df <- as.data.frame(px_data,
    column.name.type    = "code",
    variable.value.type = "code",
    stringsAsFactors    = FALSE
  )
  message(glue("  Hämtat: {nrow(df)} rader × {ncol(df)} kolumner"))
  df
}

#' Kör hämtning av månadsdata för ett tema
#' @param tema_config Lista med tema-konfiguration (datakalla = "scb_manad")
#' @param tvinga Tvinga omhämtning (default FALSE)
hamta_tema_scb_manad <- function(tema_config, tvinga = FALSE) {
  tema_id <- tema_config$tema_id
  message(glue("\n--- SCB-månadshämtning: {tema_config$tema_namn} ---"))

  if (is.null(tema_config$scb_manad_tabeller) ||
      length(tema_config$scb_manad_tabeller) == 0) {
    message("  Inga SCB-månadstabeller definierade — hoppar över")
    return(invisible(NULL))
  }

  startar <- tema_config$startar %||% 2020
  nuvarande_ar <- as.integer(format(Sys.Date(), "%Y"))
  alla_manadskoder <- generera_manadskoder(startar, nuvarande_ar)
  tabell_ids <- sapply(tema_config$scb_manad_tabeller, \(t) t$kpi_id)

  # Cache-kontroll — använd manadskoder som perioder
  cache_status <- kontrollera_cache(
    tema_id, tabell_ids, alla_manadskoder,
    min_dagar = 30, tvinga = tvinga
  )

  radata_fil <- file.path(CACHE_DIR, glue("radata-{tema_id}.rds"))

  if (cache_status$behov == "ingen") {
    return(invisible(NULL))
  }

  # Hämta tabellmetadata en gång per unik URL för att validera perioder
  url_metadata <- list()

  # Hämta alla tabeller och sammanfoga
  alla_rader <- list()

  for (tab in tema_config$scb_manad_tabeller) {
    # Hämta metadata för URL:en (cachad per URL)
    if (is.null(url_metadata[[tab$url]])) {
      meta <- pxweb::pxweb_get(tab$url)
      for (v in meta$variables) {
        if (v$code == "Tid") {
          url_metadata[[tab$url]] <- v$values
          break
        }
      }
    }

    # Filtrera query-perioder till enbart tillgängliga månader
    tillgangliga <- url_metadata[[tab$url]]
    if (!is.null(tillgangliga) && !is.null(tab$query$Tid)) {
      ursprungliga <- tab$query$Tid
      tab$query$Tid <- intersect(tab$query$Tid, tillgangliga)
      borttagna <- setdiff(ursprungliga, tab$query$Tid)
      if (length(borttagna) > 0) {
        message(glue("  {tab$kpi_id}: Filtrerade bort {length(borttagna)} ej tillgängliga perioder"))
      }
    }

    # Hoppa om inga perioder finns
    if (length(tab$query$Tid) == 0) {
      message(glue("  {tab$kpi_id}: Inga tillgängliga perioder — hoppar över"))
      next
    }

    scb_df <- hamta_scb_manad_data(tab$url, tab$query)

    transformerad <- transformera_scb_manad(
      scb_df,
      kpi_id        = tab$kpi_id,
      region_kolumn = tab$region_kolumn %||% "Region",
      ar_kolumn     = tab$ar_kolumn %||% "Tid",
      varde_kolumn  = tab$varde_kolumn
    )

    alla_rader[[tab$kpi_id]] <- transformerad
  }

  kombinerad <- bind_rows(alla_rader)

  # Spara rådata med month-kolumn intakt
  saveRDS(kombinerad, radata_fil)

  # Spara cache-metadata — perioder som de faktiska månadskoderna
  sparade_perioder <- sort(unique(kombinerad$period))
  spara_cache_meta(tema_id, tabell_ids, sparade_perioder, nrow(kombinerad))
  message(glue("  Sparat: {nrow(kombinerad)} rader ({length(sparade_perioder)} månadsperioder)"))

  invisible(NULL)
}
