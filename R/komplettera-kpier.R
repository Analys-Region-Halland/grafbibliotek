# komplettera-kpier.R — Hämta ENBART nya KPI:er och appenda till befintlig rådata
# Engångsskript — kör inte hela kap01 igen

source("R/paket.R")

NYA_KPIS <- c("N02923", "N02926", "N01770", "N02937")

message("=== Kompletterande hämtning av nya KPI:er ===\n")

# Läs befintlig data och kommunregister
radata <- readRDS("data/radata-befolkning.rds")
kommun_df <- readRDS("data/kommun-register.rds")
alla_kommun_koder <- kommun_df$id

# Perioder (samma som kap01)
nuvarande_ar <- as.integer(format(Sys.Date(), "%Y"))
alla_perioder <- as.character(2010:nuvarande_ar)

# Kontrollera att vi inte redan har dessa KPI:er
befintliga_kpis <- unique(radata$kpi)
redan_hamtade <- intersect(NYA_KPIS, befintliga_kpis)
att_hamta <- setdiff(NYA_KPIS, befintliga_kpis)

if (length(redan_hamtade) > 0) {
  message(glue("Redan hämtade (hoppar över): {paste(redan_hamtade, collapse=', ')}"))
}

if (length(att_hamta) == 0) {
  message("Alla KPI:er finns redan — inget att göra")
} else {
  message(glue("Hämtar {length(att_hamta)} nya KPI:er: {paste(att_hamta, collapse=', ')}"))
  message(glue("  × {length(alla_perioder)} perioder × {length(alla_kommun_koder)} kommuner"))

  ny_data <- get_values(
    kpi = att_hamta,
    municipality = alla_kommun_koder,
    period = alla_perioder,
    simplify = TRUE
  )
  message(glue("  Rådata: {nrow(ny_data)} rader"))

  # Filtrera till kön=T
  ny_data <- ny_data |>
    filter(gender == "T", municipality_id %in% alla_kommun_koder)
  message(glue("  Efter filtrering (kön=T): {nrow(ny_data)} rader"))

  # Appenda till befintlig data
  kombinerad <- bind_rows(radata, ny_data)
  saveRDS(kombinerad, "data/radata-befolkning.rds")

  # Uppdatera cache-meta
  alla_kpis <- unique(kombinerad$kpi)
  meta <- list(
    tidsstampel = Sys.time(),
    kpi_ids = alla_kpis,
    perioder = alla_perioder,
    senaste_period = max(as.integer(alla_perioder)),
    antal_rader = nrow(kombinerad)
  )
  saveRDS(meta, "data/hamtning-meta.rds")

  message(glue("\nKombinerad data: {nrow(kombinerad)} rader ({nrow(ny_data)} nya)"))
  message(glue("Unika KPI:er: {length(alla_kpis)}"))
}

message("\nKlart! Kör nu kap02 + kap04.")
