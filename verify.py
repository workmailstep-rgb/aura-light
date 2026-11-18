"""Verify page routes, SEO, internal links, ARIA relationships and local artwork."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit, unquote
import json
import hashlib
import gzip
import re
import struct
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parent
DIST = ROOT / 'dist'
ORIGIN = 'https://aura-light-studio.littledawn8.chatgpt.site'


class Document(HTMLParser):
    def __init__(self, file):
        super().__init__()
        self.file = file
        self.ids = set()
        self.references = []
        self.errors = []
        self.meta = {}
        self.title = ''
        self.in_title = False
        self.h1_count = 0
        self.details_count = 0
        self.canonical = ''

    def handle_starttag(self, tag, attrs):
        data = dict(attrs)
        if 'id' in data:
            if data['id'] in self.ids:
                self.errors.append(f"Duplicate id: {data['id']}")
            self.ids.add(data['id'])
        for attr in ('src', 'href', 'action'):
            if data.get(attr):
                self.references.append(data[attr])
        for attr in ('aria-controls', 'aria-labelledby', 'aria-describedby', 'for'):
            for value in data.get(attr, '').split():
                self.references.append('#' + value)
        if tag == 'img' and 'alt' not in data:
            self.errors.append('Image missing alternative text')
        if tag == 'h1':
            self.h1_count += 1
        if tag == 'details':
            self.details_count += 1
        if tag == 'title':
            self.in_title = True
        if tag == 'meta':
            self.meta[data.get('name') or data.get('property')] = data.get('content', '')
        if tag == 'link' and data.get('rel') == 'canonical':
            self.canonical = data.get('href', '')

    def handle_endtag(self, tag):
        if tag == 'title':
            self.in_title = False

    def handle_data(self, data):
        if self.in_title:
            self.title += data


def asset_target(reference, source):
    url = urlsplit(reference)
    if url.scheme and (url.scheme not in ('https', 'http') or url.netloc != urlsplit(ORIGIN).netloc):
        return None, ''
    if not url.path:
        return source, unquote(url.fragment)
    target = (DIST / unquote(url.path).lstrip('/')) if url.path.startswith('/') or url.netloc else source.parent / unquote(url.path)
    target = target.resolve()
    assert target.is_relative_to(DIST.resolve()), f'Asset leaves output directory: {reference}'
    if target.is_dir():
        target /= 'index.html'
    return target, unquote(url.fragment)


documents = {}
for file in sorted(DIST.rglob('*.html')):
    doc = Document(file)
    doc.feed(file.read_text())
    documents[file.resolve()] = doc

assert len(documents) == 5, 'Expected home, order, thanks, privacy and custom 404 pages.'
titles = set()
descriptions = set()
for file, doc in documents.items():
    assert doc.h1_count == 1, f'{file}: expected one H1'
    assert doc.title.strip() and doc.title not in titles, f'{file}: missing or duplicate title'
    titles.add(doc.title)
    description = doc.meta.get('description', '')
    assert 60 <= len(description) <= 200 and description not in descriptions, f'{file}: invalid or repeated meta description'
    descriptions.add(description)
    assert doc.canonical.startswith(ORIGIN), f'{file}: missing canonical'
    assert doc.meta.get('og:image') == ORIGIN + '/assets/social-preview.png'
    assert doc.meta.get('og:image:width') == '1200' and doc.meta.get('og:image:height') == '630'
    assert doc.meta.get('og:locale') == 'ru_RU'
    assert doc.meta.get('og:image:alt') and doc.meta.get('twitter:image:alt')
    assert doc.meta.get('twitter:card') == 'summary_large_image'
    for ref in [*doc.references, doc.canonical, doc.meta.get('og:image', '')]:
        target, fragment = asset_target(ref, file)
        if target is None:
            continue
        assert target.is_file(), f'{file}: missing internal target {ref}'
        if fragment and target in documents:
            assert fragment in documents[target].ids, f'{file}: missing fragment {ref}'
    assert not doc.errors, f'{file}: ' + '\n'.join(doc.errors)

assert documents[(DIST / 'index.html').resolve()].details_count == 5
for path in ('thanks/index.html', '404.html'):
    assert 'noindex' in documents[(DIST / path).resolve()].meta['robots']
for css in DIST.rglob('*.css'):
    for ref in re.findall(r"url\(['\"]?([^)'\"]+)", css.read_text()):
        if ref.startswith('data:') or unquote(ref).startswith('#'):
            continue
        target, _ = asset_target(ref, css.resolve())
        if target:
            assert target.is_file(), f'{css}: missing CSS asset {ref}'
for asset in (DIST / 'assets').glob('*.svg'):
    ET.parse(asset)
for source in (ROOT / 'artwork').glob('*.svg'):
    ET.parse(source)
png = (DIST / 'assets/social-preview.png').read_bytes()
assert png[:8] == b'\x89PNG\r\n\x1a\n' and struct.unpack('>II', png[16:24]) == (1200, 630)
mask = (DIST / 'assets/liquid-logo-depth.png').read_bytes()
assert mask[:8] == b'\x89PNG\r\n\x1a\n' and struct.unpack('>II', mask[16:24]) == (544, 192)
bundle_dir = DIST / 'assets/experience'
bundle = json.loads((bundle_dir / 'manifest.json').read_text())
modules = {item['file']: item for item in bundle['modules']}
assert bundle['entry'] in modules
eager = set()


def verify_module(file):
    if file in eager:
        return
    eager.add(file)
    for dependency in modules[file]['imports']:
        if dependency['kind'] != 'dynamic-import':
            verify_module(dependency['file'])


for file, module in modules.items():
    assert Path(file).name == file, f'Invalid bundle module path: {file}'
    data = (bundle_dir / file).read_bytes()
    assert len(data) == module['bytes'] and hashlib.sha256(data).hexdigest() == module['sha256']
    for dependency in module['imports']:
        assert not dependency['external'] and dependency['file'] in modules, f'Nonlocal or missing module in {file}'
verify_module(bundle['entry'])
assert eager == set(bundle['initial']['files'])
assert sum(len(gzip.compress((bundle_dir / file).read_bytes())) for file in eager) < 8192
assert 'PolyForm Shield' in (bundle_dir / bundle['notices']).read_text()
sitemap = ET.parse(DIST / 'sitemap.xml')
urls = [item.text for item in sitemap.findall('.//{*}loc')]
assert urls == [ORIGIN + '/', ORIGIN + '/order/', ORIGIN + '/privacy/']
assert ORIGIN + '/sitemap.xml' in (DIST / 'robots.txt').read_text()
manifest_path = ROOT / '.openai/hosting.json'
if manifest_path.is_file():
    manifest = json.loads(manifest_path.read_text())
    assert manifest['project_id'] and manifest['static']['directory'] == 'dist'
assert (DIST / 'assets/interior.jpg').stat().st_size > 10000
for font in ('manrope-regular.ttf', 'manrope-semibold.ttf', 'playfair-italic.ttf'):
    assert (DIST / 'assets' / font).stat().st_size > 10000, font
print('PASS: 5 pages; SEO, routes/fragments, ARIA, 5 FAQs, social PNG, sitemap, local assets, 3D module integrity and lazy bootstrap budget verified.')
