/* ---- rendering ---- */
const cv=$("cv");let ctx=cv.getContext("2d");
let TS=64;
function fitCanvas(){const w=cv.parentElement.clientWidth-16;const dpr=Math.min(2,window.devicePixelRatio||1);
  const extra=$("touch").classList.contains("off")?260:420;const ts=Math.max(20,Math.floor(Math.min(w/MW,Math.max(220,window.innerHeight-extra)/MH)));TS=ts;
  cv.style.width=ts*MW+"px";cv.style.height=ts*MH+"px";cv.width=ts*MW*dpr;cv.height=ts*MH*dpr;ctx.setTransform(dpr,0,0,dpr,0,0)}
new ResizeObserver(()=>{if(mode==="arcade")fitCanvas()}).observe($("stage"));
function rr(x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath()}
function emoji(e,x,y,s){ctx.font=`${s}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(e,x,y)}
function label(txt,x,y,size,col,maxW,weight){ctx.font=`${weight||800} ${Math.max(9,Math.floor(size))}px Nunito,sans-serif`;ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillStyle=col;ctx.fillText(txt,x,y,maxW)}
function wordCard(w,x,y,s){
  ctx.fillStyle="#0003";rr(x-s*.5+2,y-s*.2+3,s,s*.4,4);ctx.fill();
  ctx.fillStyle="#f3e4c1";rr(x-s*.5,y-s*.2,s,s*.4,4);ctx.fill();ctx.strokeStyle="#b28a4c";ctx.lineWidth=1.5;ctx.stroke();
  label(w,x,y+1,s*.24,"#3b2a1c",s*.92);
}
function tablet(it,x,y,s){
  ctx.fillStyle="#0003";rr(x-s*.45+2,y-s*.32+3,s*.9,s*.64,5);ctx.fill();
  ctx.fillStyle="#8a5a2b";rr(x-s*.45,y-s*.32,s*.9,s*.64,5);ctx.fill();
  ctx.fillStyle="#3b2a1c";rr(x-s*.37,y-s*.24,s*.74,s*.48,3);ctx.fill();
  const n=it.ing.length;
  if(n){const show=it.ing.slice(0,3),lh=s*.15;show.forEach((w,i)=>label(w,x,y-s*.12+i*lh,s*.13,"#f3e4c1",s*.7,700));
    if(n>3)label(`+${n-3}`,x+s*.3,y+s*.22,s*.12,"#c99a2e",s*.3)}
  if(it.t==="d"){ctx.fillStyle="#b3261e";ctx.beginPath();ctx.arc(x+s*.34,y-s*.24,s*.13,0,7);ctx.fill();ctx.fillStyle="#e0605a";ctx.beginPath();ctx.arc(x+s*.31,y-s*.27,s*.05,0,7);ctx.fill()}
}
function drawItem(it,x,y,s){if(!it)return;if(it.t==="w")wordCard(it.w,x,y,s);else tablet(it,x,y,s)}
function drawMap(V,now){
  const t=TS;
  for(let r=0;r<MH;r++)for(let c=0;c<MW;c++){
    const ch=MAP[r][c],x=c*t,y=r*t;
    if(ch==="."){ctx.fillStyle=(r+c)%2?"#e6d6b5":"#d9c39b";ctx.fillRect(x,y,t,t);ctx.fillStyle="#b4552f22";ctx.fillRect(x+t*.42,y+t*.42,t*.16,t*.16);continue}
    ctx.fillStyle="#8d7a5e";ctx.fillRect(x,y,t,t);ctx.fillStyle="#c9b48f";ctx.fillRect(x+2,y+2,t-4,t-7);ctx.fillStyle="#e2d3b3";ctx.fillRect(x+2,y+2,t-4,4);
    const key=r+","+c;
    if(ch==="W"){ctx.fillStyle="#6b4226";rr(x+3,y+3,t-6,t-9,5);ctx.fill();ctx.fillStyle="#4a2d18";ctx.fillRect(x+5,y+t*.55,t-10,3);
      const w=V.shelf&&V.shelf[key];
      if(w){for(let i=0;i<3;i++){ctx.fillStyle=["#f3e4c1","#e8d5a8","#f7ecd2"][i];ctx.fillRect(x+t*.15+i*t*.05,y+t*.2-i*2,t*.62,t*.3)}
        label(w,x+t/2,y+t*.36,t*.2,"#3b2a1c",t-10,900)}
      else{ctx.fillStyle="#0002";ctx.fillRect(x+t*.2,y+t*.25,t*.6,t*.22)}}
    else if(ch==="D"){for(let i=0;i<3;i++){ctx.fillStyle=i%2?"#7a4e2d":"#8a5a2b";rr(x+t*.18,y+t*.5-i*t*.1,t*.64,t*.2,3);ctx.fill()}}
    else if(ch==="K"){ctx.fillStyle="#5a1d18";rr(x+3,y+3,t-6,t-8,6);ctx.fill();ctx.fillStyle="#b3261e";ctx.beginPath();ctx.arc(x+t/2,y+t/2-2,t*.2,0,7);ctx.fill();
      if(V.tiles[key]&&V.cook[key]!=null){ctx.strokeStyle="#ff9f1c";ctx.lineWidth=t*.07;ctx.beginPath();ctx.arc(x+t/2,y+t/2-2,t*.34,0,7);ctx.stroke()}}
    else if(ch==="X"){ctx.fillStyle="#c99a2e";rr(x+3,y+3,t-6,t-8,6);ctx.fill();if(t>=44)label("NUNTIUS",x+t/2,y+t/2,t*.17,"#3b2a1c",t-8,900);else emoji("📯",x+t/2,y+t/2,t*.5)}
    else if(ch==="Z"){ctx.fillStyle="#7a5a3a";rr(x+8,y+8,t-16,t-14,8);ctx.fill();ctx.strokeStyle="#4a3520";ctx.lineWidth=2;for(let i=1;i<4;i++){ctx.beginPath();ctx.moveTo(x+8,y+8+i*(t-14)/4);ctx.lineTo(x+t-8,y+8+i*(t-14)/4);ctx.stroke()}}
  }
  for(const key in V.tiles){const [r,c]=key.split(",").map(Number);drawItem(V.tiles[key],c*t+t/2,r*t+t/2-2,t*.9);
    const ck=V.cook[key];if(ck!=null&&MAP[r][c]==="K"&&V.tiles[key].t==="p")bar(c*t+6,r*t+t-10,t-12,ck/SEAL_T,"#e0605a")}
}
function drawTargets(now){
  const st=TUTO&&TUTO.kind==="arcade"&&TUTO.steps[TUTO.i];if(!st||!st.tiles)return;
  const tiles=(typeof st.tiles==="function"?st.tiles():st.tiles).filter(Boolean);if(!tiles.length)return;
  const t=TS,a=.55+.45*Math.sin(now/180);
  tiles.forEach(([c,r])=>{ctx.save();ctx.globalAlpha=a;ctx.strokeStyle="#ffd23f";ctx.lineWidth=Math.max(3,t*.09);rr(c*t+2,r*t+2,t-4,t-4,8);ctx.stroke();ctx.restore()});
  const [c,r]=tiles[0],bx=c*t+t/2,by=r*t+(r<MH/2?t*1.25:-t*.25)+Math.sin(now/200)*t*.08;
  emoji(r<MH/2?"⬆️":"⬇️",bx,by,t*.5);
}
function bar(x,y,w,f,col){ctx.fillStyle="#0008";rr(x,y,w,7,3);ctx.fill();ctx.fillStyle=col;rr(x+1,y+1,Math.max(0,(w-2)*Math.min(1,f)),5,2);ctx.fill()}
function drawPlayers(V,mine){
  const t=TS;
  [...V.players].sort((a,b)=>a.y-b.y).forEach(p=>{
    const x=p.x*t,y=p.y*t;
    if(mine.includes(p.id)){const fx=Math.abs(p.fx)>=Math.abs(p.fy)?Math.sign(p.fx):0,fy=fx?0:Math.sign(p.fy)||1;const tc=Math.floor(p.x)+fx,tr=Math.floor(p.y)+fy;
      if(tr>=0&&tr<MH&&tc>=0&&tc<MW&&MAP[tr][tc]!=="."){ctx.strokeStyle=p.col;ctx.lineWidth=3;ctx.setLineDash([6,4]);rr(tc*t+3,tr*t+3,t-6,t-6,6);ctx.stroke();ctx.setLineDash([])}}
    ctx.fillStyle="#0004";ctx.beginPath();ctx.ellipse(x,y+t*.3,t*.32,t*.12,0,0,7);ctx.fill();
    const ci=Math.max(0,COLS.indexOf(p.col)),im=CHEF_IMG[ci%4];
    if(Math.abs(p.fx)>.2)lastLR[p.id]=Math.sign(p.fx);const lr=lastLR[p.id]||1;
    let top=y-t*.52;
    if(im&&im.complete&&im.naturalWidth){
      const h=t*1.4,w=h*im.naturalWidth/im.naturalHeight,feet=y+t*.34;top=feet-h;
      ctx.save();ctx.translate(x,feet);if(lr!==CHEF_FACE[ci%4])ctx.scale(-1,1);ctx.drawImage(im,-w/2,-h,w,h);ctx.restore();
    }else{ctx.fillStyle=p.col;ctx.beginPath();ctx.arc(x,y+t*.05,t*.3,0,7);ctx.fill();ctx.fillStyle="#ffe0c2";ctx.beginPath();ctx.arc(x,y-t*.12,t*.2,0,7);ctx.fill()}
    ctx.font=`900 ${Math.max(11,Math.floor(t*.22))}px Nunito,sans-serif`;ctx.textAlign="center";ctx.textBaseline="bottom";ctx.lineWidth=3;ctx.strokeStyle="#000a";ctx.strokeText(p.name,x,top+2);ctx.fillStyle="#fff";ctx.fillText(p.name,x,top+2);
    if(p.hold){const fx=Math.abs(p.fx)>=Math.abs(p.fy)?Math.sign(p.fx):0,fy=fx?0:Math.sign(p.fy)||1;drawItem(p.hold,x+(fx||lr*.6)*t*.34,y-t*.02+fy*t*.12,t*.72)}
  });
}
let lastTk="";
function renderTickets(V){
  const L=LEVELS[V.lvl],sig=V.tickets.map(t=>t.id+":"+Math.round(t.t)).join("|");
  if(sig===lastTk)return;lastTk=sig;
  const cards=V.tickets.map(t=>{const b=BANK[t.b];if(!b)return "";const r=t.t/t.max,ws=t.ws||words(b.lat);
    return `<div class="ticket"><div style="font-size:22px">${t.face}</div><div class="t">${esc(b.en)}</div><div class="slots">${ws.map(()=>`<span>▢</span>`).join("")}<span class="n">${ws.length} words</span></div>
      <div class="tb"><i style="width:${Math.max(0,r*100)}%;background:${r>.5?"#2e8b57":r>.25?"#c99a2e":"#b3261e"}"></i></div></div>`}).join("");
  $("tickets").innerHTML=cards+(V.tickets.length<L.aMax?`<div class="ticket empty">Exspectamus…</div>`:"");
}
function render(now,dt){
  if(NET.role==="client"){const stale=now-(NET.snapAt||now)>3000;$("classBar").hidden=!stale;if(stale)$("classBar").textContent="⚠️ Connection lost… waiting for the board. Keep the board's Ludus tab open."}
  if(!VIEW)return;
  if(NET.role==="client"){const k=Math.min(1,dt*14);VIEW.players.forEach(p=>{p.x+=(p.tx-p.x)*k;p.y+=(p.ty-p.y)*k})}
  ctx.clearRect(0,0,cv.width,cv.height);drawMap(VIEW,now);drawTargets(now);drawPlayers(VIEW,myIds());
  $("time").textContent=VIEW.tuto?"Tutorial":fmt(VIEW.time);$("cash").textContent=money(VIEW.score);$("served").textContent=VIEW.served;
  renderTickets(VIEW);
}
