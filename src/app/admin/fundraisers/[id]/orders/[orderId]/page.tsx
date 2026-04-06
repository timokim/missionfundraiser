import { db } from "@/lib/supabase/fundraiser-schema";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

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
    .select("id, created_at, responses, fundraiser_id, total_cents")
    .eq("id", orderId)
    .single();

  if (oe || !order || order.fundraiser_id !== fundraiserId) notFound();

  const { data: lines } = await db(supabase)
    .from("order_line_items")
    .select("item_id, quantity")
    .eq("order_id", orderId);

  const itemIds = Array.from(new Set((lines ?? []).map((l) => l.item_id)));
  const { data: itemRows } =
    itemIds.length > 0
      ? await db(supabase)
          .from("fundraiser_items")
          .select("id, name")
          .in("id", itemIds)
      : { data: [] as { id: string; name: string }[] };

  const itemNames = new Map((itemRows ?? []).map((r) => [r.id, r.name]));

  const responses = (order.responses as Record<string, string>) ?? {};
  const totalCents = (order as { total_cents?: number | null }).total_cents;

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
              {new Date(order.created_at).toLocaleString()}
            </dd>
          </div>
          {totalCents != null && (
            <div className="flex gap-2">
              <dt className="w-28 shrink-0 text-zinc-500">Total</dt>
              <dd className="font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                {new Intl.NumberFormat(undefined, {
                  style: "currency",
                  currency: "CAD",
                }).format(totalCents / 100)}
              </dd>
            </div>
          )}
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
            lines?.map((row) => (
              <li
                key={row.item_id}
                className="flex justify-between py-2 text-sm"
              >
                <span className="text-zinc-900 dark:text-zinc-100">
                  {itemNames.get(row.item_id) ?? "Item"}
                </span>
                <span className="tabular-nums text-zinc-600 dark:text-zinc-400">
                  × {row.quantity}
                </span>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
