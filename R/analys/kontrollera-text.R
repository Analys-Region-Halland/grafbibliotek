# analys/kontrollera-text.R — Kontrollera enskilda analystexter mot sina underlag
#
# Användning:  Rscript R/analys/kontrollera-text.R 1380_transport 1381_transport ...
#
# Läser data/analys-cache/<id>.json, data/analys-underlag/<id>.md och <id>.figurer.json.
# Kontrollerar siffrorna, figurerna (R/analys/figurregler.md) och att hashen stämmer med
# uppdragslistan (data/analys-uppdrag.md).

suppressPackageStartupMessages({
  library(dplyr); library(stringr); library(jsonlite); library(readr); library(glue)
})
source("R/analys/kontroll.R")

uppdrag <- if (file.exists("data/analys-uppdrag.md")) read_lines("data/analys-uppdrag.md") else character()

fel_totalt <- 0
for (id in commandArgs(trailingOnly = TRUE)) {
  cache <- file.path("data", "analys-cache", paste0(id, ".json"))
  under <- file.path("data", "analys-underlag", paste0(id, ".md"))
  if (!file.exists(cache)) { message(glue("{id}: saknar {cache}")); fel_totalt <- fel_totalt + 1; next }
  c <- tryCatch(fromJSON(cache, simplifyVector = FALSE), error = function(e) NULL)
  if (is.null(c) || is.null(c$res$rubrik) || length(c$res$stycken) == 0) {
    message(glue("{id}: JSON saknar fält eller går inte att läsa")); fel_totalt <- fel_totalt + 1; next
  }
  kallor <- read_file(under)
  problem <- kontrollera(c$res, tillatna_tal(kallor))
  fu_fil <- file.path("data", "analys-underlag", paste0(id, ".figurer.json"))
  kpier <- if (file.exists(fu_fil)) vapply(fromJSON(fu_fil, simplifyVector = FALSE), `[[`, "", "id") else character()
  problem <- c(problem, kontrollera_figurer(c$res, kpier)$fel)
  rad <- uppdrag[grepl(paste0("^\\| ", id, " \\|"), uppdrag)]
  if (length(rad) == 1 && !grepl(c$hash %||% "saknas", rad, fixed = TRUE)) {
    problem <- c(problem, "Hashen stämmer inte med uppdragslistan")
  }
  n_ord <- length(str_split(paste(unlist(c$res$stycken), collapse = " "), "\\s+")[[1]])
  if (length(problem) == 0) {
    message(glue("{id}: ✓ ({n_ord} ord i styckena)"))
  } else {
    fel_totalt <- fel_totalt + 1
    message(glue("{id}: ⚠ {paste(problem, collapse = ' | ')}"))
  }
}
if (fel_totalt > 0) quit(status = 1)
