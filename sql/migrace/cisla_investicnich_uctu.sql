-- ══════════════════════════════════════════════════════════════════════════
-- ČÍSLA ÚČTŮ U INVESTIC — ať se převody párují samy
--
-- Portu, penzijko a stavebko v appce žádné číslo účtu neměly, takže je import
-- neuměl spárovat a platby na ně padaly jako výdaj. Řešili jsme to pravidly
-- s `prevod_ucet_id`, ale doplnit rovnou číslo je čistší: import pak protiúčet
-- pozná stejně jako u převodu mezi Airbankou a KB, bez jakéhokoli pravidla.
--
-- Čísla vyčtená z protiúčtů ve výpisech:
--   Portu Investiční        76788295/2010    (Fio)
--   Penzijní připojištění   7142110004/2700  (UniCredit)
--   RB Stavební Spořitelna  4975165604/7950  (Raiffeisen stavební spořitelna)
--
-- Spustit v Supabase SQL Editoru. Dá se pustit opakovaně.
-- ══════════════════════════════════════════════════════════════════════════

update fin_ucty set cislo_uctu = '76788295',   kod_banky = '2010' where trim(nazev) = 'Portu Investiční'       and cislo_uctu is null;
update fin_ucty set cislo_uctu = '7142110004', kod_banky = '2700' where trim(nazev) = 'Penzijní připojištění'  and cislo_uctu is null;
update fin_ucty set cislo_uctu = '4975165604', kod_banky = '7950' where trim(nazev) = 'RB Stavební Spořitelna' and cislo_uctu is null;


-- ── Zpětně: platby na stavebko, které se ještě nespárovaly ────────────────
update fin_transakce t
   set typ = 'prevod', prevod_ucet_id = u.id, kategorie_id = null
  from fin_ucty u
 where trim(u.nazev) = 'RB Stavební Spořitelna'
   and t.zdroj = 'import'
   and t.castka < 0
   and t.typ <> 'prevod'
   and (   coalesce(t.protistrana,'') like '4975165604%'
        or coalesce(t.popis,'')||' '||coalesce(t.poznamka,'') ilike '%stavební spoření%');

-- Pravidlo jako pojistka, kdyby některá banka protiúčet neposlala.
insert into fin_pravidla (vzor, smer, typ, prevod_ucet_id, priorita)
select 'stavebni sporeni', 'vydaj', 'prevod', u.id, 8
  from fin_ucty u where trim(u.nazev) = 'RB Stavební Spořitelna'
on conflict (lower(vzor)) do update
  set smer = excluded.smer, typ = excluded.typ, prevod_ucet_id = excluded.prevod_ucet_id;


-- ── Kontrola ─────────────────────────────────────────────────────────────
select u.nazev, u.cislo_uctu, u.kod_banky, u.skupina,
       (select count(*) from fin_transakce t where t.prevod_ucet_id = u.id) as prevodu_na_ucet
  from fin_ucty u
 where u.skupina = 'investice'
 order by u.nazev;
