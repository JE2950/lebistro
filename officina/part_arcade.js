/* ================= ARCADE: the workshop ================= */
/* W shelves (words), D wax tablets, K seal desks, X the messenger, Z the basket, # stone counters */
const MAP=["#WWWWW#XX#WWWW#","W.............W","W....#D##.....W","W....####.....W","W.............W","W.............W","W....#KK#.....W","#.............#","#WWWW#Z#WWWWW##"];
const MW=15,MH=9;
const SHELVES=[];MAP.forEach((row,r)=>[...row].forEach((ch,c)=>{if(ch==="W")SHELVES.push(r+","+c)}));
const COLS=["#c0392b","#2f80ed","#e9b10f","#3fa535"];
/* The four scribes (red, blue, yellow, green), cut out from Jonny's artwork. FACE: which way each one looks by default. */
const CHEF_SRC=/*SPRITES*/[];
const CHEF_FACE=[1,1,1,1];
const CHEF_IMG=CHEF_SRC.map(src=>{const im=new Image();im.src=src;return im});
const lastLR={};
if(CHEF_SRC.length){$("picClassic").innerHTML=`<img src="${CHEF_SRC[0]}" alt=""><span>📜</span><span>🪙</span>`;$("picArcade").innerHTML=CHEF_SRC.map(s=>`<img src="${s}" alt="">`).join("")}
const MSG=["","Take a wax tablet first!","That space is taken.","Nobody asked for that message.","The tablet is full.","","Into the basket!","","Those words don't match any message. Check your forms!","Your hands are full.","Seal the tablet first! ●"];
const SEAL_T=2.5,MAXW=6;
let A=null,raf=0;
const enc=it=>!it?"":it.t==="w"?"w:"+it.w:(it.t+":"+it.ing.join("|"));
const dec=s=>!s?null:s[0]==="w"?{t:"w",w:s.slice(2)}:{t:s[0],ing:s.slice(2)?s.slice(2).split("|"):[]};
const solid=(c,r)=>r<0||r>=MH||c<0||c>=MW||MAP[r][c]!==".";
function newArcade(players){
  return {phase:"play",time:240,score:0,served:0,missed:0,players,tiles:{},cook:{},shelf:{},tickets:[],tid:0,spawnT:2,ev:[],evSeq:0,seen:new Set(),lvl};
}
function mkPlayer(id,name,i){const sp=[[2.5,1.5],[12.5,1.5],[2.5,7.5],[12.5,7.5]][i%4];return {id,name:String(name||"Scriba").slice(0,12),col:COLS[i%4],x:sp[0],y:sp[1],fx:0,fy:1,hold:null,inp:{x:0,y:0,a:0},lastA:0}}
function pushEv(k,a,b,c){A.ev.push([++A.evSeq,k,a,b,c]);if(A.ev.length>12)A.ev.shift();handleEv(A.ev[A.ev.length-1])}
function collide(x,y){const r=.3;return solid(Math.floor(x-r),Math.floor(y-r))||solid(Math.floor(x+r),Math.floor(y-r))||solid(Math.floor(x-r),Math.floor(y+r))||solid(Math.floor(x+r),Math.floor(y+r))}
function facing(p){const fx=Math.abs(p.fx)>=Math.abs(p.fy)?Math.sign(p.fx):0,fy=fx?0:Math.sign(p.fy)||1;return [Math.floor(p.x)+fx,Math.floor(p.y)+fy]}
function addWord(tab,w){if(tab.t!=="p")return 10;if(tab.ing.length>=MAXW)return 4;tab.ing.push(w);return 0}
/* keep every word the open messages need (and their wrong forms) on a shelf */
function restock(){
  const need=new Map();A.tickets.forEach(t=>t.ws.concat(t.dw||[]).forEach(w=>{if(!need.has(wkey(w)))need.set(wkey(w),w)}));
  for(const k in A.shelf)if(!need.has(wkey(A.shelf[k])))delete A.shelf[k];
  const have=new Set(Object.values(A.shelf).map(wkey)),free=shuffle(SHELVES.filter(k=>!A.shelf[k]));
  for(const [kk,w] of need)if(!have.has(kk)&&free.length)A.shelf[free.pop()]=w;
}
function pmsg(p,code){pushEv("m",p.id,code)}
function interact(p){
  const [c,r]=facing(p);if(r<0||r>=MH||c<0||c>=MW)return;
  const ch=MAP[r][c],key=r+","+c,cur=A.tiles[key],h=p.hold;
  if(ch==="W"){const w=A.shelf[key];if(!w)return;
    if(!h)p.hold={t:"w",w};else if(h.t==="p"){const e=addWord(h,w);if(e)pmsg(p,e)}else pmsg(p,h.t==="d"?2:9);return}
  if(ch==="D"){if(!h)p.hold={t:"p",ing:[]};else if(h.t==="w")p.hold={t:"p",ing:[h.w]};else pmsg(p,9);return}
  if(ch==="Z"){if(h){p.hold=null;pmsg(p,6)}return}
  if(ch==="X"){deliver(p);return}
  if(ch==="#"||ch==="K"){
    if(!h){if(cur){p.hold=cur;delete A.tiles[key];delete A.cook[key]}return}
    if(!cur){
      if(ch==="K"&&!(h.t==="p"&&h.ing.length)){pmsg(p,1);return}
      A.tiles[key]=h;p.hold=null;if(ch==="K"&&h.t==="p")A.cook[key]=0;return}
    if(cur.t==="p"&&h.t==="w"){const e=addWord(cur,h.w);if(e)pmsg(p,e);else{p.hold=null;if(ch==="K")A.cook[key]=0}return}
    if(h.t==="p"&&cur.t==="w"){const e=addWord(h,cur.w);if(e)pmsg(p,e);else delete A.tiles[key];return}
    if(h.t==="p"&&cur.t==="p"){if(h.ing.length+cur.ing.length>MAXW){pmsg(p,4);return}cur.ing=cur.ing.concat(h.ing);p.hold=null;if(ch==="K")A.cook[key]=0;return}
    pmsg(p,2);
  }
}
function deliver(p){
  const h=p.hold;if(!h)return;
  if(h.t==="p"){pmsg(p,h.ing.length?10:1);return}
  if(h.t!=="d"){pmsg(p,3);return}
  const tk=A.tickets.find(t=>sameWords(t.ws,h.ing));
  if(!tk){pmsg(p,8);return}
  p.hold=null;const pay=tk.ws.length*2+Math.ceil(tk.t/tk.max*3);A.score+=pay;A.served++;
  A.tickets=A.tickets.filter(t=>t!==tk);restock();pushEv("d",tk.id,pay);
}
function newTicket(b,dw){
  const L=LEVELS[A.lvl];const t={id:++A.tid,b:BANK.indexOf(b),ws:words(b.lat),dw:dw||[],face:citizen().face,t:L.aTime,max:L.aTime};
  A.tickets.push(t);A.seen.add(b);restock();pushEv("n",t.id,t.b);return t;
}
function spawnTicket(){
  const L=LEVELS[A.lvl];if(A.tickets.length>=L.aMax)return;
  const busy=A.tickets.map(t=>t.b),P=pool().filter(b=>{const n=words(b.lat).length;return n>=2&&n<=L.maxW&&!busy.includes(BANK.indexOf(b))});
  if(!P.length)return;const b=pick(P);
  // wrong forms to tempt careless scribes: the bank's other forms of the gap word
  const dw=b.g&&b.g[0]?b.g[0][1].slice(1).filter(w=>!words(b.lat).map(wkey).includes(wkey(w))).slice(0,L.hints?1:2):[];
  newTicket(b,dw);
}
function step(dt){
  if(!A.tuto)A.time-=dt;
  const L=LEVELS[A.lvl],n=A.players.length;
  if(!A.tuto)A.spawnT-=dt;if(A.spawnT<=0){spawnTicket();A.spawnT=(A.tickets.length<=1?5:L.aSpawn/(1+.2*(n-1)))}
  for(const p of A.players){
    const m=Math.hypot(p.inp.x,p.inp.y),sp=4.2;
    if(m>.15){const vx=p.inp.x/Math.max(1,m)*sp,vy=p.inp.y/Math.max(1,m)*sp;
      const nx=p.x+vx*dt;if(!collide(nx,p.y))p.x=nx;const ny=p.y+vy*dt;if(!collide(p.x,ny))p.y=ny;p.fx=p.inp.x;p.fy=p.inp.y}
    if(p.inp.a!==p.lastA){p.lastA=p.inp.a;interact(p)}
  }
  for(const key in A.cook){const it=A.tiles[key];if(!it||it.t!=="p"){delete A.cook[key];continue}
    A.cook[key]+=dt;if(A.cook[key]>=SEAL_T){it.t="d";delete A.cook[key]}}
  let gone=false;
  for(const t of A.tickets){if(A.tuto)continue;t.t-=dt;if(t.t<=0){A.missed++;A.score=Math.max(0,A.score-2);gone=true;pushEv("l",t.id)}}
  if(gone){A.tickets=A.tickets.filter(t=>t.t>0);restock()}
  if(!A.tuto&&A.time<=0){A.phase="end";pushEv("e")}
}
/* events: run on every device (host directly, clients from the state stream) */
let lastEv=0;
function handleEv(e){
  if(NET.role==="host"&&NET.kind==="sb"&&H&&H.kitchens&&H.kitchens.length>1)return;
  if(!e||e[0]<=lastEv)return;lastEv=e[0];
  const [,k,a,b]=e;
  if(k==="d")toast(`+ ${money(b)} · Gratias!`);
  else if(k==="l")toast("A citizen gave up waiting. Vale!");
  else if(k==="m"){if(myIds().includes(a)&&MSG[b])toast(MSG[b])}
  else if(k==="e")setTimeout(endArcade,50);
}
const myIds=()=>NET.role==="client"?[NET.me]:(A?A.players.filter(p=>p.local!=null).map(p=>p.id):[]);

/* ---- snapshot for the network ---- */
function snap(){
  return {ph:A.phase,tm:Math.round(A.time*10)/10,sc:A.score,sv:A.served,ms:A.missed,lv:A.lvl,
    pl:A.players.map(p=>[p.id,p.name,p.col,Math.round(p.x*100)/100,Math.round(p.y*100)/100,Math.round(p.fx*10)/10,Math.round(p.fy*10)/10,enc(p.hold)]),
    it:Object.entries(A.tiles).map(([k,v])=>[k,enc(v),A.cook[k]!=null?Math.round(A.cook[k]*10)/10:-1]),
    sh:Object.entries(A.shelf),
    tk:A.tickets.map(t=>[t.id,t.b,t.face,Math.round(t.t),t.max]),
    ev:A.ev.slice(-8)};
}
let VIEW=null;
function viewFromA(){return {tuto:!!A.tuto,time:A.time,score:A.score,served:A.served,lvl:A.lvl,
  players:A.players.map(p=>({id:p.id,name:p.name,col:p.col,x:p.x,y:p.y,fx:p.fx,fy:p.fy,hold:p.hold})),
  tiles:A.tiles,cook:A.cook,shelf:A.shelf,tickets:A.tickets}}
function viewFromSnap(s,prev){
  const players=s.pl.map(a=>{const old=prev&&prev.players.find(q=>q.id===a[0]);
    return {id:a[0],name:a[1],col:a[2],tx:a[3],ty:a[4],x:old?old.x:a[3],y:old?old.y:a[4],fx:a[5],fy:a[6],hold:dec(a[7])}});
  const tiles={},cook={},shelf={};s.it.forEach(([k,c,ck])=>{tiles[k]=dec(c);if(ck>=0)cook[k]=ck});
  (s.sh||[]).forEach(([k,w])=>{if(typeof w==="string")shelf[k]=w});
  return {time:s.tm,score:s.sc,served:s.sv,lvl:s.lv,players,tiles,cook,shelf,
    tickets:s.tk.map(a=>({id:a[0],b:a[1],face:a[2],t:a[3],max:a[4],ws:BANK[a[1]]?words(BANK[a[1]].lat):[]}))};
}

