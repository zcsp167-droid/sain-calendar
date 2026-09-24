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
const policy=fs.readFileSync('results/optimal-policy.bin');
const low=Array.from({length:8},()=>new Float64Array(states));
const high=Array.from({length:8},()=>new Float64Array(states));
const baseLow=Array.from({length:8},()=>new Float64Array(states));
const baseHigh=Array.from({length:8},()=>new Float64Array(states));
for(let k=0;k<=cap;k++) {
  const c=low[k%8],h=high[k%8],bl=baseLow[k%8],bh=baseHigh[k%8];
  const p=low[Math.max(0,k-2)%8],p7=low[Math.max(0,k-7)%8];
  const hp=high[Math.max(0,k-2)%8],hp7=high[Math.max(0,k-7)%8];
  const bp=baseLow[Math.max(0,k-2)%8],bp7=baseLow[Math.max(0,k-7)%8];
  const bph=baseHigh[Math.max(0,k-2)%8],bp7h=baseHigh[Math.max(0,k-7)%8];
  for(let s=0;s<states;s++) {
    if(k===0 && s===0) {c[s]=h[s]=bl[s]=bh[s]=0;continue;}
    const action=policy[k*states+s];
    if(action<2) {c[s]=1+c[moves[action][s]];h[s]=1+h[moves[action][s]];}
    else if(k===0) {
      let min=Infinity;
      for(let m=2;m<6;m++) if(moves[m][s]!==s) min=Math.min(min,c[moves[m][s]]);
      c[s]=1+min; h[s]=Infinity;
    } else {
      c[s]=1+Math.min(p[moves[2][s]],p[moves[3][s]],p[moves[4][s]],p[moves[5][s]],p7[s]);
      h[s]=1+Math.max(hp[moves[2][s]],hp[moves[3][s]],hp[moves[4][s]],hp[moves[5][s]],hp7[s]);
    }
    if(k===0) bl[s]=bh[s]=direct[s];
    else {
      bl[s]=1+Math.min(bp[moves[2][s]],bp[moves[3][s]],bp[moves[4][s]],bp[moves[5][s]],bp7[s]);
      bh[s]=1+Math.max(bph[moves[2][s]],bph[moves[3][s]],bph[moves[4][s]],bph[moves[5][s]],bp7h[s]);
    }
  }
}
const last=states-1;
const result={baselineMin:baseLow[cap%8][last],baselineMax:baseHigh[cap%8][last],optimalPolicyMin:low[cap%8][last],optimalPolicyMax:String(high[cap%8][last]),seconds:(performance.now()-started)/1000};
fs.writeFileSync('results/theoretical-bounds.json',JSON.stringify(result,null,2));
console.log(result);
