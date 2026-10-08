const CACHE='harmoness-product-v1';
const ASSETS=['./','./index.html','./product.css','./audio-checks.js','./pitch-checks.js','./analysis-worker.js','./workbench.js','./sessions.js','./demo.js','./experiment.html','./styles.css','./compose.css','./app.js','./compose-product.js','./manifest.webmanifest','./icon.svg','./assets/harmoness-cowgirl.webp'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('harmoness-')&&k!==CACHE).map(k=>caches.delete(k))))));
self.addEventListener('fetch',event=>{if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;event.respondWith(caches.match(event.request).then(hit=>hit||fetch(event.request)));});
