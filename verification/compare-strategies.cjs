const fs = require('fs');
process.chdir(__dirname);
fs.mkdirSync('results', {recursive:true});
const {performance} = require('perf_hooks');
const started = performance.now();
const cap = Number(process.env.TABLET_CAP || 50);
const samples = Number(process.env.TABLET_SAMPLES || 200000);
const pairs = (cap+1)*(cap+2)/2;
const states = pairs*(pairs+1)/2;
const pid = (a,b) => { if(a<b) [a,b]=[b,a]; return a*(a+1)/2+b; };
const sid = (a,b) => a>=b ? a*(a+1)/2+b : b*(b+1)/2+a;
const hi = new Uint8Array(pairs), lo = new Uint8Array(pairs);
const minus2 = new Uint16Array(pairs), minus5hi = new Uint16Array(pairs), minus5lo = new Uint16Array(pairs);
for(let a=0;a<=cap;a++) for(let b=0;b<=a;b++) {
  const p=pid(a,b); hi[p]=a; lo[p]=b;
  minus2[p]=pid(Math.max(0,a-2),Math.max(0,b-2));
  minus5hi[p]=pid(Math.max(0,a-5),b);
  minus5lo[p]=pid(a,Math.max(0,b-5));
}
const moves=Array.from({length:6},()=>new Uint32Array(states));
const direct = new Float64Array(states);
for(let a=0;a<pairs;a++) for(let b=0;b<=a;b++) {
  const s=sid(a,b);
  moves[0][s]=sid(minus2[a],b); moves[1][s]=sid(a,minus2[b]);
  moves[2][s]=sid(minus5hi[a],b); moves[3][s]=sid(minus5lo[a],b);
  moves[4][s]=sid(a,minus5hi[b]); moves[5][s]=sid(a,minus5lo[b]);
  direct[s]=Math.ceil(hi[a]/2)+Math.ceil(hi[b]/2);
}
const v=Array.from({length:8},()=>new Float64Array(states));
const base=Array.from({length:8},()=>new Float64Array(states));
const policy=new Uint8Array((cap+1)*states);
const choiceCounts=[0,0,0];
const checks=[];
let worst={saving:-1}, residualWorst=null;
let maxResidual=0;
console.log(JSON.stringify({stage:'allocated',cap,pairs,states,totalStates:states*(cap+1),memoryMB:process.memoryUsage().arrayBuffers/1048576}));
for(let k=0;k<=cap;k++) {
  const cur=v[k%8], bc=base[k%8];
  const prev=v[Math.max(0,k-2)%8], prev7=v[Math.max(0,k-7)%8];
  const bp=base[Math.max(0,k-2)%8], bp7=base[Math.max(0,k-7)%8];
  const offset=k*states;
  for(let a=0;a<pairs;a++) for(let b=0;b<=a;b++) {
    const s=a*(a+1)/2+b;
    if(k===0 && s===0) {cur[s]=bc[s]=0; policy[offset+s]=3;continue;}
    let best=Infinity, action=2;
    if(moves[0][s]!==s) {best=1+cur[moves[0][s]];action=0;}
    if(moves[1][s]!==s && 1+cur[moves[1][s]]<best-1e-12) {best=1+cur[moves[1][s]];action=1;}
    let box;
    if(k===0) {
      let sum=0,self=1;
      for(let m=2;m<6;m++) {const n=moves[m][s]; if(n===s) self++; else sum+=cur[n];}
      box=self===5 ? Infinity : (5+sum)/(5-self);
      bc[s]=direct[s];
    } else {
      box=1+(prev[moves[2][s]]+prev[moves[3][s]]+prev[moves[4][s]]+prev[moves[5][s]]+prev7[s])/5;
      bc[s]=1+(bp[moves[2][s]]+bp[moves[3][s]]+bp[moves[4][s]]+bp[moves[5][s]]+bp7[s])/5;
    }
    if(box<best-1e-12) {best=box;action=2;}
    cur[s]=best;policy[offset+s]=action;choiceCounts[action]++;
    if(k<=5 && hi[a]<=5 && hi[b]<=5) checks.push({d:[hi[a],lo[a],hi[b],lo[b],k],value:best});
    const saving=bc[s]-best;
    if(saving>worst.saving) worst={saving,k,deficits:[hi[a],lo[a],hi[b],lo[b],k],baseline:bc[s],optimal:best};
    if(k===0 && saving>maxResidual) {maxResidual=saving;residualWorst={saving,deficits:[hi[a],lo[a],hi[b],lo[b],0],baseline:bc[s],optimal:best};}
  }
  if(k%10===0 || k===cap) console.log(JSON.stringify({stage:'dp',k,seconds:(performance.now()-started)/1000}));
}
const startState=states-1;
const exact={baseline:base[cap%8][startState],optimal:v[cap%8][startState]};
exact.saving=exact.baseline-exact.optimal;
console.log(JSON.stringify({stage:'exact',exact,worst,residualWorst,choiceCounts,seconds:(performance.now()-started)/1000}));
// Independent, unsymmetrized recursive Bellman solver verifies the small states.
const cache=new Map();
function independent(d) {
  if(d.every(x=>x===0)) return 0;
  const key=d.join(',');if(cache.has(key)) return cache.get(key);
  let best=Infinity;
  for(let a=0;a<2;a++) {
    if(!d[2*a] && !d[2*a+1]) continue;
    const next=d.slice();next[2*a]=Math.max(0,next[2*a]-2);next[2*a+1]=Math.max(0,next[2*a+1]-2);
    best=Math.min(best,1+independent(next));
  }
  let sum=0,self=0;
  for(let b=0;b<5;b++) {
    const next=d.slice();next[4]=Math.max(0,next[4]-2);next[b]=Math.max(0,next[b]-5);
    if(next.every((x,i)=>x===d[i])) self++;else sum+=independent(next);
  }
  if(self<5) best=Math.min(best,(5+sum)/(5-self));
  cache.set(key,best);return best;
}
let maxError=0;
for(const check of checks) maxError=Math.max(maxError,Math.abs(check.value-independent(check.d)));
if(maxError>1e-10) throw Error('Independent verification failed: '+maxError);
console.log(JSON.stringify({stage:'independent_validation',states:checks.length,maxError}));
function pick(d) {
  let a=pid(d[0],d[1]),b=pid(d[2],d[3]);
  const swapped=a<b;
  const action=policy[d[4]*states+sid(a,b)];
  return action<2 && swapped ? 1-action : action;
}
function run(seed,optimal,forcedBoxResult) {
  let rng=seed>>>0;
  const box=()=>{rng^=rng<<13;rng^=rng>>>17;rng^=rng<<5;return Math.floor((rng>>>0)/4294967296*5);};
  const d=[cap,cap,cap,cap,cap];
  let n=0,boxes=0,preKirinDirect=0;
  while(d.some(x=>x>0)) {
    let action;
    if(optimal) action=pick(d);
    else action=d[4]>0?2:(d[0]||d[1]?0:1);
    if(action===2) {
      d[4]=Math.max(0,d[4]-2);
      const r=forcedBoxResult===undefined?box():forcedBoxResult;
      d[r]=Math.max(0,d[r]-5);boxes++;
    } else {
      if(d[4]) preKirinDirect++;
      d[action*2]=Math.max(0,d[action*2]-2);
      d[action*2+1]=Math.max(0,d[action*2+1]-2);
    }
    n++;
    if(n>10000) throw Error('Simulation failed to terminate');
  }
  return {n,boxes,preKirinDirect};
}
function stats(values) {
  values.sort((a,b)=>a-b);
  let sum=0,sumSq=0;
  for(const x of values) {sum+=x;sumSq+=x*x;}
  const mean=sum/values.length;
  const sd=Math.sqrt(Math.max(0,sumSq/values.length-mean*mean));
  const quantile=p=>values[Math.ceil(values.length*p)-1];
  return {mean,sd,standardError:sd/Math.sqrt(values.length),p50:quantile(.5),p90:quantile(.9),p95:quantile(.95),p99:quantile(.99),min:values[0],max:values[values.length-1]};
}
const countsA=[],countsB=[],deltas=[];
let optimalBetter=0,baselineBetter=0,ties=0,gainAtLeast2=0,gainGreater2=0,preDirect=0;
for(let s=1;s<=samples;s++) {
  const seed=Math.imul(s,2654435761)>>>0;
  const a=run(seed,false),b=run(seed,true),diff=a.n-b.n;
  countsA.push(a.n);countsB.push(b.n);deltas.push(diff);
  if(diff>0) optimalBetter++;else if(diff<0) baselineBetter++;else ties++;
  if(diff>=2) gainAtLeast2++;if(diff>2) gainGreater2++;
  preDirect+=b.preKirinDirect;
}
const result={assumption:'Independent uniform 20% box types; 100% mission grants kirin 2 and one box granting 5 of one type; all actions 30h; cap is target; no failure.',cap,samples,exact,worst,residualWorst,simulation:{baseline:stats(countsA),optimal:stats(countsB),pairedDifference:stats(deltas),optimalBetter,baselineBetter,ties,gainAtLeast2,gainGreater2,preDirect},extremeExamples:[0,1,2,3,4].map(r=>({alwaysBoxType:r,baseline:run(1,false,r),optimal:run(1,true,r)})),seconds:(performance.now()-started)/1000};
fs.writeFileSync('results/strategy-comparison.json',JSON.stringify(result,null,2));
fs.writeFileSync('results/optimal-policy.bin',policy);
console.log(JSON.stringify(result,null,2));
