"""Rasterize the original social card. Optional dependency: CairoSVG."""
from pathlib import Path
import cairosvg

ROOT = Path(__file__).resolve().parents[1]
cairosvg.svg2png(url=str(ROOT / 'artwork/social-card.svg'), write_to=str(ROOT / 'dist/assets/social-preview.png'))
print('Rendered the 1200 × 630 Open Graph image.')
