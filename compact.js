let compactMaterialsOpen=false,startupBusy=false,startupError='',minimizeBusy=false,minimizeError='';
function masterEfficiencyControl(){const button=compactButton('효율설정',openEfficiencySettings);button.classList.add('efficiency-entry');return button;}
const compactEl=(tag,text,cls)=>Object.assign(document.createElement(tag),{textContent:text||'',className:cls||''});
function compactButton(text,fn,disabled=false){const b=compactEl('button',text,'quiet');b.disabled=disabled;b.onclick=fn;return b;}
function compactProxy(id,text){return compactButton(text||$(id).textContent,()=>$(id).click(),$(id).disabled);}
function compactNumber(title,value,key){const span=compactEl('span',title+' '+value,'compact-value');makeEditable(span,()=>openScalar(key,title,key.startsWith('tablet')?state.tabletQty[Number(key.slice(6))]:state[key]));return span;}
function settingLink(text,group){return compactButton(text,()=>openGroup(group,text));}
function readinessWarning(){return !state.canSainMission&&state.currentQty<300&&!state.activeMission&&!Model.nextPhase(state);}
function renderCompactDashboard(){
 if(!state)return;
 const craftButton=$('craftBtn');const host=$('compactDashboard');host.replaceChildren();host.hidden=$('viewMode').value!=='calendar';
 const row=()=>{const line=compactEl('div','','compact-line');host.append(line);return line;};
 const quest=$('compactQuest');quest.replaceChildren(compactEl('strong','퀘스트'));
 for(const [kind,name,show]of [['ticket','일요일 수행서',true],['iron','금요일 철제검',!state.hasSamSword&&state.ironQty<20]]){
  if(!show)continue;const done=state[kind+'ClaimWeek']===Model.questKey(kind);
  const eligible=new Date().getDay()===(kind==='ticket'?0:5);const card=compactEl('div','','quest-card '+(!eligible?'locked':done?'done':'pending'));card.setAttribute('aria-disabled',String(!eligible));card.append(compactEl('span',name),compactEl('strong',done?'완료':'미완료','quest-status'));if(done)card.append(compactButton('되돌리기',()=>undoQuest(kind),!eligible));else card.append(compactButton('수령',()=>openClaim(kind),!eligible));quest.append(card);
 }
 const login=settingLink([...$('loginSummary').children].map(n=>n.textContent).join(' · '),'connection');login.classList.add('compact-login');
 const final=$('compactFinal');final.replaceChildren();
 const forecastBox=compactEl('div','','completion-box');final.append(forecastBox);
 const completionRow=compactEl('div','','compact-line');
 const overall=compactEl('span','','forecast-inline');overall.append(compactEl('strong','전체 임무 재료 확보 예정'),compactEl('strong',$('finishDate').textContent,'final-date'));completionRow.append(overall);forecastBox.append(completionRow);
 const dates=compactEl('div','','compact-line');
 for(const [label,id]of [['삼인검 재료 확보 예정','samFinishDate'],['사인검 재료 확보 예정','sainFinishDate']]){
  const item=compactEl('span','','forecast-inline');item.append(compactEl('span',label,'hint'),compactEl('strong',$(id).textContent));
  dates.append(item);
 }
 forecastBox.append(dates);
 const summary=compactEl('strong',completionDaysText(state,plan),'completion-summary');
 summary.title='현재부터 남은 예상 일수';completionRow.append(summary);
 const warning=readinessWarning();
 const context=compactEl('div','','forecast-context');context.id='forecastContext';final.append(context);login.textContent='접속 시간 · '+login.textContent;login.className='connection-box';


 $('headerLogin')?.remove();login.id='headerLogin';$('settingsBtn').before(login);context.hidden=!context.children.length;
 let showIron=false;
 const head=row();head.classList.add('material-heading');head.append(compactEl('strong',state.hasSamSword?'사인검 재료':'삼인검 재료','sam'));
 if(!state.hasSamSword){const complete=state.tabletQty.every(n=>n>=50)&&state.ironQty>=20;
  // 사인검 보상 석판으로 부족분이 채워져 삼인검 임무가 필요 없으면 석판 줄을 숨긴다.
  const covered=state.tabletQty.some(n=>n<50)&&state.activeMission?.phase!=='sam'&&!Model.samQuantity(state).some(n=>n<50);
  if(complete)head.append(compactButton(compactMaterialsOpen?'재료 접기':'재료 준비 완료 · 펼치기',()=>{compactMaterialsOpen=!compactMaterialsOpen;renderCompactDashboard();}));
  if(!covered&&(!complete||compactMaterialsOpen)){const qty=row();qty.classList.add('material-stock');Model.names.forEach((name,i)=>qty.append(compactNumber(name,state.tabletQty[i],'tablet'+i)));const boxItem=compactEl('span','석판 상자 '+(state.boxQty||0),'compact-value');makeEditable(boxItem,openBoxDialog);boxItem.onclick=openBoxDialog;boxItem.title='눌러서 상자 열기';if((state.boxQty||0)>0)boxItem.classList.add('box-alert');qty.append(boxItem);}
  showIron=state.ironQty<20||(complete&&compactMaterialsOpen);
 }
 document.querySelectorAll('.change-log-button').forEach(b=>b.remove());head.append(craftButton,changeLogButton());craftButton.className='craft-entry';if($('viewMode').value==='info')$('informationInventory').querySelector('.inventory-heading').append(craftButton,changeLogButton());
 const inventory=row();inventory.classList.add('material-stock');inventory.append(compactShard());if(showIron)inventory.append(compactNumber('철제검 조각',state.ironQty,'ironQty'));inventory.append(compactNumber('2차특수임무수행서',state.currentTickets,'currentTickets'),compactNumber('임무의달인',state.masterQty,'masterQty'),compactNumber('귀서',state.gueseoStock,'gueseoStock'));
 const recommend=row();recommend.id='comparisonSummary';const summaryText=compactEl('span',typeof comparisonSummaryText==='function'?comparisonSummaryText():'현재 기준 추천 · 비교 준비 중','comparison-summary-text');summaryText.id='comparisonSummaryText';recommend.append(summaryText);
 const refresh=compactButton(typeof manualRefreshBusy!=='undefined'&&manualRefreshBusy?'계산 중…':'새로고침',()=>refreshSelectedPlan(),typeof manualRefreshBusy!=='undefined'&&manualRefreshBusy);refresh.id='refreshPlanBtn';
 const extras=compactEl('div','','compact-settings');const usageChecks=compactEl('div','','main-usage-checks');usageChecks.id='mainUsageChecks';// 귀서·임달 사용: 누를 수 없는 상태 표시(현재 계획에 들어 있으면 녹색) · 변경은 효율설정, 변경 확인 시 사용량 선택 창
 for(const [text,count,unit]of [['귀서 사용',state.accelerationMode?state.gueseoTotal||0:0,'장'],['임달 사용',state.accelerationMode?state.masterBudget||0:0,'개']]){const badge=compactEl('span',text,'usage-state'+(count>0?' enabled':''));badge.setAttribute('aria-label',text+' · '+(count>0?'현재 계획 '+count+unit:'현재 계획 미사용'));badge.title=(count>0?'현재 계획 '+count+unit+' 포함':'현재 계획 미사용')+' · 변경: 효율설정';usageChecks.append(badge);}
 // 사인검 준비 예정: 체크 시 새 계획 계산 후 체크와 계획을 한 번에 저장
 if(!state.canSainMission&&state.activeMission?.phase!=='sain'){const label=compactEl('label'),check=document.createElement('input');check.type='checkbox';check.checked=state.sainReadyPlan;check.setAttribute('aria-label','사인검 준비 예정');check.onchange=async()=>{check.disabled=true;try{await saveWithPlan({sainReadyPlan:check.checked,usageMode:'efficient'});}catch(e){$('error').textContent=e.message;}finally{renderCompactDashboard();}};label.append(check,document.createTextNode('사인검 준비 예정'));usageChecks.append(label);}usageChecks.append(masterEfficiencyControl(),compactEl('span','임달 효율 기준(1개당 평균 '+Completion.efficiencyHours(state).toLocaleString('ko-KR',{maximumFractionDigits:0})+'시간)','hint'));extras.append(usageChecks);extras.append(settingLink('단축 계획 · '+(state.usageMode==='kept'?'고정 사용량':'효율 기준')+' · 귀서 총 '+(state.gueseoTotal||0)+'장 / 임달 총 '+(state.masterBudget||0)+'개','acceleration'));host.append(extras);const weekly=compactEl('span','','weekly-use');weekly.id='weeklyUsePlan';extras.append(weekly);renderUsePlan();
 const materials=compactEl('div','','materials-column'),planning=compactEl('div','','planning-column');for(const node of [...host.children]){if(node===recommend||node===extras)planning.append(node);else materials.append(node);}host.append(materials,planning);
 const utilities=compactEl('div','','material-utilities');utilities.id='materialUtilities';const testing=calendarAPI.isTestSession?.()||TestClock.offset();const startup=compactButton(startupBusy?'설정 중…':startupError?'자동 실행 설정 실패 · 다시 시도':'자동 실행 '+(state.startAtLogin?'켜짐':'꺼짐'),async()=>{if(startupBusy)return;startupBusy=true;startupError='';renderCompactDashboard();try{const reply=await calendarAPI.saveSettings({startAtLogin:!state.startAtLogin});if(!reply.ok)throw Error(reply.error);}catch(e){startupError=e.message;}finally{startupBusy=false;renderCompactDashboard();}},startupBusy);startup.id='startupToggle';startup.classList.add(state.startAtLogin?'enabled':'disabled');startup.setAttribute('aria-pressed',String(!!state.startAtLogin));startup.title=testing?'테스트 중 · 실제 자동 실행 변경 안 됨':'컴퓨터 시작 시 자동 실행';
 const minimizeMode=compactButton(minimizeBusy?'설정 중…':minimizeError?'최소화 방식 설정 실패 · 다시 시도':'최소화 '+(state.minimizeToTray?'트레이로':'작업표시줄로'),async()=>{if(minimizeBusy)return;minimizeBusy=true;minimizeError='';renderCompactDashboard();try{const reply=await calendarAPI.saveSettings({minimizeToTray:!state.minimizeToTray});if(!reply.ok)throw Error(reply.error);}catch(e){minimizeError=e.message;}finally{minimizeBusy=false;renderCompactDashboard();}},minimizeBusy);minimizeMode.id='minimizeModeToggle';minimizeMode.classList.add(state.minimizeToTray?'enabled':'disabled');minimizeMode.setAttribute('aria-pressed',String(!!state.minimizeToTray));minimizeMode.title='최소화 버튼 클릭 시 트레이 숨김 또는 작업표시줄 유지 선택';
 const holidayMode=compactButton(state.holidayWeekend?'공휴일 주말로 적용':'공휴일 적용 안 함',openHolidayDialog);holidayMode.id='holidayModeToggle';holidayMode.classList.add(state.holidayWeekend?'enabled':'disabled');holidayMode.setAttribute('aria-pressed',String(!!state.holidayWeekend));holidayMode.title='공휴일 설정 선택';
 utilities.append(startup,minimizeMode,holidayMode,compactButton('알림 설정',()=>openGroup('notifications','알림 설정')));const test=compactButton(testing?'테스트 중 · 테스트 창 열기':'테스트 시간',()=>document.getElementById('testTimeLauncher')?.click());test.classList.toggle('testing',!!testing);utilities.append(test,refresh);if(testing)utilities.append(compactEl('span','테스트 중 · 실제 자동 실행 변경 안 됨','hint'));if(startupError)utilities.append(compactEl('span',startupError,'error'));if(minimizeError)utilities.append(compactEl('span',minimizeError,'error'));materials.append(utilities);

 if(state.tabletReviewPending)inventory.append(compactProxy('reviewTablets','석판 보유량 확인'));
 const mission=$('compactMission');mission.replaceChildren();const readiness=settingLink('사인검 '+(state.canSainMission?'가능':'불가능'),'readiness');readiness.classList.add('mission-readiness');readiness.classList.toggle('needs-change',warning);mission.append(readiness);
 const masterReceive=compactButton('임달 수령',masterReceiveNow);masterReceive.id='missionMasterReceiveBtn';masterReceive.className='quiet mission-fix';masterReceive.hidden=!masterReceiveRange();mission.append(masterReceive);
 const phase=state.activeMission?.phase||Model.nextPhase(state),name=phase==='sam'?'삼인검':'사인검';
 const missionButton=compactButton(missionButtonText(),missionButtonAction);missionButton.id='missionUnifiedButton';missionButton.classList.add('mission-description');missionButton.classList.toggle('receivable',missionReceivable());mission.append(missionButton);
 const fixButton=compactButton('임무 및 시간 수정',()=>openMissionManager('fix'));fixButton.className='quiet mission-fix';mission.append(fixButton);
 const quick=compactEl('span','','quick-toggles');quick.append(quickToggle('send','바로 보내기','바로 보내기 켜면 확인 없이 즉시 임무 기록\n잘못 기록 시 옆 수정 버튼으로 수정'),quickToggle('receive','바로 수령','바로 수령 켜면 확인 없이 즉시 수령 기록\n잘못 기록 시 옆 수정 버튼으로 수정'));
 if(phase==='sam'&&(state.activeMission?state.activeMission.action===2:Number($('actionChoice').value)===2))quick.append(quickToggle('later','상자 안 열고 수령','상자 미개봉 상태로 수령만 기록 · 상자 석판 재고 미반영\n이후 상자 석판 개수 업데이트 필수(미업데이트 시 계산 오류)'));
 mission.append(quick);
 // 삼인검 100% 임무를 하거나 석판 상자를 보유 중이면, 상자를 열지 않았을 때의 영향을 눈에 띄게 알린다.
 // 새 줄을 만들지 않고 '접속 불가' 줄의 왼쪽 빈 공간에 넣는다.
 document.getElementById('boxWarning')?.remove();const boxControls=document.querySelector('.calendar-controls');if(boxControls)boxControls.style.width='';
 if((phase==='sam'&&(state.activeMission?state.activeMission.action===2:Number($('actionChoice').value)===2))||(state.boxQty||0)>0){const boxes=state.boxQty||0,warn=compactEl('div',boxes>0?'미개봉 석판 상자 '+boxes+'개 · 보유 재료 \'석판 상자\'에서 개봉 결과 입력 필요 · 미반영 시 불필요한 임무 추천 가능':'100% 이상 보상 상자는 수령 후 개봉·석판 반영 필요 · 미반영 시 불필요한 임무 추천 가능');warn.id='boxWarning';warn.style.cssText='flex:1 1 0;min-width:0;margin-right:auto;box-sizing:border-box;padding:4px 10px;border:2px solid #c8974a;border-radius:7px;background:#463421;color:#ffd9a0;font-size:12px;font-weight:700';if(boxControls){boxControls.style.width='100%';boxControls.prepend(warn);}}
 const usage=compactEl('span','','mission-use-plan');usage.id='activeMasterPlan';mission.append(usage);renderUsePlan();
 renderMissionManager();
 $('readinessNotice')?.remove();if(warning){const hint=compactEl('p',"사인검 임무 가능 시 왼쪽 ‘사인검 불가능’ 클릭 후 변경",'needs-change');hint.id='readinessNotice';mission.append(hint);}
 $('infoReadinessNotice')?.remove();if(warning){const hint=compactEl('p',"사인검 임무 가능 시 위 ‘사인검 불가능’ 클릭 후 ‘가능’으로 변경",'needs-change');hint.id='infoReadinessNotice';$('informationInventory').querySelector('.inventory-heading').after(hint);}
 const source=$('settingsSummary').firstElementChild;if(source)source.classList.toggle('needs-change',warning);
 const err=compactEl('p',$('error').textContent,'error');err.id='compactActionError';err.hidden=!err.textContent;mission.append(err);
 $('foldInfo').textContent=informationCollapsed?'정보 펼치기 ▼':'정보 접기 ▲';$('foldInfo').setAttribute('aria-expanded',String(!informationCollapsed));
}
function openCompactMenu(){const actions=$('missionMenuActions');actions.replaceChildren();for(const [id,text]of [['editMissionTime','남은 시간 수정'],['cancelBtn','시작 기록 취소'],['undoBtn','최근 수령 되돌리기']]){if($(id).hidden)continue;actions.append(compactButton(text,()=>{$('missionMenu').hidden=true;$(id).click();},$(id).disabled));}$('compactHistory').textContent=$('history').textContent;$('missionMenu').hidden=false;}
$('foldInfo').onclick=()=>{informationCollapsed=!informationCollapsed;renderCompactDashboard();};
$('closeMissionMenu').onclick=()=>$('missionMenu').hidden=true;
setInterval(()=>{if($('compactCountdown')){$('compactCountdown').textContent=$('completeBtn').textContent;$('compactCountdown').classList.toggle('ready',$('completeBtn').classList.contains('ready'));}},1000);
new MutationObserver(()=>{const e=$('compactActionError');if(e){e.textContent=$('error').textContent;e.hidden=!e.textContent;}}).observe($('error'),{childList:true,characterData:true,subtree:true});


function compactShard(){const node=compactNumber(Model.shardName(state),state.currentQty+'/300','currentQty');if(!state.craftElementSelected){node.classList.add('choose-element');node.title='눌러서 속성 선택';node.onclick=()=>openGroup('element','사인검 속성 선택');node.ondblclick=null;node.onkeydown=e=>{if(e.key==='Enter')node.click();};}return node;}

function renderUsePlan(){if(!state)return;const weekly=$('weeklyUsePlan'),activeHint=$('activeMasterPlan');if(weekly)weekly.textContent='';if(activeHint)activeHint.textContent='';if(!state.onboarded){if(weekly)weekly.textContent='초기설정 후 계산';return;}if(state.planSnapshot?.source!==Model.planFingerprint(state)){if(weekly)weekly.textContent='현재 상태로 일정 계산 중…';return;}if(!state.accelerationMode)return;if(busy||!plan){if(weekly)weekly.textContent='사용 일정 계산 중…';return;}
 const now=Date.now(),start=new Date(now);start.setHours(0,0,0,0);start.setDate(start.getDate()-start.getDay());const end=new Date(start);end.setDate(end.getDate()+7);const inWeek=t=>t>=+start&&t<+end;
 const g=(plan.purchases||[]).filter(x=>inWeek(x.at)).reduce((n,x)=>n+x.qty,0),m=(plan.log||[]).filter(x=>inWeek(x.collect)).reduce((n,x)=>n+x.shortcutHours,0),shortG=Math.max(0,g-state.gueseoStock),shortM=Math.max(0,m-state.masterQty);
 if(weekly){weekly.textContent='이번 주 사용 예정 · 귀서 '+g+'장 / 임달 '+m+'개';const shortage=[shortG?'귀서 '+shortG+'장':'',shortM?'임달 '+shortM+'개':''].filter(Boolean);weekly.classList.remove('needs-preparation');if(shortage.length){const line=compactEl('span','이번 주 '+shortage.join(' · ')+' 추가 준비 필요','weekly-shortage needs-preparation');weekly.append(line);}weekly.title='현재 수행서와 일요일 기본 2장 반영 남은 주간 계획 · 귀서는 일요일 사용';}
 const active=state.activeMission&&plan.log?.find(x=>x.active&&x.id===state.activeMission.id);if(activeHint&&active?.shortcutHours>0){const n=active.shortcutHours,short=Math.max(0,n-state.masterQty);activeHint.textContent=(active.collect<=now?'지금':dateTime(active.collect)+'에')+' 임달 '+n+'개 사용 → '+n+'시간 단축 후 수령'+(short?' · 임달 '+short+'개 추가 준비 필요':' 예정')+(state.thresholdHours>0?' (10분 여유 포함)':'');activeHint.classList.toggle('needs-preparation',short>0);}
}
setInterval(renderUsePlan,1000);

function showReceiptImpact(){if(state.receiptImpact)$('status').textContent=state.receiptImpact.text+' 현재 상태 기준 자동 재계산';}

function missionReceivable(){return !!state.activeMission&&Date.now()>=+new Date(state.activeMission.startedAt)+30*3600000;}
// 남은 시간이 임달 수령 범위 안이면 true (30시간이 지나 일반 수령이 되는 경우는 제외)
function earlyLimitHours(){return state.thresholdHours>0?state.thresholdHours+1/6:.01;}
function masterReceiveRange(){return !!state?.activeMission&&!missionReceivable()&&(+new Date(state.activeMission.startedAt)+30*3600000-Date.now())/3600000<=earlyLimitHours();}
// 누르는 것이 곧 결정이라 확인창 없이 바로 임달 수령한다. 상자 선택이 필요한 임무는 기존 수령 흐름을 이어서 연다.
function masterReceiveNow(){
 const a=state.activeMission;if(!a)return;
 const rewards=a.phase==='sain'?[0,0,0,0,0]:a.action===0?[2,2,0,0,0]:a.action===1?[0,0,2,2,0]:null;
 if(!rewards)return $('completeBtn').click();
 return action(()=>window.calendarAPI.completeMission({rewards,missionId:a.id,allowEarly:false}));
}
// 밖의 임무 버튼용 남은 시간: 초까지 보여주고 0인 자리는 뺀다.
function remainingText(){
 const total=Math.max(0,Math.ceil((+new Date(state.activeMission.startedAt)+30*3600000-Date.now())/1000)),h=Math.floor(total/3600),m=Math.floor(total%3600/60),sec=total%60;
 const parts=[h&&h+'시간',m&&m+'분',sec&&sec+'초'].filter(Boolean);
 return '남은 시간 '+(parts.length?parts.join(' '):'0초');
}
function missionButtonText(){return missionDescription()+' · '+(state.activeMission?(missionReceivable()?'수령하기':remainingText()):'임무 보내기');}
function missionDescription(){
 const phase=state.activeMission?.phase||Model.nextPhase(state);
 if(!phase)return state.currentQty>=300?'임무 재료 확보 완료':'사인검 준비 대기';
 if(phase==='sain')return '사인검 · '+Model.shardName(state)+' 5개';
 const choice=state.activeMission?state.activeMission.action:Number($('actionChoice').value);
 return '삼인검 · '+(choice==null?'보상 종류 미확인':Model.labels[choice]||'추천 계산 중');
}
let missionTimeDraft={hours:'30',minutes:'0'},missionEditDraft=null,missionManagerMode='main';
const quickPrefs=(()=>{try{return JSON.parse(localStorage.getItem('mission_quick_v1')||'{}')||{};}catch{return {};}})();
function saveQuickPrefs(){try{localStorage.setItem('mission_quick_v1',JSON.stringify(quickPrefs));}catch{}}
// 켤 때마다 경고를 보여주고, 확인해야만 켜진다. 끌 때는 경고 없이 바로 꺼진다.
function quickToggle(key,text,warning){const label=compactEl('label','','quick-toggle'),check=document.createElement('input');check.type='checkbox';check.checked=quickPrefs[key]===true;check.onchange=()=>{if(check.checked&&!window.confirm(warning)){check.checked=false;return;}quickPrefs[key]=check.checked;saveQuickPrefs();};label.append(check,document.createTextNode(text));return label;}
// 체크칸이 켜져 있으면 창을 열지 않고 바로 보내기/수령한다. 확인이 필요한 경우(상자 선택, 조기 수령 등)에는 창을 연다.
function missionButtonAction(){
 if(!state.activeMission){
  if(quickPrefs.send&&!$('startBtn').hidden&&!$('startBtn').disabled)return action(()=>window.calendarAPI.startMission(Number($('actionChoice').value)));
  return openMissionManager();
 }
 if(missionReceivable()){
  const a=state.activeMission;
  // 수령할 때는 관리 창 없이 필요한 팝업만 띄운다(정해진 임무는 팝업 없이 바로 기록, 삼인검 100%는 상자 선택만).
  if(a.action===2&&quickPrefs.receive&&quickPrefs.later===true)return action(()=>window.calendarAPI.completeMission({rewards:[0,0,0,0,2],boxLater:true,missionId:a.id,allowEarly:false}));
  return $('completeBtn').click();
 }
 return openMissionManager();
}
// 보류해 둔 석판 상자를 여는 팝업. 상자를 열고 난 뒤 게임에 보이는 석판별 현재 수량을 적으면 기존 수량과 비교해 나온 개수를 계산한다.
// 적용을 누를 때 계산이 맞아야(나온 개수의 합 = 개봉 개수 x 5, 줄어든 석판 없음) 저장된다.
function openBoxDialog(){
 if($('boxDialog'))return;
 const saved=state.boxQty||0,before=state.tabletQty.slice(),modal=compactEl('div','','modal');modal.id='boxDialog';
 const box=compactEl('div','','modal-box stack'),close=()=>modal.remove();
 const num=(value,aria)=>{const input=document.createElement('input');input.type='number';input.min='0';input.step='1';input.value=value;input.setAttribute('aria-label',aria);return input;};
 const stockInput=num(String(saved),'현재 상자 개수');const stockField=compactEl('label','현재 개수','field');stockField.append(stockInput);
 const opened=num('','개봉 개수');const openedField=compactEl('label','개봉 개수','field');openedField.append(opened);
 const grid=compactEl('div','','box-grid');grid.style.cssText='display:grid;grid-template-columns:auto repeat(5,1fr);gap:6px;align-items:center';
 const cell=(text,cls)=>{const e=compactEl('span',text,cls||'hint');if(cls)e.style.textAlign='center';return e;};
 grid.append(cell(''));Model.names.forEach(name=>grid.append(cell(name,'compact-value')));
 grid.append(cell('기존 수량'));before.forEach(v=>grid.append(cell(String(v),'compact-value')));
 grid.append(cell('현재 수량'));const inputs=before.map((v,i)=>{const input=num(String(v),'현재 '+Model.names[i]+' 수량');grid.append(input);return input;});
 grid.append(cell('나온 개수'));const gained=before.map(()=>{const e=cell('0','compact-value');grid.append(e);return e;});
 const message=compactEl('p','','error'),apply=compactButton('적용',()=>{});apply.classList.add('primary');
 const diffs=()=>inputs.map((x,i)=>x.value.trim()===''?NaN:Number(x.value)-before[i]);
 // 나온 개수 줄 밑의 상태 줄: 개봉 개수 대비 입력한 합을 숫자로 보여주고, 5개 단위가 아닌 석판이 있으면 함께 알려준다.
 const status=compactEl('p','','hint');
 const refresh=()=>{
  const d=diffs();d.forEach((v,i)=>{gained[i].textContent=Number.isNaN(v)?'-':(v>0?'+'+v:String(v));});
  const n=opened.value.trim()===''?0:Number(opened.value);
  if(!Number.isInteger(n)||n<0||d.some(v=>Number.isNaN(v))){status.textContent='';return;}
  const target=n*5,sum=d.reduce((x,y)=>x+y,0),bad=d.findIndex(v=>v%5!==0),down=d.findIndex(v=>v<0);
  status.style.color=sum===target&&bad<0&&down<0?'':'#ff7b7b';
  status.textContent='개봉 '+n+'개 = 석판 '+target+'개 · 입력 '+sum+'개 · '+(sum===target?'일치':sum<target?'남은 '+(target-sum)+'개':'초과 '+(sum-target)+'개')+(bad>=0?' · '+Model.names[bad]+' '+d[bad]+' · 5의 배수 아님':'')+(down>=0&&bad<0?' · '+Model.names[down]+' '+d[down]+' · 기존보다 줄어듦':'');
 };
 for(const x of [...inputs,opened])x.oninput=refresh;
 const validate=()=>{
  const stock=Number(stockInput.value),n=opened.value.trim()===''?0:Number(opened.value),d=diffs();
  if(stockInput.value.trim()===''||!Number.isInteger(stock)||stock<0||stock>100000)return '현재 개수 0 이상 정수 입력 필요';
  if(!Number.isInteger(n)||n<0)return '개봉 개수 0 이상 정수 입력 필요';
  if(n>stock)return '개봉 개수가 현재 상자 수('+stock+'개) 초과';
  if(d.some(v=>!Number.isInteger(v)))return '현재 수량 0 이상 정수 입력 필요';
  if(d.some(v=>v<0))return '기존 수량보다 감소한 석판 있음';
  const bad=d.findIndex(v=>v%5!==0);
  if(bad>=0)return Model.names[bad]+' '+d[bad]+' · 5의 배수 아님';
  const sum=d.reduce((x,y)=>x+y,0);
  if(sum!==n*5)return '개봉 '+n+'개 = 석판 '+n*5+'개 · 입력 합계 '+sum+'개';
  if(n===0&&stock===saved)return '개봉 개수 입력 또는 현재 개수 수정 필요';
  return '';
 };
 apply.onclick=async()=>{const problem=validate();if(problem){message.textContent=problem;return;}message.textContent='';apply.disabled=true;try{const stock=Number(stockInput.value),n=opened.value.trim()===''?0:Number(opened.value);const r=await window.calendarAPI.saveSettings({tabletQty:inputs.map(x=>Number(x.value)),boxQty:stock-n,expectedValues:{tabletQty:before,boxQty:saved}});if(!r.ok)throw Error(r.error);if(r.stale)throw Error('편집 중 원본 데이터 변경됨 · 창 다시 열기 필요');close();}catch(e){message.textContent=e.message;apply.disabled=false;}};
 const buttons=compactEl('div','','buttonbar');buttons.append(apply,compactButton('취소',close));
 const notice=compactEl('div','미개봉 상자 남아 있으면 정확한 날짜 계산 곤란');notice.style.cssText='padding:10px 12px;border:2px solid #e0b040;border-radius:7px;background:#3a3216;color:#ffe093;font-size:16px;font-weight:700';
 box.append(compactEl('h2','석판 상자'),notice,stockField,openedField,compactEl('p','상자 개봉 후 게임에 표시된 석판별 현재 수량 입력','hint'),grid,status,message,buttons);modal.append(box);document.body.append(modal);refresh();
}
// 공휴일 설정 팝업: 안에서 고르는 동안은 계산 없음 · '저장' 클릭 시 값이 바뀐 경우에만 1회 저장·재계산
function openHolidayDialog(){
 if($('holidayDialog'))return;
 const modal=compactEl('div','','modal');modal.id='holidayDialog';const box=compactEl('div','','modal-box stack'),close=()=>modal.remove();
 let picked=!!state.holidayWeekend;const choices=compactEl('div','','stack tight'),inputs=[];
 for(const [value,text]of [[false,'적용 안 함'],[true,'주말로 적용']]){const label=compactEl('label','','choice-card compact'),input=document.createElement('input');input.type='radio';input.name='holidayWeekendChoice';input.checked=picked===value;input.onchange=()=>{picked=value;};label.append(input,compactEl('strong',text));choices.append(label);inputs.push(input);}
 const message=compactEl('p','','error');
 // 저장: 계획이 있으면 ①지금 사용량 유지 ②효율 기준 ③다음 효율 단계 중 선택 후 한 번에 저장
 const save=compactButton('저장',async()=>{if(picked===!!state.holidayWeekend){close();return;}save.disabled=true;message.textContent='';try{const extraPatch={holidayWeekend:picked};if(state.onboarded&&state.planSnapshot){modal.hidden=true;const saved=await openUsageChooser({draft:{...state,...extraPatch},keep:{g:state.gueseoTotal,m:state.masterBudget},extraPatch,expectedValues:{holidayWeekend:state.holidayWeekend},title:'공휴일 '+(picked?'주말로 적용':'적용 안 함')+' · 귀서·임달 사용량 선택'});if(saved)close();else{modal.hidden=false;save.disabled=false;}return;}const r=await window.calendarAPI.saveSettings({...extraPatch,expectedValues:{holidayWeekend:state.holidayWeekend}});if(!r.ok)throw Error(r.error);close();}catch(e){modal.hidden=false;message.textContent=e.message;save.disabled=false;}});save.classList.add('primary');
 const buttons=compactEl('div','','buttonbar');buttons.append(save,compactButton('취소',close));
 box.append(compactEl('h2','공휴일 설정'),choices,compactEl('p','예: 월요일 공휴일 → 적용 안 함 시 평일 접속 시간 · 주말로 적용 시 주말 접속 시간 · 달력 공휴일(대체공휴일 포함) 기준 · 접속 불가 지정 우선 · 저장 시 일정 재계산','hint'),message,buttons);
 modal.append(box);modal.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();close();}});document.body.append(modal);(inputs.find(x=>x.checked)||inputs[0]).focus();
}
function openMissionManager(mode='main'){
 if($('missionManager'))return;missionTimeDraft={hours:'30',minutes:'0'};missionEditDraft=null;missionKindChoice=null;missionManagerMode=mode;
 const modal=compactEl('div','','modal');modal.id='missionManager';const box=compactEl('div','','modal-box stack'),head=compactEl('div','','row spread'),content=compactEl('div','','stack');content.id='missionManagerContent';
 head.append(compactEl('h2',mode==='fix'?'임무 및 시간 수정':'임무 보내기 · 관리'),compactButton('닫기',()=>closeMissionManager()));box.append(head,content);
 for(const id of ['quickModal','earlyModal','rewardModal'])box.append($(id));
 modal.append(box);document.body.append(modal);renderMissionManager();
}
function closeMissionManager(force=false){
 if(!force&&(actionBusy||$('quickSave').disabled||$('saveReward').disabled))return;
 closeEarly(false);$('quickCancel').click();$('rewardModal').hidden=true;
 for(const id of ['quickModal','earlyModal','rewardModal'])document.body.append($(id));
 $('missionManager')?.remove();
}
let missionKindChoice=null,missionApplyButton=null;
const sameKind=(p)=>{const m=state.activeMission;return !p||(p.phase==='sam'?m.phase==='sam'&&m.action===p.action:m.phase==='sain'&&state.craftElement===p.element);};
function kindPicker(){
 const wrap=compactEl('div','','mission-kind stack'),m=state.activeMission,buttons=[];
 const choose=(payload,button)=>{missionKindChoice=payload;for(const [b,p]of buttons)b.classList.toggle('active',p===payload);if(missionApplyButton)missionApplyButton.disabled=sameKind(missionKindChoice);};
 const group=(title,items)=>{const row=compactEl('div','','mission-kind-row');row.append(compactEl('strong',title));for(const [text,payload,current]of items){const b=compactButton(text,()=>choose(payload,b));buttons.push([b,payload]);if(current&&!missionKindChoice)b.classList.add('active');row.append(b);}wrap.append(row);};
 group('삼인검',Model.labels.map((text,i)=>[text,{phase:'sam',action:i},m.phase==='sam'&&m.action===i]));
 const elements=[['화·홍옥','fire'],['수·청옥','water'],['풍·녹주석','wind'],['뇌·황옥','thunder'],['토·흑요석','earth']];
 group('사인검',elements.map(([text,element])=>[text,{phase:'sain',element},m.phase==='sain'&&state.craftElement===element]));
 return wrap;
}
function applyKindButton(decide){
 missionApplyButton=compactButton('적용',decide(()=>{if(!missionKindChoice)throw Error('변경할 임무 선택 필요');return window.calendarAPI.editMissionKind(missionKindChoice);}),sameKind(missionKindChoice));
 return missionApplyButton;
}
function renderMissionManager(){
 const content=$('missionManagerContent');if(!content)return;content.replaceChildren();
 const fix=missionManagerMode==='fix',actions=compactEl('div','','buttonbar');
 // 성공하면 창을 닫는다(1팝업 1결정). 오류가 나면 닫지 않고 오류를 보여준다.
 const decide=fn=>()=>action(async()=>{const r=await fn();if(r.ok)closeMissionManager(true);return r;});
 const timeRow=(title,draft,setDraft,label,run,disabled)=>{
  const row=compactEl('div','','mission-existing-row');row.append(compactEl('strong',title));
  for(const [key,unit,max]of [['hours','시간',30],['minutes','분',59]]){const field=compactEl('label',unit,'mission-time-field'),input=document.createElement('input');input.type='number';input.min='0';input.max=String(max);input.step='1';input.value=draft()[key];input.setAttribute('aria-label','남은 '+unit);input.oninput=()=>setDraft(key,input.value);field.append(input);row.append(field);}
  row.append(compactButton(label,decide(async()=>{const d=draft(),h=Number(d.hours),m=Number(d.minutes);
   if(String(d.hours).trim()===''||String(d.minutes).trim()===''||!Number.isInteger(h)||!Number.isInteger(m)||h<0||m<0||m>59||h*60+m>1800)throw Error('남은 시간 0~30시간 입력 필요');
   return run(h*60+m);}),disabled));return row;};
 content.append(compactEl('strong',missionDescription(),'mission-description'));
 if(state.activeMission){
  content.append(compactEl('p','진행 중인 임무'));
  const countdown=compactEl('strong',$('completeBtn').textContent,'mission-manager-countdown');countdown.id='missionManagerCountdown';content.append(countdown);
  const remain=Math.max(0,Math.ceil((+new Date(state.activeMission.startedAt)+30*3600000-Date.now())/60000));
  const draft=()=>missionEditDraft||{hours:String(Math.floor(remain/60)),minutes:String(remain%60)};
  const editRow=()=>timeRow('남은 시간 수정',draft,(k,v)=>{missionEditDraft={...draft(),[k]:v};},'수정',min=>window.calendarAPI.editMissionTime(new Date(Date.now()+min*60000-30*3600000).toISOString()),false);
  if(!fix){
   content.append(editRow());
   content.append(kindPicker());
   const canEarly=missionReceivable()||remain/60<=earlyLimitHours(),receive=compactProxy('completeBtn',missionReceivable()?'수령':'임달 수령');receive.id='missionReceiveBtn';receive.disabled=receive.disabled||!canEarly;
   if(!canEarly)content.append(compactEl('p',state.thresholdHours>0?'임달 수령: 남은 시간 '+state.thresholdHours+'시간 10분 이하일 때 가능':'조기 수령 범위 0시간 · 임무 시간 종료 후 수령 가능 · 임달 사용 조합 선택 시 조기 수령 가능','hint'));
   actions.append(receive,applyKindButton(decide),compactButton('임무 보내기 취소',decide(()=>window.calendarAPI.cancelMission()),$('undoBtn').disabled));content.append(actions);
  }
  else{
   content.append(editRow());
   content.append(kindPicker());
   actions.append(applyKindButton(decide),compactButton('임무 보내기 취소',decide(()=>window.calendarAPI.cancelMission()),$('undoBtn').disabled));content.append(actions);
  }
 }else if(!fix){
  content.append(compactEl('p','게임에서 임무 발송 후 아래 버튼으로 기록','hint'));
  actions.append(compactButton($('startBtn').textContent,decide(()=>window.calendarAPI.startMission(Number($('actionChoice').value))),$('startBtn').disabled));content.append(actions);
  const draft=()=>missionTimeDraft;
  content.append(timeRow('이미 임무 진행 중인 경우',draft,(k,v)=>{missionTimeDraft[k]=v;},'등록',min=>window.calendarAPI.startMission({choice:Number($('actionChoice').value),remainingMinutes:min}),$('startBtn').disabled));
 }else{
  content.append(compactEl('p','진행 중인 임무 없음 · 최근 수령 기록 되돌리기 가능','hint'));
  content.append(compactButton('최근 수령 되돌리기',decide(()=>window.calendarAPI.undoComplete()),$('undoBtn').disabled));
 }
 content.append(compactEl('p',$('error').textContent,'error'));
}
setInterval(()=>{const button=$('missionUnifiedButton');if(button){button.textContent=missionButtonText();button.classList.toggle('receivable',missionReceivable());}const count=$('missionManagerCountdown');if(count)count.textContent=$('completeBtn').textContent;const masterBtn=$('missionMasterReceiveBtn');if(masterBtn)masterBtn.hidden=!masterReceiveRange();const receiveBtn=$('missionReceiveBtn');if(receiveBtn&&state.activeMission){receiveBtn.textContent=missionReceivable()?'수령':'임달 수령';receiveBtn.disabled=$('completeBtn').disabled||!(missionReceivable()||(+new Date(state.activeMission.startedAt)+30*3600000-Date.now())/3600000<=earlyLimitHours());}const content=$('missionManagerContent');if(content){const editing=['quickModal','earlyModal','rewardModal'].some(id=>!$(id).hidden);content.inert=editing;}},250);

function completionDaysText(s,p,now=Date.now()){
 if(!s.onboarded)return '초기설정 후 계산';
 if(!p)return '계산 중…';
 const sam=s.activeMission?.phase==='sam'||(!s.hasSamSword&&Model.samQuantity(s).some(n=>n<50));
 const sain=s.activeMission?.phase==='sain'||s.currentQty<300;
 if(!sam&&!sain)return '완료';
 const conditional=sain&&!s.canSainMission&&!s.sainReadyPlan&&s.activeMission?.phase!=='sain';
 const days=t=>t==null?'계산 필요':Math.max(0,Math.ceil((t-now)/86400000))+'일';
 const samAt=p.meanSamFinish,sainAt=p.preparedSainFinish??p.meanSainFinish;
 const finalAt=p.meanFinish??(samAt!=null&&sainAt!=null?Math.max(samAt,sainAt):null);
 let text;
 if(sam&&sain){const first=s.activeMission?.phase||(s.order==='sain-first'?'sain':'sam');text=(first==='sam'?'삼인검 '+days(samAt):'사인검 '+days(sainAt))+' · 최종 '+days(finalAt);}
 else text=days(sam?samAt:sainAt);
 return text+(conditional?' (사인검 준비 시)':'');
}
