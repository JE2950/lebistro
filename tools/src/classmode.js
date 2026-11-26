/* ================= LUDUS CLASS GAMES (Supabase) =================
   Only on playludus (CFG.target "ludus"). Uses the Ludus join system: pupils type the code on the
   Ludus join page, swap keys with the board over the lobby channel, and get a private channel.
   Brigades: every pupil runs their own kitchen on their own device and reports a score every 2 s.
   Cuisine partagée: the board runs one kitchen for up to 4 chefs and sends it out 6 times a second. */
const CL={on:CFG.target==="ludus"&&!!(window.supabase&&window.APP&&window.APP.configured&&window.LB&&LB.kx),sb:null,role:null};
const BRIGADES=[["Les Croissants","#e9a23b"],["Les Baguettes","#c8102e"],["Les Escargots","#2a9d8f"],["Les Macarons","#d96aa7"],["Les Camemberts","#7b61ff"],["Les Crêpes","#1f6fb5"],["Les Éclairs","#8a5a2b"],["Les Madeleines","#16936b"]];
const KITCHEN_CH=code=>`lmb-${code}-bistro`;
let H=null;           // the board's class game
let P=null;           // this pupil's link to the board
function clClient(){if(!CL.sb)CL.sb=window.supabase.createClient(APP.supabaseUrl,APP.supabaseKey,{realtime:{params:{eventsPerSecond:40}}});return CL.sb}
function clSub(name,handlers){
  return new Promise(res=>{const c=clClient().channel(name,{config:{broadcast:{self:false}}});
    Object.entries(handlers).forEach(([ev,fn])=>c.on("broadcast",{event:ev},({payload})=>fn(payload||{})));
    let done=false;c.subscribe(st=>{if(st==="SUBSCRIBED"&&!done){done=true;res(c)}if((st==="CHANNEL_ERROR"||st==="TIMED_OUT")&&!done){done=true;res(null)}})});
}
const clSend=(ch,event,payload)=>ch&&ch.send({type:"broadcast",event,payload}).catch(()=>{});
const clDrop=ch=>{try{if(ch)clClient().removeChannel(ch)}catch(e){}};

/* ---------- the board ---------- */
async function hostSetup(){
  const {data:{session}}=await clClient().auth.getSession().catch(()=>({data:{session:null}}));
  if(!session){$("classCard").innerHTML=`<h3>Partie de classe</h3><p>Hosting a class game needs a Ludus teacher account.</p><a class="btn" href="../teacher.html">Teacher sign-in</a><p class="note">After signing in, come back to this page.</p>`;return}
  H={phase:"setup",kind:"brigade",game:"arcade",team:3,mins:4,pupils:{},blocked:[],code:null,kx:null,lobby:null,kch:null,endAt:0,final:null};
  mode="class";show("scrClass");renderCarte();hostRender();
}
async function hostOpen(){
  const f=$("scrClass");H.kind=f.querySelector("[name=kind]:checked").value;H.game=f.querySelector("[name=game]:checked").value;
  H.team=+f.querySelector("#clTeam").value;H.mins=+f.querySelector("#clMins").value;
  H.code=String(Math.floor(100000+Math.random()*900000));
  try{H.kx=await LB.kx.newPair()}catch(e){toast("This browser can't host. Open the page with https://.");return}
  H.lobby=await clSub(LB.lobbyChannel(H.code),{join:hostOnJoin});
  if(!H.lobby){toast("Couldn't connect. Check the internet connection.");return}
  H.phase="lobby";hostRender();
}
async function hostOnJoin(m){
  if(!H||!LB.kx.validPub(m.pub)||!H.kx)return;
  const reply=body=>clSend(H.lobby,"joined",{to:m.pub,hpub:H.kx.pub,game:"bistro",...body});
  if(H.phase==="ended")return reply({ok:false,msg:"This game has finished."});
  const chk=LB.checkName(m.name);if(!chk.ok)return reply({ok:false,msg:chk.msg});
  if(H.blocked.includes(m.pub))return reply({ok:false,msg:"Your teacher has removed you from this game."});
  let p=Object.values(H.pupils).find(x=>x.pub===m.pub);
  if(!p){
    if(Object.values(H.pupils).some(x=>x.name.toLowerCase()===chk.name.toLowerCase()))return reply({ok:false,msg:`Someone called ${chk.name} has already joined. Add your surname initial.`});
    if(H.kind==="coop"&&Object.keys(H.pupils).length>=4)return reply({ok:false,msg:"This kitchen is full: 4 chefs already."});
    let chan;try{chan=await LB.kx.secret(H.kx.priv,m.pub,H.code)}catch(e){return}
    if(Object.values(H.pupils).find(x=>x.pub===m.pub))return;
    let pid;do{pid=Math.random().toString(36).slice(2,10)}while(H.pupils[pid]);
    p={pid,pub:m.pub,chan,name:chk.name,score:0,served:0,inp:null,team:null,kp:null,joinedAt:Date.now()};H.pupils[pid]=p;
    if(H.phase==="play")hostLateJoin(p);
  }
  if(!p.ch){p.ch=await clSub(LB.pupilChannel(H.code,p.chan),{
    hello:()=>{if(H&&H.pupils[p.pid])clSend(p.ch,"state",hostStateFor(p))},
    inp:v=>{if(typeof v.x==="number"&&typeof v.y==="number"&&typeof v.a==="number")p.inp={x:Math.max(-1,Math.min(1,v.x)),y:Math.max(-1,Math.min(1,v.y)),a:v.a|0}},
    score:v=>{if(H.phase!=="play"&&H.phase!=="ended")return;const c=Math.max(0,Math.min(5000,v.cash|0)),s=Math.max(0,Math.min(500,v.served|0));p.score=Math.max(p.score,c);p.served=Math.max(p.served,s)}
  })}
  if(!p.ch)return reply({ok:false,msg:"The game couldn't connect you. Try again."});
  reply({ok:true,name:p.name});hostRender();
}
function hostStateFor(p){
  const st={phase:H.phase==="setup"?"lobby":H.phase,kind:H.kind,game:H.game,lvl,mins:H.mins,name:p.name};
  if(p.team!=null){const b=BRIGADES[p.team%BRIGADES.length];st.team={name:b[0],col:b[1],mates:Object.values(H.pupils).filter(q=>q.team===p.team&&q!==p).map(q=>q.name)}}
  if(H.phase==="play"){st.left=Math.max(0,H.endAt-Date.now());st.base=p.score;st.me=p.kp}
  if(H.phase==="ended")st.final=H.final&&H.final.byPupil[p.pid];
  return st;
}
const hostTell=p=>clSend(p.ch,"state",hostStateFor(p));
function hostAssign(){
  const ps=LB.shuffle(Object.values(H.pupils)),size=Math.max(1,H.team),n=Math.max(1,Math.ceil(ps.length/size));
  ps.forEach((p,i)=>p.team=i%n);
}
function hostLateJoin(p){
  if(H.kind==="brigade"){const counts={};Object.values(H.pupils).forEach(q=>{if(q.team!=null)counts[q.team]=(counts[q.team]||0)+1});
    const teams=Object.keys(counts).map(Number);let best=teams.length?teams.reduce((a,b)=>counts[a]<=counts[b]?a:b):0;
    if(H.team===1)best=teams.length?Math.max(...teams)+1:0;p.team=best;}
  else if(A&&A.players.length<4){const pl=mkPlayer("c"+A.players.length,p.name,A.players.length);p.kp=pl.id;A.players.push(pl)}
}
async function hostStart(){
  if(!Object.keys(H.pupils).length){toast("Wait for at least one pupil to join.");return}
  H.phase="play";H.endAt=Date.now()+H.mins*60000;
  if(H.kind==="brigade"){hostAssign();Object.values(H.pupils).forEach(hostTell);clearInterval(H.iv);H.iv=setInterval(hostTick,1000);setMusic("game");hostRender();return}
  // shared kitchen: the board runs it
  H.kch=await clSub(KITCHEN_CH(H.code),{});
  const players=Object.values(H.pupils).slice(0,4).map((p,i)=>{const pl=mkPlayer("c"+i,p.name,i);p.kp=pl.id;return pl});
  A=newArcade(players);A.time=H.mins*60;VIEW=viewFromA();NET.role="host";NET.kind="sb";
  Object.values(H.pupils).forEach(hostTell);startArcadeView();$("classBar").hidden=false;$("classBar").textContent=`Cuisine partagée · code ${H.code}`;
}
function hostTick(){if(!H||H.phase!=="play")return;if(Date.now()>=H.endAt)hostEnd();else if(mode==="class")hostRender()}
function hostTeams(){
  const teams={};Object.values(H.pupils).forEach(p=>{if(p.team==null)return;const t=teams[p.team]||(teams[p.team]={i:p.team,name:BRIGADES[p.team%BRIGADES.length][0],col:BRIGADES[p.team%BRIGADES.length][1],score:0,served:0,chefs:[]});
    t.score+=p.score;t.served+=p.served;t.chefs.push(p)});
  return Object.values(teams).sort((a,b)=>b.score-a.score);
}
function hostEnd(){
  if(!H||H.phase!=="play")return;
  clearInterval(H.iv);H.phase="ended";
  const byPupil={};
  if(H.kind==="brigade"){
    const teams=hostTeams(),chefs=Object.values(H.pupils).slice().sort((a,b)=>b.score-a.score);
    teams.forEach((t,ri)=>t.chefs.forEach(p=>{byPupil[p.pid]={teamRank:ri+1,teams:teams.length,teamScore:t.score,score:p.score,chefRank:chefs.indexOf(p)+1,chefs:chefs.length}}));
    H.final={teams,chefs,byPupil};
  }else{
    const sc=A?A.score:0,sv=A?A.served:0;Object.values(H.pupils).forEach(p=>byPupil[p.pid]={score:sc,served:sv});
    H.final={score:sc,served:sv,missed:A?A.missed:0,byPupil};
    cancelAnimationFrame(raf);if(A){NET.kind="sb";netSend()}
  }
  Object.values(H.pupils).forEach(hostTell);
  setMusic("menu");mode="class";show("scrClass");hostRender();
}
function hostClose(){
  if(!H)return;clearInterval(H.iv);
  Object.values(H.pupils).forEach(p=>{if(p.ch){clSend(p.ch,"kicked",{cancelled:true});const c=p.ch;setTimeout(()=>clDrop(c),400)}});
  clDrop(H.lobby);clDrop(H.kch);H=null;$("classBar").hidden=true;
}
function hostKick(pid){const p=H.pupils[pid];if(!p)return;H.blocked.push(p.pub);if(p.ch){clSend(p.ch,"kicked",{});const c=p.ch;setTimeout(()=>clDrop(c),400)}delete H.pupils[pid];hostRender()}
function joinLink(){try{return new URL((APP.joinUrl||APP.playUrl||"../"),location.href).href.replace(/\?.*$/,"")+"?code="+H.code+(APP.plainParam?APP.plainParam():"")}catch(e){return "../?code="+H.code}}
function qrSvg(){if(!window.qrcode)return "";try{const q=window.qrcode(0,"M");q.addData(joinLink());q.make();return q.createSvgTag({cellSize:4,margin:0,scalable:true})}catch(e){return ""}}
function hostRender(){
  if(!H)return;const el=$("scrClass");const ps=Object.values(H.pupils).sort((a,b)=>a.joinedAt-b.joinedAt);
  const chips=ps.map(p=>`<span>${esc(p.name)}${H.phase==="lobby"?` <button class="x" data-kick="${p.pid}" aria-label="Remove ${esc(p.name)}">×</button>`:""}</span>`).join("")||"<span>Nobody yet…</span>";
  if(H.phase==="setup"){
    el.innerHTML=`<div class="card"><h3>Partie de classe</h3>
      <fieldset class="opts"><legend>Type de partie</legend>
        <label class="opt"><input type="radio" name="kind" value="brigade" ${H.kind==="brigade"?"checked":""}> <span><b>Brigades</b>: the whole class. Each pupil runs a kitchen on their own device; teams add up their takings.</span></label>
        <label class="opt"><input type="radio" name="kind" value="coop" ${H.kind==="coop"?"checked":""}> <span><b>Cuisine partagée</b>: up to 4 chefs share one kitchen across their devices, shown on the board.</span></label></fieldset>
      <fieldset class="opts" id="clGameSet"><legend>Brigades play</legend>
        <label class="opt"><input type="radio" name="game" value="arcade" ${H.game==="arcade"?"checked":""}> Mode arcade</label>
        <label class="opt"><input type="radio" name="game" value="classic" ${H.game==="classic"?"checked":""}> Service classique</label></fieldset>
      <div class="row"><label class="opt">Brigades of <select id="clTeam">${[1,2,3,4].map(n=>`<option value="${n}" ${H.team===n?"selected":""}>${n===1?"1 (everyone for themselves)":n}</option>`).join("")}</select></label>
        <label class="opt">Length <select id="clMins">${[3,4,5,6].map(n=>`<option value="${n}" ${H.mins===n?"selected":""}>${n} min</option>`).join("")}</select></label></div>
      <p class="note">Level: <b>${lvl}</b> (change it on the menu). Pupils join at <b>${esc(APP.joinAddress||"the Ludus join page")}</b> with the code, as for a quiz.</p>
      <div class="row"><button class="btn" data-cl="open">Ouvrir la partie</button><button class="btn ghost" data-cl="cancel">Retour</button></div></div>`;
    return;
  }
  if(H.phase==="lobby"){
    el.innerHTML=`<div class="board-join"><div><span class="note">Go to</span><div class="addr">${esc(APP.joinAddress||"")}</div><span class="note">and type the code</span><div class="code big">${H.code}</div></div>
      <div class="qr">${qrSvg()}</div></div>
      <div class="card"><h3>${ps.length} chef${ps.length===1?"":"s"} ${H.kind==="coop"?"(maximum 4)":""}</h3><div class="plist">${chips}</div>
      <p class="note">${H.kind==="brigade"?`Brigades of ${H.team}, ${H.game==="arcade"?"Mode arcade":"Service classique"}, ${H.mins} minutes.`:`One shared kitchen, ${H.mins} minutes.`} Pupils who join late are added to a brigade.</p>
      <div class="row"><button class="btn" data-cl="start">Lancer le service</button><button class="btn ghost" data-cl="close">Annuler</button></div></div>`;
    return;
  }
  if(H.phase==="play"&&H.kind==="brigade"){
    const teams=hostTeams(),top=Math.max(1,...teams.map(t=>t.score)),chefs=ps.slice().sort((a,b)=>b.score-a.score).slice(0,5);
    el.innerHTML=`<div class="board-top"><div class="code">${H.code}</div><div class="clock">${fmt((H.endAt-Date.now())/1000)}</div><button class="btn ghost small" data-cl="end">Terminer</button></div>
      <div class="teams">${teams.map((t,i)=>`<div class="team"><div class="tn"><span class="rank">${i+1}</span><b>${esc(t.name)}</b><span class="tc">${t.chefs.map(p=>esc(p.name)).join(", ")}</span><b class="ts">${t.score} €</b></div>
        <div class="tbar"><i style="width:${t.score/top*100}%;background:${t.col}"></i></div></div>`).join("")}</div>
      <div class="card"><h3>Meilleurs chefs</h3><ol class="chefs">${chefs.map(p=>`<li><span>${esc(p.name)}</span><b>${p.score} €</b></li>`).join("")}</ol></div>`;
    return;
  }
  if(H.phase==="ended"){
    const F=H.final;
    el.innerHTML=H.kind==="brigade"?`<div class="card"><h2 class="win">🏆 ${F.teams[0]?esc(F.teams[0].name):"—"}</h2>
      <ol class="chefs">${F.teams.map(t=>`<li><span>${esc(t.name)} <span class="tc">${t.chefs.map(p=>esc(p.name)).join(", ")}</span></span><b>${t.score} €</b></li>`).join("")}</ol>
      <h3>Meilleurs chefs</h3><ol class="chefs">${F.chefs.slice(0,5).map(p=>`<li><span>${esc(p.name)}</span><b>${p.score} € · ${p.served} servis</b></li>`).join("")}</ol>
      <div class="row"><button class="btn" data-cl="again">Nouvelle partie</button><button class="btn ghost" data-cl="close">Menu</button></div></div>`
      :`<div class="card"><h2 class="win">La cuisine a gagné ${F.score} €</h2><p>${F.served} commandes servies, ${F.missed} clients partis.</p><p class="note">Chefs: ${ps.map(p=>esc(p.name)).join(", ")}</p>
      <div class="row"><button class="btn" data-cl="again">Nouvelle partie</button><button class="btn ghost" data-cl="close">Menu</button></div></div>`;
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
$("scrClass").addEventListener("change",e=>{if(e.target.name==="kind"){H.kind=e.target.value;$("clGameSet").hidden=H.kind!=="brigade"}});

/* ---------- a pupil's device ---------- */
const PKEY=()=>APP.storagePrefix+".bistro";
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
  mode="pupil";show("scrPupil");pupilMsg("Merci !",esc(msg),`<a class="btn" href="../">Join another game</a>`);
}
function pupilScore(){if(!P)return;const cash=S?S.cash:(A&&A.players.some(p=>p.local!=null))?A.score:0,served=S?S.served:A?A.served:0;
  clSend(P.ch,"score",{cash:P.base+cash,served})}
function pupilState(st){
  if(!P)return;P.st=st;if(typeof st.lvl==="string"&&LEVELS[st.lvl])lvl=st.lvl;
  const team=st.team?`<p class="team-badge" style="--team:${esc(st.team.col)}">Brigade <b>${esc(st.team.name)}</b>${st.team.mates.length?` with ${st.team.mates.map(esc).join(", ")}`:""}</p>`:"";
  if(st.phase==="lobby"){pupilMsg(`Tu es dans la partie, ${esc(st.name)} !`,`${st.kind==="coop"?"Cuisine partagée: you share one kitchen with up to 3 other chefs.":"Brigades: you run your own kitchen and your team adds up its takings."} Look at the board and wait for your teacher to start.`+team,
    `<div class="row"><button class="btn ghost" data-pt="tuto">🎓 Practise with the tutorial while you wait</button></div>`);return}
  if(st.phase==="play"&&!P.playing){
    P.playing=true;tutoEnd();$("endModal").classList.remove("on");P.base=st.base||0;
    if(st.kind==="brigade"){
      const secs=Math.max(5,(st.left||0)/1000);
      if(st.game==="classic")startClassic({seconds:secs});else startLocal({seconds:secs,name:st.name});
      if(team)toast(`Brigade ${st.team.name} !`);
      clearInterval(P.rep);P.rep=setInterval(pupilScore,2000);
    }else{
      SET.sound=false;syncSoundBtn();MUS.on=false;syncMusicUI();musicApply();
      NET.role="client";NET.kind="sb";NET.me=st.me;VIEW=null;
      clSub(KITCHEN_CH(P.code),{st:snapIn}).then(c=>{if(P)P.kch=c});
      startArcadeView();toast("Tap 🔊 Son to hear the orders on this device.");
    }
    return;
  }
  if(st.phase==="ended"){
    clearInterval(P.rep);if(st.kind==="brigade"&&P.playing)pupilScore();P.playing=false;
    const f=st.final||{};
    if(S&&!S.paused)endClassic();else if(A&&A.phase==="play")endArcade();
    const line=st.kind==="brigade"&&f.teamRank?`Brigade ${esc(st.team?st.team.name:"")}: <b>${f.teamRank}${f.teamRank===1?"re":"e"}</b> sur ${f.teams} avec ${f.teamScore} €. You were chef number ${f.chefRank} of ${f.chefs}.`
      :f.score!=null?`Your kitchen took <b>${f.score} €</b> and served ${f.served} orders.`:"";
    if(line){$("endTitle").innerHTML=st.kind==="brigade"&&f.teamRank===1?"🏆 Ta brigade a gagné !":"Le service est terminé !";$("endExtra").innerHTML=line;$("endExtra").hidden=false;$("endModal").classList.add("on")}
    try{localStorage.removeItem(PKEY())}catch(e){}
  }
}
$("scrPupil").addEventListener("click",e=>{const b=e.target.closest("[data-pt]");if(b&&b.dataset.pt==="tuto"){P&&P.st&&P.st.game==="classic"?classicTutorial():arcadeTutorial()}});
function snapIn(s){
  if(!s||!Array.isArray(s.pl)||!P)return;NET.lastSnap=s;
  VIEW=viewFromSnap(s,VIEW);(s.ev||[]).forEach(e=>{if(Array.isArray(e))handleEv(e)});
}
