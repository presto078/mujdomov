-- ══════════════════════════════════════════════════════════════════════════
-- Import bankovních výpisů — spustit v Supabase SQL Editoru
-- Skript je idempotentní, dá se pustit opakovaně.
-- ══════════════════════════════════════════════════════════════════════════

-- ── Účty: číslo účtu, ať se výpis sám trefí do správného ─────────────────
alter table fin_ucty add column if not exists cislo_uctu text;
alter table fin_ucty add column if not exists kod_banky  text;

-- Názvy účtů můžou mít na konci mezeru (stalo se u „Komerční banka Spořící “),
-- kvůli které přesná shoda níž selže. Nejdřív se tedy ořežou.
update fin_ucty set nazev = trim(nazev) where nazev <> trim(nazev);

update fin_ucty set cislo_uctu='1763611015', kod_banky='3030' where trim(nazev)='Airbank Hlavní'            and cislo_uctu is null;
update fin_ucty set cislo_uctu='3442757012', kod_banky='3030' where trim(nazev)='Airbank Podnikatelský'     and cislo_uctu is null;
update fin_ucty set cislo_uctu='592521001',  kod_banky='2010' where trim(nazev)='Fio DATA PRESCO'           and cislo_uctu is null;
update fin_ucty set cislo_uctu='4522946002', kod_banky='5500' where trim(nazev)='Raiffeisen Běžný'          and cislo_uctu is null;
update fin_ucty set cislo_uctu='4522946010', kod_banky='5500' where trim(nazev)='Raiffeisen Spořící'        and cislo_uctu is null;
update fin_ucty set cislo_uctu='1101083110', kod_banky='5500' where trim(nazev)='Raiffeisen Kreditní karta' and cislo_uctu is null;
update fin_ucty set cislo_uctu='269037551',  kod_banky='0600' where trim(nazev)='Moneta Běžný'              and cislo_uctu is null;
update fin_ucty set cislo_uctu='269330598',  kod_banky='0600' where trim(nazev)='Moneta Spořící'            and cislo_uctu is null;
update fin_ucty set cislo_uctu='1763611058',     kod_banky='3030' where trim(nazev)='Airbank Jídlo'            and cislo_uctu is null;
update fin_ucty set cislo_uctu='1763611023',     kod_banky='3030' where trim(nazev)='Airbank Spořící děti'     and cislo_uctu is null;
update fin_ucty set cislo_uctu='115-2728360227', kod_banky='0100' where trim(nazev)='Komerční banka Hlavní'    and cislo_uctu is null;
update fin_ucty set cislo_uctu='123-3228050227', kod_banky='0100' where trim(nazev)='Komerční banka Spořící'   and cislo_uctu is null;

-- ── Transakce: reference z banky kvůli duplicitám ────────────────────────
alter table fin_transakce add column if not exists banka_ref text;
alter table fin_transakce add column if not exists vs        text;
alter table fin_transakce add column if not exists poznamka  text;
-- Odkud transakce je: 'import' = z bankovniho vypisu (skutecne protekle penize),
-- 'modul' = zalozil ji jiny modul (Alimenty, Pravnik), 'rucne' = rucni zapis.
-- Statistiky maji verit bance; modulove zaznamy jsou evidence, ne pohyb penez.
alter table fin_transakce add column if not exists zdroj text default 'rucne';
update fin_transakce set zdroj='modul'
 where zdroj is null or (zdroj='rucne' and banka_ref is null
   and (popis like 'Alimenty %' or popis like 'Mimořádné %' or popis like 'Právník%'));

-- Stejná transakce z téhož účtu se nemůže uložit dvakrát
create unique index if not exists fin_transakce_banka_ref_uniq
  on fin_transakce (ucet_id, banka_ref) where banka_ref is not null;

-- ── Log importů ──────────────────────────────────────────────────────────
create table if not exists fin_importy (
  id                bigserial primary key,
  ucet_id           uuid references fin_ucty(id) on delete set null,
  soubor            text,
  banka             text,
  obdobi_od         date,
  obdobi_do         date,
  pocet_novych      int default 0,
  pocet_duplicit    int default 0,
  zustatek_konecny  numeric,
  created_at        timestamptz default now()
);

-- ── Pravidla pro automatickou kategorizaci ───────────────────────────────
-- „vzor" se hledá v textu transakce bez ohledu na velikost písmen a diakritiku
create table if not exists fin_pravidla (
  id           bigserial primary key,
  vzor         text not null,
  kategorie_id uuid references fin_kategorie(id) on delete cascade,
  priorita     int default 100,
  aktivni      boolean default true,
  created_at   timestamptz default now()
);
create unique index if not exists fin_pravidla_vzor_uniq on fin_pravidla (lower(vzor));

-- Pravidla podle toho, co reálně chodí na výpisech
insert into fin_pravidla (vzor, kategorie_id, priorita)
select v.vzor, k.id, v.p from (values
  ('rohlik.cz',           'Potraviny',            10),
  ('globus',              'Potraviny',            10),
  ('tesco',               'Potraviny',            10),
  ('lidl',                'Potraviny',            10),
  ('kaufland',            'Potraviny',            10),
  ('albert',              'Potraviny',            10),
  ('potraviny',           'Potraviny',            20),
  ('pekarstvi',           'Potraviny',            20),
  ('zamecka vyrobna',     'Potraviny',            20),
  ('foodora',             'Restaurace / jídlo',   10),
  ('jidelna',             'Restaurace / jídlo',   20),
  ('restaurace',          'Restaurace / jídlo',   20),
  ('delikomat',           'Restaurace / jídlo',   20),
  ('dm drogerie',         'Domácnost / opravy',   20),
  ('tedi',                'Domácnost / opravy',   20),
  ('alza',                'Elektronika',          10),
  ('google',              'Předplatné / služby',  20),
  ('openai',              'Předplatné / služby',  10),
  ('github',              'Předplatné / služby',  10),
  ('vercel',              'Předplatné / služby',  10),
  ('t-mobile',            'Předplatné / služby',  10),
  ('cznet',               'Internet',             10),
  ('splatka toyota',      'Leasing / auto',        5),
  ('splatka renault',     'Leasing / auto',        5),
  ('splatka kia',         'Leasing / auto',        5),
  ('cssz',                'Sociální a zdravotní pojištění', 5),
  ('up - kp',             'Přídavky na děti',      5),
  ('rodp',                'Mateřská a rodičovská', 5),
  ('insolvence',          'Insolvence',            5),
  ('mikova',              'Insolvence',            5),
  ('sima',                'Alimenty',              5),
  ('vyzivne',             'Alimenty',              5),
  ('dph',                 'DPH',                   5),
  ('sprava karty',        'Ostatní výdaje',       50),
  ('urok',                'Investice / dividendy',50),
  ('mzda',                'Mzda',                  5)
) as v(vzor, kat, p)
join fin_kategorie k on k.nazev = v.kat
on conflict (lower(vzor)) do nothing;

-- ── Přístup jen pro přihlášené ───────────────────────────────────────────
alter table fin_importy  enable row level security;
alter table fin_pravidla enable row level security;
drop policy if exists fin_importy_auth  on fin_importy;
drop policy if exists fin_pravidla_auth on fin_pravidla;
create policy fin_importy_auth  on fin_importy  for all to authenticated using (true) with check (true);
create policy fin_pravidla_auth on fin_pravidla for all to authenticated using (true) with check (true);

-- ── Úklid: tři zjevně omylem uložené srpnové stavy ───────────────────────
-- Airbank Hlavní mělo v červenci 76 009 Kč, v srpnu 22 Kč. Totéž kreditka.
-- (Zakomentováno — odkomentuj, jestli je chceš smazat.)
-- delete from fin_stavy s using fin_ucty u
--  where s.ucet_id = u.id and s.rok = 2026 and s.mesic = 8
--    and u.nazev in ('Airbank Hlavní','Raiffeisen Kreditní karta','Úspory Aquapark');

-- ══════════════════════════════════════════════════════════════════════════
-- ROZDĚLENÍ ÚČTŮ DO SKUPIN
-- Ve Financích mají zůstat jen účty, přes které tečou peníze. Zbytek se
-- chová jinak (hodnota jednou za čas, žádné výpisy) a patří do vlastních
-- dlaždic. Data se nikam nestěhují, mění se jen zařazení účtu.
--   finance   — běžné, spořicí a podnikatelské účty, kreditka
--   investice — Portu, penzijko, stavební spoření
--   hotovost  — fyzické peníze a obálky
--   deti      — spoření dětí, na které se nesahá
--   konicek   — sázkový účet; do majetku se nepočítá
-- ══════════════════════════════════════════════════════════════════════════
alter table fin_ucty add column if not exists skupina text default 'finance';

update fin_ucty set skupina='investice' where trim(nazev) in
  ('Portu Investiční','Penzijní připojištění','Modrá Pyramida','RB Stavební Spořitelna');
update fin_ucty set skupina='hotovost'  where trim(nazev) in
  ('Peněženka','Úspory Doma','Úspory Aquapark','Úspory Revoluční');
update fin_ucty set skupina='deti'      where trim(nazev) = 'Airbank Spořící děti';
update fin_ucty set skupina='konicek'   where trim(nazev) = 'Fortuna';
update fin_ucty set skupina='finance'   where skupina is null;

create index if not exists fin_ucty_skupina_idx on fin_ucty (skupina);
