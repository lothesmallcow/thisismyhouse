// localStorage access, isolated so it fails soft (private browsing, blocked storage) instead
// of crashing the app, and so it's swappable in tests.
const STATE_KEY = 'bubbles.state.v1';

class MemoryStorage {
  constructor() { this.map = new Map(); }
  getItem(k) { return this.map.has(k) ? this.map.get(k) : null; }
  setItem(k, v) { this.map.set(k, String(v)); }
  removeItem(k) { this.map.delete(k); }
}

export const backingStorage = (typeof window !== 'undefined' && window.localStorage) ? window.localStorage : new MemoryStorage();

export function loadState(storage = backingStorage) {
  try {
    const raw = storage.getItem(STATE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}

export function saveState(patch, storage = backingStorage) {
  try {
    const current = loadState(storage) || {};
    storage.setItem(STATE_KEY, JSON.stringify({ ...current, ...patch }));
    return true;
  } catch (e) { return false; }
}

export function readItem(key, storage = backingStorage) {
  try { return storage.getItem(key); } catch (e) { return null; }
}

export function writeItem(key, value, storage = backingStorage) {
  try { storage.setItem(key, value); return true; } catch (e) { return false; }
}

export function removeItem(key, storage = backingStorage) {
  try { storage.removeItem(key); } catch (e) { /* ignore */ }
}

export { MemoryStorage };
