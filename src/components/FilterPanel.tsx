import { useMemo, useState } from 'react'
import { SlidersHorizontal, X, ChevronDown } from 'lucide-react'
import { Sheet, Button, Badge } from './ui'
import { BrandLogo, StoreLogo } from './product'
import { STAGES, InfoTip } from './info'
import { useApp, useHashState, cn, type Row } from '../lib'
export const GANG:[string,string,string][]=[['vorspeise','🥣','Vorspeise/Suppe'],['haupt','🍽️','Hauptspeise'],['beilage','🥔','Beilage'],['dessert','🍰','Nachspeise/Dessert']]
type Rng=[number|null,number|null]
export type F={gang?:string[];stage?:string[];chain?:string[];brand?:string[];herst?:string[];konz?:string[];pack?:string[];cat?:string[];diet?:string[];land?:string[];bl?:string[];r?:Record<string,Rng>;dist?:number|null}
const RANGES:[string,string,string,number][]=[['price','💶 Preis','€',0.1],['eur10p','⚖️ €/10 g Protein','€',0.05],['protPor','🥩 Protein/Portion','g',1],['kcalPor','🔥 kcal/Portion','kcal',10],['salt','🧂 Salz/100 g','g',0.1],['score','💚 Health-Score','',1],['pli','⭐ PLI','',1]]
const LAND:[RegExp,string][]=[[/österreich|austria|\bAT\b/i,'🇦🇹 Österreich'],[/deutschland|germany|\bDE\b/i,'🇩🇪 Deutschland'],[/itali|\bIT\b/i,'🇮🇹 Italien'],[/niederlande|\bNL\b/i,'🇳🇱 Niederlande'],[/ungarn|\bHU\b/i,'🇭🇺 Ungarn'],[/polen|\bPL\b/i,'🇵🇱 Polen'],[/thailand/i,'🇹🇭 Thailand']]
export const landOf=(r:Row)=>{const t=[r.origin,r.ort,(r as any).p2?.country,r.state].filter(Boolean).join(' ');if(r.state||r.ooe)return '🇦🇹 Österreich';return LAND.find(([re])=>re.test(t))?.[1]??null}
export const PRESETS:[string,string,F][]=[
 ['💪','High-Protein günstig',{gang:['haupt','vorspeise'],r:{eur10p:[null,1.5],protPor:[25,null]}}],
 ['🍱','Wie Good Choice',{gang:['haupt'],stage:['meal'],r:{kcalPor:[350,750],protPor:[20,null],price:[null,6]}}],
 ['🥗','Gesund & schnell',{stage:['meal','stew'],r:{score:[50,null],salt:[null,1.2]}}]]
export function useFilter(){
  const [fx,setFx]=useHashState<string>('fx','')
  const f:F=useMemo(()=>{try{return fx?JSON.parse(decodeURIComponent(fx)):{}}catch{return {}}},[fx])
  const set=(n:F)=>{const c:any={};Object.entries(n).forEach(([k,v])=>{if(Array.isArray(v)?v.length:v&&typeof v==='object'?Object.values(v).some((x:any)=>x&&(x[0]!=null||x[1]!=null)):v!=null)c[k]=v});setFx(Object.keys(c).length?encodeURIComponent(JSON.stringify(c)):'')}
  return [f,set] as const
}
export function makePred(f:F,ctx:{konzOf:(r:Row)=>string|null;dist:(r:Row)=>number|null}){
  const inA=(a:string[]|undefined,v:string|null|undefined)=>!a?.length||(v!=null&&a.includes(v))
  return (r:Row)=>inA(f.gang,(r as any).gang)&&inA(f.stage,r.stage)&&inA(f.chain,r.store)&&inA(f.brand,r.brandN)&&inA(f.herst,(r as any).p2?.producer||r.herst)&&inA(f.konz,ctx.konzOf(r))&&inA(f.pack,r.pack)&&inA(f.land,landOf(r))&&inA(f.bl,r.state||(r.ooe?'Oberösterreich':null))
    &&(!f.cat?.length||f.cat.every(c=>r.cprot?.includes(c)||r.cdish?.includes(c)))
    &&(!f.diet?.length||f.diet.every(d=>d==='bio'?r.bio:d==='vegan'?r.vegan||r.cprot?.includes('vegan'):r.vegan||r.cprot?.includes('vegetarisch')||r.cprot?.includes('vegan')))
    &&Object.entries(f.r||{}).every(([k,[lo,hi]])=>{const v=(r as any)[k];if(lo==null&&hi==null)return true;if(v==null)return false;return (lo==null||v>=lo)&&(hi==null||v<=hi)})
    &&(f.dist==null||(ctx.dist(r)??1e9)<=f.dist)
}
function Sec({title,n,children,open=false}:{title:string;n?:number;children:React.ReactNode;open?:boolean}){const [o,setO]=useState(open);return <div className="border-b dark:border-slate-800"><button onClick={()=>setO(!o)} className="w-full flex items-center justify-between py-2.5 text-sm font-semibold">{title}{n?<Badge className="ml-2 bg-brand text-white">{n}</Badge>:null}<ChevronDown size={16} className={cn('ml-auto transition',o&&'rotate-180')}/></button>{o&&<div className="pb-3">{children}</div>}</div>}
function Chips({opts,val,on,render}:{opts:string[];val?:string[];on:(v:string[])=>void;render?:(o:string)=>React.ReactNode}){const v=val||[];return <div className="flex flex-wrap gap-1.5 max-h-56 overflow-y-auto">{opts.map(o=><button key={o} onClick={()=>on(v.includes(o)?v.filter(x=>x!==o):[...v,o])} className={cn('rounded-full border px-2.5 py-1 text-xs flex items-center gap-1 transition',v.includes(o)?'bg-brand text-white border-brand':'border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800')}>{render?render(o):o}</button>)}</div>}
export function FilterPanel({f,set,konzOf,count}:{f:F;set:(f:F)=>void;konzOf:(r:Row)=>string|null;count:number}){
  const {R,D,stores}=useApp(); const [open,setOpen]=useState(false)
  const uniq=(fn:(r:Row)=>string|null|undefined,min=1)=>{const c:Record<string,number>={};R.forEach(r=>{if(r.nonfood)return;const v=fn(r);if(v)c[v]=(c[v]??0)+1});return Object.entries(c).filter(([,n])=>n>=min).sort((a,b)=>b[1]-a[1]).map(x=>x[0])}
  const O=useMemo(()=>({chain:uniq(r=>r.store.startsWith('unbekannt')?null:r.store),brand:uniq(r=>r.noBrand?null:r.brandN,2),herst:uniq(r=>(r as any).p2?.producer||r.herst),konz:uniq(konzOf),pack:uniq(r=>r.pack),land:uniq(landOf),bl:uniq(r=>r.state||(r.ooe?'Oberösterreich':null))}),[R])
  const logoOf=(b:string)=>R.find(r=>r.brandN===b&&r.logo)?.logo??null
  const setR=(k:string,i:0|1,v:string)=>{const r={...(f.r||{})};const cur:Rng=[...(r[k]||[null,null])] as Rng;cur[i]=v===''?null:+v;r[k]=cur;set({...f,r})}
  const chips:[string,()=>void][]=[]
  ;(['gang','stage','chain','brand','herst','konz','pack','cat','diet','land','bl'] as const).forEach(k=>(f[k]||[]).forEach(v=>chips.push([k==='gang'?GANG.find(g=>g[0]===v)?.slice(1).join(' ')??v:k==='stage'?STAGES.find(g=>g[0]===v)?.slice(1).join(' ')??v:v,()=>set({...f,[k]:f[k]!.filter(x=>x!==v)})])))
  Object.entries(f.r||{}).forEach(([k,[lo,hi]])=>{if(lo!=null||hi!=null){const L=RANGES.find(x=>x[0]===k);chips.push([`${L?.[1]??k} ${lo??'…'}–${hi??'…'}`,()=>{const r={...f.r};delete r[k];set({...f,r})}])}})
  if(f.dist!=null) chips.push([`🚶 ≤ ${f.dist} m`,()=>set({...f,dist:null})])
  return <>
    <div className="flex flex-wrap items-center gap-1.5">
      <Button size="sm" onClick={()=>setOpen(true)} className="border-brand text-brand"><SlidersHorizontal size={14}/>Filter{chips.length?` (${chips.length})`:''}</Button>
      {PRESETS.map(([e,l,p])=><button key={l} onClick={()=>set(p)} className="rounded-full border border-dashed border-slate-300 dark:border-slate-600 px-2.5 py-1 text-xs hover:bg-slate-100 dark:hover:bg-slate-800">{e} {l}</button>)}
      {chips.map(([l,rm],i)=><span key={i} className="inline-flex items-center gap-1 rounded-full bg-brand/10 text-brand dark:text-emerald-300 px-2 py-0.5 text-xs">{l}<button onClick={rm} aria-label="entfernen"><X size={12}/></button></span>)}
      {chips.length>0&&<button onClick={()=>set({})} className="text-xs text-slate-500 underline">alle zurücksetzen</button>}
    </div>
    <Sheet open={open} onClose={()=>setOpen(false)} title={<span className="flex items-center gap-2"><SlidersHorizontal size={16}/>Filter <span className="text-sm font-normal text-slate-500">{count} Treffer</span></span>}>
      <div className="px-1">
        <div className="flex flex-wrap gap-1.5 py-2">{PRESETS.map(([e,l,p])=><Button key={l} size="sm" onClick={()=>set(p)}>{e} {l}</Button>)}</div>
        <Sec title="🍽️ Gang" n={f.gang?.length} open><Chips opts={GANG.map(g=>g[0])} val={f.gang} on={v=>set({...f,gang:v})} render={o=>{const g=GANG.find(x=>x[0]===o)!;return <>{g[1]} {g[2]}</>}}/></Sec>
        <Sec title="🍱 Fertigstufe" n={f.stage?.length} open><Chips opts={STAGES.map(s=>s[0])} val={f.stage} on={v=>set({...f,stage:v})} render={o=>{const g=STAGES.find(x=>x[0]===o)!;return <>{g[1]} {g[2]}</>}}/><p className="text-[11px] text-slate-500 mt-1">Zusätzlich zu den Fertigstufe-Tabs oben</p></Sec>
        <Sec title="🏪 Kette" n={f.chain?.length} open><Chips opts={O.chain} val={f.chain} on={v=>set({...f,chain:v})} render={o=><StoreLogo store={o} size={22}/>}/></Sec>
        <Sec title="🚶 Entfernung zur nächsten Filiale"><div className="flex items-center gap-2"><input type="range" min={100} max={3000} step={100} value={f.dist??3000} onChange={e=>set({...f,dist:+e.target.value>=3000?null:+e.target.value})} className="flex-1 accent-emerald-700"/><span className="text-sm w-20 text-right">{f.dist?`≤ ${f.dist} m`:'egal'}</span><InfoTip k="dist"/></div></Sec>
        <Sec title="🏷️ Marke" n={f.brand?.length}><Chips opts={O.brand} val={f.brand} on={v=>set({...f,brand:v})} render={o=><><BrandLogo r={{brandN:o,logo:logoOf(o)}} size={20}/><span>{o}</span></>}/></Sec>
        <Sec title="🏭 Hersteller" n={f.herst?.length}><Chips opts={O.herst} val={f.herst} on={v=>set({...f,herst:v})}/></Sec>
        <Sec title="🏢 Konzern" n={f.konz?.length}><Chips opts={O.konz} val={f.konz} on={v=>set({...f,konz:v})}/></Sec>
        <Sec title="📦 Verpackung" n={f.pack?.length}><Chips opts={O.pack} val={f.pack} on={v=>set({...f,pack:v})}/></Sec>
        <Sec title="🐔 Kategorie" n={f.cat?.length}><Chips opts={[...D.catProt,...D.catDish]} val={f.cat} on={v=>set({...f,cat:v})} render={o=><>{D.catIcon[o]??''} {o}</>}/></Sec>
        <Sec title="🌱 Ernährung" n={f.diet?.length}><Chips opts={['bio','vegan','vegetarisch']} val={f.diet} on={v=>set({...f,diet:v})} render={o=><>{o==='bio'?'🌱 Bio':o==='vegan'?'🌿 vegan':'🥦 vegetarisch'}</>}/></Sec>
        <Sec title="🌍 Herkunft" n={(f.land?.length||0)+(f.bl?.length||0)}><div className="text-xs text-slate-500 mb-1">Land</div><Chips opts={O.land} val={f.land} on={v=>set({...f,land:v})}/><div className="text-xs text-slate-500 my-1">Bundesland (Hersteller)</div><Chips opts={O.bl} val={f.bl} on={v=>set({...f,bl:v})}/></Sec>
        <Sec title="📏 Bereiche" n={Object.values(f.r||{}).filter(x=>x[0]!=null||x[1]!=null).length} open>{RANGES.map(([k,l,u,st])=><div key={k} className="grid grid-cols-[1fr_80px_80px] gap-2 items-center mb-1.5 text-sm"><span className="flex items-center gap-1">{l}<InfoTip k={k==='price'?'ppk':k}/></span>
          <input type="number" step={st} placeholder={`min ${u}`} value={f.r?.[k]?.[0]??''} onChange={e=>setR(k,0,e.target.value)} className="rounded-md border px-2 py-1 text-xs dark:bg-slate-900 dark:border-slate-700"/>
          <input type="number" step={st} placeholder={`max ${u}`} value={f.r?.[k]?.[1]??''} onChange={e=>setR(k,1,e.target.value)} className="rounded-md border px-2 py-1 text-xs dark:bg-slate-900 dark:border-slate-700"/></div>)}</Sec>
        <div className="sticky bottom-0 bg-white dark:bg-slate-900 py-3 flex gap-2"><Button onClick={()=>set({})} className="flex-1">Zurücksetzen</Button><Button onClick={()=>setOpen(false)} className="flex-1 bg-brand text-white border-brand">{count} Treffer anzeigen</Button></div>
      </div></Sheet></>
}
