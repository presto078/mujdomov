-- ══════════════════════════════════════════════════════════════════════════
-- PRŮBĚŽNÉ POLOŽKY — co zaplatíš za někoho a on ti to vrátí
--
-- Tyhle platby nejsou tvůj výdaj ani tvůj příjem, jen ti protečou účtem.
-- Teď ale v rozpočtu dělají neplechu na obě strany: výdaj visí jako převod
-- bez protiúčtu (takže není vidět) a vratka je zaúčtovaná jako Mzda nebo
-- Příjem z podnikání (takže ti nafukuje příjem).
--
-- Za rok 2026 se to páruje na korunu:
--
--   16. 3.  −15 721 CPP.CZ      ↔  12. 3.  +15 721  Pojištění Elroq
--   13. 4.  −14 932 CPP.CZ      ↔  10. 4.  +14 932  Pojištění Honda
--   17. 8.  −16 324 CPP.CZ      ↔  14. 8.  +16 324  pojištění Mazda CX-5
--   11. 8.   −2 570 EDALNICE    ↔   8. 8.   +2 570  dálniční známka Hyundai
--   28. 8.   −2 570 EDALNICE    ↔  26. 8.   +2 570  dálniční známka Mazda
--           Google Workspace    ↔          +680/682 měsíčně
--
-- Vratka chodí většinou o pár dní dřív, než to zaplatíš — takže tyhle peníze
-- na účtu nikdy nechybí. Proto je důležité je nemíchat do rozpočtu.
--
-- POZOR: dálniční známka za 230 Kč odešla z Fia dvakrát (16. a 19. 8.),
-- ale Aquadream ji proplatil jen jednou (18. 8. za Mazdu). Buď je to druhá
-- známka, kterou ti ještě dluží, nebo je jedna z těch plateb navíc.
--
-- Kabelka: 26. 8. odešlo z Fia 16 867 Kč (FAKTURA VYDANA) a David Punčochář
-- poslal na Airbanku 13 939 Kč bez DPH. 13 939 × 1,21 = 16 866 — sedí.
-- Rozdíl 2 928 Kč je DPH, kterou si nárokuješ zpět.
--
-- Spustit v Supabase SQL Editoru. Dá se pustit opakovaně.
-- ══════════════════════════════════════════════════════════════════════════


-- ── A) Kategorie pro vratky, ať nesedí v příjmech z podnikání ─────────────
insert into fin_kategorie (nazev, typ, emoji, barva, poradi)
select 'Proplacené výdaje', 'prijem', '🔁', '#8a8f98', 60
 where not exists (select 1 from fin_kategorie where nazev = 'Proplacené výdaje');


-- ── B) Obousměrný projekt ────────────────────────────────────────────────
insert into fin_projekty (nazev, emoji, typ, poznamka, poradi)
select 'Průběžné položky', '🔁', 'provoz',
       'Co zaplatíš za někoho jiného a on ti to vrátí — firemní auta Aquadreamu, nákupy pro kamarády. Mělo by se to vyrovnávat k nule; co zbývá, ti někdo dluží.', 25
 where not exists (select 1 from fin_projekty where nazev = 'Průběžné položky');


-- ── C) Pravidla — priorita 3, aby přebila obecné aquadream ────────────────
-- Odchozí: pojistky firemních aut a dálniční známky.
insert into fin_pravidla (vzor, smer, kategorie_id, projekt_id, priorita)
select 'cpp.cz', 'vydaj',
       (select id from fin_kategorie where nazev = 'Pojistky'),
       (select id from fin_projekty  where nazev = 'Průběžné položky'), 3
on conflict (lower(vzor)) do update
  set smer=excluded.smer, kategorie_id=excluded.kategorie_id,
      projekt_id=excluded.projekt_id, priorita=excluded.priorita;

insert into fin_pravidla (vzor, smer, kategorie_id, projekt_id, priorita)
select 'edalnice', 'vydaj',
       (select id from fin_kategorie where nazev = 'Leasing / auto'),
       (select id from fin_projekty  where nazev = 'Průběžné položky'), 3
on conflict (lower(vzor)) do update
  set smer=excluded.smer, kategorie_id=excluded.kategorie_id,
      projekt_id=excluded.projekt_id, priorita=excluded.priorita;

-- Příchozí: vratky od Aquadreamu. Popis vždycky říká, za co to je.
insert into fin_pravidla (vzor, smer, kategorie_id, projekt_id, priorita)
select 'aquadream a.s. · pojisteni', 'prijem',
       (select id from fin_kategorie where nazev = 'Proplacené výdaje'),
       (select id from fin_projekty  where nazev = 'Průběžné položky'), 3
on conflict (lower(vzor)) do update
  set smer=excluded.smer, kategorie_id=excluded.kategorie_id,
      projekt_id=excluded.projekt_id, priorita=excluded.priorita;

insert into fin_pravidla (vzor, smer, kategorie_id, projekt_id, priorita)
select 'dalnicni znamka', 'prijem',
       (select id from fin_kategorie where nazev = 'Proplacené výdaje'),
       (select id from fin_projekty  where nazev = 'Průběžné položky'), 3
on conflict (lower(vzor)) do update
  set smer=excluded.smer, kategorie_id=excluded.kategorie_id,
      projekt_id=excluded.projekt_id, priorita=excluded.priorita;

insert into fin_pravidla (vzor, projekt_id, priorita)
select 'google workspace',
       (select id from fin_projekty where nazev = 'Průběžné položky'), 3
on conflict (lower(vzor)) do update
  set projekt_id=excluded.projekt_id, priorita=excluded.priorita;


-- ── D) Kabelka pro Davida — jednorázovka, pravidlo nemá cenu ──────────────
update fin_transakce
   set typ = 'vydaj',
       projekt_id = (select id from fin_projekty where nazev = 'Průběžné položky'),
       kategorie_id = (select id from fin_kategorie where nazev = 'Ostatní výdaje')
 where zdroj = 'import' and castka = -16867 and coalesce(popis,'') ilike '%FAKTURA VYDANA%';

update fin_transakce
   set typ = 'prijem',
       projekt_id = (select id from fin_projekty where nazev = 'Průběžné položky'),
       kategorie_id = (select id from fin_kategorie where nazev = 'Proplacené výdaje')
 where zdroj = 'import' and castka = 13939 and coalesce(popis,'') ilike '%PUNČOCHÁŘ%';


-- ── E) Odchozí, které visely jako převod, jsou výdaje ─────────────────────
-- Totéž dělá prevody_bez_protiuctu.sql; tady jen pro jistotu na tyhle platby,
-- aby projekt sedl i bez něj.
update fin_transakce set typ = 'vydaj'
 where zdroj = 'import' and typ = 'prevod' and prevod_ucet_id is null and castka < 0
   and (coalesce(popis,'') ilike '%CPP.CZ%' or coalesce(popis,'') ilike '%EDALNICE%'
        or coalesce(popis,'') ilike '%WORKSPACE%');


-- ── Kontrola ─────────────────────────────────────────────────────────────
-- Projekt se naplní až po spuštění „🔁 Uplatnit pravidla zpětně" v Zařazení.
select to_char(t.datum,'YYYY-MM') as mesic,
       sum(-t.castka) filter (where t.castka < 0)::int as zaplaceno,
       sum( t.castka) filter (where t.castka > 0)::int as vraceno,
       sum(t.castka)::int as rozdil
  from fin_transakce t join fin_projekty p on p.id = t.projekt_id
 where p.nazev = 'Průběžné položky'
 group by 1 order by 1;
-- Rozdíl blízko nule znamená, že jste vyrovnaní. Záporné číslo = někdo ti dluží.
