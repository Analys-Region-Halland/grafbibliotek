# analys/kontroll.R — Sifferkontroll av analystexter (används av kap03 och kontrollera-text.R)
# Varje siffra i texten ska finnas i underlaget, exakt eller avrundad. Inga tankstreck, inga %.


TAL_RE <- "\\d{1,3}(?:[  ]\\d{3})+(?:,\\d+)?|\\d+(?:,\\d+)?"

tal_i <- function(txt) {
  s <- str_extract_all(txt, TAL_RE)[[1]]
  as.numeric(gsub(",", ".", gsub("[  ]", "", s)))
}

tillatna_tal <- function(underlag) {
  x <- unique(tal_i(underlag))
  x <- x[!is.na(x)]
  varianter <- c(x, round(x), round(x, 1), signif(x, 2), signif(x, 3),
                 round(x, -1), round(x, -2), round(x, -3), 0:12, 100)
  unique(sprintf("%.4f", varianter))
}

hela_texten <- function(res) {
  paste(c(res$rubrik, res$ingress,
          unlist(lapply(res$i_korthet, function(p) c(p$ledtext, p$text))),
          unlist(res$stycken),
          unlist(lapply(res$figurer %||% list(), function(f) f$rubrik))), collapse = "\n")
}

# Figurtyperna och hur många KPI:er de tar (R/analys/figurregler.md)
FIGURTYPER <- list(utveckling = c(1, 1), halland = c(1, 1), landet = c(1, 1),
                   uppdelning = c(2, 5), delar = c(2, 5))

#' Kontrollerar figurerna i en text. kpier = de KPI-id som texten får använda (temats
#' tabell och figurKpiIds, med data för enheten; se data/analys-underlag/<id>.figurer.json).
#' Ger fel (meddelanden) och giltiga (index på figurer som kan publiceras).
kontrollera_figurer <- function(res, kpier) {
  figurer <- res$figurer %||% list()
  n_st <- length(res$stycken)
  fel <- character()
  giltiga <- integer()
  upptagna <- integer()
  if (length(figurer) > 3) fel <- c(fel, glue("{length(figurer)} figurer, högst tre"))
  for (i in seq_along(figurer)) {
    f <- figurer[[i]]
    egna <- character()
    typ <- f$typ %||% ""
    k <- unlist(f$kpi)
    if (!typ %in% names(FIGURTYPER)) {
      egna <- c(egna, glue("okänd typ \"{typ}\""))
    } else if (length(k) < FIGURTYPER[[typ]][1] || length(k) > FIGURTYPER[[typ]][2]) {
      egna <- c(egna, glue("{typ} tar {paste(unique(FIGURTYPER[[typ]]), collapse = '–')} KPI:er, inte {length(k)}"))
    }
    okanda <- setdiff(c(k, f$summa), kpier)
    if (length(okanda)) egna <- c(egna, glue("KPI som inte finns för texten: {paste(okanda, collapse = ', ')}"))
    e <- f$efter
    if (is.null(e) || !is.numeric(e) || e < 0 || e >= n_st) {
      egna <- c(egna, "står efter ett stycke som inte finns")
    } else if (e %in% upptagna) {
      egna <- c(egna, glue("en figur till efter stycke {e}"))
    }
    if (!nzchar(f$rubrik %||% "")) egna <- c(egna, "saknar rubrik")
    else if (length(str_split(str_trim(f$rubrik), "\\s+")[[1]]) > 12) egna <- c(egna, "rubriken har fler än tolv ord")
    if (length(egna)) {
      fel <- c(fel, glue("Figur {i}: {paste(egna, collapse = ', ')}"))
    } else if (length(giltiga) < 3) {
      giltiga <- c(giltiga, i)
      upptagna <- c(upptagna, e)
    }
  }
  list(fel = fel, giltiga = giltiga)
}

kontrollera <- function(res, tillatna) {
  txt <- hela_texten(res)
  tal <- tal_i(txt)
  okanda <- unique(tal[!sprintf("%.4f", tal) %in% tillatna])
  problem <- character()
  if (length(okanda) > 0) {
    problem <- c(problem, glue("Siffror som inte finns i underlaget: {paste(fmt_kontroll(okanda), collapse = ', ')}"))
  }
  if (str_detect(txt, "—|--| – ")) problem <- c(problem, "Texten innehåller tankstreck")
  if (str_detect(txt, "%")) problem <- c(problem, "Procenttecken (%) används i stället för 'procent'")
  problem
}

fmt_kontroll <- function(x) formatC(x, format = "fg", big.mark = " ", decimal.mark = ",")
