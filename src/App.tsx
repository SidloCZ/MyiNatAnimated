import { useState, useMemo } from 'react';
import { InatObservation, HighlightItem } from './types/inat';
import { TimelineData } from './types/timeline';
import { PreloadedSprites, preloadSprites } from './engine/spriteAtlas';
import { pickSuggestedHighlights } from './services/highlightScorer';
import { buildTimeline } from './engine/timelineBuilder';
import { preloadMapTiles } from './engine/tilePreloader';
import { getTaxonVisuals } from './assets/icons/taxaIcons';
import { isObservationObscured, getObservationPhotoUrl } from './services/inatApi';
import { findIsolatedObservationIds, filterIsolatedObservations } from './services/spatialFilter';
import { SearchForm } from './components/SearchForm';
import { HighlightPicker } from './components/HighlightPicker';
import { PrepareProgress } from './components/PrepareProgress';
import { Player, MAP_STYLES } from './components/Player';

type AppStep = 'search' | 'highlights' | 'preparing' | 'player';

export function App() {
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
  const highlights = pickSuggestedHighlights(pool, 8);
  setSuggestedHighlights(highlights);

  const activeIds = new Set(pool.map(o => o.id));
  setSelectedHighlightIds(prev => {
    const next = new Set<number>();
    for (const id of prev) {
      if (activeIds.has(id)) next.add(id);
    }
    if (next.size === 0) {
      highlights.slice(0, 5).forEach(h => next.add(h.observation.id));
    }
    return next;
  });
};

// Step 1: Data loaded from API or Demo
const handleDataLoaded = (loadedObs: InatObservation[], user: string) => {
  setUsername(user);
  setObservations(loadedObs);

  const pool = getFilteredPool(loadedObs, filterObscured, filterIsolated, sequenceType);
  const highlights = pickSuggestedHighlights(pool, 8);
  setSuggestedHighlights(highlights);

  // Pre-select top 5 highlights by default
  const defaultIds = new Set(highlights.slice(0, 5).map(h => h.observation.id));
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
  const next = new Set(selectedHighlightIds);
  if (next.has(id)) {
    next.delete(id);
  } else {
    next.add(id);
  }
  setSelectedHighlightIds(next);
};

// Step 3: Preparation (deterministic pre-computation)
const handleStartPreparation = async () => {
  setStep('preparing');
  setPreparePercent(10);
  setPrepareStatus('Výpočet časové osy a vyhlazené dráhy kamery…');

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
  setPrepareStatus('Generování vektorových sprite atlasů pro taxony a efekty…');

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

  setPrepareStatus('Přednačítání fotografií vybraných highlightů…');
  const loadedSprites = await preloadSprites(visualsList, photosToLoad, (p) => {
    setPreparePercent(25 + Math.round(p * 30));
  });
  setSprites(loadedSprites);

  // 3. Preload map tiles along the entire animation path so there is no dark flicker during playback
  setPrepareStatus('Přednačítání mapových podkladů podél trasy animace…');
  await preloadMapTiles(tl.cameraKeyframes, MAP_STYLES.dark.style, (p: number) => {
    setPreparePercent(55 + Math.round(p * 43));
  });

  setPreparePercent(100);
  setPrepareStatus('Příprava dokončena.');

  await new Promise(r => setTimeout(r, 120));
  setStep('player');
};

return (
  <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
    {/* Navigation Top Bar */}
    <header className="border-b border-slate-800/80 bg-slate-900/50 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <svg
            className="w-6 h-6 text-emerald-400"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-9l6 4.5-6 4.5z" />
          </svg>
          <span className="font-bold text-white tracking-tight text-sm sm:text-base">
            MyiNatAnimated
          </span>
        </div>

        <div className="text-xs text-slate-400 hidden sm:block">
          Animovaný mapový příběh pozorování
        </div>
      </div>
    </header>

    {/* Main Container */}
    <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 flex flex-col justify-center">
      {step === 'search' && (
        <SearchForm
          onDataLoaded={handleDataLoaded}
          isLoading={isLoading}
          setIsLoading={setIsLoading}
        />
      )}

      {step === 'highlights' && (
        <HighlightPicker
          observations={activeObservations}
          suggestedHighlights={suggestedHighlights}
          selectedIds={selectedHighlightIds}
          sequenceType={sequenceType}
          onSequenceTypeChange={handleSequenceTypeChange}
          filterObscured={filterObscured}
          onFilterObscuredChange={handleFilterObscuredChange}
          obscuredCount={obscuredCount}
          filterIsolated={filterIsolated}
          onFilterIsolatedChange={handleFilterIsolatedChange}
          isolatedCount={isolatedCount}
          onToggleHighlight={handleToggleHighlight}
          onProceed={handleStartPreparation}
          onBack={() => setStep('search')}
        />
      )}

      {step === 'preparing' && (
        <PrepareProgress
          statusText={prepareStatus}
          progressPercent={preparePercent}
        />
      )}

      {step === 'player' && timeline && sprites && (
        <Player
          timeline={timeline}
          sprites={sprites}
          username={username}
          onBack={() => setStep('highlights')}
        />
      )}
    </main>

    {/* Footer */}
    <footer className="border-t border-slate-900 py-3 text-center text-[11px] text-slate-500">
      Data z iNaturalist API &middot; Zvukový engine ve Web Audio API &middot; Bez externích trackerů
    </footer>
  </div>
);
}

export default App;

