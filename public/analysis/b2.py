import json,statistics as st,collections,re
R=json.load(open('brand_rows.json'))
for r in R:
    if r['p10'] and r['p10']>20: r['p10']=None
    if r['salt'] is not None and r['salt']>10: r['salt']=None
    if r['ppk'] and r['ppk']>100: r['ppk']=None
def S(v):
    v=sorted(a for a in v if isinstance(a,(int,float)))
    if not v:return None
    q=st.quantiles(v,n=4,method='inclusive') if len(v)>1 else [v[0]]*3
    return dict(n=len(v),min=v[0],q1=round(q[0],2),median=round(st.median(v),2),q3=round(q[2],2),max=v[-1],mean=round(st.mean(v),2))
K=[('price','price'),('price_per_kg','ppk'),('eur_per_10g_protein','p10'),('health_score','hs'),('protein_per_100kcal','pk'),('salt_100','salt'),('protein_100','protein')]
def agg(L):return {a:S([r[b] for r in L]) for a,b in K}
slug=lambda s:re.sub(r'[^a-z0-9]+','-',s.lower().replace('ä','ae').replace('ö','oe').replace('ü','ue').replace('*','')).strip('-')
g=collections.defaultdict(list)
for r in R:g[r['brand']].append(r)
allp10=st.median([r['p10'] for r in R if r['p10']]);allppk=st.median([r['ppk'] for r in R if r['ppk']])
brands=[]
for b,L in g.items():
    a=agg(L);m=lambda k:(a[k] or {}).get('median')
    brands.append(dict(brand=b,slug=slug(b),owner=L[0]['owner'],type='Eigenmarke' if L[0]['type']=='PL' else 'Markenartikel',tier=L[0]['tier'],count=len(L),
     stores=sorted({r['store'] for r in L if r['store']}),stats=a,
     price_premium_kg_pct=round((m('price_per_kg')/allppk-1)*100,1) if m('price_per_kg') else None,
     protein_price_premium_pct=round((m('eur_per_10g_protein')/allp10-1)*100,1) if m('eur_per_10g_protein') and a['eur_per_10g_protein']['n']>=3 else None,
     top_producers=collections.Counter(r['producer'] for r in L if r['producer']).most_common(3),
     packaging=collections.Counter(r['pack'] for r in L if r['pack']).most_common(3),
     cheapest=min((r for r in L if r['price']),key=lambda r:r['price'],default=None) and {k:min((r for r in L if r['price']),key=lambda r:r['price'])[k] for k in('name','price','img')},
     best_protein_value=(lambda c:{k:c[k] for k in('name','price','p10','img')} if c else None)(min((r for r in L if r['p10']),key=lambda r:r['p10'],default=None))))
brands.sort(key=lambda z:-z['count'])
def rank(metric,minn=3,rev=False):
    L=[(z['brand'],z['slug'],z['stats'][metric]['median'],z['stats'][metric]['n']) for z in brands if z['stats'][metric] and z['stats'][metric]['n']>=minn]
    L.sort(key=lambda t:t[2],reverse=rev);return [dict(brand=a,slug=s,value=v,n=n) for a,s,v,n in L]
def box(metric,minn=5):
    return [dict(brand=z['brand'],slug=z['slug'],**z['stats'][metric]) for z in brands if z['stats'][metric] and z['stats'][metric]['n']>=minn]
grp=lambda f:{k:agg([r for r in R if f(r)==k]) for k in sorted({f(r) for r in R if f(r)},key=str)}
pl=lambda r:'Eigenmarke' if r['type']=='PL' else 'Markenartikel'
chain_lines={}
for c in['BILLA','SPAR','HOFER','LIDL','dm']:
    chain_lines[c]=[dict(brand=z['brand'],slug=z['slug'],tier=z['tier'],count=z['count'],**{k:(z['stats'][k] or {}).get('median') for k in('price','price_per_kg','eur_per_10g_protein','health_score','protein_per_100kcal','salt_100')}) for z in brands if z['owner']==c]
out=dict(meta=dict(generated='2026-10-12',rows=len(R),brands=len(brands),sources=['scored.json','expand.json'],
  notes='Mediane; Rankings nur Marken mit n>=3 Werten; €/10g Protein >20 und Salz >10 g/100g als Datenfehler entfernt; Trockenprodukte ohne €/Protein. overall_median_eur_per_10g_protein=%s, overall_median_price_per_kg=%s'%(allp10,allppk)),
 brands=brands,
 bar_rankings=dict(cheapest_price_per_kg=rank('price_per_kg'),most_expensive_price_per_kg=rank('price_per_kg',rev=True),
   cheapest_protein=rank('eur_per_10g_protein'),healthiest=rank('health_score',rev=True),protein_density=rank('protein_per_100kcal',rev=True),
   lowest_salt=rank('salt_100'),cheapest_pack_price=rank('price'),
   protein_price_premium=sorted([dict(brand=z['brand'],slug=z['slug'],value=z['protein_price_premium_pct']) for z in brands if z['protein_price_premium_pct'] is not None],key=lambda d:d['value'])),
 boxplots={m:box(m) for m in('price','price_per_kg','eur_per_10g_protein','health_score','protein_per_100kcal','salt_100')},
 scatter=dict(price_vs_protein=[dict(brand=r['brand'],name=r['name'],x=r['price'],y=r['p10'],hs=r['hs'],type=pl(r)) for r in R if r['price'] and r['p10']],
   brand_bubbles=[dict(brand=z['brand'],slug=z['slug'],x=z['stats']['eur_per_10g_protein']['median'],y=z['stats']['health_score']['median'],size=z['count'],type=z['type']) for z in brands if z['stats']['eur_per_10g_protein'] and z['stats']['eur_per_10g_protein']['n']>=3 and z['stats']['health_score']]),
 private_vs_name=grp(pl),tiers=grp(lambda r:r['tier'] if r['type']=='PL' else None),chain_lines=chain_lines)
json.dump(out,open('brands.json','w'),ensure_ascii=False,indent=1)
print(allp10,allppk)
for k in['cheapest_price_per_kg','cheapest_protein','healthiest','protein_price_premium','protein_density']:print(k,[(d['brand'],d['value'],d.get('n')) for d in out['bar_rankings'][k]][:12])
print('most exp',[(d['brand'],d['value']) for d in out['bar_rankings']['most_expensive_price_per_kg']][:10])
for k,v in out['private_vs_name'].items():print(k,{m:(v[m]['median'],v[m]['n']) for m in v if v[m]})
for k,v in out['tiers'].items():print(k,{m:(v[m]['median'],v[m]['n']) for m in v if v[m]})
for c,L in chain_lines.items():print(c,[(d['brand'],d['count'],d['price_per_kg'],d['eur_per_10g_protein'],d['health_score']) for d in L])
