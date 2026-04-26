import { db } from "@/lib/supabase/fundraiser-schema";
import { createClient } from "@/lib/supabase/server";
import type { PublishedFundraiserBundle } from "@/types/database";
import { notFound } from "next/navigation";
import { PublicOrderForm } from "./public-order-form";

export const dynamic = "force-dynamic";

export default async function PublicFundraiserPage({
  params,
}: {
  params: { publicId: string };
}) {
  const supabase = await createClient();
  const { data, error } = await db(supabase).rpc("get_published_fundraiser", {
    p_public_id: params.publicId,
    p_mode: "default",
  });

  if (error || data == null) {
    notFound();
  }

  const raw = data as Record<string, unknown>;
  const bundle: PublishedFundraiserBundle = {
    form_state:
      raw.form_state === "closed" || raw.form_state === "open"
        ? raw.form_state
        : "open",
    closed_message: String(raw.closed_message ?? ""),
    fundraiser: raw.fundraiser as PublishedFundraiserBundle["fundraiser"],
    items: (raw.items as PublishedFundraiserBundle["items"]) ?? [],
    fields: (raw.fields as PublishedFundraiserBundle["fields"]) ?? [],
  };

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-10 dark:bg-zinc-950">
      <div className="mx-auto max-w-3xl">
        <PublicOrderForm bundle={bundle} />
      </div>
    </main>
  );
}
