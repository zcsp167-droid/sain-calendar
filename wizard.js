const $=id=>document.getElementById(id),radio=name=>document.querySelector(`input[name="${name}"]:checked`)?.value;
const choose=(name,value)=>{const input=document.querySelector(`input[name="${name}"][value="${value}"]`);if(input)input.checked=true;};
let savingWizard=false;
let loaded,draftState,current='ownership',readForm=null,remainingReference=Date.now(),remainingEdited=false,readyAt=null,missionElementLocked=false;
const elementNames={fire:'화·홍옥',water:'수·청옥',wind:'풍·녹주석',thunder:'뇌·황옥',earth:'토·흑요석'};
const owns=()=>radio('hasSam')==='yes',canSain=()=>owns()||radio('canSain')==='yes';
const formSteps=['element','materials','connection','notifications','acceleration'];
const steps=()=>[...(!loaded?.onboarded?['notice','intro']:[]),'connection','ownership',...(!owns()?['availability']:[]),...(canSain()?['element']:[]),'materials',...(!owns()?['strategy']:[]),'mission','notifications','acceleration','review'];
function sync(){
 $('samMissionOption').hidden=owns();$('sainMissionOption').hidden=!canSain();
 $('remainingFields').hidden=radio('missionPhase')==='none';$('samActionFields').hidden=radio('missionPhase')!=='sam';$('sainElementFields').hidden=radio('missionPhase')!=='sain';
 const list=steps(),i=list.indexOf(current);$('stepProgress').textContent=`${i+1} / ${list.length} 단계`;$('progressFill').style.width=(i+1)/list.length*100+'%';$('previous').disabled=i===0;$('next').textContent=current==='intro'?'설정 시작':current==='review'?'저장 · 시작':'다음';
}
function capture(validate=true){
 if(current==='ownership'){if(validate&&!radio('hasSam'))throw Error('삼인검 보유 여부 선택 필요');draftState.hasSamSword=owns();if(owns())draftState.canSainMission=true;}
 if(current==='availability'){if(validate&&!radio('canSain'))throw Error('사인검 임무 가능 여부 선택 필요');draftState.canSainMission=canSain();}
 if(readForm){try{Object.assign(draftState,readForm());}catch(e){if(validate)throw e;}}
 if(current==='strategy')draftState.strategy=radio('strategy');
 if(current==='mission'){
  const phase=radio('missionPhase'),h=Number($('remainingHours').value),m=Number($('remainingMinutes').value);
  if(validate&&(!phase||phase!=='none'&&(!Number.isInteger(h)||!Number.isInteger(m)||h<0||m<0||m>59||h*60+m>1800)))throw Error('남은 시간 0~30시간 범위 입력 필요');
  const action=radio('missionAction'),element=radio('missionElement');
  if(validate&&phase==='sam'&&action===undefined)throw Error('진행 중인 삼인검 임무 보상 구간 선택 필요');
  if(validate&&phase==='sain'&&element===undefined)throw Error('진행 중인 사인검 임무 속성 선택 필요');
  draftState.missionDraft={phase:phase||'none',action:phase==='sam'&&action!==undefined?Number(action):null,element:phase==='sain'?element||null:null,readyAt:phase==='none'?null:!remainingEdited&&readyAt?readyAt:new Date(remainingReference+(h*60+m)*60000).toISOString()};
 }
}
function review(){
 const s=Model.normalize(draftState),rows=[['삼인검·석판',s.hasSamSword?'보유':'준비 중'],['사인검 임무',s.canSainMission?'가능':'불가능'],['진행 순서',s.order==='sain-first'?'사인검 → 삼인검':'삼인검 → 사인검(준비 후)']];
 rows.push(['사인검 준비 계획',s.canSainMission?'현재 가능':s.sainReadyPlan?'삼인검 임무 종료 전 준비 예정':'아직 없음'],['단축 의향',{none:'사용 안 함',gueseo:'귀서만',master:'임달만',both:'둘 다'}[s.speedupIntent]]);
 if(!s.hasSamSword)rows.push(['석판',Model.names.map((n,i)=>`${n} ${s.tabletQty[i]}`).join(' · ')],['철제검 조각',s.ironQty+' / 20']);
 rows.push([Model.shardName(s),s.currentQty+' / 300'],['접속 요일',s.loginDays.map(i=>Forms.days[i]).join(' · ')],['공휴일 설정',s.holidayWeekend?'주말로 적용':'적용 안 함'],['2차특수임무수행서',s.currentTickets+'장 · 일요일 퀘스트 기본 주 2장'],['귀서','총 '+s.gueseoTotal+'장 사용 계획 · '+s.gueseoStock+'장 보유'],['임무의달인','총 '+s.masterBudget+'개 사용 계획 · '+s.masterQty+'개 보유'],['알림',Model.noticeSummary(s)],['자동 실행',s.startAtLogin?'켬':'끔']);
 $('review').replaceChildren();for(const [name,value]of rows){const d=document.createElement('div');d.className='review-line';d.textContent=name+' · '+value;$('review').append(d);}
}
function show(step){readForm?.dispose?.();current=step;readForm=null;document.querySelectorAll('.wizard-step').forEach(x=>x.hidden=x.dataset.step!==step);
 if(formSteps.includes(step))readForm=Forms.render($(step+'Form'),step,draftState);
 if(step==='mission'){
  if(owns()&&radio('missionPhase')==='sam'||!canSain()&&radio('missionPhase')==='sain')choose('missionPhase','none');
  // 사인검 임무 속성은 앞에서 고른 제작 속성을 따라간다. 이 단계에서 직접 고른 값은 제작 속성을 다시 누르기 전까지 유지한다.
  if(!missionElementLocked)choose('missionElement',draftState.craftElement||'fire');
  $('craftElementNote').textContent=`${steps().indexOf('element')+1}단계 제작 속성: ${elementNames[draftState.craftElement]||'미선택'}`;
 }
 sync();$('error').textContent='';if(step==='review')review();window.scrollTo(0,0);document.querySelector(`section[data-step="${step}"] h2`).focus({preventScroll:true});
}
document.querySelectorAll('input[type=radio]').forEach(x=>x.onchange=()=>{if(x.name==='missionPhase'){remainingEdited=true;remainingReference=Date.now();}sync();});
// 사용자가 직접 누른 것만 선택으로 본다. 제작 속성은 같은 값을 다시 눌러도 임무 속성을 그 값으로 되돌린다.
document.addEventListener('click',e=>{const input=e.target.closest?.('input[type=radio]');if(!input)return;if(input.name==='missionElement')missionElementLocked=true;else if(input.dataset.field==='craftElement')missionElementLocked=false;});
for(const id of ['remainingHours','remainingMinutes'])$(id).oninput=()=>{remainingEdited=true;remainingReference=Date.now();};
function stockPopup(needsG,needsM,cur){
 return new Promise(resolve=>{
  const dialog=document.createElement('dialog');dialog.className='modal-box stock-popup';
  const title=document.createElement('h2');title.textContent='현재 보유량 입력';
  const hint=document.createElement('p');hint.className='hint';hint.textContent='지금 모르면 나중에 메인 화면에서 수정 가능';
  const fields=document.createElement('div');fields.className='stack';
  let gInput=null,mInput=null;
  if(needsG){const label=document.createElement('label');label.className='field';label.textContent='현재 보유 중인 귀서';gInput=document.createElement('input');gInput.type='number';gInput.min='0';gInput.max='100000';gInput.step='1';gInput.value=String(cur.gueseoStock||0);label.append(gInput);fields.append(label);}
  if(needsM){const label=document.createElement('label');label.className='field';label.textContent='현재 보유 중인 임무의달인';mInput=document.createElement('input');mInput.type='number';mInput.min='0';mInput.max='100000';mInput.step='1';mInput.value=String(cur.masterQty||0);label.append(mInput);fields.append(label);}
  const err=document.createElement('p');err.className='error';
  const actions=document.createElement('div');actions.className='row spread';
  const cancelBtn=document.createElement('button');cancelBtn.type='button';cancelBtn.textContent='취소';
  const confirmBtn=document.createElement('button');confirmBtn.type='button';confirmBtn.className='primary';confirmBtn.textContent='확인';
  actions.append(cancelBtn,confirmBtn);
  dialog.append(title,hint,fields,err,actions);
  document.body.append(dialog);
  const finish=v=>{dialog.close();dialog.remove();resolve(v);};
  cancelBtn.onclick=()=>finish(null);
  confirmBtn.onclick=()=>{
   const g=gInput?Number(gInput.value):undefined,m=mInput?Number(mInput.value):undefined;
   if((gInput&&(!gInput.value.trim()||!Number.isInteger(g)||g<0))||(mInput&&(!mInput.value.trim()||!Number.isInteger(m)||m<0))){err.textContent='0 이상 정수 입력 필요';return;}
   finish({gueseoStock:g,masterQty:m});
  };
  dialog.addEventListener('cancel',e=>{e.preventDefault();finish(null);});
  dialog.showModal();
 });
}
$('previous').onclick=()=>{try{capture(false);const list=steps();show(list[list.indexOf(current)-1]);}catch(e){$('error').textContent=e.message;}};
$('next').onclick=async()=>{if(savingWizard)return;try{capture();if(current!=='review'){
  if(current==='acceleration'&&(draftState.gueseoTotal>0||draftState.masterBudget>0)){
   const res=await stockPopup(draftState.gueseoTotal>0,draftState.masterBudget>0,draftState);
   if(!res)return;
   if(res.gueseoStock!==undefined)draftState.gueseoStock=res.gueseoStock;
   if(res.masterQty!==undefined)draftState.masterQty=res.masterQty;
  }
  const list=steps();show(list[list.indexOf(current)+1]);return;}Schedule.validate(Model.normalize(draftState));savingWizard=true;$('next').disabled=$('previous').disabled=$('cancel').disabled=true;const r=await window.calendarAPI.saveSettings({...draftState,wizardSubmit:true,expectedValues:loaded});if(!r.ok)throw Error(r.error);window.close();}catch(e){$('error').textContent=e.message;}finally{savingWizard=false;$('next').disabled=$('cancel').disabled=false;sync();}};
$('routeExamplesBtn').onclick=()=>RouteExamples.open(Model.normalize(draftState));
$('help').onclick=()=>window.calendarAPI.openHelp();$('cancel').onclick=()=>{if(!savingWizard)window.close();};
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!document.querySelector('dialog[open]')&&!savingWizard)window.close();});
async function init(){loaded=Model.normalize(await window.calendarAPI.loadSettings());draftState=structuredClone(loaded);$('setupBadge').textContent=loaded.onboarded?'현황 수정':'처음부터 현황 설정';if(loaded.onboarded){choose('hasSam',loaded.hasSamSword?'yes':'no');choose('canSain',loaded.canSainMission?'yes':'no');}choose('strategy',loaded.strategy);choose('missionPhase',loaded.activeMission?.phase||'none');if(loaded.activeMission?.phase==='sam'&&[0,1,2].includes(loaded.activeMission.action))choose('missionAction',String(loaded.activeMission.action));
 choose('missionElement',loaded.activeMission?.phase==='sain'&&loaded.activeMission.element?loaded.activeMission.element:loaded.craftElement||'fire');
 let minutes=1800;if(loaded.activeMission){readyAt=new Date(+new Date(loaded.activeMission.startedAt)+30*3600000).toISOString();minutes=Math.max(0,Math.ceil((+new Date(readyAt)-Date.now())/60000));}
 $('remainingHours').value=Math.floor(minutes/60);$('remainingMinutes').value=minutes%60;show(loaded.onboarded?'connection':'notice');
}
init().catch(e=>{$('error').textContent=e.message;});
