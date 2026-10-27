/* =====================================================================
   Domácnost — právník, projekty, dům a auta, energie, úkoly, IT, hledání.
   ===================================================================== */

import {
  db, q, vse, dnes, den, kc, kc0, limit, najdi, proFiltr, cisloDne, zCislaDne, bezDiakritiky, nactiCiselniky,
} from "./zaklad.js";

/* ---------------------------------------------------------- právník */

export async function pravnik(a) {
  const [pripady, pravnici, sazby, zaznamy, platby] = await Promise.all([
    q(db().from("pravnici_pripady").select("*").order("nazev")),
    q(db().from("pravnici").select("*").order("jmeno")),
    q(db().from("pravnici_sazby").select("*")),
    q(db().from("pravnici_zaznam").select("*").order("datum", { ascending: false })),
    q(db().from("pravnici_platby").select("*").order("datum_platby", { ascending: false })),
  ]);
  const pripad = najdi(pripady || [], a.pripad, "Případ");
  const prav = (id) => (pravnici || []).find((x) => x.id === id)?.jmeno || "?";
  const saz = (id) => (sazby || []).find((x) => x.id === id);
  const zaplaceno = (zid) => (platby || []).filter((p) => p.zaznam_id === zid).reduce((s, p) => s + (+p.zaplacena_castka || 0), 0);

  const souhrn = (pripady || [])
    .filter((p) => !pripad || p.id === pripad.id)
    .filter((p) => a.stav ? p.stav === a.stav : true)
    .map((p) => {
      const zz = (zaznamy || []).filter((z) => z.pripad_id === p.id);
      const vyuct = zz.reduce((s, z) => s + (+z.vypocitana_castka || 0), 0);
      const zapl = zz.reduce((s, z) => s + zaplaceno(z.id), 0);
      return {
        id: p.id, pripad: p.nazev, stav: p.stav, popis: p.popis || undefined,
        vyuctovano: kc0(vyuct), zaplaceno: kc0(zapl), zbyva_zaplatit: kc0(vyuct - zapl),
        zaznamy: zz.slice(0, pripad ? 200 : 10).map((z) => {
          const s = saz(z.sazba_id);
          const zp = zaplaceno(z.id);
          return {
            id: z.id, datum: z.datum, pravnik: prav(z.pravnik_id), sazba: s ? `${s.nazev} (${s.castka} Kč/${s.jednotka})` : null,
            mnozstvi: +z.pocet_hodin_ukonu, castka: kc(z.vypocitana_castka), zaplaceno: kc(zp),
            stav: zp === 0 ? "nezaplaceno" : zp >= +z.vypocitana_castka ? "zaplaceno" : "částečně",
          };
        }),
      };
    });
  return {
    pravnici: (pravnici || []).map((p) => ({
      id: p.id, jmeno: p.jmeno, poznamka: p.poznamka || undefined,
      sazby: (sazby || []).filter((s) => s.pravnik_id === p.id).map((s) => ({ id: s.id, nazev: s.nazev, castka: +s.castka, jednotka: s.jednotka })),
    })),
    pripady: souhrn,
  };
}

/* ---------------------------------------------------------- projekty */

export async function projekty(a) {
  const { projekty: fin } = await nactiCiselniky();
  const akce = await q(db().from("projekty").select("*").order("datum", { ascending: false }));
  // Akce (svatba…) mívá stejnojmenný finanční projekt — přednost má akce, ta ukáže víc.
  let vybrany = null;
  if (a.projekt) {
    try {
      vybrany = { ...najdi(akce || [], a.projekt, "Projekt"), _druh: "akce" };
    } catch (e) {
      if (!/nenacházím/.test(e.message)) throw e;
      vybrany = { ...najdi(fin, a.projekt, "Projekt"), _druh: "fin" };
    }
  }

  const trans = await vse(() =>
    db().from("fin_transakce").select("projekt_id,datum,castka,popis,protistrana,typ,prevod_ucet_id").eq("zdroj", "import").not("projekt_id", "is", null),
  );
  const hot = await q(db().from("fin_projekt_platby").select("*"));
  const finSouhrn = (p) => {
    const tt = trans.filter((t) => String(t.projekt_id) === String(p.id) && !(t.typ === "prevod" || t.prevod_ucet_id));
    const vydaje = tt.filter((t) => +t.castka < 0).reduce((s, t) => s - +t.castka, 0);
    const prijmy = tt.filter((t) => +t.castka > 0).reduce((s, t) => s + +t.castka, 0);
    const hotPl = (hot || []).filter((x) => String(x.projekt_id) === String(p.id));
    const hotSum = hotPl.reduce((s, x) => s + (+x.castka || 0), 0);
    const out = {
      id: p.id, projekt: p.nazev, typ: p.typ, aktivni: p.aktivni !== false, povinny: p.povinny !== false, neutralni: !!p.neutralni,
      vydaje_z_vypisu: kc0(vydaje), prijmy_z_vypisu: kc0(prijmy), platby_mimo_vypisy: kc0(hotSum), plateb: tt.length,
      posledni_platba: tt.length ? tt.map((t) => t.datum).sort().pop() : null,
    };
    if (p.typ === "zavazek" && +p.cilova_castka > 0) {
      const zapl = (+p.zaplaceno_pred || 0) + vydaje + hotSum;
      Object.assign(out, { cil: kc0(p.cilova_castka), zaplaceno: kc0(zapl), zbyva: kc0(Math.max(0, +p.cilova_castka - zapl)), mesicne: kc0(p.mesicni_castka), termin: p.datum_do || null });
    }
    if (vybrany && vybrany._druh === "fin") {
      out.platby = tt.sort((x, y) => String(y.datum).localeCompare(String(x.datum))).slice(0, 50).map((t) => ({ datum: t.datum, castka: kc(t.castka), protistrana: t.protistrana || undefined, popis: t.popis || undefined }));
      out.platby_mimo_vypisy_seznam = hotPl.map((x) => ({ datum: x.datum, castka: kc(x.castka), poznamka: x.poznamka || undefined }));
    }
    return out;
  };

  const akceSouhrn = async (p, detail) => {
    const [rozp, todo, hoste] = await Promise.all([
      q(db().from("projekty_rozpocet").select("*").eq("projekt_id", p.id)),
      q(db().from("projekty_todo").select("*").eq("projekt_id", p.id)),
      q(db().from("projekty_hoste").select("jmeno,typ").eq("projekt_id", p.id)),
    ]);
    const s = (k) => (rozp || []).reduce((x, r) => x + (+r[k] || 0), 0);
    const finP = p.fin_projekt_id ? fin.find((f) => String(f.id) === String(p.fin_projekt_id)) : null;
    return {
      id: p.id, akce: p.nazev, datum: p.datum, misto: p.misto || undefined, popis: p.popis || undefined,
      rozpocet: { odhad: s("cena_odhad"), skutecnost: s("cena_skutecna"), uz_zaplaceno: s("jiz_zaplaceno") },
      utraceno_podle_vypisu: finP ? finSouhrn(finP).vydaje_z_vypisu : null,
      todo_otevrene: (todo || []).filter((t) => !t.splneno).map((t) => ({ id: t.id, nazev: t.nazev, poznamka: t.poznamka || undefined })),
      hostu: (hoste || []).length,
      ...(detail
        ? {
            rozpocet_polozky: (rozp || []).map((r) => ({ kategorie: r.kategorie, polozka: r.polozka, odhad: r.cena_odhad, skutecnost: r.cena_skutecna, zaplaceno: r.jiz_zaplaceno, poznamka: r.poznamka || undefined })),
            hoste: (hoste || []).map((h) => `${h.jmeno}${h.typ && h.typ !== "dospely" ? ` (${h.typ})` : ""}`),
          }
        : {}),
    };
  };

  if (vybrany) return vybrany._druh === "fin" ? finSouhrn(vybrany) : akceSouhrn(vybrany, true);
  return {
    financni_projekty: fin.filter((p) => a.vcetne_neaktivnich || p.aktivni !== false).map(finSouhrn),
    akce: await Promise.all((akce || []).map((p) => akceSouhrn(p, false))),
  };
}

/* -------------------------------------------------------- dům a auta */

export async function dumAAuta() {
  const [opravy, auta, km, servis, naklady] = await Promise.all([
    q(db().from("dum_opravy").select("*").order("created_at", { ascending: false })),
    q(db().from("auta").select("*").order("poradi")),
    q(db().from("auta_kilometry").select("auto_id,datum,stav_km").order("datum", { ascending: false })),
    q(db().from("auta_servis").select("*").order("datum", { ascending: false })),
    q(db().from("auta_naklady").select("*").order("datum", { ascending: false })),
  ]);
  const rok = dnes().slice(0, 4);
  return {
    opravy_otevrene: (opravy || []).filter((o) => o.stav !== "hotovo").map((o) => ({ id: o.id, nazev: o.nazev, popis: o.popis || undefined, stav: o.stav, priorita: o.priorita, planovano: o.datum_plan, odhad: o.castka })),
    opravy_hotove_posledni: (opravy || []).filter((o) => o.stav === "hotovo").slice(0, 5).map((o) => ({ nazev: o.nazev, hotovo: o.datum_hotovo, castka: o.castka })),
    auta: (auta || []).map((a) => {
      const k = (km || []).filter((x) => x.auto_id === a.id);
      const s = (servis || []).filter((x) => x.auto_id === a.id);
      const n = (naklady || []).filter((x) => x.auto_id === a.id);
      const dalsi = s.filter((x) => x.dalsi_servis_datum || x.dalsi_servis_km)[0];
      const suma = (xs, f, pole) => xs.filter(f).reduce((t, x) => t + (+x[pole] || 0), 0);
      return {
        id: a.id, auto: a.nazev, spz: a.spz, stav: a.stav, vlastnictvi: a.typ_vlastnictvi,
        leasing: a.leasing_do ? { do: a.leasing_do, mesicne: +a.leasing_mesicni_splatka || null } : undefined,
        posledni_km: k[0] ? { datum: k[0].datum, km: k[0].stav_km } : null,
        posledni_servis: s[0] ? { datum: s[0].datum, typ: s[0].typ, popis: s[0].popis, cena: +s[0].cena || 0 } : null,
        dalsi_servis: dalsi ? { datum: dalsi.dalsi_servis_datum, km: dalsi.dalsi_servis_km } : null,
        naklady_letos: kc0(suma(n, (x) => String(x.datum).startsWith(rok), "castka") + suma(s, (x) => String(x.datum).startsWith(rok), "cena")),
        naklady_celkem_v_modulu: kc0(suma(n, () => true, "castka") + suma(s, () => true, "cena")),
      };
    }),
    poznamka: "Náklady jsou jen to, co je zapsané v modulu Auta. Co auta stojí podle výpisů, ukáže transakce nebo prijmy_a_vydaje přes kategorie a projekty.",
  };
}

/* ----------------------------------------------------------- energie */

const EL_DEN_MESICE = 30.436875;
const cenikKDatu = (ceniky, datum) => ceniky.filter((c) => c.platnost_od <= datum).sort((x, y) => x.platnost_od.localeCompare(y.platnost_od)).pop() || null;
function zalohyVObdobi(od, doD, ceniky) {
  let [y, m] = od.split("-").map(Number);
  let suma = 0, pocet = 0;
  for (;;) {
    m++;
    if (m > 12) { m = 1; y++; }
    const d1 = `${y}-${String(m).padStart(2, "0")}-01`;
    if (d1 > doD) break;
    suma += +(cenikKDatu(ceniky, d1)?.zaloha) || 0;
    pocet++;
  }
  return { suma: kc(suma), pocet };
}
function spoctiObdobi(od, doO, cen, ceniky) {
  const dny = cisloDne(doO.datum) - cisloDne(od.datum);
  const zVt = od.novy_vt != null ? +od.novy_vt : +od.vt;
  const zNt = od.novy_nt != null ? +od.novy_nt : +od.nt;
  const spVt = +doO.vt - zVt, spNt = +doO.nt - zNt, spC = spVt + spNt;
  const zal = zalohyVObdobi(od.datum, doO.datum, ceniky);
  const zaklad = { od: od.datum, do: doO.datum, dny, kwh_vt: kc(spVt), kwh_nt: kc(spNt), cenik: cen?.nazev || null, zaloh: zal.pocet, zalohy: zal.suma };
  if (!cen) return { ...zaklad, chybi_cenik: true, cena_s_dph: null, rozdil: 0 };
  let sDph;
  if (cen.rezim === "jednoduchy") {
    sDph = kc(kc((spVt / 1000) * (+cen.cena_vt || 0)) + kc((spNt / 1000) * (+cen.cena_nt || 0)) + kc(+cen.pausal_mesic || 0));
  } else {
    const c = (k) => +cen[k] || 0;
    const silova = kc(((spVt / 1000) * c("silova_vt") + (spNt / 1000) * c("silova_nt")) * (1 - c("sleva")));
    const distribuce = kc((spVt / 1000) * c("distribuce_vt") + (spNt / 1000) * c("distribuce_nt"));
    const systemove = kc((spC / 1000) * c("systemove"));
    const dan = kc((spC / 1000) * c("dan"));
    const pevne = kc(((c("staly_plat") + c("jistic") + c("nesitova")) * dny) / EL_DEN_MESICE);
    sDph = kc(kc(silova + distribuce + systemove + dan + pevne) * (1 + c("dph")));
  }
  return { ...zaklad, cena_s_dph: sDph, rozdil: kc(zal.suma - sDph) };
}

function spotrebaVody(odecty) {
  // Spotřeba mezi odečty; po výměně vodoměru navazuje na stav nového.
  let celkem = 0;
  for (let i = 1; i < odecty.length; i++) {
    const p = odecty[i - 1];
    const z = p.vymena && p.stav_novy != null ? +p.stav_novy : +p.stav;
    celkem += +odecty[i].stav - z;
  }
  return celkem;
}

export async function energie() {
  const [vOdecty, vFaktury, vNast, eOdecty, eFaktury, eCeniky] = await Promise.all([
    q(db().from("voda_odecty").select("*").order("datum")),
    q(db().from("voda_faktury").select("*").order("obdobi_do", { ascending: false })),
    q(db().from("voda_nastaveni").select("*")),
    q(db().from("el_odecty").select("*").order("datum")),
    q(db().from("el_faktury").select("*").order("obdobi_do", { ascending: false })),
    q(db().from("el_ceniky").select("*").order("platnost_od")),
  ]);

  // Voda
  const nast = Object.fromEntries((vNast || []).map((r) => [r.klic, r.hodnota]));
  const cenaM3 = parseFloat(nast.cena_m3_s_dph || "80.19");
  const stocneM3 = parseFloat(nast.cena_stocne_m3_s_dph || "64.96");
  const typ = (t) => (vOdecty || []).filter((o) => o.typ === t);
  const posledniFak = (t) => (vFaktury || []).filter((f) => f.typ === t && f.obdobi_do).sort((x, y) => y.obdobi_do.localeCompare(x.obdobi_do))[0];
  const odData = posledniFak("baracom")?.obdobi_do || null;
  const odStocne = posledniFak("stocne")?.obdobi_do || null;
  const odDo = (rows, od) => (od ? rows.filter((o) => o.datum >= od) : rows);
  const hl = typ("hlavni"), zah = typ("zahradni"), pod = typ("podruzny");
  const spHlavni = spotrebaVody(odDo(hl, odData));
  const spHlavniSt = spotrebaVody(odDo(hl, odStocne));
  const spZahrSt = spotrebaVody(odDo(zah, odStocne));
  const posl = (rows) => rows.length ? { datum: rows[rows.length - 1].datum, stav: +rows[rows.length - 1].stav } : null;

  // Elektřina
  const rady = (eOdecty || []).filter((o) => o.vt != null && o.nt != null);
  const ceniky = eCeniky || [];
  const obdobi = [];
  for (let i = 1; i < rady.length; i++) obdobi.push(spoctiObdobi(rady[i - 1], rady[i], cenikKDatu(ceniky, rady[i].datum), ceniky));
  const vyrovnanoDo = (eFaktury || []).map((f) => f.obdobi_do).filter(Boolean).sort().pop() || null;
  const nevyrovnana = obdobi.filter((o) => !vyrovnanoDo || o.do > vyrovnanoDo);
  const kumulativ = kc(nevyrovnana.reduce((s, o) => s + o.rozdil, 0));
  const elPosl = rady[rady.length - 1];
  const dalsiOdecet = elPosl ? (() => { const [y, m] = elPosl.datum.split("-").map(Number); return m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`; })() : null;
  const dn = dnes();

  return {
    voda: {
      dodavatele: "Vodné BARACOM (fakturační vodoměr), stočné Technické služby Vodochody‑Hoštice (pololetně). Zahradní vodoměr se odečítá od stočného.",
      posledni_odecty: { fakturacni: posl(hl), podruzny: posl(pod), zahradni: posl(zah) },
      posledni_faktura_vodne: posledniFak("baracom") || null,
      posledni_faktura_stocne: posledniFak("stocne") || null,
      nezaplacene_faktury: (vFaktury || []).filter((f) => !f.zaplaceno).map((f) => ({ typ: f.typ, cislo: f.cislo_faktury, castka: f.castka, splatnost: f.datum_splatnosti })),
      od_posledni_faktury: {
        vodne_m3: kc(spHlavni), vodne_odhad_kc: kc0(spHlavni * cenaM3), od: odData,
        stocne_m3: kc(spHlavniSt - spZahrSt), stocne_odhad_kc: kc0((spHlavniSt - spZahrSt) * stocneM3), stocne_od: odStocne,
        poznamka: "Odhad bez paušálu; odečty fakturačního vodoměru mohou být starší než podružného.",
      },
    },
    elektrina: {
      dodavatel: "CENTROPOL ENERGY, dvoutarif VT/NT, samoodečty k 1. dni měsíce.",
      posledni_odecet: elPosl ? { datum: elPosl.datum, vt: +elPosl.vt, nt: +elPosl.nt } : null,
      dalsi_odecet: dalsiOdecet ? { datum: dalsiOdecet, po_terminu: dalsiOdecet < dn } : null,
      aktualni_cenik: (() => { const c = cenikKDatu(ceniky, dn); return c ? { nazev: c.nazev, od: c.platnost_od, rezim: c.rezim, zaloha: +c.zaloha } : null; })(),
      vyuctovano_do: vyrovnanoDo,
      prubezne_od_vyuctovani: { zalohy_minus_spotreba: kumulativ, vyznam: kumulativ >= 0 ? "přeplatek" : "nedoplatek" },
      obdobi_od_vyuctovani: nevyrovnana,
      faktury: (eFaktury || []).slice(0, 4).map((f) => ({ cislo: f.cislo_faktury, obdobi: `${f.obdobi_od} – ${f.obdobi_do}`, celkem: +f.castka_celkem, zalohy: +f.zalohy, vyrovnani: +f.vyrovnani, zaplaceno: !!f.zaplaceno })),
    },
  };
}

/* ------------------------------------------------------ úkoly a sklad */

export async function ukoly(a) {
  const dn = dnes();
  const horizont = zCislaDne(cisloDne(dn) + limit(a.dni, 30, 365));
  const [uk, pozn, todo, akce, pred, sklad] = await Promise.all([
    q(db().from("ukoly").select("*").order("dalsi_termin")),
    q(db().from("poznamky").select("*").eq("splneno", false).order("created_at", { ascending: false })),
    q(db().from("projekty_todo").select("id,projekt_id,nazev,poznamka").eq("splneno", false)),
    q(db().from("projekty").select("id,nazev")),
    q(db().from("predplatne").select("*").eq("aktivni", true)),
    q(db().from("sklad_polozky").select("nazev,pocet,minimum,jednotka,umisteni")),
  ]);
  return {
    dnes: dn,
    pravidelne_ukoly: (uk || []).filter((u) => !u.dalsi_termin || u.dalsi_termin <= horizont).map((u) => ({
      id: u.id, nazev: u.nazev, kategorie: u.kategorie || undefined, termin: u.dalsi_termin, po_terminu: !!u.dalsi_termin && u.dalsi_termin < dn,
      interval_dni: u.interval_dnu, naposledy: u.posledni_splneni,
    })),
    poznamky_nesplnene: (pozn || []).map((p) => ({ id: p.id, nazev: p.nazev, obsah: p.obsah || undefined, priorita: p.priorita })),
    projektove_todo: (todo || []).map((t) => ({ id: t.id, projekt: (akce || []).find((x) => x.id === t.projekt_id)?.nazev || "?", nazev: t.nazev, poznamka: t.poznamka || undefined })),
    predplatne: (pred || []).map((p) => ({ nazev: p.nazev, castka: +p.castka, perioda: p.perioda, do: p.datum_do, vypovedni_lhuta_dni: p.vypovedni_lhuta_dny, poznamka: p.poznamka || undefined })),
    sklad_pod_minimem: (sklad || []).filter((s) => s.minimum != null && +s.pocet < +s.minimum).map((s) => ({ nazev: s.nazev, pocet: +s.pocet, minimum: +s.minimum, jednotka: s.jednotka, kde: s.umisteni })),
  };
}

/* ---------------------------------------------------------------- IT */

export async function it(a) {
  const [zar, lic, ucty] = await Promise.all([
    q(db().from("it_zarizeni").select("*").order("nazev")),
    q(db().from("it_licence").select("id,nazev,typ,verze,email_uctu,zarizeni_id,klic,poznamka")),
    q(db().from("it_ucty").select("id,nazev,sluzba,login,url,zarizeni_id,tajne")),
  ]);
  const t = a.text ? bezDiakritiky(a.text) : null;
  const sedi = (o) => !t || bezDiakritiky(Object.values(o).filter((v) => typeof v === "string").join(" ")).includes(t);
  return {
    poznamka: "Hesla a licenční klíče se sem nevypisují — patří do KeePassu.",
    zarizeni: (zar || []).filter(sedi).map((z) => {
      const { created_at, ...rest } = z;
      void created_at;
      return {
        ...rest,
        licence: (lic || []).filter((l) => l.zarizeni_id === z.id).map((l) => ({ id: l.id, nazev: l.nazev, typ: l.typ, verze: l.verze, ucet: l.email_uctu, poznamka: l.poznamka || undefined })),
        ucty: (ucty || []).filter((u) => u.zarizeni_id === z.id).map((u) => ({ id: u.id, nazev: u.nazev, sluzba: u.sluzba, login: u.login, url: u.url })),
      };
    }),
    licence_bez_zarizeni: (lic || []).filter((l) => !l.zarizeni_id && sedi(l)).map((l) => ({ id: l.id, nazev: l.nazev, typ: l.typ, verze: l.verze, ucet: l.email_uctu })),
    ucty_bez_zarizeni: (ucty || []).filter((u) => !u.zarizeni_id && sedi(u)).map((u) => ({ id: u.id, nazev: u.nazev, sluzba: u.sluzba, login: u.login, url: u.url })),
  };
}

/* ------------------------------------------------------------ hledání */

export async function hledej(a) {
  const t = proFiltr(a.dotaz);
  if (!t || t.length < 2) throw new Error("Zadej aspoň dva znaky.");
  const n = limit(a.limit, 15, 100);
  const like = `*${t}*`;
  const nebo = (...sloupce) => sloupce.map((c) => `${c}.ilike."${like}"`).join(",");
  const [tr, pozn, opr, todo, zar, dar, prip] = await Promise.all([
    q(db().from("fin_transakce").select("id,datum,castka,protistrana,popis,ucet_id").or(nebo("popis", "protistrana", "poznamka", "vs")).order("datum", { ascending: false }).limit(n)),
    q(db().from("poznamky").select("id,nazev,obsah,splneno").or(nebo("nazev", "obsah")).limit(n)),
    q(db().from("dum_opravy").select("id,nazev,stav,castka").or(nebo("nazev", "popis")).limit(n)),
    q(db().from("projekty_todo").select("id,nazev,splneno").ilike("nazev", like).limit(n)),
    q(db().from("it_zarizeni").select("id,nazev,typ,uzivatel,poznamka").or(nebo("nazev", "uzivatel", "poznamka", "model")).limit(n)),
    q(db().from("darky").select("id,rok,nazev,cena,stav").ilike("nazev", like).limit(n)),
    q(db().from("pravnici_pripady").select("id,nazev,stav").ilike("nazev", like).limit(n)),
  ]);
  return { transakce: tr, poznamky: pozn, opravy: opr, projektove_todo: todo, it_zarizeni: zar, darky: dar, pravni_pripady: prip };
}
