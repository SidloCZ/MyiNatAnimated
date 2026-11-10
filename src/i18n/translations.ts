export type Language = 'cs' | 'en';

/**
 * Returns the language for the first render.
 * - A language chosen by the user (stored in localStorage) always wins.
 * - Otherwise English is the default, regardless of browser locale.
 * Localization runs entirely client-side, so it works on GitHub Pages as well.
 */
export function detectDefaultLanguage(): Language {
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('myinat_language');
      if (saved === 'cs' || saved === 'en') return saved;
    } catch {
      // Ignore unavailable localStorage (private mode, blocked storage)
    }
  }
  return 'en';
}

export const translations = {
  cs: {
    // Header
    appTitle: 'MyiNatAnimated',
    appSubtitle: 'Animovaný příběh pozorování z iNaturalist',
    changeLanguage: 'Jazyk / Language',

    // SearchForm
    searchTitle: 'Vytvořte si animovaný příběh',
    searchDesc: 'Zadejte uživatelské jméno na iNaturalist a volitelně časové období. Aplikace připraví plynulý přelet nad mapou vašich pozorování.',
    usernameLabel: 'Uživatelské jméno (iNaturalist login)',
    usernamePlaceholder: 'např. antsczech',
    dateFromLabel: 'Datum od (volitelné)',
    dateToLabel: 'Datum do (volitelné)',
    dateFromPlaceholder: 'Od',
    dateToPlaceholder: 'Do',
    dateAnytime: 'Kdykoliv',
    sinceBegan: 'Od začátku',
    untilNow: 'Doposud',
    totalObsFound: 'Celkem nalezeno',
    observationsCount: 'pozorování',
    checkingUser: 'Ověřuji uživatele a počet pozorování…',
    userNotFound: 'Uživatel nenalezen nebo nemá žádná pozorování s přesnou polohou.',
    loadStory: 'Načíst pozorování a pokračovat',
    loading: 'Načítání…',
    invalidDateRange: 'Datum „Od“ musí být dřívější nebo rovno datu „Do“.',

    // PrepareProgress
    prepareTitle: 'Příprava příběhu',
    prepareCameraTimeline: 'Výpočet časové osy a vyhlazené dráhy kamery…',
    prepareSprites: 'Generování vektorových sprite atlasů pro taxony a efekty…',
    preparePhotoSprites: 'Přednačítání fotografií vybraných highlightů…',
    prepareMapTiles: 'Přednačítání mapových podkladů podél trasy animace…',
    prepareDone: 'Příprava dokončena.',
    prepareProgressTitle: 'Příprava animace',
    prepareProgressFallback: 'Předpočítávání dráhy kamery, zvuků a vektorových efektů…',
    progressLabel: 'Průběh',

    // API errors
    apiRateLimit: 'Překročen limit požadavků iNaturalist API (429). Zkuste to prosím za chvíli.',
    apiRequestFailed: 'Chyba iNaturalist API',
    apiLoadCancelled: 'Načítání bylo zrušeno.',

    // HighlightPicker
    highlightTitle: 'Výběr významných pozorování (Highlightů)',
    highlightSubtitle: 'Během animace se u vybraných bodů kamera přiblíží a zobrazí detailní kartu s fotografií. Výběr se progresivně přizpůsobuje počtu pozorování.',
    selectedCount: 'Vybráno',
    sortLabel: 'Řadit podle:',
    sortByFaves: 'Oblíbenost',
    sortByScore: 'Celkové skóre',
    sortByComments: 'Komentáře',
    sortByDate: 'Datum',
    selectAllBtn: 'Vybrat doporučené',
    deselectAllBtn: 'Zrušit výběr',
    startStoryBtn: 'Spustit příběh',
    noHighlightsFound: 'V tomto období nebyla nalezena žádná pozorování vhodná pro highlighty.',
    identificationsTooltip: 'Potvrzení určení',
    favesTooltip: 'Oblíbení',
    commentsTooltip: 'Komentáře',
    scorePointsShort: 'b.',

    // Player
    backBtn: 'Zpět',
    userPrefix: 'Uživatel:',
    observationsLabel: 'Pozorování:',
    speciesLabel: 'Druhy:',
    exportBtn: 'Exportovat',
    mapStyleTitle: 'Změnit podkladovou mapu',
    styleDark: 'Dark',
    styleLiberty: 'Liberty',
    stylePositron: 'Positron',
    styleBright: 'Bright',
    bufferingTitle: 'Přednačítání mapových podkladů',
    bufferingDesc: 'Ukládání trasy do paměti GPU pro plynulý přelet bez zpoždění a problikávání dlaždic.',
    cameraTrackProgress: 'Trasa kamery',
    skipBufferingBtn: 'Přeskočit a spustit ihned',
    speedLabel: 'Rychlost:',
    playTooltip: 'Přehrát (Mezerník)',
    pauseTooltip: 'Pozastavit (Mezerník)',
    resetTooltip: 'Znovu od začátku',
    muteTooltip: 'Ztlumit zvuk',
    unmuteTooltip: 'Zapnout zvuk',
    fullscreenTooltip: 'Celá obrazovka',

    // ExportDialog
    exportDialogTitle: 'Exportovat animaci',
    exportDialogSubtitle: 'Zvolte téma mapy, formát a poměr stran pro export do videa nebo animovaného obrázku.',
    mapThemeLabel: 'Téma mapy',
    themeDark: 'Dark',
    themeDarkDesc: 'OpenFreeMap',
    themeLiberty: 'Liberty',
    themeLibertyDesc: 'OpenFreeMap',
    themePositron: 'Positron',
    themePositronDesc: 'OpenFreeMap',
    themeBright: 'Bright',
    themeBrightDesc: 'OpenFreeMap',
    fileFormatLabel: 'Formát souboru',
    mp4Title: 'MP4 video',
    mp4Desc: 'Se zvukem, 30 FPS',
    apngTitle: 'APNG',
    apngDesc: 'Plné barvy, 15 FPS',
    gifTitle: 'GIF',
    gifDesc: '256 barev, 15 FPS',
    aspectRatioLabel: 'Poměr stran',
    ratio169: '16:9',
    ratio169Desc: 'Na šířku',
    ratio916: '9:16',
    ratio916Desc: 'Na výšku (Reels / TikTok)',
    ratio11: '1:1',
    ratio11Desc: 'Čtverec (Post)',
    renderingFrame: 'Vykreslování: snímek',
    exportFailed: 'Export se nezdařil',
    downloadReady: 'Stáhnout',
    newExportBtn: 'Vygenerovat další export',
    startExportBtn: 'Spustit export',
    exportInProgress: 'Probíhá export…',

    // HUD / Canvas
    hudObsLabel: 'Pozorování:',
    hudSpeciesLabel: 'Druhy:',
    fallbackObservation: 'Pozorování',

    // Footer
    footerText: 'Data z\u00A0iNaturalist API · Zvukový engine ve Web Audio API · Bez trackerů',
    mapDataBy: 'Mapy:',
    foundBugOrFeature: 'Found a bug, want a feature?',
  },
  en: {
    // Header
    appTitle: 'MyiNatAnimated',
    appSubtitle: 'Animated observation story from iNaturalist',
    changeLanguage: 'Language / Jazyk',

    // SearchForm
    searchTitle: 'Create your animated story',
    searchDesc: 'Enter your iNaturalist username and optionally a date range. The app will generate a cinematic flight across the map of your observations.',
    usernameLabel: 'Username (iNaturalist login)',
    usernamePlaceholder: 'e.g. antsczech',
    dateFromLabel: 'Date from (optional)',
    dateToLabel: 'Date to (optional)',
    dateFromPlaceholder: 'From',
    dateToPlaceholder: 'To',
    dateAnytime: 'Anytime',
    sinceBegan: 'Since you began',
    untilNow: 'Until now',
    totalObsFound: 'Total found',
    observationsCount: 'observations',
    checkingUser: 'Verifying user and observation count…',
    userNotFound: 'User not found or has no observations with coordinates.',
    loadStory: 'Load observations and continue',
    loading: 'Loading…',
    invalidDateRange: 'Date "From" must be earlier than or equal to date "To".',

    // PrepareProgress
    prepareTitle: 'Preparing story',
    prepareCameraTimeline: 'Calculating timeline and smoothed camera path…',
    prepareSprites: 'Generating vector sprite atlases for taxa and effects…',
    preparePhotoSprites: 'Preloading photos of selected highlights…',
    prepareMapTiles: 'Preloading map tiles along animation trajectory…',
    prepareDone: 'Preparation complete.',
    prepareProgressTitle: 'Preparing animation',
    prepareProgressFallback: 'Pre-calculating camera path, sounds and vector effects…',
    progressLabel: 'Progress',

    // API errors
    apiRateLimit: 'iNaturalist API rate limit exceeded (429). Please try again in a moment.',
    apiRequestFailed: 'iNaturalist API error',
    apiLoadCancelled: 'Loading was cancelled.',

    // HighlightPicker
    highlightTitle: 'Select featured observations (Highlights)',
    highlightSubtitle: 'During the animation, the camera zooms in on chosen points and displays a detail card with photo. Selection scales progressively with observation count.',
    selectedCount: 'Selected',
    sortLabel: 'Sort by:',
    sortByFaves: 'Favorites',
    sortByScore: 'Overall score',
    sortByComments: 'Comments',
    sortByDate: 'Date',
    selectAllBtn: 'Select recommended',
    deselectAllBtn: 'Clear selection',
    startStoryBtn: 'Start story',
    noHighlightsFound: 'No observations suitable for highlights found in this timeframe.',
    identificationsTooltip: 'Identifications',
    favesTooltip: 'Favorites',
    commentsTooltip: 'Comments',
    scorePointsShort: 'pts',

    // Player
    backBtn: 'Back',
    userPrefix: 'User:',
    observationsLabel: 'Observations:',
    speciesLabel: 'Species:',
    exportBtn: 'Export',
    mapStyleTitle: 'Change map background',
    styleDark: 'Dark',
    styleLiberty: 'Liberty',
    stylePositron: 'Positron',
    styleBright: 'Bright',
    bufferingTitle: 'Preloading map tiles',
    bufferingDesc: 'Caching trajectory into GPU memory for smooth flight without flicker.',
    cameraTrackProgress: 'Camera track',
    skipBufferingBtn: 'Skip and start now',
    speedLabel: 'Speed:',
    playTooltip: 'Play (Space)',
    pauseTooltip: 'Pause (Space)',
    resetTooltip: 'Restart from beginning',
    muteTooltip: 'Mute sound',
    unmuteTooltip: 'Unmute sound',
    fullscreenTooltip: 'Fullscreen',

    // ExportDialog
    exportDialogTitle: 'Export animation',
    exportDialogSubtitle: 'Choose map theme, file format, and aspect ratio for video or animated image export.',
    mapThemeLabel: 'Map theme',
    themeDark: 'Dark',
    themeDarkDesc: 'OpenFreeMap',
    themeLiberty: 'Liberty',
    themeLibertyDesc: 'OpenFreeMap',
    themePositron: 'Positron',
    themePositronDesc: 'OpenFreeMap',
    themeBright: 'Bright',
    themeBrightDesc: 'OpenFreeMap',
    fileFormatLabel: 'File format',
    mp4Title: 'MP4 video',
    mp4Desc: 'With audio, 30 FPS',
    apngTitle: 'APNG',
    apngDesc: 'Full color, 15 FPS',
    gifTitle: 'GIF',
    gifDesc: '256 colors, 15 FPS',
    aspectRatioLabel: 'Aspect ratio',
    ratio169: '16:9',
    ratio169Desc: 'Landscape',
    ratio916: '9:16',
    ratio916Desc: 'Portrait (Reels / TikTok)',
    ratio11: '1:1',
    ratio11Desc: 'Square (Post)',
    renderingFrame: 'Rendering: frame',
    exportFailed: 'Export failed',
    downloadReady: 'Download',
    newExportBtn: 'Generate another export',
    startExportBtn: 'Start export',
    exportInProgress: 'Exporting…',

    // HUD / Canvas
    hudObsLabel: 'Observations:',
    hudSpeciesLabel: 'Species:',
    fallbackObservation: 'Observation',

    // Footer
    footerText: 'Data from iNaturalist API · Sound engine in Web Audio API · No trackers',
    mapDataBy: 'Maps:',
    foundBugOrFeature: 'Found a bug, want a feature?',
  },
};

const EN_MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/**
 * Formats date into localized string:
 * - 'cs': 15. 5. 2024
 * - 'en': 15 May 2024
 */
export function formatLocalizedDate(dateStr?: string, locale: Language = 'en'): string {
  if (!dateStr) return '';

  const match = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (match) {
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const day = parseInt(match[3], 10);
    if (locale === 'en') {
      return `${day} ${EN_MONTHS[month - 1]} ${year}`;
    }
    return `${day}.\u00A0${month}.\u00A0${year}`;
  }

  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    const day = d.getDate();
    const month = d.getMonth() + 1;
    const year = d.getFullYear();
    if (locale === 'en') {
      return `${day} ${EN_MONTHS[month - 1]} ${year}`;
    }
    return `${day}.\u00A0${month}.\u00A0${year}`;
  }

  return dateStr;
}
