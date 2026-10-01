# Změny v App.jsx — Modul Právník

## Souhrn změn

Přidáno **~450 řádků** nového kódu pro modul "Právník" do `App.jsx`.

## 📋 Konkrétní změny

### 1. Helper funkce (řádky 136-147)
**`vazbaNaSloupce()`** — aktualizace pro zaznam_id:
```javascript
const base={dite_id:null,zvire_id:null,oprava_id:null,auto_id:null,zaznam_id:null,...}
if(t==="zaznam") return {...base,zaznam_id:id};
```

### 2. Helper funkce (řádky 147-155)
**`cashflowVazbaInfo()`** — přidání support pro zaznam_id:
```javascript
if(p.zaznam_id){const z=(zaznamy||[]).find(...);return{emoji:"⚖️",...};}
```

### 3. CashflowModal (řádky 161-212)
- Přidán `{data:zaznamy}` do useData hooků
- Aktualizován `lockVazba` pro `zaznam_id`
- Aktualizovány `nacitam` a `lockInfo` pro zaznamy

### 4. Nové React komponenty (řádky 7051-7210)
Všechny jsou modaly (dialogy) pro editaci dat:
- **PravnikModal** — přidání/úprava právníka (řádky 7051–7071)
- **SazbaModal** — přidání/úprava sazby (řádky 7072–7096)
- **PripadModal** — přidání/úprava případu (řádky 7097–7118)
- **ZaznamModal** — přidání/úprava záznamu (řádky 7119–7165)
- **PlatbaModal** — přidání platby **s napojením na fin_cashflow_plan** (řádky 7167–7209)

### 5. Hlavní komponenta (řádky 7211–7380)
**`PravnikTab()`** — Hlavní view s 3 záložkami (Případy, Právníci, Záznamy)

### 6. TILES (řádky 7382–7398)
Přidán nový tile:
```javascript
{id:"pravnik", emoji:"👨‍⚖️", label:"Právník", popis:"Případy a náklady", barva:"#6b3fa0"},
```
*Pozn.: Vložen mezi "alimenty" a "kalendar"*

### 7. Hlavní render (řádka 7608)
Přidán switch:
```javascript
{modul==="pravnik" && <PravnikTab/>}
```
*Pozn.: Vložen mezi "alimenty" a "kalendar"*

## 🔄 Workflow v PlatbaModal

```
Platba.uloz() →
  1. Vytvoř záznam v pravnici_platby ✓
  2. Vytvoř záznam v fin_cashflow_plan s zaznam_id ✓
  3. Zavolej onSaved() pro refresh UI ✓
```

## 📊 Datový tok

```
UI (PravnikTab) 
  ↓
Modaly (PlatbaModal, ZaznamModal, atd.)
  ↓
Supabase tabely (pravnici_*, fin_cashflow_plan)
  ↓
Refresh UI (reloadP, reloadPr, reloadPl)
```

## ✅ Co je hotovo

- [x] React komponenty v App.jsx
- [x] Integrace s vazbaNaSloupce()
- [x] Integrace s cashflowVazbaInfo()
- [x] Napojení na fin_cashflow_plan v PlatbaModal
- [x] TILES s novým modulem
- [x] Switch v renderu
- [x] Uživatelský interface (3 záložky)
- [x] Modaly pro editaci

## ⚠️ Co ještě MUSÍŠ udělat

1. **Spustit SQL migraci** (`supabase_pravnici.sql`)
2. **Přidat zaznam_id do fin_cashflow_plan** (ALTER TABLE příkaz v SQL)
3. **Restartovat aplikaci** (refresh či restart dev serveru)
4. **Testovat** — Domov → Právník → přidat data

## 🔗 Soubory

| Soubor | Účel |
|--------|------|
| `App.jsx` | React komponenty (upraveno) |
| `supabase_pravnici.sql` | Datový model (nový) |
| `IMPLEMENTACE_PRAVNICI.md` | Podrobný návod (nový) |
| `PRAVNICI_SHRN.md` | Shrnutí implementace (nový) |
| `ZMENY_V_APP.md` | Tento soubor (nový) |

## 🧪 Ověření

Spustit v konzoli / DevTools:
```javascript
// Zkontrolovat, že dlaždice existuje
console.log(TILES.find(t => t.id === "pravnik"));
// Výstup: {id: "pravnik", emoji: "👨‍⚖️", label: "Právník", ...}

// Zkontrolovat vazbaNaSloupce
console.log(vazbaNaSloupce("zaznam:42"));
// Výstup: {..., zaznam_id: "42", ...}
```

---

**Poslední aktualizace:** 2026-07-17  
**Řádků přidáno:** ~450  
**Nových komponent:** 6 (1 Tab + 5 Modals)
