# teman/utbildning/config.R — Utbildning och kompetens
# Källa: Kolada
# Utbildningsnivå 25–64 år (förgymnasial, gymnasial, eftergymnasial)
# Grundskola/gymnasium (meritvärde, behörighet yrkesprogram, högskolebehörighet)
# Könsuppdelning för samtliga KPI:er

source("R/paket.R")

utbildning_config <- function() {
  list(
    tema_id    = "utbildning",
    tema_namn  = "Utbildning och kompetens",
    tema_farg  = "lila",
    datakalla  = "kolada",
    startar    = 2010,

    # Kolada KPI:er att hämta
    kpier = c(
      # Utbildningsnivå 25–64 år
      "N01982",   # Eftergymnasial utbildning, andel (%)
      "N01983",   # Gymnasial utbildning, andel (%)
      "N01984",   # Förgymnasial utbildning, andel (%)
      # Grundskola/gymnasium
      "N15507",   # Meritvärde åk 9, hemkommun, genomsnitt (17 ämnen)
      "N15428",   # Behöriga till yrkesprogram, hemkommun, andel (%)
      "N17473"    # Högskolebehörighet inom 3 år, hemkommun, andel (%)
    ),

    # KPI:er som ska ha könsuppdelning (_KV/_MAN-varianter)
    konuppdelning = c("N01982", "N01983", "N01984", "N15507", "N15428", "N17473"),

    # Sektioner för frontend — ämnesbaserade med undersektioner
    sektioner = list(
      list(
        id = "eftergymnasial",
        namn = "Eftergymnasial utbildning, 25–64 år",
        kpi_ids = c("N01982"),
        undersektioner = list(
          list(namn = "Kvinnor och män", kpi_ids = c("N01982_KV", "N01982_MAN"))
        )
      ),
      list(
        id = "gymnasial",
        namn = "Gymnasial utbildning, 25–64 år",
        kpi_ids = c("N01983"),
        undersektioner = list(
          list(namn = "Kvinnor och män", kpi_ids = c("N01983_KV", "N01983_MAN"))
        )
      ),
      list(
        id = "forgymnasial",
        namn = "Förgymnasial utbildning, 25–64 år",
        kpi_ids = c("N01984"),
        undersektioner = list(
          list(namn = "Kvinnor och män", kpi_ids = c("N01984_KV", "N01984_MAN"))
        )
      ),
      list(
        id = "meritvarde",
        namn = "Meritvärde åk 9",
        kpi_ids = c("N15507"),
        undersektioner = list(
          list(namn = "Flickor och pojkar", kpi_ids = c("N15507_KV", "N15507_MAN"))
        )
      ),
      list(
        id = "behorighet",
        namn = "Behörighet till yrkesprogram",
        kpi_ids = c("N15428"),
        undersektioner = list(
          list(namn = "Flickor och pojkar", kpi_ids = c("N15428_KV", "N15428_MAN"))
        )
      ),
      list(
        id = "hogskolebeh",
        namn = "Högskolebehörighet inom 3 år",
        kpi_ids = c("N17473"),
        undersektioner = list(
          list(namn = "Kvinnor och män", kpi_ids = c("N17473_KV", "N17473_MAN"))
        )
      )
    ),

    # KPI-metadata
    kpi_meta = tribble(
      ~kpi_id,         ~enhet,     ~tema,         ~par_kpi_id,
      # Utbildningsnivå — totalt
      "N01982",        "procent",  "utbildning",  NA_character_,
      "N01983",        "procent",  "utbildning",  NA_character_,
      "N01984",        "procent",  "utbildning",  NA_character_,
      # Utbildningsnivå — kvinnor
      "N01982_KV",     "procent",  "utbildning",  NA_character_,
      "N01983_KV",     "procent",  "utbildning",  NA_character_,
      "N01984_KV",     "procent",  "utbildning",  NA_character_,
      # Utbildningsnivå — män
      "N01982_MAN",    "procent",  "utbildning",  NA_character_,
      "N01983_MAN",    "procent",  "utbildning",  NA_character_,
      "N01984_MAN",    "procent",  "utbildning",  NA_character_,
      # Grundskola/gymnasium — totalt
      "N15507",        "poäng",    "utbildning",  NA_character_,
      "N15428",        "procent",  "utbildning",  NA_character_,
      "N17473",        "procent",  "utbildning",  NA_character_,
      # Grundskola/gymnasium — kvinnor
      "N15507_KV",     "poäng",    "utbildning",  NA_character_,
      "N15428_KV",     "procent",  "utbildning",  NA_character_,
      "N17473_KV",     "procent",  "utbildning",  NA_character_,
      # Grundskola/gymnasium — män
      "N15507_MAN",    "poäng",    "utbildning",  NA_character_,
      "N15428_MAN",    "procent",  "utbildning",  NA_character_,
      "N17473_MAN",    "procent",  "utbildning",  NA_character_
    ),

    # Beskrivningar för könsuppdelade varianter (bas-KPI:er hämtas från Kolada)
    beraknade_kpier = tribble(
      ~kpi_id,         ~kpi_namn,                                              ~beskrivning,
      # Utbildningsnivå — kön
      "N01982_KV",     "Eftergymnasial utbildning, kvinnor",                   "Andel kvinnor 25–64 år med eftergymnasial utbildning.",
      "N01982_MAN",    "Eftergymnasial utbildning, män",                       "Andel män 25–64 år med eftergymnasial utbildning.",
      "N01983_KV",     "Gymnasial utbildning, kvinnor",                        "Andel kvinnor 25–64 år med gymnasial utbildning.",
      "N01983_MAN",    "Gymnasial utbildning, män",                            "Andel män 25–64 år med gymnasial utbildning.",
      "N01984_KV",     "Förgymnasial utbildning, kvinnor",                     "Andel kvinnor 25–64 år med förgymnasial utbildning.",
      "N01984_MAN",    "Förgymnasial utbildning, män",                         "Andel män 25–64 år med förgymnasial utbildning.",
      # Grundskola/gymnasium — kön
      "N15507_KV",     "Meritvärde åk 9, flickor",                             "Genomsnittligt meritvärde (17 ämnen) åk 9, flickor, hemkommun.",
      "N15507_MAN",    "Meritvärde åk 9, pojkar",                              "Genomsnittligt meritvärde (17 ämnen) åk 9, pojkar, hemkommun.",
      "N15428_KV",     "Behöriga till yrkesprogram, flickor",                  "Andel flickor i åk 9 som är behöriga till yrkesprogram, hemkommun.",
      "N15428_MAN",    "Behöriga till yrkesprogram, pojkar",                   "Andel pojkar i åk 9 som är behöriga till yrkesprogram, hemkommun.",
      "N17473_KV",     "Högskolebehörighet inom 3 år, kvinnor",               "Andel kvinnliga gymnasieelever med grundläggande högskolebehörighet inom 3 år, hemkommun.",
      "N17473_MAN",    "Högskolebehörighet inom 3 år, män",                    "Andel manliga gymnasieelever med grundläggande högskolebehörighet inom 3 år, hemkommun."
    ),

    # Inga beräknade antal-KPI:er
    berakna_antal = list(),

    # Visningsnamn för frontend
    visningsnamn = list(
      # Utbildningsnivå — totalt
      "N01982"     = "Eftergymnasial utbildning",
      "N01983"     = "Gymnasial utbildning",
      "N01984"     = "Förgymnasial utbildning",
      # Utbildningsnivå — kön
      "N01982_KV"  = "Eftergymnasial, kvinnor",
      "N01982_MAN" = "Eftergymnasial, män",
      "N01983_KV"  = "Gymnasial, kvinnor",
      "N01983_MAN" = "Gymnasial, män",
      "N01984_KV"  = "Förgymnasial, kvinnor",
      "N01984_MAN" = "Förgymnasial, män",
      # Grundskola/gymnasium — totalt
      "N15507"     = "Meritvärde åk 9",
      "N15428"     = "Behöriga till yrkesprogram",
      "N17473"     = "Högskolebehörighet inom 3 år",
      # Grundskola/gymnasium — kön
      "N15507_KV"  = "Meritvärde åk 9, flickor",
      "N15507_MAN" = "Meritvärde åk 9, pojkar",
      "N15428_KV"  = "Behöriga yrkesprogram, flickor",
      "N15428_MAN" = "Behöriga yrkesprogram, pojkar",
      "N17473_KV"  = "Högskolebehörighet, kvinnor",
      "N17473_MAN" = "Högskolebehörighet, män"
    )
  )
}
