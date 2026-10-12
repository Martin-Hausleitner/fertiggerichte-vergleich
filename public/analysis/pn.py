import json,statistics as S,math,re,collections as C
d=json.load(open('scored.json'));e=json.load(open('expand.json'))
seen={(x.get('url') or x['name']) for x in d}
ex=[x for x in e if (x.get('url') or x['name']) not in seen and x.get('protein_100') is not None]
for x in ex: x['_src']='expand'
allp=d+ex
def norm(s):return re.sub(r'\W+',' ',(s or '').lower()).strip()
P=json.load(open('producers_resolved.json'))['producers']
name2p={}
for p in P:
  for n in p['products']: name2p[norm(n)]=p
for x in allp:
  p=name2p.get(norm(x['name']))
  if p and not x.get('producer_company'):
    x['producer_company']=p['company'];x['producer_state']=p['state'];x['producer_id']=p['code'];x['ooe']=p['state']=='Oberösterreich'
def store(s):
  s=(s or '').lower()
  for k,v in [('billa','BILLA'),('spar','SPAR'),('hofer','HOFER'),('aldi','HOFER'),('lidl','LIDL'),('dm','dm'),('fit','Fit to Go'),('penny','Penny')]:
    if k in s: return v
  return 'Sonstige'
for x in allp:
  x['chain']=store(x.get('store'))
  if x.get('price_eur') and x.get('size_g') and x.get('protein_100') is not None:
    pp=x['protein_100']*x['size_g']/100; x['pp']=round(pp,1); x['ppe']=round(pp/x['price_eur'],2) if x['price_eur'] else None
  else: x['ppe']=None
def r(v,n=2):return None if v is None else round(v,n)
out={'meta':{'generated':'2026-10-12','n_scored':len(d),'n_expand_added':len(ex),'n_total':len(allp),'note':'Nur echte Werte aus scored.json/expand.json/producers_resolved.json; fehlende Werte = null.'}}
# 1 same producer
grp=C.defaultdict(list)
for x in allp:
  if x.get('producer_company'): grp[x['producer_company']].append(x)
fab=[]
for comp,xs in sorted(grp.items(),key=lambda t:-len(t[1])):
  rows=[{'name':x['name'],'brand':x.get('brand'),'chain':x['chain'],'price_eur':x.get('price_eur'),'size_g':x.get('size_g'),'price_per_kg':x.get('price_per_kg'),'protein_100':x.get('protein_100'),'protein_per_euro':x.get('ppe'),'health_score':x.get('health_score'),'image_url':x.get('image_url'),'url':x.get('url')} for x in xs]
  kg=[r['price_per_kg'] for r in rows if r['price_per_kg']]
  fab.append({'company':comp,'state':xs[0].get('producer_state'),'code':xs[0].get('producer_id'),'ooe':bool(xs[0].get('ooe')),'n':len(xs),'brands':sorted({str(x.get('brand')) for x in xs}),'chains':sorted({x['chain'] for x in xs}),'price_per_kg_min':min(kg) if kg else None,'price_per_kg_max':max(kg) if kg else None,'spread_factor':r(max(kg)/min(kg)) if len(kg)>1 else None,'products':rows})
out['same_factory']=fab
# near-identical pairs: same company, shared keyword
kw=['gulasch','spätzle','lasagne','curry','knödel','ripperl','spareribs','laibchen','geschnetzeltes','risotto','gefüllte paprika','cevapcici','schnitzel','backerl','tortelloni','chili']
pairs=[]
for f in fab:
  for k in kw:
    m=[p for p in f['products'] if k in p['name'].lower() and p['price_per_kg']]
    if len(m)>1 and len({p['brand'] for p in m})>1:
      m=sorted(m,key=lambda p:p['price_per_kg'])
      pairs.append({'company':f['company'],'dish':k,'cheapest':m[0],'priciest':m[-1],'factor':r(m[-1]['price_per_kg']/m[0]['price_per_kg'])})
out['same_factory_similar_dishes']=pairs
# 2 correlations
R=[x for x in allp if x.get('ppe') is not None]
fields=['price_per_kg','kcal_100','protein_100','fat_100','satfat_100','carbs_100','sugar_100','salt_100','health_score','ppe']
def corr(a,b):
  pts=[(x[a],x[b]) for x in allp if x.get(a) is not None and x.get(b) is not None]
  if len(pts)<10:return None,len(pts)
  xs,ys=zip(*pts)
  try:return round(S.correlation(xs,ys),3),len(pts)
  except Exception:return None,len(pts)
out['correlation_matrix']={'fields':fields,'matrix':[[corr(a,b)[0] for b in fields] for a in fields],'n':[[corr(a,b)[1] for b in fields] for a in fields]}
def pt(x):return {'name':x['name'],'brand':x.get('brand'),'chain':x['chain'],'packaging':x.get('packaging'),'price_eur':x.get('price_eur'),'price_per_kg':x.get('price_per_kg'),'protein_100':x.get('protein_100'),'kcal_100':x.get('kcal_100'),'salt_100':x.get('salt_100'),'protein_per_euro':x.get('ppe'),'health_score':x.get('health_score'),'ooe':bool(x.get('ooe')),'image_url':x.get('image_url'),'rankable':x.get('rankable',True)}
BAD=re.compile(r'lasagne$|lasagneblätter|gnocchi|knödelbrot|suppe-abc|gerstl|nudel|teigwaren|dille|eis|franu|schokolad|würze|klare suppe',re.I)
def meal(x):return x.get('is_meal',True)!=False and not x.get('dry') and x.get('rankable',True) and 'Trocken' not in (x.get('packaging') or '') and not BAD.search(x['name'])
ok=[x for x in R if meal(x)]
out['scatter']={'protein_vs_price_per_kg':[pt(x) for x in ok if x.get('price_per_kg')],'kcal_vs_protein':[pt(x) for x in allp if x.get('kcal_100') is not None and x.get('protein_100') is not None and not x.get('dry')]}
pk=C.defaultdict(list)
for x in allp:
  if x.get('salt_100') is not None: pk[x.get('packaging') or 'unbekannt'].append(x['salt_100'])
out['salt_by_packaging']=[{'packaging':k,'n':len(v),'median':r(S.median(v)),'mean':r(S.mean(v)),'share_over_1_5g':r(sum(s>1.5 for s in v)/len(v)*100,1)} for k,v in sorted(pk.items(),key=lambda t:-S.median(t[1]))]
# pareto
H=sorted([x for x in ok if x.get('health_score') is not None],key=lambda x:(-x['health_score'],-x['ppe']))
par=[];best=-1
for x in H:
  if x['ppe']>best: best=x['ppe'];par.append(pt(x))
out['pareto_health_vs_protein_per_euro']=sorted(par,key=lambda p:p['health_score'])
bands=[]
for lo in range(0,100,10):
  b=[x for x in H if lo<=x['health_score']<lo+10]
  if b: t=max(b,key=lambda x:x['ppe']);bands.append({'health_band':f'{lo}-{lo+9}','n':len(b),'best':pt(t),'median_ppe':r(S.median([x['ppe'] for x in b]))})
out['best_per_health_band']=bands
# 3 traps
pe=[x['ppe'] for x in ok];medppe=S.median(pe)
out['traps']={'expensive_low_protein':[pt(x) for x in sorted([x for x in ok if x.get('price_per_kg') and x['price_per_kg']>=15 and x['protein_100']<6 and x.get('price_eur',0)>=3],key=lambda x:-x['price_per_kg'])[:25]],
'salt_bombs':[pt(x) for x in sorted([x for x in allp if x.get('salt_100') and x['salt_100']>=1.8 and meal(x) and x.get('price_eur')],key=lambda x:-x['salt_100'])[:25]],
'best_protein_per_euro':[pt(x) for x in sorted(ok,key=lambda x:-x['ppe'])[:25]],
'median_protein_per_euro':r(medppe)}
# 4 OÖ
def summ(xs):
  g=lambda f:[x[f] for x in xs if x.get(f) is not None]
  return {'n':len(xs),'median_price_per_kg':r(S.median(g('price_per_kg'))) if g('price_per_kg') else None,'median_protein_100':r(S.median(g('protein_100'))) if g('protein_100') else None,'median_salt_100':r(S.median(g('salt_100'))) if g('salt_100') else None,'median_health':r(S.median(g('health_score'))) if g('health_score') else None,'median_ppe':r(S.median(g('ppe'))) if g('ppe') else None}
oo=[x for x in allp if x.get('ooe')];res=[x for x in allp if x.get('producer_company') and not x.get('ooe')];nores=[x for x in allp if not x.get('ooe')]
out['ooe_vs_others']={'ooe':summ(oo),'other_resolved_producers':summ(res),'all_non_ooe':summ(nores),'ooe_products':[dict(pt(x),producer=x.get('producer_company')) for x in oo]}
json.dump(out,open('analysis/producers_nutrients.json','w'),ensure_ascii=False,indent=1)
# print summary
print(out['meta']);print([(f['company'],f['n'],f['brands'],f['chains'],f['price_per_kg_min'],f['price_per_kg_max'],f['spread_factor']) for f in fab])
for p in pairs:print(p['company'],p['dish'],p['cheapest']['name'],p['cheapest']['price_per_kg'],p['priciest']['name'],p['priciest']['price_per_kg'],p['factor'])
M=out['correlation_matrix'];i=fields.index
for a,b in [('protein_100','price_per_kg'),('kcal_100','protein_100'),('salt_100','health_score'),('protein_100','health_score'),('price_per_kg','health_score'),('ppe','health_score')]:print(a,b,M['matrix'][i(a)][i(b)],M['n'][i(a)][i(b)])
print(out['salt_by_packaging'])
for b in bands:print(b['health_band'],b['n'],b['best']['name'],b['best']['protein_per_euro'],b['median_ppe'])
print('med',medppe)
for k in ['expensive_low_protein','salt_bombs','best_protein_per_euro']:
  print(k);[print(' ',t['name'],t['chain'],t['price_eur'],t['price_per_kg'],t['protein_100'],t['salt_100'],t['protein_per_euro'],t['health_score']) for t in out['traps'][k][:8]]
print(json.dumps({k:v for k,v in out['ooe_vs_others'].items() if k!='ooe_products'}))
for t in out['ooe_vs_others']['ooe_products']:print(' ',t['name'],t['producer'],t['price_per_kg'],t['protein_100'])
