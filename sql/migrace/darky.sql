-- ══════════════════════════════════════════════════════════════════════════
-- DÁRKY
--
-- Kdo z dětí co dostal, k jaké příležitosti a za kolik. Měřítkem je
-- kalendářní rok: na konci roku chceš vidět, kolik které dítě dostalo
-- dohromady z narozenin i Vánoc.
--
-- Jeden řádek = jeden dárek nebo přání:
--
--   stav = 'prani'     →  zatím jen přání (cena je odhad)
--   stav = 'koupeno'   →  koupeno, počítá se do sumy
--   stav = 'zabaleno'  →  koupeno a zabalené
--
-- Přání se nepřepisuje na dárek – jen se mu posune stav.
--
-- Záměrně nic nepíše do fin_transakce. Párování s platbou z výpisu přijde
-- ve fázi 2 jako odkaz na existující platbu (jedna platba může krýt víc
-- dárků i nákup do domácnosti), ne jako nový pohyb.
--
-- Od 30. 10. 2026 Supabase nedává novým tabulkám práva k Data API sám,
-- proto jsou granty tady. anon nedostává nic – modul je jen po přihlášení.
--
-- Spustit v Supabase SQL Editoru. Dá se pustit opakovaně.
-- ══════════════════════════════════════════════════════════════════════════


create table if not exists darky (
  id           uuid primary key default gen_random_uuid(),
  dite_id      uuid not null references deti(id) on delete cascade,
  rok          int  not null,
  prilezitost  text not null default 'vanoce'
               check (prilezitost in ('vanoce','narozeniny','jine')),
  nazev        text not null,
  cena         numeric not null default 0,
  stav         text not null default 'prani'
               check (stav in ('prani','koupeno','zabaleno')),
  kde          text,                        -- obchod
  schovane     text,                        -- kde je dárek schovaný
  odkaz        text,
  poznamka     text,
  created_at   timestamptz not null default now()
);

create index if not exists darky_rok_idx  on darky (rok);
create index if not exists darky_dite_idx on darky (dite_id);

alter table darky enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies
                  where tablename = 'darky' and policyname = 'darky_vse') then
    create policy darky_vse on darky
      for all to authenticated using (true) with check (true);
  end if;
end $$;

grant select, insert, update, delete on darky to authenticated;
grant all on darky to service_role;


-- ── Kontrola ─────────────────────────────────────────────────────────────
select count(*) as darku from darky;
