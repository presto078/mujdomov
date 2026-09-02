-- ══════════════════════════════════════════════════════════════════════════
-- AKCE JAKO FINANČNÍ PROJEKT
--
-- Svatba a případ u právníka jsou stejná otázka jako hypotéka nebo auta:
-- „kolik mě tahle věc dohromady stála". Liší se jen tím, že nemají cíl, ke
-- kterému se splácí — jen se sčítají. Proto třetí typ projektu: `akce`.
--
-- Moduly Projekty (hosté, oběd, zákusky) a Právník (případy, sazby, záznamy)
-- zůstávají, kde jsou. Dostanou jen odkaz na svůj finanční projekt, aby se
-- číslo dalo proklikat oběma směry.
--
-- Spustit v Supabase SQL Editoru. Dá se pustit opakovaně.
-- ══════════════════════════════════════════════════════════════════════════


-- ── A) Založení projektů ──────────────────────────────────────────────────
-- Cílová částka u akce znamená rozpočet, ne dluh — nechává se prázdná,
-- dokud se nedoplní z modulu Projekty.

insert into fin_projekty (nazev, emoji, typ, mesicni_castka, poznamka, poradi)
select * from (values
  ('Svatba',         '💍', 'akce', null,
   'Červen 2026. Sbírá platby z výpisů i hotovostní. Rozpočet je v modulu Projekty.', 10),
  ('Právník Zeman',  '⚖️', 'akce', null,
   'JUDr. Zeman — odměny a soudní poplatky. Detail případu je v modulu Právník.', 11)
) as v(nazev,emoji,typ,mesicni_castka,poznamka,poradi)
where not exists (select 1 from fin_projekty p where p.nazev = v.nazev);


-- ── B) Odkaz z modulů na finanční projekt ─────────────────────────────────
alter table projekty          add column if not exists fin_projekt_id bigint references fin_projekty(id) on delete set null;
alter table pravnici_pripady  add column if not exists fin_projekt_id bigint references fin_projekty(id) on delete set null;

comment on column projekty.fin_projekt_id is
  'Finanční projekt, pod kterým se sčítají skutečné platby k téhle akci.';
comment on column pravnici_pripady.fin_projekt_id is
  'Finanční projekt, pod kterým se sčítají odměny a poplatky k tomuhle případu.';

-- Napojení podle názvu — pokud se projekt ve tvých datech jmenuje jinak,
-- oprav si řetězec vpravo.
update projekty p set fin_projekt_id = f.id
  from fin_projekty f
 where f.nazev = 'Svatba' and p.fin_projekt_id is null
   and lower(p.nazev) like '%svatb%';

update pravnici_pripady c set fin_projekt_id = f.id
  from fin_projekty f
 where f.nazev = 'Právník Zeman' and c.fin_projekt_id is null;


-- ── C) Pravidla, ať se platby chytají samy ────────────────────────────────
-- Právník: platby JUDr. Zemanovi a notářské poplatky poznáme z textu výpisu.
insert into fin_pravidla (vzor, projekt_id, priorita)
select v.vzor, f.id, 8 from (values
  ('judr zeman'),
  ('zeman advokat'),
  ('notar')
) as v(vzor)
join fin_projekty f on f.nazev = 'Právník Zeman'
on conflict (lower(vzor)) do update set projekt_id = excluded.projekt_id;

-- Svatba se z textu výpisu poznat nedá (dodavatelé se jmenují všelijak),
-- proto se platby přiřazují ručně při procházení měsíců. Jakmile budeš mít
-- pár typických jmen, přidej je sem stejným způsobem:
--
-- insert into fin_pravidla (vzor, projekt_id, priorita)
-- select v.vzor, f.id, 8 from (values ('nazev dodavatele')) as v(vzor)
-- join fin_projekty f on f.nazev = 'Svatba'
-- on conflict (lower(vzor)) do update set projekt_id = excluded.projekt_id;


-- ── Kontrola ──────────────────────────────────────────────────────────────
select f.nazev, f.typ,
       count(t.id)                                as plateb_z_vypisu,
       coalesce(sum(-t.castka) filter (where t.castka < 0), 0)::int as z_vypisu,
       coalesce((select sum(castka)::int from fin_projekt_platby x where x.projekt_id = f.id), 0) as hotove
  from fin_projekty f
  left join fin_transakce t on t.projekt_id = f.id
 group by f.id, f.nazev, f.typ, f.poradi
 order by f.poradi;
