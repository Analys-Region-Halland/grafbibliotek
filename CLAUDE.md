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
  src/components/         KpiKort, KpiModal, TemaBlock, JamforPanel, GuidadBerattelse …
  src/charts/             D3-diagram: Tidsserie, Sparkline, Beeswarm, KartaVy, RangIndikator
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
- **AI-märkning:** varje analys börjar med upplysningen i `app/src/components/AiUpplysning.tsx`
  (EU:s AI-förordning art. 50, Diggs och IMY:s riktlinjer): att texten är AI-genererad, hur den
  kontrolleras, förbehåll och kontakt. Texten säger att texterna inte granskats i sin helhet av
  en analytiker; ändra den där om arbetssättet ändras.
- Befolkningssiffrorna för 2025 är preliminära och skyddade med SCB:s CKM-metod (små
  slumpavvikelser), så komponenterna summerar inte alltid exakt till folkmängdsförändringen.
- Översikten per enhet (`<kod>_oversikt`) kommer upp i uppdragslistan först när enhetens
  alla tio temaanalyser är aktuella.
- Hashen i `data/analys-cache/` knyter texten till underlag + systemprompt. Ändras datan
  blir texten inaktuell och visas inte förrän den skrivits om.
- Decimalregeln är densamma i R (`decimaler()`) och frontend (`kpiDecimaler()`), så att
  siffrorna i texten stämmer med korten.

## Frontend

- Sidomeny (bred skärm) / rad under huvudet (mobil): växel Nyckeltal ↔ Analys + områdena.
- Nyckeltal: per tema ett analysband (rubrik + ingress → utfällbar panel med hela texten)
  och tre visningslägen (valet sparas i webbläsaren):
  - **Tabell** (standard, `TemaTabell.tsx`, stilar `.kt-*` i `index.css`): samma formspråk
    som Läget i Halland (`../../lagetihalland/nyalaget/maluppfoljning.html`, GRAFIK.md där).
    Kolumnhuvud i dagspressstil (rubrik + förklarande rad, 2 px linje), värdet med förändring
    på tio år inom parentes och enheten under, riket, spåret (`charts/Spar.tsx`: axel med
    ändvärden, landets kommuner som grå punkter staplade där de ligger tätt, riket svart,
    Halland streckat, vald enhet med pulserande ring, Hallands kommuner tänds när raden pekas)
    och plats som bricka med stege. Grupperna som tonade band. All fördjupning i radens
    tooltip (`RadTip.tsx`): stort tal, tidsserie med riket och Halland, plats nu och vid
    basåret, riket och Halland, högst i landet, spännvidden i Halland, beskrivning och källa.
    Färg på förändring och bricka bara när önskvärd riktning är känd (`lagtArBra`).
  - **Jämför kommuner** (`JamforTabell.tsx`): indikatorer × kommunerna (norr→söder), länet och
    riket; cellfärg = läge bland landets kommuner i neutral blå skala (inte önskvärdhet).
  - **Kort** (`KpiKort.tsx`): den tidigare kortvyn.
- Kommunernas fasta färger (`ENHET_FARG` i `types.ts`) följer grafriktlinjen VIS-01.
- Analys (`#/analys`): översikt för vald enhet följd av alla områden i tur och ordning.
- Förändringar och rangplatser visas i neutral färg: de flesta indikatorer saknar en given
  önskvärd riktning (`lagtArBra` anges i temats config där den finns).
- Den äldre artikelvyn (`AnalysFeed`, `ArtikelVy`) används inte.

## Fördjupning

- Kapitelrapportens `PROJEKTGUIDE.md` avsnitt 9 och `.claude/agents/skrivagent.md`
  (`../../kapitelrapport`): förlagan för analystextens ton och regler.
- `METODIK.md` — detaljerad metodik: tema-config, enheter, KPI-urval, designsystem.
- `DATAHAMTNING.md` — guide till API:erna (SCB, Kolada, FoHM, Tillväxtverket, Trafikanalys).
- `PUBLICERING.md` — publicering via GitHub Pages och planerad domän `analys.regionhalland.se`.
