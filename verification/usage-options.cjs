'use strict';
const assert=require('assert/strict'),M=require('../model'),S=require('../schedule'),C=require('../comparison'),Solver=require('../solver');
// 사인검만 남은 상태(삼인검 보유), 평일 18~22시·주말 14~22시 접속, 귀서+임달 사용
const now=new Date(2026,8,21,18);
const s=M.normalize({onboarded:true,hasSamSword:true,canSainMission:true,craftElement:'fire',craftElementSelected:true,weekdayWindows:[{start:'18:00',end:'22:00'}],weekendWindows:[{start:'14:00',end:'22:00'}],speedupIntent:'both',accelerationMode:true,planStartAt:now.toISOString()});
const analysis={counts:[0]};
const o=C.usageOptions(s,analysis,now,{},S,{g:10,m:30});
// ② 효율 기준 = 비교표 기간 단축 추천과 같은 결과
const r=C.compare(s,analysis,now,{},S);assert.equal(o.efficient.finish,r.fast.finish);assert.equal(o.efficient.masterCount,r.fast.masterCount);assert.equal(o.efficiency,12);
// ① 사용량 유지: 정한 개수를 넘지 않음
assert(o.kept.gueseoCount<=10&&o.kept.masterCount<=30);assert.notEqual(o.kept.finish,null);
// ③ 다음 효율 단계: 있으면 ②보다 임달을 더 쓰고 날짜가 당겨지며 기준은 12시간 미만
if(o.next){assert(o.next.masterCount>o.efficient.masterCount);assert(o.next.finish<o.efficient.finish);assert(o.next.efficiencyHours<12);assert(o.next.efficiencyHours>=C.NEXT_FLOOR);}
// ③ 하한 9시간: 효율 기준이 이미 9시간 이하면 ③ 없음
assert.equal(C.NEXT_FLOOR,9);assert.equal(C.usageOptions({...s,efficiencyMode:'manual',masterEfficiencyHours:9},analysis,now,{},S,{g:10,m:30}).next,null);
// 미사용 대비 단축 시간(메인 요약용) 포함
assert(o.efficient.savedHours>0);assert.equal(o.efficient.savedHours,(r.base.finish-o.efficient.finish)/3600000);assert(Number.isFinite(o.kept.savedHours));
// 고정 사용량 재계산만
const k=C.usageOptions(s,analysis,now,{},S,{g:10,m:30},true);assert.deepEqual(Object.keys(k),['kept']);assert.equal(k.kept.finish,o.kept.finish);
// 사인검 준비 전(사인검 불가 · 준비 예정 꺼짐)에는 ①도 귀서·임달 0개 → ①② 동일
const unready=M.normalize({...s,hasSamSword:false,canSainMission:false,sainReadyPlan:false});assert.equal(C.itemsAllowed(unready),false);const u=C.usageOptions(unready,{counts:[50]},now,{},S,{g:17,m:46});assert.equal(u.kept.gueseoCount,0);assert.equal(u.kept.masterCount,0);assert.equal(u.kept.finish,u.efficient.finish);assert.equal(u.next,null);
// 저장값
assert.equal(M.normalize({}).usageMode,'efficient');assert.equal(M.normalize({usageMode:'kept'}).usageMode,'kept');assert.throws(()=>M.validatePatch({usageMode:'fixed'}));M.validatePatch({usageMode:'kept'});
assert.notEqual(M.planFingerprint(s),M.planFingerprint({...s,usageMode:'kept'}));
console.log('PASS: usage options kept/efficient/next, efficient equals comparison fast plan, kept caps, kept-only recalculation, usageMode storage.'+(o.next?' next step '+o.next.efficiencyHours+'h':' (no next step in fixture)'));
