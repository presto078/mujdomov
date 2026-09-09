-- ══════════════════════════════════════════════════════════════════════════
-- HLÍDÁNÍ POHYBŮ NA ÚČET VANESY
--
-- Účet 4413739004/5500 není v fin_ucty — je cizí, ale peníze na něj chodí
-- oběma směry (45 pohybů, 26 867 tam a 27 661 zpět, netto −794 Kč).
-- Příchozí platby nesou jméno „Vanesa Ema Brandová".
--
-- Obousměrný projekt to pak ukáže jako přišlo / odešlo / zůstává, takže je
-- na první pohled vidět, jestli jste vyrovnaní.
--
-- Nahrazuje ucet_mili.sql (chybný název) — ten nespouštěj.
-- Spustit v Supabase SQL Editoru. Dá se pustit opakovaně.
-- ══════════════════════════════════════════════════════════════════════════


-- ── A) Projekt ────────────────────────────────────────────────────────────
insert into fin_projekty (nazev, emoji, typ, poznamka, poradi)
select 'Vanesa — účet', '👛', 'provoz',
       'Účet 4413739004/5500. Peníze chodí oběma směry, sledujeme, jestli jsme vyrovnaní.', 20
 where not exists (select 1 from fin_projekty where nazev = 'Vanesa — účet');

-- Kdyby se ucet_mili.sql přece jen pustil, přejmenuje se místo zdvojení.
update fin_projekty set nazev = 'Vanesa — účet' where nazev = 'Mili — účet';


-- ── B) Pravidlo — bez omezení směru, ať chytí obojí ───────────────────────
insert into fin_pravidla (vzor, projekt_id, priorita)
select '4413739004', p.id, 6
  from fin_projekty p where p.nazev = 'Vanesa — účet'
on conflict (lower(vzor)) do update set projekt_id = excluded.projekt_id;


-- ── C) Pojmenovat protistranu, ať v rozpadu není holé číslo ───────────────
insert into fin_protistrany (cislo, nazev, poznamka)
values ('4413739004', 'Vanesa Ema Brandová', 'Peníze chodí oběma směry — sledováno projektem Vanesa — účet')
on conflict (cislo) do update set nazev = excluded.nazev, poznamka = excluded.poznamka;


-- ── Kontrola ─────────────────────────────────────────────────────────────
-- Projekt se naplní až po spuštění „🔁 Uplatnit pravidla zpětně" v Zařazení.
select to_char(t.datum,'YYYY-MM') as mesic,
       sum(t.castka) filter (where t.castka > 0)::int  as prislo,
       sum(-t.castka) filter (where t.castka < 0)::int as odeslo,
       count(*) as pohybu
  from fin_transakce t
 where t.zdroj = 'import' and t.protistrana like '4413739004%'
 group by 1 order by 1;
