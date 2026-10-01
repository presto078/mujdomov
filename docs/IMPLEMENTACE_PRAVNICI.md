# Implementace modulu „Právník"

## Přehled
Nový modul „Právník" ve Domově umožňuje správu právnických případů, sazeb, záznamů o práci a plateb s automatickým napojením na cashflow.

## Struktura

### Datový model (Supabase tabulky)
- **pravnici_pripady** — Právnické případy (název, popis, stav aktivní/uzavřený)
- **pravnici** — Právníci / kanceláře (jméno, poznámka)
- **pravnici_sazby** — Sazby jednotlivých právníků (název, částka, jednotka: Kč/hod nebo Kč/úkon)
- **pravnici_zaznam** — Záznamy o práci (případ, právník, sazba, datum, počet h/úkonů, vypočtená castka)
- **pravnici_platby** — Jednotlivé platby k záznamům (datum, castka, účet); umožňuje částečné platby

### Napojení na cashflow
- Tabulka `fin_cashflow_plan` **musí obsahovat sloupec `zaznam_id`**
- Při přidání platby se automaticky vytvoří záznam v `fin_cashflow_plan` s vazbou `zaznam_id`
- Umožňuje propojení s účty a sledování hotovosti

## Postup implementace

### Krok 1: SQL migracija v Supabase

Spusť SQL skript `supabase_pravnici.sql` v Supabase SQL editoru (https://app.supabase.com → SQL Editor):

1. Otevři **SQL Editor** v Supabase dashboardu
2. Vytvoř nový dotaz
3. Zkopíruj obsah `supabase_pravnici.sql` (tabulky bez INSERT příkazů pro testovací data)
4. Spusť migraci (zelené tlačítko ▶)

**Důležité:** Po vytvoření tabulek spusť ALTER příkaz:
```sql
ALTER TABLE fin_cashflow_plan ADD COLUMN zaznam_id BIGINT;
ALTER TABLE fin_cashflow_plan ADD CONSTRAINT fk_zaznam
  FOREIGN KEY (zaznam_id) REFERENCES pravnici_zaznam(id) ON DELETE SET NULL;
```

Pokud sloupec již existuje, bude SQL ignorovat ALTER (bez chyby).

### Krok 2: RLS (Row Level Security) — volitelně

Pokud máte zapnutý RLS (doporučuje se), přidej politiku:

```sql
-- Pro tabulku pravnici_pripady
CREATE POLICY "Vlastník si vidí své případy" ON public.pravnici_pripady
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Stejně pro ostatní tabulky...
```

### Krok 3: App.jsx je již hotov

React komponenty jsou již v App.jsx:
- `PravnikTab` — hlavní UI modulu
- `PravnikModal`, `SazbaModal`, `PripadModal`, `ZaznamModal`, `PlatbaModal` — dialogy pro editaci
- Dlaždice v TILES obsahuje ID `"pravnik"` s emoji `"👨‍⚖️"`

### Krok 4: Testování

1. **Restartuj aplikaci** — proveď reload nebo restart dev serveru
2. **Přejdi na Domov** → dlaždice **"Právník"** by se měla objevit
3. **Přidej testovací data:**
   - Klikni na „+ Přidat případ" → vytvoř „Spor o děti"
   - Klikni na „+ Přidat právníka" → vytvoř „JUDr. Zeman"
   - U právníka klikni na „+ Sazba" → přidej 2500 Kč/hod (Konzultace)
   - Tab „Záznamy" → přidej záznam: 14 hodin × 2500 = 35 000 Kč
   - U záznamu klikni „💳 Přidat platbu" → zadej 20 000 Kč, účet, datum
   - Zkontroluj **Finance > Cashflow** → měl by se tam objevit nový záznam

## Ukázková data

Po spuštění SQL skriptu se vytvoří:
- Případ: **"Spor o děti"**
- Právník: **JUDr. Zeman** (2 sazby: 2500 a 2700 Kč/hod)
- 2 záznamy o práci: 14h (35 000 Kč) + 7h (18 900 Kč) = 53 900 Kč
- Platby lze přidat přes UI (INSERT příkazy jsou zakomentovány, aby se neprováděly automaticky)

## Funkčnost

### Záložka „Případy"
- Seznam aktivních/uzavřených případů
- Zobrazení právníků a částek na případ
- Tlačítko „💰 Záznamy & Platby" pro detailní pohled

### Záložka „Právníci"
- Seznam právníků s jejich sazbami
- Tlačítko „+ Sazba" pro přidání nové sazby

### Záložka „Záznamy"
- Všechny záznamy o práci seřazené podle data (nejnovější první)
- Přehled zaplacení (část, částečně, úplně)
- Detail všech plateb k danému záznamu
- Tlačítko „💳 Přidat platbu" — vytvoří záznam v fin_cashflow_plan

## Poznámky

- **Avatáry**: Právníci nemají emoji jako zvířata či deti; barva je fixní (purple)
- **Cashflow**: Platby jsou vždy **výdaje** (záporná čísla)
- **Částečné platby**: Jeden záznam může mít více plateb (např. 2× ze stejného záznamu)
- **Mazání**: Smazáním záznamu se automaticky smažou i všechny napojené platby

## Troubleshooting

| Problém | Řešení |
|---------|--------|
| Modul se nezobrazí | Zkontroluj, že je `"pravnik"` v TILES a v switch renderu |
| Chyba při přidání platby | Zkontroluj, že fin_cashflow_plan má sloupec `zaznam_id` |
| Záznamy se nezobrazují | Zkontroluj RLS politiky nebo zmrazení přístupu |
| Cashflow se nesynchronizuje | Zkontroluj, že se `fin_cashflow_plan.insert()` provádí bez chyb |

## Budoucí rozšíření

- Možnost přidání dokumentů k případům (faktury, smlouvy) přes EntityDokumentyPanel
- Filtrování záznamů dle právníka/sazby
- Export výkazů CSV/PDF
- Notifikace na blížící se splatnosti

---

**Poslední aktualizace:** 2026-07-17  
**Autor:** Claude Code
