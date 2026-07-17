-- ═════════════════════════════════════════════════════════════════════════════
-- MODUL: PRÁVNÍCI — Datový model (Supabase SQL)
-- ═════════════════════════════════════════════════════════════════════════════

-- Tabulka: Případy
CREATE TABLE IF NOT EXISTS pravnici_pripady (
  id BIGSERIAL PRIMARY KEY,
  nazev TEXT NOT NULL,
  popis TEXT,
  stav TEXT DEFAULT 'aktivni', -- 'aktivni' | 'uzavreny'
  vytvoreno TIMESTAMP DEFAULT NOW()
);

-- Tabulka: Právníci
CREATE TABLE IF NOT EXISTS pravnici (
  id BIGSERIAL PRIMARY KEY,
  jmeno TEXT NOT NULL, -- JUDr. Zeman, kancelář apod.
  poznamka TEXT,
  vytvoreno TIMESTAMP DEFAULT NOW()
);

-- Tabulka: Sazby právníka (jeden právník → víc sazeb)
CREATE TABLE IF NOT EXISTS pravnici_sazby (
  id BIGSERIAL PRIMARY KEY,
  pravnik_id BIGINT NOT NULL REFERENCES pravnici(id) ON DELETE CASCADE,
  nazev TEXT NOT NULL, -- "Konzultace" | "Soudní řízení" apod.
  castka DECIMAL(10,2) NOT NULL, -- 2500 Kč
  jednotka TEXT DEFAULT 'hod', -- 'hod' | 'ukon'
  vytvoreno TIMESTAMP DEFAULT NOW()
);

-- Tabulka: Záznamy o práci (work logs / výúčtování)
-- Odkazuje na: případ, právníka a sazbu
-- Vypočtená částka = počet_hodin_ukonu × castka ze sazby (ale ručně editovatelná)
CREATE TABLE IF NOT EXISTS pravnici_zaznam (
  id BIGSERIAL PRIMARY KEY,
  pripad_id BIGINT NOT NULL REFERENCES pravnici_pripady(id) ON DELETE CASCADE,
  pravnik_id BIGINT NOT NULL REFERENCES pravnici(id) ON DELETE CASCADE,
  sazba_id BIGINT NOT NULL REFERENCES pravnici_sazby(id) ON DELETE CASCADE,
  datum DATE NOT NULL,
  pocet_hodin_ukonu DECIMAL(8,2) NOT NULL, -- 14.5 hodin / 3 úkony
  vypocitana_castka DECIMAL(10,2) NOT NULL, -- ručně editovatelná; odvozeno ze sazby × počet
  vytvoreno TIMESTAMP DEFAULT NOW()
);

-- Tabulka: Platby (k záznamu se váže víc plateb → částečné platby)
-- Propojení s fin_cashflow_plan přes sloupec zaznam_id (podobně jako oprava_id)
CREATE TABLE IF NOT EXISTS pravnici_platby (
  id BIGSERIAL PRIMARY KEY,
  zaznam_id BIGINT NOT NULL REFERENCES pravnici_zaznam(id) ON DELETE CASCADE,
  datum_platby DATE NOT NULL,
  zaplacena_castka DECIMAL(10,2) NOT NULL,
  ucet_id BIGINT NOT NULL REFERENCES fin_ucty(id) ON DELETE RESTRICT, -- Výběr z existujících účtů
  vytvoreno TIMESTAMP DEFAULT NOW()
);

-- Index pro cashflow dotazy
CREATE INDEX IF NOT EXISTS idx_pravnici_zaznam_datum ON pravnici_zaznam(datum);
CREATE INDEX IF NOT EXISTS idx_pravnici_platby_zaznam ON pravnici_platby(zaznam_id);

-- ═════════════════════════════════════════════════════════════════════════════
-- PROPOJENÍ NA CASHFLOW — Sloupec zaznam_id v fin_cashflow_plan
-- ═════════════════════════════════════════════════════════════════════════════
-- Pokud fin_cashflow_plan nemá sloupe zaznam_id, přidejte:
-- ALTER TABLE fin_cashflow_plan ADD COLUMN zaznam_id BIGINT;
-- ALTER TABLE fin_cashflow_plan ADD CONSTRAINT fk_zaznam
--   FOREIGN KEY (zaznam_id) REFERENCES pravnici_zaznam(id) ON DELETE SET NULL;

-- ═════════════════════════════════════════════════════════════════════════════
-- UKÁZKOVÁ DATA
-- ═════════════════════════════════════════════════════════════════════════════

INSERT INTO pravnici_pripady (nazev, popis, stav)
VALUES
  ('Spor o děti', 'Řízení ve věci péče o nezletilé děti', 'aktivni'),
  ('Dědictví', 'Vydělení podílu ze stanoveného dědictví', 'uzavreny');

INSERT INTO pravnici (jmeno, poznamka)
VALUES
  ('JUDr. Zeman', 'Kancelář na Petříně'),
  ('JUDr. Nováková', 'Doporučena jako specialista na rodinné právo');

-- Sazby pro JUDr. Zemana (id=1)
INSERT INTO pravnici_sazby (pravnik_id, nazev, castka, jednotka)
VALUES
  (1, 'Konzultace', 2500, 'hod'),
  (1, 'Příprava na jednání', 2700, 'hod');

-- Záznamy k „Sporu o děti" (pripad_id=1, pravnik_id=1)
INSERT INTO pravnici_zaznam (pripad_id, pravnik_id, sazba_id, datum, pocet_hodin_ukonu, vypocitana_castka)
VALUES
  (1, 1, 1, '2026-07-01', 14, 35000),     -- 14h × 2500
  (1, 1, 2, '2026-07-05', 7, 18900);       -- 7h × 2700

-- Platby k prvnímu záznamu (Spor o děti, Konzultace 35000 Kč)
-- Částečná úhrada: 20000 Kč ze "Spořitelny" + 15000 Kč z "Konta" později
-- INSERT INTO pravnici_platby (zaznam_id, datum_platby, zaplacena_castka, ucet_id)
-- VALUES
--   (1, '2026-06-20', 20000, 1), -- Předpokládejme fin_ucty.id=1 pro "Spořitelna"
--   (1, '2026-07-10', 15000, 2); -- fin_ucty.id=2 pro "Konto"

-- Poznámka: fin_ucty.id zjistíte v tabulce fin_ucty (Finance > Účty v UI)
