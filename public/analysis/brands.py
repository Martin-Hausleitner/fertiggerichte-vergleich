import json,re,statistics as st,collections
B='/workspace/fertig/'
d=json.load(open(B+'scored.json'));e=json.load(open(B+'expand.json'))
for x in d:x['_src']='scored'
for x in e:x['_src']='expand'
seen=set();rows=[]
for x in d+e:
    k=x.get('url') or x.get('name')
    if k in seen: continue
    seen.add(k);rows.append(x)
# canonical brand: (pattern on brand-or-name, canonical, chain_owner, type, tier)
AL=[
(r'spar natur\*?pur','SPAR Natur*pur','SPAR','PL','bio'),
(r'spar feine k','SPAR Feine Küche','SPAR','PL','standard'),
(r'spar premium','SPAR Premium','SPAR','PL','premium'),
(r'spar veggie','SPAR Veggie','SPAR','PL','veggie'),
(r'spar enjoy','SPAR enjoy','SPAR','PL','standard'),
(r'spar vital','SPAR Vital','SPAR','PL','health'),
(r'spar free','SPAR free from','SPAR','PL','health'),
(r's-budget','S-Budget','SPAR','PL','budget'),
(r'despar','Despar','SPAR','PL','standard'),
(r'^spar\b','SPAR (Standard)','SPAR','PL','standard'),
(r'billa genusswelt','BILLA Genusswelt','BILLA','PL','premium'),
(r'billa immer gut','BILLA Immer Gut','BILLA','PL','standard'),
(r'billa bio','BILLA Bio','BILLA','PL','bio'),
(r'^clever','Clever','BILLA','PL','budget'),
(r'ja! ?nat','Ja! Natürlich','BILLA','PL','bio'),
(r'simply good','Simply Good','BILLA','PL','health'),
(r'omis schmankerl','Omis Schmankerl','BILLA','PL','standard'),
(r'vegavita','Vegavita','BILLA','PL','veggie'),
(r'^billa\b','BILLA (Standard)','BILLA','PL','standard'),
(r'good choice','Good Choice','HOFER','PL','standard'),
(r'primana','Primana','HOFER','PL','budget'),
(r'cucina nobile','Cucina Nobile','HOFER','PL','premium'),
(r'^cucina','Cucina','HOFER','PL','standard'),
(r'le gusto','Le Gusto','HOFER','PL','standard'),
(r'gourmet finest','Gourmet Finest Cuisine','HOFER','PL','premium'),
(r"leibspeis",'Leibspeis\'','HOFER','PL','standard'),
(r"nature'?s gold",'Nature\'s Gold','HOFER','PL','bio'),
(r'chef select','Chef Select','LIDL','PL','standard'),
(r'^deluxe','Deluxe','LIDL','PL','premium'),
(r'mcennedy','McEnnedy','LIDL','PL','standard'),
(r'vemondo','Vemondo','LIDL','PL','veggie'),
(r'dmbio','dmBio','dm','PL','bio'),
(r'fit2go|fit to go','Fit to Go',None,'NB','premium'),
(r'knorr','Knorr',None,'NB',None),(r'maggi','Maggi',None,'NB',None),
(r'inzersdorfer','Inzersdorfer',None,'NB',None),(r'^iglo','iglo',None,'NB',None),
(r'^rana','Rana',None,'NB',None),(r'^felix','Felix',None,'NB',None),
(r"ben.?s orig",'Ben\'s Original',None,'NB',None),(r'hofst.dter','Hofstädter',None,'NB',None),
(r'radatz','Radatz',None,'NB',None),(r'wiesbauer','Wiesbauer',None,'NB',None),
(r'greisinger','Greisinger',None,'NB',None),(r'h.tthaler','Hütthaler',None,'NB',None),
(r'little lunch','Little Lunch',None,'NB',None),(r'blue elephant','Blue Elephant',None,'NB',None),
(r'cecchin','Cecchin',None,'NB',None),(r'vier diamanten','Vier Diamanten',None,'NB',None),
(r'stangl','Stangl',None,'NB',None),(r'frosta','Frosta',None,'NB',None),(r'barilla','Barilla',None,'NB',None),
(r'sch.r\b','Schär',None,'NB',None),(r'indomie','Indomie',None,'NB',None),(r'alnatura','Alnatura',None,'NB',None),
(r"kelly",'Kelly\'s',None,'NB',None),(r'tann\b','Tann','SPAR','PL','standard'),(r'hipp','HiPP',None,'NB',None),
(r'ackerl','Ackerl',None,'NB',None),(r'ager\b','Ager',None,'NB',None),(r'toni kaiser','Toni Kaiser',None,'NB',None),
(r'feelfood','Feelfood',None,'NB',None),(r'hink','Hink',None,'NB',None),(r'amlacher','Amlacher',None,'NB',None),
(r'johanna maier','Johanna Maier',None,'NB',None),(r'mamia','Mamia',None,'NB',None),
]
def chain(s):
    s=(s or '').lower()
    for c in ['billa','interspar','spar','hofer','aldi','lidl','dm','fit to go','penny','merkur']:
        if s.startswith(c): return {'interspar':'SPAR','aldi':'HOFER','merkur':'BILLA'}.get(c,c.upper() if c!='fit to go' else 'Fit to Go')
    return None
out=[]
for x in rows:
    if x.get('is_meal') is False: continue
    b=(x.get('brand') or '').strip(); n=x.get('name') or ''
    can=None
    for p,c,o,t,tier in AL:
        if (b and re.search(p,b,re.I)) or re.search(p,n.strip(),re.I) and (not b or True):
            if b and not re.search(p,b,re.I) and re.search(p,n,re.I) and AL.index((p,c,o,t,tier))>-1:
                # prefer brand field match if brand set; check brand matches any other alias first
                if any(re.search(pp,b,re.I) for pp,*_ in AL): continue
            can=(c,o,t,tier);break
    if not can:
        if not b: continue
        can=(b,None,'NB',None)
    pr=x.get('price_eur');ppk=x.get('price_per_kg')
    p100=x.get('protein_100');kc=x.get('kcal_100');sz=x.get('size_g')
    p10=x.get('price_per_10g_protein')
    if p10 is None and pr and p100 and sz and p100>0: p10=round(pr/(p100*sz/100)*10,3)
    pk=x.get('protein_per_100kcal')
    if pk is None and p100 and kc: pk=round(p100/kc*100,2)
    if x.get('dry') or (p100 and p100>30): p10=None;pk=None  # exclude dry/implausible
    out.append(dict(brand=can[0],owner=can[1],type=can[2],tier=can[3],store=chain(x.get('store')) or can[1],
      name=n,price=pr,ppk=ppk,p10=p10,pk=pk,protein=p100,salt=x.get('salt_100'),hs=x.get('health_score'),
      pack=x.get('packaging'),producer=x.get('producer_company'),img=x.get('image_url')))
json.dump(out,open(B+'analysis/brand_rows.json','w'),ensure_ascii=False)
def S(v):
    v=sorted(a for a in v if isinstance(a,(int,float)))
    if not v: return None
    q=st.quantiles(v,n=4) if len(v)>1 else [v[0]]*3
    return dict(n=len(v),min=v[0],q1=round(q[0],3),median=round(st.median(v),3),q3=round(q[2],3),max=v[-1],mean=round(st.mean(v),3))
g=collections.defaultdict(list)
for r in out:g[r['brand']].append(r)
brands=[]
for b,L in g.items():
    m=lambda k:S([r[k] for r in L])
    brands.append(dict(brand=b,owner=L[0]['owner'],type=L[0]['type'],tier=L[0]['tier'],count=len(L),
      stores=sorted({r['store'] for r in L if r['store']}),price=m('price'),price_per_kg=m('ppk'),
      eur_per_10g_protein=m('p10'),health_score=m('hs'),protein_per_100kcal=m('pk'),salt_100=m('salt'),protein_100=m('protein'),
      packaging=collections.Counter(r['pack'] for r in L if r['pack']).most_common(3),
      producers=collections.Counter(r['producer'] for r in L if r['producer']).most_common(3)))
brands.sort(key=lambda z:-z['count'])
json.dump(brands,open(B+'analysis/_brands_tmp.json','w'),ensure_ascii=False,indent=1)
for z in brands:
    f=lambda k:(z[k] or {}).get('median');n=lambda k:(z[k] or {}).get('n')
    print(f"{z['brand'][:22]:22}{z['type']} {str(z['tier']):8}{z['count']:4} €{f('price')} kg{f('price_per_kg')}({n('price_per_kg')}) p10 {f('eur_per_10g_protein')}({n('eur_per_10g_protein')}) hs{f('health_score')}({n('health_score')}) pk{f('protein_per_100kcal')} salt{f('salt_100')}")
