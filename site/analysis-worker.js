importScripts('./audio-checks.js','./pitch-checks.js');
self.onmessage=event=>{const {id,kind,channels,rate,brief}=event.data;try{self.postMessage({id,result:kind==='pitch'?PitchChecks.check(channels,rate,brief):AudioChecks.analyze(channels,rate)});}catch(error){self.postMessage({id,error:error.message});}};
