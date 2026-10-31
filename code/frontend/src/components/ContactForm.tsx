import { useState, type FormEvent, type ReactNode } from "react";
import { T, useContent } from "../editable";
import { canSend, sendEnquiry } from "../site";

/**
 * The contact form. What a customer sends reaches the owner in Agent Team
 * (src/site.ts), so this form is never decoration: keep it wherever the site
 * asks people to get in touch. `fields` adds a booking's own questions —
 * [{ key: "date", type: "date" }, { key: "people", type: "number" }] — each
 * labelled by contact.form.fields.<key> in content.json.
 *
 * Its words are content.json's contact.form.*. Style it to the design; keep
 * the fields, the hidden "website" trap and the three states.
 */
export interface FormField {
  key: string;
  type?: "text" | "date" | "time" | "number";
}

type State = "idle" | "sending" | "sent" | "failed";

export default function ContactForm({ fields = [], className = "" }: { fields?: FormField[]; className?: string }) {
  const [state, setState] = useState<State>("idle");
  const [problem, setProblem] = useState("");
  const offline = useContent("contact.form.offline");

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const value = (k: string) => String(data.get(k) ?? "").trim();
    const details: Record<string, string> = {};
    for (const f of fields) if (value(f.key)) details[f.key] = value(f.key);
    setState("sending");
    try {
      await sendEnquiry({ name: value("name"), reply_to: value("reply_to"), message: value("message"), details, website: value("website") });
      setState("sent");
    } catch (err) {
      setProblem(err instanceof Error ? err.message : "");
      setState("failed");
    }
  }

  if (state === "sent") {
    return <T k="contact.form.sent" as="p" className={`text-lg ${className}`} />;
  }
  // border-field, not border-line: --line is a section hairline meant to be
  // nearly invisible, and a field that borrows it has no edge a reader can
  // find. The walk measures this (field-edge) and one run reported it ten
  // times — every input on the site.
  const input = "w-full rounded border border-field bg-ground px-4 py-3 text-ink";
  return (
    <form onSubmit={(e) => void submit(e)} className={`flex flex-col gap-4 ${className}`}>
      <Field k="name"><input name="name" autoComplete="name" required className={input} /></Field>
      <Field k="reply_to"><input name="reply_to" autoComplete="tel" required className={input} /></Field>
      {fields.map((f) => (
        <Field key={f.key} k={`fields.${f.key}`}><input name={f.key} type={f.type ?? "text"} className={input} /></Field>
      ))}
      <Field k="message"><textarea name="message" rows={4} className={input} /></Field>
      <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] h-px w-px opacity-0" />
      {state === "failed" && <p role="alert" className="text-sm text-ink">{problem}</p>}
      {!canSend && <p className="text-sm text-ink-soft">{offline}</p>}
      <button type="submit" disabled={state === "sending"} className="self-start rounded bg-accent px-6 py-3 text-accent-ink disabled:opacity-60">
        <T k={state === "sending" ? "contact.form.sending" : "contact.form.send"} />
      </button>
    </form>
  );
}

function Field({ k, children }: { k: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-2 text-sm">
      <T k={`contact.form.${k}`} className="text-ink-soft" />
      {children}
    </label>
  );
}
