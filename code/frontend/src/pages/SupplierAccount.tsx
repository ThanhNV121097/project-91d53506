import { useState, type ChangeEvent, type FormEvent } from "react";
import DashboardLayout from "../components/DashboardLayout";
import RequireRole from "../components/RequireRole";
import DataTable from "../components/DataTable";
import { Badge } from "../components/TableFilters";
import Icon from "../components/Icon";
import { useCollection, type Row } from "../data";
import { useTableQuery } from "../lib/table";
import { usePageMeta } from "../seo";
import { formatPrice, formatDate } from "../lib/format";
import { SUPPLIER_NAV } from "../lib/nav";
import { readProfile, writeProfile, uploadDocument, type SupplierProfile } from "../lib/mock/supplier-registration-and-verification";

const FIELD = "w-full rounded-[var(--radius-sm)] border border-field bg-surface px-3 py-2 text-sm text-ink";
const FIELD_INVALID = "w-full rounded-[var(--radius-sm)] border border-accent bg-surface px-3 py-2 text-sm text-ink";

const STATUS_LABEL = { verified: "Verified", rejected: "Rejected", pending: "Pending review" } as const;
const STATUS_TONE = { verified: "good", rejected: "bad", pending: "warn" } as const;

function statusOf(p: SupplierProfile): keyof typeof STATUS_TONE {
  if (p.verified) return "verified";
  if (p.rejectionReason) return "rejected";
  return "pending";
}

export default function SupplierAccount() {
  usePageMeta("pages.supplierAccount.title");
  const t = useTableQuery({ size: 20, sort: "-period" });
  const { items, total, pages, page, loading } = useCollection("payouts", {
    page: t.page, pageSize: t.size, sort: t.sort,
  });
  const [profile, setProfile] = useState<SupplierProfile>(() => readProfile());
  const [bankError, setBankError] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const status = statusOf(profile);

  async function handleUpload(e: ChangeEvent<HTMLInputElement>, slot: "licence" | "agency") {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError("");
    try {
      const { url } = await uploadDocument(file);
      setProfile((p) => ({ ...p, documents: [...p.documents.filter((d) => !d.startsWith(`${slot}:`)), `${slot}:${url}`] }));
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed. Try again.");
    } finally {
      setUploading(false);
    }
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const bankAccountNumber = String(data.get("account") ?? "").trim();
    setSaved(false);
    if (!bankAccountNumber) {
      setBankError("Enter your bank account number.");
      return;
    }
    setBankError("");
    const next: SupplierProfile = {
      ...profile,
      name: String(data.get("business") ?? "").trim(),
      bankName: String(data.get("bank") ?? "").trim(),
      bankAccountNumber,
      bankAccountHolder: String(data.get("holder") ?? "").trim(),
    };
    setProfile(next);
    writeProfile(next);
    setSaved(true);
  }

  return (
    <RequireRole roles={["supplier"]}>
      <DashboardLayout title="Profile & payouts" nav={SUPPLIER_NAV} brand="Nghệ An Departures">
        <form onSubmit={handleSubmit} className="grid max-w-3xl gap-5 lg:grid-cols-2">
          <div className="flex flex-wrap items-center gap-2 lg:col-span-2">
            <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>
            {status === "rejected" && profile.rejectionReason && (
              <span className="text-sm text-ink-soft">{profile.rejectionReason}</span>
            )}
          </div>
          <label className="flex flex-col gap-1 lg:col-span-2">
            <span className="label text-ink-soft">Business name</span>
            <input id="business" name="business" defaultValue={profile.name} className={FIELD} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="label text-ink-soft">Business licence</span>
            <input id="licence" type="file" onChange={(e) => void handleUpload(e, "licence")} className={FIELD} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="label text-ink-soft">Travel agency licence, if you have one</span>
            <input id="agency" type="file" onChange={(e) => void handleUpload(e, "agency")} className={FIELD} />
          </label>
          {uploading && <p className="text-sm text-ink-soft lg:col-span-2">Uploading…</p>}
          {uploadError && <p role="alert" className="text-sm text-ink lg:col-span-2">{uploadError}</p>}
          <label className="flex flex-col gap-1">
            <span className="label text-ink-soft">Bank</span>
            <input id="bank" name="bank" defaultValue={profile.bankName} className={FIELD} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="label text-ink-soft">Account number</span>
            <input id="account" name="account" defaultValue={profile.bankAccountNumber}
              aria-invalid={bankError ? true : undefined} aria-describedby={bankError ? "account-error" : undefined}
              className={`${bankError ? FIELD_INVALID : FIELD} fig`} />
            {bankError && <span id="account-error" role="alert" className="text-sm text-ink">{bankError}</span>}
          </label>
          <label className="flex flex-col gap-1 lg:col-span-2">
            <span className="label text-ink-soft">Account holder</span>
            <input id="holder" name="holder" defaultValue={profile.bankAccountHolder} className={FIELD} />
          </label>
          <p className="flex items-center gap-2 text-sm text-ink-soft lg:col-span-2">
            <Icon name="secure" size={16} className="text-accent" />An admin checks your documents before your products can be published.
          </p>
          {saved && <p className="text-sm text-ink lg:col-span-2">Saved.</p>}
          <button type="submit" className="self-start rounded-[var(--radius-sm)] bg-accent px-6 py-2.5 text-sm text-accent-ink lg:col-span-2">Save profile</button>
        </form>

        <h2 className="mt-6 text-base text-ink">Payout history</h2>
        <DataTable<Row>
          columns={[
            { key: "period", label: "Period", sortable: true, render: (r) => <span className="fig">{formatDate(String(r.period))}</span> },
            { key: "gross", label: "Gross", align: "right", render: (r) => <span className="fig">{formatPrice(Number(r.gross))}</span> },
            { key: "commission", label: "Commission", align: "right", render: (r) => <span className="fig">{formatPrice(Number(r.commission))}</span> },
            { key: "net", label: "Payout", align: "right", sortable: true, render: (r) => <span className="fig">{formatPrice(Number(r.net))}</span> },
            { key: "status", label: "Status", render: (r) => <Badge tone="warn">{String(r.status)}</Badge> },
          ]}
          rows={items} total={total} page={page} pages={pages} size={t.size} sort={t.sort}
          onSort={t.toggleSort} onPage={t.setPage} onSize={t.setSize} loading={loading}
          rowKey={(r) => r.id} caption="What the platform has paid you, period by period"
          empty={<p>No payout period has closed yet.</p>}
        />
      </DashboardLayout>
    </RequireRole>
  );
}
