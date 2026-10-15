"""Build index.html: bundles src/*.js modules and every file in assets/ (as base64) into one HTML file.
Usage: python build.py [version]"""
import base64, json, mimetypes, os, re, sys
ROOT = os.path.dirname(os.path.abspath(__file__))
SRC, ASSETS = os.path.join(ROOT, 'src'), os.path.join(ROOT, 'assets')
ORDER = ['native-timer','atlases','unit-geometry','content-v1.85','north-map','east-map','under-map','sky-map','expansion','original-constants','ai-scores','core','ui','engine','data','dialogs','battle','extras','menu','campaign','scenes','app']
MIME = {'.png': 'image/png', '.wav': 'audio/x-wav', '.mp3': 'audio/mpeg'}
mods = []
for name in ORDER:
    code = open(os.path.join(SRC, name + '.js'), encoding='utf8').read()
    code = re.sub(r'require\("([\w\-.]+?)(?:\.mjs)?"\)', lambda m: 'require("%s")' % m.group(1), code)
    mods.append('"%s":function(require,exports){\n%s\n}' % (name, code))
assets = {}
for f in sorted(os.listdir(ASSETS)):
    ext = os.path.splitext(f)[1].lower()
    if ext in MIME:
        assets[f] = 'data:%s;base64,%s' % (MIME[ext], base64.b64encode(open(os.path.join(ASSETS, f), 'rb').read()).decode())
version = sys.argv[1] if len(sys.argv) > 1 else '1.0'
html = open(os.path.join(ROOT, 'shell.html'), encoding='utf8').read()
script = ('(()=>{"use strict";const ASSETS=' + json.dumps(assets, separators=(',', ':')) +
          ';const modules={' + ',\n'.join(mods) +
          '};const cache={};function require(id){if(cache[id])return cache[id];const exports=cache[id]={};if(!modules[id])throw new Error("module "+id);modules[id](require,exports);return exports;}require("app");})();')
html = html.replace('/*__SCRIPT__*/', script).replace('__VERSION__', version)
out = os.path.join(ROOT, 'index.html')
open(out, 'w', encoding='utf8').write(html)
print(out, os.path.getsize(out), 'bytes,', len(assets), 'assets')
import hashlib
sw = open(os.path.join(ROOT, 'sw.template.js'), encoding='utf8').read().replace('__VERSION__', version + '-' + hashlib.sha1(html.encode('utf8')).hexdigest()[:8])
open(os.path.join(ROOT, 'sw.js'), 'w', encoding='utf8').write(sw)
