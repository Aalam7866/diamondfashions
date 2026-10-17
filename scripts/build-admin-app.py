#!/usr/bin/env python3
"""Copy the admin page into the separate DF Admin app site (aalam7866.github.io).
The admin app lives on its own address so phones install it as an app separate from the customer app."""
import os, shutil, sys, json
SRC = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'admin')
DST = sys.argv[1] if len(sys.argv) > 1 else '/home/claude/aalam7866.github.io'
html = open(os.path.join(SRC, 'index.html'), encoding='utf-8').read()
html = html.replace('<title>Diamond Fashions Admin</title>', '<title>Diamond Fashions Admin</title>\n<link rel="manifest" href="manifest.webmanifest">', 1)
open(os.path.join(DST, 'index.html'), 'w', encoding='utf-8').write(html)
for f in ['icon-96.png', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png']:
    shutil.copy(os.path.join(SRC, f), os.path.join(DST, f))
m = json.load(open(os.path.join(SRC, 'manifest.webmanifest'), encoding='utf-8'))
m['id'] = '/'; m['start_url'] = '/?app=1'; m['scope'] = '/'
for i in m['icons']: i['src'] = i['src'].replace('/admin/', '/')
for sc in m.get('shortcuts', []):
    sc['url'] = sc['url'].replace('/admin/', '/')
    for i in sc.get('icons', []): i['src'] = i['src'].replace('/admin/', '/')
json.dump(m, open(os.path.join(DST, 'manifest.webmanifest'), 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
sw = open(os.path.join(SRC, 'sw.js'), encoding='utf-8').read().replace("'/admin/'", "'/'").replace("'/admin/manifest.webmanifest', '/admin/icon-192.png', '/admin/icon-512.png'", "'/manifest.webmanifest', '/icon-192.png', '/icon-512.png'")
sw = sw.replace("u.pathname.indexOf('/admin/') !== 0", "false").replace("indexOf('/admin') >= 0", "indexOf(location.origin) === 0")
open(os.path.join(DST, 'sw.js'), 'w', encoding='utf-8').write(sw)
open(os.path.join(DST, '.nojekyll'), 'w').write('')
open(os.path.join(DST, 'robots.txt'), 'w').write('User-agent: *\nDisallow: /\n')
print('built', DST)
