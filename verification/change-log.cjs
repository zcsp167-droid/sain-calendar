'use strict';
const assert=require('assert/strict'),M=require('../model'),L=require('../change-log');
function planned(s,g,m,finish){s=M.normalize({...s,gueseoTotal:g,masterBudget:m,planSnapshot:{at:1,finish,log:[],purchases:[]}});s.planSnapshot.source=M.planFingerprint(s);return s;}
let before=planned({},32,69,100000000),log=L.empty();
let changed=M.normalize({...before,currentTickets:10});L.observe(log,before,changed,10);assert.equal(log.entries.length,1);assert(log.pending.some(c=>c.label==='보유 수행서'));
let after=planned(changed,30,63,90000000);L.observe(log,changed,after,20);assert.equal(log.entries.length,1);assert.equal(log.entries[0].before.gueseo,32);assert.equal(log.entries[0].after.gueseo,30);assert(log.entries[0].changes.some(c=>c.label==='보유 수행서'));assert(L.page(log).unread);
const opened=L.page(log).through;L.markRead(log,opened);assert(!L.page(log).unread);assert.equal(log.entries.length,1);
let again=M.normalize({...after,masterQty:5});L.observe(log,after,again,30);L.markRead(log,opened);assert(!L.page(log).unread);assert.equal(log.entries.length,2);
let settled=planned(again,29,60,85000000);L.observe(log,again,settled,31);again=settled;assert(L.page(log).unread);assert.equal(log.entries.length,2);
let restored=JSON.parse(JSON.stringify(log));assert(L.page(restored).unread);L.markRead(restored,restored.sequence);assert(!L.page(restored).unread);assert.equal(restored.entries.length,2);
const count=restored.sequence;L.observe(restored,again,again,40);assert.equal(restored.sequence,count);
for(let i=0;i<120;i++){let next=M.normalize({...again,masterQty:i+20});L.observe(restored,again,next,i+100);again=next;}assert.equal(restored.entries.length,122);const first=L.page(restored),second=L.page(restored,first.entries.at(-1).id);assert.equal(first.entries.length,50);assert.equal(second.entries.length,50);assert(!first.entries.some(x=>second.entries.some(y=>x.id===y.id)));
const day=86400000;
{let g=L.empty(),b=planned({},10,5,200000000),c=M.normalize({...b,currentTickets:7});L.observe(g,b,c,1);assert.equal(g.entries.length,1);assert(!L.page(g).unread);
 let a=planned(c,10,5,200000000+3600000);L.observe(g,c,a,2);assert.equal(g.entries.length,0);assert.equal(g.sequence,0);assert.equal(g.pending.length,0);assert(!L.page(g).unread);
 let c2=M.normalize({...a,currentTickets:8});L.observe(g,a,c2,3);let a2=planned(c2,10,5,200000000+3*day);L.observe(g,c2,a2,4);assert.equal(g.entries.length,1);assert(L.page(g).unread);
 let c3=M.normalize({...a2,notifyEnabled:!a2.notifyEnabled});L.observe(g,a2,c3,5);assert.equal(g.entries.length,1);}
// Setup edits and its first completed forecast are a baseline, not changes.
{const g=L.empty(),initial=M.normalize({}),setup=M.normalize({...initial,onboarded:true,currentTickets:5});
 L.observe(g,initial,setup,1);assert.equal(g.entries.length,0);assert.equal(g.baseline,null);
 const waiting=M.normalize({...setup,masterQty:3});L.observe(g,setup,waiting,2);assert.equal(g.entries.length,0);
 const first=planned(waiting,10,5,200000000);L.observe(g,waiting,first,3);assert.equal(g.entries.length,0);assert.equal(g.baseline.finish,200000000);assert(!L.unread(g));
 const edit=M.normalize({...first,currentTickets:7});L.observe(g,first,edit,4);
 const next=planned(edit,9,5,200000000-day);L.observe(g,edit,next,5);assert.equal(g.entries.length,1);assert(L.unread(g));assert.equal(g.entries[0].before.finish,first.planSnapshot.finish);
 const direct=L.empty();L.observe(direct,initial,first,1);assert.equal(direct.entries.length,0);assert.equal(direct.baseline.finish,first.planSnapshot.finish);
}
// 사용자가 미리보기 후 직접 고른 저장: 그 저장으로 생긴 기록만 읽음, 이전 안 읽은 기록은 그대로
{const x={sequence:3,readThrough:0,pending:[],baseline:null,entries:[{id:1,read:false},{id:2,read:false},{id:3,read:false,pending:true}]};L.markReadAfter(x,1);assert.equal(x.entries[0].read,false);assert.equal(x.entries[1].read,true);assert.equal(x.entries[2].read,false);}
console.log('PASS: cumulative changes, causal plan comparison, read/unread across restart, new changes during read, no duplicates, pagination, no entry when gueseo/master usage and final date are unchanged, and user-viewed saves recorded as read.');
