"""Build-only adaptation of Paper Design's Poisson logo bevel; no client processing.

Reference: paper-design/liquid-logo src/hero/parse-logo-image.ts,
commit 689bb38a1e0d5a6a8baf2d34847635eefde19994. PolyForm Shield 1.0.0;
see third_party/liquid-logo-LICENSE.md. Dependencies: CairoSVG, NumPy, Pillow.
"""
from io import BytesIO
from pathlib import Path
import cairosvg
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
image = Image.open(BytesIO(cairosvg.svg2png(url=str(ROOT / 'dist/assets/aura-logo.svg'), output_width=544, output_height=192))).convert('RGBA')
mask = np.asarray(image)[:, :, 3] > 127
interior = mask.copy()
for dy in (-1, 0, 1):
    for dx in (-1, 0, 1):
        interior &= np.roll(np.roll(mask, dy, axis=0), dx, axis=1)
interior[[0, -1], :] = False
interior[:, [0, -1]] = False
field = np.zeros(mask.shape, dtype=np.float32)
for _ in range(300):
    neighbours = np.roll(field, 1, 0) + np.roll(field, -1, 0) + np.roll(field, 1, 1) + np.roll(field, -1, 1)
    field = np.where(interior, (.01 + neighbours) / 4, 0)
maximum = float(field.max())
assert maximum > 0
gray = np.clip(255 * (1 - (field / maximum) ** 2), 0, 255).astype(np.uint8)
rgba = np.repeat(gray[:, :, None], 4, axis=2)
rgba[:, :, 3] = 255
Image.fromarray(rgba, 'RGBA').save(ROOT / 'dist/assets/liquid-logo-depth.png', optimize=True)
print('Generated the local 544 × 192 liquid-logo depth mask.')
