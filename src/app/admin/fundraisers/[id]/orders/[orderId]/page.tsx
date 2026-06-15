import { db } from "@/lib/supabase/fundraiser-schema";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";
import Link from "next/link";
import { notFound } from "next/navigation";
import { OrderDetailActions } from "../order-detail-actions";

export const dynamic = "force-dynamic";

function formatMoney(cents: number) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "CAD",
  }).format(cents / 100);
}

const orderNavButtonClass =
  "rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800";

export default async function OrderDetailPage({
  params,
}: {
  params: { id: string; orderId: string };
}) {
  const { id: fundraiserId, orderId } = params;
  const supabase = await createClient();

  const { data: fundraiser } = await db(supabase)
    .from("fundraisers")
    .select("id, title")
    .eq("id", fundraiserId)
    .single();

  if (!fundraiser) notFound();

  const { data: order, error: oe } = await db(supabase)
    .from("orders")
    .select("id, created_at, responses, fundraiser_id, total_cents, paid")
    .eq("id", orderId)
    .single();

  if (oe || !order || order.fundraiser_id !== fundraiserId) notFound();

  const { data: orderSequence } = await db(supabase)
    .from("orders")
    .select("id")
    .eq("fundraiser_id", fundraiserId)
    .order("created_at", { ascending: false });

  const currentOrderIndex =
    orderSequence?.findIndex((row) => row.id === orderId) ?? -1;
  const previousOrderId =
    currentOrderIndex > 0 ? orderSequence?.[currentOrderIndex - 1]?.id : null;
  const nextOrderId =
    currentOrderIndex >= 0
      ? orderSequence?.[currentOrderIndex + 1]?.id ?? null
      : null;

  const { data: lines } = await db(supabase)
    .from("order_line_items")
    .select("item_id, quantity")
    .eq("order_id", orderId);

  const itemIds = Array.from(new Set((lines ?? []).map((l) => l.item_id)));
  const { data: itemRows } =
    itemIds.length > 0
      ? await db(supabase)
          .from("fundraiser_items")
          .select("id, name, unit_price_cents")
          .in("id", itemIds)
      : {
          data: [] as {
            id: string;
            name: string;
            unit_price_cents: number | null;
          }[],
        };

  const itemsById = new Map((itemRows ?? []).map((r) => [r.id, r]));
  const currentTotalCents = (lines ?? []).reduce((sum, row) => {
    const currentUnitPriceCents =
      itemsById.get(row.item_id)?.unit_price_cents ?? 0;

    return sum + row.quantity * currentUnitPriceCents;
  }, 0);

  const responses = (order.responses as Record<string, string>) ?? {};
  const totalCents = (order as { total_cents?: number | null }).total_cents;
  const paid = Boolean((order as { paid?: boolean | null }).paid);
  const currentTotalDifferenceCents =
    totalCents == null ? null : currentTotalCents - totalCents;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href={`/admin/fundraisers/${fundraiserId}/orders`}
        className="text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
      >
        ← All orders
      </Link>
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Order detail
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          {fundraiser.title}
        </p>
      </div>

      <OrderDetailActions
        fundraiserId={fundraiserId}
        orderId={orderId}
        initialPaid={paid}
      />

      <nav
        aria-label="Order navigation"
        className="flex items-center justify-between gap-3"
      >
        {previousOrderId ? (
          <Link
            href={`/admin/fundraisers/${fundraiserId}/orders/${previousOrderId}`}
            className={orderNavButtonClass}
          >
            ← Previous order
          </Link>
        ) : (
          <span className="rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-400 dark:border-zinc-800 dark:text-zinc-600">
            ← Previous order
          </span>
        )}
        {nextOrderId ? (
          <Link
            href={`/admin/fundraisers/${fundraiserId}/orders/${nextOrderId}`}
            className={orderNavButtonClass}
          >
            Next order →
          </Link>
        ) : (
          <span className="rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-400 dark:border-zinc-800 dark:text-zinc-600">
            Next order →
          </span>
        )}
      </nav>

      <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Meta
        </h2>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex gap-2">
            <dt className="w-28 shrink-0 text-zinc-500">Order ID</dt>
            <dd className="font-mono text-xs text-zinc-900 dark:text-zinc-100">
              {order.id}
            </dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-28 shrink-0 text-zinc-500">Submitted</dt>
            <dd className="text-zinc-800 dark:text-zinc-200">
              {formatDateTime(order.created_at)}
            </dd>
          </div>
          {totalCents != null && (
            <div className="flex gap-2">
              <dt className="w-28 shrink-0 text-zinc-500">Order total</dt>
              <dd className="font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                {formatMoney(totalCents)}
              </dd>
            </div>
          )}
          <div className="flex gap-2">
            <dt className="w-28 shrink-0 text-zinc-500">Paid</dt>
            <dd className="text-zinc-800 dark:text-zinc-200">
              {paid ? "Yes" : "No"}
            </dd>
          </div>
        </dl>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Form responses
        </h2>
        <ul className="mt-3 space-y-2 text-sm">
          {Object.keys(responses).length === 0 ? (
            <li className="text-zinc-500">No custom fields.</li>
          ) : (
            Object.entries(responses).map(([k, v]) => (
              <li key={k} className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
                <span className="w-40 shrink-0 font-medium text-zinc-700 dark:text-zinc-300">
                  {k}
                </span>
                <span className="whitespace-pre-wrap text-zinc-900 dark:text-zinc-100">
                  {v}
                </span>
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Line items
        </h2>
        <ul className="mt-3 divide-y divide-zinc-100 dark:divide-zinc-800">
          {(lines ?? []).length === 0 ? (
            <li className="py-2 text-zinc-500">No line items.</li>
          ) : (
            lines?.map((row) => {
              const item = itemsById.get(row.item_id);
              const currentUnitPriceCents = item?.unit_price_cents ?? 0;
              const currentLineTotalCents =
                row.quantity * currentUnitPriceCents;

              return (
                <li
                  key={row.item_id}
                  className="flex flex-col gap-2 py-3 text-sm sm:flex-row sm:items-start sm:justify-between"
                >
                  <div>
                    <p className="font-medium text-zinc-900 dark:text-zinc-100">
                      {item?.name ?? "Item"}
                    </p>
                    <p className="mt-1 text-zinc-500 dark:text-zinc-400">
                      Current unit price:{" "}
                      <span className="tabular-nums">
                        {item?.unit_price_cents == null
                          ? formatMoney(0)
                          : formatMoney(item.unit_price_cents)}
                      </span>
                    </p>
                  </div>
                  <div className="text-left tabular-nums sm:text-right">
                    <p className="text-zinc-600 dark:text-zinc-400">
                      × {row.quantity}
                    </p>
                    <p className="mt-1 font-semibold text-zinc-900 dark:text-zinc-100">
                      {formatMoney(currentLineTotalCents)}
                    </p>
                  </div>
                </li>
              );
            })
          )}
        </ul>
        {(lines ?? []).length > 0 ? (
          <div className="mt-4 border-t border-zinc-100 pt-4 text-sm dark:border-zinc-800">
            <div className="flex items-center justify-between gap-4">
              <span className="font-medium text-zinc-700 dark:text-zinc-300">
                Total using current prices
              </span>
              <span className="font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                {formatMoney(currentTotalCents)}
              </span>
            </div>
            {currentTotalDifferenceCents != null ? (
              <div className="mt-2 flex items-center justify-between gap-4 text-zinc-500 dark:text-zinc-400">
                <span>Difference from order total</span>
                <span className="tabular-nums">
                  {currentTotalDifferenceCents === 0
                    ? formatMoney(0)
                    : `${currentTotalDifferenceCents > 0 ? "+" : "-"}${formatMoney(
                        Math.abs(currentTotalDifferenceCents)
                      )}`}
                </span>
              </div>
            ) : null}
          </div>
        ) : null}
      </section>
    </div>
  );
}
