import animate from 'tailwindcss-animate'
/** Theme: Too-Good-To-Go-inspiriert – Creme-Hintergrund, ein starkes Grün, warme Neutrals */
const warm={50:'#faf8f4',100:'#f3efe7',200:'#e7e1d6',300:'#d4ccbe',400:'#a39a8b',500:'#787063',600:'#5b544a',700:'#433e37',800:'#2b2824',900:'#1c1a17',950:'#12110f'}
const green={50:'#e9f5f1',100:'#cfeae1',200:'#a2d5c5',300:'#6dbba4',400:'#3c9c84',500:'#1a806b',600:'#00695c',700:'#005a4f',800:'#044a42',900:'#063d37',950:'#03231f'}
const v=n=>`hsl(var(--${n}) / <alpha-value>)`
export default { darkMode:'class', content:['./index.html','./src/**/*.{ts,tsx}'],
  theme:{ container:{center:true,padding:'1rem'}, extend:{
    fontFamily:{sans:['"Inter Variable"','Inter','ui-sans-serif','system-ui','sans-serif']},
    colors:{ slate:warm, gray:warm, emerald:green,
      brand:{DEFAULT:'#00695c',light:'#e9f5f1',dark:'#004d43',mint:'#c6f0dc'},
      border:v('border'),input:v('input'),ring:v('ring'),background:v('background'),foreground:v('foreground'),
      primary:{DEFAULT:v('primary'),foreground:v('primary-foreground')},secondary:{DEFAULT:v('secondary'),foreground:v('secondary-foreground')},
      muted:{DEFAULT:v('muted'),foreground:v('muted-foreground')},accent:{DEFAULT:v('accent'),foreground:v('accent-foreground')},
      destructive:{DEFAULT:v('destructive'),foreground:v('destructive-foreground')},card:{DEFAULT:v('card'),foreground:v('card-foreground')},
      popover:{DEFAULT:v('popover'),foreground:v('popover-foreground')} },
    borderRadius:{lg:'var(--radius)',md:'calc(var(--radius) - 2px)',sm:'calc(var(--radius) - 4px)'},
    boxShadow:{card:'0 1px 2px rgba(28,26,23,.04), 0 4px 16px -6px rgba(28,26,23,.08)',lift:'0 2px 4px rgba(28,26,23,.05), 0 16px 32px -12px rgba(28,26,23,.18)'},
  }}, plugins:[animate] }
