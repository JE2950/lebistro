import json,subprocess,re,os,statistics
man={l["id"]:l for l in json.load(open("manifest.json"))}
batches=json.load(open("batches.json"))
os.makedirs("clips",exist_ok=True)
report=[]
for b in batches:
    f=f"raw/batch{b['batch']}_{b['voice']}.mp3"
    out=subprocess.run(["ffmpeg","-hide_banner","-i",f,"-af","silencedetect=noise=-40dB:d=0.6","-f","null","-"],capture_output=True,text=True).stderr
    dur=float(re.search(r"Duration: (\d+):(\d+):([\d.]+)",out).expand(r"\1"))*3600 if False else None
    m=re.search(r"Duration: (\d+):(\d+):([\d.]+)",out);dur=int(m[1])*3600+int(m[2])*60+float(m[3])
    starts=[float(x) for x in re.findall(r"silence_start: ([\d.]+)",out)]
    ends=[float(x) for x in re.findall(r"silence_end: ([\d.]+)",out)]
    sil=list(zip(starts,ends))
    # drop leading/trailing silences
    sil=[s for s in sil if s[0]>0.05 and s[1]<dur-0.05]
    n=len(b["ids"])
    if len(sil)<n-1: print("NOT ENOUGH GAPS",f,len(sil),n);continue
    chosen=sorted(sorted(sil,key=lambda s:-(s[1]-s[0]))[:n-1])
    mind=min(s[1]-s[0] for s in chosen); rest=sorted([s[1]-s[0] for s in sil if s not in chosen],reverse=True)
    print(f, n,"lines; shortest chosen gap %.2f; longest unchosen %s"%(mind, "%.2f"%rest[0] if rest else "-"))
    bounds=[0]+[x for s in chosen for x in s]+[dur]
    for i,id_ in enumerate(b["ids"]):
        a=max(0,bounds[2*i]-0.08); z=min(dur,bounds[2*i+1]+0.25)
        subprocess.run(["ffmpeg","-y","-loglevel","error","-ss",f"{a:.3f}","-to",f"{z:.3f}","-i",f,"-ac","1","-b:a","64k",f"clips/{id_}.mp3"],check=True)
        report.append((id_,z-a,len(man[id_]["text"])))
r=[d/c for _,d,c in report if c>20]
mu=statistics.mean(r);sd=statistics.pstdev(r)
print("clips",len(report),"sec/char mean %.3f sd %.3f"%(mu,sd))
for id_,d,c in report:
    if c>20 and abs(d/c-mu)>2.5*sd: print("OUTLIER",id_,round(d,2),c)
for id_,d,c in report:
    if c<=20 and id_.startswith(("n1_","n17","noncest","wrong","bye","leave")): print(id_,round(d,2),c)
