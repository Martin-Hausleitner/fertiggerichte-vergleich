import { isRowRankable, rowPli } from '../app/meal'
import { useMemo, useState } from 'react'
import { Card } from '../components/ui'
import { StoreLogo, BrandLogo, Gallery } from '../components/product'
import { InfoTip, prodColor } from '../components/info'
import { useApp, fmt, type Row } from '../lib'
const med=(a:(number|null)[])=>{const s=a.filter((x):x is number=>x!=null).sort((x,y)=>x-y);return s.length?s[Math.floor(s.length/2)]:null}
const M:[string,string,(rs:Row[])=>number|null,boolean][]=[['n','🛒 Anzahl',rs=>rs.length||null,false],['pli','⭐ Median PLI',rs=>med(rs.map(r=>rowPli(r))),false],['e','⚖️ Median €/10 g P',rs=>med(rs.map(r=>r.eur10p)),true],['s','💚 Median Score',rs=>med(rs.map(r=>r.score)),false]]
export default function HeatMatrix(){
  const {R,D,stores}=useApp(); const [mode,setMode]=useState<'brand'|'herst'>('brand'),[met,setMet]=useState('n'),[sel,setSel]=useState<{row:string;c:string}|null>(null)
  const rows=useMemo(()=>R.filter(r=>isRowRankable(r)&&!r.nonfood&&!r.store.startsWith('unbekannt')),[R])
  const keyOf=(r:Row)=>mode==='brand'?(r.noBrand?null:r.brandN):((r as any).p2?.producer||r.herst||null)
  const chains=useMemo(()=>[...new Set(rows.map(r=>r.store))].sort((a,b)=>rows.filter(r=>r.store===b).length-rows.filter(r=>r.store===a).length),[rows])
  const branches=(c:string)=>(stores?.shops??[]).filter(s=>s.chain===c).sort((a,b)=>(a.walk_m??a.dist)-(b.walk_m??b.dist)).slice(0,2)
  const R2=useMemo(()=>{const g:Record<string,Row[]>={};rows.forEach(r=>{const k=keyOf(r);if(k)(g[k]??=[]).push(r)});return Object.entries(g).sort((a,b)=>b[1].length-a[1].length).slice(0,30)},[rows,mode])
  const m=M.find(x=>x[0]===met)!; const vals=R2.flatMap(([,rs])=>chains.map(c=>m[2](rs.filter(r=>r.store===c)))).filter((x):x is number=>x!=null); const lo=Math.min(...vals),hi=Math.max(...vals)
  const color=(v:number|null)=>{if(v==null)return undefined;let t=hi>lo?(v-lo)/(hi-lo):1;if(met==='n')t=Math.sqrt(t);if(m[3])t=1-t;return met==='n'?`hsla(152,60%,${92-t*55}%,1)`:`hsl(${t*130},65%,${88-t*40}%)`}
  const logoOf=(b:string)=>R.find(r=>r.brandN===b&&r.logo)?.logo??null
  const selRows=sel?(R2.find(x=>x[0]===sel.row)?.[1]??[]).filter(r=>r.store===sel.c):[]
  return <Card className="p-3 space-y-2"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">🔥 Heatmap: Anbieter × Kette × Filiale</h3><InfoTip text="Zeilen = Marke oder Hersteller (Top 30), Spalten = Kette und ihre 2 nächsten Filialen ab Gruberstraße 19. Die Filialspalten übernehmen das Kettensortiment (Verfügbarkeit nur auf Kettenebene bekannt). Nur vergleichbare Gerichte aus den Rankings."/>
    <div className="ml-auto flex gap-1">{(['brand','herst'] as const).map(x=><button key={x} onClick={()=>setMode(x)} className={'rounded-lg border px-2 py-1 text-xs '+(mode===x?'bg-brand text-white border-brand':'dark:border-slate-700')}>{x==='brand'?'🏷️ Marken':'🏭 Hersteller'}</button>)}<span className="w-2"/>{M.map(([k,l])=><button key={k} onClick={()=>setMet(k)} className={'rounded-lg border px-2 py-1 text-xs '+(met===k?'bg-slate-900 text-white dark:bg-white dark:text-slate-900':'dark:border-slate-700')}>{l}</button>)}</div></div>
    <div className="overflow-x-auto"><table className="text-xs border-separate border-spacing-0.5"><thead><tr><th className="sticky left-0 z-10 bg-white dark:bg-slate-900 min-w-[170px]"/>{chains.map(c=>[<th key={c} className="p-1 align-bottom"><StoreLogo store={c} size={34}/></th>,...branches(c).map((b,i)=><th key={c+i} className="p-1 align-bottom font-normal text-[9px] text-slate-500 max-w-[70px]"><div className="truncate w-[70px]" title={b.addr??b.name}>📍 {(b.addr??b.name).split(',')[0]}</div><div>{Math.round(b.walk_m??b.dist)} m</div></th>)])}</tr></thead>
      <tbody>{R2.map(([k,rs])=><tr key={k}><td className="sticky left-0 z-10 bg-white dark:bg-slate-900 pr-2"><div className="flex items-center gap-2">{mode==='brand'?<BrandLogo r={{brandN:k,logo:logoOf(k)}} size={26}/>:<span className="h-3 w-3 rounded-full shrink-0" style={{background:prodColor(k)}}/>}<span className="truncate max-w-[130px] font-medium">{k}</span></div></td>
        {chains.map(c=>{const sub=rs.filter(r=>r.store===c);const v=m[2](sub);const cell=(br:boolean,i?:number)=><td key={c+(br?i:'')} onClick={()=>sub.length&&setSel({row:k,c})} title={`${k} @ ${c}: ${sub.length} Produkte`} className={'h-9 min-w-[48px] text-center rounded-md tabular-nums '+(sub.length?'cursor-pointer hover:ring-2 hover:ring-brand':'')+(br?' opacity-60 bg-stripes':' font-bold')} style={{background:color(v)}}>{v==null?'':met==='n'?v:fmt(v,met==='e'?2:0)}</td>
          return [cell(false),...branches(c).map((_,i)=>cell(true,i))]})}</tr>)}</tbody></table></div>
    <p className="text-[11px] text-slate-500">Blasse Spalten = Filialen; Sortiment dort laut Kette (nicht filialgenau).</p>
    {sel&&<div><div className="flex items-center gap-2 mb-2"><b>{sel.row}</b> @ <StoreLogo store={sel.c} size={26}/><span className="text-sm text-slate-500">{selRows.length} Produkte</span><button onClick={()=>setSel(null)} className="ml-auto text-slate-400">✕</button></div><Gallery rows={selRows} step={12}/></div>}
  </Card>
}
