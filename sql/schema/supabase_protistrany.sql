-- ══════════════════════════════════════════════════════════════════════════
-- POJMENOVANÉ PROTISTRANY
-- Banka u příchozí platby pošle jen číslo účtu odesílatele, jméno ne. Aby
-- přehled neukazoval holá čísla, dá se každé číslo jednou pojmenovat a název
-- se pak používá všude. Spustit v Supabase SQL Editoru.
-- ══════════════════════════════════════════════════════════════════════════

create table if not exists fin_protistrany (
  cislo       text primary key,   -- normalizované číslo účtu, bez kódu banky a vodicích nul
  nazev       text not null,
  poznamka    text,
  created_at  timestamptz default now()
);

alter table fin_protistrany enable row level security;
drop policy if exists fin_protistrany_auth on fin_protistrany;
create policy fin_protistrany_auth on fin_protistrany for all to authenticated using (true) with check (true);

-- Nejčastější protistrany v příjmech — doplň si u nich jména v aplikaci
-- kliknutím na tužku vedle názvu skupiny.
select regexp_replace(split_part(protistrana,'/',1),'^0+','') as cislo,
       count(*) as plateb,
       sum(castka)::numeric(12,2) as celkem
  from fin_transakce
 where zdroj='import' and castka > 0 and typ <> 'prevod' and protistrana is not null
 group by 1
 order by 3 desc
 limit 30;
