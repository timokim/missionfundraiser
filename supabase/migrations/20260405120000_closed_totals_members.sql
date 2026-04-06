-- Superseded: closed state, totals, members, collab RLS, and RPCs now live in
-- 20260404120000_initial_schema.sql under schema `fundraiser_app`.
-- Kept as a no-op so migration ordering stays stable for repos that already
-- applied an older version of this file against `public`.
select 1;
