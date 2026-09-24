(function(root){
 const M=typeof module!=='undefined'?require('./model'):root.Model,S=typeof module!=='undefined'?require('./schedule'):root.Schedule;
 function pending(s,now=new Date()){
  if(!s.onboarded||s.blockedDates?.includes(M.dateKey(now)))return [];const items=[],week=M.weekKey(now),time=+now;
  if(now.getDay()===0&&s.ticketClaimWeek!==week)items.push({kind:'ticket',id:'ticket-'+week,text:'일요일 2차특수임무수행서 퀘스트 완료 후 2장 수령 필요'});
  if(!s.hasSamSword&&s.ironQty<20&&now.getDay()===5&&s.ironClaimWeek!==M.questKey('iron',now))items.push({kind:'iron',id:'iron-'+week,text:'금요일 철제검 조각 퀘스트 완료 후 보상 수령 필요'});
  {
   let text,id;
   if(s.activeMission){const ready=+new Date(s.activeMission.startedAt)+30*S.HOUR;
    if(time>=ready){text='임무 보상 수령 가능 · 게임에서 수령 후 ‘수령하기’ 클릭';id='ready-'+s.activeMission.id;}
    else if(s.useShortcuts&&ready-time<=s.thresholdHours*S.HOUR&&S.nextAvailable(time,s,{})===time){text='임무의달인 사용 시 즉시 보상 수령 가능';id='short-'+s.activeMission.id;}
   }else if(M.nextPhase(s)&&!s.tabletReviewPending&&s.currentTickets>0&&S.nextAvailable(time,s,{})===time){text='임무 발송 가능 시간 · 게임에서 발송 후 ‘임무 보내기’ 클릭';id='start-'+s.planStartAt+'-'+M.nextPhase(s);}
   if(id)items.push({kind:'mission',id,text});
  }
  return items;
 }
 // 프로그램 화면 강조용: 처음 나타난 알림만 강조
 function due(item,last){const prev=last?.[item.kind];return !prev||prev.id!==item.id;}
 const titles={mission:'보상 수령·임무 수행 알림',ticket:'일요일 2차특수임무수행서 퀘스트',iron:'금요일 철제검 조각 퀘스트',note:'개인 일정'};
 // 팝업·소리 판단용 전체 목록. 개인 일정은 접속 불가 날짜와 무관하게 확인 전까지 유지되고, note는 저장 데이터를 직접 가리킨다.
 function active(s,now=new Date()){
  const list=pending(s,now).map(x=>({...x,title:titles[x.kind],mode:s.notice?.[x.kind]?.mode||'off'}));
  for(const [day,notes]of Object.entries(s.personalNotes||{}))for(const note of notes)if(note.alarmAt&&+new Date(note.alarmAt)<=+now&&note.notifiedAt!==note.alarmAt)list.push({kind:'note',id:'note-'+note.id+'-'+note.alarmAt,title:titles.note,text:day+(note.time?' '+note.time:'')+' · '+note.text,mode:note.alarmMode||'popup',note});
  return list;
 }
 const api={pending,due,active,titles};if(typeof module!=='undefined')module.exports=api;else root.Reminders=api;
})(globalThis);
