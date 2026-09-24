// 소리 재생만 담당 · 재생 시간과 반복 판단은 main.js
const audio=new Audio();let key=null;
auxAPI.onSound(data=>{
 if(data.cmd==='stop'){key=null;audio.pause();audio.removeAttribute('src');audio.load();return;}
 if(data.cmd==='volume'){audio.volume=Number.isFinite(data.volume)?Math.min(1,Math.max(0,data.volume)):1;return;}
 key=null;audio.pause();key=data.key;audio.src=data.url;audio.loop=!!data.loop;audio.currentTime=0;audio.volume=Number.isFinite(data.volume)?Math.min(1,Math.max(0,data.volume)):1;
 audio.play().catch(()=>{if(key===data.key){key=null;auxAPI.soundEvent('error',data.key);}});
});
audio.onended=()=>{if(key){const k=key;key=null;auxAPI.soundEvent('ended',k);}};
audio.onerror=()=>{if(key){const k=key;key=null;auxAPI.soundEvent('error',k);}};
