(function(root){
  'use strict';
  const cap=50,P=1326,S=879801;
  function pid(a,b){if(a<b){const t=a;a=b;b=t;}return a*(a+1)/2+b;}
  function sid(a,b){return a>=b?a*(a+1)/2+b:b*(b+1)/2+a;}
  function transition(d,a,b=0){const n=d.slice();if(a===2){n[4]=Math.max(0,n[4]-2);n[b]=Math.max(0,n[b]-5);}else{n[2*a]=Math.max(0,n[2*a]-2);n[2*a+1]=Math.max(0,n[2*a+1]-2);}return n;}
  function build(maxK){
    const hi=new Uint8Array(P),lo=new Uint8Array(P),m2=new Uint16Array(P),m5h=new Uint16Array(P),m5l=new Uint16Array(P);
    for(let a=0;a<=cap;a++)for(let b=0;b<=a;b++){const p=pid(a,b);hi[p]=a;lo[p]=b;m2[p]=pid(Math.max(0,a-2),Math.max(0,b-2));m5h[p]=pid(Math.max(0,a-5),b);m5l[p]=pid(a,Math.max(0,b-5));}
    const moves=Array.from({length:6},()=>new Uint32Array(S)),direct=new Float64Array(S);
    for(let a=0;a<P;a++)for(let b=0;b<=a;b++){const s=sid(a,b);moves[0][s]=sid(m2[a],b);moves[1][s]=sid(a,m2[b]);moves[2][s]=sid(m5h[a],b);moves[3][s]=sid(m5l[a],b);moves[4][s]=sid(a,m5h[b]);moves[5][s]=sid(a,m5l[b]);direct[s]=Math.ceil(hi[a]/2)+Math.ceil(hi[b]/2);}
    const v=Array.from({length:8},()=>new Float64Array(S)),base=Array.from({length:8},()=>new Float64Array(S));
    const policy=new Uint8Array((maxK+1)*S);
    for(let k=0;k<=maxK;k++){
      const cur=v[k%8],bc=base[k%8],prev=v[Math.max(0,k-2)%8],prev7=v[Math.max(0,k-7)%8],bp=base[Math.max(0,k-2)%8],bp7=base[Math.max(0,k-7)%8];
      for(let s=0;s<S;s++){
        if(k===0&&s===0){cur[s]=bc[s]=0;policy[s]=3;continue;}
        let best=Infinity,action=2;
        if(moves[0][s]!==s){best=1+cur[moves[0][s]];action=0;}
        if(moves[1][s]!==s&&1+cur[moves[1][s]]<best-1e-12){best=1+cur[moves[1][s]];action=1;}
        let box;
        if(k===0){let sum=0,self=1;for(let m=2;m<6;m++){const n=moves[m][s];if(n===s)self++;else sum+=cur[n];}box=self===5?Infinity:(5+sum)/(5-self);bc[s]=direct[s];}
        else{box=1+(prev[moves[2][s]]+prev[moves[3][s]]+prev[moves[4][s]]+prev[moves[5][s]]+prev7[s])/5;bc[s]=1+(bp[moves[2][s]]+bp[moves[3][s]]+bp[moves[4][s]]+bp[moves[5][s]]+bp7[s])/5;}
        if(box<best-1e-12){best=box;action=2;}cur[s]=best;policy[k*S+s]=action;
      }
    }
    function index(d){return sid(pid(d[0],d[1]),pid(d[2],d[3]));}
    function pick(d,strategy){if(!d.some(Boolean))return -1;if(strategy==='targeted')return d[4]>0?2:(d[0]||d[1]?0:1);const a=pid(d[0],d[1]),b=pid(d[2],d[3]);let n=policy[d[4]*S+sid(a,b)];return n<2&&a<b?1-n:n;}
    function value(d,strategy){return (strategy==='targeted'?base:v)[d[4]%8][index(d)];}
    function compare(d,strategy){return [0,1,2].map(a=>{if(!d.some(Boolean))return null;if(a<2&&!d[2*a]&&!d[2*a+1])return null;return a<2?1+value(transition(d,a),strategy):1+[0,1,2,3,4].reduce((n,b)=>n+value(transition(d,2,b),strategy),0)/5;});}
    return {pick,value,compare};
  }
  function simulate(engine,d,strategy,firstAction,activeAction,seed){
    let state=d.slice(),n=0,rng=seed>>>0;
    function box(){rng^=rng<<13;rng^=rng>>>17;rng^=rng<<5;return Math.floor((rng>>>0)/4294967296*5);}
    if(activeAction!==null&&activeAction!==undefined){state=transition(state,activeAction,activeAction===2?box():0);}
    if(state.some(Boolean)&&firstAction!==null&&firstAction!==undefined){state=transition(state,firstAction,firstAction===2?box():0);n++;}
    while(state.some(Boolean)&&n<2000){const a=engine.pick(state,strategy);state=transition(state,a,a===2?box():0);n++;}
    return n;
  }
  function analyze(input){
    const qty=input.qty,d=qty.map(n=>Math.max(0,50-n));
    const engine=build(d[4]);
    const mean=engine.value(d,input.strategy),optimalMean=engine.value(d,'optimal'),targetedMean=engine.value(d,'targeted');
    const choices=engine.compare(d,input.strategy),recommended=engine.pick(d,input.strategy);
    const activeAction=input.activeUnknown?(recommended<0?2:recommended):input.activeAction;
    const counts=[];for(let i=1;i<=2048;i++)counts.push(simulate(engine,d,input.strategy,input.firstAction,activeAction,Math.imul(i,2654435761)));
    counts.sort((a,b)=>a-b);
    return {activeAssumption:input.activeUnknown?activeAction:null,mean,optimalMean,targetedMean,choices,recommended,counts,p95:counts[Math.ceil(counts.length*.95)-1],simulatedMean:counts.reduce((a,b)=>a+b,0)/counts.length};
  }
  const api={analyze,build,transition};if(typeof module!=='undefined')module.exports=api;else root.Solver=api;
})(typeof globalThis!=='undefined'?globalThis:this);
