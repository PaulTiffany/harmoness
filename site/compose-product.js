/* Product bridge: freeze the exact map and edited direction before leaving Compose. */
(() => {
 const $=id=>document.getElementById(id);
 const draft=()=>({mapping:structuredClone(state.mapping),condition:$('condition').value,mood:$('mood').value,duration:$('duration').value,prompt:$('prompt-output').value});
 function save(){try{localStorage.setItem('harmoness-compose-draft',JSON.stringify(draft()));}catch{}}
 try{if(!location.hash.includes('map=')){const raw=JSON.parse(localStorage.getItem('harmoness-compose-draft')||'null');if(raw&&Array.isArray(raw.mapping)){state.mapping=raw.mapping;ensureMapping();for(const id of ['condition','mood','duration'])if([...$(id).options].some(o=>o.value===raw[id]))$(id).value=raw[id];changed();if(typeof raw.prompt==='string')$('prompt-output').value=raw.prompt.slice(0,30000);}}}catch{}
 const count=()=>$('prompt-count').textContent=`${$('prompt-output').value.length} characters`;
 $('prompt-output').addEventListener('input',()=>{count();save();invalidateReceipt();});
 document.addEventListener('change',save);document.addEventListener('click',()=>setTimeout(save,0));
 $('compact-prompt').onclick=()=>{const path=pathForCondition();const identities=path.map(x=>`${x.principle.slice(0,24)}=${x.note}`).join(', ');const mood=moodText[$('mood').value];const organization=$('condition').value==='simultaneous'?'Layer these identities together as recurring voices.':'Introduce these identities in the listed order; recall earlier material as new voices enter.';$('prompt-output').value=`${mood}. About ${Number($('duration').value)/60} minutes. Identities: ${identities}. ${organization} Expressive performance, clear sectional contrast, recurring motifs. No spoken technical labels.`.slice(0,900);count();save();invalidateReceipt();toast('Compact direction ready to edit or copy');};
 $('send-brief').onclick=()=>{const d=draft(),brief={schema_version:'harmoness-brief/v1',created_at:new Date().toISOString(),mapping:d.mapping,condition:d.condition,prompt:d.prompt,duration:Number(d.duration)};try{localStorage.setItem('harmoness-brief',JSON.stringify(brief));save();sessionStorage.setItem('harmoness-apply-brief','1');location.href='./#brief';}catch{toast('Device storage unavailable. Export your spec and copy your prompt instead.');}};
 $('generate-prompt').addEventListener('click',()=>{invalidateReceipt();count();save();});
 count();
})();
