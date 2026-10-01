-- ══════════════════════════════════════════════════════════════════════════
-- MATEŘSKÁ A RODIČOVSKÁ JE PŘÍJEM, NE VÝDAJ
--
-- Kategorie „Mateřská a rodičovská" má v číselníku typ `vydaj`, přestože na
-- ni za osm měsíců přišlo 193 186 Kč a neodešla ani koruna. Doteď to nevadilo
-- — kategorie se používá jen ke třídění. Jenže nové rozpoznávání vratek se
-- ptá přesně na tohle: příchozí platba s výdajovou kategorií = vrácené zboží.
-- Mateřská tím pádem z příjmů zmizela a odečetla se od výdaje, který nikdy
-- nevznikl. To je těch 24 148 Kč měsíčně, o které příjmy spadly.
--
-- V appce je proti tomu i pojistka: za vratku se platba bere jen tehdy, když
-- se v té kategorii ve stejném období taky utrácelo. Číselník je ale stejně
-- lepší opravit, ať se to nepočítá na dvě strany.
--
-- Spustit v Supabase SQL Editoru. Dá se pustit opakovaně.
-- ══════════════════════════════════════════════════════════════════════════

update fin_kategorie set typ = 'prijem' where nazev = 'Mateřská a rodičovská';


-- ── Kontrola: kategorie, kde typ nesedí na to, co jimi protéká ────────────
select k.nazev, k.typ,
       coalesce(sum(t.castka) filter (where t.castka > 0),0)::int as prichozi,
       coalesce(sum(-t.castka) filter (where t.castka < 0),0)::int as odchozi
  from fin_kategorie k
  left join fin_transakce t on t.kategorie_id = k.id and t.zdroj = 'import'
                           and t.typ <> 'prevod'
 group by k.id, k.nazev, k.typ
having (k.typ = 'vydaj'  and coalesce(sum(t.castka) filter (where t.castka > 0),0) >
                             coalesce(sum(-t.castka) filter (where t.castka < 0),0))
    or (k.typ = 'prijem' and coalesce(sum(-t.castka) filter (where t.castka < 0),0) >
                             coalesce(sum(t.castka) filter (where t.castka > 0),0))
 order by 1;
-- Prázdný výsledek = všechny kategorie mají správný typ.
