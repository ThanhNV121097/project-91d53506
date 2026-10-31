import { content } from "../editable";
import { schema } from "../data";

/**
 * Every date, time and price on the site, written one way.
 *
 * The site's locale is content.json's `site.locale`: "vi-VN" for a business
 * in Vietnam — 16/10/2026, 14:30, 1.200.000 ₫ — or the business's own
 * ("en-US": 10/16/2026, 2:30 PM, $1,200.00). Month and day names are English,
 * as every word on the site is, in the order the locale writes a date
 * (16 Oct 2026). A price is in the currency it is given, else the one
 * src/data/schema.json names on its price fields (what the Studio's Data
 * panel shows beside them), else the locale's.
 *
 * Components never format a date or a price themselves: `toLocaleString`,
 * `Intl` or `${price} ₫` in a component is a second format, and a site that
 * shows two is sent back in review.
 */

export type DateStyle = "short" | "medium" | "long";

type When = Date | string | number | null | undefined;

const FALLBACK = "vi-VN";

/** The site's locale: content.json's site.locale when the browser knows it, else vi-VN. */
export function siteLocale(): string {
  const site = (content() as unknown as { site?: { locale?: unknown } } | null)?.site;
  const want = typeof site?.locale === "string" ? site.locale.trim() : "";
  try {
    return want && Intl.DateTimeFormat.supportedLocalesOf(want).length > 0 ? want : FALLBACK;
  } catch {
    return FALLBACK;
  }
}

/** Where month and day names come from: English, day first unless the site's English writes it otherwise. */
const wordsLocale = (locale: string) => (/^en\b/i.test(locale) ? locale : "en-GB");

/**
 * A date as a record holds it: a Date, a timestamp, or ISO text. "2026-10-16"
 * is that day where the visitor is — JavaScript alone reads it as midnight in
 * London, which is the day before in Hanoi's evening and all of the Americas.
 */
function toDate(value: When): Date | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "string") {
    const day = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
    if (day) return new Date(Number(day[1]), Number(day[2]) - 1, Number(day[3]));
  }
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

const DATE: Record<DateStyle, Intl.DateTimeFormatOptions> = {
  short: { day: "2-digit", month: "2-digit", year: "numeric" },
  medium: { day: "numeric", month: "short", year: "numeric" },
  long: { weekday: "long", day: "numeric", month: "long", year: "numeric" },
};

/**
 * A date. "short" (the default) is the locale's numbers — 16/10/2026 in
 * vi-VN, 10/16/2026 in en-US; "medium" names the month — 16 Oct 2026;
 * "long" the day too — Friday, 16 October 2026. "" for no date.
 */
export function formatDate(value: When, style: DateStyle = "short"): string {
  const d = toDate(value);
  if (!d) return "";
  const locale = siteLocale();
  return new Intl.DateTimeFormat(style === "short" ? locale : wordsLocale(locale), DATE[style]).format(d);
}

/** A time of day: 14:30 in vi-VN, 2:30 PM in en-US. "" for none. */
export function formatTime(value: When): string {
  const d = toDate(value);
  return d ? new Intl.DateTimeFormat(siteLocale(), { hour: "numeric", minute: "2-digit" }).format(d) : "";
}

/** A date and its time: 16/10/2026, 14:30 in vi-VN; the date in any of formatDate's styles. */
export function formatDateTime(value: When, style: DateStyle = "short"): string {
  const d = toDate(value);
  return d ? `${formatDate(d, style)}, ${formatTime(d)}` : "";
}

/** The currency of a locale's country, for a site whose schema names none. */
const CURRENCY: Record<string, string> = {
  VN: "VND", US: "USD", GB: "GBP", AU: "AUD", CA: "CAD", NZ: "NZD", SG: "SGD", TH: "THB", JP: "JPY", KR: "KRW",
};

/** The currency prices are in: the schema's price fields', else the locale's country's. */
export function siteCurrency(): string {
  for (const c of Object.values(schema.collections)) {
    const named = c.fields.find((f) => f.type === "price" && f.currency)?.currency;
    if (named) return named.toUpperCase();
  }
  const locale = siteLocale();
  const region = locale.split("-")[1]?.toUpperCase() ?? "";
  return CURRENCY[region] ?? (locale.toLowerCase().startsWith("vi") ? "VND" : "USD");
}

/**
 * A price: 1.200.000 ₫ in vi-VN, $1,200.00 in en-US. A number given as text
 * ("1200000") is read; text that is not one comes back as it was, and no
 * price is "".
 */
export function formatPrice(amount: number | string | null | undefined, currency?: string): string {
  if (amount === null || amount === undefined || amount === "") return "";
  const n = typeof amount === "number" ? amount : Number(amount);
  if (!Number.isFinite(n)) return String(amount);
  const code = (currency || siteCurrency()).toUpperCase();
  try {
    return new Intl.NumberFormat(siteLocale(), { style: "currency", currency: code }).format(n);
  } catch {
    // A currency code the browser does not know: the number, and the code after it.
    return `${new Intl.NumberFormat(siteLocale()).format(n)} ${code}`;
  }
}
