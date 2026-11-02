# Struktura projektu MyiNatAnimated

Přehled adresářové struktury a role jednotlivých modulů v aplikaci.

```
MyiNatAnimated/
├── .github/
│   └── workflows/
│       └── deploy.yml            # Automatické nasazení na GitHub Pages
├── dist/                         # Výstupní statický balíček po sestavení (build)
├── svg_icons/                    # Samostatné SVG ikony taxonů, řádů a náhledové HTML
├── src/
│   ├── assets/
│   │   └── icons/
│   │       └── taxaIcons.ts      # Vlastní vektorové SVG cesty pro taxony a efekty
│   ├── components/
│   │   ├── ExportDialog.tsx      # Dialog pro export MP4 a GIF s volbou poměru stran
│   │   ├── HighlightPicker.tsx   # Mřížka pro výběr a potvrzení highlightů
│   │   ├── Player.tsx            # MapLibre přehrávač s překryvným plátnem a ovládáním
│   │   ├── PrepareProgress.tsx   # Ukazatel průběhu předpočtu časové osy a assetů
│   │   └── SearchForm.tsx        # Formulář pro zadání účtu, data a rychlé spuštění dema
│   ├── engine/
│   │   ├── cameraDirector.ts     # Výpočet a interpolace trajektorie a zoomu kamery
│   │   ├── dopamineCanvas.ts     # Vykreslování rázových vln, odletujících ikon a karet
│   │   ├── gifExporter.ts        # Deterministický snímkový export do formátu GIF
│   │   ├── soundEngine.ts        # Procedurální Web Audio syntezátor
│   │   ├── spriteAtlas.ts        # Vykreslení SVG cest a přednačtení fotografií
│   │   ├── tilePreloader.ts      # Přednačtení mapových dlaždic podél trasy animace
│   │   ├── timelineBuilder.ts    # Mapování událostí na časovou osu a generování podnětů
│   │   └── videoExporter.ts      # Export do MP4 (H.264 + AAC) přes WebCodecs a mp4-muxer
│   ├── services/
│   │   ├── cache.ts              # Správa IndexedDB mezipaměti dotazů na pozorování
│   │   ├── demoData.ts           # Ukázková data pro okamžité spuštění bez zadání účtu
│   │   ├── highlightScorer.ts    # Bodovací algoritmus a výběr reprezentativních nálezů
│   │   ├── inatApi.ts            # Komunikace s iNaturalist API v1
│   │   └── requestQueue.ts       # Fronta požadavků se zpožděním 1,1 s a backoffem
│   ├── types/
│   │   ├── export.ts             # Datové typy pro export konfigurace a průběhu
│   │   ├── gifenc.d.ts           # Typové definice pro knihovnu gifenc
│   │   ├── inat.ts               # Typové modely iNaturalist API entit
│   │   └── timeline.ts           # Modely pro časovou osu, kameru a zvukové podněty
│   ├── App.tsx                   # Hlavní aplikační stavový orchestrátor
│   ├── index.css                 # Globální styly Tailwind CSS
│   └── main.tsx                  # Vstupní bod React aplikace
├── index.html                    # HTML šablona aplikace
├── netlify.toml                  # Konfigurace sestavení a přesměrování pro Netlify
├── package.json                  # Konfigurace závislostí a skriptů
├── postcss.config.js             # Konfigurace PostCSS
├── tailwind.config.js            # Konfigurace Tailwind CSS a palety taxonů
├── tsconfig.json                 # Konfigurace TypeScript kompilátoru
└── vite.config.ts                # Konfigurace sestavení Vite s relativní bází ./
```

