-- ══════════════════════════════════════════════════════════════════════════
-- ÚKLID PRAVIDEL
--
-- Rozbor 76 pravidel našel pět skutečných chyb, čtyři nefunkční překlepy
-- a tři pravidla ke zúžení. Tenhle skript to srovná.
--
-- POŘADÍ: nejdřív pusť tenhle skript, POTOM v aplikaci Zařazení →
-- „🔁 Uplatnit pravidla zpětně". Skript špatná zařazení smaže, tlačítko je
-- podle opravených pravidel doplní správně.
--
-- Předpokládá spuštěné pravidla_smer.sql (sloupce smer a ucet_id).
-- Spustit v Supabase SQL Editoru. Dá se pustit opakovaně.
-- ══════════════════════════════════════════════════════════════════════════


-- ══ 1) SJM: pravidlo na Terezino číslo účtu platí jen pro odchozí ═════════
-- Sedělo na 23 plateb: 7 splátek SJM (správně), ale taky 7 alimentů
-- a 8 příspěvků na péči, které od ní naopak chodí.
update fin_pravidla set smer = 'vydaj' where vzor = '1763986028';
update fin_pravidla set smer = 'vydaj' where vzor = '2226222/0800';


-- ══ 2) Sloučení projektů ═════════════════════════════════════════════════
-- „Příspěvky" sbíraly příjmy, „Školka Mannaz" výdaje. Odděleně se nedá
-- poznat, jestli příspěvek školku pokryje. Jeden projekt to ukáže jako
-- přišlo / odešlo / zůstává stranou.
do $$
declare cil bigint; zdroj bigint;
begin
  select id into cil   from fin_projekty where nazev = 'Příspěvky' limit 1;
  select id into zdroj from fin_projekty where nazev = 'Školka Mannaz' limit 1;
  if cil is not null and zdroj is not null then
    update fin_transakce set projekt_id = cil where projekt_id = zdroj;
    update fin_pravidla  set projekt_id = cil where projekt_id = zdroj;
    update fin_projekt_platby set projekt_id = cil where projekt_id = zdroj;
    delete from fin_projekty where id = zdroj;
  end if;
  if cil is not null then
    update fin_projekty
       set nazev = 'Příspěvky na péči', emoji = '🧑‍🦽', typ = 'provoz',
           poznamka = 'Příspěvek na péči a na mobilitu z ÚP i přeposlaný Terezou, proti tomu platby školce Mannaz. Co zbude, zůstává dětem.'
     where id = cil;
  end if;
end $$;


-- ══ 3) Tereza: alimenty a příspěvek na péči jsou dvě různé věci ══════════
-- Rozlišuje je cílový účet — alimenty chodí na Jídlo, příspěvek dětem.
-- (Vzory se musí lišit, na lower(vzor) je unikátní index.)
update fin_pravidla p
   set ucet_id = u.id, smer = 'prijem'
  from fin_ucty u
 where trim(u.nazev) = 'Airbank Spořící děti'
   and p.vzor = 'Příchozí úhrada — Tereza';

insert into fin_pravidla (vzor, smer, ucet_id, kategorie_id, priorita)
select 'Tereza Kučerová', 'prijem', u.id, k.id, 6
  from fin_ucty u
  join fin_kategorie k on lower(trim(k.nazev)) = 'alimenty'
 where trim(u.nazev) = 'Airbank Jídlo'
on conflict (lower(vzor)) do update
  set smer = excluded.smer, ucet_id = excluded.ucet_id, kategorie_id = excluded.kategorie_id;


-- ══ 4) Úřad práce posílá čtyři různé dávky ═══════════════════════════════
-- PnP příspěvek na péči · PnM na mobilitu · PnD přídavek · RodP rodičovský.
-- Priorita 3 přebíjí obecné „up - kp" (5).
insert into fin_pravidla (vzor, smer, kategorie_id, projekt_id, subjekt_typ, subjekt_id, priorita)
select v.vzor, 'prijem', k.id, pr.id, 'osoba', dd.id::text, 3
  from (values ('pnp'), ('pnm')) as v(vzor)
  join fin_kategorie k  on lower(trim(k.nazev)) = 'příspěvek na péči'
  join fin_projekty  pr on pr.nazev = 'Příspěvky na péči'
  join deti          dd on dd.jmeno = 'Patrik'
on conflict (lower(vzor)) do update
  set smer = excluded.smer, kategorie_id = excluded.kategorie_id, projekt_id = excluded.projekt_id,
      subjekt_typ = excluded.subjekt_typ, subjekt_id = excluded.subjekt_id, priorita = excluded.priorita;

insert into fin_pravidla (vzor, smer, kategorie_id, priorita)
select 'pnd', 'prijem', k.id, 3 from fin_kategorie k where lower(trim(k.nazev)) = 'přídavky na děti'
on conflict (lower(vzor)) do update
  set smer = excluded.smer, kategorie_id = excluded.kategorie_id, priorita = excluded.priorita;

update fin_pravidla set priorita = 3, smer = 'prijem' where vzor = 'rodp';


-- ══ 5) Aquadream: výplata vs. faktury ════════════════════════════════════
-- Na Airbank Hlavní chodí mzda, na Fio faktury. Rozliší je účet.
update fin_pravidla p set ucet_id = u.id, smer = 'prijem'
  from fin_ucty u where trim(u.nazev) = 'Airbank Hlavní' and p.vzor = 'aquadream';

insert into fin_pravidla (vzor, smer, kategorie_id, priorita)
select '357907110277', 'prijem', k.id, 40
  from fin_kategorie k where lower(trim(k.nazev)) = 'příjem z podnikání'
on conflict (lower(vzor)) do update
  set smer = excluded.smer, kategorie_id = excluded.kategorie_id;


-- ══ 6) ČSSZ je mateřská, ne odvod ════════════════════════════════════════
update fin_pravidla p set kategorie_id = k.id, smer = 'prijem'
  from fin_kategorie k
 where lower(trim(k.nazev)) = 'mateřská a rodičovská' and p.vzor = 'cssz';


-- ══ 7) Překlepy: vzory, které nikdy nic nechytily ════════════════════════
update fin_pravidla set vzor = 'pomoc v mater' where vzor = 'penez pomoc mater';
update fin_pravidla set vzor = 'tomas lochman' where vzor = 'ing tomas lochman';
update fin_pravidla set vzor = 'tl group'      where vzor = 'group';

delete from fin_pravidla where vzor in (
  'splatka dum odchozi', 'dum splatka odchozi',          -- takový slovosled nikde není
  'splatka toyota corolla', 'splatka renault traffic',   -- Fio popis zkracuje na 20 znaků
  'splatka kia ceed sw'
);


-- ══ 8) Centropol je elektřina ════════════════════════════════════════════
update fin_pravidla p set kategorie_id = k.id
  from fin_kategorie k
 where lower(trim(k.nazev)) = 'elektřina' and p.vzor = 'centropol' and p.kategorie_id is null;


-- ══ 9) Daně za děti dělené s Terezou — není to SJM ═══════════════════════
update fin_transakce t
   set projekt_id = null, kategorie_id = k.id
  from fin_kategorie k
 where lower(trim(k.nazev)) = 'děti'
   and t.zdroj = 'import'
   and coalesce(t.popis,'')||' '||coalesce(t.poznamka,'') ilike '%Daně 2025%';


-- ══ 10) Smazat, co pravidla zařadila špatně ══════════════════════════════
-- Doplní se správně po spuštění „🔁 Uplatnit pravidla zpětně" v Zařazení.
-- Ručně nastavené zařazení u ostatních plateb se nedotkne.
update fin_transakce
   set kategorie_id = null, projekt_id = null, subjekt_typ = null, subjekt_id = null
 where zdroj = 'import'
   and (   coalesce(popis,'')||' '||coalesce(poznamka,'') ilike '%ÚP - KP%'
        or coalesce(popis,'')||' '||coalesce(poznamka,'') ilike '%ČSSZ%'
        or coalesce(popis,'')||' '||coalesce(poznamka,'') ilike '%AQUADREAM%'
        or (castka > 0 and coalesce(popis,'')||' '||coalesce(poznamka,'') ilike '%Tereza%'));


-- ══ Kontrola ═════════════════════════════════════════════════════════════
select p.vzor, p.smer, u.nazev as jen_ucet, p.priorita,
       k.nazev as kategorie, pr.nazev as projekt, p.subjekt_typ
  from fin_pravidla p
  left join fin_ucty u       on u.id  = p.ucet_id
  left join fin_kategorie k  on k.id  = p.kategorie_id
  left join fin_projekty pr  on pr.id = p.projekt_id
 where p.vzor in ('1763986028','2226222/0800','Příchozí úhrada — Tereza','Tereza Kučerová',
                  'pnp','pnm','pnd','rodp','up - kp','aquadream','357907110277','cssz',
                  'pomoc v mater','tomas lochman','tl group','centropol')
 order by p.priorita, p.vzor;
