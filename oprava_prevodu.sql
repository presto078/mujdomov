-- ══════════════════════════════════════════════════════════════════════════
-- Oprava už naimportovaných transakcí: dva druhy přesunů mezi vlastními účty
-- se nerozpoznaly a počítaly se jako příjem nebo výdaj.
-- Spustit v Supabase SQL Editoru. Dá se pustit opakovaně.
-- ══════════════════════════════════════════════════════════════════════════

-- 1) Splátky kreditní karty. Na kartovém výpisu jsou vedené jako
--    „VAŠE PLATBA - DĚKUJEME" bez protiúčtu, takže vypadaly jako příjem.
update fin_transakce
   set typ = 'prevod'
 where zdroj = 'import'
   and typ <> 'prevod'
   and popis ilike '%vaše platba%';

-- 2) Převody na vlastní účty, kde protiúčet nese předčíslí nebo vodicí nuly
--    (Air Bank píše Fio jako „000000-0592521001/2010").
--    Porovnává se základ čísla účtu bez předčíslí a bez vodicích nul.
update fin_transakce t
   set typ = 'prevod',
       prevod_ucet_id = u.id
  from fin_ucty u
 where t.zdroj = 'import'
   and t.typ <> 'prevod'
   and t.protistrana is not null
   and u.cislo_uctu is not null
   and u.id <> t.ucet_id
   and ltrim(regexp_replace(split_part(t.protistrana, '/', 1), '^.*-', ''), '0')
     = ltrim(regexp_replace(u.cislo_uctu,                        '^.*-', ''), '0');

-- Kontrola, co z toho vzešlo
select typ, count(*) as pocet, sum(castka)::numeric(12,2) as suma
  from fin_transakce where zdroj = 'import' group by typ order by typ;
