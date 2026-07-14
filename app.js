/* ============================================================
   CBL Corporate Brokers — Open Account Form  app.js
   All scripts local — no CDN / no internet required
   CJK font embedded to support Chinese text in PDF fields
   ============================================================ */
'use strict';

// ── TODAY (立即寫入，不等 DOMContentLoaded) ──────────────────
(function setToday() {
  var t = new Date();
  var p = function(n){ return String(n).padStart(2,'0'); };
  window.todayStr = p(t.getDate())+'/'+p(t.getMonth()+1)+'/'+t.getFullYear();
  function applyDate() {
    var el = document.getElementById('openDate');
    if (el) { el.value = window.todayStr; }
  }
  applyDate();
  // Fallback: also set on DOMContentLoaded and window.onload
  document.addEventListener('DOMContentLoaded', applyDate);
  window.addEventListener('load', applyDate);
})();

// ── LABELS ───────────────────────────────────────────────────
var INCOME_LABELS = {
  'leq100k'  : '\u2264 HK$100,000',
  '100k-250k': 'HK$100,001 ~ 250,000',
  '250k-500k': 'HK$250,001 ~ 500,000',
  '500k-1m'  : 'HK$500,001 ~ 1,000,000',
  '1m-2m'    : 'HK$1,000,001 ~ 2,000,000',
  'gt2m'     : '>HK$2,000,000'
};
var ADDR_LABELS = {
  '*\u81ea\u7f6e(Self-Owned) :\u6c92\u6709\u6309\u63ed(Mortgage Free)': '\u81ea\u7f6e\uff08\u7121\u6309\u63ed\uff09',
  '*\u81ea\u7f6e(Self-Owned) :\u6709\u6309\u63ed(Mortgaged)'          : '\u81ea\u7f6e\uff08\u6709\u6309\u63ed\uff09',
  '\u79df\u7528(Rented)'                                               : '\u79df\u4f4f',
  '\u8207\u5bb6\u4eba\u540c\u4f4f(Living with Family)'                : '\u8207\u5bb6\u4eba\u540c\u4f4f'
};

// ── FORCE UPPERCASE ON INPUT ─────────────────────────────────
// 填寫資料時自動轉大寫；不影響 select/radio/checkbox；IME 中文組字中不干擾
(function forceUppercaseInit(){
  function up(e){
    if (e.isComposing || e.keyCode === 229) return;            // 不打斷中文輸入法
    var el = e.target;
    if (!el) return;
    if (el.tagName === 'INPUT' && !/^(text|tel|email)$/.test(el.type || '')) return;
    if (el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA') return;
    var s = el.selectionStart, en = el.selectionEnd;
    el.value = el.value.toUpperCase();
    try { el.setSelectionRange(s, en); } catch(_){}             // 保持游標位置
  }
  document.addEventListener('input', up);
})();

// ── DOM READY ────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  var dateEl = document.getElementById('openDate');
  if (dateEl && !dateEl.value) dateEl.value = window.todayStr;

  initSigCanvas(); // signature canvas

  document.querySelectorAll('.tab-btn').forEach(function(btn) {
    btn.addEventListener('click', function() { goStep(+btn.dataset.step); });
  });
  document.querySelectorAll('.check-label input[type="checkbox"]').forEach(function(cb) {
    cb.addEventListener('change', function() {
      cb.closest('.check-label').classList.toggle('checked', cb.checked);
    });
  });
  updateProgress(1);

  // Wire up clickable document texts → open PDF page preview modal
  document.querySelectorAll('.doc-text[data-doc]').forEach(function(el) {
    el.addEventListener('click', function() { openDocModal(+el.getAttribute('data-doc')); });
  });
  var dm = document.getElementById('docModal');
  if (dm) {
    document.getElementById('docModalClose').addEventListener('click', closeDocModal);
    dm.addEventListener('click', function(e) { if (e.target === dm) closeDocModal(); });
  }
  var dbb = document.getElementById('docModalBody');
  if (dbb) dbb.addEventListener('scroll', onDocBodyScroll);
  refreshDocChecks();
  document.addEventListener('keydown', function(e) { if (e.key === 'Escape') closeDocModal(); });
});

// ── DOC PREVIEW MODAL ───────────────────────────────────────
// Each entry = the PDF page numbers (1-based) shown when that document's
// text is clicked. Index matches the data-doc attribute on the text span.
var DOC_TITLES = [
  '客戶聲明',
  '證券交易現金客戶協議',
  '風險披露聲明 (第7.3–15.8分條)',
  '風險披露聲明 (買賣的衍生產品)',
  '中華通北向交易委託客戶同意書',
  'CRS 自我證明表格',
  '香港投資者識別碼表格'
];
var DOC_PAGES = [
  [4, 5],
  [8, 9, 10, 11, 12, 13, 14, 15, 16, 17],
  [18],
  [19, 20],
  [21, 22],
  [24, 25],
  [45]
];

// ── DOC READ-GATE (必須睇完至可勾選) ───────────────────────
// readDocs[idx] = true 表示用戶已開啟並捲動到底部閱讀該文件
var readDocs = {};
var currentDocIdx = -1;

function docCheckboxFor(idx) {
  var span = document.querySelector('.doc-text[data-doc="' + idx + '"]');
  if (!span) return null;
  var label = span.closest('.check-label');
  return label ? label.querySelector('input[type="checkbox"]') : null;
}

function refreshDocChecks() {
  document.querySelectorAll('.doc-text[data-doc]').forEach(function(span) {
    var idx = +span.getAttribute('data-doc');
    var cb = docCheckboxFor(idx);
    if (!cb) return;
    var read = !!readDocs[idx];
    cb.disabled = !read;
    span.classList.toggle('doc-read', read);
    var label = cb.closest('.check-label');
    if (label) {
      label.classList.toggle('doc-locked', !read);
      label.classList.toggle('doc-unlocked', read);
    }
    var hint = span.querySelector('.doc-view-hint');
    if (hint) hint.textContent = read ? '✅ 已閱讀，可勾選' : '🔒 須閱讀至底（點擊查看）';
  });
}

function markDocRead(idx) {
  if (idx < 0) return;
  readDocs[idx] = true;
  refreshDocChecks();
}

function onDocBodyScroll() {
  var b = document.getElementById('docModalBody');
  if (!b) return;
  if (b.scrollHeight - b.scrollTop - b.clientHeight <= 6) markDocRead(currentDocIdx);
}

function openDocModal(idx) {
  var overlay = document.getElementById('docModal');
  var titleEl = document.getElementById('docModalTitle');
  var body    = document.getElementById('docModalBody');
  if (!overlay || !body) return;
  currentDocIdx = idx;
  titleEl.textContent = (DOC_TITLES[idx] || '文件') + ' — PDF 頁面預覽';
  body.innerHTML = '';
  body.scrollTop = 0;
  var pages = DOC_PAGES[idx] || [];
  if (!pages.length) {
    body.innerHTML = '<p style="color:#666">（無對應頁面）</p>';
    markDocRead(idx);
    overlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    return;
  }
  var pending = pages.length;
  pages.forEach(function(p) {
    var wrap = document.createElement('div');
    wrap.style.textAlign = 'center';
    var img = document.createElement('img');
    img.src = 'pdf_pages/page_' + p + '.png';
    img.alt = '第 ' + p + ' 頁';
    img.loading = 'lazy';
    img.onload = function() {
      pending--;
      if (pending === 0 && currentDocIdx === idx &&
          body.scrollHeight - body.clientHeight <= 6) {
        // 內容未超出視窗（短文件）→ 開啟即視為已閱讀
        markDocRead(idx);
      }
    };
    var tag = document.createElement('div');
    tag.className = 'doc-page-tag';
    tag.textContent = '第 ' + p + ' 頁';
    wrap.appendChild(img);
    wrap.appendChild(tag);
    body.appendChild(wrap);
  });
  overlay.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeDocModal() {
  var overlay = document.getElementById('docModal');
  if (!overlay) return;
  overlay.classList.add('hidden');
  document.body.style.overflow = '';
}

// ── STEP NAV ─────────────────────────────────────────────────
var currentStep = 1;
var TOTAL_STEPS = 12;

function goStep(n) {
  if (n > currentStep) {
    var err = validateStep(currentStep);
    if (err) { showToast(err); return; }
  }
  document.querySelectorAll('.step-section').forEach(function(s){ s.classList.remove('active'); });
  document.querySelectorAll('.tab-btn').forEach(function(b){ b.classList.remove('active'); });
  var sec = document.querySelector('.step-section[data-step="'+n+'"]');
  var tab = document.querySelector('.tab-btn[data-step="'+n+'"]');
  if (sec) { sec.classList.add('active'); window.scrollTo({top:0,behavior:'smooth'}); }
  if (tab)   tab.classList.add('active');
  currentStep = n;
  updateProgress(n);
  if (n === 12) { buildSummary(); ensureSigSized(); }
}

// ── PER-STEP VALIDATION ──────────────────────────────────────
function validateStep(step) {
  var d = collectData();
  if (step===1) {
    if (!d.accountNo) return '\u26a0\ufe0f \u8acb\u586b\u5beb\u6236\u53e3\u865f\u78bc';
    if (!d.aeName)    return '\u26a0\ufe0f \u8acb\u586b\u5beb\u958b\u6236\u4eba\u54e1';
    if (!d.aeCE)      return '\u26a0\ufe0f \u8acb\u586b\u5beb CE NO.';
  }
  if (step===2) {
    if (!d.title)      return '\u26a0\ufe0f \u8acb\u9078\u64c7\u7a31\u8b02';
    if (!d.engName)    return '\u26a0\ufe0f \u8acb\u586b\u5beb\u82f1\u6587\u5168\u540d';
    if (!d.idNo)       return '\u26a0\ufe0f \u8acb\u586b\u5beb\u8eab\u4efd\u8b49\u865f\u78bc';
    if (!d.dob)        return '\u26a0\ufe0f \u8acb\u9078\u64c7\u51fa\u751f\u65e5\u671f';
    if (!d.nationality)return '\u26a0\ufe0f \u8acb\u586b\u5beb\u570b\u7c4d';
    if (!d.usResident) return '\u26a0\ufe0f \u8acb\u9078\u64c7\u662f\u5426\u7f8e\u570b\u4eba\u58eb';
  }
  if (step===3) {
    if (!d.addrType)      return '\u26a0\ufe0f \u8acb\u9078\u64c7\u5730\u5740\u985e\u5225';
    if (!d.residAddr)     return '\u26a0\ufe0f \u8acb\u586b\u5beb\u4f4f\u5b85\u5730\u5740';
    if (!d.maritalStatus) return '\u26a0\ufe0f \u8acb\u9078\u64c7\u5a5a\u59fb\u72c0\u6cc1';
    if (!d.mobile)        return '\u26a0\ufe0f \u8acb\u586b\u5beb\u624b\u63d0\u96fb\u8a71';
  }
  // step 4 fields are optional - no validation required
  if (step===5) {
    if (!d.annualIncome) return '\u26a0\ufe0f \u8acb\u9078\u64c7\u6bcf\u5e74\u6536\u5165';
    if (!d.netAssets)    return '\u26a0\ufe0f \u8acb\u586b\u5beb\u8cc7\u7522\u6de8\u5024';
  }
  if (step===7) {
    if (!d.bankName)    return '\u26a0\ufe0f \u8acb\u586b\u5beb\u9280\u884c\u540d\u7a31';
    if (!d.bankAccName) return '\u26a0\ufe0f \u8acb\u586b\u5beb\u5e33\u6236\u540d\u7a31';
    if (!d.hkdAcc)      return '\u26a0\ufe0f \u8acb\u586b\u5beb HKD \u5e33\u6236\u865f\u78bc';
  }
  if (step===8) {
    if (!d.beneficiary) return '\u26a0\ufe0f \u8acb\u9078\u64c7\u6700\u7d42\u53d7\u76ca\u4eba';
    if (!d.affiliated)  return '\u26a0\ufe0f \u8acb\u9078\u64c7\u89aa\u5c6c\u95dc\u4fc2';
    if (!d.sfc)         return '\u26a0\ufe0f \u8acb\u9078\u64c7\u4ea4\u6613\u6240/\u8b49\u76e3\u4e8b\u9805';
  }
  return null;
}

function updateProgress(n) {
  var pct = Math.round((n / TOTAL_STEPS) * 100);
  document.getElementById('progressBar').style.width = pct + '%';
  document.getElementById('progressLabel').textContent = n + ' / ' + TOTAL_STEPS;
}

// ── TOGGLE HELPERS ───────────────────────────────────────────
function show(id,v){ document.getElementById(id).classList.toggle('hidden',!v); }
function toggleSpouse()      { show('spouseSection',    gr('maritalStatus')==='married'); }
function toggleBeneficiary() { show('beneficiaryDetail', gr('beneficiary')==='other');   }
function toggleAffiliated()  { show('affiliatedDetail',  gr('affiliated')==='yes');      }
function toggleSFC()         { show('sfcDetail',          gr('sfc')==='yes');             }
function toggleInvOther(cb)  { show('invOtherDetail', cb.checked);                       }
function toggleNilIncome(cb) {
  if (cb.checked) ['incRental','incSalary','incBusiness','incOther'].forEach(function(id) {
    var el=document.getElementById(id);
    if(el){ el.checked=false; el.closest('.check-label').classList.remove('checked'); }
  });
  if (cb.checked) show('incOtherDetail', false);
}
function toggleIncOther(cb) {
  show('incOtherDetail', cb.checked);
  if (cb.checked) {
    var nil = document.getElementById('incNil');
    if (nil) { nil.checked = false; nil.closest('.check-label').classList.remove('checked'); }
  }
}
function syncSecCbk(cb) {
  // Checkbox for Securities experience (投資經驗1)
  if (!cb.checked) {
    document.querySelectorAll('input[name="expSecurities"]').forEach(function(r){ r.checked = false; });
  }
}
function syncFutCbk(cb) {
  // Checkbox for Futures/Options experience (投資經驗3)
  if (!cb.checked) {
    document.querySelectorAll('input[name="expFutures"]').forEach(function(r){ r.checked = false; });
  }
}


// ── DATA HELPERS ─────────────────────────────────────────────
function gv(id)  { var e=document.getElementById(id); return e?(e.value||'').trim():''; }
function gr(nm)  { var e=document.querySelector('input[name="'+nm+'"]:checked'); return e?e.value:''; }
function gcb(nm) { return Array.from(document.querySelectorAll('input[name="'+nm+'"]:checked')).map(function(c){return c.value;}); }

function collectData() {
  return {
    accountNo:gv('accountNo'), openDate:gv('openDate'), aeName:gv('aeName'), aeCE:gv('aeCE'),
    title:gv('title'), engName:gv('engName'), chiName:gv('chiName'),
    idNo:gv('idNo'), dob:gv('dob'), nationality:gv('nationality'), usResident:gr('usResident'),
    addrType:gv('addrType'), residAddr:gv('residAddr'), mailAddr:gv('mailAddr'),
    maritalStatus:gr('maritalStatus'), spouseName:gv('spouseName'),
    email:gv('email'), mobile:gv('mobile'), homePhone:gv('homePhone'),
    employer:gv('employer'), industry:gv('industry'), position:gv('position'),
    yearsEmployed:gv('yearsEmployed'), officeAddr:gv('officeAddr'),
    incomeSrc:gcb('incomeSrc'), incOtherText:gv('incOtherText'), annualIncome:gv('annualIncome'),
    netAssets:gv('netAssets'), assets:gcb('assets'),
    invPurpose:gcb('invPurpose'), invOtherText:gv('invOtherText'),
    expSecurities:gr('expSecurities'), expFutures:gr('expFutures'),
    expSecCbk:!!(document.getElementById('expSecCbk')&&document.getElementById('expSecCbk').checked),
    expFutCbk:!!(document.getElementById('expFutCbk')&&document.getElementById('expFutCbk').checked),
    bankName:gv('bankName'), bankAccName:gv('bankAccName'), hkdAcc:gv('hkdAcc'), rmbAcc:gv('rmbAcc'),
    beneficiary:gr('beneficiary'), bene_name:gv('bene_name'), bene_rel:gv('bene_rel'),
    bene_id:gv('bene_id'), bene_addr:gv('bene_addr'),
    affiliated:gr('affiliated'), aff_name:gv('aff_name'), aff_rel:gv('aff_rel'), aff_dept:gv('aff_dept'),
    sfc:gr('sfc'), sfc_exchange:gv('sfc_exchange'), sfc_position:gv('sfc_position'),
    onlineRate:gv('onlineRate'), onlineMin:gv('onlineMin'),
    phoneRate:gv('phoneRate'), phoneMin:gv('phoneMin'),
    toggleInternet:!!(document.getElementById('toggleInternet')&&document.getElementById('toggleInternet').checked),
    toggleMobile:  !!(document.getElementById('toggleMobile')  &&document.getElementById('toggleMobile').checked)
  };
}

// ── SUMMARY ──────────────────────────────────────────────────
function buildSummary() {
  var d=collectData();
  var aM={property:'\u7269\u696d',securities:'\u8b49\u5238\u2215\u57fa\u91d1',deposit:'\u5b58\u6b3e',others:'\u5176\u4ed6'};
  var iM={nil:'\u6c92\u6709',rental:'\u79df\u91d1',salary:'\u85aa\u91d1',business:'\u696d\u52d9\u6ea2\u5229'};
  var pM={dividend:'\u80a1\u606f\u6536\u5165',longterm:'\u9577\u7dda\u5897\u5024',speculative:'\u6295\u6a5f\u5897\u5024',other:'\u5176\u4ed6'};
  var eM={none:'\u672a\u6709\u7d93\u9a57',lt1:'< 1 \u5e74','1-5':'1-5 \u5e74','5-10':'5-10 \u5e74',gt10:'> 10 \u5e74'};
  var secs=[
    {i:'\ud83d\udccb',t:'\u5e33\u865f\u57fa\u672c\u8cc7\u6599',r:[['\u6236\u53e3\u865f\u78bc',d.accountNo],['\u958b\u6236\u4eba\u54e1',d.aeName],['CE NO.',d.aeCE],['\u958b\u6236\u65e5\u671f',d.openDate]]},
    {i:'\ud83d\udc64',t:'\u500b\u4eba\u8cc7\u6599',r:[['\u7a31\u8b02',d.title],['\u82f1\u6587\u5168\u540d',d.engName],['\u4e2d\u6587\u59d3\u540d',d.chiName||'\u2014'],['\u8eab\u4efd\u8b49\u865f\u78bc',d.idNo],['\u51fa\u751f\u65e5\u671f',formatDOB(d.dob)],['\u570b\u7c4d',d.nationality],['\u7f8e\u570b\u4eba\u58eb',d.usResident==='am'?'\u26a0\ufe0f \u662f':'\u5426']]},
    {i:'\ud83c\udfe0',t:'\u4f4f\u5740\u53ca\u901a\u8a0a',r:[['\u5730\u5740\u985e\u5225',ADDR_LABELS[d.addrType]||d.addrType],['\u4f4f\u5b85\u5730\u5740',d.residAddr],['\u901a\u8a0a\u5730\u5740',d.mailAddr||'\u540c\u4f4f\u5b85'],['\u5a5a\u59fb\u72c0\u6cc1',d.maritalStatus==='married'?'\u5df2\u5a5a':'\u55ae\u8eab'],['\u914d\u5076\u59d3\u540d',d.maritalStatus==='married'?(d.spouseName||'\u672a\u586b'):'\u2014'],['\u96fb\u90f5',d.email],['\u624b\u63d0\u96fb\u8a71',d.mobile],['\u4f4f\u5b85\u96fb\u8a71',d.homePhone||'\u2014']]},
    {i:'\ud83d\udcbc',t:'\u696d\u52d9\u5de5\u4f5c',r:[['\u96c7\u4e3b',d.employer],['\u884c\u696d',d.industry],['\u8077\u4f4d',d.position],['\u5e74\u671f',d.yearsEmployed],['\u516c\u53f8\u5730\u5740',d.officeAddr||'\u2014']]},
    {i:'\ud83d\udcb0',t:'\u8ca1\u52d9\u72c0\u6cc1',r:[['\u6536\u5165\u4f86\u6e90',d.incomeSrc.map(function(v){return iM[v]||v;}).join('\u3001')||'\u2014'],['\u6bcf\u5e74\u6536\u5165',INCOME_LABELS[d.annualIncome]||'\u2014'],['\u8cc7\u7522\u6de8\u5024',d.netAssets?'HK$ '+d.netAssets:'\u2014'],['\u6240\u6301\u8cc7\u7522',d.assets.map(function(v){return aM[v]||v;}).join('\u3001')||'\u2014']]},
    {i:'\ud83d\udcc8',t:'\u6295\u8cc7\u7d93\u9a57',r:[['\u6295\u8cc7\u76ee\u7684',d.invPurpose.map(function(v){return pM[v]||v;}).join('\u3001')||'\u2014'],['\u8b49\u5238\u5e74\u671f',eM[d.expSecurities]||'\u2014'],['\u671f\u8ca8/\u671f\u6b0a',eM[d.expFutures]||'\u2014']]},
    {i:'\ud83c\udfe6',t:'\u9280\u884c\u5e33\u6236',r:[['\u9280\u884c\u540d\u7a31',d.bankName],['\u5e33\u6236\u540d\u7a31',d.bankAccName],['HKD \u5e33\u865f',d.hkdAcc],['RMB \u5e33\u865f',d.rmbAcc||'\u2014']]},
    {i:'\ud83d\udcdc',t:'\u8072\u660e',r:[['\u6700\u7d42\u53d7\u76ca\u4eba',d.beneficiary==='self'?'\u5ba2\u6236\u672c\u4eba':'\u5176\u4ed6:'+d.bene_name],['\u89aa\u5c6c\u95dc\u4fc2',d.affiliated==='yes'?'\u6709:'+d.aff_name:'\u6c92\u6709'],['\u4ea4\u6613\u6240/\u8b49\u76e3',d.sfc==='yes'?'\u662f:'+d.sfc_exchange:'\u4e0d\u662f']]},
    {i:'\ud83d\udcca',t:'\u4f63\u91d1\u8cbb\u7528',r:[['\u7db2\u4e0a\u4f63\u91d1\u7387',d.onlineRate?d.onlineRate+'%':'\u2014'],['\u7db2\u4e0a\u6700\u4f4e\u8cbb',d.onlineMin?'HK$ '+d.onlineMin:'\u2014'],['\u96fb\u8a71\u4f63\u91d1\u7387',d.phoneRate?d.phoneRate+'%':'\u2014'],['\u96fb\u8a71\u6700\u4f4e\u8cbb',d.phoneMin?'HK$ '+d.phoneMin:'\u2014'],['\u903e\u671f\u5229\u606f','P+5%'],['\u7d50\u7b97\u8cbb','0.1% min $5']]},
    {i:'\ud83d\udcbb',t:'\u96fb\u5b50\u4ea4\u6613\u670d\u52d9',r:[['\u4e92\u806f\u7db2\u4ea4\u6613',d.toggleInternet?'\u2705 \u7533\u8acb':'\u274c \u4e0d\u7533\u8acb'],['\u6d41\u52d5\u96fb\u8a71\u4ea4\u6613',d.toggleMobile?'\u2705 \u7533\u8acb':'\u274c \u4e0d\u7533\u8acb']]}
  ];
  if (typeof window!=='undefined') window.__SUMMARY_SECS = secs;
  var html='';
  secs.forEach(function(s){
    html+='<div class="summary-section"><div class="summary-section-title">'+s.i+' '+s.t+'</div><div class="summary-rows">';
    s.r.forEach(function(row){
      var k=row[0],v=row[1],empty=(!v||v==='\u2014');
      var cls=empty?' empty':(String(v).indexOf('\u26a0')===0?' warn':'');
      html+='<div class="summary-row"><div class="summary-key">'+k+'</div><div class="summary-val'+cls+'">'+(v||'\u672a\u586b\u5beb')+'</div></div>';
    });
    html+='</div></div>';
  });
  // ── Step-11 document acknowledgements ──
  var docChecks = document.querySelectorAll('input[name^="docAck"]');
  if (docChecks.length) {
    var docHtml = '';
    docChecks.forEach(function(cb){
      var label = cb.closest('.check-label');
      var txt = label ? label.querySelector('.doc-text, .doc-text-noclick') : null;
      // Use short data-title for summary display; fallback to trimmed text
      var name = txt ? (txt.getAttribute('data-title') || txt.textContent.trim()) : (cb.name || '文件');
      // Strip any leftover 📄 查看 from name
      name = name.replace(/[\s📄查看]+/g,'').trim();
      var ok = cb.checked;
      docHtml += '<div class="summary-row doc-summary-row"><div class="summary-key">'+name+'</div>'
               + '<div class="summary-val '+(ok?'':'empty')+'">'
               + (ok ? '\u2705 已確認' : '\u274c 未確認') + '</div></div>';
    });
    html += '<div class="summary-section"><div class="summary-section-title">\uD83D\uDCDD 簽署文件確認</div><div class="summary-rows">' + docHtml + '</div></div>';
  }
  document.getElementById('summaryContent').innerHTML=html;
}

// ── CONFIRMATION PAGE (PDF) ─────────────────────────────────
// Strip emoji / symbols the embedded CJK font cannot render, and collapse spaces.
function pdfClean(s){
  if (s===null||s===undefined) return '';
  s=String(s);
  s=s.replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}]/gu,'');
  s=s.replace(/\u26A0/g,'!');           // ⚠ -> !
  return s.replace(/\s+/g,' ').trim();
}
// Wrap text to a max width (CJK breaks per-char, latin keeps words).
function pdfWrap(text, font, size, maxW){
  text=pdfClean(text);
  if (!text) return [''];
  var out=[], line='';
  for (var i=0;i<text.length;i++){
    var ch=text[i];
    var test=line+ch;
    if (font.widthOfTextAtSize(test,size)>maxW && line){
      var sp=line.lastIndexOf(' ');
      if (sp>0 && /[A-Za-z0-9]/.test(ch) && /[A-Za-z0-9]/.test(line[line.length-1])){
        out.push(line.slice(0,sp)); line=line.slice(sp+1)+ch;
      } else { out.push(line); line=ch; }
    } else line=test;
  }
  if (line) out.push(line);
  return out.length?out:[''];
}
// Append a final "Account Application Data Confirmation" page bearing the
// customer's handwritten signature. Only called when the customer actually signed.
function appendConfirmationPage(pdfDoc, cjkFont, d, sigImage){
  if (typeof window!=='undefined' && !window.__SUMMARY_SECS){ try{ buildSummary(); }catch(_){} }
  var secs = (typeof window!=='undefined' && window.__SUMMARY_SECS) ? window.__SUMMARY_SECS.slice() : [];

  // Append the Step-11 document acknowledgements as the last block.
  var docRows=[];
  var docChecks=document.querySelectorAll('input[name^="docAck"]');
  docChecks.forEach(function(cb){
    var label=cb.closest('.check-label');
    var txt=label?label.querySelector('.doc-text, .doc-text-noclick'):null;
    var name=txt?(txt.getAttribute('data-title')||txt.textContent.trim()):(cb.name||'文件');
    name=name.replace(/[\s📄查看]+/g,'').trim();
    docRows.push([pdfClean(name), cb.checked?'已確認':'未確認']);
  });
  secs.push({t:'簽署文件確認', r:docRows});

  var PW=595.28, PH=841.89;        // A4
  var mL=40, mR=40, mT=46, mB=40;
  var cW=PW-mL-mR;
  var y=PH-mT;
  var page=pdfDoc.addPage([PW,PH]);
  var rgb=PDFLib.rgb;

  function need(h){ if (y-h<mB){ page=pdfDoc.addPage([PW,PH]); y=PH-mT; } }

  // Header
  page.drawText(pdfClean('開戶申請資料確認'), {x:mL,y:y,size:16,font:cjkFont,color:rgb(0,0,0)});
  y-=20;
  page.drawText(pdfClean('Account Application Data Confirmation'), {x:mL,y:y,size:9,font:cjkFont,color:rgb(0.45,0.45,0.45)});
  y-=15;
  page.drawText(pdfClean('戶口號碼: '+(d.accountNo||'—')+'    開戶日期: '+(d.openDate||'—')), {x:mL,y:y,size:9,font:cjkFont,color:rgb(0.2,0.2,0.2)});
  y-=13;
  page.drawLine({start:{x:mL,y:y},end:{x:PW-mR,y:y},thickness:0.8,color:rgb(0.8,0.8,0.8)});
  y-=16;

  var secSize=11, rowSize=9.5, lh=13, keyW=118;
  secs.forEach(function(s){
    need(secSize+8);
    page.drawText(pdfClean(s.t), {x:mL,y:y,size:secSize,font:cjkFont,color:rgb(0.78,0.06,0.18)});
    y-=lh;
    page.drawLine({start:{x:mL,y:y},end:{x:PW-mR,y:y},thickness:0.3,color:rgb(0.9,0.9,0.9)});
    y-=lh-2;
    (s.r||[]).forEach(function(row){
      var key=pdfClean(row[0]||'');
      var valLines=pdfWrap(row[1]==null?'':row[1], cjkFont, rowSize, cW-keyW);
      var blockH=Math.max(lh, valLines.length*lh);
      need(blockH);
      page.drawText(key, {x:mL,y:y,size:rowSize,font:cjkFont,color:rgb(0.35,0.35,0.35)});
      var vy=y;
      valLines.forEach(function(vl){
        page.drawText(vl, {x:mL+keyW,y:vy,size:rowSize,font:cjkFont,color:rgb(0,0,0)});
        vy-=lh;
      });
      y-=blockH;
    });
    y-=6;
  });

  // Signature block
  need(90);
  y-=8;
  page.drawText(pdfClean('客戶簽署 Client Signature'), {x:mL,y:y,size:11,font:cjkFont,color:rgb(0,0,0)});
  y-=14;
  var sd=sigImage.scale(1);
  var maxW=260, maxH=70;
  var sc=Math.min(maxW/sd.width, maxH/sd.height);
  if (!isFinite(sc)||sc<=0) sc=1;
  var dw=sd.width*sc, dh=sd.height*sc;
  var sigY=y-dh;
  page.drawRectangle({x:mL-2,y:sigY-6,width:maxW+4,height:dh+12,borderColor:rgb(0.7,0.7,0.7),borderWidth:0.6});
  page.drawImage(sigImage, {x:mL, y:sigY, width:dw, height:dh});
  y=sigY-16;
  page.drawText(pdfClean('簽署日期 Date: '+(d.openDate||'')), {x:mL,y:y,size:9,font:cjkFont,color:rgb(0.2,0.2,0.2)});
}

// ── TOAST / OVERLAY ──────────────────────────────────────────
function showToast(msg,ms){
  var t=document.getElementById('toast');
  t.textContent=msg; t.classList.remove('hidden');
  clearTimeout(window._tt);
  window._tt=setTimeout(function(){ t.classList.add('hidden'); },ms||3500);
}
function showOverlay(v){ document.getElementById('loadingOverlay').classList.toggle('hidden',!v); }

// ── EXPORT ───────────────────────────────────────────────────
// Direct export: validate steps 1–10, then generate & save/share the PDF.
function exportPDF(){
  for(var s=1;s<=10;s++){
    var e=validateStep(s);
    if(e){ showToast(e); goStep(s); return; }
  }
  showOverlay(true);
  fillAndExportPDF(collectData()).catch(function(err){
    showOverlay(false);
    console.error(err);
    alert('\u274c PDF \u532f\u51fa\u5931\u6557\uff1a\n\n'+err.message+'\n\n\u8acb\u6aa2\u67e5 Console (F12)');
  });
}

// Detect touch-first devices (tablet/phone) — prefer share sheet there.
function isMobileDevice(){
  var ua = navigator.userAgent || '';
  if(/Android|iPhone|iPad|iPod/i.test(ua)) return true;
  // iPadOS 13+ reports as Macintosh but has touch points
  if(/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) return true;
  return false;
}

// Save the PDF letting the user choose the location where possible.
//  - Tablet/phone  → system share sheet (save to Drive / Files / any app)
//  - PC (HTTPS)    → native "Save As" dialog (pick folder + rename)
//  - fallback      → ordinary browser download (Downloads folder)
// Returns one of: 'shared' | 'saved' | 'downloaded' | 'cancelled'.
async function savePDF(bytes, fname){
  var blob = new Blob([bytes], { type: 'application/pdf' });

  // PC → native Save As dialog (needs HTTPS or localhost)
  if (typeof window.showSaveFilePicker === 'function') {
    try {
      var handle = await window.showSaveFilePicker({
        suggestedName: fname,
        types: [{ description: 'PDF', accept: { 'application/pdf': ['.pdf'] } }]
      });
      var w = await handle.createWritable();
      await w.write(blob);
      await w.close();
      return 'saved';
    } catch(e) {
      if (e && e.name === 'AbortError') return 'cancelled';
      // 使用者取消或失敗 → 退回普通下載
    }
  }

  // 其餘情況（平板/手機/唔支援 Save As）→ 普通下載，不彈系統分享表
  download(bytes, fname, 'application/pdf');
  return 'downloaded';
}


// ── FORMAT HELPERS ───────────────────────────────────────────
function formatDOB(dob){
  if(!dob) return '';
  // If already dd/mm/yyyy format, return as-is
  if(/^\d{2}\/\d{2}\/\d{4}$/.test(dob)) return dob;
  // If YYYY-MM-DD from old date picker, convert
  var p=dob.split('-');
  return p.length===3?p[2]+'/'+p[1]+'/'+p[0]:dob;
}

// ── SIGNATURE CANVAS ───────────────────────────────────────
var sigCanvas, sigCtx, sigDrawing = false, sigSized = false;

function initSigCanvas(){
  sigCanvas = document.getElementById('sigCanvas');
  if (!sigCanvas) return;
  sigCtx = sigCanvas.getContext('2d');
  // Do NOT size here: the canvas is inside a display:none step at load, so
  // its box is 0x0. It gets sized lazily by ensureSigSized() when step 11
  // becomes visible (and defensively on the first pointerdown).
  // Pointer Events cover mouse, touch and pen uniformly and fix the
  // "mouse can't draw" problem caused by split mouse/touch listeners.
  sigCanvas.addEventListener('pointerdown', startDraw);
  sigCanvas.addEventListener('pointermove', draw);
  sigCanvas.addEventListener('pointerup', endDraw);
  sigCanvas.addEventListener('pointerleave', endDraw);
  sigCanvas.addEventListener('pointercancel', endDraw);
}
function sizeSigCanvas(){
  if (!sigCanvas || !sigCtx) return;
  var r = sigCanvas.getBoundingClientRect();
  var w = Math.max(1, Math.floor(r.width  * window.devicePixelRatio));
  var h = Math.max(1, Math.floor(r.height * window.devicePixelRatio));
  sigCanvas.width  = w;
  sigCanvas.height = h;
  sigCtx.setTransform(1, 0, 0, 1, 0, 0);
  sigCtx.scale(window.devicePixelRatio, window.devicePixelRatio);
}
// The canvas lives inside a stepped section that is display:none at load,
// so it measures 0x0 until its step is shown. Size it the first time it is
// actually visible. Once sized we leave it alone, so revisiting the step
// preserves an already-drawn signature.
function ensureSigSized(){
  if (!sigCanvas || !sigCtx || sigSized) return;
  var r = sigCanvas.getBoundingClientRect();
  if (r.width > 0 && r.height > 0) {
    sizeSigCanvas();
    sigSized = true;
  }
}
function getPos(e){
  var r = sigCanvas.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}
function startDraw(e){
  e.preventDefault();
  // Size on demand if it somehow isn't sized yet (defensive, in case the
  // step-show hook ran before layout was ready).
  ensureSigSized();
  if (sigCanvas.setPointerCapture) {
    try { sigCanvas.setPointerCapture(e.pointerId); } catch (_) {}
  }
  sigDrawing = true;
  var p = getPos(e);
  sigCtx.beginPath();
  sigCtx.moveTo(p.x, p.y);
  draw(e);
}
function endDraw(){
  sigDrawing = false;
  if (sigCtx) sigCtx.beginPath();
}
function draw(e){
  if (!sigDrawing || !sigCtx) return;
  e.preventDefault();
  var p = getPos(e);
  sigCtx.lineWidth   = 2.5;
  sigCtx.lineCap    = 'round';
  sigCtx.lineJoin   = 'round';
  sigCtx.strokeStyle= '#1a1a2e';
  sigCtx.lineTo(p.x, p.y);
  sigCtx.stroke();
  sigCtx.beginPath();
  sigCtx.moveTo(p.x, p.y);
}
function clearSig(){
  if (!sigCtx || !sigCanvas) return;
  sigCtx.save();
  sigCtx.setTransform(1, 0, 0, 1, 0, 0);
  sigCtx.clearRect(0, 0, sigCanvas.width, sigCanvas.height);
  sigCtx.restore();
}
function getSigDataUrl(){
  if (!sigCanvas) return null;
  try {
    var w=Math.floor(sigCanvas.width), h=Math.floor(sigCanvas.height);
    var px=sigCtx.getImageData(0,0,w,h).data;
    for(var i=3;i<px.length;i+=4) if(px[i]>0) return sigCanvas.toDataURL('image/png');
  }catch(e){}
  return null;
}
function dataURLToBytes(dataurl){
  var parts=dataurl.split(','), bstr=atob(parts[1]), n=bstr.length, u8=new Uint8Array(n);
  while(n--) u8[n]=bstr.charCodeAt(n);
  return u8;
}

// Uint8Array -> base64 string (chunked to avoid call-stack overflow on big PDFs)
function bytesToBase64(bytes){
  var bin='', chunk=0x8000;
  for(var i=0;i<bytes.length;i+=chunk){
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i+chunk));
  }
  return btoa(bin);
}

function b64ToBytes(b64){
  var bin=atob(b64),arr=new Uint8Array(bin.length);
  for(var i=0;i<bin.length;i++) arr[i]=bin.charCodeAt(i);
  return arr;
}

// ── LAZY ASSET LOADER ───────────────────────────────────────
// The PDF engine + big data files are NOT loaded at page startup
// (they total ~16MB). We fetch them only on first export so the
// app shell opens in ~300KB. Scripts are cached after first load.
function loadScript(src){
  return new Promise(function(res, rej){
    var existing = document.querySelector('script[data-lazy="'+src+'"]');
    if (existing && existing.dataset.loaded === '1') { res(); return; }
    if (existing && existing.dataset.loaded !== '1') {
      // still loading from a previous concurrent call
      existing.addEventListener('load', res);
      existing.addEventListener('error', function(){ rej(new Error('載入失敗: '+src)); });
      return;
    }
    var s = document.createElement('script');
    s.src = src;
    s.setAttribute('data-lazy', src);
    s.onload = function(){ s.dataset.loaded = '1'; res(); };
    s.onerror = function(){ rej(new Error('載入失敗: '+src)); };
    document.head.appendChild(s);
  });
}

async function ensureExportAssets(){
  var need = [];
  if (typeof PDFLib==='undefined')            need.push('pdf-lib.min.js');
  if (typeof fontkit==='undefined')           need.push('fontkit.umd.min.js');
  if (typeof PDF_TEMPLATE_B64==='undefined' || !PDF_TEMPLATE_B64) need.push('pdf-data.js');
  if (typeof CJK_FONT_B64==='undefined'    || !CJK_FONT_B64)       need.push('font-data.js');
  if (need.length) await Promise.all(need.map(loadScript));
}

// ── FILL & EXPORT PDF ────────────────────────────────────────
async function fillAndExportPDF(d) {
  showOverlay(true);
  try {
    await ensureExportAssets();
  } catch(e) {
    showOverlay(false);
    throw new Error('匯出元件載入失敗：' + e.message);
  }
  if (typeof PDF_TEMPLATE_B64==='undefined'||!PDF_TEMPLATE_B64)
    throw new Error('PDF 模板未載入');
  if (typeof CJK_FONT_B64==='undefined'||!CJK_FONT_B64)
    throw new Error('中文字型未載入');
  if (typeof fontkit==='undefined')
    throw new Error('fontkit 未載入');

  var pdfBytes  = b64ToBytes(PDF_TEMPLATE_B64);
  var fontBytes = b64ToBytes(CJK_FONT_B64);

  var pdfDoc = await PDFLib.PDFDocument.load(pdfBytes, {ignoreEncryption:true});
  pdfDoc.registerFontkit(fontkit);
  var cjkFont = await pdfDoc.embedFont(fontBytes);
  var form    = pdfDoc.getForm();
  var PDFHexString = PDFLib.PDFHexString;

  // ── helpers ──────────────────────────────────────────────
  // CJK text: set value as PDFHexString (bypasses WinAnsi entirely)
  function txCJK(name, val) {
    if (!val) return;
    try {
      var f = form.getTextField(name);
      f.acroField.setValue(PDFHexString.fromText(val));
      f.markAsDirty();
    } catch(_) {}
  }
  // ASCII-only fields
  function tx(name, val) {
    try { form.getTextField(name).setText((val||'').toUpperCase()); } catch(_) {}
  }
  // Auto-detect CJK
  function txAuto(name, val) {
    if (!val) { tx(name,''); return; }
    if (/[\u2E80-\u9FFF\uF900-\uFAFF]/.test(val)) txCJK(name,val);
    else tx(name,val);
  }
  function chk(n)  {
    try {
      var cb = form.getCheckBox(n);
      var onVal = cb.acroField.getOnValue();
      cb.acroField.setValue(onVal || PDFLib.PDFName.of('On'));
      cb.markAsDirty();
    } catch(_) {}
  }
  function uchk(n) {
    try {
      var cb = form.getCheckBox(n);
      cb.acroField.setValue(PDFLib.PDFName.of('Off'));
      cb.markAsDirty();
    } catch(_) {}
  }
  // Dropdown: set by matching existing option value directly via acroField
  function dd(name, val) {
    try {
      var f = form.getDropdown(name);
      var opts = f.getOptions();
      if (opts.includes(val)) f.select(val);
    } catch(_) {}
  }

  // ── Account / AE ─────────────────────────────────────────
  tx('Account No. #1',d.accountNo); 
  txAuto('見證人',d.aeName);
  tx('fill_2_5',d.aeCE);
    ['日期25_af_date'].forEach(function(f){ tx(f,d.openDate); });

  // ── Personal ─────────────────────────────────────────────
  dd('姓名',d.title);
  txAuto('Account Name #1',d.engName);
  txCJK('Chinese Name',d.chiName);
  tx('ID No',d.idNo);
  tx('Single日期25_af_date',formatDOB(d.dob));
  txAuto('Nationality',d.nationality);
  // US resident dropdowns - use ASCII values only
  var isUS=d.usResident==='am';
  dd('Notionality', isUS?'am':'am not');
  dd('I am 1',      isUS?'am':'am not');
  // For Chinese dropdowns, set acroField value directly as HexString
  try {
    var f1=form.getDropdown('Notionality#1');
    f1.acroField.setValue(PDFHexString.fromText(isUS?'\u662f':'\u4e0d\u662f'));
    f1.markAsDirty();
  } catch(_){}
  try {
    var f2=form.getDropdown('I am2');
    f2.acroField.setValue(PDFHexString.fromText(isUS?'\u662f':'\u4e0d\u662f'));
    f2.markAsDirty();
  } catch(_){}

  // ── Address & Contact ────────────────────────────────────
  dd('Dropdown17',d.addrType);
  txCJK('Residential Address   se#1',d.residAddr);
  // 通訊地址：只有填寫且不等於住宅地址時才寫入 PDF
  var mail = (d.mailAddr && d.mailAddr.trim()) ? d.mailAddr.trim() : '';
  if (mail && mail !== d.residAddr.trim()) {
    txCJK('\u901a\u8a0a1', mail);
    txCJK('\u901a\u8a0a2', mail);
  }
  if(d.maritalStatus==='married'){
    chk('Married'); chk('己婚'); uchk('Single'); uchk('單身');
    txCJK('Text4',d.spouseName);
  } else {
    chk('Single'); chk('單身'); uchk('Married'); uchk('己婚');
  }
  tx('SingleText5',d.email);
  tx('singleText6',d.mobile);
  // 電子郵件 dropdown: 是(YES) if email filled, NO(否) if empty
  var emailYN = (d.email && d.email.trim()) ? '是(YES)' : 'NO(否)';
  dd('電子郵件',  emailYN);
  dd('電子郵件2', emailYN);
  tx('singleText7',d.homePhone);

  // ── Employment ───────────────────────────────────────────
  txCJK('fill_11',d.employer);    txCJK('Industry',d.industry);
  txCJK('fill_14',d.position);    txCJK('fill_15',d.yearsEmployed);
  txCJK('fill_17',d.officeAddr);
 
  // ── Financial Single (Page 3) ────────────────────────────
  var inc=d.incomeSrc;
  inc.includes('nil')      ? chk('Income')  : uchk('Income');
  inc.includes('rental')   ? chk('Income3') : uchk('Income3');
  inc.includes('salary')   ? chk('Income1') : uchk('Income1');
  inc.includes('business') ? chk('Income#4') : uchk('Income#4');
  inc.includes('other')    ? chk('Income#5') : uchk('Income#5');
  var sIM={'leq100k':'Income#6','100k-250k':'Income#9','250k-500k':'Income#7',
           '500k-1m':'Income#10','1m-2m':'Income#8','gt2m':'Income#11'};
  ['Income#6','Income#9','Income#7','Income#10','Income#8','Income#11'].forEach(function(n){uchk(n);});
  if(sIM[d.annualIncome]) chk(sIM[d.annualIncome]);
  var ast=d.assets;
  ast.includes('property')   ? chk('Income#12') : uchk('Income#12');
  ast.includes('securities') ? chk('Income#14') : uchk('Income#14');
  ast.includes('deposit')    ? chk('Income#13') : uchk('Income#13');
  ast.includes('others')     ? chk('Income#15') : uchk('Income#15');
  // 其他收入來源：主申請人選「其他」→ 剔 Income#5  checkbox，並填寫描述文字「其他」
  // （join其他1 屬聯名申請人欄位，不應由主申請人的 incOtherText 填寫）
  if (d.incomeSrc.includes('other')) {
    txCJK('其他', d.incOtherText);
  }
  txAuto('singleundefined_5',d.netAssets?'HK$ '+d.netAssets:'');

  // ── Financial Join (Page 5) ──────────────────────────────
  txAuto('singleundefined_5',d.netAssets?'HK$ '+d.netAssets:'');
  
  // ── Investment Single ────────────────────────────────────
  // 投資經驗 checkbox 對認（證券與期貨/期權指向同一組欄位 投資經驗1-8）
  d.expSecCbk ? chk('投資經驗1') : uchk('投資經驗1');
  d.expFutCbk ? chk('投資經驗3') : uchk('投資經驗3');

  var ip=d.invPurpose;
  ip.includes('dividend')    ? chk('投資目的1') : uchk('投資目的1');
  ip.includes('longterm')    ? chk('投資目的2') : uchk('投資目的2');
  ip.includes('speculative') ? chk('投資目的3') : uchk('投資目的3');
  ip.includes('other')       ? chk('投資目的4') : uchk('投資目的4');
  // 年期（證券與期貨指向同一組；先清空再各自打勾，移除多餘的第二次清空）
  ['投資經驗2','投資經驗4','投資經驗5','投資經驗7','投資經驗8'].forEach(function(n){uchk(n);});
  var sSM={none:'投資經驗2',lt1:'投資經驗4','1-5':'投資經驗5','5-10':'投資經驗7',gt10:'投資經驗8'};
  if(sSM[d.expSecurities]) chk(sSM[d.expSecurities]);
  var sFM={none:'投資經驗2',lt1:'投資經驗4','1-5':'投資經驗5','5-10':'投資經驗7',gt10:'投資經驗8'};
  if(sFM[d.expFutures]) chk(sFM[d.expFutures]);

  // ── Bank ─────────────────────────────────────────────────
  txCJK('fill_3_3',d.bankName); txCJK('fill_4',d.bankAccName);
  tx('hkd',d.hkdAcc); tx('RMB',d.rmbAcc);

  // ── Declaration ──────────────────────────────────────────
  if(d.beneficiary==='self'){ chk('客戶本人'); uchk('其他1'); }
  else {
    uchk('客戶本人'); chk('其他1');
    txCJK('fill_7_4',d.bene_name); tx('fill_8_4',d.bene_id);
    txCJK('fill_9_4',d.bene_addr); txCJK('fill_10_2',d.bene_rel);
  }
  if(d.affiliated==='yes'){ chk('其他4'); uchk('其他3'); txCJK('fill_11_3',d.aff_name); txCJK('onship',d.aff_rel); }
  else { uchk('其他4'); chk('其他3'); }
  if(d.sfc==='yes'){
    chk('toggle_5'); uchk('toggle_4');
    txCJK('Name of Ex change Part',d.sfc_exchange);
  } else { uchk('toggle_5'); chk('toggle_4'); }

  // ── Commission ───────────────────────────────────────────
  tx('Text1',  d.onlineRate?d.onlineRate+'%':'');
  tx('Text13', d.phoneRate||'0.2');
  tx('Text14', d.onlineMin||'');
  tx('Text16', d.phoneMin||'80');

  // ── Electronic Trading ───────────────────────────────────
  d.toggleInternet ? chk('toggle_1_2') : uchk('toggle_1_2');
  d.toggleMobile   ? chk('toggle_2_2') : uchk('toggle_2_2');

  // Render all field appearances with CJK font (needed to show values in PDF)
  // Then save with false to prevent WinAnsi re-encoding on top
  try { form.updateFieldAppearances(cjkFont); } catch(e) { console.warn(e.message); }

  // ── Embed signature into the PDF's signature fields (only if user actually signed) ──
  // The template contains real signature fields named Signature1..Signature9.
  // We embed the hand-drawn signature ONLY into the fields the user ticked on Step 11
  // (each doc checkbox carries data-sig="SignatureN"). Unticked fields and
  // Signature9 (no mapped checkbox) are removed so no empty "sign here" box remains.
  // Field positions are read dynamically, so this auto-adapts if they move.
  var sigData = getSigDataUrl();
  var sigImage = null;
  if (sigData) {
    try {
      var sigBytes = dataURLToBytes(sigData);
      sigImage = await pdfDoc.embedPng(sigBytes);
      var allPages = pdfDoc.getPages();
      var PDFName  = PDFLib.PDFName;
      var sigImgDims = sigImage.scale(1); // {width,height} of the drawn signature

      // Only embed the signature into the fields the user actually signed.
      // Step-11 document checkboxes carry data-sig="SignatureN"; a checked
      // box means that document's signature field should receive the signature.
      var signedSet = {};
      var docChecks = document.querySelectorAll('input[name^="docAck"]');
      for (var di=0; di<docChecks.length; di++) {
        var cb = docChecks[di];
        if (cb.checked && cb.getAttribute('data-sig')) signedSet[cb.getAttribute('data-sig')] = true;
      }

      var sigFields = form.getFields().filter(function(f){ return /^Signature\d+$/.test(f.getName()); });
      for (var si=0; si<sigFields.length; si++) {
        var fname = sigFields[si].getName();
        if (!signedSet[fname]) continue;        // skip documents the user did NOT tick
        var widgets = sigFields[si].acroField.getWidgets();
        for (var wi=0; wi<widgets.length; wi++) {
          var w = widgets[wi];
          var rect = w.getRectangle(); // {x,y,width,height} in PDF pts (origin bottom-left)
          // find the page this widget belongs to
          var pageIdx = -1;
          var pRef = w.dict.get(PDFName.of('P'));
          if (pRef) { for (var pi=0; pi<allPages.length; pi++){ if (allPages[pi].ref === pRef){ pageIdx=pi; break; } } }
          if (pageIdx === -1) continue;
          // Fit signature image inside the field rect, keeping aspect ratio, centered.
          var pad = 2;
          var boxW = rect.width - pad*2, boxH = rect.height - pad*2;
          var scale = Math.min(boxW / sigImgDims.width, boxH / sigImgDims.height);
          if (!isFinite(scale) || scale <= 0) scale = boxW / sigImgDims.width;
          var drawW = sigImgDims.width * scale;
          var drawH = sigImgDims.height * scale;
          var drawX = rect.x + (rect.width  - drawW) / 2;
          var drawY = rect.y + (rect.height - drawH) / 2;
          allPages[pageIdx].drawImage(sigImage, { x: drawX, y: drawY, width: drawW, height: drawH });
        }
      }
      // Remove ALL signature fields: signed ones are now covered by the image,
      // unsigned ones (and Signature9, which has no mapped checkbox) disappear
      // so no empty "sign here" box remains.
      for (var rf=0; rf<sigFields.length; rf++) {
        try { form.removeField(sigFields[rf]); } catch(_){}
      }
    } catch(se){ console.warn('Signature embed error:', se.message); }
  }

  // ── Append confirmation page with the customer's signature (ONLY if signed) ──
  if (sigImage) {
    try {
      buildSummary();                       // refresh the summary cache
      appendConfirmationPage(pdfDoc, cjkFont, d, sigImage);
    } catch(ce){ console.warn('Confirmation page error:', ce.message); }
  }

  var outBytes = await pdfDoc.save({ updateFieldAppearances: false });
  var tag   = d.openDate.replace(/\//g,'');
  var fname = 'CBL_OpenAccount_'+(d.accountNo||'NEW')+'_'+tag+'.pdf';

  // ── save (let user choose location where possible) ──
  var result = await savePDF(outBytes, fname);
  showOverlay(false);
  if (result === 'cancelled') {
    showToast('\u5df2\u53d6\u6d88\u532f\u51fa', 3000);            // 已取消匯出
  } else if (result === 'saved') {
    showToast('\u2705 PDF \u5df2\u5132\u5b58\uff1a'+fname, 5000);            // 已儲存
  } else {
    showToast('\u2705 PDF \u5df2\u532f\u51fa\uff1a'+fname, 5000);            // 已匯出（下載）
  }
}

