# teman/register.R — Centralt register över alla aktiva teman
# Varje tema har en config-funktion i sin egen mapp.
# Lägg till nya teman här när de skapas.

source("R/paket.R")

#' Ladda konfigurationen för ett specifikt tema
#' @param tema_id Tema-identifierare (t.ex. "befolkning")
#' @return Lista med tema-konfiguration
ladda_tema_config <- function(tema_id) {
  config_fil <- file.path("R", "teman", tema_id, "config.R")
  if (!file.exists(config_fil)) {
    stop(glue("Tema-konfiguration saknas: {config_fil}"))
  }
  source(config_fil, local = TRUE)

  # Config-funktionen heter {tema_id}_config()
  config_fn <- get(paste0(tema_id, "_config"))
  config_fn()
}

#' Lista alla registrerade teman
#' @return Vektor med tema-ID:n
alla_teman <- function() {
  # Varje mapp under R/teman/ som har en config.R är ett registrerat tema
  tema_mappar <- list.dirs("R/teman", recursive = FALSE, full.names = FALSE)
  tema_mappar <- tema_mappar[file.exists(file.path("R", "teman", tema_mappar, "config.R"))]
  tema_mappar
}

#' Ladda konfigurationer för alla registrerade teman
#' @return Namngiven lista med tema-konfigurationer
ladda_alla_teman <- function() {
  teman <- alla_teman()
  message(glue("Registrerade teman: {paste(teman, collapse=', ')}"))

  configs <- list()
  for (tema_id in teman) {
    configs[[tema_id]] <- ladda_tema_config(tema_id)
  }
  configs
}
