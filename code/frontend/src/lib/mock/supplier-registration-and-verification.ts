/**
 * Mock for /supplier/account (SUPPLIERS-001) and the shared upload endpoint
 * (SUPPLIERS-006, POST /v1/media). Kept to one small file: deleted once the
 * backend story replaces it with a real API client behind the same names.
 */
export interface SupplierProfile {
  name: string;
  documents: string[];
  verified: boolean;
  rejectionReason: string | null;
  bankName: string;
  bankAccountNumber: string;
  bankAccountHolder: string;
}

const KEY = "nad:supplier-profile";

const seed: SupplierProfile = {
  name: "", documents: [], verified: false, rejectionReason: null,
  bankName: "", bankAccountNumber: "", bankAccountHolder: "",
};

export function readProfile(): SupplierProfile {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...seed, ...(JSON.parse(raw) as Partial<SupplierProfile>) } : seed;
  } catch {
    return seed;
  }
}

export function writeProfile(p: SupplierProfile): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* a private window: the profile lasts this page */
  }
}

const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

/** POST /v1/media: rejects a file over 10 MB or of an unaccepted type. */
export async function uploadDocument(file: File): Promise<{ url: string }> {
  await new Promise((r) => setTimeout(r, 300));
  if (file.size > 10 * 1024 * 1024 || !ACCEPTED.includes(file.type)) {
    throw new Error("Upload failed. Use a JPEG, PNG, WEBP or PDF under 10 MB, and try again.");
  }
  return { url: `https://cdn.example.com/${encodeURIComponent(file.name)}` };
}
