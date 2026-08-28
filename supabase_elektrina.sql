-- ══════════════════════════════════════════════════════════════════════════
-- Modul Elektřina (Centropol) — spustit v Supabase SQL Editoru
-- Tabulky: samoodečty VT/NT, ceník, vyúčtování
-- ══════════════════════════════════════════════════════════════════════════

create table if not exists el_odecty (
  id          bigserial primary key,
  datum       date not null,
  vt          numeric,
  nt          numeric,
  poznamka    text,
  created_at  timestamptz default now()
);
create index if not exists el_odecty_datum_idx on el_odecty (datum);

create table if not exists el_nastaveni (
  klic     text primary key,
  hodnota  text
);

create table if not exists el_faktury (
  id                bigserial primary key,
  cislo_faktury     text,
  datum_vystaveni   date,
  datum_splatnosti  date,
  obdobi_od         date,
  obdobi_do         date,
  vt_od             numeric,
  vt_do             numeric,
  nt_od             numeric,
  nt_do             numeric,
  castka_celkem     numeric,   -- vyúčtováno celkem s DPH
  zalohy            numeric,   -- zaplacené zálohy
  vyrovnani         numeric,   -- kladné = nedoplatek, záporné = přeplatek
  zaplaceno         boolean default false,
  poznamka          text,
  created_at        timestamptz default now()
);

-- Ceník podle smlouvy platné od 2. 7. 2026 (Kč/MWh a Kč/měsíc bez DPH)
insert into el_nastaveni (klic, hodnota) values
  ('silova_vt','2616'), ('silova_nt','2566'), ('sleva','0.05'),
  ('distribuce_vt','754.77'), ('distribuce_nt','116.5'),
  ('systemove','164.24'), ('dan','28.3'),
  ('staly_plat','122'), ('jistic','555'), ('nesitova','12.87'),
  ('dph','0.21'), ('zaloha','6260')
on conflict (klic) do nothing;

-- Výchozí odečet = konečné stavy z vyúčtování 6160203926 k 2. 7. 2026
insert into el_odecty (datum, vt, nt, poznamka)
select '2026-07-02', 15726, 127622, 'Z vyúčtování 6160203926'
where not exists (select 1 from el_odecty where datum = '2026-07-02');

-- Přístup jen pro přihlášené (stejně jako u tabulek modulu IT)
alter table el_odecty    enable row level security;
alter table el_nastaveni enable row level security;
alter table el_faktury   enable row level security;

drop policy if exists el_odecty_auth    on el_odecty;
drop policy if exists el_nastaveni_auth on el_nastaveni;
drop policy if exists el_faktury_auth   on el_faktury;

create policy el_odecty_auth    on el_odecty    for all to authenticated using (true) with check (true);
create policy el_nastaveni_auth on el_nastaveni for all to authenticated using (true) with check (true);
create policy el_faktury_auth   on el_faktury   for all to authenticated using (true) with check (true);

-- ── Pro modul Voda: povolit nové typy (zahradní vodoměr, faktury za stočné) ──
alter table voda_odecty  drop constraint if exists voda_odecty_typ_check;
alter table voda_faktury drop constraint if exists voda_faktury_typ_check;
