-- IT evidence a nastavení appky: odebrat role anon všechna práva.
--
-- RLS už nepřihlášené pouští jen do prázdna (politiky jsou jen pro
-- authenticated), tohle je pojistka navíc. Appka čte app_nastaveni až po
-- přihlášení, konektor jede přes service_role, takže anon nepotřebuje nic.
-- Nic se nemaže: tajne, klic i řádek it_vault_meta zůstávají.
-- Spustit v Supabase SQL Editoru (Hostice). Dá se pustit opakovaně.

revoke all on it_zarizeni, it_ucty, it_licence, app_nastaveni from anon;

-- ── Kontrola: anon nesmí mít nic, authenticated a service_role zůstávají ──
select table_name, grantee, string_agg(privilege_type, ', ' order by privilege_type) prava
  from information_schema.role_table_grants
 where table_schema = 'public'
   and table_name in ('it_zarizeni','it_ucty','it_licence','app_nastaveni')
   and grantee in ('anon','authenticated','service_role')
 group by table_name, grantee
 order by table_name, grantee;
