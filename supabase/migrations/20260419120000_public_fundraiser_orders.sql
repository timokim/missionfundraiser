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
    and status in ('published', 'closed');

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
