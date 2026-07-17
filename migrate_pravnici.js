#!/usr/bin/env node

/**
 * Migration skript pro modul Právník
 * Spusť: node migrate_pravnici.js
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Načti proměnné z .env
const envPath = path.join(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) env[key.trim()] = value.trim();
});

const SUPA_URL = env.VITE_SUPA_URL;
const SUPA_KEY = env.VITE_SUPA_KEY;

if (!SUPA_URL || !SUPA_KEY) {
  console.error('❌ Chybí VITE_SUPA_URL nebo VITE_SUPA_KEY v .env');
  process.exit(1);
}

console.log('🔗 Připojuji se k Supabase...');
const sb = createClient(SUPA_URL, SUPA_KEY);

const runMigration = async () => {
  try {
    // Soubor se SQL příkazy (bez INSERT, jen CREATE)
    const sqlContent = `
-- MODUL: PRÁVNÍCI — Datový model
-- Tabulka: Případy
CREATE TABLE IF NOT EXISTS pravnici_pripady (
  id BIGSERIAL PRIMARY KEY,
  nazev TEXT NOT NULL,
  popis TEXT,
  stav TEXT DEFAULT 'aktivni',
  vytvoreno TIMESTAMP DEFAULT NOW()
);

-- Tabulka: Právníci
CREATE TABLE IF NOT EXISTS pravnici (
  id BIGSERIAL PRIMARY KEY,
  jmeno TEXT NOT NULL,
  poznamka TEXT,
  vytvoreno TIMESTAMP DEFAULT NOW()
);

-- Tabulka: Sazby právníka
CREATE TABLE IF NOT EXISTS pravnici_sazby (
  id BIGSERIAL PRIMARY KEY,
  pravnik_id BIGINT NOT NULL REFERENCES pravnici(id) ON DELETE CASCADE,
  nazev TEXT NOT NULL,
  castka DECIMAL(10,2) NOT NULL,
  jednotka TEXT DEFAULT 'hod',
  vytvoreno TIMESTAMP DEFAULT NOW()
);

-- Tabulka: Záznamy o práci
CREATE TABLE IF NOT EXISTS pravnici_zaznam (
  id BIGSERIAL PRIMARY KEY,
  pripad_id BIGINT NOT NULL REFERENCES pravnici_pripady(id) ON DELETE CASCADE,
  pravnik_id BIGINT NOT NULL REFERENCES pravnici(id) ON DELETE CASCADE,
  sazba_id BIGINT NOT NULL REFERENCES pravnici_sazby(id) ON DELETE CASCADE,
  datum DATE NOT NULL,
  pocet_hodin_ukonu DECIMAL(8,2) NOT NULL,
  vypocitana_castka DECIMAL(10,2) NOT NULL,
  vytvoreno TIMESTAMP DEFAULT NOW()
);

-- Tabulka: Platby
CREATE TABLE IF NOT EXISTS pravnici_platby (
  id BIGSERIAL PRIMARY KEY,
  zaznam_id BIGINT NOT NULL REFERENCES pravnici_zaznam(id) ON DELETE CASCADE,
  datum_platby DATE NOT NULL,
  zaplacena_castka DECIMAL(10,2) NOT NULL,
  ucet_id BIGINT NOT NULL REFERENCES fin_ucty(id) ON DELETE RESTRICT,
  vytvoreno TIMESTAMP DEFAULT NOW()
);

-- Indexy
CREATE INDEX IF NOT EXISTS idx_pravnici_zaznam_datum ON pravnici_zaznam(datum);
CREATE INDEX IF NOT EXISTS idx_pravnici_platby_zaznam ON pravnici_platby(zaznam_id);

-- Přidat zaznam_id do fin_cashflow_plan
ALTER TABLE fin_cashflow_plan ADD COLUMN IF NOT EXISTS zaznam_id BIGINT;

-- Přidat constraint (pokud neexistuje)
-- Toto vyžaduje přímý SQL v Supabase console (ne přes RPC)
    `;

    console.log('📋 Spouštím SQL příkazy...\n');

    // Rozdělí SQL na jednotlivé příkazy
    const queries = sqlContent
      .split(';')
      .map(q => q.trim())
      .filter(q => q && !q.startsWith('--'));

    for (const query of queries) {
      try {
        console.log(`⚙️  Provádím: ${query.substring(0, 60)}...`);
        const { data, error } = await sb.rpc('exec_sql', { sql: query });

        if (error) {
          // exec_sql RPC nemusí existovat — zkusíme jiný přístup
          console.log(`   ℹ️  Preskočeno (vyžaduje admin token)\n`);
        } else {
          console.log(`   ✅ OK\n`);
        }
      } catch (err) {
        console.log(`   ⚠️  ${err.message}\n`);
      }
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('⚠️  POZNÁMKA: Spuštění přes RPC je omezené.');
    console.log('   Prosím, spusť SQL ručně v Supabase console:\n');
    console.log('   1. Jdi na: https://app.supabase.com');
    console.log('   2. SQL Editor → Nový dotaz');
    console.log('   3. Zkopíruj obsah supabase_pravnici.sql');
    console.log('   4. Spusť (zelené tlačítko ▶)\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  } catch (error) {
    console.error('❌ Chyba:', error.message);
    process.exit(1);
  }
};

runMigration();
