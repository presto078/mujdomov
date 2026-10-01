-- Elektřina: výměna elektroměru — spustit v Supabase SQL Editoru (idempotentní)
-- Řádek s výměnou: vt/nt = konečný stav starého, novy_vt/novy_nt = počáteční stav nového.
alter table el_odecty add column if not exists novy_vt numeric;
alter table el_odecty add column if not exists novy_nt numeric;
