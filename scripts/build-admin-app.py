#!/usr/bin/env python3
"""Publish the DF Admin app and the DF Rider app to their own address (aalam7866.github.io/admin/ and /rider/).
They live away from diamondfashions.in so phones install them as apps separate from the customer app."""
import os, shutil, sys
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
DST = sys.argv[1] if len(sys.argv) > 1 else '/home/claude/aalam7866.github.io'
FILES = ['index.html', 'manifest.webmanifest', 'sw.js', 'icon-96.png', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png']
for app in ['admin', 'rider', 'karigar']:
    os.makedirs(os.path.join(DST, app), exist_ok=True)
    for f in FILES:
        src = os.path.join(ROOT, app, f)
        if f == 'index.html':
            html = open(src, encoding='utf-8').read()
            if 'rel="manifest"' not in html:
                html = html.replace('</title>', '</title>\n<link rel="manifest" href="manifest.webmanifest">', 1)
            open(os.path.join(DST, app, f), 'w', encoding='utf-8').write(html)
        else:
            shutil.copy(src, os.path.join(DST, app, f))
# staff apps made with Claude Code on the shop PC (DF Staff, DF Tailoring, DF Reports + shared code): copied as they are
for app in ['admin-staff', 'admin-tailor', 'admin-reports', 'admin-shared']:
    shutil.rmtree(os.path.join(DST, app), ignore_errors=True)
    shutil.copytree(os.path.join(ROOT, app), os.path.join(DST, app))
# root: a small chooser page, not an app (so it never overlaps the two app scopes)
for old in ['manifest.webmanifest', 'icon-96.png', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png']:
    p = os.path.join(DST, old)
    if os.path.exists(p): os.remove(p)
open(os.path.join(DST, 'sw.js'), 'w').write("self.addEventListener('install',function(){self.skipWaiting();});self.addEventListener('activate',function(e){e.waitUntil(self.registration.unregister());});\n")
open(os.path.join(DST, 'index.html'), 'w', encoding='utf-8').write('''<!doctype html><html lang="hi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Diamond Fashions Apps</title>
<style>body{margin:0;font-family:system-ui,sans-serif;background:#0B1626;color:#F2EEE6;display:flex;min-height:100vh;align-items:center;justify-content:center}main{width:min(420px,92vw);text-align:center}h1{letter-spacing:.2em;font-size:22px}a{display:flex;align-items:center;gap:14px;background:#12203A;border:1px solid #25365A;border-radius:14px;padding:14px;margin:12px 0;color:inherit;text-decoration:none;font-size:18px;font-weight:700}img{width:56px;height:56px;border-radius:12px}small{display:block;font-weight:400;color:#AEB5C2;font-size:14px}</style>
<script>if(navigator.serviceWorker){navigator.serviceWorker.getRegistrations().then(function(rs){rs.forEach(function(r){if(new URL(r.scope).pathname==='/')r.unregister();});});}</script></head>
<body><main><h1>DIAMOND FASHIONS</h1>
<a href="/admin/"><img src="/admin/icon-192.png" alt=""><span>DF Admin<small>दुकान मालिक के लिए</small></span></a>
<a href="/rider/"><img src="/rider/icon-192.png" alt=""><span>DF Rider<small>डिलीवरी बॉय के लिए</small></span></a>
<a href="/admin-staff/"><img src="/admin-staff/icon-192.png" alt=""><span>DF Staff<small>प्रोडक्ट, स्टॉक, फ़ोटो, नया आइटम</small></span></a>
<a href="/admin-tailor/"><img src="/admin-tailor/icon-192.png" alt=""><span>DF Tailoring<small>सिलाई ऑर्डर और कारीगरों के लिंक</small></span></a>
<a href="/admin-reports/"><img src="/admin-reports/icon-192.png" alt=""><span>DF Reports<small>आज की बिक्री, बकाया, कम स्टॉक</small></span></a>
<a href="https://diamondfashions.in/"><span>🛍️ diamondfashions.in<small>ग्राहकों की वेबसाइट</small></span></a></main></body></html>''')
open(os.path.join(DST, '.nojekyll'), 'w').write('')
open(os.path.join(DST, 'robots.txt'), 'w').write('User-agent: *\nDisallow: /\n')
print('built', DST)
