# 🚀 START — Nový modul „Právník"

## Co se vám právě stalo?

Přidali jsme do vašeho Domova nový modul **"Právník"** na správu právnických případů, sazeb, záznamů o práci a plateb. Vše je automaticky napojené na **Cashflow**.

## ⚡ Rychlý start (5 minut)

### Krok 1: SQL v Supabase (2 minuty)

1. Jdi do [Supabase dashboardu](https://app.supabase.com)
2. Vyber svůj projekt
3. Otevři **SQL Editor** → Nový dotaz
4. Zkopíruj a vlepš obsah souboru **`supabase_pravnici.sql`**
   - Vynech INSERT příkazy (ty jsou zakomentovány)
   - Spusť CREATE TABLE příkazy
5. Pak spusť ALTER příkazy pro `zaznam_id`:
   ```sql
   ALTER TABLE fin_cashflow_plan ADD COLUMN zaznam_id BIGINT;
   ALTER TABLE fin_cashflow_plan ADD CONSTRAINT fk_zaznam
     FOREIGN KEY (zaznam_id) REFERENCES pravnici_zaznam(id) ON DELETE SET NULL;
   ```

### Krok 2: Aplikace (3 minuty)

1. **Restart aplikace** — načti si ji znovu (F5 / Cmd+R)
2. Měla by se objevit nová dlaždice **👨‍⚖️ Právník** na Homepage
3. Klikni na ni → otevře se nový modul

## 🎯 Moje první případ — Příklad

Pojďme vytvořit případ, kterou jste si zadali:

### Krok A: Přidej případ
1. **Záložka „Případy"**
2. Tlačítko **„+ Přidat případ"**
3. Vyplň:
   - Název: `Spor o děti`
   - Popis: `Řízení o péči`
   - Stav: `Aktivní`
4. **Uložit**

### Krok B: Přidej právníka
1. **Záložka „Právníci"**
2. Tlačítko **„+ Přidat právníka"**
3. Vyplň:
   - Jméno: `JUDr. Zeman`
   - Poznámka: `Kancelář na Petříně`
4. **Uložit**
5. U právníka klikni na **„+ Sazba"**
   - Sazba 1: `Konzultace` — `2500` Kč/hod
   - Sazba 2: `Příprava na jednání` — `2700` Kč/hod

### Krok C: Přidej záznamy o práci
1. **Záložka „Záznamy"**
2. Tlačítko **„+ Přidat záznam"**
3. **Záznam 1:**
   - Případ: `Spor o děti`
   - Právník: `JUDr. Zeman`
   - Sazba: `Konzultace (2500 Kč/h)`
   - Datum: `1. července 2026`
   - Počet hodin: `14`
   - Castka: `35000` (auto-vyplní: 14 × 2500)
4. **Uložit**
5. **Záznam 2:**
   - Stejné, ale Sazba: `Příprava na jednání (2700 Kč/h)`, Počet: `7` hodin, Castka: `18900`

### Krok D: Přidej platby (částečné)
1. U **Záznamu 1** (35 000 Kč) klikni na **„💳 Přidat platbu"**
2. **Platba 1:**
   - Datum: `20. června 2026`
   - Castka: `20000` Kč
   - Účet: Vyber svůj účet (např. "Spořitelna")
   - **Uložit**
3. U stejného záznamu znovu **„💳 Přidat platbu"**
4. **Platba 2:**
   - Datum: `10. července 2026`
   - Castka: `15000` Kč
   - Účet: Jiný účet
   - **Uložit**

### Krok E: Zkontroluj Cashflow
1. Jdi do **Finance** → **Cashflow plán**
2. Měl bys vidět dva nové výdaje:
   - `Právník — platba (1)` — 20000 Kč
   - `Právník — platba (1)` — 15000 Kč

## 📊 Co vidíš v modulu?

### Horní řádek (statistika)
- **Připadů:** 1 (počet aktivních)
- **Právníků:** 1
- **Vyúčtováno:** 53,900 Kč (14×2500 + 7×2700)

### Záložka „Případy"
Vidíš:
```
🟢 AKTIVNÍ (1)

┌─ Spor o děti
│  Právníci: JUDr. Zeman
│  Vyúčtováno: 53,900 Kč | Zaplaceno: 35,000 Kč
│
│  [✓ Uzavřít] [💰 Záznamy & Platby] [✎ Upravit] [✕]
```

### Záložka „Právníci"
```
JUDr. Zeman
Sazby:
  • Konzultace: 2,500 Kč/h
  • Příprava na jednání: 2,700 Kč/h
[+ Sazba] [✎ Upravit] [✕]
```

### Záložka „Záznamy"
```
⊘ ČÁSTEČNĚ (14 h za 35,000 Kč)
Spor o děti
JUDr. Zeman · Konzultace (2,500 Kč/h) · 14 h
┌─ Vyúčtováno: 35,000 Kč
│  Zaplaceno: 35,000 Kč ✓
│  Platby:
│    • 20.6.2026 · 20,000 Kč · Spořitelna
│    • 10.7.2026 · 15,000 Kč · Konto
└─
[💳 Přidat platbu] [✎ Upravit] [✕]
```

## ❓ FAQ

**Q: Kde vidím platby?**  
A: V modulu Práv­níka → Záložka „Záznamy" → każý záznam → seznam Plateb dole

**Q: Jak se propíše do Cashflow?**  
A: Automaticky! Když přidáš platbu, vytvoří se nový výdaj v fin_cashflow_plan

**Q: Mohu zadat ručně castku (ne jen × sazba)?**  
A: Ano! U „Přidání záznamu" je castka editovatelná. Vepíšeš libovolné číslo.

**Q: Co se stane, když smažu záznam?**  
A: Smažou se i všechny napojené platby a jejich záznamy v Cashflow

**Q: Mohu mít jeden právníka na více případů?**  
A: Ano! Právník není vázaný. Můžeš ho použít na kterémkoliv případu.

**Q: Jak se propojuje s fin_cashflow_plan?**  
A: Přes nový sloupec `zaznam_id` — když se přidá platba, vytvoří se výdaj v Cashflow

## 📝 Dokumentace

Více informací naleznete v:
- **IMPLEMENTACE_PRAVNICI.md** — Podrobný technický návod
- **PRAVNICI_SHRN.md** — Shrnutí implementace
- **ZMENY_V_APP.md** — Co se změnilo v kódu

## 🔧 Troubleshooting

| Problém | Řešení |
|---------|--------|
| Dlaždice se nezobrazuje | Restartuj aplikaci (F5) |
| Chyba při přidání platby | Zkontroluj, že máš vybraný účet v Finance |
| Není "zaznam_id" | Spusť ALTER TABLE příkaz v Supabase SQL |
| Cashflow se nezobrazí | Počkej chvíli, aplikace může načítat data |

## ✨ Co je super

- 🎯 **Automatické propojení s Cashflow** — všechny platby se hned vidí v Finance
- 💰 **Částečné platby** — jeden záznam můžeš zadat v tří či více platbách
- 📊 **Přehled** — vidíš kolik je zaplaceno vs. kolik zbývá
- 🔗 **Bez vazby na osoby** — právník je svým mikrem doménou, ne závislý na deti/zvířatech
- 🧮 **Auto-výpočet** — hodinky/úkony × sazba se spočítají automaticky

---

**Hotovo!** 🎉

Máš-li jakékoliv otázky, podívej se na detailní dokumentaci nebo zkus aplikaci. Všechno je intuitivní!

**Enjoy!** 👨‍⚖️
