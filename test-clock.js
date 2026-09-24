(function(root){
 const RealDate=root.Date;let offset=0;
 class AppDate extends RealDate{constructor(...args){super(...(args.length?args:[RealDate.now()+offset]));}static now(){return RealDate.now()+offset;}}
 function install(value){offset=Number(value)||0;root.Date=AppDate;return offset;}
 const api={install,offset:()=>offset,realNow:()=>RealDate.now(),setTime:at=>{if(at===null)return install(0);const t=+new RealDate(at);if(!Number.isFinite(t))throw Error('테스트 날짜와 시간 확인 필요');return install(t-RealDate.now());}};
 if(typeof module!=='undefined')module.exports=api;
 else {install(root.calendarAPI?.getTestClockOffset?.()||0);root.TestClock=api;}
})(globalThis);
