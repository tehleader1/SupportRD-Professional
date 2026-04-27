(()=>{const W=window.SupportRD34H||{};const q=s=>document.querySelector(s);
function stage(html){const el=q('#remoteStage');if(el)el.innerHTML=html}

function studio(){stage(`<div class="sr34h-panel"><h2>Studio</h2><p>34H Studio active (waveform + multi-track loading next step)</p></div>`)}
function diary(){stage(`<div class="sr34h-panel"><h2>Diary</h2><video autoplay muted class="sr34h-video"></video><p>Camera ready</p></div>`)}
function profile(){stage(`<div class="sr34h-panel"><h2>Profile HairScan</h2><p>Camera + analysis hook ready</p></div>`)}
function map(){document.body.dataset.map34h='swimming-hole';stage(`<div class="sr34h-panel"><h2>Map Change</h2><p>Theme switching active</p></div>`)}
function faq(){stage(`<div class="sr34h-panel"><h2>FAQ Lounge</h2><div class="sr34h-reel">Hair Reel Loading</div></div>`)}
function market(){stage(`<div class="sr34h-panel"><h2>Market</h2><iframe src="https://market-do8p.onrender.com/" style="width:100%;height:300px"></iframe></div>`)}

window.pass34Route=(r)=>{if(r==='studio')studio();else if(r==='diary')diary();else if(r==='profile')profile();else if(r==='map')map();else if(r==='faq')faq();else if(r==='market')market();};
})();