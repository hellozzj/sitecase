'use strict';

/* ================= IndexedDB ================= */
const DB_NAME = 'sitecase';
const STORE = 'cases';
let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function withStore(mode, run) {
  return openDB().then(db => new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const req = run(t.objectStore(STORE));
    t.oncomplete = () => resolve(req ? req.result : undefined);
    t.onerror = () => reject(t.error);
  }));
}

const dbPut = rec => withStore('readwrite', s => s.put(rec));
const dbGet = id => withStore('readonly', s => s.get(id));
const dbAll = () => withStore('readonly', s => s.getAll());
const dbDelete = id => withStore('readwrite', s => s.delete(id));

/* ================= 工具 ================= */
let toastTimer = null;
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 2600);
}

function fmtSize(n) {
  if (n == null) return '';
  if (n < 1024) return n + ' B';
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
  return (n / 1024 / 1024).toFixed(1) + ' MB';
}

function fmtDate(ts) {
  const d = new Date(ts);
  const p = x => String(x).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}

async function updateStorage() {
  if (!navigator.storage || !navigator.storage.estimate) return;
  try {
    const est = await navigator.storage.estimate();
    document.getElementById('storageInfo').textContent =
      '已用 ' + fmtSize(est.usage) + ' / ' + fmtSize(est.quota);
  } catch (e) { /* 忽略 */ }
}

/* ================= 导入（含去重） ================= */
const fileInput = document.getElementById('fileInput');
document.getElementById('importBtn').addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', async () => {
  const files = Array.from(fileInput.files || []);
  fileInput.value = '';
  if (!files.length) return;

  let added = 0, updated = 0, skipped = 0;
  for (const file of files) {
    try {
      const existing = await dbGet(file.name);
      if (existing && existing.lastModified === file.lastModified) {
        skipped++;
        continue;
      }
      const html = await file.text();
      await dbPut({
        id: file.name,
        name: file.name,
        lastModified: file.lastModified,
        size: file.size,
        html: html,
        addedAt: existing ? existing.addedAt : Date.now(),
        updatedAt: Date.now(),
      });
      existing ? updated++ : added++;
    } catch (err) {
      console.error('导入失败:', file.name, err);
      toast('「' + file.name + '」导入失败');
    }
  }

  toast('导入完成：新增 ' + added + '，更新 ' + updated + '，跳过 ' + skipped);

  // 首次导入后请求持久化，降低被系统回收的风险
  try { await navigator.storage.persist(); } catch (e) { /* 忽略 */ }

  renderList();
});

/* ================= 列表 ================= */
async function renderList() {
  let cases = [];
  try { cases = await dbAll(); } catch (e) { console.error(e); }
  cases.sort((a, b) => b.updatedAt - a.updatedAt);

  const list = document.getElementById('list');
  const empty = document.getElementById('empty');
  list.textContent = '';
  empty.hidden = cases.length > 0;

  for (const c of cases) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'card';
    const name = document.createElement('div');
    name.className = 'card-name';
    name.textContent = c.name;
    const meta = document.createElement('div');
    meta.className = 'card-meta';
    meta.textContent = fmtSize(c.size) + ' · ' + fmtDate(c.updatedAt);
    card.appendChild(name);
    card.appendChild(meta);
    card.addEventListener('click', () => openViewer(c.id));
    list.appendChild(card);
  }

  updateStorage();
}

/* ================= 查看器（sandbox iframe） ================= */
let currentCaseId = null;
let frameUrl = null;

function setFrame(html) {
  const frame = document.getElementById('frame');
  if (frameUrl) { URL.revokeObjectURL(frameUrl); frameUrl = null; }
  frameUrl = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
  frame.src = frameUrl;
}

async function openViewer(id) {
  const rec = await dbGet(id);
  if (!rec) return;
  currentCaseId = id;
  document.getElementById('viewerTitle').textContent = rec.name;
  setFrame(rec.html);
  document.getElementById('viewer').hidden = false;
}

function closeViewer() {
  document.getElementById('frame').src = 'about:blank';
  if (frameUrl) { URL.revokeObjectURL(frameUrl); frameUrl = null; }
  document.getElementById('viewer').hidden = true;
  currentCaseId = null;
}

document.getElementById('backBtn').addEventListener('click', closeViewer);

document.getElementById('deleteBtn').addEventListener('click', async () => {
  if (!currentCaseId) return;
  if (!confirm('删除这个案例？')) return;
  await dbDelete(currentCaseId);
  closeViewer();
  renderList();
  toast('已删除');
});

/* ================= 启动 ================= */
renderList();

// Service Worker：仅安全上下文可用（HTTPS 或 localhost）
if ('serviceWorker' in navigator &&
    (location.protocol === 'https:' ||
     location.hostname === 'localhost' ||
     location.hostname === '127.0.0.1')) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
