const prefix = 'traychaos:';
const validScore = value => Number.isInteger(value) && value >= 0 && value <= 100000;

export function readBest(storage, key) {
  try {
    const raw = storage?.getItem(prefix + 'best:' + key);
    if (raw === null || raw === undefined || !/^\d+$/.test(raw)) return 0;
    const score = Number(raw);
    return validScore(score) ? score : 0;
  } catch { return 0; }
}

export function recordBest(storage, key, score) {
  const previous = readBest(storage, key);
  const best = Math.max(previous, validScore(score) ? score : 0);
  try { storage?.setItem(prefix + 'best:' + key, String(best)); } catch { /* Play remains available in private mode. */ }
  return best;
}

export function getPreference(storage, key, fallback) {
  try { return storage?.getItem(prefix + key) ?? fallback; } catch { return fallback; }
}

export function setPreference(storage, key, value) {
  try { storage?.setItem(prefix + key, value); } catch { /* Preferences are optional. */ }
}

