/* ================= LUDUS CLASS GAMES (Supabase) =================
   Shared by Le Petit Bistro and Officina Scribarum; the words come from GAME.
   Only on playludus (CFG.target "ludus"). Uses the Ludus join system: pupils type the code on the
   Ludus join page, swap keys with the board over the lobby channel, and get a private channel.
   Teams (brigade): every pupil runs their own game on their own device and reports a score every 2 s.
   Shared (coop): the board runs one or more shared kitchens of 2 to 4 players and sends each one out
   6 times a second on its own channel. Several at once need Supabase Pro (500 messages a second). */
const CL={on:CFG.target==="ludus"&&!!(window.supabase&&window.APP&&window.APP.configured&&window.LB&&LB.kx),sb:null,role:null};
const TEAMS=GAME.teams,KNAMES=GAME.kitchenNames;
const KITCHEN_CH=(code,k)=>`lmb-${code}-${GAME.id}-k${k}`;
let H=null;           // the board's class game
let P=null;           // this pupil's link to the board
function clClient(){if(!CL.sb)CL.sb=window.supabase.createClient(APP.supabaseUrl,APP.supabaseKey,{realtime:{params:{eventsPerSecond:80}}});return CL.sb}
function clSub(name,handlers){
  return new Promise(res=>{const c=clClient().channel(name,{config:{broadcast:{self:false}}});
    Object.entries(handlers).forEach(([ev,fn])=>c.on("broadcast",{event:ev},({payload})=>fn(payload||{})));
    let done=false;c.subscribe(st=>{if(st==="SUBSCRIBED"&&!done){done=true;res(c)}if((st==="CHANNEL_ERROR"||st==="TIMED_OUT")&&!done){done=true;res(null)}})});
}
const clSend=(ch,event,payload)=>ch&&ch.send({type:"broadcast",event,payload}).catch(()=>{});
const clDrop=ch=>{try{if(ch)clClient().removeChannel(ch)}catch(e){}};
const ord=n=>n===1?"1st":n===2?"2nd":n===3?"3rd":n+"th";

/* ---------- the board ---------- */
async function hostSetup(){
  const {data:{session}}=await clClient().auth.getSession().catch(()=>({data:{session:null}}));
  if(!session){$("classCard").innerHTML=`<h3>Class game</h3><p>Hosting a class game needs a Ludus teacher account.</p><a class="btn" href="../teacher.html">Teacher sign-in</a><p class="note">After signing in, come back to this page.</p>`;return}
  H={phase:"setup",kind:"brigade",game:"arcade",team:3,size:3,mins:4,pupils:{},blocked:[],code:null,kx:null,lobby:null,kitchens:[],endAt:0,final:null};
  mode="class";show("scrClass");renderCarte();hostRender();
}
async function hostOpen(){
  const f=$("scrClass");H.kind=f.querySelector("[name=kind]:checked").value;H.game=f.querySelector("[name=game]:checked").value;
  H.team=+f.querySelector("#clTeam").value;H.size=+f.querySelector("#clSize").value;H.mins=+f.querySelector("#clMins").value;
  H.code=String(Math.floor(100000+Math.random()*900000));
  try{H.kx=await LB.kx.newPair()}catch(e){toast("This browser can't host. Open the page with https://.");return}
  H.lobby=await clSub(LB.lobbyChannel(H.code),{join:hostOnJoin});
  if(!H.lobby){toast("Couldn't connect. Check the internet connection.");return}
  H.phase="lobby";hostRender();
}
async function hostOnJoin(m){
  if(!H||!LB.kx.validPub(m.pub)||!H.kx)return;
  const reply=body=>clSend(H.lobby,"joined",{to:m.pub,hpub:H.kx.pub,game:GAME.id,...body});
  if(H.phase==="ended")return reply({ok:false,msg:"This game has finished."});
  const chk=LB.checkName(m.name);if(!chk.ok)return reply({ok:false,msg:chk.msg});
  if(H.blocked.includes(m.pub))return reply({ok:false,msg:"Your teacher has removed you from this game."});
  let p=Object.values(H.pupils).find(x=>x.pub===m.pub);
  if(!p){
    if(Object.values(H.pupils).some(x=>x.name.toLowerCase()===chk.name.toLowerCase()))return reply({ok:false,msg:`Someone called ${chk.name} has already joined. Add your surname initial.`});
    if(H.kind==="coop"&&H.phase==="play"&&!H.kitchens.some(k=>k.A.players.length<4))return reply({ok:false,msg:`Every ${GAME.kitchen} is full.`});
    let chan;try{chan=await LB.kx.secret(H.kx.priv,m.pub,H.code)}catch(e){return}
    if(Object.values(H.pupils).find(x=>x.pub===m.pub))return;
    let pid;do{pid=Math.random().toString(36).slice(2,10)}while(H.pupils[pid]);
    p={pid,pub:m.pub,chan,name:chk.name,score:0,served:0,inp:null,team:null,k:null,kp:null,joinedAt:Date.now()};H.pupils[pid]=p;
    if(H.phase==="play")hostLateJoin(p);
  }
  if(!p.ch){p.ch=await clSub(LB.pupilChannel(H.code,p.chan),{
    hello:()=>{if(H&&H.pupils[p.pid])clSend(p.ch,"state",hostStateFor(p))},
    inp:v=>{if(typeof v.x==="number"&&typeof v.y==="number"&&typeof v.a==="number")p.inp={x:Math.max(-1,Math.min(1,v.x)),y:Math.max(-1,Math.min(1,v.y)),a:v.a|0}},
    score:v=>{if(H.phase!=="play"&&H.phase!=="ended")return;const c=Math.max(0,Math.min(5000,v.cash|0)),s=Math.max(0,Math.min(500,v.served|0));p.score=Math.max(p.score,c);p.served=Math.max(p.served,s)}
  })}
  if(!p.ch)return reply({ok:false,msg:"The game couldn't connect you. Try again."});
  reply({ok:true,name:p.name});if(H.phase!=="play")hostRender();
}
function hostStateFor(p){
  const st={phase:H.phase==="setup"?"lobby":H.phase,kind:H.kind,game:H.game,lvl,opts:GAME.classOpts?GAME.classOpts():null,mins:H.mins,name:p.name};
  if(p.team!=null){const b=TEAMS[p.team%TEAMS.length];st.team={name:b[0],col:b[1],mates:Object.values(H.pupils).filter(q=>q.team===p.team&&q!==p).map(q=>q.name)}}
  if(p.k!=null&&H.kitchens[p.k]){const K=H.kitchens[p.k];st.k=p.k;st.kname=K.name;st.mates=Object.values(H.pupils).filter(q=>q.k===p.k&&q!==p).map(q=>q.name)}
  if(H.phase==="play"){st.left=Math.max(0,H.endAt-Date.now());st.base=p.score;st.me=p.kp}
  if(H.phase==="ended")st.final=H.final&&H.final.byPupil[p.pid];
  return st;
}
const hostTell=p=>clSend(p.ch,"state",hostStateFor(p));
function hostAssign(){
  const ps=LB.shuffle(Object.values(H.pupils)),size=Math.max(1,H.team),n=Math.max(1,Math.ceil(ps.length/size));
  ps.forEach((p,i)=>p.team=i%n);
}
function kitchenAdd(K,p){const i=K.A.players.length,pl=mkPlayer("c"+i,p.name,i);p.kp=pl.id;p.k=K.i;K.A.players.push(pl)}
function hostLateJoin(p){
  if(H.kind==="brigade"){const counts={};Object.values(H.pupils).forEach(q=>{if(q.team!=null)counts[q.team]=(counts[q.team]||0)+1});
    const teams=Object.keys(counts).map(Number);let best=teams.length?teams.reduce((a,b)=>counts[a]<=counts[b]?a:b):0;
    if(H.team===1)best=teams.length?Math.max(...teams)+1:0;p.team=best;}
  else{const K=H.kitchens.filter(k=>k.A.players.length<4).sort((a,b)=>a.A.players.length-b.A.players.length)[0];if(K)kitchenAdd(K,p)}
}
async function hostStart(){
  if(!Object.keys(H.pupils).length){toast("Wait for at least one pupil to join.");return}
  H.phase="play";H.endAt=Date.now()+H.mins*60000;
  if(H.kind==="brigade"){hostAssign();Object.values(H.pupils).forEach(hostTell);clearInterval(H.iv);H.iv=setInterval(hostTick,1000);setMusic("game");hostRender();return}
  // shared kitchens: the board runs every one of them
  const ps=LB.shuffle(Object.values(H.pupils)),nk=Math.max(1,Math.ceil(ps.length/H.size));
  H.kitchens=[];
  for(let i=0;i<nk;i++){const A0=newArcade([]);A0.time=H.mins*60;A0.lvl=lvl;if(GAME.prepKitchen)GAME.prepKitchen(A0);
    H.kitchens.push({i,name:KNAMES[i%KNAMES.length],col:COLS[i%COLS.length],A:A0,ch:null,sendT:0})}
  ps.forEach((p,j)=>kitchenAdd(H.kitchens[j%nk],p));
  await Promise.all(H.kitchens.map(async K=>{K.ch=await clSub(KITCHEN_CH(H.code,K.i),{})}));
  NET.role="host";NET.kind="sb";
  Object.values(H.pupils).forEach(hostTell);
  if(nk===1){A=H.kitchens[0].A;VIEW=viewFromA();startArcadeView();$("classBar").hidden=false;$("classBar").textContent=`${GAME.coopTitle} · code ${H.code}`}
  else{mode="class";show("scrClass");setMusic("game");hostRender();startTicker();cancelAnimationFrame(H.raf);H.raf=requestAnimationFrame(boardLoop)}
}
/* runs every 50 ms on the background timer (see startTicker) */
function classSim(dt,now){
  if(!H||H.phase!=="play"||H.kind!=="coop")return;
  const ps=Object.values(H.pupils),one=H.kitchens.length===1;
  for(const K of H.kitchens){
    A=K.A;if(A.phase!=="play")continue;
    A.players.forEach(pl=>{const p=ps.find(q=>q.k===K.i&&q.kp===pl.id);if(p&&p.inp)pl.inp=p.inp});
    step(dt);
    if(now-K.sendT>160){K.sendT=now;clSend(K.ch,"st",snap())}
  }
  if(one){A=H.kitchens[0].A;VIEW=viewFromA()}else A=null;
  if(H.kitchens.every(K=>K.A.phase!=="play"))hostEnd();
}
function boardLoop(now){
  if(!H||H.phase!=="play"||H.kind!=="coop"||H.kitchens.length<2)return;
  H.raf=requestAnimationFrame(boardLoop);
  if(now-(H.drawT||0)<66)return;H.drawT=now;
  const keep=A,oc=ctx,ot=TS;
  H.kitchens.forEach(K=>{
    const c=document.querySelector(`#scrClass canvas[data-k="${K.i}"]`);if(!c)return;
    const w=c.parentElement.clientWidth,ts=Math.max(10,Math.floor(w/MW)),dpr=Math.min(2,window.devicePixelRatio||1);
    if(c.width!==ts*MW*dpr){c.width=ts*MW*dpr;c.height=ts*MH*dpr;c.style.width=ts*MW+"px";c.style.height=ts*MH+"px"}
    A=K.A;const V=viewFromA();ctx=c.getContext("2d");ctx.setTransform(dpr,0,0,dpr,0,0);TS=ts;ctx.clearRect(0,0,c.width,c.height);drawMap(V,now);drawPlayers(V,[]);
    const sc=document.querySelector(`#scrClass [data-ks="${K.i}"]`);if(sc)sc.textContent=`${K.A.score} ${GAME.money} · ${K.A.served} ${GAME.servedWord}`;
  });
  A=keep;ctx=oc;TS=ot;
  const ck=document.querySelector("#scrClass .clock");if(ck)ck.textContent=fmt((H.endAt-Date.now())/1000);
}
function hostTick(){if(!H||H.phase!=="play")return;if(Date.now()>=H.endAt)hostEnd();else if(mode==="class")hostRender()}
function hostTeams(){
  const teams={};Object.values(H.pupils).forEach(p=>{if(p.team==null)return;const t=teams[p.team]||(teams[p.team]={i:p.team,name:TEAMS[p.team%TEAMS.length][0],col:TEAMS[p.team%TEAMS.length][1],score:0,served:0,chefs:[]});
    t.score+=p.score;t.served+=p.served;t.chefs.push(p)});
  return Object.values(teams).sort((a,b)=>b.score-a.score);
}
function hostEnd(){
  if(!H||H.phase!=="play")return;
  clearInterval(H.iv);cancelAnimationFrame(H.raf);H.phase="ended";
  const byPupil={};
  if(H.kind==="brigade"){
    const teams=hostTeams(),chefs=Object.values(H.pupils).slice().sort((a,b)=>b.score-a.score);
    teams.forEach((t,ri)=>t.chefs.forEach(p=>{byPupil[p.pid]={teamRank:ri+1,teams:teams.length,teamScore:t.score,score:p.score,chefRank:chefs.indexOf(p)+1,chefs:chefs.length}}));
    H.final={teams,chefs,byPupil};
  }else{
    stopTicker();cancelAnimationFrame(raf);
    const ks=H.kitchens.map(K=>({i:K.i,name:K.name,col:K.col,score:K.A.score,served:K.A.served,missed:K.A.missed,chefs:Object.values(H.pupils).filter(p=>p.k===K.i)}))
      .sort((a,b)=>b.score-a.score);
    ks.forEach((k,ri)=>k.chefs.forEach(p=>byPupil[p.pid]={rank:ri+1,kitchens:ks.length,kname:k.name,score:k.score,served:k.served}));
    H.final={kitchens:ks,byPupil};
    H.kitchens.forEach(K=>{A=K.A;A.phase="end";clSend(K.ch,"st",snap())});A=null;
  }
  Object.values(H.pupils).forEach(hostTell);
  setMusic("menu");mode="class";show("scrClass");hostRender();
}
function hostClose(){
  if(!H)return;stopTicker();clearInterval(H.iv);cancelAnimationFrame(H.raf);
  Object.values(H.pupils).forEach(p=>{if(p.ch){clSend(p.ch,"kicked",{cancelled:true});const c=p.ch;setTimeout(()=>clDrop(c),400)}});
  clDrop(H.lobby);H.kitchens.forEach(K=>clDrop(K.ch));H=null;$("classBar").hidden=true;if(NET.kind==="sb"){NET.role=null;NET.kind=null}
}
function hostKick(pid){const p=H.pupils[pid];if(!p)return;H.blocked.push(p.pub);if(p.ch){clSend(p.ch,"kicked",{});const c=p.ch;setTimeout(()=>clDrop(c),400)}delete H.pupils[pid];hostRender()}
function joinLink(){try{return new URL((APP.joinUrl||APP.playUrl||"../"),location.href).href.replace(/\?.*$/,"")+"?code="+H.code+(APP.plainParam?APP.plainParam():"")}catch(e){return "../?code="+H.code}}
function qrSvg(){if(!window.qrcode)return "";try{const q=window.qrcode(0,"M");q.addData(joinLink());q.make();return q.createSvgTag({cellSize:4,margin:0,scalable:true})}catch(e){return ""}}
function hostRender(){
  if(!H)return;const el=$("scrClass");const ps=Object.values(H.pupils).sort((a,b)=>a.joinedAt-b.joinedAt);
  const chips=ps.map(p=>`<span>${esc(p.name)}${H.phase==="lobby"?` <button class="x" data-kick="${p.pid}" aria-label="Remove ${esc(p.name)}">×</button>`:""}</span>`).join("")||"<span>Nobody yet…</span>";
  const sel=(id,vals,cur)=>`<select id="${id}">${vals.map(([v,t])=>`<option value="${v}" ${cur===v?"selected":""}>${t}</option>`).join("")}</select>`;
  if(H.phase==="setup"){
    el.innerHTML=`<div class="card"><h3>Class game</h3>
      <fieldset class="opts"><legend>Type of game</legend>
        <label class="opt"><input type="radio" name="kind" value="brigade" ${H.kind==="brigade"?"checked":""}> <span><b>${GAME.teamPlural}</b>: the whole class. Each pupil plays on their own device; teams add up their takings.</span></label>
        <label class="opt"><input type="radio" name="kind" value="coop" ${H.kind==="coop"?"checked":""}> <span><b>${GAME.coopTitle}</b>: pupils share ${GAME.kitchenPlural} of 2 to 4 across their devices, all shown on the board.</span></label></fieldset>
      <fieldset class="opts" id="clGameSet" ${H.kind==="coop"?"hidden":""}><legend>${GAME.teamPlural} play</legend>
        <label class="opt"><input type="radio" name="game" value="arcade" ${H.game==="arcade"?"checked":""}> ${GAME.arcadeName}</label>
        <label class="opt"><input type="radio" name="game" value="classic" ${H.game==="classic"?"checked":""}> ${GAME.classicName}</label></fieldset>
      <div class="row">
        <label class="opt" id="clTeamL" ${H.kind==="coop"?"hidden":""}>${GAME.teamPlural} of ${sel("clTeam",[[1,"1 (everyone for themselves)"],[2,"2"],[3,"3"],[4,"4"]],H.team)}</label>
        <label class="opt" id="clSizeL" ${H.kind==="coop"?"":"hidden"}>Players per ${GAME.kitchen} ${sel("clSize",[[2,"2"],[3,"3"],[4,"4"]],H.size)}</label>
        <label class="opt">Length ${sel("clMins",[3,4,5,6].map(n=>[n,n+" min"]),H.mins)}</label></div>
      ${GAME.setupExtra?GAME.setupExtra():""}
      <p class="note">Level: <b>${esc(GAME.levelLabel?GAME.levelLabel():lvl)}</b> (change it on the menu). Pupils join at <b>${esc(APP.joinAddress||"the Ludus join page")}</b> with the code, as for a quiz.
      <span id="clCoopNote" ${H.kind==="coop"?"":"hidden"}>Each shared ${GAME.kitchen} sends about 30 live messages a second, so several at once need the Supabase Pro plan.</span></p>
      <div class="row"><button class="btn" data-cl="open">Open the game</button><button class="btn ghost" data-cl="cancel">Back</button></div></div>`;
    return;
  }
  if(H.phase==="lobby"){
    const nk=Math.max(1,Math.ceil(ps.length/H.size));
    el.innerHTML=`<div class="board-join"><div><span class="note">Go to</span><div class="addr">${esc(APP.joinAddress||"")}</div><span class="note">and type the code</span><div class="code big">${H.code}</div></div>
      <div class="qr">${qrSvg()}</div></div>
      <div class="card"><h3>${ps.length} player${ps.length===1?"":"s"}</h3><div class="plist">${chips}</div>
      <p class="note">${H.kind==="brigade"?`${GAME.teamPlural} of ${H.team}, ${H.game==="arcade"?GAME.arcadeName:GAME.classicName}, ${H.mins} minutes.`:`${ps.length?nk:0} shared ${nk===1?GAME.kitchen:GAME.kitchenPlural} of up to ${H.size}, ${H.mins} minutes.`} Pupils who join late are added to a team.</p>
      <div class="row"><button class="btn" data-cl="start">Start</button><button class="btn ghost" data-cl="close">Cancel</button></div></div>`;
    return;
  }
  if(H.phase==="play"&&H.kind==="brigade"){
    const teams=hostTeams(),top=Math.max(1,...teams.map(t=>t.score)),chefs=ps.slice().sort((a,b)=>b.score-a.score).slice(0,5);
    el.innerHTML=`<div class="board-top"><div class="code">${H.code}</div><div class="clock">${fmt((H.endAt-Date.now())/1000)}</div><button class="btn ghost small" data-cl="end">End now</button></div>
      <div class="teams">${teams.map((t,i)=>`<div class="team"><div class="tn"><span class="rank">${i+1}</span><b>${esc(t.name)}</b><span class="tc">${t.chefs.map(p=>esc(p.name)).join(", ")}</span><b class="ts">${t.score} ${GAME.money}</b></div>
        <div class="tbar"><i style="width:${t.score/top*100}%;background:${t.col}"></i></div></div>`).join("")}</div>
      <div class="card"><h3>${GAME.topPlayers}</h3><ol class="chefs">${chefs.map(p=>`<li><span>${esc(p.name)}</span><b>${p.score} ${GAME.money}</b></li>`).join("")}</ol></div>`;
    return;
  }
  if(H.phase==="play"&&H.kind==="coop"){
    el.innerHTML=`<div class="board-top"><div class="code">${H.code}</div><div class="clock">${fmt((H.endAt-Date.now())/1000)}</div><button class="btn ghost small" data-cl="end">End now</button></div>
      <div class="kgrid">${H.kitchens.map(K=>`<div class="kcard" style="--team:${K.col}"><div class="kh"><b>${esc(K.name)}</b><span class="tc">${Object.values(H.pupils).filter(p=>p.k===K.i).map(p=>esc(p.name)).join(", ")}</span><b data-ks="${K.i}"></b></div><div class="kc"><canvas data-k="${K.i}"></canvas></div></div>`).join("")}</div>`;
    return;
  }
  if(H.phase==="ended"){
    const F=H.final,again=`<div class="row"><button class="btn" data-cl="again">New game</button><button class="btn ghost" data-cl="close">Menu</button></div>`;
    el.innerHTML=H.kind==="brigade"?`<div class="card"><h2 class="win">🏆 ${F.teams[0]?esc(F.teams[0].name):"—"}</h2>
      <ol class="chefs">${F.teams.map(t=>`<li><span>${esc(t.name)} <span class="tc">${t.chefs.map(p=>esc(p.name)).join(", ")}</span></span><b>${t.score} ${GAME.money}</b></li>`).join("")}</ol>
      <h3>${GAME.topPlayers}</h3><ol class="chefs">${F.chefs.slice(0,5).map(p=>`<li><span>${esc(p.name)}</span><b>${p.score} ${GAME.money} · ${p.served} ${GAME.servedWord}</b></li>`).join("")}</ol>${again}</div>`
      :`<div class="card"><h2 class="win">🏆 ${F.kitchens[0]?esc(F.kitchens[0].name):"—"}</h2>
      <ol class="chefs">${F.kitchens.map(k=>`<li><span>${esc(k.name)} <span class="tc">${k.chefs.map(p=>esc(p.name)).join(", ")}</span></span><b>${k.score} ${GAME.money} · ${k.served} ${GAME.servedWord}</b></li>`).join("")}</ol>${again}</div>`;
  }
}
$("scrClass").addEventListener("click",e=>{
  const k=e.target.closest("[data-kick]");if(k){hostKick(k.dataset.kick);return}
  const b=e.target.closest("[data-cl]");if(!b)return;const a=b.dataset.cl;
  if(a==="open")hostOpen();else if(a==="cancel"){H=null;mode="lobby";show("scrLobby")}
  else if(a==="start")hostStart();else if(a==="end")hostEnd();
  else if(a==="close"){hostClose();toMenu()}
  else if(a==="again"){hostClose();hostSetup()}
});
$("scrClass").addEventListener("change",e=>{if(e.target.name==="kind"){H.kind=e.target.value;const co=H.kind==="coop";
  $("clGameSet").hidden=co;$("clTeamL").hidden=co;$("clSizeL").hidden=!co;$("clCoopNote").hidden=!co}});

/* ---------- a pupil's device ---------- */
const PKEY=()=>APP.storagePrefix+"."+GAME.id;
async function pupilBoot(){
  let s=null;try{s=JSON.parse(localStorage.getItem(PKEY())||"null")}catch(e){}
  CL.role="pupil";mode="pupil";show("scrPupil");
  if(!s||!s.chan||Date.now()-s.at>3*3600e3){pupilMsg("Join a game","Go to the Ludus join page and type the code on the board.",`<a class="btn" href="../">Join a game</a>`);return}
  P={code:s.code,chan:s.chan,name:s.name,ch:null,kch:null,st:null,playing:false,rep:null,base:0,inpSent:"",inpT:0};
  pupilMsg("Joining…",`Game ${esc(P.code)}`);
  P.ch=await clSub(LB.pupilChannel(P.code,P.chan),{state:pupilState,kicked:m=>pupilLeave(m.cancelled?"Your teacher closed the game.":"Your teacher has removed you from this game.")});
  if(!P.ch){pupilMsg("Can't reach your game","Check the internet connection, then try again.",`<button class="btn" onclick="location.reload()">Try again</button>`);return}
  const hello=()=>{if(P&&!P.st)clSend(P.ch,"hello",{})};hello();P.hi=setInterval(hello,2500);
  setTimeout(()=>{if(P&&!P.st)pupilMsg("Can't reach your game","If the game has finished, join a new one.",`<a class="btn" href="../">Join a game</a>`)},15000);
}
function pupilMsg(h,t,acts){$("scrPupil").innerHTML=`<div class="card pupil"><h2>${h}</h2><p>${t}</p>${acts||""}</div>`}
function pupilLeave(msg){
  try{localStorage.removeItem(PKEY())}catch(e){}
  clearInterval(P&&P.rep);clearInterval(P&&P.hi);if(P){clDrop(P.kch);clDrop(P.ch)}P=null;
  stopClassic();stopArcade();tutoEnd();$("endModal").classList.remove("on");NET.role=null;NET.kind=null;
  mode="pupil";show("scrPupil");pupilMsg(GAME.thanks,esc(msg),`<a class="btn" href="../">Join another game</a>`);
}
function pupilScore(){if(!P)return;const cash=S?S.cash:(A&&A.players.some(p=>p.local!=null))?A.score:0,served=S?S.served:A?A.served:0;
  clSend(P.ch,"score",{cash:P.base+cash,served})}
function pupilState(st){
  if(!P)return;P.st=st;if(typeof st.lvl==="string"&&LEVELS[st.lvl])lvl=st.lvl;if(st.opts&&GAME.applyOpts)GAME.applyOpts(st.opts);
  const team=st.team?`<p class="team-badge" style="--team:${esc(st.team.col)}">${GAME.teamWord} <b>${esc(st.team.name)}</b>${st.team.mates.length?` with ${st.team.mates.map(esc).join(", ")}`:""}</p>`
    :st.kname?`<p class="team-badge" style="--team:#c9a227"><b>${esc(st.kname)}</b>${st.mates&&st.mates.length?` with ${st.mates.map(esc).join(", ")}`:""}</p>`:"";
  if(st.phase==="lobby"){pupilMsg(GAME.welcome(esc(st.name)),`${st.kind==="coop"?`${GAME.coopTitle}: you share a ${GAME.kitchen} with up to 3 other players.`:`${GAME.teamPlural}: you play on your own device and your team adds up its takings.`} Look at the board and wait for your teacher to start.`+team,
    `<div class="row"><button class="btn ghost" data-pt="tuto">🎓 Practise with the tutorial while you wait</button></div>`);return}
  if(st.phase==="play"&&!P.playing){
    P.playing=true;tutoEnd();$("endModal").classList.remove("on");P.base=st.base||0;
    if(st.kind==="brigade"){
      const secs=Math.max(5,(st.left||0)/1000);
      if(st.game==="classic")startClassic({seconds:secs});else startLocal({seconds:secs,name:st.name});
      if(st.team)toast(`${GAME.teamWord} ${st.team.name} !`);
      clearInterval(P.rep);P.rep=setInterval(pupilScore,2000);
    }else{
      SET.sound=false;if(typeof syncSoundBtn==="function")syncSoundBtn();MUS.on=false;syncMusicUI();musicApply();
      NET.role="client";NET.kind="sb";NET.me=st.me;VIEW=null;
      clSub(KITCHEN_CH(P.code,st.k||0),{st:snapIn}).then(c=>{if(P)P.kch=c});
      startArcadeView();if(st.kname)toast(st.kname+" !");
    }
    return;
  }
  if(st.phase==="ended"){
    clearInterval(P.rep);if(st.kind==="brigade"&&P.playing)pupilScore();P.playing=false;
    const f=st.final||{};
    if(S&&!S.paused)endClassic();else if(A&&A.phase==="play")endArcade();
    const line=st.kind==="brigade"&&f.teamRank?`${GAME.teamWord} ${esc(st.team?st.team.name:"")}: <b>${ord(f.teamRank)}</b> of ${f.teams} with ${f.teamScore} ${GAME.money}. You were ${ord(f.chefRank)} of ${f.chefs} players.`
      :f.rank?`<b>${esc(f.kname)}</b>: <b>${ord(f.rank)}</b> of ${f.kitchens} with ${f.score} ${GAME.money} and ${f.served} ${GAME.servedWord}.`:"";
    if(line){$("endTitle").innerHTML=(st.kind==="brigade"?f.teamRank:f.rank)===1?`🏆 ${GAME.winTitle}`:GAME.endTitle;$("endExtra").innerHTML=line;$("endExtra").hidden=false;$("endModal").classList.add("on")}
    try{localStorage.removeItem(PKEY())}catch(e){}
  }
}
$("scrPupil").addEventListener("click",e=>{const b=e.target.closest("[data-pt]");if(b&&b.dataset.pt==="tuto"){P&&P.st&&P.st.game==="classic"&&P.st.kind==="brigade"?classicTutorial():arcadeTutorial()}});
function snapIn(s){
  if(!s||!Array.isArray(s.pl)||!P)return;NET.lastSnap=s;NET.snapAt=performance.now();
  VIEW=viewFromSnap(s,VIEW);(s.ev||[]).forEach(e=>{if(Array.isArray(e))handleEv(e)});
}
