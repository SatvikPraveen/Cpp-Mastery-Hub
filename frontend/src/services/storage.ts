/**
 * Thin, SSR-safe wrapper around localStorage / sessionStorage.
 * Every accessor swallows storage errors (private mode, quota, disabled storage)
 * and falls back to the supplied default.
 */
import type { Theme } from '@/hooks/useTheme';

const PREFIX = 'cpp-mastery-hub';
const THEME_KEY = `${PREFIX}:theme`;
const PREFERENCES_KEY = `${PREFIX}:preferences`;
const APP_STATE_PREFIX = `${PREFIX}:state:`;

type Store = 'local' | 'session';

const getStore = (store: Store): Storage | null => {
  if (typeof window === 'undefined') return null;
  try {
    return store === 'local' ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
};

const read = <T>(store: Store, key: string, fallback: T): T => {
  const storage = getStore(store);
  if (!storage) return fallback;
  try {
    const raw = storage.getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
};

const write = (store: Store, key: string, value: unknown): void => {
  const storage = getStore(store);
  if (!storage) return;
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or unavailable; silently ignore.
  }
};

const remove = (store: Store, key: string): void => {
  const storage = getStore(store);
  if (!storage) return;
  try {
    storage.removeItem(key);
  } catch {
    // ignore
  }
};

const isTheme = (value: unknown): value is Theme =>
  value === 'light' || value === 'dark' || value === 'system';

export const storageService = {
  // Generic local storage helpers
  getLocal<T>(key: string, fallback: T): T {
    return read('local', `${PREFIX}:${key}`, fallback);
  },
  setLocal(key: string, value: unknown): void {
    write('local', `${PREFIX}:${key}`, value);
  },
  removeLocal(key: string): void {
    remove('local', `${PREFIX}:${key}`);
  },

  // Theme
  getTheme(): Theme {
    const value = read<unknown>('local', THEME_KEY, 'system');
    return isTheme(value) ? value : 'system';
  },
  setTheme(theme: Theme): void {
    write('local', THEME_KEY, theme);
  },

  // Persistent user preferences (one JSON blob)
  getUserPreference<T>(key: string, fallback: T): T {
    const prefs = read<Record<string, unknown>>('local', PREFERENCES_KEY, {});
    return key in prefs ? (prefs[key] as T) : fallback;
  },
  setUserPreference(key: string, value: unknown): void {
    const prefs = read<Record<string, unknown>>('local', PREFERENCES_KEY, {});
    write('local', PREFERENCES_KEY, { ...prefs, [key]: value });
  },
  removeUserPreference(key: string): void {
    const prefs = read<Record<string, unknown>>('local', PREFERENCES_KEY, {});
    const { [key]: _removed, ...rest } = prefs;
    write('local', PREFERENCES_KEY, rest);
  },

  // Ephemeral per-tab application state
  getAppState<T>(key: string, fallback: T): T {
    return read('session', `${APP_STATE_PREFIX}${key}`, fallback);
  },
  setAppState(key: string, value: unknown): void {
    write('session', `${APP_STATE_PREFIX}${key}`, value);
  },
  removeAppState(key: string): void {
    remove('session', `${APP_STATE_PREFIX}${key}`);
  },
};

export default storageService;
