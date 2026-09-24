function makeEditable(node,fn){node.classList.add('editable');node.tabIndex=0;node.setAttribute('role','button');node.title='더블클릭으로 수정';node.ondblclick=fn;node.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();fn();}};}
let quickRead=null,quickType='settings',quickBase=null,quickGroup=null;
function openGroup(group,title){quickBase=structuredClone(state);quickGroup=group;$('quickTitle').textContent=title;$('quickError').textContent='';quickType='settings';quickRead=Forms.render($('quickForm'),group,state);$('quickModal').hidden=false;focusEditor($('quickModal'));}
function openScalar(key,title,value){quickBase=structuredClone(state);quickGroup=null;
 $('quickTitle').textContent=title;$('quickError').textContent='';quickType='settings';$('quickForm').replaceChildren();
 const input=document.createElement('input');input.type='text';input.inputMode='numeric';input.autocomplete='off';input.dataset.max=key==='currentQty'?'300':'100000';input.value=value;input.setAttribute('aria-label',title);$('quickForm').append(input);
 quickRead=()=>{const n=Number(input.value);if(input.value.trim()===''||!Number.isInteger(n)||n<(key==='masterQty'?-100000:0)||n>Number(input.dataset.max))throw Error('보유량 정수 입력 필요');if(key.startsWith('tablet')){const q=state.tabletQty.slice();q[Number(key.slice(6))]=n;return {tabletQty:q};}return {[key]:n};};
 $('quickModal').hidden=false;focusEditor($('quickModal'),input);
}
$('quickCancel').onclick=()=>{if(!$('quickSave').disabled){quickRead?.dispose?.();$('quickModal').hidden=true;}};
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('quickModal').hidden&&!document.querySelector('dialog[open]'))$('quickCancel').click();});
$('quickSave').onclick=async()=>{try{$('quickError').textContent='';const patch=quickRead();$('quickSave').disabled=true;
 // 접속 시간 변경으로 일정이 바뀌면 ①지금 사용량 유지 ②효율 기준 ③다음 효율 단계 중 선택 후 한 번에 저장
 if(quickType==='settings'&&quickGroup==='connection'&&state.onboarded&&state.planSnapshot&&Model.planFingerprint(Model.normalize({...state,...patch}))!==Model.planFingerprint(state)){$('quickModal').hidden=true;const saved=await openUsageChooser({draft:{...state,...patch},keep:{g:state.gueseoTotal,m:state.masterBudget},extraPatch:patch,expectedValues:quickBase,title:'접속 시간 변경 · 귀서·임달 사용량 선택'}).catch(e=>{$('quickModal').hidden=false;throw e;});if(saved){quickRead?.dispose?.();}else $('quickModal').hidden=false;return;}
 const r=quickType==='mission'?await window.calendarAPI.editMissionTime(patch):await window.calendarAPI.saveSettings({...patch,expectedValues:quickBase});if(!r.ok)throw Error(r.error);quickRead?.dispose?.();$('quickModal').hidden=true;}catch(e){$('quickError').textContent=e.message;}finally{$('quickSave').disabled=false;}};
$('reviewTablets').onclick=()=>openGroup('materials','사인검 완료 후 실제 석판 보유량 확인');
$('sainCard').ondblclick=()=>openScalar('currentQty',Model.shardName(state),state.currentQty);
$('sainCard').onkeydown=e=>{if(e.key==='Enter')openScalar('currentQty',Model.shardName(state),state.currentQty);};
$('claimTicket').onclick=()=>openClaim('ticket');
$('claimIron').onclick=()=>openClaim('iron');
$('editMissionTime').textContent='남은 시간 수정';
$('editMissionTime').onclick=()=>{
 if(!state.activeMission)return;quickType='mission';$('quickTitle').textContent='게임에 표시된 남은 시간';$('quickError').textContent='';$('quickForm').replaceChildren();
 const minutes=Math.max(0,Math.ceil((+new Date(state.activeMission.startedAt)+30*3600000-Date.now())/60000)),reference=Date.now();
 const row=document.createElement('div');row.className='grid2';const inputs=[];
 for(const [label,value,max]of [['시간',Math.floor(minutes/60),30],['분',minutes%60,59]]){const field=document.createElement('label');field.className='field';field.textContent=label;const input=document.createElement('input');input.type='text';input.inputMode='numeric';input.value=value;input.dataset.max=max;input.setAttribute('aria-label','남은 '+label);field.append(input);row.append(field);inputs.push(input);}
 $('quickForm').append(row);quickRead=()=>{const values=inputs.map(x=>Number(x.value));if(inputs.some((x,i)=>x.value.trim()===''||!Number.isInteger(values[i])||values[i]<0||values[i]>Number(x.dataset.max))||values[0]*60+values[1]>1800)throw Error('남은 시간 0~30시간 입력 필요');return new Date(reference+(values[0]*60+values[1])*60000-30*3600000).toISOString();};$('quickModal').hidden=false;focusEditor($('quickModal'),inputs[0]);
};
const noticeLast={};
function renderDashboard(){
 $('tabletReview').hidden=!state.tabletReviewPending;$('editMissionTime').hidden=!state.activeMission;
 $('extraInventory').replaceChildren();
 const inventories=[['gueseoStock','귀서',state.gueseoStock],['currentTickets','2차특수임무수행서',state.currentTickets],['masterQty','임무의달인',state.masterQty]];
 for(const [key,title,value]of inventories){const box=document.createElement('div');box.className='count';const label=document.createElement('span');label.textContent=title;const n=document.createElement('strong');n.textContent=value;box.append(label,n);makeEditable(box,()=>openScalar(key,title,state[key]));$('extraInventory').append(box);}
 const rows=[['삼인검·석판·사인검 임무','삼인검·석판 '+(state.hasSamSword?'보유':'준비 중')+' / 사인검 임무 '+(state.canSainMission?'가능':'불가능'),'readiness'],['접속 요일·시간','설정 보기 및 수정','connection'],['알림 방식',Model.noticeSummary(state),'notifications'],['컴퓨터 시작 시 자동 실행',state.startAtLogin?'켬':'끔','notifications']];
 if(!state.hasSamSword)rows.push(['삼인검 전략',state.strategy==='targeted'?'저격 우선':'평균 횟수 최소화','strategy']);
 $('quickSettings').replaceChildren();for(const [label,value,group]of rows){const row=document.createElement('div');row.className='quick-item';const title=document.createElement('span');title.className='hint';title.textContent=label;const val=document.createElement('strong');val.textContent=value;row.append(title,val);makeEditable(row,()=>openGroup(group,label));$('quickSettings').append(row);}
 const now=new Date(),ticketDone=state.ticketClaimWeek===Model.questKey('ticket',now),ironDone=state.ironClaimWeek===Model.questKey('iron',now);
 $('undoTicket').hidden=!ticketDone;$('undoIron').hidden=!ironDone||state.hasSamSword||state.ironQty>=20;
 $('claimTicket').hidden=now.getDay()!==0;$('claimTicket').disabled=ticketDone;$('claimTicket').textContent=ticketDone?'일요일 퀘스트 · 수령 완료':'일요일 퀘스트 수령 · +2장';
 $('claimIron').hidden=now.getDay()!==5||state.hasSamSword||state.ironQty>=20;$('claimIron').disabled=ironDone;$('claimIron').textContent=ironDone?'금요일 퀘스트 · 수령 완료':'금요일 퀘스트 수령 · +1개';
 $('questStatuses').replaceChildren();for(const [label,done]of [['일요일 수행서 퀘스트',ticketDone],...(!state.hasSamSword&&state.ironQty<20?[['금요일 철제검 조각 퀘스트',ironDone]]:[])]){const badge=document.createElement('span');badge.className='quest-state '+(done?'done':'pending');badge.textContent=label+' · '+(done?'완료':'미완료');$('questStatuses').append(badge);}
 renderCompactInventory();renderLoginSummary();
 $('inlineNotices').replaceChildren();for(const item of Reminders.pending(state,now)){const p=document.createElement('p');p.className='notice';p.textContent=item.text;if(Reminders.due(item,noticeLast,now)){p.classList.add('pulse');noticeLast[item.kind]={id:item.id,at:+now};}$('inlineNotices').append(p);}if(!$('inlineNotices').children.length)$('inlineNotices').textContent='확인할 알림 없음';
}

let samExpanded=false,samPreviouslyComplete=null;
function renderCompactInventory(){
 const complete=state.tabletQty.every(n=>n>=50)&&state.ironQty>=20;
 if(complete!==samPreviouslyComplete){samExpanded=!complete;samPreviouslyComplete=complete;}
 $('samCollapse').hidden=!complete;$('samMaterialsBody').hidden=complete&&!samExpanded;
 $('samCollapse').textContent='삼인검 재료 준비 완료 · '+(samExpanded?'접기':'펼치기');$('samCollapse').setAttribute('aria-expanded',String(samExpanded));
 $('ironInventory').hidden=state.ironQty>=20&&!(complete&&samExpanded);
 $('ironCount').textContent=state.ironQty+' / 20';makeEditable($('ironInventory'),()=>openScalar('ironQty','철제검 조각',state.ironQty));
 $('settingsSummary').replaceChildren();
 const items=[['사인검 '+(state.canSainMission?'가능':'불가능'),'readiness'],['귀서 총 '+(state.gueseoTotal||0)+'장 사용 계획','acceleration'],['임무의달인 총 '+(state.masterBudget||0)+'개 사용 계획','shortcuts']];
 for(const [text,group]of items){const item=document.createElement('span');item.textContent=text;makeEditable(item,()=>openGroup(group,text));$('settingsSummary').append(item);}
}
$('samCollapse').onclick=()=>{samExpanded=!samExpanded;renderCompactInventory();};
$('currentSettingsBtn').onclick=()=>{$('currentSettingsModal').hidden=false;focusEditor($('currentSettingsModal'));};
$('closeCurrentSettings').onclick=()=>$('currentSettingsModal').hidden=true;
async function focusEditor(modal,input){
 // Let the double-click and dialog close finish before restoring keyboard focus.
 try{await window.calendarAPI.focusMain?.();}catch{}
 requestAnimationFrame(()=>{if(modal.hidden)return;const target=input||modal.querySelector('input:not([type=checkbox]),select,button');if(target){target.focus({preventScroll:true});if(target.tagName==='INPUT'&&target.type==='text')target.select();}});
}
function updateCountdown(){
 if(!state.activeMission)return;const seconds=Math.max(0,Math.ceil((+new Date(state.activeMission.startedAt)+30*3600000-Date.now())/1000));
 const minutes=Math.ceil(seconds/60);$('completeBtn').textContent=seconds>0?`남은 시간 ${Math.floor(minutes/60)}시간 ${minutes%60}분`:'수령 완료';$('completeBtn').classList.toggle('ready',seconds===0);
 $('completeBtn').title=seconds>0?'눌러서 조기 수령':'게임에서 받은 보상 기록';
}
let earlyResolve=null;
const earlyDefaultText=$('earlyText').textContent;
function confirmEarly(message){return new Promise(resolve=>{earlyResolve=resolve;$('earlyText').textContent=message||earlyDefaultText;$('earlyModal').hidden=false;requestAnimationFrame(()=>$('earlyCancel').focus());});}
function closeEarly(answer){$('earlyModal').hidden=true;const resolve=earlyResolve;earlyResolve=null;resolve?.(answer);}
$('earlyConfirm').onclick=()=>closeEarly(true);$('earlyCancel').onclick=()=>closeEarly(false);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('earlyModal').hidden){e.preventDefault();closeEarly(false);}});

function applyView(mode){
 if(!['info','calendar'].includes(mode))mode='calendar';
 $('viewMode').value=mode;$('calendarView').hidden=mode!=='calendar';$('statusView').hidden=mode!=='info';$('compactDashboard').hidden=mode!=='calendar'||informationCollapsed;document.body.classList.toggle('calendar-compact',mode==='calendar');
 if(state){renderCalendar();renderCompactDashboard();if(mode==='info')$('informationInventory').querySelector('.inventory-heading').append($('craftBtn'));}
}
$('viewMode').onchange=()=>{applyView($('viewMode').value);window.scrollTo(0,0);};
let informationCollapsed=false;applyView('calendar');
let claimKind=null;
function openClaim(kind){claimKind=kind;$('claimCustom').hidden=kind!=='ticket';$('claimTotal').value='2';$('claimTitle').textContent=(kind==='ticket'?'일요일 수행서':'금요일 철제검 조각')+' 퀘스트 완료';$('claimReceive').textContent='지금 수령 · '+(kind==='ticket'?'2장':'1개')+' 추가';$('claimError').textContent='';$('claimModal').hidden=false;focusEditor($('claimModal'));}
async function saveClaim(mode){try{$('claimReceive').disabled=true;$('claimIncluded').disabled=true;$('claimCustomApply').disabled=true;const r=await window.calendarAPI.claimWeekly({kind:claimKind,mode,total:Number($('claimTotal').value)});if(!r.ok)throw Error(r.error);$('claimModal').hidden=true;}catch(e){$('claimError').textContent=e.message;}finally{$('claimReceive').disabled=false;$('claimIncluded').disabled=false;$('claimCustomApply').disabled=false;}}
$('claimReceive').onclick=()=>saveClaim('receive');$('claimIncluded').onclick=()=>saveClaim('included');$('claimCancel').onclick=()=>$('claimModal').hidden=true;


function renderLoginSummary(){
 const hour=t=>t.endsWith(':00')?t.slice(0,2):t;
 const times=list=>list.map(w=>hour(w.start)+'~'+hour(w.end)+'시').join(' · ');
 const exceptions=state.loginDays.filter(i=>JSON.stringify(state.dayWindows[i])!==JSON.stringify(i===0||i===6?state.weekendWindows:state.weekdayWindows));
 $('loginSummary').replaceChildren();
 for(const [title,windows]of [['평일',state.weekdayWindows],['주말',state.weekendWindows]]){const line=document.createElement('div');line.textContent=title+' '+times(windows);$('loginSummary').append(line);}
 if(exceptions.length||state.loginDays.length!==7){const note=document.createElement('span');note.className='hint';note.textContent=(state.loginDays.length!==7?'접속 '+state.loginDays.map(i=>Forms.days[i]).join('·')+' · ':'')+(exceptions.length?'요일별 예외 '+exceptions.length+'일':'');$('loginSummary').append(note);}
}
makeEditable($('loginSummary'),()=>openGroup('connection','접속 가능 시간'));
$('compactDetails').onclick=()=>{const expanded=$('statusView').classList.toggle('compact-expanded');$('compactDetails').textContent=expanded?'상세 접기':'상세 펼치기';};
async function undoQuest(kind){try{const r=await window.calendarAPI.undoWeekly(kind);if(!r.ok)throw Error(r.error);$('questUndoMessage').textContent=(kind==='ticket'?'2차특수임무수행서':'철제검 조각')+' 보유량 재확인 필요 · 수량 자동 변경 없음';$('questUndoModal').hidden=false;focusEditor($('questUndoModal'));}catch(e){$('error').textContent=e.message;}}
$('undoTicket').onclick=() =>undoQuest('ticket');$('undoIron').onclick=()=>undoQuest('iron');$('questUndoClose').onclick=()=>$('questUndoModal').hidden=true;
let blockMode=false,blockDraft=new Set(),blockBase=new Set(),blockSaving=false,dragAdd=true,dragLast=-1;
$('blockModeBtn').onclick=()=>{if(blockMode)return;blockBase=new Set(state.blockedDates);blockDraft=new Set(blockBase);blockMode=true;paintBlockDraft();};
function paintBlockDraft(){
 $('blockModeBtn').textContent=blockMode?'임시 선택 중':'접속 불가';$('blockModeBtn').setAttribute('aria-pressed',String(blockMode));$('blockApply').hidden=!blockMode;$('blockCancel').hidden=!blockMode;$('blockMessage').hidden=!blockMode;$('calendar').classList.toggle('block-mode',blockMode);
 if(blockMode){const changes=new Set([...blockBase,...blockDraft]);let n=0;for(const d of changes)if(blockBase.has(d)!==blockDraft.has(d))n++;$('blockMessage').textContent=`클릭·드래그로 선택/해제 · 변경 ${n}일 · 적용 전 일정 변경 없음`;}
 for(const cell of $('calendar').querySelectorAll('[data-date]')){const d=cell.dataset.date,on=blockMode?blockDraft.has(d):state.blockedDates.includes(d),changed=blockMode&&blockBase.has(d)!==blockDraft.has(d);cell.classList.toggle('unavailable',on);cell.classList.toggle('draft-change',changed);cell.querySelector('.unavailable-label')?.remove();if(on||changed){const badge=document.createElement('span');badge.className='unavailable-label';badge.textContent=changed?(on?'불가 · 임시':'해제 · 임시'):'접속 불가';cell.append(badge);}}
}
$('blockCancel').onclick=()=>{if(blockSaving)return;blockMode=false;dragLast=-1;renderCalendar();};
$('blockApply').onclick=async()=>{if(blockSaving)return;blockSaving=true;$('blockApply').disabled=true;$('blockCancel').disabled=true;try{const next=new Set(state.blockedDates);for(const d of blockBase)if(!blockDraft.has(d))next.delete(d);for(const d of blockDraft)if(!blockBase.has(d))next.add(d);const result=await window.calendarAPI.saveSettings({blockedDates:[...next].sort()});if(!result.ok)throw Error(result.error);blockMode=false;renderCalendar();}catch(e){$('blockMessage').textContent=e.message;}finally{blockSaving=false;$('blockApply').disabled=false;$('blockCancel').disabled=false;}};
function clickCalendarDay(date){if(!blockMode)openDay(date);}
function markDrag(index){const cells=[...$('calendar').querySelectorAll('[data-date]')];if(index<0)return;const from=dragLast<0?index:dragLast;for(let i=Math.min(from,index);i<=Math.max(from,index);i++){const d=cells[i].dataset.date;dragAdd?blockDraft.add(d):blockDraft.delete(d);}dragLast=index;paintBlockDraft();}
$('calendar').addEventListener('pointerdown',e=>{if(!blockMode||blockSaving||e.button!==0)return;const cell=e.target.closest('[data-date]');if(!cell)return;e.preventDefault();dragAdd=!blockDraft.has(cell.dataset.date);dragLast=-1;markDrag([...$('calendar').children].indexOf(cell));$('calendar').setPointerCapture(e.pointerId);});
$('calendar').addEventListener('pointermove',e=>{if(!blockMode||blockSaving||dragLast<0)return;const cell=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-date]');if(cell&&cell.parentElement===$('calendar'))markDrag([...$('calendar').children].indexOf(cell));});
for(const type of ['pointerup','pointercancel','lostpointercapture'])$('calendar').addEventListener(type,()=>dragLast=-1);

$('claimCustomApply').onclick=()=>saveClaim('custom');
