-- Application schema: ONLY `public` for tables, indexes, triggers, RLS, and app RPCs.
-- Email→user resolution for invites: see 20260404120002_public_auth_bridge.sql
-- File uploads: see 20260404120001_storage_fundraiser_assets.sql
--
-- Dashboard → Settings → API → Exposed schemas: include `public`.

create schema if not exists public;

grant usage on schema public to postgres, anon, authenticated, service_role;

-- fundraisers (owner_id = Supabase Auth user id; no cross-schema FK)
create table public.fundraisers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  title text not null,
  public_id text not null unique,
  status text not null,
  hero_image_url text,
  description text default '',
  e_transfer_email text default '',
  closed_message text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fundraisers_status_check check (status in ('draft', 'published', 'closed'))
);

create index fundraisers_owner_id_idx on public.fundraisers (owner_id);

create table public.fundraiser_items (
  id uuid primary key default gen_random_uuid(),
  fundraiser_id uuid not null references public.fundraisers (id) on delete cascade,
  sort_order int not null default 0,
  name text not null,
  description text default '',
  image_url text,
  unit_label text default '',
  quantity_cap int,
  unit_price_cents int,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index fundraiser_items_fundraiser_id_idx on public.fundraiser_items (fundraiser_id);

create table public.fundraiser_form_fields (
  id uuid primary key default gen_random_uuid(),
  fundraiser_id uuid not null references public.fundraisers (id) on delete cascade,
  sort_order int not null default 0,
  key text not null,
  label text not null,
  type text not null check (type in ('text', 'email', 'phone', 'textarea', 'select')),
  options jsonb,
  required boolean not null default false,
  unique (fundraiser_id, key)
);

create index fundraiser_form_fields_fundraiser_id_idx on public.fundraiser_form_fields (fundraiser_id);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  fundraiser_id uuid not null references public.fundraisers (id) on delete cascade,
  responses jsonb not null default '{}'::jsonb,
  idempotency_key text,
  total_cents int,
  created_at timestamptz not null default now()
);

create unique index orders_fundraiser_idempotency_idx
  on public.orders (fundraiser_id, idempotency_key)
  where idempotency_key is not null;

create index orders_fundraiser_id_idx on public.orders (fundraiser_id);

create table public.order_line_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  item_id uuid not null references public.fundraiser_items (id),
  quantity int not null check (quantity > 0),
  unique (order_id, item_id)
);

create index order_line_items_order_id_idx on public.order_line_items (order_id);
create index order_line_items_item_id_idx on public.order_line_items (item_id);

create table public.fundraiser_members (
  fundraiser_id uuid not null references public.fundraisers (id) on delete cascade,
  user_id uuid not null,
  member_email text not null default '',
  created_at timestamptz not null default now(),
  primary key (fundraiser_id, user_id)
);

create index fundraiser_members_user_id_idx on public.fundraiser_members (user_id);

grant select, insert, update, delete on all tables in schema public to anon, authenticated;
grant all on all tables in schema public to postgres, service_role;

create or replace function public.set_updated_at()
returns trigger language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger fundraisers_updated_at
  before update on public.fundraisers
  for each row execute function public.set_updated_at();

create or replace function public.fundraisers_prevent_owner_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.owner_id is distinct from old.owner_id then
    raise exception 'OWNER_IMMUTABLE' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger fundraisers_owner_immutable
  before update on public.fundraisers
  for each row execute function public.fundraisers_prevent_owner_change();

create or replace function public.submit_order(
  p_public_id text,
  p_responses jsonb,
  p_line_items jsonb,
  p_idempotency_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fundraiser_id uuid;
  v_order_id uuid;
  elem jsonb;
  v_item_id uuid;
  v_qty int;
  v_cap int;
  v_sold int;
  v_field record;
  v_line_count int;
  v_price int;
  v_total int := 0;
  v_existing_total int;
begin
  if p_public_id is null or length(trim(p_public_id)) = 0 then
    raise exception 'FUNDRAISER_NOT_FOUND' using errcode = 'P0001';
  end if;

  select f.id into v_fundraiser_id
  from public.fundraisers f
  where f.public_id = p_public_id and f.status = 'published';

  if v_fundraiser_id is null then
    raise exception 'FUNDRAISER_NOT_FOUND' using errcode = 'P0001';
  end if;

  if p_idempotency_key is not null and length(trim(p_idempotency_key)) > 0 then
    select o.id, o.total_cents into v_order_id, v_existing_total
    from public.orders o
    where o.fundraiser_id = v_fundraiser_id and o.idempotency_key = p_idempotency_key;
    if v_order_id is not null then
      return jsonb_build_object(
        'order_id', v_order_id,
        'total_cents', coalesce(v_existing_total, 0)
      );
    end if;
  end if;

  select count(*)::int into v_line_count from jsonb_array_elements(coalesce(p_line_items, '[]'::jsonb)) t;
  if v_line_count = 0 then
    raise exception 'EMPTY_ORDER' using errcode = 'P0001';
  end if;

  perform pg_advisory_xact_lock(hashtext(v_fundraiser_id::text)::bigint);

  for v_field in
    select ff.key, ff.required
    from public.fundraiser_form_fields ff
    where ff.fundraiser_id = v_fundraiser_id
  loop
    if v_field.required then
      if p_responses->>v_field.key is null or length(trim(p_responses->>v_field.key)) = 0 then
        raise exception 'MISSING_FIELD:%', v_field.key using errcode = 'P0001';
      end if;
    end if;
  end loop;

  for elem in select * from jsonb_array_elements(coalesce(p_line_items, '[]'::jsonb))
  loop
    v_item_id := (elem->>'item_id')::uuid;
    v_qty := coalesce((elem->>'quantity')::int, 0);
    if v_qty <= 0 then
      raise exception 'INVALID_QUANTITY' using errcode = 'P0001';
    end if;

    select fi.quantity_cap, fi.unit_price_cents into v_cap, v_price
    from public.fundraiser_items fi
    where fi.id = v_item_id
      and fi.fundraiser_id = v_fundraiser_id
      and fi.is_active = true;

    if not found then
      raise exception 'INVALID_ITEM' using errcode = 'P0001';
    end if;

    v_total := v_total + (v_qty * coalesce(v_price, 0));

    if v_cap is not null then
      select coalesce(sum(oli.quantity), 0)::int into v_sold
      from public.order_line_items oli
      join public.orders o on o.id = oli.order_id
      where oli.item_id = v_item_id;

      if v_sold + v_qty > v_cap then
        raise exception 'INSUFFICIENT_STOCK' using errcode = 'P0001';
      end if;
    end if;
  end loop;

  insert into public.orders (fundraiser_id, responses, idempotency_key, total_cents)
  values (
    v_fundraiser_id,
    coalesce(p_responses, '{}'::jsonb),
    nullif(trim(p_idempotency_key), ''),
    v_total
  )
  returning id into v_order_id;

  insert into public.order_line_items (order_id, item_id, quantity)
  select
    v_order_id,
    (e->>'item_id')::uuid,
    (e->>'quantity')::int
  from jsonb_array_elements(p_line_items) as e;

  return jsonb_build_object('order_id', v_order_id, 'total_cents', v_total);
end;
$$;

grant execute on function public.submit_order(text, jsonb, jsonb, text) to anon, authenticated;

create or replace function public.get_published_fundraiser(p_public_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  fr record;
  result jsonb;
begin
  select id, title, public_id, hero_image_url, description, status, closed_message, e_transfer_email
  into fr
  from public.fundraisers
  where public_id = p_public_id and status in ('published', 'closed');

  if not found then
    return null;
  end if;

  if fr.status = 'closed' then
    return jsonb_build_object(
      'form_state', 'closed',
      'fundraiser', jsonb_build_object(
        'id', fr.id,
        'title', fr.title,
        'public_id', fr.public_id,
        'hero_image_url', fr.hero_image_url,
        'description', coalesce(fr.description, ''),
        'e_transfer_email', fr.e_transfer_email
      ),
      'closed_message', coalesce(fr.closed_message, ''),
      'items', '[]'::jsonb,
      'fields', '[]'::jsonb
    );
  end if;

  with sold as (
    select oli.item_id, coalesce(sum(oli.quantity), 0)::int as qty
    from public.order_line_items oli
    join public.orders o on o.id = oli.order_id
    where o.fundraiser_id = fr.id
    group by oli.item_id
  )
  select jsonb_build_object(
    'form_state', 'open',
    'closed_message', '',
    'fundraiser', jsonb_build_object(
      'id', fr.id,
      'title', fr.title,
      'public_id', fr.public_id,
      'hero_image_url', fr.hero_image_url,
      'description', coalesce(fr.description, ''),
      'e_transfer_email', fr.e_transfer_email
    ),
    'items', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', fi.id,
          'sort_order', fi.sort_order,
          'name', fi.name,
          'description', fi.description,
          'image_url', fi.image_url,
          'unit_label', fi.unit_label,
          'quantity_cap', fi.quantity_cap,
          'unit_price_cents', fi.unit_price_cents,
          'sold', coalesce(s.qty, 0),
          'remaining', case
            when fi.quantity_cap is null then null
            else greatest(0, fi.quantity_cap - coalesce(s.qty, 0))
          end
        )
        order by fi.sort_order, fi.created_at
      )
      from public.fundraiser_items fi
      left join sold s on s.item_id = fi.id
      where fi.fundraiser_id = fr.id and fi.is_active = true
    ), '[]'::jsonb),
    'fields', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', ff.id,
          'sort_order', ff.sort_order,
          'key', ff.key,
          'label', ff.label,
          'type', ff.type,
          'options', ff.options,
          'required', ff.required
        )
        order by ff.sort_order, ff.id
      )
      from public.fundraiser_form_fields ff
      where ff.fundraiser_id = fr.id
    ), '[]'::jsonb)
  ) into result;

  return result;
end;
$$;

grant execute on function public.get_published_fundraiser(text) to anon, authenticated;

create or replace function public.list_fundraiser_members(p_fundraiser_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  ok boolean;
begin
  select exists (
    select 1 from public.fundraisers f
    where f.id = p_fundraiser_id
    and (
      f.owner_id = (select auth.uid())
      or exists (
        select 1 from public.fundraiser_members m
        where m.fundraiser_id = f.id and m.user_id = (select auth.uid())
      )
    )
  ) into ok;

  if not ok then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;

  return coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'user_id', m.user_id,
          'email', coalesce(nullif(trim(m.member_email), ''), m.user_id::text)
        )
        order by m.member_email, m.user_id
      )
      from public.fundraiser_members m
      where m.fundraiser_id = p_fundraiser_id
    ),
    '[]'::jsonb
  );
end;
$$;

grant execute on function public.list_fundraiser_members(uuid) to authenticated;

create or replace function public.remove_fundraiser_member(
  p_fundraiser_id uuid,
  p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.fundraisers f
    where f.id = p_fundraiser_id and f.owner_id = (select auth.uid())
  ) then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;

  delete from public.fundraiser_members
  where fundraiser_id = p_fundraiser_id and user_id = p_user_id;
end;
$$;

grant execute on function public.remove_fundraiser_member(uuid, uuid) to authenticated;


create or replace function public.is_member_of_fundraiser(p_fundraiser_id uuid)
returns boolean
language sql
security definer -- Critical: bypasses RLS
set search_path = public
as $$
  select exists (
    select 1 from public.fundraiser_members
    where fundraiser_id = p_fundraiser_id 
    and user_id = (select auth.uid())
  );
$$;

grant execute on function public.is_member_of_fundraiser(uuid) to authenticated;

alter table public.fundraisers enable row level security;
alter table public.fundraiser_items enable row level security;
alter table public.fundraiser_form_fields enable row level security;
alter table public.orders enable row level security;
alter table public.order_line_items enable row level security;
alter table public.fundraiser_members enable row level security;

create policy "fundraisers_select_collab"
  on public.fundraisers
  for select
  to authenticated
  using (
    owner_id = auth.uid() 
    or is_member_of_fundraiser(id)
  );


create policy "fundraisers_insert_owner"
  on public.fundraisers
  for insert
  to authenticated
  with check (owner_id = (select auth.uid()));

create policy "fundraisers_update_owner_or_member"
  on public.fundraisers
  for update
  to authenticated
  using (
    owner_id = (select auth.uid())
    or exists (
      select 1 from public.fundraiser_members m
      where m.fundraiser_id = id and m.user_id = (select auth.uid())
    )
  )
  with check (true);

create policy "fundraisers_delete_owner"
  on public.fundraisers
  for delete
  to authenticated
  using (owner_id = (select auth.uid()));

-- 2. Policy for Owners (Checks the 'fundraisers' table)
CREATE POLICY "fundraiser_members_select_owner"
  ON public.fundraiser_members
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.fundraisers
      WHERE id = fundraiser_members.fundraiser_id 
      AND owner_id = auth.uid()
    )
  );

-- 3. Policy for Members (Checks the user's own ID directly)
-- This eliminates the subquery entirely for members
CREATE POLICY "fundraiser_members_select_self"
  ON public.fundraiser_members
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
  );

create policy "fundraiser_members_insert_owner"
  on public.fundraiser_members
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.fundraisers f
      where f.id = fundraiser_id and f.owner_id = (select auth.uid())
    )
  );

create policy "fundraiser_members_delete_owner"
  on public.fundraiser_members
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.fundraisers f
      where f.id = fundraiser_members.fundraiser_id and f.owner_id = (select auth.uid())
    )
  );

create policy "fundraiser_items_all_collab"
  on public.fundraiser_items
  for all
  to authenticated
  using (
    exists (
      select 1 from public.fundraisers f
      where f.id = fundraiser_id
      and (
        f.owner_id = (select auth.uid())
        or exists (
          select 1 from public.fundraiser_members m
          where m.fundraiser_id = f.id and m.user_id = (select auth.uid())
        )
      )
    )
  )
  with check (
    exists (
      select 1 from public.fundraisers f
      where f.id = fundraiser_id
      and (
        f.owner_id = (select auth.uid())
        or exists (
          select 1 from public.fundraiser_members m
          where m.fundraiser_id = f.id and m.user_id = (select auth.uid())
        )
      )
    )
  );

create policy "fundraiser_form_fields_all_collab"
  on public.fundraiser_form_fields
  for all
  to authenticated
  using (
    exists (
      select 1 from public.fundraisers f
      where f.id = fundraiser_id
      and (
        f.owner_id = (select auth.uid())
        or exists (
          select 1 from public.fundraiser_members m
          where m.fundraiser_id = f.id and m.user_id = (select auth.uid())
        )
      )
    )
  )
  with check (
    exists (
      select 1 from public.fundraisers f
      where f.id = fundraiser_id
      and (
        f.owner_id = (select auth.uid())
        or exists (
          select 1 from public.fundraiser_members m
          where m.fundraiser_id = f.id and m.user_id = (select auth.uid())
        )
      )
    )
  );

create policy "orders_select_collab"
  on public.orders
  for select
  to authenticated
  using (
    exists (
      select 1 from public.fundraisers f
      where f.id = fundraiser_id
      and (
        f.owner_id = (select auth.uid())
        or exists (
          select 1 from public.fundraiser_members m
          where m.fundraiser_id = f.id and m.user_id = (select auth.uid())
        )
      )
    )
  );

create policy "orders_delete_collab"
  on public.orders
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.fundraisers f
      where f.id = fundraiser_id
      and (
        f.owner_id = (select auth.uid())
        or exists (
          select 1 from public.fundraiser_members m
          where m.fundraiser_id = f.id and m.user_id = (select auth.uid())
        )
      )
    )
  );

create policy "order_line_items_select_collab"
  on public.order_line_items
  for select
  to authenticated
  using (
    exists (
      select 1 from public.orders o
      join public.fundraisers f on f.id = o.fundraiser_id
      where o.id = order_id
      and (
        f.owner_id = (select auth.uid())
        or exists (
          select 1 from public.fundraiser_members m
          where m.fundraiser_id = f.id and m.user_id = (select auth.uid())
        )
      )
    )
  );

create policy "order_line_items_delete_collab"
  on public.order_line_items
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.orders o
      join public.fundraisers f on f.id = o.fundraiser_id
      where o.id = order_id
      and (
        f.owner_id = (select auth.uid())
        or exists (
          select 1 from public.fundraiser_members m
          where m.fundraiser_id = f.id and m.user_id = (select auth.uid())
        )
      )
    )
  );
