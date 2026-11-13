-- SOMENTE PostgreSQL descartável. Substitutos mínimos de Auth/Storage para testar SQL.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin;
create schema realtime;
create table realtime.messages(topic text, extension text, private boolean);
alter table realtime.messages enable row level security;
create function realtime.topic() returns text language sql as $$ select null::text $$;
create function realtime.send(jsonb,text,text,boolean) returns void language sql as $$ select $$;
create schema auth;
create table auth.users(id uuid primary key, email text, raw_user_meta_data jsonb default '{}'::jsonb);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid
$$;
grant usage on schema auth to authenticated;
grant execute on function auth.uid() to authenticated;
alter default privileges in schema public grant select,insert,update,delete on tables to authenticated;
create schema storage;
create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
alter table storage.objects enable row level security;
