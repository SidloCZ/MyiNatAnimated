import { get, set, del } from 'idb-keyval';
import { InatObservation } from '../types/inat';

const CACHE_PREFIX = 'myinat_obs_';

export async function getCachedObservations(login: string, d1?: string, d2?: string, locale = 'en'): Promise<InatObservation[] | null> {
  try {
    const key = `${CACHE_PREFIX}${login.toLowerCase()}_${d1 || 'all'}_${d2 || 'all'}_${locale}`;
    const data = await get<InatObservation[]>(key);
    return data || null;
  } catch (err) {
    console.warn('Could not read from the IndexedDB cache:', err);
    return null;
  }
}

export async function setCachedObservations(
  login: string,
  d1: string | undefined,
  d2: string | undefined,
  observations: InatObservation[],
  locale = 'en'
): Promise<void> {
  try {
    const key = `${CACHE_PREFIX}${login.toLowerCase()}_${d1 || 'all'}_${d2 || 'all'}_${locale}`;
    await set(key, observations);
  } catch (err) {
    console.warn('Could not write to the IndexedDB cache:', err);
  }
}

export async function clearCachedObservations(login: string, d1?: string, d2?: string, locale = 'en'): Promise<void> {
  try {
    const key = `${CACHE_PREFIX}${login.toLowerCase()}_${d1 || 'all'}_${d2 || 'all'}_${locale}`;
    await del(key);
  } catch (err) {
    console.warn('Could not delete the IndexedDB cache entry:', err);
  }
}

