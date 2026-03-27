# sok-kpi.R — Sök i lokalt cachat KPI-register
# Användning: Kör med sökterm i SOKNING-variabeln
#   SOKNING <- "fruktsamhet"
#   source("R/sok-kpi.R")
#
# Eller från terminal:
#   Rscript R/sok-kpi.R "fruktsamhet"

source("R/paket.R")

KPI_REG_FIL <- "data/kolada-kpi-register.rds"

# Uppdatera register om det saknas eller är äldre än 90 dagar
if (!file.exists(KPI_REG_FIL) ||
    difftime(Sys.time(), file.info(KPI_REG_FIL)$mtime, units = "days") > 90) {
  message("Uppdaterar KPI-register från Kolada...")
  kpi_reg <- get_kpi(cache = TRUE)
  saveRDS(kpi_reg, KPI_REG_FIL)
  message(glue("  {nrow(kpi_reg)} KPI:er sparade"))
} else {
  kpi_reg <- readRDS(KPI_REG_FIL)
}

# Hämta sökterm
sokning <- if (exists("SOKNING", envir = .GlobalEnv)) {
  get("SOKNING", envir = .GlobalEnv)
} else {
  args <- commandArgs(trailingOnly = TRUE)
  if (length(args) > 0) args[1] else stop("Ange sökterm via SOKNING eller kommandoradsargument")
}

# Sök i titel och beskrivning (case-insensitive)
resultat <- kpi_reg |>
  filter(
    str_detect(title, regex(sokning, ignore_case = TRUE)) |
    str_detect(description, regex(sokning, ignore_case = TRUE))
  ) |>
  select(id, title, municipality_type, is_divided_by_gender) |>
  arrange(title)

message(glue("\nSökning: '{sokning}' — {nrow(resultat)} träffar\n"))
print(as.data.frame(resultat), right = FALSE)
