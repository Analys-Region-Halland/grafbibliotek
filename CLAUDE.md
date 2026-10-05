# Grafbiblioteket — Hallands kommuner i siffror

## Syfte

En dashboard som ger en övergripande bild av Halland: länets sex kommuner
(Halmstad, Laholm, Falkenberg, Varberg, Kungsbacka, Hylte) och Region Halland
som helhet. Varje nyckeltal sätts i sammanhang mot övriga Hallandskommuner,
rikssnittet och rangordningen bland Sveriges 290 kommuner.

**Målgrupp:** kommunala och regionala beslutsfattare, analytiker, journalister.
**Avsändare:** Analys, Region Halland.
**Publicering:** GitHub Pages via repot `Analys-Region-Halland/grafbibliotek`.

## Arkitektur i korthet

```
Öppna API:er (Kolada, SCB, FoHM, Tillväxtverket, Trafikanalys, Excel)
        │
        ▼
R-pipeline (R/)  ──  hämta → bearbeta → AI-analys → exportera
        │
        ▼
JSON-filer (app/public/data/)
        │
        ▼
React/D3-app (app/)  ──  byggs och deployas av GitHub Actions vid push till master
```

Projektet är **temabaserat**: varje tema är en självständig modul med en
R-config och en frontend-config. Gemensam infrastruktur (cache, hämtning,
bearbetning, komponenter) delas av alla teman. Inga temaspecifika
undantag ska behövas i `App.tsx`.

### Teman

| Tema-ID         | Namn                          | Datakällor                     |
|-----------------|-------------------------------|--------------------------------|
| `befolkning`    | Befolkning & demografi        | SCB (egen `hamta.R`)           |
| `arbetsmarknad` | Arbetsmarknad                 | SCB                            |
| `utbildning`    | Utbildning och kompetens      | Kolada                         |
| `bostader`      | Bostäder                      | Kolada, SCB                    |
| `naringsliv`    | Näringsliv                    | Kolada, SCB                    |
| `turism`        | Turism & besöksnäring         | Tillväxtverket                 |
| `konjunktur`    | Konjunktur                    | SCB (månad), Tillväxtverket    |
| `miljo_klimat`  | Miljö & klimat                | Kolada                         |
| `transport`     | Kollektivtrafik & transport   | Kolada, SCB, Trafikanalys      |
| `socioekonomi`  | Socioekonomi & hälsa          | Kolada, FoHM                   |

Visningsordningen styrs av `TEMAN`-arrayen i `app/src/teman/index.ts`.

## Mappstruktur

```
R/
  paket.R                 Paketladdning (sourcas av alla skript)
  kap01-hamta.R           Hämtar data för alla/valda teman (med cache)
  kap02-bearbeta.R        Bearbetar rådata → data/bearbetad-<tema>.rds
  kap03-ai-analys.R       Underlag, uppdragslista, kontroll och sammanställning av analystexter
  analys/                 systemprompt.md (stil- och sifferregler), bakgrund.md (geografi)
  kap04-exportera.R       Exporterar JSON till frontend
  sok-kpi.R               Sök i lokalt cachat Kolada-KPI-register
  gemensam/               Delade hämtnings- och bearbetningsfunktioner per källa
  teman/<tema_id>/        config.R (+ ev. bearbeta.R, hamta.R) per tema
  teman/register.R        Hittar teman automatiskt via mappstrukturen
  kartor/                 Konvertering av shapefiler → GeoJSON
app/                      Vite + React 19 + TypeScript + D3 + Tailwind 4
  src/teman/              Frontend-config per tema (sektioner, visningsnamn, färg)
  src/components/         TemaBlock, TemaTabell, JamforTabell, RadTip, KpiPopup …
  src/charts/             D3-diagram: Spar, Tidsserie, KartaVy
  public/data/            Exporterad JSON + GeoJSON (incheckad, används av bygget)
data/                     Cache och mellanfiler från pipelinen (gitignorerad)
kartor/                   Källshapefiler (SWEREF 99 TM) för kommuner och län
```

## Körordning

```r
# R (från projektroten, t.ex. i RStudio via kommundata.Rproj)
source("R/kap01-hamta.R")      # eller: Rscript R/kap01-hamta.R befolkning
source("R/kap02-bearbeta.R")
source("R/kap03-ai-analys.R")  # lista texter att skriva + kontroll; texterna skrivs i Claude Code
source("R/kap04-exportera.R")
```

- Ange teman som kommandoradsargument eller sätt `TEMAN <- c(...)` innan `source()`.
- `force <- TRUE` i globala miljön tvingar omhämtning (annars inkrementell cache).

```bash
cd app
npm install
npm run dev      # lokal utveckling
npm run build    # tsc -b && vite build — samma som CI kör
```

Deploy sker automatiskt via `.github/workflows/deploy.yml` vid push till
`master`. Ett TypeScript-fel stoppar deployen, så kör `npm run build` lokalt
innan push. Appens bas-sökväg är `/grafbibliotek/` (`app/vite.config.ts`).

## Viktiga principer

- **Hämta totalnivå som standard** (kön = totalt, ålder = totalt osv.) och bryt
  bara ned när det efterfrågas. Använd eliminate-mönstret i PxWeb.
- **Ange regionkoder explicit** i varje API-anrop. Alla kommuner och riket
  hämtas för att kunna rangordna; Halland filtreras fram i frontend.
- **Respektera SCB:s rate limit** (10 anrop / 10 s, max 100 000 celler).
- **Regionkoder:** Region Halland = `0013` (Kolada) / `13` (SCB),
  riket = `0000` (Kolada) / `00` (SCB).
- Egna beräknade KPI:er har prefix `S_`, `C_` eller `E_` och kräver
  `beraknade_kpier` i temats config.
- Nytt tema: `R/teman/<id>/config.R` + `app/src/teman/<id>.ts` + registrering
  i `app/src/teman/index.ts`. Se checklistan i `METODIK.md` §12.
- Hemligheter ligger i `.Renviron` (gitignorerad) — checka aldrig in den.
- Gränssnittet följer Tufte-principer: lite dekor, direktetiketter, siffror i fokus.

## AI-analys

- `kap03-ai-analys.R` bygger ett sifferunderlag per tema och enhet ur
  `data/bearbetad-<tema>.rds`, med exakt de KPI:er som visas på sidan (frontendens
  tema-config exporteras med `app/scripts/exportera-teman.mjs`). Underlaget sparas i
  `data/analys-underlag/` för spårbarhet.
- **Texterna skrivs av Claude Code i sessionen (Max-planen), aldrig via Anthropic API.**
  Skriptet listar saknade eller inaktuella texter i `data/analys-uppdrag.md` med hash och
  period. Skriv dem som `data/analys-cache/<id>.json` (format överst i kap03) enligt
  `R/analys/systemprompt.md`, som följer kapitelrapportens språkregler (PROJEKTGUIDE 9
  och 9.1, skrivagenten): inga tankstreck, påstående–belägg–förbehåll, inga värdeladdade ord.
  Många texter: dela upp på parallella agenter, tre till fyra texter var.
- Kontrollera varje text med `Rscript R/analys/kontrollera-text.R <id> ...` (varje siffra
  ska finnas i underlaget, inga tankstreck, inga %). Kör sedan kap03 igen: det loggar
  kontrollen i `data/analys-kontroll.md` och bygger `data/halland-analys.json`.
- **Sifferkontrollen räcker inte.** Varje text granskas också påstående för påstående mot
  underlaget (systemprompten, avsnittet "Påståenden ska vara lika exakta som siffrorna"):
  jämförelser, superlativ, riktning och period, vad som "driver" något (alla komponenter
  vägda), absoluta ord, definitioner. Granskningen 2026-10-02 hittade sakfel i nästan
  varje text, bland annat att Hallands tillväxt "vilar helt på inflyttning" fast
  invandringsöverskottet var nästan lika stort. Befolkningsunderlaget har därför ett
  avsnitt med befolkningsförändringens komponenter per år.
- **Figurer** (`R/analys/figurregler.md`): en till tre per text i `res.figurer`, efter det stycke
  vars påstående de visar. Typer: `utveckling`, `delar`, `halland`, `uppdelning`, `landet`.
  KPI:erna får bara tas ur `data/analys-underlag/<id>.figurer.json` (temats tabell och
  `figurKpiIds`); filen ingår inte i hashen. Rubriken är budskapet och kontrolleras som texten.
  kap03 och `kontrollera-text.R` prövar varje figur; en ogiltig figur publiceras inte. Ritas av
  `AnalysFigur.tsx` (`charts/SerieGraf`, `Delar`, `HallandStaplar`, `Spar`); månadsdata visas
  som samma månad varje år, så att säsongen inte skymmer trenden.
- **Tre tidsperspektiv** (systemprompten, avsnittet med samma namn): lång trend (hela serien
  eller tio år), kortare trend (fem år) och senaste året, i den ordningen. Ett enskilt år får
  aldrig stå för läget: Falkenberg "står inte still" när folkmängden vuxit stadigt sedan 2000
  och bara var oförändrad det senaste året; rätt är att den växer men har bromsat in.
  Underlaget ger därför förändring på flera horisonter (för antal även genomsnitt per år)
  och värdena år för år de senaste tio åren. Granskningen kontrollerar detta särskilt.
- **AI-märkning:** varje analys börjar med upplysningen i `app/src/components/AiUpplysning.tsx`
  (EU:s AI-förordning art. 50, Diggs och IMY:s riktlinjer): att texten är AI-genererad, hur den
  kontrolleras, förbehåll och kontakt. Texten säger att texterna inte granskats i sin helhet av
  en analytiker; ändra den där om arbetssättet ändras.
- Befolkningssiffrorna för 2025 är preliminära och skyddade med SCB:s CKM-metod (små
  slumpavvikelser), så komponenterna summerar inte alltid exakt till folkmängdsförändringen.
- **Övergång (oktober 2026):** temastrukturen (band och uppdelningar) har ändrats, så alla
  texter är inaktuella mot underlaget tills de skrivits om, då med figurer. Den publicerade
  `app/public/data/halland-analys.json` stämmer fortfarande i sak och ska inte skrivas över:
  kör kap04 som `Rscript -e 'kopiera_analys <- FALSE; source("R/kap04-exportera.R")'` och
  committa inte den filen förrän alla texter är klara. Översikten per enhet är borttagen.
- Hashen i `data/analys-cache/` knyter texten till underlag + systemprompt. Ändras datan
  blir texten inaktuell och visas inte förrän den skrivits om.
- Decimalregeln är densamma i R (`decimaler()`) och frontend (`kpiDecimaler()`), så att
  siffrorna i texten stämmer med korten.

## Frontend

- Adressen bär hela läget (`hooks/useHash.ts`): `#/<enhet>/<tema>` ett område,
  `#/<enhet>/<tema>/<kpi>` öppen popup (bakåtknappen stänger den). Enhet = `halland`, en
  kommun eller `alla`; ofullständiga och gamla adresser (`#/`, `#/analys`) leder till första
  området. Det finns ingen översiktssida: datan ska stå i förgrunden.
- Sidhuvud: kommunväljaren (Halland, kommunerna norr→söder, *Alla sida vid sida*). Sidomeny
  (bred skärm) / rad under huvudet (mobil): de tio områdena.
- Område (`TemaBlock.tsx`): ingången (analysens rubrik och ingress) → tabellen → hela analysen.
  - **Tabell** (`TemaTabell.tsx`, stilar `.kt-*` i `index.css`): samma formspråk som Läget i
    Halland (`../../lagetihalland/nyalaget/maluppfoljning.html`, GRAFIK.md där). Tre nivåer
    (METODIK §8.0): band med block i områdesfärg → indikator → uppdelning, ihopfälld bakom en
    textknapp under namnet (*Visa kvinnor och män*), med linje i områdesfärg och korta radnamn
    (`kortNamn`). *Fäll ut alla uppdelningar* i kolumnhuvudet; utskrift fäller ut allt.
    Kolumnhuvud i dagspressstil, värdet med förändring på tio år inom parentes och enheten
    under, riket och spåret (`charts/Spar.tsx`) med kvartilerna tonade (mittersta hälften grå;
    bästa och sämsta fjärdedelen grön och röd när riktningen är känd) och placeringen inom
    parentes direkt efter, "(plats 17)". Placeringen visas bara där i raden. All fördjupning i
    radens tooltip (`RadTip.tsx`), som slutar med "Klicka på raden för diagram och karta";
    diagramsymbolen (`DiagramIkon.tsx`) efter namnet visar samma sak. Färg på förändring och
    placering bara när önskvärd riktning är känd (`lagtArBra` eller `hogtArBra`).
  - **Alla sida vid sida** (`JamforTabell.tsx`): indikatorer × kommunerna (norr→söder), länet
    och riket med samma nivåer; cellfärg = läge bland landets kommuner i neutral blå skala
    (inte önskvärdhet). Analysen är länets.
- Stora tal (`fmtStor` i `utils/format.ts`): från en miljon med tre värdesiffror i mn eller mdr
  (3,13 mn, 40,9 mdr) i tabeller, spår och figurer; förändringen i samma enhet som värdet
  (3,13 mn (+0,43 mn)). Exakta värden i tooltipen, cellernas hjälptext och figurernas tabellvy.
- Data: sidan laddar bara områdets kompakta `halland-tabell-<tema>.json` (0,2–2 MB); hela
  `halland-data-<tema>.json` hämtas först när graf och karta öppnas (METODIK §10.3).
- Kommunernas fasta färger (`ENHET_FARG` i `types.ts`) följer grafriktlinjen VIS-01.
- Förändringar och rangplatser visas i neutral färg: de flesta indikatorer saknar en given
  önskvärd riktning. Där den är entydig anges den i temats config: `lagtArBra` (arbetslöshet,
  utsläpp, ohälsa) eller `hogtArBra` (sysselsättning, behörighet, förnybart, skyddad natur).

## Fördjupning

- Kapitelrapportens `PROJEKTGUIDE.md` avsnitt 9 och `.claude/agents/skrivagent.md`
  (`../../kapitelrapport`): förlagan för analystextens ton och regler.
- `METODIK.md` — detaljerad metodik: tema-config, enheter, KPI-urval, designsystem.
- `DATAHAMTNING.md` — guide till API:erna (SCB, Kolada, FoHM, Tillväxtverket, Trafikanalys).
- `PUBLICERING.md` — publicering via GitHub Pages och planerad domän `analys.regionhalland.se`.
