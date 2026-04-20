import { db } from "@/lib/supabase/fundraiser-schema";
import { OrdersReport } from "@/components/orders/orders-report";
import type { OrderRow } from "@/lib/orders/report";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function FundraiserOrdersPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;
  const supabase = await createClient();

  const { data: fundraiser, error: fe } = await db(supabase)
    .from("fundraisers")
    .select("id, title, public_id")
    .eq("id", id)
    .single();

  if (fe || !fundraiser) notFound();

  const { data: orders } = await db(supabase)
    .from("orders")
    .select("id, created_at, responses, total_cents, paid")
    .eq("fundraiser_id", id)
    .order("created_at", { ascending: false });

  const { data: items } = await db(supabase)
    .from("fundraiser_items")
    .select("id, name, sort_order, unit_price_cents")
    .eq("fundraiser_id", id)
    .order("sort_order", { ascending: true });

  const { data: fields } = await db(supabase)
    .from("fundraiser_form_fields")
    .select("key, sort_order")
    .eq("fundraiser_id", id)
    .order("sort_order", { ascending: true });

  const orderIds = orders?.map((o) => o.id) ?? [];
  const { data: lines } =
    orderIds.length > 0
      ? await db(supabase)
          .from("order_line_items")
          .select("order_id, item_id, quantity")
          .in("order_id", orderIds)
      : { data: [] as { order_id: string; item_id: string; quantity: number }[] };

  const lineByOrder = new Map<string, Map<string, number>>();
  for (const line of lines ?? []) {
    if (!lineByOrder.has(line.order_id)) {
      lineByOrder.set(line.order_id, new Map());
    }
    lineByOrder.get(line.order_id)!.set(line.item_id, line.quantity);
  }

  const fieldKeys = fields?.map((f) => f.key) ?? [];
  const itemColumns = (items ?? []).map((i) => ({
    id: i.id,
    name: i.name,
    unit_price_cents: i.unit_price_cents,
  }));

  const rows: OrderRow[] = (orders ?? []).map((o) => ({
    id: o.id,
    created_at: o.created_at,
    total_cents: (o as { total_cents?: number | null }).total_cents ?? null,
    paid: Boolean((o as { paid?: boolean | null }).paid),
    responses: (o.responses as Record<string, string>) ?? {},
    lineQty: Object.fromEntries(lineByOrder.get(o.id) ?? []) as Record<
      string,
      number
    >,
  }));

  return (
    <OrdersReport
      fundraiserId={fundraiser.id}
      fundraiserTitle={fundraiser.title}
      fundraiserPublicId={fundraiser.public_id}
      itemColumns={itemColumns}
      fieldKeys={fieldKeys}
      rows={rows}
      backHref={`/admin/fundraisers/${fundraiser.id}`}
      backLabel="← Back to editor"
      orderDetailBasePath={`/admin/fundraisers/${fundraiser.id}/orders`}
      shareable
      editablePaid
    />
  );
}
