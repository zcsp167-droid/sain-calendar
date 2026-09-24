const {contextBridge,ipcRenderer}=require('electron');
const sessionVersion=ipcRenderer.sendSync('session-version');
const invoke=(name,payload)=>ipcRenderer.invoke(name,payload,sessionVersion);
contextBridge.exposeInMainWorld('calendarAPI',{
  markChangeLogEntryRead:id=>invoke('mark-change-log-entry-read',id),clearChangeLog:()=>invoke('clear-change-log'),removeChangeLogEntry:id=>invoke('remove-change-log-entry',id),editMissionKind:payload=>invoke('edit-mission-kind',payload),readChangeLog:before=>invoke('read-change-log',before),markChangeLogRead:through=>invoke('mark-change-log-read',through),
  prepareTestMaster:seconds=>invoke('prepare-test-master',seconds),prepareTestMission:seconds=>invoke('prepare-test-mission',seconds),openTestRemote:()=>ipcRenderer.send('open-test-remote'),pressFromRemote:which=>invoke('test-remote-press',which),isTestSession:()=>ipcRenderer.sendSync('test-session-active'),getTestClockOffset:()=>ipcRenderer.sendSync('test-clock-offset'),setTestTime:at=>invoke('set-test-time',at),
  minimize:()=>ipcRenderer.send('minimize-window'),close:()=>ipcRenderer.send('close-window'),toggleMaximize:()=>invoke('toggle-maximize'),resetWindowSize:()=>ipcRenderer.send('reset-window-size'),
  registerPlanSnapshot:data=>invoke('register-plan-snapshot',data),recordGueseo:data=>invoke('record-gueseo',data),
  claimWeekly:kind=>invoke('claim-weekly',kind),editMissionTime:time=>invoke('edit-mission-time',time),
  toggleBlockedDate:date=>invoke('toggle-blocked-date',date),undoWeekly:kind=>invoke('undo-weekly',kind),
  savePersonalNotes:notes=>invoke('save-personal-notes',notes),exportBackup:()=>invoke('export-backup'),importBackup:()=>invoke('import-backup'),
  focusMain:()=>invoke('focus-main'),
  resetSettings:()=>invoke('reset-settings'),
  loadSettings:()=>invoke('load-settings'),openSettingsWindow:()=>ipcRenderer.send('open-settings-window'),openHelp:()=>ipcRenderer.send('open-help'),
  saveSettings:data=>invoke('save-settings',data),
  soundList:()=>invoke('sound-list'),addSounds:()=>invoke('sound-add'),removeSound:id=>invoke('sound-remove',id),previewSound:(id,volume)=>invoke('sound-preview',id,volume),previewSoundStart:(id,volume)=>invoke('sound-preview-start',id,volume),setSoundVolume:volume=>ipcRenderer.send('sound-set-volume',volume),stopSound:()=>invoke('sound-stop'),muteAlarm:()=>invoke('mute-alarm'),soundState:()=>invoke('sound-state'),
  onSoundState:callback=>{const handler=(event,data)=>callback(data);ipcRenderer.on('sound-state',handler);return ()=>ipcRenderer.removeListener('sound-state',handler);},
  startMission:choice=>invoke('start-mission',choice),completeMission:box=>invoke('complete-mission',box),cancelMission:()=>invoke('cancel-mission'),undoComplete:()=>invoke('undo-complete'),
  onSettingsUpdated:callback=>ipcRenderer.on('settings-updated',(event,data)=>callback(data))
});
