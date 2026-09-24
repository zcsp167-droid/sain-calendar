const $=id=>document.getElementById(id);let state,analysis,plan,worker,requestId=0,busy=false,selectedAction=null,onboardDismissed=false;
let month=new Date(),openedDay=null;month.setDate(1);
let notes;try{notes=JSON.parse(localStorage.getItem('personal_notes_v1')||'{}');}catch{notes={};}
const dateTime=t=>new Date(t).toLocaleString('ko-KR',{year:'numeric',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false});
const time=t=>new Date(t).toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit',hour12:false});
function displayState(){
  $('strategyBadge').hidden=state.hasSamSword;$('samInventory').hidden=state.hasSamSword;
  $('strategyBadge').textContent=state.strategy==='targeted'?'저격 우선':'평균 횟수 최소화';$('orderLabel').textContent=state.hasSamSword?'삼인검 보유 · 사인검만 진행':state.canSainMission?'사인검 → 삼인검':'삼인검 먼저 · 사인검 준비 대기';
  $('notifyBtn').textContent='알림 설정';
  $('counts').replaceChildren();Model.names.forEach((name,i)=>{const box=document.createElement('div');box.className='count'+(state.tabletQty[i]>=50?' done':'');const label=document.createElement('span');label.textContent=name;const value=document.createElement('strong');value.textContent=state.tabletQty[i];const bar=document.createElement('div');bar.className='bar';const fill=document.createElement('i');fill.style.width=Math.min(100,state.tabletQty[i]*2)+'%';bar.append(fill);box.append(label,value,bar);makeEditable(box,()=>openScalar('tablet'+i,Model.names[i]+' 석판 조각',state.tabletQty[i]));$('counts').append(box);});
  $('sainCard').querySelector('span').textContent=Model.shardName(state);$('rewardSain').textContent=Model.shardName(state)+' 5개와 '+Model.names[['fire','water','wind','thunder','earth'].indexOf(state.craftElement)]+' 석판 조각 1개 수령으로 기록';
  $('sainCount').textContent=state.currentQty+' / 300';$('carryNote').textContent='실제 보유량 기준 · 각 50개 이상';
  const active=state.activeMission,phase=active?.phase||Model.nextPhase(state);$('phaseBadge').textContent=phase==='sam'?'삼인검':phase==='sain'?'사인검':!state.canSainMission&&state.currentQty<300?'준비 대기':'완료';
  $('missionTitle').textContent=active?'진행 중인 임무':'다음 임무';$('samChoice').hidden=phase!=='sam'||!!active;$('importedReward').hidden=true;
  const rewardAction=active?.action===null?($('importedAction').value===''?null:Number($('importedAction').value)):active?.action;
  $('boxResult').hidden=true;
  $('startBtn').hidden=!!active||!phase;const startReason=state.tabletReviewPending?'석판 보유량 확인 필요':state.currentTickets<1?'수행서 부족':phase==='sain'&&!state.craftElementSelected?'사인검 속성 선택 필요':busy?'계산 중':'';$('startBtn').disabled=!!startReason;$('completeBtn').hidden=!active;$('cancelBtn').hidden=true;$('undoBtn').textContent='되돌리기';$('undoBtn').disabled=!active&&(!state.history.length||(state.hasSamSword&&state.history.at(-1)?.phase==='sam'));$('startBtn').textContent=startReason||'임무 보내기';
  if(active){const ready=+new Date(active.startedAt)+30*3600000,remaining=Math.max(0,(ready-Date.now())/3600000);$('missionInfo').textContent=`${dateTime(active.startedAt)} 시작 · 남은 시간 ${Math.floor(Math.ceil(remaining*60)/60)}시간 ${Math.ceil(remaining*60)%60}분 · ${dateTime(ready)} 수령 가능 예정${remaining>0&&remaining<=state.thresholdHours?` · 지금 완료 시 약 ${remaining.toFixed(1)}시간 단축 필요`:''}`;$('completeBtn').disabled=false;updateCountdown();}
  else $('missionInfo').textContent=!phase?(!state.canSainMission&&state.currentQty<300?'삼인검 임무 재료 확보 완료 · 사인검 임무 가능 시 왼쪽 ‘사인검 불가능’ 클릭 후 변경':'필요 임무 재료 전체 확보 완료'):phase==='sain'?'1회 30시간 · '+Model.shardName(state)+' 5개 · 실제 임무 발송 후 ‘임무 보내기’ 클릭':'추천 확인 → 게임에서 임무 발송 → ‘임무 보내기’ 클릭 · 실제 임무 결과만 보유량 반영';
  renderDashboard();if(typeof renderCompactDashboard==='function')renderCompactDashboard();
  $('history').replaceChildren();for(const h of state.history.slice(-5).reverse()){const row=document.createElement('div');row.textContent=`${dateTime(h.finishedAt)} · ${h.phase==='sain'?'사인검 X옥 +5':h.action===2?'기린 +2 / 상자 '+Model.names[h.box]+' +5':h.action===0?'주작·현무 +2':'백호·청룡 +2'}`;$('history').append(row);}if(!state.history.length)$('history').textContent='기록 없음';
}
function refreshForecast(){
  if(!analysis)return;
  plan=Schedule.forecast(state,analysis,new Date(),HOLIDAYS);
  if(state.planSnapshot&&state.planSnapshot.source===Model.planFingerprint(state)){const snap=state.planSnapshot,log=snap.log.map((m,i)=>({...m,...(i===0&&state.activeMission?{...state.activeMission,start:+new Date(state.activeMission.startedAt),active:true}:{})}));plan={...plan,log,purchases:snap.purchases,meanFinish:snap.finish,meanSamFinish:log.filter(m=>m.phase==='sam').at(-1)?.collect??snap.at,meanSainFinish:log.filter(m=>m.phase==='sain').at(-1)?.collect??snap.at};}
  const preparationMissing=!state.canSainMission&&state.activeMission?.phase!=='sain'&&!state.sainReadyPlan&&state.currentQty<300;if(preparationMissing){plan.preparedSainFinish=Schedule.forecast({...state,sainReadyPlan:true,order:'sam-first'},analysis,new Date(),HOLIDAYS).meanSainFinish;plan.meanFinish=null;plan.meanSainFinish=null;plan.conditionalSain=false;}
  $('forecastTitle').textContent='전체 임무 재료 확보 예정';$('sainFinishDate').textContent=state.currentQty>=300?'확보 완료':plan.meanSainFinish===null?(preparationMissing?'사인검 준비 필요':'확보 일정 확인 필요'):dateTime(plan.meanSainFinish);
  $('samFinishDate').textContent=state.hasSamSword?'삼인검·석판 준비 완료':plan.meanSamFinish===null?'퀘스트·수행서 확보 필요':dateTime(plan.meanSamFinish);
  $('finishDate').textContent=state.currentQty>=300&&(state.hasSamSword||state.tabletQty.every(n=>n>=50)&&state.ironQty>=20)?'재료 수집 완료':plan.meanFinish===null?(preparationMissing?'사인검 준비 필요':'확보 일정 확인 필요'):dateTime(plan.meanFinish);
  $('finishRange').textContent=plan.p95Finish===null?'선택한 접속 요일의 주간 퀘스트 수급 가능 여부 확인 필요':`모의계산 95% 최종 완료 시점: ${dateTime(plan.p95Finish)}`;
  $('planSummary').textContent=(state.hasSamSword?'':`삼인검 임무 약 ${plan.meanSamCount.toFixed(1)}회${state.activeMission?.phase==='sam'?' + 진행 중 1회':''} · 철제검 조각 ${state.ironQty}/20 · `)+`사인검 임무 ${Math.ceil((300-state.currentQty)/5)}회`+(plan.conditionalSain?' · 사인검 날짜: 삼인검 임무 종료 시점 사인검 임무 가능 가정':'')+(state.useShortcuts?` · 임무의달인 예상 ${plan.masterCount}개 / 추가 필요 ${plan.masterNeeded}개`:'')+' · 주간 퀘스트 완료 및 입력한 추가 확보 계획 전제 날짜';
  if(typeof renderCompactDashboard==='function')renderCompactDashboard();renderCalendar();if(typeof refreshComparison==='function')refreshComparison();if(typeof reviewPlanChange==='function')reviewPlanChange();if(openedDay&&!$('dayModal').hidden)openDay(openedDay);
}
function analyze(){
  if(!state?.onboarded){worker?.terminate();worker=null;requestId++;busy=false;setCalc('analysis',false);analysis=null;plan=null;for(const id of ['finishDate','samFinishDate','sainFinishDate'])$(id).textContent='초기설정 필요';$('status').textContent='초기설정에서 ‘저장 · 시작’ 클릭 필요';$('onboardOverlay').hidden=onboardDismissed;displayState();return;}
  $('onboardOverlay').hidden=true;
  busy=true;setCalc('analysis',true);displayState();$('status').textContent='현재 수량 기준 전략·날짜 계산 중…';$('error').textContent='';
  if(worker)worker.terminate();worker=new Worker('analysis-worker.js');const id=++requestId;
  const receive=e=>{if(e.data.id!==requestId)return;if(e.data.error){busy=false;setCalc('analysis',false);$('status').textContent='계산 실패';$('error').textContent=e.data.error;return;}analysis=e.data.result;busy=false;setCalc('analysis',false);
    if(selectedAction===null&&analysis.recommended>=0){selectedAction=analysis.recommended;$('actionChoice').value=String(selectedAction);}
    const rec=analysis.recommended;
    $('recommendation').textContent=rec<0?'삼인검 조각 목표 달성':`현재 전략 추천: ${Model.labels[rec]}${rec===2?(state.tabletQty[4]<50?' · 기린 확정 보상 확보':' · 평균 횟수 기준 상자 선택'):''}`;
    $('comparison').replaceChildren();analysis.choices.forEach((n,i)=>{if(n===null)return;const row=document.createElement('div');row.className='compare-row';const a=document.createElement('span');a.textContent=Model.labels[i];const b=document.createElement('strong');b.textContent=n.toFixed(2)+'회';row.append(a,b);$('comparison').append(row);});
    try{refreshForecast();$('status').textContent=!state.canSainMission?'삼인검 준비 후 사인검 임무 가능 가정 예상':state.hasSamSword?'진행 중인 임무와 보유량 반영 사인검 일정':'상자 결과 입력 시 전체 예상 일정 재계산';if(analysis.activeAssumption!==null&&analysis.activeAssumption!==undefined)$('status').textContent+=' 진행 중인 삼인검 보상 '+Model.labels[analysis.activeAssumption]+' 가정 · 실제 수령 시 수정';}catch(err){$('error').textContent=err.message;}
    displayState();if(worker)worker.terminate();worker=null;
  };
  worker.onmessage=receive;
  if(state.hasSamSword){receive({data:{id,result:{recommended:-1,choices:[],counts:[0],activeAssumption:null}}});return;}
  worker.onerror=e=>{busy=false;setCalc('analysis',false);$('error').textContent='계산 미완료 · '+e.message;};
  const phase=Model.nextPhase(state),firstAction=!state.activeMission&&phase==='sam'?selectedAction:null;
  worker.postMessage({id,input:{qty:Model.samQuantity(state),strategy:state.strategy,firstAction,activeAction:state.activeMission?.phase==='sam'?state.activeMission.action:null,activeUnknown:state.activeMission?.phase==='sam'&&state.activeMission.action===null}});
}
function eventsFor(key){
 const events=(plan?.log||[]).filter(m=>Schedule.key(new Date(m.start))===key).map(m=>({...m,eventAt:m.start,eventKind:'start'}));
 const active=plan?.log?.find(m=>m.active);
 if(active){const ready=+new Date(active.startedAt)+30*3600000;
   if(Schedule.key(new Date(ready))===key)events.push({...active,eventAt:ready,eventKind:'ready'});

 }
 if(state.accelerationMode&&!state.speedupReviewPending&&!Model.planIssues(state).length){for(const purchase of plan?.purchases||[])if(Schedule.key(new Date(purchase.at))===key)events.push({eventKind:'gueseo',eventAt:purchase.at,qty:purchase.qty});for(const mission of plan?.log||[])if(mission.shortcutHours>0&&Schedule.key(new Date(mission.collect))===key)events.push({eventKind:'master',eventAt:mission.collect,qty:mission.shortcutHours});}
 return events.sort((a,b)=>a.eventAt-b.eventAt);
}
function renderCalendar(){
  $('calendarBudget').textContent=`현재 보유 2차특수임무수행서 ${state.currentTickets}장 기준`+(plan?.calendarBlocked?' · 이후 수행서 확보 대기':'')+' · 퀘스트 수령 또는 보유량 수정 시 갱신';
  const now=new Date(),sameMonth=month.getFullYear()===now.getFullYear()&&month.getMonth()===now.getMonth();$('monthTitle').textContent=sameMonth?now.toLocaleDateString('ko-KR',{year:'numeric',month:'long',day:'numeric',weekday:'short'}):month.toLocaleDateString('ko-KR',{year:'numeric',month:'long'})+' · 오늘 '+now.toLocaleDateString('ko-KR',{month:'numeric',day:'numeric',weekday:'short'});$('calendar').replaceChildren();
  const first=new Date(month);first.setDate(1-first.getDay());const today=Schedule.key(new Date());
  for(let i=0;i<42;i++){const d=new Date(first);d.setDate(d.getDate()+i);const key=Schedule.key(d),cell=document.createElement('div');cell.className='day'+(d.getMonth()!==month.getMonth()?' out':'')+(key===today?' today':'')+(d.getDay()===0?' sun':d.getDay()===6?' sat':'');cell.tabIndex=0;cell.setAttribute('role','button');cell.setAttribute('aria-label',key+' 일정');cell.dataset.date=key;
    const num=document.createElement('span');num.className='number';num.textContent=d.getDate();const dateRow=document.createElement('div');dateRow.className='day-heading';dateRow.append(num);cell.append(dateRow);if(state?.blockedDates.includes(key)){cell.classList.add('unavailable');const badge=document.createElement('span');badge.className='unavailable-label';badge.textContent='접속 불가';cell.append(badge);}if(HOLIDAYS[key]){cell.classList.add('holiday');const name=document.createElement('span');name.className='holiday-name';name.textContent=HOLIDAYS[key];name.title=HOLIDAYS[key];dateRow.append(name);}
    for(const m of eventsFor(key)){const e=document.createElement('span');if(m.eventKind==='gueseo'||m.eventKind==='master'){e.className='event planned-item '+m.eventKind;e.textContent=(m.eventKind==='gueseo'?'귀서 '+m.qty+'장':'임달 '+m.qty+'개 · '+time(m.eventAt));cell.append(e);continue;}const ended=m.active&&Date.now()>=+new Date(m.startedAt)+30*3600000;e.className='event '+m.phase+(m.active?(ended?' active awaiting':' active running'):'');e.textContent=(m.phase==='sam'?'삼인':'사인')+' '+time(m.eventAt)+(m.eventKind==='ready'?(ended?' 수령 대기':' 종료 예정'):m.eventKind==='collect'?' 수령 예정':m.active?(ended?' 수령 대기':' 진행'):' 예상');cell.append(e);}for(const n of (notes[key]||[])){const e=document.createElement('span');e.className='event personal-event';e.style.borderLeftColor=n.color||'#e6b566';e.textContent=(n.alarmAt?'⏰ ':'')+(n.time?n.time+' · ':'')+(typeof n==='string'?n:n.text);e.title=e.textContent;cell.append(e);}cell.onclick=()=>clickCalendarDay(key);cell.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();if(blockMode&&!blockSaving){blockDraft.has(key)?blockDraft.delete(key):blockDraft.add(key);paintBlockDraft();}else clickCalendarDay(key);}};$('calendar').append(cell);
  }
  if(typeof paintBlockDraft==='function')paintBlockDraft();
}
function openDay(key){openedDay=key;$('dayTitle').textContent=key;$('dayUnavailable').checked=state.blockedDates.includes(key);$('dayError').textContent='';$('dayEvents').replaceChildren();
 for(const m of eventsFor(key)){const row=document.createElement('p');row.className='small';if(m.eventKind==='gueseo'||m.eventKind==='master'){row.textContent=m.eventKind==='gueseo'?'일요일 귀서 '+m.qty+'장 → 수행서 '+m.qty*2+'장 추가 · 이번 주 임무를 보내기 전에 사용':dateTime(m.eventAt)+' · 임달 '+m.qty+'개 → '+m.qty+'시간 단축 후 수령';$('dayEvents').append(row);continue;}row.textContent=`${m.phase==='sam'?'삼인검':'사인검'} · ${m.eventKind==='ready'?'임무 시간 종료 (실제 수령은 직접 기록)':m.eventKind==='collect'?'접속 가능한 수령 예정':m.active?'진행 중인 임무 시작':'예상 시작'} ${dateTime(m.eventAt)}`;$('dayEvents').append(row);}
 if(!eventsFor(key).length)$('dayEvents').textContent=state.blockedDates.includes(key)?'이날은 새 임무·보상 수령·퀘스트 수급 예상에서 제외':'예정 임무 없음';
 renderNotes();$('dayModal').hidden=false;
}
function renderNotes(){$('notes').replaceChildren();(notes[openedDay]||[]).forEach((text,i)=>{const row=document.createElement('div');row.className='note-row';const span=document.createElement('span');span.textContent=text;const del=document.createElement('button');del.textContent='삭제';del.onclick=()=>{notes[openedDay].splice(i,1);localStorage.setItem('personal_notes_v1',JSON.stringify(notes));renderNotes();renderCalendar();};row.append(span,del);$('notes').append(row);});}
let actionBusy=false;async function action(fn){if(actionBusy)return;actionBusy=true;$('error').textContent='';try{const r=await fn();if(!r.ok)throw Error(r.error);}catch(e){$('error').textContent=e.message;renderCompactDashboard();}finally{actionBusy=false;if(typeof renderMissionManager==='function')renderMissionManager();}}
$('startBtn').onclick=()=>action(()=>calendarAPI.startMission(Number($('actionChoice').value)));
$('importedAction').onchange=displayState;
let receiptMissionId=null,receiptEarly=false;
$('completeBtn').onclick=async()=>{
 if(!state.activeMission)return;const id=state.activeMission.id;const start=+new Date(state.activeMission.startedAt),early=Date.now()<start+30*3600000,remaining=(start+30*3600000-Date.now())/3600000;
 // 조기 수령 확인은 팝업 하나로: 임달을 쓰는 구간이면 사용 개수를 함께 보여준다.
 let earlyMessage;if(remaining>0&&remaining<=(state.thresholdHours>0?state.thresholdHours+1/6:.01)){const used=state.thresholdHours>0?Math.ceil(Math.max(0,remaining-1/6)):Math.ceil(remaining);earlyMessage='임달 '+used+'개 사용 → '+used+'시간 단축 후 수령 (보유 임달 '+state.masterQty+'개'+(used>state.masterQty?' · 부족':'')+')';}
 if(early&&!await confirmEarly(earlyMessage))return;if(state.activeMission?.id!==id)return;receiptEarly=early;
 receiptMissionId=state.activeMission.id;
 // 받는 석판이 정해진 임무(사인검, 삼인검 50~80·80~100)는 입력할 게 없어서 창 없이 바로 기록한다.
 const m=state.activeMission;if(m.phase==='sain'||(m.phase==='sam'&&(m.action===0||m.action===1))){
  const rewards=m.phase==='sain'?[0,0,0,0,0]:m.action===0?[2,2,0,0,0]:[0,0,2,2,0];
  const allowEarly=Date.now()<start+(30-(state.thresholdHours>0?state.thresholdHours+1/6:.01))*3600000;
  return action(async()=>{const r=await window.calendarAPI.completeMission({rewards,missionId:m.id,allowEarly});if(r.ok)closeMissionManager(true);return r;});
 }
 $('rewardRecorded').textContent='기록된 임무 · '+missionDescription();boxSelected=null;syncRewardView();
 for(let i=0;i<5;i++)$('rewardQty'+i).value='0';
 $('rewardError').textContent='';$('rewardModal').hidden=false;focusEditor($('rewardModal'));
};
// 상자 선택: 석판을 누르면 선택만 되고 합산 수량이 보이며, '적용'을 눌러야 기록된다. 각 줄은 같은 칸을 써서 세로로 맞는다.
let boxSelected=null;
function buildBoxChoices(){
 const host=$('rewardBoxButtons'),q=state.tabletQty;host.replaceChildren();
 host.style.cssText='display:grid;grid-template-columns:auto repeat(5,1fr);gap:6px;align-items:center';
 const text=(value,cls)=>{const e=document.createElement('span');e.className=cls||'hint';e.textContent=value;if(cls)e.style.textAlign='center';return e;};
 host.append(text('보상 선택'));
 Model.names.forEach((name,i)=>{const b=document.createElement('button');b.textContent=name;b.className='quiet'+(boxSelected===i?' active':'');b.onclick=()=>{boxSelected=i;buildBoxChoices();};host.append(b);});
 host.append(text('기존 수량'));
 Model.names.forEach((name,i)=>host.append(text(String(q[i]),'compact-value')));
 if(boxSelected!==null){
  const sum=q.slice();sum[4]+=2;sum[boxSelected]+=5;
  host.append(text('합산 수량'));
  Model.names.forEach((name,i)=>{const cell=text(String(sum[i]),'compact-value');if(sum[i]!==q[i])cell.style.fontWeight='700';host.append(cell);});
 }
 const row=document.createElement('div');row.style.cssText='grid-column:1 / -1;display:flex;gap:6px';
 const apply=document.createElement('button');apply.textContent='적용';apply.className='primary';apply.disabled=boxSelected===null;apply.onclick=()=>saveRewardWith(String(boxSelected));
 const hold=document.createElement('button');hold.textContent='상자 보류';hold.className='quiet';hold.onclick=()=>saveRewardWith('later');
 const cancel=document.createElement('button');cancel.textContent='취소';cancel.className='quiet';cancel.onclick=()=>$('closeReward').click();
 for(const b of [apply,hold,cancel])b.style.flex='1 1 0';
 row.append(apply,hold,cancel);host.append(row);
}
function syncRewardView(){
 const m=state.activeMission,tier2=m?.phase==='sam'&&m.action===2;
 $('rewardInputs').hidden=!(m?.phase==='sam'&&!tier2);$('rewardHint').hidden=$('rewardInputs').hidden;$('rewardBox').hidden=!tier2;$('saveReward').hidden=tier2;$('closeReward').hidden=tier2;if(tier2)buildBoxChoices();$('rewardSain').hidden=m?.phase!=='sain';
 const note=tier2?'기린 석판 +2 자동 적용 · 상자에서 나온 석판 선택 후 ‘적용’ · 미개봉 시 ‘상자 보류’ · 보류 시 석판 개수 업데이트 필수(미업데이트 시 계산 오류)':'';
 $('rewardNote').hidden=!note;$('rewardNote').textContent=note;
}
$('closeReward').onclick=()=>$('rewardModal').hidden=true;
$('saveReward').onclick=()=>saveRewardWith();
async function saveRewardWith(boxChoice){
 $('rewardError').textContent='';
 try{
 if(!state.activeMission||state.activeMission.id!==receiptMissionId)throw Error('임무 상태 변경됨 · 수령 창 다시 열기 필요');
 const m=state.activeMission,tier2=m.phase==='sam'&&m.action===2;
 let rewards,boxLater=false;
 if(m.phase==='sain')rewards=[0,0,0,0,0];
 else if(tier2){const pickBox=boxChoice;if(pickBox===undefined)throw Error('상자에서 나온 석판 선택 필요');rewards=[0,0,0,0,2];if(pickBox==='later')boxLater=true;else rewards[Number(pickBox)]+=5;}
 else rewards=Array.from({length:5},(_,i)=>$('rewardQty'+i).value.trim()===''?NaN:Number($('rewardQty'+i).value));
 if(m.phase==='sam'&&!boxLater)Reward.decode(rewards);
 const early=Date.now()<+new Date(state.activeMission.startedAt)+(30-(state.thresholdHours>0?state.thresholdHours+1/6:.01))*3600000;
 if(early&&!receiptEarly&&!await confirmEarly())return;
 $('saveReward').disabled=true;
 const result=await window.calendarAPI.completeMission({rewards,missionId:receiptMissionId,allowEarly:early,boxLater});
 if(!result.ok)throw Error(result.error);
 $('rewardModal').hidden=true;closeMissionManager(true);
 }catch(e){$('rewardError').textContent=e.message;}finally{$('saveReward').disabled=false;}
};
$('cancelBtn').onclick=()=>action(()=>window.calendarAPI.cancelMission());$('undoBtn').onclick=()=>action(()=>state.activeMission?window.calendarAPI.cancelMission():window.calendarAPI.undoComplete());
$('settingsBtn').onclick=()=>window.calendarAPI.openSettingsWindow();$('helpBtn').onclick=()=>window.calendarAPI.openHelp();$('notifyBtn').onclick=()=>openGroup('notifications','알림 설정');
// 알림 소리 상태: 재생 중이면 '소리 끄기' 표시 · 소리 파일 문제는 상단 알림 줄에 표시
let soundIssueText='';
function applySoundState(d){const playing=!!d?.playing?.startsWith('alarm:');$('soundStopBtn').hidden=!playing;$('alarmOffBtn').hidden=!playing;soundIssueText=d?.issue||'';if(typeof renderPersonalAlerts==='function')renderPersonalAlerts();}
window.calendarAPI.onSoundState(applySoundState);window.calendarAPI.soundState().then(r=>{if(r.ok)applySoundState(r.data);});
$('soundStopBtn').onclick=async()=>{$('soundStopBtn').hidden=true;await window.calendarAPI.stopSound();};
$('alarmOffBtn').onclick=async()=>{$('soundStopBtn').hidden=true;$('alarmOffBtn').hidden=true;await window.calendarAPI.muteAlarm();};
$('resetSizeBtn').onclick=()=>window.calendarAPI.resetWindowSize();$('minBtn').onclick=()=>window.calendarAPI.minimize();$('maxBtn').onclick=()=>window.calendarAPI.toggleMaximize();$('closeBtn').onclick=()=>window.calendarAPI.close();
$('onboardOverlayBtn').onclick=()=>window.calendarAPI.openSettingsWindow();
$('onboardOverlayClose').onclick=()=>{onboardDismissed=true;$('onboardOverlay').hidden=true;};
// 안내창에서 바로 백업 파일을 불러온다. 초기설정이 끝난 파일이면 설정 갱신과 함께 안내창이 닫힌다.
$('onboardOverlayImport').onclick=async()=>{
  const button=$('onboardOverlayImport');button.disabled=true;$('onboardOverlayStatus').textContent='';
  try{const r=await window.calendarAPI.importBackup();if(!r.ok)throw Error(r.error);if(r.cancelled)$('onboardOverlayStatus').textContent='취소됨';else{$('onboardOverlayStatus').textContent='불러오기 완료 · 기존 내용 자동 백업 보관';$('dayModal').hidden=true;blockMode=false;informationCollapsed=false;applyView('calendar');}}
  catch(e){$('onboardOverlayStatus').textContent=e.message;}finally{button.disabled=false;}
};
// 초기설정 전엔 캘린더 메모와 창 조작 버튼만 그대로 쓸 수 있게 두고, 그 외 기능을 누르면 안내창을 다시 띄운다.
document.addEventListener('click',e=>{
  if(state?.onboarded)return;
  if($('onboardOverlay').contains(e.target))return;
  if(e.target.closest('#resetSizeBtn,#minBtn,#maxBtn,#closeBtn,.day,#dayModal,#prevBtn,#nextBtn,#todayBtn,#helpBtn,#backupModal'))return;
  // 백업 창은 안내창 아래에 뜨므로 안내창을 잠시 내린다.
  if(e.target.closest('#backupBtn')){$('onboardOverlay').hidden=true;return;}
  e.preventDefault();e.stopPropagation();onboardDismissed=false;$('onboardOverlay').hidden=false;
},true);
// 계산이 0.3초 넘게 걸리면 가운데 안내창을 띄우고 끝나면 닫는다. 떠 있는 동안 창 조작 버튼과 열린 창 안을 뺀 클릭은 막는다.
const calcStages=new Map(),calcLabels={analysis:'전략·날짜 계산 중…',review:'변경 반영 일정 재계산 중…',apply:'변경 반영 일정 재계산 중…'};let calcTimer=null,calcWatch=null;
function setCalc(stage,on){
  if(on)calcStages.set(stage,Date.now());else calcStages.delete(stage);
  const overlay=$('busyOverlay');if(!overlay)return;
  if(!calcStages.size){clearTimeout(calcTimer);clearTimeout(calcWatch);calcTimer=calcWatch=null;overlay.hidden=true;return;}
  $('busyText').textContent=calcLabels[[...calcStages].sort((a,b)=>b[1]-a[1])[0][0]]||'계산 중…';
  if(overlay.hidden&&!calcTimer)calcTimer=setTimeout(()=>{calcTimer=null;if(!calcStages.size)return;overlay.hidden=false;
    // 계산이 끝났다는 신호를 놓쳐도 화면이 잠긴 채 남지 않도록 15초 뒤에는 무조건 닫는다.
    clearTimeout(calcWatch);calcWatch=setTimeout(()=>{calcStages.clear();calcWatch=null;overlay.hidden=true;},15000);},300);
}
for(const type of ['click','dblclick'])document.addEventListener(type,e=>{
  if($('busyOverlay').hidden)return;
  if(e.target.closest('#resetSizeBtn,#minBtn,#maxBtn,#closeBtn,dialog[open]'))return;
  e.preventDefault();e.stopPropagation();
},true);
$('actionChoice').onchange=()=>{selectedAction=Number($('actionChoice').value);analyze();};
$('prevBtn').onclick=()=>{month.setMonth(month.getMonth()-1);renderCalendar();};$('nextBtn').onclick=()=>{month.setMonth(month.getMonth()+1);renderCalendar();};$('todayBtn').onclick=()=>{month=new Date();month.setDate(1);renderCalendar();};
$('closeModal').onclick=()=>$('dayModal').hidden=true;$('addNote').onclick=()=>{const text=$('noteText').value.trim();if(!text)return;(notes[openedDay]??=[]).push(text);localStorage.setItem('personal_notes_v1',JSON.stringify(notes));$('noteText').value='';renderNotes();renderCalendar();};$('noteText').onkeydown=e=>{if(e.key==='Enter')$('addNote').click();};
window.calendarAPI.onSettingsUpdated(s=>{const next=Model.normalize(s),comparable=x=>{const {changeLogUnread,changeLogNewest,changeLogThrough,changeLogCounts,displayMode,iconElement,personalNotes,reminderLast,craftInventory,...rest}=x;return JSON.stringify(rest);};if(state&&comparable(state)===comparable(next)){state=next;renderChangeLogButtons();if(s.personalNotes)notes=s.personalNotes;if(openedDay)renderNotes();renderCalendar();return;}const changed=state&&Model.planFingerprint(state)!==Model.planFingerprint(next),selected=JSON.stringify(state?.planSnapshot)!==JSON.stringify(next.planSnapshot);if(next.planSnapshot?.source===Model.planFingerprint(next)){acceptPlanReview();}else if(changed||selected){queuePlanReview();}state=next;if(s.personalNotes)notes=s.personalNotes;selectedAction=null;$('boxChoice').value='';$('importedAction').value='';displayState();analyze();});
setInterval(()=>{if(state&&!document.querySelector('.modal:not([hidden])')&&!document.activeElement?.closest('.master-efficiency'))displayState();},15000);
setInterval(()=>{if(state?.activeMission)updateCountdown();},1000);
// Full forecasts update only after user actions, never on a repeating timer.
window.addEventListener('DOMContentLoaded',()=>window.calendarAPI.loadSettings().then(async s=>{state=Model.normalize(s);await loadPersonalNotes();if(state.planSnapshot?.source!==Model.planFingerprint(state))queuePlanReview();displayState();renderCalendar();analyze();}).catch(e=>$('error').textContent=e.message));

$('resetBtn').onclick=async()=>{
 $('resetBtn').disabled=true;
 try{
  const r=await window.calendarAPI.resetSettings();
  if(!r.ok)throw Error(r.error);
  if(!r.cancelled){
   localStorage.removeItem('sain-view-mode');localStorage.removeItem('personal_notes_v1');localStorage.removeItem('sain-notified-v2');
   window.location.reload();
  }
 }catch(e){$('error').textContent=e.message;}finally{$('resetBtn').disabled=false;}
};
