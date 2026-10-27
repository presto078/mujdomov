/* =====================================================================
   Společný základ konektoru Domova: připojení k databázi, data, částky
   a dohledávání účtů, kategorií, projektů a dětí podle názvu.

   Složka `_lib` začíná podtržítkem, takže z ní Vercel nedělá adresy —
   jsou to jen pomocné soubory pro `api/mcp.js`.
   ===================================================================== */

import { createClient } from "@supabase/supabase-js";

/* ------------------------------------------------------------ databáze */

let klient = null;

/** Klient se service klíčem. Ten obchází RLS, proto žije jen na serveru. */
export function db() {
  if (klient) return klient;
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPA_URL;
  const klic = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !klic) {
    throw new Error("Server nemá nastavené SUPABASE_URL (nebo VITE_SUPA_URL) a SUPABASE_SERVICE_ROLE_KEY.");
  }
  klient = createClient(url, klic, { auth: { persistSession: false, autoRefreshToken: false } });
  return klient;
}

/** Jen pro testy — podstrčí jiný klient. */
export function nastavKlienta(k) {
  klient = k;
}

/** Počká na dotaz a chybu převede na výjimku. */
export async function q(dotaz) {
  const { data, error } = await dotaz;
  if (error) throw new Error(error.message);
  return data;
}

/** PostgREST vrací nejvýš 1000 řádků; tohle stránkuje, dokud data jsou. */
export async function vse(dotaz, velikost = 1000) {
  const out = [];
  for (let od = 0; od < 200000; od += velikost) {
    const data = await q(dotaz().range(od, od + velikost - 1));
    out.push(...(data || []));
    if (!data || data.length < velikost) break;
  }
  return out;
}

/* --------------------------------------------------------------- data */

/** Dnešek v Praze jako RRRR-MM-DD. */
export function dnes() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Prague" }).format(new Date());
}

export function den(v, nazev) {
  if (v === undefined || v === null || v === "") return undefined;
  const s = String(v).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) throw new Error(`${nazev} zadej jako RRRR-MM-DD.`);
  return s;
}

export function mesic(v, nazev) {
  if (v === undefined || v === null || v === "") return undefined;
  const s = String(v).trim();
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(s)) throw new Error(`${nazev} zadej jako RRRR-MM.`);
  return s;
}

export const klicMesice = (r, m) => `${r}-${String(m).padStart(2, "0")}`;

export function posunMesic(m, o) {
  const [r, x] = m.split("-").map(Number);
  const d = new Date(Date.UTC(r, x - 1 + o, 1));
  return klicMesice(d.getUTCFullYear(), d.getUTCMonth() + 1);
}

export function posledniDenMesice(m) {
  const [r, x] = m.split("-").map(Number);
  return `${m}-${String(new Date(Date.UTC(r, x, 0)).getUTCDate()).padStart(2, "0")}`;
}

/** Číslo dne (UTC) — odolné vůči letnímu času. Stejně jako v appce (pcNum). */
export const cisloDne = (s) => {
  const p = String(s || "").slice(0, 10).split("-");
  return p.length === 3 ? Math.floor(Date.UTC(+p[0], +p[1] - 1, +p[2]) / 86400000) : null;
};
export const zCislaDne = (n) => new Date(n * 86400000).toISOString().slice(0, 10);
export const denVTydnu = (n) => (new Date(n * 86400000).getUTCDay() + 6) % 7; // 0 = pondělí
export const DNY = ["po", "út", "st", "čt", "pá", "so", "ne"];
export const MESICE = ["leden", "únor", "březen", "duben", "květen", "červen", "červenec", "srpen", "září", "říjen", "listopad", "prosinec"];
export const nazevMesice = (m) => {
  const [r, x] = String(m).split("-");
  return `${MESICE[+x - 1] || x} ${r}`;
};

/* ------------------------------------------------------------- částky */

export const kc = (x) => Math.round((+x || 0) * 100) / 100;
export const kc0 = (x) => Math.round(+x || 0);

export function cislo(v, nazev, { kladne = false, nula = true } = {}) {
  if (v === undefined || v === null || v === "") return undefined;
  const n = typeof v === "number" ? v : Number(String(v).replace(/\s/g, "").replace(/kč$/i, "").replace(",", "."));
  if (!Number.isFinite(n)) throw new Error(`${nazev} musí být číslo.`);
  if (kladne && n < 0) throw new Error(`${nazev} zadej kladně.`);
  if (!nula && n === 0) throw new Error(`${nazev} nesmí být nula.`);
  return n;
}

export function limit(v, vychozi, max) {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 1) return vychozi;
  return Math.min(Math.floor(n), max);
}

/* ------------------------------------------------------------- texty */

export function bezDiakritiky(t) {
  return String(t ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/** Text do PostgREST filtru `or(...)` — čárky a závorky by filtr rozbily. */
export function proFiltr(t) {
  return String(t ?? "").replace(/[,()*%"\\]/g, " ").trim();
}

/**
 * Najde jednu položku podle id, přesného názvu nebo jednoznačné části názvu.
 * Vrací null, když hodnota není zadaná. Při nejednoznačnosti vyjmenuje kandidáty.
 */
export function najdi(seznam, hodnota, co, pole = "nazev") {
  if (hodnota === undefined || hodnota === null || hodnota === "") return null;
  const h = String(hodnota).trim();
  const podleId = seznam.find((x) => String(x.id) === h);
  if (podleId) return podleId;
  const hn = bezDiakritiky(h);
  const presne = seznam.filter((x) => bezDiakritiky(x[pole]) === hn);
  if (presne.length === 1) return presne[0];
  const cast = seznam.filter((x) => bezDiakritiky(x[pole]).includes(hn));
  if (cast.length === 1) return cast[0];
  const kandidati = (presne.length ? presne : cast).slice(0, 12).map((x) => `${x[pole]} (id ${x.id})`);
  if (kandidati.length) throw new Error(`${co} „${h}“ není jednoznačné: ${kandidati.join(", ")}.`);
  throw new Error(`${co} „${h}“ nenacházím. Seznam vrátí nástroj ciselniky.`);
}

/* ---------------------------------------------------------- číselníky */

export async function nactiCiselniky() {
  const d = db();
  const [ucty, kategorie, projekty, deti, auta] = await Promise.all([
    q(d.from("fin_ucty").select("id,nazev,typ,skupina,ucel,aktivni,cislo_uctu,kod_banky,poradi").order("poradi")),
    q(d.from("fin_kategorie").select("id,nazev,typ,poradi").order("poradi")),
    q(d.from("fin_projekty").select("id,nazev,typ,neutralni,povinny,aktivni,cilova_castka,mesicni_castka,zaplaceno_pred,datum_od,datum_do,poradi").order("poradi")),
    q(d.from("deti").select("id,jmeno,typ,narozen,poradi").order("poradi")),
    q(d.from("auta").select("id,nazev,znacka,model,spz,stav").order("poradi")),
  ]);
  return { ucty, kategorie, projekty, deti, auta };
}

/** Po jaké datum má účet nahrané výpisy (poslední importovaný pohyb). */
export async function dataDoUctu(ids) {
  const d = db();
  const out = {};
  await Promise.all(
    ids.map(async (id) => {
      const r = await q(
        d.from("fin_transakce").select("datum").eq("ucet_id", id).eq("zdroj", "import").order("datum", { ascending: false }).limit(1),
      );
      out[id] = r?.[0]?.datum ?? null;
    }),
  );
  return out;
}

/* -------------------------------------------------- zápis s náhledem */

export function nahled(co, zmena, upozorneni = []) {
  return {
    nahled: true,
    zapsano: false,
    co,
    zmena,
    upozorneni,
    dalsi_krok: "Nic se nezapsalo. Ukaž náhled uživateli a po jeho výslovném souhlasu zavolej nástroj znovu se stejnými údaji a potvrdit: true.",
  };
}

export function zapsano(co, vysledek, upozorneni = []) {
  return { nahled: false, zapsano: true, co, vysledek, upozorneni };
}
