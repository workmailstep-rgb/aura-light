"""Generate the AURA identity as self-contained vector paths, without font dependencies."""
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen

ROOT = Path(__file__).resolve().parent
ASSETS = ROOT / 'dist/assets'
FONT = TTFont(ASSETS / 'manrope-semibold.ttf')
GLYPHS = FONT.getGlyphSet()
CMAP = FONT.getBestCmap()


def mark(ink, halo):
    return f'''<g fill="none" stroke-linecap="round" stroke-linejoin="round">
      <path d="M17 60a36 36 0 1 1 62 0" stroke="{halo}" stroke-width="3.5"/>
      <path d="M27 49c0-13.8 9.4-24 21-24s21 10.2 21 24c0 3-9.4 6-21 6s-21-3-21-6Z" fill="{ink}"/>
      <path d="M43 55h10l4 17c.7 3-18.7 3-18 0Z" fill="{ink}"/>
      <path d="M31 50.5c10 3.4 24 3.4 34 0" stroke="{halo}" stroke-width="2"/>
      <path d="M34 80h28" stroke="{ink}" stroke-width="3.5"/>
    </g>'''


def wordmark(ink):
    pieces = []
    x = 0
    for char in 'aura':
        glyph_name = CMAP[ord(char)]
        pen = SVGPathPen(GLYPHS)
        GLYPHS[glyph_name].draw(pen)
        pieces.append(f'<path transform="translate({x} 0)" d="{pen.getCommands()}"/>')
        x += FONT['hmtx'].metrics[glyph_name][0] - 50
    return f'<g fill="{ink}" transform="translate(104 67) scale(.036 -.036)">{"".join(pieces)}</g>'


for filename, ink, halo in [
    ('aura-logo.svg', '#453348', '#879566'),
    ('aura-logo-light.svg', '#f5f3eb', '#d9ed9c'),
]:
    content = f'<svg xmlns="http://www.w3.org/2000/svg" width="272" height="96" viewBox="0 0 272 96"><title>AURA — свет для дома</title><g transform="translate(0 4)">{mark(ink, halo)}</g>{wordmark(ink)}</svg>'
    (ASSETS / filename).write_text(content)

(ASSETS / 'aura-symbol.svg').write_text(f'<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><title>AURA — знак светильника с ореолом</title>{mark("#453348", "#879566")}</svg>')
(ASSETS / 'favicon.svg').write_text(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect width="96" height="96" rx="24" fill="#453348"/><g transform="translate(6 6) scale(.875)">{mark("#f5f3eb", "#d9ed9c")}</g></svg>')
print('Generated primary logo, light logo, symbol and favicon as vector paths.')
