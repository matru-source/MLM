// Sensitive documents are held only for the current authenticated page session.
const cache = new Map();
export const getStorageKey = (memberId, docKey) => String(memberId).toLowerCase() + ':' + docKey;
export function saveDocumentFile(memberId, docKey, fileInfo) { if (memberId && docKey && fileInfo) cache.set(getStorageKey(memberId, docKey), fileInfo); }
export function getDocumentFile(memberId, docKey) { return cache.get(getStorageKey(memberId, docKey)) || null; }
export function syncKycDocsFromServer(docs = []) {
  for (const doc of docs) saveDocumentFile(doc.member_id, doc.doc_key, { name: doc.file_name, type: doc.file_type, size: doc.file_size, dataUrl: doc.data_url, status: doc.status });
}
export function clearDocumentCache() {
  cache.clear();
  if (typeof indexedDB !== 'undefined') indexedDB.deleteDatabase('CyberShield_DocStore_v1');
}
export function generateDocPlaceholder() { return null; }
