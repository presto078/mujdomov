# Konektor do Claude (MCP server)

Soubor `api/mcp.js` zpřístupní data Domova Claudovi. Vercel z něj sám udělá
serverovou funkci vedle appky — na `src/App.jsx` se nesahá.

Adresa serveru: `https://mujdomov.vercel.app/api/mcp`

Logika je v `api/_lib/`:

| Soubor | Co v něm je |
|---|---|
| `zaklad.js` | připojení k Supabase, data, částky, dohledání účtu/kategorie podle názvu |
| `finance.js` | Kde jsem, příjmy a výdaje, hledání plateb, číselníky |
| `rodina.js` | Péče, alimenty, děti a dárky |
| `domacnost.js` | právník, projekty, dům a auta, voda a elektřina, úkoly, hledání |
| `zapis.js` | všechny zapisující nástroje |

> **Pozor:** výpočty ve `finance.js`, `rodina.js` a `domacnost.js` jsou přepsané
> z `App.jsx` (KdeJsemTab, PrehledFinanci, PeceTab, AlimentyTab, ElektrinaTab).
> Když se v appce změní, jak se něco počítá, je potřeba to změnit i tady —
> jinak konektor a appka ukážou jiná čísla.

---

## 1. Co nastavit ve Vercelu

Settings → Environment Variables (Production):

| Proměnná | Co do ní patří |
|---|---|
| `DOMOV_MCP_TOKEN` | Heslo pro konektor. Vymyslíš si ho — dlouhé a náhodné. |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API Keys → **service_role** (legacy, začíná `eyJ`). |

`VITE_SUPA_URL` už ve Vercelu je, konektor ho použije.

**Důležité:** tyhle dvě proměnné **nesmí** začínat `VITE_`. Všechno s `VITE_`
Vite zapeče do JavaScriptu v prohlížeči — service klíč by pak mohl přečíst kdokoli.
Bez předpony zůstanou jen na serveru.

Service klíč obchází RLS, proto ho má jen server a konektor pustí dovnitř
jen s tokenem.

**Token si vyrobíš** v příkazové řádce:

```
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Po přidání proměnných je potřeba znovu nasadit (Deployments → ⋯ → Redeploy).

---

## 2. Připojení v Claude

Nastavení → Konektory → Přidat vlastní konektor.

- **Adresa:** `https://mujdomov.vercel.app/api/mcp`
- **Hlavička:** `Authorization` s hodnotou `Bearer <tvůj token>`

---

## 3. Nástroje

### Čtení

| Nástroj | Co vrací |
|---|---|
| `kde_jsem` | Likvidní peníze ke konci měsíce (rezerva, spoření, běžné), tempo za 8/3/1 měsíc, na jak dlouho vydrží, závazky (SJM), slepé místo hotovosti. U každého účtu měsíc zůstatku a výpisy do. |
| `prijmy_a_vydaje` | Měsíc, rozsah nebo průměr: příjmy, povinné a ostatní výdaje, vratky, hotovost, bilance, po kategoriích a projektech, nezařazené. Jestli má období výpisy ze všech účtů. |
| `transakce` | Hledání plateb (text, období, účet, kategorie, projekt, částka, nezařazené). Součty za celý filtr. |
| `ciselniky` | Účty, kategorie, projekty, lidé, auta s id. |
| `pece` | Rozpis Patrika po dnech, dnešek a další předání, soboty Beatky u mámy, nemoci a kdo je na řadě, lékaři, výpomoc, výživné od Terezy. |
| `alimenty` | Šíma: sazby, platby po měsících, nedoplatek, mimořádné výdaje, dluh. |
| `rodina` | Lidé (věk, škola, kroužky — bez rodných čísel), zvířata, dárky po dětech, školní pomůcky. |
| `pravnik` | Případy, sazby, záznamy, kolik je vyúčtováno, zaplaceno a zbývá. |
| `projekty` | Finanční projekty a akce: utraceno, závazky, rozpočet, todo. |
| `dum_a_auta` | Otevřené opravy, auta (km, servis, leasing, náklady). |
| `energie` | Voda a elektřina: odečty, faktury, průběžný přeplatek/nedoplatek. |
| `ukoly` | Pravidelné úkoly, poznámky, todo projektů, předplatné, zásoby pod minimem. |
| `hledej` | Jedním dotazem napříč platbami, poznámkami, opravami, dárky… |

Evidence IT (počítače, licence, účty) je v DATA PRESCO, nástroje `it`
a `zapsat_zarizeni` byly z konektoru odebrané. Tabulky `it_*` v Supabase zůstávají.

### Zápis — vždy dva kroky

1. Claude zavolá nástroj **bez** `potvrdit` → nic se nezapíše, vrátí se náhled.
2. Teprve po tvém „ano“ zavolá znovu s `potvrdit: true`.

**Nic se nemaže.** Mazání zůstává v appce.

| Nástroj | Co zapisuje |
|---|---|
| `zaradit_transakce` | Kategorie, projekt, pro koho, poznámka u plateb (až 100 najednou). |
| `zapsat_hotovost` | Řádek do deníku 💵 Hotovost. Prázdný měsíc založí i ze šablon, stejně jako appka. |
| `zapsat_zustatek` | Zůstatek účtu ke konci měsíce. |
| `zapsat_odecet` | Odečet vody (3 vodoměry) nebo elektřiny (VT/NT). Hlídá duplicitu a pokles. |
| `pece_zapis` | Výjimka v rozpisu, nemoc, výpomoc s hlídáním, návštěva lékaře. |
| `pravnik_zapis` | Záznam práce (částka ze sazby) nebo platba (propíše se i do cashflow plánu). |
| `zapsat_poznamku` | Poznámka, nebo položka do todo projektu. |
| `oznacit_splnene` | Poznámka / todo splněno; pravidelný úkol splněn a posunut termín. |
| `zapsat_auto` | Kilometry, servis, náklad. |
| `zapsat_darek` | Dárek nebo přání; změna stavu, ceny, kde je schovaný. |
| `zapsat_opravu` | Oprava domu; změna stavu, částky, priority. |

---

## 4. Co konektor záměrně nedělá

- Nevypisuje rodná čísla. IT evidenci (ani hesla a klíče z trezoru) nečte vůbec.
- Nemaže.
- Nepouští libovolné SQL — jen pevně dané nástroje.
