import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import site from "./site.json";

/**
 * The site's line back to its owner, through Agent Team: what a customer
 * sends with the contact form, and a count of each page opened. The key and
 * the address are written into site.json when the project starts; with no
 * key (this scaffold on its own) nothing is sent and the form says so.
 *
 * Nothing is counted inside the Studio (a frame, or ?canvas) or in a
 * browser driven by a test — only real visitors on the published site.
 */

const KEY = (site as { key?: string }).key ?? "";
const API = ((site as { api?: string }).api ?? "").replace(/\/$/, "");

export const canSend = KEY !== "" && API !== "";

/** What a customer sends. `details` holds a booking's date, time, party size. */
export interface Enquiry {
  name: string;
  reply_to: string;
  message: string;
  details?: Record<string, string>;
  /** Never shown: a bot fills it, a person does not. */
  website?: string;
}

/** Sends the form; rejects with a sentence to show the customer. */
export async function sendEnquiry(e: Enquiry): Promise<void> {
  if (!canSend) throw new Error("This form is not connected yet.");
  const res = await fetch(`${API}/${KEY}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...e, page: window.location.pathname }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? "The message could not be sent. Please try again, or call us.");
  }
}

function watched(): boolean {
  if (typeof window === "undefined") return true;
  if (window.top !== window.self) return true; // the Studio's frame
  if (new URLSearchParams(window.location.search).has("canvas")) return true;
  return navigator.webdriver === true;
}

/** Counts each page a visitor opens. Rendered once, inside the router. */
export function PageViews() {
  const { pathname } = useLocation();
  useEffect(() => {
    if (!canSend || watched()) return;
    const body = JSON.stringify({ path: pathname });
    const url = `${API}/${KEY}/views`;
    // sendBeacon survives the page closing; fetch is the fallback.
    if (!navigator.sendBeacon?.(url, new Blob([body], { type: "text/plain" }))) {
      void fetch(url, { method: "POST", body, keepalive: true }).catch(() => undefined);
    }
  }, [pathname]);
  return null;
}
