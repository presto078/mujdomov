-- ══════════════════════════════════════════════════════════════════════════
-- ALIMENTY SE POČÍTALY DVAKRÁT
--
-- Modul Výživné zrcadlil každou platbu do fin_transakce. Když se výpisy
-- ještě nevozily, dávalo to smysl. Teď obě strany chodí přes banku, takže
-- je import nabere sám a modul k tomu přidá druhou kopii:
--
--   10. 6.  −2 500  modul „Alimenty 2026-06 (matka→otci)"
--   13. 7.  −2 500  modul „Alimenty 2026-07 (matka→otci)"
--   10. 8.  −2 500  modul „Alimenty 2026-08 (matka→otci)"
--   19. 8.  +5 500  modul „Alimenty 2026-08 (otec→matce)"
--
-- Těch 2 500 zvlášť neodchází — je uvnitř insolvenční splátky, která se
-- proto od června zvedla z 5 500 na 8 000 Kč. A 5 500 od Šímy je ve výpisu
-- z Monety 17. 8., takže modul přidal druhou kopii o dva dny později.
--
-- Dohromady 7 500 Kč falešného výdaje a 5 500 Kč falešného příjmu.
--
-- Zrcadlení vypíná nový přepínač v modulu Výživné → Nastavení. Tenhle
-- skript uklidí, co už vzniklo, a přepínač založí ve vypnutém stavu.
--
-- Spustit v Supabase SQL Editoru. Dá se pustit opakovaně.
-- ══════════════════════════════════════════════════════════════════════════


-- ── A) Přepínač, výchozí stav vypnuto ────────────────────────────────────
insert into alimenty_nastaveni (klic, hodnota)
values ('zrcadlit_do_financi', 'false')
on conflict (klic) do nothing;


-- ── B) Smazat zrcadlené platby alimentů a rozpojit vazbu ─────────────────
delete from fin_transakce t
 using alimenty_platby p
 where p.fin_transakce_id = t.id;

update alimenty_platby set fin_transakce_id = null
 where fin_transakce_id is not null;


-- ── C) Totéž pro mimořádné dětské výdaje ─────────────────────────────────
-- (obědy ve školce — ty ve výpisu z Monety taky jsou, jako Stravné)
delete from fin_transakce t
 using alimenty_mimoradne m
 where m.fin_transakce_id = t.id;

update alimenty_mimoradne set fin_transakce_id = null
 where fin_transakce_id is not null;
-- Plán (fin_cashflow_plan) se nemaže — očekávaný doplatek od otce žádná
-- duplicita není, ten ve výpisech zatím neexistuje.


-- ── D) Insolvence: měsíčně 8 000 a proč ──────────────────────────────────
update fin_projekty
   set mesicni_castka = 8000,
       poznamka = 'Pravidelná splátka insolvence. Od června 2026 je to 8 000 Kč — 5 500 insolvence plus 2 500 splátka dluhu na výživném (rozsudek 18. 3. 2026, dluh 53 250 Kč). Odchází to jedním příkazem z Monety Běžný, rozdělit se to nedá.'
 where nazev = 'Insolvence Mili';


-- ── Kontrola ─────────────────────────────────────────────────────────────
select zdroj, count(*) as pohybu from fin_transakce group by 1 order by 1;
-- Řádky se zdrojem 'modul' by měly zmizet úplně.

select to_char(datum,'YYYY-MM') as mesic, (-castka)::int as castka, popis
  from fin_transakce
 where zdroj = 'import' and popis ilike '%insolvence%'
 order by datum;
-- 4 500 do března, 5 500 v dubnu a květnu, od června 8 000.
