import { lazy, type ComponentType, type LazyExoticComponent } from 'react'
import { MessageSquareText, Images, Columns3, LayoutDashboard, BadgeCheck, Store as StoreIcon, LayoutGrid, Soup, ListOrdered, Shapes, Tag, Users, Store, HeartPulse, BarChart3, ScatterChart, Package, Factory, SearchCheck, Building2, ShieldCheck, Truck, Grid3x3, Image, Network, Warehouse, CalendarDays, Puzzle, Scale, Timer, BookOpen, Database, Table2, Columns2, MapPinned, Trophy, Sun, Salad, Sparkles, type LucideIcon } from 'lucide-react'

const Misc = () => import('@/views/Misc')
const Charts = () => import('@/views/Charts')
export type View = LazyExoticComponent<ComponentType>
export type TabDef = { key: string; label: string; icon: LucideIcon; view: View }
export type TabGroup = { label: string; tabs: TabDef[] }
const t = (key: string, label: string, icon: LucideIcon, view: View): TabDef => ({ key, label, icon, view })

export const Explorer = lazy(() => import('@/views/Explorer'))
export const TAB_GROUPS: TabGroup[] = [
  { label: 'Heute einkaufen', tabs: [
    t('heute', 'Was kaufe ich heute?', Sun, lazy(() => import('@/views/Heute'))),
    t('tabelle', 'Fertiggerichte filtern', Table2, lazy(() => import('@/views/Tabelle'))),
    t('vergleich', 'Vergleichstabelle', Columns2, lazy(() => import('@/views/VergleichTabelle'))),
    t('meine-shops', 'Meine Shops & Ranking', MapPinned, lazy(() => import('@/views/MeineShops'))),
    t('plan', 'Ernährungsplan', Salad, lazy(() => import('@/views/Ernaehrungsplan'))),
    t('ki', 'KI-Ansicht', Sparkles, lazy(() => import('@/app/genuiHost'))),
    t('hofer-top30', 'Hofer Top 30', Trophy, lazy(() => import('@/views/HoferTop30'))),
  ] },
  { label: 'Explorer · Entdecken', tabs: [
    t('alle', 'Alle Gerichte', LayoutGrid, Explorer),
    t('feed', 'Feed', MessageSquareText, lazy(() => import('@/views/Feed'))),
    t('galerie', 'Galerie', Images, lazy(() => import('@/views/Galerie'))),
    t('board', 'Vergleichs-Board', Columns3, lazy(() => import('@/views/Board'))),
    t('gerichte', 'Gericht vergleichen', Soup, lazy(() => import('@/views/Gerichte'))),
    t('top', 'Top-Listen', ListOrdered, lazy(() => import('@/views/Top'))),
    t('kategorien', 'Kategorien', Shapes, lazy(() => import('@/views/Kategorien'))),
    t('markenprofil', 'Marken-Profil', BadgeCheck, lazy(() => import('@/views/MarkeProfil'))),
    t('ladenprofil', 'Laden-Profil', StoreIcon, lazy(() => import('@/views/LadenProfil'))),
    t('marken', 'Marken', Tag, lazy(() => import('@/views/Brands'))),
    t('familien', 'Markenfamilien', Users, lazy(() => import('@/views/Markenfamilien'))),
  ] },
  { label: 'Explorer · Gesundheit & Analyse', tabs: [
    t('dashboard', 'Dashboard', LayoutDashboard, lazy(() => import('@/views/Dashboard'))),
    t('gesundheit', 'Gesundheit & Qualität', HeartPulse, lazy(() => import('@/views/Health'))),
    t('analyse', 'Analyse', BarChart3, lazy(() => import('@/views/Analyse'))),
    t('scatter', 'Preis vs. Protein', ScatterChart, lazy(() => Charts().then(m => ({ default: m.ScatterView })))),
    t('pack', 'Verpackungen', Package, lazy(() => import('@/views/Packaging'))),
    t('matrix', 'Marken-Matrix', Grid3x3, lazy(() => import('@/views/Matrix'))),
  ] },
  { label: 'Explorer · Hersteller', tabs: [
    t('hersteller-seiten', 'Hersteller', Factory, lazy(() => import('@/views/Producers'))),
    t('wer', 'Wer steckt dahinter?', SearchCheck, lazy(() => import('@/views/WerDahinter'))),
    t('firmen', 'Firmenvergleich', Building2, lazy(() => import('@/views/Firmenvergleich'))),
    t('qualitaet', 'Hersteller-Qualität', ShieldCheck, lazy(() => import('@/views/Qualitaet'))),
    t('logos', 'Logos', Image, lazy(() => import('@/views/Logos'))),
    t('netz', 'Netz 3D', Network, lazy(() => import('@/views/Netz3D'))),
    t('hersteller', 'Läden & Werke', Warehouse, lazy(() => Misc().then(m => ({ default: m.Producers })))),
  ] },
  { label: 'Explorer · Einkaufen', tabs: [
    t('filialen', 'Filialen in der Nähe', Store, lazy(() => import('@/views/Stores'))),
    t('online', 'Online-Anbieter', Truck, lazy(() => import('@/views/Online'))),
    t('planer', 'Wochenplaner', CalendarDays, lazy(() => import('@/views/Planner'))),
    t('kombi', 'Kombi-Ideen', Puzzle, lazy(() => import('@/views/Kombi'))),
    t('ftg', 'Fit to Go vs. Supermarkt', Scale, lazy(() => Misc().then(m => ({ default: m.Ftg })))),
    t('multipot', 'Multipot-Pro Garzeiten', Timer, lazy(() => Misc().then(m => ({ default: m.Multipot })))),
  ] },
  { label: 'Explorer · Info', tabs: [t('methodik', 'Methodik & Quellen', BookOpen, lazy(() => Misc().then(m => ({ default: m.Methodik })))), t('abdeckung', 'Datenabdeckung', Database, lazy(() => import('@/views/Abdeckung')))] },
]
export const ALL_TABS = TAB_GROUPS.flatMap(g => g.tabs.map(tab => ({ ...tab, group: g.label })))
/** Aliase für API/GenUI-View-IDs */
export const TAB_ALIAS: Record<string, string> = { ranking: 'meine-shops', start: 'heute', filter: 'tabelle' }
export const findTab = (key: string) => ALL_TABS.find(x => x.key === (TAB_ALIAS[key] ?? key)) ?? ALL_TABS[0]
