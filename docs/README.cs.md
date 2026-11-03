[English version](../README.md)

# MyiNatAnimated

Animovaný mapový příběh z&nbsp;vašich pozorování na iNaturalist.

Aplikace promění vaše terénní nálezy, expedice nebo celoroční bilanci do plynulého kinematografického videa či animovaného GIFu s&nbsp;reaktivním pohybem kamery, zvukovými efekty a&nbsp;prezentací nejzajímavějších druhů.

![Ukázka animovaného mapového příběhu](../test/myinat_antsczech_16x9.gif)

---

# ČÁST I: PŘEHLED, VÝSTUPY A NÁVOD K POUŽITÍ

## K čemu aplikace slouží

Jste aktivní na iNaturalistu a&nbsp;chcete se podělit o&nbsp;svá pozorování v&nbsp;poutavém video formátu? **MyiNatAnimated** načte veřejná data libovolného uživatele za vybrané období a&nbsp;vytvoří dynamickou animovanou mapu:

- **Dynamická kamera:** Automaticky sleduje trasu vašich nálezů. Na místech s&nbsp;více pozorováními plynule přibližuje detaily, při delších přesunech (např.&nbsp;přejezd mezi pohořími či státy) provede elegantní vysoký přelet s&nbsp;oddálením.
- **Dopaminové audio-vizuální efekty:** Každé zaznamenané pozorování na mapě pulzuje a&nbsp;vystřelí tematickou ikonu taxonu (rostliny, hmyz, houby, ptáci apod.) s&nbsp;barevným laděním podle iNaturalistu.
- **Procedurální zvukový doprovod:** Web Audio syntezátor generuje pentatonické tóny při každém nálezu, slavnostní akordy při objevení klíčových druhů a&nbsp;větrný svist při přeletech kamery.
- **Výběr highlightů:** Chytrý algoritmus automaticky vybere nejzajímavější nálezy (podle oblíbenosti, komentářů a&nbsp;statusu *Research Grade*), které si můžete v&nbsp;přehledné mřížce sami doupravit.
- **100% v&nbsp;prohlížeči bez registrace:** Veškerý výpočet, příprava grafiky i&nbsp;kódování videa probíhá přímo na vašem zařízení. Žádná data se neposílají na cizí servery.

---

## Co aplikace vygeneruje

Z&nbsp;aplikace můžete přímo stáhnout:

1. **MP4 video se synchronizovaným zvukem:**
   - Kódováno v&nbsp;H.264 videu s&nbsp;AAC zvukem (ve vysokém rozlišení).
   - Výběr poměru stran jedním kliknutím:
     - **16:9 (na šířku):** Ideální pro YouTube, prezentace a&nbsp;televize.
     - **9:16 (na výšku):** Optimalizováno pro Instagram Reels, TikTok a&nbsp;YouTube Shorts.
     - **1:1 (čtverec):** Vhodné pro příspěvky na sociální sítě.
2. **Animovaný GIF:**
   - Vhodný pro rychlé sdílení na fórech, v&nbsp;blozích nebo chatu.
3. **Interaktivní zážitek na webu:**
   - Možnost přehrávat mapový příběh přímo v&nbsp;prohlížeči, libovolně zastavovat, posouvat časovou osu a&nbsp;přepínat mezi mapovými styly (Dark, Satelitní, Voyage, Světlý).

---

## Jak aplikaci spustit

### 1. Online v prohlížeči (bez instalace)
Aplikace běží online na GitHub Pages:
**[https://sidlocz.github.io/MyiNatAnimated/](https://sidlocz.github.io/MyiNatAnimated/)**

### 2. Lokální spuštění na vlastním počítači (Windows / macOS / Linux)

Vzhledem k&nbsp;tomu, že moderní webové aplikace využívají Web Workery, mapové podklady a&nbsp;ES moduly, nelze soubor `index.html` otevírat pouhým poklepáním přes protokol `file://` (prohlížeče z&nbsp;bezpečnostních důvodů blokují CORS). Pro lokální běh postupujte takto:

1. Nainstalujte si [Node.js](https://nodejs.org/) (verze 18 nebo vyšší).
2. Otevřete složku projektu a&nbsp;nainstalujte potřebné knihovny:
   ```bash
   npm install
   ```
3. Spusťte aplikaci jedním z&nbsp;těchto způsobů:
   - **Na Windows:** Poklepejte na soubor `start.bat`.
   - **V terminálu:**
     ```bash
     npm run dev
     ```
     Otevřete prohlížeč na adrese `http://localhost:3000`.
   - **Produkční náhled:**
     ```bash
     npm run build
     npm run preview
     ```

---

## Návod krok za krokem: Jak vytvořit svůj příběh

### Krok 1: Výběr uživatele a období
Do pole zadejte své uživatelské jméno na iNaturalistu (případně jméno libovolného jiného přírodovědce). Můžete zvolit konkrétní časové rozmezí, nebo využít rychlá tlačítka (*Minulý rok*, *Léto*, *Vše*). Chcete-li si aplikaci jen vyzkoušet, klikněte na tlačítko **Demo**, které okamžitě načte ukázková data.

*(Obrázek obrazovky: `docs/images/01_vyhledavani.png`)*

### Krok 2: Výběr highlightů a filtrování
Aplikace seřadí pozorování a&nbsp;navrhne až 12 nejvýznamnějších nálezů.
- Kliknutím na kartu druhu můžete pozorování přidat do výběru nebo jej odebrat.
- **Filtr zastřených souřadnic:** Umožňuje vyloučit druhy se záměrně znepřesněnou polohou (ohrožené taxony), aby v&nbsp;mapě nevznikaly umělé skoky.
- **Filtr izolovaných nálezů:** Umožňuje skrýt ojedinělá pozorování vzdálená stovky kilometrů od hlavní trasy, aby kamera zůstala plynule zaměřena na hlavní lokalitu.
- **Řazení:** Zvolte, zda se má příběh odvíjet podle skutečného data nálezu v&nbsp;terénu, nebo podle data nahrání na iNaturalist.

*(Obrázek obrazovky: `docs/images/02_vyber_highlightu.png`)*

### Krok 3: Přehrávání a ovládání mapy
Po kliknutí na *Vytvořit příběh* proběhne rychlá příprava (vygenerování klíčových snímků kamery, atlasu vektorových ikon a&nbsp;přednačtení mapových dlaždic). Následně se spustí samotný přehrávač:
- Přehrávání můžete kdykoliv pozastavit mezerníkem nebo tlačítkem.
- Pomocí posuvníku lze okamžitě přeskočit na libovolný okamžik trasy.
- V&nbsp;pravém horním rohu můžete přepínat styl mapy (Temná, Satelitní, Kontrastní).

*(Obrázek obrazovky: `docs/images/03_prehravac_a_mapa.png`)*

### Krok 4: Export videa a GIFu
Klikněte na tlačítko **Exportovat**. Otevře se okno s&nbsp;volbou parametrů:
- Vyberte formát: **MP4 video se zvukem** nebo **animovaný GIF**.
- Zvolte poměr stran: **16:9**, **9:16 (Shorts/Reels)** nebo **1:1**.
- Klikněte na *Zahájit export*. Během několika sekund se soubor deterministicky vyrenderuje a&nbsp;nabídne ke stažení do počítače.

*(Obrázek obrazovky: `docs/images/04_dialog_exportu.png`)*

---

# ČÁST II: ARCHITEKTURA A TECHNICKÉ INFORMACE

## Technologický stack

- **Frontendové jádro:** React 18, TypeScript, Vite
- **Styling a UI:** Tailwind CSS, Lucide React (inline SVG ikony)
- **Mapové prostředí:** MapLibre GL JS s&nbsp;bezplatnými vektorovými styly z&nbsp;OpenFreeMap (bez nutnosti registrace a&nbsp;API klíčů)
- **Zvuková syntéza:** Web Audio API (procedurální generování tónů bez externích zvukových souborů)
- **Enkódování médií:** `mp4-muxer` a&nbsp;WebCodecs API (s&nbsp;fallbackem na `MediaRecorder`), `gifenc` pro animované GIFy
- **Lokální mezipaměť:** IndexedDB přes knihovnu `idb-keyval`
- **Testování:** Vitest

## Architektura animačního jádra

Aplikace je rozdělena do modulárních komponent v&nbsp;adresáři `src/`:

- `src/engine/cameraDirector.ts`:
  - Algoritmus kinematografické kamery. Vypočítává vážené těžiště pozorování v&nbsp;čase, provádí plynulé vyhlazování (lerp dampening), shlukování na počátku trasy a&nbsp;obloukové přelety s&nbsp;oddálením při velkých vzdálenostech.
- `src/engine/dopamineCanvas.ts`:
  - Canvasová vrstva vykreslující rázové vlny, pulzující světelné kruhy a&nbsp;trajektorii pohybu.
- `src/engine/spriteAtlas.ts`:
  - Převod vektorových SVG taxonových ikon do rastrového atlasu pro maximální vykreslovací výkon (60&nbsp;fps) bez opakovaného parsování DOM prvků.
- `src/engine/soundEngine.ts`:
  - Vícedenní procedurální syntezátor. Využívá frekvenční oscilátory a&nbsp;generátory šumu pro zvuk větru při rychlém přeletu kamery.
- `src/engine/videoExporter.ts` a&nbsp;`src/engine/gifExporter.ts`:
  - Deterministický offline záznamník. Během exportu krokuje čas po přesných časových úsecích (nezávisle na reálné rychlosti procesoru), což zaručuje dokonale plynulý výstup bez trhání i&nbsp;na méně výkonných počítačích.
- `src/services/inatApi.ts` a&nbsp;`src/services/requestQueue.ts`:
  - Šetrné načítání z&nbsp;iNaturalist API v1. Dodržuje limit maximálně 1 požadavek za 1,1&nbsp;s, využívá kurzorové stránkování `id_above` a&nbsp;ukládá kompletní odpovědi do IndexedDB mezipaměti.

---

## Příkazy pro vývojáře

- **Instalace závislostí:** `npm install`
- **Spuštění vývojového serveru:** `npm run dev`
- **Spuštění testovací sady:** `npm test`
- **Typová kontrola (linter):** `npm run lint`
- **Sestavení produkčního balíčku:** `npm run build`
- **Lokální náhled produkčního sestavení:** `npm run preview`
