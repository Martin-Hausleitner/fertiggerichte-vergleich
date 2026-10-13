/**
 * Browser side of the MCP UI bridge. OFF unless the page URL has ?mcp=ws://localhost:PORT
 * (only localhost/127.0.0.1/[::1] accepted). Only UI commands are accepted – no data leaves the
 * browser except {ok, errors, view}: never localStorage, plan targets, address or health data.
 */
import { validateSpec } from './schema'

export type BridgeRequest = { id: number | string; method: 'setView' | 'renderCustomUI' | 'clearCustomUI' | 'ping'; params?: any }
export type BridgeResponse = { id: number | string; result?: unknown; error?: string }

export function bridgeUrlFromLocation(search: string): string | null {
  const v = new URLSearchParams(search).get('mcp'); if (!v) return null
  try { const u = new URL(v); return u.protocol === 'ws:' && ['localhost', '127.0.0.1', '[::1]'].includes(u.hostname) && u.port ? u.toString() : null } catch { return null }
}

export function handleBridgeRequest(req: BridgeRequest): BridgeResponse {
  const api = window.goodChoice
  try {
    if (!api) throw new Error('app not ready')
    switch (req.method) {
      case 'ping': return { id: req.id, result: { ok: true, version: api.version } }
      case 'setView': {
        const view = String(req.params?.view ?? '').slice(0, 60); if (!/^[\w-]+$/.test(view)) throw new Error('invalid view')
        const params = Object.fromEntries(Object.entries(req.params?.params ?? {}).slice(0, 20).map(([k, v]) => [String(k).slice(0, 40), String(v).slice(0, 200)]))
        api.setView(view, params); return { id: req.id, result: { ok: true, view } }
      }
      case 'renderCustomUI': {
        const res = validateSpec(req.params?.spec); if (!res.ok) return { id: req.id, error: 'invalid spec: ' + res.errors.map(e => `${e.path}: ${e.message}`).join('; ') }
        api.renderCustomUI(res.spec); return { id: req.id, result: { ok: true, dropped: res.dropped, errors: res.errors } }
      }
      case 'clearCustomUI': api.renderCustomUI(null as any); return { id: req.id, result: { ok: true } }
      default: return { id: (req as any).id, error: 'unknown method' }
    }
  } catch (e: any) { return { id: req.id, error: String(e?.message ?? e).slice(0, 500) } }
}

export function startMcpBridge(search = location.search): () => void {
  const url = bridgeUrlFromLocation(search); if (!url) return () => {}
  let ws: WebSocket | null = null, stopped = false, delay = 1000
  const connect = () => {
    if (stopped) return
    ws = new WebSocket(url)
    ws.onopen = () => { delay = 1000; ws!.send(JSON.stringify({ hello: 'goodchoice', version: window.goodChoice?.version ?? null })) }
    ws.onmessage = ev => { let req: BridgeRequest; try { req = JSON.parse(String(ev.data)) } catch { return } if (req && req.id != null) ws!.send(JSON.stringify(handleBridgeRequest(req))) }
    ws.onclose = () => { if (!stopped) setTimeout(connect, delay = Math.min(delay * 2, 15000)) }
  }
  connect(); console.info('[goodChoice] MCP bridge →', url)
  return () => { stopped = true; ws?.close() }
}
