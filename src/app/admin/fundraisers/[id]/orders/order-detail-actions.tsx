"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteOrder, setOrderPaid } from "@/app/admin/fundraisers/actions";

export function OrderDetailActions({
  fundraiserId,
  orderId,
  initialPaid,
}: {
  fundraiserId: string;
  orderId: string;
  initialPaid: boolean;
}) {
  const router = useRouter();
  const [paid, setPaid] = useState(initialPaid);
  const [pending, startTransition] = useTransition();

  function onPaidChange(nextPaid: boolean) {
    setPaid(nextPaid);
    startTransition(async () => {
      try {
        await setOrderPaid(fundraiserId, orderId, nextPaid);
        router.refresh();
      } catch {
        setPaid(!nextPaid);
      }
    });
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <label className="inline-flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
        <input
          type="checkbox"
          checked={paid}
          disabled={pending}
          onChange={(event) => onPaidChange(event.target.checked)}
          className="h-4 w-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-950"
        />
        Paid
      </label>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!window.confirm("Delete this order? This cannot be undone.")) {
            return;
          }
          startTransition(async () => {
            await deleteOrder(fundraiserId, orderId);
          });
        }}
      >
        <button
          type="submit"
          className="rounded-lg border border-red-300 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/40"
          disabled={pending}
        >
          Remove order
        </button>
      </form>
    </div>
  );
}
