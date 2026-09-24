(function(root){
const el=(tag,text,cls)=>Object.assign(document.createElement(tag),{textContent:text||'',className:cls||''});
const WARNING='현재 일정은 예상 일정 전체 이행 시의 예상값 · 접속 불가 날짜 추가 또는 접속 시간 변경 시 완료 예정일과 추천 사용량 변동 가능';
const date=t=>t===null?'계산 불가':new Date(t).toLocaleString('ko-KR',{year:'numeric',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false});
// 단축 시간은 버림. 1시간 미만 단축은 "효과 없음"(0시간)과 구분해 '1시간 미만'으로 표시한다.
const duration=h=>{if(h===null)return '계산 불가';const n=Math.floor(Math.max(0,h));return n===0&&h>0?'1시간 미만':Math.floor(n/24)+'일 '+n%24+'시간';};
// 표의 총단축은 일수만, 남는 시간은 버려서 단축 효과를 부풀리지 않는다. 상세 보기에서는 시간까지 그대로 보여준다.
const savedDays=h=>h===null?'계산 불가':Math.floor(Math.max(0,h)/24)+'일';
const daysOnly=(finish,atNow)=>finish===null?'계산 불가':Math.max(0,Math.ceil((finish-atNow)/3600000/24))+'일';
function popup(title,kind){const dialog=el('dialog','','speedup-popup '+kind),head=el('div','','speedup-popup-head'),close=el('button','닫기');close.type='button';close.onclick=()=>dialog.close();head.append(el('h2',title),close);const body=el('div','','speedup-popup-body');dialog.append(head,body);dialog.addEventListener('keydown',e=>{if(e.key==='Escape')e.stopPropagation();});dialog.addEventListener('close',()=>dialog.remove());document.body.append(dialog);return {dialog,body,open:()=>dialog.showModal()};}
function render(host,raw){
 host.replaceChildren();const s=Model.normalize(raw);
 let worker=null,serial=0,lastData=null,lastNow=null,baseline=null,baselineWorker=null;
 // 이미 유효하게 저장된 조합이 있으면 그 조합을 선택 상태로 미리 채운다.
 let selected=(!s.speedupReviewPending&&!Model.planIssues(s).length&&s.accelerationMode&&(s.gueseoTotal>0||s.masterBudget>0))?{gueseoTotal:s.gueseoTotal,masterBudget:s.masterBudget}:null;
 let chosenSnapshot=selected?s.planSnapshot||null:null;
 // 카드 두 장. 여는 동작 없이 한 번 눌러 고른다. 기본은 "아직 계획 없음".
 const readiness=el('div','','stack tight');readiness.append(el('div','삼인검 임무 종료 전 사인검 임무 조건 준비 계획 여부 선택','field-title'));
 const readyRow=el('div','','choice-row');readiness.append(readyRow);
 const readyInputs=[['false','아직 계획 없음'],['true','준비할 계획 있음']].map(([v,t])=>{const label=el('label','','choice-card compact'),input=document.createElement('input');input.type='radio';input.name='sainReadyPlan';input.value=v;input.dataset.field='sainReadyPlan';label.append(input,el('strong',t));readyRow.append(label);return input;});
 const ready={get value(){return readyInputs.find(x=>x.checked)?.value??'false';},set value(v){for(const x of readyInputs)x.checked=x.value===String(v);},set onchange(fn){for(const x of readyInputs)x.onchange=fn;}};
 ready.value=String(s.sainReadyPlan);readiness.hidden=s.canSainMission;host.append(readiness);
 const questHint=el('p','일요일 퀘스트 수령 시 기본 2장 기준 계산 · 귀서 사용 시 수령 창에 총수령량 입력','hint'),warningHint=el('p',WARNING,'hint');
 if(host.id==='accelerationForm'){
  // 임달 기준 문구는 저장된 효율 설정을 그대로 따른다. 기본 12시간만 귀서 효율 환산값이고, 직접 바꾼 값은 사용자 지정으로 표시한다.
  const masterRule=s.efficiencyMode==='gueseo'?'귀서 효율 환산 기준(1개당 평균 '+Completion.efficiencyHours(s)+'시간)':s.masterEfficiencyHours===12?'귀서 효율 환산 기준(1개당 평균 12시간)':'사용자 지정 기준(1개당 평균 '+s.masterEfficiencyHours+'시간)';
  const basis=el('div','','speedup-basis');basis.append(
   el('p','· 전체 완료일 기준 산정 · 귀서: 조건 만족 시 수행서 2장 추가 · 임달: '+masterRule+' 이상 단축 시 사용','hint'),
   el('p','· 제시 일정 이행 전제 · 기준 조정 및 조건별 일정 비교: 시작 후 메인 화면 [효율설정] · 상세: 설명서','hint'));
  host.prepend(basis);
  // 마법사에서는 표가 한 화면에 들어오도록 설명을 접어두고, 누르면 그 자리에서 펼친다.
  const guide=el('details','','speedup-guide stack tight');guide.append(
   el('summary','귀서·임달의 제작 기간 단축 방식'),
   el('p','· 귀서 — 수행서 기본 지급 주 2장, 임무 진행 속도 대비 부족. 부족 시 임무 중단 및 다음 주까지 지연. 일요일 퀘스트 완료 → 귀서 사용 → 퀘스트 초기화로 부족분 충당(1회당 2장).','hint'),
   el('p','· 임달 — 임무 완료 시각을 접속 시간 안으로 당겨 접속 대기 시간 감소. 전체 완료일 기준, '+masterRule+' 이상 단축 시에만 사용.','hint'),
   questHint,warningHint);
  host.append(guide);
 }
 else host.append(questHint,warningHint);
 const guideNote=el('p','','speedup-select-guide');guideNote.hidden=true;host.append(guideNote);
 const status=el('p','계산 중…','hint'),tableWrap=el('div','','stack');
 host.append(status,tableWrap);

 const matches=r=>!!selected&&selected.gueseoTotal===r.gueseoCount&&selected.masterBudget===r.masterCount;
 // 사인검 임무가 아직 불가능하면 "준비할 계획 있음"을 직접 눌러야만 조합을 고를 수 있다. 이미 가능하면 그 질문 자체가 없으니 바로 고를 수 있다.
 const locked=()=>!s.canSainMission&&ready.value!=='true';
 function updateGuide(){
  if(locked()){guideNote.hidden=false;guideNote.className='speedup-select-guide pending';guideNote.textContent='"준비할 계획 있음" 선택 시 조합 선택 가능 · 계획 없이도 다음 진행 가능';}
  else if(selected){guideNote.hidden=false;guideNote.className='speedup-select-guide done';guideNote.textContent='조합 확정 · 다음 진행 가능';}
  else guideNote.hidden=true;
 }
 ready.onchange=()=>{updateGuide();renderTable();};

 function pick(r){if(locked())return;selected=r?{gueseoTotal:r.gueseoCount,masterBudget:r.masterCount}:{gueseoTotal:0,masterBudget:0};chosenSnapshot=r?{...r,at:Date.now(),optimal:['economy','fast'].includes(r.kind)&&(r.gueseoCount+r.masterCount>0)&&r.savedHours>0}:null;renderTable();updateGuide();}

 function details(r){const button=el('button','상세');button.type='button';button.onclick=()=>{const view=popup(r.label+' · 상세 정보','speedup-detail-popup'),d=view.body,won=n=>Math.round(n).toLocaleString()+'원';
 const sections=el('div','','speedup-detail-grid'),cost=el('section','','speedup-detail-section'),effect=el('section','','speedup-detail-section');cost.append(el('h3','비용'),el('p','귀서 '+r.gueseoCount+'장: '+won(r.price.gueseo)),el('p','임달 '+r.price.packs+'묶음 + 낱개 '+r.price.singles+'개: '+won(r.price.master)),el('strong','사용분 환산 합계 '+won(r.price.total)),el('p','보유 귀서·임달 제외 추가 구매 예상 '+won(r.purchasePrice.total)),el('p','귀서: 입력 시세 환산(미입력 시 15,000원) · 임달 10개 9,000원 · 낱개 1,000원 · 9개 필요 시 10개 구매','hint'));
 effect.append(el('h3','단축 효과'),el('p','완료 예상: '+date(r.finish)),el('p','귀서 단축: '+duration(r.gueseoSavedHours)),el('p','임달 추가 단축: '+duration(r.masterSavedHours)),el('strong','총단축: '+duration(r.savedHours)),el('p','남는 수행서 '+r.remainingTickets+'장 · 추가 임달 필요 '+r.masterNeeded+'개'));
 if(r.notRecommended&&r.reason)effect.append(el('p','비추천 이유: '+r.reason));
 if(r.kind==='fast'&&r.extraPrice)effect.append(el('p','비용 절감안보다 귀서 '+r.extraG+'장 + 임달 '+r.extraM+'개 → '+duration(r.extraHours)+' 추가 단축'),el('p','추가분 별도 구매 환산 '+won(r.extraPrice.total)+(r.extraHours>0?' · 하루 단축당 약 '+won(r.extraPrice.total/(r.extraHours/24)):'')));
 sections.append(cost,effect);d.append(sections,el('h3','귀서 · 임무의달인 사용 일정'),el('p','날짜순 예상 · 실제 보상과 접속 일정에 따라 변동 · 자동 사용 없음','hint'));
 const events=[...(r.purchases||[]).map(x=>({at:x.at,item:'귀서',qty:x.qty+'장',purpose:'수행서 '+x.qty*2+'장 추가 확보'})),...r.log.filter(x=>x.shortcutHours>0).map(x=>({at:x.collect,item:'임무의달인',qty:x.shortcutHours+'개',purpose:(x.phase==='sam'?'삼인검':'사인검')+' 임무 보상 수령 전 사용'}))].sort((a,b)=>a.at-b.at);
 if(!events.length)d.append(el('p','추가 아이템 사용 일정 없음'));else{const table=el('table','','speedup-schedule-table'),head=el('thead'),tr=el('tr');for(const t of ['사용 예정일','아이템','수량','용도'])tr.append(el('th',t));head.append(tr);table.append(head);const body=el('tbody');for(const event of events){const row=el('tr');for(const value of [date(event.at),event.item,event.qty,event.purpose])row.append(el('td',value));body.append(row);}table.append(body);d.append(table);}
 d.append(el('p',WARNING,'comparison-warning'));view.open();};return button;}

 function referenceRow(){ // 1행: 사인검 준비 안 함 - 실제 계획과 무관하게 참고용
  if(!baseline)return null;
  const row=el('tr','','reference-row');
  const label=el('td');label.append(el('strong','사인검 준비 안 함'),el('span',' · 삼인검만','hint'));row.append(label);
  for(const v of ['-','-',daysOnly(baseline.base.finish,lastNow),'-',baseline.base.remainingTickets+'장'])row.append(el('td',v));
  const actions=el('td');actions.append(el('span','참고용','hint'));row.append(actions);
  return row;
 }
 function renderTable(){
  const data=lastData;tableWrap.replaceChildren();
  if(!data)return;
  const scroll=el('div','','comparison-scroll'),table=el('table','','comparison-table speedup-table'),head=el('thead'),titles=el('tr');
  for(const title of ['구분','귀서 총량','임달 총량','완료 예상','총단축','남는 수행서','선택 / 상세'])titles.append(el('th',title));head.append(titles);table.append(head);
  const body=el('tbody');
  const ref=referenceRow();if(ref)body.append(ref);
  const noneSelected=!!selected&&selected.gueseoTotal===0&&selected.masterBudget===0,noneRow=el('tr','',noneSelected?'selected':'');
  const noneLabel=el('td');noneLabel.append(el('strong','귀서·임달 미사용'));noneRow.append(noneLabel);
  for(const v of ['0장','0개',daysOnly(data.base.finish,lastNow),'0일',(data.base.remainingTickets??0)+'장'])noneRow.append(el('td',v));
  const noneActions=el('td'),noneBtn=el('button',noneSelected?'선택됨':'선택');noneBtn.type='button';noneBtn.disabled=locked();noneBtn.onclick=()=>pick(null);noneActions.append(noneBtn);noneRow.append(noneActions);body.append(noneRow);
  for(const r of data.rows){const recommended=['economy','fast'].includes(r.kind),sel=matches(r),row=el('tr','',sel?'selected':recommended?'recommended':r.notRecommended?'not-recommended':'');
  // 행은 한 줄로 두고, 긴 설명은 상세로 옮겨 이름 옆에는 짧은 꼬리말만 붙인다.
  const label=el('td');label.append(el('strong',(r.notRecommended?'비추천 · ':'')+(r.kind==='daily'?'24시간 강행':r.label)));
  if(r.notRecommended)label.append(el('span',' · 효율 기준 미달','hint'));
  else if(r.kind==='fast'&&r.extraHours!==null){const days=Math.floor(r.extraHours/24);label.append(el('span',r.extraHours<=0?' · 절감안 대비 추가 단축 없음':days<1?' · 절감안 대비 1일 미만 추가 단축':' · 절감안 대비 '+days+'일 추가 단축','hint'));}
  row.append(label);
  for(const value of [r.gueseoCount+'장',r.masterCount+'개',daysOnly(r.finish,lastNow),savedDays(r.savedHours),r.remainingTickets+'장'])row.append(el('td',value));
  const actions=el('td');if(r.kind==='daily')actions.append(el('span','참고용','hint'));else{const btn=el('button',sel?'선택됨':'선택');btn.type='button';btn.disabled=r.finish===null||locked();btn.onclick=()=>pick(r);actions.append(btn);}
  actions.append(details(r));row.append(actions);body.append(row);}
  table.append(body);scroll.append(table);tableWrap.append(scroll,el('p','녹색: 추천 · 빨간색: 추가 효율이 낮은 비추천 조합 · 비용, 귀서·임달별 단축 효과, 사용 일정: 각 행 상세 참조','hint'));
 }

 function calculate(custom=null){worker?.terminate();const id=++serial;status.hidden=false;status.textContent=custom?'직접 입력 조합 계산 중…':'조합 계산 중…';worker=new Worker('comparison-worker.js');
  const now=Date.now();lastNow=now;
  worker.onmessage=e=>{if(id!==serial)return;if(!host.isConnected||host.closest('[hidden]')){worker?.terminate();worker=null;return;}if(e.data.progress){status.textContent=e.data.progress+'개 조합 계산 중…';return;}if(e.data.error){status.hidden=false;status.textContent=e.data.error;}else status.hidden=true;if(e.data.result){lastData=e.data.result;renderTable();}worker.terminate();worker=null;};
  worker.onerror=()=>{status.hidden=false;status.textContent='계산 실패 · 입력 조건 확인 후 재시도';worker?.terminate();worker=null;};
  // 표는 계획 여부와 무관하게 항상 보여준다. 실제 준비 계획 확정 여부는 저장 시점의 ready.value만 따른다.
  worker.postMessage({state:{...raw,accelerationMode:true,speedupIntent:'both',sainReadyPlan:true,gueseoTotal:0,masterBudget:0},now,holidays:typeof HOLIDAYS==='undefined'?{}:HOLIDAYS,custom});}
 function calculateBaseline(){ // 1행 전용: 사인검 준비를 안 했다고 가정한 실제 조건(계획 없음) 참고치
  if(s.canSainMission)return;
  baselineWorker=new Worker('comparison-worker.js');
  baselineWorker.onmessage=e=>{if(e.data.result){baseline=e.data.result;renderTable();}baselineWorker?.terminate();baselineWorker=null;};
  baselineWorker.onerror=()=>{baselineWorker?.terminate();baselineWorker=null;};
  baselineWorker.postMessage({state:{...raw,accelerationMode:true,speedupIntent:'none',sainReadyPlan:false,gueseoTotal:0,masterBudget:0},now:lastNow,holidays:typeof HOLIDAYS==='undefined'?{}:HOLIDAYS,custom:null});
 }
 calculate();calculateBaseline();
 updateGuide();

 const manual=el('details'),summary=el('summary','총사용량 직접 입력해 비교'),g=document.createElement('input'),m=document.createElement('input');manual.append(summary);for(const [input,title,max]of [[g,'귀서 총량',100],[m,'임달 총량',1000]]){input.type='number';input.min=0;input.max=max;input.step=1;input.value=0;const label=el('label',title,'field');label.append(input);manual.append(label);}const manualButton=el('button','직접 비교');manualButton.type='button';manualButton.onclick=()=>{if(!g.value.trim()||!m.value.trim()||!g.checkValidity()||!m.checkValidity()){status.hidden=false;status.textContent='귀서 0~100장, 임달 0~1000개 정수 입력 필요';return;}calculate({g:Number(g.value),m:Number(m.value)});};manual.append(manualButton);if(host.id!=='accelerationForm')host.append(manual);

 const reader=()=>{
  if(selected&&locked())throw Error('조합 반영 시 "준비할 계획 있음" 먼저 직접 선택 필요');
  const chosen=selected||{gueseoTotal:0,masterBudget:0};
  // 추천(비용 절감·기간 단축)·미사용이 아닌 조합을 직접 고르면 그 사용량을 고정해 이후 재계산에서 되돌리지 않음
  const kept=!!chosenSnapshot&&!['economy','fast'].includes(chosenSnapshot.kind)&&chosen.gueseoTotal+chosen.masterBudget>0;
  return {usageMode:kept?'kept':'efficient',autoAdjustPlan:true,speedupIntent:chosen.masterBudget>0?'both':chosen.gueseoTotal>0?'gueseo':'none',sainReadyPlan:ready.value==='true',accelerationMode:true,speedupReviewPending:false,planSnapshot:chosenSnapshot,...chosen,ticketMode:'none',ticketExtraPerWeek:0,gueseoEveryWeeks:0,gueseoQty:1,useShortcuts:chosen.masterBudget>0,thresholdHours:chosen.masterBudget>0?29:0,optimizeShortcuts:true};
 };
 reader.dispose=()=>{serial++;worker?.terminate();worker=null;baselineWorker?.terminate();baselineWorker=null;};
 return reader;
}
root.SpeedupForm={render,WARNING};
})(globalThis);
