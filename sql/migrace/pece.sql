-- ══════════════════════════════════════════════════════════════════════════
-- PÉČE O DĚTI
--
-- Střídání péče s Terezou (Patrik ve 14denním cyklu, Beatka a Jiřík jsou
-- u Jirky), nemoci, lékaři, výpomoc a výživné.
--
--   pece_vyjimky   – dny, kdy je Patrik jinak než podle rozpisu
--   pece_nemoci    – kdo byl s nemocnými dětmi doma; střídá se po nemocech
--   pece_lekari    – kdo s dětmi chodí k jakému lékaři (zubař = Jirka …)
--   pece_navstevy  – deník návštěv u lékaře
--   pece_vypomoc   – kdo za koho vzal den nebo pár hodin; sčítá se dluh
--
-- Rozpis samotný se nikam neukládá – počítá se z kotvy v app_nastaveni
-- (klíč 'pece'). Výživné se nezapisuje: modul jen čte příchozí platby
-- z fin_transakce (účet Terezy + kategorie Alimenty).
--
-- Od 30. 10. 2026 Supabase nedává novým tabulkám práva k Data API sám,
-- proto jsou granty tady. anon nedostává nic – modul je jen po přihlášení.
--
-- Spustit v Supabase SQL Editoru. Dá se pustit opakovaně.
-- ══════════════════════════════════════════════════════════════════════════


create table if not exists pece_vyjimky (
  datum      date primary key,
  kdo        text not null check (kdo in ('ja','tereza')),
  poznamka   text,
  created_at timestamptz not null default now()
);

create table if not exists pece_nemoci (
  id         uuid primary key default gen_random_uuid(),
  od         date not null,
  "do"       date,
  deti       uuid[] not null default '{}',
  kdo        text not null check (kdo in ('ja','tereza')),
  poznamka   text,
  created_at timestamptz not null default now()
);
create index if not exists pece_nemoci_od_idx on pece_nemoci (od);

create table if not exists pece_lekari (
  id         uuid primary key default gen_random_uuid(),
  obor       text not null,
  kdo        text not null default 'domluva' check (kdo in ('ja','tereza','domluva')),
  poradi     int  not null default 100,
  created_at timestamptz not null default now()
);

create table if not exists pece_navstevy (
  id         uuid primary key default gen_random_uuid(),
  dite_id    uuid not null references deti(id) on delete cascade,
  obor       text not null,
  datum      date not null,
  kdo        text not null check (kdo in ('ja','tereza')),
  poznamka   text,
  created_at timestamptz not null default now()
);
create index if not exists pece_navstevy_datum_idx on pece_navstevy (datum);

create table if not exists pece_vypomoc (
  id          uuid primary key default gen_random_uuid(),
  datum       date not null,
  kdo_hlidal  text not null check (kdo_hlidal in ('ja','tereza')),   -- kdo vzal děti za druhého
  jednotka    text not null default 'den' check (jednotka in ('den','hod')),
  pocet       numeric not null check (pocet > 0),
  vyrovnani   boolean not null default false,
  poznamka    text,
  created_at  timestamptz not null default now()
);
create index if not exists pece_vypomoc_datum_idx on pece_vypomoc (datum);
-- 28. 10. 2026: u výpomoci se zapisuje, o které děti šlo
alter table pece_vypomoc add column if not exists deti uuid[] not null default '{}';


-- ── RLS + granty ─────────────────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['pece_vyjimky','pece_nemoci','pece_lekari','pece_navstevy','pece_vypomoc'] loop
    execute format('alter table %I enable row level security', t);
    if not exists (select 1 from pg_policies where tablename = t and policyname = t || '_vse') then
      execute format('create policy %I on %I for all to authenticated using (true) with check (true)', t || '_vse', t);
    end if;
    execute format('grant select, insert, update, delete on %I to authenticated', t);
    execute format('grant all on %I to service_role', t);
  end loop;
end $$;


-- ── Výchozí lékaři ───────────────────────────────────────────────────────
insert into pece_lekari (obor, kdo, poradi)
select v.obor, v.kdo, v.poradi
  from (values ('Zubař','ja',10), ('Psychiatrie','tereza',20), ('Pediatr','domluva',30)) as v(obor,kdo,poradi)
 where not exists (select 1 from pece_lekari l where l.obor = v.obor);


-- ── Nastavení ────────────────────────────────────────────────────────────
-- kotva: pondělí týdne, kdy má Jirka Patrika jen St + Čt (19. 10. 2026)
-- navsteva: sobota u mámy (Beatka, Jiřík) v tomtéž týdnu jako kotva, ob 14 dní
insert into app_nastaveni (klic, hodnota)
select 'pece', '{"kotva":"2026-10-19","vyzivne":11000,"splatnost":15,"ucet_terezy":"1763986028/3030"}'
 where not exists (select 1 from app_nastaveni where klic = 'pece');


-- ── Kontrola ─────────────────────────────────────────────────────────────
select obor, kdo from pece_lekari order by poradi;
