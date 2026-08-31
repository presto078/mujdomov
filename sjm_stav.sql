-- ══════════════════════════════════════════════════════════════════════════
-- SJM TEREZA — doplnění skutečného stavu z Google Sheetu
-- Spustit až PO supabase_projekty.sql.
-- ══════════════════════════════════════════════════════════════════════════

-- Zaplaceno od května 2024 do prosince 2025, tedy všechno před začátkem
-- importu výpisů. Rok 2024 = 269 197 Kč, rok 2025 = 346 457 Kč.
-- Platby roku 2026 už si projekt sečte sám z naimportovaných výpisů.
update fin_projekty
   set zaplaceno_pred = 615654,
       cilova_castka  = 1000000,
       mesicni_castka = 28000,
       datum_do       = date '2027-02-28',
       poznamka       = 'Vypořádání SJM. Do 12/2025 zaplaceno 615 654 Kč (sheet). '
                        'Od 1/2026 se platby berou z výpisů. Pozor: paušál O2 387 Kč '
                        'a Kooperativa 437 Kč měsíčně se z výpisů samy nespárují — '
                        'chodí v rámci větších faktur.'
 where nazev = 'SJM Tereza';

-- Kontrola: kolik projekt vidí zaplaceno a kolik zbývá
select p.nazev,
       p.zaplaceno_pred,
       coalesce(sum(case when t.castka < 0 then -t.castka end),0) as z_vypisu,
       p.zaplaceno_pred + coalesce(sum(case when t.castka < 0 then -t.castka end),0) as zaplaceno_celkem,
       p.cilova_castka - (p.zaplaceno_pred + coalesce(sum(case when t.castka < 0 then -t.castka end),0)) as zbyva
  from fin_projekty p
  left join fin_transakce t on t.projekt_id = p.id
 where p.nazev = 'SJM Tereza'
 group by p.id, p.nazev, p.zaplaceno_pred, p.cilova_castka;
