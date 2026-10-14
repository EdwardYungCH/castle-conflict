// Assemble the Capacitor web directory (www/) from the built index.html.
// The single-file build already embeds every asset; the service worker is not needed inside the app.
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), www = path.join(root, 'www');
fs.rmSync(www, { recursive: true, force: true });
fs.mkdirSync(path.join(www, 'pwa'), { recursive: true });
let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
// Inside the native app the page is always full-screen: hide the web header/footer and the fullscreen button.
html = html.replace('</style>', 'header,footer{display:none!important}#stage{padding:0!important}body{padding:0!important}</style>');
fs.writeFileSync(path.join(www, 'index.html'), html);
for (const f of fs.readdirSync(path.join(root, 'pwa'))) fs.copyFileSync(path.join(root, 'pwa', f), path.join(www, 'pwa', f));
console.log('www ok', (fs.statSync(path.join(www, 'index.html')).size / 1e6).toFixed(1), 'MB');
