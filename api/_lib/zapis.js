/* =====================================================================
   Zapisující nástroje. Každý funguje ve dvou krocích:
     1. bez `potvrdit` vrátí náhled a nic nezapíše,
     2. s `potvrdit: true` zapíše přesně to, co bylo v náhledu.
   Nic se nemaže — mazání zůstává v appce.
   ===================================================================== */

import {
  db, q, dnes, den, mesic, cislo, najdi, nactiCiselniky, cisloDne, zCislaDne, kc, nahled, zapsano,
} from "./zaklad.js";
import { nastaveniPece, zakladPece, KDO } from "./rodina.js";

const potvrzeno = (a) => a.potvrdit === true;

function povinne(a, pole) {
  for (const p of pole) if (a[p] === undefined || a[p] === null || a[p] === "") throw new Error(`Chybí ${p}.`);
}

function kdoPece(v, nazev = "kdo") {
  const s = String(v ?? "").trim().toLowerCase();
  if (["ja", "já", "jirka", "jiri", "jiří", "tata", "táta"].includes(s)) return "ja";
  if (["tereza", "terka", "mama", "máma"].includes(s)) return "tereza";
  if (["domluva", "podle domluvy"].includes(s)) return "domluva";
  throw new Error(`${nazev}: ja, tereza nebo domluva.`);
}

/* --------------------------------------------- zařazení transakcí */

export async function zaraditTransakce(a) {
  const ids = [].concat(a.ids || []).map(String).filter(Boolean);
  if (!ids.length) throw new Error("Zadej ids transakcí (vrátí je nástroj transakce).");
  if (ids.length > 100) throw new Error("Najednou nejvýš 100 transakcí.");
  const c = await nactiCiselniky();
  const patch = {};
  if (a.kategorie !== undefined) patch.kategorie_id = a.kategorie === "zadna" ? null : najdi(c.kategorie, a.kategorie, "Kategorie").id;
  if (a.projekt !== undefined) patch.projekt_id = a.projekt === "zadny" ? null : najdi(c.projekty, a.projekt, "Projekt").id;
  if (a.pro_koho !== undefined) {
    const v = String(a.pro_koho).trim();
    if (v === "nikdo") Object.assign(patch, { subjekt_typ: null, subjekt_id: null });
    else if (["rodina", "dum", "dům"].includes(v.toLowerCase())) Object.assign(patch, { subjekt_typ: v.toLowerCase() === "rodina" ? "rodina" : "dum", subjekt_id: null });
    else {
      const clovek = c.deti.find((x) => x.jmeno.toLowerCase() === v.toLowerCase());
      if (clovek) Object.assign(patch, { subjekt_typ: "osoba", subjekt_id: String(clovek.id) });
      else Object.assign(patch, { subjekt_typ: "auto", subjekt_id: String(najdi(c.auta, v, "Auto ani člověk").id) });
    }
  }
  if (a.poznamka !== undefined) patch.poznamka = a.poznamka || null;
  if (!Object.keys(patch).length) throw new Error("Není co změnit — zadej kategorie, projekt, pro_koho nebo poznamka.");

  const rows = await q(db().from("fin_transakce").select("id,datum,castka,protistrana,popis,kategorie_id,projekt_id,typ,prevod_ucet_id,poznamka").in("id", ids));
  const chybi = ids.filter((id) => !rows.find((r) => String(r.id) === id));
  if (chybi.length) throw new Error(`Tyhle transakce neexistují: ${chybi.join(", ")}.`);
  const kn = (id) => (id ? c.kategorie.find((k) => String(k.id) === String(id))?.nazev : null);
  const pn = (id) => (id ? c.projekty.find((p) => String(p.id) === String(id))?.nazev : null);
  const upoz = [];
  const prevody = rows.filter((r) => r.typ === "prevod" || r.prevod_ucet_id);
  if (prevody.length) upoz.push(`${prevody.length} z nich je převod mezi vlastními účty — do příjmů ani výdajů se nepočítá, ať má kategorii jakoukoli.`);

  const zmena = {
    nove: {
      ...(patch.kategorie_id !== undefined ? { kategorie: kn(patch.kategorie_id) } : {}),
      ...(patch.projekt_id !== undefined ? { projekt: pn(patch.projekt_id) } : {}),
      ...(patch.subjekt_typ !== undefined ? { pro_koho: a.pro_koho } : {}),
      ...(patch.poznamka !== undefined ? { poznamka: patch.poznamka } : {}),
    },
    transakce: rows.map((r) => ({ id: r.id, datum: r.datum, castka: kc(r.castka), protistrana: r.protistrana, popis: r.popis, kategorie_ted: kn(r.kategorie_id), projekt_ted: pn(r.projekt_id) })),
  };
  if (!potvrzeno(a)) return nahled(`Zařazení ${rows.length} transakcí`, zmena, upoz);
  await q(db().from("fin_transakce").update(patch).in("id", ids));
  return zapsano(`Zařazeno ${rows.length} transakcí`, zmena.nove, upoz);
}

/* ------------------------------------------------- deník hotovosti */

export async function zapsatHotovost(a) {
  const m = mesic(a.mesic, "mesic");
  povinne(a, ["mesic"]);
  const c = await nactiCiselniky();
  const vsechny = await q(db().from("fin_hotovost").select("*").order("poradi"));
  const vMesici = vsechny.filter((r) => r.mesic === m && r.aktivni !== false);
  const sablony = vsechny.filter((r) => !r.mesic && r.aktivni !== false);

  if (a.id) {
    const r = vsechny.find((x) => String(x.id) === String(a.id));
    if (!r) throw new Error("Řádek hotovosti s tímhle id neexistuje.");
    const patch = {};
    if (a.castka !== undefined) patch.castka = cislo(a.castka, "castka");
    if (a.nazev !== undefined) patch.nazev = String(a.nazev).trim();
    if (a.poznamka !== undefined) patch.poznamka = a.poznamka || null;
    if (a.kategorie !== undefined) patch.kategorie_id = najdi(c.kategorie, a.kategorie, "Kategorie")?.id ?? null;
    const zmena = { radek: { mesic: r.mesic || "šablona", nazev: r.nazev, castka: +r.castka }, nove: patch };
    if (!potvrzeno(a)) return nahled("Úprava řádku hotovosti", zmena);
    await q(db().from("fin_hotovost").update(patch).eq("id", r.id));
    return zapsano("Řádek hotovosti upraven", zmena);
  }

  povinne(a, ["nazev", "castka"]);
  const row = {
    mesic: m, nazev: String(a.nazev).trim(), castka: cislo(a.castka, "castka", { nula: false }),
    kategorie_id: a.kategorie ? najdi(c.kategorie, a.kategorie, "Kategorie").id : null,
    poznamka: a.poznamka || null, poradi: 100, aktivni: true,
  };
  // Měsíc bez řádků appka sama založí ze šablon. Kdyby tu vznikl jen jeden řádek,
  // appka by šablony už nezaložila a z měsíce by zmizel třeba hotovostní příjem.
  const zSablon = !vsechny.some((r) => r.mesic === m) && m <= dnes().slice(0, 7)
    ? sablony.map((s) => ({ mesic: m, nazev: s.nazev, castka: s.castka, kategorie_id: s.kategorie_id, poznamka: null, poradi: s.poradi, aktivni: true }))
    : [];
  const upoz = [];
  if (zSablon.length) upoz.push(`Měsíc ${m} v deníku ještě není — založím ho i ze šablon: ${zSablon.map((s) => `${s.nazev} ${s.castka}`).join(", ")}.`);
  const zmena = {
    novy_radek: { mesic: m, nazev: row.nazev, castka: row.castka, smysl: row.castka > 0 ? "hotovost přibyla" : "hotovost ubyla" },
    mesic_ted: vMesici.map((r) => ({ id: r.id, nazev: r.nazev, castka: +r.castka })),
  };
  if (!potvrzeno(a)) return nahled("Řádek do deníku hotovosti", zmena, upoz);
  await q(db().from("fin_hotovost").insert([...zSablon, row]));
  return zapsano("Zapsáno do deníku hotovosti", zmena.novy_radek, upoz);
}

/* --------------------------------------------- zůstatek na účtu */

export async function zapsatZustatek(a) {
  povinne(a, ["ucet", "mesic", "stav"]);
  const m = mesic(a.mesic, "mesic");
  const stav = cislo(a.stav, "stav");
  const c = await nactiCiselniky();
  const u = najdi(c.ucty, a.ucet, "Účet");
  const [rok, mm] = m.split("-").map(Number);
  const ex = await q(db().from("fin_stavy").select("id,stav").eq("ucet_id", u.id).eq("rok", rok).eq("mesic", mm).maybeSingle());
  const zmena = { ucet: u.nazev, mesic: m, stav_konec_mesice: kc(stav), dosud: ex ? kc(ex.stav) : null };
  if (!potvrzeno(a)) return nahled(ex ? "Přepsání zůstatku" : "Nový zůstatek", zmena);
  if (ex) await q(db().from("fin_stavy").update({ stav }).eq("id", ex.id));
  else await q(db().from("fin_stavy").insert({ ucet_id: u.id, rok, mesic: mm, stav }));
  return zapsano("Zůstatek zapsán", zmena);
}

/* ---------------------------------------------------------- odečty */

const MERIDLA = { voda_fakturacni: "hlavni", voda_podruzny: "podruzny", voda_zahradni: "zahradni", elektrina: "el" };

export async function zapsatOdecet(a) {
  povinne(a, ["meridlo", "datum"]);
  const typ = MERIDLA[a.meridlo];
  if (!typ) throw new Error(`meridlo: ${Object.keys(MERIDLA).join(", ")}.`);
  const datum = den(a.datum, "datum");
  if (datum > dnes()) throw new Error("Odečet do budoucna nejde.");
  const upoz = [];

  if (typ === "el") {
    povinne(a, ["vt", "nt"]);
    const vt = cislo(a.vt, "vt", { kladne: true }), nt = cislo(a.nt, "nt", { kladne: true });
    const rows = await q(db().from("el_odecty").select("*").order("datum"));
    if (rows.some((r) => r.datum === datum)) throw new Error(`Odečet elektřiny k ${datum} už je zapsaný.`);
    const pred = rows.filter((r) => r.datum < datum).pop();
    if (pred) {
      const zVt = pred.novy_vt != null ? +pred.novy_vt : +pred.vt, zNt = pred.novy_nt != null ? +pred.novy_nt : +pred.nt;
      if (vt < zVt || nt < zNt) upoz.push(`Stav je nižší než předchozí (${pred.datum}: VT ${zVt}, NT ${zNt}). Pokud se měnil elektroměr, zapiš výměnu v appce.`);
      else upoz.push(`Spotřeba od ${pred.datum}: VT ${kc(vt - zVt)} kWh, NT ${kc(nt - zNt)} kWh.`);
    }
    if (datum.slice(8) !== "01") upoz.push("Samoodečty bývají k 1. dni měsíce.");
    const zmena = { meridlo: "elektřina", datum, vt, nt, poznamka: a.poznamka || null };
    if (!potvrzeno(a)) return nahled("Odečet elektřiny", zmena, upoz);
    await q(db().from("el_odecty").insert({ datum, vt, nt, poznamka: a.poznamka || null }));
    return zapsano("Odečet elektřiny zapsán", zmena, upoz);
  }

  povinne(a, ["stav"]);
  const stav = cislo(a.stav, "stav", { kladne: true });
  const rows = await q(db().from("voda_odecty").select("*").eq("typ", typ).order("datum"));
  if (rows.some((r) => r.datum === datum)) throw new Error(`Odečet ${a.meridlo} k ${datum} už je zapsaný.`);
  const pred = rows.filter((r) => r.datum < datum).pop();
  if (pred) {
    const z = pred.vymena && pred.stav_novy != null ? +pred.stav_novy : +pred.stav;
    const dni = Math.max(1, cisloDne(datum) - cisloDne(pred.datum));
    if (stav < z) upoz.push(`Stav je nižší než předchozí (${pred.datum}: ${z} m³). Pokud se měnil vodoměr, zapiš výměnu v appce.`);
    else upoz.push(`Spotřeba od ${pred.datum}: ${kc(stav - z)} m³ (${kc((stav - z) / dni)} m³ denně).`);
    if ((stav - z) / dni > 3) upoz.push("To je neobvykle vysoká spotřeba — zkontroluj, jestli je stav opsaný správně.");
  }
  const zmena = { meridlo: a.meridlo, datum, stav_m3: stav, poznamka: a.poznamka || null };
  if (!potvrzeno(a)) return nahled("Odečet vody", zmena, upoz);
  await q(db().from("voda_odecty").insert({ datum, typ, stav, poznamka: a.poznamka || null }));
  return zapsano("Odečet vody zapsán", zmena, upoz);
}

/* ------------------------------------------------------------- péče */

export async function peceZapis(a) {
  povinne(a, ["druh"]);
  const deti = await q(db().from("deti").select("id,jmeno").in("jmeno", ["Patrik", "Beatka", "Jiřík"]));
  const dite = (v) => {
    const s = String(v).trim().toLowerCase();
    const alias = { bibi: "beatka", beata: "beatka", jirik: "jiřík", jiri: "jiřík" };
    const hledane = alias[s] || s;
    const d = deti.find((x) => x.jmeno.toLowerCase() === hledane);
    if (!d) throw new Error(`Dítě „${v}“: Patrik, Beatka nebo Jiřík.`);
    return d;
  };

  if (a.druh === "vyjimka") {
    povinne(a, ["datum", "kdo"]);
    const datum = den(a.datum, "datum");
    const kdo = kdoPece(a.kdo);
    const nast = await nastaveniPece();
    const zaklad = zakladPece(cisloDne(datum), cisloDne(nast.kotva));
    const ex = await q(db().from("pece_vyjimky").select("*").eq("datum", datum).maybeSingle());
    if (kdo === zaklad && !ex) throw new Error(`${datum} je Patrik podle rozpisu stejně u: ${KDO[zaklad]}. Výjimka není potřeba.`);
    if (kdo === zaklad && ex) throw new Error(`Návrat k běžnému rozpisu = zrušit výjimku ${datum}; to se dělá v appce (konektor nemaže).`);
    const zmena = { datum, patrik_bude_u: KDO[kdo], podle_rozpisu_by_byl_u: KDO[zaklad], dosavadni_vyjimka: ex ? KDO[ex.kdo] : null, poznamka: a.poznamka || null };
    const upoz = ["Pokud jde o hlídání místo Terezy (nebo naopak), zapiš to i jako výpomoc."];
    if (!potvrzeno(a)) return nahled("Výjimka v rozpisu Patrika", zmena, upoz);
    if (ex) await q(db().from("pece_vyjimky").update({ kdo, poznamka: a.poznamka || null }).eq("datum", datum));
    else await q(db().from("pece_vyjimky").insert({ datum, kdo, poznamka: a.poznamka || null }));
    return zapsano("Výjimka zapsána", zmena, upoz);
  }

  if (a.druh === "nemoc") {
    povinne(a, ["od", "deti"]);
    const od = den(a.od, "od");
    const doD = den(a.do, "do") || od;
    if (doD < od) throw new Error("do je před od.");
    const vybrane = [].concat(a.deti).map(dite);
    let kdo;
    if (a.kdo) kdo = kdoPece(a.kdo);
    else {
      const posl = await q(db().from("pece_nemoci").select("kdo").order("od", { ascending: false }).limit(1));
      const nast = await nastaveniPece();
      kdo = posl?.[0] ? (posl[0].kdo === "ja" ? "tereza" : "ja") : nast.prvni_nemoc === "tereza" ? "tereza" : "ja";
    }
    const zmena = { od, do: doD, dni: cisloDne(doD) - cisloDne(od) + 1, deti: vybrane.map((d) => d.jmeno), doma_s_nimi: KDO[kdo], poznamka: a.poznamka || null };
    const upoz = a.kdo ? [] : [`Kdo je doma jsem nevyplnil — podle střídání je na řadě ${KDO[kdo]}.`];
    if (!potvrzeno(a)) return nahled("Nemoc", zmena, upoz);
    await q(db().from("pece_nemoci").insert({ od, do: doD, deti: vybrane.map((d) => d.id), kdo, poznamka: a.poznamka || null }));
    return zapsano("Nemoc zapsána", zmena, upoz);
  }

  if (a.druh === "vypomoc") {
    povinne(a, ["datum", "kdo", "jednotka", "pocet"]);
    const datum = den(a.datum, "datum");
    const kdo = kdoPece(a.kdo, "kdo (kdo hlídal)");
    if (kdo === "domluva") throw new Error("U výpomoci: hlídal buď ja, nebo tereza.");
    const jednotka = { den: "den", dny: "den", d: "den", hod: "hod", hodina: "hod", hodiny: "hod", h: "hod" }[String(a.jednotka).toLowerCase()];
    if (!jednotka) throw new Error("jednotka: den nebo hod.");
    const pocet = cislo(a.pocet, "pocet", { kladne: true, nula: false });
    const zmena = { datum, hlidal: KDO[kdo], kolik: `${pocet} ${jednotka === "den" ? "d" : "h"}`, poznamka: a.poznamka || null };
    if (!potvrzeno(a)) return nahled("Výpomoc s hlídáním", zmena);
    await q(db().from("pece_vypomoc").insert({ datum, kdo_hlidal: kdo, jednotka, pocet, poznamka: a.poznamka || null }));
    return zapsano("Výpomoc zapsána", zmena);
  }

  if (a.druh === "navsteva_lekare") {
    povinne(a, ["datum", "dite", "obor"]);
    const datum = den(a.datum, "datum");
    const d = dite(a.dite);
    const lekari = await q(db().from("pece_lekari").select("obor,kdo"));
    const lek = lekari.find((l) => l.obor.toLowerCase() === String(a.obor).trim().toLowerCase());
    const kdo = a.kdo ? kdoPece(a.kdo) : lek?.kdo || "domluva";
    const zmena = { datum, dite: d.jmeno, obor: lek?.obor || String(a.obor).trim(), sel: KDO[kdo], poznamka: a.poznamka || null };
    const upoz = lek ? [] : [`Obor „${a.obor}“ není mezi lékaři (${lekari.map((l) => l.obor).join(", ")}).`];
    if (!potvrzeno(a)) return nahled("Návštěva lékaře", zmena, upoz);
    await q(db().from("pece_navstevy").insert({ dite_id: d.id, obor: zmena.obor, datum, kdo, poznamka: a.poznamka || null }));
    return zapsano("Návštěva zapsána", zmena, upoz);
  }

  throw new Error("druh: vyjimka, nemoc, vypomoc nebo navsteva_lekare.");
}

/* ---------------------------------------------------------- právník */

export async function pravnikZapis(a) {
  povinne(a, ["druh"]);
  if (a.druh === "zaznam") {
    povinne(a, ["pripad", "pravnik", "sazba", "mnozstvi"]);
    const [pripady, pravnici, sazby] = await Promise.all([
      q(db().from("pravnici_pripady").select("id,nazev")),
      q(db().from("pravnici").select("id,jmeno")),
      q(db().from("pravnici_sazby").select("*")),
    ]);
    const p = najdi(pripady, a.pripad, "Případ");
    const pr = najdi(pravnici, a.pravnik, "Právník", "jmeno");
    const jeho = sazby.filter((x) => x.pravnik_id === pr.id);
    let s;
    try {
      s = najdi(jeho, a.sazba, "Sazba");
    } catch (e) {
      // „hod“ nebo „úkon“ — sazba se dá zadat i jednotkou, když je jednoznačná.
      const podleJednotky = jeho.filter((x) => String(x.jednotka).toLowerCase().startsWith(String(a.sazba).toLowerCase().slice(0, 3)));
      if (podleJednotky.length !== 1) throw new Error(`${e.message} Sazby: ${jeho.map((x) => `${x.nazev} ${x.castka} Kč/${x.jednotka} (id ${x.id})`).join(", ")}.`);
      s = podleJednotky[0];
    }
    const mnozstvi = cislo(a.mnozstvi, "mnozstvi", { kladne: true, nula: false });
    const datum = den(a.datum, "datum") || dnes();
    const castka = kc(mnozstvi * +s.castka);
    const zmena = { pripad: p.nazev, pravnik: pr.jmeno, sazba: `${s.nazev} (${s.castka} Kč/${s.jednotka})`, mnozstvi, castka, datum };
    if (!potvrzeno(a)) return nahled("Záznam práce právníka", zmena);
    await q(db().from("pravnici_zaznam").insert({ pripad_id: p.id, pravnik_id: pr.id, sazba_id: s.id, datum, pocet_hodin_ukonu: mnozstvi, vypocitana_castka: castka }));
    return zapsano("Záznam zapsán", zmena);
  }

  if (a.druh === "platba") {
    povinne(a, ["zaznam_id", "ucet"]);
    const z = await q(db().from("pravnici_zaznam").select("*").eq("id", a.zaznam_id).maybeSingle());
    if (!z) throw new Error("Záznam s tímhle id neexistuje (id vrátí nástroj pravnik).");
    const platby = await q(db().from("pravnici_platby").select("zaplacena_castka").eq("zaznam_id", z.id));
    const zbyva = kc(+z.vypocitana_castka - platby.reduce((s, p) => s + (+p.zaplacena_castka || 0), 0));
    if (zbyva <= 0) throw new Error("Tenhle záznam je už celý zaplacený.");
    const castka = a.castka !== undefined ? cislo(a.castka, "castka", { kladne: true, nula: false }) : zbyva;
    if (castka > zbyva) throw new Error(`Zbývá zaplatit jen ${zbyva} Kč.`);
    const c = await nactiCiselniky();
    const u = najdi(c.ucty, a.ucet, "Účet");
    const datum = den(a.datum, "datum") || dnes();
    const zmena = { zaznam: `${z.datum} · ${kc(z.vypocitana_castka)} Kč`, platba: castka, datum, ucet: u.nazev, zbyde: kc(zbyva - castka) };
    const upoz = ["Stejně jako v appce se platba propíše i do plánu cashflow."];
    if (!potvrzeno(a)) return nahled("Platba právníkovi", zmena, upoz);
    await q(db().from("pravnici_platby").insert({ zaznam_id: z.id, datum_platby: datum, zaplacena_castka: castka, ucet_id: u.id }));
    const [r, m] = datum.split("-").map(Number);
    await q(db().from("fin_cashflow_plan").insert({
      rok: r, mesic: m, nazev: `Právník — platba (${z.id})`, castka: -castka, kategorie_id: null, ucet_id: u.id, zaznam_id: z.id,
      opakovani: "jednorazove", dite_id: null, zvire_id: null, oprava_id: null, auto_id: null, je_majetek: false, sklad_kategorie_id: null,
    }));
    return zapsano("Platba zapsána", zmena, upoz);
  }
  throw new Error("druh: zaznam nebo platba.");
}

/* ------------------------------------------- poznámky, todo, úkoly */

const PRIORITY = { nizka: "low", nízká: "low", low: "low", normalni: "normal", normální: "normal", normal: "normal", vysoka: "high", vysoká: "high", high: "high" };

export async function zapsatPoznamku(a) {
  povinne(a, ["nazev"]);
  const nazev = String(a.nazev).trim();
  if (a.projekt) {
    const akce = await q(db().from("projekty").select("id,nazev"));
    const p = najdi(akce, a.projekt, "Projekt (akce)");
    const zmena = { kam: `todo projektu ${p.nazev}`, nazev, poznamka: a.obsah || null };
    if (!potvrzeno(a)) return nahled("Úkol do projektu", zmena);
    await q(db().from("projekty_todo").insert({ projekt_id: p.id, nazev, poznamka: a.obsah || null, splneno: false }));
    return zapsano("Úkol přidán do projektu", zmena);
  }
  const priorita = a.priorita ? PRIORITY[String(a.priorita).toLowerCase()] : "normal";
  if (!priorita) throw new Error("priorita: nizka, normalni nebo vysoka.");
  const zmena = { kam: "Poznámky", nazev, obsah: a.obsah || null, priorita };
  if (!potvrzeno(a)) return nahled("Nová poznámka", zmena);
  await q(db().from("poznamky").insert({ nazev, obsah: a.obsah || null, priorita, splneno: false }));
  return zapsano("Poznámka přidána", zmena);
}

export async function oznacitSplnene(a) {
  povinne(a, ["typ", "id"]);
  const datum = den(a.datum, "datum") || dnes();
  if (a.typ === "poznamka" || a.typ === "todo") {
    const tab = a.typ === "poznamka" ? "poznamky" : "projekty_todo";
    const r = await q(db().from(tab).select("id,nazev,splneno").eq("id", a.id).maybeSingle());
    if (!r) throw new Error("Položka s tímhle id neexistuje.");
    if (r.splneno) throw new Error("Už je splněná.");
    if (!potvrzeno(a)) return nahled("Označit jako splněné", { nazev: r.nazev });
    await q(db().from(tab).update({ splneno: true }).eq("id", r.id));
    return zapsano("Splněno", { nazev: r.nazev });
  }
  if (a.typ === "ukol") {
    const u = await q(db().from("ukoly").select("*").eq("id", a.id).maybeSingle());
    if (!u) throw new Error("Úkol s tímhle id neexistuje.");
    const dalsi = u.interval_dnu ? zCislaDne(cisloDne(datum) + +u.interval_dnu) : null;
    const zmena = { ukol: u.nazev, splneno: datum, dalsi_termin: dalsi };
    if (!potvrzeno(a)) return nahled("Pravidelný úkol splněn", zmena);
    await q(db().from("ukoly_splneni").insert({ ukol_id: u.id, datum, poznamka: a.poznamka || null }));
    await q(db().from("ukoly").update({ posledni_splneni: datum, dalsi_termin: dalsi }).eq("id", u.id));
    return zapsano("Úkol splněn", zmena);
  }
  throw new Error("typ: poznamka, todo nebo ukol.");
}

/* ---------------------------------------------------------------- IT */

const POLE_ZARIZENI = ["nazev", "typ", "uzivatel", "vyrobce", "model", "serie_cislo", "cpu", "ram", "disk", "gpu", "os", "mac", "ip", "poznamka"];

export async function zapsatZarizeni(a) {
  const data = {};
  for (const p of POLE_ZARIZENI) if (a[p] !== undefined) data[p] = a[p] === "" ? null : String(a[p]);
  const upoz = [];
  if (/heslo|password|pwd|klíč:|klic:|serial key|product key/i.test(JSON.stringify(data) + (a.zapsat_do_historie || ""))) {
    upoz.push("Vypadá to, že text obsahuje heslo nebo klíč. Ty patří do KeePassu, ne sem — zvaž, jestli to opravdu zapsat.");
  }
  if (a.id) {
    const z = await q(db().from("it_zarizeni").select("*").eq("id", a.id).maybeSingle());
    if (!z) throw new Error("Zařízení s tímhle id neexistuje (id vrátí nástroj it).");
    if (a.zapsat_do_historie) {
      const radek = `${den(a.datum, "datum") || dnes()}: ${String(a.zapsat_do_historie).trim()}`;
      data.poznamka = [data.poznamka ?? z.poznamka, radek].filter(Boolean).join("\n");
    }
    if (!Object.keys(data).length) throw new Error("Není co změnit.");
    const zmena = { zarizeni: z.nazev, zmeny: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, { bylo: z[k], bude: v }])) };
    if (!potvrzeno(a)) return nahled("Úprava zařízení", zmena, upoz);
    await q(db().from("it_zarizeni").update(data).eq("id", z.id));
    return zapsano("Zařízení upraveno", zmena, upoz);
  }
  povinne(data, ["nazev"]);
  if (a.zapsat_do_historie) data.poznamka = [data.poznamka, `${den(a.datum, "datum") || dnes()}: ${String(a.zapsat_do_historie).trim()}`].filter(Boolean).join("\n");
  const ex = await q(db().from("it_zarizeni").select("id,nazev"));
  const stejne = ex.find((x) => x.nazev.toLowerCase() === data.nazev.toLowerCase());
  if (stejne) upoz.push(`Zařízení „${stejne.nazev}“ už existuje (id ${stejne.id}) — nechceš raději upravit to?`);
  if (!potvrzeno(a)) return nahled("Nové zařízení", data, upoz);
  await q(db().from("it_zarizeni").insert(data));
  return zapsano("Zařízení založeno", data, upoz);
}

/* -------------------------------------------------------------- auta */

export async function zapsatAuto(a) {
  povinne(a, ["druh", "auto"]);
  const c = await nactiCiselniky();
  const auto = najdi(c.auta, a.auto, "Auto");
  const datum = den(a.datum, "datum") || dnes();
  if (a.druh === "km") {
    povinne(a, ["km"]);
    const km = cislo(a.km, "km", { kladne: true });
    const posl = await q(db().from("auta_kilometry").select("datum,stav_km").eq("auto_id", auto.id).order("datum", { ascending: false }).limit(1));
    const upoz = posl?.[0] && km < posl[0].stav_km ? [`Nižší než poslední stav (${posl[0].datum}: ${posl[0].stav_km} km).`] : [];
    const zmena = { auto: auto.nazev, datum, km };
    if (!potvrzeno(a)) return nahled("Stav tachometru", zmena, upoz);
    await q(db().from("auta_kilometry").insert({ auto_id: auto.id, datum, stav_km: Math.round(km), poznamka: a.poznamka || null }));
    return zapsano("Kilometry zapsány", zmena, upoz);
  }
  if (a.druh === "servis") {
    povinne(a, ["popis"]);
    const row = {
      auto_id: auto.id, datum, typ: a.typ || "jine", popis: String(a.popis), cena: cislo(a.castka, "castka", { kladne: true }) ?? null,
      kde: a.kde || null, km_pri_servisu: cislo(a.km, "km", { kladne: true }) ?? null,
      dalsi_servis_datum: den(a.dalsi_servis_datum, "dalsi_servis_datum") || null, dalsi_servis_km: cislo(a.dalsi_servis_km, "dalsi_servis_km", { kladne: true }) ?? null,
    };
    const zmena = { auto: auto.nazev, ...row, auto_id: undefined };
    if (!potvrzeno(a)) return nahled("Servis auta", zmena);
    await q(db().from("auta_servis").insert(row));
    return zapsano("Servis zapsán", zmena);
  }
  if (a.druh === "naklad") {
    povinne(a, ["castka", "typ"]);
    const row = { auto_id: auto.id, datum, typ: String(a.typ), castka: cislo(a.castka, "castka", { kladne: true, nula: false }), poznamka: a.poznamka || null };
    const zmena = { auto: auto.nazev, datum, typ: row.typ, castka: row.castka, poznamka: row.poznamka };
    if (!potvrzeno(a)) return nahled("Náklad na auto", zmena, ["Pokud platba šla z účtu, je už ve výpisech — tady jde jen o evidenci v modulu Auta."]);
    await q(db().from("auta_naklady").insert(row));
    return zapsano("Náklad zapsán", zmena);
  }
  throw new Error("druh: km, servis nebo naklad.");
}

/* ------------------------------------------------------------- dárky */

const PRILEZITOSTI = ["vanoce", "narozeniny", "jine"];
const STAVY_DARKU = ["prani", "koupeno", "zabaleno"];

export async function zapsatDarek(a) {
  const deti = await q(db().from("deti").select("id,jmeno"));
  if (a.id) {
    const r = await q(db().from("darky").select("*").eq("id", a.id).maybeSingle());
    if (!r) throw new Error("Dárek s tímhle id neexistuje.");
    const patch = {};
    if (a.stav !== undefined) { if (!STAVY_DARKU.includes(a.stav)) throw new Error(`stav: ${STAVY_DARKU.join(", ")}.`); patch.stav = a.stav; }
    if (a.cena !== undefined) patch.cena = cislo(a.cena, "cena", { kladne: true });
    for (const p of ["nazev", "kde", "schovane", "odkaz", "poznamka"]) if (a[p] !== undefined) patch[p] = a[p] || null;
    if (!Object.keys(patch).length) throw new Error("Není co změnit.");
    const zmena = { darek: r.nazev, dite: deti.find((d) => d.id === r.dite_id)?.jmeno, zmeny: patch };
    if (!potvrzeno(a)) return nahled("Úprava dárku", zmena);
    await q(db().from("darky").update(patch).eq("id", r.id));
    return zapsano("Dárek upraven", zmena);
  }
  povinne(a, ["dite", "nazev"]);
  const d = najdi(deti, a.dite, "Dítě", "jmeno");
  const prilezitost = a.prilezitost || "vanoce";
  if (!PRILEZITOSTI.includes(prilezitost)) throw new Error(`prilezitost: ${PRILEZITOSTI.join(", ")}.`);
  const stav = a.stav || "prani";
  if (!STAVY_DARKU.includes(stav)) throw new Error(`stav: ${STAVY_DARKU.join(", ")}.`);
  const row = {
    dite_id: d.id, rok: Number(a.rok) || Number(dnes().slice(0, 4)), prilezitost, nazev: String(a.nazev).trim(),
    cena: cislo(a.cena, "cena", { kladne: true }) ?? 0, stav, kde: a.kde || null, schovane: a.schovane || null, odkaz: a.odkaz || null, poznamka: a.poznamka || null,
  };
  const zmena = { dite: d.jmeno, ...row, dite_id: undefined };
  if (!potvrzeno(a)) return nahled("Nový dárek", zmena);
  await q(db().from("darky").insert(row));
  return zapsano("Dárek zapsán", zmena);
}

/* ------------------------------------------------------- opravy domu */

export async function zapsatOpravu(a) {
  const PRI = { nizka: "low", normalni: "normal", vysoka: "high", low: "low", normal: "normal", high: "high" };
  const STAV = { plan: "plan", planovano: "plan", probiha: "probiha", hotovo: "hotovo" };
  if (a.id) {
    const r = await q(db().from("dum_opravy").select("*").eq("id", a.id).maybeSingle());
    if (!r) throw new Error("Oprava s tímhle id neexistuje.");
    const patch = {};
    if (a.stav !== undefined) { patch.stav = STAV[a.stav]; if (!patch.stav) throw new Error("stav: plan, probiha, hotovo."); if (patch.stav === "hotovo" && !r.datum_hotovo) patch.datum_hotovo = den(a.datum_hotovo, "datum_hotovo") || dnes(); }
    if (a.castka !== undefined) patch.castka = cislo(a.castka, "castka", { kladne: true });
    if (a.popis !== undefined) patch.popis = a.popis || null;
    if (a.priorita !== undefined) { patch.priorita = PRI[a.priorita]; if (!patch.priorita) throw new Error("priorita: nizka, normalni, vysoka."); }
    if (!Object.keys(patch).length) throw new Error("Není co změnit.");
    const zmena = { oprava: r.nazev, zmeny: patch };
    if (!potvrzeno(a)) return nahled("Úprava opravy", zmena);
    await q(db().from("dum_opravy").update(patch).eq("id", r.id));
    return zapsano("Oprava upravena", zmena);
  }
  povinne(a, ["nazev"]);
  const row = {
    nazev: String(a.nazev).trim(), popis: a.popis || null, stav: STAV[a.stav || "plan"] || "plan", priorita: PRI[a.priorita || "normal"] || "normal",
    datum_plan: den(a.datum_plan, "datum_plan") || null, castka: cislo(a.castka, "castka", { kladne: true }) ?? null,
  };
  if (!potvrzeno(a)) return nahled("Nová oprava domu", row);
  await q(db().from("dum_opravy").insert(row));
  return zapsano("Oprava založena", row);
}

