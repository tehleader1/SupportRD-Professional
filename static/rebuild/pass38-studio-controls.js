(()=>{
const W=window.SR38=window.SR38||{};
let audioAll=[];
function selectedLane(){return W.tracks&&W.tracks[W.sel]}
function selectedClip(){const l=selectedLane();return l&&l.clips&&l.clips[W.clipSel?.clip||0]}
async function fillLane(file,kind){if(!W.tracks)return;W.save&&W.save();const lane=selectedLane();lane.clips=lane.clips||[];const peaks=W.makeUploadPeaks?await W.makeUploadPeaks(file):[];lane.clips.push({name:file.name,url:URL.createObjectURL(file),peaks,fx:'Clean',pos:lane.clips.length?lane.clips[lane.clips.length-1].pos+20:0,start:10,end:80,kind});W.clipSel={lane:W.sel,clip:lane.clips.length-1};W.render&&W.render()}
async function importFiles(files){for(const f of Array.from(files||[])){await fillLane(f,'upload')} }
function playAll(){audioAll.forEach(a=>{try{a.pause()}catch{}});audioAll=[];W.tracks.forEach(l=>{(l.clips||[]).forEach(c=>{if(c.url){const a=new Audio(c.url);a.play();audioAll.push(a)}})});} 
function deleteClip(){const l=selectedLane();if(!l||!l.clips)return;l.clips.splice(W.clipSel.clip,1);W.clipSel.clip=0;W.render&&W.render()}
document.addEventListener('change',e=>{if(e.target.id==='sr38file')importFiles(e.target.files)},true);
document.addEventListener('click',e=>{
 const t=e.target;
 if(t.id==='sr38playall')playAll();
 if(t.id==='sr38rew'){const c=selectedClip();if(c)c.pos=0;W.render&&W.render()}
 if(t.id==='sr38cut'){deleteClip()}
},true);
})();