import json,glob,re
keys=json.load(open('/home/sandbox/codemod/keys.json'))
out={}
for f in sorted(glob.glob('/home/sandbox/codemod/tr/*.txt')):
    for line in open(f,encoding='utf8'):
        line=line.rstrip('\n')
        if not line.strip(): continue
        i,_,v=line.partition('|')
        out[keys[int(i)]]=v
body='// Auto-assembled English dictionary: Arabic source text -> English.\nexport default '+json.dumps(out,ensure_ascii=False,indent=1)+';\n'
open('/home/sandbox/erp/mono/frontend/src/i18n/en/dictionary.js','w',encoding='utf8').write(body)
print(len(out),'of',len(keys))
