"use strict";
const assert=require("node:assert/strict"),P=require("../core.js");
const {training,makeWorld,intrude,hub,hamming,maskCompare,bench,Loop}=P;
for(let r=0;r<16;r++)for(let w=0;w<16;w++){
 assert.equal(P.errorLUT[(r<<4)|w],r^w,"one-wire XOR error truth table");
 assert.equal(P.nextLUT[(r<<4)|w],w,"band-pass write and erase");
}
const frames=training("orbit");
assert.equal(frames.length,16);assert.equal(frames[0].length,4096);
for(let t=0;t<16;t++)for(const d of [-1,0,1]){
 const world=makeWorld(frames,t,d);
 const result=hub(frames,world,t,0,1);
 assert.equal(result.mismatch,0,"global jitter d="+d+" t="+t);
 assert.equal(result.delta,d,"phase identified d="+d+" t="+t);
}
let example=makeWorld(frames,11,1);
assert(hamming(example,frames[11])>0);
assert.equal(hamming(example,frames[12]),0);
intrude(example,26,26,8,15);
const h=hub(frames,example,11,0,1);
assert.equal(h.delta,1);
const corrected=maskCompare(example,frames[12]);
assert.equal(corrected.error,256,"local eight-by-eight, four-plane novelty survives phase correction");
const raw=maskCompare(example,frames[11]);
assert(raw.error>corrected.error);
let learned=new Loop("orbit",16,"hub");
for(let t=0;t<32;t++){
 const o=learned.step(0);
 if(t>=16)assert.equal(o.errorBits,0,"one lap writes exact 16-step scene");
}
for(let t=32;t<48;t++){
 const delta=t%3-1,o=learned.step(delta);
 assert.equal(o.selected,delta,"hub follows global phase shift");
 assert.equal(o.errorBits,0,"periodic scene quiet after alignment");
}
const before=learned.step(0,{paint:true,feedback:false});
assert.equal(before.errorBits,256,"true local change visible");
let after=learned.step(0);assert.equal(after.errorBits,0);
const b=bench({seed:97,ticks:128,jitter:1,patchAt:[49,65,81]});
assert(b.counts.raw.fp>0);
assert.equal(b.counts.hub.fp,0);
assert.equal(b.counts.hub.tp,3*256);
assert.equal(b.counts.hub.fn,0);
assert(b.counts.sustained_K3.tp<b.counts.hub.tp,"smoothing loses brief novelty");
const split=bench({kind:"split",ticks:64,jitter:0,patchAt:[]});
assert(split.counts.hub.fp>0,"one global phase cannot explain two region phases");
const again=bench({seed:97,ticks:128,jitter:1,patchAt:[49,65,81]});
assert.deepEqual(b.counts,again.counts,"deterministic benchmark");
console.log("PASS: band LUT, 48 phase checks, 16-step learning, jitter, 8x8 novelty, temporal filter, split-motion limit");
console.log(JSON.stringify({global:b.counts,split:split.counts},null,2));
