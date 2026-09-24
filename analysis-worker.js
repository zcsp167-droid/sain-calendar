importScripts('solver.js');
onmessage=event=>{try{postMessage({id:event.data.id,result:Solver.analyze(event.data.input)});}catch(e){postMessage({id:event.data.id,error:e.message});}};
