/* Measurements on decoded samples. Heuristics flag passages for listening, not quality verdicts. */
(function(root){
  const db = value => value > 0 ? 20*Math.log10(value) : -120;
  function analyze(channels, rate){
    if(!channels.length || !channels[0].length || !(rate>0)) throw Error('Empty audio');
    const length=channels[0].length, duration=length/rate, frames=[], waveform=[];
    let peak=0, sum=0, nearFull=0;
    const frameSize=Math.max(1,Math.round(rate*.05));
    for(let start=0;start<length;start+=frameSize){
      let energy=0, framePeak=0, hot=0;
      const end=Math.min(length,start+frameSize);
      for(const channel of channels) for(let i=start;i<end;i++){
        const v=Math.abs(channel[i]); energy+=v*v; framePeak=Math.max(framePeak,v); if(v>=.999)hot++;
      }
      sum+=energy;peak=Math.max(peak,framePeak);nearFull+=hot;
      frames.push({start:start/rate,end:end/rate,rms:Math.sqrt(energy/((end-start)*channels.length)),peak:framePeak,hot});
    }
    for(let b=0;b<240;b++){
      const from=Math.floor(b*frames.length/240),to=Math.max(from+1,Math.floor((b+1)*frames.length/240));
      waveform.push(Math.max(0,...frames.slice(from,to).map(f=>f.peak)));
    }
    const findings=[];
    function ranges(predicate,minSeconds,type,label){
      let first=null,last=null;
      function flush(){if(first!==null&&last-first>=minSeconds-1e-6)findings.push({type,label,start:first,end:last});first=null;}
      for(const f of frames){if(predicate(f)){if(first===null)first=f.start;last=f.end;}else flush();}flush();
    }
    ranges(f=>f.rms<.002,1,'silence','Very quiet passage (at least 1 second)');
    ranges(f=>f.hot>0,0,'peak','Samples near full scale — check for distortion');
    const tail=frames.slice(-2);
    if(duration>1&&tail.length&&tail.every(f=>db(f.rms)>-30)&&Math.max(...channels.map(c=>Math.abs(c[length-1])))>.01)
      findings.push({type:'ending',label:'Possible abrupt ending — listen to the final seconds',start:Math.max(0,duration-3),end:duration});
    // Adjacent five-second windows; arrangement changes can legitimately trigger this.
    const windows=[];
    for(let t=0;t+10<=duration;t+=5){
      const a=frames.filter(f=>f.start>=t&&f.start<t+5),b=frames.filter(f=>f.start>=t+5&&f.start<t+10);
      const rms=fs=>Math.sqrt(fs.reduce((s,f)=>s+f.rms*f.rms,0)/fs.length);
      const left=rms(a),right=rms(b),delta=db(right)-db(left);
      if(left>.002&&right>.002&&Math.abs(delta)>=8)windows.push({type:'level',label:`Level ${delta>0?'rises':'falls'} ${Math.abs(delta).toFixed(1)} dB across this passage`,start:t,end:t+10});
    }
    findings.push(...windows);findings.sort((a,b)=>a.start-b.start);
    return {duration,sampleRate:rate,channels:channels.length,peakDb:db(peak),rmsDb:db(Math.sqrt(sum/(length*channels.length))),peak,nearFullSamples:nearFull,silenceFraction:frames.filter(f=>f.rms<.002).reduce((s,f)=>s+f.end-f.start,0)/duration,waveform,findings};
  }
  // Attenuation only: all non-silent takes share the quietest RMS; each remains below -1 dBFS.
  function gains(reports){
    const eligible=reports.filter(r=>r.rmsDb>-70);
    const target=eligible.length?Math.min(...eligible.map(r=>r.rmsDb),...eligible.map(r=>r.rmsDb-1-r.peakDb)):-70;
    return reports.map(r=>r.rmsDb<=-70?1:Math.min(1,Math.pow(10,(target-r.rmsDb)/20)));
  }
  const api={analyze,gains};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.AudioChecks=api;
})(globalThis);
