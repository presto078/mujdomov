-- ══════════════════════════════════════════════════════════════════════════
-- OPRAVA SJM — do vypořádání se počítaly cizí platby
--
-- Pravidlo na účet 2226222/0800 posílalo do projektu SJM všechno, co na ten
-- účet odejde. Jenže je to sběrný účet pojišťovny, takže tam kromě Tereziny
-- pojistky 437 Kč chodí i:
--     1 512 Kč  životní pojištění Jiřího   (7×)
--    19 856 Kč  QR platba                  (1×)
--     4 648 Kč  pojistka Kia ceed          (1×)
--     4 469 Kč  QR platba                  (2×)
-- a k tomu se vrátilo i 32 682 Kč „Daně 2025".
--
-- Dohromady 76 708 Kč, o které bylo vypořádání nadhodnocené.
--
-- Spustit v Supabase SQL Editoru. Dá se pustit opakovaně.
-- ══════════════════════════════════════════════════════════════════════════


-- ── A) Zrušit pravidlo na číslo účtu ──────────────────────────────────────
-- Terezinu pojistku spolehlivě pozná pravidlo „pojisteni tereza", které už
-- existuje. Pravidlo na číslo účtu je jen širší a škodí.
delete from fin_pravidla where vzor = '2226222/0800';


-- ── B) Splátku domu poznat podle textu, ne podle příjemce ─────────────────
-- „Odchozí úhrada — Tereza" chytalo i daně za děti. Všech osm splátek domu
-- má v popisu slovo „dům" (Dům splátka / Splátka dům / Platba za dům /
-- Úhrada dům) a nic jiného ho nemá — ověřeno, 8 plateb po 28 000 Kč.
update fin_pravidla set vzor = 'dum', smer = 'vydaj'
 where vzor = 'Odchozí úhrada — Tereza';


-- ── C) Vyhodit z projektu, co tam nepatří ─────────────────────────────────
update fin_transakce t
   set projekt_id = null
  from fin_projekty p
 where p.id = t.projekt_id
   and p.nazev = 'SJM Tereza'
   and t.zdroj = 'import'
   and t.castka < 0
   and abs(t.castka) <> 28000        -- splátka domu
   and abs(t.castka) <> 437;         -- pojistka Terezy


-- ── Kontrola ─────────────────────────────────────────────────────────────
select to_char(t.datum,'YYYY-MM') as mesic,
       sum(-t.castka) filter (where -t.castka = 28000)::int as splatka_domu,
       sum(-t.castka) filter (where -t.castka = 437)::int   as pojistka,
       sum(-t.castka)::int as celkem
  from fin_transakce t join fin_projekty p on p.id = t.projekt_id
 where p.nazev = 'SJM Tereza' and t.castka < 0
 group by 1 order by 1;
-- Očekávaně: 28 437 Kč každý měsíc a nic jiného.

select (select zaplaceno_pred from fin_projekty where nazev = 'SJM Tereza')
     + coalesce((select sum(-t.castka) from fin_transakce t join fin_projekty p on p.id = t.projekt_id
                  where p.nazev = 'SJM Tereza' and t.castka < 0), 0)
     + coalesce((select sum(x.castka) from fin_projekt_platby x join fin_projekty p on p.id = x.projekt_id
                  where p.nazev = 'SJM Tereza'), 0) as zaplaceno_celkem;
-- Očekávaně kolem 843 000 Kč z milionu.
