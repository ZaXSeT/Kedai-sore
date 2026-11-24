-- Kedai Sore · skema awal
-- Schema privat "kedai": tidak diekspos Data API Supabase, hanya diakses fungsi server.

create schema if not exists kedai;

create table kedai.products (
	id text primary key check (id ~ '^[a-z0-9-]{1,40}$'),
	category text not null check (category in ('kopi', 'nonkopi', 'camilan')),
	name text not null check (char_length(name) between 1 and 60),
	description text not null check (char_length(description) <= 160),
	price_idr integer not null check (price_idr > 0 and price_idr % 500 = 0),
	image text not null,
	available boolean not null default true,
	sort_order integer not null default 0
);

create table kedai.orders (
	id bigint generated always as identity primary key,
	code text not null,
	-- Kunci idempotensi dari browser. Satu kunci = satu pesanan.
	idempotency_key uuid not null,
	-- Sidik isi permintaan (nama + item) untuk membedakan retry dari permintaan berbeda.
	request_hash text not null,
	nickname text not null check (char_length(nickname) between 2 and 30),
	item_count integer not null check (item_count > 0),
	total_idr integer not null check (total_idr > 0),
	created_at timestamptz not null default now(),
	constraint orders_code_key unique (code),
	constraint orders_idempotency_key unique (idempotency_key)
);

create index orders_created_at_idx on kedai.orders (created_at desc);

create table kedai.order_items (
	id bigint generated always as identity primary key,
	order_id bigint not null references kedai.orders (id) on delete cascade,
	product_id text not null references kedai.products (id),
	-- Nama dan harga satuan disalin saat checkout.
	name text not null,
	unit_price_idr integer not null check (unit_price_idr > 0),
	quantity integer not null check (quantity between 1 and 10),
	constraint order_items_unique_product unique (order_id, product_id)
);

create table kedai.rate_limits (
	key text primary key,
	window_start timestamptz not null,
	hits integer not null
);

do $$
begin
	if exists (select 1 from pg_roles where rolname = 'anon') then
		execute 'revoke all on schema kedai from anon';
		execute 'revoke all on all tables in schema kedai from anon';
	end if;
	if exists (select 1 from pg_roles where rolname = 'authenticated') then
		execute 'revoke all on schema kedai from authenticated';
		execute 'revoke all on all tables in schema kedai from authenticated';
	end if;
end
$$;
