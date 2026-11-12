/* PhaseLockedPredictiveCoding: reduced-window phase-alignment laboratory.
 * MIT research lineage: GoldGemini, GoldOpus, GN-XOR.
 * Not the full GeometricNeuronV27 nor a biological theta-gamma model.
 * Universal module: node require("./core.js") or browser window.PLC.
 */
(function(root,factory) {
  if(typeof module==="object"&&module.exports) module.exports=factory();
  else root.PLC=factory();
})(typeof globalThis!=="undefined"?globalThis:this,function() {
"use strict";
const N=64, P=16, PIX=N*N;
const pop=new Uint8Array(16);for(let n=0;n<16;n++){let v=n;while(v){pop[n]+=v&1;v>>=1;}}
const errorLUT=new Uint8Array(256),nextLUT=new Uint8Array(256);
const band=d=>d>-14.7&&d< -6.1?1:0;
for(let r=0;r<16;r++)for(let w=0;w<16;w++){
  let e=0,n=0;
  for(let b=0;b<4;b++){
    const rb=(r>>b)&1,wb=(w>>b)&1;
    const eb=band(-9*(rb+wb));
    const nb=band(-12*rb-9*eb);
    e|=eb<<b;n|=nb<<b;
  }
  errorLUT[(r<<4)|w]=e;nextLUT[(r<<4)|w]=n;
}
const wrap=(n,p=P)=>((n%p)+p)%p;
function rng(seed){let s=seed>>>0;return ()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return (s>>>0)/4294967296;};}
function sceneFrame(t,scene="orbit"){
  const frame=new Uint8Array(PIX),angle=wrap(t)*Math.PI*2/P;
  const c=Math.cos(angle),s=Math.sin(angle);
  for(let y=0;y<N;y++)for(let x=0;x<N;x++){
    let val=0;
    if(scene==="orbit"){
      const d1=Math.hypot(x-(32+18*c),y-(32+18*s));
      const d2=Math.hypot(x-(32-18*c),y-(32-18*s));
      const dc=Math.hypot(x-32,y-32);
      if(d1<6.2) val=15-Math.floor(d1/6.2*8);
      else if(d2<4.5) val=12-Math.floor(d2/4.5*6);
      else if(Math.abs(dc-9)<1.3) val=wrap(t,4)<2?10:4;
      else if(Math.abs(dc-18)<.7&&(x+y)%2===0)val=3;
    }else if(scene==="polar"){
      const dx=x-32,dy=y-32,d=Math.hypot(dx,dy),theta=Math.atan2(dy,dx)+angle;
      const sector=Math.floor((theta+Math.PI*4)/(Math.PI/4))%2;
      const ring=Math.floor((d+wrap(t)*.5)/6)%2;
      if(d<29)val=(sector^ring)?13:2;
    }else if(scene==="still"){
      const d1=Math.hypot(x-30,y-32),d2=Math.hypot(x-37,y-29);
      if(d1<22&&d2>15)val=14-Math.floor(d1/22*5);
    }else throw Error("Unknown scene: "+scene);
    frame[y*N+x]=Math.max(0,Math.min(15,val));
  }
  return frame;
}
function training(scene="orbit",period=P){
  const frames=[];
  for(let t=0;t<period;t++)frames.push(sceneFrame(t,scene));
  return frames;
}
function makeWorld(frames,t,delta=0,kind="global"){
  const p=frames.length,base=frames[wrap(t+delta,p)],w=base.slice();
  if(kind==="split"){
    const top=frames[wrap(t+1,p)],bottom=frames[wrap(t-1,p)];
    w.set(top.subarray(0,PIX/2),0);w.set(bottom.subarray(PIX/2),PIX/2);
  }
  return w;
}
function intrude(world,x=26,y=26,size=8,mask=15){
  for(let dy=0;dy<size;dy++)for(let dx=0;dx<size;dx++){
    const xx=x+dx,yy=y+dy;
    if(xx>=0&&xx<N&&yy>=0&&yy<N)world[yy*N+xx]^=mask;
  }
  return world;
}
function hamming(a,b){let n=0;for(let i=0;i<PIX;i++)n+=pop[a[i]^b[i]];return n;}
function candidate(frames,world,t,delta){return hamming(world,frames[wrap(t+delta,frames.length)]);}
function hub(frames,world,t,prior=0,radius=1,penalty=.01){
  let best=null;
  for(let d=-radius;d<=radius;d++){
    const mismatch=candidate(frames,world,t,d);
    const cost=mismatch+penalty*Math.abs(d-prior);
    if(!best||cost<best.cost-1e-9||(Math.abs(cost-best.cost)<1e-9&&Math.abs(d)<Math.abs(best.delta))){
      best={delta:d,mismatch,cost};
    }
  }
  return best;
}
function localCompare(frames,world,t,radius=1){
  const masks=new Uint8Array(PIX),choices=new Int32Array(PIX);
  let error=0;
  for(let i=0;i<PIX;i++){
    let best=Infinity,bestD=0,bestMask=0;
    for(let d=-radius;d<=radius;d++){
      const mask=world[i]^frames[wrap(t+d,frames.length)][i];
      const n=pop[mask];
      if(n<best||(n===best&&Math.abs(d)<Math.abs(bestD))){
        best=n;bestD=d;bestMask=mask;
      }
    }
    masks[i]=bestMask;choices[i]=bestD;error+=best;
  }
  return {error,masks,choices};
}
function maskCompare(world,pred){
  const masks=new Uint8Array(PIX);let count=0;
  for(let i=0;i<PIX;i++){masks[i]=errorLUT[(pred[i]<<4)|world[i]];count+=pop[masks[i]];}
  return {error:count,masks};
}
function categorize(predMask,novelMask){
  let tp=0,fp=0,fn=0;
  for(let i=0;i<PIX;i++){
    tp+=pop[predMask[i]&novelMask[i]];
    fp+=pop[predMask[i]&(~novelMask[i]&15)];
    fn+=pop[(~predMask[i]&15)&novelMask[i]];
  }
  return {tp,fp,fn};
}
function evalMode(mode,frames,world,t,prior=0,radius=1){
  if(mode==="local")return {...localCompare(frames,world,t,radius),delta:null};
  let d=mode==="oracle"?null:mode==="hub"?hub(frames,world,t,prior,radius).delta:0;
  if(d===null)throw Error("Provide oracle delta separately");
  return {...maskCompare(world,frames[wrap(t+d,frames.length)]),delta:d};
}
// Reduced band-LUT storage; includes no learned synapses.
// Each frame slot and 4-bit pixel is a group of four independent binary rings.
class Loop {
  constructor(scene="orbit",period=P,mode="hub"){
    this.scene=scene;this.period=period;this.mode=mode;this.memory=Array.from({length:period},()=>new Uint8Array(PIX));
    this.tick=0;this.prior=0;this.trained=false;
  }
  step(delta=0,{paint=false,feedback=true,phaseLock=true,kind="global"}={}){
    const t=this.tick;
    const oracle=this.scene==="still"?sceneFrame(t+delta,"still"):sceneFrame(t+delta,this.scene);
    const world=oracle.slice();
    if(kind==="split"){
      const top=sceneFrame(t+1,this.scene),bottom=sceneFrame(t-1,this.scene);
      world.set(top.subarray(0,PIX/2),0);world.set(bottom.subarray(PIX/2),PIX/2);
    }
    if(paint)intrude(world);
    // Initial clocked training is deliberately jitter-free and uncorrected.
    const learning=t<this.period*2;
    const chosen=learning||this.mode==="raw"||!phaseLock?0:
      hub(this.memory,world,t,this.prior,1).delta;
    if(!learning)this.prior=chosen;
    const slot=wrap(t+chosen,this.period);
    const prediction=this.memory[slot].slice();
    const compared=maskCompare(world,prediction);
    if(feedback){
      const target=this.memory[slot];
      for(let i=0;i<PIX;i++)target[i]=nextLUT[(target[i]<<4)|world[i]];
    }
    this.tick++;
    return {t,world,prediction,errors:compared.masks,errorBits:compared.error,
            selected:chosen,actual:delta,learning,novelty:paint?256:0};
  }
}
function bench({scene="orbit",seed=97,ticks=128,jitter=1,patchAt=[49,65,81],kind="global"}={}){
  const frames=training(scene),rand=rng(seed),values=["raw","hub","local"];
  const counts=Object.fromEntries(values.map(v=>[v,{tp:0,fp:0,fn:0,total:0,phaseCorrect:0}]));
  const examples=[];let prior=0;
  for(let t=0;t<ticks;t++){
    const shift=jitter?Math.floor(rand()*(2*jitter+1))-jitter:0;
    const base=makeWorld(frames,t,shift,kind);
    const world=base.slice();const patch=patchAt.includes(t);
    if(patch)intrude(world);
    const truth=new Uint8Array(PIX);
    for(let i=0;i<PIX;i++)truth[i]=world[i]^base[i];
    for(const mode of values){
      const r=evalMode(mode,frames,world,t,prior);
      if(mode==="hub"){prior=r.delta;counts.hub.phaseCorrect+=Number(r.delta===shift);}
      const c=categorize(r.masks,truth),a=counts[mode];
      a.tp+=c.tp;a.fp+=c.fp;a.fn+=c.fn;a.total+=r.error;
      if((t===patchAt[0]||t===patchAt[0]-1)&&mode!=="local"){
        examples.push({t,mode,shift,selected:r.delta,error:r.error,tp:c.tp,fp:c.fp});
      }
    }
  }
  return {scene,seed,ticks,jitter,kind,patchAt,counts,examples,
          caveat:"Template is already learned and frozen; hub selects best of three phase-indexed memories by global Hamming loss, no native GN27 or online tempo learning"};
}
return {N,P,PIX,pop,band,training,sceneFrame,makeWorld,intrude,hamming,candidate,
 hub,localCompare,maskCompare,categorize,evalMode,Loop,bench,errorLUT,nextLUT,wrap,rng};
});