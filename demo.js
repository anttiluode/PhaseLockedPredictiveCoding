/* Offline browser instrument for core.js. No library, no server or camera. */
(function() {
"use strict";
const P=window.PLC,$=id=>document.getElementById(id);
const panels=[
 {id:"cvWorld",color:[42,245,219]},
 {id:"cvPrediction",color:[255,208,124]},
 {id:"cvError",color:[255,96,166]}
].map(v=>({...v,cv:$(v.id),ctx:$(v.id).getContext("2d")}));
const palettes=[
 [[7,17,27],[40,247,224]],
 [[8,16,31],[255,202,110]],
 [[8,12,24],[255,72,162]]
];
const spark=$("spark"),ctxSpark=spark.getContext("2d");
const gear=$("gear"),gc=gear.getContext("2d");
let loop=new P.Loop("orbit",16,"hub"),running=true,
 random=P.rng(47),history=[],last=null,oneShot=false,
 score={ticks:0,raw:0,corrected:0,trueBits:0,detected:0,false:0};
function settings(){
 return {scene:$("scene").value,
         jitter:+$("jitter").value,
         mode:$("mode").value,
         intrusion:$("intrusion").checked,
         split:$("split").checked,
         feedback:$("feedback").checked};
}
function reset(){
 const opts=settings();loop=new P.Loop(opts.scene,16,opts.mode);
 random=P.rng(47);history=[];last=null;oneShot=false;
 score={ticks:0,raw:0,corrected:0,trueBits:0,detected:0,false:0};
 $("run").textContent=running?"Pause":"Play";
 $("status").textContent="Training: original 16-step loop, no jitter during first two laps";
 renderGear(0,0);renderEmpty();updateStats();
}
function rgb(value,palette){
 const v=Math.max(0,Math.min(15,value))/15;
 return palette[0].map((c,i)=>Math.floor(c+(palette[1][i]-c)*v));
}
function drawPixels(panel,bytes,palette,isError){
 const {ctx,cv}=panel,im=ctx.createImageData(64,64);
 for(let i=0;i<4096;i++){
  const n=bytes[i],v=isError?Math.min(1,P.pop[n]/3):n/15;
  const a=palette[0],b=palette[1],j=i*4;
  im.data[j]=Math.floor(a[0]+(b[0]-a[0])*v);
  im.data[j+1]=Math.floor(a[1]+(b[1]-a[1])*v);
  im.data[j+2]=Math.floor(a[2]+(b[2]-a[2])*v);
  im.data[j+3]=255;
 }
 ctx.putImageData(im,0,0);
}
function renderEmpty(){
 const z=new Uint8Array(4096);
 panels.forEach((p,i)=>drawPixels(p,z,palettes[i],i===2));
 ctxSpark.clearRect(0,0,spark.width,spark.height);
}
function renderGear(t,delta){
 const cw=gear.width,ch=gear.height,cx=cw/2,cy=ch/2,r=89;
 gc.clearRect(0,0,cw,ch);
 gc.fillStyle="#0c1b2c";gc.fillRect(0,0,cw,ch);
 gc.beginPath();gc.arc(cx,cy,r+20,0,Math.PI*2);
 gc.strokeStyle="#28455a";gc.lineWidth=11;gc.stroke();
 gc.beginPath();gc.arc(cx,cy,r,0,Math.PI*2);
 gc.strokeStyle="#6ad6c3";gc.lineWidth=2;gc.stroke();
 const a=-Math.PI/2+2*Math.PI*(P.wrap(t+delta,16)/16);
 const b=-Math.PI/2+2*Math.PI*(P.wrap(t,16)/16);
 for(let i=0;i<16;i++){
  const v=-Math.PI/2+i*Math.PI/8,x=cx+r*Math.cos(v),y=cy+r*Math.sin(v);
  const active=i===P.wrap(t+delta,16);
  gc.beginPath();gc.arc(x,y,active?8:4,0,Math.PI*2);
  gc.fillStyle=active?"#7efadb":"#396980";gc.fill();
 }
 gc.beginPath();gc.moveTo(cx,cy);gc.lineTo(cx+68*Math.cos(a),cy+68*Math.sin(a));
 gc.strokeStyle="#6df0c8";gc.lineWidth=4;gc.stroke();
 gc.beginPath();gc.moveTo(cx,cy);gc.lineTo(cx+59*Math.cos(b),cy+59*Math.sin(b));
 gc.strokeStyle="#da9a70";gc.lineWidth=2;gc.setLineDash([5,5]);gc.stroke();gc.setLineDash([]);
 gc.beginPath();gc.arc(cx,cy,10,0,2*Math.PI);gc.fillStyle="#081827";gc.fill();gc.strokeStyle="#6df0c8";gc.lineWidth=2;gc.stroke();
 gc.textAlign="center";gc.font="600 13px system-ui";gc.fillStyle="#d9e8f5";
 gc.fillText("ONE SHARED PHASE",cx,26);
 const theta=2*Math.PI*P.wrap(t+delta,16)/16;
 $("complex").textContent=Math.cos(theta).toFixed(2)+
   (Math.sin(theta)<0?" − ":" + ")+Math.abs(Math.sin(theta)).toFixed(2)+"i";
 $("phaseSlot").textContent=P.wrap(t+delta,16)+" / 16";
}
function chart(){
 const w=spark.width,h=spark.height;
 ctxSpark.fillStyle="#0c192a";ctxSpark.fillRect(0,0,w,h);
 const margin=20,max=Math.max(256,...history.flatMap(v=>[v.raw,v.hub]));
 for(let y=0;y<=4;y++){
  const yy=margin+(h-2*margin)*y/4;
  ctxSpark.strokeStyle="#254057";ctxSpark.lineWidth=1;ctxSpark.beginPath();
  ctxSpark.moveTo(36,yy);ctxSpark.lineTo(w-8,yy);ctxSpark.stroke();
 }
 const width=w-48,start=Math.max(0,history.length-128),visible=history.slice(start);
 for(const [key,color] of [["raw","#d99f70"],["hub","#67dfc6"]]){
  ctxSpark.strokeStyle=color;ctxSpark.lineWidth=2;ctxSpark.beginPath();
  visible.forEach((v,i)=>{
   const x=36+(i/127)*width,y=h-margin-v[key]/max*(h-2*margin);
   if(i===0)ctxSpark.moveTo(x,y);else ctxSpark.lineTo(x,y);
  });
  ctxSpark.stroke();
 }
}
function updateStats(){
 $("tick").textContent=loop.tick;
 $("lap").textContent=Math.floor(loop.tick/16);
 $("rawNow").textContent=last?last.raw.toLocaleString():"—";
 $("hubNow").textContent=last?last.result.errorBits.toLocaleString():"—";
 $("seenShift").textContent=last?String(last.result.actual>0?"+":"")+last.result.actual:"—";
 $("chosenShift").textContent=last?String(last.result.selected>0?"+":"")+last.result.selected:"—";
 $("falseTotal").textContent=score.false.toLocaleString();
 $("detected").textContent=score.detected.toLocaleString()+" / "+score.trueBits.toLocaleString();
 $("jitterValue").textContent="±"+$("jitter").value;
 $("intrusionDesc").textContent=$("intrusion").checked?"One 8×8 patch every 23 ticks":"No inserted patch";
}
function next(){
 const cfg=settings(),t=loop.tick;
 const training=t<32;
 const shift=training?0:Math.floor(random()*(2*cfg.jitter+1))-cfg.jitter;
 const paint=!training&&(oneShot||(cfg.intrusion&&t%23===11));oneShot=false;
 const rawState=loop.memory[P.wrap(t,16)].slice();
 const result=loop.step(shift,{paint,feedback:cfg.feedback,phaseLock:cfg.mode==="hub",
                               kind:!training&&cfg.split?"split":"global"});
 const raw=P.maskCompare(result.world,rawState).error;
 last={result,raw};
 drawPixels(panels[0],result.world,palettes[0],false);
 drawPixels(panels[1],result.prediction,palettes[1],false);
 drawPixels(panels[2],result.errors,palettes[2],true);
 renderGear(t,result.selected);
 if(!training){
  // Novelty ground truth is known only because the benchmark deliberately
  // injects a patch. In split mode, other unexplained deviations are not
  // treated as genuine novelty or as necessarily clock errors.
  score.ticks++;score.raw+=raw;score.corrected+=result.errorBits;
  const patchMask=new Uint8Array(4096);
  if(paint){
   for(let y=26;y<34;y++)for(let x=26;x<34;x++)patchMask[y*64+x]=15;
   score.trueBits+=256;
  }
  const c=P.categorize(result.errors,patchMask);
  score.detected+=c.tp;score.false+=c.fp;
 }
 history.push({raw,hub:result.errorBits});if(history.length>128)history.shift();
 chart();updateStats();
 if(training)$("status").textContent="TRAINING: first lap writes the movie, second verifies it. No jitter yet.";
 else if(cfg.split)$("status").textContent="TWO INDEPENDENT PHASES: one phase hub cannot align both halves.";
 else if(result.errorBits===0)$("status").textContent="LOCKED: the shared phase explains the observed scene.";
 else if(paint)$("status").textContent="LOCAL PATCH: the phase-aligned error panel shows remaining changes.";
 else $("status").textContent="RESIDUAL ERROR: ambiguous timing, stored content, or genuine world change.";
}
let interval=setInterval(()=>{if(running)next();},150);
$("run").addEventListener("click",()=>{running=!running;$("run").textContent=running?"Pause":"Play"});
$("step").addEventListener("click",()=>{running=false;$("run").textContent="Play";next()});
$("reset").addEventListener("click",reset);
$("burst").addEventListener("click",()=>{oneShot=true});
$("scene").addEventListener("change",reset);
$("mode").addEventListener("change",reset);
$("jitter").addEventListener("input",updateStats);
$("intrusion").addEventListener("change",updateStats);
$("split").addEventListener("change",()=>{$("status").textContent="Independent halves enabled: a global phase estimate may fail."});
$("feedback").addEventListener("change",()=>{$("status").textContent=$("feedback").checked?"Feedback writes remaining mismatches.":"Feedback paused. Stored movie will replay unchanged."});
window.addEventListener("beforeunload",()=>clearInterval(interval));
reset();
})();