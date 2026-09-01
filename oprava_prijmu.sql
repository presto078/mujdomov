-- ══════════════════════════════════════════════════════════════════════════
-- Oprava příjmů: podnikání zvlášť + peníze, které příjem nejsou
--
-- Proč: přehled ukazoval 166 463 Kč příjmů měsíčně. Rozbor ukázal tři vady —
--   1) průměr se dělil devíti měsíci, ale výpisy jsou jen za sedm (11–12/2025
--      má nahranou pouze kreditku)              → opraveno v App.jsx
--   2) Fio a Airbank Podnikatelský sypaly do příjmů hrubý obrat 84 002 Kč/měs,
--      zatímco 56 224 Kč/měs z nich odešlo na náklady   → tenhle skript, část A
--   3) matka posílá zpátky hotovost, kterou dostala od Jirky — to není příjem,
--      je to stejný přesun jako vklad do bankomatu       → tenhle skript, část B
--
-- Spustit v Supabase SQL Editoru. Dá se pustit opakovaně.
-- ══════════════════════════════════════════════════════════════════════════


-- ── A) Podnikatelské účty do vlastní skupiny ──────────────────────────────
-- Přehled je pak počítá odděleně a do „kolik můžu utratit" vstupují jen
-- čistým přínosem (co přišlo minus co odešlo na náklady).

update fin_ucty
   set skupina = 'podnikani'
 where trim(nazev) in ('Fio DATA PRESCO', 'Airbank Podnikatelský');

select skupina, count(*) as uctu, string_agg(trim(nazev), ', ' order by poradi) as ucty
  from fin_ucty where aktivni group by skupina order by skupina;


-- ── B) Pravidla můžou platbu přeznačit na převod ──────────────────────────
alter table fin_pravidla add column if not exists typ text;
comment on column fin_pravidla.typ is
  'Když je ''prevod'', import platbu neuloží jako příjem/výdaj — pro peníze, které jen protečou.';

-- Co matka posílá zpátky: hotovost, kterou od Jirky dostala, a proplacení
-- internetu a TV, které za ni platí. Ani jedno není příjem zvenčí.
insert into fin_pravidla (vzor, typ, priorita) values
  ('prevod za duchod v hotovosti', 'prevod', 5),
  ('internet + tv miskovice',      'prevod', 5)
on conflict (lower(vzor)) do update set typ = excluded.typ;


-- ── C) Doznačit, co už je v databázi ──────────────────────────────────────
update fin_transakce
   set typ = 'prevod'
 where zdroj = 'import'
   and typ <> 'prevod'
   and (   unaccent(lower(coalesce(popis,'')||' '||coalesce(poznamka,''))) like '%prevod za duchod v hotovosti%'
        or unaccent(lower(coalesce(popis,'')||' '||coalesce(poznamka,''))) like '%internet + tv miskovice%');
-- Kdyby rozšíření unaccent nebylo nainstalované, spusť místo toho tohle:
-- update fin_transakce set typ='prevod'
--  where zdroj='import' and typ<>'prevod'
--    and (popis ilike '%evod za d%chod v hotovosti%' or popis ilike '%Internet + TV Mi%kovice%');


-- ── Kontrola: příjmy po opravě, po měsících a po skupinách účtů ───────────
select to_char(t.datum,'YYYY-MM')                       as mesic,
       coalesce(u.skupina,'finance')                    as skupina,
       sum(t.castka) filter (where t.castka > 0)::int   as prislo,
       sum(-t.castka) filter (where t.castka < 0)::int  as odeslo,
       sum(t.castka)::int                               as bilance
  from fin_transakce t
  join fin_ucty u on u.id = t.ucet_id
 where t.zdroj = 'import' and t.typ <> 'prevod'
   and coalesce(u.skupina,'finance') in ('finance','podnikani')
 group by 1, 2 order by 1, 2;

-- Očekávaný výsledek za 1–7/2026 (podle rozboru z 1. 9. 2026):
--   finance   ~119 000 Kč/měs příjmů, ~178 500 Kč/měs výdajů
--   podnikani  ~84 000 Kč/měs příjmů,  ~56 200 Kč/měs výdajů


-- ── Zpět, kdyby to nesedělo ───────────────────────────────────────────────
-- update fin_ucty set skupina='finance' where trim(nazev) in ('Fio DATA PRESCO','Airbank Podnikatelský');
-- update fin_transakce set typ = case when castka>=0 then 'prijem' else 'vydaj' end
--  where zdroj='import' and typ='prevod'
--    and (popis ilike '%chod v hotovosti%' or popis ilike '%Internet + TV%');
-- delete from fin_pravidla where lower(vzor) in ('prevod za duchod v hotovosti','internet + tv miskovice');
