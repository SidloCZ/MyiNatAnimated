# SUGGESTIONS.md

Postřehy a náměty zaznamenané během práce na projektu. Nejde o závazný plán, ale o podněty k rozhodnutí.

## Architektura a kód

- [ ] **Dvojí způsob lokalizace (ternární výrazy vs. překladové klíče)**
  - **Kde:** `src/components/HighlightPicker.tsx`, `src/components/SearchForm.tsx`, `src/components/ExportDialog.tsx`
  - **Kontext:** Část textů je řešena přes `translations[locale]`, část přes opakované `locale === 'cs' ? '…' : '…'`. Nové jazyky by vyžadovaly zásah do komponent.
  - **Návrh řešení:** Postupně přesunout zbývající řetězce do `src/i18n/translations.ts` (včetně parametrizovaných textů, např. „Z celkem: N pozorování“).

- [ ] **Nevyužité překladové klíče**
  - **Kde:** `src/i18n/translations.ts` (`appTitle`, `changeLanguage`, `dateFromLabel`, `dateToLabel`, `dateAnytime`, `totalObsFound`, `observationsCount`, `prepareTitle`, `startStoryBtn`, `noHighlightsFound`, `identificationsTooltip`, `favesTooltip`, `commentsTooltip`)
  - **Kontext:** Klíče jsou definovány v obou jazycích, ale v kódu se nevyskytují. Udržují falešný dojem hotové lokalizace.
  - **Návrh řešení:** Buď je zapojit do UI, nebo je odstranit, aby překladový soubor odpovídal realitě.

## UI, UX a frontend

- [ ] **Datumová pole bez popisků a bez prázdného stavu výběru**
  - **Kde:** `src/components/SearchForm.tsx` (dvojice `input[type="date"]`), `src/components/HighlightPicker.tsx`
  - **Kontext:** Pole „Datum od/do“ nemají `<label>` ani `aria-label`, ačkoli hotové klíče `dateFromLabel`/`dateToLabel` existují. Výběr highlightů nemá prázdný stav (`noHighlightsFound` se nepoužívá).
  - **Návrh řešení:** Doplnit přístupné popisky a vykreslit informativní prázdný stav, pokud filtr nevrátí žádná pozorování.

## Bugy a potenciální rizika

- [ ] **Možný souběh (race condition) v GitHub Actions při deployi Pages v jednom jobu**
  - **Kde:** `.github/workflows/deploy.yml` (řádky 42–50)
  - **Kontext:** Krok `actions/deploy-pages@v4` volaný bezprostředně po `actions/upload-pages-artifact@v3` v tomtéž jobu může výjimečně selhat na chybě `No artifacts named "github-pages" were found`, pokud GitHub API nestihne artefakt zaindexovat.
  - **Návrh řešení:** Rozdělit workflow na standardní dva joby (`build` s uploadem artefaktu a `deploy` s `needs: build`).

- [ ] **Zastaralé české názvy mapových stylů v `MAP_STYLES`**
  - **Kde:** `src/components/Player.tsx` (`MAP_STYLES`, položka `label`)
  - **Kontext:** Pole `label` obsahuje pevně zapsanou češtinu, ale v UI se nepoužívá (select čerpá z `t.styleDark` apod.). Při budoucím použití by se objevil netranslovaný text.
  - **Návrh řešení:** Pole `label` odstranit a nechat pouze `style`, nebo jej naplnit překladovými klíči.
