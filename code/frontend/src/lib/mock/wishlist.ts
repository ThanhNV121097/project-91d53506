import { useCallback, useSyncExternalStore } from "react";
import { useSession } from "../session";

/**
 * The signed-in Buyer's wishlist — the design's mock of ACCOUNT-002's
 * server-side, per-account association. Keyed by account email so, in this
 * browser, signing in as a different account sees that account's own saved
 * products, not another's; signing back in as the same account sees them
 * again. The backend story replaces this with a `wishlists` table behind
 * the same three names.
 */
const KEY = "nad:wishlist";

type Store = Record<string, string[]>;

const listeners = new Set<() => void>();
let cacheRaw = "";
let cacheStore: Store = {};

function raw(): string {
  try {
    return localStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}

function readStore(): Store {
  const text = raw();
  if (text !== cacheRaw) {
    cacheRaw = text;
    try {
      const v: unknown = text ? JSON.parse(text) : {};
      cacheStore = v && typeof v === "object" ? (v as Store) : {};
    } catch {
      cacheStore = {};
    }
  }
  return cacheStore;
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

function save(store: Store) {
  const text = JSON.stringify(store);
  try {
    localStorage.setItem(KEY, text);
  } catch {
    /* a private window */
  }
  cacheRaw = text;
  cacheStore = store;
  listeners.forEach((l) => l());
}

/**
 * The signed-in account's saved product ids, and a way to add/remove one.
 * `signedIn` is false with no account signed in — the toggle is a no-op
 * then; the caller decides what that means for the page (sign-in prompt).
 */
export function useWishlist() {
  const session = useSession();
  const email = session?.email ?? "";
  const store = useSyncExternalStore(subscribe, readStore, () => cacheStore);
  const ids = email ? store[email] ?? [] : [];
  const toggle = useCallback((id: string) => {
    if (!email) return;
    const current = readStore();
    const mine = current[email] ?? [];
    const next = mine.includes(id) ? mine.filter((x) => x !== id) : [...mine, id];
    save({ ...current, [email]: next });
  }, [email]);
  return { ids, toggle, has: (id: string) => ids.includes(id), signedIn: Boolean(email) };
}
