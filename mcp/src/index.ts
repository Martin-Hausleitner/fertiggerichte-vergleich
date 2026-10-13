#!/usr/bin/env -S npx tsx
/**
 * good-choice-mcp
 *   stdio (default):  tsx src/index.ts
 *   Streamable HTTP:  tsx src/index.ts --http [--port 3333]   → POST/GET/DELETE http://127.0.0.1:3333/mcp
 * Env: GOODCHOICE_DATA (path or https URL to data.json), GOODCHOICE_BRIDGE_PORT (default 8765), MCP_HTTP_PORT.
 */
import http from 'node:http'
import { randomUUID } from 'node:crypto'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js'
import { createServer } from './server.ts'
import { startBridge } from './bridge.ts'

const args = process.argv.slice(2)
const arg = (n: string) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined }
const log = (...a: unknown[]) => console.error('[good-choice-mcp]', ...a) // stderr only (stdout = MCP in stdio mode)

const bridge = await startBridge(Number(arg('--bridge-port') ?? process.env.GOODCHOICE_BRIDGE_PORT ?? 8765))
log(`UI bridge on ws://127.0.0.1:${bridge.port()} – open the app with ?mcp=ws://localhost:${bridge.port()}`)

if (!args.includes('--http')) {
  await createServer(bridge).connect(new StdioServerTransport())
  log('stdio transport ready')
} else {
  const port = Number(arg('--port') ?? process.env.MCP_HTTP_PORT ?? 3333)
  const sessions = new Map<string, StreamableHTTPServerTransport>()
  const readBody = (req: http.IncomingMessage) => new Promise<unknown>((res, rej) => { let b = ''; req.on('data', c => { b += c; if (b.length > 1e6) req.destroy() }); req.on('end', () => { try { res(b ? JSON.parse(b) : undefined) } catch (e) { rej(e) } }) })
  http.createServer(async (req, res) => {
    if (!req.url?.startsWith('/mcp')) { res.writeHead(404).end(); return }
    // DNS-rebinding guard: only local hosts
    if (!/^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(req.headers.host ?? '')) { res.writeHead(403).end('forbidden host'); return }
    try {
      const sid = req.headers['mcp-session-id'] as string | undefined
      const body = req.method === 'POST' ? await readBody(req) : undefined
      let t = sid ? sessions.get(sid) : undefined
      if (!t) {
        if (req.method !== 'POST' || !isInitializeRequest(body)) { res.writeHead(400, { 'content-type': 'application/json' }).end(JSON.stringify({ jsonrpc: '2.0', error: { code: -32000, message: 'No valid session' }, id: null })); return }
        t = new StreamableHTTPServerTransport({ sessionIdGenerator: () => randomUUID(), onsessioninitialized: id => { sessions.set(id, t!) } })
        t.onclose = () => { if (t!.sessionId) sessions.delete(t!.sessionId) }
        await createServer(bridge).connect(t)
      }
      await t.handleRequest(req, res, body)
    } catch (e) { log(e); if (!res.headersSent) res.writeHead(500).end() }
  }).listen(port, '127.0.0.1', () => log(`Streamable HTTP on http://127.0.0.1:${port}/mcp`))
}
