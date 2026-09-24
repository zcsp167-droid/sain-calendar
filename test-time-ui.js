window.addEventListener('DOMContentLoaded',()=>{
 const head=document.querySelector('.topbar .row');if(!head||!calendarAPI.setTestTime)return;
 const button=document.createElement('button');button.id='testTimeLauncher';button.hidden=true;button.textContent='테스트 시간';button.className='quiet';head.prepend(button);
 const label=document.createElement('div');label.className='test-clock-banner';label.hidden=!(calendarAPI.isTestSession?.()||TestClock.offset());document.querySelector('.topbar').after(label);
 // 실제 데이터로 돌아가는 것은 테스트 창(리모콘)의 '실제 시간으로 복귀' 버튼뿐이다. 띠를 눌러도 복귀하지 않고 테스트 창만 연다.
 const update=()=>{label.textContent='테스트 시간 적용 중 · '+new Date().toLocaleString('ko-KR')+' · 테스트 변경은 임시 · 눌러서 테스트 창 열기';};update();setInterval(update,1000);
 // 테스트 창은 앱 밖의 별도 작은 창(리모콘)으로 연다.
 button.onclick=()=>calendarAPI.openTestRemote();label.onclick=()=>calendarAPI.openTestRemote();
});
