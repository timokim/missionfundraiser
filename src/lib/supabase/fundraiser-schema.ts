import type { SupabaseClient } from "@supabase/supabase-js";

/** App tables, RLS, and RPCs live in this schema (not `public`). */
export const FUNDRAISER_APP_SCHEMA = "public" as const;

/** Use for all `.from()` / `.rpc()` calls except `storage`. */
export function db(client: SupabaseClient) {
  return client.schema(FUNDRAISER_APP_SCHEMA);
}
