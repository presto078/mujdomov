-- ══════════════════════════════════════════════════════════════════════════
-- FINANČNÍ PROJEKTY
-- Kategorie říká ZA CO se utratilo, projekt ŘÍKÁ NA ČEM. Hypotéka, SJM nebo
-- insolvence nejsou druhy výdajů — jsou to závazky s cílovou částkou a koncem.
-- Spustit v Supabase SQL Editoru. Dá se pustit opakovaně.
-- ══════════════════════════════════════════════════════════════════════════

create table if not exists fin_projekty (
  id              bigserial primary key,
  nazev           text not null,
  emoji           text,
  barva           text default '#4f7ef0',
  -- 'zavazek' = splácí se do nuly (SJM, hypotéka, insolvence)
  -- 'provoz'  = běží bez konce (auta, děti)
  typ             text default 'zavazek',
  cilova_castka   numeric,          -- kolik je celkem potřeba zaplatit
  zaplaceno_pred  numeric default 0,-- co bylo zaplaceno před začátkem evidence
  mesicni_castka  numeric,          -- očekávaná splátka
  datum_od        date,
  datum_do        date,             -- plánovaný konec
  poznamka        text,
  poradi          int default 0,
  aktivni         boolean default true,
  created_at      timestamptz default now()
);

alter table fin_transakce add column if not exists projekt_id bigint references fin_projekty(id) on delete set null;
alter table fin_pravidla  add column if not exists projekt_id bigint references fin_projekty(id) on delete set null;
create index if not exists fin_transakce_projekt_idx on fin_transakce (projekt_id);

-- Ruční zápisy plateb v hotovosti, které přes účet neprojdou
create table if not exists fin_projekt_platby (
  id          bigserial primary key,
  projekt_id  bigint references fin_projekty(id) on delete cascade,
  datum       date not null,
  castka      numeric not null,
  poznamka    text,
  created_at  timestamptz default now()
);

-- ── Projekty podle skutečných plateb ve výpisech ─────────────────────────
insert into fin_projekty (nazev, emoji, typ, cilova_castka, mesicni_castka, datum_do, poznamka, poradi)
select * from (values
  ('SJM Tereza',        '⚖️', 'zavazek', 1000000, 28000, date '2027-02-28',
   'Vypořádání společného jmění. Poslední splátka únor 2027. Doplň, kolik bylo zaplaceno před lednem 2026.', 1),
  ('Hypotéka',          '🏠', 'zavazek', null,    13815, null,
   'Inkasa na 510-6246695583 a 43-6246695583 (kód 7990). Doplň zůstatek jistiny.', 2),
  ('Insolvence Míková', '⚖️', 'zavazek', null,     5786, null,
   'Pravidelné splátky. Doplň celkovou částku a termín, aby se ukazoval odpočet.', 3),
  ('Auta',              '🚗', 'provoz',  null,    22259, null,
   'Splátky Renault Trafic, Toyota a Kia Ceed — odcházejí z Fia.', 4)
) as v(nazev,emoji,typ,cilova_castka,mesicni_castka,datum_do,poznamka,poradi)
where not exists (select 1 from fin_projekty p where p.nazev = v.nazev);

-- ── Pravidla, aby se platby přiřazovaly samy ─────────────────────────────
insert into fin_pravidla (vzor, projekt_id, priorita)
select v.vzor, p.id, 5 from (values
  ('6246695583',        'Hypotéka'),
  ('1763986028',        'SJM Tereza'),
  ('insolvence',        'Insolvence Míková'),
  ('mikova',            'Insolvence Míková'),
  ('splatka renault',   'Auta'),
  ('splatka toyota',    'Auta'),
  ('splatka kia',       'Auta')
) as v(vzor, projekt)
join fin_projekty p on p.nazev = v.projekt
on conflict (lower(vzor)) do update set projekt_id = excluded.projekt_id;

-- ── Zpětné přiřazení už naimportovaných transakcí ────────────────────────
update fin_transakce t set projekt_id = p.id from fin_projekty p
 where t.zdroj='import' and t.projekt_id is null and p.nazev='Hypotéka'
   and t.protistrana like '%6246695583%';

update fin_transakce t set projekt_id = p.id from fin_projekty p
 where t.zdroj='import' and t.projekt_id is null and p.nazev='SJM Tereza'
   and t.protistrana like '1763986028%' and t.castka < 0;

update fin_transakce t set projekt_id = p.id from fin_projekty p
 where t.zdroj='import' and t.projekt_id is null and p.nazev='Insolvence Míková'
   and (t.popis ilike '%insolvence%' or t.poznamka ilike '%insolvence%' or t.poznamka ilike '%míková%');

update fin_transakce t set projekt_id = p.id from fin_projekty p
 where t.zdroj='import' and t.projekt_id is null and p.nazev='Auta'
   and (t.popis ilike '%splátka renault%' or t.popis ilike '%splátka toyota%' or t.popis ilike '%splátka kia%');

-- ══════════════════════════════════════════════════════════════════════════
-- KOHO SE PLATBA TÝKÁ
-- Druhá otázka vedle kategorie a projektu: byl to výdaj celé rodiny, jednoho
-- člověka, konkrétního auta, nebo domu? Ukládá se dvojicí typ + id, aby se
-- dalo odkázat na už existující tabulky „deti" (rodina) a „auta" bez toho,
-- aby se jejich seznam někam kopíroval. id je text, protože obě tabulky
-- můžou mít jiný typ klíče.
--   subjekt_typ = 'rodina' → celá rodina, subjekt_id zůstává prázdné
--   subjekt_typ = 'osoba'  → subjekt_id = deti.id
--   subjekt_typ = 'auto'   → subjekt_id = auta.id
--   subjekt_typ = 'dum'    → dům v Hošticích, subjekt_id prázdné
-- ══════════════════════════════════════════════════════════════════════════
alter table fin_transakce add column if not exists subjekt_typ text;
alter table fin_transakce add column if not exists subjekt_id  text;
alter table fin_pravidla  add column if not exists subjekt_typ text;
alter table fin_pravidla  add column if not exists subjekt_id  text;
create index if not exists fin_transakce_subjekt_idx on fin_transakce (subjekt_typ, subjekt_id);

-- ── Pravidla: co se pozná z textu výpisu ─────────────────────────────────
-- Auta se párují podle názvu ve splátce, takže se seznam vezme z tabulky aut.
insert into fin_pravidla (vzor, subjekt_typ, subjekt_id, priorita)
select lower('splatka '||a.nazev), 'auto', a.id::text, 5 from auta a
 where a.nazev is not null
on conflict (lower(vzor)) do update
  set subjekt_typ = excluded.subjekt_typ, subjekt_id = excluded.subjekt_id;

-- Dům: energie, voda, hypotéka, odpady, pojištění nemovitosti
insert into fin_pravidla (vzor, subjekt_typ, priorita)
select v.vzor, 'dum', 30 from (values
  ('centropol'),('cez'),('e.on'),('innogy'),('gasnet'),
  ('vodochody'),('baracom'),('technicke sluzby'),
  ('6246695583'),('odpad'),('komin')
) as v(vzor)
on conflict (lower(vzor)) do update set subjekt_typ = 'dum';

-- Celá rodina: běžný provoz domácnosti
insert into fin_pravidla (vzor, subjekt_typ, priorita)
select v.vzor, 'rodina', 40 from (values
  ('rohlik.cz'),('globus'),('tesco'),('lidl'),('kaufland'),('albert'),
  ('potraviny'),('foodora'),('dm drogerie')
) as v(vzor)
on conflict (lower(vzor)) do update set subjekt_typ = 'rodina';

-- ── Zpětné přiřazení už naimportovaných transakcí ────────────────────────
update fin_transakce t set subjekt_typ='auto', subjekt_id=a.id::text
  from auta a
 where t.zdroj='import' and t.subjekt_typ is null
   and a.nazev is not null
   and t.popis ilike '%splátka '||a.nazev||'%';

update fin_transakce t set subjekt_typ='dum'
 where t.zdroj='import' and t.subjekt_typ is null
   and (t.protistrana like '%6246695583%'
     or t.popis ilike any (array['%centropol%','%čez%','%cez%','%vodochod%','%baracom%','%odpad%']));

update fin_transakce t set subjekt_typ='rodina'
 where t.zdroj='import' and t.subjekt_typ is null
   and t.popis ilike any (array['%rohlik%','%globus%','%tesco%','%lidl%','%kaufland%','%albert%','%foodora%','%dm drogerie%']);

-- ── Přístup jen pro přihlášené ───────────────────────────────────────────
alter table fin_projekty       enable row level security;
alter table fin_projekt_platby enable row level security;
drop policy if exists fin_projekty_auth       on fin_projekty;
drop policy if exists fin_projekt_platby_auth on fin_projekt_platby;
create policy fin_projekty_auth       on fin_projekty       for all to authenticated using (true) with check (true);
create policy fin_projekt_platby_auth on fin_projekt_platby for all to authenticated using (true) with check (true);

-- Kontrola
select p.nazev, count(t.id) as plateb, sum(t.castka)::numeric(12,2) as celkem
  from fin_projekty p left join fin_transakce t on t.projekt_id = p.id
 group by p.nazev order by p.nazev;

select coalesce(subjekt_typ,'(nepřiřazeno)') as tyka_se,
       count(*) as pohybu, sum(castka)::numeric(12,2) as celkem
  from fin_transakce where zdroj='import'
 group by 1 order by 2 desc;
