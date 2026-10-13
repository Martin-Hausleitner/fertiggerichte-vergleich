import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts'
import { Card, Badge } from '../components/ui'
import { StoreLogo, Gallery } from '../components/product'
import { InfoTip } from '../components/info'
import { useApp, fmtDist, fmt, STORE_LOGO } from '../lib'
const COL:Record<string,string>={Billa:'#eab308',Spar:'#16a34a',Hofer:'#2563eb',Lidl:'#0ea5e9',dm:'#db2777',Penny:'#dc2626','Fit to Go':'#f97316'}
const med=(a:(number|null)[])=>{const s=a.filter((x):x is number=>x!=null).sort((x,y)=>x-y);return s.length?s[Math.floor(s.length/2)]:null}
export default function Stores(){
  const {stores,R}=useApp(); const ref=useRef<HTMLDivElement>(null); const map=useRef<L.Map|null>(null)
  const [sel,setSel]=useState<number|null>(null),[chain,setChain]=useState(''),[n,setN]=useState(15)
  const shops=useMemo(()=>(stores?.shops??[]).map((s,i)=>({...s,i})).filter(s=>!chain||s.chain===chain).sort((a,b)=>(a.walk_m??a.dist)-(b.walk_m??b.dist)),[stores,chain])
  const byChain=useMemo(()=>{const g:Record<string,typeof R>={};R.filter(r=>r.rankable).forEach(r=>(g[r.store]??=[]).push(r));return g},[R])
  useEffect(()=>{if(!stores||!ref.current)return
    const m=L.map(ref.current).setView([stores.home.lat,stores.home.lon],14);map.current=m
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap-Mitwirkende',maxZoom:19}).addTo(m)
    L.marker([stores.home.lat,stores.home.lon],{icon:L.divIcon({className:'',html:'<div style="font-size:26px;line-height:26px">🏠</div>',iconSize:[26,26],iconAnchor:[13,13]})}).addTo(m).bindPopup('<b>Zuhause</b><br>'+stores.home.addr)
    shops.forEach(s=>{const logo=STORE_LOGO[s.chain];const ic=L.divIcon({className:'',html:`<div style="background:#fff;border:2px solid ${COL[s.chain]??'#64748b'};border-radius:8px;padding:2px;box-shadow:0 2px 6px rgba(0,0,0,.3);width:46px;height:24px;overflow:hidden;box-sizing:border-box;display:flex;align-items:center;justify-content:center">${logo?`<img src="${logo}" width="40" height="18" style="width:40px!important;height:18px!important;max-width:40px!important;object-fit:contain;padding:0;margin:0"/>`:`<b style="font-size:9px">${s.chain}</b>`}</div>`,iconSize:[46,24],iconAnchor:[23,12]})
      L.marker([s.lat,s.lon],{icon:ic}).addTo(m).bindPopup(`<b>${s.name}</b><br>${s.addr??''}<br>🚶 ${fmtDist(s.walk_m??s.dist)}${s.walk_min?` · ${s.walk_min} min`:''}<br><a href="${s.gmaps}" target="_blank">Google Maps</a>`).on('click',()=>setSel(s.i))})
    return()=>{m.remove();map.current=null}},[stores,shops])
  if(!stores) return <Card className="p-6 text-center text-slate-500">Filialdaten noch nicht verfügbar.</Card>
  const chains=[...new Set(stores.shops.map(s=>s.chain))]
  const cur=sel!=null?stores.shops[sel]:null; const curRows=cur?[...(byChain[cur.chain]||[])].sort((a,b)=>(b.pli??0)-(a.pli??0)):[]
  const chart=chains.map(c=>({c,n:(byChain[c]||[]).length,pli:med((byChain[c]||[]).map(r=>r.pli)),e:med((byChain[c]||[]).map(r=>r.eur10p)),d:Math.min(...stores.shops.filter(s=>s.chain===c).map(s=>s.walk_m??s.dist))})).filter(x=>x.n)
  return <div className="space-y-3">
    <div className="flex flex-wrap gap-2 items-center"><button onClick={()=>setChain('')} className={'rounded-xl border-2 px-3 py-1.5 text-sm '+(!chain?'border-brand bg-brand/10':'border-slate-200 dark:border-slate-700')}>Alle Ketten</button>{chains.map(c=><button key={c} onClick={()=>setChain(chain===c?'':c)} className={'rounded-xl border-2 px-2 py-1 '+(chain===c?'border-brand bg-brand/10':'border-slate-200 dark:border-slate-700')}><StoreLogo store={c} size={26}/></button>)}
      <span className="text-xs text-slate-500 ml-auto">{shops.length} Filialen (OpenStreetMap) · ab {stores.home.addr}</span></div>
    <div className="grid gap-3 lg:grid-cols-[1.6fr_1fr]"><Card className="overflow-hidden"><div ref={ref} style={{height:560}}/></Card>
      <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">{shops.slice(0,n).map(s=>{const rs=byChain[s.chain]||[];return <Card key={s.i} onClick={()=>{setSel(s.i);map.current?.setView([s.lat,s.lon],16)}} className={'p-3 flex items-center gap-3 cursor-pointer hover:shadow-md transition '+(sel===s.i?'ring-2 ring-brand':'')}>
        <StoreLogo store={s.chain} size={48}/><div className="flex-1 min-w-0"><div className="font-semibold text-sm truncate">{s.name}</div><div className="text-xs text-slate-500 truncate">{s.addr}</div>{s.hours&&<div className="text-[10px] text-slate-400 truncate">🕒 {s.hours}</div>}<div className="text-xs mt-0.5"><InfoTip text="Sortiment auf Kettenebene: welche Produkte genau in dieser Filiale stehen, ist nicht bekannt. Gezählt sind die vergleichbaren Fertiggerichte der Kette."><Badge className="bg-slate-100 dark:bg-slate-800">🛒 {rs.length} Gerichte (Kette)</Badge></InfoTip></div></div>
        <div className="text-right"><div className="text-lg font-bold text-sky-700 dark:text-sky-300 tabular-nums">{Math.round(s.walk_m??s.dist)} m</div><div className="text-[11px] text-slate-500">🚶 {s.walk_min??Math.round((s.walk_m??s.dist)/80)} min</div><a href={s.gmaps} target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()} className="text-[11px] text-brand underline">Route</a></div></Card>})}
        {n<shops.length&&<button onClick={()=>setN(n+20)} className="w-full text-sm text-brand py-2">Mehr Filialen ({shops.length-n})</button>}</div></div>
    <div className="grid gap-3 md:grid-cols-3">{[['n','🛒 Vergleichbare Gerichte je Kette','Anzahl'],['pli','⭐ Median PLI je Kette','PLI'],['e','⚖️ Median €/10 g Protein','€']].map(([k,t,u])=><Card key={k} className="p-3"><h4 className="text-sm font-semibold mb-1">{t}</h4><ResponsiveContainer width="100%" height={200}><BarChart data={chart} margin={{left:-20}}><CartesianGrid strokeDasharray="3 3" opacity={.3}/><XAxis dataKey="c" tick={{fontSize:10}}/><YAxis tick={{fontSize:10}}/><Tooltip formatter={(v:any)=>[fmt(v,2),u]}/><Bar dataKey={k}>{chart.map(x=><Cell key={x.c} fill={COL[x.c]??'#64748b'}/>)}</Bar></BarChart></ResponsiveContainer></Card>)}</div>
    {cur&&<Card className="p-4 space-y-2"><div className="flex items-center gap-3"><StoreLogo store={cur.chain} size={56}/><div><div className="text-lg font-bold">{cur.name}</div><div className="text-sm text-slate-500">{cur.addr} · 🚶 {fmtDist(cur.walk_m??cur.dist)}</div></div><Badge className="ml-auto bg-amber-100 text-amber-800">Verfügbarkeit auf Kettenebene</Badge><button onClick={()=>setSel(null)} className="text-slate-400">✕</button></div>
      <Gallery rows={curRows} step={12}/></Card>}
  </div>
}
