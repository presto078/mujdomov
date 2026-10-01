-- ══════════════════════════════════════════════════════════════════════════
-- DOPLNĚNÍ PRAVIDEL — pět skupin, které zůstávaly nezařazené
--
-- Po úklidu pravidel kleslo nezařazených výdajů na 57 %. Tohle je pět
-- největších skupin, kde stačí jedno pravidlo a zmizí celá řada plateb.
--
-- Potom v aplikaci: Zařazení → „🔁 Uplatnit pravidla zpětně".
-- Spustit v Supabase SQL Editoru. Dá se pustit opakovaně.
-- ══════════════════════════════════════════════════════════════════════════


-- ══ 1) Školka Mannaz — 72 700 Kč, které chybí v projektu ═════════════════
-- Mateřská škola i Centrum komplexní péče mají v textu „MANNAZ". Platí se
-- z účtu dětí, právě z příspěvku na péči — proto patří do jeho projektu.
insert into fin_pravidla (vzor, smer, kategorie_id, projekt_id, subjekt_typ, subjekt_id, priorita)
select 'mannaz', 'vydaj', k.id, pr.id, 'osoba', dd.id::text, 5
  from fin_kategorie k
  join fin_projekty pr on pr.nazev = 'Příspěvky na péči'
  join deti dd on dd.jmeno = 'Patrik'
 where lower(trim(k.nazev)) = 'vzdělávání'
on conflict (lower(vzor)) do update
  set smer = excluded.smer, kategorie_id = excluded.kategorie_id, projekt_id = excluded.projekt_id,
      subjekt_typ = excluded.subjekt_typ, subjekt_id = excluded.subjekt_id;


-- ══ 2) Kia se v popisu jmenuje „Leasing", ne „Splátka" ═══════════════════
-- Proto pravidlo „splatka kia" chytilo jedinou platbu a šest jich zůstalo
-- viset — 24 198 Kč.
insert into fin_pravidla (vzor, smer, kategorie_id, projekt_id, subjekt_typ, subjekt_id, priorita)
select 'leasing kia', 'vydaj', k.id, pr.id, 'auto', a.id::text, 5
  from fin_kategorie k
  join fin_projekty pr on pr.nazev = 'Auta'
  join auta a on a.nazev = 'Kia Ceed SW'
 where lower(trim(k.nazev)) = 'leasing / auto'
on conflict (lower(vzor)) do update
  set kategorie_id = excluded.kategorie_id, projekt_id = excluded.projekt_id,
      subjekt_typ = excluded.subjekt_typ, subjekt_id = excluded.subjekt_id;


-- ══ 3) Baracom je voda — pravidlo mělo jen „dům", chyběla kategorie ══════
update fin_pravidla p set kategorie_id = k.id
  from fin_kategorie k
 where lower(trim(k.nazev)) = 'voda / energie'
   and p.vzor = 'baracom' and p.kategorie_id is null;


-- ══ 4) Sociální pojištění — 26 093 Kč v sedmi platbách ═══════════════════
insert into fin_pravidla (vzor, smer, kategorie_id, priorita)
select 'socialni pojisteni', 'vydaj', k.id, 10
  from fin_kategorie k where lower(trim(k.nazev)) = 'sociální a zdravotní pojištění'
on conflict (lower(vzor)) do update set kategorie_id = excluded.kategorie_id;


-- ══ 5) DATA PRESCO — převod na tvou vlastní firmu? ═══════════════════════
-- 45 835 Kč ve třech platbách z Fia. Zakomentované schválně: nevím, jestli
-- je to náklad firmy, nebo přesun tvých peněz. Odkomentuj to, co platí.
--
-- náklad:
-- insert into fin_pravidla (vzor, smer, kategorie_id, priorita)
-- select 'data presco', 'vydaj', k.id, 20 from fin_kategorie k
--  where lower(trim(k.nazev)) = 'ostatní výdaje'
-- on conflict (lower(vzor)) do update set kategorie_id = excluded.kategorie_id;


-- ══ Kontrola ═════════════════════════════════════════════════════════════
select p.vzor, p.smer, p.priorita, k.nazev as kategorie, pr.nazev as projekt, p.subjekt_typ
  from fin_pravidla p
  left join fin_kategorie k on k.id = p.kategorie_id
  left join fin_projekty pr on pr.id = p.projekt_id
 where p.vzor in ('mannaz','leasing kia','baracom','socialni pojisteni')
 order by p.vzor;
