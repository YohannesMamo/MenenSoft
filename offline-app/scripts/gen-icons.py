"""
Generate all app icons from the canonical source Icon.png.
- PWA icons (public/icons/*) + optimized app-icon-512
- Android legacy launcher / round mipmaps (full-bleed cover)
- Android adaptive foreground (Icon.png scaled to safe-zone on brand background)
- favicon svg
"""
from PIL import Image
import os

SRC = r'E:\Menen Student Assistant\frontend\public\Icon.png'
ROOT = r'E:\Menen Student Assistant\frontend'
RES = os.path.join(ROOT, 'android', 'app', 'src', 'main', 'res')

def resize_cover(src, size):
    im = Image.open(src).convert('RGBA')
    ratio = max(size / im.width, size / im.height)
    nw, nh = int(im.width * ratio), int(im.height * ratio)
    im = im.resize((nw, nh), Image.LANCZOS)
    left = (nw - size) // 2
    top = (nh - size) // 2
    return im.crop((left, top, left + size, top + size))

def adaptive_foreground(src, size):
    """Foreground: center icon occupying ~62% of canvas (safe-zone for adaptive mask)."""
    safe = int(size * 0.62)
    im = Image.open(src).convert('RGBA')
    r = safe / min(im.width, im.height)
    nw, nh = max(1, int(im.width * r)), max(1, int(im.height * r))
    im = im.resize((nw, nh), Image.LANCZOS)
    canvas = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    canvas.paste(im, ((size - nw) // 2, (size - nh) // 2), im)
    return canvas

# 1. Optimized canonical 512 (used by PWA 512 + adaptive base)
icon512 = resize_cover(SRC, 512)
icon512.save(os.path.join(ROOT, 'public', 'app-icon-512.png'))

# 2. PWA icons
for size in (192, 512):
    resize_cover(SRC, size).save(os.path.join(ROOT, 'public', 'icons', f'icon-{size}x{size}.png'))

# 3. Android legacy launcher / round (full-bleed cover)
legacy = {'mdpi': 48, 'hdpi': 72, 'xhdpi': 96, 'xxhdpi': 144, 'xxxhdpi': 192}
for d, size in legacy.items():
    base = os.path.join(RES, f'mipmap-{d}')
    resize_cover(SRC, size).save(os.path.join(base, 'ic_launcher.png'))
    resize_cover(SRC, size).save(os.path.join(base, 'ic_launcher_round.png'))

# 4. Android adaptive foreground (padded, safe-zone)
fg = {'mdpi': 108, 'hdpi': 162, 'xhdpi': 216, 'xxhdpi': 324, 'xxxhdpi': 432}
for d, size in fg.items():
    base = os.path.join(RES, f'mipmap-{d}')
    adaptive_foreground(SRC, size).save(os.path.join(base, 'ic_launcher_foreground.png'))

# 5. Adaptive background -> solid black (Icon.png edges are black, so seamless)
bg_values = os.path.join(RES, 'values', 'ic_launcher_background.xml')
with open(bg_values, 'w', encoding='utf-8') as f:
    f.write('<?xml version="1.0" encoding="utf-8"?>\n'
            '<resources>\n'
            '    <color name="ic_launcher_background">#000000</color>\n'
            '</resources>\n')

# 6. Favicon: point to optimized icon via a small SVG referencing the png is not ideal;
#    instead write a 64x64 PNG favicon.
resize_cover(SRC, 64).save(os.path.join(ROOT, 'public', 'favicon.png'))

print("Icon generation complete.")
