alter table public.orders
add column if not exists paid boolean not null default false;
