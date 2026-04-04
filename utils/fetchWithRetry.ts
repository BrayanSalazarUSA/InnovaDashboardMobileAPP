const RETRYABLE_METHODS = new Set(["GET", "HEAD"]);

type FetchRetryOptions = {
  retries?: number;
  retryDelayMs?: number;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeMethod(method?: string) {
  return (method || "GET").toUpperCase();
}

export function isRetryableNetworkError(error: unknown) {
  const message =
    error instanceof Error ? error.message : String(error ?? "");

  return /network request failed|failed to fetch|networkerror|load failed/i.test(
    message,
  );
}

export async function fetchWithRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
  options?: FetchRetryOptions,
) {
  const method = normalizeMethod(init?.method);
  const shouldRetry = RETRYABLE_METHODS.has(method);
  const retries = shouldRetry ? (options?.retries ?? 2) : 0;
  const retryDelayMs = options?.retryDelayMs ?? 700;

  let attempt = 0;

  while (true) {
    try {
      return await fetch(input, init);
    } catch (error) {
      if (
        !shouldRetry ||
        attempt >= retries ||
        !isRetryableNetworkError(error)
      ) {
        throw error;
      }

      attempt += 1;
      await sleep(retryDelayMs * attempt);
    }
  }
}
