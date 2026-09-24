const TestClock=require('./test-clock');TestClock.install(0);
const {app,BrowserWindow,ipcMain,Tray,Menu,nativeImage,shell,dialog,screen}=require('electron');
const fs=require('fs'),path=require('path');
// Offline only: no proxy auto-detection and no spellcheck dictionary download.
app.commandLine.appendSwitch('no-proxy-server');
app.on('session-created',s=>{s.setSpellCheckerEnabled(false);s.setSpellCheckerLanguages([]);});
const Model=require('./model'),Schedule=require('./schedule'),Reminders=require('./reminders'),Personal=require('./personal'),Backup=require('./backup');
const testMode=process.env.SAIN_TEST_MODE==='1';
if(testMode){fs.mkdirSync(process.env.SAIN_TEST_DATA,{recursive:true});app.setPath('userData',process.env.SAIN_TEST_DATA);}
const settingsPath=path.join(app.getPath('userData'),'schedule-settings.json');
const ChangeLog=require('./change-log');
const changesPath=path.join(app.getPath('userData'),'plan-changes.json');let testChangeLog=null;
function readChanges(){if(testSession!==null)return testChangeLog??(testChangeLog=ChangeLog.empty());if(!fs.existsSync(changesPath))return ChangeLog.empty();return JSON.parse(fs.readFileSync(changesPath,'utf8'));}
function saveChanges(log){if(testSession!==null){testChangeLog=log;return;}fs.mkdirSync(path.dirname(changesPath),{recursive:true});fs.writeFileSync(changesPath+'.tmp',JSON.stringify(log));fs.renameSync(changesPath+'.tmp',changesPath);}
const statePath=path.join(app.getPath('userData'),'window-state.json');
let win,settingsWin,helpWin,remoteWin,tray;
const appId='Gersang.SainCalendar';app.setAppUserModelId(appId);
function iconPath(ext='ico'){const key=load().iconElement;return path.join(__dirname,'icons',(['fire','water','wind','thunder','earth'].includes(key)?key:'wind')+'.'+ext);}
function shellIconPath(){const src=iconPath();if(!app.isPackaged)return src;try{const dest=path.join(app.getPath('userData'),'icons',path.basename(src)),data=fs.readFileSync(src);fs.mkdirSync(path.dirname(dest),{recursive:true});if(!fs.existsSync(dest)||!fs.readFileSync(dest).equals(data))fs.writeFileSync(dest,data);return dest;}catch{return src;}}
function applyAppearance(){for(const w of BrowserWindow.getAllWindows())if(!w.isDestroyed())w.setIcon(iconPath());if(tray)tray.setImage(nativeImage.createFromPath(iconPath('png')).resize({width:16,height:16}));if(win&&!win.isDestroyed()){win.setAppDetails({appId,appIconPath:shellIconPath(),appIconIndex:0,relaunchCommand:portableExe?'"'+portableExe+'"':'"'+process.execPath+'" "'+app.getAppPath()+'"',relaunchDisplayName:'사인검 제작 달력'});win.webContents.setZoomFactor(load().displayMode==='scroll'?1:require('./window-size').zoom(...win.getContentSize()));}}
let testSession=null,sessionVersion=0;const copyState=s=>JSON.parse(JSON.stringify(s));
const registerHandler=ipcMain.handle.bind(ipcMain);
ipcMain.handle=(name,fn)=>registerHandler(name,(event,payload,version)=>{if(version!==undefined&&version!==sessionVersion)return {ok:false,error:'화면 상태 변경됨 · 새로 열린 화면에서 다시 실행 필요'};return fn(event,payload);});
ipcMain.on('session-version',event=>{event.returnValue=sessionVersion;});
function load(){
  if(testSession!==null)return Model.normalize(copyState(testSession));
  if(!fs.existsSync(settingsPath))return Model.normalize();
  const raw=JSON.parse(fs.readFileSync(settingsPath,'utf8'));
  // Legacy counts are preserved. An old schedule timestamp is not proof that a mission is active.
  return Model.normalize(raw);
}
function write(s,replacementLog){const before=load(),log=replacementLog??ChangeLog.observe(readChanges(),before,s);if(testSession!==null)testSession=copyState(s);else{fs.mkdirSync(path.dirname(settingsPath),{recursive:true});const temp=settingsPath+'.tmp';fs.writeFileSync(temp,JSON.stringify(s,null,2));fs.renameSync(temp,settingsPath);}saveChanges(log);}
const portableExe=process.env.PORTABLE_EXECUTABLE_FILE||null; // portable exe unpacks to a temp folder that is deleted on exit; use the real exe path there
function loginOptions(){return {name:appId,path:portableExe||process.execPath,args:app.isPackaged?[]:[`"${app.getAppPath()}"`]};}
function legacyShortcut(){
  if(process.platform!=='win32'||!process.env.APPDATA)return null;
  const file=path.join(process.env.APPDATA,'Microsoft','Windows','Start Menu','Programs','Startup','개인달력.lnk');
  if(!fs.existsSync(file))return null;
  try{return path.resolve(shell.readShortcutLink(file).target).toLowerCase()===path.resolve(__dirname,'run-hidden.vbs').toLowerCase()?file:null;}catch{return null;}
}
function startupEnabled(){if(testSession!==null)return !!testSession.startAtLogin;if(testMode)return !!load().startAtLogin;return app.getLoginItemSettings(loginOptions()).openAtLogin||!!legacyShortcut();}
function setStartup(enabled){
  if(testMode||testSession!==null)return;
  const old=legacyShortcut();app.setLoginItemSettings({...loginOptions(),openAtLogin:enabled,enabled});
  if(app.getLoginItemSettings(loginOptions()).openAtLogin!==enabled)throw Error('자동 실행 설정 적용 실패 · Windows 시작 앱 설정 확인 필요');
  app.setLoginItemSettings({...loginOptions(),name:'personal-calendar',openAtLogin:false});
  if(old)fs.unlinkSync(old);
}
function view(){const changes=readChanges();return {...load(),startAtLogin:startupEnabled(),changeLogUnread:ChangeLog.unread(changes),changeLogNewest:ChangeLog.newest(changes),changeLogThrough:changes.sequence,changeLogCounts:ChangeLog.counts(changes)};}
function broadcast(){const s=view();for(const w of [win,settingsWin])if(w&&!w.isDestroyed())w.webContents.send('settings-updated',s);if(typeof stopResolved==='function'){if(playing)stopResolved(Reminders.active(s));soundState();}}
function result(fn){try{return {ok:true,data:fn()};}catch(e){return {ok:false,error:e.message};}}
function windowOptions(extra={}){return {show:!testMode,backgroundColor:'#15191f',icon:iconPath(),autoHideMenuBar:true,webPreferences:{contextIsolation:true,nodeIntegration:false,spellcheck:false,preload:path.join(__dirname,'preload.js')},...extra};}
function openSettings(){if(settingsWin&&!settingsWin.isDestroyed()){settingsWin.show();settingsWin.focus();return;}const mainBounds=win&&!win.isDestroyed()?win.getBounds():null,width=mainBounds?.width||1024,height=mainBounds?.height||768;settingsWin=new BrowserWindow(windowOptions({width,height,minWidth:480,minHeight:height,maxHeight:height,parent:win}));settingsWin.loadFile(path.join(__dirname,'settings.html'));settingsWin.on('closed',()=>settingsWin=null);}
function openTestRemote(){if(remoteWin&&!remoteWin.isDestroyed()){remoteWin.show();remoteWin.focus();return;}remoteWin=new BrowserWindow(windowOptions({width:460,height:820,minWidth:380,minHeight:520,parent:win,title:'테스트 리모콘'}));remoteWin.loadFile(path.join(__dirname,'test-remote.html'));remoteWin.on('closed',()=>remoteWin=null);}
function createWindow(){
  let old={};try{old=JSON.parse(fs.readFileSync(statePath,'utf8'));}catch{}
  const area=screen.getDisplayNearestPoint(screen.getCursorScreenPoint()).workAreaSize;const size=require('./window-size').initial(old,area);
  win=new BrowserWindow(windowOptions({...size,minWidth:Math.min(460,area.width),minHeight:Math.min(480,area.height),frame:false}));
  const fitContent=()=>{if(win&&!win.isDestroyed()){const [width,height]=win.getContentSize();win.webContents.setZoomFactor(load().displayMode==='scroll'?1:require('./window-size').zoom(width,height));}};
  win.webContents.on('did-finish-load',()=>{fitContent();applyAppearance();});
  win.loadFile(path.join(__dirname,'index.html'));
  if(!testMode)fs.writeFileSync(statePath,JSON.stringify({...size,fitVersion:2}));
  win.on('resize',()=>{fitContent();if(testSession!==null)return;const [width,height]=win.getSize();fs.writeFileSync(statePath,JSON.stringify({width,height,fitVersion:2}));});
  win.on('minimize',e=>{if(load().minimizeToTray){e.preventDefault();win.hide();}});
  if(!testMode){tray=new Tray(nativeImage.createFromPath(iconPath('png')).resize({width:16,height:16}));tray.setToolTip('사인검 제작 달력');tray.setContextMenu(Menu.buildFromTemplate([{label:'열기',click:()=>win.show()},{label:'설정',click:openSettings},{type:'separator'},{label:'종료',click:()=>app.quit()}]));tray.on('click',()=>win.isVisible()?win.hide():win.show());}
  win.webContents.once('did-finish-load',()=>{try{if(process.argv.includes('--settings')){openSettings();return;}if((!load().onboarded||load().wizardVersion<3)&&!testMode)openSettings();}catch(e){dialog.showErrorBox('설정 파일 확인 필요',e.message);}});
}
if(!app.requestSingleInstanceLock()){app.quit();}else{app.on('second-instance',()=>{if(win){win.show();win.focus();}});app.whenReady().then(createWindow);}
app.on('window-all-closed',()=>app.quit());
ipcMain.handle('focus-main',()=>{if(win&&!win.isDestroyed()){win.focus();win.webContents.focus();}});
ipcMain.handle('load-settings',()=>view());
ipcMain.handle('read-change-log',(event,before)=>result(()=>ChangeLog.page(readChanges(),Number.isSafeInteger(before)?before:Infinity)));
ipcMain.handle('mark-change-log-entry-read',(event,id)=>result(()=>{saveChanges(ChangeLog.markEntryRead(readChanges(),id));broadcast();return true;}));
ipcMain.handle('remove-change-log-entry',(event,id)=>result(()=>{saveChanges(ChangeLog.remove(readChanges(),id));broadcast();return true;}));
ipcMain.handle('clear-change-log',()=>result(()=>{saveChanges(ChangeLog.clear(readChanges()));broadcast();return true;}));
ipcMain.handle('mark-change-log-read',(event,through)=>result(()=>{const log=ChangeLog.markRead(readChanges(),through);saveChanges(log);broadcast();return true;}));
ipcMain.handle('save-personal-notes',(event,notes)=>result(()=>{const s=view();s.personalNotes=Personal.validate(notes);write(s);broadcast();return s;}));
async function exportBackup(){
 try{const answer=await dialog.showSaveDialog(win,{title:'달력 백업 저장',defaultPath:'사인검-달력-'+Model.dateKey(new Date())+'.json',filters:[{name:'달력 백업',extensions:['json']}]});if(answer.canceled||!answer.filePath)return {ok:true,cancelled:true};const snapshot=Backup.pack(view(),readChanges());fs.writeFileSync(answer.filePath,JSON.stringify(snapshot,null,2),'utf8');return {ok:true};}catch(e){return {ok:false,error:e.message};}
}
ipcMain.handle('export-backup',exportBackup);
ipcMain.handle('import-backup',async()=>{
 const version=sessionVersion;try{
  const answer=await dialog.showOpenDialog(win,{title:'달력 백업 불러오기',properties:['openFile'],filters:[{name:'달력 백업',extensions:['json']}]});if(answer.canceled||!answer.filePaths?.length)return {ok:true,cancelled:true};
  const file=answer.filePaths[0];
  const payload=JSON.parse(fs.readFileSync(file,'utf8')),next=Backup.unpack(payload),restoredChanges=Backup.unpackChanges(payload);
  const confirm=await dialog.showMessageBox(win,{type:'warning',title:'백업 불러오기',message:'백업 파일로 현재 내용 교체 확인',detail:'보유량, 임무·퀘스트 기록, 설정, 개인 일정, 변동사항 기록 교체 · 현재 내용 자동 백업 보관',buttons:['불러오기','취소'],defaultId:1,cancelId:1,noLink:true});
  if(confirm.response!==0||version!==sessionVersion)return {ok:true,cancelled:true};
  const before=view(),folder=path.join(app.getPath('userData'),'backups');if(testSession===null){fs.mkdirSync(folder,{recursive:true});fs.writeFileSync(path.join(folder,'before-import-'+Date.now()+'.json'),JSON.stringify(Backup.pack(before,readChanges()),null,2));}
  next.startAtLogin=before.startAtLogin;write(next,restoredChanges);broadcast();return {ok:true};
 }catch(e){return {ok:false,error:e.message};}
});

ipcMain.handle('reset-settings',async()=>{
 const version=sessionVersion;
 try{
  const answer=await dialog.showMessageBox(win,{type:'warning',title:'전체 초기화',message:'모든 데이터와 기록 삭제 예정',detail:'보유량, 임무·퀘스트 기록, 설정, 개인 메모, 변동사항 기록 전체 초기화 · 초기화 전 현재 데이터 백업 저장 여부 선택',buttons:['백업 저장 후 초기화','바로 초기화','취소'],defaultId:0,cancelId:2,noLink:true});
  if(![0,1].includes(answer.response)||version!==sessionVersion)return {ok:true,cancelled:true};
  if(answer.response===0){const saved=await exportBackup();if(!saved.ok||saved.cancelled)return saved;}
  if(version!==sessionVersion)return {ok:true,cancelled:true};
  setStartup(false);
  write({...Model.normalize(),personalNotes:{}},ChangeLog.empty());
  resetSounds();
  sessionVersion++;
  if(settingsWin&&!settingsWin.isDestroyed())settingsWin.close();
  openSettings();
  return {ok:true};
 }catch(e){return {ok:false,error:e.message};}
});

ipcMain.on('minimize-window',()=>{if(load().minimizeToTray)win.hide();else win.minimize();});
ipcMain.on('close-window',()=>app.quit());
ipcMain.handle('toggle-maximize',()=>{if(win.isMaximized())win.unmaximize();else win.maximize();return win.isMaximized();});
ipcMain.on('reset-window-size',()=>{if(win.isMaximized())win.unmaximize();win.setSize(1024,768);const [width,height]=win.getContentSize();win.webContents.setZoomFactor(load().displayMode==='scroll'?1:require('./window-size').zoom(width,height));if(!testMode)fs.writeFileSync(statePath,JSON.stringify({width:1024,height:768,fitVersion:2}));});
ipcMain.on('open-settings-window',openSettings);ipcMain.on('open-test-remote',openTestRemote);
// 리모콘의 버튼은 메인 화면의 같은 버튼을 대신 눌러줄 뿐이다. 정해진 두 동작만 허용한다.
const REMOTE_PRESS={
 receive:"(()=>{const b=document.getElementById('missionUnifiedButton');if(!b||!state?.activeMission||!missionReceivable())return '수령 가능한 임무 없음';b.click();return '';})()",
 master:"(()=>{const b=document.getElementById('missionMasterReceiveBtn');if(!b||b.hidden||b.disabled)return '임달 수령 불가 · 남은 시간이 임달 수령 범위 밖';b.click();return '';})()"
};
ipcMain.handle('test-remote-press',async(event,which)=>{try{if(!win||win.isDestroyed())return {ok:false,error:'메인 창 없음 · 프로그램 재실행 필요'};const code=REMOTE_PRESS[which];if(!code)return {ok:false,error:'알 수 없는 버튼'};const message=await win.webContents.executeJavaScript(code);return message?{ok:false,error:message}:{ok:true};}catch(e){return {ok:false,error:e.message};}});
ipcMain.on('open-help',()=>{if(helpWin&&!helpWin.isDestroyed()){helpWin.show();return;}helpWin=new BrowserWindow(windowOptions({width:920,height:850}));helpWin.loadFile(path.join(__dirname,'help.html'));helpWin.on('closed',()=>helpWin=null);});
ipcMain.handle('save-settings',(event,data)=>result(()=>{
  const before=view();if(!before.onboarded&&!data.wizardSubmit&&data.expectedSource)return before;if(data.expectedSource&&data.expectedSource!==Model.planFingerprint(before))return {stale:true};const allowed=['gueseoShopPrice','cashRatio','gueseoMarketPrice','efficiencyMode','masterEfficiencyHours','displayMode','iconElement','autoAdjustPlan','planSnapshot','speedupReviewPending','boxQty','gueseoStock','speedupIntent','sainReadyPlan','accelerationMode','gueseoTotal','masterBudget','gueseoEveryWeeks','gueseoQty','optimizeShortcuts','craftBuyRecommended','craftHiddenQuests','craftElementSelected','craftInventory','craftElement','hasSamSword','canSainMission','useShortcuts','missionDraft','strategy','tabletQty','shardQty','currentQty','currentTickets','ticketMode','ticketExtraPerWeek','thresholdHours','loginDays','dayWindows','weekdayWindows','weekendWindows','holidayWeekend','usageMode','notice','masterVolume','startAtLogin','ironQty','masterQty','blockedDates','minimizeToTray'];
  allowed.push('personalNotes');
  const patch={};for(const key of allowed)if(key in data)patch[key]=data[key];
  const derived=new Set(['planSnapshot','speedupReviewPending','gueseoTotal','masterBudget','useShortcuts','thresholdHours','optimizeShortcuts','accelerationMode']);
  if(data.expectedValues)for(const key of [...Object.keys(patch),...(data.wizardSubmit?['activeMission','history']:[])])if(!(data.wizardSubmit&&derived.has(key))&&key in data.expectedValues&&JSON.stringify(before[key])!==JSON.stringify(data.expectedValues[key]))throw Error('편집 중 원본 데이터 변경됨 · 창 다시 열어 확인 필요');
  if('personalNotes' in patch)patch.personalNotes=Personal.validate(patch.personalNotes);
  if('displayMode' in patch&&!['scale','scroll'].includes(patch.displayMode))throw Error('화면 표시 방식 선택 필요');if('iconElement' in patch&&!['fire','water','wind','thunder','earth'].includes(patch.iconElement))throw Error('아이콘 속성 선택 필요');Model.validatePatch(patch);
  // 예전 방식으로 currentQty만 보내는 화면(재고 즉석 수정 등)은 현재 제작 속성 칸으로 옮겨준다.
  if('currentQty' in patch&&!('shardQty' in patch)){const q=(Array.isArray(before.shardQty)?before.shardQty.slice():[0,0,0,0,0]);q[Model.elementIndex('craftElement' in patch?patch.craftElement:before.craftElement)]=patch.currentQty;patch.shardQty=q;}
  let s=data.wizardSubmit?Model.wizardPatch(before,patch):Model.normalize({...before,...patch});Schedule.validate(s);
  if(s.hasSamSword&&s.activeMission?.phase==='sam')throw Error('진행 중인 삼인검 임무 수령 또는 취소 후 보유 상태 변경 가능');
  if(patch.tabletQty)s.tabletReviewPending=false;
  if(!data.wizardSubmit&&!(patch.tabletQty&&before.tabletReviewPending)&&Object.keys(patch).every(key=>JSON.stringify(before[key])===JSON.stringify(s[key])))return before;
  if(typeof data.startAtLogin==='boolean')setStartup(data.startAtLogin);
  s.planStartAt=new Date().toISOString();if(data.expectedSource&&s.planSnapshot)s.planSnapshot.source=Model.planFingerprint(s);else if(data.wizardSubmit&&data.planSnapshot&&s.planSnapshot)s.planSnapshot.source=Model.planFingerprint(s);/* 초기설정 마지막 단계에서 고른 계획은 그대로 확정(시작 직후 재계산 없음) */s.receiptImpact=null;const seqBefore=readChanges().sequence;write(s);if(data.markRead===true)saveChanges(ChangeLog.markReadAfter(readChanges(),seqBefore));if('displayMode' in patch||'iconElement' in patch)applyAppearance();broadcast();return s;
}));
ipcMain.on('test-session-active',event=>{event.returnValue=testSession!==null;});
ipcMain.on('test-clock-offset',event=>{event.returnValue=TestClock.offset();});
ipcMain.handle('set-test-time',(event,at)=>result(()=>{if(at!==null&&!Number.isFinite(+new Date(at)))throw Error('테스트 날짜와 시간 확인 필요');let note='';sessionVersion++;if(at===null){TestClock.setTime(null);testSession=null;testChangeLog=null;}else{if(testSession===null)testSession=copyState(view());if(+new Date(at)>Date.now()){const advanced=require('./test-scenario').advance(testSession,+new Date(at));if(advanced.simulated)testSession=copyState(advanced.state);else note='새 일정 계산 전이라 시간만 이동 · 잠시 뒤 다시 클릭 필요';}TestClock.setTime(at);if(testSession.planSnapshot)testSession.planSnapshot.source=null;}setTimeout(()=>{for(const w of BrowserWindow.getAllWindows())if(!w.isDestroyed())w.webContents.reload();},50);return {offset:TestClock.offset(),testing:testSession!==null,note};}));
function prepareTest(seconds,mode){const n=Number.isInteger(seconds)&&seconds>=1&&seconds<=3600?seconds:10;const prepared=require('./test-scenario').prepare(view(),Date.now(),n,mode);if(testSession===null)testSession=copyState(view());sessionVersion++;testSession=copyState(prepared.state);TestClock.setTime(new Date(prepared.at).toISOString());setTimeout(()=>{for(const w of BrowserWindow.getAllWindows())if(!w.isDestroyed())w.webContents.reload();},50);return true;}
ipcMain.handle('prepare-test-master',(event,seconds)=>result(()=>prepareTest(seconds,'master')));
ipcMain.handle('prepare-test-mission',(event,seconds)=>result(()=>prepareTest(seconds,'mission')));
ipcMain.handle('register-plan-snapshot',(event,data)=>result(()=>{const s=view();if(!s.onboarded)return s;if(!s.planSnapshot&&!s.speedupReviewPending){s.planSnapshot=Model.cleanSnapshot(data);write(s);broadcast();}return s;}));
ipcMain.handle('record-gueseo',(event,data)=>result(()=>{const s=Model.recordGueseo(view(),data);write(s);broadcast();return s;}));
ipcMain.handle('claim-weekly',(event,payload)=>result(()=>{const kind=typeof payload==='string'?payload:payload?.kind,mode=typeof payload==='string'?'receive':payload?.mode;if(!['receive','included','custom'].includes(mode))throw Error('수령 방식 선택 필요');if(new Date().getDay()!==(kind==='iron'?5:0))throw Error('해당 퀘스트는 지정 요일에만 수령 가능');const before=view(),s=Model.claim(before,kind,new Date(),mode==='included',mode==='custom'?payload.total:2);if(kind==='ticket'&&mode==='custom'&&payload.total>2&&(payload.total-2)%2===0){const used=Math.min(s.gueseoTotal,(payload.total-2)/2);s.gueseoTotal-=used;s.gueseoStock=Math.max(0,s.gueseoStock-used);s.gueseoRecords.push({week:Model.questKey('ticket'),qty:used,at:Date.now()});}write(s);broadcast();return s;}));
ipcMain.handle('toggle-blocked-date',(event,date)=>result(()=>{const s=view();Model.validatePatch({blockedDates:[date]});const dates=new Set(s.blockedDates);dates.has(date)?dates.delete(date):dates.add(date);s.blockedDates=[...dates].sort();Model.validatePatch({blockedDates:s.blockedDates});write(s);broadcast();return s;}));
ipcMain.handle('undo-weekly',(event,kind)=>result(()=>{if(!['ticket','iron'].includes(kind))throw Error('퀘스트 종류 확인 필요');const s=view();if(s[kind+'ClaimWeek']!==Model.questKey(kind))throw Error('현재 회차 완료 기록 없음');s[kind+'ClaimWeek']='';delete s.reminderLast[kind];write(s);broadcast();return s;}));
ipcMain.handle('edit-mission-time',(event,startedAt)=>result(()=>{
 const s=view(),t=+new Date(startedAt);if(!s.activeMission)throw Error('‘임무 보내기’ 먼저 클릭 필요');
 if(!Number.isFinite(t)||t>Date.now())throw Error('시작 시각은 현재 또는 이전 날짜 입력 필요');
 s.activeMission.startedAt=new Date(t).toISOString();write(s);broadcast();return s;
}));
ipcMain.handle('start-mission',(event,payload)=>result(()=>{
  const choice=typeof payload==='object'&&payload!==null?payload.choice:payload,remainingMinutes=typeof payload==='object'&&payload!==null?payload.remainingMinutes:1800;
  if(!Number.isInteger(remainingMinutes)||remainingMinutes<0||remainingMinutes>1800)throw Error('남은 시간 0~30시간 입력 필요');
  const s=view();if(s.activeMission)throw Error('진행 중인 임무 완료 또는 취소 필요');
  if(s.tabletReviewPending)throw Error('사인검 보상 석판 포함 실제 보유량 확인 필요');const phase=Model.nextPhase(s);if(!phase)throw Error(!s.canSainMission&&s.currentQty<300?'사인검 임무 가능 시 왼쪽 ‘사인검 불가능’ 클릭 후 변경':'모든 임무 재료 확보 완료');
  if(phase==='sain'&&!s.craftElementSelected)throw Error('사인검 속성 선택 필요');
  if(phase==='sam'&&![0,1,2].includes(choice))throw Error('삼인검 임무 구간 선택 필요');
  if(s.currentTickets<1)throw Error('수행서 부족 · 보유 수량 확인 필요');
  const debit=s.currentTickets>0;if(debit)s.currentTickets--;
  s.activeMission={id:String(Date.now()),phase,action:phase==='sam'?choice:null,startedAt:new Date(Date.now()-(1800-remainingMinutes)*60000).toISOString(),ticketDebited:debit};write(s);broadcast();return s;
}));
ipcMain.handle('edit-mission-kind',(event,payload)=>result(()=>{
 const s=view();if(!s.activeMission)throw Error('진행 중인 임무 없음');
 const phase=payload?.phase,action=payload?.action;
 if(phase==='sain'){const element=payload?.element;if(element!==undefined){if(!['fire','water','wind','thunder','earth'].includes(element))throw Error('사인검 속성 확인 필요');s.craftElement=element;s.craftElementSelected=true;}if(!s.craftElementSelected)throw Error('사인검 속성 선택 필요');s.activeMission.phase='sain';s.activeMission.action=null;}
 else if(phase==='sam'){if(s.hasSamSword)throw Error('삼인검 이미 보유 · 사인검 임무만 진행 가능');if(![0,1,2].includes(action))throw Error('삼인검 임무 구간 선택 필요');s.activeMission.phase='sam';s.activeMission.action=action;}
 else throw Error('임무 종류 확인 필요');
 write(s);broadcast();return s;
}));
ipcMain.handle('cancel-mission',()=>result(()=>{const s=view();if(s.activeMission?.ticketDebited)s.currentTickets++;s.activeMission=null;s.planStartAt=new Date().toISOString();write(s);broadcast();}));
ipcMain.handle('complete-mission',(event,payload)=>result(()=>{
 const s=view();if(!s.activeMission)throw Error('진행 중인 임무 없음');
 if(payload?.missionId!==s.activeMission.id)throw Error('임무 상태 변경됨 · 수령 창 다시 열기 필요');
 if(payload?.phase!==undefined&&payload.phase!==s.activeMission.phase){
  if(!['sam','sain'].includes(payload.phase))throw Error('임무 종류 확인 필요');
  if(payload.phase==='sain'&&!s.craftElementSelected)throw Error('사인검 속성 선택 필요');
  if(payload.phase==='sam'&&s.hasSamSword)throw Error('삼인검 이미 보유 · 사인검 임무만 진행 가능');
  s.activeMission.phase=payload.phase;s.activeMission.action=null;
 }
 let box=null;if(s.activeMission.phase==='sam'){if(payload?.boxLater===true&&JSON.stringify(payload.rewards)==='[0,0,0,0,2]'){s.activeMission.action=2;box=-1;}else{const reward=require('./reward.js').decode(payload?.rewards);s.activeMission.action=reward.action;box=reward.box;}}
 const remaining=Math.max(0,(+new Date(s.activeMission.startedAt)+30*3600000-Date.now())/3600000);
 if(payload?.allowEarly!==true&&remaining>(s.thresholdHours>0?s.thresholdHours+1/6:.01)+.001)throw Error('수령 불가 · 조기 수령 안내 확인 필요');
 const used=payload?.allowEarly===true?0:s.thresholdHours>0?Math.ceil(Math.max(0,remaining-1/6)):Math.ceil(remaining);const next=Model.complete(s,box,new Date(),used);next.masterQty=s.masterQty-used;next.receiptImpact=Model.receiptImpact(next,Schedule);write(next);broadcast();return next;
}));
ipcMain.handle('undo-complete',()=>result(()=>{const s=view();if(s.activeMission)throw Error('진행 중인 임무 취소 후 되돌리기 가능');const last=s.history.at(-1);if(s.hasSamSword&&last?.phase==='sam')throw Error('삼인검 보유 상태에서는 삼인검 기록 되돌리기 불가 · 삼인검 보유 해제 후 되돌리기 가능');s.history.pop();if(!last?.before)throw Error('되돌릴 완료 기록 없음');Object.assign(s,last.before);s.activeMission={id:last.id,phase:last.phase,action:last.action,startedAt:last.startedAt,ticketDebited:last.ticketDebited};write(s);broadcast();}));
let reminderBusy=false;
// 알림: 프로그램 화면 표시는 항상 · 방식별 추가 동작은 팝업(무음 · 알림 1건당 1회 · 닫기로 확인) 또는 소리(재생 시간·반복 간격 설정)
const {pathToFileURL}=require('url');
const soundDir=()=>path.join(app.getPath('userData'),'sounds');
const auxOptions=extra=>({show:false,backgroundColor:'#15191f',icon:iconPath(),autoHideMenuBar:true,webPreferences:{contextIsolation:true,nodeIntegration:false,spellcheck:false,backgroundThrottling:false,preload:path.join(__dirname,'aux-preload.js')},...extra});
let soundWin=null,popupWin=null,playing=null,soundTimer=null,popupItems=[];const soundLast={},brokenSounds=new Set(),mutedAlarms=new Set();
function soundPath(s,id){if(Model.soundNames.includes(id))return path.join(__dirname,'sounds',id+'.wav');const u=s.userSounds.find(x=>x.id===id);return u?path.join(soundDir(),u.file):null;}
function soundUsable(s,id){const file=soundPath(s,id);return !!file&&!brokenSounds.has(id)&&fs.existsSync(file);}
function soundList(s=view()){return {builtin:Model.soundNames,user:s.userSounds.map(u=>({id:u.id,name:u.name,missing:!soundUsable(s,u.id)}))};}
function soundIssue(s){const used=k=>k==='note'?Object.values(s.personalNotes||{}).some(l=>l.some(x=>x.alarmMode==='sound')):s.notice[k].mode==='sound';return Model.noticeKinds.some(k=>used(k)&&!soundUsable(s,s.notice[k].sound))?'알림 소리 파일 없음 · 기본 소리(딩동)로 대체 재생 · 알림 설정에서 다시 추가 필요':'';}
function soundState(){const s=view(),data={playing:playing?playing.key:'',issue:soundIssue(s)};for(const w of [win,settingsWin])if(w&&!w.isDestroyed())w.webContents.send('sound-state',data);}
function soundWindow(){if(soundWin&&!soundWin.isDestroyed())return soundWin;soundWin=new BrowserWindow(auxOptions({width:200,height:100,skipTaskbar:true}));soundWin.loadFile(path.join(__dirname,'sound.html'));soundWin.on('closed',()=>{soundWin=null;playing=null;});return soundWin;}
function stopSound(){clearTimeout(soundTimer);soundTimer=null;if(playing&&soundWin&&!soundWin.isDestroyed())soundWin.webContents.send('aux-sound',{cmd:'stop'});const was=!!playing;playing=null;if(was)soundState();}
// 재생 시간 0 = 파일 길이만큼 1회 · 그 외 = 해당 초만큼 이어서 반복 재생 후 중지
function playSound(key,id,seconds,volume=1){
 const s=view();clearTimeout(soundTimer);soundTimer=null;let use=id;if(!soundUsable(s,use))use=Model.soundNames[0];
 playing={key,id:use,seconds,volume};const w=soundWindow(),msg={cmd:'play',url:pathToFileURL(soundPath(s,use)).href,loop:seconds>0,key,volume};
 if(w.webContents.isLoading())w.webContents.once('did-finish-load',()=>{if(playing?.key===key&&!w.isDestroyed())w.webContents.send('aux-sound',msg);});else w.webContents.send('aux-sound',msg);
 if(seconds>0)soundTimer=setTimeout(()=>{if(playing?.key===key)stopSound();},seconds*1000);
 soundState();
}
ipcMain.on('aux-sound-event',(event,data)=>{
 if(!playing||playing.key!==data?.key)return;
 if(data.type==='error'&&playing.id!==Model.soundNames[0]){brokenSounds.add(playing.id);playSound(playing.key,Model.soundNames[0],playing.seconds,playing.volume);return;}
 playing=null;clearTimeout(soundTimer);soundTimer=null;soundState();
});
// 전체 초기화: 재생 중지 · 추가한 소리 파일 삭제
function resetSounds(){stopSound();brokenSounds.clear();mutedAlarms.clear();if(testSession===null)try{fs.rmSync(soundDir(),{recursive:true,force:true});}catch{}}
function stopResolved(items){if(playing?.key.startsWith('alarm:')&&!items.some(i=>i.mode==='sound'&&'alarm:'+i.id===playing.key))stopSound();}
function popupWindow(){
 if(popupWin&&!popupWin.isDestroyed())return popupWin;
 popupWin=new BrowserWindow(auxOptions({width:380,height:170,frame:false,resizable:false,minimizable:false,maximizable:false,skipTaskbar:true,alwaysOnTop:true,title:'사인검 제작 달력 알림'}));
 popupWin.setAlwaysOnTop(true,'screen-saver');popupWin.loadFile(path.join(__dirname,'popup.html'));popupWin.on('closed',()=>{popupWin=null;popupItems=[];});return popupWin;
}
function showPopup(fresh){
 const ids=new Set(fresh.map(x=>x.id));popupItems=[...fresh.map(({kind,id,title,text,note})=>({kind,id,title,text,noteId:note?.id,alarmAt:note?.alarmAt})),...popupItems.filter(x=>!ids.has(x.id))].slice(0,10);
 const w=popupWindow(),area=screen.getPrimaryDisplay().workArea,height=Math.min(420,96+popupItems.length*58),width=380;
 w.setBounds({x:area.x+area.width-width-12,y:area.y+area.height-height-12,width,height});
 const send=()=>{if(!w.isDestroyed()){w.webContents.send('aux-popup',popupItems);w.showInactive();}};
 if(w.webContents.isLoading())w.webContents.once('did-finish-load',send);else send();
}
// 팝업 닫기 = 확인 · 개인 일정은 알림 완료로 기록
ipcMain.on('aux-popup-close',()=>{
 const notes=popupItems.filter(x=>x.noteId);popupItems=[];if(popupWin&&!popupWin.isDestroyed())popupWin.hide();
 for(const x of notes){delete soundLast[x.id];if(playing?.key==='alarm:'+x.id)stopSound();}
 if(!notes.length)return;try{const s=view();let dirty=false;for(const list of Object.values(s.personalNotes||{}))for(const n of list)if(notes.some(x=>x.noteId===n.id&&x.alarmAt===n.alarmAt)&&n.notifiedAt!==n.alarmAt){n.notifiedAt=n.alarmAt;dirty=true;}if(dirty){write(s);broadcast();}}catch(e){console.error('팝업 확인 기록 실패:',e.message);}
});
function checkReminders(){
 if(testMode||reminderBusy||!win||win.isDestroyed())return;reminderBusy=true;
 try{
  const s=view(),now=new Date(),items=Reminders.active(s,now),fresh=[];let dirty=false;
  for(const item of items){
   // 개인 일정의 '팝업+소리'는 팝업도 함께 표시(다른 알림 종류는 팝업·소리 동시 사용 안 함)
   const showPopup=item.mode==='popup'||(item.kind==='note'&&item.mode==='sound');
   if(showPopup){
    if(item.note){if(item.note.popupAt!==item.note.alarmAt){item.note.popupAt=item.note.alarmAt;dirty=true;fresh.push(item);}}
    else if(s.reminderLast[item.kind]?.id!==item.id){s.reminderLast[item.kind]={id:item.id,at:+now};dirty=true;fresh.push(item);}
   }
   if(item.mode==='sound'&&!mutedAlarms.has(item.id)){
    const cfg=s.notice[item.kind],last=soundLast[item.id],vol=Math.min(1,Math.max(0,(s.masterVolume??100)*(cfg.volume??100)/10000));
    if(!last||last.id!==item.id){soundLast[item.id]={id:item.id,at:+now,firstAt:+now};if(playing?.key!=='alarm:'+item.id)playSound('alarm:'+item.id,cfg.sound,cfg.seconds,vol);}
    else if(cfg.repeat>0&&+now-last.at>=cfg.repeat*60000&&(!cfg.repeatEnd||+now-last.firstAt<=cfg.repeatEnd*60000)){soundLast[item.id]={id:item.id,at:+now,firstAt:last.firstAt};if(playing?.key!=='alarm:'+item.id)playSound('alarm:'+item.id,cfg.sound,cfg.seconds,vol);}
   }
  }
  for(const id of [...mutedAlarms])if(!items.some(i=>i.id===id))mutedAlarms.delete(id);
  if(dirty){write(s);broadcast();}
  if(fresh.length)showPopup(fresh);
  stopResolved(items);
 }catch(e){console.error('알림 확인 실패:',e.message);}finally{reminderBusy=false;}
}
// 소리 목록 관리 · 추가한 파일은 사용자 데이터 폴더에 복사해 사용
ipcMain.handle('sound-list',()=>result(()=>soundList()));
ipcMain.handle('sound-add',async event=>{
 try{
  const owner=BrowserWindow.fromWebContents(event.sender)||win;
  const answer=await dialog.showOpenDialog(owner,{title:'알림 소리 추가',defaultPath:'C:\\Windows\\Media',properties:['openFile','multiSelections'],filters:[{name:'소리 파일',extensions:['mp3','wav','ogg','flac']}]});
  if(answer.canceled||!answer.filePaths?.length)return {ok:true,data:soundList(),cancelled:true};
  const s=view();if(s.userSounds.length+answer.filePaths.length>200)throw Error('사용자 소리 최대 200개 · 기존 소리 삭제 후 추가 가능');
  fs.mkdirSync(soundDir(),{recursive:true});
  for(const file of answer.filePaths){const ext=path.extname(file).toLowerCase();if(!['.mp3','.wav','.ogg','.flac'].includes(ext))throw Error('mp3 · wav · ogg · flac 파일만 추가 가능');const id='user-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8);fs.copyFileSync(file,path.join(soundDir(),id+ext));s.userSounds.push({id,name:path.basename(file),file:id+ext});}
  write(s);broadcast();soundState();return {ok:true,data:soundList()};
 }catch(e){return {ok:false,error:e.message};}
});
ipcMain.handle('sound-remove',(event,id)=>result(()=>{
 const s=view(),u=s.userSounds.find(x=>x.id===id);if(!u)throw Error('삭제할 소리 없음 · 목록 새로 열기 필요');
 if(playing?.id===id)stopSound();
 s.userSounds=s.userSounds.filter(x=>x.id!==id);const reset=Model.noticeKinds.filter(k=>s.notice[k].sound===id);for(const k of reset)s.notice[k].sound=Model.soundNames[0];
 write(s);try{fs.rmSync(path.join(soundDir(),u.file),{force:true});}catch{}brokenSounds.delete(id);broadcast();soundState();
 return {...soundList(),reset};
}));
// 미리 듣기: 같은 소리 재생 중이면 중지 · 다른 소리는 기존 소리 중지 후 재생
ipcMain.handle('sound-preview',(event,id,volume)=>result(()=>{const s=view();if(!Model.soundNames.includes(id)&&!s.userSounds.some(x=>x.id===id))throw Error('소리 목록에 없는 항목 · 다시 선택 필요');if(playing?.key==='preview:'+id){stopSound();return {playing:false};}const vol=Number.isFinite(volume)?Math.min(1,Math.max(0,volume)):1;playSound('preview:'+id,id,0,vol);return {playing:true,fallback:!soundUsable(s,id)};}));
// 볼륨 슬라이더 전용: 항상 새로 재생(토글 아님) · 드래그 중 sound-set-volume으로 실시간 조절
ipcMain.handle('sound-preview-start',(event,id,volume)=>result(()=>{const s=view();if(!Model.soundNames.includes(id)&&!s.userSounds.some(x=>x.id===id))throw Error('소리 목록에 없는 항목 · 다시 선택 필요');const vol=Number.isFinite(volume)?Math.min(1,Math.max(0,volume)):1;playSound('preview:'+id,id,0,vol);return {playing:true,fallback:!soundUsable(s,id)};}));
ipcMain.on('sound-set-volume',(event,volume)=>{if(!playing)return;const vol=Math.min(1,Math.max(0,Number(volume)||0));playing.volume=vol;if(soundWin&&!soundWin.isDestroyed())soundWin.webContents.send('aux-sound',{cmd:'volume',volume:vol});});
ipcMain.handle('sound-stop',()=>result(()=>{stopSound();return true;}));
// 알림 끄기: 지금 재생 중인 알림을 작업 완료(해당 알림이 조건 목록에서 사라짐) 전까지 완전히 중지
ipcMain.handle('mute-alarm',()=>result(()=>{if(playing?.key?.startsWith('alarm:')){mutedAlarms.add(playing.key.slice(6));stopSound();}return true;}));
ipcMain.handle('sound-state',()=>result(()=>({playing:playing?playing.key:'',issue:soundIssue(view())})));
app.whenReady().then(()=>{if(!testMode){setInterval(checkReminders,10000);setTimeout(checkReminders,3000);}});

