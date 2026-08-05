// Pattern library — the installed patterns, stored in IndexedDB so they survive
// offline and can hold large payloads (chart-crop images embedded by the Phase 4
// ingestion flow) that would blow past localStorage's ~5MB string cap.
//
// Progress (where you are in a pattern) stays in localStorage via progress.js —
// it's tiny and keyed per pattern+size. This store holds the pattern *data*.
//
// One object store, `patterns`, keyed by the pattern's own `id`. Each record is
// the full pattern JSON plus an `addedAt` timestamp used to order the library.

const DB_NAME = 'yarnification';
const DB_VERSION = 1;
const STORE = 'patterns';

let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

// Run one transaction and resolve when it *commits* (not just when the request
// fires) so callers can trust the write is durable before updating the UI.
function tx(mode, run) {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE, mode);
        const store = transaction.objectStore(STORE);
        let result;
        Promise.resolve(run(store))
          .then((value) => {
            result = value;
          })
          .catch(reject);
        transaction.oncomplete = () => resolve(result);
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error);
      })
  );
}

function reqAsync(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Full pattern record by id, or null if not installed.
export function getPattern(id) {
  return tx('readonly', (store) => reqAsync(store.get(id))).then((v) => v ?? null);
}

// Every installed pattern, newest first. Returns full records; the library
// screen reads only the light fields (meta, chosen, sections length).
export function listPatterns() {
  return tx('readonly', (store) => reqAsync(store.getAll())).then((rows) =>
    rows.sort((a, b) => (b.addedAt ?? 0) - (a.addedAt ?? 0))
  );
}

// Insert or replace a pattern. Stamps addedAt on first install; preserves it on
// update so the library order is stable.
export async function putPattern(pattern) {
  const existing = await getPattern(pattern.id);
  const record = { ...pattern, addedAt: existing?.addedAt ?? Date.now() };
  await tx('readwrite', (store) => store.put(record));
  return record;
}

export function deletePattern(id) {
  return tx('readwrite', (store) => store.delete(id));
}

// Install a bundled/seed pattern only if it isn't already present, so we never
// clobber a copy the user has since edited or re-imported.
export async function seedPattern(pattern) {
  const existing = await getPattern(pattern.id);
  if (existing) return existing;
  return putPattern(pattern);
}
