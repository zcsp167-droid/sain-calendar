function openEfficiencyPlanComparison({snapshot,source,patch,result,currentPlan,now,onApply}){
 const dialog=compactEl('dialog','','speedup-popup efficiency-comparison'),head=compactEl('div','','speedup-popup-head'),body=compactEl('div','','speedup-popup-body stack'),cards=compactEl('div','','efficiency-plan-cards'),message=compactEl('p','','hint');
 let saving=false,detail=null;const controls=[];
 const close=compactButton('닫기',()=>dialog.close());head.append(compactEl('h2','내 조건으로 일정 비교'),close);
 const money=n=>Math.round(n).toLocaleString('ko-KR')+'원';
 const missingPreparation=!snapshot.canSainMission&&!snapshot.sainReadyPlan&&snapshot.activeMission?.phase!=='sain'&&snapshot.currentQty<300;
 body.append(compactEl('p','보유량·진행 중인 임무·접속 시간·접속 불가일 동일 · 미리보기는 실제 기록 변경 없음 · ‘이 조건 적용’ 클릭 시 귀서·임달 사용 표시와 계획 함께 변경','hint'));
 let readiness=null;
 const readyNotice=compactEl('span','','error');
 function updateApply(){controls.forEach(b=>b.disabled=saving||b.noFinish||(missingPreparation&&!readiness?.checked));if(readiness){readiness.disabled=saving;readyNotice.textContent=readiness.checked?'사인검 준비 가정 비교 · 적용 시 준비 예정 함께 저장':'사인검 준비 가정 비교 · 준비 계획 없음 · ‘사인검 준비 예정’ 체크 시 적용 가능';}}
 if(missingPreparation){currentPlan=null;const line=compactEl('div','','efficiency-readiness-notice'),label=compactEl('label','','efficiency-readiness-toggle');readiness=document.createElement('input');readiness.type='checkbox';readiness.checked=false;readiness.onchange=updateApply;label.append(readiness,document.createTextNode('사인검 준비 예정'));line.append(readyNotice,label);body.append(line);}

 const candidates=[['현재 적용 중인 일정',null,currentPlan||result.current],['귀서·임달 미사용','none',result.base],['귀서만 사용 · 비용 절감','gueseo',result.economy||result.base],['귀서 + 임달 사용 · 기간 단축','both',result.fast||result.economy||result.base]];
 for(const [title,intent,p]of candidates){
  const card=compactEl('section','','efficiency-plan-card'+(intent===null?' current':''));card.append(compactEl('h3',title));card.append(compactEl('span',intent===null?'현재 저장된 가격 기준':'이번에 입력한 가격 기준','hint'));
  if(!p){card.append(compactEl('p','계산할 일정 없음'));cards.append(card);continue;}
  const g=p.gueseoCount||0,m=p.masterCount||0,prices=intent===null?snapshot:patch,total=Completion.price(g,m,prices),purchase=Completion.price(Math.max(0,g-snapshot.gueseoStock),Math.max(0,m-snapshot.masterQty),prices);
  card.append(compactEl('strong',p.finish==null?'계산 불가':dateTime(p.finish),'efficiency-plan-date'),compactEl('p','귀서 '+g+'장 · 임달 '+m+'개'),compactEl('p','귀서 비용 '+money(total.gueseo)+' · 임달 비용 '+money(total.master)),compactEl('p','총 아이템 비용 '+money(total.total)),compactEl('p','보유량 제외 실제 구매액 '+money(purchase.total)),compactEl('p','임달 구매 '+purchase.purchased+'개 · 사용 후 잔여 '+(Math.max(0,snapshot.masterQty-m)+purchase.leftover)+'개','hint'));
  if(intent!==null){
   const comparisons=compactEl('div','','efficiency-cross-comparisons');
   for(const [otherTitle,otherIntent,other]of candidates){
    if(otherIntent===intent||!other)continue;
    const otherPrices=otherIntent===null?snapshot:patch;
    const otherCost=Completion.price(Math.max(0,(other.gueseoCount||0)-snapshot.gueseoStock),Math.max(0,(other.masterCount||0)-snapshot.masterQty),otherPrices).total;
    const delta=purchase.total-otherCost,costText=Math.abs(delta)<0.5?'구매액 같음':money(Math.abs(delta))+(delta>0?' 추가':' 절감');
    let timeText='완료일 비교 불가';
    if(p.finish!=null&&other.finish!=null){const minutes=Math.round((other.finish-p.finish)/60000),abs=Math.abs(minutes);const duration=Math.floor(abs/1440)+'일'+(abs%1440?' '+Math.floor(abs%1440/60)+'시간'+(abs%60?' '+abs%60+'분':''):'');timeText=minutes===0?'완료일 같음':duration+(minutes>0?' 단축':' 지연');}
    comparisons.append(compactEl('p',(otherIntent===null?'현재 일정':otherTitle)+' 대비: '+costText+' · '+timeText,'efficiency-plan-change'));
   }
   card.append(comparisons);
  }
  if(intent==='both'&&m===0)card.append(compactEl('p','현재 효율 기준 추가 사용 임달 없음','hint'));
  const actions=compactEl('div','','efficiency-actions');actions.append(compactButton('일정 보기',()=>{detail=openEfficiencySchedule(title,p,snapshot);}));
  if(intent!==null){const apply=compactButton('이 조건 적용',async()=>{
   if(saving||(missingPreparation&&!readiness.checked)||p.finish==null)return;saving=true;updateApply();close.disabled=true;controls.forEach(b=>b.disabled=true);message.textContent='선택 조건 적용 중…';
   try{const answer=await calendarAPI.saveSettings({markRead:true,expectedSource:source,...patch,...(missingPreparation?{sainReadyPlan:true}:{}),speedupIntent:intent,autoAdjustPlan:true,usageMode:'efficient',gueseoTotal:g,masterBudget:m,useShortcuts:m>0,thresholdHours:m>0?29:0,optimizeShortcuts:true,accelerationMode:true,speedupReviewPending:false,planSnapshot:{...p,at:now,kind:intent==='none'?'base':intent==='gueseo'?'economy':'fast',optimal:intent!=='none'&&(g+m>0)}});if(!answer.ok)throw Error(answer.error);if(answer.data?.stale)throw Error('보유량 또는 설정 변경됨 · 설정 창 닫은 뒤 재비교 필요');dialog.close();onApply();}
   catch(error){message.textContent=error.message;}
   finally{saving=false;close.disabled=false;updateApply();renderCompactDashboard();}
  },missingPreparation||p.finish==null);apply.noFinish=p.finish==null;controls.push(apply);actions.append(apply);}else actions.append(compactEl('span','비교 기준','hint'));
  card.append(actions);cards.append(card);
 }
 updateApply();body.append(cards,message);dialog.append(head,body);dialog.addEventListener('cancel',e=>{if(saving)e.preventDefault();});dialog.addEventListener('close',()=>{detail?.close();dialog.remove();});document.body.append(dialog);dialog.showModal();return dialog;
}
function openEfficiencySchedule(title,p,snapshot){
 const dialog=compactEl('dialog','','speedup-popup efficiency-schedule'),head=compactEl('div','','speedup-popup-head'),body=compactEl('div','','speedup-popup-body stack');
 head.append(compactEl('h2',title+' · 예상 일정'),compactButton('닫기',()=>dialog.close()));
 body.append(compactEl('p','예상 일정 · 실제 임무 보내기·수령·아이템 사용 기록 변경 없음','hint'));
 const table=compactEl('table','','speedup-schedule-table'),header=compactEl('tr');for(const text of ['예정 시각','내용','사용량 / 설명'])header.append(compactEl('th',text));table.append(header);
 const events=[];
 for(const g of p.purchases||[])events.push({at:g.at,order:0,text:'귀서 사용 · 수행서 추가 확보',detail:'귀서 '+g.qty+'장 → 수행서 '+g.qty*2+'장'});
 for(const [i,m]of (p.log||[]).entries()){const phase=m.phase==='sam'?'삼인검':'사인검';events.push({at:m.start,order:2,text:phase+' 임무 시작',detail:i===0&&snapshot.activeMission?'현재 진행 중인 임무':'수행서 1장 사용'});events.push({at:m.collect,order:1,text:phase+' 임무 수령',detail:m.shortcutHours?'임달 '+m.shortcutHours+'개 사용':'임달 미사용'});}
 events.sort((a,b)=>a.at-b.at||a.order-b.order);
 for(const event of events){const row=compactEl('tr');for(const text of [dateTime(event.at),event.text,event.detail])row.append(compactEl('td',text));table.append(row);}
 body.append(table);if(!events.length)body.append(compactEl('p','표시할 남은 임무 없음'));
 dialog.append(head,body);dialog.addEventListener('close',()=>dialog.remove());document.body.append(dialog);dialog.showModal();return dialog;
}
function openEfficiencySettings(){
 const snapshot=Model.normalize(JSON.parse(JSON.stringify(state))),source=Model.planFingerprint(snapshot);
 const dialog=compactEl('dialog','','speedup-popup efficiency-dialog'),head=compactEl('div','','speedup-popup-head'),body=compactEl('div','','speedup-popup-body stack');
 let worker=null,serial=0,saving=false,comparisonPopup=null;
 const currentPlan=typeof plan!=='undefined'&&plan?JSON.parse(JSON.stringify({...plan,finish:plan.meanFinish,masterCount:(plan.log||[]).reduce((n,m)=>n+(m.shortcutHours||0),0),gueseoCount:(plan.purchases||[]).reduce((n,g)=>n+g.qty,0)})):null;
 const close=compactButton('닫기',()=>dialog.close());head.append(compactEl('h2','귀서와 임달 효율 설정하기'),close);
 body.append(compactButton('진행 순서별 참조 예시',()=>RouteExamples.open(snapshot)));
 const form=compactEl('form','','stack');
 const guide=compactEl('section','','efficiency-guide');guide.append(compactEl('h3','계산 방식'));
 const steps=compactEl('ol');
 for(const [title,description]of [
  ['현재 조건 기준 일정 산정','보유 재료·수행서, 진행 중인 임무, 접속 가능 시간 반영 · 남은 임무의 수령 시각과 다음 시작 시각 계산'],
  ['귀서로 수행서 대기 단축','귀서 1장으로 수행서 2장 추가 확보 시 다음 수행서 대기 감소분만큼 전체 완료일 단축 폭 계산'],
  ['해당 일정 기준 임달 추가 효과 계산','임달 1개 = 임무 시간 1시간 단축 · 접속 시간 안 수령·다음 임무 시작으로 주기가 맞으면 이후 일정까지 연쇄되어 전체 완료일 단축 폭 증가 가능 · 수행서 대기 시 단축 효과 없음 가능'],
  ['최종 완료일 차이와 비용 비교','귀서 사용 계획에 임달 추가 시 전체 단축 시간과 사용 비용 비교 · 선택한 효율 기준 충족 계획 추천']
 ]){const item=compactEl('li');item.append(compactEl('strong',title),compactEl('p',description));steps.append(item);}
 guide.append(steps,compactEl('p','효율 기준: 개별 임무가 아닌 전체 임무 재료 확보 예정일 · 중간 임무만 단축되고 최종 완료일이 같으면 단축 효과 0시간','efficiency-guide-summary'));form.append(guide);
 function number(label,value,min,step){const box=compactEl('label',label,'field'),input=document.createElement('input');input.type='number';input.required=true;input.min=min;input.step=step;input.value=value;input.setAttribute('aria-label',label);box.append(input);form.append(box);return input;}
 const shopLabel=compactEl('label','','efficiency-shop'),shop=document.createElement('input');shop.type='checkbox';shop.checked=!!snapshot.gueseoShopPrice||!(snapshot.cashRatio>0&&snapshot.gueseoMarketPrice>0);shopLabel.append(shop,document.createTextNode('거상 상점가 적용하기'));
 const ratio=number('캐시 비율',snapshot.cashRatio||'',0.000001,'any');ratio.placeholder='예: 2.3';ratio.title='1만 원당 게임머니(억 단위) 입력 · 예: 2.3 = 2.3억';
 const market=number('귀서 가격',snapshot.gueseoMarketPrice||'',1,1);market.placeholder='예: 280000000';market.title='귀서 1장의 게임머니 가격';
 const quote=compactEl('p','','efficiency-quote'),marketRow=compactEl('div','','efficiency-market-row');marketRow.append(shopLabel,ratio.parentElement,market.parentElement,quote);form.append(marketRow);
 const formula=compactEl('section','','efficiency-formula');form.append(formula);
 const options=compactEl('div','','efficiency-options'),autoLabel=compactEl('label'),auto=document.createElement('input'),autoValue=compactEl('strong');auto.type='checkbox';auto.checked=snapshot.efficiencyMode==='gueseo'||!snapshot.cashRatio;autoLabel.append(auto,document.createTextNode('임달 효율을 귀서에 맞추기'));
 const manualLabel=compactEl('label'),manual=document.createElement('input');manual.type='checkbox';manual.checked=!auto.checked;manualLabel.append(manual,document.createTextNode('사용자 직접 설정'));options.append(autoLabel,autoValue,manualLabel);form.append(options);
 const hours=number('시간/개',Math.round(snapshot.masterEfficiencyHours),0,'1');hours.max='8760';hours.parentElement.classList.add('efficiency-hours');options.append(hours.parentElement);
 const explanation=compactEl('p','모든 단축 시간: 접속 대기와 이후 임무 일정 반영 전체 임무 재료 확보 예정일 차이 · 임달: 귀서 사용 계획 대비 추가 단축 시간으로 비교 · 중간 임무만 단축되고 최종 완료일이 같으면 효과 0시간','hint');
 const pricing=compactEl('p','비용 비교 기준: 귀서 1장 = 전체 완료일 168시간 단축 · 임달: 10개 9,000원·낱개 1,000원, 9개 필요 시 10개 묶음 구매 · 자동 모드: 총사용량의 묶음·낱개 비용 반영 · 보유량 제외 추가 구매액 별도 표시','hint');
 const run=compactEl('button','미리보기','primary');run.type='submit';form.append(explanation,pricing,run);
 const message=compactEl('p','','hint');const actions=compactEl('div','','efficiency-actions');const priceNotice=compactEl('span','','hint');actions.append(run,priceNotice);form.append(actions);
 function update(){priceNotice.textContent=shop.checked?'상점가 기준 금액 계산':'입력한 캐시 비율·귀서 시세 기준 금액 계산';serial++;worker?.terminate();worker=null;comparisonPopup?.close();comparisonPopup=null;message.textContent='미리보기·닫기는 현재 설정 변경 없음';hours.readOnly=auto.checked;ratio.readOnly=market.readOnly=shop.checked;
  const r=Number(ratio.value),g=Number(market.value),valid=r>0&&Number.isFinite(r)&&g>0&&Number.isSafeInteger(g);
  if(!shop.checked&&!valid){quote.textContent='캐시 비율과 귀서 시세 입력 필요';autoValue.textContent='1개당 —시간';formula.replaceChildren(compactEl('strong','임달 효율 계산'),compactEl('p','캐시 비율·귀서 가격 입력 → 귀서의 시간당 비용 계산 → 같은 비용 효율이 되는 임달 단축 시간 계산'));return;}
  const unit=Completion.gueseoUnit({cashRatio:r,gueseoMarketPrice:g,gueseoShopPrice:shop.checked}),bound=Completion.hoursFromUnit(unit);
  quote.textContent=shop.checked?'귀서 1장 · 상점가 15,000원':'귀서 '+(g/1e8).toLocaleString('ko-KR',{maximumFractionDigits:8})+'억 게임머니 → 약 '+Math.round(unit).toLocaleString('ko-KR')+'원 / 장';
  autoValue.textContent='임달 효율 기준(1개당 평균 '+Math.ceil(bound)+'시간)';
  autoValue.title='묶음(10개 9,000원) 구매 시 개당 900원으로 더 저렴 · 효율 기준은 낱개가로 계산 · 실제 추천은 총구매 비용 기준 계산';
  const won=n=>n.toLocaleString('ko-KR',{maximumFractionDigits:2})+'원';
  const currentHours=Number(hours.value);
  const masterRateLine=currentHours>0?compactEl('p','임달 1,000원 ÷ '+currentHours+'시간(현재 설정) = 시간당 '+won(1000/currentHours),'efficiency-equation'):compactEl('p','임달 시간당 가치: 시간/개 입력 필요','efficiency-equation');
  formula.replaceChildren(compactEl('strong','임달 효율 계산 방식'),compactEl('p','귀서 '+won(unit)+' ÷ 168시간 = 시간당 '+won(unit/168),'efficiency-equation'),masterRateLine,compactEl('p','임달 낱개 1,000원 → '+Math.ceil(bound)+'시간 단축(올림)','efficiency-equation'),compactEl('p','묶음 10개 9,000원(개당 900원) 구매 시 더 저렴 · 효율 계산에는 반영 안 함','hint'),compactEl('p','168시간: 귀서 비용 비교 기준값 · 실제 전체 완료일 단축은 아래 미리보기에서 접속 일정 반영 계산','hint'));
  if(auto.checked)hours.value=String(Math.ceil(bound));
 }
 auto.onchange=()=>{manual.checked=!auto.checked;update();};manual.onchange=()=>{auto.checked=!manual.checked;update();};shop.onchange=update;ratio.oninput=market.oninput=hours.oninput=update;
 hours.onchange=()=>{if(hours.value!==''&&Number.isFinite(Number(hours.value)))hours.value=String(Math.round(Number(hours.value)));update();};
 const editMarket=()=>{if(shop.checked){shop.checked=false;update();}};ratio.onfocus=market.onfocus=editMarket;ratio.onclick=market.onclick=editMarket;
 const editHours=()=>{if(auto.checked){auto.checked=false;manual.checked=true;update();}};hours.onfocus=hours.onclick=editHours;
 form.onsubmit=e=>{e.preventDefault();if(saving||!form.reportValidity())return;
  const patch={gueseoShopPrice:shop.checked,cashRatio:shop.checked?snapshot.cashRatio:Number(ratio.value),gueseoMarketPrice:shop.checked?snapshot.gueseoMarketPrice:Number(market.value),efficiencyMode:auto.checked?'gueseo':'manual',masterEfficiencyHours:auto.checked?Completion.hoursFromUnit(Completion.gueseoUnit({cashRatio:Number(ratio.value),gueseoMarketPrice:Number(market.value),gueseoShopPrice:shop.checked})):Number(hours.value)};
  try{Model.validatePatch(patch);}catch(error){message.textContent=error.message;return;}
  worker?.terminate();comparisonPopup?.close();const id=++serial;message.textContent='네 가지 조건 전체 일정 계산 중…';const now=Date.now();worker=new Worker('comparison-worker.js');const active=worker;
  active.onerror=error=>{active.terminate();if(id===serial)message.textContent='계산 실패: '+error.message;};
  active.onmessage=event=>{if(id!==serial||!dialog.open||event.data.progress)return;active.terminate();if(event.data.error){message.textContent=event.data.error;return;}
   comparisonPopup=openEfficiencyPlanComparison({snapshot,source,patch,result:event.data.result,currentPlan,now,onApply:()=>dialog.close()});
   message.textContent='비교 창에서 일정 확인 후 원하는 조건 ‘이 조건 적용’ 클릭';
  };
  active.postMessage({previewSnapshot:!snapshot.canSainMission&&!snapshot.sainReadyPlan&&snapshot.activeMission?.phase!=='sain'&&snapshot.currentQty<300?snapshot:null,state:{...snapshot,...patch,sainReadyPlan:snapshot.sainReadyPlan||(!snapshot.canSainMission&&snapshot.activeMission?.phase!=='sain'&&snapshot.currentQty<300),speedupIntent:'both',planStartAt:new Date(now).toISOString()},now,holidays:HOLIDAYS});
 };
 body.append(form,message);dialog.append(head,body);dialog.addEventListener('cancel',e=>{if(saving)e.preventDefault();});dialog.addEventListener('close',()=>{serial++;worker?.terminate();comparisonPopup?.close();dialog.remove();});document.body.append(dialog);update();dialog.showModal();
}
