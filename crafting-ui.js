const purchaseRecommendations=['iron',...['fire','water','wind','thunder','earth'].map(e=>'spirit_'+e),'dust','power','powder','redPowder','blackPowder'];
let craftBase=null,craftPreferences={};
const materialUnitMode=new Set();
const materialClosed=new Set();
let craftViewElement=null;const totalExpanded=new Set();
let craftStage='sam',craftDraft={},craftSaving=false,craftExpanded=new Set(),sourceFocus=null;
function craftDraftState(){const next={...craftBase,...craftPreferences,tabletQty:craftBase.tabletQty.slice(),craftInventory:{...craftBase.craftInventory}};for(const [id,value]of Object.entries(craftDraft)){const link=Crafting.stockLink(craftBase,id);if(link==='hasSamSword')next.hasSamSword=value===1;else if(link?.startsWith('tablet'))next.tabletQty[+link.slice(6)]=value;else if(link)next[link]=value;else next.craftInventory[id]=value;}return next;}
async function saveCraft(extra={}){
 if(craftSaving)return false;
 try{
  if(Object.values(craftDraft).some(v=>!Number.isInteger(v)||v<0))throw Error('보유량 0 이상 정수 입력 필요');
  if('sam' in craftDraft&&craftDraft.sam>1)throw Error('삼인검 보유량 0 또는 1 입력 필요');
  if(!Object.keys(craftDraft).length&&!Object.keys(craftPreferences).length&&!Object.keys(extra).length)return true;
  craftSaving=true;$('craftSave').disabled=true;$('craftError').textContent='';
  const next=craftDraftState(),patch={...craftPreferences,...extra};for(const id of Object.keys(craftDraft)){const link=Crafting.stockLink(craftBase,id);if(link?.startsWith('tablet'))patch.tabletQty=next.tabletQty;else if(link)patch[link]=next[link];else patch.craftInventory=next.craftInventory;}
  const r=await window.calendarAPI.saveSettings({...patch,expectedValues:craftBase});if(!r.ok)throw Error(r.error);if(r.data)state=Model.normalize(r.data);craftBase=structuredClone(state);craftDraft={};craftPreferences={};$('craftStatus').textContent='변경 내용 적용 완료';return true;
 }catch(e){$('craftError').textContent=e.message;return false;}finally{craftSaving=false;$('craftSave').disabled=false;}
}
function craftNode(id){return id==='sain'?Crafting.rootItem(craftViewElement||state.craftElement):Crafting.items[id];}
function nodeRecipe(id){const n=craftNode(id);return n.recipe||n.optionalRecipe;}
function treeChildren(id){return craftStage==='sain'&&id==='sam'?[]:nodeRecipe(id)?.entries||[];}
function showCraftSource(id){
 const node=craftNode(id);$('craftSourceTitle').textContent=node.name;$('craftSourceBody').replaceChildren();
 if(id==='sam'&&craftStage==='sain')$('craftSourceBody').append(compactEl('p','삼인검 1개 필요 · 상세 제작 재료: 삼인검 재료 창 참조'));
 if(node.buy)$('craftSourceBody').append(compactEl('p',nodeRecipe(id)?'육의전 구매 / 직접 제작':'육의전 구매 가능'));
 for(const line of node.guide)$('craftSourceBody').append(compactEl('p',line));
 if(node.guide.some(line=>/약초|채광|연금술|채집/.test(line)))$('craftSourceBody').append(compactEl('p','게임 내 B → 아이템 탭 → 아이템명 검색 → 아이템 정보 → 습득 정보에서 확인','hint'));
 else if(node.buy)$('craftSourceBody').append(compactEl('p','게임 내 B → 몬스터 → 검색 구분 ‘전리품’ → 재료명 검색으로도 확인 가능','hint'));
 if(id==='ironFragment'){const list=compactEl('div','','stack');list.append(compactEl('strong','퀘스트 1회 제출 재료'));for(const [material,qty]of [['sickle',5],['wing',5]])list.append(compactButton(Crafting.items[material].name+' '+qty+'개',()=>openQuestMaterial(material)));$('craftSourceBody').append(list);}
 sourceFocus=document.activeElement;$('craftSourceModal').hidden=false;$('craftSourceClose').focus();
}
function treeCard(id,needs,isRoot=false,branchNeed=1){
 const node=craftNode(id),branch=compactEl('div','','craft-branch'),card=compactEl('div','','craft-card');branch.dataset.node=id;branch.classList.toggle('craft-root',isRoot);
 card.append(compactEl('strong',node.name,'craft-card-title'),compactEl('span',branchNeed.toLocaleString()+'개','craft-card-quantity'));
 if(!isRoot){const actions=compactEl('div','','craft-card-actions');actions.append(compactButton('획득처',()=>showCraftSource(id)));if(treeChildren(id).length)actions.append(compactButton('제작 재료',()=>openRecipe(id)));card.append(actions);}
 branch.append(card);
 if(isRoot){const list=compactEl('div','','craft-children');for(const child of treeChildren(id))list.append(treeCard(child.id,needs,false,child.qty/nodeRecipe(id).yieldQty));branch.append(list);}
 return branch;
}
const recipeHistory=[];
const recipeModal=compactEl('div','','modal');recipeModal.id='recipeModal';recipeModal.hidden=true;
const recipeBox=compactEl('div','','modal-box stack'),recipeTitle=compactEl('h2'),recipeClose=compactButton('닫기',closeRecipe),recipeHead=compactEl('div','','row spread'),recipeBody=compactEl('div');recipeBody.id='recipeBody';recipeHead.append(recipeTitle,recipeClose);recipeBox.append(recipeHead,compactEl('p','이 제작품 1개 기준','hint'),recipeBody);recipeModal.append(recipeBox);document.body.append(recipeModal);
function renderRecipe(){const id=recipeHistory.at(-1);recipeTitle.textContent=craftNode(id).name+' 제작 재료';const canvas=compactEl('div','','craft-canvas');canvas.append(treeCard(id,{},true));recipeBody.replaceChildren(canvas);requestAnimationFrame(drawCraftLines);}
function openRecipe(id){recipeHistory.push(id);recipeModal.hidden=false;$('craftModal').inert=true;renderRecipe();recipeClose.focus();}
function closeRecipe(){recipeHistory.pop();if(recipeHistory.length)renderRecipe();else{recipeModal.hidden=true;$('craftModal').inert=false;$('craftClose').focus();}}
new ResizeObserver(()=>requestAnimationFrame(drawCraftLines)).observe(recipeBody);
function renderCraft(){
 const root=craftStage==='sam'?'sam':'sain';$('craftHeading').textContent=craftStage==='sam'?'삼인검 제작 재료':craftStage==='all'?'삼인검 + 사인검 전체 재료':'사인검 제작 재료';$('craftElementRow').hidden=true;$('craftElement').value=state.craftElement||'fire';
 const rootNode=craftStage==='sam'?'sam':'sain';renderUnifiedMaterials(rootNode);$('craftBody').replaceChildren();$('craftBody').hidden=true;
 $('craftScope').textContent='처음에는 전체 펼침 · 화살표로 접기 · 재료명 클릭 시 획득처 · 보유량 / 제작 수량';

}
function openCraftTree(stage,preferences={}){craftBase=structuredClone(state);craftPreferences={...preferences};craftStage=stage;totalExpanded.clear();materialClosed.clear();materialUnitMode.clear();craftDraft={};craftExpanded=new Set();$('craftError').textContent='';$('craftStatus').textContent='';renderCraft();$('craftModal').hidden=false;$('craftBody').scrollTop=0;$('craftClose').focus();$('craftChooser').inert=true;}
for(const e of Crafting.elements){const o=document.createElement('option');o.value=e.id;o.textContent=e.label+' · '+e.beast;$('craftElement').append(o);}
$('craftBtn').onclick=()=>{$('craftChooser').hidden=false;$('chooseSam').focus();};
$('craftChooserClose').onclick=()=>{$('craftChooser').hidden=true;$('craftBtn').focus();};
$('chooseSam').onclick=()=>openCraftTree('sam');$('chooseSain').onclick=()=>{if(state.canSainMission&&state.craftElementSelected){craftViewElement=state.craftElement;openCraftTree('sain');}else chooseCraftElement();};

const chooseAll=compactButton('삼인검 + 사인검 전체 재료',()=>{if(state.craftElementSelected){craftViewElement=state.craftElement;openCraftTree('all');}else chooseCraftElement('all');});chooseAll.id='chooseAll';chooseAll.className='craft-choice';$('chooseSam').parentElement.append(chooseAll);
function closeCraft(){if(craftSaving)return;craftDraft={};craftPreferences={};$('craftModal').hidden=true;$('craftChooser').inert=false;$(craftStage==='sam'?'chooseSam':craftStage==='all'?'chooseAll':'chooseSain').focus();}
$('craftClose').onclick=closeCraft;
$('craftSourceClose').onclick=()=>{$('craftSourceModal').hidden=true;$('craftModal').inert=!recipeModal.hidden;recipeModal.inert=false;sourceFocus?.focus();};
const openSource=showCraftSource;showCraftSource=function(id){openSource(id);$('craftModal').inert=true;if(!recipeModal.hidden)recipeModal.inert=true;};
$('craftSave').onclick=async()=>{if(await saveCraft())closeCraft();};
$('craftElement').onchange=()=>{craftPreferences.craftElement=$('craftElement').value;craftViewElement=craftPreferences.craftElement;craftExpanded=new Set();renderCraft();};
document.addEventListener('keydown',e=>{if(e.key!=='Escape')return;if(!purchaseModal.hidden){e.preventDefault();closePurchaseChoices();return;}if(!elementChooser.hidden){e.preventDefault();elementChooser.hidden=true;return;}if(!$('questMaterialModal').hidden){e.preventDefault();$('questMaterialClose').click();}else if(!$('craftSourceModal').hidden){e.preventDefault();$('craftSourceClose').click();}else if(!recipeModal.hidden){e.preventDefault();closeRecipe();}else if(!$('craftModal').hidden){e.preventDefault();$('craftClose').click();}else if(!$('craftChooser').hidden){e.preventDefault();$('craftChooserClose').click();}});
function totalMaterials(root){
 const snapshot=craftDraftState(),all={},order=[],depth={};
 function discover(id,d){depth[id]=Math.max(depth[id]||0,d);if(!order.includes(id))order.push(id);if(id===root||totalExpanded.has(id))for(const c of nodeRecipe(id)?.entries||[])discover(c.id,d+1);}
 discover(root,0);all[root]=1;
 for(const id of [...order].sort((a,b)=>depth[a]-depth[b])){if(id!==root&&!totalExpanded.has(id))continue;const r=nodeRecipe(id);if(!r)continue;const qty=id===root?1:Math.max(0,(all[id]||0)-Crafting.owned(snapshot,id));for(const c of r.entries)all[c.id]=(all[c.id]||0)+qty*c.qty/r.yieldQty;}
 return order.filter(id=>id!==root&&!totalExpanded.has(id)&&all[id]>0).map(id=>[id,Math.ceil(all[id])]);
}
function renderUnifiedMaterials(root){
 const host=$('craftTotals'),snapshot=craftDraftState();host.replaceChildren();
 const unique=new Set(),visited=new Set();function count(id){if(visited.has(id))return;visited.add(id);const children=nodeRecipe(id)?.entries||[];if(!children.length){if(id!==root&&id!=='money')unique.add(id);return;}for(const c of children)count(c.id);}count(root);count('questTicket');
 $('craftHeading').textContent=(craftStage==='sam'?'삼인검 제작 재료':craftStage==='all'?'삼인검 + 사인검 전체 재료':'사인검 제작 재료')+' · 원재료 '+unique.size+'종';
 const controls=compactEl('div','','material-controls');controls.append(compactButton('모두 펼치기',()=>{materialClosed.clear();paint();}),compactButton('모두 접기',()=>{collect(root,root);paint();}));const allQuests=document.createElement('input');allQuests.type='checkbox';allQuests.checked=craftDraftState().craftHiddenQuests.length===2;allQuests.indeterminate=craftDraftState().craftHiddenQuests.length===1;allQuests.onchange=()=>saveMaterialPreferences({craftHiddenQuests:allQuests.checked?['ironFragment','questTicket']:[]});const questLabel=compactEl('label','','material-check');questLabel.append(allQuests,document.createTextNode('퀘스트 재료 숨김'));controls.append(questLabel,compactButton('육의전 구매 추천 모두 적용',openPurchaseChoices));host.append(controls);
 function collect(id,path){if(path!==root)materialClosed.add(path);for(const c of treeChildren(id))collect(c.id,path+'/'+c.id);}
 function paint(){renderUnifiedMaterials(root);}
 function isHidden(id){return craftNode(id).quest?craftDraftState().craftHiddenQuests.includes(id):craftDraftState().craftBuyRecommended.includes(id);}
 function row(id,need,path,unit,ideal=need){const node=craftNode(id),entry=compactEl('div','','material-entry');entry.dataset.material=id;
  const children=treeChildren(id);if(children.length){const toggle=compactButton(materialClosed.has(path)||isHidden(id)?'▶':'▼',async()=>{if(isHidden(id)){materialClosed.delete(path);const field=craftNode(id).quest?'craftHiddenQuests':'craftBuyRecommended';await saveMaterialPreferences({[field]:craftDraftState()[field].filter(value=>value!==id)});}else{materialClosed.has(path)?materialClosed.delete(path):materialClosed.add(path);paint();}host.querySelector(`[data-material-path="${path}"]`)?.focus();});toggle.dataset.materialPath=path;toggle.setAttribute('aria-label',node.name+' 하위 재료');toggle.setAttribute('aria-expanded',String(!materialClosed.has(path)&&!isHidden(id)));entry.append(toggle);}else entry.append(compactEl('span','·','material-dot'));
  const name=compactButton(node.name,()=>showCraftSource(id));name.className='material-name';name.title='획득처 보기';entry.append(name);
  if(!unit){const input=document.createElement('input');input.type='text';input.inputMode='numeric';input.value=Crafting.owned(snapshot,id);input.dataset.craftId=id;input.setAttribute('aria-label',node.name+' 보유량');entry.append(input);}
  const quantity=compactEl('span',(unit?'':'/ ')+(Number.isFinite(need)?need.toLocaleString():'확률 재련')+(unit?'개':''),'material-quantity');quantity.dataset.amount=ideal;entry.append(quantity);return entry;
 }
 function group(parent,amount,path,inheritedUnit=false,idealAmount=amount){const box=compactEl('div','','material-group'),siblings=compactEl('div','','material-siblings material-box'),branches=[];
  const ownUnit=materialUnitMode.has(path),unit=inheritedUnit||ownUnit,displayAmount=ownUnit?1:amount;
  const header=compactEl('div','','material-box-heading');header.append(compactEl('span',parent==='questTicket'?'임무 수행서 획득 · 일요일 퀘스트 1회':parent==='ironFragment'?'철제검 조각 퀘스트 '+displayAmount.toLocaleString()+'회':craftNode(parent).name+' '+displayAmount.toLocaleString()+'개 제작','material-parent'));
  const hold=compactButton(craftNode(parent).quest?'1회 기준 보기':'1개 기준 보기',()=>{});hold.className='material-unit-hold';hold.setAttribute('aria-label',craftNode(parent).name+(craftNode(parent).quest?' 1회 기준 보기':' 1개 기준 보기'));hold.setAttribute('aria-pressed','false');
  let showing=false;const restore=[];
  function release(){if(!showing)return;showing=false;for(const fn of restore.splice(0))fn();hold.setAttribute('aria-pressed','false');}
  function press(){if(showing)return;showing=true;hold.setAttribute('aria-pressed','true');for(const input of box.querySelectorAll('input[data-craft-id]')){const was=input.hidden;input.hidden=true;restore.push(()=>input.hidden=was);}for(const quantity of box.querySelectorAll('.material-quantity')){const old=quantity.textContent;quantity.textContent=Number.isFinite(Number(quantity.dataset.amount))?(Number(quantity.dataset.amount)/idealAmount*(craftNode(parent).quest?nodeRecipe(parent).yieldQty:1)).toLocaleString()+'개':'확률 재련';restore.push(()=>quantity.textContent=old);}for(const title of box.querySelectorAll('.material-parent')){const old=title.textContent;if(title.dataset.amount){title.textContent=title.dataset.quest==='true'?title.dataset.name+' 퀘스트 '+(Number(title.dataset.amount)/idealAmount*(craftNode(parent).quest?nodeRecipe(parent).yieldQty:1)).toLocaleString()+'회':title.dataset.name+' '+(Number(title.dataset.amount)/idealAmount).toLocaleString()+'개 제작';restore.push(()=>title.textContent=old);}}}
  header.firstElementChild.dataset.quest=String(!!craftNode(parent).quest);header.firstElementChild.dataset.amount=idealAmount;header.firstElementChild.dataset.name=craftNode(parent).name;
  hold.onpointerdown=e=>{if(e.button!==0)return;e.preventDefault();hold.focus();press();};hold.onpointerup=release;hold.onpointerleave=release;hold.onpointercancel=release;hold.onblur=release;
  hold.onkeydown=e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();press();}};hold.onkeyup=e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();release();}};
  if(parent!=='questTicket')header.append(hold);
  const quest=!!craftNode(parent).quest,recommended=purchaseRecommendations.includes(parent),hidden=quest?craftDraftState().craftHiddenQuests.includes(parent):recommended&&craftDraftState().craftBuyRecommended.includes(parent);
  if(quest||recommended){const check=document.createElement('input');check.type='checkbox';check.checked=hidden;check.setAttribute('aria-label',craftNode(parent).name+(quest?' 퀘스트 재료 숨김':' 완제품 육의전 구매 추천'));check.onchange=()=>{const field=quest?'craftHiddenQuests':'craftBuyRecommended',values=new Set(craftDraftState()[field]);check.checked?values.add(parent):values.delete(parent);saveMaterialPreferences({[field]:[...values]});};const label=compactEl('label','','material-check');label.append(check,document.createTextNode(quest?'퀘스트 재료 숨김':'완제품 육의전 구매 추천'));header.append(label);}
  if(parent==='questTicket')header.append(compactEl('span','수행서 2장 획득 → 주막 임무 → 석판·보석 조각 · 아래 수량은 퀘스트 1회분','hint'));
  if(!quest&&nodeRecipe(parent).uncertain)header.append(compactEl('span','확률 재련 · 소모 수량 미정','hint'));else if(!quest&&nodeRecipe(parent).yieldQty>1)header.append(compactEl('span','1회 '+nodeRecipe(parent).yieldQty+'개 생산 · 전체 수량은 제작 횟수 올림','hint'));siblings.append(header);

  if(!hidden)for(const child of treeChildren(parent)){const qty=nodeRecipe(parent).uncertain?NaN:Math.ceil(displayAmount/nodeRecipe(parent).yieldQty)*child.qty,key=path+'/'+child.id,ideal=nodeRecipe(parent).uncertain?NaN:idealAmount*child.qty/nodeRecipe(parent).yieldQty;siblings.append(row(child.id,qty,key,unit,ideal));if(treeChildren(child.id).length&&!materialClosed.has(key)&&!isHidden(child.id)){const branch=compactEl('section','','material-branch');branch.append(group(child.id,qty,key,unit,ideal));branches.push(branch);}}
  siblings.append(...branches);box.append(siblings);return box;
 }
 host.append(group('questTicket',2,'questTicket'));host.append(group(root,1,root));bindCraftInputs();
}
const elementChooser=compactEl('div','','modal');elementChooser.id='elementChooser';elementChooser.hidden=true;document.body.append(elementChooser);
function chooseCraftElement(stage='sain'){elementChooser.replaceChildren();const box=compactEl('div','','modal-box stack');box.append(compactEl('h2','사인검 속성 선택'));for(const e of Crafting.elements)box.append(compactButton(e.label+' · '+e.gem,()=>{craftViewElement=e.id;elementChooser.hidden=true;openCraftTree(stage,state.canSainMission||stage==='all'?{craftElement:e.id,craftElementSelected:true}:{});}));box.append(compactButton('닫기',()=>elementChooser.hidden=true));elementChooser.append(box);elementChooser.hidden=false;}
function bindCraftInputs(){for(const input of $('craftModal').querySelectorAll('input[data-craft-id]'))input.oninput=()=>{const id=input.dataset.craftId,n=input.value.trim()===''?NaN:Number(input.value);craftDraft[id]=n;for(const other of $('craftModal').querySelectorAll('input[data-craft-id]'))if(other.dataset.craftId===id&&other!==input)other.value=input.value;$('craftStatus').textContent='‘확인 · 적용’ 클릭 시 보유량과 옵션 함께 저장';};}
function drawCraftLines(){
 for(const host of [$('craftBody'),recipeBody]){const canvas=host.querySelector('.craft-canvas');if(!canvas||!canvas.getClientRects().length)continue;canvas.querySelector('svg')?.remove();
 const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg'),base=canvas.getBoundingClientRect();svg.classList.add('craft-lines');svg.setAttribute('width',canvas.scrollWidth);svg.setAttribute('height',canvas.scrollHeight);
 const rect=el=>{const r=el.getBoundingClientRect();return {x:r.left-base.left,y:r.top-base.top,w:r.width,h:r.height};};const line=d=>{const path=document.createElementNS(ns,'path');path.setAttribute('d',d);svg.append(path);};
 const branch=canvas.querySelector('.craft-root'),parent=rect(branch.querySelector(':scope>.craft-card')),cards=[...branch.querySelectorAll(':scope>.craft-children>.craft-branch>.craft-card')].map(rect);if(!cards.length)continue;
 const px=parent.x+parent.w/2,py=parent.y+parent.h,y=cards[0].y-14;
 line(`M${px},${py} V${y}`);line(`M${cards[0].x+cards[0].w/2},${y} H${cards.at(-1).x+cards.at(-1).w/2}`);for(const c of cards)line(`M${c.x+c.w/2},${y} V${c.y}`);canvas.prepend(svg);
 }
}
new ResizeObserver(()=>requestAnimationFrame(drawCraftLines)).observe($('craftBody'));
let questMaterialFocus=null;
function openQuestMaterial(id){questMaterialFocus=document.activeElement;const item=Crafting.items[id];$('questMaterialTitle').textContent=item.name;$('questMaterialBody').replaceChildren(...item.guide.map(t=>compactEl('p',t)));$('questMaterialModal').hidden=false;$('craftSourceModal').inert=true;$('questMaterialClose').focus();}
$('questMaterialClose').onclick=()=>{$('questMaterialModal').hidden=true;$('craftSourceModal').inert=false;questMaterialFocus?.focus();};

function saveMaterialPreferences(patch){Object.assign(craftPreferences,patch);renderUnifiedMaterials(craftStage==='sam'?'sam':'sain');$('craftStatus').textContent='‘확인 · 적용’ 클릭 시 변경 내용 저장';}
const purchaseModal=compactEl('div','','modal');purchaseModal.id='purchaseModal';purchaseModal.hidden=true;document.body.append(purchaseModal);
function closePurchaseChoices(){purchaseModal.hidden=true;$('craftModal').inert=false;}
function openPurchaseChoices(){purchaseModal.replaceChildren();const box=compactEl('div','','modal-box stack'),selected=new Set(craftDraftState().craftBuyRecommended);box.append(compactEl('h2','육의전 구매 추천 항목 선택'),compactEl('p','체크 항목의 하위 제작 재료만 숨김','hint'));
 for(const id of purchaseRecommendations){const label=compactEl('label','','material-check'),input=document.createElement('input');input.type='checkbox';input.checked=selected.has(id);input.dataset.purchase=id;input.onchange=()=>input.checked?selected.add(id):selected.delete(id);label.append(input,document.createTextNode(Crafting.items[id].name));box.append(label);}
 const actions=compactEl('div','','row');actions.append(compactButton('선택 확인',async()=>{await saveMaterialPreferences({craftBuyRecommended:[...selected]});closePurchaseChoices();}),compactButton('닫기',closePurchaseChoices));box.append(actions);purchaseModal.append(box);purchaseModal.hidden=false;$('craftModal').inert=true;box.querySelector('input').focus();}
