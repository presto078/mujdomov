/* =====================================================================
   Rodina — Péče (střídání s Terezou), Alimenty (Šíma), děti a dárky.
   Výpočty odpovídají PeceTab, AlimentyTab a DarkyTab v src/App.jsx.
   ===================================================================== */

import {
  db, q, vse, dnes, den, cisloDne, zCislaDne, denVTydnu, DNY, MESICE, kc0, limit, posunMesic,
} from "./zaklad.js";

/* ------------------------------------------------------------- péče */

export const PECE_VYCHOZI = {
  kotva: "2026-10-19", vyzivne: 11000, splatnost: 15, ucet_terezy: "1763986028/3030", evidence_od: "2026-10-25", prvni_nemoc: "ja",
};
export const KDO = { ja: "Jirka", tereza: "Tereza", domluva: "podle domluvy" };

export async function nastaveniPece() {
  const r = await q(db().from("app_nastaveni").select("hodnota").eq("klic", "pece").maybeSingle());
  let nast = PECE_VYCHOZI;
  try {
    if (r?.hodnota) nast = { ...PECE_VYCHOZI, ...JSON.parse(r.hodnota) };
  } catch { /* poškozené nastavení — výchozí hodnoty */ }
  return nast;
}

// Týden A (od kotvy) = Patrik u Jirky jen St+Čt, týden B = Po, Út, Pá, So, Ne.
const tydenA = (n, kotva) => (((Math.floor((n - kotva) / 7) % 2) + 2) % 2) === 0;
export function zakladPece(n, kotva) {
  const dow = denVTydnu(n);
  const stct = dow === 2 || dow === 3;
  return tydenA(n, kotva) ? (stct ? "ja" : "tereza") : stct ? "tereza" : "ja";
}
const navstevaUMamy = (n, kotva) => denVTydnu(n) === 5 && tydenA(n, kotva);

function vyzivneMesice(platby, nast, dataDo, dnesN) {
  const castka = +nast.vyzivne || 0;
  const spl = +nast.splatnost || 15;
  const poMesici = {};
  platby.forEach((p) => (poMesici[String(p.datum).slice(0, 7)] = poMesici[String(p.datum).slice(0, 7)] || []).push(p));
  const prvni = platby.length ? cisloDne(platby[platby.length - 1].datum) : dnesN;
  const p0 = zCislaDne(prvni);
  const d0 = zCislaDne(dnesN);
  const rows = [];
  let dluh = 0;
  for (let k = d0.slice(0, 7); k >= p0.slice(0, 7); k = posunMesic(k, -1)) {
    const splatne = cisloDne(`${k}-${String(Math.min(spl, 28)).padStart(2, "0")}`);
    const pl = poMesici[k] || [];
    const suma = pl.reduce((s, p) => s + (+p.castka || 0), 0);
    let stav, kdy;
    if (pl.length) {
      stav = suma >= castka ? "zaplaceno" : "částečně";
      kdy = `přišlo ${pl.map((p) => p.datum).join(", ")}`;
      if (suma < castka && dataDo != null && splatne <= dataDo) dluh += castka - suma;
    } else if (dataDo == null || splatne > dataDo) {
      stav = "čeká";
      kdy = dataDo != null && splatne <= dnesN ? `čeká na výpis (výpisy do ${zCislaDne(dataDo)})` : `splatné ${zCislaDne(splatne)}`;
    } else {
      stav = "nepřišlo";
      kdy = `nepřišlo (výpisy do ${zCislaDne(dataDo)})`;
      dluh += castka;
    }
    const [r, m] = k.split("-");
    rows.push({ mesic: `${MESICE[+m - 1]} ${r}`, prislo: kc0(suma), stav, kdy });
  }
  return { rows, dluh };
}

export async function pece(a) {
  const dnesS = dnes();
  const dnesN = cisloDne(dnesS);
  const od = den(a.od, "od") || dnesS;
  const doD = den(a.do, "do") || zCislaDne(cisloDne(od) + 13);
  const odN = cisloDne(od), doN = cisloDne(doD);
  if (doN < odN) throw new Error("do je před od.");
  if (doN - odN > 92) throw new Error("Rozpis najednou nejvýš na 93 dní.");

  const nast = await nastaveniPece();
  const kotva = cisloDne(nast.kotva);
  const evidOd = cisloDne(nast.evidence_od);
  const [deti, vyj, nem, lek, nav, vyp, katAlim] = await Promise.all([
    q(db().from("deti").select("id,jmeno").in("jmeno", ["Patrik", "Beatka", "Jiřík"])),
    q(db().from("pece_vyjimky").select("datum,kdo,poznamka")),
    q(db().from("pece_nemoci").select("*").order("od", { ascending: false })),
    q(db().from("pece_lekari").select("obor,kdo,poradi").order("poradi")),
    q(db().from("pece_navstevy").select("*").order("datum", { ascending: false }).limit(20)),
    q(db().from("pece_vypomoc").select("*").order("datum", { ascending: false })),
    q(db().from("fin_kategorie").select("id").eq("nazev", "Alimenty")),
  ]);
  const vyjMap = {};
  (vyj || []).forEach((v) => (vyjMap[cisloDne(v.datum)] = v));
  const jmeno = (id) => (deti || []).find((d) => String(d.id) === String(id))?.jmeno || "?";
  const kdoMa = (n) => vyjMap[n]?.kdo || zakladPece(n, kotva);

  const rozpis = [];
  for (let n = odN; n <= doN; n++) {
    const v = vyjMap[n];
    rozpis.push({
      datum: zCislaDne(n),
      den: DNY[denVTydnu(n)],
      patrik: KDO[kdoMa(n)],
      vyjimka: v ? `ano${v.poznamka ? " — " + v.poznamka : ""} (podle rozpisu by byl u ${zakladPece(n, kotva) === "ja" ? "Jirky" : "Terezy"})` : undefined,
      beatka_u_mamy_odpoledne: navstevaUMamy(n, kotva) || undefined,
    });
  }
  // Nejbližší předání Patrika od dneška.
  let predani = null;
  for (let n = dnesN + 1; n < dnesN + 15; n++) {
    if (kdoMa(n) !== kdoMa(dnesN)) {
      predani = { datum: zCislaDne(n), den: DNY[denVTydnu(n)], k: KDO[kdoMa(n)] };
      break;
    }
  }

  const nemoci = nem || [];
  const posl = nemoci[0];
  const naRade = posl ? (posl.kdo === "ja" ? "tereza" : "ja") : nast.prvni_nemoc === "tereza" ? "tereza" : "ja";
  const bil = { ja: { nemoci: 0, dni: 0 }, tereza: { nemoci: 0, dni: 0 } };
  nemoci.forEach((x) => {
    const a1 = cisloDne(x.od), b1 = cisloDne(x.do) ?? a1;
    if (b1 >= evidOd && bil[x.kdo]) {
      bil[x.kdo].nemoci++;
      bil[x.kdo].dni += b1 - a1 + 1;
    }
  });

  const b = { den: 0, noc: 0, hod: 0 };
  (vyp || []).forEach((v) => (b[v.jednotka] = (b[v.jednotka] || 0) + (v.kdo_hlidal === "ja" ? 1 : -1) * (+v.pocet || 0)));
  b.hod = Math.round(b.hod * 100) / 100;
  const fmt = (dd, nn, hh) => [dd ? `${dd} d` : "", nn ? `${nn} noc` : "", hh ? `${hh} h` : ""].filter(Boolean).join(" a ");
  const plus = fmt(Math.max(b.den, 0), Math.max(b.noc, 0), Math.max(b.hod, 0));
  const minus = fmt(Math.max(-b.den, 0), Math.max(-b.noc, 0), Math.max(-b.hod, 0));

  // Výživné od Terezy: příchozí platby z jejího účtu v kategorii Alimenty.
  const katIds = (katAlim || []).map((k) => k.id);
  let pq = db().from("fin_transakce").select("datum,castka,ucet_id").eq("protistrana", nast.ucet_terezy).gt("castka", 0).order("datum", { ascending: false });
  if (katIds.length) pq = pq.in("kategorie_id", katIds);
  const platby = await q(pq);
  const ucty = [...new Set((platby || []).map((p) => p.ucet_id).filter(Boolean))];
  let dataDo = null;
  if (ucty.length) {
    const r = await q(db().from("fin_transakce").select("datum").in("ucet_id", ucty).order("datum", { ascending: false }).limit(1));
    if (r?.[0]) dataDo = cisloDne(r[0].datum);
  }
  const vyz = vyzivneMesice(platby || [], nast, dataDo, dnesN);

  return {
    pravidlo:
      "Patrik se střídá ve 14denním cyklu (týden A u Jirky jen St+Čt, týden B Po, Út, Pá, So, Ne; předání v neděli 18:00). " +
      "Beatka a Jiřík jsou u Jirky, ob 14 dní (sobota v týdnu A) jde Beatka po obědě na pár hodin k mámě. Výjimky mají přednost.",
    dnes: { datum: dnesS, patrik_je_u: KDO[kdoMa(dnesN)], dalsi_predani: predani },
    rozpis,
    nemoci: {
      na_rade: KDO[naRade],
      bilance_od: nast.evidence_od,
      jirka: bil.ja,
      tereza: bil.tereza,
      posledni: nemoci.slice(0, limit(a.nemoci, 5, 50)).map((x) => ({
        od: x.od, do: x.do, kdo: KDO[x.kdo] || x.kdo, deti: (x.deti || []).map(jmeno), poznamka: x.poznamka || undefined,
      })),
    },
    lekari: (lek || []).map((l) => ({ obor: l.obor, chodi: KDO[l.kdo] || l.kdo })),
    navstevy_lekare: (nav || []).map((x) => ({ datum: x.datum, dite: jmeno(x.dite_id), obor: x.obor, kdo: KDO[x.kdo] || x.kdo, poznamka: x.poznamka || undefined })),
    vypomoc: {
      bilance: !plus && !minus ? "vyrovnáno" : [plus ? `Tereza dluží Jirkovi ${plus}` : "", minus ? `Jirka dluží Tereze ${minus}` : ""].filter(Boolean).join(" · "),
      zaznamy: (vyp || []).slice(0, 10).map((v) => ({ datum: v.datum, hlidal: KDO[v.kdo_hlidal] || v.kdo_hlidal, deti: (v.deti || []).length ? v.deti.map(jmeno) : undefined, kolik: `${v.pocet} ${{ den: "d", noc: "noc", hod: "h" }[v.jednotka] || v.jednotka}`, cas: v.cas_od ? `${String(v.cas_od).slice(0, 5)}–${String(v.cas_do).slice(0, 5)}` : undefined, poznamka: v.poznamka || undefined })),
    },
    vyzivne_od_terezy: {
      mesicne: kc0(nast.vyzivne),
      splatnost_den: +nast.splatnost,
      ucet_terezy: nast.ucet_terezy,
      vypisy_do: dataDo != null ? zCislaDne(dataDo) : null,
      dluzi: kc0(vyz.dluh),
      mesice: vyz.rows.slice(0, 12),
    },
  };
}

/* --------------------------------------------------------- alimenty */

const SPLATKA_OD = "2026-06"; // natvrdo dle rozsudku, stejně jako v appce
const ALIM_DETI = ["Sylvestr", "John"];

function sazbaProMesic(sazby, smer, m) {
  if (!m) return 0;
  return ALIM_DETI.reduce((s, dite) => {
    const r = sazby.find((x) => x.smer === smer && x.dite === dite && x.platnost_od <= `${m}-01` && (!x.platnost_do || x.platnost_do >= `${m}-01`));
    return s + (r ? +r.castka : 0);
  }, 0);
}

export async function alimenty(a) {
  const [sazby, platby, mim, nastR, splatky] = await Promise.all([
    q(db().from("alimenty_sazby").select("*").order("platnost_od")),
    q(db().from("alimenty_platby").select("*").order("mesic", { ascending: false })),
    q(db().from("alimenty_mimoradne").select("*").order("datum", { ascending: false })),
    q(db().from("alimenty_nastaveni").select("*")),
    q(db().from("alimenty_splatky_dluhu").select("*").order("datum", { ascending: false })),
  ]);
  const nast = Object.fromEntries((nastR || []).map((r) => [r.klic, r.hodnota]));
  const splatkaM = 2500;
  const al = (platby || []).filter((p) => p.typ === "alimenty");
  const n = limit(a.mesicu, 12, 60);

  const radek = (p) => {
    const otec = p.kdo_plati === "otec" && p.komu === "matce";
    const maByt = otec ? sazbaProMesic(sazby, "otec_matce", p.mesic) : p.kdo_plati === "matka" && p.komu === "otci" ? sazbaProMesic(sazby, "matka_otci", p.mesic) : null;
    return {
      mesic: p.mesic,
      kdo_plati: p.kdo_plati === "otec" ? "otec (Šíma) → Jirka" : "Jirka → otec",
      ma_byt: maByt,
      zaplaceno: +p.castka || 0,
      datum: p.datum || null,
      rozdil: maByt != null ? (+p.castka || 0) - maByt : null,
      poznamka: p.poznamka || undefined,
    };
  };
  const radky = al.map(radek);
  const nedoplatekOtce = radky.filter((r) => r.kdo_plati.startsWith("otec") && r.rozdil < 0).reduce((s, r) => s - r.rozdil, 0);
  const bezPlatby = radky.filter((r) => r.kdo_plati.startsWith("otec") && !r.datum && r.ma_byt > 0).map((r) => r.mesic);

  const zustatekMim = (mim || []).reduce((s, m) => s + (m.matka_zaplatila_za_otce ? +m.podil_otce : 0) - (m.otec_zaplatil_za_matku ? +m.podil_matky : 0), 0);
  const dluhCelkem = parseInt(nast.dluh_celkem || "53250");
  const dluhSplaceno = parseInt(nast.dluh_splaceno || "0");

  const ted = dnes().slice(0, 7);
  return {
    kontext: "Alimenty se Šímou na Sylvestra a Johna. Jirka je v modulu matka: platby od otce jsou příjem, platby otci výdaj. Platby se zapisují ručně v modulu Alimenty, ne z výpisů.",
    aktualni_sazby: {
      otec_platí_mesicne: sazbaProMesic(sazby, "otec_matce", ted),
      od_pristiho_mesice: sazbaProMesic(sazby, "otec_matce", posunMesic(ted, 1)),
      jirka_plati_otci_mesicne: sazbaProMesic(sazby, "matka_otci", ted),
      splatka_dluhu_mesicne: ted >= SPLATKA_OD ? splatkaM : 0,
    },
    nedoplatek_otce: kc0(nedoplatekOtce),
    nedoplatek_poznamka: bezPlatby.length
      ? `Počítá se jako v appce — včetně měsíců bez zapsané platby (${bezPlatby.join(", ")}), které ještě nemusí být splatné nebo nejsou zapsané.`
      : undefined,
    mimoradne_vydaje: {
      zustatek: kc0(zustatekMim),
      vysvetleni: "Kladné = otec dluží Jirkovi podíl z mimořádných výdajů, záporné = naopak.",
      posledni: (mim || []).slice(0, 10).map((m) => ({
        datum: m.datum, dite: m.dite, popis: m.popis, celkem: m.castka_celkem, podil_jirky: m.podil_matky, podil_otce: m.podil_otce,
        jirka_zaplatil_za_otce: !!m.matka_zaplatila_za_otce, otec_zaplatil_za_jirku: !!m.otec_zaplatil_za_matku,
      })),
    },
    dluh: {
      celkem: dluhCelkem, splaceno: dluhSplaceno, zbyva: Math.max(0, dluhCelkem - dluhSplaceno), splatka_od: SPLATKA_OD, splatka_mesicne: splatkaM,
      splatky: (splatky || []).slice(0, 10).map((s) => ({ datum: s.datum, castka: +s.castka, kdo: s.kdo_plati, poznamka: s.poznamka || undefined })),
    },
    platby: radky.slice(0, n * 2),
  };
}

/* ---------------------------------------------------- děti a dárky */

function vek(narozen) {
  if (!narozen) return null;
  const [y, m, d] = narozen.split("-").map(Number);
  const [ty, tm, td] = dnes().split("-").map(Number);
  let v = ty - y;
  if (tm < m || (tm === m && td < d)) v--;
  return v;
}

export async function rodina(a) {
  const rok = Number(a.rok) || Number(dnes().slice(0, 4));
  const [lide, zvirata, darky, pozadavky] = await Promise.all([
    q(db().from("deti").select("id,jmeno,prijmeni,oficialni_jmeno,typ,narozen,skola,trida,krouzky,email,telefon,poznamka,poradi").order("poradi")),
    q(db().from("zvirata").select("jmeno,typ,narozen,poznamka")),
    q(db().from("darky").select("dite_id,rok,prilezitost,nazev,cena,stav,kde,schovane,poznamka").eq("rok", rok)),
    q(db().from("pomucky_pozadavky").select("skolni_rok,dite_id,nazev,pocet,vyrizeno").eq("vyrizeno", false)),
  ]);
  const jm = (id) => (lide || []).find((x) => String(x.id) === String(id))?.jmeno || "?";
  const poDitěti = {};
  (darky || []).forEach((r) => {
    const s = (poDitěti[r.dite_id] = poDitěti[r.dite_id] || { dite: jm(r.dite_id), koupeno: 0, prani: 0, darky: [] });
    if (r.stav === "prani") s.prani += +r.cena || 0;
    else s.koupeno += +r.cena || 0;
    s.darky.push({ nazev: r.nazev, prilezitost: r.prilezitost, cena: +r.cena || 0, stav: r.stav, kde: r.kde || undefined, schovane: r.schovane || undefined });
  });
  return {
    lide: (lide || []).map((x) => ({
      jmeno: x.jmeno, prijmeni: x.prijmeni || undefined, typ: x.typ, narozen: x.narozen, vek: vek(x.narozen),
      skola: x.skola || undefined, trida: x.trida || undefined, krouzky: x.krouzky || undefined, poznamka: x.poznamka || undefined,
    })),
    zvirata: zvirata || [],
    darky: { rok, po_detech: Object.values(poDitěti).map((s) => ({ ...s, koupeno: kc0(s.koupeno), prani: kc0(s.prani) })) },
    skolni_pomucky_k_vyrizeni: (pozadavky || []).map((p) => ({ dite: jm(p.dite_id), rok: p.skolni_rok, nazev: p.nazev, pocet: p.pocet })),
  };
}
