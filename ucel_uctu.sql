-- ══════════════════════════════════════════════════════════════════════════
-- REZERVA A SPOŘENÍ NEJSOU TOTÉŽ
--
-- Rezerva je na to, co se pokazí. Spoření má cíl — děti, dovolená. Když se
-- sloučí do jednoho čísla, vypadá to, že na horší časy máš 149 706 Kč,
-- a přitom 139 549 z toho je slíbených jinam.
--
--   Moneta Spořící     → rezerva na mimořádné věci
--   Raiffeisen Spořící → spoření na děti a dovolenou
--
-- V Majetku se to u každého likvidního účtu přepíná odkazem, který cyklí
-- běžný → rezerva → spoření.
--
-- Spustit v Supabase SQL Editoru. Dá se pustit opakovaně.
-- ══════════════════════════════════════════════════════════════════════════

alter table fin_ucty add column if not exists ucel text;

-- Převzít, co už bylo označené předchozím skriptem — jen když ten sloupec
-- vůbec existuje, ať skript funguje i bez rezerva.sql.
do $$
begin
  if exists (select 1 from information_schema.columns
              where table_name = 'fin_ucty' and column_name = 'rezerva') then
    update fin_ucty set ucel = 'rezerva' where rezerva is true and ucel is null;
  end if;
end $$;

update fin_ucty set ucel = 'rezerva' where trim(nazev) = 'Moneta Spořící';
update fin_ucty set ucel = 'sporeni' where trim(nazev) = 'Raiffeisen Spořící';


-- ── Kontrola ─────────────────────────────────────────────────────────────
select nazev, skupina, ucel from fin_ucty where ucel is not null order by ucel, nazev;

-- Kam z rezervy odcházely peníze — a na který vlastní účet.
select t.datum, (-t.castka)::int as castka,
       coalesce(c.nazev,'(nespárováno)') as kam,
       left(coalesce(t.popis,''),44) as popis
  from fin_transakce t
  join fin_ucty u on u.id = t.ucet_id
  left join fin_ucty c on c.id = t.prevod_ucet_id
 where u.ucel = 'rezerva' and t.zdroj = 'import' and t.castka < -500
 order by t.castka;
