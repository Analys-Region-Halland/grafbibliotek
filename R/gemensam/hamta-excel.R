# gemensam/hamta-excel.R — Läs data från Excel-filer
# Används för datakällor som inte finns i Kolada eller SCB.
#
# POLICY:
# - Excel-filer placeras i data/excel/ (gitignore:ad)
# - Varje fil spåras i tema-configens excel_filer-lista
# - Data transformeras till samma format som Kolada/SCB
# - Ingen cache-logik behövs (lokala filer ändras inte av sig själva)
# - Kontrollera att filen finns innan läsning

source("R/paket.R")

EXCEL_DIR <- file.path("data", "excel")

#' Läs en Excel-fil och transformera till Kolada-liknande format
#' @param fil_config Lista med: filnamn, kpi_id, blad (sheet), region_kolumn, varde_kolumn, ar_kolumn
#' @return data.frame i standard-format
las_excel_till_standard <- function(fil_config) {
  if (!requireNamespace("readxl", quietly = TRUE)) {
    stop("Paketet 'readxl' krävs. Installera med: install.packages('readxl')")
  }

  filsokv <- file.path(EXCEL_DIR, fil_config$filnamn)
  if (!file.exists(filsokv)) {
    stop(glue("Excel-fil saknas: {filsokv}"))
  }

  message(glue("  Läser Excel: {fil_config$filnamn}"))

  blad <- fil_config$blad %||% 1
  df <- readxl::read_excel(filsokv, sheet = blad)
  message(glue("  {nrow(df)} rader × {ncol(df)} kolumner"))

  # Transformera — kräver att konfigurationen anger kolumnmappning
  region_kol <- fil_config$region_kolumn %||% "kommun_kod"
  varde_kol  <- fil_config$varde_kolumn %||% "varde"
  ar_kol     <- fil_config$ar_kolumn %||% "ar"
  namn_kol   <- fil_config$namn_kolumn %||% NULL

  resultat <- df |>
    mutate(
      kpi             = fil_config$kpi_id,
      municipality_id = as.character(.data[[region_kol]]),
      year            = as.integer(.data[[ar_kol]]),
      gender          = "T",
      value           = as.numeric(.data[[varde_kol]]),
      municipality    = if (!is.null(namn_kol)) as.character(.data[[namn_kol]]) else municipality_id,
      municipality_type = case_when(
        nchar(municipality_id) <= 2 ~ "L",
        municipality_id == "0000" ~ "L",
        TRUE ~ "K"
      )
    ) |>
    select(kpi, municipality_id, year, gender, value, municipality, municipality_type)

  message(glue("  Transformerat: {nrow(resultat)} rader"))
  resultat
}

#' Kör hämtning för ett tema med Excel som källa
#' @param tema_config Lista med tema-konfiguration
hamta_tema_excel <- function(tema_config) {
  tema_id <- tema_config$tema_id
  message(glue("\n--- Excel-hämtning: {tema_config$tema_namn} ---"))

  if (is.null(tema_config$excel_filer) || length(tema_config$excel_filer) == 0) {
    message("  Inga Excel-filer definierade — hoppar över")
    return(invisible(NULL))
  }

  # Skapa excel-mapp om den inte finns
  dir.create(EXCEL_DIR, recursive = TRUE, showWarnings = FALSE)

  alla_rader <- list()
  for (fil in tema_config$excel_filer) {
    alla_rader[[fil$kpi_id]] <- las_excel_till_standard(fil)
  }

  kombinerad <- bind_rows(alla_rader)
  radata_fil <- file.path(CACHE_DIR, glue("radata-{tema_id}-excel.rds"))
  saveRDS(kombinerad, radata_fil)

  message(glue("  Sparat: {nrow(kombinerad)} rader"))
  invisible(NULL)
}
