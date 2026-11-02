import { get, set, del } from 'idb-keyval';
import { InatObservation } from '../types/inat';

const CACHE_PREFIX = 'myinat_obs_';

export async function getCachedObservations(login: string, d1?: string, d2?: string): Promise<InatObservation[] | null> {
  try {
    const key = `${CACHE_PREFIX}${login.toLowerCase()}_${d1 || 'all'}_${d2 || 'all'}`;
    const data = await get<InatObservation[]>(key);
    return data || null;
  } catch (err) {
    console.warn('Nelze načíst z IndexedDB mezipaměti:', err);
    return null;
  }
}

export async function setCachedObservations(
  login: string,
  d1: string | undefined,
  d2: string | undefined,
  observations: InatObservation[]
): Promise<void> {
  try {
    const key = `${CACHE_PREFIX}${login.toLowerCase()}_${d1 || 'all'}_${d2 || 'all'}`;
    await set(key, observations);
  } catch (err) {
    console.warn('Nelze uložit do IndexedDB mezipaměti:', err);
  }
}

export async function clearCachedObservations(login: string, d1?: string, d2?: string): Promise<void> {
  try {
    const key = `${CACHE_PREFIX}${login.toLowerCase()}_${d1 || 'all'}_${d2 || 'all'}`;
    await del(key);
  } catch (err) {
    console.warn('Nelze smazat záznam z IndexedDB:', err);
  }
}

