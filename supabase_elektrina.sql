-- ══════════════════════════════════════════════════════════════════════════
-- Modul Elektřina (Centropol) — spustit v Supabase SQL Editoru
-- Skript je idempotentní: dá se pustit opakovaně, nic se nezduplikuje.
-- ══════════════════════════════════════════════════════════════════════════

-- ── Odečty ────────────────────────────────────────────────────────────────
create table if not exists el_odecty (
  id          bigserial primary key,
  datum       date not null,
  vt          numeric,
  nt          numeric,
  poznamka    text,
  created_at  timestamptz default now()
);
create unique index if not exists el_odecty_datum_uniq on el_odecty (datum);

-- ── Ceníky (platnost od data; vybírá se poslední platný ke konci období) ──
create table if not exists el_ceniky (
  id             bigserial primary key,
  platnost_od    date not null,
  nazev          text,
  rezim          text not null default 'rozpad',   -- 'rozpad' | 'jednoduchy'
  -- režim „jednoduchý": ceny za MWh VČETNĚ DPH + měsíční paušál včetně DPH
  cena_vt        numeric,
  cena_nt        numeric,
  pausal_mesic   numeric,
  -- režim „rozpad": složky BEZ DPH v Kč/MWh, pevné platby v Kč/měsíc
  silova_vt      numeric,
  silova_nt      numeric,
  sleva          numeric,
  distribuce_vt  numeric,
  distribuce_nt  numeric,
  systemove      numeric,
  dan            numeric,
  staly_plat     numeric,
  jistic         numeric,
  nesitova       numeric,
  dph            numeric,
  -- společné
  zaloha         numeric,
  created_at     timestamptz default now()
);
create unique index if not exists el_ceniky_platnost_uniq on el_ceniky (platnost_od);

-- ── Vyúčtování ────────────────────────────────────────────────────────────
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

-- ══════════════════════════════════════════════════════════════════════════
-- DATA
-- ══════════════════════════════════════════════════════════════════════════

-- Ceník platný do vyúčtování k 2. 7. 2026 (ceny včetně DPH, záloha 7 070 Kč).
-- POZOR: ceny NEJSOU z původního Excelu (3165,36 / 3104,86 / 147,62) — ty byly
-- podhodnocené a daly odhad 41 869 Kč proti skutečným 53 633 Kč. Tyhle hodnoty
-- jsou dopočítané z vyúčtování 6160203926: VT 3,58 a NT 2,93 Kč/kWh bez DPH,
-- měsíční poplatek 668,85 Kč bez DPH, vše × 1,21. Dají 53 624 Kč, tedy sedí.
insert into el_ceniky (platnost_od, nazev, rezim, cena_vt, cena_nt, pausal_mesic, zaloha)
values ('2025-11-01','Centropol 2025/26','jednoduchy',4331.80,3545.30,809.31,7070)
on conflict (platnost_od) do nothing;

-- Ceník podle smlouvy platné od 2. 7. 2026 (složky bez DPH, záloha 6 260 Kč)
insert into el_ceniky (platnost_od, nazev, rezim, silova_vt, silova_nt, sleva,
                       distribuce_vt, distribuce_nt, systemove, dan,
                       staly_plat, jistic, nesitova, dph, zaloha)
values ('2026-07-02','Centropol od 7/2026','rozpad',2616,2566,0.05,
        754.77,116.5,164.24,28.3,122,555,12.87,0.21,6260)
on conflict (platnost_od) do nothing;

-- Historie samoodečtů (VT = T1, NT = T2)
insert into el_odecty (datum, vt, nt, poznamka) values
  ('2025-11-01',14795,115468,'Počáteční stav'),
  ('2025-12-01',14951,117612,'Samoodečet'),
  ('2026-01-01',15069,119420,'Samoodečet'),
  ('2026-02-01',15195,121538,'Samoodečet'),
  ('2026-03-01',15329,123136,'Samoodečet'),
  ('2026-04-01',15446,124555,'Samoodečet'),
  ('2026-05-01',15533,125776,'Samoodečet'),
  ('2026-06-01',15621,126859,'Samoodečet'),
  ('2026-07-01',15720,127590,'Samoodečet'),
  ('2026-07-02',15726,127622,'Konečný stav z vyúčtování 6160203926'),
  ('2026-08-01',15815,128387,'Samoodečet')
on conflict (datum) do nothing;

-- Vyúčtování Centropol za 1. 11. 2025 – 2. 7. 2026 (přeplatek 2 927 Kč)
insert into el_faktury (cislo_faktury, datum_vystaveni, datum_splatnosti, obdobi_od, obdobi_do,
                        vt_od, vt_do, nt_od, nt_do, castka_celkem, zalohy, vyrovnani, zaplaceno, poznamka)
select '6160203926','2026-07-06','2026-08-05','2025-11-01','2026-07-02',
       14795,15726,115468,127622,53632.93,56560,-2927,false,'VT 3,58 Kč/kWh, NT 2,93 Kč/kWh'
where not exists (select 1 from el_faktury where cislo_faktury = '6160203926');

-- ── Přístup jen pro přihlášené (stejně jako u tabulek modulu IT) ──────────
alter table el_odecty  enable row level security;
alter table el_ceniky  enable row level security;
alter table el_faktury enable row level security;

drop policy if exists el_odecty_auth  on el_odecty;
drop policy if exists el_ceniky_auth  on el_ceniky;
drop policy if exists el_faktury_auth on el_faktury;

create policy el_odecty_auth  on el_odecty  for all to authenticated using (true) with check (true);
create policy el_ceniky_auth  on el_ceniky  for all to authenticated using (true) with check (true);
create policy el_faktury_auth on el_faktury for all to authenticated using (true) with check (true);

-- Starší tabulka z první verze modulu už se nepoužívá (ceny jsou v el_ceniky)
drop table if exists el_nastaveni;

-- ── Pro modul Voda: povolit nové typy (zahradní vodoměr, faktury za stočné) ──
alter table voda_odecty  drop constraint if exists voda_odecty_typ_check;
alter table voda_faktury drop constraint if exists voda_faktury_typ_check;
