export type FundraiserStatus = "draft" | "published" | "closed";

export type FormFieldType = "text" | "email" | "phone" | "textarea" | "select";

export type PublicFormState = "open" | "closed";

export interface Fundraiser {
  id: string;
  owner_id: string;
  title: string;
  public_id: string;
  status: FundraiserStatus;
  hero_image_url: string | null;
  description: string | null;
  e_transfer_email: string | null;
  closed_message: string;
  created_at: string;
  updated_at: string;
}

export interface FundraiserItem {
  id: string;
  fundraiser_id: string;
  sort_order: number;
  name: string;
  description: string | null;
  image_url: string | null;
  unit_label: string | null;
  quantity_cap: number | null;
  unit_price_cents: number | null;
  is_active: boolean;
  created_at: string;
}

export interface FundraiserFormField {
  id: string;
  fundraiser_id: string;
  sort_order: number;
  key: string;
  label: string;
  type: FormFieldType;
  options: string[] | null;
  required: boolean;
}

export interface FundraiserMemberRow {
  user_id: string;
  email: string;
}

export interface Order {
  id: string;
  fundraiser_id: string;
  responses: Record<string, string>;
  idempotency_key: string | null;
  total_cents: number | null;
  created_at: string;
}

export interface OrderLineItem {
  id: string;
  order_id: string;
  item_id: string;
  quantity: number;
}

export interface PublishedItemRow {
  id: string;
  sort_order: number;
  name: string;
  description: string;
  image_url: string | null;
  unit_label: string;
  quantity_cap: number | null;
  unit_price_cents: number | null;
  sold: number;
  remaining: number | null;
}

export interface PublishedFieldRow {
  id: string;
  sort_order: number;
  key: string;
  label: string;
  type: FormFieldType;
  options: string[] | null;
  required: boolean;
}

export interface PublishedFundraiserBundle {
  form_state: PublicFormState;
  closed_message: string;
  fundraiser: {
    id: string;
    title: string;
    public_id: string;
    e_transfer_email: string | null;
    hero_image_url: string | null;
    description: string;
  };
  items: PublishedItemRow[];
  fields: PublishedFieldRow[];
}
