"use server";

import { db } from "@/lib/supabase/fundraiser-schema";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";
import { redirect } from "next/navigation";
import type { FormFieldType } from "@/types/database";

function slugKey(label: string) {
  const s = label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 80);
  return s || "field";
}

export async function createFundraiser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  const public_id = nanoid(24);
  const { data, error } = await db(supabase)
    .from("fundraisers")
    .insert({
      owner_id: user.id,
      title: "Untitled fundraiser",
      public_id,
      status: "draft",
      description: "",
    })
    .select("id")
    .single();
  if (error) throw error;
  revalidatePath("/admin/fundraisers");
  redirect(`/admin/fundraisers/${data.id}`);
}

export async function updateFundraiser(
  id: string,
  patch: {
    title?: string;
    description?: string | null;
    e_transfer_email?: string | null;
    status?: "draft" | "published" | "closed";
    closed_message?: string;
    order_confirmation_message?: string;
    hero_image_url?: string | null;
  }
) {
  const supabase = await createClient();
  const { error } = await db(supabase).from("fundraisers").update(patch).eq("id", id);
  if (error) throw error;
  revalidatePath("/admin/fundraisers");
  revalidatePath(`/admin/fundraisers/${id}`);
}

export async function addItem(fundraiserId: string) {
  const supabase = await createClient();
  const { data: max } = await db(supabase)
    .from("fundraiser_items")
    .select("sort_order")
    .eq("fundraiser_id", fundraiserId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextOrder = (max?.sort_order ?? -1) + 1;
  const { error } = await db(supabase).from("fundraiser_items").insert({
    fundraiser_id: fundraiserId,
    sort_order: nextOrder,
    name: "New item",
    description: "",
    is_active: true,
  });
  if (error) throw error;
  revalidatePath(`/admin/fundraisers/${fundraiserId}`);
}

export async function updateItem(
  id: string,
  fundraiserId: string,
  patch: Record<string, unknown>
) {
  const supabase = await createClient();
  const { error } = await db(supabase)
    .from("fundraiser_items")
    .update(patch)
    .eq("id", id);
  if (error) throw error;
  revalidatePath(`/admin/fundraisers/${fundraiserId}`);
}

export async function moveItem(
  id: string,
  fundraiserId: string,
  direction: "up" | "down"
) {
  const supabase = await createClient();
  const { data: items } = await db(supabase)
    .from("fundraiser_items")
    .select("id, sort_order")
    .eq("fundraiser_id", fundraiserId)
    .order("sort_order", { ascending: true });
  if (!items?.length) return;
  const idx = items.findIndex((i) => i.id === id);
  if (idx < 0) return;
  const swapWith = direction === "up" ? idx - 1 : idx + 1;
  if (swapWith < 0 || swapWith >= items.length) return;
  const a = items[idx];
  const b = items[swapWith];
  await db(supabase)
    .from("fundraiser_items")
    .update({ sort_order: b.sort_order })
    .eq("id", a.id);
  await db(supabase)
    .from("fundraiser_items")
    .update({ sort_order: a.sort_order })
    .eq("id", b.id);
  revalidatePath(`/admin/fundraisers/${fundraiserId}`);
}

export async function deleteItem(id: string, fundraiserId: string) {
  const supabase = await createClient();
  const { error } = await db(supabase)
    .from("fundraiser_items")
    .delete()
    .eq("id", id);
  if (error) throw error;
  revalidatePath(`/admin/fundraisers/${fundraiserId}`);
}


export async function addFormField(fundraiserId: string) {
  const supabase = await createClient();
  const { data: max } = await db(supabase)
    .from("fundraiser_form_fields")
    .select("sort_order")
    .eq("fundraiser_id", fundraiserId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextOrder = (max?.sort_order ?? -1) + 1;
  const label = "New question";
  const key = slugKey(label);
  const { data: existing } = await db(supabase)
    .from("fundraiser_form_fields")
    .select("key")
    .eq("fundraiser_id", fundraiserId);
  const keys = new Set(existing?.map((e) => e.key) ?? []);
  let k = key;
  let n = 0;
  while (keys.has(k)) {
    n += 1;
    k = `${key}_${n}`;
  }
  const { error } = await db(supabase).from("fundraiser_form_fields").insert({
    fundraiser_id: fundraiserId,
    sort_order: nextOrder,
    key: k,
    label,
    type: "text",
    required: false,
  });
  if (error) throw error;
  revalidatePath(`/admin/fundraisers/${fundraiserId}`);
}

export async function updateFormField(
  id: string,
  fundraiserId: string,
  patch: {
    label?: string;
    key?: string;
    type?: FormFieldType;
    options?: string[] | null;
    required?: boolean;
    sort_order?: number;
  }
) {
  const supabase = await createClient();
  const { error } = await db(supabase)
    .from("fundraiser_form_fields")
    .update(patch)
    .eq("id", id);
  if (error) throw error;
  revalidatePath(`/admin/fundraisers/${fundraiserId}`);
}

export async function deleteFormField(id: string, fundraiserId: string) {
  const supabase = await createClient();
  const { error } = await db(supabase)
    .from("fundraiser_form_fields")
    .delete()
    .eq("id", id);
  if (error) throw error;
  revalidatePath(`/admin/fundraisers/${fundraiserId}`);
}

export async function setOrderPaid(
  fundraiserId: string,
  orderId: string,
  paid: boolean
) {
  const supabase = await createClient();
  const { error } = await db(supabase)
    .from("orders")
    .update({ paid })
    .eq("id", orderId)
    .eq("fundraiser_id", fundraiserId);
  if (error) throw error;
  revalidatePath(`/admin/fundraisers/${fundraiserId}/orders`);
  revalidatePath(`/admin/fundraisers/${fundraiserId}/orders/${orderId}`);

  const { data: fundraiser } = await db(supabase)
    .from("fundraisers")
    .select("public_id")
    .eq("id", fundraiserId)
    .maybeSingle();
  if (fundraiser?.public_id) {
    revalidatePath(`/f/${fundraiser.public_id}/orders`);
  }
}

export async function deleteOrder(fundraiserId: string, orderId: string) {
  const supabase = await createClient();

  const { data: fundraiser } = await db(supabase)
    .from("fundraisers")
    .select("public_id")
    .eq("id", fundraiserId)
    .single();

  const { error } = await db(supabase)
    .from("orders")
    .delete()
    .eq("id", orderId)
    .eq("fundraiser_id", fundraiserId);
  if (error) throw error;

  revalidatePath(`/admin/fundraisers/${fundraiserId}/orders`);
  revalidatePath(`/admin/fundraisers/${fundraiserId}`);
  if (fundraiser?.public_id) {
    revalidatePath(`/f/${fundraiser.public_id}/orders`);
  }
  redirect(`/admin/fundraisers/${fundraiserId}/orders`);
}
