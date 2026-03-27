# kap02-bearbeta.R — Bearbeta data för registrerade teman
# Loopar över teman, anropar gemensam bearbetning + eventuell tema-specifik logik.
#
# Användning:
#   Rscript R/kap02-bearbeta.R                    # Alla teman
#   Rscript R/kap02-bearbeta.R socioekonomi       # Bara socioekonomi
#   Rscript R/kap02-bearbeta.R transport miljo_klimat  # Bara dessa två

source("R/paket.R")
source("R/teman/register.R")
source("R/gemensam/bearbeta.R")

message("=== kap02-bearbeta.R ===\n")

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
  bearbeta_tema(config)
}

message("\n=== Bearbetning klar! ===")
