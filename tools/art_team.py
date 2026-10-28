"""Team colours for the expansion units (v3.6). Every expansion unit must show the side's colour - blue
for the player, red for the enemy - like the original units do.
1. On the blue sheets, each realm's accent colours (robes, coats, armour...) are mapped onto the blue team ramp.
2. The red sheets are rebuilt from the blue ones: same design, team ramp swapped to red, and each frame
   mirrored when the enemy's original frame faces the other way (the game draws enemies facing left)."""
import os, re, sys
from PIL import Image, ImageOps
sys.path.insert(0, os.path.dirname(__file__))
A = os.path.join(os.path.dirname(__file__), '..', 'assets')
SRC = os.path.join(os.path.dirname(__file__), '..', 'src', 'expansion.js')
BLUE = [(88, 218, 255), (88, 164, 255), (62, 118, 164), (47, 91, 133)]   # highlight, light, mid, dark
RED = [(255, 150, 123), (217, 122, 84), (195, 102, 70), (164, 88, 62)]
L, M, D = 1, 2, 3
ACCENTS = {
 'north': {(60, 140, 230): L,                                        # berserker war paint
           (96, 104, 136): M, (62, 68, 96): D,                       # rune priest robe
           (80, 110, 150): L, (60, 85, 120): M,                      # ice fisher coat
           (210, 200, 180): L, (150, 135, 110): M,                   # huntress leathers
           (120, 85, 50): L, (85, 60, 35): M,                        # trapper coat
           (60, 80, 130): L, (40, 55, 95): M},                       # skald cloak
 'east': {(200, 48, 48): L, (140, 30, 30): M, (90, 20, 24): D,       # samurai armour, ninja scarf, crane sash
          (245, 170, 200): L, (210, 110, 150): M,                    # dancer kimono
          (205, 200, 190): L,                                        # crane caster robe shading
          (236, 150, 50): L, (190, 105, 30): M},                     # lantern bearer robe
 'under': {(70, 100, 160): L, (46, 68, 120): M,                      # miner overalls
           (230, 120, 140): L,                                       # burrower collar
           (70, 50, 34): M,                                          # dwarf trousers (engineer, crossbow, mole rider)
           (150, 170, 140): L, (90, 110, 90): M},                    # cave shaman robe
 'sky': {(150, 200, 240): L, (90, 140, 210): M,                      # bridger shirt, lancer, shepherd
         (220, 205, 160): L}}                                        # harpist gown

def frame_rects(realm):
    src = open(SRC).read()
    fn = {'north': 'unitEntries', 'east': 'eastEntries', 'under': 'underEntries', 'sky': 'skyEntries'}[realm]
    a = src.index('function %s(' % fn); b = src.index('for(const v of Object.values(e))', a)
    rects = set()
    for m in re.finditer(r"anim\('\w+',(\d+),(\d+),(\d+),(\d+)(?:,(\d+))?", src[a:b]):
        x, y, w, h = map(int, m.groups()[:4]); n = int(m.group(5) or 1)
        for i in range(n): rects.add((x + i * w, y, w, h))
    return sorted(rects)

def faces_left(a, b):
    m = ImageOps.mirror(a); W, H = a.size
    same = sum(1 for x in range(W) for y in range(H) if (a.getpixel((x, y))[3] > 0) == (b.getpixel((x, y))[3] > 0))
    mir = sum(1 for x in range(W) for y in range(H) if (m.getpixel((x, y))[3] > 0) == (b.getpixel((x, y))[3] > 0))
    return mir > same

def remap(im, mp):
    px = im.load(); W, H = im.size
    for y in range(H):
        for x in range(W):
            c = px[x, y]
            if c[3] and c[:3] in mp: px[x, y] = mp[c[:3]] + (c[3],)

def apply():
    for realm, acc in ACCENTS.items():
        bp = os.path.join(A, 'spr_%s_blue_alpha.png' % realm); rp = os.path.join(A, 'spr_%s_red_alpha.png' % realm)
        blue = Image.open(bp).convert('RGBA'); red_old = Image.open(rp).convert('RGBA')
        remap(blue, {c: BLUE[i] for c, i in acc.items()})
        blue.save(bp)
        red = Image.new('RGBA', blue.size, (0, 0, 0, 0))
        to_red = dict(zip(BLUE, RED)); to_red.update({(12, 178, 134): (216, 16, 16), (20, 255, 192): (255, 128, 20)})   # plumes too, like the original enemies
        done = set()
        for (x, y, w, h) in frame_rects(realm):
            if (x, y, w, h) in done: continue
            done.add((x, y, w, h))
            fb = blue.crop((x, y, x + w, y + h)); fr = red_old.crop((x, y, x + w, y + h))
            out = ImageOps.mirror(fb) if faces_left(fb, fr) else fb.copy()
            remap(out, to_red); red.paste(out, (x, y))
        red.save(rp)
    print('team colours ok')

if __name__ == '__main__': apply()
