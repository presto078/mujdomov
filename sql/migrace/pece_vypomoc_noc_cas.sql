-- Péče → Výpomoc: noc jako samostatná jednotka a u hodin čas od–do.
-- Spustit v Supabase SQL Editoru (Hostice). Dá se pustit opakovaně.
-- Tabulka existuje a granty má, nové sloupce je dědí.

alter table pece_vypomoc add column if not exists cas_od time;
alter table pece_vypomoc add column if not exists cas_do time;

alter table pece_vypomoc drop constraint if exists pece_vypomoc_jednotka_check;
alter table pece_vypomoc add constraint pece_vypomoc_jednotka_check check (jednotka in ('den','noc','hod'));

select datum, kdo_hlidal, jednotka, pocet, cas_od, cas_do from pece_vypomoc order by datum desc;
