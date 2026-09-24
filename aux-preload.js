// 팝업 알림 창과 숨은 소리 재생 창 전용 · 필요한 통로만 연다
const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('auxAPI',{
  onPopup:callback=>ipcRenderer.on('aux-popup',(event,items)=>callback(items)),
  closePopup:()=>ipcRenderer.send('aux-popup-close'),
  onSound:callback=>ipcRenderer.on('aux-sound',(event,data)=>callback(data)),
  soundEvent:(type,key)=>ipcRenderer.send('aux-sound-event',{type,key})
});
