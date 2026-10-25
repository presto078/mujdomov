-- ══════════════════════════════════════════════════════════════════════════
-- UŽIVATELÉ A OPRÁVNĚNÍ
--
-- Kdo smí do appky a které moduly nevidí.
--
--   role = 'spravce'  →  vidí vše a spravuje uživatele (Jirka)
--   role = 'clen'     →  vidí vše kromě modulů v skryte_moduly (Mili)
--
-- Přihlášený účet bez řádku v této tabulce se do appky nedostane.
-- Účty (e-mail + heslo) zakládá správce v Supabase → Authentication.
--
-- Skrývání modulů hlídá appka. Databáze hlídá, že oprávnění smí měnit
-- jen správce (člen si nemůže sám nic odemknout).
--
-- Od 30. 10. 2026 Supabase nedává novým tabulkám práva k Data API sám,
-- proto jsou granty tady. anon nedostává nic.
--
-- Spustit v Supabase SQL Editoru. Dá se pustit opakovaně.
-- ══════════════════════════════════════════════════════════════════════════


create table if not exists uzivatele (
  email          text primary key check (email = lower(email)),
  jmeno          text,
  role           text not null default 'clen' check (role in ('spravce','clen')),
  skryte_moduly  text[] not null default '{}',
  created_at     timestamptz not null default now()
);

create or replace function je_spravce() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from uzivatele
     where email = lower(coalesce(auth.jwt() ->> 'email', ''))
       and role = 'spravce'
  );
$$;
revoke all on function je_spravce() from public, anon;
grant execute on function je_spravce() to authenticated, service_role;

alter table uzivatele enable row level security;

drop policy if exists uzivatele_cteni on uzivatele;
create policy uzivatele_cteni on uzivatele for select to authenticated
  using (email = lower(coalesce(auth.jwt() ->> 'email', '')) or je_spravce());

drop policy if exists uzivatele_zapis on uzivatele;
create policy uzivatele_zapis on uzivatele for all to authenticated
  using (je_spravce()) with check (je_spravce());

grant select, insert, update, delete on uzivatele to authenticated;
grant all on uzivatele to service_role;


-- ── Správce ──────────────────────────────────────────────────────────────
insert into uzivatele (email, jmeno, role) values
  ('presto078@gmail.com',   'Jirka', 'spravce'),
  ('director@aquadream.cz', 'Jirka', 'spravce')
on conflict (email) do nothing;


-- ── Kontrola ─────────────────────────────────────────────────────────────
select email, jmeno, role, skryte_moduly from uzivatele order by role, email;
