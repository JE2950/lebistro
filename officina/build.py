# Builds Officina Scribarum from the bistro's shared engine (../tools/src/src.html and classmode.js)
# plus this folder's sections, the Level 1 Latin data and the scribe sprites.
#   python3 build.py                 -> ./index.html
#   python3 build.py ludus OUT.html  -> a page for the Ludus site's officina/ folder
import base64, json, os, re, sys
here = os.path.dirname(os.path.abspath(__file__))
src_dir = os.path.join(here, "..", "tools", "src")
base = open(os.path.join(src_dir, "src.html")).read()
part = lambda n: open(os.path.join(here, n)).read()
def cut(a, b):
    i = base.index(a); j = base.index(b, i); return base[i:j]

head = base[:base.index("</style>")]
head = head.replace('<html lang="fr">', '<html lang="en">').replace("family=Abril+Fatface&", "family=Abril+Fatface&family=Cinzel:wght@700&").replace("<title>Le Petit Bistro</title>", "<title>Officina Scribarum</title>")
head += part("style.css") + "</style>\n"

main = cut("/* ---- main loop ---- */", "/* ================= TUTORIALS ================= */")
main = main.replace('||"Chef";', '||"Scriba";').replace('mkPlayer("L1","Chef 2",1)', 'mkPlayer("L1","Scriba 2",1)')
main = re.sub(r"function endArcade\(\)\{.*?\n\}\n", lambda m: """function endArcade(){
  if(NET.role==="host"&&NET.kind==="sb"){hostEnd();return}
  if(mode!=="arcade")return;
  const V=VIEW||{};cancelAnimationFrame(raf);stopTicker();
  const sc=V.score||0;
  if(NET.role==="host")netSend();
  showEnd({cash:sc,rows:[["Denarii",money(sc)],["Messages sent",V.served||0],["Citizens who left",A?A.missed:(NET.lastSnap?NET.lastSnap.ms:0)],["Scribes",(V.players||[]).length]],
    seen:A?A.seen:new Set(),key:"workshop-"+(V.lvl||lvl),stars:sc>=80?3:sc>=45?2:sc>=12?1:0});
}
""", main, count=1, flags=re.S)

game = """/* words the shared class-game module uses */
const GAME={id:"officina",teamWord:"Turma",teamPlural:"Turmae",kitchen:"workshop",kitchenPlural:"workshops",coopTitle:"Shared workshops",
  arcadeName:"Officina (arcade)",classicName:"Officium (desk)",money:"d.",servedWord:"messages",topPlayers:"Optimi scribae",
  teams:[["Aquilae","#c99a2e"],["Lupi","#7a4e2d"],["Leones","#d9822b"],["Delphini","#2f80ed"],["Ursi","#5b4636"],["Equi","#9e2a22"],["Apri","#6b7a3a"],["Corvi","#333333"]],
  kitchenNames:["Forum Romanum","Via Appia","Campus Martius","Circus Maximus","Subura","Palatium","Ostia","Capitolium"],
  thanks:"Gratias!",welcome:n=>`Salve, ${n}!`,winTitle:"Vicistis! You won!",endTitle:"Finis!",levelLabel:()=>({facile:"Ch 2–22",moyen:"Ch 2–46",difficile:"Whole of Level 1"})[lvl]};
"""
tail = base[base.index("/*CLASSMODE*/"):]
tail = tail.replace("syncMusicUI();renderCarte();", "syncMusicUI();renderTopics();renderCarte();").replace("INP,ORDERS,MAP,NET", "INP,BANK,MAP,NET,newTicket")

js = (part("part_desk.js") + part("part_arcade.js") + cut("/* ---- input ---- */", "/* ---- rendering ---- */") + part("part_render.js")
      + main + cut("/* ================= TUTORIALS ================= */", "const findOrder=") + part("part_tuto.js")
      + cut("/* ================= NETWORK (room capability) ================= */", "/* words the shared class-game module uses */") + game + tail)

out = head + part("body.html") + js
out = out.replace("Tutoriel · étape ${TUTO.i+1} sur ${TUTO.steps.length}", "Tutorial · step ${TUTO.i+1} of ${TUTO.steps.length}").replace('||"Chef"', '||"Scriba"').replace("L'hôte a quitté la partie.", "The host has left the game.").replace("Impossible de créer la partie.", "Could not create the game.").replace('"bistro-"+code', '"officina-"+code')
out = out.replace("/*CLASSMODE*/", open(os.path.join(src_dir, "classmode.js")).read())
lat = json.load(open(os.path.join(here, "data", "latin_l1.json")))
out = out.replace("/*LATIN*/{grammar:[],bank:[],tables:{}}", json.dumps(lat, ensure_ascii=False, separators=(",", ":")).replace("<", "\\u003c"))
sprites = ["data:image/webp;base64," + base64.b64encode(open(os.path.join(here, "art", f"scribe{i}.webp"), "rb").read()).decode() for i in range(4)]
out = out.replace("/*SPRITES*/[]", json.dumps(sprites))
if not os.environ.get("BISTRO_TEST"):
    out = re.sub(r'\nif\(location\.hash==="#selftest".*?window\.__bistro=.*?;\n', "\n", out)
target = sys.argv[1] if len(sys.argv) > 1 else "claude"
if target == "ludus":
    out = out.replace("<title>Officina Scribarum</title>", """<script>window.OFFICINA={target:"ludus",music:{menu:"../assets/music/latin-lobby.mp3",game:"../assets/music/latin.mp3"}}</script>
<script src="../assets/vendor/supabase-js-2.117.3.js"></script>
<script src="../assets/config.js"></script>
<script src="../assets/vendor/qrcode-generator-1.4.4.js"></script>
<script src="../assets/common.js"></script>
<link rel="icon" href="../assets/favicon.svg" type="image/svg+xml">
<title>Officina Scribarum · Ludus</title>""", 1)
    dest = sys.argv[2]
elif target == "solo":
    # one offline file for single players: music inside, no online or class games
    m = lambda f: "data:audio/mpeg;base64," + base64.b64encode(open(os.path.join(here, "..", "..", "luddite", "assets", "music", f), "rb").read()).decode()
    out = out.replace("<title>Officina Scribarum</title>", '<script>window.OFFICINA={target:"solo",music:{menu:"%s",game:"%s"}}</script>\n<title>Officina Scribarum</title>' % (m("latin-lobby.mp3"), m("latin.mp3")), 1)
    out = out.replace("</style>", "#roomCard,#classCard{display:none!important}</style>", 1)
    dest = sys.argv[2] if len(sys.argv) > 2 else os.path.join(here, "officina-solo.html")
else:
    dest = os.path.join(here, "index.html")
open(dest, "w").write(out)
print("Officina built:", dest, len(out)//1024, "KB")
