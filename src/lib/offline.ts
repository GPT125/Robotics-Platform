import type { Message, ScoutingNote } from '../types';

const DB_NAME = 'robolab-offline';
const DB_VERSION = 1;

function openRoboLabDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('notes')) db.createObjectStore('notes', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('messageQueue')) db.createObjectStore('messageQueue', { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function put<T>(storeName: string, value: T) {
  const db = await openRoboLabDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).put(value);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

async function all<T>(storeName: string): Promise<T[]> {
  const db = await openRoboLabDb();
  const rows = await new Promise<T[]>((resolve, reject) => {
    const request = db.transaction(storeName, 'readonly').objectStore(storeName).getAll();
    request.onsuccess = () => resolve(request.result as T[]);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return rows;
}

export function saveOfflineNote(note: ScoutingNote) {
  return put('notes', note);
}

export function loadOfflineNotes() {
  return all<ScoutingNote>('notes');
}

export function queueOfflineMessage(message: Message) {
  return put('messageQueue', message);
}

export function loadQueuedMessages() {
  return all<Message>('messageQueue');
}
