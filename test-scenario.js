// Builds a disposable test state; never writes user data.
const M=require('./model'),S=require('./schedule'),holidays=require('./holidays');
function prepare(raw,now=Date.now(),seconds=10,mode='master'){
 const ready=m=>mode==='mission'?m.start+30*3600000:m.collect;
 let s=M.normalize(raw),snap=s.planSnapshot;
 if(!snap||snap.source!==M.planFingerprint(s))throw Error('메인 화면 ‘새로고침’ 클릭 후 테스트 가능');
 const index=snap.log.findIndex(m=>(mode==='mission'||m.shortcutHours>0)&&ready(m)-seconds*1000>now);
 if(index<0)throw Error(mode==='mission'?'앞으로 예정된 임무 없음':'앞으로 예정된 임달 사용 없음');
 const target=snap.log[index],end=ready(target)-seconds*1000,begin=now;let q=S.questAt(s,0,begin,holidays),purchases=snap.purchases.slice();
 function supply(at){while(q!==null&&q<=at){if(s.ticketClaimWeek!==M.questKey('ticket',new Date(q))){s.currentTickets+=2;s.ticketClaimWeek=M.questKey('ticket',new Date(q));}q=S.questAt(s,0,q+24*S.HOUR,holidays);}for(const p of purchases.filter(p=>p.at<=at)){s.currentTickets+=p.qty*2;s.gueseoTotal=Math.max(0,s.gueseoTotal-p.qty);s.gueseoStock=Math.max(0,s.gueseoStock-p.qty);s.gueseoRecords.push({week:M.questKey('ticket',new Date(p.at)),qty:p.qty,at:p.at});}purchases=purchases.filter(p=>p.at>at);}
 for(let i=0;i<=index;i++){const m=snap.log[i];supply(Math.max(begin,m.start));if(!(i===0&&s.activeMission)){if(s.currentTickets<1)s.currentTickets=1;s.currentTickets--;s.activeMission={id:'test-'+i+'-'+m.start,phase:m.phase,action:m.phase==='sam'?M.targeted(M.deficits(s.tabletQty)):null,startedAt:new Date(m.start).toISOString(),ticketDebited:true};}
 if(i===index)break;
 supply(m.collect);const box=s.tabletQty.indexOf(Math.min(...s.tabletQty));s=M.complete(s,box,new Date(m.collect),m.shortcutHours);s.masterQty=Math.max(0,s.masterQty-m.shortcutHours);s.tabletReviewPending=false;
 }
 supply(end);s.masterQty=Math.max(s.masterQty,mode==='mission'?0:target.shortcutHours);s.thresholdHours=29;s.useShortcuts=true;s.receiptImpact=null;s.speedupReviewPending=false;s.planStartAt=new Date(end).toISOString();s.planSnapshot={...snap,at:end,log:snap.log.slice(index),purchases};s.planSnapshot.source=M.planFingerprint(s);
 return {state:s,at:end};
}
// 테스트에서만: 시간을 앞으로 옮기면 그 날짜까지 계획대로 임무와 퀘스트를 다 했다고 가정한다.
// 삼인검 임무는 저격 전략대로(기린 50개까지 100% 임무, 이후 확정 보상) 처리하고 상자 석판 종류는 랜덤으로 뽑는다.
// 이미 받은 것까지 현재 테스트 상태에 그대로 누적한다. 일정이 아직 계산되지 않았으면 시간만 옮긴다.
function advance(raw,at,random=Math.random){
 let s=M.normalize(raw);const snap=s.planSnapshot;
 if(!snap||snap.source!==M.planFingerprint(s))return {state:raw,simulated:false};
 const begin=Date.now();let q=S.questAt(s,0,begin,holidays),purchases=snap.purchases.slice();
 function supply(t){while(q!==null&&q<=t){if(s.ticketClaimWeek!==M.questKey('ticket',new Date(q))){s.currentTickets+=2;s.ticketClaimWeek=M.questKey('ticket',new Date(q));}q=S.questAt(s,0,q+24*S.HOUR,holidays);}for(const p of purchases.filter(p=>p.at<=t)){s.currentTickets+=p.qty*2;s.gueseoTotal=Math.max(0,s.gueseoTotal-p.qty);s.gueseoStock=Math.max(0,s.gueseoStock-p.qty);s.gueseoRecords.push({week:M.questKey('ticket',new Date(p.at)),qty:p.qty,at:p.at});}purchases=purchases.filter(p=>p.at>t);}
 let done=0;
 for(let i=0;i<snap.log.length;i++){
  const m=snap.log[i];if(m.start>at)break;
  supply(Math.max(begin,m.start));
  if(!(i===0&&s.activeMission)){if(s.currentTickets<1)s.currentTickets=1;s.currentTickets--;s.activeMission={id:'test-'+i+'-'+m.start,phase:m.phase,action:m.phase==='sam'?Math.max(0,M.targeted(M.deficits(s.tabletQty))):null,startedAt:new Date(m.start).toISOString(),ticketDebited:true};}
  if(m.collect>at)break;
  supply(m.collect);
  if(s.activeMission.phase==='sam'&&![0,1,2].includes(s.activeMission.action))s.activeMission.action=Math.max(0,M.targeted(M.deficits(s.tabletQty)));
  const box=s.activeMission.phase==='sam'&&s.activeMission.action===2?Math.floor(random()*5):null;
  s=M.complete(s,box,new Date(m.collect),m.shortcutHours);
  s.masterQty=Math.max(0,s.masterQty-m.shortcutHours);s.tabletReviewPending=false;done++;
 }
 supply(at);
 if(done)s.planStartAt=new Date(at).toISOString();
 return {state:s,simulated:true,done};
}
module.exports={prepare,advance};
