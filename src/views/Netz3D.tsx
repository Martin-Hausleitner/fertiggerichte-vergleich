import { useEffect, useMemo, useRef, useState } from 'react'
import ForceGraph3D from 'react-force-graph-3d'
import * as THREE from 'three'
import SpriteText from 'three-spritetext'
import { Card, Badge } from '../components/ui'
import { Gallery, StoreLogo } from '../components/product'
import { prodColor, STAGES, InfoTip } from '../components/info'
import { useApp, STORE_LOGO, fmt, type Row } from '../lib'
type N={id:string;type:'konzern'|'hersteller'|'marke'|'kette'|'gericht';label:string;sub?:string;logo?:string|null;color:string;n:number;rows:Row[];val:number}
type E={source:string;target:string;n:number;dashed:boolean;note?:string}
const TC:Record<string,string>={konzern:'#7c3aed',hersteller:'#ea580c',marke:'#0284c7',kette:'#16a34a',gericht:'#64748b'}
const TL:Record<string,string>={konzern:'🏢 Konzern',hersteller:'🏭 Hersteller/Werk',marke:'🏷️ Marke',kette:'🏪 Handelskette',gericht:'🍱 Gericht'}
const normChain=(s:string)=>/hofer|aldi/i.test(s)?'Hofer':/spar/i.test(s)?'Spar':/billa|merkur/i.test(s)?'Billa':/lidl/i.test(s)?'Lidl':/penny/i.test(s)?'Penny':/\bdm\b/i.test(s)?'dm':/fit ?to ?go/i.test(s)?'Fit to Go':s.trim()
const med=(a:number[])=>{const s=a.filter(x=>x!=null&&!isNaN(x)).sort((x,y)=>x-y);return s.length?s[Math.floor(s.length/2)]:null}
export default function Netz3D(){
  const {D,R}=useApp(); const fg=useRef<any>(); const box=useRef<HTMLDivElement>(null)
  const [stages,setStages]=useState<string[]>(['meal','stew']),[chain,setChain]=useState(''),[dishes,setDishes]=useState(false),[sel,setSel]=useState<N|null>(null),[w,setW]=useState(1000)
  useEffect(()=>{const f=()=>setW(box.current?.clientWidth??1000);f();addEventListener('resize',f);return()=>removeEventListener('resize',f)},[])
  const g=useMemo(()=>{
    const nodes=new Map<string,N>(),edges=new Map<string,E>()
    const ok=(r:Row)=>stages.includes(r.stage)&&!r.nonfood&&!r.store.startsWith('unbekannt')&&(!chain||r.store===chain)
    const brandLogo=(b:string)=>R.find(r=>r.brandN===b&&r.logo)?.logo??null
    const node=(id:string,o:Omit<N,'id'|'rows'|'n'|'val'>)=>{if(!nodes.has(id))nodes.set(id,{id,rows:[],n:0,val:1,...o});return nodes.get(id)!}
    const edge=(a:string,b:string,dashed:boolean,inc=1,note?:string)=>{const k=a+'>'+b;const e=edges.get(k);if(e){e.n+=inc;if(!dashed)e.dashed=false}else edges.set(k,{source:a,target:b,n:inc,dashed,note})}
    const brandKey=(b:string)=>{const c=b.replace(/\(.*?\)/g,'').trim();const hit=R.find(r=>r.brandN.toLowerCase()===c.toLowerCase());return hit?hit.brandN:c.replace(/\b\w+/g,(w:string)=>w.length>3&&w===w.toUpperCase()?w[0]+w.slice(1).toLowerCase():w)}
    const byId=new Map(R.map(r=>[r.id,r]))
    for(const p of (D.producers||[]) as any[]){
      const rows=(p.ids as number[]).map(i=>byId.get(i)).filter(r=>r&&ok(r)) as Row[]
      const claims=(p.brands||[]).map((b:any)=>String(b.brand_at_chain||'').split('@')).filter((x:string[])=>x.length===2)
        .map(([b,c]:string[])=>({b:brandKey(b),c:normChain(c)})).filter((x:any)=>!chain||x.c===chain)
      if(!rows.length&&!claims.length) continue
      const hid='h:'+p.slug,col=prodColor(p.slug)
      const h=node(hid,{type:'hersteller',label:p.legal||p.name||p.slug,sub:[p.plants?.[0]?.town,p.plants?.[0]?.state].filter(Boolean).join(', '),logo:p.logo,color:col})
      h.rows.push(...rows)
      if(p.group){const unsure=/unverified|unsicher|vermut/i.test(p.group);const gname=String(p.group).replace(/\(.*?\)/g,'').trim();if(gname&&gname.toLowerCase()!==String(p.name||'').toLowerCase()){const kid='k:'+gname.toLowerCase();node(kid,{type:'konzern',label:gname,color:TC.konzern});edge(kid,hid,unsure,1,unsure?'Zuordnung unbestätigt':'laut Firmenrecherche')}}
      for(const r of rows){const mid='m:'+r.brandN;const m=node(mid,{type:'marke',label:r.brandN,logo:r.logo,color:TC.marke});m.rows.push(r);edge(hid,mid,false,1,'Identitätskennzeichen/Herstellerangabe');const cid='c:'+r.store;const c=node(cid,{type:'kette',label:r.store,logo:STORE_LOGO[r.store],color:TC.kette});c.rows.push(r);edge(mid,cid,false,1)
        if(dishes&&(r.pli??0)>=50){const gid='g:'+r.id;node(gid,{type:'gericht',label:r.name,logo:null,color:TC.gericht}).rows=[r];edge(mid,gid,false,1)}}
      for(const x of claims){const mid='m:'+x.b;if(!nodes.has(mid))node(mid,{type:'marke',label:x.b,logo:brandLogo(x.b),color:TC.marke});if(!edges.has(hid+'>'+mid))edge(hid,mid,true,0,'laut Recherche/Quelle, kein Produkt im aktuellen Filter');const cid='c:'+x.c;node(cid,{type:'kette',label:x.c,logo:STORE_LOGO[x.c],color:TC.kette});if(!edges.has(mid+'>'+cid))edge(mid,cid,true,0)}
    }
    nodes.forEach(n=>{const u=[...new Map(n.rows.map(r=>[r.id,r])).values()];n.rows=u;n.n=u.length;n.val=n.type==='gericht'?2:Math.max(3,Math.sqrt(u.length+1)*4+(n.type==='kette'?6:n.type==='konzern'?4:0))})
    return {nodes:[...nodes.values()],links:[...edges.values()]}
  },[D,R,stages,chain,dishes])
  const tex=useMemo(()=>new Map<string,THREE.Texture>(),[])
  const nodeObj=(n:any)=>{
    const s=n.val*2.2
    if(n.logo){let t=tex.get(n.logo);if(!t){t=new THREE.TextureLoader().load(n.logo);t.colorSpace=THREE.SRGBColorSpace;tex.set(n.logo,t)}
      const grp=new THREE.Group();const bg=new THREE.Sprite(new THREE.SpriteMaterial({color:0xffffff}));bg.scale.set(s*1.25,s*0.85,1);grp.add(bg)
      const ring=new THREE.Sprite(new THREE.SpriteMaterial({color:new THREE.Color(n.color)}));ring.scale.set(s*1.35,s*0.95,1);ring.position.z=-0.5;grp.add(ring)
      const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:t,transparent:true}));sp.scale.set(s*1.1,s*0.7,1);sp.position.z=0.5;grp.add(sp)
      const lb=new SpriteText(n.label.length>28?n.label.slice(0,26)+'…':n.label,Math.max(2.2,s*0.16),'#0f172a');lb.backgroundColor='rgba(255,255,255,.85)';lb.padding=1;lb.borderRadius=2;(lb as any).position.y=-s*0.65;grp.add(lb);return grp}
    const t=new SpriteText((n.type==='hersteller'?'🏭 ':n.type==='konzern'?'🏢 ':'')+n.label,Math.max(3,s*0.22),'#fff');t.backgroundColor=n.color;t.padding=2;t.borderRadius=4;return t}
  const tip=(n:any)=>{const pli=med(n.rows.map((r:Row)=>r.pli!)),e=med(n.rows.map((r:Row)=>r.eur10p!));return `<div style="background:#0f172a;color:#fff;padding:8px 10px;border-radius:10px;font:12px system-ui;max-width:280px"><div style="opacity:.7">${TL[n.type]}</div><b style="font-size:14px">${n.label}</b>${n.sub?`<div>📍 ${n.sub}</div>`:''}<div>${n.n} Produkte im Filter</div>${pli!=null?`<div>⭐ ø PLI ${Math.round(pli)}</div>`:''}${e!=null?`<div>⚖️ ${fmt(e,2)} € / 10 g Protein (Median)</div>`:''}</div>`}
  const focus=(n:any)=>{setSel(n);const d=90;const r=1+d/Math.hypot(n.x||1,n.y||1,n.z||1);fg.current?.cameraPosition({x:n.x*r,y:n.y*r,z:n.z*r},n,1200)}
  const chains=[...new Set(R.map(r=>r.store))].filter(s=>STORE_LOGO[s])
  return <div className="space-y-3">
    <div className="flex flex-wrap gap-2 items-center">{STAGES.filter(s=>s[0]!=='base').map(([k,e,l])=>{const on=stages.includes(k);return <button key={k} onClick={()=>setStages(on?stages.filter(x=>x!==k):[...stages,k])} className={'rounded-xl border-2 px-2.5 py-1 text-sm '+(on?'border-brand bg-brand/10 text-brand':'border-slate-200 dark:border-slate-700 opacity-70')}>{e} {l}</button>})}
      <select value={chain} onChange={e=>setChain(e.target.value)} className="rounded-lg border px-2 py-1.5 text-sm dark:bg-slate-900 dark:border-slate-700"><option value="">Alle Ketten</option>{chains.map(c=><option key={c}>{c}</option>)}</select>
      <label className="text-sm flex items-center gap-1"><input type="checkbox" checked={dishes} onChange={e=>setDishes(e.target.checked)}/>Top-Gerichte (PLI ≥ 50)</label>
      <span className="text-xs text-slate-500">{g.nodes.length} Knoten · {g.links.length} Verbindungen</span></div>
    <div className="flex flex-wrap gap-3 text-xs items-center">{Object.entries(TL).map(([k,l])=><span key={k} className="flex items-center gap-1"><span className="h-3 w-3 rounded-full" style={{background:TC[k]}}/>{l}</span>)}<span className="flex items-center gap-1"><span className="w-6 border-t-2 border-slate-500"/>belegt (Produkt/Identitätskennzeichen)</span><span className="flex items-center gap-1"><span className="w-6 border-t-2 border-dashed border-slate-400"/>unsicher / nur Recherche</span><InfoTip text="Konzern → Hersteller: aus der Firmenrecherche (companies.json). Hersteller → Marke: über das Identitätskennzeichen bzw. die Herstellerangabe auf Produkten; die Linienstärke entspricht der Anzahl Produkte. Marke → Kette: wo das Produkt verkauft wird. Gestrichelt: in der Recherche genannt, aber ohne Produkt im aktuellen Filter, oder Zuordnung unbestätigt. Hersteller haben eine eigene Farbe als Rand."/></div>
    <div ref={box} className="rounded-2xl overflow-hidden border dark:border-slate-800 bg-gradient-to-b from-slate-50 to-slate-200 dark:from-slate-900 dark:to-slate-950">
      <ForceGraph3D ref={fg} graphData={g} width={w} height={Math.min(720,Math.max(480,innerHeight-260))} backgroundColor="rgba(0,0,0,0)" nodeThreeObject={nodeObj} nodeLabel={tip}
        linkWidth={(l:any)=>l.dashed?0.4:Math.min(4,0.6+Math.sqrt(l.n))} linkOpacity={0.6} linkColor={(l:any)=>l.dashed?'#94a3b8':(typeof l.source==='object'?l.source.color:'#64748b')}
        linkDirectionalParticles={(l:any)=>l.dashed?0:Math.min(4,l.n)} linkDirectionalParticleWidth={1.5} linkLabel={(l:any)=>`${l.n} Produkte${l.note?' · '+l.note:''}${l.dashed?' (unsicher)':''}`}
        linkMaterial={(l:any)=>l.dashed?new THREE.LineDashedMaterial({color:0x94a3b8,dashSize:2,gapSize:2}):undefined as any}
        onNodeClick={focus} enableNodeDrag={true} cooldownTicks={120} onEngineStop={()=>fg.current?.zoomToFit(600,10)}/></div>
    {sel&&<Card className="p-4 space-y-2"><div className="flex items-center gap-3">{sel.type==='kette'?<StoreLogo store={sel.label} size={48}/>:sel.logo&&<img src={sel.logo} className="h-12 max-w-32 object-contain"/>}<div><div className="text-xs text-slate-500">{TL[sel.type]}</div><div className="text-lg font-bold" style={{color:sel.color}}>{sel.label}</div>{sel.sub&&<div className="text-sm">📍 {sel.sub}</div>}</div>
      <div className="ml-auto flex gap-2"><Badge className="bg-slate-100 dark:bg-slate-800">{sel.n} Produkte</Badge>{med(sel.rows.map(r=>r.pli!))!=null&&<Badge className="bg-emerald-600 text-white">⭐ ø PLI {Math.round(med(sel.rows.map(r=>r.pli!))!)}</Badge>}{sel.type==='hersteller'&&<a className="text-sm text-brand underline" href={'#tab=hersteller-seiten&h='+sel.id.slice(2)}>Profil →</a>}<button onClick={()=>setSel(null)} className="text-slate-400">✕</button></div></div>
      <Gallery rows={[...sel.rows].sort((a,b)=>(a.eur10p??99)-(b.eur10p??99))} step={12}/></Card>}
  </div>
}
