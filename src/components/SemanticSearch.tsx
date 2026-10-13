import { useEffect, useMemo, useRef, useState } from 'react'
import { Command } from 'cmdk'
import { Search, Sparkles, Loader2 } from 'lucide-react'
import { useApp, cn, fmt, type Row } from '../lib'
import { STAGES } from './info'
import { Img, BrandLogo, StoreLogo, PliBadge } from './product'

// local embedding engine (transformers.js, quantized q8, lazy-loaded, browser-cached)
type Emb={model:string;dim:number;ids:number[];scales:number[];E:Int8Array}
let embP:Promise<Emb>|null=null, extP:Promise<any>|null=null
const loadEmb=()=>embP??=Promise.all([fetch('./embeddings.json?v='+__BUILD__).then(r=>r.json()),fetch('./embeddings.bin?v='+__BUILD__).then(r=>r.arrayBuffer())]).then(([m,b])=>({...m,E:new Int8Array(b)}))
const loadExt=(model:string)=>extP??=import('@huggingface/transformers').then(t=>{t.env.allowLocalModels=false;t.env.useBrowserCache=true;return t.pipeline('feature-extraction',model,{dtype:'q8'})})
const norm=(s:string)=>s.toLowerCase().replace(/ß/g,'ss').normalize('NFD').replace(/[\u0300-\u036f]/g,'')
function fuzzy(q:string,r:Row){const hay=norm([r.name,r.brandN,r.store,r.herst,...(r.cprot||[]),...(r.cdish||[])].join(' '));const ws=norm(q).split(/\s+/).filter(w=>w.length>2);if(!ws.length)return 0
  let h=0;for(const w of ws){if(hay.includes(w))h+=1;else if(w.length>4&&hay.includes(w.slice(0,w.length-2)))h+=.6};return h/ws.length}

export function SearchPalette(){const {R,open}=useApp()
  const [show,setShow]=useState(false),[q,setQ]=useState(''),[res,setRes]=useState<[number,Row][]>([])
  const [stage,setStage]=useState<string[]>([]),[chain,setChain]=useState<string[]>([]),[hp,setHp]=useState(false)
  const [st,setSt]=useState<'idle'|'loading'|'ready'|'error'>('idle'), seq=useRef(0)
  const chains=useMemo(()=>[...new Set(R.map(r=>r.store))].filter(Boolean).sort(),[R])
  useEffect(()=>{const k=(e:KeyboardEvent)=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();setShow(s=>!s)}};addEventListener('keydown',k);return()=>removeEventListener('keydown',k)},[])
  useEffect(()=>{if(show&&st==='idle'){setSt('loading');loadEmb().then(m=>loadExt(m.model)).then(()=>setSt('ready')).catch(e=>{console.error(e);setSt('error')})}},[show])
  useEffect(()=>{const my=++seq.current;const t=setTimeout(async()=>{
    const pass=(r:Row)=>(stage.length?stage.includes(r.stage):r.stage!=='base')&&(!chain.length||chain.includes(r.store))&&(!hp||(r.p100??0)>=10)&&!r.nonfood
    if(!q.trim()){setRes(R.filter(r=>pass(r)&&r.pli!=null).sort((a,b)=>b.pli!-a.pli!).slice(0,30).map(r=>[0,r]));return}
    const sem=new Map<number,number>()
    if(st==='ready'){const m=await loadEmb(),ext=await loadExt(m.model);const v=(await ext('query: '+q,{pooling:'mean',normalize:true})).data as Float32Array
      for(let i=0;i<m.ids.length;i++){let d=0;const o=i*m.dim;for(let k=0;k<m.dim;k++)d+=m.E[o+k]*v[k];sem.set(m.ids[i],d*m.scales[i])}}
    if(my!==seq.current)return
    const nq=norm(q),cheap=/gunstig|billig|preiswert|cheap/.test(nq),prot=/eiweiss|protein/.test(nq)
    const out:[number,Row][]=[]
    for(const r of R){if(!pass(r))continue;const s=sem.get(r.id),f=fuzzy(q,r)
      let sc=(s!=null?(s-0.8)*5:0)+f*(s!=null?0.45:1)
      if(cheap&&r.eur10p!=null)sc+=Math.max(0,0.15-r.eur10p*0.1); if(prot&&r.p100!=null)sc+=Math.min(0.15,r.p100/100)
      if(sc>0.05)out.push([sc,r])}
    setRes(out.sort((a,b)=>b[0]-a[0]).slice(0,40))},st==='ready'?120:60);return()=>clearTimeout(t)},[q,st,stage,chain,hp,R])
  const tog=(a:string[],set:(v:string[])=>void,v:string)=>set(a.includes(v)?a.filter(x=>x!==v):[...a,v])
  const Chip=({on,onClick,children}:{on:boolean;onClick:()=>void;children:React.ReactNode})=><button onClick={onClick} className={cn('rounded-full border px-2.5 py-1 text-xs font-medium transition',on?'bg-emerald-600 text-white border-emerald-600':'bg-white dark:bg-slate-900 dark:border-slate-700 hover:bg-slate-50')}>{children}</button>
  return <>
    <button onClick={()=>setShow(true)} data-testid="search-bar" className="w-full flex items-center gap-3 rounded-2xl border-2 border-emerald-200 dark:border-emerald-900 bg-white dark:bg-slate-900 px-4 py-3 text-left shadow-sm hover:border-emerald-400 transition">
      <Search className="text-emerald-600 shrink-0" size={20}/><span className="flex-1 text-slate-500 truncate">🔎 Suche nach Bedeutung, z. B. „viel Eiweiß Huhn günstig“, „vegetarischer Eintopf“, „wie Good Choice“…</span>
      <kbd className="hidden sm:inline rounded border bg-slate-50 dark:bg-slate-800 px-1.5 py-0.5 text-[11px] text-slate-500">Strg K</kbd></button>
    <Command.Dialog open={show} onOpenChange={setShow} shouldFilter={false} label="Gerichte suchen" overlayClassName="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]"
      contentClassName="fixed left-1/2 top-[6vh] z-50 w-[96vw] max-w-3xl -translate-x-1/2 rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border dark:border-slate-700 overflow-hidden">
      <div className="flex items-center gap-2 border-b dark:border-slate-800 px-4"><Search size={18} className="text-slate-400"/>
        <Command.Input value={q} onValueChange={setQ} autoFocus placeholder="Was willst du essen? z. B. viel Eiweiß Huhn günstig" className="flex-1 bg-transparent py-4 text-base outline-none"/>
        <span data-testid="ai-state" data-state={st} className="text-[11px] flex items-center gap-1 text-slate-500" title="Lokales Embedding-Modell multilingual-e5-small, läuft komplett im Browser">{st==='ready'?<><Sparkles size={13} className="text-emerald-600"/>KI-Suche aktiv</>:st==='loading'?<><Loader2 size={13} className="animate-spin"/>KI-Modell lädt…</>:st==='error'?'nur Stichwortsuche':''}</span></div>
      <div className="flex flex-wrap gap-1.5 px-4 py-2 border-b dark:border-slate-800">
        {STAGES.map(([k,e,l])=><Chip key={k} on={stage.includes(k)} onClick={()=>tog(stage,setStage,k)}>{e} {l}</Chip>)}
        <Chip on={hp} onClick={()=>setHp(!hp)}>💪 High Protein ≥10 g</Chip>
        {chains.map(c=><Chip key={c} on={chain.includes(c)} onClick={()=>tog(chain,setChain,c)}>🛒 {c}</Chip>)}</div>
      <Command.List className="max-h-[62vh] overflow-y-auto p-2">
        <Command.Empty className="p-6 text-center text-sm text-slate-500">Nichts gefunden 🤷</Command.Empty>
        {res.map(([,r])=><Command.Item key={r.id} value={String(r.id)} onSelect={()=>{setShow(false);open(r.id)}} data-testid="search-hit"
          className="flex items-center gap-3 rounded-xl px-2 py-2 cursor-pointer data-[selected=true]:bg-emerald-50 dark:data-[selected=true]:bg-emerald-950/40">
          <Img src={r.img} className="h-14 w-14 shrink-0"/>
          <div className="min-w-0 flex-1"><div className="font-semibold text-sm leading-tight line-clamp-2">{r.name}</div>
            <div className="mt-1 flex items-center gap-2 text-xs text-slate-500"><BrandLogo r={r} size={22}/><span className="truncate">{r.brandN}</span>{r.p100!=null&&<span>💪 {fmt(r.p100,1)} g/100 g</span>}</div></div>
          <StoreLogo store={r.store} size={30}/>
          <div className="text-right shrink-0 w-28"><div className="font-bold tabular-nums">{fmt(r.price,2)} €</div>
            {r.eur10p!=null&&<div className="text-[11px] font-semibold text-emerald-700">{fmt(r.eur10p,2)} €/10 g P.</div>}<div className="mt-0.5"><PliBadge v={r.pli}/></div></div>
        </Command.Item>)}
      </Command.List>
      <div className="border-t dark:border-slate-800 px-4 py-1.5 text-[11px] text-slate-500 flex justify-between"><span>↑↓ wählen · ↵ öffnen · Esc schließen</span><span>🔒 lokales Modell, keine Cloud-API</span></div>
    </Command.Dialog></>
}
