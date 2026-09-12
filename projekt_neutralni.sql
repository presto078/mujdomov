-- ══════════════════════════════════════════════════════════════════════════
-- PRŮBĚŽNÝ PROJEKT SE NEPOČÍTÁ DO PŘÍJMŮ ANI VÝDAJŮ
--
-- Srpen ukazoval příjem 226 198 Kč. Reálně jich bylo 152 732 — zbytek byly
-- peníze, které účtem jen protekly:
--
--    21 694 Kč  Aquadream proplatil pojistky a známky firemních aut
--    13 939 Kč  David poslal za kabelku
--    13 729 Kč  Alza vrátila peníze za vrácené zboží
--    24 104 Kč  dětský účet (na ten se nesahá, ten se počítá zvlášť už teď)
--
-- První dvě věci řeší tenhle sloupec, třetí appka pozná sama: příchozí platba
-- s výdajovou kategorií je vratka a odečte se od té kategorie místo aby se
-- přičetla k příjmům.
--
-- Spustit v Supabase SQL Editoru. Dá se pustit opakovaně.
-- ══════════════════════════════════════════════════════════════════════════


-- ── A) Sloupec ────────────────────────────────────────────────────────────
alter table fin_projekty add column if not exists neutralni boolean not null default false;


-- ── B) Zapnout u Průběžných položek ───────────────────────────────────────
update fin_projekty set neutralni = true where nazev = 'Průběžné položky';


-- ── C) Doklepnout proplacené výdaje, které mají starou kategorii ──────────
-- Vratky od Aquadreamu se zaúčtovaly jako Příjem z podnikání nebo Mzda ještě
-- předtím, než vznikla kategorie Proplacené výdaje. Do projektu patří všechny.
update fin_transakce
   set projekt_id   = (select id from fin_projekty  where nazev = 'Průběžné položky'),
       kategorie_id = (select id from fin_kategorie where nazev = 'Proplacené výdaje')
 where zdroj = 'import' and castka > 0
   and coalesce(popis,'') ilike '%AQUADREAM%'
   and (   coalesce(popis,'') ilike '%pojištění%'
        or coalesce(popis,'') ilike '%pojisteni%'
        or coalesce(popis,'') ilike '%dálniční%'
        or coalesce(popis,'') ilike '%dalnicni%'
        or coalesce(popis,'') ilike '%workspace%'
        or coalesce(popis,'') ilike '%domény%'
        or coalesce(popis,'') ilike '%domeny%');


-- ── Kontrola ─────────────────────────────────────────────────────────────
select to_char(t.datum,'YYYY-MM') as mesic,
       sum(-t.castka) filter (where t.castka < 0)::int as zaplaceno,
       sum( t.castka) filter (where t.castka > 0)::int as vraceno,
       sum(t.castka)::int as rozdil
  from fin_transakce t join fin_projekty p on p.id = t.projekt_id
 where p.nazev = 'Průběžné položky'
 group by 1 order by 1;

-- Vratky — příchozí platby s výdajovou kategorií. Tyhle se nově odečtou
-- od svojí kategorie místo aby se přičetly k příjmům.
select to_char(t.datum,'YYYY-MM') as mesic, k.nazev as kategorie,
       count(*) as plateb, sum(t.castka)::int as vraceno
  from fin_transakce t join fin_kategorie k on k.id = t.kategorie_id
 where t.zdroj = 'import' and t.castka > 0 and k.typ = 'vydaj'
 group by 1,2 order by 1,4 desc;
