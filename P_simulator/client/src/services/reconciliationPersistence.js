import { addDoc, collection, getDocs, limit, orderBy, query } from "firebase/firestore";
import { db, isFirebaseConfigured } from "../firebase";

const STORAGE_KEY = "p_simulator_reconciliation_latest_v1";
const COLLECTION_NAME = "reconciliation_sessions";

function canUseLocalStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function saveToLocal(payload) {
  if (!canUseLocalStorage()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function loadFromLocal() {
  if (!canUseLocalStorage()) return null;

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function buildPayload(snapshot) {
  return {
    version: 1,
    savedAt: new Date().toISOString(),
    snapshot
  };
}

export async function saveReconciliationSession(snapshot) {
  const payload = buildPayload(snapshot);
  saveToLocal(payload);

  if (!isFirebaseConfigured || !db) {
    return {
      ok: true,
      storage: "local",
      savedAt: payload.savedAt,
      sessionId: null
    };
  }

  try {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), payload);
    return {
      ok: true,
      storage: "firebase+local",
      savedAt: payload.savedAt,
      sessionId: docRef.id
    };
  } catch (error) {
    return {
      ok: true,
      storage: "local",
      savedAt: payload.savedAt,
      sessionId: null,
      warning: error?.message || "Salvataggio Firebase non disponibile"
    };
  }
}

function toComparableDate(value) {
  const parsed = new Date(value || "");
  if (Number.isNaN(parsed.getTime())) return 0;
  return parsed.getTime();
}

export async function loadLatestReconciliationSession() {
  const localPayload = loadFromLocal();

  if (!isFirebaseConfigured || !db) {
    if (!localPayload) return null;
    return {
      ...localPayload,
      storage: "local",
      sessionId: localPayload.sessionId || null
    };
  }

  try {
    const q = query(collection(db, COLLECTION_NAME), orderBy("savedAt", "desc"), limit(1));
    const snap = await getDocs(q);

    if (!snap.empty) {
      const doc = snap.docs[0];
      const remotePayload = doc.data();
      const remoteDate = toComparableDate(remotePayload.savedAt);
      const localDate = toComparableDate(localPayload?.savedAt);

      if (!localPayload || remoteDate >= localDate) {
        const normalized = {
          ...remotePayload,
          sessionId: doc.id
        };
        saveToLocal(normalized);
        return {
          ...normalized,
          storage: "firebase"
        };
      }
    }
  } catch {
    // Fallback a local storage gestito sotto.
  }

  if (!localPayload) return null;
  return {
    ...localPayload,
    storage: "local",
    sessionId: localPayload.sessionId || null
  };
}
