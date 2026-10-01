-- ══════════════════════════════════════════════════════════════════════════
-- VÝBĚR Z BANKOMATU JAKO VÝDAJ
--
-- Účetně je výběr přesun z účtu do peněženky, ne výdaj. Jenže Peněženka
-- v aplikaci nemá jedinou transakci a hotovostní útraty se do ní zapisovat
-- nebudou — převod by tedy peníze poslal do místa, odkud se nikdy nevykážou,
-- a přehled by tvrdil, že utrácíš míň, než utrácíš.
--
-- Proto výdaj: chyba je jen v tom, že se výdaj vykáže v den výběru místo
-- v den nákupu. U ~1 957 Kč měsíčně je to v šumu.
--
-- Vklady hotovosti zůstávají převodem — ty jsou z faktur, které do příjmů
-- vstupují ručně (app_nastaveni.fin_hotovostni_prijem). Kdyby se počítal
-- i vklad, byly by tam ty peníze dvakrát.
--
-- Spustit v Supabase SQL Editoru. Dá se pustit opakovaně.
-- ══════════════════════════════════════════════════════════════════════════


-- ── A) Kategorie ──────────────────────────────────────────────────────────
-- Kategorie „Bankomat" už existuje, jen je vedená jako příjem. Přejmenuje se
-- a překlopí na výdaj, ať nevznikne druhá na totéž.
update fin_kategorie
   set nazev = 'Výběr hotovosti', emoji = '🏧', typ = 'vydaj'
 where lower(trim(nazev)) in ('bankomat', 'vyber hotovosti');

insert into fin_kategorie (nazev, emoji, typ, poradi)
select 'Výběr hotovosti', '🏧', 'vydaj', 900
 where not exists (select 1 from fin_kategorie where lower(trim(nazev)) = 'výběr hotovosti');


-- ── B) Pravidlo pro budoucí importy ───────────────────────────────────────
-- Vzor se ukládá bez diakristiky a malými písmeny — aplikace obojí strany
-- porovnání normalizuje stejně.
insert into fin_pravidla (vzor, kategorie_id, priorita)
select 'vyber hotovosti', k.id, 10
  from fin_kategorie k
 where lower(trim(k.nazev)) = 'výběr hotovosti'
on conflict (lower(vzor)) do update set kategorie_id = excluded.kategorie_id;


-- ── C) Zpětně na to, co už je naimportované ───────────────────────────────
-- Air Bank píše „Výběr hotovosti — … Bankomat: …". Moneta u karetního výběru
-- posílá jen název bankomatu („KB ATM VELTRUSKA…"), proto druhý vzorek.
update fin_transakce t
   set kategorie_id = k.id, typ = 'vydaj'
  from fin_kategorie k
 where lower(trim(k.nazev)) = 'výběr hotovosti'
   and t.zdroj = 'import'
   and t.typ <> 'prevod'
   and t.castka < 0
   and (   coalesce(t.popis,'')||' '||coalesce(t.poznamka,'') ilike '%Výběr hotovosti%'
        or coalesce(t.popis,'')||' '||coalesce(t.poznamka,'') ilike '%ATM %');


-- Pravidlo na karetní výběry z bankomatu (text „ATM"). Je širší, než se zdá —
-- může chytit i obchodníka, který má ATM v názvu. Odkomentuj, až uvidíš,
-- co to v části C zařadilo.
--
-- insert into fin_pravidla (vzor, kategorie_id, priorita)
-- select 'atm ', k.id, 15 from fin_kategorie k
--  where lower(trim(k.nazev)) = 'výběr hotovosti'
-- on conflict (lower(vzor)) do update set kategorie_id = excluded.kategorie_id;


-- ── Kontrola ──────────────────────────────────────────────────────────────
select t.datum, t.castka::int, t.typ, u.nazev as ucet, left(t.popis, 60) as popis
  from fin_transakce t
  join fin_ucty u on u.id = t.ucet_id
  join fin_kategorie k on k.id = t.kategorie_id
 where lower(trim(k.nazev)) = 'výběr hotovosti'
 order by t.datum;

-- Očekávaně (podle rozboru z 1. 9.): čtyři výběry — 6 000 (24. 3.),
-- 5 500 (8. 4.), 1 600 (4. 5.) a 600 (29. 7. z Monety), celkem 13 700 Kč.
