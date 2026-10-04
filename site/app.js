const FIFTHS = ["C","G","D","A","E","B","F#","C#","G#","D#","A#","F"];
const NOTE_INDEX = {"C":0,"C#":1,"D":2,"D#":3,"E":4,"F":5,"F#":6,"G":7,"G#":8,"A":9,"A#":10,"B":11};
const ROLE_OPTIONS = ["tonal center","supporting voice","tension voice","countervoice","bass / pedal","foreground melody"];
const CACOPHONY = [
  {principle:"Helpful",note:"C",role:"tonal center",prominence:5},
  {principle:"Harmless",note:"G",role:"supporting voice",prominence:4},
  {principle:"Honest",note:"D",role:"tension voice",prominence:4},
  {principle:"Autonomy",note:"A",role:"countervoice",prominence:3}
];
const CLAUDE_2026 = [
  {principle:"Broadly safe",note:"C",role:"bass / pedal",prominence:5},
  {principle:"Broadly ethical",note:"G",role:"supporting voice",prominence:4},
  {principle:"Anthropic guidelines",note:"D",role:"countervoice",prominence:3},
  {principle:"Genuinely helpful",note:"A",role:"foreground melody",prominence:2}
];
let state = { mapping: structuredClone(CACOPHONY) };
let audioContext;
let lastReceipt = null;

function ctx(){ if(!audioContext) audioContext = new (window.AudioContext||window.webkitAudioContext)(); return audioContext; }
function freqFor(note, octave=4){ const midi = 12*(octave+1)+NOTE_INDEX[note]; return 440*Math.pow(2,(midi-69)/12); }
function tone(frequency,duration=.42,startDelay=0){
  const c=ctx(),start=c.currentTime+startDelay,osc=c.createOscillator(),gain=c.createGain();
  osc.type="sine";osc.frequency.value=frequency;gain.gain.setValueAtTime(.0001,start);
  gain.gain.exponentialRampToValueAtTime(.17,start+.025);gain.gain.exponentialRampToValueAtTime(.0001,start+duration);
  osc.connect(gain).connect(c.destination);osc.start(start);osc.stop(start+duration+.03);
}
function toast(message){ const el=document.getElementById("toast");el.textContent=message;el.classList.add("show");clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove("show"),1600); }
function cleanPrinciple(value,i){ return String(value||`Principle ${i+1}`).trim().slice(0,80)||`Principle ${i+1}`; }
function ensureMapping(){
  state.mapping = state.mapping.slice(0,12).map((x,i)=>({
    principle:cleanPrinciple(x.principle,i),
    note:FIFTHS.includes(x.note)?x.note:FIFTHS[i%FIFTHS.length],
    role:ROLE_OPTIONS.includes(x.role)?x.role:"supporting voice",
    prominence:Math.max(1,Math.min(5,Number(x.prominence)||3))
  }));
  if(!state.mapping.length) state.mapping=[{principle:"Principle 1",note:"C",role:"tonal center",prominence:5}];
}
function encodeState(){ return btoa(unescape(encodeURIComponent(JSON.stringify({v:1,mapping:state.mapping})))).replace(/=+$/,""); }
function decodeState(raw){
  try{ const pad=raw+"===".slice((raw.length+3)%4); const obj=JSON.parse(decodeURIComponent(escape(atob(pad)))); if(obj&&Array.isArray(obj.mapping)) return obj.mapping; }catch(e){}
  return null;
}
function loadHash(){
  const m=location.hash.match(/(?:^#|&)map=([^&]+)/); if(!m)return false;
  const decoded=decodeState(m[1]); if(decoded){state.mapping=decoded;ensureMapping();return true;} return false;
}
function pathForCondition(){
  const condition=document.getElementById("condition")?.value||"resolution";
  const base=[...state.mapping];
  return condition==="reverse"?base.reverse():base;
}
function formatPath(mapping=pathForCondition()){ return mapping.map(x=>`${x.note}/${x.principle}`).join(" → "); }

function renderEditor(){
  const root=document.getElementById("principle-editor");root.innerHTML="";
  state.mapping.forEach((item,i)=>{
    const row=document.createElement("div");row.className="principle-row";
    row.innerHTML=`
      <button class="row-order" type="button" aria-label="Move ${item.principle} up">${i?"↑":"·"}</button>
      <input class="row-name" value="${escapeHtml(item.principle)}" aria-label="Principle name">
      <select class="row-note" aria-label="Pitch class">${FIFTHS.map(n=>`<option ${n===item.note?"selected":""}>${n}</option>`).join("")}</select>
      <select class="row-role" aria-label="Musical role">${ROLE_OPTIONS.map(r=>`<option ${r===item.role?"selected":""}>${r}</option>`).join("")}</select>
      <button class="row-remove" type="button" aria-label="Remove ${item.principle}">×</button>`;
    const [up,name,note,role,remove]=row.children;
    up.addEventListener("click",()=>{if(i>0){[state.mapping[i-1],state.mapping[i]]=[state.mapping[i],state.mapping[i-1]];changed();}});
    name.addEventListener("input",e=>{state.mapping[i].principle=cleanPrinciple(e.target.value,i);renderMapOnly();});
    note.addEventListener("change",e=>{state.mapping[i].note=e.target.value;renderMapOnly();});
    role.addEventListener("change",e=>{state.mapping[i].role=e.target.value;renderMapOnly();});
    remove.addEventListener("click",()=>{if(state.mapping.length>1){state.mapping.splice(i,1);changed();}});
    root.appendChild(row);
  });
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function renderMapOnly(){
  ensureMapping();
  const wheel=document.getElementById("dynamic-wheel");
  [...wheel.querySelectorAll(".wheel-node")].forEach(n=>n.remove());
  const n=state.mapping.length;
  state.mapping.forEach((item,i)=>{
    const angle=(-Math.PI/2)+(i*2*Math.PI/n), radius=39;
    const x=50+radius*Math.cos(angle),y=50+radius*Math.sin(angle);
    const b=document.createElement("button");b.type="button";b.className="wheel-node";b.style.left=`${x}%`;b.style.top=`${y}%`;
    b.innerHTML=`<strong>${item.note}</strong><span>${escapeHtml(item.principle)}</span><small>${escapeHtml(item.role)}</small>`;
    b.addEventListener("click",()=>tone(freqFor(item.note),.55));
    wheel.appendChild(b);
  });
  document.getElementById("mapping-strip").innerHTML=state.mapping.map((x,i)=>`<span class="map-pill"><b>${i+1}</b> ${escapeHtml(x.principle)} → ${x.note}</span>`).join("");
  syncDerived();
}
function changed(){ ensureMapping();renderEditor();renderMapOnly(); }
function syncDerived(){ buildPrompt();renderVerifyContract(); }

document.getElementById("preset").addEventListener("change",e=>{
  state.mapping=e.target.value==="cacophony"
    ? structuredClone(CACOPHONY)
    : e.target.value==="claude2026"
      ? structuredClone(CLAUDE_2026)
      : FIFTHS.slice(0,4).map((note,i)=>({principle:`Principle ${i+1}`,note,role:i===0?"tonal center":"supporting voice",prominence:3}));
  changed();
});
document.getElementById("add-principle").addEventListener("click",()=>{if(state.mapping.length<12){const i=state.mapping.length;state.mapping.push({principle:`Principle ${i+1}`,note:FIFTHS[i%12],role:"supporting voice",prominence:3});changed();}});
document.getElementById("reset-map").addEventListener("click",()=>{state.mapping=structuredClone(CACOPHONY);document.getElementById("preset").value="cacophony";changed();});
document.getElementById("apply-lines").addEventListener("click",()=>{
  const lines=document.getElementById("principle-lines").value.split(/\n+/).map(x=>x.trim()).filter(Boolean).slice(0,12);
  if(!lines.length){toast("Paste at least one principle");return;}
  state.mapping=lines.map((principle,i)=>({principle,note:FIFTHS[i%12],role:i===0?"tonal center":"supporting voice",prominence:3}));
  changed();toast(`Mapped ${lines.length} principle${lines.length===1?"":"s"}`);
});
document.getElementById("share-map").addEventListener("click",async()=>{
  history.replaceState(null,"",`${location.pathname}${location.search}#map=${encodeState()}`);
  await navigator.clipboard.writeText(location.href);toast("Share link copied");
});
document.getElementById("export-spec").addEventListener("click",()=>{
  const spec={schema_version:"harmoness-browser-map/v1",created_by:"Harmoness Pages",mapping:state.mapping,order_semantics:"mapping order is the default Circle-of-Fifths walk"};
  downloadJson(spec,"harmoness-map.json");
});
document.getElementById("play-current-map").addEventListener("click",()=>state.mapping.forEach((x,i)=>tone(freqFor(x.note),.48,i*.36)));

const moodText={
  artpop:"emotionally serious art-pop, intimate close vocal, piano and warm analog synths, sophisticated pop harmony, deep low end, pristine modern mix",
  ambient:"deep environmental ambient music, organic field-like textures, evolving harmonic drones, restrained pulse, naturalistic spatial depth, no bombast",
  synthpop:"cinematic synth-pop, strong melodic hook, luminous analog pads, detailed electronic percussion, wide but controlled mix, emotionally sincere",
  vocal:"modern a cappella and vocal counterpoint, close human voices, layered bass and inner parts, precise tuning, expressive lead, minimal non-vocal percussion",
  tape:"tape-loop solo artist, intimate handmade performance, layered loops accumulating gradually, audible tape texture, restrained instrumentation, strong motif memory"
};
function buildPrompt(){
  const condition=document.getElementById("condition")?.value||"resolution";
  const mood=document.getElementById("mood")?.value||"artpop";
  const seconds=Number(document.getElementById("duration")?.value||180);
  const path=pathForCondition();
  const identities=state.mapping.map(x=>`${x.principle}=${x.note} (${x.role})`).join(", ");
  const pathText=formatPath(path);
  const organization={
    resolution:`Form: establish the identities progressively in this order: ${pathText}. In the first large section, let the active identities overlap and become dense without becoming random. Then strip back and reintroduce the same identities one at a time in that order. The final large section should preserve the same information through call-and-response, counterpoint, recurrence, and clearer temporal organization. Return convincingly toward the first tonal identity at the end.`,
    staged:`Form: stage the identities in exactly this order: ${pathText}. Each new stage must preserve or recall recognizable material from earlier stages rather than simply replacing it. End by integrating all identities through temporal counterpoint.`,
    simultaneous:`Form: expose all mapped identities concurrently in the principal section. Preserve each identity as a recognizable musical strand using layered motifs, voicing, orchestration, or counterpoint. Do not solve density by silently deleting one identity.`,
    reverse:`CONTROL CONDITION. Stage the same identities in reverse order: ${pathText}. Preserve earlier motifs as later identities enter. Treat the result as sincere music, not a joke or error condition.`
  }[condition];
  const text=[
    `Target ~${Math.round(seconds/6)/10} minutes. ${moodText[mood]}.`,
    `Musical identity map: ${identities}. These are recurring compositional identities, not literal spoken labels and not moral scores.`,
    organization,
    "Use tension musically: seconds, suspensions, altered color, register, and rhythmic friction may express competing identities without simply making the track ugly. Keep a memorable musical argument, strong sectional contrast, motif recurrence, and professional production. No spoken technical exposition. The computation should shape the form underneath a real piece of music."
  ].join(" ");
  const out=document.getElementById("prompt-output");out.value=text;
  document.getElementById("prompt-count").textContent=`${text.length} characters`;
  document.getElementById("prompt-path").textContent=condition==="simultaneous"?"all identities together":path.map(x=>x.note).join(" → ");
  document.getElementById("path-value").textContent=condition==="simultaneous"?"simultaneous":path.map(x=>x.note).join(" · ");
}
["condition","mood","duration"].forEach(id=>document.getElementById(id).addEventListener("change",syncDerived));
document.getElementById("generate-prompt").addEventListener("click",buildPrompt);
document.getElementById("copy-prompt").addEventListener("click",async()=>{await navigator.clipboard.writeText(document.getElementById("prompt-output").value);toast("Prompt copied");});
document.getElementById("copy-manifest").addEventListener("click",async()=>{
  const manifest=manifestTemplate();await navigator.clipboard.writeText(JSON.stringify(manifest,null,2));toast("Witness manifest copied");
});

function manifestTemplate(){
  const condition=document.getElementById("condition").value,path=pathForCondition(),n=path.length;
  const sections=condition==="simultaneous"
    ? path.map((x,i)=>({label:`${x.principle}-full`,start_frac:0,end_frac:1,expected_pitch_classes:[x.note],min_target_fraction:.08}))
    : path.map((x,i)=>({label:x.principle,start_frac:i/n,end_frac:(i+1)/n,expected_pitch_classes:[x.note],min_target_fraction:.08}));
  return {schema_version:"harmoness-generation/v0",provenance:{provider:"suno",model:"record provider model/version",generation_id:"record generation id",prompt:document.getElementById("prompt-output").value},condition,audio:{path:"audio.wav"},checks:{duration_sec:{min:30,max:360},silence_fraction:{max:.20},sections}};
}
function renderVerifyContract(){
  if(!document.getElementById("verify-contract"))return;
  const condition=document.getElementById("condition")?.value||"resolution",path=pathForCondition();
  document.getElementById("verify-contract").innerHTML=[
    `<span class="contract-pill"><b>mode</b> ${condition}</span>`,
    ...path.map(x=>`<span class="contract-pill"><b>${x.note}</b> ${escapeHtml(x.principle)}</span>`)
  ].join("");
}

function goertzel(samples,sampleRate,frequency,start,length){
  const omega=2*Math.PI*frequency/sampleRate,coeff=2*Math.cos(omega);let s0=0,s1=0,s2=0;const end=Math.min(samples.length,start+length);
  for(let i=start;i<end;i++){s0=samples[i]+coeff*s1-s2;s2=s1;s1=s0;} return Math.max(0,s1*s1+s2*s2-coeff*s1*s2);
}
function pitchClassEnergy(samples,sampleRate,startFrac,endFrac){
  const start=Math.floor(samples.length*startFrac),end=Math.floor(samples.length*endFrac),regionLength=Math.max(1,end-start);
  const frameLength=Math.min(4096,regionLength),frameCount=Math.min(16,Math.max(4,Math.floor(regionLength/frameLength))),energies=new Array(12).fill(0),frequencies=[];
  for(let midi=36;midi<=96;midi++) frequencies.push({pc:midi%12,hz:440*Math.pow(2,(midi-69)/12)});
  for(let f=0;f<frameCount;f++){const pos=frameCount===1?start:start+Math.floor((regionLength-frameLength)*f/(frameCount-1));
    for(const item of frequencies) energies[item.pc]+=goertzel(samples,sampleRate,item.hz,pos,frameLength);
  }
  const total=energies.reduce((a,b)=>a+b,0)||1;return energies.map(v=>v/total);
}
function silenceFraction(samples,sampleRate){
  const frame=Math.max(1,Math.floor(sampleRate*.05));let silent=0,total=0;
  for(let i=0;i<samples.length;i+=frame){let sum=0,end=Math.min(samples.length,i+frame);for(let j=i;j<end;j++)sum+=samples[j]*samples[j];const rms=Math.sqrt(sum/Math.max(1,end-i));if(rms<.002)silent++;total++;}
  return total?silent/total:1;
}
function mono(buffer){const out=new Float32Array(buffer.length);for(let ch=0;ch<buffer.numberOfChannels;ch++){const data=buffer.getChannelData(ch);for(let i=0;i<out.length;i++)out[i]+=data[i]/buffer.numberOfChannels;}return out;}

async function analyzeFile(file){
  const panel=document.getElementById("analysis");panel.classList.remove("hidden");
  document.getElementById("verdict-title").textContent="Analyzing…";document.getElementById("verdict-chip").className="verdict pending";document.getElementById("verdict-chip").textContent="…";document.getElementById("file-meta").textContent=file.name;
  const bytes=await file.arrayBuffer(),buffer=await ctx().decodeAudioData(bytes.slice(0)),samples=mono(buffer),duration=buffer.duration,silence=silenceFraction(samples,buffer.sampleRate);
  const condition=document.getElementById("condition").value,path=pathForCondition(),n=path.length;
  const sectionData=path.map((item,i)=>{
    const startFrac=condition==="simultaneous"?0:i/n,endFrac=condition==="simultaneous"?1:(i+1)/n;
    const energy=pitchClassEnergy(samples,buffer.sampleRate,startFrac,endFrac),fraction=energy[NOTE_INDEX[item.note]];
    return {principle:item.principle,note:item.note,start_frac:startFrac,end_frac:endFrac,target_fraction:fraction,pass:fraction>=.08};
  });
  const durationPass=duration>=30&&duration<=360,silencePass=silence<=.20,overall=durationPass&&silencePass&&sectionData.every(x=>x.pass);
  document.getElementById("duration-value").textContent=`${duration.toFixed(1)} s ${durationPass?"✓":"×"}`;document.getElementById("silence-value").textContent=`${(silence*100).toFixed(1)}% ${silencePass?"✓":"×"}`;
  document.getElementById("section-results").innerHTML=sectionData.map((x,i)=>`<div class="section-card ${x.pass?"pass":"fail"}"><small>${condition==="simultaneous"?"full track":`region ${i+1}`} · ${escapeHtml(x.principle)}</small><div class="big-note">${x.note}</div><div class="pct">${(x.target_fraction*100).toFixed(1)}%</div><div class="energy-bar"><span style="width:${Math.min(100,x.target_fraction*500)}%"></span></div><small>${x.pass?"target present":"below 8% threshold"}</small></div>`).join("");
  const chip=document.getElementById("verdict-chip");chip.className=`verdict ${overall?"pass":"fail"}`;chip.textContent=overall?"PASS":"FAIL";document.getElementById("verdict-title").textContent=overall?"The declared map survived this preview.":"This render drifted from the declared map.";
  lastReceipt={schema_version:"harmoness-browser-receipt/v1",canonical:false,map:state.mapping,condition,file:{name:file.name,type:file.type,bytes:file.size},audio:{duration_sec:Number(duration.toFixed(6)),sample_rate:buffer.sampleRate,channels:buffer.numberOfChannels,silence_fraction:Number(silence.toFixed(6))},checks:{duration:{pass:durationPass,min:30,max:360},silence:{pass:silencePass,max:.20},sections:sectionData.map(x=>({...x,target_fraction:Number(x.target_fraction.toFixed(6))))},verdict:overall?"PASS":"FAIL"};
  document.getElementById("download-receipt").disabled=false;
}
const input=document.getElementById("audio-file");input.addEventListener("change",()=>{if(input.files?.[0])analyzeFile(input.files[0]).catch(showError);});
const dropzone=document.getElementById("dropzone");["dragenter","dragover"].forEach(evt=>dropzone.addEventListener(evt,e=>{e.preventDefault();dropzone.style.borderColor="var(--accent)";}));["dragleave","drop"].forEach(evt=>dropzone.addEventListener(evt,e=>{e.preventDefault();dropzone.style.borderColor="";}));dropzone.addEventListener("drop",e=>{const file=e.dataTransfer.files?.[0];if(file)analyzeFile(file).catch(showError);});
function showError(error){document.getElementById("analysis").classList.remove("hidden");document.getElementById("verdict-title").textContent="Could not decode this audio file.";const chip=document.getElementById("verdict-chip");chip.className="verdict fail";chip.textContent="ERROR";document.getElementById("file-meta").textContent=error.message||String(error);}
function downloadJson(obj,name){const blob=new Blob([JSON.stringify(obj,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=name;a.click();URL.revokeObjectURL(url);}
document.getElementById("download-receipt").addEventListener("click",()=>{if(lastReceipt)downloadJson(lastReceipt,"harmoness-browser-receipt.json");});

if("serviceWorker" in navigator) window.addEventListener("load",()=>navigator.serviceWorker.register("./service-worker.js").catch(()=>{}));
loadHash();changed();
