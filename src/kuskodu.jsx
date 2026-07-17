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
    if(isNew) await sb.from("fin_cashflow_plan").insert(data);
    else await sb.from("fin_cashflow_plan").update(data).eq("id",polozka.id);
    setSaving(false);onSaved();
  };

  // ── Lokální designové tokeny (větší, vzdušnější varianty C / inp) ──────────────
  const inpL    = {...inp, fontSize:15, padding:"0 14px", height:48, borderRadius:10, boxSizing:"border-box"};
  const inpAmt  = {...inp, fontSize:24, fontWeight:800, padding:"0 56px 0 16px", height:62, borderRadius:14, boxSizing:"border-box"};
  const sekce   = {background:C.bg, border:`1px solid ${C.border}`, borderRadius:14, padding:16, marginBottom:14};
  const sekceLbl= {fontSize:12, fontWeight:800, color:C.muted, letterSpacing:.6, textTransform:"uppercase", margin:"0 2px 12px"};
  const FL=({label,hint,children,style})=>(
    <div style={{marginBottom:0,...style}}>
      <div style={{color:C.muted,fontSize:12.5,fontWeight:800,letterSpacing:.4,textTransform:"uppercase",marginBottom:7}}>{label}</div>
      {children}
      {hint&&<div style={{color:C.dim,fontSize:11.5,marginTop:6,lineHeight:1.4}}>{hint}</div>}
    </div>
  );
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