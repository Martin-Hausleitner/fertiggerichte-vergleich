import json,subprocess,urllib.parse,os
W={'billa':'Billa (Supermarkt)','spar':'Spar (Handelskette)','hofer':'Hofer KG','lidl':'Lidl','dm':'Dm-drogerie markt','penny':'Penny (Supermarkt)','knorr':'Knorr (Marke)','maggi':'Maggi (Marke)','iglo':'Iglo','inzersdorfer':'Inzersdorfer','clever':'Clever (Marke)','ja-natuerlich':'Ja! Natürlich','s-budget':'S-Budget','rana':'Pastificio Rana','barilla':'Barilla','frosta':'Frosta','hipp':'HiPP','ben-s-original':"Ben’s Original",'felix':'Felix Austria','radatz':'Radatz','wiesbauer':'Wiesbauer','alnatura':'Alnatura','schaer':'Dr. Schär','spar-natur-pur':'Spar Natur*pur','greisinger':'Greisinger','huetthaler':'Hütthaler','planted':'Planted'}
UA='GrokBotBrandLogos/1.0 (research)'
res={}
def get(u):return subprocess.run(['curl','-sL','-A',UA,u],capture_output=True,timeout=40).stdout
for s,t in W.items():
  for lang in('de','en'):
    try:
      q=json.loads(get(f'https://{lang}.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages|images&piprop=original&imlimit=50&redirects=1&titles='+urllib.parse.quote(t)))
      p=list(q['query']['pages'].values())[0]
      imgs=[i['title'] for i in p.get('images',[]) if 'logo' in i['title'].lower()]
      url=None
      if imgs:
        ii=json.loads(get(f'https://{lang}.wikipedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=url&titles='+urllib.parse.quote(imgs[0])))
        url=list(ii['query']['pages'].values())[0]['imageinfo'][0]['url']
      elif 'original' in p and p['original']['source'].lower().endswith(('.svg','.png')): url=p['original']['source']
      if url:
        ext=url.rsplit('.',1)[1].lower();fn=f'{s}.{ext}';b=get(url)
        if len(b)>200: open(fn,'wb').write(b);res[s]=dict(file='logos/'+fn,source=url,wiki=f'{lang}:{t}');break
    except Exception as e: pass
json.dump(res,open('../logos.json','w'),indent=1,ensure_ascii=False);print(len(res),sorted(set(W)-set(res)))
