(function(root){
 'use strict';
 const items={},elements=[
  {id:'fire',label:'화(火)',beast:'주작',prefix:'불타는',gem:'홍옥',stone:'화염석',seal:'불',index:0,places:['진시황릉 지하궁전: 불사의 진시황','유명계 2층: 불타는화룡·화염거인·화염전갈','수미산 지국천왕 지역: 신수주작·지국천왕·대신력금강·황수금강·흉포한 도철']},
  {id:'water',label:'수(水)',beast:'현무',prefix:'얼어붙은',gem:'청옥',stone:'결빙석',seal:'물',index:1,places:['해적동굴 1층: 해적선장_잭·거북궁사·해마기사','인도필드: 해적선장_잭','일본해저동굴: 황금별가사리','수미산 다문천왕 지역: 다문천왕·신수현무·냉혹한 궁기·정제재금강·청제재금강']},
  {id:'wind',label:'풍(風)',beast:'백호',prefix:'역류하는',gem:'녹주석',stone:'단풍석',seal:'바람',index:2,places:['천년호 정상: 광풍의 아우타·적고적우두머리·사령무당·박수무당','왕의무덤 1층: 사마기린','몽골필드: 모래거인','수미산 광목천왕 지역: 광목천왕·끈질긴 도올·신수백호·벽독금강·차현신금강']},
  {id:'thunder',label:'뇌(雷)',beast:'청룡',prefix:'번개치는',gem:'황옥',stone:'뇌정석',seal:'뇌',index:3,places:['귀곡성 은신처: 광뇌의 아마쿠사','귀곡성 3층: 번개거인·벼락의 사령술사·벼락의천구','대관령 계곡: 사악한이무기','소림사: 폭뢰의 기문교주','왕의무덤 1층: 사막구렁이 / 2층: 칸의주술사','수미산 증장천왕 지역: 신수청룡·증장천왕·광기의혼돈·백정수금강·적성화금강']},
  {id:'earth',label:'토(土)',beast:'기린',prefix:'격돌하는',gem:'흑요석',stone:'땅의 정령석',seal:'땅',index:4,places:['신선곡 정령탐색: 땅속성 몬스터']}
 ];
 function add(id,name,guide,recipe=null,buy=false,link=null){items[id]={id,name,guide,recipe,buy,link};}
 const recipe=(yieldQty,entries)=>({yieldQty,entries:entries.map(([id,qty])=>({id,qty}))});
 add('ironSword','철제검',['철제검 조각과 아래 재료로 제작'],recipe(1,[['ironFragment',20],['iron',500],['tin',300]]));
 add('ironFragment','철제검 조각',['원로대장장이 백칠의 금요일 퀘스트: 매주 1개 · 0개부터 20개 수집 시 20주 소요','퀘스트 1회당 날카로운 금속 낫 5개·강철 날개 5개 제출'],recipe(1,[['sickle',5],['wing',5]]),false,'ironQty');
 add('iron','철괴',['육의전 구매 추천','직접 제작: 대장장이 70레벨 이상. 제작 1회당 철 30개 + 석탄 30개.','철·석탄은 육의전 구매 또는 한라산 채광. 광부 레벨: 철 25, 석탄 40.']);items.iron.buy=true;
 add('tin','주석',['육의전 구매 추천','직접 획득: 밀림지역 채광, 광부 55레벨.'],null,true);
 add('sickle','날카로운 금속 낫',['육의전 구매 추천','진보의 삼문 드랍 — 광려산 정상·협곡.'],null,true);
 add('wing','강철 날개',['육의전 구매 추천','강철의 궁기 드랍 — 광려산 정상·협곡.'],null,true);
 add('dust','시간의 가루',['육의전 구매 추천','연금술사 70레벨 이상: 불사조의 깃털 분해.','시나리오별 낮은 확률로 드랍.'],null,true);
 add('powder','오색가루',['육의전 구매 추천','연금술사 195레벨 이상. 제작 1회당 붉은색가루·설련화·황금연꽃·늪지석균·백련초 각각 10개.'],null,true);
 add('essence','심연의 정수',['육의전 구매 가능'],null,true);
 add('money','1억 지전',['제작용 지전 준비 필요']);
 for(const e of elements){
  add('root_'+e.id,'신수의 근원('+e.beast+')',['육의전 구매 가능'],null,true);
  add('tablet_'+e.id,'조각난 '+e.beast+'의 석판',['주막 임무 ‘혼돈의 시간’(30시간) 보상·보상 상자에서 획득','2차특수임무수행서: 백칠 일요일 퀘스트에 삼문의 삿갓 10개 제출.','삼문의 삿갓: 육의전 구매 또는 각성한 삼문 드랍 — 광려산 정상·은신처.'],null,false,'tablet'+e.index);
  add('spirit_'+e.id,'사신의 정기('+e.label.match(/\((.*?)\)/)[1]+')',['육의전 구매 추천','해당 속성 사신의 조각을 통합제작에서 재련 시 확률 획득','사신의 조각은 육의전 구매 또는 해당 속성 몬스터 드랍.'],null,true);
  add('ancient_'+e.id,'고대 '+e.beast+'의 석판('+e.label.match(/\((.*?)\)/)[1]+')',['아래 재료로 고대 석판 1개 제작'],recipe(1,[['tablet_'+e.id,50],['spirit_'+e.id,20],['dust',5]]));
  add('oldSeal_'+e.id,'고대 '+e.seal+'의 인장',['육의전 구매 추천',e.id==='earth'?'샴발라부터 해당 땅 속성 몬스터 드랍':'환상계곡~샴발라 해당 속성 몬스터 드랍'],null,true);
  add('smallStone_'+e.id,'작은 '+e.seal+'의 속성석',['육의전 구매 추천','해당 속성 몬스터 대부분 드랍'],null,true);
  add('star_'+e.id,'별의 파편('+e.label.match(/\((.*?)\)/)[1]+')',['해당 속성 보석 조각을 주는 임무의 보상 상자에서 획득']);
  add('seal_'+e.id,e.prefix+' 사신의 인장',['장과로 제작법: 사신의 인장 1개 기준','제작 수수료: 3,000,000냥.'],recipe(1,[['oldSeal_'+e.id,20],['spirit_'+e.id,5],['smallStone_'+e.id,20],['stone_'+e.id,30],['powder',5]]),true);
  add('advanced_'+e.id,e.prefix+' '+e.beast+'의 석판',['삼인검 제작분과 별도로 해당 속성 고대 석판 1개 필요'],recipe(1,[['ancient_'+e.id,1],['seal_'+e.id,10],['dust',10]]));
  add('shard_'+e.id,e.gem+' 조각',['해당 속성 퀘스트·임무 보상으로 획득','사인검 임무 수령 기록 시 메인 화면 X옥 조각 보유량과 함께 반영'],null,false,'currentQty');
  add('stone_'+e.id,e.stone,['육의전 구매 추천',...e.places],null,true);
  add('gem_'+e.id,'빛나는 '+e.gem,['빛나는 보석 1개 기준 · 10개 제작 시 보석 조각 300개, 해당 별의 파편 200개, 시간의 가루 100개 필요'],recipe(1,[['shard_'+e.id,30],['star_'+e.id,20],['dust',10]]));
 }
 add('power','힘의 근원',['육의전 구매 추천','보스 몬스터 드랍 또는 직접 제작으로 획득','1개 직접 제작: 신수의 근원(주작·현무·백호·청룡·기린) 각각 5개 + 심연의 정수 5개.'],null,true);
 items.power.optionalRecipe=recipe(1,[...elements.map(e=>['root_'+e.id,5]),['essence',5]]);
 items.advanced_fire.buy=true;items.advanced_fire.guide.unshift('육의전 구매 또는 직접 제작으로 획득');

 for(const [id,name,guide]of [
 ['rawIron','철','육의전 구매 또는 한라산 채광(광부 25).'],['coal','석탄','육의전 구매 또는 한라산 채광(광부 40).'],['feather','불사조의 깃털','육의전 구매 · 연금술사 70레벨에서 1개 분해 시 시간의 가루 10개'],
 ['redPowder','붉은색가루','육의전 구매 또는 연금술사 150레벨 제작.'],['blackPowder','검은색가루','육의전 구매 또는 연금술사 125레벨 제작.'],
 ['snowLotus','설련화','육의전 구매 또는 히말라야 채집(약초꾼 210).'],['goldLotus','황금연꽃','육의전 구매 또는 늪지대 채집(약초꾼 230).'],['swamp','늪지석균','육의전 구매 또는 늪지대 채집(약초꾼 220).'],['whiteLotus','백련초','육의전 구매 또는 사막지대 채집(약초꾼 240).'],
 ['flameHerb','화염초','육의전 구매 또는 수상한동굴 채집(약초꾼 190).'],['sunHerb','태양초','육의전 구매 또는 수상한동굴 채집(약초꾼 200).'],['mushroom','상황버섯','육의전 구매 또는 백호림 채집(약초꾼 160).'],['windFlower','바람꽃','육의전 구매 또는 백호림 채집(약초꾼 170).'],['childGinseng','동자삼','육의전 구매 또는 개마장원 채집(약초꾼 180).'],['lifeEssence','생명의정수','육의전 구매.']])add(id,name,[guide],null,true);
 items.iron.optionalRecipe=recipe(30,[['rawIron',30],['coal',30]]);
 items.dust.optionalRecipe=recipe(10,[['feather',1]]);
 items.powder.optionalRecipe=recipe(10,[['redPowder',10],['snowLotus',10],['goldLotus',10],['swamp',10],['whiteLotus',10]]);
 items.redPowder.optionalRecipe=recipe(10,[['blackPowder',10],['flameHerb',10],['sunHerb',10]]);
 items.blackPowder.optionalRecipe=recipe(20,[['mushroom',10],['windFlower',10],['childGinseng',10],['lifeEssence',1]]);
 for(const e of elements){add('spiritPiece_'+e.id,'사신의 조각('+e.label.match(/\((.*?)\)/)[1]+')',['육의전 구매 또는 해당 속성 몬스터 드랍 · 사신의 정기는 확률 재련 · 목표량에 필요한 조각 수 확정 불가'],null,true);items['spirit_'+e.id].optionalRecipe={yieldQty:1,uncertain:true,entries:[{id:'spiritPiece_'+e.id,qty:1}]};}

 add('hat','삼문의 삿갓',['육의전 구매 또는 각성한 삼문 드랍 — 광려산 정상·은신처.','백칠 일요일 퀘스트 1회당 10개 제출'],null,true);
 add('questTicket','2차특수임무수행서',['백칠 일요일 퀘스트 1회: 삼문의 삿갓 10개 제출, 수행서 2장 획득.','수행서로 임무 진행 · 조각난 석판·보석 조각 등 보상 획득','삿갓 총 필요량은 실제 임무 횟수, 현재 수행서 보유량, 추가 확보 방식에 따라 변동'],recipe(2,[['hat',10]]),false,'currentTickets');
 items.ironFragment.quest=true;items.questTicket.quest=true;
 add('sam','삼인검',['철제검, 고대 석판 5종, 힘의 근원, 지전으로 제작'],recipe(1,[['ironSword',1],...elements.map(e=>['ancient_'+e.id,1]),['power',5],['money',5]]),false,'hasSamSword');
 function rootItem(element){const e=elements.find(e=>e.id===element)||elements[0];return {id:'sain',name:'사인검('+e.label.match(/\((.*?)\)/)[1]+')',guide:[],recipe:recipe(1,[['sam',1],['advanced_'+e.id,1],['gem_'+e.id,10],['power',5],['money',5]])};}
 function stockLink(s,id){return id.startsWith('shard_')&&s.craftElementSelected&&id!=='shard_'+s.craftElement?null:items[id].link;}
 function owned(s,id){const item={...items[id],link:stockLink(s,id)};if(item.link==='hasSamSword')return s.hasSamSword?1:0;if(item.link?.startsWith('tablet'))return s.tabletQty[+item.link.slice(6)];if(item.link)return s[item.link]||0;return s.craftInventory?.[id]||0;}
 function requirements(s,element,stage='all'){
  const all={...items,sain:rootItem(element)},rootId=stage==='sam'?'sam':'sain',depth={[rootId]:0};
  const children=id=>stage==='sain'&&id==='sam'?[]:all[id].recipe?.entries||[];
  function walk(id,d){if(depth[id]!==undefined&&depth[id]>d)return;depth[id]=d;for(const c of children(id))walk(c.id,d+1);}walk(rootId,0);
  const needs={[rootId]:1};for(const id of Object.keys(depth).sort((a,b)=>depth[a]-depth[b])){const n=all[id],missing=Math.max(0,(needs[id]||0)-(id==='sain'?0:owned(s,id)));for(const c of children(id))needs[c.id]=(needs[c.id]||0)+missing*c.qty/n.recipe.yieldQty;}
  for(const id of Object.keys(needs))needs[id]=Math.max(0,Math.ceil(needs[id]-1e-9));return needs;
 }
 const api={stockLink,items,elements,rootItem,owned,requirements};if(typeof module!=='undefined')module.exports=api;else root.Crafting=api;
})(globalThis);

