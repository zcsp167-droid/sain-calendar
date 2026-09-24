'use strict';
const assert=require('assert/strict'),H=require('../holidays'),S=require('../schedule'),M=require('../model');
// 1. 2026~2028 고정 표와 규칙 계산 일치(선거일·임시공휴일과 겹침 대체공휴일 이름 표기 차이 제외)
const elections=['2026-06-03','2028-04-12'];
for(const y of [2026,2027,2028]){
 const rule=H.__rules(y),table=Object.fromEntries(Object.entries(H).filter(([k])=>k.startsWith(y+'-')&&!elections.includes(k)));
 assert.deepEqual(Object.keys(rule).sort(),Object.keys(table).sort(),y+'년 공휴일 날짜 불일치');
 for(const k of Object.keys(rule))assert(table[k].startsWith(rule[k].split('(')[0]),k+' 이름 불일치');
}
// 2. 2029년 이후 자동 계산: 음력 공휴일과 대체공휴일 규칙
const expect={'2029-02-13':'설날','2029-05-20':'부처님오신날','2029-05-21':'대체공휴일(부처님오신날)','2029-05-07':'대체공휴일(어린이날)','2029-09-22':'추석','2029-09-24':'대체공휴일(추석)','2030-02-05':'대체공휴일(설날)','2030-05-06':'대체공휴일(어린이날)','2031-03-03':'대체공휴일(삼일절)'};
for(const [k,name]of Object.entries(expect))assert.equal(H[k],name,k);
assert.equal(H['2029-06-03'],undefined,'2029년 이후 선거일 미표시');
assert(Object.keys(H).some(k=>k.startsWith('2060-')),'2060년까지 계산');
assert.equal(Object.keys(H).includes('__rules'),false,'계산 함수는 목록에 포함 안 됨');
// 3. 공휴일 주말 시간 적용: 평일 공휴일(2029-09-24 월 대체공휴일)
const base={weekdayWindows:[{start:'20:00',end:'22:00'}],weekendWindows:[{start:'10:00',end:'12:00'}]};
const hours=list=>list.map(([a,b])=>new Date(a).getHours()+'-'+new Date(b).getHours());
const day=new Date(2029,8,24,12);
assert.deepEqual(hours(S.windowsOn(day,M.normalize(base),{})),['20-22'],'꺼짐: 평소 요일 시간');
assert.deepEqual(hours(S.windowsOn(day,M.normalize({...base,holidayWeekend:true}),{})),['10-12'],'켜짐: 주말 시간(넘겨받은 목록 없어도 확인)');
assert.deepEqual(hours(S.windowsOn(day,M.normalize({...base,holidayWeekend:true,loginDays:[0,6]}),{})),['10-12'],'켜짐: 접속 요일에서 뺀 요일이어도 공휴일은 주말 시간');
assert.deepEqual(S.windowsOn(day,M.normalize({...base,holidayWeekend:true,blockedDates:['2029-09-24']}),{}),[],'접속 불가 우선');
assert.deepEqual(hours(S.windowsOn(new Date(2029,8,25,12),M.normalize({...base,holidayWeekend:true}),{})),['20-22'],'공휴일 아닌 평일은 그대로');
// 4. 저장값·검증·계획 기준값
assert.equal(M.normalize({}).holidayWeekend,false);assert.equal(M.normalize({holidayWeekend:true}).holidayWeekend,true);
assert.throws(()=>M.validatePatch({holidayWeekend:'yes'}));M.validatePatch({holidayWeekend:true});
assert.notEqual(M.planFingerprint(M.normalize(base)),M.planFingerprint(M.normalize({...base,holidayWeekend:true})),'변경 시 재계산 대상');
assert.throws(()=>S.validate(M.normalize({...base,holidayWeekend:true,loginDays:[1],weekendWindows:[{start:'',end:''}]})),/주말 접속 시간/);
console.log('PASS: 2026~2028 table matches rules, 2029+ lunar and substitute holidays, holiday weekend windows on/off, blocked-date priority, validation and plan fingerprint.');
