-- ══════════════════════════════════════════════════════════════════════════
-- HOTOVOSTNÍ DENÍK
--
-- Hotovost se doteď řešila jedním číslem v nastavení: 38 000 Kč příjem
-- měsíčně. To má dvě vady — nejde do toho zapsat, že mámě dáváš 10 000, a
-- nejde říct, že tenhle měsíc chtěla 12 000. Číslo zamrzne a po půl roce
-- už nikdo neví, jestli platí.
--
-- Místo toho jedna tabulka se dvěma druhy řádků:
--
--   mesic IS NULL   →  ŠABLONA — opakuje se každý měsíc
--   mesic = '2026-08' →  SKUTEČNOST — konkrétní měsíc, dá se přepsat
--
-- Když v modulu otevřeš měsíc, který ještě řádky nemá, vytvoří se ze šablon
-- a od té chvíle si žijí vlastním životem. Přepsaná částka se příště
-- nevrátí zpátky na šablonovou.
--
-- Záměrně to nejde do fin_transakce. Hotovost nemá výpis, o který by se to
-- opřelo, a generované pohyby v účetních datech už jednou nadělaly škodu
-- (dvojité alimenty). Tohle je oddělená evidence, kterou si přehled jen
-- sečte.
--
-- Spustit v Supabase SQL Editoru. Dá se pustit opakovaně.
-- ══════════════════════════════════════════════════════════════════════════


create table if not exists fin_hotovost (
  id           uuid primary key default gen_random_uuid(),
  mesic        text,                       -- 'YYYY-MM'; NULL = šablona
  nazev        text not null,
  castka       numeric not null,           -- kladná = přijde, záporná = odejde
  kategorie_id uuid references fin_kategorie(id) on delete set null,
  poznamka     text,
  poradi       int  not null default 100,
  aktivni      boolean not null default true,
  created_at   timestamptz not null default now()
);

create index if not exists fin_hotovost_mesic_idx on fin_hotovost (mesic);

alter table fin_hotovost enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies
                  where tablename = 'fin_hotovost' and policyname = 'fin_hotovost_vse') then
    create policy fin_hotovost_vse on fin_hotovost
      for all to authenticated using (true) with check (true);
  end if;
end $$;


-- ── Šablony podle toho, co dnes víme ──────────────────────────────────────
insert into fin_hotovost (mesic, nazev, castka, poradi, poznamka)
select null, 'Hotovostní příjem', 38000, 10, 'Dosud vedeno jako jediné číslo v nastavení.'
 where not exists (select 1 from fin_hotovost where mesic is null and nazev = 'Hotovostní příjem');

insert into fin_hotovost (mesic, nazev, castka, kategorie_id, poradi, poznamka)
select null, 'Mámě v hotovosti', -10000,
       (select id from fin_kategorie where nazev = 'Máma'), 20,
       'Důchod, který mámě předáváš v hotovosti. Zpátky přijde na Airbanku jako Převod za důchod.'
 where not exists (select 1 from fin_hotovost where mesic is null and nazev = 'Mámě v hotovosti');


-- ── Kontrola ─────────────────────────────────────────────────────────────
select coalesce(mesic,'— šablona —') as mesic, nazev, castka::int, poradi
  from fin_hotovost order by mesic nulls first, poradi;
