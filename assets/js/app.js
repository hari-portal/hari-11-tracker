const DATA = window.SYLLABUS || [];
const TASKS = [['s','Study','hs'],['r','Revise','hr'],['t','Test','ht']];
const LS_KEY = 'xi-study-tracker-v1';

/* ---------- state ---------- */
let state = {checks:{}, open:{}, tab:'physics', theme:null};   // checks[id] = "srt" subset string
const imgs = {};                                               // id -> dataURL (IndexedDB)
let lsOK = true;
try { Object.assign(state, JSON.parse(localStorage.getItem(LS_KEY)||'{}')); } catch(e){ lsOK=false; }
const save = () => { try{ localStorage.setItem(LS_KEY, JSON.stringify(state)); }catch(e){ lsOK=false; } };

/* IndexedDB for infographics (falls back to memory) */
let db=null;
const idb = {
  open(){ return new Promise(res=>{ try{
      const rq=indexedDB.open('xi-tracker-images',1);
      rq.onupgradeneeded=()=>rq.result.createObjectStore('img');
      rq.onsuccess=()=>{db=rq.result;res()}; rq.onerror=()=>res();
    }catch(e){res()} }); },
  all(){ return new Promise(res=>{ if(!db) return res(); try{
      const tx=db.transaction('img'),st=tx.objectStore('img'),rq=st.openCursor();
      rq.onsuccess=()=>{const c=rq.result; if(c){imgs[c.key]=c.value;c.continue()} else res()};
      rq.onerror=()=>res();
    }catch(e){res()} }); },
  put(k,v){ try{ db&&db.transaction('img','readwrite').objectStore('img').put(v,k) }catch(e){} },
  del(k){ try{ db&&db.transaction('img','readwrite').objectStore('img').delete(k) }catch(e){} },
  clear(){ try{ db&&db.transaction('img','readwrite').objectStore('img').clear() }catch(e){} }
};

/* ---------- ids & helpers ---------- */
DATA.forEach(s=>s.chapters.forEach((c,ci)=>c.items.forEach((it,ii)=>{ it.id=`${s.id}-${ci}-${ii}`; })));
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const has=(id,k)=>(state.checks[id]||'').includes(k);
const pct=(a,b)=>b?Math.round(a/b*100):0;

function stats(items){
  const n=items.length, o={n,s:0,r:0,t:0,img:0,done:0};
  items.forEach(it=>{ const v=state.checks[it.id]||''; if(v.includes('s'))o.s++; if(v.includes('r'))o.r++; if(v.includes('t'))o.t++;
    if(imgs[it.id])o.img++; if(v.length===3)o.done++; });
  o.pct=pct(o.s+o.r+o.t, n*3); return o;
}
const allItems=s=>s.chapters.flatMap(c=>c.items);

/* ---------- summary ---------- */
function renderSummary(){
  const all=DATA.flatMap(allItems), o=stats(all);
  $('#ringPct').textContent=o.pct+'%';
  $('#ringArc').style.strokeDashoffset = 351.86*(1-o.pct/100);
  $('#oS').textContent=`${o.s}/${o.n}`; $('#oR').textContent=`${o.r}/${o.n}`; $('#oT').textContent=`${o.t}/${o.n}`; $('#oI').textContent=`${o.img}/${o.n}`;
  $('#cards').innerHTML=DATA.map(s=>{
    const st=stats(allItems(s));
    const m=(l,k,c)=>`<span>${l}<b>${st[k]}/${st.n}</b><div class="bar"><i class="${c}" style="width:${pct(st[k],st.n)}%"></i></div></span>`;
    return `<button class="scard ${state.tab===s.id?'active':''}" data-s="${s.id}">
      <div class="top"><span>${s.icon} ${s.name}</span><span class="pct">${st.pct}%</span></div>
      <div class="bar"><i style="width:${st.pct}%"></i></div>
      <div class="mini">${m('Study','s','s')}${m('Revise','r','r')}${m('Test','t','t')}</div>
    </button>`}).join('');
  $$('.scard').forEach(b=>b.onclick=()=>switchTab(b.dataset.s,true));
  $$('.tab').forEach(t=>{ const s=DATA.find(x=>x.id===t.dataset.s); t.querySelector('em').textContent=stats(allItems(s)).pct+'%'; });
}

/* ---------- tabs ---------- */
function renderTabs(){
  $('#tabs').innerHTML=DATA.map(s=>`<button class="tab ${state.tab===s.id?'active':''}" role="tab" data-s="${s.id}">${s.icon} ${s.name} <em>0%</em></button>`).join('');
  $$('.tab').forEach(t=>t.onclick=()=>switchTab(t.dataset.s));
}
function switchTab(id,scroll){
  state.tab=id; save(); document.body.dataset.subject=id;
  $$('.tab').forEach(t=>t.classList.toggle('active',t.dataset.s===id));
  renderPanel(); renderSummary();
  if(scroll) $('#tabs').scrollIntoView({behavior:'smooth',block:'start'});
}

/* ---------- panel ---------- */
function renderPanel(){
  const s=DATA.find(x=>x.id===state.tab);
  let h=`<div class="phead"><input type="search" id="q" placeholder="Search topics in ${s.name}…" aria-label="Search">
    <div style="display:flex;gap:8px"><button class="sbtn" id="expAll">Expand all</button><button class="sbtn" id="colAll">Collapse all</button></div></div>`;
  s.chapters.forEach((c,ci)=>{
    const key=`${s.id}-${ci}`; const open=!!state.open[key];
    let lastTopic=null;
    const rows=c.items.map(it=>{
      const grp = it.topic!==lastTopic; lastTopic=it.topic;
      const v=state.checks[it.id]||'';
      return `<tr data-id="${it.id}" class="${grp?'grp':''} ${v.length===3?'done':''}" data-search="${esc((it.code+' '+it.topic+' '+it.sub+' '+it.desc).toLowerCase())}">
        <td class="code">${esc(it.code)}</td>
        <td class="topic ${grp?'':'rep'}">${esc(it.topic)}</td>
        <td class="sub"><span class="t">${esc(it.sub)}</span>${it.desc?`<span class="d">${esc(it.desc)}</span>`:''}</td>
        ${TASKS.map(([k,l])=>`<td class="chk" data-l="${l}"><input type="checkbox" class="cb ${k}" data-k="${k}" aria-label="${l}: ${esc(it.sub)}" ${v.includes(k)?'checked':''}></td>`).join('')}
        <td class="img">${imgCell(it.id)}</td></tr>`;
    }).join('');
    h+=`<section class="chapter ${open?'open':''}" data-key="${key}" data-ci="${ci}">
      <button class="chead" aria-expanded="${open}">
        <span class="cnum">${esc(c.label)}</span>
        <span class="ctitle"><b>${esc(c.title)}</b><small class="cmeta"></small></span>
        <span class="cprog"><span class="bar"><i></i></span><span class="cpct">0%</span></span>
        <span class="chev">▾</span>
      </button>
      <div class="cbody"><div><table>
        <thead><tr><th class="l" style="padding-left:18px">Code</th><th class="l">Topic</th><th class="l">Subtopic / Key concept</th>
          ${TASKS.map(([k,l,cl])=>`<th class="${cl}"><label>${l}<input type="checkbox" class="cb ${k} all" data-k="${k}" aria-label="Select all ${l}"></label></th>`).join('')}
          <th>Infographic</th></tr></thead>
        <tbody>${rows}</tbody></table></div></div>
    </section>`;
  });
  $('#panel').innerHTML=h;
  s.chapters.forEach((c,ci)=>updateChapter(s,ci));
  bindPanel(s);
}
function imgCell(id){
  return imgs[id]
   ? `<span class="thumb"><img src="${imgs[id]}" alt="Infographic" data-view="${id}"><button class="x" data-del="${id}" title="Remove image" aria-label="Remove infographic">×</button></span>`
   : `<label class="up" title="Upload an infographic image">📷 Upload<input type="file" accept="image/*" data-up="${id}"></label>`;
}
function updateChapter(s,ci){
  const sec=$(`.chapter[data-ci="${ci}"]`); if(!sec) return;
  const c=s.chapters[ci], st=stats(c.items);
  sec.querySelector('.cpct').textContent=st.pct+'%';
  sec.querySelector('.bar i').style.width=st.pct+'%';
  sec.querySelector('.cmeta').textContent=`${c.meta?c.meta+' · ':''}${st.n} subtopics · ${st.done} fully done`;
  sec.classList.toggle('complete',st.done===st.n&&st.n>0);
  ['s','r','t'].forEach(k=>{
    const h=sec.querySelector(`thead .cb[data-k="${k}"]`); const n=st[k];
    h.checked=n===st.n&&n>0; h.indeterminate=n>0&&n<st.n;
  });
}

function bindPanel(s){
  $('#expAll').onclick=()=>{ s.chapters.forEach((_,i)=>state.open[`${s.id}-${i}`]=true); save(); $$('.chapter').forEach(e=>setOpen(e,true)); };
  $('#colAll').onclick=()=>{ s.chapters.forEach((_,i)=>delete state.open[`${s.id}-${i}`]); save(); $$('.chapter').forEach(e=>setOpen(e,false)); };
  $('#q').oninput=e=>search(e.target.value.trim().toLowerCase());
  $$('.chead').forEach(b=>b.onclick=()=>{ const e=b.parentElement; const o=!e.classList.contains('open'); setOpen(e,o); state.open[e.dataset.key]=o||undefined; save(); });
  $$('tbody .cb').forEach(cb=>cb.onchange=()=>{
    const tr=cb.closest('tr'), id=tr.dataset.id; let v=state.checks[id]||'';
    v = cb.checked ? (v.includes(cb.dataset.k)?v:v+cb.dataset.k) : v.replace(cb.dataset.k,'');
    if(v) state.checks[id]=v; else delete state.checks[id];
    tr.classList.toggle('done',v.length===3); save();
    updateChapter(s,+tr.closest('.chapter').dataset.ci); renderSummary();
  });
  $$('thead .cb').forEach(cb=>cb.onchange=()=>{
    const sec=cb.closest('.chapter'), k=cb.dataset.k, on=cb.checked;
    $$('tbody tr',sec).forEach(tr=>{
      const id=tr.dataset.id; let v=(state.checks[id]||'').replace(k,''); if(on) v+=k;
      if(v) state.checks[id]=v; else delete state.checks[id];
      tr.classList.toggle('done',v.length===3);
      tr.querySelector(`.cb[data-k="${k}"]`).checked=on;
    });
    save(); updateChapter(s,+sec.dataset.ci); renderSummary();
  });
  $$('[data-up]').forEach(bindUpload);
  $$('[data-del]').forEach(b=>b.onclick=()=>removeImg(b.dataset.del,s));
  $$('[data-view]').forEach(i=>i.onclick=()=>openLB(i.dataset.view,s));
}
function setOpen(e,o){ e.classList.toggle('open',o); e.querySelector('.chead').setAttribute('aria-expanded',o); }

function search(q){
  $$('.chapter').forEach(sec=>{
    let any=false;
    $$('tbody tr',sec).forEach(tr=>{ const m=!q||tr.dataset.search.includes(q); tr.classList.toggle('hide',!m); any=any||m; });
    sec.style.display=any?'':'none';
    if(q&&any) setOpen(sec,true); else if(!q) setOpen(sec,!!state.open[sec.dataset.key]);
  });
}

/* ---------- images ---------- */
function shrink(file){
  return new Promise((res,rej)=>{
    const fr=new FileReader();
    fr.onerror=rej;
    fr.onload=()=>{
      const im=new Image();
      im.onerror=rej;
      im.onload=()=>{
        const M=1800, sc=Math.min(1,M/Math.max(im.width,im.height));
        if(sc===1 && file.size<600*1024) return res(fr.result);
        const cv=document.createElement('canvas'); cv.width=Math.round(im.width*sc); cv.height=Math.round(im.height*sc);
        const x=cv.getContext('2d'); x.fillStyle='#fff'; x.fillRect(0,0,cv.width,cv.height); x.drawImage(im,0,0,cv.width,cv.height);
        res(cv.toDataURL('image/jpeg',.88));
      };
      im.src=fr.result;
    };
    fr.readAsDataURL(file);
  });
}
async function setImage(id,file,s){
  if(!file||!file.type.startsWith('image/')) return toast('Please choose an image file');
  try{ imgs[id]=await shrink(file); idb.put(id,imgs[id]); }catch(e){ return toast('Could not read that image'); }
  refreshImgCell(id); renderSummary();
}
function refreshImgCell(id){
  const tr=$(`tr[data-id="${id}"]`); if(!tr) return;
  const td=tr.querySelector('td.img'); td.innerHTML=imgCell(id);
  const s=DATA.find(x=>x.id===state.tab);
  td.querySelectorAll('[data-up]').forEach(bindUpload);
  td.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>removeImg(b.dataset.del,s));
  td.querySelectorAll('[data-view]').forEach(i=>i.onclick=()=>openLB(i.dataset.view,s));
}
function bindUpload(inp){
  inp.onchange=()=>{ setImage(inp.dataset.up,inp.files[0]); };
  const lab=inp.parentElement;
  ['dragover','dragenter'].forEach(ev=>lab.addEventListener(ev,e=>{e.preventDefault();lab.classList.add('drag')}));
  ['dragleave','drop'].forEach(ev=>lab.addEventListener(ev,e=>{e.preventDefault();lab.classList.remove('drag')}));
  lab.addEventListener('drop',e=>setImage(inp.dataset.up,e.dataTransfer.files[0]));
}
function removeImg(id){ delete imgs[id]; idb.del(id); refreshImgCell(id); renderSummary(); }

/* lightbox */
function findItem(id){ for(const s of DATA) for(const c of s.chapters) for(const it of c.items) if(it.id===id) return it; }
function openLB(id){ const it=findItem(id), lb=$('#lb'); lb.querySelector('img').src=imgs[id]; lb.querySelector('p').textContent=`${it.code} ${it.sub}`; lb.classList.add('show'); }
$('#lb').onclick=e=>{ if(e.target.tagName!=='IMG') $('#lb').classList.remove('show'); };
document.addEventListener('keydown',e=>{ if(e.key==='Escape') $('#lb').classList.remove('show'); });

/* ---------- toolbar ---------- */
function toast(m){ const t=$('#toast'); t.textContent=m; t.classList.add('show'); clearTimeout(toast.t); toast.t=setTimeout(()=>t.classList.remove('show'),2400); }
function applyTheme(){
  const dark = state.theme ? state.theme==='dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.dataset.theme = dark?'dark':'light';
  $('#themeBtn').textContent = dark?'☀️ Light mode':'🌙 Dark mode';
}
$('#themeBtn').onclick=()=>{ state.theme = document.documentElement.dataset.theme==='dark'?'light':'dark'; save(); applyTheme(); };
$('#exportBtn').onclick=()=>{
  const blob=new Blob([JSON.stringify({checks:state.checks,images:imgs},null,1)],{type:'application/json'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='study-tracker-progress.json'; a.click(); toast('Progress exported (includes infographics)');
};
$('#importFile').onchange=async e=>{
  try{
    const d=JSON.parse(await e.target.files[0].text());
    state.checks=d.checks||{}; idb.clear(); Object.keys(imgs).forEach(k=>delete imgs[k]);
    Object.entries(d.images||{}).forEach(([k,v])=>{imgs[k]=v; idb.put(k,v)});
    save(); renderPanel(); renderSummary(); toast('Progress imported');
  }catch(err){ toast('That file is not a valid progress export'); }
  e.target.value='';
};
$('#resetBtn').onclick=()=>{
  if(!confirm('Reset ALL progress and remove all uploaded infographics?')) return;
  state.checks={}; state.open={}; idb.clear(); Object.keys(imgs).forEach(k=>delete imgs[k]); save(); renderPanel(); renderSummary(); toast('Progress reset');
};

/* ---------- init ---------- */
(async()=>{
  if(!DATA.some(s=>s.id===state.tab)) state.tab='physics';
  applyTheme(); document.body.dataset.subject=state.tab;
  await idb.open(); await idb.all();
  renderTabs(); renderPanel(); renderSummary();
  if(!lsOK) toast('Browser storage is unavailable — progress will not be saved after closing.');
})();
