import { useEffect, useMemo, useState } from 'react'
import { ResponsiveContainer, Treemap, Tooltip } from 'recharts'
import { Card, Badge } from '../components/ui'
import { ZoomImage, StoreLogo, BrandLogo } from '../components/product'
import { prodColor, InfoTip } from '../components/info'
import { useApp, fmt, type Row } from '../lib'
type BT={coverage:any;tree:any[];same_product:any[];dishes:any[];items:any[];confidence_legend:Record<string,string>}
const CONF:Record<string,string>={'confirmed-code':'✅ Identitätskennzeichen (amtlich)','label-address':'🏷️ Etikett-Adresse','recall/press':'📰 Presse/Rückruf'}
export default function WerDahinter(){
  const {R,open}=useApp(); const [d,setD]=useState<BT|null>(null); const [k,setK]=useState<string>(''); const [q,setQ]=useState('')
  useEffect(()=>{fetch('analysis/brand_tree.json').then(r=>r.json()).then(setD).catch(()=>setD(null))},[])
  const tm=useMemo(()=>d?d.tree.filter(t=>t.n>0).map(t=>({name:t.flag+' '+t.konzern,size:t.n,fill:prodColor(t.konzern)})):[],[d])
  if(!d) return <Card className="p-6">Lade Hersteller-Baum …</Card>
  const row=(id:number)=>R[id] as Row|undefined
  const tree=d.tree.filter(t=>(!k||t.konzern===k)&&(!q||JSON.stringify(t).toLowerCase().includes(q.toLowerCase())))
  return <div className="space-y-5">
    <Card className="p-4"><h2 className="text-2xl font-bold">🕵️ Wer steckt dahinter?</h2>
      <p className="text-sm text-slate-600 dark:text-slate-300">Konzern → Hersteller/Werk → Marken & Eigenmarken → Produkte. Belegt über Identitätskennzeichen (amtliche ÖVIS-Liste), Etikett-Adressen und Firmenprofile. {d.coverage.products_with_producer} Produkte zugeordnet, davon {d.coverage.confirmed_code} per Werkscode bestätigt. <InfoTip text="Bei vielen Eigenmarken steht nur der Händler (z. B. BILLA AG) als Inverkehrbringer am Etikett – das echte Werk ist dann unbekannt und wird nicht geraten."/></p>
      <div className="h-64 mt-3"><ResponsiveContainer><Treemap data={tm} dataKey="size" stroke="#fff" onClick={(n:any)=>setK(k===n.name.slice(n.name.indexOf(' ')+1)?'':n.name.slice(n.name.indexOf(' ')+1))} content={<TmCell/> as any}><Tooltip formatter={(v:any)=>v+' Produkte'}/></Treemap></ResponsiveContainer></div>
      <div className="flex gap-2 mt-2 items-center"><input className="border rounded-lg px-3 py-1.5 text-sm w-64 dark:bg-slate-900" placeholder="🔎 Hersteller, Marke …" value={q} onChange={e=>setQ(e.target.value)}/>{k&&<Badge className="cursor-pointer" onClick={()=>setK('')}>✕ {k}</Badge>}</div>
    </Card>
    <section><h3 className="text-xl font-bold mb-2">🔁 Gleiches Produkt, anderes Etikett</h3>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{d.same_product.map((s,i)=>{const rs=s.ids.map(row).filter(Boolean) as Row[]; return <Card key={i} className="p-3 border-l-4" style={{borderLeftColor:prodColor(s.producer)}}>
        <div className="flex justify-between gap-2"><div><div className="font-bold">{s.dish}</div><div className="text-xs text-slate-500">🏭 {s.producer} · {s.konzern}</div></div>
          {s.price_spread_pct!=null&&<Badge className={s.price_spread_pct>=30?'bg-red-600 text-white h-fit':'bg-amber-500 text-white h-fit'}>gleicher Hersteller, Preisunterschied {s.price_spread_pct}%</Badge>}</div>
        <div className="text-[11px] mt-1">{s.kind} · {CONF[s.confidence]||s.confidence}</div>
        <div className="mt-2 space-y-1">{rs.sort((a,b)=>(a.p100g??99)-(b.p100g??99)).map(r=><div key={r.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 rounded" onClick={()=>open(r.id)}>
          <ZoomImage src={r.img} className="h-12 w-12"/><StoreLogo store={r.store} size={22}/><BrandLogo r={r} size={22}/><span className="text-sm flex-1 truncate">{r.name}</span>
          <span className="text-sm tabular-nums font-semibold">{fmt(r.price,2)} €</span><span className="text-xs text-slate-500 w-20 text-right">{fmt(r.p100g,2)} €/100g{r.id===s.cheapest&&' 🏆'}</span></div>)}</div></Card>})}</div></section>
    <section><h3 className="text-xl font-bold mb-2">🍲 Klassiker: wer macht sie?</h3>
      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">{d.dishes.map(x=><Card key={x.dishKey} className="p-3"><div className="font-bold">{x.dish} <span className="text-slate-500 font-normal">({x.n})</span></div>
        <div className="text-xs">{x.brands} Marken · {x.stores.map((s:string)=><span key={s} className="inline-block mr-1 align-middle"><StoreLogo store={s} size={16}/></span>)}</div>
        <div className="text-xs mt-1">🏭 {x.producers_known.join(', ')||'–'}</div><div className="text-[11px] text-slate-500">Hersteller unbekannt: {x.unknown_share}% · {fmt(x.p100g_min,2)}–{fmt(x.p100g_max,2)} €/100g</div></Card>)}</div></section>
    <section className="space-y-3"><h3 className="text-xl font-bold">🌳 Konzern-Baum</h3>{tree.map(t=><Card key={t.konzern} className="p-3"><div className="text-lg font-bold" style={{color:prodColor(t.konzern)}}>{t.flag} {t.konzern} <span className="text-sm text-slate-500">· {t.n} Produkte</span></div>
      <div className="grid gap-2 md:grid-cols-2 mt-2">{t.producers.map((p:any)=><div key={p.name} className="rounded-lg border p-2" style={{borderColor:prodColor(p.name)}}>
        <div className="flex items-center gap-2">{p.logo?<img src={p.logo} className="h-10 max-w-28 object-contain"/>:<span className="text-2xl">🏭</span>}<div><div className="font-semibold text-sm">{p.name}</div><div className="text-[11px] text-slate-500">{p.role} · {CONF[p.confidence]||p.confidence}{p.codes.length?' · '+p.codes.join(', '):''}</div>{p.plants.length>0&&<div className="text-[11px]">📍 {p.plants.slice(0,2).join(' | ')}</div>}</div></div>
        <div className="mt-1 space-y-1">{p.brands.map((b:any)=>{const rs=b.ids.map(row).filter(Boolean) as Row[];return <div key={b.brand}><div className="text-xs font-medium flex items-center gap-1">🏷️ {b.brand} {b.stores.map((s:string)=><StoreLogo key={s} store={s} size={14}/>)} <span className="text-slate-500">({rs.length})</span></div>
          <div className="flex flex-wrap gap-1">{rs.slice(0,12).map(r=><span key={r.id} title={r.name+' · '+fmt(r.price,2)+' €'} onClick={()=>open(r.id)} className="cursor-pointer"><ZoomImage src={r.img} className="h-9 w-9"/></span>)}</div></div>})}</div></div>)}</div></Card>)}</section>
  </div>
}
function TmCell(p:any){const {x,y,width,height,name,fill}=p; if(width<2) return null; return <g><rect x={x} y={y} width={width} height={height} fill={fill||'#64748b'} stroke="#fff" style={{cursor:'pointer'}}/>{width>70&&height>20&&<text x={x+5} y={y+16} fill="#fff" fontSize={12}>{String(name).slice(0,Math.floor(width/7))}</text>}</g>}
