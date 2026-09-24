(function(root){
 'use strict';
 const elements=[['화','주작'],['수','현무'],['풍','백호'],['뇌','청룡']];
 // Independent, repeatable reference simulation. No user settings or save APIs.
 function trial(element,full,route,seed){
  const q=[0,0,0,0,0];if(full)q[element]=50;
  let random=seed>>>0,count=0,credited=false;
  const credit=()=>{q[element]+=10;credited=true;};
  if(route==='sain')credit();
  while(q.some(n=>n<50)){
   if(route==='middle'&&!credited&&q.reduce((sum,n)=>sum+Math.min(50,n),0)>=125)credit();
   if(q.every(n=>n>=50))break;
   if(q[4]<50){random^=random<<13;random^=random>>>17;random^=random<<5;q[4]+=2;q[Math.floor((random>>>0)/4294967296*5)]+=5;}
   else if(q[0]<50||q[1]<50){q[0]+=2;q[1]+=2;}
   else{q[2]+=2;q[3]+=2;}
   count++;
   if(count>250)throw Error('예시 계산 범위 초과');
  }
  return count;
 }
 function calculate(element=0,full=false,samples=20000){
  if(!Number.isInteger(element)||element<0||element>3||!Number.isInteger(samples)||samples<1)throw Error('예시 조건 확인 필요');
  const rows=['sam','sain','middle'].map(route=>{
   let total=0;for(let i=1;i<=samples;i++)total+=trial(element,full,route,Math.imul(i,2654435761));
   const sam=total/samples;return {route,sam,sain:60,total:sam+60,hours:(sam+60)*30};
  });
  return {element,full,samples,rows:rows.map(row=>({...row,savedMissions:rows[0].total-row.total,savedHours:rows[0].hours-row.hours}))};
 }
 const referenceCache=new Map();
 // 사용자 설정(user)이 있으면 그 접속 요일·시간과 임달 효율 기준으로, 없으면 고정 예시 시간(평일 18~22시·주말 14~22시)과 12시간 기준으로 계산한다. 재료는 항상 0개 가정.
 function reference(user=null){
  const M=typeof module!=='undefined'?require('./model'):root.Model,S=typeof module!=='undefined'?require('./schedule'):root.Schedule,C=typeof module!=='undefined'?require('./comparison'):root.Completion;
  const fixed={weekdayWindows:[{start:'18:00',end:'22:00'}],weekendWindows:[{start:'14:00',end:'22:00'}]};
  const login=user?{loginDays:user.loginDays,dayWindows:user.dayWindows,weekdayWindows:user.weekdayWindows,weekendWindows:user.weekendWindows,holidayWeekend:user.holidayWeekend===true}:fixed,efficiency=user?C.efficiencyHours(user):C.hoursFromUnit(15000);
  const cacheKey=JSON.stringify([login,efficiency]);if(referenceCache.has(cacheKey))return referenceCache.get(cacheKey);
  const origin=new Date(2026,8,21,18),base=M.normalize({canSainMission:true,craftElement:'fire',craftElementSelected:true,...login,accelerationMode:true});
  const counts=calculate(0,false).rows;
  function run(row,g=0,m=0,hours=0){
   const sam=Math.ceil(row.sam),s={...base,order:row.route==='sam'?'sam-first':'sain-first',gueseoTotal:g,masterBudget:m,efficiencyHours:hours};
   const plan=C.plan(s,sam,origin,{},S,m?29:0);
   return {route:row.route,missions:sam+60,days:plan.finish===null?null:(plan.finish-origin)/86400000,gueseo:plan.gueseoCount,master:plan.masterCount,efficiencyHours:s.efficiencyHours};
  }
  const routes=counts.map(row=>run(row)),gueseo=run(counts[1],57),both=run(counts[1],57,10000,efficiency);
  // 효율 기준을 넘는 임달 사용이 없으면, 기준을 1시간씩 낮춰 처음 나오는 임달 사용 계획(가장 효율 좋은 사용)을 참고용으로 따로 계산한다.
  let max=null;if(!both.master)for(let hours=Math.ceil(efficiency)-1;hours>=1&&!max;hours--){const next=run(counts[1],57,10000,hours);if(next.master>0)max=next;}
  const result={routes,gueseo,both,max,efficiency,login,custom:!!user};referenceCache.set(cacheKey,result);return result;
 }
 function loginText(login){
  const hour=t=>t.endsWith(':00')?t.slice(0,2):t,times=list=>list.map(w=>hour(w.start)+'~'+hour(w.end)+'시').join(', ');
  const same=i=>JSON.stringify(login.dayWindows?.[i]??null)===JSON.stringify(i===0||i===6?login.weekendWindows:login.weekdayWindows);
  const extra=(login.loginDays&&login.loginDays.length!==7)||(login.dayWindows&&[0,1,2,3,4,5,6].some(i=>!same(i)));
  return '평일 '+times(login.weekdayWindows)+' · 주말 '+times(login.weekendWindows)+(extra?' · 요일별 설정 반영':'');
 }
 function open(user=null){
  if(document.getElementById('routeExamples'))return;
  const el=(tag,text,cls)=>Object.assign(document.createElement(tag),{textContent:text||'',className:cls||''});
  const dialog=el('dialog','','speedup-popup route-examples'),head=el('div','','speedup-popup-head'),body=el('div','','speedup-popup-body stack');dialog.id='routeExamples';
  const close=el('button','닫기');close.type='button';close.onclick=()=>dialog.close();head.append(el('h2','진행 순서별 차이 비교'),close);
  const requirement=el('section','','route-requirement');requirement.append(el('strong','삼인검만 진행 시 귀서·임무의달인 미적용'),el('p','설계 목표: 사인검 최종 완성 · 귀서·임달은 삼인검 단독 단축이 아닌 사인검 전체 임무 재료 확보 단축 기준 계산'),el('p','적용 조건: 사인검 임무 가능 또는 사인검 준비 계획 있음'));body.append(requirement);
  const data=reference(user),names=['삼인검 먼저','사인검 먼저','삼인검을 절반쯤 하다가 사인검으로 전환'];
  body.append(el('p',(data.custom?'내 접속 시간 기준 · ':'예시 접속 시간 기준 · ')+loginText(data.login)+' · 재료 0개 가정','route-note'));
  function table(rows){const scroll=el('div','','comparison-scroll'),table=el('table','','stat-table'),thead=el('thead'),tr=el('tr');for(const text of ['대표 예시','전체 재료 확보까지','단축 효과'])tr.append(el('th',text));thead.append(tr);table.append(thead);const tbody=el('tbody');for(const values of rows){const row=el('tr');if(values.cls)row.className=values.cls;for(const text of values)row.append(el('td',text));tbody.append(row);}table.append(tbody);scroll.append(table);return scroll;}
  // 소요 기간은 올림, 단축 효과는 버림으로 표시해 효과를 부풀리지 않는다.
  const days=n=>n===null?'계산 불가':'약 '+Math.ceil(n)+'일',saving=(base,next)=>{if(base===null||next===null)return '계산 불가';const d=base-next;if(Math.abs(d)<.5)return '차이 없음';const n=Math.floor(d);return n<1?'1일 미만 단축':'약 '+n+'일 단축';};
  body.append(el('h3','진행 순서만 바꿔도'),table(data.routes.map((row,i)=>[names[i],days(row.days),i?saving(data.routes[0].days,row.days):'비교 기준'])));
  const benefit=el('section','','route-benefit');benefit.append(el('strong','사인검 잔여 석판 삼인검 제작 활용 가능'),el('p','사인검 우선 진행 시 삼인검 필요 임무 횟수 감소'),el('p','단, 해당 속성 석판 50개 이상 보유 시 이점 없음','hint'));body.append(benefit);
  const itemRows=[];
  if(data.both.master>0)itemRows.push(['귀서 '+data.gueseo.gueseo+'장 사용',days(data.gueseo.days),saving(data.routes[1].days,data.gueseo.days)],['귀서 '+data.both.gueseo+'장 + 임달 '+data.both.master+'개 사용',days(data.both.days),saving(data.routes[1].days,data.both.days)]);
  else{
   itemRows.push(['귀서 '+data.gueseo.gueseo+'장 사용 · 추천',days(data.gueseo.days),saving(data.routes[1].days,data.gueseo.days)]);
   const max=data.max,extra=max&&max.master>0&&max.days!==null&&data.gueseo.days!==null?data.gueseo.days-max.days:0;
   // 효과는 버림: 추가 단축 일수와 1개당 시간 모두 부풀리지 않는다.
   if(extra>0){const perMaster=Math.floor(extra*24/max.master*10)/10,row=['참고 · 귀서 '+max.gueseo+'장 + 임달 '+max.master+'개 사용 시',days(max.days),saving(data.gueseo.days,max.days).replace('단축','추가 단축')+' · 1개당 평균 '+perMaster+'시간 · 기준 '+data.efficiency+'시간 미달 · 미사용 추천'];row.cls='route-reference';itemRows.push(row);}
  }
  body.append(el('h3','귀서·임달 사용 시 추가 단축'),table(itemRows));
  if(data.both.master===0&&!(data.max&&data.max.master>0&&data.max.days<data.gueseo.days))body.append(el('p','이 접속 시간에서는 임달 추가 단축 효과 없음','hint'));
  body.append(el('p','임달: 1개당 평균 '+data.efficiency+'시간 이상 전체 일정 단축 시에만 사용','route-efficiency'),el('p','기본 12시간: 귀서 상점가 15,000원 ÷ 168시간 기준 · 임달 낱개 1,000원과 동일 비용 대비 단축 시간 · 기준 변경: 효율설정','hint'));
  body.append(el('p','아이템 예시 비교 대상: 사인검 먼저·아이템 미사용','hint'));
  body.append(el('p','재료 0개 시작 화 사인검 대표 예시 · 월요일 시작·일요일 수행서 2장 수급·삼인검 저격 우선 기준 · 접속과 수행서 대기 포함 · 준비 기간과 기타 제작 재료 수집 제외','hint'));
  body.append(el('p','실제 단축 효과: 본인 조건 전체 입력 후 확인 가능','route-note'));
  dialog.append(head,body);dialog.addEventListener('keydown',e=>{if(e.key==='Escape')e.stopPropagation();});dialog.addEventListener('close',()=>dialog.remove());document.body.append(dialog);dialog.showModal();
 }
 const api={calculate,trial,reference,open};if(typeof module!=='undefined')module.exports=api;else root.RouteExamples=api;
})(globalThis);
