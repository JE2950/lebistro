# Builds ../../index.html from src.html by inserting the order list from the audio manifest.
# Run from this folder: python3 build.py
import json, os, re

here = os.path.dirname(os.path.abspath(__file__))
man = json.load(open(os.path.join(here, "..", "audio", "manifest.json")))
orders = [{"id": l["id"], "v": l["voice"], "plat": l["plat"], "boisson": l["boisson"],
           "dessert": l["dessert"], "text": l["text"]} for l in man if l["kind"] == "order"]
src = open(os.path.join(here, "src.html")).read()
out = src.replace("/*ORDERS*/[]", json.dumps(orders, ensure_ascii=False).replace("<", "\\u003c"))
out = re.sub(r'\nif\(location\.hash==="#selftest"\)window\.__bistro=.*?;\n', "\n", out)  # drop the test hook
open(os.path.join(here, "..", "..", "index.html"), "w").write(out)
print(len(orders), "orders written to index.html")
