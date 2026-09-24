(function(root){
function decode(q){
 if(!Array.isArray(q)||q.length!==5||q.some(n=>!Number.isInteger(n)||n<0))throw Error('수령 불가 보상 조합 · 입력 개수 확인 필요');
 const patterns=[{q:[2,2,0,0,0],action:0,box:null},{q:[0,0,2,2,0],action:1,box:null}];
 for(let box=0;box<5;box++){const a=[0,0,0,0,2];a[box]+=5;patterns.push({q:a,action:2,box});}
 const found=patterns.find(p=>p.q.every((n,i)=>n===q[i]));
 if(!found)throw Error('수령 불가 보상 조합 · 입력 개수 확인 필요');
 return {action:found.action,box:found.box};
}
if(typeof module!=='undefined')module.exports={decode};else root.Reward={decode};
})(globalThis);
