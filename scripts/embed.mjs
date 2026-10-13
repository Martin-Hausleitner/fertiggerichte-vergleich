// Regenerates public/embeddings.bin (int8, per-vector scale) + public/embeddings.json using the SAME model as the browser.
import { pipeline } from '@huggingface/transformers'
import fs from 'fs'
const MODEL='Xenova/multilingual-e5-small'
const ST={meal:'Komplettmahlzeit Fertiggericht fertige Mahlzeit',stew:'Eintopf Suppe',prot:'Fleisch Protein-Komponente',side:'Beilage',veg:'Gemüse',base:'Zutat Rohware'}
const D=JSON.parse(fs.readFileSync('public/data.json','utf8'))
const txt=r=>{const t=[r.name,'Marke '+r.brandN,r.store,r.herst,ST[r.stage]||'',...(r.cprot||[]),...(r.cdish||[]),r.pack]
 if(r.p100!=null) t.push(r.p100>=10?'viel Eiweiß high protein':r.p100>=6?'mittel Eiweiß':'wenig Eiweiß')
 if(r.vegan) t.push('vegan vegetarisch fleischlos'); if(r.bio) t.push('Bio')
 if(r.price!=null) t.push(r.eur10p!=null&&r.eur10p<0.5?'günstig billig preiswert':r.price<3?'günstig':'')
 if(/good choice/i.test(r.brandN+' '+r.name)) t.push('Good Choice Hofer Fertigmahlzeit Schale gekühlt')
 return 'passage: '+t.filter(Boolean).join(', ')}
const ext=await pipeline('feature-extraction',MODEL,{dtype:'q8'})
const rows=D.rows, dim=384, buf=new Int8Array(rows.length*dim), scales=[]
for(let i=0;i<rows.length;i+=32){const b=rows.slice(i,i+32)
 const o=await ext(b.map(txt),{pooling:'mean',normalize:true}); const a=o.data
 b.forEach((_,j)=>{let m=0;for(let k=0;k<dim;k++)m=Math.max(m,Math.abs(a[j*dim+k]));const s=m/127;scales.push(+s.toExponential(5))
  for(let k=0;k<dim;k++)buf[(i+j)*dim+k]=Math.round(a[j*dim+k]/s)})
 process.stdout.write('.')}
fs.writeFileSync('public/embeddings.bin',Buffer.from(buf.buffer))
fs.writeFileSync('public/embeddings.json',JSON.stringify({model:MODEL,dim,ids:rows.map(r=>r.id),scales}))
console.log('\nembedded',rows.length)
