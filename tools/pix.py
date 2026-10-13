"""Tiny pixel-art helpers shared by the expansion art scripts."""
from PIL import Image
import math

def rgba(h, a=255):
    h = h.lstrip('#'); return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), a)

OUT = rgba('#323647')  # the original's dark outline colour

def put(im, x, y, c):
    if 0 <= x < im.width and 0 <= y < im.height: im.putpixel((int(x), int(y)), c)

def rect(im, x0, y0, x1, y1, c):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1): put(im, x, y, c)

def outline(im, c=OUT):
    """Add a 1-px outline around every opaque pixel (4-neighbourhood)."""
    src = im.copy(); W, H = im.size
    for y in range(H):
        for x in range(W):
            if src.getpixel((x, y))[3]: continue
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                if 0 <= x + dx < W and 0 <= y + dy < H and src.getpixel((x + dx, y + dy))[3] and src.getpixel((x + dx, y + dy)) != c:
                    im.putpixel((x, y), c); break
    return im

def disc(im, cx, cy, r, c):
    for y in range(int(cy - r - 1), int(cy + r + 2)):
        for x in range(int(cx - r - 1), int(cx + r + 2)):
            if (x - cx) ** 2 + (y - cy) ** 2 <= r * r: put(im, x, y, c)

def from_rows(rows, pal):
    """Build an image from strings; '.' is transparent, other chars index pal."""
    H, W = len(rows), max(len(r) for r in rows); im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    for y, r in enumerate(rows):
        for x, ch in enumerate(r):
            if ch != '.' and ch != ' ': im.putpixel((x, y), pal[ch])
    return im

def recolor(im, fn):
    """fn(r,g,b,a) -> (r,g,b,a) or None to keep."""
    out = im.copy(); px = out.load()
    for y in range(out.height):
        for x in range(out.width):
            p = px[x, y]
            if p[3] == 0: continue
            q = fn(*p)
            if q: px[x, y] = q
    return out

def hsv(r, g, b):
    import colorsys
    return colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)

def from_hsv(h, s, v, a=255):
    import colorsys
    r, g, b = colorsys.hsv_to_rgb(h % 1, max(0, min(1, s)), max(0, min(1, v)))
    return (round(r * 255), round(g * 255), round(b * 255), a)
