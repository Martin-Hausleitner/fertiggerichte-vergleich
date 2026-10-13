import { useEffect, useMemo, useState } from 'react'
import { Card, Badge } from '../components/ui'
import { useApp, fmt, scoreColor, cn } from '../lib'
type P={name:string;store:string;url:string|null;source_url:string|null;img:string|null;price:number|null;size_g:number|null;price_status:string|null;protein_100:number|null;kcal_100:number|null;protein_per_euro:number|null;health_score:number|null;nutriscore:string|null;manufacturer:string|null;producer_id:string|null}
type S={name:string;logo:string|null;logo_type:string|null;logo_source:string|null;count:number;products:P[]}
type F={id:string;name:string;chain:string;logo:string;count:number;sub_brands:S[]}
const L=(p:string|null)=>p?'./analysis/'+p:null
export default function Markenfamilien(){
  const {D,open}=useApp()
  const [B,setB]=useState<{families:F[];total:number;vision_gate?:any}|null>(null)
  const [fam,setFam]=useState('hofer'),[sub,setSub]=useState(''),[q,setQ]=useState('')
  useEffect(()=>{fetch('./brand_families.json?v='+Date.now()).then(r=>r.ok?r.json():null).then(setB).catch(()=>{})},[])
  const byUrl=useMemo(()=>{const m=new Map<string,number>();D.rows.forEach(r=>r.url&&m.set(r.url,r.id));return m},[D])
  if(!B) return <Card className="p-10 text-center text-muted-foreground animate-pulse">Lädt Markenfamilien…</Card>
  const F=B.families.find(f=>f.id===fam)??B.families[0]
  const subs=F.sub_brands.filter(s=>s.count>0||s.logo)
  const S=subs.find(s=>s.name===sub)
  const prods=(S?[S]:subs).flatMap(s=>s.products.map(p=>({...p,sb:s.name,sbLogo:s.logo}))).filter(p=>!q||p.name.toLowerCase().includes(q.toLowerCase()))
  return <div className="space-y-4">
    <Card className="p-4">
      <div className="flex flex-wrap items-baseline gap-2 mb-3"><h2 className="text-xl font-bold">Markenfamilien</h2><span className="text-sm text-muted-foreground">Kette → Eigen- &amp; Untermarken → Fertiggerichte · {B.total} Produkte{B.vision_gate?` · Vision Gate: ${B.vision_gate.pass}/${B.vision_gate.checked} Bilder bestanden`:''}</span></div>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">{B.families.map(f=><button key={f.id} onClick={()=>{setFam(f.id);setSub('')}} className={cn('rounded-xl border p-3 flex flex-col items-center gap-2 transition hover:shadow',fam===f.id&&'ring-2 ring-brand bg-brand/5')}>
        <img src={L(f.logo)!} alt={f.name} className="h-12 object-contain"/><div className="text-sm font-semibold">{f.name}</div><Badge>{f.count} Gerichte · {f.sub_brands.filter(s=>s.count).length} Marken</Badge></button>)}</div>
    </Card>
    <Card className="p-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
        <button onClick={()=>setSub('')} className={cn('rounded-xl border p-2 text-sm font-semibold',!sub&&'ring-2 ring-brand')}>Alle Marken<br/><span className="text-xs text-muted-foreground">{F.count} Gerichte</span></button>
        {subs.map(s=><button key={s.name} onClick={()=>setSub(s.name)} title={s.logo_source??''} className={cn('rounded-xl border p-2 flex flex-col items-center gap-1 hover:shadow transition',sub===s.name&&'ring-2 ring-brand bg-brand/5')}>
          <div className="h-14 w-full flex items-center justify-center">{s.logo?<img src={L(s.logo)!} alt={s.name} className="max-h-14 max-w-full object-contain"/>:<span className="text-lg font-black tracking-tight">{s.name}</span>}</div>
          <div className="text-xs font-medium text-center">{s.name}</div>
          <div className="flex gap-1 flex-wrap justify-center"><Badge>{s.count}</Badge>{s.logo_type==='aus Packung'&&<Badge className="bg-amber-100 text-amber-800">Logo aus Packung</Badge>}</div>
        </button>)}
      </div>
    </Card>
    <Card className="p-4">
      <div className="flex gap-2 items-center mb-3"><input value={q} onChange={e=>setQ(e.target.value)} placeholder="In dieser Familie suchen…" className="flex-1 rounded-lg border px-3 py-2 bg-transparent"/><span className="text-sm text-muted-foreground">{prods.length} Treffer</span></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">{prods.slice(0,300).map((p,i)=>{const id=p.url?byUrl.get(p.url):undefined;return <div key={i} onClick={()=>id!=null&&open(id)} className={cn('rounded-xl border overflow-hidden flex flex-col bg-card',id!=null&&'cursor-pointer hover:shadow-md')}>
        <div className="h-36 bg-white flex items-center justify-center relative">{p.img?<img loading="lazy" src={p.img} alt={p.name} className="max-h-36 object-contain"/>:<span className="text-4xl">🍲</span>}
          {p.sbLogo&&<img src={L(p.sbLogo)!} className="absolute top-2 left-2 h-7 max-w-[70px] object-contain bg-white/90 rounded p-0.5"/>}
          {p.health_score!=null&&<span className="absolute top-2 right-2 text-xs font-bold text-white rounded-full px-2 py-0.5" style={{background:scoreColor(p.health_score)}}>{fmt(p.health_score,0)}</span>}</div>
        <div className="p-3 flex-1 flex flex-col gap-1"><div className="text-xs text-muted-foreground">{p.sb} · {p.store}</div><div className="font-medium leading-snug">{p.name}</div>
          <div className="flex gap-3 text-sm mt-auto pt-1"><b>{p.price!=null?`€ ${fmt(p.price,2)}`:'–'}</b>{p.size_g&&<span>{fmt(p.size_g,0)} g</span>}{p.protein_100!=null&&<span>{fmt(p.protein_100)} g P/100g</span>}</div>
          {(p.manufacturer||p.producer_id)&&<div className="text-xs text-muted-foreground truncate">🏭 {p.manufacturer??''} {p.producer_id??''}</div>}
          <div className="text-xs flex gap-2">{p.price_status&&<span className="text-amber-700">{p.price_status}</span>}{p.source_url&&<a onClick={e=>e.stopPropagation()} href={p.source_url.startsWith('http')?p.source_url.split(' ')[0]:undefined} target="_blank" className="underline text-muted-foreground">Quelle</a>}</div></div>
      </div>})}</div>
    </Card>
  </div>
}
