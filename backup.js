'use strict';
const Model=require('./model'),Schedule=require('./schedule'),Personal=require('./personal');
const FORMAT='sain-calendar-backup';
function validateState(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw)||raw.version!==4)throw Error('미지원 설정 데이터 · 현재 데이터 유지 · 다른 백업 파일 선택 필요');
 Model.validatePatch(raw);
 for(const k of ['onboarded','hasSamSword','canSainMission','useShortcuts'])if(typeof raw[k]!=='boolean')throw Error('백업 설정 항목 오류 · 현재 데이터 유지 · 다른 백업 파일 선택 필요');
 for(const k of ['currentQty','currentTickets','masterQty','ironQty'])if(!Number.isInteger(raw[k]))throw Error('백업 보유량 없음 · 현재 데이터 유지 · 다른 백업 파일 선택 필요');
 if(!Array.isArray(raw.tabletQty)||raw.tabletQty.length!==5||!Array.isArray(raw.history)||raw.history.length>200)throw Error('백업 보유량 또는 기록 오류 · 현재 데이터 유지 · 다른 백업 파일 선택 필요');
 for(const field of ['ticketClaimWeek','ironClaimWeek'])if(raw[field]&&!Personal.validDate(raw[field]))throw Error('퀘스트 완료 날짜 오류 · 현재 데이터 유지 · 다른 백업 파일 선택 필요');
 function mission(m){if(!m||!['sam','sain'].includes(m.phase)||typeof m.id!=='string'||!Number.isFinite(+new Date(m.startedAt))||(m.phase==='sam'&&m.action!==null&&![0,1,2].includes(m.action)))throw Error('임무 기록 오류 · 현재 데이터 유지 · 다른 백업 파일 선택 필요');}
 if(raw.activeMission)mission(raw.activeMission);
 for(const h of raw.history){mission(h);if(!Number.isFinite(+new Date(h.finishedAt))||!h.before||!Array.isArray(h.before.tabletQty)||h.before.tabletQty.length!==5)throw Error('완료 기록 오류 · 현재 데이터 유지 · 다른 백업 파일 선택 필요');Model.validatePatch(h.before);}
 const s=Model.normalize(raw);Schedule.validate(s);s.personalNotes=Personal.validate(raw.personalNotes||{});return s;
}
function unpackChanges(value){
 const log=value?.changeLog;if(log===undefined)return require('./change-log').empty();
 const summary=s=>s&&Number.isFinite(s.gueseo)&&Number.isFinite(s.master)&&(s.finish===null||Number.isFinite(s.finish));
 const changes=xs=>Array.isArray(xs)&&xs.every(x=>x&&['label','before','after'].every(k=>typeof x[k]==='string'));
 if(!log||!Number.isSafeInteger(log.sequence)||log.sequence<0||!Number.isSafeInteger(log.readThrough)||log.readThrough<0||log.readThrough>log.sequence||!Array.isArray(log.entries)||!changes(log.pending)||(log.baseline!==null&&!summary(log.baseline)))throw Error('백업 변동사항 기록 오류 · 현재 데이터 유지 · 다른 백업 파일 선택 필요');
 let previous=0;for(const entry of log.entries){if(!entry||!Number.isSafeInteger(entry.id)||entry.id<=previous||entry.id>log.sequence||!Number.isFinite(entry.at)||!['change','action','plan'].includes(entry.type)||typeof entry.reason!=='string'||!summary(entry.before)||!summary(entry.after)||!changes(entry.changes))throw Error('백업 변동사항 항목 오류 · 현재 데이터 유지 · 다른 백업 파일 선택 필요');previous=entry.id;}
 return JSON.parse(JSON.stringify(log));
}
function pack(state,changeLog){return {format:FORMAT,version:1,savedAt:new Date().toISOString(),state:validateState(state),changeLog:unpackChanges({changeLog})};}
function unpack(value){if(value?.format!==FORMAT||value.version!==1)throw Error('사인검 제작 달력 백업 파일 선택 필요');return validateState(value.state);}
module.exports={pack,unpack,unpackChanges,validateState};
