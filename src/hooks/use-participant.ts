import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "bolao.participant";

export type StoredParticipant = {
  id: string;
  name: string;
  email: string;
};

function readStorage(): StoredParticipant | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredParticipant;
    if (!parsed?.id || !parsed?.email) return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Persists the current participant in localStorage. There is no auth — the
 * id stored here only grants access to that participant's own predictions
 * via the validated server functions.
 */
export function useParticipant() {
  const [participant, setParticipant] = useState<StoredParticipant | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setParticipant(readStorage());
    setHydrated(true);
  }, []);

  const save = useCallback((p: StoredParticipant) => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
    setParticipant(p);
  }, []);

  const clear = useCallback(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    setParticipant(null);
  }, []);

  return { participant, hydrated, save, clear };
}
