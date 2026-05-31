import { useSyncExternalStore } from "react";
import {
  clearSession as wipeDisk,
  loadSession,
  saveSession as persistDisk,
} from "./session";
import type { Session } from "./schemas";

/**
 * Reactive, in-memory view of the auth session, kept in sync with the on-disk
 * `auth.json`. Modelled on the toast store: a module-level value plus a
 * `useSyncExternalStore` hook, so React surfaces (the home-screen indicator)
 * re-render the moment login/logout/refresh mutate it — no restart needed.
 *
 * All writes go through here so the disk and the in-memory value never diverge.
 */
let current: Session | null = loadSession();
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

export function getSession(): Session | null {
  return current;
}

export function isAuthenticated(): boolean {
  return current !== null;
}

/** Persist a session and notify subscribers. */
export function setSession(session: Session): void {
  current = session;
  persistDisk(session);
  emit();
}

/** Clear the session from memory and disk, then notify subscribers. */
export function signOut(): void {
  current = null;
  wipeDisk();
  emit();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Reactive accessor for components. */
export function useSession(): Session | null {
  return useSyncExternalStore(subscribe, getSession, getSession);
}
