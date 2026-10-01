-- ══════════════════════════════════════════════════════════════════════════
-- DVĚ PRAVIDLA, KTERÁ SE PROJEVILA AŽ PO ÚKLIDU
--
-- 1) SJM chytá daně za děti přes číslo účtu
--    `oprava_sjm.sql` zrušil pravidlo na účet pojišťovny, ale úplně stejnou
--    chybu dělá druhé pravidlo: vzor `1763986028` je Terezino číslo účtu
--    s prioritou 5, takže do vypořádání spadne všechno, co na ten účet odejde
--    — včetně platby 32 682 Kč „Daně 2025" z 20. 5. Po zpětném uplatnění
--    pravidel se tam vrátila.
--
--    Splátku domu spolehlivě pozná pravidlo `dum` (8 plateb po 28 000, žádný
--    falešný zásah) a pojistku pravidlo `pojisteni tereza`. Pravidlo na číslo
--    účtu je jen širší a škodí.
--
--    Po opravě: zaplaceno 843 150 z milionu, zbývá 156 850.
--
-- 2) Google Workspace se nepáruje kvůli hvězdičce
--    Vratka od Aquadreamu má v popisu „Google Workspace", ale odchozí platba
--    kartou „GOOGLE*WORKSPACE" — s hvězdičkou. Vzor `google workspace` proto
--    sedí jen na jednu stranu a v Průběžných položkách visí 2 135 Kč příjmu
--    bez odpovídajícího výdaje. Vzor `workspace` chytí obojí.
--
-- Spustit v Supabase SQL Editoru. Dá se pustit opakovaně.
-- ══════════════════════════════════════════════════════════════════════════


-- ── A) Zrušit pravidlo na Terezino číslo účtu ─────────────────────────────
delete from fin_pravidla where vzor = '1763986028';

-- Redundantní pravidlo na konkrétní měsíc, `dum` ho pokrývá.
delete from fin_pravidla where lower(vzor) = 'úhrada dům 0726';


-- ── B) Vyhodit z SJM, co tam nepatří ──────────────────────────────────────
update fin_transakce t
   set projekt_id = null
  from fin_projekty p
 where p.id = t.projekt_id
   and p.nazev = 'SJM Tereza'
   and t.zdroj = 'import'
   and t.castka < 0
   and abs(t.castka) <> 28000
   and abs(t.castka) <> 437;


-- ── C) Google Workspace na obě strany ─────────────────────────────────────
update fin_pravidla set vzor = 'workspace' where lower(vzor) = 'google workspace';

update fin_transakce
   set projekt_id = (select id from fin_projekty where nazev = 'Průběžné položky')
 where zdroj = 'import'
   and coalesce(popis,'') ilike '%WORKSPACE%'
   and projekt_id is null;


-- ── Kontrola ─────────────────────────────────────────────────────────────
select (select zaplaceno_pred from fin_projekty where nazev = 'SJM Tereza')
     + coalesce((select sum(-t.castka) from fin_transakce t join fin_projekty p on p.id = t.projekt_id
                  where p.nazev = 'SJM Tereza' and t.castka < 0), 0) as zaplaceno_celkem;
-- Očekávaně 843 150 Kč. Zbývá 156 850, tj. 5,5 měsíce po 28 437.

select to_char(t.datum,'YYYY-MM') as mesic,
       sum(-t.castka) filter (where t.castka < 0)::int as zaplaceno,
       sum( t.castka) filter (where t.castka > 0)::int as vraceno,
       sum(t.castka)::int as rozdil
  from fin_transakce t join fin_projekty p on p.id = t.projekt_id
 where p.nazev = 'Průběžné položky'
 group by 1 order by 1;
-- Celkový rozdíl by měl vyjít kolem −3 158 Kč: −2 928 nárokovaná DPH z kabelky
-- a −230 dálniční známka, kterou Aquadream zatím neproplatil.
