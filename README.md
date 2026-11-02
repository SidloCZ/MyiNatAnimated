# MyiNatAnimated

Klientská webová aplikace pro generování plynulých animovaných mapových příběhů z pozorování v síti iNaturalist za zvolené období, s reaktivním kinematografickým pohybem kamery, audio-vizuálními efekty, správou highlightů a přímým exportem do MP4 se zvukem či animovaného GIFu.

Aplikace je navržena pro statický běh bez nutnosti vlastního backendu, plně optimalizována pro GitHub Pages a Netlify.

---

## Hlavní funkce

- **Šetrné načítání z iNaturalist API v1**:
  - Fronta požadavků s rozestupem minimálně 1,1&nbsp;s pro spolehlivou ochranu před přetížením a HTTP 429.
  - Stránkování přes parametr `id_above` pro stabilní průchod velkými objemy dat.
  - Klientská mezipaměť v IndexedDB (`idb-keyval`) zamezující opakovaným dotazům na stejná období.
- **Inteligentní bodování a správa Highlightů**:
  - Algoritmus pro automatický výběr nejzajímavějších nálezů na základě lajků, komentářů, research grade statusu a fotografií.
  - Interaktivní mřížka pro uživatelský výběr a úpravu klíčových milníků příběhu.
- **Dvoufázový běh (Příprava & Přehrávání)**:
  - Předpočet časové osy, kamerových klíčových snímků, zvukových podnětů a atlasu vektorových ikon.
  - Plynulé přehrávání bez výpočetních záseků s možností okamžitého přetáčení na časové ose.
- **Kinematografická reaktivní kamera**:
  - Kamera sleduje vážené těžiště nedávno přidaných bodů.
  - Při setrvání v jedné lokalitě dochází k pozvolnému přibližování (zoom).
  - Při přesunu na větší vzdálenost (nad 40&nbsp;km) probíhá plynulý obloukový let s oddálením, přeletem a opětovným přiblížením.
- **Dopaminové audio-vizuální efekty**:
  - Tmavý mapový podklad (CartoDB Dark Matter) bez nutnosti API klíčů.
  - Barevné odlišení taxonů podle oficiální palety iNaturalistu.
  - Vyskakující a odletující vektorové SVG ikony taxonů, hvězdičky pro lajky a bubliny pro komentáře.
  - Procedurální syntetizér ve Web Audio API (pentatonické tóny, akordy pro highlighty, zvuk větru při přeletu) s možností ztlumení.
- **Deterministický export videa**:
  - Export do MP4 s H.264 videem a AAC audiem pomocí `mp4-muxer` a WebCodecs API (s fallbackem na `MediaRecorder`).
  - Podpora poměrů stran 16:9 (na šířku), 9:16 (na výšku pro Reels / TikTok / Shorts) a 1:1 (čtverec).
  - Export do animovaného GIFu přes `gifenc`.

---

## Technologický stack

- **Frontend framework:** React 18, TypeScript, Vite
- **Styly:** Tailwind CSS
- **Mapové jádro:** MapLibre GL JS
- **Zvuk:** Web Audio API (procedurální syntezátor bez externích audio souborů)
- **Export:** `mp4-muxer`, `gifenc`
- **Ikony:** Lucide React (inline SVG) a vlastní vektorové ikony taxonů
- **Testy:** Vitest

---

## Spuštění a vývoj

1. Instalace závislostí:
   ```bash
   npm install
   ```

2. Spuštění vývojového serveru:
   ```bash
   npm run dev
   ```

3. Spuštění testů:
   ```bash
   npm test
   ```

4. Kontrola typů (linter):
   ```bash
   npm run lint
   ```

5. Produkční build:
   ```bash
   npm run build
   ```

