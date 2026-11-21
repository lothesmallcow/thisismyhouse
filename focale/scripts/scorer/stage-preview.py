# Builds preview-analisi/: the scorer page as its own claude.ai preview (run after scripts/export-artifact.mjs).
import os, re, shutil
SRC = "/home/user/thisismyhouse/focale/preview"
OUT = "/home/user/thisismyhouse/focale/preview-analisi"
MAIN = "https://claude.ai/artifact/NPUy1xxdTwMoJyQrurdteB"
shutil.rmtree(OUT, ignore_errors=True); os.makedirs(OUT)
need = set()
def grab(text):
    for m in re.findall(r'(?:src|href)="(?:\.\./)+((?:assets|fonts)/[^"#?]+)"', text): need.add(m)
    for m in re.findall(r'url\((?:["\']?)(?:\.\./)+((?:assets|fonts)/[^)"\'?#]+)', text): need.add(m)
    for m in re.findall(r'srcset="([^"]+)"', text):
        for part in m.split(","):
            u = part.strip().split(" ")[0]
            u = re.sub(r'^(\.\./)+', '', u)
            if u.startswith(("assets/", "fonts/")): need.add(u)
def fix_links(html, up):
    # pages of the main site point to the main preview; our two pages stay local
    html = html.replace(f'{up}analisi-sito/esempio-fitness/index.html', 'esempio-fitness/index.html' if up == '../' else 'index.html')
    html = html.replace(f'{up}analisi-sito/index.html', 'index.html' if up == '../' else '../index.html')
    html = re.sub(r'href="' + re.escape(up) + r'(?!assets/|fonts/)[^"]*\.html"', f'href="{MAIN}"', html)
    return html
page = open(f"{SRC}/analisi-sito/index.html").read(); grab(page)
page = fix_links(page, "../").replace('"../', '"').replace("(../", "(").replace("'../", "'")
real = "/home/user/thisismyhouse/focale/prospects/real-preview-public.json"
if os.path.exists(real):
    data = open(real).read().replace("</", "<\\/")
    page = page.replace("</body>", f'<script type="application/json" id="sc-real">{data}</script></body>')
open(f"{OUT}/index.html", "w").write(page)
os.makedirs(f"{OUT}/esempio-fitness")
demo = open(f"{SRC}/analisi-sito/esempio-fitness/index.html").read(); grab(demo)
demo = fix_links(demo, "../../").replace('"../../', '"../').replace("(../../", "(../").replace("'../../", "'../")
open(f"{OUT}/esempio-fitness/index.html", "w").write(demo)
# JS chunks import other chunks by relative name
seen = set()
while True:
    new = {n for n in need if n not in seen}
    if not new: break
    for n in new:
        seen.add(n)
        if n.endswith(".js") and os.path.exists(f"{SRC}/{n}"):
            for dep in re.findall(r'["\']\./([\w.\-]+\.js)["\']', open(f"{SRC}/{n}").read()): need.add("assets/" + dep)
for n in sorted(need):
    if os.path.exists(f"{SRC}/{n}"):
        os.makedirs(os.path.dirname(f"{OUT}/{n}"), exist_ok=True); shutil.copy(f"{SRC}/{n}", f"{OUT}/{n}")
    else: print("missing", n)
import glob
for js in glob.glob(f"{SRC}/assets/*.js"): shutil.copy(js, f"{OUT}/assets/")
for f in ["favicon.svg", "favicon-32.png"]: shutil.copy(f"{SRC}/{f}", f"{OUT}/{f}")
print(sorted(need))
