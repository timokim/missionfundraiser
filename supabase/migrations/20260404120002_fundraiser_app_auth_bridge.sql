-- Bridge: resolve Supabase Auth users when inviting collaborators.
-- Reads `auth.users` only here; all persisted collaborator data stays in `public`.

create or replace function public.add_fundraiser_member_by_email(
  p_fundraiser_id uuid,
  p_email text
)
returns void
language plpgsql
security definer
set search_path = public, auth, public
as $$
declare
  v_owner uuid;
  v_uid uuid;
  v_email text;
  v_norm text;
begin
  if not exists (
    select 1 from public.fundraisers f
    where f.id = p_fundraiser_id and f.owner_id = (select auth.uid())
  ) then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;

  v_norm := lower(trim(p_email));
  if length(v_norm) = 0 then
    raise exception 'INVALID_EMAIL' using errcode = 'P0001';
  end if;

  select owner_id into v_owner from public.fundraisers where id = p_fundraiser_id;

  select u.id, u.email into v_uid, v_email
  from auth.users u
  where lower(u.email) = v_norm
  limit 1;

  if v_uid is null then
    raise exception 'USER_NOT_FOUND' using errcode = 'P0001';
  end if;

  if v_uid = v_owner then
    raise exception 'OWNER_ALREADY_HAS_ACCESS' using errcode = 'P0001';
  end if;

  insert into public.fundraiser_members (fundraiser_id, user_id, member_email)
  values (p_fundraiser_id, v_uid, coalesce(v_email, ''))
  on conflict (fundraiser_id, user_id) do update
  set member_email = excluded.member_email;
end;
$$;

grant execute on function public.add_fundraiser_member_by_email(uuid, text) to authenticated;
