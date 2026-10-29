/* =====================================================================
   MCP server pro Domov — konektor do Claude.

   Připojuje se jako vlastní konektor v Claude:
     adresa    https://mujdomov.vercel.app/api/mcp
     hlavička  Authorization: Bearer <token z DOMOV_MCP_TOKEN>

   Proměnné prostředí ve Vercelu (BEZ předpony VITE_, ať se nedostanou
   do prohlížeče):
     DOMOV_MCP_TOKEN            heslo pro konektor (dlouhé a náhodné)
     SUPABASE_SERVICE_ROLE_KEY  service_role klíč z Supabase → Settings → API
     SUPABASE_URL               nepovinné — jinak se vezme VITE_SUPA_URL

   Čtecí nástroje jen čtou. Zapisující bez `potvrdit: true` jen ukážou
   náhled a nic nezapíšou. Žádný nástroj nemaže. Evidence IT je
   v DATA PRESCO, nástroje it a zapsat_zarizeni tu proto nejsou.
   Návod k nastavení: MCP.md v kořeni repozitáře.
   ===================================================================== */

import { timingSafeEqual } from "node:crypto";
import { kdeJsem, prijmyAVydaje, transakce, ciselniky } from "./_lib/finance.js";
import { pece, alimenty, rodina } from "./_lib/rodina.js";
import { pravnik, projekty, dumAAuta, energie, ukoly, hledej } from "./_lib/domacnost.js";
import {
  zaraditTransakce, zapsatHotovost, zapsatZustatek, zapsatOdecet, peceZapis, pravnikZapis,
  zapsatPoznamku, oznacitSplnene, zapsatAuto, zapsatDarek, zapsatOpravu,
} from "./_lib/zapis.js";

export const config = { maxDuration: 60 };

const VERZE_PROTOKOLU = "2025-06-18";
const PODPOROVANE = ["2025-06-18", "2025-03-26", "2024-11-05"];

/* ------------------------------------------------------- schémata */

const S = (t, d) => ({ type: t, description: d });
const datum = (d) => S("string", `${d} (RRRR-MM-DD)`);
const potvrdit = S("boolean", "true = opravdu zapsat. Bez něj se vrátí jen náhled.");
const obj = (properties, required = []) => ({ type: "object", properties, required, additionalProperties: false });

/* --------------------------------------------------------- nástroje */

export const NASTROJE = [
  /* ---- peníze ---- */
  {
    name: "kde_jsem",
    title: "Kde jsem — likvidita a tempo",
    description:
      "Kolik je peněz na likvidních účtech na konci měsíce (rezerva, spoření s cílem, běžné + hotovost), jak rychle ubývají nebo přibývají " +
      "(okna 8, 3 a 1 měsíc, i jen za banky), na kolik měsíců vydrží, závazky s cílovou částkou (např. SJM) a slepé místo hotovosti. " +
      "Stejný výpočet jako záložka 🧭 Kde jsem. U každého účtu vrací, z kterého měsíce je zůstatek a po jaké datum jsou výpisy.",
    inputSchema: obj({ k_mesici: S("string", "Měsíc RRRR-MM; výchozí poslední dokončený.") }),
    handler: kdeJsem,
  },
  {
    name: "prijmy_a_vydaje",
    title: "Příjmy a výdaje za období",
    description:
      "Příjmy, povinné a ostatní výdaje, vratky, hotovost z deníku a bilance za měsíc, rozsah dat nebo jako měsíční průměr; " +
      "rozpad po kategoriích a projektech a nezařazené platby. Převody mezi vlastními účty a neutrální projekty se nepočítají, vratky se odečtou " +
      "od výdajů své kategorie — stejně jako přehled Financí v appce. Vrací i, jestli má období výpisy ze všech účtů.",
    inputSchema: obj({
      mesic: S("string", "RRRR-MM. Bez parametrů = poslední úplný měsíc."),
      od: datum("Začátek rozsahu"),
      do: datum("Konec rozsahu"),
      prumer: S("boolean", "true = měsíční průměr z úplných měsíců"),
      mesicu: S("integer", "U průměru: z kolika posledních úplných měsíců (výchozí všechny)"),
    }),
    handler: prijmyAVydaje,
  },
  {
    name: "transakce",
    title: "Hledání plateb",
    description:
      "Pohyby z bankovních výpisů s účtem, kategorií, projektem a „pro koho“. Filtry: text (popis, protistrana, poznámka, VS), období, účet, " +
      "kategorie (nebo 'zadna'), projekt (nebo 'zadny'), přesná částka, směr, jen nezařazené. Součty platí za celý filtr. " +
      "Vrací id potřebná pro zaradit_transakce a po jaké datum jsou výpisy.",
    inputSchema: obj({
      text: S("string", "Hledaný text"),
      od: datum("Od"),
      do: datum("Do"),
      ucet: S("string", "Název nebo id účtu"),
      kategorie: S("string", "Název nebo id kategorie, 'zadna' = bez kategorie"),
      projekt: S("string", "Název nebo id projektu, 'zadny' = bez projektu"),
      castka: S("number", "Přesná částka (bez ohledu na znaménko)"),
      smer: { type: "string", enum: ["prijem", "vydaj"] },
      nezarazene: S("boolean", "Jen bez kategorie a bez převodů"),
      bez_prevodu: S("boolean", "Vynechat převody mezi vlastními účty"),
      limit: S("integer", "Kolik řádků vrátit (výchozí 50, max 500)"),
    }),
    handler: transakce,
  },
  {
    name: "ciselniky",
    title: "Účty, kategorie, projekty, lidé, auta",
    description: "Seznamy s id: účty (skupina, účel, číslo, výpisy do), kategorie, finanční projekty, členové rodiny, auta. Pro dohledání názvů před zápisem.",
    inputSchema: obj({ co: { type: "array", items: { type: "string", enum: ["ucty", "kategorie", "projekty", "deti", "auta"] } } }),
    handler: ciselniky,
  },
  /* ---- rodina ---- */
  {
    name: "pece",
    title: "Péče — kdy jsou děti u koho",
    description:
      "Rozpis Patrika po dnech (14denní cyklus s Terezou + výjimky), kdo ho má dnes a kdy je další předání, soboty Beatky u mámy, " +
      "nemoci a kdo je na řadě zůstat doma, lékaři a návštěvy, bilance výpomoci s hlídáním a výživné od Terezy po měsících (s datem, do kdy jsou výpisy).",
    inputSchema: obj({ od: datum("Od (výchozí dnes)"), do: datum("Do (výchozí od + 13 dní, max 93 dní)"), nemoci: S("integer", "Kolik posledních nemocí vypsat") }),
    handler: pece,
  },
  {
    name: "alimenty",
    title: "Alimenty — Šíma",
    description:
      "Alimenty se Šímou na Sylvestra a Johna: aktuální sazby, platby po měsících (má být bez splátky dluhu vs. zaplaceno), nedoplatek otce, " +
      "zůstatek mimořádných výdajů a dluh se splátkami. Jirka je v modulu „matka“.",
    inputSchema: obj({ mesicu: S("integer", "Kolik měsíců plateb (výchozí 12)") }),
    handler: alimenty,
  },
  {
    name: "rodina",
    title: "Rodina, dárky, zvířata",
    description: "Členové rodiny (věk, škola, třída, kroužky), zvířata, dárky za rok po dětech (koupeno, přání, kde schované) a nevyřízené školní pomůcky. Rodná čísla nevrací.",
    inputSchema: obj({ rok: S("integer", "Rok dárků (výchozí letošní)") }),
    handler: rodina,
  },
  /* ---- domácnost ---- */
  {
    name: "pravnik",
    title: "Právník",
    description: "Případy, právníci se sazbami, záznamy práce a platby: kolik je vyúčtováno, zaplaceno a kolik zbývá zaplatit. Vrací id záznamů pro zápis platby.",
    inputSchema: obj({ pripad: S("string", "Název nebo id případu — vrátí všechny jeho záznamy"), stav: { type: "string", enum: ["aktivni", "uzavreny"] } }),
    handler: pravnik,
  },
  {
    name: "projekty",
    title: "Projekty",
    description:
      "Finanční projekty (kolik se na nich utratilo podle výpisů, u závazků cíl, zaplaceno a zbývá) a akce (svatba apod.: rozpočet odhad/skutečnost, " +
      "otevřené todo, počet hostů). S parametrem projekt vrátí detail včetně plateb nebo položek rozpočtu.",
    inputSchema: obj({ projekt: S("string", "Název nebo id projektu či akce"), vcetne_neaktivnich: S("boolean", "I neaktivní finanční projekty") }),
    handler: projekty,
  },
  {
    name: "dum_a_auta",
    title: "Dům a auta",
    description: "Otevřené opravy domu, auta (km, poslední a další servis, leasing, náklady zapsané v modulu Auta).",
    inputSchema: obj({}),
    handler: dumAAuta,
  },
  {
    name: "energie",
    title: "Voda a elektřina",
    description:
      "Voda: poslední odečty tří vodoměrů, poslední faktury vodného a stočného, nezaplacené faktury, odhad od poslední faktury. " +
      "Elektřina: poslední odečet a kdy je další, aktuální ceník a záloha, průběžný přeplatek/nedoplatek od posledního vyúčtování po obdobích.",
    inputSchema: obj({}),
    handler: energie,
  },
  {
    name: "ukoly",
    title: "Úkoly, poznámky, předplatné, sklad",
    description: "Pravidelné úkoly po termínu a v nejbližších dnech, nesplněné poznámky, otevřené todo projektů, aktivní předplatné a zásoby pod minimem. Vrací id pro oznacit_splnene.",
    inputSchema: obj({ dni: S("integer", "Horizont pro pravidelné úkoly ve dnech (výchozí 30)") }),
    handler: ukoly,
  },
  {
    name: "hledej",
    title: "Hledat v Domově",
    description: "Jedním dotazem projde platby, poznámky, opravy, todo, dárky a právní případy.",
    inputSchema: obj({ dotaz: S("string", "Co hledat"), limit: S("integer", "Max výsledků na druh (výchozí 15)") }, ["dotaz"]),
    handler: hledej,
  },

  /* ---- zápisy ---- */
  {
    name: "zaradit_transakce",
    title: "Zařadit platby",
    zapisuje: true,
    description: "Nastaví platbám kategorii, projekt, „pro koho“ nebo poznámku (až 100 najednou, id z nástroje transakce). Ostatní pole nemění.",
    inputSchema: obj({
      ids: { type: "array", items: { type: "string" }, description: "id transakcí" },
      kategorie: S("string", "Název/id kategorie, 'zadna' = odebrat"),
      projekt: S("string", "Název/id projektu, 'zadny' = odebrat"),
      pro_koho: S("string", "Jméno člověka, název auta, 'rodina', 'dum' nebo 'nikdo'"),
      poznamka: S("string", "Poznámka k platbě"),
      potvrdit,
    }, ["ids"]),
    handler: zaraditTransakce,
  },
  {
    name: "zapsat_hotovost",
    title: "Deník hotovosti",
    zapisuje: true,
    description:
      "Přidá řádek do deníku 💵 Hotovost pro měsíc (kladně = hotovost přibyla, záporně = utracená/předaná), nebo s id upraví existující řádek. " +
      "Když měsíc v deníku ještě není, založí ho i ze šablon jako appka.",
    inputSchema: obj({
      mesic: S("string", "RRRR-MM"), nazev: S("string", "Co to je"), castka: S("number", "Kč, + příjem / − výdaj"),
      kategorie: S("string", "Kategorie (nepovinné)"), poznamka: S("string", ""), id: S("string", "Úprava existujícího řádku"), potvrdit,
    }, ["mesic"]),
    handler: zapsatHotovost,
  },
  {
    name: "zapsat_zustatek",
    title: "Zůstatek účtu",
    zapisuje: true,
    description: "Zapíše (nebo přepíše) zůstatek účtu ke konci měsíce — hlavně u účtů bez výpisů (hotovost, investice). Náhled ukáže dosavadní hodnotu.",
    inputSchema: obj({ ucet: S("string", "Název nebo id účtu"), mesic: S("string", "RRRR-MM"), stav: S("number", "Zůstatek v Kč"), potvrdit }, ["ucet", "mesic", "stav"]),
    handler: zapsatZustatek,
  },
  {
    name: "zapsat_odecet",
    title: "Odečet vody nebo elektřiny",
    zapisuje: true,
    description: "Zapíše odečet vodoměru (m³) nebo elektroměru (VT a NT v kWh). Hlídá duplicitu a pokles stavu; výměnu měřáku dělej v appce.",
    inputSchema: obj({
      meridlo: { type: "string", enum: ["voda_fakturacni", "voda_podruzny", "voda_zahradni", "elektrina"] },
      datum: datum("Datum odečtu"), stav: S("number", "Voda: stav v m³"), vt: S("number", "Elektřina VT kWh"), nt: S("number", "Elektřina NT kWh"),
      poznamka: S("string", ""), potvrdit,
    }, ["meridlo", "datum"]),
    handler: zapsatOdecet,
  },
  {
    name: "pece_zapis",
    title: "Péče — zápis",
    zapisuje: true,
    description:
      "druh=vyjimka: Patrik bude daný den u někoho jiného než podle rozpisu (datum, kdo). druh=nemoc: od, do, deti, kdo (bez kdo = kdo je na řadě). " +
      "druh=vypomoc: kdo hlídal místo druhého (datum, kdo, deti, jednotka den/hod, pocet). druh=navsteva_lekare: datum, dite, obor, kdo. kdo = ja / tereza / domluva.",
    inputSchema: obj({
      druh: { type: "string", enum: ["vyjimka", "nemoc", "vypomoc", "navsteva_lekare"] },
      datum: datum("Den"), od: datum("Nemoc od"), do: datum("Nemoc do"),
      deti: { type: "array", items: { type: "string" }, description: "Patrik, Beatka, Jiřík" },
      dite: S("string", "Patrik, Beatka nebo Jiřík"), obor: S("string", "Zubař, Pediatr, Psychiatrie…"),
      kdo: S("string", "ja, tereza nebo domluva"), jednotka: { type: "string", enum: ["den", "hod"] }, pocet: S("number", "Kolik dní/hodin"),
      poznamka: S("string", ""), potvrdit,
    }, ["druh"]),
    handler: peceZapis,
  },
  {
    name: "pravnik_zapis",
    title: "Právník — zápis",
    zapisuje: true,
    description:
      "druh=zaznam: práce právníka (pripad, pravnik, sazba, mnozstvi hodin/úkonů, datum) — částka se spočítá ze sazby. " +
      "druh=platba: zaplacení záznamu (zaznam_id, ucet, castka — výchozí celý zbytek, datum); propíše se i do plánu cashflow jako v appce.",
    inputSchema: obj({
      druh: { type: "string", enum: ["zaznam", "platba"] },
      pripad: S("string", ""), pravnik: S("string", ""), sazba: S("string", "Název nebo id sazby"), mnozstvi: S("number", ""),
      zaznam_id: S("string", ""), ucet: S("string", "Účet, ze kterého se platilo"), castka: S("number", ""), datum: datum("Datum"), potvrdit,
    }, ["druh"]),
    handler: pravnikZapis,
  },
  {
    name: "zapsat_poznamku",
    title: "Poznámka nebo úkol projektu",
    zapisuje: true,
    description: "Bez projektu založí poznámku v modulu Poznámky (priorita nizka/normalni/vysoka). S projektem (akce) přidá položku do jeho todo.",
    inputSchema: obj({ nazev: S("string", ""), obsah: S("string", ""), priorita: { type: "string", enum: ["nizka", "normalni", "vysoka"] }, projekt: S("string", "Akce, do jejíhož todo patří"), potvrdit }, ["nazev"]),
    handler: zapsatPoznamku,
  },
  {
    name: "oznacit_splnene",
    title: "Označit splněné",
    zapisuje: true,
    description: "typ=poznamka nebo todo: označí jako splněné. typ=ukol: pravidelný úkol — zapíše splnění a posune další termín o interval.",
    inputSchema: obj({ typ: { type: "string", enum: ["poznamka", "todo", "ukol"] }, id: S("string", "id z nástroje ukoly"), datum: datum("Kdy splněno (výchozí dnes)"), poznamka: S("string", ""), potvrdit }, ["typ", "id"]),
    handler: oznacitSplnene,
  },
  {
    name: "zapsat_auto",
    title: "Auto — km, servis, náklad",
    zapisuje: true,
    description: "druh=km: stav tachometru. druh=servis: popis, typ (stk, brzdy, jine…), castka, kde, km, další servis. druh=naklad: typ a castka.",
    inputSchema: obj({
      druh: { type: "string", enum: ["km", "servis", "naklad"] }, auto: S("string", "Název, SPZ nebo id"), datum: datum("Datum"),
      km: S("number", ""), popis: S("string", ""), typ: S("string", ""), castka: S("number", ""), kde: S("string", ""),
      dalsi_servis_datum: datum("Další servis"), dalsi_servis_km: S("number", ""), poznamka: S("string", ""), potvrdit,
    }, ["druh", "auto"]),
    handler: zapsatAuto,
  },
  {
    name: "zapsat_darek",
    title: "Dárek",
    zapisuje: true,
    description: "Bez id přidá dárek nebo přání dítěti (prilezitost vanoce/narozeniny/jine, stav prani/koupeno/zabaleno). S id změní stav, cenu nebo kde je schovaný.",
    inputSchema: obj({
      id: S("string", ""), dite: S("string", ""), rok: S("integer", ""), prilezitost: { type: "string", enum: ["vanoce", "narozeniny", "jine"] },
      nazev: S("string", ""), cena: S("number", ""), stav: { type: "string", enum: ["prani", "koupeno", "zabaleno"] },
      kde: S("string", "Kde koupit/koupeno"), schovane: S("string", "Kde je schovaný"), odkaz: S("string", ""), poznamka: S("string", ""), potvrdit,
    }),
    handler: zapsatDarek,
  },
  {
    name: "zapsat_opravu",
    title: "Oprava domu",
    zapisuje: true,
    description: "Bez id založí opravu domu, s id změní stav (plan/probiha/hotovo), částku, popis nebo prioritu.",
    inputSchema: obj({
      id: S("string", ""), nazev: S("string", ""), popis: S("string", ""), stav: { type: "string", enum: ["plan", "probiha", "hotovo"] },
      priorita: { type: "string", enum: ["nizka", "normalni", "vysoka"] }, datum_plan: datum("Plán"), datum_hotovo: datum("Hotovo"), castka: S("number", ""), potvrdit,
    }),
    handler: zapsatOpravu,
  },
];

const INSTRUKCE =
  "Domov — Jirkova rodinná appka: finance z bankovních výpisů, péče o děti a střídání s Terezou, alimenty se Šímou, právník, projekty, " +
  "dům a auta, voda a elektřina, úkoly a dárky. Evidence počítačů je v DATA PRESCO, ne tady. Nástroje bez „zapisuje“ jen čtou. Zapisující nástroje nejdřív zavolej " +
  "bez potvrdit, ukaž náhled uživateli a zapisuj (potvrdit: true) až po jeho výslovném souhlasu. Nic se nemaže. " +
  "Než něco označíš za nezaplacené nebo chybějící, podívej se na vypisy_do — po tom datu výpisy ještě nejsou nahrané. Částky jsou v Kč.";

/* ---------------------------------------------------------- JSON-RPC */

const odpoved = (id, result) => ({ jsonrpc: "2.0", id, result });
const chyba = (id, code, message) => ({ jsonrpc: "2.0", id, error: { code, message } });

export async function zpracuj(z) {
  const { id, method, params } = z ?? {};

  if (method === "initialize") {
    const chteno = params?.protocolVersion;
    return odpoved(id, {
      protocolVersion: PODPOROVANE.includes(chteno) ? chteno : VERZE_PROTOKOLU,
      capabilities: { tools: { listChanged: false } },
      serverInfo: { name: "domov", title: "Domov", version: "1.0.0" },
      instructions: INSTRUKCE,
    });
  }
  if (method === "ping") return odpoved(id, {});
  if (method === "tools/list") {
    return odpoved(id, {
      tools: NASTROJE.map((n) => ({
        name: n.name,
        title: n.title,
        description: n.zapisuje ? `Zapisuje. ${n.description}` : n.description,
        inputSchema: n.inputSchema,
        annotations: n.zapisuje
          ? { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false }
          : { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
      })),
    });
  }
  if (method === "tools/call") {
    const n = NASTROJE.find((x) => x.name === params?.name);
    if (!n) return chyba(id, -32602, "Neznámý nástroj: " + params?.name);
    try {
      const vysledek = await n.handler(params?.arguments ?? {});
      return odpoved(id, {
        content: [{ type: "text", text: JSON.stringify(vysledek, null, 2) }],
        structuredContent: vysledek,
        isError: false,
      });
    } catch (e) {
      return odpoved(id, { content: [{ type: "text", text: "Chyba: " + (e instanceof Error ? e.message : String(e)) }], isError: true });
    }
  }
  return chyba(id, -32601, "Neznámá metoda: " + method);
}

/* -------------------------------------------------------------- vstup */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Mcp-Session-Id, MCP-Protocol-Version, Last-Event-ID",
  "Access-Control-Expose-Headers": "Mcp-Session-Id, MCP-Protocol-Version",
};

function tokenSedi(hlavicka) {
  const ocekavany = process.env.DOMOV_MCP_TOKEN;
  if (!ocekavany) return false;
  const m = /^Bearer\s+(.+)$/i.exec(String(hlavicka ?? "").trim());
  if (!m) return false;
  const a = Buffer.from(m[1]);
  const b = Buffer.from(ocekavany);
  return a.length === b.length && timingSafeEqual(a, b);
}

function posli(res, status, telo, hlavicky = {}) {
  for (const [k, v] of Object.entries({ ...CORS, ...hlavicky })) res.setHeader(k, v);
  if (telo === undefined) return res.status(status).end();
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  return res.status(status).send(JSON.stringify(telo));
}

async function nactiTelo(req) {
  if (req.body !== undefined && req.body !== null && req.body !== "") {
    return typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  }
  const kusy = [];
  for await (const k of req) kusy.push(k);
  return JSON.parse(Buffer.concat(kusy).toString("utf8"));
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return posli(res, 204);
  if (!process.env.DOMOV_MCP_TOKEN) return posli(res, 500, { error: "Server nemá nastavený DOMOV_MCP_TOKEN." });
  if (!tokenSedi(req.headers.authorization)) return posli(res, 401, { error: "Chybí nebo nesedí token." }, { "WWW-Authenticate": "Bearer" });

  // Server si nedrží sezení, takže stream k odběru nenabízí.
  if (req.method === "GET") return posli(res, 405, { error: "Jen POST." });
  if (req.method === "DELETE") return posli(res, 204);
  if (req.method !== "POST") return posli(res, 405, { error: "Jen POST." });

  let telo;
  try {
    telo = await nactiTelo(req);
  } catch {
    return posli(res, 400, chyba(null, -32700, "Rozbitý JSON."));
  }
  const jeOznameni = (z) => !!z && z.id === undefined;
  try {
    if (Array.isArray(telo)) {
      const odpovedi = [];
      for (const z of telo) if (!jeOznameni(z)) odpovedi.push(await zpracuj(z));
      return odpovedi.length ? posli(res, 200, odpovedi) : posli(res, 202);
    }
    if (jeOznameni(telo)) return posli(res, 202);
    return posli(res, 200, await zpracuj(telo));
  } catch (e) {
    return posli(res, 200, chyba(telo?.id ?? null, -32603, e instanceof Error ? e.message : String(e)));
  }
}
