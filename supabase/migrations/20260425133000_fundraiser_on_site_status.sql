alter table public.fundraisers
drop constraint if exists fundraisers_status_check;

alter table public.fundraisers
add constraint fundraisers_status_check
check (status in ('draft', 'published', 'on_site', 'closed'));

drop function if exists public.get_published_fundraiser(text);

create or replace function public.get_published_fundraiser(
  p_public_id text,
  p_mode text default 'default'
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
  v_is_onsite boolean := coalesce(trim(p_mode), '') = 'onsite';
  v_form_state text;
begin
  select id, title, public_id, hero_image_url, description, status, closed_message, e_transfer_email
  into fr
  from public.fundraisers
  where public_id = p_public_id
    and status in ('published', 'on_site', 'closed');

  if not found then
    return null;
  end if;

  if fr.status = 'closed' then
    v_form_state := 'closed';
  elsif fr.status = 'on_site' and not v_is_onsite then
    v_form_state := 'closed';
  else
    v_form_state := 'open';
  end if;

  if v_form_state = 'closed' then
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

grant execute on function public.get_published_fundraiser(text, text) to anon, authenticated;

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
  where f.public_id = p_public_id
    and (
      (v_submission_mode = 'onsite' and f.status in ('published', 'on_site'))
      or (v_submission_mode <> 'onsite' and f.status = 'published')
    );

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

create or replace function public.get_public_fundraiser_orders(p_public_id text)
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
  select id, title, public_id
  into fr
  from public.fundraisers
  where public_id = p_public_id
    and status in ('published', 'on_site', 'closed');

  if not found then
    return null;
  end if;

  select jsonb_build_object(
    'fundraiser', jsonb_build_object(
      'id', fr.id,
      'title', fr.title,
      'public_id', fr.public_id
    ),
    'fields', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'key', ff.key
        )
        order by ff.sort_order, ff.id
      )
      from public.fundraiser_form_fields ff
      where ff.fundraiser_id = fr.id
    ), '[]'::jsonb),
    'items', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', fi.id,
          'name', fi.name,
          'unit_price_cents', fi.unit_price_cents
        )
        order by fi.sort_order, fi.created_at
      )
      from public.fundraiser_items fi
      where fi.fundraiser_id = fr.id
    ), '[]'::jsonb),
    'rows', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', o.id,
          'created_at', o.created_at,
          'total_cents', o.total_cents,
          'paid', o.paid,
          'responses', coalesce(o.responses, '{}'::jsonb),
          'line_qty', coalesce((
            select jsonb_object_agg(oli.item_id::text, oli.quantity)
            from public.order_line_items oli
            where oli.order_id = o.id
          ), '{}'::jsonb)
        )
        order by o.created_at desc
      )
      from public.orders o
      where o.fundraiser_id = fr.id
    ), '[]'::jsonb)
  )
  into result;

  return result;
end;
$$;

grant execute on function public.get_public_fundraiser_orders(text) to anon, authenticated;

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
    and status in ('published', 'on_site', 'closed');

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
