// Vytáhne data modulu Finance ze Supabase do souboru finance_dump.json.
// Spuštění (v CMD ze složky Hostice):   node dump_finance.js
// Nic nemění, jen čte. Když anonymní klíč nic nevrátí (zapnuté RLS),
// zeptá se na přihlášení stejné jako do aplikace. Heslo se nikam neukládá.

import fs from "node:fs";
import readline from "node:readline";

const env = Object.fromEntries(
  fs.readFileSync(".env", "utf8").split(/\r?\n/)
    .filter(r => r.includes("=") && !r.trim().startsWith("#"))
    .map(r => { const i = r.indexOf("="); return [r.slice(0, i).trim(), r.slice(i + 1).trim().replace(/^"|"$/g, "")]; })
);
const URL = env.VITE_SUPA_URL.replace(/\/$/, "");
const KEY = env.VITE_SUPA_KEY;
let TOKEN = KEY;   // dokud se nepřihlásíme, jedeme na anonymní klíč

function otazka(text, skryt = false) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  if (skryt) rl._writeToOutput = function (s) { if (s.includes(text)) rl.output.write(s); else rl.output.write("*"); };
  return new Promise(res => rl.question(text, v => { rl.close(); if (skryt) process.stdout.write("\n"); res(v.trim()); }));
}

async function dotaz(cesta, hlavicky = {}) {
  const r = await fetch(`${URL}/rest/v1/${cesta}`, {
    headers: { apikey: KEY, Authorization: "Bearer " + TOKEN, ...hlavicky }
  });
  if (!r.ok) throw new Error(`${cesta}: HTTP ${r.status} — ${await r.text()}`);
  return { data: await r.json(), rozsah: r.headers.get("content-range") };
}
const tab = async cesta => (await dotaz(cesta)).data;

// ── Kontrola, jestli anonymní klíč vůbec něco vidí ────────────────────────
const zkouska = await dotaz("fin_ucty?select=id&limit=1", { Prefer: "count=exact" });
console.log(`Test čtení fin_ucty anonymním klíčem: ${zkouska.data.length} řádků (content-range: ${zkouska.rozsah})`);

if (zkouska.data.length === 0) {
  console.log("\nAnonymní klíč nevrací data — tabulky mají zapnuté RLS.");
  console.log("Přihlas se stejně jako do aplikace (heslo se nikam neukládá):\n");
  const email = await otazka("E-mail: ");
  const heslo = await otazka("Heslo: ", true);
  const r = await fetch(`${URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: heslo }),
  });
  const j = await r.json();
  if (!r.ok || !j.access_token) { console.error("Přihlášení selhalo:", j.error_description || j.msg || JSON.stringify(j)); process.exit(1); }
  TOKEN = j.access_token;
  console.log("Přihlášeno.\n");
}

// fin_stavy je nutné dělit na hranici 2021/2022 kvůli limitu počtu řádků
// Tabulka, která v databázi není, se přeskočí — ať kvůli jedné nespadne celý výpis.
const nepovinne = async cesta => {
  try { return await tab(cesta); }
  catch (e) { console.log(`  (přeskočeno) ${cesta} — ${String(e.message).slice(0, 80)}`); return []; }
};

const [ucty, typy, kategorie, plan, stavyA, stavyB,
       pravidla, projekty, projektPlatby, protistrany, deti, auta, nastaveni] = await Promise.all([
  tab("fin_ucty?select=*"),
  tab("fin_typy_uctu?select=*"),
  tab("fin_kategorie?select=*"),
  tab("fin_cashflow_plan?select=*"),
  tab("fin_stavy?select=*&rok=lte.2021&limit=2000"),
  tab("fin_stavy?select=*&rok=gte.2022&limit=2000"),
  nepovinne("fin_pravidla?select=*&limit=2000"),
  nepovinne("fin_projekty?select=*&limit=500"),
  nepovinne("fin_projekt_platby?select=*&limit=2000"),
  nepovinne("fin_protistrany?select=*&limit=2000"),
  nepovinne("deti?select=id,jmeno,emoji"),
  nepovinne("auta?select=id,nazev,spz"),
  nepovinne("app_nastaveni?select=*"),
]);

// Transakce po stránkách, ať se nenarazí na limit
let transakce = [], od = 0;
while (true) {
  const kus = await tab(`fin_transakce?select=*&order=datum.desc&offset=${od}&limit=1000`);
  transakce = transakce.concat(kus);
  if (kus.length < 1000 || transakce.length >= 20000) break;
  od += 1000;
}

const out = { vytvoreno: new Date().toISOString(), ucty, typy, kategorie, plan,
  stavy: [...stavyA, ...stavyB], transakce,
  pravidla, projekty, projektPlatby, protistrany, deti, auta, nastaveni };
fs.writeFileSync("finance_dump.json", JSON.stringify(out, null, 1), "utf8");

console.log("Hotovo — finance_dump.json");
console.log(`  účtů:      ${ucty.length}`);
console.log(`  typů účtů: ${typy.length}`);
console.log(`  kategorií: ${kategorie.length}`);
console.log(`  transakcí: ${transakce.length}`);
console.log(`  stavů:     ${stavyA.length + stavyB.length}`);
console.log(`  plán:      ${plan.length}`);
console.log(`  pravidel:  ${pravidla.length}`);
console.log(`  projektů:  ${projekty.length}`);
console.log(`  protistran:${protistrany.length}`);
