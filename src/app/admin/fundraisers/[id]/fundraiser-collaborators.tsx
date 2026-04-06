"use client";

import { db } from "@/lib/supabase/fundraiser-schema";
import { createClient } from "@/lib/supabase/client";
import type { FundraiserMemberRow } from "@/types/database";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function FundraiserCollaborators({
  fundraiserId,
  isOwner,
  members,
}: {
  fundraiserId: string;
  isOwner: boolean;
  members: FundraiserMemberRow[];
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    const supabase = createClient();
    const { error } = await db(supabase).rpc("add_fundraiser_member_by_email", {
      p_fundraiser_id: fundraiserId,
      p_email: email.trim(),
    });
    setBusy(false);
    if (error) {
      const m = error.message || "";
      if (m.includes("USER_NOT_FOUND")) {
        setErr("No account with that email. They must sign up once before you can add them.");
      } else if (m.includes("OWNER_ALREADY")) {
        setErr("That person already owns this fundraiser.");
      } else {
        setErr(m || "Could not add collaborator.");
      }
      return;
    }
    setEmail("");
    router.refresh();
  }

  async function onRemove(userId: string) {
    setErr(null);
    setBusy(true);
    const supabase = createClient();
    const { error } = await db(supabase).rpc("remove_fundraiser_member", {
      p_fundraiser_id: fundraiserId,
      p_user_id: userId,
    });
    setBusy(false);
    if (error) {
      setErr(error.message || "Could not remove.");
      return;
    }
    router.refresh();
  }

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        Collaborators
      </h2>
      <p className="mt-1 text-sm text-zinc-500">
        {isOwner
          ? "Invite other admins by email (they need an account here first). They can edit items, fields, and view orders."
          : "Others who can manage this fundraiser."}
      </p>

      {isOwner && (
        <form onSubmit={onAdd} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <label
              htmlFor="collab-email"
              className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Email address
            </label>
            <input
              id="collab-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="teammate@example.com"
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </div>
          <button
            type="submit"
            disabled={busy || !email.trim()}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
          >
            Add
          </button>
        </form>
      )}

      {err && (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400">{err}</p>
      )}

      <ul className="mt-4 divide-y divide-zinc-100 dark:divide-zinc-800">
        {members.length === 0 ? (
          <li className="py-3 text-sm text-zinc-500">
            {isOwner ? "No collaborators yet." : "No other collaborators listed."}
          </li>
        ) : (
          members.map((m) => (
            <li
              key={m.user_id}
              className="flex items-center justify-between gap-2 py-3 text-sm"
            >
              <span className="truncate text-zinc-800 dark:text-zinc-200">
                {m.email}
              </span>
              {isOwner && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onRemove(m.user_id)}
                  className="shrink-0 text-xs text-red-600 hover:underline disabled:opacity-50 dark:text-red-400"
                >
                  Remove
                </button>
              )}
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
