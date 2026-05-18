import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";

const SUPA_URL = import.meta.env.VITE_SUPA_URL;
const SUPA_KEY = import.meta.env.VITE_SUPA_KEY;
const sb = createClient(SUPA_URL, SUPA_KEY);

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
function KontejnerModalObl({velikostId,kontejner,onClose,onSaved}){
  const isNew=!kontejner;
  const [f,setF]=useState({nazev:kontejner?.nazev||"",umisteni:kontejner?.umisteni||"",typ:kontejner?.typ||"box"});
  const [saving,setSaving]=useState(false);const set=k=>e=>setF(p=>({...p,[k]:e.target.value}));
  const uloz=async()=>{if(!f.nazev.trim())return;setSaving(true);if(isNew)await sb.from("vel_kontejnery").insert({...f,velikost_id:velikostId});else await sb.from("vel_kontejnery").update(f).eq("id",kontejner.id);setSaving(false);onSaved();};
  return <Modal title={isNew?"Nový kontejner":"Upravit kontejner"} onClose={onClose} width={380}>
    <Field label="Název"><input style={inp} value={f.nazev} onChange={set("nazev")} autoFocus onKeyDown={e=>e.key==="Enter"&&uloz()}/></Field>
    <Field label="Umístění"><input style={inp} value={f.umisteni} onChange={set("umisteni")} placeholder="Sklep, půda…"/></Field>
    <Field label="Typ"><select style={inp} value={f.typ} onChange={set("typ")}>{Object.entries(STORAGE_TYPES).map(([k,v])=><option key={k} value={k}>{v.icon} {v.label}</option>)}</select></Field>
    <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:6}}><button onClick={onClose} style={btnC(C.muted,true)}>Zrušit</button><button onClick={uloz} disabled={saving} style={btnC()}>{saving?"…":"Uložit"}</button></div>
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

function ObleceniTab(){
  // Načteme VŠECHNY velikosti, kontejnery a položky najednou
  const {data:velikosti,loading:lv,reload:reloadVel}=useData(()=>sb.from("vel_velikosti").select("*").order("id").then(({data,error})=>({data:data?.sort((a,b)=>parseFloat(a.id)-parseFloat(b.id)||a.id.localeCompare(b.id)),error})));
  const {data:vsechnyKonts,loading:lk,reload:reloadKonts}=useData(()=>sb.from("vel_kontejnery").select("*").order("nazev"));
  const {data:vsechnyPol,loading:lp,reload:reloadPol}=useData(()=>sb.from("vel_polozky").select("*").order("nazev"));
  const [novaMod,setNovaMod]=useState(false);
  const [novyKont,setNovyKont]=useState(false);
  const [editKont,setEditKont]=useState(null);
  const [otevreneKonty,setOtevreneKonty]=useState({});
  const [pridatM,setPridatM]=useState(false);
  const [vybratM,setVybratM]=useState(false);
  const [newVelId,setNewVelId]=useState("");
  const reloadAll=()=>{reloadVel();reloadKonts();reloadPol();};

  const loading=lv||lk||lp;

  // Sestavit tabulku: druhy × velikosti
  // Pro každou buňku (druh, velikost) chceme: celkem ks + detail po kontejnerech
  const allDruhy=[...new Set((vsechnyPol||[]).map(p=>p.nazev))].sort((a,b)=>a.localeCompare(b,"cs"));

  // celkem ks pro celý přehled
  const celkemVse=(vsechnyPol||[]).reduce((a,p)=>a+p.pocet,0);

  // Export Excel — každý kontejner = jeden list
  const exportExcel=async()=>{
    const X=await import("xlsx");
    const wb=X.utils.book_new();
    (vsechnyKonts||[]).forEach(k=>{
      const st=STORAGE_TYPES[k.typ]||STORAGE_TYPES.other;
      const vel=k.velikost_id;
      const pols=(vsechnyPol||[]).filter(p=>p.kontejner_id===k.id&&p.pocet>0).sort((a,b)=>a.nazev.localeCompare(b.nazev,"cs"));
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
          return (vsechnyPol||[]).filter(p=>kIds.includes(p.kontejner_id)&&p.nazev===druh).reduce((a,p)=>a+p.pocet,0)||"";
        });
        const sum=perVel.reduce((a,v)=>a+(+v||0),0);
        return [druh,...perVel,sum||""];
      }),
      ["CELKEM",...vels.map(vid=>{
        const kIds=(vsechnyKonts||[]).filter(k=>k.velikost_id===vid).map(k=>k.id);
        return (vsechnyPol||[]).filter(p=>kIds.includes(p.kontejner_id)).reduce((a,p)=>a+p.pocet,0);
      }),celkemVse],
    ];
    const wsPrehled=X.utils.aoa_to_sheet(sumRows);
    wsPrehled["!cols"]=[{wch:28},...vels.map(()=>({wch:9})),{wch:10}];
    wsPrehled["!pageSetup"]={paperSize:9,orientation:"landscape",fitToPage:true,fitToWidth:1};
    X.utils.book_append_sheet(wb,wsPrehled,"Přehled",true);
    X.writeFile(wb,`hostice_obleceni_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  if(loading)return <Spinner/>;

  return <div>
    <style>{`.oblcell:hover{background:#e8eeff!important}`}</style>

    {/* Hlavička */}
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20,flexWrap:"wrap",gap:8}}>
      <div style={{color:C.text,fontWeight:800,fontSize:17}}>👕 Oblečení</div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        <button onClick={exportExcel} style={{...btnC(C.green,true),fontSize:12,padding:"6px 14px"}}>↓ Excel</button>
        <button onClick={()=>setPridatM(true)} style={{...btnC(C.green),fontSize:12,padding:"6px 14px"}}>+ Uložit</button>
        <button onClick={()=>setVybratM(true)} style={{...btnC(C.red),fontSize:12,padding:"6px 14px"}}>− Vybrat</button>
        <button onClick={()=>setNovyKont(true)} style={{...btnC(C.muted,true),fontSize:12,padding:"6px 14px"}}>+ Kontejner</button>
        <button onClick={()=>setNovaMod(true)} style={{...btnC(C.muted,true),fontSize:12,padding:"6px 14px"}}>+ Velikost</button>
      </div>
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
              return a+(vsechnyPol||[]).filter(p=>kIds.includes(p.kontejner_id)&&p.nazev===druh).reduce((x,p)=>x+p.pocet,0);
            },0);
            return <tr key={druh} style={{background:i%2===0?C.surface:"#fafbff"}}>
              <td style={{padding:"9px 16px",borderBottom:`1px solid ${C.border}`,color:C.text,fontWeight:500}}>{druh}</td>
              {(velikosti||[]).map(vel=>{
                const kontsVel=(vsechnyKonts||[]).filter(k=>k.velikost_id===vel.id);
                const kIds=kontsVel.map(k=>k.id);
                const pocet=(vsechnyPol||[]).filter(p=>kIds.includes(p.kontejner_id)&&p.nazev===druh).reduce((a,p)=>a+p.pocet,0);
                return <td key={vel.id}
                  style={{padding:"9px 12px",borderBottom:`1px solid ${C.border}`,borderLeft:`1px solid ${C.border}`,textAlign:"center",verticalAlign:"middle"}}>
                  {pocet ? <>
                    <div style={{fontWeight:700,color:C.accent,fontSize:14}}>{pocet}</div>
                    {kontsVel.filter(k=>{const p=(vsechnyPol||[]).find(x=>x.kontejner_id===k.id&&x.nazev===druh);return p&&p.pocet>0;}).map(k=>{
                      const p=(vsechnyPol||[]).find(x=>x.kontejner_id===k.id&&x.nazev===druh);
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
              const t=(vsechnyPol||[]).filter(p=>kIds.includes(p.kontejner_id)).reduce((a,p)=>a+p.pocet,0);
              return <td key={vel.id} style={{padding:"10px 12px",borderLeft:`1px solid ${C.border}`,textAlign:"center",fontWeight:800,color:C.accent,fontSize:14}}>{t||"—"}</td>;
            })}
            <td style={{padding:"10px 12px",borderLeft:`2px solid ${C.border}`,textAlign:"center",fontWeight:800,color:C.accent,fontSize:15}}>{celkemVse}</td>
          </tr>
        </tfoot>
      </table>
    </div>}

    {/* Seznam kontejnerů — rozbalovací */}
    {(vsechnyKonts||[]).length>0&&<div style={{marginTop:24}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
        <div style={{fontSize:13,fontWeight:700,color:C.muted,letterSpacing:.5,textTransform:"uppercase"}}>Kontejnery</div>
        <button onClick={()=>setNovyKont(true)} style={{...btnC(C.muted,true),fontSize:12,padding:"4px 10px"}}>+ Přidat</button>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {(vsechnyKonts||[]).map(k=>{
          const st=STORAGE_TYPES[k.typ]||STORAGE_TYPES.other;
          const polsK=(vsechnyPol||[]).filter(p=>p.kontejner_id===k.id).sort((a,b)=>a.nazev.localeCompare(b.nazev,"cs"));
          const pocetKs=polsK.reduce((a,p)=>a+p.pocet,0);
          const otevreny=otevreneKonty[k.id];
          return <div key={k.id} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,overflow:"hidden"}}>
            {/* Hlavička kontejneru */}
            <div onClick={()=>setOtevreneKonty(p=>({...p,[k.id]:!p[k.id]}))}
              style={{display:"flex",alignItems:"center",gap:10,padding:"12px 16px",cursor:"pointer",background:otevreny?C.accentS:C.surface,transition:"background .15s"}}>
              <span style={{fontSize:16}}>{st.icon}</span>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,fontSize:14,color:C.text}}>{k.nazev} <span style={{color:C.muted,fontWeight:400,fontSize:12}}>vel. {k.velikost_id}</span></div>
                <div style={{color:C.dim,fontSize:12}}>{[k.umisteni,st.label].filter(Boolean).join(" · ")} · {pocetKs} ks</div>
              </div>
              <div style={{display:"flex",gap:6}} onClick={e=>e.stopPropagation()}>
                <button onClick={()=>setEditKont(k)} style={{...btnC(C.muted,true),padding:"4px 9px",fontSize:12}}>✎</button>
                <button onClick={async()=>{if(!confirm(`Smazat "${k.nazev}"?`))return;await sb.from("vel_kontejnery").delete().eq("id",k.id);reloadAll();}} style={{...btnC(C.red,true),padding:"4px 9px",fontSize:12}}>✕</button>
              </div>
              <span style={{color:C.muted,fontSize:13,marginLeft:4}}>{otevreny?"▲":"▼"}</span>
            </div>

            {/* Obsah kontejneru */}
            {otevreny&&<div style={{borderTop:`1px solid ${C.border}`}}>
              {/* Položky */}
              {polsK.length===0&&<div style={{padding:"12px 16px",color:C.dim,fontSize:13}}>Prázdný kontejner</div>}
              {polsK.map((pol,i)=>(
                <div key={pol.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 16px",background:i%2===0?C.surface:"#fafbff",borderBottom:`1px solid ${C.border}`}}>
                  <span style={{flex:1,fontSize:13,color:C.text,fontWeight:500}}>{pol.nazev}</span>
                  <button onClick={async()=>{const n=pol.pocet-1;if(n<0)return;await sb.from("vel_polozky").update({pocet:n}).eq("id",pol.id);reloadAll();}} style={{...btnC(C.muted,true),padding:"3px 9px",fontSize:14,minWidth:28}}>−</button>
                  <span style={{fontSize:15,fontWeight:700,minWidth:32,textAlign:"center",color:pol.pocet===0?C.dim:C.accent}}>{pol.pocet}</span>
                  <button onClick={async()=>{await sb.from("vel_polozky").update({pocet:pol.pocet+1}).eq("id",pol.id);reloadAll();}} style={{...btnC(C.muted,true),padding:"3px 9px",fontSize:14,minWidth:28}}>+</button>
                  <button onClick={async()=>{if(!confirm(`Odebrat "${pol.nazev}"?`))return;await sb.from("vel_polozky").delete().eq("id",pol.id);reloadAll();}} style={{background:"none",border:"none",cursor:"pointer",color:C.dim,fontSize:13,padding:"3px 6px"}} onMouseEnter={e=>e.currentTarget.style.color=C.red} onMouseLeave={e=>e.currentTarget.style.color=C.dim}>✕</button>
                </div>
              ))}

              {/* Přidat položku */}
              <NovaPlozkaDokontejneru kontejnerId={k.id} existujici={polsK} onSaved={reloadAll}/>
            </div>}
          </div>;
        })}
      </div>
    </div>}

    {/* Modály */}
    {novaMod&&<Modal title="Nová velikost" onClose={()=>setNovaMod(false)} width={320}>
      <Field label="Označení" hint="Např. 74, 80, 86…"><input style={inp} value={newVelId} onChange={e=>setNewVelId(e.target.value)} autoFocus onKeyDown={async e=>{if(e.key==="Enter"&&newVelId.trim()){await sb.from("vel_velikosti").insert({id:newVelId.trim()});setNovaMod(false);setNewVelId("");reloadAll();}}}/></Field>
      <div style={{display:"flex",justifyContent:"flex-end",gap:10}}><button onClick={()=>setNovaMod(false)} style={btnC(C.muted,true)}>Zrušit</button><button onClick={async()=>{if(!newVelId.trim())return;await sb.from("vel_velikosti").insert({id:newVelId.trim()});setNovaMod(false);setNewVelId("");reloadAll();}} style={btnC()}>Přidat</button></div>
    </Modal>}
    {novyKont&&<KontejnerModalObl velikostId={(velikosti||[])[0]?.id} onClose={()=>setNovyKont(false)} onSaved={()=>{setNovyKont(false);reloadAll();}}/>}
    {editKont&&<KontejnerModalObl kontejner={editKont} onClose={()=>setEditKont(null)} onSaved={()=>{setEditKont(null);reloadAll();}}/>}
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
const TYPY_BOT = ["Tenisky","Sandály","Holínky","Přezůvky","Boty","Kozačky","Pantofle","Kopačky","Brusle","Ostatní"];
const BARVY = ["Černá","Bílá","Šedá","Modrá","Tmavě modrá","Červená","Růžová","Zelená","Žlutá","Oranžová","Hnědá","Béžová","Fialová","Vícebarevná"];

function BotyModal({bota,umisteni,deti,onClose,onSaved}){
  const isNew=!bota;
  const [f,setF]=useState({
    velikost:bota?.velikost||"",
    typ:bota?.typ||"Tenisky",
    barva1:bota?.barva1||"",
    barva2:bota?.barva2||"",
    stav:bota?.stav||"nove",
    umisteni_id:bota?.umisteni_id||umisteni[0]?.id||"",
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
  const {data:boty,loading,reload}=useData(()=>sb.from("boty").select("*,boty_umisteni(nazev),deti(jmeno,barva,emoji)").order("velikost").order("typ"));
  const {data:umisteni,reload:reloadUm}=useData(()=>sb.from("boty_umisteni").select("*").order("nazev"));
  const {data:deti}=useData(()=>sb.from("deti").select("id,jmeno,barva,emoji").order("jmeno"));
  const [modal,setModal]=useState(null);
  const [filtrUm,setFiltrUm]=useState(null);
  const [filtrStav,setFiltrStav]=useState(null);
  const [filtrDite,setFiltrDite]=useState(null);

  const smaz=async(b)=>{if(!confirm(`Smazat boty ${b.typ} vel.${b.velikost}?`))return;await sb.from("boty").delete().eq("id",b.id);reload();};

  const filtered=(boty||[])
    .filter(b=>!filtrUm||b.umisteni_id===filtrUm)
    .filter(b=>!filtrStav||b.stav===filtrStav)
    .filter(b=>!filtrDite||b.dite_id===filtrDite);

  if(loading)return <Spinner/>;

  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:8}}>
      <div style={{color:C.text,fontWeight:800,fontSize:17}}>👟 Boty <span style={{color:C.muted,fontWeight:400,fontSize:14}}>({filtered.length} párů)</span></div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        <button onClick={()=>setModal({type:"umisteni"})} style={{...btnC(C.muted,true),fontSize:12,padding:"6px 12px"}}>+ Umístění</button>
        <button onClick={()=>setModal({type:"new"})} style={{...btnC(),fontSize:12,padding:"6px 14px"}}>+ Přidat boty</button>
      </div>
    </div>

    {/* Statistiky */}
    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:16}}>
      <StatCard label="Párů celkem" val={(boty||[]).length} color={C.accent}/>
      <StatCard label="Nové" val={(boty||[]).filter(b=>b.stav==="nove").length} color={C.green}/>
      <StatCard label="Použité" val={(boty||[]).filter(b=>b.stav==="pouzite").length} color={C.muted}/>
    </div>

    {/* Filtry */}
    <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:16,alignItems:"center"}}>
      {/* Stav */}
      <button onClick={()=>setFiltrStav(null)} style={{...btnC(!filtrStav?C.accent:C.muted,!!filtrStav),padding:"4px 10px",fontSize:12}}>Vše</button>
      <button onClick={()=>setFiltrStav(filtrStav==="nove"?null:"nove")} style={{...btnC(filtrStav==="nove"?C.green:C.muted,filtrStav!=="nove"),padding:"4px 10px",fontSize:12}}>✨ Nové</button>
      <button onClick={()=>setFiltrStav(filtrStav==="pouzite"?null:"pouzite")} style={{...btnC(filtrStav==="pouzite"?C.muted:C.muted,filtrStav!=="pouzite"),padding:"4px 10px",fontSize:12}}>👟 Použité</button>
      <span style={{color:C.dim}}>|</span>
      {/* Umístění */}
      {(umisteni||[]).map(u=><button key={u.id} onClick={()=>setFiltrUm(filtrUm===u.id?null:u.id)} style={{...btnC(filtrUm===u.id?C.blue:C.muted,filtrUm!==u.id),padding:"4px 10px",fontSize:12}}>📍 {u.nazev}</button>)}
      <span style={{color:C.dim}}>|</span>
      {/* Dítě */}
      {(deti||[]).map(d=><button key={d.id} onClick={()=>setFiltrDite(filtrDite===d.id?null:d.id)} style={{padding:"4px 10px",fontSize:12,borderRadius:9,border:"none",cursor:"pointer",fontWeight:700,background:filtrDite===d.id?d.barva||C.accent:"transparent",color:filtrDite===d.id?"#fff":C.muted}}>{d.emoji} {d.jmeno}</button>)}
    </div>

    {/* Seznam bot */}
    {filtered.length===0&&<EmptyState emoji="👟" text="Žádné boty" action="+ Přidat boty" onAction={()=>setModal({type:"new"})}/>}
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:10}}>
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
          {b.deti&&<div style={{fontSize:12,color:C.muted,marginBottom:4}}>👦 {b.deti.jmeno}</div>}
          {b.boty_umisteni&&<div style={{fontSize:12,color:C.muted,marginBottom:4}}>📍 {b.boty_umisteni.nazev}</div>}
          {b.poznamka&&<div style={{fontSize:11,color:C.dim,fontStyle:"italic",marginBottom:8}}>{b.poznamka}</div>}
          <div style={{display:"flex",gap:6,marginTop:8}}>
            <button onClick={()=>setModal({type:"edit",bota:b})} style={{...btnC(C.muted,true),padding:"4px 10px",fontSize:12}}>✎ Upravit</button>
            <button onClick={()=>smaz(b)} style={{...btnC(C.red,true),padding:"4px 10px",fontSize:12}}>✕</button>
          </div>
        </div>;
      })}
    </div>

    {modal?.type==="new"&&<BotyModal umisteni={umisteni||[]} deti={deti||[]} onClose={()=>setModal(null)} onSaved={()=>{setModal(null);reload();}}/>}
    {modal?.type==="edit"&&<BotyModal bota={modal.bota} umisteni={umisteni||[]} deti={deti||[]} onClose={()=>setModal(null)} onSaved={()=>{setModal(null);reload();}}/>}
    {modal?.type==="umisteni"&&<UmisteniModal onClose={()=>setModal(null)} onSaved={()=>{setModal(null);reloadUm();}}/>}
  </div>;
}

// ══════════════════════════════════════════════════════════════════════════════
// APP ROOT
// ══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [modul, setModul] = useState("deti");
  return <div style={{minHeight:"100vh",background:C.bg,fontFamily:"'Inter','Segoe UI',sans-serif",color:C.text}}>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet"/>
    <style>{`*{box-sizing:border-box}body{margin:0}::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:${C.bg}}::-webkit-scrollbar-thumb{background:${C.border};border-radius:3px}input[type=number]::-webkit-inner-spin-button{opacity:.4}`}</style>
    <div style={{background:C.surface,borderBottom:`1px solid ${C.border}`,padding:"0 24px",position:"sticky",top:0,zIndex:50}}>
      <div style={{maxWidth:1100,margin:"0 auto",display:"flex",alignItems:"center",height:54,overflowX:"auto",gap:0}}>
        <div style={{display:"flex",alignItems:"center",gap:9,marginRight:24,flexShrink:0}}>
          <div style={{width:28,height:28,borderRadius:7,background:C.accent,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>🏡</div>
          <div style={{fontWeight:800,fontSize:15,color:C.text}}>Hostice</div>
        </div>
        {MODULES.map(m=>(
          <button key={m.id} onClick={()=>setModul(m.id)} style={{padding:"0 16px",height:54,border:"none",cursor:"pointer",fontWeight:700,fontSize:13,background:"transparent",transition:"all .15s",whiteSpace:"nowrap",flexShrink:0,color:modul===m.id?C.accent:C.muted,borderBottom:modul===m.id?`2px solid ${C.accent}`:"2px solid transparent"}}>
            {m.emoji} {m.label}
          </button>
        ))}
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
    </div>
  </div>;
}
