/**
 * Canvas mode's other half (see canvas-mode.ts): what an element is called
 * in the inspector's breadcrumb, words edited where they stand, a picture
 * swapped before it is saved, and elements found again by what they are when
 * the Studio marks them as being changed.
 */

export type Post = (msg: unknown) => void;

/** What an element is, in a word, for the inspector's breadcrumb: what an
 * owner would call it — a card, a grid of cards, a block — not its tag. */
const ROLE: Record<string, string> = {
  header: "header", footer: "footer", nav: "navigation", section: "section", main: "page", article: "card",
  li: "item", button: "button", img: "picture", form: "form", ul: "list", ol: "list",
  h1: "heading", h2: "heading", h3: "heading", h4: "heading", p: "text", span: "text", label: "label", input: "field",
};

// runtime: background pictures — the Studio's upgrade check (internal/webapi/design_editor.go editorMarker).

function looksLikeCard(el: Element): boolean {
  const r = el.getBoundingClientRect();
  return r.height < 900 && !!el.querySelector("img") && !!el.querySelector("h2, h3, h4, strong, [data-edit]");
}

/** A container's name, by what it holds. */
function nameOfBox(el: Element, tag: string): string {
  if (looksLikeCard(el) && el.querySelectorAll("img").length === 1) return "card";
  const kids = Array.from(el.children);
  if (kids.length >= 3 && kids.filter(looksLikeCard).length >= 2) return "grid";
  if (tag === "li") return "item";
  if (el.querySelector(":scope > h1, :scope > h2, :scope > div > h1, :scope > div > h2")) return "block";
  return "group";
}

function nameOf(el: Element): string {
  const tag = el.tagName.toLowerCase();
  if ((el as HTMLElement).dataset?.record) return "card";
  if (ROLE[tag] && tag !== "li") return ROLE[tag];
  if (tag === "a") return looksLikeCard(el) ? "card" : "link";
  return nameOfBox(el, tag);
}

export function chainOf(el: Element): { tag: string; name: string }[] {
  const out: { tag: string; name: string }[] = [];
  for (let e: Element | null = el; e && e !== document.body && out.length < 7; e = e.parentElement) {
    out.push({ tag: e.tagName.toLowerCase(), name: nameOf(e) });
  }
  return out;
}

export function up(el: Element, depth: number): Element {
  let e = el;
  for (let i = 0; i < depth && e.parentElement && e.parentElement !== document.body; i++) e = e.parentElement;
  return e;
}

/** Turns the words under a point into an editable field; Enter keeps, Escape drops. */
export function editAt(x: number, y: number, post: Post, setEditing: (el: HTMLElement | null) => void) {
  const el = document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-edit]");
  if (!el || !el.dataset.edit) {
    post({ type: "agentteam:edit-refused" });
    return;
  }
  const key = el.dataset.edit;
  const before = el.innerText;
  setEditing(el);
  el.setAttribute("contenteditable", "plaintext-only");
  el.style.outline = "2px solid #2563eb";
  el.style.outlineOffset = "2px";
  el.focus();
  document.getSelection()?.selectAllChildren(el);
  const finish = (keep: boolean) => {
    el.removeEventListener("keydown", onKey);
    el.removeEventListener("blur", onBlur);
    el.removeAttribute("contenteditable");
    el.style.outline = "";
    setEditing(null);
    const value = el.innerText.trim();
    if (keep && value !== before.trim()) post({ type: "agentteam:edited", key, value });
    else {
      el.innerText = before;
      post({ type: "agentteam:edit-cancel" });
    }
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); finish(true); }
    else if (e.key === "Escape") { e.preventDefault(); finish(false); }
  };
  const onBlur = () => finish(true);
  el.addEventListener("keydown", onKey);
  el.addEventListener("blur", onBlur);
}

/** An element a change is about, as the inspector described it. */
export interface LocateTarget {
  id: string;
  key?: string;
  record?: string;
  text?: string;
  tag?: string;
}

export function rectOf(el: Element | null) {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0 ? { x: r.x, y: r.y, w: r.width, h: r.height } : null;
}

/** Where an element is now: by its record, its content key, or its words. */
export function locate(t: LocateTarget) {
  if (t.record) {
    const el = document.querySelector(`[data-record="${CSS.escape(t.record)}"]`);
    if (el) return rectOf(el);
  }
  if (t.key) {
    const el = document.querySelector(`[data-edit="${CSS.escape(t.key)}"]`);
    if (el) return rectOf(el);
  }
  if (t.text) {
    const all = Array.from(document.querySelectorAll<HTMLElement>(t.tag || "*"));
    const hit = all.find((el) => (el.innerText || "").trim() === t.text);
    if (hit) return rectOf(hit);
  }
  return null;
}

export function locateAll(targets: LocateTarget[] | undefined) {
  const rects: Record<string, ReturnType<typeof rectOf>> = {};
  for (const t of targets ?? []) rects[t.id] = locate(t);
  return rects;
}

/**
 * The path of a picture in a computed background-image, when it is one of
 * this site's own files. A gradient carries no file, a data: url is not in
 * the repository, and another site's url is not ours to write over — see
 * canvas-mode.ts's backgroundPictureOf, which this mirrors.
 */
function backgroundPathIn(image: string): string | undefined {
  if (!image || image === "none") return undefined;
  const found = /url\((["']?)([^"')]+)\1\)/.exec(image);
  if (!found || /^data:/i.test(found[2])) return undefined;
  try {
    const url = new URL(found[2], location.href);
    return url.origin === location.origin ? url.pathname : undefined;
  } catch {
    return undefined;
  }
}

/**
 * A photograph drawn as a background (a full-bleed hero, a band behind words),
 * shown replaced before the site is built again. canvas-mode's
 * backgroundPictureOf is what lets the owner select one; this is its half.
 *
 * The scan reads computed styles, so it is deliberately not in a render path:
 * it runs when the owner drops a file, once. The original path is kept in
 * dataset.agentteamBg, because after this the computed value is a data: url
 * and the path it stands for is what the owner is still editing.
 */
function setBackgroundPicture(src: string, data: string) {
  for (const el of Array.from(document.querySelectorAll<HTMLElement>("*"))) {
    if (el instanceof HTMLImageElement) continue;
    const own = el.dataset.agentteamBg ?? backgroundPathIn(getComputedStyle(el).backgroundImage);
    if (own !== src) continue;
    el.dataset.agentteamBg = own;
    if (data) {
      el.style.backgroundImage = `url("${data.replace(/"/g, "%22")}")`;
    } else {
      el.style.removeProperty("background-image");
    }
  }
}

export function setImage(src: string, data: string) {
  for (const img of Array.from(document.querySelectorAll<HTMLImageElement>("img"))) {
    const own = img.dataset.agentteamSrc ?? img.getAttribute("src");
    if (own === src) {
      img.dataset.agentteamSrc = own;
      img.src = data || own;
    }
  }
  // A place still waiting for its picture (<Picture>, picture.tsx) shows the
  // one given until the site is built again with it.
  for (const el of Array.from(document.querySelectorAll<HTMLElement>("[data-picture]"))) {
    if (el.dataset.picture !== src) continue;
    el.style.backgroundImage = data ? `url("${data.replace(/"/g, "%22")}")` : "";
    // A product's place (<ProductImage>) shows the whole object, as it will once built.
    el.style.backgroundSize = el.dataset.fit === "contain" ? "contain" : "cover";
    el.style.backgroundRepeat = "no-repeat";
    el.style.backgroundPosition = "center";
    if (data) el.dataset.filled = "";
    else delete el.dataset.filled;
  }
  setBackgroundPicture(src, data);
}

/** Where a photo is held when its frame crops it: "30% 20%". */
export function setFocus(src: string, position: string) {
  if (!/^\d{1,3}(\.\d+)?% \d{1,3}(\.\d+)?%$/.test(position)) return;
  for (const img of Array.from(document.querySelectorAll<HTMLImageElement>("img"))) {
    if ((img.dataset.agentteamSrc ?? img.getAttribute("src")) === src) img.style.setProperty("object-position", position, "important");
  }
  // The same point to keep in view, for a picture drawn as a background: its
  // object-position is background-position. A cropped background is the most
  // common place the owner needs this — a full-bleed hero is cropped at every
  // size but one.
  for (const el of Array.from(document.querySelectorAll<HTMLElement>("[data-agentteam-bg]"))) {
    if (el.dataset.agentteamBg === src) el.style.setProperty("background-position", position, "important");
  }
}
