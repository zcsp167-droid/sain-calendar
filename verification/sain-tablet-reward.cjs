const assert=require('assert/strict'),fs=require('fs'),vm=require('vm'),M=require('../model');
for(const [index,craftElement]of ['fire','water','wind','thunder','earth'].entries()){
 const before=M.normalize({craftElement,craftElementSelected:true,canSainMission:true,currentQty:295,tabletQty:[40,40,40,40,40],activeMission:{id:'reward',phase:'sain',startedAt:'2026-09-20T00:00:00Z',ticketDebited:true}});
 let saved=M.complete(before,null,new Date('2026-09-21T12:00:00Z'));assert.equal(saved.currentQty,300);assert.deepEqual(saved.tabletQty,before.tabletQty.map((n,i)=>n+(i===index?1:0)));assert.deepEqual(before.tabletQty,[40,40,40,40,40]);
 let undo;const c={view:()=>saved,result:f=>f(),write:s=>saved=s,broadcast(){},ipcMain:{handle:(n,f)=>undo=f}};vm.createContext(c);const main=fs.readFileSync(require.resolve('../main.js'),'utf8');vm.runInContext(main.slice(main.indexOf("ipcMain.handle('undo-complete'"),main.indexOf('let reminderBusy=')),c);undo();assert.deepEqual(saved.tabletQty,before.tabletQty);assert.equal(saved.currentQty,295);assert.equal(saved.activeMission.id,'reward');
 saved=M.complete(saved,null,new Date());assert.equal(saved.tabletQty[index],41);
}
console.log('PASS: all five element rewards, final receipt, undo and re-receipt without double credit.');
