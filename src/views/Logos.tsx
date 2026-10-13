import { useEffect, useMemo, useState } from 'react'
import { Card, Badge } from '../components/ui'
import { BrandLogo } from '../components/product'
import { InfoTip } from '../components/info'
import { useApp, STORE_LOGO } from '../lib'
const CATS:[string,string][]=[['Handelskette','🏪'],['Eigenmarke','🏷️'],['Markenhersteller','⭐'],['Produzent/Werk','🏭'],['Bio','🌱'],['Budget','💸']]
const CHAINS=/^(billa|spar|interspar|hofer|aldi|lidl|penny|dm|fit ?to ?go|merkur|eurospar|rewe)/i
const PRIV=/billa|clever|ja!? ?nat|vegavita|omis|simply good|spar|s-budget|despar|good choice|primana|cucina nobile|le gusto|hofer|chef select|vemondo|combino|kania|dmbio|^dm|milbona|back to nature|natur aktiv|zurück zum ursprung|gourmet|genusswelt|immer gut|feine küche|pure\b/i
function guess(name:string,cat?:string|null,isProd?:boolean):string{
  if(cat) return cat
  if(isProd) return 'Produzent/Werk'
  if(CHAINS.test(name)&&name.length<14) return 'Handelskette'
  if(/budget|clever|\bk-classic|tip\b|billa preis/i.test(name)) return 'Budget'
  if(/bio|natur\*?pur|natürlich|alnatura|zurück zum/i.test(name)) return 'Bio'
  if(PRIV.test(name)) return 'Eigenmarke'
  return 'Markenhersteller'
}
export default function Logos(){
  const {D,R}=useApp(); const [L,setL]=useState<Record<string,any>>({}),[cat,setCat]=useState(''),[q,setQ]=useState('')
  useEffect(()=>{fetch('./analysis/logos.json?v='+Date.now()).then(r=>r.ok?r.json():{}).then(setL).catch(()=>{})},[])
  const items=useMemo(()=>{const m=new Map<string,{key:string;name:string;logo:string|null;cat:string;n:number;q:string;src?:string}>()
    const cnt=(b:string)=>R.filter(r=>r.brandN===b||r.store===b).length
    Object.entries(STORE_LOGO).forEach(([k,v])=>m.set(k.toLowerCase(),{key:k,name:k,logo:v,cat:'Handelskette',n:cnt(k),q:k}))
    Object.entries(L).forEach(([k,v]:any)=>{const nm=v.name||k.replace(/-/g,' ').replace(/\b\w/g,(c:string)=>c.toUpperCase());const ex=m.get(nm.toLowerCase());const file=v.file?('./analysis/'+v.file):null
      m.set(nm.toLowerCase(),{key:k,name:ex?.name??nm,logo:ex?.logo??file,cat:guess(nm,v.logo_category,false),n:ex?.n??R.filter(r=>r.brandN.toLowerCase()===nm.toLowerCase()).length,q:nm,src:v.source})})
    ;(D.producers||[]).forEach((p:any)=>{if(!m.has((p.legal||p.name).toLowerCase()))m.set((p.legal||p.name).toLowerCase(),{key:p.slug,name:p.legal||p.name,logo:p.logo,cat:'Produzent/Werk',n:p.ids.length,q:'',src:p.website})})
    const bc:Record<string,{n:number;logo:string|null}>={};R.forEach(r=>{if(r.noBrand||r.nonfood)return;const b=bc[r.brandN]??={n:0,logo:null};b.n++;if(r.logo)b.logo=r.logo})
    Object.entries(bc).filter(([,v])=>v.n>=2).forEach(([b,v])=>{if(!m.has(b.toLowerCase()))m.set(b.toLowerCase(),{key:b,name:b,logo:v.logo,cat:guess(b),n:v.n,q:b})})
    return [...m.values()].sort((a,b)=>(b.logo?1:0)-(a.logo?1:0)||b.n-a.n)},[L,R,D])
  const shown=items.filter(x=>(!cat||x.cat===cat)&&(!q||x.name.toLowerCase().includes(q.toLowerCase())))
  const go=(x:any)=>{if(x.cat==='Produzent/Werk'){location.hash='#tab=hersteller-seiten&h='+x.key}else if(x.cat==='Handelskette'){location.hash='#tab=alle&st='+encodeURIComponent(x.name)}else location.hash='#tab=alle&q='+encodeURIComponent(x.q)}
  return <div className="space-y-4">
    <div className="flex flex-wrap gap-2 items-center"><button onClick={()=>setCat('')} className={'rounded-xl border-2 px-3 py-1.5 text-sm font-medium '+(!cat?'border-brand bg-brand/10 text-brand':'border-slate-200 dark:border-slate-700')}>Alle <span className="opacity-60">{items.length}</span></button>
      {CATS.map(([c,e])=><button key={c} onClick={()=>setCat(cat===c?'':c)} className={'rounded-xl border-2 px-3 py-1.5 text-sm font-medium '+(cat===c?'border-brand bg-brand/10 text-brand':'border-slate-200 dark:border-slate-700')}>{e} {c} <span className="opacity-60">{items.filter(x=>x.cat===c).length}</span></button>)}
      <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Logo suchen…" className="ml-auto rounded-lg border px-3 py-1.5 text-sm dark:bg-slate-900 dark:border-slate-700"/>
      <InfoTip text="Kategorie aus logos.json (logo_category). Fehlt sie, wird sie aus dem Namen abgeleitet. Ein Klick filtert die Produkte bzw. öffnet die Herstellerseite."/></div>
    <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 2xl:grid-cols-8">{shown.map(x=><Card key={x.cat+x.key} onClick={()=>go(x)} className="group cursor-pointer p-3 flex flex-col items-center gap-2 hover:shadow-xl hover:-translate-y-0.5 transition-all">
      <div className="h-24 w-full flex items-center justify-center rounded-xl bg-white">{x.logo?<img src={x.logo} alt={x.name} loading="lazy" referrerPolicy="no-referrer" className="max-h-20 max-w-[90%] object-contain transition-transform group-hover:scale-105" onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/>:<BrandLogo r={{brandN:x.name,logo:null}} size={56}/>}</div>
      <div className="text-sm font-semibold text-center leading-tight line-clamp-2">{x.name}</div>
      <div className="flex gap-1 flex-wrap justify-center"><Badge className="bg-slate-100 dark:bg-slate-800">{CATS.find(c=>c[0]===x.cat)?.[1]} {x.cat}</Badge>{x.n>0&&<Badge className="bg-emerald-100 text-emerald-800">{x.n} Produkte</Badge>}</div></Card>)}</div></div>
}
