import { useState, useMemo, useEffect } from 'react';
import { InatObservation, HighlightItem } from './types/inat';
import { TimelineData } from './types/timeline';
import { PreloadedSprites, preloadSprites } from './engine/spriteAtlas';
import { pickSuggestedHighlights, getRecommendedHighlightCounts } from './services/highlightScorer';
import { buildTimeline } from './engine/timelineBuilder';
import { preloadMapTiles } from './engine/tilePreloader';
import { getTaxonVisuals } from './assets/icons/taxaIcons';
import { isObservationObscured, getObservationPhotoUrl } from './services/inatApi';
import { findIsolatedObservationIds, filterIsolatedObservations } from './services/spatialFilter';
import { SearchForm } from './components/SearchForm';
import { HighlightPicker } from './components/HighlightPicker';
import { PrepareProgress } from './components/PrepareProgress';
import { Player, MAP_STYLES } from './components/Player';
import { AppLogo } from './components/AppLogo';
import { Language, detectDefaultLanguage, translations } from './i18n/translations';

type AppStep = 'search' | 'highlights' | 'preparing' | 'player';

export function App() {
  const [language, setLanguage] = useState<Language>(() => detectDefaultLanguage());
  const t = translations[language];

  const handleLanguageChange = (newLang: Language) => {
    setLanguage(newLang);
    try {
      localStorage.setItem('myinat_language', newLang);
    } catch (_) {
      // Ignore local storage error
    }
  };

  // Keep the document language in sync with the UI language
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const [step, setStep] = useState<AppStep>('search');
  const [username, setUsername] = useState('');
  const [observations, setObservations] = useState<InatObservation[]>([]);
  const [suggestedHighlights, setSuggestedHighlights] = useState<HighlightItem[]>([]);
  const [selectedHighlightIds, setSelectedHighlightIds] = useState<Set<number>>(new Set());
  const [sequenceType, setSequenceType] = useState<'observed' | 'created'>('observed');
  const [filterObscured, setFilterObscured] = useState<boolean>(true);
  const [filterIsolated, setFilterIsolated] = useState<boolean>(false);

  // Preparation state
  const [prepareStatus, setPrepareStatus] = useState('');
  const [preparePercent, setPreparePercent] = useState(0);

  // Playback state
  const [timeline, setTimeline] = useState<TimelineData | null>(null);
  const [sprites, setSprites] = useState<PreloadedSprites | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Helper to resolve active observation pool given filters and sequence
  const getFilteredPool = (
    obsList: InatObservation[],
    filterObs: boolean,
    filterIso: boolean,
    seqType: 'observed' | 'created'
  ) => {
    let pool = obsList;
    if (filterObs) {
      const nonObscured = pool.filter(obs => !isObservationObscured(obs));
      if (nonObscured.length > 0) pool = nonObscured;
    }
    if (filterIso) {
      const nonIsolated = filterIsolatedObservations(pool, { sequenceType: seqType });
      if (nonIsolated.length > 0) pool = nonIsolated;
    }
    return pool;
  };

  // Filtered observations for playback and highlight selection
  const activeObservations = useMemo(() => {
    return getFilteredPool(observations, filterObscured, filterIsolated, sequenceType);
  }, [observations, filterObscured, filterIsolated, sequenceType]);

  const obscuredCount = useMemo(() => {
    return observations.filter(isObservationObscured).length;
  }, [observations]);

  const isolatedCount = useMemo(() => {
    const base = filterObscured ? observations.filter(o => !isObservationObscured(o)) : observations;
    return findIsolatedObservationIds(base, { sequenceType }).size;
  }, [observations, filterObscured, sequenceType]);

  const updateHighlightsForPool = (pool: InatObservation[]) => {
    const { recommendedCount, maxPoolSize } = getRecommendedHighlightCounts(pool.length);
    const highlights = pickSuggestedHighlights(pool, maxPoolSize);
    setSuggestedHighlights(highlights);

    const activeIds = new Set(pool.map(o => o.id));
    setSelectedHighlightIds(prev => {
      const next = new Set<number>();
      for (const id of prev) {
        if (activeIds.has(id)) next.add(id);
      }
      if (next.size === 0) {
        const topByScore = [...highlights].sort((a, b) => {
          const diffScore = b.score - a.score;
          if (diffScore !== 0) return diffScore;
          return (b.observation.faves_count || 0) - (a.observation.faves_count || 0);
        });
        topByScore.slice(0, recommendedCount).forEach(h => next.add(h.observation.id));
      }
      return next;
    });
  };

  // Step 1: Data loaded from API or Demo
  const handleDataLoaded = (loadedObs: InatObservation[], user: string) => {
    setUsername(user);
    setObservations(loadedObs);

    const pool = getFilteredPool(loadedObs, filterObscured, filterIsolated, sequenceType);
    const { recommendedCount, maxPoolSize } = getRecommendedHighlightCounts(pool.length);
    const highlights = pickSuggestedHighlights(pool, maxPoolSize);
    setSuggestedHighlights(highlights);

    // Pre-select recommended count of highlights by default sorted by overall score
    const topByScore = [...highlights].sort((a, b) => {
      const diffScore = b.score - a.score;
      if (diffScore !== 0) return diffScore;
      const diffFaves = (b.observation.faves_count || 0) - (a.observation.faves_count || 0);
      if (diffFaves !== 0) return diffFaves;
      return (b.observation.comments_count || 0) - (a.observation.comments_count || 0);
    });
    const defaultIds = new Set(topByScore.slice(0, recommendedCount).map(h => h.observation.id));
    setSelectedHighlightIds(defaultIds);

    setStep('highlights');
  };

  // Toggle filtering obscured observations
  const handleFilterObscuredChange = (val: boolean) => {
    setFilterObscured(val);
    const pool = getFilteredPool(observations, val, filterIsolated, sequenceType);
    updateHighlightsForPool(pool);
  };

  // Toggle filtering isolated distant observations
  const handleFilterIsolatedChange = (val: boolean) => {
    setFilterIsolated(val);
    const pool = getFilteredPool(observations, filterObscured, val, sequenceType);
    updateHighlightsForPool(pool);
  };

  // Change sequence order (observed date vs created date)
  const handleSequenceTypeChange = (type: 'observed' | 'created') => {
    setSequenceType(type);
    if (filterIsolated) {
      const pool = getFilteredPool(observations, filterObscured, true, type);
      updateHighlightsForPool(pool);
    }
  };

  // Step 2: Toggle highlights in/out
  const handleToggleHighlight = (id: number) => {
    setSelectedHighlightIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectBatch = (ids: number[]) => {
    setSelectedHighlightIds(new Set(ids));
  };

  const handleClearSelection = () => {
    setSelectedHighlightIds(new Set());
  };

  // Step 3: Preparation (deterministic pre-computation)
  const handleStartPreparation = async () => {
    setStep('preparing');
    setPreparePercent(10);
    setPrepareStatus(t.prepareCameraTimeline);

    // Slight delay so UI renders the progress card
    await new Promise(r => setTimeout(r, 60));

    // 1. Build timeline using active observations
    const tl = buildTimeline(activeObservations, {
      targetDurationSeconds: 32,
      selectedHighlightIds,
      sequenceType,
    });
    setTimeline(tl);
    setPreparePercent(25);
    setPrepareStatus(t.prepareSprites);

    await new Promise(r => setTimeout(r, 60));

    // 2. Gather unique taxa visuals and photos to preload
    const visualsList = [
      getTaxonVisuals('plantae'),
      getTaxonVisuals('insecta'),
      getTaxonVisuals('aves'),
      getTaxonVisuals('fungi'),
      getTaxonVisuals('mammalia'),
      getTaxonVisuals('reptilia'),
      getTaxonVisuals('amphibia'),
      getTaxonVisuals('arachnida'),
      getTaxonVisuals('mollusca'),
      getTaxonVisuals('actinopterygii'),
      getTaxonVisuals('chromista'),
      getTaxonVisuals('protozoa'),
      getTaxonVisuals('animalia'),
      getTaxonVisuals('unknown'),
      getTaxonVisuals('insecta', { id: 0, name: 'Lepidoptera', rank: 'order' }),
      getTaxonVisuals('insecta', { id: 0, name: 'Coleoptera', rank: 'order' }),
      getTaxonVisuals('insecta', { id: 0, name: 'Hymenoptera', rank: 'order' }),
      getTaxonVisuals('insecta', { id: 0, name: 'Odonata', rank: 'order' }),
      getTaxonVisuals('insecta', { id: 0, name: 'Diptera', rank: 'order' }),
      getTaxonVisuals('insecta', { id: 0, name: 'Hemiptera', rank: 'order' }),
      getTaxonVisuals('arachnida', { id: 0, name: 'Araneae', rank: 'order' }),
    ];

    const photosToLoad = tl.events
      .filter(ev => ev.isHighlight)
      .map(ev => ({
        id: ev.id,
        url: getObservationPhotoUrl(ev.observation, 'medium'),
      }))
      .filter((p): p is { id: number; url: string } => typeof p.url === 'string' && p.url.length > 0);

    setPrepareStatus(t.preparePhotoSprites);
    const loadedSprites = await preloadSprites(visualsList, photosToLoad, (p) => {
      setPreparePercent(25 + Math.round(p * 30));
    });
    setSprites(loadedSprites);

    // 3. Preload map tiles along the entire animation path so there is no dark flicker during playback
    setPrepareStatus(t.prepareMapTiles);
    await preloadMapTiles(tl.cameraKeyframes, MAP_STYLES.dark.style, (p: number) => {
      setPreparePercent(55 + Math.round(p * 43));
    });

    setPreparePercent(100);
    setPrepareStatus(t.prepareDone);

    await new Promise(r => setTimeout(r, 120));
    setStep('player');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Navigation Top Bar */}
      <header className="border-b border-slate-800/80 bg-slate-900/50 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setStep('search')}
            className="flex items-center gap-2.5 hover:opacity-85 transition cursor-pointer text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-lg p-1 -m-1"
            title={language === 'cs' ? 'Návrat na úvodní obrazovku' : 'Return to home screen'}
          >
            <AppLogo className="w-6 h-6 sm:w-7 sm:h-7 shrink-0" />
            <span className="font-bold text-white tracking-tight text-sm sm:text-base">
              MyiNatAnimated
            </span>
          </button>

          <div className="flex items-center gap-4">
            <div className="text-xs text-slate-400 hidden sm:block">
              {t.appSubtitle}
            </div>

            {/* Language Switcher CZ / EN */}
            <div className="flex items-center gap-1 bg-slate-800/90 p-0.5 rounded-lg border border-slate-700/70 text-xs">
              <button
                type="button"
                onClick={() => handleLanguageChange('cs')}
                className={`px-2.5 py-1 rounded font-medium transition-colors ${
                  language === 'cs'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Čeština"
              >
                CZ
              </button>
              <button
                type="button"
                onClick={() => handleLanguageChange('en')}
                className={`px-2.5 py-1 rounded font-medium transition-colors ${
                  language === 'en'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="English"
              >
                EN
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className={`flex-1 max-w-6xl w-full mx-auto flex flex-col justify-center ${step === 'highlights' ? 'p-1.5 sm:p-3' : 'p-4 sm:p-6'}`}>
        {step === 'search' && (
          <SearchForm
            locale={language}
            onDataLoaded={handleDataLoaded}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
          />
        )}

        {step === 'highlights' && (
          <HighlightPicker
            locale={language}
            observations={activeObservations}
            suggestedHighlights={suggestedHighlights}
            selectedIds={selectedHighlightIds}
            recommendedCount={getRecommendedHighlightCounts(activeObservations.length).recommendedCount}
            sequenceType={sequenceType}
            onSequenceTypeChange={handleSequenceTypeChange}
            filterObscured={filterObscured}
            onFilterObscuredChange={handleFilterObscuredChange}
            obscuredCount={obscuredCount}
            filterIsolated={filterIsolated}
            onFilterIsolatedChange={handleFilterIsolatedChange}
            isolatedCount={isolatedCount}
            onToggleHighlight={handleToggleHighlight}
            onSelectBatch={handleSelectBatch}
            onClearSelection={handleClearSelection}
            onProceed={handleStartPreparation}
            onBack={() => setStep('search')}
          />
        )}

        {step === 'preparing' && (
          <PrepareProgress
            statusText={prepareStatus}
            progressPercent={preparePercent}
            locale={language}
          />
        )}

        {step === 'player' && timeline && sprites && (
          <Player
            locale={language}
            timeline={timeline}
            sprites={sprites}
            username={username}
            onBack={() => setStep('highlights')}
          />
        )}
      </main>

      {/* Footer – zobrazuje se pouze na úvodní vyhledávací obrazovce */}
      {step === 'search' && (
        <footer className="border-t border-slate-900 py-3 text-center text-[11px] text-slate-500 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2">
          <span>{t.footerText}</span>
          <span className="hidden sm:inline">·</span>
          <span>
            Created by{' '}
            <a
              href="https://github.com/SidloCZ"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-emerald-400 hover:underline transition font-medium"
            >
              SidloCZ
            </a>
          </span>
        </footer>
      )}
    </div>
  );
}

export default App;

