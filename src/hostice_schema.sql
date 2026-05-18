-- ═══════════════════════════════════════════════════════
-- HOSTICE — Rodinný operační systém
-- Supabase SQL schema
-- Spusť v SQL editoru na supabase.com
-- ═══════════════════════════════════════════════════════

-- ── DĚTI ────────────────────────────────────────────────
create table if not exists deti (
  id          uuid primary key default gen_random_uuid(),
  jmeno       text not null,
  narozen     date,
  pohlavi     text check (pohlavi in ('chlapec','divka')),
  skola       text default '',        -- název školy/školky
  trida       text default '',        -- třída / skupina
  poznamka    text default '',
  barva       text default '#4f7ef0', -- barva v UI
  emoji       text default '👦',
  poradi      integer default 0,
  created_at  timestamptz default now()
);

-- ── OBLEČENÍ ────────────────────────────────────────────
create table if not exists vel_velikosti (
  id      text primary key,
  poznamka text default ''
);

create table if not exists vel_kontejnery (
  id          uuid primary key default gen_random_uuid(),
  velikost_id text not null references vel_velikosti(id) on delete cascade,
  nazev       text not null,
  umisteni    text default '',
  typ         text default 'box',
  created_at  timestamptz default now()
);

create table if not exists vel_polozky (
  id           uuid primary key default gen_random_uuid(),
  kontejner_id uuid not null references vel_kontejnery(id) on delete cascade,
  nazev        text not null,
  pocet        integer not null default 0 check (pocet >= 0),
  created_at   timestamptz default now()
);

-- ── SKLAD ───────────────────────────────────────────────
create table if not exists sklad_kategorie (
  id      uuid primary key default gen_random_uuid(),
  nazev   text not null,
  emoji   text default '📦',
  poradi  integer default 0
);

create table if not exists sklad_polozky (
  id           uuid primary key default gen_random_uuid(),
  kategorie_id uuid references sklad_kategorie(id) on delete set null,
  nazev        text not null,
  pocet        numeric default 0,
  jednotka     text default 'ks',     -- ks, kg, l, balení…
  minimum      numeric default 0,     -- upozornit pod tuto hodnotu
  umisteni     text default '',       -- kde to je doma
  poznamka     text default '',
  created_at   timestamptz default now()
);

-- ── PRAVIDELNÉ ÚKOLY / ÚDRŽBA ───────────────────────────
create table if not exists ukoly (
  id              uuid primary key default gen_random_uuid(),
  nazev           text not null,
  popis           text default '',
  kategorie       text default 'ostatni', -- udrzba | spotreba | filtr | ostatni
  interval_dnu    integer,               -- každých N dní (null = jednorázové)
  posledni_splneni date,                 -- kdy naposledy splněno
  dalsi_termin    date,                  -- vypočítaný nebo manuální
  created_at      timestamptz default now()
);

create table if not exists ukoly_splneni (
  id        uuid primary key default gen_random_uuid(),
  ukol_id   uuid not null references ukoly(id) on delete cascade,
  datum     date not null default current_date,
  poznamka  text default '',
  created_at timestamptz default now()
);

-- ── SPOTŘEBA (voda, elektřina, plyn) ────────────────────
create table if not exists spotreba_meraky (
  id       uuid primary key default gen_random_uuid(),
  nazev    text not null,         -- Voda studená, El. přízemí…
  jednotka text default 'kWh',   -- kWh, m³
  emoji    text default '⚡',
  poradi   integer default 0
);

create table if not exists spotreba_odecty (
  id        uuid primary key default gen_random_uuid(),
  merak_id  uuid not null references spotreba_meraky(id) on delete cascade,
  datum     date not null default current_date,
  stav      numeric not null,
  poznamka  text default '',
  created_at timestamptz default now()
);

-- ── FINANCE ─────────────────────────────────────────────
create table if not exists finance_kategorie (
  id      uuid primary key default gen_random_uuid(),
  nazev   text not null,
  emoji   text default '💰',
  typ     text default 'vydaj' check (typ in ('vydaj','prijem')),
  barva   text default '#3b6fd4'
);

create table if not exists finance_zaznamy (
  id           uuid primary key default gen_random_uuid(),
  kategorie_id uuid references finance_kategorie(id) on delete set null,
  castka       numeric not null,
  typ          text not null check (typ in ('vydaj','prijem')),
  popis        text default '',
  datum        date not null default current_date,
  dite_id      uuid references deti(id) on delete set null, -- výdaj spojený s dítětem
  created_at   timestamptz default now()
);

-- ── DŮM / OPRAVY ────────────────────────────────────────
create table if not exists dum_opravy (
  id          uuid primary key default gen_random_uuid(),
  nazev       text not null,
  popis       text default '',
  stav        text default 'plan' check (stav in ('plan','probiha','hotovo')),
  priorita    text default 'normal' check (priorita in ('low','normal','high')),
  datum_plan  date,
  datum_hotovo date,
  castka      numeric,
  created_at  timestamptz default now()
);

-- ── VÝCHOZÍ DATA ─────────────────────────────────────────
-- Sklad kategorie
insert into sklad_kategorie (nazev, emoji, poradi) values
  ('Potraviny', '🥫', 1), ('Drogerie', '🧴', 2),
  ('Léky', '💊', 3), ('Dětské potřeby', '🍼', 4), ('Ostatní', '📦', 5)
on conflict do nothing;

-- Spotřeba měřáky
insert into spotreba_meraky (nazev, jednotka, emoji, poradi) values
  ('Elektřina', 'kWh', '⚡', 1),
  ('Voda studená', 'm³', '💧', 2),
  ('Voda teplá', 'm³', '🚿', 3),
  ('Plyn', 'm³', '🔥', 4)
on conflict do nothing;

-- Pravidelné úkoly (příklady)
insert into ukoly (nazev, kategorie, interval_dnu, popis) values
  ('Sůl do filtru', 'filtr', 30, 'Doplnit sůl do změkčovače vody'),
  ('Filtr do lednice', 'filtr', 180, 'Vyměnit filtr na vodu v lednici'),
  ('Odečet elektřiny', 'spotreba', 30, 'Zapsat stav elektroměru'),
  ('Odečet vody', 'spotreba', 30, 'Zapsat stav vodoměru'),
  ('Revize kotle', 'udrzba', 365, 'Roční revize plynového kotle')
on conflict do nothing;

-- Finance kategorie
insert into finance_kategorie (nazev, emoji, typ, barva) values
  ('Potraviny', '🛒', 'vydaj', '#1a7a4a'),
  ('Oblečení děti', '👕', 'vydaj', '#3b6fd4'),
  ('Škola / školka', '📚', 'vydaj', '#6b3fa0'),
  ('Léky / zdraví', '💊', 'vydaj', '#c0392b'),
  ('Dům a zahrada', '🏡', 'vydaj', '#c87000'),
  ('Energie', '⚡', 'vydaj', '#1a6fa8'),
  ('Ostatní výdaje', '💸', 'vydaj', '#9aa0b8'),
  ('Příjem', '💵', 'prijem', '#1a7a4a')
on conflict do nothing;

-- RLS vypnuto (soukromá rodinná app)
alter table deti                disable row level security;
alter table vel_velikosti       disable row level security;
alter table vel_kontejnery      disable row level security;
alter table vel_polozky         disable row level security;
alter table sklad_kategorie     disable row level security;
alter table sklad_polozky       disable row level security;
alter table ukoly               disable row level security;
alter table ukoly_splneni       disable row level security;
alter table spotreba_meraky     disable row level security;
alter table spotreba_odecty     disable row level security;
alter table finance_kategorie   disable row level security;
alter table finance_zaznamy     disable row level security;
alter table dum_opravy          disable row level security;
