(function(root){
 'use strict';
 function validDate(x){return typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&Number.isFinite(+new Date(x+'T12:00:00'))&&new Date(x+'T12:00:00').getDate()===Number(x.slice(-2));}
 function validate(raw){
  if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('개인 일정 데이터 형식 확인 필요');
  const result={};let count=0;
  for(const [day,list]of Object.entries(raw)){
   if(!validDate(day)||!Array.isArray(list))throw Error('개인 일정 날짜 확인 필요');
   result[day]=list.map((item,i)=>{
    if(++count>10000)throw Error('개인 일정 10000개 초과 · 기존 일정 삭제 후 추가 가능');
    const n=typeof item==='string'?{text:item}:item;
    if(!n||typeof n.text!=='string'||!n.text.trim()||n.text.length>2000)throw Error('일정 내용 1~2000자 입력 필요');
    const color=n.color||'#e6b566';if(!/^#[0-9a-fA-F]{6}$/.test(color))throw Error('일정 색상 확인 필요');
    const alarmAt=n.alarmAt||'';if(alarmAt&&(!Number.isFinite(+new Date(alarmAt))||typeof alarmAt!=='string'))throw Error('알림 날짜·시간 확인 필요');
    const time=n.time||'';if(time&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))throw Error('일정 표시 시간 확인 필요');
    return {alarmMode:['popup','sound'].includes(n.alarmMode)?n.alarmMode:'popup',time,id:typeof n.id==='string'?n.id:day+'-'+i,text:n.text.trim(),color,alarmAt:alarmAt?new Date(alarmAt).toISOString():'',notifiedAt:n.notifiedAt===alarmAt?alarmAt:'',popupAt:n.popupAt===alarmAt?alarmAt:''};
   });
  }
  return result;
 }
 function due(raw,now=new Date()){for(const [day,list]of Object.entries(raw||{}))for(const note of list)if(note.alarmAt&&+new Date(note.alarmAt)<=+now&&note.notifiedAt!==note.alarmAt)return {day,note};return null;}
 const api={validate,validDate,due};if(typeof module!=='undefined')module.exports=api;else root.Personal=api;
})(globalThis);
