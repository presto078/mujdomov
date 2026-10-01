-- ══════════════════════════════════════════════════════════════════════════
-- Pojmenování protistran — ať v rozpadu nejsou holá čísla účtů
--
-- Jména jsou vyčtená z popisů plateb na výpisech. Klíč je číslo účtu tak,
-- jak ho normalizuje aplikace: bez kódu banky a bez vodicích nul, předčíslí
-- oddělené pomlčkou.
--
-- Předpokládá spuštěné supabase_protistrany.sql (tabulka fin_protistrany).
-- Dá se pouštět opakovaně.
-- ══════════════════════════════════════════════════════════════════════════

insert into fin_protistrany (cislo, nazev, poznamka) values
  -- Výdělek
  ('35-7907110277',  'Aquadream — výplata',            'mzda, chodí na Airbank Hlavní'),
  ('357907110277',   'Aquadream — faktury',            'týž účet, Air Bank ho ve výpisu píše bez pomlčky'),
  ('5020014621',     'DPD — mzda Milady',              'zatím jednou, 6/2026'),

  -- Stát
  ('27-127001',      'ČSSZ — mateřská Milady',         'peněžitá pomoc v mateřství'),
  ('1804-37823211',  'Úřad práce — příspěvek na péči', 'ÚP KP v Příbrami, VS ...PnP'),
  ('37823211',       'Úřad práce — přídavky a rodičovský', 'týž úřad, jiné předčíslí; PnD a RodP'),
  ('721-77628111',   'Finanční úřad — přeplatek daně',  'jednorázově 64 404 Kč'),
  ('7050077628111',  'Finanční úřad Střed. kraj',       'vratky na Fio'),

  -- Rodina
  ('1763986028',     'Tereza Kučerová — výživné',       '11 000 Kč/měs na Airbank Jídlo'),
  ('6668152001',     'Miroslav Šíma — výživné',         'Sylvíček a Honzíček'),
  ('298375322',      'Pavlína Kučerová (maminka)',      'důchod v hotovosti a internet se počítají jako převod'),
  ('4413739004',     'Vanesa Ema Brandová',             'drobné časté platby'),
  ('19-7573240257',  'Andrej Svítek',                   'jednorázově 58 000 Kč v 1/2026'),

  -- Firmy a odběratelé
  ('285679095',      'TL GROUP CZ s.r.o.',              'odběratel, Fio'),
  ('285732239',      'Ing. Tomáš Lochman',              'odběratel, Fio'),
  ('2001167629',     'WORLD NET s.r.o.',                'odběratel, Fio'),
  ('2802557707',     'M-TAS s.r.o.',                    'odběratel, Fio'),

  -- Ostatní
  ('27000297',       'Centropol Energy — přeplatek',    ''),
  ('429063389',      'Obec Vodochody',                  'stočné'),
  ('2602645649',     'MŠ Manna',                        'vratky za stravné')
on conflict (cislo) do update
  set nazev = excluded.nazev,
      poznamka = coalesce(excluded.poznamka, fin_protistrany.poznamka);


-- ── Tři účty, u kterých nevím, kdo to je ──────────────────────────────────
-- Chodí z nich pravidelně 9 000 Kč měsíčně na Airbank Podnikatelský a VS
-- odpovídá číslu tvé vydané faktury (2026017 … 2026024). Popis nese jen
-- „JIRI KUCERA", protože Air Bank jméno odesílatele neposílá.
-- Doplň si jména a odkomentuj:
--
-- insert into fin_protistrany (cislo, nazev) values
--   ('285719958', '???'),
--   ('287544936', '???'),
--   ('285720588', '???')   -- pozor: na Fiu tenhle účet vystupuje jako ATLANTIC CRYSTAL
-- on conflict (cislo) do update set nazev = excluded.nazev;


-- ── Kontrola ──────────────────────────────────────────────────────────────
select p.nazev, count(*) as plateb, sum(t.castka)::int as celkem
  from fin_transakce t
  join fin_protistrany p
    on p.cislo = case
         when position('-' in split_part(t.protistrana,'/',1)) > 0
           then ltrim(split_part(split_part(t.protistrana,'/',1),'-',1),'0')||'-'||
                ltrim(split_part(split_part(t.protistrana,'/',1),'-',2),'0')
         else ltrim(split_part(t.protistrana,'/',1),'0')
       end
 where t.zdroj='import' and t.castka > 0 and t.typ <> 'prevod'
 group by 1 order by 3 desc;
