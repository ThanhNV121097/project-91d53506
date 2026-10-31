/**
 * Canvas mode: the Studio's canvas shows this page whole, at its real size,
 * and inspects it instead of using it — the way a Figma frame is selected,
 * not clicked through.
 *
 * In it, nothing on the page reacts to a click or a key: links do not go,
 * buttons do not press, forms do not submit. The Studio asks what is at a
 * point and gets back what a designer's inspector shows — the words and the
 * content key they live under, the face, size, weight and alignment, which
 * palette colour each colour is, and the text around it so a record can be
 * matched to the data it came from.
 *
 * The frame is as tall as the page, so viewport units are fixed to the
 * device's height first: a hero of 100vh in a 5000px frame would be 5000px.
 */

import { chainOf, editAt, locateAll, setFocus, setImage, up, type LocateTarget, type Post } from "./canvas-edit";

/**
 * The visitor a page is shown to. A page design/pages.json marks "auth" (a
 * checkout, an account) is opened by the Studio with signed-in=1 and shown
 * signed in, as a demo visitor — with &role= when the page belongs to one
 * role; every other page is shown signed out. It is
 * written to the key the design's mock session reads (src/lib/session.ts —
 * not imported: a design older than it may have none) before the app's first
 * render, since installEditor runs before main.tsx renders, and announced to
 * the session's subscribers should the app be up already. The workspace's
 * drawing of the pages writes the same key and value.
 */
const SESSION_KEY = "agentteam:session";
const DEMO_KEY = "agentteam:demo";
const DEMO_VISITOR = { email: "guest@example.com", name: "Alex Morgan", demo: true };

/**
 * The visitor the frame is shown as. `role=supplier` is a page kept to one
 * role (design/pages.json "roles"): shown as anybody else it is its own
 * refusal, and the owner would be approving the words "You do not have
 * access to this area" where their supplier's products should be.
 */
function visitor(params: URLSearchParams): string {
  const role = (params.get("role") || "").trim().toLowerCase();
  return JSON.stringify(role ? { ...DEMO_VISITOR, role } : DEMO_VISITOR);
}

export function canvasSession(params: URLSearchParams) {
  try {
    if (params.get("signed-in") === "1") localStorage.setItem(SESSION_KEY, visitor(params));
    else localStorage.removeItem(SESSION_KEY);
    // Every frame in the Studio is a page being LOOKED AT, never used: a
    // cart, a checkout or an order history shows a representative example
    // rather than the empty state a first-time visitor would get. The drawer
    // and the walk write the same key (src/lib/demo.ts).
    localStorage.setItem(DEMO_KEY, "1");
  } catch {
    return; // storage refused: the page shows as it would signed out
  }
  window.dispatchEvent(new StorageEvent("storage", { key: SESSION_KEY }));
  window.dispatchEvent(new StorageEvent("storage", { key: DEMO_KEY }));
}

export interface InspectInfo {
  tag: string;
  text: string;
  key?: string;
  record?: string;
  image?: string;
  context: string[];
  rect: { x: number; y: number; w: number; h: number };
  style: Record<string, string>;
  tokens: Record<string, string>;
}

let on = false;
let deviceHeight = 900;

const BLOCKED = ["click", "auxclick", "dblclick", "submit", "mousedown", "mouseup", "pointerdown", "pointerup", "touchstart", "keydown", "keypress"];

/** The words being edited in place, if any: their events are theirs. */
let editing: HTMLElement | null = null;

function block(e: Event) {
  if (!on) return;
  if (editing && e.target instanceof Node && editing.contains(e.target)) return;
  e.preventDefault();
  e.stopImmediatePropagation();
}

const VH = /(-?\d*\.?\d+)(s|d|l)?vh\b/g;

function toPx(value: string): string {
  return value.replace(VH, (_, n: string) => `${(parseFloat(n) * deviceHeight) / 100}px`);
}

function fixRules(rules: CSSRuleList) {
  for (const rule of Array.from(rules)) {
    if (rule instanceof CSSStyleRule) {
      for (const prop of Array.from(rule.style)) {
        const v = rule.style.getPropertyValue(prop);
        if (v.includes("vh")) rule.style.setProperty(prop, toPx(v), rule.style.getPropertyPriority(prop));
      }
    }
    if ("cssRules" in rule && (rule as CSSGroupingRule).cssRules) fixRules((rule as CSSGroupingRule).cssRules);
  }
}

/** Every vh, svh, dvh and lvh in the page's own styles becomes pixels of the device height. */
function fixViewportUnits() {
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      fixRules(sheet.cssRules);
    } catch {
      // A stylesheet from another origin cannot be read; Google Fonts carries no vh.
    }
  }
  for (const el of Array.from(document.querySelectorAll<HTMLElement>('[style*="vh"]'))) {
    el.setAttribute("style", toPx(el.getAttribute("style") ?? ""));
  }
}

function reportSize(post: Post) {
  let last = 0;
  const send = () => {
    const h = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
    if (h !== last) {
      last = h;
      post({ type: "agentteam:size", h });
    }
  };
  new ResizeObserver(send).observe(document.body);
  send();
}

/** Palette colours as the browser resolves them, by value: rgb(…) → ["--accent"]. */
let palette: Map<string, string[]> | null = null;

function paletteNames(): string[] {
  const names = new Set<string>();
  const walk = (rules: CSSRuleList) => {
    for (const rule of Array.from(rules)) {
      if (rule instanceof CSSStyleRule && rule.selectorText.includes(":root")) {
        for (const prop of Array.from(rule.style)) if (prop.startsWith("--")) names.add(prop);
      }
      if ("cssRules" in rule && (rule as CSSGroupingRule).cssRules) walk((rule as CSSGroupingRule).cssRules);
    }
  };
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      walk(sheet.cssRules);
    } catch {
      // other origin
    }
  }
  return Array.from(names);
}

function resolvePalette(): Map<string, string[]> {
  const probe = document.createElement("span");
  document.body.appendChild(probe);
  const map = new Map<string, string[]>();
  for (const name of paletteNames()) {
    probe.style.color = "";
    probe.style.color = `var(${name})`;
    const v = getComputedStyle(probe).color;
    if (!probe.style.color || v === "rgba(0, 0, 0, 0)") continue;
    map.set(v, [...(map.get(v) ?? []), name]);
  }
  probe.remove();
  return map;
}

function tokenOf(value: string): string | undefined {
  palette ??= resolvePalette();
  return palette.get(value)?.[0];
}

/** The colour behind an element: its own, or the first ancestor's that is not transparent. */
function backgroundOf(el: Element | null): string {
  for (let e = el; e; e = e.parentElement) {
    const bg = getComputedStyle(e).backgroundColor;
    if (bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent") return bg;
  }
  return getComputedStyle(document.body).backgroundColor;
}

function ownText(el: Element): string {
  return Array.from(el.childNodes)
    .filter((n) => n.nodeType === Node.TEXT_NODE)
    .map((n) => n.textContent ?? "")
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function context(el: Element): string[] {
  const out: string[] = [];
  for (let e = el.parentElement, i = 0; e && i < 5; e = e.parentElement, i++) {
    out.push((e as HTMLElement).innerText?.replace(/\s+/g, " ").trim().slice(0, 600) ?? "");
  }
  return out;
}

// A PICTURE DRAWN AS A BACKGROUND IS STILL A PICTURE THE OWNER MUST BE ABLE
// TO CHANGE.
//
// imageOf used to answer only for an <img> and for a <Picture> block, so a
// full-bleed hero written as `style={{backgroundImage: url('/images/hero.jpg')}}`
// or `bg-[url('/images/hero.jpg')]` came back with no picture at all: the
// inspector showed no place to drop one, picture-drop had nothing to target,
// and setImage never touched it. The owner could see the photograph and had
// no way to replace it, which is the one thing the Studio exists to do.
//
// It was not a rare shape either. The walk's own hero check counts
// `cs.backgroundImage !== 'none'` as a picture carried at scale
// (uiwalk_checks_design.go), so the pipeline rewarded exactly the hero the
// owner could not edit.
//
// Nothing on the server had to change: PUT …/design/picture is keyed by the
// picture's PATH, so a background whose url is a path in this repository is
// replaced by writing that file, like any other.
//
// Only a path of this site's own: a gradient carries no file, a data: url is
// not in the repository, and another site's url is not ours to write over.
function backgroundPathOf(el: HTMLElement): string | undefined {
  // What the Studio already replaced here, remembered the way an <img> keeps
  // dataset.agentteamSrc — the computed value is a data: url by then, and the
  // path it stands for is the one the owner is editing.
  if (el.dataset.agentteamBg) return el.dataset.agentteamBg;
  const image = getComputedStyle(el).backgroundImage;
  if (!image || image === "none") return undefined;
  const found = /url\((["']?)([^"')]+)\1\)/.exec(image);
  if (!found) return undefined;
  const raw = found[2];
  if (/^data:/i.test(raw)) return undefined;
  try {
    const url = new URL(raw, location.href);
    if (url.origin !== location.origin) return undefined;
    return url.pathname;
  } catch {
    return undefined;
  }
}

/** The nearest element at or above `el` drawing a picture of this site as its background. */
function backgroundPictureOf(el: Element): string | undefined {
  for (let node: Element | null = el; node; node = node.parentElement) {
    if (!(node instanceof HTMLElement)) continue;
    // A <Picture> block's background is set by setImage itself; imageOf has
    // already answered for those from data-picture.
    if (node.dataset.fit !== undefined && !node.dataset.agentteamBg) continue;
    const path = backgroundPathOf(node);
    if (path) return path;
  }
  return undefined;
}

// A picture the Studio replaced is shown from its data; it is still the one at its own path.
// A place waiting for its picture (<Picture>) is a picture too, at the path it will have.
// A photograph drawn as a background is one as well — see backgroundPictureOf.
function imageOf(el: Element): string | undefined {
  if (el instanceof HTMLImageElement) return el.dataset.agentteamSrc ?? el.getAttribute("src") ?? undefined;
  return el.closest<HTMLElement>("[data-picture]")?.dataset.picture ?? backgroundPictureOf(el);
}

/**
 * How a picture fills its frame, for the inspector's "keep this in view" drag.
 *
 * For an <img> that is object-fit and object-position. For a photograph drawn
 * as a background it is background-size and background-position, and the
 * inspector needs them under the same two names: it offers the drag only when
 * the frame crops, and a <div> drawing a cover background reports object-fit
 * "fill" — so the one picture that most needs the drag, a full-bleed hero
 * cropped at every size but one, would never be offered it.
 */
function pictureFitOf(el: Element, cs: CSSStyleDeclaration): { objectFit: string; objectPosition: string } {
  if (el instanceof HTMLImageElement || !(el instanceof HTMLElement) || !backgroundPictureOf(el)) {
    return { objectFit: cs.objectFit, objectPosition: cs.objectPosition };
  }
  const size = cs.backgroundSize;
  return {
    objectFit: size === "cover" || size === "contain" ? size : cs.objectFit,
    objectPosition: cs.backgroundPosition || cs.objectPosition,
  };
}

function inspect(el: Element): InspectInfo {
  const cs = getComputedStyle(el);
  const r = el.getBoundingClientRect();
  const bg = backgroundOf(el);
  const tokens: Record<string, string> = {};
  const color = tokenOf(cs.color);
  const background = tokenOf(bg);
  const border = parseFloat(cs.borderTopWidth) > 0 ? tokenOf(cs.borderTopColor) : undefined;
  if (color) tokens.color = color;
  if (background) tokens.background = background;
  if (border) tokens.border = border;
  return {
    tag: el.tagName.toLowerCase(),
    text: ownText(el).slice(0, 400) || ((el as HTMLElement).innerText ?? "").trim().slice(0, 400),
    key: el.closest<HTMLElement>("[data-edit]")?.dataset.edit,
    record: el.closest<HTMLElement>("[data-record]")?.dataset.record,
    image: imageOf(el),
    context: context(el),
    rect: { x: r.x, y: r.y, w: r.width, h: r.height },
    style: {
      color: cs.color, background: bg, fontFamily: cs.fontFamily, fontSize: cs.fontSize, fontWeight: cs.fontWeight,
      lineHeight: cs.lineHeight, letterSpacing: cs.letterSpacing, textAlign: cs.textAlign, textTransform: cs.textTransform,
      padding: cs.padding, margin: cs.margin, gap: cs.gap, borderRadius: cs.borderRadius, display: cs.display,
      width: `${Math.round(r.width)}px`, height: `${Math.round(r.height)}px`,
      ...pictureFitOf(el, cs),
    },
    tokens,
  };
}

type Handler = (m: Record<string, unknown>, post: Post) => void;

function setEditing(el: HTMLElement | null) {
  editing = el;
}

const handlers: Record<string, Handler> = {
  "agentteam:canvas": (m, post) => {
    deviceHeight = typeof m.vh === "number" && m.vh > 0 ? m.vh : 900;
    if (!on) {
      on = true;
      for (const t of BLOCKED) window.addEventListener(t, block, true);
      document.documentElement.style.overflow = "hidden";
      reportSize(post);
    }
    fixViewportUnits();
  },
  "agentteam:inspect-at": (m, post) => {
    const at = { x: Number(m.x), y: Number(m.y) };
    const hit = document.elementFromPoint(at.x, at.y);
    if (!hit) return;
    const depth = Number(m.depth ?? 0);
    const el = up(hit, depth);
    if (m.hover) {
      const r = el.getBoundingClientRect();
      post({ type: "agentteam:hovered", rect: { x: r.x, y: r.y, w: r.width, h: r.height } });
      return;
    }
    palette = null; // colours may have changed since the last look
    post({ type: "agentteam:inspected", info: { ...inspect(el), chain: chainOf(hit), depth, at } });
  },
  "agentteam:edit-at": (m, post) => editAt(Number(m.x), Number(m.y), post, setEditing),
  "agentteam:set-image": (m) => setImage(String(m.src ?? ""), String(m.data ?? "")),
  "agentteam:set-focus": (m) => setFocus(String(m.src ?? ""), String(m.position ?? "")),
  "agentteam:locate": (m, post) => post({ type: "agentteam:located", rects: locateAll(m.targets as LocateTarget[]) }),
};

/** Handles the canvas messages; false for any other message. */
export function handleCanvasMessage(m: { type?: string }, post: Post): boolean {
  const h = m.type ? handlers[m.type] : undefined;
  if (!h) return false;
  h(m as Record<string, unknown>, post);
  return true;
}
