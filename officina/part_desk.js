/* ---------------- data ---------------- */
const $=id=>document.getElementById(id);
const CFG=Object.assign({target:"claude",music:{menu:"music/menu.mp3",game:"music/game.mp3"}},window.OFFICINA||{});
const pick=a=>a[Math.floor(Math.random()*a.length)];
const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const LAT=/*LATIN*/{grammar:[],bank:[],tables:{}};
const GRAM=LAT.grammar,BANK=LAT.bank,TABLES=LAT.tables;
const KEYS=GRAM.map(g=>g.k).join("");
const LEVELS={
 facile:{upTo:"D",tables:2,spawn:16,pat:95,hints:true,aSpawn:24,aTime:110,aMax:3,maxW:3,note:"Present tense, puella nouns (nominative and accusative), questions and sum. Patient citizens."},
 moyen:{upTo:"L",tables:3,spawn:13,pat:80,hints:false,aSpawn:19,aTime:95,aMax:3,maxW:4,note:"Adds adjectives, all six cases, servus nouns, prepositions, pronouns and neuters."},
 difficile:{upTo:"R",tables:3,spawn:10,pat:65,hints:false,aSpawn:15,aTime:85,aMax:4,maxW:5,note:"The whole of Level 1, up to the imperfect and perfect tenses. Busy desk."}};
let lvl="facile";
const allowed=()=>KEYS.slice(0,KEYS.indexOf(LEVELS[lvl].upTo)+1);
const pool=()=>{const ok=allowed();return BANK.filter(b=>b.t.every(k=>ok.includes(k)))};
const words=s=>s.replace(/[.,!?;:]/g," ").trim().split(/\s+/);
const wkey=w=>w.toLowerCase();
const sameWords=(a,b)=>a.length===b.length&&a.map(wkey).sort().join(" ")===b.map(wkey).sort().join(" ");
const PEOPLE=[["Marcus","m"],["Iulia","f"],["Gaius","m"],["Cornelia","f"],["Lucius","m"],["Claudia","f"],["Titus","m"],["Livia","f"],["Quintus","m"],["Aurelia","f"],["Sextus","m"],["Flavia","f"]];
const FACES={m:["👨‍🦱","🧔","👴","👦"],f:["👩","👵","👧","👩‍🦰"]};
const citizen=()=>{const [n,g]=pick(PEOPLE);return {name:n,face:pick(FACES[g])}};
const PNL={"1s":"1st person singular","2s":"2nd person singular","3s":"3rd person singular","1p":"1st person plural","2p":"2nd person plural","3p":"3rd person plural"};
const CASEL={nom:"nominative",voc:"vocative",acc:"accusative",gen:"genitive",dat:"dative",abl:"ablative"};
const TENSEL={pres:"present",impf:"imperfect",perf:"perfect"};
const parseLabel=(kind,v)=>kind==="pn"?(PNL[v]||v):kind==="case"?(CASEL[v.split(" ")[0]]||v)+" "+(v.split(" ")[1]==="sg"?"singular":"plural"):(TENSEL[v]||v);
const parseQ=(kind,w)=>kind==="pn"?`What person and number is <b>${esc(w)}</b>?`:kind==="case"?`What case and number is <b>${esc(w)}</b>?`:`What tense is <b>${esc(w)}</b>?`;
function parseChoices(kind,v){
  let all;
  if(kind==="pn")all=Object.keys(PNL);
  else if(kind==="tense")all=["pres","impf","perf"];
  else{const six=allowed().includes("H");all=(six?["nom","acc","gen","dat","abl"]:["nom","acc"]).flatMap(c=>[c+" sg",c+" pl"])}
  return shuffle([v,...shuffle(all.filter(x=>x!==v)).slice(0,3)]);
}
const TYPES={tr:{name:"Translate",ask:"What does this mean, please?",pay:3},gap:{name:"Choose the form",ask:"Which word fits, please?",pay:3},
  parse:{name:"Parse",ask:"Can you parse this word for me?",pay:4},un:{name:"Unscramble",ask:"My message is jumbled. Can you put it in order?",pay:5}};
function taskFrom(k,b){
  const ws=words(b.lat);
  if(k==="tr"&&b.d&&b.d.length>=3)return {k,b,opts:shuffle([b.en,...b.d.slice(0,3)]).map(x=>[x,x]),ans:b.en};
  if(k==="gap"&&b.g&&b.g.length){const [i,o]=b.g[0];return {k,b,i,ws,opts:shuffle(o.slice(0,4)).map(x=>[x,x]),ans:o[0]}}
  if(k==="parse"&&b.p&&b.p.length){const [i,kind,v]=pick(b.p);if(!ws[i])return null;return {k,b,i,ws,kind,opts:parseChoices(kind,v).map(x=>[x,parseLabel(kind,x)]),ans:v}}
  if(k==="un"&&ws.length>=2&&ws.length<=7){let s=ws;for(let n=0;n<8&&s.join(" ")===ws.join(" ");n++)s=shuffle(ws);return {k,b,ws,tiles:s.map((w,j)=>({w,j,used:false})),built:[],ans:ws.join(" ")}}
  return null;
}
function makeTask(){
  const P=pool(),order=shuffle(["tr","tr","gap","parse","un"]);
  for(let n=0;n<60;n++){const t=taskFrom(order[n%order.length],pick(P));if(t)return t}
  return taskFrom("tr",P.find(b=>b.d&&b.d.length>=3)||BANK[0]);
}

/* ---------------- settings, music ---------------- */
const SET={sound:false,listen:false};
function speak(){} function stopAudio(){}
const MUS={on:true,vol:.35,want:null,unlocked:false,duck:0,tracks:{},fade:null};
try{const m=JSON.parse(localStorage.getItem("officina-music")||"null");if(m){MUS.on=!!m.on;MUS.vol=Math.max(0,Math.min(1,+m.vol||0))}}catch(e){}
function musicSave(){try{localStorage.setItem("officina-music",JSON.stringify({on:MUS.on,vol:MUS.vol}))}catch(e){}}
function track(name){
  if(!MUS.tracks[name]){const a=new Audio();a.loop=true;a.volume=0;MUS.tracks[name]=a;
    fetch(CFG.music[name]).then(r=>{if(!r.ok)throw new Error("missing");return r.blob()}).then(b=>{a.src=URL.createObjectURL(b);musicApply()}).catch(()=>{})}
  return MUS.tracks[name];
}
function musicApply(){
  const target=MUS.vol;
  if(MUS.want)track(MUS.want);
  clearInterval(MUS.fade);
  MUS.fade=setInterval(()=>{let busy=false;
    for(const [n,a] of Object.entries(MUS.tracks)){
      const want=MUS.on&&MUS.unlocked&&n===MUS.want&&a.src,goal=want?target:0;
      if(want&&a.paused){const p=a.play();if(p&&p.catch)p.catch(()=>{})}
      const v=a.volume+(goal-a.volume)*.25;a.volume=Math.abs(goal-v)<.01?goal:Math.max(0,Math.min(1,v));
      if(a.volume!==goal)busy=true;else if(!want&&!a.paused&&goal===0)a.pause();
    }
    if(!busy)clearInterval(MUS.fade)},50);
}
function setMusic(name){if(MUS.want!==name){MUS.want=name;musicApply()}}
["pointerdown","keydown"].forEach(ev=>window.addEventListener(ev,()=>{if(!MUS.unlocked){MUS.unlocked=true;musicApply()}},{once:true,capture:true}));
function syncMusicUI(){$("optMusic").checked=MUS.on;$("musicVol").value=Math.round(MUS.vol*100);$("musicBtn").setAttribute("aria-pressed",MUS.on);$("musicBtn").textContent=MUS.on?"♪ Musica":"♪ Silentium"}
$("optMusic").onchange=e=>{MUS.on=e.target.checked;musicSave();syncMusicUI();musicApply()};
$("musicVol").oninput=e=>{MUS.vol=+e.target.value/100;musicSave();musicApply()};
$("musicBtn").onclick=()=>{MUS.on=!MUS.on;musicSave();syncMusicUI();musicApply()};
function syncSoundBtn(){}

let tt;function toast(m){const t=$("toast");t.textContent=m;t.classList.add("on");clearTimeout(tt);tt=setTimeout(()=>t.classList.remove("on"),2200)}
const fmt=s=>Math.floor(Math.max(0,s)/60)+":"+String(Math.floor(Math.max(0,s)%60)).padStart(2,"0");
const money=n=>n+" d.";

/* ---------------- screens ---------------- */
let mode="menu";
function show(id){["scrMenu","scrClassic","scrLobby","scrArcade","scrClass","scrPupil"].forEach(s=>$(s).classList.toggle("on",s===id));
  const cls=id==="scrClass";$("hud").hidden=!(id==="scrClassic"||id==="scrArcade"||cls);$("pauseBtn").hidden=id!=="scrClassic";
  document.querySelectorAll("#hud .pill").forEach(e=>e.hidden=cls);
  $("board").hidden=id==="scrMenu"||id==="scrPupil";$("main").classList.toggle("wide",id==="scrMenu");
  setMusic(id==="scrClassic"||id==="scrArcade"?"game":"menu")}
/* the grammar tables in the side panel: the ones the chosen chapters use */
const TABLE_KEY={amo:"A",qw:"C",sum:"D",bonus:"E",pres:"F",ne:"G",puella:"H",servus:"I",prep:"J",ego:"K",bellum:"L",imp:"M",num:"N",inf:"O",miser:"P",impf:"Q",perf:"R"};
let tabSel=null;
function renderCarte(){
  const ok=allowed(),keys=Object.keys(TABLES).filter(k=>ok.includes(TABLE_KEY[k]||"Z"));
  if(!keys.includes(tabSel))tabSel=keys[0];
  const T=TABLES[tabSel];
  $("carte").innerHTML=`<select id="tabSel" aria-label="Choose a table">${keys.map(k=>`<option value="${k}" ${k===tabSel?"selected":""}>${esc(TABLES[k].title)}</option>`).join("")}</select>`+
    (T?`<div class="tabwrap"><table class="tab">${T.cols&&T.cols.some(Boolean)?`<tr>${T.cols.map(c=>`<th>${esc(c)}</th>`).join("")}</tr>`:""}${(T.rows||[]).map(r=>`<tr>${r.map((c,i)=>i?`<td>${esc(c)}</td>`:`<th>${esc(c)}</th>`).join("")}</tr>`).join("")}</table></div>${T.note?`<p class="note">${esc(T.note)}</p>`:""}`:"");
  $("tabSel").onchange=e=>{tabSel=e.target.value;renderCarte()};
}
function renderTopics(){const ok=allowed();$("topics").innerHTML=GRAM.filter(g=>ok.includes(g.k)).map(g=>`<span title="${esc(g.ch)}">${esc(g.name)}</span>`).join("")}
$("levels").addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;lvl=b.dataset.l;
  document.querySelectorAll("#levels button").forEach(x=>x.setAttribute("aria-pressed",x===b));$("levelNote").textContent=LEVELS[lvl].note;renderTopics();renderCarte()});
$("levelNote").textContent=LEVELS.facile.note;
function toMenu(){
  if(CL.role==="pupil"){tutoEnd();stopClassic();stopArcade();$("endModal").classList.remove("on");mode="pupil";show("scrPupil");return}
  if(H)hostClose();
  tutoEnd();stopClassic();stopArcade();netLeave();$("endModal").classList.remove("on");mode="menu";show("scrMenu")}
$("home").onclick=toMenu;$("quitBtn").onclick=toMenu;$("endMenu").onclick=toMenu;
$("goClassic").onclick=()=>{mode="classic";startClassic()};
$("goArcade").onclick=()=>{mode="lobby";renderCarte();show("scrLobby")};
$("againBtn").onclick=()=>{$("endModal").classList.remove("on");if(mode==="classic")startClassic();else if(NET.role==="host"){A.phase="lobby";show("scrLobby");renderLobby()}else if(NET.role==="client"){show("scrLobby")}else startLocal()};

/* ================= DESK (solo) ================= */
let S=null,timer=null;
function hud(){$("time").textContent=S.tuto?"Tutorial":fmt(S.time);$("cash").textContent=money(S.cash);$("served").textContent=S.served}
function renderRoom(){
  $("room").style.setProperty("--n",S.tables.length);
  $("room").innerHTML=S.tables.map((c,i)=>!c?`<div class="table empty">Seat ${i+1} · empty</div>`:
  `<div class="table ${S.cur===i?"active":""}"><div class="who"><span class="face">${c.face}</span><div><b>${esc(c.name)}</b><span>${TYPES[c.task.k].name}</span></div></div>
    <div class="bubble">“${TYPES[c.task.k].ask}”</div>
    <div class="bar"><i data-bar="${i}" style="width:${c.pat/c.max*100}%"></i></div>
    <div class="row"><button class="btn small" data-help="${i}">${S.cur===i?"Helping…":"Help"}</button></div></div>`).join("");
}
function sentenceHTML(ws,mark,blank){return ws.map((w,j)=>j===blank?`<span class="blank">______</span>`:j===mark?`<mark>${esc(w)}</mark>`:esc(w)).join(" ")}
function renderTask(){
  const el=$("task");
  if(S.feedback){const f=S.feedback;el.innerHTML=`<div class="fb ${f.ok?"ok":"no"}"><h3>${f.ok?"Recte! ✓":"Non recte."}</h3>${f.ok?`<p>${esc(f.who)} pays you <b>${money(f.pay)}</b>.</p>`:`<p>The answer was <b>${esc(f.ans)}</b>.</p>`}
    <p class="lat">${esc(f.b.lat)}</p><p class="en">${esc(f.b.en)}</p><button class="btn" data-next>Next citizen</button></div>`;return}
  if(S.cur==null||!S.tables[S.cur]){el.innerHTML=`<p class="note">${S.tables.some(Boolean)?"Click <b>Help</b> next to a citizen to start.":"Waiting for the next citizen…"}</p>`;return}
  const c=S.tables[S.cur],t=c.task;let body="";
  if(t.k==="tr")body=`<p class="ask">Translate:</p><p class="lat big">${esc(t.b.lat)}</p>`;
  if(t.k==="gap")body=`<p class="ask">Choose the word that fits:</p><p class="en">${esc(t.b.en)}</p><p class="lat big">${sentenceHTML(t.ws,-1,t.i)}</p>`;
  if(t.k==="parse")body=`<p class="ask">${parseQ(t.kind,t.ws[t.i])}</p><p class="lat big">${sentenceHTML(t.ws,t.i,-1)}</p><p class="en">${esc(t.b.en)}</p>`;
  if(t.k==="un"){body=`<p class="ask">Click the words in order to make the Latin for:</p><p class="en">${esc(t.b.en)}</p>
    <p class="lat big built">${t.built.map(j=>esc(t.ws[j]===undefined?"":t.tiles.find(x=>x.j===j).w)).join(" ")||"&nbsp;"}</p>
    <div class="wtiles">${t.tiles.map((x,n)=>`<button class="wtile" data-tile="${n}" ${x.used?"disabled":""}>${esc(x.w)}</button>`).join("")}</div>
    <div class="row"><button class="btn" data-check ${t.built.length===t.ws.length?"":"disabled"}>Check</button><button class="btn ghost" data-reset>Start again</button></div>`;
    el.innerHTML=`<div class="tk"><div class="who"><span class="face">${c.face}</span><b>${esc(c.name)}</b></div>${body}</div>`;return}
  el.innerHTML=`<div class="tk"><div class="who"><span class="face">${c.face}</span><b>${esc(c.name)}</b></div>${body}<div class="choices">${t.opts.map(([v,l],n)=>`<button data-opt="${n}">${esc(l)}</button>`).join("")}</div></div>`;
}
function answer(ok,given){
  const i=S.cur,c=S.tables[i],t=c.task;S.answered++;
  const ansText=t.k==="parse"?parseLabel(t.kind,t.ans):t.ans;
  if(ok){const pay=TYPES[t.k].pay+Math.max(0,Math.ceil(c.pat/c.max*2));S.cash+=pay;S.served++;S.right++;S.feedback={ok:true,who:c.name,pay,b:t.b}}
  else{S.wrong++;S.missed.push(t.b);S.feedback={ok:false,ans:ansText,b:t.b}}
  S.seen.add(t.b);S.tables[i]=null;S.cur=null;renderRoom();renderTask();hud();
  const nb=$("task").querySelector("[data-next]");if(nb)nb.focus();
}
function spawnCit(task){
  const free=S.tables.map((c,i)=>c?-1:i).filter(i=>i>=0);if(!free.length)return;
  const L=LEVELS[lvl],{name,face}=citizen();S.tables[pick(free)]={name,face,task:task||makeTask(),pat:L.pat,max:L.pat};renderRoom();renderTask();
}
function tick(){
  if(!S||S.paused)return;
  if(S.tuto){hud();return}
  S.time-=.25;S.spawnT-=.25;if(S.spawnT<=0){spawnCit();S.spawnT=LEVELS[lvl].spawn}
  S.tables.forEach((c,i)=>{if(!c)return;if(S.cur===i&&!S.feedback)c.pat-=.12;else c.pat-=.25;
    const b=document.querySelector(`[data-bar="${i}"]`);if(b){const r=c.pat/c.max;b.style.width=Math.max(0,r*100)+"%";b.style.background=r>.5?"var(--ok)":r>.25?"var(--brass)":"var(--bad)"}
    if(c.pat<=0){S.tables[i]=null;S.left++;if(S.cur===i)S.cur=null;toast(`${c.name} gave up and left. Vale!`);renderRoom();renderTask()}});
  hud();if(S.time<=0)endClassic();
}
$("scrClassic").addEventListener("click",e=>{
  const t=e.target.closest("button");if(!t||!S)return;
  if(t.dataset.help!=null){if(S.feedback)return;S.cur=+t.dataset.help;renderRoom();renderTask();return}
  if(t.hasAttribute("data-next")){S.feedback=null;const n=S.tables.findIndex(Boolean);S.cur=null;renderRoom();renderTask();return}
  const c=S.cur!=null&&S.tables[S.cur];if(!c||S.feedback)return;const k=c.task;
  if(t.dataset.opt!=null){const [v]=k.opts[+t.dataset.opt];answer(v===k.ans,v);return}
  if(t.dataset.tile!=null){const x=k.tiles[+t.dataset.tile];if(x.used)return;x.used=true;k.built.push(x.j);
    // show the word itself, not its position
    renderTask();return}
  if(t.hasAttribute("data-reset")){k.tiles.forEach(x=>x.used=false);k.built=[];renderTask();return}
  if(t.hasAttribute("data-check")){const got=k.built.map(j=>k.tiles.find(x=>x.j===j).w).join(" ");answer(got===k.ans,got)}
});
function startClassic(opts){
  tutoEnd();stopArcade();
  const tuto=!!(opts&&opts.tuto);
  S={tuto,time:opts&&opts.seconds?opts.seconds:180,spawnT:tuto?1e9:1,tables:Array(tuto?1:LEVELS[lvl].tables).fill(null),cur:null,feedback:null,
    cash:0,served:0,left:0,wrong:0,right:0,answered:0,seen:new Set(),missed:[],paused:false};
  renderCarte();renderRoom();renderTask();hud();show("scrClassic");$("pauseBtn").textContent="Pausa";
  clearInterval(timer);timer=setInterval(tick,250);
}
function stopClassic(){clearInterval(timer);if(S)S.paused=true;S=null}
function endClassic(){
  clearInterval(timer);S.paused=true;
  const pct=S.answered?Math.round(S.right/S.answered*100):0;
  showEnd({cash:S.cash,rows:[["Denarii",money(S.cash)],["Citizens helped",S.served],["Correct",S.answered?pct+" %":"–"],["Left waiting",S.left]],
    review:S.missed,seen:S.seen,key:"desk-"+lvl,stars:S.cash>=60?3:S.cash>=35?2:S.cash>=12?1:0});
}
$("pauseBtn").onclick=()=>{if(!S||S.time<=0)return;S.paused=!S.paused;$("pauseBtn").textContent=S.paused?"Perge":"Pausa"};
function showEnd(r){
  setMusic("menu");
  let best=0;try{best=+localStorage.getItem("officina-best-"+r.key)||0;if(r.cash>best)localStorage.setItem("officina-best-"+r.key,r.cash)}catch(e){}
  $("endStars").textContent="★".repeat(r.stars)+"☆".repeat(3-r.stars);
  $("endStats").innerHTML=r.rows.concat([["Best",money(Math.max(best,r.cash))]]).map(([a,b])=>`<div>${a}<b>${b}</b></div>`).join("");
  const list=(r.review&&r.review.length?r.review:[...(r.seen||[])].slice(-8));
  $("endVocab").innerHTML=list.map(b=>`<div><b>${esc(b.lat)}</b> ${esc(b.en)}</div>`).join("")||"<div>Nothing to review.</div>";
  $("againBtn").hidden=NET.role==="client"||CL.role==="pupil";$("endExtra").hidden=true;$("endTitle").textContent="Officina clausa est!";
  if(CL.role==="pupil")pupilScore();
  $("endModal").classList.add("on");
}
