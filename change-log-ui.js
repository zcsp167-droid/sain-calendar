// 버튼은 마지막으로 변동사항 창을 연 뒤 새 기록이 생겼을 때만 깜빡인다. 기록별 읽음 표시는 창 안에서 따로 유지한다.
function changeLogSeen(){let seen=0;try{seen=Number(localStorage.getItem('changeLogSeen'))||0;}catch{}return seen>(state.changeLogThrough||0)?0:seen;}
function changeLogFresh(){return !!state.changeLogUnread&&(state.changeLogNewest||0)>changeLogSeen();}
// 버튼 안에 전체·안 읽음·읽음 건수 요약. 기록이 없으면 '변동사항'만 표시한다.
function changeLogLabel(){const c=state.changeLogCounts||{total:0,unreadCount:0};return c.total?'변동사항 · 전체 '+c.total+'건 · 안 읽음 '+c.unreadCount+'건 · 읽음 '+(c.total-c.unreadCount)+'건':'변동사항';}
function changeLogButton(){const b=compactButton(changeLogLabel(),openChangeLog);b.classList.add('change-log-button');b.classList.toggle('unread',changeLogFresh());b.title=changeLogFresh()?'새 변동사항 있음 · 클릭 시 확인':'누적 변동사항 보기';return b;}
function renderChangeLogButtons(){document.querySelectorAll('.change-log-button').forEach(b=>{b.textContent=changeLogLabel();b.classList.toggle('unread',changeLogFresh());b.title=changeLogFresh()?'새 변동사항 있음 · 클릭 시 확인':'누적 변동사항 보기';});}
async function openChangeLog(){
 if(document.getElementById('changeLogDialog'))return;
 try{localStorage.setItem('changeLogSeen',String(state.changeLogNewest||0));}catch{}renderChangeLogButtons();
 const dialog=compactEl('dialog','','speedup-popup change-log-dialog');dialog.id='changeLogDialog';const head=compactEl('div','','speedup-popup-head'),body=compactEl('div','','speedup-popup-body stack'),list=compactEl('div','','stack'),status=compactEl('p','기록 불러오는 중…','hint');
 const headerActions=compactEl('div','','row');let deleteArmed=false;
 const remove=compactButton('기록 삭제',async()=>{if(loading)return;if(!deleteArmed){deleteArmed=true;remove.textContent='전체 기록 삭제 확인';return;}loading=true;remove.disabled=true;more.disabled=true;try{const reply=await calendarAPI.clearChangeLog();if(!reply.ok)throw Error(reply.error);list.replaceChildren();cursor=undefined;total=0;unreadCount=0;status.textContent='기록 삭제 완료';more.hidden=true;}catch(e){status.textContent=e.message;}finally{loading=false;remove.disabled=false;more.disabled=false;deleteArmed=false;remove.textContent='기록 삭제';}});
 headerActions.append(remove,compactButton('닫기',()=>dialog.close()));head.append(compactEl('h2','변동사항'),headerActions);body.append(compactEl('p','안 읽은 기록: 강조색 표시 · 항목 펼치기 또는 ‘확인’ 클릭 시 읽음 처리 · 새 기록 발생 시 버튼 깜빡임, 창을 열면 깜빡임 중지','hint'),status,list);dialog.append(head,body);dialog.addEventListener('close',()=>dialog.remove());document.body.append(dialog);dialog.showModal();
 // 저장된 전체 기록 기준 건수. 읽음 처리·삭제 시 바로 갱신한다.
 let cursor,loading=false,total=0,unreadCount=0;const counts=()=>total?'전체 '+total+'건 · 안 읽음 '+unreadCount+'건 · 읽음 '+(total-unreadCount)+'건':'변동 기록 없음';const more=compactButton('이전 기록 더 보기',()=>loadPage(false));body.append(more);
 const date=t=>t==null?'예정일 없음':dateTime(t);
 async function loadPage(first){if(loading)return;loading=true;more.disabled=true;
  try{const reply=await calendarAPI.readChangeLog(cursor);if(!reply.ok)throw Error(reply.error);const page=reply.data;total=page.total||0;unreadCount=page.unreadCount||0;

   if(!dialog.open)return;
   for(const row of page.entries){const wrap=compactEl('div','','change-log-row'),details=compactEl('details','','change-log-record'),summary=compactEl('summary');
    details.classList.toggle('unread',!!row.unread);let marking=false;
    const markRead=async()=>{if(!row.unread||marking)return;marking=true;try{const reply=await calendarAPI.markChangeLogEntryRead(row.id);if(!reply.ok)throw Error(reply.error);row.unread=false;details.classList.remove('unread');check.hidden=true;unreadCount=Math.max(0,unreadCount-1);status.textContent=counts();}catch(e){status.textContent=e.message;}finally{marking=false;}};
    details.addEventListener('toggle',()=>{if(details.open)markRead();});
    const year=new Date(row.at).getFullYear(),shortDate=t=>{if(t==null)return '예정일 없음';const d=new Date(t);return (d.getFullYear()===year?'':d.getFullYear()+'년 ')+(d.getMonth()+1)+'월 '+d.getDate()+'일';};
    const dayNumber=t=>{const d=new Date(t);return Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())/86400000;};
    // 접힌 상태에서도 원인(바꾼 것) → 결과(날짜·사용량·추가 비용) → 이유 순서로 한눈에 보이게 한다.
    const plainValue=v=>String(v).replace(/sam-first|sain-first/g,x=>({'sam-first':'삼인검 먼저','sain-first':'사인검 먼저'})[x]);
    const first=row.changes[0],shortValue=v=>!/\n/.test(v)&&String(v).length<=20;
    const cause=!first?'남은 일정 재계산':first.label+(row.changes.length>1?' 외 '+(row.changes.length-1)+'건':shortValue(first.before)&&shortValue(first.after)?' · '+plainValue(first.before)+' → '+plainValue(first.after):' 변경');
    // 사인검 준비 전이면 날짜는 삼인검 재료 확보일 · 예전 기록은 변경 항목(사인검 준비 예정·사인검 임무 가능)으로 판단
    const turned=(label,value)=>row.changes.some(c=>c.label===label&&c.after===value),readyOf=(side,off,on)=>typeof row[side].ready==='boolean'?row[side].ready:side==='after'?!off:!on;
    const offNow=turned('사인검 준비 예정','꺼짐')||turned('사인검 임무 가능','꺼짐'),onNow=turned('사인검 준비 예정','켜짐')||turned('사인검 임무 가능','켜짐');
    const readyBefore=readyOf('before',offNow,onNow),readyAfter=readyOf('after',offNow,onNow);
    const dateOf=(ready,t)=>ready?shortDate(t):'사인검 준비 필요 (삼인검 재료 '+shortDate(t)+')';
    let diff=0,finish='완료 예상 '+dateOf(readyBefore,row.before.finish)+' → '+dateOf(readyAfter,row.after.finish);
    if(readyBefore&&readyAfter&&row.before.finish!=null&&row.after.finish!=null){diff=dayNumber(row.after.finish)-dayNumber(row.before.finish);finish+=diff?' ('+Math.abs(diff)+'일 '+(diff<0?'단축':'지연')+')':' (변동 없음)';}
    const dG=row.after.gueseo-row.before.gueseo,dM=row.after.master-row.before.master,C=typeof Completion!=='undefined'?Completion:null;
    const won=n=>'약 '+Math.round(Math.abs(n)).toLocaleString('ko-KR')+'원';
    const item=(name,unit,b,a,cost)=>{const d=a-b;return name+' '+b+'→'+a+unit+(d?' ('+Math.abs(d)+unit+' '+(d>0?'추가':'감소')+(C?' · '+won(cost)+(d<0?' 절감':''):'')+')':'');};
    const gCost=C?dG*C.gueseoUnit(state):0,mCost=C?C.price(0,row.after.master,state).master-C.price(0,row.before.master,state).master:0;
    // 사인검 준비 해제로 귀서·임달이 빠진 경우: 절감이 아니라 미사용으로 표시
    const droppedByReady=readyBefore&&!readyAfter;
    const items=droppedByReady?'귀서 '+row.before.gueseo+'→'+row.after.gueseo+'장 · 임달 '+row.before.master+'→'+row.after.master+'개 (사인검 준비 해제로 미사용)':item('귀서','장',row.before.gueseo,row.after.gueseo,gCost)+' · '+item('임달','개',row.before.master,row.after.master,mCost);
    const result=finish+' · '+items+(row.pending?' · 계산 중':'');
    const more=[dG>0&&'귀서',dM>0&&'임달'].filter(Boolean),less=[dG<0&&'귀서',dM<0&&'임달'].filter(Boolean);
    const why=droppedByReady?'사인검 준비 예정 해제 · 귀서·임달은 사인검 준비 시에만 사용':!readyBefore&&readyAfter?'사인검 준비 예정 · 전체 완료일 계산과 귀서·임달 사용 가능':diff<0&&more.length?'단축에 '+more.join('·')+' 추가 사용 효과 포함':diff>0&&less.length?'지연에 '+less.join('·')+' 사용 감소 영향 포함'+(dM<0&&C?' · 임달은 효율 기준(1개당 평균 '+C.efficiencyHours(state)+'시간) 미달분 미사용':''):diff&&(more.length||less.length)?'귀서·임달 사용량 변경 포함 결과':'';
    const lines=compactEl('div','','change-log-lines');lines.append(compactEl('strong',cause),compactEl('span',result));if(why)lines.append(compactEl('small',why,'hint'));
    // 가장 최근 기록에만: 변경 전 사용량 유지·효율 기준·다음 효율 단계 중 다시 선택
    if(first&&!list.children.length&&!row.pending&&state.onboarded&&state.planSnapshot&&typeof openUsageChooser==='function'&&typeof Completion!=='undefined'&&Completion.itemsAllowed(state)){const retry=compactButton('다른 사용량으로 비교',e=>{e?.preventDefault?.();e?.stopPropagation?.();dialog.close();openUsageChooser({draft:state,keep:{g:row.before.gueseo,m:row.before.master},keepTitle:'① 변경 전 사용량 유지',title:'최근 변동 · 귀서·임달 사용량 다시 선택',alwaysAsk:true}).catch(error=>{$('error').textContent=error.message;});});retry.classList.add('change-log-retry');lines.append(retry);}
    summary.append(lines,compactEl('span',date(row.at),'hint'));details.append(summary);
    const words={'sam-first':'삼인검 먼저','sain-first':'사인검 먼저'},plain=text=>String(text).replace(/sam-first|sain-first/g,x=>words[x]);
    const dateList=text=>text==='없음'?[]:String(text).split(', ').filter(x=>/^\d{4}-\d{2}-\d{2}$/.test(x));
    const ranges=list=>{const out=[];let start=null,prev=null;const n=x=>dayNumber(x+'T00:00:00'),label=x=>{const d=new Date(x+'T00:00:00');return (d.getFullYear()===year?'':d.getFullYear()+'년 ')+(d.getMonth()+1)+'월 '+d.getDate()+'일';},flush=()=>{if(start)out.push([start,prev]);};for(const x of [...list].sort()){if(start&&n(x)-n(prev)===1)prev=x;else{flush();start=prev=x;}}flush();return out.map(([a,b])=>(a===b?label(a):label(a)+' ~ '+label(b))+' ('+(n(b)-n(a)+1)+'일)').join(', ');};
    for(const change of row.changes){const item=compactEl('div','','change-log-diff');
     const before=dateList(change.before),after=dateList(change.after),blocked=change.label==='접속 불가일'&&(before.length||change.before==='없음')&&(after.length||change.after==='없음');
     if(blocked){const added=after.filter(x=>!before.includes(x)),removed=before.filter(x=>!after.includes(x));item.append(compactEl('strong',change.label));if(added.length)item.append(compactEl('pre','설정: '+ranges(added)));if(removed.length)item.append(compactEl('pre','해제: '+ranges(removed)));}
     else item.append(compactEl('strong',change.label),compactEl('pre',plain(change.before)+' → '+plain(change.after)));
     details.append(item);}
    const check=compactButton('확인',markRead);check.hidden=!row.unread;check.classList.add('change-log-mini');
    let armed=false;const del=compactButton('×',async()=>{if(loading)return;if(!armed){armed=true;del.textContent='삭제 확인';del.classList.add('armed');return;}loading=true;try{const reply=await calendarAPI.removeChangeLogEntry(row.id);if(!reply.ok)throw Error(reply.error);wrap.remove();total=Math.max(0,total-1);if(row.unread)unreadCount=Math.max(0,unreadCount-1);status.textContent=counts();}catch(e){status.textContent=e.message;armed=false;del.textContent='×';del.classList.remove('armed');}finally{loading=false;}});del.classList.add('change-log-mini');del.title='이 기록만 삭제';
    wrap.append(details,check,del);list.append(wrap);
   }
   cursor=page.entries.at(-1)?.id;status.textContent=counts();more.hidden=page.entries.length<50;
  }catch(e){status.textContent=e.message;}finally{loading=false;more.disabled=false;}
 }
 await loadPage(true);
}
