let comparisonResult=null,comparisonWorker=null,comparisonKey='';
// 메인 요약 문구: 보여주기만(누르는 기능 없음) · 사용량 변경은 효율설정, 변경 확인 시 사용량 선택 창에서
function comparisonSummaryText(){
 if(Model.planIssues(state).length)return '계획 불일치 · 실제 기록 기준으로 다시 계산';
 if(state.speedupReviewPending)return '일정 변경 · 기존 기준으로 조정';
 const duration=h=>{const n=Math.floor(Math.max(0,h));return n===0&&h>0?'1시간 미만':Math.floor(n/24)+'일'+(n%24?' '+n%24+'시간':'');};
 if(!Completion.itemsAllowed(state)){const best=comparisonResult?.fast||comparisonResult?.economy,base=comparisonResult?.base;const hours=best?.finish!=null&&base?.finish!=null?Math.max(0,Math.floor((base.finish-best.finish)/3600000)):0;return '사인검 준비 효과 · '+(hours?'준비 + 아이템 사용 시 최대 '+duration(hours)+' 단축 가능':'준비 시 귀서·임달 사용 계산 가능')+' · 준비 시 ‘사인검 준비 예정’ 체크';}
 const using=!!(state.accelerationMode&&(state.gueseoTotal||state.masterBudget));
 if(!comparisonResult)return (using?'현재 선택한 계획':'현재 미사용')+' · 추가 단축 비교 중';
 const c=comparisonResult.current,rows=[comparisonResult.economy,comparisonResult.fast].filter(Boolean),saved=state.planSnapshot?.savedHours??c?.savedHours??0;
 if(state.usageMode==='kept')return '고정 사용량 · 귀서 '+(state.gueseoTotal||0)+'장 / 임달 '+(state.masterBudget||0)+'개 · 미사용 대비 '+duration(saved)+' 단축';
 const faster=rows.filter(r=>r.finish!==null&&c?.finish!==null&&c?.finish-r.finish>=60000);
 if(faster.length)return faster.map(r=>{const items=[r.gueseoCount?'귀서 '+r.gueseoCount+'장':'',r.masterCount?'임달 '+r.masterCount+'개':''].filter(Boolean).join(' + ');if(using){const changes=[[r.gueseoCount-c.gueseoCount,'귀서','장'],[r.masterCount-c.masterCount,'임달','개']].filter(([n])=>n!==0).map(([n,name,unit])=>name+' '+Math.abs(n)+unit+' '+(n>0?'추가':'감소')).join(' · ');return '현재보다 '+(changes||'사용 시점 조정')+' → '+duration((c.finish-r.finish)/3600000)+' 추가 단축';}return items+' 사용 시 '+duration((c.finish-r.finish)/3600000)+' 단축 가능';}).join(' / ')+(faster.every(r=>state.speedupIntent==='both'||(state.speedupIntent==='gueseo'&&r.kind==='economy'))?' · ‘새로고침’ 시 반영':' · ‘효율설정’에서 선택 가능');
 if(!using)return c?.finish===null?'현재 조건으로 계산 불가 · 접속·수행서 설정 확인':'현재 조건에서는 추가 단축 효과 없음';
 const optimal=rows.some(r=>c?.finish!==null&&Math.abs(c.finish-r.finish)<60000&&c.gueseoCount===r.gueseoCount&&c.masterCount===r.masterCount);
 return (optimal?'현재 설정 기준 최적':'현재 선택한 계획')+' · 미사용 대비 '+duration(saved)+' 단축';
}
function refreshComparison(){if(!state||!analysis)return;const key=JSON.stringify([state,analysis.counts]);if(key===comparisonKey)return;comparisonKey=key;comparisonWorker?.terminate();comparisonResult=null;const worker=new Worker('comparison-worker.js');comparisonWorker=worker;worker.onmessage=e=>{if(worker!==comparisonWorker||e.data.progress)return;worker.terminate();comparisonWorker=null;comparisonResult=e.data.result||null;const text=$('comparisonSummaryText');if(text)text.textContent=comparisonSummaryText();};worker.onerror=()=>{worker.terminate();comparisonWorker=null;};worker.postMessage({state:{...state,sainReadyPlan:true,speedupIntent:'both',planStartAt:new Date().toISOString()},analysis:{counts:analysis.counts},now:Date.now(),holidays:HOLIDAYS});}

let adjustmentOpen=false;
let planReviewVersion=0,planReviewNeeded=false,reviewRunning=false,adjustmentApplying=false;
function acceptPlanReview(){planReviewVersion++;planReviewNeeded=false;}
function queuePlanReview(){planReviewVersion++;planReviewNeeded=true;}
function runComparisonWorker(message){
 const worker=new Worker('comparison-worker.js');
 return new Promise((resolve,reject)=>{worker.onmessage=e=>{if(e.data.progress)return;worker.terminate();e.data.error?reject(Error(e.data.error)):resolve(e.data.result);};worker.onerror=e=>{worker.terminate();reject(Error(e.message));};worker.postMessage({holidays:HOLIDAYS,custom:null,now:Date.now(),...message});});
}
async function calculateSamePlan(fresh){
 fresh={...fresh,planStartAt:new Date().toISOString()};
 // 고정 사용량: 사용자가 고른 귀서·임달 개수 안에서만 일정 재계산
 if(fresh.usageMode==='kept'){const result=await runComparisonWorker({state:fresh,mode:'kept'});const p=result.kept;return {chosen:p,kind:p.masterCount>0?'fast':'economy',optimal:false,source:Model.planFingerprint(fresh)};}
 const result=await runComparisonWorker({state:fresh});
 const kind=['master','both'].includes(fresh.speedupIntent)?'fast':'economy',r=fresh.speedupIntent==='none'?null:kind==='fast'?result.fast||result.economy:result.economy;
 return {chosen:r||result.base,kind,optimal:!!r,source:Model.planFingerprint(fresh)};
}
// 설정 변경 + 그 설정 기준 새 계획을 한 번에 저장(선택 창 없이 현재 방식으로 계산)
async function saveWithPlan(extraPatch){
 const draft=Model.normalize({...state,...extraPatch}),source=Model.planFingerprint(state);setCalc('apply',true);
 try{const answer=await calculateSamePlan(draft),p=answer.chosen;if(p.finish===null)throw Error('현재 조건 확보 일정 계산 불가 · 접속 조건 확인 필요');
  const reply=await calendarAPI.saveSettings({...extraPatch,gueseoTotal:p.gueseoCount,masterBudget:p.masterCount,useShortcuts:p.masterCount>0,thresholdHours:p.masterCount>0?29:0,optimizeShortcuts:true,accelerationMode:true,speedupReviewPending:false,planSnapshot:{...p,at:Date.now(),kind:answer.kind,optimal:answer.optimal&&(p.gueseoCount+p.masterCount>0)},expectedSource:source});
  if(!reply.ok)throw Error(reply.error);if(reply.data?.stale)throw Error('보유량 또는 설정 변경됨 · 다시 시도 필요');}
 finally{setCalc('apply',false);}
}
// 선택한 계획 저장용 값 · mode: efficient(효율 기준) 또는 kept(고정 사용량 · 사용 여부도 개수에 맞춤)
function usagePlanPatch(p,mode){return {usageMode:mode,...(mode==='kept'?{speedupIntent:p.masterCount>0?'both':p.gueseoCount>0?'gueseo':'none'}:{}),gueseoTotal:p.gueseoCount,masterBudget:p.masterCount,useShortcuts:p.masterCount>0,thresholdHours:p.masterCount>0?29:0,optimizeShortcuts:true,accelerationMode:true,speedupReviewPending:false,planSnapshot:{...p,at:Date.now(),kind:p.masterCount>0?'fast':p.gueseoCount>0?'economy':'base',optimal:mode==='efficient'&&(p.gueseoCount+p.masterCount>0)}};}
// 사용량 선택 창(①②③): draft = 변경 후 상태 · keep = ①에서 유지할 사용량 · extraPatch = 함께 저장할 설정 변경
// 선택지가 하나뿐이면(①②③ 결과 동일) 묻지 않고 그대로 저장 · 반환: 저장 true / 취소 false
async function openUsageChooser({draft,keep,keepTitle='① 지금 사용량 유지',extraPatch={},expectedValues=null,title='귀서·임달 사용량 선택',alwaysAsk=false}){
 const base=Model.normalize(draft),source=Model.planFingerprint(state),now=Date.now();
 // 사인검 준비 전에는 귀서·임달을 쓰지 않으므로 고를 것이 없음 → 창 없이 현재 방식으로 저장
 if(!Completion.itemsAllowed(base))return saveWithPlan(extraPatch).then(()=>true);
 // viewed = 사용자가 선택 창에서 결과를 보고 직접 누름 → 변동사항 기록을 읽음으로 저장(버튼 깜빡임 없음)
 const save=async(p,mode,viewed=false)=>{const reply=await calendarAPI.saveSettings({...extraPatch,...usagePlanPatch(p,mode),expectedSource:source,...(expectedValues?{expectedValues}:{}),...(viewed?{markRead:true}:{})});if(!reply.ok)throw Error(reply.error);if(reply.data?.stale)throw Error('보유량 또는 설정 변경됨 · 창 다시 열어 확인 필요');return true;};
 const modal=compactEl('div','','modal');modal.id='usageChooser';const box=compactEl('div','','modal-box stack'),list=compactEl('div','','stack'),message=compactEl('p','','error');
 box.append(compactEl('h2',title),compactEl('p','계산 중…','hint'),list,message);modal.append(box);document.body.append(modal);
 let options;try{setCalc('review',true);options=await runComparisonWorker({state:{...base,planStartAt:new Date(now).toISOString()},mode:'options',keep});}catch(e){modal.remove();throw e;}finally{setCalc('review',false);}
 const {kept,efficient,next,efficiency}=options,same=(a,b)=>!!a&&!!b&&a.gueseoCount===b.gueseoCount&&a.masterCount===b.masterCount&&a.finish===b.finish;
 const rows=[[keepTitle,kept,'kept'],['② 효율 기준(1개당 평균 '+efficiency+'시간)',efficient,'efficient'],...(next?[['③ 다음 효율 단계(1개당 평균 '+next.efficiencyHours+'시간)',next,'kept']]:[])].filter(([,p],i,all)=>p&&p.finish!==null&&!all.slice(0,i).some(([,q])=>same(p,q)));
 if(!rows.length){modal.remove();throw Error('현재 조건 확보 일정 계산 불가 · 접속 조건 확인 필요');}
 if(rows.length===1&&!alwaysAsk){try{return await save(rows[0][1],rows[0][2]);}finally{modal.remove();}}
 const current=state.planSnapshot?.finish??null,dayDiff=t=>{if(current===null||t===null)return '';const d=Math.round((new Date(t).setHours(0,0,0,0)-new Date(current).setHours(0,0,0,0))/86400000);return d?' ('+Math.abs(d)+'일 '+(d<0?'단축':'지연')+')':' (변동 없음)';};
 const won=n=>'약 '+Math.round(Math.abs(n)).toLocaleString('ko-KR')+'원',delta=(p,ref)=>{if(!ref||p===ref)return '';const dG=p.gueseoCount-ref.gueseoCount,dM=p.masterCount-ref.masterCount,parts=[];if(dG)parts.push('귀서 '+Math.abs(dG)+'장 '+(dG>0?'추가':'절감'));if(dM)parts.push('임달 '+Math.abs(dM)+'개 '+(dM>0?'추가':'절감'));return parts.length?' · ①보다 '+parts.join(' · '):'';};
 // 제목 줄 오른쪽: 완료까지 남은 일수(올림) · 사용 금액(보유분 포함, 저장된 가격 기준) · ① 대비 차이
 // 비교 괄호: ②는 ①과, ③은 ②와 비교 · 단축·지연은 실제 시간 차이(일·시간 버림) · 하루당 금액은 단축 시간으로 나눔
 const spent=p=>Completion.price(p.gueseoCount,p.masterCount,state).total,amount=n=>Math.round(Math.abs(n)).toLocaleString('ko-KR')+'원';
 const summaryOf=(p,ref,refName)=>{const days=Math.max(0,Math.ceil((p.finish-now)/86400000)),cost=spent(p);let text='완료까지 '+days+'일 · 사용 금액 '+amount(cost);
  if(ref){const diff=cost-spent(ref),hours=Math.floor(Math.abs(ref.finish-p.finish)/3600000),span=Math.floor(hours/24)+'일 '+hours%24+'시간',parts=[Math.abs(diff)<0.5?'금액 같음':(diff>0?'+':'-')+amount(diff)];
   if(hours)parts.push(span+' '+(p.finish<ref.finish?'단축':'지연'));else parts.push('완료일 같음');
   if(p.finish<ref.finish&&hours&&diff>0)parts.push('하루당 약 '+amount(diff/(hours/24)));
   text+=' ('+refName+' 대비 '+parts.join(' · ')+')';}
  return text;};
 box.children[1].textContent='적용 전 미리보기 · 고른 방식으로 일정 저장 · 고정 사용량은 이후 재계산에서도 그 개수 안에서만 계산';
 return new Promise(resolve=>{
  const close=result=>{modal.remove();resolve(result);};
  for(const [label,p,mode]of rows){
   const row=compactEl('div','','usage-choice'),text=compactEl('div','','stack tight');
   const showsEfficient=rows.some(r=>r[1]===efficient),ref=p===kept?null:p===next&&showsEfficient?efficient:kept,refName=ref===efficient?'②':'①';
   const name=compactEl('strong',label);if(mode==='efficient'&&p===efficient)name.append(' ',compactEl('span','추천','usage-recommend'));
   const head=compactEl('div','','usage-choice-head');head.append(name,compactEl('span',summaryOf(p,ref,refName),'usage-choice-summary'));
   text.append(head,compactEl('span',dateTime(p.finish)+dayDiff(p.finish)+' · 귀서 '+p.gueseoCount+'장 · 임달 '+p.masterCount+'개'+delta(p,kept)));
   if(p===next){const hours=Math.floor((efficient.finish-next.finish)/3600000),per=Math.floor(hours/(next.masterCount-efficient.masterCount)*10)/10;text.append(compactEl('small','추가 임달 1개당 평균 '+per+'시간 단축 · ③은 기준을 최대 '+Completion.NEXT_FLOOR+'시간까지 낮춰 탐색(묶음 구매 시 귀서 대비 약 10% 비싼 선)','hint'));}
   const apply=compactButton('이 방식 적용',async()=>{list.querySelectorAll('button').forEach(b=>b.disabled=true);message.textContent='';try{await save(p,mode,true);close(true);}catch(e){message.textContent=e.message;list.querySelectorAll('button').forEach(b=>b.disabled=false);}});apply.classList.add('primary');
   row.append(text,apply);list.append(row);
  }
  const cancel=compactButton('취소',()=>close(false));box.append(cancel);
  modal.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();close(false);}});list.querySelector('button')?.focus();
 });
}
async function saveSamePlan(answer){const {chosen,kind,optimal}=answer;if(chosen.finish===null)throw Error('현재 조건 확보 일정 계산 불가 · 접속 조건 확인 필요');const reply=await calendarAPI.saveSettings({expectedSource:answer.source,gueseoTotal:chosen.gueseoCount,masterBudget:chosen.masterCount,useShortcuts:chosen.masterCount>0,thresholdHours:chosen.masterCount>0?29:0,optimizeShortcuts:true,accelerationMode:true,speedupReviewPending:false,planSnapshot:{...chosen,at:Date.now(),kind,optimal:optimal&&(chosen.gueseoCount+chosen.masterCount>0)}});if(!reply.ok)throw Error(reply.error);if(reply.data?.stale){queuePlanReview();return false;}return true;}
async function applySamePlan(before=null){
 adjustmentApplying=true;setCalc('apply',true);try{if(before)await before();const fresh=Model.normalize(await calendarAPI.loadSettings());if(!fresh.onboarded)return;const saved=await saveSamePlan(await calculateSamePlan(fresh));if(saved)planReviewNeeded=false;}finally{adjustmentApplying=false;setCalc('apply',false);if(planReviewNeeded)reviewPlanChange();}
}
async function reviewPlanChange(){
 if(!planReviewNeeded||reviewRunning||adjustmentApplying||busy||!state||!state.onboarded)return;
 reviewRunning=true;setCalc('review',true);const version=planReviewVersion;
 try{const answer=await calculateSamePlan(Model.normalize(state));if(version!==planReviewVersion)return;planReviewNeeded=false;await saveSamePlan(answer);$('error').textContent='';}
 catch(e){planReviewNeeded=false;showCalculationError(e.message);}
 finally{reviewRunning=false;setCalc('review',false);if(planReviewNeeded)reviewPlanChange();}
}
function showCalculationError(message){$('error').textContent=message;renderCompactDashboard();let d=document.getElementById('calculationError');if(d)return;d=compactEl('dialog','','speedup-popup');d.id='calculationError';const body=compactEl('div','','speedup-popup-body stack');body.append(compactEl('h2','계산 필요 입력 확인'),compactEl('p',message),compactEl('p','접속 가능 요일·시간, 수행서 수량, 임무 가능 상태 확인 필요'),compactButton('설정 열기',()=>{d.close();calendarAPI.openSettingsWindow();}),compactButton('닫기',()=>d.close()));d.append(body);d.onclose=()=>d.remove();document.body.append(d);d.showModal();}
function showPlanAdjustment(before=null){applySamePlan(before).catch(e=>showCalculationError(e.message));}

let manualRefreshBusy=false;
async function refreshSelectedPlan(){if(manualRefreshBusy)return;manualRefreshBusy=true;renderCompactDashboard();try{await applySamePlan();$('error').textContent='';$('status').textContent='현재 기록과 기존 선택 기준 일정 재계산 완료';}catch(e){showCalculationError(e.message);}finally{manualRefreshBusy=false;renderCompactDashboard();}}
