"use client";

import { db } from "@/lib/supabase/fundraiser-schema";
import { createClient } from "@/lib/supabase/client";
import type { PublishedFundraiserBundle } from "@/types/database";
import { nanoid } from "nanoid";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

function formatMoney(cents: number) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "CAD",
  }).format(cents / 100);
}

type PublicOrderFormMode = "default" | "onsite";

export function PublicOrderForm({
  bundle,
  mode = "default",
}: {
  bundle: PublishedFundraiserBundle;
  mode?: PublicOrderFormMode;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [idempotencyKey] = useState(() => nanoid());

  const f = bundle.fundraiser;
  const isOnsite = mode === "onsite";
  const visibleItems = useMemo(() => {
    if (!isOnsite) return bundle.items;
    return bundle.items.filter((item) => item.remaining === null || item.remaining > 0);
  }, [bundle.items, isOnsite]);

  const totalCents = useMemo(() => {
    let t = 0;
    for (const item of visibleItems) {
      const q = quantities[item.id] ?? 0;
      if (q > 0 && item.unit_price_cents != null) {
        t += q * item.unit_price_cents;
      }
    }
    return t;
  }, [quantities, visibleItems]);

  const hasAnyPricedItem = visibleItems.some((i) => i.unit_price_cents != null);

  if (bundle.form_state === "closed") {
    return (
      <div className="space-y-6">
        <header className="space-y-3">
          {!isOnsite && f.hero_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={f.hero_image_url} alt="" className="h-auto w-full rounded-2xl" />
          ) : null}
          {isOnsite ? (
            <>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-600">
                {f.title}
              </p>
              <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                현장주문
              </h1>
            </>
          ) : (
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              {f.title}
            </h1>
          )}
          {f.description && !isOnsite ? (
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
            {isOnsite
              ? "현장판매 주문서는 1부/2부 예배 직후에만 활성화가 되어있을 예정입니다.\n3:30PM과 6:00PM에 다시 확인해주시고 많은 관심과 참여를 부탁드립니다!\nຂອບໃຈຫຼາຍໆ : 컵짜이 라이 = 감사합니다~~"
              : bundle.closed_message?.trim()
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

    const payloadResponses = isOnsite
      ? {
          name: responses.name ?? "",
          __submission_mode: "onsite",
        }
      : responses;

    const { data, error: rpcErr } = await db(supabase).rpc("submit_order", {
      p_public_id: f.public_id,
      p_responses: payloadResponses,
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

    const payload = data as { order_id?: string } | null;
    const oid = payload?.order_id;
    if (!oid) {
      setError("Unexpected response. Try again.");
      return;
    }

    const confirmationUrl = isOnsite
      ? `/f/${f.public_id}/confirmation/${oid}?source=onsite`
      : `/f/${f.public_id}/confirmation/${oid}`;
    router.push(confirmationUrl);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-10">
      <header className="space-y-4">
        {!isOnsite && f.hero_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={f.hero_image_url} alt="" className="h-auto w-full rounded-2xl" />
        ) : null}
        {isOnsite ? (
          <>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-600">
              {f.title}
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              현장주문
            </h1>
          </>
        ) : (
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            {f.title}
          </h1>
        )}
        {f.description && !isOnsite ? (
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
          {visibleItems.map((item) => {
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
                    {item.unit_price_cents != null ? (
                      <p className="mt-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
                        {formatMoney(item.unit_price_cents)}
                        {item.unit_label ? ` / ${item.unit_label}` : ""}
                      </p>
                    ) : null}
                  </div>
                  {item.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.image_url}
                      alt=""
                      className="h-40 w-40 shrink-0 rounded-lg object-contain"
                    />
                  ) : null}
                </div>
                {!soldOut ? (
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
                      disabled={submitting || (maxPick !== null && qty >= maxPick)}
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-300 text-lg font-medium hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-600 dark:hover:bg-zinc-800"
                      onClick={() => setQty(item.id, qty + 1, maxPick)}
                    >
                      +
                    </button>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          {isOnsite ? "Name" : "Your details"}
        </h2>
        <div className="mt-4 space-y-4">
          {isOnsite ? (
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Name <span className="text-red-500">*</span>
              </label>
              <input
                id="name"
                type="text"
                required
                value={responses.name ?? ""}
                onChange={(e) =>
                  setResponses((r) => ({ ...r, name: e.target.value }))
                }
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:ring-2 focus:ring-emerald-500/40 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
              />
            </div>
          ) : (
            bundle.fields.map((field) => (
              <div key={field.id}>
                <label
                  htmlFor={field.key}
                  className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                >
                  {field.label}
                  {field.required ? <span className="text-red-500"> *</span> : null}
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
            ))
          )}
        </div>
      </section>

      {hasAnyPricedItem ? (
        <div className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-white px-4 py-4 dark:border-zinc-800 dark:bg-zinc-900">
          {!isOnsite && (
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              <b>{f.e_transfer_email ? `${f.e_transfer_email}` : ""}</b>
              으로 e-transfer 부탁드립니다!
            </span>
          )}
     
          <span className="text-lg font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
            {formatMoney(totalCents)}
          </span>
        </div>
      ) : null}

      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/50 dark:text-red-200">
          {error}
        </p>
      ) : null}

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
