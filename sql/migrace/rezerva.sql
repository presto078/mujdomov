-- ══════════════════════════════════════════════════════════════════════════
-- REZERVA — které účty jsou „stranou"
--
-- Rezerva není vlastnost skupiny účtů (spořicí účet může být i cíl na něco
-- konkrétního), takže se u účtu přepíná ručně. V Majetku je u každého
-- likvidního účtu odkaz „označit jako rezervu".
--
-- Předvyplňuje se to, co Jirka za rezervu považuje: Moneta Spořící
-- a Raiffeisen Spořící.
--
-- Spustit v Supabase SQL Editoru. Dá se pustit opakovaně.
-- ══════════════════════════════════════════════════════════════════════════

alter table fin_ucty add column if not exists rezerva boolean not null default false;

update fin_ucty set rezerva = true
 where trim(nazev) in ('Moneta Spořící','Raiffeisen Spořící');


-- ── Kontrola: jak se rezerva vyvíjela ────────────────────────────────────
select s.rok, s.mesic, sum(s.stav)::int as rezerva_celkem
  from fin_stavy s join fin_ucty u on u.id = s.ucet_id
 where u.rezerva and s.rok >= 2025
 group by 1,2 order by 1,2;

-- Kolik do ní měsíčně přiteče a kolik se vybere.
select to_char(t.datum,'YYYY-MM') as mesic,
       sum( t.castka) filter (where t.castka > 0)::int as prislo,
       sum(-t.castka) filter (where t.castka < 0)::int as vybrano,
       sum( t.castka)::int as netto
  from fin_transakce t join fin_ucty u on u.id = t.ucet_id
 where u.rezerva and t.zdroj = 'import' and t.datum >= '2026-01-01'
 group by 1 order by 1;
