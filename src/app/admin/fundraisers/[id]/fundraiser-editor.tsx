"use client";

import { createClient } from "@/lib/supabase/client";
import type {
  Fundraiser,
  FundraiserFormField,
  FundraiserItem,
  FundraiserMemberRow,
  FormFieldType,
} from "@/types/database";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  addFormField,
  addItem,
  deleteFormField,
  moveItem,
  deleteItem,
  updateFormField,
  updateFundraiser,
  updateItem,
} from "../actions";
import { FundraiserCollaborators } from "./fundraiser-collaborators";

function centsToDollarInput(cents: number | null) {
  if (cents == null) return "";
  return (cents / 100).toFixed(2);
}

function parseDollarsToCents(raw: string): number | null | "invalid" {
  const t = raw.trim();
  if (t === "") return null;
  const cleaned = t.replace(/[$,\s]/g, "");
  const n = Number.parseFloat(cleaned);
  if (Number.isNaN(n) || n < 0) return "invalid";
  return Math.round(n * 100);
}

function publicFormUrl(publicId: string) {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/f/${publicId}`;
  }
  const base = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "";
  return base ? `${base}/f/${publicId}` : `/f/${publicId}`;
}

function onsiteFormUrl(publicId: string) {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/f/${publicId}/onsite`;
  }
  const base = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "";
  return base ? `${base}/f/${publicId}/onsite` : `/f/${publicId}/onsite`;
}

export function FundraiserEditor({
  userId,
  fundraiser: initial,
  items: initialItems,
  fields: initialFields,
  isOwner,
  members,
}: {
  userId: string;
  fundraiser: Fundraiser;
  items: FundraiserItem[];
  fields: FundraiserFormField[];
  isOwner: boolean;
  members: FundraiserMemberRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description ?? "");
  const [eTransferEmail, setETransferEmail] = useState(initial.e_transfer_email ?? "");
  const [status, setStatus] = useState(initial.status);
  const [closedMessage, setClosedMessage] = useState(
    initial.closed_message ?? ""
  );
  const [orderConfirmationMessage, setOrderConfirmationMessage] = useState(
    initial.order_confirmation_message ?? ""
  );

  const sortedItems = useMemo(
    () => [...initialItems].sort((a, b) => a.sort_order - b.sort_order),
    [initialItems]
  );
  const sortedFields = useMemo(
    () => [...initialFields].sort((a, b) => a.sort_order - b.sort_order),
    [initialFields]
  );

  function runAction(fn: () => Promise<void>) {
    setMsg(null);
    startTransition(async () => {
      try {
        await fn();
        router.refresh();
      } catch (e) {
        setMsg(e instanceof Error ? e.message : "Something went wrong");
      }
    });
  }

  async function onUploadHero(file: File) {
    const path = `${userId}/${initial.id}/hero-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const supabase = createClient();
    const { error: upErr } = await supabase.storage
      .from("fundraiser-assets")
      .upload(path, file, { upsert: true });
    if (upErr) throw upErr;
    const {
      data: { publicUrl },
    } = supabase.storage.from("fundraiser-assets").getPublicUrl(path);
    await updateFundraiser(initial.id, { hero_image_url: publicUrl });
    router.refresh();
  }

  async function onUploadItemImage(itemId: string, file: File) {
    const path = `${userId}/${initial.id}/item-${itemId}-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const supabase = createClient();
    const { error: upErr } = await supabase.storage
      .from("fundraiser-assets")
      .upload(path, file, { upsert: true });
    if (upErr) throw upErr;
    const {
      data: { publicUrl },
    } = supabase.storage.from("fundraiser-assets").getPublicUrl(path);
    await updateItem(itemId, initial.id, { image_url: publicUrl });
    router.refresh();
  }

  async function copyLink() {
    const url = publicFormUrl(initial.public_id);
    try {
      await navigator.clipboard.writeText(url);
      setMsg("Link copied to clipboard.");
    } catch {
      setMsg(url);
    }
  }

  async function copyOnsiteLink() {
    const url = onsiteFormUrl(initial.public_id);
    try {
      await navigator.clipboard.writeText(url);
      setMsg("On-site link copied to clipboard.");
    } catch {
      setMsg(url);
    }
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href="/admin/fundraisers"
            className="text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
          >
            ← All fundraisers
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <Link
              href={`/admin/fundraisers/${initial.id}/orders`}
              className="text-sm font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
            >
              View orders →
            </Link>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => copyLink()}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Copy public link
          </button>
          <button
            type="button"
            onClick={() => copyOnsiteLink()}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Copy 현장주문 link
          </button>
        </div>
      </div>

      {msg && (
        <p className="rounded-lg bg-zinc-100 px-3 py-2 text-sm text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
          {msg}
        </p>
      )}

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Basics
        </h2>
        <div className="mt-4 space-y-4">
          <div>
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Title
            </label>
            <input
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => {
                if (title !== initial.title) {
                  runAction(() => updateFundraiser(initial.id, { title }));
                }
              }}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Description (shown at top of the public form)
            </label>
            <textarea
              rows={4}
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={() => {
                if (description !== (initial.description ?? "")) {
                  runAction(() =>
                    updateFundraiser(initial.id, { description })
                  );
                }
              }}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              E-transfer email
            </label>
            <input
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
              value={eTransferEmail}
              onChange={(e) => setETransferEmail(e.target.value)}
              onBlur={() => {
                if (eTransferEmail !== initial.e_transfer_email) {
                  runAction(() => 
                    updateFundraiser(initial.id, { e_transfer_email: eTransferEmail })
                  );
                }
              }}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Hero image
            </label>
            {initial.hero_image_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={initial.hero_image_url}
                alt=""
                className="mt-2 max-h-48 w-full max-w-md rounded-lg object-cover"
              />
            )}
            <input
              type="file"
              accept="image/*"
              className="mt-2 block text-sm text-zinc-600"
              disabled={pending}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f)
                  runAction(async () => {
                    await onUploadHero(f);
                  });
                e.target.value = "";
              }}
            />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 sm:shrink-0">
              Status
            </label>
            <select
              value={status}
              disabled={pending}
              onChange={(e) => {
                const v = e.target.value as "draft" | "published" | "closed";
                setStatus(v);
                runAction(() => updateFundraiser(initial.id, { status: v }));
              }}
              className="w-full max-w-md rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
            >
              <option value="draft">Draft (not public)</option>
              <option value="published">Published (accepting orders)</option>
              <option value="closed">Closed (read-only public page)</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Message when closed (shown on public link)
            </label>
            <textarea
              rows={3}
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
              placeholder="e.g. Thank you — we are no longer taking orders for this fundraiser."
              value={closedMessage}
              onChange={(e) => setClosedMessage(e.target.value)}
              onBlur={() => {
                if (closedMessage !== (initial.closed_message ?? "")) {
                  runAction(() =>
                    updateFundraiser(initial.id, {
                      closed_message: closedMessage,
                    })
                  );
                }
              }}
            />
            <p className="mt-1 text-xs text-zinc-500">
              Visitors still see your title, hero, and description; ordering is
              disabled while status is Closed.
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Order confirmation text
            </label>
            <textarea
              rows={4}
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
              placeholder="Shown on the confirmation page after someone submits an order."
              value={orderConfirmationMessage}
              onChange={(e) => setOrderConfirmationMessage(e.target.value)}
              onBlur={() => {
                if (
                  orderConfirmationMessage !==
                  (initial.order_confirmation_message ?? "")
                ) {
                  runAction(() =>
                    updateFundraiser(initial.id, {
                      order_confirmation_message: orderConfirmationMessage,
                    })
                  );
                }
              }}
            />
          </div>
        </div>
      </section>

      <FundraiserCollaborators
        fundraiserId={initial.id}
        isOwner={isOwner}
        members={members}
      />

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Items
          </h2>
          <button
            type="button"
            disabled={pending}
            onClick={() => runAction(() => addItem(initial.id))}
            className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            Add item
          </button>
        </div>
        <p className="mt-1 text-sm text-zinc-500">
          Leave quantity cap empty for unlimited. Inactive items stay on old
          orders but hide from new submissions.
        </p>
        <ul className="mt-6 space-y-6">
          {sortedItems.map((item) => (
            <li
              key={item.id}
              className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-700"
            >
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-600"
                  disabled={pending}
                  onClick={() =>
                    runAction(() => moveItem(item.id, initial.id, "up"))
                  }
                >
                  Up
                </button>
                <button
                  type="button"
                  className="rounded border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-600"
                  disabled={pending}
                  onClick={() =>
                    runAction(() => moveItem(item.id, initial.id, "down"))
                  }
                >
                  Down
                </button>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-medium text-zinc-600">Name</label>
                  <input
                    defaultValue={item.name}
                    key={item.name + item.id}
                    className="mt-0.5 w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-950"
                    onBlur={(e) => {
                      if (e.target.value !== item.name)
                        runAction(() =>
                          updateItem(item.id, initial.id, {
                            name: e.target.value,
                          })
                        );
                    }}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-zinc-600">
                    Unit label
                  </label>
                  <input
                    defaultValue={item.unit_label ?? ""}
                    key={(item.unit_label ?? "") + item.id}
                    placeholder="e.g. box"
                    className="mt-0.5 w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-950"
                    onBlur={(e) => {
                      const v = e.target.value || null;
                      if (v !== (item.unit_label ?? ""))
                        runAction(() =>
                          updateItem(item.id, initial.id, { unit_label: v })
                        );
                    }}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-zinc-600">
                    Description
                  </label>
                  <textarea
                    defaultValue={item.description ?? ""}
                    key={(item.description ?? "") + item.id}
                    rows={2}
                    className="mt-0.5 w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-950"
                    onBlur={(e) => {
                      const v = e.target.value || null;
                      if (v !== (item.description ?? ""))
                        runAction(() =>
                          updateItem(item.id, initial.id, { description: v })
                        );
                    }}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-zinc-600">
                    Quantity cap (blank = unlimited)
                  </label>
                  <input
                    type="number"
                    min={0}
                    defaultValue={item.quantity_cap ?? ""}
                    key={String(item.quantity_cap) + item.id}
                    className="mt-0.5 w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-950"
                    onBlur={(e) => {
                      const raw = e.target.value;
                      const cap =
                        raw === "" ? null : Math.max(0, parseInt(raw, 10));
                      if (
                        (cap ?? null) !== (item.quantity_cap ?? null) &&
                        !(raw !== "" && Number.isNaN(cap as number))
                      )
                        runAction(() =>
                          updateItem(item.id, initial.id, {
                            quantity_cap: cap,
                          })
                        );
                    }}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-zinc-600">
                    Price (CAD, optional)
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00"
                    defaultValue={centsToDollarInput(item.unit_price_cents)}
                    key={`${item.id}-price-${item.unit_price_cents}`}
                    className="mt-0.5 w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-sm tabular-nums dark:border-zinc-600 dark:bg-zinc-950"
                    onBlur={(e) => {
                      const parsed = parseDollarsToCents(e.target.value);
                      if (parsed === "invalid") return;
                      if (parsed !== (item.unit_price_cents ?? null))
                        runAction(() =>
                          updateItem(item.id, initial.id, {
                            unit_price_cents: parsed,
                          })
                        );
                    }}
                  />
                </div>
                <div className="flex items-center gap-2 sm:col-span-2">
                  <input
                    id={`active-${item.id}`}
                    type="checkbox"
                    defaultChecked={item.is_active}
                    onChange={(e) =>
                      runAction(() =>
                        updateItem(item.id, initial.id, {
                          is_active: e.target.checked,
                        })
                      )
                    }
                  />
                  <label
                    htmlFor={`active-${item.id}`}
                    className="text-sm text-zinc-700 dark:text-zinc-300"
                  >
                    Active on public form
                  </label>
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-zinc-600">
                    Item image
                  </label>
                  {item.image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.image_url}
                      alt=""
                      className="mt-1 max-h-32 rounded-lg object-cover"
                    />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="mt-1 block text-sm"
                    disabled={pending}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f)
                        runAction(async () => {
                          await onUploadItemImage(item.id, f);
                        });
                      e.target.value = "";
                    }}
                  />
                </div>
                <div className="sm:col-span-2">
                  <button
                    type="button"
                    className="text-xs text-red-600"
                    disabled={pending}
                    onClick={() =>
                      runAction(() => deleteItem(item.id, initial.id))
                    }
                  >
                    Remove Menu Item
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Order form fields
          </h2>
          <button
            type="button"
            disabled={pending}
            onClick={() => runAction(() => addFormField(initial.id))}
            className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            Add field
          </button>
        </div>
        <ul className="mt-6 space-y-4">
          {sortedFields.map((field) => (
            <li
              key={field.id}
              className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-700"
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-medium text-zinc-600">
                    Label
                  </label>
                  <input
                    defaultValue={field.label}
                    className="mt-0.5 w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-950"
                    onBlur={(e) => {
                      if (e.target.value !== field.label)
                        runAction(() =>
                          updateFormField(field.id, initial.id, {
                            label: e.target.value,
                          })
                        );
                    }}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-zinc-600">
                    Key (CSV column)
                  </label>
                  <input
                    defaultValue={field.key}
                    className="mt-0.5 w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-950"
                    onBlur={(e) => {
                      if (e.target.value !== field.key)
                        runAction(() =>
                          updateFormField(field.id, initial.id, {
                            key: e.target.value.replace(/\s+/g, "_"),
                          })
                        );
                    }}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-zinc-600">
                    Type
                  </label>
                  <select
                    defaultValue={field.type}
                    className="mt-0.5 w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-950"
                    onChange={(e) =>
                      runAction(() =>
                        updateFormField(field.id, initial.id, {
                          type: e.target.value as FormFieldType,
                        })
                      )
                    }
                  >
                    <option value="text">Text</option>
                    <option value="email">Email</option>
                    <option value="phone">Phone</option>
                    <option value="textarea">Paragraph</option>
                    <option value="select">Dropdown</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id={`req-${field.id}`}
                    type="checkbox"
                    defaultChecked={field.required}
                    onChange={(e) =>
                      runAction(() =>
                        updateFormField(field.id, initial.id, {
                          required: e.target.checked,
                        })
                      )
                    }
                  />
                  <label htmlFor={`req-${field.id}`} className="text-sm">
                    Required
                  </label>
                </div>
                {field.type === "select" && (
                  <div className="sm:col-span-2">
                    <label className="text-xs font-medium text-zinc-600">
                      Options (one per line)
                    </label>
                    <textarea
                      rows={3}
                      defaultValue={(field.options ?? []).join("\n")}
                      className="mt-0.5 w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-950"
                      onBlur={(e) => {
                        const opts = e.target.value
                          .split("\n")
                          .map((s) => s.trim())
                          .filter(Boolean);
                        const prev = field.options ?? [];
                        if (opts.join("\n") !== prev.join("\n"))
                          runAction(() =>
                            updateFormField(field.id, initial.id, {
                              options: opts.length ? opts : null,
                            })
                          );
                      }}
                    />
                  </div>
                )}
                <div className="sm:col-span-2">
                  <button
                    type="button"
                    className="text-xs text-red-600"
                    disabled={pending}
                    onClick={() =>
                      runAction(() => deleteFormField(field.id, initial.id))
                    }
                  >
                    Remove field
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
