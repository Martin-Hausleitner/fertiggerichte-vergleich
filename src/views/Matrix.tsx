import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Factory } from 'lucide-react'
import { Card } from '../components/ui'
import { Gallery, StoreLogo, BrandLogo, ZoomImage } from '../components/product'
import { prodColor, Flag, InfoTip } from '../components/info'
import { useApp, type Row } from '../lib'
import HeatMatrix from './HeatMatrix'
export default function Matrix(){
  const {D,R,stores,nearest}=useApp()
  const P=useMemo(()=>(D.producers||[]).filter((p:any)=>p.ids.length).sort((a:any,b:any)=>b.ids.length-a.ids.length),[D])
  const rowsOf=(p:any)=>p.ids.map((i:number)=>R[i]).filter(Boolean) as Row[]
  const brands=useMemo(()=>{const c:Record<string,number>={};P.forEach((p:any)=>rowsOf(p).forEach(r=>c[r.brandN]=(c[r.brandN]??0)+1));return Object.entries(c).sort((a,b)=>b[1]-a[1]).slice(0,16).map(x=>x[0])},[P,R])
  const chains=useMemo(()=>[...new Set(P.flatMap((p:any)=>rowsOf(p).map(r=>r.store)))] as string[],[P,R])
  const [sel,setSel]=useState<{p:string;k:string;v:string}|null>(null)
  const logoOf=(b:string)=>R.find(r=>r.brandN===b&&r.logo)?.logo??null
  const selRows=sel?rowsOf(P.find((p:any)=>p.slug===sel.p)).filter(r=>sel.k==='b'?r.brandN===sel.v:r.store===sel.v):[]
  const ref=useRef<HTMLDivElement>(null)
  useEffect(()=>{if(!ref.current)return;const m=L.map(ref.current,{scrollWheelZoom:false});L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap'}).addTo(m);const b=L.latLngBounds([])
    if(stores){L.circleMarker([stores.home.lat,stores.home.lon],{radius:9,color:'#000',fillColor:'#facc15',fillOpacity:1}).addTo(m).bindPopup('🏠 Gruberstraße 19, Linz');b.extend([stores.home.lat,stores.home.lon])}
    P.forEach((p:any)=>{const c=prodColor(p.slug);const ch=[...new Set(rowsOf(p).map(r=>r.store))] as string[];p.plants.forEach((pl:any)=>{if(pl.lat==null)return;L.circleMarker([pl.lat,pl.lon],{radius:9,color:c,fillColor:c,fillOpacity:.9}).addTo(m).bindPopup(`<b>🏭 ${p.legal||p.name}</b><br>${pl.address}<br>liefert an: ${ch.join(', ')}`);b.extend([pl.lat,pl.lon])
      ch.forEach(s=>{const sh=nearest(s);if(sh){L.polyline([[pl.lat,pl.lon],[sh.lat,sh.lon]],{color:c,weight:2,opacity:.55,dashArray:'6 4'}).addTo(m).bindTooltip(`${p.name} → ${s} ${sh.addr??''}`)}})})})
    stores?.shops.forEach(s=>{if(chains.includes(s.chain)&&nearest(s.chain)===s){L.marker([s.lat,s.lon],{icon:L.divIcon({className:'',html:`<div style="background:#fff;border:2px solid #333;border-radius:6px;padding:1px 4px;font-size:10px;font-weight:700;white-space:nowrap">${s.chain}</div>`})}).addTo(m).bindPopup(`${s.name}<br>${s.addr??''}`)}})
    if(b.isValid())m.fitBounds(b.pad(.1));return()=>{m.remove()}},[P,stores,chains])
  const cell=(p:any,k:'b'|'s',v:string)=>{const n=rowsOf(p).filter(r=>k==='b'?r.brandN===v:r.store===v).length;const c=prodColor(p.slug);const on=sel?.p===p.slug&&sel?.v===v
    return <td key={k+v} className="p-0.5 text-center"><button disabled={!n} onClick={()=>setSel(on?null:{p:p.slug,k,v})} style={n?{background:c+(on?'':'22'),color:on?'#fff':c,borderColor:c}:{}} className={'h-9 w-full min-w-[44px] rounded-md text-sm font-bold '+(n?'border':'text-slate-300')}>{n||'·'}</button></td>}
  return <div className="space-y-3"><HeatMatrix/><p className="text-sm text-slate-500 flex items-center gap-1">Welcher Hersteller beliefert welche Marke und welche Kette? Die Zahl im Feld ist die Anzahl der Produkte im Vergleich; ein Klick zeigt sie unten an.<InfoTip text="Die Zuordnung Hersteller → Produkt stammt aus dem Identitätskennzeichen auf der Packung, den Herstellerangaben und der Recherche (siehe Konfidenz am Produkt)."/></p>
    <Card className="p-2 overflow-x-auto"><table className="text-xs border-separate border-spacing-0"><thead><tr><th className="sticky left-0 bg-white dark:bg-slate-900 z-10 min-w-[230px]"/>{brands.map(b=><th key={b} className="p-1 align-bottom"><div className="flex flex-col items-center gap-1 w-[70px]"><BrandLogo r={{brandN:b,logo:logoOf(b)}} size={30}/><span className="text-[10px] truncate w-full">{b}</span></div></th>)}<th className="w-3"/>{chains.map(s=><th key={s} className="p-1 align-bottom bg-slate-50 dark:bg-slate-800/50"><StoreLogo store={s} size={30}/></th>)}</tr></thead>
      <tbody>{P.map((p:any)=><tr key={p.slug} className="border-t dark:border-slate-800"><td className="sticky left-0 bg-white dark:bg-slate-900 z-10 p-1.5" style={{borderLeft:`5px solid ${prodColor(p.slug)}`}}><a href={'#tab=hersteller-seiten&h='+p.slug} className="flex items-center gap-2">{p.logo?<ZoomImage logo src={p.logo} className="h-10 w-14"/>:<Factory className="text-slate-400" size={28}/>}<div className="leading-tight"><div className="font-semibold" style={{color:prodColor(p.slug)}}>{p.legal||p.name}</div><div className="text-[10px] text-slate-500 flex gap-1 items-center"><Flag state={p.plants[0]?.state} text={(p.plants[0]?.address||'')+' '+(p.legal||p.name)} code={p.plants[0]?.approval_code}/>{p.plants[0]?.town??''}</div></div></a></td>{brands.map(b=>cell(p,'b',b))}<td/>{chains.map(s=>cell(p,'s',s))}</tr>)}</tbody></table></Card>
    {sel&&<div><h3 className="font-semibold mb-2">{P.find((p:any)=>p.slug===sel.p)?.name} × {sel.v} ({selRows.length})</h3><Gallery rows={selRows}/></div>}
    <Card className="p-2"><h3 className="font-semibold text-sm p-1">🗺️ Werke → nächste Linzer Filiale der belieferten Ketten</h3><div ref={ref} style={{height:480}} className="rounded-xl overflow-hidden"/></Card></div>
}
