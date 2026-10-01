-- ══════════════════════════════════════════════════════════════════════════
-- DOTŘÍDĚNÍ 2 — co jsi identifikoval
--
--   6 475 Kč  DOMANSKYZDIBY (14. 5.)  → servis Toyoty
--   5 500 Kč  Kocanďák (21. 1.)       → tábor pro Jiříka
--   5 400 Kč  „Kučerovi" (2. 7.)      → nejspíš JUDr. Zeman — ale viz níž
--
-- Spustit v Supabase SQL Editoru. Dá se pustit opakovaně.
-- ══════════════════════════════════════════════════════════════════════════


-- ── A) Servis Toyoty ──────────────────────────────────────────────────────
update fin_transakce
   set kategorie_id = coalesce(
         (select id from fin_kategorie where nazev = 'Servis a opravy'),
         (select id from fin_kategorie where nazev in ('Leasing aut','Leasing / auto') limit 1)),
       projekt_id   = (select id from fin_projekty where nazev = 'Auta'),
       subjekt_typ  = 'auto',
       subjekt_id   = (select id::text from auta where nazev = 'Toyota Corolla')
 where zdroj = 'import' and coalesce(popis,'') ilike '%DOMANSKYZDIBY%';

insert into fin_protistrany (cislo, nazev, poznamka)
values ('DOMANSKYZDIBY', 'Domanský Zdiby — autoservis', 'Servis Toyoty')
on conflict (cislo) do update set nazev = excluded.nazev, poznamka = excluded.poznamka;

insert into fin_pravidla (vzor, smer, kategorie_id, projekt_id, subjekt_typ, subjekt_id, priorita)
select 'domanskyzdiby', 'vydaj',
       coalesce((select id from fin_kategorie where nazev = 'Servis a opravy'),
                (select id from fin_kategorie where nazev in ('Leasing aut','Leasing / auto') limit 1)),
       (select id from fin_projekty where nazev = 'Auta'),
       'auto', (select id::text from auta where nazev = 'Toyota Corolla'), 12
on conflict (lower(vzor)) do update
  set smer=excluded.smer, kategorie_id=excluded.kategorie_id, projekt_id=excluded.projekt_id,
      subjekt_typ=excluded.subjekt_typ, subjekt_id=excluded.subjekt_id;


-- ── B) Tábor pro Jiříka ───────────────────────────────────────────────────
update fin_transakce
   set kategorie_id = (select id from fin_kategorie where nazev = 'Děti'),
       subjekt_typ  = 'osoba',
       subjekt_id   = (select id::text from deti where jmeno = 'Jiřík')
 where zdroj = 'import' and coalesce(protistrana,'') like '2203047799%';

insert into fin_protistrany (cislo, nazev, poznamka)
values ('2203047799', 'Tábor Kocanďák', 'Účastnický poplatek za tábor — Jiřík')
on conflict (cislo) do update set nazev = excluded.nazev, poznamka = excluded.poznamka;


-- ══════════════════════════════════════════════════════════════════════════
-- C) TĚCH 5 400 — spusť jen když si to ověříš
--
-- Částka sedí přesně na platbu Zemanovi z 27. 3. a popis „Kučerovi" je
-- stejný jako u jeho platby z 29. 6. („VS2026039 Kučerovi"). ALE:
--
--     Zemanův účet   2114821260/2700   (UniCredit)  — 4 platby
--     tahle platba   2478992001/5500   (Raiffeisen) — 1 platba
--
-- Jiná banka, jiné číslo. Buď má Zeman druhý účet, nebo to je někdo jiný.
-- Pravidlo na to nedělám — jedna platba pravidlo nepotřebuje a číslo účtu,
-- kterým si nejsi jistý, je přesně ta past, co zamořila SJM.
-- ══════════════════════════════════════════════════════════════════════════

-- update fin_transakce
--    set kategorie_id = (select id from fin_kategorie where nazev = 'Právní / správní'),
--        projekt_id   = (select id from fin_projekty where nazev = 'Právník Zeman')
--  where zdroj = 'import' and coalesce(protistrana,'') like '2478992001%';


-- ── Kontrola ─────────────────────────────────────────────────────────────
select coalesce(a.nazev,'—') as auto, k.nazev as za_co, count(*), sum(-t.castka)::int as celkem
  from fin_transakce t
  left join auta a on a.id::text = t.subjekt_id::text and t.subjekt_typ = 'auto'
  left join fin_kategorie k on k.id = t.kategorie_id
 where t.zdroj = 'import' and t.castka < 0 and t.projekt_id = (select id from fin_projekty where nazev = 'Auta')
 group by 1,2 order by 1,4 desc;
