let editingNote=null,dayDraft=null,dayBase=null,daySaving=false;
function noteAlarmModeGet(){return document.querySelector('input[name="noteAlarmModeRadio"]:checked')?.value||'popup';}
function noteAlarmModeSet(v){for(const r of document.querySelectorAll('input[name="noteAlarmModeRadio"]'))r.checked=r.value===v;}
function stageDayNotes(next){dayDraft.notes=Personal.validate(next);renderNotes();}
function closeDayEditor(){if(daySaving)return;$('dayModal').hidden=true;dayDraft=null;dayBase=null;resetNoteEditor();}
function localDateTime(t){const d=new Date(t);return `${Schedule.key(d)}T${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;}
async function loadPersonalNotes(){
 if(state.personalNotes){notes=Personal.validate(state.personalNotes);return;}
 notes=Personal.validate(notes||{});
 const r=await window.calendarAPI.savePersonalNotes(notes);if(!r.ok)throw Error(r.error);notes=r.data.personalNotes;localStorage.removeItem('personal_notes_v1');
}
async function persistNotes(next){const checked=Personal.validate(next),r=await window.calendarAPI.savePersonalNotes(checked);if(!r.ok)throw Error(r.error);notes=r.data.personalNotes;renderNotes();renderCalendar();}
function resetNoteEditor(){editingNote=null;$('noteTime').value='';noteAlarmModeSet(state?.notice?.note?.mode||'popup');$('noteText').value='';$('noteColor').value='#e6b566';$('noteAlarmField').hidden=true;$('noteEditorTitle').textContent='새 일정';$('addNote').textContent='추가';$('cancelNoteEdit').hidden=true;}
renderNotes=function(){
 $('notes').replaceChildren();
 for(const [i,n]of ((dayDraft?.notes||notes)[openedDay]||[]).entries()){
  const row=compactEl('div','','note-row'),text=compactEl('span',(n.time?n.time+' · ':'')+n.text);row.style.borderLeft='4px solid '+n.color;
  if(n.alarmAt)text.append(compactEl('small',' · 알림 '+dateTime(n.alarmAt)+(n.notifiedAt===n.alarmAt?' (알림 완료)':'')));
  const actions=compactEl('div','','buttonbar');let armed=false;
  const edit=compactButton('수정',()=>{editingNote=i;$('noteTime').value=n.time||(n.alarmAt?localDateTime(n.alarmAt).slice(11):'');noteAlarmModeSet(n.alarmMode||'popup');$('noteText').value=n.text;$('noteColor').value=n.color;$('noteAlarmField').hidden=!n.alarmAt;$('noteEditorTitle').textContent='일정 수정';$('addNote').textContent='수정 반영';$('cancelNoteEdit').hidden=false;});
  // 누르면 바로 저장되므로 삭제만 한 번 더 눌러 확인
  const del=compactButton('삭제',async()=>{
   if(!armed){armed=true;del.textContent='삭제 확인';return;}
   try{const next=structuredClone(dayDraft.notes);next[openedDay].splice(i,1);stageDayNotes(next);resetNoteEditor();await saveDayChanges(false);}catch(e){$('dayError').textContent=e.message;}
  });
  actions.append(edit,del);row.append(text,actions);$('notes').append(row);
 }
};
const originalOpenDay=openDay;openDay=function(day){
 const changed=openedDay!==day||$('dayModal').hidden;
 if(changed){dayBase={notes:structuredClone(notes),blocked:state.blockedDates.includes(day)};dayDraft={notes:structuredClone(notes),blocked:dayBase.blocked};}
 originalOpenDay(day);$('dayUnavailable').checked=dayDraft.blocked;if(changed)resetNoteEditor();
};
$('dayUnavailable').onchange=()=>{if(dayDraft){dayDraft.blocked=$('dayUnavailable').checked;return saveDayChanges(false);}};
// 이 날짜의 일정·접속 불가 변경 즉시 저장(창은 닫지 않음) · includeText = 입력칸에 남은 글도 추가 후 저장
async function saveDayChanges(includeText){
 if(daySaving||!dayDraft)return false;daySaving=true;$('dayError').textContent='';
 try{
  if(includeText&&$('noteText').value.trim()){await $('addNote').onclick();if($('dayError').textContent)return false;}
  const latest=Model.normalize(await calendarAPI.loadSettings()),patch={},expectedValues={};
  const changedNotes=JSON.stringify(dayDraft.notes[openedDay]||[])!==JSON.stringify(dayBase.notes[openedDay]||[]);
  if(changedNotes){if(JSON.stringify(latest.personalNotes?.[openedDay]||[])!==JSON.stringify(dayBase.notes[openedDay]||[]))throw Error('이 날짜 일정 변경됨 · 창 다시 열어 확인 필요');patch.personalNotes={...latest.personalNotes,[openedDay]:dayDraft.notes[openedDay]||[]};expectedValues.personalNotes=latest.personalNotes;}
  if(dayDraft.blocked!==dayBase.blocked){if(latest.blockedDates.includes(openedDay)!==dayBase.blocked)throw Error('접속 불가 설정 변경됨 · 창 다시 열어 확인 필요');const blocked=new Set(latest.blockedDates);dayDraft.blocked?blocked.add(openedDay):blocked.delete(openedDay);patch.blockedDates=[...blocked].sort();expectedValues.blockedDates=latest.blockedDates;}
  if(Object.keys(patch).length){const reply=await calendarAPI.saveSettings({...patch,expectedValues});if(!reply.ok)throw Error(reply.error);}
  dayBase={notes:{...dayBase.notes,[openedDay]:structuredClone(dayDraft.notes[openedDay]||[])},blocked:dayDraft.blocked};
  return true;
 }catch(e){$('dayError').textContent=e.message;return false;}finally{daySaving=false;}
}
async function applyDayChanges(){if(await saveDayChanges(true))closeDayEditor();}
// 닫을 때 확인: 입력칸에 쓰고 [추가]를 안 누른 글, 또는 저장 실패로 남은 변경
function hasUnsavedNoteChanges(){
 if(!dayDraft)return false;
 if($('noteText').value.trim())return true;
 const notesChanged=JSON.stringify(dayDraft.notes[openedDay]||[])!==JSON.stringify(dayBase.notes[openedDay]||[]);
 return notesChanged||dayDraft.blocked!==dayBase.blocked;
}
function requestCloseDayEditor(){if(hasUnsavedNoteChanges())$('unsavedNoteModal').hidden=false;else closeDayEditor();}
$('closeModal').onclick=requestCloseDayEditor;
$('unsavedApply').onclick=async()=>{$('unsavedNoteModal').hidden=true;await applyDayChanges();};
$('unsavedDiscard').onclick=()=>{$('unsavedNoteModal').hidden=true;closeDayEditor();};
$('unsavedCancel').onclick=()=>{$('unsavedNoteModal').hidden=true;};
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('dayModal').hidden&&$('unsavedNoteModal').hidden&&!document.querySelector('dialog[open]')){e.preventDefault();requestCloseDayEditor();}});
$('noteAlarmToggle').onclick=()=>{$('noteAlarmField').hidden=false;};
$('noteAlarmOff').onclick=()=>{$('noteAlarmField').hidden=true;};
$('cancelNoteEdit').onclick=resetNoteEditor;
$('addNote').onclick=async()=>{
 $('dayError').textContent='';$('addNote').disabled=true;
 try{const text=$('noteText').value.trim();if(!text)throw Error('일정 내용 입력 필요');const noteTime=$('noteTime').value;const parts=$('noteTime').nextElementSibling?.querySelectorAll('.split-time input');if(!noteTime&&parts&&[...parts].some(x=>x.value))throw Error('시 0~23, 분 0~59 입력 필요');const alarmWanted=!$('noteAlarmField').hidden;if(alarmWanted&&!noteTime)throw Error('알림 받을 일정 시간 입력 필요');const alarmAt=alarmWanted?openedDay+'T'+noteTime:'';const next=structuredClone(dayDraft.notes),list=next[openedDay]??=[];const old=editingNote===null?null:list[editingNote];const alarm=alarmAt?new Date(alarmAt).toISOString():'';const n={alarmMode:noteAlarmModeGet(),time:noteTime,id:old?.id||crypto.randomUUID(),text,color:$('noteColor').value,alarmAt:alarm,notifiedAt:old?.alarmAt===alarm?old.notifiedAt:''};if(editingNote===null)list.push(n);else list[editingNote]=n;stageDayNotes(next);resetNoteEditor();await saveDayChanges(false);}catch(e){$('dayError').textContent=e.message;}finally{$('addNote').disabled=false;}
};
$('backupBtn').onclick=()=>{$('backupStatus').textContent='';$('backupModal').hidden=false;};$('backupClose').onclick=()=>$('backupModal').hidden=true;
for(const [id,method]of [['exportBackup','exportBackup'],['importBackup','importBackup']])$(id).onclick=async()=>{
 $('exportBackup').disabled=$('importBackup').disabled=true;
 try{const r=await window.calendarAPI[method]();if(!r.ok)throw Error(r.error);$('backupStatus').textContent=r.cancelled?'취소됨':id==='exportBackup'?'백업 파일 저장 완료':'불러오기 완료 · 기존 내용 자동 백업 보관';if(id==='importBackup'&&!r.cancelled){$('dayModal').hidden=true;blockMode=false;informationCollapsed=false;applyView('calendar');}}
 catch(e){$('backupStatus').textContent=e.message;}finally{$('exportBackup').disabled=$('importBackup').disabled=false;}
};

function renderPersonalAlerts(){if(!state)return;let box=$('personalInlineAlerts');if(!box){box=compactEl('div','','personal-inline-alerts');box.id='personalInlineAlerts';document.querySelector('.topbar').after(box);}box.replaceChildren();if(soundIssueText)box.append(compactEl('div',soundIssueText,'row'));for(const item of Reminders.pending(state,new Date()))box.append(compactEl('div','🔔 '+item.text,'row'));for(const [day,list]of Object.entries(notes||{}))for(const n of list)if(n.alarmAt&&+new Date(n.alarmAt)<=Date.now()&&n.notifiedAt!==n.alarmAt){const line=compactEl('div','','row');line.append(compactEl('strong','🔔 '+day+' '+(n.time||'')+' · '+n.text),compactButton('확인',async()=>{const next=structuredClone(notes);next[day].find(x=>x.id===n.id).notifiedAt=n.alarmAt;await persistNotes(next);renderPersonalAlerts();}));box.append(line);}box.hidden=!box.childElementCount;}
setInterval(renderPersonalAlerts,1000);
