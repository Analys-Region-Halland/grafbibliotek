# kap01-hamta.R — Hämta data för registrerade teman
# Loopar över teman i R/teman/ och anropar rätt hämtningsfunktion
# baserat på varje temas datakälla (kolada, scb, excel).
#
# Användning:
#   Rscript R/kap01-hamta.R                    # Alla teman
#   Rscript R/kap01-hamta.R socioekonomi       # Bara socioekonomi
#   Rscript R/kap01-hamta.R transport miljo_klimat  # Bara dessa två
#
# Sätt force <- TRUE i .GlobalEnv innan source() för att tvinga omhämtning.

source("R/paket.R")
source("R/teman/register.R")
source("R/gemensam/hamta-kolada.R")
source("R/gemensam/hamta-scb.R")
source("R/gemensam/hamta-excel.R")
source("R/gemensam/hamta-tillvaxtverket.R")
source("R/gemensam/hamta-scb-manad.R")
source("R/gemensam/hamta-fohm.R")
source("R/gemensam/hamta-trafa.R")

message("=== kap01-hamta.R ===\n")

# Tvinga omhämtning?
tvinga <- exists("force", envir = .GlobalEnv) && isTRUE(get("force", envir = .GlobalEnv))

# Filtrera till specifika teman om angivet via kommandorad eller TEMAN-variabel
args <- commandArgs(trailingOnly = TRUE)
if (length(args) == 0 && exists("TEMAN", envir = .GlobalEnv)) {
  args <- get("TEMAN", envir = .GlobalEnv)
}

if (length(args) > 0) {
  message(glue("Filtrerar till teman: {paste(args, collapse=', ')}"))
  tema_configs <- list()
  for (tid in args) {
    tema_configs[[tid]] <- ladda_tema_config(tid)
  }
} else {
  tema_configs <- ladda_alla_teman()
}

for (tema_id in names(tema_configs)) {
  config <- tema_configs[[tema_id]]
  datakalla <- config$datakalla %||% "kolada"

  # Tema-specifik hamtning (tar foretrade over generiska handlers)
  tema_hamta_fil <- file.path("R", "teman", tema_id, "hamta.R")
  if (file.exists(tema_hamta_fil)) {
    source(tema_hamta_fil)
    fn_namn <- paste0("hamta_", tema_id)
    if (exists(fn_namn)) {
      get(fn_namn)(config, tvinga = tvinga)
      next
    }
  }

  if ("kolada" %in% datakalla) {
    hamta_tema_kolada(config, tvinga = tvinga)
  }

  if ("scb" %in% datakalla) {
    hamta_tema_scb(config, tvinga = tvinga)
  }

  if ("excel" %in% datakalla) {
    hamta_tema_excel(config)
  }

  if ("tillvaxtverket" %in% datakalla) {
    hamta_tema_tillvaxtverket(config, tvinga = tvinga)
  }

  if ("scb_manad" %in% datakalla) {
    hamta_tema_scb_manad(config, tvinga = tvinga)
  }

  if ("tillvaxtverket_manad" %in% datakalla) {
    hamta_tema_tillvaxtverket_manad(config, tvinga = tvinga)
  }

  if ("fohm" %in% datakalla) {
    hamta_tema_fohm(config, tvinga = tvinga)
  }

  if ("trafa" %in% datakalla) {
    hamta_tema_trafa(config, tvinga = tvinga)
  }
}

message("\n=== Hämtning klar! ===")
