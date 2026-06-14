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
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
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
function Modal({title,onClose,children,width=460}){return <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.8)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200}} onClick={onClose}><div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:28,width,maxWidth:"95vw",maxHeight:"92vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}><div style={{color:C.text,fontWeight:800,fontSize:18}}>{title}</div><button onClick={onClose} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:22}}>✕</button></div>{children}</div></div>;}
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
  const base={dite_id:null,zvire_id:null,oprava_id:null,auto_id:null,je_majetek:false,sklad_kategorie_id:null};
  if(!v) return base;
  const i=v.indexOf(":"); const t=v.slice(0,i), id=v.slice(i+1);
  if(t==="dite")   return {...base,dite_id:id};
  if(t==="zvire")  return {...base,zvire_id:id};
  if(t==="oprava") return {...base,oprava_id:id};
  if(t==="auto")   return {...base,auto_id:id};
  if(t==="sklad")  return {...base,je_majetek:true,sklad_kategorie_id:id==="obecne"?null:id};
  return base;
}
// Položka cashflow → {emoji,label,color} pro zobrazení Tagu vazby (nebo null)
function cashflowVazbaInfo(p,zdroje={}){
  const {deti,zvirata,opravy,auta,skladKat}=zdroje;
  const eq=(a,b)=>String(a)===String(b);
  if(p.dite_id){const d=(deti||[]).find(x=>eq(x.id,p.dite_id));return{emoji:d?.emoji||"👤",label:d?.jmeno||"Člen rodiny",color:d?.barva||C.blue};}
  if(p.zvire_id){const z=(zvirata||[]).find(x=>eq(x.id,p.zvire_id));return{emoji:z?.emoji||"🐾",label:z?.jmeno||"Zvíře",color:z?.barva||"#7a5c3a"};}
  if(p.oprava_id){const o=(opravy||[]).find(x=>eq(x.id,p.oprava_id));return{emoji:"🔧",label:o?.nazev||"Oprava",color:C.orange};}
  if(p.auto_id){const a=(auta||[]).find(x=>eq(x.id,p.auto_id));return{emoji:"🚗",label:a?.nazev||a?.spz||"Auto",color:C.accent};}
  if(p.je_majetek){const k=(skladKat||[]).find(x=>eq(x.id,p.sklad_kategorie_id));return{emoji:k?.emoji||"📦",label:k?`Majetek · ${k.nazev}`:"Majetek / sklad",color:C.purple};}
  return null;
}

// Sdílený modal pro vytvoření/úpravu položky cashflow plánu — použitelný odkudkoliv.
// Volitelný `lock` předvybere a uzamkne vazbu: {dite_id} | {zvire_id} | {oprava_id} | {majetek:true}
function CashflowModal({polozka,defaultRok,defaultMesic,defaultNazev,defaultCastka,lock,onClose,onSaved}){
  const dnes=new Date();
  const {data:kategorie}=useData(()=>sb.from("fin_kategorie").select("*").order("poradi"));
  const {data:ucty}=useData(()=>sb.from("fin_ucty").select("id,nazev,typ,mena").eq("aktivni",true).order("poradi"));
  const {data:deti}=useData(()=>sb.from("deti").select("id,jmeno,emoji,barva").order("jmeno"));
  const {data:zvirata}=useData(()=>sb.from("zvirata").select("id,jmeno,emoji,barva").order("jmeno"));
  const {data:opravy}=useData(()=>sb.from("dum_opravy").select("id,nazev,stav").order("nazev"));
  const {data:auta}=useData(()=>sb.from("auta").select("id,nazev,spz").order("nazev"));
  const {data:skladKat}=useData(()=>sb.from("sklad_kategorie").select("id,nazev,emoji").order("poradi"));

  const lockVazba = lock?.dite_id   ? "dite:"+lock.dite_id
    : lock?.zvire_id  ? "zvire:"+lock.zvire_id
    : lock?.oprava_id ? "oprava:"+lock.oprava_id
    : lock?.auto_id   ? "auto:"+lock.auto_id
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
  const set=k=>e=>setF(p=>({...p,[k]:e.target.value}));
  const isNew=!polozka;
  const jePrevod = typ==="prevod";                // odvozené – řídí zobrazení polí i uložení
  const nacitam = kategorie===null||ucty===null||deti===null||zvirata===null||opravy===null||auta===null||skladKat===null;
  // Uzamčená vazba na konkrétní entitu (ne majetek) → předvybraný a zakázaný dropdown
  const lockInfo = (lock && !lock.majetek) ? cashflowVazbaInfo(vazbaNaSloupce(lockVazba),{deti,zvirata,opravy,auta,skladKat}) : null;

  const prevodNeplatny = jePrevod && (!f.ucet_id || !f.prevod_ucet_id || String(f.ucet_id)===String(f.prevod_ucet_id));
  const uloz=async()=>{
    if(!f.nazev.trim()||f.castka==="") return;
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
  const inpL    = {...inp, fontSize:15, padding:"0 14px", height:48, borderRadius:10, boxSizing:"border-box"};
  const inpAmt  = {...inp, fontSize:24, fontWeight:800, padding:"0 56px 0 16px", height:62, borderRadius:14, boxSizing:"border-box"};
  const sekce   = {background:C.bg, border:`1px solid ${C.border}`, borderRadius:14, padding:16, marginBottom:14};
  const sekceLbl= {fontSize:12, fontWeight:800, color:C.muted, letterSpacing:.6, textTransform:"uppercase", margin:"0 2px 12px"};
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

  return <Modal title={isNew?"Nová finanční položka":"Upravit položku"} onClose={onClose} width={470}>
    {nacitam?<Spinner/>:<div>
      <style>{`
        .cf-amount::-webkit-outer-spin-button,.cf-amount::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}
        .cf-amount{-moz-appearance:textfield}
        @keyframes cfSlide{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      {/* 1) Segmentovaný přepínač typu transakce — hlavní navigace */}
      <div style={{display:"flex",gap:8,marginBottom:18,background:C.bg,padding:6,borderRadius:13,border:`1px solid ${C.border}`}}>
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
        </FL>

        {jePrevod&&(
          <div style={{animation:"cfSlide .2s ease"}}>
            <FL label="Na účet *">
              <select style={inpL} value={f.prevod_ucet_id} onChange={set("prevod_ucet_id")}>
                <option value="">— vyberte cílový účet —</option>
                {(ucty||[]).filter(u=>String(u.id)!==String(f.ucet_id)).map(u=><option key={u.id} value={u.id}>{u.nazev}{u.typ==="deti"?" · 👶 dětský":""}</option>)}
              </select>
            </FL>
          </div>
        )}
      </div>

      {/* 4) ZAŘAZENÍ — kategorie + vazba (jen příjem / výdej) */}
      {!jePrevod&&(
        <div style={sekce}>
          <div style={sekceLbl}>Zařazení</div>

          <FL label="Kategorie" style={{marginBottom:14}}>
            <select style={inpL} value={f.kategorie_id} onChange={set("kategorie_id")}>
              <option value="">— bez kategorie —</option>
              <optgroup label="Příjmy">{(kategorie||[]).filter(k=>k.typ==="prijem").map(k=><option key={k.id} value={k.id}>{k.emoji} {k.nazev}</option>)}</optgroup>
              <optgroup label="Výdaje">{(kategorie||[]).filter(k=>k.typ==="vydaj").map(k=><option key={k.id} value={k.id}>{k.emoji} {k.nazev}</option>)}</optgroup>
            </select>
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
        <button onClick={uloz} disabled={saving||!f.nazev.trim()||f.castka===""||prevodNeplatny} style={{...btnC(),padding:"12px 24px",fontSize:14,borderRadius:10}}>{saving?"Ukládám…":"Uložit položku"}</button>
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
    {/* DEBUG: kontejnery per velikost */}
    {allDruhy.length>0&&(vsechnyKonts||[]).some((k,_,arr)=>arr.filter(x=>x.velikost_id===k.velikost_id).length>1)&&<div style={{background:"#fff8e1",border:"1px solid #f5a623",borderRadius:10,padding:"10px 14px",marginBottom:16,fontSize:12,color:"#c87000"}}>
      ⚠ <strong>Nalezeny duplicitní kontejnery pro stejnou velikost:</strong>
      {[...new Set((vsechnyKonts||[]).map(k=>k.velikost_id))].map(vid=>{
        const ks=(vsechnyKonts||[]).filter(k=>k.velikost_id===vid);
        if(ks.length<=1)return null;
        return <div key={vid} style={{marginTop:4}}>Velikost <strong>{vid}</strong>: {ks.map(k=>`"${k.nazev}" (id:${k.id})`).join(", ")}</div>;
      })}
      <div style={{marginTop:6}}>Smažte duplicitní kontejnery nebo přesuňte jejich položky.</div>
    </div>}

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
// ── FINANCE PIN GATE ─────────────────────────────────────────────────────────
const FINANCE_PIN = "780519";

function FinancePinGate(){
  const [odemceno,setOdemceno]=useState(()=>sessionStorage.getItem("finance_pin")==="ok");
  const [pin,setPin]=useState("");
  const [chyba,setChyba]=useState(false);

  const pokus=()=>{
    if(pin===FINANCE_PIN){
      sessionStorage.setItem("finance_pin","ok");
      setOdemceno(true);
    } else {
      setChyba(true);
      setPin("");
      setTimeout(()=>setChyba(false),2000);
    }
  };

  if(odemceno)return <FinanceTab/>;

  return <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:400}}>
    <div style={{background:"#fff",borderRadius:20,padding:"40px 36px",maxWidth:320,width:"100%",textAlign:"center",boxShadow:"0 8px 32px rgba(0,0,0,.1)"}}>
      <div style={{fontSize:48,marginBottom:12}}>🔒</div>
      <h2 style={{fontSize:20,fontWeight:800,margin:"0 0 6px"}}>Finance</h2>
      <p style={{color:"#6b7280",fontSize:13,marginBottom:24}}>Zadej PIN pro přístup</p>
      <input
        type="password"
        inputMode="numeric"
        maxLength={6}
        value={pin}
        onChange={e=>setPin(e.target.value)}
        onKeyDown={e=>e.key==="Enter"&&pokus()}
        placeholder="• • • • • •"
        autoFocus
        style={{width:"100%",textAlign:"center",fontSize:22,letterSpacing:6,padding:"12px",borderRadius:10,border:`2px solid ${chyba?"#e05555":"#e2e6f0"}`,outline:"none",boxSizing:"border-box",marginBottom:8,transition:"border-color .2s"}}
      />
      {chyba&&<div style={{color:"#e05555",fontSize:12,marginBottom:8}}>Špatný PIN, zkus znovu</div>}
      <button
        onClick={pokus}
        style={{background:"#3b6fd4",color:"#fff",border:"none",borderRadius:10,padding:"11px",width:"100%",fontSize:14,fontWeight:700,cursor:"pointer",marginTop:4}}
      >Přihlásit se</button>
    </div>
  </div>;
}

// Cashflow modul sdílí stejný PIN i odemčení jako Finance (Realita).
function CashflowPinGate(){
  const [odemceno,setOdemceno]=useState(()=>sessionStorage.getItem("finance_pin")==="ok");
  const [pin,setPin]=useState("");
  const [chyba,setChyba]=useState(false);

  const pokus=()=>{
    if(pin===FINANCE_PIN){
      sessionStorage.setItem("finance_pin","ok");
      setOdemceno(true);
    } else {
      setChyba(true);setPin("");
      setTimeout(()=>setChyba(false),2000);
    }
  };

  if(odemceno)return <CashflowTab/>;

  return <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:400}}>
    <div style={{background:"#fff",borderRadius:20,padding:"40px 36px",maxWidth:320,width:"100%",textAlign:"center",boxShadow:"0 8px 32px rgba(0,0,0,.1)"}}>
      <div style={{fontSize:48,marginBottom:12}}>🔒</div>
      <h2 style={{fontSize:20,fontWeight:800,margin:"0 0 6px"}}>Cashflow</h2>
      <p style={{color:"#6b7280",fontSize:13,marginBottom:24}}>Zadej PIN pro přístup</p>
      <input type="password" inputMode="numeric" maxLength={6} value={pin}
        onChange={e=>setPin(e.target.value)} onKeyDown={e=>e.key==="Enter"&&pokus()}
        placeholder="• • • • • •" autoFocus
        style={{width:"100%",textAlign:"center",fontSize:22,letterSpacing:6,padding:"12px",borderRadius:10,border:`2px solid ${chyba?"#e05555":"#e2e6f0"}`,outline:"none",boxSizing:"border-box",marginBottom:8,transition:"border-color .2s"}}/>
      {chyba&&<div style={{color:"#e05555",fontSize:12,marginBottom:8}}>Špatný PIN, zkus znovu</div>}
      <button onClick={pokus} style={{background:"#3b6fd4",color:"#fff",border:"none",borderRadius:10,padding:"11px",width:"100%",fontSize:14,fontWeight:700,cursor:"pointer",marginTop:4}}>Přihlásit se</button>
    </div>
  </div>;
}

function FinanceTab(){
  const [zalozka,setZalozka]=useState("dashboard");
  const {data:ucty,reload:reloadUcty}=useData(()=>sb.from("fin_ucty").select("*").eq("aktivni",true).order("poradi"));
  const {data:typy_db,reload:reloadTypy}=useData(()=>sb.from("fin_typy_uctu").select("*").order("poradi"));
  const {data:kategorie,reload:reloadKat}=useData(()=>sb.from("fin_kategorie").select("*").order("poradi"));
  const {data:transakce,reload:reloadTrans}=useData(()=>sb.from("fin_transakce").select("*").order("datum",{ascending:false}).limit(500));
  const {data:plan,reload:reloadPlan}=useData(()=>sb.from("fin_cashflow_plan").select("*").order("mesic").order("castka"));
  const {data:stavy1}=useData(()=>sb.from("fin_stavy").select("*").lte("rok",2021).limit(2000));
  const {data:stavy2}=useData(()=>sb.from("fin_stavy").select("*").gte("rok",2022).limit(2000));
  const stavy=[...(stavy1||[]),...(stavy2||[])];
  const reloadStavy=()=>{};

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
          <MultiStavForm ucty={filtrTypy.length===0?(ucty||[]):(ucty||[]).filter(u=>filtrTypy.includes(u.typ))} rok={stavForm.rok} mesic={stavForm.mesic} stavy={stavy||[]} onSave={async(updates)=>{
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
    const typy2={bezny:"Běžný",sporici:"Spořící",podnikatelsky:"Podnikatelský",investicni:"Investiční",hotovost:"Hotovost",cizi_mena:"Cizí měna"};
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

  const {data:ucty}=useData(()=>sb.from("fin_ucty").select("*").eq("aktivni",true).order("poradi"));
  const {data:plan,reload:reloadPlan}=useData(()=>sb.from("fin_cashflow_plan").select("*").order("rok").order("mesic"));
  const {data:kategorie}=useData(()=>sb.from("fin_kategorie").select("*").order("poradi"));
  const {data:stavy1}=useData(()=>sb.from("fin_stavy").select("*").lte("rok",2021).limit(2000));
  const {data:stavy2}=useData(()=>sb.from("fin_stavy").select("*").gte("rok",2022).limit(2000));
  const {data:deti}=useData(()=>sb.from("deti").select("id,jmeno,emoji,barva").order("jmeno"));
  const {data:zvirata}=useData(()=>sb.from("zvirata").select("id,jmeno,emoji,barva").order("jmeno"));
  const {data:opravy}=useData(()=>sb.from("dum_opravy").select("id,nazev").order("nazev"));
  const {data:auta}=useData(()=>sb.from("auta").select("id,nazev,spz").order("nazev"));
  const {data:skladKat}=useData(()=>sb.from("sklad_kategorie").select("id,nazev,emoji").order("poradi"));
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
  const bezne=planMesice.filter(p=>!jePrevodP(p));
  const prevody=planMesice.filter(jePrevodP);
  const prijmy=bezne.filter(p=>+(p.castka)>0).reduce((a,p)=>a+(+p.castka),0);
  const vydaje=bezne.filter(p=>+(p.castka)<0).reduce((a,p)=>a+Math.abs(+p.castka),0);

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

  const tabs=[{id:"likvidita",l:"📊 Predikce likvidity"},{id:"plan",l:"📋 Plán měsíce"}];
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
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,flexWrap:"wrap",gap:10}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <button onClick={()=>{if(mesic===1){setMesic(12);setRok(r=>r-1);}else setMesic(m=>m-1);}} style={{...btnC(C.muted,true),padding:"6px 12px"}}>←</button>
          <div style={{fontWeight:800,fontSize:18,minWidth:140,textAlign:"center"}}>{MESICE[mesic-1]} {rok}</div>
          <button onClick={()=>{if(mesic===12){setMesic(1);setRok(r=>r+1);}else setMesic(m=>m+1);}} style={{...btnC(C.muted,true),padding:"6px 12px"}}>→</button>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={kopirujMesic} style={{...btnC(C.muted,true),fontSize:12,padding:"6px 12px"}}>📋 Kopírovat →</button>
          <button onClick={()=>setModal("nova")} style={btnC()}>+ Přidat položku</button>
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:20}}>
        {[
          {l:"Plánované příjmy",v:`${prijmy.toLocaleString("cs")} Kč`,c:C.green},
          {l:"Plánované výdaje",v:`${vydaje.toLocaleString("cs")} Kč`,c:C.red},
          {l:"Bilance",v:`${(prijmy-vydaje).toLocaleString("cs")} Kč`,c:prijmy>=vydaje?C.green:C.red},
        ].map(k=><div key={k.l} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"14px 16px",borderTop:`3px solid ${k.c}`}}>
          <div style={{fontSize:11,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:.5,marginBottom:4}}>{k.l}</div>
          <div style={{fontSize:18,fontWeight:800,color:k.c}}>{k.v}</div>
        </div>)}
      </div>

      {[{label:"📥 Příjmy",arr:bezne.filter(p=>+(p.castka)>0)},{label:"📤 Výdaje",arr:bezne.filter(p=>+(p.castka)<0)}].map(({label,arr})=>{
        const polozky=[...arr].sort((a,b)=>Math.abs(+(b.castka))-Math.abs(+(a.castka)));
        return <div key={label} style={{marginBottom:20}}>
          <div style={{fontSize:13,fontWeight:700,color:C.muted,marginBottom:8}}>{label} ({polozky.length})</div>
          {polozky.length===0?<div style={{padding:"12px 16px",color:C.dim,fontSize:13,background:C.surface,border:`1px solid ${C.border}`,borderRadius:12}}>Žádné položky</div>:
          <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,overflow:"hidden"}}>
            {polozky.map((p,i)=>{
              const kat=(kategorie||[]).find(k=>k.id===p.kategorie_id);
              const vi=cashflowVazbaInfo(p,{deti,zvirata,opravy,auta,skladKat});
              return <div key={p.id} style={{display:"flex",alignItems:"center",gap:12,padding:"11px 16px",borderBottom:i<polozky.length-1?`1px solid ${C.border}`:"none"}}>
                <span style={{fontSize:18}}>{kat?.emoji||"💰"}</span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:600,fontSize:14}}>{p.nazev}</div>
                  <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap",marginTop:2}}>
                    {p.ucet_id&&<span style={{fontSize:11,fontWeight:700,color:C.blue,background:C.blueS,borderRadius:20,padding:"1px 8px"}}>🏦 {ucetNazev(p.ucet_id)}</span>}
                    {kat&&<span style={{fontSize:11,color:C.muted}}>{kat.nazev}</span>}
                    {vi&&<span style={{display:"inline-flex",alignItems:"center",gap:4,background:`${vi.color}1a`,color:vi.color,borderRadius:20,padding:"1px 8px",fontSize:11,fontWeight:700,whiteSpace:"nowrap"}}>{vi.emoji} {vi.label}</span>}
                  </div>
                </div>
                {p.opakovani!=="jednorazove"&&<span style={{fontSize:10,background:C.accentS,color:C.accent,borderRadius:99,padding:"2px 8px",fontWeight:700}}>🔄 {p.opakovani==="mesicni"?"měsíčně":"ročně"}</span>}
                <div style={{fontWeight:800,fontSize:15,color:+(p.castka)>0?C.green:C.red}}>{+(p.castka)>0?"+":""}{(+p.castka).toLocaleString("cs")} Kč</div>
                <button onClick={()=>setModal(p)} style={{...btnC(C.accent,true),padding:"3px 8px",fontSize:11,marginRight:4}}>✏</button>
                <button onClick={()=>smaz(p.id)} style={{...btnC(C.red,true),padding:"3px 8px",fontSize:11}}>🗑</button>
              </div>;
            })}
          </div>}
        </div>;
      })}

      {/* Plánované převody mezi účty */}
      <div style={{marginBottom:20}}>
        <div style={{fontSize:13,fontWeight:700,color:C.muted,marginBottom:8}}>↔️ Plánované převody mezi účty ({prevody.length})</div>
        {prevody.length===0?<div style={{padding:"12px 16px",color:C.dim,fontSize:13,background:C.surface,border:`1px solid ${C.border}`,borderRadius:12}}>Žádné plánované převody — přidej je tlačítkem „+ Přidat položku" a zaškrtni „Plánovaný převod".</div>:
        <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,overflow:"hidden"}}>
          {prevody.map((p,i)=><div key={p.id} style={{display:"flex",alignItems:"center",gap:12,padding:"11px 16px",borderBottom:i<prevody.length-1?`1px solid ${C.border}`:"none"}}>
            <span style={{fontSize:18}}>↔️</span>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontWeight:600,fontSize:14}}>{p.nazev}</div>
              <div style={{fontSize:11,color:C.muted}}>🏦 {ucetNazev(p.ucet_id)} → {ucetNazev(p.prevod_ucet_id)}</div>
            </div>
            <div style={{fontWeight:800,fontSize:15,color:C.blue}}>{Math.abs(+p.castka).toLocaleString("cs")} Kč</div>
            <button onClick={()=>setModal(p)} style={{...btnC(C.accent,true),padding:"3px 8px",fontSize:11,marginRight:4}}>✏</button>
            <button onClick={()=>smaz(p.id)} style={{...btnC(C.red,true),padding:"3px 8px",fontSize:11}}>🗑</button>
          </div>)}
        </div>}
      </div>
    </div>}

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

  const ulozProjekt=async()=>{
    await sb.from("projekty").insert({...form,datum:form.datum||null,cas:form.cas||null});
    setModal(false);reload();
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
          style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:16,overflow:"hidden",cursor:"pointer",transition:"all .2s",boxShadow:"0 2px 8px rgba(0,0,0,.04)"}}
          onMouseEnter={e=>e.currentTarget.style.transform="translateY(-3px)"}
          onMouseLeave={e=>e.currentTarget.style.transform="translateY(0)"}>
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
          <button onClick={ulozProjekt} style={btnC()}>Uložit</button>
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

  // Měsíce od dubna 2026 do 12 měsíců dopředu
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
  const pridatForm0={typ:"alimenty",kdo_plati:"otec",komu:"matce",komu_text:"",mesic:mesice[mesice.length-1]||"",datum:"",castka:"",poznamka:""};
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
      await sb.from("alimenty_platby").update({
        kdo_plati:editFormA.kdo_plati,komu:editFormA.komu,komu_text:editFormA.komu_text||null,
        mesic:editFormA.mesic,castka:parseInt(editFormA.castka),
        datum:editFormA.datum||null,poznamka:editFormA.poznamka||null,
      }).eq("id",editAlim.id);
      reloadPlatby();setEditAlim(null);
    };
    const smazAlim=async(id)=>{if(!confirm("Smazat tuto platbu?"))return;await sb.from("alimenty_platby").delete().eq("id",id);reloadPlatby();};

    const ulozEditMim=async()=>{
      const celkem=parseInt(editFormM.castka_celkem);
      await sb.from("alimenty_mimoradne").update({
        datum:editFormM.datum,popis:editFormM.popis,dite:editFormM.dite,
        castka_celkem:celkem,podil_matky:Math.round(celkem/2),podil_otce:Math.round(celkem/2),
        matka_zaplatila_skolce:editFormM.matka_zaplatila_skolce,
        otec_zaplatil_skolce:editFormM.otec_zaplatil_skolce,
        matka_zaplatila_za_otce:editFormM.matka_zaplatila_za_otce,
        otec_zaplatil_za_matku:editFormM.otec_zaplatil_za_matku,
        poznamka:editFormM.poznamka||null,
      }).eq("id",editMim.id);
      reloadMim();setEditMim(null);
    };
    const smazMim=async(id)=>{if(!confirm("Smazat tento výdaj?"))return;await sb.from("alimenty_mimoradne").delete().eq("id",id);reloadMim();};

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

      {/* Upozornění na chybějící měsíce */}
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
                  <button onClick={()=>{setEditAlim(p);setEditFormA({kdo_plati:p.kdo_plati,komu:p.komu,komu_text:p.komu_text||"",mesic:p.mesic||"",castka:String(p.castka),datum:p.datum||"",poznamka:p.poznamka||""});}} style={{...btnC(C.accent,true),padding:"3px 8px",fontSize:11,marginRight:4}}>✏</button>
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
                  <button onClick={()=>{setEditMim(m);setEditFormM({datum:m.datum,popis:m.popis,dite:m.dite,castka_celkem:String(m.castka_celkem),matka_zaplatila_skolce:m.matka_zaplatila_skolce,otec_zaplatil_skolce:m.otec_zaplatil_skolce,matka_zaplatila_za_otce:m.matka_zaplatila_za_otce,otec_zaplatil_za_matku:m.otec_zaplatil_za_matku,poznamka:m.poznamka||""});}} style={{...btnC(C.accent,true),padding:"3px 8px",fontSize:11,marginRight:4}}>✏</button>
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
    const [mimForm,setMimForm]=useState({datum:"",popis:"",dite:"Oba",castka_celkem:"",matka_zaplatila_skolce:false,otec_zaplatil_skolce:false,matka_zaplatila_za_otce:false,otec_zaplatil_za_matku:false,poznamka:""});
    const [zobrazit,setZobrazit]=useState("platba"); // platba | mimoradne

    const ulozPlatbuLocal=async()=>{
      const data={typ:mf.typ,kdo_plati:mf.kdo_plati,komu:mf.komu,komu_text:mf.komu_text||null,mesic:mf.typ==="alimenty"?mf.mesic:null,datum:mf.datum||null,castka:parseInt(mf.castka),poznamka:mf.poznamka||null};
      await sb.from("alimenty_platby").insert(data);
      reloadAll();setPridatModal(false);
    };

    const ulozMimoradne=async()=>{
      const celkem=parseInt(mimForm.castka_celkem);
      const podil=Math.round(celkem/2);
      const data={datum:mimForm.datum,popis:mimForm.popis,dite:mimForm.dite,castka_celkem:celkem,podil_matky:podil,podil_otce:podil,matka_zaplatila_skolce:mimForm.matka_zaplatila_skolce,otec_zaplatil_skolce:mimForm.otec_zaplatil_skolce,matka_zaplatila_za_otce:mimForm.matka_zaplatila_za_otce,otec_zaplatil_za_matku:mimForm.otec_zaplatil_za_matku,poznamka:mimForm.poznamka||null};
      await sb.from("alimenty_mimoradne").insert(data);
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
function VodaTab(){
  const [zalozka,setZalozka]=useState("fakturacni");
  const {data:odecty,reload:reloadOdecty}=useData(()=>sb.from("voda_odecty").select("*").order("datum",{ascending:true}));
  const {data:faktury,reload:reloadFaktury}=useData(()=>sb.from("voda_faktury").select("*").order("obdobi_od",{ascending:true}));
  const {data:nastaveni,reload:reloadNast}=useData(()=>sb.from("voda_nastaveni").select("*"));

  const nast=Object.fromEntries((nastaveni||[]).map(r=>[r.klic,r.hodnota]));
  const cenaM3=parseFloat(nast.cena_m3_s_dph||"80.19");
  const pasualRocni=parseFloat(nast.pausal_rocni_s_dph||"1232");

  const hlavniOdecty=(odecty||[]).filter(o=>o.typ==="hlavni").sort((a,b)=>new Date(a.datum)-new Date(b.datum));
  const podruznyOdecty=(odecty||[]).filter(o=>o.typ==="podruzny").sort((a,b)=>new Date(a.datum)-new Date(b.datum));

  const tabs=[
    {id:"fakturacni",l:"🏠 Fakturační vodoměr"},
    {id:"podruzny",l:"🚿 Podružný vodoměr"},
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

  // ── PODRUŽNÝ ──
  const PodruznyView=()=>{
    const [modal,setModal]=useState(null);
    const [form,setForm]=useState({datum:"",stav:"",poznamka:""});
    const [kalkOd,setKalkOd]=useState("");
    const [kalkDo,setKalkDo]=useState("");

    const uloz=async()=>{
      const data={datum:form.datum,typ:"podruzny",stav:parseFloat(form.stav),poznamka:form.poznamka||null};
      if(modal==="nova")await sb.from("voda_odecty").insert(data);
      else await sb.from("voda_odecty").update(data).eq("id",modal.id);
      reloadOdecty();setModal(null);
    };
    const smaz=async(id)=>{if(!confirm("Smazat odečet?"))return;await sb.from("voda_odecty").delete().eq("id",id);reloadOdecty();};

    // Měsíční přehled — od odečtu k 1. toho měsíce do odečtu k 1. dalšího měsíce
    const mesicniPrehled=()=>{
      const arr=podruznyOdecty;
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
          const odhadCena=spotreba*cenaM3+(pasualRocni/365*dny);
          result.push({mesic:`${y}-${String(m).padStart(2,"0")}`,datumOd:od.datum,datumDo:do_.datum,stavOd,stavDo,spotreba,odhadCena,dny});
        }
      }
      return result;
    };

    const prehled=mesicniPrehled();
    const posledni=podruznyOdecty[podruznyOdecty.length-1];
    const predposledni=podruznyOdecty[podruznyOdecty.length-2];
    const aktSpotreba=posledni&&predposledni?+(posledni.stav)-+(predposledni.stav):null;

    return <div>
      {/* Aktuální stav */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:20}}>
        {[
          {l:"Aktuální stav",v:posledni?`${(+posledni.stav).toFixed(3)} m³`:"—",c:C.blue,sub:posledni?new Date(posledni.datum).toLocaleDateString("cs-CZ"):""},
          {l:"Spotřeba od posl. odečtu",v:aktSpotreba!=null?`${aktSpotreba.toFixed(3)} m³`:"—",c:aktSpotreba>0?C.orange:C.green},
          {l:"Odhad ceny",v:aktSpotreba!=null?`${(aktSpotreba*cenaM3).toLocaleString("cs",{maximumFractionDigits:0})} Kč`:"—",c:C.accent},
        ].map(k=><div key={k.l} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"14px 16px",borderTop:`3px solid ${k.c}`}}>
          <div style={{fontSize:10,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:.5,marginBottom:4}}>{k.l}</div>
          <div style={{fontSize:18,fontWeight:800,color:k.c}}>{k.v}</div>
          {k.sub&&<div style={{fontSize:11,color:C.muted,marginTop:2}}>{k.sub}</div>}
        </div>)}
      </div>

      {/* Kalkulačka — výpočet z vybraných odečtů */}
      {(()=>{
        const odecetOd=podruznyOdecty.find(o=>o.id===kalkOd);
        const odecetDo=podruznyOdecty.find(o=>o.id===kalkDo);
        let vysledek=null;
        if(odecetOd&&odecetDo){
          const sp=+(odecetDo.stav)-+(odecetOd.stav);
          const dny=Math.round((new Date(odecetDo.datum)-new Date(odecetOd.datum))/(1000*60*60*24));
          vysledek={sp,dny,cenaVoda:sp*cenaM3,pausal:pasualRocni/365*dny,celkem:sp*cenaM3+(pasualRocni/365*Math.max(0,dny))};
        }
        return <div style={{background:"#eef4fc",border:"1px solid #b3d1f0",borderRadius:14,padding:"16px 20px",marginBottom:20}}>
          <div style={{fontSize:12,fontWeight:700,textTransform:"uppercase",letterSpacing:.6,color:"#1a4fa8",marginBottom:12}}>🧮 Kalkulačka spotřeby — vyber odečty</div>
          <div style={{display:"flex",gap:12,alignItems:"flex-end",flexWrap:"wrap",marginBottom:vysledek?14:0}}>
            <div style={{flex:1,minWidth:160}}>
              <div style={{fontSize:11,fontWeight:700,color:"#1a4fa8",marginBottom:4}}>Od odečtu</div>
              <select style={inp} value={kalkOd} onChange={e=>setKalkOd(e.target.value)}>
                <option value="">— vyber —</option>
                {podruznyOdecty.map(o=><option key={o.id} value={o.id}>{new Date(o.datum).toLocaleDateString("cs-CZ")} ({(+o.stav).toFixed(3)} m³)</option>)}
              </select>
            </div>
            <div style={{flex:1,minWidth:160}}>
              <div style={{fontSize:11,fontWeight:700,color:"#1a4fa8",marginBottom:4}}>Do odečtu</div>
              <select style={inp} value={kalkDo} onChange={e=>setKalkDo(e.target.value)}>
                <option value="">— vyber —</option>
                {podruznyOdecty.map(o=><option key={o.id} value={o.id}>{new Date(o.datum).toLocaleDateString("cs-CZ")} ({(+o.stav).toFixed(3)} m³)</option>)}
              </select>
            </div>
          </div>
          {vysledek&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))",gap:10}}>
            {[
              {l:"Období",v:`${vysledek.dny} dní`},
              {l:"Spotřeba",v:`${vysledek.sp.toFixed(3)} m³`},
              {l:"Vodné",v:`${vysledek.cenaVoda.toLocaleString("cs",{maximumFractionDigits:0})} Kč`},
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
                {podruznyOdecty.length===0&&<tr><td colSpan={5} style={{padding:16,textAlign:"center",color:C.dim}}>Žádné odečty</td></tr>}
                {[...podruznyOdecty].reverse().map((o,i,arr)=>{
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
          <h3 style={{margin:"0 0 18px",fontSize:17,fontWeight:800}}>{modal==="nova"?"Nový odečet podružného":"Upravit odečet"}</h3>
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

  // ── NASTAVENÍ ──
  const NastaveniView=()=>{
    const [form,setForm]=useState({cena_m3_bez_dph:nast.cena_m3_bez_dph||"71.60",cena_m3_s_dph:nast.cena_m3_s_dph||"80.19",pausal_rocni_bez_dph:nast.pausal_rocni_bez_dph||"1100",pausal_rocni_s_dph:nast.pausal_rocni_s_dph||"1232"});
    const uloz=async()=>{
      for(const[k,v]of Object.entries(form))await sb.from("voda_nastaveni").upsert({klic:k,hodnota:String(v)});
      reloadNast();alert("Uloženo!");
    };
    return <div style={{maxWidth:400}}>
      <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,padding:20}}>
        <h3 style={{margin:"0 0 16px",fontSize:15,fontWeight:800}}>Ceník BARACOM</h3>
        {[{l:"Cena za m³ bez DPH (Kč)",k:"cena_m3_bez_dph"},{l:"Cena za m³ s DPH (Kč)",k:"cena_m3_s_dph"},{l:"Roční paušál bez DPH (Kč)",k:"pausal_rocni_bez_dph"},{l:"Roční paušál s DPH (Kč)",k:"pausal_rocni_s_dph"}].map(f=><div key={f.k} style={{marginBottom:12}}>
          <div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:5}}>{f.l}</div>
          <input style={inp} type="number" step="0.01" value={form[f.k]} onChange={e=>setForm(p=>({...p,[f.k]:e.target.value}))}/>
        </div>)}
        <button onClick={uloz} style={btnC()}>Uložit ceník</button>
      </div>
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

const TILES=[
  {id:"deti",     emoji:"👨‍👩‍👧‍👦", label:"Rodina",    popis:"Profily a info",         barva:"#4f7ef0"},
  {id:"obleceni", emoji:"👕", label:"Oblečení",  popis:"Sklady a velikosti",     barva:"#3b6fd4"},
  {id:"boty",     emoji:"👟", label:"Boty",      popis:"Páry a umístění",        barva:"#6b3fa0"},
  {id:"sklad",    emoji:"📦", label:"Sklad",     popis:"Zásoby doma",            barva:"#c87000"},
  {id:"ukoly",    emoji:"🔁", label:"Úkoly",     popis:"Pravidelná údržba",      barva:"#1a6fa8"},
  {id:"spotreba", emoji:"💧", label:"Spotřeba",  popis:"Voda, elektřina, plyn",  barva:"#1a7a4a"},
  {id:"voda",     emoji:"🚰", label:"Voda",      popis:"Odečty, faktury, odhad", barva:"#0369a1"},
  {id:"finance",  emoji:"💰", label:"Finance (Realita)", popis:"Reálné útraty a 22 účtů", barva:"#b8860b"},
  {id:"cashflow", emoji:"📈", label:"Cashflow",  popis:"Plán likvidity a převody",barva:"#0f766e"},
  {id:"dum",      emoji:"🔧", label:"Dům",       popis:"Opravy a plánování",     barva:"#8B3A1A"},
  {id:"auta",     emoji:"🚗", label:"Auta",      popis:"Servis, náklady, km",     barva:"#1a1a2e"},
  {id:"poznamky", emoji:"📝", label:"Poznámky",  popis:"Nápady a todolist",      barva:"#2ed8c8"},
  {id:"projekty", emoji:"🏗",  label:"Projekty",  popis:"Realizované projekty",   barva:"#e05555"},
  {id:"alimenty", emoji:"⚖️",  label:"Alimenty",  popis:"Šíma — Sylvestr & John", barva:"#c0392b"},
  {id:"kalendar", emoji:"📅",  label:"Kalendář",  popis:"Google Calendar",         barva:"#1a7a4a"},
  {id:"zvirata",  emoji:"🐾",  label:"Zvířata",   popis:"Profily a péče",           barva:"#7a5c3a"},
  {id:"dokumenty",emoji:"📁",  label:"Dokumenty", popis:"Centrální kartotéka",      barva:"#5a6acf"},
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

// ── GLOBÁLNÍ PIN GATE ────────────────────────────────────────────────────────
const APP_PIN = "5257";

function AppPinGate({children}){
  const [ok,setOk]=useState(()=>sessionStorage.getItem("app_pin")==="ok");
  const [pin,setPin]=useState("");
  const [chyba,setChyba]=useState(false);
  const [pokusů,setPokusu]=useState(0);

  const pokus=()=>{
    if(pin===APP_PIN){
      sessionStorage.setItem("app_pin","ok");
      setOk(true);
    } else {
      setPokusu(p=>p+1);
      setChyba(true);
      setPin("");
      setTimeout(()=>setChyba(false),2000);
    }
  };

  if(ok)return children;

  return <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%)",display:"flex",alignItems:"center",justifyContent:"center"}}>
    <div style={{background:"rgba(255,255,255,.05)",backdropFilter:"blur(20px)",border:"1px solid rgba(255,255,255,.1)",borderRadius:24,padding:"48px 40px",maxWidth:380,width:"100%",textAlign:"center",boxShadow:"0 20px 60px rgba(0,0,0,.5)"}}>
      <div style={{fontSize:52,marginBottom:16}}>🏡</div>
      <h1 style={{fontSize:22,fontWeight:800,margin:"0 0 6px",color:"#fff"}}>{APP_NAME}</h1>
      <p style={{color:"rgba(255,255,255,.5)",fontSize:13,marginBottom:8}}>Rodinný operační systém</p>
      <p style={{color:"rgba(255,255,255,.35)",fontSize:12,marginBottom:28}}>Pro přístup zadej 15znakové heslo</p>
      <input
        type="password"
        value={pin}
        onChange={e=>setPin(e.target.value)}
        onKeyDown={e=>e.key==="Enter"&&pokus()}
        placeholder="••••••••••••••••"
        autoFocus
        style={{width:"100%",textAlign:"center",fontSize:20,letterSpacing:6,padding:"14px",borderRadius:12,border:`2px solid ${chyba?"#e05555":"rgba(255,255,255,.2)"}`,outline:"none",boxSizing:"border-box",marginBottom:8,background:"rgba(255,255,255,.08)",color:"#fff",transition:"border-color .2s"}}
      />
      {chyba&&<div style={{color:"#e05555",fontSize:12,marginBottom:8}}>Nesprávné heslo{pokusů>2?" — zkontroluj Caps Lock":""}</div>}
      <button onClick={pokus} style={{background:"#4f7ef0",color:"#fff",border:"none",borderRadius:12,padding:"13px",width:"100%",fontSize:15,fontWeight:700,cursor:"pointer",marginTop:4,transition:"opacity .2s"}}
        onMouseEnter={e=>e.currentTarget.style.opacity=".85"}
        onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
        Přihlásit se
      </button>
    </div>
  </div>;
}

export default function App() {
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
        {modul==="finance"  && <FinancePinGate/>}
        {modul==="cashflow" && <CashflowPinGate/>}
        {modul==="dum"      && <DumTab/>}
        {modul==="auta"     && <AutaTab/>}
        {modul==="poznamky" && <PoznamkyTab/>}
        {modul==="projekty" && <ProjektyTab/>}
        {modul==="alimenty" && <AlimentyTab/>}
        {modul==="kalendar" && <KalendarTab/>}
        {modul==="zvirata"  && <ZvirataTab/>}
        {modul==="dokumenty"&& <DokumentyTab/>}
      </div>
    </div>;
  }

  return <AppPinGate><div style={{minHeight:"100vh",background:C.bg,fontFamily:"'Inter','Segoe UI',sans-serif",color:C.text}}>
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
          <OdpocetWidget/>
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
  </div></AppPinGate>;
}
