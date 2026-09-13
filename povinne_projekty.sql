-- ══════════════════════════════════════════════════════════════════════════
-- NE KAŽDÝ PROJEKT JE POVINNÁ PLATBA
--
-- Povinné závazky braly všechno, co má projekt. Jenže „Vanesa — účet" je
-- sledovací projekt, ne závazek — proto mezi povinnými platbami svítilo
-- 4 450 Kč v kategorii Potraviny a drogerie. Svatba a Právník jsou zase
-- jednorázové akce, ne něco, co se musí platit každý měsíc.
--
-- Projekt teď říká sám, jestli je povinný. Akce (typ = 'akce') se za povinné
-- neberou nikdy, u ostatních rozhoduje tenhle příznak.
--
-- Spustit v Supabase SQL Editoru. Dá se pustit opakovaně.
-- ══════════════════════════════════════════════════════════════════════════

alter table fin_projekty add column if not exists povinny boolean not null default true;

-- Sledovací projekty — peníze se hlídají, ale povinné to není.
update fin_projekty set povinny = false
 where nazev in ('Vanesa — účet','Průběžné položky','Příspěvky na péči');


-- ── Kontrola ─────────────────────────────────────────────────────────────
select nazev, typ, povinny, neutralni, mesicni_castka::int
  from fin_projekty order by povinny desc, poradi;

-- Co se nově počítá jako povinné a kolik to měsíčně dělá.
select p.emoji, p.nazev,
       round(sum(-t.castka)/8)::int as mesicne,
       count(*) as plateb
  from fin_transakce t join fin_projekty p on p.id = t.projekt_id
 where t.zdroj = 'import' and t.castka < 0 and t.datum >= '2026-01-01'
   and p.povinny and p.typ <> 'akce'
 group by 1,2 order by 3 desc;
