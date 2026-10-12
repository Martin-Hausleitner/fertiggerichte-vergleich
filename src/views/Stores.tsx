import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Card } from '../components/ui'
import { StoreLogo } from '../components/product'
import { useApp, fmtDist } from '../lib'
const COL:Record<string,string>={Billa:'#eab308',Spar:'#16a34a',Hofer:'#2563eb',Lidl:'#0ea5e9',dm:'#db2777',Penny:'#dc2626'}
export default function Stores(){
  const {stores}=useApp(); const ref=useRef<HTMLDivElement>(null)
  useEffect(()=>{if(!stores||!ref.current)return
    const m=L.map(ref.current).setView([stores.home.lat,stores.home.lon],14)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap-Mitwirkende',maxZoom:19}).addTo(m)
    L.circleMarker([stores.home.lat,stores.home.lon],{radius:9,color:'#111',fillColor:'#fff',fillOpacity:1,weight:3}).addTo(m).bindPopup('<b>Zuhause</b><br>'+stores.home.addr)
    stores.shops.forEach(s=>L.circleMarker([s.lat,s.lon],{radius:7,color:COL[s.chain]??'#64748b',fillColor:COL[s.chain]??'#64748b',fillOpacity:.85}).addTo(m).bindPopup(`<b>${s.name}</b><br>${s.addr??''}<br>${fmtDist(s.walk_m??s.dist)}${s.walk_min?` · ${s.walk_min} Min. zu Fuß`:''}<br><a href="${s.gmaps}" target="_blank">Route in Google Maps</a>`))
    return()=>{m.remove()}},[stores])
  if(!stores) return <Card className="p-6 text-center text-slate-500">Filialdaten noch nicht verfügbar.</Card>
  const best:Record<string,typeof stores.shops[0]>={};stores.shops.forEach(s=>{if(!best[s.chain]||(s.walk_m??s.dist)<(best[s.chain].walk_m??best[s.chain].dist))best[s.chain]=s})
  return <div className="grid gap-3 lg:grid-cols-[2fr_1fr]"><Card className="overflow-hidden"><div ref={ref} style={{height:520}}/></Card>
    <div className="space-y-2"><p className="text-sm text-slate-500">Ausgangspunkt: <b>{stores.home.addr}</b>. Die Gehdistanz kommt von OSRM (Fußweg), sonst Luftlinie; die Filialen aus OpenStreetMap.</p>
      {Object.values(best).sort((a,b)=>(a.walk_m??a.dist)-(b.walk_m??b.dist)).map(s=><Card key={s.chain} className="p-3 flex items-center gap-3"><StoreLogo store={s.chain} size={30}/><div className="flex-1 min-w-0 text-sm"><div className="font-semibold truncate">{s.name}</div><div className="text-xs text-slate-500 truncate">{s.addr}</div>{s.hours&&<div className="text-[10px] text-slate-400 truncate">{s.hours}</div>}</div><div className="text-right"><div className="font-bold">{fmtDist(s.walk_m??s.dist)}</div>{s.walk_min&&<div className="text-xs text-slate-500">{s.walk_min} Min.</div>}<a href={s.gmaps} target="_blank" rel="noreferrer" className="text-xs text-sky-600 hover:underline">Route</a></div></Card>)}
      <details className="text-xs"><summary className="cursor-pointer text-slate-500">Alle {stores.shops.length} Filialen</summary>{stores.shops.map((s,i)=><div key={i} className="flex justify-between border-b py-1 dark:border-slate-800"><span>{s.chain} · {s.addr||s.name}</span><span>{fmtDist(s.walk_m??s.dist)}</span></div>)}</details></div></div>
}
