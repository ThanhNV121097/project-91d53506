import { useCallback, useSyncExternalStore } from "react";

/** The visitor's wishlist, in this browser only. */
const KEY = "nad:wishlist";
const listeners = new Set<() => void>();
let cache = "";
let parsed: string[] = [];

function raw(): string {
  try {
    return localStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}

function read(): string[] {
  const text = raw();
  if (text !== cache) {
    cache = text;
    parsed = text ? text.split(",").filter(Boolean) : [];
  }
  return parsed;
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

function save(ids: string[]) {
  try {
    localStorage.setItem(KEY, ids.join(","));
  } catch {
    /* a private window */
  }
  cache = ids.join(",");
  parsed = ids;
  listeners.forEach((l) => l());
}

export function useWishlist() {
  const ids = useSyncExternalStore(subscribe, read, () => parsed);
  const toggle = useCallback((id: string) => {
    const now = read();
    save(now.includes(id) ? now.filter((x) => x !== id) : [...now, id]);
  }, []);
  return { ids, toggle, has: (id: string) => ids.includes(id) };
}
