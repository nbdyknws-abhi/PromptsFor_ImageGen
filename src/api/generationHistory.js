/**
 * generationHistory.js
 * 
 * Stores generated image blobs in IndexedDB so they survive page refreshes.
 * Entries expire automatically after 7 days.
 * 
 * Schema:
 *   db: "genHistory"  store: "entries"
 *   Key: auto-increment  Value: { id, userId, prompt, blob, mimeType, generatedAt, expiresAt }
 */

const DB_NAME = "genHistory";
const STORE = "entries";
const DB_VERSION = 1;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, {
          keyPath: "id",
          autoIncrement: true,
        });
        store.createIndex("userId", "userId", { unique: false });
        store.createIndex("expiresAt", "expiresAt", { unique: false });
      }
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = () => reject(req.error);
  });
}

/** Save a generated image blob to history. Returns the stored entry id. */
export async function saveGenerationToHistory({ userId, prompt, imageUrl, mimeType = "image/png" }) {
  try {
    // Fetch the image as a Blob (works for object URLs and data URLs)
    const resp = await fetch(imageUrl);
    if (!resp.ok) throw new Error("Could not fetch image for history");
    const blob = await resp.blob();

    const now = Date.now();
    const entry = {
      userId: userId || "anon",
      prompt,
      blob,
      mimeType: blob.type || mimeType,
      generatedAt: now,
      expiresAt: now + SEVEN_DAYS_MS,
    };

    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      const req = tx.objectStore(STORE).add(entry);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("generationHistory: failed to save entry", err);
    return null;
  }
}

/** Fetch all non-expired entries for a user, newest first. Cleans up stale entries. */
export async function getGenerationHistory(userId = "anon") {
  try {
    const db = await openDB();
    const now = Date.now();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      const store = tx.objectStore(STORE);
      const index = store.index("userId");
      const req = index.getAll(userId);

      req.onsuccess = () => {
        const all = req.result || [];
        const fresh = [];
        for (const entry of all) {
          if (entry.expiresAt <= now) {
            // Delete expired entry
            store.delete(entry.id);
          } else {
            fresh.push({
              ...entry,
              objectUrl: URL.createObjectURL(entry.blob),
            });
          }
        }
        // Newest first
        fresh.sort((a, b) => b.generatedAt - a.generatedAt);
        resolve(fresh);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("generationHistory: failed to read entries", err);
    return [];
  }
}

/** Delete a single entry by id. */
export async function deleteGenerationEntry(id) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      const req = tx.objectStore(STORE).delete(id);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("generationHistory: failed to delete entry", err);
    return false;
  }
}

/** Clear ALL history for a user. */
export async function clearGenerationHistory(userId = "anon") {
  try {
    const db = await openDB();
    const entries = await getGenerationHistory(userId);
    return new Promise((resolve) => {
      const tx = db.transaction(STORE, "readwrite");
      const store = tx.objectStore(STORE);
      entries.forEach((e) => store.delete(e.id));
      tx.oncomplete = () => resolve(true);
    });
  } catch (err) {
    console.warn("generationHistory: failed to clear", err);
    return false;
  }
}

/** Returns milliseconds remaining before an entry expires (0 if already expired). */
export function timeUntilExpiry(expiresAt) {
  return Math.max(0, expiresAt - Date.now());
}

/** Formats the remaining time as a human-readable string like "5d 3h" or "2h 10m". */
export function formatExpiry(expiresAt) {
  const ms = timeUntilExpiry(expiresAt);
  if (ms <= 0) return "Expired";
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const mins = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h ${mins}m left`;
  return `${mins}m left`;
}
