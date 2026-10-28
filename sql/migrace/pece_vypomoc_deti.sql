-- Péče → Výpomoc: o které děti šlo (Patrik / Beatka / Jiřík).
-- Stejně jako u pece_nemoci: pole id z tabulky deti.
-- Tabulka už existuje a granty má, nic dalšího není potřeba.
-- Spustit v Supabase SQL Editoru (Hostice). Dá se pustit opakovaně.

alter table pece_vypomoc add column if not exists deti uuid[] not null default '{}';

select datum, kdo_hlidal, jednotka, pocet, deti from pece_vypomoc order by datum desc;
