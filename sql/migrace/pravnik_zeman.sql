-- ══════════════════════════════════════════════════════════════════════════
-- PRÁVNÍK ZEMAN — poznat platbu podle účtu, ne podle jména v popisu
--
-- Pravidla „judr zeman" a „zeman advokat" chytnou jen platby, kde je jméno
-- napsané v popisu. Z Fia ale odcházejí i platby na tentýž účet bez jména:
--
--    27. 3.  −5 400 Kč  „JUDr Zeman VS2026014"      ✔ chyceno
--    27. 3.  −8 100 Kč  „JUDr Zeman"                 ✔ chyceno
--    29. 6.  −8 100 Kč  „VS2026039 Kučerovi"         ✘ uteklo
--    16. 7. −10 800 Kč  „Okamžitá odchozí pla"       ✘ uteklo
--
-- Účet 2114821260/... je Zemanův, takže pravidlo na číslo je spolehlivější
-- a dnešní faktura 8 100 Kč do projektu spadne sama.
--
-- Spustit v Supabase SQL Editoru. Dá se pustit opakovaně.
-- ══════════════════════════════════════════════════════════════════════════


-- ── A) Pravidlo na číslo účtu ─────────────────────────────────────────────
insert into fin_pravidla (vzor, smer, kategorie_id, projekt_id, priorita)
select '2114821260', 'vydaj',
       (select id from fin_kategorie where nazev = 'Právní / správní'),
       (select id from fin_projekty  where nazev = 'Právník Zeman'),
       7
on conflict (lower(vzor)) do update
  set smer         = excluded.smer,
      kategorie_id = excluded.kategorie_id,
      projekt_id   = excluded.projekt_id,
      priorita     = excluded.priorita;


-- ── B) Doplnit kategorii i k těm dvěma, co už v projektu jsou ─────────────
update fin_transakce t
   set kategorie_id = (select id from fin_kategorie where nazev = 'Právní / správní')
  from fin_projekty p
 where p.id = t.projekt_id
   and p.nazev = 'Právník Zeman'
   and t.castka < 0
   and t.kategorie_id is null;


-- ── Kontrola ─────────────────────────────────────────────────────────────
-- Zbytek doplní „🔁 Uplatnit pravidla zpětně" v Zařazení.
select t.datum, (-t.castka)::int as castka, t.popis
  from fin_transakce t
 where t.zdroj = 'import' and t.protistrana like '2114821260%'
 order by t.datum;
-- Očekávaně 4 platby, celkem 32 400 Kč.
