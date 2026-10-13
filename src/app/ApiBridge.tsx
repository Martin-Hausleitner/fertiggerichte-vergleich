import { useEffect, useRef } from 'react'
import { useApp } from '@/lib'
import { useNearShops } from './shops'
import { installApi } from './api'
/** Hält window.goodChoice mit dem aktuellen App-Zustand synchron. */
export function ApiBridge() {
  const { R } = useApp(); const ns = useNearShops()
  const ref = useRef({ R, ns }); ref.current = { R, ns }
  useEffect(() => { installApi({ rows: () => ref.current.R, myChains: () => ref.current.ns.myChains, myShops: () => ref.current.ns.my, loc: () => ref.current.ns.loc, distOf: r => ref.current.ns.distOf(r) }) }, [])
  useEffect(() => { dispatchEvent(new CustomEvent('goodchoice:state')) }, [ns.my, ns.loc])
  return null
}
