# THEBANDView

Een iPad-vriendelijke videohub voor kinderen om YouTube-video's van **Drumfanfare Exempel** te bekijken.

---

## Bestandsstructuur

```
THEBANDView/
├── index.html          ← De pagina (verander dit niet)
├── styles.css          ← Alle opmaak
├── app.js              ← Alle logica
├── data/
│   └── videos.json     ← ✏️  HIER voeg jij video's toe
├── assets/
│   └── logo.png        ← Jouw logo (optioneel, zie hieronder)
└── README.md           ← Dit bestand
```

---

## Video's toevoegen

Open **`data/videos.json`** in een teksteditor en voeg een nieuw blok toe aan het begin van de `videos`-lijst.

### Structuur van één video

```json
{
  "title": "Taptoes – Zomerfeest 2026",
  "youtubeUrl": "https://www.youtube.com/watch?v=JOUW_VIDEO_ID",
  "category": "Taptoes",
  "date": "2026-07-20"
}
```

| Veld         | Uitleg                                                   |
|-------------|----------------------------------------------------------|
| `title`      | Naam van de video zoals die in de app verschijnt         |
| `youtubeUrl` | De volledige YouTube-link van de video                   |
| `category`   | Één van de categorieën (zie hieronder)                   |
| `date`       | Datum in het formaat `JJJJ-MM-DD` (jaar-maand-dag)      |

> **Tip:** Voeg de nieuwste video altijd **bovenaan** de lijst toe, dan verschijnt hij meteen in de sectie "Nieuwste video's".

### Hoe vind je het YouTube-video-ID?

Open de video op YouTube. In de browser-URL zie je iets als:

```
https://www.youtube.com/watch?v=dQw4w9WgXcQ
```

Het gedeelte na `?v=` is het video-ID: `dQw4w9WgXcQ`.

Plak de volledige URL in het `youtubeUrl`-veld; de app haalt het ID er zelf uit.

---

## Categorieën

De vier categorieën die al in de app zitten:

| Categorie      | Gebruik voor                              |
|---------------|-------------------------------------------|
| `Taptoes`      | Taptoes-optredens en oefeningen           |
| `THE GAME`     | THE GAME-wedstrijden en afleveringen      |
| `Streetparades`| Straatparades en optochten               |
| `Concerten`    | Concerten en grote shows                  |

### Een nieuwe categorie toevoegen

Voeg in `videos.json` bij een video een categorienaam naar keuze in, bijvoorbeeld:

```json
"category": "Workshops"
```

De app maakt automatisch een nieuw filter-knopje aan. Geen codewijziging nodig.

---

## Logo vervangen

1. Sla jouw logo op als **`assets/logo.png`**.
2. Het logo wordt aanbevolen in een verhouding van **4:1** (breed formaat), maximale hoogte in de app is 46 px.
3. Als er geen `logo.png` gevonden wordt, verschijnt de tekst **THEBANDView** als fallback.

---

## De site lokaal bekijken

Gewoon dubbelklikken op `index.html` werkt **niet** goed, omdat de browser dan het `data/videos.json`-bestand niet mag inladen (beveiligingsregel van browsers).

Gebruik een eenvoudige lokale server:

### Met VS Code (aanbevolen)
1. Installeer de extensie **Live Server** (door Ritwick Dey).
2. Rechtsklik op `index.html` → **Open with Live Server**.
3. De site opent automatisch in je browser op `http://127.0.0.1:5500`.

### Met Node.js
```bash
npx serve .
```
Ga dan naar `http://localhost:3000`.

---

## Publiceren via GitHub Pages

Volg deze stappen als je nog nooit GitHub Pages hebt gebruikt.

### Stap 1 – GitHub-account aanmaken
Ga naar [github.com](https://github.com) en maak een gratis account aan als je er nog geen hebt.

### Stap 2 – Een nieuwe repository aanmaken
1. Klik rechtsboven op het **+**-icoontje → **New repository**.
2. Geef de repository de naam `THEBANDView` (of een andere naam).
3. Kies **Public** (anders werkt GitHub Pages niet gratis).
4. Klik op **Create repository**.

### Stap 3 – Bestanden uploaden
1. Klik op de knop **uploading an existing file** (of sleep je bestanden naar de pagina).
2. Sleep **alle bestanden en mappen** van jouw project naar het uploadvenster:
   - `index.html`
   - `styles.css`
   - `app.js`
   - de map `data/` (met `videos.json` erin)
   - de map `assets/` (met `logo.png` erin, als je die hebt)
3. Klik onderaan op **Commit changes**.

### Stap 4 – GitHub Pages inschakelen
1. Ga naar je repository op GitHub.
2. Klik bovenaan op **Settings**.
3. Klik in het linkermenu op **Pages**.
4. Onder **Branch** kies je `main` en de map `/` (root).
5. Klik op **Save**.

Na ongeveer een minuut is je site live op:

```
https://JOUW-GEBRUIKERSNAAM.github.io/THEBANDView/
```

### Stap 5 – Video's bijwerken na publicatie
1. Bewerk `data/videos.json` op je computer.
2. Ga naar je repository op GitHub.
3. Klik op het bestand `data/videos.json`.
4. Klik op het **potlood-icoontje** (Edit this file).
5. Plak je bijgewerkte JSON.
6. Klik op **Commit changes**.

De site is na een paar seconden bijgewerkt.

---

## De site openen op een iPad en toevoegen aan het beginscherm

1. Open Safari op de iPad.
2. Ga naar de URL van jouw GitHub Pages-site.
3. Tik op het **deel-icoontje** (vierkantje met pijl omhoog) onderin de browserbalk.
4. Kies **Zet op beginscherm** (Add to Home Screen).
5. Geef de snelkoppeling de naam **THEBANDView** en tik op **Voeg toe**.

De app verschijnt nu als icoontje op het beginscherm en opent zonder browserbalk, net als een echte app.

---

## Veelgestelde vragen

**De miniaturen (thumbnails) van de video's worden niet getoond.**  
Controleer of de `youtubeUrl` in `videos.json` een geldige YouTube-link is met een correct video-ID. Miniaturen worden automatisch opgehaald van YouTube zodra een geldig ID aanwezig is.

**De video speelt niet af in de app, maar opent YouTube.**  
Dit zou niet mogen gebeuren. Controleer of je Safari gebruikt op de iPad (Chrome op iOS blokkeert soms inline video). De site is getest en geoptimaliseerd voor Safari.

**Kan ik video's van een privé-playlist toevoegen?**  
Nee, alleen publieke YouTube-video's werken in een embed.

---

*Gemaakt voor Drumfanfare Exempel · Statische site · Werkt op GitHub Pages*
