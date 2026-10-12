import { Component, type ReactNode } from 'react'
export class ErrorBoundary extends Component<{children:ReactNode},{err:Error|null}>{
  state={err:null as Error|null}
  static getDerivedStateFromError(err:Error){return {err}}
  componentDidCatch(err:Error){
    const chunk=/dynamically imported module|ChunkLoadError|Importing a module script failed|Failed to fetch/i.test(String(err?.message||err))
    if(chunk&&!sessionStorage.getItem('fg-reloaded')){sessionStorage.setItem('fg-reloaded','1');location.reload()}
  }
  render(){
    if(this.state.err) return <div className="p-6 text-center space-y-2"><div className="text-lg font-semibold">Diese Ansicht konnte nicht geladen werden.</div><div className="text-sm text-slate-500">Wahrscheinlich gibt es eine neue Version.</div><button className="rounded-lg bg-brand text-white px-4 py-2" onClick={()=>{sessionStorage.removeItem('fg-reloaded');location.reload()}}>Neu laden</button></div>
    return this.props.children
  }
}
