# Prints JSON {path, advance, bbox} for a string set in a TTF at a given size (used by logo.mjs).
import sys, json
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen
font_path, text, size, x0, baseline, tracking = sys.argv[1], sys.argv[2], float(sys.argv[3]), float(sys.argv[4]), float(sys.argv[5]), float(sys.argv[6])
f = TTFont(font_path); gs = f.getGlyphSet(); cmap = f.getBestCmap(); upm = f["head"].unitsPerEm; s = size / upm
x = x0; paths = []; xmin = ymin = 1e9; xmax = ymax = -1e9
for ch in text:
    name = cmap[ord(ch)]; g = gs[name]
    t = (s, 0, 0, -s, x, baseline)
    sp = SVGPathPen(gs, lambda v: f"{v:.2f}"); g.draw(TransformPen(sp, t)); paths.append(sp.getCommands())
    bp = BoundsPen(gs); g.draw(TransformPen(bp, t))
    if bp.bounds:
        a, b, c, d = bp.bounds; xmin = min(xmin, a); ymin = min(ymin, b); xmax = max(xmax, c); ymax = max(ymax, d)
    x += g.width * s + tracking
print(json.dumps({"d": "".join(paths), "x": x, "box": {"x1": xmin, "y1": ymin, "x2": xmax, "y2": ymax}}))
