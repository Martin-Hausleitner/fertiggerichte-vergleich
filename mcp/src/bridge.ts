/**
 * Local WebSocket bridge: the app connects to ws://127.0.0.1:PORT only when opened with ?mcp=ws://localhost:PORT.
 * Server → app: UI commands. App → server: only {ok, errors, view} acknowledgements.
 */
import { WebSocketServer, type WebSocket } from 'ws'

export interface UiBridge { call(method: string, params?: unknown, timeoutMs?: number): Promise<unknown>; connected(): boolean; close(): Promise<void>; port(): number }

export function startBridge(port = Number(process.env.GOODCHOICE_BRIDGE_PORT ?? 8765), host = '127.0.0.1'): Promise<UiBridge> {
  return new Promise((resolve, reject) => {
    const wss = new WebSocketServer({ port, host, maxPayload: 256 * 1024, verifyClient: ({ origin }: { origin?: string }) => !origin || /^(https:\/\/servas-ai\.github\.io|https:\/\/martin-hausleitner\.github\.io|http:\/\/(localhost|127\.0\.0\.1)(:\d+)?)$/.test(origin) })
    let client: WebSocket | null = null, seq = 0
    const pending = new Map<number, { res: (v: unknown) => void; rej: (e: Error) => void; t: NodeJS.Timeout }>()
    wss.on('connection', ws => {
      client?.close(); client = ws
      ws.on('message', buf => {
        let m: any; try { m = JSON.parse(String(buf)) } catch { return }
        const p = typeof m?.id === 'number' ? pending.get(m.id) : undefined; if (!p) return
        pending.delete(m.id); clearTimeout(p.t); m.error ? p.rej(new Error(String(m.error))) : p.res(m.result)
      })
      ws.on('close', () => { if (client === ws) client = null })
    })
    wss.on('error', reject)
    wss.on('listening', () => resolve({
      connected: () => !!client && client.readyState === 1,
      port: () => (wss.address() as any).port,
      call(method, params, timeoutMs = 8000) {
        if (!client || client.readyState !== 1) return Promise.reject(new Error(`No Good Choice app connected. Open the app with ?mcp=ws://localhost:${(wss.address() as any).port} (e.g. http://localhost:5173/?mcp=ws://localhost:${(wss.address() as any).port}).`))
        const id = ++seq
        return new Promise((res, rej) => { const t = setTimeout(() => { pending.delete(id); rej(new Error('app did not answer')) }, timeoutMs); pending.set(id, { res, rej, t }); client!.send(JSON.stringify({ id, method, params })) })
      },
      close: () => new Promise<void>(r => { pending.forEach(p => { clearTimeout(p.t); p.rej(new Error('closed')) }); client?.terminate(); wss.close(() => r()) }),
    }))
  })
}
