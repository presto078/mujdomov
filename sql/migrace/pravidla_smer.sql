-- ══════════════════════════════════════════════════════════════════════════
-- PRAVIDLA UMÍ SMĚR A ÚČET
--
-- Terezino číslo účtu 1763986028 je v protiúčtu u tří úplně různých věcí:
--   · SJM Tereza  — 28 000 Kč OD Jirky Z Airbank Hlavní
--   · alimenty    — 11 000 Kč OD Terezy NA Airbank Jídlo
--   · příspěvek na péči — 23 000 Kč OD Terezy NA Airbank Spořící děti
--
-- Pravidlo, které se dívá jen na text, je nerozliší a zařadí je všechny
-- stejně. Proto dostává dvě nové podmínky: směr platby a konkrétní účet.
-- Nevyplněné = platí jako dosud, tedy pro všechno.
--
-- Spustit v Supabase SQL Editoru. Dá se pustit opakovaně.
-- ══════════════════════════════════════════════════════════════════════════


-- ── A) Nové sloupce ───────────────────────────────────────────────────────
alter table fin_pravidla add column if not exists smer    text;
alter table fin_pravidla add column if not exists ucet_id uuid references fin_ucty(id) on delete cascade;

comment on column fin_pravidla.smer is
  '''prijem'' / ''vydaj'' — pravidlo platí jen pro platby daného směru. Prázdné = pro obě.';
comment on column fin_pravidla.ucet_id is
  'Pravidlo platí jen na tomhle účtu. Prázdné = na všech.';


-- ── B) Úklid pravidel postavených na obecné bankovní frázi ────────────────
-- Air Bank píše do popisu jen „Odchozí úhrada" a obchodníka dává do poznámky.
-- Pravidlo naučené z popisu proto sedělo na každou odchozí platbu.
delete from fin_pravidla
 where lower(regexp_replace(trim(vzor),'\s+',' ','g')) in (
   'odchozí úhrada','odchozi uhrada','příchozí úhrada','prichozi uhrada',
   'odchozí platba','příchozí platba','platba kartou','platba','úhrada','uhrada',
   'nákup','nakup','trvalý příkaz','trvaly prikaz','okamžitá úhrada','okamzita uhrada',
   'odeslané inkaso','odeslane inkaso','přijaté inkaso','prijate inkaso','převod','prevod'
 );

-- Zbytek si projdi sám — cokoli kratšího a bez čísla účtu je podezřelé.
select id, vzor, length(vzor) as delka, priorita, smer, kategorie_id, projekt_id, subjekt_typ
  from fin_pravidla
 where length(vzor) < 18
 order by length(vzor), vzor;


-- ── C) Tři toky přes Terezin účet, každý jinak ────────────────────────────
-- SJM: odchází z tvého účtu k ní.
update fin_pravidla set smer = 'vydaj'
 where vzor like '%1763986028%' and projekt_id is not null;

-- Alimenty: přicházejí od ní na Airbank Jídlo.
insert into fin_pravidla (vzor, smer, ucet_id, kategorie_id, priorita)
select '1763986028', 'prijem', u.id, k.id, 6
  from fin_ucty u
  join fin_kategorie k on lower(trim(k.nazev)) = 'alimenty'
 where trim(u.nazev) = 'Airbank Jídlo'
on conflict (lower(vzor)) do nothing;

-- Příspěvek na péči: přichází od ní na účet dětí. Kategorii i projekt si
-- doplň v aplikaci — tenhle skript neví, jak jsi je pojmenoval.


-- ── D) Zpětná oprava ──────────────────────────────────────────────────────
-- Příchozím platbám od Terezy se sebere projekt SJM — ten patří jen tomu,
-- co jí posíláš ty.
update fin_transakce t
   set projekt_id = null
  from fin_projekty p
 where p.id = t.projekt_id
   and lower(p.nazev) like '%sjm%'
   and t.zdroj = 'import'
   and t.castka > 0;

-- Kontrola: co teď pod SJM visí
select to_char(t.datum,'YYYY-MM') as mesic, count(*) as plateb, sum(-t.castka)::int as castka
  from fin_transakce t join fin_projekty p on p.id = t.projekt_id
 where lower(p.nazev) like '%sjm%'
 group by 1 order by 1;
-- Očekávaně: 1× 28 000 Kč měsíčně, nic jiného.
