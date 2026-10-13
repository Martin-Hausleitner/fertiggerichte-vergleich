import { ChartContainer } from '../components/ui/chart'
import { useEffect, useMemo, useState } from 'react'
import { Treemap, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell } from 'recharts'
import { Progress } from '../components/ui/progress'
import { Card, Badge } from '../components/ui'
import { ZoomImage, StoreLogo, BrandLogo } from '../components/product'
import { prodColor, InfoTip } from '../components/info'
import { useApp, fmt, type Row } from '../lib'
type BT={coverage:any;tree:any[];same_product:any[];dishes:any[];items:any[];confidence_legend:Record<string,string>}
const LAND:Record<string,string>={'🇦🇹':'Österreich','🇩🇪':'Deutschland','🇬🇧':'Großbritannien','🇺🇸':'USA','🇮🇹':'Italien','🇳🇴':'Norwegen','🇨🇭':'Schweiz','🇫🇷':'Frankreich','🇸🇮':'Slowenien','🇹🇭':'Thailand','🇪🇸':'Spanien','🇷🇴':'Rumänien','🇭🇷':'Kroatien','🇧🇪':'Belgien','🇱🇺':'Luxemburg','🇰🇷':'Südkorea','🇻🇳':'Vietnam','🇳🇱':'Niederlande','🇵🇱':'Polen','🇯🇵':'Japan','🇸🇰':'Slowakei','🇨🇿':'Tschechien','🇭🇺':'Ungarn','🇺🇦':'Ukraine','🇩🇰':'Dänemark','🇸🇪':'Schweden','🇹🇷':'Türkei','🇬🇷':'Griechenland','🇮🇪':'Irland','🇮🇳':'Indien','🇨🇳':'China'}
const CONF:Record<string,string>={'confirmed-code':'✅ Identitätskennzeichen (amtlich)','label-address':'🏷️ Etikett-Adresse','recall/press':'📰 Presse/Rückruf'}
export default function WerDahinter(){
  const {R,open}=useApp(); const [d,setD]=useState<BT|null>(null); const [k,setK]=useState<string>(''); const [q,setQ]=useState(''); const [fl,setFl]=useState<string>('')
  useEffect(()=>{fetch('analysis/brand_tree.json').then(r=>r.json()).then(setD).catch(()=>setD(null))},[])
  const tm=useMemo(()=>d?d.tree.filter(t=>t.n>0).map(t=>({name:t.flag+' '+t.konzern,size:t.n,fill:prodColor(t.konzern)})):[],[d])
  const land=useMemo(()=>{if(!d) return {bars:[] as any[],known:0,unk:0,at:0,top:[] as any[]}
    const m=new Map<string,number>(); let unk=0
    d.tree.forEach(t=>{if(!t.n) return; if(!t.flag||t.flag==='🏳️'){unk+=t.n;return}; m.set(t.flag,(m.get(t.flag)||0)+t.n)})
    const known=[...m.values()].reduce((a,b)=>a+b,0)
    const bars=[...m.entries()].sort((a,b)=>b[1]-a[1]).map(([f,n])=>({f,l:f+' '+(LAND[f]||f),n,pct:Math.round(n/known*1000)/10}))
    const top=d.tree.filter(t=>t.n>0&&t.flag!=='🏳️').sort((a,b)=>b.n-a.n).slice(0,8).map(t=>({k:t.konzern,flag:t.flag,n:t.n,brands:t.producers.reduce((a:number,p:any)=>a+p.brands.length,0),pct:Math.round(t.n/known*1000)/10}))
    return {bars,known,unk,at:m.get('🇦🇹')||0,top}},[d])
  if(!d) return <Card className="p-6">Lade Hersteller-Baum …</Card>
  const row=(id:number)=>R[id] as Row|undefined
  const tree=d.tree.filter(t=>(!k||t.konzern===k)&&(!fl||t.flag===fl)&&(!q||JSON.stringify(t).toLowerCase().includes(q.toLowerCase())))
  return <div className="space-y-5">
    <Card className="p-4"><h2 className="text-2xl font-bold">🕵️ Wer steckt dahinter?</h2>
      <p className="text-sm text-slate-600 dark:text-slate-300">Konzern → Hersteller/Werk → Marken & Eigenmarken → Produkte. Belegt über Identitätskennzeichen (amtliche ÖVIS-Liste), Etikett-Adressen und Firmenprofile. {d.coverage.products_with_producer} Produkte zugeordnet, davon {d.coverage.confirmed_code} per Werkscode bestätigt. <InfoTip text="Bei vielen Eigenmarken steht nur der Händler (z. B. BILLA AG) als Inverkehrbringer am Etikett – das echte Werk ist dann unbekannt und wird nicht geraten."/></p>
      <div className="h-64 mt-3"><ChartContainer config={{}} className="aspect-auto h-full w-full"><Treemap data={tm} dataKey="size" stroke="#fff" onClick={(n:any)=>setK(k===n.name.slice(n.name.indexOf(' ')+1)?'':n.name.slice(n.name.indexOf(' ')+1))} content={<TmCell/> as any}><Tooltip formatter={(v:any)=>v+' Produkte'}/></Treemap></ChartContainer></div>
      <div className="flex gap-2 mt-2 items-center"><input className="border rounded-lg px-3 py-1.5 text-sm w-64 dark:bg-slate-900" placeholder="🔎 Hersteller, Marke …" value={q} onChange={e=>setQ(e.target.value)}/>{k&&<Badge className="cursor-pointer" onClick={()=>setK('')}>✕ {k}</Badge>}{fl&&<Badge className="cursor-pointer" onClick={()=>setFl('')}>✕ {fl} {LAND[fl]||fl}</Badge>}</div>
    </Card>
    <Card className="p-4"><div className="flex flex-wrap items-end justify-between gap-2"><div><h3 className="text-xl font-bold">🌍 Woher kommen die Konzerne?</h3>
      <p className="text-xs text-muted-foreground">Produkte nach Sitzland des Mutterkonzerns (nur belegte Zuordnungen). <InfoTip text="Land = Sitz der obersten Muttergesellschaft laut Hersteller-Baum, nicht Produktionsort. Produkte mit unbekanntem Konzern zählen nicht in die Prozente. Klick auf ein Land filtert den Konzern-Baum unten."/></p></div>
      <div className="flex flex-wrap gap-1.5 text-xs"><Badge className="bg-card border">🇦🇹 {land.known?Math.round(land.at/land.known*100):0} % österreichische Konzerne</Badge><Badge className="bg-card border">{land.bars.length} Länder · {land.known} Produkte</Badge><Badge className="bg-muted text-foreground border">🏳️ {land.unk} unabhängig/unbekannt</Badge></div></div>
      <div className="grid gap-4 lg:grid-cols-2 mt-3 min-w-0">
        <div className="min-w-0"><ChartContainer config={{}} className="aspect-auto w-full" style={{height:Math.max(180,land.bars.length*26)}}><BarChart data={land.bars} layout="vertical" margin={{left:4,right:28}}><CartesianGrid strokeDasharray="3 3" opacity={.3} horizontal={false}/><XAxis type="number" tick={{fontSize:10}}/><YAxis type="category" dataKey="l" width={120} tick={{fontSize:11}}/><Tooltip formatter={(v:any,_n:any,p:any)=>[v+' Produkte ('+p.payload.pct+' %)','Produkte']}/><Bar dataKey="n" radius={[0,6,6,0]} cursor="pointer" onClick={(b:any)=>setFl(fl===b?.f?'':(b?.f||''))}>{land.bars.map(b=><Cell key={b.f} opacity={fl&&fl!==b.f?0.35:1} fill={b.f==='🇦🇹'?'hsl(var(--primary))':'hsl(var(--muted-foreground))'}/>)}</Bar></BarChart></ChartContainer></div>
        <div className="space-y-2 min-w-0"><div className="text-xs font-medium text-muted-foreground">Top 8 Konzerne · Anteil an zugeordneten Produkten</div>{land.top.map(t=><button key={t.k} onClick={()=>setK(k===t.k?'':t.k)} className={'w-full text-left rounded-lg border px-2.5 py-1.5 hover:bg-muted/50 '+(k===t.k?'border-primary ring-1 ring-primary':'')}>
          <div className="flex items-center justify-between gap-2 text-sm"><span className="truncate font-medium" style={{color:prodColor(t.k)}}>{t.flag} {t.k}</span><span className="tabular-nums text-xs shrink-0">{t.n} · {t.pct} %</span></div>
          <Progress value={Math.min(100,t.pct*2)} className="h-1.5 mt-1"/><div className="text-[10px] text-muted-foreground mt-0.5">{t.brands} Marken/Eigenmarken</div></button>)}</div>
      </div></Card>
    <section><h3 className="text-xl font-bold mb-2">🔁 Gleiches Produkt, anderes Etikett</h3>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{d.same_product.map((s,i)=>{const rs=s.ids.map(row).filter(Boolean) as Row[]; return <Card key={i} className="p-3">
        <div className="flex justify-between gap-2"><div><div className="font-bold">{s.dish}</div><div className="text-xs text-slate-500">🏭 {s.producer} · {s.konzern}</div></div>
          {s.price_spread_pct!=null&&<Badge className={s.price_spread_pct>=30?'bg-foreground text-background h-fit':'bg-muted text-foreground h-fit border'}>gleicher Hersteller, Preisunterschied {s.price_spread_pct}%</Badge>}</div>
        <div className="text-[11px] mt-1">{s.kind} · {CONF[s.confidence]||s.confidence}</div>
        <div className="mt-2 space-y-1">{rs.sort((a,b)=>(a.p100g??99)-(b.p100g??99)).map(r=><div key={r.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 rounded" onClick={()=>open(r.id)}>
          <ZoomImage src={r.img} className="h-12 w-12"/><StoreLogo store={r.store} size={22}/><BrandLogo r={r} size={22}/><span className="text-sm flex-1 truncate">{r.name}</span>
          <span className="text-sm tabular-nums font-semibold">{fmt(r.price,2)} €</span><span className="text-xs text-slate-500 w-20 text-right">{fmt(r.p100g,2)} €/100g{r.id===s.cheapest&&' 🏆'}</span></div>)}</div></Card>})}</div></section>
    <section><h3 className="text-xl font-bold mb-2">🍲 Klassiker: wer macht sie?</h3>
      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">{d.dishes.map(x=><Card key={x.dishKey} className="p-3"><div className="font-bold">{x.dish} <span className="text-slate-500 font-normal">({x.n})</span></div>
        <div className="text-xs">{x.brands} Marken · {x.stores.map((s:string)=><span key={s} className="inline-block mr-1 align-middle"><StoreLogo store={s} size={16}/></span>)}</div>
        <div className="text-xs mt-1">🏭 {x.producers_known.join(', ')||'–'}</div><div className="text-[11px] text-slate-500">Hersteller unbekannt: {x.unknown_share}% · {fmt(x.p100g_min,2)}–{fmt(x.p100g_max,2)} €/100g</div></Card>)}</div></section>
    <section className="space-y-3"><h3 className="text-xl font-bold flex flex-wrap items-center gap-2">🌳 Konzern-Baum{fl&&<Badge className="cursor-pointer text-xs" onClick={()=>setFl('')}>nur {fl} {LAND[fl]||fl} · {tree.length} Konzerne ✕</Badge>}</h3>{tree.map(t=><Card key={t.konzern} className="p-3"><div className="text-lg font-bold" style={{color:prodColor(t.konzern)}}>{t.flag} {t.konzern} <span className="text-sm text-slate-500">· {t.n} Produkte</span></div>
      <div className="grid gap-2 md:grid-cols-2 mt-2">{t.producers.map((p:any)=><div key={p.name} className="rounded-lg border p-2">
        <div className="flex items-center gap-2">{p.logo?<img src={p.logo} className="h-10 max-w-28 object-contain"/>:<span className="text-2xl">🏭</span>}<div><div className="font-semibold text-sm">{p.name}</div><div className="text-[11px] text-slate-500">{p.role} · {CONF[p.confidence]||p.confidence}{p.codes.length?' · '+p.codes.join(', '):''}</div>{p.plants.length>0&&<div className="text-[11px]">📍 {p.plants.slice(0,2).join(' | ')}</div>}</div></div>
        <div className="mt-1 space-y-1">{p.brands.map((b:any)=>{const rs=b.ids.map(row).filter(Boolean) as Row[];return <div key={b.brand}><div className="text-xs font-medium flex items-center gap-1">🏷️ {b.brand} {b.stores.map((s:string)=><StoreLogo key={s} store={s} size={14}/>)} <span className="text-slate-500">({rs.length})</span></div>
          <div className="flex flex-wrap gap-1">{rs.slice(0,12).map(r=><span key={r.id} title={r.name+' · '+fmt(r.price,2)+' €'} onClick={()=>open(r.id)} className="cursor-pointer"><ZoomImage src={r.img} className="h-9 w-9"/></span>)}</div></div>})}</div></div>)}</div></Card>)}</section>
  </div>
}
function TmCell(p:any){const {x,y,width,height,name,fill}=p; if(width<2) return null; return <g><rect x={x} y={y} width={width} height={height} fill={fill||'#64748b'} stroke="#fff" style={{cursor:'pointer'}}/>{width>70&&height>20&&<text x={x+5} y={y+16} fill="#fff" fontSize={12}>{String(name).slice(0,Math.floor(width/7))}</text>}</g>}
