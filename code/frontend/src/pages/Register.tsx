import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { T, useContent } from "../editable";
import Icon from "../components/Icon";
import Select from "../components/Select";
import { usePageMeta } from "../seo";
import { signIn } from "../lib/session";

export default function Register() {
  usePageMeta("pages.register.title", "pages.register.description");
  const [role, setRole] = useState("buyer");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const navigate = useNavigate();
  const field = "w-full rounded-[var(--radius-sm)] border border-field bg-surface px-3 py-2 text-sm text-ink";
  return (
    <section className="mx-auto grid max-w-page gap-12 px-[var(--gutter)] py-14 lg:grid-cols-[1fr_1fr]">
      <div>
        <T k="pages.register.eyebrow" as="p" className="label text-ink-soft" />
        <T k="pages.register.heading" as="h1" className="mt-2 max-w-[22ch] text-[length:var(--size-h1)]" />
        <form
          onSubmit={(e) => {
            e.preventDefault();
            signIn(email, name, role);
            navigate(role === "supplier" ? "/supplier/account" : "/account");
          }}
          className="mt-8 flex max-w-[36ch] flex-col gap-4"
        >
          <span className="flex flex-col gap-1">
            <span className="label text-ink-soft"><T k="pages.register.role" /></span>
            <Select id="role" value={role} onChange={(v) => setRole(v || "buyer")} aria-label={useContent("pages.register.role")}
              placeholder="Buyer" options={[{ value: "buyer", label: "Buyer" }, { value: "supplier", label: "Supplier" }]} />
          </span>
          <label className="flex flex-col gap-1">
            <span className="label text-ink-soft"><T k="pages.register.name" /></span>
            <input id="name" required value={name} onChange={(e) => setName(e.target.value)} className={field} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="label text-ink-soft"><T k="pages.register.email" /></span>
            <input id="reg-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={field} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="label text-ink-soft"><T k="pages.register.phone" /></span>
            <input id="reg-phone" inputMode="tel" className={`${field} fig`} />
          </label>
          {role === "supplier" && (
            <>
              <label className="flex flex-col gap-1">
                <span className="label text-ink-soft"><T k="pages.register.licence" /></span>
                <input id="licence" type="file" className={field} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="label text-ink-soft"><T k="pages.register.agency" /></span>
                <input id="agency" type="file" className={field} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="label text-ink-soft"><T k="pages.register.bank" /></span>
                <input id="bank" className={`${field} fig`} />
              </label>
            </>
          )}
          <button type="submit" data-testid="register-submit" className="mt-2 rounded-[var(--radius-sm)] bg-accent px-6 py-3 text-sm text-accent-ink hover:opacity-90">
            <T k="pages.register.submit" />
          </button>
          <p className="text-sm text-ink-soft">
            <T k="pages.register.haveAccount" /> <Link to="/signin" className="text-ink underline hover:text-accent"><T k="nav.signin" /></Link>
          </p>
        </form>
      </div>
      <div className="rounded-[var(--radius-sm)] border border-line bg-surface p-8">
        <T k="pages.register.whyHeading" as="h2" className="text-[length:var(--size-h2)]" />
        <ul className="mt-5 flex flex-col gap-3 text-sm text-ink">
          <li className="flex gap-2"><Icon name="store" size={16} className="text-accent" /><T k="pages.register.why1" /></li>
          <li className="flex gap-2"><Icon name="date" size={16} className="text-accent" /><T k="pages.register.why2" /></li>
          <li className="flex gap-2"><Icon name="card" size={16} className="text-accent" /><T k="pages.register.why3" /></li>
          <li className="flex gap-2"><Icon name="secure" size={16} className="text-accent" /><T k="pages.register.why4" /></li>
        </ul>
      </div>
    </section>
  );
}
