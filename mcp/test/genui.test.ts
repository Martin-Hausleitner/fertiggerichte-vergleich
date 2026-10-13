import test from 'node:test'
import assert from 'node:assert/strict'
import { validateSpec, describeLibrary, COMPONENT_NAMES } from '../../src/app/genui/schema.ts'

test('valid spec passes unchanged', () => {
  const r = validateSpec({ version: 1, title: 'Top', root: { type: 'Stack', props: { gap: 'md' }, children: [
    { type: 'Heading', props: { text: 'Hallo', level: 2 } },
    { type: 'ProductList', props: { query: { stores: ['Hofer'], sort: 'value', limit: 5 }, display: 'table' } },
    { type: 'Button', props: { label: 'Ranking', action: { type: 'setView', view: 'ranking' } } },
    { type: 'Tabs', props: {}, children: [{ type: 'Tab', props: { id: 'a', label: 'A' }, children: [{ type: 'Text', props: { text: 'x' } }] }] },
  ] } })
  assert.equal(r.ok, true); assert.deepEqual(r.errors, []); assert.equal(r.spec!.root.children!.length, 4)
})
test('invalid nodes are dropped, siblings survive', () => {
  const r = validateSpec({ version: 1, root: { type: 'Stack', props: {}, children: [
    { type: 'Script', props: { src: 'x' } }, { type: 'Text', props: { text: 'ok' } }, { type: 'Text', props: { text: 'x', html: '<b>' } },
  ] } })
  assert.equal(r.ok, true); assert.equal(r.dropped, 2); assert.equal(r.spec!.root.children!.length, 1)
})
test('unsafe urls and actions rejected', () => {
  for (const src of ['javascript:alert(1)', 'data:image/png;base64,AA', 'http://evil.example/x.png', '//evil.example/x'])
    assert.equal(validateSpec({ version: 1, root: { type: 'Image', props: { src, alt: '' } } }).ok, false, src)
  assert.equal(validateSpec({ version: 1, root: { type: 'Image', props: { src: 'https://ok.example/a.png', alt: '' } } }).ok, true)
  assert.equal(validateSpec({ version: 1, root: { type: 'Button', props: { label: 'x', action: { type: 'eval', code: '1' } } } }).ok, false)
})
test('non-Stack root gets wrapped, limits enforced', () => {
  const r = validateSpec({ version: 1, root: { type: 'Text', props: { text: 'a' } } })
  assert.equal(r.spec!.root.type, 'Stack')
  let n: any = { type: 'Text', props: { text: 'deep' } }; for (let i = 0; i < 12; i++) n = { type: 'Stack', props: {}, children: [n] }
  assert.ok(validateSpec({ version: 1, root: n }).errors.some(e => /depth/.test(e.message)))
  const many = { version: 1, root: { type: 'Stack', props: {}, children: Array.from({ length: 100 }, () => ({ type: 'Stack', props: {}, children: Array.from({ length: 5 }, () => ({ type: 'Badge', props: { text: 'b' } })) })) } }
  assert.ok(validateSpec(many).errors.some(e => /nodes exceeded/.test(e.message)))
  assert.equal(validateSpec('not json').ok, false)
})
test('library description lists all components', () => { const d = describeLibrary(); for (const n of COMPONENT_NAMES) assert.ok(d.includes(`- ${n}(`), n) })
