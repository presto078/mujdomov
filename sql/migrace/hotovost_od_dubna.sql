-- ══════════════════════════════════════════════════════════════════════════
-- HOTOVOST ZAČALA AŽ V DUBNU
--
-- Nastavení „38 000 měsíčně" platilo pro všechny měsíce, protože to bylo
-- jedno číslo bez data. Ve skutečnosti do března hotovost nechodila žádná
-- a od dubna je to 38 000 (Svítek platí v hotovosti místo na účet).
--
-- Tenhle skript vynuluje leden až březen v deníku. Šablona zůstává na
-- 38 000, takže duben a dál se plní správně.
--
-- Vyžaduje hotovost.sql (ten zakládá tabulku a šablony).
-- Spustit v Supabase SQL Editoru. Dá se pustit opakovaně.
-- ══════════════════════════════════════════════════════════════════════════

-- Měsíce, které deník ještě nemá, se založí — jinak by je přehled ocenil
-- šablonou, tedy 38 000, a nula by se nikde neprojevila.
insert into fin_hotovost (mesic, nazev, castka, poradi, poznamka)
select m.mesic, 'Hotovostní příjem', 0, 10, 'Do března hotovost nechodila.'
  from (values ('2026-01'),('2026-02'),('2026-03')) as m(mesic)
 where not exists (select 1 from fin_hotovost h
                    where h.mesic = m.mesic and h.nazev = 'Hotovostní příjem');

update fin_hotovost
   set castka = 0, poznamka = 'Do března hotovost nechodila.'
 where mesic in ('2026-01','2026-02','2026-03')
   and nazev = 'Hotovostní příjem';


-- ── Kontrola ─────────────────────────────────────────────────────────────
select coalesce(mesic,'— šablona —') as mesic,
       sum(castka) filter (where castka > 0)::int as prijde,
       sum(-castka) filter (where castka < 0)::int as odejde,
       sum(castka)::int as cisty_prinos
  from fin_hotovost where aktivni
 group by 1 order by 1;

-- Ručně zapsané zůstatky hotovostních účtů — u tří z nich chybí srpen.
select u.nazev, s.rok, s.mesic, s.stav::int
  from fin_stavy s join fin_ucty u on u.id = s.ucet_id
 where u.skupina = 'hotovost' and s.rok = 2026
 order by u.nazev, s.rok, s.mesic;
