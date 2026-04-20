"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setOrderPaid } from "@/app/admin/fundraisers/actions";

export function PaidCell({
  fundraiserId,
  orderId,
  initialPaid,
  editable,
}: {
  fundraiserId: string;
  orderId: string;
  initialPaid: boolean;
  editable: boolean;
}) {
  const router = useRouter();
  const [paid, setPaid] = useState(initialPaid);
  const [pending, startTransition] = useTransition();

  if (!editable) {
    return (
      <span className="inline-flex h-5 w-5 items-center justify-center rounded border border-zinc-300 text-sm text-zinc-700 dark:border-zinc-700 dark:text-zinc-300">
        {paid ? "✓" : ""}
      </span>
    );
  }

  return (
    <input
      type="checkbox"
      checked={paid}
      disabled={pending}
      onChange={(event) => {
        const nextPaid = event.target.checked;
        setPaid(nextPaid);
        startTransition(async () => {
          try {
            await setOrderPaid(fundraiserId, orderId, nextPaid);
            router.refresh();
          } catch {
            setPaid(!nextPaid);
          }
        });
      }}
      className="h-4 w-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-950"
      aria-label={paid ? "Mark order as unpaid" : "Mark order as paid"}
    />
  );
}
