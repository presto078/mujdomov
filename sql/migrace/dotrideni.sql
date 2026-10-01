-- ══════════════════════════════════════════════════════════════════════════
-- DOTŘÍDĚNÍ — pravidla na to, co se opakuje
--
-- Nezařazených výdajů je 517 plateb za 76 903 Kč/měs. Rozdělují se ale na
-- dvě úplně jiné hromady:
--
--   • 74 skupin se opakuje  → jde na ně napsat pravidlo, řeší tenhle skript
--   • 180 jednorázových nákupů = 30 322 Kč/měs → pravidlo nepomůže, je to
--     jednou IKEA, jednou lékárna, jednou benzínka. Buď se to proklikná
--     v Zařazení, nebo se to nechá být jako běžná spotřeba.
--
-- Proč to pravidla nechytila dřív: většina těch plateb nemá v popisu jméno
-- obchodníka. Alza posílá „OBJEDNAVKA 105437873", Air Bank „Platba —
-- Odchozí okamžitá úhrada · VS:1053978844". Jediné, co je identifikuje, je
-- číslo protiúčtu — proto jsou pravidla psaná na něj.
--
-- Pozor: pravidlo na číslo účtu je nebezpečné, když nastavuje PROJEKT (viz
-- SJM, kam přes Terezino číslo padaly daně za děti). Když nastavuje jen
-- kategorii, je to v pořádku — nejhorší, co se stane, je špatná škatulka.
--
-- Spustit v Supabase SQL Editoru. Dá se pustit opakovaně.
-- ══════════════════════════════════════════════════════════════════════════

do $$
declare
  v_kat text; v_vzor text; v_smer text; v_prio int;
  r record;
begin
  for r in
    select * from (values
      -- vzor              směr     kategorie                        priorita
      ('2171532',          'vydaj', 'Elektronika',                    14),  -- Alza, popis je jen OBJEDNAVKA
      ('vzp zdravotni',    'vydaj', 'Sociální a zdravotní pojištění', 10),
      ('vyuctovani o2',    'vydaj', 'Telefon',                        10),
      ('390839329',        'vydaj', 'Děti',                           14),  -- družina + stravné, KB
      ('742482002',        'vydaj', 'Děti',                           14),  -- stravné, Moneta
      ('34175028',         'vydaj', 'Předplatné / služby',            14),  -- domény lesnereides.cz, jkuc.cz
      ('rblx',             'vydaj', 'hry',                            10),  -- Roblox, 20 mikroplateb
      ('2812723019',       'vydaj', 'Domácnost / opravy',             14),  -- instalatér
      ('429063389',        'vydaj', 'Voda / energie',                 14),  -- Obec Vodochody, stočné
      ('2226222',          'vydaj', 'Pojistky',                       14),  -- ČPP, sběrný účet pojišťovny
      ('bazenyshop',       'vydaj', 'Domácnost / opravy',             12),
      ('sportklub',        'vydaj', 'Sport / hobby',                  12),
      ('kralovske vinohrady','vydaj','Zdraví / léky',                 12),
      ('ikea',             'vydaj', 'Domácnost / opravy',             12),
      ('c & a',            'vydaj', 'Oblečení',                       12),
      ('lenka kubinova',   'vydaj', 'Vzdělávání',                     12)   -- keramika, Jiřík 5A
    ) as x(vzor, smer, kat, prio)
  loop
    insert into fin_pravidla (vzor, smer, kategorie_id, priorita)
    select r.vzor, r.smer, (select id from fin_kategorie where nazev = r.kat), r.prio
    on conflict (lower(vzor)) do update
      set smer = excluded.smer, kategorie_id = excluded.kategorie_id, priorita = excluded.priorita;
  end loop;
end $$;


-- ── Svatba — první platby do prázdného projektu ───────────────────────────
-- Účet 2113748321: záloha na dort a zákusky (11. 6.), Kučerovi (26. 6.)
-- a doplatek 5. 7. Dohromady 11 480 Kč. Svatba byla v červnu 2026.
update fin_transakce
   set projekt_id = (select id from fin_projekty where nazev = 'Svatba')
 where zdroj = 'import'
   and coalesce(protistrana,'') like '2113748321%'
   and projekt_id is null;

insert into fin_protistrany (cislo, nazev, poznamka)
values ('2113748321', 'Cukrárna — svatba', 'Dort a zákusky, červen 2026')
on conflict (cislo) do update set nazev = excluded.nazev, poznamka = excluded.poznamka;


-- ── Doplatky hypotéky, které se nespárovaly ───────────────────────────────
update fin_transakce
   set kategorie_id = (select id from fin_kategorie where nazev = 'Bydlení / hypotéka'),
       projekt_id   = coalesce(projekt_id, (select id from fin_projekty where nazev = 'Hypotéka'))
 where zdroj = 'import' and castka < 0 and kategorie_id is null
   and (coalesce(protistrana,'') like '43-6246695583%' or coalesce(protistrana,'') like '510-6246695583%');


-- ── Kontrola ─────────────────────────────────────────────────────────────
-- Spustit až po „🔁 Uplatnit pravidla zpětně" v Zařazení.
select to_char(t.datum,'YYYY-MM') as mesic,
       count(*) filter (where t.kategorie_id is null) as bez_kategorie,
       sum(-t.castka) filter (where t.kategorie_id is null)::int as kolik
  from fin_transakce t join fin_ucty u on u.id = t.ucet_id
 where t.zdroj = 'import' and t.castka < 0 and t.typ <> 'prevod'
   and u.skupina in ('finance','podnikani') and t.datum >= '2026-01-01'
 group by 1 order by 1;

select p.emoji, p.nazev, count(*) as plateb, sum(-t.castka)::int as celkem
  from fin_transakce t join fin_projekty p on p.id = t.projekt_id
 where t.zdroj = 'import' and t.castka < 0
 group by 1,2 order by 4 desc;
