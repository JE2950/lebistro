import json, random
random.seed(7)
PL=[("croque","un croque-monsieur"),("sandwich","un sandwich au jambon"),("omelette","une omelette au fromage"),("crepechoc","une crêpe au chocolat"),("crepesucre","une crêpe au sucre"),("salade","une salade de tomates")]
BO=[(None,None),("limonade","une limonade"),("jus","un jus d'orange"),("chocolat","un chocolat chaud"),("eau","une eau minérale")]
DE=[(None,None),("glace","une glace à la vanille"),("tarte","une tarte aux pommes")]
GREET=["Bonjour !","Bonsoir !","Salut !","Bonjour, monsieur !","Bonjour, madame !"]
OPEN=["Je voudrais","Je vais prendre","J'aimerais","Pour moi,"]
CLOSE=[", s'il vous plaît."," s'il vous plaît !",", merci !"]
NUM=["zéro","un","deux","trois","quatre","cinq","six","sept","huit","neuf","dix","onze","douze","treize","quatorze","quinze","seize","dix-sept","dix-huit","dix-neuf","vingt","vingt et un","vingt-deux","vingt-trois","vingt-quatre","vingt-cinq"]
def lf(a): return a[0] if len(a)<2 else ", ".join(a[:-1])+" et "+a[-1]
lines=[]
combos=[(p,b,d) for p in PL for b in BO for d in DE]
random.shuffle(combos)
for i,(p,b,d) in enumerate(combos):
    w=[p[1]]+([b[1]] if b[0] else [])+([d[1]] if d[0] else [])
    v="f" if i%2==0 else "m"
    lines.append(dict(id=f"o_{p[0]}_{b[0] or 'x'}_{d[0] or 'x'}",voice=v,kind="order",plat=p[0],boisson=b[0],dessert=d[0],
        text=f"{random.choice(GREET)} {random.choice(OPEN)} {lf(w)}{random.choice(CLOSE)}"))
for v in "fm":
    lines.append(dict(id=f"wrong_{v}",voice=v,kind="wrong",text="Non ! Ce n'est pas ma commande."))
    lines.append(dict(id=f"bye_{v}",voice=v,kind="bye",text="Merci, au revoir !"))
    lines.append(dict(id=f"leave_{v}",voice=v,kind="leave",text="Je m'en vais !"))
    lines.append(dict(id=f"noncest_{v}",voice=v,kind="noncest",text="Non, c'est"))
    for n in range(1,26):
        lines.append(dict(id=f"n{n}_{v}",voice=v,kind="num",n=n,text=f"{NUM[n]} euro{'s' if n>1 else ''}."))
json.dump(lines,open("manifest.json","w"),ensure_ascii=False,indent=1)
# batches per voice, <=2300 chars incl breaks
SEP=' <break time="1.5s" /> '
batches=[]
for v in "fm":
    cur=[];size=0
    for L in [l for l in lines if l["voice"]==v]:
        add=len(L["text"])+len(SEP)
        if cur and size+add>2300: batches.append((v,cur));cur=[];size=0
        cur.append(L);size+=add
    if cur: batches.append((v,cur))
out=[]
for k,(v,b) in enumerate(batches,1):
    t=SEP.join(l["text"] for l in b)
    open(f"batch{k}_{v}.txt","w").write(t)
    out.append(dict(batch=k,voice=v,ids=[l["id"] for l in b],chars=len(t)))
json.dump(out,open("batches.json","w"),indent=1)
for o in out: print(o["batch"],o["voice"],len(o["ids"]),"lines",o["chars"],"chars")
print("total text chars",sum(len(l["text"]) for l in lines))
