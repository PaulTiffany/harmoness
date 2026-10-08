/* Original synthesized listening examples. No service call or downloaded music. */
window.HarmonessDemo={
  wav(samples,rate){const b=new ArrayBuffer(44+samples.length*2),v=new DataView(b);const text=(at,s)=>[...s].forEach((c,i)=>v.setUint8(at+i,c.charCodeAt(0)));text(0,'RIFF');v.setUint32(4,b.byteLength-8,true);text(8,'WAVEfmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,rate,true);v.setUint32(28,rate*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);text(36,'data');v.setUint32(40,samples.length*2,true);samples.forEach((x,i)=>v.setInt16(44+i*2,Math.round(Math.max(-1,Math.min(1,x))*32767),true));return b;},
  files(){const rate=16000,duration=20,base=new Float32Array(rate*duration),chords=[[60,64,67],[55,59,62],[57,60,64],[53,57,60]];
    for(let i=0;i<base.length;i++){const t=i/rate,bar=Math.floor(t/4)%4,beat=t%0.5,note=chords[bar][Math.floor(t*2)%3]+12,f=440*Math.pow(2,(note-69)/12),env=Math.exp(-beat*7)*Math.min(1,beat*180);const pluck=(Math.sin(2*Math.PI*f*t)+.22*Math.sin(4*Math.PI*f*t))*.16*env;const bass=440*Math.pow(2,(chords[bar][0]-24-69)/12);base[i]=(pluck+.09*Math.sin(2*Math.PI*bass*t)*Math.exp(-(t%2)*1.8))*Math.min(1,t*5,(duration-t)*2);}
    return [['Demo — warm original.wav',1,false],['Demo — louder twin.wav',2.5,false],['Demo — rough edit.wav',5,true]].map(([name,gain,rough])=>{
      const samples=Float32Array.from(base,(x,i)=>rough&&i/rate>8&&i/rate<9.5?0:Math.max(-1,Math.min(1,x*gain)));
      if(rough)samples.fill(.6,samples.length-1600);
      return new File([this.wav(samples,rate)],name,{type:'audio/wav'});
    });
  }
};
