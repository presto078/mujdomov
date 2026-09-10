-- ══════════════════════════════════════════════════════════════════════════
-- ROZDĚLENÍ KATEGORIE „LEASING / AUTO"
--
-- Jedna kategorie dělala tři různé práce naráz: splátky leasingu, opravy
-- a dálniční známky. Proto v ní byla směsice, ve které nešlo nic poznat.
--
-- Po rozdělení:
--   🚗 Leasing aut          jen měsíční splátky (Renault, Toyota, Kia)
--   🔧 Servis a opravy      opravy, pneumatiky, brzdy, autoservis
--   🛣 Dálniční známky      EDALNICE
--   🛡 Pojistky (už je)     pojistky aut
--
-- Původní kategorie se jen přejmenuje, takže si drží id a všechna pravidla,
-- která na ni ukazují, dál fungují.
--
-- Které auto to bylo, se dál řeší rozměrem „koho se týká" — ten už vyplněný
-- je. Projekt Auta zůstává jeden a nově se v něm dá přepnout na rozpad
-- podle kategorie nebo podle auta.
--
-- Spustit v Supabase SQL Editoru. Dá se pustit opakovaně.
-- ══════════════════════════════════════════════════════════════════════════


-- ── A) Nové kategorie ─────────────────────────────────────────────────────
insert into fin_kategorie (nazev, typ, emoji, barva, poradi)
select 'Servis a opravy', 'vydaj', '🔧', '#c87000', 12
 where not exists (select 1 from fin_kategorie where nazev = 'Servis a opravy');

insert into fin_kategorie (nazev, typ, emoji, barva, poradi)
select 'Dálniční známky', 'vydaj', '🛣', '#8a8f98', 13
 where not exists (select 1 from fin_kategorie where nazev = 'Dálniční známky');

update fin_kategorie set nazev = 'Leasing aut', emoji = '🚗'
 where nazev = 'Leasing / auto';


-- ── B) Přeřadit platby, které tam nepatří ─────────────────────────────────
update fin_transakce
   set kategorie_id = (select id from fin_kategorie where nazev = 'Servis a opravy')
 where zdroj = 'import' and castka < 0
   and (   coalesce(popis,'') ilike '%oprava%'
        or coalesce(popis,'') ilike '%autoservis%'
        or coalesce(popis,'') ilike '%pneumatik%'
        or coalesce(popis,'') ilike '%brzd%'
        or coalesce(protistrana,'') like '216515214%');   -- Kučera Hoštice, autoservis

update fin_transakce
   set kategorie_id = (select id from fin_kategorie where nazev = 'Dálniční známky')
 where zdroj = 'import' and castka < 0
   and coalesce(popis,'') ilike '%EDALNICE%';

update fin_transakce
   set kategorie_id = (select id from fin_kategorie where nazev = 'Pojistky')
 where zdroj = 'import' and castka < 0
   and coalesce(popis,'') ilike '%pojistka%'
   and kategorie_id = (select id from fin_kategorie where nazev = 'Leasing aut');


-- ── C) Pravidla, ať to příští import zařadí sám ───────────────────────────
insert into fin_pravidla (vzor, smer, kategorie_id, projekt_id, priorita)
select 'oprava', 'vydaj',
       (select id from fin_kategorie where nazev = 'Servis a opravy'),
       (select id from fin_projekty  where nazev = 'Auta'), 12
on conflict (lower(vzor)) do update
  set smer=excluded.smer, kategorie_id=excluded.kategorie_id, projekt_id=excluded.projekt_id;

insert into fin_pravidla (vzor, smer, kategorie_id, projekt_id, priorita)
select 'pneumatiky', 'vydaj',
       (select id from fin_kategorie where nazev = 'Servis a opravy'),
       (select id from fin_projekty  where nazev = 'Auta'), 12
on conflict (lower(vzor)) do update
  set smer=excluded.smer, kategorie_id=excluded.kategorie_id, projekt_id=excluded.projekt_id;

insert into fin_pravidla (vzor, smer, kategorie_id, projekt_id, priorita)
select 'autoservis', 'vydaj',
       (select id from fin_kategorie where nazev = 'Servis a opravy'),
       (select id from fin_projekty  where nazev = 'Auta'), 12
on conflict (lower(vzor)) do update
  set smer=excluded.smer, kategorie_id=excluded.kategorie_id, projekt_id=excluded.projekt_id;

-- EDALNICE už pravidlo má (míří do Průběžných položek, protože je platí
-- Aquadream) — mění se mu jen kategorie, projekt zůstává.
update fin_pravidla
   set kategorie_id = (select id from fin_kategorie where nazev = 'Dálniční známky')
 where lower(vzor) = 'edalnice';


-- ── Kontrola ─────────────────────────────────────────────────────────────
select k.emoji, k.nazev, count(*) as plateb, sum(-t.castka)::int as celkem
  from fin_transakce t join fin_kategorie k on k.id = t.kategorie_id
 where t.zdroj = 'import' and t.castka < 0 and t.datum >= '2026-01-01'
   and k.nazev in ('Leasing aut','Servis a opravy','Dálniční známky','Pojistky')
 group by 1,2 order by 4 desc;

-- Kolik stojí které auto, rozpadem na kategorie.
select coalesce(a.nazev,'? neurčeno') as auto, k.nazev as za_co,
       count(*) as plateb, sum(-t.castka)::int as celkem
  from fin_transakce t
  left join auta a on a.id::text = t.subjekt_id::text
  left join fin_kategorie k on k.id = t.kategorie_id
 where t.zdroj = 'import' and t.castka < 0 and t.subjekt_typ = 'auto'
 group by 1,2 order by 1, 4 desc;
