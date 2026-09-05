-- ══════════════════════════════════════════════════════════════════════════
-- SPOŘENÍ NENÍ ÚTRATA
--
-- Platba na Portu nebo do penzijního připojištění není výdaj — majetek se
-- nezmenšil, jen leží jinde. Přehled je ale dosud počítal do „skutečně
-- utrácíš", protože se nedaly spárovat: Portu ani penzijko nemají v
-- `fin_ucty` číslo účtu, podle kterého import protiúčet poznává.
--
-- Spoření na Monetu a do Raiffeisenu už převodem je — tam cílový účet číslo
-- má a import si ho spároval sám.
--
-- Dohromady jde o 3 000 Kč měsíčně, které se přesunou z útrat do převodů.
--
-- Spustit v Supabase SQL Editoru. Dá se pustit opakovaně.
-- ══════════════════════════════════════════════════════════════════════════


-- ── A) Pravidlo umí nést i protiúčet ──────────────────────────────────────
-- Doteď uměla pravidla určit kategorii, projekt, koho se platba týká a typ.
-- Přibývá protiúčet — kvůli účtům, které vlastní číslo nemají.
alter table fin_pravidla add column if not exists prevod_ucet_id uuid references fin_ucty(id) on delete set null;

comment on column fin_pravidla.prevod_ucet_id is
  'Protiúčet převodu pro účty bez čísla (Portu, penzijko, stavebko) — import je jinak nespáruje.';


-- ── B) Zpětně: co už je naimportované ─────────────────────────────────────
-- Portu: „Portu doporučená investice" a „Portu - spoření".
update fin_transakce t
   set typ = 'prevod', prevod_ucet_id = u.id, kategorie_id = null
  from fin_ucty u
 where trim(u.nazev) = 'Portu Investiční'
   and t.zdroj = 'import'
   and t.castka < 0
   and t.typ <> 'prevod'
   and coalesce(t.popis,'')||' '||coalesce(t.poznamka,'') ilike '%portu%';

-- Penzijní připojištění — trvalý příkaz z komerčky.
update fin_transakce t
   set typ = 'prevod', prevod_ucet_id = u.id, kategorie_id = null
  from fin_ucty u
 where trim(u.nazev) = 'Penzijní připojištění'
   and t.zdroj = 'import'
   and t.castka < 0
   and t.typ <> 'prevod'
   and coalesce(t.popis,'')||' '||coalesce(t.poznamka,'') ilike '%penzijní připojištění%';


-- ── C) Pravidla pro budoucí importy ───────────────────────────────────────
-- Vzory se ukládají bez diakritiky a malými písmeny — aplikace obě strany
-- porovnání normalizuje stejně.
insert into fin_pravidla (vzor, typ, prevod_ucet_id, priorita)
select v.vzor, 'prevod', u.id, 8
  from (values
    ('portu',                 'Portu Investiční'),
    ('penzijni pripojisteni', 'Penzijní připojištění')
  ) as v(vzor, ucet)
  join fin_ucty u on trim(u.nazev) = v.ucet
on conflict (lower(vzor)) do update
  set typ = excluded.typ, prevod_ucet_id = excluded.prevod_ucet_id;

-- Modrá Pyramida a RB Stavební spořitelna žádné platby ve výpisech nemají —
-- kdyby se objevily, přidej je stejným způsobem:
--
-- insert into fin_pravidla (vzor, typ, prevod_ucet_id, priorita)
-- select v.vzor, 'prevod', u.id, 8
--   from (values ('modra pyramida','Modrá Pyramida'),
--                ('stavebni sporeni','RB Stavební Spořitelna')) as v(vzor, ucet)
--   join fin_ucty u on trim(u.nazev) = v.ucet
-- on conflict (lower(vzor)) do update
--   set typ = excluded.typ, prevod_ucet_id = excluded.prevod_ucet_id;


-- ── Kontrola: co se překlopilo a kam ──────────────────────────────────────
select to_char(t.datum,'YYYY-MM') as mesic,
       z.nazev  as z_uctu,
       na.nazev as na_ucet,
       count(*) as plateb,
       sum(-t.castka)::int as castka
  from fin_transakce t
  join fin_ucty z  on z.id  = t.ucet_id
  join fin_ucty na on na.id = t.prevod_ucet_id
 where t.zdroj = 'import' and t.typ = 'prevod'
   and na.skupina = 'investice'
 group by 1,2,3 order by 1,3;

-- Očekávaně: 7× Portu po 1 500 Kč (1 000 doporučená investice + 500 spoření)
-- z Airbank Hlavní a 7× penzijko po 1 500 Kč z Komerční banky.
