import { db } from "@/lib/supabase/fundraiser-schema";
import { createClient } from "@/lib/supabase/server";
// import Link from "next/link";
import { notFound } from "next/navigation";

function formatMoney(cents: number) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "CAD",
  }).format(cents / 100);
}

type ConfirmationPayload = {
  fundraiser: {
    id: string;
    title: string;
    public_id: string;
    order_confirmation_message: string;
  };
  order: {
    id: string;
    created_at: string;
    total_cents: number;
    responses: Record<string, string>;
    line_items: Array<{
      item_id: string;
      name: string;
      unit_label: string;
      unit_price_cents: number | null;
      quantity: number;
      line_total_cents: number;
    }>;
  };
};

export const dynamic = "force-dynamic";

export default async function PublicOrderConfirmationPage({
  params,
  // searchParams,
}: {
  params: { publicId: string; orderId: string };
  // searchParams?: { source?: string };
}) {
  const supabase = await createClient();
  const { data, error } = await db(supabase).rpc("get_public_order_confirmation", {
    p_public_id: params.publicId,
    p_order_id: params.orderId,
  });

  if (error || data == null) {
    notFound();
  }

  const payload = data as ConfirmationPayload;
  if (!payload.order) {
    notFound();
  }

  // const isOnsite = searchParams?.source === "onsite";
  const buyerName = payload.order.responses?.name?.trim();

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-10 dark:bg-zinc-950">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="rounded-3xl border border-emerald-200 bg-white p-8 shadow-sm dark:border-emerald-900/60 dark:bg-zinc-900">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-600">
            {payload.fundraiser.title}
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Order Confirmation
          </h1>
          {buyerName ? (
            <p className="mt-2 text-lg text-zinc-600 dark:text-zinc-300">
              {buyerName}
            </p>
          ) : null}
          <div className="mt-8 rounded-2xl bg-emerald-50 px-6 py-8 text-center dark:bg-emerald-950/30">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-700 dark:text-emerald-300">
              Total Price
            </p>
            <p className="mt-3 text-5xl font-semibold tabular-nums text-emerald-900 dark:text-emerald-100 sm:text-6xl">
              {formatMoney(payload.order.total_cents)}
            </p>
          </div>
        </header>

        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Order Summary
          </h2>
          <ul className="mt-4 divide-y divide-zinc-100 dark:divide-zinc-800">
            {payload.order.line_items.map((item) => (
              <li
                key={item.item_id}
                className="flex items-start justify-between gap-4 py-4"
              >
                <div>
                  <p className="font-medium text-zinc-900 dark:text-zinc-100">
                    {item.name}
                  </p>
                  <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                    {item.quantity}
                    {item.unit_label ? ` ${item.unit_label}` : ""}
                  </p>
                </div>
                <p className="text-right font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                  {formatMoney(item.line_total_cents)}
                </p>
              </li>
            ))}
          </ul>
        </section>

        {payload.fundraiser.order_confirmation_message?.trim() ? (
          <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              안내
            </h2>
            <p className="mt-3 whitespace-pre-wrap text-zinc-700 dark:text-zinc-300">
              {payload.fundraiser.order_confirmation_message}
            </p>
          </section>
        ) : null}

        {/* <div className="flex flex-wrap gap-3">
          <Link
            href={isOnsite ? `/f/${payload.fundraiser.public_id}/onsite` : `/f/${payload.fundraiser.public_id}`}
            className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500"
          >
            {isOnsite ? "새 현장주문으로 돌아가기" : "Back to fundraiser"}
          </Link>
        </div> */}
      </div>
    </main>
  );
}
