import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";

// ── Konfigurace aplikace ──────────────────────────────────────────────────────
const APP_NAME = "Domov";
const APP_EMOJI = "🏡";
const SUPA_URL = import.meta.env.VITE_SUPA_URL;
const SUPA_KEY = import.meta.env.VITE_SUPA_KEY;
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const GOOGLE_REDIRECT = window.location.origin+"/auth/callback";
const GOOGLE_SCOPES = "https://www.googleapis.com/auth/calendar.readonly";
const sb = createClient(SUPA_URL, SUPA_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
});

// Google Calendar IDs
const KALENDARE = [
  {nazev:"Děti",       id:"3431598c2ca458df11aba239dca80aa081e81e587047eacb8b7a68384fe5d825@group.calendar.google.com", barva:"#4f7ef0"},
  {nazev:"Mi a Ji",    id:"60b5075eb5748bdff6bb39b0dce2ef9c619fef234671868d3eb64a4d5436ce97@group.calendar.google.com",  barva:"#e05555"},
  {nazev:"Honzík",     id:"70642ca7ccc55b8b2d0551671c745411a541d857eedd9eae3ca5f3f28139b61a@group.calendar.google.com",  barva:"#2ecc8a"},
  {nazev:"Sylvík",     id:"9c6f15ed85d32520f1d9eb9218e2b6a2c9b2e93e68ff706b29e986433d087749@group.calendar.google.com",  barva:"#e8a030"},
  {nazev:"Svátky",     id:"cs.czech#holiday@group.v.calendar.google.com", barva:"#9b7ef5"},
];

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  bg:"#f0f2f7", surface:"#ffffff", card:"#ffffff",
  border:"#e2e6f0", borderL:"#d0d6e8",
  accent:"#3b6fd4", accentS:"#e8eeff",
  green:"#1a7a4a", greenS:"#e6f4ed",
  red:"#c0392b", redS:"#fdecea",
  orange:"#c87000", orangeS:"#fff4e0",
  purple:"#6b3fa0", purpleS:"#f3eeff",
  blue:"#1a6fa8", blueS:"#e6f3fb",
  text:"#1a1d2e", muted:"#5a6380", dim:"#9aa0b8",
};

const MODULES = [
  { id:"deti",     label:"Rodina",   emoji:"👨‍👩‍👧‍👦" },
  { id:"obleceni", label:"Oblečení", emoji:"👕" },
  { id:"boty",     label:"Boty",     emoji:"👟" },
  { id:"sklad",    label:"Sklad",    emoji:"📦" },
  { id:"ukoly",    label:"Úkoly",    emoji:"🔁" },
  { id:"spotreba", label:"Spotřeba", emoji:"💧" },
  { id:"finance",  label:"Finance",  emoji:"💰" },
  { id:"dum",      label:"Dům",      emoji:"🔧" },
];

const STORAGE_TYPES = {
  box:{label:"Box / krabice",icon:"📦",color:C.blue},
  bag:{label:"Pytel / taška",icon:"🛍",color:C.green},
  shelf:{label:"Police",icon:"🗄",color:C.orange},
  hanger:{label:"Věšák",icon:"👕",color:C.purple},
  other:{label:"Jiné",icon:"·",color:C.muted},
};
const STAV_OPRAVY = {
  plan:{label:"Plánováno",color:C.blue},
  probiha:{label:"Probíhá",color:C.orange},
  hotovo:{label:"Hotovo",color:C.green},
};
const PRIORITA = {
  low:{label:"Nízká",color:C.dim},
  normal:{label:"Normální",color:C.blue},
  high:{label:"Vysoká",color:C.red},
};
const QUICK_ITEMS = ["Triko krátké","Triko dlouhé","Mikina","Teplaky","Kalhoty / džíny","Kraťasy","Pyžamo","Bunda","Body","Overal","Vestičky","Svetr","Kombinéza","Košile","Nátělník","Punčocháče","Ponožky"];
const DITE_EMOJIS = ["👶","🧒","👦","👧","🧑","👱","👨","👩","🧔","👴","👵","🧓","👨‍🦱","👩‍🦱","👨‍🦰","👩‍🦰","👨‍🦳","👩‍🦳","👨‍🦲","👩‍🦲","🧕","👲","🧑‍🎓","👨‍🎓","👩‍🎓","🧑‍💼","👨‍💼","👩‍💼","🧑‍🍳","👨‍🍳","👩‍🍳","🧑‍🔧","👨‍🔧","👩‍🔧","🧑‍🎨","🦸","🦹","🧙","🧝","🧟","🧜","🧚","🤴","👸","🤶","🎅","🥷","🫅","🫶"];
const DITE_BARVY  = ["#4f7ef0","#e05555","#2ecc8a","#e8a030","#9b7ef5","#38b2e8","#f5a623","#2ed8c8"];

const inp  = {background:C.surface,border:`1px solid ${C.borderL}`,borderRadius:8,padding:"8px 12px",color:C.text,fontSize:13,outline:"none",width:"100%"};
const btnC = (color=C.accent,ghost=false) => ({padding:"8px 18px",borderRadius:9,border:ghost?`1px solid ${color}`:"none",background:ghost?"transparent":color,color:ghost?color:"#fff",cursor:"pointer",fontWeight:700,fontSize:13,transition:"all .15s"});
const fmt  = n => new Intl.NumberFormat("cs-CZ",{style:"currency",currency:"CZK",maximumFractionDigits:0}).format(n||0);

// ── Helpers ───────────────────────────────────────────────────────────────────
function useData(query,deps=[]) {
  const [data,setData]=useState(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState(null);
  const fn=useRef(query); fn.current=query;
  const load=()=>{setLoading(true);fn.current().then(({data:d,error:e})=>{if(e)setError(e.message);else setData(d);setLoading(false);});};
  useEffect(load,deps);
  return{data,loading,error,setData,reload:load};
}
function daysUntil(dateStr){if(!dateStr)return null;return Math.ceil((new Date(dateStr)-new Date())/86400000);}
function vekText(narozen){if(!narozen)return"";const d=new Date(narozen),now=new Date();let y=now.getFullYear()-d.getFullYear(),m=now.getMonth()-d.getMonth();if(m<0){y--;m+=12;}return y===0?`${m} měs.`:`${y} let`;}

// ── Sdílené komponenty ────────────────────────────────────────────────────────
function Spinner(){return <div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:60,color:C.muted,fontSize:14,gap:10}}><div style={{width:18,height:18,border:`2px solid ${C.border}`,borderTop:`2px solid ${C.accent}`,borderRadius:"50%",animation:"spin .8s linear infinite"}}/>Načítám…<style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>;}
function Tag({color,children}){return <span style={{background:`${color}22`,color,padding:"2px 9px",borderRadius:20,fontSize:11,fontWeight:700,whiteSpace:"nowrap"}}>{children}</span>;}
function Field({label,hint,children}){return <div style={{marginBottom:14}}><div style={{color:C.muted,fontSize:11,fontWeight:700,letterSpacing:.7,textTransform:"uppercase",marginBottom:5}}>{label}</div>{children}{hint&&<div style={{color:C.dim,fontSize:11,marginTop:3}}>{hint}</div>}</div>;}
// Větší/vzdušnější varianta Field pro CashflowModal. MUSÍ být na úrovni modulu —
// definovaná uvnitř komponenty by se při každém renderu vytvořila znovu a inputy
// by po každém znaku ztrácely fokus (remount).
function FL({label,hint,children,style}){return <div style={{marginBottom:0,...style}}><div style={{color:C.muted,fontSize:12.5,fontWeight:800,letterSpacing:.4,textTransform:"uppercase",marginBottom:7}}>{label}</div>{children}{hint&&<div style={{color:C.dim,fontSize:11.5,marginTop:6,lineHeight:1.4}}>{hint}</div>}</div>;}
function Modal({title,onClose,children,width=460,bg,accent}){return <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.8)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200}} onClick={onClose}><div style={{background:bg||C.card,border:`1px solid ${C.border}`,borderTop:accent?`4px solid ${accent}`:`1px solid ${C.border}`,borderRadius:16,padding:28,width,maxWidth:"95vw",maxHeight:"92vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}><div style={{color:accent||C.text,fontWeight:800,fontSize:18}}>{title}</div><button onClick={onClose} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:22}}>✕</button></div>{children}</div></div>;}
function EmptyState({emoji,text,action,onAction}){return <div style={{textAlign:"center",padding:"60px 0",color:C.dim}}><div style={{fontSize:48,marginBottom:12}}>{emoji}</div><div style={{fontSize:14,marginBottom:16}}>{text}</div>{action&&<button onClick={onAction} style={btnC()}>{action}</button>}</div>;}
function StatCard({label,val,color=C.accent}){return <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:"14px 16px",textAlign:"center"}}><div style={{fontSize:22,fontWeight:800,color}}>{val}</div><div style={{color:C.muted,fontSize:11,fontWeight:700,letterSpacing:.5,textTransform:"uppercase",marginTop:2}}>{label}</div></div>;}

// ══════════════════════════════════════════════════════════════════════════════
// FINANČNÍ VAZBY — propojení cashflow plánu s entitami (děti / zvířata / dům / sklad)
// ══════════════════════════════════════════════════════════════════════════════
const MESICE=["Leden","Únor","Březen","Duben","Květen","Červen","Červenec","Srpen","Září","Říjen","Listopad","Prosinec"];

// ── Reálné finance — sdílené helpery (FINANCE REALITA + CASHFLOW) ─────────────
// Klasifikace transakce tolerantní k legacy typu "transakce":
//   "prevod" = interní přelévání mezi účty (vyřazeno z útrat)
//   "prijem" / "vydaj" = reálný tok peněz
function klasifikujTransakci(t){
  if(!t) return "vydaj";
  if(t.typ==="prevod"||t.prevod_ucet_id) return "prevod";
  if(t.typ==="prijem") return "prijem";
  if(t.typ==="vydaj")  return "vydaj";
  return (+t.castka>=0)?"prijem":"vydaj";
}
// Množina ID „svatých" dětských spořicích účtů (typ === 'deti').
function detskeUcetIds(ucty){
  return new Set((ucty||[]).filter(u=>u.typ==="deti").map(u=>String(u.id)));
}
// Je daný účet (podle ID) dětský svatý účet?
function jeDetskyUcet(id,detiSet){ return detiSet.has(String(id)); }

// Položka cashflow → hodnota pro <select> vazby (formát "typ:id")
function vazbaZPolozky(p){
  if(!p) return "";
  if(p.dite_id)   return "dite:"+p.dite_id;
  if(p.zvire_id)  return "zvire:"+p.zvire_id;
  if(p.oprava_id) return "oprava:"+p.oprava_id;
  if(p.auto_id)   return "auto:"+p.auto_id;
  if(p.je_majetek)return "sklad:"+(p.sklad_kategorie_id||"obecne");
  return "";
}
// Hodnota ze <select> vazby → cizí klíče pro Supabase (ostatní vynulovány).
// PK entit jsou SMÍŠENÉ (deti=uuid, zvirata=bigint, …) → ID posíláme jako string.
// PostgREST string korektně přetypuje na uuid i bigint; číslo by do uuid neprošlo.
function vazbaNaSloupce(v){
  const base={dite_id:null,zvire_id:null,oprava_id:null,auto_id:null,zaznam_id:null,je_majetek:false,sklad_kategorie_id:null};
  if(!v) return base;
  const i=v.indexOf(":"); const t=v.slice(0,i), id=v.slice(i+1);
  if(t==="dite")   return {...base,dite_id:id};
  if(t==="zvire")  return {...base,zvire_id:id};
  if(t==="oprava") return {...base,oprava_id:id};
  if(t==="auto")   return {...base,auto_id:id};
  if(t==="zaznam") return {...base,zaznam_id:id};
  if(t==="sklad")  return {...base,je_majetek:true,sklad_kategorie_id:id==="obecne"?null:id};
  return base;
}
// Položka cashflow → {emoji,label,color} pro zobrazení Tagu vazby (nebo null)
function cashflowVazbaInfo(p,zdroje={}){
  const {deti,zvirata,opravy,auta,zaznamy,skladKat}=zdroje;
  const eq=(a,b)=>String(a)===String(b);
  if(p.dite_id){const d=(deti||[]).find(x=>eq(x.id,p.dite_id));return{emoji:d?.emoji||"👤",label:d?.jmeno||"Člen rodiny",color:d?.barva||C.blue};}
  if(p.zvire_id){const z=(zvirata||[]).find(x=>eq(x.id,p.zvire_id));return{emoji:z?.emoji||"🐾",label:z?.jmeno||"Zvíře",color:z?.barva||"#7a5c3a"};}
  if(p.oprava_id){const o=(opravy||[]).find(x=>eq(x.id,p.oprava_id));return{emoji:"🔧",label:o?.nazev||"Oprava",color:C.orange};}
  if(p.auto_id){const a=(auta||[]).find(x=>eq(x.id,p.auto_id));return{emoji:"🚗",label:a?.nazev||a?.spz||"Auto",color:C.accent};}
  if(p.zaznam_id){const z=(zaznamy||[]).find(x=>eq(x.id,p.zaznam_id));return{emoji:"⚖️",label:z?"Právník · "+z.id:"Právník",color:C.purple};}
  if(p.je_majetek){const k=(skladKat||[]).find(x=>eq(x.id,p.sklad_kategorie_id));return{emoji:k?.emoji||"📦",label:k?`Majetek · ${k.nazev}`:"Majetek / sklad",color:C.purple};}
  return null;
}

// Sdílený modal pro vytvoření/úpravu položky cashflow plánu — použitelný odkudkoliv.
// Volitelný `lock` předvybere a uzamkne vazbu: {dite_id} | {zvire_id} | {oprava_id} | {majetek:true}
function CashflowModal({polozka,defaultRok,defaultMesic,defaultNazev,defaultCastka,lock,onClose,onSaved}){
  const dnes=new Date();
  const {data:kategorie,reload:reloadKat}=useData(()=>sb.from("fin_kategorie").select("*").order("poradi"));
  const {data:ucty}=useData(()=>sb.from("fin_ucty").select("id,nazev,typ,mena").eq("aktivni",true).order("poradi"));
  const {data:deti}=useData(()=>sb.from("deti").select("id,jmeno,emoji,barva").order("jmeno"));
  const {data:zvirata}=useData(()=>sb.from("zvirata").select("id,jmeno,emoji,barva").order("jmeno"));
  const {data:opravy}=useData(()=>sb.from("dum_opravy").select("id,nazev,stav").order("nazev"));
  const {data:auta}=useData(()=>sb.from("auta").select("id,nazev,spz").order("nazev"));
  const {data:skladKat}=useData(()=>sb.from("sklad_kategorie").select("id,nazev,emoji").order("poradi"));
  const {data:zaznamy}=useData(()=>sb.from("pravnici_zaznam").select("id,pripad_id").order("datum",{ascending:false}));

  const lockVazba = lock?.dite_id   ? "dite:"+lock.dite_id
    : lock?.zvire_id  ? "zvire:"+lock.zvire_id
    : lock?.oprava_id ? "oprava:"+lock.oprava_id
    : lock?.auto_id   ? "auto:"+lock.auto_id
    : lock?.zaznam_id ? "zaznam:"+lock.zaznam_id
    : lock?.majetek   ? "sklad:obecne"
    : null;

  // Iniciální typ transakce odvozený z dat (převod / znaménko částky)
  const initTyp = polozka?.prevod_ucet_id ? "prevod"
    : polozka!=null ? (Number(polozka.castka)<0 ? "vydej" : "prijem")
    : (defaultCastka!=null && defaultCastka!=="" ? (Number(defaultCastka)<0 ? "vydej" : "prijem") : "vydej");

  const [f,setF]=useState({
    rok:polozka?.rok||defaultRok||dnes.getFullYear(),
    mesic:polozka?.mesic||defaultMesic||(dnes.getMonth()+1),
    nazev:polozka?.nazev||defaultNazev||"",
    // Částka se vždy zobrazuje a zadává jako kladná; znaménko řídí typ transakce
    castka: polozka!=null ? String(Math.abs(polozka.castka))
      : (defaultCastka!=null && defaultCastka!=="" ? String(Math.abs(defaultCastka)) : ""),
    kategorie_id:polozka?.kategorie_id||"",
    opakovani:polozka?.opakovani||"jednorazove",
    datum_do:polozka?.datum_do||"",
    poznamka:polozka?.poznamka||"",
    vazba: polozka?vazbaZPolozky(polozka):(lockVazba||""),
    ucet_id: polozka?.ucet_id!=null?String(polozka.ucet_id):"",
    prevod_ucet_id: polozka?.prevod_ucet_id!=null?String(polozka.prevod_ucet_id):"",
  });
  const [typ,setTyp]=useState(initTyp);          // "prijem" | "vydej" | "prevod"
  const [saving,setSaving]=useState(false);
  const [novaKatOtevreno,setNovaKatOtevreno]=useState(false);
  const [novaKat,setNovaKat]=useState({nazev:"",emoji:"💰"});
  const [ukladamKat,setUkladamKat]=useState(false);
  const set=k=>e=>setF(p=>({...p,[k]:e.target.value}));
  const isNew=!polozka;
  const jePrevod = typ==="prevod";                // odvozené – řídí zobrazení polí i uložení
  const nacitam = kategorie===null||ucty===null||deti===null||zvirata===null||opravy===null||auta===null||skladKat===null||zaznamy===null;
  // Uzamčená vazba na konkrétní entitu (ne majetek) → předvybraný a zakázaný dropdown
  const lockInfo = (lock && !lock.majetek) ? cashflowVazbaInfo(vazbaNaSloupce(lockVazba),{deti,zvirata,opravy,auta,zaznamy,skladKat}) : null;

  // Rychlé přidání kategorie přímo z tohoto okna (bez odskoku do editoru kategorií).
  const pridejKategorii=async()=>{
    if(!novaKat.nazev.trim()) return;
    setUkladamKat(true);
    const katTyp = typ==="prijem" ? "prijem" : "vydaj";
    const {data:vlozeno,error} = await sb.from("fin_kategorie")
      .insert({nazev:novaKat.nazev.trim(), emoji:(novaKat.emoji||"💰").trim()||"💰", typ:katTyp, barva:"#4f7ef0", poradi:(kategorie||[]).length})
      .select().single();
    setUkladamKat(false);
    if(error){ alert("Kategorii se nepodařilo přidat:\n"+(error.message||"neznámá chyba")); return; }
    await reloadKat();
    if(vlozeno?.id!=null) setF(p=>({...p,kategorie_id:vlozeno.id}));
    setNovaKat({nazev:"",emoji:"💰"}); setNovaKatOtevreno(false);
  };

  const prevodNeplatny = jePrevod && (!f.ucet_id || !f.prevod_ucet_id || String(f.ucet_id)===String(f.prevod_ucet_id));
  const ucetChybi = !f.ucet_id; // účet je povinný u všech typů (jinak se položka nepromítne do predikce účtu)
  const uloz=async()=>{
    if(!f.nazev.trim()||f.castka===""||ucetChybi) return;
    if(prevodNeplatny) return;
    setSaving(true);
    const data={
      rok:+f.rok,mesic:+f.mesic,nazev:f.nazev.trim(),
      // Výdej → záporná, příjem i převod → kladná
      castka: typ==="vydej" ? -Math.abs(+f.castka) : Math.abs(+f.castka),
      kategorie_id: jePrevod ? null : (f.kategorie_id||null),
      opakovani:f.opakovani,
      datum_do:f.datum_do||null,poznamka:f.poznamka||null,
      ucet_id: f.ucet_id?String(f.ucet_id):null,
      prevod_ucet_id: jePrevod ? String(f.prevod_ucet_id) : null,
      ...(jePrevod
        ? {dite_id:null,zvire_id:null,oprava_id:null,auto_id:null,je_majetek:false,sklad_kategorie_id:null}
        : vazbaNaSloupce(f.vazba)),
    };
    const {error} = isNew
      ? await sb.from("fin_cashflow_plan").insert(data)
      : await sb.from("fin_cashflow_plan").update(data).eq("id",polozka.id);
    setSaving(false);
    if(error){
      console.error("Uložení cashflow selhalo:",error,"\npayload:",data);
      alert("Položku se nepodařilo uložit:\n\n"+(error.message||"neznámá chyba")
        +(error.details?("\n\nDetail: "+error.details):"")
        +(error.hint?("\n\nTip: "+error.hint):""));
      return;
    }
    onSaved();
  };

  // ── Lokální designové tokeny (větší, vzdušnější varianty C / inp) ──────────────
  const inpL    = {...inp, fontSize:15, padding:"0 14px", height:48, borderRadius:10, boxSizing:"border-box", background:C.bg};
  const inpAmt  = {...inp, fontSize:24, fontWeight:800, padding:"0 56px 0 16px", height:62, borderRadius:14, boxSizing:"border-box", background:C.bg};
  const sekce   = {background:C.surface, border:`1px solid ${C.border}`, borderRadius:14, padding:16, marginBottom:14, boxShadow:"0 1px 3px rgba(0,0,0,.04)"};
  const sekceLbl= {fontSize:12, fontWeight:800, color:C.muted, letterSpacing:.6, textTransform:"uppercase", margin:"0 2px 12px"};
  // Barva celého okna podle typu transakce — výrazný signál (příjem zelená, výdej červená, převod modrá)
  const typAccent = typ==="prijem" ? C.green : typ==="vydej" ? C.red : C.accent;
  const typBg     = typ==="prijem" ? C.greenS : typ==="vydej" ? C.redS : C.accentS;
  const TYPY = lock
    ? [{v:"prijem",l:"Příjem",c:C.green},{v:"vydej",l:"Výdej",c:C.red}]
    : [{v:"prijem",l:"Příjem",c:C.green},{v:"vydej",l:"Výdej",c:C.red},{v:"prevod",l:"Převod",c:C.accent}];
  const tabBtn=(active,barva)=>({
    flex:1, height:46, borderRadius:10, cursor:"pointer", fontWeight:800, fontSize:13.5,
    letterSpacing:.4, textTransform:"uppercase", transition:"all .15s",
    background: active?barva:"transparent",
    color: active?"#fff":C.muted,
    border: active?"none":`1px solid ${C.borderL}`,
    boxShadow: active?`0 2px 6px ${barva}44`:"none",
  });
  const amountHint = typ==="prevod" ? "Kolik převést mezi účty"
    : typ==="vydej" ? "Zadej kladné číslo — uloží se jako výdaj (−)"
    : "Zadej kladné číslo — uloží se jako příjem (+)";

  return <Modal title={isNew?"Nová finanční položka":"Upravit položku"} onClose={onClose} width={470} bg={typBg} accent={typAccent}>
    {nacitam?<Spinner/>:<div>
      <style>{`
        .cf-amount::-webkit-outer-spin-button,.cf-amount::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}
        .cf-amount{-moz-appearance:textfield}
        @keyframes cfSlide{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      {/* 1) Segmentovaný přepínač typu transakce — hlavní navigace */}
      <div style={{display:"flex",gap:8,marginBottom:18,background:C.surface,padding:6,borderRadius:13,border:`1px solid ${C.border}`,boxShadow:"0 1px 3px rgba(0,0,0,.04)"}}>
        {TYPY.map(t=>(
          <button key={t.v} onClick={()=>setTyp(t.v)} style={tabBtn(typ===t.v,t.c)}>{t.l}</button>
        ))}
      </div>

      {/* 2) CO A KOLIK — částka jako dominantní prvek + název + datum */}
      <div style={sekce}>
        <div style={sekceLbl}>Co a kolik?</div>

        <div style={{marginBottom:16}}>
          <div style={{color:C.muted,fontSize:12.5,fontWeight:800,letterSpacing:.4,textTransform:"uppercase",marginBottom:7}}>Částka</div>
          <div style={{position:"relative"}}>
            <input className="cf-amount" style={inpAmt} type="number" inputMode="numeric" value={f.castka} onChange={set("castka")} placeholder="5 000" autoFocus={isNew}/>
            <span style={{position:"absolute",right:18,top:"50%",transform:"translateY(-50%)",fontSize:18,fontWeight:700,color:C.dim,pointerEvents:"none"}}>Kč</span>
          </div>
          <div style={{color:C.dim,fontSize:11.5,marginTop:7,lineHeight:1.4}}>{amountHint}</div>
        </div>

        <FL label="Název *" style={{marginBottom:16}}>
          <input style={inpL} value={f.nazev} onChange={set("nazev")} placeholder="např. Kapesné, Krmivo, Oprava…"/>
        </FL>

        <FL label="Kdy?">
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <select style={inpL} value={f.mesic} onChange={set("mesic")}>{MESICE.map((m,i)=><option key={i+1} value={i+1}>{m}</option>)}</select>
            <select style={inpL} value={f.rok} onChange={set("rok")}>{[2022,2023,2024,2025,2026,2027,2028].map(r=><option key={r} value={r}>{r}</option>)}</select>
          </div>
        </FL>
      </div>

      {/* 3) ODKUD A KAM — účty (popisky a placeholdery dle typu) */}
      <div style={sekce}>
        <div style={sekceLbl}>{jePrevod?"Odkud a kam?":"Účet"}</div>

        <FL label={jePrevod?"Z účtu *":"Účet *"} style={{marginBottom:jePrevod?14:0}}>
          <select style={inpL} value={f.ucet_id} onChange={set("ucet_id")}>
            <option value="">{jePrevod?"— vyberte zdrojový účet —":"— vyberte účet —"}</option>
            {(ucty||[]).map(u=><option key={u.id} value={u.id}>{u.nazev}{u.typ==="deti"?" · 👶 dětský":""}</option>)}
          </select>
          {!jePrevod&&ucetChybi&&(
            <div style={{marginTop:8,background:C.redS||"#fdecec",border:`1px solid ${C.red}`,borderRadius:10,padding:"9px 12px",fontSize:12,fontWeight:600,color:C.red}}>
              ⚠ Vyber účet, kterého se {typ==="vydej"?"výdaj":"příjem"} týká — jinak se položka nepromítne do predikce zůstatku ani do filtru účtu.
            </div>
          )}
        </FL>

        {jePrevod&&(
          <div style={{animation:"cfSlide .2s ease"}}>
            <FL label="Na účet *">
              <select style={inpL} value={f.prevod_ucet_id} onChange={set("prevod_ucet_id")}>
                <option value="">— vyberte cílový účet —</option>
                {(ucty||[]).filter(u=>String(u.id)!==String(f.ucet_id)).map(u=><option key={u.id} value={u.id}>{u.nazev}{u.typ==="deti"?" · 👶 dětský":""}</option>)}
              </select>
            </FL>
            {prevodNeplatny&&(
              <div style={{marginTop:10,background:C.redS||"#fdecec",border:`1px solid ${C.red}`,borderRadius:10,padding:"9px 12px",fontSize:12,fontWeight:600,color:C.red}}>
                {!f.ucet_id?"⚠ Vyber zdrojový účet (Z účtu), ze kterého se peníze odešlou."
                  :!f.prevod_ucet_id?"⚠ Vyber cílový účet (Na účet), kam peníze dorazí."
                  :"⚠ Zdrojový a cílový účet musí být různé."}
                {" "}Dokud to neplatí, převod nelze uložit.
              </div>
            )}
          </div>
        )}
      </div>

      {/* 4) ZAŘAZENÍ — kategorie + vazba (jen příjem / výdej) */}
      {!jePrevod&&(
        <div style={sekce}>
          <div style={sekceLbl}>Zařazení</div>

          <FL label="Kategorie" style={{marginBottom:14}}>
            <div style={{display:"flex",gap:8}}>
              <select style={{...inpL,flex:1,minWidth:0}} value={f.kategorie_id} onChange={set("kategorie_id")}>
                <option value="">— bez kategorie —</option>
                <optgroup label="Příjmy">{(kategorie||[]).filter(k=>k.typ==="prijem").map(k=><option key={k.id} value={k.id}>{k.emoji} {k.nazev}</option>)}</optgroup>
                <optgroup label="Výdaje">{(kategorie||[]).filter(k=>k.typ==="vydaj").map(k=><option key={k.id} value={k.id}>{k.emoji} {k.nazev}</option>)}</optgroup>
              </select>
              <button type="button" onClick={()=>setNovaKatOtevreno(o=>!o)} style={{...btnC(C.accent,true),padding:"0 14px",height:48,whiteSpace:"nowrap",borderRadius:10,fontSize:13,fontWeight:700}}>{novaKatOtevreno?"✕ Zavřít":"+ Nová"}</button>
            </div>
            {novaKatOtevreno&&(
              <div style={{marginTop:10,background:typBg,border:`1px solid ${C.border}`,borderRadius:10,padding:12,animation:"cfSlide .2s ease"}}>
                <div style={{fontSize:11.5,fontWeight:700,color:C.muted,marginBottom:8}}>Rychlé přidání kategorie — typ „{typ==="prijem"?"Příjem":"Výdaj"}"</div>
                <div style={{display:"flex",gap:8}}>
                  <input style={{...inpL,width:62,textAlign:"center",flex:"0 0 auto"}} value={novaKat.emoji} onChange={e=>setNovaKat(p=>({...p,emoji:e.target.value}))} placeholder="💰" maxLength={4}/>
                  <input style={{...inpL,flex:1,minWidth:0}} value={novaKat.nazev} onChange={e=>setNovaKat(p=>({...p,nazev:e.target.value}))} placeholder="Název kategorie" onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();pridejKategorii();}}}/>
                  <button type="button" onClick={pridejKategorii} disabled={ukladamKat||!novaKat.nazev.trim()} style={{...btnC(),padding:"0 16px",height:48,whiteSpace:"nowrap",borderRadius:10,fontSize:13}}>{ukladamKat?"…":"Přidat"}</button>
                </div>
                <div style={{fontSize:11,color:C.dim,marginTop:7}}>Po přidání se kategorie rovnou vybere. Barvu/přesné nastavení doladíš v editoru kategorií.</div>
              </div>
            )}
          </FL>

          {lockInfo ? (
            <FL label="Vazba na entitu" hint="Napevno — položka patří této entitě">
              <select style={{...inpL,background:C.bg,cursor:"not-allowed",color:C.muted}} value={f.vazba} disabled>
                <option value={f.vazba}>{lockInfo.emoji} {lockInfo.label}</option>
              </select>
            </FL>
          ) : lock?.majetek ? (
            <FL label="Kategorie majetku / skladu" hint="Investice nebo nákup zásob">
              <select style={inpL} value={f.vazba} onChange={set("vazba")}>
                <option value="sklad:obecne">📦 Majetek / sklad (obecně)</option>
                {(skladKat||[]).map(k=><option key={k.id} value={"sklad:"+k.id}>{k.emoji} {k.nazev}</option>)}
              </select>
            </FL>
          ) : (
            <FL label="Vazba na entitu">
              <select style={inpL} value={f.vazba} onChange={set("vazba")}>
                <option value="">— bez vazby (volitelné) —</option>
                <optgroup label="👤 Člen rodiny">{(deti||[]).map(d=><option key={d.id} value={"dite:"+d.id}>{d.emoji||"👤"} {d.jmeno}</option>)}</optgroup>
                <optgroup label="🐾 Zvíře">{(zvirata||[]).map(z=><option key={z.id} value={"zvire:"+z.id}>{z.emoji||"🐾"} {z.jmeno}</option>)}</optgroup>
                <optgroup label="🔧 Dům a opravy">{(opravy||[]).map(o=><option key={o.id} value={"oprava:"+o.id}>{o.nazev}</option>)}</optgroup>
                <optgroup label="🚗 Auta">{(auta||[]).map(a=><option key={a.id} value={"auto:"+a.id}>🚗 {a.nazev}{a.spz?` · ${a.spz}`:""}</option>)}</optgroup>
                <optgroup label="📦 Sklad / Majetek">
                  <option value="sklad:obecne">Majetek / sklad (obecně)</option>
                  {(skladKat||[]).map(k=><option key={k.id} value={"sklad:"+k.id}>{k.emoji} {k.nazev}</option>)}
                </optgroup>
              </select>
            </FL>
          )}
        </div>
      )}

      {/* 5) OPAKOVÁNÍ A DETAILY — volitelné */}
      <div style={sekce}>
        <div style={sekceLbl}>Opakování a detaily <span style={{color:C.dim,fontWeight:600,textTransform:"none",letterSpacing:0}}>(volitelné)</span></div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
          <FL label="Opakování">
            <select style={inpL} value={f.opakovani} onChange={set("opakovani")}>
              <option value="jednorazove">Jednorázové</option>
              <option value="mesicni">Měsíční</option>
              <option value="rocni">Roční</option>
            </select>
          </FL>
          <FL label="Platí do">
            <input style={inpL} type="month" value={f.datum_do?f.datum_do.slice(0,7):""} onChange={e=>setF(p=>({...p,datum_do:e.target.value?e.target.value+"-01":""}))}/>
          </FL>
        </div>
        <FL label="Poznámka">
          <input style={inpL} value={f.poznamka} onChange={set("poznamka")} placeholder="Volitelné…"/>
        </FL>
      </div>

      {/* Akce */}
      <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:4}}>
        <button onClick={onClose} style={{...btnC(C.muted,true),padding:"12px 22px",fontSize:14,borderRadius:10}}>Zrušit</button>
        <button onClick={uloz} disabled={saving||!f.nazev.trim()||f.castka===""||ucetChybi||prevodNeplatny} style={{...btnC(),padding:"12px 24px",fontSize:14,borderRadius:10}}>{saving?"Ukládám…":"Uložit položku"}</button>
      </div>
    </div>}
  </Modal>;
}

// Sdílený panel "💰 Finance" pro detail entity — výpis napojených cashflow položek + rychlé přidání.
// Použití: <EntityFinancePanel sloupec="dite_id" id={x}/> nebo <EntityFinancePanel majetek/>
function EntityFinancePanel({sloupec,id,majetek,lock,nadpis,novaDefault}){
  const dnes=new Date();
  const query = majetek
    ? ()=>sb.from("fin_cashflow_plan").select("*").eq("je_majetek",true).order("rok",{ascending:false}).order("mesic",{ascending:false})
    : ()=>sb.from("fin_cashflow_plan").select("*").eq(sloupec,id).order("rok",{ascending:false}).order("mesic",{ascending:false});
  const {data:plan,loading,reload}=useData(query,[sloupec,id,majetek]);
  const {data:kategorie}=useData(()=>sb.from("fin_kategorie").select("*").order("poradi"));
  const [modal,setModal]=useState(null); // null | "new" | položka
  const smaz=async(p)=>{if(!confirm("Smazat položku?"))return;await sb.from("fin_cashflow_plan").delete().eq("id",p.id);reload();};

  if(loading) return <Spinner/>;
  const polozky=plan||[];
  const prijmy=polozky.filter(p=>+p.castka>0).reduce((a,p)=>a+ +p.castka,0);
  const vydaje=polozky.filter(p=>+p.castka<0).reduce((a,p)=>a+Math.abs(+p.castka),0);

  return <div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:14}}>
      {[{l:"Příjmy",v:prijmy,c:C.green,sign:"+"},{l:"Výdaje",v:vydaje,c:C.red,sign:"-"},{l:"Bilance",v:prijmy-vydaje,c:prijmy>=vydaje?C.green:C.red,sign:(prijmy-vydaje)>=0?"+":""}].map(k=>
        <div key={k.l} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 12px",borderTop:`3px solid ${k.c}`}}>
          <div style={{fontSize:10,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:.5,marginBottom:3}}>{k.l}</div>
          <div style={{fontSize:14,fontWeight:800,color:k.c}}>{k.sign}{Math.abs(k.v).toLocaleString("cs")} Kč</div>
        </div>)}
    </div>

    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
      <div style={{fontSize:12,fontWeight:700,color:C.muted}}>{nadpis||"Cashflow položky"} ({polozky.length})</div>
      <button onClick={()=>setModal("new")} style={{...btnC(),padding:"6px 12px",fontSize:12}}>+ Přidat finanční položku</button>
    </div>

    {polozky.length===0
      ? <div style={{padding:"24px 0",textAlign:"center",color:C.dim,fontSize:13}}>Zatím žádné napojené položky</div>
      : <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,overflow:"hidden"}}>
        {polozky.map((p,i)=>{
          const kat=(kategorie||[]).find(k=>k.id===p.kategorie_id);
          return <div key={p.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderBottom:i<polozky.length-1?`1px solid ${C.border}`:"none"}}>
            <span style={{fontSize:17}}>{kat?.emoji||"💰"}</span>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontWeight:600,fontSize:13,color:C.text}}>{p.nazev}</div>
              <div style={{fontSize:11,color:C.muted}}>{MESICE[p.mesic-1]} {p.rok}{kat?` · ${kat.nazev}`:""}{p.opakovani&&p.opakovani!=="jednorazove"?` · 🔄 ${p.opakovani==="mesicni"?"měsíčně":"ročně"}`:""}</div>
            </div>
            <div style={{fontWeight:800,fontSize:14,color:+p.castka>0?C.green:C.red,whiteSpace:"nowrap"}}>{+p.castka>0?"+":""}{(+p.castka).toLocaleString("cs")} Kč</div>
            <button onClick={()=>setModal(p)} style={{...btnC(C.accent,true),padding:"3px 8px",fontSize:11}}>✏</button>
            <button onClick={()=>smaz(p)} style={{...btnC(C.red,true),padding:"3px 8px",fontSize:11}}>🗑</button>
          </div>;
        })}
      </div>}

    {modal&&<CashflowModal
      polozka={modal==="new"?null:modal}
      lock={lock}
      defaultRok={dnes.getFullYear()} defaultMesic={dnes.getMonth()+1}
      defaultNazev={modal==="new"?novaDefault?.nazev:undefined}
      defaultCastka={modal==="new"?novaDefault?.castka:undefined}
      onClose={()=>setModal(null)}
      onSaved={()=>{setModal(null);reload();}}
    />}
  </div>;
}

// ══════════════════════════════════════════════════════════════════════════════
// ZVÍŘATA
// ══════════════════════════════════════════════════════════════════════════════
const ZVIRE_TYPY=["Pes","Kočka","Králík","Morče","Křeček","Papoušek","Ryby","Had","Želva","Jiné"];
const ZVIRE_EMOJIS=["🐶","🐱","🐰","🐹","🐭","🐼","🐨","🐯","🦁","🐮","🐷","🐸","🐙","🦊","🐺","🐻","🦝","🦨","🦡","🦦","🦥","🦔","🐿","🐇","🦜","🐦","🦅","🦆","🦉","🦚","🦩","🦢","🕊","🐓","🐠","🐟","🐡","🦈","🐬","🐳","🦭","🐊","🐢","🦎","🐍","🦕","🐛","🦋","🐝","🐞","🦗","🦟","🕷","🐌","🐜"];
const ZVIRE_BARVY=["#7a5c3a","#e05555","#2ecc8a","#e8a030","#9b7ef5","#38b2e8","#4f7ef0","#f5a623","#2ed8c8","#c87000"];

function ZvireModal({zvire,onClose,onSaved}){
  const isNew=!zvire;
  const [f,setF]=useState({
    jmeno:zvire?.jmeno||"",
    typ:zvire?.typ||"Pes",
    narozen:zvire?.narozen||"",
    poznamka:zvire?.poznamka||"",
    barva:zvire?.barva||ZVIRE_BARVY[0],
    emoji:zvire?.emoji||ZVIRE_EMOJIS[0],
  });
  const [saving,setSaving]=useState(false);
  const set=k=>e=>setF(p=>({...p,[k]:e.target.value}));
  const uloz=async()=>{
    if(!f.jmeno.trim())return;
    setSaving(true);
    if(isNew)await sb.from("zvirata").insert(f);
    else await sb.from("zvirata").update(f).eq("id",zvire.id);
    setSaving(false);onSaved();
  };
  return <Modal title={isNew?"Přidat zvíře":"Upravit zvíře"} onClose={onClose} width={460}>
    <Field label="Jméno *"><input style={inp} value={f.jmeno} onChange={set("jmeno")} autoFocus onKeyDown={e=>e.key==="Enter"&&uloz()} placeholder="Např. Rex"/></Field>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
      <Field label="Typ zvířete">
        <select style={inp} value={f.typ} onChange={set("typ")}>
          {ZVIRE_TYPY.map(t=><option key={t} value={t}>{t}</option>)}
        </select>
      </Field>
      <Field label="Datum narození"><input style={inp} type="date" value={f.narozen} onChange={set("narozen")}/></Field>
    </div>
    <Field label="Emoji"><div style={{display:"flex",gap:4,flexWrap:"wrap",background:C.bg,borderRadius:10,padding:8}}>{ZVIRE_EMOJIS.map(e=><span key={e} onClick={()=>setF(p=>({...p,emoji:e}))} title={e} style={{fontSize:28,cursor:"pointer",padding:"5px 6px",borderRadius:9,background:f.emoji===e?C.accentS:"transparent",border:f.emoji===e?`2px solid ${C.accent}`:"2px solid transparent",transition:"all .12s",lineHeight:1}}>{e}</span>)}</div></Field>
    <Field label="Barva"><div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{ZVIRE_BARVY.map(b=><div key={b} onClick={()=>setF(p=>({...p,barva:b}))} style={{width:26,height:26,borderRadius:"50%",background:b,cursor:"pointer",border:f.barva===b?"3px solid #1a1d2e":"3px solid transparent"}}/>)}</div></Field>
    <Field label="Poznámka"><textarea style={{...inp,resize:"vertical",minHeight:60}} value={f.poznamka} onChange={set("poznamka")} placeholder="Plemeno, alergie, veterinář…"/></Field>
    <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:6}}>
      <button onClick={onClose} style={btnC(C.muted,true)}>Zrušit</button>
      <button onClick={uloz} disabled={saving||!f.jmeno.trim()} style={btnC()}>{saving?"Ukládám…":"Uložit"}</button>
    </div>
  </Modal>;
}

function ZvireDetail({zvire,onEdit,onClose}){
  const [tab,setTab]=useState("info");
  const tabStyle=(t)=>({
    padding:"8px 20px",fontWeight:700,fontSize:13,cursor:"pointer",border:"none",background:"none",
    borderBottom:`2px solid ${tab===t?C.accent:"transparent"}`,
    color:tab===t?C.accent:C.muted,transition:"all .15s",
  });
  const hneda="#7a5c3a";
  return <Modal title={`${zvire.emoji||"🐾"} ${zvire.jmeno}`} onClose={onClose} width={460}>
    <div style={{display:"flex",borderBottom:`1px solid ${C.border}`,marginBottom:20,marginTop:-8}}>
      <button style={tabStyle("info")} onClick={()=>setTab("info")}>📋 Info</button>
      <button style={tabStyle("finance")} onClick={()=>setTab("finance")}>💰 Finance</button>
      <button style={tabStyle("dokumenty")} onClick={()=>setTab("dokumenty")}>📁 Dokumenty</button>
    </div>

    {tab==="info"&&<div>
      <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:20,padding:16,background:C.bg,borderRadius:12}}>
        <div style={{width:56,height:56,borderRadius:14,background:`${zvire.barva||hneda}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:30}}>{zvire.emoji||"🐾"}</div>
        <div>
          <div style={{fontWeight:800,fontSize:18,color:C.text}}>{zvire.jmeno}</div>
          <div style={{color:C.muted,fontSize:13,marginTop:2}}>
            {vekText(zvire.narozen)}{zvire.narozen&&` · nar. ${new Date(zvire.narozen).toLocaleDateString("cs-CZ")}`}
          </div>
          <Tag color={hneda}>{zvire.typ||"Zvíře"}</Tag>
        </div>
      </div>
      {zvire.poznamka&&<div style={{color:C.dim,fontSize:13,fontStyle:"italic",padding:"10px 14px",background:C.bg,borderRadius:10,marginBottom:12}}>{zvire.poznamka}</div>}
      <div style={{display:"flex",justifyContent:"flex-end"}}>
        <button onClick={onEdit} style={btnC()}>✎ Upravit</button>
      </div>
    </div>}

    {tab==="finance"&&<EntityFinancePanel sloupec="zvire_id" id={zvire.id} lock={{zvire_id:zvire.id}} nadpis={`Finance — ${zvire.jmeno}`}/>}
    {tab==="dokumenty"&&<EntityDokumentyPanel lockVazba={`zvire:${zvire.id}`} nadpis={`Dokumenty — ${zvire.jmeno}`}/>}
  </Modal>;
}

function ZvirataTab(){
  const {data:zvirata,loading,reload}=useData(()=>sb.from("zvirata").select("*").order("jmeno"));
  const [modal,setModal]=useState(null);
  const smaz=async(z)=>{if(!confirm(`Smazat ${z.jmeno}?`))return;await sb.from("zvirata").delete().eq("id",z.id);reload();};
  if(loading)return <Spinner/>;

  // Seskup podle typu
  const skupiny=[...new Set((zvirata||[]).map(z=>z.typ||"Jiné"))].sort();

  const ZvireKarta=({z})=>(
    <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,padding:18,borderLeft:`4px solid ${z.barva||"#7a5c3a"}`,cursor:"pointer"}}
      onClick={()=>setModal({detail:z})}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
        <div style={{width:44,height:44,borderRadius:11,background:`${z.barva||"#7a5c3a"}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>{z.emoji||"🐾"}</div>
        <div>
          <div style={{color:C.text,fontWeight:800,fontSize:16}}>{z.jmeno}</div>
          <div style={{color:C.muted,fontSize:12}}>{z.typ}{z.narozen&&` · ${vekText(z.narozen)}`}{z.narozen&&` · nar. ${new Date(z.narozen).toLocaleDateString("cs-CZ")}`}</div>
        </div>
      </div>
      {z.poznamka&&<div style={{color:C.dim,fontSize:12,marginBottom:10,fontStyle:"italic"}}>{z.poznamka}</div>}
      <div style={{display:"flex",gap:6}} onClick={e=>e.stopPropagation()}>
        <button onClick={()=>setModal(z)} style={{...btnC(C.muted,true),padding:"4px 10px",fontSize:12}}>✎ Upravit</button>
        <button onClick={()=>smaz(z)} style={{...btnC(C.red,true),padding:"4px 10px",fontSize:12}}>✕</button>
      </div>
    </div>
  );

  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
      <div style={{color:C.text,fontWeight:800,fontSize:17}}>🐾 Zvířata <span style={{color:C.muted,fontWeight:400,fontSize:14}}>({(zvirata||[]).length})</span></div>
      <button onClick={()=>setModal("new")} style={btnC()}>+ Přidat zvíře</button>
    </div>

    {(zvirata||[]).length===0&&<EmptyState emoji="🐾" text="Zatím žádná zvířata" action="Přidat první zvíře" onAction={()=>setModal("new")}/>}

    {skupiny.map(typ=>{
      const skupina=(zvirata||[]).filter(z=>(z.typ||"Jiné")===typ);
      return <div key={typ} style={{marginBottom:24}}>
        <div style={{color:C.muted,fontSize:11,fontWeight:700,letterSpacing:.7,textTransform:"uppercase",marginBottom:12}}>{typ}</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:14}}>
          {skupina.map(z=><ZvireKarta key={z.id} z={z}/>)}
        </div>
      </div>;
    })}

    {modal==="new"&&<ZvireModal onClose={()=>setModal(null)} onSaved={()=>{setModal(null);reload();}}/>}
    {modal&&modal!=="new"&&!modal.detail&&<ZvireModal zvire={modal} onClose={()=>setModal(null)} onSaved={()=>{setModal(null);reload();}}/>}
    {modal?.detail&&<ZvireDetail zvire={modal.detail} onEdit={()=>setModal(modal.detail)} onClose={()=>setModal(null)}/>}
  </div>;
}

// ══════════════════════════════════════════════════════════════════════════════
// RODINA
// ══════════════════════════════════════════════════════════════════════════════
function ClenModal({clen,onClose,onSaved}){
  const isNew=!clen;
  const [f,setF]=useState({
    jmeno:clen?.jmeno||"",
    oficialni_jmeno:clen?.oficialni_jmeno||"",
    prijmeni:clen?.prijmeni||"",
    typ:clen?.typ||"dite",
    narozen:clen?.narozen||"",
    pohlavi:clen?.pohlavi||"chlapec",
    rc:clen?.rc||"",
    email:clen?.email||"",
    telefon:clen?.telefon||"",
    skola:clen?.skola||"",
    trida:clen?.trida||"",
    krouzky:clen?.krouzky||"",
    poznamka:clen?.poznamka||"",
    barva:clen?.barva||DITE_BARVY[0],
    emoji:clen?.emoji||DITE_EMOJIS[0],
  });
  const [saving,setSaving]=useState(false);
  const set=k=>e=>setF(p=>({...p,[k]:e.target.value}));
  const uloz=async()=>{
    if(!f.jmeno.trim())return;
    setSaving(true);
    if(isNew)await sb.from("deti").insert(f);
    else await sb.from("deti").update(f).eq("id",clen.id);
    setSaving(false);onSaved();
  };
  return <Modal title={isNew?"Přidat člena rodiny":"Upravit člena rodiny"} onClose={onClose} width={500}>
    <Field label="Typ osoby">
      <div style={{display:"flex",gap:8}}>
        {[{v:"dite",l:"👶 Dítě"},{v:"dospely",l:"🧑 Dospělý"}].map(o=>(
          <button key={o.v} onClick={()=>setF(p=>({...p,typ:o.v}))}
            style={{...btnC(C.accent,f.typ!==o.v),flex:1,fontSize:13}}>{o.l}</button>
        ))}
      </div>
    </Field>
    <Field label="Jméno / přezdívka" hint="Hlavní jméno používané v celé aplikaci"><input style={inp} value={f.jmeno} onChange={set("jmeno")} autoFocus onKeyDown={e=>e.key==="Enter"&&uloz()} placeholder="např. Honzík"/></Field>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
      <Field label="Úřední jméno" hint="Pro doklady — volitelné"><input style={inp} value={f.oficialni_jmeno} onChange={set("oficialni_jmeno")} placeholder="Jan"/></Field>
      <Field label="Příjmení"><input style={inp} value={f.prijmeni} onChange={set("prijmeni")} placeholder="Novák"/></Field>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
      <Field label="Datum narození"><input style={inp} type="date" value={f.narozen} onChange={set("narozen")}/></Field>
      <Field label="Pohlaví"><select style={inp} value={f.pohlavi} onChange={set("pohlavi")}><option value="chlapec">Chlapec / Muž</option><option value="divka">Dívka / Žena</option></select></Field>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
      <Field label="Rodné číslo"><input style={inp} value={f.rc} onChange={set("rc")} placeholder="000101/0000"/></Field>
      <Field label="Telefon"><input style={inp} value={f.telefon} onChange={set("telefon")} placeholder="+420 …"/></Field>
    </div>
    <Field label="E-mail"><input style={inp} type="email" value={f.email} onChange={set("email")} placeholder="jmeno@email.cz"/></Field>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
      <Field label="Škola / školka"><input style={inp} value={f.skola} onChange={set("skola")} placeholder="ZŠ Hoštice"/></Field>
      <Field label="Třída / skupina"><input style={inp} value={f.trida} onChange={set("trida")} placeholder="3.B"/></Field>
    </div>
    <Field label="Kroužky" hint="Odděl čárkou: fotbal, klavír, angličtina"><input style={inp} value={f.krouzky} onChange={set("krouzky")} placeholder="Fotbal, klavír…"/></Field>
    <Field label="Emoji"><div style={{display:"flex",gap:4,flexWrap:"wrap",background:C.bg,borderRadius:10,padding:8}}>{DITE_EMOJIS.map(e=><span key={e} onClick={()=>setF(p=>({...p,emoji:e}))} title={e} style={{fontSize:28,cursor:"pointer",padding:"5px 6px",borderRadius:9,background:f.emoji===e?C.accentS:"transparent",border:f.emoji===e?`2px solid ${C.accent}`:"2px solid transparent",transition:"all .12s",lineHeight:1}}>{e}</span>)}</div></Field>
    <Field label="Barva"><div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{DITE_BARVY.map(b=><div key={b} onClick={()=>setF(p=>({...p,barva:b}))} style={{width:26,height:26,borderRadius:"50%",background:b,cursor:"pointer",border:f.barva===b?"3px solid #1a1d2e":"3px solid transparent"}}/>)}</div></Field>
    <Field label="Poznámka"><textarea style={{...inp,resize:"vertical",minHeight:60}} value={f.poznamka} onChange={set("poznamka")}/></Field>
    <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:6}}>
      <button onClick={onClose} style={btnC(C.muted,true)}>Zrušit</button>
      <button onClick={uloz} disabled={saving} style={btnC()}>{saving?"Ukládám…":"Uložit"}</button>
    </div>
  </Modal>;
}

function ClenDetail({clen,onEdit,onClose}){
  const [tab,setTab]=useState("info");
  const tabStyle=(t)=>({
    padding:"8px 20px",fontWeight:700,fontSize:13,cursor:"pointer",border:"none",background:"none",
    borderBottom:`2px solid ${tab===t?C.accent:"transparent"}`,
    color:tab===t?C.accent:C.muted,transition:"all .15s",
  });
  const krouzky=(clen.krouzky||"").split(",").map(k=>k.trim()).filter(Boolean);
  const celeJmeno=[clen.oficialni_jmeno,clen.prijmeni].filter(Boolean).join(" ");
  return <Modal title={`${clen.emoji||"👤"} ${clen.jmeno}`} onClose={onClose} width={520}>
    {/* Tabs */}
    <div style={{display:"flex",borderBottom:`1px solid ${C.border}`,marginBottom:20,marginTop:-8}}>
      <button style={tabStyle("info")} onClick={()=>setTab("info")}>📋 Info</button>
      <button style={tabStyle("finance")} onClick={()=>setTab("finance")}>💰 Finance</button>
      <button style={tabStyle("dokumenty")} onClick={()=>setTab("dokumenty")}>📁 Dokumenty</button>
    </div>

    {tab==="info"&&<div>
      {/* Hlavička */}
      <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:20,padding:16,background:C.bg,borderRadius:12}}>
        <div style={{width:56,height:56,borderRadius:14,background:`${clen.barva||C.accent}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:30}}>{clen.emoji||"👤"}</div>
        <div>
          <div style={{fontWeight:800,fontSize:18,color:C.text}}>{clen.jmeno}</div>
          {celeJmeno&&<div style={{color:C.text,fontSize:13,fontWeight:600,marginTop:1}}>🪪 {celeJmeno}</div>}
          <div style={{color:C.muted,fontSize:13,marginTop:2}}>
            {vekText(clen.narozen)}{clen.narozen&&` · nar. ${new Date(clen.narozen).toLocaleDateString("cs-CZ")}`}
          </div>
          <Tag color={clen.typ==="dite"?C.blue:C.purple}>{clen.typ==="dite"?"Dítě":"Dospělý"}</Tag>
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        {clen.rc&&<div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 14px"}}>
          <div style={{color:C.muted,fontSize:11,fontWeight:700,letterSpacing:.7,textTransform:"uppercase",marginBottom:4}}>Rodné číslo</div>
          <div style={{color:C.text,fontWeight:700,fontSize:14}}>{clen.rc}</div>
        </div>}
        {clen.telefon&&<div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 14px"}}>
          <div style={{color:C.muted,fontSize:11,fontWeight:700,letterSpacing:.7,textTransform:"uppercase",marginBottom:4}}>Telefon</div>
          <div style={{color:C.text,fontWeight:700,fontSize:14}}>{clen.telefon}</div>
        </div>}
        {clen.email&&<div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 14px",gridColumn:"1/-1"}}>
          <div style={{color:C.muted,fontSize:11,fontWeight:700,letterSpacing:.7,textTransform:"uppercase",marginBottom:4}}>E-mail</div>
          <div style={{color:C.accent,fontWeight:600,fontSize:14}}>{clen.email}</div>
        </div>}
        {(clen.skola||clen.trida)&&<div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 14px",gridColumn:"1/-1"}}>
          <div style={{color:C.muted,fontSize:11,fontWeight:700,letterSpacing:.7,textTransform:"uppercase",marginBottom:4}}>Škola</div>
          <div style={{color:C.text,fontWeight:700,fontSize:14}}>📚 {[clen.skola,clen.trida].filter(Boolean).join(" · ")}</div>
        </div>}
      </div>

      {krouzky.length>0&&<div style={{marginTop:12}}>
        <div style={{color:C.muted,fontSize:11,fontWeight:700,letterSpacing:.7,textTransform:"uppercase",marginBottom:8}}>Kroužky</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
          {krouzky.map((k,i)=><Tag key={i} color={C.green}>{k}</Tag>)}
        </div>
      </div>}

      {clen.poznamka&&<div style={{marginTop:12,color:C.dim,fontSize:13,fontStyle:"italic",padding:"10px 14px",background:C.bg,borderRadius:10}}>{clen.poznamka}</div>}

      <div style={{display:"flex",justifyContent:"flex-end",marginTop:20}}>
        <button onClick={onEdit} style={btnC()}>✎ Upravit</button>
      </div>
    </div>}

    {tab==="finance"&&<EntityFinancePanel sloupec="dite_id" id={clen.id} lock={{dite_id:clen.id}} nadpis={`Finance — ${clen.jmeno}`}/>}
    {tab==="dokumenty"&&<EntityDokumentyPanel lockVazba={`dite:${clen.id}`} nadpis={`Dokumenty — ${clen.jmeno}${celeJmeno?` (${celeJmeno})`:""}`}/>}
  </Modal>;
}

function DetiTab(){
  const {data:deti,loading,reload}=useData(()=>sb.from("deti").select("*").order("jmeno"));
  const [modal,setModal]=useState(null);   // null | "new" | clen objekt (edit) | {detail: clen}
  const smaz=async(d)=>{if(!confirm(`Smazat ${d.jmeno}?`))return;await sb.from("deti").delete().eq("id",d.id);reload();};
  if(loading)return <Spinner/>;

  const dospeli=(deti||[]).filter(d=>d.typ==="dospely");
  const deti2=(deti||[]).filter(d=>d.typ!=="dospely");

  const ClenKarta=({d})=>(
    <div key={d.id} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,padding:18,borderLeft:`4px solid ${d.barva||C.accent}`,cursor:"pointer"}}
      onClick={()=>setModal({detail:d})}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
        <div style={{width:44,height:44,borderRadius:11,background:`${d.barva||C.accent}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>{d.emoji||"👤"}</div>
        <div>
          <div style={{color:C.text,fontWeight:800,fontSize:16}}>{d.jmeno}</div>
          <div style={{color:C.muted,fontSize:12}}>{vekText(d.narozen)}{d.narozen&&` · nar. ${new Date(d.narozen).toLocaleDateString("cs-CZ")}`}</div>
        </div>
      </div>
      {(d.skola||d.trida)&&<div style={{color:C.muted,fontSize:12,marginBottom:6}}>📚 {[d.skola,d.trida].filter(Boolean).join(" · ")}</div>}
      {d.krouzky&&<div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:8}}>
        {d.krouzky.split(",").map(k=>k.trim()).filter(Boolean).map((k,i)=><Tag key={i} color={C.green}>{k}</Tag>)}
      </div>}
      {d.email&&<div style={{color:C.muted,fontSize:12,marginBottom:6}}>✉ {d.email}</div>}
      {d.telefon&&<div style={{color:C.muted,fontSize:12,marginBottom:6}}>📞 {d.telefon}</div>}
      {d.poznamka&&<div style={{color:C.dim,fontSize:12,marginBottom:10,fontStyle:"italic"}}>{d.poznamka}</div>}
      <div style={{display:"flex",gap:6}} onClick={e=>e.stopPropagation()}>
        <button onClick={()=>setModal(d)} style={{...btnC(C.muted,true),padding:"4px 10px",fontSize:12}}>✎ Upravit</button>
        <button onClick={()=>smaz(d)} style={{...btnC(C.red,true),padding:"4px 10px",fontSize:12}}>✕</button>
      </div>
    </div>
  );

  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
      <div style={{color:C.text,fontWeight:800,fontSize:17}}>👨‍👩‍👧‍👦 Rodina <span style={{color:C.muted,fontWeight:400,fontSize:14}}>({(deti||[]).length})</span></div>
      <button onClick={()=>setModal("new")} style={btnC()}>+ Přidat člena</button>
    </div>

    {(deti||[]).length===0&&<EmptyState emoji="👨‍👩‍👧‍👦" text="Zatím žádní členové rodiny" action="Přidat prvního člena" onAction={()=>setModal("new")}/>}

    {dospeli.length>0&&<>
      <div style={{color:C.muted,fontSize:11,fontWeight:700,letterSpacing:.7,textTransform:"uppercase",marginBottom:12}}>Dospělí</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:14,marginBottom:24}}>
        {dospeli.map(d=><ClenKarta key={d.id} d={d}/>)}
      </div>
    </>}

    {deti2.length>0&&<>
      <div style={{color:C.muted,fontSize:11,fontWeight:700,letterSpacing:.7,textTransform:"uppercase",marginBottom:12}}>Děti</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:14}}>
        {deti2.map(d=><ClenKarta key={d.id} d={d}/>)}
      </div>
    </>}

    {modal==="new"&&<ClenModal onClose={()=>setModal(null)} onSaved={()=>{setModal(null);reload();}}/>}
    {modal&&modal!=="new"&&!modal.detail&&<ClenModal clen={modal} onClose={()=>setModal(null)} onSaved={()=>{setModal(null);reload();}}/>}
    {modal?.detail&&<ClenDetail clen={modal.detail} onEdit={()=>setModal(modal.detail)} onClose={()=>setModal(null)}/>}
  </div>;
}

// ══════════════════════════════════════════════════════════════════════════════
// OBLEČENÍ
// ══════════════════════════════════════════════════════════════════════════════
function KontejnerModalObl({velikostId,velikosti,kontejner,onClose,onSaved}){
  const isNew=!kontejner;
  const [f,setF]=useState({nazev:kontejner?.nazev||"",umisteni:kontejner?.umisteni||"",typ:kontejner?.typ||"box",velikost_id:kontejner?.velikost_id||velikostId||""});
  const [saving,setSaving]=useState(false);const set=k=>e=>setF(p=>({...p,[k]:e.target.value}));
  const uloz=async()=>{if(!f.nazev.trim()||!f.velikost_id)return;setSaving(true);if(isNew)await sb.from("vel_kontejnery").insert({...f,velikost_id:f.velikost_id});else await sb.from("vel_kontejnery").update({nazev:f.nazev,umisteni:f.umisteni,typ:f.typ}).eq("id",kontejner.id);setSaving(false);onSaved();};
  return <Modal title={isNew?"Nový kontejner":"Upravit kontejner"} onClose={onClose} width={380}>
    {isNew&&<Field label="Velikost">{velikosti?.length>0?<select style={inp} value={f.velikost_id} onChange={set("velikost_id")}><option value="">— vyber velikost —</option>{(velikosti||[]).map(v=><option key={v.id} value={v.id}>{v.id}</option>)}</select>:<input style={inp} value={f.velikost_id} onChange={set("velikost_id")} placeholder="Např. 86, 98…"/>}</Field>}
    <Field label="Název"><input style={inp} value={f.nazev} onChange={set("nazev")} autoFocus={!isNew} onKeyDown={e=>e.key==="Enter"&&uloz()}/></Field>
    <Field label="Umístění"><input style={inp} value={f.umisteni} onChange={set("umisteni")} placeholder="Sklep, půda…"/></Field>
    <Field label="Typ"><select style={inp} value={f.typ} onChange={set("typ")}>{Object.entries(STORAGE_TYPES).map(([k,v])=><option key={k} value={k}>{v.icon} {v.label}</option>)}</select></Field>
    <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:6}}><button onClick={onClose} style={btnC(C.muted,true)}>Zrušit</button><button onClick={uloz} disabled={saving||!f.velikost_id} style={btnC()}>{saving?"…":"Uložit"}</button></div>
  </Modal>;
}

function KontejnerKarta({kontejner,onEdited,onDeleted}){
  const {data:polozky,loading,reload}=useData(()=>sb.from("vel_polozky").select("*").eq("kontejner_id",kontejner.id).order("nazev"),[kontejner.id]);
  const [editM,setEditM]=useState(false);
  const [qn,setQn]=useState("");
  const st=STORAGE_TYPES[kontejner.typ]||STORAGE_TYPES.other;
  const total=(polozky||[]).reduce((a,p)=>a+p.pocet,0);
  const zmen=async(pol,d)=>{const n=pol.pocet+d;if(n<0)return;await sb.from("vel_polozky").update({pocet:n}).eq("id",pol.id);reload();};
  const smaz=async(pol)=>{if(!confirm(`Odebrat "${pol.nazev}"?`))return;await sb.from("vel_polozky").delete().eq("id",pol.id);reload();};
  const quickAdd=async()=>{const name=qn.trim();if(!name)return;const ex=(polozky||[]).find(p=>p.nazev===name);if(ex)await sb.from("vel_polozky").update({pocet:ex.pocet+1}).eq("id",ex.id);else await sb.from("vel_polozky").insert({kontejner_id:kontejner.id,nazev:name,pocet:1});setQn("");reload();};
  const smazK=async()=>{if(!confirm(`Smazat kontejner "${kontejner.nazev}" včetně obsahu?`))return;await sb.from("vel_kontejnery").delete().eq("id",kontejner.id);onDeleted();};
  return <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,overflow:"hidden",marginBottom:10}}>
    <div style={{display:"flex",alignItems:"center",gap:10,padding:"11px 16px",borderBottom:`1px solid ${C.border}`,background:C.bg}}>
      <div style={{flex:1,display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
        <span style={{fontWeight:700,fontSize:14,color:C.text}}>{kontejner.nazev}</span>
        <Tag color={st.color}>{st.icon} {st.label}</Tag>
        {kontejner.umisteni&&<span style={{color:C.muted,fontSize:12}}>{kontejner.umisteni}</span>}
        <span style={{color:C.dim,fontSize:12}}>{total} ks</span>
      </div>
      <button onClick={()=>setEditM(true)} style={{...btnC(C.muted,true),padding:"3px 9px",fontSize:12}}>✎</button>
      <button onClick={smazK} style={{...btnC(C.red,true),padding:"3px 9px",fontSize:12}}>✕</button>
    </div>
    <div style={{padding:"6px 16px 2px"}}>
      {loading&&<Spinner/>}
      {!loading&&(polozky||[]).length===0&&<div style={{color:C.dim,fontSize:12,textAlign:"center",padding:"10px 0"}}>Prázdný kontejner</div>}
      {(polozky||[]).map(pol=>(
        <div key={pol.id} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 6px",borderRadius:7}} onMouseEnter={e=>e.currentTarget.style.background=C.bg} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
          <span style={{flex:1,fontSize:13,color:C.text}}>{pol.nazev}</span>
          <button onClick={()=>zmen(pol,-1)} style={{...btnC(C.muted,true),padding:"2px 8px",fontSize:14,minWidth:26}}>−</button>
          <span style={{fontSize:14,fontWeight:700,minWidth:26,textAlign:"center",color:pol.pocet===0?C.dim:C.text}}>{pol.pocet}</span>
          <button onClick={()=>zmen(pol,1)} style={{...btnC(C.muted,true),padding:"2px 8px",fontSize:14,minWidth:26}}>+</button>
          <button onClick={()=>smaz(pol)} style={{background:"none",border:"none",cursor:"pointer",color:C.dim,fontSize:12,padding:"2px 5px"}} onMouseEnter={e=>e.currentTarget.style.color=C.red} onMouseLeave={e=>e.currentTarget.style.color=C.dim}>✕</button>
        </div>
      ))}
    </div>
    <div style={{display:"flex",gap:6,padding:"8px 16px 12px"}}>
      <input style={{...inp,fontSize:12,padding:"5px 10px"}} value={qn} onChange={e=>setQn(e.target.value)} placeholder="Rychlé přidání…" onKeyDown={e=>e.key==="Enter"&&quickAdd()}/>
      <button onClick={quickAdd} style={{...btnC(C.accent),padding:"5px 13px",fontSize:12,whiteSpace:"nowrap"}}>+ Přidat</button>
    </div>
    {editM&&<KontejnerModalObl kontejner={kontejner} onClose={()=>setEditM(false)} onSaved={()=>{setEditM(false);onEdited();}}/>}
  </div>;
}

function PridatOblModal({velikosti,defaultVelikost,onClose,onSaved}){
  const [velId,setVelId]=useState(defaultVelikost||velikosti[0]?.id||"");
  const [kontId,setKontId]=useState("");const [nazev,setNazev]=useState("");const [pocet,setPocet]=useState(1);
  const [konts,setKonts]=useState([]);const [saving,setSaving]=useState(false);
  useEffect(()=>{if(!velId)return;sb.from("vel_kontejnery").select("*").eq("velikost_id",velId).then(({data})=>{setKonts(data||[]);setKontId(data?.[0]?.id||"");});},[velId]);
  const chips=nazev?QUICK_ITEMS.filter(i=>i.toLowerCase().includes(nazev.toLowerCase())):QUICK_ITEMS;
  const uloz=async()=>{if(!nazev.trim()||!kontId)return;setSaving(true);const{data:ex}=await sb.from("vel_polozky").select("id,pocet").eq("kontejner_id",kontId).eq("nazev",nazev).single();if(ex)await sb.from("vel_polozky").update({pocet:ex.pocet+pocet}).eq("id",ex.id);else await sb.from("vel_polozky").insert({kontejner_id:kontId,nazev:nazev.trim(),pocet});setSaving(false);onSaved();};
  return <Modal title="Přidat oblečení" onClose={onClose}>
    <Field label="Název"><input style={inp} value={nazev} onChange={e=>setNazev(e.target.value)} autoFocus/><div style={{display:"flex",flexWrap:"wrap",gap:5,marginTop:8}}>{chips.slice(0,12).map(i=><span key={i} onClick={()=>setNazev(i)} style={{background:nazev===i?C.accent:C.accentS,color:nazev===i?"#fff":C.accent,padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:700,cursor:"pointer"}}>{i}</span>)}</div></Field>
    <Field label="Počet"><div style={{display:"flex",alignItems:"center",gap:8}}><button onClick={()=>setPocet(Math.max(1,pocet-1))} style={{...btnC(C.muted,true),padding:"4px 10px"}}>−</button><input type="number" value={pocet} onChange={e=>setPocet(Math.max(1,+e.target.value))} style={{...inp,width:70,textAlign:"center",fontSize:16,fontWeight:700}}/><button onClick={()=>setPocet(pocet+1)} style={{...btnC(C.muted,true),padding:"4px 10px"}}>+</button></div></Field>
    <Field label="Velikost"><select style={inp} value={velId} onChange={e=>setVelId(e.target.value)}>{velikosti.map(v=><option key={v.id} value={v.id}>{v.id}</option>)}</select></Field>
    <Field label="Kontejner"><select style={inp} value={kontId} onChange={e=>setKontId(e.target.value)}>{konts.length===0?<option value="">— Nejdřív přidej kontejner —</option>:konts.map(c=><option key={c.id} value={c.id}>{c.nazev}{c.umisteni?` · ${c.umisteni}`:""}</option>)}</select></Field>
    <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:6}}><button onClick={onClose} style={btnC(C.muted,true)}>Zrušit</button><button onClick={uloz} disabled={saving||!kontId||!nazev.trim()} style={btnC()}>{saving?"…":"Přidat"}</button></div>
  </Modal>;
}

function VybratOblModal({velikosti,defaultVelikost,onClose,onSaved}){
  const [velId,setVelId]=useState(defaultVelikost||velikosti[0]?.id||"");
  const [kontId,setKontId]=useState("");const [polId,setPolId]=useState("");const [pocet,setPocet]=useState(1);
  const [konts,setKonts]=useState([]);const [pols,setPols]=useState([]);const [saving,setSaving]=useState(false);
  useEffect(()=>{if(!velId)return;sb.from("vel_kontejnery").select("*").eq("velikost_id",velId).then(({data})=>{setKonts(data||[]);setKontId(data?.[0]?.id||"");setPols([]);setPolId("");});},[velId]);
  useEffect(()=>{if(!kontId)return;sb.from("vel_polozky").select("*").eq("kontejner_id",kontId).gt("pocet",0).then(({data})=>{setPols(data||[]);setPolId(data?.[0]?.id||"");setPocet(1);});},[kontId]);
  const selPol=pols.find(p=>p.id===polId);const max=selPol?.pocet??0;
  const odeber=async()=>{if(!polId||pocet<1)return;setSaving(true);await sb.from("vel_polozky").update({pocet:max-pocet}).eq("id",polId);setSaving(false);onSaved();};
  return <Modal title="Vybrat oblečení" onClose={onClose}>
    <Field label="Velikost"><select style={inp} value={velId} onChange={e=>setVelId(e.target.value)}>{velikosti.map(v=><option key={v.id} value={v.id}>{v.id}</option>)}</select></Field>
    <Field label="Kontejner"><select style={inp} value={kontId} onChange={e=>setKontId(e.target.value)}>{konts.length===0?<option>— Žádné —</option>:konts.map(c=><option key={c.id} value={c.id}>{c.nazev}{c.umisteni?` · ${c.umisteni}`:""}</option>)}</select></Field>
    <Field label="Položka"><select style={inp} value={polId} onChange={e=>{setPolId(e.target.value);setPocet(1);}}>{pols.length===0?<option>— Prázdný —</option>:pols.map(p=><option key={p.id} value={p.id}>{p.nazev} ({p.pocet} ks)</option>)}</select></Field>
    {selPol&&<Field label={`Počet (max ${max} ks)`}><div style={{display:"flex",alignItems:"center",gap:8}}><button onClick={()=>setPocet(Math.max(1,pocet-1))} style={{...btnC(C.muted,true),padding:"4px 10px"}}>−</button><input type="number" value={pocet} onChange={e=>setPocet(Math.min(max,Math.max(1,+e.target.value)))} style={{...inp,width:70,textAlign:"center",fontSize:16,fontWeight:700}}/><button onClick={()=>setPocet(Math.min(max,pocet+1))} style={{...btnC(C.muted,true),padding:"4px 10px"}}>+</button></div></Field>}
    <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:6}}><button onClick={onClose} style={btnC(C.muted,true)}>Zrušit</button><button onClick={odeber} disabled={saving||!polId||pocet<1} style={btnC(C.red)}>{saving?"…":"Odebrat"}</button></div>
  </Modal>;
}

function EditableCount({pocet,onSave}){
  const [val,setVal]=useState(String(pocet));
  const [editing,setEditing]=useState(false);
  useEffect(()=>{if(!editing)setVal(String(pocet));},[pocet,editing]);
  const commit=async()=>{
    const n=Math.max(0,parseInt(val)||0);
    setEditing(false);
    if(n!==pocet)await onSave(n);
  };
  return <input
    type="number" min="0"
    value={val}
    onChange={e=>{setEditing(true);setVal(e.target.value);}}
    onFocus={e=>{setEditing(true);e.target.select();}}
    onBlur={commit}
    onKeyDown={e=>{if(e.key==="Enter"){e.target.blur();}if(e.key==="Escape"){setEditing(false);setVal(String(pocet));e.target.blur();}}}
    style={{...inp,width:58,textAlign:"center",fontWeight:700,fontSize:15,padding:"4px 6px",color:pocet===0?"#9aa0b8":"#3b6fd4",cursor:"text"}}
  />;
}

function NovaPlozkaDokontejneru({kontejnerId,existujici,onSaved}){
  const [nazev,setNazev]=useState("");
  const [pocet,setPocet]=useState(1);
  const [saving,setSaving]=useState(false);
  const chips=nazev?QUICK_ITEMS.filter(i=>i.toLowerCase().includes(nazev.toLowerCase())):QUICK_ITEMS;
  const uloz=async()=>{
    const name=nazev.trim();if(!name)return;
    setSaving(true);
    const exist=existujici.find(p=>p.nazev===name);
    if(exist) await sb.from("vel_polozky").update({pocet:exist.pocet+pocet}).eq("id",exist.id);
    else await sb.from("vel_polozky").insert({kontejner_id:kontejnerId,nazev:name,pocet});
    setNazev("");setPocet(1);setSaving(false);onSaved();
  };
  return <div style={{padding:"10px 16px",background:C.bg,borderTop:`1px solid ${C.border}`}}>
    <div style={{display:"flex",gap:8,marginBottom:6}}>
      <input style={{...inp,flex:1,fontSize:13,padding:"6px 10px"}} value={nazev} onChange={e=>setNazev(e.target.value)}
        placeholder="Název oblečení…" onKeyDown={e=>e.key==="Enter"&&uloz()}/>
      <div style={{display:"flex",alignItems:"center",gap:4}}>
        <button onClick={()=>setPocet(Math.max(1,pocet-1))} style={{...btnC(C.muted,true),padding:"4px 8px",fontSize:14}}>−</button>
        <input type="number" value={pocet} onChange={e=>setPocet(Math.max(1,+e.target.value))}
          style={{...inp,width:48,textAlign:"center",fontWeight:700,padding:"6px 4px"}}/>
        <button onClick={()=>setPocet(pocet+1)} style={{...btnC(C.muted,true),padding:"4px 8px",fontSize:14}}>+</button>
      </div>
      <button onClick={uloz} disabled={saving||!nazev.trim()} style={{...btnC(),padding:"6px 14px",fontSize:13,whiteSpace:"nowrap"}}>+ Přidat</button>
    </div>
    {nazev&&chips.length>0&&<div style={{display:"flex",flexWrap:"wrap",gap:5}}>
      {chips.slice(0,8).map(i=><span key={i} onClick={()=>setNazev(i)}
        style={{fontSize:11,background:nazev===i?C.accent:C.accentS,color:nazev===i?"#fff":C.accent,padding:"2px 9px",borderRadius:20,cursor:"pointer",fontWeight:600}}>{i}</span>)}
    </div>}
  </div>;
}

// Opraví duplicitní záznamy v tabulce vel_polozky (stejný kontejner_id + nazev)
// Zachová záznam s největším id, ostatní smaže a přičte jejich počty
async function fixDuplicatePolozky(){
  const {data:all}=await sb.from("vel_polozky").select("*");
  if(!all)return;
  // Seskupíme podle kontejner_id + nazev
  const groups={};
  all.forEach(p=>{
    const key=`${p.kontejner_id}__${p.nazev}`;
    if(!groups[key])groups[key]=[];
    groups[key].push(p);
  });
  for(const key of Object.keys(groups)){
    const gr=groups[key];
    if(gr.length<=1)continue;
    // Seřadíme: zachováme ten s nejvyšším id
    gr.sort((a,b)=>b.id-a.id);
    const [keep,...rest]=gr;
    const totalPocet=gr.reduce((s,p)=>s+p.pocet,0);
    // Aktualizujeme zachovaný záznam na součet
    await sb.from("vel_polozky").update({pocet:totalPocet}).eq("id",keep.id);
    // Smažeme duplicity
    for(const dup of rest){
      await sb.from("vel_polozky").delete().eq("id",dup.id);
    }
  }
}

function ObleceniTab(){
  // Načteme VŠECHNY velikosti, kontejnery a položky najednou
  const {data:velikosti,loading:lv,reload:reloadVel}=useData(()=>sb.from("vel_velikosti").select("*").order("id").then(({data,error})=>({data:data?.sort((a,b)=>parseFloat(a.id)-parseFloat(b.id)||a.id.localeCompare(b.id)),error})));
  const {data:vsechnyKonts,loading:lk,reload:reloadKonts}=useData(()=>sb.from("vel_kontejnery").select("*").order("nazev"));
  const {data:vsechnyPol,loading:lp,reload:reloadPol}=useData(()=>sb.from("vel_polozky").select("*").order("nazev").then(({data,error})=>({data:data?.sort((a,b)=>a.nazev.localeCompare(b.nazev,"cs")),error})));
  const [novaMod,setNovaMod]=useState(false);
  const [novyKont,setNovyKont]=useState(false);
  const [editKont,setEditKont]=useState(null);
  const [otevreneKonty,setOtevreneKonty]=useState({});
  const [pridatM,setPridatM]=useState(false);
  const [vybratM,setVybratM]=useState(false);
  const [newVelId,setNewVelId]=useState("");
  const [fixRunning,setFixRunning]=useState(false);
  const reloadAll=()=>{reloadVel();reloadKonts();reloadPol();};
  const spustFix=async()=>{setFixRunning(true);await fixDuplicatePolozky();reloadAll();setFixRunning(false);};

  const loading=lv||lk||lp;

  // Deduplikace v paměti: pokud DB obsahuje duplicity (stejný kontejner_id+nazev),
  // sloučíme je do jednoho záznamu (součet pocet) aby se přehled zobrazoval správně
  const vsechnyPolDedup=(()=>{
    if(!vsechnyPol)return[];
    const map=new Map();
    vsechnyPol.forEach(p=>{
      const key=`${p.kontejner_id}__${p.nazev}`;
      if(map.has(key)){map.get(key).pocet+=p.pocet;}
      else{map.set(key,{...p});}
    });
    return [...map.values()];
  })();

  // Sestavit tabulku: druhy × velikosti
  // Pro každou buňku (druh, velikost) chceme: celkem ks + detail po kontejnerech
  const allDruhy=[...new Set(vsechnyPolDedup.map(p=>p.nazev))].sort((a,b)=>a.localeCompare(b,"cs"));

  // celkem ks pro celý přehled (z deduplikovaných dat)
  const celkemVse=vsechnyPolDedup.reduce((a,p)=>a+p.pocet,0);

  // Export Excel — každý kontejner = jeden list
  const exportExcel=async()=>{
    const X=await import("xlsx");
    const wb=X.utils.book_new();
    (vsechnyKonts||[]).forEach(k=>{
      const st=STORAGE_TYPES[k.typ]||STORAGE_TYPES.other;
      const vel=k.velikost_id;
      const pols=(vsechnyPolDedup||[]).filter(p=>p.kontejner_id===k.id&&p.pocet>0).sort((a,b)=>a.nazev.localeCompare(b.nazev,"cs"));
      const total=pols.reduce((a,p)=>a+p.pocet,0);
      const rows=[
        [`Hostice — Oblečení vel. ${vel}`,"",""],
        [`${st.icon} ${k.nazev}${k.umisteni?" · "+k.umisteni:""}  ·  ${st.label}`,"",""],
        ["Druh oblečení","Počet ks","Poznámka"],
        ...pols.map(p=>[p.nazev,p.pocet,""]),
        ["","",""],["","",""],["","",""],
        ["CELKEM",total,""],
        [`Datum uložení: _______________    Uložil/a: ___________________________`,"",""],
      ];
      const ws=X.utils.aoa_to_sheet(rows);
      ws["!merges"]=[{s:{r:0,c:0},e:{r:0,c:2}},{s:{r:1,c:0},e:{r:1,c:2}},{s:{r:rows.length-1,c:0},e:{r:rows.length-1,c:2}}];
      ws["!cols"]=[{wch:32},{wch:12},{wch:22}];
      ws["!pageSetup"]={paperSize:9,orientation:"portrait",fitToPage:true,fitToWidth:1};
      X.utils.book_append_sheet(wb,ws,`${vel} ${k.nazev}`.substring(0,31));
    });
    // Souhrnný list: druhy × velikosti
    const vels=(velikosti||[]).map(v=>v.id);
    const sumRows=[
      ["Druh oblečení",...vels,"Celkem"],
      ...allDruhy.map(druh=>{
        const perVel=vels.map(vid=>{
          const kIds=(vsechnyKonts||[]).filter(k=>k.velikost_id===vid).map(k=>k.id);
          return (vsechnyPolDedup||[]).filter(p=>kIds.includes(p.kontejner_id)&&p.nazev===druh).reduce((a,p)=>a+p.pocet,0)||"";
        });
        const sum=perVel.reduce((a,v)=>a+(+v||0),0);
        return [druh,...perVel,sum||""];
      }),
      ["CELKEM",...vels.map(vid=>{
        const kIds=(vsechnyKonts||[]).filter(k=>k.velikost_id===vid).map(k=>k.id);
        return (vsechnyPolDedup||[]).filter(p=>kIds.includes(p.kontejner_id)).reduce((a,p)=>a+p.pocet,0);
      }),celkemVse],
    ];
    const wsPrehled=X.utils.aoa_to_sheet(sumRows);
    wsPrehled["!cols"]=[{wch:28},...vels.map(()=>({wch:9})),{wch:10}];
    wsPrehled["!pageSetup"]={paperSize:9,orientation:"landscape",fitToPage:true,fitToWidth:1};
    X.utils.book_append_sheet(wb,wsPrehled,"Přehled",true);
    X.writeFile(wb,`${APP_NAME.toLowerCase()}_obleceni_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  const [zalozka,setZalozka]=useState("prehled");

  if(loading)return <Spinner/>;

  return <div>
    <style>{`.oblcell:hover{background:#e8eeff!important}`}</style>

    {/* Hlavička */}
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16,flexWrap:"wrap",gap:8}}>
      <div style={{color:C.text,fontWeight:800,fontSize:17}}>👕 Oblečení</div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        <button onClick={spustFix} disabled={fixRunning} title="Sloučí duplicitní záznamy v databázi" style={{...btnC(C.orange,true),fontSize:12,padding:"6px 14px"}}>{fixRunning?"Opravuji…":"🔧 Opravit duplicity"}</button>
        <button onClick={exportExcel} style={{...btnC(C.green,true),fontSize:12,padding:"6px 14px"}}>↓ Excel</button>
      </div>
    </div>

    {/* Záložky */}
    <div style={{display:"flex",gap:0,marginBottom:20,borderBottom:`2px solid ${C.border}`}}>
      {[{id:"prehled",label:"📊 Přehled"},{id:"kontejnery",label:"📦 Kontejnery"}].map(z=>(
        <button key={z.id} onClick={()=>setZalozka(z.id)} style={{padding:"8px 20px",border:"none",cursor:"pointer",fontWeight:700,fontSize:13,background:"transparent",transition:"all .15s",color:zalozka===z.id?C.accent:C.muted,borderBottom:zalozka===z.id?`2px solid ${C.accent}`:"2px solid transparent",marginBottom:-2}}>{z.label}</button>
      ))}
    </div>

    {/* ── PŘEHLED ── */}
    {zalozka==="prehled"&&<>
    <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>
      <button onClick={()=>setNovaMod(true)} style={{...btnC(C.muted,true),fontSize:12,padding:"5px 12px"}}>+ Velikost</button>
    </div>

    {/* Statistika */}
    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:20}}>
      <StatCard label="Kusů celkem" val={celkemVse} color={C.accent}/>
      <StatCard label="Druhů" val={allDruhy.length} color={C.green}/>
      <StatCard label="Velikostí" val={(velikosti||[]).length} color={C.blue}/>
    </div>

    {/* Křížová tabulka: druhy × velikosti */}
    {allDruhy.length===0&&<EmptyState emoji="👕" text="Žádné oblečení" action="+ Uložit oblečení" onAction={()=>setPridatM(true)}/>}
    {allDruhy.length>0&&<div style={{overflowX:"auto"}}>
      <table style={{width:"100%",borderCollapse:"collapse",background:C.surface,borderRadius:12,overflow:"hidden",fontSize:13}}>
        <thead>
          <tr>
            <th style={{padding:"10px 16px",background:C.bg,borderBottom:`2px solid ${C.border}`,textAlign:"left",color:C.muted,fontSize:11,fontWeight:700,letterSpacing:.7,textTransform:"uppercase",minWidth:160}}>Druh oblečení</th>
            {(velikosti||[]).map(v=>(
              <th key={v.id} style={{padding:"10px 12px",background:C.accentS,borderBottom:`2px solid ${C.accent}44`,borderLeft:`1px solid ${C.border}`,textAlign:"center",color:C.accent,fontSize:13,fontWeight:800,minWidth:70}}>{v.id}</th>
            ))}
            <th style={{padding:"10px 12px",background:C.bg,borderBottom:`2px solid ${C.border}`,borderLeft:`2px solid ${C.border}`,textAlign:"center",color:C.muted,fontSize:11,fontWeight:700,letterSpacing:.7,textTransform:"uppercase",minWidth:70}}>Celkem</th>
          </tr>
        </thead>
        <tbody>
          {allDruhy.map((druh,i)=>{
            const celkem=(velikosti||[]).reduce((a,vel)=>{
              const kIds=(vsechnyKonts||[]).filter(k=>k.velikost_id===vel.id).map(k=>k.id);
              return a+vsechnyPolDedup.filter(p=>kIds.includes(p.kontejner_id)&&p.nazev===druh).reduce((x,p)=>x+p.pocet,0);
            },0);
            return <tr key={druh} style={{background:i%2===0?C.surface:"#fafbff"}}>
              <td style={{padding:"9px 16px",borderBottom:`1px solid ${C.border}`,color:C.text,fontWeight:500}}>{druh}</td>
              {(velikosti||[]).map(vel=>{
                const kontsVel=(vsechnyKonts||[]).filter(k=>k.velikost_id===vel.id);
                const kIds=kontsVel.map(k=>k.id);
                const pocet=vsechnyPolDedup.filter(p=>kIds.includes(p.kontejner_id)&&p.nazev===druh).reduce((a,p)=>a+p.pocet,0);
                return <td key={vel.id}
                  style={{padding:"9px 12px",borderBottom:`1px solid ${C.border}`,borderLeft:`1px solid ${C.border}`,textAlign:"center",verticalAlign:"middle"}}>
                  {pocet ? <>
                    <div style={{fontWeight:700,color:C.accent,fontSize:14}}>{pocet}</div>
                    {kontsVel.filter(k=>{const p=vsechnyPolDedup.find(x=>x.kontejner_id===k.id&&x.nazev===druh);return p&&p.pocet>0;}).map(k=>{
                      const p=vsechnyPolDedup.find(x=>x.kontejner_id===k.id&&x.nazev===druh);
                      const st=STORAGE_TYPES[k.typ]||STORAGE_TYPES.other;
                      return <div key={k.id} style={{fontSize:10,color:C.muted,marginTop:2,lineHeight:1.3}}>{st.icon} {k.nazev}{k.umisteni?` · ${k.umisteni}`:""}</div>;
                    })}
                  </> : <span style={{color:C.dim,fontSize:12}}>—</span>}
                </td>;
              })}
              <td style={{padding:"9px 12px",borderBottom:`1px solid ${C.border}`,borderLeft:`2px solid ${C.border}`,textAlign:"center",fontWeight:800,color:celkem?C.text:C.dim,fontSize:celkem?14:12}}>{celkem||"—"}</td>
            </tr>;
          })}
        </tbody>
        <tfoot>
          <tr style={{background:C.bg,borderTop:`2px solid ${C.border}`}}>
            <td style={{padding:"10px 16px",fontWeight:800,color:C.text,fontSize:13}}>CELKEM</td>
            {(velikosti||[]).map(vel=>{
              const kIds=(vsechnyKonts||[]).filter(k=>k.velikost_id===vel.id).map(k=>k.id);
              const t=vsechnyPolDedup.filter(p=>kIds.includes(p.kontejner_id)).reduce((a,p)=>a+p.pocet,0);
              return <td key={vel.id} style={{padding:"10px 12px",borderLeft:`1px solid ${C.border}`,textAlign:"center",fontWeight:800,color:C.accent,fontSize:14}}>{t||"—"}</td>;
            })}
            <td style={{padding:"10px 12px",borderLeft:`2px solid ${C.border}`,textAlign:"center",fontWeight:800,color:C.accent,fontSize:15}}>{celkemVse}</td>
          </tr>
        </tfoot>
      </table>
    </div>}
    </>}

    {/* ── KONTEJNERY ── */}
    {zalozka==="kontejnery"&&<>
      <div style={{display:"flex",justifyContent:"flex-end",marginBottom:12}}>
        <button onClick={()=>setNovyKont(true)} style={{...btnC(),fontSize:12,padding:"6px 14px"}}>+ Přidat kontejner</button>
      </div>
      {(vsechnyKonts||[]).length===0&&<EmptyState emoji="📦" text="Žádné kontejnery" action="+ Přidat kontejner" onAction={()=>setNovyKont(true)}/>}
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {(vsechnyKonts||[]).map(k=>{
          const st=STORAGE_TYPES[k.typ]||STORAGE_TYPES.other;
          const polsK=(vsechnyPol||[]).filter(p=>p.kontejner_id===k.id).sort((a,b)=>a.nazev.localeCompare(b.nazev,"cs"));
          const pocetKs=vsechnyPolDedup.filter(p=>p.kontejner_id===k.id).reduce((a,p)=>a+p.pocet,0);
          const otevreny=otevreneKonty[k.id];
          return <div key={k.id} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,marginBottom:0}}>
            <div onClick={()=>setOtevreneKonty(p=>({...p,[k.id]:!p[k.id]}))}
              style={{display:"flex",alignItems:"center",gap:10,padding:"12px 16px",cursor:"pointer",background:otevreny?C.accentS:C.surface,transition:"background .15s",position:"sticky",top:54,zIndex:10,borderRadius:12,border:`1px solid ${otevreny?C.accent+"44":C.border}`}}>
              <span style={{fontSize:16}}>{st.icon}</span>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,fontSize:14,color:C.text}}>{k.nazev} <span style={{background:C.accentS,color:C.accent,padding:"2px 8px",borderRadius:6,fontSize:12,fontWeight:800,marginLeft:4}}>vel. {k.velikost_id}</span></div>
                <div style={{color:C.dim,fontSize:12}}>{[k.umisteni,st.label].filter(Boolean).join(" · ")} · {pocetKs} ks</div>
              </div>
              <div style={{display:"flex",gap:6}} onClick={e=>e.stopPropagation()}>
                <button onClick={()=>setEditKont(k)} style={{...btnC(C.muted,true),padding:"4px 9px",fontSize:12}}>✎</button>
                <button onClick={async()=>{if(!confirm(`Smazat "${k.nazev}"?`))return;await sb.from("vel_kontejnery").delete().eq("id",k.id);reloadAll();}} style={{...btnC(C.red,true),padding:"4px 9px",fontSize:12}}>✕</button>
              </div>
              <span style={{color:C.muted,fontSize:13,marginLeft:4}}>{otevreny?"▲":"▼"}</span>
            </div>
            {otevreny&&<div style={{borderTop:`1px solid ${C.border}`}}>
              {(()=>{
                const skladem=new Map(polsK.map(p=>[p.nazev,p]));
                const vsechnyNazvy=new Set([...QUICK_ITEMS,...(vsechnyPol||[]).map(p=>p.nazev)]);
                const vsechnyDruhy=[...vsechnyNazvy].sort((a,b)=>a.localeCompare(b,"cs"));
                const zobrazit=vsechnyDruhy.map(nazev=>skladem.get(nazev)||{id:null,nazev,pocet:0,kontejner_id:k.id});
                return zobrazit.map((pol,i)=>(
                  <div key={pol.id||pol.nazev} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 16px",background:i%2===0?C.surface:"#fafbff",borderBottom:`1px solid ${C.border}`}}>
                    <span style={{flex:1,fontSize:13,color:pol.pocet===0?C.dim:C.text,fontWeight:pol.pocet>0?500:400}}>{pol.nazev}</span>
                    <button onClick={async()=>{if(!pol.id||pol.pocet<=0)return;await sb.from("vel_polozky").update({pocet:pol.pocet-1}).eq("id",pol.id);reloadAll();}} style={{...btnC(C.muted,true),padding:"3px 9px",fontSize:14,minWidth:28,opacity:pol.id&&pol.pocet>0?1:.3}}>−</button>
                    <EditableCount pocet={pol.pocet} onSave={async n=>{
                      if(pol.id)await sb.from("vel_polozky").update({pocet:n}).eq("id",pol.id);
                      else if(n>0)await sb.from("vel_polozky").insert({kontejner_id:k.id,nazev:pol.nazev,pocet:n});
                      reloadAll();
                    }}/>
                    <button onClick={async()=>{if(pol.id)await sb.from("vel_polozky").update({pocet:pol.pocet+1}).eq("id",pol.id);else await sb.from("vel_polozky").insert({kontejner_id:k.id,nazev:pol.nazev,pocet:1});reloadAll();}} style={{...btnC(C.muted,true),padding:"3px 9px",fontSize:14,minWidth:28}}>+</button>
                    {pol.id?<button onClick={async()=>{if(!confirm(`Odebrat "${pol.nazev}"?`))return;await sb.from("vel_polozky").delete().eq("id",pol.id);reloadAll();}} style={{background:"none",border:"none",cursor:"pointer",color:C.dim,fontSize:13,padding:"3px 6px"}} onMouseEnter={e=>e.currentTarget.style.color=C.red} onMouseLeave={e=>e.currentTarget.style.color=C.dim}>✕</button>:<span style={{width:28}}/>}
                  </div>
                ));
              })()}
              <NovaPlozkaDokontejneru kontejnerId={k.id} existujici={polsK} onSaved={reloadAll}/>
            </div>}
          </div>;
        })}
      </div>
    </>}
    {/* Modály */}
    {novaMod&&<Modal title="Nová velikost" onClose={()=>setNovaMod(false)} width={320}>
      <Field label="Označení" hint="Např. 74, 80, 86…"><input style={inp} value={newVelId} onChange={e=>setNewVelId(e.target.value)} autoFocus onKeyDown={async e=>{if(e.key==="Enter"&&newVelId.trim()){await sb.from("vel_velikosti").insert({id:newVelId.trim()});setNovaMod(false);setNewVelId("");reloadAll();}}}/></Field>
      <div style={{display:"flex",justifyContent:"flex-end",gap:10}}><button onClick={()=>setNovaMod(false)} style={btnC(C.muted,true)}>Zrušit</button><button onClick={async()=>{if(!newVelId.trim())return;await sb.from("vel_velikosti").insert({id:newVelId.trim()});setNovaMod(false);setNewVelId("");reloadAll();}} style={btnC()}>Přidat</button></div>
    </Modal>}
    {novyKont&&<KontejnerModalObl velikostId={null} velikosti={velikosti||[]} onClose={()=>setNovyKont(false)} onSaved={()=>{setNovyKont(false);reloadAll();}}/>}
    {editKont&&<KontejnerModalObl kontejner={editKont} velikosti={velikosti||[]} onClose={()=>setEditKont(null)} onSaved={()=>{setEditKont(null);reloadAll();}}/>}
    {pridatM&&<PridatOblModal velikosti={velikosti||[]} onClose={()=>setPridatM(false)} onSaved={()=>{setPridatM(false);reloadAll();}}/>}
    {vybratM&&<VybratOblModal velikosti={velikosti||[]} onClose={()=>setVybratM(false)} onSaved={()=>{setVybratM(false);reloadAll();}}/>}
  </div>;
}

// ══════════════════════════════════════════════════════════════════════════════
// SKLAD
// ══════════════════════════════════════════════════════════════════════════════
function SkladModal({pol,kats,onClose,onSaved}){
  const isNew=!pol;
  const [f,setF]=useState({nazev:pol?.nazev||"",pocet:pol?.pocet||0,jednotka:pol?.jednotka||"ks",minimum:pol?.minimum||0,umisteni:pol?.umisteni||"",poznamka:pol?.poznamka||"",kategorie_id:pol?.kategorie_id||kats[0]?.id||null});
  const [saving,setSaving]=useState(false);const set=k=>e=>setF(p=>({...p,[k]:e.target.value}));
  const uloz=async()=>{if(!f.nazev.trim())return;setSaving(true);if(isNew)await sb.from("sklad_polozky").insert(f);else await sb.from("sklad_polozky").update(f).eq("id",pol.id);setSaving(false);onSaved();};
  return <Modal title={isNew?"Nová položka skladu":"Upravit položku"} onClose={onClose}>
    <Field label="Název"><input style={inp} value={f.nazev} onChange={set("nazev")} autoFocus onKeyDown={e=>e.key==="Enter"&&uloz()}/></Field>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
      <Field label="Počet"><input style={inp} type="number" value={f.pocet} onChange={set("pocet")}/></Field>
      <Field label="Jednotka"><input style={inp} value={f.jednotka} onChange={set("jednotka")} placeholder="ks, kg, l…"/></Field>
      <Field label="Minimum" hint="Upozornit pod"><input style={inp} type="number" value={f.minimum} onChange={set("minimum")}/></Field>
    </div>
    <Field label="Kategorie"><select style={inp} value={f.kategorie_id||""} onChange={set("kategorie_id")}>{kats.map(k=><option key={k.id} value={k.id}>{k.emoji} {k.nazev}</option>)}</select></Field>
    <Field label="Umístění doma"><input style={inp} value={f.umisteni} onChange={set("umisteni")} placeholder="Sklep, police č.2…"/></Field>
    <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:6}}><button onClick={onClose} style={btnC(C.muted,true)}>Zrušit</button><button onClick={uloz} disabled={saving} style={btnC()}>{saving?"…":"Uložit"}</button></div>
  </Modal>;
}

function SkladTab(){
  const {data:kats}=useData(()=>sb.from("sklad_kategorie").select("*").order("poradi"));
  const {data:polozky,loading,reload}=useData(()=>sb.from("sklad_polozky").select("*,sklad_kategorie(nazev,emoji)").order("nazev"));
  const [modal,setModal]=useState(null);const [filtrKat,setFiltrKat]=useState(null);const [finModal,setFinModal]=useState(false);
  const smaz=async(p)=>{if(!confirm(`Smazat "${p.nazev}"?`))return;await sb.from("sklad_polozky").delete().eq("id",p.id);reload();};
  const zmen=async(p,d)=>{const n=+(p.pocet)+d;if(n<0)return;await sb.from("sklad_polozky").update({pocet:n}).eq("id",p.id);reload();};
  const filtered=(polozky||[]).filter(p=>!filtrKat||p.kategorie_id===filtrKat);
  const nizke=filtered.filter(p=>+p.minimum>0&&+p.pocet<=+p.minimum);
  if(loading)return <Spinner/>;
  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
      <div style={{color:C.text,fontWeight:800,fontSize:17}}>📦 Sklad</div>
      <div style={{display:"flex",gap:8}}>
        <button onClick={()=>setFinModal(true)} style={{...btnC(C.purple,true)}}>💰 Majetek / investice</button>
        <button onClick={()=>setModal("new")} style={btnC()}>+ Přidat položku</button>
      </div>
    </div>
    {nizke.length>0&&<div style={{background:C.orangeS,border:`1px solid ${C.orange}44`,borderRadius:10,padding:"10px 14px",marginBottom:16,fontSize:13,color:C.orange}}>⚠ Nízký stav: {nizke.map(p=>p.nazev).join(", ")}</div>}
    <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:16}}>
      <button onClick={()=>setFiltrKat(null)} style={{...btnC(!filtrKat?C.accent:C.muted,!!filtrKat),padding:"5px 12px",fontSize:12}}>Vše</button>
      {(kats||[]).map(k=><button key={k.id} onClick={()=>setFiltrKat(k.id===filtrKat?null:k.id)} style={{...btnC(filtrKat===k.id?C.accent:C.muted,filtrKat!==k.id),padding:"5px 12px",fontSize:12}}>{k.emoji} {k.nazev}</button>)}
    </div>
    {filtered.length===0&&<EmptyState emoji="📦" text="Žádné položky" action="Přidat první položku" onAction={()=>setModal("new")}/>}
    <div style={{display:"flex",flexDirection:"column",gap:6}}>
      {filtered.map(p=>{const niz=+p.minimum>0&&+p.pocet<=+p.minimum;return(
        <div key={p.id} style={{display:"flex",alignItems:"center",gap:10,background:C.surface,border:`1px solid ${niz?C.orange+"88":C.border}`,borderRadius:10,padding:"10px 14px"}}>
          <div style={{fontSize:18}}>{p.sklad_kategorie?.emoji||"📦"}</div>
          <div style={{flex:1}}><div style={{fontWeight:600,fontSize:14,color:C.text}}>{p.nazev}</div>{p.umisteni&&<div style={{color:C.dim,fontSize:12}}>{p.umisteni}</div>}</div>
          {niz&&<Tag color={C.orange}>⚠ Málo</Tag>}
          <button onClick={()=>zmen(p,-1)} style={{...btnC(C.muted,true),padding:"3px 9px",fontSize:15}}>−</button>
          <span style={{fontSize:15,fontWeight:700,minWidth:50,textAlign:"center",color:niz?C.orange:C.text}}>{p.pocet} {p.jednotka}</span>
          <button onClick={()=>zmen(p,1)} style={{...btnC(C.muted,true),padding:"3px 9px",fontSize:15}}>+</button>
          <button onClick={()=>setModal(p)} style={{...btnC(C.muted,true),padding:"3px 9px",fontSize:12}}>✎</button>
          <button onClick={()=>smaz(p)} style={{...btnC(C.red,true),padding:"3px 9px",fontSize:12}}>✕</button>
        </div>
      );})}
    </div>
    {modal==="new"&&<SkladModal kats={kats||[]} onClose={()=>setModal(null)} onSaved={()=>{setModal(null);reload();}}/>}
    {modal&&modal!=="new"&&<SkladModal pol={modal} kats={kats||[]} onClose={()=>setModal(null)} onSaved={()=>{setModal(null);reload();}}/>}
    {finModal&&<Modal title="💰 Majetek a investice" onClose={()=>setFinModal(false)} width={520}>
      <div style={{fontSize:12,color:C.muted,marginBottom:14}}>Nákupy dlouhodobého majetku a investice do zásob napojené na cashflow plán. U položky lze zvolit konkrétní kategorii skladu.</div>
      <EntityFinancePanel majetek lock={{majetek:true}} nadpis="Majetek / investice do zásob"/>
    </Modal>}
  </div>;
}

// ══════════════════════════════════════════════════════════════════════════════
// ÚKOLY
// ══════════════════════════════════════════════════════════════════════════════
function UkolModal({ukol,onClose,onSaved}){
  const isNew=!ukol;
  const [f,setF]=useState({nazev:ukol?.nazev||"",popis:ukol?.popis||"",interval_dnu:ukol?.interval_dnu||"",dalsi_termin:ukol?.dalsi_termin||""});
  const [saving,setSaving]=useState(false);const set=k=>e=>setF(p=>({...p,[k]:e.target.value}));
  const uloz=async()=>{if(!f.nazev.trim())return;setSaving(true);const data={...f,interval_dnu:f.interval_dnu?+f.interval_dnu:null,dalsi_termin:f.dalsi_termin||null};if(isNew)await sb.from("ukoly").insert(data);else await sb.from("ukoly").update(data).eq("id",ukol.id);setSaving(false);onSaved();};
  return <Modal title={isNew?"Nový úkol":"Upravit úkol"} onClose={onClose}>
    <Field label="Název"><input style={inp} value={f.nazev} onChange={set("nazev")} autoFocus/></Field>
    <Field label="Popis"><input style={inp} value={f.popis} onChange={set("popis")} placeholder="Volitelný popis…"/></Field>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
      <Field label="Interval (dní)" hint="Např. 30 = každý měsíc"><input style={inp} type="number" value={f.interval_dnu} onChange={set("interval_dnu")} placeholder="30"/></Field>
      <Field label="Příští termín"><input style={inp} type="date" value={f.dalsi_termin} onChange={set("dalsi_termin")}/></Field>
    </div>
    <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:6}}><button onClick={onClose} style={btnC(C.muted,true)}>Zrušit</button><button onClick={uloz} disabled={saving} style={btnC()}>{saving?"…":"Uložit"}</button></div>
  </Modal>;
}

function UkolyTab(){
  const {data:ukoly,loading,reload}=useData(()=>sb.from("ukoly").select("*").order("dalsi_termin"));
  const [modal,setModal]=useState(null);
  const splnit=async(u)=>{const dnes=new Date().toISOString().slice(0,10);let dalsi=null;if(u.interval_dnu)dalsi=new Date(Date.now()+u.interval_dnu*86400000).toISOString().slice(0,10);await sb.from("ukoly_splneni").insert({ukol_id:u.id,datum:dnes});await sb.from("ukoly").update({posledni_splneni:dnes,dalsi_termin:dalsi}).eq("id",u.id);reload();};
  const smaz=async(u)=>{if(!confirm(`Smazat "${u.nazev}"?`))return;await sb.from("ukoly").delete().eq("id",u.id);reload();};
  if(loading)return <Spinner/>;
  const poBTerminu=(ukoly||[]).filter(u=>{const d=daysUntil(u.dalsi_termin);return d!==null&&d<0;});
  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
      <div style={{color:C.text,fontWeight:800,fontSize:17}}>🔁 Pravidelné úkoly</div>
      <button onClick={()=>setModal("new")} style={btnC()}>+ Přidat úkol</button>
    </div>
    {poBTerminu.length>0&&<div style={{background:C.redS,border:`1px solid ${C.red}44`,borderRadius:10,padding:"10px 14px",marginBottom:16,fontSize:13,color:C.red}}>⛔ Po termínu: {poBTerminu.map(u=>u.nazev).join(", ")}</div>}
    {(ukoly||[]).length===0&&<EmptyState emoji="🔁" text="Žádné úkoly" action="Přidat první úkol" onAction={()=>setModal("new")}/>}
    <div style={{display:"flex",flexDirection:"column",gap:8}}>
      {(ukoly||[]).map(u=>{const d=daysUntil(u.dalsi_termin);const barva=d===null?C.dim:d<0?C.red:d<=7?C.orange:C.green;
        return <div key={u.id} style={{background:C.surface,border:`1px solid ${d!==null&&d<0?C.red+"55":C.border}`,borderRadius:12,padding:"12px 16px",display:"flex",alignItems:"center",gap:12}}>
          <div style={{flex:1}}>
            <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:2}}>
              <span style={{fontWeight:700,fontSize:14,color:C.text}}>{u.nazev}</span>
              {u.interval_dnu&&<Tag color={C.blue}>každých {u.interval_dnu} dní</Tag>}
              {u.dalsi_termin&&<Tag color={barva}>{d<0?`⛔ ${Math.abs(d)} dní po termínu`:d===0?"🔴 Dnes":d<=7?`⚠ Za ${d} dní`:`Za ${d} dní`}</Tag>}
            </div>
            {u.popis&&<div style={{color:C.dim,fontSize:12}}>{u.popis}</div>}
            {u.posledni_splneni&&<div style={{color:C.dim,fontSize:12}}>Naposledy: {new Date(u.posledni_splneni).toLocaleDateString("cs-CZ")}</div>}
          </div>
          <div style={{display:"flex",gap:6,flexShrink:0}}>
            <button onClick={()=>splnit(u)} style={{...btnC(C.green),padding:"6px 12px",fontSize:12}}>✓ Splněno</button>
            <button onClick={()=>setModal(u)} style={{...btnC(C.muted,true),padding:"6px 10px",fontSize:12}}>✎</button>
            <button onClick={()=>smaz(u)} style={{...btnC(C.red,true),padding:"6px 10px",fontSize:12}}>✕</button>
          </div>
        </div>;
      })}
    </div>
    {modal==="new"&&<UkolModal onClose={()=>setModal(null)} onSaved={()=>{setModal(null);reload();}}/>}
    {modal&&modal!=="new"&&<UkolModal ukol={modal} onClose={()=>setModal(null)} onSaved={()=>{setModal(null);reload();}}/>}
  </div>;
}

// ══════════════════════════════════════════════════════════════════════════════
// SPOTŘEBA
// ══════════════════════════════════════════════════════════════════════════════
function OdecetModal({meraky,defaultMerak,onClose,onSaved}){
  const [f,setF]=useState({merak_id:defaultMerak||meraky[0]?.id||"",stav:"",datum:new Date().toISOString().slice(0,10),poznamka:""});
  const [saving,setSaving]=useState(false);const set=k=>e=>setF(p=>({...p,[k]:e.target.value}));
  const uloz=async()=>{if(!f.stav)return;setSaving(true);await sb.from("spotreba_odecty").insert(f);setSaving(false);onSaved();};
  return <Modal title="Zapsat odečet" onClose={onClose} width={380}>
    <Field label="Měřák"><select style={inp} value={f.merak_id} onChange={set("merak_id")}>{meraky.map(m=><option key={m.id} value={m.id}>{m.emoji} {m.nazev}</option>)}</select></Field>
    <Field label="Stav (aktuální hodnota)"><input style={inp} type="number" step="0.01" value={f.stav} onChange={set("stav")} autoFocus/></Field>
    <Field label="Datum"><input style={inp} type="date" value={f.datum} onChange={set("datum")}/></Field>
    <Field label="Poznámka"><input style={inp} value={f.poznamka} onChange={set("poznamka")} placeholder="Volitelné…"/></Field>
    <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:6}}><button onClick={onClose} style={btnC(C.muted,true)}>Zrušit</button><button onClick={uloz} disabled={saving||!f.stav} style={btnC()}>{saving?"…":"Uložit"}</button></div>
  </Modal>;
}

function SpotrebaTab(){
  const {data:meraky,loading:lm}=useData(()=>sb.from("spotreba_meraky").select("*").order("poradi"));
  const [aktivni,setAktivni]=useState(null);
  const {data:odecty,loading:lo,reload}=useData(()=>aktivni?sb.from("spotreba_odecty").select("*").eq("merak_id",aktivni).order("datum",{ascending:false}).limit(50):Promise.resolve({data:[],error:null}),[aktivni]);
  const [modal,setModal]=useState(false);
  useEffect(()=>{if(meraky?.length&&!aktivni)setAktivni(meraky[0].id);},[meraky]);
  if(lm)return <Spinner/>;
  const aOdecty=odecty||[];
  const posledni=aOdecty[0];const predposledni=aOdecty[1];
  const spotreba=posledni&&predposledni?+(posledni.stav)-+(predposledni.stav):null;
  const merak=meraky?.find(m=>m.id===aktivni);
  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
      <div style={{color:C.text,fontWeight:800,fontSize:17}}>💧 Spotřeba</div>
      <button onClick={()=>setModal(true)} style={btnC()}>+ Zapsat odečet</button>
    </div>
    <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:20}}>
      {(meraky||[]).map(m=><button key={m.id} onClick={()=>setAktivni(m.id)} style={{padding:"6px 16px",borderRadius:9,border:"none",cursor:"pointer",fontWeight:700,fontSize:13,transition:"all .15s",background:aktivni===m.id?C.accent:C.surface,color:aktivni===m.id?"#fff":C.muted}}>{m.emoji} {m.nazev}</button>)}
    </div>
    {aktivni&&<>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:20}}>
        <StatCard label="Aktuální stav" val={posledni?`${posledni.stav} ${merak?.jednotka||""}`:"-"} color={C.accent}/>
        <StatCard label="Spotřeba od posl. odečtu" val={spotreba!==null?`${spotreba.toFixed(1)} ${merak?.jednotka||""}`:"—"} color={spotreba>0?C.orange:C.green}/>
      </div>
      {lo&&<Spinner/>}
      {!lo&&aOdecty.length===0&&<EmptyState emoji="📊" text="Žádné odečty" action="Zapsat první odečet" onAction={()=>setModal(true)}/>}
      <div style={{display:"flex",flexDirection:"column",gap:6}}>
        {aOdecty.map((o,i)=>{const prev=aOdecty[i+1];const diff=prev?+(o.stav)-+(prev.stav):null;
          return <div key={o.id} style={{display:"flex",alignItems:"center",gap:10,background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 14px"}}>
            <div style={{flex:1}}><div style={{fontWeight:700,fontSize:14,color:C.text}}>{o.stav} {merak?.jednotka}</div><div style={{color:C.dim,fontSize:12}}>{new Date(o.datum).toLocaleDateString("cs-CZ")}{o.poznamka&&` · ${o.poznamka}`}</div></div>
            {diff!==null&&<Tag color={diff>0?C.orange:C.green}>{diff>0?"+":""}{diff.toFixed(1)} {merak?.jednotka}</Tag>}
          </div>;
        })}
      </div>
    </>}
    {modal&&<OdecetModal meraky={meraky||[]} defaultMerak={aktivni} onClose={()=>setModal(false)} onSaved={()=>{setModal(false);reload();}}/>}
  </div>;
}

// ══════════════════════════════════════════════════════════════════════════════
// FINANCE
// ══════════════════════════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════════════════════════
// IMPORT BANKOVNÍCH VÝPISŮ
// Parsery ověřené na skutečných výpisech: u každého sedí
// počáteční zůstatek + součet pohybů = konečný zůstatek uvedený ve výpisu.
// ══════════════════════════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════════════════════════
// PARSERY BANKOVNÍCH VÝPISŮ
// Vrací vždy stejný tvar:
//   { banka, cislo_uctu, mena, obdobi_od, obdobi_do, cislo_vypisu,
//     zustatek_pocatecni, zustatek_konecny,
//     radky: [{ datum, castka, protiucet, vs, ks, ss, popis, poznamka, ref }] }
// „ref" je identifikátor transakce u banky — používá se na detekci duplicit.
// ══════════════════════════════════════════════════════════════════════════════

const cislo = s => Number(String(s ?? "").trim() || 0);
const bezNul = s => String(s ?? "").replace(/^0+/, "") || "";
const datumDDMMRR = s => {
  if (!/^\d{6}$/.test(s)) return null;
  const d = s.slice(0, 2), m = s.slice(2, 4), r = s.slice(4, 6);
  return `20${r}-${m}-${d}`;
};

// ── GPC / ABO (Fio, Air Bank, Raiffeisen, Moneta, KB…) ───────────────────────
// Věta 074 = hlavička výpisu, věta 075 = jedna transakce. Pevné pozice, cp1250.
function parseGpc(text) {
  const radky = [];
  let hlavicka = null;
  for (const raw of text.split(/\r?\n/)) {
    const l = raw.replace(/\r$/, "");
    if (l.startsWith("074")) {
      hlavicka = {
        cislo_uctu: bezNul(l.slice(3, 19)),
        nazev_uctu: l.slice(19, 39).trim(),
        zustatek_pocatecni: cislo(l.slice(45, 59)) / 100 * (l[59] === "-" ? -1 : 1),
        zustatek_konecny: cislo(l.slice(60, 74)) / 100 * (l[74] === "-" ? -1 : 1),
        cislo_vypisu: bezNul(l.slice(105, 108)),
        obdobi_do: datumDDMMRR(l.slice(108, 114)),
        obdobi_od: datumDDMMRR(l.slice(39, 45)),
      };
    } else if (l.startsWith("075")) {
      const kod = l[60];                       // 1 debet, 2 kredit, 4/5 storna
      const znamenko = (kod === "1" || kod === "5") ? -1 : 1;
      const castka = cislo(l.slice(48, 60)) / 100 * znamenko;
      const popis = l.slice(97, 117).trim();
      radky.push({
        datum: datumDDMMRR(l.slice(91, 97)),
        castka,
        protiucet: bezNul(l.slice(19, 35)),
        vs: bezNul(l.slice(61, 71)),
        ks: bezNul(l.slice(71, 81)),
        ss: bezNul(l.slice(81, 91)),
        popis,
        poznamka: "",
        ref: bezNul(l.slice(35, 48)),          // číslo dokladu = ID u banky
      });
    }
  }
  if (!hlavicka) return null;
  return { banka: "gpc", mena: "CZK", ...hlavicka, radky };
}

// ── Moneta XML ───────────────────────────────────────────────────────────────
// Nese i počáteční a konečný zůstatek, takže se z něj dá rovnou doplnit stav účtu.
function parseMonetaXml(text) {
  const doc = new DOMParser().parseFromString(text, "application/xml");
  const acc = doc.getElementsByTagName("account")[0];
  if (!acc) return null;
  const t = (el, n) => el?.getElementsByTagName(n)[0]?.textContent?.trim() || "";
  const stmt = doc.getElementsByTagName("stmt")[0];

  const radky = Array.from(doc.getElementsByTagName("transaction")).map(tr => {
    const zpravy = tipy => Array.from(tr.getElementsByTagName("trn-messages"))
      .filter(m => m.getAttribute("type") === tipy)
      .flatMap(m => Array.from(m.getElementsByTagName("trn-message")).map(x => x.textContent.trim()))
      .filter(Boolean);
    const popis = zpravy("description").join(" ");
    const poznamka = zpravy("advice").join(" ");
    const proti = tr.getAttribute("other-account-number") || "";
    return {
      datum: tr.getAttribute("date-post") || tr.getAttribute("date-eff"),
      castka: parseFloat(tr.getAttribute("amount") || "0"),
      // u karetních plateb je v tomhle poli text („PLATBA KARTOU V ČR"), ne číslo účtu
      protiucet: /^\d/.test(proti) ? proti : "",
      vs: bezNul(tr.getAttribute("var-sym")),
      ks: bezNul(tr.getAttribute("con-sym")),
      ss: bezNul(tr.getAttribute("spec-sym")),
      popis: popis || (/^\d/.test(proti) ? "" : proti),
      poznamka,
      ref: tr.getAttribute("id") || "",
    };
  });

  return {
    banka: "moneta",
    cislo_uctu: acc.getAttribute("number") || "",
    mena: acc.getAttribute("currency") || "CZK",
    cislo_vypisu: stmt?.getAttribute("number") || "",
    obdobi_od: stmt?.getAttribute("date-previous") || null,
    obdobi_do: stmt?.getAttribute("date") || null,
    zustatek_pocatecni: parseFloat(t(acc, "stm-bgn-bal") || "0"),
    zustatek_konecny: parseFloat(doc.getElementsByTagName("stm-bal-end")[0]?.textContent || "0"),
    radky,
  };
}

// ── PDF ──────────────────────────────────────────────────────────────────────
// Z PDF se čtou textové kusy i s x-pozicí; sloupce jsou u obou bank pevné.
const cisloCZ = s => {
  const t = String(s).replace(/ |\s/g, "").replace(/(CZK|Kč)$/iu, "").replace(/^\+/, "");
  if (!/^-?[\d.,]+$/.test(t)) return null;
  // desetinný oddělovač je poslední čárka nebo tečka
  const i = Math.max(t.lastIndexOf(","), t.lastIndexOf("."));
  if (i < 0) return Number(t);
  return Number(t.slice(0, i).replace(/[.,]/g, "") + "." + t.slice(i + 1));
};
const jeDatum = s => /^\d{1,2}\.\s?\d{1,2}\.\s?\d{4}$/.test(String(s).trim());
const naIso = s => { const [d, m, r] = String(s).split(".").map(x => x.trim()); return `${r}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`; };
const vOkne = (kusy, od, do_) => kusy.filter(k => k.x >= od && k.x < do_).map(k => k.s).join(" ").trim();
const prvni = (kusy, od, do_) => kusy.find(k => k.x >= od && k.x < do_)?.s?.trim() || "";

// Air Bank — dva řádky na transakci, popisy se lámou do dalších řádků
function parseAirBankPdf(radky) {
  const hlav = {};
  for (const l of radky) {
    const t = l.kusy.map(k => k.s).join(" ");
    let m;
    if ((m = t.match(/Číslo účtu:\s*([\d-]+)\s*\/\s*(\d{4})/))) { hlav.cislo_uctu = m[1]; hlav.kod_banky = m[2]; }
    if ((m = t.match(/Období výpisu:\s*(\d{1,2}\.\s?\d{1,2}\.\s?\d{4})\s*-\s*(\d{1,2}\.\s?\d{1,2}\.\s?\d{4})/))) { hlav.obdobi_od = naIso(m[1]); hlav.obdobi_do = naIso(m[2]); }
    if ((m = t.match(/Počáteční zůstatek:\s*([\d\s .,-]+?)\s+(?:Připsáno|$)/))) hlav.zustatek_pocatecni = cisloCZ(m[1]);
    if ((m = t.match(/Konečný zůstatek:\s*([\d\s .,-]+?)\s+(?:Odepsáno|$)/))) hlav.zustatek_konecny = cisloCZ(m[1]);
    if ((m = t.match(/Číslo výpisu:\s*(\d+)/))) hlav.cislo_vypisu = m[1];
    if ((m = t.match(/Měna:\s*([A-Z]{3})/))) hlav.mena = m[1];
  }
  const out = []; let akt = null;
  for (const l of radky) {
    const datum = prvni(l.kusy, 0, 80);
    const castka = cisloCZ(vOkne(l.kusy, 440, 520));
    if (jeDatum(datum) && castka !== null) {                       // první řádek transakce
      akt = { datum: naIso(datum), castka, protiucet: "", vs: "", ks: "", ss: "",
              popis: [prvni(l.kusy, 100, 180), prvni(l.kusy, 180, 320)].filter(Boolean).join(" — "),
              poznamka: vOkne(l.kusy, 320, 440), ref: "" };
      out.push(akt);
    } else if (akt && jeDatum(datum)) {                            // druhý řádek transakce
      akt.ref = prvni(l.kusy, 100, 180);
      const proti = prvni(l.kusy, 180, 320);
      if (/^\d[\d-]*\s*\/\s*\d{4}$/.test(proti)) akt.protiucet = proti.replace(/\s/g, "");
      const d = vOkne(l.kusy, 320, 440); if (d) akt.poznamka += " " + d;
    } else if (akt) {                                              // pokračování popisu
      const d = vOkne(l.kusy, 320, 440); if (d) akt.poznamka += " " + d;
    }
  }
  out.forEach(r => { r.poznamka = r.poznamka.replace(/\s+/g, " ").trim(); });
  return { banka: "airbank", mena: hlav.mena || "CZK", ...hlav, radky: out };
}

// Raiffeisenbank — tři řádky na transakci
function parseRbPdf(radky) {
  const hlav = {};
  for (const l of radky) {
    const t = l.kusy.map(k => k.s).join(" ");
    let m;
    if ((m = t.match(/Číslo účtu:\s*([\d-]+)\/(\d{4})\s*([A-Z]{3})/))) { hlav.cislo_uctu = m[1]; hlav.kod_banky = m[2]; hlav.mena = m[3]; }
    if ((m = t.match(/Počáteční zůstatek:\s*(-?[\d\s .,]+)/))) hlav.zustatek_pocatecni = cisloCZ(m[1]);
    if ((m = t.match(/Konečný zůstatek:\s*(-?[\d\s .,]+)/))) hlav.zustatek_konecny = cisloCZ(m[1]);
    if ((m = t.match(/Pořadové č\. výpisu:\s*(\d+)/))) hlav.cislo_vypisu = m[1];
    if ((m = t.match(/za období:\s*(\d{1,2}\.\s?\d{1,2}\.\s?\d{4})\s*-\s*(\d{1,2}\.\s?\d{1,2}\.\s?\d{4})/))) { hlav.obdobi_od = naIso(m[1]); hlav.obdobi_do = naIso(m[2]); }
  }
  const out = []; let akt = null, faze = 0;
  for (const l of radky) {
    const prvniSloupec = prvni(l.kusy, 0, 90);
    const castka = cisloCZ(vOkne(l.kusy, 450, 560));
    if (jeDatum(prvniSloupec) && castka !== null) {
      akt = { datum: naIso(prvniSloupec), castka, protiucet: "", vs: prvni(l.kusy, 350, 430), ks: "", ss: "",
              popis: [prvni(l.kusy, 90, 200), vOkne(l.kusy, 200, 350)].filter(Boolean).join(" — "),
              poznamka: "", ref: "" };
      out.push(akt); faze = 1;
    } else if (akt && faze === 1 && jeDatum(prvniSloupec)) {
      akt.protiucet = prvni(l.kusy, 90, 200).replace(/\s/g, "");
      akt.ks = prvni(l.kusy, 350, 430);
      const z = vOkne(l.kusy, 200, 350); if (z) akt.poznamka += " " + z;
      faze = 2;
    } else if (akt && /^\d{6,}$/.test(prvniSloupec)) {
      akt.ref = prvniSloupec;
      const n = prvni(l.kusy, 90, 200); if (n && !akt.protiucet) akt.protiucet = n;
      else if (n) akt.poznamka += " " + n;
      akt.ss = akt.ss || prvni(l.kusy, 350, 430);
      const z = vOkne(l.kusy, 200, 350); if (z) akt.poznamka += " " + z;
      faze = 3;
    } else if (akt) {
      const z = vOkne(l.kusy, 200, 350); if (z) akt.poznamka += " " + z;
    }
  }
  out.forEach(r => { r.poznamka = r.poznamka.replace(/\s+/g, " ").trim(); });
  return { banka: "rb", mena: hlav.mena || "CZK", ...hlav, radky: out };
}

// Raiffeisenbank — výpis z kartového účtu (kreditka).
// Zůstatek je záporný = kolik je vyčerpáno z limitu.
function parseRbKartaPdf(radky) {
  const hlav = { banka: "rb_karta", mena: "CZK" };
  for (let i = 0; i < radky.length; i++) {
    const t = radky[i].kusy.map(k => k.s).join(" ");
    let m;
    if ((m = t.match(/Číslo účtu pro splátku\s*([\d-]+)\/(\d{4})/))) { hlav.cislo_uctu = m[1]; hlav.kod_banky = m[2]; }
    if ((m = t.match(/Zúčtovací období:\s*(\d{1,2}\.\s?\d{1,2}\.\s?\d{4})\s*-\s*(\d{1,2}\.\s?\d{1,2}\.\s?\d{4})/))) { hlav.obdobi_od = naIso(m[1].replace(/\s/g, "")); hlav.obdobi_do = naIso(m[2].replace(/\s/g, "")); }
    // Řádek s čísly je pod hlavičkou, ale u starší a novější šablony různě
    // daleko — hledá se první následující řádek se čtyřmi čísly.
    if (t.includes("Předchozí stav") && hlav.zustatek_konecny == null) {
      for (let j = i + 1; j <= i + 5 && j < radky.length; j++) {
        const c = radky[j].kusy.map(k => cisloCZ(k.s)).filter(x => x !== null);
        if (c.length >= 4) { hlav.zustatek_pocatecni = c[0]; hlav.zustatek_konecny = c[3]; break; }
      }
    }
  }
  const out = [];
  for (const l of radky) {
    const d1 = prvni(l.kusy, 30, 95);
    if (!/^\d{1,2}\.\s?\d{1,2}\.\s?\d{4}$/.test(d1.replace(/\s/g, ""))) continue;
    const castka = cisloCZ(vOkne(l.kusy, 380, 560));
    if (castka === null) continue;
    out.push({
      datum: naIso(d1.replace(/\s/g, "")), castka,
      protiucet: "", vs: "", ks: "", ss: "",
      popis: vOkne(l.kusy, 150, 380), poznamka: "",
      ref: naIso(d1.replace(/\s/g, "")) + "|" + castka + "|" + vOkne(l.kusy, 150, 380).slice(0, 24),
    });
  }
  return { ...hlav, radky: out };
}

// ── Komerční banka — CSV (MojeBanka → Stažení účetních dat) ─────────────────
// Středníky, kódování cp1250, hlavička v párech „klíč;hodnota", pak tabulka.
function parseKbCsv(text) {
  const radky = text.split(/\r?\n/).map(r => r.split(";"));
  const hlav = { banka: "kb", mena: "CZK" };
  let zac = -1;
  radky.forEach((r, i) => {
    const k = (r[0] || "").trim().toLowerCase(), v = (r[1] || "").trim();
    if (k === "cislo uctu") hlav.cislo_uctu = v;
    if (k.startsWith("mena uctu")) hlav.mena = v || "CZK";
    if (k === "vypis od") hlav.obdobi_od = naIso(v);
    if (k === "vypis do") hlav.obdobi_do = naIso(v);
    if (k === "cislo vypisu") hlav.cislo_vypisu = v;
    if (k === "pocatecni zustatek") hlav.zustatek_pocatecni = cisloCZ(v);
    if (k === "konecny zustatek") hlav.zustatek_konecny = cisloCZ(v);
    if (k === "datum zauctovani") zac = i;
    if (/^\d{4}$/.test(hlav.kod_banky || "") === false && k === "iban" && /^CZ\d{2}(\d{4})/.test(v))
      hlav.kod_banky = v.replace(/\s/g, "").slice(4, 8);
  });
  if (zac < 0) return null;
  const hl = radky[zac].map(x => (x || "").trim().toLowerCase());
  const idx = n => hl.indexOf(n);
  const out = [];
  for (let i = zac + 1; i < radky.length; i++) {
    const r = radky[i];
    if (!r || r.length < 5 || !(r[0] || "").trim()) continue;
    const castka = cisloCZ(r[idx("castka")]);
    if (castka === null) continue;
    const zprava = (r[idx("zprava pro prijemce")] || "").trim();
    const popisPro = (r[idx("popis pro me")] || "").trim();
    out.push({
      datum: naIso((r[0] || "").trim()),
      castka,
      protiucet: (r[idx("protistrana")] || "").trim(),
      vs: (r[idx("vs")] || "").trim().replace(/^0+/, ""),
      ks: (r[idx("ks")] || "").trim().replace(/^0+/, ""),
      ss: (r[idx("ss")] || "").trim().replace(/^0+/, ""),
      popis: [(r[idx("nazev protiuctu")] || "").trim(), popisPro, (r[idx("typ transakce")] || "").trim()].filter(Boolean).join(" — "),
      poznamka: zprava,
      ref: (r[idx("identifikace transakce")] || "").trim(),
    });
  }
  return { ...hlav, radky: out };
}

// ── Komerční banka — PDF výpis ──────────────────────────────────────────────
// Transakce začíná řádkem „datum … částka Kč", pod ním je detailní řádek
// s kódem a typem transakce a případně zpráva pro příjemce.
function parseKbPdf(radky) {
  const hlav = { banka: "kb", mena: "CZK" };
  for (const l of radky) {
    const t = l.kusy.map(k => k.s).join(" ");
    let m;
    if ((m = t.match(/Číslo účtu\s+([\d-]+)\/(\d{4})/))) { hlav.cislo_uctu = m[1]; hlav.kod_banky = m[2]; }
    if ((m = t.match(/Výpis z účtu\s*(\d{1,2}\.\s?\d{1,2}\.\s?\d{4})\s*[–-]\s*(\d{1,2}\.\s?\d{1,2}\.\s?\d{4})/))) { hlav.obdobi_od = naIso(m[1]); hlav.obdobi_do = naIso(m[2]); }
    if ((m = t.match(/Hlavní měna účtu\s+([A-Z]{3})/))) hlav.mena = m[1];
    if (/Zůstatek všech měn/.test(t)) {
      const c = l.kusy.map(k => cisloCZ(k.s)).filter(x => x !== null);
      if (c.length >= 2) { hlav.zustatek_pocatecni = c[0]; hlav.zustatek_konecny = c[1]; }
    }
  }
  const out = []; let akt = null;
  for (const l of radky) {
    const prvniS = prvni(l.kusy, 0, 110);
    const castka = cisloCZ(vOkne(l.kusy, 430, 560));
    const jeHlavicka = l.kusy.some(k => k.s.includes("Datum provedení"));
    if (jeHlavicka) continue;
    if (jeDatum(prvniS) && castka !== null) {
      akt = { datum: naIso(prvniS), castka, protiucet: "", vs: "", ks: "", ss: "", popis: "", poznamka: "", ref: "" };
      out.push(akt);
    } else if (akt && jeDatum(prvniS)) {
      akt.ref = prvni(l.kusy, 110, 230);
      akt.popis = vOkne(l.kusy, 230, 310);
      const vs = prvni(l.kusy, 310, 380); if (vs && vs !== "-") akt.vs = vs;
    } else if (akt) {
      const cely = l.kusy.map(k => k.s).join(" ");
      if (/Výpis z účtu|www\.|Strana|Komerční banka|Informace o účtu/i.test(cely)) { akt = null; continue; }
      const z = vOkne(l.kusy, 110, 310);
      if (z && !/^-+$/.test(z)) akt.poznamka += " " + z.replace(/^Zpráva pro příjemce:\s*/, "");
      const d = vOkne(l.kusy, 230, 310);
      if (d && !akt.popis.includes(d)) akt.popis += " " + d;
    }
  }
  out.forEach(r => { r.popis = r.popis.replace(/\s+/g, " ").trim(); r.poznamka = r.poznamka.replace(/\s+/g, " ").trim(); });
  return { ...hlav, radky: out };
}

// ── Načtení souboru výpisu ───────────────────────────────────────────────────
// pdf.js se stahuje až při prvním PDF, ať se nezvětšuje běžný start aplikace.
async function pdfRadky(data){
  const pdfjs=await import("pdfjs-dist/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc=new URL("pdfjs-dist/build/pdf.worker.min.mjs",import.meta.url).toString();
  const doc=await pdfjs.getDocument({data,useSystemFonts:true}).promise;
  const out=[];
  for(let p=1;p<=doc.numPages;p++){
    const st=await (await doc.getPage(p)).getTextContent();
    const map=new Map();
    for(const it of st.items){
      if(!it.str||!it.str.trim())continue;
      const y=Math.round(it.transform[5]*2)/2;
      if(!map.has(y))map.set(y,[]);
      map.get(y).push({x:it.transform[4],s:it.str});
    }
    for(const y of [...map.keys()].sort((a,b)=>b-a))
      out.push({strana:p,y,kusy:map.get(y).sort((a,b)=>a.x-b.x)});
  }
  return out;
}

// Pozná formát a vrátí jednotný tvar výpisu
// ── camt.053 (ISO 20022) — Air Bank, ČSOB, KB a další ────────────────────────
// Mezinárodní standard, takže je bohatší než GPC: nese variabilní i konstantní
// symbol, kód banky protistrany a číslo účtu i s předčíslím. Jméno protistrany
// v něm být může (element Nm), ale banka ho vyplnit nemusí — Air Bank ho nechává
// prázdné a jediné, co o odesílateli víš, je text platby v RmtInf/Ustrd.
function parseCamt053(text){
  const dom=new DOMParser().parseFromString(text,"application/xml");
  if(dom.getElementsByTagName("parsererror").length)return null;
  const prvni=(el,jmeno)=>{const n=el&&el.getElementsByTagName(jmeno);return n&&n.length?n[0]:null;};
  const txt=(el,jmeno)=>{const n=prvni(el,jmeno);return n?(n.textContent||"").trim():"";};

  const stmt=prvni(dom,"Stmt");
  if(!stmt)return null;

  const iban=txt(prvni(stmt,"Acct"),"IBAN");
  // Z českého IBANu je předčíslí na pozicích 8–13 a základ na 14–23
  let cislo_uctu="";
  if(/^CZ\d{22}$/.test(iban)){
    const pred=iban.slice(8,14).replace(/^0+/,""), zak=iban.slice(14).replace(/^0+/,"");
    cislo_uctu=pred?`${pred}-${zak}`:zak;
  }else{
    cislo_uctu=txt(prvni(stmt,"Acct"),"Id").replace(/\s/g,"");
  }

  // Zůstatky: PRCD = počáteční, CLBD = konečný. DBIT znamená mínus.
  let zustatek_pocatecni=null, zustatek_konecny=null;
  for(const b of [...stmt.getElementsByTagName("Bal")]){
    const kod=txt(prvni(b,"CdOrPrtry"),"Cd");
    const castka=parseFloat(txt(b,"Amt")||"0")*(txt(b,"CdtDbtInd")==="DBIT"?-1:1);
    if(kod==="PRCD"||kod==="OPBD")zustatek_pocatecni=castka;
    if(kod==="CLBD")zustatek_konecny=castka;
  }

  const obdobi=prvni(stmt,"FrToDt");
  const den=x=>x?x.slice(0,10):null;

  const radky=[];
  for(const n of [...stmt.getElementsByTagName("Ntry")]){
    const znamenko=txt(n,"CdtDbtInd")==="DBIT"?-1:1;
    const castka=parseFloat(txt(n,"Amt")||"0")*znamenko;
    const datum=den(txt(prvni(n,"BookgDt"),"Dt"))||den(txt(prvni(n,"ValDt"),"Dt"));
    const dtl=prvni(n,"TxDtls");

    // Protistrana: u příchozí platby je to dlužník, u odchozí věřitel
    const stranaEl =dtl&&prvni(dtl,znamenko>0?"Dbtr":"Cdtr");
    const ucetEl   =dtl&&prvni(dtl,znamenko>0?"DbtrAcct":"CdtrAcct");
    const bankaEl  =dtl&&prvni(dtl,znamenko>0?"DbtrAgt":"CdtrAgt");
    const jmeno    =stranaEl?txt(stranaEl,"Nm"):"";
    let ucet=ucetEl?(txt(ucetEl,"Othr")||txt(ucetEl,"IBAN")):"";
    ucet=String(ucet).replace(/\s/g,"");
    const kodBanky=bankaEl?txt(bankaEl,"Othr"):"";
    const protiucet=ucet?(kodBanky?`${ucet}/${kodBanky}`:ucet):"";

    // Symboly: buď ve strukturované části, nebo v EndToEndId tvaru /VS…/KS…
    let vs="",ks="",ss="";
    const e2e=dtl?txt(prvni(dtl,"Refs"),"EndToEndId"):"";
    for(const r of (dtl?[...dtl.getElementsByTagName("CdtrRefInf")]:[])){
      const v=(txt(r,"Ref")||"");
      if(/^VS:/i.test(v))vs=v.slice(3);
      else if(/^KS:/i.test(v))ks=v.slice(3);
      else if(/^SS:/i.test(v))ss=v.slice(3);
    }
    if(!vs){const m=/\/VS(\d+)/i.exec(e2e); if(m)vs=m[1];}
    if(!ks){const m=/\/KS(\d+)/i.exec(e2e); if(m)ks=m[1];}
    if(!ss){const m=/\/SS(\d+)/i.exec(e2e); if(m)ss=m[1];}

    const zprava=dtl?txt(prvni(dtl,"RmtInf"),"Ustrd"):"";
    const dodatek=dtl?txt(dtl,"AddtlTxInf"):"";
    // Jméno z banky má přednost; když ho banka nevyplní, zbývá text platby
    const popis=[jmeno,zprava&&zprava!==jmeno?zprava:""].filter(Boolean).join(" — ")
      ||dodatek||txt(n,"AddtlNtryInf")||"";

    radky.push({datum,castka,protiucet,vs,ks,ss,popis,
      poznamka:dodatek&&dodatek!==popis?dodatek:"",
      ref:txt(n,"NtryRef")||(dtl?txt(prvni(dtl,"Refs"),"AcctSvcrRef"):"")});
  }

  return {banka:"camt.053",cislo_uctu,mena:txt(prvni(stmt,"Acct"),"Ccy")||"CZK",
    obdobi_od:den(txt(obdobi,"FrDtTm")),obdobi_do:den(txt(obdobi,"ToDtTm")),
    cislo_vypisu:txt(stmt,"LglSeqNb"),zustatek_pocatecni,zustatek_konecny,radky};
}

async function nactiVypis(file){
  const jmeno=file.name.toLowerCase();
  if(jmeno.endsWith(".pdf")){
    const radky=await pdfRadky(new Uint8Array(await file.arrayBuffer()));
    const cely=radky.map(l=>l.kusy.map(k=>k.s).join(" ")).join("\n");
    // starší šablona má nadpis malými písmeny, novější velkými
    if(/výpis z kartového účtu/i.test(cely))return parseRbKartaPdf(radky);
    if(/Komerční banka|Hlavní měna účtu|Zůstatek všech měn/i.test(cely))return parseKbPdf(radky);
    if(/Raiffeisen|RZBCCZPP|Pořadové č\. výpisu/i.test(cely))return parseRbPdf(radky);
    return parseAirBankPdf(radky);
  }
  const buf=await file.arrayBuffer();
  if(jmeno.endsWith(".xml")){
    const xml=new TextDecoder("utf-8").decode(buf);
    // camt.053 se pozná podle jmenného prostoru, Moneta má vlastní formát
    if(/camt\.053|<BkToCstmrStmt/i.test(xml)){
      const v=parseCamt053(xml);
      if(v&&v.radky.length)return v;
    }
    return parseMonetaXml(xml);
  }
  if(jmeno.endsWith(".csv"))return parseKbCsv(new TextDecoder("windows-1250").decode(buf));
  // GPC/ABO je v kódování Windows-1250
  return parseGpc(new TextDecoder("windows-1250").decode(buf));
}

// ── Kategorizace podle pravidel ──────────────────────────────────────────────
const bezDiakritiky=s=>String(s||"").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase();
// Pravidlo může nést kategorii, projekt i to, koho se platba týká. Každý rozměr
// se bere z prvního pravidla, které ho vyplněné má — jedno pravidlo tak může
// určit kategorii a jiné, přesnější, projekt.
function navrhniZarazeni(radek,pravidla,ucetId){
  const text=bezDiakritiky(`${radek.popis} ${radek.poznamka} ${radek.protiucet}`);
  const castka=+radek.castka||0;
  // Samotný text nestačí. Terezino číslo účtu je v protiúčtu u splátky SJM,
  // u alimentů i u příspěvku na péči — liší se jen směrem a cílovým účtem.
  // Pravidlo si proto může vyžádat směr platby a konkrétní účet; když je
  // nevyplní, platí jako dřív pro všechno.
  const sedi=(pravidla||[]).filter(p=>{
    if(p.aktivni===false)return false;
    if(!text.includes(bezDiakritiky(p.vzor)))return false;
    if(p.smer==="prijem"&&castka<0)return false;
    if(p.smer==="vydaj" &&castka>0)return false;
    if(p.ucet_id&&ucetId&&String(p.ucet_id)!==String(ucetId))return false;
    return true;
  }).sort((a,b)=>(a.priorita??100)-(b.priorita??100));
  const subj=sedi.find(p=>p.subjekt_typ);
  return {
    kategorie_id:sedi.find(p=>p.kategorie_id)?.kategorie_id||null,
    projekt_id  :sedi.find(p=>p.projekt_id)?.projekt_id||null,
    subjekt_typ :subj?.subjekt_typ||null,
    subjekt_id  :subj?.subjekt_id||null,
    // Pravidlo může platbu rovnou přeznačit na převod — pro peníze, které
    // vypadají jako příjem, ale příjem nejsou (matka posílá zpátky hotovost,
    // proplacení nákladu, který jsme za někoho zaplatili) — a rovnou k němu
    // přiřadit protiúčet u účtů, které vlastní číslo nemají (Portu, penzijko).
    typ_navrh   :sedi.find(p=>p.typ)?.typ||null,
    prevod_navrh:sedi.find(p=>p.prevod_ucet_id)?.prevod_ucet_id||null,
    // Které pravidlo co doplnilo — bez toho se nedá poznat, proč appka
    // navrhla nesmysl, a nejde to opravit u zdroje.
    zdroje:{
      kategorie:sedi.find(p=>p.kategorie_id)?.vzor||null,
      projekt  :sedi.find(p=>p.projekt_id)?.vzor||null,
      subjekt  :subj?.vzor||null,
    },
  };
}
const navrhniKategorii=(radek,pravidla)=>navrhniZarazeni(radek,pravidla).kategorie_id;

const fmtKc=x=>(+x).toLocaleString("cs",{minimumFractionDigits:2,maximumFractionDigits:2})+" Kč";

// ── Načtení všech řádků, ne jen první tisícovky ──────────────────────────────
// PostgREST vrací na jeden dotaz nejvýš 1000 řádků bez ohledu na to, o kolik si
// řekneš v limit(). Přehledy, které počítají průměry, tím tiše přišly o novější
// měsíce — a nijak to nedaly najevo. Proto se stahuje po stránkách, dokud
// nepřijde neúplná.
async function nactiVse(dotaz,velikost=1000){
  const out=[];
  for(let od=0;od<200000;od+=velikost){
    const {data,error}=await dotaz(od,od+velikost-1);
    if(error)return {data:out,error};
    out.push(...(data||[]));
    if(!data||data.length<velikost)break;
  }
  return {data:out,error:null};
}

// ── Import výpisů ────────────────────────────────────────────────────────────
// ── Nápověda: co u které banky stáhnout ──────────────────────────────────────
// Formátů je pět a každá banka je nabízí jinak. Tady je vždycky ten, který
// nese nejvíc údajů — ověřeno na skutečných výpisech, ne podle dokumentace.
const FORMATY=[
  {banka:"Air Bank — podnikatelský",format:"XML (camt.053)",kde:"Výpisy → Formát: XML",
   pozn:"Jediný nese variabilní symbol u všech plateb a kód banky protistrany.",top:true},
  {banka:"Air Bank — osobní účty",format:"PDF",kde:"Výpisy → Formát: PDF",
   pozn:"XML ani GPC u osobních účtů nejsou. PDF neobsahuje variabilní symboly."},
  {banka:"Fio",format:"GPC/ABO",kde:"Přehledy → Výpisy → ABO",
   pozn:"U příchozích plateb uvádí i jméno odesílatele.",top:true},
  {banka:"Moneta",format:"XML",kde:"Výpisy → Formát: XML",
   pozn:"GPC z Monety nepoužívej — uvádí v něm jiné číslo účtu a nespáruje se.",top:true},
  {banka:"Komerční banka",format:"CSV",kde:"MojeBanka → Transakční historie → CSV",
   pozn:"Umí celé pololetí v jednom souboru. Rozdělí se podle data samo.",top:true},
  {banka:"Raiffeisenbank",format:"PDF",kde:"Výpisy → PDF",
   pozn:"Běžný i spořicí účet."},
  {banka:"RB kreditní karta",format:"PDF",kde:"Výpisy z kartového účtu",
   pozn:"Období jde od 14. do 14., ne po měsících."},
];

function NapovedaFormatu(){
  const [otevreno,setOtevreno]=useState(true);
  return <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"12px 16px",flex:"1 1 400px",minWidth:290,textAlign:"left"}}>
    <div onClick={()=>setOtevreno(o=>!o)} style={{display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer"}}>
      <div style={{fontSize:13,fontWeight:800}}>💡 Co u které banky stáhnout</div>
      <span style={{fontSize:11,color:C.muted}}>{otevreno?"skrýt":"ukázat"}</span>
    </div>
    {otevreno&&<>
      <div style={{fontSize:11,color:C.muted,margin:"6px 0 10px"}}>
        Když má banka víc formátů, ber ten zvýrazněný — nese nejvíc údajů.
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {FORMATY.map(f=><div key={f.banka} style={{borderLeft:`3px solid ${f.top?C.green:C.border}`,paddingLeft:9}}>
          <div style={{display:"flex",justifyContent:"space-between",gap:8,alignItems:"baseline",flexWrap:"wrap"}}>
            <span style={{fontSize:12,fontWeight:700}}>{f.banka}</span>
            <span style={{fontSize:11,fontWeight:800,color:f.top?C.green:C.muted,whiteSpace:"nowrap"}}>{f.format}</span>
          </div>
          <div style={{fontSize:10,color:C.dim}}>{f.kde}</div>
          <div style={{fontSize:10,color:C.muted,marginTop:1}}>{f.pozn}</div>
        </div>)}
      </div>
      <div style={{fontSize:10,color:C.dim,marginTop:10,borderTop:`1px solid ${C.border}`,paddingTop:7}}>
        Nahrát ten samý měsíc podruhé v lepším formátu nevadí — nic se nezdvojí,
        jen se u už uložených plateb nabídne doplnění chybějících údajů.
      </div>
    </>}
  </div>;
}

function ImportVypisu({ucty,kategorie,projekty,deti,auta,reloadProjekty,onHotovo}){
  const {data:pravidla,reload:reloadPravidla}=useData(()=>sb.from("fin_pravidla").select("*").order("priorita"));
  const {data:importy,reload:reloadImporty}=useData(()=>sb.from("fin_importy").select("*").order("created_at",{ascending:false}).limit(400));
  const [fUcet,setFUcet]=useState("");     // filtr historie importů
  const [fMesic,setFMesic]=useState("");
  // Jen datumy a účty — na zjištění, co chybí, víc netřeba.
  const {data:pokryti}=useData(()=>nactiVse((od,do_)=>sb.from("fin_transakce")
    .select("ucet_id,datum").eq("zdroj","import").order("datum").range(od,do_)));
  const [davky,setDavky]=useState([]);      // načtené výpisy čekající na uložení
  const [stav,setStav]=useState("");
  const [uklada,setUklada]=useState(false);

  // Čísla účtů chodí v různých tvarech: „4522946002/5500", „115-2728360227"
  // i „000000-0592521001/2010". Porovnává se tedy základ bez předčíslí a bez
  // vodicích nul; když mají obě strany předčíslí, musí sedět taky.
  const rozlozCislo=c=>{
    const bezBanky=String(c||"").split("/")[0].trim();
    if(!bezBanky)return null;
    const i=bezBanky.lastIndexOf("-");
    const predcisli=(i<0?"":bezBanky.slice(0,i)).replace(/^0+/,"");
    const zaklad=(i<0?bezBanky:bezBanky.slice(i+1)).replace(/^0+/,"");
    return zaklad?{predcisli,zaklad}:null;
  };
  const ucetPodleCisla=cislo=>{
    const a=rozlozCislo(cislo);
    if(!a)return null;
    return (ucty||[]).find(u=>{
      const b=rozlozCislo(u.cislo_uctu);
      if(!b||b.zaklad!==a.zaklad)return false;
      return !a.predcisli||!b.predcisli||a.predcisli===b.predcisli;
    })||null;
  };
  // Přesuny, které nejsou pohybem peněz dovnitř ani ven, ale nemají protiúčet:
  //  · splátka kreditní karty („VAŠE PLATBA — DĚKUJEME" na kartovém výpisu)
  //  · vklad vlastní hotovosti do bankomatu
  const jeVlastniPresun=r=>{
    const t=`${r.popis||""} ${r.poznamka||""}`;
    return /va[šs]e platba/i.test(t)||/vklad hotovosti/i.test(t);
  };

  const nacti=async e=>{
    const soubory=[...(e.target.files||[])];
    if(!soubory.length)return;
    setStav("Čtu soubory…");
    const nove=[];
    for(const f of soubory){
      try{
        const v=await nactiVypis(f);
        if(!v||!v.radky?.length){nove.push({soubor:f.name,chyba:"Nepodařilo se přečíst — neznámý formát výpisu."});continue;}
        const ucet=ucetPodleCisla(v.cislo_uctu);
        // duplicity proti tomu, co už v databázi je
        let existujici=new Set(), rucni=[]; const jizUlozene=new Map(), ulozeneRadky=new Map();
        if(ucet){
          const {data}=await sb.from("fin_transakce").select("banka_ref").eq("ucet_id",ucet.id).not("banka_ref","is",null);
          existujici=new Set((data||[]).map(x=>x.banka_ref));
          // Pojistka pro případ, že se klíč mezi verzemi změnil: co už je z importu
          // uložené na stejný den a částku, se považuje za tutéž transakci.
          const {data:h}=await sb.from("fin_transakce").select("id,datum,castka,popis,protistrana,vs")
            .eq("ucet_id",ucet.id).eq("zdroj","import")
            .gte("datum",v.obdobi_od||"1900-01-01").lte("datum",v.obdobi_do||"2100-01-01");
          for(const x of (h||[])){
            const k=`${x.datum}|${(+x.castka).toFixed(2)}`;
            jizUlozene.set(k,(jizUlozene.get(k)||0)+1);
            if(!ulozeneRadky.has(k))ulozeneRadky.set(k,[]);
            ulozeneRadky.get(k).push(x);
          }
          // Ruční a modulové záznamy ve stejném období — můžou to být tytéž peníze
          const {data:r}=await sb.from("fin_transakce").select("id,datum,castka,popis,zdroj")
            .eq("ucet_id",ucet.id).is("banka_ref",null)
            .gte("datum",v.obdobi_od||"1900-01-01").lte("datum",v.obdobi_do||"2100-01-01");
          rucni=r||[];
        }
        const najdiKolizi=r=>rucni.find(x=>Math.abs(+x.castka-r.castka)<0.01
          &&Math.abs(new Date(x.datum)-new Date(r.datum))/86400000<=3);
        // Klíč proti duplicitám musí obstát u všech bank:
        //  · Moneta dává dvěma různým transakcím stejné ID (úrok a daň z úroku)
        //  · Komerčka nedává ID transakce, ale kód jejího typu, který se opakuje
        //    každý měsíc (90000201001 = připsaný úrok)
        // Proto klíč obsahuje datum i částku a při shodě ještě pořadí výskytu.
        const pocty=new Map();
        const udelejKlic=r=>{
          const zaklad=`${r.ref||""}|${r.datum}|${r.castka}`.slice(0,140);
          const n=(pocty.get(zaklad)||0)+1; pocty.set(zaklad,n);
          return n===1?zaklad:`${zaklad}#${n}`;
        };
        const radky=v.radky.map((r,i)=>({
          ...r,
          klic:udelejKlic(r),
          duplicita:false,   // doplní se hned po sestavení klíčů
          ...navrhniZarazeni(r,pravidla,ucet?.id),
          kolize:najdiKolizi(r)||null,
          smazatKolizi:true,
          vybrano:true,
        }));
        const pouzite=new Map();
        radky.forEach(r=>{
          const k=`${r.datum}|${(+r.castka).toFixed(2)}`;
          const zbyva=jizUlozene.get(k)||0;
          if(existujici.has(r.klic))r.duplicita=true;
          else if(zbyva>0){r.duplicita=true;jizUlozene.set(k,zbyva-1);}
          else r.duplicita=false;
          r.vybrano=!r.duplicita;
          // Duplicita ještě neznamená, že uložený řádek je úplný. Výpis v GPC
          // nenese jméno protistrany, PDF ano — proto se u shodných řádků
          // pozná, co v databázi chybí, a dá se to doplnit bez nového importu.
          if(r.duplicita){
            const kandidati=ulozeneRadky.get(k)||[];
            const i=(pouzite.get(k)||0);
            const stary=kandidati[i];
            if(stary){
              pouzite.set(k,i+1);
              const novyPopis=[r.popis,r.poznamka].filter(Boolean).join(" · ").slice(0,300);
              const lepsiPopis=novyPopis&&novyPopis.length>String(stary.popis||"").length;
              // Protiúčet je lepší, když ho dřív nebyl žádný, nebo když nový nese
              // navíc kód banky či předčíslí — camt.053 je má, GPC ne.
              const lepsiProti=r.protiucet&&(!stary.protistrana
                ||(r.protiucet.includes("/")&&!String(stary.protistrana).includes("/"))
                ||(r.protiucet.includes("-")&&!String(stary.protistrana).includes("-")));
              const lepsiVs=r.vs&&!stary.vs;
              if(lepsiPopis||lepsiProti||lepsiVs)r.doplnit={id:stary.id,
                popis:lepsiPopis?novyPopis:undefined,
                protistrana:lepsiProti?r.protiucet:undefined,
                vs:lepsiVs?r.vs:undefined,
                stary:stary.popis||""};
            }
          }
        });
        const suma=radky.reduce((a,r)=>a+r.castka,0);
        const sedi=v.zustatek_pocatecni!=null&&v.zustatek_konecny!=null
          ? Math.abs(v.zustatek_pocatecni+suma-v.zustatek_konecny)<0.02 : null;
        nove.push({soubor:f.name,vypis:v,ucet,ucet_id:ucet?.id||"",radky,suma,sedi});
      }catch(err){
        const m=String(err.message||err);
        // Po nasazení nové verze má otevřená stránka staré názvy souborů
        const stara=/dynamically imported module|Failed to fetch dynamically/i.test(m);
        nove.push({soubor:f.name,chyba:stara
          ? "Máš v prohlížeči starou verzi aplikace. Načti stránku znovu (Ctrl+F5) a zkus to zas — nic se nepokazilo."
          : m});
      }
    }
    setDavky(d=>[...d,...nove]);setStav("");e.target.value="";
  };

  const uprav=(di,ri,zmena)=>setDavky(d=>d.map((b,i)=>i!==di?b:{...b,radky:b.radky.map((r,j)=>j!==ri?r:{...r,...zmena})}));

  // Doplnění chybějících údajů u plateb, které v databázi už jsou. Používá se,
  // když se tentýž měsíc stáhne v lepším formátu (PDF místo GPC).
  const doplnUdaje=async davka=>{
    const kDoplneni=davka.radky.filter(r=>r.doplnit);
    if(!kDoplneni.length)return;
    setUklada(true);
    let hotovo=0;
    for(const r of kDoplneni){
      const patch={};
      if(r.doplnit.popis)patch.popis=r.doplnit.popis;
      if(r.doplnit.protistrana)patch.protistrana=r.doplnit.protistrana;
      if(r.doplnit.vs)patch.vs=r.doplnit.vs;
      if(!Object.keys(patch).length)continue;
      const {error}=await sb.from("fin_transakce").update(patch).eq("id",r.doplnit.id);
      if(error){setUklada(false);alert("Chyba: "+error.message);return;}
      hotovo++;
    }
    setUklada(false);
    alert(`Doplněno u ${hotovo} plateb.`);
    onHotovo&&onHotovo();
  };

  const uloz=async(davka,tise)=>{
    if(!davka.ucet_id){if(!tise)alert("Nejdřív vyber, do kterého účtu výpis patří.");return 0;}
    setUklada(true);
    const kVlozeni=davka.radky.filter(r=>r.vybrano&&!r.duplicita);
    const kSmazani=davka.radky.filter(r=>r.vybrano&&!r.duplicita&&r.kolize&&r.smazatKolizi).map(r=>r.kolize.id);
    if(kSmazani.length){
      const {error}=await sb.from("fin_transakce").delete().in("id",kSmazani);
      if(error){setUklada(false);alert("Chyba při mazání ručních záznamů: "+error.message);return;}
    }
    const rows=kVlozeni.map(r=>{
      const cizi=r.protiucet?ucetPodleCisla(r.protiucet):null;   // převod mezi vlastními účty
      const protiucetZPravidla=!cizi&&r.prevod_navrh?r.prevod_navrh:null;
      const interni=!!cizi||!!protiucetZPravidla||jeVlastniPresun(r)||r.typ_navrh==="prevod";
      return {
        ucet_id:davka.ucet_id,datum:r.datum,castka:r.castka,
        kategorie_id:r.kategorie_id||null,
        projekt_id:r.projekt_id||null,
        subjekt_typ:r.subjekt_typ||null,
        subjekt_id:r.subjekt_id||null,
        popis:[r.popis,r.poznamka].filter(Boolean).join(" · ").slice(0,300),
        protistrana:r.protiucet||null,
        typ:interni?"prevod":(r.castka>=0?"prijem":"vydaj"),
        prevod_ucet_id:cizi?cizi.id:protiucetZPravidla,
        banka_ref:r.klic,vs:r.vs||null,poznamka:r.poznamka||null,zdroj:"import",
      };
    });
    let vlozeno=0;
    for(let i=0;i<rows.length;i+=200){
      const {error}=await sb.from("fin_transakce").insert(rows.slice(i,i+200));
      if(error){setUklada(false);if(!tise)alert("Chyba při ukládání transakcí: "+error.message);throw new Error(`${davka.soubor}: ${error.message}`);}
      vlozeno+=rows.slice(i,i+200).length;
    }
    // Konečný zůstatek z výpisu rovnou do měsíčních stavů účtu — ale jen tehdy,
    // když výpis končí posledním dnem měsíce. Výpis z kreditky jde od půlky do
    // půlky, takže jeho zůstatek není stav k poslednímu dni a zapsat se nesmí.
    const v=davka.vypis;
    if(v.zustatek_konecny!=null&&v.obdobi_do){
      const d=new Date(v.obdobi_do);
      const posledniDenMesice=new Date(d.getFullYear(),d.getMonth()+1,0).getDate();
      if(d.getDate()===posledniDenMesice)
        await sb.from("fin_stavy").upsert({ucet_id:davka.ucet_id,rok:d.getFullYear(),mesic:d.getMonth()+1,stav:v.zustatek_konecny},{onConflict:"ucet_id,rok,mesic"});
    }
    await sb.from("fin_importy").insert({ucet_id:davka.ucet_id,soubor:davka.soubor,banka:v.banka,
      obdobi_od:v.obdobi_od||null,obdobi_do:v.obdobi_do||null,
      pocet_novych:vlozeno,pocet_duplicit:davka.radky.filter(r=>r.duplicita).length,
      zustatek_konecny:v.zustatek_konecny??null});
    setDavky(d=>d.filter(x=>x!==davka));
    setUklada(false);reloadImporty();onHotovo&&onHotovo();
    if(!tise)alert(`Uloženo ${vlozeno} transakcí.`);
    return vlozeno;
  };

  // Uložit všechny načtené výpisy najednou — u desítek souborů je klikání po kartách nesmysl
  const ulozVse=async()=>{
    const pripravene=davky.filter(b=>!b.chyba&&b.ucet_id);
    if(!pripravene.length){alert("Není co uložit — dávky bez rozpoznaného účtu musíš doplnit ručně.");return;}
    if(!confirm(`Uložit ${pripravene.length} výpisů do databáze?`))return;
    setUklada(true);
    let celkem=0; const chyby=[];
    for(const b of pripravene){
      setStav(`Ukládám ${b.soubor}…`);
      try{ celkem+=(await uloz(b,true))||0; }
      catch(e){ chyby.push(String(e.message||e)); }
    }
    setStav("");setUklada(false);
    alert(chyby.length
      ? `Uloženo ${celkem} transakcí. ${chyby.length} výpisů se nepodařilo uložit:\n\n${chyby.slice(0,5).join("\n")}`
      : `Hotovo — uloženo ${celkem} transakcí z ${pripravene.length} výpisů.`);
  };

  // Výpis, který nekončí posledním dnem měsíce (typicky kreditka), se do stavů
  // účtu nezapisuje sám — tohle je ruční „přesto zapsat" na jedno kliknutí.
  const zapisStav=async davka=>{
    const v=davka.vypis;
    if(!davka.ucet_id||v.zustatek_konecny==null||!v.obdobi_do)return;
    const d=new Date(v.obdobi_do);
    const {error}=await sb.from("fin_stavy").upsert({ucet_id:davka.ucet_id,rok:d.getFullYear(),mesic:d.getMonth()+1,stav:v.zustatek_konecny},{onConflict:"ucet_id,rok,mesic"});
    if(error){alert("Chyba: "+error.message);return;}
    onHotovo&&onHotovo();
    alert(`Zůstatek ${fmtKc(v.zustatek_konecny)} zapsán jako stav za ${d.getMonth()+1}/${d.getFullYear()}.`);
  };

  // Pravidlo si pamatuje všechny tři rozměry naráz — kategorii, projekt
  // i koho se platba týká. Prázdné se do pravidla nedává, ať nepřepíše
  // to, co určuje jiné, přesnější pravidlo.
  const [pravidloModal,setPravidloModal]=useState(null);
  const otevriPravidlo=r=>{
    const cely=[r.popis,r.poznamka].filter(Boolean).join(" · ");
    const kandidati=[...new Set(cely.split(/\s·\s|\s—\s/).map(x=>x.trim())
      .filter(x=>x.length>=3&&x.length<=60&&!jeObecny(x)))];
    const patch={};
    if(r.kategorie_id)patch.kategorie_id=r.kategorie_id;
    if(r.projekt_id)  patch.projekt_id=r.projekt_id;
    if(r.subjekt_typ){patch.subjekt_typ=r.subjekt_typ;patch.subjekt_id=r.subjekt_id||null;}
    setPravidloModal({
      vzorNavrh:kandidati[0]||"",
      kandidati,patch,smer:+r.castka>0?"prijem":"vydaj",
      popisPatche:[katNazev(r.kategorie_id),
        (projekty||[]).find(x=>String(x.id)===String(r.projekt_id))?.nazev,
        subjektNazev(r.subjekt_typ,r.subjekt_id,deti,auta)].filter(Boolean).join(" · "),
    });
  };

  const ulozPravidlo=async(vzor,r)=>{
    const v=(vzor||"").trim();
    const patch={};
    if(r.kategorie_id)patch.kategorie_id=r.kategorie_id;
    if(r.projekt_id)  patch.projekt_id=r.projekt_id;
    if(r.subjekt_typ){patch.subjekt_typ=r.subjekt_typ;patch.subjekt_id=r.subjekt_id||null;}
    if(!v||!Object.keys(patch).length)return;
    // Směr se bere z té platby, ze které se pravidlo učí — pravidlo naučené
    // na výdaji nemá zařazovat příjem, i když text sedí.
    patch.smer=+r.castka>0?"prijem":"vydaj";
    const {error}=await sb.from("fin_pravidla").insert({vzor:v,priorita:50,...patch});
    if(error&&/duplicate|unique/i.test(error.message)){
      const {data:stare}=await sb.from("fin_pravidla").select("id").ilike("vzor",v).limit(1);
      if(stare?.length)await sb.from("fin_pravidla").update(patch).eq("id",stare[0].id);
    }else if(error){alert("Chyba: "+error.message);return;}
    reloadPravidla();alert(`Pravidlo „${v}" uloženo — příště se zařazení doplní samo.`);
  };

  const katNazev=id=>(kategorie||[]).find(k=>k.id===id)?.nazev||"";

  // Projekt, který ještě neexistuje, se dá založit rovnou od platby — jinak by
  // se kvůli němu musel opustit rozdělaný import a výpis nahrát znovu.
  // Pozná se to samé, co při ukládání — ať je v náhledu vidět, že řádek
  // skončí jako převod a zařazovat ho nemá smysl.
  const prevodNahled=r=>{
    const cizi=r.protiucet?ucetPodleCisla(r.protiucet):null;
    if(cizi)return {ucet:cizi.nazev};
    if(r.prevod_navrh){
      const u=(ucty||[]).find(x=>String(x.id)===String(r.prevod_navrh));
      return {ucet:u?u.nazev:"vlastní účet"};
    }
    if(jeVlastniPresun(r))return {ucet:null};
    if(r.typ_navrh==="prevod")return {ucet:null};
    return null;
  };

  const novyProjekt=async(di,ri)=>{
    const nazev=window.prompt("Název nového projektu:","");
    if(!nazev||!nazev.trim())return;
    const {data,error}=await sb.from("fin_projekty")
      .insert({nazev:nazev.trim(),emoji:"📁",typ:"provoz",poradi:50}).select().single();
    if(error){alert("Nepodařilo se založit: "+error.message);return;}
    uprav(di,ri,{projekt_id:data.id});
    reloadProjekty&&reloadProjekty();
  };

  return <div>
    {pravidloModal&&<PravidloModal {...pravidloModal} jenPravidlo
      onClose={()=>setPravidloModal(null)}
      onHotovo={(pocet,vzor)=>{setPravidloModal(null);reloadPravidla();
        alert(`Pravidlo „${vzor}" uloženo — sedí na ${pocet} plateb v databázi a příští importy zařadí samo.`);}}/>}
    <div style={{display:"flex",gap:14,marginBottom:18,flexWrap:"wrap",alignItems:"flex-start"}}>
      <div style={{background:"#eef4fc",border:"1px solid #b3d1f0",borderRadius:12,padding:"14px 18px",flex:"1 1 340px",textAlign:"left"}}>
        <div style={{fontSize:13,fontWeight:800,color:"#1a4fa8",marginBottom:6}}>📥 Načíst výpis z banky</div>
        <div style={{fontSize:12,color:"#3066b0",marginBottom:12,lineHeight:1.5}}>
          Můžeš vybrat víc souborů najednou, klidně z různých bank.
          Formát i účet si najde sám. Nic se neuloží, dokud to nepotvrdíš.
        </div>
        <div>
          <label style={{...btnC(C.blue),cursor:"pointer",display:"inline-block",fontSize:13,padding:"8px 16px"}}>
            Vybrat soubory
            <input type="file" multiple accept=".pdf,.xml,.gpc,.abo,.txt,.csv" onChange={nacti} style={{display:"none"}}/>
          </label>
          {stav&&<span style={{marginLeft:12,fontSize:12,fontWeight:700,color:"#1a4fa8"}}>{stav}</span>}
        </div>
      </div>
      <NapovedaFormatu/>
    </div>

    {davky.length>1&&<div style={{background:C.surface,border:`2px solid ${C.accent}`,borderRadius:12,padding:"12px 16px",marginBottom:16,display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap",position:"sticky",top:54,zIndex:20}}>
      <div style={{fontSize:13}}>
        <strong>{davky.length}</strong> načtených výpisů ·
        {" "}<strong>{davky.reduce((a,b)=>a+(b.radky?.filter(r=>r.vybrano&&!r.duplicita).length||0),0)}</strong> transakcí k uložení
        {davky.some(b=>!b.chyba&&!b.ucet_id)&&<span style={{color:C.orange,fontWeight:700}}> · {davky.filter(b=>!b.chyba&&!b.ucet_id).length} bez účtu</span>}
        {davky.some(b=>b.sedi===false)&&<span style={{color:C.red,fontWeight:700}}> · {davky.filter(b=>b.sedi===false).length} nesedí zůstatek</span>}
      </div>
      <div style={{display:"flex",gap:8}}>
        <button onClick={()=>setDavky([])} disabled={uklada} style={{...btnC(C.muted,true),fontSize:12,padding:"6px 12px"}}>Zahodit vše</button>
        <button onClick={ulozVse} disabled={uklada} style={{...btnC(),fontSize:13,padding:"8px 18px"}}>{uklada?"Ukládám…":"Uložit všechny"}</button>
      </div>
    </div>}

    {davky.map((b,di)=><div key={di} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:16,marginBottom:16}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:10}}>
        <div>
          <div style={{fontWeight:800,fontSize:14}}>{b.soubor}</div>
          {b.chyba
            ? <div style={{color:C.red,fontSize:12,marginTop:4}}>{b.chyba}</div>
            : <div style={{color:C.muted,fontSize:12,marginTop:4}}>
                účet {b.vypis.cislo_uctu} · {b.vypis.obdobi_od} → {b.vypis.obdobi_do} · {b.radky.length} transakcí
              </div>}
        </div>
        <button onClick={()=>setDavky(d=>d.filter((_,i)=>i!==di))} style={{...btnC(C.muted,true),fontSize:12,padding:"4px 10px"}}>Zahodit</button>
      </div>

      {!b.chyba&&<>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:10,marginBottom:12}}>
          {[["Počáteční",fmtKc(b.vypis.zustatek_pocatecni??0)],
            ["Pohyby",fmtKc(b.suma)],
            ["Konečný dle výpisu",fmtKc(b.vypis.zustatek_konecny??0)],
            ["Kontrola",b.sedi===null?"—":b.sedi?"✓ sedí":"✗ nesedí"]].map(([l,v])=>
            <div key={l} style={{background:C.bg,borderRadius:8,padding:"8px 10px"}}>
              <div style={{fontSize:10,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:.4}}>{l}</div>
              <div style={{fontSize:14,fontWeight:700,color:l==="Kontrola"?(b.sedi?C.green:C.red):C.text}}>{v}</div>
            </div>)}
        </div>
        {(()=>{
          const dd=b.vypis.obdobi_do?new Date(b.vypis.obdobi_do):null;
          if(!dd||dd.getDate()===new Date(dd.getFullYear(),dd.getMonth()+1,0).getDate())return null;
          return <div style={{background:"#eef4fc",border:"1px solid #b3d1f0",borderRadius:8,padding:"8px 12px",fontSize:12,color:"#1a4fa8",marginBottom:12,display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
            <span>Výpis končí {dd.toLocaleDateString("cs-CZ")}, ne koncem měsíce — zůstatek se proto do měsíčních stavů účtu nezapíše sám.</span>
            <button onClick={()=>zapisStav(b)} disabled={!b.ucet_id} style={{...btnC(C.blue,true),fontSize:11,padding:"3px 10px"}}>Přesto zapsat jako stav za {dd.getMonth()+1}/{dd.getFullYear()}</button>
          </div>;
        })()}
        {b.sedi===false&&<div style={{background:"#fff8e1",border:"1px solid #f5a623",borderRadius:8,padding:"8px 12px",fontSize:12,color:"#c87000",marginBottom:12}}>
          Součet pohybů nesedí na konečný zůstatek — něco se z výpisu nepřečetlo. Radši neukládej a pošli mi ten soubor.
        </div>}

        <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:12,flexWrap:"wrap"}}>
          <span style={{fontSize:12,fontWeight:700,color:C.muted}}>Účet:</span>
          <select style={{...inp,maxWidth:280}} value={b.ucet_id} onChange={e=>setDavky(d=>d.map((x,i)=>i===di?{...x,ucet_id:e.target.value}:x))}>
            <option value="">— vyber účet —</option>
            {(ucty||[]).map(u=><option key={u.id} value={u.id}>{u.nazev}{u.cislo_uctu?` (${u.cislo_uctu})`:""}</option>)}
          </select>
          {b.ucet&&<span style={{fontSize:12,color:C.green,fontWeight:700}}>✓ spárováno podle čísla účtu</span>}
          {!b.ucet&&<span style={{fontSize:12,color:C.orange,fontWeight:700}}>číslo účtu {b.vypis.cislo_uctu} není u žádného účtu — vyber ručně</span>}
        </div>

        <div style={{maxHeight:420,overflowY:"auto",border:`1px solid ${C.border}`,borderRadius:8}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead><tr style={{background:C.bg,position:"sticky",top:0}}>
              {["","Datum","Popis","Částka","Zařazení",""].map(h=><th key={h} style={{padding:"7px 8px",textAlign:"left",fontSize:10,fontWeight:700,color:C.muted,textTransform:"uppercase"}}>{h}</th>)}
            </tr></thead>
            <tbody>
              {b.radky.map((r,ri)=><tr key={ri} style={{borderBottom:`1px solid ${C.border}`,opacity:r.duplicita?.45:1,background:ri%2?"#fafbff":C.surface}}>
                <td style={{padding:"6px 8px"}}>
                  <input type="checkbox" checked={r.vybrano&&!r.duplicita} disabled={r.duplicita} onChange={e=>uprav(di,ri,{vybrano:e.target.checked})}/>
                </td>
                <td style={{padding:"6px 8px",whiteSpace:"nowrap"}}>{new Date(r.datum).toLocaleDateString("cs-CZ")}</td>
                <td style={{padding:"6px 8px",maxWidth:280}}>
                  <div style={{fontWeight:600}}>{r.popis||"—"}</div>
                  {r.poznamka&&<div style={{color:C.dim,fontSize:11}}>{r.poznamka.slice(0,70)}</div>}
                  {(r.protiucet||r.vs)&&<div style={{color:C.muted,fontSize:11,marginTop:1}}>
                    {r.protiucet&&<span>➜ {r.protiucet}</span>}
                    {r.protiucet&&r.vs&&<span> · </span>}
                    {r.vs&&<span>VS {r.vs}</span>}
                  </div>}
                  {r.duplicita&&<div style={{color:C.orange,fontSize:11,fontWeight:700}}>už je v databázi</div>}
                  {r.kolize&&!r.duplicita&&<div style={{color:"#c87000",fontSize:11,marginTop:2}}>
                    <label style={{cursor:"pointer",display:"flex",alignItems:"center",gap:5}}>
                      <input type="checkbox" checked={r.smazatKolizi} onChange={e=>uprav(di,ri,{smazatKolizi:e.target.checked})}/>
                      <span>tytéž peníze už máš ručně ({new Date(r.kolize.datum).toLocaleDateString("cs-CZ")}, {r.kolize.popis?.slice(0,26)}) — smazat ten ruční</span>
                    </label>
                  </div>}
                </td>
                <td style={{padding:"6px 8px",whiteSpace:"nowrap",fontWeight:700,color:r.castka<0?C.red:C.green}}>{fmtKc(r.castka)}</td>
                <td style={{padding:"6px 8px",minWidth:210}}>
                  {prevodNahled(r)
                    ? <div style={{fontSize:11,color:"#9a5b00",background:"#fff3e0",border:"1px solid #f0c98a",
                                   borderRadius:8,padding:"4px 9px",display:"inline-block",fontWeight:700}}>
                        🔄 převod{prevodNahled(r).ucet?` ${+r.castka<0?"→":"←"} ${prevodNahled(r).ucet}`:""}
                        <div style={{fontWeight:400,color:"#a8763a",fontSize:10.5}}>nepočítá se do příjmů ani výdajů</div>
                      </div>
                    : <>
                  {/* Všechny tři rozměry rovnou při importu — za co, na čem, pro koho. */}
                  <VyberKategorie hodnota={r.kategorie_id} kategorie={kategorie} prijem={+r.castka>0}
                    sirka={200} onVyber={id=>uprav(di,ri,{kategorie_id:id||null})}/>
                  <div style={{display:"flex",gap:5,marginTop:4,flexWrap:"wrap"}}>
                    {(projekty||[]).length>0&&
                      <select style={{...inp,padding:"2px 5px",fontSize:10.5,width:"auto",maxWidth:120}}
                        value={r.projekt_id||""}
                        onChange={e=>e.target.value==="__novy"?novyProjekt(di,ri):uprav(di,ri,{projekt_id:e.target.value?+e.target.value:null})}>
                        <option value="">— projekt —</option>
                        {(projekty||[]).map(x=><option key={x.id} value={x.id}>{x.emoji||"📁"} {x.nazev}</option>)}
                        <option value="__novy">➕ nový projekt…</option>
                      </select>}
                    <SubjektSelect deti={deti} auta={auta}
                      value={r.subjekt_typ?`${r.subjekt_typ}|${r.subjekt_id||""}`:""}
                      onChange={v=>{const [tp,id]=String(v).split("|");uprav(di,ri,{subjekt_typ:tp||null,subjekt_id:id||null});}}
                      style={{...inp,padding:"2px 5px",fontSize:10.5,width:"auto",maxWidth:120}}/>
                  </div>
                  {r.zdroje&&(r.zdroje.kategorie||r.zdroje.projekt||r.zdroje.subjekt)&&
                    <div style={{fontSize:10,color:C.dim,marginTop:3}}>
                      podle pravidel: {[
                        r.zdroje.kategorie&&`„${r.zdroje.kategorie}" → kategorie`,
                        r.zdroje.projekt&&`„${r.zdroje.projekt}" → projekt`,
                        r.zdroje.subjekt&&`„${r.zdroje.subjekt}" → koho se týká`,
                      ].filter(Boolean).join(" · ")}
                    </div>}
                    </>}
                </td>
                <td style={{padding:"6px 4px"}}>
                  {(r.kategorie_id||r.projekt_id||r.subjekt_typ)&&r.popis&&
                    <button title={`Zapamatovat „${r.popis.slice(0,24)}" → ${[katNazev(r.kategorie_id),
                      (projekty||[]).find(x=>String(x.id)===String(r.projekt_id))?.nazev,
                      subjektNazev(r.subjekt_typ,r.subjekt_id,deti,auta)].filter(Boolean).join(" · ")}`}
                      onClick={()=>otevriPravidlo(r)}
                      style={{...btnC(C.accent,true),padding:"2px 6px",fontSize:10}}>＋pravidlo</button>}
                </td>
              </tr>)}
            </tbody>
          </table>
        </div>

        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:12,flexWrap:"wrap",gap:8}}>
          <div style={{fontSize:12,color:C.muted}}>
            k uložení <strong>{b.radky.filter(r=>r.vybrano&&!r.duplicita).length}</strong> ·
            duplicit <strong>{b.radky.filter(r=>r.duplicita).length}</strong> ·
            převodů <strong>{b.radky.filter(r=>r.vybrano&&!r.duplicita&&prevodNahled(r)).length}</strong> ·
            bez kategorie <strong>{b.radky.filter(r=>r.vybrano&&!r.duplicita&&!prevodNahled(r)&&!r.kategorie_id).length}</strong> ·
            bez určení koho se týká <strong>{b.radky.filter(r=>r.vybrano&&!r.duplicita&&!prevodNahled(r)&&!r.subjekt_typ).length}</strong>
            {b.radky.some(r=>r.kolize&&!r.duplicita)&&<> · nahradí ručních <strong style={{color:"#c87000"}}>{b.radky.filter(r=>r.vybrano&&!r.duplicita&&r.kolize&&r.smazatKolizi).length}</strong></>}
          </div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {b.radky.some(r=>r.doplnit)&&
              <button onClick={()=>doplnUdaje(b)} disabled={uklada} style={btnC("#7a5af5",true)}>
                Doplnit údaje u {b.radky.filter(r=>r.doplnit).length} už uložených
              </button>}
            <button onClick={()=>uloz(b)} disabled={uklada||!b.ucet_id} style={btnC()}>{uklada?"Ukládám…":"Uložit do databáze"}</button>
          </div>
        </div>
        {b.radky.some(r=>r.doplnit)&&<div style={{fontSize:11,color:"#5b3fd0",background:"#f2effe",border:"1px solid #cfc4f8",borderRadius:8,padding:"8px 12px",marginTop:8}}>
          Tenhle výpis nese u {b.radky.filter(r=>r.doplnit).length} už uložených plateb víc údajů než to, co je v databázi
          — variabilní symbol, kód banky protistrany nebo delší popis.
          Tlačítkem se doplní, nic se nepřidá ani nesmaže.
        </div>}
      </>}
    </div>)}

    {(()=>{
      // Co chybí doimportovat. Měsíc se považuje za nahraný, když v něm účet
      // má aspoň jednu transakci. Účty, které se nehýbou, tím pádem vyjdou
      // jako chybějící — proto se počítá až od prvního měsíce, kdy účet žije,
      // a rozdělaný měsíc se nepočítá vůbec.
      if(!pokryti||!pokryti.length)return null;
      const ted=new Date();
      const posledniHotovy=`${ted.getFullYear()}-${String(ted.getMonth()+1).padStart(2,"0")}`;
      const predchozi=(()=>{const d=new Date(ted.getFullYear(),ted.getMonth()-1,1);
        return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;})();
      const konec=new Date(ted.getFullYear(),ted.getMonth()+1,0).getDate()===ted.getDate()?posledniHotovy:predchozi;

      const mesiceUctu=new Map();
      for(const t of pokryti){
        const k=String(t.ucet_id), m=String(t.datum).slice(0,7);
        if(!mesiceUctu.has(k))mesiceUctu.set(k,new Set());
        mesiceUctu.get(k).add(m);
      }
      const dalsiM=m=>{const [r,x]=m.split("-").map(Number);
        return x===12?`${r+1}-01`:`${r}-${String(x+1).padStart(2,"0")}`;};

      const chybi=[];
      for(const u of (ucty||[])){
        const s2=mesiceUctu.get(String(u.id));
        if(!s2||!s2.size)continue;                 // účet se neimportuje vůbec
        const ms=[...s2].sort();
        const out=[];
        for(let m=ms[0]; m<=konec; m=dalsiM(m)) if(!s2.has(m))out.push(m);
        if(out.length)chybi.push({u,mesice:out,posledni:ms[ms.length-1]});
      }
      const vporadku=[...mesiceUctu.keys()].length-chybi.length;
      if(!chybi.length)return <div style={{background:"#f0f7ee",border:"1px solid #8fc07f",borderRadius:12,
        padding:"12px 16px",marginTop:18,fontSize:12.5,color:"#3f7d33",fontWeight:700}}>
        ✓ Všechny sledované účty mají nahráno až do {konec}.
      </div>;
      return <div style={{background:"#fff8e1",border:"1px solid #f5a623",borderRadius:12,padding:"13px 16px",marginTop:18}}>
        <div style={{fontSize:13,fontWeight:800,color:"#9a5b00",marginBottom:8}}>
          📋 Chybí doimportovat — {chybi.length} {chybi.length===1?"účet":chybi.length<5?"účty":"účtů"}
          {vporadku>0&&<span style={{fontWeight:400,color:"#a8763a"}}> · {vporadku} má nahráno vše</span>}
        </div>
        {chybi.sort((a,b)=>b.mesice.length-a.mesice.length).map(({u,mesice,posledni})=>
          <div key={u.id} style={{display:"flex",gap:8,alignItems:"baseline",flexWrap:"wrap",padding:"4px 0",fontSize:12.5}}>
            <strong style={{minWidth:170,color:"#7a4a00"}}>{u.nazev}</strong>
            <span style={{display:"flex",gap:4,flexWrap:"wrap"}}>
              {mesice.map(m=><span key={m} style={{background:"#fff",border:"1px solid #f0c98a",
                borderRadius:6,padding:"1px 7px",color:"#9a5b00",fontWeight:700,fontSize:11.5}}>{m}</span>)}
            </span>
            <span style={{fontSize:11,color:"#a8763a"}}>naposled {posledni}</span>
          </div>)}
        <div style={{fontSize:11.5,color:"#a8763a",marginTop:8}}>
          Měsíc se počítá jako nahraný, když v něm účet má aspoň jednu transakci. Když se účet
          v tom měsíci opravdu nehýbal, klidně to ignoruj. Rozdělaný měsíc se nezapočítává.
        </div>
      </div>;
    })()}

    {(importy||[]).length>0&&<>
      {(()=>{
        // Filtr podle účtu a měsíce — historie importů je jinak nepřehledná
        // hromada souborů s nic neříkajícími jmény.
        const uctyMapa=Object.fromEntries((ucty||[]).map(u=>[String(u.id),u]));
        // Měsíc se bere z období výpisu, ne z data nahrání.
        const mesicImportu=i=>String(i.obdobi_do||i.obdobi_od||i.created_at).slice(0,7);
        const vsechnyMesice=[...new Set((importy||[]).map(mesicImportu))].sort().reverse();
        const vidicelne=(importy||[]).filter(i=>
          (!fUcet||String(i.ucet_id)===fUcet)&&(!fMesic||mesicImportu(i)===fMesic));
        const celkemNovych=vidicelne.reduce((a,i)=>a+(i.pocet_novych||0),0);
        return <>
      <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap",margin:"20px 0 8px"}}>
        <span style={{fontWeight:700,fontSize:14}}>🕘 Historie importů</span>
        <select style={{...inp,width:"auto",fontSize:12,padding:"4px 9px"}} value={fUcet} onChange={e=>setFUcet(e.target.value)}>
          <option value="">Všechny účty</option>
          {(ucty||[]).filter(u=>(importy||[]).some(i=>String(i.ucet_id)===String(u.id)))
            .map(u=><option key={u.id} value={u.id}>{u.nazev}</option>)}
        </select>
        <select style={{...inp,width:"auto",fontSize:12,padding:"4px 9px"}} value={fMesic} onChange={e=>setFMesic(e.target.value)}>
          <option value="">Všechny měsíce</option>
          {vsechnyMesice.map(m=><option key={m} value={m}>{m}</option>)}
        </select>
        {(fUcet||fMesic)&&<button onClick={()=>{setFUcet("");setFMesic("");}}
          style={{...btnC(C.muted,true),fontSize:11.5,padding:"4px 10px"}}>zrušit filtr</button>}
        <span style={{fontSize:12,color:C.muted,marginLeft:"auto"}}>
          {vidicelne.length} výpisů · {celkemNovych} transakcí
        </span>
      </div>
      <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,overflow:"hidden"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
          <thead><tr style={{background:C.bg}}>
            {["Kdy","Účet","Soubor","Období","Nových","Duplicit","Konečný zůstatek"].map(h=><th key={h} style={{padding:"7px 10px",textAlign:"left",fontSize:10,fontWeight:700,color:C.muted,textTransform:"uppercase"}}>{h}</th>)}
          </tr></thead>
          <tbody>
            {vidicelne.length===0&&<tr><td colSpan={7} style={{padding:"14px 10px",color:C.dim,textAlign:"center"}}>
              Pro tenhle filtr tu nic není.</td></tr>}
            {vidicelne.map(i=><tr key={i.id} style={{borderBottom:`1px solid ${C.border}`}}>
              <td style={{padding:"6px 10px",whiteSpace:"nowrap"}}>{new Date(i.created_at).toLocaleString("cs-CZ")}</td>
              <td style={{padding:"6px 10px",whiteSpace:"nowrap",fontWeight:600}}>
                {uctyMapa[String(i.ucet_id)]?.nazev||"—"}
                {i.banka&&<div style={{fontSize:10.5,color:C.dim,fontWeight:400}}>{i.banka}</div>}
              </td>
              <td style={{padding:"6px 10px"}}>{i.soubor}</td>
              <td style={{padding:"6px 10px",whiteSpace:"nowrap"}}>{i.obdobi_od?`${new Date(i.obdobi_od).toLocaleDateString("cs-CZ")} – ${new Date(i.obdobi_do).toLocaleDateString("cs-CZ")}`:"—"}</td>
              <td style={{padding:"6px 10px",fontWeight:700,color:C.green}}>{i.pocet_novych}</td>
              <td style={{padding:"6px 10px",color:C.muted}}>{i.pocet_duplicit}</td>
              <td style={{padding:"6px 10px"}}>{i.zustatek_konecny!=null?fmtKc(i.zustatek_konecny):"—"}</td>
            </tr>)}
          </tbody>
        </table>
      </div>
        </>;
      })()}
    </>}
  </div>;
}

// ── Zařazení naimportovaných transakcí do kategorií ──────────────────────────
// Neukazuje tisíc transakcí, ale seskupené obchodníky. Jedno kliknutí zařadí
// celou skupinu a rovnou uloží pravidlo, takže příští import už je zařazený sám.
const ZARAZENI_STOP = ["platba kartou","odchozi uhrada","prichozi uhrada","okamzita uhrada",
  "trvaly prikaz","jednorazova uhrada","platba","uhrada","jiri kucera","kucera jiri",
  "odeslane inkaso","karetni transakce","vyber hotovosti","prevod"];

// Z popisu a poznámky udělá klíč obchodníka: bez diakritiky, bez čísel, pár slov
function klicObchodnika(t){
  const zdroj = `${t.poznamka||""} ${t.popis||""}`;
  const cisty = bezDiakritiky(zdroj)
    .replace(/[^a-z0-9 ]/g," ")
    .replace(/\b\d+\b/g," ")
    .replace(/\s+/g," ").trim();
  const slova = cisty.split(" ").filter(w=>w.length>2&&!ZARAZENI_STOP.some(s=>s.startsWith(w)&&w.length<4));
  const bezSumu = slova.filter(w=>!ZARAZENI_STOP.includes(w));
  const zaklad = (bezSumu.length?bezSumu:slova).slice(0,3).join(" ");
  return zaklad || cisty.slice(0,20) || "(bez popisu)";
}

// ── Koho se platba týká ──────────────────────────────────────────────────────
// Vedle kategorie (za co) a projektu (na čem) třetí otázka: pro koho. Ukládá se
// dvojicí subjekt_typ + subjekt_id, kde id odkazuje na tabulku „deti" (členové
// rodiny) nebo „auta". V UI je to jeden select, aby to nebylo na tři kliknutí.
const stitek={fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20,background:"#f1f2f6",color:C.muted};

function subjektNazev(typ,id,deti,auta){
  if(!typ)return null;
  if(typ==="rodina")return "👨‍👩‍👧‍👦 Celá rodina";
  if(typ==="dum")return "🏠 Dům";
  if(typ==="osoba"){const d=(deti||[]).find(x=>String(x.id)===String(id));return d?`${d.emoji||"🙋"} ${d.jmeno}`:"🙋 Člen rodiny";}
  if(typ==="auto"){const a=(auta||[]).find(x=>String(x.id)===String(id));return a?`🚗 ${a.nazev}`:"🚗 Auto";}
  return typ;
}

function SubjektSelect({deti,auta,value,onChange,style}){
  return <select style={style||inp} value={value||""} onChange={e=>onChange(e.target.value)}>
    <option value="">— koho se týká —</option>
    <option value="rodina|">👨‍👩‍👧‍👦 Celá rodina</option>
    <option value="dum|">🏠 Dům</option>
    {(deti||[]).map(d=><option key={d.id} value={`osoba|${d.id}`}>{d.emoji||"🙋"} {d.jmeno}</option>)}
    {(auta||[]).map(a=><option key={a.id} value={`auto|${a.id}`}>🚗 {a.nazev}</option>)}
  </select>;
}

// ══════════════════════════════════════════════════════════════════════════════
// SPRÁVA KATEGORIÍ
// Číselník se během používání zaplevelí — vznikne „Elektřina" vedle
// „Voda / energie" a půlka věcí má emoji 💰. Než se začne třídit, má smysl si
// ho srovnat: přejmenovat, sloučit dvě do jedné, smazat nepoužité.
//
// Pozor na `fin_pravidla.kategorie_id` — má `on delete cascade`, takže smazání
// kategorie vezme s sebou i pravidla. Při slučování se proto nejdřív přepíšou
// všechny odkazy a teprve pak se zdrojová kategorie maže.
// ══════════════════════════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════════════════════════
// MAJETEK — kolik kde leží
// Zůstatky se berou z `fin_stavy`, kam je zapisuje import výpisu (jen když
// výpis končí posledním dnem měsíce). Účty bez výpisů — Portu, penzijko,
// stavebko, hotovost — se dopisují ručně tlačítkem u účtu.
//
// Zůstatek starší než poslední známý měsíc se označí, ať je poznat, že číslo
// není aktuální — a ne že se účet nehýbe.
// ══════════════════════════════════════════════════════════════════════════════
const SKUPINY_MAJETEK=[
  {klic:"finance",  nadpis:"🏦 Běžné a spořící",       barva:"#3b6fd4", doMajetku:true,  likvidni:true},
  {klic:"podnikani",nadpis:"🏢 Podnikání",             barva:"#e8922a", doMajetku:true,  likvidni:true},
  {klic:"hotovost", nadpis:"💵 Hotovost",              barva:"#2ed8c8", doMajetku:true,  likvidni:true},
  {klic:"deti",     nadpis:"👶 Spoření dětí — svatý účet", barva:"#f5a623", doMajetku:true, likvidni:false},
  {klic:"investice",nadpis:"📈 Investice",             barva:"#9b7ef5", doMajetku:true,  likvidni:false},
  {klic:"konicek",  nadpis:"🎲 Koníček",               barva:"#8a8f98", doMajetku:false, likvidni:false},
];

// ══════════════════════════════════════════════════════════════════════════════
// PRAVIDLA — co se doplňuje samo
// Klíčové číslo u každého pravidla je, na kolik plateb sedí. Pravidlo se
// vzorem „Odchozí úhrada" vypadá nevinně, dokud u něj nestojí, že zasahuje
// čtyři sta plateb. Proto se počítá stejnou logikou, jakou používá import.
// ══════════════════════════════════════════════════════════════════════════════
function PravidlaTab({ucty,kategorie,projekty,deti,auta}){
  const {data:pravidla,loading,reload}=useData(()=>sb.from("fin_pravidla").select("*").order("priorita"));
  const {data:trans,loading:lt}=useData(()=>nactiVse((od,do_)=>sb.from("fin_transakce")
    .select("id,ucet_id,castka,popis,poznamka,protistrana").eq("zdroj","import").order("datum").range(od,do_)));
  const [razeni,setRazeni]=useState("dopad");   // "dopad" | "abeceda"
  const [nove,setNove]=useState(null);

  if(loading||lt)return <Spinner/>;

  const uctyMap=Object.fromEntries((ucty||[]).map(u=>[String(u.id),u]));
  const katMap =Object.fromEntries((kategorie||[]).map(k=>[String(k.id),k]));
  const projMap=Object.fromEntries((projekty||[]).map(x=>[String(x.id),x]));

  // Stejná podmínka jako v navrhniZarazeni — text, směr, účet.
  const sedi=(p,t)=>{
    const text=bezDiakritiky(`${t.popis} ${t.poznamka} ${t.protistrana}`);
    if(!text.includes(bezDiakritiky(p.vzor)))return false;
    const c=+t.castka||0;
    if(p.smer==="prijem"&&c<0)return false;
    if(p.smer==="vydaj" &&c>0)return false;
    if(p.ucet_id&&String(p.ucet_id)!==String(t.ucet_id))return false;
    return true;
  };
  const celkemTrans=(trans||[]).length||1;
  const radky=(pravidla||[]).map(p=>{
    const zasah=(trans||[]).filter(t=>sedi(p,t));
    const podil=zasah.length/celkemTrans;
    const obecny=jeObecny(p.vzor)||String(p.vzor).trim().length<4;
    return {p,pocet:zasah.length,podil,
            varovani:obecny?"obecný pojem":(podil>0.15?"zasahuje moc plateb":null)};
  }).sort((a,b)=>razeni==="abeceda"
    ? String(a.p.vzor).localeCompare(String(b.p.vzor),"cs")
    : b.pocet-a.pocet);

  const uloz=async(p,patch)=>{
    const {error}=await sb.from("fin_pravidla").update(patch).eq("id",p.id);
    if(error){alert("Nepodařilo se uložit: "+error.message);return;}
    reload();
  };
  const smaz=async(p,pocet)=>{
    if(!confirm(`Smazat pravidlo „${p.vzor}"?\n\nSedí na ${pocet} plateb. Už zařazené platby zůstanou, jak jsou — pravidlo jen přestane platit pro budoucí importy a pro zpětné uplatnění.`))return;
    const {error}=await sb.from("fin_pravidla").delete().eq("id",p.id);
    if(error){alert("Chyba: "+error.message);return;}
    reload();
  };
  const zaloz=async()=>{
    if(!nove?.vzor.trim())return;
    const {error}=await sb.from("fin_pravidla").insert({vzor:nove.vzor.trim(),priorita:+nove.priorita||50});
    if(error){alert("Chyba: "+error.message);return;}
    setNove(null);reload();
  };

  const pole={...inp,fontSize:12,padding:"4px 8px"};
  const rizikovych=radky.filter(r=>r.varovani).length;

  return <div>
    <div style={{display:"flex",gap:12,alignItems:"center",flexWrap:"wrap",marginBottom:14}}>
      <div style={{fontSize:14,fontWeight:700}}>
        {radky.length} pravidel
        {rizikovych>0&&<span style={{color:C.red}}> · {rizikovych} podezřelých</span>}
      </div>
      <button onClick={()=>setNove({vzor:"",priorita:50})} style={{...btnC(C.green,true),fontSize:13,padding:"6px 14px"}}>+ Nové pravidlo</button>
      <div style={{display:"flex",gap:4,alignItems:"center",marginLeft:"auto"}}>
        <span style={{fontSize:12.5,color:C.muted,marginRight:3}}>Řadit:</span>
        {[{k:"dopad",l:"podle dopadu"},{k:"abeceda",l:"podle abecedy"}].map(o=>
          <button key={o.k} onClick={()=>setRazeni(o.k)}
            style={{...btnC(razeni===o.k?C.accent:C.muted,razeni!==o.k),fontSize:12,padding:"5px 11px"}}>{o.l}</button>)}
      </div>
    </div>

    <div style={{background:"#eef4fc",border:"1px solid #b3d1f0",borderRadius:10,padding:"10px 15px",fontSize:12.5,color:"#3066b0",marginBottom:16}}>
      Pravidlo hledá svůj <strong>vzor</strong> v popisu, poznámce a protiúčtu platby — bez ohledu na diakritiku
      a velikost písmen. <strong>Směr</strong> a <strong>účet</strong> ho zúží: totéž číslo účtu může znamenat
      splátku, kterou posíláš, i platbu, kterou dostáváš. <strong>Priorita</strong> rozhoduje při shodě —
      nižší číslo vyhrává. Změny se ukládají, jakmile z pole odklikneš.
    </div>

    <div style={{display:"flex",flexDirection:"column",gap:7}}>
      {radky.map(({p,pocet,podil,varovani})=>
        <div key={p.id} style={{background:C.surface,border:`1px solid ${varovani?"#e59a9a":C.border}`,borderRadius:10,padding:"10px 12px"}}>
          <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
            <input style={{...pole,flex:"1 1 190px",minWidth:150,fontWeight:700}} defaultValue={p.vzor}
              onBlur={e=>e.target.value.trim()&&e.target.value!==p.vzor&&uloz(p,{vzor:e.target.value.trim()})}/>
            <select style={{...pole,width:110}} defaultValue={p.smer||""} onChange={e=>uloz(p,{smer:e.target.value||null})}>
              <option value="">oba směry</option>
              <option value="prijem">jen příjmy</option>
              <option value="vydaj">jen výdaje</option>
            </select>
            <select style={{...pole,maxWidth:180}} defaultValue={p.ucet_id||""} onChange={e=>uloz(p,{ucet_id:e.target.value||null})}>
              <option value="">všechny účty</option>
              {(ucty||[]).map(u=><option key={u.id} value={u.id}>{u.nazev}</option>)}
            </select>
            <input style={{...pole,width:64}} type="number" defaultValue={p.priorita??100}
              title="Priorita — nižší číslo vyhrává" onBlur={e=>uloz(p,{priorita:+e.target.value||100})}/>
            <div style={{textAlign:"right",minWidth:110}}>
              <strong style={{fontSize:14,color:varovani?C.red:C.text}}>{pocet}×</strong>
              <span style={{fontSize:11,color:C.muted}}> · {(podil*100).toFixed(1)} %</span>
            </div>
            <button onClick={()=>smaz(p,pocet)} style={{...btnC(C.muted,true),fontSize:11.5,padding:"4px 10px"}}>Smazat</button>
          </div>

          <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap",marginTop:7}}>
            <span style={{fontSize:11.5,color:C.muted}}>doplní:</span>
            <VyberKategorie hodnota={p.kategorie_id} kategorie={kategorie} prijem={p.smer==="prijem"}
              sirka={200} onVyber={id=>uloz(p,{kategorie_id:id||null})}/>
            <select style={{...pole,maxWidth:150,fontSize:11}} defaultValue={p.projekt_id||""}
              onChange={e=>uloz(p,{projekt_id:e.target.value?+e.target.value:null})}>
              <option value="">— projekt —</option>
              {(projekty||[]).map(x=><option key={x.id} value={x.id}>{x.emoji||"📁"} {x.nazev}</option>)}
            </select>
            <SubjektSelect deti={deti} auta={auta}
              value={p.subjekt_typ?`${p.subjekt_typ}|${p.subjekt_id||""}`:""}
              onChange={v=>{const [tp,id]=String(v).split("|");uloz(p,{subjekt_typ:tp||null,subjekt_id:id||null});}}
              style={{...pole,maxWidth:150,fontSize:11}}/>
            {p.typ==="prevod"&&<span style={{...stitek,background:"#fff3e0",color:"#9a5b00"}}>→ převod</span>}
            {p.prevod_ucet_id&&uctyMap[String(p.prevod_ucet_id)]&&
              <span style={{...stitek,background:"#fff3e0",color:"#9a5b00"}}>na {uctyMap[String(p.prevod_ucet_id)].nazev}</span>}
          </div>

          {varovani&&<div style={{fontSize:11.5,color:"#b03030",marginTop:6,fontWeight:700}}>
            ⚠ {varovani} — {jeObecny(p.vzor)||String(p.vzor).trim().length<4
              ? "tohle není jméno obchodníka, ale bankovní fráze; zúži ho, nebo smaž"
              : `sedí na ${(podil*100).toFixed(0)} % všech plateb, což na jedno pravidlo bývá moc`}
          </div>}
        </div>)}
    </div>

    {nove&&<Modal title="Nové pravidlo" onClose={()=>setNove(null)} width={420}>
      <div style={{fontSize:12,color:C.muted,marginBottom:12}}>
        Napiš text, podle kterého se platba pozná — jméno obchodníka nebo číslo účtu.
        Co má doplňovat, nastavíš pak v seznamu.
      </div>
      <div style={{display:"flex",gap:10,marginBottom:11}}>
        <div style={{flex:1}}>
          <div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:4}}>Vzor</div>
          <input style={inp} autoFocus value={nove.vzor} onChange={e=>setNove(n=>({...n,vzor:e.target.value}))}
            onKeyDown={e=>e.key==="Enter"&&zaloz()}/>
        </div>
        <div style={{width:90}}>
          <div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:4}}>Priorita</div>
          <input style={inp} type="number" value={nove.priorita} onChange={e=>setNove(n=>({...n,priorita:e.target.value}))}/>
        </div>
      </div>
      {jeObecny(nove.vzor)&&<div style={{fontSize:11.5,color:"#b03030",fontWeight:700,marginBottom:10}}>
        To je obecný bankovní pojem — sedne na spoustu plateb naráz.
      </div>}
      <div style={{display:"flex",gap:10,marginTop:16}}>
        <button onClick={zaloz} disabled={!nove.vzor.trim()||jeObecny(nove.vzor)} style={btnC()}>Založit</button>
        <button onClick={()=>setNove(null)} style={btnC(C.muted,true)}>Zrušit</button>
      </div>
    </Modal>}
  </div>;
}

function MajetekTab({ucty,reloadUcty}){
  const {data:stavy,loading,reload}=useData(()=>nactiVse((od,do_)=>
    sb.from("fin_stavy").select("*").gte("rok",2024).order("rok").range(od,do_)));
  const {data:trans,loading:lt}=useData(()=>nactiVse((od,do_)=>
    sb.from("fin_transakce").select("ucet_id,datum,castka").eq("zdroj","import").order("datum").range(od,do_)));
  const [zapis,setZapis]=useState(null);   // {ucet, rok, mesic, stav}
  const [dopocet,setDopocet]=useState(null);  // náhled toho, co se zapíše
  const [pracuje,setPracuje]=useState(false);

  if(loading||lt)return <Spinner/>;

  const historie=u=>(stavy||[]).filter(x=>String(x.ucet_id)===String(u.id))
    .sort((a,b)=>a.rok-b.rok||a.mesic-b.mesic);
  const posledni=u=>{const h=historie(u);return h.length?h[h.length-1]:null;};

  // Nejnovější měsíc napříč všemi účty — podle něj se pozná zastaralý zůstatek.
  const nejnovejsi=(stavy||[]).reduce((a,x)=>{
    const k=x.rok*12+x.mesic; return k>a?k:a;
  },0);

  const aktivni=(ucty||[]).filter(u=>u.aktivni!==false);
  const skupiny=SKUPINY_MAJETEK.map(sk=>{
    const ucty2=aktivni.filter(u=>(u.skupina||"finance")===sk.klic)
      .map(u=>{
        const p=posledni(u), h=historie(u);
        const pred=h.length>1?h[h.length-2]:null;
        return {u,p,zmena:p&&pred?+p.stav-+pred.stav:null,
                stary:p?(p.rok*12+p.mesic)<nejnovejsi:false};
      })
      .sort((a,b)=>(+(b.p?.stav??-1e12))-(+(a.p?.stav??-1e12)));
    return {...sk,ucty:ucty2,suma:ucty2.reduce((a,x)=>a+(+x.p?.stav||0),0)};
  }).filter(sk=>sk.ucty.length);

  const soucet=f=>skupiny.filter(f).reduce((a,sk)=>a+sk.suma,0);
  const likvidni=soucet(sk=>sk.likvidni);
  const svate   =soucet(sk=>sk.klic==="deti");
  const investice=soucet(sk=>sk.klic==="investice");
  const majetek =soucet(sk=>sk.doMajetku);
  const fortuna =soucet(sk=>sk.klic==="konicek");

  // ── Dopočet chybějících zůstatků ────────────────────────────────────────
  // Když znám zůstatek k 30. 6. a mám všechny pohyby za červenec, zůstatek
  // k 31. 7. spočítám. Doplňují se jen měsíce, kde zůstatek CHYBÍ — zapsaná
  // čísla se nikdy nepřepisují, ta jsou z banky a mají přednost. Měsíce, kde
  // zapsaný zůstatek nesedí s pohyby, se jen vypíšou jako podezřelé.
  const mesicniPohyby=(()=>{
    const m=new Map();                       // "ucet|rok-mesic" → {suma, pocet}
    for(const t of (trans||[])){
      const k=`${t.ucet_id}|${String(t.datum).slice(0,7)}`;
      if(!m.has(k))m.set(k,{suma:0,pocet:0});
      const z=m.get(k); z.suma+=(+t.castka||0); z.pocet++;
    }
    return m;
  })();
  const klicMes=(r,mm)=>`${r}-${String(mm).padStart(2,"0")}`;
  const dalsi=(r,mm)=>mm===12?[r+1,1]:[r,mm+1];

  const spoctiDopocet=()=>{
    const navrhy=[], nesedi=[];
    for(const u of aktivni){
      const h=historie(u);
      if(!h.length)continue;                 // bez jediného zůstatku není z čeho vyjít
      const mesiceUctu=[...(trans||[]).filter(t=>String(t.ucet_id)===String(u.id))
        .map(t=>String(t.datum).slice(0,7))].sort();
      if(!mesiceUctu.length)continue;        // bez pohybů se dopočítat nedá
      const posledniPohyb=mesiceUctu[mesiceUctu.length-1];
      const mapaStavu=new Map(h.map(x=>[klicMes(x.rok,x.mesic),x]));
      let [r,mm]=[h[0].rok,h[0].mesic];
      let bezne=+h[0].stav;                  // běžící zůstatek podle řetězu
      for(let i=0;i<240;i++){
        const [nr,nm]=dalsi(r,mm); r=nr; mm=nm;
        const k=klicMes(r,mm);
        if(k>posledniPohyb)break;
        const p=mesicniPohyby.get(`${u.id}|${k}`);
        const spocteno=bezne+(p?p.suma:0);
        const zapsany=mapaStavu.get(k);
        if(zapsany){
          if(Math.abs(+zapsany.stav-spocteno)>1.5)
            nesedi.push({ucet:u,rok:r,mesic:mm,zapsany:+zapsany.stav,spocteno,rozdil:spocteno-+zapsany.stav});
          bezne=+zapsany.stav;               // banka má přednost, řetěz se na ni srovná
        }else{
          if(p)navrhy.push({ucet:u,rok:r,mesic:mm,stav:spocteno,pohybu:p.pocet,zBaze:bezne});
          bezne=spocteno;
        }
      }
    }
    setDopocet({navrhy,nesedi});
  };

  const zapisDopocet=async()=>{
    const rows=(dopocet?.navrhy||[]).map(x=>({ucet_id:x.ucet.id,rok:x.rok,mesic:x.mesic,stav:x.stav}));
    if(!rows.length)return;
    setPracuje(true);
    for(let i=0;i<rows.length;i+=200){
      const {error}=await sb.from("fin_stavy").upsert(rows.slice(i,i+200),{onConflict:"ucet_id,rok,mesic"});
      if(error){setPracuje(false);alert("Chyba: "+error.message);return;}
    }
    setPracuje(false);setDopocet(null);reload();
  };

  const ulozStav=async()=>{
    const z=zapis;
    if(!z||z.stav==="")return;
    const {error}=await sb.from("fin_stavy")
      .upsert({ucet_id:z.ucet.id,rok:+z.rok,mesic:+z.mesic,stav:+z.stav},{onConflict:"ucet_id,rok,mesic"});
    if(error){alert("Nepodařilo se uložit: "+error.message);return;}
    setZapis(null);reload();
  };
  const smazStav=async(u,p)=>{
    if(!confirm(`Smazat zapsaný zůstatek ${kc0(p.stav)} za ${p.mesic}/${p.rok} u účtu ${u.nazev}?\n\nPoužij, když je zjevně špatný — poslední známý zůstatek se pak vezme z předchozího měsíce.`))return;
    const {error}=await sb.from("fin_stavy").delete().eq("id",p.id);
    if(error){alert("Chyba: "+error.message);return;}
    reload();
  };

  const karta=(l,v,barva,pozn)=><div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"14px 16px",flex:1,minWidth:180}}>
    <div style={{fontSize:11,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:.3}}>{l}</div>
    <div style={{fontSize:23,fontWeight:800,color:barva||C.text,marginTop:5}}>{kc0(v)}</div>
    {pozn&&<div style={{fontSize:11,color:C.dim,marginTop:3}}>{pozn}</div>}
  </div>;

  const stareUcty=skupiny.flatMap(sk=>sk.ucty).filter(x=>x.stary&&x.p);
  return <div>
    <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:14}}>
      {karta("Můžeš sáhnout",likvidni,C.green,"běžné, spořící, hotovost, podnikání")}
      {karta("Nesaháš",svate+investice,C.orange,`${kc0(svate)} dětem · ${kc0(investice)} v investicích`)}
      {karta("Majetek celkem",majetek,C.text,"bez Fortuny — sázky se do majetku nepočítají")}
      {fortuna!==0&&karta("Fortuna",fortuna,C.muted,"koníček, mimo majetek")}
    </div>

    <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap",marginBottom:14}}>
      <button onClick={spoctiDopocet} style={{...btnC(C.accent,true),fontSize:12.5,padding:"6px 14px"}}>
        🧮 Dopočítat chybějící zůstatky
      </button>
      <span style={{fontSize:11.5,color:C.dim}}>
        Doplní měsíce, kde zůstatek chybí, z posledního známého plus pohybů. Zapsaná čísla nepřepisuje.
      </span>
    </div>

    {stareUcty.length>0&&<div style={{background:"#fff8e1",border:"1px solid #f5a623",borderRadius:12,padding:"12px 16px",marginBottom:14,fontSize:12,color:"#9a5b00"}}>
      <strong>Zastaralé zůstatky:</strong> {stareUcty.map(x=>`${x.u.nazev} (${x.p.mesic}/${x.p.rok})`).join(", ")}.
      U účtů bez bankovních výpisů je to normální — dopiš hodnotu tlačítkem u účtu.
    </div>}

    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      {skupiny.map(sk=><div key={sk.klic}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",
                     fontSize:13,fontWeight:800,color:sk.barva,marginBottom:8,paddingBottom:6,
                     borderBottom:`2px solid ${sk.barva}33`}}>
          <span>{sk.nadpis}</span>
          <span style={{fontSize:15}}>{kc0(sk.suma)}</span>
        </div>
        {sk.ucty.map(({u,p,zmena,stary})=><div key={u.id}
          style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,flexWrap:"wrap",
                  padding:"8px 12px",background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,marginBottom:6}}>
          <div style={{minWidth:190,flex:1}}>
            <div style={{fontSize:13.5,fontWeight:700}}>{u.nazev}</div>
            <div style={{fontSize:11,color:stary?C.orange:C.dim}}>
              {p?<>stav k {p.mesic}/{p.rok}{stary?" — starší údaj":""}</>:"zůstatek nikdy nezapsaný"}
              {u.cislo_uctu?` · ${u.cislo_uctu}`:""}
            </div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:15,fontWeight:800}}>{p?kc0(p.stav):"—"}</div>
            {zmena!=null&&zmena!==0&&<div style={{fontSize:11,color:zmena>0?C.green:C.red}}>
              {zmena>0?"▲":"▼"} {kc0(Math.abs(zmena))} za měsíc
            </div>}
          </div>
          <div style={{display:"flex",gap:6}}>
            <button onClick={()=>setZapis({ucet:u,rok:new Date().getFullYear(),
              mesic:new Date().getMonth()+1,stav:p?String(p.stav):""})}
              style={{...btnC(C.accent,true),fontSize:11,padding:"4px 10px"}}>Zapsat hodnotu</button>
            {p&&<button onClick={()=>smazStav(u,p)} title="Smazat tenhle zapsaný zůstatek"
              style={{...btnC(C.muted,true),fontSize:11,padding:"4px 9px"}}>✕</button>}
          </div>
        </div>)}
      </div>)}
    </div>

    {dopocet&&<Modal title="Dopočet chybějících zůstatků" onClose={()=>setDopocet(null)} width={720}>
      {dopocet.nesedi.length>0&&<div style={{background:"#fdefef",border:"1px solid #e59a9a",borderRadius:10,padding:"10px 14px",marginBottom:14,fontSize:12,color:"#b03030"}}>
        <div style={{fontWeight:800,marginBottom:6}}>{dopocet.nesedi.length} zapsaných zůstatků nesedí s pohyby</div>
        {dopocet.nesedi.slice(0,8).map((x,i)=><div key={i} style={{marginBottom:2}}>
          {x.ucet.nazev} · {x.mesic}/{x.rok}: zapsáno <strong>{kc0(x.zapsany)}</strong>, z pohybů vychází <strong>{kc0(x.spocteno)}</strong> ({kc0(x.rozdil)} rozdíl)
        </div>)}
        <div style={{marginTop:6,color:"#8a4444"}}>
          Tyhle se nepřepisují — zapsaný zůstatek je z banky a má přednost. Když je zjevně špatný
          (jako ta dvacetikoruna z omylu), smaž ho křížkem u účtu a pusť dopočet znovu.
        </div>
      </div>}

      <div style={{fontSize:13,fontWeight:700,marginBottom:10}}>
        {dopocet.navrhy.length?`Doplní se ${dopocet.navrhy.length} zůstatků:`:"Není co doplnit — všechny měsíce s pohyby už zůstatek mají."}
      </div>
      <div style={{maxHeight:"46vh",overflowY:"auto"}}>
        {dopocet.navrhy.map((x,i)=><div key={i} style={{display:"flex",justifyContent:"space-between",gap:10,fontSize:12,padding:"5px 0",borderTop:`1px solid ${C.bg}`}}>
          <div>
            <strong>{x.ucet.nazev}</strong> · {x.mesic}/{x.rok}
            <div style={{fontSize:11,color:C.dim}}>z {kc0(x.zBaze)} plus {x.pohybu} pohybů</div>
          </div>
          <strong style={{whiteSpace:"nowrap"}}>{kc0(x.stav)}</strong>
        </div>)}
      </div>
      <div style={{display:"flex",gap:10,marginTop:16}}>
        <button onClick={zapisDopocet} disabled={pracuje||!dopocet.navrhy.length} style={btnC()}>
          {pracuje?"Zapisuji…":`Zapsat ${dopocet.navrhy.length} zůstatků`}
        </button>
        <button onClick={()=>setDopocet(null)} style={btnC(C.muted,true)}>Zrušit</button>
      </div>
    </Modal>}

    {zapis&&<Modal title={`Zůstatek — ${zapis.ucet.nazev}`} onClose={()=>setZapis(null)} width={380}>
      <div style={{fontSize:12,color:C.muted,marginBottom:12}}>
        Zapisuje se stav k poslednímu dni měsíce. Když už za ten měsíc hodnota existuje, přepíše se.
      </div>
      <div style={{display:"flex",gap:10,marginBottom:11}}>
        <div style={{flex:1}}>
          <div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:4}}>Měsíc</div>
          <select style={inp} value={zapis.mesic} onChange={e=>setZapis(z=>({...z,mesic:e.target.value}))}>
            {MESICE.map((m,i)=><option key={i} value={i+1}>{m}</option>)}
          </select>
        </div>
        <div style={{width:100}}>
          <div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:4}}>Rok</div>
          <input style={inp} type="number" value={zapis.rok} onChange={e=>setZapis(z=>({...z,rok:e.target.value}))}/>
        </div>
      </div>
      <div style={{marginBottom:11}}>
        <div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:4}}>Zůstatek (Kč)</div>
        <input style={inp} type="number" autoFocus value={zapis.stav}
          onChange={e=>setZapis(z=>({...z,stav:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&ulozStav()}/>
      </div>
      <div style={{display:"flex",gap:10,marginTop:16}}>
        <button onClick={ulozStav} disabled={zapis.stav===""} style={btnC()}>Uložit</button>
        <button onClick={()=>setZapis(null)} style={btnC(C.muted,true)}>Zrušit</button>
      </div>
    </Modal>}
  </div>;
}

function KategorieTab({kategorie,reloadKategorie,onZmena}){
  const {data:trans,loading:lt,reload:reloadTrans}=useData(()=>nactiVse((od,do_)=>
    sb.from("fin_transakce").select("id,castka,datum,kategorie_id,typ").order("datum").range(od,do_)));
  const {data:pravidla,reload:reloadPravidla}=useData(()=>sb.from("fin_pravidla").select("id,vzor,kategorie_id"));
  const {data:plan,reload:reloadPlan}=useData(()=>sb.from("fin_cashflow_plan").select("id,kategorie_id").limit(2000));
  const [edit,setEdit]=useState({});         // id → rozpracované hodnoty
  const [slucuje,setSlucuje]=useState(null); // {id, cil}
  const [pracuje,setPracuje]=useState(false);
  const [novaKat,setNovaKat]=useState(null);
  const [razeni,setRazeni]=useState("abeceda");   // "abeceda" | "objem"

  if(lt)return <Spinner/>;

  const statistiky=id=>{
    const t=(trans||[]).filter(x=>String(x.kategorie_id)===String(id)&&x.typ!=="prevod");
    return {
      plateb:t.length,
      suma:t.reduce((a,x)=>a+Math.abs(+x.castka||0),0),
      pravidel:(pravidla||[]).filter(x=>String(x.kategorie_id)===String(id)).length,
      vPlanu:(plan||[]).filter(x=>String(x.kategorie_id)===String(id)).length,
    };
  };
  const radky=(kategorie||[]).map(k=>({k,s:statistiky(k.id)}))
    .sort((a,b)=>razeni==="abeceda"
      ? a.k.nazev.localeCompare(b.k.nazev,"cs")
      : b.s.suma-a.s.suma||a.k.nazev.localeCompare(b.k.nazev,"cs"));
  const nepouzite=radky.filter(r=>!r.s.plateb&&!r.s.pravidel&&!r.s.vPlanu).length;

  const ulozPole=async(k,pole,hodnota)=>{
    if((k[pole]||"")===(hodnota||""))return;
    const {error}=await sb.from("fin_kategorie").update({[pole]:hodnota||null}).eq("id",k.id);
    if(error){alert("Nepodařilo se uložit: "+error.message);return;}
    reloadKategorie&&reloadKategorie();
  };

  const sluc=async(zdroj,cilId)=>{
    const cil=(kategorie||[]).find(x=>String(x.id)===String(cilId));
    if(!cil)return;
    const s=statistiky(zdroj.id);
    if(!confirm(`Sloučit „${zdroj.nazev}" do „${cil.nazev}"?\n\nPřepíše se ${s.plateb} plateb, ${s.pravidel} pravidel a ${s.vPlanu} položek plánu. Kategorie „${zdroj.nazev}" se pak smaže.`))return;
    setPracuje(true);
    // Nejdřív odkazy, teprve pak mazání — jinak cascade odnese pravidla.
    for(const tabulka of ["fin_transakce","fin_pravidla","fin_cashflow_plan"]){
      const {error}=await sb.from(tabulka).update({kategorie_id:cil.id}).eq("kategorie_id",zdroj.id);
      if(error){setPracuje(false);alert(`Chyba v ${tabulka}: ${error.message}`);return;}
    }
    const {error}=await sb.from("fin_kategorie").delete().eq("id",zdroj.id);
    setPracuje(false);
    if(error){alert("Odkazy přepsané, ale kategorii se nepodařilo smazat: "+error.message);}
    setSlucuje(null);
    reloadKategorie&&reloadKategorie();reloadTrans();reloadPravidla();reloadPlan();onZmena&&onZmena();
  };

  const smaz=async k=>{
    const s=statistiky(k.id);
    if(s.plateb||s.pravidel||s.vPlanu){alert("Tuhle kategorii něco používá — sluč ji do jiné místo mazání.");return;}
    if(!confirm(`Smazat nepoužitou kategorii „${k.nazev}"?`))return;
    const {error}=await sb.from("fin_kategorie").delete().eq("id",k.id);
    if(error){alert("Chyba: "+error.message);return;}
    reloadKategorie&&reloadKategorie();
  };

  const zaloz=async()=>{
    const n=novaKat;
    if(!n?.nazev.trim())return;
    const {error}=await sb.from("fin_kategorie").insert({nazev:n.nazev.trim(),emoji:n.emoji||"🏷",typ:n.typ,poradi:900});
    if(error){alert("Chyba: "+error.message);return;}
    setNovaKat(null);reloadKategorie&&reloadKategorie();
  };

  const poleStyl={...inp,fontSize:13,padding:"5px 9px"};

  // Tři hromádky vedle sebe: čím se peníze berou, čím utrácejí, a co je k úklidu.
  // Kategorie typu „převod" by byla prázdná — platby označené jako převod
  // se z přehledu vyřazují a kategorii schválně nedostávají.
  const prazdnaKat=r=>!r.s.plateb&&!r.s.pravidel&&!r.s.vPlanu;
  const sloupce=[
    {klic:"prijem", nadpis:"📥 Příjmové kategorie", barva:C.green,
     radky:radky.filter(r=>r.k.typ==="prijem"&&!prazdnaKat(r))},
    {klic:"vydaj",  nadpis:"📤 Výdajové kategorie", barva:C.red,
     radky:radky.filter(r=>r.k.typ!=="prijem"&&!prazdnaKat(r))},
    {klic:"prazdne",nadpis:"🧹 Nepoužité — k úklidu", barva:C.orange,
     radky:radky.filter(prazdnaKat)},
  ];

  const karta=({k,s})=>{
    const prazdna=!s.plateb&&!s.pravidel&&!s.vPlanu;
    return <div key={k.id} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 12px",marginBottom:7}}>
      <div style={{display:"flex",gap:8,alignItems:"center"}}>
        <input style={{...poleStyl,width:50,textAlign:"center",flexShrink:0}} defaultValue={k.emoji||""}
          onBlur={e=>ulozPole(k,"emoji",e.target.value)}/>
        <input style={{...poleStyl,flex:1,minWidth:0,fontWeight:700,fontSize:14}} defaultValue={k.nazev}
          onBlur={e=>e.target.value.trim()&&ulozPole(k,"nazev",e.target.value.trim())}/>
      </div>
      <div style={{display:"flex",gap:8,alignItems:"center",justifyContent:"space-between",marginTop:7,flexWrap:"wrap"}}>
        <div style={{fontSize:12.5,color:C.muted,lineHeight:1.4}}>
          {prazdna
            ? <span style={{color:C.orange}}>nic ji nepoužívá</span>
            : <><strong style={{color:C.text,fontSize:15}}>{kc0(s.suma)}</strong>
                {" · "}{s.plateb}× · {s.pravidel} pravidel{s.vPlanu?` · ${s.vPlanu} v plánu`:""}</>}
        </div>
        <div style={{display:"flex",gap:6,alignItems:"center"}}>
          <select style={{...poleStyl,width:88,fontSize:12,padding:"3px 6px"}} defaultValue={k.typ}
            onChange={e=>ulozPole(k,"typ",e.target.value)}>
            <option value="vydaj">Výdaj</option><option value="prijem">Příjem</option>
          </select>
          <button onClick={()=>setSlucuje(slucuje?.id===k.id?null:{id:k.id,cil:""})}
            style={{...btnC(C.accent,true),fontSize:12,padding:"4px 10px"}}>Sloučit</button>
          <button onClick={()=>smaz(k)} disabled={!prazdna} title={prazdna?"Smazat":"Nejdřív ji sluč do jiné"}
            style={{...btnC(C.muted,true),fontSize:12,padding:"4px 10px",opacity:prazdna?1:.35}}>Smazat</button>
        </div>
      </div>

      {slucuje?.id===k.id&&<div style={{marginTop:9,paddingTop:9,borderTop:`1px solid ${C.border}`}}>
        <div style={{fontSize:12.5,color:C.muted,marginBottom:5}}>Přesunout „{k.nazev}" do:</div>
        <select style={{...poleStyl,width:"100%"}} value={slucuje.cil} onChange={e=>setSlucuje({...slucuje,cil:e.target.value})}>
          <option value="">— vyber kategorii —</option>
          {radky.filter(r=>String(r.k.id)!==String(k.id)).map(r=>
            <option key={r.k.id} value={r.k.id}>{r.k.emoji||"🏷"} {r.k.nazev}{r.s.plateb?` (${r.s.plateb}×)`:""}</option>)}
        </select>
        <div style={{display:"flex",gap:8,marginTop:8}}>
          <button onClick={()=>sluc(k,slucuje.cil)} disabled={!slucuje.cil||pracuje}
            style={{...btnC(),fontSize:12.5,padding:"5px 12px"}}>{pracuje?"Slučuji…":"Sloučit"}</button>
          <button onClick={()=>setSlucuje(null)} style={{...btnC(C.muted,true),fontSize:12.5,padding:"5px 12px"}}>Zrušit</button>
        </div>
      </div>}
    </div>;
  };

  return <div>
    <div style={{display:"flex",gap:12,alignItems:"center",flexWrap:"wrap",marginBottom:14}}>
      <div style={{fontSize:14,fontWeight:700}}>
        {radky.length} kategorií
        {nepouzite>0&&<span style={{color:C.orange}}> · {nepouzite} nepoužitých</span>}
      </div>
      <button onClick={()=>setNovaKat({nazev:"",typ:"vydaj",emoji:"🏷"})} style={{...btnC(C.green,true),fontSize:13,padding:"6px 14px"}}>+ Nová kategorie</button>
      <div style={{display:"flex",gap:4,alignItems:"center",marginLeft:"auto"}}>
        <span style={{fontSize:12.5,color:C.muted,marginRight:3}}>Řadit:</span>
        {[{k:"abeceda",l:"podle abecedy"},{k:"objem",l:"podle objemu"}].map(o=>
          <button key={o.k} onClick={()=>setRazeni(o.k)}
            style={{...btnC(razeni===o.k?C.accent:C.muted,razeni!==o.k),fontSize:12,padding:"5px 11px"}}>{o.l}</button>)}
      </div>
    </div>

    <div style={{background:"#eef4fc",border:"1px solid #b3d1f0",borderRadius:10,padding:"10px 15px",fontSize:12.5,color:"#3066b0",marginBottom:16}}>
      Název i emoji se ukládají, jakmile z pole odklikneš; přepnutím typu se kategorie přesune do druhého sloupce.
      <strong> Sloučit</strong> přepíše všechny platby, pravidla i položky plánu na cílovou kategorii a tu původní smaže.
      Smazat jde jen kategorie, kterou nic nepoužívá.
    </div>

    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(330px,1fr))",gap:16,alignItems:"start"}}>
      {sloupce.map(sl=><div key={sl.klic}>
        <div style={{fontSize:13,fontWeight:800,color:sl.barva,marginBottom:9,paddingBottom:6,borderBottom:`2px solid ${sl.barva}33`}}>
          {sl.nadpis} <span style={{color:C.dim,fontWeight:600}}>({sl.radky.length})</span>
        </div>
        {sl.radky.length===0&&<div style={{fontSize:12.5,color:C.dim,padding:"6px 2px"}}>
          {sl.klic==="prazdne"?"Všechny kategorie se používají.":"Zatím žádná."}
        </div>}
        {sl.radky.map(karta)}
      </div>)}
    </div>

    {novaKat&&<Modal title="Nová kategorie" onClose={()=>setNovaKat(null)} width={380}>
      <div style={{display:"flex",gap:10,marginBottom:11}}>
        <div style={{width:70}}>
          <div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:4}}>Emoji</div>
          <input style={inp} value={novaKat.emoji} onChange={e=>setNovaKat(k=>({...k,emoji:e.target.value}))}/>
        </div>
        <div style={{flex:1}}>
          <div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:4}}>Název</div>
          <input style={inp} autoFocus value={novaKat.nazev} onChange={e=>setNovaKat(k=>({...k,nazev:e.target.value}))}
            onKeyDown={e=>e.key==="Enter"&&zaloz()}/>
        </div>
      </div>
      <div style={{marginBottom:11}}>
        <div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:4}}>Typ</div>
        <select style={inp} value={novaKat.typ} onChange={e=>setNovaKat(k=>({...k,typ:e.target.value}))}>
          <option value="vydaj">Výdaj</option><option value="prijem">Příjem</option>
        </select>
      </div>
      <div style={{display:"flex",gap:10,marginTop:16}}>
        <button onClick={zaloz} disabled={!novaKat.nazev.trim()} style={btnC()}>Založit</button>
        <button onClick={()=>setNovaKat(null)} style={btnC(C.muted,true)}>Zrušit</button>
      </div>
    </Modal>}
  </div>;
}

function ZarazeniTransakci({kategorie,projekty,deti,auta,onZmena,reloadKategorie}){
  const {data:transakce,loading,reload}=useData(()=>nactiVse((od,do_)=>sb.from("fin_transakce")
    .select("id,datum,castka,popis,poznamka,protistrana,kategorie_id,projekt_id,subjekt_typ,subjekt_id,typ,ucet_id")
    .eq("zdroj","import").order("datum",{ascending:false}).range(od,do_)));
  const {data:pravidla,reload:reloadPravidla}=useData(()=>sb.from("fin_pravidla").select("*"));
  const [jenNezarazene,setJenNezarazene]=useState(true);
  const [volba,setVolba]=useState({});        // klíč skupiny → kategorie_id
  const [volbaProj,setVolbaProj]=useState({}); // klíč skupiny → projekt_id
  const [volbaSubj,setVolbaSubj]=useState({}); // klíč skupiny → "typ|id"
  const [ulozPravidlo,setUlozPravidlo]=useState({});
  const [hledat,setHledat]=useState("");
  const [pracuje,setPracuje]=useState("");
  const [novaKat,setNovaKat]=useState(null);  // {nazev,typ,emoji,proSkupinu}

  const skupiny=(()=>{
    const m=new Map();
    for(const t of (transakce||[])){
      if(t.typ==="prevod")continue;                       // převody mezi vlastními účty neřešíme
      if(jenNezarazene&&t.kategorie_id&&t.subjekt_typ)continue;
      const k=klicObchodnika(t);
      if(!m.has(k))m.set(k,{klic:k,polozky:[],suma:0});
      const s=m.get(k); s.polozky.push(t); s.suma+=+t.castka;
    }
    let out=[...m.values()];
    if(hledat.trim()){
      const h=bezDiakritiky(hledat);
      out=out.filter(s=>bezDiakritiky(s.klic).includes(h)||s.polozky.some(p=>bezDiakritiky(`${p.popis} ${p.poznamka}`).includes(h)));
    }
    return out.sort((a,b)=>Math.abs(b.suma)-Math.abs(a.suma));
  })();

  // Pravidla vznikají postupně, ale platby už v databázi leží. Tohle projde
  // všechny naimportované transakce a doplní jim, co pravidla říkají — ale jen
  // tam, kde je pole prázdné, aby to nepřepsalo ruční rozhodnutí.
  const [zpetne,setZpetne]=useState(null);   // text průběhu
  const pustPravidlaZpetne=async()=>{
    if(!confirm("Projít všechny naimportované platby a doplnit jim kategorii, projekt a koho se týkají podle uložených pravidel?\n\nUž vyplněné údaje se nepřepíšou."))return;
    setZpetne("Počítám…");
    const davky=new Map();               // podpis patche → seznam id
    let dotcenych=0;
    for(const t of (transakce||[])){
      if(t.typ==="prevod")continue;
      const n=navrhniZarazeni({popis:t.popis,poznamka:t.poznamka,protiucet:t.protistrana,castka:t.castka},pravidla,t.ucet_id);
      const patch={};
      if(n.kategorie_id&&!t.kategorie_id)patch.kategorie_id=n.kategorie_id;
      if(n.projekt_id  &&!t.projekt_id)  patch.projekt_id=n.projekt_id;
      if(n.subjekt_typ &&!t.subjekt_typ){patch.subjekt_typ=n.subjekt_typ;patch.subjekt_id=n.subjekt_id||null;}
      if(!Object.keys(patch).length)continue;
      const klic=JSON.stringify(patch);
      if(!davky.has(klic))davky.set(klic,{patch,ids:[]});
      davky.get(klic).ids.push(t.id); dotcenych++;
    }
    if(!dotcenych){setZpetne(null);alert("Pravidla už jsou uplatněná — není co doplnit.");return;}
    let hotovo=0;
    for(const {patch,ids} of davky.values()){
      for(let i=0;i<ids.length;i+=200){
        const cast=ids.slice(i,i+200);
        const {error}=await sb.from("fin_transakce").update(patch).in("id",cast);
        if(error){setZpetne(null);alert("Chyba: "+error.message);return;}
        hotovo+=cast.length; setZpetne(`Doplňuji… ${hotovo}/${dotcenych}`);
      }
    }
    setZpetne(null);
    alert(`Doplněno u ${hotovo} plateb.`);
    onZmena&&onZmena(); reload();
  };

  const celkemNezarazenych=(transakce||[]).filter(t=>!t.kategorie_id&&t.typ!=="prevod").length;
  const celkemBezSubjektu=(transakce||[]).filter(t=>!t.subjekt_typ&&t.typ!=="prevod").length;

  const zarad=async skupina=>{
    const kat=volba[skupina.klic];
    const proj=volbaProj[skupina.klic];
    const subj=volbaSubj[skupina.klic];
    const patch={};
    if(kat)patch.kategorie_id=kat;
    if(proj)patch.projekt_id=proj==="__zadny"?null:+proj;
    if(subj){const [tp,id]=subj.split("|");patch.subjekt_typ=tp;patch.subjekt_id=id||null;}
    if(!Object.keys(patch).length){alert("Vyber aspoň jednu věc — kategorii, projekt nebo koho se to týká.");return;}
    setPracuje(skupina.klic);
    const ids=skupina.polozky.map(p=>p.id);
    for(let i=0;i<ids.length;i+=200){
      const {error}=await sb.from("fin_transakce").update(patch).in("id",ids.slice(i,i+200));
      if(error){setPracuje("");alert("Chyba: "+error.message);return;}
    }
    if(ulozPravidlo[skupina.klic]!==false&&skupina.klic.length>2){
      const pravidlo={vzor:skupina.klic,priorita:40,...patch};
      const {error}=await sb.from("fin_pravidla").insert(pravidlo);
      // Pravidlo pro tenhle vzor už existuje — doplní se do něj nové sloupce.
      if(error&&/duplicate|unique/i.test(error.message)){
        const stare=(pravidla||[]).find(p=>(p.vzor||"").toLowerCase()===skupina.klic.toLowerCase());
        if(stare)await sb.from("fin_pravidla").update(patch).eq("id",stare.id);
      }else if(error)console.warn(error.message);
      reloadPravidla();
    }
    setVolba(v=>({...v,[skupina.klic]:""}));
    setVolbaProj(v=>({...v,[skupina.klic]:""}));
    setVolbaSubj(v=>({...v,[skupina.klic]:""}));
    setPracuje("");reload();onZmena&&onZmena();
  };

  const zalozKategorii=async()=>{
    const n=(novaKat?.nazev||"").trim();
    if(!n)return;
    const {data,error}=await sb.from("fin_kategorie")
      .insert({nazev:n,typ:novaKat.typ||"vydaj",emoji:novaKat.emoji||"🏷",barva:"#4f7ef0",poradi:900})
      .select("id").single();
    if(error){alert("Chyba: "+error.message);return;}
    await reloadKategorie();
    if(novaKat.proSkupinu)setVolba(v=>({...v,[novaKat.proSkupinu]:data.id}));
    setNovaKat(null);
  };

  if(loading)return <Spinner/>;

  return <div>
    <div style={{display:"flex",gap:12,alignItems:"center",flexWrap:"wrap",marginBottom:14}}>
      <div style={{fontSize:13,fontWeight:700}}>
        {celkemNezarazenych>0||celkemBezSubjektu>0
          ? <>Bez kategorie <span style={{color:C.orange}}>{celkemNezarazenych}</span> · bez určení koho se týká <span style={{color:C.orange}}>{celkemBezSubjektu}</span> · <span style={{color:C.accent}}>{skupiny.length}</span> skupin</>
          : <span style={{color:C.green}}>✓ Všechno zařazeno</span>}
      </div>
      <input style={{...inp,maxWidth:220,fontSize:12,padding:"5px 10px"}} placeholder="Hledat obchodníka…" value={hledat} onChange={e=>setHledat(e.target.value)}/>
      <label style={{display:"flex",alignItems:"center",gap:6,fontSize:12,cursor:"pointer"}}>
        <input type="checkbox" checked={jenNezarazene} onChange={e=>setJenNezarazene(e.target.checked)}/> jen nedodělané
      </label>
      <button onClick={()=>setNovaKat({nazev:"",typ:"vydaj",emoji:"🏷"})} style={{...btnC(C.green,true),fontSize:12,padding:"5px 12px"}}>+ Nová kategorie</button>
      <button onClick={pustPravidlaZpetne} disabled={!!zpetne}
        title="Projde staré platby a doplní jim zařazení podle pravidel, která vznikla až po importu"
        style={{...btnC(C.accent,true),fontSize:12,padding:"5px 12px"}}>
        {zpetne||`🔁 Uplatnit pravidla zpětně (${(pravidla||[]).length})`}
      </button>
    </div>

    <div style={{background:"#eef4fc",border:"1px solid #b3d1f0",borderRadius:10,padding:"9px 14px",fontSize:12,color:"#3066b0",marginBottom:14}}>
      Jedno zařazení platí pro celou skupinu. Pokud necháš zatržené „zapamatovat", příští import
      stejného obchodníka zařadí sám. Převody mezi tvými účty se tu neukazují — ty kategorii nepotřebují.
      <div style={{marginTop:6}}>
        <strong>Kategorie</strong> říká za co to bylo, <strong>projekt</strong> na čem (hypotéka, SJM, auta)
        a <strong>koho se týká</strong> pro koho — celá rodina, jeden člověk, konkrétní auto nebo dům.
        Vyplň jen to, co dává smysl; prázdné se nepřepíše.
      </div>
    </div>

    <div style={{display:"flex",flexDirection:"column",gap:8}}>
      {skupiny.length===0&&<div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:24,textAlign:"center",color:C.dim}}>Nic k zařazení</div>}
      {skupiny.slice(0,150).map(s=>{
        const prijmy=s.suma>0;
        return <div key={s.klic} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"12px 14px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}}>
            <div style={{minWidth:220,flex:1}}>
              <div style={{fontWeight:700,fontSize:14}}>{s.klic}</div>
              <div style={{fontSize:11,color:C.muted,marginTop:2}}>
                {s.polozky.length}× · celkem <strong style={{color:prijmy?C.green:C.red}}>{fmtKc(s.suma)}</strong> ·
                {" "}{new Date(s.polozky[s.polozky.length-1].datum).toLocaleDateString("cs-CZ")} – {new Date(s.polozky[0].datum).toLocaleDateString("cs-CZ")}
              </div>
              <div style={{fontSize:11,color:C.dim,marginTop:3}}>
                {s.polozky.slice(0,2).map(p=>`${p.popis||""} ${p.poznamka||""} ${p.protistrana?"➜ "+p.protistrana:""}`.trim().slice(0,72)).join(" · ")}
              </div>
              {(()=>{
                const kat=(kategorie||[]).find(k=>k.id===s.polozky[0].kategorie_id);
                const pr=(projekty||[]).find(p=>String(p.id)===String(s.polozky[0].projekt_id));
                const su=subjektNazev(s.polozky[0].subjekt_typ,s.polozky[0].subjekt_id,deti,auta);
                if(!kat&&!pr&&!su)return null;
                return <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:5}}>
                  {kat&&<span style={stitek}>{kat.emoji||"🏷"} {kat.nazev}</span>}
                  {pr&&<span style={{...stitek,background:"#eef4fc",color:"#3066b0"}}>{pr.emoji||"📁"} {pr.nazev}</span>}
                  {su&&<span style={{...stitek,background:"#f0f7ee",color:"#3f7d33"}}>{su}</span>}
                </div>;
              })()}
            </div>
            <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
              <VyberKategorie hodnota={volba[s.klic]} kategorie={kategorie} prijem={prijmy} sirka={220}
                onVyber={id=>setVolba(v=>({...v,[s.klic]:id||""}))}
                onNova={nazev=>setNovaKat({nazev,typ:prijmy?"prijem":"vydaj",emoji:"🏷",proSkupinu:s.klic})}/>
              <select style={{...inp,fontSize:12,padding:"5px 8px",minWidth:150}} value={volbaProj[s.klic]||""} onChange={e=>setVolbaProj(v=>({...v,[s.klic]:e.target.value}))}>
                <option value="">— projekt —</option>
                {(projekty||[]).map(p=><option key={p.id} value={p.id}>{p.emoji||"📁"} {p.nazev}</option>)}
                <option value="__zadny">✕ žádný projekt</option>
              </select>
              <SubjektSelect deti={deti} auta={auta} value={volbaSubj[s.klic]} onChange={v=>setVolbaSubj(x=>({...x,[s.klic]:v}))}
                style={{...inp,fontSize:12,padding:"5px 8px",minWidth:160}}/>
              <label style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:C.muted,cursor:"pointer"}}>
                <input type="checkbox" checked={ulozPravidlo[s.klic]!==false} onChange={e=>setUlozPravidlo(p=>({...p,[s.klic]:e.target.checked}))}/> zapamatovat
              </label>
              <button onClick={()=>zarad(s)} disabled={(!volba[s.klic]&&!volbaProj[s.klic]&&!volbaSubj[s.klic])||pracuje===s.klic} style={{...btnC(),fontSize:12,padding:"6px 14px"}}>
                {pracuje===s.klic?"…":`Zařadit ${s.polozky.length}×`}
              </button>
            </div>
          </div>
        </div>;
      })}
      {skupiny.length>150&&<div style={{textAlign:"center",color:C.muted,fontSize:12,padding:8}}>…a dalších {skupiny.length-150} skupin. Zařaď ty velké a zbytek se pročistí.</div>}
    </div>

    {novaKat&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{background:C.surface,borderRadius:18,padding:28,width:"100%",maxWidth:360,boxShadow:"0 20px 60px rgba(0,0,0,.25)"}}>
        <h3 style={{margin:"0 0 18px",fontSize:17,fontWeight:800}}>Nová kategorie</h3>
        <div style={{marginBottom:11}}>
          <div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:4}}>Název</div>
          <input style={inp} value={novaKat.nazev} autoFocus onChange={e=>setNovaKat(k=>({...k,nazev:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&zalozKategorii()}/>
        </div>
        <div style={{display:"flex",gap:10,marginBottom:11}}>
          <div style={{flex:1}}>
            <div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:4}}>Typ</div>
            <select style={inp} value={novaKat.typ} onChange={e=>setNovaKat(k=>({...k,typ:e.target.value}))}>
              <option value="vydaj">Výdaj</option><option value="prijem">Příjem</option>
            </select>
          </div>
          <div style={{width:90}}>
            <div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:4}}>Emoji</div>
            <input style={inp} value={novaKat.emoji} onChange={e=>setNovaKat(k=>({...k,emoji:e.target.value}))}/>
          </div>
        </div>
        <div style={{display:"flex",gap:10,marginTop:16}}>
          <button onClick={zalozKategorii} disabled={!novaKat.nazev.trim()} style={btnC()}>Založit</button>
          <button onClick={()=>setNovaKat(null)} style={btnC(C.muted,true)}>Zrušit</button>
        </div>
      </div>
    </div>}
  </div>;
}


// ── Pokrytí importu ──────────────────────────────────────────────────────────
// Řádky účty, sloupce měsíce. Počítá se podle data jednotlivých transakcí,
// ne podle období souboru — jeden CSV za sedm měsíců se tak správně rozloží
// do sedmi sloupců místo do jednoho.
function PokrytiImportu({ucty}){
  const {data:trans,loading}=useData(()=>nactiVse((od,do_)=>sb.from("fin_transakce")
    .select("ucet_id,datum").eq("zdroj","import").order("datum").range(od,do_)));
  if(loading)return <Spinner/>;

  const bankovni=(ucty||[]).filter(u=>u.cislo_uctu||["finance","deti"].includes(u.skupina||"finance"))
    .sort((a,b)=>(a.poradi||0)-(b.poradi||0));

  const mapa=new Map();
  for(const t of (trans||[])){
    if(!t.ucet_id||!t.datum)continue;
    const k=`${t.ucet_id}|${String(t.datum).slice(0,7)}`;
    mapa.set(k,(mapa.get(k)||0)+1);
  }

  const dnes=new Date();
  const prvni=(trans||[])[0]?.datum;
  const zacatek=prvni?new Date(prvni):new Date(dnes.getFullYear(),dnes.getMonth()-11,1);
  const mesice=[];
  for(let d=new Date(zacatek.getFullYear(),zacatek.getMonth(),1);d<=dnes;d.setMonth(d.getMonth()+1))
    mesice.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`);

  const celkem=(trans||[]).length;
  const nazevMesice=m=>{const [r,ms]=m.split("-");return new Date(+r,+ms-1,1).toLocaleDateString("cs-CZ",{month:"short"}).replace(".","");};

  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:14}}>
      <div style={{fontSize:13,fontWeight:700}}>
        {bankovni.length} účtů · {mesice.length} měsíců · celkem <span style={{color:C.accent}}>{celkem.toLocaleString("cs")}</span> naimportovaných transakcí
      </div>
      <div style={{display:"flex",gap:14,fontSize:11,color:C.muted,alignItems:"center"}}>
        <span><span style={{display:"inline-block",width:11,height:11,background:C.green,borderRadius:3,marginRight:5,verticalAlign:-1}}/>nahráno</span>
        <span><span style={{display:"inline-block",width:11,height:11,background:C.border,borderRadius:3,marginRight:5,verticalAlign:-1}}/>chybí</span>
      </div>
    </div>

    {celkem===0&&<div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:24,textAlign:"center",color:C.dim}}>Zatím nic naimportováno</div>}

    {celkem>0&&<div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,overflow:"auto"}}>
      <table style={{borderCollapse:"collapse",fontSize:12,width:"100%"}}>
        <thead><tr style={{background:C.bg}}>
          <th style={{padding:"8px 12px",textAlign:"left",fontSize:10,fontWeight:700,color:C.muted,textTransform:"uppercase",position:"sticky",left:0,background:C.bg,minWidth:190}}>Účet</th>
          {mesice.map(m=><th key={m} style={{padding:"8px 4px",textAlign:"center",fontSize:10,fontWeight:700,color:C.muted,minWidth:44,whiteSpace:"nowrap"}}>
            <div>{nazevMesice(m)}</div><div style={{fontWeight:400,color:C.dim}}>{m.slice(2,4)}</div>
          </th>)}
          <th style={{padding:"8px 10px",textAlign:"center",fontSize:10,fontWeight:700,color:C.muted,textTransform:"uppercase"}}>Celkem</th>
        </tr></thead>
        <tbody>
          {bankovni.map((u,i)=>{
            const radek=mesice.map(m=>mapa.get(`${u.id}|${m}`)||0);
            const suma=radek.reduce((a,z)=>a+z,0);
            const chybi=radek.filter(z=>!z).length;
            return <tr key={u.id} style={{background:i%2?"#fafbff":C.surface,borderBottom:`1px solid ${C.border}`}}>
              <td style={{padding:"7px 12px",position:"sticky",left:0,background:i%2?"#fafbff":C.surface,whiteSpace:"nowrap"}}>
                <div style={{fontWeight:600}}>{u.nazev}</div>
                <div style={{fontSize:10,color:u.cislo_uctu?C.dim:C.orange}}>
                  {u.cislo_uctu||"⚠ bez čísla účtu — výpis se nespáruje sám"}
                  {u.cislo_uctu&&(chybi?` · chybí ${chybi}×`:" · kompletní")}
                </div>
              </td>
              {radek.map((z,j)=><td key={j} style={{padding:"4px 3px",textAlign:"center"}}>
                {z
                  ? <div style={{background:C.green,color:"#fff",borderRadius:5,padding:"4px 2px",fontWeight:700,fontSize:10}}>{z}</div>
                  : <div style={{background:C.border,borderRadius:5,padding:"4px 2px",color:C.dim,fontSize:10}}>–</div>}
              </td>)}
              <td style={{padding:"7px 10px",textAlign:"center",fontWeight:800,color:suma?C.accent:C.dim}}>{suma||"—"}</td>
            </tr>;
          })}
        </tbody>
      </table>
    </div>}
    <div style={{fontSize:11,color:C.muted,marginTop:8}}>
      Číslo v buňce je počet transakcí zaúčtovaných v tom měsíci. Nezáleží na tom, jestli nahraješ
      dvanáct měsíčních souborů nebo jeden roční — rozdělí se to podle data transakce.
      Prázdný měsíc znamená, že z něj nemáš nahraný výpis (nebo se v něm nic nedělo).
    </div>
  </div>;
}

// ══════════════════════════════════════════════════════════════════════════════
// FINANCE — nová dlaždice
// Zatím obsahuje jen import z banky. Přehledy přibudou, až budou data,
// aby se stavěly nad skutečnými čísly a ne naslepo. Stará dlaždice
// „Finance — zůstatky OLD" zůstává vedle, dokud nebude tahle plnohodnotná.
// ══════════════════════════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════════════════════════
// PROJEKTY
// Hypotéka, vypořádání SJM nebo insolvence nejsou druhy výdajů — jsou to
// závazky s cílovou částkou a koncem. Platby se sbírají z výpisů, hotovostní
// se dopisují ručně. U závazku se počítá, kolik zbývá a kolik měsíčně musí jít.
// ══════════════════════════════════════════════════════════════════════════════
const kc0=x=>Math.round(+x||0).toLocaleString("cs")+" Kč";
const mesicuDo=d=>{
  if(!d)return null;
  const cil=new Date(d), dnes=new Date();
  return Math.max(0,(cil.getFullYear()-dnes.getFullYear())*12+(cil.getMonth()-dnes.getMonth()));
};

function FinProjektyTab(){
  const {data:projekty,loading,reload}=useData(()=>sb.from("fin_projekty").select("*").order("poradi"));
  const {data:trans,loading:lt}=useData(()=>nactiVse((od,do_)=>sb.from("fin_transakce")
    .select("id,datum,castka,projekt_id").eq("zdroj","import").not("projekt_id","is",null).order("datum").range(od,do_)));
  const {data:platby,reload:reloadPlatby}=useData(()=>sb.from("fin_projekt_platby").select("*").order("datum",{ascending:false}).limit(2000));
  const [edit,setEdit]=useState(null);      // projekt objekt nebo "novy"
  const [hotove,setHotove]=useState(null);  // {projekt_id} → přidat hotovostní platbu
  const [detail,setDetail]=useState(null);

  if(loading||lt)return <Spinner/>;

  const spocti=p=>{
    const zVypisu=(trans||[]).filter(t=>String(t.projekt_id)===String(p.id));
    const zVypisuSuma=zVypisu.reduce((a,t)=>a+(+t.castka<0?-+t.castka:0),0);
    // Některé projekty mají i příjmovou stranu — příspěvek na péči přijde,
    // část se utratí a zbytek zůstane. Pak nedává smysl ukazovat jen výdaje.
    const prijmy=zVypisu.reduce((a,t)=>a+(+t.castka>0?+t.castka:0),0);
    const hot=(platby||[]).filter(x=>String(x.projekt_id)===String(p.id));
    const hotSuma=hot.reduce((a,x)=>a+(+x.castka||0),0);
    const zaplaceno=(+p.zaplaceno_pred||0)+zVypisuSuma+hotSuma;
    const zbyva=p.cilova_castka?Math.max(0,+p.cilova_castka-zaplaceno):null;
    const mes=mesicuDo(p.datum_do);
    return {zVypisu,zVypisuSuma,prijmy,obousmerny:prijmy>0,zustava:prijmy-zaplaceno,
      hot,hotSuma,zaplaceno,zbyva,mes,
      potreba:(zbyva!=null&&mes)?zbyva/mes:null,
      procenta:p.cilova_castka?Math.min(100,zaplaceno/+p.cilova_castka*100):null};
  };

  // Akce nemají měsíční splátku — do „berou měsíčně" tedy nepatří.
  const celkemMesicne=(projekty||[]).filter(p=>p.aktivni!==false&&p.typ!=="akce").reduce((a,p)=>a+(+p.mesicni_castka||0),0);

  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap",marginBottom:14}}>
      <div style={{fontSize:13,fontWeight:700}}>
        Závazky a projekty berou měsíčně <span style={{color:C.red}}>{kc0(celkemMesicne)}</span>
      </div>
      <button onClick={()=>setEdit("novy")} style={{...btnC(C.green,true),fontSize:12,padding:"5px 12px"}}>+ Nový projekt</button>
    </div>

    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      {(projekty||[]).length===0&&<div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:24,textAlign:"center",color:C.dim}}>
        Zatím žádný projekt. Spusť migraci <code>supabase_projekty.sql</code>, nebo si založ vlastní.
      </div>}
      {(projekty||[]).map(p=>{
        const s=spocti(p);
        return <div key={p.id} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"14px 16px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,flexWrap:"wrap"}}>
            <div style={{minWidth:220,flex:1}}>
              <div style={{fontWeight:800,fontSize:15}}>{p.emoji||"📁"} {p.nazev}</div>
              <div style={{fontSize:11,color:C.muted,marginTop:3}}>
                {p.typ==="zavazek"?"Závazek":p.typ==="akce"?"Akce":"Provoz"}
                {p.mesicni_castka?` · ${kc0(p.mesicni_castka)} měsíčně`:""}
                {p.datum_do?` · konec ${new Date(p.datum_do).toLocaleDateString("cs-CZ")}${s.mes!=null?` (${s.mes} měs.)`:""}`:""}
                {` · ${s.zVypisu.length} plateb z výpisů`}
                {s.hot.length?` · ${s.hot.length}× hotově`:""}
              </div>
              {p.poznamka&&<div style={{fontSize:11,color:C.dim,marginTop:4}}>{p.poznamka}</div>}
            </div>
            <div style={{textAlign:"right"}}>
              {s.obousmerny
                ? <>
                    <div style={{fontSize:18,fontWeight:800,color:s.zustava>=0?C.green:C.red}}>{kc0(s.zustava)}</div>
                    <div style={{fontSize:11,color:C.muted}}>zůstává stranou</div>
                    <div style={{fontSize:11.5,color:C.muted,marginTop:3}}>
                      přišlo <strong style={{color:C.green}}>{kc0(s.prijmy)}</strong>
                      {" · "}odešlo <strong style={{color:C.red}}>{kc0(s.zaplaceno)}</strong>
                    </div>
                  </>
                : <>
                    <div style={{fontSize:18,fontWeight:800,color:C.text}}>{kc0(s.zaplaceno)}</div>
                    <div style={{fontSize:11,color:C.muted}}>
                      {p.cilova_castka?<>z {kc0(p.cilova_castka)}{p.typ==="akce"?" v rozpočtu":""}</>:p.typ==="akce"?"stálo celkem":"zaplaceno celkem"}
                    </div>
                    {s.zbyva!=null&&<div style={{fontSize:12,fontWeight:700,color:s.zbyva>0?C.orange:C.green,marginTop:2}}>
                      {s.zbyva>0?`zbývá ${kc0(s.zbyva)}`:"✓ splaceno"}
                    </div>}
                  </>}
            </div>
          </div>

          {s.procenta!=null&&!s.obousmerny&&<div style={{marginTop:10}}>
            <div style={{height:8,background:C.border,borderRadius:6,overflow:"hidden"}}>
              <div style={{width:`${s.procenta}%`,height:"100%",background:s.procenta>=100?C.green:C.accent}}/>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:C.muted,marginTop:4}}>
              <span>{s.procenta.toFixed(1)} %</span>
              {s.potreba!=null&&<span style={{color:s.potreba>(+p.mesicni_castka||0)?C.red:C.green}}>
                do konce je potřeba {kc0(s.potreba)} měsíčně
                {p.mesicni_castka?` (platíš ${kc0(p.mesicni_castka)})`:""}
              </span>}
            </div>
          </div>}

          <div style={{display:"flex",gap:8,marginTop:10,flexWrap:"wrap"}}>
            <button onClick={()=>setDetail(detail===p.id?null:p.id)} style={{...btnC(C.muted,true),fontSize:11,padding:"4px 10px"}}>
              {detail===p.id?"Skrýt platby":"Platby"}
            </button>
            <button onClick={()=>setHotove({projekt_id:p.id,datum:new Date().toISOString().slice(0,10),castka:"",poznamka:""})} style={{...btnC(C.green,true),fontSize:11,padding:"4px 10px"}}>+ Platba mimo výpisy</button>
            <button onClick={()=>setEdit(p)} style={{...btnC(C.accent,true),fontSize:11,padding:"4px 10px"}}>Upravit</button>
          </div>

          {detail===p.id&&<div style={{marginTop:10,borderTop:`1px solid ${C.border}`,paddingTop:8,maxHeight:280,overflowY:"auto"}}>
            {[...s.hot.map(x=>({datum:x.datum,castka:+x.castka,popis:"Hotově"+(x.poznamka?" · "+x.poznamka:""),hot:x})),
              ...s.zVypisu.map(t=>({datum:t.datum,castka:-+t.castka,
                popis:(+t.castka>0?"Přišlo · ":"Z výpisu · ")+String(t.popis||"").slice(0,50)}))]
              .sort((a,b)=>String(b.datum).localeCompare(String(a.datum)))
              .map((r,i)=><div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:12,padding:"3px 0",color:C.muted}}>
                <span>{new Date(r.datum).toLocaleDateString("cs-CZ")} · {r.popis}</span>
                <span style={{display:"flex",gap:8,alignItems:"center"}}>
                  <strong style={{color:C.text}}>{kc0(r.castka)}</strong>
                  {r.hot&&<button onClick={async()=>{if(confirm("Smazat tuhle hotovostní platbu?")){await sb.from("fin_projekt_platby").delete().eq("id",r.hot.id);reloadPlatby();}}}
                    style={{background:"none",border:"none",color:C.dim,cursor:"pointer",fontSize:12}}>✕</button>}
                </span>
              </div>)}
          </div>}
        </div>;
      })}
    </div>

    {edit&&<FinProjektModal projekt={edit==="novy"?null:edit} onClose={()=>setEdit(null)} onSaved={()=>{setEdit(null);reload();}}/>}
    {hotove&&<HotovostniPlatbaModal zaznam={hotove} onClose={()=>setHotove(null)} onSaved={()=>{setHotove(null);reloadPlatby();}}/>}
  </div>;
}

function FinProjektModal({projekt,onClose,onSaved}){
  const [f,setF]=useState(projekt||{nazev:"",emoji:"📁",typ:"zavazek",cilova_castka:"",zaplaceno_pred:"",mesicni_castka:"",datum_od:"",datum_do:"",poznamka:"",aktivni:true});
  const akce=f.typ==="akce";
  const [saving,setSaving]=useState(false);
  const uloz=async()=>{
    if(!f.nazev.trim())return;
    setSaving(true);
    const row={nazev:f.nazev.trim(),emoji:f.emoji||"📁",typ:f.typ,poznamka:f.poznamka||null,aktivni:f.aktivni!==false,
      cilova_castka:f.cilova_castka===""||f.cilova_castka==null?null:+f.cilova_castka,
      zaplaceno_pred:f.zaplaceno_pred===""||f.zaplaceno_pred==null?0:+f.zaplaceno_pred,
      mesicni_castka:f.mesicni_castka===""||f.mesicni_castka==null?null:+f.mesicni_castka,
      datum_od:f.datum_od||null, datum_do:f.datum_do||null};
    // U akce nemá splátka ani „zaplaceno před" smysl — ať se do dat nedostane
    // číslo, které by pak kazilo součty.
    if(akce){row.mesicni_castka=null;row.zaplaceno_pred=0;}
    const {error}=projekt?await sb.from("fin_projekty").update(row).eq("id",projekt.id)
                          :await sb.from("fin_projekty").insert(row);
    setSaving(false);
    if(error){alert("Chyba: "+error.message);return;}
    onSaved();
  };
  const pole=(l,k,typ="text",np)=><div style={{flex:1,minWidth:130}}>
    <div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:4}}>{l}</div>
    <input style={inp} type={typ} placeholder={np} value={f[k]??""} onChange={e=>setF(x=>({...x,[k]:e.target.value}))}/>
  </div>;
  return <Modal title={projekt?"Upravit projekt":"Nový projekt"} onClose={onClose} width={520}>
    <div style={{display:"flex",gap:10,marginBottom:11}}>
      <div style={{width:80}}>
        <div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:4}}>Emoji</div>
        <input style={inp} value={f.emoji||""} onChange={e=>setF(x=>({...x,emoji:e.target.value}))}/>
      </div>
      {pole("Název","nazev")}
    </div>
    <div style={{display:"flex",gap:10,marginBottom:11}}>
      <div style={{flex:1}}>
        <div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:4}}>Typ</div>
        <select style={inp} value={f.typ} onChange={e=>setF(x=>({...x,typ:e.target.value}))}>
          <option value="zavazek">Závazek — splácí se do nuly</option>
          <option value="provoz">Provoz — běží dál</option>
          <option value="akce">Akce — jednorázová věc, jen se sčítá (svatba, případ u právníka)</option>
        </select>
      </div>
    </div>
    <div style={{fontSize:11,color:C.dim,marginBottom:11,marginTop:-4}}>
      {f.typ==="zavazek"&&"Má cílovou částku a konec. Počítá se, kolik zbývá a jestli na to současná splátka stačí."}
      {f.typ==="provoz"&&"Běží bez konce. Sčítá se, kolik měsíčně bere."}
      {akce&&"Nemá cíl ani splátku — jen se sečte, kolik ta věc dohromady stála. Platby jí přiřadíš v rozpadu u konkrétní platby, hotovostní se dopisují tlačítkem + Platba hotově."}
    </div>
    <div style={{display:"flex",gap:10,marginBottom:11}}>
      {pole(akce?"Rozpočet (nepovinné)":"Cílová částka","cilova_castka","number",akce?"kolik to mělo stát":"např. 1000000")}
      {!akce&&pole("Zaplaceno před evidencí","zaplaceno_pred","number","0")}
    </div>
    <div style={{display:"flex",gap:10,marginBottom:11}}>
      {!akce&&pole("Měsíční splátka","mesicni_castka","number")}
      {akce&&pole("Od","datum_od","date")}
      {pole(akce?"Do":"Konec","datum_do","date")}
    </div>
    <div style={{marginBottom:11}}>
      <div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:4}}>Poznámka</div>
      <textarea style={{...inp,minHeight:60,fontFamily:"inherit"}} value={f.poznamka||""} onChange={e=>setF(x=>({...x,poznamka:e.target.value}))}/>
    </div>
    <div style={{display:"flex",gap:10,marginTop:16}}>
      <button onClick={uloz} disabled={saving||!f.nazev.trim()} style={btnC()}>{saving?"Ukládám…":"Uložit"}</button>
      <button onClick={onClose} style={btnC(C.muted,true)}>Zrušit</button>
    </div>
  </Modal>;
}

function HotovostniPlatbaModal({zaznam,onClose,onSaved}){
  const [f,setF]=useState(zaznam);
  const [saving,setSaving]=useState(false);
  const [opakovat,setOpakovat]=useState(false);
  const [doData,setDoData]=useState(new Date().toISOString().slice(0,10));

  // Pravidelná platba, kterou ve výpisu nenajdeš — třeba paušál O2, který
  // z účtu odchází schovaný uvnitř jedné faktury za všechna čísla. Zapsat ji
  // dvanáctkrát ručně je nesmysl, tak se rozpočítá po měsících najednou.
  const mesicniDatumy=()=>{
    const out=[]; const d=new Date(f.datum), konec=new Date(doData);
    if(isNaN(d)||isNaN(konec)||konec<d)return [f.datum];
    const den=d.getDate();
    for(let x=new Date(d); x<=konec; x.setMonth(x.getMonth()+1)){
      // Když měsíc daný den nemá (31. v únoru), vezme se poslední den měsíce.
      const posl=new Date(x.getFullYear(),x.getMonth()+1,0).getDate();
      out.push(`${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,"0")}-${String(Math.min(den,posl)).padStart(2,"0")}`);
      x.setDate(1);
    }
    return out;
  };
  const pocet=opakovat?mesicniDatumy().length:1;

  const uloz=async()=>{
    if(!f.castka)return;
    setSaving(true);
    const datumy=opakovat?mesicniDatumy():[f.datum];
    const rows=datumy.map(dt=>({projekt_id:f.projekt_id,datum:dt,castka:+f.castka,poznamka:f.poznamka||null}));
    const {error}=await sb.from("fin_projekt_platby").insert(rows);
    setSaving(false);
    if(error){alert("Chyba: "+error.message);return;}
    onSaved();
  };
  return <Modal title="Platba mimo výpisy" onClose={onClose} width={440}>
    <div style={{fontSize:12,color:C.muted,marginBottom:12}}>
      Platby, které se ve výpisu nedají najít — hotovost, nebo částka schovaná uvnitř
      větší faktury. Připočtou se k projektu stejně jako ty z výpisů.
    </div>
    <div style={{display:"flex",gap:10,marginBottom:11}}>
      <div style={{flex:1}}>
        <div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:4}}>Datum</div>
        <input style={inp} type="date" value={f.datum} onChange={e=>setF(x=>({...x,datum:e.target.value}))}/>
      </div>
      <div style={{flex:1}}>
        <div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:4}}>Částka</div>
        <input style={inp} type="number" autoFocus value={f.castka} onChange={e=>setF(x=>({...x,castka:e.target.value}))}/>
      </div>
    </div>
    <div style={{marginBottom:11}}>
      <div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:4}}>Poznámka</div>
      <input style={inp} value={f.poznamka||""} onChange={e=>setF(x=>({...x,poznamka:e.target.value}))}
        placeholder="např. paušál O2 v rámci faktury"/>
    </div>

    <label style={{display:"flex",alignItems:"center",gap:7,fontSize:12.5,cursor:"pointer",marginBottom:8}}>
      <input type="checkbox" checked={opakovat} onChange={e=>setOpakovat(e.target.checked)}/>
      Opakuje se každý měsíc
    </label>
    {opakovat&&<div style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 12px"}}>
      <div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:4}}>Poslední měsíc</div>
      <input style={inp} type="date" value={doData} min={f.datum} onChange={e=>setDoData(e.target.value)}/>
      <div style={{fontSize:11.5,color:C.muted,marginTop:6}}>
        Zapíše se <strong>{pocet}×</strong> po {kc0(+f.castka||0)}, celkem <strong>{kc0((+f.castka||0)*pocet)}</strong>.
        Každou z nich pak jde v seznamu plateb smazat zvlášť.
      </div>
    </div>}

    <div style={{display:"flex",gap:10,marginTop:16}}>
      <button onClick={uloz} disabled={saving||!f.castka} style={btnC()}>
        {saving?"Ukládám…":opakovat?`Uložit ${pocet} plateb`:"Uložit"}</button>
      <button onClick={onClose} style={btnC(C.muted,true)}>Zrušit</button>
    </div>
  </Modal>;
}

// ══════════════════════════════════════════════════════════════════════════════
// KOLIK MŮŽU UTRATIT
// Jediná obrazovka, která odpovídá na otázku, kvůli které to celé vzniklo.
// Bere jen skutečné pohyby z výpisů, jen z běžných účtů, jen dokončené měsíce.
// Převody mezi vlastními účty se ignorují, aby se příjem nenafoukl.
// ══════════════════════════════════════════════════════════════════════════════
// Číslo protiúčtu z výpisu bez kódu banky a bez vodicích nul, aby se
// „0000000285720588" a „285720588/3030" spároval na jeden a ten samý účet.
function normCislo(c){
  const bez=String(c||"").split("/")[0].trim();
  if(!bez)return "";
  const i=bez.lastIndexOf("-");
  const pred=(i<0?"":bez.slice(0,i)).replace(/^0+/,"");
  const zak=(i<0?bez:bez.slice(i+1)).replace(/^0+/,"");
  if(!zak)return "";
  return pred?`${pred}-${zak}`:zak;
}

// Rozpad jednoho čísla na řádky, ze kterých vzniklo. Nejdřív souhrn podle
// protistrany — tam je hned vidět, jestli se do příjmů nepletou přesuny mezi
// vlastními účty — a pod tím jednotlivé transakce po měsících.
function RozpadModal({titulek,polozky:vsechny,pocetMesicu,ucty,kategorie,projekty,deti,auta,reloadKategorie,onZmena,onClose}){
  const [rozbaleno,setRozbaleno]=useState(null);
  // Když rozpad stejně obsahuje jen jeden měsíc, není co vybírat — rovnou se
  // ukáže seznam plateb, aby se do něj nemuselo klikat navíc.
  const [mesic,setMesic]=useState(()=>{
    const ms=[...new Set((vsechny||[]).map(t=>String(t.datum).slice(0,7)))];
    return ms.length===1?ms[0]:null;
  });
  const [jenNezarazene,setJenNezarazene]=useState(false);
  const [pravidlo,setPravidlo]=useState(null);   // {vzorNavrh, kandidati, patch, popisPatche}
  const [zmeny,setZmeny]=useState({});        // id → co se změnilo, ať je to vidět hned
  const [uklada,setUklada]=useState(null);
  const {data:jmena,reload:reloadJmena}=useData(()=>sb.from("fin_protistrany").select("*"));
  const jmenoMap=Object.fromEntries((jmena||[]).map(x=>[x.cislo,x.nazev]));
  const pojmenuj=async cislo=>{
    const n=window.prompt(`Kdo je ${cislo}?`,jmenoMap[cislo]||"");
    if(n===null)return;
    const v=n.trim();
    if(!v){await sb.from("fin_protistrany").delete().eq("cislo",cislo);reloadJmena();return;}
    const {error}=await sb.from("fin_protistrany").upsert({cislo,nazev:v},{onConflict:"cislo"});
    if(error)alert("Chyba: "+error.message);
    reloadJmena();
  };
  const uctyMap=Object.fromEntries((ucty||[]).map(u=>[u.id,u.nazev]));
  const katMap=Object.fromEntries((kategorie||[]).map(k=>[k.id,k]));
  const projMap=Object.fromEntries((projekty||[]).map(p=>[String(p.id),p]));

  // Změny se zapisují rovnou do databáze, ale ať se nemusí přenačítat celý
  // přehled, drží se navíc lokálně a překryjí původní hodnotu.
  const svzmenou=t=>zmeny[t.id]?{...t,...zmeny[t.id]}:t;
  const polozky=vsechny.map(svzmenou);
  const uprav=async(t,patch)=>{
    if(!t.id){alert("Tuhle položku nejde upravit — chybí jí ID.");return;}
    setUklada(t.id);
    const {error}=await sb.from("fin_transakce").update(patch).eq("id",t.id);
    setUklada(null);
    if(error){alert("Nepodařilo se uložit: "+error.message);return;}
    setZmeny(z=>({...z,[t.id]:{...(z[t.id]||{}),...patch}}));
  };
  // Přehled se přepočítá až při zavření — jinak by se okno pod rukama překreslovalo.
  const zavri=()=>{ if(Object.keys(zmeny).length)onZmena&&onZmena(); onClose(); };

  // Kategorie, která v číselníku ještě není, se dá založit rovnou od platby.
  const novaKategorie=async(t,navrh)=>{
    const nazev=navrh||window.prompt("Název nové kategorie:","");
    if(!nazev||!nazev.trim())return;
    const {data,error}=await sb.from("fin_kategorie")
      .insert({nazev:nazev.trim(),emoji:"🏷",typ:+t.castka>0?"prijem":"vydaj",poradi:900})
      .select().single();
    if(error){alert("Nepodařilo se založit: "+error.message);return;}
    await uprav(t,{kategorie_id:data.id});
    reloadKategorie&&reloadKategorie();
  };

  // Z popisu platby se nabídnou kusy, ze kterých se dá udělat vzor — celý popis
  // většinou obsahuje i variabilní symbol nebo číslo měsíce, které se mění.
  const maZarazeni=t=>!!(t.kategorie_id||t.projekt_id||t.subjekt_typ);
  const otevriPravidlo=t=>{
    const popis=String(t.popis||"");
    const kandidati=[...new Set(popis.split(/\s·\s|\s—\s/).map(x=>x.trim()).filter(x=>x.length>=3&&x.length<=60))];
    const kat=katMap[t.kategorie_id], pr=projMap[String(t.projekt_id)];
    setPravidlo({
      vzorNavrh:kandidati[kandidati.length-1]||popis.slice(0,50),
      kandidati,
      patch:{kategorie_id:t.kategorie_id||null,projekt_id:t.projekt_id||null,
             subjekt_typ:t.subjekt_typ||null,subjekt_id:t.subjekt_id||null},
      smer:+t.castka>0?"prijem":"vydaj",
      popisPatche:[kat?`${kat.emoji||"🏷"} ${kat.nazev}`:"bez kategorie",
                   pr?`${pr.emoji||"📁"} ${pr.nazev}`:null,
                   subjektNazev(t.subjekt_typ,t.subjekt_id,deti,auta)].filter(Boolean).join(" · "),
    });
  };

  const viditelne=mesic?polozky.filter(t=>String(t.datum).slice(0,7)===mesic):polozky;
  // Zařazená je platba, která má kategorii nebo patří pod projekt; převody se
  // netřídí. Filtr „jen nezařazené" pak drží seznam krátký, jak se prochází.
  const nezarazena=t=>t.typ!=="prevod"&&!t.kategorie_id&&!t.projekt_id&&!t.subjekt_typ;
  const nezarazenych=viditelne.filter(nezarazena).length;
  const kTrideni=jenNezarazene?viditelne.filter(nezarazena):viditelne;
  const celkem=viditelne.reduce((a,t)=>a+Math.abs(+t.castka),0);

  // U příchozích plateb je jediné, co odesílatele identifikuje, číslo protiúčtu
  // — popis nese jen text platby, což je většinou vlastní jméno příjemce.
  // Seskupuje se proto přednostně podle protiúčtu a název se bere z číselníku.
  const skupiny=(()=>{
    const m=new Map();
    for(const t of viditelne){
      const cislo=normCislo(t.protistrana);
      const k=cislo?`#${cislo}`:klicObchodnika(t);
      if(!m.has(k))m.set(k,{klic:k,cislo,polozky:[],suma:0});
      const s=m.get(k); s.polozky.push(t); s.suma+=Math.abs(+t.castka);
    }
    return [...m.values()].sort((a,b)=>b.suma-a.suma);
  })();
  const nazevSkupiny=s=>s.cislo?(jmenoMap[s.cislo]||s.cislo):s.klic;

  // Rozpad po měsících, ať je vidět, které měsíce se do průměru počítají
  const poMesicich=(()=>{
    const m=new Map();
    for(const t of polozky){
      const k=String(t.datum).slice(0,7);
      m.set(k,(m.get(k)||0)+Math.abs(+t.castka));
    }
    return [...m.entries()].sort((a,b)=>a[0].localeCompare(b[0]));
  })();

  return <Modal title={titulek} onClose={zavri} width={860}>
    <div style={{fontSize:13,marginBottom:12}}>
      <strong>{viditelne.length}</strong> pohybů, celkem <strong>{kc0(celkem)}</strong>
      {mesic
        ? <> za {mesic}. <button onClick={()=>setMesic(null)} style={{...btnC(C.muted,true),fontSize:11,padding:"2px 8px",marginLeft:6}}>zpět na všechny měsíce</button></>
        : <> za {poMesicich.length} měsíců{pocetMesicu?<> → průměr <strong>{kc0(celkem/pocetMesicu)}</strong> měsíčně</>:null}.</>}
    </div>
    <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:14}}>
      {poMesicich.map(([m,v])=>{
        const akt=mesic===m;
        return <div key={m} onClick={()=>{setMesic(akt?null:m);setRozbaleno(null);}}
          title="Ukázat všechny platby v tomhle měsíci"
          style={{background:akt?C.accent:C.bg,color:akt?"#fff":C.text,border:`1px solid ${akt?C.accent:C.border}`,
                  borderRadius:8,padding:"5px 10px",fontSize:11,cursor:"pointer"}}>
          <div style={{color:akt?"#ffffffcc":C.muted}}>{m}</div>
          <div style={{fontWeight:700}}>{kc0(v)}</div>
        </div>;
      })}
    </div>
    <div style={{fontSize:12,color:C.muted,marginBottom:10}}>
      {mesic
        ? <>Platby za {mesic} od nejnovější. U každé můžeš rovnou přepnout kategorii — a jestli tam nepatří, označit ji jako převod, čímž z příjmů i výdajů vypadne.
           {" "}<label style={{cursor:"pointer",color:C.accent}}>
             <input type="checkbox" checked={jenNezarazene} onChange={e=>setJenNezarazene(e.target.checked)} style={{marginRight:4,verticalAlign:"-1px"}}/>
             jen nezařazené ({nezarazenych})
           </label></>
        : <>Seskupeno podle protiúčtu — u příchozí platby banka jméno odesílatele neposílá, jen číslo účtu.
           Klikni na řádek pro jednotlivé platby, na měsíc nahoře pro všechny platby v něm, nebo si protistranu pojmenuj.</>}
    </div>

    {mesic&&<div style={{maxHeight:"62vh",overflowY:"auto"}}>
      {kTrideni.length===0&&<div style={{fontSize:12,color:C.dim,padding:"10px 0"}}>
        {jenNezarazene?"Všechno v tomhle měsíci je zařazené.":"Za tenhle měsíc tu nic není."}
      </div>}
      {kTrideni.slice().sort((a,b)=>String(b.datum).localeCompare(String(a.datum))).map((t,i)=>
        <Radek key={t.id||i} t={t} uctyMap={uctyMap} katMap={katMap} projMap={projMap} kategorie={kategorie}
          projekty={projekty} deti={deti} auta={auta} uklada={uklada===t.id} uprav={uprav}
          novaKategorie={novaKategorie} naOstatni={otevriPravidlo} editovatelny/>)}
    </div>}

    {pravidlo&&<PravidloModal {...pravidlo} onClose={()=>setPravidlo(null)}
      onHotovo={(pocet,vzor)=>{
        setPravidlo(null);
        alert(`Nastaveno u ${pocet} plateb podle textu „${vzor}".`);
        onZmena&&onZmena(); onClose();
      }}/>}

    {!mesic&&<div style={{maxHeight:"62vh",overflowY:"auto"}}>
      {skupiny.map(s=>{
        const otevreno=rozbaleno===s.klic;
        return <div key={s.klic} style={{borderBottom:`1px solid ${C.border}`}}>
          <div onClick={()=>setRozbaleno(otevreno?null:s.klic)}
            style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,padding:"8px 4px",cursor:"pointer"}}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:13,fontWeight:600}}>
                {otevreno?"▾":"▸"} {nazevSkupiny(s)}
                {s.cislo&&<span onClick={e=>{e.stopPropagation();pojmenuj(s.cislo);}}
                  title="Pojmenovat tuhle protistranu"
                  style={{marginLeft:8,fontSize:11,fontWeight:400,color:C.accent,cursor:"pointer",textDecoration:"underline"}}>
                  {jmenoMap[s.cislo]?"přejmenovat":"kdo to je?"}
                </span>}
              </div>
              <div style={{fontSize:11,color:C.dim,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                {s.polozky.length}× · {s.cislo?`účet ${s.cislo} · `:""}{(s.polozky[0].popis||"").slice(0,70)}
              </div>
              {(()=>{
                const vsy=[...new Set(s.polozky.map(x=>x.vs).filter(Boolean))];
                if(!vsy.length)return null;
                return <div style={{fontSize:11,color:C.accent,marginTop:2}}>
                  VS: {vsy.slice(0,8).join(", ")}{vsy.length>8?` a ${vsy.length-8} dalších`:""}
                </div>;
              })()}
            </div>
            <div style={{textAlign:"right",whiteSpace:"nowrap"}}>
              <div style={{fontWeight:800,fontSize:14}}>{kc0(s.suma)}</div>
              <div style={{fontSize:10,color:C.dim}}>{(s.suma/celkem*100).toFixed(1)} %</div>
            </div>
          </div>
          {otevreno&&<div style={{padding:"0 4px 10px 20px"}}>
            {s.polozky.slice().sort((a,b)=>String(b.datum).localeCompare(String(a.datum))).map((t,i)=>
              <Radek key={t.id||i} t={t} uctyMap={uctyMap} katMap={katMap} projMap={projMap} kategorie={kategorie}
                projekty={projekty} deti={deti} auta={auta} uklada={uklada===t.id} uprav={uprav}
                novaKategorie={novaKategorie} naOstatni={otevriPravidlo} editovatelny/>)}
          </div>}
        </div>;
      })}
    </div>}
  </Modal>;
}

// ══════════════════════════════════════════════════════════════════════════════
// Výběr kategorie psaním. Kategorií jsou desítky, rolovat je nesmysl — napíšeš
// „poj" a zbydou pojistky. Seznam se rozbaluje pod polem (ne přes něj), aby ho
// neuřízl okraj rolovacího seznamu plateb. Enter bere první nabídku.
// ══════════════════════════════════════════════════════════════════════════════
function VyberKategorie({hodnota,kategorie,prijem,disabled,sirka=230,onVyber,onNova}){
  const [otevreno,setOtevreno]=useState(false);
  const [q,setQ]=useState("");
  const vybrana=(kategorie||[]).find(k=>String(k.id)===String(hodnota));
  const dotaz=bezDiakritiky(q.trim());
  // Nejdřív kategorie, které sedí na směr platby — u výdaje nemá smysl
  // nabízet „Mzda", i když na hledaný text náhodou sedí.
  const seznam=(kategorie||[])
    .filter(k=>!dotaz||bezDiakritiky(k.nazev).includes(dotaz))
    .sort((a,b)=>(((b.typ==="prijem")===prijem)?1:0)-(((a.typ==="prijem")===prijem)?1:0));
  const zavri=()=>{setOtevreno(false);setQ("");};
  const vyber=k=>{onVyber(k?k.id:null);zavri();};

  if(!otevreno)return <button disabled={disabled} onClick={()=>setOtevreno(true)}
    style={{...inp,width:"auto",maxWidth:sirka,fontSize:11,padding:"3px 8px",textAlign:"left",
            cursor:"pointer",color:vybrana?C.text:C.dim,background:C.surface}}>
    {vybrana?`${vybrana.emoji||"🏷"} ${vybrana.nazev}`:"— bez kategorie —"} ▾
  </button>;

  const radek={padding:"4px 8px",fontSize:11.5,cursor:"pointer",borderRadius:6};
  return <div style={{width:sirka}}>
    <input autoFocus value={q} placeholder="piš pro filtrování…"
      onChange={e=>setQ(e.target.value)}
      onKeyDown={e=>{if(e.key==="Enter"&&seznam[0])vyber(seznam[0]);if(e.key==="Escape")zavri();}}
      onBlur={()=>setTimeout(zavri,180)}
      style={{...inp,width:"100%",fontSize:11,padding:"3px 8px"}}/>
    <div style={{marginTop:3,maxHeight:190,overflowY:"auto",background:C.surface,
                 border:`1px solid ${C.border}`,borderRadius:8,padding:3}}>
      <div onMouseDown={()=>vyber(null)} style={{...radek,color:C.dim}}>— bez kategorie —</div>
      {seznam.map(k=><div key={k.id} onMouseDown={()=>vyber(k)}
        style={{...radek,color:(k.typ==="prijem")===prijem?C.text:C.muted}}>
        {k.emoji||"🏷"} {k.nazev}
      </div>)}
      {seznam.length===0&&!onNova&&<div style={{...radek,color:C.dim,cursor:"default"}}>Nic neodpovídá</div>}
      {onNova&&q.trim().length>1&&<div onMouseDown={()=>{const n=q.trim();zavri();onNova(n);}}
        style={{...radek,color:C.accent,fontWeight:700,borderTop:`1px solid ${C.border}`,marginTop:3,paddingTop:6}}>
        ➕ založit kategorii „{q.trim()}"
      </div>}
    </div>
  </div>;
}

// ══════════════════════════════════════════════════════════════════════════════
// „Nastav to i u ostatních" — trvalé platby (pojistky, splátky, inkasa) chodí
// každý měsíc se stejným textem. Zařazovat je jednu po druhé je zbytečná práce,
// takže se z jedné platby udělá vzor: přepíše všechny, které mu odpovídají,
// a uloží se jako pravidlo, aby budoucí importy přišly zařazené samy.
// ══════════════════════════════════════════════════════════════════════════════
// Obecné bankovní fráze — samy o sobě neidentifikují vůbec nic. Pravidlo
// postavené na nich sedne na půlku výpisu, což je přesně to, co se stalo.
const OBECNE_FRAZE=["odchozi uhrada","prichozi uhrada","odchozi platba","prichozi platba",
  "platba kartou","platba","uhrada","nakup","trvaly prikaz","okamzita uhrada","prevod",
  "odeslane inkaso","prijate inkaso","karetni transakce","vyber hotovosti","vklad hotovosti"];
const jeObecny=v=>OBECNE_FRAZE.includes(bezDiakritiky(v).trim());

function PravidloModal({vzorNavrh,kandidati,patch,popisPatche,smer,jenPravidlo,onClose,onHotovo}){
  const [vzor,setVzor]=useState(vzorNavrh||"");
  const [nalezene,setNalezene]=useState(null);
  const [hleda,setHleda]=useState(false);
  const [ulozit,setUlozit]=useState(true);
  const [pracuje,setPracuje]=useState(false);

  // Náhled se přepočítává při psaní, ať je vidět, co vzor chytí, ještě než
  // se zmáčkne tlačítko. Krátké vzory se neposílají — chytily by půlku výpisu.
  useEffect(()=>{
    const v=vzor.trim();
    if(v.length<3){setNalezene(null);return;}
    let zruseno=false; setHleda(true);
    const casovac=setTimeout(async()=>{
      let q=sb.from("fin_transakce").select("id,datum,castka,popis")
        .eq("zdroj","import").ilike("popis",`%${v}%`);
      if(smer==="prijem")q=q.gt("castka",0);
      if(smer==="vydaj") q=q.lt("castka",0);
      const {data}=await q.order("datum",{ascending:false}).limit(500);
      if(!zruseno){setNalezene(data||[]);setHleda(false);}
    },350);
    return ()=>{zruseno=true;clearTimeout(casovac);};
  },[vzor]);

  const pouzij=async()=>{
    const v=vzor.trim(); if(v.length<3)return;
    setPracuje(true);
    if(!jenPravidlo){
      let q=sb.from("fin_transakce").update(patch).eq("zdroj","import").ilike("popis",`%${v}%`);
      if(smer==="prijem")q=q.gt("castka",0);
      if(smer==="vydaj") q=q.lt("castka",0);
      const {error}=await q;
      if(error){setPracuje(false);alert("Nepodařilo se uložit: "+error.message);return;}
    }
    if(ulozit){
      // Unikátní index je na lower(vzor), což PostgREST v upsertu zacílit neumí —
      // proto se existující pravidlo najde a přepíše se do něj.
      const {data:stare}=await sb.from("fin_pravidla").select("id").ilike("vzor",v).limit(1);
      const sPravidlem={...patch,smer:smer||null};
      if(stare&&stare.length)await sb.from("fin_pravidla").update(sPravidlem).eq("id",stare[0].id);
      else await sb.from("fin_pravidla").insert({vzor:v,priorita:30,...sPravidlem});
    }
    setPracuje(false);
    onHotovo(nalezene?nalezene.length:0,v);
  };

  const kratky=vzor.trim().length<3;
  return <Modal title="Nastavit i u ostatních plateb" onClose={onClose} width={600}>
    <div style={{fontSize:12,color:C.muted,marginBottom:12}}>
      Všem {smer==="prijem"?"příchozím":smer==="vydaj"?"odchozím":""} platbám, jejichž popis obsahuje
      tenhle text, se nastaví: <strong style={{color:C.text}}>{popisPatche}</strong>
    </div>
    <div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:4}}>Text, podle kterého se platby poznají</div>
    <input style={{...inp,borderColor:jeObecny(vzor)?"#e59a9a":undefined}} autoFocus value={vzor} onChange={e=>setVzor(e.target.value)}/>
    {jeObecny(vzor)&&<div style={{fontSize:11.5,color:"#b03030",marginTop:6,fontWeight:700}}>
      „{vzor.trim()}" je obecný bankovní pojem, ne jméno obchodníka — takové pravidlo sedne
      na každou takovou platbu. Vyber si radši něco z nabídky pod polem.
    </div>}
    {(kandidati||[]).length>1&&<div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:7}}>
      {kandidati.map((k,i)=><button key={i} onClick={()=>setVzor(k)}
        style={{...btnC(C.muted,true),fontSize:11,padding:"3px 9px"}}>{k}</button>)}
    </div>}
    <div style={{fontSize:11,color:C.dim,marginTop:7}}>
      Čím kratší text, tím víc plateb chytí. Zkrať ho tak, aby v něm nezůstalo číslo měsíce
      ani variabilní symbol, který se každou platbu mění.
    </div>

    <div style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 12px",marginTop:14}}>
      {kratky&&<div style={{fontSize:12,color:C.dim}}>Napiš aspoň tři znaky.</div>}
      {!kratky&&hleda&&<div style={{fontSize:12,color:C.dim}}>Hledám…</div>}
      {!kratky&&!hleda&&nalezene&&<>
        <div style={{fontSize:13,fontWeight:800,marginBottom:8,color:nalezene.length?C.text:C.dim}}>
          {nalezene.length?`Odpovídá ${nalezene.length} plateb`:"Neodpovídá žádná platba"}
        </div>
        <div style={{maxHeight:200,overflowY:"auto"}}>
          {nalezene.slice(0,25).map(t=><div key={t.id} style={{display:"flex",justifyContent:"space-between",gap:10,fontSize:11.5,padding:"3px 0",color:C.muted}}>
            <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
              {new Date(t.datum).toLocaleDateString("cs-CZ")} · {(t.popis||"").slice(0,70)}
            </span>
            <strong style={{whiteSpace:"nowrap",color:+t.castka<0?C.red:C.green}}>{kc0(t.castka)}</strong>
          </div>)}
          {nalezene.length>25&&<div style={{fontSize:11,color:C.dim,marginTop:4}}>…a dalších {nalezene.length-25}</div>}
        </div>
      </>}
    </div>

    <label style={{display:"flex",alignItems:"center",gap:7,marginTop:12,fontSize:12,cursor:"pointer"}}>
      <input type="checkbox" checked={ulozit} onChange={e=>setUlozit(e.target.checked)}/>
      Uložit jako pravidlo — příští importy přijdou zařazené samy
    </label>

    <div style={{display:"flex",gap:10,marginTop:16}}>
      <button onClick={pouzij} disabled={pracuje||kratky||jeObecny(vzor)||!nalezene?.length} style={btnC()}>
        {pracuje?"Ukládám…":jenPravidlo?"Uložit pravidlo":`Nastavit u ${nalezene?.length||0} plateb`}
      </button>
      <button onClick={onClose} style={btnC(C.muted,true)}>Zrušit</button>
    </div>
  </Modal>;
}

// Jeden řádek platby v rozpadu. Když je editovatelný, jde u něj rovnou přepnout
// kategorii nebo ho označit za převod — tedy říct „tohle není příjem ani výdaj".
function Radek({t,uctyMap,katMap,projMap,kategorie,projekty,deti,auta,uklada,uprav,novaKategorie,naOstatni,editovatelny}){
  const kat=katMap[t.kategorie_id], pr=projMap[String(t.projekt_id)];
  const su=subjektNazev(t.subjekt_typ,t.subjekt_id,deti,auta);
  const prevod=t.typ==="prevod";
  const prijem=+t.castka>0;
  return <div style={{display:"flex",justifyContent:"space-between",gap:10,fontSize:12,padding:"6px 0",borderTop:`1px solid ${C.bg}`,opacity:prevod?.55:1}}>
    <div style={{flex:1,minWidth:0}}>
      <div>{new Date(t.datum).toLocaleDateString("cs-CZ")} · <span style={{color:C.muted}}>{uctyMap[t.ucet_id]||"?"}</span>
        {t.prevod_ucet_id&&uctyMap[t.prevod_ucet_id]&&
          <span style={{color:C.accent,fontWeight:700}}> {+t.castka<0?"→":"←"} {uctyMap[t.prevod_ucet_id]}</span>}
      </div>
      <div style={{fontSize:11,color:C.dim}}>
        {t.vs?<span style={{color:C.accent,fontWeight:700}}>VS {t.vs} · </span>:null}
        {(t.popis||"").slice(0,110)}
      </div>
      <div style={{display:"flex",gap:5,flexWrap:"wrap",marginTop:3,alignItems:"center"}}>
        {editovatelny
          ? <VyberKategorie hodnota={t.kategorie_id} kategorie={kategorie} prijem={prijem} disabled={uklada}
              onVyber={id=>uprav(t,{kategorie_id:id||null})}
              onNova={novaKategorie?nazev=>novaKategorie(t,nazev):null}/>
          : kat&&<span style={stitek}>{kat.emoji||"🏷"} {kat.nazev}</span>}
        {editovatelny
          ? <SubjektSelect deti={deti} auta={auta}
              value={t.subjekt_typ?`${t.subjekt_typ}|${t.subjekt_id||""}`:""}
              onChange={v=>{const [tp,id]=String(v).split("|");uprav(t,{subjekt_typ:tp||null,subjekt_id:id||null});}}
              style={{...inp,width:"auto",maxWidth:170,fontSize:11,padding:"2px 6px"}}/>
          : su&&<span style={{...stitek,background:"#f0f7ee",color:"#3f7d33"}}>{su}</span>}
        {editovatelny&&(projekty||[]).length>0
          ? <select disabled={uklada} value={t.projekt_id||""} onChange={e=>uprav(t,{projekt_id:e.target.value?+e.target.value:null})}
              title="Ke které velké věci tahle platba patří — svatba, auta, hypotéka…"
              style={{...inp,width:"auto",maxWidth:190,fontSize:11,padding:"2px 6px"}}>
              <option value="">— bez projektu —</option>
              {(projekty||[]).map(x=><option key={x.id} value={x.id}>{x.emoji||"📁"} {x.nazev}</option>)}
            </select>
          : pr&&<span style={{...stitek,background:"#eef4fc",color:"#3066b0"}}>{pr.emoji||"📁"} {pr.nazev}</span>}
        {prevod&&<span style={{...stitek,background:"#fff3e0",color:"#9a5b00"}}>převod — nepočítá se</span>}
        {editovatelny&&<button disabled={uklada}
          onClick={()=>uprav(t,{typ:prevod?(prijem?"prijem":"vydaj"):"prevod"})}
          title={prevod?"Vrátit mezi příjmy a výdaje":"Tohle není příjem ani výdaj — jen přesun vlastních peněz"}
          style={{...btnC(prevod?C.accent:C.muted,true),fontSize:10.5,padding:"2px 8px"}}>
          {prevod?"vrátit do přehledu":"není příjem — převod"}
        </button>}
        {editovatelny&&naOstatni&&(t.kategorie_id||t.projekt_id||t.subjekt_typ)&&<button disabled={uklada}
          onClick={()=>naOstatni(t)}
          title="Stejné zařazení nastavit i u ostatních plateb se stejným textem — minulých i budoucích"
          style={{...btnC(C.accent,true),fontSize:10.5,padding:"2px 8px"}}>🔁 i na ostatní</button>}
        {uklada&&<span style={{fontSize:10.5,color:C.dim}}>ukládám…</span>}
      </div>
    </div>
    <div style={{fontWeight:700,whiteSpace:"nowrap",color:prevod?C.dim:(prijem?C.green:C.red)}}>{kc0(t.castka)}</div>
  </div>;
}

function PrehledFinanci({ucty,kategorie,projekty,deti,auta,reloadKategorie}){
  const {data:trans,loading,reload:reloadTrans}=useData(()=>nactiVse((od,do_)=>sb.from("fin_transakce")
    .select("id,datum,castka,typ,popis,poznamka,protistrana,vs,kategorie_id,projekt_id,subjekt_typ,subjekt_id,ucet_id,prevod_ucet_id")
    .eq("zdroj","import").order("datum").range(od,do_)));
  const [rozpad,setRozpad]=useState(null);   // {titulek, polozky}
  const [obdobi,setObdobi]=useState(null);   // null = výchozí (poslední dokončený měsíc)
  const [ucetFiltr,setUcetFiltr]=useState("");  // "" = všechny účty dohromady
  const {data:stavy,loading:ls}=useData(()=>nactiVse((od,do_)=>sb.from("fin_stavy").select("*").gte("rok",2025).order("rok").range(od,do_)));
  const {data:nastaveni,reload:reloadNast}=useData(()=>sb.from("app_nastaveni").select("*").eq("klic","fin_hotovostni_prijem"));
  const [hotEdit,setHotEdit]=useState(null);

  if(loading||ls)return <Spinner/>;

  const hotovostniPrijem=+((nastaveni||[])[0]?.hodnota||0);
  const ulozHotovost=async v=>{
    const existuje=(nastaveni||[]).length>0;
    if(existuje)await sb.from("app_nastaveni").update({hodnota:String(v)}).eq("klic","fin_hotovostni_prijem");
    else await sb.from("app_nastaveni").insert({klic:"fin_hotovostni_prijem",hodnota:String(v)});
    setHotEdit(null);reloadNast();
  };

  const uctyMap=Object.fromEntries((ucty||[]).map(u=>[u.id,u]));
  // Podnikatelské účty se do rozpočtu počítají stejně jako rodinné — Jirka
  // s těmi penězi počítá hned, jak dorazí, a platí z nich běžné rodinné věci
  // (splátky aut, servis, telefony, právník). Skupina `podnikani` slouží jen
  // k tomu, aby šlo ukázat, kolik z příjmů odtamtud pochází.
  const bezne =new Set((ucty||[]).filter(u=>["finance","podnikani"].includes(u.skupina||"finance")).map(u=>u.id));
  const podnik=new Set((ucty||[]).filter(u=>u.skupina==="podnikani").map(u=>u.id));
  const sledovane=new Set([...bezne,...podnik]);
  const pohyby=(trans||[]).filter(t=>t.typ!=="prevod"&&!t.prevod_ucet_id&&sledovane.has(t.ucet_id));

  // Jen dokončené měsíce — rozdělaný měsíc by průměr stáhl dolů.
  const ted=new Date(), tentoMesic=`${ted.getFullYear()}-${String(ted.getMonth()+1).padStart(2,"0")}`;
  // Poslední den v měsíci už je měsíc hotový — nemá cenu ho zahazovat.
  const posledniDen=new Date(ted.getFullYear(),ted.getMonth()+1,0).getDate()===ted.getDate();

  // Do průměru smí jen měsíc, za který je nahraný výpis ze VŠECH sledovaných
  // účtů. Jinak stačí samotný výpis z kreditky za listopad a průměr se dělí
  // měsícem, ve kterém o příjmech nevíme vůbec nic — a všechna čísla klesnou.
  const vsePohyby=(trans||[]).filter(t=>sledovane.has(t.ucet_id));
  const mesiceUctu=new Map();                 // ucet_id → měsíce, kde má pohyb
  for(const t of vsePohyby){
    if(!mesiceUctu.has(t.ucet_id))mesiceUctu.set(t.ucet_id,new Set());
    mesiceUctu.get(t.ucet_id).add(String(t.datum).slice(0,7));
  }
  // Účet měsíc pokrývá, když v něm má pohyb — nebo když má pohyby před ním
  // i po něm. To znamená, že výpisy kolem nahrané jsou a měsíc byl prostě prázdný.
  const pokryva=(uid,m)=>{
    const s=mesiceUctu.get(uid); if(!s)return false;
    if(s.has(m))return true;
    const ms=[...s];
    return ms.some(x=>x<m)&&ms.some(x=>x>m);
  };
  const sUdaji=[...sledovane].filter(uid=>mesiceUctu.has(uid));
  const vsechnyMesice=[...new Set(vsePohyby.map(t=>String(t.datum).slice(0,7)))].sort();
  const mesice=vsechnyMesice.filter(m=>posledniDen?m<=tentoMesic:m<tentoMesic);
  const hotoveMesice=mesice.filter(m=>sUdaji.every(uid=>pokryva(uid,m)));
  const neuplneMesice=mesice.filter(m=>!hotoveMesice.includes(m));

  // ── Za jaké období se počítá ────────────────────────────────────────────
  // Výchozí je poslední dokončený měsíc — průměr je hezký na orientaci, ale
  // když se čísla třídí měsíc po měsíci, potřebuje člověk vidět ten měsíc.
  const ob=obdobi||{rezim:"mesic",mesic:hotoveMesice[hotoveMesice.length-1]||vsechnyMesice[vsechnyMesice.length-1]};
  const nazevMesice=m=>{const [r,ms]=String(m||"").split("-");return `${MESICE[+ms-1]||m} ${r}`;};
  const pocetMesicuMezi=(od,do_)=>{
    const a=new Date(od), b=new Date(do_);
    return Math.max(1,(b.getFullYear()-a.getFullYear())*12+(b.getMonth()-a.getMonth())+1);
  };
  let vybrane, vybraneVse, delitel, nMesicu, popisObdobi, prumer=false;
  // vsePohyby drží i převody — potřebné, jakmile se kouká na jeden účet.
  if(ob.rezim==="prumer"){
    prumer=true;
    const vObdobi=m=>hotoveMesice.includes(m);
    vybrane   =pohyby.filter(t=>vObdobi(String(t.datum).slice(0,7)));
    vybraneVse=(trans||[]).filter(t=>vObdobi(String(t.datum).slice(0,7)));
    nMesicu=delitel=hotoveMesice.length||1;
    popisObdobi=hotoveMesice.length
      ? `Průměr z ${nMesicu} dokončených měsíců (${nazevMesice(hotoveMesice[0])} – ${nazevMesice(hotoveMesice[hotoveMesice.length-1])}). Rozdělaný měsíc se nepočítá, aby průměr nelhal.`
      : "Zatím není dokončený žádný měsíc.";
  }else if(ob.rezim==="rozsah"){
    const vObdobi=t=>String(t.datum)>=ob.od&&String(t.datum)<=ob.do;
    vybrane   =pohyby.filter(vObdobi);
    vybraneVse=(trans||[]).filter(vObdobi);
    nMesicu=pocetMesicuMezi(ob.od,ob.do); delitel=1;
    popisObdobi=`Součet za ${new Date(ob.od).toLocaleDateString("cs-CZ")} – ${new Date(ob.do).toLocaleDateString("cs-CZ")} (${nMesicu} ${nMesicu===1?"měsíc":nMesicu<5?"měsíce":"měsíců"}).`;
  }else{
    const vObdobi=t=>String(t.datum).slice(0,7)===ob.mesic;
    vybrane   =pohyby.filter(vObdobi);
    vybraneVse=(trans||[]).filter(vObdobi);
    nMesicu=delitel=1;
    popisObdobi=`${nazevMesice(ob.mesic)}${hotoveMesice.includes(ob.mesic)?"":" — pozor, za tenhle měsíc nemáš výpisy ze všech účtů"}.`;
  }
  const n=delitel;                       // dělitel pro průměry ve sloupcích níž
  const vHotovych=ucetFiltr
    ? vybraneVse.filter(t=>String(t.ucet_id)===String(ucetFiltr))
    : vybrane;
  const naMesic=x=>x*delitel/nMesicu;    // převod na měsíční tempo (kvůli dojezdu)
  const zaObdobi=prumer?" měsíčně":"";

  // U jednoho účtu je převod skutečný pohyb — Airbanka o ty peníze přijde,
  // KB je dostane. V součtu za všechny účty se ale musí vyhodit, jinak by
  // narostl příjem i výdaj o částku, která nikdy nepřišla ani neodešla.
  const jedenUcet=ucetFiltr?uctyMap[ucetFiltr]:null;
  const prevody =jedenUcet?vHotovych.filter(t=>t.typ==="prevod"||t.prevod_ucet_id):[];
  const prevodyNetto=prevody.reduce((a,t)=>a+(+t.castka||0),0);
  const prevodySem  =prevody.reduce((a,t)=>a+(+t.castka>0?+t.castka:0),0);
  const prevodyPryc =prevody.reduce((a,t)=>a+(+t.castka<0?-+t.castka:0),0);

  // Do příjmů a výdajů jdou jen skutečné toky ven a dovnitř — nikdy převody.
  const bezPrevodu=vHotovych.filter(t=>!(t.typ==="prevod"||t.prevod_ucet_id));
  const firemni =bezPrevodu.filter(t=>podnik.has(t.ucet_id));
  const soucet=(xs,f)=>xs.reduce((a,t)=>a+(f(t)?Math.abs(+t.castka):0),0);
  const prijmy  =soucet(bezPrevodu,t=>+t.castka>0);
  const zavazky =soucet(bezPrevodu,t=>+t.castka<0&&t.projekt_id);
  const zbytek  =soucet(bezPrevodu,t=>+t.castka<0&&!t.projekt_id);
  const bizIn   =soucet(firemni,  t=>+t.castka>0);     // jen pro informaci
  // Hotovostní příjem je zadaný jako měsíční, takže se natáhne na délku období.
  const hotovostZaObdobi=hotovostniPrijem*nMesicu/delitel;
  const mPrijmy=prijmy/n, mZavazky=zavazky/n, mZbytek=zbytek/n;
  const kDispozici=mPrijmy+hotovostZaObdobi-mZavazky;
  const rozdil=kDispozici-mZbytek;

  // Likvidita: poslední známý stav běžných účtů a hotovosti. Dětské spoření,
  // investice a Fortuna se do toho nepočítají — na ty se nesahá.
  const posledniStav=u=>{
    const s=(stavy||[]).filter(x=>x.ucet_id===u.id).sort((a,b)=>b.rok-a.rok||b.mesic-a.mesic)[0];
    return s?+s.stav:0;
  };
  // Kontrola u jednoho účtu: počáteční zůstatek plus všechno, co se za měsíc
  // stalo, se musí rovnat konečnému zůstatku z výpisu. Když ne, něco chybí.
  const stavUctu=(uid,rok,mesic)=>{
    const x=(stavy||[]).find(y=>String(y.ucet_id)===String(uid)&&y.rok===rok&&y.mesic===mesic);
    return x?+x.stav:null;
  };
  const kontrola=(()=>{
    if(!jedenUcet||ob.rezim!=="mesic")return null;
    const [r,m]=ob.mesic.split("-").map(Number);
    const pred=m===1?[r-1,12]:[r,m-1];
    const s0=stavUctu(ucetFiltr,pred[0],pred[1]), s1=stavUctu(ucetFiltr,r,m);
    if(s0==null||s1==null)return {chybi:true,s0,s1};
    const spocteno=s0+prijmy-zavazky-zbytek+prevodyNetto;
    return {s0,s1,spocteno,rozdil:spocteno-s1,sedi:Math.abs(spocteno-s1)<1.5};
  })();

  // Průměr ze všech dokončených měsíců — slouží jako měřítko, proti kterému se
  // vybraný měsíc porovnává. Počítá se pro stejný výřez dat (celek nebo účet).
  const prumerZaklad=(()=>{
    if(prumer||hotoveMesice.length<2)return null;
    const zdroj=ucetFiltr
      ? (trans||[]).filter(t=>String(t.ucet_id)===String(ucetFiltr))
      : pohyby;
    const v=zdroj.filter(t=>hotoveMesice.includes(String(t.datum).slice(0,7)));
    const bp=v.filter(t=>!(t.typ==="prevod"||t.prevod_ucet_id));
    const nn=hotoveMesice.length;
    const mer=nMesicu/delitel;          // u rozsahu se průměr natáhne na počet měsíců
    const S=(xs,f)=>xs.reduce((a,t)=>a+(f(t)?Math.abs(+t.castka):0),0)/nn*mer;
    const prij=S(bp,t=>+t.castka>0);
    const zav =S(bp,t=>+t.castka<0&&t.projekt_id);
    const zbyt=S(bp,t=>+t.castka<0&&!t.projekt_id);
    const prev=v.filter(t=>t.typ==="prevod"||t.prevod_ucet_id)
                .reduce((a,t)=>a+(+t.castka||0),0)/nn*mer;
    return {prijmy:prij,zavazky:zav,zbytek:zbyt,prevody:prev,
            hotovost:hotovostniPrijem*nMesicu/delitel,
            zbyvaNaZivot:prij+hotovostniPrijem*nMesicu/delitel-zav,
            zmena:prij-zav-zbyt+prev, odeslo:zav+zbyt, pocet:nn};
  })();

  const likvidni=(ucty||[]).filter(u=>["finance","hotovost","podnikani"].includes(u.skupina||"finance"));
  const likvidita=likvidni.reduce((a,u)=>a+posledniStav(u),0);
  // Dojezd má smysl počítat, jen když je schodek dost velký na to, aby nebyl
  // v šumu. Při schodku pár set korun vychází stovky měsíců a to nic neznamená.
  const schodekVyrazny=Math.abs(rozdil)>(mPrijmy+hotovostZaObdobi)*0.05;
  const dojezd=(rozdil<0&&schodekVyrazny)?likvidita/Math.abs(naMesic(rozdil)):null;

  // Kontrola úplnosti: chybí uvnitř období nějaký měsíc? A jak velká část
  // výdajů nemá kategorii? Bez toho jsou čísla níž hezká, ale nepravdivá.
  const chybejiciMesice=(()=>{
    if(hotoveMesice.length<2)return [];
    const out=[], [r1,m1]=hotoveMesice[0].split("-").map(Number);
    const posl=hotoveMesice[hotoveMesice.length-1];
    for(let d=new Date(r1,m1-1,1);;d.setMonth(d.getMonth()+1)){
      const k=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
      if(k>posl)break;
      if(!hotoveMesice.includes(k))out.push(k);
    }
    return out;
  })();
  const bezKategorie=soucet(bezPrevodu,t=>+t.castka<0&&!t.projekt_id&&!t.kategorie_id);
  const podilNezarazenych=zbytek?bezKategorie/zbytek:0;

  // Kam to teče — průměr na měsíc podle kategorie a podle toho, koho se to týká.
  const podle=(klic,nazev)=>{
    const m=new Map();
    for(const t of bezPrevodu){
      if(+t.castka>=0||t.projekt_id)continue;
      const k=klic(t);
      if(!m.has(k))m.set(k,{suma:0,polozky:[]});
      const z=m.get(k); z.suma+=(-+t.castka); z.polozky.push(t);
    }
    return [...m.entries()].map(([k,z])=>({k,nazev:nazev(k),mesicne:z.suma/n,polozky:z.polozky})).sort((a,b)=>b.mesicne-a.mesicne);
  };
  const katMap=Object.fromEntries((kategorie||[]).map(k=>[k.id,k]));
  const dleKategorii=podle(t=>t.kategorie_id||"",k=>k&&katMap[k]?`${katMap[k].emoji||"🏷"} ${katMap[k].nazev}`:"❓ Nezařazeno");
  const dleSubjektu =podle(t=>`${t.subjekt_typ||""}|${t.subjekt_id||""}`,k=>{
    const [tp,id]=k.split("|");
    return subjektNazev(tp,id,deti,auta)||"❓ Neurčeno";
  });
  const projMap=Object.fromEntries((projekty||[]).map(p=>[String(p.id),p]));
  const dleProjektu=(()=>{
    const m=new Map();
    for(const t of bezPrevodu){
      if(+t.castka>=0||!t.projekt_id)continue;
      const k=String(t.projekt_id);
      if(!m.has(k))m.set(k,{suma:0,polozky:[]});
      const z=m.get(k); z.suma+=(-+t.castka); z.polozky.push(t);
    }
    return [...m.entries()].map(([k,z])=>({k,nazev:projMap[k]?`${projMap[k].emoji||"📁"} ${projMap[k].nazev}`:"Projekt",mesicne:z.suma/n,polozky:z.polozky})).sort((a,b)=>b.mesicne-a.mesicne);
  })();

  // Srovnání s průměrem: absolutní rozdíl i procenta. U malých základů procenta
  // nic neříkají (z 200 na 400 je +100 %), proto se pod tisícovkou neukazují.
  const karta=(l,v,barva,pozn,polozky,prumerV)=>{
    const rozd=prumerV!=null?v-prumerV:null;
    const pct=(rozd!=null&&Math.abs(prumerV)>1000)?rozd/Math.abs(prumerV)*100:null;
    return <div
      onClick={polozky?()=>setRozpad({titulek:`${l} · rozpad`,polozky}):undefined}
      style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"14px 16px",flex:1,minWidth:190,cursor:polozky?"pointer":"default"}}>
      <div style={{fontSize:11,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:.3}}>{l}</div>
      <div style={{fontSize:23,fontWeight:800,color:barva||C.text,marginTop:5}}>{kc0(v)}</div>
      {pozn&&<div style={{fontSize:11,color:C.dim,marginTop:3}}>{pozn}</div>}
      {rozd!=null&&<div style={{fontSize:11,color:C.muted,marginTop:5}}>
        průměr {kc0(prumerV)} · <strong style={{color:Math.abs(rozd)<Math.abs(prumerV)*.05?C.dim:C.text}}>
          {rozd>=0?"▲":"▼"} {kc0(Math.abs(rozd))}{pct!=null?` (${Math.abs(pct).toFixed(0)} %)`:""}
        </strong>
      </div>}
      {polozky&&<div style={{fontSize:10,color:C.accent,marginTop:5}}>▸ ukázat {polozky.length} pohybů</div>}
    </div>;
  };

  const sloupec=(titulek,radky,barva)=><div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"14px 16px",flex:1,minWidth:260}}>
    <div style={{fontSize:12,fontWeight:800,marginBottom:10}}>{titulek}</div>
    {radky.length===0&&<div style={{fontSize:12,color:C.dim}}>Zatím nic</div>}
    {radky.slice(0,12).map(r=>{
      const max=radky[0].mesicne||1;
      return <div key={r.k} onClick={()=>r.polozky&&setRozpad({titulek:`${r.nazev} · rozpad`,polozky:r.polozky})}
        style={{marginBottom:7,cursor:r.polozky?"pointer":"default"}}>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:2}}>
          <span style={{color:C.text}}>{r.nazev}</span>
          <strong style={{color:barva||C.text}}>{kc0(r.mesicne)}</strong>
        </div>
        <div style={{height:5,background:C.border,borderRadius:4,overflow:"hidden"}}>
          <div style={{width:`${r.mesicne/max*100}%`,height:"100%",background:barva||C.accent}}/>
        </div>
      </div>;
    })}
  </div>;

  if(hotoveMesice.length===0)return <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:24,textAlign:"center",color:C.dim}}>
    Ještě není dokončený žádný měsíc s naimportovanými výpisy. Nahraj je v záložce Import.
  </div>;

  const dnesStr=new Date().toISOString().slice(0,10);
  const prvniDen=m=>`${m}-01`;
  const posledniDenM=m=>{const [r,ms]=m.split("-").map(Number);return `${m}-${String(new Date(r,ms,0).getDate()).padStart(2,"0")}`;};

  return <div>
    <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",marginBottom:10}}>
      <span style={{fontSize:12,fontWeight:700,color:C.muted}}>Období:</span>
      <select style={{...inp,width:"auto",fontSize:12,padding:"5px 10px"}}
        value={ob.rezim==="mesic"?ob.mesic:ob.rezim}
        onChange={e=>{
          const v=e.target.value;
          if(v==="prumer")setObdobi({rezim:"prumer"});
          else if(v==="rozsah")setObdobi({rezim:"rozsah",
            od:prvniDen(vsechnyMesice[0]||dnesStr.slice(0,7)),
            do:posledniDenM(vsechnyMesice[vsechnyMesice.length-1]||dnesStr.slice(0,7))});
          else setObdobi({rezim:"mesic",mesic:v});
        }}>
        <optgroup label="Měsíc">
          {vsechnyMesice.slice().reverse().map(m=>
            <option key={m} value={m}>{nazevMesice(m)}{hotoveMesice.includes(m)?"":" ⚠"}</option>)}
        </optgroup>
        <optgroup label="Souhrn">
          <option value="prumer">Průměr ze všech dokončených měsíců</option>
          <option value="rozsah">Vlastní období od–do…</option>
        </optgroup>
      </select>
      {ob.rezim==="rozsah"&&<>
        <input type="date" value={ob.od} max={ob.do} onChange={e=>setObdobi({...ob,od:e.target.value})}
          style={{...inp,width:"auto",fontSize:12,padding:"5px 8px"}}/>
        <span style={{fontSize:12,color:C.muted}}>–</span>
        <input type="date" value={ob.do} min={ob.od} onChange={e=>setObdobi({...ob,do:e.target.value})}
          style={{...inp,width:"auto",fontSize:12,padding:"5px 8px"}}/>
      </>}
      <span style={{fontSize:12,fontWeight:700,color:C.muted,marginLeft:6}}>Účet:</span>
      <select style={{...inp,width:"auto",fontSize:12,padding:"5px 10px"}}
        value={ucetFiltr} onChange={e=>setUcetFiltr(e.target.value)}>
        <option value="">Všechny účty dohromady</option>
        {(ucty||[]).filter(u=>mesiceUctu.has(u.id)).map(u=>
          <option key={u.id} value={u.id}>{u.nazev}</option>)}
      </select>
      {ob.rezim!=="prumer"&&hotoveMesice.length>1&&
        <button onClick={()=>setObdobi({rezim:"prumer"})} style={{...btnC(C.muted,true),fontSize:11,padding:"4px 10px"}}>
          přepnout na průměr
        </button>}
    </div>
    <div style={{fontSize:12,color:C.muted,marginBottom:12}}>
      {jedenUcet?<><strong style={{color:C.text}}>{jedenUcet.nazev}</strong> · </>:null}
      {popisObdobi}
      {jedenUcet?" U jednoho účtu se přesuny mezi tvými účty počítají — na zůstatek mají vliv.":null}
    </div>

    {(chybejiciMesice.length>0||neuplneMesice.length>0||podilNezarazenych>0.3||!hotovostniPrijem)&&
      <div style={{background:"#fff8e1",border:"1px solid #f5a623",borderRadius:12,padding:"12px 16px",marginBottom:14,fontSize:12,color:"#9a5b00"}}>
        <div style={{fontWeight:800,marginBottom:6}}>Než těmhle číslům uvěříš</div>
        {chybejiciMesice.length>0&&<div style={{marginBottom:4}}>
          • Uvnitř období chybí {chybejiciMesice.join(", ")} — z těch měsíců nemáš nahraný výpis.
          Průměr je tím pádem počítaný z menšího vzorku, než si myslíš. Zkontroluj záložku Pokrytí.
        </div>}
        {podilNezarazenych>0.3&&<div style={{marginBottom:4}}>
          • <strong>{Math.round(podilNezarazenych*100)} %</strong> výdajů nemá kategorii ({kc0(bezKategorie/n)}{zaObdobi||" za období"}).
          Sloupec „kam jde zbytek" tím pádem neodpovídá na nic — projdi Zařazení.
        </div>}
        {neuplneMesice.length>0&&<div style={{marginBottom:4}}>
          • {neuplneMesice.join(", ")} se do průměru nepočítá — za ten měsíc nemáš výpis
          ze všech účtů, takže by se dělilo měsícem, o kterém skoro nic nevíme.
        </div>}
        {!hotovostniPrijem&&<div>
          • Hotovostní příjem je nastavený na nulu. Pokud část peněz dostáváš mimo účty,
          nastav ho níž, jinak ti přehled ukazuje horší situaci, než jaká je.
        </div>}
      </div>}

    {jedenUcet&&<div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:12}}>
      {karta("Přišlo"+zaObdobi,mPrijmy,C.green,"od cizích, bez přesunů mezi tvými účty",
        bezPrevodu.filter(t=>+t.castka>0),prumerZaklad?.prijmy)}
      {karta("Odešlo"+zaObdobi,mZavazky+mZbytek,C.red,"cizím, bez přesunů mezi tvými účty",
        bezPrevodu.filter(t=>+t.castka<0),prumerZaklad?.odeslo)}
      {karta("Přesuny mezi mými účty",prevodyNetto/n,prevodyNetto>=0?C.accent:C.orange,
        `${kc0(prevodySem/n)} sem · ${kc0(prevodyPryc/n)} pryč`,prevody.length?prevody:null,prumerZaklad?.prevody)}
      {karta("Změna zůstatku"+zaObdobi,(prijmy-zavazky-zbytek+prevodyNetto)/n,
        (prijmy-zavazky-zbytek+prevodyNetto)>=0?C.green:C.red,
        kontrola&&!kontrola.chybi?`${kc0(kontrola.s0)} → ${kc0(kontrola.s1)}`:"podle pohybů ve výpisu",
        null,prumerZaklad?.zmena)}
    </div>}

    {jedenUcet&&kontrola&&<div style={{background:kontrola.chybi?C.bg:(kontrola.sedi?"#f0f7ee":"#fdefef"),
      border:`1px solid ${kontrola.chybi?C.border:(kontrola.sedi?"#8fc07f":"#e59a9a")}`,
      borderRadius:12,padding:"12px 16px",marginBottom:16,fontSize:12.5}}>
      {kontrola.chybi
        ? <span style={{color:C.muted}}>Kontrolu proti zůstatku nejde spočítat — za tenhle nebo předchozí měsíc není u účtu zapsaný stav.</span>
        : <>
            <div style={{fontWeight:800,color:kontrola.sedi?"#3f7d33":"#b03030"}}>
              {kc0(kontrola.s0)} + {kc0(prijmy)} − {kc0(zavazky+zbytek)} {prevodyNetto>=0?"+":"−"} {kc0(Math.abs(prevodyNetto))} = <strong>{kc0(kontrola.spocteno)}</strong>
              {kontrola.sedi?" ✓ sedí se zůstatkem z výpisu":` ✗ výpis říká ${kc0(kontrola.s1)}`}
            </div>
            {!kontrola.sedi&&<div style={{fontSize:12,color:C.muted,marginTop:5}}>
              Rozdíl {kc0(kontrola.rozdil)}. Buď v tomhle měsíci chybí část výpisu, nebo je špatně zapsaný
              některý ze dvou zůstatků — u kreditní karty je to normální, ta jde od 14. do 14.
            </div>}
          </>}
    </div>}

    {!jedenUcet&&<div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:12}}>
      {karta("Příjmy"+zaObdobi,mPrijmy+hotovostZaObdobi,C.green,
        [hotovostZaObdobi?`${kc0(hotovostZaObdobi)} hotově mimo účty`:null,
         bizIn?`${kc0(bizIn/n)} z podnikání`:null].filter(Boolean).join(" · ")||"jen to, co přišlo na účty",
        bezPrevodu.filter(t=>+t.castka>0),prumerZaklad?(prumerZaklad.prijmy+prumerZaklad.hotovost):null)}
      {karta("Povinné závazky"+zaObdobi,mZavazky,C.orange,"hypotéka, SJM, insolvence, auta",
        bezPrevodu.filter(t=>+t.castka<0&&t.projekt_id),prumerZaklad?.zavazky)}
      {karta("Zbývá na život"+zaObdobi,kDispozici,kDispozici>0?C.text:C.red,"po zaplacení závazků",
        null,prumerZaklad?.zbyvaNaZivot)}
      {karta("Skutečně utrácíš"+zaObdobi,mZbytek,C.red,"všechno ostatní",
        bezPrevodu.filter(t=>+t.castka<0&&!t.projekt_id),prumerZaklad?.zbytek)}
    </div>}

    {!jedenUcet&&<div style={{background:rozdil>=0?"#f0f7ee":"#fdefef",border:`1px solid ${rozdil>=0?"#8fc07f":"#e59a9a"}`,borderRadius:12,padding:"16px 18px",marginBottom:16}}>
      <div style={{fontSize:13,fontWeight:800,color:rozdil>=0?"#3f7d33":"#b03030"}}>
        {!schodekVyrazny
          ? `Vycházíš zhruba na nulu — rozdíl ${kc0(rozdil)}${zaObdobi} je v šumu.`
          : rozdil>0
            ? `${prumer?"Měsíčně ti":"Za tohle období ti"} zbývá ${kc0(rozdil)}.`
            : `${prumer?"Měsíčně ti":"Za tohle období ti"} chybí ${kc0(Math.abs(rozdil))}.`}
      </div>
      <div style={{fontSize:12,color:C.muted,marginTop:6}}>
        Likvidní peníze (běžné účty + hotovost): <strong>{kc0(likvidita)}</strong>.
        {dojezd!=null&&<> Při současném tempu vydrží <strong style={{color:dojezd<6?C.red:C.orange}}>{dojezd.toFixed(1)} měsíce</strong>.</>}
        {!schodekVyrazny&&<> Dojezd nemá cenu počítat — při takhle malém rozdílu by stačila jedna větší platba a číslo se překlopí.</>}
        {" "}Dětské spoření, investice ani Fortuna se do toho nepočítají.
      </div>
      <div style={{fontSize:11,color:C.dim,marginTop:8}}>
        Hotovostní příjem mimo účty:{" "}
        {hotEdit===null
          ? <>{kc0(hotovostniPrijem)} měsíčně <button onClick={()=>setHotEdit(String(hotovostniPrijem))} style={{background:"none",border:"none",color:C.accent,cursor:"pointer",fontSize:11,textDecoration:"underline"}}>změnit</button></>
          : <><input style={{...inp,width:120,display:"inline-block",fontSize:11,padding:"3px 8px"}} type="number" autoFocus value={hotEdit} onChange={e=>setHotEdit(e.target.value)}/>
              {" "}<button onClick={()=>ulozHotovost(+hotEdit||0)} style={{...btnC(),fontSize:11,padding:"3px 10px"}}>Uložit</button>
              {" "}<button onClick={()=>setHotEdit(null)} style={{...btnC(C.muted,true),fontSize:11,padding:"3px 10px"}}>Zrušit</button></>}
      </div>
    </div>}

    <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
      {sloupec("📁 Závazky a projekty"+zaObdobi,dleProjektu,C.orange)}
      {sloupec("🏷 Kam jde zbytek"+zaObdobi,dleKategorii,C.red)}
      {sloupec("👥 Koho se to týká"+zaObdobi,dleSubjektu,C.accent)}
    </div>

    {rozpad&&<RozpadModal {...rozpad} pocetMesicu={prumer?n:null} ucty={ucty} kategorie={kategorie} projekty={projekty}
      deti={deti} auta={auta} reloadKategorie={reloadKategorie} onZmena={reloadTrans} onClose={()=>setRozpad(null)}/>}
  </div>;
}

function FinanceNoveTab(){
  const {data:ucty,loading:lu,reload:reloadUcty}=useData(()=>sb.from("fin_ucty").select("*").eq("aktivni",true).order("poradi"));
  const {data:kategorie,loading:lk,reload:reloadKategorie}=useData(()=>sb.from("fin_kategorie").select("*").order("poradi"));
  const {data:projekty,reload:reloadProjekty}=useData(()=>sb.from("fin_projekty").select("*").order("poradi"));
  const {data:deti}=useData(()=>sb.from("deti").select("id,jmeno,emoji,barva").order("jmeno"));
  const {data:auta}=useData(()=>sb.from("auta").select("id,nazev,spz").order("nazev"));
  const [zalozka,setZalozka]=useState("prehled");
  const {data:pocet,reload:reloadPocet}=useData(()=>sb.from("fin_transakce").select("id",{count:"exact",head:true}).eq("zdroj","import").then(({count,error})=>({data:count??0,error})));
  if(lu||lk)return <Spinner/>;
  // Podnikatelské účty se v přehledu počítají zvlášť, ale výpisy se do nich
  // nahrávají stejně jako do rodinných — v Pokrytí a Importu patří mezi ostatní.
  const bankovni=(ucty||[]).filter(u=>["finance","podnikani"].includes(u.skupina||"finance"));
  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,flexWrap:"wrap",gap:10}}>
      <h2 style={{margin:0,fontSize:22,fontWeight:800}}>💰 Finance</h2>
      <div style={{fontSize:12,color:C.muted}}>{bankovni.length} bankovních účtů · {pocet??0} naimportovaných transakcí</div>
    </div>
    <div style={{display:"flex",gap:2,marginBottom:20,borderBottom:`2px solid ${C.border}`,overflowX:"auto"}}>
      {[{id:"prehled",l:"🎯 Kolik můžu utratit"},{id:"projekty",l:"📁 Projekty"},{id:"import",l:"📥 Import z banky"},{id:"pokryti",l:"📅 Pokrytí"},{id:"zarazeni",l:"🏷 Zařazení"},{id:"kategorie",l:"🗂 Kategorie"},{id:"pravidla",l:"⚙️ Pravidla"},{id:"majetek",l:"💼 Majetek"}].map(t=>
        <button key={t.id} onClick={()=>setZalozka(t.id)} style={{padding:"9px 18px",border:"none",background:"none",cursor:"pointer",fontSize:13,fontWeight:700,color:zalozka===t.id?C.accent:C.muted,borderBottom:zalozka===t.id?`2px solid ${C.accent}`:"2px solid transparent",marginBottom:-2,whiteSpace:"nowrap"}}>{t.l}</button>)}
    </div>
    {zalozka==="prehled"&&<PrehledFinanci ucty={ucty} kategorie={kategorie} projekty={projekty} deti={deti} auta={auta} reloadKategorie={reloadKategorie}/>}
    {zalozka==="projekty"&&<FinProjektyTab/>}
    {zalozka==="import"&&<ImportVypisu ucty={ucty} kategorie={kategorie} projekty={projekty} deti={deti} auta={auta} reloadProjekty={reloadProjekty} onHotovo={()=>{reloadUcty();reloadPocet();}}/>}
    {zalozka==="pokryti"&&<PokrytiImportu ucty={ucty}/>}
    {zalozka==="pravidla"&&<PravidlaTab ucty={ucty} kategorie={kategorie} projekty={projekty} deti={deti} auta={auta}/>}
    {zalozka==="majetek"&&<MajetekTab ucty={ucty} reloadUcty={reloadUcty}/>}
    {zalozka==="kategorie"&&<KategorieTab kategorie={kategorie} reloadKategorie={reloadKategorie} onZmena={()=>{reloadPocet();}}/>}
    {zalozka==="zarazeni"&&<ZarazeniTransakci kategorie={kategorie} projekty={projekty} deti={deti} auta={auta} reloadKategorie={reloadKategorie} onZmena={()=>{reloadUcty();reloadPocet();reloadProjekty();}}/>}
  </div>;
}

function FinanceTab(){
  const [zalozka,setZalozka]=useState("dashboard");
  const {data:ucty,reload:reloadUcty}=useData(()=>sb.from("fin_ucty").select("*").eq("aktivni",true).order("poradi"));
  const {data:typy_db,reload:reloadTypy}=useData(()=>sb.from("fin_typy_uctu").select("*").order("poradi"));
  const {data:kategorie,reload:reloadKat}=useData(()=>sb.from("fin_kategorie").select("*").order("poradi"));
  const {data:transakce,reload:reloadTrans}=useData(()=>sb.from("fin_transakce").select("*").order("datum",{ascending:false}).limit(500));
  const {data:plan,reload:reloadPlan}=useData(()=>sb.from("fin_cashflow_plan").select("*").order("mesic").order("castka"));
  const {data:stavy1,reload:reloadStavy1}=useData(()=>sb.from("fin_stavy").select("*").lte("rok",2021).limit(2000));
  const {data:stavy2,reload:reloadStavy2}=useData(()=>sb.from("fin_stavy").select("*").gte("rok",2022).limit(2000));
  const stavy=[...(stavy1||[]),...(stavy2||[])];
  const reloadStavy=()=>{reloadStavy1();reloadStavy2();};

  // Globální filtr „svatých" dětských spořicích účtů (typ === 'deti'). Výchozí: VYPNUTO.
  const [zahrnoutDeti,setZahrnoutDeti]=useState(false);
  const detiSet=detskeUcetIds(ucty);
  // Účty viditelné v reálném přehledu — dětské svaté účty skryté, dokud nezaškrtnu.
  const uctyView=(ucty||[]).filter(u=>zahrnoutDeti||u.typ!=="deti");
  // Patří transakce (ucet/cíl) skrytému dětskému účtu?
  const transNaDeti=(t)=>jeDetskyUcet(t.ucet_id,detiSet)||(t.prevod_ucet_id&&jeDetskyUcet(t.prevod_ucet_id,detiSet));

  const typy=Object.fromEntries((typy_db||[]).map(t=>[t.klic,t.nazev]));
  const typBarvy=Object.fromEntries((typy_db||[]).map(t=>[t.klic,t.barva]));
  // Fallback pokud se typy ještě nenačetly
  const typyFallback=Object.keys(typy).length>0?typy:{bezny:"Běžný",sporici:"Spořící",podnikatelsky:"Podnikatelský",investicni:"Investiční",hotovost:"Hotovost",cizi_mena:"Cizí měna",deti:"Děti"};
  const typBarvyFallback=Object.keys(typBarvy).length>0?typBarvy:{bezny:C.accent,sporici:C.green,podnikatelsky:"#e8922a",investicni:"#9b7ef5",hotovost:"#2ed8c8",cizi_mena:"#e05555",deti:"#f5c07a"};

  const celkovyStav=uctyView.filter(u=>u.typ!=="cizi_mena").reduce((a,u)=>{
    const stavUctu=(stavy||[]).filter(s=>s.ucet_id===u.id).sort((a,b)=>b.rok-a.rok||b.mesic-a.mesic)[0];
    return a+(stavUctu?+(stavUctu.stav):0);
  },0);

  const tabs=[
    {id:"dashboard",l:"📊 Dashboard"},
    {id:"ucty",l:"🏦 Účty"},
    {id:"transakce",l:"💸 Transakce"},
    {id:"kategorie",l:"🏷 Kategorie"},
    {id:"typy",l:"🗂 Typy účtů"},
  ];

  // ── DASHBOARD ──
  const DashboardView=()=>{
    const dnes=new Date();
    const [filtrTypy,setFiltrTypy]=useState([]);
    const [filtrUcetIds,setFiltrUcetIds]=useState([]);
    const [odRok,setOdRok]=useState(2023);
    const [odMesic,setOdMesic]=useState(1);
    const [doRok,setDoRok]=useState(dnes.getFullYear());
    const [doMesic,setDoMesic]=useState(dnes.getMonth()+1);
    const [stavModal,setStavModal]=useState(null);
    const [stavForm,setStavForm]=useState({rok:dnes.getFullYear(),mesic:dnes.getMonth()+2>12?1:dnes.getMonth()+2,stav:""});

    const toggleTyp=(k)=>setFiltrTypy(prev=>prev.includes(k)?prev.filter(x=>x!==k):[...prev,k]);
    const toggleUcet=(id)=>setFiltrUcetIds(prev=>prev.includes(id)?prev.filter(x=>x!==id):[...prev,id]);

    const mesiceNazvy=["Leden","Únor","Březen","Duben","Květen","Červen","Červenec","Srpen","Září","Říjen","Listopad","Prosinec"];
    const mesiceKratke=["Led","Úno","Bře","Dub","Kvě","Čvn","Čvc","Srp","Zář","Říj","Lis","Pro"];

    const filtrUcty2=uctyView.filter(u=>
      (filtrTypy.length===0||filtrTypy.includes(u.typ))&&
      (filtrUcetIds.length===0||filtrUcetIds.includes(u.id))&&
      u.typ!=="cizi_mena"
    );

    // ── Reálné útraty tohoto měsíce (vyřazen typ "prevod") + počitadlo převodů ──
    const aktMesicKey=`${dnes.getFullYear()}-${String(dnes.getMonth()+1).padStart(2,"0")}`;
    const transMesic=(transakce||[]).filter(t=>
      t.datum?.startsWith(aktMesicKey) && (zahrnoutDeti||!transNaDeti(t))
    );
    const realPrijem=transMesic.filter(t=>klasifikujTransakci(t)==="prijem").reduce((a,t)=>a+(+t.castka),0);
    const realVydaj =transMesic.filter(t=>klasifikujTransakci(t)==="vydaj").reduce((a,t)=>a+Math.abs(+t.castka),0);
    const prevody   =transMesic.filter(t=>klasifikujTransakci(t)==="prevod");
    const prevodSuma=prevody.reduce((a,t)=>a+Math.abs(+t.castka),0);

    const sumaMesic=(rok,mesic)=>filtrUcty2.reduce((a,u)=>{
      const s=(stavy||[]).find(s=>s.ucet_id===u.id&&s.rok===rok&&s.mesic===mesic);
      return a+(s?+(s.stav):0);
    },0);
    const maDataMesic=(rok,mesic)=>filtrUcty2.some(u=>(stavy||[]).find(s=>s.ucet_id===u.id&&s.rok===rok&&s.mesic===mesic));

    // Vygeneruj seznam měsíců od-do — chybějící měsíce přeskočí (neukazuje interpolaci)
    const grafData=[];
    let r=odRok,m=odMesic;
    while(r<doRok||(r===doRok&&m<=doMesic)){
      if(maDataMesic(r,m)){
        const suma=sumaMesic(r,m);
        grafData.push({label:`${mesiceKratke[m-1]} ${String(r).slice(2)}`,rok:r,mesic:m,suma});
      }
      m++;if(m>12){m=1;r++;}
    }

    // KPI
    const aktStav=grafData.length>0?grafData[grafData.length-1].suma:0;
    const prvniStav=grafData.length>0?grafData[0].suma:0;
    const zmena=aktStav-prvniStav;
    const zmenaPct=prvniStav!==0?((zmena/Math.abs(prvniStav))*100):0;

    const ulozStav=async()=>{
      const uid=stavModal.id;
      await sb.from("fin_stavy").upsert({ucet_id:uid,rok:+stavForm.rok,mesic:+stavForm.mesic,stav:+stavForm.stav},{onConflict:"ucet_id,rok,mesic"});
      reloadStavy();setStavModal(null);
    };

    return <div>
      {/* Filtry */}
      <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,padding:"16px 20px",marginBottom:20}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:14}}>
          <div>
            <div style={{fontSize:11,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:.6,marginBottom:6}}>Od</div>
            <div style={{display:"flex",gap:6}}>
              <select style={{...inp,flex:1}} value={odMesic} onChange={e=>setOdMesic(+e.target.value)}>
                {mesiceNazvy.map((m,i)=><option key={i+1} value={i+1}>{m}</option>)}
              </select>
              <select style={{...inp,width:80}} value={odRok} onChange={e=>setOdRok(+e.target.value)}>
                {[2018,2019,2020,2021,2022,2023,2024,2025,2026].map(r=><option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>
          <div>
            <div style={{fontSize:11,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:.6,marginBottom:6}}>Do</div>
            <div style={{display:"flex",gap:6}}>
              <select style={{...inp,flex:1}} value={doMesic} onChange={e=>setDoMesic(+e.target.value)}>
                {mesiceNazvy.map((m,i)=><option key={i+1} value={i+1}>{m}</option>)}
              </select>
              <select style={{...inp,width:80}} value={doRok} onChange={e=>setDoRok(+e.target.value)}>
                {[2018,2019,2020,2021,2022,2023,2024,2025,2026].map(r=><option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>
        </div>
        <div style={{marginBottom:12}}>
          <div style={{fontSize:11,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:.6,marginBottom:6}}>Typ účtu</div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            <button onClick={()=>setFiltrTypy([])} style={{...btnC(filtrTypy.length===0?C.accent:C.muted,filtrTypy.length>0),padding:"4px 12px",fontSize:12}}>Vše</button>
            {Object.entries(typy).filter(([k])=>k!=="cizi_mena"&&(zahrnoutDeti||k!=="deti")).map(([k,v])=><button key={k} onClick={()=>toggleTyp(k)} style={{...btnC(filtrTypy.includes(k)?typBarvy[k]||C.accent:C.muted,!filtrTypy.includes(k)),padding:"4px 12px",fontSize:12}}>{v}</button>)}
          </div>
        </div>
        <div>
          <div style={{fontSize:11,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:.6,marginBottom:6}}>Konkrétní účty (nezvoleno = vše)</div>
          <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
            {uctyView.filter(u=>filtrTypy.length===0||filtrTypy.includes(u.typ)).map(u=><button key={u.id} onClick={()=>toggleUcet(u.id)} style={{...btnC(filtrUcetIds.includes(u.id)?typBarvy[u.typ]||C.accent:C.muted,!filtrUcetIds.includes(u.id)),padding:"3px 10px",fontSize:11}}>{u.nazev}</button>)}
          </div>
        </div>
      </div>

      {/* KPI */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(170px,1fr))",gap:12,marginBottom:20}}>
        {[
          {l:"Aktuální stav",v:`${aktStav.toLocaleString("cs")} Kč`,c:aktStav>=0?C.green:C.red},
          {l:"Změna období",v:`${zmena>=0?"+":""}${zmena.toLocaleString("cs")} Kč`,c:zmena>=0?C.green:C.red},
          {l:"Změna %",v:`${zmenaPct>=0?"+":""}${zmenaPct.toFixed(1)} %`,c:zmenaPct>=0?C.green:C.red},
          {l:"Počet měsíců",v:`${grafData.length}`,c:C.accent},
        ].map(k=><div key={k.l} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"14px 16px",borderTop:`3px solid ${k.c}`}}>
          <div style={{fontSize:10,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:.5,marginBottom:4}}>{k.l}</div>
          <div style={{fontSize:16,fontWeight:800,color:k.c}}>{k.v}</div>
        </div>)}
      </div>

      {/* Reálné útraty tohoto měsíce — bez interních převodů */}
      <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,padding:"16px 20px",marginBottom:20}}>
        <div style={{fontSize:13,fontWeight:700,marginBottom:14}}>💸 Reálný tok — {mesiceNazvy[dnes.getMonth()]} {dnes.getFullYear()} <span style={{fontWeight:400,color:C.dim,fontSize:12}}>(převody mezi účty vyřazeny z útrat)</span></div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(170px,1fr))",gap:12}}>
          {[
            {l:"Reálné příjmy",v:`+${realPrijem.toLocaleString("cs")} Kč`,c:C.green},
            {l:"Reálné výdaje",v:`-${realVydaj.toLocaleString("cs")} Kč`,c:C.red},
            {l:"Čistý tok",v:`${realPrijem-realVydaj>=0?"+":""}${(realPrijem-realVydaj).toLocaleString("cs")} Kč`,c:realPrijem-realVydaj>=0?C.green:C.red},
            {l:`Převody mezi účty (${prevody.length}×)`,v:`${prevodSuma.toLocaleString("cs")} Kč`,c:C.blue},
          ].map(k=><div key={k.l} style={{background:C.bg,borderRadius:10,padding:"12px 14px",borderTop:`3px solid ${k.c}`}}>
            <div style={{fontSize:10,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:.5,marginBottom:4}}>{k.l}</div>
            <div style={{fontSize:16,fontWeight:800,color:k.c}}>{k.v}</div>
          </div>)}
        </div>
        {prevody.length>0&&<div style={{marginTop:10,fontSize:11,color:C.dim}}>↔️ Tento měsíc „proletělo" v interních převodech {prevodSuma.toLocaleString("cs")} Kč v {prevody.length} {prevody.length===1?"převodu":"převodech"} — do reálných příjmů/výdajů se nepočítá.</div>}
      </div>

      {/* Graf */}
      <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,padding:20,marginBottom:20}}>
        <div style={{fontSize:13,fontWeight:700,marginBottom:16}}>📈 Vývoj celkového stavu</div>
        {grafData.length===0?<div style={{padding:40,textAlign:"center",color:C.dim}}>Žádná data pro vybraný filtr a období</div>:
        <SvgLineChart data={grafData} color={C.accent}/>}
      </div>

      {/* Tabulka po měsících */}
      <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,overflow:"hidden",marginBottom:20}}>
        <div style={{padding:"14px 18px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontWeight:700,fontSize:14}}>📅 Přehled po měsících</span>
          <button onClick={()=>{
            const nm=dnes.getMonth()+2>12?1:dnes.getMonth()+2;
            const nr=dnes.getMonth()+2>12?dnes.getFullYear()+1:dnes.getFullYear();
            setStavModal({nazev:"Všechny účty",id:null,multi:true});
            setStavForm({rok:nr,mesic:nm,stav:""});
          }} style={{...btnC(C.accent,true),fontSize:12,padding:"5px 12px"}}>+ Zadat stavy</button>
        </div>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",minWidth:500}}>
            <thead><tr style={{background:C.bg}}>
              <th style={{padding:"9px 14px",textAlign:"left",fontSize:11,fontWeight:700,color:C.muted,textTransform:"uppercase"}}>Měsíc</th>
              <th style={{padding:"9px 14px",textAlign:"right",fontSize:11,fontWeight:700,color:C.muted,textTransform:"uppercase"}}>Stav</th>
              <th style={{padding:"9px 14px",textAlign:"right",fontSize:11,fontWeight:700,color:C.muted,textTransform:"uppercase"}}>Změna</th>
              <th style={{padding:"9px 14px",textAlign:"right",fontSize:11,fontWeight:700,color:C.muted,textTransform:"uppercase"}}>Změna %</th>
            </tr></thead>
            <tbody>
              {[...grafData].reverse().map((d,i,arr)=>{
                const prev=arr[i+1];
                const zmena=prev!=null?d.suma-prev.suma:null;
                const pct=prev&&prev.suma!==0?((d.suma-prev.suma)/Math.abs(prev.suma)*100):null;
                return <tr key={`${d.rok}-${d.mesic}`} style={{background:i%2===0?C.surface:"#fafbff",borderBottom:`1px solid ${C.border}`}}>
                  <td style={{padding:"10px 14px",fontWeight:600,fontSize:13}}>{mesiceNazvy[d.mesic-1]} {d.rok}</td>
                  <td style={{padding:"10px 14px",textAlign:"right",fontWeight:800,fontSize:13}}>{d.suma.toLocaleString("cs")} Kč</td>
                  <td style={{padding:"10px 14px",textAlign:"right",fontSize:13,fontWeight:700,color:zmena!=null?(zmena>=0?C.green:C.red):C.dim}}>
                    {zmena!=null?`${zmena>=0?"+":""}${zmena.toLocaleString("cs")} Kč`:"—"}
                  </td>
                  <td style={{padding:"10px 14px",textAlign:"right",fontSize:13,fontWeight:700,color:pct!=null?(pct>=0?C.green:C.red):C.dim}}>
                    {pct!=null?`${pct>=0?"+":""}${pct.toFixed(1)} %`:"—"}
                  </td>
                </tr>;
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal zadání stavů */}
      {stavModal&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
        <div style={{background:C.surface,borderRadius:18,padding:28,width:"100%",maxWidth:480,boxShadow:"0 20px 60px rgba(0,0,0,.25)",maxHeight:"90vh",overflowY:"auto"}}>
          <h3 style={{margin:"0 0 6px",fontSize:17,fontWeight:800}}>Zadat stavy účtů</h3>
          <div style={{fontSize:13,color:C.muted,marginBottom:16}}>Zadej stav pro každý účet k vybranému měsíci</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
            <div>
              <div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:4}}>Měsíc</div>
              <select style={inp} value={stavForm.mesic} onChange={e=>setStavForm(p=>({...p,mesic:+e.target.value}))}>
                {mesiceNazvy.map((m,i)=><option key={i+1} value={i+1}>{m}</option>)}
              </select>
            </div>
            <div>
              <div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:4}}>Rok</div>
              <select style={inp} value={stavForm.rok} onChange={e=>setStavForm(p=>({...p,rok:+e.target.value}))}>
                {[2018,2019,2020,2021,2022,2023,2024,2025,2026,2027].map(r=><option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>
          <MultiStavForm ucty={uctyView.filter(u=>(filtrTypy.length===0||filtrTypy.includes(u.typ))&&u.typ!="cizi_mena")} rok={stavForm.rok} mesic={stavForm.mesic} stavy={stavy||[]} onSave={async(updates)=>{
            for(const {ucet_id,stav} of updates){
              if(stav===""||stav==null)continue;
              await sb.from("fin_stavy").upsert({ucet_id,rok:stavForm.rok,mesic:stavForm.mesic,stav:+stav},{onConflict:"ucet_id,rok,mesic"});
            }
            reloadStavy();setStavModal(null);
          }} onClose={()=>setStavModal(null)}/>
        </div>
      </div>}
    </div>;
  };

  // Helper — multi stav form
  function MultiStavForm({ucty:uArr,rok,mesic,stavy:stavyArr,onSave,onClose}){
    const init=Object.fromEntries((uArr||[]).map(u=>{
      const s=stavyArr.find(s=>s.ucet_id===u.id&&s.rok===rok&&s.mesic===mesic);
      return [u.id,s!=null?String(s.stav):""];
    }));
    const [vals,setVals]=useState(init);
    useEffect(()=>{
      const nw=Object.fromEntries((uArr||[]).map(u=>{
        const s=stavyArr.find(s=>s.ucet_id===u.id&&s.rok===rok&&s.mesic===mesic);
        return [u.id,s!=null?String(s.stav):""];
      }));
      setVals(nw);
    },[rok,mesic]);
    const typy2={bezny:"Běžný",sporici:"Spořící",podnikatelsky:"Podnikatelský",investicni:"Investiční",hotovost:"Hotovost",cizi_mena:"Cizí měna",deti:"Děti"};
    const skupiny=Object.keys(typy2).map(t=>({typ:t,ucty:(uArr||[]).filter(u=>u.typ===t)})).filter(g=>g.ucty.length>0);
    return <div>
      {skupiny.map(({typ,ucty:uArr2})=><div key={typ} style={{marginBottom:16}}>
        <div style={{fontSize:11,fontWeight:700,color:typBarvy[typ]||C.muted,textTransform:"uppercase",letterSpacing:.5,marginBottom:8}}>{typy2[typ]}</div>
        {uArr2.map(u=><div key={u.id} style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
          <div style={{flex:1,fontSize:13,fontWeight:600}}>{u.nazev}</div>
          <input style={{...inp,width:130,textAlign:"right"}} type="number" step="0.01" placeholder="—" value={vals[u.id]||""} onChange={e=>setVals(p=>({...p,[u.id]:e.target.value}))}/>
          <span style={{fontSize:11,color:C.muted,width:30}}>{u.mena}</span>
        </div>)}
      </div>)}
      <div style={{display:"flex",gap:10,marginTop:16,borderTop:`1px solid ${C.border}`,paddingTop:16}}>
        <button onClick={()=>onSave(Object.entries(vals).map(([ucet_id,stav])=>({ucet_id,stav})))} style={btnC()}>Uložit vše</button>
        <button onClick={onClose} style={btnC(C.muted,true)}>Zrušit</button>
      </div>
    </div>;
  }

  // ── ÚČTY ──
  const UctyView=()=>{
    const [modal,setModal]=useState(null);
    const [stavModal,setStavModal]=useState(null);
    const [form,setForm]=useState({nazev:"",typ:"bezny",mena:"CZK",poznamka:"",poradi:0});
    const [stavForm,setStavForm]=useState({rok:new Date().getFullYear(),mesic:new Date().getMonth()+1,stav:""});
    const [filtrTyp,setFiltrTyp]=useState("vse");
    const [zobrazeni,setZobrazeni]=useState("aktualni"); // aktualni | historie
    const [histRok,setHistRok]=useState(new Date().getFullYear());

    const ulozUcet=async()=>{
      if(modal==="novy")await sb.from("fin_ucty").insert({...form,aktivni:true});
      else await sb.from("fin_ucty").update(form).eq("id",modal.id);
      reloadUcty();setModal(null);
    };
    const ulozStav=async()=>{
      await sb.from("fin_stavy").upsert({ucet_id:stavModal.id,rok:+stavForm.rok,mesic:+stavForm.mesic,stav:+stavForm.stav},{onConflict:"ucet_id,rok,mesic"});
      reloadStavy();setStavModal(null);
    };
    const archivuj=async(u)=>{if(!confirm(`Archivovat účet "${u.nazev}"?`))return;await sb.from("fin_ucty").update({aktivni:false}).eq("id",u.id);reloadUcty();};

    const aktualniStav=(u)=>{
      const s=(stavy||[]).filter(s=>s.ucet_id===u.id).sort((a,b)=>b.rok-a.rok||b.mesic-a.mesic)[0];
      return s?+(s.stav):null;
    };

    const stavProMesic=(u,rok,mesic)=>{
      const s=(stavy||[]).filter(s=>s.ucet_id===u.id&&s.rok===rok&&s.mesic===mesic)[0];
      return s!=null?+(s.stav):null;
    };

    const filtrUcty=uctyView.filter(u=>(filtrTyp==="vse"||u.typ===filtrTyp));
    const skupiny=Object.entries(typy).map(([k,v])=>({typ:k,label:v,ucty:filtrUcty.filter(u=>u.typ===k)})).filter(g=>g.ucty.length>0);

    const roky=[2018,2019,2020,2021,2022,2023,2024,2025,2026];
    const mesiceNazvy=["Led","Úno","Bře","Dub","Kvě","Čvn","Čvc","Srp","Zář","Říj","Lis","Pro"];

    const celkovyStavFilt=filtrUcty.filter(u=>u.typ!=="cizi_mena").reduce((a,u)=>{
      const s=aktualniStav(u);
      return a+(s||0);
    },0);

    return <div>
      {/* Filtry a přepínač */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:10}}>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          <button onClick={()=>setFiltrTyp("vse")} style={{...btnC(filtrTyp==="vse"?C.accent:C.muted,filtrTyp!=="vse"),padding:"5px 12px",fontSize:12}}>Vše</button>
          {Object.entries(typy).filter(([k])=>zahrnoutDeti||k!=="deti").map(([k,v])=><button key={k} onClick={()=>setFiltrTyp(k)} style={{...btnC(filtrTyp===k?typBarvy[k]:C.muted,filtrTyp!==k),padding:"5px 12px",fontSize:12}}>{v}</button>)}
        </div>
        <div style={{display:"flex",gap:6}}>
          <button onClick={()=>setZobrazeni("aktualni")} style={{...btnC(zobrazeni==="aktualni"?C.accent:C.muted,zobrazeni!=="aktualni"),padding:"5px 12px",fontSize:12}}>Aktuální</button>
          <button onClick={()=>setZobrazeni("historie")} style={{...btnC(zobrazeni==="historie"?C.accent:C.muted,zobrazeni!=="historie"),padding:"5px 12px",fontSize:12}}>📈 Historie</button>
          <button onClick={()=>{setForm({nazev:"",typ:"bezny",mena:"CZK",poznamka:"",poradi:(ucty||[]).length});setModal("novy");}} style={btnC()}>+ Účet</button>
        </div>
      </div>

      {/* Celkový stav */}
      <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"12px 20px",marginBottom:20,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{fontSize:12,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:.6}}>Celkový majetek {filtrTyp!=="vse"?`(${typy[filtrTyp]})`:""}</div>
        <div style={{fontSize:22,fontWeight:800,color:celkovyStavFilt>=0?C.green:C.red}}>{celkovyStavFilt.toLocaleString("cs")} Kč</div>
      </div>

      {/* AKTUÁLNÍ POHLED */}
      {zobrazeni==="aktualni"&&skupiny.map(({typ,label,ucty:uArr})=><div key={typ} style={{marginBottom:20}}>
        <div style={{fontSize:12,fontWeight:700,textTransform:"uppercase",letterSpacing:.6,color:typBarvy[typ]||C.muted,marginBottom:10}}>{label}</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:10}}>
          {uArr.map(u=>{
            const stav=aktualniStav(u);
            const pocatecni=stavProMesic(u,new Date().getFullYear(),1);
            const zmena=stav!=null&&pocatecni!=null?stav-pocatecni:null;
            return <div key={u.id} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"14px 16px",borderLeft:`4px solid ${typBarvy[typ]||C.accent}`}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  {u.logo_url&&<img src={u.logo_url} alt="" style={{width:20,height:20,objectFit:"contain",borderRadius:4}} onError={e=>e.target.style.display="none"}/>}
                  <div style={{fontWeight:700,fontSize:14,color:C.text}}>{u.nazev}</div>
                </div>
                <div style={{display:"flex",gap:4}}>
                  <button onClick={()=>{setStavModal(u);setStavForm({rok:new Date().getFullYear(),mesic:new Date().getMonth()+1,stav:stav!=null?String(stav):""});}} style={{...btnC(C.green,true),padding:"2px 8px",fontSize:11}}>Stav</button>
                  <button onClick={()=>{setModal(u);setForm({nazev:u.nazev,typ:u.typ,mena:u.mena,poznamka:u.poznamka||"",poradi:u.poradi});}} style={{...btnC(C.accent,true),padding:"2px 8px",fontSize:11}}>✏</button>
                </div>
              </div>
              <div style={{fontSize:20,fontWeight:800,color:stav!=null?(stav<0?C.red:C.text):C.dim}}>
                {stav!=null?`${stav.toLocaleString("cs")} ${u.mena}`:"—"}
              </div>
              {zmena!=null&&<div style={{fontSize:11,color:zmena>=0?C.green:C.red,marginTop:3,fontWeight:600}}>
                {zmena>=0?"▲":"▼"} {Math.abs(zmena).toLocaleString("cs")} Kč od 1.1.{new Date().getFullYear()}
              </div>}
            </div>;
          })}
        </div>
      </div>)}

      {/* HISTORICKÝ POHLED */}
      {zobrazeni==="historie"&&<div>
        <div style={{display:"flex",gap:6,marginBottom:16,flexWrap:"wrap",alignItems:"center"}}>
          <span style={{fontSize:12,fontWeight:700,color:C.muted}}>Rok:</span>
          {roky.map(r=><button key={r} onClick={()=>setHistRok(r)} style={{...btnC(histRok===r?C.accent:C.muted,histRok!==r),padding:"4px 10px",fontSize:12}}>{r}</button>)}
        </div>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",minWidth:800}}>
            <thead><tr style={{background:C.bg}}>
              <th style={{padding:"9px 12px",textAlign:"left",fontSize:12,fontWeight:700,color:C.muted,whiteSpace:"nowrap",position:"sticky",left:0,background:C.bg}}>Účet</th>
              {mesiceNazvy.map((m,i)=><th key={i} style={{padding:"9px 10px",textAlign:"right",fontSize:11,fontWeight:700,color:C.muted,whiteSpace:"nowrap"}}>{m}</th>)}
            </tr></thead>
            <tbody>
              {filtrUcty.map((u,ui)=>{
                const radekStavy=mesiceNazvy.map((_,i)=>stavProMesic(u,histRok,i+1));
                const maData=radekStavy.some(s=>s!=null);
                if(!maData)return null;
                return <tr key={u.id} style={{background:ui%2===0?C.surface:"#fafbff",borderBottom:`1px solid ${C.border}`}}>
                  <td style={{padding:"9px 12px",fontWeight:600,fontSize:13,whiteSpace:"nowrap",position:"sticky",left:0,background:ui%2===0?C.surface:"#fafbff",borderRight:`1px solid ${C.border}`}}>
                    <div style={{display:"flex",alignItems:"center",gap:6}}>
                      {u.logo_url&&<img src={u.logo_url} alt="" style={{width:16,height:16,objectFit:"contain",borderRadius:3}} onError={e=>e.target.style.display="none"}/>}
                      <span style={{display:"inline-block",width:8,height:8,borderRadius:"50%",background:typBarvy[u.typ]||C.muted}}/>
                      {u.nazev}
                    </div>
                  </td>
                  {radekStavy.map((s,i)=><td key={i} style={{padding:"9px 10px",textAlign:"right",fontSize:12,color:s!=null?(s<0?C.red:C.text):C.dim,fontWeight:s!=null?600:400}}>
                    {s!=null?s.toLocaleString("cs"):"—"}
                  </td>)}
                </tr>;
              })}
              {/* Součtový řádek */}
              <tr style={{background:C.bg,borderTop:`2px solid ${C.border}`,fontWeight:800}}>
                <td style={{padding:"9px 12px",fontSize:13,fontWeight:800,position:"sticky",left:0,background:C.bg,borderRight:`1px solid ${C.border}`}}>CELKEM</td>
                {mesiceNazvy.map((_,i)=>{
                  const suma=filtrUcty.filter(u=>u.typ!=="cizi_mena").reduce((a,u)=>{
                    const s=stavProMesic(u,histRok,i+1);
                    return a+(s||0);
                  },0);
                  const maData=filtrUcty.some(u=>stavProMesic(u,histRok,i+1)!=null);
                  return <td key={i} style={{padding:"9px 10px",textAlign:"right",fontSize:12,fontWeight:800,color:suma>=0?C.green:C.red}}>
                    {maData?suma.toLocaleString("cs"):"—"}
                  </td>;
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </div>}

      {/* Modal účet */}
      {modal&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
        <div style={{background:C.surface,borderRadius:18,padding:28,width:"100%",maxWidth:400,boxShadow:"0 20px 60px rgba(0,0,0,.25)"}}>
          <h3 style={{margin:"0 0 18px",fontSize:17,fontWeight:800}}>{modal==="novy"?"Nový účet":"Upravit účet"}</h3>
          <div style={{marginBottom:12}}>
            <div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:4}}>Název</div>
            <input style={inp} value={form.nazev} onChange={e=>setForm(p=>({...p,nazev:e.target.value}))}/>
          </div>
          <div style={{marginBottom:12}}>
            <div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:4}}>Typ</div>
            <select style={inp} value={form.typ} onChange={e=>setForm(p=>({...p,typ:e.target.value}))}>
              {Object.entries(typy).map(([k,v])=><option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div style={{marginBottom:16}}>
            <div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:4}}>Měna</div>
            <select style={inp} value={form.mena} onChange={e=>setForm(p=>({...p,mena:e.target.value}))}>
              {["CZK","EUR","USD","GBP"].map(m=><option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div style={{display:"flex",gap:10}}>
            <button onClick={ulozUcet} style={btnC()}>Uložit</button>
            <button onClick={()=>setModal(null)} style={btnC(C.muted,true)}>Zrušit</button>
            {modal!=="novy"&&<button onClick={()=>archivuj(modal)} style={{...btnC(C.red,true),marginLeft:"auto"}}>Archivovat</button>}
          </div>
        </div>
      </div>}

      {/* Modal stav účtu */}
      {stavModal&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
        <div style={{background:C.surface,borderRadius:18,padding:28,width:"100%",maxWidth:360,boxShadow:"0 20px 60px rgba(0,0,0,.25)"}}>
          <h3 style={{margin:"0 0 4px",fontSize:17,fontWeight:800}}>Zadat stav účtu</h3>
          <div style={{fontSize:13,color:C.muted,marginBottom:18}}>{stavModal.nazev}</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
            <div>
              <div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:4}}>Rok</div>
              <input style={inp} type="number" value={stavForm.rok} onChange={e=>setStavForm(p=>({...p,rok:e.target.value}))}/>
            </div>
            <div>
              <div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:4}}>Měsíc</div>
              <select style={inp} value={stavForm.mesic} onChange={e=>setStavForm(p=>({...p,mesic:e.target.value}))}>
                {["Leden","Únor","Březen","Duben","Květen","Červen","Červenec","Srpen","Září","Říjen","Listopad","Prosinec"].map((m,i)=><option key={i+1} value={i+1}>{m}</option>)}
              </select>
            </div>
          </div>
          <div style={{marginBottom:16}}>
            <div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:4}}>Stav ({stavModal.mena})</div>
            <input style={inp} type="number" step="0.01" value={stavForm.stav} onChange={e=>setStavForm(p=>({...p,stav:e.target.value}))}/>
          </div>
          <div style={{display:"flex",gap:10}}>
            <button onClick={ulozStav} style={btnC()}>Uložit</button>
            <button onClick={()=>setStavModal(null)} style={btnC(C.muted,true)}>Zrušit</button>
          </div>
        </div>
      </div>}
    </div>;
  };

  // ── TRANSAKCE ──
  const TransakceView=()=>{
    const [mesicFiltr,setMesicFiltr]=useState(`${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,"0")}`);
    const [ucetFiltr,setUcetFiltr]=useState(""); // "" = všechny účty
    const [modal,setModal]=useState(null);
    const [form,setForm]=useState({ucet_id:"",datum:new Date().toISOString().slice(0,10),castka:"",kategorie_id:"",popis:"",protistrana:"",typ:"vydaj",prevod_ucet_id:""});

    const filtrZaklad=(transakce||[]).filter(t=>t.datum?.startsWith(mesicFiltr)&&(zahrnoutDeti||!transNaDeti(t)));
    const filtr=ucetFiltr
      ? filtrZaklad.filter(t=>String(t.ucet_id)===String(ucetFiltr)||String(t.prevod_ucet_id)===String(ucetFiltr))
      : filtrZaklad;
    // Reálné příjmy/výdaje (převody vyřazeny). U konkrétního účtu = jeho inflow/outflow.
    const prijmy=filtr.filter(t=>klasifikujTransakci(t)==="prijem").reduce((a,t)=>a+Math.abs(+t.castka),0);
    const vydaje=filtr.filter(t=>klasifikujTransakci(t)==="vydaj").reduce((a,t)=>a+Math.abs(+t.castka),0);
    const prevodyF=filtr.filter(t=>klasifikujTransakci(t)==="prevod");
    const prevodSumaF=prevodyF.reduce((a,t)=>a+Math.abs(+t.castka),0);

    const uloz=async()=>{
      const t=form.typ;
      let castka=+form.castka;
      if(t==="prijem") castka=Math.abs(castka);
      else if(t==="vydaj") castka=-Math.abs(castka);
      else castka=Math.abs(castka); // prevod
      const data={ucet_id:form.ucet_id||null,datum:form.datum,castka,kategorie_id:t==="prevod"?null:(form.kategorie_id||null),popis:form.popis||null,protistrana:form.protistrana||null,typ:t,prevod_ucet_id:t==="prevod"?(form.prevod_ucet_id||null):null};
      if(modal==="nova")await sb.from("fin_transakce").insert(data);
      else await sb.from("fin_transakce").update(data).eq("id",modal.id);
      reloadTrans();setModal(null);
    };
    const smaz=async(id)=>{if(!confirm("Smazat transakci?"))return;await sb.from("fin_transakce").delete().eq("id",id);reloadTrans();};

    return <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:10}}>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
          <input type="month" value={mesicFiltr} onChange={e=>setMesicFiltr(e.target.value)} style={{...inp,width:"auto"}}/>
          <select value={ucetFiltr} onChange={e=>setUcetFiltr(e.target.value)} style={{...inp,width:"auto"}}>
            <option value="">🏦 Všechny účty</option>
            {uctyView.map(u=><option key={u.id} value={u.id}>{u.nazev}</option>)}
          </select>
        </div>
        <button onClick={()=>{setForm({ucet_id:ucetFiltr||uctyView[0]?.id||"",datum:new Date().toISOString().slice(0,10),castka:"",kategorie_id:"",popis:"",protistrana:"",typ:"vydaj",prevod_ucet_id:""});setModal("nova");}} style={btnC()}>+ Přidat transakci</button>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:12,marginBottom:20}}>
        {[
          {l:ucetFiltr?"Inflow účtu":"Příjmy",v:`+${prijmy.toLocaleString("cs")} Kč`,c:C.green},
          {l:ucetFiltr?"Outflow účtu":"Výdaje",v:`-${vydaje.toLocaleString("cs")} Kč`,c:C.red},
          {l:"Bilance",v:`${(prijmy-vydaje>=0?"+":"")}${(prijmy-vydaje).toLocaleString("cs")} Kč`,c:prijmy>=vydaje?C.green:C.red},
          {l:`Převody (${prevodyF.length}×)`,v:`${prevodSumaF.toLocaleString("cs")} Kč`,c:C.blue},
        ].map(k=><div key={k.l} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"12px 16px",borderTop:`3px solid ${k.c}`}}>
          <div style={{fontSize:11,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:.5,marginBottom:3}}>{k.l}</div>
          <div style={{fontSize:16,fontWeight:800,color:k.c}}>{k.v}</div>
        </div>)}
      </div>

      <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,overflow:"hidden"}}>
        {filtr.length===0?<div style={{padding:32,textAlign:"center",color:C.dim}}>Žádné transakce v tomto měsíci</div>:
        filtr.map((t,i)=>{
          const kat=(kategorie||[]).find(k=>k.id===t.kategorie_id);
          const ucet=(ucty||[]).find(u=>u.id===t.ucet_id);
          const prevUcet=(ucty||[]).find(u=>u.id===t.prevod_ucet_id);
          const kl=klasifikujTransakci(t);
          return <div key={t.id} style={{display:"flex",alignItems:"center",gap:12,padding:"11px 16px",borderBottom:i<filtr.length-1?`1px solid ${C.border}`:"none"}}>
            <span style={{fontSize:18}}>{kl==="prevod"?"↔️":kat?.emoji||"💰"}</span>
            <div style={{flex:1}}>
              <div style={{fontWeight:600,fontSize:14}}>{t.popis||kat?.nazev||(kl==="prevod"?"Převod":"—")}</div>
              <div style={{fontSize:11,color:C.muted}}>
                {new Date(t.datum).toLocaleDateString("cs-CZ")}
                {ucet&&` · ${ucet.nazev}`}
                {kl==="prevod"&&prevUcet&&` → ${prevUcet.nazev}`}
                {t.protistrana&&` · ${t.protistrana}`}
              </div>
            </div>
            <div style={{fontWeight:800,fontSize:15,color:kl==="prevod"?C.blue:(+(t.castka)>0?C.green:C.red),whiteSpace:"nowrap"}}>
              {kl==="prevod"?"↔ ":(+(t.castka)>0?"+":"")}{Math.abs(+t.castka).toLocaleString("cs")} Kč
            </div>
            <button onClick={()=>{setModal(t);setForm({ucet_id:t.ucet_id||"",datum:t.datum,castka:String(Math.abs(+t.castka)),kategorie_id:t.kategorie_id||"",popis:t.popis||"",protistrana:t.protistrana||"",typ:kl,prevod_ucet_id:t.prevod_ucet_id||""}); }} style={{...btnC(C.accent,true),padding:"3px 8px",fontSize:11,marginRight:3}}>✏</button>
            <button onClick={()=>smaz(t.id)} style={{...btnC(C.red,true),padding:"3px 8px",fontSize:11}}>🗑</button>
          </div>;
        })}
      </div>

      {modal&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
        <div style={{background:C.surface,borderRadius:18,padding:28,width:"100%",maxWidth:440,boxShadow:"0 20px 60px rgba(0,0,0,.25)",maxHeight:"90vh",overflowY:"auto"}}>
          <h3 style={{margin:"0 0 18px",fontSize:17,fontWeight:800}}>{modal==="nova"?"Nová transakce":"Upravit transakci"}</h3>
          <div style={{marginBottom:11}}>
            <div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:4}}>Typ</div>
            <select style={inp} value={form.typ} onChange={e=>setForm(p=>({...p,typ:e.target.value}))}>
              <option value="prijem">📥 Příjem</option>
              <option value="vydaj">📤 Výdaj</option>
              <option value="prevod">↔️ Převod mezi účty</option>
            </select>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:11}}>
            <div>
              <div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:4}}>{form.typ==="prevod"?"Zdrojový účet":"Účet"}</div>
              <select style={inp} value={form.ucet_id} onChange={e=>setForm(p=>({...p,ucet_id:e.target.value}))}>
                <option value="">— vyber —</option>
                {(ucty||[]).map(u=><option key={u.id} value={u.id}>{u.nazev}{u.typ==="deti"?" · 👶":""}</option>)}
              </select>
            </div>
            {form.typ==="prevod"&&<div>
              <div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:4}}>Cílový účet</div>
              <select style={inp} value={form.prevod_ucet_id} onChange={e=>setForm(p=>({...p,prevod_ucet_id:e.target.value}))}>
                <option value="">— vyber —</option>
                {(ucty||[]).map(u=><option key={u.id} value={u.id}>{u.nazev}{u.typ==="deti"?" · 👶":""}</option>)}
              </select>
            </div>}
          </div>
          {[
            {l:"Datum",k:"datum",t:"date"},
            {l:form.typ==="prevod"?"Částka převodu (Kč)":form.typ==="prijem"?"Částka příjmu (Kč)":"Částka výdaje (Kč)",k:"castka",t:"number"},
            {l:"Popis",k:"popis",t:"text",ph:"volitelně..."},
            {l:"Protistrana",k:"protistrana",t:"text",ph:"volitelně..."},
          ].map(f=><div key={f.k} style={{marginBottom:11}}>
            <div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:4}}>{f.l}</div>
            <input style={inp} type={f.t} placeholder={f.ph||""} value={form[f.k]} onChange={e=>setForm(p=>({...p,[f.k]:e.target.value}))}/>
          </div>)}
          {form.typ!=="prevod"&&<div style={{marginBottom:16}}>
            <div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:4}}>Kategorie</div>
            <select style={inp} value={form.kategorie_id} onChange={e=>setForm(p=>({...p,kategorie_id:e.target.value}))}>
              <option value="">— bez kategorie —</option>
              <optgroup label="Příjmy">{(kategorie||[]).filter(k=>k.typ==="prijem").map(k=><option key={k.id} value={k.id}>{k.emoji} {k.nazev}</option>)}</optgroup>
              <optgroup label="Výdaje">{(kategorie||[]).filter(k=>k.typ==="vydaj").map(k=><option key={k.id} value={k.id}>{k.emoji} {k.nazev}</option>)}</optgroup>
            </select>
          </div>}
          <div style={{display:"flex",gap:10}}>
            <button onClick={uloz} style={btnC()}>Uložit</button>
            <button onClick={()=>setModal(null)} style={btnC(C.muted,true)}>Zrušit</button>
          </div>
        </div>
      </div>}
    </div>;
  };

  // ── KATEGORIE ──
  const KategorieView=()=>{
    const [modal,setModal]=useState(null);
    const [form,setForm]=useState({nazev:"",typ:"vydaj",emoji:"💰",barva:"#4f7ef0"});

    const uloz=async()=>{
      if(modal==="nova")await sb.from("fin_kategorie").insert({...form,poradi:(kategorie||[]).length});
      else await sb.from("fin_kategorie").update(form).eq("id",modal.id);
      reloadKat();setModal(null);
    };
    const smaz=async(id)=>{if(!confirm("Smazat kategorii?"))return;await sb.from("fin_kategorie").delete().eq("id",id);reloadKat();};

    return <div>
      <div style={{display:"flex",justifyContent:"flex-end",marginBottom:16}}>
        <button onClick={()=>{setForm({nazev:"",typ:"vydaj",emoji:"💰",barva:"#4f7ef0"});setModal("nova");}} style={btnC()}>+ Přidat kategorii</button>
      </div>
      {[{label:"📥 Příjmy",typ:"prijem"},{label:"📤 Výdaje",typ:"vydaj"}].map(({label,typ})=><div key={typ} style={{marginBottom:20}}>
        <div style={{fontSize:13,fontWeight:700,color:C.muted,marginBottom:8}}>{label}</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:8}}>
          {(kategorie||[]).filter(k=>k.typ===typ).map(k=><div key={k.id} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 14px",display:"flex",alignItems:"center",gap:10,borderLeft:`3px solid ${k.barva}`}}>
            <span style={{fontSize:20}}>{k.emoji}</span>
            <div style={{flex:1,fontWeight:600,fontSize:13}}>{k.nazev}</div>
            <button onClick={()=>{setModal(k);setForm({nazev:k.nazev,typ:k.typ,emoji:k.emoji,barva:k.barva});}} style={{...btnC(C.accent,true),padding:"2px 7px",fontSize:11,marginRight:2}}>✏</button>
            <button onClick={()=>smaz(k.id)} style={{...btnC(C.red,true),padding:"2px 7px",fontSize:11}}>🗑</button>
          </div>)}
        </div>
      </div>)}

      {modal&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
        <div style={{background:C.surface,borderRadius:18,padding:28,width:"100%",maxWidth:380,boxShadow:"0 20px 60px rgba(0,0,0,.25)"}}>
          <h3 style={{margin:"0 0 18px",fontSize:17,fontWeight:800}}>{modal==="nova"?"Nová kategorie":"Upravit kategorii"}</h3>
          {[{l:"Název",k:"nazev",t:"text"},{l:"Emoji",k:"emoji",t:"text"}].map(f=><div key={f.k} style={{marginBottom:11}}>
            <div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:4}}>{f.l}</div>
            <input style={inp} type={f.t} value={form[f.k]} onChange={e=>setForm(p=>({...p,[f.k]:e.target.value}))}/>
          </div>)}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
            <div>
              <div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:4}}>Typ</div>
              <select style={inp} value={form.typ} onChange={e=>setForm(p=>({...p,typ:e.target.value}))}>
                <option value="prijem">Příjem</option>
                <option value="vydaj">Výdaj</option>
              </select>
            </div>
            <div>
              <div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:4}}>Barva</div>
              <input style={inp} type="color" value={form.barva} onChange={e=>setForm(p=>({...p,barva:e.target.value}))}/>
            </div>
          </div>
          <div style={{display:"flex",gap:10}}>
            <button onClick={uloz} style={btnC()}>Uložit</button>
            <button onClick={()=>setModal(null)} style={btnC(C.muted,true)}>Zrušit</button>
          </div>
        </div>
      </div>}
    </div>;
  };

  // ── TYPY ÚČTŮ ──
  const TypyUctuView=()=>{
    const [modal,setModal]=useState(null);
    const [form,setForm]=useState({klic:"",nazev:"",barva:"#4f7ef0",poradi:0});

    const uloz=async()=>{
      if(!form.klic.trim()||!form.nazev.trim())return;
      if(modal==="novy")await sb.from("fin_typy_uctu").insert({klic:form.klic,nazev:form.nazev,barva:form.barva,poradi:+(form.poradi)||((typy_db||[]).length)});
      else await sb.from("fin_typy_uctu").update({nazev:form.nazev,barva:form.barva,poradi:+(form.poradi)}).eq("id",modal.id);
      reloadTypy();setModal(null);
    };
    const smaz=async(t)=>{
      const pocet=(ucty||[]).filter(u=>u.typ===t.klic).length;
      if(pocet>0){alert(`Nelze smazat — ${pocet} účtů používá tento typ.`);return;}
      if(!confirm(`Smazat typ "${t.nazev}"?`))return;
      await sb.from("fin_typy_uctu").delete().eq("id",t.id);
      reloadTypy();
    };

    return <div>
      <div style={{display:"flex",justifyContent:"flex-end",marginBottom:16}}>
        <button onClick={()=>{setForm({klic:"",nazev:"",barva:"#4f7ef0",poradi:(typy_db||[]).length});setModal("novy");}} style={btnC()}>+ Přidat typ</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:10}}>
        {(typy_db||[]).map(t=>{
          const pocet=(ucty||[]).filter(u=>u.typ===t.klic).length;
          return <div key={t.id} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"14px 16px",borderLeft:`4px solid ${t.barva}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
              <div style={{fontWeight:700,fontSize:14}}>{t.nazev}</div>
              <div style={{display:"flex",gap:4}}>
                <button onClick={()=>{setModal(t);setForm({klic:t.klic,nazev:t.nazev,barva:t.barva,poradi:t.poradi});}} style={{...btnC(C.accent,true),padding:"2px 8px",fontSize:11}}>✏</button>
                <button onClick={()=>smaz(t)} style={{...btnC(C.red,true),padding:"2px 8px",fontSize:11}}>🗑</button>
              </div>
            </div>
            <div style={{fontSize:11,color:C.muted}}>
              <span style={{background:t.barva+"22",color:t.barva,borderRadius:4,padding:"1px 6px",fontWeight:600,marginRight:6}}>{t.klic}</span>
              {pocet} {pocet===1?"účet":"účtů"}
            </div>
          </div>;
        })}
      </div>
      {modal&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
        <div style={{background:C.surface,borderRadius:18,padding:28,width:"100%",maxWidth:380,boxShadow:"0 20px 60px rgba(0,0,0,.25)"}}>
          <h3 style={{margin:"0 0 18px",fontSize:17,fontWeight:800}}>{modal==="novy"?"Nový typ účtu":"Upravit typ"}</h3>
          {modal==="novy"&&<div style={{marginBottom:11}}>
            <div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:4}}>Klíč (anglicky, bez mezer)</div>
            <input style={inp} value={form.klic} onChange={e=>setForm(p=>({...p,klic:e.target.value.toLowerCase().replace(/\s/g,"_")}))} placeholder="napr. deti"/>
            <div style={{fontSize:11,color:C.dim,marginTop:3}}>Klíč nelze změnit po vytvoření</div>
          </div>}
          <div style={{marginBottom:11}}>
            <div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:4}}>Název</div>
            <input style={inp} value={form.nazev} onChange={e=>setForm(p=>({...p,nazev:e.target.value}))} placeholder="napr. Děti"/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
            <div>
              <div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:4}}>Barva</div>
              <input style={inp} type="color" value={form.barva} onChange={e=>setForm(p=>({...p,barva:e.target.value}))}/>
            </div>
            <div>
              <div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:4}}>Pořadí</div>
              <input style={inp} type="number" value={form.poradi} onChange={e=>setForm(p=>({...p,poradi:e.target.value}))}/>
            </div>
          </div>
          <div style={{display:"flex",gap:10}}>
            <button onClick={uloz} style={btnC()}>Uložit</button>
            <button onClick={()=>setModal(null)} style={btnC(C.muted,true)}>Zrušit</button>
          </div>
        </div>
      </div>}
    </div>;
  };

  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:12}}>
      <h2 style={{margin:0,fontSize:22,fontWeight:800}}>💰 Finance (Realita)</h2>
      <div style={{display:"flex",alignItems:"center",gap:16,flexWrap:"wrap"}}>
        <div style={{textAlign:"right"}}>
          <div style={{fontSize:10,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:.5}}>Likvidní majetek{zahrnoutDeti?"":" (bez dětských)"}</div>
          <div style={{fontSize:18,fontWeight:800,color:celkovyStav>=0?C.green:C.red}}>{celkovyStav.toLocaleString("cs")} Kč</div>
        </div>
        <label title="Spořicí účty dětí s vázanými penězi z příspěvků na péči" style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",background:zahrnoutDeti?C.accentS:C.surface,border:`1px solid ${zahrnoutDeti?C.accent:C.border}`,borderRadius:10,padding:"7px 12px"}}>
          <input type="checkbox" checked={zahrnoutDeti} onChange={e=>setZahrnoutDeti(e.target.checked)}/>
          <span style={{fontSize:12,fontWeight:700,color:zahrnoutDeti?C.accent:C.muted}}>👶 Zahrnout dětské svaté účty</span>
        </label>
      </div>
    </div>
    <div style={{display:"flex",gap:2,marginBottom:24,borderBottom:`2px solid ${C.border}`,overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
      {tabs.map(t=><button key={t.id} onClick={()=>setZalozka(t.id)} style={{padding:"9px 14px",border:"none",background:"none",cursor:"pointer",fontSize:12,fontWeight:700,color:zalozka===t.id?C.accent:C.muted,borderBottom:zalozka===t.id?`2px solid ${C.accent}`:"2px solid transparent",marginBottom:-2,whiteSpace:"nowrap",flexShrink:0}}>{t.l}</button>)}
    </div>
    {zalozka==="dashboard"&&<DashboardView/>}
    {zalozka==="ucty"&&<UctyView/>}
    {zalozka==="transakce"&&<TransakceView/>}
    {zalozka==="kategorie"&&<KategorieView/>}
    {zalozka==="typy"&&<TypyUctuView/>}
  </div>;
}


// ── Simulátor „co kdyby" převodu z buňky predikce likvidity ───────────────────
// Navrhne převod, který zalepí budoucí mínus, a živě ukáže dopad na oba účty.
function CashflowSimulator({sim,sloupce,uctyView,predikceUctuRaw,ucetNazev,onClose,onAddSim,onPlan}){
  const cilUcet=sim.u;
  const cilPred=predikceUctuRaw(cilUcet);
  const schodek=cilPred[sim.idx]<0?Math.ceil(-cilPred[sim.idx]):0;
  // Zdroje: ostatní viditelné účty seřazené podle predikovaného zůstatku v daném měsíci (nejbohatší první)
  const zdroje=uctyView.filter(u=>String(u.id)!==String(cilUcet.id))
    .map(u=>({u,pred:predikceUctuRaw(u)[sim.idx]}))
    .sort((a,b)=>b.pred-a.pred);
  const [mesicIdx,setMesicIdx]=useState(sim.idx);
  const [from,setFrom]=useState(zdroje[0]?.u.id?String(zdroje[0].u.id):"");
  const [amount,setAmount]=useState(schodek?String(schodek):"");

  const sloupecCil=sloupce[sim.idx];
  const sloupecPrev=sloupce[mesicIdx];
  const castka=+amount||0;
  const kandidat={from,to:String(cilUcet.id),amount:castka,rok:sloupecPrev.rok,mesic:sloupecPrev.mesic};
  const platny=from && String(from)!==String(cilUcet.id) && castka>0;

  const cilPo=predikceUctuRaw(cilUcet,[kandidat]);
  const srcObj=uctyView.find(u=>String(u.id)===String(from));
  const srcPred=srcObj?predikceUctuRaw(srcObj):null;
  const srcPo=srcObj?predikceUctuRaw(srcObj,[kandidat]):null;
  const srcPujdeDoMinusu=srcPo?srcPo.some(v=>v<0):false;
  const cilStaleMinus=cilPo.some(v=>v<0);

  const radek=(label,pred,po,zvyrazni)=><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,padding:"7px 0",borderBottom:`1px solid ${C.border}`}}>
    <span style={{fontSize:12,fontWeight:700,color:C.text}}>{label}</span>
    <span style={{fontSize:12,fontVariantNumeric:"tabular-nums"}}>
      <span style={{color:pred<0?C.red:C.muted}}>{Math.round(pred).toLocaleString("cs")}</span>
      <span style={{color:C.dim,margin:"0 6px"}}>→</span>
      <b style={{color:po<0?C.red:C.green}}>{Math.round(po).toLocaleString("cs")} Kč</b>
    </span>
  </div>;

  return <Modal title="🧪 Simulace převodu" onClose={onClose} width={480}>
    <div style={{background:cilPred[sim.idx]<0?C.redS:C.bg,borderRadius:10,padding:"10px 14px",marginBottom:16,fontSize:13}}>
      <b>{cilUcet.nazev}</b> má v <b>{MESICE[sloupecCil.mesic-1]} {sloupecCil.rok}</b> predikovaný zůstatek{" "}
      <b style={{color:cilPred[sim.idx]<0?C.red:C.green}}>{Math.round(cilPred[sim.idx]).toLocaleString("cs")} Kč</b>.
      {schodek>0&&<> Pro vyrovnání chybí <b style={{color:C.red}}>{schodek.toLocaleString("cs")} Kč</b>.</>}
    </div>

    <Field label="Z účtu *" hint="Odkud peníze převést (číslo = predikce v daném měsíci)">
      <select style={inp} value={from} onChange={e=>setFrom(e.target.value)}>
        <option value="">— vyber zdroj —</option>
        {zdroje.map(({u,pred})=><option key={u.id} value={u.id}>{u.nazev} · {Math.round(pred).toLocaleString("cs")} Kč</option>)}
      </select>
    </Field>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
      <Field label="Částka (Kč) *"><input style={inp} type="number" value={amount} onChange={e=>setAmount(e.target.value)} placeholder={schodek?String(schodek):"5000"}/></Field>
      <Field label="Měsíc převodu" hint="Kdy peníze dorazí">
        <select style={inp} value={mesicIdx} onChange={e=>setMesicIdx(+e.target.value)}>
          {sloupce.slice(0,sim.idx+1).map((s,i)=><option key={i} value={i}>{MESICE[s.mesic-1]} {s.rok}</option>)}
        </select>
      </Field>
    </div>

    {platny&&<div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 14px",marginBottom:14}}>
      <div style={{fontSize:11,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:.5,marginBottom:6}}>Dopad v {MESICE[sloupecCil.mesic-1]} {sloupecCil.rok}</div>
      {radek("📥 "+cilUcet.nazev, cilPred[sim.idx], cilPo[sim.idx])}
      {srcObj&&radek("📤 "+srcObj.nazev, srcPred[mesicIdx], srcPo[mesicIdx])}
      {cilStaleMinus&&<div style={{color:C.red,fontSize:12,fontWeight:700,marginTop:8}}>⚠ Cílový účet je i po převodu někdy v mínusu — zvyš částku nebo přidej další převod.</div>}
      {srcPujdeDoMinusu&&<div style={{color:C.orange,fontSize:12,fontWeight:700,marginTop:6}}>⚠ Pozor: zdrojový účet by se tímto sám dostal do mínusu.</div>}
      {!cilStaleMinus&&!srcPujdeDoMinusu&&<div style={{color:C.green,fontSize:12,fontWeight:700,marginTop:8}}>✓ Tento převod likviditu vyrovná.</div>}
    </div>}

    <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:6,flexWrap:"wrap"}}>
      <button onClick={onClose} style={btnC(C.muted,true)}>Zrušit</button>
      <button onClick={()=>onAddSim(kandidat)} disabled={!platny} style={btnC(C.blue,true)}>🧪 Přidat do simulace</button>
      <button onClick={()=>onPlan(kandidat)} disabled={!platny} style={btnC(C.blue)}>💾 Naplánovat převod</button>
    </div>
  </Modal>;
}

// ══════════════════════════════════════════════════════════════════════════════
// MODUL: CASHFLOW (Strategické plánování & hlídač likvidity)
// Predikce: aktuální reálný zůstatek (fin_stavy) + naplánované položky a převody
// (fin_cashflow_plan: ucet_id, volitelně prevod_ucet_id) na budoucí měsíce.
// ══════════════════════════════════════════════════════════════════════════════
function CashflowTab(){
  const dnes=new Date();
  const [zalozka,setZalozka]=useState("likvidita");
  const [zahrnoutDeti,setZahrnoutDeti]=useState(false);
  const [horizont,setHorizont]=useState(6);
  const [rok,setRok]=useState(dnes.getFullYear());
  const [mesic,setMesic]=useState(dnes.getMonth()+1);
  const [modal,setModal]=useState(null); // null | "nova" | položka
  const [simulace,setSimulace]=useState([]); // hypotetické převody [{from,to,amount,rok,mesic}]
  const [sim,setSim]=useState(null);         // otevřený simulátor {u, idx}
  const [filtrUcet,setFiltrUcet]=useState(""); // "" = všechny účty; jinak id účtu (jen Plán měsíce)
  const [filtrKat,setFiltrKat]=useState("");   // "" = všechny kategorie; jinak id kategorie (jen Plán měsíce)
  const [realitaPohled,setRealitaPohled]=useState("ucty"); // "ucty" | "kategorie" — pohled v Plán vs realita
  const [odemcenyMesic,setOdemcenyMesic]=useState(""); // "rok-mesic" vědomě odemčeného uplynulého měsíce v Plánu

  const {data:ucty}=useData(()=>sb.from("fin_ucty").select("*").eq("aktivni",true).order("poradi"));
  const {data:plan,reload:reloadPlan}=useData(()=>sb.from("fin_cashflow_plan").select("*").order("rok").order("mesic"));
  const {data:kategorie}=useData(()=>sb.from("fin_kategorie").select("*").order("poradi"));
  const {data:stavy1,reload:reloadStavy1}=useData(()=>sb.from("fin_stavy").select("*").lte("rok",2021).limit(2000));
  const {data:stavy2,reload:reloadStavy2}=useData(()=>sb.from("fin_stavy").select("*").gte("rok",2022).limit(2000));
  const {data:deti}=useData(()=>sb.from("deti").select("id,jmeno,emoji,barva").order("jmeno"));
  const {data:zvirata}=useData(()=>sb.from("zvirata").select("id,jmeno,emoji,barva").order("jmeno"));
  const {data:opravy}=useData(()=>sb.from("dum_opravy").select("id,nazev").order("nazev"));
  const {data:auta}=useData(()=>sb.from("auta").select("id,nazev,spz").order("nazev"));
  const {data:skladKat}=useData(()=>sb.from("sklad_kategorie").select("id,nazev,emoji").order("poradi"));
  // Reálné transakce jen za vybraný měsíc (reaktivně na rok/mesic) — pro porovnání plán vs realita
  const _mStart=`${rok}-${String(mesic).padStart(2,"0")}-01`;
  const _nmR=mesic===12?1:mesic+1, _nyR=mesic===12?rok+1:rok;
  const _mEnd=`${_nyR}-${String(_nmR).padStart(2,"0")}-01`;
  const {data:transMesic}=useData(()=>sb.from("fin_transakce").select("*").gte("datum",_mStart).lt("datum",_mEnd).limit(3000),[rok,mesic]);
  const stavy=[...(stavy1||[]),...(stavy2||[])];

  const nacitam=ucty===null||plan===null||stavy1===null||stavy2===null;
  if(nacitam) return <Spinner/>;

  const detiSet=detskeUcetIds(ucty);
  const uctyView=(ucty||[]).filter(u=>(zahrnoutDeti||u.typ!=="deti")&&u.typ!=="cizi_mena");
  const ucetNazev=(id)=>(ucty||[]).find(u=>String(u.id)===String(id))?.nazev||"—";
  const jePrevodP=(p)=>!!p.prevod_ucet_id;

  // Poslední reálný zůstatek účtu (z fin_stavy)
  const latestStav=(ucetId)=>{
    const s=(stavy||[]).filter(x=>String(x.ucet_id)===String(ucetId)).sort((a,b)=>b.rok-a.rok||b.mesic-a.mesic)[0];
    return s?+(s.stav):0;
  };
  // Čistá změna na účtu z plánu pro daný měsíc (běžné položky + převody dle směru)
  const planDelta=(ucetId,r,m)=>{
    let d=0;
    (plan||[]).forEach(p=>{
      if(p.rok!==r||p.mesic!==m) return;
      if(jePrevodP(p)){
        const amt=Math.abs(+p.castka);
        if(String(p.ucet_id)===String(ucetId)) d-=amt;
        if(String(p.prevod_ucet_id)===String(ucetId)) d+=amt;
      } else if(String(p.ucet_id)===String(ucetId)){
        d+=(+p.castka);
      }
    });
    return d;
  };

  // ── Sloupce predikce (aktuální měsíc + horizont) ──
  const sloupce=[];
  for(let k=0;k<=horizont;k++){
    let mm=dnes.getMonth()+1+k, rr=dnes.getFullYear();
    while(mm>12){mm-=12;rr++;}
    sloupce.push({rok:rr,mesic:mm,label:`${MESICE[mm-1].slice(0,3)} ${String(rr).slice(2)}`});
  }
  // Predikce zůstatku účtu k jednotlivým sloupcům (kumulativně od posledního reálného stavu)
  // Predikce zůstatku s volitelnými hypotetickými převody (simulace + kandidát z modalu).
  const simDeltaFor=(ucetId,r,m,extra)=>{
    let d=0;
    [...simulace,...extra].forEach(s=>{
      if(s.rok!==r||s.mesic!==m) return;
      const amt=Math.abs(+s.amount);
      if(String(s.from)===String(ucetId)) d-=amt;
      if(String(s.to)===String(ucetId)) d+=amt;
    });
    return d;
  };
  const predikceUctuRaw=(u,extra=[])=>{
    let bezici=latestStav(u.id);
    return sloupce.map(s=>{ bezici+=planDelta(u.id,s.rok,s.mesic)+simDeltaFor(u.id,s.rok,s.mesic,extra); return bezici; });
  };
  const predikceUctu=(u)=>predikceUctuRaw(u);
  // Účty s rizikem záporného zůstatku (mimo dětské, ty nehlídáme zde)
  const rizika=[];
  uctyView.forEach(u=>{
    const pr=predikceUctu(u);
    const idx=pr.findIndex(v=>v<0);
    if(idx>=0) rizika.push({ucet:u,mesic:sloupce[idx],stav:pr[idx]});
  });

  // ── PLÁN MĚSÍCE ──
  const planMesice=(plan||[]).filter(p=>p.rok===rok&&p.mesic===mesic&&(zahrnoutDeti||!jeDetskyUcet(p.ucet_id,detiSet)));
  // Zámek uplynulých měsíců — chrání historický otisk plánu pro zpětné porovnání s realitou.
  const jeMinuly = rok<dnes.getFullYear() || (rok===dnes.getFullYear() && mesic<dnes.getMonth()+1);
  const zamceno = jeMinuly && odemcenyMesic!==`${rok}-${mesic}`;
  const bezne=planMesice.filter(p=>!jePrevodP(p));
  const prevody=planMesice.filter(jePrevodP);

  // Filtr na konkrétní účet (volitelný). Převod se týká účtu, pokud je zdroj NEBO cíl.
  const filtrAktivni=!!filtrUcet;
  const filtrKatAktivni=!!filtrKat;
  const naUcte=(p)=>String(p.ucet_id)===String(filtrUcet);
  const naUcteCil=(p)=>String(p.prevod_ucet_id)===String(filtrUcet);
  const vKat=(p)=>String(p.kategorie_id)===String(filtrKat);
  let bezneF = bezne;
  if(filtrAktivni) bezneF=bezneF.filter(naUcte);
  if(filtrKatAktivni) bezneF=bezneF.filter(vKat);
  // Převody nemají kategorii → při filtru kategorie se nezobrazují
  let prevodyF = filtrKatAktivni ? [] : (filtrAktivni ? prevody.filter(p=>naUcte(p)||naUcteCil(p)) : prevody);
  // Souhrny: u filtrovaného účtu se do příjmů/výdajů započítají i převody dle směru.
  let prijmy=bezneF.filter(p=>+(p.castka)>0).reduce((a,p)=>a+(+p.castka),0);
  let vydaje=bezneF.filter(p=>+(p.castka)<0).reduce((a,p)=>a+Math.abs(+p.castka),0);
  if(filtrAktivni){
    prevodyF.forEach(p=>{
      const amt=Math.abs(+p.castka);
      if(naUcteCil(p)) prijmy+=amt;        // příchozí převod = přírůstek na účtu
      else if(naUcte(p)) vydaje+=amt;      // odchozí převod = úbytek z účtu
    });
  }

  const smaz=async(id)=>{if(!confirm("Smazat položku?"))return;await sb.from("fin_cashflow_plan").delete().eq("id",id);reloadPlan();};

  const kopirujMesic=async()=>{
    const nm=mesic===12?1:mesic+1;
    const nr=mesic===12?rok+1:rok;
    if(!confirm(`Zkopírovat plán (fixní platby i převody) ${MESICE[mesic-1]} → ${MESICE[nm-1]} ${nr}?`))return;
    const cilDatum=new Date(nr,nm-1,1);
    const existujici=(plan||[]).filter(p=>p.rok===nr&&p.mesic===nm).map(p=>p.nazev);
    const zdroj=(plan||[]).filter(p=>p.rok===rok&&p.mesic===mesic);
    const kNovym=zdroj.filter(p=>{
      if(existujici.includes(p.nazev))return false;
      if(p.datum_do&&new Date(p.datum_do)<cilDatum)return false;
      return true;
    });
    for(const p of kNovym){
      await sb.from("fin_cashflow_plan").insert({
        rok:nr,mesic:nm,nazev:p.nazev,castka:p.castka,kategorie_id:p.kategorie_id,
        opakovani:p.opakovani,datum_do:p.datum_do||null,poznamka:p.poznamka,
        ucet_id:p.ucet_id||null,prevod_ucet_id:p.prevod_ucet_id||null,
        dite_id:p.dite_id||null,zvire_id:p.zvire_id||null,oprava_id:p.oprava_id||null,
        auto_id:p.auto_id||null,je_majetek:p.je_majetek||false,sklad_kategorie_id:p.sklad_kategorie_id||null,
      });
    }
    reloadPlan();alert(`Zkopírováno ${kNovym.length} položek do ${MESICE[nm-1]} ${nr}.`);
  };

  const tabs=[{id:"likvidita",l:"📊 Predikce likvidity"},{id:"plan",l:"📋 Plán měsíce"},{id:"realita",l:"🎯 Plán vs. realita"}];
  // Zápis (na)plánovaného převodu z likvidity do fin_cashflow_plan.
  const ulozPrevod=async(t)=>{
    await sb.from("fin_cashflow_plan").insert({
      rok:t.rok,mesic:t.mesic,
      nazev:t.nazev||`Převod: ${ucetNazev(t.from)} → ${ucetNazev(t.to)}`,
      castka:Math.abs(+t.amount),kategorie_id:null,opakovani:"jednorazove",datum_do:null,
      poznamka:"Vytvořeno ze simulace likvidity",
      ucet_id:String(t.from),prevod_ucet_id:String(t.to),
      dite_id:null,zvire_id:null,oprava_id:null,auto_id:null,je_majetek:false,sklad_kategorie_id:null,
    });
    reloadPlan();
  };
  const cellStav=(v)=>({padding:"8px 10px",textAlign:"right",fontSize:12,fontWeight:700,whiteSpace:"nowrap",
    color:v<0?"#fff":(v===0?C.dim:C.text),background:v<0?C.red:"transparent"});

  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:12}}>
      <h2 style={{margin:0,fontSize:22,fontWeight:800}}>📈 Cashflow</h2>
      <label title="Spořicí účty dětí s vázanými penězi z příspěvků na péči" style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",background:zahrnoutDeti?C.accentS:C.surface,border:`1px solid ${zahrnoutDeti?C.accent:C.border}`,borderRadius:10,padding:"7px 12px"}}>
        <input type="checkbox" checked={zahrnoutDeti} onChange={e=>setZahrnoutDeti(e.target.checked)}/>
        <span style={{fontSize:12,fontWeight:700,color:zahrnoutDeti?C.accent:C.muted}}>👶 Zahrnout dětské svaté účty</span>
      </label>
    </div>

    <div style={{display:"flex",gap:2,marginBottom:20,borderBottom:`2px solid ${C.border}`}}>
      {tabs.map(t=><button key={t.id} onClick={()=>setZalozka(t.id)} style={{padding:"9px 16px",border:"none",background:"none",cursor:"pointer",fontSize:13,fontWeight:700,color:zalozka===t.id?C.accent:C.muted,borderBottom:zalozka===t.id?`2px solid ${C.accent}`:"2px solid transparent",marginBottom:-2}}>{t.l}</button>)}
    </div>

    {/* ── PREDIKCE LIKVIDITY ── */}
    {zalozka==="likvidita"&&<div>
      {rizika.length>0&&<div style={{background:C.redS,border:`1px solid ${C.red}`,borderRadius:12,padding:"14px 18px",marginBottom:18}}>
        <div style={{fontWeight:800,color:C.red,fontSize:14,marginBottom:8}}>🔴 Hrozí záporný zůstatek — naplánuj převod!</div>
        <div style={{display:"flex",flexDirection:"column",gap:4}}>
          {rizika.map(r=><div key={r.ucet.id} style={{fontSize:13,color:C.text}}>
            <b>{r.ucet.nazev}</b> spadne na <b style={{color:C.red}}>{Math.round(r.stav).toLocaleString("cs")} Kč</b> v {MESICE[r.mesic.mesic-1]} {r.mesic.rok}.
          </div>)}
        </div>
      </div>}

      {simulace.length>0&&<div style={{background:C.blueS,border:`1px solid ${C.blue}`,borderRadius:12,padding:"12px 16px",marginBottom:14}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,flexWrap:"wrap",marginBottom:8}}>
          <div style={{fontWeight:800,color:C.blue,fontSize:13}}>🧪 Simulace — {simulace.length} hypotetický{simulace.length>1?"ch":""} převod{simulace.length>1?"ů":""} (neuloženo)</div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={async()=>{for(const t of simulace)await ulozPrevod(t);setSimulace([]);}} style={{...btnC(C.blue),padding:"5px 12px",fontSize:12}}>💾 Naplánovat vše</button>
            <button onClick={()=>setSimulace([])} style={{...btnC(C.muted,true),padding:"5px 12px",fontSize:12}}>Vyčistit</button>
          </div>
        </div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          {simulace.map((t,i)=><span key={i} style={{display:"inline-flex",alignItems:"center",gap:6,background:C.surface,border:`1px solid ${C.blue}`,borderRadius:20,padding:"3px 10px",fontSize:12,fontWeight:600}}>
            {ucetNazev(t.from)} → {ucetNazev(t.to)} · {Math.abs(+t.amount).toLocaleString("cs")} Kč · {MESICE[t.mesic-1].slice(0,3)} {String(t.rok).slice(2)}
            <button onClick={()=>setSimulace(s=>s.filter((_,j)=>j!==i))} style={{border:"none",background:"none",cursor:"pointer",color:C.red,fontWeight:800,fontSize:13,padding:0}}>✕</button>
          </span>)}
        </div>
      </div>}

      <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:14,flexWrap:"wrap"}}>
        <span style={{fontSize:12,fontWeight:700,color:C.muted}}>Horizont:</span>
        {[3,6,12].map(h=><button key={h} onClick={()=>setHorizont(h)} style={{...btnC(horizont===h?C.accent:C.muted,horizont!==h),padding:"4px 12px",fontSize:12}}>{h} měsíců</button>)}
        <span style={{fontSize:11,color:C.dim,marginLeft:"auto"}}>💡 Klikni na buňku → „co kdyby" simulace převodu</span>
      </div>

      <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,overflow:"hidden"}}>
        <div style={{padding:"12px 18px",borderBottom:`1px solid ${C.border}`,fontWeight:700,fontSize:14}}>📊 Predikce zůstatků po účtech <span style={{fontWeight:400,color:C.dim,fontSize:12}}>(reálný stav + plán)</span></div>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",minWidth:640}}>
            <thead><tr style={{background:C.bg}}>
              <th style={{padding:"9px 12px",textAlign:"left",fontSize:11,fontWeight:700,color:C.muted,textTransform:"uppercase",position:"sticky",left:0,background:C.bg,whiteSpace:"nowrap"}}>Účet</th>
              <th style={{padding:"9px 10px",textAlign:"right",fontSize:11,fontWeight:700,color:C.muted,whiteSpace:"nowrap"}}>Teď</th>
              {sloupce.map((s,i)=><th key={i} style={{padding:"9px 10px",textAlign:"right",fontSize:11,fontWeight:700,color:C.muted,whiteSpace:"nowrap"}}>{s.label}</th>)}
            </tr></thead>
            <tbody>
              {uctyView.map((u,ui)=>{
                const pr=predikceUctu(u);
                return <tr key={u.id} style={{borderBottom:`1px solid ${C.border}`,background:ui%2===0?C.surface:"#fafbff"}}>
                  <td style={{padding:"8px 12px",fontWeight:600,fontSize:13,whiteSpace:"nowrap",position:"sticky",left:0,background:ui%2===0?C.surface:"#fafbff",borderRight:`1px solid ${C.border}`}}>{u.nazev}{u.typ==="deti"?" 👶":""}</td>
                  <td style={{padding:"8px 10px",textAlign:"right",fontSize:12,fontWeight:700,color:C.muted,whiteSpace:"nowrap"}}>{Math.round(latestStav(u.id)).toLocaleString("cs")}</td>
                  {pr.map((v,i)=><td key={i} onClick={()=>setSim({u,idx:i})} title="Klikni pro simulaci převodu" style={{...cellStav(v),cursor:"pointer"}}>{Math.round(v).toLocaleString("cs")}{v<0?" ⚠":""}</td>)}
                </tr>;
              })}
              <tr style={{background:C.bg,borderTop:`2px solid ${C.border}`}}>
                <td style={{padding:"9px 12px",fontWeight:800,fontSize:13,position:"sticky",left:0,background:C.bg,borderRight:`1px solid ${C.border}`}}>CELKEM</td>
                <td style={{padding:"9px 10px",textAlign:"right",fontWeight:800,fontSize:12,color:C.green,whiteSpace:"nowrap"}}>{Math.round(uctyView.reduce((a,u)=>a+latestStav(u.id),0)).toLocaleString("cs")}</td>
                {sloupce.map((s,i)=>{
                  const suma=uctyView.reduce((a,u)=>a+predikceUctu(u)[i],0);
                  return <td key={i} style={{padding:"9px 10px",textAlign:"right",fontWeight:800,fontSize:12,color:suma<0?C.red:C.green,whiteSpace:"nowrap"}}>{Math.round(suma).toLocaleString("cs")}</td>;
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div style={{fontSize:11,color:C.dim,marginTop:8}}>Predikce = poslední reálný zůstatek z modulu Finance (Realita) + naplánované položky a převody pro daný měsíc. Záporné buňky svítí červeně.</div>

      {sim&&<CashflowSimulator
        sim={sim} sloupce={sloupce} uctyView={uctyView}
        predikceUctuRaw={predikceUctuRaw} ucetNazev={ucetNazev}
        onClose={()=>setSim(null)}
        onAddSim={(t)=>{setSimulace(s=>[...s,t]);setSim(null);}}
        onPlan={async(t)=>{await ulozPrevod(t);setSim(null);}}
      />}
    </div>}

    {/* ── PLÁN MĚSÍCE ── */}
    {zalozka==="plan"&&<div>
      <style>{`
        .cfp-cards{ display:grid; grid-template-columns:repeat(3,1fr); gap:12px; margin-bottom:20px; }
        .cfp-card-l{ font-size:11.5px; }
        .cfp-card-v{ font-size:20px; }
        .cfp-row{ display:flex; align-items:center; gap:12px; padding:13px 16px; flex-wrap:wrap; }
        .cfp-main{ flex:1 1 auto; min-width:150px; }
        .cfp-name{ font-weight:600; font-size:15.5px; line-height:1.3; }
        .cfp-meta{ display:flex; align-items:center; gap:7px; flex-wrap:wrap; margin-top:3px; }
        .cfp-right{ display:flex; align-items:center; gap:8px; margin-left:auto; }
        .cfp-amt{ font-weight:800; font-size:16.5px; white-space:nowrap; }
        .cfp-chip{ font-size:12px; font-weight:700; border-radius:20px; padding:2px 9px; white-space:nowrap; display:inline-flex; align-items:center; gap:4px; }
        .cfp-sec{ font-size:14px; font-weight:700; margin-bottom:9px; }
        @media (max-width:560px){
          .cfp-cards{ gap:8px; }
          .cfp-card-v{ font-size:17px; }
          .cfp-card-l{ font-size:10px; letter-spacing:.3px; }
          .cfp-name{ font-size:16px; }
          .cfp-amt{ font-size:18px; }
          .cfp-row{ padding:14px 13px; gap:9px 10px; }
        }
      `}</style>

      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:10}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <button onClick={()=>{if(mesic===1){setMesic(12);setRok(r=>r-1);}else setMesic(m=>m-1);}} style={{...btnC(C.muted,true),padding:"6px 12px"}}>←</button>
          <div style={{fontWeight:800,fontSize:18,minWidth:140,textAlign:"center"}}>{MESICE[mesic-1]} {rok}</div>
          <button onClick={()=>{if(mesic===12){setMesic(1);setRok(r=>r+1);}else setMesic(m=>m+1);}} style={{...btnC(C.muted,true),padding:"6px 12px"}}>→</button>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={kopirujMesic} disabled={zamceno} title={zamceno?"Uplynulý měsíc je zamčený":""} style={{...btnC(C.muted,true),fontSize:12,padding:"6px 12px",opacity:zamceno?.5:1,cursor:zamceno?"not-allowed":"pointer"}}>📋 Kopírovat →</button>
          <button onClick={()=>setModal("nova")} disabled={zamceno} style={{...btnC(),opacity:zamceno?.5:1,cursor:zamceno?"not-allowed":"pointer"}}>+ Přidat položku</button>
        </div>
      </div>

      {jeMinuly&&(
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap",background:zamceno?C.accentS:C.redS,border:`1px solid ${zamceno?C.accent:C.red}`,borderRadius:10,padding:"10px 14px",marginBottom:16}}>
          <div style={{fontSize:12.5,fontWeight:600,color:zamceno?C.accent:C.red}}>
            {zamceno
              ? "🔒 Uplynulý měsíc — plán je zamčený jako otisk pro zpětné porovnání s realitou."
              : "🔓 Uplynulý měsíc odemčen — úpravy teď přepíšou historický otisk plánu. Po dokončení zase zamkni."}
          </div>
          <button onClick={()=>setOdemcenyMesic(zamceno?`${rok}-${mesic}`:"")} style={{...btnC(zamceno?C.accent:C.red,true),fontSize:12,padding:"6px 12px",whiteSpace:"nowrap"}}>{zamceno?"🔓 Přesto upravit":"🔒 Zamknout"}</button>
        </div>
      )}

      {/* Filtry: účet + kategorie */}
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:18,flexWrap:"wrap"}}>
        <label style={{fontSize:13,fontWeight:700,color:C.muted}}>🏦 Účet:</label>
        <select value={filtrUcet} onChange={e=>setFiltrUcet(e.target.value)} style={{...inp,flex:"1 1 160px",maxWidth:240,fontSize:14,padding:"0 12px",height:44,borderRadius:10}}>
          <option value="">Všechny účty</option>
          {uctyView.map(u=><option key={u.id} value={u.id}>{u.nazev}</option>)}
        </select>
        <label style={{fontSize:13,fontWeight:700,color:C.muted}}>🏷️ Kategorie:</label>
        <select value={filtrKat} onChange={e=>setFiltrKat(e.target.value)} style={{...inp,flex:"1 1 160px",maxWidth:240,fontSize:14,padding:"0 12px",height:44,borderRadius:10}}>
          <option value="">Všechny kategorie</option>
          <optgroup label="Příjmy">{(kategorie||[]).filter(k=>k.typ==="prijem").map(k=><option key={k.id} value={k.id}>{k.emoji} {k.nazev}</option>)}</optgroup>
          <optgroup label="Výdaje">{(kategorie||[]).filter(k=>k.typ==="vydaj").map(k=><option key={k.id} value={k.id}>{k.emoji} {k.nazev}</option>)}</optgroup>
        </select>
        {(filtrAktivni||filtrKatAktivni)&&<button onClick={()=>{setFiltrUcet("");setFiltrKat("");}} style={{...btnC(C.muted,true),fontSize:12,padding:"8px 12px"}}>✕ Zrušit filtry</button>}
      </div>

      <div className="cfp-cards">
        {[
          {l:filtrAktivni?"Přijde na účet":"Plánované příjmy",v:`${prijmy.toLocaleString("cs")} Kč`,c:C.green},
          {l:filtrAktivni?"Odejde z účtu":"Plánované výdaje",v:`${vydaje.toLocaleString("cs")} Kč`,c:C.red},
          {l:filtrAktivni?"Čistá změna":"Bilance",v:`${(prijmy-vydaje>0?"+":"")}${(prijmy-vydaje).toLocaleString("cs")} Kč`,c:prijmy>=vydaje?C.green:C.red},
        ].map(k=><div key={k.l} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"14px 16px",borderTop:`3px solid ${k.c}`}}>
          <div className="cfp-card-l" style={{fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:.5,marginBottom:4}}>{k.l}</div>
          <div className="cfp-card-v" style={{fontWeight:800,color:k.c}}>{k.v}</div>
        </div>)}
      </div>

      {[{label:"📥 Příjmy",arr:bezneF.filter(p=>+(p.castka)>0)},{label:"📤 Výdaje",arr:bezneF.filter(p=>+(p.castka)<0)}].map(({label,arr})=>{
        const polozky=[...arr].sort((a,b)=>Math.abs(+(b.castka))-Math.abs(+(a.castka)));
        return <div key={label} style={{marginBottom:20}}>
          <div className="cfp-sec" style={{color:C.muted}}>{label} ({polozky.length})</div>
          {polozky.length===0?<div style={{padding:"13px 16px",color:C.dim,fontSize:14,background:C.surface,border:`1px solid ${C.border}`,borderRadius:12}}>Žádné položky{filtrAktivni?` na účtu ${ucetNazev(filtrUcet)}`:""}</div>:
          <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,overflow:"hidden"}}>
            {polozky.map((p,i)=>{
              const kat=(kategorie||[]).find(k=>k.id===p.kategorie_id);
              const vi=cashflowVazbaInfo(p,{deti,zvirata,opravy,auta,skladKat});
              const kladna=+(p.castka)>0;
              return <div key={p.id} className="cfp-row" style={{borderBottom:i<polozky.length-1?`1px solid ${C.border}`:"none"}}>
                <span style={{fontSize:20}}>{kat?.emoji||"💰"}</span>
                <div className="cfp-main">
                  <div className="cfp-name">{p.nazev}</div>
                  <div className="cfp-meta">
                    {p.ucet_id
                      ? <span className="cfp-chip" style={{color:C.blue,background:C.blueS}}>🏦 {ucetNazev(p.ucet_id)}</span>
                      : <span className="cfp-chip" style={{color:C.red,background:C.redS||"#fdecec",border:`1px solid ${C.red}`}}>⚠ bez účtu</span>}
                    {kat&&<span style={{fontSize:12,color:C.muted}}>{kat.nazev}</span>}
                    {vi&&<span className="cfp-chip" style={{background:`${vi.color}1a`,color:vi.color}}>{vi.emoji} {vi.label}</span>}
                    {p.opakovani!=="jednorazove"&&<span className="cfp-chip" style={{background:C.accentS,color:C.accent}}>🔄 {p.opakovani==="mesicni"?"měsíčně":"ročně"}</span>}
                  </div>
                </div>
                <div className="cfp-right">
                  <div className="cfp-amt" style={{color:kladna?C.green:C.red}}>{kladna?"+":""}{(+p.castka).toLocaleString("cs")} Kč</div>
                  <button onClick={()=>setModal(p)} disabled={zamceno} style={{...btnC(C.accent,true),padding:"6px 10px",fontSize:13,opacity:zamceno?.45:1,cursor:zamceno?"not-allowed":"pointer"}}>✏</button>
                  <button onClick={()=>smaz(p.id)} disabled={zamceno} style={{...btnC(C.red,true),padding:"6px 10px",fontSize:13,opacity:zamceno?.45:1,cursor:zamceno?"not-allowed":"pointer"}}>🗑</button>
                </div>
              </div>;
            })}
          </div>}
        </div>;
      })}

      {/* Plánované převody mezi účty */}
      <div style={{marginBottom:20}}>
        <div className="cfp-sec" style={{color:C.muted}}>↔️ {filtrAktivni?`Převody týkající se účtu ${ucetNazev(filtrUcet)}`:"Plánované převody mezi účty"} ({prevodyF.length})</div>
        {prevodyF.length===0?<div style={{padding:"13px 16px",color:C.dim,fontSize:14,background:C.surface,border:`1px solid ${C.border}`,borderRadius:12}}>{filtrAktivni?`Žádné převody na účtu ${ucetNazev(filtrUcet)}.`:"Žádné plánované převody — přidej je tlačítkem + Přidat položku a zvol typ Převod."}</div>:
        <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,overflow:"hidden"}}>
          {prevodyF.map((p,i)=>{
            // Směr vůči vybranému účtu (při filtru): odchozí = úbytek, příchozí = přírůstek
            const odchozi=filtrAktivni&&naUcte(p);
            const prichozi=filtrAktivni&&naUcteCil(p);
            const amtColor=odchozi?C.red:prichozi?C.green:C.blue;
            const amtPrefix=odchozi?"−":prichozi?"+":"";
            const smer=odchozi?`→ ${ucetNazev(p.prevod_ucet_id)}`
              :prichozi?`← ${ucetNazev(p.ucet_id)}`
              :`${ucetNazev(p.ucet_id)} → ${ucetNazev(p.prevod_ucet_id)}`;
            return <div key={p.id} className="cfp-row" style={{borderBottom:i<prevodyF.length-1?`1px solid ${C.border}`:"none"}}>
              <span style={{fontSize:20}}>{odchozi?"📤":prichozi?"📥":"↔️"}</span>
              <div className="cfp-main">
                <div className="cfp-name">{p.nazev}</div>
                <div className="cfp-meta"><span className="cfp-chip" style={{color:amtColor,background:`${amtColor}14`}}>🏦 {smer}</span></div>
              </div>
              <div className="cfp-right">
                <div className="cfp-amt" style={{color:amtColor}}>{amtPrefix}{Math.abs(+p.castka).toLocaleString("cs")} Kč</div>
                <button onClick={()=>setModal(p)} disabled={zamceno} style={{...btnC(C.accent,true),padding:"6px 10px",fontSize:13,opacity:zamceno?.45:1,cursor:zamceno?"not-allowed":"pointer"}}>✏</button>
                <button onClick={()=>smaz(p.id)} disabled={zamceno} style={{...btnC(C.red,true),padding:"6px 10px",fontSize:13,opacity:zamceno?.45:1,cursor:zamceno?"not-allowed":"pointer"}}>🗑</button>
              </div>
            </div>;
          })}
        </div>}
      </div>
    </div>}

    {/* ── PLÁN vs. REALITA ── */}
    {zalozka==="realita"&&(()=>{
      const fmtS=(v)=>`${v>0?"+":""}${Math.round(v).toLocaleString("cs")} Kč`;
      const fmt=(v)=>`${Math.round(v).toLocaleString("cs")} Kč`;
      const rozdilBarva=(v)=>v>0?C.green:v<0?C.red:C.dim;
      const th={padding:"10px 12px",textAlign:"right",fontSize:12,fontWeight:800,color:C.muted,textTransform:"uppercase",letterSpacing:.4,whiteSpace:"nowrap",borderBottom:`2px solid ${C.border}`};
      const thL={...th,textAlign:"left"};
      const td={padding:"11px 12px",textAlign:"right",fontSize:14,fontWeight:700,whiteSpace:"nowrap"};
      const tdL={...td,textAlign:"left",fontWeight:600};

      const planM=(plan||[]).filter(p=>p.rok===rok&&p.mesic===mesic&&(zahrnoutDeti||!jeDetskyUcet(p.ucet_id,detiSet)));
      const trans=(transMesic||[]).filter(t=>zahrnoutDeti||!jeDetskyUcet(t.ucet_id,detiSet));
      const planBezne=planM.filter(p=>!jePrevodP(p));
      const transBezne=trans.filter(t=>!t.prevod_ucet_id);

      // Souhrny
      const pPrijmy=planBezne.filter(p=>+p.castka>0).reduce((a,p)=>a+(+p.castka),0);
      const pVydaje=planBezne.filter(p=>+p.castka<0).reduce((a,p)=>a+Math.abs(+p.castka),0);
      const rPrijmy=transBezne.filter(t=>+t.castka>0).reduce((a,t)=>a+(+t.castka),0);
      const rVydaje=transBezne.filter(t=>+t.castka<0).reduce((a,t)=>a+Math.abs(+t.castka),0);
      const souhrn=[
        {l:"Příjmy",  plan:pPrijmy, real:rPrijmy, vetsiLepsi:true},
        {l:"Výdaje",  plan:pVydaje, real:rVydaje, vetsiLepsi:false},
        {l:"Bilance", plan:pPrijmy-pVydaje, real:rPrijmy-rVydaje, vetsiLepsi:true},
      ];

      // Po kategoriích (bez převodů)
      const katMap={};
      const pridej=(kid,key,val)=>{const k=kid==null?"none":String(kid);(katMap[k]=katMap[k]||{plan:0,real:0})[key]+=val;};
      planBezne.forEach(p=>pridej(p.kategorie_id,"plan",+p.castka));
      transBezne.forEach(t=>pridej(t.kategorie_id,"real",+t.castka));
      const katRadky=Object.entries(katMap).map(([k,v])=>{
        const kat=k==="none"?null:(kategorie||[]).find(x=>String(x.id)===k);
        return {id:k, nazev:kat?`${kat.emoji} ${kat.nazev}`:"❔ Nezařazeno", plan:v.plan, real:v.real, rozdil:v.real-v.plan};
      }).sort((a,b)=>Math.max(Math.abs(b.plan),Math.abs(b.real))-Math.max(Math.abs(a.plan),Math.abs(a.real)));

      // Po účtech: plánovaná vs skutečná změna + reálný zůstatek (fin_stavy)
      const realDelta=(ucetId)=>{let d=0;trans.forEach(t=>{if(t.prevod_ucet_id){const amt=Math.abs(+t.castka);if(String(t.ucet_id)===String(ucetId))d-=amt;if(String(t.prevod_ucet_id)===String(ucetId))d+=amt;}else if(String(t.ucet_id)===String(ucetId)){d+=(+t.castka);}});return d;};
      const realStav=(ucetId)=>{const s=(stavy||[]).find(x=>String(x.ucet_id)===String(ucetId)&&x.rok===rok&&x.mesic===mesic);return s?+s.stav:null;};
      const uctRadky=uctyView.map(u=>{
        const pd=planDelta(u.id,rok,mesic), rd=realDelta(u.id), rs=realStav(u.id);
        return {u, pd, rd, rozdil:rd-pd, rs};
      }).filter(r=>r.pd!==0||r.rd!==0||r.rs!=null);

      const prazdno=planM.length===0&&trans.length===0;

      return <div>
        {/* Navigace měsíce */}
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:18,flexWrap:"wrap"}}>
          <button onClick={()=>{if(mesic===1){setMesic(12);setRok(r=>r-1);}else setMesic(m=>m-1);}} style={{...btnC(C.muted,true),padding:"6px 12px"}}>←</button>
          <div style={{fontWeight:800,fontSize:18,minWidth:140,textAlign:"center"}}>{MESICE[mesic-1]} {rok}</div>
          <button onClick={()=>{if(mesic===12){setMesic(1);setRok(r=>r+1);}else setMesic(m=>m+1);}} style={{...btnC(C.muted,true),padding:"6px 12px"}}>→</button>
          <div style={{fontSize:12,color:C.dim,marginLeft:6}}>Plán z „Plánu měsíce" vs. reálné transakce daného měsíce.</div>
        </div>

        {transMesic===null?<Spinner/>:prazdno?(
          <div style={{padding:"16px 18px",color:C.dim,fontSize:14,background:C.surface,border:`1px solid ${C.border}`,borderRadius:12}}>
            Za {MESICE[mesic-1]} {rok} zatím není co porovnávat — chybí plán i reálné transakce.
          </div>
        ):<>
          {/* Souhrnné karty */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:12,marginBottom:22}}>
            {souhrn.map(s=>{
              const rozdil=s.real-s.plan;
              const dobre=s.vetsiLepsi?rozdil>=0:rozdil<=0;
              const barva=rozdil===0?C.dim:(dobre?C.green:C.red);
              return <div key={s.l} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"14px 16px",borderTop:`3px solid ${barva}`}}>
                <div style={{fontSize:11.5,fontWeight:800,color:C.muted,textTransform:"uppercase",letterSpacing:.5,marginBottom:8}}>{s.l}</div>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:12.5,color:C.muted,marginBottom:2}}><span>Plán</span><b style={{color:C.text}}>{fmt(s.plan)}</b></div>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:12.5,color:C.muted,marginBottom:6}}><span>Skutečnost</span><b style={{color:C.text}}>{fmt(s.real)}</b></div>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:14,fontWeight:800,borderTop:`1px solid ${C.border}`,paddingTop:6,color:barva}}><span>Rozdíl</span><span>{fmtS(rozdil)}</span></div>
              </div>;
            })}
          </div>

          {/* Přepínač pohledu */}
          <div style={{display:"flex",gap:6,marginBottom:16,background:C.bg,border:`1px solid ${C.border}`,borderRadius:10,padding:4,maxWidth:340}}>
            {[{k:"ucty",l:"🏦 Podle účtů"},{k:"kategorie",l:"🏷️ Podle kategorií"}].map(o=>
              <button key={o.k} onClick={()=>setRealitaPohled(o.k)} style={{flex:1,padding:"8px 10px",border:"none",borderRadius:7,cursor:"pointer",fontSize:13,fontWeight:700,background:realitaPohled===o.k?C.accent:"transparent",color:realitaPohled===o.k?"#fff":C.muted,transition:"all .15s"}}>{o.l}</button>
            )}
          </div>

          {realitaPohled==="kategorie" ? <>
          {/* Po kategoriích */}
          <div className="cfp-sec" style={{fontSize:14,fontWeight:700,color:C.muted,marginBottom:9}}>🏷️ Po kategoriích ({katRadky.length})</div>
          <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,overflow:"hidden",marginBottom:10}}>
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",minWidth:440}}>
                <thead><tr><th style={thL}>Kategorie</th><th style={th}>Plán</th><th style={th}>Skutečnost</th><th style={th}>Rozdíl</th></tr></thead>
                <tbody>
                  {katRadky.length===0?<tr><td colSpan={4} style={{...tdL,color:C.dim}}>Žádné položky.</td></tr>:
                   katRadky.map((r,i)=><tr key={r.id} style={{borderBottom:i<katRadky.length-1?`1px solid ${C.border}`:"none"}}>
                    <td style={tdL}>{r.nazev}</td>
                    <td style={{...td,color:C.muted}}>{fmtS(r.plan)}</td>
                    <td style={td}>{fmtS(r.real)}</td>
                    <td style={{...td,fontWeight:800,color:rozdilBarva(r.rozdil)}}>{fmtS(r.rozdil)}</td>
                  </tr>)}
                </tbody>
              </table>
            </div>
          </div>
          <div style={{fontSize:11.5,color:C.dim,marginTop:0,marginBottom:8,lineHeight:1.5}}>
            Skutečnost se počítá z reálných transakcí (modul Finance) za tento měsíc — dokud je nemáš zadané, bude u většiny kategorií 0.
          </div>
          </> : <>
          {/* Po účtech */}
          <div className="cfp-sec" style={{fontSize:14,fontWeight:700,color:C.muted,marginBottom:9}}>🏦 Po účtech — jak se lišila změna zůstatku ({uctRadky.length})</div>
          <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,overflow:"hidden"}}>
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",minWidth:560}}>
                <thead><tr><th style={thL}>Účet</th><th style={th}>Plánovaná změna</th><th style={th}>Skutečná změna</th><th style={th}>Rozdíl</th><th style={th}>Reálný zůstatek</th></tr></thead>
                <tbody>
                  {uctRadky.length===0?<tr><td colSpan={5} style={{...tdL,color:C.dim}}>Žádný pohyb na účtech.</td></tr>:
                   uctRadky.map((r,i)=><tr key={r.u.id} style={{borderBottom:i<uctRadky.length-1?`1px solid ${C.border}`:"none"}}>
                    <td style={tdL}>🏦 {r.u.nazev}</td>
                    <td style={{...td,color:C.muted}}>{fmtS(r.pd)}</td>
                    <td style={td}>{fmtS(r.rd)}</td>
                    <td style={{...td,fontWeight:800,color:rozdilBarva(r.rozdil)}}>{fmtS(r.rozdil)}</td>
                    <td style={{...td,color:r.rs==null?C.dim:C.text}}>{r.rs==null?"— nezadáno":fmt(r.rs)}</td>
                  </tr>)}
                </tbody>
              </table>
            </div>
          </div>
          <div style={{fontSize:11.5,color:C.dim,marginTop:10,lineHeight:1.5}}>
            „Rozdíl" = skutečnost − plán; zelená = lepší pro bilanci, červená = horší. Převody mezi tvými účty se do příjmů/výdajů nezapočítávají. „Reálný zůstatek" bereme z dohraných stavů účtů (fin_stavy) za tento měsíc.
          </div>
          </>}
        </>}
      </div>;
    })()}

    {modal&&<CashflowModal
      polozka={modal==="nova"?null:modal}
      defaultRok={rok} defaultMesic={mesic}
      onClose={()=>setModal(null)}
      onSaved={()=>{setModal(null);reloadPlan();}}
    />}
  </div>;
}


// ══════════════════════════════════════════════════════════════════════════════
// DŮM
// ══════════════════════════════════════════════════════════════════════════════
function OpravaModal({oprava,onClose,onSaved}){
  const isNew=!oprava;
  const [f,setF]=useState({nazev:oprava?.nazev||"",popis:oprava?.popis||"",stav:oprava?.stav||"plan",priorita:oprava?.priorita||"normal",datum_plan:oprava?.datum_plan||"",castka:oprava?.castka||""});
  const [saving,setSaving]=useState(false);const set=k=>e=>setF(p=>({...p,[k]:e.target.value}));
  const uloz=async()=>{if(!f.nazev.trim())return;setSaving(true);const data={...f,castka:f.castka?+f.castka:null,datum_plan:f.datum_plan||null};if(isNew)await sb.from("dum_opravy").insert(data);else await sb.from("dum_opravy").update(data).eq("id",oprava.id);setSaving(false);onSaved();};
  return <Modal title={isNew?"Nová oprava / úkol":"Upravit opravu"} onClose={onClose}>
    <Field label="Název"><input style={inp} value={f.nazev} onChange={set("nazev")} autoFocus onKeyDown={e=>e.key==="Enter"&&uloz()}/></Field>
    <Field label="Popis"><textarea style={{...inp,resize:"vertical",minHeight:60}} value={f.popis} onChange={set("popis")}/></Field>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
      <Field label="Stav"><select style={inp} value={f.stav} onChange={set("stav")}>{Object.entries(STAV_OPRAVY).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</select></Field>
      <Field label="Priorita"><select style={inp} value={f.priorita} onChange={set("priorita")}>{Object.entries(PRIORITA).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</select></Field>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
      <Field label="Plánované datum"><input style={inp} type="date" value={f.datum_plan} onChange={set("datum_plan")}/></Field>
      <Field label="Odhadovaná cena (Kč)"><input style={inp} type="number" value={f.castka} onChange={set("castka")} placeholder="0"/></Field>
    </div>
    <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:6}}><button onClick={onClose} style={btnC(C.muted,true)}>Zrušit</button><button onClick={uloz} disabled={saving} style={btnC()}>{saving?"…":"Uložit"}</button></div>
  </Modal>;
}

function DumTab(){
  const {data:opravy,loading,reload}=useData(()=>sb.from("dum_opravy").select("*").order("stav").order("datum_plan"));
  const {data:cfDum,reload:reloadCf}=useData(()=>sb.from("fin_cashflow_plan").select("id,oprava_id,castka").not("oprava_id","is",null));
  const [modal,setModal]=useState(null);
  const [finModal,setFinModal]=useState(null); // oprava → správa všech plateb
  const [platbaModal,setPlatbaModal]=useState(null); // oprava → rychlé zadání jedné platby
  const [dokModal,setDokModal]=useState(null); // oprava → dokumenty (faktury, revize)
  const cfMap={}; (cfDum||[]).forEach(p=>{if(p.oprava_id==null)return;const k=String(p.oprava_id);const m=cfMap[k]||{count:0,sum:0};m.count++;m.sum+=+p.castka;cfMap[k]=m;});
  // souhrn pro jednu opravu: kolik plateb, kolik reálně utraceno (net), odhad a zbytek
  const cfOpravy=(o)=>{const m=cfMap[String(o.id)];const count=m?m.count:0;const utraceno=m?-m.sum:0;const odhad=o.castka?+o.castka:0;return{count,utraceno,odhad,zbyva:odhad-utraceno};};
  const zmenStav=async(o,stav)=>{const upd={stav};if(stav==="hotovo")upd.datum_hotovo=new Date().toISOString().slice(0,10);await sb.from("dum_opravy").update(upd).eq("id",o.id);reload();};
  const smaz=async(o)=>{if(!confirm(`Smazat "${o.nazev}"?`))return;await sb.from("dum_opravy").delete().eq("id",o.id);reload();};
  if(loading)return <Spinner/>;
  const skupiny={probiha:(opravy||[]).filter(o=>o.stav==="probiha"),plan:(opravy||[]).filter(o=>o.stav==="plan"),hotovo:(opravy||[]).filter(o=>o.stav==="hotovo")};
  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
      <div style={{color:C.text,fontWeight:800,fontSize:17}}>🔧 Dům a opravy</div>
      <button onClick={()=>setModal("new")} style={btnC()}>+ Přidat opravu</button>
    </div>
    {Object.entries(skupiny).map(([stav,items])=>items.length===0?null:(
      <div key={stav} style={{marginBottom:20}}>
        <div style={{fontSize:12,fontWeight:700,letterSpacing:.7,textTransform:"uppercase",color:STAV_OPRAVY[stav].color,marginBottom:8}}>{STAV_OPRAVY[stav].label} ({items.length})</div>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {items.map(o=>(
            <div key={o.id} style={{background:C.surface,border:`1px solid ${STAV_OPRAVY[o.stav].color}44`,borderRadius:12,padding:"12px 16px",borderLeft:`4px solid ${STAV_OPRAVY[o.stav].color}`}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4,flexWrap:"wrap"}}>
                <span style={{fontWeight:700,fontSize:14,color:C.text,flex:1}}>{o.nazev}</span>
                <Tag color={PRIORITA[o.priorita]?.color||C.dim}>{PRIORITA[o.priorita]?.label}</Tag>
              </div>
              {o.popis&&<div style={{color:C.dim,fontSize:12,marginBottom:6}}>{o.popis}</div>}
              {o.datum_plan&&<div style={{color:C.muted,fontSize:12,marginBottom:8}}>📅 {new Date(o.datum_plan).toLocaleDateString("cs-CZ")}{o.datum_hotovo&&` · ✓ ${new Date(o.datum_hotovo).toLocaleDateString("cs-CZ")}`}</div>}
              {(()=>{const{count,utraceno,odhad,zbyva}=cfOpravy(o);if(count===0&&!odhad)return null;return (
                <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap",background:C.bg,borderRadius:8,padding:"8px 12px",marginBottom:8,fontSize:12}}>
                  {odhad>0&&<span style={{color:C.muted}}>Odhad: <b style={{color:C.text}}>{fmt(odhad)}</b></span>}
                  <span style={{color:C.muted}}>Skutečnost ({count}×): <b style={{color:utraceno>0?C.red:C.text}}>{fmt(utraceno)}</b></span>
                  {odhad>0&&(zbyva<0
                    ? <Tag color={C.red}>⚠ Přešvihnuto o {fmt(-zbyva)}</Tag>
                    : <Tag color={C.green}>Zbývá {fmt(zbyva)}</Tag>)}
                </div>
              );})()}
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {o.stav==="plan"&&<button onClick={()=>zmenStav(o,"probiha")} style={{...btnC(C.orange),padding:"4px 10px",fontSize:12}}>▶ Zahájit</button>}
                {o.stav!=="hotovo"&&<button onClick={()=>zmenStav(o,"hotovo")} style={{...btnC(C.green),padding:"4px 10px",fontSize:12}}>✓ Hotovo</button>}
                <button onClick={()=>setPlatbaModal(o)} style={{...btnC(C.red),padding:"4px 10px",fontSize:12}}>💸 Zadat platbu</button>
                <button onClick={()=>setFinModal(o)} style={{...btnC(C.purple,true),padding:"4px 10px",fontSize:12}}>💰 Finance{cfOpravy(o).count?` (${cfOpravy(o).count})`:""}</button>
                <button onClick={()=>setDokModal(o)} style={{...btnC(C.blue,true),padding:"4px 10px",fontSize:12}}>📁 Dokumenty</button>
                <button onClick={()=>setModal(o)} style={{...btnC(C.muted,true),padding:"4px 10px",fontSize:12}}>✎ Upravit</button>
                <button onClick={()=>smaz(o)} style={{...btnC(C.red,true),padding:"4px 10px",fontSize:12}}>✕</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    ))}
    {(opravy||[]).length===0&&<EmptyState emoji="🔧" text="Žádné opravy v plánu" action="Přidat první opravu" onAction={()=>setModal("new")}/>}
    {modal==="new"&&<OpravaModal onClose={()=>setModal(null)} onSaved={()=>{setModal(null);reload();}}/>}
    {modal&&modal!=="new"&&<OpravaModal oprava={modal} onClose={()=>setModal(null)} onSaved={()=>{setModal(null);reload();}}/>}
    {finModal&&<Modal title={`💰 Finance — ${finModal.nazev}`} onClose={()=>{setFinModal(null);reloadCf();}} width={520}>
      <EntityFinancePanel sloupec="oprava_id" id={finModal.id} lock={{oprava_id:finModal.id}} nadpis="Napojené platby (záloha, materiál, doplatek…)" novaDefault={{nazev:`Oprava: ${finModal.nazev}`,castka:cfOpravy(finModal).zbyva>0?-cfOpravy(finModal).zbyva:""}}/>
    </Modal>}
    {platbaModal&&<CashflowModal
      lock={{oprava_id:platbaModal.id}}
      defaultNazev={`Oprava: ${platbaModal.nazev}`}
      defaultCastka={cfOpravy(platbaModal).zbyva>0?-cfOpravy(platbaModal).zbyva:""}
      onClose={()=>setPlatbaModal(null)}
      onSaved={()=>{setPlatbaModal(null);reloadCf();reload();}}
    />}
    {dokModal&&<Modal title={`📁 Dokumenty — ${dokModal.nazev}`} onClose={()=>setDokModal(null)} width={560}>
      <EntityDokumentyPanel lockVazba={`oprava:${dokModal.id}`} nadpis="Faktury, revize, záruky"/>
    </Modal>}
  </div>;
}


// ══════════════════════════════════════════════════════════════════════════════
// MODUL: DOKUMENTY (Centrální kartotéka)
// Vlož tyto bloky do App.jsx mezi ostatní top-level komponenty (pořadí nehraje
// roli — jde o function declarations, takže jsou hoistované).
// Závisí na existujících: C, sb, useData, Modal, Field, Tag, Spinner, inp, btnC, useState.
// ══════════════════════════════════════════════════════════════════════════════

// ── Synology NAS (WebDAV) — úložiště fyzických souborů ────────────────────────
// Soubory leží na NASu; v Supabase držíme jen relativní cestu v poli `soubor_url`.
//
// ⚠️ BEZPEČNOST: Vite zapéká VITE_* proměnné do klientského bundlu. Pokud do
//    VITE_SYNOLOGY_WEBDAV_USER/PASS dáš reálné přihlašovací údaje, budou čitelné
//    v JS na frontendu. Pro produkci doporučuji nahrávat přes proxy / Supabase
//    Edge Function, kde údaje zůstanou na serveru. Níže je přímý WebDAV PUT dle
//    zadání — počítej i s CORS na straně NASu (povolit PUT z domény aplikace).
const SYNOLOGY_URL  = import.meta.env.VITE_SYNOLOGY_WEBDAV_URL || "";
const SYNOLOGY_USER = import.meta.env.VITE_SYNOLOGY_WEBDAV_USER || "";
const SYNOLOGY_PASS = import.meta.env.VITE_SYNOLOGY_WEBDAV_PASS || "";

// Nahraje soubor přes WebDAV PUT (Basic auth) a vrátí relativní cestu uloženou do DB.
async function nahrajNaSynology(file){
  if(!SYNOLOGY_URL) throw new Error("Chybí VITE_SYNOLOGY_WEBDAV_URL v prostředí.");
  const cisty = file.name.replace(/[^\w.\-]+/g,"_");
  const rel   = `${new Date().getFullYear()}/${Date.now()}_${cisty}`;     // relativní cesta v rámci WebDAV rootu
  const base  = SYNOLOGY_URL.replace(/\/+$/,"");
  const headers = {"Content-Type": file.type || "application/octet-stream"};
  if(SYNOLOGY_USER) headers["Authorization"] = "Basic " + btoa(`${SYNOLOGY_USER}:${SYNOLOGY_PASS}`);
  const res = await fetch(`${base}/${rel}`, {method:"PUT", headers, body:file});
  if(!res.ok) throw new Error(`Nahrání na NAS selhalo (HTTP ${res.status}).`);
  return rel;                                                              // do DB jde relativní cesta
}
// Sestaví plnou URL pro otevření souboru z relativní cesty.
function synologyHref(soubor_url){
  if(!soubor_url) return "#";
  if(/^https?:\/\//i.test(soubor_url)) return soubor_url;
  return `${SYNOLOGY_URL.replace(/\/+$/,"")}/${soubor_url.replace(/^\/+/,"")}`;
}

// ── Vazba dokumentu na entity (hybridní ID: deti=uuid, ostatní=bigint) ────────
const DOK_COLS = ["dite_id","zvire_id","auto_id","oprava_id","projekt_id","sklad_kategorie_id"];

// dokument → hodnota dropdownu "typ:id"
function dokVazbaZHodnoty(d){
  if(!d) return "";
  if(d.dite_id)            return "dite:"+d.dite_id;
  if(d.zvire_id)           return "zvire:"+d.zvire_id;
  if(d.auto_id)            return "auto:"+d.auto_id;
  if(d.oprava_id)          return "oprava:"+d.oprava_id;
  if(d.projekt_id)         return "projekt:"+d.projekt_id;
  if(d.sklad_kategorie_id) return "sklad:"+d.sklad_kategorie_id;
  return "";
}
// hodnota dropdownu → sloupce pro Supabase (ostatní null). ID posíláme jako STRING
// → PostgREST si je přetypuje na uuid i bigint (Number by u dětí dal NaN).
function dokVazbaNaSloupce(v){
  const base={dite_id:null,zvire_id:null,auto_id:null,oprava_id:null,projekt_id:null,sklad_kategorie_id:null};
  if(!v) return base;
  const i=v.indexOf(":"); const t=v.slice(0,i), id=v.slice(i+1);
  if(t==="dite")    return {...base,dite_id:id};
  if(t==="zvire")   return {...base,zvire_id:id};
  if(t==="auto")    return {...base,auto_id:id};
  if(t==="oprava")  return {...base,oprava_id:id};
  if(t==="projekt") return {...base,projekt_id:id};
  if(t==="sklad")   return {...base,sklad_kategorie_id:id};
  return base;
}
// dokument → {emoji,label,color} pro barevný Tag (nebo null). Porovnání tolerantní.
function dokVazbaInfo(d,z={}){
  const {deti,zvirata,auta,opravy,projekty,skladKat}=z;
  const eq=(a,b)=>String(a)===String(b);
  if(d.dite_id){const x=(deti||[]).find(e=>eq(e.id,d.dite_id));return{emoji:x?.emoji||"👤",label:x?.jmeno||"Osoba",color:x?.barva||C.blue};}
  if(d.zvire_id){const x=(zvirata||[]).find(e=>eq(e.id,d.zvire_id));return{emoji:x?.emoji||"🐾",label:x?.jmeno||"Zvíře",color:x?.barva||"#7a5c3a"};}
  if(d.auto_id){const x=(auta||[]).find(e=>eq(e.id,d.auto_id));return{emoji:"🚗",label:x?.nazev||x?.spz||"Auto",color:C.accent};}
  if(d.oprava_id){const x=(opravy||[]).find(e=>eq(e.id,d.oprava_id));return{emoji:"🔧",label:x?.nazev||"Oprava",color:C.orange};}
  if(d.projekt_id){const x=(projekty||[]).find(e=>eq(e.id,d.projekt_id));return{emoji:x?.emoji||"🏗",label:x?.nazev||"Projekt",color:x?.barva||C.purple};}
  if(d.sklad_kategorie_id){const x=(skladKat||[]).find(e=>eq(e.id,d.sklad_kategorie_id));return{emoji:x?.emoji||"📦",label:x?`Zboží · ${x.nazev}`:"Zboží / majetek",color:C.green};}
  return null;
}
// platnost_do → {dnu, stav, text, color} pro sloupec Platnost (nebo null)
function platnostInfo(platnost_do){
  if(!platnost_do) return null;
  const dnes=new Date(); dnes.setHours(0,0,0,0);
  const cil =new Date(platnost_do); cil.setHours(0,0,0,0);
  const dnu =Math.round((cil-dnes)/(1000*60*60*24));
  if(dnu<0)   return {dnu, stav:"expirovano", text:`⛔ Expirováno`,        color:C.red};
  if(dnu<=30) return {dnu, stav:"brzy",       text:`⚠ Vyprší za ${dnu} dní`, color:C.orange};
  return            {dnu, stav:"ok",         text:cil.toLocaleDateString("cs-CZ"), color:C.muted};
}

// Styl rychlého filtru (chip)
const dokChip=(active,color=C.accent)=>({
  padding:"5px 12px",borderRadius:20,border:`1px solid ${active?color:C.border}`,
  background:active?`${color}1a`:C.surface,color:active?color:C.muted,
  cursor:"pointer",fontSize:12,fontWeight:700,whiteSpace:"nowrap"
});

// Společné načtení všech entit pro vazební dropdown
function useDokZdroje(){
  const {data:deti}    =useData(()=>sb.from("deti").select("id,jmeno,emoji,barva,oficialni_jmeno,prijmeni").order("jmeno"));
  const {data:zvirata} =useData(()=>sb.from("zvirata").select("id,jmeno,emoji,barva").order("jmeno"));
  const {data:auta}    =useData(()=>sb.from("auta").select("id,nazev,spz").order("nazev"));
  const {data:opravy}  =useData(()=>sb.from("dum_opravy").select("id,nazev").order("nazev"));
  const {data:projekty}=useData(()=>sb.from("projekty").select("id,nazev,emoji,barva").order("nazev"));
  const {data:skladKat}=useData(()=>sb.from("sklad_kategorie").select("id,nazev,emoji").order("poradi"));
  const nacitam=[deti,zvirata,auta,opravy,projekty,skladKat].some(x=>x===null);
  return {deti,zvirata,auta,opravy,projekty,skladKat,nacitam};
}

// ── Univerzální modal pro nahrání / úpravu dokumentu ──────────────────────────
// lockVazba (volitelné): "dite:ID" | "zvire:ID" | "auto:ID" | "oprava:ID" | "projekt:ID" | "sklad:ID"
function DokumentModal({dokument,lockVazba,onClose,onSaved}){
  const {data:kategorie}=useData(()=>sb.from("dok_kategorie").select("*").order("nazev"));
  const z=useDokZdroje();
  const isNew=!dokument;
  const [f,setF]=useState({
    nazev:dokument?.nazev||"",
    popis:dokument?.popis||"",
    kategorie_id:dokument?.kategorie_id||"",
    datum_vystaveni:dokument?.datum_vystaveni||"",
    platnost_do:dokument?.platnost_do||"",
    vazba: dokument?dokVazbaZHodnoty(dokument):(lockVazba||""),
  });
  const [file,setFile]=useState(null);
  const [saving,setSaving]=useState(false);
  const [chyba,setChyba]=useState("");
  const set=k=>e=>setF(p=>({...p,[k]:e.target.value}));
  const nacitam=kategorie===null||z.nacitam;
  const lockInfo=lockVazba?dokVazbaInfo(dokVazbaNaSloupce(lockVazba),z):null;

  const uloz=async()=>{
    if(!f.nazev.trim()){setChyba("Vyplň název dokumentu.");return;}
    if(isNew&&!file){setChyba("Vyber soubor k nahrání.");return;}
    setSaving(true);setChyba("");
    try{
      let soubor_url=dokument?.soubor_url||null;
      if(file) soubor_url=await nahrajNaSynology(file);
      const data={
        nazev:f.nazev.trim(), popis:f.popis||null,
        kategorie_id:f.kategorie_id||null,
        datum_vystaveni:f.datum_vystaveni||null,
        platnost_do:f.platnost_do||null,
        soubor_url,
        ...dokVazbaNaSloupce(f.vazba),
      };
      if(isNew) await sb.from("dokumenty").insert(data);
      else await sb.from("dokumenty").update(data).eq("id",dokument.id);
      onSaved();
    }catch(e){ setChyba(e.message||"Nahrání se nezdařilo."); }
    finally{ setSaving(false); }
  };

  return <Modal title={isNew?"Nahrát dokument":"Upravit dokument"} onClose={onClose} width={480}>
    {nacitam?<Spinner/>:<div>
      <Field label="Název *"><input style={inp} value={f.nazev} onChange={set("nazev")} autoFocus placeholder="např. Cestovní pas, STK, Záruka pračka"/></Field>
      <Field label="Popis"><input style={inp} value={f.popis} onChange={set("popis")} placeholder="Volitelné…"/></Field>
      <Field label="Kategorie">
        <select style={inp} value={f.kategorie_id} onChange={set("kategorie_id")}>
          <option value="">— bez kategorie —</option>
          {(kategorie||[]).map(k=><option key={k.id} value={k.id}>{k.emoji} {k.nazev}</option>)}
        </select>
      </Field>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <Field label="Datum vystavení"><input style={inp} type="date" value={f.datum_vystaveni} onChange={set("datum_vystaveni")}/></Field>
        <Field label="Platnost do" hint="Pasy, STK, záruky…"><input style={inp} type="date" value={f.platnost_do} onChange={set("platnost_do")}/></Field>
      </div>

      {/* Vazba na entitu */}
      {lockInfo ? (
        <Field label="Komu / čemu patří" hint="Napevno — z detailu entity">
          <select style={{...inp,background:C.bg,cursor:"not-allowed",color:C.muted}} value={f.vazba} disabled>
            <option value={f.vazba}>{lockInfo.emoji} {lockInfo.label}</option>
          </select>
        </Field>
      ) : (
        <Field label="Komu / čemu patří (vazba)" hint="Volitelné">
          <select style={inp} value={f.vazba} onChange={set("vazba")}>
            <option value="">— bez vazby —</option>
            <optgroup label="👤 Rodina">{(z.deti||[]).map(d=><option key={d.id} value={"dite:"+d.id}>{d.emoji||"👤"} {d.jmeno}{[d.oficialni_jmeno,d.prijmeni].filter(Boolean).length?` — ${[d.oficialni_jmeno,d.prijmeni].filter(Boolean).join(" ")}`:""}</option>)}</optgroup>
            <optgroup label="🐾 Zvířata">{(z.zvirata||[]).map(x=><option key={x.id} value={"zvire:"+x.id}>{x.emoji||"🐾"} {x.jmeno}</option>)}</optgroup>
            <optgroup label="🚗 Auta">{(z.auta||[]).map(x=><option key={x.id} value={"auto:"+x.id}>🚗 {x.nazev}{x.spz?` · ${x.spz}`:""}</option>)}</optgroup>
            <optgroup label="🔧 Opravy">{(z.opravy||[]).map(x=><option key={x.id} value={"oprava:"+x.id}>{x.nazev}</option>)}</optgroup>
            <optgroup label="🏗 Projekty">{(z.projekty||[]).map(x=><option key={x.id} value={"projekt:"+x.id}>{x.emoji||"🏗"} {x.nazev}</option>)}</optgroup>
            <optgroup label="📦 Sklad / Zboží">{(z.skladKat||[]).map(x=><option key={x.id} value={"sklad:"+x.id}>{x.emoji} {x.nazev}</option>)}</optgroup>
          </select>
        </Field>
      )}

      {/* Soubor */}
      <Field label={isNew?"Soubor * (PDF / obrázek)":"Nahradit soubor (volitelné)"} hint={dokument?.soubor_url?"Prázdné = ponechat stávající soubor":"Uloží se na Synology NAS"}>
        <input style={{...inp,padding:"6px 8px"}} type="file" accept="application/pdf,image/*" onChange={e=>setFile(e.target.files&&e.target.files[0]||null)}/>
      </Field>
      {dokument?.soubor_url&&<div style={{fontSize:11,color:C.muted,marginTop:-8,marginBottom:12}}>Stávající: <a href={synologyHref(dokument.soubor_url)} target="_blank" rel="noreferrer" style={{color:C.accent}}>{dokument.soubor_url}</a></div>}

      {chyba&&<div style={{background:`${C.red}1a`,color:C.red,borderRadius:8,padding:"8px 12px",fontSize:12,marginBottom:12}}>{chyba}</div>}

      <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:6}}>
        <button onClick={onClose} style={btnC(C.muted,true)}>Zrušit</button>
        <button onClick={uloz} disabled={saving} style={btnC()}>{saving?"Nahrávám…":(isNew?"Nahrát":"Uložit")}</button>
      </div>
    </div>}
  </Modal>;
}

// ── Obousměrný panel pro detail entity ────────────────────────────────────────
// Použití: <EntityDokumentyPanel lockVazba={`dite:${clen.id}`} nadpis="Dokumenty — Honzík"/>
function EntityDokumentyPanel({lockVazba,nadpis}){
  const sl=dokVazbaNaSloupce(lockVazba);
  const sloupec=DOK_COLS.find(c=>sl[c]!=null);
  const hodnota=sloupec?sl[sloupec]:null;
  const {data:dokumenty,loading,reload}=useData(
    ()=> sloupec
      ? sb.from("dokumenty").select("*").eq(sloupec,hodnota).order("datum_vystaveni",{ascending:false})
      : sb.from("dokumenty").select("*").limit(0),
    [lockVazba]);
  const {data:kategorie}=useData(()=>sb.from("dok_kategorie").select("id,nazev,emoji,barva").order("nazev"));
  const [modal,setModal]=useState(null); // null | "new" | dokument
  const smaz=async(d)=>{if(!confirm(`Smazat dokument "${d.nazev}"?`))return;await sb.from("dokumenty").delete().eq("id",d.id);reload();};

  if(loading) return <Spinner/>;
  const docs=dokumenty||[];

  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
      <div style={{fontSize:12,fontWeight:700,color:C.muted}}>{nadpis||"Dokumenty"} ({docs.length})</div>
      <button onClick={()=>setModal("new")} style={{...btnC(),padding:"6px 12px",fontSize:12}}>+ Nahrát dokument</button>
    </div>

    {docs.length===0
      ? <div style={{padding:"24px 0",textAlign:"center",color:C.dim,fontSize:13}}>Zatím žádné dokumenty</div>
      : <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,overflow:"hidden"}}>
        {docs.map((d,i)=>{
          const kat=(kategorie||[]).find(k=>String(k.id)===String(d.kategorie_id));
          const pl=platnostInfo(d.platnost_do);
          return <div key={d.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderBottom:i<docs.length-1?`1px solid ${C.border}`:"none"}}>
            <span style={{fontSize:17}}>{kat?.emoji||"📄"}</span>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontWeight:600,fontSize:13,color:C.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{d.nazev}</div>
              <div style={{fontSize:11,color:C.muted}}>{kat?kat.nazev:"Bez kategorie"}{d.datum_vystaveni?` · ${new Date(d.datum_vystaveni).toLocaleDateString("cs-CZ")}`:""}</div>
            </div>
            {pl&&<span style={{fontSize:11,fontWeight:700,color:pl.color,whiteSpace:"nowrap"}}>{pl.stav==="ok"?`do ${pl.text}`:pl.text}</span>}
            {d.soubor_url&&<button onClick={()=>window.open(synologyHref(d.soubor_url),"_blank","noopener")} style={{...btnC(C.accent,true),padding:"3px 8px",fontSize:11}}>👁</button>}
            <button onClick={()=>setModal(d)} style={{...btnC(C.accent,true),padding:"3px 8px",fontSize:11}}>✏</button>
            <button onClick={()=>smaz(d)} style={{...btnC(C.red,true),padding:"3px 8px",fontSize:11}}>🗑</button>
          </div>;
        })}
      </div>}

    {modal&&<DokumentModal
      dokument={modal==="new"?null:modal}
      lockVazba={lockVazba}
      onClose={()=>setModal(null)}
      onSaved={()=>{setModal(null);reload();}}
    />}
  </div>;
}

// ── Hlavní dlaždice ───────────────────────────────────────────────────────────
function DokumentyTab(){
  const [zalozka,setZalozka]=useState("kartoteka");
  const tabs=[{id:"kartoteka",l:"📁 Kartotéka"},{id:"nastaveni",l:"⚙️ Nastavení kategorií"}];
  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
      <h2 style={{margin:0,fontSize:22,fontWeight:800}}>📁 Dokumenty</h2>
    </div>
    <div style={{display:"flex",gap:2,marginBottom:20,borderBottom:`2px solid ${C.border}`}}>
      {tabs.map(t=><button key={t.id} onClick={()=>setZalozka(t.id)} style={{padding:"9px 16px",border:"none",background:"none",cursor:"pointer",fontSize:13,fontWeight:700,color:zalozka===t.id?C.accent:C.muted,borderBottom:zalozka===t.id?`2px solid ${C.accent}`:"2px solid transparent",marginBottom:-2}}>{t.l}</button>)}
    </div>
    {zalozka==="kartoteka"&&<DokumentyKartoteka/>}
    {zalozka==="nastaveni"&&<DokKategorieNastaveni/>}
  </div>;
}

// ── Kartotéka (hledání + filtry + tabulka) ────────────────────────────────────
function DokumentyKartoteka(){
  const {data:dokumenty,loading,reload}=useData(()=>sb.from("dokumenty").select("*").order("datum_vystaveni",{ascending:false}));
  const {data:kategorie}=useData(()=>sb.from("dok_kategorie").select("*").order("nazev"));
  const z=useDokZdroje();
  const [hledat,setHledat]=useState("");
  const [filtrKat,setFiltrKat]=useState(null);
  const [modal,setModal]=useState(null); // null | "new" | dokument
  const smaz=async(d)=>{if(!confirm(`Smazat dokument "${d.nazev}"?`))return;await sb.from("dokumenty").delete().eq("id",d.id);reload();};

  if(loading||z.nacitam) return <Spinner/>;
  const docs=(dokumenty||[]).filter(d=>
    (!hledat || (d.nazev||"").toLowerCase().includes(hledat.toLowerCase())) &&
    (filtrKat==null || String(d.kategorie_id)===String(filtrKat))
  );

  return <div>
    <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"center",marginBottom:12}}>
      <input style={{...inp,maxWidth:300}} value={hledat} onChange={e=>setHledat(e.target.value)} placeholder="🔎 Hledat podle názvu…"/>
      <div style={{flex:1}}/>
      <button onClick={()=>setModal("new")} style={btnC()}>+ Nahrát dokument</button>
    </div>

    <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:16}}>
      <button onClick={()=>setFiltrKat(null)} style={dokChip(filtrKat==null)}>Vše</button>
      {(kategorie||[]).map(k=><button key={k.id} onClick={()=>setFiltrKat(k.id)} style={dokChip(String(filtrKat)===String(k.id),k.barva)}>{k.emoji} {k.nazev}</button>)}
    </div>

    {docs.length===0
      ? <div style={{padding:"36px 0",textAlign:"center",color:C.dim,fontSize:14}}>Žádné dokumenty neodpovídají filtru</div>
      : <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,overflow:"hidden",overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
          <thead>
            <tr style={{background:C.bg,textAlign:"left"}}>
              {["Název","Vystaveno","Kategorie","Vazba","Platnost",""].map((h,i)=>
                <th key={i} style={{padding:"10px 14px",fontSize:11,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:.5,whiteSpace:"nowrap"}}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {docs.map(d=>{
              const kat=(kategorie||[]).find(k=>String(k.id)===String(d.kategorie_id));
              const vi=dokVazbaInfo(d,z);
              const pl=platnostInfo(d.platnost_do);
              return <tr key={d.id} style={{borderTop:`1px solid ${C.border}`}}>
                <td style={{padding:"10px 14px",fontWeight:600,color:C.text}}>{d.nazev}{d.popis&&<div style={{fontSize:11,color:C.muted,fontWeight:400}}>{d.popis}</div>}</td>
                <td style={{padding:"10px 14px",color:C.muted,whiteSpace:"nowrap"}}>{d.datum_vystaveni?new Date(d.datum_vystaveni).toLocaleDateString("cs-CZ"):"—"}</td>
                <td style={{padding:"10px 14px",whiteSpace:"nowrap"}}>{kat?<span>{kat.emoji} {kat.nazev}</span>:<span style={{color:C.dim}}>—</span>}</td>
                <td style={{padding:"10px 14px"}}>{vi?<Tag color={vi.color}>{vi.emoji} {vi.label}</Tag>:<span style={{color:C.dim}}>—</span>}</td>
                <td style={{padding:"10px 14px",whiteSpace:"nowrap"}}>{pl?<span style={{color:pl.color,fontWeight:700,fontSize:12}}>{pl.stav==="ok"?`do ${pl.text}`:pl.text}</span>:<span style={{color:C.dim}}>—</span>}</td>
                <td style={{padding:"10px 14px",whiteSpace:"nowrap",textAlign:"right"}}>
                  {d.soubor_url&&<button onClick={()=>window.open(synologyHref(d.soubor_url),"_blank","noopener")} style={{...btnC(C.accent,true),padding:"3px 8px",fontSize:11,marginRight:4}}>👁 Otevřít</button>}
                  <button onClick={()=>setModal(d)} style={{...btnC(C.accent,true),padding:"3px 8px",fontSize:11,marginRight:4}}>✏</button>
                  <button onClick={()=>smaz(d)} style={{...btnC(C.red,true),padding:"3px 8px",fontSize:11}}>🗑</button>
                </td>
              </tr>;
            })}
          </tbody>
        </table>
      </div>}

    {modal&&<DokumentModal
      dokument={modal==="new"?null:modal}
      onClose={()=>setModal(null)}
      onSaved={()=>{setModal(null);reload();}}
    />}
  </div>;
}

// ── Nastavení kategorií (CRUD) ────────────────────────────────────────────────
function DokKategorieNastaveni(){
  const {data:kategorie,loading,reload}=useData(()=>sb.from("dok_kategorie").select("*").order("nazev"));
  const [modal,setModal]=useState(null); // null | "new" | kategorie
  const smaz=async(k)=>{if(!confirm(`Smazat kategorii "${k.nazev}"? Dokumenty zůstanou, jen ztratí kategorii.`))return;await sb.from("dok_kategorie").delete().eq("id",k.id);reload();};
  if(loading) return <Spinner/>;
  const kats=kategorie||[];
  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
      <div style={{fontSize:12,fontWeight:700,color:C.muted}}>Kategorie dokumentů ({kats.length})</div>
      <button onClick={()=>setModal("new")} style={btnC()}>+ Přidat kategorii</button>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:10}}>
      {kats.map(k=>
        <div key={k.id} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"12px 14px",borderLeft:`4px solid ${k.barva||C.accent}`,display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:22}}>{k.emoji||"📄"}</span>
          <div style={{flex:1,fontWeight:700,fontSize:14,minWidth:0,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{k.nazev}</div>
          <button onClick={()=>setModal(k)} style={{...btnC(C.accent,true),padding:"3px 8px",fontSize:11}}>✏</button>
          <button onClick={()=>smaz(k)} style={{...btnC(C.red,true),padding:"3px 8px",fontSize:11}}>🗑</button>
        </div>)}
    </div>
    {kats.length===0&&<div style={{padding:"24px 0",textAlign:"center",color:C.dim,fontSize:13}}>Zatím žádné kategorie</div>}
    {modal&&<DokKategorieModal kategorie={modal==="new"?null:modal} onClose={()=>setModal(null)} onSaved={()=>{setModal(null);reload();}}/>}
  </div>;
}

const DOK_EMOJI=["📄","🪪","🛂","🎓","🏥","🚗","🏠","🔧","🧾","📜","💼","🐾","🏗","📦","⚡","💧","🔥","📋"];
function DokKategorieModal({kategorie,onClose,onSaved}){
  const isNew=!kategorie;
  const [f,setF]=useState({nazev:kategorie?.nazev||"",emoji:kategorie?.emoji||"📄",barva:kategorie?.barva||C.accent});
  const [saving,setSaving]=useState(false);
  const uloz=async()=>{
    if(!f.nazev.trim())return;
    setSaving(true);
    const data={nazev:f.nazev.trim(),emoji:f.emoji,barva:f.barva};
    if(isNew) await sb.from("dok_kategorie").insert(data);
    else await sb.from("dok_kategorie").update(data).eq("id",kategorie.id);
    setSaving(false);onSaved();
  };
  return <Modal title={isNew?"Nová kategorie":"Upravit kategorii"} onClose={onClose} width={400}>
    <Field label="Název *"><input style={inp} value={f.nazev} onChange={e=>setF(p=>({...p,nazev:e.target.value}))} autoFocus placeholder="např. Doklady, Záruky, Smlouvy"/></Field>
    <Field label="Emoji">
      <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
        {DOK_EMOJI.map(em=><button key={em} onClick={()=>setF(p=>({...p,emoji:em}))} style={{fontSize:20,padding:"4px 8px",borderRadius:8,cursor:"pointer",border:`2px solid ${f.emoji===em?C.accent:C.border}`,background:f.emoji===em?`${C.accent}1a`:C.surface}}>{em}</button>)}
      </div>
    </Field>
    <Field label="Barva">
      <input type="color" value={f.barva} onChange={e=>setF(p=>({...p,barva:e.target.value}))} style={{width:60,height:36,border:`1px solid ${C.border}`,borderRadius:8,background:C.surface,cursor:"pointer"}}/>
    </Field>
    <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:6}}>
      <button onClick={onClose} style={btnC(C.muted,true)}>Zrušit</button>
      <button onClick={uloz} disabled={saving||!f.nazev.trim()} style={btnC()}>{saving?"Ukládám…":"Uložit"}</button>
    </div>
  </Modal>;
}

// ══════════════════════════════════════════════════════════════════════════════
// BOTY
// ══════════════════════════════════════════════════════════════════════════════
const TYPY_BOT = ["Tenisky","Sandály","Holínky","Přezůvky","Boty","Kozačky","Pantofle","Kopačky","Brusle","Zimní boty","Boty do vody","Mokasíny","Polobotky","Ostatní"];
const BARVY = ["Černá","Bílá","Šedá","Modrá","Tmavě modrá","Červená","Růžová","Zelená","Žlutá","Oranžová","Hnědá","Béžová","Fialová","Vícebarevná"];

function BotyModal({bota,umisteni,deti,defaultUmisteni,onClose,onSaved}){
  const isNew=!bota;
  const [f,setF]=useState({
    velikost:bota?.velikost||"",
    typ:bota?.typ||"Tenisky",
    barva1:bota?.barva1||"",
    barva2:bota?.barva2||"",
    stav:bota?.stav||"nove",
    umisteni_id:bota?.umisteni_id||defaultUmisteni||umisteni[0]?.id||"",
    dite_id:bota?.dite_id||"",
    poznamka:bota?.poznamka||"",
  });
  const [saving,setSaving]=useState(false);
  const set=k=>e=>setF(p=>({...p,[k]:e.target.value}));
  const uloz=async()=>{
    if(!f.velikost)return;
    setSaving(true);
    const data={...f,velikost:+f.velikost,dite_id:f.dite_id||null,umisteni_id:f.umisteni_id||null};
    if(isNew)await sb.from("boty").insert(data);
    else await sb.from("boty").update(data).eq("id",bota.id);
    setSaving(false);onSaved();
  };
  return <Modal title={isNew?"Přidat boty":"Upravit boty"} onClose={onClose}>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
      <Field label="Velikost"><input style={inp} type="number" value={f.velikost} onChange={set("velikost")} autoFocus placeholder="28"/></Field>
      <Field label="Typ"><select style={inp} value={f.typ} onChange={set("typ")}>{TYPY_BOT.map(t=><option key={t}>{t}</option>)}</select></Field>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
      <Field label="Barva 1"><select style={inp} value={f.barva1} onChange={set("barva1")}><option value="">— nevybráno —</option>{BARVY.map(b=><option key={b}>{b}</option>)}</select></Field>
      <Field label="Barva 2 (volitelná)"><select style={inp} value={f.barva2} onChange={set("barva2")}><option value="">— žádná —</option>{BARVY.map(b=><option key={b}>{b}</option>)}</select></Field>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
      <Field label="Stav"><select style={inp} value={f.stav} onChange={set("stav")}><option value="nove">✨ Nové</option><option value="pouzite">👟 Použité</option></select></Field>
      <Field label="Komu patří"><select style={inp} value={f.dite_id} onChange={set("dite_id")}><option value="">— nevybráno —</option>{(deti||[]).map(d=><option key={d.id} value={d.id}>{d.jmeno}</option>)}</select></Field>
    </div>
    <Field label="Umístění"><select style={inp} value={f.umisteni_id} onChange={set("umisteni_id")}><option value="">— bez umístění —</option>{(umisteni||[]).map(u=><option key={u.id} value={u.id}>{u.nazev}</option>)}</select></Field>
    <Field label="Poznámka"><input style={inp} value={f.poznamka} onChange={set("poznamka")} placeholder="Volitelná poznámka…"/></Field>
    <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:6}}>
      <button onClick={onClose} style={btnC(C.muted,true)}>Zrušit</button>
      <button onClick={uloz} disabled={saving||!f.velikost} style={btnC()}>{saving?"…":"Uložit"}</button>
    </div>
  </Modal>;
}

function UmisteniModal({onClose,onSaved}){
  const [nazev,setNazev]=useState("");const [saving,setSaving]=useState(false);
  const uloz=async()=>{if(!nazev.trim())return;setSaving(true);await sb.from("boty_umisteni").insert({nazev:nazev.trim()});setSaving(false);onSaved();};
  return <Modal title="Nové umístění" onClose={onClose} width={340}>
    <Field label="Název" hint="Např. Předsíň, Sklep, Police č.1"><input style={inp} value={nazev} onChange={e=>setNazev(e.target.value)} autoFocus onKeyDown={e=>e.key==="Enter"&&uloz()}/></Field>
    <div style={{display:"flex",justifyContent:"flex-end",gap:10}}><button onClick={onClose} style={btnC(C.muted,true)}>Zrušit</button><button onClick={uloz} disabled={saving} style={btnC()}>{saving?"…":"Přidat"}</button></div>
  </Modal>;
}

function BotyTab(){
  const {data:boty,loading,reload}=useData(()=>sb.from("boty").select("*,boty_umisteni(nazev),deti(jmeno,barva,emoji)").order("velikost").order("typ").then(({data,error})=>({data:data?.sort((a,b)=>a.typ.localeCompare(b.typ,"cs")||a.velikost-b.velikost),error})));
  const {data:umisteni,reload:reloadUm}=useData(()=>sb.from("boty_umisteni").select("*").order("nazev"));
  const {data:deti}=useData(()=>sb.from("deti").select("id,jmeno,barva,emoji").order("jmeno"));
  const [modal,setModal]=useState(null);
  const [filtrUm,setFiltrUm]=useState(null);
  const [filtrStav,setFiltrStav]=useState(null);
  const [filtrDite,setFiltrDite]=useState(null);
  const [zalozka,setZalozka]=useState("prehled");
  const [otevreneUm,setOtevreneUm]=useState({});

  const exportExcel=async()=>{
    const X=await import("xlsx");
    const wb=X.utils.book_new();
    // List 1: Všechny boty
    const rows=[
      ["Typ","Velikost","Stav","Dítě","Umístění","Značka","Poznámka"],
      ...(boty||[]).map(b=>[
        b.typ||"",
        b.velikost||"",
        b.stav==="nove"?"Nové":b.stav==="pouzite"?"Použité":b.stav==="mala"?"Malá":b.stav||"",
        b.deti?.jmeno||"",
        b.boty_umisteni?.nazev||"",
        b.znacka||"",
        b.poznamka||"",
      ])
    ];
    const ws=X.utils.aoa_to_sheet(rows);
    ws["!cols"]=[{wch:16},{wch:10},{wch:12},{wch:12},{wch:18},{wch:14},{wch:24}];
    X.utils.book_append_sheet(wb,ws,"Boty");
    // List 2: Přehled podle typu
    const typy=[...new Set((boty||[]).map(b=>b.typ))].sort((a,b)=>a.localeCompare(b,"cs"));
    const rows2=[["Typ","Párů celkem","z toho Nové","z toho Použité"],...typy.map(t=>{
      const bs=(boty||[]).filter(b=>b.typ===t);
      return [t,bs.length,bs.filter(b=>b.stav==="nove").length,bs.filter(b=>b.stav==="pouzite").length];
    })];
    const ws2=X.utils.aoa_to_sheet(rows2);
    ws2["!cols"]=[{wch:16},{wch:14},{wch:12},{wch:14}];
    X.utils.book_append_sheet(wb,ws2,"Přehled podle typu");
    // List 3: Přehled podle dítěte
    const detiList=[...new Set((boty||[]).map(b=>b.deti?.jmeno||"—"))].sort((a,b)=>a.localeCompare(b,"cs"));
    const rows3=[["Dítě","Párů celkem","z toho Nové","z toho Použité"],...detiList.map(jmeno=>{
      const bs=(boty||[]).filter(b=>(b.deti?.jmeno||"—")===jmeno);
      return [jmeno,bs.length,bs.filter(b=>b.stav==="nove").length,bs.filter(b=>b.stav==="pouzite").length];
    })];
    const ws3=X.utils.aoa_to_sheet(rows3);
    ws3["!cols"]=[{wch:16},{wch:14},{wch:12},{wch:14}];
    X.utils.book_append_sheet(wb,ws3,"Přehled podle dítěte");
    X.writeFile(wb,`boty_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  const filtered=(boty||[])
    .filter(b=>!filtrUm||b.umisteni_id===filtrUm)
    .filter(b=>!filtrStav||b.stav===filtrStav)
    .filter(b=>!filtrDite||(filtrDite==="none"?!b.dite_id:b.dite_id===filtrDite));

  if(loading)return <Spinner/>;

  return <div>
    {/* Hlavička */}
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:8}}>
      <div style={{color:C.text,fontWeight:800,fontSize:17}}>👟 Boty <span style={{color:C.muted,fontWeight:400,fontSize:14}}>({(boty||[]).length} párů)</span></div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        <button onClick={exportExcel} style={{...btnC(C.green,true),fontSize:12,padding:"6px 14px"}}>↓ Excel</button>
        <button onClick={()=>setModal({type:"new"})} style={{...btnC(),fontSize:12,padding:"6px 14px"}}>+ Přidat boty</button>
      </div>
    </div>

    {/* Záložky */}
    <div style={{display:"flex",gap:0,marginBottom:20,borderBottom:`2px solid ${C.border}`}}>
      {[{id:"prehled",label:"📊 Přehled"},{id:"umisteni",label:"📍 Umístění"}].map(z=>(
        <button key={z.id} onClick={()=>setZalozka(z.id)} style={{padding:"8px 20px",border:"none",cursor:"pointer",fontWeight:700,fontSize:13,background:"transparent",transition:"all .15s",color:zalozka===z.id?C.accent:C.muted,borderBottom:zalozka===z.id?`2px solid ${C.accent}`:"2px solid transparent",marginBottom:-2}}>{z.label}</button>
      ))}
    </div>

    {/* ── PŘEHLED ── */}
    {zalozka==="prehled"&&<>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:16}}>
        <StatCard label="Párů celkem" val={(boty||[]).length} color={C.accent}/>
        <StatCard label="Nové" val={(boty||[]).filter(b=>b.stav==="nove").length} color={C.green}/>
        <StatCard label="Použité" val={(boty||[]).filter(b=>b.stav==="pouzite").length} color={C.muted}/>
      </div>
      {/* Filtry */}
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:16,alignItems:"center"}}>
        <button onClick={()=>setFiltrStav(null)} style={{...btnC(!filtrStav?C.accent:C.muted,!!filtrStav),padding:"4px 10px",fontSize:12}}>Vše</button>
        <button onClick={()=>setFiltrStav(filtrStav==="nove"?null:"nove")} style={{...btnC(filtrStav==="nove"?C.green:C.muted,filtrStav!=="nove"),padding:"4px 10px",fontSize:12}}>✨ Nové</button>
        <button onClick={()=>setFiltrStav(filtrStav==="pouzite"?null:"pouzite")} style={{...btnC(filtrStav==="pouzite"?C.orange:C.muted,filtrStav!=="pouzite"),padding:"4px 10px",fontSize:12}}>👟 Použité</button>
        {(umisteni||[]).length>0&&<span style={{color:C.dim}}>|</span>}
        {(umisteni||[]).map(u=><button key={u.id} onClick={()=>setFiltrUm(filtrUm===u.id?null:u.id)} style={{...btnC(filtrUm===u.id?C.blue:C.muted,filtrUm!==u.id),padding:"4px 10px",fontSize:12}}>📍 {u.nazev}</button>)}
        {(deti||[]).length>0&&<span style={{color:C.dim}}>|</span>}
        <button onClick={()=>setFiltrDite(null)} style={{...btnC(!filtrDite?C.accent:C.muted,!!filtrDite),padding:"4px 10px",fontSize:12}}>Všechny děti</button>
        <button onClick={()=>setFiltrDite("none")} style={{...btnC(filtrDite==="none"?C.orange:C.muted,filtrDite!=="none"),padding:"4px 10px",fontSize:12}}>❓ Nepřiřazené</button>
        {(deti||[]).map(d=><button key={d.id} onClick={()=>setFiltrDite(filtrDite===d.id?null:d.id)} style={{padding:"4px 10px",fontSize:12,borderRadius:9,border:"none",cursor:"pointer",fontWeight:700,background:filtrDite===d.id?d.barva||C.accent:"transparent",color:filtrDite===d.id?"#fff":C.muted}}>{d.emoji} {d.jmeno}</button>)}
      </div>
      {filtered.length===0&&<EmptyState emoji="👟" text="Žádné boty" action="+ Přidat boty" onAction={()=>setModal({type:"new"})}/>}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:10}}>
        {filtered.map(b=>{
          const barvy=[b.barva1,b.barva2].filter(Boolean).join(" + ");
          return <div key={b.id} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:16,borderLeft:`4px solid ${b.stav==="nove"?C.green:C.dim}`}}>
            <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:8}}>
              <div>
                <div style={{fontWeight:800,fontSize:16,color:C.text}}>vel. {b.velikost}</div>
                <div style={{fontWeight:600,fontSize:13,color:C.accent}}>{b.typ}</div>
              </div>
              <Tag color={b.stav==="nove"?C.green:C.muted}>{b.stav==="nove"?"✨ Nové":"👟 Použité"}</Tag>
            </div>
            {barvy&&<div style={{fontSize:12,color:C.muted,marginBottom:4}}>🎨 {barvy}</div>}
            {b.deti&&<div style={{fontSize:12,color:C.muted,marginBottom:4}}>{b.deti.emoji||"👦"} {b.deti.jmeno}</div>}
            {b.boty_umisteni&&<div style={{fontSize:12,color:C.muted,marginBottom:4}}>📍 {b.boty_umisteni.nazev}</div>}
            {b.poznamka&&<div style={{fontSize:11,color:C.dim,fontStyle:"italic",marginBottom:8}}>{b.poznamka}</div>}
            <div style={{display:"flex",gap:6,marginTop:8}}>
              <button onClick={()=>setModal({type:"edit",bota:b})} style={{...btnC(C.muted,true),padding:"4px 10px",fontSize:12}}>✎ Upravit</button>
              <button onClick={()=>smaz(b)} style={{...btnC(C.red,true),padding:"4px 10px",fontSize:12}}>✕</button>
            </div>
          </div>;
        })}
      </div>
    </>}

    {/* ── UMÍSTĚNÍ ── */}
    {zalozka==="umisteni"&&<>
      <div style={{display:"flex",justifyContent:"flex-end",marginBottom:12}}>
        <button onClick={()=>setModal({type:"umisteni"})} style={{...btnC(),fontSize:12,padding:"6px 14px"}}>+ Přidat umístění</button>
      </div>
      {(umisteni||[]).length===0&&<EmptyState emoji="📍" text="Žádná umístění" action="+ Přidat umístění" onAction={()=>setModal({type:"umisteni"})}/>}
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {(umisteni||[]).map(u=>{
          const botyVUm=(boty||[]).filter(b=>b.umisteni_id===u.id);
          const otevreny=otevreneUm[u.id];
          return <div key={u.id} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,overflow:"hidden"}}>
            {/* Hlavička umístění */}
            <div onClick={()=>setOtevreneUm(p=>({...p,[u.id]:!p[u.id]}))}
              style={{display:"flex",alignItems:"center",gap:10,padding:"12px 16px",cursor:"pointer",background:otevreny?C.accentS:C.surface,transition:"background .15s"}}>
              <span style={{fontSize:16}}>📍</span>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,fontSize:14,color:C.text}}>{u.nazev}</div>
                <div style={{color:C.dim,fontSize:12}}>{botyVUm.length} párů</div>
              </div>
              <div style={{display:"flex",gap:6}} onClick={e=>e.stopPropagation()}>
                <button onClick={async()=>{const novy=prompt("Nový název:",u.nazev);if(!novy||!novy.trim())return;await sb.from("boty_umisteni").update({nazev:novy.trim()}).eq("id",u.id);reloadUm();}} style={{...btnC(C.muted,true),padding:"4px 9px",fontSize:12}}>✎</button>
                <button onClick={async()=>{if(!confirm(`Smazat umístění "${u.nazev}"?`))return;await sb.from("boty_umisteni").delete().eq("id",u.id);reloadUm();}} style={{...btnC(C.red,true),padding:"4px 9px",fontSize:12}}>✕</button>
              </div>
              <span style={{color:C.muted,fontSize:13,marginLeft:4}}>{otevreny?"▲":"▼"}</span>
            </div>
            {/* Boty v umístění */}
            {otevreny&&<div style={{borderTop:`1px solid ${C.border}`}}>
              {botyVUm.length===0&&<div style={{padding:"12px 16px",color:C.dim,fontSize:13}}>Žádné boty na tomto místě</div>}
              {botyVUm.map((b,i)=>{
                const barvy=[b.barva1,b.barva2].filter(Boolean).join(" + ");
                return <div key={b.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 16px",background:i%2===0?C.surface:"#fafbff",borderBottom:`1px solid ${C.border}`}}>
                  <div style={{width:4,height:32,borderRadius:2,background:b.stav==="nove"?C.green:C.dim,flexShrink:0}}/>
                  <div style={{flex:1}}>
                    <span style={{fontWeight:700,fontSize:13,color:C.text}}>vel. {b.velikost} · {b.typ}</span>
                    {barvy&&<span style={{color:C.muted,fontSize:12}}> · 🎨 {barvy}</span>}
                    {b.deti&&<span style={{color:C.muted,fontSize:12}}> · {b.deti?.emoji||"👦"} {b.deti?.jmeno}</span>}
                  </div>
                  <Tag color={b.stav==="nove"?C.green:C.muted}>{b.stav==="nove"?"✨":"👟"}</Tag>
                  <button onClick={()=>setModal({type:"edit",bota:b})} style={{...btnC(C.muted,true),padding:"3px 9px",fontSize:12}}>✎</button>
                  <button onClick={()=>smaz(b)} style={{...btnC(C.red,true),padding:"3px 9px",fontSize:12}}>✕</button>
                </div>;
              })}
              {/* Přidat botu přímo do umístění */}
              <div style={{padding:"10px 16px",background:C.bg,borderTop:`1px solid ${C.border}`}}>
                <button onClick={()=>setModal({type:"new",defaultUmisteni:u.id})} style={{...btnC(C.accent,true),fontSize:12,padding:"5px 14px"}}>+ Přidat boty do {u.nazev}</button>
              </div>
            </div>}
          </div>;
        })}
      </div>
    </>}

    {modal?.type==="new"&&<BotyModal umisteni={umisteni||[]} deti={deti||[]} defaultUmisteni={modal.defaultUmisteni} onClose={()=>setModal(null)} onSaved={()=>{setModal(null);reload();}}/>}
    {modal?.type==="edit"&&<BotyModal bota={modal.bota} umisteni={umisteni||[]} deti={deti||[]} onClose={()=>setModal(null)} onSaved={()=>{setModal(null);reload();}}/>}
    {modal?.type==="umisteni"&&<UmisteniModal onClose={()=>setModal(null)} onSaved={()=>{setModal(null);reloadUm();}}/>}
  </div>;
}

// ══════════════════════════════════════════════════════════════════════════════
// POZNÁMKY
// ══════════════════════════════════════════════════════════════════════════════
function PoznamkyTab(){
  const {data:poznamky,loading,reload}=useData(()=>sb.from("poznamky").select("*").order("splneno").order("priorita",{ascending:false}).order("created_at",{ascending:false}));
  const [modal,setModal]=useState(null);
  const [filtr,setFiltr]=useState("vse"); // vse | aktivni | splneno

  const toggleSplneno=async(p)=>{await sb.from("poznamky").update({splneno:!p.splneno}).eq("id",p.id);reload();};
  const smaz=async(p)=>{if(!confirm(`Smazat "${p.nazev}"?`))return;await sb.from("poznamky").delete().eq("id",p.id);reload();};

  const filtered=(poznamky||[]).filter(p=>filtr==="vse"||( filtr==="aktivni"?!p.splneno:p.splneno));

  if(loading)return <Spinner/>;
  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:8}}>
      <div style={{color:C.text,fontWeight:800,fontSize:17}}>📝 Poznámky & nápady</div>
      <button onClick={()=>setModal("new")} style={btnC()}>+ Přidat</button>
    </div>
    <div style={{display:"flex",gap:6,marginBottom:16}}>
      {[["vse","Vše"],["aktivni","Aktivní"],["splneno","Splněno"]].map(([id,lab])=>(
        <button key={id} onClick={()=>setFiltr(id)} style={{...btnC(filtr===id?C.accent:C.muted,filtr!==id),padding:"5px 14px",fontSize:12}}>{lab}</button>
      ))}
    </div>
    {filtered.length===0&&<EmptyState emoji="💡" text="Žádné poznámky" action="+ Přidat nápad" onAction={()=>setModal("new")}/>}
    <div style={{display:"flex",flexDirection:"column",gap:8}}>
      {filtered.map(p=>(
        <div key={p.id} style={{display:"flex",alignItems:"flex-start",gap:12,background:C.surface,border:`1px solid ${p.splneno?C.border:PRIORITA[p.priorita]?.color+"44"||C.border}`,borderRadius:12,padding:"12px 16px",opacity:p.splneno?.7:1}}>
          <div onClick={()=>toggleSplneno(p)} style={{width:22,height:22,borderRadius:6,border:`2px solid ${p.splneno?C.green:C.border}`,background:p.splneno?C.green:"transparent",cursor:"pointer",flexShrink:0,marginTop:1,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:13}}>{p.splneno?"✓":""}</div>
          <div style={{flex:1}}>
            <div style={{fontWeight:600,fontSize:14,color:p.splneno?C.dim:C.text,textDecoration:p.splneno?"line-through":"none"}}>{p.nazev}</div>
            {p.obsah&&<div style={{color:C.muted,fontSize:12,marginTop:3}}>{p.obsah}</div>}
          </div>
          <Tag color={PRIORITA[p.priorita]?.color||C.dim}>{PRIORITA[p.priorita]?.label}</Tag>
          <button onClick={()=>setModal(p)} style={{...btnC(C.muted,true),padding:"3px 9px",fontSize:12}}>✎</button>
          <button onClick={()=>smaz(p)} style={{...btnC(C.red,true),padding:"3px 9px",fontSize:12}}>✕</button>
        </div>
      ))}
    </div>
    {modal&&<PoznamkaModal poznamka={modal==="new"?null:modal} onClose={()=>setModal(null)} onSaved={()=>{setModal(null);reload();}}/>}
  </div>;
}

function PoznamkaModal({poznamka,onClose,onSaved}){
  const isNew=!poznamka;
  const [f,setF]=useState({nazev:poznamka?.nazev||"",obsah:poznamka?.obsah||"",priorita:poznamka?.priorita||"normal"});
  const [saving,setSaving]=useState(false);const set=k=>e=>setF(p=>({...p,[k]:e.target.value}));
  const uloz=async()=>{if(!f.nazev.trim())return;setSaving(true);if(isNew)await sb.from("poznamky").insert(f);else await sb.from("poznamky").update(f).eq("id",poznamka.id);setSaving(false);onSaved();};
  return <Modal title={isNew?"Nová poznámka":"Upravit poznámku"} onClose={onClose} width={400}>
    <Field label="Název / nápad"><input style={inp} value={f.nazev} onChange={set("nazev")} autoFocus onKeyDown={e=>e.key==="Enter"&&uloz()}/></Field>
    <Field label="Detail (volitelné)"><textarea style={{...inp,resize:"vertical",minHeight:80}} value={f.obsah} onChange={set("obsah")}/></Field>
    <Field label="Priorita"><select style={inp} value={f.priorita} onChange={set("priorita")}>{Object.entries(PRIORITA).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</select></Field>
    <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:6}}><button onClick={onClose} style={btnC(C.muted,true)}>Zrušit</button><button onClick={uloz} disabled={saving} style={btnC()}>{saving?"…":"Uložit"}</button></div>
  </Modal>;
}

// ══════════════════════════════════════════════════════════════════════════════
// PROJEKTY
// ══════════════════════════════════════════════════════════════════════════════
const STAV_PROJEKT={plan:{label:"Plánováno",color:C.blue},probiha:{label:"Probíhá",color:C.orange},hotovo:{label:"Hotovo",color:C.green},pozastaveno:{label:"Pozastaveno",color:C.muted}};
const PROJ_EMOJIS=["🏗","🏠","💍","🛏","🍽","🚗","🌿","💡","📦","🔧","🎨","📚"];

function ProjektyTab(){
  const {data:projekty,loading,reload}=useData(()=>sb.from("projekty").select("*").order("datum"));
  const [aktivni,setAktivni]=useState(null); // projekt_id nebo null
  const [modal,setModal]=useState(false);
  const [form,setForm]=useState({nazev:"",emoji:"🏗",datum:"",cas:"",misto:"",barva:"#4f7ef0"});
  const [saving,setSaving]=useState(false);

  const ulozProjekt=async()=>{
    if(!form.nazev.trim()||saving) return;
    setSaving(true);
    const {error}=await sb.from("projekty").insert({...form,datum:form.datum||null,cas:form.cas||null});
    setSaving(false);
    if(error){ alert("Projekt se nepodařilo uložit:\n"+(error.message||"neznámá chyba")); return; }
    setForm({nazev:"",emoji:"🏗",datum:"",cas:"",misto:"",barva:"#4f7ef0"});
    setModal(false);reload();
  };

  const smazProjekt=async(e,p)=>{
    e.stopPropagation();
    if(!confirm(`Smazat projekt „${p.nazev}"?\nSmažou se i jeho rozpočtové položky. Tuto akci nelze vrátit.`)) return;
    await sb.from("projekty_rozpocet").delete().eq("projekt_id",p.id);
    const {error}=await sb.from("projekty").delete().eq("id",p.id);
    if(error){ alert("Smazání se nepovedlo:\n"+(error.message||"neznámá chyba")); return; }
    reload();
  };

  if(loading)return <Spinner/>;

  if(aktivni){
    const p=(projekty||[]).find(x=>x.id===aktivni);
    if(!p)return null;
    return <ProjektDetail projekt={p} onBack={()=>setAktivni(null)}/>;
  }

  const odpocet=(datum)=>{
    if(!datum)return null;
    const diff=Math.ceil((new Date(datum)-new Date())/(1000*60*60*24));
    if(diff<0)return null;
    if(diff===0)return"Dnes!";
    return`Za ${diff} dní`;
  };

  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
      <h2 style={{margin:0,fontSize:22,fontWeight:800}}>🏗 Projekty</h2>
      <button onClick={()=>setModal(true)} style={btnC()}>+ Nový projekt</button>
    </div>

    {(projekty||[]).length===0&&<EmptyState emoji="🏗" text="Žádné projekty" action="+ Přidat projekt" onAction={()=>setModal(true)}/>}

    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:14}}>
      {(projekty||[]).map(p=>{
        const dniZbyvá=odpocet(p.datum);
        return <div key={p.id} onClick={()=>setAktivni(p.id)}
          style={{position:"relative",background:C.surface,border:`1px solid ${C.border}`,borderRadius:16,overflow:"hidden",cursor:"pointer",transition:"all .2s",boxShadow:"0 2px 8px rgba(0,0,0,.04)"}}
          onMouseEnter={e=>e.currentTarget.style.transform="translateY(-3px)"}
          onMouseLeave={e=>e.currentTarget.style.transform="translateY(0)"}>
          <button onClick={(e)=>smazProjekt(e,p)} title="Smazat projekt"
            style={{position:"absolute",top:10,right:10,zIndex:2,background:"rgba(0,0,0,.25)",border:"none",color:"#fff",borderRadius:8,width:30,height:30,cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center"}}>🗑</button>
          <div style={{background:p.barva||C.accent,padding:"20px 20px 16px"}}>
            <div style={{fontSize:32,marginBottom:6}}>{p.emoji}</div>
            <div style={{fontWeight:800,fontSize:16,color:"#fff"}}>{p.nazev}</div>
            {p.misto&&<div style={{fontSize:12,color:"rgba(255,255,255,.8)",marginTop:3}}>📍 {p.misto}</div>}
          </div>
          <div style={{padding:"14px 16px"}}>
            {p.datum&&<div style={{fontSize:13,color:C.muted,marginBottom:6}}>
              📅 {new Date(p.datum).toLocaleDateString("cs-CZ",{day:"numeric",month:"long",year:"numeric"})}
              {p.cas&&` v ${p.cas.slice(0,5)}`}
            </div>}
            {dniZbyvá&&<div style={{fontWeight:800,fontSize:15,color:p.barva||C.accent}}>{dniZbyvá}</div>}
          </div>
        </div>;
      })}
    </div>

    {modal&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{background:C.surface,borderRadius:18,padding:28,width:"100%",maxWidth:400,boxShadow:"0 20px 60px rgba(0,0,0,.25)"}}>
        <h3 style={{margin:"0 0 18px",fontSize:17,fontWeight:800}}>Nový projekt</h3>
        {[
          {l:"Název",k:"nazev",t:"text"},
          {l:"Emoji",k:"emoji",t:"text"},
          {l:"Datum",k:"datum",t:"date"},
          {l:"Čas",k:"cas",t:"time"},
          {l:"Místo",k:"misto",t:"text"},
          {l:"Barva",k:"barva",t:"color"},
        ].map(f=><div key={f.k} style={{marginBottom:11}}>
          <div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:4}}>{f.l}</div>
          <input style={inp} type={f.t} value={form[f.k]} onChange={e=>setForm(p=>({...p,[f.k]:e.target.value}))}/>
        </div>)}
        <div style={{display:"flex",gap:10,marginTop:16}}>
          <button onClick={ulozProjekt} disabled={saving||!form.nazev.trim()} style={{...btnC(),opacity:(saving||!form.nazev.trim())?.6:1,cursor:(saving||!form.nazev.trim())?"not-allowed":"pointer"}}>{saving?"Ukládám…":"Uložit"}</button>
          <button onClick={()=>setModal(false)} style={btnC(C.muted,true)}>Zrušit</button>
        </div>
      </div>
    </div>}
  </div>;
}

function ProjektDetail({projekt,onBack}){
  const [zalozka,setZalozka]=useState("rozpocet");
  const [countdown,setCountdown]=useState("");
  const p=projekt;

  // Živý odpočet na vteřiny
  useEffect(()=>{
    if(!p.datum)return;
    const cil=new Date(p.datum+"T"+(p.cas?p.cas.slice(0,5):"00:00"));
    const tick=()=>{
      const diff=cil-new Date();
      if(diff<=0){setCountdown("🎉 Dnes!");return;}
      const d=Math.floor(diff/(1000*60*60*24));
      const h=Math.floor((diff%(1000*60*60*24))/(1000*60*60));
      const m=Math.floor((diff%(1000*60*60))/(1000*60));
      const s=Math.floor((diff%( 1000*60))/1000);
      setCountdown(`${d} dní ${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`);
    };
    tick();
    const id=setInterval(tick,1000);
    return()=>clearInterval(id);
  },[p.datum,p.cas]);

  // Načtení souhrnných dat pro sticky header
  const {data:rozpocet,reload:reloadRozpocet}=useData(()=>sb.from("projekty_rozpocet").select("cena_odhad,cena_skutecna,jiz_zaplaceno").eq("projekt_id",p.id));
  const celkemOdhad=(rozpocet||[]).reduce((a,r)=>a+r.cena_odhad,0);
  const celkemSkutecna=(rozpocet||[]).reduce((a,r)=>a+(r.cena_skutecna||0),0);
  const celkemZaplaceno=(rozpocet||[]).reduce((a,r)=>a+r.jiz_zaplaceno,0);

  const tabs=[
    {id:"rozpocet",l:"💰 Rozpočet"},
    {id:"hoste",l:"👥 Hosté"},
    {id:"obed",l:"🍽 Oběd"},
    {id:"zakusky",l:"🍰 Zákusky"},
    {id:"todo",l:"✅ ToDo"},
    {id:"dokumenty",l:"📁 Dokumenty"},
  ];

  return <div>
    {/* Sticky hlavička */}
    <div style={{position:"sticky",top:54,zIndex:40,background:C.bg,paddingBottom:12,marginBottom:8}}>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:10}}>
        <button onClick={onBack} style={{background:"none",border:"none",cursor:"pointer",fontSize:13,color:C.muted,padding:"4px 8px",borderRadius:8,whiteSpace:"nowrap"}}>← Zpět</button>
        <div style={{flex:1,minWidth:0}}>
          <h2 style={{margin:0,fontSize:20,fontWeight:800,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{p.emoji} {p.nazev}</h2>
          <div style={{fontSize:12,color:C.muted}}>
            {p.datum&&new Date(p.datum).toLocaleDateString("cs-CZ",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}
            {p.cas&&` v ${p.cas.slice(0,5)}`}
            {p.misto&&` · ${p.misto}`}
          </div>
        </div>
        {countdown&&<div style={{background:p.barva||C.accent,color:"#fff",borderRadius:12,padding:"8px 16px",fontWeight:800,fontSize:14,whiteSpace:"nowrap",fontVariantNumeric:"tabular-nums"}}>{countdown}</div>}
      </div>

      {/* Souhrnné cifry */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
        {[
          {l:"Odhad",v:`${celkemOdhad.toLocaleString("cs")} Kč`,c:C.blue},
          {l:"Zaplaceno",v:`${celkemZaplaceno.toLocaleString("cs")} Kč`,c:C.green},
          {l:"Zbývá",v:`${Math.max(0,celkemOdhad-celkemZaplaceno).toLocaleString("cs")} Kč`,c:celkemOdhad<=celkemZaplaceno?C.green:C.orange},
        ].map(k=><div key={k.l} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:"8px 12px",borderLeft:`3px solid ${k.c}`}}>
          <div style={{fontSize:10,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:.5}}>{k.l}</div>
          <div style={{fontSize:15,fontWeight:800,color:k.c}}>{k.v}</div>
        </div>)}
      </div>

      {/* Záložky */}
      <div style={{display:"flex",gap:2,marginTop:10,borderBottom:`2px solid ${C.border}`}}>
        {tabs.map(t=><button key={t.id} onClick={()=>setZalozka(t.id)} style={{padding:"8px 14px",border:"none",background:"none",cursor:"pointer",fontSize:13,fontWeight:700,color:zalozka===t.id?C.accent:C.muted,borderBottom:zalozka===t.id?`2px solid ${C.accent}`:"2px solid transparent",marginBottom:-2,whiteSpace:"nowrap"}}>{t.l}</button>)}
      </div>
    </div>

    {zalozka==="rozpocet"&&<RozpocetTab projektId={p.id} onSaved={reloadRozpocet}/>}
    {zalozka==="hoste"&&<HosteTab projektId={p.id}/>}
    {zalozka==="obed"&&<ObedTab projektId={p.id}/>}
    {zalozka==="zakusky"&&<ZakuskyTab projektId={p.id}/>}
    {zalozka==="todo"&&<TodoTab projektId={p.id}/>}
    {zalozka==="dokumenty"&&<EntityDokumentyPanel lockVazba={`projekt:${p.id}`} nadpis={`Dokumenty — ${p.nazev}`}/>}
  </div>;
}

function RozpocetTab({projektId,onSaved}){
  const {data:polozky,reload}=useData(()=>sb.from("projekty_rozpocet").select("*").eq("projekt_id",projektId).order("kategorie").order("polozka"));
  const [modal,setModal]=useState(null);
  const [form,setForm]=useState({kategorie:"",polozka:"",cena_odhad:"",jiz_zaplaceno:"",poznamka:""});

  const KATEGORIE=["Administrativa","Místo a jídlo","Jídlo","Oblečení a vizáž","Zábava a vzpomínky","Dekorace","Ostatní"];

  const uloz=async()=>{
    const data={projekt_id:projektId,kategorie:form.kategorie,polozka:form.polozka,cena_odhad:+form.cena_odhad||0,cena_skutecna:null,jiz_zaplaceno:+form.jiz_zaplaceno||0,poznamka:form.poznamka||null};
    if(modal==="nova")await sb.from("projekty_rozpocet").insert(data);
    else await sb.from("projekty_rozpocet").update(data).eq("id",modal.id);
    reload();onSaved&&onSaved();setModal(null);
  };
  const smaz=async(id)=>{if(!confirm("Smazat?"))return;await sb.from("projekty_rozpocet").delete().eq("id",id);reload();onSaved&&onSaved();};

  const celkemOdhad=(polozky||[]).reduce((a,p)=>a+p.cena_odhad,0);
  const celkemZaplaceno=(polozky||[]).reduce((a,p)=>a+p.jiz_zaplaceno,0);
  const zbyva=celkemOdhad-celkemZaplaceno;

  return <div>
    <div style={{display:"flex",justifyContent:"flex-end",marginBottom:16}}>
      <button onClick={()=>{setForm({kategorie:KATEGORIE[0],polozka:"",cena_odhad:"",jiz_zaplaceno:"",poznamka:""});setModal("nova");}} style={btnC()}>+ Přidat položku</button>
    </div>

    <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,overflow:"hidden"}}>
      <table style={{width:"100%",borderCollapse:"collapse"}}>
        <thead><tr style={{background:C.bg}}>
          {["Kategorie","Položka","Odhad","Zaplaceno","Zbývá","Poznámka",""].map(h=><th key={h} style={{padding:"9px 12px",textAlign:"left",fontSize:11,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:.4}}>{h}</th>)}
        </tr></thead>
        <tbody>
          {(polozky||[]).length===0&&<tr><td colSpan={7} style={{padding:24,textAlign:"center",color:C.dim}}>Žádné položky</td></tr>}
          {(polozky||[]).map((p,i)=>{
            const zbyva=p.cena_odhad-p.jiz_zaplaceno;
            return <tr key={p.id} style={{background:i%2===0?C.surface:"#fafbff",borderBottom:`1px solid ${C.border}`}}>
              <td style={{padding:"9px 12px"}}>
                <span style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:6,padding:"2px 8px",fontSize:11,fontWeight:600,color:C.muted,whiteSpace:"nowrap"}}>{p.kategorie}</span>
              </td>
              <td style={{padding:"9px 12px",fontWeight:600,fontSize:13}}>{p.polozka}</td>
              <td style={{padding:"9px 12px",fontSize:13,color:C.muted}}>{p.cena_odhad.toLocaleString("cs")} Kč</td>
              <td style={{padding:"9px 12px",fontSize:13,fontWeight:700,color:p.jiz_zaplaceno>0?C.green:C.dim}}>{p.jiz_zaplaceno>0?`${p.jiz_zaplaceno.toLocaleString("cs")} Kč`:"—"}</td>
              <td style={{padding:"9px 12px",fontSize:13,fontWeight:700,color:zbyva>0?C.orange:C.green}}>{zbyva>0?`${zbyva.toLocaleString("cs")} Kč`:"✓"}</td>
              <td style={{padding:"9px 12px",fontSize:12,color:C.muted}}>{p.poznamka||""}</td>
              <td style={{padding:"9px 8px",whiteSpace:"nowrap"}}>
                <button onClick={()=>{setModal(p);setForm({kategorie:p.kategorie,polozka:p.polozka,cena_odhad:String(p.cena_odhad),jiz_zaplaceno:String(p.jiz_zaplaceno),poznamka:p.poznamka||""});}} style={{...btnC(C.accent,true),padding:"3px 8px",fontSize:11,marginRight:4}}>✏</button>
                <button onClick={()=>smaz(p.id)} style={{...btnC(C.red,true),padding:"3px 8px",fontSize:11}}>🗑</button>
              </td>
            </tr>;
          })}
        </tbody>
        {(polozky||[]).length>0&&<tfoot>
          <tr style={{background:C.bg,borderTop:`2px solid ${C.border}`}}>
            <td colSpan={2} style={{padding:"10px 12px",fontWeight:700,fontSize:13}}>CELKEM</td>
            <td style={{padding:"10px 12px",fontWeight:800,fontSize:14,color:C.muted}}>{celkemOdhad.toLocaleString("cs")} Kč</td>
            <td style={{padding:"10px 12px",fontWeight:800,fontSize:14,color:C.green}}>{celkemZaplaceno.toLocaleString("cs")} Kč</td>
            <td style={{padding:"10px 12px",fontWeight:800,fontSize:14,color:zbyva>0?C.orange:C.green}}>{zbyva>0?`${zbyva.toLocaleString("cs")} Kč`:"✓ Vše zaplaceno"}</td>
            <td colSpan={2}/>
          </tr>
        </tfoot>}
      </table>
    </div>

    {modal&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{background:C.surface,borderRadius:18,padding:28,width:"100%",maxWidth:420,boxShadow:"0 20px 60px rgba(0,0,0,.25)"}}>
        <h3 style={{margin:"0 0 18px",fontSize:17,fontWeight:800}}>{modal==="nova"?"Nová položka":"Upravit položku"}</h3>
        <div style={{marginBottom:11}}>
          <div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:4}}>Kategorie</div>
          <select style={inp} value={form.kategorie} onChange={e=>setForm(p=>({...p,kategorie:e.target.value}))}>
            {KATEGORIE.map(k=><option key={k} value={k}>{k}</option>)}
          </select>
        </div>
        {[
          {l:"Položka",k:"polozka",t:"text"},
          {l:"Odhadovaná cena (Kč)",k:"cena_odhad",t:"number"},
          {l:"Již zaplaceno (Kč)",k:"jiz_zaplaceno",t:"number"},
          {l:"Poznámka",k:"poznamka",t:"text"},
        ].map(f=><div key={f.k} style={{marginBottom:11}}>
          <div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:4}}>{f.l}</div>
          <input style={inp} type={f.t} value={form[f.k]} onChange={e=>setForm(p=>({...p,[f.k]:e.target.value}))}/>
        </div>)}
        <div style={{display:"flex",gap:10,marginTop:16}}>
          <button onClick={uloz} style={btnC()}>Uložit</button>
          <button onClick={()=>setModal(null)} style={btnC(C.muted,true)}>Zrušit</button>
        </div>
      </div>
    </div>}
  </div>;
}

function HosteTab({projektId}){
  const {data:hoste,reload}=useData(()=>sb.from("projekty_hoste").select("*").eq("projekt_id",projektId).order("typ").order("jmeno"));
  const [form,setForm]=useState({jmeno:"",typ:"dospely"});
  const [pridavam,setPridavam]=useState(false);

  const uloz=async()=>{
    if(!form.jmeno.trim())return;
    await sb.from("projekty_hoste").insert({projekt_id:projektId,jmeno:form.jmeno,typ:form.typ});
    setForm({jmeno:"",typ:"dospely"});setPridavam(false);reload();
  };
  const smaz=async(id)=>{await sb.from("projekty_hoste").delete().eq("id",id);reload();};

  const dospeli=(hoste||[]).filter(h=>h.typ==="dospely");
  const deti=(hoste||[]).filter(h=>h.typ==="dite");

  return <div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20}}>
      <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"14px 16px",borderTop:`3px solid ${C.accent}`}}>
        <div style={{fontSize:11,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:.6,marginBottom:4}}>Dospělí</div>
        <div style={{fontSize:24,fontWeight:800,color:C.accent}}>{dospeli.length}</div>
      </div>
      <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"14px 16px",borderTop:`3px solid ${C.green}`}}>
        <div style={{fontSize:11,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:.6,marginBottom:4}}>Děti</div>
        <div style={{fontSize:24,fontWeight:800,color:C.green}}>{deti.length}</div>
      </div>
    </div>

    <div style={{display:"flex",justifyContent:"flex-end",marginBottom:16}}>
      <button onClick={()=>setPridavam(true)} style={btnC()}>+ Přidat hosta</button>
    </div>

    {pridavam&&<div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:16,marginBottom:16,display:"flex",gap:10,alignItems:"flex-end",flexWrap:"wrap"}}>
      <div style={{flex:1}}>
        <div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:4}}>Jméno</div>
        <input style={inp} value={form.jmeno} onChange={e=>setForm(p=>({...p,jmeno:e.target.value}))} placeholder="Jméno hosta" onKeyDown={e=>e.key==="Enter"&&uloz()}/>
      </div>
      <div>
        <div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:4}}>Typ</div>
        <select style={inp} value={form.typ} onChange={e=>setForm(p=>({...p,typ:e.target.value}))}>
          <option value="dospely">Dospělý</option>
          <option value="dite">Dítě</option>
        </select>
      </div>
      <button onClick={uloz} style={btnC()}>Přidat</button>
      <button onClick={()=>setPridavam(false)} style={btnC(C.muted,true)}>Zrušit</button>
    </div>}

    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
      {[{label:"👤 Dospělí",items:dospeli},{label:"👶 Děti",items:deti}].map(({label,items})=><div key={label}>
        <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:8}}>{label} ({items.length})</div>
        <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,overflow:"hidden"}}>
          {items.length===0?<div style={{padding:16,color:C.dim,fontSize:13,textAlign:"center"}}>Žádní hosté</div>:
          items.map((h,i)=><div key={h.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 14px",borderBottom:i<items.length-1?`1px solid ${C.border}`:"none"}}>
            <span style={{fontSize:13,fontWeight:500}}>{h.jmeno}</span>
            <button onClick={()=>smaz(h.id)} style={{background:"none",border:"none",cursor:"pointer",color:C.dim,fontSize:12}} onMouseEnter={e=>e.currentTarget.style.color=C.red} onMouseLeave={e=>e.currentTarget.style.color=C.dim}>✕</button>
          </div>)}
        </div>
      </div>)}
    </div>
  </div>;
}

function ObedTab({projektId}){
  const {data:polozky,reload}=useData(()=>sb.from("projekty_obed").select("*").eq("projekt_id",projektId).order("polozka"));
  const [modal,setModal]=useState(null);
  const [form,setForm]=useState({polozka:"",pocet_osob:"",cena_osoba:""});

  const uloz=async()=>{
    const data={projekt_id:projektId,polozka:form.polozka,pocet_osob:+form.pocet_osob||0,cena_osoba:+form.cena_osoba||0};
    if(modal==="nova")await sb.from("projekty_obed").insert(data);
    else await sb.from("projekty_obed").update(data).eq("id",modal.id);
    reload();setModal(null);
  };
  const smaz=async(id)=>{await sb.from("projekty_obed").delete().eq("id",id);reload();};

  const celkem=(polozky||[]).reduce((a,p)=>a+p.pocet_osob*p.cena_osoba,0);

  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
      <div style={{fontWeight:800,fontSize:15}}>Celkem: <span style={{color:C.accent}}>{celkem.toLocaleString("cs")} Kč</span></div>
      <button onClick={()=>{setForm({polozka:"",pocet_osob:"",cena_osoba:""});setModal("nova");}} style={btnC()}>+ Přidat</button>
    </div>
    <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,overflow:"hidden"}}>
      <table style={{width:"100%",borderCollapse:"collapse"}}>
        <thead><tr style={{background:C.bg}}>
          {["Položka","Počet osob","Cena/osoba","Celkem",""].map(h=><th key={h} style={{padding:"9px 12px",textAlign:"left",fontSize:11,fontWeight:700,color:C.muted,textTransform:"uppercase"}}>{h}</th>)}
        </tr></thead>
        <tbody>
          {(polozky||[]).length===0&&<tr><td colSpan={5} style={{padding:20,textAlign:"center",color:C.dim}}>Žádné položky</td></tr>}
          {(polozky||[]).map((p,i)=><tr key={p.id} style={{background:i%2===0?C.surface:"#fafbff",borderBottom:`1px solid ${C.border}`}}>
            <td style={{padding:"9px 12px",fontWeight:600,fontSize:13}}>{p.polozka}</td>
            <td style={{padding:"9px 12px",fontSize:13,textAlign:"center"}}>{p.pocet_osob}</td>
            <td style={{padding:"9px 12px",fontSize:13}}>{p.cena_osoba.toLocaleString("cs")} Kč</td>
            <td style={{padding:"9px 12px",fontSize:13,fontWeight:700,color:C.accent}}>{(p.pocet_osob*p.cena_osoba).toLocaleString("cs")} Kč</td>
            <td style={{padding:"9px 8px",whiteSpace:"nowrap"}}>
              <button onClick={()=>{setModal(p);setForm({polozka:p.polozka,pocet_osob:String(p.pocet_osob),cena_osoba:String(p.cena_osoba)});}} style={{...btnC(C.accent,true),padding:"3px 8px",fontSize:11,marginRight:4}}>✏</button>
              <button onClick={()=>smaz(p.id)} style={{...btnC(C.red,true),padding:"3px 8px",fontSize:11}}>🗑</button>
            </td>
          </tr>)}
        </tbody>
        {(polozky||[]).length>0&&<tfoot><tr style={{background:C.bg,borderTop:`2px solid ${C.border}`}}>
          <td colSpan={3} style={{padding:"10px 12px",fontWeight:700}}>CELKEM</td>
          <td style={{padding:"10px 12px",fontWeight:800,fontSize:14,color:C.accent}}>{celkem.toLocaleString("cs")} Kč</td>
          <td/>
        </tr></tfoot>}
      </table>
    </div>

    {modal&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{background:C.surface,borderRadius:18,padding:28,width:"100%",maxWidth:380,boxShadow:"0 20px 60px rgba(0,0,0,.25)"}}>
        <h3 style={{margin:"0 0 18px",fontSize:17,fontWeight:800}}>{modal==="nova"?"Nová položka":"Upravit"}</h3>
        {[{l:"Položka",k:"polozka",t:"text"},{l:"Počet osob",k:"pocet_osob",t:"number"},{l:"Cena na osobu (Kč)",k:"cena_osoba",t:"number"}].map(f=><div key={f.k} style={{marginBottom:11}}>
          <div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:4}}>{f.l}</div>
          <input style={inp} type={f.t} value={form[f.k]} onChange={e=>setForm(p=>({...p,[f.k]:e.target.value}))}/>
        </div>)}
        {form.pocet_osob&&form.cena_osoba&&<div style={{background:C.accentS,borderRadius:8,padding:"8px 12px",marginBottom:12,fontSize:13,color:C.accent,fontWeight:600}}>Celkem: {(+form.pocet_osob*(+form.cena_osoba)).toLocaleString("cs")} Kč</div>}
        <div style={{display:"flex",gap:10,marginTop:16}}>
          <button onClick={uloz} style={btnC()}>Uložit</button>
          <button onClick={()=>setModal(null)} style={btnC(C.muted,true)}>Zrušit</button>
        </div>
      </div>
    </div>}
  </div>;
}

function ZakuskyTab({projektId}){
  const {data:zakusky,reload}=useData(()=>sb.from("projekty_zakusky").select("*").eq("projekt_id",projektId).order("nazev"));
  const [modal,setModal]=useState(null);
  const [form,setForm]=useState({nazev:"",cena:"",mnozstvi:""});

  const uloz=async()=>{
    const data={projekt_id:projektId,nazev:form.nazev,cena:+form.cena||0,mnozstvi:+form.mnozstvi||0};
    if(modal==="nova")await sb.from("projekty_zakusky").insert(data);
    else await sb.from("projekty_zakusky").update(data).eq("id",modal.id);
    reload();setModal(null);
  };
  const smaz=async(id)=>{await sb.from("projekty_zakusky").delete().eq("id",id);reload();};

  const celkemKs=(zakusky||[]).reduce((a,z)=>a+z.mnozstvi,0);
  const celkemCena=(zakusky||[]).reduce((a,z)=>a+z.cena*z.mnozstvi,0);

  return <div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
      <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"14px 16px",borderTop:`3px solid ${C.orange}`}}>
        <div style={{fontSize:11,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:.6,marginBottom:4}}>Kusů celkem</div>
        <div style={{fontSize:24,fontWeight:800,color:C.orange}}>{celkemKs}</div>
      </div>
      <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"14px 16px",borderTop:`3px solid ${C.accent}`}}>
        <div style={{fontSize:11,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:.6,marginBottom:4}}>Celková cena</div>
        <div style={{fontSize:24,fontWeight:800,color:C.accent}}>{celkemCena.toLocaleString("cs")} Kč</div>
      </div>
    </div>

    <div style={{display:"flex",justifyContent:"flex-end",marginBottom:16}}>
      <button onClick={()=>{setForm({nazev:"",cena:"",mnozstvi:""});setModal("nova");}} style={btnC()}>+ Přidat zákusek</button>
    </div>

    <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,overflow:"hidden"}}>
      <table style={{width:"100%",borderCollapse:"collapse"}}>
        <thead><tr style={{background:C.bg}}>
          {["Zákusek","Cena/ks","Množství","Objednáno",""].map(h=><th key={h} style={{padding:"9px 12px",textAlign:"left",fontSize:11,fontWeight:700,color:C.muted,textTransform:"uppercase"}}>{h}</th>)}
        </tr></thead>
        <tbody>
          {(zakusky||[]).length===0&&<tr><td colSpan={5} style={{padding:20,textAlign:"center",color:C.dim}}>Žádné zákusky</td></tr>}
          {(zakusky||[]).map((z,i)=><tr key={z.id} style={{background:i%2===0?C.surface:"#fafbff",borderBottom:`1px solid ${C.border}`}}>
            <td style={{padding:"9px 12px",fontWeight:600,fontSize:13}}>{z.nazev}</td>
            <td style={{padding:"9px 12px",fontSize:13}}>{z.cena.toLocaleString("cs")} Kč</td>
            <td style={{padding:"9px 12px",fontSize:13,textAlign:"center"}}>{z.mnozstvi||"—"}</td>
            <td style={{padding:"9px 12px",fontSize:13,fontWeight:700,color:z.mnozstvi>0?C.accent:C.dim}}>{z.mnozstvi>0?`${(z.cena*z.mnozstvi).toLocaleString("cs")} Kč`:"—"}</td>
            <td style={{padding:"9px 8px",whiteSpace:"nowrap"}}>
              <button onClick={()=>{setModal(z);setForm({nazev:z.nazev,cena:String(z.cena),mnozstvi:String(z.mnozstvi)});}} style={{...btnC(C.accent,true),padding:"3px 8px",fontSize:11,marginRight:4}}>✏</button>
              <button onClick={()=>smaz(z.id)} style={{...btnC(C.red,true),padding:"3px 8px",fontSize:11}}>🗑</button>
            </td>
          </tr>)}
        </tbody>
        {celkemCena>0&&<tfoot><tr style={{background:C.bg,borderTop:`2px solid ${C.border}`}}>
          <td colSpan={2} style={{padding:"10px 12px",fontWeight:700}}>CELKEM</td>
          <td style={{padding:"10px 12px",fontWeight:800,textAlign:"center"}}>{celkemKs} ks</td>
          <td style={{padding:"10px 12px",fontWeight:800,fontSize:14,color:C.accent}}>{celkemCena.toLocaleString("cs")} Kč</td>
          <td/>
        </tr></tfoot>}
      </table>
    </div>

    {modal&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{background:C.surface,borderRadius:18,padding:28,width:"100%",maxWidth:360,boxShadow:"0 20px 60px rgba(0,0,0,.25)"}}>
        <h3 style={{margin:"0 0 18px",fontSize:17,fontWeight:800}}>{modal==="nova"?"Nový zákusek":"Upravit"}</h3>
        {[{l:"Název",k:"nazev",t:"text"},{l:"Cena/ks (Kč)",k:"cena",t:"number"},{l:"Množství",k:"mnozstvi",t:"number"}].map(f=><div key={f.k} style={{marginBottom:11}}>
          <div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:4}}>{f.l}</div>
          <input style={inp} type={f.t} value={form[f.k]} onChange={e=>setForm(p=>({...p,[f.k]:e.target.value}))}/>
        </div>)}
        {form.cena&&form.mnozstvi&&<div style={{background:C.accentS,borderRadius:8,padding:"8px 12px",marginBottom:12,fontSize:13,color:C.accent,fontWeight:600}}>Celkem: {(+form.cena*(+form.mnozstvi)).toLocaleString("cs")} Kč</div>}
        <div style={{display:"flex",gap:10,marginTop:16}}>
          <button onClick={uloz} style={btnC()}>Uložit</button>
          <button onClick={()=>setModal(null)} style={btnC(C.muted,true)}>Zrušit</button>
        </div>
      </div>
    </div>}
  </div>;
}

function TodoTab({projektId}){
  const {data:ukoly,reload}=useData(()=>sb.from("projekty_todo").select("*").eq("projekt_id",projektId).order("created_at"));
  const [form,setForm]=useState({nazev:"",poznamka:""});
  const [pridavam,setPridavam]=useState(false);

  const uloz=async()=>{
    if(!form.nazev.trim())return;
    await sb.from("projekty_todo").insert({projekt_id:projektId,nazev:form.nazev,poznamka:form.poznamka||null,splneno:false});
    setForm({nazev:"",poznamka:""});setPridavam(false);reload();
  };
  const toggle=async(u)=>{await sb.from("projekty_todo").update({splneno:!u.splneno}).eq("id",u.id);reload();};
  const smaz=async(id)=>{await sb.from("projekty_todo").delete().eq("id",id);reload();};

  const hotovo=(ukoly||[]).filter(u=>u.splneno).length;
  const celkem=(ukoly||[]).length;
  const pct=celkem>0?Math.round(hotovo/celkem*100):0;

  const nesplnene=(ukoly||[]).filter(u=>!u.splneno);
  const splnene=(ukoly||[]).filter(u=>u.splneno);

  return <div>
    {/* Progress */}
    {celkem>0&&<div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"14px 18px",marginBottom:16}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:8,fontSize:13}}>
        <span style={{fontWeight:700}}>Hotovo {hotovo} z {celkem}</span>
        <span style={{color:C.muted}}>{pct} %</span>
      </div>
      <div style={{background:C.bg,borderRadius:99,height:8}}>
        <div style={{height:"100%",width:`${pct}%`,background:C.green,borderRadius:99,transition:"width .4s"}}/>
      </div>
    </div>}

    <div style={{display:"flex",justifyContent:"flex-end",marginBottom:16}}>
      <button onClick={()=>setPridavam(true)} style={btnC()}>+ Přidat úkol</button>
    </div>

    {pridavam&&<div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:16,marginBottom:16}}>
      <div style={{marginBottom:10}}>
        <div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:4}}>Co zařídit</div>
        <input style={inp} value={form.nazev} onChange={e=>setForm(p=>({...p,nazev:e.target.value}))} placeholder="např. Zavolat fotografovi" autoFocus onKeyDown={e=>e.key==="Enter"&&uloz()}/>
      </div>
      <div style={{marginBottom:12}}>
        <div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:4}}>Poznámka (volitelně)</div>
        <input style={inp} value={form.poznamka} onChange={e=>setForm(p=>({...p,poznamka:e.target.value}))} placeholder="telefon, termín, odkaz..."/>
      </div>
      <div style={{display:"flex",gap:8}}>
        <button onClick={uloz} style={btnC()}>Přidat</button>
        <button onClick={()=>setPridavam(false)} style={btnC(C.muted,true)}>Zrušit</button>
      </div>
    </div>}

    {/* Nesplněné úkoly */}
    {nesplnene.length>0&&<div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,overflow:"hidden",marginBottom:16}}>
      {nesplnene.map((u,i)=><div key={u.id} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",borderBottom:i<nesplnene.length-1?`1px solid ${C.border}`:"none"}}>
        <div onClick={()=>toggle(u)} style={{width:22,height:22,borderRadius:6,border:`2px solid ${C.border}`,background:"transparent",cursor:"pointer",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}/>
        <div style={{flex:1}}>
          <div style={{fontSize:14,fontWeight:600,color:C.text}}>{u.nazev}</div>
          {u.poznamka&&<div style={{fontSize:12,color:C.muted,marginTop:2}}>{u.poznamka}</div>}
        </div>
        <button onClick={()=>smaz(u.id)} style={{background:"none",border:"none",cursor:"pointer",color:C.dim,fontSize:13,padding:"2px 6px"}} onMouseEnter={e=>e.currentTarget.style.color=C.red} onMouseLeave={e=>e.currentTarget.style.color=C.dim}>✕</button>
      </div>)}
    </div>}

    {/* Splněné úkoly */}
    {splnene.length>0&&<div>
      <div style={{fontSize:12,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:.6,marginBottom:8}}>✓ Hotovo ({splnene.length})</div>
      <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,overflow:"hidden",opacity:.7}}>
        {splnene.map((u,i)=><div key={u.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 16px",borderBottom:i<splnene.length-1?`1px solid ${C.border}`:"none"}}>
          <div onClick={()=>toggle(u)} style={{width:22,height:22,borderRadius:6,border:`2px solid ${C.green}`,background:C.green,cursor:"pointer",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:13}}>✓</div>
          <div style={{flex:1}}>
            <div style={{fontSize:14,color:C.dim,textDecoration:"line-through"}}>{u.nazev}</div>
            {u.poznamka&&<div style={{fontSize:12,color:C.dim,marginTop:2}}>{u.poznamka}</div>}
          </div>
          <button onClick={()=>smaz(u.id)} style={{background:"none",border:"none",cursor:"pointer",color:C.dim,fontSize:13,padding:"2px 6px"}}>✕</button>
        </div>)}
      </div>
    </div>}

    {(ukoly||[]).length===0&&!pridavam&&<div style={{textAlign:"center",padding:40,color:C.dim}}>
      <div style={{fontSize:32,marginBottom:8}}>✅</div>
      <div style={{fontSize:14}}>Žádné úkoly — přidej co je potřeba zařídit</div>
    </div>}
  </div>;
}

function ProjektUkoly({projektId}){
  const {data:ukoly,reload}=useData(()=>sb.from("projekt_ukoly").select("*").eq("projekt_id",projektId).order("poradi"),[projektId]);
  const [novy,setNovy]=useState("");
  const toggle=async(u)=>{await sb.from("projekt_ukoly").update({splneno:!u.splneno}).eq("id",u.id);reload();};
  const pridej=async()=>{const n=novy.trim();if(!n)return;await sb.from("projekt_ukoly").insert({projekt_id:projektId,nazev:n,poradi:(ukoly||[]).length});setNovy("");reload();};
  const smaz=async(u)=>{await sb.from("projekt_ukoly").delete().eq("id",u.id);reload();};
  return <div>
    <div style={{display:"flex",flexDirection:"column",gap:4,marginBottom:8}}>
      {(ukoly||[]).map(u=><div key={u.id} style={{display:"flex",alignItems:"center",gap:8}}>
        <div onClick={()=>toggle(u)} style={{width:18,height:18,borderRadius:4,border:`2px solid ${u.splneno?C.green:C.border}`,background:u.splneno?C.green:"transparent",cursor:"pointer",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:11}}>{u.splneno?"✓":""}</div>
        <span style={{flex:1,fontSize:12,color:u.splneno?C.dim:C.text,textDecoration:u.splneno?"line-through":"none"}}>{u.nazev}</span>
        <button onClick={()=>smaz(u)} style={{background:"none",border:"none",cursor:"pointer",color:C.dim,fontSize:11,padding:"1px 4px"}}>✕</button>
      </div>)}
    </div>
    <div style={{display:"flex",gap:6}}>
      <input style={{...inp,fontSize:12,padding:"5px 8px"}} value={novy} onChange={e=>setNovy(e.target.value)} placeholder="Přidat úkol…" onKeyDown={e=>e.key==="Enter"&&pridej()}/>
      <button onClick={pridej} style={{...btnC(C.accent,true),padding:"5px 10px",fontSize:12}}>+</button>
    </div>
  </div>;
}

function ProjektModal({projekt,onClose,onSaved}){
  const isNew=!projekt;
  const [f,setF]=useState({nazev:projekt?.nazev||"",popis:projekt?.popis||"",stav:projekt?.stav||"plan",priorita:projekt?.priorita||"normal",barva:projekt?.barva||"#3b6fd4",emoji:projekt?.emoji||"🏗",rozpocet:projekt?.rozpocet||""});
  const [saving,setSaving]=useState(false);const set=k=>e=>setF(p=>({...p,[k]:e.target.value}));
  const uloz=async()=>{if(!f.nazev.trim())return;setSaving(true);const data={...f,rozpocet:f.rozpocet?+f.rozpocet:null};if(isNew)await sb.from("projekty").insert(data);else await sb.from("projekty").update(data).eq("id",projekt.id);setSaving(false);onSaved();};
  return <Modal title={isNew?"Nový projekt":"Upravit projekt"} onClose={onClose}>
    <Field label="Název"><input style={inp} value={f.nazev} onChange={set("nazev")} autoFocus/></Field>
    <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:6}}><button onClick={onClose} style={btnC(C.muted,true)}>Zrušit</button><button onClick={uloz} disabled={saving} style={btnC()}>{saving?"…":"Uložit"}</button></div>
  </Modal>;
}

// ══════════════════════════════════════════════════════════════════════════════


// ── ALIMENTY TAB ─────────────────────────────────────────────────────────────
const ALIM_META={
  spisZnacka:"12 Nc 1801/2024",
  matka:"Milada Míková",matkaShort:"Matka",
  otec:"Miroslav Šíma",otecShort:"Otec",
  deti:["Sylvestr Míka","John Míka"],
};
const KOMU_OPTS=[
  {v:"matce",l:"Matce ("+ALIM_META.matka+")"},
  {v:"otci", l:"Otci ("+ALIM_META.otec+")"},
  {v:"skolka",l:"Školka"},
  {v:"lekar", l:"Lékař"},
  {v:"jine",  l:"Jiné..."},
];

function AlimentyTab(){
  const [zalozka,setZalozka]=useState("vyuctovani");
  const {data:sazby,reload:reloadSazby}=useData(()=>sb.from("alimenty_sazby").select("*").order("platnost_od"));
  const {data:platby,reload:reloadPlatby}=useData(()=>sb.from("alimenty_platby").select("*").order("datum",{ascending:true}));
  const {data:mimoradne,reload:reloadMim}=useData(()=>sb.from("alimenty_mimoradne").select("*").order("datum",{ascending:true}));
  const {data:nastaveni,reload:reloadNast}=useData(()=>sb.from("alimenty_nastaveni").select("*"));

  const {data:slatky_dluhu,reload:reloadSplatky}=useData(()=>sb.from("alimenty_splatky_dluhu").select("*").order("datum",{ascending:false}));
  const {data:ucty}=useData(()=>sb.from("fin_ucty").select("id,nazev").eq("aktivni",true).order("poradi"));
  const {data:kategorieFin}=useData(()=>sb.from("fin_kategorie").select("id,nazev,typ").order("poradi"));

  // Výchozí účet pro alimenty = Moneta běžný (fallback první účet)
  const monetaId=(ucty||[]).find(u=>/moneta\s*běžný/i.test(u.nazev||""))?.id || (ucty||[])[0]?.id || null;
  const alimentyKatId=(kategorieFin||[]).find(k=>/aliment/i.test(k.nazev||""))?.id||null;
  const detiKatId=(kategorieFin||[]).find(k=>/^děti$|^deti$/i.test(k.nazev||""))?.id||null;

  // Najde (nebo založí) kategorii dle názvu a vrátí její id.
  const ensureKat=async(nazev,emoji,typ,barva)=>{
    const {data:ex}=await sb.from("fin_kategorie").select("id").ilike("nazev",nazev).limit(1);
    if(ex&&ex[0]) return ex[0].id;
    const {data:nk}=await sb.from("fin_kategorie").insert({nazev,emoji,typ,barva,poradi:900}).select("id").single();
    return nk?.id||null;
  };

  // Zrcadlení platby do cashflow (fin_transakce): otec→matce = příjem (+), matka→otci = výdaj (−).
  // Promítne se jen platba s reálným datem a nenulovou částkou. Drží se 1:1 přes alimenty_platby.fin_transakce_id.
  const syncPlatbaDoCashflow=async(p)=>{
    if(!p) return;
    const aktivni = p.typ==="alimenty" && p.datum && Number(p.castka)>0 && (p.ucet_id||monetaId);
    if(aktivni){
      const prijem = p.kdo_plati==="otec"; // otec platí matce = příjem; matka platí otci = výdaj
      const katId = alimentyKatId || await ensureKat("Alimenty","⚖️","prijem","#c0392b");
      const tData={
        ucet_id:p.ucet_id||monetaId,
        datum:p.datum,
        castka:(prijem?1:-1)*Math.abs(Number(p.castka)),
        kategorie_id:katId,
        popis:`Alimenty${p.mesic?" "+p.mesic:""} (${p.kdo_plati}→${p.komu||""})`.trim(),
        protistrana:"Alimenty Šíma",
        typ:prijem?"prijem":"vydaj",
        prevod_ucet_id:null,
      };
      if(p.fin_transakce_id){
        await sb.from("fin_transakce").update(tData).eq("id",p.fin_transakce_id);
      } else {
        const {data:nova}=await sb.from("fin_transakce").insert(tData).select("id").single();
        if(nova?.id) await sb.from("alimenty_platby").update({fin_transakce_id:nova.id}).eq("id",p.id);
      }
    } else if(p.fin_transakce_id){
      // už nesplňuje podmínky (nulová částka / chybí datum) → zruš spárovaný pohyb
      await sb.from("fin_transakce").delete().eq("id",p.fin_transakce_id);
      await sb.from("alimenty_platby").update({fin_transakce_id:null}).eq("id",p.id);
    }
  };

  // KROK 2 — zrcadlení mimořádného dětského výdaje:
  //  • REALITA (fin_transakce): výdaj „Děti" ve výši toho, co reálně odešlo z účtu matky
  //    (její podíl; když platila i za otce, tak celá částka).
  //  • PLÁN (fin_cashflow_plan, aktuální měsíc): očekávaný PŘÍJEM = podíl otce, který dluží zpět
  //    (jen když matka zaplatila za otce). Drží se přes fin_transakce_id / fin_plan_id.
  const syncMimoradneDoCashflow=async(m)=>{
    if(!m) return;
    const ucetId=m.ucet_id||monetaId;
    const vydaj = m.matka_zaplatila_za_otce ? Number(m.castka_celkem) : (m.matka_zaplatila_skolce ? Number(m.podil_matky) : 0);
    const dluhOtce = m.matka_zaplatila_za_otce ? Number(m.podil_otce) : 0;

    // 1) Realita – výdaj na děti
    if(vydaj>0 && ucetId && m.datum){
      const detiKat = detiKatId || await ensureKat("Děti","🧒","vydaj","#e67e22");
      const tData={ucet_id:ucetId,datum:m.datum,castka:-Math.abs(vydaj),kategorie_id:detiKat,popis:`Mimořádné ${m.dite}: ${m.popis||""}`.trim(),protistrana:"Děti / mimořádné",typ:"vydaj",prevod_ucet_id:null};
      if(m.fin_transakce_id) await sb.from("fin_transakce").update(tData).eq("id",m.fin_transakce_id);
      else { const {data:nt}=await sb.from("fin_transakce").insert(tData).select("id").single(); if(nt?.id) await sb.from("alimenty_mimoradne").update({fin_transakce_id:nt.id}).eq("id",m.id); }
    } else if(m.fin_transakce_id){
      await sb.from("fin_transakce").delete().eq("id",m.fin_transakce_id);
      await sb.from("alimenty_mimoradne").update({fin_transakce_id:null}).eq("id",m.id);
    }

    // 2) Plán – očekávaný příjem (podíl otce k vrácení) v měsíci výdaje
    if(dluhOtce>0){
      const d=m.datum?new Date(m.datum):new Date();
      const rok=d.getFullYear(), mesic=d.getMonth()+1;
      const alimKat = alimentyKatId || await ensureKat("Alimenty","⚖️","prijem","#c0392b");
      const planData={rok,mesic,nazev:`Doplatek od otce (${m.dite}): ${m.popis||""}`.trim(),castka:Math.abs(dluhOtce),kategorie_id:alimKat,ucet_id:ucetId,opakovani:"jednorazove",datum_do:null,prevod_ucet_id:null,dite_id:null,zvire_id:null,oprava_id:null,auto_id:null,je_majetek:false,sklad_kategorie_id:null,poznamka:"Podíl otce k vrácení (auto)"};
      if(m.fin_plan_id) await sb.from("fin_cashflow_plan").update(planData).eq("id",m.fin_plan_id);
      else { const {data:np}=await sb.from("fin_cashflow_plan").insert(planData).select("id").single(); if(np?.id) await sb.from("alimenty_mimoradne").update({fin_plan_id:np.id}).eq("id",m.id); }
    } else if(m.fin_plan_id){
      await sb.from("fin_cashflow_plan").delete().eq("id",m.fin_plan_id);
      await sb.from("alimenty_mimoradne").update({fin_plan_id:null}).eq("id",m.id);
    }
  };

  // Auto-vytvoření plateb pro aktuální měsíc pokud chybí
  const autoVytvorRef=useRef(false);
  useEffect(()=>{
    if(autoVytvorRef.current)return;
    if(!Array.isArray(platby))return;
    autoVytvorRef.current=true;
    const dnes=new Date();
    const aktMesic=`${dnes.getFullYear()}-${String(dnes.getMonth()+1).padStart(2,"0")}`;
    const maPlatbaOtec=platby.some(p=>p.mesic===aktMesic&&p.kdo_plati==="otec");
    const maPlatbaMatka=platby.some(p=>p.mesic===aktMesic&&p.kdo_plati==="matka");
    const vytvorit=[];
    if(!maPlatbaOtec)vytvorit.push({mesic:aktMesic,typ:"alimenty",kdo_plati:"otec",komu:"matce",castka:0,datum:null,poznamka:null});
    if(!maPlatbaMatka)vytvorit.push({mesic:aktMesic,typ:"alimenty",kdo_plati:"matka",komu:"otci",castka:0,datum:null,poznamka:null});
    if(vytvorit.length>0){
      sb.from("alimenty_platby").insert(vytvorit).then(()=>reloadPlatby());
    }
  },[platby]);

  const nast=Object.fromEntries((nastaveni||[]).map(r=>[r.klic,r.hodnota]));
  const dluhCelkem=parseInt(nast.dluh_celkem||"53250");
  const dluhSplaceno=parseInt(nast.dluh_splaceno||"0");
  const dluhZbyva=Math.max(0,dluhCelkem-dluhSplaceno);
  const splatkaM=2500;
  const SPLATKA_OD="2026-06"; // splácení začíná od června 2026 — natvrdo dle rozsudku

  // Sazba pro měsíc (součet Sylvestr+John, otec→matce) + splátka dluhu od června 2026
  const getSazbaProMesic=(mesicStr)=>{
    const d=new Date(mesicStr+"-01");
    let total=0;
    ["Sylvestr","John"].forEach(dite=>{
      const s=(sazby||[]).filter(r=>r.smer==="otec_matce"&&r.dite===dite).find(r=>{
        const od=new Date(r.platnost_od);
        const do_=r.platnost_do?new Date(r.platnost_do):null;
        return od<=d&&(!do_||do_>=d);
      });
      if(s)total+=s.castka;
    });
    if(mesicStr>=SPLATKA_OD)total+=splatkaM;
    return total;
  };

  const getSazbaMatkaOtec=(mesicStr)=>{
    const d=new Date(mesicStr+"-01");
    let total=0;
    ["Sylvestr","John"].forEach(dite=>{
      const s=(sazby||[]).filter(r=>r.smer==="matka_otci"&&r.dite===dite).find(r=>{
        const od=new Date(r.platnost_od);
        const do_=r.platnost_do?new Date(r.platnost_do):null;
        return od<=d&&(!do_||do_>=d);
      });
      if(s)total+=s.castka;
    });
    return total;
  };

  // KROK 1 — promítnutí očekávané sazby alimentů do cashflow plánu (jen tento + příští měsíc).
  // Jediný řádek „Alimenty Šíma" = základní sazba BEZ splátky dluhu (ta se přidá ručně, až poběží).
  // Minulé/zamčené měsíce se nedotýká. Ruční řádky (Tereza, kluci…) se NEMĚNÍ.
  const promitniPlanAlimentu=async(silent)=>{
    const d=new Date();
    const cur={rok:d.getFullYear(),mesic:d.getMonth()+1};
    const nm = cur.mesic===12?{rok:cur.rok+1,mesic:1}:{rok:cur.rok,mesic:cur.mesic+1};
    const katId = alimentyKatId || await ensureKat("Alimenty","⚖️","prijem","#c0392b");
    const baseCols={kategorie_id:katId,ucet_id:monetaId,opakovani:"jednorazove",datum_do:null,prevod_ucet_id:null,dite_id:null,zvire_id:null,oprava_id:null,auto_id:null,je_majetek:false,sklad_kategorie_id:null,poznamka:"Očekávaná sazba alimentů Šíma (auto, bez splátky dluhu)"};
    for(const mm of [cur,nm]){
      const key=`${mm.rok}-${String(mm.mesic).padStart(2,"0")}`;
      // úklid starých auto-řádků z předchozí verze (sloučené 9 000 / −2 500)
      await sb.from("fin_cashflow_plan").delete().eq("rok",mm.rok).eq("mesic",mm.mesic).in("nazev",["Alimenty (otec → matka)","Alimenty (matka → otec)"]);
      // očekávaná alimentová sazba BEZ splátky dluhu
      const base = Math.abs((getSazbaProMesic(key)||0) - (key>=SPLATKA_OD?splatkaM:0));
      const {data:ex}=await sb.from("fin_cashflow_plan").select("id").eq("rok",mm.rok).eq("mesic",mm.mesic).eq("nazev","Alimenty Šíma").limit(1);
      if(base>0){
        const data={rok:mm.rok,mesic:mm.mesic,nazev:"Alimenty Šíma",castka:base,...baseCols};
        if(ex&&ex[0]) await sb.from("fin_cashflow_plan").update(data).eq("id",ex[0].id);
        else await sb.from("fin_cashflow_plan").insert(data);
      } else if(ex&&ex[0]) {
        await sb.from("fin_cashflow_plan").delete().eq("id",ex[0].id);
      }
    }
    if(!silent) alert("Hotovo — Alimenty Šíma (6 500) promítnuty do plánu (tento + příští měsíc).");
  };

  // Automatika: po načtení sazeb/účtů se očekávané alimenty samy promítnou do cashflow plánu
  // (tento + příští měsíc). Běží jednou za otevření modulu; minulé/zamčené měsíce se netýká.
  const planAutoRef=useRef(false);
  useEffect(()=>{
    if(planAutoRef.current) return;
    if(sazby===null||ucty===null||kategorieFin===null) return;
    planAutoRef.current=true;
    promitniPlanAlimentu(true);
  },[sazby,ucty,kategorieFin]);
  const mesice=[];
  const mesiceAktualni=[];
  const mStart=new Date(2026,3,1);
  const mNow=new Date();
  const mKonec=new Date(mNow.getFullYear(),mNow.getMonth()+13,1);
  const mNowStr=`${mNow.getFullYear()}-${String(mNow.getMonth()+1).padStart(2,"0")}`;
  const dateToMesic=(d)=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
  for(let d=new Date(mStart);d<mKonec;d.setMonth(d.getMonth()+1)){
    const str=dateToMesic(new Date(d));
    mesice.push(str);
    if(str<=mNowStr)mesiceAktualni.push(str);
  }

  const reloadAll=()=>{reloadPlatby();reloadMim();reloadNast()};

  // ── Sdílený modal Přidat platbu ──
  const [pridatModal,setPridatModal]=useState(false);
  const pridatForm0={typ:"alimenty",kdo_plati:"otec",komu:"matce",komu_text:"",mesic:mesice[mesice.length-1]||"",datum:"",castka:"",poznamka:"",ucet_id:""};
  const [pf,setPf]=useState(pridatForm0);

  const napoveda=()=>{
    if(pf.typ==="alimenty"&&pf.kdo_plati==="otec"&&pf.komu==="matce"&&pf.mesic){
      const s=getSazbaProMesic(pf.mesic);
      return s?`Dle rozsudku: ${s.toLocaleString("cs")} Kč${true?" (vč. "+splatkaM.toLocaleString("cs")+" Kč splátka dluhu)":""}`:null;
    }
    return null;
  };

  const ulozPlatbu=async()=>{
    const data={
      typ:pf.typ,kdo_plati:pf.kdo_plati,komu:pf.komu,komu_text:pf.komu_text||null,
      mesic:pf.typ==="alimenty"?pf.mesic:null,
      datum:pf.datum||null,
      castka:parseInt(pf.castka),poznamka:pf.poznamka||null,
    };
    await sb.from("alimenty_platby").insert(data);
    reloadPlatby();setPridatModal(false);setPf(pridatForm0);
  };

  // ── Export XLSX ──
  const exportXLSX=async()=>{
    const X=await import("xlsx");
    const wb=X.utils.book_new();
    const hlavicka=[
      ["EVIDENCE ALIMENTŮ — OSPOD"],
      [`Spisová značka: ${ALIM_META.spisZnacka}`],
      [`Otec: ${ALIM_META.otec}     Matka: ${ALIM_META.matka}`],
      [`Děti: ${ALIM_META.deti.join(", ")}`],
      [`Datum tisku: ${new Date().toLocaleDateString("cs-CZ")}`],
      [],
    ];

    // List 1: Alimenty
    const alimData=(platby||[]).filter(p=>p.typ==="alimenty");
    const ws1=X.utils.aoa_to_sheet([
      ...hlavicka,
      ["Měsíc","Kdo platí","Komu","Částka (Kč)","Datum platby","Poznámka"],
      ...alimData.map(p=>[
        p.mesic?new Date(p.mesic+"-01").toLocaleDateString("cs-CZ",{month:"long",year:"numeric"}):"",
        p.kdo_plati==="otec"?ALIM_META.otec:ALIM_META.matka,
        KOMU_OPTS.find(o=>o.v===p.komu)?.l.split(" (")[0]||p.komu_text||p.komu,
        p.castka,
        p.datum?new Date(p.datum).toLocaleDateString("cs-CZ"):"",
        p.poznamka||"",
      ]),
      [],
      ["CELKEM","","",alimData.reduce((a,p)=>a+p.castka,0),"",""],
    ]);
    ws1["!cols"]=[{wch:18},{wch:20},{wch:16},{wch:14},{wch:14},{wch:30}];
    X.utils.book_append_sheet(wb,ws1,"Alimenty");

    // List 2: Mimořádné výdaje
    const ws2=X.utils.aoa_to_sheet([
      ...hlavicka,
      ["Datum","Popis","Dítě","Celková částka","Podíl matky","Podíl otce","Matka zaplatila","Otec zaplatil","Dluh vůči školce","Dluh mezi rodiči","Poznámka"],
      ...(mimoradne||[]).map(m=>{
        const dluhSkolka=[];
        if(!m.matka_zaplatila_skolce)dluhSkolka.push(`Matka: ${m.podil_matky.toLocaleString("cs")} Kč`);
        if(!m.otec_zaplatil_skolce)dluhSkolka.push(`Otec: ${m.podil_otce.toLocaleString("cs")} Kč`);
        const dluhRodice=[];
        if(m.otec_zaplatil_za_matku)dluhRodice.push(`Matka dluží otci: ${m.podil_matky.toLocaleString("cs")} Kč`);
        if(m.matka_zaplatila_za_otce)dluhRodice.push(`Otec dluží matce: ${m.podil_otce.toLocaleString("cs")} Kč`);
        return [
          new Date(m.datum).toLocaleDateString("cs-CZ"),
          m.popis,m.dite,
          m.castka_celkem,m.podil_matky,m.podil_otce,
          m.matka_zaplatila_skolce?"✓":"✗",
          m.otec_zaplatil_skolce?"✓":"✗",
          dluhSkolka.join("; ")||"—",
          dluhRodice.join("; ")||"—",
          m.poznamka||"",
        ];
      }),
      [],
      ["CELKEM","","",(mimoradne||[]).reduce((a,m)=>a+m.castka_celkem,0),"","","","","","",""],
    ]);
    ws2["!cols"]=[{wch:12},{wch:22},{wch:12},{wch:14},{wch:13},{wch:12},{wch:14},{wch:13},{wch:24},{wch:26},{wch:24}];
    X.utils.book_append_sheet(wb,ws2,"Mimořádné výdaje");

    X.writeFile(wb,`alimenty_OSPOD_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  // ── ZÁLOŽKA: PŘEHLED ──
  const PrehledView=()=>{
    const [razeni,setRazeni]=useState("asc");
    const [editAlim,setEditAlim]=useState(null); // platba k editaci
    const [editMim,setEditMim]=useState(null);   // mimořádný k editaci
    const [editFormA,setEditFormA]=useState({});
    const [editFormM,setEditFormM]=useState({});

    const [splatkaModal,setSplatkaModal]=useState(false);
    const [splatkaForm,setSplatkaForm]=useState({datum:new Date().toISOString().slice(0,10),castka:"2500",kdo_plati:"otec",poznamka:""});

    const ulozSplatku=async()=>{
      await sb.from("alimenty_splatky_dluhu").insert({datum:splatkaForm.datum,castka:+splatkaForm.castka,kdo_plati:splatkaForm.kdo_plati,poznamka:splatkaForm.poznamka||null});
      reloadSplatky();setSplatkaModal(false);
    };
    const smazSplatku=async(id)=>{if(!confirm("Smazat splátku?"))return;await sb.from("alimenty_splatky_dluhu").delete().eq("id",id);reloadSplatky();};

    const alimenty=(platby||[]).filter(p=>p.typ==="alimenty").sort((a,b)=>{
      const cmp=(a.mesic||"").localeCompare(b.mesic||"");
      return razeni==="asc"?cmp:-cmp;
    });
    const zaplaceneMesice=new Set(alimenty.map(p=>p.mesic));
    const chybejiciMesice=mesiceAktualni.filter(m=>!zaplaceneMesice.has(m));

    // Opravená logika mimořádných výdajů
    const mimInfo=(m)=>{
      // Kdo zaplatil školce?
      const matkaZaplatilaSkolce=m.matka_zaplatila_skolce||m.matka_zaplatila_za_otce;
      const otecZaplatilSkolce=m.otec_zaplatil_skolce||m.otec_zaplatil_za_matku;
      // Dluhy školce
      const dluhSkolka=[];
      if(!matkaZaplatilaSkolce)dluhSkolka.push(`Matka: ${m.podil_matky.toLocaleString("cs")} Kč`);
      if(!otecZaplatilSkolce)dluhSkolka.push(`Otec: ${m.podil_otce.toLocaleString("cs")} Kč`);
      // Dluhy mezi rodiči
      const dluhRodice=[];
      if(m.matka_zaplatila_za_otce)dluhRodice.push(`Otec dluží matce: ${m.podil_otce.toLocaleString("cs")} Kč`);
      if(m.otec_zaplatil_za_matku)dluhRodice.push(`Matka dluží otci: ${m.podil_matky.toLocaleString("cs")} Kč`);
      return {matkaZaplatilaSkolce,otecZaplatilSkolce,dluhSkolka,dluhRodice};
    };

    const ulozEditAlim=async()=>{
      const {data:upr}=await sb.from("alimenty_platby").update({
        kdo_plati:editFormA.kdo_plati,komu:editFormA.komu,komu_text:editFormA.komu_text||null,
        mesic:editFormA.mesic,castka:parseInt(editFormA.castka),
        datum:editFormA.datum||null,poznamka:editFormA.poznamka||null,
        ucet_id:editFormA.ucet_id||monetaId||null,
      }).eq("id",editAlim.id).select().single();
      if(upr) await syncPlatbaDoCashflow(upr);
      reloadPlatby();setEditAlim(null);
    };
    const smazAlim=async(id)=>{
      if(!confirm("Smazat tuto platbu?"))return;
      const {data:row}=await sb.from("alimenty_platby").select("fin_transakce_id").eq("id",id).single();
      if(row?.fin_transakce_id) await sb.from("fin_transakce").delete().eq("id",row.fin_transakce_id);
      await sb.from("alimenty_platby").delete().eq("id",id);
      reloadPlatby();
    };

    const ulozEditMim=async()=>{
      const celkem=parseInt(editFormM.castka_celkem);
      const {data:upr}=await sb.from("alimenty_mimoradne").update({
        datum:editFormM.datum,popis:editFormM.popis,dite:editFormM.dite,
        castka_celkem:celkem,podil_matky:Math.round(celkem/2),podil_otce:Math.round(celkem/2),
        matka_zaplatila_skolce:editFormM.matka_zaplatila_skolce,
        otec_zaplatil_skolce:editFormM.otec_zaplatil_skolce,
        matka_zaplatila_za_otce:editFormM.matka_zaplatila_za_otce,
        otec_zaplatil_za_matku:editFormM.otec_zaplatil_za_matku,
        poznamka:editFormM.poznamka||null,
        ucet_id:editFormM.ucet_id||monetaId||null,
      }).eq("id",editMim.id).select().single();
      if(upr) await syncMimoradneDoCashflow(upr);
      reloadMim();setEditMim(null);
    };
    const smazMim=async(id)=>{
      if(!confirm("Smazat tento výdaj?"))return;
      const {data:row}=await sb.from("alimenty_mimoradne").select("fin_transakce_id,fin_plan_id").eq("id",id).single();
      if(row?.fin_transakce_id) await sb.from("fin_transakce").delete().eq("id",row.fin_transakce_id);
      if(row?.fin_plan_id) await sb.from("fin_cashflow_plan").delete().eq("id",row.fin_plan_id);
      await sb.from("alimenty_mimoradne").delete().eq("id",id);
      reloadMim();
    };

    return <div>
      {/* Dlaždice pro mimořádný výdaj a splátku dluhu */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:24}}>
        <div onClick={()=>{setPf({...pridatForm0,typ:"mimoradne"});setPridatModal(true);}}
          style={{background:"#e8922a",border:"none",borderRadius:16,padding:"20px",cursor:"pointer",display:"flex",alignItems:"center",gap:16,transition:"all .2s",boxShadow:"0 4px 14px rgba(232,146,42,.35)"}}>
          <div style={{fontSize:28}}>📋</div>
          <div>
            <div style={{fontWeight:800,fontSize:14,color:"#fff"}}>+ Mimořádný výdaj</div>
            <div style={{fontSize:11,color:"rgba(255,255,255,.8)"}}>Školka, lékař...</div>
          </div>
        </div>
        <div onClick={()=>setSplatkaModal(true)}
          style={{background:"#5b8ef0",border:"none",borderRadius:16,padding:"20px",cursor:"pointer",display:"flex",alignItems:"center",gap:16,transition:"all .2s",boxShadow:"0 4px 14px rgba(91,142,240,.35)"}}>
          <div style={{fontSize:28}}>💳</div>
          <div>
            <div style={{fontWeight:800,fontSize:14,color:"#fff"}}>+ Splátka dluhu</div>
            <div style={{fontSize:11,color:"rgba(255,255,255,.8)"}}>Soudně nařízená splátka</div>
          </div>
        </div>
      </div>

      <div style={{fontSize:11.5,color:C.dim,marginBottom:20,textAlign:"center",fontStyle:"italic"}}>
        📅 Očekávané alimenty se do cashflow plánu (tento + příští měsíc) doplňují automaticky dle sazeb.
      </div>

      {chybejiciMesice.length>0&&<div style={{background:C.orangeS,border:`1px solid ${C.orange}`,borderRadius:10,padding:"12px 16px",marginBottom:20,fontSize:13,color:C.orange}}>
        ⚠ Chybí platba za: {chybejiciMesice.map(m=>new Date(m+"-01").toLocaleDateString("cs-CZ",{month:"long",year:"numeric"})).join(", ")}
      </div>}

      {/* Tabulka alimentů */}
      <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,overflow:"hidden",marginBottom:28}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 18px",borderBottom:`1px solid ${C.border}`}}>
          <span style={{fontWeight:800,fontSize:15,color:C.text}}>Alimenty</span>
          <button onClick={()=>setRazeni(r=>r==="asc"?"desc":"asc")} style={{...btnC(C.muted,true),padding:"5px 12px",fontSize:12}}>
            {razeni==="asc"?"↑ Nejstarší první":"↓ Nejnovější první"}
          </button>
        </div>
        <div style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
        <table style={{width:"100%",borderCollapse:"collapse",minWidth:600}}>
          <thead><tr style={{background:C.bg}}>
            {["Měsíc","Kdo platí","Komu","Má být","Zaplaceno","Rozdíl","Datum platby","Poznámka",""].map(h=><th key={h} style={{padding:"9px 12px",textAlign:"left",fontSize:11,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:.5,whiteSpace:"nowrap"}}>{h}</th>)}
          </tr></thead>
          <tbody>
            {alimenty.length===0&&<tr><td colSpan={9} style={{padding:24,textAlign:"center",color:C.dim,fontSize:13}}>Zatím žádné platby</td></tr>}
            {alimenty.map((p,i)=>{
              const maByt=p.kdo_plati==="otec"&&p.komu==="matce"?getSazbaProMesic(p.mesic||"")-((p.mesic||"")>=SPLATKA_OD?splatkaM:0):p.kdo_plati==="matka"&&p.komu==="otci"?getSazbaMatkaOtec(p.mesic||""):null;
              const rozdil=maByt!=null?p.castka-maByt:null;
              return <tr key={p.id} style={{background:i%2===0?C.surface:"#fafbff",borderBottom:`1px solid ${C.border}`}}>
                <td style={{padding:"10px 12px",fontWeight:600,fontSize:13,whiteSpace:"nowrap"}}>{p.mesic?new Date(p.mesic+"-01").toLocaleDateString("cs-CZ",{month:"long",year:"numeric"}):""}</td>
                <td style={{padding:"10px 12px",fontSize:13}}>{p.kdo_plati==="otec"?ALIM_META.otec:ALIM_META.matka}</td>
                <td style={{padding:"10px 12px",fontSize:13}}>{KOMU_OPTS.find(o=>o.v===p.komu)?.l.split(" (")[0]||p.komu_text||p.komu}</td>
                <td style={{padding:"10px 12px",fontSize:13,color:C.muted}}>{maByt!=null?`${maByt.toLocaleString("cs")} Kč`:"—"}</td>
                <td style={{padding:"10px 12px",fontSize:13,fontWeight:700}}>{p.castka.toLocaleString("cs")} Kč</td>
                <td style={{padding:"10px 12px",fontSize:13,fontWeight:700,color:rozdil==null?C.dim:rozdil>=0?C.green:C.red}}>{rozdil!=null?(rozdil>=0?"+":"")+rozdil.toLocaleString("cs")+" Kč":"—"}</td>
                <td style={{padding:"10px 12px",fontSize:12,color:C.muted,whiteSpace:"nowrap"}}>{p.datum?new Date(p.datum).toLocaleDateString("cs-CZ"):"—"}</td>
                <td style={{padding:"10px 12px",fontSize:12,color:C.muted}}>{p.poznamka||""}</td>
                <td style={{padding:"10px 8px",whiteSpace:"nowrap"}}>
                  <button onClick={()=>{setEditAlim(p);setEditFormA({kdo_plati:p.kdo_plati,komu:p.komu,komu_text:p.komu_text||"",mesic:p.mesic||"",castka:String(p.castka),datum:p.datum||"",poznamka:p.poznamka||"",ucet_id:p.ucet_id||""});}} style={{...btnC(C.accent,true),padding:"3px 8px",fontSize:11,marginRight:4}}>✏</button>
                  <button onClick={()=>smazAlim(p.id)} style={{...btnC(C.red,true),padding:"3px 8px",fontSize:11}}>🗑</button>
                </td>
              </tr>;
            })}
          </tbody>
          {alimenty.length>0&&<tfoot>
            <tr style={{background:C.bg,borderTop:`2px solid ${C.border}`}}>
              <td colSpan={4} style={{padding:"8px 12px",fontWeight:600,fontSize:12,color:C.muted}}>{ALIM_META.otec} zaplatil</td>
              <td style={{padding:"8px 12px",fontWeight:700,fontSize:13,color:C.accent}}>{alimenty.filter(p=>p.kdo_plati==="otec").reduce((a,p)=>a+p.castka,0).toLocaleString("cs")} Kč</td>
              <td colSpan={4}/>
            </tr>
            <tr style={{background:C.bg}}>
              <td colSpan={4} style={{padding:"8px 12px",fontWeight:600,fontSize:12,color:C.muted}}>{ALIM_META.matka} zaplatila</td>
              <td style={{padding:"8px 12px",fontWeight:700,fontSize:13,color:C.accent}}>{alimenty.filter(p=>p.kdo_plati==="matka").reduce((a,p)=>a+p.castka,0).toLocaleString("cs")} Kč</td>
              <td colSpan={4}/>
            </tr>
            <tr style={{background:C.bg,borderTop:`1px solid ${C.border}`}}>
              <td colSpan={4} style={{padding:"10px 12px",fontWeight:800,fontSize:13}}>CELKEM</td>
              <td style={{padding:"10px 12px",fontWeight:800,fontSize:14,color:C.accent}}>{alimenty.reduce((a,p)=>a+p.castka,0).toLocaleString("cs")} Kč</td>
              <td colSpan={4}/>
            </tr>
          </tfoot>}
        </table>
        </div>
      </div>

      {/* Tabulka mimořádných výdajů */}
      <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,overflow:"hidden"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 18px",borderBottom:`1px solid ${C.border}`}}>
          <span style={{fontWeight:800,fontSize:15,color:C.text}}>Mimořádné výdaje</span>
        </div>
        <div style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
        <table style={{width:"100%",borderCollapse:"collapse",minWidth:700}}>
          <thead><tr style={{background:C.bg}}>
            {["Datum","Popis","Dítě","Celkem","Podíl matky","Podíl otce","M. zaplatila","O. zaplatil","Dluh školce","Dluh mezi rodiči",""].map(h=><th key={h} style={{padding:"9px 10px",textAlign:"left",fontSize:11,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:.4,whiteSpace:"nowrap"}}>{h}</th>)}
          </tr></thead>
          <tbody>
            {(mimoradne||[]).length===0&&<tr><td colSpan={11} style={{padding:24,textAlign:"center",color:C.dim,fontSize:13}}>Zatím žádné mimořádné výdaje</td></tr>}
            {(mimoradne||[]).map((m,i)=>{
              const {matkaZaplatilaSkolce,otecZaplatilSkolce,dluhSkolka,dluhRodice}=mimInfo(m);
              return <tr key={m.id} style={{background:i%2===0?C.surface:"#fafbff",borderBottom:`1px solid ${C.border}`}}>
                <td style={{padding:"9px 10px",fontSize:12,color:C.muted,whiteSpace:"nowrap"}}>{new Date(m.datum).toLocaleDateString("cs-CZ")}</td>
                <td style={{padding:"9px 10px",fontSize:13,fontWeight:600}}>{m.popis}</td>
                <td style={{padding:"9px 10px",fontSize:12}}>{m.dite}</td>
                <td style={{padding:"9px 10px",fontSize:13,fontWeight:700}}>{m.castka_celkem.toLocaleString("cs")} Kč</td>
                <td style={{padding:"9px 10px",fontSize:12}}>{m.podil_matky.toLocaleString("cs")} Kč</td>
                <td style={{padding:"9px 10px",fontSize:12}}>{m.podil_otce.toLocaleString("cs")} Kč</td>
                <td style={{padding:"9px 10px",fontSize:14,textAlign:"center",color:matkaZaplatilaSkolce?C.green:C.red}}>{matkaZaplatilaSkolce?"✓":"✗"}</td>
                <td style={{padding:"9px 10px",fontSize:14,textAlign:"center",color:otecZaplatilSkolce?C.green:C.red}}>{otecZaplatilSkolce?"✓":"✗"}</td>
                <td style={{padding:"9px 10px",fontSize:11,color:dluhSkolka.length?C.red:C.green,fontWeight:dluhSkolka.length?700:400}}>{dluhSkolka.join(", ")||"✓ Vše uhrazeno"}</td>
                <td style={{padding:"9px 10px",fontSize:11,color:dluhRodice.length?C.orange:C.green,fontWeight:dluhRodice.length?700:400}}>{dluhRodice.join(", ")||"✓ Vyrovnáno"}</td>
                <td style={{padding:"9px 8px",whiteSpace:"nowrap"}}>
                  <button onClick={()=>{setEditMim(m);setEditFormM({datum:m.datum,popis:m.popis,dite:m.dite,castka_celkem:String(m.castka_celkem),matka_zaplatila_skolce:m.matka_zaplatila_skolce,otec_zaplatil_skolce:m.otec_zaplatil_skolce,matka_zaplatila_za_otce:m.matka_zaplatila_za_otce,otec_zaplatil_za_matku:m.otec_zaplatil_za_matku,poznamka:m.poznamka||"",ucet_id:m.ucet_id||""});}} style={{...btnC(C.accent,true),padding:"3px 8px",fontSize:11,marginRight:4}}>✏</button>
                  <button onClick={()=>smazMim(m.id)} style={{...btnC(C.red,true),padding:"3px 8px",fontSize:11}}>🗑</button>
                </td>
              </tr>;
            })}
          </tbody>
        </table>
        </div>
      </div>
      {editAlim&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
        <div style={{background:C.surface,borderRadius:18,padding:28,width:"100%",maxWidth:420,boxShadow:"0 20px 60px rgba(0,0,0,.25)"}}>
          <h3 style={{margin:"0 0 18px",fontSize:17,fontWeight:800}}>✏ Upravit platbu</h3>
          {[
            {l:"Kdo platí",k:"kdo_plati",t:"select",opts:[{v:"otec",l:ALIM_META.otec},{v:"matka",l:ALIM_META.matka}]},
            {l:"Komu",k:"komu",t:"select",opts:KOMU_OPTS},
            {l:"Za měsíc",k:"mesic",t:"select",opts:mesice.map(m=>({v:m,l:new Date(m+"-01").toLocaleDateString("cs-CZ",{month:"long",year:"numeric"})}))},
            {l:"Zaplacená částka (Kč)",k:"castka",t:"number"},
            {l:"Datum platby",k:"datum",t:"date"},
            {l:"Poznámka",k:"poznamka",t:"text"},
          ].map(f=><div key={f.k} style={{marginBottom:11}}>
            <div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:4}}>{f.l}</div>
            {f.t==="select"?<select style={inp} value={editFormA[f.k]||""} onChange={e=>setEditFormA(p=>({...p,[f.k]:e.target.value}))}>
              {f.opts.map(o=>typeof o==="string"?<option key={o} value={o}>{o}</option>:<option key={o.v} value={o.v}>{o.l}</option>)}
            </select>:<input style={inp} type={f.t} value={editFormA[f.k]||""} onChange={e=>setEditFormA(p=>({...p,[f.k]:e.target.value}))}/>}
          </div>)}
          <div style={{marginBottom:11}}>
            <div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:4}}>Účet (pro cashflow)</div>
            <select style={inp} value={editFormA.ucet_id||monetaId||""} onChange={e=>setEditFormA(p=>({...p,ucet_id:e.target.value}))}>
              {(ucty||[]).map(u=><option key={u.id} value={u.id}>{u.nazev}</option>)}
            </select>
          </div>
          <div style={{display:"flex",gap:10,marginTop:16}}>
            <button onClick={ulozEditAlim} style={btnC()}>Uložit</button>
            <button onClick={()=>setEditAlim(null)} style={btnC(C.muted,true)}>Zrušit</button>
          </div>
        </div>
      </div>}

      {/* Modal editace mimořádného */}
      {editMim&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
        <div style={{background:C.surface,borderRadius:18,padding:28,width:"100%",maxWidth:440,boxShadow:"0 20px 60px rgba(0,0,0,.25)",maxHeight:"90vh",overflowY:"auto"}}>
          <h3 style={{margin:"0 0 18px",fontSize:17,fontWeight:800}}>✏ Upravit mimořádný výdaj</h3>
          {[
            {l:"Datum",k:"datum",t:"date"},
            {l:"Popis",k:"popis",t:"text"},
            {l:"Dítě",k:"dite",t:"select",opts:["Oba","Sylvestr","John"]},
            {l:"Celková částka (Kč)",k:"castka_celkem",t:"number"},
          ].map(f=><div key={f.k} style={{marginBottom:11}}>
            <div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:4}}>{f.l}</div>
            {f.t==="select"?<select style={inp} value={editFormM[f.k]||""} onChange={e=>setEditFormM(p=>({...p,[f.k]:e.target.value}))}>
              {f.opts.map(o=><option key={o} value={o}>{o}</option>)}
            </select>:<input style={inp} type={f.t} value={editFormM[f.k]||""} onChange={e=>setEditFormM(p=>({...p,[f.k]:e.target.value}))}/>}
          </div>)}
          <div style={{background:C.bg,borderRadius:10,padding:"12px 14px",marginBottom:14}}>
            <div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:10}}>Kdo zaplatil třetí straně / za koho?</div>
            {[
              {k:"matka_zaplatila_skolce",l:"Matka zaplatila svůj podíl přímo"},
              {k:"otec_zaplatil_skolce",  l:"Otec zaplatil svůj podíl přímo"},
              {k:"matka_zaplatila_za_otce",l:"Matka zaplatila i za otce (otec jí dluží podíl)"},
              {k:"otec_zaplatil_za_matku", l:"Otec zaplatil i za matku (matka mu dluží podíl)"},
            ].map(ch=><label key={ch.k} style={{display:"flex",alignItems:"center",gap:8,marginBottom:8,fontSize:13,cursor:"pointer"}}>
              <input type="checkbox" checked={!!editFormM[ch.k]} onChange={e=>setEditFormM(p=>({...p,[ch.k]:e.target.checked}))}/>
              {ch.l}
            </label>)}
          </div>
          <div style={{marginBottom:14}}>
            <div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:4}}>Účet (pro cashflow)</div>
            <select style={inp} value={editFormM.ucet_id||monetaId||""} onChange={e=>setEditFormM(p=>({...p,ucet_id:e.target.value}))}>
              {(ucty||[]).map(u=><option key={u.id} value={u.id}>{u.nazev}</option>)}
            </select>
          </div>
          <div style={{marginBottom:14}}>
            <div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:4}}>Poznámka</div>
            <input style={inp} type="text" value={editFormM.poznamka||""} onChange={e=>setEditFormM(p=>({...p,poznamka:e.target.value}))}/>
          </div>
          <div style={{display:"flex",gap:10}}>
            <button onClick={ulozEditMim} style={btnC()}>Uložit</button>
            <button onClick={()=>setEditMim(null)} style={btnC(C.muted,true)}>Zrušit</button>
          </div>
        </div>
      </div>}

      {/* Tabulka splátky dluhu */}
      <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,overflow:"hidden",marginTop:20}}>
        <div style={{padding:"14px 18px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontWeight:800,fontSize:15}}>💳 Splátky dluhu</span>
          <span style={{fontSize:13,color:C.muted}}>Celkem: {(slatky_dluhu||[]).reduce((a,s)=>a+s.castka,0).toLocaleString("cs")} Kč</span>
        </div>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",minWidth:400}}>
            <thead><tr style={{background:C.bg}}>
              {["Datum","Kdo platí","Částka","Poznámka",""].map(h=><th key={h} style={{padding:"9px 12px",textAlign:"left",fontSize:11,fontWeight:700,color:C.muted,textTransform:"uppercase"}}>{h}</th>)}
            </tr></thead>
            <tbody>
              {(slatky_dluhu||[]).length===0&&<tr><td colSpan={5} style={{padding:24,textAlign:"center",color:C.dim}}>Zatím žádné splátky</td></tr>}
              {(slatky_dluhu||[]).map((s,i)=><tr key={s.id} style={{background:i%2===0?C.surface:"#fafbff",borderBottom:`1px solid ${C.border}`}}>
                <td style={{padding:"10px 12px",fontSize:13}}>{new Date(s.datum).toLocaleDateString("cs-CZ")}</td>
                <td style={{padding:"10px 12px",fontSize:13}}>{s.kdo_plati==="otec"?ALIM_META.otec:ALIM_META.matka}</td>
                <td style={{padding:"10px 12px",fontSize:13,fontWeight:700,color:C.accent}}>{s.castka.toLocaleString("cs")} Kč</td>
                <td style={{padding:"10px 12px",fontSize:12,color:C.muted}}>{s.poznamka||""}</td>
                <td style={{padding:"10px 8px"}}><button onClick={()=>smazSplatku(s.id)} style={{...btnC(C.red,true),padding:"3px 8px",fontSize:11}}>🗑</button></td>
              </tr>)}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal splátka dluhu */}
      {splatkaModal&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
        <div style={{background:C.surface,borderRadius:18,padding:28,width:"100%",maxWidth:380,boxShadow:"0 20px 60px rgba(0,0,0,.25)"}}>
          <h3 style={{margin:"0 0 18px",fontSize:17,fontWeight:800}}>💳 Splátka dluhu</h3>
          <div style={{marginBottom:11}}>
            <div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:4}}>Kdo platí</div>
            <select style={inp} value={splatkaForm.kdo_plati} onChange={e=>setSplatkaForm(p=>({...p,kdo_plati:e.target.value}))}>
              <option value="otec">{ALIM_META.otec}</option>
              <option value="matka">{ALIM_META.matka}</option>
            </select>
          </div>
          <div style={{marginBottom:11}}>
            <div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:4}}>Datum</div>
            <input style={inp} type="date" value={splatkaForm.datum} onChange={e=>setSplatkaForm(p=>({...p,datum:e.target.value}))}/>
          </div>
          <div style={{marginBottom:11}}>
            <div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:4}}>Částka (Kč)</div>
            <input style={inp} type="number" value={splatkaForm.castka} onChange={e=>setSplatkaForm(p=>({...p,castka:e.target.value}))}/>
          </div>
          <div style={{marginBottom:16}}>
            <div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:4}}>Poznámka</div>
            <input style={inp} type="text" placeholder="volitelně..." value={splatkaForm.poznamka} onChange={e=>setSplatkaForm(p=>({...p,poznamka:e.target.value}))}/>
          </div>
          <div style={{display:"flex",gap:10}}>
            <button onClick={ulozSplatku} style={btnC()}>Uložit</button>
            <button onClick={()=>setSplatkaModal(false)} style={btnC(C.muted,true)}>Zrušit</button>
          </div>
        </div>
      </div>}
    </div>;
  };


  // ── ZÁLOŽKA: VYÚČTOVÁNÍ ──
  const VyuctovaniView=()=>{
    const matkaBlue="#e8f3ff";
    const otecOrange="#fff3e0";

    const alimenty=(platby||[]).filter(p=>p.typ==="alimenty");
    const nedoplatekOtec=alimenty.filter(p=>p.kdo_plati==="otec"&&p.komu==="matce").reduce((acc,p)=>{
      // Počítáme jen alimenty bez splátky dluhu
      const maByt=getSazbaProMesic(p.mesic||"")-( (p.mesic||"")>=SPLATKA_OD ? splatkaM : 0);
      const diff=p.castka-maByt;
      return acc+(diff<0?Math.abs(diff):0);
    },0);
    const nedoplatekMatka=0;

    const zustatekMim=(mimoradne||[]).reduce((acc,m)=>{
      if(m.matka_zaplatila_za_otce)acc+=m.podil_otce;
      if(m.otec_zaplatil_za_matku)acc-=m.podil_matky;
      return acc;
    },0);

    const exportVyuctovani=async()=>{
      const X=await import("xlsx");
      const wb=X.utils.book_new();
      const d=new Date().toLocaleDateString("cs-CZ");
      const hlavicka=[
        ["VYÚČTOVÁNÍ ALIMENTŮ — OSPOD"],
        [`Spisová značka: ${ALIM_META.spisZnacka}`],
        [`Otec: ${ALIM_META.otec}     Matka: ${ALIM_META.matka}`],
        [`Děti: ${ALIM_META.deti.join(", ")}`],
        [`Datum tisku: ${d}`],
        [],
      ];
      // List 1: Souhrn
      const ws=X.utils.aoa_to_sheet([
        ...hlavicka,
        ["NEDOPLATEK ALIMENTŮ","",""],
        ["","Otec dluží matce:",nedoplatekOtec?`${nedoplatekOtec.toLocaleString("cs")} Kč`:"Bez dluhu"],
        ["","Matka dluží otci:",nedoplatekMatka?`${nedoplatekMatka.toLocaleString("cs")} Kč`:"Bez dluhu"],
        [],
        ["ZŮSTATEK MIMOŘÁDNÝCH VÝDAJŮ","",""],
        ["","Dluh mezi rodiči:",
          zustatekMim===0?"Vyrovnáno":
          zustatekMim>0?`Otec dluží matce: ${zustatekMim.toLocaleString("cs")} Kč`:
          `Matka dluží otci: ${Math.abs(zustatekMim).toLocaleString("cs")} Kč`
        ],
        [],
        ["PŮVODNÍ DLUH Z ROZSUDKU","",""],
        ["","Původní dluh:",`${dluhCelkem.toLocaleString("cs")} Kč`],
        ["","Splaceno:",`${dluhSplaceno.toLocaleString("cs")} Kč`],
        ["","Zbývá doplatit:",`${dluhZbyva.toLocaleString("cs")} Kč`],
        ["","Měsíční splátka:",true?`${splatkaM.toLocaleString("cs")} Kč`:"Neaktivní"],
        ["","Progress:",`${Math.round(dluhSplaceno/dluhCelkem*100)} %`],
      ]);
      ws["!cols"]=[{wch:32},{wch:24},{wch:20}];
      X.utils.book_append_sheet(wb,ws,"Vyúčtování");
      // List 2: Alimenty
      const alimData=(platby||[]).filter(p=>p.typ==="alimenty").sort((a,b)=>(a.mesic||"").localeCompare(b.mesic||""));
      const ws2=X.utils.aoa_to_sheet([
        ...hlavicka,
        ["Měsíc","Kdo platí","Komu","Má být (Kč)","Zaplaceno (Kč)","Rozdíl (Kč)","Datum platby","Poznámka"],
        ...alimData.map(p=>{
          const maByt=p.kdo_plati==="otec"&&p.komu==="matce"?getSazbaProMesic(p.mesic||""):p.kdo_plati==="matka"&&p.komu==="otci"?getSazbaMatkaOtec(p.mesic||""):null;
          return [
            p.mesic?new Date(p.mesic+"-01").toLocaleDateString("cs-CZ",{month:"long",year:"numeric"}):"",
            p.kdo_plati==="otec"?ALIM_META.otec:ALIM_META.matka,
            KOMU_OPTS.find(o=>o.v===p.komu)?.l.split(" (")[0]||p.komu_text||p.komu,
            maByt||"",p.castka,maByt!=null?p.castka-maByt:"",
            p.datum?new Date(p.datum).toLocaleDateString("cs-CZ"):"",p.poznamka||"",
          ];
        }),
        [],["CELKEM","","","",alimData.reduce((a,p)=>a+p.castka,0),"","",""],
      ]);
      ws2["!cols"]=[{wch:18},{wch:20},{wch:14},{wch:13},{wch:14},{wch:12},{wch:14},{wch:28}];
      X.utils.book_append_sheet(wb,ws2,"Alimenty detail");
      // List 3: Mimořádné
      const ws3=X.utils.aoa_to_sheet([
        ...hlavicka,
        ["Datum","Popis","Dítě","Celkem (Kč)","Podíl matky","Podíl otce","M. zaplatila","O. zaplatil","Dluh mezi rodiči","Poznámka"],
        ...(mimoradne||[]).sort((a,b)=>a.datum.localeCompare(b.datum)).map(m=>{
          const matkaZaplatila=m.matka_zaplatila_skolce||m.matka_zaplatila_za_otce;
          const otecZaplatil=m.otec_zaplatil_skolce||m.otec_zaplatil_za_matku;
          const dluhRodice=m.matka_zaplatila_za_otce?`Otec dluží matce: ${m.podil_otce.toLocaleString("cs")} Kč`:
            m.otec_zaplatil_za_matku?`Matka dluží otci: ${m.podil_matky.toLocaleString("cs")} Kč`:"Vyrovnáno";
          return [new Date(m.datum).toLocaleDateString("cs-CZ"),m.popis,m.dite,m.castka_celkem,m.podil_matky,m.podil_otce,matkaZaplatila?"✓":"✗",otecZaplatil?"✓":"✗",dluhRodice,m.poznamka||""];
        }),
        [],["CELKEM","","",(mimoradne||[]).reduce((a,m)=>a+m.castka_celkem,0),"","","","","",""],
      ]);
      ws3["!cols"]=[{wch:12},{wch:22},{wch:10},{wch:12},{wch:13},{wch:12},{wch:13},{wch:12},{wch:28},{wch:24}];
      X.utils.book_append_sheet(wb,ws3,"Mimořádné výdaje");
      X.writeFile(wb,`vyuctovani_OSPOD_${new Date().toISOString().slice(0,10)}.xlsx`);
    };

    return <div>
      <div style={{display:"flex",justifyContent:"flex-end",marginBottom:20}}>
        <button onClick={exportVyuctovani} style={{...btnC(C.green,true),fontSize:13,padding:"10px 18px"}}>📥 Export pro OSPOD (.xlsx)</button>
      </div>
      <div style={{fontSize:12,fontWeight:700,textTransform:"uppercase",letterSpacing:.6,color:C.muted,marginBottom:10}}>Nedoplatek alimentů</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20}}>
        <div style={{background:otecOrange,border:"1px solid #f5c07a",borderRadius:14,padding:"18px 20px",borderLeft:"4px solid #e8922a"}}>
          <div style={{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:.6,color:"#b36a00",marginBottom:6}}>Otec dluží matce</div>
          <div style={{fontSize:24,fontWeight:800,color:nedoplatekOtec>0?"#b36a00":C.green}}>{nedoplatekOtec>0?`${nedoplatekOtec.toLocaleString("cs")} Kč`:"✓ Bez dluhu"}</div>
          {nedoplatekOtec>0&&<div style={{fontSize:11,color:"#b36a00",marginTop:4}}>rozdíl mezi předepsanou a zaplacenou částkou</div>}
        </div>
        <div style={{background:matkaBlue,border:"1px solid #90bfec",borderRadius:14,padding:"18px 20px",borderLeft:"4px solid #5b8ef0"}}>
          <div style={{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:.6,color:"#1a4fa8",marginBottom:6}}>Matka dluží otci</div>
          <div style={{fontSize:24,fontWeight:800,color:nedoplatekMatka>0?"#1a4fa8":C.green}}>{nedoplatekMatka>0?`${nedoplatekMatka.toLocaleString("cs")} Kč`:"✓ Bez dluhu"}</div>
        </div>
      </div>
      <div style={{fontSize:12,fontWeight:700,textTransform:"uppercase",letterSpacing:.6,color:C.muted,marginBottom:10}}>Zůstatek mimořádných výdajů</div>
      <div style={{marginBottom:20}}>
        <div style={{background:zustatekMim>0?otecOrange:zustatekMim<0?matkaBlue:C.greenS,border:`1px solid ${zustatekMim>0?"#f5c07a":zustatekMim<0?"#90bfec":"#5cb87a"}`,borderRadius:14,padding:"18px 20px",borderLeft:`4px solid ${zustatekMim>0?"#e8922a":zustatekMim<0?"#5b8ef0":C.green}`}}>
          <div style={{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:.6,color:C.muted,marginBottom:6}}>👫 Dluh mezi rodiči</div>
          {zustatekMim===0
            ?<div style={{fontSize:22,fontWeight:800,color:C.green}}>✓ Vyrovnáno</div>
            :zustatekMim>0
              ?<><div style={{fontSize:22,fontWeight:800,color:"#b36a00"}}>{zustatekMim.toLocaleString("cs")} Kč</div><div style={{fontSize:12,color:"#b36a00",marginTop:4}}>Otec dluží matce</div></>
              :<><div style={{fontSize:22,fontWeight:800,color:"#1a4fa8"}}>{Math.abs(zustatekMim).toLocaleString("cs")} Kč</div><div style={{fontSize:12,color:"#1a4fa8",marginTop:4}}>Matka dluží otci</div></>}
        </div>
      </div>
      <div style={{fontSize:12,fontWeight:700,textTransform:"uppercase",letterSpacing:.6,color:C.muted,marginBottom:10}}>Původní dluh z rozsudku (53 250 Kč)</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(170px,1fr))",gap:12,marginBottom:16}}>
        {[
          {l:"Původní dluh",v:`${dluhCelkem.toLocaleString("cs")} Kč`,c:C.red},
          {l:"Splaceno",v:`${dluhSplaceno.toLocaleString("cs")} Kč`,c:C.green},
          {l:"Zbývá doplatit",v:`${dluhZbyva.toLocaleString("cs")} Kč`,c:dluhZbyva>0?C.orange:C.green},
          {l:"Splátka/měsíc",v:true?`${splatkaM.toLocaleString("cs")} Kč`:"Neaktivní",c:true?C.blue:C.dim},
        ].map(k=><div key={k.l} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"14px 16px",borderTop:`3px solid ${k.c}`}}>
          <div style={{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:.6,color:C.muted,marginBottom:4}}>{k.l}</div>
          <div style={{fontSize:18,fontWeight:800,color:k.c}}>{k.v}</div>
        </div>)}
      </div>
      <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"14px 18px"}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:8,fontSize:13}}>
          <span style={{fontWeight:700}}>Progress splácení</span>
          <span style={{color:C.muted}}>{Math.round(dluhSplaceno/dluhCelkem*100)} %</span>
        </div>
        <div style={{background:C.bg,borderRadius:99,height:10}}>
          <div style={{height:"100%",width:`${Math.min(100,dluhSplaceno/dluhCelkem*100)}%`,background:C.green,borderRadius:99,transition:"width .4s"}}/>
        </div>
        {!true&&<div style={{marginTop:10,fontSize:12,color:C.orange,fontWeight:600}}>⚠ Splácení zatím neaktivní — aktivujte v Nastavení</div>}
      </div>
    </div>;
  };

  // ── ZÁLOŽKA: NASTAVENÍ ──
  const NastaveniView=()=>{
    const [editModal,setEditModal]=useState(null);
    const [form,setForm]=useState({});
    const [dluhForm,setDluhForm]=useState({splaceno:String(dluhSplaceno),splatka:String(splatkaM)});
    const [aktivaceForm,setAktivaceForm]=useState("");

    const ulozSazbu=async()=>{
      const data={dite:form.dite,smer:form.smer,castka:parseInt(form.castka),platnost_od:form.platnost_od,platnost_do:form.platnost_do||null};
      if(editModal==="nova")await sb.from("alimenty_sazby").insert(data);
      else await sb.from("alimenty_sazby").update(data).eq("id",editModal.id);
      reloadSazby();setEditModal(null);
    };
    const smazSazbu=async(id)=>{if(!confirm("Smazat tuto sazbu?"))return;await sb.from("alimenty_sazby").delete().eq("id",id);reloadSazby();};
    const ulozDluh=async()=>{
      await sb.from("alimenty_nastaveni").update({hodnota:dluhForm.splaceno}).eq("klic","dluh_splaceno");
      await sb.from("alimenty_nastaveni").update({hodnota:dluhForm.splatka}).eq("klic","dluh_splatka_mesicni");
      reloadNast();
    };
    const aktivovatSplaceni=async()=>{
      if(!aktivaceForm){alert("Zadejte datum právní moci");return;}
      await sb.from("alimenty_nastaveni").update({hodnota:"true"}).eq("klic","dluh_splatky_aktivni");
      reloadNast();
    };

    const skupiny=[{smer:"otec_matce",label:"Otec → Matce",color:C.red},{smer:"matka_otci",label:"Matka → Otci",color:C.blue}];

    return <div>
      <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,padding:20,marginBottom:20}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <h3 style={{margin:0,fontSize:15,fontWeight:800}}>Sazby alimentů</h3>
          <button onClick={()=>{setForm({dite:"Sylvestr",smer:"otec_matce",castka:"",platnost_od:"",platnost_do:""});setEditModal("nova");}} style={{...btnC(C.accent,true),padding:"6px 14px",fontSize:12}}>+ Přidat sazbu</button>
        </div>
        {skupiny.map(sk=><div key={sk.smer} style={{marginBottom:16}}>
          <div style={{fontSize:12,fontWeight:700,color:sk.color,textTransform:"uppercase",letterSpacing:.6,marginBottom:8}}>{sk.label}</div>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
            <thead><tr style={{background:C.bg}}>
              {["Dítě","Částka","Platnost od","Platnost do",""].map(h=><th key={h} style={{padding:"8px 12px",textAlign:"left",fontSize:11,fontWeight:700,color:C.muted,textTransform:"uppercase"}}>{h}</th>)}
            </tr></thead>
            <tbody>
              {(sazby||[]).filter(s=>s.smer===sk.smer).length===0&&<tr><td colSpan={5} style={{padding:"12px",color:C.dim,fontSize:12}}>Žádné sazby</td></tr>}
              {(sazby||[]).filter(s=>s.smer===sk.smer).map(s=><tr key={s.id} style={{borderBottom:`1px solid ${C.border}`}}>
                <td style={{padding:"9px 12px",fontWeight:600}}>{s.dite}</td>
                <td style={{padding:"9px 12px",fontWeight:700,color:sk.color}}>{s.castka.toLocaleString("cs")} Kč</td>
                <td style={{padding:"9px 12px",color:C.muted}}>{new Date(s.platnost_od).toLocaleDateString("cs-CZ",{month:"long",year:"numeric"})}</td>
                <td style={{padding:"9px 12px",color:C.muted}}>{s.platnost_do?new Date(s.platnost_do).toLocaleDateString("cs-CZ",{month:"long",year:"numeric"}):"∞"}</td>
                <td style={{padding:"9px 12px"}}>
                  <div style={{display:"flex",gap:6}}>
                    <button onClick={()=>{setForm({dite:s.dite,smer:s.smer,castka:String(s.castka),platnost_od:s.platnost_od,platnost_do:s.platnost_do||""});setEditModal(s);}} style={{...btnC(C.accent,true),padding:"4px 10px",fontSize:11}}>Upravit</button>
                    <button onClick={()=>smazSazbu(s.id)} style={{...btnC(C.red,true),padding:"4px 10px",fontSize:11}}>Smazat</button>
                  </div>
                </td>
              </tr>)}
            </tbody>
          </table>
        </div>)}
      </div>

      <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,padding:20}}>
        <h3 style={{margin:"0 0 16px",fontSize:15,fontWeight:800}}>Dluh na výživném</h3>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
          <div><div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:5}}>Splaceno dosud (Kč)</div>
            <input style={inp} type="number" value={dluhForm.splaceno} onChange={e=>setDluhForm(p=>({...p,splaceno:e.target.value}))}/></div>
          <div><div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:5}}>Měsíční splátka (Kč)</div>
            <input style={inp} type="number" value={dluhForm.splatka} onChange={e=>setDluhForm(p=>({...p,splatka:e.target.value}))}/></div>
        </div>
        <button onClick={ulozDluh} style={{...btnC(C.green),marginBottom:16}}>Uložit</button>
        <div style={{background:C.greenS,border:`1px solid ${C.green}`,borderRadius:10,padding:"12px 16px",fontSize:13,fontWeight:700,color:C.green}}>✓ Splácení aktivní od června 2026 — {splatkaM.toLocaleString("cs")} Kč/měsíc (dle rozsudku ze dne 18. 3. 2026)</div>
      </div>

      {editModal&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
        <div style={{background:C.surface,borderRadius:18,padding:28,width:"100%",maxWidth:400,boxShadow:"0 20px 60px rgba(0,0,0,.25)"}}>
          <h3 style={{margin:"0 0 18px",fontSize:17,fontWeight:800}}>{editModal==="nova"?"Nová sazba":"Upravit sazbu"}</h3>
          {[
            {l:"Dítě",k:"dite",t:"select",opts:["Sylvestr","John"]},
            {l:"Směr",k:"smer",t:"select",opts:[{v:"otec_matce",l:"Otec → Matce"},{v:"matka_otci",l:"Matka → Otci"}]},
            {l:"Částka (Kč)",k:"castka",t:"number"},
            {l:"Platnost od",k:"platnost_od",t:"date"},
            {l:"Platnost do (prázdné = neomezeně)",k:"platnost_do",t:"date"},
          ].map(f=><div key={f.k} style={{marginBottom:12}}>
            <div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:5}}>{f.l}</div>
            {f.t==="select"
              ?<select style={inp} value={form[f.k]||""} onChange={e=>setForm(p=>({...p,[f.k]:e.target.value}))}>
                {f.opts.map(o=>typeof o==="string"?<option key={o} value={o}>{o}</option>:<option key={o.v} value={o.v}>{o.l}</option>)}
              </select>
              :<input style={inp} type={f.t} value={form[f.k]||""} onChange={e=>setForm(p=>({...p,[f.k]:e.target.value}))}/>}
          </div>)}
          <div style={{display:"flex",gap:10,marginTop:18}}>
            <button onClick={ulozSazbu} style={btnC()}>Uložit</button>
            <button onClick={()=>setEditModal(null)} style={btnC(C.muted,true)}>Zrušit</button>
          </div>
        </div>
      </div>}
    </div>;
  };

  // ── MODAL: Přidat platbu ──
  const PridatModal=()=>{
    const [mf,setMf]=useState(pf);
    const [mimForm,setMimForm]=useState({datum:"",popis:"",dite:"Oba",castka_celkem:"",matka_zaplatila_skolce:false,otec_zaplatil_skolce:false,matka_zaplatila_za_otce:false,otec_zaplatil_za_matku:false,poznamka:"",ucet_id:""});
    const [zobrazit,setZobrazit]=useState("platba"); // platba | mimoradne

    const ulozPlatbuLocal=async()=>{
      const data={typ:mf.typ,kdo_plati:mf.kdo_plati,komu:mf.komu,komu_text:mf.komu_text||null,mesic:mf.typ==="alimenty"?mf.mesic:null,datum:mf.datum||null,castka:parseInt(mf.castka),poznamka:mf.poznamka||null,ucet_id:mf.ucet_id||monetaId||null};
      const {data:nova}=await sb.from("alimenty_platby").insert(data).select().single();
      if(nova) await syncPlatbaDoCashflow(nova);
      reloadAll();setPridatModal(false);
    };

    const ulozMimoradne=async()=>{
      const celkem=parseInt(mimForm.castka_celkem);
      const podil=Math.round(celkem/2);
      const data={datum:mimForm.datum,popis:mimForm.popis,dite:mimForm.dite,castka_celkem:celkem,podil_matky:podil,podil_otce:podil,matka_zaplatila_skolce:mimForm.matka_zaplatila_skolce,otec_zaplatil_skolce:mimForm.otec_zaplatil_skolce,matka_zaplatila_za_otce:mimForm.matka_zaplatila_za_otce,otec_zaplatil_za_matku:mimForm.otec_zaplatil_za_matku,poznamka:mimForm.poznamka||null,ucet_id:mimForm.ucet_id||monetaId||null};
      const {data:nm}=await sb.from("alimenty_mimoradne").insert(data).select().single();
      if(nm) await syncMimoradneDoCashflow(nm);
      reloadAll();setPridatModal(false);
    };

    const hint=napoveda();

    return <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{background:C.surface,borderRadius:20,padding:28,width:"100%",maxWidth:480,boxShadow:"0 24px 80px rgba(0,0,0,.3)",maxHeight:"90vh",overflowY:"auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <h3 style={{margin:0,fontSize:18,fontWeight:800}}>➕ Přidat záznam</h3>
          <button onClick={()=>setPridatModal(false)} style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:C.muted}}>×</button>
        </div>
        {/* Přepínač typ záznamu */}
        <div style={{display:"flex",gap:4,marginBottom:20,background:C.bg,borderRadius:10,padding:4}}>
          {[{id:"platba",l:"💳 Platba alimentů"},{id:"mimoradne",l:"📋 Mimořádný výdaj"}].map(t=>
            <button key={t.id} onClick={()=>setZobrazit(t.id)} style={{flex:1,padding:"8px",borderRadius:8,border:"none",cursor:"pointer",fontWeight:700,fontSize:13,background:zobrazit===t.id?C.surface:"transparent",color:zobrazit===t.id?C.accent:C.muted,boxShadow:zobrazit===t.id?"0 2px 8px rgba(0,0,0,.08)":"none"}}>{t.l}</button>
          )}
        </div>

        {zobrazit==="platba"&&<>
          {[
            {l:"Kdo platí",k:"kdo_plati",t:"select",opts:[{v:"otec",l:ALIM_META.otec},{v:"matka",l:ALIM_META.matka}]},
            {l:"Komu",k:"komu",t:"select",opts:KOMU_OPTS},
          ].map(f=><div key={f.k} style={{marginBottom:12}}>
            <div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:5}}>{f.l}</div>
            <select style={inp} value={mf[f.k]} onChange={e=>setMf(p=>({...p,[f.k]:e.target.value}))}>
              {f.opts.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}
            </select>
          </div>)}
          {mf.komu==="jine"&&<div style={{marginBottom:12}}>
            <div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:5}}>Upřesnění příjemce</div>
            <input style={inp} type="text" placeholder="např. Pojišťovna..." value={mf.komu_text} onChange={e=>setMf(p=>({...p,komu_text:e.target.value}))}/>
          </div>}
          <div style={{marginBottom:12}}>
            <div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:5}}>Za měsíc</div>
            <select style={inp} value={mf.mesic} onChange={e=>setMf(p=>({...p,mesic:e.target.value}))}>
              {[...mesice].reverse().map(m=><option key={m} value={m}>{new Date(m+"-01").toLocaleDateString("cs-CZ",{month:"long",year:"numeric"})}</option>)}
            </select>
          </div>
          <div style={{marginBottom:12}}>
            <div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:5}}>Zaplacená částka (Kč)</div>
            {hint&&<div style={{background:C.accentS,borderRadius:8,padding:"7px 11px",marginBottom:6,fontSize:12,color:C.accent,fontWeight:600}}>💡 {hint}</div>}
            <input style={inp} type="number" placeholder="0" value={mf.castka} onChange={e=>setMf(p=>({...p,castka:e.target.value}))}/>
          </div>
          <div style={{marginBottom:12}}>
            <div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:5}}>Datum platby</div>
            <input style={inp} type="date" value={mf.datum} onChange={e=>setMf(p=>({...p,datum:e.target.value}))}/>
          </div>
          <div style={{marginBottom:12}}>
            <div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:5}}>Účet {mf.kdo_plati==="otec"?"(kam přijde)":"(odkud odejde)"}</div>
            <select style={inp} value={mf.ucet_id||monetaId||""} onChange={e=>setMf(p=>({...p,ucet_id:e.target.value}))}>
              {(ucty||[]).map(u=><option key={u.id} value={u.id}>{u.nazev}</option>)}
            </select>
            <div style={{fontSize:11,color:C.dim,marginTop:5}}>Promítne se do cashflow daného měsíce jako {mf.kdo_plati==="otec"?"příjem (+)":"výdaj (−)"} — jen když má datum a nenulovou částku.</div>
          </div>
          <div style={{marginBottom:20}}>
            <div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:5}}>Poznámka</div>
            <input style={inp} type="text" placeholder="volitelně..." value={mf.poznamka} onChange={e=>setMf(p=>({...p,poznamka:e.target.value}))}/>
          </div>
          <button onClick={ulozPlatbuLocal} style={{...btnC(),width:"100%",padding:"12px"}}>Uložit platbu</button>
        </>}

        {zobrazit==="mimoradne"&&<>
          {[
            {l:"Datum",k:"datum",t:"date"},
            {l:"Popis výdaje",k:"popis",t:"text",ph:"např. Obědy školka"},
          ].map(f=><div key={f.k} style={{marginBottom:12}}>
            <div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:5}}>{f.l}</div>
            <input style={inp} type={f.t} placeholder={f.ph||""} value={mimForm[f.k]} onChange={e=>setMimForm(p=>({...p,[f.k]:e.target.value}))}/>
          </div>)}
          <div style={{marginBottom:12}}>
            <div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:5}}>Dítě</div>
            <select style={inp} value={mimForm.dite} onChange={e=>setMimForm(p=>({...p,dite:e.target.value}))}>
              {["Oba","Sylvestr","John"].map(d=><option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div style={{marginBottom:12}}>
            <div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:5}}>Celková částka (Kč)</div>
            <input style={inp} type="number" placeholder="0" value={mimForm.castka_celkem} onChange={e=>setMimForm(p=>({...p,castka_celkem:e.target.value}))}/>
            {mimForm.castka_celkem&&<div style={{fontSize:11,color:C.muted,marginTop:4}}>Každý platí: {Math.round(parseInt(mimForm.castka_celkem)/2).toLocaleString("cs")} Kč</div>}
          </div>
          <div style={{background:C.bg,borderRadius:10,padding:"12px 14px",marginBottom:16}}>
            <div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:10}}>Kdo zaplatil školce / třetí straně?</div>
            {[
              {k:"matka_zaplatila_skolce",l:`✓ Matka zaplatila svůj podíl (${mimForm.castka_celkem?Math.round(parseInt(mimForm.castka_celkem)/2).toLocaleString("cs"):"?"} Kč)`},
              {k:"otec_zaplatil_skolce",  l:`✓ Otec zaplatil svůj podíl (${mimForm.castka_celkem?Math.round(parseInt(mimForm.castka_celkem)/2).toLocaleString("cs"):"?"} Kč)`},
              {k:"matka_zaplatila_za_otce",l:"Matka zaplatila i za otce (otec jí dluží svůj podíl)"},
              {k:"otec_zaplatil_za_matku", l:"Otec zaplatil i za matku (matka mu dluží svůj podíl)"},
            ].map(ch=><label key={ch.k} style={{display:"flex",alignItems:"center",gap:8,marginBottom:8,fontSize:13,cursor:"pointer"}}>
              <input type="checkbox" checked={mimForm[ch.k]} onChange={e=>setMimForm(p=>({...p,[ch.k]:e.target.checked}))}/>
              {ch.l}
            </label>)}
          </div>
          <div style={{marginBottom:12}}>
            <div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:5}}>Účet (odkud výdaj odešel)</div>
            <select style={inp} value={mimForm.ucet_id||monetaId||""} onChange={e=>setMimForm(p=>({...p,ucet_id:e.target.value}))}>
              {(ucty||[]).map(u=><option key={u.id} value={u.id}>{u.nazev}</option>)}
            </select>
            <div style={{fontSize:11,color:C.dim,marginTop:5}}>Do cashflow se promítne jako výdaj „Děti" (tvůj reálný výdaj). Pokud platíš i za otce, jeho podíl se zároveň přidá do plánu jako očekávaný příjem (doplatek).</div>
          </div>
          <div style={{marginBottom:20}}>
            <div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:5}}>Poznámka</div>
            <input style={inp} type="text" placeholder="volitelně..." value={mimForm.poznamka} onChange={e=>setMimForm(p=>({...p,poznamka:e.target.value}))}/>
          </div>
          <button onClick={ulozMimoradne} style={{...btnC(),width:"100%",padding:"12px"}}>Uložit výdaj</button>
        </>}
      </div>
    </div>;
  };

  const tabs=[{id:"vyuctovani",l:"📊 Vyúčtování"},{id:"prehled",l:"📅 Přehled plateb"},{id:"nastaveni",l:"⚙️ Nastavení"}];

  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
      <h2 style={{margin:0,fontSize:22,fontWeight:800}}>⚖️ Alimenty — Šíma</h2>
    </div>
    <div style={{display:"flex",gap:2,marginBottom:24,borderBottom:`2px solid ${C.border}`,overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
      {tabs.map(t=><button key={t.id} onClick={()=>setZalozka(t.id)} style={{padding:"9px 18px",border:"none",background:"none",cursor:"pointer",fontSize:13,fontWeight:700,color:zalozka===t.id?C.accent:C.muted,borderBottom:zalozka===t.id?`2px solid ${C.accent}`:"2px solid transparent",marginBottom:-2,transition:"all .15s",whiteSpace:"nowrap",flexShrink:0}}>{t.l}</button>)}
    </div>
    {zalozka==="prehled"&&<PrehledView/>}
    {zalozka==="vyuctovani"&&<VyuctovaniView/>}
    {zalozka==="nastaveni"&&<NastaveniView/>}
    {pridatModal&&<PridatModal/>}
  </div>;
}

// ── GOOGLE CALENDAR HOOK ─────────────────────────────────────────────────────
function useGoogleToken(){
  const [token,setToken]=useState(null);
  const [loading,setLoading]=useState(true);

  const nactiToken=async()=>{
    const {data}=await sb.from("google_tokens").select("*").order("created_at",{ascending:false}).limit(1).maybeSingle();
    if(data){
      // Zkontroluj expiraci
      if(data.expires_at&&new Date(data.expires_at)<new Date()){
        // Refresh token
        if(data.refresh_token){
          try{
            const r=await fetch("https://oauth2.googleapis.com/token",{
              method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},
              body:new URLSearchParams({client_id:GOOGLE_CLIENT_ID,client_secret:import.meta.env.VITE_GOOGLE_CLIENT_SECRET,refresh_token:data.refresh_token,grant_type:"refresh_token"})
            });
            const d=await r.json();
            if(d.access_token){
              const expires=new Date(Date.now()+d.expires_in*1000).toISOString();
              await sb.from("google_tokens").update({access_token:d.access_token,expires_at:expires}).eq("id",data.id);
              setToken(d.access_token);
            }
          }catch{}
        }
      } else {
        setToken(data.access_token);
      }
    }
    setLoading(false);
  };

  useEffect(()=>{
    // Zpracuj callback z OAuth
    const url=new URL(window.location.href);
    const code=url.searchParams.get("code");
    if(code){
      window.history.replaceState({},"","/");
      fetch("https://oauth2.googleapis.com/token",{
        method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},
        body:new URLSearchParams({code,client_id:GOOGLE_CLIENT_ID,client_secret:import.meta.env.VITE_GOOGLE_CLIENT_SECRET,redirect_uri:GOOGLE_REDIRECT,grant_type:"authorization_code"})
      }).then(r=>r.json()).then(async d=>{
        if(d.access_token){
          const expires=new Date(Date.now()+d.expires_in*1000).toISOString();
          await sb.from("google_tokens").delete().neq("id","00000000-0000-0000-0000-000000000000");
          await sb.from("google_tokens").insert({access_token:d.access_token,refresh_token:d.refresh_token||null,expires_at:expires});
          setToken(d.access_token);
        }
        setLoading(false);
      });
    } else {
      nactiToken();
    }
  },[]);

  const prihlasit=()=>{
    const params=new URLSearchParams({
      client_id:GOOGLE_CLIENT_ID,redirect_uri:GOOGLE_REDIRECT,
      response_type:"code",scope:GOOGLE_SCOPES,
      access_type:"offline",prompt:"consent",
    });
    window.location.href="https://accounts.google.com/o/oauth2/v2/auth?"+params;
  };

  const odhlasit=async()=>{
    await sb.from("google_tokens").delete().neq("id","00000000-0000-0000-0000-000000000000");
    setToken(null);
  };

  return {token,loading,prihlasit,odhlasit};
}

// ── NAČTENÍ UDÁLOSTÍ ─────────────────────────────────────────────────────────
async function nactiUdalosti(token,odDate,doDate){
  const vsechny=[];
  for(const kal of KALENDARE){
    try{
      const url=`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(kal.id)}/events?`+
        new URLSearchParams({timeMin:odDate.toISOString(),timeMax:doDate.toISOString(),singleEvents:true,orderBy:"startTime",maxResults:50});
      const r=await fetch(url,{headers:{Authorization:`Bearer ${token}`}});
      const d=await r.json();
      if(d.items){
        d.items.forEach(e=>vsechny.push({
          id:e.id,nazev:e.summary||"(bez názvu)",
          zacatek:e.start.dateTime||e.start.date,
          konec:e.end?.dateTime||e.end?.date,
          celehodinu:!e.start.dateTime,
          kalendar:kal.nazev,barva:kal.barva,
          popis:e.description||"",
          misto:e.location||"",
        }));
      }
    }catch{}
  }
  vsechny.sort((a,b)=>new Date(a.zacatek)-new Date(b.zacatek));
  return vsechny;
}

// ── KALENDÁŘ TAB ─────────────────────────────────────────────────────────────
function KalendarTab(){
  const {token,loading,prihlasit,odhlasit}=useGoogleToken();
  const [udalosti,setUdalosti]=useState([]);
  const [nacitam,setNacitam]=useState(false);
  const [tyden,setTyden]=useState(0); // 0 = tento týden, -1 = minulý, 1 = příští

  const getTydenRozsah=(offset=0)=>{
    const dnes=new Date();
    const den=dnes.getDay()===0?6:dnes.getDay()-1; // 0=po
    const od=new Date(dnes); od.setDate(dnes.getDate()-den+offset*7); od.setHours(0,0,0,0);
    const do_=new Date(od); do_.setDate(od.getDate()+6); do_.setHours(23,59,59,999);
    return {od,do_};
  };

  useEffect(()=>{
    if(!token)return;
    setNacitam(true);
    const {od,do_}=getTydenRozsah(tyden);
    nactiUdalosti(token,od,do_).then(u=>{setUdalosti(u);setNacitam(false);});
  },[token,tyden]);

  const {od,do_}=getTydenRozsah(tyden);
  const dny=[];
  for(let d=new Date(od);d<=do_;d.setDate(d.getDate()+1))dny.push(new Date(d));

  if(loading)return <div style={{padding:40,textAlign:"center",color:C.muted}}>Načítám...</div>;

  if(!token)return <div style={{textAlign:"center",padding:60}}>
    <div style={{fontSize:48,marginBottom:16}}>📅</div>
    <h3 style={{fontSize:20,fontWeight:800,marginBottom:8}}>Google Kalendář</h3>
    <p style={{color:C.muted,marginBottom:24}}>Připoj svůj Google účet pro zobrazení událostí</p>
    <button onClick={prihlasit} style={{...btnC(C.accent),padding:"12px 28px",fontSize:15}}>🔗 Připojit Google Calendar</button>
  </div>;

  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,flexWrap:"wrap",gap:10}}>
      <h2 style={{margin:0,fontSize:22,fontWeight:800}}>📅 Kalendář</h2>
      <div style={{display:"flex",gap:8,alignItems:"center"}}>
        <button onClick={()=>setTyden(t=>t-1)} style={{...btnC(C.muted,true),padding:"6px 14px"}}>← Předchozí</button>
        <button onClick={()=>setTyden(0)} style={{...btnC(tyden===0?C.accent:C.muted,tyden!==0),padding:"6px 14px"}}>Tento týden</button>
        <button onClick={()=>setTyden(t=>t+1)} style={{...btnC(C.muted,true),padding:"6px 14px"}}>Příští →</button>
        <button onClick={odhlasit} style={{...btnC(C.muted,true),padding:"6px 12px",fontSize:11}}>Odpojit</button>
      </div>
    </div>

    {/* Legenda kalendářů */}
    <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:16}}>
      {KALENDARE.map(k=><span key={k.id} style={{background:k.barva+"22",border:`1px solid ${k.barva}`,borderRadius:99,padding:"3px 10px",fontSize:12,fontWeight:600,color:k.barva}}>{k.nazev}</span>)}
    </div>

    {nacitam?<div style={{padding:40,textAlign:"center",color:C.muted}}>Načítám události...</div>:
    <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:8}}>
      {dny.map(den=>{
        const dStr=den.toISOString().slice(0,10);
        const jeD=new Date().toISOString().slice(0,10)===dStr;
        const denUd=udalosti.filter(u=>u.zacatek.slice(0,10)===dStr);
        return <div key={dStr} style={{background:jeD?C.accentS:C.surface,border:`1px solid ${jeD?C.accent:C.border}`,borderRadius:12,padding:"10px 8px",minHeight:120}}>
          <div style={{fontSize:11,fontWeight:700,color:jeD?C.accent:C.muted,textTransform:"uppercase",marginBottom:4}}>
            {den.toLocaleDateString("cs-CZ",{weekday:"short"})}
          </div>
          <div style={{fontSize:20,fontWeight:800,color:jeD?C.accent:C.text,marginBottom:8}}>{den.getDate()}</div>
          {denUd.map(u=><div key={u.id} style={{background:u.barva,borderRadius:6,padding:"3px 6px",marginBottom:4,fontSize:11,fontWeight:600,color:"#fff",overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis"}} title={u.nazev}>
            {!u.celehodinu&&<span style={{opacity:.85}}>{new Date(u.zacatek).toLocaleTimeString("cs-CZ",{hour:"2-digit",minute:"2-digit"})} </span>}
            {u.nazev}
          </div>)}
        </div>;
      })}
    </div>}
  </div>;
}

// ── POČASÍ WIDGET ────────────────────────────────────────────────────────────
function PocasiWidget(){
  const [pocasi,setPocasi]=useState(null);
  useEffect(()=>{
    fetch("https://api.open-meteo.com/v1/forecast?latitude=50.1731&longitude=14.4089&current=temperature_2m,weathercode,windspeed_10m,precipitation&timezone=Europe%2FPrague")
      .then(r=>r.json()).then(d=>{
        const c=d.current;
        const kod=c.weathercode;
        const ikona=
          kod===0?"☀️":kod<=2?"🌤":kod===3?"☁️":
          kod<=49?"🌫":kod<=59?"🌦":kod<=69?"🌧":
          kod<=79?"🌨":kod<=84?"🌧":kod<=99?"⛈":"🌡";
        const popis=
          kod===0?"Jasno":kod<=2?"Polojasno":kod===3?"Zataženo":
          kod<=49?"Mlha":kod<=59?"Mrholení":kod<=69?"Déšť":
          kod<=79?"Sníh":kod<=84?"Přeháňky":kod<=99?"Bouřka":"—";
        setPocasi({teplota:Math.round(c.temperature_2m),ikona,popis,vitar:Math.round(c.windspeed_10m),srazky:c.precipitation});
      }).catch(()=>{});
  },[]);
  if(!pocasi)return <div style={{fontSize:12,color:C.dim}}>Načítám počasí...</div>;
  return <div style={{display:"flex",alignItems:"center",gap:10,background:C.bg,borderRadius:12,padding:"8px 16px"}}>
    <span style={{fontSize:28}}>{pocasi.ikona}</span>
    <div>
      <div style={{fontWeight:800,fontSize:18,color:C.text,lineHeight:1}}>{pocasi.teplota}°C</div>
      <div style={{fontSize:11,color:C.muted}}>{pocasi.popis} · vítr {pocasi.vitar} km/h</div>
      <div style={{fontSize:10,color:C.dim}}>Vodochody</div>
    </div>
  </div>;
}

// ── VODA TAB ─────────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
// IMPORT FAKTURY Z PDF (ISDOC)
// Česká elektronická faktura ISDOC bývá v PDF přiložená jako soubor invoice.isdoc.
// Bez další knihovny: projdeme streamy v PDF, rozbalíme je přes DecompressionStream
// a hledáme XML s kořenem <Invoice>. Funguje i pro samostatný .isdoc / .xml soubor.
// ══════════════════════════════════════════════════════════════════════════════
async function rozbalStream(bytes){
  for(const fmt of ["deflate","deflate-raw"]){
    try{
      const buf=await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream(fmt))).arrayBuffer();
      return new Uint8Array(buf);
    }catch(e){/* zkusíme druhý formát */}
  }
  return null;
}
function bytyNaLatin1(b){let s="";const kus=0x8000;for(let i=0;i<b.length;i+=kus)s+=String.fromCharCode.apply(null,b.subarray(i,i+kus));return s;}

async function najdiIsdocXml(file){
  const bin=new Uint8Array(await file.arrayBuffer());
  const primo=new TextDecoder("utf-8").decode(bin.subarray(0,Math.min(bin.length,4000)));
  if(primo.includes("<Invoice"))return new TextDecoder("utf-8").decode(bin); // samostatný .isdoc / .xml
  const raw=bytyNaLatin1(bin);
  let poz=0;
  while(poz<raw.length){
    const zac=raw.indexOf("stream",poz);
    if(zac<0)break;
    if(raw.substr(zac-3,3)==="end"){poz=zac+6;continue;}
    const konec=raw.indexOf("endstream",zac);
    if(konec<0)break;
    let od=zac+6;
    if(raw[od]==="\r")od++;
    if(raw[od]==="\n")od++;
    // Za daty bývá ještě konec řádku; DecompressionStream na přebytečný bajt spadne,
    // proto zkoušíme i variantu bez koncových bílých znaků.
    let konecDat=konec;
    while(konecDat>od&&[0x0a,0x0d,0x20].includes(bin[konecDat-1]))konecDat--;
    const varianty=[bin.subarray(od,konec)];
    if(konecDat!==konec)varianty.push(bin.subarray(od,konecDat));
    for(const v of varianty){
      for(const kandidat of [await rozbalStream(v),v]){
        if(!kandidat||kandidat.length<50)continue;
        const t=new TextDecoder("utf-8").decode(kandidat);
        if(t.includes("<Invoice"))return t;
      }
    }
    poz=konec+9;
  }
  return null;
}

function parsujIsdoc(xmlText){
  const doc=new DOMParser().parseFromString(xmlText,"application/xml");
  const root=doc.documentElement;
  if(!root||doc.getElementsByTagName("parsererror").length)return null;
  const primy=t=>{for(const el of Array.from(root.children))if(el.tagName===t)return el.textContent.trim();return "";};
  const kdekoli=t=>doc.getElementsByTagName(t)[0]?.textContent?.trim()||"";
  const poznamky=Array.from(doc.getElementsByTagName("Note")).map(n=>n.textContent.trim()).filter(Boolean);
  const obd=poznamky.join(" ").match(/(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})\s*[–—-]\s*(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})/);
  const naIso=(d,m,r)=>`${r}-${String(+m).padStart(2,"0")}-${String(+d).padStart(2,"0")}`;
  return {
    cislo_faktury:primy("ID")||kdekoli("VariableSymbol"),
    datum_vystaveni:primy("IssueDate")||kdekoli("IssueDate"),
    datum_splatnosti:kdekoli("PaymentDueDate"),
    castka:kdekoli("PayableAmount")||kdekoli("PaidAmount"),
    obdobi_od:obd?naIso(obd[1],obd[2],obd[3]):kdekoli("obdobiOd"),
    obdobi_do:obd?naIso(obd[4],obd[5],obd[6]):kdekoli("obdobiDo"),
    poznamka:poznamky[0]||"",
    // Rozšíření Centropolu — vyúčtování elektřiny nese i stavy elektroměru a zálohy
    vt_od:kdekoli("vtStart"),vt_do:kdekoli("vtEnd"),
    nt_od:kdekoli("ntStart"),nt_do:kdekoli("ntEnd"),
    celkem:kdekoli("sumaCelkem")||kdekoli("TaxInclusiveAmount"),
    zalohy:kdekoli("TaxInclusiveDepositAmount"),
  };
}

// Tlačítko „Načíst z PDF" — vyplní formulář faktury z přiloženého ISDOC
function ImportIsdocButton({onNacteno}){
  const [stav,setStav]=useState("");
  const nacti=async e=>{
    const file=e.target.files?.[0];
    if(!file)return;
    setStav("čtu…");
    try{
      const xml=await najdiIsdocXml(file);
      if(!xml){setStav("");alert("V tomhle PDF není elektronická faktura (ISDOC). Vyplň ji prosím ručně.");}
      else{
        const d=parsujIsdoc(xml);
        if(!d){setStav("");alert("Fakturu se nepodařilo přečíst.");}
        else{onNacteno(d);setStav("✓ načteno");}
      }
    }catch(err){setStav("");alert("Chyba při čtení souboru: "+err.message);}
    e.target.value="";
  };
  return <div style={{background:"#eef4fc",border:"1px solid #b3d1f0",borderRadius:10,padding:"10px 12px",marginBottom:14}}>
    <label style={{...btnC(C.blue),cursor:"pointer",display:"inline-block",fontSize:12,padding:"6px 12px"}}>
      📄 Načíst z PDF
      <input type="file" accept=".pdf,.isdoc,.xml" onChange={nacti} style={{display:"none"}}/>
    </label>
    {stav&&<span style={{marginLeft:10,fontSize:12,fontWeight:700,color:"#1a4fa8"}}>{stav}</span>}
    <div style={{fontSize:11,color:"#3066b0",marginTop:6}}>Vlož PDF faktury. Pokud v něm je elektronická faktura (ISDOC), doplní se číslo, datumy, období a částka — stavy vodoměru zkontroluj a dopiš.</div>
  </div>;
}

// ══════════════════════════════════════════════════════════════════════════════
// ELEKTŘINA — samoodečty VT/NT, průběžný odhad vyúčtování, faktury (Centropol)
// Ceníků může být víc, vybírá se ten platný ke konci období. Dva režimy:
//   „jednoduchý"  — cena za MWh včetně DPH (T1/T2) + měsíční paušál včetně DPH
//   „rozpad"      — silová se slevou, distribuce, systémové služby, daň
//                   a pevné platby krácené dny/30.436875, vše bez DPH + DPH
// ══════════════════════════════════════════════════════════════════════════════
const EL_DEN_MESICE=30.436875;
const EL_POLE_ROZPAD=[
  {k:"silova_vt",l:"Silová elektřina VT (Kč/MWh bez DPH)"},
  {k:"silova_nt",l:"Silová elektřina NT (Kč/MWh bez DPH)"},
  {k:"sleva",l:"Sleva ze silové elektřiny (0,05 = 5 %)"},
  {k:"distribuce_vt",l:"Distribuce VT (Kč/MWh bez DPH)"},
  {k:"distribuce_nt",l:"Distribuce NT (Kč/MWh bez DPH)"},
  {k:"systemove",l:"Systémové služby (Kč/MWh bez DPH)"},
  {k:"dan",l:"Daň z elektřiny (Kč/MWh bez DPH)"},
  {k:"staly_plat",l:"Stálý plat dodavateli (Kč/měs. bez DPH)"},
  {k:"jistic",l:"Jistič (Kč/měs. bez DPH)"},
  {k:"nesitova",l:"Nesíťová infrastruktura (Kč/měs. bez DPH)"},
  {k:"dph",l:"DPH (0,21 = 21 %)"},
];
const EL_POLE_JEDNODUCHY=[
  {k:"cena_vt",l:"Cena za MWh VT/T1 včetně DPH"},
  {k:"cena_nt",l:"Cena za MWh NT/T2 včetně DPH"},
  {k:"pausal_mesic",l:"Měsíční paušál včetně DPH (Kč)"},
];
const el2=x=>Math.round(x*100)/100;
const elPrazdnyCenik={platnost_od:"",nazev:"",rezim:"rozpad",zaloha:"",
  silova_vt:"",silova_nt:"",sleva:"0.05",distribuce_vt:"",distribuce_nt:"",systemove:"",dan:"",
  staly_plat:"",jistic:"",nesitova:"",dph:"0.21",cena_vt:"",cena_nt:"",pausal_mesic:""};

// Ceník platný k datu (poslední, který začal nejpozději v ten den)
function elCenikKDatu(ceniky,datum){
  const p=(ceniky||[]).filter(c=>new Date(c.platnost_od)<=new Date(datum))
    .sort((a,b)=>new Date(a.platnost_od)-new Date(b.platnost_od));
  return p[p.length-1]||null;
}

// Zálohy se platí jednou měsíčně k prvnímu dni. Do období tedy patří tolik záloh,
// kolik prvních dnů měsíce do něj spadá — ne jedna za každý zápis odečtu.
// (Dva odečty v jednom měsíci proto zálohu nezdvojí.)
function elZalohyVObdobi(datumOd,datumDo,ceniky){
  const konec=new Date(datumDo);
  const z=new Date(datumOd);
  let d=new Date(z.getFullYear(),z.getMonth()+1,1);
  let suma=0,pocet=0;
  while(d<=konec){
    const c=elCenikKDatu(ceniky,`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-01`);
    suma+=+(c?.zaloha)||0; pocet++;
    d=new Date(d.getFullYear(),d.getMonth()+1,1);
  }
  return {suma:el2(suma),pocet};
}

function elSpoctiObdobi(od,doO,cen,ceniky){
  const dny=Math.round((new Date(doO.datum)-new Date(od.datum))/86400000);
  const spVt=+doO.vt-+od.vt, spNt=+doO.nt-+od.nt, spC=spVt+spNt;
  const zal=elZalohyVObdobi(od.datum,doO.datum,ceniky);
  const zaklad={datumOd:od.datum,datumDo:doO.datum,dny,spVt,spNt,spC,cenik:cen?.nazev||"",zaloh:zal.pocet};
  if(!cen)return {...zaklad,chybiCenik:true,silova:null,distribuce:null,systemove:null,dan:null,pevne:null,bezDph:null,sDph:null,zaloha:zal.suma,rozdil:0};
  const zaloha=zal.suma;
  if(cen.rezim==="jednoduchy"){
    const cVt=el2((spVt/1000)*(+cen.cena_vt||0));
    const cNt=el2((spNt/1000)*(+cen.cena_nt||0));
    const pevne=el2(+cen.pausal_mesic||0);
    const sDph=el2(cVt+cNt+pevne);
    return {...zaklad,silova:el2(cVt+cNt),distribuce:null,systemove:null,dan:null,pevne,bezDph:null,sDph,zaloha,rozdil:el2(zaloha-sDph)};
  }
  const c=Object.fromEntries(EL_POLE_ROZPAD.map(f=>[f.k,+cen[f.k]||0]));
  const silova=el2(((spVt/1000)*c.silova_vt+(spNt/1000)*c.silova_nt)*(1-c.sleva));
  const distribuce=el2((spVt/1000)*c.distribuce_vt+(spNt/1000)*c.distribuce_nt);
  const systemove=el2((spC/1000)*c.systemove);
  const dan=el2((spC/1000)*c.dan);
  const pevne=el2((c.staly_plat+c.jistic+c.nesitova)*dny/EL_DEN_MESICE);
  const bezDph=el2(silova+distribuce+systemove+dan+pevne);
  const sDph=el2(bezDph*(1+c.dph));
  return {...zaklad,silova,distribuce,systemove,dan,pevne,bezDph,sDph,zaloha,rozdil:el2(zaloha-sDph)};
}

function ElektrinaTab(){
  const {data:odecty,reload:reloadOdecty}=useData(()=>sb.from("el_odecty").select("*").order("datum",{ascending:true}));
  const {data:faktury,reload:reloadFaktury}=useData(()=>sb.from("el_faktury").select("*").order("obdobi_do",{ascending:false}));
  const {data:ceniky,reload:reloadCeniky}=useData(()=>sb.from("el_ceniky").select("*").order("platnost_od",{ascending:true}));
  const [zalozka,setZalozka]=useState("prehled");
  const [modalOdecet,setModalOdecet]=useState(null);
  const [formOdecet,setFormOdecet]=useState({datum:"",vt:"",nt:"",poznamka:""});
  const [modalFak,setModalFak]=useState(null);
  const [formFak,setFormFak]=useState({cislo_faktury:"",datum_vystaveni:"",datum_splatnosti:"",obdobi_od:"",obdobi_do:"",vt_od:"",vt_do:"",nt_od:"",nt_do:"",castka_celkem:"",zalohy:"",vyrovnani:"",zaplaceno:false,poznamka:""});
  const [modalCenik,setModalCenik]=useState(null);
  const [formCenik,setFormCenik]=useState(elPrazdnyCenik);

  const rady=(odecty||[]).filter(o=>o.vt!=null&&o.nt!=null);
  const obdobi=[];
  for(let i=1;i<rady.length;i++)obdobi.push(elSpoctiObdobi(rady[i-1],rady[i],elCenikKDatu(ceniky,rady[i].datum),ceniky));
  // Vyúčtování období uzavře — přeplatek/nedoplatek se vyrovná a počítadlo jde od nuly.
  // Období končící nejpozději posledním vyúčtováním jsou tedy „vyrovnaná".
  const vyrovnanoDo=(faktury||[]).filter(f=>f.obdobi_do).map(f=>f.obdobi_do).sort().pop()||null;
  let beh=0;
  const obdobiKum=obdobi.map(o=>{
    if(vyrovnanoDo&&new Date(o.datumDo)<=new Date(vyrovnanoDo))return {...o,kumulativ:null,vyrovnano:true};
    beh=el2(beh+o.rozdil);return {...o,kumulativ:beh};
  });
  const posledni=rady[rady.length-1];
  const nevyrovnana=obdobi.filter(o=>!vyrovnanoDo||new Date(o.datumDo)>new Date(vyrovnanoDo));
  const celkemVt=nevyrovnana.reduce((a,o)=>a+o.spVt,0), celkemNt=nevyrovnana.reduce((a,o)=>a+o.spNt,0);
  const celkemCena=el2(nevyrovnana.reduce((a,o)=>a+(o.sDph||0),0));
  const kumulativ=beh;
  const bezCeniku=obdobi.filter(o=>o.chybiCenik).length;

  const ulozOdecet=async()=>{
    const data={datum:formOdecet.datum,vt:formOdecet.vt===""?null:parseFloat(formOdecet.vt),nt:formOdecet.nt===""?null:parseFloat(formOdecet.nt),poznamka:formOdecet.poznamka||null};
    const {error}=modalOdecet==="nova"?await sb.from("el_odecty").insert(data):await sb.from("el_odecty").update(data).eq("id",modalOdecet.id);
    if(error){alert("Chyba při ukládání: "+error.message);return;}
    reloadOdecty();setModalOdecet(null);
  };
  const smazOdecet=async id=>{if(!confirm("Smazat odečet?"))return;await sb.from("el_odecty").delete().eq("id",id);reloadOdecty();};

  const ulozFakturu=async()=>{
    const cis=v=>v===""||v==null?null:parseFloat(v);
    const data={cislo_faktury:formFak.cislo_faktury||null,datum_vystaveni:formFak.datum_vystaveni||null,datum_splatnosti:formFak.datum_splatnosti||null,
      obdobi_od:formFak.obdobi_od||null,obdobi_do:formFak.obdobi_do||null,
      vt_od:cis(formFak.vt_od),vt_do:cis(formFak.vt_do),nt_od:cis(formFak.nt_od),nt_do:cis(formFak.nt_do),
      castka_celkem:cis(formFak.castka_celkem),zalohy:cis(formFak.zalohy),vyrovnani:cis(formFak.vyrovnani),
      zaplaceno:formFak.zaplaceno,poznamka:formFak.poznamka||null};
    const {error}=modalFak==="nova"?await sb.from("el_faktury").insert(data):await sb.from("el_faktury").update(data).eq("id",modalFak.id);
    if(error){alert("Chyba při ukládání: "+error.message);return;}
    reloadFaktury();setModalFak(null);
  };
  const smazFakturu=async id=>{if(!confirm("Smazat fakturu?"))return;await sb.from("el_faktury").delete().eq("id",id);reloadFaktury();};

  // Z vyúčtování založí odečet ke konci období — ať navazuje průběžný výpočet
  const odecetZFaktury=async f=>{
    if(f.vt_do==null||f.nt_do==null){alert("Faktura nemá stavy elektroměru.");return;}
    if((odecty||[]).some(o=>o.datum===f.obdobi_do)){alert("Odečet k tomuto datu už existuje.");return;}
    const {error}=await sb.from("el_odecty").insert({datum:f.obdobi_do,vt:f.vt_do,nt:f.nt_do,poznamka:`Z vyúčtování ${f.cislo_faktury||""}`.trim()});
    if(error){alert("Chyba: "+error.message);return;}
    reloadOdecty();alert("Odečet založen.");
  };

  const ulozCenik=async()=>{
    const cis=v=>v===""||v==null?null:parseFloat(v);
    const data={platnost_od:formCenik.platnost_od,nazev:formCenik.nazev||null,rezim:formCenik.rezim,zaloha:cis(formCenik.zaloha)};
    for(const f of [...EL_POLE_ROZPAD,...EL_POLE_JEDNODUCHY])data[f.k]=cis(formCenik[f.k]);
    const {error}=modalCenik==="novy"?await sb.from("el_ceniky").insert(data):await sb.from("el_ceniky").update(data).eq("id",modalCenik.id);
    if(error){alert("Chyba při ukládání: "+error.message);return;}
    reloadCeniky();setModalCenik(null);
  };
  const smazCenik=async id=>{if(!confirm("Smazat ceník?"))return;await sb.from("el_ceniky").delete().eq("id",id);reloadCeniky();};

  const karta=(l,v,barva,sub)=><div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"14px 16px",borderTop:`3px solid ${barva}`}}>
    <div style={{fontSize:10,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:.5,marginBottom:4}}>{l}</div>
    <div style={{fontSize:18,fontWeight:800,color:barva}}>{v}</div>
    {sub&&<div style={{fontSize:11,color:C.muted,marginTop:2}}>{sub}</div>}
  </div>;
  const kc=x=>`${(+x).toLocaleString("cs",{maximumFractionDigits:0})} Kč`;
  const num=x=>x==null?"—":(+x).toLocaleString("cs");

  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
      <h2 style={{margin:0,fontSize:22,fontWeight:800}}>⚡ Elektřina — Centropol</h2>
    </div>

    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
      {karta("Poslední odečet",posledni?`${num(posledni.vt)} / ${num(posledni.nt)}`:"—",C.blue,posledni?`VT / NT · ${new Date(posledni.datum).toLocaleDateString("cs-CZ")}`:"zatím žádný")}
      {karta("Spotřeba od vyúčtování",`${(celkemVt+celkemNt).toLocaleString("cs")} kWh`,C.orange,`VT ${celkemVt.toLocaleString("cs")} · NT ${celkemNt.toLocaleString("cs")}`)}
      {karta("Spotřeba v Kč s DPH",kc(celkemCena),C.accent,vyrovnanoDo?`od ${new Date(vyrovnanoDo).toLocaleDateString("cs-CZ")}`:"za všechna období")}
      {karta(kumulativ>=0?"Průběžný přeplatek":"Průběžný nedoplatek",kc(Math.abs(kumulativ)),kumulativ>=0?C.green:C.red,vyrovnanoDo?`od vyúčtování k ${new Date(vyrovnanoDo).toLocaleDateString("cs-CZ")}`:"zálohy minus spotřeba")}
    </div>

    {bezCeniku>0&&<div style={{background:"#fff8e1",border:"1px solid #f5a623",borderRadius:10,padding:"10px 14px",marginBottom:16,fontSize:12,color:"#c87000"}}>
      ⚠ {bezCeniku}× období bez platného ceníku — doplň ceník s dřívější platností na záložce ⚙️ Ceníky.
    </div>}

    <div style={{display:"flex",gap:2,marginBottom:24,borderBottom:`2px solid ${C.border}`,overflowX:"auto"}}>
      {[{id:"prehled",l:"📊 Odečty a odhad"},{id:"faktury",l:"🧾 Vyúčtování"},{id:"cenik",l:"⚙️ Ceníky"}].map(t=>
        <button key={t.id} onClick={()=>setZalozka(t.id)} style={{padding:"9px 18px",border:"none",background:"none",cursor:"pointer",fontSize:13,fontWeight:700,color:zalozka===t.id?C.accent:C.muted,borderBottom:zalozka===t.id?`2px solid ${C.accent}`:"2px solid transparent",marginBottom:-2}}>{t.l}</button>)}
    </div>

    {zalozka==="prehled"&&<>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
        <div style={{fontWeight:700,fontSize:14}}>📅 Období mezi odečty</div>
        <button onClick={()=>{setFormOdecet({datum:new Date().toISOString().slice(0,10),vt:"",nt:"",poznamka:""});setModalOdecet("nova");}} style={btnC()}>+ Zapsat odečet</button>
      </div>
      <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,overflow:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,minWidth:960}}>
          <thead><tr style={{background:C.bg}}>
            {["Období","Dní","VT","NT","Celkem","Silová","Distrib.","Systém.","Daň","Pevné","Bez DPH","S DPH","Záloha","Rozdíl","Průběžně"].map(h=>
              <th key={h} style={{padding:"8px",textAlign:"left",fontSize:10,fontWeight:700,color:C.muted,textTransform:"uppercase",whiteSpace:"nowrap"}}>{h}</th>)}
          </tr></thead>
          <tbody>
            {obdobiKum.length===0&&<tr><td colSpan={15} style={{padding:20,textAlign:"center",color:C.dim}}>Zapiš aspoň dva odečty</td></tr>}
            {[...obdobiKum].reverse().map((o,i)=><tr key={o.datumDo} style={{background:i%2===0?C.surface:"#fafbff",borderBottom:`1px solid ${C.border}`}}>
              <td style={{padding:"8px",whiteSpace:"nowrap",fontWeight:600}}>
                {new Date(o.datumOd).toLocaleDateString("cs-CZ")} → {new Date(o.datumDo).toLocaleDateString("cs-CZ")}
                {o.cenik&&<div style={{color:C.dim,fontSize:10,fontWeight:400}}>{o.cenik}</div>}
              </td>
              <td style={{padding:"8px",color:C.muted}}>{o.dny}</td>
              <td style={{padding:"8px"}}>{num(o.spVt)}</td>
              <td style={{padding:"8px"}}>{num(o.spNt)}</td>
              <td style={{padding:"8px",fontWeight:700}}>{num(o.spC)}</td>
              <td style={{padding:"8px",color:C.muted}}>{num(o.silova)}</td>
              <td style={{padding:"8px",color:C.muted}}>{num(o.distribuce)}</td>
              <td style={{padding:"8px",color:C.muted}}>{num(o.systemove)}</td>
              <td style={{padding:"8px",color:C.muted}}>{num(o.dan)}</td>
              <td style={{padding:"8px",color:C.muted}}>{num(o.pevne)}</td>
              <td style={{padding:"8px"}}>{num(o.bezDph)}</td>
              <td style={{padding:"8px",fontWeight:700,color:C.accent}}>{num(o.sDph)}</td>
              <td style={{padding:"8px",color:C.muted}}>{num(o.zaloha)}{o.zaloh!==1&&<span style={{fontSize:10}}> ({o.zaloh}×)</span>}</td>
              <td style={{padding:"8px",fontWeight:700,color:o.rozdil>=0?C.green:C.red}}>{o.rozdil>0?"+":""}{num(o.rozdil)}</td>
              <td style={{padding:"8px",fontWeight:800,color:o.vyrovnano?C.dim:o.kumulativ>=0?C.green:C.red}}>{o.vyrovnano?<span style={{fontSize:10,fontWeight:600}}>vyrovnáno</span>:<>{o.kumulativ>0?"+":""}{num(o.kumulativ)}</>}</td>
            </tr>)}
          </tbody>
        </table>
      </div>

      <div style={{fontWeight:700,fontSize:14,margin:"22px 0 10px"}}>📋 Zapsané odečty</div>
      <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,overflow:"hidden"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
          <thead><tr style={{background:C.bg}}>
            {["Datum","Stav VT (kWh)","Stav NT (kWh)","Poznámka",""].map(h=><th key={h} style={{padding:"8px 10px",textAlign:"left",fontSize:11,fontWeight:700,color:C.muted,textTransform:"uppercase"}}>{h}</th>)}
          </tr></thead>
          <tbody>
            {(odecty||[]).length===0&&<tr><td colSpan={5} style={{padding:20,textAlign:"center",color:C.dim}}>Žádné odečty</td></tr>}
            {[...(odecty||[])].reverse().map((o,i)=><tr key={o.id} style={{background:i%2===0?C.surface:"#fafbff",borderBottom:`1px solid ${C.border}`}}>
              <td style={{padding:"8px 10px",whiteSpace:"nowrap"}}>{new Date(o.datum).toLocaleDateString("cs-CZ")}</td>
              <td style={{padding:"8px 10px",fontWeight:700}}>{num(o.vt)}</td>
              <td style={{padding:"8px 10px",fontWeight:700}}>{num(o.nt)}</td>
              <td style={{padding:"8px 10px",fontSize:12,color:C.muted}}>{o.poznamka||""}</td>
              <td style={{padding:"8px 6px",whiteSpace:"nowrap"}}>
                <button onClick={()=>{setModalOdecet(o);setFormOdecet({datum:o.datum,vt:o.vt!=null?String(o.vt):"",nt:o.nt!=null?String(o.nt):"",poznamka:o.poznamka||""});}} style={{...btnC(C.accent,true),padding:"2px 6px",fontSize:10,marginRight:2}}>✏</button>
                <button onClick={()=>smazOdecet(o.id)} style={{...btnC(C.red,true),padding:"2px 6px",fontSize:10}}>🗑</button>
              </td>
            </tr>)}
          </tbody>
        </table>
      </div>
    </>}

    {zalozka==="faktury"&&<>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
        <div style={{fontWeight:700,fontSize:14}}>🧾 Vyúčtování od Centropolu</div>
        <button onClick={()=>{setFormFak({cislo_faktury:"",datum_vystaveni:"",datum_splatnosti:"",obdobi_od:"",obdobi_do:"",vt_od:"",vt_do:"",nt_od:"",nt_do:"",castka_celkem:"",zalohy:"",vyrovnani:"",zaplaceno:false,poznamka:""});setModalFak("nova");}} style={btnC()}>+ Vyúčtování</button>
      </div>
      <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,overflow:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,minWidth:820}}>
          <thead><tr style={{background:C.bg}}>
            {["Číslo","Období","VT","NT","Spotřeba","Vyúčtováno","Zálohy","Přeplatek/nedoplatek","Splatnost",""].map(h=><th key={h} style={{padding:"8px",textAlign:"left",fontSize:10,fontWeight:700,color:C.muted,textTransform:"uppercase",whiteSpace:"nowrap"}}>{h}</th>)}
          </tr></thead>
          <tbody>
            {(faktury||[]).length===0&&<tr><td colSpan={10} style={{padding:20,textAlign:"center",color:C.dim}}>Žádná vyúčtování</td></tr>}
            {(faktury||[]).map((f,i)=>{
              const spVt=f.vt_od!=null&&f.vt_do!=null?+f.vt_do-+f.vt_od:null;
              const spNt=f.nt_od!=null&&f.nt_do!=null?+f.nt_do-+f.nt_od:null;
              const vyr=f.vyrovnani!=null?+f.vyrovnani:null;
              return <tr key={f.id} style={{background:i%2===0?C.surface:"#fafbff",borderBottom:`1px solid ${C.border}`}}>
                <td style={{padding:"8px",fontWeight:600,whiteSpace:"nowrap"}}>{f.cislo_faktury||"—"}</td>
                <td style={{padding:"8px",whiteSpace:"nowrap"}}>{f.obdobi_od?`${new Date(f.obdobi_od).toLocaleDateString("cs-CZ")} – ${new Date(f.obdobi_do).toLocaleDateString("cs-CZ")}`:"—"}</td>
                <td style={{padding:"8px",color:C.muted,whiteSpace:"nowrap"}}>{f.vt_od!=null?`${num(f.vt_od)} → ${num(f.vt_do)}`:"—"}</td>
                <td style={{padding:"8px",color:C.muted,whiteSpace:"nowrap"}}>{f.nt_od!=null?`${num(f.nt_od)} → ${num(f.nt_do)}`:"—"}</td>
                <td style={{padding:"8px",fontWeight:700,whiteSpace:"nowrap"}}>{spVt!=null&&spNt!=null?`${(spVt+spNt).toLocaleString("cs")} kWh`:"—"}</td>
                <td style={{padding:"8px",whiteSpace:"nowrap"}}>{f.castka_celkem!=null?kc(f.castka_celkem):"—"}</td>
                <td style={{padding:"8px",color:C.muted,whiteSpace:"nowrap"}}>{f.zalohy!=null?kc(f.zalohy):"—"}</td>
                <td style={{padding:"8px",fontWeight:800,whiteSpace:"nowrap",color:vyr==null?C.dim:vyr<0?C.green:C.red}}>
                  {vyr==null?"—":vyr<0?`přeplatek ${kc(-vyr)}`:`nedoplatek ${kc(vyr)}`}
                </td>
                <td style={{padding:"8px",whiteSpace:"nowrap"}}>{f.datum_splatnosti?new Date(f.datum_splatnosti).toLocaleDateString("cs-CZ"):"—"}</td>
                <td style={{padding:"8px 6px",whiteSpace:"nowrap"}}>
                  <button title="Založit odečet ke konci období" onClick={()=>odecetZFaktury(f)} style={{...btnC(C.green,true),padding:"2px 6px",fontSize:10,marginRight:2}}>↧</button>
                  <button onClick={()=>{setModalFak(f);setFormFak({cislo_faktury:f.cislo_faktury||"",datum_vystaveni:f.datum_vystaveni||"",datum_splatnosti:f.datum_splatnosti||"",obdobi_od:f.obdobi_od||"",obdobi_do:f.obdobi_do||"",vt_od:f.vt_od!=null?String(f.vt_od):"",vt_do:f.vt_do!=null?String(f.vt_do):"",nt_od:f.nt_od!=null?String(f.nt_od):"",nt_do:f.nt_do!=null?String(f.nt_do):"",castka_celkem:f.castka_celkem!=null?String(f.castka_celkem):"",zalohy:f.zalohy!=null?String(f.zalohy):"",vyrovnani:f.vyrovnani!=null?String(f.vyrovnani):"",zaplaceno:f.zaplaceno,poznamka:f.poznamka||""});}} style={{...btnC(C.accent,true),padding:"2px 6px",fontSize:10,marginRight:2}}>✏</button>
                  <button onClick={()=>smazFakturu(f.id)} style={{...btnC(C.red,true),padding:"2px 6px",fontSize:10}}>🗑</button>
                </td>
              </tr>;
            })}
          </tbody>
        </table>
      </div>
      <div style={{fontSize:11,color:C.muted,marginTop:8}}>Tlačítko ↧ u vyúčtování založí odečet ke konci fakturovaného období, aby na něj navázal průběžný výpočet.</div>
    </>}

    {zalozka==="cenik"&&<>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
        <div style={{fontWeight:700,fontSize:14}}>⚙️ Ceníky podle platnosti</div>
        <button onClick={()=>{setFormCenik({...elPrazdnyCenik,platnost_od:new Date().toISOString().slice(0,10)});setModalCenik("novy");}} style={btnC()}>+ Ceník</button>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {(ceniky||[]).length===0&&<div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:20,textAlign:"center",color:C.dim}}>Žádné ceníky</div>}
        {[...(ceniky||[])].reverse().map(c=><div key={c.id} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"14px 16px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,flexWrap:"wrap"}}>
            <div>
              <div style={{fontWeight:700,fontSize:14}}>{c.nazev||"Ceník"} <span style={{background:C.accentS,color:C.accent,padding:"2px 8px",borderRadius:6,fontSize:11,fontWeight:800,marginLeft:4}}>od {new Date(c.platnost_od).toLocaleDateString("cs-CZ")}</span></div>
              <div style={{fontSize:11,color:C.muted,marginTop:3}}>
                {c.rezim==="jednoduchy"
                  ? `VT ${num(c.cena_vt)} / NT ${num(c.cena_nt)} Kč/MWh s DPH · paušál ${num(c.pausal_mesic)} Kč/měs`
                  : `silová ${num(c.silova_vt)}/${num(c.silova_nt)} · distribuce ${num(c.distribuce_vt)}/${num(c.distribuce_nt)} · DPH ${Math.round((+c.dph||0)*100)} %`}
                {" · záloha "}{num(c.zaloha)}{" Kč"}
              </div>
            </div>
            <div style={{display:"flex",gap:6}}>
              <button onClick={()=>{setModalCenik(c);setFormCenik({...elPrazdnyCenik,...Object.fromEntries(Object.entries(c).map(([k,v])=>[k,v==null?"":String(v)]))});}} style={{...btnC(C.accent,true),padding:"4px 9px",fontSize:12}}>✎</button>
              <button onClick={()=>smazCenik(c.id)} style={{...btnC(C.red,true),padding:"4px 9px",fontSize:12}}>✕</button>
            </div>
          </div>
        </div>)}
      </div>
    </>}

    {modalOdecet&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{background:C.surface,borderRadius:18,padding:28,width:"100%",maxWidth:380,boxShadow:"0 20px 60px rgba(0,0,0,.25)"}}>
        <h3 style={{margin:"0 0 18px",fontSize:17,fontWeight:800}}>{modalOdecet==="nova"?"Nový odečet":"Upravit odečet"}</h3>
        {[{l:"Datum",k:"datum",t:"date"},{l:"Stav VT (kWh)",k:"vt",t:"number"},{l:"Stav NT (kWh)",k:"nt",t:"number"},{l:"Poznámka",k:"poznamka",t:"text",ph:"volitelně..."}].map(f=><div key={f.k} style={{marginBottom:11}}>
          <div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:4}}>{f.l}</div>
          <input style={inp} type={f.t} placeholder={f.ph||""} value={formOdecet[f.k]} onChange={e=>setFormOdecet(p=>({...p,[f.k]:e.target.value}))}/>
        </div>)}
        <div style={{display:"flex",gap:10,marginTop:16}}>
          <button onClick={ulozOdecet} style={btnC()}>Uložit</button>
          <button onClick={()=>setModalOdecet(null)} style={btnC(C.muted,true)}>Zrušit</button>
        </div>
      </div>
    </div>}

    {modalCenik&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:20,overflowY:"auto"}}>
      <div style={{background:C.surface,borderRadius:18,padding:28,width:"100%",maxWidth:440,boxShadow:"0 20px 60px rgba(0,0,0,.25)",maxHeight:"90vh",overflowY:"auto"}}>
        <h3 style={{margin:"0 0 18px",fontSize:17,fontWeight:800}}>{modalCenik==="novy"?"Nový ceník":"Upravit ceník"}</h3>
        {[{l:"Platnost od",k:"platnost_od",t:"date"},{l:"Název",k:"nazev",t:"text",ph:"Centropol 2026/27"}].map(f=><div key={f.k} style={{marginBottom:11}}>
          <div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:4}}>{f.l}</div>
          <input style={inp} type={f.t} placeholder={f.ph||""} value={formCenik[f.k]} onChange={e=>setFormCenik(p=>({...p,[f.k]:e.target.value}))}/>
        </div>)}
        <div style={{marginBottom:11}}>
          <div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:4}}>Režim výpočtu</div>
          <select style={inp} value={formCenik.rezim} onChange={e=>setFormCenik(p=>({...p,rezim:e.target.value}))}>
            <option value="rozpad">Rozpad složek (bez DPH + DPH)</option>
            <option value="jednoduchy">Jednoduchý (cena za MWh včetně DPH + paušál)</option>
          </select>
        </div>
        {(formCenik.rezim==="jednoduchy"?EL_POLE_JEDNODUCHY:EL_POLE_ROZPAD).map(f=><div key={f.k} style={{marginBottom:11}}>
          <div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:4}}>{f.l}</div>
          <input style={inp} type="number" step="0.01" value={formCenik[f.k]} onChange={e=>setFormCenik(p=>({...p,[f.k]:e.target.value}))}/>
        </div>)}
        <div style={{marginBottom:11}}>
          <div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:4}}>Měsíční záloha (Kč)</div>
          <input style={inp} type="number" step="0.01" value={formCenik.zaloha} onChange={e=>setFormCenik(p=>({...p,zaloha:e.target.value}))}/>
        </div>
        <div style={{display:"flex",gap:10,marginTop:16}}>
          <button onClick={ulozCenik} disabled={!formCenik.platnost_od} style={btnC()}>Uložit</button>
          <button onClick={()=>setModalCenik(null)} style={btnC(C.muted,true)}>Zrušit</button>
        </div>
      </div>
    </div>}

    {modalFak&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:20,overflowY:"auto"}}>
      <div style={{background:C.surface,borderRadius:18,padding:28,width:"100%",maxWidth:460,boxShadow:"0 20px 60px rgba(0,0,0,.25)",maxHeight:"90vh",overflowY:"auto"}}>
        <h3 style={{margin:"0 0 18px",fontSize:17,fontWeight:800}}>{modalFak==="nova"?"Nové vyúčtování":"Upravit vyúčtování"}</h3>
        <ImportIsdocButton onNacteno={d=>setFormFak(p=>({...p,
          cislo_faktury:d.cislo_faktury||p.cislo_faktury,
          datum_vystaveni:d.datum_vystaveni||p.datum_vystaveni,
          datum_splatnosti:d.datum_splatnosti||p.datum_splatnosti,
          obdobi_od:d.obdobi_od||p.obdobi_od,obdobi_do:d.obdobi_do||p.obdobi_do,
          vt_od:d.vt_od||p.vt_od,vt_do:d.vt_do||p.vt_do,nt_od:d.nt_od||p.nt_od,nt_do:d.nt_do||p.nt_do,
          castka_celkem:d.celkem||p.castka_celkem,zalohy:d.zalohy||p.zalohy,
          vyrovnani:d.castka!==""&&d.castka!=null?String(-parseFloat(d.castka)):p.vyrovnani}))}/>
        {[{l:"Číslo faktury",k:"cislo_faktury",t:"text"},{l:"Datum vystavení",k:"datum_vystaveni",t:"date"},{l:"Datum splatnosti",k:"datum_splatnosti",t:"date"},{l:"Období od",k:"obdobi_od",t:"date"},{l:"Období do",k:"obdobi_do",t:"date"},{l:"Stav VT od (kWh)",k:"vt_od",t:"number"},{l:"Stav VT do (kWh)",k:"vt_do",t:"number"},{l:"Stav NT od (kWh)",k:"nt_od",t:"number"},{l:"Stav NT do (kWh)",k:"nt_do",t:"number"},{l:"Vyúčtováno celkem s DPH (Kč)",k:"castka_celkem",t:"number"},{l:"Zaplacené zálohy (Kč)",k:"zalohy",t:"number"},{l:"Vyrovnání (+ nedoplatek / − přeplatek)",k:"vyrovnani",t:"number"},{l:"Poznámka",k:"poznamka",t:"text",ph:"volitelně..."}].map(f=><div key={f.k} style={{marginBottom:11}}>
          <div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:4}}>{f.l}</div>
          <input style={inp} type={f.t} step={f.t==="number"?"0.01":undefined} placeholder={f.ph||""} value={formFak[f.k]} onChange={e=>setFormFak(p=>({...p,[f.k]:e.target.value}))}/>
        </div>)}
        <label style={{display:"flex",alignItems:"center",gap:8,fontSize:13,fontWeight:600,marginBottom:6,cursor:"pointer"}}>
          <input type="checkbox" checked={formFak.zaplaceno} onChange={e=>setFormFak(p=>({...p,zaplaceno:e.target.checked}))}/> Vyrovnáno
        </label>
        <div style={{display:"flex",gap:10,marginTop:16}}>
          <button onClick={ulozFakturu} style={btnC()}>Uložit</button>
          <button onClick={()=>setModalFak(null)} style={btnC(C.muted,true)}>Zrušit</button>
        </div>
      </div>
    </div>}
  </div>;
}

function VodaTab(){
  const [zalozka,setZalozka]=useState("fakturacni");
  const {data:odecty,reload:reloadOdecty}=useData(()=>sb.from("voda_odecty").select("*").order("datum",{ascending:true}));
  const {data:faktury,reload:reloadFaktury}=useData(()=>sb.from("voda_faktury").select("*").order("obdobi_od",{ascending:true}));
  const {data:nastaveni,reload:reloadNast}=useData(()=>sb.from("voda_nastaveni").select("*"));

  const nast=Object.fromEntries((nastaveni||[]).map(r=>[r.klic,r.hodnota]));
  const cenaM3=parseFloat(nast.cena_m3_s_dph||"80.19");
  const pasualRocni=parseFloat(nast.pausal_rocni_s_dph||"1232");
  const cenaStocneM3=parseFloat(nast.cena_stocne_m3_s_dph||"64.96");

  const hlavniOdecty=(odecty||[]).filter(o=>o.typ==="hlavni").sort((a,b)=>new Date(a.datum)-new Date(b.datum));
  const podruznyOdecty=(odecty||[]).filter(o=>o.typ==="podruzny").sort((a,b)=>new Date(a.datum)-new Date(b.datum));
  const zahradniOdecty=(odecty||[]).filter(o=>o.typ==="zahradni").sort((a,b)=>new Date(a.datum)-new Date(b.datum));

  const tabs=[
    {id:"fakturacni",l:"🏠 Fakturační vodoměr"},
    {id:"podruzny",l:"🚿 Podružný vodoměr"},
    {id:"zahradni",l:"🌱 Zahradní vodoměr"},
    {id:"stocne",l:"🚽 Stočné"},
    {id:"nastaveni",l:"⚙️ Nastavení"},
  ];

  // ── FAKTURAČNÍ ──
  const FakturacniView=()=>{
    const [modalFak,setModalFak]=useState(null);
    const [formFak,setFormFak]=useState({cislo_faktury:"",datum_vystaveni:"",datum_splatnosti:"",obdobi_od:"",obdobi_do:"",stav_od:"",stav_do:"",castka:"",zaplaceno:false,poznamka:""});
    const [modalOdecet,setModalOdecet]=useState(null);
    const [formOdecet,setFormOdecet]=useState({datum:"",stav:"",poznamka:""});

    const ulozFakturu=async()=>{
      const data={typ:"baracom",cislo_faktury:formFak.cislo_faktury||null,datum_vystaveni:formFak.datum_vystaveni||null,datum_splatnosti:formFak.datum_splatnosti||null,obdobi_od:formFak.obdobi_od||null,obdobi_do:formFak.obdobi_do||null,castka:parseInt(formFak.castka)||0,zaplaceno:formFak.zaplaceno,poznamka:formFak.poznamka||null,stav_od:formFak.stav_od?parseFloat(formFak.stav_od):null,stav_do:formFak.stav_do?parseFloat(formFak.stav_do):null};
      if(modalFak==="nova")await sb.from("voda_faktury").insert(data);
      else await sb.from("voda_faktury").update(data).eq("id",modalFak.id);
      reloadFaktury();setModalFak(null);
    };
    const smazFakturu=async(id)=>{if(!confirm("Smazat fakturu?"))return;await sb.from("voda_faktury").delete().eq("id",id);reloadFaktury();};
    const toggleZaplaceno=async(f)=>{await sb.from("voda_faktury").update({zaplaceno:!f.zaplaceno}).eq("id",f.id);reloadFaktury();};

    const ulozOdecet=async()=>{
      const data={datum:formOdecet.datum,typ:"hlavni",stav:parseFloat(formOdecet.stav),poznamka:formOdecet.poznamka||null};
      if(modalOdecet==="nova")await sb.from("voda_odecty").insert(data);
      else await sb.from("voda_odecty").update(data).eq("id",modalOdecet.id);
      reloadOdecty();setModalOdecet(null);
    };
    const smazOdecet=async(id)=>{if(!confirm("Smazat odečet?"))return;await sb.from("voda_odecty").delete().eq("id",id);reloadOdecty();};

    // Průběžný odhad od poslední faktury
    const posledniF=(faktury||[]).filter(f=>f.typ==="baracom").sort((a,b)=>new Date(b.obdobi_do)-new Date(a.obdobi_do))[0];

    const odhad=()=>{
      if(!posledniF||posledniF.stav_do==null)return null;
      const datumPosledniF=new Date(posledniF.obdobi_do);
      const stavPosledniF=+(posledniF.stav_do);

      // Zjisti výměnu vodoměru po poslední faktuře
      const vymena=hlavniOdecty.find(o=>o.vymena&&new Date(o.datum)>datumPosledniF);

      let spotrebaStaryHlavni=0;
      let spotrebaNovaHlavni=0;
      let popisZakladu="";

      if(vymena){
        // Spotřeba starého vodoměru = konečný stav starého - stav při poslední faktuře
        spotrebaStaryHlavni=+(vymena.stav)-stavPosledniF;
        // Spotřeba nového vodoměru = spotřeba podružného od data výměny
        const datumVymeny=new Date(vymena.datum);
        const predVymenou=podruznyOdecty.filter(o=>new Date(o.datum)<=datumVymeny);
        const stavPodruznyPredVymenou=predVymenou.length>0?+(predVymenou[predVymenou.length-1].stav):null;
        const stavPodruznyNyn=podruznyOdecty.length>0?+(podruznyOdecty[podruznyOdecty.length-1].stav):null;
        const spotrebaPodruznyOdVymeny=stavPodruznyPredVymenou!=null&&stavPodruznyNyn!=null?stavPodruznyNyn-stavPodruznyPredVymenou:0;
        spotrebaNovaHlavni=spotrebaPodruznyOdVymeny;
        popisZakladu=`Starý: ${spotrebaStaryHlavni.toFixed(0)} m³ + Nový (dle podr.): ${spotrebaNovaHlavni.toFixed(3)} m³`;
      } else {
        // Bez výměny — spotřeba dle podružného od poslední faktury
        const predFakturou=podruznyOdecty.filter(o=>new Date(o.datum)<=datumPosledniF);
        const stavPred=predFakturou.length>0?+(predFakturou[predFakturou.length-1].stav):null;
        const stavNyn=podruznyOdecty.length>0?+(podruznyOdecty[podruznyOdecty.length-1].stav):null;
        spotrebaNovaHlavni=stavPred!=null&&stavNyn!=null?stavNyn-stavPred:0;
        popisZakladu=`Dle podružného od ${new Date(datumPosledniF).toLocaleDateString("cs-CZ")}`;
      }

      const spotrebaCelkem=spotrebaStaryHlavni+spotrebaNovaHlavni;
      const odhadStavNoveho=vymena?+(vymena.stav_novy||0)+spotrebaNovaHlavni:stavPosledniF+spotrebaCelkem;
      const dny=Math.round((new Date()-datumPosledniF)/(1000*60*60*24));
      const odhadCena=spotrebaCelkem*cenaM3+(pasualRocni/365*dny);

      return{stavPosledniF,datumOd:posledniF.obdobi_do,spotrebaCelkem,spotrebaStaryHlavni,spotrebaNovaHlavni,odhadStavNoveho,dny,odhadCena,vymena:!!vymena,popisZakladu};
    };
    const o=odhad();

    return <div>
      {/* Průběžný odhad */}
      {o&&<div style={{background:"#e8f5e9",border:"1px solid #81c784",borderRadius:14,padding:"16px 20px",marginBottom:20}}>
        <div style={{fontSize:12,fontWeight:700,textTransform:"uppercase",letterSpacing:.6,color:"#2e7d32",marginBottom:10}}>📊 Průběžný odhad od poslední faktury</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:10,marginBottom:12}}>
          {[
            {l:"Od data (poslední faktura)",v:new Date(o.datumOd).toLocaleDateString("cs-CZ")},
            {l:"Dní od faktury",v:`${o.dny} dní`},
            ...(o.vymena?[
              {l:"Starý vodoměr (do výměny)",v:`${o.spotrebaStaryHlavni.toFixed(0)} m³`},
              {l:"Nový vodoměr (dle podr.)",v:`${o.spotrebaNovaHlavni.toFixed(3)} m³`},
            ]:[
              {l:"Spotřeba dle podružného",v:`${o.spotrebaCelkem.toFixed(3)} m³`},
            ]),
            {l:"Celková spotřeba",v:`${o.spotrebaCelkem.toFixed(3)} m³`},
            {l:"Datum posl. odečtu podr.",v:podruznyOdecty.length>0?new Date(podruznyOdecty[podruznyOdecty.length-1].datum).toLocaleDateString("cs-CZ"):"—"},
            {l:"Odhadovaný stav nového",v:`~${o.odhadStavNoveho.toFixed(0)} m³`},
          ].map(k=><div key={k.l} style={{background:"rgba(255,255,255,.6)",borderRadius:8,padding:"8px 10px"}}>
            <div style={{fontSize:10,fontWeight:700,color:"#388e3c",textTransform:"uppercase",letterSpacing:.4,marginBottom:2}}>{k.l}</div>
            <div style={{fontSize:14,fontWeight:700,color:"#1b5e20"}}>{k.v}</div>
          </div>)}
        </div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:"rgba(255,255,255,.6)",borderRadius:10,padding:"10px 14px"}}>
          <span style={{fontSize:13,fontWeight:700,color:"#2e7d32"}}>Odhadovaná příští faktura</span>
          <span style={{fontSize:22,fontWeight:800,color:"#1b5e20"}}>{o.odhadCena!=null?`${o.odhadCena.toLocaleString("cs",{maximumFractionDigits:0})} Kč`:"—"}</span>
        </div>
      </div>}

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
        {/* Faktury */}
        <div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <div style={{fontWeight:700,fontSize:14}}>🧾 Faktury BARACOM</div>
            <button onClick={()=>{setFormFak({cislo_faktury:"",datum_vystaveni:"",datum_splatnosti:"",obdobi_od:"",obdobi_do:"",stav_od:"",stav_do:"",castka:"",zaplaceno:false,poznamka:""});setModalFak("nova");}} style={{...btnC(C.accent,true),padding:"5px 12px",fontSize:12}}>+ Přidat</button>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {(faktury||[]).filter(f=>f.typ==="baracom").sort((a,b)=>new Date(b.obdobi_od)-new Date(a.obdobi_od)).map(f=>{
              const spotreba=f.stav_do!=null&&f.stav_od!=null?f.stav_do-f.stav_od:null;
              return <div key={f.id} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,overflow:"hidden"}}>
                <div style={{padding:"12px 14px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div>
                    <div style={{fontWeight:700,fontSize:14}}>{f.cislo_faktury||"Faktura"}</div>
                    <div style={{fontSize:12,color:C.muted}}>
                      {f.obdobi_od&&f.obdobi_do&&`${new Date(f.obdobi_od).toLocaleDateString("cs-CZ")} – ${new Date(f.obdobi_do).toLocaleDateString("cs-CZ")}`}
                    </div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontWeight:800,fontSize:18,color:f.zaplaceno?C.green:C.orange}}>{f.castka.toLocaleString("cs")} Kč</div>
                    <div onClick={()=>toggleZaplaceno(f)} style={{fontSize:11,fontWeight:700,cursor:"pointer",color:f.zaplaceno?C.green:"#b36a00"}}>{f.zaplaceno?"✓ Zaplaceno":"⏳ Čeká na úhradu"}</div>
                  </div>
                </div>
                <div style={{padding:"10px 14px",display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,fontSize:12,color:C.muted}}>
                  <div><span style={{fontWeight:600}}>Stav od:</span> {f.stav_od!=null?`${(+f.stav_od).toFixed(0)} m³`:"—"}</div>
                  <div><span style={{fontWeight:600}}>Stav do:</span> {f.stav_do!=null?`${(+f.stav_do).toFixed(0)} m³`:"—"}</div>
                  <div><span style={{fontWeight:600}}>Spotřeba:</span> {spotreba!=null?`${spotreba.toFixed(0)} m³`:"—"}</div>
                  {f.datum_splatnosti&&<div style={{gridColumn:"1/-1"}}><span style={{fontWeight:600}}>Splatnost:</span> {new Date(f.datum_splatnosti).toLocaleDateString("cs-CZ")}</div>}
                </div>
                <div style={{padding:"0 14px 10px",display:"flex",gap:6}}>
                  <button onClick={()=>{setModalFak(f);setFormFak({cislo_faktury:f.cislo_faktury||"",datum_vystaveni:f.datum_vystaveni||"",datum_splatnosti:f.datum_splatnosti||"",obdobi_od:f.obdobi_od||"",obdobi_do:f.obdobi_do||"",stav_od:f.stav_od!=null?String(f.stav_od):"",stav_do:f.stav_do!=null?String(f.stav_do):"",castka:String(f.castka),zaplaceno:f.zaplaceno,poznamka:f.poznamka||""});}} style={{...btnC(C.accent,true),padding:"3px 10px",fontSize:11}}>✏ Upravit</button>
                  <button onClick={()=>smazFakturu(f.id)} style={{...btnC(C.red,true),padding:"3px 10px",fontSize:11}}>🗑</button>
                </div>
              </div>;
            })}
            {(faktury||[]).filter(f=>f.typ==="baracom").length===0&&<div style={{padding:20,textAlign:"center",color:C.dim,fontSize:13}}>Žádné faktury</div>}
          </div>
        </div>

        {/* Odečty hlavního vodoměru */}
        <div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <div style={{fontWeight:700,fontSize:14}}>📟 Odečty hlavního vodoměru</div>
            <button onClick={()=>{setFormOdecet({datum:new Date().toISOString().slice(0,10),stav:"",poznamka:""});setModalOdecet("nova");}} style={{...btnC(C.accent,true),padding:"5px 12px",fontSize:12}}>+ Přidat</button>
          </div>
          <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,overflow:"hidden"}}>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead><tr style={{background:C.bg}}>
                {["Datum","Stav (m³)","Spotřeba","Poznámka",""].map(h=><th key={h} style={{padding:"8px 10px",textAlign:"left",fontSize:11,fontWeight:700,color:C.muted,textTransform:"uppercase"}}>{h}</th>)}
              </tr></thead>
              <tbody>
                {hlavniOdecty.length===0&&<tr><td colSpan={5} style={{padding:16,textAlign:"center",color:C.dim,fontSize:13}}>Žádné odečty</td></tr>}
                {[...hlavniOdecty].reverse().map((o,i,arr)=>{
                  const prev=arr[i+1];
                  // Spotřeba: pokud předchozí byl výměna, počítáme od stav_novy (počáteční stav nového)
                  let diff=null;
                  if(prev){
                    if(prev.vymena&&prev.stav_novy!=null)diff=+(o.stav)-+(prev.stav_novy);
                    else diff=+(o.stav)-+(prev.stav);
                  }
                  if(o.vymena){
                    return <tr key={o.id} style={{borderBottom:`1px solid ${C.border}`,background:"#fff8e1"}}>
                      <td style={{padding:"8px 10px",fontSize:13,whiteSpace:"nowrap"}}>{new Date(o.datum).toLocaleDateString("cs-CZ")}</td>
                      <td style={{padding:"8px 10px",fontSize:12,fontWeight:700}}>
                        <div style={{color:C.muted}}>🔧 {(+o.stav).toFixed(0)} → {o.stav_novy!=null?(+o.stav_novy).toFixed(0):"0"}</div>
                      </td>
                      <td style={{padding:"8px 10px",fontSize:12,color:diff!=null?C.orange:C.dim}}>{diff!=null?`+${diff.toFixed(0)} m³`:"—"}</td>
                      <td style={{padding:"8px 10px",fontSize:11,color:"#b36a00",fontWeight:600}}>Výměna vodoměru{o.cislo_vodomeru?` (nový ${o.cislo_vodomeru})`:""}</td>
                      <td style={{padding:"8px 6px",whiteSpace:"nowrap"}}>
                        <button onClick={()=>smazOdecet(o.id)} style={{...btnC(C.red,true),padding:"2px 7px",fontSize:11}}>🗑</button>
                      </td>
                    </tr>;
                  }
                  return <tr key={o.id} style={{borderBottom:`1px solid ${C.border}`}}>
                    <td style={{padding:"8px 10px",fontSize:13,whiteSpace:"nowrap"}}>{new Date(o.datum).toLocaleDateString("cs-CZ")}</td>
                    <td style={{padding:"8px 10px",fontSize:13,fontWeight:700}}>{(+o.stav).toFixed(0)}</td>
                    <td style={{padding:"8px 10px",fontSize:12,color:diff!=null?C.orange:C.dim}}>{diff!=null?`+${diff.toFixed(0)} m³`:"—"}</td>
                    <td style={{padding:"8px 10px",fontSize:12,color:C.muted}}>{o.poznamka||""}</td>
                    <td style={{padding:"8px 6px",whiteSpace:"nowrap"}}>
                      <button onClick={()=>{setModalOdecet(o);setFormOdecet({datum:o.datum,stav:String(o.stav),poznamka:o.poznamka||""});}} style={{...btnC(C.accent,true),padding:"2px 7px",fontSize:11,marginRight:2}}>✏</button>
                      <button onClick={()=>smazOdecet(o.id)} style={{...btnC(C.red,true),padding:"2px 7px",fontSize:11}}>🗑</button>
                    </td>
                  </tr>;
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal faktura */}
      {modalFak&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
        <div style={{background:C.surface,borderRadius:18,padding:28,width:"100%",maxWidth:440,boxShadow:"0 20px 60px rgba(0,0,0,.25)",maxHeight:"90vh",overflowY:"auto"}}>
          <h3 style={{margin:"0 0 18px",fontSize:17,fontWeight:800}}>{modalFak==="nova"?"Nová faktura":"Upravit fakturu"}</h3>
          <ImportIsdocButton onNacteno={d=>setFormFak(p=>({...p,cislo_faktury:d.cislo_faktury||p.cislo_faktury,datum_vystaveni:d.datum_vystaveni||p.datum_vystaveni,datum_splatnosti:d.datum_splatnosti||p.datum_splatnosti,obdobi_od:d.obdobi_od||p.obdobi_od,obdobi_do:d.obdobi_do||p.obdobi_do,castka:d.castka?String(Math.round(+d.castka)):p.castka,poznamka:d.poznamka||p.poznamka}))}/>
          {[
            {l:"Číslo faktury",k:"cislo_faktury",t:"text"},
            {l:"Datum vystavení",k:"datum_vystaveni",t:"date"},
            {l:"Datum splatnosti",k:"datum_splatnosti",t:"date"},
            {l:"Období od",k:"obdobi_od",t:"date"},
            {l:"Období do",k:"obdobi_do",t:"date"},
            {l:"Stav vodoměru na začátku (m³)",k:"stav_od",t:"number"},
            {l:"Stav vodoměru na konci (m³)",k:"stav_do",t:"number"},
            {l:"Částka k úhradě (Kč)",k:"castka",t:"number"},
            {l:"Poznámka",k:"poznamka",t:"text"},
          ].map(f=><div key={f.k} style={{marginBottom:11}}>
            <div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:4}}>{f.l}</div>
            <input style={inp} type={f.t} value={formFak[f.k]} onChange={e=>setFormFak(p=>({...p,[f.k]:e.target.value}))}/>
          </div>)}
          <label style={{display:"flex",alignItems:"center",gap:8,marginBottom:16,cursor:"pointer",fontSize:13}}>
            <input type="checkbox" checked={formFak.zaplaceno} onChange={e=>setFormFak(p=>({...p,zaplaceno:e.target.checked}))}/>
            Faktura zaplacena
          </label>
          <div style={{display:"flex",gap:10}}>
            <button onClick={ulozFakturu} style={btnC()}>Uložit</button>
            <button onClick={()=>setModalFak(null)} style={btnC(C.muted,true)}>Zrušit</button>
          </div>
        </div>
      </div>}

      {/* Modal odečet */}
      {modalOdecet&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
        <div style={{background:C.surface,borderRadius:18,padding:28,width:"100%",maxWidth:380,boxShadow:"0 20px 60px rgba(0,0,0,.25)"}}>
          <h3 style={{margin:"0 0 18px",fontSize:17,fontWeight:800}}>{modalOdecet==="nova"?"Nový odečet hlavního":"Upravit odečet"}</h3>
          {[{l:"Datum",k:"datum",t:"date"},{l:"Stav vodoměru (m³)",k:"stav",t:"number"},{l:"Poznámka",k:"poznamka",t:"text",ph:"volitelně..."}].map(f=><div key={f.k} style={{marginBottom:11}}>
            <div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:4}}>{f.l}</div>
            <input style={inp} type={f.t} placeholder={f.ph||""} value={formOdecet[f.k]} onChange={e=>setFormOdecet(p=>({...p,[f.k]:e.target.value}))}/>
          </div>)}
          <div style={{display:"flex",gap:10,marginTop:16}}>
            <button onClick={ulozOdecet} style={btnC()}>Uložit</button>
            <button onClick={()=>setModalOdecet(null)} style={btnC(C.muted,true)}>Zrušit</button>
          </div>
        </div>
      </div>}
    </div>;
  };

  // ── PODRUŽNÝ / ZAHRADNÍ ──
  // Jedna komponenta pro oba vedlejší vodoměry. Podružný počítá vodné (cena za m³ + poměrná
  // část ročního paušálu), zahradní počítá úsporu na stočném (zálivka do kanalizace nejde).
  const PodruznyView=({typ="podruzny",arr=podruznyOdecty,nazev="podružného",cenaZaM3=cenaM3,pausalRok=pasualRocni,labelCena="Odhad ceny"})=>{
    const [modal,setModal]=useState(null);
    const [form,setForm]=useState({datum:"",stav:"",poznamka:""});
    const [kalkOd,setKalkOd]=useState("");
    const [kalkDo,setKalkDo]=useState("");

    const uloz=async()=>{
      const data={datum:form.datum,typ,stav:parseFloat(form.stav),poznamka:form.poznamka||null};
      if(modal==="nova")await sb.from("voda_odecty").insert(data);
      else await sb.from("voda_odecty").update(data).eq("id",modal.id);
      reloadOdecty();setModal(null);
    };
    const smaz=async(id)=>{if(!confirm("Smazat odečet?"))return;await sb.from("voda_odecty").delete().eq("id",id);reloadOdecty();};

    // Měsíční přehled — od odečtu k 1. toho měsíce do odečtu k 1. dalšího měsíce
    const mesicniPrehled=()=>{
      if(arr.length<2)return[];
      // Pro každý měsíc najdi odečet nejbližší k 1. dni (±4 dny)
      const nejblizsi=(rok,mes)=>{
        const cil=new Date(rok,mes-1,1);
        const k=arr.filter(o=>Math.abs(new Date(o.datum)-cil)/(1000*60*60*24)<=4);
        if(!k.length)return null;
        return k.sort((a,b)=>Math.abs(new Date(a.datum)-cil)-Math.abs(new Date(b.datum)-cil))[0];
      };
      // Rozsah měsíců
      const d0=new Date(arr[0].datum);
      const d1=new Date(arr[arr.length-1].datum);
      const result=[];
      for(let y=d0.getFullYear();y<=d1.getFullYear();y++){
        for(let m=1;m<=12;m++){
          const od=nejblizsi(y,m);
          if(!od)continue;
          const nm=m===12?1:m+1; const ny=m===12?y+1:y;
          const do_=nejblizsi(ny,nm);
          if(!do_)continue; // konec ještě není
          const stavOd=+(od.stav); const stavDo=+(do_.stav);
          const spotreba=stavDo-stavOd;
          const dny=Math.round((new Date(do_.datum)-new Date(od.datum))/(1000*60*60*24));
          const odhadCena=spotreba*cenaZaM3+(pausalRok/365*dny);
          result.push({mesic:`${y}-${String(m).padStart(2,"0")}`,datumOd:od.datum,datumDo:do_.datum,stavOd,stavDo,spotreba,odhadCena,dny});
        }
      }
      return result;
    };

    const prehled=mesicniPrehled();
    const posledni=arr[arr.length-1];
    const predposledni=arr[arr.length-2];
    const aktSpotreba=posledni&&predposledni?+(posledni.stav)-+(predposledni.stav):null;

    return <div>
      {/* Aktuální stav */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:20}}>
        {[
          {l:"Aktuální stav",v:posledni?`${(+posledni.stav).toFixed(3)} m³`:"—",c:C.blue,sub:posledni?new Date(posledni.datum).toLocaleDateString("cs-CZ"):""},
          {l:"Spotřeba od posl. odečtu",v:aktSpotreba!=null?`${aktSpotreba.toFixed(3)} m³`:"—",c:aktSpotreba>0?C.orange:C.green},
          {l:labelCena,v:aktSpotreba!=null?`${(aktSpotreba*cenaZaM3).toLocaleString("cs",{maximumFractionDigits:0})} Kč`:"—",c:C.accent},
        ].map(k=><div key={k.l} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"14px 16px",borderTop:`3px solid ${k.c}`}}>
          <div style={{fontSize:10,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:.5,marginBottom:4}}>{k.l}</div>
          <div style={{fontSize:18,fontWeight:800,color:k.c}}>{k.v}</div>
          {k.sub&&<div style={{fontSize:11,color:C.muted,marginTop:2}}>{k.sub}</div>}
        </div>)}
      </div>

      {/* Kalkulačka — výpočet z vybraných odečtů */}
      {(()=>{
        const odecetOd=arr.find(o=>o.id===kalkOd);
        const odecetDo=arr.find(o=>o.id===kalkDo);
        let vysledek=null;
        if(odecetOd&&odecetDo){
          const sp=+(odecetDo.stav)-+(odecetOd.stav);
          const dny=Math.round((new Date(odecetDo.datum)-new Date(odecetOd.datum))/(1000*60*60*24));
          vysledek={sp,dny,cenaVoda:sp*cenaZaM3,pausal:pausalRok/365*dny,celkem:sp*cenaZaM3+(pausalRok/365*Math.max(0,dny))};
        }
        return <div style={{background:"#eef4fc",border:"1px solid #b3d1f0",borderRadius:14,padding:"16px 20px",marginBottom:20}}>
          <div style={{fontSize:12,fontWeight:700,textTransform:"uppercase",letterSpacing:.6,color:"#1a4fa8",marginBottom:12}}>🧮 Kalkulačka spotřeby — vyber odečty</div>
          <div style={{display:"flex",gap:12,alignItems:"flex-end",flexWrap:"wrap",marginBottom:vysledek?14:0}}>
            <div style={{flex:1,minWidth:160}}>
              <div style={{fontSize:11,fontWeight:700,color:"#1a4fa8",marginBottom:4}}>Od odečtu</div>
              <select style={inp} value={kalkOd} onChange={e=>setKalkOd(e.target.value)}>
                <option value="">— vyber —</option>
                {arr.map(o=><option key={o.id} value={o.id}>{new Date(o.datum).toLocaleDateString("cs-CZ")} ({(+o.stav).toFixed(3)} m³)</option>)}
              </select>
            </div>
            <div style={{flex:1,minWidth:160}}>
              <div style={{fontSize:11,fontWeight:700,color:"#1a4fa8",marginBottom:4}}>Do odečtu</div>
              <select style={inp} value={kalkDo} onChange={e=>setKalkDo(e.target.value)}>
                <option value="">— vyber —</option>
                {arr.map(o=><option key={o.id} value={o.id}>{new Date(o.datum).toLocaleDateString("cs-CZ")} ({(+o.stav).toFixed(3)} m³)</option>)}
              </select>
            </div>
          </div>
          {vysledek&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))",gap:10}}>
            {[
              {l:"Období",v:`${vysledek.dny} dní`},
              {l:"Spotřeba",v:`${vysledek.sp.toFixed(3)} m³`},
              {l:labelCena,v:`${vysledek.cenaVoda.toLocaleString("cs",{maximumFractionDigits:0})} Kč`},
              {l:"Paušál (poměr)",v:`${vysledek.pausal.toLocaleString("cs",{maximumFractionDigits:0})} Kč`},
            ].map(k=><div key={k.l} style={{background:"rgba(255,255,255,.7)",borderRadius:8,padding:"8px 10px"}}>
              <div style={{fontSize:10,fontWeight:700,color:"#3066b0",textTransform:"uppercase",letterSpacing:.4,marginBottom:2}}>{k.l}</div>
              <div style={{fontSize:14,fontWeight:700,color:"#0d2f66"}}>{k.v}</div>
            </div>)}
            <div style={{gridColumn:"1/-1",display:"flex",justifyContent:"space-between",alignItems:"center",background:"#1a4fa8",borderRadius:10,padding:"10px 16px",marginTop:4}}>
              <span style={{fontSize:13,fontWeight:700,color:"#fff"}}>Celková cena</span>
              <span style={{fontSize:20,fontWeight:800,color:"#fff"}}>{vysledek.celkem.toLocaleString("cs",{maximumFractionDigits:0})} Kč</span>
            </div>
          </div>}
        </div>;
      })()}

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
        {/* Měsíční přehled */}
        <div>
          <div style={{fontWeight:700,fontSize:14,marginBottom:10}}>📅 Měsíční spotřeba</div>
          <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,overflow:"hidden"}}>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead><tr style={{background:C.bg}}>
                {["Období","Stav od","Stav do","Spotřeba","Odhad ceny"].map(h=><th key={h} style={{padding:"8px 10px",textAlign:"left",fontSize:11,fontWeight:700,color:C.muted,textTransform:"uppercase",whiteSpace:"nowrap"}}>{h}</th>)}
              </tr></thead>
              <tbody>
                {prehled.length===0&&<tr><td colSpan={5} style={{padding:16,textAlign:"center",color:C.dim}}>Žádná data</td></tr>}
                {[...prehled].reverse().map((r,i)=><tr key={r.datumOd} style={{background:i%2===0?C.surface:"#fafbff",borderBottom:`1px solid ${C.border}`}}>
                  <td style={{padding:"9px 10px",fontWeight:600,fontSize:13,whiteSpace:"nowrap"}}>
                    <div>{new Date(r.mesic+"-01").toLocaleDateString("cs-CZ",{month:"long",year:"numeric"})}</div>
                    <div style={{color:C.dim,fontSize:10,fontWeight:400}}>{new Date(r.datumOd).toLocaleDateString("cs-CZ")} → {new Date(r.datumDo).toLocaleDateString("cs-CZ")}</div>
                  </td>
                  <td style={{padding:"9px 10px",fontSize:13,color:C.muted}}>{r.stavOd.toFixed(3)}</td>
                  <td style={{padding:"9px 10px",fontSize:13,color:C.muted}}>{r.stavDo.toFixed(3)}</td>
                  <td style={{padding:"9px 10px",fontSize:13,fontWeight:700,color:r.spotreba>20?C.red:r.spotreba>10?C.orange:C.green}}>{r.spotreba.toFixed(3)} m³</td>
                  <td style={{padding:"9px 10px",fontSize:13,fontWeight:700,color:C.accent}}>{r.odhadCena.toLocaleString("cs",{maximumFractionDigits:0})} Kč</td>
                </tr>)}
              </tbody>
              {prehled.length>0&&<tfoot><tr style={{background:C.bg,borderTop:`2px solid ${C.border}`}}>
                <td style={{padding:"9px 10px",fontWeight:700,fontSize:13}}>CELKEM 2026</td>
                <td colSpan={2}/>
                <td style={{padding:"9px 10px",fontWeight:800,color:C.accent}}>
                  {prehled.filter(r=>r.mesic.startsWith("2026")).reduce((a,r)=>a+r.spotreba,0).toFixed(3)} m³
                </td>
                <td style={{padding:"9px 10px",fontWeight:800,color:C.accent}}>
                  {prehled.filter(r=>r.mesic.startsWith("2026")).reduce((a,r)=>a+r.odhadCena,0).toLocaleString("cs",{maximumFractionDigits:0})} Kč
                </td>
              </tr></tfoot>}
            </table>
          </div>
        </div>

        {/* Všechny odečty */}
        <div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <div style={{fontWeight:700,fontSize:14}}>📋 Všechny odečty</div>
            <button onClick={()=>{setForm({datum:new Date().toISOString().slice(0,10),stav:"",poznamka:""});setModal("nova");}} style={btnC()}>+ Zapsat</button>
          </div>
          <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,overflow:"hidden",maxHeight:460,overflowY:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead><tr style={{background:C.bg,position:"sticky",top:0}}>
                {["Datum","Stav (m³)","Spotřeba","Pozn.",""].map(h=><th key={h} style={{padding:"8px 10px",textAlign:"left",fontSize:11,fontWeight:700,color:C.muted,textTransform:"uppercase"}}>{h}</th>)}
              </tr></thead>
              <tbody>
                {arr.length===0&&<tr><td colSpan={5} style={{padding:16,textAlign:"center",color:C.dim}}>Žádné odečty</td></tr>}
                {[...arr].reverse().map((o,i,arr)=>{
                  const prev=arr[i+1];
                  const diff=prev?+(o.stav)-+(prev.stav):null;
                  return <tr key={o.id} style={{borderBottom:`1px solid ${C.border}`}}>
                    <td style={{padding:"8px 10px",fontSize:12,whiteSpace:"nowrap"}}>{new Date(o.datum).toLocaleDateString("cs-CZ")}</td>
                    <td style={{padding:"8px 10px",fontSize:12,fontWeight:700}}>{(+o.stav).toFixed(3)}</td>
                    <td style={{padding:"8px 10px",fontSize:12,color:diff!=null?(diff>0?C.orange:C.green):C.dim,fontWeight:diff!=null?600:400}}>{diff!=null?`+${diff.toFixed(3)}`:"—"}</td>
                    <td style={{padding:"8px 10px",fontSize:11,color:C.muted,maxWidth:80,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{o.poznamka||""}</td>
                    <td style={{padding:"8px 6px",whiteSpace:"nowrap"}}>
                      <button onClick={()=>{setModal(o);setForm({datum:o.datum,stav:String(o.stav),poznamka:o.poznamka||""});}} style={{...btnC(C.accent,true),padding:"2px 6px",fontSize:10,marginRight:2}}>✏</button>
                      <button onClick={()=>smaz(o.id)} style={{...btnC(C.red,true),padding:"2px 6px",fontSize:10}}>🗑</button>
                    </td>
                  </tr>;
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {modal&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
        <div style={{background:C.surface,borderRadius:18,padding:28,width:"100%",maxWidth:380,boxShadow:"0 20px 60px rgba(0,0,0,.25)"}}>
          <h3 style={{margin:"0 0 18px",fontSize:17,fontWeight:800}}>{modal==="nova"?`Nový odečet ${nazev}`:"Upravit odečet"}</h3>
          {[{l:"Datum",k:"datum",t:"date"},{l:"Stav vodoměru (m³)",k:"stav",t:"number",ph:"0.000"},{l:"Poznámka",k:"poznamka",t:"text",ph:"volitelně..."}].map(f=><div key={f.k} style={{marginBottom:11}}>
            <div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:4}}>{f.l}</div>
            <input style={inp} type={f.t} step={f.t==="number"?"0.001":undefined} placeholder={f.ph||""} value={form[f.k]} onChange={e=>setForm(p=>({...p,[f.k]:e.target.value}))}/>
          </div>)}
          <div style={{display:"flex",gap:10,marginTop:16}}>
            <button onClick={uloz} style={btnC()}>Uložit</button>
            <button onClick={()=>setModal(null)} style={btnC(C.muted,true)}>Zrušit</button>
          </div>
        </div>
      </div>}
    </div>;
  };

  // ── STOČNÉ ──
  // Technické služby Vodochody-Hoštice s.r.o., fakturováno pololetně.
  // Základ = spotřeba fakturačního (Baracom) vodoměru MÍNUS spotřeba zahradního
  // (zálivka do kanalizace neodtéká). Žádný paušál, jen cena × m³.
  const StocneView=()=>{
    const [modalFak,setModalFak]=useState(null);
    const [formFak,setFormFak]=useState({cislo_faktury:"",datum_vystaveni:"",datum_splatnosti:"",obdobi_od:"",obdobi_do:"",stav_od:"",stav_do:"",castka:"",zaplaceno:false,poznamka:""});
    const [kalkOd,setKalkOd]=useState("");
    const [kalkDo,setKalkDo]=useState("");

    const fakturyS=(faktury||[]).filter(f=>f.typ==="stocne").sort((a,b)=>new Date(b.obdobi_od)-new Date(a.obdobi_od));

    const ulozFakturu=async()=>{
      const data={typ:"stocne",cislo_faktury:formFak.cislo_faktury||null,datum_vystaveni:formFak.datum_vystaveni||null,datum_splatnosti:formFak.datum_splatnosti||null,obdobi_od:formFak.obdobi_od||null,obdobi_do:formFak.obdobi_do||null,castka:parseInt(formFak.castka)||0,zaplaceno:formFak.zaplaceno,poznamka:formFak.poznamka||null,stav_od:formFak.stav_od?parseFloat(formFak.stav_od):null,stav_do:formFak.stav_do?parseFloat(formFak.stav_do):null};
      const {error}=modalFak==="nova"?await sb.from("voda_faktury").insert(data):await sb.from("voda_faktury").update(data).eq("id",modalFak.id);
      if(error){alert("Chyba při ukládání: "+error.message);return;}
      reloadFaktury();setModalFak(null);
    };
    const smazFakturu=async(id)=>{if(!confirm("Smazat fakturu?"))return;await sb.from("voda_faktury").delete().eq("id",id);reloadFaktury();};
    const toggleZaplaceno=async(f)=>{await sb.from("voda_faktury").update({zaplaceno:!f.zaplaceno}).eq("id",f.id);reloadFaktury();};

    // Nejbližší odečet daného vodoměru k datu (tolerance ve dnech)
    const nejblizsi=(pole,datum,tolerance=20)=>{
      const cil=new Date(datum);
      const k=pole.filter(o=>Math.abs(new Date(o.datum)-cil)/(1000*60*60*24)<=tolerance);
      if(!k.length)return null;
      return k.sort((a,b)=>Math.abs(new Date(a.datum)-cil)-Math.abs(new Date(b.datum)-cil))[0];
    };

    const odecetOd=hlavniOdecty.find(o=>o.id===kalkOd);
    const odecetDo=hlavniOdecty.find(o=>o.id===kalkDo);
    let vysl=null;
    if(odecetOd&&odecetDo){
      const spHlavni=+(odecetDo.stav)-+(odecetOd.stav);
      const zOd=nejblizsi(zahradniOdecty,odecetOd.datum);
      const zDo=nejblizsi(zahradniOdecty,odecetDo.datum);
      const spZahrada=zOd&&zDo?Math.max(0,+(zDo.stav)-+(zOd.stav)):0;
      const zaklad=Math.max(0,spHlavni-spZahrada);
      vysl={spHlavni,spZahrada,zaklad,zOd,zDo,cena:zaklad*cenaStocneM3,bezOdpoctu:spHlavni*cenaStocneM3,uspora:spZahrada*cenaStocneM3};
    }

    const nezaplacene=fakturyS.filter(f=>!f.zaplaceno).reduce((a,f)=>a+f.castka,0);

    return <div>
      {/* Souhrn */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:20}}>
        {[
          {l:"Cena za m³ (s DPH)",v:`${cenaStocneM3.toLocaleString("cs",{maximumFractionDigits:2})} Kč`,c:C.blue,sub:"Technické služby Vodochody-Hoštice"},
          {l:"Poslední faktura",v:fakturyS[0]?`${fakturyS[0].castka.toLocaleString("cs")} Kč`:"—",c:C.accent,sub:fakturyS[0]?.obdobi_od?`${new Date(fakturyS[0].obdobi_od).toLocaleDateString("cs-CZ")} – ${new Date(fakturyS[0].obdobi_do).toLocaleDateString("cs-CZ")}`:""},
          {l:"Nezaplaceno",v:`${nezaplacene.toLocaleString("cs")} Kč`,c:nezaplacene>0?C.red:C.green},
        ].map(k=><div key={k.l} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"14px 16px",borderTop:`3px solid ${k.c}`}}>
          <div style={{fontSize:10,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:.5,marginBottom:4}}>{k.l}</div>
          <div style={{fontSize:18,fontWeight:800,color:k.c}}>{k.v}</div>
          {k.sub&&<div style={{fontSize:11,color:C.muted,marginTop:2}}>{k.sub}</div>}
        </div>)}
      </div>

      {/* Kalkulačka stočného */}
      <div style={{background:"#f0f7ee",border:"1px solid #b9d9ae",borderRadius:14,padding:"16px 20px",marginBottom:20}}>
        <div style={{fontSize:12,fontWeight:700,textTransform:"uppercase",letterSpacing:.6,color:"#2c6b1f",marginBottom:4}}>🧮 Kalkulačka stočného</div>
        <div style={{fontSize:11,color:"#4a7a3d",marginBottom:12}}>Základ = spotřeba fakturačního vodoměru − spotřeba zahradního (zálivka do kanalizace neodtéká).</div>
        <div style={{display:"flex",gap:12,alignItems:"flex-end",flexWrap:"wrap",marginBottom:vysl?14:0}}>
          {[{l:"Od odečtu (Baracom)",v:kalkOd,set:setKalkOd},{l:"Do odečtu (Baracom)",v:kalkDo,set:setKalkDo}].map(f=><div key={f.l} style={{flex:1,minWidth:160}}>
            <div style={{fontSize:11,fontWeight:700,color:"#2c6b1f",marginBottom:4}}>{f.l}</div>
            <select style={inp} value={f.v} onChange={e=>f.set(e.target.value)}>
              <option value="">— vyber —</option>
              {hlavniOdecty.map(o=><option key={o.id} value={o.id}>{new Date(o.datum).toLocaleDateString("cs-CZ")} ({(+o.stav).toFixed(3)} m³)</option>)}
            </select>
          </div>)}
        </div>
        {vysl&&<>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:10}}>
            {[
              {l:"Baracom spotřeba",v:`${vysl.spHlavni.toFixed(3)} m³`},
              {l:"Zahradní odpočet",v:`− ${vysl.spZahrada.toFixed(3)} m³`},
              {l:"Základ pro stočné",v:`${vysl.zaklad.toFixed(3)} m³`},
              {l:"Úspora díky zahradě",v:`${vysl.uspora.toLocaleString("cs",{maximumFractionDigits:0})} Kč`},
            ].map(k=><div key={k.l} style={{background:"rgba(255,255,255,.75)",borderRadius:8,padding:"8px 10px"}}>
              <div style={{fontSize:10,fontWeight:700,color:"#3d7a2c",textTransform:"uppercase",letterSpacing:.4,marginBottom:2}}>{k.l}</div>
              <div style={{fontSize:14,fontWeight:700,color:"#1e4a12"}}>{k.v}</div>
            </div>)}
          </div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:"#2c6b1f",borderRadius:10,padding:"10px 16px",marginTop:10}}>
            <span style={{fontSize:13,fontWeight:700,color:"#fff"}}>Stočné celkem</span>
            <span style={{fontSize:20,fontWeight:800,color:"#fff"}}>{vysl.cena.toLocaleString("cs",{maximumFractionDigits:0})} Kč</span>
          </div>
          <div style={{fontSize:11,color:"#4a7a3d",marginTop:8}}>
            {vysl.zOd&&vysl.zDo
              ? `Zahradní vodoměr: ${new Date(vysl.zOd.datum).toLocaleDateString("cs-CZ")} (${(+vysl.zOd.stav).toFixed(3)}) → ${new Date(vysl.zDo.datum).toLocaleDateString("cs-CZ")} (${(+vysl.zDo.stav).toFixed(3)})`
              : "⚠ K těmto datům nejsou odečty zahradního vodoměru (tolerance 20 dní) — počítá se bez odpočtu."}
          </div>
        </>}
      </div>

      {/* Faktury */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
        <div style={{fontWeight:700,fontSize:14}}>🧾 Faktury za stočné</div>
        <button onClick={()=>{setFormFak({cislo_faktury:"",datum_vystaveni:"",datum_splatnosti:"",obdobi_od:"",obdobi_do:"",stav_od:"",stav_do:"",castka:"",zaplaceno:false,poznamka:""});setModalFak("nova");}} style={btnC()}>+ Faktura</button>
      </div>
      <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,overflow:"hidden"}}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr style={{background:C.bg}}>
            {["Číslo","Období","Stav od → do","Částka","Splatnost","Stav",""].map(h=><th key={h} style={{padding:"8px 10px",textAlign:"left",fontSize:11,fontWeight:700,color:C.muted,textTransform:"uppercase",whiteSpace:"nowrap"}}>{h}</th>)}
          </tr></thead>
          <tbody>
            {fakturyS.length===0&&<tr><td colSpan={7} style={{padding:20,textAlign:"center",color:C.dim,fontSize:13}}>Žádné faktury</td></tr>}
            {fakturyS.map((f,i)=><tr key={f.id} style={{background:i%2===0?C.surface:"#fafbff",borderBottom:`1px solid ${C.border}`}}>
              <td style={{padding:"9px 10px",fontSize:12,fontWeight:600,whiteSpace:"nowrap"}}>{f.cislo_faktury||"—"}</td>
              <td style={{padding:"9px 10px",fontSize:12,whiteSpace:"nowrap"}}>{f.obdobi_od?`${new Date(f.obdobi_od).toLocaleDateString("cs-CZ")} – ${new Date(f.obdobi_do).toLocaleDateString("cs-CZ")}`:"—"}</td>
              <td style={{padding:"9px 10px",fontSize:12,color:C.muted,whiteSpace:"nowrap"}}>{f.stav_od!=null&&f.stav_do!=null?`${f.stav_od} → ${f.stav_do} (${(+f.stav_do-+f.stav_od).toFixed(3)} m³)`:"—"}</td>
              <td style={{padding:"9px 10px",fontSize:13,fontWeight:700,color:C.accent,whiteSpace:"nowrap"}}>{f.castka.toLocaleString("cs")} Kč</td>
              <td style={{padding:"9px 10px",fontSize:12,whiteSpace:"nowrap"}}>{f.datum_splatnosti?new Date(f.datum_splatnosti).toLocaleDateString("cs-CZ"):"—"}</td>
              <td style={{padding:"9px 10px",whiteSpace:"nowrap"}}>
                <button onClick={()=>toggleZaplaceno(f)} style={{...btnC(f.zaplaceno?C.green:C.orange,true),padding:"3px 9px",fontSize:11}}>{f.zaplaceno?"✓ Zaplaceno":"Nezaplaceno"}</button>
              </td>
              <td style={{padding:"9px 6px",whiteSpace:"nowrap"}}>
                <button onClick={()=>{setModalFak(f);setFormFak({cislo_faktury:f.cislo_faktury||"",datum_vystaveni:f.datum_vystaveni||"",datum_splatnosti:f.datum_splatnosti||"",obdobi_od:f.obdobi_od||"",obdobi_do:f.obdobi_do||"",stav_od:f.stav_od!=null?String(f.stav_od):"",stav_do:f.stav_do!=null?String(f.stav_do):"",castka:String(f.castka),zaplaceno:f.zaplaceno,poznamka:f.poznamka||""});}} style={{...btnC(C.accent,true),padding:"2px 6px",fontSize:10,marginRight:2}}>✏</button>
                <button onClick={()=>smazFakturu(f.id)} style={{...btnC(C.red,true),padding:"2px 6px",fontSize:10}}>🗑</button>
              </td>
            </tr>)}
          </tbody>
        </table>
      </div>

      {modalFak&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:20,overflowY:"auto"}}>
        <div style={{background:C.surface,borderRadius:18,padding:28,width:"100%",maxWidth:440,boxShadow:"0 20px 60px rgba(0,0,0,.25)"}}>
          <h3 style={{margin:"0 0 18px",fontSize:17,fontWeight:800}}>{modalFak==="nova"?"Nová faktura za stočné":"Upravit fakturu"}</h3>
          <ImportIsdocButton onNacteno={d=>setFormFak(p=>({...p,cislo_faktury:d.cislo_faktury||p.cislo_faktury,datum_vystaveni:d.datum_vystaveni||p.datum_vystaveni,datum_splatnosti:d.datum_splatnosti||p.datum_splatnosti,obdobi_od:d.obdobi_od||p.obdobi_od,obdobi_do:d.obdobi_do||p.obdobi_do,castka:d.castka?String(Math.round(+d.castka)):p.castka,poznamka:d.poznamka||p.poznamka}))}/>
          {[{l:"Číslo faktury",k:"cislo_faktury",t:"text",ph:"260100131"},{l:"Datum vystavení",k:"datum_vystaveni",t:"date"},{l:"Datum splatnosti",k:"datum_splatnosti",t:"date"},{l:"Období od",k:"obdobi_od",t:"date"},{l:"Období do",k:"obdobi_do",t:"date"},{l:"Stav vodoměru od (m³)",k:"stav_od",t:"number"},{l:"Stav vodoměru do (m³)",k:"stav_do",t:"number"},{l:"Částka (Kč)",k:"castka",t:"number"},{l:"Poznámka",k:"poznamka",t:"text",ph:"volitelně..."}].map(f=><div key={f.k} style={{marginBottom:11}}>
            <div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:4}}>{f.l}</div>
            <input style={inp} type={f.t} step={f.t==="number"?"0.001":undefined} placeholder={f.ph||""} value={formFak[f.k]} onChange={e=>setFormFak(p=>({...p,[f.k]:e.target.value}))}/>
          </div>)}
          <label style={{display:"flex",alignItems:"center",gap:8,fontSize:13,fontWeight:600,marginBottom:6,cursor:"pointer"}}>
            <input type="checkbox" checked={formFak.zaplaceno} onChange={e=>setFormFak(p=>({...p,zaplaceno:e.target.checked}))}/> Zaplaceno
          </label>
          <div style={{display:"flex",gap:10,marginTop:16}}>
            <button onClick={ulozFakturu} style={btnC()}>Uložit</button>
            <button onClick={()=>setModalFak(null)} style={btnC(C.muted,true)}>Zrušit</button>
          </div>
        </div>
      </div>}
    </div>;
  };

  // ── NASTAVENÍ ──
  const NastaveniView=()=>{
    const [form,setForm]=useState({cena_m3_bez_dph:nast.cena_m3_bez_dph||"71.60",cena_m3_s_dph:nast.cena_m3_s_dph||"80.19",pausal_rocni_bez_dph:nast.pausal_rocni_bez_dph||"1100",pausal_rocni_s_dph:nast.pausal_rocni_s_dph||"1232",cena_stocne_m3_bez_dph:nast.cena_stocne_m3_bez_dph||"58",cena_stocne_m3_s_dph:nast.cena_stocne_m3_s_dph||"64.96"});
    const uloz=async()=>{
      for(const[k,v]of Object.entries(form))await sb.from("voda_nastaveni").upsert({klic:k,hodnota:String(v)});
      reloadNast();alert("Uloženo!");
    };
    const skupiny=[
      {nadpis:"Ceník BARACOM — vodné",pole:[{l:"Cena za m³ bez DPH (Kč)",k:"cena_m3_bez_dph"},{l:"Cena za m³ s DPH (Kč)",k:"cena_m3_s_dph"},{l:"Roční paušál bez DPH (Kč)",k:"pausal_rocni_bez_dph"},{l:"Roční paušál s DPH (Kč)",k:"pausal_rocni_s_dph"}]},
      {nadpis:"Technické služby Vodochody-Hoštice — stočné",pole:[{l:"Cena za m³ bez DPH (Kč)",k:"cena_stocne_m3_bez_dph"},{l:"Cena za m³ s DPH (Kč, DPH 12 %)",k:"cena_stocne_m3_s_dph"}],pozn:"Bez paušálu. Fakturováno pololetně, základ = Baracom mínus zahradní vodoměr."},
    ];
    return <div style={{maxWidth:400}}>
      {skupiny.map(s=><div key={s.nadpis} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,padding:20,marginBottom:16}}>
        <h3 style={{margin:"0 0 4px",fontSize:15,fontWeight:800}}>{s.nadpis}</h3>
        {s.pozn&&<div style={{fontSize:11,color:C.muted,marginBottom:12}}>{s.pozn}</div>}
        <div style={{marginTop:12}}/>
        {s.pole.map(f=><div key={f.k} style={{marginBottom:12}}>
          <div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:5}}>{f.l}</div>
          <input style={inp} type="number" step="0.01" value={form[f.k]} onChange={e=>setForm(p=>({...p,[f.k]:e.target.value}))}/>
        </div>)}
      </div>)}
      <button onClick={uloz} style={btnC()}>Uložit ceník</button>
    </div>;
  };

  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
      <h2 style={{margin:0,fontSize:22,fontWeight:800}}>🚰 Voda — Hoštice</h2>
    </div>
    <div style={{display:"flex",gap:2,marginBottom:24,borderBottom:`2px solid ${C.border}`,overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
      {tabs.map(t=><button key={t.id} onClick={()=>setZalozka(t.id)} style={{padding:"9px 18px",border:"none",background:"none",cursor:"pointer",fontSize:13,fontWeight:700,color:zalozka===t.id?C.accent:C.muted,borderBottom:zalozka===t.id?`2px solid ${C.accent}`:"2px solid transparent",marginBottom:-2}}>{t.l}</button>)}
    </div>
    {zalozka==="fakturacni"&&<FakturacniView/>}
    {zalozka==="podruzny"&&<PodruznyView/>}
    {zalozka==="zahradni"&&<PodruznyView typ="zahradni" arr={zahradniOdecty} nazev="zahradního" cenaZaM3={cenaStocneM3} pausalRok={0} labelCena="Úspora na stočném"/>}
    {zalozka==="stocne"&&<StocneView/>}
    {zalozka==="nastaveni"&&<NastaveniView/>}
  </div>;
}

// ── SVG LINE CHART ───────────────────────────────────────────────────────────
function SvgLineChart({data,color="#4f7ef0"}){
  const [tooltip,setTooltip]=useState(null);
  const svgRef=useRef(null);
  if(!data||data.length<2)return null;

  const W=800,H=260,padL=72,padR=20,padT=16,padB=36;
  const vals=data.map(d=>d.suma);
  const minV=Math.min(...vals);
  const maxV=Math.max(...vals);
  const rng=maxV-minV||1;

  const x=(i)=>padL+(i/(data.length-1))*(W-padL-padR);
  const y=(v)=>padT+(1-(v-minV)/rng)*(H-padT-padB);

  const pts=data.map((d,i)=>`${x(i)},${y(d.suma)}`).join(" ");
  const areaPath=`M${x(0)},${y(data[0].suma)} `+data.map((d,i)=>`L${x(i)},${y(d.suma)}`).join(" ")+` L${x(data.length-1)},${H-padB} L${x(0)},${H-padB} Z`;

  // Y ticks
  const yTicks=5;
  const yTickVals=Array.from({length:yTicks+1},(_,i)=>minV+rng*(i/yTicks));
  const fmt=(v)=>v>=1000000?`${(v/1000000).toFixed(1)}M`:v>=1000?`${Math.round(v/1000)}k`:`${Math.round(v)}`;

  // X ticks — max 10
  const step=Math.max(1,Math.floor(data.length/10));
  const xTicks=data.filter((_,i)=>i%step===0||i===data.length-1);

  return <div style={{position:"relative",width:"100%"}}>
    <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} style={{width:"100%",height:"auto",display:"block"}}
      onMouseMove={e=>{
        const rect=svgRef.current?.getBoundingClientRect();
        if(!rect)return;
        const mx=(e.clientX-rect.left)/rect.width*W;
        let best=0,bestDist=999;
        data.forEach((d,i)=>{const dist=Math.abs(x(i)-mx);if(dist<bestDist){bestDist=dist;best=i;}});
        if(bestDist<30)setTooltip({i:best,cx:x(best),cy:y(data[best].suma),d:data[best]});
        else setTooltip(null);
      }}
      onMouseLeave={()=>setTooltip(null)}>
      {/* Grid */}
      {yTickVals.map((v,i)=><line key={i} x1={padL} y1={y(v)} x2={W-padR} y2={y(v)} stroke="#e5e7eb" strokeWidth=".5"/>)}
      {/* Y labels */}
      {yTickVals.map((v,i)=><text key={i} x={padL-6} y={y(v)+4} textAnchor="end" fontSize="10" fill="#9ca3af">{fmt(v)}</text>)}
      {/* X labels */}
      {xTicks.map((d,i)=><text key={i} x={x(data.indexOf(d))} y={H-4} textAnchor="middle" fontSize="10" fill="#9ca3af">{d.label}</text>)}
      {/* Area */}
      <path d={areaPath} fill={color} fillOpacity=".08"/>
      {/* Line */}
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round"/>
      {/* Tooltip line */}
      {tooltip&&<line x1={tooltip.cx} y1={padT} x2={tooltip.cx} y2={H-padB} stroke={color} strokeWidth="1" strokeDasharray="4"/>}
      {/* Tooltip dot */}
      {tooltip&&<circle cx={tooltip.cx} cy={tooltip.cy} r="5" fill={color} stroke="#fff" strokeWidth="2"/>}
    </svg>
      {/* Tooltip box */}
    {tooltip&&<div style={{position:"absolute",left:`${(tooltip.cx/W*100).toFixed(1)}%`,top:tooltip.cy/H*100+"%",transform:"translate(-50%,-120%)",background:"rgba(0,0,0,.8)",color:"#fff",borderRadius:8,padding:"6px 10px",fontSize:12,fontWeight:700,pointerEvents:"none",whiteSpace:"nowrap"}}>
      <div style={{color:"#aaa",fontWeight:400,fontSize:11}}>{tooltip.d.label}</div>
      {tooltip.d.suma.toLocaleString("cs")} Kč
    </div>}
  </div>;
}

// ── AUTA TAB ─────────────────────────────────────────────────────────────────
function AutaTab(){
  const [aktivniAuto,setAktivniAuto]=useState(null);
  const {data:auta,reload:reloadAuta}=useData(()=>sb.from("auta").select("*").eq("stav","aktivni").order("poradi"));

  if(aktivniAuto)return <AutoDetail auto={aktivniAuto} onBack={()=>setAktivniAuto(null)} reloadAuta={reloadAuta}/>;

  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
      <h2 style={{margin:0,fontSize:22,fontWeight:800}}>🚗 Auta</h2>
      <button onClick={()=>setAktivniAuto("nove")} style={btnC()}>+ Přidat auto</button>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:16}}>
      {(auta||[]).map(a=><AutoKarta key={a.id} auto={a} onClick={()=>setAktivniAuto(a)}/>)}
    </div>
  </div>;
}

function AutoKarta({auto:a,onClick}){
  const {data:servisy}=useData(()=>sb.from("auta_servis").select("typ,dalsi_servis_datum").eq("auto_id",a.id).order("datum",{ascending:false}));
  const {data:km}=useData(()=>sb.from("auta_kilometry").select("stav_km,datum").eq("auto_id",a.id).order("datum",{ascending:false}).limit(1));

  const typBarva={vlastni:C.green,leasing:"#9b7ef5",operativni_leasing:"#e8922a"};
  const typLabel={vlastni:"Vlastní",leasing:"Leasing",operativni_leasing:"Operativní leasing"};

  // Nejbližší servis
  const dnes=new Date();
  const blizkyServis=(servisy||[]).filter(s=>s.dalsi_servis_datum).map(s=>new Date(s.dalsi_servis_datum)).filter(d=>d>dnes).sort((a,b)=>a-b)[0];
  const dnuDoServisu=blizkyServis?Math.round((blizkyServis-dnes)/(1000*60*60*24)):null;

  return <div onClick={onClick} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:16,padding:20,cursor:"pointer",transition:"all .2s",borderTop:`4px solid ${typBarva[a.typ_vlastnictvi]||C.accent}`}}
    onMouseEnter={e=>e.currentTarget.style.boxShadow="0 4px 20px rgba(0,0,0,.1)"}
    onMouseLeave={e=>e.currentTarget.style.boxShadow="none"}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
      <div>
        <div style={{fontWeight:800,fontSize:18}}>{a.nazev}</div>
        {a.spz&&<div style={{fontSize:12,color:C.muted,fontFamily:"monospace",background:C.bg,padding:"2px 8px",borderRadius:4,display:"inline-block",marginTop:4}}>{a.spz}</div>}
      </div>
      <span style={{fontSize:11,fontWeight:700,color:typBarva[a.typ_vlastnictvi],background:typBarva[a.typ_vlastnictvi]+"22",borderRadius:99,padding:"3px 10px"}}>{typLabel[a.typ_vlastnictvi]}</span>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
      <div style={{background:C.bg,borderRadius:8,padding:"8px 10px"}}>
        <div style={{fontSize:10,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:.5,marginBottom:2}}>Km</div>
        <div style={{fontSize:16,fontWeight:700}}>{km&&km[0]?`${km[0].stav_km.toLocaleString("cs")} km`:"—"}</div>
      </div>
      <div style={{background:C.bg,borderRadius:8,padding:"8px 10px"}}>
        <div style={{fontSize:10,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:.5,marginBottom:2}}>Příští servis</div>
        <div style={{fontSize:14,fontWeight:700,color:dnuDoServisu!=null?(dnuDoServisu<30?C.red:dnuDoServisu<90?C.orange:C.green):C.dim}}>
          {dnuDoServisu!=null?`za ${dnuDoServisu} dní`:"—"}
        </div>
      </div>
    </div>
    {a.leasing_do&&<div style={{fontSize:12,color:C.muted}}>Leasing do: {new Date(a.leasing_do).toLocaleDateString("cs-CZ")}</div>}
  </div>;
}

function AutoDetail({auto,onBack,reloadAuta}){
  const [zalozka,setZalozka]=useState("prehled");
  const [editModal,setEditModal]=useState(false);
  const {data:servisy,reload:reloadServisy}=useData(()=>sb.from("auta_servis").select("*").eq("auto_id",auto.id).order("datum",{ascending:false}));
  const {data:kilometry,reload:reloadKm}=useData(()=>sb.from("auta_kilometry").select("*").eq("auto_id",auto.id).order("datum",{ascending:false}));
  const {data:naklady,reload:reloadNaklady}=useData(()=>sb.from("auta_naklady").select("*").eq("auto_id",auto.id).order("datum",{ascending:false}));

  const tabs=[{id:"prehled",l:"📊 Přehled"},{id:"servis",l:"🔧 Servisní kniha"},{id:"km",l:"📍 Kilometry"},{id:"naklady",l:"💰 Náklady"},{id:"finance",l:"💸 Cashflow plán"},{id:"dokumenty",l:"📁 Dokumenty"},{id:"nastaveni",l:"⚙️ Nastavení"}];

  const celkemNaklady=(naklady||[]).reduce((a,n)=>a+(+n.castka),0);
  const celkemServis=(servisy||[]).reduce((a,s)=>a+(+s.cena||0),0);
  const posledniKm=(kilometry||[])[0];

  return <div>
    <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
      <button onClick={onBack} style={{...btnC(C.muted,true),padding:"6px 14px"}}>← Zpět</button>
      <h2 style={{margin:0,fontSize:20,fontWeight:800}}>{auto.nazev}</h2>
      {auto.spz&&<span style={{fontSize:12,fontFamily:"monospace",background:C.bg,border:`1px solid ${C.border}`,padding:"3px 10px",borderRadius:6}}>{auto.spz}</span>}
    </div>

    <div style={{display:"flex",gap:2,marginBottom:24,borderBottom:`2px solid ${C.border}`,overflowX:"auto"}}>
      {tabs.map(t=><button key={t.id} onClick={()=>setZalozka(t.id)} style={{padding:"9px 14px",border:"none",background:"none",cursor:"pointer",fontSize:12,fontWeight:700,color:zalozka===t.id?C.accent:C.muted,borderBottom:zalozka===t.id?`2px solid ${C.accent}`:"2px solid transparent",marginBottom:-2,whiteSpace:"nowrap",flexShrink:0}}>{t.l}</button>)}
    </div>

    {zalozka==="prehled"&&<AutoPrehled auto={auto} servisy={servisy||[]} kilometry={kilometry||[]} naklady={naklady||[]} celkemNaklady={celkemNaklady} celkemServis={celkemServis} posledniKm={posledniKm}/>}
    {zalozka==="servis"&&<AutoServis autoId={auto.id} servisy={servisy||[]} reload={reloadServisy}/>}
    {zalozka==="km"&&<AutoKilometry autoId={auto.id} kilometry={kilometry||[]} reload={reloadKm}/>}
    {zalozka==="naklady"&&<AutoNaklady autoId={auto.id} naklady={naklady||[]} reload={reloadNaklady}/>}
    {zalozka==="finance"&&<EntityFinancePanel sloupec="auto_id" id={auto.id} lock={{auto_id:auto.id}} nadpis={`Finance — ${auto.nazev}`} novaDefault={{nazev:auto.nazev+" — ",castka:""}}/>}
    {zalozka==="dokumenty"&&<EntityDokumentyPanel lockVazba={`auto:${auto.id}`} nadpis={`Dokumenty — ${auto.nazev}`}/>}
    {zalozka==="nastaveni"&&<AutoNastaveni auto={auto} reload={reloadAuta} onBack={onBack}/>}
  </div>;
}

function AutoPrehled({auto,servisy,kilometry,naklady,celkemNaklady,celkemServis,posledniKm}){
  const dnes=new Date();
  const terminy=[
    {typ:"STK",label:"STK"},
    {typ:"olej",label:"Výměna oleje"},
    {typ:"pneumatiky",label:"Pneumatiky"},
    {typ:"stk",label:"STK"},
  ];
  const blizkeTerminy=servisy.filter(s=>s.dalsi_servis_datum&&new Date(s.dalsi_servis_datum)>dnes)
    .map(s=>({...s,dnu:Math.round((new Date(s.dalsi_servis_datum)-dnes)/(1000*60*60*24))}))
    .sort((a,b)=>a.dnu-b.dnu).slice(0,5);

  return <div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:12,marginBottom:20}}>
      {[
        {l:"Aktuální km",v:posledniKm?`${posledniKm.stav_km.toLocaleString("cs")} km`:"—",c:C.accent},
        {l:"Celkem servis",v:`${celkemServis.toLocaleString("cs")} Kč`,c:C.orange},
        {l:"Ostatní náklady",v:`${celkemNaklady.toLocaleString("cs")} Kč`,c:C.red},
        {l:"Celkem náklady",v:`${(celkemServis+celkemNaklady).toLocaleString("cs")} Kč`,c:C.red},
      ].map(k=><div key={k.l} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"14px 16px",borderTop:`3px solid ${k.c}`}}>
        <div style={{fontSize:10,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:.5,marginBottom:4}}>{k.l}</div>
        <div style={{fontSize:16,fontWeight:800,color:k.c}}>{k.v}</div>
      </div>)}
    </div>

    {blizkeTerminy.length>0&&<div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,overflow:"hidden",marginBottom:16}}>
      <div style={{padding:"12px 16px",fontWeight:700,fontSize:14,borderBottom:`1px solid ${C.border}`}}>⏰ Nadcházející termíny</div>
      {blizkeTerminy.map(s=><div key={s.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 16px",borderBottom:`1px solid ${C.border}`}}>
        <div>
          <div style={{fontWeight:600,fontSize:13}}>{s.popis||s.typ}</div>
          <div style={{fontSize:11,color:C.muted}}>{new Date(s.dalsi_servis_datum).toLocaleDateString("cs-CZ")}</div>
        </div>
        <span style={{fontWeight:700,fontSize:13,color:s.dnu<30?C.red:s.dnu<90?C.orange:C.green}}>za {s.dnu} dní</span>
      </div>)}
    </div>}

    {auto.typ_vlastnictvi==="operativni_leasing"&&auto.leasing_do&&<div style={{background:"#fff8e1",border:"1px solid #f5c07a",borderRadius:12,padding:"14px 16px"}}>
      <div style={{fontWeight:700,fontSize:13,color:"#b36a00",marginBottom:4}}>📋 Operativní leasing</div>
      <div style={{fontSize:13,color:C.muted}}>
        Od: {auto.leasing_od?new Date(auto.leasing_od).toLocaleDateString("cs-CZ"):"—"} &nbsp;|&nbsp;
        Do: {new Date(auto.leasing_do).toLocaleDateString("cs-CZ")} &nbsp;|&nbsp;
        {auto.leasing_mesicni_splatka&&`${(+auto.leasing_mesicni_splatka).toLocaleString("cs")} Kč/měs`}
      </div>
    </div>}
  </div>;
}

function AutoServis({autoId,servisy,reload}){
  const [modal,setModal]=useState(null);
  const [form,setForm]=useState({datum:new Date().toISOString().slice(0,10),typ:"jine",popis:"",cena:"",kde:"",km_pri_servisu:"",dalsi_servis_datum:"",dalsi_servis_km:""});
  const typy={stk:"🔍 STK",olej:"🛢 Olej",pneumatiky:"🔄 Pneumatiky",brzdy:"🛑 Brzdy",jine:"🔧 Jiné"};

  const uloz=async()=>{
    const data={auto_id:autoId,datum:form.datum,typ:form.typ,popis:form.popis||null,cena:form.cena?+form.cena:null,kde:form.kde||null,km_pri_servisu:form.km_pri_servisu?+form.km_pri_servisu:null,dalsi_servis_datum:form.dalsi_servis_datum||null,dalsi_servis_km:form.dalsi_servis_km?+form.dalsi_servis_km:null};
    if(modal==="novy")await sb.from("auta_servis").insert(data);
    else await sb.from("auta_servis").update(data).eq("id",modal.id);
    reload();setModal(null);
  };
  const smaz=async(id)=>{if(!confirm("Smazat záznam?"))return;await sb.from("auta_servis").delete().eq("id",id);reload();};

  return <div>
    <div style={{display:"flex",justifyContent:"flex-end",marginBottom:16}}>
      <button onClick={()=>{setForm({datum:new Date().toISOString().slice(0,10),typ:"jine",popis:"",cena:"",kde:"",km_pri_servisu:"",dalsi_servis_datum:"",dalsi_servis_km:""});setModal("novy");}} style={btnC()}>+ Přidat servis</button>
    </div>
    {servisy.length===0&&<div style={{textAlign:"center",padding:40,color:C.dim}}>Žádné záznamy o servisu</div>}
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      {servisy.map(s=><div key={s.id} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"14px 16px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
          <div>
            <span style={{fontSize:13,fontWeight:700,marginRight:8}}>{typy[s.typ]||s.typ}</span>
            <span style={{fontSize:13,fontWeight:600}}>{s.popis}</span>
          </div>
          <div style={{display:"flex",gap:6,alignItems:"center"}}>
            {s.cena&&<span style={{fontWeight:800,color:C.orange}}>{(+s.cena).toLocaleString("cs")} Kč</span>}
            <button onClick={()=>{setModal(s);setForm({datum:s.datum,typ:s.typ,popis:s.popis||"",cena:s.cena?String(s.cena):"",kde:s.kde||"",km_pri_servisu:s.km_pri_servisu?String(s.km_pri_servisu):"",dalsi_servis_datum:s.dalsi_servis_datum||"",dalsi_servis_km:s.dalsi_servis_km?String(s.dalsi_servis_km):""});}} style={{...btnC(C.accent,true),padding:"2px 8px",fontSize:11}}>✏</button>
            <button onClick={()=>smaz(s.id)} style={{...btnC(C.red,true),padding:"2px 8px",fontSize:11}}>🗑</button>
          </div>
        </div>
        <div style={{display:"flex",gap:16,fontSize:12,color:C.muted,flexWrap:"wrap"}}>
          <span>📅 {new Date(s.datum).toLocaleDateString("cs-CZ")}</span>
          {s.kde&&<span>📍 {s.kde}</span>}
          {s.km_pri_servisu&&<span>🛣 {s.km_pri_servisu.toLocaleString("cs")} km</span>}
          {s.dalsi_servis_datum&&<span style={{color:C.green}}>🔔 Příští: {new Date(s.dalsi_servis_datum).toLocaleDateString("cs-CZ")}</span>}
          {s.dalsi_servis_km&&<span style={{color:C.green}}>🔔 Příští: {s.dalsi_servis_km.toLocaleString("cs")} km</span>}
        </div>
      </div>)}
    </div>

    {modal&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{background:C.surface,borderRadius:18,padding:28,width:"100%",maxWidth:460,boxShadow:"0 20px 60px rgba(0,0,0,.25)",maxHeight:"90vh",overflowY:"auto"}}>
        <h3 style={{margin:"0 0 18px",fontSize:17,fontWeight:800}}>{modal==="novy"?"Nový servisní záznam":"Upravit záznam"}</h3>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:11}}>
          <div><div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:4}}>Datum</div><input style={inp} type="date" value={form.datum} onChange={e=>setForm(p=>({...p,datum:e.target.value}))}/></div>
          <div><div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:4}}>Typ</div>
            <select style={inp} value={form.typ} onChange={e=>setForm(p=>({...p,typ:e.target.value}))}>
              {Object.entries(typy).map(([k,v])=><option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        </div>
        {[{l:"Popis",k:"popis",t:"text"},{l:"Kde (servis, adresa)",k:"kde",t:"text"},{l:"Cena (Kč)",k:"cena",t:"number"},{l:"Km při servisu",k:"km_pri_servisu",t:"number"},{l:"Příští servis — datum",k:"dalsi_servis_datum",t:"date"},{l:"Příští servis — km",k:"dalsi_servis_km",t:"number"}].map(f=><div key={f.k} style={{marginBottom:10}}>
          <div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:4}}>{f.l}</div>
          <input style={inp} type={f.t} value={form[f.k]} onChange={e=>setForm(p=>({...p,[f.k]:e.target.value}))}/>
        </div>)}
        <div style={{display:"flex",gap:10,marginTop:16}}>
          <button onClick={uloz} style={btnC()}>Uložit</button>
          <button onClick={()=>setModal(null)} style={btnC(C.muted,true)}>Zrušit</button>
        </div>
      </div>
    </div>}
  </div>;
}

function AutoKilometry({autoId,kilometry,reload}){
  const [modal,setModal]=useState(null);
  const [form,setForm]=useState({datum:new Date().toISOString().slice(0,10),stav_km:"",poznamka:""});

  const uloz=async()=>{
    const data={auto_id:autoId,datum:form.datum,stav_km:+form.stav_km,poznamka:form.poznamka||null};
    if(modal==="novy")await sb.from("auta_kilometry").insert(data);
    else await sb.from("auta_kilometry").update(data).eq("id",modal.id);
    reload();setModal(null);
  };
  const smaz=async(id)=>{if(!confirm("Smazat?"))return;await sb.from("auta_kilometry").delete().eq("id",id);reload();};

  return <div>
    <div style={{display:"flex",justifyContent:"flex-end",marginBottom:16}}>
      <button onClick={()=>{setForm({datum:new Date().toISOString().slice(0,10),stav_km:"",poznamka:""});setModal("novy");}} style={btnC()}>+ Zapsat km</button>
    </div>
    <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,overflow:"hidden"}}>
      <table style={{width:"100%",borderCollapse:"collapse"}}>
        <thead><tr style={{background:C.bg}}>
          {["Datum","Stav (km)","Přírůstek","Poznámka",""].map(h=><th key={h} style={{padding:"9px 14px",textAlign:"left",fontSize:11,fontWeight:700,color:C.muted,textTransform:"uppercase"}}>{h}</th>)}
        </tr></thead>
        <tbody>
          {kilometry.length===0&&<tr><td colSpan={5} style={{padding:24,textAlign:"center",color:C.dim}}>Žádné záznamy</td></tr>}
          {kilometry.map((k,i)=>{
            const prev=kilometry[i+1];
            const diff=prev?k.stav_km-prev.stav_km:null;
            return <tr key={k.id} style={{borderBottom:`1px solid ${C.border}`}}>
              <td style={{padding:"10px 14px",fontSize:13}}>{new Date(k.datum).toLocaleDateString("cs-CZ")}</td>
              <td style={{padding:"10px 14px",fontSize:14,fontWeight:700}}>{k.stav_km.toLocaleString("cs")} km</td>
              <td style={{padding:"10px 14px",fontSize:13,color:diff?C.green:C.dim}}>{diff?`+${diff.toLocaleString("cs")} km`:"—"}</td>
              <td style={{padding:"10px 14px",fontSize:12,color:C.muted}}>{k.poznamka||""}</td>
              <td style={{padding:"10px 10px",whiteSpace:"nowrap"}}>
                <button onClick={()=>{setModal(k);setForm({datum:k.datum,stav_km:String(k.stav_km),poznamka:k.poznamka||""});}} style={{...btnC(C.accent,true),padding:"2px 8px",fontSize:11,marginRight:4}}>✏</button>
                <button onClick={()=>smaz(k.id)} style={{...btnC(C.red,true),padding:"2px 8px",fontSize:11}}>🗑</button>
              </td>
            </tr>;
          })}
        </tbody>
      </table>
    </div>

    {modal&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{background:C.surface,borderRadius:18,padding:28,width:"100%",maxWidth:360,boxShadow:"0 20px 60px rgba(0,0,0,.25)"}}>
        <h3 style={{margin:"0 0 18px",fontSize:17,fontWeight:800}}>{modal==="novy"?"Zapsat kilometry":"Upravit"}</h3>
        {[{l:"Datum",k:"datum",t:"date"},{l:"Stav tachometru (km)",k:"stav_km",t:"number"},{l:"Poznámka",k:"poznamka",t:"text"}].map(f=><div key={f.k} style={{marginBottom:11}}>
          <div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:4}}>{f.l}</div>
          <input style={inp} type={f.t} value={form[f.k]} onChange={e=>setForm(p=>({...p,[f.k]:e.target.value}))}/>
        </div>)}
        <div style={{display:"flex",gap:10,marginTop:16}}>
          <button onClick={uloz} style={btnC()}>Uložit</button>
          <button onClick={()=>setModal(null)} style={btnC(C.muted,true)}>Zrušit</button>
        </div>
      </div>
    </div>}
  </div>;
}

function AutoNaklady({autoId,naklady,reload}){
  const [modal,setModal]=useState(null);
  const [form,setForm]=useState({datum:new Date().toISOString().slice(0,10),typ:"jine",castka:"",poznamka:""});
  const typy={pohonne_hmoty:"⛽ Pohonné hmoty",pojistka:"🛡 Pojistka",dalnice:"🛣 Dálniční poplatek",parkovani:"🅿 Parkování",umyti:"🚿 Mytí",jine:"💰 Jiné"};

  const uloz=async()=>{
    const data={auto_id:autoId,datum:form.datum,typ:form.typ,castka:+form.castka,poznamka:form.poznamka||null};
    if(modal==="novy")await sb.from("auta_naklady").insert(data);
    else await sb.from("auta_naklady").update(data).eq("id",modal.id);
    reload();setModal(null);
  };
  const smaz=async(id)=>{if(!confirm("Smazat?"))return;await sb.from("auta_naklady").delete().eq("id",id);reload();};

  const celkem=naklady.reduce((a,n)=>a+(+n.castka),0);
  const podleTypu=Object.entries(typy).map(([k,v])=>({typ:k,label:v,suma:naklady.filter(n=>n.typ===k).reduce((a,n)=>a+(+n.castka),0)})).filter(t=>t.suma>0);

  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
      <div style={{fontWeight:800,fontSize:16}}>Celkem: {celkem.toLocaleString("cs")} Kč</div>
      <button onClick={()=>{setForm({datum:new Date().toISOString().slice(0,10),typ:"jine",castka:"",poznamka:""});setModal("novy");}} style={btnC()}>+ Přidat náklad</button>
    </div>

    {podleTypu.length>0&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:8,marginBottom:16}}>
      {podleTypu.map(t=><div key={t.typ} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 12px"}}>
        <div style={{fontSize:11,color:C.muted,marginBottom:2}}>{t.label}</div>
        <div style={{fontWeight:700,fontSize:14}}>{t.suma.toLocaleString("cs")} Kč</div>
      </div>)}
    </div>}

    <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,overflow:"hidden"}}>
      <table style={{width:"100%",borderCollapse:"collapse"}}>
        <thead><tr style={{background:C.bg}}>
          {["Datum","Typ","Částka","Poznámka",""].map(h=><th key={h} style={{padding:"9px 14px",textAlign:"left",fontSize:11,fontWeight:700,color:C.muted,textTransform:"uppercase"}}>{h}</th>)}
        </tr></thead>
        <tbody>
          {naklady.length===0&&<tr><td colSpan={5} style={{padding:24,textAlign:"center",color:C.dim}}>Žádné náklady</td></tr>}
          {naklady.map((n,i)=><tr key={n.id} style={{background:i%2===0?C.surface:"#fafbff",borderBottom:`1px solid ${C.border}`}}>
            <td style={{padding:"9px 14px",fontSize:13}}>{new Date(n.datum).toLocaleDateString("cs-CZ")}</td>
            <td style={{padding:"9px 14px",fontSize:13}}>{typy[n.typ]||n.typ}</td>
            <td style={{padding:"9px 14px",fontSize:13,fontWeight:700,color:C.orange}}>{(+n.castka).toLocaleString("cs")} Kč</td>
            <td style={{padding:"9px 14px",fontSize:12,color:C.muted}}>{n.poznamka||""}</td>
            <td style={{padding:"9px 10px",whiteSpace:"nowrap"}}>
              <button onClick={()=>{setModal(n);setForm({datum:n.datum,typ:n.typ,castka:String(n.castka),poznamka:n.poznamka||""});}} style={{...btnC(C.accent,true),padding:"2px 8px",fontSize:11,marginRight:4}}>✏</button>
              <button onClick={()=>smaz(n.id)} style={{...btnC(C.red,true),padding:"2px 8px",fontSize:11}}>🗑</button>
            </td>
          </tr>)}
        </tbody>
      </table>
    </div>

    {modal&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{background:C.surface,borderRadius:18,padding:28,width:"100%",maxWidth:380,boxShadow:"0 20px 60px rgba(0,0,0,.25)"}}>
        <h3 style={{margin:"0 0 18px",fontSize:17,fontWeight:800}}>{modal==="novy"?"Nový náklad":"Upravit náklad"}</h3>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:11}}>
          <div><div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:4}}>Datum</div><input style={inp} type="date" value={form.datum} onChange={e=>setForm(p=>({...p,datum:e.target.value}))}/></div>
          <div><div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:4}}>Typ</div>
            <select style={inp} value={form.typ} onChange={e=>setForm(p=>({...p,typ:e.target.value}))}>
              {Object.entries(typy).map(([k,v])=><option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        </div>
        {[{l:"Částka (Kč)",k:"castka",t:"number"},{l:"Poznámka",k:"poznamka",t:"text"}].map(f=><div key={f.k} style={{marginBottom:11}}>
          <div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:4}}>{f.l}</div>
          <input style={inp} type={f.t} value={form[f.k]} onChange={e=>setForm(p=>({...p,[f.k]:e.target.value}))}/>
        </div>)}
        <div style={{display:"flex",gap:10,marginTop:16}}>
          <button onClick={uloz} style={btnC()}>Uložit</button>
          <button onClick={()=>setModal(null)} style={btnC(C.muted,true)}>Zrušit</button>
        </div>
      </div>
    </div>}
  </div>;
}

function AutoNastaveni({auto,reload,onBack}){
  const [form,setForm]=useState({nazev:auto.nazev,znacka:auto.znacka||"",model:auto.model||"",spz:auto.spz||"",rok_vyroby:auto.rok_vyroby||"",barva:auto.barva||"",typ_vlastnictvi:auto.typ_vlastnictvi||"vlastni",leasing_od:auto.leasing_od||"",leasing_do:auto.leasing_do||"",leasing_mesicni_splatka:auto.leasing_mesicni_splatka||"",poznamka:auto.poznamka||""});
  const [saving,setSaving]=useState(false);

  const uloz=async()=>{
    setSaving(true);
    await sb.from("auta").update({...form,rok_vyroby:form.rok_vyroby?+form.rok_vyroby:null,leasing_mesicni_splatka:form.leasing_mesicni_splatka?+form.leasing_mesicni_splatka:null,leasing_od:form.leasing_od||null,leasing_do:form.leasing_do||null}).eq("id",auto.id);
    setSaving(false);reload();alert("Uloženo!");
  };
  const prodej=async()=>{
    if(!confirm(`Označit "${auto.nazev}" jako prodané/vrácené?`))return;
    await sb.from("auta").update({stav:"prodano"}).eq("id",auto.id);
    reload();onBack();
  };

  const typy={vlastni:"Vlastní",leasing:"Leasing",operativni_leasing:"Operativní leasing"};
  return <div style={{maxWidth:500}}>
    <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,padding:20,marginBottom:16}}>
      <h3 style={{margin:"0 0 16px",fontSize:15,fontWeight:800}}>Základní informace</h3>
      {[{l:"Název",k:"nazev"},{l:"Značka",k:"znacka"},{l:"Model",k:"model"},{l:"SPZ",k:"spz"},{l:"Rok výroby",k:"rok_vyroby",t:"number"},{l:"Barva",k:"barva"}].map(f=><div key={f.k} style={{marginBottom:11}}>
        <div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:4}}>{f.l}</div>
        <input style={inp} type={f.t||"text"} value={form[f.k]} onChange={e=>setForm(p=>({...p,[f.k]:e.target.value}))}/>
      </div>)}
      <div style={{marginBottom:11}}>
        <div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:4}}>Typ vlastnictví</div>
        <select style={inp} value={form.typ_vlastnictvi} onChange={e=>setForm(p=>({...p,typ_vlastnictvi:e.target.value}))}>
          {Object.entries(typy).map(([k,v])=><option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      {(form.typ_vlastnictvi==="leasing"||form.typ_vlastnictvi==="operativni_leasing")&&<>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:11}}>
          <div><div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:4}}>Leasing od</div><input style={inp} type="date" value={form.leasing_od} onChange={e=>setForm(p=>({...p,leasing_od:e.target.value}))}/></div>
          <div><div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:4}}>Leasing do</div><input style={inp} type="date" value={form.leasing_do} onChange={e=>setForm(p=>({...p,leasing_do:e.target.value}))}/></div>
        </div>
        <div style={{marginBottom:11}}>
          <div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:4}}>Měsíční splátka (Kč)</div>
          <input style={inp} type="number" value={form.leasing_mesicni_splatka} onChange={e=>setForm(p=>({...p,leasing_mesicni_splatka:e.target.value}))}/>
        </div>
      </>}
      <div style={{marginBottom:16}}>
        <div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:4}}>Poznámka</div>
        <textarea style={{...inp,minHeight:70,resize:"vertical"}} value={form.poznamka} onChange={e=>setForm(p=>({...p,poznamka:e.target.value}))}/>
      </div>
      <button onClick={uloz} disabled={saving} style={btnC()}>{saving?"Ukládám...":"Uložit změny"}</button>
    </div>
    <button onClick={prodej} style={{...btnC(C.red,true),width:"100%",justifyContent:"center"}}>🚗 Označit jako prodané / vrácené</button>
  </div>;
}

// ══════════════════════════════════════════════════════════════════════════════
// MODUL: ÚČTY & PC — evidence uživatelských účtů, hesel, licencí a hardwaru
//
// ZABEZPEČENÍ (zero-knowledge trezor):
//   • Hardware a názvy zůstávají čitelné (kvůli přehledu a hledání).
//   • Tajné údaje (hesla, 2FA/recovery kódy, licenční klíče, tajné poznámky)
//     se šifrují PŘÍMO v prohlížeči — Web Crypto, AES-256-GCM, klíč je odvozen
//     PBKDF2 (210k iterací) z "hlavního hesla". Do Supabase i do případného
//     exportu jde jen šifrovaný text → bez hlavního hesla je nepřečte nikdo,
//     ani správce v Supabase dashboardu.
//   • Hlavní heslo se NIKAM neukládá (v DB je jen ověřovací blok). Když ho
//     zapomeneš, tajné údaje jsou nenávratně ztracené — to je smysl zero-knowledge.
//   • Trezor se po 10 min nečinnosti a po odchodu z modulu sám zamkne.
// ══════════════════════════════════════════════════════════════════════════════
const VAULT_META_KEY   = "it_vault_meta";       // řádek v app_nastaveni (klic)
const VAULT_CHECK_PLAIN= "DOMOV_TREZOR_OK_v1";  // ověřovací řetězec
const _ITenc=new TextEncoder(), _ITdec=new TextDecoder();
const _itB64  =(buf)=>btoa(String.fromCharCode(...new Uint8Array(buf)));
const _itUnb64=(s)=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));

async function vaultDeriveKey(heslo,saltBytes){
  const base=await crypto.subtle.importKey("raw",_ITenc.encode(heslo),"PBKDF2",false,["deriveKey"]);
  return crypto.subtle.deriveKey(
    {name:"PBKDF2",salt:saltBytes,iterations:210000,hash:"SHA-256"},
    base,{name:"AES-GCM",length:256},false,["encrypt","decrypt"]
  );
}
async function vaultEncrypt(key,plain){
  if(plain==null||plain==="") return "";
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const ct=await crypto.subtle.encrypt({name:"AES-GCM",iv},key,_ITenc.encode(String(plain)));
  return _itB64(iv)+":"+_itB64(ct);
}
async function vaultDecrypt(key,payload){
  if(!payload) return "";
  const i=payload.indexOf(":"); if(i<0) return "";
  const iv=_itUnb64(payload.slice(0,i)), ct=_itUnb64(payload.slice(i+1));
  const pt=await crypto.subtle.decrypt({name:"AES-GCM",iv},key,ct);
  return _ITdec.decode(pt);
}
// Načti metadata trezoru z app_nastaveni (null = trezor ještě neexistuje)
async function vaultLoadMeta(){
  const {data}=await sb.from("app_nastaveni").select("hodnota").eq("klic",VAULT_META_KEY).limit(1);
  const row=data&&data[0];
  if(!row?.hodnota) return null;
  try{return JSON.parse(row.hodnota);}catch{return null;}
}
async function vaultSaveMeta(meta){
  const {data:ex}=await sb.from("app_nastaveni").select("klic").eq("klic",VAULT_META_KEY).limit(1);
  if(ex&&ex.length) {
    const {error}=await sb.from("app_nastaveni").update({hodnota:JSON.stringify(meta)}).eq("klic",VAULT_META_KEY);
    if(error) throw new Error(error.message);
  } else {
    const {error}=await sb.from("app_nastaveni").insert({klic:VAULT_META_KEY,hodnota:JSON.stringify(meta)});
    if(error) throw new Error(error.message);
  }
}
// Vytvoř trezor poprvé → vrátí odvozený klíč
async function vaultCreate(heslo){
  const salt=crypto.getRandomValues(new Uint8Array(16));
  const key=await vaultDeriveKey(heslo,salt);
  const check=await vaultEncrypt(key,VAULT_CHECK_PLAIN);
  await vaultSaveMeta({salt:_itB64(salt),check});
  return key;
}
// Odemkni → ověří heslo proti uloženému check bloku, vrátí klíč
async function vaultUnlock(heslo,meta){
  const key=await vaultDeriveKey(heslo,_itUnb64(meta.salt));
  let ok=false;
  try{ ok=(await vaultDecrypt(key,meta.check))===VAULT_CHECK_PLAIN; }catch{ ok=false; }
  if(!ok) throw new Error("Nesprávné hlavní heslo.");
  return key;
}

// ── Číselníky ─────────────────────────────────────────────────────────────────
const IT_ZARIZENI_TYPY={
  pc:{label:"Stolní PC",icon:"🖥",color:C.accent},
  notebook:{label:"Notebook",icon:"💻",color:C.purple},
  tablet:{label:"Tablet",icon:"📱",color:C.blue},
  telefon:{label:"Telefon",icon:"📞",color:C.green},
  nas:{label:"NAS / server",icon:"🗄",color:C.orange},
  jine:{label:"Jiné",icon:"🔌",color:C.muted},
};
const IT_SLUZBY={
  microsoft:{label:"Microsoft",icon:"🪟",color:"#0078d4"},
  google:{label:"Google",icon:"🔵",color:"#ea4335"},
  apple:{label:"Apple",icon:"🍎",color:"#555"},
  email:{label:"E-mail",icon:"✉️",color:C.blue},
  banka:{label:"Banka / finance",icon:"🏦",color:C.green},
  sit:{label:"Síť / router / Wi-Fi",icon:"📶",color:C.orange},
  jiny:{label:"Jiný software",icon:"🔑",color:C.purple},
};
const IT_LIC_TYPY={
  windows:{label:"Windows",icon:"🪟",color:"#0078d4"},
  office:{label:"Office",icon:"📊",color:"#d83b01"},
  antivir:{label:"Antivir",icon:"🛡",color:C.green},
  jiny:{label:"Jiný SW",icon:"🎫",color:C.purple},
};

// ── Brána trezoru (setup poprvé / odemčení) ───────────────────────────────────
function ITVaultGate({meta,onReady}){
  const isSetup=!meta;
  const [heslo,setHeslo]=useState("");
  const [heslo2,setHeslo2]=useState("");
  const [chyba,setChyba]=useState("");
  const [busy,setBusy]=useState(false);
  const podporovano = typeof crypto!=="undefined" && crypto.subtle;

  const odeslat=async()=>{
    setChyba("");
    if(!heslo) { setChyba("Zadej hlavní heslo."); return; }
    if(isSetup){
      if(heslo.length<8){ setChyba("Hlavní heslo by mělo mít aspoň 8 znaků."); return; }
      if(heslo!==heslo2){ setChyba("Hesla se neshodují."); return; }
    }
    setBusy(true);
    try{
      const key = isSetup ? await vaultCreate(heslo) : await vaultUnlock(heslo, meta);
      const novaMeta = isSetup ? await vaultLoadMeta() : null;
      onReady(key, novaMeta);
    }catch(e){ setChyba(e.message||"Něco se nepovedlo."); }
    finally{ setBusy(false); }
  };

  return <div style={{maxWidth:440,margin:"40px auto"}}>
    <div style={{background:C.surface,border:`1px solid ${C.border}`,borderTop:`4px solid ${C.accent}`,borderRadius:16,padding:"32px 28px",boxShadow:"0 4px 20px rgba(0,0,0,.06)"}}>
      <div style={{textAlign:"center",marginBottom:18}}>
        <div style={{fontSize:42,marginBottom:8}}>🔐</div>
        <div style={{fontWeight:800,fontSize:19,color:C.text}}>{isSetup?"Založit trezor účtů":"Odemknout trezor"}</div>
        <div style={{fontSize:12.5,color:C.muted,marginTop:6,lineHeight:1.5}}>
          {isSetup
            ? "Nastav hlavní heslo. Tímto heslem se v prohlížeči zašifrují všechna hesla a licenční klíče — do databáze jde jen šifrovaný text."
            : "Zadej hlavní heslo, kterým se dešifrují uložené tajné údaje."}
        </div>
      </div>

      {!podporovano && <div style={{background:C.redS,border:`1px solid ${C.red}`,borderRadius:10,padding:"10px 14px",fontSize:12.5,color:C.red,marginBottom:14}}>
        ⚠ Tento prohlížeč/spojení nepodporuje Web Crypto (potřeba HTTPS nebo localhost). Trezor nelze použít.
      </div>}

      <Field label="Hlavní heslo">
        <input style={inp} type="password" value={heslo} autoFocus autoComplete="new-password"
          onChange={e=>setHeslo(e.target.value)}
          onKeyDown={e=>{if(e.key==="Enter"&&!isSetup)odeslat();}}
          placeholder="••••••••"/>
      </Field>
      {isSetup&&<Field label="Hlavní heslo znovu">
        <input style={inp} type="password" value={heslo2} autoComplete="new-password"
          onChange={e=>setHeslo2(e.target.value)}
          onKeyDown={e=>{if(e.key==="Enter")odeslat();}}
          placeholder="••••••••"/>
      </Field>}

      {isSetup&&<div style={{background:C.orangeS,border:`1px solid ${C.orange}44`,borderRadius:10,padding:"10px 14px",fontSize:12,color:C.orange,marginBottom:14,lineHeight:1.5}}>
        ⚠ Hlavní heslo se nikam neukládá. <b>Když ho zapomeneš, tajné údaje už nikdo nedešifruje.</b> Ulož si ho na bezpečné místo (např. správce hesel nebo papír v šuplíku).
      </div>}

      {chyba&&<div style={{color:C.red,fontSize:12.5,fontWeight:600,marginBottom:12}}>⚠ {chyba}</div>}

      <button onClick={odeslat} disabled={busy||!podporovano} style={{...btnC(),width:"100%",padding:"12px",fontSize:14,opacity:(busy||!podporovano)?.6:1}}>
        {busy?"Pracuji…":(isSetup?"Založit a odemknout":"Odemknout")}
      </button>
    </div>
  </div>;
}

// ── Zobrazení jednoho tajného údaje (lazy dešifrování + kopírování) ────────────
function ITSecretRow({vaultKey,label,payload,emoji="🔑"}){
  const [shown,setShown]=useState(false);
  const [plain,setPlain]=useState("");
  const [copied,setCopied]=useState(false);
  if(!payload) return null;
  const ensure=async()=>{ if(plain) return plain; try{const t=await vaultDecrypt(vaultKey,payload);setPlain(t);return t;}catch{setPlain("⚠ nelze dešifrovat");return "";} };
  const toggle=async()=>{ if(!shown)await ensure(); setShown(s=>!s); };
  const copy=async()=>{ const t=await ensure(); try{await navigator.clipboard.writeText(t);setCopied(true);setTimeout(()=>setCopied(false),1200);}catch{} };
  return <div style={{display:"flex",alignItems:"center",gap:8,padding:"7px 0",borderBottom:`1px solid ${C.border}`}}>
    <span style={{fontSize:12,fontWeight:700,color:C.muted,minWidth:96}}>{emoji} {label}</span>
    <code style={{flex:1,fontSize:13,fontFamily:"ui-monospace,Menlo,monospace",color:C.text,wordBreak:"break-all",userSelect:"all"}}>{shown?(plain||"—"):"••••••••••"}</code>
    <button onClick={toggle} title={shown?"Skrýt":"Zobrazit"} style={{...btnC(C.muted,true),padding:"3px 9px",fontSize:13}}>{shown?"🙈":"👁"}</button>
    <button onClick={copy} title="Kopírovat" style={{...btnC(C.accent,true),padding:"3px 9px",fontSize:13}}>{copied?"✓":"📋"}</button>
  </div>;
}

// ── ZAŘÍZENÍ (hardware — bez šifrování) ───────────────────────────────────────
function ITZarizeniModal({zarizeni,onClose,onSaved}){
  const isNew=!zarizeni;
  const [f,setF]=useState({
    nazev:zarizeni?.nazev||"", typ:zarizeni?.typ||"pc", uzivatel:zarizeni?.uzivatel||"",
    vyrobce:zarizeni?.vyrobce||"", model:zarizeni?.model||"", serie_cislo:zarizeni?.serie_cislo||"",
    cpu:zarizeni?.cpu||"", ram:zarizeni?.ram||"", disk:zarizeni?.disk||"", gpu:zarizeni?.gpu||"",
    os:zarizeni?.os||"", mac:zarizeni?.mac||"", ip:zarizeni?.ip||"", poznamka:zarizeni?.poznamka||"",
  });
  const [saving,setSaving]=useState(false);
  const [chyba,setChyba]=useState("");
  const set=k=>e=>setF(p=>({...p,[k]:e.target.value}));
  const uloz=async()=>{
    if(!f.nazev.trim()){setChyba("Vyplň název zařízení.");return;}
    setSaving(true);setChyba("");
    const data={...f}; Object.keys(data).forEach(k=>{if(data[k]==="")data[k]=null;}); data.nazev=f.nazev.trim();
    const {error}= isNew ? await sb.from("it_zarizeni").insert(data) : await sb.from("it_zarizeni").update(data).eq("id",zarizeni.id);
    setSaving(false);
    if(error){setChyba(error.message);return;}
    onSaved();
  };
  return <Modal title={isNew?"Nové zařízení":"Upravit zařízení"} onClose={onClose} width={520}>
    <Field label="Název *" hint="Jak zařízení voláš"><input style={inp} value={f.nazev} onChange={set("nazev")} autoFocus placeholder="např. Honzíkův notebook"/></Field>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
      <Field label="Typ"><select style={inp} value={f.typ} onChange={set("typ")}>{Object.entries(IT_ZARIZENI_TYPY).map(([k,v])=><option key={k} value={k}>{v.icon} {v.label}</option>)}</select></Field>
      <Field label="Uživatel"><input style={inp} value={f.uzivatel} onChange={set("uzivatel")} placeholder="Komu patří"/></Field>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
      <Field label="Výrobce"><input style={inp} value={f.vyrobce} onChange={set("vyrobce")} placeholder="Dell, Lenovo, HP…"/></Field>
      <Field label="Model"><input style={inp} value={f.model} onChange={set("model")} placeholder="Latitude 5440…"/></Field>
    </div>
    <Field label="Sériové číslo (S/N)"><input style={inp} value={f.serie_cislo} onChange={set("serie_cislo")} placeholder="Pro servis / záruku"/></Field>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
      <Field label="Procesor (CPU)"><input style={inp} value={f.cpu} onChange={set("cpu")} placeholder="Intel i5-1335U"/></Field>
      <Field label="Operační paměť (RAM)"><input style={inp} value={f.ram} onChange={set("ram")} placeholder="16 GB"/></Field>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
      <Field label="Disk"><input style={inp} value={f.disk} onChange={set("disk")} placeholder="512 GB SSD"/></Field>
      <Field label="Grafika (GPU)"><input style={inp} value={f.gpu} onChange={set("gpu")} placeholder="Intel Iris Xe"/></Field>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
      <Field label="OS"><input style={inp} value={f.os} onChange={set("os")} placeholder="Windows 11 Pro"/></Field>
      <Field label="MAC adresa"><input style={inp} value={f.mac} onChange={set("mac")} placeholder="00:1A:2B…"/></Field>
      <Field label="IP adresa"><input style={inp} value={f.ip} onChange={set("ip")} placeholder="192.168.0.10"/></Field>
    </div>
    <Field label="Poznámka"><textarea style={{...inp,resize:"vertical",minHeight:56}} value={f.poznamka} onChange={set("poznamka")} placeholder="Záruka do…, kde stojí, atd."/></Field>
    {chyba&&<div style={{color:C.red,fontSize:12.5,fontWeight:600,marginBottom:10}}>⚠ {chyba}</div>}
    <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:6}}>
      <button onClick={onClose} style={btnC(C.muted,true)}>Zrušit</button>
      <button onClick={uloz} disabled={saving} style={btnC()}>{saving?"Ukládám…":"Uložit"}</button>
    </div>
  </Modal>;
}

function ITZarizeniSekce(){
  const {data:zarizeni,loading,reload}=useData(()=>sb.from("it_zarizeni").select("*").order("nazev"));
  const [modal,setModal]=useState(null); // null | "new" | objekt
  const smaz=async(z)=>{if(!confirm(`Smazat zařízení "${z.nazev}"?`))return;await sb.from("it_zarizeni").delete().eq("id",z.id);reload();};
  if(loading) return <Spinner/>;
  const list=zarizeni||[];
  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
      <div style={{color:C.text,fontWeight:800,fontSize:16}}>🖥 Zařízení <span style={{color:C.muted,fontWeight:400,fontSize:14}}>({list.length})</span></div>
      <button onClick={()=>setModal("new")} style={btnC()}>+ Přidat zařízení</button>
    </div>
    {list.length===0&&<EmptyState emoji="🖥" text="Žádná zařízení" action="+ Přidat zařízení" onAction={()=>setModal("new")}/>}
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:12}}>
      {list.map(z=>{
        const t=IT_ZARIZENI_TYPY[z.typ]||IT_ZARIZENI_TYPY.jine;
        const radky=[
          z.cpu&&["CPU",z.cpu],z.ram&&["RAM",z.ram],z.disk&&["Disk",z.disk],z.gpu&&["GPU",z.gpu],
          z.os&&["OS",z.os],z.serie_cislo&&["S/N",z.serie_cislo],z.mac&&["MAC",z.mac],z.ip&&["IP",z.ip],
        ].filter(Boolean);
        return <div key={z.id} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,padding:16,borderLeft:`4px solid ${t.color}`}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
            <div style={{width:42,height:42,borderRadius:11,background:`${t.color}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:21}}>{t.icon}</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontWeight:800,fontSize:15,color:C.text}}>{z.nazev}</div>
              <div style={{fontSize:12,color:C.muted}}>{[t.label,[z.vyrobce,z.model].filter(Boolean).join(" ")].filter(Boolean).join(" · ")}</div>
            </div>
          </div>
          {z.uzivatel&&<div style={{marginBottom:8}}><Tag color={t.color}>👤 {z.uzivatel}</Tag></div>}
          {radky.length>0&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"3px 10px",fontSize:12,marginBottom:10}}>
            {radky.map(([k,v])=><div key={k} style={{display:"flex",gap:5,minWidth:0}}><span style={{color:C.dim,fontWeight:700}}>{k}:</span><span style={{color:C.text,wordBreak:"break-all"}}>{v}</span></div>)}
          </div>}
          {z.poznamka&&<div style={{fontSize:11,color:C.dim,fontStyle:"italic",marginBottom:8}}>{z.poznamka}</div>}
          <div style={{display:"flex",gap:6}}>
            <button onClick={()=>setModal(z)} style={{...btnC(C.muted,true),padding:"4px 10px",fontSize:12}}>✎ Upravit</button>
            <button onClick={()=>smaz(z)} style={{...btnC(C.red,true),padding:"4px 10px",fontSize:12}}>✕</button>
          </div>
        </div>;
      })}
    </div>
    {modal&&<ITZarizeniModal zarizeni={modal==="new"?null:modal} onClose={()=>setModal(null)} onSaved={()=>{setModal(null);reload();}}/>}
  </div>;
}

// ── ÚČTY / PŘIHLÁŠENÍ (heslo + 2FA + recovery šifrované) ───────────────────────
function ITUcetModal({vaultKey,ucet,zarizeni,onClose,onSaved}){
  const isNew=!ucet;
  const [f,setF]=useState({nazev:ucet?.nazev||"",sluzba:ucet?.sluzba||"microsoft",login:ucet?.login||"",url:ucet?.url||"",zarizeni_id:ucet?.zarizeni_id||""});
  const [s,setS]=useState({heslo:"",dvojfaktor:"",recovery:"",tajna_poznamka:""});
  const [loadingSecret,setLoadingSecret]=useState(!isNew);
  const [saving,setSaving]=useState(false);
  const [chyba,setChyba]=useState("");
  const set=k=>e=>setF(p=>({...p,[k]:e.target.value}));
  const setS_=k=>e=>setS(p=>({...p,[k]:e.target.value}));
  useEffect(()=>{
    if(isNew) return;
    (async()=>{
      try{ const raw=await vaultDecrypt(vaultKey,ucet.tajne); const o=raw?JSON.parse(raw):{}; setS({heslo:o.heslo||"",dvojfaktor:o.dvojfaktor||"",recovery:o.recovery||"",tajna_poznamka:o.tajna_poznamka||""}); }
      catch{ setChyba("Tajné údaje se nepodařilo dešifrovat (jiné hlavní heslo?)."); }
      setLoadingSecret(false);
    })();
  },[]);
  const uloz=async()=>{
    if(!f.nazev.trim()){setChyba("Vyplň název účtu.");return;}
    setSaving(true);setChyba("");
    try{
      const tajne=await vaultEncrypt(vaultKey,JSON.stringify({heslo:s.heslo,dvojfaktor:s.dvojfaktor,recovery:s.recovery,tajna_poznamka:s.tajna_poznamka}));
      const data={nazev:f.nazev.trim(),sluzba:f.sluzba,login:f.login||null,url:f.url||null,zarizeni_id:f.zarizeni_id||null,tajne};
      const {error}= isNew ? await sb.from("it_ucty").insert(data) : await sb.from("it_ucty").update(data).eq("id",ucet.id);
      if(error) throw new Error(error.message);
      onSaved();
    }catch(e){ setChyba(e.message||"Uložení selhalo."); }
    finally{ setSaving(false); }
  };
  return <Modal title={isNew?"Nový účet / přihlášení":"Upravit účet"} onClose={onClose} width={480} accent={C.accent}>
    <Field label="Název *" hint="Co to je za účet"><input style={inp} value={f.nazev} onChange={set("nazev")} autoFocus placeholder="např. Microsoft – Jirka"/></Field>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
      <Field label="Služba"><select style={inp} value={f.sluzba} onChange={set("sluzba")}>{Object.entries(IT_SLUZBY).map(([k,v])=><option key={k} value={k}>{v.icon} {v.label}</option>)}</select></Field>
      <Field label="Zařízení (volitelně)"><select style={inp} value={f.zarizeni_id} onChange={set("zarizeni_id")}><option value="">— žádné —</option>{(zarizeni||[]).map(z=><option key={z.id} value={z.id}>{(IT_ZARIZENI_TYPY[z.typ]||IT_ZARIZENI_TYPY.jine).icon} {z.nazev}</option>)}</select></Field>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
      <Field label="Přihlašovací jméno / e-mail"><input style={inp} value={f.login} onChange={set("login")} placeholder="jmeno@email.cz" autoComplete="off"/></Field>
      <Field label="Web / adresa"><input style={inp} value={f.url} onChange={set("url")} placeholder="login.microsoft.com"/></Field>
    </div>

    <div style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:12,padding:14,marginTop:4,marginBottom:14}}>
      <div style={{fontSize:11,fontWeight:800,color:C.accent,letterSpacing:.5,textTransform:"uppercase",marginBottom:10}}>🔐 Šifrované údaje</div>
      {loadingSecret?<div style={{fontSize:12,color:C.muted,padding:"6px 0"}}>Dešifruji…</div>:<>
        <Field label="Heslo"><input style={inp} type="text" value={s.heslo} onChange={setS_("heslo")} placeholder="••••••••" autoComplete="off"/></Field>
        <Field label="2FA / ověření" hint="TOTP klíč, kód, aplikace…"><input style={inp} value={s.dvojfaktor} onChange={setS_("dvojfaktor")} placeholder="Volitelné" autoComplete="off"/></Field>
        <Field label="Záložní (recovery) kódy"><textarea style={{...inp,resize:"vertical",minHeight:50}} value={s.recovery} onChange={setS_("recovery")} placeholder="Volitelné — jeden na řádek" autoComplete="off"/></Field>
        <Field label="Tajná poznámka"><textarea style={{...inp,resize:"vertical",minHeight:44}} value={s.tajna_poznamka} onChange={setS_("tajna_poznamka")} placeholder="Bezpečnostní otázky apod."/></Field>
      </>}
    </div>

    {chyba&&<div style={{color:C.red,fontSize:12.5,fontWeight:600,marginBottom:10}}>⚠ {chyba}</div>}
    <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:6}}>
      <button onClick={onClose} style={btnC(C.muted,true)}>Zrušit</button>
      <button onClick={uloz} disabled={saving||loadingSecret} style={btnC()}>{saving?"Šifruji a ukládám…":"Uložit"}</button>
    </div>
  </Modal>;
}

function ITUcetDetail({vaultKey,ucet,zarizeni,onEdit,onClose}){
  const sl=IT_SLUZBY[ucet.sluzba]||IT_SLUZBY.jiny;
  const z=(zarizeni||[]).find(x=>String(x.id)===String(ucet.zarizeni_id));
  return <Modal title={`${sl.icon} ${ucet.nazev}`} onClose={onClose} width={460} accent={sl.color}>
    <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16,padding:14,background:C.bg,borderRadius:12}}>
      <div style={{width:48,height:48,borderRadius:12,background:`${sl.color}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24}}>{sl.icon}</div>
      <div style={{minWidth:0}}>
        <div style={{fontWeight:800,fontSize:16,color:C.text}}>{ucet.nazev}</div>
        <div style={{fontSize:12,color:C.muted}}>{sl.label}{z?` · 🖥 ${z.nazev}`:""}</div>
      </div>
    </div>
    {ucet.login&&<div style={{display:"flex",alignItems:"center",gap:8,padding:"7px 0",borderBottom:`1px solid ${C.border}`}}>
      <span style={{fontSize:12,fontWeight:700,color:C.muted,minWidth:96}}>👤 Login</span>
      <code style={{flex:1,fontSize:13,fontFamily:"ui-monospace,Menlo,monospace",color:C.text,wordBreak:"break-all",userSelect:"all"}}>{ucet.login}</code>
      <button onClick={()=>navigator.clipboard.writeText(ucet.login)} title="Kopírovat" style={{...btnC(C.accent,true),padding:"3px 9px",fontSize:13}}>📋</button>
    </div>}
    {ucet.url&&<div style={{display:"flex",alignItems:"center",gap:8,padding:"7px 0",borderBottom:`1px solid ${C.border}`}}>
      <span style={{fontSize:12,fontWeight:700,color:C.muted,minWidth:96}}>🌐 Web</span>
      <span style={{flex:1,fontSize:13,color:C.text,wordBreak:"break-all"}}>{ucet.url}</span>
    </div>}
    <ITSecretsBlok vaultKey={vaultKey} payload={ucet.tajne}/>
    <div style={{display:"flex",justifyContent:"flex-end",marginTop:18}}>
      <button onClick={onEdit} style={btnC()}>✎ Upravit</button>
    </div>
  </Modal>;
}

// Řádek s už dešifrovanou hodnotou (maskuje, odhalí, kopíruje) — bez dalšího šifrování
function ITPlainSecretRow({label,value,emoji="🔑"}){
  const [shown,setShown]=useState(false);
  const [copied,setCopied]=useState(false);
  if(!value) return null;
  const copy=async()=>{ try{await navigator.clipboard.writeText(value);setCopied(true);setTimeout(()=>setCopied(false),1200);}catch{} };
  return <div style={{display:"flex",alignItems:"center",gap:8,padding:"7px 0",borderBottom:`1px solid ${C.border}`}}>
    <span style={{fontSize:12,fontWeight:700,color:C.muted,minWidth:96}}>{emoji} {label}</span>
    <code style={{flex:1,fontSize:13,fontFamily:"ui-monospace,Menlo,monospace",color:C.text,wordBreak:"break-all",whiteSpace:"pre-wrap",userSelect:"all"}}>{shown?value:"••••••••••"}</code>
    <button onClick={()=>setShown(s=>!s)} title={shown?"Skrýt":"Zobrazit"} style={{...btnC(C.muted,true),padding:"3px 9px",fontSize:13}}>{shown?"🙈":"👁"}</button>
    <button onClick={copy} title="Kopírovat" style={{...btnC(C.accent,true),padding:"3px 9px",fontSize:13}}>{copied?"✓":"📋"}</button>
  </div>;
}
// Rozbalí šifrovaný JSON blok účtu a vykreslí jednotlivé tajné řádky
function ITSecretsBlok({vaultKey,payload}){
  const [obj,setObj]=useState(undefined); // undefined=načítám, null=chyba, {}
  useEffect(()=>{
    let alive=true;
    (async()=>{
      try{ const raw=await vaultDecrypt(vaultKey,payload); if(alive) setObj(raw?JSON.parse(raw):{}); }
      catch{ if(alive) setObj(null); }
    })();
    return ()=>{alive=false;};
  },[payload]);
  if(obj===undefined) return <div style={{fontSize:12,color:C.muted,padding:"8px 0"}}>Dešifruji…</div>;
  if(obj===null) return <div style={{fontSize:12.5,color:C.red,padding:"8px 0",fontWeight:600}}>⚠ Tajné údaje nelze dešifrovat tímto hlavním heslem.</div>;
  const nic=!obj.heslo&&!obj.dvojfaktor&&!obj.recovery&&!obj.tajna_poznamka;
  if(nic) return <div style={{fontSize:12,color:C.dim,padding:"8px 0"}}>U tohoto účtu nejsou uložené žádné tajné údaje.</div>;
  return <div>
    <ITPlainSecretRow label="Heslo"    value={obj.heslo}          emoji="🔑"/>
    <ITPlainSecretRow label="2FA"      value={obj.dvojfaktor}     emoji="📱"/>
    <ITPlainSecretRow label="Recovery" value={obj.recovery}       emoji="🆘"/>
    <ITPlainSecretRow label="Poznámka" value={obj.tajna_poznamka} emoji="📝"/>
  </div>;
}

function ITUctySekce({vaultKey}){
  const {data:ucty,loading,reload}=useData(()=>sb.from("it_ucty").select("*").order("nazev"));
  const {data:zarizeni}=useData(()=>sb.from("it_zarizeni").select("id,nazev,typ").order("nazev"));
  const [modal,setModal]=useState(null);   // null | "new" | objekt (edit)
  const [detail,setDetail]=useState(null);
  const [hledat,setHledat]=useState("");
  const smaz=async(u)=>{if(!confirm(`Smazat účet "${u.nazev}"?`))return;await sb.from("it_ucty").delete().eq("id",u.id);reload();};
  if(loading) return <Spinner/>;
  const list=(ucty||[]).filter(u=>!hledat||`${u.nazev} ${u.login||""}`.toLowerCase().includes(hledat.toLowerCase()));
  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:8}}>
      <div style={{color:C.text,fontWeight:800,fontSize:16}}>🔑 Účty & přihlášení <span style={{color:C.muted,fontWeight:400,fontSize:14}}>({(ucty||[]).length})</span></div>
      <button onClick={()=>setModal("new")} style={btnC()}>+ Přidat účet</button>
    </div>
    <input style={{...inp,maxWidth:320,marginBottom:14}} value={hledat} onChange={e=>setHledat(e.target.value)} placeholder="🔎 Hledat podle názvu nebo loginu…"/>
    {list.length===0&&<EmptyState emoji="🔑" text="Žádné účty" action="+ Přidat účet" onAction={()=>setModal("new")}/>}
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:10}}>
      {list.map(u=>{
        const sl=IT_SLUZBY[u.sluzba]||IT_SLUZBY.jiny;
        return <div key={u.id} onClick={()=>setDetail(u)} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:14,borderLeft:`4px solid ${sl.color}`,cursor:"pointer"}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
            <div style={{width:40,height:40,borderRadius:10,background:`${sl.color}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>{sl.icon}</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontWeight:700,fontSize:14,color:C.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{u.nazev}</div>
              <div style={{fontSize:12,color:C.muted,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{u.login||sl.label}</div>
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:6}} onClick={e=>e.stopPropagation()}>
            <span style={{flex:1,fontSize:11,color:C.dim}}>🔐 šifrováno</span>
            <button onClick={()=>setDetail(u)} style={{...btnC(C.accent,true),padding:"3px 9px",fontSize:12}}>👁 Otevřít</button>
            <button onClick={()=>setModal(u)} style={{...btnC(C.muted,true),padding:"3px 9px",fontSize:12}}>✎</button>
            <button onClick={()=>smaz(u)} style={{...btnC(C.red,true),padding:"3px 9px",fontSize:12}}>✕</button>
          </div>
        </div>;
      })}
    </div>
    {detail&&<ITUcetDetail vaultKey={vaultKey} ucet={detail} zarizeni={zarizeni} onEdit={()=>{const u=detail;setDetail(null);setModal(u);}} onClose={()=>setDetail(null)}/>}
    {modal&&<ITUcetModal vaultKey={vaultKey} ucet={modal==="new"?null:modal} zarizeni={zarizeni} onClose={()=>setModal(null)} onSaved={()=>{setModal(null);reload();}}/>}
  </div>;
}

// ── LICENCE (klíč šifrovaný) ──────────────────────────────────────────────────
function ITLicenceModal({vaultKey,licence,zarizeni,onClose,onSaved}){
  const isNew=!licence;
  const [f,setF]=useState({nazev:licence?.nazev||"",typ:licence?.typ||"windows",verze:licence?.verze||"",email_uctu:licence?.email_uctu||"",zarizeni_id:licence?.zarizeni_id||"",poznamka:licence?.poznamka||""});
  const [klic,setKlic]=useState("");
  const [loadingSecret,setLoadingSecret]=useState(!isNew);
  const [saving,setSaving]=useState(false);
  const [chyba,setChyba]=useState("");
  const set=k=>e=>setF(p=>({...p,[k]:e.target.value}));
  useEffect(()=>{
    if(isNew) return;
    (async()=>{ try{ setKlic(await vaultDecrypt(vaultKey,licence.klic)); }catch{ setChyba("Klíč se nepodařilo dešifrovat (jiné hlavní heslo?)."); } setLoadingSecret(false); })();
  },[]);
  const uloz=async()=>{
    if(!f.nazev.trim()){setChyba("Vyplň název licence.");return;}
    setSaving(true);setChyba("");
    try{
      const klicEnc=await vaultEncrypt(vaultKey,klic);
      const data={nazev:f.nazev.trim(),typ:f.typ,verze:f.verze||null,email_uctu:f.email_uctu||null,zarizeni_id:f.zarizeni_id||null,poznamka:f.poznamka||null,klic:klicEnc};
      const {error}= isNew ? await sb.from("it_licence").insert(data) : await sb.from("it_licence").update(data).eq("id",licence.id);
      if(error) throw new Error(error.message);
      onSaved();
    }catch(e){ setChyba(e.message||"Uložení selhalo."); }
    finally{ setSaving(false); }
  };
  return <Modal title={isNew?"Nová licence":"Upravit licenci"} onClose={onClose} width={460} accent={C.orange}>
    <Field label="Název *"><input style={inp} value={f.nazev} onChange={set("nazev")} autoFocus placeholder="např. Windows 11 Pro – PC obývák"/></Field>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
      <Field label="Typ"><select style={inp} value={f.typ} onChange={set("typ")}>{Object.entries(IT_LIC_TYPY).map(([k,v])=><option key={k} value={k}>{v.icon} {v.label}</option>)}</select></Field>
      <Field label="Verze / edice"><input style={inp} value={f.verze} onChange={set("verze")} placeholder="Pro, 2021, 365…"/></Field>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
      <Field label="Účet / e-mail licence"><input style={inp} value={f.email_uctu} onChange={set("email_uctu")} placeholder="Kde je registrovaná"/></Field>
      <Field label="Zařízení (volitelně)"><select style={inp} value={f.zarizeni_id} onChange={set("zarizeni_id")}><option value="">— žádné —</option>{(zarizeni||[]).map(z=><option key={z.id} value={z.id}>{(IT_ZARIZENI_TYPY[z.typ]||IT_ZARIZENI_TYPY.jine).icon} {z.nazev}</option>)}</select></Field>
    </div>
    <div style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:12,padding:14,marginBottom:14}}>
      <div style={{fontSize:11,fontWeight:800,color:C.orange,letterSpacing:.5,textTransform:"uppercase",marginBottom:10}}>🔐 Šifrovaný klíč</div>
      {loadingSecret?<div style={{fontSize:12,color:C.muted}}>Dešifruji…</div>:
        <Field label="Licenční klíč"><input style={{...inp,fontFamily:"ui-monospace,Menlo,monospace"}} value={klic} onChange={e=>setKlic(e.target.value)} placeholder="XXXXX-XXXXX-XXXXX-XXXXX-XXXXX" autoComplete="off"/></Field>}
    </div>
    <Field label="Poznámka"><input style={inp} value={f.poznamka} onChange={set("poznamka")} placeholder="Datum nákupu, kde koupeno…"/></Field>
    {chyba&&<div style={{color:C.red,fontSize:12.5,fontWeight:600,marginBottom:10}}>⚠ {chyba}</div>}
    <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:6}}>
      <button onClick={onClose} style={btnC(C.muted,true)}>Zrušit</button>
      <button onClick={uloz} disabled={saving||loadingSecret} style={btnC()}>{saving?"Šifruji a ukládám…":"Uložit"}</button>
    </div>
  </Modal>;
}

function ITLicenceSekce({vaultKey}){
  const {data:licence,loading,reload}=useData(()=>sb.from("it_licence").select("*").order("nazev"));
  const {data:zarizeni}=useData(()=>sb.from("it_zarizeni").select("id,nazev,typ").order("nazev"));
  const [modal,setModal]=useState(null);
  const smaz=async(l)=>{if(!confirm(`Smazat licenci "${l.nazev}"?`))return;await sb.from("it_licence").delete().eq("id",l.id);reload();};
  if(loading) return <Spinner/>;
  const list=licence||[];
  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
      <div style={{color:C.text,fontWeight:800,fontSize:16}}>🎫 Licence <span style={{color:C.muted,fontWeight:400,fontSize:14}}>({list.length})</span></div>
      <button onClick={()=>setModal("new")} style={btnC()}>+ Přidat licenci</button>
    </div>
    {list.length===0&&<EmptyState emoji="🎫" text="Žádné licence" action="+ Přidat licenci" onAction={()=>setModal("new")}/>}
    <div style={{display:"flex",flexDirection:"column",gap:8}}>
      {list.map(l=>{
        const t=IT_LIC_TYPY[l.typ]||IT_LIC_TYPY.jiny;
        const z=(zarizeni||[]).find(x=>String(x.id)===String(l.zarizeni_id));
        return <div key={l.id} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"12px 16px",borderLeft:`4px solid ${t.color}`}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8,flexWrap:"wrap"}}>
            <span style={{fontSize:20}}>{t.icon}</span>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontWeight:700,fontSize:14,color:C.text}}>{l.nazev}</div>
              <div style={{fontSize:12,color:C.muted}}>{[t.label,l.verze,z&&`🖥 ${z.nazev}`,l.email_uctu].filter(Boolean).join(" · ")}</div>
            </div>
            <button onClick={()=>setModal(l)} style={{...btnC(C.muted,true),padding:"3px 9px",fontSize:12}}>✎</button>
            <button onClick={()=>smaz(l)} style={{...btnC(C.red,true),padding:"3px 9px",fontSize:12}}>✕</button>
          </div>
          <ITSecretRow vaultKey={vaultKey} label="Klíč" payload={l.klic} emoji="🎫"/>
          {l.poznamka&&<div style={{fontSize:11,color:C.dim,fontStyle:"italic",marginTop:6}}>{l.poznamka}</div>}
        </div>;
      })}
    </div>
    {modal&&<ITLicenceModal vaultKey={vaultKey} licence={modal==="new"?null:modal} zarizeni={zarizeni} onClose={()=>setModal(null)} onSaved={()=>{setModal(null);reload();}}/>}
  </div>;
}

// ── Hlavní dlaždice modulu ────────────────────────────────────────────────────
// ── Globální vyhledávání napříč zařízeními, účty a licencemi ──────────────────
// Hledá v ČITELNÝCH polích (názvy, login, hardware, poznámky…). Šifrovaná tajemství
// (hesla, klíče, recovery) se zámerně neprohledávají.
const _itNorm=(s)=>(s==null?"":String(s)).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
function ITZvyrazni({text,q}){
  const t=text==null?"":String(text);
  if(!q) return <>{t}</>;
  const nt=_itNorm(t), nq=_itNorm(q);
  const i=nt.indexOf(nq);
  if(i<0) return <>{t}</>;
  return <>{t.slice(0,i)}<mark style={{background:"#fff1a8",color:C.text,borderRadius:3,padding:"0 1px"}}>{t.slice(i,i+q.length)}</mark>{t.slice(i+q.length)}</>;
}

function ITHledani({query,vaultKey}){
  const {data:zarizeni,loading:lz,reload:rz}=useData(()=>sb.from("it_zarizeni").select("*").order("nazev"));
  const {data:ucty,loading:lu,reload:ru}=useData(()=>sb.from("it_ucty").select("*").order("nazev"));
  const {data:licence,loading:ll,reload:rl}=useData(()=>sb.from("it_licence").select("*").order("nazev"));
  const [detail,setDetail]=useState(null); // {kind, item}
  const reloadAll=()=>{rz();ru();rl();};

  if(lz||lu||ll) return <Spinner/>;
  const q=query.trim();
  const nq=_itNorm(q);
  const allZar=zarizeni||[];

  // Najde popisek pole, ve kterém se shoda našla (pro nápovědu „kde")
  const najdiPole=(obj,pole)=>{
    for(const [k,label] of pole){ if(_itNorm(obj[k]).includes(nq)) return {pole:label,hodnota:obj[k]}; }
    return null;
  };
  const ZAR_POLE=[["nazev","Název"],["uzivatel","Uživatel"],["vyrobce","Výrobce"],["model","Model"],["serie_cislo","S/N"],["cpu","CPU"],["ram","RAM"],["disk","Disk"],["gpu","GPU"],["os","OS"],["mac","MAC"],["ip","IP"],["poznamka","Poznámka"]];
  const UCET_POLE=[["nazev","Název"],["login","Login"],["url","Web"]];
  const LIC_POLE=[["nazev","Název"],["verze","Verze"],["email_uctu","Účet"],["poznamka","Poznámka"]];

  const zarMatch=allZar.map(z=>({z,m:najdiPole(z,ZAR_POLE)})).filter(x=>x.m);
  const ucetMatch=(ucty||[]).map(u=>({u,m:najdiPole(u,UCET_POLE)})).filter(x=>x.m);
  const licMatch=(licence||[]).map(l=>({l,m:najdiPole(l,LIC_POLE)})).filter(x=>x.m);
  const celkem=zarMatch.length+ucetMatch.length+licMatch.length;

  const zarById=(id)=>allZar.find(z=>String(z.id)===String(id));
  const kdeRadek=(m)=>m&&m.pole!=="Název"?<span style={{fontSize:11,color:C.muted}}> · nalezeno v: <b>{m.pole}</b> — <ITZvyrazni text={m.hodnota} q={q}/></span>:null;

  return <div>
    <div style={{fontSize:13,color:C.muted,marginBottom:14}}>
      Výsledky pro <b style={{color:C.text}}>„{q}"</b> — <b style={{color:C.accent}}>{celkem}</b> {celkem===1?"výskyt":celkem>=2&&celkem<=4?"výskyty":"výskytů"}
    </div>

    {celkem===0&&<div style={{padding:"30px 0",textAlign:"center",color:C.dim,fontSize:14}}>Nic nenalezeno. (Hesla a klíče se z bezpečnostních důvodů neprohledávají.)</div>}

    {/* Zařízení */}
    {zarMatch.length>0&&<div style={{marginBottom:20}}>
      <div style={{fontSize:12,fontWeight:700,letterSpacing:.6,textTransform:"uppercase",color:C.muted,marginBottom:8}}>🖥 Zařízení ({zarMatch.length})</div>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {zarMatch.map(({z,m})=>{
          const t=IT_ZARIZENI_TYPY[z.typ]||IT_ZARIZENI_TYPY.jine;
          return <div key={z.id} onClick={()=>setDetail({kind:"zar",item:z})} style={{display:"flex",alignItems:"center",gap:10,background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"11px 14px",borderLeft:`4px solid ${t.color}`,cursor:"pointer"}}>
            <span style={{fontSize:19}}>{t.icon}</span>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontWeight:700,fontSize:14,color:C.text}}><ITZvyrazni text={z.nazev} q={q}/></div>
              <div style={{fontSize:11.5,color:C.muted}}>{t.label}{z.uzivatel?` · 👤 ${z.uzivatel}`:""}{kdeRadek(m)}</div>
            </div>
            <span style={{fontSize:13,color:C.dim}}>›</span>
          </div>;
        })}
      </div>
    </div>}

    {/* Účty */}
    {ucetMatch.length>0&&<div style={{marginBottom:20}}>
      <div style={{fontSize:12,fontWeight:700,letterSpacing:.6,textTransform:"uppercase",color:C.muted,marginBottom:8}}>🔑 Účty ({ucetMatch.length})</div>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {ucetMatch.map(({u,m})=>{
          const sl=IT_SLUZBY[u.sluzba]||IT_SLUZBY.jiny;
          return <div key={u.id} onClick={()=>setDetail({kind:"ucet",item:u})} style={{display:"flex",alignItems:"center",gap:10,background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"11px 14px",borderLeft:`4px solid ${sl.color}`,cursor:"pointer"}}>
            <span style={{fontSize:19}}>{sl.icon}</span>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontWeight:700,fontSize:14,color:C.text}}><ITZvyrazni text={u.nazev} q={q}/></div>
              <div style={{fontSize:11.5,color:C.muted}}>{sl.label}{u.login?` · ${u.login}`:""}{kdeRadek(m)}</div>
            </div>
            <span style={{fontSize:11,color:C.dim,marginRight:6}}>🔐</span>
            <span style={{fontSize:13,color:C.dim}}>›</span>
          </div>;
        })}
      </div>
    </div>}

    {/* Licence */}
    {licMatch.length>0&&<div style={{marginBottom:20}}>
      <div style={{fontSize:12,fontWeight:700,letterSpacing:.6,textTransform:"uppercase",color:C.muted,marginBottom:8}}>🎫 Licence ({licMatch.length})</div>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {licMatch.map(({l,m})=>{
          const t=IT_LIC_TYPY[l.typ]||IT_LIC_TYPY.jiny;
          const z=zarById(l.zarizeni_id);
          return <div key={l.id} onClick={()=>setDetail({kind:"lic",item:l})} style={{display:"flex",alignItems:"center",gap:10,background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"11px 14px",borderLeft:`4px solid ${t.color}`,cursor:"pointer"}}>
            <span style={{fontSize:19}}>{t.icon}</span>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontWeight:700,fontSize:14,color:C.text}}><ITZvyrazni text={l.nazev} q={q}/></div>
              <div style={{fontSize:11.5,color:C.muted}}>{[t.label,l.verze,z&&`🖥 ${z.nazev}`].filter(Boolean).join(" · ")}{kdeRadek(m)}</div>
            </div>
            <span style={{fontSize:11,color:C.dim,marginRight:6}}>🔐</span>
            <span style={{fontSize:13,color:C.dim}}>›</span>
          </div>;
        })}
      </div>
    </div>}

    {/* Otevření detailu / editace z výsledku */}
    {detail?.kind==="ucet"&&<ITUcetDetail vaultKey={vaultKey} ucet={detail.item} zarizeni={allZar} onEdit={()=>setDetail({kind:"ucetEdit",item:detail.item})} onClose={()=>setDetail(null)}/>}
    {detail?.kind==="ucetEdit"&&<ITUcetModal vaultKey={vaultKey} ucet={detail.item} zarizeni={allZar} onClose={()=>setDetail(null)} onSaved={()=>{setDetail(null);reloadAll();}}/>}
    {detail?.kind==="zar"&&<ITZarizeniModal zarizeni={detail.item} onClose={()=>setDetail(null)} onSaved={()=>{setDetail(null);reloadAll();}}/>}
    {detail?.kind==="lic"&&<ITLicenceModal vaultKey={vaultKey} licence={detail.item} zarizeni={allZar} onClose={()=>setDetail(null)} onSaved={()=>{setDetail(null);reloadAll();}}/>}
  </div>;
}


function UctyTab(){
  const [meta,setMeta]=useState(undefined); // undefined=načítám, null=trezor neexistuje, obj=existuje
  const [vaultKey,setVaultKey]=useState(null);
  const [zal,setZal]=useState("zarizeni");
  const [q,setQ]=useState("");

  useEffect(()=>{ vaultLoadMeta().then(setMeta); },[]);

  // Auto-zámek po 10 minutách nečinnosti
  useEffect(()=>{
    if(!vaultKey) return;
    let t;
    const reset=()=>{ clearTimeout(t); t=setTimeout(()=>setVaultKey(null),10*60*1000); };
    const evs=["mousemove","keydown","click","touchstart"];
    evs.forEach(e=>window.addEventListener(e,reset)); reset();
    return ()=>{ clearTimeout(t); evs.forEach(e=>window.removeEventListener(e,reset)); };
  },[vaultKey]);

  if(meta===undefined) return <Spinner/>;
  if(!vaultKey) return <ITVaultGate meta={meta} onReady={(k,novaMeta)=>{ if(novaMeta)setMeta(novaMeta); setVaultKey(k); }}/>;

  const tabs=[{id:"zarizeni",l:"🖥 Zařízení"},{id:"ucty",l:"🔑 Účty"},{id:"licence",l:"🎫 Licence"}];
  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:10}}>
      <h2 style={{margin:0,fontSize:22,fontWeight:800}}>🔐 Účty &amp; PC</h2>
      <button onClick={()=>setVaultKey(null)} title="Zamknout trezor" style={{...btnC(C.muted,true),fontSize:12,padding:"7px 14px"}}>🔒 Zamknout</button>
    </div>
    <div style={{background:C.greenS,border:`1px solid ${C.green}44`,borderRadius:10,padding:"8px 14px",marginBottom:18,fontSize:12,color:C.green,fontWeight:600}}>
      🔓 Trezor je odemčený. Tajné údaje jsou v databázi šifrované a zamknou se po 10 min nečinnosti.
    </div>
    {/* Globální vyhledávání napříč vším */}
    <div style={{position:"relative",marginBottom:20}}>
      <input style={{...inp,padding:"11px 38px 11px 14px",fontSize:14}} value={q} onChange={e=>setQ(e.target.value)} placeholder="🔎 Hledat ve všem — zařízení, účty i licence (např. longchamp)…"/>
      {q&&<button onClick={()=>setQ("")} title="Vymazat" style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:16,color:C.muted}}>✕</button>}
    </div>

    {q.trim()
      ? <ITHledani query={q} vaultKey={vaultKey}/>
      : <>
        <div style={{display:"flex",gap:2,marginBottom:20,borderBottom:`2px solid ${C.border}`}}>
          {tabs.map(t=><button key={t.id} onClick={()=>setZal(t.id)} style={{padding:"9px 16px",border:"none",background:"none",cursor:"pointer",fontSize:13,fontWeight:700,color:zal===t.id?C.accent:C.muted,borderBottom:zal===t.id?`2px solid ${C.accent}`:"2px solid transparent",marginBottom:-2}}>{t.l}</button>)}
        </div>
        {zal==="zarizeni"&&<ITZarizeniSekce/>}
        {zal==="ucty"&&<ITUctySekce vaultKey={vaultKey}/>}
        {zal==="licence"&&<ITLicenceSekce vaultKey={vaultKey}/>}
      </>}
  </div>;
}

// ══════════════════════════════════════════════════════════════════════════════
// MODUL: PRÁVNÍCI
// ══════════════════════════════════════════════════════════════════════════════
function PravnikModal({pravnik,onClose,onSaved}){
  const isNew=!pravnik;
  const [f,setF]=useState({jmeno:pravnik?.jmeno||"",poznamka:pravnik?.poznamka||""});
  const [saving,setSaving]=useState(false);
  const uloz=async()=>{
    if(!f.jmeno.trim())return;
    setSaving(true);
    if(isNew)await sb.from("pravnici").insert(f);
    else await sb.from("pravnici").update(f).eq("id",pravnik.id);
    setSaving(false);onSaved();
  };
  return <Modal title={isNew?"Přidat právníka":"Upravit právníka"} onClose={onClose} width={460} accent={C.purple}>
    <Field label="Jméno / Kancelář *"><input style={inp} value={f.jmeno} onChange={e=>setF(p=>({...p,jmeno:e.target.value}))} autoFocus placeholder="JUDr. Zeman" onKeyDown={e=>e.key==="Enter"&&uloz()}/></Field>
    <Field label="Poznámka"><textarea style={{...inp,resize:"vertical",minHeight:60}} value={f.poznamka} onChange={e=>setF(p=>({...p,poznamka:e.target.value}))} placeholder="Specializace, kontakt…"/></Field>
    <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:6}}>
      <button onClick={onClose} style={btnC(C.muted,true)}>Zrušit</button>
      <button onClick={uloz} disabled={saving||!f.jmeno.trim()} style={btnC(C.purple)}>{saving?"Ukládám…":"Uložit"}</button>
    </div>
  </Modal>;
}

function SazbaModal({sazba,pravnik_id,onClose,onSaved}){
  const isNew=!sazba;
  const [f,setF]=useState({nazev:sazba?.nazev||"",castka:sazba?.castka||"",jednotka:sazba?.jednotka||"hod"});
  const [saving,setSaving]=useState(false);
  const uloz=async()=>{
    if(!f.nazev.trim()||!f.castka)return;
    setSaving(true);
    const data={nazev:f.nazev.trim(),castka:parseFloat(f.castka),jednotka:f.jednotka};
    if(isNew)await sb.from("pravnici_sazby").insert({...data,pravnik_id});
    else await sb.from("pravnici_sazby").update(data).eq("id",sazba.id);
    setSaving(false);onSaved();
  };
  return <Modal title={isNew?"Přidat sazbu":"Upravit sazbu"} onClose={onClose} width={460} accent={C.purple}>
    <Field label="Název sazby *"><input style={inp} value={f.nazev} onChange={e=>setF(p=>({...p,nazev:e.target.value}))} autoFocus placeholder="Konzultace" onKeyDown={e=>e.key==="Enter"&&uloz()}/></Field>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
      <Field label="Částka (Kč) *"><input style={inp} type="number" value={f.castka} onChange={e=>setF(p=>({...p,castka:e.target.value}))} placeholder="2500"/></Field>
      <Field label="Jednotka *"><select style={inp} value={f.jednotka} onChange={e=>setF(p=>({...p,jednotka:e.target.value}))}><option value="hod">Kč/hodinu</option><option value="ukon">Kč/úkon</option></select></Field>
    </div>
    <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:6}}>
      <button onClick={onClose} style={btnC(C.muted,true)}>Zrušit</button>
      <button onClick={uloz} disabled={saving||!f.nazev.trim()||!f.castka} style={btnC(C.purple)}>{saving?"Ukládám…":"Uložit"}</button>
    </div>
  </Modal>;
}

function PripadModal({pripad,onClose,onSaved}){
  const isNew=!pripad;
  const [f,setF]=useState({nazev:pripad?.nazev||"",popis:pripad?.popis||"",stav:pripad?.stav||"aktivni"});
  const [saving,setSaving]=useState(false);
  const uloz=async()=>{
    if(!f.nazev.trim())return;
    setSaving(true);
    if(isNew)await sb.from("pravnici_pripady").insert(f);
    else await sb.from("pravnici_pripady").update(f).eq("id",pripad.id);
    setSaving(false);onSaved();
  };
  return <Modal title={isNew?"Přidat případ":"Upravit případ"} onClose={onClose} width={480} accent={C.purple}>
    <Field label="Název případu *"><input style={inp} value={f.nazev} onChange={e=>setF(p=>({...p,nazev:e.target.value}))} autoFocus placeholder="Spor o děti" onKeyDown={e=>e.key==="Enter"&&uloz()}/></Field>
    <Field label="Popis"><textarea style={{...inp,resize:"vertical",minHeight:60}} value={f.popis} onChange={e=>setF(p=>({...p,popis:e.target.value}))} placeholder="Detaily…"/></Field>
    <Field label="Stav"><select style={inp} value={f.stav} onChange={e=>setF(p=>({...p,stav:e.target.value}))}><option value="aktivni">Aktivní</option><option value="uzavreny">Uzavřený</option></select></Field>
    <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:6}}>
      <button onClick={onClose} style={btnC(C.muted,true)}>Zrušit</button>
      <button onClick={uloz} disabled={saving||!f.nazev.trim()} style={btnC(C.purple)}>{saving?"Ukládám…":"Uložit"}</button>
    </div>
  </Modal>;
}

function ZaznamModal({zaznam,pripad_id,onClose,onSaved}){
  const {data:pripady}=useData(()=>sb.from("pravnici_pripady").select("*").order("nazev"));
  const {data:pravnici}=useData(()=>sb.from("pravnici").select("*").order("jmeno"));
  const {data:sazby}=useData(()=>sb.from("pravnici_sazby").select("*").order("nazev"));
  const isNew=!zaznam;
  const [f,setF]=useState({
    pripad_id:zaznam?.pripad_id||pripad_id||"",
    pravnik_id:zaznam?.pravnik_id||"",
    sazba_id:zaznam?.sazba_id||"",
    datum:zaznam?.datum||new Date().toISOString().slice(0,10),
    pocet_hodin_ukonu:zaznam?.pocet_hodin_ukonu||"",
    vypocitana_castka:zaznam?.vypocitana_castka||"",
    poznamka:zaznam?.poznamka||""
  });
  const [saving,setSaving]=useState(false);
  const vybrSazba=sazby?.find(s=>s.id==f.sazba_id);
  const vypocteno=vybrSazba&&f.pocet_hodin_ukonu?parseFloat(f.pocet_hodin_ukonu)*vybrSazba.castka:0;

  const uloz=async()=>{
    if(!f.pripad_id||!f.pravnik_id||!f.sazba_id||!f.datum||!f.pocet_hodin_ukonu||!f.vypocitana_castka)return;
    setSaving(true);
    const data={
      pripad_id:f.pripad_id,pravnik_id:f.pravnik_id,sazba_id:f.sazba_id,
      datum:f.datum,pocet_hodin_ukonu:parseFloat(f.pocet_hodin_ukonu),
      vypocitana_castka:parseFloat(f.vypocitana_castka),
      poznamka:f.poznamka||null
    };
    const {error}=isNew?await sb.from("pravnici_zaznam").insert(data):await sb.from("pravnici_zaznam").update(data).eq("id",zaznam.id);
    if(error){setSaving(false);alert("Chyba při ukládání: "+error.message);return;}
    setSaving(false);onSaved();
  };
  const nacitam=pripady===null||pravnici===null||sazby===null;
  return <Modal title={isNew?"Přidat záznam":"Upravit záznam"} onClose={onClose} width={500} accent={C.purple}>
    {nacitam?<Spinner/>:<div>
      <Field label="Případ *"><select style={inp} value={f.pripad_id} onChange={e=>setF(p=>({...p,pripad_id:e.target.value}))}><option value="">— vyberte —</option>{(pripady||[]).map(p=><option key={p.id} value={p.id}>{p.nazev}</option>)}</select></Field>
      <Field label="Právník *"><select style={inp} value={f.pravnik_id} onChange={e=>setF(p=>({...p,pravnik_id:e.target.value}))}><option value="">— vyberte —</option>{(pravnici||[]).map(p=><option key={p.id} value={p.id}>{p.jmeno}</option>)}</select></Field>
      <Field label="Sazba *"><select style={inp} value={f.sazba_id} onChange={e=>setF(p=>({...p,sazba_id:e.target.value}))}><option value="">— vyberte —</option>{f.pravnik_id?(sazby||[]).filter(s=>s.pravnik_id==f.pravnik_id).map(s=><option key={s.id} value={s.id}>{s.nazev} · {fmt(s.castka)}/{s.jednotka==="hod"?"h":"úkon"}</option>):<option disabled>Nejprve zvolte právníka</option>}</select></Field>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <Field label="Datum *"><input style={inp} type="date" value={f.datum} onChange={e=>setF(p=>({...p,datum:e.target.value}))}/></Field>
        <Field label="Počet h/úkonů *"><input style={inp} type="number" step="0.5" value={f.pocet_hodin_ukonu} onChange={e=>setF(p=>({...p,pocet_hodin_ukonu:e.target.value}))} placeholder="14"/></Field>
      </div>
      <Field label={`Vypočtená částka (Kč) * — doporučeno: ${fmt(vypocteno)}`}><input style={inp} type="number" value={f.vypocitana_castka} onChange={e=>setF(p=>({...p,vypocitana_castka:e.target.value}))} placeholder={String(vypocteno)}/></Field>
      <Field label="Poznámka"><textarea style={{...inp,minHeight:80,resize:"vertical",fontFamily:"inherit"}} value={f.poznamka} onChange={e=>setF(p=>({...p,poznamka:e.target.value}))} placeholder="Za které měsíce, na čem pracoval…"/></Field>
      <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:6}}>
        <button onClick={onClose} style={btnC(C.muted,true)}>Zrušit</button>
        <button onClick={uloz} disabled={saving||!f.pripad_id||!f.pravnik_id||!f.sazba_id||!f.datum||!f.pocet_hodin_ukonu||!f.vypocitana_castka} style={btnC(C.purple)}>{saving?"Ukládám…":"Uložit"}</button>
      </div>
    </div>}
  </Modal>;
}

function PlatbaModal({zaznam_id,zaplaceno,castkaKZaplaceni,onClose,onSaved}){
  const {data:ucty}=useData(()=>sb.from("fin_ucty").select("id,nazev,typ").eq("aktivni",true).order("poradi"));
  const dnes=new Date().toISOString().slice(0,10);
  const [f,setF]=useState({datum_platby:dnes,zaplacena_castka:"",ucet_id:""});
  const [saving,setSaving]=useState(false);
  const maxCastka=Math.max(0,castkaKZaplaceni-zaplaceno);

  const uloz=async()=>{
    if(!f.datum_platby||!f.zaplacena_castka||!f.ucet_id)return;
    const castka=parseFloat(f.zaplacena_castka);
    if(castka<=0||castka>maxCastka){alert(`Zadejte částku 0–${fmt(maxCastka)}`);return;}
    setSaving(true);
    const platbaData={zaznam_id,datum_platby:f.datum_platby,zaplacena_castka:castka,ucet_id:f.ucet_id};
    const {data:nova}=await sb.from("pravnici_platby").insert(platbaData).select().single();
    if(nova){
      await sb.from("fin_cashflow_plan").insert({
        rok:new Date(f.datum_platby).getFullYear(),
        mesic:new Date(f.datum_platby).getMonth()+1,
        nazev:`Právník — platba (${zaznam_id})`,
        castka:-castka,
        kategorie_id:null,
        ucet_id:f.ucet_id,
        zaznam_id:zaznam_id,
        opakovani:"jednorazove",
        dite_id:null,zvire_id:null,oprava_id:null,auto_id:null,je_majetek:false,sklad_kategorie_id:null
      });
    }
    setSaving(false);onSaved();
  };
  const nacitam=ucty===null;
  return <Modal title="Přidat platbu" onClose={onClose} width={460} accent={C.green}>
    {nacitam?<Spinner/>:<div>
      <Field label="Zbývá zaplatit"><div style={{fontSize:18,fontWeight:800,color:C.green}}>{fmt(maxCastka)}</div></Field>
      <Field label="Datum platby *"><input style={inp} type="date" value={f.datum_platby} onChange={e=>setF(p=>({...p,datum_platby:e.target.value}))}/></Field>
      <Field label={`Zaplacená částka (Kč) * · max ${fmt(maxCastka)}`}><input style={inp} type="number" step="100" value={f.zaplacena_castka} onChange={e=>setF(p=>({...p,zaplacena_castka:e.target.value}))} placeholder="20000"/></Field>
      <Field label="Účet *"><select style={inp} value={f.ucet_id} onChange={e=>setF(p=>({...p,ucet_id:e.target.value}))}><option value="">— vyberte —</option>{(ucty||[]).map(u=><option key={u.id} value={u.id}>{u.nazev} ({u.typ})</option>)}</select></Field>
      <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:6}}>
        <button onClick={onClose} style={btnC(C.muted,true)}>Zrušit</button>
        <button onClick={uloz} disabled={saving||!f.datum_platby||!f.zaplacena_castka||!f.ucet_id||parseFloat(f.zaplacena_castka)<=0||parseFloat(f.zaplacena_castka)>maxCastka} style={btnC(C.green)}>{saving?"Ukládám…":"Uložit"}</button>
      </div>
    </div>}
  </Modal>;
}

function PravnikTab(){
  const {data:pripady,loading:loadP,reload:reloadP}=useData(()=>sb.from("pravnici_pripady").select("*").order("stav").order("nazev"));
  const {data:pravnici,reload:reloadPr}=useData(()=>sb.from("pravnici").select("*").order("jmeno"));
  const {data:sazby}=useData(()=>sb.from("pravnici_sazby").select("*").order("nazev"));
  const {data:zaznam,reload:reloadZ}=useData(()=>sb.from("pravnici_zaznam").select("*").order("datum",{ascending:false}));
  const {data:platby,reload:reloadPl}=useData(()=>sb.from("pravnici_platby").select("*").order("datum_platby",{ascending:false}));
  const {data:ucty}=useData(()=>sb.from("fin_ucty").select("id,nazev").eq("aktivni",true));

  const [tab,setTab]=useState("pripady");
  const [modal,setModal]=useState(null);
  const [finModal,setFinModal]=useState(null);
  const [platbaModal,setPlatbaModal]=useState(null);

  const smaz=(table,id)=>async()=>{if(!confirm("Smazat?"))return;await sb.from(table).delete().eq("id",id);reloadP();reloadPr();};
  const zmen=(table,id,data)=>async()=>{await sb.from(table).update(data).eq("id",id);reloadP();reloadPr();};

  const getZaplaceno=(zaznam_id)=>(platby||[]).filter(p=>p.zaznam_id===zaznam_id).reduce((s,p)=>s+parseFloat(p.zaplacena_castka||0),0);
  const getStavZaplaceni=(zaznam_id,castka)=>{
    const zaplaceno=getZaplaceno(zaznam_id);
    if(zaplaceno===0)return "nezaplaceno";
    if(zaplaceno>=castka)return "zaplaceno";
    return "castecne";
  };

  const stavBarva={zaplaceno:C.green,castecne:C.orange,nezaplaceno:C.red};
  const stavLabel={zaplaceno:"✓ Zaplaceno",castecne:"⊘ Částečně",nezaplaceno:"✕ Nezaplaceno"};

  const tab_style=(t)=>({padding:"8px 20px",fontWeight:700,fontSize:13,cursor:"pointer",border:"none",background:"none",borderBottom:`2px solid ${tab===t?C.purple:"transparent"}`,color:tab===t?C.purple:C.muted,transition:"all .15s"});

  if(loadP)return <Spinner/>;
  const skupPripady={aktivni:(pripady||[]).filter(p=>p.stav==="aktivni"),uzavreny:(pripady||[]).filter(p=>p.stav==="uzavreny")};
  const celkemVyuctovano=(zaznam||[]).reduce((s,z)=>s+parseFloat(z.vypocitana_castka||0),0);
  const celkemZaplaceno=(platby||[]).reduce((s,p)=>s+parseFloat(p.zaplacena_castka||0),0);

  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
      <div style={{color:C.text,fontWeight:800,fontSize:17}}>⚖️ Právník</div>
    </div>

    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:20}}>
      <StatCard label="Připadů" val={(skupPripady.aktivni||[]).length} color={C.purple}/>
      <StatCard label="Právníků" val={(pravnici||[]).length} color={C.purple}/>
      <StatCard label="Vyúčtováno" val={fmt(celkemVyuctovano)} color={C.purple}/>
    </div>

    <div style={{display:"flex",gap:2,marginBottom:20,borderBottom:`2px solid ${C.border}`}}>
      {[{id:"pripady",label:"📋 Případy"},{id:"pravnici",label:"👤 Právníci"},{id:"zaznamy",label:"📝 Záznamy"}].map(t=><button key={t.id} onClick={()=>setTab(t.id)} style={tab_style(t.id)}>{t.label}</button>)}
    </div>

    {tab==="pripady"&&<div>
      <div style={{display:"flex",gap:10,marginBottom:16}}>
        <button onClick={()=>setModal("new_pripad")} style={btnC(C.purple)}>+ Přidat případ</button>
      </div>
      {Object.entries(skupPripady).map(([stav,items])=>items.length===0?null:(<div key={stav} style={{marginBottom:16}}>
        <div style={{fontSize:12,fontWeight:700,letterSpacing:.7,textTransform:"uppercase",color:C.muted,marginBottom:8}}>{stav==="aktivni"?"Aktivní":"Uzavřené"} ({items.length})</div>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {items.map(p=>{
            const zaznamyPripadu=(zaznam||[]).filter(z=>z.pripad_id===p.id);
            const pravniciPripadu=[...new Set(zaznamyPripadu.map(z=>z.pravnik_id))];
            const castka=zaznamyPripadu.reduce((s,z)=>s+parseFloat(z.vypocitana_castka||0),0);
            const zaplaceno=zaznamyPripadu.reduce((s,z)=>s+getZaplaceno(z.id),0);
            return <div key={p.id} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"12px 16px",borderLeft:`4px solid ${C.purple}`}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6,flexWrap:"wrap"}}>
                <span style={{fontWeight:700,fontSize:14,color:C.text,flex:1}}>{p.nazev}</span>
                <Tag color={stav==="aktivni"?C.blue:C.muted}>{stav==="aktivni"?"Aktivní":"Uzavřené"}</Tag>
              </div>
              {p.popis&&<div style={{color:C.dim,fontSize:12,marginBottom:8}}>{p.popis}</div>}
              {zaznamyPripadu.length>0&&<div style={{background:C.bg,borderRadius:8,padding:"8px 12px",marginBottom:8,fontSize:12}}>
                <div style={{color:C.muted,marginBottom:4}}>Právníci: {pravniciPripadu.map(pid=>(pravnici||[]).find(p=>p.id===pid)?.jmeno).filter(Boolean).join(", ")}</div>
                <div style={{color:C.text,fontWeight:700}}>Vyúčtováno: {fmt(castka)} · Zaplaceno: {fmt(zaplaceno)}</div>
              </div>}
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {stav==="aktivni"&&<button onClick={()=>zmen("pravnici_pripady",p.id,{stav:"uzavreny"})} style={{...btnC(C.orange,true),padding:"4px 10px",fontSize:12}}>✓ Uzavřít</button>}
                <button onClick={()=>setFinModal(p)} style={{...btnC(C.purple,true),padding:"4px 10px",fontSize:12}}>💰 Záznamy & Platby</button>
                <button onClick={()=>setModal({...p,type:"pripad"})} style={{...btnC(C.muted,true),padding:"4px 10px",fontSize:12}}>✎ Upravit</button>
                <button onClick={smaz("pravnici_pripady",p.id)} style={{...btnC(C.red,true),padding:"4px 10px",fontSize:12}}>✕</button>
              </div>
            </div>;
          })}
        </div>
      </div>))}
    </div>}

    {tab==="pravnici"&&<div>
      <div style={{display:"flex",gap:10,marginBottom:16}}>
        <button onClick={()=>setModal("new_pravnik")} style={btnC(C.purple)}>+ Přidat právníka</button>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {(pravnici||[]).map(p=>{
          const pSazby=(sazby||[]).filter(s=>s.pravnik_id===p.id);
          return <div key={p.id} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"12px 16px",borderLeft:`4px solid ${C.purple}`}}>
            <div style={{display:"flex",alignItems:"start",gap:12,marginBottom:8}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:700,fontSize:14,color:C.text,marginBottom:2}}>{p.jmeno}</div>
                {p.poznamka&&<div style={{color:C.dim,fontSize:12}}>{p.poznamka}</div>}
              </div>
            </div>
            {pSazby.length>0&&<div style={{background:C.bg,borderRadius:8,padding:"8px 12px",marginBottom:8,fontSize:11}}>
              <div style={{color:C.muted,fontWeight:700,marginBottom:4}}>Sazby:</div>
              <div style={{display:"flex",flexDirection:"column",gap:3}}>
                {pSazby.map(s=><div key={s.id}>{s.nazev}: <b>{fmt(s.castka)}</b>/{s.jednotka==="hod"?"h":"úkon"}</div>)}
              </div>
            </div>}
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              <button onClick={()=>setModal({...p,type:"sazba"})} style={{...btnC(C.accent,true),padding:"4px 10px",fontSize:12}}>+ Sazba</button>
              <button onClick={()=>setModal({...p,type:"pravnik"})} style={{...btnC(C.muted,true),padding:"4px 10px",fontSize:12}}>✎ Upravit</button>
              <button onClick={smaz("pravnici",p.id)} style={{...btnC(C.red,true),padding:"4px 10px",fontSize:12}}>✕</button>
            </div>
          </div>;
        })}
      </div>
    </div>}

    {tab==="zaznamy"&&<div>
      <div style={{display:"flex",gap:10,marginBottom:16}}>
        <button onClick={()=>setModal("new_zaznam")} style={btnC(C.purple)}>+ Přidat záznam</button>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {(zaznam||[]).map(z=>{
          const pripad=(skupPripady.aktivni||[]).concat(skupPripady.uzavreny).find(p=>p.id===z.pripad_id);
          const pravnik=(pravnici||[]).find(p=>p.id===z.pravnik_id);
          const sazba=(sazby||[]).find(s=>s.id===z.sazba_id);
          const zaplaceno=getZaplaceno(z.id);
          const stav=getStavZaplaceni(z.id,z.vypocitana_castka);
          const platbyZ=(platby||[]).filter(p=>p.zaznam_id===z.id);
          return <div key={z.id} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"12px 16px",borderLeft:`4px solid ${stavBarva[stav]}`}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6,flexWrap:"wrap"}}>
              <span style={{fontWeight:700,fontSize:14,color:C.text,flex:1}}>{pripad?.nazev}</span>
              <Tag color={stavBarva[stav]}>{stavLabel[stav]}</Tag>
            </div>
            <div style={{color:C.muted,fontSize:12,marginBottom:6}}>
              {pravnik?.jmeno} · {sazba?.nazev} ({fmt(sazba?.castka||0)}/{sazba?.jednotka==="hod"?"h":"úkon"}) · {z.pocet_hodin_ukonu} {sazba?.jednotka==="hod"?"h":"úkonů"}
            </div>
            {z.poznamka&&<div style={{color:C.dim,fontSize:11,marginBottom:6,whiteSpace:"pre-wrap"}}>{z.poznamka}</div>}
            <div style={{background:C.bg,borderRadius:8,padding:"8px 12px",marginBottom:8,fontSize:12}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                <span style={{color:C.muted}}>Vyúčtováno:</span>
                <span style={{fontWeight:700,color:C.text}}>{fmt(z.vypocitana_castka)}</span>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                <span style={{color:C.muted}}>Zaplaceno:</span>
                <span style={{fontWeight:700,color:zaplaceno>=z.vypocitana_castka?C.green:C.orange}}>{fmt(zaplaceno)}</span>
              </div>
              {platbyZ.length>0&&<div style={{borderTop:`1px solid ${C.border}`,paddingTop:6,marginTop:6}}>
                <div style={{color:C.muted,fontWeight:700,marginBottom:3}}>Platby:</div>
                {platbyZ.map(pl=><div key={pl.id} style={{fontSize:11,color:C.muted,marginBottom:2}}>
                  {new Date(pl.datum_platby).toLocaleDateString("cs-CZ")} · {fmt(pl.zaplacena_castka)} · <span style={{color:C.dim}}>{(ucty||[]).find(u=>u.id===pl.ucet_id)?.nazev||"účet"}</span>
                  <button onClick={()=>sb.from("pravnici_platby").delete().eq("id",pl.id).then(()=>reloadPl())} style={{...btnC(C.red,true),padding:"2px 6px",fontSize:10,marginLeft:6}}>🗑</button>
                </div>)}
              </div>}
            </div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {zaplaceno<z.vypocitana_castka&&<button onClick={()=>setPlatbaModal({zaznam_id:z.id,zaplaceno,castkaKZaplaceni:z.vypocitana_castka})} style={{...btnC(C.green),padding:"4px 10px",fontSize:12}}>💳 Přidat platbu</button>}
              <button onClick={()=>setModal({...z,type:"zaznam"})} style={{...btnC(C.muted,true),padding:"4px 10px",fontSize:12}}>✎ Upravit</button>
              <button onClick={smaz("pravnici_zaznam",z.id)} style={{...btnC(C.red,true),padding:"4px 10px",fontSize:12}}>✕</button>
            </div>
          </div>;
        })}
      </div>
    </div>}

    {modal==="new_pripad"&&<PripadModal onClose={()=>setModal(null)} onSaved={()=>{setModal(null);reloadP();}}/>}
    {modal&&modal.type==="pripad"&&<PripadModal pripad={modal} onClose={()=>setModal(null)} onSaved={()=>{setModal(null);reloadP();}}/>}
    {modal==="new_pravnik"&&<PravnikModal onClose={()=>setModal(null)} onSaved={()=>{setModal(null);reloadPr();}}/>}
    {modal&&modal.type==="pravnik"&&<PravnikModal pravnik={modal} onClose={()=>setModal(null)} onSaved={()=>{setModal(null);reloadPr();}}/>}
    {modal&&modal.type==="sazba"&&<SazbaModal sazba={modal.id?modal:null} pravnik_id={modal.id} onClose={()=>setModal(null)} onSaved={()=>{setModal(null);reloadPr();}}/>}
    {modal==="new_zaznam"&&<ZaznamModal onClose={()=>setModal(null)} onSaved={()=>{setModal(null);reloadZ();}}/>}
    {modal&&modal.type==="zaznam"&&<ZaznamModal zaznam={modal} onClose={()=>setModal(null)} onSaved={()=>{setModal(null);reloadZ();}}/>}
    {platbaModal&&<PlatbaModal zaznam_id={platbaModal.zaznam_id} zaplaceno={platbaModal.zaplaceno} castkaKZaplaceni={platbaModal.castkaKZaplaceni} onClose={()=>setPlatbaModal(null)} onSaved={()=>{setPlatbaModal(null);reloadPl();reloadP();}}/>}
  </div>;
}

const TILES=[
  {id:"deti",     emoji:"👨‍👩‍👧‍👦", label:"Rodina",    popis:"Profily a info",         barva:"#4f7ef0"},
  {id:"obleceni", emoji:"👕", label:"Oblečení",  popis:"Sklady a velikosti",     barva:"#3b6fd4"},
  {id:"boty",     emoji:"👟", label:"Boty",      popis:"Páry a umístění",        barva:"#6b3fa0"},
  {id:"sklad",    emoji:"📦", label:"Sklad",     popis:"Zásoby doma",            barva:"#c87000"},
  {id:"ukoly",    emoji:"🔁", label:"Úkoly",     popis:"Pravidelná údržba",      barva:"#1a6fa8"},
  {id:"spotreba", emoji:"💧", label:"Spotřeba",  popis:"Voda, elektřina, plyn",  barva:"#1a7a4a"},
  {id:"voda",     emoji:"🚰", label:"Voda",      popis:"Odečty, faktury, odhad", barva:"#0369a1"},
  {id:"elektrina",emoji:"⚡", label:"Elektřina", popis:"Samoodečty a vyúčtování",barva:"#b45309"},
  {id:"finance",  emoji:"🗄", label:"Finance — zůstatky OLD", popis:"Stará evidence, jen zůstatky", barva:"#8a7a5a"},
  {id:"finance2", emoji:"💰", label:"Finance",        popis:"Import z banky a nový přehled", barva:"#b8860b"},
  {id:"cashflow", emoji:"📈", label:"Cashflow",  popis:"Plán likvidity a převody",barva:"#0f766e"},
  {id:"dum",      emoji:"🔧", label:"Dům",       popis:"Opravy a plánování",     barva:"#8B3A1A"},
  {id:"auta",     emoji:"🚗", label:"Auta",      popis:"Servis, náklady, km",     barva:"#1a1a2e"},
  {id:"poznamky", emoji:"📝", label:"Poznámky",  popis:"Nápady a todolist",      barva:"#2ed8c8"},
  {id:"projekty", emoji:"🏗",  label:"Projekty",  popis:"Realizované projekty",   barva:"#e05555"},
  {id:"alimenty", emoji:"⚖️",  label:"Alimenty",  popis:"Šíma — Sylvestr & John", barva:"#c0392b"},
  {id:"pravnik",  emoji:"👨‍⚖️",  label:"Právník",   popis:"Případy a náklady",      barva:"#6b3fa0"},
  {id:"kalendar", emoji:"📅",  label:"Kalendář",  popis:"Google Calendar",         barva:"#1a7a4a"},
  {id:"zvirata",  emoji:"🐾",  label:"Zvířata",   popis:"Profily a péče",           barva:"#7a5c3a"},
  {id:"dokumenty",emoji:"📁",  label:"Dokumenty", popis:"Centrální kartotéka",      barva:"#5a6acf"},
  {id:"ucty",     emoji:"🔐",  label:"Účty & PC", popis:"Hesla, licence, hardware",   barva:"#334155"},
];

// ── TÝDENNÍ WIDGET NA HOMEPAGE ───────────────────────────────────────────────
function OdpocetWidget(){
  const {data:projekty}=useData(()=>sb.from("projekty").select("*").not("datum","is",null).order("datum").limit(1));
  const [countdown,setCountdown]=useState("");

  useEffect(()=>{
    if(!projekty||projekty.length===0)return;
    const p=projekty[0];
    const cil=new Date(p.datum+"T"+(p.cas?p.cas.slice(0,5):"00:00"));
    const tick=()=>{
      const diff=cil-new Date();
      if(diff<=0){setCountdown("🎉 Dnes!");return;}
      const d=Math.floor(diff/(1000*60*60*24));
      const h=Math.floor((diff%(1000*60*60*24))/(1000*60*60));
      const m=Math.floor((diff%(1000*60*60))/(1000*60));
      const s=Math.floor((diff%(1000*60))/1000);
      setCountdown(`${d}d ${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`);
    };
    tick();
    const id=setInterval(tick,1000);
    return()=>clearInterval(id);
  },[projekty]);

  if(!projekty||projekty.length===0||!countdown)return null;
  const p=projekty[0];

  return <div style={{display:"flex",alignItems:"center",gap:10,background:"#fff0f6",border:"1px solid #f9a8d4",borderRadius:12,padding:"8px 16px"}}>
    <span style={{fontSize:22}}>{p.emoji||"💒"}</span>
    <div>
      <div style={{fontWeight:800,fontSize:15,color:"#be185d",fontVariantNumeric:"tabular-nums"}}>{countdown}</div>
      <div style={{fontSize:10,color:"#9d174d"}}>{p.nazev}</div>
    </div>
  </div>;
}

function VodaUpozorneniWidget({onKlikni}){
  const {data:odecty}=useData(()=>sb.from("voda_odecty").select("datum,typ").eq("typ","podruzny").order("datum",{ascending:false}).limit(1));
  const {data:faktury}=useData(()=>sb.from("voda_faktury").select("castka,zaplaceno").eq("zaplaceno",false));

  const dnes=new Date();
  const aktMesic=`${dnes.getFullYear()}-${String(dnes.getMonth()+1).padStart(2,"0")}`;
  const posledniOdecet=odecty&&odecty[0]?odecty[0].datum?.slice(0,7):null;
  const chybiOdecet=posledniOdecet!==aktMesic;
  const nezaplaceno=(faktury||[]).reduce((a,f)=>a+f.castka,0);

  if(!chybiOdecet&&nezaplaceno===0)return null;

  return <div style={{background:"#fff8e1",border:"1px solid #f5c07a",borderRadius:12,padding:"12px 18px",marginBottom:16,cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center"}} onClick={onKlikni}>
    <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
      {chybiOdecet&&<span style={{fontSize:13,fontWeight:700,color:"#b36a00"}}>🚰 Nezadán odečet vodoměru za {dnes.toLocaleDateString("cs-CZ",{month:"long",year:"numeric"})}</span>}
      {nezaplaceno>0&&<span style={{fontSize:13,fontWeight:700,color:"#b36a00"}}>💧 Nezaplacené faktury: {nezaplaceno.toLocaleString("cs")} Kč</span>}
    </div>
    <span style={{fontSize:12,color:"#b36a00"}}>→ Voda</span>
  </div>;
}

function TydenWidget(){
  const {token,loading}=useGoogleToken();
  const [udalosti,setUdalosti]=useState([]);

  useEffect(()=>{
    if(!token)return;
    const dnes=new Date();
    const den=dnes.getDay()===0?6:dnes.getDay()-1;
    const od=new Date(dnes); od.setDate(dnes.getDate()-den); od.setHours(0,0,0,0);
    const do_=new Date(od); do_.setDate(od.getDate()+6); do_.setHours(23,59,59,999);
    nactiUdalosti(token,od,do_).then(setUdalosti);
  },[token]);

  if(loading||!token)return null;

  const dnes=new Date().toISOString().slice(0,10);
  const dnesUd=udalosti.filter(u=>u.zacatek.slice(0,10)===dnes);
  const zbytek=udalosti.filter(u=>u.zacatek.slice(0,10)>dnes);

  return <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,padding:"16px 20px",marginBottom:24}}>
    <div style={{fontSize:12,fontWeight:700,textTransform:"uppercase",letterSpacing:.6,color:C.muted,marginBottom:12}}>📅 Tento týden</div>
    {udalosti.length===0?<div style={{fontSize:13,color:C.dim}}>Žádné události tento týden</div>:<>
      {dnesUd.length>0&&<>
        <div style={{fontSize:11,fontWeight:700,color:C.accent,textTransform:"uppercase",letterSpacing:.5,marginBottom:6}}>Dnes</div>
        {dnesUd.map(u=><div key={u.id} style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
          <div style={{width:3,height:28,borderRadius:99,background:u.barva,flexShrink:0}}/>
          <div>
            <div style={{fontSize:13,fontWeight:600,color:C.text}}>{u.nazev}</div>
            <div style={{fontSize:11,color:C.muted}}>{u.celehodinu?"Celý den":new Date(u.zacatek).toLocaleTimeString("cs-CZ",{hour:"2-digit",minute:"2-digit"})} · {u.kalendar}</div>
          </div>
        </div>)}
        {zbytek.length>0&&<div style={{height:1,background:C.border,margin:"10px 0"}}/>}
      </>}
      {zbytek.slice(0,5).map(u=><div key={u.id} style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
        <div style={{width:3,height:28,borderRadius:99,background:u.barva,flexShrink:0}}/>
        <div>
          <div style={{fontSize:13,fontWeight:600,color:C.text}}>{u.nazev}</div>
          <div style={{fontSize:11,color:C.muted}}>
            {new Date(u.zacatek).toLocaleDateString("cs-CZ",{weekday:"short",day:"numeric",month:"numeric"})}
            {!u.celehodinu&&" · "+new Date(u.zacatek).toLocaleTimeString("cs-CZ",{hour:"2-digit",minute:"2-digit"})}
            {" · "}{u.kalendar}
          </div>
        </div>
      </div>)}
      {zbytek.length>5&&<div style={{fontSize:11,color:C.dim,marginTop:4}}>+ {zbytek.length-5} dalších událostí</div>}
    </>}
  </div>;
}

function AppInner() {
  const [modul,setModul]=useState(null);
  const [upravy,setUpravy]=useState(false);
  const [poradi,setPoradi]=useState(null); // null = načítám
  const [dragId,setDragId]=useState(null);
  const [dragOver,setDragOver]=useState(null);
  const dragNode=useRef(null);

  // Načti pořadí ze Supabase
  useEffect(()=>{
    sb.from("app_nastaveni").select("hodnota").eq("klic","tiles_poradi").single()
      .then(({data})=>{
        if(data?.hodnota){
          try{
            const ids=JSON.parse(data.hodnota);
            if(Array.isArray(ids)&&ids.length>0){
              // Seřaď TILES podle uloženého pořadí, přidej nové na konec
              const serazene=ids.map(id=>TILES.find(t=>t.id===id)).filter(Boolean);
              const nove=TILES.filter(t=>!ids.includes(t.id));
              setPoradi([...serazene,...nove]);
              return;
            }
          }catch{}
        }
        setPoradi([...TILES]);
      });
  },[]);

  const ulozPoradi=async(novePoradi)=>{
    await sb.from("app_nastaveni").update({hodnota:JSON.stringify(novePoradi.map(t=>t.id))}).eq("klic","tiles_poradi");
  };

  const tiles=poradi||TILES;
  const aktivniTile=TILES.find(t=>t.id===modul);

  // Drag & drop handlery
  const onDragStart=(e,id)=>{
    setDragId(id);
    dragNode.current=e.currentTarget;
    e.dataTransfer.effectAllowed="move";
    setTimeout(()=>{if(dragNode.current)dragNode.current.style.opacity="0.4";},0);
  };
  const onDragEnd=()=>{
    setDragId(null);setDragOver(null);
    if(dragNode.current)dragNode.current.style.opacity="1";
    dragNode.current=null;
  };
  const onDragOver=(e,id)=>{
    e.preventDefault();
    if(id===dragId)return;
    setDragOver(id);
    if(id!==dragId){
      const idx=(arr,i)=>arr.findIndex(t=>t.id===i);
      setPoradi(prev=>{
        const n=[...prev];
        const from=idx(n,dragId);const to=idx(n,id);
        if(from<0||to<0)return prev;
        n.splice(to,0,n.splice(from,1)[0]);
        return n;
      });
    }
  };
  const onDrop=async(e)=>{
    e.preventDefault();
    setDragOver(null);
    await ulozPoradi(tiles);
  };

  const globalStyle=`*{box-sizing:border-box}body{margin:0}::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:${C.bg}}::-webkit-scrollbar-thumb{background:${C.border};border-radius:3px}input[type=number]::-webkit-inner-spin-button{opacity:.4}.tile-normal:hover{transform:translateY(-3px);box-shadow:0 8px 24px rgba(0,0,0,.12)!important;}`;

  if(modul){
    return <div style={{minHeight:"100vh",background:C.bg,fontFamily:"'Inter','Segoe UI',sans-serif",color:C.text}}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet"/>
      <style>{globalStyle}</style>
      <div style={{background:C.surface,borderBottom:`1px solid ${C.border}`,padding:"0 24px",position:"sticky",top:0,zIndex:50}}>
        <div style={{maxWidth:1100,margin:"0 auto",display:"flex",alignItems:"center",height:54}}>
          <button onClick={()=>setModul(null)} style={{display:"flex",alignItems:"center",gap:8,border:"none",background:"none",cursor:"pointer",padding:"0 12px 0 0",borderRight:`1px solid ${C.border}`,marginRight:16}}>
            <div style={{width:26,height:26,borderRadius:6,background:C.accent,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13}}>{APP_EMOJI}</div>
            <span style={{fontWeight:800,fontSize:15,color:C.text}}>{APP_NAME}</span>
          </button>
          {aktivniTile&&<><span style={{color:C.dim,fontSize:13,marginRight:8}}>›</span>
            <span style={{fontWeight:700,fontSize:14,color:C.accent}}>{aktivniTile.emoji} {aktivniTile.label}</span></>}
        </div>
      </div>
      <div style={{maxWidth:1100,margin:"0 auto",padding:"20px 12px 60px"}}>
        {modul==="deti"     && <DetiTab/>}
        {modul==="obleceni" && <ObleceniTab/>}
        {modul==="boty"     && <BotyTab/>}
        {modul==="sklad"    && <SkladTab/>}
        {modul==="ukoly"    && <UkolyTab/>}
        {modul==="spotreba" && <SpotrebaTab/>}
        {modul==="voda"     && <VodaTab/>}
        {modul==="elektrina"&& <ElektrinaTab/>}
        {modul==="finance"  && <FinanceTab/>}
        {modul==="finance2" && <FinanceNoveTab/>}
        {modul==="cashflow" && <CashflowTab/>}
        {modul==="dum"      && <DumTab/>}
        {modul==="auta"     && <AutaTab/>}
        {modul==="poznamky" && <PoznamkyTab/>}
        {modul==="projekty" && <ProjektyTab/>}
        {modul==="alimenty" && <AlimentyTab/>}
        {modul==="pravnik"  && <PravnikTab/>}
        {modul==="kalendar" && <KalendarTab/>}
        {modul==="zvirata"  && <ZvirataTab/>}
        {modul==="dokumenty"&& <DokumentyTab/>}
        {modul==="ucty"     && <UctyTab/>}
      </div>
    </div>;
  }

  return <div style={{minHeight:"100vh",background:C.bg,fontFamily:"'Inter','Segoe UI',sans-serif",color:C.text}}>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet"/>
    <style>{globalStyle}</style>
    {/* Header */}
    <div style={{background:C.surface,borderBottom:`1px solid ${C.border}`,padding:"32px 24px 24px"}}>
      <div style={{maxWidth:1100,margin:"0 auto",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:16}}>
        <div style={{display:"flex",alignItems:"center",gap:24}}>
          <svg width="80" height="80" viewBox="0 0 300 280" role="img">
            <title>Domov logo</title>
            <circle cx="150" cy="150" r="130" fill="#EEF2FF"/>
            <rect x="168" y="58" width="20" height="46" rx="3" fill="#2B4DA0"/>
            <path d="M178 56 Q172 44 178 33 Q184 22 178 11" fill="none" stroke="#c8cfeb" strokeWidth="2" strokeLinecap="round"/>
            <polygon points="30,145 150,50 270,145" fill="#3b6fd4"/>
            <rect x="25" y="138" width="250" height="12" rx="3" fill="#2B4DA0"/>
            <rect x="55" y="145" width="190" height="115" rx="4" fill="#ffffff"/>
            <rect x="75" y="167" width="46" height="40" rx="4" fill="#E8EEFF"/>
            <line x1="98" y1="167" x2="98" y2="207" stroke="#3b6fd4" strokeWidth="1.5"/>
            <line x1="75" y1="187" x2="121" y2="187" stroke="#3b6fd4" strokeWidth="1.5"/>
            <rect x="179" y="167" width="46" height="40" rx="4" fill="#E8EEFF"/>
            <line x1="202" y1="167" x2="202" y2="207" stroke="#3b6fd4" strokeWidth="1.5"/>
            <line x1="179" y1="187" x2="225" y2="187" stroke="#3b6fd4" strokeWidth="1.5"/>
            <rect x="127" y="200" width="46" height="60" rx="5" fill="#3b6fd4"/>
            <circle cx="165" cy="232" r="4" fill="#fff"/>
            <rect x="120" y="257" width="60" height="5" rx="2" fill="#c8cfeb"/>
            <circle cx="150" cy="195" r="5" fill="#f5c842"/>
          </svg>
          <div>
            <div style={{fontWeight:800,fontSize:32,color:C.text,letterSpacing:-1}}>{APP_NAME}</div>
            <div style={{fontSize:12,color:C.muted,letterSpacing:2,textTransform:"uppercase",marginTop:2}}>Rodinný operační systém</div>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:16,flexWrap:"wrap"}}>
          <div style={{fontSize:13,color:C.dim}}>{new Date().toLocaleDateString("cs-CZ",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</div>
          <PocasiWidget/>
          {/* Přepínač úprav */}
          <button onClick={()=>setUpravy(u=>!u)} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 16px",borderRadius:10,border:`1px solid ${upravy?C.orange:C.border}`,background:upravy?C.orangeS:C.surface,cursor:"pointer",transition:"all .2s"}}>
            <div style={{width:32,height:18,borderRadius:99,background:upravy?C.orange:C.border,position:"relative",transition:"all .2s"}}>
              <div style={{position:"absolute",top:2,left:upravy?14:2,width:14,height:14,borderRadius:99,background:"#fff",transition:"all .2s",boxShadow:"0 1px 4px rgba(0,0,0,.2)"}}/>
            </div>
            <span style={{fontSize:13,fontWeight:700,color:upravy?C.orange:C.muted}}>Upravit dlaždice</span>
          </button>
        </div>
      </div>
    </div>

    {/* Dlaždice */}
    <div style={{maxWidth:1100,margin:"0 auto",padding:"32px 24px 60px"}}>
      {/* Widget — Tento týden */}
      <TydenWidget/>
      {/* Upozornění voda */}
      <VodaUpozorneniWidget onKlikni={()=>setModul("voda")}/>
      {upravy&&<div style={{background:C.orangeS,border:`1px solid ${C.orange}`,borderRadius:12,padding:"12px 18px",marginBottom:20,fontSize:13,color:C.orange,fontWeight:600}}>
        ✋ Režim úprav — přetáhni dlaždice pro změnu pořadí. Pořadí se uloží automaticky.
      </div>}
      <div style={{fontSize:12,fontWeight:700,letterSpacing:.7,textTransform:"uppercase",color:C.muted,marginBottom:16}}>
        {upravy?"Přetáhni pro změnu pořadí":"Vyberte sekci"}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:14}}>
        {tiles.map(t=>(
          <div
            key={t.id}
            className={upravy?"":"tile-normal"}
            draggable={upravy}
            onDragStart={upravy?e=>onDragStart(e,t.id):undefined}
            onDragEnd={upravy?onDragEnd:undefined}
            onDragOver={upravy?e=>onDragOver(e,t.id):undefined}
            onDrop={upravy?onDrop:undefined}
            onClick={upravy?undefined:()=>setModul(t.id)}
            style={{
              background:C.surface,
              border:`1px solid ${dragOver===t.id?C.orange:C.border}`,
              borderRadius:16,
              padding:"20px 20px 16px",
              cursor:upravy?"grab":"pointer",
              transition:"all .2s",
              boxShadow:dragOver===t.id?"0 0 0 2px "+C.orange:"0 2px 8px rgba(0,0,0,.04)",
              borderTop:`3px solid ${t.barva}`,
              userSelect:"none",
              position:"relative",
            }}>
            {upravy&&<div style={{position:"absolute",top:8,right:10,fontSize:16,color:C.dim,cursor:"grab"}}>⠿</div>}
            <div style={{fontSize:32,marginBottom:8}}>{t.emoji}</div>
            <div style={{fontWeight:800,fontSize:15,color:C.text,marginBottom:4}}>{t.label}</div>
            <div style={{fontSize:12,color:C.muted}}>{t.popis}</div>
          </div>
        ))}
      </div>
    </div>
  </div>;
}

// ══════════════════════════════════════════════════════════════════════════════
// PŘIHLAŠOVACÍ BRÁNA (Supabase Auth — e-mail + heslo). Skutečná ochrana dat
// funguje až ve spojení se zapnutým RLS na všech tabulkách (viz SQL skript v návodu).
// ══════════════════════════════════════════════════════════════════════════════
const inpLogin={width:"100%",fontSize:15,padding:"13px 14px",borderRadius:12,border:"1px solid rgba(255,255,255,.2)",outline:"none",boxSizing:"border-box",background:"rgba(255,255,255,.08)",color:"#fff"};

function LoginScreen(){
  const [email,setEmail]=useState("");
  const [heslo,setHeslo]=useState("");
  const [chyba,setChyba]=useState("");
  const [nacitam,setNacitam]=useState(false);
  const prihlasit=async()=>{
    if(!email.trim()||!heslo) return;
    setNacitam(true); setChyba("");
    const {error}=await sb.auth.signInWithPassword({email:email.trim(),password:heslo});
    setNacitam(false);
    if(error) setChyba(error.message==="Invalid login credentials"?"Nesprávný e-mail nebo heslo.":error.message);
  };
  return <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%)",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Inter','Segoe UI',sans-serif",padding:20}}>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet"/>
    <div style={{background:"rgba(255,255,255,.05)",backdropFilter:"blur(20px)",border:"1px solid rgba(255,255,255,.1)",borderRadius:24,padding:"44px 38px",maxWidth:400,width:"100%",boxShadow:"0 20px 60px rgba(0,0,0,.5)"}}>
      <div style={{textAlign:"center",marginBottom:26}}>
        <div style={{fontSize:52,marginBottom:12}}>🏡</div>
        <h1 style={{fontSize:22,fontWeight:800,margin:"0 0 6px",color:"#fff"}}>{APP_NAME}</h1>
        <p style={{color:"rgba(255,255,255,.5)",fontSize:13,margin:0}}>Přihlas se svým rodinným účtem</p>
      </div>
      <label style={{display:"block",color:"rgba(255,255,255,.6)",fontSize:12,fontWeight:700,marginBottom:6}}>E-mail</label>
      <input type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="username" placeholder="jmeno@email.cz" style={inpLogin}/>
      <label style={{display:"block",color:"rgba(255,255,255,.6)",fontSize:12,fontWeight:700,margin:"14px 0 6px"}}>Heslo</label>
      <input type="password" value={heslo} onChange={e=>setHeslo(e.target.value)} autoComplete="current-password" onKeyDown={e=>e.key==="Enter"&&prihlasit()} placeholder="••••••••" style={inpLogin}/>
      {chyba&&<div style={{color:"#ff9b9b",fontSize:12.5,marginTop:12,fontWeight:600}}>⚠ {chyba}</div>}
      <button onClick={prihlasit} disabled={nacitam||!email.trim()||!heslo} style={{background:"#4f7ef0",color:"#fff",border:"none",borderRadius:12,padding:"14px",width:"100%",fontSize:15,fontWeight:700,cursor:"pointer",marginTop:18,opacity:(nacitam||!email.trim()||!heslo)?.6:1,transition:"opacity .2s"}}>{nacitam?"Přihlašuji…":"Přihlásit se"}</button>
      <p style={{color:"rgba(255,255,255,.3)",fontSize:11,textAlign:"center",marginTop:18,lineHeight:1.5}}>Účty zakládá správce v Supabase. Zapomenuté heslo resetuje správce.</p>
    </div>
  </div>;
}

export default function App(){
  const [session,setSession]=useState(undefined); // undefined=načítám, null=odhlášen, objekt=přihlášen
  useEffect(()=>{
    sb.auth.getSession().then(({data})=>setSession(data.session||null));
    const {data:sub}=sb.auth.onAuthStateChange((_e,s)=>setSession(s||null));
    return ()=>sub.subscription.unsubscribe();
  },[]);
  if(session===undefined) return <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center"}}><Spinner/></div>;
  if(!session) return <LoginScreen/>;
  return <>
    <AppInner/>
    <button onClick={()=>sb.auth.signOut()} title={`Přihlášen: ${session.user?.email||""}`} style={{position:"fixed",bottom:14,right:14,zIndex:1000,background:C.surface,border:`1px solid ${C.border}`,borderRadius:20,padding:"7px 12px",fontSize:12,fontWeight:700,color:C.muted,cursor:"pointer",boxShadow:"0 3px 10px rgba(0,0,0,.12)"}}>🚪 Odhlásit</button>
  </>;
}
