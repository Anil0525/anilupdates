/* AnilUpdates — full featured client-side script
   Features: modal add/edit/delete, admin auth (simple), search, filters,
   subscribe (local), dark mode, pagination (load more), share, RSS,
   export/import, contact form placeholder
*/

// ====== CONFIG ======
const STORAGE_KEY = 'anilupdates_posts_v1';
const SUB_KEY = 'anilupdates_subs_v1';
const ADMIN_KEY = 'anilupdates_admin_pass_v1'; // store hashed or plain (client-side demo)
const PER_PAGE = 6; // items per page for load more

// ====== SAMPLE DATA ======
const SAMPLE = [
  {id: genId(), title:'RRB Notification 2025 — Apply Now', cat:'RRB', date:'2025-11-19', summary:'Railway RRB recruitment notification released.'},
  {id: genId(), title:'CHSL Result Released — Check Here', cat:'CHSL', date:'2025-11-17', summary:'CHSL final results available.'},
  {id: genId(), title:'ICET Hallticket Download', cat:'ICET', date:'2025-11-12', summary:'ICET hall ticket download instructions.'},
  {id: genId(), title:'RRB Stage 2 Details', cat:'RRB', date:'2025-10-20', summary:'RRB stage 2 exam pattern and syllabus.'},
  {id: genId(), title:'CHSL Prelims Date', cat:'CHSL', date:'2025-09-30', summary:'CHSL prelims schedule release.'},
  {id: genId(), title:'ICET Answer Key', cat:'ICET', date:'2025-08-28', summary:'ICET provisional answer key published.'},
  {id: genId(), title:'Model Paper: RRB', cat:'Model Papers', date:'2025-07-10', summary:'RRB practice paper (PDF link).'}
];

// ====== HELPERS ======
function genId(){ return 'p_'+Math.random().toString(36).substring(2,10); }
function today(){ const d=new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
function escapeHtml(s){ if(!s) return ''; return String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'); }

// ====== STORAGE ======
function getPosts(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return JSON.parse(JSON.stringify(SAMPLE));
    return JSON.parse(raw);
  }catch(e){
    console.error(e); return JSON.parse(JSON.stringify(SAMPLE));
  }
}
function savePosts(list){ localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); }

// ====== DOM REFS ======
const postsContainer = document.getElementById('postsContainer');
const emptyMsg = document.getElementById('emptyMsg');
const postView = document.getElementById('postView');
const filtersEl = document.getElementById('filters');
const searchBtn = document.getElementById('searchBtn');
const searchInput = document.getElementById('searchInput');

const addModal = document.getElementById('addModal');
const openAddBtn = document.getElementById('openAdd');
const cancelAddBtn = document.getElementById('cancelAdd');
const savePostBtn = document.getElementById('savePost');
const modalTitle = document.getElementById('modalTitle');

const resetBtn = document.getElementById('resetBtn');
const loadMoreWrap = document.getElementById('loadMoreWrap');
const loadMoreBtn = document.getElementById('loadMoreBtn');

const exportBtn = document.getElementById('exportBtn');
const importBtn = document.getElementById('importBtn');
const importFile = document.getElementById('importFile');
const rssBtn = document.getElementById('rssBtn');
const backupBtn = document.getElementById('backupBtn');

const subBtn = document.getElementById('subBtn');
const emailInput = document.getElementById('emailSub');
const subCount = document.getElementById('subCount');

const shareFb = document.getElementById('shareFb');
const shareTw = document.getElementById('shareTw');

const themeToggle = document.getElementById('themeToggle');
const adminBtn = document.getElementById('adminBtn');
const logoutBtn = document.getElementById('logoutBtn');

// ====== STATE ======
let EDITING_ID = null;
let PAGE = 1;
let CURRENT_FILTER = 'all';
let CURRENT_QUERY = '';

// ====== RENDER / PAGINATION ======
function renderPosts(filter='all', q=''){
  CURRENT_FILTER = filter; CURRENT_QUERY = q || '';
  PAGE = 1; // reset to first page on new render
  renderPage();
}

function renderPage(){
  const list = getPosts().slice().reverse();
  let filtered = list;
  if(CURRENT_FILTER !== 'all') filtered = filtered.filter(p => p.cat === CURRENT_FILTER);
  if(CURRENT_QUERY) filtered = filtered.filter(p => (p.title + ' ' + p.summary).toLowerCase().includes(CURRENT_QUERY.toLowerCase()));

  const start = (PAGE - 1) * PER_PAGE;
  const pageItems = filtered.slice(start, start + PER_PAGE);

  postsContainer.innerHTML = '';
  if(pageItems.length === 0){
    emptyMsg.classList.remove('hidden');
  } else {
    emptyMsg.classList.add('hidden');
  }

  pageItems.forEach(p=>{
    const el = document.createElement('div');
    el.className = 'post card';
    el.innerHTML = `
      <h3><a class="link" href="#post/${p.id}">${escapeHtml(p.title)}</a></h3>
      <div class="meta">${escapeHtml(p.cat)} • ${escapeHtml(p.date)}</div>
      <div class="summary">${escapeHtml(p.summary)}</div>
      <div style="margin-top:8px">
        <button class="btn" data-edit="${p.id}">Edit</button>
        <button class="btn secondary" data-delete="${p.id}">Delete</button>
      </div>
    `;
    // attach handlers
    el.querySelector('[data-edit]').addEventListener('click', ()=> openEdit(p.id));
    el.querySelector('[data-delete]').addEventListener('click', ()=> deletePost(p.id));
    postsContainer.appendChild(el);
  });

  // show/hide load more
  if(start + PER_PAGE < filtered.length){
    loadMoreWrap.classList.remove('hidden');
  } else {
    loadMoreWrap.classList.add('hidden');
  }
}

// Load more click
loadMoreBtn.addEventListener('click', ()=>{
  PAGE++;
  renderPage();
});

// ====== FILTERS & SEARCH ======
filtersEl.addEventListener('click', (e)=>{
  const chip = e.target.closest('.chip'); if(!chip) return;
  document.querySelectorAll('.chip').forEach(c=>c.classList.remove('active'));
  chip.classList.add('active');
  renderPosts(chip.dataset.cat, searchInput.value.trim());
});

searchBtn.addEventListener('click', ()=>{
  const q = searchInput.value.trim();
  const active = document.querySelector('.chip.active')?.dataset.cat || 'all';
  renderPosts(active, q);
});
searchInput.addEventListener('keydown', (e)=>{ if(e.key === 'Enter') searchBtn.click(); });

// ---------- SINGLE + BULK Modal handlers & add helpers ----------

// Mode elements
const modeSingleBtn = document.getElementById('modeSingle');
const modeBulkBtn   = document.getElementById('modeBulk');
const singleForm    = document.getElementById('singleForm');
const bulkForm      = document.getElementById('bulkForm');
const bulkInput     = document.getElementById('bulkInput');

// Ensure Add Post button visible (if it was hidden by admin gating)
try{ document.getElementById('openAdd').classList.remove('hidden'); }catch(e){}

// Helpers already in your script: genId(), today(), getPosts(), savePosts(), renderPosts(...)
// We'll use EDITING_ID, CURRENT_FILTER, CURRENT_QUERY state variables from main script.

// Toggle UI mode
function setMode(mode){
  if(mode === 'single'){
    singleForm.classList.remove('hidden');
    bulkForm.classList.add('hidden');
    modeSingleBtn.classList.add('active');
    modeBulkBtn.classList.remove('active');
    modalTitle.textContent = EDITING_ID ? 'Edit Post' : 'Add Post';
  } else {
    singleForm.classList.add('hidden');
    bulkForm.classList.remove('hidden');
    modeSingleBtn.classList.remove('active');
    modeBulkBtn.classList.add('active');
    modalTitle.textContent = 'Bulk Add Posts';
  }
}

// init mode default
setMode('single');

// mode button events
modeSingleBtn.addEventListener('click', ()=> setMode('single'));
modeBulkBtn.addEventListener('click', ()=> setMode('bulk'));

// openAddBtn should already open modal; ensure it sets single mode
openAddBtn.addEventListener('click', ()=>{
  EDITING_ID = null;
  setMode('single');
  document.getElementById('postTitle').value = '';
  document.getElementById('postSummary').value = '';
  document.getElementById('postCat').value = 'RRB';
  document.getElementById('postImage').value = '';
  bulkInput.value = '';
  addModal.classList.remove('hidden');
  setTimeout(()=> document.getElementById('postTitle').focus(), 100);
});

// Cancel
cancelAddBtn.addEventListener('click', ()=>{
  addModal.classList.add('hidden'); EDITING_ID = null;
});

// Background click close (retain)
addModal.addEventListener('click', (e)=>{ if(e.target && e.target.id === 'addModal'){ addModal.classList.add('hidden'); EDITING_ID = null; } });

// Programmatic add single
function addPostDirect({title, summary, cat='RRB', image=''}){
  if(!title || !summary) return false;
  const posts = getPosts();
  posts.push({ id: genId(), title: String(title), summary: String(summary), cat: String(cat), image: String(image || ''), date: today() });
  savePosts(posts);
  renderPosts(typeof CURRENT_FILTER === 'undefined' ? 'all' : CURRENT_FILTER, typeof CURRENT_QUERY === 'undefined' ? '' : CURRENT_QUERY);
  return true;
}

// Programmatic add multiple (items array)
function addMultiplePosts(items){
  if(!Array.isArray(items) || items.length === 0) return 0;
  const posts = getPosts();
  let added = 0;
  items.forEach(it=>{
    if(it && it.title && it.summary){
      posts.push({ id: genId(), title: String(it.title), summary: String(it.summary), cat: String(it.cat || 'RRB'), image: String(it.image || ''), date: it.date || today() });
      added++;
    }
  });
  if(added > 0){ savePosts(posts); renderPosts(typeof CURRENT_FILTER === 'undefined' ? 'all' : CURRENT_FILTER, typeof CURRENT_QUERY === 'undefined' ? '' : CURRENT_QUERY); }
  return added;
}

// Parse bulk input: either JSON array or CSV lines with '|' separator
function parseBulkInput(text){
  const trimmed = (text || '').trim();
  if(!trimmed) return [];
  // try JSON first
  try{
    const parsed = JSON.parse(trimmed);
    if(Array.isArray(parsed)){
      // normalize to items with title, summary, cat, image
      return parsed.map(it => ({ title: it.title || '', summary: it.summary || '', cat: it.cat || it.category || 'RRB', image: it.image || '' }));
    }
  }catch(e){ /* not json */ }

  // fallback to CSV lines (pipe separated)
  const lines = trimmed.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const items = [];
  lines.forEach(line => {
    // Accept both '|' and ',' but prefer | to avoid commas in text
    const parts = line.includes('|') ? line.split('|') : line.split(',');
    // parts: title|cat|summary|image?
    const title = (parts[0]||'').trim();
    // If second looks like known category (RRB/CHSL/ICET/Model Papers) treat as cat else use default
    let cat = (parts[1]||'').trim();
    let summary = '';
    let image = '';
    if(parts.length === 1){
      // only title given -> skip
      summary = '';
    } else if(parts.length === 2){
      // title|summary
      summary = parts[1].trim();
      cat = 'RRB';
    } else if(parts.length === 3){
      // title|cat|summary  (or title|summary|image) - heuristics
      if(['RRB','CHSL','ICET','Model Papers'].includes(parts[1].trim())){
        cat = parts[1].trim();
        summary = parts[2].trim();
      } else {
        summary = parts[1].trim();
        image = parts[2].trim();
        cat = 'RRB';
      }
    } else {
      // >=4: title|cat|summary|image
      cat = parts[1].trim() || 'RRB';
      summary = parts[2].trim() || '';
      image = parts[3].trim() || '';
    }
    if(title && summary) items.push({ title, summary, cat, image });
  });
  return items;
}

// Save button handler: support single and bulk
savePostBtn.addEventListener('click', ()=>{
  const isBulk = !bulkForm.classList.contains('hidden');
  if(isBulk){
    const raw = bulkInput.value;
    const items = parseBulkInput(raw);
    if(items.length === 0){ alert('Bulk input empty or invalid'); return; }
    const added = addMultiplePosts(items);
    alert('Added ' + added + ' posts.');
    bulkInput.value = '';
    addModal.classList.add('hidden');
    return;
  }

  // Single mode: if editing, update; else add
  const title = document.getElementById('postTitle').value.trim();
  const summary = document.getElementById('postSummary').value.trim();
  const cat = document.getElementById('postCat').value;
  const image = document.getElementById('postImage').value.trim();

  if(!title || !summary){ alert('Title and summary kavali'); return; }

  if(EDITING_ID){
    const posts = getPosts();
    const idx = posts.findIndex(p => p.id === EDITING_ID);
    if(idx !== -1){
      posts[idx].title = title; posts[idx].summary = summary; posts[idx].cat = cat; posts[idx].image = image; posts[idx].date = today();
      savePosts(posts);
      alert('Post updated');
      EDITING_ID = null;
    } else {
      alert('Editing post ledu');
    }
  } else {
    addPostDirect({ title, summary, cat, image });
    alert('Post add ayindi');
  }

  addModal.classList.add('hidden');
  renderPosts(CURRENT_FILTER || 'all', CURRENT_QUERY || '');
});

// ====== MODAL: ADD / EDIT ======
openAddBtn.addEventListener('click', ()=>{
  modalTitle.textContent = 'Add Post'; EDITING_ID = null;
  document.getElementById('postTitle').value = '';
  document.getElementById('postSummary').value = '';
  document.getElementById('postCat').value = 'RRB';
  document.getElementById('postImage').value = '';
  addModal.classList.remove('hidden');
  setTimeout(()=> document.getElementById('postTitle').focus(), 120);
});

cancelAddBtn.addEventListener('click', ()=>{
  addModal.classList.add('hidden'); EDITING_ID = null;
});

addModal.addEventListener('click', (e)=>{ if(e.target && e.target.id === 'addModal'){ addModal.classList.add('hidden'); EDITING_ID = null; }});

savePostBtn.addEventListener('click', ()=>{
  const title = document.getElementById('postTitle').value.trim();
  const summary = document.getElementById('postSummary').value.trim();
  const cat = document.getElementById('postCat').value;
  const image = document.getElementById('postImage').value.trim();

  if(!title || !summary){ alert('Title and summary kavali'); return; }
  const posts = getPosts();
  if(EDITING_ID){
    const idx = posts.findIndex(p=>p.id === EDITING_ID);
    if(idx !== -1){
      posts[idx].title = title; posts[idx].summary = summary; posts[idx].cat = cat; posts[idx].image = image; posts[idx].date = today();
    }
  } else {
    posts.push({ id: genId(), title, summary, cat, image, date: today() });
  }
  savePosts(posts);
  addModal.classList.add('hidden'); EDITING_ID = null;
  renderPosts(CURRENT_FILTER, CURRENT_QUERY);
});

// ====== EDIT / DELETE ======
function openEdit(id){
  const posts = getPosts(); const p = posts.find(x=>x.id === id);
  if(!p) return alert('Post ledu');
  EDITING_ID = id;
  modalTitle.textContent = 'Edit Post';
  document.getElementById('postTitle').value = p.title;
  document.getElementById('postSummary').value = p.summary;
  document.getElementById('postCat').value = p.cat;
  document.getElementById('postImage').value = p.image || '';
  addModal.classList.remove('hidden');
}

function deletePost(id){
  if(!confirm('Delete cheyali?')) return;
  const remaining = getPosts().filter(p=>p.id !== id);
  savePosts(remaining);
  renderPosts(CURRENT_FILTER, CURRENT_QUERY);
  alert('Post delete ayindi');
}

// ====== RESET SAMPLE ======
resetBtn.addEventListener('click', ()=>{
  if(!confirm('Reset cheyali? Existing posts will be removed.')) return;
  savePosts(SAMPLE);
  renderPosts();
  alert('Reset ayindi');
});

// ====== EXPORT / IMPORT ======
exportBtn.addEventListener('click', ()=>{
  const data = JSON.stringify(getPosts(), null, 2);
  const blob = new Blob([data], {type:'application/json'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'anil_posts.json'; a.click();
});

importBtn.addEventListener('click', ()=> importFile.click());
importFile.addEventListener('change', (e)=>{
  const f = e.target.files[0]; if(!f) return;
  const reader = new FileReader();
  reader.onload = function(){ try{ const parsed = JSON.parse(reader.result); if(Array.isArray(parsed)){ savePosts(parsed); renderPosts(); alert('Import success'); } else alert('JSON should be an array'); } catch(err){ alert('Invalid JSON'); }};
  reader.readAsText(f);
});

backupBtn.addEventListener('click', ()=>{
  const data = JSON.stringify(getPosts(), null, 2);
  // show in new tab
  const win = window.open(); win.document.body.style.whiteSpace = 'pre-wrap'; win.document.body.innerText = data;
});

// ====== RSS GENERATOR (client-side) ======
rssBtn.addEventListener('click', ()=>{
  const posts = getPosts();
  const siteUrl = location.href.split('#')[0];
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel>`;
  xml += `<title>AnilUpdates</title><link>${siteUrl}</link><description>Job alerts</description>`;
  posts.forEach(p=>{
    xml += `<item><title>${escapeHtml(p.title)}</title><link>${siteUrl}#post/${p.id}</link><pubDate>${p.date}</pubDate><description>${escapeHtml(p.summary)}</description></item>`;
  });
  xml += `</channel></rss>`;
  const blob = new Blob([xml], {type:'application/rss+xml'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'anilupdates_rss.xml'; a.click();
});

// ====== SUBSCRIBE (local demo) ======
function validateEmail(email){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); }
subBtn.addEventListener('click', (e)=>{
  e.preventDefault();
  const em = (emailInput.value || '').trim();
  if(!em){ alert('Email ivvandi'); return; }
  if(!validateEmail(em)){ alert('Valid email ivvandi'); return; }
  let list = []; try{ list = JSON.parse(localStorage.getItem(SUB_KEY) || '[]'); }catch(e){ list = []; }
  if(list.includes(em)){ alert('Meeru already subscribe chesaru'); emailInput.value=''; return; }
  list.push(em); localStorage.setItem(SUB_KEY, JSON.stringify(list));
  alert('Subscribed: '+em+' (demo)'); emailInput.value='';
  showSubscriberCount();
});
function showSubscriberCount(){ const list = JSON.parse(localStorage.getItem(SUB_KEY) || '[]'); subCount.textContent = `Subscribers: ${list.length}`; }
showSubscriberCount();

// ====== SOCIAL SHARE (simple) ======
const shareHandler = (provider) => {
  const pageUrl = encodeURIComponent(location.href.split('#')[0]);
  const title = encodeURIComponent(document.title);
  if(provider === 'fb') window.open(`https://www.facebook.com/sharer.php?u=${pageUrl}`, '_blank');
  if(provider === 'tw') window.open(`https://twitter.com/intent/tweet?text=${title}&url=${pageUrl}`, '_blank');
};
document.getElementById('shareFb').addEventListener('click', ()=> shareHandler('fb'));
document.getElementById('shareTw').addEventListener('click', ()=> shareHandler('tw'));

// ====== THEME (dark mode) ======
themeToggle.addEventListener('click', ()=>{
  const cur = document.documentElement.getAttribute('data-theme');
  const next = cur === 'dark' ? '' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  themeToggle.textContent = next === 'dark' ? 'Light' : 'Dark';
});

// ====== ADMIN (simple client-side auth) ======
adminBtn.addEventListener('click', ()=>{
  // If admin password set, prompt; if not set, create new (first time)
  const saved = localStorage.getItem(ADMIN_KEY);
  if(!saved){
    const p = prompt('Set admin password (simple demo). Save it now:');
    if(!p) return alert('Password not set');
    localStorage.setItem(ADMIN_KEY, p);
    alert('Password saved. Now login again.');
    return;
  }
  const attempt = prompt('Enter admin password:');
  if(attempt === saved){
    // enable admin features
    openAddBtn.classList.remove('hidden');
    logoutBtn.classList.remove('hidden');
    adminBtn.classList.add('hidden');
    alert('Admin login successful');
  } else alert('Wrong password');
});

logoutBtn.addEventListener('click', ()=>{
  openAddBtn.classList.add('hidden');
  logoutBtn.classList.add('hidden');
  adminBtn.classList.remove('hidden');
  alert('Logged out');
});

// ====== ROUTING (single post view) ======
window.addEventListener('hashchange', handleHash);
function handleHash(){
  const h = location.hash.replace('#','');
  if(h.startsWith('post/')){
    const id = h.split('/')[1];
    const p = getPosts().find(x=>x.id === id);
    if(!p){ alert('Post not found'); location.hash=''; return; }
    postView.innerHTML = `
      <h2>${escapeHtml(p.title)}</h2>
      <div class="meta">${escapeHtml(p.cat)} • ${escapeHtml(p.date)}</div>
      ${p.image ? `<div style="margin-top:8px"><img src="${escapeHtml(p.image)}" alt="" style="max-width:100%"></div>` : ''}
      <div style="margin-top:12px">${escapeHtml(p.summary)}</div>
      <div style="margin-top:12px">
        <button class="btn" onclick="window.open(location.href,'_self')">Back</button>
        <button class="btn secondary" onclick="navigator.share ? navigator.share({title: '${escapeHtml(p.title)}', url: location.href}) : alert('Share not supported')">Share</button>
      </div>
    `;
    postView.classList.remove('hidden'); window.scrollTo({top:0,behavior:'smooth'});
  } else postView.classList.add('hidden');
}

// ====== INIT ======
document.getElementById('year').textContent = new Date().getFullYear();
renderPosts();

// ====== NOTES for image upload (cloudinary optional)
// To allow easy image uploads: create Cloudinary account, unsigned upload preset.
// Then use their upload widget or upload endpoint and paste resulting URL into "Image URL" field above.
// This demo accepts any image URL you paste.

