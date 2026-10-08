const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),http=require('node:http');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'harmoness-'));
for(const [name,amp] of [['quiet',.1],['loud',.8]]){
 const n=8000*12,b=Buffer.alloc(44+n*2);b.write('RIFF');b.writeUInt32LE(36+n*2,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(8000,24);b.writeUInt32LE(16000,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(n*2,40);
 for(let i=0;i<n;i++)b.writeInt16LE(Math.round(32767*(i/8000>2&&i/8000<4?0:amp*Math.sin(2*Math.PI*200*i/8000))),44+i*2);
 fs.writeFileSync(path.join(dir,name+'.wav'),b);
}
const site=path.resolve(__dirname,'../site');
const server=http.createServer((req,res)=>{const file=path.join(site,req.url==='/'?'index.html':req.url);if(!file.startsWith(site+path.sep)){res.writeHead(403).end();return;}fs.readFile(file,(err,data)=>{if(err){res.writeHead(404).end();return;}const ext=path.extname(file);res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css'})[ext]||'application/octet-stream');res.end(data);});});
(async()=>{
await new Promise(resolve=>server.listen(8766,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});const page=await browser.newPage({viewport:{width:1280,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:8766');await page.locator('#takes').setInputFiles([path.join(dir,'quiet.wav'),path.join(dir,'loud.wav')]);await page.waitForFunction(()=>document.querySelectorAll('.take-row').length===2);
await page.locator('.take-select').nth(1).click();assert.match(await page.locator('#gain-label').innerText(),/-18.1/);
await page.locator('#play').click();await page.waitForTimeout(350);assert.equal(await page.locator('#play').innerText(),'Pause');
await page.locator('.take-select').first().click();assert.equal(await page.locator('#play').innerText(),'Pause');
await page.locator('#play').click();await page.locator('#notes').fill('Keep this chorus');await page.locator('.favorite').first().click();await page.locator('#blind').check();assert.equal(await page.locator('#active-title').innerText(),'Take 1');assert(!await page.locator('#status').innerText().then(s=>s.includes('quiet.wav')));
const download=page.waitForEvent('download');await page.locator('#export-session').click();const d=await download;await d.saveAs(path.join(dir,'report.json'));const report=require(path.join(dir,'report.json'));assert.equal(report.takes[0].notes,'Keep this chorus');assert.equal(report.takes[0].favorite,true);assert.equal(report.takes[0].name,'Take 1');
await page.locator('.finding').first().click();assert.equal(await page.locator('#play').innerText(),'Pause');await page.locator('#play').click();
assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
await page.locator('.take-row button').filter({hasText:'Remove'}).first().click();assert.equal(await page.locator('.take-row').count(),1);assert.equal(await page.locator('#active-title').innerText(),'Take 2');
await page.goto('http://127.0.0.1:8766/experiment.html');assert.equal(await page.locator('#principle-editor .principle-row').count(),4);assert.equal(errors.length,0,errors.join('\n'));
console.log('PASS: import, matching, playback, switching, notes, favorites, hidden-name export, finding playback, removal, mobile overflow, experiment, no page errors');await browser.close();server.close();fs.rmSync(dir,{recursive:true,force:true});
})().catch(e=>{console.error(e);process.exit(1)});
