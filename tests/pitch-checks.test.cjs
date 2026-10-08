const {test}=require('node:test'),assert=require('node:assert/strict');
const {check,validate}=require('../site/pitch-checks.js');
const rate=8000,sine=frequency=>Float32Array.from({length:rate*2},(_,i)=>.3*Math.sin(2*Math.PI*frequency*i/rate));
const brief={schema_version:'harmoness-brief/v1',mapping:[{principle:'Root',note:'C'}],condition:'staged',prompt:'C motif'};
test('known C is detected and an unrelated pitch fails',()=>{assert(check([sine(261.625565)],rate,brief).pass);assert(!check([sine(277.182631)],rate,brief).pass);});
test('opposite-phase stereo keeps pitch evidence',()=>{const x=sine(261.625565);assert(check([x,Float32Array.from(x,v=>-v)],rate,brief).pass);});
test('brief validation rejects unknown notes and excess mappings',()=>{assert.throws(()=>validate({...brief,mapping:[{principle:'Bad',note:'Z'}]}));assert.throws(()=>validate({...brief,mapping:Array(13).fill(brief.mapping[0])}));});
test('result holds a snapshot independent of later brief edits',()=>{const source=structuredClone(brief),result=check([sine(261.625565)],rate,source);source.mapping[0].note='D';assert.equal(result.brief.mapping[0].note,'C');});
