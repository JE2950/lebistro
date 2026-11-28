# One offline file holding both games for single players (no online or class games).
#   python3 tools/solo.py [OUT.html]
import base64, json, os, subprocess, sys
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
b64 = lambda p, t: f"data:{t};base64," + base64.b64encode(open(p, "rb").read()).decode()
HIDE = "#roomCard,#classCard{display:none!important}"
BACK = '<button onclick="location.reload()" title="Choose another game" style="position:fixed;left:8px;top:4px;z-index:99;font:800 13px Nunito,sans-serif;padding:6px 12px;border-radius:999px;border:1px solid #0003;background:#fffc;cursor:pointer">⇄ Games</button>'

subprocess.run([sys.executable, os.path.join(root, "tools", "src", "build.py")], check=True, cwd=root)
bistro = open(os.path.join(root, "index.html")).read()
clips = {f[:-4]: b64(os.path.join(root, "audio", f), "audio/mpeg") for f in sorted(os.listdir(os.path.join(root, "audio"))) if f.endswith(".mp3")}
cfg = {"target": "solo", "audio": "", "clips": clips, "music": {"menu": b64(os.path.join(root, "music", "menu.mp3"), "audio/mpeg"), "game": b64(os.path.join(root, "music", "game.mp3"), "audio/mpeg")}}
src = 'fetch(CFG.audio+id+".mp3")'
assert src in bistro
bistro = bistro.replace(src, 'fetch(CFG.clips?CFG.clips[id]:CFG.audio+id+".mp3")')
bistro = bistro.replace("<title>Le Petit Bistro</title>", "<script>window.BISTRO=" + json.dumps(cfg) + "</script>\n<title>Le Petit Bistro</title>", 1)
bistro = bistro.replace("</style>", HIDE + "</style>", 1).replace("</body>", BACK + "</body>", 1)

tmp = "/tmp/_officina_solo.html"
subprocess.run([sys.executable, os.path.join(root, "officina", "build.py"), "solo", tmp], check=True)
officina = open(tmp).read().replace("</body>", BACK + "</body>", 1)

enc = lambda h: json.dumps(h).replace("</", "<\\/")
page = """<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Le Petit Bistro · Officina Scribarum</title>
<style>
body{margin:0;min-height:100vh;display:grid;place-items:center;font-family:Georgia,serif;background:#f4ede1;color:#2a211b}
h1{text-align:center;font-size:clamp(28px,4vw,44px);margin:0 0 6px}p.sub{text-align:center;margin:0 0 28px;color:#6b6058;font-family:system-ui,sans-serif}
.row{display:flex;gap:24px;flex-wrap:wrap;justify-content:center;padding:20px}
button.g{width:300px;padding:26px 22px;border-radius:18px;border:0;cursor:pointer;text-align:left;font:inherit;box-shadow:0 8px 0 #0002;transition:transform .1s}
button.g:hover{transform:translateY(-3px)}button.g .e{font-size:48px}button.g b{display:block;font-size:26px;margin:8px 0 4px}button.g span{font-family:system-ui,sans-serif;font-size:15px;opacity:.85}
.b{background:repeating-linear-gradient(90deg,#1f4e9c 0 30px,#fff 30px 60px,#c8302f 60px 90px) top/100% 14px no-repeat,#fff8ec;padding-top:36px!important}
.o{background:repeating-linear-gradient(90deg,#9e2a22 0 26px,#c99a2e 26px 30px,#1c1a17 30px 52px,#c99a2e 52px 56px) top/100% 14px no-repeat,#f3e4c1;padding-top:36px!important}
</style></head><body><main>
<h1>Choose a game</h1><p class="sub">Single player and two players on one keyboard. Works offline.</p>
<div class="row">
<button class="g b" data-g="bistro"><div class="e">🥖</div><b>Le Petit Bistro</b><span>French: take orders at the tables, or cook in the kitchen.</span></button>
<button class="g o" data-g="officina"><div class="e">🏛️</div><b>Officina Scribarum</b><span>Latin CE Level 1: work the scribe's desk, or run the workshop.</span></button>
</div></main>
<script>
const GAMES={bistro:@@B@@,officina:@@O@@};
document.querySelectorAll("[data-g]").forEach(b=>b.onclick=()=>{const h=GAMES[b.dataset.g];document.open();document.write(h);document.close()});
</script></body></html>""".replace("@@B@@", enc(bistro)).replace("@@O@@", enc(officina))
out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(root, "games-solo.html")
open(out, "w").write(page)
print("Solo file:", out, len(page) // 1048576, "MB")
