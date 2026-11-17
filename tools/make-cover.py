"""Compose the portfolio cover from original AURA assets; not a page screenshot.

Optional authoring dependencies: fonttools, CairoSVG.
"""
from html import escape
from pathlib import Path
import re
import xml.etree.ElementTree as ET

import cairosvg
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'dist/assets'
DOCS = ROOT / 'docs'
NS = 'http://www.w3.org/2000/svg'
ET.register_namespace('', NS)
INK = '#453348'
FONTS = {name: TTFont(ASSETS / filename) for name, filename in {
    'regular': 'manrope-regular.ttf',
    'bold': 'manrope-semibold.ttf',
    'italic': 'playfair-italic.ttf',
}.items()}


def lettering(text, x, y, size, font='regular', color=INK, tracking=0):
    """Convert lettering to paths so Cyrillic is stable in SVG and PNG viewers."""
    face = FONTS[font]
    glyphs = face.getGlyphSet()
    cmap = face.getBestCmap()
    scale = size / face['head'].unitsPerEm
    advance = 0
    pieces = []
    for char in text:
        name = cmap[ord(char)]
        pen = SVGPathPen(glyphs)
        glyphs[name].draw(pen)
        pieces.append(f'<path transform="translate({advance:.4f} 0)" d="{pen.getCommands()}"/>')
        advance += face['hmtx'].metrics[name][0] + tracking / scale
    return f'<g aria-label="{escape(text, quote=True)}" fill="{color}" transform="translate({x} {y}) scale({scale} {-scale})">{"".join(pieces)}</g>'


def lamp(finish, hue, x, y, width, height):
    svg = ET.parse(ASSETS / f'lamp-{finish}.svg').getroot()
    for node in svg.iter():
        node.attrib.pop('style', None)
        if node.get('data-light-stop') == 'color':
            node.set('stop-color', hue)
    svg.set('x', str(x))
    svg.set('y', str(y))
    svg.set('width', str(width))
    svg.set('height', str(height))
    markup = ET.tostring(svg, encoding='unicode')
    markup = re.sub(r'\bid="([^"]+)"', lambda m: f'id="{finish}-{m[1]}"', markup)
    return re.sub(r'url\(#([^)]+)\)', lambda m: f'url(#{finish}-{m[1]})', markup)


logo = ET.parse(ASSETS / 'aura-logo.svg').getroot()
logo.attrib.update(x='65', y='35', width='190', height='67')
parts = [
    '<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900" role="img">',
    '<title>AURA — ваш цвет. Ваш уют.</title>',
    '<desc>Белый и серый светильники с пастельным освещением. Обложка дизайн-концепта.</desc>',
    '<rect width="1600" height="900" fill="#f5f3eb"/>',
    ET.tostring(logo, encoding='unicode'),
    lettering('INTERACTIVE PRODUCT / 2026', 1188, 79, 13, tracking=1.4),
    '<path d="M72 132H1528M72 797H1528" stroke="#dcd9d0"/>',
    '<circle cx="1230" cy="465" r="282" fill="#f3c5aa" fill-opacity=".55"/>',
    '<circle cx="984" cy="518" r="192" fill="#c7ddd0" fill-opacity=".72"/>',
    lamp('gray', '#c7ddd0', 746, 269, 485, 528),
    lamp('white', '#f3c5aa', 995, 132, 615, 669),
    lettering('A LITTLE LIGHT. A LOT OF FEELING.', 78, 223, 13, tracking=1.8),
    lettering('Ваш цвет.', 70, 344, 104, font='bold'),
    lettering('Ваш уют.', 72, 460, 116, font='italic'),
    lettering('Светильник, который создаёт', 78, 532, 24),
    lettering('атмосферу под ваше настроение.', 78, 572, 24),
    lettering('ДВА КОРПУСА / ШЕСТЬ ОТТЕНКОВ СВЕТА', 78, 635, 12, tracking=1.2),
]
for index, hue in enumerate(('#f3c5aa', '#eac6d3', '#cfc8eb', '#bdd7e9', '#c7ddd0', '#f0e1b5')):
    parts.append(f'<circle cx="{96 + index * 57}" cy="683" r="18" fill="{hue}" stroke="#453348" stroke-opacity=".1"/>')
parts.extend([
    lettering('AURA / DESIGN & FRONTEND', 78, 842, 13, tracking=1.6),
    lettering('HTML / CSS / JAVASCRIPT', 1210, 842, 12, tracking=1.3),
    lettering('ВЫМЫШЛЕННЫЙ ПРОДУКТ · ДИЗАЙН-КОНЦЕПТ', 78, 871, 9, color='#70676f', tracking=.8),
    '</svg>',
])
DOCS.mkdir(exist_ok=True)
cover = '\n'.join(parts)
(DOCS / 'cover.svg').write_text(cover)
cairosvg.svg2png(bytestring=cover.encode(), write_to=str(DOCS / 'cover.png'))
print('Generated docs/cover.svg and docs/cover.png from original AURA artwork.')
