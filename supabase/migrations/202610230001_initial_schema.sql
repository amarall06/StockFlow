-- LIBER automotive: esquema inicial para dados fictícios.
-- Esta migração é um rascunho local e ainda não foi aplicada a um banco.

create table public.locations (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (length(trim(code)) > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  code text not null unique
    check (code ~ '^[A-Z]{3}-(100|[1-9][0-9]?)$'),
  application text not null,
  pieces_per_box smallint not null default 2 check (pieces_per_box > 0),
  default_location_id uuid references public.locations(id) on delete set null,
  image_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- A lista evita grafias diferentes para a mesma situação.
create table public.stock_statuses (
  code text primary key,
  label text not null unique,
  is_available_for_sale boolean not null default false
);

insert into public.stock_statuses (code, label, is_available_for_sale) values
  ('awaiting_test', 'Aguardando testagem', false),
  ('released_for_sale', 'Liberado para venda', true);

-- Permite contabilizar caixas fechadas ou peças soltas, sem definir ainda
-- como tratar uma caixa cujas peças estejam em situações diferentes.
create table public.stock_balances (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id),
  location_id uuid not null references public.locations(id),
  status_code text not null references public.stock_statuses(code),
  unit_type text not null check (unit_type in ('box', 'piece')),
  quantity integer not null check (quantity > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, location_id, status_code, unit_type)
);

-- O provedor de login mantém as senhas; esta tabela guarda apenas o perfil.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.movement_types (
  code text primary key,
  label text not null unique
);

-- Começamos pelos eventos conhecidos; reparo e garantia serão adicionados
-- depois que o fluxo real estiver confirmado.
insert into public.movement_types (code, label) values
  ('receipt', 'Recebimento'),
  ('transfer', 'Transferência'),
  ('testing', 'Testagem'),
  ('inventory_adjustment', 'Ajuste de inventário');

create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id),
  movement_type text not null references public.movement_types(code),
  unit_type text not null check (unit_type in ('box', 'piece')),
  quantity integer not null check (quantity > 0),
  status_before text references public.stock_statuses(code),
  status_after text references public.stock_statuses(code),
  from_location_id uuid references public.locations(id),
  to_location_id uuid references public.locations(id),
  performed_by uuid references auth.users(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  check (
    from_location_id is null
    or to_location_id is null
    or from_location_id <> to_location_id
  )
);

-- Bloqueio inicial: sem políticas explícitas, a API não libera acesso às tabelas.
-- As políticas serão criadas depois que os perfis e permissões forem definidos.
alter table public.locations enable row level security;
alter table public.products enable row level security;
alter table public.stock_statuses enable row level security;
alter table public.stock_balances enable row level security;
alter table public.profiles enable row level security;
alter table public.movement_types enable row level security;
alter table public.stock_movements enable row level security;
