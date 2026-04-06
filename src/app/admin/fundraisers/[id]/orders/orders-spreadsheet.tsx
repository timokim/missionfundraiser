"use client";

import Link from "next/link";
import { useMemo } from "react";

export type OrderRow = {
  id: string;
  created_at: string;
  total_cents: number | null;
  responses: Record<string, string>;
  lineQty: Record<string, number>;
};

function formatTotal(cents: number | null) {
  if (cents == null) return "";
  return (cents / 100).toFixed(2);
}

export function OrdersSpreadsheet({
  fundraiserId,
  fundraiserTitle,
  itemColumns,
  fieldKeys,
  rows,
}: {
  fundraiserId: string;
  fundraiserTitle: string;
  itemColumns: { id: string; name: string }[];
  fieldKeys: string[];
  rows: OrderRow[];
}) {
  const csv = useMemo(() => {
    const headers = [
      "submitted_at",
      "order_id",
      "total_cad",
      ...fieldKeys,
      ...itemColumns.map((c) => `item:${c.name}`),
    ];
    const escape = (v: string) => {
      if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
      return v;
    };
    const lines = [headers.map(escape).join(",")];
    for (const r of rows) {
      const vals = [
        r.created_at,
        r.id,
        formatTotal(r.total_cents),
        ...fieldKeys.map((k) => String(r.responses[k] ?? "")),
        ...itemColumns.map((c) => String(r.lineQty[c.id] ?? "")),
      ];
      lines.push(vals.map(escape).join(","));
    }
    return lines.join("\n");
  }, [rows, fieldKeys, itemColumns]);

  function downloadCsv() {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orders-${fundraiserId.slice(0, 8)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href={`/admin/fundraisers/${fundraiserId}`}
            className="text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
          >
            ← Back to editor
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            Orders — {fundraiserTitle}
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Spreadsheet-style view. Open a row for full detail.
          </p>
        </div>
        <button
          type="button"
          onClick={downloadCsv}
          className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          Download CSV
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <table className="min-w-full divide-y divide-zinc-200 text-left text-sm dark:divide-zinc-800">
          <thead className="bg-zinc-50 dark:bg-zinc-800/50">
            <tr>
              <th className="whitespace-nowrap px-3 py-2 font-medium text-zinc-700 dark:text-zinc-300">
                Submitted
              </th>
              <th className="whitespace-nowrap px-3 py-2 font-medium text-zinc-700 dark:text-zinc-300">
                Order
              </th>
              <th className="whitespace-nowrap px-3 py-2 font-medium text-zinc-700 dark:text-zinc-300">
                Total (CAD)
              </th>
              {fieldKeys.map((k) => (
                <th
                  key={k}
                  className="whitespace-nowrap px-3 py-2 font-medium text-zinc-700 dark:text-zinc-300"
                >
                  {k}
                </th>
              ))}
              {itemColumns.map((c) => (
                <th
                  key={c.id}
                  className="whitespace-nowrap px-3 py-2 font-medium text-zinc-700 dark:text-zinc-300"
                >
                  {c.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={3 + fieldKeys.length + itemColumns.length}
                  className="px-3 py-8 text-center text-zinc-500"
                >
                  No orders yet.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40">
                  <td className="whitespace-nowrap px-3 py-2 text-zinc-600 dark:text-zinc-400">
                    {new Date(r.created_at).toLocaleString()}
                  </td>
                  <td className="px-3 py-2">
                    <Link
                      href={`/admin/fundraisers/${fundraiserId}/orders/${r.id}`}
                      className="font-mono text-xs text-emerald-600 hover:underline dark:text-emerald-400"
                    >
                      {r.id.slice(0, 8)}…
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 font-medium tabular-nums text-zinc-800 dark:text-zinc-200">
                    {r.total_cents != null ? `$${formatTotal(r.total_cents)}` : "—"}
                  </td>
                  {fieldKeys.map((k) => (
                    <td key={k} className="max-w-[200px] truncate px-3 py-2 text-zinc-800 dark:text-zinc-200">
                      {r.responses[k] ?? ""}
                    </td>
                  ))}
                  {itemColumns.map((c) => (
                    <td
                      key={c.id}
                      className="whitespace-nowrap px-3 py-2 text-zinc-800 dark:text-zinc-200"
                    >
                      {r.lineQty[c.id] ?? ""}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
