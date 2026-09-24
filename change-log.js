'use strict';
const labels={craftBuyRecommended:'완제품 구매 추천',craftHiddenQuests:'퀘스트 재료 숨김',currentTickets:'보유 수행서',masterQty:'보유 임달',gueseoStock:'보유 귀서',tabletQty:'석판 보유량',currentQty:'사인검 조각',ironQty:'철제검 조각',hasSamSword:'삼인검 보유',canSainMission:'사인검 임무 가능',sainReadyPlan:'사인검 준비 예정',speedupIntent:'귀서·임달 사용',masterEfficiencyHours:'임달 효율 기준',efficiencyMode:'효율 설정 방식',gueseoShopPrice:'상점가 적용',cashRatio:'캐시 비율',gueseoMarketPrice:'귀서 시세',loginDays:'접속 요일',weekdayWindows:'평일 접속 시간',weekendWindows:'주말 접속 시간',dayWindows:'요일별 접속 시간',holidayWeekend:'공휴일 주말로 적용',usageMode:'사용량 방식',blockedDates:'접속 불가일',activeMission:'진행 중인 임무',history:'임무 수령 기록',ticketClaimWeek:'수행서 주간 수령',ironClaimWeek:'철제검 주간 수령',strategy:'임무 전략',order:'임무 순서',craftInventory:'제작 재료 보유량',craftElement:'제작 속성',personalNotes:'개인 일정',ticketMode:'수행서 수급 방식',ticketExtraPerWeek:'추가 수행서 수급',gueseoRecords:'귀서 사용 기록',gueseoSkippedWeeks:'귀서 사용 건너뛰기',thresholdHours:'조기 수령 범위',useShortcuts:'임달 사용 허용',startAtLogin:'자동 실행',displayMode:'화면 표시',iconElement:'아이콘',notice:'알림 설정',userSounds:'알림 소리 목록'};
const words={true:'켜짐',false:'꺼짐',efficient:'효율 기준',kept:'고정 사용량',none:'귀서·임달 미사용',gueseo:'귀서만 사용',both:'귀서 + 임달 사용',master:'임달만',manual:'직접 설정',targeted:'저격 우선',optimal:'평균 횟수 최소화','sam-first':'삼인검 먼저','sain-first':'사인검 먼저'};
const clone=x=>JSON.parse(JSON.stringify(x));
function format(x){if(x==null)return '없음';if(typeof x!=='object')return words[String(x)]??String(x);if(Array.isArray(x)&&x.every(v=>typeof v!=='object'))return x.length?x.join(', '):'없음';return JSON.stringify(x,null,2);}
// ready: 사인검 준비 여부(false면 finish는 삼인검 재료 확보일)
function summary(s){return {gueseo:s.gueseoTotal||0,master:s.masterBudget||0,finish:s.planSnapshot?.finish??null,ready:!!(s.canSainMission||s.sainReadyPlan||s.activeMission?.phase==='sain'||s.currentQty>=300)};}
const dayKey=t=>{if(!t)return '';const d=new Date(t);return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate();};
const differs=(a,b)=>a.gueseo!==b.gueseo||a.master!==b.master||dayKey(a.finish)!==dayKey(b.finish);
function unread(log){return log.entries.some(x=>!x.pending&&!x.read&&x.id>log.readThrough);}
// 버튼 깜빡임용: 안 읽은 기록 중 가장 최근 번호. 화면은 마지막으로 창을 연 시점의 번호와 비교해 새 기록이 있을 때만 깜빡인다.
function newest(log){return log.entries.reduce((m,x)=>!x.pending&&!x.read&&x.id>log.readThrough?Math.max(m,x.id):m,0);}
function discard(log,justAdded){if(justAdded)log.entries.pop();while(log.entries.at(-1)?.pending)log.entries.pop();log.sequence=log.entries.reduce((m,x)=>Math.max(m,x.id),0);log.readThrough=Math.min(log.readThrough,log.sequence);}
function empty(){return {sequence:0,readThrough:0,entries:[],pending:[],baseline:null};}
function observe(log,before,after,now=Date.now()){
 if(!log.baseline&&before.planSnapshot?.source===require('./model').planFingerprint(before))log.baseline=summary(before);
 // The first valid forecast establishes the baseline, including deferred setup calculations.
 if(!log.baseline){
  if(after.planSnapshot?.source===require('./model').planFingerprint(after))log.baseline=summary(after);
  log.pending=[];
  return log;
 }
 const isRecalculation=log.entries.at(-1)?.pending&&after.planSnapshot?.source===require('./model').planFingerprint(after);
 const changes=[];for(const [key,label]of Object.entries(labels))if(!(isRecalculation&&['useShortcuts','thresholdHours'].includes(key))&&JSON.stringify(before[key])!==JSON.stringify(after[key]))changes.push({label,before:format(before[key]),after:format(after[key])});
 const current=summary(after),previous=log.baseline||summary(before),valid=after.planSnapshot?.source===require('./model').planFingerprint(after);
 const changedPlan=valid&&differs(previous,current);
 if(changes.length){log.pending.push(...changes);log.entries.push({id:++log.sequence,at:now,type:'change',before:previous,after:current,changes:clone(changes),pending:!valid,reason:valid?'설정 또는 실제 기록 변경':'설정 또는 실제 기록 변경 · 일정 재계산 대기'});}
 const target=log.entries.at(-1);
 if(valid&&target&&(target.pending||changes.length)){
  if(!changedPlan)discard(log,changes.length>0);
  else{
   if(!changes.length)target.id=++log.sequence;
   target.after=current;target.pending=false;target.type='action';target.reason='아래 변경 반영 · 남은 일정 재계산 완료';
  }
 }else if(changedPlan){log.entries.push({id:++log.sequence,at:now,type:'plan',before:previous,after:current,changes:clone(log.pending),reason:'현재 시각과 저장 조건 기준 · 남은 일정 재계산 완료'});}
 if(valid){log.baseline=current;log.pending=[];}
 return log;
}
function merged(log){const entries=[];for(const entry of log.entries){const prev=entries.at(-1);if(entry.type==='plan'&&prev?.type==='change'&&prev.reason.endsWith('재계산 대기')&&JSON.stringify(entry.changes)===JSON.stringify(prev.changes)){entries[entries.length-1]={...entry,at:prev.at,type:'action'};}else entries.push(entry);}return entries;}
// 화면에 보이는 기록(합쳐진 기록 포함) 기준 전체·안 읽음 건수.
function counts(log){const entries=merged(log);return {total:entries.length,unreadCount:entries.filter(x=>!x.pending&&!x.read&&x.id>log.readThrough).length};}
function page(log,before=Infinity){const entries=merged(log),isUnread=x=>!x.pending&&!x.read&&x.id>log.readThrough;return {entries:entries.filter(x=>x.id<before).slice(-50).reverse().map(x=>({...x,unread:isUnread(x)})),through:log.sequence,unread:unread(log),...counts(log)};}
function markRead(log,through){log.readThrough=Math.max(log.readThrough,Math.min(log.sequence,Number.isSafeInteger(through)?through:0));return log;}
function markEntryRead(log,id){const entry=log.entries.find(x=>x.id===id);if(entry&&!entry.pending)entry.read=true;return log;}
// 사용자가 미리보기를 보고 직접 고른 저장으로 생긴 기록(번호 > seq)은 읽음으로 저장
function markReadAfter(log,seq){for(const entry of log.entries)if(entry.id>seq&&!entry.pending)entry.read=true;return log;}
function clear(log){log.entries=[];log.pending=[];log.readThrough=log.sequence;return log;}
function remove(log,id){
 const index=log.entries.findIndex(x=>x.id===id);if(index<0)return log;
 const entry=log.entries[index],prev=log.entries[index-1];
 // page()가 합쳐서 보여주는 '재계산 대기' 변경 기록도 함께 지운다.
 const merged=entry.type==='plan'&&prev?.type==='change'&&prev.reason.endsWith('재계산 대기')&&JSON.stringify(entry.changes)===JSON.stringify(prev.changes);
 log.entries.splice(merged?index-1:index,merged?2:1);return log;
}
module.exports={empty,observe,page,counts,markRead,unread,newest,markEntryRead,markReadAfter,clear,remove};
