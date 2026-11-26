const findB=f=>BANK.find(f);
function classicTutorial(){
  startClassic({tuto:true});
  const trB=findB(b=>b.lat==="puella cantat."&&b.d)||findB(b=>b.ch<=10&&b.d&&b.d.length>=3&&words(b.lat).length===2);
  const gapB=findB(b=>b.ch<=12&&b.g&&b.g.length&&words(b.lat).length<=3)||findB(b=>b.g&&b.g.length);
  const parB=findB(b=>b.ch<=12&&b.p&&b.p.some(p=>p[1]==="pn"))||findB(b=>b.p&&b.p.length);
  const unB=findB(b=>b.ch<=20&&words(b.lat).length===3&&b.t.every(k=>"ABC".includes(k)))||findB(b=>words(b.lat).length===3);
  const parT=()=>{const t=taskFrom("parse",parB);return t};
  let base=0;const next=()=>S&&S.answered>base;
  const seat=t=>{base=S.answered;S.feedback=null;S.cur=null;spawnCit(t)};
  tutoStart("classic",[
    {enter:()=>seat(taskFrom("tr",trB)),text:"Salve! A citizen has come to your desk with some Latin. Click <b>Help</b> to see what they need.",hl:'[data-help="0"]',check:()=>S.cur===0},
    {text:"Read the Latin, then click the English that means the same.",hl:"#task .choices button",check:next},
    {text:"Every answer earns <b>denarii</b> (d.). A wrong answer shows you the right one, so read it. Click <b>Next citizen</b>.",hl:"[data-next]",check:()=>!S.feedback},
    {enter:()=>seat(taskFrom("gap",gapB)),text:"This citizen needs the right <b>form</b> of a word. Click <b>Help</b>, read the English, then choose the word that fits the gap.",hl:'[data-help="0"],#task .choices button',check:next},
    {text:"Click <b>Next citizen</b>.",hl:"[data-next]",check:()=>!S.feedback},
    {enter:()=>seat(parT()),text:"Now <b>parse</b> the highlighted word: say what person and number, case and number, or tense it is. The <b>Tabulae</b> on the right can help.",hl:'[data-help="0"],#task .choices button,#board',check:next},
    {text:"Click <b>Next citizen</b>.",hl:"[data-next]",check:()=>!S.feedback},
    {enter:()=>seat(taskFrom("un",unB)),text:"Last one: the message is jumbled. Click the Latin words in order to match the English, then click <b>Check</b>. <b>Start again</b> clears your attempt.",hl:'[data-help="0"],.wtile,[data-check]',check:next},
    {text:"<b>Optime!</b> In a real session, up to three citizens wait at once and lose patience over time. Help the most impatient first. Ready?",
      acts:'<button class="btn small" data-coach="play-classic">Start the desk</button>'}
  ]);
}
function arcadeTutorial(){
  NET.role=null;NET.kind=null;INP.forEach(i=>i.a=0);
  const p=mkPlayer("L0",$("nameIn").value.trim()||"Scriba",0);p.local=0;p.lastA=INP[0].a;
  A=newArcade([p]);A.tuto=true;A.spawnT=1e9;A.time=0;VIEW=viewFromA();startArcadeView();
  const b1=findB(b=>b.lat==="puella cantat.")||findB(b=>b.ch<=10&&words(b.lat).length===2);
  const ws=words(b1.lat);
  const me=()=>A&&A.players[0],holds=f=>{const h=me()&&me().hold;return !!(h&&f(h))};
  const shelfOf=w=>{for(const k in A.shelf)if(wkey(A.shelf[k])===wkey(w)){const [r,c]=k.split(",").map(Number);return [c,r]}return null};
  const onSeal=f=>["6,6","6,7"].some(k=>A.tiles[k]&&f(A.tiles[k]));
  const tabHas=(h,w)=>h.t==="p"&&h.ing.map(wkey).includes(wkey(w));
  let start=null;
  tutoStart("arcade",[
    {enter:()=>{newTicket(b1,[]);start={x:p.x,y:p.y}},text:"You are the scribe with your name above your head. Move with <b>W A S D</b> or the <b>arrow keys</b> (on a tablet, use the joystick).",
      check:()=>Math.hypot(me().x-start.x,me().y-start.y)>1.2},
    {text:`A citizen wants a message sent. It is in English at the top: <b>${esc(b1.en)}</b> You need the Latin. Walk to the <b>wax tablets</b> and press <b>Space</b> (or <b>Cape / Pone</b>) to take one.`,tiles:[[6,2]],check:()=>holds(h=>h.t==="p")},
    {text:`Find the shelf with <b>${esc(ws[0])}</b> and press Space to write it on your tablet.`,tiles:()=>[shelfOf(ws[0])],check:()=>holds(h=>tabHas(h,ws[0]))},
    {text:`Now add <b>${esc(ws[1])}</b> from its shelf.`,tiles:()=>[shelfOf(ws[1])],check:()=>holds(h=>tabHas(h,ws[0])&&tabHas(h,ws[1]))},
    {text:"Put the tablet on a <b>seal desk</b> (the red circle) and wait while the wax seal goes on.",tiles:[[6,6],[7,6]],check:()=>onSeal(it=>it.t==="d")||holds(h=>h.t==="d")},
    {text:"Sealed! Pick it up and hand it to the messenger, <b>NUNTIUS</b>.",tiles:[[6,6],[7,6],[7,0]],check:()=>A.served>=1},
    {text:"<b>Optime!</b> In a real session, shelves also hold <b>wrong forms</b> (puellae, cantant…), so choose carefully. A wrong tablet goes in the basket. Ready?",tiles:[[6,8]],
      acts:'<button class="btn small" data-coach="play-arcade">Start the workshop</button>'}
  ]);
}
$("tutoClassic").onclick=classicTutorial;
$("tutoArcade").onclick=arcadeTutorial;

