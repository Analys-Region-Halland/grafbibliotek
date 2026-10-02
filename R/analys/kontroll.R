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
          unlist(res$stycken)), collapse = "\n")
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
