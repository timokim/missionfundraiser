import { OrdersReport } from "@/components/orders/orders-report";
import { db } from "@/lib/supabase/fundraiser-schema";
import { parsePublicOrderReport } from "@/lib/orders/report";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function PublicFundraiserOrdersPage({
  params,
}: {
  params: { publicId: string };
}) {
  const supabase = await createClient();
  const { data, error } = await db(supabase).rpc("get_public_fundraiser_orders", {
    p_public_id: params.publicId,
  });

  if (error || data == null) {
    notFound();
  }

  const report = parsePublicOrderReport(data);
  if (!report) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-10 dark:bg-zinc-950">
      <div className="mx-auto max-w-5xl">
        <OrdersReport
          fundraiserId={report.fundraiserId}
          fundraiserTitle={report.fundraiserTitle}
          fundraiserPublicId={report.fundraiserPublicId}
          itemColumns={report.itemColumns}
          fieldKeys={report.fieldKeys}
          rows={report.rows}
          backHref={`/f/${report.fundraiserPublicId}`}
          backLabel="← Back to fundraiser"
          editablePaid={false}
        />
      </div>
    </main>
  );
}
