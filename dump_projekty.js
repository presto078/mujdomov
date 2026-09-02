// Vytáhne data modulu Projekty ze Supabase do souboru projekty_dump.json.
// Spuštění (v CMD ze složky Hostice):   node dump_projekty.js
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
let TOKEN = KEY;

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
// Tabulka, která v databázi není, se přeskočí — ať kvůli jedné nespadne celý výpis.
const tab = async cesta => {
  try { return (await dotaz(cesta)).data; }
  catch (e) { console.log(`  (přeskočeno) ${cesta} — ${String(e.message).slice(0, 90)}`); return []; }
};

const zkouska = await dotaz("projekty?select=id&limit=1", { Prefer: "count=exact" });
console.log(`Test čtení projekty anonymním klíčem: ${zkouska.data.length} řádků (content-range: ${zkouska.rozsah})`);

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

const [projekty, rozpocet, hoste, obed, zakusky, todo, ukoly] = await Promise.all([
  tab("projekty?select=*&limit=2000"),
  tab("projekty_rozpocet?select=*&limit=5000"),
  tab("projekty_hoste?select=*&limit=2000"),
  tab("projekty_obed?select=*&limit=2000"),
  tab("projekty_zakusky?select=*&limit=2000"),
  tab("projekty_todo?select=*&limit=2000"),
  tab("projekt_ukoly?select=*&limit=2000"),
]);

const out = { vytvoreno: new Date().toISOString(), projekty, rozpocet, hoste, obed, zakusky, todo, ukoly };
fs.writeFileSync("projekty_dump.json", JSON.stringify(out, null, 1), "utf8");

console.log("Hotovo — projekty_dump.json");
for (const [k, v] of Object.entries(out)) if (Array.isArray(v)) console.log(`  ${k.padEnd(10)} ${v.length}`);
