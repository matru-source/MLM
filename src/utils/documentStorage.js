// Robust Client-Side Persistent Storage for Partner KYC Documents
// Uses In-Memory Cache + IndexedDB + LocalStorage Fallback

const DB_NAME = 'CyberShield_DocStore_v1';
const STORE_NAME = 'kyc_docs';
let dbInstance = null;

// In-memory cache for synchronous instant access
const memoryCache = new Map();

// Initialize IndexedDB
function getDb() {
  if (typeof window === 'undefined' || !window.indexedDB) return Promise.resolve(null);
  if (dbInstance) return Promise.resolve(dbInstance);

  return new Promise((resolve) => {
    try {
      const request = window.indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
      request.onsuccess = (e) => {
        dbInstance = e.target.result;
        resolve(dbInstance);
      };
      request.onerror = () => {
        resolve(null);
      };
    } catch (e) {
      resolve(null);
    }
  });
}

// Generate unique storage key
export function getStorageKey(memberId, docKey) {
  const cleanId = String(memberId || 'default').trim().toLowerCase();
  const cleanDoc = String(docKey || 'doc').trim().toLowerCase();
  return `kyc_${cleanId}_${cleanDoc}`;
}

// Synchronously store in memory and async in IndexedDB + localStorage
export function saveDocumentFile(memberId, docKey, fileInfo) {
  if (!memberId || !docKey || !fileInfo) return;
  const key = getStorageKey(memberId, docKey);

  const payload = {
    id: key,
    memberId,
    docKey,
    name: fileInfo.name || `${docKey}_document`,
    size: fileInfo.size || '150 KB',
    type: fileInfo.type || (fileInfo.name?.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg'),
    dataUrl: fileInfo.dataUrl || fileInfo.fileData || null,
    updatedAt: Date.now()
  };

  // 1. In-memory
  memoryCache.set(key, payload);

  // 2. LocalStorage (safe catch)
  try {
    if (payload.dataUrl && payload.dataUrl.length < 1500000) {
      localStorage.setItem(`kyc_doc_${memberId}_${docKey}`, JSON.stringify(payload));
    }
  } catch (e) {
    // Quota exceeded, ignore
  }

  // 3. IndexedDB (handles large files up to tens of MBs)
  getDb().then(db => {
    if (!db) return;
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(payload);
    } catch (err) {
      console.warn('[DocStore] IndexedDB save error:', err);
    }
  });
}

// Synchronous retrieval from memory cache or localStorage
export function getDocumentFile(memberId, docKey) {
  if (!memberId || !docKey) return null;
  const key = getStorageKey(memberId, docKey);

  // 1. Check memory cache
  if (memoryCache.has(key)) {
    return memoryCache.get(key);
  }

  // 2. Check localStorage
  try {
    const raw = localStorage.getItem(`kyc_doc_${memberId}_${docKey}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed) {
        memoryCache.set(key, parsed);
        return parsed;
      }
    }
  } catch (e) {}

  // 3. Kick off async fetch from IndexedDB to warm memory cache
  getDb().then(db => {
    if (!db) return;
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = (e) => {
        if (e.target.result) {
          memoryCache.set(key, e.target.result);
        }
      };
    } catch (e) {}
  });

  return null;
}

// Document placeholder generator: Disabled per user requirement (display only real uploaded files)
export function generateDocPlaceholder() {
  return null;
}
