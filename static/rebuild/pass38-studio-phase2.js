(()=>{
const W=window.SR38=window.SR38||{};
let dragging=null;

document.addEventListener('mousedown',e=>{
  const piece=e.target.closest('.sr38piece');
  if(!piece) return;
  dragging={el:piece,startX:e.clientX,origLeft:parseFloat(piece.style.left)||0,lane:+piece.parentElement.dataset.lane};
});

document.addEventListener('mousemove',e=>{
  if(!dragging) return;
  const dx=(e.clientX-dragging.startX)/6;
  let newPos=Math.max(0,Math.min(90,dragging.origLeft+dx));
  dragging.el.style.left=newPos+'%';
});

document.addEventListener('mouseup',e=>{
  if(!dragging) return;
  const lane=dragging.lane;
  const newPos=parseFloat(dragging.el.style.left)||0;
  if(W.tracks && W.tracks[lane]){
    W.tracks[lane].pos=newPos;
    W.log && W.log({type:'studio-drag',lane:lane+1,pos:newPos});
  }
  dragging=null;
});

document.addEventListener('click',e=>{
  if(e.target.id==='sr38export'){
    const blob=new Blob([JSON.stringify(W.tracks,null,2)],{type:'application/json'});
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download='studio-mix.json';
    a.click();
    W.log && W.log({type:'studio-export-phase2'});
  }
});
})();