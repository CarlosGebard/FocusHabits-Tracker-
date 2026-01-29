export type StoredTrack = {
  id: number;
  blob: Blob;
  mime: string;
  sha256: string;
  size: number;
};

export type StoredPlaylist = {
  id: number;
  name: string;
  track_ids: number[];
  updated_at: string;
};

export type PlaybackState = {
  last_track_id?: number | null;
  position_ms?: number | null;
  queue?: number[] | null;
  shuffle?: boolean;
  repeat?: string | null;
};

const DB_NAME = "tempo";
const DB_VERSION = 1;
//Crea Base de Datos local 
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("tracks")) {
        db.createObjectStore("tracks", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("playlists")) {
        db.createObjectStore("playlists", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("playback_state")) {
        db.createObjectStore("playback_state", { keyPath: "key" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
// Helper para interactuar con la base de datos(storename, modo de transaccion, funcion a ejecutar)
function withStore<T>(storeName: string, mode: IDBTransactionMode, fn: (store: IDBObjectStore) => void) {
  return openDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(storeName, mode);
        const store = tx.objectStore(storeName);
        fn(store);
        tx.oncomplete = () => resolve((undefined as unknown) as T);
        tx.onerror = () => reject(tx.error);
      })
  );
}
// lee un track por su id desde el store "tracks"
export async function getTrack(trackId: number): Promise<StoredTrack | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("tracks", "readonly");
    const store = tx.objectStore("tracks");
    const req = store.get(trackId);
    req.onsuccess = () => resolve(req.result as StoredTrack | undefined);
    req.onerror = () => reject(req.error);
  });
}
// Guarda un track en el store "tracks" , traido del backend
export async function saveTrack(track: StoredTrack): Promise<void> {
  await withStore<void>("tracks", "readwrite", (store) => store.put(track));
}
// Elimina un track del store "tracks" por su id , en el frontend
export async function deleteTrack(trackId: number): Promise<void> {
  await withStore<void>("tracks", "readwrite", (store) => store.delete(trackId));
}
// Verifica si un track ya fue descargado (si existe el blob)
export async function isTrackDownloaded(trackId: number): Promise<boolean> {
  const track = await getTrack(trackId);
  return Boolean(track?.blob);
}
// Guarda una playlist en el store "playlists"
export async function savePlaylist(playlist: StoredPlaylist): Promise<void> {
  await withStore<void>("playlists", "readwrite", (store) => store.put(playlist));
}
// Lee una playlist del store "playlists" por su id
export async function getPlaylist(playlistId: number): Promise<StoredPlaylist | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("playlists", "readonly");
    const store = tx.objectStore("playlists");
    const req = store.get(playlistId);
    req.onsuccess = () => resolve(req.result as StoredPlaylist | undefined);
    req.onerror = () => reject(req.error);
  });
}
// Guarda el estado de reproduccion en el store "playback_state"
export async function savePlaybackState(state: PlaybackState): Promise<void> {
  await withStore<void>("playback_state", "readwrite", (store) =>
    store.put({ key: "main", ...state })
  );
}
// Lee el estado de reproduccion desde el store "playback_state"
export async function getPlaybackState(): Promise<PlaybackState | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("playback_state", "readonly");
    const store = tx.objectStore("playback_state");
    const req = store.get("main");
    req.onsuccess = () => resolve(req.result as PlaybackState | undefined);
    req.onerror = () => reject(req.error);
  });
}


/* Usuario toca “Download”
↓
Frontend pide el audio al backend (fetch)
↓
Recibe un Blob
↓
saveTrack({ ...metadata, blob }) */