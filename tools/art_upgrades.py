"""Temple (obelisk) and Solar (sun disk) castle attachments + their HUD icons.
Writes assets/spr_upgrades_alpha.png and patches the four HUD sheets (rows y>=384)."""
import os, sys, math
from PIL import Image
sys.path.insert(0, os.path.dirname(__file__))
from pix import *
A = os.path.join(os.path.dirname(__file__), '..', 'assets')

LIGHT, MID, DARK = rgba('#f4dc94'), rgba('#d8ae5c'), rgba('#a2733a')
GOLD1, GOLD2, GOLD3 = rgba('#fff3a0'), rgba('#ffd23c'), rgba('#d79a14')
GLYPH = rgba('#8a5a2c')

def obelisk(h=44, wb=10, wt=6):
    im = Image.new('RGBA', (wb + 6, h + 4), (0, 0, 0, 0)); cx = (wb + 6) / 2
    cap = 5; body_top = cap + 1
    for y in range(body_top, h):
        w = wt + (wb - wt) * (y - body_top) / (h - body_top); x0 = round(cx - w / 2); x1 = round(cx + w / 2) - 1
        for x in range(x0, x1 + 1):
            c = LIGHT if x < x0 + max(2, (x1 - x0) // 3) else MID if x < x1 - 1 else DARK
            put(im, x, y, c)
    # pyramidion (gold cap)
    for y in range(1, body_top):
        half = (y) * (wt / 2) / (body_top - 1)
        for x in range(round(cx - half), round(cx + half)):
            put(im, x, y, GOLD1 if x < cx - 0.5 else GOLD2 if x < cx + half - 1 else GOLD3)
    # hieroglyphs
    for y in range(body_top + 4, h - 4, 4):
        put(im, int(cx) - 1, y, GLYPH); put(im, int(cx), y + 1, GLYPH)
    # plinth
    rect(im, 1, h, wb + 4, h + 2, MID); rect(im, 1, h, wb + 4, h, LIGHT); rect(im, wb + 3, h, wb + 4, h + 2, DARK)
    return outline(im)

def sun(frame, size=32, r=7):
    im = Image.new('RGBA', (size, size), (0, 0, 0, 0)); c = size / 2 - .5
    disc(im, c, c, r, GOLD3); disc(im, c - .5, c - .5, r - 1, GOLD2); disc(im, c - 2, c - 2, r - 4, GOLD1)
    outline(im)
    n = 12; rot = frame * (math.pi / n / 2)
    for k in range(n):
        a = rot + k * 2 * math.pi / n; L = r + (5 if k % 2 == 0 else 3) - (frame % 2 if k % 2 else 0)
        for t in range(r + 2, int(L) + 2):
            put(im, round(c + math.cos(a) * t), round(c + math.sin(a) * t), GOLD2 if t < L else GOLD3)
    return im

def build_sheet():
    sheet = Image.new('RGBA', (160, 48), (0, 0, 0, 0))
    sheet.alpha_composite(obelisk(), (0, 0))
    for f in range(4): sheet.alpha_composite(sun(f), (16 + 32 * f, 0))
    sheet.save(os.path.join(A, 'spr_upgrades_alpha.png'))
    return sheet

# ---- HUD icons ----
def icon_base(hud, selected):
    """Castle wall (from Docks) + grass (from Tower) on the empty frame."""
    oy = 96 if selected else 0
    base = hud.crop((432, 240 + oy, 480, 288 + oy)).copy()
    dock = hud.crop((432, 48 + oy, 480, 96 + oy)); tower = hud.crop((432, 0 + oy, 480, 48 + oy))
    base.alpha_composite(dock.crop((0, 0, 23, 48)), (0, 0))
    base.alpha_composite(tower.crop((22, 34, 44, 44)), (22, 34))
    return base

def small_obelisk():
    return obelisk(h=22, wb=6, wt=4)

def icon_symbol(kind):
    if kind == 'temple': return small_obelisk(), (29, 36 - 25)
    if kind == 'solar':
        s = sun(0, size=22, r=5); return s, (24, 6)
    raise ValueError(kind)

def make_icon(hud, selected, kind, extra=None):
    ic = icon_base(hud, selected)
    if kind in ('temple', 'solar'):
        s, pos = icon_symbol(kind); ic.alpha_composite(s, pos)
    if extra: extra(ic, selected)
    return ic

if __name__ == '__main__':
    build_sheet(); print('ok')
