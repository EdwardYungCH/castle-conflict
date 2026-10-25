"""Eastern Realm art: map castle icons, castle skin, new unit sprites, HUD icons, fx."""
import os, sys, math, random
from PIL import Image
import numpy as np
sys.path.insert(0, os.path.dirname(__file__))
from pix import *
import art_north as N
from art_north import frames, BLUE, RED, O, team_colour, interior_mask, unit_icon
A = os.path.join(os.path.dirname(__file__), '..', 'assets')

# ---------------------------------------------------------------- castles
def east_castle(im):
    """Stone -> cream plaster with dark beams; blue/orange roofs -> dark tiles with a red ridge."""
    def fn(r, g, b, a):
        if (r, g, b) == O[:3]: return None
        h, s, v = hsv(r, g, b)
        if s < 0.28: return from_hsv(0.1, 0.18, min(1, 0.45 + v * 0.6), a)            # plaster
        if 0.5 < h < 0.7 and s > 0.3: return from_hsv(0.6, 0.25, 0.25 + v * 0.35, a)   # blue roofs -> slate tiles
        if h < 0.12 and s > 0.4 and v > 0.5: return from_hsv(0.0, 0.75, 0.35 + v * 0.4, a)  # orange roof -> lacquer red
        return None
    return recolor(im, fn)

def castle_skin():
    src = Image.open(os.path.join(A, 'spr_castles_alpha.png')).convert('RGBA')
    east_castle(src).save(os.path.join(A, 'spr_east_castles_alpha.png'))

def map_icons():
    src = Image.open(os.path.join(A, 'mapcastles_alpha.png')).convert('RGBA')
    out = src.copy(); px = out.load()
    for y in range(0, 240):          # castle rows: give every tower a dark tile roof by darkening top highlights
        for x in range(0, 320):
            r, g, b, a = px[x, y]
            if a and (r, g, b) != O[:3]:
                h, s, v = hsv(r, g, b)
                if v > 0.85 and s < 0.5: px[x, y] = from_hsv(h, s * 0.5, 0.35, a)
    out.save(os.path.join(A, 'east_mapcastles_alpha.png'))

# ---------------------------------------------------------------- units
BLACK1, BLACK2 = (58, 58, 72, 255), (40, 40, 52, 255)
REDL, REDD = (200, 48, 48, 255), (140, 30, 30, 255)
GOLD = (236, 190, 60, 255)
PINK1, PINK2 = (245, 170, 200, 255), (210, 110, 150, 255)
WHITE1, WHITE2 = (248, 246, 240, 255), (205, 200, 190, 255)

def ninja_frame(f):
    f = f.copy(); p = f.load(); W, H = f.size
    for y in range(H):
        for x in range(W):
            r, g, b, a = p[x, y]
            if not a or (r, g, b) == O[:3]: continue
            h, s, v = hsv(r, g, b)
            if s < 0.3: p[x, y] = BLACK1 if v > 0.5 else BLACK2      # grey hood/suit -> black
            elif 0.5 < h < 0.7: p[x, y] = BLACK1                      # blue trim -> black
    # red headband across the eyes row
    for x in range(W):
        if p[x, 5][3] and p[x, 5][:3] != O[:3]: p[x, 5] = REDL
    return f

def samurai_frame(f):
    f = f.copy(); p = f.load(); W, H = f.size
    for y in range(H):
        for x in range(W):
            r, g, b, a = p[x, y]
            if not a or (r, g, b) == O[:3]: continue
            h, s, v = hsv(r, g, b)
            if 0.5 < h < 0.7 and s > 0.3: p[x, y] = REDL if v > 0.6 else REDD    # blue tunic -> red armour
            elif s < 0.3 and y < 10: p[x, y] = BLACK1 if v > 0.5 else BLACK2     # helmet -> black lacquer
            elif 0.4 < h < 0.5: p[x, y] = GOLD                                   # plume -> gold crest
    return f

def dancer_frame(f):
    f = f.copy(); p = f.load(); W, H = f.size
    for y in range(H):
        for x in range(W):
            r, g, b, a = p[x, y]
            if not a or (r, g, b) == O[:3]: continue
            h, s, v = hsv(r, g, b)
            if s < 0.25 and y >= 11: p[x, y] = PINK1 if v > 0.7 else PINK2
            elif 0.5 < h < 0.7 and s > 0.3: p[x, y] = PINK2
    return f

FAN = from_rows(['..OOO..', '.OGGGO.', 'OGRGRGO', 'OGGGGGO', '.OGRGO.', '..OGO..', '...O...'], {'O': O, 'G': GOLD, 'R': REDL})
def dancer_with_fan(f):
    f = dancer_frame(f); f.alpha_composite(FAN, (f.width - 7, 14)); return f

def crane_caster_frame(f):
    f = f.copy(); p = f.load(); W, H = f.size
    for y in range(H):
        for x in range(W):
            r, g, b, a = p[x, y]
            if not a or (r, g, b) == O[:3]: continue
            h, s, v = hsv(r, g, b)
            if 0.5 < h < 0.7 and s > 0.3: p[x, y] = WHITE1 if v > 0.6 else WHITE2   # blue hat/robe -> white
            elif s < 0.3 and v > 0.5: p[x, y] = REDL                                 # grey beard/trim -> red sash
    return f

CRANE = [from_rows(['..W....', 'OWWWW..', '.WWWWWO', '..WW...'], {'O': O, 'W': WHITE1}),
         from_rows(['.......', 'OWWWW..', '.WWWWWO', '..W....'], {'O': O, 'W': WHITE1}),
         from_rows(['..W....', '.WWWW..', 'OWWWWWO', '.......'], {'O': O, 'W': WHITE1})]

WOOD1, WOOD2 = (150, 92, 50, 255), (92, 52, 30, 255)
def trebuchet_frame(f, k, team):
    """Battering ram crew carrying a trebuchet: A-frame on the log, arm angle changes with the walk frame."""
    f = f.copy(); p = f.load(); W, H = f.size; y0, y1 = 20, 27
    for y in range(y0 - 2, min(H, y1 + 2)):      # base beam over the log
        for x in range(4, W - 4): p[x, y] = WOOD1 if y < y1 else WOOD2
        p[4, y] = O; p[W - 5, y] = O
    cx = W // 2
    for i in range(10):                            # A-frame
        for dx in (-i, -i + 1, i, i + 1):
            X, Y = cx + dx, y0 - 2 - (9 - i)
            if 0 <= X < W and 0 <= Y < H: p[X, Y] = WOOD2 if i % 3 == 0 else WOOD1
    ang = [-0.9, -0.6, -0.9, -1.2][k % 4]          # arm
    for t in range(16):
        X = round(cx + math.cos(ang) * t); Y = round(y0 - 11 - math.sin(-ang) * t)
        if 0 <= X < W and 0 <= Y < H: p[X, Y] = WOOD1
    X = round(cx + math.cos(ang) * 16); Y = round(y0 - 11 - math.sin(-ang) * 16)   # sling stone
    for dx, dy in ((0, 0), (1, 0), (0, 1), (1, 1)):
        if 0 <= X + dx < W and 0 <= Y + dy < H: p[X + dx, Y + dy] = (120, 120, 130, 255)
    for dx in (-3, 3):                              # counterweight box at the pivot's back
        pass
    for x in range(cx - 4, cx - 1):
        for y in range(y0 - 8, y0 - 4): p[x, y] = team
    return outline(f)

def unit_sheet(src):
    team = team_colour(src)
    out = Image.new('RGBA', (256, 176), (0, 0, 0, 0))
    def row(fs, x, y):
        for i, fr in enumerate(fs): out.alpha_composite(fr, (x + i * fr.width, y))
    row([ninja_frame(f, i) for i, f in enumerate(frames(src, 0, 72, 16, 24, 4))], 0, 0)          # Ninja walk (0,0)
    row([ninja_frame(f, i) for i, f in enumerate(frames(src, 0, 96, 16, 24, 4))], 64, 0)         # Ninja carry (64,0)
    row([samurai_frame(f) for f in frames(src, 0, 192, 16, 32, 4)], 0, 24)      # Samurai walk (0,24)
    row([samurai_frame(f) for f in frames(src, 0, 224, 16, 32, 3)], 64, 24)     # Samurai attack (64,24)
    row([dancer_frame(f) for f in frames(src, 128, 128, 16, 40, 4)], 0, 56)     # Dancer walk (0,56)
    row([dancer_with_fan(f) for f in frames(src, 192, 128, 16, 40, 1)], 64, 56) # Dancer bless (64,56)
    row([dancer_frame(f) for f in frames(src, 208, 128, 16, 40, 4)], 80, 56)    # Dancer return (80,56)
    row([dancer_with_fan(f) for f in frames(src, 272, 128, 16, 40, 1)], 144, 56)# Dancer pray (144,56)
    row([crane_caster_frame(f) for f in frames(src, 128, 168, 16, 36, 4)], 0, 96)   # Caster walk (0,96)
    row([crane_caster_frame(f) for f in frames(src, 192, 168, 32, 36, 1)], 64, 96)  # Caster attack (64,96)
    row([crane_caster_frame(f) for f in frames(src, 224, 168, 16, 36, 4)], 96, 96)  # Caster return (96,96)
    row(CRANE, 160, 96)                                                           # Crane 3 frames 7x4 at (160,96)
    row([trebuchet_frame(f, k, team) for k, f in enumerate(frames(src, 0, 416, 48, 32, 4))], 0, 136)  # Trebuchet (0,136) 48x32 x4
    return out

def units():
    unit_sheet(BLUE).save(os.path.join(A, 'spr_east_blue_alpha.png'))
    unit_sheet(RED).save(os.path.join(A, 'spr_east_red_alpha.png'))

# ---------------------------------------------------------------- fx: bridge, fog icon, bridge icon, dojo
def bridge(w=72, h=12, broken=False):
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    for x in range(w):
        if broken and 26 < x < 46: continue
        rect(im, x, 3, x, h - 2, WOOD1 if (x // 4) % 2 else WOOD2)
    rect(im, 0, 2, w - 1, 2, (190, 130, 70, 255))
    for x in range(0, w, 12):
        if not (broken and 24 < x < 48): rect(im, x, 0, x + 1, h - 1, WOOD2)
    return outline(im)

def fog_icon():
    im = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
    for cx, cy, r in ((5, 9, 4), (9, 7, 5), (12, 10, 3)): disc(im, cx, cy, r, (225, 228, 235, 255))
    return outline(im)

def bridge_icon():
    im = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
    rect(im, 1, 8, 14, 10, WOOD1); rect(im, 1, 11, 14, 11, WOOD2)
    for x in (2, 7, 12): rect(im, x, 5, x, 12, WOOD2)
    return outline(im)

def dojo():
    im = Image.new('RGBA', (22, 16), (0, 0, 0, 0))
    for y in range(0, 6):
        for x in range(2 + (5 - y) * 2 - 4, 20 - (5 - y) * 2 + 4):
            if 0 <= x < 22: put(im, x, y, (70, 70, 90, 255) if y < 5 else REDL)
    rect(im, 3, 6, 18, 15, (235, 225, 200, 255)); rect(im, 3, 6, 18, 6, WOOD2)
    for x in (5, 10, 15): rect(im, x, 7, x, 15, WOOD2)
    rect(im, 9, 11, 12, 15, WOOD2)
    return outline(im)

def fx_sheet():
    out = Image.new('RGBA', (160, 48), (0, 0, 0, 0))
    out.alpha_composite(bridge(), (0, 0)); out.alpha_composite(bridge(broken=True), (0, 14))
    out.alpha_composite(fog_icon(), (80, 0)); out.alpha_composite(bridge_icon(), (96, 0)); out.alpha_composite(dojo(), (112, 0))
    out.save(os.path.join(A, 'spr_east_fx_alpha.png'))

def register_icons():
    import art_hud as H, art_upgrades as U
    def dj(h, sel, side):
        ic = U.icon_base(h, sel); ic.alpha_composite(dojo(), (22, 20)); return ic
    H.register((0, 1), dj)
    S = lambda side: Image.open(os.path.join(A, 'spr_east_blue_alpha.png' if side == 0 else 'spr_east_red_alpha.png')).convert('RGBA')
    from art_north import body_icon
    H.register((1, 1), lambda h, sel, side: body_icon(h, sel, S(side), (0, 0, 16, 24)))       # ninja
    H.register((2, 1), lambda h, sel, side: body_icon(h, sel, S(side), (0, 24, 16, 32)))      # samurai
    H.register((3, 1), lambda h, sel, side: body_icon(h, sel, S(side), (0, 136, 48, 32)))     # trebuchet
    H.register((4, 1), lambda h, sel, side: body_icon(h, sel, S(side), (64, 56, 16, 40)))     # dancer (with fan)
    H.register((5, 1), lambda h, sel, side: body_icon(h, sel, S(side), (0, 96, 16, 36)))      # crane caster

def build():
    castle_skin(); map_icons(); units(); fx_sheet()

if __name__ == '__main__':
    build(); print('east ok')

# ------------------------------------------------------------------ v3.1 redesign
from art_parts import *
def ninja_frame(f, k=0):
    """Thief body in black with a red scarf streaming behind and a blade across the back."""
    f = f.copy(); p = f.load(); W, H = f.size
    for y in range(H):
        for x in range(W):
            r, g, b, a = p[x, y]
            if not a or (r, g, b) == O[:3]: continue
            h, s, v = hsv(r, g, b)
            if s < 0.3: p[x, y] = BLACK1 if v > 0.5 else BLACK2
            elif 0.5 < h < 0.7: p[x, y] = BLACK1
    for x in range(W):
        if p[x, 5][3] and p[x, 5][:3] != O[:3]: p[x, 5] = REDL                 # headband
    wob = [0, 1, 0, -1][k % 4]
    for i in range(4): put(f, 2 - i if i < 3 else 0, 6 + (wob if i >= 2 else 0), REDL)   # scarf tail
    for i in range(3): put(f, 1 + i, 12 - i, (200, 205, 215, 255))              # blade on the back
    return f
def samurai_frame(f):
    f = f.copy(); p = f.load(); W, H = f.size
    for y in range(H):
        for x in range(W):
            r, g, b, a = p[x, y]
            if not a or (r, g, b) == O[:3]: continue
            h, s, v = hsv(r, g, b)
            if 0.5 < h < 0.7 and s > 0.3: p[x, y] = REDL if v > 0.6 else REDD
            elif s < 0.3 and y < 18: p[x, y] = REDD if v > 0.5 else (90, 20, 24, 255)   # helmet -> dark red lacquer
            elif 0.4 < h < 0.5: p[x, y] = (0, 0, 0, 0)                        # plume gone: a crest instead
    big = outline(from_rows(['#......#', '#......#', '.#....#.', '.#....#.', '..####..'], {'#': GOLD})); blit(f, big, 0, 0)   # kabuto crest
    for x in range(2, 9): put(f, x, 7, GOLD)                                  # gold brow band
    for y in (11, 12):                                                        # wide shoulder plates
        for x in (0, 10, 11):
            if 0 <= x < W: put(f, x, y, REDD if x else O)
    return f
HAIRB = (40, 34, 44, 255)
def dancer_frame(f):
    """Priest body without the hat: black hair with a bun and a gold pin, pink kimono."""
    f = f.copy(); p = f.load(); W, H = f.size
    fb = face_box(f)
    for y in range(H):
        for x in range(W):
            r, g, b, a = p[x, y]
            if not a or (r, g, b) == O[:3]: continue
            h, s, v = hsv(r, g, b)
            if s < 0.25 and y >= 11: p[x, y] = PINK1 if v > 0.7 else PINK2
            elif 0.5 < h < 0.7 and s > 0.3: p[x, y] = PINK2
    if fb:
        x0, x1, top, bot = fb
        clear_above(f, top - 1)
        hair = outline(from_rows(['.' + '#' * (x1 - x0 + 1) + '.', '#' * (x1 - x0 + 3)], {'#': HAIRB})); blit(f, hair, x0 - 1, top - 2)
        blit(f, bun(HAIRB), x0 - 3, top - 1); put(f, x0 - 2, top - 2, GOLD); put(f, x0 - 1, top - 3, GOLD)
        for y in range(top, bot + 1):                                          # hair down the back
            put(f, x0 - 1, y, HAIRB); put(f, x0 - 2, y, O)
        for y in range(top, top + 2):
            for x in range(x0, x1 + 1):
                if is_skin(p[x, y]) and x < x0 + 3: p[x, y] = HAIRB
    return f
def crane_caster_frame(f):
    """Wizard body in white with a red sash, the pointed hat replaced by a wide straw hat."""
    f = f.copy(); p = f.load(); W, H = f.size
    fb = face_box(f)
    for y in range(H):
        for x in range(W):
            r, g, b, a = p[x, y]
            if not a or (r, g, b) == O[:3]: continue
            h, s, v = hsv(r, g, b)
            if 0.5 < h < 0.7 and s > 0.3: p[x, y] = WHITE1 if v > 0.6 else WHITE2
            elif s < 0.3 and v > 0.5: p[x, y] = REDL
    if fb:
        x0, x1, top, bot = fb
        clear_above(f, top - 1, 0, W - 1)
        hat = straw_hat(min(W, x1 - x0 + 9)); blit(f, hat, max(0, x0 - 4), top - 5)
    return f

# ------------------------------------------------------------------ v3.2: canal, bamboo, five new units
JIN1, JIN2 = (72, 60, 70, 255), (48, 40, 50, 255)          # lacquered jingasa
SAFF1, SAFF2 = (236, 150, 50, 255), (190, 105, 30, 255)    # monk's saffron
LAMP, LAMP2 = (255, 232, 120, 255), (255, 160, 40, 255)
TEA = (74, 128, 60, 255)
def jingasa(w=12):
    rows = []
    for y in range(4):
        n = 2 + y * 3
        if n > w: n = w
        pad = (w - n) // 2
        rows.append('.' * pad + ('J' if y < 3 else 'G') * n + '.' * (w - n - pad))
    return outline(from_rows(rows, {'J': JIN1, 'G': GOLD}))

def ashigaru_frame(f):
    """Pikeman without plume or steel helmet: a conical jingasa over an open face, otherwise the team's foot soldier."""
    f = f.copy(); p = f.load(); W, H = f.size
    for y in range(H):
        for x in range(W):
            r, g, b, a = p[x, y]
            if not a or (r, g, b) == O[:3]: continue
            h, s, v = hsv(r, g, b)
            if 0.3 < h < 0.48 and s > 0.4: p[x, y] = (0, 0, 0, 0)           # green plume gone
    helm = [(x, y) for y in range(0, min(H, 36)) for x in range(W) if opaque(p[x, y]) and hsv(*p[x, y][:3])[1] < 0.3 and 0.3 < hsv(*p[x, y][:3])[2] < 0.8]
    if helm:
        x0 = min(x for x, _ in helm); x1 = max(x for x, _ in helm); hb = max(y for _, y in helm); ht = min(y for _, y in helm)
        for (x, y) in helm:
            if y >= hb - 3: p[x, y] = (236, 150, 80, 255) if (x, y) != (x1, y) else (195, 136, 70, 255)   # lower helmet -> face
            else: p[x, y] = (0, 0, 0, 0)
        for y in range(0, hb - 3):                                            # outline left over the helmet
            for x in range(max(0, x0 - 1), min(W, x1 + 2)):
                if p[x, y][:3] == O[:3]: p[x, y] = (0, 0, 0, 0)
        put(f, x0 - 1, hb - 3, O); put(f, x1 + 1, hb - 3, O)
        blit(f, jingasa(min(W, x1 - x0 + 7)), max(0, x0 - 3), hb - 7)
    return f

def yumi_frame(f, fire=True):
    """Archer under a wide straw hat; the arrow tips burn."""
    f = f.copy(); p = f.load(); W, H = f.size
    fb = face_box(f)
    if fb:
        x0, x1, top, bot = fb
        clear_above(f, top - 1, 0, W - 1)
        for y in range(top, top + 2):
            for x in range(W):
                if p[x, y][:3] in HAIR: p[x, y] = (236, 150, 80, 255)
        blit(f, straw_hat(min(W, x1 - x0 + 10)), max(0, x0 - 5), top - 5)
    if fire:
        for y in range(H):                                                  # white bow string / arrow pixels near the top right -> flame
            for x in range(W - 5, W):
                r, g, b, a = p[x, y]
                if a and (r, g, b) != O[:3] and hsv(r, g, b)[1] < 0.15 and hsv(r, g, b)[2] > 0.8 and y < 8: p[x, y] = LAMP2 if (x + y) % 2 else LAMP
    return f

def merchant_frame(f, carry=False):
    """Woodcutter in a straw hat; when returning he carries a green tea chest instead of a log."""
    f = f.copy(); p = f.load(); W, H = f.size
    fb = face_box(f)
    for y in range(H):
        for x in range(W):
            r, g, b, a = p[x, y]
            if not a or (r, g, b) == O[:3]: continue
            h, s, v = hsv(r, g, b)
            if carry and fb and 0.02 < h < 0.12 and s > 0.4 and 13 <= y <= 20 and (x < fb[0] - 1 or x > fb[1] + 1 or y > fb[3]): p[x, y] = TEA if v > 0.6 else shade(TEA, .7)   # log -> tea chest
    if fb:
        x0, x1, top, bot = fb
        clear_above(f, top - 1, 0, W - 1)
        blit(f, straw_hat(min(W, x1 - x0 + 9)), max(0, x0 - 4), top - 5)
    if carry:
        for x in range(W):                                                   # gold band around the chest
            if p[x, 16][:3] == TEA[:3]: p[x, 16] = GOLD
    return f

def lantern_frame(f):
    """Priest as a saffron monk: shaved head, orange robe, a paper lantern on a pole held in front."""
    f = f.copy(); p = f.load(); W, H = f.size
    fb = face_box(f)
    for y in range(H):
        for x in range(W):
            r, g, b, a = p[x, y]
            if not a or (r, g, b) == O[:3]: continue
            h, s, v = hsv(r, g, b)
            if s < 0.25 and y >= 10: p[x, y] = SAFF1 if v > 0.7 else SAFF2
            elif 0.5 < h < 0.7 and s > 0.3: p[x, y] = SAFF2
            elif (r, g, b) in HAIR: p[x, y] = (236, 150, 80, 255)
    if fb:
        x0, x1, top, bot = fb
        clear_above(f, top, 0, W - 1)
        for x in range(x0, x1 + 1): put(f, x, top - 1, O)
        put(f, x0 - 1, top, O); put(f, x1 + 1, top, O)
    lamp = outline(from_rows(['.LL.', 'LRRL', 'LRRL', '.LL.'], {'L': LAMP, 'R': LAMP2}))
    pole_x = W - 2
    for y in range(16, 30): put(f, pole_x, y, WOOD2)
    blit(f, lamp, W - 5, 13)
    return f

def sampan_frame(k, team):
    """32x16 flat boat: wooden hull, reed awning, two passengers in the team colour and a boatman with a pole."""
    im = Image.new('RGBA', (32, 16), (0, 0, 0, 0)); bob = k % 2
    for x in range(2, 30):                                                  # hull
        y0 = 9 + bob - (1 if x in (2, 29) else 0)
        rect(im, x, y0, x, 13 + bob, WOOD1 if (x // 3) % 2 else WOOD2)
    rect(im, 3, 9 + bob, 28, 9 + bob, (190, 130, 70, 255))
    rect(im, 10, 3 + bob, 21, 5 + bob, (206, 170, 80, 255)); rect(im, 11, 6 + bob, 20, 6 + bob, (150, 110, 50, 255))   # awning
    for x in (12, 18):                                                       # passengers under the awning
        rect(im, x, 7 + bob, x + 2, 8 + bob, team); put(im, x + 1, 6 + bob, (236, 150, 80, 255))
    rect(im, 25, 4 + bob, 26, 8 + bob, SAFF2); put(im, 25, 3 + bob, (236, 150, 80, 255)); put(im, 26, 3 + bob, (236, 150, 80, 255))   # boatman
    for y in range(2 + bob, 14 + bob): put(im, 28, y, WOOD2)                 # pole
    return outline(im)

def fire_arrow():
    im = Image.new('RGBA', (16, 8), (0, 0, 0, 0))
    rect(im, 2, 3, 12, 3, (230, 230, 240, 255)); rect(im, 2, 2, 3, 4, (240, 240, 250, 255))
    for x, y, c in ((12, 2, LAMP2), (13, 3, LAMP), (14, 3, LAMP2), (13, 4, LAMP2), (12, 4, LAMP), (15, 3, LAMP)): put(im, x, y, c)
    return im

def unit_sheet_v32(src, out):
    """Appends the v3.2 units to the Eastern unit sheet (rows from y=168)."""
    team = team_colour(src)
    big = Image.new('RGBA', (320, 268), (0, 0, 0, 0)); big.alpha_composite(out, (0, 0))
    def row(fs, x, y):
        for i, fr in enumerate(fs): big.alpha_composite(fr, (x + i * fr.width, y))
    row([ashigaru_frame(f) for f in frames(src, 64, 204, 16, 52, 4)], 0, 168)     # Ashigaru walk (0,168) 16x52 x4
    row([ashigaru_frame(f) for f in frames(src, 128, 224, 48, 32, 1)], 64, 168)   # Ashigaru defend (64,168) 48x32
    row([yumi_frame(f) for f in frames(src, 64, 72, 16, 24, 4)], 112, 168)        # Yumi walk (112,168) 16x24 x4
    row([yumi_frame(f) for f in frames(src, 64, 96, 16, 24, 3)], 176, 168)        # Yumi attack (176,168) x3
    row([sampan_frame(k, team) for k in range(2)], 224, 168)                       # Sampan (224,168) 32x16 x2
    big.alpha_composite(fire_arrow(), (288, 168))                                  # FireArrow (288,168) 16x8
    row([merchant_frame(f) for f in frames(src, 0, 0, 16, 24, 4)], 0, 220)         # Merchant walk (0,220)
    row([merchant_frame(f, True) for f in frames(src, 0, 48, 16, 24, 4)], 64, 220) # Merchant carry (64,220)
    row([lantern_frame(f) for f in frames(src, 128, 128, 16, 40, 4)], 128, 220)    # Lantern walk (128,220) 16x40 x4
    row([lantern_frame(f) for f in frames(src, 192, 128, 16, 40, 1)], 192, 220)    # bless (192,220)
    row([lantern_frame(f) for f in frames(src, 208, 128, 16, 40, 4)], 208, 220)    # return (208,220) x4
    row([lantern_frame(f) for f in frames(src, 272, 128, 16, 40, 1)], 272, 220)    # pray (272,220)
    return big

def units():
    unit_sheet_v32(BLUE, unit_sheet(BLUE)).save(os.path.join(A, 'spr_east_blue_alpha.png'))
    unit_sheet_v32(RED, unit_sheet(RED)).save(os.path.join(A, 'spr_east_red_alpha.png'))

def canal_icon():
    im = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
    rect(im, 1, 9, 14, 13, (70, 130, 200, 255))
    for x in (2, 6, 10): rect(im, x, 10, x + 2, 10, (150, 200, 240, 255))
    rect(im, 4, 6, 11, 8, WOOD1); rect(im, 5, 4, 10, 5, (206, 170, 80, 255))
    return outline(im)

def bamboo_icon():
    im = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
    for x in (4, 9):
        rect(im, x, 1, x + 1, 14, (120, 190, 80, 255))
        for y in (4, 8, 12): rect(im, x, y, x + 1, y, (70, 130, 50, 255))
        put(im, x + 2, 3, (90, 170, 70, 255)); put(im, x + 3, 2, (90, 170, 70, 255)); put(im, x - 1, 7, (90, 170, 70, 255))
    return outline(im)

def fx_sheet():
    out = Image.new('RGBA', (160, 48), (0, 0, 0, 0))
    out.alpha_composite(bridge(), (0, 0)); out.alpha_composite(bridge(broken=True), (0, 14))
    out.alpha_composite(fog_icon(), (80, 0)); out.alpha_composite(bridge_icon(), (96, 0)); out.alpha_composite(dojo(), (112, 0))
    out.alpha_composite(canal_icon(), (136, 0)); out.alpha_composite(bamboo_icon(), (80, 16))
    out.save(os.path.join(A, 'spr_east_fx_alpha.png'))

_register_icons_v31 = register_icons
def register_icons():
    _register_icons_v31()
    import art_hud as H
    from art_north import body_icon
    S = lambda side: Image.open(os.path.join(A, 'spr_east_blue_alpha.png' if side == 0 else 'spr_east_red_alpha.png')).convert('RGBA')
    H.register((8, 2), lambda h, sel, side: body_icon(h, sel, S(side), (0, 168, 16, 52)))     # ashigaru
    H.register((9, 2), lambda h, sel, side: body_icon(h, sel, S(side), (176, 168, 16, 24)))   # yumi (attack pose)
    H.register((0, 3), lambda h, sel, side: body_icon(h, sel, S(side), (64, 220, 16, 24)))    # merchant with chest
    H.register((1, 3), lambda h, sel, side: body_icon(h, sel, S(side), (192, 220, 16, 40)))   # lantern bearer
    H.register((2, 3), lambda h, sel, side: body_icon(h, sel, S(side), (224, 168, 32, 16)))   # sampan
