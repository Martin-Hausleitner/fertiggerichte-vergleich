import test from 'node:test'
import assert from 'node:assert/strict'
import { WebSocket } from 'ws'
import { startBridge } from '../src/bridge.ts'
import * as T from '../src/tools.ts'

test('bridge round-trip: set_view + render_custom_ui reach the app', async () => {
  const b = await startBridge(0)
  await assert.rejects(T.setView(b, { view: 'ranking' }), /No Good Choice app connected/)
  const got: any[] = []
  const app = new WebSocket(`ws://127.0.0.1:${b.port()}`, { origin: 'http://localhost:5173' })
  app.on('message', d => { const m = JSON.parse(String(d)); got.push(m); app.send(JSON.stringify({ id: m.id, result: { ok: true } })) })
  await new Promise(r => app.on('open', r)); await new Promise(r => setTimeout(r, 50))
  assert.deepEqual(await T.setView(b, { view: 'ranking', params: { store: 'Hofer' } }), { ok: true })
  const r = await T.renderCustomUi(b, { version: 1, root: { type: 'Stack', props: {}, children: [{ type: 'Text', props: { text: 'hi' } }, { type: 'Bogus', props: {} }] } })
  assert.equal(r.ok, true); assert.equal((r as any).validationWarnings.length, 1)
  assert.equal(got[1].method, 'renderCustomUI'); assert.equal(got[1].params.spec.root.children.length, 1)
  const bad = await T.renderCustomUi(b, { version: 1, root: { type: 'Bogus', props: {} } }); assert.equal(bad.ok, false); assert.equal(got.length, 2)
  app.close(); await b.close()
})
test('bridge rejects foreign origins', async () => {
  const b = await startBridge(0)
  const ws = new WebSocket(`ws://127.0.0.1:${b.port()}`, { origin: 'https://evil.example' })
  const err = await new Promise(r => { ws.on('error', r); ws.on('open', () => r(null)) })
  assert.ok(err); await b.close()
})
