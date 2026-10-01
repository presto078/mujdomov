-- ══════════════════════════════════════════════════════════════════════════
-- AKCE JAKO FINANČNÍ PROJEKT — příprava databáze
--
-- Svatba a případ u právníka jsou stejná otázka jako hypotéka nebo auta:
-- „kolik mě tahle věc dohromady stála". Liší se jen tím, že nemají cíl, ke
-- kterému se splácí — jen se sčítají. Proto třetí typ projektu: `akce`.
--
-- Samotné akce si zakládáš v aplikaci (Finance → Projekty → + Nový projekt,
-- typ „Akce"). Tenhle skript jen připraví databázi a napojí moduly.
--
-- Spustit v Supabase SQL Editoru. Dá se pustit opakovaně.
-- ══════════════════════════════════════════════════════════════════════════


-- ── A) Sloupce, které formulář potřebuje ──────────────────────────────────
-- `typ` je obyčejný text bez omezení, takže hodnota 'akce' projde sama.
-- Chybí jen datum začátku — u akce se hodí („svatba 6/2026").
alter table fin_projekty add column if not exists datum_od date;


-- ── B) Odkaz z modulů na finanční projekt ─────────────────────────────────
-- Moduly Projekty (hosté, oběd, zákusky) a Právník (případy, sazby, záznamy)
-- zůstávají, kde jsou. Dostanou jen odkaz, aby se číslo dalo proklikat.
alter table projekty          add column if not exists fin_projekt_id bigint references fin_projekty(id) on delete set null;
alter table pravnici_pripady  add column if not exists fin_projekt_id bigint references fin_projekty(id) on delete set null;

comment on column projekty.fin_projekt_id is
  'Finanční projekt, pod kterým se sčítají skutečné platby k téhle akci.';
comment on column pravnici_pripady.fin_projekt_id is
  'Finanční projekt, pod kterým se sčítají odměny a poplatky k tomuhle případu.';


-- ── C) Napojení modulů na už založené akce ────────────────────────────────
-- Pusť až POTOM, co si v aplikaci akce založíš. Páruje podle názvu, takže
-- když se tvůj projekt jmenuje jinak, oprav si řetězec vpravo.

update projekty p set fin_projekt_id = f.id
  from fin_projekty f
 where f.typ = 'akce' and p.fin_projekt_id is null
   and lower(p.nazev) like '%svatb%' and lower(f.nazev) like '%svatb%';

update pravnici_pripady c set fin_projekt_id = f.id
  from fin_projekty f
 where f.typ = 'akce' and c.fin_projekt_id is null
   and (lower(f.nazev) like '%právník%' or lower(f.nazev) like '%pravnik%');


-- ── D) Pravidla, ať se platby chytají samy ────────────────────────────────
-- Právníka poznáme z textu výpisu. Spustí se, jen když projekt existuje.
insert into fin_pravidla (vzor, projekt_id, priorita)
select v.vzor, f.id, 8
  from (values ('judr zeman'), ('zeman advokat'), ('notar')) as v(vzor)
  join fin_projekty f on lower(f.nazev) like '%právník%' or lower(f.nazev) like '%pravnik%'
on conflict (lower(vzor)) do update set projekt_id = excluded.projekt_id;

-- Svatbu z textu výpisu poznat nejde — dodavatelé se jmenují všelijak.
-- Ty platby přiřadíš ručně v rozpadu. Až budeš mít pár typických jmen:
--
-- insert into fin_pravidla (vzor, projekt_id, priorita)
-- select v.vzor, f.id, 8 from (values ('nazev dodavatele')) as v(vzor)
-- join fin_projekty f on f.nazev = 'Svatba'
-- on conflict (lower(vzor)) do update set projekt_id = excluded.projekt_id;


-- ── Kontrola ──────────────────────────────────────────────────────────────
select f.nazev, f.typ,
       count(t.id)                                                  as plateb_z_vypisu,
       coalesce(sum(-t.castka) filter (where t.castka < 0), 0)::int as z_vypisu,
       coalesce((select sum(castka)::int from fin_projekt_platby x where x.projekt_id = f.id), 0) as hotove
  from fin_projekty f
  left join fin_transakce t on t.projekt_id = f.id
 group by f.id, f.nazev, f.typ, f.poradi
 order by f.poradi;
