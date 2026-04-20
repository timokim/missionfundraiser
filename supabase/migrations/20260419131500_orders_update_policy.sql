create policy "orders_update_collab"
  on public.orders
  for update
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
