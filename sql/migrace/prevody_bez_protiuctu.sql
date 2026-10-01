-- ══════════════════════════════════════════════════════════════════════════
-- PŘEVODY, KTERÉ PŘEVODY NEJSOU
--
-- Převod znamená, že peníze odešly z jednoho tvého účtu na druhý — proto se
-- do výdajů nepočítá. Jenže 36 plateb je označených jako převod a přitom
-- nemají protiúčet. Peníze tedy odešly ven a v rozpočtu po nich nezůstala
-- stopa. Ve výdajích chybí 48 214 Kč, jen za srpen 48 214 z toho:
--
--    16 324 Kč  pojistka CPP.CZ (platba kartou)
--     8 000 Kč  výběr hotovosti
--     5 370 Kč  dálniční známky (EDALNICE, 3×)
--       973 Kč  T-Mobile
--       680 Kč  Google Workspace
--    16 867 Kč  odchozí platba z Fia s popisem FAKTURA VYDANA  ← co to je?
--
-- Logika opravy: když peníze odešly a nemají protiúčet, ze systému zmizely,
-- takže je to výdaj. U příchozích je to totéž obráceně — až na dvě výjimky,
-- které převody opravdu jsou a zůstávají:
--
--   • VAŠE PLATBA - DĚKUJEME  → splátka kreditky, druhá noha je taky tvůj účet
--   • Vklad hotovosti          → peníze z peněženky, ta se vede zvlášť
--
-- Pavlíniny platby (10 000 důchod + 950 internet) se nechávají, jak jsou —
-- ty jsi jako převod označil sám. Stojí ale za rozmyšlenou: převod bez
-- protiúčtu je černá díra a je to 10 950 Kč měsíčně.
--
-- Spustit v Supabase SQL Editoru. Dá se pustit opakovaně.
-- ══════════════════════════════════════════════════════════════════════════


-- ── A) Odchozí bez protiúčtu = výdaj ──────────────────────────────────────
update fin_transakce
   set typ = 'vydaj'
 where zdroj = 'import'
   and typ = 'prevod'
   and prevod_ucet_id is null
   and castka < 0;


-- ── B) Příchozí bez protiúčtu = příjem, kromě dvou skutečných převodů ─────
update fin_transakce
   set typ = 'prijem'
 where zdroj = 'import'
   and typ = 'prevod'
   and prevod_ucet_id is null
   and castka > 0
   and coalesce(popis,'')  not ilike '%VAŠE PLATBA%'
   and coalesce(popis,'')  not ilike '%Vklad hotovosti%'
   and coalesce(popis,'')  not ilike '%důchod v hotovosti%'
   and coalesce(popis,'')  not ilike '%Internet + TV%';


-- ── Kontrola ─────────────────────────────────────────────────────────────
-- Co po opravě zůstalo jako převod bez protiúčtu (mělo by být jen kreditka,
-- vklady hotovosti a Pavlína).
select to_char(t.datum,'YYYY-MM') as mesic, u.nazev as ucet,
       t.castka::int, left(coalesce(t.popis,''),46) as popis
  from fin_transakce t join fin_ucty u on u.id = t.ucet_id
 where t.zdroj = 'import' and t.typ = 'prevod' and t.prevod_ucet_id is null
 order by t.datum desc;

-- Kolik se přesunulo do výdajů a příjmů.
select to_char(datum,'YYYY-MM') as mesic,
       sum(-castka) filter (where castka < 0)::int as pribylo_ve_vydajich,
       sum( castka) filter (where castka > 0)::int as pribylo_v_prijmech
  from fin_transakce
 where zdroj = 'import' and typ in ('vydaj','prijem') and prevod_ucet_id is null
   and datum >= '2026-01-01'
 group by 1 order by 1;
