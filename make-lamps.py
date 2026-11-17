"""Generate independent neutral body finishes and live pastel-light SVG layers."""
from pathlib import Path
import re
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parent
ASSETS = ROOT / 'dist/assets'
NS = 'http://www.w3.org/2000/svg'
ET.register_namespace('', NS)
TEMPLATE = ROOT / 'artwork/lamp-template.svg'
PALETTES = {
    'white': ['#fffefa', '#eeece7', '#dcdcd7', '#acafb1'],
    'gray': ['#eeeff0', '#cdd0d3', '#b8bec4', '#858e97'],
}
ORIGINAL = ['#fffbed', '#e9dfc7', '#d5c8aa', '#a89a7c']
TOKENS = ['hi', 'mid', 'base', 'dark']


def element(tag, attrs):
    return ET.Element('{' + NS + '}' + tag, attrs)


def generate(finish):
    svg = ET.parse(TEMPLATE).getroot()
    palette = dict(zip(ORIGINAL, zip(TOKENS, PALETTES[finish])))
    for node in svg.iter():
        if node.get('filter') == 'url(#grain)':
            node.attrib.pop('filter')
        for attr in ('fill', 'stroke', 'stop-color'):
            if node.get(attr) in palette:
                token, color = palette[node.get(attr)]
                node.set(attr, color)
                node.set('style', f'{attr}:var(--body-{token},{color})')
        if node.get('stroke') == '#716e60':
            node.set('stroke', '#85898d')
    defs = svg.find('{' + NS + '}defs')
    for gradient_id in ('light', 'spill'):
        gradient = next(n for n in defs if n.get('id') == gradient_id)
        gradient.clear()
        gradient.set('id', gradient_id)
        stops = ([('0', '#fffaf6', '1', 'core'), ('.58', '#f3c5aa', '1', 'color'), ('1', '#f3c5aa', '.8', 'color')]
                 if gradient_id == 'light' else [('0', '#f3c5aa', '.65', 'color'), ('1', '#f3c5aa', '0', 'color')])
        for offset, color, opacity, kind in stops:
            attrs = {'offset': offset, 'stop-color': color, 'stop-opacity': opacity, 'data-light-stop': kind}
            if kind == 'color':
                attrs['style'] = 'stop-color:rgb(var(--light-rgb,243,197,170))'
            gradient.append(element('stop', attrs))
    blur = element('filter', {'id': 'light-soft', 'x': '-40%', 'y': '-100%', 'width': '180%', 'height': '300%'})
    blur.append(element('feGaussianBlur', {'stdDeviation': '18'}))
    defs.append(blur)
    # Emitted light is a separate layer; material colors never depend on its hue.
    for node in list(svg):
        if node.get('fill') in ('url(#spill)', 'url(#light)'):
            index = list(svg).index(node)
            svg.remove(node)
            power = element('g', {'class': 'lamp-power'})
            node.set('class', 'lamp-emission')
            node.set('opacity', '.65')
            power.append(node)
            svg.insert(index, power)
    glow = element('g', {'class': 'lamp-power'})
    glow.append(element('ellipse', {'class': 'lamp-emission', 'cx': '341', 'cy': '387', 'rx': '207', 'ry': '67', 'fill': 'url(#spill)', 'filter': 'url(#light-soft)', 'opacity': '.65'}))
    svg.insert(3, glow)
    return ET.tostring(svg, encoding='unicode') + '\n'


def inline_svg(name, classes, element_id=None):
    svg = ET.fromstring(generate('white'))
    svg.set('class', classes + ' lamp-illustration')
    svg.set('data-lamp', name)
    svg.set('role', 'img')
    svg.set('aria-label', 'AURA: белый корпус и мягкий персиковый свет')
    if element_id:
        svg.set('id', element_id)
    text = ET.tostring(svg, encoding='unicode')
    text = re.sub(r'\bid="([^"]+)"', lambda m: f'id="{name}-{m[1]}"' if m[1] != element_id else m[0], text)
    return re.sub(r'url\(#([^)]+)\)', lambda m: f'url(#{name}-{m[1]})', text)


if __name__ == '__main__':
    for finish in PALETTES:
        (ASSETS / f'lamp-{finish}.svg').write_text(generate(finish))
    print('Generated white and soft-gray bodies with independently controllable emitted light.')
