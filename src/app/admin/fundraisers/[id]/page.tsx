import { db } from "@/lib/supabase/fundraiser-schema";
import { createClient } from "@/lib/supabase/server";
import type { Fundraiser, FundraiserMemberRow } from "@/types/database";
import { notFound } from "next/navigation";
import { FundraiserEditor } from "./fundraiser-editor";

export const dynamic = "force-dynamic";

export default async function EditFundraiserPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: fundraiser, error: fe } = await db(supabase)
    .from("fundraisers")
    .select("*")
    .eq("id", id)
    .single();

  if (fe || !fundraiser) notFound();

  const fr = {
    ...fundraiser,
    closed_message:
      (fundraiser as { closed_message?: string }).closed_message ?? "",
  } as Fundraiser;

  const isOwner = user.id === fr.owner_id;

  const { data: membersJson, error: me } = await db(supabase).rpc(
    "list_fundraiser_members",
    { p_fundraiser_id: id }
  );
  let members: FundraiserMemberRow[] = [];
  if (!me && membersJson != null) {
    const raw = membersJson as unknown;
    if (Array.isArray(raw)) {
      members = raw as FundraiserMemberRow[];
    } else if (typeof raw === "string") {
      try {
        const p = JSON.parse(raw) as unknown;
        if (Array.isArray(p)) members = p as FundraiserMemberRow[];
      } catch {
        members = [];
      }
    }
  }

  const { data: items } = await db(supabase)
    .from("fundraiser_items")
    .select("*")
    .eq("fundraiser_id", id)
    .order("sort_order", { ascending: true });

  const { data: fields } = await db(supabase)
    .from("fundraiser_form_fields")
    .select("*")
    .eq("fundraiser_id", id)
    .order("sort_order", { ascending: true });

  const normalizedFields = (fields ?? []).map((f) => {
    let options: string[] | null = null;
    const o = f.options;
    if (Array.isArray(o)) options = o as string[];
    else if (typeof o === "string") {
      try {
        const p = JSON.parse(o) as unknown;
        if (Array.isArray(p)) options = p as string[];
      } catch {
        options = null;
      }
    }
    return { ...f, options };
  });

  return (
    <FundraiserEditor
      key={`${fr.id}-${fr.updated_at}`}
      userId={user.id}
      fundraiser={fr}
      items={items ?? []}
      fields={normalizedFields}
      isOwner={isOwner}
      members={members}
    />
  );
}
