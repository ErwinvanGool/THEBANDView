# THEBANDView

Een iPad-vriendelijke videohub voor **Drumfanfare Exempel** om YouTube-video's te bekijken als een echte app.

---

## Hoe werkt de app?

- Video's worden geladen vanuit een **Google Spreadsheet** (primaire bron). Als die niet bereikbaar is, valt de app terug op **`data/videos.json`**.
- Publicatiedata worden automatisch opgehaald via de **YouTube Data API v3** en 7 dagen gecached in de browser (localStorage).
- Video's worden automatisch **gesorteerd op publicatiedatum** (nieuwste eerst). Je hoeft zelf geen datum bij te houden.
- De sectie **"Voor jouw uitgekozen"** toont 6 willekeurig gekozen video's uit de actieve categorie.
- De knop **"Verras me!"** opent een willekeurige video direct in de speler.
- In de speler kun je met **Vorige / Volgende** door de gefilterde lijst navigeren en zie je **suggesties** voor andere video's.

---

## Bestandsstructuur

```
THEBANDView/
├── index.html              ← De pagina (verander dit niet)
├── styles.css              ← Alle opmaak
├── app.js                  ← Alle logica
├── manifest.json           ← PWA-instellingen (installeerbaar op iPad)
├── data/
│   └── videos.json         ← ✏️  Fallback-videolijst
├── assets/
│   ├── logo.png            ← Jouw logo (optioneel, zie hieronder)
│   ├── apple-touch-icon.png← App-icoon voor iPhone/iPad (180×180 px)
│   ├── icon-192.png        ← PWA-icoon (192×192 px)
│   └── icon-512.png        ← PWA-icoon (512×512 px)
└── README.md               ← Dit bestand
```

---

## Video's toevoegen

### Aanbevolen: via Google Spreadsheet

De app leest standaard een gepubliceerde Google Spreadsheet uit. Voeg een nieuwe rij toe met de kolommen:

| Kolom        | Uitleg                                                 |
|--------------|--------------------------------------------------------|
| `title`      | Naam van de video zoals die in de app verschijnt       |
| `youtubeUrl` | De volledige YouTube-link van de video                 |
| `category`   | Één van de categorieën (zie hieronder)                 |

De publicatiedatum wordt automatisch opgehaald — je hoeft die **niet** in de spreadsheet te zetten.

### Alternatief: via `data/videos.json`

Als je geen Google Spreadsheet gebruikt, open dan **`data/videos.json`** en voeg een nieuw blok toe:

```json
{
  "title": "Taptoes – Zomerfeest 2026",
  "youtubeUrl": "https://www.youtube.com/watch?v=JOUW_VIDEO_ID",
  "category": "Taptoes"
}
```

| Veld         | Uitleg                                               |
|--------------|------------------------------------------------------|
| `title`      | Naam van de video zoals die in de app verschijnt     |
| `youtubeUrl` | De volledige YouTube-link van de video               |
| `category`   | Één van de categorieën (zie hieronder)               |

> **Let op:** Een `date`-veld is **niet meer nodig**. De publicatiedatum wordt automatisch opgehaald via de YouTube API.

### Hoe vind je het YouTube-video-ID?

Open de video op YouTube. In de browser-URL zie je iets als:

```
https://www.youtube.com/watch?v=dQw4w9WgXcQ
```

Het gedeelte na `?v=` is het video-ID: `dQw4w9WgXcQ`.

Plak de volledige URL in het `youtubeUrl`-veld; de app haalt het ID er zelf uit.

---

## Categorieën

De vijf categorieën die al in de app zitten:

| Categorie      | Gebruik voor                              |
|----------------|-------------------------------------------|
| `THE GAME`     | THE GAME-wedstrijden en afleveringen      |
| `Taptoes`      | Taptoes-optredens en oefeningen           |
| `Optredens`    | Overige optredens                         |
| `Streetparades`| Straatparades en optochten                |
| `Concerten`    | Concerten en grote shows                  |

### Een nieuwe categorie toevoegen

Voeg bij een video een nieuwe categorienaam in, bijvoorbeeld:

```json
"category": "Workshops"
```

De app maakt automatisch een nieuw filter-knopje aan. Geen codewijziging nodig.

---

## YouTube API-sleutel instellen

De app gebruikt de **YouTube Data API v3** om publicatiedatums op te halen en video's op datum te sorteren.

> De API-sleutel wordt **nooit** in de broncode opgeslagen. Hij wordt automatisch ingevuld via een **GitHub Actions-secret** bij elke deploy.

### Stap 1 – API-sleutel aanmaken
1. Ga naar de [Google Cloud Console](https://console.cloud.google.com/).
2. Maak een project aan (of gebruik een bestaand project).
3. Activeer de **YouTube Data API v3**.
4. Maak een **API key** aan onder *Credentials*.

### Stap 2 – Sleutel opslaan als GitHub Secret
1. Ga naar jouw repository op GitHub.
2. Klik op **Settings** → **Secrets and variables** → **Actions**.
3. Klik op **New repository secret**.
4. Naam: `YOUTUBE_API_KEY`, waarde: jouw sleutel.
5. Klik op **Add secret**.

De GitHub Actions workflow vervangt automatisch de tijdelijke waarde `__YOUTUBE_API_KEY__` in `app.js` bij elke deploy.

> **Zonder API-sleutel** werkt de app nog steeds, maar video's worden dan gesorteerd op de volgorde in de spreadsheet of `videos.json` (geen automatische datumsortering).

---

## Logo vervangen

1. Sla jouw logo op als **`assets/logo.png`**.
2. Aanbevolen verhouding: **4:1** (breed formaat); maximale hoogte in de app is 46 px.
3. Als er geen `logo.png` gevonden wordt, verschijnt het cameraicoon met de merknaam **THEBANDView** als fallback.

---

## De site lokaal bekijken

Dubbelklikken op `index.html` werkt **niet**, omdat de browser dan `data/videos.json` en de Google Spreadsheet niet mag ophalen (beveiligingsregel van browsers).

Gebruik een eenvoudige lokale server:

### Met VS Code (aanbevolen)
1. Installeer de extensie **Live Server** (door Ritwick Dey).
2. Rechtsklik op `index.html` → **Open with Live Server**.
3. De site opent automatisch op `http://127.0.0.1:5500`.

### Met Node.js
```bash
npx serve .
```
Ga dan naar `http://localhost:3000`.

---

## Publiceren via GitHub Pages

### Stap 1 – GitHub-account aanmaken
Ga naar [github.com](https://github.com) en maak een gratis account aan als je er nog geen hebt.

### Stap 2 – Een nieuwe repository aanmaken
1. Klik rechtsboven op het **+**-icoontje → **New repository**.
2. Geef de repository de naam `THEBANDView` (of een andere naam).
3. Kies **Public** (anders werkt GitHub Pages niet gratis).
4. Klik op **Create repository**.

### Stap 3 – Bestanden uploaden
1. Klik op **uploading an existing file** (of sleep je bestanden naar de pagina).
2. Upload **alle bestanden en mappen**:
   - `index.html`
   - `styles.css`
   - `app.js`
   - `manifest.json`
   - de map `data/` (met `videos.json` erin)
   - de map `assets/` (met logo en iconen erin)
3. Klik onderaan op **Commit changes**.

### Stap 4 – GitHub Pages inschakelen
1. Ga naar je repository op GitHub.
2. Klik bovenaan op **Settings** → **Pages**.
3. Onder **Branch** kies je `main` en de map `/` (root).
4. Klik op **Save**.

Na ongeveer een minuut is je site live op:

```
https://JOUW-GEBRUIKERSNAAM.github.io/THEBANDView/
```

### Stap 5 – Video's bijwerken na publicatie

**Via Google Spreadsheet:** voeg een rij toe in de spreadsheet. De app pikt de wijziging bij de volgende bezoek automatisch op.

**Via `videos.json`:**
1. Ga naar je repository op GitHub.
2. Klik op `data/videos.json` → **potlood-icoontje** (Edit this file).
3. Pas de JSON aan en klik op **Commit changes**.

---

## De site openen op een iPad en toevoegen aan het beginscherm

1. Open **Safari** op de iPad.
2. Ga naar de URL van jouw GitHub Pages-site.
3. Tik op het **deel-icoontje** (vierkantje met pijl omhoog) onderin de browserbalk.
4. Kies **Zet op beginscherm** (Add to Home Screen).
5. Geef de snelkoppeling de naam **THEBANDView** en tik op **Voeg toe**.

De app verschijnt als icoontje op het beginscherm en opent zonder browserbalk, net als een echte app.

---

## Veelgestelde vragen

**De miniaturen (thumbnails) van de video's worden niet getoond.**  
Controleer of de `youtubeUrl` een geldige YouTube-link is met een correct video-ID. Miniaturen worden automatisch opgehaald van YouTube.

**Video's staan niet op datum gesorteerd.**  
Waarschijnlijk is er geen YouTube API-sleutel ingesteld. Zie de sectie *YouTube API-sleutel instellen* hierboven.

**De video speelt niet af in de app, maar opent YouTube.**  
Controleer of je **Safari** gebruikt op de iPad. Chrome op iOS blokkeert soms inline video-embeds. De app is getest en geoptimaliseerd voor Safari.

**Kan ik video's van een privé-playlist toevoegen?**  
Nee, alleen publieke YouTube-video's werken in een embed.

---

*Gemaakt voor Drumfanfare Exempel · Statische site · PWA · Werkt op GitHub Pages*
