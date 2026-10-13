/** Tiny store for the current custom view (rendered by <GenUIHost/>). */
import { useSyncExternalStore } from 'react'
let current: unknown = null
const subs = new Set<() => void>()
export const genuiStore = {
  get: () => current,
  set: (spec: unknown) => { current = spec; subs.forEach(f => f()); dispatchEvent(new CustomEvent('goodchoice:customui', { detail: { active: spec != null } })) },
  clear: () => genuiStore.set(null),
  subscribe: (f: () => void) => { subs.add(f); return () => { subs.delete(f) } },
}
export const useCustomSpec = () => useSyncExternalStore(genuiStore.subscribe, genuiStore.get)
