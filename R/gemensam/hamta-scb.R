# gemensam/hamta-scb.R — Hämtning från SCB:s API via pxweb-paketet
#
# SCB:s API (PxWeb) skiljer sig från Kolada:
# - Trädstruktur: navigera nivå för nivå till rätt tabell
# - Varje tabell har unika variabelkoder (inte enhetliga KPI-ID:n)
# - Rate limit: max 10 anrop per 10 sekunder, max 100 000 celler per anrop
# - Data returneras i "kub"-format (alla kombinationer av variabler)
#
# VIKTIGT — STEG FÖR ATT HITTA RÄTT TABELL:
#
# 1. INTERAKTIV UTFORSKNING (i R-konsolen, EJ i skript):
#    pxweb_interactive("https://api.scb.se/OV0104/v1/doris/sv/ssd/")
#    → Navigera genom menyerna, välj tabell, granska variabler
#    → Kopiera tabell-URL och variabelkoder
#
# 2. PROGRAMMATISK UTFORSKNING (för att se tillgängliga nivåer):
#    levels <- pxweb_get("https://api.scb.se/OV0104/v1/doris/sv/ssd/AM/")
#    → Listar undermappar/tabeller i AM (Arbetsmarknad)
#
# 3. TABELL-METADATA (variabelnamn och värden):
#    meta <- pxweb_get("https://api.scb.se/OV0104/v1/doris/sv/ssd/AM/AM0401/AM0401A/ArbStatusAr")
#    → Visar alla variabler, deras koder och tillåtna värden
#
# 4. VARIABELKODER att veta om:
#    - Region: "0114" = Upplands Väsby, "1380" = Halmstad (samma som Kolada)
#    - Kön: "1" = män, "2" = kvinnor, "1+2" = totalt
#    - ContentsCode: den faktiska mätvariabeln (t.ex. "AM0401I1" = antal)
#    - Tid: "2023", "2024" osv.
#
# HALLANDS KOMMUNER I SCB (samma koder som Kolada):
#   1315 Hylte, 1380 Halmstad, 1381 Laholm,
#   1382 Falkenberg, 1383 Varberg, 1384 Kungsbacka
#   13 Region Halland (OBS: utan inledande nollor i SCB, "13" inte "0013")
#   00 Riket
#
# CACHE-POLICY FÖR SCB:
# - Samma 30-dagarsregel som Kolada
# - Filtrera till Hallands kommuner + riket i API-anropet (inte efteråt)
# - Begränsa till relevanta variabler och år
# - Max 100 000 celler per anrop — dela upp vid behov

source("R/paket.R")
source("R/gemensam/cache.R")

# SCB:s bas-URL
SCB_BAS_URL <- "https://api.scb.se/OV0104/v1/doris/sv/ssd/"

# Hallands kommun-koder i SCB-format (utan inledande nollor för regioner)
SCB_HALLAND_KODER <- c("1315", "1380", "1381", "1382", "1383", "1384")
SCB_REGION_HALLAND <- "13"
SCB_RIKET <- "00"

# Alla kommun-koder vi vill hämta — behöver ALLA för ranking
# Hämtas från kommun-registret vid körning

#' Utforska en SCB-tabell: visa variabler och deras möjliga värden
#' @param tabell_url Full URL till SCB-tabellen
#' @return Skriv ut metadata till konsolen, returnera tabellens metadata
utforska_scb_tabell <- function(tabell_url) {
  if (!requireNamespace("pxweb", quietly = TRUE)) {
    stop("Paketet 'pxweb' krävs. Installera med: install.packages('pxweb')")
  }
  meta <- pxweb::pxweb_get(tabell_url)
  message("\n=== SCB-tabell ===")
  message(glue("URL: {tabell_url}\n"))

  vars <- meta$variables
  for (v in vars) {
    message(glue("Variabel: {v$code} — {v$text}"))
    message(glue("  Värden ({length(v$values)} st): {paste(head(v$values, 10), collapse=', ')}{if(length(v$values)>10) '...' else ''}"))
    message(glue("  Etiketter: {paste(head(v$valueTexts, 10), collapse=', ')}{if(length(v$valueTexts)>10) '...' else ''}"))
    message("")
  }

  invisible(meta)
}

#' Hämta data från en SCB-tabell
#' @param tabell_url Full URL till SCB-tabellen
#' @param query Lista med variabel-filter (se pxweb-dokumentation)
#' @return data.frame med hämtad data
hamta_scb_data <- function(tabell_url, query) {
  if (!requireNamespace("pxweb", quietly = TRUE)) {
    stop("Paketet 'pxweb' krävs. Installera med: install.packages('pxweb')")
  }

  message(glue("  Hämtar från SCB: {tabell_url}"))

  px_query <- pxweb::pxweb_query(query)
  px_data <- pxweb::pxweb_get(
    url = tabell_url,
    query = px_query
  )

  # Använd kodvärden (1380 istället för "Halmstad", Region istället för "region")
  df <- as.data.frame(px_data,
    column.name.type = "code",
    variable.value.type = "code",
    stringsAsFactors = FALSE
  )
  message(glue("  Hämtat: {nrow(df)} rader × {ncol(df)} kolumner"))
  df
}

#' Transformera SCB-data till Kolada-liknande format
#' Gör det möjligt att använda samma bearbetnings- och exportpipeline.
#' @param scb_df data.frame från hamta_scb_data()
#' @param kpi_id ID att tilldela (t.ex. "S00001")
#' @param region_kolumn Namn på region-kolumnen i SCB-data
#' @param varde_kolumn Namn på värdekolumnen
#' @param ar_kolumn Namn på tidskolumnen
#' @return data.frame med kolumner: kpi, municipality_id, year, gender, value, municipality, municipality_type
transformera_scb_till_kolada_format <- function(scb_df, kpi_id,
                                                 region_kolumn = "Region",
                                                 varde_kolumn = NULL,
                                                 ar_kolumn = "Tid") {

  # Identifiera värdekolumn automatiskt om inte angiven
  if (is.null(varde_kolumn)) {
    numeriska <- names(scb_df)[sapply(scb_df, is.numeric)]
    if (length(numeriska) == 0) stop("Ingen numerisk kolumn hittad i SCB-data")
    varde_kolumn <- numeriska[1]
    message(glue("  Använder värdekolumn: {varde_kolumn}"))
  }

  # Med code-format är Region-kolumnen bara koden (t.ex. "1380", "00", "13")
  # Kommun-namn hämtas från kommun-registret
  kommun_df <- readRDS("data/kommun-register.rds")
  namn_map <- setNames(kommun_df$title, kommun_df$id)

  df <- scb_df |>
    mutate(
      scb_region_kod  = as.character(.data[[region_kolumn]]),
      year            = as.integer(.data[[ar_kolumn]]),
      kpi             = kpi_id,
      gender          = "T",
      value           = as.numeric(.data[[varde_kolumn]]),
      # Mappa SCB:s regionkoder till Kolada-format
      municipality_id = case_when(
        scb_region_kod == "00" ~ "0000",                     # Riket
        nchar(scb_region_kod) == 2 ~                          # Regioner: "13" → "0013"
          paste0("00", scb_region_kod),
        TRUE ~ scb_region_kod                                 # Kommuner: oförändrade
      ),
      municipality_type = case_when(
        scb_region_kod == "00" | nchar(scb_region_kod) == 2 ~ "L",
        TRUE ~ "K"
      )
    ) |>
    mutate(
      municipality = unname(namn_map[municipality_id])
    ) |>
    select(kpi, municipality_id, year, gender, value, municipality, municipality_type)

  df
}

#' Kör hämtning för ett tema med SCB som källa
#' @param tema_config Lista med tema-konfiguration
#' @param tvinga Tvinga omhämtning (default FALSE)
hamta_tema_scb <- function(tema_config, tvinga = FALSE) {
  tema_id <- tema_config$tema_id
  message(glue("\n--- SCB-hämtning: {tema_config$tema_namn} ---"))

  # Varje tema definierar sina SCB-tabeller i config:
  # tema_config$scb_tabeller — lista med:
  #   url, query, kpi_id, varde_kolumn, region_kolumn, ar_kolumn

  if (is.null(tema_config$scb_tabeller) || length(tema_config$scb_tabeller) == 0) {
    message("  Inga SCB-tabeller definierade — hoppar över")
    return(invisible(NULL))
  }

  startar <- tema_config$startar %||% 2010
  nuvarande_ar <- as.integer(format(Sys.Date(), "%Y"))
  alla_perioder <- as.character(startar:nuvarande_ar)
  tabell_ids <- sapply(tema_config$scb_tabeller, \(t) t$kpi_id)

  # Cache-kontroll
  cache_status <- kontrollera_cache(
    tema_id, tabell_ids, alla_perioder,
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

  for (tab in tema_config$scb_tabeller) {
    # Hämta metadata för URL:en (cachad per URL)
    if (is.null(url_metadata[[tab$url]])) {
      meta <- pxweb::pxweb_get(tab$url)
      # Hitta Tid-variabelns tillgängliga värden
      for (v in meta$variables) {
        if (v$code == "Tid") {
          url_metadata[[tab$url]] <- v$values
          break
        }
      }
    }

    # Filtrera query-perioder till enbart tillgängliga år
    tillgangliga <- url_metadata[[tab$url]]
    if (!is.null(tillgangliga) && !is.null(tab$query$Tid)) {
      ursprungliga <- tab$query$Tid
      tab$query$Tid <- intersect(tab$query$Tid, tillgangliga)
      borttagna <- setdiff(ursprungliga, tab$query$Tid)
      if (length(borttagna) > 0) {
        message(glue("  {tab$kpi_id}: Filtrerade bort ej tillgängliga år: {paste(borttagna, collapse=', ')}"))
      }
    }

    scb_df <- hamta_scb_data(tab$url, tab$query)

    transformerad <- transformera_scb_till_kolada_format(
      scb_df,
      kpi_id        = tab$kpi_id,
      region_kolumn = tab$region_kolumn %||% "Region",
      varde_kolumn  = tab$varde_kolumn,
      ar_kolumn     = tab$ar_kolumn %||% "Tid"
    )

    alla_rader[[tab$kpi_id]] <- transformerad
  }

  kombinerad <- bind_rows(alla_rader)

  # Bevara befintlig data från andra källor (t.ex. Kolada) vid blandade teman
  if (file.exists(radata_fil)) {
    befintlig <- readRDS(radata_fil)
    # Ta bort SCB-KPI:er som uppdateras, behåll resten (Kolada m.fl.)
    befintlig <- befintlig |> filter(!kpi %in% tabell_ids)
    kombinerad <- bind_rows(befintlig, kombinerad)
  }

  saveRDS(kombinerad, radata_fil)
  spara_cache_meta(tema_id, tabell_ids, alla_perioder, nrow(kombinerad))
  message(glue("  Sparat: {nrow(kombinerad)} rader"))

  invisible(NULL)
}
