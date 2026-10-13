import { useState } from 'react'
import { Gallery } from '../components/product'
import { Button } from '../components/ui'
import { useApp, healthyCheap, type Row } from '../lib'
import { isReadyMeal } from '../app/meal'
export default function Top(){
  const {R,D}=useApp(); const [k,setK]=useState<'hc'|'pli'|'h'|'pe'|'cheap'|'light'>('hc'),[min,setMin]=useState(45)
  const cheap=R.filter(r=>r.rankable&&r.eur10p!=null&&r.pstat==='live 2026').sort((a,b)=>a.eur10p!-b.eur10p!).slice(0,30)
  const L={pli:D.topPLI,h:D.topHealth,pe:D.topPE,light:D.topLight||[]}
  const withPli=(rows:Row[])=>rows.map(r=>r.pli!=null?r:{...r,pli:r.pliLight??null})
  const rows=(k==='hc'?healthyCheap(R,min).slice(0,30):k==='cheap'?cheap:k==='light'?withPli(L.light.map(i=>R[i])):L[k].map(i=>R[i])).filter(r=>r&&isReadyMeal(r))
  const txt={hc:`Gesund & günstig: nur Health-Score ≥ ${min}, sortiert nach € pro 10 g Protein (günstigstes zuerst).`,pli:'Preis-Leistungs-Index: 50 % Health-Score + 50 % Protein pro € (20 g/€ = 100 Punkte).',h:'Höchster Health-Score.',pe:'Meiste Gramm Protein pro Euro.',cheap:'Günstigstes Protein: niedrigster Preis pro 10 g Protein.',light:'Leichte Mahlzeiten (300–400 kcal/Portion): gleicher PLI wie oben, eigene Rangliste. Trockenprodukte, Desserts, Snacks und Babynahrung bleiben außen vor.'}
  return <div className="space-y-3"><div className="flex flex-wrap gap-1">{([['hc','🥇 Gesund & günstig'],['pli','🏆 Preis-Leistung'],['light','🥗 Leichte Mahlzeiten'],['h','💚 Gesündeste'],['pe','💪 Protein pro €'],['cheap','💶 Günstigstes Protein']] as const).map(([v,l])=><Button key={v} active={k===v} onClick={()=>setK(v)}>{l}</Button>)}{k==='hc'&&<label className="text-sm flex items-center gap-2 ml-2">Mindest-Score {min}<input type="range" min={30} max={65} value={min} onChange={e=>setMin(+e.target.value)} className="accent-[#1b6e3a]"/></label>}</div>
    <p className="text-sm text-slate-500">{txt[k]} Top 30, nur Produkte mit vollständigen Nährwerten, ohne Trocken- und Großpackungen{k!=='h'?', nur Preise 2026':''}. Gleiches Produkt über Läden zählt nur einmal (bester Preis; ggf. „auch bei …").</p><Gallery rows={rows} step={30}/></div>
}
