/* All time editors use separate hour and minute boxes, including dynamically opened dialogs. */
window.addEventListener('DOMContentLoaded',()=>{
 const descriptor=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value');
 function enhance(input){if(input.dataset.splitReady)return;input.dataset.splitReady='1';const dated=input.type==='datetime-local',wrapper=document.createElement('div');wrapper.className='datetime-fields';const date=dated?document.createElement('input'):null;if(date){date.type='date';date.setAttribute('aria-label',(input.getAttribute('aria-label')||'알림')+' 날짜');wrapper.append(date);}
 const pair=document.createElement('div');pair.className='split-time';const hour=document.createElement('input'),minute=document.createElement('input'),second=input.step==='1'?document.createElement('input'):null,colon=document.createElement('span');colon.textContent=':';
 for(const [node,label]of [[hour,'시'],[minute,'분'],...(second?[[second,'초']]:[])]){node.type='text';node.inputMode='numeric';node.maxLength=2;node.setAttribute('aria-label',(input.getAttribute('aria-label')||'알림 시간')+' '+label);}
 pair.append(hour,colon,minute);if(second){const sep=document.createElement('span');sep.textContent=':';pair.append(sep,second);}wrapper.append(pair);input.after(wrapper);input.hidden=true;
 const sync=()=>{const value=descriptor.get.call(input),parts=(dated?value.split('T')[1]:value)?.split(':')||[];if(date)date.value=value.split('T')[0]||'';hour.value=parts[0]||'';minute.value=parts[1]||'';if(second)second.value=parts[2]||'00';};
 Object.defineProperty(input,'value',{get(){return descriptor.get.call(this);},set(value){descriptor.set.call(this,value);sync();},configurable:true});sync();
 const update=()=>{hour.value=hour.value.replace(/\D/g,'').slice(0,2);minute.value=minute.value.replace(/\D/g,'').slice(0,2);if(second)second.value=second.value.replace(/\D/g,'').slice(0,2);const valid=hour.value!==''&&minute.value!==''&&+hour.value<=23&&+minute.value<=59&&(!second||(second.value!==''&&+second.value<=59))&&(!dated||date.value);descriptor.set.call(input,valid?(dated?date.value+'T':'')+hour.value.padStart(2,'0')+':'+minute.value.padStart(2,'0')+(second?':'+second.value.padStart(2,'0'):''):'');input.dispatchEvent(new Event('change',{bubbles:true}));};
 for(const node of [date,hour,minute,second].filter(Boolean)){node.addEventListener('input',update);node.addEventListener('blur',()=>{if(node!==date&&node.value)node.value=node.value.padStart(2,'0');update();});}
 }
 const scan=()=>document.querySelectorAll('input[type="datetime-local"],input[type="time"]').forEach(enhance);scan();new MutationObserver(scan).observe(document.body,{childList:true,subtree:true});
});
