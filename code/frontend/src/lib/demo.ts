import { useSyncExternalStore } from "react";

/**
 * Whether this page is being LOOKED AT rather than used.
 *
 * Some pages have nothing on them until a visitor has done something first: a
 * cart before anything is in it, a checkout before there is a cart, an order
 * history before there are orders. Those pages are the ones a shop lives or
 * dies by — and every one of them was drawn, reviewed and approved EMPTY,
 * because the drawer, the walk and the reviewer are all first-time visitors
 * who have never clicked anything.
 *
 * Measured on an online store, 2026-10-19: /checkout drew as the single line
 * "Your cart is empty. Browse the shop." The Apple Pay button the owner asked
 * for, the totals, the line items — nothing in the approval chain ever saw
 * them. Seven of its nine pages came back as header, footer and almost
 * nothing between.
 *
 * So: when the page is being drawn for the Studio, walked by the tester, or
 * shown in the Studio's live frame, demoMode() is true, and a page whose
 * content depends on what the visitor built shows a REPRESENTATIVE EXAMPLE
 * instead of its empty state — three real lines in the cart, a real total at
 * the checkout, two past orders in the account.
 *
 *   const demo = useDemo();
 *   const lines = demo && cart.length === 0 ? exampleCart : cart;
 *
 * Use your own records and your own types: nothing here says what an example
 * must look like, only when to show one. The empty state still has to exist
 * and still has to be good — a real visitor will see it — but it is not what
 * the page is judged on.
 *
 * Never true on the deployed site: it is set only by the tools that look at
 * the design (localStorage "agentteam:demo", or ?demo=1 on the preview), and
 * a real visitor's browser has neither.
 */

const KEY = "agentteam:demo";

/** Where the flag is kept when the browser refuses storage: this page only. */
let memory = false;

function read(): boolean {
  if (memory) return true;
  try {
    if (localStorage.getItem(KEY) !== null) return true;
  } catch {
    /* storage refused — fall through to the query */
  }
  try {
    return new URLSearchParams(window.location.search).has("demo");
  } catch {
    return false;
  }
}

/** True while the design is being drawn, walked or shown in the Studio. */
export function demoMode(): boolean {
  return read();
}

/** Turns demo mode on for this browser. Called by the tools that look. */
export function setDemoMode(on: boolean): void {
  memory = on;
  try {
    if (on) localStorage.setItem(KEY, "1");
    else localStorage.removeItem(KEY);
  } catch {
    /* kept in memory above */
  }
  cached = read();
  read_once = true;
  listeners.forEach((l) => l());
}

const listeners = new Set<() => void>();

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

// Cached so the snapshot is the same value until it actually changes:
// useSyncExternalStore calls it on every render, and a fresh value each time
// is React's "getSnapshot should be cached" loop (error #185).
let cached = false;
let read_once = false;
function snapshot(): boolean {
  if (!read_once) {
    cached = read();
    read_once = true;
  }
  return cached;
}

/** demoMode(), re-rendering if it changes. Server snapshot is false. */
export function useDemo(): boolean {
  return useSyncExternalStore(subscribe, snapshot, () => false);
}
