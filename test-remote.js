window.addEventListener('DOMContentLoaded',async()=>{
 const body=document.getElementById('testRemote');
 const SECONDS_KEY='test_seconds_v1';
 const store=(fn,fallback)=>{try{return fn();}catch{return fallback;}};
 const getSeconds=()=>store(()=>{const n=Number(localStorage.getItem(SECONDS_KEY));return Number.isInteger(n)&&n>=1&&n<=3600?n:10;},10);
 const current=await calendarAPI.loadSettings();
 const title=document.createElement('h2');title.textContent='테스트용 현재 시간 변경';const hint=document.createElement('p');hint.textContent='테스트 시작 시 실제 데이터 복사 · 테스트 중 설정·보유량·임무·수령·메모 변경은 임시 복사본에만 반영 · ‘테스트 종료’ 또는 프로그램 종료 시 테스트 변경 폐기 후 원래 데이터로 복귀 · 운영체제 시계 변경 없음';hint.className='hint';
 const input=document.createElement('input');input.type='datetime-local';input.step='1';input.setAttribute('aria-label','테스트 현재 날짜와 시간');const d=new Date();input.value=[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')+'T'+[d.getHours(),d.getMinutes(),d.getSeconds()].map(x=>String(x).padStart(2,'0')).join(':');const error=document.createElement('p');error.className='error';
 const act=(text,fn)=>{const b=document.createElement('button');b.textContent=text;b.onclick=async()=>{try{error.textContent='';const result=await fn();if(result&&!result.ok)throw Error(result.error);if(result?.data?.note)error.textContent=result.data.note;}catch(e){error.textContent=e.message;}};return b;};
 // 몇 초 전으로 이동할지 정하는 설정. 이동은 아래 두 버튼으로 한다.
 const secondsRow=document.createElement('label');secondsRow.className='field';secondsRow.textContent='이동 시점 · 완료 몇 초 전 (1~3600초)';
 const secondsInput=document.createElement('input');secondsInput.type='number';secondsInput.min='1';secondsInput.max='3600';secondsInput.step='1';secondsInput.value=String(getSeconds());secondsInput.setAttribute('aria-label','몇 초 전으로 이동');secondsRow.append(secondsInput);
 const seconds=()=>{const n=Number(secondsInput.value);if(!Number.isInteger(n)||n<1||n>3600)throw Error('이동할 초 1~3600 정수 입력 필요');return n;};
 const start=current.activeMission?+new Date(current.activeMission.startedAt)+30*3600000:null;
 const quick=document.createElement('div');quick.className='test-time-grid';
 // 진행 중인 임무가 있으면 그 임무 기준, 없으면 계획대로 임무를 다 보낸 것으로 가정한 다음 임무 기준으로 이동한다.
 const mission=act('',()=>{const n=seconds();return start!==null?calendarAPI.setTestTime(new Date(start-n*1000).toISOString()):calendarAPI.prepareTestMission(n);});
 const master=act('',()=>calendarAPI.prepareTestMaster(seconds()));
 const refresh=()=>{const n=Number(secondsInput.value),valid=Number.isInteger(n)&&n>=1&&n<=3600,shown=valid?n:'N';
  mission.textContent='임무 완료 '+shown+'초 전';master.textContent='다음 임달 사용 '+shown+'초 전';
  mission.disabled=!valid;master.disabled=!valid||!current.planSnapshot?.log.some(m=>m.shortcutHours>0&&m.collect-n*1000>Date.now());
  if(valid)store(()=>localStorage.setItem(SECONDS_KEY,String(n)));};
 secondsInput.oninput=refresh;refresh();quick.append(mission,master);
 const grid=document.createElement('div');grid.className='test-time-grid';
 for(const [name,hours]of [['1시간 이전',-1],['1시간 이후',1],['24시간 이전',-24],['24시간 이후',24]])grid.append(act(name,()=>calendarAPI.setTestTime(new Date(Date.now()+hours*3600000).toISOString())));
 const footer=document.createElement('div');footer.className='test-time-grid';footer.append(act('테스트 종료',async()=>{const r=await calendarAPI.setTestTime(null);if(r&&r.ok)window.close();return r;}),act('닫기',()=>window.close()));
 const simulation=document.createElement('p');simulation.className='hint';simulation.textContent='임달 테스트: 앞선 임무·수행서·귀서 사용 처리 후 필요한 임달 준비 상태로 이동 · 이미 사용한 임달 다음 예정으로 이동 · 테스트 결과는 ‘테스트 종료’ 전까지 누적 · 삼인검 보상은 부족 재료 수령 가정 · 실제 데이터 미반영';
 // 메인 화면의 같은 버튼을 대신 눌러준다.
 const press=document.createElement('div');press.className='test-time-grid';press.append(act('수령',()=>calendarAPI.pressFromRemote('receive')),act('임달 수령',()=>calendarAPI.pressFromRemote('master')));
 body.append(title,hint,press,secondsRow,quick,input,act('선택한 시간 적용',()=>{if(!input.value)throw Error('날짜와 시간 입력 필요');return calendarAPI.setTestTime(new Date(input.value).toISOString());}),grid,simulation,footer,error);
});
