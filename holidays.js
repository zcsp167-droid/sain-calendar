// 공휴일: 2026~2028년은 고정 표(선거일·임시공휴일 포함) · 2029년부터 법정 공휴일·대체공휴일 규칙으로 자동 계산(선거일·임시공휴일 미포함)
const HOLIDAYS=(()=>{
 const table={"2026-01-01":"신정","2026-02-16":"설날 연휴","2026-02-17":"설날","2026-02-18":"설날 연휴","2026-03-01":"삼일절","2026-03-02":"대체공휴일(삼일절)","2026-05-01":"근로자의 날","2026-05-05":"어린이날","2026-05-24":"부처님오신날","2026-05-25":"대체공휴일(부처님오신날)","2026-06-03":"임시공휴일(지방선거)","2026-06-06":"현충일","2026-07-17":"제헌절","2026-08-15":"광복절","2026-08-17":"대체공휴일(광복절)","2026-09-24":"추석 연휴","2026-09-25":"추석","2026-09-26":"추석 연휴","2026-10-03":"개천절","2026-10-05":"대체공휴일(개천절)","2026-10-09":"한글날","2026-12-25":"성탄절","2027-01-01":"신정","2027-02-06":"설날 연휴","2027-02-07":"설날","2027-02-08":"설날 연휴","2027-02-09":"대체공휴일(설날)","2027-03-01":"삼일절","2027-05-01":"근로자의 날","2027-05-03":"대체공휴일(근로자의날)","2027-05-05":"어린이날","2027-05-13":"부처님오신날","2027-06-06":"현충일","2027-07-17":"제헌절","2027-07-19":"대체공휴일(제헌절)","2027-08-15":"광복절","2027-08-16":"대체공휴일(광복절)","2027-09-14":"추석 연휴","2027-09-15":"추석","2027-09-16":"추석 연휴","2027-10-03":"개천절","2027-10-04":"대체공휴일(개천절)","2027-10-09":"한글날","2027-10-11":"대체공휴일(한글날)","2027-12-25":"성탄절","2027-12-27":"대체공휴일(성탄절)","2028-01-01":"신정","2028-01-26":"설날 연휴","2028-01-27":"설날","2028-01-28":"설날 연휴","2028-03-01":"삼일절","2028-04-12":"국회의원 선거일","2028-05-01":"근로자의 날","2028-05-02":"부처님오신날","2028-05-05":"어린이날","2028-06-06":"현충일","2028-07-17":"제헌절","2028-08-15":"광복절","2028-10-02":"추석 연휴","2028-10-03":"추석·개천절","2028-10-04":"추석 연휴","2028-10-05":"대체공휴일(추석·개천절)","2028-10-09":"한글날","2028-12-25":"성탄절"};
 const RULE_FROM=2029,RULE_TO=2060;
 const key=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
 let lunar=null;try{lunar=new Intl.DateTimeFormat('ko-KR-u-ca-dangi',{month:'numeric',day:'numeric'});}catch{}
 // 음력 날짜(윤달 제외) 찾기: 양력 검색 구간 안에서 음력 month/day가 정확히 일치하는 날
 function lunarDate(year,month,day,fromMonth,toMonth){
  if(!lunar)return null;
  for(const d=new Date(year,fromMonth-1,1,12);d.getMonth()<=toMonth-1&&d.getFullYear()===year;d.setDate(d.getDate()+1)){
   const parts=lunar.formatToParts(d),m=parts.find(x=>x.type==='month')?.value,dd=parts.find(x=>x.type==='day')?.value;
   if(m===String(month)&&dd===String(day))return new Date(d);
  }
  return null;
 }
 function rules(year){
  const names={},add=(d,name)=>{(names[key(d)]??=[]).push(name);},at=(m,d)=>new Date(year,m-1,d,12),shift=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x;};
  const fixed=[[1,1,'신정'],[3,1,'삼일절'],[5,1,'근로자의 날'],[5,5,'어린이날'],[6,6,'현충일'],[7,17,'제헌절'],[8,15,'광복절'],[10,3,'개천절'],[10,9,'한글날'],[12,25,'성탄절']];
  const seol=lunarDate(year,1,1,1,2),buddha=lunarDate(year,4,8,4,6),chuseok=lunarDate(year,8,15,8,10);
  const periods=[];
  for(const [day,name]of [[seol,'설날'],[chuseok,'추석']])if(day){const days=[shift(day,-1),day,shift(day,1)];days.forEach((d,i)=>add(d,i===1?name:name+' 연휴'));periods.push([days,name]);}
  if(buddha)add(buddha,'부처님오신날');
  for(const [m,d,name]of fixed)add(at(m,d),name);
  const isHoliday=d=>!!names[key(d)],weekday=d=>d.getDay()>0&&d.getDay()<6;
  // 대체공휴일: 겹친 날 수만큼 이후 첫 평일(공휴일 아님)에 지정
  const substitute=(after,label,count)=>{let d=shift(after,1);while(count>0){if(weekday(d)&&!isHoliday(d)){add(d,'대체공휴일('+label+')');count--;}d=shift(d,1);}};
  for(const [days,name]of periods){const overlap=days.filter(d=>d.getDay()===0||names[key(d)].length>1).length;if(overlap)substitute(days[2],name,overlap);}
  const child=at(5,5);if(!weekday(child)||names[key(child)].length>1)substitute(child,'어린이날',1);
  // 토·일과 겹치면 대체: 삼일절·근로자의 날·제헌절·광복절·개천절·한글날·부처님오신날·성탄절
  const weekendRule=[[at(3,1),'삼일절'],[at(5,1),'근로자의날'],[at(7,17),'제헌절'],[at(8,15),'광복절'],[at(10,3),'개천절'],[at(10,9),'한글날'],...(buddha?[[buddha,'부처님오신날']]:[]),[at(12,25),'성탄절']];
  for(const [d,label]of weekendRule)if(!weekday(d))substitute(d,label,1);
  return Object.fromEntries(Object.entries(names).map(([k,list])=>[k,list.join('·')]));
 }
 const all={...table};for(let y=RULE_FROM;y<=RULE_TO;y++)Object.assign(all,rules(y));
 Object.defineProperty(all,'__rules',{value:rules,enumerable:false});
 return all;
})();

if(typeof module!=='undefined')module.exports=HOLIDAYS;
