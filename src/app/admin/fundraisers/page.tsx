import { db } from "@/lib/supabase/fundraiser-schema";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createFundraiser } from "./actions";

export const dynamic = "force-dynamic";

type FundraiserRow = {
  id: string;
  title: string;
  status: string;
  public_id: string;
  updated_at: string;
};

export default async function FundraisersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: owned, error: ownedErr } = await db(supabase)
    .from("fundraisers")
    .select("id, title, status, public_id, updated_at")
    .eq("owner_id", user.id);

  const { data: memberRows } = await db(supabase)
    .from("fundraiser_members")
    .select("fundraiser_id")
    .eq("user_id", user.id);

  const sharedIds = Array.from(
    new Set((memberRows ?? []).map((r) => r.fundraiser_id))
  );

  const { data: shared } =
    sharedIds.length > 0
      ? await db(supabase)
          .from("fundraisers")
          .select("id, title, status, public_id, updated_at")
          .in("id", sharedIds)
      : { data: [] as FundraiserRow[] };

  if (ownedErr) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
        <p className="font-medium">Could not load fundraisers.</p>
        <p className="mt-2 text-red-700 dark:text-red-300">
          {ownedErr.message}
        </p>
        <p className="mt-3 text-xs text-red-600/90 dark:text-red-400/90">
          Confirm <code className="rounded bg-red-100 px-1 dark:bg-red-900/50">.env.local</code> has the correct URL and anon key, run migrations, and in the Supabase dashboard add schema{" "}
          <code className="rounded bg-red-100 px-1 dark:bg-red-900/50">fundraiser_app</code>{" "}
          under Settings → API → Exposed schemas.
        </p>
      </div>
    );
  }

  const byId = new Map<string, FundraiserRow>();
  (owned ?? []).forEach((f) => byId.set(f.id, f as FundraiserRow));
  (shared ?? []).forEach((f) => byId.set(f.id, f as FundraiserRow));

  const fundraisers = Array.from(byId.values()).sort(
    (a, b) =>
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );

  const ownedIds = new Set((owned ?? []).map((o) => o.id));

  const orderCounts: Record<string, number> = {};
  if (fundraisers.length) {
    const ids = fundraisers.map((f) => f.id);
    const { data: orderRows } = await db(supabase)
      .from("orders")
      .select("fundraiser_id")
      .in("fundraiser_id", ids);
    orderRows?.forEach((r) => {
      orderCounts[r.fundraiser_id] = (orderCounts[r.fundraiser_id] ?? 0) + 1;
    });
  }

  function statusBadge(status: string) {
    if (status === "published") {
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300";
    }
    if (status === "on_site") {
      return "bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200";
    }
    if (status === "closed") {
      return "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200";
    }
    return "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400";
  }

  function statusLabel(status: string) {
    if (status === "published") return "Published";
    if (status === "on_site") return "On-site";
    if (status === "closed") return "Closed";
    if (status === "draft") return "Draft";
    return status;
  }

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Your fundraisers
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Create a form, publish, and share the link. Collaborators can open
            shared fundraisers you are added to.
          </p>
        </div>
        <form action={createFundraiser}>
          <button
            type="submit"
            className="rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
          >
            New fundraiser
          </button>
        </form>
      </div>

      <ul className="mt-10 space-y-3">
        {fundraisers.length === 0 && (
          <li className="rounded-xl border border-dashed border-zinc-300 bg-white p-10 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900/50">
            No fundraisers yet. Create one to get started.
          </li>
        )}
        {fundraisers.map((f) => {
          const count = orderCounts[f.id] ?? 0;
          const isSharedWithMe = !ownedIds.has(f.id);

          return (
            <li key={f.id}>
              <Link
                href={`/admin/fundraisers/${f.id}`}
                className="flex flex-col gap-1 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:border-zinc-300 hover:shadow dark:border-zinc-800 dark:bg-zinc-900 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">
                    {f.title}
                  </span>
                  {isSharedWithMe && (
                    <span className="ml-2 text-xs text-zinc-500">(shared)</span>
                  )}
                  <span
                    className={`ml-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge(f.status)}`}
                  >
                    {statusLabel(f.status)}
                  </span>
                  <p className="mt-1 text-xs text-zinc-500">
                    {count} order{count === 1 ? "" : "s"}
                  </p>
                </div>
                <span className="text-sm text-emerald-600 dark:text-emerald-400">
                  Open →
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
