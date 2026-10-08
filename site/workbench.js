(() => {
  'use strict';
  const $=id=>document.getElementById(id), takes=[];
  let context, output, source=null, selected=null, offset=0, startedAt=0, playing=false, busy=false, nextId=1;
  const time=s=>`${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;
  const title=t=>$('blind').checked?`Take ${t.id}`:t.name;
  const current=()=>takes.find(t=>t.id===selected);
  function audio(){if(!context){context=new (window.AudioContext||window.webkitAudioContext)();output=context.createGain();output.connect(context.destination);}return context;}
  function position(){return playing?Math.min(current()?.report.duration||0,offset+context.currentTime-startedAt):offset;}
  function stop(){offset=position();playing=false;if(source){source.onended=null;source.stop();source.disconnect();source=null;}$('play').textContent='Play';}
  function gain(){const t=current();if(!t)return;const multiplier=$('match').checked?t.gain:1;if(output)output.gain.setTargetAtTime(multiplier*Number($('volume').value),context.currentTime,.015);$('gain-label').textContent=$('match').checked?`${(20*Math.log10(multiplier)).toFixed(1)} dB playback adjustment`:'Original level';}
  async function play(){
    if(!current())return;
    try{await audio().resume();if(playing)return;const t=current();if(offset>=t.report.duration)offset=0;
      source=context.createBufferSource();source.buffer=t.buffer;source.connect(output);gain();startedAt=context.currentTime;playing=true;
      source.onended=()=>{playing=false;offset=t.report.duration;source=null;$('play').textContent='Play';};source.start(0,offset);$('play').textContent='Pause';
    }catch(error){$('status').textContent=`Playback unavailable: ${error.message}`;}
  }
  function seek(seconds){const resume=playing;stop();offset=Math.max(0,Math.min(seconds,current()?.report.duration||0));if(resume)play();draw();}
  function draw(){
    const t=current();if(!t)return;const canvas=$('waveform'),c=canvas.getContext('2d'),w=canvas.width,h=canvas.height,p=position();c.clearRect(0,0,w,h);
    t.report.waveform.forEach((v,i)=>{c.fillStyle=i/t.report.waveform.length<=p/t.report.duration?'#b8ffcf':'#3b526b';const height=Math.max(2,v*h*.9);c.fillRect(i*w/240,(h-height)/2,Math.max(1,w/240-1),height);});
    $('position').value=p;$('clock').textContent=`${time(p)} / ${time(t.report.duration)}`;
  }
  function renderList(){
    $('workspace').hidden=!takes.length;$('take-list').replaceChildren();
    for(const t of takes){
      const row=document.createElement('div');row.className=`take-row${t.id===selected?' selected':''}`;
      const choose=document.createElement('button');choose.className='take-select';choose.setAttribute('aria-pressed',String(t.id===selected));
      const name=document.createElement('strong');name.textContent=title(t);const meta=document.createElement('small');meta.textContent=`${time(t.report.duration)} · ${t.report.findings.length} listening flags`;
      choose.append(name,meta);choose.onclick=()=>select(t.id);
      const favorite=document.createElement('button');favorite.className='small-button favorite';favorite.textContent=t.favorite?'★ Favorite':'☆ Favorite';favorite.setAttribute('aria-label',`Favorite ${title(t)}`);favorite.setAttribute('aria-pressed',String(t.favorite));favorite.onclick=()=>{t.favorite=!t.favorite;renderList();};
      const remove=document.createElement('button');remove.className='small-button';remove.textContent='Remove';remove.setAttribute('aria-label',`Remove ${title(t)}`);remove.onclick=()=>{
        const active=t.id===selected;if(active)stop();takes.splice(takes.indexOf(t),1);recalculate();
        if(active){selected=null;offset=0;if(takes.length)select(takes[0].id);}renderList();
      };
      row.append(choose,favorite,remove);$('take-list').append(row);
    }
  }
  function select(id){
    const resume=playing,oldPosition=position();stop();selected=id;const t=current();if(!t)return;offset=Math.min(oldPosition,t.report.duration);renderList();
    $('active-title').textContent=title(t);$('position').max=t.report.duration;$('notes').value=t.notes;gain();
    $('metrics').replaceChildren();
    const r=t.report;for(const [label,value] of [['Length',time(r.duration)],['Sample peak',`${r.peakDb.toFixed(1)} dBFS`],['Quiet audio',`${(r.silenceFraction*100).toFixed(1)}%`],['Format',`${r.sampleRate} Hz · ${r.channels} ch`]]){
      const metric=document.createElement('div');metric.className='metric';const a=document.createElement('span'),b=document.createElement('strong');a.textContent=label;b.textContent=value;metric.append(a,b);$('metrics').append(metric);
    }
    $('findings').replaceChildren();
    if(!r.findings.length){const p=document.createElement('p');p.textContent='No flags from these checks. Listen through for musical and vocal issues.';$('findings').append(p);}
    else{const list=document.createElement('ul');list.className='findings-list';r.findings.forEach(f=>{
      const li=document.createElement('li'),button=document.createElement('button'),stamp=document.createElement('time'),label=document.createElement('span');button.className='small-button finding';stamp.textContent=time(f.start);label.textContent=f.label;button.append(stamp,label);button.onclick=()=>{seek(Math.max(0,f.start-.5));if(!playing)play();};li.append(button);list.append(li);
    });$('findings').append(list);}
    draw();if(resume&&offset<t.report.duration)play();
  }
  function recalculate(){const gains=AudioChecks.gains(takes.map(t=>t.report));takes.forEach((t,i)=>t.gain=gains[i]);gain();}
  async function ingest(files){
    if(busy){$('status').textContent='Please wait for the current import to finish.';return;}busy=true;$('takes').disabled=true;
    const messages=[];
    for(const file of files){
      if(takes.length>=6){messages.push('Six-take limit reached. Remove a take to add another.');break;}
      if(file.size>40*1024*1024){messages.push(`${file.name}: exceeds 40 MB.`);continue;}
      $('status').textContent=$('blind').checked?'Decoding and checking audio…':`Decoding and checking ${file.name}…`;
      try{
        const buffer=await audio().decodeAudioData(await file.arrayBuffer());
        if(buffer.duration>360||buffer.numberOfChannels>2)throw Error('Use a take up to 6 minutes with 1 or 2 channels.');
        await new Promise(resolve=>setTimeout(resolve,0));
        const channels=Array.from({length:buffer.numberOfChannels},(_,i)=>buffer.getChannelData(i));
        const report=AudioChecks.analyze(channels,buffer.sampleRate);
        takes.push({id:nextId++,name:file.name,bytes:file.size,buffer,report,favorite:false,notes:'',gain:1});recalculate();
        if(selected===null)select(takes[0].id);else renderList();messages.push(`${file.name}: ready.`);
      }catch(error){messages.push(`${file.name}: could not import. ${error.message}`);}
    }
    busy=false;$('takes').disabled=false;$('takes').value='';$('status').textContent=$('blind').checked?'Import complete. Filenames are hidden. Unreadable or oversized files are skipped.':messages.join('\n')||'No audio selected.';
  }
  $('takes').onchange=e=>ingest([...e.target.files]);const drop=$('drop-area');
  ['dragenter','dragover'].forEach(evt=>drop.addEventListener(evt,e=>{e.preventDefault();drop.classList.add('dragging');}));
  ['dragleave','drop'].forEach(evt=>drop.addEventListener(evt,e=>{e.preventDefault();drop.classList.remove('dragging');}));
  drop.addEventListener('drop',e=>ingest([...e.dataTransfer.files]));
  $('play').onclick=()=>playing?stop():play();$('position').oninput=e=>seek(Number(e.target.value));$('volume').oninput=gain;$('match').onchange=gain;
  $('blind').onchange=()=>{renderList();if(current())$('active-title').textContent=title(current());$('status').textContent=$('blind').checked?'Filenames hidden. Take order is unchanged; this is not a randomized blind trial.':'';};
  $('notes').oninput=e=>{if(current())current().notes=e.target.value;};
  $('export-session').onclick=()=>{
    const hidden=$('blind').checked;
    const report={schema_version:'harmoness-listening-session/v1',created_at:new Date().toISOString(),audio_included:false,level_matching:'whole-track RMS; attenuation only; approximate, not LUFS',filenames_hidden:hidden,checks_version:'audio-checks/v1',thresholds:{silence_rms:.002,silence_min_seconds:1,near_full_scale:.999,level_change_db:8,level_window_seconds:5},takes:takes.map(t=>({id:t.id,name:title(t),bytes:t.bytes,favorite:t.favorite,notes:t.notes,playback_gain:t.gain,measurements:t.report}))};
    const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='harmoness-listening-session.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    $('status').textContent=hidden?'Report exported with take labels; filenames omitted. Audio is not included.':'Report exported. Audio is not included.';
  };
  function tick(){if(playing)draw();requestAnimationFrame(tick);}tick();
  if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./service-worker.js').catch(()=>{}));
})();
