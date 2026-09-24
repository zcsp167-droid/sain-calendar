(function(root){
  'use strict';
  const names=['주작','현무','백호','청룡','기린'];
  const labels=['50% 이상~80% 미만','80% 이상~100% 미만','100% 이상'];
  const elements=['fire','water','wind','thunder','earth'];
  const shardNames=['홍옥','청옥','녹주석','황옥','흑요석'];
  const elementIndex=e=>{const i=elements.indexOf(e);return i<0?0:i;};
  const defaults={version:4,masterEfficiencyHours:12,efficiencyMode:"manual",gueseoShopPrice:true,minimizeToTray:false,cashRatio:0,gueseoMarketPrice:0,autoAdjustPlan:false,planSnapshot:null,gueseoRecords:[],gueseoSkippedWeeks:[],speedupReviewPending:false,gueseoStock:0,speedupIntent:"none",sainReadyPlan:false,accelerationMode:false,gueseoTotal:0,masterBudget:0,gueseoEveryWeeks:0,gueseoQty:1,optimizeShortcuts:false,craftBuyRecommended:[],craftHiddenQuests:[],craftElementSelected:false,wizardVersion:0,hasSamSword:false,canSainMission:false,useShortcuts:false,onboarded:false,strategy:'targeted',order:'sam-first',tabletQty:[0,0,0,0,0],currentQty:0,
    carryoverEnabled:false,carryoverRemaining:10,element:0,currentTickets:0,ticketUnlimited:false,ticketExtraPerWeek:0,
    ticketUpdatedAt:'',thresholdHours:3,weekdayWindows:[{start:'20:00',end:'24:00'}],weekendWindows:[{start:'11:00',end:'24:00'}],
    ironQty:0,ironPerQuest:1,masterQty:0,boxQty:0,shardQty:[0,0,0,0,0],ticketMode:'none',loginDays:[0,1,2,3,4,5,6],dayWindows:null,holidayWeekend:false,usageMode:'efficient',notice:null,userSounds:[],masterVolume:100,ticketClaimWeek:'',ironClaimWeek:'',tabletReviewPending:false,startAtLogin:false,planStartAt:'',activeMission:null,history:[]};
  const soundNames=['chime01_dingdong','chime02_beep3','chime03_rising','chime04_bell','chime05_double','chime06_soft'];
  const soundLabels={chime01_dingdong:'딩동',chime02_beep3:'삑삑삑',chime03_rising:'상승음',chime04_bell:'종소리',chime05_double:'두 번 울림',chime06_soft:'부드러운 소리'};
  const noticeKinds=['mission','ticket','iron','note'];
  const integer=(x,min=0,max=100000)=>Math.min(max,Math.max(min,Math.floor(Number(x)||0)));
  function normalize(raw={}){
    const efficiency=raw.masterEfficiencyHours;
    const s={...defaults,...raw};s.autoAdjustPlan=raw.autoAdjustPlan===true;s.planSnapshot=cleanSnapshot(raw.planSnapshot);s.gueseoRecords=Array.isArray(raw.gueseoRecords)?raw.gueseoRecords.filter(x=>x&&/^\d{4}-\d{2}-\d{2}$/.test(x.week)&&Number.isInteger(x.qty)&&x.qty>0).slice(-500):[];s.gueseoSkippedWeeks=Array.isArray(raw.gueseoSkippedWeeks)?raw.gueseoSkippedWeeks.filter(x=>/^\d{4}-\d{2}-\d{2}$/.test(x)):[];s.craftElement=['fire','water','wind','thunder','earth'].includes(raw.craftElement)?raw.craftElement:'fire';s.craftInventory=raw.craftInventory&&typeof raw.craftInventory==='object'&&!Array.isArray(raw.craftInventory)?{...raw.craftInventory}:{};
    s.craftBuyRecommended=Array.isArray(raw.craftBuyRecommended)?raw.craftBuyRecommended.filter(x=>['iron','dust','power','powder','redPowder','blackPowder','spirit_fire','spirit_water','spirit_wind','spirit_thunder','spirit_earth'].includes(x)):[];s.craftHiddenQuests=Array.isArray(raw.craftHiddenQuests)?raw.craftHiddenQuests.filter(x=>['ironFragment','questTicket'].includes(x)):[];
    s.speedupReviewPending=raw.speedupReviewPending===true;s.speedupIntent=['none','gueseo','master','both'].includes(raw.speedupIntent)?raw.speedupIntent:'none';s.sainReadyPlan=raw.sainReadyPlan===true;s.accelerationMode=raw.accelerationMode===true;s.gueseoTotal=integer(raw.gueseoTotal,0,100);s.masterBudget=integer(raw.masterBudget,0,1000);
    s.strategy=s.strategy==='optimal'?'optimal':'targeted';
    s.hasSamSword=raw.hasSamSword===true;
    s.canSainMission=typeof raw.canSainMission==='boolean'?raw.canSainMission:!!(s.hasSamSword||raw.order==='sain-first'||raw.activeMission?.phase==='sain');
    s.order=s.canSainMission?'sain-first':'sam-first';
    s.useShortcuts=typeof raw.useShortcuts==='boolean'?raw.useShortcuts:Number(raw.thresholdHours)>0;
    s.tabletQty=names.map((_,i)=>integer(raw.tabletQty?.[i]));
    // X옥 조각은 속성별로 보관한다. shardQty가 없는 옛 데이터는 당시 제작 속성 칸으로 옮긴다.
    const shardIndex=elementIndex(s.craftElement);
    if(Array.isArray(raw.shardQty))s.shardQty=elements.map((_,i)=>integer(raw.shardQty[i],0,300));
    else {s.shardQty=[0,0,0,0,0];s.shardQty[shardIndex]=integer(raw.currentQty,0,300);}
    s.currentQty=s.shardQty[shardIndex];
    s.element=integer(s.element,0,4);s.carryoverRemaining=integer(s.carryoverRemaining,0,10);
    s.currentTickets=integer(s.currentTickets);s.ticketExtraPerWeek=integer(s.ticketExtraPerWeek,0,100);
    s.ticketMode=['none','fixed','unlimited'].includes(raw.ticketMode)?raw.ticketMode:raw.ticketUnlimited?'unlimited':raw.ticketExtraPerWeek>0?'fixed':'none';
    s.gueseoEveryWeeks=integer(raw.gueseoEveryWeeks,0,52);s.gueseoQty=integer(raw.gueseoQty??1,1,100);s.optimizeShortcuts=raw.optimizeShortcuts===true;
    s.ticketUnlimited=s.ticketMode==='unlimited';if(s.ticketMode!=='fixed')s.ticketExtraPerWeek=0;
    s.ironQty=integer(raw.ironQty);s.ironPerQuest=1;s.masterQty=integer(raw.masterQty,-100000);s.boxQty=integer(raw.boxQty);s.gueseoStock=integer(raw.gueseoStock);
    s.loginDays=Array.isArray(raw.loginDays)?[...new Set(raw.loginDays.filter(n=>Number.isInteger(n)&&n>=0&&n<=6))]:[0,1,2,3,4,5,6];
    s.holidayWeekend=raw.holidayWeekend===true;
    // 귀서·임달 사용량 방식: efficient = 효율 기준으로 매번 재계산 · kept = 사용자가 고른 사용량 안에서만 재계산
    s.usageMode=raw.usageMode==='kept'?'kept':'efficient';
    s.dayWindows=Object.fromEntries(Array.from({length:7},(_,i)=>[i,(raw.dayWindows?.[i]||(i===0||i===6?s.weekendWindows:s.weekdayWindows)).map(w=>({start:w.start,end:w.end}))]));
    // 알림 방식: 끔(프로그램 표시만) · 팝업 · 소리. 예전 저장값(화면·꺼짐 → 끔, 팝업 체크 → 팝업)은 여기서 옮긴다.
    s.userSounds=Array.isArray(raw.userSounds)?raw.userSounds.filter(x=>x&&typeof x.id==='string'&&/^user-[a-z0-9-]{1,60}$/.test(x.id)&&typeof x.name==='string'&&typeof x.file==='string'&&/^[\w.-]{1,120}$/.test(x.file)).slice(0,200).map(x=>({id:x.id,name:x.name.slice(0,200),file:x.file})):[];
    const oldMode={mission:raw.missionNoticeMode==='popup'||(!raw.missionNoticeMode&&raw.notifyEnabled===true)?'popup':'off',ticket:raw.ticketReminderEnabled===true?'popup':'off',iron:raw.ironReminderEnabled===true?'popup':'off',note:'popup'};
    const noticeRaw=raw.notice&&typeof raw.notice==='object'?raw.notice:{};
    s.notice=Object.fromEntries(noticeKinds.map(k=>{const n=noticeRaw[k]&&typeof noticeRaw[k]==='object'?noticeRaw[k]:{};let mode=['off','popup','sound'].includes(n.mode)?n.mode:oldMode[k];if(k==='note'&&mode==='off')mode='popup';return [k,{mode,sound:typeof n.sound==='string'&&(soundNames.includes(n.sound)||/^user-[a-z0-9-]{1,60}$/.test(n.sound))?n.sound:soundNames[0],seconds:integer(n.seconds,0,600),repeat:integer(n.repeat,0,1440),repeatEnd:integer(n.repeatEnd,0,1440),volume:Number.isInteger(n.volume)&&n.volume>=0&&n.volume<=100?n.volume:100}];}));
    s.masterVolume=Number.isInteger(raw.masterVolume)&&raw.masterVolume>=0&&raw.masterVolume<=100?raw.masterVolume:100;
    for(const k of ['missionNoticeMode','missionNoticeInterval','ticketReminderEnabled','ticketReminderInterval','ironReminderEnabled','ironReminderInterval','notifyEnabled'])delete s[k];
    s.carryoverEnabled=false;s.carryoverRemaining=0;
    s.tabletReviewPending=raw.tabletReviewPending===true&&!s.hasSamSword;
    if(s.ironClaimWeek&&new Date(s.ironClaimWeek+'T12:00:00').getDay()===0){const d=new Date(s.ironClaimWeek+'T12:00:00');d.setDate(d.getDate()+5);s.ironClaimWeek=dateKey(d);}
    s.blockedDates=Array.isArray(raw.blockedDates)?[...new Set(raw.blockedDates.filter(x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)))].sort():[];
    s.reminderLast=raw.reminderLast&&typeof raw.reminderLast==='object'?{...raw.reminderLast}:{};
    s.masterEfficiencyHours=Number.isFinite(efficiency)&&efficiency>=0&&efficiency<=8760?efficiency:12;
    s.gueseoShopPrice=raw.gueseoShopPrice!==false;
    // 최소화 기본값: 작업표시줄(저장된 값이 있으면 그대로 유지)
    s.minimizeToTray=raw.minimizeToTray===true;
    s.cashRatio=Number.isFinite(raw.cashRatio)&&raw.cashRatio>0?raw.cashRatio:0;
    s.gueseoMarketPrice=Number.isSafeInteger(raw.gueseoMarketPrice)&&raw.gueseoMarketPrice>0?raw.gueseoMarketPrice:0;
    s.efficiencyMode=raw.efficiencyMode==='gueseo'?'gueseo':'manual';
    if(s.speedupIntent==='master')s.speedupIntent='none';
    s.thresholdHours=s.useShortcuts?Math.min(29,Math.max(1,Math.ceil(Number(s.thresholdHours)||3))):0;
    s.history=Array.isArray(s.history)?s.history.slice(-200):[];
    s.carryoverEnabled=s.carryoverEnabled===true;
    s.planStartAt=s.planStartAt||'';
    return s;
  }
  function applyCarryover(s){return s;}
  function samQuantity(s){
 if(s.hasSamSword)return [50,50,50,50,50];
 const qty=s.tabletQty.slice();
 // Only Sain-first forecasts can use future Sain rewards before remaining Sam missions.
 if(s.order==='sain-first'&&(s.canSainMission||s.activeMission?.phase==='sain')){
  const index=['fire','water','wind','thunder','earth'].indexOf(s.craftElement);
  if(index>=0)qty[index]+=Math.ceil(Math.max(0,300-s.currentQty)/5);
 }
 return qty;
}
  function dateKey(date){const d=new Date(date);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
  function weekKey(date=new Date()){const d=new Date(date);d.setDate(d.getDate()-d.getDay());return dateKey(d);}
  function questKey(kind,date=new Date()){const d=new Date(date),day=kind==='iron'?5:0;d.setDate(d.getDate()-(d.getDay()-day+7)%7);return dateKey(d);}
  function claim(raw,kind,now=new Date(),alreadyIncluded=false,total=2){
    const s=normalize(raw),week=questKey(kind,now);
    if(!['ticket','iron'].includes(kind))throw Error('퀘스트 종류 확인 필요');
    if(s[kind+'ClaimWeek']===week)throw Error('이번 주 수령 이미 기록됨 · 추가 획득분은 보유량 직접 수정');
    if(kind==='ticket'&&(!Number.isInteger(total)||total<2||total>100000||(!alreadyIncluded&&s.currentTickets+total>100000)))throw Error('기본 2장 포함 총 수량 2~100000장 범위 입력 필요');
    if(!alreadyIncluded){if(kind==='ticket')s.currentTickets+=total;else s.ironQty+=1;}
    s[kind+'ClaimWeek']=week;return s;
  }
  function noticeSummary(s){const words={off:'끔',popup:'팝업',sound:'소리'};return [['mission','임무'],['ticket','일요일'],...(s.hasSamSword?[]:[['iron','금요일']]),['note','개인 일정 기본']].map(([k,t])=>{const mode=s.notice?.[k]?.mode||'off';return t+' '+(k==='note'&&mode==='sound'?'팝업+소리':words[mode]);}).join(' · ');}
  function validatePatch(p){
    for(const field of ['craftBuyRecommended','craftHiddenQuests'])if(field in p&&(!Array.isArray(p[field])||p[field].length>20||p[field].some(x=>typeof x!=='string'||!(/^[a-zA-Z_]+$/.test(x)))))throw Error('재료 표시 설정 확인 필요');
    if('craftElementSelected' in p&&typeof p.craftElementSelected!=='boolean')throw Error('속성 선택 상태 오류 · 속성 재선택 필요');
    if('craftElement' in p&&!['fire','water','wind','thunder','earth'].includes(p.craftElement))throw Error('제작할 사인검 속성 선택 필요');
    if('craftInventory' in p){const x=p.craftInventory;if(!x||typeof x!=='object'||Array.isArray(x)||Object.keys(x).length>500||Object.entries(x).some(([k,v])=>!(/^[a-zA-Z][a-zA-Z0-9_]{0,60}$/.test(k))||!Number.isInteger(v)||v<0||v>10000000))throw Error('제작 재료 보유량 0~10000000 정수 입력 필요');}
    if('hasSamSword' in p&&typeof p.hasSamSword!=='boolean')throw Error('삼인검 보유 여부 확인 필요');

    if('blockedDates' in p&&(!Array.isArray(p.blockedDates)||p.blockedDates.length>3660||p.blockedDates.some(x=>typeof x!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(x)||!Number.isFinite(+new Date(x+'T12:00:00'))||dateKey(new Date(x+'T12:00:00'))!==x)))throw Error('접속 불가 날짜 확인 필요');
    for(const k of ['gueseoStock','currentQty','currentTickets','ironQty','masterQty','boxQty','ticketExtraPerWeek','ironPerQuest'])if(k in p){
      const max=k==='currentQty'?300:k.includes('Interval')?1440:k==='ironPerQuest'||k==='ticketExtraPerWeek'?100:100000;
      const min=k.includes('Interval')||k==='ironPerQuest'?1:k==='masterQty'?-100000:0;
      if(!Number.isInteger(p[k])||p[k]<min||p[k]>max)throw Error('수량 정수 입력 필요');
    }
    if('notice' in p){const x=p.notice;if(!x||typeof x!=='object'||noticeKinds.some(k=>{const n=x[k];return !n||!(k==='note'?['popup','sound']:['off','popup','sound']).includes(n.mode)||typeof n.sound!=='string'||!Number.isInteger(n.seconds)||n.seconds<0||n.seconds>600||!Number.isInteger(n.repeat)||n.repeat<0||n.repeat>1440||!Number.isInteger(n.repeatEnd)||n.repeatEnd<0||n.repeatEnd>1440||!Number.isInteger(n.volume)||n.volume<0||n.volume>100;}))throw Error('알림 설정 확인 필요 · 재생 시간 1~600초 · 반복 간격 1~1440분 · 반복 종료 1~1440분 · 볼륨 0~100');}
    if('masterVolume' in p&&(!Number.isInteger(p.masterVolume)||p.masterVolume<0||p.masterVolume>100))throw Error('전체 음량 0~100 정수 입력 필요');
    if(p.tabletQty&&(!Array.isArray(p.tabletQty)||p.tabletQty.length!==5||p.tabletQty.some(n=>!Number.isInteger(n)||n<0||n>100000)))throw Error('석판 수량 0 이상 정수 입력 필요');
    if(p.shardQty&&(!Array.isArray(p.shardQty)||p.shardQty.length!==5||p.shardQty.some(n=>!Number.isInteger(n)||n<0||n>300)))throw Error('X옥 조각 수량 0~300 정수 입력 필요');
    for(const [k,max,min]of [['gueseoEveryWeeks',52,0],['gueseoQty',100,1]])if(k in p&&(!Number.isInteger(p[k])||p[k]<min||p[k]>max))throw Error('귀서 주기와 수량 확인 필요');
    if('optimizeShortcuts' in p&&typeof p.optimizeShortcuts!=='boolean')throw Error('임달 설정 확인 필요');
    if('speedupIntent' in p&&!['none','gueseo','master','both'].includes(p.speedupIntent))throw Error('사용 의향 선택 필요');
    for(const k of ['sainReadyPlan','accelerationMode','speedupReviewPending','autoAdjustPlan'])if(k in p&&typeof p[k]!=='boolean')throw Error('준비 계획 확인 필요');
    for(const [k,max]of [['gueseoTotal',100],['masterBudget',1000]])if(k in p&&(!Number.isInteger(p[k])||p[k]<0||p[k]>max))throw Error('총사용량 범위 확인 필요');
    if('gueseoShopPrice' in p&&typeof p.gueseoShopPrice!=='boolean')throw Error('상점가 선택 확인 필요');
    if('minimizeToTray' in p&&typeof p.minimizeToTray!=='boolean')throw Error('최소화 방식 확인 필요');
    if('holidayWeekend' in p&&typeof p.holidayWeekend!=='boolean')throw Error('공휴일 설정 확인 필요');
    if('usageMode' in p&&!['efficient','kept'].includes(p.usageMode))throw Error('사용량 방식 확인 필요');
    if('cashRatio' in p&&(!Number.isFinite(p.cashRatio)||p.cashRatio<0||p.cashRatio>1000000))throw Error('캐시 비율 확인 필요');
    if('gueseoMarketPrice' in p&&(!Number.isSafeInteger(p.gueseoMarketPrice)||p.gueseoMarketPrice<0))throw Error('귀서 게임머니 가격 확인 필요');
    if('efficiencyMode' in p&&!['manual','gueseo'].includes(p.efficiencyMode))throw Error('효율 설정 방식 확인 필요');
    if('masterEfficiencyHours' in p&&(!Number.isFinite(p.masterEfficiencyHours)||p.masterEfficiencyHours<0||p.masterEfficiencyHours>8760))throw Error('임달 효율 기준 0~8760시간 숫자 입력 필요');
    if('thresholdHours' in p&&(!Number.isInteger(p.thresholdHours)||p.thresholdHours<0||p.thresholdHours>29))throw Error('조기 수령 범위 0~29시간 정수 입력 필요');
  }
  function deficits(q){return q.map(n=>Math.max(0,50-n));}
  function targeted(d){return d[4]>0?2:(d[0]>0||d[1]>0?0:d[2]>0||d[3]>0?1:-1);}
  function nextPhase(s){
    const sam=!s.hasSamSword&&s.tabletQty.some(n=>n<50),sain=s.canSainMission&&s.currentQty<300;
    return s.order==='sain-first'?(sain?'sain':sam?'sam':null):(sam?'sam':sain?'sain':null);
  }
  function nextSunday(date){const d=new Date(date);d.setHours(0,0,0,0);d.setDate(d.getDate()+7-d.getDay());return d;}
  function accrue(raw){return normalize(raw);}
  function complete(raw,box,now=new Date(),shortcut=0){
    const s=normalize(raw),a=s.activeMission;if(!a)throw Error('진행 중인 임무 없음');
    if(a.phase==='sam'&&![0,1,2].includes(a.action))throw Error('완료한 삼인검 임무 보상 구간 선택 필요');
    if(a.phase==='sam'&&a.action===2&&!(Number.isInteger(box)&&box>=-1&&box<5))throw Error('상자에서 나온 종류 선택 필요');
    if(a.phase==='sain'){
      // 보상은 '그 임무의 속성'으로 들어간다. 목표 속성과 다르면(잘못 보낸 임무) 그 속성 칸에 쌓인다.
      const mi=elementIndex(elements.includes(a.element)?a.element:s.craftElement);
      s.tabletQty[mi]+=1;s.shardQty[mi]=Math.min(300,s.shardQty[mi]+5);
      s.currentQty=s.shardQty[elementIndex(s.craftElement)];
      if(s.currentQty>=300&&!s.hasSamSword)s.tabletReviewPending=true;
    }
    else if(a.action===2){s.tabletQty[4]+=2;if(box>=0)s.tabletQty[box]+=5;else{s.tabletReviewPending=true;s.boxQty=(s.boxQty||0)+1;}}
    else {s.tabletQty[a.action*2]+=2;s.tabletQty[a.action*2+1]+=2;}
    if(s.accelerationMode)s.masterBudget=Math.max(0,s.masterBudget-shortcut);
    s.history.push({...a,finishedAt:now.toISOString(),box,shortcut,before:{boxQty:raw.boxQty,tabletQty:raw.tabletQty.slice(),currentQty:raw.currentQty,carryoverRemaining:raw.carryoverRemaining,tabletReviewPending:raw.tabletReviewPending,masterQty:raw.masterQty,masterBudget:raw.masterBudget}});
    s.history=s.history.slice(-200);s.activeMission=null;s.planStartAt=now.toISOString();
    return applyCarryover(s);
  }

  function wizardPatch(before,data,now=new Date()){
    if(typeof data.hasSamSword!=='boolean')throw Error('삼인검 보유 여부 선택 필요');
    if(!data.hasSamSword&&typeof data.canSainMission!=='boolean')throw Error('사인검 임무 가능 여부 선택 필요');
    const s=normalize({...before,...data});
    validatePatch(data);s.wizardVersion=4;s.onboarded=true;
    s.carryoverEnabled=false;
    if(!s.carryoverEnabled)s.carryoverRemaining=0;
    if(data.missionDraft){
      const d=data.missionDraft;
      if(!['none','sam','sain'].includes(d.phase))throw Error('진행 중인 임무 선택 필요');
      if(d.phase==='sam'&&s.hasSamSword)throw Error('삼인검 보유 상태에서는 사인검 임무만 입력 가능');
      if(d.phase==='sain'&&!s.canSainMission)throw Error('사인검 임무 ‘가능’ 먼저 선택 필요');
      if(d.phase==='none')s.activeMission=null;
      else {
        const ready=+new Date(d.readyAt);
        if(!Number.isFinite(ready)||ready>+now+30*3600000+60000)throw Error('남은 시간 0~30시간 입력 필요');
        const old=before.activeMission;
        const same=old&&old.phase===d.phase;
        // 삼인검 임무는 보상 구간(0/1/2)이 반드시 있어야 한다. 마법사가 보낸 값을 쓰고, 없으면 같은 임무를 이어갈 때만 이전 값을 재사용한다.
        const action=d.phase!=='sam'?null:([0,1,2].includes(d.action)?d.action:(same&&[0,1,2].includes(old.action)?old.action:null));
        if(d.phase==='sam'&&action===null)throw Error('진행 중인 삼인검 임무 보상 구간 선택 필요');
        // 사인검 임무는 진행 중인 속성을 임무에 직접 담는다. 목표 속성과 달라도(잘못 보냈어도) 그대로 기록한다.
        const element=d.phase!=='sain'?null:(elements.includes(d.element)?d.element:(same&&elements.includes(old.element)?old.element:s.craftElement));
        s.activeMission={id:same?old.id:String(+now),phase:d.phase,
          action,element,
          startedAt:new Date(ready-30*3600000).toISOString(),
          ticketDebited:same?!!old.ticketDebited:false,imported:true};
      }
    }
    if(s.hasSamSword&&s.activeMission?.phase==='sam')throw Error('삼인검 보유 시 현재 임무 항목 확인 필요');
    delete s.missionDraft;
    s.planStartAt=now.toISOString();s.ticketUpdatedAt=now.toISOString();
    return applyCarryover(s);
  }
  function shardName(s){return (s.craftElementSelected?shardNames[elementIndex(s.craftElement)]:'X옥')+' 조각';}

  function cleanSnapshot(x){
    if(!x||!Number.isFinite(x.at)||!Number.isFinite(x.finish)||!Array.isArray(x.log)||!Array.isArray(x.purchases))return null;
    return {source:typeof x.source==='string'?x.source:null,at:x.at,finish:x.finish,savedHours:Number.isFinite(x.savedHours)?x.savedHours:0,optimal:x.optimal===true,kind:x.kind|| (x.log.some(m=>m.shortcutHours>0)?"fast":"economy"),
      log:x.log.slice(0,500).filter(m=>m&&['sam','sain'].includes(m.phase)&&Number.isFinite(m.start)&&Number.isFinite(m.collect)).map(m=>({phase:m.phase,start:m.start,collect:m.collect,shortcutHours:integer(m.shortcutHours,0,29)})),
      purchases:x.purchases.slice(0,500).filter(g=>g&&Number.isFinite(g.at)&&Number.isInteger(g.qty)&&g.qty>0).map(g=>({at:g.at,qty:g.qty}))};
  }
  function pendingGueseo(s){return (s.planSnapshot?.purchases||[]).map(g=>({...g,week:questKey('ticket',new Date(g.at)),left:Math.max(0,g.qty-(s.gueseoRecords||[]).filter(r=>r.week===questKey('ticket',new Date(g.at))&&r.at>=s.planSnapshot.at).reduce((n,r)=>n+r.qty,0))})).filter(g=>g.left>0&&!s.gueseoSkippedWeeks.includes(g.week));}
  function planIssues(s,now=Date.now()){
    const snap=s.planSnapshot;if(!snap)return [];
    const issues=[];
    if(s.receiptImpact?.snapshotAt===snap.at&&s.receiptImpact.historyId===s.history?.at(-1)?.id)issues.push(s.receiptImpact.text);
    return issues;
  }
  function receiptImpact(s,S){
    const snap=s.planSnapshot,last=s.history.at(-1);if(!snap||!last)return null;
    const actual=s.history.filter(h=>+new Date(h.finishedAt)>=snap.at&&h.phase===last.phase),planned=snap.log.filter(m=>m.phase===last.phase),target=planned[actual.length-1];if(!target)return null;
    const finished=+new Date(last.finishedAt),late=Math.max(0,finished-target.collect);let projected=finished;
    const tail=snap.log.slice(snap.log.indexOf(target)+1);
    for(const m of tail){const start=S.nextAvailable(Math.max(projected,m.start),s,{});projected=S.nextAvailable(start+(30-m.shortcutHours)*3600000,s,{});}
    const delay=Math.max(0,projected-snap.finish);if(delay<=20*60000)return null;
    const minutes=Math.ceil(late/60000),days=Math.floor(delay/86400000),hours=Math.ceil((delay%86400000)/3600000);
    return {snapshotAt:snap.at,historyId:last.id,finish:projected,delayMinutes:Math.ceil(delay/60000),text:'계획 대비 '+minutes+'분 지연 수령 · 임달 예정 '+target.shortcutHours+'개 / 실제 '+(last.shortcut||0)+'개 · 기존 후속 계획 유지 시 최종 확보 약 '+days+'일 '+hours+'시간 지연 가능 · 재계산 필요'};
  }
  function recordGueseo(raw,payload,now=new Date()){
    if(now.getDay()!==0)throw Error('귀서: 2차특수임무수행서 추가 확보용 · 일요일에만 사용');
    const s=normalize(raw),g=pendingGueseo(s).find(g=>g.week===payload.week);if(!g)throw Error('확인할 귀서 계획 없음');
    if(payload.mode!=='skip'&&payload.week!==questKey('ticket',now))throw Error('이번 일요일 사용 기록만 입력 가능');if(payload.week>questKey('ticket',now))throw Error('아직 해당 주 사용 시점 아님');
    if(payload.mode==='skip'){s.gueseoSkippedWeeks=[...new Set([...s.gueseoSkippedWeeks,g.week])];s.speedupReviewPending=true;return s;}
    const qty=Number(payload.qty);if(!['used','included'].includes(payload.mode)||!Number.isInteger(qty)||qty<1||qty>g.left)throw Error('실제 사용 수량 확인 필요');
    if(payload.mode==='used'){if(s.gueseoStock<qty)throw Error('귀서 부족 · 실제 보유량 수정 필요');s.gueseoStock-=qty;s.currentTickets+=qty*2;}
    s.gueseoTotal=Math.max(0,s.gueseoTotal-qty);s.gueseoRecords.push({week:g.week,qty,at:+now});if(new Date(g.week+'T00:00:00').getDay()!==0)throw Error('귀서 사용 주 확인 필요');return s;
  }

  function scheduleAffected(s,S,now=Date.now()){
    const snap=s.planSnapshot;if(!snap)return false;
    for(const m of snap.log)for(const t of [m.start,m.collect])if(t>=now&&S.nextAvailable(t,s,{})>t+20*60000)return true;
    let stock=s.currentTickets;for(const g of snap.purchases){if(g.at<now)continue;const week=questKey('ticket',new Date(g.at)),demand=snap.log.filter(m=>questKey('ticket',new Date(m.start))===week&&m.start>=now).length;stock+=s.ticketClaimWeek===week?0:2;const need=Math.max(0,demand-stock);stock=Math.max(0,stock-demand);if(need&&(!S.questAt(s,0,g.at,{})||questKey('ticket',new Date(S.questAt(s,0,g.at,{})))!==week))return true;}
    return false;
  }
  function startAffected(s,S,now=Date.now()){
    if(!s.planSnapshot)return false;const completed=s.history.filter(h=>+new Date(h.finishedAt)>=s.planSnapshot.at).length,m=s.planSnapshot.log[completed];if(!m)return false;
    let t=now;for(const n of s.planSnapshot.log.slice(completed)){t=S.nextAvailable(Math.max(t,n.start),s,{});t=S.nextAvailable(t+(30-n.shortcutHours)*3600000,s,{});}return t>s.planSnapshot.finish+20*60000;
  }
  function planFingerprint(s){return 'sain-tablet-reward-v1:'+JSON.stringify(['hasSamSword','canSainMission','sainReadyPlan','strategy','tabletQty','currentQty','currentTickets','masterQty','gueseoStock','loginDays','dayWindows','weekdayWindows','weekendWindows','holidayWeekend','usageMode','blockedDates','activeMission','history','ticketClaimWeek','ironClaimWeek','ironQty','gueseoTotal','masterBudget','gueseoSkippedWeeks','gueseoRecords','speedupIntent','accelerationMode','useShortcuts','optimizeShortcuts','thresholdHours','ticketMode','ticketExtraPerWeek','gueseoEveryWeeks','gueseoQty','craftElement','craftElementSelected','masterEfficiencyHours','cashRatio','gueseoMarketPrice','efficiencyMode','gueseoShopPrice'].map(k=>s[k]));}
  const api={noticeSummary,soundNames,soundLabels,noticeKinds,planFingerprint,scheduleAffected,startAffected,receiptImpact,cleanSnapshot,pendingGueseo,planIssues,recordGueseo,shardName,questKey,dateKey,weekKey,claim,validatePatch,wizardPatch,names,labels,elements,shardNames,elementIndex,defaults,normalize,integer,applyCarryover,samQuantity,deficits,targeted,nextPhase,nextSunday,accrue,complete};
  if(typeof module!=='undefined')module.exports=api;else root.Model=api;
})(typeof globalThis!=='undefined'?globalThis:this);
