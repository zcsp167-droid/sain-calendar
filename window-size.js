exports.initial=(saved,area)=>({width:Math.min(area.width,Math.max(460,saved.fitVersion===2&&Number.isFinite(saved.width)?saved.width:1024)),height:Math.min(area.height,Math.max(480,saved.fitVersion===2&&Number.isFinite(saved.height)?saved.height:768))});
exports.zoom=(width,height)=>Math.min(1,width/1100,height/1040);

