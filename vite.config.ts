import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import fs from 'node:fs'
import crypto from 'node:crypto'
// Sensecheck 83 P3: __BUILD__ deterministisch = Hash der per ?v= geladenen public-Daten (gleiche Daten → gleicher Build, Deploys bytegenau prüfbar; neue Daten → Cache-Bust).
export const BUILD_FILES=['data.json','embeddings.json','embeddings.bin','analysis/online_providers.json','analysis/producer_quality.json']
export const buildId=(root=path.resolve(__dirname,'public'))=>{ const h=crypto.createHash('sha256'); for(const f of BUILD_FILES){ const p=path.join(root,f); h.update(f+'\0'); if(fs.existsSync(p)) h.update(fs.readFileSync(p)); h.update('\0') } return process.env.FG_BUILD_ID||h.digest('hex').slice(0,12) }
export default defineConfig({ plugins:[react()], resolve:{alias:{'@':path.resolve(__dirname,'src')}}, base:'./', server:{host:true,port:5173,allowedHosts:true}, define:{__BUILD__:JSON.stringify(buildId())},
  // Nur der Entry heißt index-*.js; geteilte Chunks aus „index“-Modulen (z. B. @radix-ui/number) heißen chunk-*.js → genau ein index-*.js im Build.
  build:{rollupOptions:{output:{chunkFileNames:(c)=>c.name==='index'?'assets/chunk-[hash].js':'assets/[name]-[hash].js'}}} })
