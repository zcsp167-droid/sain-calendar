'use strict';
const assert=require('assert/strict'),fs=require('fs'),vm=require('vm'),R=require('../route-examples');
for(let element=0;element<4;element++){
 const empty=R.calculate(element,false),full=R.calculate(element,true);
 assert(Math.abs(empty.rows[0].sam-55.632)<.1);
 assert(empty.rows[1].total<empty.rows[0].total);
 assert(empty.rows[2].total<=empty.rows[0].total);
 assert(full.rows.every(row=>row.total===full.rows[0].total&&row.savedHours===0));
 assert(empty.rows.every(row=>row.sain===60&&row.hours===row.total*30));
 assert.deepEqual(empty,R.calculate(element,false));
}
assert.throws(()=>R.calculate(4));
class E{constructor(tag){this.tag=tag;this.children=[];this.handlers={};this.value='';}append(...xs){for(const x of xs){x.parent=this;this.children.push(x);}}replaceChildren(...xs){this.children=[];this.append(...xs);}setAttribute(){}addEventListener(name,fn){this.handlers[name]=fn;}showModal(){this.open=true;}close(){this.open=false;this.handlers.close?.();}remove(){this.parent.children=this.parent.children.filter(x=>x!==this);}all(tag){return this.children.flatMap(x=>[...(x.tag===tag?[x]:[]),...x.all(tag)]);}}
const body=new E('body'),context={Model:require('../model'),Schedule:require('../schedule'),Completion:require('../comparison'),document:{body,createElement:tag=>new E(tag),getElementById:id=>body.all('dialog').find(x=>x.id===id)},calendarAPI:new Proxy({},{get(){throw Error('Reference examples must not access persistence APIs');}})};vm.createContext(context);vm.runInContext(fs.readFileSync(require.resolve('../route-examples'),'utf8'),context);
const reference=R.reference();assert.equal(reference.routes.length,3);assert(reference.routes[0].days>reference.routes[1].days);assert.equal(reference.routes[1].days,reference.routes[2].days);assert(reference.gueseo.days<reference.routes[1].days);assert.equal(reference.efficiency,12);assert.equal(reference.both.efficiencyHours,12);
// 고정 예시 시간(18~22시)에서는 임달 1개당 효과가 12시간 미만 → 임달 미사용, 기준 없는 최대 사용은 참고용으로만 계산
assert.equal(reference.both.master,0);assert(reference.max.master>0);assert(reference.max.days<reference.gueseo.days);assert((reference.gueseo.days-reference.max.days)*24/reference.max.master<12);
const M=require('../model'),S=require('../schedule'),C=require('../comparison');const origin=new Date(2026,8,21,18);const fixed=M.normalize({canSainMission:true,weekdayWindows:[{start:'18:00',end:'22:00'}],weekendWindows:[{start:'14:00',end:'22:00'}],accelerationMode:true});for(const row of [...reference.routes,reference.gueseo,reference.both,reference.max]){const plan=C.plan({...fixed,gueseoTotal:row.gueseo,masterBudget:row.master,efficiencyHours:row.efficiencyHours},row.missions-60,origin,{},S,row.master?29:0);assert.equal((plan.finish-origin)/86400000,row.days);for(const event of plan.log){for(const time of [event.start,event.collect])assert.equal(S.nextAvailable(time,fixed,{}),time);}}
context.RouteExamples.open();assert.equal(body.all('dialog').length,1);const dialog=body.all('dialog')[0];assert(dialog.all('strong').some(x=>x.textContent.includes('미적용')));assert(dialog.all('strong').some(x=>x.textContent.includes('잔여 석판')));assert(dialog.all('p').some(x=>x.textContent.includes('동일 비용 대비')));assert.equal(dialog.all('select').length,0);assert.equal(dialog.all('input').length,0);assert.equal(dialog.all('table').length,2);assert(dialog.all('p').some(x=>x.textContent.includes('평일 18~22시')));assert(dialog.all('p').some(x=>x.textContent.includes('본인 조건')));assert.equal(dialog.all('button').length,1);dialog.close();assert.equal(body.all('dialog').length,0);
assert(dialog.all('tr').some(x=>x.className==='route-reference'&&x.all('td')[2].textContent.includes('기준 12시간 미달')));
// 사용자 접속 시간(평일 20~24시·주말 11~24시)과 효율 기준으로 계산 · 기준 충족 시 임달 사용 줄 표시
const user=M.normalize({weekdayWindows:[{start:'20:00',end:'24:00'}],weekendWindows:[{start:'11:00',end:'24:00'}],efficiencyMode:'manual',masterEfficiencyHours:12});const mine=R.reference(user);assert(mine.custom);assert(mine.both.master>0);assert(mine.both.days<mine.gueseo.days);assert.equal(mine.max,null);assert.equal(R.reference(user),mine);
context.RouteExamples.open(user);const own=body.all('dialog')[0];assert(own.all('p').some(x=>x.textContent.startsWith('내 접속 시간 기준 · 평일 20~24시 · 주말 11~24시')));assert(own.all('td').some(x=>x.textContent.includes('임달 '+mine.both.master+'개 사용')));assert(!own.all('tr').some(x=>x.className==='route-reference'));own.close();
console.log('PASS: fixed and user-time reference examples, efficiency threshold with gray reference row, common login windows and ticket waits, reproducible item budgets, no selectors, no persistence.');
