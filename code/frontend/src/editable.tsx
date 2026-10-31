import { createElement, useSyncExternalStore, type ElementType } from "react";
import initial from "./content.json";
import { collections, schema, setCollection, type Row } from "./data";
import { canvasSession, handleCanvasMessage } from "./canvas-mode";

/**
 * The copy on the site, and the owner's hand on it.
 *
 * Every word a visitor reads lives in content.json, addressed by a dot path
 * ("hero.headline", "menu.items.2.name"). Components draw it with <T k="…"/>,
 * which also marks the element so the Studio can find it. When the site runs
 * inside the Studio's frame, a click on marked text tells the Studio which
 * key it is, and the Studio's edits come back here and redraw at once — no
 * rebuild, no agent. The Studio commits the same change to content.json in
 * the repository, so the next build has it too.
 *
 * Colours and type are CSS variables in theme.css; the Studio sets them on
 * :root the same way, live.
 */

type Json = string | number | boolean | null | Json[] | { [k: string]: Json };

let store: Json = structuredClone(initial as Json);
const listeners = new Set<() => void>();

function get(path: string): Json | undefined {
  return path.split(".").reduce<Json | undefined>((acc, part) => {
    if (acc === undefined || acc === null || typeof acc !== "object") return undefined;
    return Array.isArray(acc) ? acc[Number(part)] : (acc as { [k: string]: Json })[part];
  }, store);
}

/** A key that would reach past the content into the object machinery. */
const FORBIDDEN = new Set(["__proto__", "prototype", "constructor"]);

/** A value no field of the site may hold: a link that runs script. */
const unsafeValue = (v: Json) => typeof v === "string" && /^\s*(javascript|vbscript|data:text\/html)/i.test(v);

const isObject = (v: Json | undefined): v is { [k: string]: Json } | Json[] => v !== undefined && v !== null && typeof v === "object";

const child = (node: Json, part: string): Json | undefined =>
  Array.isArray(node) ? node[Number(part)] : (node as { [k: string]: Json })[part];

/** The object holding the last part of a path, or undefined when there is none. */
function holder(parts: string[]): { [k: string]: Json } | Json[] | undefined {
  let cur: Json | undefined = store;
  for (const part of parts) {
    if (!isObject(cur)) return undefined;
    cur = child(cur, part);
  }
  return isObject(cur) ? cur : undefined;
}

function set(path: string, value: Json) {
  const parts = path.split(".");
  if (parts.some((p) => FORBIDDEN.has(p)) || unsafeValue(value)) return;
  const last = parts.pop()!;
  const cur = holder(parts);
  if (!cur) return;
  if (Array.isArray(cur)) cur[Number(last)] = value;
  else cur[last] = value;
  store = structuredClone(store);
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** The value at a key, re-rendering when the Studio changes it. */
// V is what the page expects at the key — a string, a list, an object typed by
// an interface. Not constrained to Json: an interface never satisfies Json's
// index signature, and the error sent a design turn round in circles.
export function useContent<V = string>(k: string): V {
  return useSyncExternalStore(subscribe, () => get(k) as unknown as V, () => get(k) as unknown as V);
}

/** A list at a key, for mapping over items. */
export function useList<V = { [k: string]: Json }>(k: string): V[] {
  const v = useContent<Json>(k);
  return Array.isArray(v) ? (v as unknown as V[]) : [];
}

/**
 * A piece of text, editable in the Studio.
 *
 * `as` picks the element; `k` is the key. Anything else goes on the element.
 */
export function T({ k, as = "span", ...rest }: { k: string; as?: ElementType; className?: string; href?: string }) {
  const value = useContent<Json>(k);
  const text = value === undefined || value === null ? "" : String(value);
  return createElement(as, { ...rest, "data-edit": k }, text);
}

/** The whole store, for a component that needs more than one key. */
export function content(): Json {
  return store;
}

type Msg =
  | { type: "agentteam:set-text"; key: string; value: string }
  | { type: "agentteam:set-theme"; name: string; value: string }
  | { type: "agentteam:set-data"; name: string; rows: Row[] }
  | { type: "agentteam:hello" };

const THEME_VARS = ["--ground", "--surface", "--ink", "--ink-soft", "--accent", "--accent-ink", "--font-display", "--font-body"];

function readTheme(): Record<string, string> {
  const cs = getComputedStyle(document.documentElement);
  const out: Record<string, string> = {};
  for (const name of THEME_VARS) out[name] = cs.getPropertyValue(name).trim();
  return out;
}

/**
 * The Studio's unsaved colours. One set, because a site has one mode: the
 * palette its chosen direction settled on. This used to be three sets — any,
 * light, dark — with the live one picked by what <html data-theme> said.
 */
const overrides: Record<string, string> = {};
let applied: string[] = [];

function applyOverrides() {
  const style = document.documentElement.style;
  for (const name of applied) style.removeProperty(name);
  for (const [name, value] of Object.entries(overrides)) style.setProperty(name, value);
  applied = Object.keys(overrides);
}

/** Answers hello with everything the Studio shows: words, the palette, records. */
function sendReady(post: (msg: unknown) => void) {
  // One palette, read as it stands. This used to switch <html data-theme> to
  // each mode in turn and send both, with a list of which modes the design
  // actually had — all of which existed because a site could be two designs.
  post({ type: "agentteam:ready", content: store, theme: readTheme(), data: collections(), schema, caps: CAPS });
}

/**
 * What this runtime can do, for the Studio: one it does not find here makes
 * the Studio bring the runtime up to date (POST …/design/editor). "pictures":
 * photos held where the owner says, and places waiting for one. "guarded":
 * only in the Studio's frame, only from it, no keys past the content.
 * "session": a page opened with signed-in=1 is shown signed in (canvasSession).
 * "backgrounds": a photograph drawn as a CSS background is a picture the owner
 * can select and replace, like an <img> (canvas-mode.ts backgroundPictureOf,
 * canvas-edit.ts setBackgroundPicture). Without it a full-bleed hero written
 * as bg-[url('/images/hero.jpg')] was a photograph the owner could see and
 * had no way to change — and the walk's own hero check counts that very shape
 * as a picture carried at scale, so the pipeline rewarded it.
 */
const CAPS = ["canvas", "locate", "edit", "names", "guarded", "pictures", "session", "backgrounds"];

/** The Studio's edits: words, a colour, records, and the hello that asks for everything. */
function handleEdit(m: Msg, post: (msg: unknown) => void) {
  switch (m.type) {
    case "agentteam:set-text":
      set(m.key, m.value);
      break;
    case "agentteam:set-theme":
      overrides[m.name] = m.value;
      applyOverrides();
      break;
    case "agentteam:set-data":
      if (typeof m.name === "string" && !FORBIDDEN.has(m.name) && Array.isArray(m.rows)) setCollection(m.name, m.rows);
      break;
    case "agentteam:hello":
      sendReady(post);
      break;
  }
}

/**
 * Wires the frame to the Studio — only the Studio's: the frame it opens has
 * ?canvas in its address and says the Studio's origin (&studio=), and only
 * messages from that parent are taken. The site on its own, or framed by
 * any other page, has no editor at all (the preview's server also refuses
 * to be framed by any page but the console).
 */
export function installEditor() {
  if (typeof window === "undefined" || window.parent === window) return;
  const params = new URLSearchParams(window.location.search);
  if (!params.has("canvas")) return;
  // Before anything renders: the page is drawn for the visitor it is shown to.
  canvasSession(params);
  const parent = window.parent;
  const studio = params.get("studio") ?? "";
  const target = /^https?:\/\/[^/]+$/.test(studio) ? studio : "*";
  const post = (msg: unknown) => parent.postMessage(msg, target);
  window.addEventListener("message", (e: MessageEvent<Msg>) => {
    if (e.source !== parent || (target !== "*" && e.origin !== target)) return;
    const m = e.data;
    if (!m || typeof m !== "object") return;
    if (!handleCanvasMessage(m, post)) handleEdit(m, post);
  });
  document.addEventListener("click", (e) => {
    const el = (e.target as HTMLElement | null)?.closest<HTMLElement>("[data-edit]");
    if (!el) return;
    e.preventDefault();
    e.stopPropagation();
    const r = el.getBoundingClientRect();
    post({ type: "agentteam:pick", key: el.dataset.edit, text: el.textContent ?? "", rect: { x: r.x, y: r.y, w: r.width, h: r.height } });
  }, true);
  post({ type: "agentteam:ready", content: store, theme: {}, caps: CAPS });
  markBorrowedPictures();
}

/**
 * Pictures under /images/ref/ were borrowed from the sites the design learned
 * from. They stand in until the owner has their own, and the site cannot go
 * online while any is left — so in the Studio each one is outlined, and a
 * label says how many are left. Only in the Studio's frame; the site itself
 * shows nothing of this.
 */
function markBorrowedPictures() {
  // The manifest lists what is still borrowed: a picture the owner replaced
  // keeps its path under /images/ref/ but leaves the manifest. Without a
  // readable manifest every picture under that folder is marked.
  let listed: Set<string> | null = null;
  fetch("/images/ref/SOURCES.json")
    .then((r) => (r.ok ? r.json() : null))
    .then((entries: { path: string }[] | null) => {
      if (Array.isArray(entries)) listed = new Set(entries.map((e) => "/" + e.path.replace(/^code\/frontend\/public\//, "")));
    })
    .catch(() => {});
  const isBorrowed = (img: HTMLImageElement) => {
    const src = new URL(img.src, location.href).pathname;
    return src.startsWith("/images/ref/") && (listed === null || listed.has(src));
  };
  const style = document.createElement("style");
  style.textContent =
    'img[data-borrowed]{outline:3px dashed #f59e0b;outline-offset:-3px}' +
    "#agentteam-borrowed{position:fixed;left:12px;bottom:12px;z-index:2147483647;padding:6px 10px;" +
    "border-radius:6px;background:#f59e0b;color:#111;font:600 12px/1.3 system-ui,sans-serif;pointer-events:none}";
  document.head.appendChild(style);
  const badge = document.createElement("div");
  badge.id = "agentteam-borrowed";
  const update = () => {
    let n = 0;
    for (const img of Array.from(document.images)) {
      if (isBorrowed(img)) {
        img.setAttribute("data-borrowed", "");
        n++;
      } else img.removeAttribute("data-borrowed");
    }
    badge.textContent = `${n} borrowed picture${n === 1 ? "" : "s"} on this page: replace before going online`;
    if (n > 0 && !badge.isConnected) document.body.appendChild(badge);
    if (n === 0 && badge.isConnected) badge.remove();
  };
  update();
  window.setInterval(update, 1500);
}
