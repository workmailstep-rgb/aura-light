"""Validate packaging, internal references and standalone visual assets without a server."""
from html.parser import HTMLParser
from pathlib import Path
import json
import re
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parent
DIST = ROOT / 'dist'


class Document(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = set()
        self.references = []
        self.errors = []

    def handle_starttag(self, tag, attrs):
        data = dict(attrs)
        if 'id' in data:
            if data['id'] in self.ids:
                self.errors.append(f"Duplicate id: {data['id']}")
            self.ids.add(data['id'])
        for attr in ('src', 'href'):
            if data.get(attr):
                self.references.append(data[attr])
        for attr in ('aria-controls', 'aria-labelledby', 'aria-describedby', 'for'):
            for value in data.get(attr, '').split():
                self.references.append('#' + value)
        if tag == 'img' and 'alt' not in data:
            self.errors.append('Image missing alternative text')


doc = Document()
doc.feed((DIST / 'index.html').read_text())
for ref in doc.references:
    if ref.startswith('#'):
        if len(ref) > 1 and ref[1:] not in doc.ids:
            doc.errors.append(f'Missing fragment target: {ref}')
    elif ref.startswith('./') and not (DIST / ref).is_file():
        doc.errors.append(f'Missing asset: {ref}')
css = (DIST / 'styles.css').read_text()
for ref in re.findall(r"url\(['\"]?(\./[^)'\"]+)", css):
    if not (DIST / ref).is_file():
        doc.errors.append(f'Missing CSS asset: {ref}')
for asset in (DIST / 'assets').glob('*.svg'):
    ET.parse(asset)
manifest_path = ROOT / '.openai/hosting.json'
if manifest_path.is_file():
    manifest = json.loads(manifest_path.read_text())
    assert manifest['project_id']
    assert manifest['static']['directory'] == 'dist'
assert (DIST / 'assets/interior.jpg').stat().st_size > 10000
for font in ('manrope-regular.ttf', 'manrope-semibold.ttf', 'playfair-italic.ttf'):
    assert (DIST / 'assets' / font).stat().st_size > 10000, font
assert not doc.errors, '\n'.join(doc.errors)
print(f'PASS: {len(doc.ids)} unique IDs; all local assets, fragments, ARIA targets and SVGs verified.')
