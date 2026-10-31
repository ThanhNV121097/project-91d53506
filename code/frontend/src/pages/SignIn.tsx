import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { T, useContent, useList } from "../editable";
import Icon from "../components/Icon";
import { usePageMeta } from "../seo";
import { signIn } from "../lib/session";

export default function SignIn() {
  usePageMeta("pages.signin.title", "pages.signin.description");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("buyer");
  const navigate = useNavigate();
  const field = "w-full rounded-[var(--radius-sm)] border border-field bg-surface px-3 py-2 text-sm text-ink";
  return (
    <section className="mx-auto grid max-w-page gap-12 px-[var(--gutter)] py-14 lg:grid-cols-[1fr_1fr]">
      <div>
        <T k="pages.signin.eyebrow" as="p" className="label text-ink-soft" />
        <T k="pages.signin.heading" as="h1" className="mt-2 max-w-[20ch] text-[length:var(--size-h1)]" />
        <form
          onSubmit={(e) => {
            e.preventDefault();
            signIn(email, undefined, role);
            navigate(role === "supplier" ? "/supplier" : role === "admin" ? "/admin" : "/account");
          }}
          className="mt-8 flex max-w-[36ch] flex-col gap-4"
        >
          <label className="flex flex-col gap-1">
            <span className="label text-ink-soft"><T k="pages.signin.email" /></span>
            <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={field} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="label text-ink-soft"><T k="pages.signin.otp" /></span>
            <input id="otp" inputMode="numeric" className={`${field} fig`} />
          </label>
          <span className="flex flex-col gap-1">
            <span className="label text-ink-soft"><T k="pages.signin.role" /></span>
            <span id="role" role="radiogroup" aria-label={roleLabel} className="flex overflow-hidden rounded-[var(--radius-sm)] border border-field">
              {roles.map((r) => (
                <button key={String(r.value)} type="button" role="radio" aria-checked={role === r.value}
                  data-testid={`role-${String(r.value)}`} onClick={() => setRole(String(r.value))}
                  className={`flex-1 px-3 py-2 text-sm ${role === r.value ? "bg-accent text-accent-ink" : "bg-surface text-ink hover:text-accent"}`}>
                  {String(r.label)}
                </button>
              ))}
            </span>
          </span>
          <button type="submit" data-testid="signin-submit" className="mt-2 rounded-[var(--radius-sm)] bg-accent px-6 py-3 text-sm text-accent-ink hover:opacity-90">
            <T k="pages.signin.submit" />
          </button>
          <button type="button" onClick={() => { signIn("google@example.com", undefined, "buyer"); navigate("/account"); }}
            className="flex items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-field px-6 py-3 text-sm text-ink hover:border-accent hover:text-accent">
            <Icon name="account" size={16} /><T k="pages.signin.google" />
          </button>
          <p className="text-sm text-ink-soft">
            <T k="pages.signin.noAccount" /> <Link to="/register" className="text-ink underline hover:text-accent"><T k="pages.signin.register" /></Link>
          </p>
        </form>
      </div>
      <div className="rounded-[var(--radius-sm)] border border-line bg-surface p-8">
        <T k="pages.signin.whyHeading" as="h2" className="text-[length:var(--size-h2)]" />
        <ul className="mt-5 flex flex-col gap-3 text-sm text-ink">
          <li className="flex gap-2"><Icon name="qr" size={16} className="text-accent" /><T k="pages.signin.why1" /></li>
          <li className="flex gap-2"><Icon name="date" size={16} className="text-accent" /><T k="pages.signin.why2" /></li>
          <li className="flex gap-2"><Icon name="wishlist" size={16} className="text-accent" /><T k="pages.signin.why3" /></li>
          <li className="flex gap-2"><Icon name="returns" size={16} className="text-accent" /><T k="pages.signin.why4" /></li>
        </ul>
      </div>
    </section>
  );
}
