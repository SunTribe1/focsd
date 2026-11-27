"""Focsd logo kit: Foc symbol + Atkinson Hyperlegible Next 800 wordmark.

Standard library only. Reads glyphs.json (from extract_fonts.py).
Run: python3 src/kit.py  -> writes ../svg/
"""
import json
import os
from dataclasses import dataclass

SRC = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(SRC)
SVG_DIR = os.path.join(ROOT, "svg")
GLYPHS = json.load(open(os.path.join(SRC, "glyphs.json")))["800"]["glyphs"]

TITLE = "Focsd"
BASELINE, F_TOP = 212, 24
SCALE = (BASELINE - F_TOP) / GLYPHS["f"]["bounds"][3]
TRACK = -6           # font units
LOCKUP_GAP = 40      # symbol to wordmark, horizontal
STACK_GAP = 40       # symbol to wordmark, stacked
STACK_WORD_SCALE = 0.72  # stacked wordmark relative to the horizontal one
GLOW_BLUR = 9


@dataclass(frozen=True)
class Mode:
    name: str
    ink: str
    bg: str
    glow: str
    glow_opacity: float


LIGHT = Mode("light", "#141A18", "#FFFFFF", "#141A18", 0.28)
DARK = Mode("dark", "#F4F4F2", "#111113", "#FFFFFF", 0.45)


# ---------- geometry ----------

def rrect(x: float, y: float, w: float, h: float, r: float) -> str:
    return (f"M{x + r} {y}H{x + w - r}A{r} {r} 0 0 1 {x + w} {y + r}V{y + h - r}"
            f"A{r} {r} 0 0 1 {x + w - r} {y + h}H{x + r}A{r} {r} 0 0 1 {x} {y + h - r}"
            f"V{y + r}A{r} {r} 0 0 1 {x + r} {y}Z")


@dataclass(frozen=True)
class FocGeometry:
    ring_inset: float   # outer edge of the ring from the canvas edge
    ring_radius: float
    ring_weight: float
    tile_inset: float
    tile_radius: float
    eye_w: float
    eye_h: float
    eye_gap: float
    eye_cx: float       # centre of the pair of eyes
    eye_cy: float


MASTER = FocGeometry(8, 64, 18, 38, 40, 28, 56, 20, 142, 110)
SMALL = FocGeometry(0, 64, 32, 48, 32, 32, 64, 16, 136, 112)  # snapped to a 16 px grid


def ring_path(g: FocGeometry) -> str:
    size = 256 - 2 * g.ring_inset
    inner = size - 2 * g.ring_weight
    return (rrect(g.ring_inset, g.ring_inset, size, size, g.ring_radius)
            + rrect(g.ring_inset + g.ring_weight, g.ring_inset + g.ring_weight, inner, inner,
                    g.ring_radius - g.ring_weight))


def tile_path(g: FocGeometry) -> str:
    """Tile with the eyes as real holes (evenodd), so the mark is one colour."""
    size = 256 - 2 * g.tile_inset
    left = g.eye_cx - g.eye_gap / 2 - g.eye_w
    right = g.eye_cx + g.eye_gap / 2
    top = g.eye_cy - g.eye_h / 2
    r = g.eye_w / 2
    return (rrect(g.tile_inset, g.tile_inset, size, size, g.tile_radius)
            + rrect(left, top, g.eye_w, g.eye_h, r) + rrect(right, top, g.eye_w, g.eye_h, r))


def symbol(color: str, g: FocGeometry = MASTER) -> str:
    return f'<path d="{ring_path(g)}{tile_path(g)}" fill="{color}" fill-rule="evenodd"/>'


def glow(mode: Mode, uid: str, g: FocGeometry = MASTER) -> str:
    """Soft halo behind the ring, for screen use only (uses an SVG filter)."""
    return (f'<defs><filter id="{uid}" x="-30%" y="-30%" width="160%" height="160%">'
            f'<feGaussianBlur stdDeviation="{GLOW_BLUR}"/></filter></defs>'
            f'<path d="{ring_path(g)}" fill="{mode.glow}" fill-rule="evenodd" '
            f'opacity="{mode.glow_opacity}" filter="url(#{uid})"/>')


def wordmark(color: str) -> tuple[str, float]:
    x = -GLYPHS["f"]["bounds"][0] * SCALE
    parts = []
    for ch in "focsd":
        g = GLYPHS[ch]
        parts.append(f'<path transform="translate({x:.2f} {BASELINE}) scale({SCALE:.5f})" '
                     f'd="{g["d"]}" fill="{color}"/>')
        x += (g["adv"] + TRACK) * SCALE
    right = x - (GLYPHS["d"]["adv"] - GLYPHS["d"]["bounds"][2] + TRACK) * SCALE
    return "".join(parts), right


# ---------- documents ----------

def doc(x: float, y: float, w: float, h: float, body: str, bg: str | None = None) -> str:
    back = f'<rect x="{x:.0f}" y="{y:.0f}" width="{w:.0f}" height="{h:.0f}" fill="{bg}"/>' if bg else ""
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{x:.0f} {y:.0f} {w:.0f} {h:.0f}">'
            f"<title>{TITLE}</title>{back}{body}</svg>\n")


def pad_box(w: float, h: float, pad: float) -> tuple[float, float, float, float]:
    return -pad, -pad, w + 2 * pad, h + 2 * pad


def horizontal(color: str, extra: str = "") -> tuple[str, float]:
    word, ww = wordmark(color)
    body = extra + symbol(color) + f'<g transform="translate({256 + LOCKUP_GAP} 0)">{word}</g>'
    return body, 256 + LOCKUP_GAP + ww


def stacked(color: str, extra: str = "") -> tuple[str, float, float]:
    word, ww = wordmark(color)
    k = STACK_WORD_SCALE
    width = max(ww * k, 256)
    sym_x = (width - 256) / 2
    word_y = 256 + STACK_GAP - F_TOP * k
    body = (f'<g transform="translate({sym_x:.2f} 0)">{extra}{symbol(color)}</g>'
            f'<g transform="translate({(width - ww * k) / 2:.2f} {word_y:.2f}) scale({k})">'
            f'{word}</g>')
    return body, width, word_y + BASELINE * k


def build() -> dict[str, str]:
    f: dict[str, str] = {}
    pad = 40
    # transparent, one colour masters
    for label, color in (("ink", LIGHT.ink), ("offwhite", DARK.ink),
                         ("black", "#000000"), ("white", "#FFFFFF")):
        f[f"focsd-symbol-{label}.svg"] = doc(0, 0, 256, 256, symbol(color))
        f[f"focsd-symbol-small-{label}.svg"] = doc(0, 0, 256, 256, symbol(color, SMALL))
        body, w = horizontal(color)
        f[f"focsd-horizontal-{label}.svg"] = doc(0, 0, w, 256, body)
        body, w, h = stacked(color)
        f[f"focsd-stacked-{label}.svg"] = doc(0, 0, w, h, body)
        word, ww = wordmark(color)
        f[f"focsd-wordmark-{label}.svg"] = doc(0, 0, ww, 256, word)
    # light / dark on background, flat and with glow
    for m in (LIGHT, DARK):
        for style in ("flat", "glow"):
            extra = glow(m, f"glow-{m.name}") if style == "glow" else ""
            sfx = f"{m.name}" + ("-glow" if style == "glow" else "")
            f[f"focsd-symbol-{sfx}.svg"] = doc(*pad_box(256, 256, pad), extra + symbol(m.ink), m.bg)
            body, w = horizontal(m.ink, extra)
            f[f"focsd-horizontal-{sfx}.svg"] = doc(*pad_box(w, 256, pad), body, m.bg)
            body, w, h = stacked(m.ink, extra)
            f[f"focsd-stacked-{sfx}.svg"] = doc(*pad_box(w, h, pad), body, m.bg)
    return f


def main() -> None:
    os.makedirs(SVG_DIR, exist_ok=True)
    files = build()
    for name, text in files.items():
        with open(os.path.join(SVG_DIR, name), "w") as fh:
            fh.write(text)
    print(f"wrote {len(files)} SVGs to {SVG_DIR}")


if __name__ == "__main__":
    main()
