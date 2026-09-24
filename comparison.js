(function(root){
'use strict';
function plan(s,samCount,now,holidays,S,cap=0){
 S.validate(s);const H=S.HOUR,origin=+new Date(now),initial=Math.max(origin,+new Date(s.planStartAt||now)||origin),iron=origin;
 const sam=s.hasSamSword?0:samCount,sain=(s.canSainMission||s.sainReadyPlan||s.activeMission?.phase==='sain')?Math.max(0,Math.ceil((300-s.currentQty)/5)-(s.activeMission?.phase==='sain'?1:0)):0;
 const phases=(s.order==='sain-first'?[['sain',sain],['sam',sam]]:[['sam',sam],['sain',sain]]).flatMap(([phase,n])=>Array.from({length:n},()=>phase));
 const nextCache=new Map(),available=t=>{if(!nextCache.has(t))nextCache.set(t,S.nextAvailable(t,s,holidays));return nextCache.get(t);};
 const events=[];let q=S.questAt(s,0,origin,holidays),total=s.currentTickets,g=0;
 const week=t=>{const d=new Date(t);d.setDate(d.getDate()-d.getDay());return S.key(d);};
 const basicAt=t=>s.ticketClaimWeek===week(t)?0:2,gueseoAllowed=t=>!s.gueseoSkippedWeeks?.includes(week(t));let allocated=false;
 const anchor=q;let loops=0;
 while(total<phases.length&&q!==null&&loops++<3000){
  const weeks=Math.round((Date.UTC(...S.key(new Date(q)).split('-').map((v,i)=>+v-(i===1?1:0)))-Date.UTC(...S.key(new Date(anchor)).split('-').map((v,i)=>+v-(i===1?1:0))))/(7*24*H));
  const extra=(s.accelerationMode||s.totalBudgetMode)&&Number.isInteger(s.gueseoTotal)?(!allocated&&gueseoAllowed(q)?s.gueseoTotal:0):s.gueseoEveryWeeks>0&&weeks%s.gueseoEveryWeeks===0?s.gueseoQty:0;
  if(extra)allocated=true;g+=extra;total+=basicAt(q)+extra*2+(s.ticketMode==='fixed'?s.ticketExtraPerWeek:0);events.push({at:q,total,g});q=S.questAt(s,0,q+24*H,holidays);
 }
 const incomeFor=i=>i<=s.currentTickets?origin:events.find(e=>e.total>=i)?.at??Infinity;
 function choices(start,active=false){const ready=start+30*H,map=new Map();for(let k=s.dailyCycle?6:0;k<=(s.dailyCycle?6:cap);k++){const t=available(Math.max(initial,ready-k*H));const cost=Math.max(0,Math.ceil((ready-t)/H-1e-9));if(cost<=cap&&t>=start&&(!map.has(cost)||t<map.get(cost)))map.set(cost,t);}return [...map].map(([cost,t])=>({cost,t,ready,active}));}
 let frontier=[{t:initial,cost:0,node:null}];
 if(s.activeMission){const a=s.activeMission;frontier=choices(+new Date(a.startedAt),true).filter(c=>!((s.accelerationMode||s.totalBudgetMode)&&Number.isInteger(s.masterBudget))||c.cost<=s.masterBudget).map(c=>({t:c.t,cost:c.cost,node:{prev:null,item:{...a,active:true,start:+new Date(a.startedAt),collect:c.t,shortcutHours:c.cost}}}));}
 let blocked=false;
 for(let i=0;i<phases.length;i++){
  const phase=phases[i],need=incomeFor(i+1);if(!Number.isFinite(need)||false){blocked=true;break;}
  const byCost=new Map();for(const f of frontier){const start=available(Math.max(f.t,need,origin));for(const c of choices(start)){const cost=f.cost+c.cost;if(((s.accelerationMode||s.totalBudgetMode)&&Number.isInteger(s.masterBudget))&&cost>s.masterBudget)continue;const old=byCost.get(cost);if(!old||c.t<old.t)byCost.set(cost,{t:c.t,cost,node:{prev:f.node,item:{phase,start,collect:c.t,shortcutHours:c.cost,active:false,conditional:phase==='sain'&&!s.canSainMission}}});}}
  frontier=[];let earliest=Infinity;for(const f of [...byCost.values()].sort((a,b)=>a.cost-b.cost)){if(f.t<earliest){frontier.push(f);earliest=f.t;}}
 }
 const finishOf=f=>blocked||iron===null?null:Math.max(f.t,iron);
 const penalty=n=>(s.efficiencyHours||0)*n;
 frontier.sort((a,b)=>((finishOf(a)??Infinity)+H*penalty(a.cost))-((finishOf(b)??Infinity)+H*penalty(b.cost))||a.cost-b.cost);const best=frontier[0];let log=[];for(let n=best.node;n;n=n.prev)log.push(n.item);log.reverse();
 const last=phase=>log.filter(m=>m.phase===phase).at(-1)?.collect??origin,samMissionFinish=blocked?null:last('sam'),sainMissionFinish=blocked?null:last('sain');
 // 삼인검 임무 없이 사인검 보상 석판으로 부족분이 채워지면, 부족 개수만큼 사인검을 받은 날이 삼인검 재료 확보일이다.
 const need=s.hasSamSword?0:s.tabletQty.reduce((a,n)=>a+Math.max(0,50-n),0),sainDone=log.filter(m=>m.phase==='sain'),rewardAt=need&&!log.some(m=>m.phase==='sam')&&sainDone.length?sainDone[Math.min(need,sainDone.length)-1].collect:null,samFinish=iron===null||samMissionFinish===null?null:Math.max(iron,rewardAt??samMissionFinish);
 const lastStart=log.filter(m=>!m.active).at(-1)?.start??origin;let gueseoCount=events.filter(e=>e.at<=lastStart).at(-1)?.g||0;
 const purchases=[];let basic=0,qt=anchor,used=0,latestQuest=null;for(const mission of log.filter(m=>!m.active)){while(qt!==null&&qt<=mission.start){basic+=basicAt(qt);if(gueseoAllowed(qt))latestQuest=qt;qt=S.questAt(s,0,qt+24*H,holidays);}used++;const required=Math.max(0,Math.ceil((used-s.currentTickets-basic)/2));const already=purchases.reduce((n,x)=>n+x.qty,0);if((s.accelerationMode||s.totalBudgetMode)&&Number.isInteger(s.gueseoTotal)&&required>already)purchases.push({at:latestQuest,qty:required-already});}
 const grouped=new Map();for(const purchase of purchases){const entry=grouped.get(purchase.at)||{at:purchase.at,qty:0};entry.qty+=purchase.qty;grouped.set(purchase.at,entry);}purchases.splice(0,purchases.length,...grouped.values());
 if((s.accelerationMode||s.totalBudgetMode)&&Number.isInteger(s.gueseoTotal))gueseoCount=purchases.reduce((n,x)=>n+x.qty,0);
 let endBasic=basic;while(qt!==null&&finishOf(best)!==null&&qt<=finishOf(best)){endBasic+=basicAt(qt);qt=S.questAt(s,0,qt+24*H,holidays);}
 const remainingTickets=s.currentTickets+endBasic+gueseoCount*2-log.filter(m=>!m.active).length;
 return {remainingTickets,purchases,log,finish:finishOf(best),samFinish,samMissionFinish,sainMissionFinish,ironFinish:iron,blocked,conditionalSain:!s.canSainMission&&s.activeMission?.phase!=='sain'&&s.sainReadyPlan&&s.currentQty<300,masterCount:best.cost,masterNeeded:Math.max(0,best.cost-s.masterQty),shortcutHours:best.cost,gueseoCount};
}
function gueseoUnit(s={}){if(s.gueseoShopPrice)return 15000;return s.cashRatio>0&&s.gueseoMarketPrice>0?s.gueseoMarketPrice/(s.cashRatio*1e8)*10000:15000;}
// 임달 효율 기준(1개당 시간): 귀서 맞추기 = 임달 낱개 1,000원을 귀서 시간당 가치로 환산 후 올림(묶음가 미반영) · 직접 설정 = 입력값
function hoursFromUnit(unit){return Math.min(8760,Math.ceil(1000*168/unit-1e-9));}
function efficiencyHours(s={}){if(s.efficiencyMode==='gueseo')return hoursFromUnit(gueseoUnit(s));return Number.isFinite(s.masterEfficiencyHours)&&s.masterEfficiencyHours>=0&&s.masterEfficiencyHours<=8760?s.masterEfficiencyHours:12;}
function price(g,m,s={}){let packs=Math.floor(m/10),singles=m%10;if(singles===9){packs++;singles=0;}const purchased=packs*10+singles,master=packs*9000+singles*1000;return {gueseo:g*gueseoUnit(s),master,packs,singles,purchased,leftover:purchased-m,total:g*gueseoUnit(s)+master};}
function compare(s,analysis,now,holidays,S,progress=()=>{},custom=null){
 const efficiency=efficiencyHours(s);
 const count=Math.ceil(analysis.counts.reduce((a,b)=>a+b,0)/analysis.counts.length);
 const cache=new Map();const calculate=(g,m,efficient=false,daily=false)=>{const key=[g,m,efficient,daily].join('/');if(!cache.has(key))cache.set(key,{...plan({...s,totalBudgetMode:true,ticketMode:'none',ticketUnlimited:false,ticketExtraPerWeek:0,gueseoEveryWeeks:0,gueseoTotal:g,masterBudget:m,efficiencyHours:efficient?efficiency:0,dailyCycle:daily},count,now,holidays,S,m?29:0),gueseoLimit:g,masterLimit:m});return {...cache.get(key)};};
 const base=calculate(0,0),allowed=s.canSainMission||s.sainReadyPlan||s.activeMission?.phase==='sain',usesG=['gueseo','both'].includes(s.speedupIntent),usesM=s.speedupIntent==='both';
 const maxG=usesG?Math.max(0,Math.ceil((count+Math.ceil((300-s.currentQty)/5)-s.currentTickets)/2)):0;
 const rows=[];let economy=null,fast=null;
 if(allowed&&s.speedupIntent!=='none'){
 economy=calculate(maxG,0);economy.kind='economy';economy.label='귀서만 사용 · 비용 절감 추천';rows.push(economy);progress(1);
 if(usesM){fast=calculate(maxG,10000,true);fast.kind='fast';fast.label='귀서 + 임달 사용 · 기간 단축 추천';rows.push(fast);progress(2);
 const daily=calculate(maxG,10000,false,true);rows.push({...daily,kind:'daily',label:'24시간 강행'});progress(3);
 }
 }
 if(custom){if(!Number.isInteger(custom.g)||custom.g<0||custom.g>100||!Number.isInteger(custom.m)||custom.m<0||custom.m>1000)throw Error('귀서 0~100장, 임달 0~1000개 입력 필요');rows.push({...calculate(custom.g,custom.m),custom:true,kind:'custom',label:'직접 비교'});}
 for(const r of rows){const without=calculate(r.gueseoCount,0);r.savedHours=r.finish!==null&&base.finish!==null?(base.finish-r.finish)/S.HOUR:null;r.gueseoSavedHours=without.finish!==null&&base.finish!==null?(base.finish-without.finish)/S.HOUR:null;r.masterSavedHours=without.finish!==null&&r.finish!==null?(without.finish-r.finish)/S.HOUR:null;r.price=price(r.gueseoCount,r.masterCount,s);r.purchasePrice=price(Math.max(0,r.gueseoCount-(s.gueseoStock||0)),r.masterNeeded,s);
 const reference=r.kind==='fast'?economy:fast||economy;r.referenceLabel=reference?.label||'미사용';r.extraHours=reference&&reference.finish!==null&&r.finish!==null?(reference.finish-r.finish)/S.HOUR:null;r.extraG=reference?r.gueseoCount-reference.gueseoCount:r.gueseoCount;r.extraM=reference?r.masterCount-reference.masterCount:r.masterCount;r.extraPrice=r.extraG>=0&&r.extraM>=0?price(r.extraG,r.extraM,s):null;
 r.notRecommended=!['economy','fast'].includes(r.kind)&&reference&&r.extraG>=0&&r.extraM>=0&&(r.extraG+r.extraM>0)&&((r.extraHours!==null&&r.extraHours<=0)||(r.extraM>0&&r.extraHours/r.extraM<efficiency));r.reason=r.notRecommended?(r.extraHours<=0?'추천안 대비 추가 단축 없음':'임달 '+r.extraM+'개 추가 대비 단축 '+Math.floor(r.extraHours/24)+'일 '+Math.floor(r.extraHours%24)+'시간 — 추가 1개당 평균 '+efficiency+'시간 미만'):'추가 사용량과 단축 효과 직접 비교 필요';
 }
 const current=calculate(s.accelerationMode?s.gueseoTotal:0,s.accelerationMode?s.masterBudget:0);current.savedHours=current.finish!==null&&base.finish!==null?(base.finish-current.finish)/S.HOUR:null;
 return {current,rows,base,economy,fast,best:fast||economy,samCount:count,at:+now,allowed,intent:s.speedupIntent};
}
// 사용량 선택지: kept = 정한 사용량(keep) 안에서 가장 빠른 일정 · efficient = 효율 기준 추천(자동 재계산과 같은 결과)
// next = 효율 기준을 1시간씩 낮춰 처음으로 임달을 더 써서 날짜가 당겨지는 계획(최대 NEXT_FLOOR시간까지) · keptOnly = kept만 계산(고정 사용량 재계산용)
// 9시간: 임달 묶음가(개당 900원) 기준 1시간 100원 · 귀서(15,000원 ÷ 168시간 ≈ 89원) 대비 약 10% 비싼 선까지만 허용
const NEXT_FLOOR=9;
// 귀서·임달은 사인검 임무 가능·준비 예정·사인검 임무 진행 중일 때만 사용
function itemsAllowed(s){return !!(s.canSainMission||s.sainReadyPlan||s.activeMission?.phase==='sain');}
function usageOptions(s,analysis,now,holidays,S,keep,keptOnly=false){
 const count=Math.ceil(analysis.counts.reduce((a,b)=>a+b,0)/analysis.counts.length),efficiency=efficiencyHours(s);
 const run=(g,m,hours)=>plan({...s,totalBudgetMode:true,ticketMode:'none',ticketUnlimited:false,ticketExtraPerWeek:0,gueseoEveryWeeks:0,gueseoTotal:g,masterBudget:m,efficiencyHours:hours,dailyCycle:false},count,now,holidays,S,m?29:0);
 // 사인검 준비 전(삼인검만 진행)에는 귀서·임달 미사용: 유지할 사용량도 0개
 // savedHours: 귀서·임달 미사용 대비 단축 시간(메인 요약 '미사용 대비 N일 단축'용)
 const none=run(0,0,0),withSaved=p=>p&&{...p,savedHours:p.finish!==null&&none.finish!==null?(none.finish-p.finish)/3600000:0};
 const allowed=itemsAllowed(s),kept=withSaved(allowed?run(Math.max(0,keep?.g||0),Math.max(0,keep?.m||0),0):none);if(keptOnly)return {kept};
 const usesG=allowed&&['gueseo','both'].includes(s.speedupIntent),usesM=allowed&&s.speedupIntent==='both';
 const maxG=usesG?Math.max(0,Math.ceil((count+Math.ceil((300-s.currentQty)/5)-s.currentTickets)/2)):0;
 const efficient=usesM?run(maxG,10000,efficiency):run(maxG,0,0);
 let next=null;if(usesM&&efficient.finish!==null)for(let hours=Math.ceil(efficiency)-1;hours>=NEXT_FLOOR&&!next;hours--){const r=run(maxG,10000,hours);if(r.finish!==null&&r.masterCount>efficient.masterCount&&r.finish<efficient.finish)next={...r,efficiencyHours:hours};}
 return {kept,efficient:withSaved(efficient),next:withSaved(next),efficiency};
}
const api={plan,compare,price,gueseoUnit,hoursFromUnit,efficiencyHours,usageOptions,NEXT_FLOOR,itemsAllowed};if(typeof module!=='undefined')module.exports=api;else root.Completion=api;
})(globalThis);
