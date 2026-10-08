(function(root){
const notes=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
function validate(brief){
 if(!brief||brief.schema_version!=='harmoness-brief/v1'||!Array.isArray(brief.mapping)||brief.mapping.length<1||brief.mapping.length>12||!['resolution','staged','simultaneous','reverse'].includes(brief.condition)||typeof brief.prompt!=='string'||brief.prompt.length>30000)throw Error('Invalid composition brief');
 for(const x of brief.mapping)if(typeof x.principle!=='string'||x.principle.length>80||!notes.includes(x.note))throw Error('Invalid musical identity');
 return JSON.parse(JSON.stringify(brief));
}
function check(channels,rate,raw){
 const brief=validate(raw),length=channels[0].length,path=brief.condition==='reverse'?[...brief.mapping].reverse():brief.mapping;
 const sections=path.map((item,i)=>{
  const start=brief.condition==='simultaneous'?0:i/path.length,end=brief.condition==='simultaneous'?1:(i+1)/path.length;
  const from=Math.floor(start*length),region=Math.max(1,Math.floor(end*length)-from),size=Math.min(4096,region),energies=Array(12).fill(0),count=Math.min(16,Math.max(1,Math.floor(region/size)));
  for(const samples of channels)for(let f=0;f<count;f++){
   const pos=from+(count===1?0:Math.floor((region-size)*f/(count-1)));
   for(let midi=36;midi<=96;midi++){
    const coefficient=2*Math.cos(2*Math.PI*440*Math.pow(2,(midi-69)/12)/rate);let s1=0,s2=0;
    for(let n=pos;n<pos+size;n++){const s=samples[n]+coefficient*s1-s2;s2=s1;s1=s;}
    energies[midi%12]+=Math.max(0,s1*s1+s2*s2-coefficient*s1*s2);
   }
  }
  const fraction=energies[notes.indexOf(item.note)]/(energies.reduce((a,b)=>a+b,0)||1);
  return {principle:item.principle,note:item.note,start:start*length/rate,end:end*length/rate,target_fraction:fraction,pass:fraction>=.08};
 });
 return {schema_version:'harmoness-pitch-preview/v1',canonical:false,method:'sparse Goertzel pitch-class energy; channels measured separately',brief,sections,pass:sections.every(x=>x.pass)};
}
const api={validate,check};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.PitchChecks=api;
})(globalThis);
