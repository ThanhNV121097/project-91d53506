import { useState, type FormEvent } from "react";
import { T, useContent } from "../editable";
import Icon from "./Icon";
import { createRequest, requestForBooking, type CancelRequest } from "../lib/mock/buyer-cancellation-and-refund-requests";

/**
 * Per-booking cancellation/rescheduling request on /account (BOOKING-004).
 * One design state ("default", with the request action): a link opens an
 * inline form; submitting it creates a tracked, visible request status and
 * never itself changes the booking's own status — that stays with admin
 * manual refunds.
 */
export default function CancelRefundRequest({ bookingCode }: { bookingCode: string }) {
  const [existing, setExisting] = useState<CancelRequest | undefined>(() => requestForBooking(bookingCode));
  const [open, setOpen] = useState(false);
  const [issue, setIssue] = useState("");
  const [error, setError] = useState("");
  const issueRequired = useContent("pages.account.issueRequired");

  if (existing) {
    return (
      <span className="flex items-center gap-1 text-xs text-ink-soft" data-testid={`cancel-status-${bookingCode}`}>
        <Icon name="info" size={14} />
        <T k="pages.account.requested" />: {existing.status}
      </span>
    );
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-xs text-ink underline hover:text-accent" data-testid={`cancel-open-${bookingCode}`}>
        <T k="pages.account.cancel" />
      </button>
    );
  }

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!issue.trim()) {
      setError("Tell us what you need.");
      return;
    }
    setExisting(createRequest(bookingCode, issue.trim()));
    setOpen(false);
  }

  return (
    <form onSubmit={submit} className="flex w-full flex-col gap-2 sm:w-64" data-testid={`cancel-form-${bookingCode}`}>
      <label className="flex flex-col gap-1 text-xs text-ink-soft">
        <T k="pages.account.issueLabel" />
        <textarea
          value={issue}
          onChange={(e) => { setIssue(e.target.value); setError(""); }}
          rows={2}
          aria-label="What do you need?"
          className="rounded-[var(--radius-sm)] border border-field bg-surface px-3 py-2 text-sm text-ink"
        />
      </label>
      {error && <p role="alert" className="text-xs text-ink">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" className="rounded-[var(--radius-sm)] bg-accent px-4 py-2 text-xs text-accent-ink">
          <T k="pages.account.submitRequest" />
        </button>
        <button type="button" onClick={() => { setOpen(false); setError(""); }} className="rounded-[var(--radius-sm)] border border-field px-4 py-2 text-xs text-ink">
          <T k="pages.account.cancelRequest" />
        </button>
      </div>
    </form>
  );
}
