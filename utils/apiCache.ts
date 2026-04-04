import AsyncStorage from "@react-native-async-storage/async-storage";
import { isRetryableNetworkError } from "@/utils/fetchWithRetry";

const API_CACHE_PREFIX = "@innova/api-cache/";

type ApiCacheEntry<T> = {
  value: T;
  updatedAt: string;
};

function getStorageKey(cacheKey: string) {
  return `${API_CACHE_PREFIX}${cacheKey}`;
}

export async function readApiCache<T>(
  cacheKey: string,
  maxAgeMs?: number,
): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(getStorageKey(cacheKey));

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as ApiCacheEntry<T>;

    if (!parsed || typeof parsed !== "object" || !("value" in parsed)) {
      return null;
    }

    if (maxAgeMs) {
      const updatedAt = Date.parse(parsed.updatedAt);

      if (!Number.isNaN(updatedAt) && Date.now() - updatedAt > maxAgeMs) {
        return null;
      }
    }

    return parsed.value ?? null;
  } catch {
    return null;
  }
}

export async function writeApiCache<T>(cacheKey: string, value: T) {
  try {
    const payload: ApiCacheEntry<T> = {
      value,
      updatedAt: new Date().toISOString(),
    };

    await AsyncStorage.setItem(getStorageKey(cacheKey), JSON.stringify(payload));
  } catch {
    // Ignoramos errores de cache para no bloquear el flujo principal.
  }
}

export async function runWithCacheFallback<T>({
  cacheKey,
  maxAgeMs,
  loader,
}: {
  cacheKey: string;
  maxAgeMs?: number;
  loader: () => Promise<T>;
}): Promise<T> {
  try {
    const data = await loader();
    await writeApiCache(cacheKey, data);
    return data;
  } catch (error) {
    if (!isRetryableNetworkError(error)) {
      throw error;
    }

    const cached = await readApiCache<T>(cacheKey, maxAgeMs);

    if (cached !== null) {
      return cached;
    }

    throw error;
  }
}
