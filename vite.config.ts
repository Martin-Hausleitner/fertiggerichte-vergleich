import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
export default defineConfig({ plugins:[react()], resolve:{alias:{'@':path.resolve(__dirname,'src')}}, base:'./', server:{host:true,port:5173,allowedHosts:true}, define:{__BUILD__:JSON.stringify(Date.now().toString(36))},
  // Nur der Entry heißt index-*.js; geteilte Chunks aus „index“-Modulen (z. B. @radix-ui/number) heißen chunk-*.js → genau ein index-*.js im Build.
  build:{rollupOptions:{output:{chunkFileNames:(c)=>c.name==='index'?'assets/chunk-[hash].js':'assets/[name]-[hash].js'}}} })
