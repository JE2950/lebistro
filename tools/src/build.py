# Builds the game page from src.html by inserting the order list from the audio manifest.
#   python3 build.py                 -> ../../index.html  (standalone / Claude version)
#   python3 build.py ludus OUT.html  -> a page for the Ludus site's bistro/ folder
import json, os, re, sys

here = os.path.dirname(os.path.abspath(__file__))
man = json.load(open(os.path.join(here, "..", "audio", "manifest.json")))
orders = [{"id": l["id"], "v": l["voice"], "plat": l["plat"], "boisson": l["boisson"],
           "dessert": l["dessert"], "text": l["text"]} for l in man if l["kind"] == "order"]
src = open(os.path.join(here, "src.html")).read().replace("/*CLASSMODE*/", open(os.path.join(here, "classmode.js")).read())
out = src.replace("/*ORDERS*/[]", json.dumps(orders, ensure_ascii=False).replace("<", "\\u003c"))
if not os.environ.get("BISTRO_TEST"):
    out = re.sub(r'\nif\(location\.hash==="#selftest".*?window\.__bistro=.*?;\n', "\n", out)  # drop the test hook (kept when BISTRO_TEST is set)

target = sys.argv[1] if len(sys.argv) > 1 else "claude"
if target == "ludus":
    head = """<script>window.BISTRO={target:"ludus",audio:"audio/",music:{menu:"../assets/music/french-lobby.mp3",game:"../assets/music/french.mp3"}}</script>
<script src="../assets/vendor/supabase-js-2.117.3.js"></script>
<script src="../assets/config.js"></script>
<script src="../assets/vendor/qrcode-generator-1.4.4.js"></script>
<script src="../assets/common.js"></script>
<link rel="icon" href="../assets/favicon.svg" type="image/svg+xml">
<title>Le Petit Bistro · Ludus</title>
"""
    out = out.replace("<title>Le Petit Bistro</title>\n", head, 1)
    dest = sys.argv[2]
else:
    dest = os.path.join(here, "..", "..", "index.html")
open(dest, "w").write(out)
print(len(orders), "orders written to", dest)
