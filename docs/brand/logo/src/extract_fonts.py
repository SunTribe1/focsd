"""Outline 'focsd' from an OFL font into JSON (needs fontTools + brotli, run from a venv).

Usage: python extract_fonts.py glyphs.json '{"800": ["/path/atkinson-next.woff2", 800]}'
"""
import json
import sys

from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont


def outline(path: str, weight: int) -> dict:
    font = TTFont(path)
    if "fvar" in font:
        font = instantiateVariableFont(font, {"wght": weight})
    cmap, gs = font.getBestCmap(), font.getGlyphSet()
    glyphs = {}
    for ch in "focsd":
        name = cmap[ord(ch)]
        pen, bp = SVGPathPen(gs), BoundsPen(gs)
        gs[name].draw(TransformPen(pen, (1, 0, 0, -1, 0, 0)))  # font units are y-up
        gs[name].draw(bp)
        glyphs[ch] = {"d": pen.getCommands(), "adv": gs[name].width, "bounds": bp.bounds}
    return {"upm": font["head"].unitsPerEm, "glyphs": glyphs}


def main() -> None:
    out_path, spec = sys.argv[1], json.loads(sys.argv[2])
    out = {label: outline(p, w) for label, (p, w) in spec.items()}
    with open(out_path, "w") as fh:
        json.dump(out, fh)
    print("extracted:", ", ".join(out))


if __name__ == "__main__":
    main()
