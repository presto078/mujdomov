-- ══════════════════════════════════════════════════════════════════════════
-- ENERGIE A SPOJE JAKO POVINNÁ PLATBA
--
-- Elektřina, vodné, stočné, internet a telefon nejsou útrata, o které se
-- rozhoduje — platí se pořád a nejde je nezaplatit. Patří tedy mezi povinné
-- závazky, ne do „kam jde zbytek".
--
-- Zároveň se srovnají tři věci, které nesedí:
--
--   • O2 má kategorii jen u jedné platby z osmi, zbylých sedm visí
--     nezařazených — telefon proto vypadá na 267 Kč místo ~2 500
--   • T-Mobile sedí v Předplatném, i když je to taky telefon
--   • stočné (jiný dodavatel než Baracom) nemá kategorii
--
-- Fakturace je nepravidelná — vodné kvartálně, stočné pololetně — takže
-- měsíční částka projektu je průměr, ne to, co odejde každý měsíc.
--
-- Spustit v Supabase SQL Editoru. Dá se pustit opakovaně.
-- ══════════════════════════════════════════════════════════════════════════


-- ── A) Telefon je celý účet od O2 za rodinu ──────────────────────────────
insert into fin_pravidla (vzor, smer, kategorie_id, priorita)
select 'vyuctovani o2', 'vydaj', (select id from fin_kategorie where nazev = 'Telefon'), 10
on conflict (lower(vzor)) do update
  set smer = excluded.smer, kategorie_id = excluded.kategorie_id, priorita = excluded.priorita;

update fin_pravidla set kategorie_id = (select id from fin_kategorie where nazev = 'Telefon')
 where lower(vzor) = 't-mobile';

update fin_transakce
   set kategorie_id = (select id from fin_kategorie where nazev = 'Telefon')
 where zdroj = 'import' and castka < 0
   and (coalesce(popis,'') ilike '%uctovani O2%' or coalesce(popis,'') ilike '%účtování O2%'
        or coalesce(popis,'') ilike '%T-MOBILE%');


-- ── B) Stočné patří k vodě ───────────────────────────────────────────────
update fin_transakce
   set kategorie_id = (select id from fin_kategorie where nazev = 'Voda / energie')
 where zdroj = 'import' and castka < 0
   and (coalesce(popis,'') ilike '%STOČNÉ%' or coalesce(popis,'') ilike '%STOCNE%'
        or coalesce(popis,'') ilike '%ODVADENI ODPADNICH VOD%');

insert into fin_pravidla (vzor, smer, kategorie_id, priorita)
select 'stocne', 'vydaj', (select id from fin_kategorie where nazev = 'Voda / energie'), 12
on conflict (lower(vzor)) do update
  set smer = excluded.smer, kategorie_id = excluded.kategorie_id;


-- ── C) Projekt ───────────────────────────────────────────────────────────
insert into fin_projekty (nazev, emoji, typ, mesicni_castka, poznamka, poradi)
select 'Energie a spoje', '⚡', 'provoz', 14300,
       'Elektřina (Centropol), vodné (Baracom, kvartálně), stočné (pololetně), internet (CZNET) a telefon (O2 za celou rodinu + T-Mobile). Fakturace je nepravidelná, měsíční částka je průměr.', 8
 where not exists (select 1 from fin_projekty where nazev = 'Energie a spoje');


-- ── D) Zařadit do projektu všechno z těch čtyř kategorií ─────────────────
update fin_transakce t
   set projekt_id = (select id from fin_projekty where nazev = 'Energie a spoje')
  from fin_kategorie k
 where k.id = t.kategorie_id
   and k.nazev in ('Elektřina','Voda / energie','Internet','Telefon')
   and t.zdroj = 'import'
   and t.projekt_id is null;


-- ── E) Pravidla, ať to příští import zařadí rovnou ───────────────────────
do $$
declare r record;
begin
  for r in select * from (values
      ('centropol','Elektřina'),
      ('baracom','Voda / energie'),
      ('stocne','Voda / energie'),
      ('cznet','Internet'),
      ('vyuctovani o2','Telefon'),
      ('t-mobile','Telefon')
    ) as x(vzor, kat)
  loop
    insert into fin_pravidla (vzor, smer, kategorie_id, projekt_id, priorita)
    select r.vzor, 'vydaj',
           (select id from fin_kategorie where nazev = r.kat),
           (select id from fin_projekty  where nazev = 'Energie a spoje'), 11
    on conflict (lower(vzor)) do update
      set kategorie_id = excluded.kategorie_id, projekt_id = excluded.projekt_id;
  end loop;
end $$;


-- ── Kontrola ─────────────────────────────────────────────────────────────
select k.emoji, k.nazev, count(*) as plateb,
       sum(-t.castka)::int as celkem,
       round(sum(-t.castka)/8)::int as mesicne
  from fin_transakce t
  join fin_kategorie k on k.id = t.kategorie_id
  join fin_projekty p on p.id = t.projekt_id
 where p.nazev = 'Energie a spoje' and t.zdroj = 'import' and t.datum >= '2026-01-01'
 group by 1,2 order by 4 desc;

-- Ve kterém měsíci co odešlo — u vodného a stočného je to vidět nejlíp.
select to_char(t.datum,'YYYY-MM') as mesic, k.nazev, (-t.castka)::int as castka
  from fin_transakce t
  join fin_kategorie k on k.id = t.kategorie_id
  join fin_projekty p on p.id = t.projekt_id
 where p.nazev = 'Energie a spoje' and t.zdroj = 'import' and t.castka < 0
 order by 1, 3 desc;
