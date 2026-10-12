import json,re,statistics as st,collections as C
s=json.load(open('scored.json'));e=json.load(open('expand.json'))
def chain(x):
    t=((x.get('store') or '')+' '+(x.get('source_file') or '')).lower()
    for k,v in [('fit to go','Fit to Go'),('ftg','Fit to Go'),('billa','Billa'),('spar','Spar'),('hofer','Hofer'),('aldi','Hofer'),('lidl','Lidl'),('dm','dm'),('penny','Penny')]:
        if k in t: return v
    return None
CATS=[('Ripperl',r'ripperl|spare ?rib|rippchen'),('Pute',r'pute|truthahn'),('Huhn',r'huhn|hühn|hendl|chicken|poulet|pollo|geflügel|hähnchen'),
('Fisch',r'fisch|lachs|thunfisch|kabeljau|seelachs|garnele|shrimp|scampi|forelle|alaska|dorsch|tuna'),
('Gulasch',r'gulasch|goulash'),('Curry',r'curry|tikka|masala|korma|dal\b|dhal'),('Suppe',r'suppe|eintopf|soup|brühe|bouillon|minestrone'),
('Knödel',r'knödel|knodel|nockerl|klöße|kloß'),('Pasta',r'pasta|nudel|spaghetti|lasagne|tortell|ravioli|penne|gnocchi|spätzle|maccheroni|tagliatelle|fusilli|cannelloni|tortelloni'),
('Bowl',r'bowl'),('Asia',r'asia|wok|thai|teriyaki|sushi|bami|nasi|chop suey|udon|ramen|frühlingsrolle|pad |sweet ?sour|süß-sauer|china|japan|korea|bulgogi|gyoza'),
('Hülsenfrüchte',r'linse|bohne|kichererb|chili|falafel|erbse|hummus'),
('Rind',r'rind|beef|kalb|bolognese|faschiert|cevapcici|burger|hackfleisch|tafelspitz'),('Schwein',r'schwein|schnitzel|schweins|speck|wurst|leberkäs|kassler|selch|stelze|bratl|pork|grammel')]
def cats(x):
    n=(x.get('name') or '').lower()+' '+(x.get('category') or '').lower()
    c=[k for k,r in CATS if re.search(r,n)]
    v=(x.get('veg') or '');vs=str(v).lower()
    if 'vegan' in n or vs=='vegan': c.append('vegan')
    elif not set(c)&{'Ripperl','Pute','Huhn','Fisch','Rind','Schwein','Gulasch'} and (re.search(r'veget|veggie|gemüse|käse|spinat|pilz|schwammerl|risotto|tofu|soja',n) or vs in('vegetarian','vegetarisch','true')): c.append('vegetarisch')
    return c or ['Sonstige']
rows=[]
for x in s:
    if x.get('is_meal') is False: continue
    rows.append(dict(x,_c=chain(x),_cat=cats(x),_src='scored'))
urls={x.get('url') for x in s}
for x in e:
    if x.get('url') in urls: continue
    p=x.get('price_eur');pp=x.get('protein_pack')
    if p and not pp and x.get('protein_100') and x.get('size_g'): pp=x['protein_100']*x['size_g']/100
    r=dict(x,_c=chain(x),_cat=cats(x),_src='expand')
    r['price_per_10g_protein']=round(p/pp*10,2) if p and pp else None
    rows.append(r)
def med(v):
    v=[a for a in v if isinstance(a,(int,float))];return round(st.median(v),2) if v else None
def agg(rs):
    rk=[r for r in rs if r.get('rankable')]
    return dict(count=len(rs),n_with_nutrition=sum(1 for r in rs if r.get('protein_100') is not None),n_rankable=len(rk),
      median_price=med([r.get('price_eur') for r in rs]),median_price_per_kg=med([r.get('price_per_kg') for r in rs]),
      median_eur_per_10g_protein=med([r.get('price_per_10g_protein') for r in rk]),
      median_eur_per_10g_protein_all=med([r.get('price_per_10g_protein') for r in rs]),median_health_score=med([r.get('health_score') for r in rs]),median_salt_100=med([r.get('salt_100') for r in rs]),
      median_kcal_100=med([r.get('kcal_100') for r in rs]),median_protein_100=med([r.get('protein_100') for r in rs]))
CH=['Billa','Spar','Hofer','Lidl','dm','Fit to Go','Penny']
chains={c:agg([r for r in rows if r['_c']==c]) for c in CH}
catn=[k for k,_ in CATS]+['vegetarisch','vegan','Sonstige']
cat={k:agg([r for r in rows if k in r['_cat']]) for k in catn}
def lite(r): return {k:r.get(k) for k in['name','brand','store','price_eur','size_g','protein_pack','protein_100','kcal_100','salt_100','price_per_10g_protein','health_score','image_url','url']}|{'chain':r['_c']}
best={}
for k in catn:
    rk=[r for r in rows if k in r['_cat'] and r.get('rankable') and r.get('health_score') is not None and r.get('price_per_10g_protein')]
    if not rk: continue
    hs=[r['health_score'] for r in rk];pp=[r['price_per_10g_protein'] for r in rk]
    for r in rk: r['_lei']=round(0.5*r['health_score']/max(hs)*100+0.5*min(pp)/r['price_per_10g_protein']*100,1)
    rk.sort(key=lambda r:-r['_lei'])
    best[k]={'gerichts_leistung_formula':'0.5*health/maxHealth*100 + 0.5*minEurPer10gP/EurPer10gP*100 (innerhalb Kategorie)',
      'top':[lite(r)|{'leistung':r['_lei']} for r in rk[:5]],'healthiest':lite(max(rk,key=lambda r:r['health_score'])),'cheapest_protein':lite(min(rk,key=lambda r:r['price_per_10g_protein']))}
bins=[0,1,2,3,4,5,6,8,10,15,100]
def hist(v):
    v=[a for a in v if a];h=[0]*(len(bins)-1)
    for a in v:
        for i in range(len(bins)-1):
            if bins[i]<=a<bins[i+1]: h[i]+=1;break
    return h
labels=[f'{bins[i]}–{bins[i+1]} €' if bins[i+1]<100 else f'≥{bins[i]} €' for i in range(len(bins)-1)]
histo={'bins':labels,'series':{c:hist([r.get('price_eur') for r in rows if r['_c']==c]) for c in CH}}
hm=[];
for c in CH:
    for k in catn:
        v=[r.get('price_per_10g_protein') for r in rows if r['_c']==c and k in r['_cat'] and r.get('rankable')]
        v=[a for a in v if a]
        hm.append({'chain':c,'category':k,'median_eur_per_10g_protein':med(v),'n':len(v)})
out=dict(meta=dict(sources=['scored.json','expand.json (nur Preis/Anzahl; Nährwerte meist fehlend)'],n_total=len(rows),n_unassigned_chain=sum(1 for r in rows if not r['_c']),
  note='€/10g Protein & Health-Score nur aus rankable Produkten (scored.json); Mediane'),
  chains=chains,categories=cat,best_per_category=best,price_histogram=histo,heatmap_chain_category=hm,
  charts=dict(bar_chain_eur10gP=[{'x':c,'y':chains[c]['median_eur_per_10g_protein']} for c in CH],
   bar_cat_eur10gP=sorted([{'x':k,'y':cat[k]['median_eur_per_10g_protein'],'n':cat[k]['n_rankable']} for k in catn if cat[k]['median_eur_per_10g_protein']],key=lambda a:a['y']),
   bar_cat_health=sorted([{'x':k,'y':cat[k]['median_health_score']} for k in catn if cat[k]['median_health_score']],key=lambda a:-a['y'])))
json.dump(out,open('analysis/chains_categories.json','w'),ensure_ascii=False,indent=1)

for c in CH: print(c,chains[c])
for k in catn: print(k,cat[k])
for k in best: t=best[k]['top'][0];print('BEST',k,t['name'],t['chain'],t['price_eur'],t['price_per_10g_protein'],t['health_score'])
print(out['meta'])
