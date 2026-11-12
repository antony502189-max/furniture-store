"""Validate shipped pages, local assets, catalog and Blender glTF using stdlib."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit, unquote
import json,re,struct
ROOT=Path(__file__).resolve().parents[1]
class Page(HTMLParser):
 def __init__(self):super().__init__();self.ids=[];self.links=[];self.lang=None;self.in_select=False;self.in_option=False;self.bad_select=[];self.h1=0
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if 'id'in a:self.ids.append(a['id'])
  if tag=='html':self.lang=a.get('lang')
  if tag=='h1':self.h1+=1
  if tag=='select':self.in_select=True
  if tag=='option':self.in_option=True
  for key in ['src','href']:
   if key in a:self.links.append(a[key])
 def handle_endtag(self,tag):
  if tag=='select':self.in_select=False
  if tag=='option':self.in_option=False
 def handle_data(self,text):
  if self.in_select and not self.in_option and text.strip():self.bad_select.append(text)
for file in ROOT.glob('*.html'):
 p=Page();p.feed(file.read_text());assert p.lang=='ru',file
 assert p.h1==1,(file,p.h1)
 assert len(p.ids)==len(set(p.ids)),('duplicate ids',file)
 assert not p.bad_select,('invalid options',file,p.bad_select)
 for link in p.links:
  u=urlsplit(link)
  if u.scheme or u.netloc:continue
  if not u.path:
   if u.fragment:assert u.fragment in p.ids,(file,link)
   continue
  assert not u.path.startswith('/'),('GitHub Pages absolute path',file,link)
  assert (file.parent/unquote(u.path)).is_file(),('missing asset',file,link)
 print('PASS',file.name,'Russian, links, IDs, select markup')
products=json.loads((ROOT/'products.json').read_text());assert len(products)==16
assert len({p['id'] for p in products})==16
for p in products:
 assert p['price']>0 and isinstance(p['price'],int)
 assert p['colors'] and re.search('[А-Яа-я]',p['title'])
 assert(ROOT/p['image']).is_file()
 assert p['category'] and p['material']
for js in (ROOT/'assets/vendor/three').glob('*.js'):
 for imp in re.findall(r"from\s+['\"]([^'\"]+)['\"]",js.read_text()):
  if imp.startswith('.'):assert(js.parent/imp).is_file(),(js,imp)
raw=(ROOT/'assets/models/room.glb').read_bytes();magic,version,length=struct.unpack_from('<4sII',raw);assert magic==b'glTF' and version==2 and length==len(raw)
size,kind=struct.unpack_from('<I4s',raw,12);gltf=json.loads(raw[20:20+size]);ids={n.get('extras',{}).get('productId') for n in gltf['nodes']}
assert {'sofa','coffee-table','modern-armchair','nightstand','floor-lamp'}<=ids
assert len(raw)<4_000_000
assert all('uri' not in b for b in gltf['buffers']), 'GLB must be self-contained'
print('PASS 16 catalog products, local Three.js imports, embedded Blender model and 5 selectable groups')
