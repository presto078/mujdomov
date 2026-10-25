-- ════════════════════════════════════════════════════════════════════════════
-- NAROVNÁNÍ HOTOVOSTI — peněženka se bere jako plnohodnotný účet
--
-- Co se tím řeší: od února přiteklo do banky 240 000 Kč vkladů z bankomatu
-- a odteklo jen 33 635 Kč výběrů. Všechno jako „převod" bez druhé nohy, takže
-- 206 365 Kč hotovosti se v datech objevilo z ničeho. Proto měřené zůstatky
-- vycházejí o 14 tisíc měsíčně líp než součet plateb.
--
-- Po tomhle skriptu platí: vklad = převod Z peněženky, výběr = převod DO
-- peněženky. Příjem v hotovosti (Svítek) a útrata v hotovosti se dopisují
-- v záložce 💵 Hotovost, zůstatek peněženky každý měsíc v 📥 Importu.
--
-- Skript je idempotentní, jde pustit opakovaně.
-- ════════════════════════════════════════════════════════════════════════════

do $$
declare
  v_penezenka uuid := '59d1b9f1-098b-4c1f-b2b2-032b1cb04e93';  -- Peněženka
  v_internet  uuid;
  n int;
begin
  select id into v_internet from fin_kategorie where nazev = 'Internet' limit 1;

  -- ── 1. Vklady hotovosti = převod Z peněženky ─────────────────────────────
  -- Pravidlo „bankomat air bank" jim navíc dávalo kategorii Výběr hotovosti.
  -- Vklad není výběr.
  update fin_transakce
     set typ = 'prevod', prevod_ucet_id = v_penezenka, kategorie_id = null
   where castka > 0
     and popis ilike '%vklad hotovost%'
     and (prevod_ucet_id is distinct from v_penezenka or kategorie_id is not null);
  get diagnostics n = row_count;  raise notice 'vklady hotovosti: %', n;

  -- ── 2. Výběry hotovosti = převod DO peněženky ────────────────────────────
  -- Poplatek za výběr je skutečný výdaj, ten zůstává.
  update fin_transakce
     set typ = 'prevod', prevod_ucet_id = v_penezenka, kategorie_id = null
   where castka < 0
     and (popis ilike '%výběr hotovosti%' or popis ilike '%výběr z bankomatu%')
     and popis not ilike '%poplatek%'
     and prevod_ucet_id is distinct from v_penezenka;
  get diagnostics n = row_count;  raise notice 'výběry hotovosti: %', n;

  -- ── 3. Máma: 10 000 měsíčně není příjem ──────────────────────────────────
  -- Jirka dá mámě 10 000 v hotovosti a ona je pošle na účet. Je to výměna
  -- hotovosti za bankovní peníze, ne výdělek.
  update fin_transakce
     set typ = 'prevod', prevod_ucet_id = v_penezenka, kategorie_id = null
   where castka = 10000
     and popis ilike '%kucerova pavlina%'
     and prevod_ucet_id is distinct from v_penezenka;
  get diagnostics n = row_count;  raise notice 'máma 10 000: %', n;

  -- ── 4. Internet + TV Miškovice = vratka, ne převod ───────────────────────
  -- Těch 950 je proplacení internetu, který Jirka platí za ně.
  update fin_transakce
     set typ = 'prijem', prevod_ucet_id = null,
         kategorie_id = coalesce(v_internet, kategorie_id)
   where castka = 950
     and popis ilike '%kucerova pavlina%'
     and popis ilike '%internet%'
     and (typ <> 'prijem' or prevod_ucet_id is not null);
  get diagnostics n = row_count;  raise notice 'internet Miškovice: %', n;
end $$;

-- ── 5. Pravidla, aby to příští import nerozbil zpátky ──────────────────────
-- Bez tohohle se při dalším importu vrátí všechno do původního stavu.

-- „bankomat air bank" sedělo i na vklady a dávalo jim kategorii výběru.
-- Je zbytečné — výběry řeší pravidlo níž.
update fin_pravidla set aktivni = false where lower(vzor) = 'bankomat air bank';

insert into fin_pravidla (vzor, priorita, typ, prevod_ucet_id, kategorie_id, aktivni) values
  ('vklad hotovost',      5,  'prevod', '59d1b9f1-098b-4c1f-b2b2-032b1cb04e93', null, true),
  ('vyber hotovosti',     10, 'prevod', '59d1b9f1-098b-4c1f-b2b2-032b1cb04e93', null, true),
  ('vyber z bankomatu',   10, 'prevod', '59d1b9f1-098b-4c1f-b2b2-032b1cb04e93', null, true),
  ('prevod za duchod v hotovosti', 5, 'prevod', '59d1b9f1-098b-4c1f-b2b2-032b1cb04e93', null, true)
on conflict (lower(vzor)) do update
  set priorita = excluded.priorita, typ = excluded.typ,
      prevod_ucet_id = excluded.prevod_ucet_id, kategorie_id = excluded.kategorie_id,
      aktivni = true;

insert into fin_pravidla (vzor, priorita, typ, kategorie_id, projekt_id, aktivni)
select 'internet + tv miskovice', 5, 'prijem',
       (select id from fin_kategorie where nazev = 'Internet' limit 1), 13, true
on conflict (lower(vzor)) do update
  set priorita = excluded.priorita, typ = excluded.typ,
      kategorie_id = excluded.kategorie_id, projekt_id = excluded.projekt_id,
      aktivni = true;

-- ── 6. Renault servis 6 500 placený v hotovosti ────────────────────────────
-- Výběr 6 500 z Fia (26. 9.) je teď převod do peněženky. Samotná platba
-- Renaultu ve výpisech není, protože šla v hotovosti — zapisuje se k projektu.
insert into fin_projekt_platby (projekt_id, datum, castka, poznamka)
select 2, '2026-09-26', 6500, 'Renault servis — placeno v hotovosti'
where not exists (
  select 1 from fin_projekt_platby
   where projekt_id = 2 and datum = '2026-09-26' and castka = 6500);

-- ── Kontrola ───────────────────────────────────────────────────────────────
select to_char(datum,'YYYY-MM') as mesic,
       sum(case when castka > 0 then castka else 0 end) as vklady,
       sum(case when castka < 0 then castka else 0 end) as vybery,
       count(*) as n
  from fin_transakce
 where prevod_ucet_id = '59d1b9f1-098b-4c1f-b2b2-032b1cb04e93'
 group by 1 order by 1;
