(function(root){
  'use strict';
  const HOUR=3600000;
  const key=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  function minutes(text,end=false){if(end&&text==='24:00')return 1440;const m=/^(\d{2}):(\d{2})$/.exec(text||'');if(!m||+m[1]>23||+m[2]>59)throw Error('접속 시간 확인 필요');return +m[1]*60+ +m[2];}
  function validateWindows(list){if(!Array.isArray(list)||!list.length)throw Error('접속 시간 1개 이상 입력 필요');for(const w of list){const a=minutes(w.start),b=minutes(w.end,true);if(a===b)throw Error('시작·종료 시간 동일 불가 · 하루 종일은 00:00~24:00 입력');}return list;}
  // 공휴일 확인: 넘겨받은 목록이 없거나 비어 있어도 프로그램 공휴일 목록(holidays.js)으로 확인한다.
  function holidayOn(k,holidays){if(holidays&&holidays[k])return true;if(typeof module!=='undefined'){try{return !!require('./holidays')[k];}catch{return false;}}return typeof HOLIDAYS!=='undefined'&&!!HOLIDAYS[k];}
  function windowsOn(date,s,holidays={}){
    const d=new Date(date);d.setHours(0,0,0,0);const k=key(d);if(s.blockedDates?.includes(k))return [];
    // 공휴일 주말로 적용: 공휴일에는 요일과 상관없이 '주말 접속 시간' 사용(접속 불가 지정이 우선)
    const list=s.dayWindows?(s.holidayWeekend&&holidayOn(k,holidays)?s.weekendWindows:s.loginDays.includes(d.getDay())?s.dayWindows[d.getDay()]:[]):(d.getDay()===0||d.getDay()===6||holidays[k]?s.weekendWindows:s.weekdayWindows);
    return list.map(w=>{const a=minutes(w.start),b=minutes(w.end,true),from=new Date(d),to=new Date(d);from.setMinutes(a);to.setMinutes(b+(b<a?1440:0));const nextDay=new Date(d);nextDay.setDate(nextDay.getDate()+1);if(+to>=+nextDay&&s.blockedDates?.includes(key(nextDay)))to.setTime(+nextDay-1);return [+from,+to];}).sort((a,b)=>a[0]-b[0]);
  }
  function intervalsNear(t,s,holidays,days=4){const d=new Date(t);d.setDate(d.getDate()-1);let all=[];for(let i=0;i<days;i++){all.push(...windowsOn(d,s,holidays));d.setDate(d.getDate()+1);}all.sort((a,b)=>a[0]-b[0]);const merged=[];for(const w of all){const last=merged[merged.length-1];if(last&&w[0]<=last[1])last[1]=Math.max(last[1],w[1]);else merged.push(w.slice());}return merged;}
  function nextAvailable(t,s,holidays){
    for(let day=0;day<14+(s.blockedDates?.length||0)*7;day+=7){
      const start=new Date(t);start.setDate(start.getDate()+day);
      for(const [a,b]of intervalsNear(+start,s,holidays,10))if(t<=b)return Math.max(t,a);
    }throw Error('접속 가능 시간 없음 · 접속 요일·시간 확인 필요');
  }
  function collection(start,s,holidays){const ready=start+30*HOUR;let at=nextAvailable(ready,s,holidays);let short=0;for(const [a,b] of intervalsNear(start,s,holidays,5)){if(b>start&&b<ready&&ready-b<=s.thresholdHours*HOUR&&b<at){at=b;short=(ready-b)/HOUR;}}return {at,ready,shortcutHours:short};}
  function sunday(t){const d=new Date(t);d.setHours(0,0,0,0);d.setDate(d.getDate()+7-d.getDay());return +d;}
  function validate(s){
    if(!s.loginDays?.length)throw Error('접속 가능 요일 1개 이상 선택 필요');
    for(const day of s.loginDays)validateWindows(s.dayWindows[day]);
    if(s.holidayWeekend)try{validateWindows(s.weekendWindows);}catch(e){throw Error('공휴일 주말로 적용 시 주말 접속 시간 입력 필요 · '+e.message);}
  }
  function questAt(s,day,from,holidays={}){
    const d=new Date(from);d.setHours(0,0,0,0);
    for(let i=0;i<15+(s.blockedDates?.length||0)*7;i++,d.setDate(d.getDate()+1)){
      if(d.getDay()!==day)continue;
      const end=+d+24*HOUR;
      for(const [a,b] of intervalsNear(+d,s,holidays,3)){
        const t=Math.max(+from,+d,a);if(t<end&&t<=b)return t;
      }
    }
    return null;
  }
  function week(t){const d=new Date(t);d.setDate(d.getDate()-d.getDay());return key(d);}
  function ironFinish(s,now,holidays){
    if(s.hasSamSword||s.ironQty>=20)return +now;
    let left=Math.max(0,20-s.ironQty),t=+now;
    while(left--){let at=questAt(s,5,t,holidays);if(at===null)return null;
      if(s.ironClaimWeek===key(new Date(at))){at=questAt(s,5,at+24*HOUR,holidays);if(at===null)return null;}
      t=at+24*HOUR;if(left===0)return at;
    }
    return +now;
  }
  function makePlan(s,samCount,now,holidays={},actualOnly=false){
    if((s.accelerationMode||s.optimizeShortcuts)&&!actualOnly){const engine=typeof module!=='undefined'?require('./comparison.js'):globalThis.Completion;return engine.plan(s,samCount,now,holidays,api,s.accelerationMode?(s.masterBudget?29:0):s.useShortcuts?s.thresholdHours:0);}
    validate(s);
    const origin=+new Date(now),requested=+new Date(s.planStartAt||now);
    let t=Math.max(origin,Number.isFinite(requested)?requested:origin),balance=s.currentTickets;
    let quest=questAt(s,0,origin,holidays);
    if(quest!==null&&s.ticketClaimWeek===week(quest))quest=questAt(s,0,quest+24*HOUR,holidays);
    const extraAnchor=quest;
    const confirmedThisWeek=s.ticketClaimWeek===week(origin);let log=[];
    function addIncome(until){
      if(actualOnly)return;
      while(quest!==null&&quest<=until){const weeks=Math.round((new Date(key(new Date(quest))+'T12:00:00')-new Date(key(new Date(extraAnchor))+'T12:00:00'))/(7*24*HOUR));balance+=2+(s.gueseoEveryWeeks&&weeks%s.gueseoEveryWeeks===0?s.gueseoQty*2:0)+(s.ticketMode==='fixed'?s.ticketExtraPerWeek:0);quest=questAt(s,0,quest+24*HOUR,holidays);}
    }
    // Future Sain missions are conditional on readiness by the end of the Sam missions.
    let sainCount=!(s.canSainMission||s.activeMission?.phase==='sain'||(!actualOnly&&s.sainReadyPlan))?0:Math.ceil(Math.max(0,300-s.currentQty)/5);
    if(s.hasSamSword)samCount=0;
    if(s.activeMission){const a=s.activeMission,c=collection(+new Date(a.startedAt),s,holidays);t=nextAvailable(Math.max(t,c.at),s,holidays);log.push({...a,active:true,start:+new Date(a.startedAt),collect:t,shortcutHours:c.shortcutHours});if(a.phase==='sain')sainCount=Math.max(0,sainCount-1);}
    const phases=s.order==='sain-first'?[['sain',sainCount],['sam',samCount]]:[['sam',samCount],['sain',sainCount]];
    let blocked=false;
    outer:for(const [phase,count]of phases)for(let i=0;i<count;i++){
      
      t=nextAvailable(t,s,holidays);addIncome(t);
      const unlimitedAt=confirmedThisWeek?sunday(origin):origin;
      while(balance<1&&!(s.ticketUnlimited&&!actualOnly&&t>=unlimitedAt)){if(actualOnly){blocked=true;break outer;}const incomeAt=Math.min(quest??Infinity,s.ticketUnlimited?unlimitedAt:Infinity);if(!Number.isFinite(incomeAt)){blocked=true;break outer;}t=nextAvailable(incomeAt,s,holidays);addIncome(t);}if(balance>0)balance--;
      const c=collection(t,s,holidays);log.push({phase,start:t,collect:c.at,shortcutHours:c.shortcutHours,active:false,conditional:phase==='sain'&&!s.canSainMission});t=c.at;
    }
    const samLog=log.filter(m=>m.phase==='sam'),sainLog=log.filter(m=>m.phase==='sain');
    const samNeeded=samCount+(s.activeMission?.phase==='sam'?1:0),sainNeeded=sainCount+(s.activeMission?.phase==='sain'?1:0);
    const samMissionFinish=samLog.length>=samNeeded?(samLog.at(-1)?.collect??origin):null;
    const sainMissionFinish=sainLog.length>=sainNeeded?(sainLog.at(-1)?.collect??origin):null;
    const ironAt=origin;
    // 삼인검 임무 없이 사인검 보상 석판으로 부족분이 채워지면, 부족 개수만큼 사인검을 받은 날이 삼인검 재료 확보일이다.
    const need=s.hasSamSword?0:s.tabletQty.reduce((a,n)=>a+Math.max(0,50-n),0),rewardAt=need&&!samLog.length&&sainLog.length?sainLog[Math.min(need,sainLog.length)-1].collect:null;
    const samFinish=s.hasSamSword?origin:samMissionFinish===null||ironAt===null?null:Math.max(rewardAt??samMissionFinish,ironAt);
    const finish=samFinish===null||sainMissionFinish===null?null:Math.max(samFinish,sainMissionFinish);
    const masterCount=log.reduce((n,m)=>n+Math.ceil(m.shortcutHours),0);
    return {log,finish,samFinish,samMissionFinish,sainMissionFinish,ironFinish:ironAt,blocked,conditionalSain:!s.canSainMission&&s.activeMission?.phase!=='sain'&&s.sainReadyPlan&&s.currentQty<300,masterCount,masterNeeded:Math.max(0,masterCount-s.masterQty),shortcutHours:log.reduce((n,m)=>n+m.shortcutHours,0)};
  }
  function forecast(s,analysis,now,holidays={}){
    const counts=analysis.counts,cache=new Map();
    for(const n of counts)if(!cache.has(n))cache.set(n,makePlan(s,n,now,holidays));
    const meanCount=counts.reduce((a,b)=>a+b,0)/counts.length;
    const representative=makePlan(s,Math.ceil(meanCount),now,holidays);
    const mean=field=>s.optimizeShortcuts?representative[field]:counts.some(n=>cache.get(n)[field]===null)?null:counts.reduce((a,n)=>a+cache.get(n)[field],0)/counts.length;
    const finishes=counts.map(n=>cache.get(n).finish).sort((a,b)=>(a??Infinity)-(b??Infinity));
    const actual=makePlan(s,Math.ceil(meanCount),now,holidays,true);
    return {...representative,calendarLog:actual.log,calendarBlocked:actual.blocked,meanFinish:mean('finish'),meanSainFinish:mean('sainMissionFinish'),meanSamFinish:mean('samFinish'),p95Finish:finishes[Math.ceil(counts.length*.95)-1],meanSamCount:meanCount};
  }
  const api={key,minutes,validateWindows,validate,windowsOn,nextAvailable,collection,questAt,ironFinish,makePlan,forecast,HOUR};if(typeof module!=='undefined')module.exports=api;else root.Schedule=api;
})(typeof globalThis!=='undefined'?globalThis:this);
