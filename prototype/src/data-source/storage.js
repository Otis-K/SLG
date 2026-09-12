const TOKEN_KEY = 'slg.accessToken';
const BOOTSTRAP_CACHE_KEY = 'slg.bootstrapCache';

function readJson(key, fallback = null) {
  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage may be unavailable; the app can continue without cache.
  }
}

export function getAccessToken() {
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAccessToken(token) {
  try {
    if (token) window.localStorage.setItem(TOKEN_KEY, token);
    else window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Ignore storage failures.
  }
}

export function clearAccessToken() {
  try {
    window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Ignore storage failures.
  }
}

export function getCachedBootstrap() {
  return readJson(BOOTSTRAP_CACHE_KEY);
}

export function setCachedBootstrap(data) {
  writeJson(BOOTSTRAP_CACHE_KEY, {
    ...data,
    cachedAt: new Date().toISOString(),
  });
}

export function clearCachedBootstrap() {
  try {
    window.localStorage.removeItem(BOOTSTRAP_CACHE_KEY);
  } catch {
    // Ignore storage failures.
  }
}
