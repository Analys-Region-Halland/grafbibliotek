# Publicering av analysrapporter

## Vad vi har byggt

Vi publicerar interaktiva analysrapporter via GitHub Pages — en
gratistjänst kopplad till GitHub där färdiga webbsidor serveras
direkt från ett repository. Ingen egen server behövs, inga
driftskostnader, och uppdateringar sker genom ett enda kommando.

Varje rapport är ett eget repository under vår
GitHub-organisation **Analys-Region-Halland**.

Första rapporten finns redan publicerad:

**Grafgalleri — regional statistik för Halland**
https://analys-region-halland.github.io/grafgalleri/


## Hur det fungerar

Varje rapport vi skapar hamnar automatiskt på en egen adress:

    analys-region-halland.github.io/grafgalleri/
    analys-region-halland.github.io/rapport-bostader/
    analys-region-halland.github.io/arbetsmarknad-2025/

Vi behöver inte konfigurera något per rapport — adressen skapas
automatiskt när vi publicerar. Arbetsflödet per rapport är:
skapa repo, publicera med Quarto, klart.


## Koppling till regionhalland.se

Vi vill att rapporterna nås via adresser under regionhalland.se:

    analys.regionhalland.se/grafgalleri/
    analys.regionhalland.se/rapport-bostader/
    analys.regionhalland.se/arbetsmarknad-2025/

**Vad som behövs från IT:**
En enda DNS-post (CNAME) som pekar subdomänen till GitHub:

    analys.regionhalland.se  →  CNAME  →  analys-region-halland.github.io

Det är allt. Inga serverändringar, ingen konfiguration av
webbservern. GitHub hanterar HTTPS-certifikat automatiskt.
Vi lägger till en konfigurationsfil på vår sida — sedan
ärver alla framtida rapporter den adressen utan ytterligare
åtgärder.


## Publiceringsguide (för oss)

### 1. Skapa repo

Gå till https://github.com/organizations/Analys-Region-Halland/repositories/new
- Namnge repot (gemener, bindestreck)
- Välj **Public** (krävs för gratis GitHub Pages)
- Skapa tomt (ingen README)

### 2. Initiera och pusha lokalt

```bash
cd projektmapp
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/Analys-Region-Halland/{reponamn}.git
git branch -M main
git push -u origin main
```

### 3. Publicera med Quarto

```bash
quarto publish gh-pages
```

Quarto renderar, skapar en `gh-pages`-branch och pushar
automatiskt. Vid efterföljande uppdateringar räcker:

```bash
quarto publish gh-pages --no-prompt
```

### Tips
- Hard-refresh (**Ctrl+Shift+R**) för att se uppdateringar —
  GitHub Pages cachar aggressivt
- `_publish.yml` skapas automatiskt efter första publicering


## Vid frågor

GitHub-organisationen finns här:
https://github.com/Analys-Region-Halland
