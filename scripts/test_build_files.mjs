// SC84 P3: jede Datei, die die App mit ?v=__BUILD__ lädt, muss in BUILD_FILES stehen (sonst kein Cache-Bust).
import fs from 'node:fs'; import path from 'node:path'
const cfg=fs.readFileSync('vite.config.ts','utf8')
const list=JSON.parse(cfg.match(/BUILD_FILES=(\[[^\]]*\])/)[1].replace(/'/g,'"'))
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)])
const used=new Set(), nocache=[]
for(const f of walk('src').filter(f=>/\.(ts|tsx)$/.test(f))){
  const s=fs.readFileSync(f,'utf8')
  if(/\.json\?v=['"`]?\s*\+\s*Date\.now\(\)/.test(s)) nocache.push(f)
  if(!s.includes('__BUILD__')) continue
  for(const m of s.matchAll(/['"`]\.\/([\w./-]+\.(?:json|bin))/g)) used.add(m[1])
}
if(nocache.length){console.error('FAIL: ?v=Date.now() statt __BUILD__ (nie gecacht, SC84 P3):',nocache);process.exit(1)}
const miss=[...used].filter(f=>!list.includes(f))
if(miss.length){console.error('FAIL: nicht in BUILD_FILES:',miss);process.exit(1)}
if(used.size<11){console.error('FAIL: zu wenige ?v=-Dateien gefunden',[...used]);process.exit(1)}
console.log(`OK test_build_files: ${used.size} ?v=-Dateien, alle in BUILD_FILES`)
