import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { T, useContent, useList } from "../editable";
import Icon from "../components/Icon";
import { usePageMeta } from "../seo";
import { signIn } from "../lib/session";
import { AuthError, DEMO_CREDENTIALS, loginOtp, loginPassword, requestOtp } from "../lib/mock/buyer-role-sign-up-and-sign-in";

type Method = "password" | "otp";

export default function SignIn() {
  usePageMeta("pages.signin.title", "pages.signin.description");
  const [method, setMethod] = useState<Method>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [role, setRole] = useState("buyer");
  const [error, setError] = useState("");
  const roleLabel = useContent("pages.signin.role");
  const roles = useList("pages.signin.roles");
  const errorLocked = useContent("pages.signin.errorLocked");
  const errorCredentials = useContent("pages.signin.errorCredentials");
  const otpError = useContent("pages.signin.otpError");
  const googleError = useContent("pages.signin.googleError");
  const navigate = useNavigate();
  const field = "w-full rounded-[var(--radius-sm)] border border-field bg-surface px-3 py-2 text-sm text-ink";

  function route(forRole: string) {
    navigate(forRole === "supplier" ? "/supplier" : forRole === "admin" ? "/admin" : "/account");
  }

  function quickFill(r: string) {
    setRole(r);
    const demo = DEMO_CREDENTIALS[r];
    if (demo && !password) setPassword(demo.password);
  }

  function submitPassword(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const user = loginPassword(email, password);
      signIn(user.email, user.name, user.role);
      route(user.role);
    } catch (err) {
      setError(err instanceof AuthError && err.code === "locked" ? errorLocked : errorCredentials);
    }
  }

  function submitOtpRequest(e: FormEvent) {
    e.preventDefault();
    setError("");
    requestOtp(phone);
    setOtpSent(true);
  }

  function submitOtpVerify(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const user = loginOtp(phone, code);
      signIn(user.email, user.name, user.role);
      route(user.role);
    } catch {
      setError(otpError);
    }
  }

  const tab = (active: boolean) =>
    `flex-1 px-3 py-2 text-sm ${active ? "bg-accent text-accent-ink" : "bg-surface text-ink hover:text-accent"}`;

  return (
    <section className="mx-auto grid max-w-page gap-12 px-[var(--gutter)] py-14 lg:grid-cols-[1fr_1fr]">
      <div>
        <T k="pages.signin.eyebrow" as="p" className="label text-ink-soft" />
        <T k="pages.signin.heading" as="h1" className="mt-2 max-w-[20ch] text-[length:var(--size-h1)]" />
        <div role="tablist" aria-label="Sign-in method" className="mt-8 flex max-w-[36ch] overflow-hidden rounded-[var(--radius-sm)] border border-field">
          <button type="button" role="tab" aria-selected={method === "password"} onClick={() => { setMethod("password"); setError(""); }} className={tab(method === "password")}>
            <T k="pages.signin.methodPassword" />
          </button>
          <button type="button" role="tab" aria-selected={method === "otp"} onClick={() => { setMethod("otp"); setError(""); }} className={tab(method === "otp")}>
            <T k="pages.signin.methodPhone" />
          </button>
        </div>

        {method === "password" ? (
          <form onSubmit={submitPassword} className="mt-4 flex max-w-[36ch] flex-col gap-4">
            <label className="flex flex-col gap-1">
              <span className="label text-ink-soft"><T k="pages.signin.email" /></span>
              <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={field} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="label text-ink-soft"><T k="pages.signin.password" /></span>
              <input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className={field} />
            </label>
            <span className="flex flex-col gap-1">
              <span className="label text-ink-soft"><T k="pages.signin.role" /></span>
              <span id="role" role="radiogroup" aria-label={roleLabel} className="flex overflow-hidden rounded-[var(--radius-sm)] border border-field">
                {roles.map((r) => (
                  <button key={String(r.value)} type="button" role="radio" aria-checked={role === r.value}
                    data-testid={`role-${String(r.value)}`} onClick={() => quickFill(String(r.value))}
                    className={tab(role === r.value)}>
                    {String(r.label)}
                  </button>
                ))}
              </span>
            </span>
            {error && <p role="alert" className="text-sm text-ink">{error}</p>}
            <button type="submit" data-testid="signin-submit" className="mt-2 rounded-[var(--radius-sm)] bg-accent px-6 py-3 text-sm text-accent-ink hover:opacity-90">
              <T k="pages.signin.submit" />
            </button>
            <button type="button" onClick={() => {
              try {
                const user = loginPassword(DEMO_CREDENTIALS.buyer.email, DEMO_CREDENTIALS.buyer.password);
                signIn("google@example.com", user.name, "buyer");
                navigate("/account");
              } catch {
                setError(useContent("pages.signin.googleError"));
              }
            }}
              className="flex items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-field px-6 py-3 text-sm text-ink hover:border-accent hover:text-accent">
              <Icon name="account" size={16} /><T k="pages.signin.google" />
            </button>
          </form>
        ) : (
          <form onSubmit={otpSent ? submitOtpVerify : submitOtpRequest} className="mt-4 flex max-w-[36ch] flex-col gap-4">
            <label className="flex flex-col gap-1">
              <span className="label text-ink-soft"><T k="pages.signin.phone" /></span>
              <input id="signin-phone" inputMode="tel" required disabled={otpSent} value={phone} onChange={(e) => setPhone(e.target.value)} className={`${field} fig`} />
            </label>
            {otpSent && (
              <label className="flex flex-col gap-1">
                <span className="label text-ink-soft"><T k="pages.signin.otp" /></span>
                <input id="otp" inputMode="numeric" required value={code} onChange={(e) => setCode(e.target.value)} className={`${field} fig`} />
              </label>
            )}
            {otpSent && <T k="pages.signin.otpSent" as="p" className="text-sm text-ink-soft" />}
            {error && <p role="alert" className="text-sm text-ink">{error}</p>}
            <button type="submit" data-testid="otp-submit" className="mt-2 rounded-[var(--radius-sm)] bg-accent px-6 py-3 text-sm text-accent-ink hover:opacity-90">
              <T k={otpSent ? "pages.signin.otpVerify" : "pages.signin.otpRequest"} />
            </button>
            {otpSent && (
              <button type="button" onClick={() => { setOtpSent(false); setCode(""); setError(""); }} className="text-sm text-ink-soft underline hover:text-accent">
                <T k="pages.signin.otpChange" />
              </button>
            )}
          </form>
        )}
        <p className="mt-4 text-sm text-ink-soft">
          <T k="pages.signin.noAccount" /> <Link to="/register" className="text-ink underline hover:text-accent"><T k="pages.signin.register" /></Link>
        </p>
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
