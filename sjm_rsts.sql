-- ══════════════════════════════════════════════════════════════════════════
-- SPLÁTKA ÚVĚRU RSTS — NENÍ SOUČÁST SJM
--
-- Trvalý příkaz „TEREZA SPLÁTKA ÚVĚRU RSTS", 3 000 Kč měsíčně z komerčky,
-- posílá Jirka Tereze NAVÍC k vypořádání, neodečítá se z milionu. Do
-- projektu SJM Tereza proto nepatří — jinak by odpočet tvrdil, že je cíl
-- blíž, než ve skutečnosti je.
--
-- Dostane jen kategorii, aby se dalo sečíst, kolik Tereze mimo vypořádání
-- posíláš.
--
-- Spustit v Supabase SQL Editoru. Dá se pustit opakovaně.
-- ══════════════════════════════════════════════════════════════════════════

insert into fin_pravidla (vzor, smer, kategorie_id, priorita)
select 'splatka uveru rsts', 'vydaj', k.id, 5
  from fin_kategorie k where lower(trim(k.nazev)) = 'rozvod s terezou'
on conflict (lower(vzor)) do update
  set smer = excluded.smer, kategorie_id = excluded.kategorie_id,
      projekt_id = null, priorita = excluded.priorita;

-- Kdyby se to už stihlo zařadit pod SJM, vzít mu to zpátky.
update fin_transakce t
   set projekt_id = null
  from fin_projekty p
 where p.id = t.projekt_id and p.nazev = 'SJM Tereza'
   and t.zdroj = 'import'
   and coalesce(t.popis,'')||' '||coalesce(t.poznamka,'') ilike '%ÚVĚRU RSTS%';


-- ══ Kontrola: co pod SJM zůstalo ═════════════════════════════════════════
select to_char(t.datum,'YYYY-MM') as mesic,
       sum(-t.castka) filter (where -t.castka = 28000)::int as splatka_domu,
       sum(-t.castka) filter (where -t.castka = 437)::int   as pojistka_terezy,
       sum(-t.castka) filter (where -t.castka not in (28000,437))::int as ostatni,
       sum(-t.castka)::int as celkem
  from fin_transakce t
  join fin_projekty p on p.id = t.projekt_id
 where p.nazev = 'SJM Tereza' and t.castka < 0
 group by 1 order by 1;
-- Očekávaně: 28 000 každý měsíc, k tomu 437 pojistka. Nic jiného.
