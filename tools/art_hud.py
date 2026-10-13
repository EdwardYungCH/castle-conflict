"""Extend the four HUD button sheets (480x384 -> 480x576) with expansion icons.
Normal icons go in rows y=384/432, the pressed version at y+96 (same rule as the original).
Idempotent: always starts from the original top 384 rows."""
import os, sys
from PIL import Image
sys.path.insert(0, os.path.dirname(__file__))
import art_upgrades as U
A = os.path.join(os.path.dirname(__file__), '..', 'assets')
SHEETS = {'sprites_hud_alpha.png': 0, 'sprites_redhud_big_alpha.png': 1,
          'sprites_egypt_bluehud_big_alpha.png': 0, 'sprites_egypt_redhud_big_alpha.png': 1}
# slot -> builder(hud, selected, side) ; slots are (col,row) in the new area
ICONS = {
    (0, 0): lambda h, sel, side: U.make_icon(h, sel, 'temple'),
    (1, 0): lambda h, sel, side: U.make_icon(h, sel, 'solar'),
}
def register(slot, fn): ICONS[slot] = fn

def build():
    for f, side in SHEETS.items():
        p = os.path.join(A, f); src = Image.open(p).convert('RGBA').crop((0, 0, 480, 384))
        out = Image.new('RGBA', (480, 576), (0, 0, 0, 0)); out.paste(src, (0, 0))
        for (c, r), fn in ICONS.items():
            for sel in (0, 1):
                out.alpha_composite(fn(src, sel, side), (48 * c, 384 + 48 * r + 96 * sel))
        out.save(p)
    print('hud ok', len(ICONS))

if __name__ == '__main__':
    import art_north; art_north.register_icons()
    build()
