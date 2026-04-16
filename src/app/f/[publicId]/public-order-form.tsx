"use client";

import { db } from "@/lib/supabase/fundraiser-schema";
import { createClient } from "@/lib/supabase/client";
import type { PublishedFundraiserBundle } from "@/types/database";
import { useMemo, useState } from "react";
import { nanoid } from "nanoid";

function formatMoney(cents: number) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "CAD",
  }).format(cents / 100);
}

export function PublicOrderForm({ bundle }: { bundle: PublishedFundraiserBundle }) {
  const supabase = useMemo(() => createClient(), []);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ id: string; totalCents: number } | null>(
    null
  );
  const [idempotencyKey] = useState(() => nanoid());

  const f = bundle.fundraiser;

  const totalCents = useMemo(() => {
    let t = 0;
    for (const item of bundle.items) {
      const q = quantities[item.id] ?? 0;
      if (q > 0 && item.unit_price_cents != null) {
        t += q * item.unit_price_cents;
      }
    }
    return t;
  }, [bundle.items, quantities]);

  const hasAnyPricedItem = bundle.items.some(
    (i) => i.unit_price_cents != null
  );

  if (bundle.form_state === "closed") {
    return (
      <div className="space-y-6">
        <header className="space-y-4">
          {f.hero_image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={f.hero_image_url}
              alt=""
              className="aspect-[21/9] w-full rounded-2xl object-cover"
            />
            // TODO: make the hero image show the full thing
          )}
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            {f.title}
          </h1>
          {f.description ? (
            <p className="whitespace-pre-wrap text-zinc-600 dark:text-zinc-400">
              {f.description}
            </p>
          ) : null}
        </header>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 dark:border-amber-900 dark:bg-amber-950/40">
          <p className="text-sm font-semibold uppercase tracking-wide text-amber-900 dark:text-amber-200">
            Closed
          </p>
          <p className="mt-3 whitespace-pre-wrap text-amber-950 dark:text-amber-100">
            {bundle.closed_message?.trim()
              ? bundle.closed_message
              : "This order form is no longer accepting responses."}
          </p>
        </div>
      </div>
    );
  }

  function setQty(itemId: string, q: number, max: number | null) {
    const next = Math.max(0, Math.floor(q));
    const capped = max === null ? next : Math.min(next, max);
    setQuantities((prev) => ({ ...prev, [itemId]: capped }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const line_items = Object.entries(quantities)
      .filter(([, q]) => q > 0)
      .map(([item_id, quantity]) => ({ item_id, quantity }));

    const { data, error: rpcErr } = await db(supabase).rpc("submit_order", {
      p_public_id: f.public_id,
      p_responses: responses,
      p_line_items: line_items,
      p_idempotency_key: idempotencyKey,
    });

    setSubmitting(false);
    if (rpcErr) {
      const m = rpcErr.message || "";
      if (m.includes("INSUFFICIENT_STOCK")) {
        setError(
          "An item just sold out or stock changed. Refresh the page and try again."
        );
      } else if (m.includes("MISSING_FIELD")) {
        setError("Please fill in all required fields.");
      } else if (m.includes("EMPTY_ORDER")) {
        setError("Select at least one item with a quantity.");
      } else {
        setError(m || "Could not submit. Try again.");
      }
      return;
    }

    const payload = data as { order_id?: string; total_cents?: number } | null;
    const oid = payload?.order_id;
    if (!oid) {
      setError("Unexpected response. Try again.");
      return;
    }
    setDone({
      id: oid,
      totalCents: payload?.total_cents ?? totalCents,
    });
  }

  if (done) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center dark:border-emerald-900 dark:bg-emerald-950/40">
        <h2 className="text-xl font-semibold text-emerald-900 dark:text-emerald-100">
          Thank you!
        </h2>
        <p className="mt-2 text-sm text-emerald-800 dark:text-emerald-200">
          Your order was recorded. Reference:{" "}
          <span className="font-mono text-xs">{done.id}</span>
        </p>
        {hasAnyPricedItem && (
          <p className="mt-4 text-lg font-semibold tabular-nums text-emerald-900 dark:text-emerald-100">
            Total {formatMoney(done.totalCents)}
          </p>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-10">
      <header className="space-y-4">
        {f.hero_image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={f.hero_image_url}
            alt=""
            className="aspect-[21/9] w-full rounded-2xl object-cover"
          />
        )}
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          {f.title}
        </h1>
        {f.description ? (
          <p className="whitespace-pre-wrap text-zinc-600 dark:text-zinc-400">
            {f.description}
          </p>
        ) : null}
      </header>

      <section>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Items
        </h2>
        <ul className="mt-4 grid gap-4 sm:grid-cols-2">
          {bundle.items.map((item) => {
            const remaining = item.remaining;
            const soldOut = remaining !== null && remaining <= 0;
            const maxPick = remaining;
            const qty = quantities[item.id] ?? 0;

            return (
              <li
                key={item.id}
                className={`rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 ${
                  soldOut ? "pointer-events-none opacity-50 grayscale" : ""
                }`}
              >
                <div className="flex gap-3">
                  {item.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.image_url}
                      alt=""
                      className="h-20 w-20 shrink-0 rounded-lg object-cover"
                    />
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium text-zinc-900 dark:text-zinc-100">
                      {item.name}
                    </h3>
                    {item.description ? (
                      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                        {item.description}
                      </p>
                    ) : null}
                    <p className="mt-2 text-xs text-zinc-500">
                      {soldOut ? (
                        <span className="font-medium text-zinc-700 dark:text-zinc-300">
                          Sold out
                        </span>
                      ) : remaining === null ? (
                        "Unlimited"
                      ) : (
                        <>
                          {remaining} {item.unit_label ? `${item.unit_label}` : ""} 남음
                        </>
                      )}
                    </p>
                    {item.unit_price_cents != null && (
                      <p className="mt-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
                        {formatMoney(item.unit_price_cents)}
                        {item.unit_label ? ` / ${item.unit_label}` : ""}
                      </p>
                    )}
                  </div>
                </div>
                {!soldOut && (
                  <div className="mt-4 flex items-center gap-3">
                    <button
                      type="button"
                      aria-label="Decrease quantity"
                      disabled={qty <= 0 || submitting}
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-300 text-lg font-medium hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-600 dark:hover:bg-zinc-800"
                      onClick={() => setQty(item.id, qty - 1, maxPick)}
                    >
                      −
                    </button>
                    <span className="min-w-[2ch] text-center font-medium tabular-nums">
                      {qty}
                    </span>
                    <button
                      type="button"
                      aria-label="Increase quantity"
                      disabled={
                        submitting || (maxPick !== null && qty >= maxPick)
                      }
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-300 text-lg font-medium hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-600 dark:hover:bg-zinc-800"
                      onClick={() => setQty(item.id, qty + 1, maxPick)}
                    >
                      +
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Your details
        </h2>
        <div className="mt-4 space-y-4">
          {bundle.fields.map((field) => (
            <div key={field.id}>
              <label
                htmlFor={field.key}
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                {field.label}
                {field.required ? (
                  <span className="text-red-500"> *</span>
                ) : null}
              </label>
              {field.type === "textarea" ? (
                <textarea
                  id={field.key}
                  required={field.required}
                  rows={3}
                  value={responses[field.key] ?? ""}
                  onChange={(e) =>
                    setResponses((r) => ({ ...r, [field.key]: e.target.value }))
                  }
                  className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:ring-2 focus:ring-emerald-500/40 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
                />
              ) : field.type === "select" ? (
                <select
                  id={field.key}
                  required={field.required}
                  value={responses[field.key] ?? ""}
                  onChange={(e) =>
                    setResponses((r) => ({ ...r, [field.key]: e.target.value }))
                  }
                  className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
                >
                  <option value="">Choose…</option>
                  {(field.options ?? []).map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id={field.key}
                  type={
                    field.type === "email"
                      ? "email"
                      : field.type === "phone"
                        ? "tel"
                        : "text"
                  }
                  required={field.required}
                  value={responses[field.key] ?? ""}
                  onChange={(e) =>
                    setResponses((r) => ({ ...r, [field.key]: e.target.value }))
                  }
                  className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:ring-2 focus:ring-emerald-500/40 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
                />
              )}
            </div>
          ))}
        </div>
      </section>

      {hasAnyPricedItem && (
        <div className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-white px-4 py-4 dark:border-zinc-800 dark:bg-zinc-900">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            <b>{f.e_transfer_email ? `${f.e_transfer_email}` : ""}</b>으로 e-transfer 부탁드립니다!
          </span>
          <span className="text-lg font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
            {formatMoney(totalCents)}
          </span>
        </div>
      )}

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/50 dark:text-red-200">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-500 disabled:opacity-50"
      >
        {submitting ? "Submitting…" : "Submit order"}
      </button>
    </form>
  );
}
