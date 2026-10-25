"""v3.6 unit skins: every unit sheet gets a variant per expansion realm (team colours and armour remapped,
skin, hair, wood and gold untouched), so the army changes look together with the castle skin."""
import os, sys
from PIL import Image
sys.path.insert(0, os.path.dirname(__file__))
A = os.path.join(os.path.dirname(__file__), '..', 'assets')
BLUE_SET = [(88, 218, 255), (88, 164, 255), (62, 118, 164), (47, 91, 133)]                       # highlight, light, mid, dark
RED_SET = [(255, 150, 123), (217, 122, 84), (195, 102, 70), (164, 88, 62), (133, 75, 55)]      # highlight, light, mid, dark, darker
ARMOUR = [(188, 188, 188), (172, 172, 180), (144, 136, 160), (128, 128, 128), (108, 103, 132), (88, 88, 88)]
REALMS = {
 'north': {'blue': [(200, 240, 255), (150, 200, 240), (90, 140, 190), (60, 95, 140)],
           'red': [(255, 170, 150), (200, 70, 60), (170, 55, 50), (120, 40, 40), (90, 30, 30)],
           'armour': [(210, 220, 235), (185, 195, 215), (150, 160, 190), (130, 140, 165), (100, 110, 140), (75, 85, 110)]},
 'east': {'blue': [(140, 170, 255), (60, 80, 200), (40, 55, 150), (30, 40, 110)],
          'red': [(255, 120, 120), (220, 40, 40), (185, 30, 35), (140, 20, 30), (100, 15, 25)],
          'armour': [(110, 100, 110), (90, 80, 95), (70, 62, 78), (60, 56, 66), (48, 44, 56), (35, 32, 42)]},
 'under': {'blue': [(120, 230, 230), (60, 170, 180), (40, 120, 135), (30, 85, 100)],
           'red': [(255, 200, 120), (255, 120, 30), (220, 85, 20), (170, 60, 15), (120, 45, 15)],
           'armour': [(150, 150, 165), (130, 130, 145), (100, 100, 118), (85, 85, 100), (65, 65, 80), (45, 45, 58)]},
 'sky': {'blue': [(230, 250, 255), (130, 210, 255), (90, 160, 230), (60, 120, 190)],
         'red': [(255, 230, 150), (240, 180, 70), (215, 145, 45), (170, 110, 35), (130, 85, 30)],
         'armour': [(250, 250, 255), (235, 235, 245), (210, 210, 225), (190, 190, 205), (160, 160, 180), (130, 130, 150)]}}

def palette_map(realm):
    P = REALMS[realm]; m = {}
    for a, b in zip(BLUE_SET, P['blue']): m[a] = b
    for a, b in zip(RED_SET, P['red']): m[a] = b
    for a, b in zip(ARMOUR, P['armour']): m[a] = b
    return m

def apply(im, m):
    out = im.copy(); px = out.load(); W, H = out.size
    for y in range(H):
        for x in range(W):
            p = px[x, y]
            if p[3] and p[:3] in m: px[x, y] = m[p[:3]] + (p[3],)
    return out

SHEETS = ['spr_blue_alpha.png', 'spr_red_alpha.png', 'spr_north_blue_alpha.png', 'spr_north_red_alpha.png', 'spr_east_blue_alpha.png', 'spr_east_red_alpha.png',
          'spr_under_blue_alpha.png', 'spr_under_red_alpha.png', 'spr_sky_blue_alpha.png', 'spr_sky_red_alpha.png']
def out_name(sheet, realm):
    if sheet.startswith('spr_blue') or sheet.startswith('spr_red'): return sheet.replace('spr_', 'spr_skin_%s_' % realm)
    return sheet.replace('_alpha.png', '_%s_alpha.png' % realm)

def build():
    n = 0
    for realm in REALMS:
        m = palette_map(realm)
        for sheet in SHEETS:
            if sheet.startswith('spr_%s_' % realm): continue          # a realm's own units already wear its colours
            im = Image.open(os.path.join(A, sheet)).convert('RGBA')
            apply(im, m).save(os.path.join(A, out_name(sheet, realm))); n += 1
    # HUD button sheets too (the tablet frame shares one grey with the armour set, which stays as it is)
    for realm in REALMS:
        m = palette_map(realm); m.pop((172, 172, 180), None)
        for sheet, out in (('sprites_hud_alpha.png', 'sprites_hud_%s_alpha.png'), ('sprites_redhud_big_alpha.png', 'sprites_redhud_%s_alpha.png')):
            apply(Image.open(os.path.join(A, sheet)).convert('RGBA'), m).save(os.path.join(A, out % realm)); n += 1
    print('skins ok', n)

if __name__ == '__main__': build()
