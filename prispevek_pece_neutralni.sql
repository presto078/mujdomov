-- ══════════════════════════════════════════════════════════════════════════
-- PŘÍSPĚVEK NA PÉČI SE DO ROZPOČTU NEPOČÍTÁ
--
-- Z ÚP chodí na Airbanku 16 100 + 900 Kč měsíčně a druhý den odcházejí na
-- dětský účet jako „Patrik PnP". Jsou to Patrikovy peníze, ne Jirkovy.
--
-- Proč neutrální projekt a ne příjem + výdaj:
--
-- Ten odchozí pohyb je převod mezi dvěma Jirkovými účty (Airbank Hlavní →
-- Airbank Spořící děti). Kdyby se z něj udělal výdaj, přestane sedět kontrola
-- „počáteční + příjmy − výdaje ± převody = konečný" — na Airbance by výdaj
-- přebýval a na dětském účtu by příjem neměl párovou nohu. Neutrální projekt
-- dělá totéž (na zbývá na život to nemá vliv), ale nerozbíjí párování.
--
-- Školkovné Mannaz se platí přímo z dětského účtu, který je mimo rozpočet
-- už teď — takže se nic dalšího řešit nemusí.
--
-- Dopad: příjem srpna klesne ze 151 037 na 134 037 Kč, průměr zhruba
-- o 17 225 Kč měsíčně. Čísla se zmenší, ale říkají pravdu o tom, s čím
-- Jirka opravdu hospodaří.
--
-- Spustit v Supabase SQL Editoru. Dá se pustit opakovaně.
-- Vyžaduje projekt_neutralni.sql (ten zakládá sloupec `neutralni`).
-- ══════════════════════════════════════════════════════════════════════════

update fin_projekty
   set neutralni = true,
       poznamka  = 'Příspěvek na péči a na mobilitu pro Patrika. Z ÚP přijde na Airbanku a odchází na dětský účet — nejsou to peníze, se kterými se hospodaří, proto se do příjmů ani výdajů nepočítají. Školkovné Mannaz se platí přímo z dětského účtu.'
 where nazev = 'Příspěvky na péči';


-- ── Kontrola ─────────────────────────────────────────────────────────────
select nazev, typ, neutralni from fin_projekty order by poradi;

-- Kolik projektem za měsíc proteče a kolik z toho zůstává dětem.
select to_char(t.datum,'YYYY-MM') as mesic,
       sum( t.castka) filter (where t.castka > 0)::int as prislo,
       sum(-t.castka) filter (where t.castka < 0)::int as odeslo
  from fin_transakce t join fin_projekty p on p.id = t.projekt_id
 where p.nazev = 'Příspěvky na péči'
 group by 1 order by 1;
