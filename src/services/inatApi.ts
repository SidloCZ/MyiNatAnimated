import { InatApiResponse, InatObservation } from '../types/inat';
import { globalInatQueue } from './requestQueue';
import { getCachedObservations, setCachedObservations } from './cache';

const INAT_API_BASE = 'https://api.inaturalist.org/v1';

export interface FetchOptions {
  username: string;
  d1?: string;
  d2?: string;
  maxObservations?: number;
  useCache?: boolean;
  onProgress?: (loaded: number, total: number) => void;
  signal?: AbortSignal;
}

export async function fetchObservationCount(username: string, d1?: string, d2?: string, signal?: AbortSignal): Promise<number> {
  const params = new URLSearchParams({
    user_id: username,
    geo: 'true',
    per_page: '0',
  });
  if (d1) params.append('d1', d1);
  if (d2) params.append('d2', d2);

  const url = `${INAT_API_BASE}/observations?${params.toString()}`;
  return globalInatQueue.enqueue(async () => {
    const res = await fetch(url, { signal });
    if (!res.ok) {
      if (res.status === 429) {
        throw new Error('Překročen limit požadavků iNaturalist API (429). Počkejte chvíli.');
      }
      throw new Error(`Chyba iNaturalist API: ${res.status} ${res.statusText}`);
    }
    const data: InatApiResponse = await res.json();
    return data.total_results || 0;
  });
}

export async function fetchObservations(options: FetchOptions): Promise<InatObservation[]> {
  const {
    username,
    d1,
    d2,
    maxObservations = 5000,
    useCache = true,
    onProgress,
    signal,
  } = options;

  if (useCache) {
    const cached = await getCachedObservations(username, d1, d2);
    if (cached && cached.length > 0) {
      if (onProgress) onProgress(cached.length, cached.length);
      return cached;
    }
  }

  // 1. Get total count
  const totalAvailable = await fetchObservationCount(username, d1, d2, signal);
  const targetTotal = Math.min(totalAvailable, maxObservations);

  if (targetTotal === 0) {
    return [];
  }

  if (onProgress) onProgress(0, targetTotal);

  const allObservations: InatObservation[] = [];
  let lastId = 0;
  const perPage = 200;

  while (allObservations.length < targetTotal) {
    if (signal?.aborted) {
      throw new Error('Načítání bylo zrušeno.');
    }

    const params = new URLSearchParams({
      user_id: username,
      geo: 'true',
      order_by: 'id',
      order: 'asc',
      per_page: perPage.toString(),
      locale: 'cs',
    });
    if (d1) params.append('d1', d1);
    if (d2) params.append('d2', d2);
    if (lastId > 0) {
      params.append('id_above', lastId.toString());
    }

    const url = `${INAT_API_BASE}/observations?${params.toString()}`;

    const batch = await globalInatQueue.enqueue(async () => {
      const res = await fetch(url, { signal });
      if (!res.ok) {
        if (res.status === 429) {
          throw new Error('Překročen limit iNaturalist API (429).');
        }
        throw new Error(`Chyba načítání: ${res.status}`);
      }
      const data: InatApiResponse = await res.json();
      return data.results || [];
    });

    if (batch.length === 0) {
      break;
    }

    // Filter only records with valid coordinates
    for (const obs of batch) {
      if (obs.geojson?.coordinates && obs.geojson.coordinates.length === 2) {
        allObservations.push(obs);
      }
      lastId = Math.max(lastId, obs.id);
    }

    if (onProgress) {
      onProgress(Math.min(allObservations.length, targetTotal), targetTotal);
    }

    if (batch.length < perPage) {
      break; // End of list
    }
  }

  // Sort chronologically by observed_on
  allObservations.sort((a, b) => {
    const timeA = new Date(a.time_observed_at || a.observed_on || a.created_at).getTime();
    const timeB = new Date(b.time_observed_at || b.observed_on || b.created_at).getTime();
    return timeA - timeB;
  });

  // Save to cache
  await setCachedObservations(username, d1, d2, allObservations);

  return allObservations;
}

