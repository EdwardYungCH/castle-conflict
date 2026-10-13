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
