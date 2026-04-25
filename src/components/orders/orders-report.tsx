"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { OrderItemColumn, OrderRow } from "@/lib/orders/report";
import { PaidCell } from "./paid-cell";

function formatTotal(cents: number | null) {
  if (cents == null) return "";
  return (cents / 100).toFixed(2);
}

function formatCurrency(cents: number) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "CAD",
  }).format(cents / 100);
}

function formatOrderedItems(
  row: OrderRow,
  itemColumns: OrderItemColumn[]
) {
  return itemColumns
    .map((item) => {
      const quantity = Number(row.lineQty[item.id] ?? 0);
      if (quantity <= 0) return null;
      return `${item.name} x ${quantity}`;
    })
    .filter((value): value is string => Boolean(value))
    .join(", ");
}

function publicOrdersUrl(publicId: string) {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/f/${publicId}/orders`;
  }
  const base = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "";
  return base ? `${base}/f/${publicId}/orders` : `/f/${publicId}/orders`;
}

export function OrdersReport({
  fundraiserId,
  fundraiserTitle,
  fundraiserPublicId,
  itemColumns,
  fieldKeys,
  rows,
  backHref,
  backLabel,
  orderDetailBasePath,
  shareable,
  editablePaid,
}: {
  fundraiserId: string;
  fundraiserTitle: string;
  fundraiserPublicId: string;
  itemColumns: OrderItemColumn[];
  fieldKeys: string[];
  rows: OrderRow[];
  backHref?: string;
  backLabel?: string;
  orderDetailBasePath?: string;
  shareable?: boolean;
  editablePaid?: boolean;
}) {
  const [selectedItemId, setSelectedItemId] = useState("");
  const [selectedServiceNo, setSelectedServiceNo] = useState("");
  const [shareMessage, setShareMessage] = useState<string | null>(null);

  const serviceNoOptions = useMemo(() => {
    return Array.from(
      new Set(
        rows
          .map((row) => row.responses.service_no?.trim())
          .filter((value): value is string => Boolean(value))
      )
    ).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [rows]);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const matchesItem =
        !selectedItemId || Number(row.lineQty[selectedItemId] ?? 0) > 0;
      const matchesServiceNo =
        !selectedServiceNo || (row.responses.service_no?.trim() ?? "") === selectedServiceNo;
      return matchesItem && matchesServiceNo;
    });
  }, [rows, selectedItemId, selectedServiceNo]);

  const visibleItemColumns = useMemo(() => {
    if (!selectedItemId) return itemColumns;
    return itemColumns.filter((item) => item.id === selectedItemId);
  }, [itemColumns, selectedItemId]);

  const summaryRows = useMemo(() => {
    return visibleItemColumns.map((item) => {
      const quantity = filteredRows.reduce(
        (sum, row) => sum + Number(row.lineQty[item.id] ?? 0),
        0
      );
      const revenue = quantity * (item.unit_price_cents ?? 0);
      return {
        id: item.id,
        menu: item.name,
        quantity,
        revenue,
      };
    });
  }, [filteredRows, visibleItemColumns]);

  const summaryTotalRevenue = useMemo(() => {
    return summaryRows.reduce((sum, row) => sum + row.revenue, 0);
  }, [summaryRows]);

  const csv = useMemo(() => {
    const headers = [
      "submitted_at",
      "order_id",
      "total_cad",
      ...fieldKeys,
      "ordered_items",
      ...visibleItemColumns.map((c) => `item:${c.name}`),
    ];
    const escape = (value: string) => {
      if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
      return value;
    };
    const lines = [headers.map(escape).join(",")];
    for (const row of filteredRows) {
      const values = [
        row.created_at,
        row.id,
        formatTotal(row.total_cents),
        ...fieldKeys.map((key) => String(row.responses[key] ?? "")),
        formatOrderedItems(row, itemColumns),
        ...visibleItemColumns.map((item) => String(row.lineQty[item.id] ?? "")),
      ];
      lines.push(values.map(escape).join(","));
    }
    return lines.join("\n");
  }, [fieldKeys, filteredRows, itemColumns, visibleItemColumns]);

  function downloadCsv() {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orders-${fundraiserId.slice(0, 8)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function copyShareLink() {
    const url = publicOrdersUrl(fundraiserPublicId);
    try {
      await navigator.clipboard.writeText(url);
      setShareMessage("Share link copied.");
    } catch {
      setShareMessage(url);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          {backHref && backLabel ? (
            <Link
              href={backHref}
              className="text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
            >
              {backLabel}
            </Link>
          ) : null}
          <h1 className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            Orders — {fundraiserTitle}
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Spreadsheet-style view with filters and menu revenue totals.
          </p>
          {shareMessage ? (
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              {shareMessage}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {shareable ? (
            <button
              type="button"
              onClick={copyShareLink}
              className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              Copy share link
            </button>
          ) : null}
          <button
            type="button"
            onClick={downloadCsv}
            className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Download CSV
          </button>
        </div>
      </div>

      <div className="grid gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">
            Menu item
          </span>
          <select
            value={selectedItemId}
            onChange={(event) => setSelectedItemId(event.target.value)}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          >
            <option value="">All menu items</option>
            {itemColumns.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1 text-sm">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">
            Service no
          </span>
          <select
            value={selectedServiceNo}
            onChange={(event) => setSelectedServiceNo(event.target.value)}
            disabled={serviceNoOptions.length === 0}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          >
            <option value="">All service numbers</option>
            {serviceNoOptions.map((serviceNo) => (
              <option key={serviceNo} value={serviceNo}>
                {serviceNo}
              </option>
            ))}
          </select>
        </label>
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
                Paid
              </th>
              <th className="whitespace-nowrap px-3 py-2 font-medium text-zinc-700 dark:text-zinc-300">
                Total (CAD)
              </th>
              {fieldKeys.map((key) => (
                <th
                  key={key}
                  className="whitespace-nowrap px-3 py-2 font-medium text-zinc-700 dark:text-zinc-300"
                >
                  {key}
                </th>
              ))}
              <th className="whitespace-nowrap px-3 py-2 font-medium text-zinc-700 dark:text-zinc-300">
                Ordered items
              </th>
              {visibleItemColumns.map((item) => (
                <th
                  key={item.id}
                  className="whitespace-nowrap px-3 py-2 font-medium text-zinc-700 dark:text-zinc-300"
                >
                  {item.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {filteredRows.length === 0 ? (
              <tr>
                <td
                  colSpan={5 + fieldKeys.length + visibleItemColumns.length}
                  className="px-3 py-8 text-center text-zinc-500"
                >
                  No matching orders.
                </td>
              </tr>
            ) : (
              filteredRows.map((row) => (
                <tr
                  key={row.id}
                  className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40"
                >
                  <td className="whitespace-nowrap px-3 py-2 text-zinc-600 dark:text-zinc-400">
                    {new Date(row.created_at).toLocaleString()}
                  </td>
                  <td className="px-3 py-2">
                    {orderDetailBasePath ? (
                      <Link
                        href={`${orderDetailBasePath}/${row.id}`}
                        className="font-mono text-xs text-emerald-600 hover:underline dark:text-emerald-400"
                      >
                        {row.id.slice(0, 8)}…
                      </Link>
                    ) : (
                      <span className="font-mono text-xs text-zinc-600 dark:text-zinc-400">
                        {row.id.slice(0, 8)}…
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-zinc-800 dark:text-zinc-200">
                    <PaidCell
                      fundraiserId={fundraiserId}
                      orderId={row.id}
                      initialPaid={row.paid}
                      editable={Boolean(editablePaid)}
                    />
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 font-medium tabular-nums text-zinc-800 dark:text-zinc-200">
                    {row.total_cents != null ? `$${formatTotal(row.total_cents)}` : "—"}
                  </td>
                  {fieldKeys.map((key) => (
                    <td
                      key={key}
                      className="max-w-[200px] truncate px-3 py-2 text-zinc-800 dark:text-zinc-200"
                    >
                      {row.responses[key] ?? ""}
                    </td>
                  ))}
                  <td className="whitespace-nowrap px-3 py-2 text-zinc-800 dark:text-zinc-200">
                    {formatOrderedItems(row, itemColumns)}
                  </td>
                  {visibleItemColumns.map((item) => (
                    <td
                      key={item.id}
                      className="whitespace-nowrap px-3 py-2 text-zinc-800 dark:text-zinc-200"
                    >
                      {row.lineQty[item.id] ?? ""}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <table className="min-w-full divide-y divide-zinc-200 text-left text-sm dark:divide-zinc-800">
          <thead className="bg-zinc-50 dark:bg-zinc-800/50">
            <tr>
              <th className="px-3 py-2 font-medium text-zinc-700 dark:text-zinc-300">
                Menu
              </th>
              <th className="px-3 py-2 font-medium text-zinc-700 dark:text-zinc-300">
                Revenue
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {summaryRows.map((row) => (
              <tr key={row.id}>
                <td className="px-3 py-2 text-zinc-800 dark:text-zinc-200">
                  {row.menu} ({row.quantity} sold)
                </td>
                <td className="whitespace-nowrap px-3 py-2 font-medium tabular-nums text-zinc-800 dark:text-zinc-200">
                  {formatCurrency(row.revenue)}
                </td>
              </tr>
            ))}
            <tr className="bg-zinc-50 font-semibold dark:bg-zinc-800/50">
              <td className="px-3 py-2 text-zinc-900 dark:text-zinc-100">Total</td>
              <td className="whitespace-nowrap px-3 py-2 tabular-nums text-zinc-900 dark:text-zinc-100">
                {formatCurrency(summaryTotalRevenue)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
