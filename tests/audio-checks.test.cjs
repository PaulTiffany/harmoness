const {test}=require('node:test');
const assert=require('node:assert/strict');
const {analyze,gains}=require('../site/audio-checks.js');
const rate=8000;
function sine(seconds,amplitude=.2){return Float32Array.from({length:seconds*rate},(_,i)=>amplitude*Math.sin(2*Math.PI*200*i/rate));}
test('clean tone has no full-scale or silent flags',()=>{const r=analyze([sine(12)],rate);assert.equal(r.duration,12);assert.equal(r.nearFullSamples,0);assert.equal(r.silenceFraction,0);assert(!r.findings.some(f=>['peak','silence','level'].includes(f.type)));});
test('opposite stereo channels do not cancel in measurements',()=>{const a=sine(2),b=Float32Array.from(a,x=>-x);assert.equal(analyze([a,b],rate).silenceFraction,0);});
test('silence and near-full-scale passages have timestamps',()=>{const a=sine(5);a.fill(0,rate,3*rate);a.fill(1,4*rate);const r=analyze([a],rate);assert(r.findings.some(f=>f.type==='silence'&&f.start===1&&f.end===3));assert(r.findings.some(f=>f.type==='peak'&&f.start===4));assert(r.findings.some(f=>f.type==='ending'));});
test('large level transition is flagged',()=>{const a=sine(10,.03);a.set(sine(5,.3),5*rate);assert(analyze([a],rate).findings.some(f=>f.type==='level'));});
test('matching equalizes RMS without amplification or peak overload',()=>{const reports=[analyze([sine(3,.8)],rate),analyze([sine(3,.1)],rate)];const g=gains(reports);assert(g.every(x=>x<=1));assert(Math.abs(reports[0].rmsDb+20*Math.log10(g[0])-reports[1].rmsDb-20*Math.log10(g[1]))<1e-8);assert(reports.every((r,i)=>r.peak*g[i]<=Math.pow(10,-1/20)));});
test('silent take does not mute other takes',()=>{const r=[analyze([new Float32Array(rate)],rate),analyze([sine(1)],rate)];assert.deepEqual(gains(r),[1,1]);});
