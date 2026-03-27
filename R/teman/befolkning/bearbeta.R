# teman/befolkning/bearbeta.R — Tema-specifik forbearbetning for Befolkning
# Anropas av gemensam/bearbeta.R FORE rikssnitt, trender och ranking.
#
# Med SCB-data beraknas alla KPI:er i hamta-steget (hamta.R).
# Denna funktion gor enbart smarre justeringar vid behov.

source("R/paket.R")

forbearbeta_befolkning <- function(radata) {
  message("  Forbearbetning befolkning (SCB-data)...")

  # Fruktsamhetstalet fran SCB ar i promille (t.ex. 1732 = 1,732 barn/kvinna)
  # Konvertera till decimalform
  frukt_rader <- radata |> filter(kpi == "S_FRUKTSAMHET")
  if (nrow(frukt_rader) > 0) {
    max_val <- max(frukt_rader$value, na.rm = TRUE)
    if (max_val > 10) {
      # Vardet ar i promille-format (t.ex. 1732) -> konvertera till barn/kvinna (1.732)
      radata <- radata |>
        mutate(value = if_else(kpi == "S_FRUKTSAMHET" & !is.na(value),
                                round(value / 1000, 3), value))
      message("    Konverterade fruktsamhetstal fran promille till decimalform")
    }
  }

  radata
}
