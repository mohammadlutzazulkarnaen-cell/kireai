/**
 * IndexedDB persistence for the browser-only (GitHub Pages) build.
 *
 * The object stores mirror the SQLite tables of the Express backend (users,
 * documents, analyses, settings) so the route layer above this file keeps the
 * same shapes. Documents can be several megabytes of text, which is why this
 * uses IndexedDB instead of localStorage.
 */

const DB_NAME = 'kireai-local';
const DB_VERSION = 1;
const STORES = ['users', 'documents', 'analyses', 'settings'];

let dbPromise = null;

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('Penyimpanan browser tidak tersedia. Nonaktifkan mode privat lalu muat ulang.'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      for (const name of STORES) {
        if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Gagal membuka penyimpanan browser.'));
  });
  return dbPromise;
}

async function run(storeName, mode, action) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    let transaction;
    try {
      transaction = db.transaction(storeName, mode);
    } catch (error) {
      reject(error);
      return;
    }
    const request = action(transaction.objectStore(storeName));
    let value;
    if (request) request.onsuccess = () => { value = request.result; };
    transaction.oncomplete = () => resolve(value);
    transaction.onerror = () => reject(transaction.error || new Error('Penyimpanan browser gagal.'));
    transaction.onabort = () => reject(transaction.error || new Error('Penyimpanan browser dibatalkan.'));
  });
}

export const all = async (store) => (await run(store, 'readonly', (s) => s.getAll())) || [];
export const get = (store, id) => run(store, 'readonly', (s) => s.get(id));
export const put = (store, value) => run(store, 'readwrite', (s) => s.put(value)).then(() => value);
export const remove = (store, id) => run(store, 'readwrite', (s) => s.delete(id)).then(() => null);
export const clear = (store) => run(store, 'readwrite', (s) => s.clear()).then(() => null);

export async function nextId(store) {
  const rows = await all(store);
  return rows.reduce((max, row) => Math.max(max, Number(row.id) || 0), 0) + 1;
}

/** Session lives in localStorage: it is a single small value read on boot. */
const SESSION_KEY = 'kireai.session';

export function readSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    const id = raw === null ? NaN : Number(raw);
    return Number.isInteger(id) && id > 0 ? id : null;
  } catch {
    return null;
  }
}

export function writeSession(userId) {
  try {
    localStorage.setItem(SESSION_KEY, String(userId));
  } catch {
    /* private mode: the session simply does not survive a reload */
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}
