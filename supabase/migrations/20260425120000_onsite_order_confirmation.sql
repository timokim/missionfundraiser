alter table public.fundraisers
add column if not exists order_confirmation_message text not null default '';

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
  v_submission_mode text := coalesce(trim(p_responses->>'__submission_mode'), '');
  v_clean_responses jsonb := coalesce(p_responses, '{}'::jsonb) - '__submission_mode';
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

  if v_submission_mode = 'onsite' then
    if v_clean_responses->>'name' is null or length(trim(v_clean_responses->>'name')) = 0 then
      raise exception 'MISSING_FIELD:name' using errcode = 'P0001';
    end if;
  else
    for v_field in
      select ff.key, ff.required
      from public.fundraiser_form_fields ff
      where ff.fundraiser_id = v_fundraiser_id
    loop
      if v_field.required then
        if v_clean_responses->>v_field.key is null or length(trim(v_clean_responses->>v_field.key)) = 0 then
          raise exception 'MISSING_FIELD:%', v_field.key using errcode = 'P0001';
        end if;
      end if;
    end loop;
  end if;

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
    v_clean_responses,
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

create or replace function public.get_public_order_confirmation(
  p_public_id text,
  p_order_id uuid
)
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
  select id, title, public_id, order_confirmation_message
  into fr
  from public.fundraisers
  where public_id = p_public_id
    and status in ('published', 'closed');

  if not found then
    return null;
  end if;

  select jsonb_build_object(
    'fundraiser', jsonb_build_object(
      'id', fr.id,
      'title', fr.title,
      'public_id', fr.public_id,
      'order_confirmation_message', coalesce(fr.order_confirmation_message, '')
    ),
    'order', (
      select jsonb_build_object(
        'id', o.id,
        'created_at', o.created_at,
        'total_cents', coalesce(o.total_cents, 0),
        'responses', coalesce(o.responses, '{}'::jsonb),
        'line_items', coalesce((
          select jsonb_agg(
            jsonb_build_object(
              'item_id', fi.id,
              'name', fi.name,
              'unit_label', coalesce(fi.unit_label, ''),
              'unit_price_cents', fi.unit_price_cents,
              'quantity', oli.quantity,
              'line_total_cents', oli.quantity * coalesce(fi.unit_price_cents, 0)
            )
            order by fi.sort_order, fi.created_at
          )
          from public.order_line_items oli
          join public.fundraiser_items fi on fi.id = oli.item_id
          where oli.order_id = o.id
        ), '[]'::jsonb)
      )
      from public.orders o
      where o.id = p_order_id
        and o.fundraiser_id = fr.id
    )
  )
  into result;

  if result->'order' is null then
    return null;
  end if;

  return result;
end;
$$;

grant execute on function public.get_public_order_confirmation(text, uuid) to anon, authenticated;
