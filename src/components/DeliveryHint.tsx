import { cn } from '@/lib'
export const UNCONFIRMED_TEXT = 'Lieferung nach Linz unbestätigt'
/** Dezenter Hinweis, wenn delivers_4020 === null: nicht geprüft, ob nach Linz geliefert/verkauft wird. Kein Ausschluss, Rankings unverändert. */
export const isDeliveryUnconfirmed = (r: { delivers_4020?: unknown }) => r.delivers_4020 === null
export const DeliveryHint = ({ r, className }: { r: { delivers_4020?: unknown }; className?: string }) => isDeliveryUnconfirmed(r)
  ? <span data-testid="delivery-unconfirmed" title="Für dieses Produkt ist nicht geprüft, ob es nach 4020 Linz geliefert bzw. dort verkauft wird. Es bleibt in den Rankings." className={cn('text-[10px] italic text-muted-foreground', className)}>{UNCONFIRMED_TEXT}</span> : null
