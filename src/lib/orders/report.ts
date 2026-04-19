export type OrderRow = {
  id: string;
  created_at: string;
  total_cents: number | null;
  responses: Record<string, string>;
  lineQty: Record<string, number>;
};

export type OrderItemColumn = {
  id: string;
  name: string;
  unit_price_cents: number | null;
};

export type OrderReportData = {
  fundraiserId: string;
  fundraiserTitle: string;
  fundraiserPublicId: string;
  fieldKeys: string[];
  itemColumns: OrderItemColumn[];
  rows: OrderRow[];
};

type RawPublicOrderReport = {
  fundraiser?: {
    id?: string;
    title?: string;
    public_id?: string;
  };
  fields?: Array<{ key?: string }>;
  items?: Array<{
    id?: string;
    name?: string;
    unit_price_cents?: number | null;
  }>;
  rows?: Array<{
    id?: string;
    created_at?: string;
    total_cents?: number | null;
    responses?: Record<string, string> | null;
    line_qty?: Record<string, number> | null;
  }>;
};

export function parsePublicOrderReport(data: unknown): OrderReportData | null {
  if (!data || typeof data !== "object") return null;

  const raw = data as RawPublicOrderReport;
  const fundraiser = raw.fundraiser;
  if (
    !fundraiser?.id ||
    !fundraiser.title ||
    !fundraiser.public_id
  ) {
    return null;
  }

  return {
    fundraiserId: fundraiser.id,
    fundraiserTitle: fundraiser.title,
    fundraiserPublicId: fundraiser.public_id,
    fieldKeys: (raw.fields ?? [])
      .map((field) => field.key)
      .filter((key): key is string => typeof key === "string"),
    itemColumns: (raw.items ?? [])
      .filter(
        (item): item is { id: string; name: string; unit_price_cents?: number | null } =>
          typeof item.id === "string" && typeof item.name === "string"
      )
      .map((item) => ({
        id: item.id,
        name: item.name,
        unit_price_cents:
          typeof item.unit_price_cents === "number" ? item.unit_price_cents : null,
      })),
    rows: (raw.rows ?? [])
      .filter(
        (
          row
        ): row is {
          id: string;
          created_at: string;
          total_cents?: number | null;
          responses?: Record<string, string> | null;
          line_qty?: Record<string, number> | null;
        } => typeof row.id === "string" && typeof row.created_at === "string"
      )
      .map((row) => ({
        id: row.id,
        created_at: row.created_at,
        total_cents: typeof row.total_cents === "number" ? row.total_cents : null,
        responses: row.responses ?? {},
        lineQty: row.line_qty ?? {},
      })),
  };
}
