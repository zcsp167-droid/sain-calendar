// 팝업은 알리기만 한다 · 닫기 = 확인
const list=document.getElementById('list');
auxAPI.onPopup(items=>{
 list.replaceChildren(...items.map(x=>{const box=document.createElement('div'),title=document.createElement('small'),text=document.createElement('div');box.className='item';title.textContent=x.title;text.textContent=x.text;box.append(title,text);return box;}));
});
let closing=false;
document.getElementById('close').onclick=()=>{if(closing)return;closing=true;auxAPI.closePopup();setTimeout(()=>closing=false,500);};
