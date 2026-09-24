const assert=require('assert/strict'),M=require('../model'),Solver=require('../solver'),S=require('../schedule'),C=require('../comparison');
const now=new Date('2026-09-21T20:00:00+09:00');
for(const [index,craftElement]of ['fire','water','wind','thunder','earth'].entries()){
 const tabletQty=[50,50,50,50,50];tabletQty[index]=40;
 const state=M.normalize({canSainMission:true,craftElementSelected:true,craftElement,tabletQty,currentQty:0,currentTickets:0});
 const raw=JSON.stringify(state);const analysis=Solver.analyze({qty:M.samQuantity(state),strategy:state.strategy});assert(analysis.counts.every(n=>n===0));
 const forecast=S.forecast(state,analysis,now);assert.equal(forecast.meanFinish,forecast.meanSainFinish);assert(!forecast.log.some(m=>m.phase==='sam'));
 const comparison=C.compare({...state,speedupIntent:'none'},analysis,now,{},S);assert.equal(comparison.base.finish,comparison.base.sainMissionFinish);assert(!comparison.base.log.some(m=>m.phase==='sam'));assert.equal(JSON.stringify(state),raw);
 const partial=M.normalize({...state,shardQty:state.shardQty.map((n,i)=>i===index?275:n)});assert.equal(M.samQuantity(partial)[index],45);
 const samFirst=M.normalize({...state,canSainMission:false,sainReadyPlan:true});assert.equal(M.samQuantity(samFirst)[index],40);
}
console.log('PASS: five-element Sain-first forecast and comparison, no extra Sam missions, partial rewards, Sam-first unchanged, inventory unchanged.');
