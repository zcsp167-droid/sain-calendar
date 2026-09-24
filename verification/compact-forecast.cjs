const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const Model=require('../model'),Schedule=require('../schedule');
const source=fs.readFileSync('app.js','utf8'),refresh=source.slice(source.indexOf('function refreshForecast(){'),source.indexOf('function analyze(){'));
const fixed=new Date('2026-09-21T18:00:00+09:00');class Clock extends Date{constructor(...args){super(...(args.length?args:[+fixed]));}static now(){return +fixed;}}
const ids={};const context={Model,Schedule,Date:Clock,HOLIDAYS:{},analysis:{counts:[56,54]},state:Model.normalize({onboarded:true,currentTickets:5,loginDays:[0,1,2,3,4,5,6]}),plan:null,$:id=>ids[id]??(ids[id]={}),dateTime:String,renderCalendar(){},openedDay:null};vm.createContext(context);vm.runInContext(refresh,context);
const original=JSON.stringify(context.state);vm.runInContext('refreshForecast()',context);assert.equal(JSON.stringify(context.state),original);assert.equal(context.plan.meanSainFinish,null);assert.equal(context.plan.meanFinish,null);assert(context.plan.preparedSainFinish>context.plan.meanSamFinish);assert(context.plan.log.every(m=>m.phase==='sam'));
const reference=Schedule.forecast({...context.state,sainReadyPlan:true},context.analysis,fixed);assert.equal(context.plan.preparedSainFinish,reference.meanSainFinish);
context.state=Model.normalize({...context.state,canSainMission:true});vm.runInContext('refreshForecast()',context);assert.equal(context.plan.preparedSainFinish,undefined);assert(context.plan.meanSainFinish);
context.state=Model.normalize({...context.state,canSainMission:false,hasSamSword:true});context.analysis={counts:[0]};vm.runInContext('refreshForecast()',context);assert(context.plan.preparedSainFinish>+fixed);
const html=fs.readFileSync('index.html','utf8');for(const id of ['compactQuest','compactFinal','persistentSummary','utilityActions'])assert.equal(html.split('id="'+id+'"').length-1,1);
console.log('PASS: conditional completion reference, unchanged real settings/calendar, ready and sam-complete states, unique header elements.');
