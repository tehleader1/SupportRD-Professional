(()=>{
const W=window.SR38=window.SR38||{};
function clips(lane){return lane.clips||(lane.url?[{name:lane.name,url:lane.url,peaks:lane.peaks||[],fx:lane.fx||'Clean',pos:lane.pos||0,start:lane.start||10,end:lane.end||80,kind:lane.kind||'upload'}]:[])}
W.render=function(){
  const board=document.querySelector('#sr38board');
  if(!board||!W.tracks)return;
  board.innerHTML='';
  W.tracks.forEach((lane,i)=>{
    lane.clips=clips(lane);
    const el=document.createElement('div');
    el.className='sr38lane '+(i===W.sel?'on':'');
    el.dataset.lane=i;
    el.innerHTML='<canvas class="sr38wave"></canvas><div class="sr38tag">Lane '+(i+1)+': '+(lane.name||('Lane '+(i+1)))+' · '+(lane.fx||'Clean')+'</div>';
    board.appendChild(el);
    const canvas=el.querySelector('canvas');
    const ctx=canvas.getContext('2d');
    canvas.width=el.offsetWidth||800;
    canvas.height=el.offsetHeight||88;
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle='#020813';ctx.fillRect(0,0,canvas.width,canvas.height);
    lane.clips.forEach((clip,ci)=>{
      const peaks=clip.peaks&&clip.peaks.length?clip.peaks:Array.from({length:100},(_,n)=>Math.abs(Math.sin(n*.21+i+ci))*.35);
      const isOn=W.clipSel&&W.clipSel.lane===i&&W.clipSel.clip===ci;
      const width=Math.max(8,(clip.end||80)-(clip.start||10));
      const piece=document.createElement('div');
      piece.className='sr38piece '+(isOn?'on':'');
      piece.dataset.lane=i;piece.dataset.clip=ci;
      piece.style.left=(clip.pos||0)+'%';piece.style.width=width+'%';
      piece.title=clip.name||'clip';
      el.appendChild(piece);
      ctx.save();
      ctx.beginPath();
      ctx.rect(canvas.width*((clip.pos||0)/100),0,canvas.width*(width/100),canvas.height);
      ctx.clip();
      ctx.lineWidth=2;ctx.shadowBlur=14;ctx.shadowColor=isOn?'#42a5ff':'#61efff';ctx.strokeStyle=isOn?'#42a5ff':'#9ff9ff';ctx.beginPath();
      for(let x=0;x<canvas.width;x++){const v=peaks[Math.floor(x/canvas.width*peaks.length)]||0;const y=canvas.height/2-v*canvas.height*.42;if(x===0)ctx.moveTo(x,y);else ctx.lineTo(x,y)}
      ctx.stroke();ctx.restore();
    });
  });
  const st=document.querySelector('#sr38status');
  if(st){const l=W.tracks[W.sel],c=l&&l.clips&&l.clips[W.clipSel?.clip||0];st.textContent='Lane '+(W.sel+1)+(c?' / '+c.name:'')}
};
W.makeUploadPeaks=async function(file){try{const AC=window.AudioContext||window.webkitAudioContext;const ctx=new AC();const ab=await file.arrayBuffer();const buf=await ctx.decodeAudioData(ab);const data=buf.getChannelData(0);const n=140,out=[];for(let i=0;i<n;i++){const s=Math.floor(i*data.length/n),e=Math.floor((i+1)*data.length/n);let m=0;for(let j=s;j<e;j++)m=Math.max(m,Math.abs(data[j]));out.push(m)}return out}catch(e){return Array.from({length:140},(_,i)=>Math.abs(Math.sin(i*.17))*Math.random())}};
W.animateSelected=function(mode){if(W._raf)cancelAnimationFrame(W._raf);let t=0;const tick=()=>{const lane=W.tracks&&W.tracks[W.sel];if(lane){lane.clips=clips(lane);let clip=lane.clips[W.clipSel?.clip||0]||lane.clips[0];if(clip){clip.peaks=(clip.peaks||Array(120).fill(.05)).map((v,i)=>Math.max(.02,Math.min(1,v*.9+Math.abs(Math.sin(i*.18+t))*(mode==='record'?.32:.08))));W.render&&W.render()}}t+=.18;W._raf=requestAnimationFrame(tick)};tick()};
})();