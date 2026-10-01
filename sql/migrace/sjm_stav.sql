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
                        'Od 1/2026 se platby berou z výpisů. Nespáruje se jen paušál '
                        'O2 387 Kč — z Fia odchází jedna platba za celou fakturu a '
                        'tahle část se z ní vydělit nedá.'
 where nazev = 'SJM Tereza';

-- ── Životní pojistka Terezy ──────────────────────────────────────────────
-- Trvalý příkaz z komerčky, 437 Kč, každý měsíc kolem 13.–15. na 2226222/0800.
-- Patří do vypořádání stejně jako splátka, jen odchází jinudy.
insert into fin_pravidla (vzor, projekt_id, priorita)
select '2226222/0800', p.id, 5 from fin_projekty p where p.nazev = 'SJM Tereza'
on conflict (lower(vzor)) do update set projekt_id = excluded.projekt_id;

insert into fin_pravidla (vzor, projekt_id, priorita)
select 'pojisteni tereza', p.id, 5 from fin_projekty p where p.nazev = 'SJM Tereza'
on conflict (lower(vzor)) do update set projekt_id = excluded.projekt_id;

update fin_transakce t set projekt_id = p.id from fin_projekty p
 where p.nazev = 'SJM Tereza' and t.zdroj = 'import' and t.projekt_id is null
   and (t.protistrana like '2226222%' or t.popis ilike '%pojištění tereza%');

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
