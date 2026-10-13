/** Regenerates src/app/genui/genui.schema.json from the zod schema (zod v4 z.toJSONSchema). */
import { writeFileSync } from 'node:fs'
import { z } from 'zod'
import { SpecSchema, COMPONENTS } from '../../src/app/genui/schema.ts'
const base = z.toJSONSchema(SpecSchema, { unrepresentable: 'any', io: 'input' }) as any
const out = {
  $schema: 'https://json-schema.org/draft/2020-12/schema', $id: 'https://servas-ai.github.io/fertiggerichte-vergleich/genui.schema.json', title: 'Good Choice GenUI v1 spec',
  ...base,
  $defs: { ...base.$defs, components: Object.fromEntries(Object.entries(COMPONENTS).map(([k, d]) => [k, { description: d.description, group: d.group, children: d.children, props: z.toJSONSchema(d.props, { unrepresentable: 'any', io: 'input' }) }])) },
}
writeFileSync(new URL('../../src/app/genui/genui.schema.json', import.meta.url), JSON.stringify(out, null, 2) + '\n')
console.log('wrote genui.schema.json')
