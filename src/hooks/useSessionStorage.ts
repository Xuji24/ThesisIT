'use client';

import { useCallback, useState } from 'react';

// ─── Storage keys (single source of truth) ───────────────────────────────────

export const STORAGE_KEYS = {
  THESIS_TEXT:         'larkot:thesisText',
  FILE_NAME:           'larkot:fileName',
  ACTIVE_TAB:          'larkot:activeTab',
  SW_REPORT:           'larkot:sw:report',
  CHAT_MESSAGES:       'larkot:chat:messages',
  MOCK_MESSAGES:       'larkot:mock:messages',
  MOCK_DIFFICULTY:     'larkot:mock:difficulty',
  MOCK_STARTED:        'larkot:mock:started',
  MOCK_MODE:           'larkot:mock:mode',
  MOCK_QUESTION_LIMIT: 'larkot:mock:questionLimit',
  MOCK_EVAL_REPORT:    'larkot:mock:evalReport',
  PANEL_OUTPUT:        'larkot:panel:output',
  PANEL_CHAPTER:       'larkot:panel:chapter',
  PANEL_COMMENTS:      'larkot:panel:comments',
} as const;

/**
 * Security: all session data is stored in sessionStorage, NOT localStorage.
 *
 * sessionStorage is automatically cleared by the browser when:
 *   - The user closes the tab
 *   - The user closes the browser window
 *   - The user opens a fresh tab/window to the same URL
 *
 * This ensures that thesis manuscripts (unpublished academic work) and AI
 * outputs are never persisted beyond the active browsing session — consistent
 * with the principle of minimal data retention.
 *
 * Reference: OWASP Web Storage Security Cheat Sheet
 * https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html#local-storage
 */
function getStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

/** Clear all session data. Called on reset or new upload. */
export function clearSessionData(): void {
  const storage = getStorage();
  if (!storage) return;
  Object.values(STORAGE_KEYS).forEach((key) => {
    try { storage.removeItem(key); } catch { /* ignore */ }
  });
}

// ─── Size guards ──────────────────────────────────────────────────────────────

const MAX_BYTES = 4 * 1024 * 1024;   // 4 MB general limit
const MAX_THESIS_BYTES = 240_000;     // ~240 KB for thesis text

function tryWrite(key: string, serialized: string): void {
  const storage = getStorage();
  if (!storage) return;
  const limit = key === STORAGE_KEYS.THESIS_TEXT ? MAX_THESIS_BYTES : MAX_BYTES;
  if (serialized.length > limit) return; // silently skip oversized values
  try {
    storage.setItem(key, serialized);
  } catch {
    // sessionStorage quota exceeded — fail silently
  }
}

// ─── useSessionStorage ────────────────────────────────────────────────────────

/**
 * Drop-in replacement for useState that also persists to sessionStorage.
 * Data is scoped to the current browser tab and is erased automatically
 * when the tab is closed — no manual cleanup required.
 */
export function useSessionStorage<T>(
  key: string,
  initialValue: T,
): [T, (value: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    const storage = getStorage();
    if (!storage) return initialValue;
    try {
      const raw = storage.getItem(key);
      if (raw === null) return initialValue;
      // Evict oversized thesis text before it enters React state
      if (key === STORAGE_KEYS.THESIS_TEXT && raw.length > MAX_THESIS_BYTES) {
        storage.removeItem(key);
        return initialValue;
      }
      return JSON.parse(raw) as T;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStoredValue((prev) => {
        const next =
          typeof value === 'function' ? (value as (p: T) => T)(prev) : value;
        try {
          tryWrite(key, JSON.stringify(next));
        } catch { /* circular ref — fail silently */ }
        return next;
      });
    },
    [key],
  );

  return [storedValue, setValue];
}
