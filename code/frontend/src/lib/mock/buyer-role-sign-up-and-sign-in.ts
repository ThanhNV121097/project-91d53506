/**
 * The design's mock auth: demo accounts and the register/login checks
 * AUTH-001/AUTH-002 describe, kept in this browser only. Deleted once the
 * backend story replaces it with real /v1/auth/* endpoints (lib/session.ts
 * still holds the signed-in visitor itself — this module only decides who
 * is allowed to become one).
 */
export interface MockUser {
  email: string;
  password: string;
  name: string;
  role: "buyer" | "supplier" | "admin";
  status: "Active" | "Locked";
}

export class AuthError extends Error {
  code: "invalid" | "locked" | "duplicate" | "otp";
  constructor(code: AuthError["code"]) {
    super(code);
    this.code = code;
  }
}

const SEED: MockUser[] = [
  { email: "buyer@example.com", password: "Buyer123!", name: "Lan Tran", role: "buyer", status: "Active" },
  { email: "hue@cualohomestay.vn", password: "Supplier123!", name: "Hue", role: "supplier", status: "Active" },
  { email: "admin@example.com", password: "Admin123!", name: "An Admin", role: "admin", status: "Active" },
  { email: "locked@example.com", password: "Locked123!", name: "Khoa", role: "buyer", status: "Locked" },
];

/** One demo account per role, so the role shortcut on /signin can fill a working password. */
export const DEMO_CREDENTIALS: Record<string, { email: string; password: string }> = {
  buyer: { email: SEED[0].email, password: SEED[0].password },
  supplier: { email: SEED[1].email, password: SEED[1].password },
  admin: { email: SEED[2].email, password: SEED[2].password },
};

const KEY = "nad:mock-users";

function readExtra(): MockUser[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as MockUser[]) : [];
  } catch {
    return [];
  }
}

function writeExtra(users: MockUser[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(users));
  } catch {
    /* a private window: a registration lasts this page */
  }
}

function allUsers(): MockUser[] {
  return [...SEED, ...readExtra()];
}

/** AUTH-001.2-4: a match issues the user, a locked row or a wrong credential throws. */
export function loginPassword(email: string, password: string): MockUser {
  const user = allUsers().find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
  if (!user || user.password !== password) throw new AuthError("invalid");
  if (user.status === "Locked") throw new AuthError("locked");
  return user;
}

/** AUTH-001.1: a known email is rejected, never a second row. */
export function register(email: string, password: string, role: string, name: string): MockUser {
  const address = email.trim().toLowerCase();
  if (allUsers().some((u) => u.email.toLowerCase() === address)) throw new AuthError("duplicate");
  const user: MockUser = { email: address, password, name, role: role === "supplier" ? "supplier" : "buyer", status: "Active" };
  writeExtra([...readExtra(), user]);
  return user;
}

/** AUTH-002.1: the mock never sends an SMS — one fixed demo code is always the right one. */
export const OTP_DEMO_CODE = "123456";

export function requestOtp(_phone: string): void {
  // Nothing to store server-side in the mock: see OTP_DEMO_CODE.
}

/** AUTH-002.2: any other code throws; the mock has no phone directory, so a correct code signs in as the demo buyer. */
export function loginOtp(phone: string, code: string): MockUser {
  if (code !== OTP_DEMO_CODE) throw new AuthError("otp");
  return { ...SEED[0], email: phone.trim() || SEED[0].email };
}
