import { chromium } from 'playwright'
const b=await chromium.launch();const p=await b.newPage({viewport:{width:1600,height:1100}});const errs=[]
p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>m.type()==='error'&&errs.push(m.text()))
await p.goto(process.argv[2]+'#tab=wer');await p.waitForTimeout(6000)
await p.screenshot({path:'/workspace/fertig-app/wer_desktop.png',fullPage:false})
await p.mouse.wheel(0,1100);await p.waitForTimeout(1500);await p.screenshot({path:'/workspace/fertig-app/wer_desktop2.png'})
console.log('errors',JSON.stringify(errs.slice(0,8)), await p.locator('text=Preisunterschied').count());await b.close()
