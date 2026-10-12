import * as T from '@radix-ui/react-tooltip'
import { Info } from 'lucide-react'
import type React from 'react'
export const KPI:Record<string,string>={
 pli:'Preis-Leistungs-Index (0–100) = 50 % Health-Score + 50 % Protein pro Euro. 20 g Protein/€ oder mehr ergeben die vollen 50 Punkte.',
 eur10p:'€ pro 10 g Protein = Packungspreis ÷ Protein der Packung × 10. Niedriger ist besser.',
 score:'Health-Score (0–100): Basis 30, plus Proteindichte (max. 40), Ballaststoffe (max. 15) und Gemüse/Hülsenfrüchte (+5); minus Salz (max. 20), gesättigte Fette (max. 15) und starke Verarbeitung (NOVA).',
 ppk:'Preis pro kg', eur100k:'€ pro 100 kcal', ppe:'Gramm Protein pro Euro. Höher ist besser.',
 p100:'Protein pro 100 g',p100k:'Protein pro 100 kcal; ab 10 g gilt das als sehr hoch.',salt:'Salz pro 100 g. Mehr als 1,5 g gilt als viel.',sat:'Gesättigte Fettsäuren pro 100 g',fib:'Ballaststoffe pro 100 g',sugar:'Zucker pro 100 g',kcal:'Energie pro 100 g',
 conf:'Wie sicher die Zuordnung zum Hersteller ist: hoch = Identitätskennzeichen oder offizielle Quelle; mittel = Indizien; niedrig = Vermutung.',
 stage:'Fertigstufe: Komplettmahlzeit und Eintopf/Suppe sind sofort eine Mahlzeit. Eine Protein-Komponente braucht eine Beilage (siehe Kombi). Zutat/Rohware (rohes Fleisch und Fisch, Faschiertes, Saucen, trockene Nudeln, Gewürze, Süßspeisen) ist keine Mahlzeit und taucht in keinem Ranking auf.'}
export function InfoTip({k,text,children}:{k?:string;text?:string;children?:React.ReactNode}){
  const t=text??(k?KPI[k]:'')
  return <T.Provider delayDuration={100}><T.Root><T.Trigger asChild><span tabIndex={0} onClick={e=>e.stopPropagation()} className="inline-flex items-center gap-0.5 cursor-help">{children}<Info size={12} className="text-slate-400 hover:text-brand shrink-0"/></span></T.Trigger><T.Portal><T.Content sideOffset={4} className="z-[100] max-w-xs rounded-lg bg-slate-900 text-white text-xs px-3 py-2 shadow-xl">{t}<T.Arrow className="fill-slate-900"/></T.Content></T.Portal></T.Root></T.Provider>
}
export const STAGES:[string,string,string][]=[['meal','🍱','Komplettmahlzeit'],['stew','🥫','Eintopf/Suppe'],['prot','🍖','Protein-Komponente'],['side','🥔','Beilage'],['veg','🥦','Gemüse'],['base','🧂','Zutat/Rohware']]
export const packEmo=(p?:string|null)=>{if(!p)return '📦';const M:[string,string][]=[['Dose','🥫'],['Tiefk','❄️'],['Kühl','🧊'],['Glas','🫙'],['Trocken','🍜'],['Instant','🍜'],['Pouch','🛍️'],['Vakuum','🥩'],['Sous','🥩']];return M.find(([k])=>p.includes(k))?.[1]??'📦'}
const W='https://upload.wikimedia.org/wikipedia/commons/thumb/'
const STATE:Record<string,[string,string]>={'Oberösterreich':['OÖ',W+'c/c4/Flag_of_Upper_Austria.svg/40px-Flag_of_Upper_Austria.svg.png'],'Niederösterreich':['NÖ',W+'c/c2/Flag_of_Lower_Austria.svg/40px-Flag_of_Lower_Austria.svg.png'],'Wien':['W',W+'9/9b/Flag_of_Vienna.svg/40px-Flag_of_Vienna.svg.png'],'Kärnten':['K',W+'f/f0/Flag_of_Carinthia.svg/40px-Flag_of_Carinthia.svg.png'],'Steiermark':['Stmk',W+'c/c8/Flag_of_Styria.svg/40px-Flag_of_Styria.svg.png'],'Vorarlberg':['Vbg',W+'e/eb/Flag_of_Vorarlberg.svg/40px-Flag_of_Vorarlberg.svg.png'],'Salzburg':['Sbg',W+'1/16/Flag_of_Salzburg.svg/40px-Flag_of_Salzburg.svg.png'],'Tirol':['T',W+'8/8c/Flag_of_Tyrol.svg/40px-Flag_of_Tyrol.svg.png'],'Burgenland':['Bgld',W+'4/4c/Flag_of_Burgenland.svg/40px-Flag_of_Burgenland.svg.png']}
const CC:Record<string,string>={AT:'🇦🇹',DE:'🇩🇪',NL:'🇳🇱',IT:'🇮🇹',HU:'🇭🇺',PL:'🇵🇱',CZ:'🇨🇿',FR:'🇫🇷',BE:'🇧🇪',ES:'🇪🇸',CH:'🇨🇭',SI:'🇸🇮',DK:'🇩🇰',TH:'🇹🇭',SK:'🇸🇰'}
const NAME_CC:[RegExp,string][]=[[/österreich|austria/i,'AT'],[/deutschland|germany/i,'DE'],[/niederlande|netherlands/i,'NL'],[/itali/i,'IT'],[/ungarn|hungary/i,'HU'],[/polen|poland/i,'PL'],[/tschech|czech/i,'CZ'],[/frankreich|france/i,'FR'],[/belgi/i,'BE'],[/spanien|spain/i,'ES'],[/sloweni/i,'SI'],[/thailand/i,'TH']]
export function Flag({country,state,text}:{country?:string|null;state?:string|null;text?:string|null}){
  const s=state&&STATE[state]?state:Object.keys(STATE).find(k=>text&&text.includes(k))
  let cc=country&&CC[country.toUpperCase()]?country.toUpperCase():undefined
  if(!cc&&text)cc=NAME_CC.find(([re])=>re.test(text))?.[1]; if(!cc&&s)cc='AT'
  if(!cc&&!s) return null
  return <span className="inline-flex items-center gap-1 whitespace-nowrap">{cc&&<span title={cc}>{CC[cc]}</span>}{s&&<span title={s} className="inline-flex items-center gap-0.5"><img src={STATE[s][1]} alt={s} className="h-3 w-[18px] object-cover rounded-[2px] border border-slate-300"/><span className="text-[10px] font-semibold">{STATE[s][0]}</span></span>}</span>
}
const PAL=['#2563eb','#dc2626','#059669','#d97706','#7c3aed','#db2777','#0891b2','#65a30d','#ea580c','#4f46e5','#0d9488','#be123c','#a16207','#9333ea','#0284c7','#15803d','#c2410c','#6d28d9']
export const prodColor=(s:string)=>PAL[Math.abs([...s].reduce((a,c)=>a*31+c.charCodeAt(0)|0,7))%PAL.length]
export function ProducerChip({slug,name,size='sm'}:{slug?:string|null;name:string;size?:'sm'|'md'}){
  const c=prodColor(slug||name)
  return <a href={slug?'#tab=hersteller-seiten&h='+slug:undefined} onClick={e=>{e.stopPropagation();if(slug)setTimeout(()=>dispatchEvent(new HashChangeEvent('hashchange')),0)}} style={{borderColor:c,color:c,background:c+'14'}} className={'inline-flex items-center gap-1 rounded-full border font-medium truncate max-w-full '+(size==='md'?'px-2.5 py-1 text-sm':'px-2 py-0.5 text-[11px]')}><span style={{background:c}} className="h-2 w-2 rounded-full shrink-0"/>🏭 {name}</a>
}
