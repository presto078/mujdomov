/* =====================================================================
   Finance — stejné výpočty jako záložky 🧭 Kde jsem a Přehled v appce
   (KdeJsemTab a PrehledFinanci v src/App.jsx). Když se tam změní logika,
   musí se změnit i tady, jinak konektor a appka ukážou jiná čísla.
   ===================================================================== */

import {
  db, q, vse, dnes, mesic, den, posunMesic, posledniDenMesice, klicMesice, nazevMesice,
  kc0, kc, cislo, limit, najdi, nactiCiselniky, dataDoUctu, proFiltr,
} from "./zaklad.js";

/** Poslední měsíc, ke kterému má smysl počítat — rozdělaný se nebere. */
function posledniHotovyMesic() {
  const d = dnes();
  const m = d.slice(0, 7);
  return d === posledniDenMesice(m) ? m : posunMesic(m, -1);
}

const skupinaUctu = (u) => u.skupina || "finance";

/* --------------------------------------------------------- kde jsem */

export async function kdeJsem(a) {
  const k = mesic(a.k_mesici, "k_mesici") || posledniHotovyMesic();
  const { ucty, projekty } = await nactiCiselniky();
  const odRoku = Math.min(2024, Number(posunMesic(k, -9).slice(0, 4)));
  const stavy = await vse(() =>
    db().from("fin_stavy").select("ucet_id,rok,mesic,stav").gte("rok", odRoku).order("rok").order("mesic"),
  );

  const stavKMesici = (uid, m) => {
    let best = null;
    for (const x of stavy) {
      if (String(x.ucet_id) !== String(uid)) continue;
      const km = klicMesice(x.rok, x.mesic);
      if (km <= m && (!best || km > best.m)) best = { m: km, v: +x.stav };
    }
    return best;
  };
  const skupina = (n) => ucty.filter((u) => u.aktivni !== false && n.includes(skupinaUctu(u)));
  const soucet = (arr, m) => arr.reduce((s, u) => s + (stavKMesici(u.id, m)?.v || 0), 0);

  const likvidni = skupina(["finance", "podnikani", "hotovost"]);
  const banky = skupina(["finance", "podnikani"]);
  const rezerva = ucty.filter((u) => u.ucel === "rezerva");
  const sporeni = ucty.filter((u) => u.ucel === "sporeni");
  const mam = soucet(likvidni, k);
  const mamRez = soucet(rezerva, k);
  const mamSpo = soucet(sporeni, k);

  const tempo = (n) => {
    const zac = posunMesic(k, -n);
    const zmena = (mam - soucet(likvidni, zac)) / n;
    return {
      okno: n === 1 ? "poslední měsíc" : `posledních ${n} měsíců`,
      od: zac,
      zmena_mesicne: kc0(zmena),
      zmena_mesicne_jen_banky: kc0((soucet(banky, k) - soucet(banky, zac)) / n),
      vydrzi_mesicu: zmena < 0 ? Math.round((mam / Math.abs(zmena)) * 10) / 10 : null,
    };
  };
  const okna = [tempo(8), tempo(3), tempo(1)];

  // Závazky, které někdy skončí (SJM a podobně) — kolik zbývá a za jak dlouho.
  const zavazkoveProj = projekty.filter((p) => p.typ === "zavazek" && +p.cilova_castka > 0 && +p.mesicni_castka > 0);
  let zavazky = [];
  if (zavazkoveProj.length) {
    const ids = zavazkoveProj.map((p) => p.id);
    const [platbyVypis, platbyHot] = await Promise.all([
      vse(() => db().from("fin_transakce").select("projekt_id,castka").eq("zdroj", "import").in("projekt_id", ids).lt("castka", 0)),
      q(db().from("fin_projekt_platby").select("projekt_id,castka").in("projekt_id", ids)),
    ]);
    zavazky = zavazkoveProj
      .map((p) => {
        const zVypisu = platbyVypis.filter((t) => String(t.projekt_id) === String(p.id)).reduce((s, t) => s - +t.castka, 0);
        const hot = (platbyHot || []).filter((x) => String(x.projekt_id) === String(p.id)).reduce((s, x) => s + (+x.castka || 0), 0);
        const zaplaceno = (+p.zaplaceno_pred || 0) + zVypisu + hot;
        const zbyva = Math.max(0, +p.cilova_castka - zaplaceno);
        return {
          projekt: p.nazev,
          cil: kc0(p.cilova_castka),
          zaplaceno: kc0(zaplaceno),
          zbyva: kc0(zbyva),
          mesicne: kc0(p.mesicni_castka),
          zbyva_mesicu: Math.round((zbyva / +p.mesicni_castka) * 10) / 10,
          termin: p.datum_do || null,
        };
      })
      .sort((x, y) => x.zbyva_mesicu - y.zbyva_mesicu);
  }

  // Slepé místo hotovosti za 8 měsíců: pohyby + deník hotovosti vs. skutečná změna zůstatků.
  let slepeMisto = null;
  {
    const n = 8;
    const zac = posunMesic(k, -n);
    const mesice = [];
    for (let m = posunMesic(zac, 1); m <= k; m = posunMesic(m, 1)) mesice.push(m);
    const ids = likvidni.map((u) => u.id);
    const [toky, hotovost] = await Promise.all([
      ids.length
        ? vse(() =>
            db().from("fin_transakce").select("castka").eq("zdroj", "import").in("ucet_id", ids)
              .gte("datum", `${mesice[0]}-01`).lte("datum", posledniDenMesice(k)),
          )
        : [],
      q(db().from("fin_hotovost").select("mesic,castka,aktivni")),
    ]);
    const hr = (hotovost || []).filter((h) => h.aktivni !== false);
    if (hr.length) {
      const sablona = hr.filter((h) => !h.mesic).reduce((s, h) => s + (+h.castka || 0), 0);
      const hot = mesice.reduce((s, m) => {
        const r = hr.filter((h) => h.mesic === m);
        return s + (r.length ? r.reduce((x, h) => x + (+h.castka || 0), 0) : sablona);
      }, 0);
      const tok = toky.reduce((s, t) => s + (+t.castka || 0), 0);
      const skutecnost = mam - soucet(likvidni, zac);
      slepeMisto = {
        popis: "Měsíčně: kolik by mělo přibýt podle výpisů a deníku hotovosti, kolik skutečně přibylo, a rozdíl, který nikde není zapsaný.",
        ocekavano: kc0((tok + hot) / n),
        skutecnost: kc0(skutecnost / n),
        rozdil: kc0((tok + hot - skutecnost) / n),
      };
    }
  }

  const vypisyDo = await dataDoUctu(banky.map((u) => u.id));
  const poUctech = likvidni.map((u) => {
    const s = stavKMesici(u.id, k);
    return {
      ucet: u.nazev,
      skupina: skupinaUctu(u),
      ucel: u.ucel || null,
      zustatek: s ? kc0(s.v) : null,
      zustatek_z_mesice: s?.m ?? null,
      vypisy_do: vypisyDo[u.id] ?? null,
    };
  });
  const upozorneni = poUctech
    .filter((u) => u.zustatek_z_mesice !== k)
    .map((u) =>
      u.zustatek_z_mesice
        ? `${u.ucet}: zůstatek za ${k} chybí, počítám s posledním známým z ${u.zustatek_z_mesice}.`
        : `${u.ucet}: žádný zůstatek do ${k}.`,
    );

  return {
    k_mesici: k,
    vysvetleni:
      "Likvidní = běžné, spořicí, podnikatelské účty a hotovost; bez dětských, investičních a koníčkových. " +
      "Tempo se počítá ze změny zůstatků, ne ze součtu plateb.",
    likvidni_celkem: kc0(mam),
    rezerva: kc0(mamRez),
    sporeni_s_cilem: kc0(mamSpo),
    bezne_a_hotovost: kc0(mam - mamRez - mamSpo),
    tempo: okna,
    zavazky,
    slepe_misto_hotovosti: slepeMisto,
    po_uctech: poUctech,
    upozorneni,
  };
}

/* ------------------------------------------------- příjmy a výdaje */

export async function prijmyAVydaje(a) {
  const m = mesic(a.mesic, "mesic");
  const od = den(a.od, "od");
  const doD = den(a.do, "do");
  const prumer = a.prumer === true;
  if ((od && !doD) || (!od && doD)) throw new Error("Rozsah zadej celý: od i do.");
  if ([m, od, prumer || undefined].filter(Boolean).length > 1) throw new Error("Zadej jen jedno: mesic, nebo od+do, nebo prumer.");

  const { ucty, kategorie, projekty } = await nactiCiselniky();
  const trans = await vse(() =>
    db().from("fin_transakce")
      .select("id,datum,castka,typ,popis,protistrana,kategorie_id,projekt_id,ucet_id,prevod_ucet_id")
      .eq("zdroj", "import").order("datum"),
  );
  const hotovostRadky = (await q(db().from("fin_hotovost").select("mesic,nazev,castka,aktivni"))).filter((h) => h.aktivni !== false);

  const uctyMap = Object.fromEntries(ucty.map((u) => [u.id, u]));
  const sledovane = new Set(ucty.filter((u) => ["finance", "podnikani"].includes(skupinaUctu(u))).map((u) => u.id));
  const podnik = new Set(ucty.filter((u) => u.skupina === "podnikani").map((u) => u.id));
  const jePrevod = (t) => t.typ === "prevod" || !!t.prevod_ucet_id;

  // Úplnost: měsíc je hotový, když ho pokrývá každý sledovaný účet s daty.
  const vsePohyby = trans.filter((t) => sledovane.has(t.ucet_id));
  const mesiceUctu = new Map();
  for (const t of vsePohyby) {
    if (!mesiceUctu.has(t.ucet_id)) mesiceUctu.set(t.ucet_id, new Set());
    mesiceUctu.get(t.ucet_id).add(String(t.datum).slice(0, 7));
  }
  const pokryva = (uid, mm) => {
    const s = mesiceUctu.get(uid);
    if (!s) return false;
    if (s.has(mm)) return true;
    const ms = [...s];
    return ms.some((x) => x < mm) && ms.some((x) => x > mm);
  };
  const sUdaji = [...sledovane].filter((uid) => mesiceUctu.has(uid));
  const d = dnes();
  const tento = d.slice(0, 7);
  const konecMes = d === posledniDenMesice(tento);
  const vsechnyMesice = [...new Set(vsePohyby.map((t) => String(t.datum).slice(0, 7)))].sort();
  const mesice = vsechnyMesice.filter((x) => (konecMes ? x <= tento : x < tento));
  const hotove = mesice.filter((x) => sUdaji.every((uid) => pokryva(uid, x)));
  const chybejiciUcty = (mm) => sUdaji.filter((uid) => !pokryva(uid, mm)).map((uid) => uctyMap[uid]?.nazev);

  let vObdobi, popis, mesiceObdobi, delitel = 1, uplne = true, chybi = [];
  if (prumer) {
    const n = limit(a.mesicu, hotove.length || 1, 60);
    mesiceObdobi = hotove.slice(-n);
    if (!mesiceObdobi.length) throw new Error("Zatím není žádný měsíc s výpisy ze všech účtů.");
    vObdobi = (t) => mesiceObdobi.includes(String(t.datum).slice(0, 7));
    delitel = mesiceObdobi.length;
    popis = `Měsíční průměr z ${delitel} úplných měsíců (${nazevMesice(mesiceObdobi[0])} – ${nazevMesice(mesiceObdobi[delitel - 1])}).`;
  } else if (od) {
    vObdobi = (t) => String(t.datum) >= od && String(t.datum) <= doD;
    mesiceObdobi = [];
    for (let x = od.slice(0, 7); x <= doD.slice(0, 7); x = posunMesic(x, 1)) mesiceObdobi.push(x);
    chybi = [...new Set(mesiceObdobi.flatMap(chybejiciUcty))].filter(Boolean);
    uplne = !chybi.length;
    popis = `Součet za ${od} – ${doD}.`;
  } else {
    const mm = m || hotove[hotove.length - 1] || vsechnyMesice[vsechnyMesice.length - 1];
    if (!mm) throw new Error("V Domově zatím nejsou žádné importované pohyby.");
    vObdobi = (t) => String(t.datum).slice(0, 7) === mm;
    mesiceObdobi = [mm];
    chybi = chybejiciUcty(mm).filter(Boolean);
    uplne = !chybi.length;
    popis = `${nazevMesice(mm)}${m ? "" : " (poslední úplný měsíc)"}.`;
  }

  const vybrane = trans.filter((t) => sledovane.has(t.ucet_id) && !jePrevod(t) && vObdobi(t));
  const katMap = Object.fromEntries(kategorie.map((k) => [String(k.id), k]));
  const projMap = Object.fromEntries(projekty.map((p) => [String(p.id), p]));
  const neutralni = new Set(projekty.filter((p) => p.neutralni).map((p) => String(p.id)));
  const povinne = new Set(projekty.filter((p) => p.povinny !== false && p.typ !== "akce").map((p) => String(p.id)));
  const jeNeutralni = (t) => t.projekt_id && neutralni.has(String(t.projekt_id));
  const katSVydaji = new Set(vybrane.filter((t) => +t.castka < 0 && t.kategorie_id).map((t) => String(t.kategorie_id)));
  const jeVratka = (t) =>
    +t.castka > 0 && t.kategorie_id && katMap[String(t.kategorie_id)]?.typ === "vydaj" && katSVydaji.has(String(t.kategorie_id));
  const povinny = (t) => t.projekt_id && povinne.has(String(t.projekt_id));

  const toky = vybrane.filter((t) => !jeNeutralni(t));
  const sum = (xs, f) => xs.reduce((s, t) => s + (f(t) ? Math.abs(+t.castka) : 0), 0);
  const prijmy = sum(toky, (t) => +t.castka > 0 && !jeVratka(t));
  const vratkyZav = sum(toky, (t) => jeVratka(t) && t.projekt_id);
  const vratkyZbyt = sum(toky, (t) => jeVratka(t) && !t.projekt_id);
  const zavazky = sum(toky, (t) => +t.castka < 0 && povinny(t)) - vratkyZav;
  const zbytek = sum(toky, (t) => +t.castka < 0 && !povinny(t)) - vratkyZbyt;
  const neutralniObjem = sum(vybrane, (t) => jeNeutralni(t) && +t.castka > 0);
  const zPodnikani = sum(toky.filter((t) => podnik.has(t.ucet_id)), (t) => +t.castka > 0 && !jeVratka(t));

  const sablonaHot = hotovostRadky.filter((h) => !h.mesic).reduce((s, h) => s + (+h.castka || 0), 0);
  const hotovost = hotovostRadky.length
    ? mesiceObdobi.reduce((s, mm) => {
        const r = hotovostRadky.filter((h) => h.mesic === mm);
        return s + (r.length ? r.reduce((x, h) => x + (+h.castka || 0), 0) : sablonaHot);
      }, 0)
    : 0;

  // Rozpad po kategoriích: vratka se odečte od výdajů své kategorie.
  const pk = { prijmy: {}, vydaje: {} };
  const pridej = (strana, klic, castka) => {
    const r = (pk[strana][klic] = pk[strana][klic] || { castka: 0, pocet: 0 });
    r.castka += castka;
    r.pocet++;
  };
  for (const t of toky) {
    const kat = t.kategorie_id ? katMap[String(t.kategorie_id)]?.nazev || "?" : "— nezařazeno";
    if (+t.castka < 0) pridej("vydaje", kat, -t.castka);
    else if (jeVratka(t)) pridej("vydaje", kat, -t.castka);
    else pridej("prijmy", kat, +t.castka);
  }
  const serad = (o) =>
    Object.entries(o)
      .map(([nazev, r]) => ({ nazev, castka: kc0(r.castka / delitel), plateb: r.pocet }))
      .sort((x, y) => y.castka - x.castka);

  const pp = {};
  for (const t of vybrane) {
    if (!t.projekt_id) continue;
    const p = projMap[String(t.projekt_id)];
    const r = (pp[t.projekt_id] = pp[t.projekt_id] || {
      projekt: p?.nazev || "?", povinny: povinne.has(String(t.projekt_id)), neutralni: neutralni.has(String(t.projekt_id)), vydaje: 0, prijmy: 0,
    });
    if (+t.castka < 0) r.vydaje += -t.castka;
    else r.prijmy += +t.castka;
  }

  const nez = toky.filter((t) => !t.kategorie_id);
  const vypisyDo = await dataDoUctu(sUdaji);

  return {
    obdobi: popis,
    mesice: mesiceObdobi,
    uplne,
    chybi_vypisy_z_uctu: chybi,
    poznamka_k_cislum: prumer ? "Všechny částky jsou měsíční průměr." : "Částky jsou součet za období.",
    prijmy: kc0(prijmy / delitel),
    z_toho_z_podnikatelskych_uctu: kc0(zPodnikani / delitel),
    hotovost_podle_deniku: kc0(hotovost / delitel),
    vydaje_povinne: kc0(zavazky / delitel),
    vydaje_ostatni: kc0(zbytek / delitel),
    vratky_odectene_od_vydaju: kc0((vratkyZav + vratkyZbyt) / delitel),
    bilance: kc0((prijmy + hotovost - zavazky - zbytek) / delitel),
    jen_protekl_ucty_neutralni: kc0(neutralniObjem / delitel),
    po_kategoriich: { prijmy: serad(pk.prijmy), vydaje: serad(pk.vydaje) },
    po_projektech: Object.values(pp)
      .map((r) => ({ ...r, vydaje: kc0(r.vydaje / delitel), prijmy: kc0(r.prijmy / delitel) }))
      .sort((x, y) => y.vydaje - x.vydaje),
    nezarazene: { plateb: nez.length, vydaje: kc0(sum(nez, (t) => +t.castka < 0) / delitel), prijmy: kc0(sum(nez, (t) => +t.castka > 0) / delitel) },
    posledni_uplne_mesice: hotove.slice(-12),
    vypisy_do: Object.fromEntries(sUdaji.map((uid) => [uctyMap[uid]?.nazev, vypisyDo[uid]])),
  };
}

/* ------------------------------------------------------- transakce */

export async function transakce(a) {
  const { ucty, kategorie, projekty, deti, auta } = await nactiCiselniky();
  const ucet = najdi(ucty, a.ucet, "Účet");
  const kat = a.kategorie === "zadna" ? null : najdi(kategorie, a.kategorie, "Kategorie");
  const proj = a.projekt === "zadny" ? null : najdi(projekty, a.projekt, "Projekt");
  const od = den(a.od, "od");
  const doD = den(a.do, "do");
  const castka = cislo(a.castka, "castka");
  const n = limit(a.limit, 50, 500);

  const dotaz = () => {
    let x = db().from("fin_transakce")
      .select("id,datum,castka,typ,popis,protistrana,vs,poznamka,kategorie_id,projekt_id,subjekt_typ,subjekt_id,ucet_id,prevod_ucet_id,zdroj")
      .order("datum", { ascending: false }).order("id");
    if (ucet) x = x.eq("ucet_id", ucet.id);
    if (kat) x = x.eq("kategorie_id", kat.id);
    if (a.kategorie === "zadna" || a.nezarazene === true) x = x.is("kategorie_id", null);
    if (proj) x = x.eq("projekt_id", proj.id);
    if (a.projekt === "zadny") x = x.is("projekt_id", null);
    if (od) x = x.gte("datum", od);
    if (doD) x = x.lte("datum", doD);
    if (castka !== undefined) x = x.in("castka", [Math.abs(castka), -Math.abs(castka)]);
    if (a.smer === "prijem") x = x.gt("castka", 0);
    if (a.smer === "vydaj") x = x.lt("castka", 0);
    if (a.text) {
      const t = proFiltr(a.text);
      if (t) x = x.or(["popis", "protistrana", "poznamka", "vs"].map((c) => `${c}.ilike."*${t}*"`).join(","));
    }
    return x;
  };
  let rows = await vse(dotaz);
  if (a.nezarazene === true || a.bez_prevodu === true) rows = rows.filter((t) => !(t.typ === "prevod" || t.prevod_ucet_id));

  const um = Object.fromEntries(ucty.map((u) => [u.id, u.nazev]));
  const km = Object.fromEntries(kategorie.map((k) => [String(k.id), k.nazev]));
  const pm = Object.fromEntries(projekty.map((p) => [String(p.id), p.nazev]));
  const subjekt = (t) => {
    if (!t.subjekt_typ) return null;
    if (t.subjekt_typ === "osoba") return deti.find((x) => String(x.id) === String(t.subjekt_id))?.jmeno || t.subjekt_id;
    if (t.subjekt_typ === "auto") return auta.find((x) => String(x.id) === String(t.subjekt_id))?.nazev || t.subjekt_id;
    return t.subjekt_typ;
  };
  const prijmy = rows.filter((t) => +t.castka > 0).reduce((s, t) => s + +t.castka, 0);
  const vydaje = rows.filter((t) => +t.castka < 0).reduce((s, t) => s - +t.castka, 0);
  const idsUctu = ucet ? [ucet.id] : [...new Set(rows.map((t) => t.ucet_id).filter(Boolean))];
  const vypisyDo = await dataDoUctu(idsUctu);

  return {
    pocet: rows.length,
    vraceno: Math.min(n, rows.length),
    soucty_za_cely_filtr: { prijmy: kc(prijmy), vydaje: kc(vydaje), saldo: kc(prijmy - vydaje) },
    vypisy_do: Object.fromEntries(idsUctu.map((id) => [um[id] || id, vypisyDo[id]])),
    transakce: rows.slice(0, n).map((t) => ({
      id: t.id,
      datum: t.datum,
      castka: kc(t.castka),
      ucet: um[t.ucet_id] || null,
      protistrana: t.protistrana || null,
      popis: t.popis || null,
      vs: t.vs || null,
      poznamka: t.poznamka || null,
      kategorie: t.kategorie_id ? km[String(t.kategorie_id)] || "?" : null,
      projekt: t.projekt_id ? pm[String(t.projekt_id)] || "?" : null,
      pro_koho: subjekt(t),
      prevod: t.typ === "prevod" || !!t.prevod_ucet_id ? (um[t.prevod_ucet_id] || "ano") : null,
      zdroj: t.zdroj || null,
    })),
  };
}

/* ------------------------------------------------------- číselníky */

export async function ciselniky(a) {
  const c = await nactiCiselniky();
  const co = a.co ? [].concat(a.co) : ["ucty", "kategorie", "projekty", "deti", "auta"];
  const out = {};
  if (co.includes("ucty")) {
    const vypisyDo = await dataDoUctu(c.ucty.map((u) => u.id));
    out.ucty = c.ucty.map((u) => ({
      id: u.id, nazev: u.nazev, typ: u.typ, skupina: skupinaUctu(u), ucel: u.ucel || null, aktivni: u.aktivni !== false,
      cislo: u.cislo_uctu ? `${u.cislo_uctu}${u.kod_banky ? "/" + u.kod_banky : ""}` : null, vypisy_do: vypisyDo[u.id],
    }));
  }
  if (co.includes("kategorie")) out.kategorie = c.kategorie.map(({ id, nazev, typ }) => ({ id, nazev, typ }));
  if (co.includes("projekty"))
    out.projekty = c.projekty.map(({ id, nazev, typ, neutralni, povinny, aktivni }) => ({ id, nazev, typ, neutralni: !!neutralni, povinny: povinny !== false, aktivni: aktivni !== false }));
  if (co.includes("deti")) out.lide = c.deti.map(({ id, jmeno, typ, narozen }) => ({ id, jmeno, typ, narozen }));
  if (co.includes("auta")) out.auta = c.auta.map(({ id, nazev, spz, stav }) => ({ id, nazev, spz, stav }));
  return out;
}
