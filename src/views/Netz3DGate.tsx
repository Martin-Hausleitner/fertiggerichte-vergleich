import { lazy, Suspense, useState } from 'react'
import { Network, AlertTriangle } from 'lucide-react'
import { Card, Button, Skeleton } from '@/components/ui'
const Netz3D = lazy(() => import('./Netz3D'))
/** Mobil: 3D-Netz erst nach Klick laden (three.js ~1,4 MB, hoher Speicherbedarf). Desktop: sofort. */
export default function Netz3DGate() {
  const [go, setGo] = useState(() => innerWidth >= 768)
  if (!go) return <Card className="space-y-3 p-6 text-center shadow-none">
    <Network className="mx-auto size-10 text-muted-foreground" />
    <h1 className="text-lg font-semibold">Netz 3D</h1>
    <p className="flex items-start justify-center gap-1.5 text-sm text-amber-700 dark:text-amber-400"><AlertTriangle className="mt-0.5 size-4 shrink-0" />Die 3D-Ansicht lädt rund 1,4 MB zusätzlich und braucht viel Arbeitsspeicher. Auf älteren Handys kann der Browser-Tab abstürzen.</p>
    <Button onClick={() => setGo(true)}>3D-Netz laden</Button>
  </Card>
  return <Suspense fallback={<Skeleton className="h-[60vh] w-full" />}><Netz3D /></Suspense>
}
