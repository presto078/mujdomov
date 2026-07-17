# Nový modul „Právník" — Shrnutí implementace

## ✅ Co bylo implementováno

Nová sekce **"Právník"** na hlavní stránce aplikace Domov s kompletním datovým modelem a napojením na cashflow.

### 📊 Datový model (5 tabulek)
```
pravnici_pripady ──┐
                   ├─ pravnici_zaznam ──┐
pravnici ──────────┤                    └─ pravnici_platby → fin_cashflow_plan
                   │
pravnici_sazby ────┘
```

**Tabulky:**
1. **pravnici_pripady** — Právnické případy (název, popis, stav: aktivní/uzavřený)
2. **pravnici** — Právníci/kanceláře (jméno, poznámka)
3. **pravnici_sazby** — Sazby (váza na právníka; hodnota, jednotka: Kč/hod nebo Kč/úkon)
4. **pravnici_zaznam** — Záznamy o práci (případ, právník, sazba, datum, počet h/úkonů, vypočtená castka)
5. **pravnici_platby** — Platby (vazba na záznam; datum, castka, účet); **→ fin_cashflow_plan**

### 🎨 UI Komponenty (App.jsx)
- **PravnikTab** — Hlavní view s 3 záložkami (Případy, Právníci, Záznamy)
- **PripadModal** — Přidání/úprava případu
- **PravnikModal** — Přidání/úprava právníka
- **SazbaModal** — Přidání/úprava sazby
- **ZaznamModal** — Přidání/úprava záznamu o práci
- **PlatbaModal** — Přidání platby; **automaticky se propíše do fin_cashflow_plan**

### 📱 Uživatelský interface

#### Záložka "Případy"
- Seřazení: Aktivní / Uzavřené
- Zobrazení: Případy, právníci na případu, částky (vyúčtováno vs. zaplaceno)
- Akce: Uzavřít, Záznamy & Platby, Upravit, Smazat

#### Záložka "Právníci"
- Seznam právníků s jejich sazbami
- Akce: Přidat sazbu, Upravit, Smazat

#### Záložka "Záznamy"
- Všechny záznamy seřazené po datu (nejnovější první)
- Indikátor stavu zaplacení (✓ Zaplaceno / ⊘ Částečně / ✕ Nezaplaceno)
- Detail jednotlivých plateb (datum, castka, účet)
- Akce: Přidat platbu, Upravit, Smazat

### 💰 Napojení na cashflow
- Při přidání **platby** se automaticky vytvoří záznam v **fin_cashflow_plan**
- Vazba: `zaznam_id` (nový sloupec v fin_cashflow_plan)
- Castka: **záporná** (výdaj)
- Účet: vybraný v formuláři Platby
- Umožňuje **částečné platby** — jeden záznam se může rozdělit na více plateb

### 📈 Statistiky
- Horní radek ukazuje: Počet aktivních případů, Počet právníků, Celkově vyúčtováno (Kč)

## 📋 Postup nasazení

### 1. SQL migrace
Spusť v Supabase SQL Editor (`supabase_pravnici.sql`):
```sql
-- Vytvoří tabulky: pravnici_pripady, pravnici, pravnici_sazby, pravnici_zaznam, pravnici_platby
-- Vytvoří indexy pro performance

-- DŮLEŽITÉ: Přidej sloupec do fin_cashflow_plan:
ALTER TABLE fin_cashflow_plan ADD COLUMN zaznam_id BIGINT;
ALTER TABLE fin_cashflow_plan ADD CONSTRAINT fk_zaznam
  FOREIGN KEY (zaznam_id) REFERENCES pravnici_zaznam(id) ON DELETE SET NULL;
```

### 2. React komponenty
Komponenty jsou již v `App.jsx`:
- `PravnikTab()` počínaje řádkem ~7211
- Všechny modaly (`PravnikModal`, `SazbaModal`, atd.)
- Dlaždice `{id: "pravnik", emoji: "👨‍⚖️", label: "Právník", ...}`
- Switch v renderu: `{modul==="pravnik" && <PravnikTab/>}`

### 3. Cashflow integrace
Aktualizovány funkce:
- `vazbaNaSloupce()` — přidán případ `zaznam_id`
- `cashflowVazbaInfo()` — přidán rendering info pro zaznam_id
- `CashflowModal` — přidána podpora zaznam_id v lock mechanismu
- `PlatbaModal` — automatické vytvoření fin_cashflow_plan záznamu

### 4. Testování
```
1. Restartuj aplikaci
2. Domov → Klikni na dlaždici "Právník"
3. Přidej případ, právníka, sazbu, záznam, platbu
4. Zkontroluj Finance → Cashflow (měl by se tam objevit nový výdaj)
```

## 🧪 Testovací data

Po spuštění SQL se vytvoří (zakomentovány aby se neprováděly automaticky):
```
Případ: Spor o děti
Právník: JUDr. Zeman
  - Sazba 1: 2500 Kč/hod (Konzultace)
  - Sazba 2: 2700 Kč/hod (Příprava na jednání)

Záznam 1: 14h × 2500 = 35 000 Kč
Záznam 2: 7h × 2700 = 18 900 Kč
─────────────────────────────
Celkem: 53 900 Kč
```

Platby si přidáš manuálně v UI:
- Přihlášení: Finance > Účty (najdi si ID účtu)
- Záznam 1: 20 000 Kč z jednoho účtu + 15 000 Kč z druhého (částečná úhrada)
- Záznam 2: např. 18 900 Kč najednou

## 🔗 Vazby a integrace

| Komponenta | Vazba | Poznámka |
|------------|-------|----------|
| fin_cashflow_plan | zaznam_id (FK) | Nový sloupec; umožňuje filtr případ.právník.práce |
| fin_ucty | pravnici_platby.ucet_id (FK) | Výběr z aktivních účtů |
| deti, zvire_id, oprava_id | - | Není vazba; právník je nezávislá doména |

## 📝 Soubory

- **App.jsx** — React komponenty (PravnikTab, modaly, integrace s UI)
- **supabase_pravnici.sql** — SQL schéma a migracija
- **IMPLEMENTACE_PRAVNICI.md** — Detailní návod nasazení

## ✨ Bonus: Stylizace

- Barva (barva `C.purple` / `#6b3fa0`) — konzistentní s aplikací
- Emoji `👨‍⚖️` — rozpoznatelný symbol pro právníka
- Stejný vizuální styl jako opravy (DumTab) — barevný top border, Tag s stavem

## ⚠️ Důležité poznámky

1. **Zaznam_id sloupec** — MUSÍŠ přidat do fin_cashflow_plan, aby fungoval cashflow!
2. **RLS politiky** — Pokud máš RLS, přidej práva pro tabulky (nebo vrátit auth.uid() IS NOT NULL)
3. **Částečné platby** — Jeden záznam = víc plateb (např. částka 53 900 se může rozdělit na 20k + 33,9k)
4. **Mazání** — Smazání záznamu smaže i všechny napojené platby (ON DELETE CASCADE)

## 🚀 Budoucí vylepšení

- [ ] Filtrování záznamů dle právníka / období
- [ ] Export PDF/CSV výkazů
- [ ] Upomínka na blížící se splatnosti
- [ ] Možnost připojit faktury přes EntityDokumentyPanel
- [ ] Počítadlo "dnů v řízení" ke každému případu

---

**Stav:** ✅ Hotovo a připraveno k nasazení  
**Datum:** 2026-07-17
