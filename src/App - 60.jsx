import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";

// ── Konfigurace aplikace ──────────────────────────────────────────────────────
const APP_NAME = "Domov";  // ← změň zde pro jiné rodiny
const APP_EMOJI = "🏡";
const SUPA_URL = import.meta.env.VITE_SUPA_URL;
const SUPA_KEY = import.meta.env.VITE_SUPA_KEY;
const sb = createClient(SUPA_URL, SUPA_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

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
  { id:"deti",     label:"Děti",     emoji:"👶" },
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
const DITE_EMOJIS = ["👦","👧","🧒","👶","🧑","👱","🧒‍♀️","👧‍🦱"];
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
function Modal({title,onClose,children,width=460}){return <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.8)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200}} onClick={onClose}><div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:28,width,maxWidth:"95vw",maxHeight:"92vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}><div style={{color:C.text,fontWeight:800,fontSize:18}}>{title}</div><button onClick={onClose} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:22}}>✕</button></div>{children}</div></div>;}
function EmptyState({emoji,text,action,onAction}){return <div style={{textAlign:"center",padding:"60px 0",color:C.dim}}><div style={{fontSize:48,marginBottom:12}}>{emoji}</div><div style={{fontSize:14,marginBottom:16}}>{text}</div>{action&&<button onClick={onAction} style={btnC()}>{action}</button>}</div>;}
function StatCard({label,val,color=C.accent}){return <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:"14px 16px",textAlign:"center"}}><div style={{fontSize:22,fontWeight:800,color}}>{val}</div><div style={{color:C.muted,fontSize:11,fontWeight:700,letterSpacing:.5,textTransform:"uppercase",marginTop:2}}>{label}</div></div>;}

// ══════════════════════════════════════════════════════════════════════════════
// DĚTI
// ══════════════════════════════════════════════════════════════════════════════
function DiteModal({dite,onClose,onSaved}){
  const isNew=!dite;
  const [f,setF]=useState({jmeno:dite?.jmeno||"",narozen:dite?.narozen||"",pohlavi:dite?.pohlavi||"chlapec",skola:dite?.skola||"",trida:dite?.trida||"",poznamka:dite?.poznamka||"",barva:dite?.barva||DITE_BARVY[0],emoji:dite?.emoji||DITE_EMOJIS[0]});
  const [saving,setSaving]=useState(false);
  const set=k=>e=>setF(p=>({...p,[k]:e.target.value}));
  const uloz=async()=>{if(!f.jmeno.trim())return;setSaving(true);if(isNew)await sb.from("deti").insert(f);else await sb.from("deti").update(f).eq("id",dite.id);setSaving(false);onSaved();};
  return <Modal title={isNew?"Přidat dítě":"Upravit dítě"} onClose={onClose}>
    <Field label="Jméno"><input style={inp} value={f.jmeno} onChange={set("jmeno")} autoFocus onKeyDown={e=>e.key==="Enter"&&uloz()}/></Field>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
      <Field label="Datum narození"><input style={inp} type="date" value={f.narozen} onChange={set("narozen")}/></Field>
      <Field label="Pohlaví"><select style={inp} value={f.pohlavi} onChange={set("pohlavi")}><option value="chlapec">Chlapec</option><option value="divka">Dívka</option></select></Field>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
      <Field label="Škola / školka"><input style={inp} value={f.skola} onChange={set("skola")} placeholder="ZŠ Hostice"/></Field>
      <Field label="Třída / skupina"><input style={inp} value={f.trida} onChange={set("trida")} placeholder="3.B"/></Field>
    </div>
    <Field label="Emoji"><div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{DITE_EMOJIS.map(e=><span key={e} onClick={()=>setF(p=>({...p,emoji:e}))} style={{fontSize:24,cursor:"pointer",padding:4,borderRadius:8,background:f.emoji===e?C.accentS:"transparent"}}>{e}</span>)}</div></Field>
    <Field label="Barva"><div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{DITE_BARVY.map(b=><div key={b} onClick={()=>setF(p=>({...p,barva:b}))} style={{width:26,height:26,borderRadius:"50%",background:b,cursor:"pointer",border:f.barva===b?"3px solid #1a1d2e":"3px solid transparent"}}/>)}</div></Field>
    <Field label="Poznámka"><textarea style={{...inp,resize:"vertical",minHeight:60}} value={f.poznamka} onChange={set("poznamka")}/></Field>
    <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:6}}><button onClick={onClose} style={btnC(C.muted,true)}>Zrušit</button><button onClick={uloz} disabled={saving} style={btnC()}>{saving?"Ukládám…":"Uložit"}</button></div>
  </Modal>;
}

function DetiTab(){
  const {data:deti,loading,reload}=useData(()=>sb.from("deti").select("*").order("narozen"));
  const [modal,setModal]=useState(null);
  const smaz=async(d)=>{if(!confirm(`Smazat ${d.jmeno}?`))return;await sb.from("deti").delete().eq("id",d.id);reload();};
  if(loading)return <Spinner/>;
  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
      <div style={{color:C.text,fontWeight:800,fontSize:17}}>👶 Děti <span style={{color:C.muted,fontWeight:400,fontSize:14}}>({(deti||[]).length})</span></div>
      <button onClick={()=>setModal("new")} style={btnC()}>+ Přidat dítě</button>
    </div>
    {(deti||[]).length===0&&<EmptyState emoji="👶" text="Zatím žádné děti" action="Přidat první dítě" onAction={()=>setModal("new")}/>}
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:14}}>
      {(deti||[]).map(d=>(
        <div key={d.id} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,padding:18,borderLeft:`4px solid ${d.barva||C.accent}`}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
            <div style={{width:44,height:44,borderRadius:11,background:`${d.barva||C.accent}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>{d.emoji||"👦"}</div>
            <div><div style={{color:C.text,fontWeight:800,fontSize:16}}>{d.jmeno}</div><div style={{color:C.muted,fontSize:12}}>{vekText(d.narozen)}{d.narozen&&` · nar. ${new Date(d.narozen).toLocaleDateString("cs-CZ")}`}</div></div>
          </div>
          {(d.skola||d.trida)&&<div style={{color:C.muted,fontSize:12,marginBottom:6}}>📚 {[d.skola,d.trida].filter(Boolean).join(" · ")}</div>}
          {d.poznamka&&<div style={{color:C.dim,fontSize:12,marginBottom:10,fontStyle:"italic"}}>{d.poznamka}</div>}
          <div style={{display:"flex",gap:6}}>
            <button onClick={()=>setModal(d)} style={{...btnC(C.muted,true),padding:"4px 10px",fontSize:12}}>✎ Upravit</button>
            <button onClick={()=>smaz(d)} style={{...btnC(C.red,true),padding:"4px 10px",fontSize:12}}>✕</button>
          </div>
        </div>
      ))}
    </div>
    {modal==="new"&&<DiteModal onClose={()=>setModal(null)} onSaved={()=>{setModal(null);reload();}}/>}
    {modal&&modal!=="new"&&<DiteModal dite={modal} onClose={()=>setModal(null)} onSaved={()=>{setModal(null);reload();}}/>}
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
  const [modal,setModal]=useState(null);const [filtrKat,setFiltrKat]=useState(null);
  const smaz=async(p)=>{if(!confirm(`Smazat "${p.nazev}"?`))return;await sb.from("sklad_polozky").delete().eq("id",p.id);reload();};
  const zmen=async(p,d)=>{const n=+(p.pocet)+d;if(n<0)return;await sb.from("sklad_polozky").update({pocet:n}).eq("id",p.id);reload();};
  const filtered=(polozky||[]).filter(p=>!filtrKat||p.kategorie_id===filtrKat);
  const nizke=filtered.filter(p=>+p.minimum>0&&+p.pocet<=+p.minimum);
  if(loading)return <Spinner/>;
  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
      <div style={{color:C.text,fontWeight:800,fontSize:17}}>📦 Sklad</div>
      <button onClick={()=>setModal("new")} style={btnC()}>+ Přidat položku</button>
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
function FinanceModal({kats,onClose,onSaved}){
  const {data:deti}=useData(()=>sb.from("deti").select("id,jmeno").order("jmeno"));
  const [f,setF]=useState({castka:"",typ:"vydaj",popis:"",datum:new Date().toISOString().slice(0,10),kategorie_id:kats.find(k=>k.typ==="vydaj")?.id||null,dite_id:""});
  const [saving,setSaving]=useState(false);const set=k=>e=>setF(p=>({...p,[k]:e.target.value}));
  const uloz=async()=>{if(!f.castka)return;setSaving(true);await sb.from("finance_zaznamy").insert({...f,castka:+f.castka,dite_id:f.dite_id||null});setSaving(false);onSaved();};
  const filtKats=(kats||[]).filter(k=>k.typ===f.typ);
  return <Modal title="Nový finanční záznam" onClose={onClose}>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
      <Field label="Typ"><select style={inp} value={f.typ} onChange={e=>setF(p=>({...p,typ:e.target.value,kategorie_id:kats.find(k=>k.typ===e.target.value)?.id||null}))}><option value="vydaj">💸 Výdaj</option><option value="prijem">💵 Příjem</option></select></Field>
      <Field label="Částka (Kč)"><input style={inp} type="number" value={f.castka} onChange={set("castka")} autoFocus placeholder="0"/></Field>
    </div>
    <Field label="Kategorie"><select style={inp} value={f.kategorie_id||""} onChange={set("kategorie_id")}>{filtKats.map(k=><option key={k.id} value={k.id}>{k.emoji} {k.nazev}</option>)}</select></Field>
    <Field label="Popis"><input style={inp} value={f.popis} onChange={set("popis")} placeholder="Volitelný popis…"/></Field>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
      <Field label="Datum"><input style={inp} type="date" value={f.datum} onChange={set("datum")}/></Field>
      <Field label="Dítě (volitelné)"><select style={inp} value={f.dite_id} onChange={set("dite_id")}><option value="">— žádné —</option>{(deti||[]).map(d=><option key={d.id} value={d.id}>{d.jmeno}</option>)}</select></Field>
    </div>
    <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:6}}><button onClick={onClose} style={btnC(C.muted,true)}>Zrušit</button><button onClick={uloz} disabled={saving||!f.castka} style={btnC()}>{saving?"…":"Uložit"}</button></div>
  </Modal>;
}

function FinanceTab(){
  const {data:kats}=useData(()=>sb.from("finance_kategorie").select("*").order("nazev"));
  const {data:zaznamy,loading,reload}=useData(()=>sb.from("finance_zaznamy").select("*,finance_kategorie(nazev,emoji),deti(jmeno)").order("datum",{ascending:false}).limit(200));
  const [modal,setModal]=useState(false);
  const [mesic,setMesic]=useState(new Date().toISOString().slice(0,7));
  const filtr=(zaznamy||[]).filter(z=>z.datum?.startsWith(mesic));
  const vydaje=filtr.filter(z=>z.typ==="vydaj").reduce((a,z)=>a+(+z.castka),0);
  const prijmy=filtr.filter(z=>z.typ==="prijem").reduce((a,z)=>a+(+z.castka),0);
  const smaz=async(z)=>{if(!confirm("Smazat záznam?"))return;await sb.from("finance_zaznamy").delete().eq("id",z.id);reload();};
  if(loading)return <Spinner/>;
  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
      <div style={{color:C.text,fontWeight:800,fontSize:17}}>💰 Finance</div>
      <button onClick={()=>setModal(true)} style={btnC()}>+ Přidat záznam</button>
    </div>
    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}><input type="month" value={mesic} onChange={e=>setMesic(e.target.value)} style={{...inp,width:"auto"}}/></div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:20}}>
      <StatCard label="Výdaje" val={fmt(vydaje)} color={C.red}/>
      <StatCard label="Příjmy" val={fmt(prijmy)} color={C.green}/>
      <StatCard label="Bilance" val={fmt(prijmy-vydaje)} color={prijmy-vydaje>=0?C.green:C.red}/>
    </div>
    {filtr.length===0&&<EmptyState emoji="💰" text="Žádné záznamy v tomto měsíci" action="Přidat první záznam" onAction={()=>setModal(true)}/>}
    <div style={{display:"flex",flexDirection:"column",gap:6}}>
      {filtr.map(z=>(
        <div key={z.id} style={{display:"flex",alignItems:"center",gap:10,background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 14px"}}>
          <span style={{fontSize:18}}>{z.finance_kategorie?.emoji||"💰"}</span>
          <div style={{flex:1}}><div style={{fontWeight:600,fontSize:14,color:C.text}}>{z.popis||z.finance_kategorie?.nazev||"—"}</div><div style={{color:C.dim,fontSize:12}}>{new Date(z.datum).toLocaleDateString("cs-CZ")}{z.deti?.jmeno&&` · 👦 ${z.deti.jmeno}`}</div></div>
          <span style={{fontWeight:800,fontSize:15,color:z.typ==="vydaj"?C.red:C.green}}>{z.typ==="vydaj"?"−":"+"}{fmt(z.castka)}</span>
          <button onClick={()=>smaz(z)} style={{...btnC(C.red,true),padding:"3px 8px",fontSize:12}}>✕</button>
        </div>
      ))}
    </div>
    {modal&&<FinanceModal kats={kats||[]} onClose={()=>setModal(false)} onSaved={()=>{setModal(false);reload();}}/>}
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
  const [modal,setModal]=useState(null);
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
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                <span style={{fontWeight:700,fontSize:14,color:C.text,flex:1}}>{o.nazev}</span>
                <Tag color={PRIORITA[o.priorita]?.color||C.dim}>{PRIORITA[o.priorita]?.label}</Tag>
                {o.castka&&<Tag color={C.muted}>{fmt(o.castka)}</Tag>}
              </div>
              {o.popis&&<div style={{color:C.dim,fontSize:12,marginBottom:6}}>{o.popis}</div>}
              {o.datum_plan&&<div style={{color:C.muted,fontSize:12,marginBottom:8}}>📅 {new Date(o.datum_plan).toLocaleDateString("cs-CZ")}{o.datum_hotovo&&` · ✓ ${new Date(o.datum_hotovo).toLocaleDateString("cs-CZ")}`}</div>}
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {o.stav==="plan"&&<button onClick={()=>zmenStav(o,"probiha")} style={{...btnC(C.orange),padding:"4px 10px",fontSize:12}}>▶ Zahájit</button>}
                {o.stav!=="hotovo"&&<button onClick={()=>zmenStav(o,"hotovo")} style={{...btnC(C.green),padding:"4px 10px",fontSize:12}}>✓ Hotovo</button>}
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
  </div>;
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
  const {data:projekty,loading,reload}=useData(()=>sb.from("projekty").select("*").order("stav").order("priorita",{ascending:false}));
  const [modal,setModal]=useState(null);
  const [aktivni,setAktivni]=useState(null);

  const smaz=async(p)=>{if(!confirm(`Smazat projekt "${p.nazev}"?`))return;await sb.from("projekty").delete().eq("id",p.id);reload();};
  const zmenStav=async(p,stav)=>{await sb.from("projekty").update({stav}).eq("id",p.id);reload();};

  if(loading)return <Spinner/>;

  const skupiny=Object.keys(STAV_PROJEKT).map(stav=>({stav,items:(projekty||[]).filter(p=>p.stav===stav)})).filter(g=>g.items.length>0);

  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,flexWrap:"wrap",gap:8}}>
      <div style={{color:C.text,fontWeight:800,fontSize:17}}>🏗 Projekty</div>
      <button onClick={()=>setModal("new")} style={btnC()}>+ Nový projekt</button>
    </div>
    {(projekty||[]).length===0&&<EmptyState emoji="🏗" text="Žádné projekty" action="+ Přidat projekt" onAction={()=>setModal("new")}/>}
    {skupiny.map(({stav,items})=>(
      <div key={stav} style={{marginBottom:24}}>
        <div style={{fontSize:12,fontWeight:700,letterSpacing:.7,textTransform:"uppercase",color:STAV_PROJEKT[stav].color,marginBottom:10}}>{STAV_PROJEKT[stav].label} ({items.length})</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:12}}>
          {items.map(p=>(
            <div key={p.id} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,overflow:"hidden",cursor:"pointer",transition:"box-shadow .15s",boxShadow:aktivni===p.id?"0 4px 20px rgba(0,0,0,.1)":"none"}}
              onClick={()=>setAktivni(aktivni===p.id?null:p.id)}>
              <div style={{background:p.barva||C.accent,padding:"16px 16px 12px",position:"relative"}}>
                <div style={{fontSize:28,marginBottom:4}}>{p.emoji}</div>
                <div style={{fontWeight:800,fontSize:16,color:"#fff"}}>{p.nazev}</div>
                <div style={{position:"absolute",top:12,right:12}}><Tag color="#ffffff44">{PRIORITA[p.priorita]?.label}</Tag></div>
              </div>
              <div style={{padding:"12px 16px"}}>
                {p.popis&&<div style={{color:C.muted,fontSize:13,marginBottom:8}}>{p.popis}</div>}
                <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
                  <Tag color={STAV_PROJEKT[p.stav].color}>{STAV_PROJEKT[p.stav].label}</Tag>
                  {p.rozpocet&&<Tag color={C.muted}>{fmt(p.rozpocet)}</Tag>}
                </div>
                {aktivni===p.id&&<>
                  <div style={{borderTop:`1px solid ${C.border}`,marginTop:12,paddingTop:12}}>
                    <ProjektUkoly projektId={p.id}/>
                  </div>
                  <div style={{display:"flex",gap:6,marginTop:10,flexWrap:"wrap"}} onClick={e=>e.stopPropagation()}>
                    {p.stav==="plan"&&<button onClick={()=>zmenStav(p,"probiha")} style={{...btnC(C.orange),padding:"4px 10px",fontSize:12}}>▶ Zahájit</button>}
                    {p.stav==="probiha"&&<button onClick={()=>zmenStav(p,"hotovo")} style={{...btnC(C.green),padding:"4px 10px",fontSize:12}}>✓ Hotovo</button>}
                    {p.stav==="probiha"&&<button onClick={()=>zmenStav(p,"pozastaveno")} style={{...btnC(C.muted),padding:"4px 10px",fontSize:12}}>⏸ Pozastavit</button>}
                    {p.stav==="pozastaveno"&&<button onClick={()=>zmenStav(p,"probiha")} style={{...btnC(C.orange),padding:"4px 10px",fontSize:12}}>▶ Obnovit</button>}
                    <button onClick={e=>{e.stopPropagation();setModal(p);}} style={{...btnC(C.muted,true),padding:"4px 10px",fontSize:12}}>✎ Upravit</button>
                    <button onClick={e=>{e.stopPropagation();smaz(p);}} style={{...btnC(C.red,true),padding:"4px 10px",fontSize:12}}>✕</button>
                  </div>
                </>}
              </div>
            </div>
          ))}
        </div>
      </div>
    ))}
    {modal&&<ProjektModal projekt={modal==="new"?null:modal} onClose={()=>setModal(null)} onSaved={()=>{setModal(null);reload();}}/>}
  </div>;
}

function ProjektUkoly({projektId}){
  const {data:ukoly,reload}=useData(()=>sb.from("projekt_ukoly").select("*").eq("projekt_id",projektId).order("poradi"),[projektId]);
  const [novy,setNovy]=useState("");
  const toggle=async(u)=>{await sb.from("projekt_ukoly").update({splneno:!u.splneno}).eq("id",u.id);reload();};
  const pridej=async()=>{const n=novy.trim();if(!n)return;await sb.from("projekt_ukoly").insert({projekt_id:projektId,nazev:n,poradi:(ukoly||[]).length});setNovy("");reload();};
  const smaz=async(u)=>{await sb.from("projekt_ukoly").delete().eq("id",u.id);reload();};
  const hotovo=(ukoly||[]).filter(u=>u.splneno).length;
  return <div>
    {(ukoly||[]).length>0&&<div style={{fontSize:11,color:C.muted,marginBottom:8}}>Úkoly: {hotovo}/{(ukoly||[]).length}</div>}
    <div style={{display:"flex",flexDirection:"column",gap:4,marginBottom:8}}>
      {(ukoly||[]).map(u=>(
        <div key={u.id} style={{display:"flex",alignItems:"center",gap:8}}>
          <div onClick={()=>toggle(u)} style={{width:18,height:18,borderRadius:4,border:`2px solid ${u.splneno?C.green:C.border}`,background:u.splneno?C.green:"transparent",cursor:"pointer",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:11}}>{u.splneno?"✓":""}</div>
          <span style={{flex:1,fontSize:12,color:u.splneno?C.dim:C.text,textDecoration:u.splneno?"line-through":"none"}}>{u.nazev}</span>
          <button onClick={()=>smaz(u)} style={{background:"none",border:"none",cursor:"pointer",color:C.dim,fontSize:11,padding:"1px 4px"}} onMouseEnter={e=>e.currentTarget.style.color=C.red} onMouseLeave={e=>e.currentTarget.style.color=C.dim}>✕</button>
        </div>
      ))}
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
    <Field label="Emoji"><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{PROJ_EMOJIS.map(e=><span key={e} onClick={()=>setF(p=>({...p,emoji:e}))} style={{fontSize:22,cursor:"pointer",padding:4,borderRadius:6,background:f.emoji===e?C.accentS:"transparent"}}>{e}</span>)}</div></Field>
    <Field label="Název"><input style={inp} value={f.nazev} onChange={set("nazev")} autoFocus/></Field>
    <Field label="Popis"><textarea style={{...inp,resize:"vertical",minHeight:60}} value={f.popis} onChange={set("popis")}/></Field>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
      <Field label="Stav"><select style={inp} value={f.stav} onChange={set("stav")}>{Object.entries(STAV_PROJEKT).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</select></Field>
      <Field label="Priorita"><select style={inp} value={f.priorita} onChange={set("priorita")}>{Object.entries(PRIORITA).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</select></Field>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
      <Field label="Barva"><input style={inp} type="color" value={f.barva} onChange={set("barva")}/></Field>
      <Field label="Rozpočet (Kč)"><input style={inp} type="number" value={f.rozpocet} onChange={set("rozpocet")} placeholder="0"/></Field>
    </div>
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
  const [zalozka,setZalozka]=useState("prehled");
  const {data:sazby,reload:reloadSazby}=useData(()=>sb.from("alimenty_sazby").select("*").order("platnost_od"));
  const {data:platby,reload:reloadPlatby}=useData(()=>sb.from("alimenty_platby").select("*").order("datum",{ascending:true}));
  const {data:mimoradne,reload:reloadMim}=useData(()=>sb.from("alimenty_mimoradne").select("*").order("datum",{ascending:true}));
  const {data:nastaveni,reload:reloadNast}=useData(()=>sb.from("alimenty_nastaveni").select("*"));

  const nast=Object.fromEntries((nastaveni||[]).map(r=>[r.klic,r.hodnota]));
  const dluhCelkem=parseInt(nast.dluh_celkem||"53250");
  const dluhSplaceno=parseInt(nast.dluh_splaceno||"0");
  const dluhZbyva=Math.max(0,dluhCelkem-dluhSplaceno);
  const splátkyAktivni=nast.dluh_splatky_aktivni==="true";
  const splatkaM=parseInt(nast.dluh_splatka_mesicni||"2500");

  // Sazba pro měsíc (součet Sylvestr+John, otec→matce)
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
    return total+(splátkyAktivni?splatkaM:0);
  };

  // Měsíce od dubna 2026 do 12 měsíců dopředu (pro select), aktuální = do teď (pro upozornění)
  const mesice=[];
  const mesiceAktualni=[]; // jen do teď — pro upozornění chybějících plateb
  const mStart=new Date(2026,3,1);
  const mNow=new Date();
  const mKonec=new Date(mNow.getFullYear(),mNow.getMonth()+13,1); // 12 měsíců dopředu
  const mNowStr=`${mNow.getFullYear()}-${String(mNow.getMonth()+1).padStart(2,"0")}`;
  for(let d=new Date(mStart);d<mKonec;d.setMonth(d.getMonth()+1)){
    const str=new Date(d).toISOString().slice(0,7);
    mesice.push(str);
    if(str<=mNowStr)mesiceAktualni.push(str);
  }

  const reloadAll=()=>{reloadPlatby();reloadMim();reloadNast();};

  // ── Sdílený modal Přidat platbu ──
  const [pridatModal,setPridatModal]=useState(false);
  const pridatForm0={typ:"alimenty",kdo_plati:"otec",komu:"matce",komu_text:"",mesic:mesice[mesice.length-1]||"",datum:"",castka:"",poznamka:""};
  const [pf,setPf]=useState(pridatForm0);

  const napoveda=()=>{
    if(pf.typ==="alimenty"&&pf.kdo_plati==="otec"&&pf.komu==="matce"&&pf.mesic){
      const s=getSazbaProMesic(pf.mesic);
      return s?`Dle rozsudku: ${s.toLocaleString("cs")} Kč${splátkyAktivni?" (vč. "+splatkaM.toLocaleString("cs")+" Kč splátka dluhu)":""}`:null;
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
      {/* Velké dlaždice pro přidání */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:24}}>
        <div onClick={()=>{setPf({...pridatForm0,typ:"alimenty"});setPridatModal(true);}}
          style={{background:"#5b8ef0",border:"none",borderRadius:16,padding:"24px 20px",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:8,transition:"all .2s",minHeight:100,boxShadow:"0 4px 14px rgba(91,142,240,.35)"}}>
          <div style={{fontSize:28}}>💳</div>
          <div style={{fontWeight:800,fontSize:15,color:"#fff"}}>+ Přidat platbu alimentů</div>
          <div style={{fontSize:12,color:"rgba(255,255,255,.8)"}}>Zaznamenat měsíční platbu</div>
        </div>
        <div onClick={()=>{setPf({...pridatForm0,typ:"mimoradne"});setPridatModal(true);}}
          style={{background:"#e8922a",border:"none",borderRadius:16,padding:"24px 20px",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:8,transition:"all .2s",minHeight:100,boxShadow:"0 4px 14px rgba(232,146,42,.35)"}}>
          <div style={{fontSize:28}}>📋</div>
          <div style={{fontWeight:800,fontSize:15,color:"#fff"}}>+ Přidat mimořádný výdaj</div>
          <div style={{fontSize:12,color:"rgba(255,255,255,.8)"}}>Školka, lékař, jiné náklady</div>
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
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr style={{background:C.bg}}>
            {["Měsíc","Kdo platí","Komu","Má být","Zaplaceno","Rozdíl","Datum platby","Poznámka",""].map(h=><th key={h} style={{padding:"9px 12px",textAlign:"left",fontSize:11,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:.5,whiteSpace:"nowrap"}}>{h}</th>)}
          </tr></thead>
          <tbody>
            {alimenty.length===0&&<tr><td colSpan={9} style={{padding:24,textAlign:"center",color:C.dim,fontSize:13}}>Zatím žádné platby</td></tr>}
            {alimenty.map((p,i)=>{
              const maByt=p.kdo_plati==="otec"&&p.komu==="matce"?getSazbaProMesic(p.mesic||""):null;
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
              <td colSpan={4} style={{padding:"10px 12px",fontWeight:700,fontSize:13}}>CELKEM</td>
              <td style={{padding:"10px 12px",fontWeight:800,fontSize:14,color:C.accent}}>{alimenty.reduce((a,p)=>a+p.castka,0).toLocaleString("cs")} Kč</td>
              <td colSpan={4}/>
            </tr>
          </tfoot>}
        </table>
      </div>

      {/* Tabulka mimořádných výdajů */}
      <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,overflow:"hidden"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 18px",borderBottom:`1px solid ${C.border}`}}>
          <span style={{fontWeight:800,fontSize:15,color:C.text}}>Mimořádné výdaje</span>
        </div>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
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

      {/* Modal editace alimentu */}
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
    </div>;
  };


  // ── ZÁLOŽKA: VYÚČTOVÁNÍ ──
  const VyuctovaniView=()=>{
    const matkaBlue="#e8f3ff";
    const otecOrange="#fff3e0";

    const alimenty=(platby||[]).filter(p=>p.typ==="alimenty");
    const nedoplatekOtec=alimenty.filter(p=>p.kdo_plati==="otec"&&p.komu==="matce").reduce((acc,p)=>{
      const maByt=getSazbaProMesic(p.mesic||"");
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
        ["","Měsíční splátka:",splátkyAktivni?`${splatkaM.toLocaleString("cs")} Kč`:"Neaktivní"],
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
          const maByt=p.kdo_plati==="otec"&&p.komu==="matce"?getSazbaProMesic(p.mesic||""):null;
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
          {l:"Splátka/měsíc",v:splátkyAktivni?`${splatkaM.toLocaleString("cs")} Kč`:"Neaktivní",c:splátkyAktivni?C.blue:C.dim},
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
        {!splátkyAktivni&&<div style={{marginTop:10,fontSize:12,color:C.orange,fontWeight:600}}>⚠ Splácení zatím neaktivní — aktivujte v Nastavení</div>}
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
        {!splátkyAktivni
          ?<div style={{background:C.orangeS,border:`1px solid ${C.orange}`,borderRadius:10,padding:"14px 16px"}}>
            <div style={{fontSize:13,fontWeight:700,color:C.orange,marginBottom:10}}>⚠ Splácení zatím neaktivní</div>
            <div style={{fontSize:12,color:C.muted,marginBottom:12}}>Aktivujte jakmile rozsudek nabyde právní moci.</div>
            <div style={{display:"flex",gap:10,alignItems:"center"}}>
              <input style={{...inp,flex:1}} type="date" value={aktivaceForm} onChange={e=>setAktivaceForm(e.target.value)}/>
              <button onClick={aktivovatSplaceni} style={btnC(C.orange)}>Aktivovat</button>
            </div>
          </div>
          :<div style={{background:C.greenS,border:`1px solid ${C.green}`,borderRadius:10,padding:"12px 16px",fontSize:13,fontWeight:700,color:C.green}}>✓ Splácení aktivní — {splatkaM.toLocaleString("cs")} Kč/měsíc</div>}
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

  const tabs=[{id:"prehled",l:"📅 Přehled plateb"},{id:"vyuctovani",l:"📊 Vyúčtování"},{id:"nastaveni",l:"⚙️ Nastavení"}];

  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
      <h2 style={{margin:0,fontSize:22,fontWeight:800}}>⚖️ Alimenty — Šíma</h2>
    </div>
    <div style={{display:"flex",gap:4,marginBottom:24,borderBottom:`2px solid ${C.border}`}}>
      {tabs.map(t=><button key={t.id} onClick={()=>setZalozka(t.id)} style={{padding:"9px 18px",border:"none",background:"none",cursor:"pointer",fontSize:13,fontWeight:700,color:zalozka===t.id?C.accent:C.muted,borderBottom:zalozka===t.id?`2px solid ${C.accent}`:"2px solid transparent",marginBottom:-2,transition:"all .15s"}}>{t.l}</button>)}
    </div>
    {zalozka==="prehled"&&<PrehledView/>}
    {zalozka==="vyuctovani"&&<VyuctovaniView/>}
    {zalozka==="nastaveni"&&<NastaveniView/>}
    {pridatModal&&<PridatModal/>}
  </div>;
}

const TILES=[
  {id:"deti",     emoji:"👶", label:"Děti",      popis:"Profily a info",         barva:"#4f7ef0"},
  {id:"obleceni", emoji:"👕", label:"Oblečení",  popis:"Sklady a velikosti",     barva:"#3b6fd4"},
  {id:"boty",     emoji:"👟", label:"Boty",      popis:"Páry a umístění",        barva:"#6b3fa0"},
  {id:"sklad",    emoji:"📦", label:"Sklad",     popis:"Zásoby doma",            barva:"#c87000"},
  {id:"ukoly",    emoji:"🔁", label:"Úkoly",     popis:"Pravidelná údržba",      barva:"#1a6fa8"},
  {id:"spotreba", emoji:"💧", label:"Spotřeba",  popis:"Voda, elektřina, plyn",  barva:"#1a7a4a"},
  {id:"finance",  emoji:"💰", label:"Finance",   popis:"Výdaje a příjmy",        barva:"#b8860b"},
  {id:"dum",      emoji:"🔧", label:"Dům",       popis:"Opravy a plánování",     barva:"#8B3A1A"},
  {id:"poznamky", emoji:"📝", label:"Poznámky",  popis:"Nápady a todolist",      barva:"#2ed8c8"},
  {id:"projekty", emoji:"🏗",  label:"Projekty",  popis:"Realizované projekty",   barva:"#e05555"},
  {id:"alimenty", emoji:"⚖️",  label:"Alimenty",  popis:"Šíma — Sylvestr & John", barva:"#c0392b"},
];

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
      <div style={{maxWidth:1100,margin:"0 auto",padding:"28px 24px 60px"}}>
        {modul==="deti"     && <DetiTab/>}
        {modul==="obleceni" && <ObleceniTab/>}
        {modul==="boty"     && <BotyTab/>}
        {modul==="sklad"    && <SkladTab/>}
        {modul==="ukoly"    && <UkolyTab/>}
        {modul==="spotreba" && <SpotrebaTab/>}
        {modul==="finance"  && <FinanceTab/>}
        {modul==="dum"      && <DumTab/>}
        {modul==="poznamky" && <PoznamkyTab/>}
        {modul==="projekty" && <ProjektyTab/>}
        {modul==="alimenty" && <AlimentyTab/>}
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
