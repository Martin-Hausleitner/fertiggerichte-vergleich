import type React from 'react'
const inline=(t:string)=>{const parts:React.ReactNode[]=[];const re=/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\)|`[^`]+`)/g;let last=0,m:RegExpExecArray|null,i=0
  while((m=re.exec(t))){parts.push(t.slice(last,m.index));const s=m[0];if(s.startsWith('**'))parts.push(<b key={i++}>{s.slice(2,-2)}</b>);else if(s.startsWith('`'))parts.push(<code key={i++} className="text-xs bg-slate-100 dark:bg-slate-800 px-1 rounded">{s.slice(1,-1)}</code>);else{const mm=/\[([^\]]+)\]\(([^)]+)\)/.exec(s)!;parts.push(<a key={i++} href={mm[2]} target="_blank" rel="noreferrer" className="text-brand underline">{mm[1]}</a>)}last=m.index+s.length}
  parts.push(t.slice(last));return parts}
export function Markdown({text}:{text:string}){
  const lines=text.split('\n');const out:React.ReactNode[]=[];let i=0
  while(i<lines.length){const l=lines[i]
    if(l.startsWith('|')){const rows:string[][]=[];while(i<lines.length&&lines[i].startsWith('|')){const c=lines[i].split('|').slice(1,-1).map(x=>x.trim());if(!c.every(x=>/^:?-+:?$/.test(x)))rows.push(c);i++}
      out.push(<div key={i} className="overflow-x-auto my-2"><table className="text-xs w-full"><thead><tr>{rows[0]?.map((c,j)=><th key={j} className="text-left p-1 border-b dark:border-slate-700">{inline(c)}</th>)}</tr></thead><tbody>{rows.slice(1).map((r,k)=><tr key={k} className="border-b dark:border-slate-800">{r.map((c,j)=><td key={j} className="p-1">{inline(c)}</td>)}</tr>)}</tbody></table></div>);continue}
    if(/^#{1,4} /.test(l)){const h=l.match(/^#+/)![0].length;out.push(<div key={i} className={h<=2?'text-base font-bold mt-3':'text-sm font-semibold mt-2'}>{inline(l.replace(/^#+ /,''))}</div>)}
    else if(/^\s*[-*] /.test(l)){const items:string[]=[];while(i<lines.length&&/^\s*[-*] /.test(lines[i])){items.push(lines[i].replace(/^\s*[-*] /,''));i++}out.push(<ul key={i} className="list-disc pl-5 space-y-0.5">{items.map((x,j)=><li key={j}>{inline(x)}</li>)}</ul>);continue}
    else if(l.trim())out.push(<p key={i} className="my-1">{inline(l)}</p>)
    i++}
  return <div className="text-sm leading-relaxed">{out}</div>
}
export function useText(url:string){
  return url
}
