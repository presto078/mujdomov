-- ══════════════════════════════════════════════════════════════════════════
-- SRPNOVÉ ZŮSTATKY HOTOVOSTI
--
-- Tři ze čtyř hotovostních účtů neměly srpnový zápis, takže appka dosazovala
-- červencová čísla. Podle toho, cos řekl:
--
--   Peněženka          200 Kč   — stejná jako minulý měsíc
--   Úspory Aquapark      0 Kč   — vybráno na nulu
--   Úspory Doma     18 000 Kč   — odloženo na právníka
--
-- Úspory Revoluční tam nechávám, jak jsou (2 000 z července) — o těch jsi
-- nic neřekl. Když to nesedí, přepiš to v Importu nebo v Majetku.
--
-- Spustit v Supabase SQL Editoru. Dá se pustit opakovaně.
-- ══════════════════════════════════════════════════════════════════════════

insert into fin_stavy (ucet_id, rok, mesic, stav)
select u.id, 2026, 8, v.stav
  from (values ('Peněženka', 200), ('Úspory Aquapark', 0), ('Úspory Doma', 18000))
       as v(nazev, stav)
  join fin_ucty u on trim(u.nazev) = v.nazev
on conflict (ucet_id, rok, mesic) do update set stav = excluded.stav;


-- ── Kontrola ─────────────────────────────────────────────────────────────
select u.nazev, s.rok, s.mesic, s.stav::int
  from fin_stavy s join fin_ucty u on u.id = s.ucet_id
 where u.skupina = 'hotovost' and s.rok = 2026 and s.mesic >= 6
 order by u.nazev, s.mesic;

select sum(s.stav)::int as hotovost_srpen
  from fin_stavy s join fin_ucty u on u.id = s.ucet_id
 where u.skupina = 'hotovost' and s.rok = 2026 and s.mesic = 8;
-- Očekávaně 20 200 Kč (200 + 0 + 18 000 + 2 000 Revoluční).
