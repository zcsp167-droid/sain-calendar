const Forms=(()=>{
 const days=['일','월','화','수','목','금','토'];
 const el=(tag,props={})=>Object.assign(document.createElement(tag),props);
 function render(host,group,state){
  host.replaceChildren();const controls={},s=Model.normalize(state);
  let target=host;
  function field(key,title,type='number',options){
   const label=el('label',{className:'field',textContent:title});let input;
   if(type==='select'){input=el('select');for(const [value,text]of options)input.append(el('option',{value:String(value),textContent:text}));}
   else input=el('input',{type});
   input.dataset.field=key;if(type==='number'){input.min='0';input.max='100000';input.step='1';}
   if(type==='checkbox'){label.className='switch';input.checked=!!s[key];}else input.value=String(s[key]??'');
   label.append(input);target.append(label);controls[key]=input;return input;
  }
  const num=(key,title,min=0,max=100000)=>{const x=field(key,title);x.min=min;x.max=max;return x;};
  const select=(key,title,options)=>field(key,title,'select',options);
  const bool=(key,title)=>cards(key,title,[[true,'가능'],[false,'불가능']]);
  // 드롭다운 대신 한 줄 카드로 고르게 한다. 열고 찾고 다시 누르는 3동작이 1동작이 된다.
  let cardSeq=0;
  function cards(key,title,options){
   const wrap=el('div',{className:'stack tight'});
   if(title)wrap.append(el('div',{className:'field-title',textContent:title}));
   const row=el('div',{className:'choice-row'});wrap.append(row);target.append(wrap);
   const name='cards'+(cardSeq++)+'-'+key,inputs=[];
   for(const [value,text]of options){
    const label=el('label',{className:'choice-card compact'}),input=el('input',{type:'radio',name});
    input.value=String(value);input.dataset.field=key;label.append(input,el('strong',{textContent:text}));row.append(label);inputs.push(input);
   }
   const api={type:'cards',element:wrap,
    get value(){return inputs.find(x=>x.checked)?.value??'';},
    set value(v){for(const x of inputs)x.checked=x.value===String(v);},
    set onchange(fn){for(const x of inputs)x.onchange=fn;},
    addEventListener(ev,fn){for(const x of inputs)x.addEventListener(ev,fn);}};
   api.value=s[key]??'';controls[key]=api;return api;
  }
  let get;
  if(group==='materials'){
   const section=(title,hint)=>{const box=el('div',{className:'form-group'});box.append(el('div',{className:'form-group-title',textContent:title}));if(hint)box.append(el('p',{className:'hint',textContent:hint}));host.append(box);return box;};
   const counter=(parent,key,title,value,max=100000)=>{const label=el('label',{className:'field',textContent:title});const input=el('input',{type:'number',min:'0',max:String(max),step:'1',value:String(value)});input.dataset.field=key;controls[key]=input;label.append(input);parent.append(label);return input;};
   if(!s.hasSamSword){
    const box=section('석판','종류별 보유량과 미개봉 석판 상자 개수 입력');
    const grid=el('div',{className:'count-grid cols-6'});box.append(grid);
    Model.names.forEach((name,i)=>counter(grid,'tablet'+i,name,s.tabletQty[i]));
    counter(grid,'boxQty','석판 상자',s.boxQty);
   }
   const shards=section('X옥 조각 · 속성별 · 각 목표 300개','현재 제작 속성이 아니어도 보유분 함께 입력');
   const shardGrid=el('div',{className:'count-grid cols-5'});shards.append(shardGrid);
   Model.shardNames.forEach((name,i)=>counter(shardGrid,'shard'+i,name,s.shardQty[i],300));
   const rest=section('그 밖의 보유량');
   const restGrid=el('div',{className:'form-grid-2'});rest.append(restGrid);
   target=restGrid;
   if(!s.hasSamSword)num('ironQty','철제검 조각');
   num('currentTickets','2차특수임무수행서');
   target=host;
  }else if(group==='connection'){
   const enabled=new Set(s.loginDays),schedule=structuredClone(s.dayWindows);
   const baseWeek=structuredClone(s.weekdayWindows),baseEnd=structuredClone(s.weekendWindows);
   const overrides=new Set(Array.from({length:7},(_,i)=>i).filter(i=>JSON.stringify(schedule[i])!==JSON.stringify(i===0||i===6?baseEnd:baseWeek)));
   const picks=el('div',{className:'day-picks'});host.append(picks);
   days.forEach((day,i)=>{const label=el('label',{className:'day-choice',textContent:day}),input=el('input',{type:'checkbox',checked:enabled.has(i)});input.dataset.day=i;input.onchange=()=>input.checked?enabled.add(i):enabled.delete(i);label.prepend(input);picks.append(label);});
   // 공휴일 설정: 요일 칸과 같은 모양의 2택1(같은 묶음) · 기본 '적용 안 함'
   const holidayRow=el('div',{className:'day-picks holiday-picks'}),holidayInputs=[],holidayName='holidayWeekend'+(cardSeq++);holidayRow.append(el('strong',{textContent:'공휴일 설정'}));
   for(const [value,text]of [[false,'적용 안 함'],[true,'주말로 적용']]){const label=el('label',{className:'day-choice',textContent:text}),input=el('input',{type:'radio',name:holidayName,checked:s.holidayWeekend===value});input.value=String(value);input.dataset.field='holidayWeekend';label.prepend(input);holidayRow.append(label);holidayInputs.push(input);}
   host.append(holidayRow,el('p',{className:'hint',textContent:'예: 월요일 공휴일 → 적용 안 함 시 평일 접속 시간 · 주말로 적용 시 주말 접속 시간 · 접속 불가 지정 우선'}));
   const holidayOn=()=>holidayInputs[1].checked;
   function windowsEditor(parent,title,list,id){
    const box=el('div',{className:'stack'});parent.append(box);
    function paint(){box.replaceChildren();const head=el('div',{className:'row spread'}),add=el('button',{textContent:'+ 시간 추가',type:'button'});head.append(el('strong',{textContent:title}),add);box.append(head);
     list.forEach((w,j)=>{const row=el('div',{className:'row'});for(const side of ['start','end']){const pair=el('div',{className:'split-time'}),parts=w[side].split(':');const inputs=parts.map((value,index)=>{const inp=el('input',{value,type:'text',inputMode:'numeric',maxLength:2});inp.dataset.group=id;inp.dataset.side=side;inp.dataset.part=index?'minute':'hour';inp.setAttribute('aria-label',title+' '+(j+1)+' '+(side==='start'?'시작':'종료')+' '+(index?'분':'시'));inp.oninput=()=>{inp.value=inp.value.replace(/[^0-9]/g,'').slice(0,2);w[side]=inputs.some(x=>!x.value)?'':inputs.map(x=>x.value.padStart(2,'0')).join(':');};inp.onblur=()=>{if(inp.value)inp.value=inp.value.padStart(2,'0');else w[side]='';};return inp;});pair.append(inputs[0],el('span',{textContent:':'}),inputs[1]);row.append(pair);if(side==='start')row.append(el('span',{textContent:'~'}));}const del=el('button',{textContent:'×',type:'button'});del.onclick=()=>{list.splice(j,1);paint();};row.append(del);box.append(row);});add.onclick=()=>{list.push({start:'12:00',end:'13:00'});paint();};
    }paint();
   }
   windowsEditor(host,'평일 접속 시간',baseWeek,'weekday');windowsEditor(host,'주말 접속 시간',baseEnd,'weekend');
   const detail=el('details'),summary=el('summary',{textContent:'요일별로 따로 설정'}),body=el('div',{className:'stack'});detail.append(summary,body);host.append(detail);
   if(overrides.size)summary.textContent+=' · '+[...overrides].map(i=>days[i]).join(', ');
   days.forEach((day,i)=>{const label=el('label',{className:'switch',textContent:day+'요일 개별 시간 사용'}),check=el('input',{type:'checkbox',checked:overrides.has(i)}),box=el('div',{className:'stack'});check.dataset.override=i;label.prepend(check);body.append(label,box);box.hidden=!check.checked;windowsEditor(box,day+'요일',schedule[i],'day'+i);check.onchange=()=>{check.checked?overrides.add(i):overrides.delete(i);box.hidden=!check.checked;};});
   get=()=>{if([...enabled].some(i=>i>0&&i<6&&!overrides.has(i)))Schedule.validateWindows(baseWeek);if([...enabled].some(i=>(i===0||i===6)&&!overrides.has(i))||holidayOn())Schedule.validateWindows(baseEnd);
    const dayWindows=Object.fromEntries(days.map((_,i)=>[i,structuredClone(overrides.has(i)?schedule[i]:i===0||i===6?baseEnd:baseWeek)]));
    const patch={loginDays:[...enabled].sort(),dayWindows,weekdayWindows:baseWeek,weekendWindows:baseEnd,holidayWeekend:holidayOn()};Schedule.validate({...s,...patch});return patch;};
  }else if(group==='shortcuts'||group==='acceleration'){
   return SpeedupForm.render(host,state);
  }else if(group==='notifications'){
   return NoticeForm.render(host,s,el,()=>field('startAtLogin','컴퓨터를 켤 때 자동 실행','checkbox'));
  }else if(group==='element'){
   cards('craftElement','진행할 사인검 속성',[['fire','화·홍옥'],['water','수·청옥'],['wind','풍·녹주석'],['thunder','뇌·황옥'],['earth','토·흑요석']]).value=s.craftElementSelected?s.craftElement:'';
  }else if(group==='readiness'){
   cards('hasSamSword','삼인검 또는 석판 5종 각 50개 보유',[[false,'미보유'],[true,'보유']]);
   const available=bool('canSainMission','사인검 임무');
   const element=cards('craftElement','진행할 사인검 속성',[['fire','화·홍옥'],['water','수·청옥'],['wind','풍·녹주석'],['thunder','뇌·황옥'],['earth','토·흑요석']]);
   element.value=s.craftElementSelected?s.craftElement:'';
   const update=()=>element.element.hidden=available.value!=='true';available.onchange=update;update();
  }else if(group==='strategy'){
   select('strategy','삼인검 전략',[['targeted','저격 우선'],['optimal','평균 횟수 최소화']]);
  }
  return ()=>{
   if(get)return get();const patch={};
   for(const [key,input]of Object.entries(controls)){
    if(input.type==='number'){
     // 어느 칸이 틀렸는지 칸 이름과 허용 범위를 함께 표시
     if(input.value.trim()===''||!Number.isInteger(Number(input.value))||Number(input.value)<Number(input.min)||Number(input.value)>Number(input.max)){const name=input.closest?.('label')?.firstChild?.textContent?.trim()||'수량';throw Error(name+' · '+input.min+'~'+Number(input.max).toLocaleString('ko-KR')+' 정수 입력 필요');}
     if(!key.startsWith('tablet')&&!key.startsWith('shard'))patch[key]=Number(input.value);
    }else patch[key]=input.type==='checkbox'?input.checked:['true','false'].includes(input.value)?input.value==='true':input.value;
   }
   if(controls.tablet0)patch.tabletQty=Model.names.map((_,i)=>Number(controls['tablet'+i].value));
   if(controls.shard0)patch.shardQty=Model.shardNames.map((_,i)=>Number(controls['shard'+i].value));
   if(group==='shortcuts'&&!patch.useShortcuts)patch.thresholdHours=0;
   if(group==='readiness'&&!patch.canSainMission)delete patch.craftElement;if('craftElement' in patch){if(!patch.craftElement)throw Error('진행 속성 선택 필요');patch.craftElementSelected=true;}Model.validatePatch(patch);return patch;
  };
 }
 return {render,days};
})();
// 알림 설정 표 · 방식 3택1(끔 = 프로그램 화면 표시만 · 팝업 · 소리) · 소리 칸은 소리 선택 시에만 입력
const NoticeForm=(()=>{
 const rows=[['mission','보상 수령·임무 수행'],['ticket','일요일 수행서 퀘스트'],['iron','금요일 철제검 퀘스트'],['note','개인 일정']];
 const modes=[['off','끔'],['popup','팝업'],['sound','소리']];
 const noteModes=[['popup','팝업'],['sound','팝업+소리']];
 let seq=0;
 function volumeSlider(el,getId,initial,ariaLabel){
  const wrap=el('label',{className:'notice-volume'}),icon=el('span',{className:'notice-volume-icon',textContent:'🔊'}),
   input=el('input',{type:'range',min:'0',max:'100',step:'1',value:String(initial)}),value=el('span',{className:'notice-volume-value',textContent:initial+'%'});
  input.setAttribute('aria-label',ariaLabel);let dragging=false;
  input.addEventListener('pointerdown',async()=>{dragging=true;const id=getId();if(!id)return;try{await window.calendarAPI.previewSoundStart(id,Number(input.value)/100);}catch{}});
  input.addEventListener('input',()=>{value.textContent=input.value+'%';if(dragging)window.calendarAPI.setSoundVolume(Number(input.value)/100);});
  const endDrag=()=>{dragging=false;};input.addEventListener('pointerup',endDrag);input.addEventListener('pointercancel',endDrag);
  wrap.append(icon,input,value);return {wrap,input};
 }
 function render(host,s,el,extra){
  const draft=structuredClone(s.notice),inputs={},name='notice'+(seq++);let list={builtin:Model.soundNames,user:s.userSounds.map(u=>({...u,missing:false}))},playing='';
  const master=volumeSlider(el,()=>Model.soundNames[0],s.masterVolume,'음량조절 · 전체'),masterInput=master.input;
  const table=el('table',{className:'notice-table'}),head=el('tr');for(const t of ['알림','방식','소리','재생 시간','반복 간격','반복 종료'])head.append(el('th',{textContent:t}));
  const volTh=el('th'),volHead=el('div',{className:'notice-vol-head'});volHead.append(el('span',{textContent:'볼륨'}),el('strong',{textContent:'전체'}),master.wrap);volTh.append(volHead);head.append(volTh);table.append(head);
  const previewButton=(getId,getVolume)=>{const b=el('button',{type:'button',className:'notice-play',textContent:'▶'});b.title='미리 듣기';b.onclick=async()=>{const id=getId();if(!id)return;const volume=(getVolume||(()=>(Number(masterInput.value)||0)/100))();b.disabled=true;try{const r=await window.calendarAPI.previewSound(id,volume);if(!r.ok)throw Error(r.error);status.textContent=r.data.fallback?'소리 파일 없음 · 기본 소리(딩동)로 대체 재생 · 다시 추가 필요':'';}catch(e){status.textContent=e.message;}finally{b.disabled=false;}};b.dataset.getter='1';b.getId=getId;return b;};
  function options(select,value){select.replaceChildren();for(const id of list.builtin)select.append(el('option',{value:id,textContent:Model.soundLabels[id]||id}));for(const u of list.user)select.append(el('option',{value:u.id,textContent:u.name+(u.missing?' · 파일 없음':'')}));if(![...select.options].some(o=>o.value===value))select.append(el('option',{value,textContent:'목록에 없는 소리 · 다시 선택 필요'}));select.value=value;}
  for(const [kind,title]of rows){
   if(kind==='iron'&&s.hasSamSword)continue;
   const tr=el('tr'),n=draft[kind],modeCell=el('td'),group=el('div',{className:'notice-modes'});
   const label=el('td');label.append(el('strong',{textContent:title}));if(kind==='note')label.append(el('small',{className:'hint',textContent:'새 일정 기본값 · 소리 설정 공통'}));
   for(const [value,text]of kind==='note'?noteModes:modes){const l=el('label',{className:'notice-mode'}),r=el('input',{type:'radio',name:name+'-'+kind,value,checked:n.mode===value});r.onchange=()=>{n.mode=value;paint();};l.append(r,el('span',{textContent:text}));group.append(l);}
   modeCell.append(group);
   const num=(key,unit,empty,max)=>{const fieldTitle=key==='seconds'?'재생 시간':key==='repeat'?'반복 간격':'반복 종료';const td=el('td'),cell=el('div',{className:'notice-num-cell'}),box=el('label',{className:'notice-num'}),i=el('input',{type:'text',inputMode:'numeric',maxLength:4,placeholder:empty,value:n[key]?String(n[key]):''});i.setAttribute('aria-label',title+' '+fieldTitle);i.oninput=()=>{i.value=i.value.replace(/[^0-9]/g,'').slice(0,4);reset.disabled=!i.value;};i.dataset.max=max;box.append(i,el('span',{textContent:unit}));const reset=el('button',{type:'button',className:'notice-num-reset',textContent:'기본',disabled:!i.value});reset.title=fieldTitle+' 기본값으로('+empty+')';reset.onclick=()=>{i.value='';reset.disabled=true;};cell.append(box,reset);td.append(cell);return [td,i];};
   const [secTd,sec]=num('seconds','초','1회',600),[repTd,rep]=num('repeat','분마다','안 함',1440),[endTd,end]=num('repeatEnd','분 후','안 함',1440);
   const select=el('select',{className:'notice-sound'});options(select,n.sound);select.onchange=()=>n.sound=select.value;
   const rowVol=volumeSlider(el,()=>select.value,n.volume,title+' 볼륨'),volInput=rowVol.input,volTd=el('td');volTd.append(rowVol.wrap);
   const soundCell=el('td'),soundInner=el('div',{className:'notice-sound-cell'});soundInner.append(select,previewButton(()=>select.value,()=>(Number(masterInput.value)||0)/100*(Number(volInput.value)||0)/100));soundCell.append(soundInner);
   tr.append(label,modeCell,soundCell,secTd,repTd,endTd,volTd);table.append(tr);inputs[kind]={select,sec,rep,end,vol:volInput,tr};
  }
  function paint(){for(const [kind,x]of Object.entries(inputs)){const on=kind==='note'||draft[kind].mode==='sound';for(const c of [x.select,x.sec,x.rep,x.end,x.vol,x.tr.querySelector('.notice-play')])c.disabled=!on;for(const btn of x.tr.querySelectorAll('.notice-num-reset')){const inp=btn.previousElementSibling.querySelector('input');btn.disabled=!on||!inp.value;}x.tr.classList.toggle('notice-off',!on);}}
  const wrap=el('div',{className:'notice-table-wrap'});wrap.append(table);host.append(wrap);paint();
  // 사용자 소리 목록
  const box=el('div',{className:'form-group'}),headRow=el('div',{className:'row spread'}),add=el('button',{type:'button',textContent:'소리 추가'}),userList=el('div',{className:'notice-user-sounds'}),status=el('p',{className:'hint'});
  headRow.append(el('div',{className:'form-group-title',textContent:'사용자 소리 · 추가 순서 표시'}),add);
  box.append(headRow,el('p',{className:'hint',textContent:'mp3 · wav · ogg · flac · 여러 개 선택 가능 · 사용자 데이터 폴더에 복사해 사용 · 원본 파일 삭제해도 유지'}),userList,status);host.append(box);
  function paintUser(){userList.replaceChildren();if(!list.user.length){userList.append(el('p',{className:'hint',textContent:'추가한 소리 없음 · 기본 소리 6개 사용 가능'}));}for(const u of list.user){const row=el('div',{className:'notice-user-row'}),del=el('button',{type:'button',textContent:'삭제'});row.append(el('span',{textContent:u.name+(u.missing?' · 소리 파일 없음 · 다시 추가 필요':'')}),previewButton(()=>u.id),del);del.onclick=async()=>{del.disabled=true;try{const r=await window.calendarAPI.removeSound(u.id);if(!r.ok)throw Error(r.error);list=r.data;const used=Object.values(draft).some(n=>n.sound===u.id);for(const k of Object.keys(draft))if(draft[k].sound===u.id)draft[k].sound=Model.soundNames[0];refresh();status.textContent=u.name+' 삭제 완료'+(used?' · 사용 중이던 알림은 기본 소리(딩동)로 변경':'');}catch(e){status.textContent=e.message;del.disabled=false;}};userList.append(row);}paintPlaying();}
  function refresh(){for(const [kind,x]of Object.entries(inputs))options(x.select,draft[kind].sound);paintUser();paint();}
  function paintPlaying(){for(const b of host.querySelectorAll('.notice-play')){const on=playing==='preview:'+b.getId();b.textContent=on?'■':'▶';b.title=on?'중지':'미리 듣기';}}
  add.onclick=async()=>{add.disabled=true;status.textContent='';try{const r=await window.calendarAPI.addSounds();if(!r.ok)throw Error(r.error);list=r.data;refresh();if(!r.cancelled)status.textContent='소리 추가 완료 · 표의 소리 칸에서 선택 가능';}catch(e){status.textContent=e.message;}finally{add.disabled=false;}};
  window.calendarAPI.soundList().then(r=>{if(r.ok){list=r.data;refresh();}});
  const off=window.calendarAPI.onSoundState(d=>{if(!host.isConnected){off();return;}playing=d.playing;paintPlaying();});
  for(const x of Object.values(inputs))x.select.addEventListener('change',paintPlaying);
  const auto=extra();host.append(el('p',{className:'hint',textContent:'끔: 프로그램 화면 표시만 · 팝업: 알림 1건당 1회 · 닫기로 확인 · 소리: 재생 시간·반복 간격·반복 종료 칸 옆 ‘기본’ 버튼으로 빈칸(기본값) 되돌리기 가능 · 재생 시간 미입력 시 1회 재생 · 반복 간격 미입력 시 반복 안 함 · 반복 종료 미입력 시 기능 수행 전까지 계속 반복 · 입력 시 첫 울림부터 해당 분 지나면 반복 중지(알림 자체는 유지) · 볼륨: 슬라이더 이동 시 해당 소리 바로 재생해 크기 확인 가능 · 알림별 0~100% · 전체 음량과 곱해져 최종 크기 결정(전체 50% · 알림 50% → 실제 25%) · 모든 방식 프로그램 화면 표시 포함 · 프로그램 실행 중에만 동작'}));
  const read=()=>{
   for(const [kind,x]of Object.entries(inputs)){
    for(const [key,i,max]of [['seconds',x.sec,600],['repeat',x.rep,1440],['repeatEnd',x.end,1440]]){const v=i.value.trim();if(v&&(!/^\d+$/.test(v)||+v<1||+v>max))throw Error('재생 시간 1~600초 · 반복 간격 1~1440분 · 반복 종료 1~1440분 정수 입력 필요 · 비워두면 1회 재생 · 반복 안 함 · 계속 반복');draft[kind][key]=v?+v:0;}
    const vv=x.vol.value.trim();if(!vv||!/^\d+$/.test(vv)||+vv>100)throw Error('볼륨 0~100 정수 입력 필요');draft[kind].volume=+vv;
   }
   const mv=masterInput.value.trim();if(!mv||!/^\d+$/.test(mv)||+mv>100)throw Error('전체 음량 0~100 정수 입력 필요');
   const patch={notice:structuredClone(draft),startAtLogin:auto.checked,masterVolume:+mv};Model.validatePatch(patch);return patch;
  };
  read.dispose=off;return read;
 }
 return {render};
})();
