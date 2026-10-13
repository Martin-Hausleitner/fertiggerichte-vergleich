#!/usr/bin/env python3
"""Verpackungs-Klassifikation v2 + Dashboard-Daten -> analysis/packaging_v2.json
Regeln (Priorität): 1 Etikett-Lagerhinweis (BILLA storageAndUsageStatements) / packageLabel,
2 Shop-Kategorie (BILLA), 3 Name/Marken-Hinweise, 4 bisherige Einstufung. Jede Zuordnung trägt 'why'."""
import json,re,statistics as S,os
APP='/workspace/fertig-app/public/data.json'; OUT='analysis/packaging_v2.json'
rows=json.load(open(APP))['rows']; old=json.load(open(OUT))
det={}
for f in ('det.json','det2.json'):
    try: det.update({k:v for k,v in json.load(open(f)).items() if v})
    except Exception: pass
T=['Dose','Kühlschale/MAP','Tiefkühl','Pouch/Retort','Glas','Sous-vide/Vakuum','Trocken/Instant-Beutel']
OLD={'Dose/Konserve':'Dose','Kühlregal (Menüschale/frisch)':'Kühlschale/MAP','Tiefkühl (TK)':'Tiefkühl','Trocken/Instant':'Trocken/Instant-Beutel','Glas':'Glas','Sous-vide (vakuum)':'Sous-vide/Vakuum','Beutel ungekühlt (Retort-Pouch)':'Pouch/Retort'}
NAME=[ # (regex, typ, grund) – Reihenfolge = Priorität
 (r'sous.?vide|vakuumgegart|niedertemperatur','Sous-vide/Vakuum','Name: Sous-vide'),
 (r'\btk\b|tiefgek|tiefkühl|eisknödel|\bfrosta\b|\biglo\b|\bfrost\b|pizza.*steinofen|ofenfrisch','Tiefkühl','Name/Marke: TK'),
 (r'\bdose\b|konserve|\binzersdorfer\b|\berasco\b|\bsonnen bassermann\b|\bhengstenberg\b|meisterkessel','Dose','Name/Marke: Dose'),
 (r'\bim glas\b|\bglas\b|\bgläschen\b','Glas','Name: Glas'),
 (r'express|microwave|mikrowellen.?beutel|pouch|\bready to eat\b|\bsnack pot\b','Pouch/Retort','Name: Express/Pouch'),
 (r'5 minuten|terrine|fix für|\bfix\b|instant|cup|becher.*nudel|nudel.*becher|fertigmischung|pulver|für \d+ teller|teller\)|suppenwürfel|\bbrühe\b|magic asia|spaghetteria|\bpüree\b.*portionen|instant','Trocken/Instant-Beutel','Name: Instant/Trocken'),
 (r'good choice|menüschale|menü\b|frisch|tortell|ravioli|cappelletti|gnocchi frisch|salat\b|bowl|wrap|sandwich|youcook|feine küche|\bchef select\b|simply good|hilcona|cecchin|rana\b|capricci|la nova|\bager\b|radatz|tann\b|hütthaler|toni kaiser|spätzle fertig','Kühlschale/MAP','Name/Marke: Kühlregal'),
 (r'knödel|strudel|laibchen|samosas|gyoza|frühlingsrolle','Tiefkühl','Name: typ. TK-Ware (schwach)'),
]
CAT={'Menüschalen':'Kühlschale/MAP','Fertiggerichte Gekühlt':'Kühlschale/MAP','Fertiggerichte gekühlt':'Kühlschale/MAP','Frische Pasta & Beilagen':'Kühlschale/MAP','Frischer Teig & Pasta':'Kühlschale/MAP','Salate':'Kühlschale/MAP','Sandwiches & Co':'Kühlschale/MAP','Dose':'Dose','Beutel':'Pouch/Retort','Suppengewürze':'Trocken/Instant-Beutel','Basis- & Fixprodukte':'Trocken/Instant-Beutel'}
ADD=re.compile(r'konservierungsstoff|verdickungsmittel|säuerungsmittel|säureregulator|emulgator|stabilisator|geschmacksverstärker|farbstoff|antioxidationsmittel|modifizierte stärke|backtriebmittel|feuchthaltemittel|\be ?\d{3}[a-z]?\b',re.I)
def sku(r):
    m=re.search(r'(\d{2})(\d{6})$',r.get('url') or ''); return f'{m.group(1)}-{m.group(2)}' if m and 'billa' in (r.get('url') or '') else None
def classify(r):
    d=det.get(sku(r) or '',{}); st=(d.get('storageAndUsageStatements') or ''); s=st.lower().split('nach dem öffnen')[0]
    pl=(d.get('packageLabel') or '')
    if re.search(r'-\s?18\s?°?c|tiefgekühlt|tiefkühl',s): return 'Tiefkühl','Etikett: −18 °C',st
    if pl=='Dose': return 'Dose','Etikett: Verpackung Dose',st
    if pl=='Glas': return 'Glas','Etikett: Verpackung Glas',st
    if re.search(r'\+?\s?[0-4]\s?°?c?\s?bis\s?\+?\s?[4-8]\s?°?c|gekühlt lagern|kühl lagern bei \+',s): 
        if re.search(r'sous|vakuum',r['name'].lower()): return 'Sous-vide/Vakuum','Etikett gekühlt + Name Sous-vide',st
        return 'Kühlschale/MAP','Etikett: gekühlt +2…+6 °C',st
    c=d.get('category')
    t=f"{r['name']} {r.get('brand') or ''}".lower()
    if c=='Beutel' and (r.get('dry') or re.search(NAME[5][0],t) or re.search(r'suppe ?(abc|gerstl|sternderl|hörnchen|hoernchen)|einlage|nudeln',t)): return 'Trocken/Instant-Beutel','BILLA-Kategorie Beutel + Trockenware',st
    if c in CAT: return CAT[c],f'BILLA-Kategorie: {c}',st
    o=OLD.get(r['pack'])
    if 'meisterkessel' in t: return 'Dose','Marke: Knorr Meisterkessel (Dose)',st
    for rx,ty,why in NAME:
        if re.search(rx,t):
            if why.endswith('(schwach)') and o: break
            return ty,why,st
    if o: return o,'bisherige Einstufung (Shop-Rubrik)',st
    if d.get('category')=='Fertiggerichte Ungekühlt': return 'Pouch/Retort','BILLA-Kategorie: ungekühlt (Schale/Pouch)',st
    return None,'keine belastbaren Hinweise',st
def med(a): a=[x for x in a if x is not None]; return round(S.median(a),2) if a else None
def q(a):
    a=sorted(x for x in a if x is not None)
    if len(a)<4: return None
    qs=S.quantiles(a,n=4); return [round(a[0],2),round(qs[0],2),round(qs[1],2),round(qs[2],2),round(a[-1],2)]
prod={}; why={}
for r in rows:
    if r.get('nonfood'): continue
    ty,w,st=classify(r); d=det.get(sku(r) or '',{})
    ing=''
    m=re.search(r'"ingredientsText": "((?:[^"\\\\]|\\\\.)*)"',json.dumps(d,ensure_ascii=False)) if d else None
    ing=m.group(1) if m else ''
    r['_t']=ty; r['_w']=w; r['_st']=st; r['_add']=len(set(m.lower() for m in ADD.findall(ing))) if ing else None
    why[w]=why.get(w,0)+1
moved=sum(1 for r in rows if r.get('_t') and OLD.get(r['pack'])!=r['_t'])
ICON={'Dose':'🥫','Kühlschale/MAP':'🍱','Tiefkühl':'❄️','Pouch/Retort':'🛍️','Glas':'🫙','Sous-vide/Vakuum':'🥩','Trocken/Instant-Beutel':'🍜'}
# Typische Branchenwerte (KEINE Messwerte; Quellen in sources)
MHD={'Kühlschale/MAP':[5,21,'5–21 Tage','vz'],'Sous-vide/Vakuum':[14,42,'2–6 Wochen','vz'],'Tiefkühl':[180,730,'6–24 Monate','vzk'],'Trocken/Instant-Beutel':[270,730,'9–24 Monate','vz'],'Pouch/Retort':[270,540,'9–18 Monate','vz'],'Glas':[365,730,'1–2 Jahre','vz'],'Dose':[730,1460,'2–4 Jahre','vzk']}
OT={x['type']:x for x in old['types']}
types=[]
for ty in T:
    L=[r for r in rows if r.get('_t')==ty]; R=[r for r in L if r.get('rankable')]
    after={}
    for r in L:
        m=re.search(r'nach dem öffnen[^.\n]*',(r['_st'] or '').lower())
        if m: after[m.group(0).strip()]=after.get(m.group(0).strip(),0)+1
    top=sorted([r for r in R if r.get('score') and r.get('img') and r.get('stage') in ('meal','stew') and not r.get('dry') and (r.get('protpack') or 0)>=12],key=lambda r:(-(r.get('pli') or 0),-r['score']))[:5]
    o=OT.get(ty,{})
    types.append({**{k:v for k,v in o.items() if k not in('stats',)},'type':ty,'icon':ICON[ty],
     'stats':dict(n_products=len(L),n_rankable=len(R),median_price=med([r['price'] for r in L]),median_price_per_kg=med([r['ppk'] for r in L]),
       median_price_per_10g_protein=med([r['eur10p'] for r in R]),median_health_score=med([r['score'] for r in R]),median_pli=med([r.get('pli') for r in R]),
       median_protein_100=med([r['p100'] for r in L]),median_salt_100=med([r['salt'] for r in L]),median_kcal_100=med([r['kcal'] for r in L]),
       median_additives=med([r['_add'] for r in L]),n_additives=sum(1 for r in L if r['_add'] is not None),share_bio=round(sum(1 for r in L if r.get('bio'))/len(L)*100) if L else 0),
     'box':dict(eur10p=q([r['eur10p'] for r in R if r['eur10p'] and r['eur10p']<15]),score=q([r['score'] for r in R]),salt=q([r['salt'] for r in L if r['salt'] is not None])),
     'stores':sorted({r['store'] for r in L}),'mhd_typical':MHD[ty],
     'after_opening_labels':sorted(after.items(),key=lambda x:-x[1])[:5],
     'top':[dict(id=r['id'],name=r['name'],brand=r.get('brandN') or r.get('brand'),store=r['store'],img=r['img'],logo=r.get('logo'),price=r['price'],eur10p=r['eur10p'],score=r['score'],pli=r.get('pli'),url=r.get('url')) for r in top]})
unk=[r for r in rows if not r.get('nonfood') and not r.get('_t')]
old.update(generated='2026-10-13',version=3,types=types,
  classification=dict(rules=['1 Etikett-Lagerhinweis/Verpackungsangabe (BILLA-Produktdaten)','2 BILLA-Shopkategorie','3 Name/Marke (z. B. FRoSTA/Iglo → TK, Inzersdorfer → Dose, Express → Pouch)','4 bisherige Shop-Rubrik'],
    by_reason=sorted(why.items(),key=lambda x:-x[1]),moved=moved,unclassified=len(unk),total=len(rows)),
  assign={str(r['id']):[r['_t'],r['_w']] for r in rows if r.get('_t')},
  chart=dict(labels=T,n_products=[t['stats']['n_products'] for t in types],median_protein_100=[t['stats']['median_protein_100'] for t in types],median_salt_100=[t['stats']['median_salt_100'] for t in types],median_price_per_10g_protein=[t['stats']['median_price_per_10g_protein'] for t in types],median_health_score=[t['stats']['median_health_score'] for t in types]))
old['note']+=' MHD-Spannen im Dashboard = typische Branchenrichtwerte (gekennzeichnet). Zusatzstoffe = Anzahl Zusatzstoff-Klassen/E-Nummern in BILLA-Zutatenlisten.'
json.dump(old,open(OUT,'w'),ensure_ascii=False,indent=1)
print('moved',moved,'unclassified',len(unk),'of',len(rows)); print({t['type']:t['stats']['n_products'] for t in types}); print(why)
