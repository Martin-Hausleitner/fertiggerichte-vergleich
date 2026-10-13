/**
 * GenUI integration for window.goodChoice.
 *   installGenUI({ getRows, onAction })  → registers renderer via registerCustomUIRenderer,
 *                                          starts MCP bridge only if ?mcp=ws://localhost:PORT
 *   <GenUIHost/>                         → place where the custom view should appear (e.g. tab "ki")
 */
import { createRoot } from 'react-dom/client'
import { Button } from '@/components/ui/button'
import { GenUIRenderer, type GenUIEnv } from './Renderer'
import { genuiStore, useCustomSpec } from './store'
import { validateSpec, type Action } from './schema'
import type { RowLike, ValueCfg } from './query'
import { startMcpBridge } from './bridge'

export * from './schema'
export { GenUIRenderer, genuiStore, useCustomSpec }
export type { RowLike }

type Opts = { getRows: () => RowLike[]; onAction?: (a: Action) => void; getValueCfg?: () => ValueCfg }
let opts: Opts | null = null
const env = (): GenUIEnv => ({ rows: opts?.getRows() ?? [], onAction: opts?.onAction, valueCfg: opts?.getValueCfg?.() })

export function GenUIHost() {
  const spec = useCustomSpec()
  if (spec == null) return null
  return <div className="space-y-2"><div className="flex justify-end"><Button size="sm" variant="ghost" onClick={() => genuiStore.clear()}>KI-Ansicht schließen</Button></div><GenUIRenderer spec={spec} env={env()} /></div>
}

/** Call once after window.goodChoice exists (or on 'goodchoice:ready'). Returns cleanup. */
export function installGenUI(o: Opts): () => void {
  opts = o
  const api = window.goodChoice
  if (!api) throw new Error('installGenUI: window.goodChoice missing')
  api.registerCustomUIRenderer((spec, target) => {
    if (spec == null) { genuiStore.clear(); return }
    const res = validateSpec(spec)
    if (!res.ok) throw new Error('GenUI: ' + res.errors.map(e => `${e.path}: ${e.message}`).join('; '))
    if (target) { const root = createRoot(target); root.render(<GenUIRenderer spec={res.spec} env={env()} />); return () => root.unmount() }
    genuiStore.set(res.spec)
  })
  const stop = startMcpBridge()
  return () => { stop(); opts = null }
}
