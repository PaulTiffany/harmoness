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
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage','--no-zygote']});const page=await browser.newPage({viewport:{width:1280,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:8766');await page.locator('#takes').setInputFiles([path.join(dir,'quiet.wav'),path.join(dir,'loud.wav')]);await page.waitForFunction(()=>document.querySelectorAll('.take-row').length===2);
await page.locator('.take-select').nth(1).click();assert.match(await page.locator('#gain-label').innerText(),/-18.1/);
await page.locator('#play').click();await page.waitForTimeout(350);assert.equal(await page.locator('#play').innerText(),'Pause');
await page.locator('.take-select').first().click();assert.equal(await page.locator('#play').innerText(),'Pause');
await page.locator('#play').click();await page.locator('#notes').fill('Keep this chorus');await page.locator('.favorite').first().click();await page.locator('#blind').check();assert.equal(await page.locator('#active-title').innerText(),'Take 1');assert(!await page.locator('#status').innerText().then(s=>s.includes('quiet.wav')));
await page.locator('.export-menu summary').click();const download=page.waitForEvent('download');await page.locator('#export-session').click();const d=await download;await d.saveAs(path.join(dir,'report.json'));const report=require(path.join(dir,'report.json'));assert.equal(report.takes[0].notes,'Keep this chorus');assert.equal(report.takes[0].favorite,true);assert.equal(report.takes[0].name,'Take 1');
await page.locator('.finding').first().click();assert.equal(await page.locator('#play').innerText(),'Pause');await page.locator('#play').click();
assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
await page.locator('.take-row button').filter({hasText:'Remove'}).first().click();assert.equal(await page.locator('.take-row').count(),1);assert.equal(await page.locator('#active-title').innerText(),'Take 1');
// Device persistence survives a reload and restores audio for playback.
await page.locator('#session-name').fill('Saved listening QA');await page.locator('#notes').fill('Remember this take');await page.locator('#take-prompt').fill('Warm piano test');await page.locator('#save-session').click();await page.waitForFunction(()=>document.querySelector('#save-status').textContent.startsWith('Saved on'));
await page.reload();await page.locator('.saved-row button').filter({hasText:'Open'}).click();await page.waitForFunction(()=>document.querySelector('#notes').value==='Remember this take');assert.equal(await page.locator('#take-prompt').inputValue(),'Warm piano test');
await page.locator('#play').click();assert.equal(await page.locator('#play').innerText(),'Pause');await page.locator('#play').click();
// The Compose link checkpoints the room, and a frozen brief returns with the same audio and notes.
await page.locator('nav a').filter({hasText:'Compose'}).click();await page.waitForURL('**/experiment.html');assert.equal(await page.locator('#principle-editor .principle-row').count(),4);
await page.locator('#compact-prompt').click();assert((await page.locator('#prompt-output').inputValue()).length<=900);
await page.locator('#send-brief').click();await page.waitForURL('**/#brief');await page.waitForFunction(()=>document.querySelector('#notes').value==='Remember this take');assert.equal(await page.locator('#brief-map span').count(),4);
await page.locator('#check-brief').click();await page.waitForFunction(()=>document.querySelectorAll('.brief-result').length===4);await page.locator('.brief-result button').first().click();assert.equal(await page.locator('#play').innerText(),'Pause');await page.locator('#play').click();
// A bounded loop really returns to its start, and shuffling preserves take data.
await page.locator('#loop-start').fill('1');await page.locator('#loop-end').fill('1.3');await page.locator('#loop').check();await page.locator('#play').click();await page.waitForTimeout(700);const loopPosition=Number(await page.locator('#position').inputValue());assert(loopPosition>=1&&loopPosition<1.45);await page.locator('#play').click();await page.locator('#loop').uncheck();
await page.locator('#shuffle').click();assert(await page.locator('#blind').isChecked());assert.equal(await page.locator('#notes').inputValue(),'Remember this take');
// Demo works without file upload. Confirm only the explicit replacement action.
page.once('dialog',dialog=>dialog.accept());await page.locator('#demo').click();await page.waitForFunction(()=>document.querySelectorAll('.take-row').length===3&&!document.querySelector('#demo').disabled);assert.match(await page.locator('#status').innerText(),/Demo ready/);await page.locator('.take-select').nth(2).click();assert((await page.locator('.finding').count())>0);
await page.locator('#finding-filter').selectOption('silence');assert.match(await page.locator('#findings').innerText(),/quiet passage/);
// Verify mobile layout with the most populated UI and the saved session list.
assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
if(process.env.QA_SCREENSHOTS){fs.mkdirSync(process.env.QA_SCREENSHOTS,{recursive:true});await page.screenshot({path:path.join(process.env.QA_SCREENSHOTS,'mobile.png'),fullPage:true});await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:path.join(process.env.QA_SCREENSHOTS,'desktop.png'),fullPage:true});}
await page.goto('http://127.0.0.1:8766/experiment.html');for(let i=0;i<8;i++)await page.locator('#add-principle').click();assert(await page.locator('#add-principle').isDisabled());assert.equal(await page.locator('.wheel-node').count(),12);await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
if(process.env.QA_SCREENSHOTS)await page.screenshot({path:path.join(process.env.QA_SCREENSHOTS,'compose.png'),fullPage:true});
// Cached app and analysis workers remain usable without a network.
await page.goto('http://127.0.0.1:8766/');await page.evaluate(()=>Promise.race([navigator.serviceWorker.ready.then(()=>true),new Promise((_,reject)=>setTimeout(()=>reject(Error('Service worker readiness timeout')),30000))]));await page.context().setOffline(true);await page.reload();await page.locator('#demo').click();await page.waitForFunction(()=>document.querySelectorAll('.take-row').length===3&&!document.querySelector('#demo').disabled);assert.match(await page.locator('#status').innerText(),/Demo ready/);await page.context().setOffline(false);
assert.equal(errors.length,0,errors.join('\n'));
console.log('PASS: audio import/playback, matching, report export, mobile layout, device save/restore, Compose round trip, pitch previews, loops, shuffle, demo, 12-principle map, no page errors');await browser.close();server.close();fs.rmSync(dir,{recursive:true,force:true});
})().catch(e=>{console.error(e);process.exit(1)});
