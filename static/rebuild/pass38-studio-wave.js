(()=>{
const W=window.SR38=window.SR38||{};
W.render=function(){
  const board=document.querySelector('#sr38board');
  if(!board||!W.tracks)return;
  board.innerHTML='';
  W.tracks.forEach((lane,i)=>{
    const el=document.createElement('div');
    el.className='sr38lane '+(i===W.sel?'on':'');
    el.dataset.lane=i;
    const width=Math.max(8,(lane.end||80)-(lane.start||10));
    el.innerHTML='<canvas class="sr38wave"></canvas><div class="sr38tag">Lane '+(i+1)+': '+(lane.name||'Empty')+' · '+(lane.fx||'Clean')+'</div><div class="sr38piece" style="left:'+(lane.pos||0)+'%;width:'+width+'%"></div>';
    board.appendChild(el);
    const canvas=el.querySelector('canvas');
    const ctx=canvas.getContext('2d');
    canvas.width=el.offsetWidth||800;
    canvas.height=el.offsetHeight||80;
    const peaks=lane.peaks&&lane.peaks.length?lane.peaks:Array.from({length:100},(_,n)=>Math.abs(Math.sin(n*.21+i))*.35);
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle='#020813';
    ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.lineWidth=2;
    ctx.shadowColor=i===W.sel?'#a9cf43':'#61efff';
    ctx.shadowBlur=14;
    ctx.strokeStyle=i===W.sel?'#a9cf43':'#9ff9ff';
    ctx.beginPath();
    for(let x=0;x<canvas.width;x++){
      const v=peaks[Math.floor(x/canvas.width*peaks.length)]||0;
      const y=canvas.height/2-v*canvas.height*.42;
      if(x===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
    }
    ctx.stroke();
    ctx.shadowBlur=8;
    ctx.strokeStyle='rgba(97,239,255,.34)';
    ctx.beginPath();
    for(let x=0;x<canvas.width;x++){
      const v=peaks[Math.floor(x/canvas.width*peaks.length)]||0;
      const y=canvas.height/2+v*canvas.height*.42;
      if(x===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
    }
    ctx.stroke();
  });
};
W.makeUploadPeaks=async function(file){
  try{
    const AC=window.AudioContext||window.webkitAudioContext;
    const ctx=new AC();
    const ab=await file.arrayBuffer();
    const buf=await ctx.decodeAudioData(ab);
    const data=buf.getChannelData(0);
    const n=140,out=[];
    for(let i=0;i<n;i++){
      const s=Math.floor(i*data.length/n),e=Math.floor((i+1)*data.length/n);
      let m=0;for(let j=s;j<e;j++)m=Math.max(m,Math.abs(data[j]));
      out.push(m);
    }
    return out;
  }catch(e){
    return Array.from({length:140},(_,i)=>Math.abs(Math.sin(i*.17))*Math.random());
  }
};
W.animateSelected=function(mode){
  if(W._raf)cancelAnimationFrame(W._raf);
  let t=0;
  const tick=()=>{
    const lane=W.tracks&&W.tracks[W.sel];
    if(lane){
      lane.peaks=(lane.peaks||Array(120).fill(.05)).map((v,i)=>Math.max(.02,Math.min(1,v*.9+Math.abs(Math.sin(i*.18+t))*(mode==='record'?.32:.08))));
      W.render&&W.render();
    }
    t+=.18;W._raf=requestAnimationFrame(tick);
  };
  tick();
};
})();