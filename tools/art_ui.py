"""UI extras: a normal-brightness blank stone tablet at (864,0) in sprites_buttons_alpha.png
(the sheet only has the pressed one at (288,432)); used for new text buttons."""
import os
from PIL import Image
A = os.path.join(os.path.dirname(__file__), '..', 'assets')
def build():
    p = os.path.join(A, 'sprites_buttons_alpha.png'); im = Image.open(p).convert('RGBA')
    normal = im.crop((96, 48, 192, 96)); pressed = im.crop((288, 48, 384, 96)); blank = im.crop((288, 432, 384, 480))
    m = {}
    for y in range(48):
        for x in range(96):
            a, b = pressed.getpixel((x, y)), normal.getpixel((x, y))
            if not (y < 8 or y > 40 or x < 10 or x > 86): continue
            if a[3] and b[3]: m.setdefault(a, {}); m[a][b] = m[a].get(b, 0) + 1
    best = {k: max(v, key=v.get) for k, v in m.items()}
    out = blank.copy()
    for y in range(48):
        for x in range(96):
            q = blank.getpixel((x, y))
            if q[3] and q in best: out.putpixel((x, y), best[q])
    im.paste(out, (864, 0)); im.save(p); print('ui ok', len(best))
if __name__ == '__main__': build()

def red_font():
    """sprites_font_bigred_alpha.png: the big blue font hue-shifted to red (unaffordable prices in the new UI)."""
    import colorsys
    src = Image.open(os.path.join(A, 'sprites_font_bigblue_alpha.png')).convert('RGBA'); out = src.copy(); p = out.load()
    for y in range(out.height):
        for x in range(out.width):
            r, g, b, a = p[x, y]
            if not a: continue
            h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            if s > .25: r, g, b = [int(c * 255) for c in colorsys.hsv_to_rgb(0.0, min(1, s * 1.1), v)]
            p[x, y] = (r, g, b, a)
    out.save(os.path.join(A, 'sprites_font_bigred_alpha.png'))
if __name__ == '__main__': red_font()

def speed_buttons():
    """Speed buttons in the style of the pause/help HUD icons: the help frame emptied, '1x'/'2x' drawn as
    2 px pixel glyphs. Stored in sprites_buttons_alpha.png row 48: 1x (864,48)/(912,48), 2x (960,48)/(864,96)."""
    p = os.path.join(A, 'sprites_buttons_alpha.png'); src = Image.open(os.path.join(A, 'sprites_conhud_alpha.png')).convert('RGBA'); im = Image.open(p).convert('RGBA')
    INK, GREY = (50, 54, 71, 255), (172, 172, 180, 255)
    G = {'1': ['.#.', '##.', '.#.', '.#.', '.#.', '.#.', '###'],
         '2': ['###', '..#', '..#', '###', '#..', '#..', '###'],
         'x': ['...', '...', '#.#', '.#.', '.#.', '#.#', '#.#']}
    def make(label, pressed):
        x, y = (144, 80) if pressed else (144, 32); b = src.crop((x, y, x + 48, y + 48)).copy(); px = b.load()
        for j in range(16, 32):
            for i in range(16, 32): px[i, j] = GREY if pressed else (0, 0, 0, 0)
        S = 2; w = len(label) * 3 * S + (len(label) - 1) * S; tx = 24 - w // 2; ty = 24 - 7 * S // 2
        for k, ch in enumerate(label):
            for j, row in enumerate(G[ch]):
                for i, c in enumerate(row):
                    if c == '#':
                        for dj in range(S):
                            for di in range(S): px[tx + k * 4 * S + i * S + di, ty + j * S + dj] = INK
        return b
    im.paste(make('1x', False), (864, 48)); im.paste(make('1x', True), (912, 48)); im.paste(make('2x', False), (960, 48)); im.paste(make('2x', True), (864, 96))
    im.save(p); print('speed buttons ok')
if __name__ == '__main__': speed_buttons()
