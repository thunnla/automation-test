/**
 * Universal Test Engine — Deep Object Utilities
 *
 * Helpers for deep-get, deep-contains, and object comparison
 * used by both API and UI test runners.
 */

// ---------------------------------------------------------------------------
// Deep get by dot-notation path   e.g. "data.user.email"
// ---------------------------------------------------------------------------

export function deepGet(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((current, key) => {
    if (current === null || current === undefined) return undefined;
    if (Array.isArray(current)) {
      const idx = Number(key);
      return Number.isNaN(idx) ? undefined : current[idx];
    }
    if (typeof current === 'object') {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

// ---------------------------------------------------------------------------
// Deep contains — every key/value in `subset` must exist in `superset`
// ---------------------------------------------------------------------------

export function deepContains(superset: unknown, subset: unknown): boolean {
  if (subset === superset) return true;
  if (subset === null || subset === undefined) return superset === subset;
  if (typeof subset !== 'object') return superset === subset;

  if (Array.isArray(subset)) {
    if (!Array.isArray(superset)) return false;
    return subset.every((item) => superset.some((sup) => deepContains(sup, item)));
  }

  if (typeof superset !== 'object' || superset === null) return false;

  const superObj = superset as Record<string, unknown>;
  const subObj = subset as Record<string, unknown>;

  return Object.keys(subObj).every((key) => deepContains(superObj[key], subObj[key]));
}

// ---------------------------------------------------------------------------
// Deep equal
// ---------------------------------------------------------------------------

export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null) return false;
  if (typeof a !== typeof b) return false;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, i) => deepEqual(item, b[i]));
  }

  if (typeof a === 'object' && typeof b === 'object') {
    const keysA = Object.keys(a as Record<string, unknown>);
    const keysB = Object.keys(b as Record<string, unknown>);
    if (keysA.length !== keysB.length) return false;
    return keysA.every((key) =>
      deepEqual(
        (a as Record<string, unknown>)[key],
        (b as Record<string, unknown>)[key],
      ),
    );
  }

  return false;
}

// ---------------------------------------------------------------------------
// Build URL with query params
// ---------------------------------------------------------------------------

export function buildUrl(base: string, endpoint: string, query?: Record<string, string>): string {
  // Avoid double-slash
  const url = `${base.replace(/\/+$/, '')}/${endpoint.replace(/^\/+/, '')}`;
  if (!query || Object.keys(query).length === 0) return url;
  const params = new URLSearchParams(query);
  return `${url}?${params.toString()}`;
}
