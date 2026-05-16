const CONFIG = {
  product_columns: [
    { field: "ma",        sheet_name: "Mã SP",          form_label: "Mã SP",        show: false, owner_only: false, input_type: "text"    },
    { field: "ncc",       sheet_name: "Nhà Cung Cấp",   form_label: "Nhà Cung Cấp", show: true,  owner_only: false, input_type: "text"    },
    { field: "ten",       sheet_name: "Tên SP",         form_label: "Tên SP",       show: true,  owner_only: false, input_type: "text"    },
    { field: "kichthuoc", sheet_name: "Kích thước",     form_label: "Kích thước",   show: true,  owner_only: false, input_type: "text"    },
    { field: "giavon",    sheet_name: "Giá vốn",        form_label: "Giá vốn",      show: true,  owner_only: true,  input_type: "number"  },
    { field: "giasi",     sheet_name: "Giá sỉ",         form_label: "Giá sỉ",       show: true,  owner_only: false, input_type: "number"  },
    { field: "dvt",       sheet_name: "Đơn vị tính",    form_label: "Đơn vị tính",  show: true,  owner_only: false, input_type: "text"    },
    { field: "tonkho",    sheet_name: "Tồn kho",        form_label: "Số lượng",     show: true,  owner_only: true,  input_type: "number"  },
    { field: "qr",        sheet_name: "QR",             form_label: "QR",           show: false, owner_only: false, input_type: "formula" },
    ],
  export_columns: [
    { sheet_name: "Mã SP",        value: "product.ma"        },
    { sheet_name: "Thời gian",    value: "auto_timestamp"    },
    { sheet_name: "Nhà Cung Cấp", value: "product.ncc"       },
    { sheet_name: "Mặt hàng",     value: "product.ten"       },
    { sheet_name: "Kích thước",   value: "product.kichthuoc" },
    { sheet_name: "Đơn vị tính",  value: "product.dvt"       },
    { sheet_name: "Số lượng",     value: "form.soluong"      },
    { sheet_name: "Giá bán",      value: "form.gia"          },
    { sheet_name: "Giao dịch",    value: "form.giaodich"     },
    { sheet_name: "Phí vận chuyển", value: "form.phichanh"    },
    { sheet_name: "Phí (KT)",      value: "form.phikhachtra" },
    { sheet_name: "Khách Nợ",      value: "form.khachno"     },
    { sheet_name: "Tổng",          value: "sheet_formula"    },
    { sheet_name: "Tên khách",     value: "form.ghichu"      },
    { sheet_name: "Ghi chú",       value: "form.xuatghichu"  },
  ],
  import_columns: [
    { sheet_name: "Mã SP",        value: "product.ma"        },
    { sheet_name: "Thời gian",    value: "auto_timestamp"    },
    { sheet_name: "Nhà Cung Cấp", value: "product.ncc"       },
    { sheet_name: "Mặt hàng",     value: "product.ten"       },
    { sheet_name: "Kích thước",   value: "product.kichthuoc" },
    { sheet_name: "Đơn vị tính",  value: "product.dvt"       },
    { sheet_name: "Số lượng",     value: "form.soluong"      },
    { sheet_name: "Giá nhập",     value: "form.gia"          },
    { sheet_name: "Giao dịch",    value: "form.giaodich"     },
    { sheet_name: "Phí vận chuyển", value: "form.phichanh"   },
    { sheet_name: "Nợ NCC",       value: "form.noncc"        },
    { sheet_name: "Tổng",         value: "sheet_formula"     },
    { sheet_name: "Ghi chú",      value: "form.ghichu"       },
  ]
};

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzRv91ifaXcKut8yLE9IZImKB63BR5-xAChDH5plsxqm2KhbhkSxfTxzleeGwONDzTIHQ/exec';
const LOW_STOCK_THRESHOLD = 2; // Tồn kho thấp

let currentRole = null;
let currentUserName = null;

function _setUserBadges(name, role) {
  // Thêm style inline trực tiếp vào SVG để khống chế vị trí
  const svgStyle = 'display: block; flex-shrink: 0;';

  const icon = role === 'owner'
    ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7l5 5 4-8 4 8 5-5v10H3z"/></svg>`
    : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 4-6 8-6s8 2 8 6"/></svg>`;

  // Bọc text trong span với line-height bằng 1 để không bị đẩy khung
  const label = `${icon}<span style="line-height: 1; display: inline-block;">${name}</span>`;
  const cls = 'badge ' + (role === 'owner' ? 'badge-owner' : 'badge-staff');

  ['role-badge', 'role-badge-cart', 'role-badge-dt'].forEach(function(id) {
    const el = document.getElementById(id);
    if (el) {
      el.innerHTML = label;
      el.className = cls;

      // Căn chỉnh nâng cao
      el.style.display = 'inline-flex';
      el.style.alignItems = 'center';      // Căn giữa theo trục dọc
      el.style.justifyContent = 'center';   // Căn giữa theo trục ngang
      el.style.gap = '4px';                // Khoảng cách icon và chữ
      el.style.padding = '3px 10px';       // Đệm xung quanh cho cân đối
      el.style.verticalAlign = 'middle';   // Giúp nguyên cả cái badge ngay hàng với các phần tử khác
    }
  });
}

let _autoRefreshTimer = null;
function startAutoRefresh() {
  if (_autoRefreshTimer) clearInterval(_autoRefreshTimer);
  _autoRefreshTimer = setInterval(() => {
    if (!currentRole) return;
    _refreshProductsFastShared().then(() => {
      _syncCartsWithProductMap();
      renderCart();
      dtRenderCart();
      updateCartBadge();
      saveCartDebounced();
      // Chỉ re-render product list nếu giỏ hàng đang trống (tránh reset scroll khi đang chọn hàng)
      if (window.innerWidth >= 768) { if (dtCart.length === 0) dtFilterProducts(); }
      else { if (cart.length === 0) filterProductList(); }
      filterManageProducts();
      updateProductStats();
    }).catch(() => {});
  }, 7000);
}
function stopAutoRefresh() {
  if (_autoRefreshTimer) { clearInterval(_autoRefreshTimer); _autoRefreshTimer = null; }
}

// ===== AUTO LOGOUT sau 20 phút không thao tác =====
const INACTIVITY_MS = 20 * 60 * 1000;
let _inactivityTimer = null;
function resetInactivityTimer() {
  if (!currentRole) return;
  localStorage.setItem('last_activity', Date.now());
  clearTimeout(_inactivityTimer);
  _inactivityTimer = setTimeout(() => {
    if (currentRole) { showToast('⏰ Phiên hết hạn do không thao tác.'); doLogout(); }
  }, INACTIVITY_MS);
}
function _inactivityHandler() { resetInactivityTimer(); }
function startInactivityWatch() {
  ['mousemove','mousedown','keydown','touchstart','scroll','click'].forEach(ev =>
    document.addEventListener(ev, _inactivityHandler, { passive: true })
  );
  resetInactivityTimer();
}
function stopInactivityWatch() {
  ['mousemove','mousedown','keydown','touchstart','scroll','click'].forEach(ev =>
    document.removeEventListener(ev, _inactivityHandler)
  );
  clearTimeout(_inactivityTimer);
  _inactivityTimer = null;
}
let products = [];
let customerData = []; // rows: [0]=Tên KH, [1]=Địa chỉ KH, [2]=Địa chỉ Chành xe, [3]=Thời gian giao, [4]=SĐT
let _customerDataTs = 0;
const _CUSTOMER_CACHE_MS = 10 * 60 * 1000; // 10 phút

async function fetchCustomerData(force) {
  if (!force && customerData.length > 0 && Date.now() - _customerDataTs < _CUSTOMER_CACHE_MS) return;
  try {
    const res = await fetch(SCRIPT_URL + '?action=getCustomers&token=inox2026xK9m', { cache: 'no-store' });
    const data = await res.json();
    if (Array.isArray(data.rows)) { customerData = data.rows; _customerDataTs = Date.now(); }
  } catch(e) {}
}

function syncInvAddrSelect(sel) {
  const val = sel.options[sel.selectedIndex] ? sel.options[sel.selectedIndex].text : '';
  document.getElementById('inv-content').querySelectorAll('.inv-addr-follower').forEach(function(s) { s.textContent = val; });
  const pSel = document.getElementById('inv-print-root').querySelector('.inv-addr-select');
  if (pSel) { Array.from(pSel.options).forEach(function(o, i) { if (o.text === val) pSel.selectedIndex = i; }); }
  document.getElementById('inv-print-root').querySelectorAll('.inv-addr-follower').forEach(function(s) { s.textContent = val; });
}

function syncInvSdtSelect(sel) {
  const val = sel.options[sel.selectedIndex] ? sel.options[sel.selectedIndex].text : '';
  document.getElementById('inv-content').querySelectorAll('.inv-sdt-follower').forEach(function(s) { s.textContent = val; });
  const pSel = document.getElementById('inv-print-root').querySelector('.inv-sdt-select');
  if (pSel) { Array.from(pSel.options).forEach(function(o, i) { if (o.text === val) pSel.selectedIndex = i; }); }
  document.getElementById('inv-print-root').querySelectorAll('.inv-sdt-follower').forEach(function(s) { s.textContent = val; });
}

function _lookupCustomer(tenkhach) {
  const norm = (tenkhach || '').trim().toLowerCase();
  if (!norm || !customerData.length) return { addresses: [], sdts: [] };
  const matches = customerData.filter(function(r) { return r[0].toLowerCase() === norm; });
  const addresses = [];
  matches.forEach(function(r) { if (r[2] && !addresses.includes(r[2])) addresses.push(r[2]); });
  const sdts = [];
  matches.forEach(function(r) { if (r[4] && !sdts.includes(r[4])) sdts.push(r[4]); });
  return { addresses: addresses, sdts: sdts };
}

let scanning = false;
let stream = null;
let usingFallbackProducts = false;
let html5QrCode = null;

let mobileFilterLow = false;
let mobSearchField = 'all';
let mobTonSort = 'none'; // 'none' | 'desc' | 'asc'
let dtTonSort = 'none';  // 'none' | 'desc' | 'asc'
let mobileFilterHidden = false;
let dtFilterLow = false;
let dtFilterHidden = false;
let dtSearchField = 'all';
let manageFilterLow = false;
let manageFilterHidden = false;
let manageFilterVisible = false;
let manageSearchField = 'all';
// hidden products synced via Google Sheet column "Ẩn"
// giữ optimistic updates trong 15s để tránh background fetch ghi đè
const pendingHiddenUpdates = {};

let cart = [];
let cartGiaodich = 'Tiền mặt';
let cartMode = 'Xuất';

function saveCart() {
  try {
    localStorage.setItem('cart', JSON.stringify(cart));
    localStorage.setItem('dtCart', JSON.stringify(dtCart));
  } catch(e) {}
}
let _saveCartTimer = null;
function saveCartDebounced() {
  clearTimeout(_saveCartTimer);
  _saveCartTimer = setTimeout(saveCart, 600);
}
let productMap = new Map();
function _rebuildProductMap() {
  productMap = new Map();
  products.forEach(p => productMap.set(p.ma, p));
}
let _productsRefreshPromise = null;
function _refreshProductsShared() {
  if (_productsRefreshPromise) return _productsRefreshPromise;
  _productsRefreshPromise = fetchProductsFromServer().finally(() => {
    _productsRefreshPromise = null;
  });
  return _productsRefreshPromise;
}
let _productsFastRefreshPromise = null;
function _syncCartsWithProductMap() {
  cart = cart.map(i => {
    const latest = productMap.get(i.product.ma);
    return { product: latest || i.product, sl: i.sl, gia: i.gia };
  });
  dtCart = dtCart.map(i => {
    const latest = productMap.get(i.product.ma);
    return { product: latest || i.product, sl: i.sl, gia: i.gia };
  });
}
async function fetchProductsFastFromServer() {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);
  const res = await fetch(SCRIPT_URL + '?action=getFast&token=inox2026xK9m', { signal: controller.signal, cache: 'no-store' });
  clearTimeout(timeoutId);
  const data = await res.json();
  const fastItems = Array.isArray(data.items) ? data.items : [];
  if (fastItems.length === 0) return;
  const byMa = new Map(fastItems.map(p => [p.ma, p]));
  products = products.map(oldP => {
    const n = byMa.get(oldP.ma);
    if (!n) return oldP;
    byMa.delete(oldP.ma);
    return Object.assign({}, oldP, n);
  });
  byMa.forEach(p => products.push(p));
  _rebuildProductMap();
  try { localStorage.setItem('products_cache', JSON.stringify(products)); } catch(e) {}
}
function _refreshProductsFastShared() {
  if (_productsFastRefreshPromise) return _productsFastRefreshPromise;
  _productsFastRefreshPromise = fetchProductsFastFromServer().finally(() => {
    _productsFastRefreshPromise = null;
  });
  return _productsFastRefreshPromise;
}

// ===== SCREEN =====
function updateProductStats() {
  const visible = (products || []).filter(p => !isHidden(p.ma));
  const hiddenList = (products || []).filter(p => isHidden(p.ma));
  const count = visible.length;
  ['mob-visible-count','dt-visible-count','manage-visible-count'].forEach(id => {
    const el = document.getElementById(id); if (el) el.textContent = count;
  });
  ['mob-hidden-count2','dt-hidden-count2','manage-hidden-count2'].forEach(id => {
    const el = document.getElementById(id); if (el) el.textContent = hiddenList.length;
  });
  updateLowStockBadges();
}

// ===== HIGHLIGHT / HIDDEN / LOW-STOCK HELPERS =====
function highlightText(text, kw) {
  if (!kw || !text) return text || '';
  // Tách câu tìm kiếm thành các từ khóa lẻ (giống với bộ lọc)
  const keywords = removeDiacritics(kw).trim().split(/\s+/).filter(Boolean);
  if (!keywords.length) return text || '';

  const stripped = removeDiacritics(text);
  let intervals = [];

  // Tìm tất cả các vị trí khớp với từng từ khóa
  keywords.forEach(k => {
    let i = 0;
    while (i < stripped.length) {
      const idx = stripped.indexOf(k, i);
      if (idx === -1) break;
      intervals.push({ start: idx, end: idx + k.length });
      i = idx + 1;
    }
  });

  if (!intervals.length) return text;

  // Gộp các vùng bôi vàng bị đè lên nhau (tránh lỗi giao diện)
  intervals.sort((a, b) => a.start - b.start);
  let merged = [intervals[0]];
  for (let i = 1; i < intervals.length; i++) {
    let last = merged[merged.length - 1];
    let curr = intervals[i];
    if (curr.start <= last.end) {
      last.end = Math.max(last.end, curr.end);
    } else {
      merged.push(curr);
    }
  }

  // Lắp ghép lại chuỗi với thẻ <mark> bôi vàng
  let result = '';
  let lastEnd = 0;
  for (let m of merged) {
    result += text.slice(lastEnd, m.start);
    result += '<mark style="background:#FFF176;color:#5D4037;border-radius:2px;padding:0 1px">' + text.slice(m.start, m.end) + '</mark>';
    lastEnd = m.end;
  }
  result += text.slice(lastEnd);
  return result;
}

function highlightMoney(rawVal, kw) {
  const formatted = fmtMoney(rawVal);
  if (!kw) return formatted;
  const rawStr = String(rawVal || '').replace(/[^0-9]/g, '');
  const kwStr = kw.trim().replace(/[^0-9]/g, '');
  if (!kwStr || !rawStr.includes(kwStr)) return formatted;
  return '<mark style="background:#FFF176;color:#5D4037;border-radius:2px;padding:0 1px">' + formatted + '</mark>';
}

function hlField(text, kw, field, activeField) {
  if (!kw || !text) return text || '';
  if (activeField === 'all' || activeField === field) return highlightText(text, kw);
  return text || '';
}

function isHidden(ma) {
  const p = (products || []).find(x => x.ma === ma);
  return p ? (p.an || '').trim() === 'Đang Ẩn' : false;
}

async function toggleHideProduct(ma) {
  const p = (products || []).find(x => x.ma === ma);
  if (!p) return;
  const newVal = (p.an || '').trim() === 'Đang Ẩn' ? '' : 'Đang Ẩn';
  p.an = newVal; // cập nhật ngay (optimistic)
  pendingHiddenUpdates[ma] = { value: newVal, ts: Date.now() };
  localStorage.setItem('products_cache', JSON.stringify(products));
  filterProductList();
  dtFilterProducts();
  filterManageProducts();
  // Ghi lên Google Sheet
  fetch(SCRIPT_URL + '?token=inox2026xK9m', {
    method: 'POST', mode: 'no-cors',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'setHidden', ma: ma, value: newVal, token: 'inox2026xK9m' })
  }).catch(() => {});
}

function getLowStockCount() {
  return (products || []).filter(p => (p.tonkho || 0) <= LOW_STOCK_THRESHOLD).length;
}

function updateLowStockBadges() {
  const n = getLowStockCount();
  ['mob-low-count','dt-low-count','manage-low-count'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = n;
  });
}

function _setTabActive(allId, lowId, isLow) {
  const allEl = document.getElementById(allId);
  const lowEl = document.getElementById(lowId);
  if (allEl) {
    allEl.style.background = isLow ? '#f5f5f5' : '#e8f5e9';
    allEl.style.color = isLow ? '#888' : '#2e7d32';
    allEl.style.fontWeight = isLow ? '400' : '700';
    allEl.style.border = isLow ? '1px solid #e0e0e0' : '1px solid #4CAF50';
  }
  if (lowEl) {
    lowEl.style.background = isLow ? '#ffebee' : '#f5f5f5';
    lowEl.style.color = isLow ? '#f44336' : '#888';
    lowEl.style.fontWeight = isLow ? '700' : '400';
    lowEl.style.border = isLow ? '1px solid #f44336' : '1px solid #e0e0e0';
  }
}

function _applyFilterStyle(prefix, mode) {
  const ids = ['visible','hidden','all','low'];
  const actives = {
    visible: {bg:'#e3f2fd',color:'#1565c0',border:'1px solid #1976d2',fw:'700'},
    hidden:  {bg:'#f3e5f5',color:'#6a1b9a',border:'1px solid #8e24aa',fw:'700'},
    all:     {bg:'#e8f5e9',color:'#2e7d32',border:'1px solid #4CAF50',fw:'700'},
    low:     {bg:'#ffebee',color:'#f44336',border:'1px solid #f44336',fw:'700'},
  };
  const inactive = {bg:'#f5f5f5',color:'#888',border:'1px solid #e0e0e0',fw:'400'};
  ids.forEach(id => {
    const el = document.getElementById(prefix + '-tab-' + id);
    if (!el) return;
    const s = mode === id ? actives[id] : inactive;
    el.style.background = s.bg; el.style.color = s.color;
    el.style.border = s.border; el.style.fontWeight = s.fw;
  });
}
function setMobileFilter(mode) {
  mobileFilterLow = (mode === 'low');
  mobileFilterHidden = (mode === 'hidden');
  _applyFilterStyle('mob', mode);
  const el = document.getElementById('mob-tonkho-filter');
  if (el) el.value = '';
  filterProductList();
}
function setDtFilter(mode) {
  dtFilterLow = (mode === 'low');
  dtFilterHidden = (mode === 'hidden');
  _applyFilterStyle('dt', mode);
  const el = document.getElementById('dt-tonkho-filter');
  if (el) el.value = '';
  dtFilterProducts();
}
function setManageFilter(mode) {
  manageFilterLow = (mode === 'low');
  manageFilterHidden = (mode === 'hidden');
  manageFilterVisible = (mode === 'visible');
  _applyFilterStyle('manage', mode);
  const el = document.getElementById('manage-tonkho-filter');
  if (el) el.value = '';
  filterManageProducts();
}
function onMobTonkhoInput() {
  const el = document.getElementById('mob-tonkho-filter');
  if (el && el.value !== '') {
    mobileFilterLow = false;
    mobileFilterHidden = false;
    _applyFilterStyle('mob', 'all');
  }
  filterProductList();
}
function onDtTonkhoInput() {
  const el = document.getElementById('dt-tonkho-filter');
  if (el && el.value !== '') {
    dtFilterLow = false;
    dtFilterHidden = false;
    _applyFilterStyle('dt', 'all');
  }
  dtFilterProducts();
}
function onManageTonkhoInput() {
  const el = document.getElementById('manage-tonkho-filter');
  if (el && el.value !== '') {
    manageFilterLow = false;
    manageFilterHidden = false;
    manageFilterVisible = false;
    _applyFilterStyle('manage', 'all');
  }
  filterManageProducts();
}

function toggleMngSfPanel(e) {
  if (e) { e.preventDefault(); e.stopPropagation(); }
  const panel = document.getElementById('mng-sf-panel');
  if (!panel) return;
  if (panel.style.display !== 'none') { panel.style.display = 'none'; return; }
  panel.style.display = 'block';
  setTimeout(function() {
    function close(ev) {
      if (!panel.contains(ev.target) && !ev.target.closest('#mng-sf-btn')) {
        panel.style.display = 'none';
        document.removeEventListener('click', close, true);
      }
    }
    document.addEventListener('click', close, true);
  }, 0);
}

const MNG_SF_LABELS = { all: 'Tất cả', ma: 'Mã SP', ncc: 'NCC', ten: 'Tên SP', giavon: 'Giá vốn', giasi: 'Giá sỉ', tonkho: 'Tồn' };
const MNG_SF_PLACEHOLDERS = { all: 'Tìm mã, tên, kích thước, NCC...', ma: 'Tìm theo mã SP...', ncc: 'Tìm theo nhà cung cấp...', ten: 'Tìm theo tên SP...', giavon: 'Tìm theo giá vốn...', giasi: 'Tìm theo giá sỉ...', tonkho: 'Tìm theo tồn kho...' };

function setMngSearchField(field) {
  manageSearchField = field;
  const label = document.getElementById('mng-sf-label');
  if (label) label.textContent = MNG_SF_LABELS[field] || 'Tất cả';
  ['all','ma','ncc','ten','giavon','giasi','tonkho'].forEach(function(k) {
    const el = document.getElementById('mng-sf-opt-' + k);
    if (el) {
      if (k === field) { el.style.background = '#e8f5e9'; el.style.color = '#2e7d32'; el.style.fontWeight = '700'; }
      else { el.style.background = ''; el.style.color = '#555'; el.style.fontWeight = ''; }
    }
  });
  const panel = document.getElementById('mng-sf-panel');
  if (panel) panel.style.display = 'none';
  const inp = document.getElementById('manage-search');
  if (inp) inp.placeholder = MNG_SF_PLACEHOLDERS[field] || 'Tìm mã, tên, kích thước, NCC...';
  filterManageProducts();
}

function filterManageProducts() {
  const rawQ = (document.getElementById('manage-search') ? document.getElementById('manage-search').value : '') || '';
  const q = removeDiacritics(rawQ).trim();
  let list = products || [];
  if (manageFilterHidden) list = list.filter(p => isHidden(p.ma));
  else if (manageFilterLow) list = list.filter(p => !isHidden(p.ma) && (p.tonkho || 0) <= LOW_STOCK_THRESHOLD);
  else if (manageFilterVisible) list = list.filter(p => !isHidden(p.ma));
  // manageFilterAll (default): hiện tất cả kể cả ẩn
  if (q) {
    const keywords = q.split(/\s+/);
    const sf = manageSearchField || 'all';
    list = list.filter(p => {
      let text;
      if (sf === 'ma') text = removeDiacritics(p.ma || '');
      else if (sf === 'ncc') text = removeDiacritics(p.ncc || '');
      else if (sf === 'ten') text = removeDiacritics(p.ten || '');
      else if (sf === 'giavon') text = String(p.giavon || '');
      else if (sf === 'giasi') text = String(p.giasi || '');
      else if (sf === 'tonkho') text = String(p.tonkho || '');
      else text = removeDiacritics([
        p.ma || '', p.ten || '', p.kichthuoc || '', p.ncc || ''
      ].join(' '));
      return keywords.every(kw => text.includes(kw));
    });
  }
  const tonkhoFilterEl = document.getElementById('manage-tonkho-filter');
  if (tonkhoFilterEl && tonkhoFilterEl.value !== '') {
    const maxTon = Number(tonkhoFilterEl.value);
    list = list.filter(p => (Number(p.tonkho) || 0) <= maxTon);
  }
  { const sc = document.getElementById('manage-stats-count'); if (sc) sc.textContent = list.length; }
  { const st = document.getElementById('manage-stats-tonkho'); if (st) st.textContent = fmt(list.reduce((s,p) => s + (Number(p.tonkho)||0), 0)); }
  renderManageProductList(list, rawQ.trim());
}

function doRefreshProducts() {
  // Clear ô tìm kiếm + reset filter về mặc định (4 nơi), KHÔNG xóa giỏ hàng
  const clearIds = ['manual-code','mob-tonkho-filter','dt-search','dt-tonkho-filter','manage-search','manage-tonkho-filter'];
  clearIds.forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  mobileFilterLow = false; mobileFilterHidden = false; _applyFilterStyle('mob', 'all');
  setMobSearchField('all');
  mobTonSort = 'none'; _applyTonSortStyle('mob-ton-sort-btn', 'none');
  dtTonSort = 'none'; _applyTonSortStyle('dt-ton-sort-btn', 'none');
  dtFilterLow = false; dtFilterHidden = false; _applyFilterStyle('dt', 'all');
  setDtSearchField('all');
  manageFilterLow = false; manageFilterHidden = false; manageFilterVisible = false; _applyFilterStyle('manage', 'all');
  setMngSearchField('all');

  // Render ngay từ cache (tức thì, không chờ mạng)
  if (window.innerWidth >= 768) dtFilterProducts();
  filterProductList();
  filterManageProducts();
  updateProductStats();

  // Fetch server nền — khi xong tự cập nhật lại
  const btnIds = ['main-refresh-btn', 'manage-refresh-btn', 'dt-btn-refresh'];
  btnIds.forEach(id => _setRefreshLoading(id, true));
  _refreshProductsShared().then(() => {
    _syncCartsWithProductMap();
    renderCart();
    dtRenderCart();
    updateCartBadge();
    saveCart();
    showToast('Đã làm mới sản phẩm');
  }).catch(() => {
    showToast('⚠️ Không thể kết nối server!');
  }).finally(() => {
    btnIds.forEach(id => _setRefreshLoading(id, false));
  });
}

async function refreshCartData() {
  const btnIds = ['cart-refresh-btn'];
  btnIds.forEach(id => _setRefreshLoading(id, true));
  try {
    await _refreshProductsShared();
    _syncCartsWithProductMap();
    renderCart();
    dtRenderCart();
    if (window.innerWidth >= 768) dtRenderProducts();
    else filterProductList();
    updateCartBadge();
    saveCart();
    showToast('Đã làm mới giỏ hàng');
  } catch (e) {
    showToast('⚠️ Không thể làm mới giỏ hàng!');
  } finally {
    btnIds.forEach(id => _setRefreshLoading(id, false));
  }
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && currentRole) {
    _refreshProductsFastShared().then(() => {
      _syncCartsWithProductMap();
      renderCart();
      dtRenderCart();
      updateCartBadge();
      saveCartDebounced();
      if (window.innerWidth >= 768) dtFilterProducts();
      else filterProductList();
      filterManageProducts();
      updateProductStats();
    }).catch(() => {});
  }
});

let _loadedRange = null;
let _historyStale = false;

function showScreen(id) {
  const _histScreens = ['screen-history', 'screen-history-detail', 'screen-report', 'screen-report-detail', 'screen-success'];
  if (!_histScreens.includes(id)) {
    _loadedRange = null;
    _historyStale = false;
  }
  sessionStorage.setItem('lastScreen', id);
  const isDesktop = window.innerWidth >= 768;

  if (isDesktop && currentRole) {
    if (id === 'screen-products' || id === 'screen-product-form' || id === 'screen-history' || id === 'screen-history-detail' || id === 'screen-report' || id === 'screen-report-detail' || id === 'screen-settings') {
      document.getElementById('desktop-layout').style.display = 'none';
      document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
      document.getElementById(id).classList.add('active');
      return;
    }
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('desktop-layout').style.display = 'flex';
    return;
  }

  if (id === 'screen-login') {
    document.getElementById('desktop-layout').style.display = 'none';
  }

  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// ===== LOGIN =====
const _BTN_LOGIN_NORMAL = 'Đăng nhập <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>';
const _BTN_LOGIN_LOADING = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;animation:spin 1s linear infinite"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> Đang đăng nhập...';

function _applyLogin(r, name) {
  currentRole = r;
  currentUserName = name;
  fetchCustomerData();
  document.getElementById('login-error').classList.remove('visible');
  try {
    const savedCart = JSON.parse(localStorage.getItem('cart') || '[]');
    const savedDtCart = JSON.parse(localStorage.getItem('dtCart') || '[]');
    cart = savedCart.map(i => { const p = products.find(p => p.ma === i.product.ma); return p ? { product: p, sl: i.sl, gia: i.gia } : null; }).filter(Boolean);
    dtCart = savedDtCart.map(i => { const p = products.find(p => p.ma === i.product.ma); return p ? { product: p, sl: i.sl, gia: i.gia } : null; }).filter(Boolean);
  } catch(e) { cart = []; dtCart = []; }
  updateCartBadge();
  _setUserBadges(name, r);
  document.getElementById('btn-manage-products').style.display = r === 'owner' ? 'flex' : 'none';
  applyRolePermissions(r);
  if (window.innerWidth >= 768) {
    dtInitLayout();
    document.getElementById('desktop-layout').style.display = 'flex';
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  } else {
    showScreen('screen-main');
  }
}

async function doLogin() {
  const pass = document.getElementById('login-pass').value.trim();
  const err = document.getElementById('login-error');
  const loginBtn = document.getElementById('btn-login');

  if (!pass) { document.getElementById('login-error-text').textContent = '⚠️ Vui lòng nhập mật khẩu!'; err.classList.add('visible'); return; }

  // Reset màu của 2 nút về mặc định
  document.getElementById('ln-role-owner').classList.remove('active');
  document.getElementById('ln-role-staff').classList.remove('active');

  // Cache khớp → vào ngay, verify ngầm
  try {
    const cached = JSON.parse(localStorage.getItem('login_cache') || 'null');
    if (cached && cached.pass === pass) {
      const cachedName = cached.name || (cached.role === 'owner' ? 'Admin' : 'Staff');

      // Tự động làm sáng nút dựa trên cache
      document.getElementById(cached.role === 'owner' ? 'ln-role-owner' : 'ln-role-staff').classList.add('active');

      localStorage.removeItem('products_cache');
      await loadProducts();
      startAutoRefresh();
      startInactivityWatch();
      filterProductList();
      _applyLogin(cached.role, cachedName);
      loginBtn.innerHTML = _BTN_LOGIN_NORMAL;
      loginBtn.disabled = false;
      _fetchRealtimeUsers()
        .then(data => {
          if (data.ok) {
            const ok = data.users.find(u => u.matkhau === pass);
            if (!ok) { localStorage.removeItem('login_cache'); doLogout(); }
          }
        }).catch(() => {});
      return;
    }
  } catch(e) {}

  loginBtn.innerHTML = _BTN_LOGIN_LOADING;
  loginBtn.disabled = true;
  const _preMatch = (_realtimeUsers || []).find(u => u.matkhau === pass);
  if (_preMatch) {
    const role = _preMatch.vaitro;
    document.getElementById(role === 'owner' ? 'ln-role-owner' : 'ln-role-staff').classList.add('active');
    localStorage.setItem('login_cache', JSON.stringify({ role: role, pass: pass, name: _preMatch.ten }));
    localStorage.removeItem('products_cache');
    await loadProducts();
    startAutoRefresh();
    startInactivityWatch();
    filterProductList();
    _applyLogin(role, _preMatch.ten);
    loginBtn.innerHTML = _BTN_LOGIN_NORMAL;
    loginBtn.disabled = false;
    _fetchRealtimeUsers()
      .then(data => {
        if (data.ok) {
          const ok = data.users.find(u => u.matkhau === pass);
          if (!ok) { localStorage.removeItem('login_cache'); doLogout(); }
        }
      }).catch(() => {});
    return;
  }
  try {
    const data = await _fetchRealtimeUsers();
    if (data.ok) {
      // TÌM USER CHỈ DỰA VÀO MẬT KHẨU
      const match = data.users.find(u => u.matkhau === pass);
      if (match) {
        const role = match.vaitro;

        // Tự động làm sáng nút Admin hoặc Staff tùy theo mật khẩu
        document.getElementById(role === 'owner' ? 'ln-role-owner' : 'ln-role-staff').classList.add('active');

        localStorage.setItem('login_cache', JSON.stringify({ role: role, pass: pass, name: match.ten }));
        localStorage.removeItem('products_cache');
        await loadProducts();
        startAutoRefresh();
        startInactivityWatch();
        filterProductList();
        _applyLogin(role, match.ten);
      } else {
        document.getElementById('login-error-text').textContent = '❌ Sai mật khẩu, thử lại!';
        err.classList.add('visible');
      }
    } else {
      document.getElementById('login-error-text').textContent = '❌ Lỗi server, thử lại sau!';
      err.classList.add('visible');
    }
  } catch(e) {
    alert('Lỗi kết nối, thử lại!');
  } finally {
    loginBtn.innerHTML = _BTN_LOGIN_NORMAL;
    loginBtn.disabled = false;
  }
}

document.getElementById('login-pass').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') doLogin();
});

function togglePassVis() {
  const inp = document.getElementById('login-pass');
  const icon = document.getElementById('btn-eye-icon');
  if (inp.type === 'password') {
    inp.type = 'text';
    icon.innerHTML = '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>';
    icon.style.stroke = '#4CAF50';
  } else {
    inp.type = 'password';
    icon.innerHTML = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
    icon.style.stroke = '#aaa';
  }
}

// ===== LOGIN HELPERS =====
// 1. Khởi tạo danh sách từ bộ nhớ tạm (giúp realtime mượt mà không có độ trễ)
let _realtimeUsers = JSON.parse(localStorage.getItem('realtime_users_cache') || '[]');
let _usersFetchPromise = null;

function _cacheRealtimeUsers(users) {
  _realtimeUsers = Array.isArray(users) ? users : [];
  localStorage.setItem('realtime_users_cache', JSON.stringify(_realtimeUsers));
}

function _fetchRealtimeUsers() {
  if (_usersFetchPromise) return _usersFetchPromise;
  _usersFetchPromise = fetch(`${SCRIPT_URL}?action=getUsers&token=inox2026xK9m`)
    .then(r => r.json())
    .then(data => {
      if (data.ok) _cacheRealtimeUsers(data.users);
      return data;
    })
    .finally(() => { _usersFetchPromise = null; });
  return _usersFetchPromise;
}

// 2. Tải ngầm danh sách mới từ Sheet để luôn có mật khẩu mới nhất
_fetchRealtimeUsers()
  .catch(() => {});

// 3. Hàm quét realtime khi anh gõ từng ký tự vào ô mật khẩu
function _lnOnPassInput() {
  // Tắt thông báo lỗi (nếu đang hiện)
  document.getElementById('login-error').classList.remove('visible');

  const btnAdmin = document.getElementById('ln-role-owner');
  const btnStaff = document.getElementById('ln-role-staff');
  if (btnAdmin && btnStaff) {
    btnAdmin.classList.remove('active');
    btnStaff.classList.remove('active');
  }
}

(function _lnStartClock() {
  function tick() {
    const now = new Date();
    const t = document.getElementById('ln-time');
    const d = document.getElementById('ln-date');
    if (t) {
      const HH = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      const ss = String(now.getSeconds()).padStart(2, '0');
      t.textContent = `${HH}:${mm}:${ss}`;
    }
    if (d) d.textContent = now.toLocaleDateString('vi-VN', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
  }
  tick();
  setInterval(tick, 1000);
})();

// Auto-login khi F5 (nếu có cache hợp lệ)
function _finishAppBoot() {
  document.documentElement.classList.remove('app-booting');
}

(async function autoLoginOnLoad() {
  let _bootFinished = false;
  const _doneBoot = () => {
    if (_bootFinished) return;
    _bootFinished = true;
    _finishAppBoot();
  };
  try {
    const cached = JSON.parse(localStorage.getItem('login_cache') || 'null');
    if (!cached || !cached.role || !cached.pass) {
      showScreen('screen-login');
      _doneBoot();
      return;
    }
    // Kiểm tra nếu đã quá 20 phút không thao tác thì không auto-login
    const lastActivity = parseInt(localStorage.getItem('last_activity') || '0', 10);
    if (lastActivity > 0 && Date.now() - lastActivity > INACTIVITY_MS) {
      localStorage.removeItem('login_cache');
      localStorage.removeItem('last_activity');
      showScreen('screen-login');
      _doneBoot();
      return;
    }
    localStorage.setItem('last_activity', Date.now());
    currentRole = cached.role;
    localStorage.removeItem('products_cache');
    await loadProducts();
    // Restore cart
    try {
      const savedCart = JSON.parse(localStorage.getItem('cart') || '[]');
      const savedDtCart = JSON.parse(localStorage.getItem('dtCart') || '[]');
      cart = savedCart.map(i => {
        const p = products.find(p => p.ma === i.product.ma);
        return p ? { product: p, sl: i.sl, gia: i.gia } : null;
      }).filter(Boolean);
      dtCart = savedDtCart.map(i => {
        const p = products.find(p => p.ma === i.product.ma);
        return p ? { product: p, sl: i.sl, gia: i.gia } : null;
      }).filter(Boolean);
    } catch(e) { cart = []; dtCart = []; }
    updateCartBadge();
    startAutoRefresh();
    startInactivityWatch();
    filterProductList();
    filterManageProducts();
    updateProductStats();
    currentRole = cached.role;
    currentUserName = cached.name || (cached.role === 'owner' ? 'Admin' : 'Staff');
    _setUserBadges(currentUserName, cached.role);
    document.getElementById('btn-manage-products').style.display = cached.role === 'owner' ? 'flex' : 'none';
    applyRolePermissions(cached.role);
    const _lastScreen = sessionStorage.getItem('lastScreen') || 'screen-main';
    const _safeScreens = ['screen-main', 'screen-products', 'screen-product-form', 'screen-cart', 'screen-history', 'screen-history-detail', 'screen-report', 'screen-report-detail', 'screen-settings'];
    const _isStaff = cached.role !== 'owner';
    const _rawTarget = _safeScreens.includes(_lastScreen) ? _lastScreen : 'screen-main';
    const _targetScreen = (_isStaff && (_rawTarget === 'screen-report' || _rawTarget === 'screen-report-detail' || _rawTarget === 'screen-settings')) ? 'screen-main' : _rawTarget;
    if (window.innerWidth >= 768) { dtInitLayout(); dtFilterProducts(); }
    if (_targetScreen === 'screen-product-form') {
      openProductForm('add', null, true); // render form ngay, không chờ server
    } else if (_targetScreen === 'screen-history-detail') {
      await showHistory().then(function() {
        const t = sessionStorage.getItem('histDetailThoigian');
        const l = sessionStorage.getItem('histDetailLoai');
        if (t && l) {
          const idx = _historyGroups.findIndex(function(g) { return g.thoigian === t && g.loai === l; });
          if (idx >= 0) showHistoryDetail(idx);
        }
      }).catch(function() {});
    } else if (_targetScreen === 'screen-history') {
      await showHistory();
    } else if (_targetScreen === 'screen-report-detail') {
      const savedItem = sessionStorage.getItem('rptDetailItem');
      if (savedItem) {
        showScreen('screen-report-detail');
        const titleEl = document.getElementById('rpt-detail-title');
        const listEl = document.getElementById('rpt-detail-list');
        if (titleEl) titleEl.textContent = 'Chi tiết';
        if (listEl) listEl.innerHTML = '<div style="text-align:center;padding:40px;color:#aaa;">Đang tải...</div>';
        await _fetchHistoryData().then(function() {
          try { _restoreReportDetailAfterReload(JSON.parse(savedItem)); } catch(ex) { showReport(); }
        }).catch(function() { showReport(); });
      } else { showReport(); }
    } else if (_targetScreen === 'screen-report') {
      showReport();
    } else if (_targetScreen === 'screen-settings') {
      showSettings();
    } else {
      showScreen(_targetScreen);
      if (_targetScreen === 'screen-cart') { setCartMode(cartMode); renderCart(); }
    }
    _doneBoot();
    // Verify ngầm
    _fetchRealtimeUsers()
      .then(data => {
        if (data.ok) {
          const ok = data.users.find(u => u.matkhau === cached.pass);
          if (!ok) { localStorage.removeItem('login_cache'); doLogout(); }
        }
      }).catch(() => {});
  } catch(e) {
    showScreen('screen-login');
    _doneBoot();
  }
})();

function applyRolePermissions(role) {
  const isOwner = role === 'owner';
  const d = (el, show) => { if (el) el.style.display = show ? '' : 'none'; };
  d(document.getElementById('btn-report-nav'),    isOwner);
  d(document.getElementById('dt-btn-report'),     isOwner);
  d(document.getElementById('hist-btn-nhap'),     isOwner);
  d(document.getElementById('hist-nhap-summary'), isOwner);
  d(document.getElementById('hist-xuat-summary'), isOwner);
  d(document.getElementById('btn-settings'),            isOwner);
  d(document.getElementById('dt-btn-settings'),         isOwner);
  d(document.getElementById('btn-export-sodoanhthu'),   isOwner);
  d(document.getElementById('btn-backup'),              isOwner);
}

function doLogout() {
  stopScan();
  stopAutoRefresh();
  stopInactivityWatch();
  currentRole = null;
  currentUserName = null;
  products = [];
  cart = [];
  cartGiaodich = '';
  dtCart = [];
  dtMode = 'Xuất';
  localStorage.removeItem('products_cache');
  localStorage.removeItem('login_cache');
  localStorage.removeItem('last_activity');
  localStorage.removeItem('cart');
  localStorage.removeItem('dtCart');
  localStorage.removeItem('history_cache');
  localStorage.removeItem(_HISTORY_CACHE_KEY);
  _historyData = []; _loadedRange = null; _historyStale = false;
  document.getElementById('login-pass').value = '';
  document.getElementById('desktop-layout').style.display = 'none';
  updateCartBadge();
  showScreen('screen-login');
}

// ===== SETTINGS =====
let _settingsUsers = [];
let _userModalEditingName = null;

async function showSettings() {
  showScreen('screen-settings');
  document.getElementById('settings-user-list').innerHTML = '<div style="color:#555;font-size:13px;text-align:center;padding:20px;display:flex;align-items:center;justify-content:center;gap:6px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> Đang tải danh sách người dùng...</div>';
  try {
    const res = await fetch(`${SCRIPT_URL}?action=getUsers&token=inox2026xK9m`);
    const data = await res.json();
    if (data.ok) {
      _settingsUsers = data.users;
      _renderSettingsUsers();
    } else {
      document.getElementById('settings-user-list').innerHTML = '<div style="color:#f44336;font-size:13px;text-align:center;padding:20px;">Lỗi tải dữ liệu!</div>';
    }
  } catch(e) {
    document.getElementById('settings-user-list').innerHTML = '<div style="color:#f44336;font-size:13px;text-align:center;padding:20px;">Lỗi kết nối!</div>';
  }
}

function _renderSettingsUsers() {
  const el = document.getElementById('settings-user-list');
  if (!_settingsUsers.length) {
    el.innerHTML = '<div style="color:#888;font-size:13px;text-align:center;padding:16px;">Chưa có người dùng nào. Nhấn "+ Thêm" để tạo người dùng.</div>';
    return;
  }
  let rows = _settingsUsers.map(u => {
    const roleLabel = u.vaitro === 'owner' ? '<span class="st-role-pill st-role-owner">Admin</span>' : '<span class="st-role-pill st-role-staff">Staff</span>';
    const isSelf = u.ten === currentUserName;
    return `<tr>
      <td style="font-weight:600;">${u.ten}${isSelf ? ' <span style="font-size:10px;color:#4CAF50;">(bạn)</span>' : ''}</td>
      <td style="letter-spacing:2px;color:#aaa;">••••••••</td>
      <td>${roleLabel}</td>
      <td style="white-space:nowrap;">
        <button class="st-btn st-edit" onclick="openUserModal('${u.ten}')">Sửa</button>
        <button class="st-btn st-del" onclick="deleteSettingsUser('${u.ten}')">Xóa</button>
      </td>
    </tr>`;
  }).join('');
  el.innerHTML = `<table class="st-user-table"><thead><tr><th>Tên</th><th>Mật khẩu</th><th>Vai trò</th><th></th></tr></thead><tbody>${rows}</tbody></table>`;
}

function openUserModal(editingName) {
  _userModalEditingName = editingName;
  const modal = document.getElementById('user-modal');
  const errEl = document.getElementById('user-modal-error');
  errEl.style.display = 'none';
  if (editingName) {
    const u = _settingsUsers.find(u => u.ten === editingName);
    document.getElementById('user-modal-title').textContent = 'Sửa người dùng';
    document.getElementById('user-modal-ten').value = u ? u.ten : '';
    document.getElementById('user-modal-pass').value = u ? u.matkhau : '';
    document.getElementById('user-modal-role').value = u ? u.vaitro : 'staff';
  } else {
    document.getElementById('user-modal-title').textContent = 'Thêm người dùng';
    document.getElementById('user-modal-ten').value = '';
    document.getElementById('user-modal-pass').value = '';
    document.getElementById('user-modal-role').value = 'staff';
  }
  modal.style.display = 'flex';
}

async function saveUserModal() {
  const ten = document.getElementById('user-modal-ten').value.trim();
  const pass = document.getElementById('user-modal-pass').value.trim();
  const role = document.getElementById('user-modal-role').value;
  const errEl = document.getElementById('user-modal-error');

  function showErr(msg) { errEl.textContent = msg; errEl.style.display = 'block'; }

  if (!ten) return showErr('Vui lòng nhập tên.');
  if (!pass || pass.length < 4) return showErr('Mật khẩu phải ít nhất 4 ký tự.');

  const isEditing = !!_userModalEditingName;
  // Validate trùng tên
  if (!isEditing || ten !== _userModalEditingName) {
    if (_settingsUsers.find(u => u.ten === ten)) return showErr('Tên này đã tồn tại!');
  }
  // Validate trùng mật khẩu trong cùng role
  const passwordConflict = _settingsUsers.find(u => u.matkhau === pass && u.ten !== _userModalEditingName);
  if (passwordConflict) return showErr('Mật khẩu này đã được sử dụng bởi "' + passwordConflict.ten + '". Vui lòng chọn mật khẩu khác để hệ thống tự nhận diện!');

  const saveBtn = document.querySelector('#user-modal button[onclick="saveUserModal()"]');
  saveBtn.disabled = true;
  saveBtn.textContent = '⏳ Đang lưu...';
  try {
    const action = isEditing ? 'updateUser' : 'addUser';
    const body = { action, ten, matkhau: pass, vaitro: role };
    if (isEditing) body.oldTen = _userModalEditingName;
    const res = await fetch(SCRIPT_URL + '?token=inox2026xK9m', { method: 'POST', body: JSON.stringify(body) });
    const data = await res.json();
    if (data.ok) {
      document.getElementById('user-modal').style.display = 'none';
      showSettings();
      // Nếu đang sửa user hiện tại thì cập nhật cache
      if (isEditing && _userModalEditingName === currentUserName) {
        currentUserName = ten;
        const cached = JSON.parse(localStorage.getItem('login_cache') || 'null');
        if (cached) { cached.name = ten; cached.pass = pass; localStorage.setItem('login_cache', JSON.stringify(cached)); }
        _setUserBadges(ten, role);
      }
    } else {
      showErr(data.error || 'Lỗi server!');
    }
  } catch(e) {
    showErr('Lỗi kết nối!');
  } finally {
    saveBtn.disabled = false;
    saveBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:6px;"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> Lưu';
  }
}

async function deleteSettingsUser(ten) {
  if (ten === currentUserName) { showToast('❌ Không thể xóa tài khoản đang đăng nhập!'); return; }
  const ownerCount = _settingsUsers.filter(u => u.vaitro === 'owner').length;
  const isOwner = _settingsUsers.find(u => u.ten === ten && u.vaitro === 'owner');
  if (isOwner && ownerCount <= 1) { showToast('❌ Phải có ít nhất 1 Admin!'); return; }
  if (!confirm(`Xóa người dùng "${ten}"?`)) return;
  try {
    const res = await fetch(SCRIPT_URL + '?token=inox2026xK9m', { method: 'POST', body: JSON.stringify({ action: 'deleteUser', ten }) });
    const data = await res.json();
    if (data.ok) { showSettings(); }
    else { showToast('❌ ' + (data.error || 'Lỗi xóa user!')); }
  } catch(e) { showToast('❌ Lỗi kết nối!'); }
}

// ===== PRODUCTS =====
async function loadProducts() {
  usingFallbackProducts = false;
  const cached = localStorage.getItem('products_cache');
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (parsed.length > 0) {
        products = parsed;
        _rebuildProductMap();
        fetchProductsFromServer().catch(() => {});
        return;
      }
    } catch(e) {}
  }
  await fetchProductsFromServer();
}

async function fetchProductsFromServer() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(SCRIPT_URL + '?action=get&token=inox2026xK9m', { signal: controller.signal, cache: 'no-store' });
    clearTimeout(timeoutId);
    const data = await res.json();

    // Đọc header động từ data[0], map theo CONFIG.product_columns
    const headers = (data[0] || []).map(h => (h || '').toString().trim());
    const hIdx = name => headers.indexOf(name);
    const colIdx = {};
    CONFIG.product_columns.forEach(col => {
      const i = hIdx(col.sheet_name);
      if (i !== -1) colIdx[col.field] = i;
    });
    // nhanHieu & phanloai & an dùng trong search/render, không có trong CONFIG
    const nhanHieuIdx = hIdx('Nhãn hiệu');
    const phanLoaiIdx = hIdx('Phân loại');
    const anIdx       = hIdx('Ẩn');

    const fetched = data.slice(1).map(r => {
      const p = {};
      CONFIG.product_columns.forEach(col => {
        const i = colIdx[col.field];
        p[col.field] = i !== undefined ? (r[i] || '') : '';
      });
      p.ma       = (p.ma || '').toString().trim();
      p.dvt      = p.dvt || 'Cái';
      p.tonkho   = Number(colIdx.tonkho !== undefined ? r[colIdx.tonkho] : 0) || 0;
      p.nhanHieu = nhanHieuIdx !== -1 ? (r[nhanHieuIdx] || '') : '';
      p.phanloai = phanLoaiIdx !== -1 ? (r[phanLoaiIdx] || '') : '';
      p.an       = anIdx       !== -1 ? (r[anIdx]       || '') : '';
      return p;
    }).filter(p => p.ma);
    products = fetched;
    _rebuildProductMap();
    // Áp lại các thay đổi ẩn/hiện chưa kịp sync lên sheet
    const now = Date.now();
    Object.keys(pendingHiddenUpdates).forEach(ma => {
      const upd = pendingHiddenUpdates[ma];
      if (now - upd.ts < 15000) {
        const p = products.find(x => x.ma === ma);
        if (p) p.an = upd.value;
      } else {
        delete pendingHiddenUpdates[ma];
      }
    });
    localStorage.setItem('products_cache', JSON.stringify(products));
    filterProductList();
    filterManageProducts();
    dtFilterProducts();
    updateProductStats();
  } catch(e) {
    if (products.length === 0) {
      usingFallbackProducts = false;
      products = [];
      _rebuildProductMap();
    }
  }
}

// ===== HELPERS =====
function showModal(msg, sub, onYes, highlightMas) {
  const overlay = document.getElementById('modal-overlay');
  const iconEl = document.getElementById('modal-icon');
  if (iconEl) {
    iconEl.style.color = '#f9a825';
    iconEl.innerHTML = '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f9a825" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="18" rx="2"></rect><line x1="8" y1="7" x2="16" y2="7"></line><line x1="8" y1="11" x2="16" y2="11"></line><line x1="8" y1="15" x2="12" y2="15"></line></svg>';
  }
  document.getElementById('modal-msg').textContent = msg;
  const subEl = document.getElementById('modal-sub');
  if (highlightMas && highlightMas.length > 0) {
    subEl.innerHTML = sub;
  } else {
    subEl.innerHTML = '';
    subEl.textContent = sub;
  }
  const yes = document.getElementById('modal-yes');
  const no = document.getElementById('modal-no');
  yes.style.display = '';
  yes.style.background = '#f44336';
  yes.textContent = 'Vẫn xuất';
  no.textContent = 'Không';
  overlay.style.display = 'flex';
  if (highlightMas && highlightMas.length > 0) {
    highlightMas.forEach(function(ma) {
      var sid = ma.replace(/[^a-zA-Z0-9]/g, '_');
      var mEl = document.getElementById('ci-' + sid);
      var dtEl = document.getElementById('dtci-' + sid);
      if (mEl) mEl.classList.add('cart-warn');
      if (dtEl) dtEl.classList.add('cart-warn');
    });
  }
  const _clearWarn = () => { document.querySelectorAll('.cart-warn').forEach(function(el) { el.classList.remove('cart-warn'); }); };
  const close = () => { overlay.style.display = 'none'; _clearWarn(); };
  yes.onclick = () => { close(); onYes(); };
  no.onclick = close;
  overlay.onclick = (e) => { if (e.target === overlay) close(); };
  const closeX = document.getElementById('modal-close-x');
  if (closeX) closeX.onclick = close;
}

function showInfoModal(msg, sub, highlightMas) {
  showModal(msg, sub, () => {}, highlightMas || []);
  document.getElementById('modal-overlay').onclick = null;
  const iconEl = document.getElementById('modal-icon');
  if (iconEl) {
    if (msg === 'Chi tiết lợi nhuận') {
      iconEl.style.color = '#1a1a1a';
      iconEl.innerHTML = '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="18" rx="2"></rect><line x1="8" y1="7" x2="16" y2="7"></line><line x1="8" y1="11" x2="16" y2="11"></line><line x1="8" y1="15" x2="12" y2="15"></line></svg>';
    } else if (msg === 'Chi tiết Xuất theo giao dịch') {
      iconEl.style.color = '#1a1a1a';
      iconEl.innerHTML = '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';
    } else if (msg === 'Chi tiết Nhập theo giao dịch') {
      iconEl.style.color = '#1a1a1a';
      iconEl.innerHTML = '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 9V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v4"/><polyline points="17 14 12 9 7 14"/><line x1="12" y1="9" x2="12" y2="21"/></svg>';
    }
  }
  document.getElementById('modal-yes').style.display = 'none';
  document.getElementById('modal-no').textContent = 'Đóng';
}

function parseNum(val) {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  // Loại bỏ dấu phẩy (,), giữ lại số, dấu chấm (.) và dấu trừ (-)
  const cleaned = val.toString().replace(/,/g, '').replace(/[^0-9.-]/g, '');
  return parseFloat(cleaned) || 0;
}

function getInputNum(id) {
  const val = document.getElementById(id).value || '';
  return parseNum(val);
}

function ixShow(el) {
  const b = el.nextElementSibling;
  if (b && b.classList.contains('ix')) b.style.display = el.value ? 'inline-block' : 'none';
}
function ixClear(el) {
  el.value = '';
  if ('kd' in el.dataset) el.dataset.kd = '';
  el.dispatchEvent(new Event('input', {bubbles: true}));
}
function fmtInputK(el) {
  const inputDigits = el.value.replace(/[^0-9]/g, '');
  if (!inputDigits) { el.value = ''; el.dataset.kd = ''; el.dataset.kprev = ''; return; }
  let prevKd = el.dataset.kd || '';
  // Nếu field bị reset ngoài (el.value='') mà dataset.kd chưa xóa → phát hiện qua
  // độ lệch chiều dài giữa giá trị hiện tại và giá trị formatted lần trước (kprev)
  const kprev = el.dataset.kprev || '';
  if (prevKd && kprev && Math.abs(el.value.length - kprev.length) > 2) prevKd = '';
  const prevFull = prevKd ? (parseInt(prevKd) * 1000).toString() : '';
  let newKd;
  if (!prevKd) {
    newKd = inputDigits.endsWith('000') && inputDigits.length > 3 ? inputDigits.slice(0, -3) : inputDigits;
  } else if (inputDigits.startsWith(prevFull) && inputDigits.length === prevFull.length + 1) {
    newKd = prevKd + inputDigits.slice(-1);
  } else if (inputDigits.length < prevFull.length) {
    const steps = prevFull.length - inputDigits.length;
    newKd = steps >= prevKd.length ? '' : prevKd.slice(0, -steps);
  } else {
    newKd = inputDigits.endsWith('000') && inputDigits.length > 3 ? inputDigits.slice(0, -3) : inputDigits;
  }
  el.dataset.kd = newKd;
  if (!newKd) { el.value = ''; el.dataset.kprev = ''; return; }
  el.value = (parseInt(newKd) * 1000).toLocaleString('en-US');
  el.dataset.kprev = el.value;
  el.setSelectionRange(el.value.length, el.value.length);
}

function fmtInput(el) {
  const pos = el.selectionStart;
  const oldLen = el.value.length;
  const raw = el.value.replace(/[^0-9]/g, '');
  const formatted = raw ? Number(raw).toLocaleString('en-US') : '';
  el.value = formatted;
  const diff = formatted.length - oldLen;
  el.setSelectionRange(pos + diff, pos + diff);
}

function fmt(n) { return Number(n || 0).toLocaleString('en-US'); }

function fmtTime(d) {
  d = d || new Date();
  const Y  = d.getFullYear();
  const M  = String(d.getMonth() + 1).padStart(2, '0');
  const D  = String(d.getDate()).padStart(2, '0');
  const HH = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${Y}-${M}-${D} ${HH}:${mm}:${ss}`;
}

function parseAppDateTime(raw) {
  if (!raw) return null;
  if (raw instanceof Date) return raw;
  if (typeof raw === 'number') return new Date(raw);

  const s = String(raw).trim();
  const m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*(AM|PM))?$/i);
  if (m) {
    return buildAppDateTime(m[1], m[2], m[3], m[4], m[5], m[6], m[7]);
  }

  // Hỗ trợ ngày hiển thị từ Sheet/browser: dd/MM/yyyy hoặc MM/dd/yyyy, có thể kèm AM/PM.
  // Khi ngày/tháng đều <= 12, ưu tiên dd/MM theo dữ liệu VN; dữ liệu mới từ server sẽ là yyyy-MM-dd.
  const slash = s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*(AM|PM))?$/i);
  if (slash) {
    const a = Number(slash[1]);
    const b = Number(slash[2]);
    const dayFirst = a > 12 || b <= 12;
    return buildAppDateTime(slash[3], dayFirst ? b : a, dayFirst ? a : b, slash[4], slash[5], slash[6], slash[7]);
  }

  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function buildAppDateTime(year, month, day, hour, minute, second, ampm) {
  let hh = Number(hour);
  if (ampm) {
    const ap = String(ampm).toUpperCase();
    if (ap === 'PM' && hh < 12) hh += 12;
    if (ap === 'AM' && hh === 12) hh = 0;
  }
  const d = new Date(Number(year), Number(month) - 1, Number(day), hh, Number(minute), Number(second || 0));
  if (
    isNaN(d.getTime()) ||
    d.getFullYear() !== Number(year) ||
    d.getMonth() !== Number(month) - 1 ||
    d.getDate() !== Number(day)
  ) return null;
  return d;
}

function historyTimeKey(raw) {
  const d = parseAppDateTime(raw);
  return d ? fmtTime(d) : String(raw || '').trim();
}

function formatHistoryTimeText(g) {
  const raw = g && g.thoigian ? g.thoigian : (g ? g.thoigian_raw : '');
  return historyTimeKey(raw) || fmtTime(new Date((g && g.thoigian_raw) || Date.now()));
}

function parseHistoryDateParts(raw) {
  const d = parseAppDateTime(raw);
  return d ? { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() } : null;
}

function buildHistoryMatchRows(rows) {
  return (rows || []).map(function(r) {
    return {
      ma: r.ma || '',
      ncc: r.ncc || '',
      hanghoa: r.hanghoa || '',
      kichthuoc: r.kichthuoc || '',
      dvt: r.dvt || '',
      soluong: Number(r.soluong) || 0,
      gia: Number(r.gia) || 0,
      giaodich: r.giaodich || '',
      phichanh: Number(r.phichanh) || 0,
      phikhachtra: Number(r.phikhachtra) || 0,
      noncc: Number(r.noncc) || 0,
      khachno: Number(r.khachno) || 0,
      tenkhach: r.tenkhach || '',
      ghichu: r.ghichu || '',
      nguoighi: r.nguoighi || ''
    };
  });
}

function fmtMoney(val) {
  if (typeof val === 'string') {
    // Giữ lại dấu chấm thập phân khi hiển thị
    const num = parseFloat(val.replace(/,/g, '').replace(/[^\d.-]/g, ''));
    return isNaN(num) ? val : num.toLocaleString('en-US') + ' đ';
  }
  return Number(val || 0).toLocaleString('en-US') + ' đ';
}

function findProduct(code) {
  return products.find(p => p.ma === code.trim().toUpperCase());
}

function removeDiacritics(str) {
  return (str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
}

function genMaSP(ten) {
  const words = removeDiacritics(ten).trim().split(/\s+/).filter(Boolean);
  if (!words.length) return '';
  const prefix = words[0].slice(0, 3).toUpperCase();
  let max = 0;
  (products || []).forEach(p => {
    if (p.ma && p.ma.toUpperCase().startsWith(prefix)) {
      const num = parseInt(p.ma.slice(prefix.length)) || 0;
      if (num > max) max = num;
    }
  });
  return prefix + String(max + 1).padStart(3, '0');
}

function _applyTonSortStyle(btnId, state) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  const _svgNone = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4v16M7 4L4 7M7 4l3 3M17 20V4M17 20l-3-3M17 20l3-3"/></svg>';
  const _svgDesc = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M12 19l-5-5M12 19l5-5"/></svg>';
  const _svgAsc  = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M12 5L7 10M12 5l5 5"/></svg>';
  if (state === 'desc') { btn.innerHTML = _svgDesc; btn.style.color = '#4CAF50'; btn.style.borderColor = '#4CAF50'; btn.style.background = '#e8f5e9'; }
  else if (state === 'asc') { btn.innerHTML = _svgAsc; btn.style.color = '#e65100'; btn.style.borderColor = '#ffb74d'; btn.style.background = '#fff3e0'; }
  else { btn.innerHTML = _svgNone; btn.style.color = '#bbb'; btn.style.borderColor = '#e0e0e0'; btn.style.background = '#fafafa'; }
}

function _cycleTonSort(current) {
  const order = ['none', 'desc', 'asc'];
  return order[(order.indexOf(current) + 1) % 3];
}

function cycleMobTonSort() {
  mobTonSort = _cycleTonSort(mobTonSort);
  _applyTonSortStyle('mob-ton-sort-btn', mobTonSort);
  filterProductList();
}

function cycleDtTonSort() {
  dtTonSort = _cycleTonSort(dtTonSort);
  _applyTonSortStyle('dt-ton-sort-btn', dtTonSort);
  dtFilterProducts();
}

function toggleMobSfPanel(e) {
  if (e) { e.preventDefault(); e.stopPropagation(); }
  const panel = document.getElementById('mob-sf-panel');
  if (!panel) return;
  if (panel.style.display !== 'none') { panel.style.display = 'none'; return; }
  panel.style.display = 'block';
  setTimeout(function() {
    function close(ev) {
      if (!panel.contains(ev.target) && !ev.target.closest('#mob-sf-btn')) {
        panel.style.display = 'none';
        document.removeEventListener('click', close, true);
      }
    }
    document.addEventListener('click', close, true);
  }, 0);
}

const MOB_SF_LABELS = { all: 'Tất cả', ma: 'Mã SP', ncc: 'NCC', ten: 'Tên SP', giavon: 'Giá vốn', giasi: 'Giá sỉ', tonkho: 'Tồn' };
const MOB_SF_PLACEHOLDERS = { all: 'Tìm kiếm...', ma: 'Tìm theo mã SP...', ncc: 'Tìm theo nhà cung cấp...', ten: 'Tìm theo tên SP...', giavon: 'Tìm theo giá vốn...', giasi: 'Tìm theo giá sỉ...', tonkho: 'Tìm theo tồn kho...' };

function setMobSearchField(field) {
  mobSearchField = field;
  const label = document.getElementById('mob-sf-label');
  if (label) label.textContent = MOB_SF_LABELS[field] || 'Tất cả';
  ['all','ma','ncc','ten','giavon','giasi','tonkho'].forEach(function(k) {
    const el = document.getElementById('mob-sf-opt-' + k);
    if (el) {
      if (k === field) { el.style.background = '#e8f5e9'; el.style.color = '#2e7d32'; el.style.fontWeight = '700'; }
      else { el.style.background = ''; el.style.color = '#555'; el.style.fontWeight = ''; }
    }
  });
  const panel = document.getElementById('mob-sf-panel');
  if (panel) panel.style.display = 'none';
  const inp = document.getElementById('manual-code');
  if (inp) inp.placeholder = MOB_SF_PLACEHOLDERS[field] || 'Tìm mã hoặc theo tên...';
  filterProductList();
}

function filterProductList() {
  const rawQ = document.getElementById('manual-code').value || '';
  const q = removeDiacritics(rawQ).trim();
  let list = mobileFilterHidden
    ? (products || []).filter(p => isHidden(p.ma))
    : (products || []).filter(p => !isHidden(p.ma));
  if (mobileFilterLow) list = list.filter(p => (p.tonkho || 0) <= LOW_STOCK_THRESHOLD);
  if (q) {
    const keywords = q.split(/\s+/);
    const sf = mobSearchField || 'all';
    list = list.filter(p => {
      let text;
      if (sf === 'ma') text = removeDiacritics(p.ma || '');
      else if (sf === 'ncc') text = removeDiacritics(p.ncc || '');
      else if (sf === 'ten') text = removeDiacritics(p.ten || '');
      else if (sf === 'giavon') text = String(p.giavon || '');
      else if (sf === 'giasi') text = String(p.giasi || '');
      else if (sf === 'tonkho') text = String(p.tonkho || '');
      else text = removeDiacritics([
        p.ma || '', p.ten || '', p.kichthuoc || '',
        p.ncc || '', p.phanloai || '', p.nhanHieu || ''
      ].join(' '));
      return keywords.every(kw => text.includes(kw));
    });
  }

  const mobTonEl = document.getElementById('mob-tonkho-filter');
  if (mobTonEl && mobTonEl.value !== '') list = list.filter(p => (Number(p.tonkho) || 0) <= Number(mobTonEl.value));
  if (mobTonSort === 'desc') list = [...list].sort((a,b) => (Number(b.tonkho)||0) - (Number(a.tonkho)||0));
  else if (mobTonSort === 'asc') list = [...list].sort((a,b) => (Number(a.tonkho)||0) - (Number(b.tonkho)||0));
  { const sc = document.getElementById('mobile-stats-count'); if (sc) sc.textContent = list.length; }
  { const st = document.getElementById('mobile-stats-tonkho'); if (st) st.textContent = fmt(list.reduce((s,p) => s + (Number(p.tonkho)||0), 0)); }
  renderProductList(list, rawQ.trim());
}

function tonkhoUpdateClearBtn(inputId, btnId) {
  const val = (document.getElementById(inputId) || {}).value || '';
  const btn = document.getElementById(btnId);
  if (btn) btn.style.display = val ? 'inline-block' : 'none';
}
function tonkhoClear(inputId, btnId, filterFn) {
  const el = document.getElementById(inputId);
  if (el) { el.value = ''; el.focus(); }
  const btn = document.getElementById(btnId);
  if (btn) btn.style.display = 'none';
  if (filterFn) filterFn();
}

function updateFilterClearBtn() {
  const val = (document.getElementById('manual-code') || {}).value || '';
  const btn = document.getElementById('btn-filter-clear');
  if (btn) btn.style.display = val ? 'inline-block' : 'none';
}

function clearFilterInput() {
  const el = document.getElementById('manual-code');
  if (el) { el.value = ''; el.focus(); }
  updateFilterClearBtn();
  filterProductList();
  const dd = document.getElementById('search-history-dropdown');
  if (dd) dd.style.display = 'none';
}

function saveSearchHistory() {
  const val = ((document.getElementById('manual-code') || {}).value || '').trim();
  if (!val) return;
  let hist = [];
  try { hist = JSON.parse(localStorage.getItem('searchHistory_main') || '[]'); } catch(e) {}
  hist = hist.filter(function(x) { return x !== val; });
  hist.unshift(val);
  localStorage.setItem('searchHistory_main', JSON.stringify(hist.slice(0, 5)));
}

function toggleSearchHistory(e) {
  if (e) { e.preventDefault(); e.stopPropagation(); }
  const dd = document.getElementById('search-history-dropdown');
  if (!dd) return;
  if (dd.style.display !== 'none') { dd.style.display = 'none'; return; }
  let hist = [];
  try { hist = JSON.parse(localStorage.getItem('searchHistory_main') || '[]'); } catch(e) {}
  if (!hist.length) return;
  dd.innerHTML = hist.map(function(h) {
    const esc = h.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/'/g,"\\'");
    return `<div onclick="applySearchHistory('${esc}')" style="padding:9px 14px;font-size:13px;cursor:pointer;border-bottom:1px solid #f5f5f5;color:#333;background:#fff;">${h.replace(/&/g,'&amp;').replace(/</g,'&lt;')}</div>`;
  }).join('');
  dd.style.display = 'block';
  setTimeout(function() {
    function closeHist(ev) {
      if (!dd.contains(ev.target) && ev.target.id !== 'btn-filter-history') {
        dd.style.display = 'none';
        document.removeEventListener('click', closeHist);
      }
    }
    document.addEventListener('click', closeHist);
  }, 0);
}

function applySearchHistory(val) {
  const el = document.getElementById('manual-code');
  if (el) { el.value = val; el.focus(); }
  const dd = document.getElementById('search-history-dropdown');
  if (dd) dd.style.display = 'none';
  updateFilterClearBtn();
  filterProductList();
}

function renderProductList(list, kw) {
  const el = document.getElementById('product-list');
  if (!list || list.length === 0) {
    el.innerHTML = '<div class="loading">Không tìm thấy sản phẩm</div>';
    return;
  }
  el.innerHTML = list.map(p => {
    const low = (p.tonkho || 0) <= LOW_STOCK_THRESHOLD;
    const qid = 'q_' + p.ma.replace(/[^a-zA-Z0-9]/g, '_');
    const cartItem = cart.find(i => i.product.ma === p.ma);
    const cartSl = cartItem ? cartItem.sl : '';
    const sizeLine = p.kichthuoc || '';
    const gv = Number(p.giavon) || 0;
    const gs = Number(p.giasi) || 0;
    const priceParts = [];
    const _msf = mobSearchField || 'all';
    const maLineHtml = [
      hlField(p.ma, kw, 'ma', _msf),
      p.ncc ? hlField(p.ncc, kw, 'ncc', _msf) : '',
      p.phanloai ? (_msf === 'all' ? highlightText(p.phanloai, kw) : p.phanloai) : ''
    ].filter(Boolean).join(' · ');
    if (currentRole === 'owner' && gv > 0) priceParts.push(`<span style="color:#2e7d32;">Giá vốn ${_msf === 'giavon' ? highlightMoney(gv, kw) : fmtMoney(gv)}</span>`);
    if (gs > 0) priceParts.push(`<span style="color:#f44336;">Giá sỉ ${_msf === 'giasi' ? highlightMoney(gs, kw) : fmtMoney(gs)}</span>`);
    const priceLine = priceParts.length
      ? `<div class="product-item-size" style="font-size: 11px;">${priceParts.join(' <span style="color:#1a1a1a;">|</span> ')}</div>`
      : '';
    const tonDisplay = _msf === 'tonkho' ? highlightText('Tồn: ' + fmt(p.tonkho), kw) : 'Tồn: ' + fmt(p.tonkho);
    return `<div class="product-item">
      <div class="product-item-left" onclick="showForm(products.find(x=>x.ma==='${p.ma}'))">
        <div class="product-item-ma">${maLineHtml}</div>
        <div class="product-item-ten">${hlField(p.ten, kw, 'ten', _msf)}</div>
        ${priceLine}
        <div class="product-item-size">${_msf === 'all' ? highlightText(sizeLine, kw) : sizeLine}</div>
      </div>
      <div class="product-item-meta">
        <div class="product-item-tonkho${low ? ' low' : ''}">${tonDisplay}</div>
        <div class="qty-stepper">
          <button class="btn-sub-cart" onclick="subFromCartMobile(products.find(x=>x.ma==='${p.ma}'))" ${cartItem ? '' : 'disabled'}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"/></svg></button>
          <input class="qty-input" id="${qid}" data-ma="${p.ma}" type="text" inputmode="numeric" value="${cartSl}"
            placeholder="1" onclick="event.stopPropagation()" oninput="sanitizeQty(this);liveQtyInput(this)" />
          <button class="btn-add-cart" onclick="addPlusMobile(products.find(x=>x.ma==='${p.ma}'))"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></button>
        </div>
      </div>
    </div>`;
  }).join('');
}

function lookupManual() {
  const code = document.getElementById('manual-code').value.trim();
  if (!code) return;
  const p = findProduct(code);
  if (p) {
    document.getElementById('manual-code').value = '';
    showForm(p);
  } else {
    alert('Không tìm thấy mã sản phẩm: ' + code.toUpperCase());
  }
}

document.getElementById('manual-code').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') lookupManual();
});

// ===== CART =====
function sanitizeQty(el) {
  const raw = el.value.replace(/[^0-9]/g, '');
  el.value = raw === '' ? '' : String(Math.max(1, parseInt(raw)));
}

function liveQtyInput(el) {
  const ma = el.dataset.ma;
  if (!ma) return;
  const val = parseInt(el.value) || 0;
  if (val <= 0) {
    const idx = cart.findIndex(i => i.product.ma === ma);
    if (idx >= 0) {
      cart.splice(idx, 1);
      updateCartBadge();
      _patchProductCardMobile(ma);
      saveCartDebounced();
    }
    return;
  }
  const product = productMap.get(ma) || products.find(x => x.ma === ma);
  if (!product) return;
  const existing = cart.find(i => i.product.ma === ma);
  if (existing) {
    existing.sl = val;
  } else {
    cart.push({ product: product, sl: val, gia: 0 });
  }
  updateCartBadge();
  _patchProductCardMobile(ma);
  saveCartDebounced();
}

function liveQtyInputDt(el) {
  const ma = el.dataset.ma;
  if (!ma) return;
  const val = parseInt(el.value) || 0;
  if (val <= 0) return;
  const product = productMap.get(ma) || products.find(x => x.ma === ma);
  if (!product) return;
  const existing = dtCart.find(i => i.product.ma === ma);
  if (existing) {
    existing.sl = val;
  } else {
    dtCart.push({ product: product, sl: val, gia: 0 });
  }
  dtRenderCart();
  updateCartBadge();
  _patchProductCardDt(ma);
  saveCartDebounced();
}

function _patchProductCardMobile(ma) {
  const qid = 'q_' + ma.replace(/[^a-zA-Z0-9]/g, '_');
  const input = document.getElementById(qid);
  if (!input) return;
  const cartItem = cart.find(i => i.product.ma === ma);
  input.value = cartItem ? cartItem.sl : '';
  const subBtn = input.parentElement && input.parentElement.querySelector('.btn-sub-cart');
  if (subBtn) subBtn.disabled = !cartItem;
}

function addToCartQty(product) {
  if (!product) return;
  const existing = cart.find(i => i.product.ma === product.ma);
  if (existing) {
    existing.sl += 1;
    showToast('➕ ' + product.ten + ' (SL: ' + existing.sl + ')');
  } else {
    cart.push({ product: product, sl: 1, gia: 0 });
    showToast('🛒 Đã thêm: ' + product.ten);
  }
  updateCartBadge();
  _patchProductCardMobile(product.ma);
  saveCart();
}

function addPlusMobile(product) {
  if (!product) return;
  const existing = cart.find(i => i.product.ma === product.ma);
  if (existing) {
    existing.sl += 1;
  } else {
    const qid = 'q_' + product.ma.replace(/[^a-zA-Z0-9]/g, '_');
    const inputEl = document.getElementById(qid);
    const inputVal = inputEl ? (parseInt(inputEl.value) || 1) : 1;
    cart.push({ product: product, sl: inputVal, gia: 0 });
  }
  updateCartBadge();
  _patchProductCardMobile(product.ma);
  saveCart();
}

function subFromCartMobile(product) {
  if (!product) return;
  const idx = cart.findIndex(i => i.product.ma === product.ma);
  const existing = idx >= 0 ? cart[idx] : null;
  if (!existing) return;
  if (existing.sl <= 1) {
    cart.splice(idx, 1);
  } else {
    existing.sl -= 1;
  }
  updateCartBadge();
  _patchProductCardMobile(product.ma);
  saveCart();
}

function showToast(msg) {
  const old = document.querySelector('.toast');
  if (old) old.remove();
  const t = document.createElement('div');
  t.className = 'toast';
  t.style.cssText += 'display:flex;align-items:center;justify-content:center;gap:6px;';
  t.innerHTML = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 1800);
}

function doBackup() {
  const btn = document.getElementById('btn-backup');
  if (!btn || btn.disabled) return;
  showModal(
    'Xác nhận backup',
    'Tạo một bản sao toàn bộ Spreadsheet vào thư mục Drive backup. Có thể mất vài giây.',
    () => {}
  );
  const iconEl = document.getElementById('modal-icon');
  if (iconEl) {
    iconEl.style.color = '#7b1fa2';
    iconEl.innerHTML = '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#7b1fa2" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" fill="#ffffff"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>';
  }
  const yesBtn = document.getElementById('modal-yes');
  if (yesBtn) {
    yesBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg><span>Backup</span>';
    yesBtn.style.background = '#7b1fa2';
    yesBtn.style.display = 'inline-flex';
    yesBtn.style.alignItems = 'center';
    yesBtn.style.justifyContent = 'center';
    yesBtn.style.gap = '6px';
    yesBtn.onclick = _doBackupRun;
  }
}

function _doBackupRun() {
  const headerBtn = document.getElementById('btn-backup');
  const yesBtn    = document.getElementById('modal-yes');
  const noBtn     = document.getElementById('modal-no');
  const closeX    = document.getElementById('modal-close-x');
  const overlay   = document.getElementById('modal-overlay');
  if (!yesBtn || yesBtn.disabled) return;

  if (headerBtn) headerBtn.disabled = true;
  yesBtn.disabled = true;
  yesBtn.style.opacity = '0.7';
  yesBtn.style.cursor = 'wait';
  yesBtn.innerHTML =
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="animation:spin 1s linear infinite"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg><span>Đang Backup...</span>';
  if (noBtn) noBtn.disabled = true;
  if (closeX) closeX.style.pointerEvents = 'none';
  if (overlay) overlay.onclick = null;

  const cleanup = () => {
    if (overlay) overlay.style.display = 'none';
    if (headerBtn) headerBtn.disabled = false;
    yesBtn.disabled = false;
    yesBtn.style.opacity = '';
    yesBtn.style.cursor = '';
    if (noBtn) noBtn.disabled = false;
    if (closeX) closeX.style.pointerEvents = '';
  };

  const backupToast = (msg, durationMs) => {
    const old = document.querySelector('.toast');
    if (old) old.remove();
    const t = document.createElement('div');
    t.className = 'toast';
    t.style.cssText += 'display:flex;align-items:center;justify-content:center;gap:6px;';
    t.innerHTML = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), durationMs);
  };

  const failIcon = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#c62828" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
  const showFail = (detail) => {
    const msg = detail ? ('Backup thất bại: ' + detail) : 'Backup thất bại!';
    console.error('[Backup]', detail || 'unknown error');
    backupToast(failIcon + ' ' + msg, 6000);
  };

  fetch(SCRIPT_URL + '?token=inox2026xK9m&action=backup', { cache: 'no-store' })
    .then(r => r.text().then(text => ({ status: r.status, text })))
    .then(({ status, text }) => {
      let data = null;
      try { data = JSON.parse(text); } catch(_) {}
      if (data && data.status === 'ok') {
        backupToast('<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2e7d32" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Backup thành công: ' + data.name, 4000);
      } else if (data && data.message) {
        showFail(data.message);
      } else if (data && data.error) {
        showFail(data.error);
      } else {
        showFail('HTTP ' + status + ' — server không trả JSON (kiểm tra deploy/version mới)');
      }
    })
    .catch(err => showFail(err && err.message ? err.message : 'lỗi mạng'))
    .finally(cleanup);
}

function addToCart(product) {
  if (!product) return;
  const existing = cart.find(i => i.product.ma === product.ma);
  if (existing) {
    existing.sl += 1;
    updateCartBadge();
    showToast('➕ ' + product.ten + ' (SL: ' + existing.sl + ')');
  } else {
    cart.push({ product: product, sl: 1, gia: 0 });
    updateCartBadge();
    showToast('🛒 Đã thêm: ' + product.ten);
  }
  saveCart();
}

function updateCartBadge() {
  const badge = document.getElementById('cart-badge');
  const bar = document.getElementById('mob-quick-bar');
  const mainScreen = document.getElementById('screen-main');
  if (cart.length > 0) {
    badge.textContent = cart.length;
    badge.style.display = 'flex';
    // Cập nhật mobile quick bar
    if (bar) {
      const total = cart.reduce((s, i) => s + i.sl * effectiveGia(i, cartMode), 0);
      const totalSl = cart.reduce((s, i) => s + (i.sl || 0), 0);
      const elTotal = document.getElementById('mob-quick-total');
      const elSp = document.getElementById('mob-quick-sp');
      const elSl = document.getElementById('mob-quick-sl');
      if (elTotal) elTotal.textContent = fmt(total);
      if (elSp) elSp.textContent = cart.length;
      if (elSl) elSl.textContent = totalSl;
      bar.style.display = 'block';
    }
    if (mainScreen) mainScreen.classList.add('mob-bar-active');
  } else {
    badge.style.display = 'none';
    if (bar) bar.style.display = 'none';
    if (mainScreen) mainScreen.classList.remove('mob-bar-active');
  }
}

function mobQuickAction(mode) {
  stopScan();
  const bn = document.getElementById('cart-btn-nhap');
  if (bn) bn.style.display = currentRole === 'owner' ? '' : 'none';
  if (mode === 'Nháp') {
    setCartMode('Xuất');
  } else {
    setCartMode(mode);
  }
  showScreen('screen-cart');
  if (mode === 'Nháp') {
    // Cuộn xuống cuối để thấy nút Lưu Nháp
    setTimeout(() => {
      const cartScroll = document.querySelector('#screen-cart > div[style*="overflow-y"]');
      if (cartScroll) cartScroll.scrollTop = cartScroll.scrollHeight;
    }, 100);
  }
}

function setCartMode(mode) {
  cartMode = mode;
  const bx = document.getElementById('cart-btn-xuat');
  const bn = document.getElementById('cart-btn-nhap');
  if (bx) bx.className = 'toggle-btn' + (mode === 'Xuất' ? ' active-xuat' : '');
  if (bn) bn.className = 'toggle-btn' + (mode === 'Nhập' ? ' active-nhap' : '');
  const confirmBtn = document.getElementById('btn-cart-confirm');
  if (confirmBtn) {
      confirmBtn.innerHTML = mode === 'Xuất'
        ? '<svg width="16" height="18" viewBox="0 0 24 26" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:6px;"><path d="M20 6L9 17l-5-5"/></svg> Xác nhận Xuất'
        : '<svg width="16" height="18" viewBox="0 0 24 26" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:6px;"><path d="M20 6L9 17l-5-5"/></svg> Xác nhận Nhập';
      confirmBtn.className = 'btn-confirm' + (mode === 'Xuất' ? ' xuat' : '');
  }
  const draftBtn = document.getElementById('btn-cart-draft');
  if (draftBtn) draftBtn.style.display = mode === 'Xuất' ? 'block' : 'none';
  const _cxgRow = document.getElementById('cart-row-xuatghichu');
  if (_cxgRow) _cxgRow.style.display = mode === 'Xuất' ? 'block' : 'none';
  if (mode !== 'Xuất') {
    const _cxgIn = document.getElementById('cart-xuatghichu');
    if (_cxgIn) _cxgIn.value = '';
  }
  const cgLbl = document.getElementById('cart-ghichu-label');
  if (cgLbl) {
    if (mode === 'Xuất') cgLbl.innerHTML = 'Tên khách <span style="color:#f44336;">*</span>';
    else cgLbl.textContent = 'Ghi chú (không bắt buộc)';
  }
  const _cpktRow = document.getElementById('cart-row-phikhachtra');
  if (_cpktRow) _cpktRow.style.display = mode === 'Xuất' ? 'block' : 'none';
  const _cknRow = document.getElementById('cart-row-khachno');
  if (_cknRow) _cknRow.style.display = mode === 'Xuất' ? 'block' : 'none';
  if (mode !== 'Xuất') { const _cknIn = document.getElementById('cart-khachno'); if (_cknIn) _cknIn.value = ''; }
  const _cnnRow = document.getElementById('cart-row-noncc');
  if (_cnnRow) _cnnRow.style.display = mode === 'Nhập' ? 'block' : 'none';
  if (mode !== 'Nhập') { const _cnnIn = document.getElementById('cart-noncc'); if (_cnnIn) _cnnIn.value = ''; }
  renderCart();
}

function goCart() {
  stopScan();

  // Giữ lại logic ẩn/hiện nút Nhập hàng theo phân quyền (Staff không thấy)
  const bn = document.getElementById('cart-btn-nhap');
  if (bn) {
    bn.style.display = currentRole === 'owner' ? '' : 'none';
  }

  // Thay vì tự viết lại logic đổi UI, gọi thẳng hàm setCartMode để đồng bộ mọi thứ (hiện Nháp, Phí KT, đổi màu...)
  setCartMode('Xuất');

  showScreen('screen-cart');
}

function renderCart() {
  const emptyEl = document.getElementById('cart-empty');
  const itemsEl = document.getElementById('cart-items');
  const footerEl = document.getElementById('cart-footer');

  if (cart.length === 0) {
    emptyEl.hidden = false;
    itemsEl.innerHTML = '';
    footerEl.hidden = true;
    return;
  }

  emptyEl.hidden = true;
  footerEl.hidden = false;

  itemsEl.innerHTML = cart.map((item, idx) => {
    const effGia = effectiveGia(item, cartMode);
    const sub = item.sl * effGia;
    const giaFormatted = item.gia > 0 ? Number(item.gia).toLocaleString('en-US') : '';
    const gs = Number(item.product.giasi) || 0;
    const gv = Number(item.product.giavon) || 0;
    const giaPlaceholder = cartMode === 'Xuất'
      ? (gs > 0 ? `${gs.toLocaleString('en-US')}đ` : 'Nhập giá...')
      : (gv > 0 ? `${gv.toLocaleString('en-US')}đ` : 'Nhập giá...');
    const tonkho = Number(item.product.tonkho) || 0;
    const lowTon = tonkho <= LOW_STOCK_THRESHOLD;
    const showWarnSl = cartMode === 'Xuất' && item.sl > 0 && item.sl > tonkho;
    const showWarnGia = cartMode === 'Xuất' && item.gia > 0 && gs > 0 && item.gia < gs;
    const priceInfo = cartMode === 'Xuất'
      ? (gs > 0 ? `<span style="color:#f44336;">Giá sỉ: ${fmtMoney(gs)}</span>` : '')
      : ((currentRole === 'owner' && gv > 0) ? `<span style="color:#2e7d32;">Giá vốn: ${fmtMoney(gv)}</span>` : '');
    const stockPriceLine = `<div style="font-size:12px;">
      <span style="color:${lowTon ? '#f44336' : '#7d1ae8'};">Tồn: ${fmt(tonkho)}</span>${priceInfo ? ` <span style="color:#1a1a1a;">|</span> ${priceInfo}` : ''}
    </div>`;
    return `<div class="cart-item" id="ci-${item.product.ma.replace(/[^a-zA-Z0-9]/g, '_')}">
      <div class="cart-item-header">
        <div>
          <div class="cart-item-name">${item.product.ten}</div>
          <div class="cart-item-size">${item.product.ma}${item.product.ncc ? ' · ' + item.product.ncc : ''}</div>
          ${stockPriceLine}
          ${item.product.kichthuoc ? `<div style="font-size:12px;color:#555;margin-top:1px;">${item.product.kichthuoc}</div>` : ''}
        </div>
        <button class="btn-delete" onclick="removeFromCart(${idx})"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M6 6l1 14h10l1-14"/><path d="M10 11v6"/><path d="M14 11v6"/></svg></button>
      </div>
      <div>
        <div class="cart-item-inputs">
          <button class="ci-sub-btn" onclick="cartStepSl(${idx}, -1)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"/></svg></button>
          <input class="ci-sl" type="text" inputmode="numeric" value="${item.sl}"
            oninput="fmtInput(this);updateCartSl(${idx},this.value)" />
          <button class="ci-add-btn" onclick="cartStepSl(${idx}, 1)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></button>
          <span class="ci-sep">×</span>
          <div style="position:relative;flex:1;">
            <input class="ci-gia" style="width:100%;box-sizing:border-box;padding-right:22px;" type="text" inputmode="numeric" value="${giaFormatted}"
              data-kd="${item.gia > 0 ? Math.floor(item.gia/1000) : ''}"
              placeholder="${giaPlaceholder}"
              oninput="fmtInputK(this);updateCartGia(${idx},this.value);ixShow(this)" />
            <button class="ix" tabindex="-1" onclick="ixClear(this.previousElementSibling)" style="display:${giaFormatted ? 'inline-block' : 'none'};position:absolute;right:3px;top:50%;transform:translateY(-50%);background:none;border:none;padding:2px 3px;cursor:pointer;color:#bbb;font-size:11px;line-height:1;">✕</button>
          </div>
          <span class="ci-sep">=</span>
          <span class="ci-sub" id="ci-sub-${idx}">${sub > 0 ? fmt(sub) + ' đ' : '—'}</span>
        </div>
        <div style="margin-top:3px;display:flex;flex-direction:column;gap:2px;">
          <div id="ci-warn-sl-${idx}" style="display:${showWarnSl ? 'block' : 'none'};font-size:10px;color:#f44336;">${showWarnSl ? `❌ Vượt tồn (còn ${fmt(tonkho)})` : ''}</div>
          <div id="ci-warn-gia-${idx}" style="display:${showWarnGia ? 'block' : 'none'};font-size:10px;color:#e65100;">${showWarnGia ? '⚠️ Thấp hơn giá sỉ' : ''}</div>
        </div>
      </div>
    </div>`;
  }).join('');

  updateCartTotal();
}

function removeFromCart(idx) {
  cart.splice(idx, 1);
  updateCartBadge();
  renderCart();
  saveCart();
}

function cartStepSl(idx, delta) {
  if (!cart[idx]) return;
  const newSl = cart[idx].sl + delta;
  if (newSl < 1) {
    cart.splice(idx, 1);
  } else {
    cart[idx].sl = newSl;
  }
  updateCartBadge();
  renderCart();
  saveCart();
}

function updateCartSl(idx, val) {
  const n = parseNum(val); // Dùng parseNum thay vì regex cũ
  cart[idx].sl = n < 1 ? 1 : n;
  refreshSubTotal(idx);
  updateCartTotal();
  updateCartBadge();
  saveCartDebounced();
  const warnEl = document.getElementById('ci-warn-sl-' + idx);
  if (warnEl && cartMode === 'Xuất') {
    const tonkho = Number(cart[idx].product.tonkho) || 0;
    if (n > 0 && n > tonkho) {
      warnEl.textContent = `❌ Vượt tồn (còn ${fmt(tonkho)})`;
      warnEl.style.display = 'block';
    } else { warnEl.style.display = 'none'; }
  }
}

function updateCartGia(idx, val) {
  cart[idx].gia = parseNum(val); // Dùng parseNum thay vì regex cũ
  refreshSubTotal(idx);
  updateCartTotal();
  saveCartDebounced();
  const warnEl = document.getElementById('ci-warn-gia-' + idx);
  if (warnEl && cartMode === 'Xuất') {
    const gia = cart[idx].gia;
    const giasi = Number(cart[idx].product.giasi) || 0;
    if (gia > 0 && giasi > 0 && gia < giasi) {
      warnEl.textContent = '⚠️ Thấp hơn giá sỉ';
      warnEl.style.display = 'block';
    } else { warnEl.style.display = 'none'; }
  }
}

// Giá hiệu lực: dùng giá sỉ/vốn mặc định khi ô giá trống
function effectiveGia(item, mode) {
  if (item.gia > 0) return item.gia;
  return mode === 'Xuất' ? (Number(item.product.giasi) || 0) : (Number(item.product.giavon) || 0);
}

function refreshSubTotal(idx) {
  const el = document.getElementById('ci-sub-' + idx);
  if (!el) return;
  const sub = cart[idx].sl * effectiveGia(cart[idx], cartMode);
  el.textContent = sub > 0 ? fmt(sub) + ' đ' : '—';
}

function updateCartTotal() {
  const total = cart.reduce((s, i) => s + i.sl * effectiveGia(i, cartMode), 0);
  const el = document.getElementById('cart-total-val');
  if (el) el.textContent = fmt(total);
}

function setGiaodich(val) {
  cartGiaodich = val;
}

async function submitCart(mode) {
  if (cart.length === 0) return;

  const giaodichEl = document.getElementById('cart-giaodich');
  if (giaodichEl) cartGiaodich = giaodichEl.value;
  if (!cartGiaodich) { showInfoModal('Thiếu thông tin!', 'Vui lòng chọn hình thức Giao dịch.'); return; }
  const ghichu = document.getElementById('cart-ghichu').value.trim();
  const xuatGhiChu = mode === 'Xuất' ? (document.getElementById('cart-xuatghichu')?.value || '').trim() : '';
  if (mode === 'Xuất' && !ghichu) { showInfoModal('Thiếu thông tin!', 'Vui lòng nhập Tên khách.'); return; }
  const phiChanh = getInputNum('cart-phichanh');
  const phiKhachTra = mode === 'Xuất' ? getInputNum('cart-phikhachtra') : 0;
  const khachNo = mode === 'Xuất' ? getInputNum('cart-khachno') : 0;
  const noNCC = mode === 'Nhập' ? getInputNum('cart-noncc') : 0;

  // Validate từng item
  for (const item of cart) {
    if (!item.sl || item.sl <= 0) {
      showInfoModal('Thiếu thông tin!', 'Vui lòng nhập số lượng cho: ' + item.product.ten);
      return;
    }
    // Giá mặc định nếu để trống
    if (!item.gia || item.gia <= 0) {
      item.gia = mode === 'Xuất' ? (Number(item.product.giasi) || 0) : (Number(item.product.giavon) || 0);
    }
    if (!item.gia || item.gia <= 0) {
      showInfoModal('Thiếu thông tin!', (mode === 'Xuất' ? 'Vui lòng nhập giá bán cho: ' : 'Vui lòng nhập giá nhập cho: ') + item.product.ten);
      return;
    }
  }
      const overItems = mode === 'Xuất' ? cart.filter(i => {
        const tk = Number(i.product.tonkho) || 0;
        return tk <= 0 || i.sl > tk;
      }) : [];
      if (overItems.length > 0) {
        const warnLines = overItems.map(i => {
          const p = i.product; const tk = Number(p.tonkho) || 0;
          const extra = p.kichthuoc || '';
          const label = [p.ncc, p.ma, p.ten].filter(Boolean).join('-') + (extra ? ' - ' + extra : '');
          return label + ' (tồn: ' + fmt(tk) + ', xuất: ' + fmt(i.sl) + ')';
        });
        const subHtml = '<div style="border:1.5px solid #f44336;border-radius:8px;padding:8px 12px;text-align:left;font-size:13px;line-height:1.7;word-break:break-word;">' + warnLines.join('<br>') + '</div>';
        const warnMas = overItems.map(i => i.product.ma);
        showInfoModal('Vượt tồn kho!', subHtml, warnMas);
        return;
      }

  // Cảnh báo giá vốn (chỉ owner, chỉ Xuất)
  if (mode === 'Xuất' && currentRole === 'owner') {
    const lowItems = cart.filter(i => {
      const gv = parseNum(i.product.giavon);
      const gs = parseNum(i.product.giasi);
      return (gv > 0 && i.gia < gv) || (gs > 0 && i.gia < gs);
    });
    if (lowItems.length > 0) {
      const warnLines = lowItems.map(i => {
        const p = i.product;
        const extra = p.kichthuoc || '';
        return [p.ncc, p.ma, p.ten].filter(Boolean).join('-') + (extra ? ' - ' + extra : '');
      });
      const subHtml = '<div style="border:1.5px solid #f44336;border-radius:8px;padding:8px 12px;text-align:left;font-size:13px;line-height:1.7;word-break:break-word;">' + warnLines.join('<br>') + '</div>';
      const warnMas = lowItems.map(i => i.product.ma);
      showModal('Giá bán thấp hơn giá vốn!', subHtml, () => doSubmitCart(mode, cartGiaodich, ghichu, phiChanh, phiKhachTra, xuatGhiChu, khachNo, noNCC), warnMas);
      return;
    }
  }

  doSubmitCart(mode, cartGiaodich, ghichu, phiChanh, phiKhachTra, xuatGhiChu, khachNo, noNCC);
}

async function doSubmitCart(mode, giaodich, ghichu, phiChanh, phiKhachTra, xuatGhiChu, khachNo, noNCC) {
  const confirmBtn = document.getElementById('btn-cart-confirm');
  if (confirmBtn) { confirmBtn.disabled = true; confirmBtn.textContent = '⏳ Đang ghi...'; }

  const now = new Date();
  const thoiGian = fmtTime(now);

  const totalAmount = cart.reduce((s, i) => s + i.sl * i.gia, 0);
  const totalItems = cart.length;
  const totalQty = cart.reduce((s, i) => s + (i.sl || 0), 0);

  const cols = mode === 'Xuất' ? CONFIG.export_columns : CONFIG.import_columns;
  const rows = cart.map((item, idx) => {
    return cols.map(col => {
      if (col.value === 'auto_timestamp')   return thoiGian;
      if (col.value === 'form.soluong')     return item.sl;
      if (col.value === 'form.gia')         return item.gia;
      if (col.value === 'form.giaodich')    return giaodich;
      if (col.value === 'form.phichanh')    return idx === 0 ? (phiChanh ? (mode === 'Xuất' ? -phiChanh : phiChanh) : '') : '';
      if (col.value === 'form.phikhachtra') return idx === 0 && mode === 'Xuất' ? (phiKhachTra || '') : '';
      if (col.value === 'form.khachno')     return idx === 0 && mode === 'Xuất' ? (khachNo || '') : '';
      if (col.value === 'form.noncc')       return idx === 0 && mode === 'Nhập' ? (noNCC || '') : '';
      if (col.value === 'form.ghichu')      return ghichu;
      if (col.value === 'form.xuatghichu')  return mode === 'Xuất' ? (xuatGhiChu || '') : '';
      if (col.value.startsWith('product.')) return item.product[col.value.replace('product.','')] || '';
      return '';
    });
  });

  fetch(SCRIPT_URL + '?token=inox2026xK9m', {
    method: 'POST', mode: 'no-cors',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sheet: mode, rows, token: 'inox2026xK9m' ,user_name: currentUserName })
  }).catch(() => { showToast('⚠️ Lỗi kết nối, vui lòng kiểm tra mạng.'); });

  const isXuat = mode === 'Xuất';
  document.getElementById('success-title').innerHTML = isXuat ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:6px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Xuất hàng thành công!' : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:6px;"><path d="M21 9V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v4"/><polyline points="17 14 12 9 7 14"/><line x1="12" y1="9" x2="12" y2="21"/></svg> Nhập hàng thành công!';
  document.getElementById('success-sub').textContent = thoiGian;
  document.getElementById('success-detail').innerHTML = `
    <div class="info-row"><span class="info-label">Sản phẩm</span><span class="info-value">${totalItems}</span></div>
    <div class="info-row"><span class="info-label">Tổng số lượng</span><span class="info-value">${totalQty}</span></div>
    <div class="info-row"><span class="info-label">Tổng tiền</span><span class="info-value green">${fmt(totalAmount)} đ</span></div>
    <div class="info-row"><span class="info-label">Giao dịch</span><span class="info-value">${giaodich}</span></div>
    ${phiChanh > 0 ? `<div class="info-row"><span class="info-label">Phí vận chuyển</span><span class="info-value">${fmt(phiChanh)} đ</span></div>` : ''}
    ${phiKhachTra > 0 && mode === 'Xuất' ? `<div class="info-row"><span class="info-label">Phí KH trả</span><span class="info-value">${fmt(phiKhachTra)} đ</span></div>` : ''}
    ${ghichu ? `<div class="info-row"><span class="info-label">${mode === 'Xuất' ? 'Tên khách' : 'Ghi chú'}</span><span class="info-value">${ghichu}</span></div>` : ''}
    ${xuatGhiChu && mode === 'Xuất' ? `<div class="info-row"><span class="info-label">Ghi chú</span><span class="info-value">${xuatGhiChu}</span></div>` : ''}
  `;

  cart = [];
  cartGiaodich = '';
  document.getElementById('cart-ghichu').value = '';
  document.getElementById('cart-xuatghichu').value = '';
  document.getElementById('cart-phichanh').value = '';
  document.getElementById('cart-phikhachtra').value = '';
  const _cknClr = document.getElementById('cart-khachno'); if (_cknClr) _cknClr.value = '';
  const _cnnClr = document.getElementById('cart-noncc');   if (_cnnClr) _cnnClr.value = '';
  const _gdt = document.getElementById('cart-giaodich');
  if (_gdt) _gdt.value = '';
  updateCartBadge();
  saveCart();
  filterProductList();

  if (confirmBtn) {
    confirmBtn.disabled = false;
    confirmBtn.innerHTML = mode === 'Xuất'
        ? '<svg width="16" height="18" viewBox="0 0 24 26" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:6px;"><path d="M20 6L9 17l-5-5"/></svg> Xác nhận Xuất'
        : '<svg width="16" height="18" viewBox="0 0 24 26" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:6px;"><path d="M20 6L9 17l-5-5"/></svg> Xác nhận Nhập';
  }
  _historyStale = true;
  showScreen('screen-success');
}

// ===== FORM =====
let currentProduct = null;
let currentMode = 'Xuất';

function showForm(product) {
  if (!product) return;
  currentProduct = product;
  document.getElementById('form-name').textContent = product.ten;
  document.getElementById('form-size').textContent = 'Kích thước: ' + product.kichthuoc + '  |  Mã: ' + product.ma;
  if (product.ncc) {
    document.getElementById('row-ncc').style.display = 'flex';
    document.getElementById('form-ncc').textContent = product.ncc;
  } else {
    document.getElementById('row-ncc').style.display = 'none';
  }
  if (product.nhanHieu) {
    document.getElementById('row-nhanhieu').style.display = 'flex';
    document.getElementById('form-nhanhieu').textContent = product.nhanHieu;
  } else {
    document.getElementById('row-nhanhieu').style.display = 'none';
  }
  if (product.phanloai) {
    document.getElementById('row-phanloai').style.display = 'flex';
    document.getElementById('form-phanloai').textContent = product.phanloai;
  } else {
    document.getElementById('row-phanloai').style.display = 'none';
  }
  document.getElementById('form-dvt').textContent = product.dvt;
  document.getElementById('form-tonkho').textContent = fmt(product.tonkho) + ' ' + product.dvt;
  const isOwner = currentRole === 'owner';
  document.getElementById('form-badge').textContent = isOwner ? 'Admin' : 'Staff';
  document.getElementById('form-badge').className = 'badge ' + (isOwner ? 'badge-owner' : 'badge-staff');
  document.getElementById('form-giavon').textContent = fmtMoney(product.giavon);
  document.getElementById('form-giasi').textContent = fmtMoney(product.giasi);
  document.getElementById('btn-nhap').style.display = isOwner ? '' : 'none';
  document.getElementById('form-soluong').value = '';
  document.getElementById('form-gia').value = '';
  document.getElementById('form-giaodich').value = '';
  document.getElementById('form-phichanh').value = '';
  document.getElementById('form-ghichu').value = '';
  setMode('Xuất');
  showScreen('screen-form');
}

function setMode(mode) {
  currentMode = mode;
  const bx = document.getElementById('btn-xuat');
  const bn = document.getElementById('btn-nhap');
  const lbl = document.getElementById('label-gia');
  const bc = document.getElementById('btn-confirm');
  document.getElementById('row-phichanh').style.display = 'block';
  const isOwner = currentRole === 'owner';
  const gcLbl = document.getElementById('form-ghichu-label');
  if (mode === 'Xuất') {
    bx.className = 'toggle-btn active-xuat';
    bn.className = 'toggle-btn';
    lbl.innerHTML = 'Giá bán (đồng) <span style="color:#f44336;">*</span>';
    bc.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:6px;"><path d="M20 6L9 17l-5-5"/></svg> Xác nhận Xuất hàng';
    bc.className = 'btn-confirm xuat';
    document.getElementById('row-giavon').style.display = 'none';
    document.getElementById('row-giasi').style.display = 'flex';
    if (gcLbl) gcLbl.innerHTML = 'Tên khách <span style="color:#f44336;">*</span>';
  } else {
    bn.className = 'toggle-btn active-nhap';
    bx.className = 'toggle-btn';
    lbl.innerHTML = 'Giá nhập (đồng) <span style="color:#f44336;">*</span>';
    bc.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:6px;"><path d="M20 6L9 17l-5-5"/></svg> Xác nhận Nhập hàng';
    bc.className = 'btn-confirm';
    document.getElementById('form-phichanh').value = '';
    document.getElementById('row-giavon').style.display = isOwner ? 'flex' : 'none';
    document.getElementById('row-giasi').style.display = 'none';
    if (gcLbl) gcLbl.textContent = 'Ghi chú (không bắt buộc)';
  }
  // Update placeholder ô giá
  const giaInput = document.getElementById('form-gia');
  if (giaInput && currentProduct) {
    if (mode === 'Xuất') {
      const gs = Number(currentProduct.giasi) || 0;
      giaInput.placeholder = gs > 0 ? `${gs.toLocaleString('en-US')}đ` : 'Nhập giá bán...';
    } else {
      const gv = Number(currentProduct.giavon) || 0;
      giaInput.placeholder = gv > 0 ? `${gv.toLocaleString('en-US')}đ` : 'Nhập giá nhập...';
    }
  }
  checkFormWarnings();
  if (typeof renderCart === 'function') renderCart();
}

function getInputNum(id) {
  return parseInt((document.getElementById(id).value || '').replace(/[^0-9]/g, '')) || 0;
}

function checkFormWarnings() {
  const warnSl = document.getElementById('form-warn-sl');
  const warnGia = document.getElementById('form-warn-gia');
  if (!warnSl || !warnGia || !currentProduct) {
    if (warnSl) warnSl.style.display = 'none';
    if (warnGia) warnGia.style.display = 'none';
    return;
  }
  const sl = getInputNum('form-soluong');
  const gia = getInputNum('form-gia');
  const tonkho = Number(currentProduct.tonkho) || 0;
  const giasi = Number(currentProduct.giasi) || 0;
  // SL warning (chỉ Xuất)
  if (currentMode === 'Xuất' && sl > 0 && sl > tonkho) {
    warnSl.textContent = `❌ Vượt tồn kho (còn ${fmt(tonkho)} ${currentProduct.dvt || 'cái'})`;
    warnSl.style.display = 'block';
  } else {
    warnSl.style.display = 'none';
  }
  // Giá warning (chỉ Xuất)
  if (currentMode === 'Xuất' && gia > 0 && giasi > 0 && gia < giasi) {
    warnGia.textContent = '⚠️ Thấp hơn giá sỉ';
    warnGia.style.display = 'block';
  } else {
    warnGia.style.display = 'none';
  }
}

async function submitForm() {
  const sl = getInputNum('form-soluong');
  let gia = getInputNum('form-gia');
  // Giá mặc định nếu để trống
  if (!gia || gia <= 0) {
    gia = currentMode === 'Xuất' ? (Number(currentProduct.giasi) || 0) : (Number(currentProduct.giavon) || 0);
  }
  const giaodich = document.getElementById('form-giaodich').value;
  const phiChanh = getInputNum('form-phichanh');
  const ghichu = document.getElementById('form-ghichu').value;

  if (currentMode === 'Xuất') {
    const tonkho = Number(currentProduct.tonkho) || 0;
    if (tonkho <= 0) {
      showInfoModal('Hết hàng!', 'Sản phẩm này hiện không còn tồn kho để xuất.');
      return;
    }
    if (sl > tonkho) {
      showInfoModal('Số lượng vượt tồn kho!', 'Tồn kho: ' + fmt(tonkho) + ' ' + currentProduct.dvt + '. Không thể xuất ' + fmt(sl) + '.');
      return;
    }
  }
  if (!sl || sl <= 0) { showInfoModal('Thiếu thông tin!', 'Vui lòng nhập Số lượng.'); return; }
  if (!gia || gia <= 0) { showInfoModal('Thiếu thông tin!', currentMode === 'Xuất' ? 'Vui lòng nhập Giá bán.' : 'Vui lòng nhập Giá nhập.'); return; }
  if (!giaodich) { showInfoModal('Thiếu thông tin!', 'Vui lòng chọn hình thức Giao dịch.'); return; }
  if (currentMode === 'Xuất' && !ghichu.trim()) { showInfoModal('Thiếu thông tin!', 'Vui lòng nhập Tên khách.'); return; }

  if (currentMode === 'Xuất') {
    const giavon = parseNum(currentProduct.giavon);
    if (giavon > 0 && gia < giavon) {
      const sub = currentRole === 'owner'
        ? 'Giá vốn: ' + fmt(giavon) + ' đ  •  Giá bán: ' + fmt(gia) + ' đ'
        : 'Giá bán có thể thấp. Bạn có chắc muốn tiếp tục?';
      showModal('Giá bán thấp hơn giá vốn!', sub, () => doSubmit(sl, gia, giaodich, ghichu, phiChanh));
      return;
    }
  }
  doSubmit(sl, gia, giaodich, ghichu, phiChanh);
}

function buildRow(columns, ctx) {
  return columns.map(col => {
    switch (col.value) {
      case 'product.ma':        return ctx.product.ma || '';
      case 'product.ten':       return ctx.product.ten || '';
      case 'product.kichthuoc': return ctx.product.kichthuoc || '';
      case 'product.dvt':       return ctx.product.dvt || '';
      case 'product.nhanHieu':  return ctx.product.nhanHieu || '';
      case 'product.phanloai':  return ctx.product.phanloai || '';
      case 'auto_timestamp':    return ctx.thoiGian;
      case 'form.soluong':      return ctx.sl;
      case 'form.gia':          return ctx.gia;
      case 'form.ghichu':       return ctx.ghichu || '';
      case 'form.giaodich':     return ctx.giaodich || '';
      case 'form.phiChanh':     return ctx.phiChanh || '';
      default:                  return '';
    }
  });
}

async function doSubmit(sl, gia, giaodich, ghichu, phiChanh) {
  const btn = document.getElementById('btn-confirm');
  btn.textContent = '⏳ Đang ghi...';
  btn.disabled = true;

  const now = new Date();
  const thoiGian = fmtTime(now);
  const sheetName = currentMode === 'Xuất' ? 'Xuất' : 'Nhập';
  const cols = currentMode === 'Xuất' ? CONFIG.export_columns : CONFIG.import_columns;
  const row = cols.map(col => {
    if (col.value === 'auto_timestamp')   return thoiGian;
    if (col.value === 'form.soluong')     return sl;
    if (col.value === 'form.gia')         return gia;
    if (col.value === 'form.giaodich')    return giaodich;
    if (col.value === 'form.phichanh')    return phiChanh ? (currentMode === 'Xuất' ? -phiChanh : phiChanh) : '';
    if (col.value === 'form.ghichu')      return ghichu || '';
    if (col.value.startsWith('product.')) {
      const key = col.value.replace('product.', '');
      return currentProduct[key] || '';
    }
    return '';
  });

  try {
    fetch(SCRIPT_URL + '?token=inox2026xK9m', { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sheet: sheetName, row, token: 'inox2026xK9m' ,user_name: currentUserName }) });
  } catch(e) {}

  btn.disabled = false;
  const isXuat = currentMode === 'Xuất';
  document.getElementById('success-title').innerHTML = isXuat ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:6px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Xuất hàng thành công!' : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:6px;"><path d="M21 9V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v4"/><polyline points="17 14 12 9 7 14"/><line x1="12" y1="9" x2="12" y2="21"/></svg> Nhập hàng thành công!';
  document.getElementById('success-sub').textContent = thoiGian;
  document.getElementById('success-detail').innerHTML = `
    <div class="info-row"><span class="info-label">Sản phẩm</span><span class="info-value">${currentProduct.ten}</span></div>
    <div class="info-row"><span class="info-label">Kích thước</span><span class="info-value">${currentProduct.kichthuoc}</span></div>
    <div class="info-row"><span class="info-label">Số lượng</span><span class="info-value">${fmt(sl)} ${currentProduct.dvt}</span></div>
    <div class="info-row"><span class="info-label">${isXuat ? 'Giá bán' : 'Giá nhập'}</span><span class="info-value">${fmt(gia)} đ</span></div>
    <div class="info-row"><span class="info-label">Giao dịch</span><span class="info-value">${giaodich}</span></div>
    ${isXuat && phiChanh > 0 ? `<div class="info-row"><span class="info-label">Phí vận chuyển</span><span class="info-value">${fmt(phiChanh)} đ</span></div>` : ''}
    ${ghichu ? `<div class="info-row"><span class="info-label">Ghi chú</span><span class="info-value">${ghichu}</span></div>` : ''}
  `;
  _historyStale = true;
  showScreen('screen-success');
}

function addToCartFromForm() {
  if (!currentProduct) return;
  const sl = getInputNum('form-soluong') || 1;
  const gia = getInputNum('form-gia') || 0;
  const existing = cart.find(i => i.product.ma === currentProduct.ma);
  if (existing) {
    existing.sl += sl;
    if (gia > 0) existing.gia = gia;
  } else {
    cart.push({ product: currentProduct, sl: sl, gia: gia });
  }
  updateCartBadge();
  saveCart();
  showToast('🛒 Đã thêm vào giỏ: ' + currentProduct.ten);
  goBack();
}

// ===== NAV =====
function goBack() { showScreen('screen-main'); }
function goMain() { showScreen('screen-main'); }
function goHome() { showScreen('screen-main'); }

// ===== SCANNER =====
let html5QrCodeObj = null;

async function toggleScan() {
  if (scanning) { stopScan(); return; }
  const btn = document.getElementById('btn-scan-main');
  const container = document.getElementById('video-container');
  scanning = true;
  container.style.display = 'block';
  document.getElementById('scan-hint').style.display = 'block';
  btn.textContent = '⏹ Dừng quét';

  html5QrCodeObj = new Html5Qrcode('video-container');
  try {
    await html5QrCodeObj.start(
      { facingMode: 'environment' },
      { fps: 15 },
      (decodedText) => {
        const trimmed = decodedText.trim().toUpperCase();
        stopScan();
        const p = findProduct(trimmed);
        if (p) { showForm(p); }
        else { alert('Không tìm thấy sản phẩm với mã: ' + trimmed); }
      },
      () => {}
    );
  } catch(e) {
    scanning = false;
    container.style.display = 'none';
    document.getElementById('scan-hint').style.display = 'none';
    btn.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3M14 17h3M17 14v3"/></svg> Quét mã QR';
    alert('Không mở được camera. Thử dùng nhập mã thủ công bên dưới.');
  }
}

// ===== PRODUCT MANAGEMENT =====
let productFormMode = 'add';
let editingProduct = null;

function showManageProducts() {
  filterManageProducts();
  showScreen('screen-products');
}

function renderManageProductList(list, kw) {
  const el = document.getElementById('manage-product-list');
  if (!products || products.length === 0) {
    el.innerHTML = '<div class="loading">Chưa có sản phẩm nào.</div>';
    return;
  }
  const renderList = list !== undefined ? list : products;
  if (renderList.length === 0) {
    el.innerHTML = '<div class="loading">Không tìm thấy sản phẩm</div>';
    return;
  }
  el.innerHTML = renderList.map(p => {
    const hidden = isHidden(p.ma);
    const low = (p.tonkho || 0) <= LOW_STOCK_THRESHOLD;
    const cardStyle = hidden
      ? 'margin-bottom:10px;opacity:0.5;border:1.5px dashed #aaa;'
      : 'margin-bottom:10px;';
    const gv = Number(p.giavon) || 0;
    const gs = Number(p.giasi) || 0;
    const priceParts = [];
    const _mngsf = manageSearchField || 'all';
    if (gv > 0) priceParts.push(`<span style="color:#2e7d32;">Giá vốn ${_mngsf === 'giavon' ? highlightMoney(gv, kw) : fmtMoney(gv)}</span>`);
    if (gs > 0) priceParts.push(`<span style="color:#f44336;">Giá sỉ ${_mngsf === 'giasi' ? highlightMoney(gs, kw) : fmtMoney(gs)}</span>`);
    const priceLine = priceParts.length
      ? `<div style="font-size:12px;margin-top:3px;">${priceParts.join(' <span style="color:#1a1a1a;font-weight:normal;">|</span> ')}</div>`
      : '';
    const mngTonDisplay = _mngsf === 'tonkho' ? highlightText('Tồn kho: ' + fmt(p.tonkho), kw) + ' ' + (p.dvt || '') : 'Tồn kho: ' + fmt(p.tonkho) + ' ' + (p.dvt || '');
    return `
    <div class="card" style="${cardStyle}">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;">
        <div style="flex:1;min-width:0;">
          <div style="display:flex;align-items:center;gap:6px;">
            <div style="font-size:12px;color:#1565c0;">${hlField(p.ma, kw, 'ma', _mngsf)}${p.ncc ? '<span style="color:#1565c0;font-weight:400;"> · ' + hlField(p.ncc, kw, 'ncc', _mngsf) + '</span>' : ''}</div>
            ${hidden ? '<span style="font-size:10px;background:#e0e0e0;color:#888;border-radius:4px;padding:1px 5px;font-weight:600;">Ẩn</span>' : ''}
          </div>
          <div style="font-size:15px;font-weight:600;margin:2px 0;">${hlField(p.ten, kw, 'ten', _mngsf)}</div>
          <div style="font-size:12px;color:#aaa;">${_mngsf === 'all' ? highlightText(p.kichthuoc || '', kw) : (p.kichthuoc || '')}</div>
          <div style="font-size:12px;color:${low ? '#f44336' : '#7d1ae8'};margin-top:4px;">${mngTonDisplay}</div>
          ${priceLine}
        </div>
        <div style="flex-shrink:0;margin-left:8px;display:flex;flex-direction:column;gap:6px;align-items:flex-end;">
          <div style="display:flex;gap:8px;">
         <button onclick="openProductForm('edit', products.find(x=>x.ma==='${p.ma}'))" class="history-action-btn edit"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg></button>
         <button onclick="confirmDeleteProduct(products.find(x=>x.ma==='${p.ma}'))" class="history-action-btn delete"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M6 6l1 14h10l1-14"/><path d="M10 11v6"/><path d="M14 11v6"/></svg></button>
          </div>
          <button onclick="toggleHideProduct('${p.ma}')"title="${hidden ? 'Sản phẩm đang Ẩn' : 'Sản phẩm đang Hiện'}"style="width:100%;padding:6px 10px;border:1.5px solid ${hidden ? '#cfd8dc' : '#c8e6c9'};border-radius:10px;
                background:${hidden ? '#f5f5f5' : '#e8f5e9'};color:${hidden ? '#607d8b' : '#2e7d32'};font-size:13px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;transition: all 0.2s ease;"onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 10px rgba(0,0,0,0.08)'"
            onmouseout="this.style.transform='none'; this.style.boxShadow='none'">${hidden? '<span class="mini-icon-wrap"><svg class="mini-icon-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6-10-6-10-6Z"/><circle cx="12" cy="12" r="2.6"/><path d="M4 4l16 16"/></svg><span>Ẩn</span></span>':'<span class="mini-icon-wrap"><svg class="mini-icon-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6-10-6-10-6Z"/><circle cx="12" cy="12" r="2.6"/></svg><span>Hiện</span></span>'}
            </button>
        </div>
      </div>
    </div>
  `}).join('');
}

async function openProductForm(mode, product, skipFetch = false) {
  productFormMode = mode;
  editingProduct = product || null;
  document.getElementById('product-form-title').textContent = mode === 'add' ? 'Thêm SP mới' : 'Sửa sản phẩm';

  if (mode === 'add' && !skipFetch) {
    fetchProductsFromServer().catch(() => {}); // chạy nền, không chờ
  }

  const fieldsEl = document.getElementById('product-form-fields');
  fieldsEl.innerHTML = CONFIG.product_columns.filter(col => col.input_type !== 'formula').map(col => {
    const raw = product ? (product[col.field] !== undefined ? product[col.field] : '') : '';
    const isNum = col.input_type === 'number';
    const displayVal = isNum && raw !== '' ? (Number(raw) > 0 ? Number(raw).toLocaleString('en-US') : '') : String(raw).replace(/"/g, '&quot;');
    const locked = col.field === 'ma';
    const required = col.field === 'ma' || col.field === 'ten';
    const ixBtn = !locked ? ('<button class="ix" tabindex="-1" onclick="ixClear(this.previousElementSibling)" style="display:' + (displayVal ? 'inline-block' : 'none') + ';position:absolute;right:6px;top:50%;transform:translateY(-50%);background:none;border:none;padding:3px 4px;cursor:pointer;color:#bbb;font-size:12px;line-height:1;">✕</button>') : '';
    return `
      <label style="margin-top:12px;">${col.form_label || col.sheet_name}${required ? ' <span style="color:#f44336;">*</span>' : ''}</label>
      <div style="position:relative;">
      <input id="pf_${col.field}"
        type="text" inputmode="${isNum ? 'numeric' : 'text'}"
        value="${displayVal}"
        placeholder="${col.sheet_name}..."
        ${isNum ? ('oninput="' + ((col.field === 'giavon' || col.field === 'giasi') ? 'fmtInputK(this)' : 'fmtInput(this)') + ';ixShow(this)"') : (!locked ? 'oninput="ixShow(this)"' : '')}
        ${(col.field === 'giavon' || col.field === 'giasi') ? ('data-kd="' + (displayVal ? Math.floor(parseNum(displayVal)/1000) : '') + '"') : ''}
        ${locked ? 'readonly style="background:#f5f5f5;color:#888;"' : 'style="padding-right:26px;"'} />
      ${ixBtn}
      </div>
    `;
  }).join('');

  if (mode === 'add') {
    const maEl = document.getElementById('pf_ma');
    const tenEl = document.getElementById('pf_ten');
    if (tenEl && maEl) {
      tenEl.addEventListener('input', function() {
        if (this.value.trim().length >= 1) maEl.value = genMaSP(this.value);
        else maEl.value = '';
      });
    }
  }

  _pfACAttach();
  showScreen('screen-product-form');
}

async function submitProductForm() {
  // Validate trước khi lưu
  const maEl = document.getElementById('pf_ma');
  const tenEl = document.getElementById('pf_ten');
  if (!maEl || !maEl.value.trim()) { showInfoModal('Thiếu thông tin!', 'Vui lòng nhập Mã SP.'); return; }
  if (!tenEl || !tenEl.value.trim()) { showInfoModal('Thiếu thông tin!', 'Vui lòng nhập Tên SP.'); return; }

  const btn = document.getElementById('btn-save-product');
  btn.textContent = '⏳ Đang lưu...';
  btn.disabled = true;

  // Build row theo thứ tự CONFIG.product_columns, bỏ qua các cột formula (VD: QR)
  const row = CONFIG.product_columns.filter(col => col.input_type !== 'formula').map(col => {
    const el = document.getElementById('pf_' + col.field);
    if (!el) return '';
    const isNum = col.input_type === 'number';
    return isNum ? (parseInt(el.value.replace(/,/g, '')) || 0) : el.value.trim();
  });

  let body;
  if (productFormMode === 'add') {
    body = { sheet: 'Sản phẩm', action: 'add', row: row };
  } else {
    // Lấy giá trị cũ từ editingProduct
    const oldGiavon = Number(editingProduct.giavon) || 0;
    const oldGiasi  = Number(editingProduct.giasi)  || 0;
    const oldTonkho = Number(editingProduct.tonkho) || 0;
    // Lấy giá trị mới từ form
    const newGiavon = parseInt((document.getElementById('pf_giavon')?.value  || '').replace(/,/g, '')) || 0;
    const newGiasi  = parseInt((document.getElementById('pf_giasi')?.value   || '').replace(/,/g, '')) || 0;
    const newTonkho = parseInt((document.getElementById('pf_tonkho')?.value  || '').replace(/,/g, '')) || 0;
    // Xây chuỗi ghichu_gia
    const _d = new Date();
    const dateStr =
      _d.getFullYear() + '-' +
      String(_d.getMonth() + 1).padStart(2, '0') + '-' +
      String(_d.getDate()).padStart(2, '0') + ' ' +
      String(_d.getHours()).padStart(2, '0') + ':' +
      String(_d.getMinutes()).padStart(2, '0') + ':' +
      String(_d.getSeconds()).padStart(2, '0');
    const _parts = [];
    if (newGiavon !== oldGiavon) _parts.push('Giá vốn: ' + fmt(oldGiavon) + '\u2192' + fmt(newGiavon));
    if (newGiasi  !== oldGiasi)  _parts.push('Giá sỉ: '  + fmt(oldGiasi)  + '\u2192' + fmt(newGiasi));
    const ghichu_gia = _parts.length ? _parts.join(' | ') + ' (' + dateStr + ')' : '';
    // Tính delta tồn kho
    const soluong_delta = newTonkho - oldTonkho;
    body = {
      sheet: 'Sản phẩm', action: 'update', ma: editingProduct.ma, row: row,
      ghichu_gia, soluong_delta, sl_cu: oldTonkho, sl_moi: newTonkho
    };
  }

  console.log('submitProductForm body:', JSON.stringify(body));

  try {
    // Fire-and-forget lên server, không await để UI không bị block
    fetch(SCRIPT_URL + '?token=inox2026xK9m', {
      method: 'POST', mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, token: 'inox2026xK9m' })
    }).catch(() => showToast('⚠️ Lỗi kết nối khi lưu sản phẩm!'));

    // Nếu là thêm mới và tonkho >= 1 → tự ghi thêm vào sheet Nhập (cũng fire-and-forget)
    let successMsg = productFormMode === 'add' ? '✅ Đã thêm sản phẩm mới!' : '✅ Đã cập nhật sản phẩm!';
    if (productFormMode === 'add') {
      const tonkhoEl = document.getElementById('pf_tonkho');
      const giavonEl = document.getElementById('pf_giavon');
      const tonkho = parseInt((tonkhoEl ? tonkhoEl.value.replace(/,/g, '') : '') || '0') || 0;
      if (tonkho >= 1) {
        const formProduct = {};
        CONFIG.product_columns.filter(c => c.input_type !== 'formula').forEach(c => {
          const el = document.getElementById('pf_' + c.field);
          formProduct[c.field] = el ? el.value.trim() : '';
        });
        const giavon = parseInt((giavonEl ? giavonEl.value.replace(/,/g, '') : '') || '0') || 0;
        const now = new Date();
        const ts = fmtTime(now);
        const importRow = CONFIG.import_columns.map(col => {
          if (col.value === 'auto_timestamp') return ts;
          if (col.value === 'form.soluong')   return tonkho;
          if (col.value === 'form.gia')        return giavon;
          if (col.value === 'form.giaodich')   return '';
          if (col.value === 'form.phichanh')   return '';
          if (col.value === 'form.ghichu')     return 'Nhập kho ban đầu';
          if (col.value.startsWith('product.')) return formProduct[col.value.replace('product.','')] || '';
          return '';
        });
        fetch(SCRIPT_URL + '?token=inox2026xK9m', {
          method: 'POST', mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sheet: 'Nhập', row: importRow, token: 'inox2026xK9m' })
        }).catch(() => {});
        successMsg = `✅ Đã thêm SP và ghi nhập kho ${tonkho} ${formProduct.dvt || 'cái'}!`;
      } else {
        successMsg = '✅ Đã thêm SP (chưa có hàng trong kho)';
      }
    }

    // Optimistic update local — không chờ server phản hồi
    const newProductObj = {};
    CONFIG.product_columns.filter(c => c.input_type !== 'formula').forEach((col, idx) => {
      newProductObj[col.field] = row[idx] !== undefined ? row[idx] : '';
    });
    if (productFormMode === 'add') {
      products.push(newProductObj);
    } else {
      const pidx = products.findIndex(p => p.ma === editingProduct.ma);
      if (pidx >= 0) products[pidx] = { ...products[pidx], ...newProductObj };
    }
    _rebuildProductMap();
    localStorage.setItem('products_cache', JSON.stringify(products));

    showScreen('screen-products');
    showToast(successMsg);
    // Sync lại từ server ngầm sau 2s để đảm bảo tồn kho / công thức đúng
    setTimeout(() => fetchProductsFromServer().catch(() => {}), 2000);
  } catch(e) {
    alert('❌ Lỗi: ' + e.message);
  } finally {
    btn.innerHTML = `<svg width="16" height="18" viewBox="0 0 24 26" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:6px;"><path d="M20 6L9 17l-5-5"/></svg> Lưu sản phẩm`;
    btn.disabled = false;
  }
}

function confirmDeleteProduct(product) {
  if (!product) return;
  showModal('Xóa ' + product.ten + '?', 'Hành động này không thể hoàn tác', async () => {
    // Chuyển modal sang trạng thái loading — khóa toàn bộ thao tác
    const overlay = document.getElementById('modal-overlay');
    document.getElementById('modal-msg').textContent = '⏳ Đang xóa...';
    document.getElementById('modal-sub').textContent = 'Vui lòng chờ';
    document.getElementById('modal-yes').style.display = 'none';
    document.getElementById('modal-no').style.display = 'none';
    overlay.style.display = 'flex';
    overlay.onclick = null; // không cho đóng bằng click nền

    const body = { sheet: 'Sản phẩm', action: 'delete', ma: product.ma };
    try {
      // Optimistic update: xóa local ngay, gửi server nền
      products = products.filter(p => p.ma !== product.ma);
      _rebuildProductMap();
      localStorage.setItem('products_cache', JSON.stringify(products));
      overlay.style.display = 'none';
      document.getElementById('modal-no').style.display = '';
      showScreen('screen-products');
      showToast('✅ Đã xóa sản phẩm!');
      fetch(SCRIPT_URL + '?token=inox2026xK9m', {
        method: 'POST', mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, token: 'inox2026xK9m' })
      }).catch(() => showToast('⚠️ Lỗi kết nối khi xóa sản phẩm!'));
    } catch(e) {
      overlay.style.display = 'none';
      document.getElementById('modal-no').style.display = '';
      alert('❌ Lỗi: ' + e.message);
    }
  });
  document.getElementById('modal-yes').textContent = 'Xóa';
}

// ===== DESKTOP LAYOUT =====
let dtCart = [];
let dtMode = 'Xuất';

function dtInitLayout() {
  const isOwner = currentRole === 'owner';
  const badge = isOwner ? 'Admin' : 'Staff';
  const cls = 'badge ' + (isOwner ? 'badge-owner' : 'badge-staff');
  const dtRoleBadge = document.getElementById('dt-role-badge');
  if (dtRoleBadge) {
    dtRoleBadge.textContent = badge;
    dtRoleBadge.className = cls;
  }
  document.getElementById('dt-form-badge').textContent = badge;
  document.getElementById('dt-form-badge').className = cls;
  // hide Nhập button for staff
  document.getElementById('dt-btn-nhap').style.display = isOwner ? '' : 'none';
  // show Quản lý SP button for owner
  document.getElementById('dt-btn-manage').style.display = isOwner ? '' : 'none';
  dtMode = 'Xuất';
  dtSetMode('Xuất');
  dtFilterProducts();
  dtRenderCart();
}

function toggleDtSfPanel(e) {
  if (e) { e.preventDefault(); e.stopPropagation(); }
  const panel = document.getElementById('dt-sf-panel');
  if (!panel) return;
  if (panel.style.display !== 'none') { panel.style.display = 'none'; return; }
  panel.style.display = 'block';
  setTimeout(function() {
    function close(ev) {
      if (!panel.contains(ev.target) && !ev.target.closest('#dt-sf-btn')) {
        panel.style.display = 'none';
        document.removeEventListener('click', close, true);
      }
    }
    document.addEventListener('click', close, true);
  }, 0);
}

const DT_SF_LABELS = { all: 'Tất cả', ma: 'Mã SP', ncc: 'NCC', ten: 'Tên SP', giavon: 'Giá vốn', giasi: 'Giá sỉ', tonkho: 'Tồn' };
const DT_SF_PLACEHOLDERS = { all: 'Tìm mã hoặc tên...', ma: 'Tìm theo mã SP...', ncc: 'Tìm theo nhà cung cấp...', ten: 'Tìm theo tên SP...', giavon: 'Tìm theo giá vốn...', giasi: 'Tìm theo giá sỉ...', tonkho: 'Tìm theo tồn kho...' };

function setDtSearchField(field) {
  dtSearchField = field;
  const label = document.getElementById('dt-sf-label');
  if (label) label.textContent = DT_SF_LABELS[field] || 'Tất cả';
  ['all','ma','ncc','ten','giavon','giasi','tonkho'].forEach(function(k) {
    const el = document.getElementById('dt-sf-opt-' + k);
    if (el) {
      if (k === field) { el.style.background = '#e8f5e9'; el.style.color = '#2e7d32'; el.style.fontWeight = '700'; }
      else { el.style.background = ''; el.style.color = '#555'; el.style.fontWeight = ''; }
    }
  });
  const panel = document.getElementById('dt-sf-panel');
  if (panel) panel.style.display = 'none';
  const inp = document.getElementById('dt-search');
  if (inp) inp.placeholder = DT_SF_PLACEHOLDERS[field] || 'Tìm mã hoặc tên...';
  dtFilterProducts();
}

function dtFilterProducts() {
  const rawQ = document.getElementById('dt-search') ? (document.getElementById('dt-search').value || '') : '';
  const q = removeDiacritics(rawQ).trim();
  let list = dtFilterHidden
    ? (products || []).filter(p => isHidden(p.ma))
    : (products || []).filter(p => !isHidden(p.ma));
  if (dtFilterLow) list = list.filter(p => (p.tonkho || 0) <= LOW_STOCK_THRESHOLD);
  if (q) {
    const keywords = q.split(/\s+/);
    const sf = dtSearchField || 'all';
    list = list.filter(p => {
      let text;
      if (sf === 'ma') text = removeDiacritics(p.ma || '');
      else if (sf === 'ncc') text = removeDiacritics(p.ncc || '');
      else if (sf === 'ten') text = removeDiacritics(p.ten || '');
      else if (sf === 'giavon') text = String(p.giavon || '');
      else if (sf === 'giasi') text = String(p.giasi || '');
      else if (sf === 'tonkho') text = String(p.tonkho || '');
      else text = removeDiacritics([
        p.ma || '', p.ten || '', p.kichthuoc || '',
        p.ncc || ''
      ].join(' '));
      return keywords.every(kw => text.includes(kw));
    });
  }
  const dtTonEl = document.getElementById('dt-tonkho-filter');
  if (dtTonEl && dtTonEl.value !== '') list = list.filter(p => (Number(p.tonkho) || 0) <= Number(dtTonEl.value));
  if (dtTonSort === 'desc') list = [...list].sort((a,b) => (Number(b.tonkho)||0) - (Number(a.tonkho)||0));
  else if (dtTonSort === 'asc') list = [...list].sort((a,b) => (Number(a.tonkho)||0) - (Number(b.tonkho)||0));
  { const sc = document.getElementById('dt-stats-count'); if (sc) sc.textContent = list.length; }
  { const st = document.getElementById('dt-stats-tonkho'); if (st) st.textContent = fmt(list.reduce((s,p) => s + (Number(p.tonkho)||0), 0)); }
  dtRenderProducts(list, rawQ.trim());
}

function dtUpdateFilterClearBtn() {
  const val = (document.getElementById('dt-search') || {}).value || '';
  const btn = document.getElementById('dt-btn-filter-clear');
  if (btn) btn.style.display = val ? 'inline-block' : 'none';
}

function dtClearFilterInput() {
  const el = document.getElementById('dt-search');
  if (el) { el.value = ''; el.focus(); }
  dtUpdateFilterClearBtn();
  dtFilterProducts();
  const dd = document.getElementById('dt-search-history-dropdown');
  if (dd) dd.style.display = 'none';
}

function dtSaveSearchHistory() {
  const val = ((document.getElementById('dt-search') || {}).value || '').trim();
  if (!val) return;
  let hist = [];
  try { hist = JSON.parse(localStorage.getItem('searchHistory_main') || '[]'); } catch(e) {}
  hist = hist.filter(function(x) { return x !== val; });
  hist.unshift(val);
  localStorage.setItem('searchHistory_main', JSON.stringify(hist.slice(0, 5)));
}

function dtToggleSearchHistory(e) {
  if (e) { e.preventDefault(); e.stopPropagation(); }
  const dd = document.getElementById('dt-search-history-dropdown');
  if (!dd) return;
  if (dd.style.display !== 'none') { dd.style.display = 'none'; return; }
  let hist = [];
  try { hist = JSON.parse(localStorage.getItem('searchHistory_main') || '[]'); } catch(e) {}
  if (!hist.length) return;
  dd.innerHTML = hist.map(function(h) {
    const esc = h.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/'/g,"\\'");
    return `<div onclick="dtApplySearchHistory('${esc}')" style="padding:8px 12px;font-size:13px;cursor:pointer;border-bottom:1px solid #f5f5f5;color:#333;background:#fff;">${h.replace(/&/g,'&amp;').replace(/</g,'&lt;')}</div>`;
  }).join('');
  dd.style.display = 'block';
  setTimeout(function() {
    function closeHist(ev) {
      if (!dd.contains(ev.target) && ev.target.id !== 'dt-btn-filter-history') {
        dd.style.display = 'none';
        document.removeEventListener('click', closeHist);
      }
    }
    document.addEventListener('click', closeHist);
  }, 0);
}

function dtApplySearchHistory(val) {
  const el = document.getElementById('dt-search');
  if (el) { el.value = val; el.focus(); }
  const dd = document.getElementById('dt-search-history-dropdown');
  if (dd) dd.style.display = 'none';
  dtUpdateFilterClearBtn();
  dtFilterProducts();
}

// ===== MANAGE PRODUCTS FILTER HELPERS =====
function mngUpdateFilterClearBtn() {
  const val = (document.getElementById('manage-search') || {}).value || '';
  const btn = document.getElementById('mng-btn-filter-clear');
  if (btn) btn.style.display = val ? 'inline-block' : 'none';
}
function mngClearFilterInput() {
  const el = document.getElementById('manage-search');
  if (el) { el.value = ''; el.focus(); }
  mngUpdateFilterClearBtn();
  filterManageProducts();
  const dd = document.getElementById('mng-search-history-dropdown');
  if (dd) dd.style.display = 'none';
}
function mngSaveSearchHistory() {
  const val = ((document.getElementById('manage-search') || {}).value || '').trim();
  if (!val) return;
  let hist = [];
  try { hist = JSON.parse(localStorage.getItem('searchHistory_manage') || '[]'); } catch(e) {}
  hist = hist.filter(function(x) { return x !== val; });
  hist.unshift(val);
  localStorage.setItem('searchHistory_manage', JSON.stringify(hist.slice(0, 5)));
}
function mngToggleSearchHistory(e) {
  if (e) { e.preventDefault(); e.stopPropagation(); }
  const dd = document.getElementById('mng-search-history-dropdown');
  if (!dd) return;
  if (dd.style.display !== 'none') { dd.style.display = 'none'; return; }
  let hist = [];
  try { hist = JSON.parse(localStorage.getItem('searchHistory_manage') || '[]'); } catch(e) {}
  if (!hist.length) return;
  dd.innerHTML = hist.map(function(h) {
    const esc = h.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/'/g,"\\'");
    return `<div onclick="mngApplySearchHistory('${esc}')" style="padding:8px 12px;font-size:13px;cursor:pointer;border-bottom:1px solid #f5f5f5;color:#333;background:#fff;">${h.replace(/&/g,'&amp;').replace(/</g,'&lt;')}</div>`;
  }).join('');
  dd.style.display = 'block';
  setTimeout(function() {
    function closeHist(ev) {
      if (!dd.contains(ev.target) && ev.target.id !== 'mng-btn-filter-history') { dd.style.display = 'none'; document.removeEventListener('click', closeHist); }
    }
    document.addEventListener('click', closeHist);
  }, 0);
}
function mngApplySearchHistory(val) {
  const el = document.getElementById('manage-search');
  if (el) { el.value = val; el.focus(); }
  const dd = document.getElementById('mng-search-history-dropdown');
  if (dd) dd.style.display = 'none';
  mngUpdateFilterClearBtn();
  filterManageProducts();
}

// ===== HISTORY FILTER HELPERS =====
function histUpdateFilterClearBtn() {
  const val = (document.getElementById('hist-search') || {}).value || '';
  const btn = document.getElementById('hist-btn-filter-clear');
  if (btn) btn.style.display = val ? 'inline-block' : 'none';
}
function histClearFilterInput() {
  const el = document.getElementById('hist-search');
  if (el) { el.value = ''; el.focus(); }
  histUpdateFilterClearBtn();
  _renderHistory();
  const dd = document.getElementById('hist-search-history-dropdown');
  if (dd) dd.style.display = 'none';
}
function histSaveSearchHistory() {
  const val = ((document.getElementById('hist-search') || {}).value || '').trim();
  if (!val) return;
  let hist = [];
  try { hist = JSON.parse(localStorage.getItem('searchHistory_hist') || '[]'); } catch(e) {}
  hist = hist.filter(function(x) { return x !== val; });
  hist.unshift(val);
  localStorage.setItem('searchHistory_hist', JSON.stringify(hist.slice(0, 5)));
}
function histToggleSearchHistory(e) {
  if (e) { e.preventDefault(); e.stopPropagation(); }
  const dd = document.getElementById('hist-search-history-dropdown');
  if (!dd) return;
  if (dd.style.display !== 'none') { dd.style.display = 'none'; return; }
  let hist = [];
  try { hist = JSON.parse(localStorage.getItem('searchHistory_hist') || '[]'); } catch(e) {}
  if (!hist.length) return;
  dd.innerHTML = hist.map(function(h) {
    const esc = h.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/'/g,"\\'");
    return `<div onclick="histApplySearchHistory('${esc}')" style="padding:9px 14px;font-size:13px;cursor:pointer;border-bottom:1px solid #f5f5f5;color:#333;background:#fff;">${h.replace(/&/g,'&amp;').replace(/</g,'&lt;')}</div>`;
  }).join('');
  dd.style.display = 'block';
  setTimeout(function() {
    function closeHist(ev) {
      if (!dd.contains(ev.target) && ev.target.id !== 'hist-btn-filter-history') { dd.style.display = 'none'; document.removeEventListener('click', closeHist); }
    }
    document.addEventListener('click', closeHist);
  }, 0);
}
function histApplySearchHistory(val) {
  const el = document.getElementById('hist-search');
  if (el) { el.value = val; el.focus(); }
  const dd = document.getElementById('hist-search-history-dropdown');
  if (dd) dd.style.display = 'none';
  histUpdateFilterClearBtn();
  _renderHistory();
}

function dtRenderProducts(list, kw) {
  const renderList = list !== undefined ? list : (products || []).filter(p => !isHidden(p.ma));
  const el = document.getElementById('dt-product-list');
  if (!renderList || renderList.length === 0) {
    el.innerHTML = '<div style="text-align:center;color:#aaa;font-size:13px;padding:16px;">Không tìm thấy</div>';
    return;
  }
  el.innerHTML = renderList.map(p => {
    const inCart = dtCart.some(i => i.product.ma === p.ma);
    const cartItem = inCart ? dtCart.find(i => i.product.ma === p.ma) : null;
    const currentSl = cartItem ? cartItem.sl : '';
    const low = (p.tonkho || 0) <= LOW_STOCK_THRESHOLD;
    const slId = 'dt-sl-' + p.ma;
    const sizeLine = p.kichthuoc || '';
    const gv = Number(p.giavon) || 0;
    const gs = Number(p.giasi) || 0;
    const priceParts = [];
    const _dsf = dtSearchField || 'all';
    const dtMaLineHtml = [
      hlField(p.ma, kw, 'ma', _dsf),
      p.ncc ? hlField(p.ncc, kw, 'ncc', _dsf) : ''
    ].filter(Boolean).join(' · ');
    if (currentRole === 'owner' && gv > 0) priceParts.push(`<span style="color:#2e7d32;">Giá vốn ${_dsf === 'giavon' ? highlightMoney(gv, kw) : fmtMoney(gv)}</span>`);
    if (gs > 0) priceParts.push(`<span style="color:#f44336;">Giá sỉ ${_dsf === 'giasi' ? highlightMoney(gs, kw) : fmtMoney(gs)}</span>`);
    const priceLine = priceParts.length
      ? `<div style="font-size:11px;">${priceParts.join(' <span style="color:#1a1a1a;">|</span> ')}</div>`
      : '';
    const dtTonDisplay = _dsf === 'tonkho' ? highlightText('Tồn: ' + fmt(p.tonkho), kw) : 'Tồn: ' + fmt(p.tonkho);
    return `<div class="dt-product-item${inCart ? ' in-cart' : ''}"
      style="padding:8px 10px;border-radius:8px;border:1px solid ${inCart ? '#a5d6a7' : 'transparent'};
      margin-bottom:4px;display:flex;justify-content:space-between;align-items:center;
      background:${inCart ? '#e8f5e9' : '#fff'};">
      <div style="flex:1;min-width:0;">
        <div style="font-size:11px;color:#1565c0;">${dtMaLineHtml}</div>
        <div style="font-size:13px;font-weight:600;margin:1px 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${hlField(p.ten, kw, 'ten', _dsf)}</div>
        ${priceLine}
        <div style="font-size:11px;color:#555;">${_dsf === 'all' ? highlightText(sizeLine, kw) : sizeLine}</div>
      </div>
      <div style="flex-shrink:0;margin-left:8px;text-align:right;">
        <div style="font-size:12px;font-weight:600;color:${low ? '#f44336' : '#7d1ae8'};">${dtTonDisplay}</div>
        <div style="display:flex;align-items:center;gap:4px;margin-top:5px;justify-content:flex-end;">
          <button class="dt-btn-sub-cart" onclick="event.stopPropagation();dtSubFromCart('${p.ma}')" ${cartItem ? '' : 'disabled'}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"/></svg></button>
          <input id="${slId}" data-ma="${p.ma}" type="text" inputmode="numeric" value="${currentSl}" placeholder="1"
            onclick="event.stopPropagation()" oninput="sanitizeQty(this);liveQtyInputDt(this)"
            style="width:45px;padding:6px;text-align:center;border:1px solid #e0e0e0;border-radius:6px;font-size:12px;outline:none;color:#333;" />
          <button onclick="event.stopPropagation();dtAddPlus('${p.ma}')"
            style="width:28px;height:28px;border-radius:50%;background:#4CAF50;color:#fff;border:none;font-size:18px;cursor:pointer;line-height:1;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
        </div>
      </div>
    </div>`;
  }).join('');
}

function dtAddToCart(ma, sl) {
  const product = products.find(p => p.ma === ma);
  if (!product) return;
  const exists = dtCart.findIndex(item => item.product.ma === ma);
  if (exists !== -1) {
    dtCart[exists].sl += parseInt(sl) || 1;
  } else {
    dtCart.push({ product: product, sl: parseInt(sl) || 1, gia: 0 });
  }
  dtRenderCart();
  dtFilterProducts();
  saveCart();
}

function _patchProductCardDt(ma) {
  const input = document.getElementById('dt-sl-' + ma);
  if (!input) return;
  const cartItem = dtCart.find(i => i.product.ma === ma);
  input.value = cartItem ? cartItem.sl : '';
  const card = input.closest('.dt-product-item');
  if (card) {
    const inCart = !!cartItem;
    card.classList.toggle('in-cart', inCart);
    card.style.border = '1px solid ' + (inCart ? '#a5d6a7' : 'transparent');
    card.style.background = inCart ? '#e8f5e9' : '#fff';
    const subBtn = card.querySelector('.dt-btn-sub-cart');
    if (subBtn) subBtn.disabled = !cartItem;
  }
}

function dtAddPlus(ma) {
  const product = products.find(p => p.ma === ma);
  if (!product) return;
  const exists = dtCart.findIndex(i => i.product.ma === ma);
  if (exists !== -1) {
    dtCart[exists].sl += 1;
  } else {
    const inputEl = document.getElementById('dt-sl-' + ma);
    const inputVal = inputEl ? (parseInt(inputEl.value) || 1) : 1;
    dtCart.push({ product: product, sl: inputVal, gia: 0 });
  }
  dtRenderCart();
  _patchProductCardDt(ma);
  saveCart();
}

function dtSubFromCart(ma) {
  const idx = dtCart.findIndex(i => i.product.ma === ma);
  const item = idx >= 0 ? dtCart[idx] : null;
  if (!item) return;
  if (item.sl <= 1) {
    dtCart.splice(idx, 1);
  } else {
    item.sl -= 1;
  }
  dtRenderCart();
  _patchProductCardDt(ma);
  saveCart();
}

function dtRemoveFromCart(ma) {
  dtCart = dtCart.filter(i => i.product.ma !== ma);
  dtRenderCart();
  _patchProductCardDt(ma);
  saveCart();
}

function dtUpdateCart(ma, field, value) {
  const item = dtCart.find(i => i.product.ma === ma);
  if (!item) return;
  const num = parseInt((value || '').replace(/[^0-9]/g, '')) || 0;
  if (field === 'sl') item.sl = num < 1 ? 1 : num;
  if (field === 'gia') item.gia = num;
  // update subtotal display
  const sub = item.sl * effectiveGia(item, dtMode);
  const safeId = ma.replace(/[^a-zA-Z0-9]/g, '_');
  const subEl = document.getElementById('dt-sub-' + safeId);
  if (subEl) subEl.textContent = sub > 0 ? fmt(sub) + ' đ' : '—';
  // update total
  const total = dtCart.reduce((s, i) => s + i.sl * effectiveGia(i, dtMode), 0);
  document.getElementById('dt-total').textContent = fmt(total) + ' đ';
  // Cảnh báo real-time (chỉ Xuất)
  if (dtMode === 'Xuất') {
    const tonkho = Number(item.product.tonkho) || 0;
    const giasi = Number(item.product.giasi) || 0;
    const warnSl = document.getElementById('dt-warn-sl-' + safeId);
    const warnGia = document.getElementById('dt-warn-gia-' + safeId);
    if (warnSl) {
      if (item.sl > 0 && item.sl > tonkho) {
        warnSl.textContent = `❌ Vượt tồn (còn ${fmt(tonkho)})`;
        warnSl.style.display = 'block';
      } else { warnSl.style.display = 'none'; }
    }
    if (warnGia) {
      if (item.gia > 0 && giasi > 0 && item.gia < giasi) {
        warnGia.textContent = '⚠️ Thấp hơn giá sỉ';
        warnGia.style.display = 'block';
      } else { warnGia.style.display = 'none'; }
    }
  }
  saveCartDebounced();
}

function dtRenderCart() {
  const listEl = document.getElementById('dt-cart-list');
  const emptyEl = document.getElementById('dt-cart-empty');
  const total = dtCart.reduce((s, i) => s + i.sl * effectiveGia(i, dtMode), 0);
  document.getElementById('dt-cart-count').textContent = dtCart.length + ' SP';
  document.getElementById('dt-total').textContent = fmt(total) + ' đ';
  const confirmBtn = document.getElementById('dt-btn-confirm');
  confirmBtn.innerHTML = `<svg width="16" height="18" viewBox="0 0 24 26" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:6px;"><path d="M20 6L9 17l-5-5"/></svg> Xác nhận ${dtMode} — ${dtCart.length} SP`;

  if (dtCart.length === 0) {
    listEl.innerHTML = '<div id="dt-cart-empty" style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:#ccc;font-size:13px;gap:6px;padding:20px 0;"><div style="font-size:28px;"><svg class="nav-icon-svg" viewBox="0 0 24 24" aria-hidden="true" style="width:33px;height:33px;"><circle cx="9" cy="20" r="1.6"></circle><circle cx="18" cy="20" r="1.6"></circle><path d="M3 4h2l2.2 10.2a1 1 0 0 0 1 .8h9.7a1 1 0 0 0 1-.8L21 7H7"></path></svg></div><div>Chưa có sản phẩm</div><div style="font-size:11px;">Click "+" để chọn SP</div></div>';
    return;
  }

  // Pure innerHTML — no createElement/querySelector needed
  listEl.innerHTML = dtCart.map(item => {
    const p = item.product;
    const safeId = p.ma.replace(/[^a-zA-Z0-9]/g, '_');
    const giaFmt = item.gia > 0 ? Number(item.gia).toLocaleString('en-US') : '';
    const sub = item.sl * effectiveGia(item, dtMode);
    const gs = parseNum(p.giasi);
    const gvNum = parseNum(p.giavon);
    const giaPlaceholder = dtMode === 'Xuất'
      ? (gs > 0 ? `Giá sỉ: ${gs.toLocaleString('en-US')}đ` : 'Nhập giá...')
      : (gvNum > 0 ? `Giá vốn: ${gvNum.toLocaleString('en-US')}đ` : 'Nhập giá...');
    const tonkho = Number(p.tonkho) || 0;
    const lowTon = tonkho <= LOW_STOCK_THRESHOLD;
    const showWarnSl = dtMode === 'Xuất' && item.sl > 0 && item.sl > tonkho;
    const showWarnGia = dtMode === 'Xuất' && item.gia > 0 && gs > 0 && item.gia < gs;
    const priceInfo = dtMode === 'Xuất'
      ? (gs > 0 ? `<span style="color:#f44336;">Giá sỉ: ${fmtMoney(gs)}</span>` : '')
      : ((currentRole === 'owner' && gvNum > 0) ? `<span style="color:#2e7d32;">Giá vốn: ${fmtMoney(gvNum)}</span>` : '');
    const stockPriceLine = `<div style="font-size:11px;">
      <span style="color:${lowTon ? '#f44336' : '#7d1ae8'};">Tồn: ${fmt(tonkho)}</span>${priceInfo ? ` <span style="color:#1a1a1a;">|</span> ${priceInfo}` : ''}
    </div>`;
    return `<div class="dt-cart-item" id="dtci-${p.ma.replace(/[^a-zA-Z0-9]/g, '_')}">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px;">
        <div style="flex:1;min-width:0;">
          <div style="font-size:11px;color:#1565c0;">${p.ma}${p.ncc ? ' · ' + p.ncc : ''}</div>
          <div style="font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${p.ten}</div>
          ${stockPriceLine}
        </div>
        <button onclick="dtRemoveFromCart('${p.ma}')"
          style="background:none;border:none;color:#f44336;font-size:18px;cursor:pointer;padding:0 4px;flex-shrink:0;line-height:1;"><svg width="15" height="18" viewBox="0 0 24 22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M8 6V4h8v2"></path><path d="M6 6l1 14h10l1-14"></path><path d="M10 11v6"></path><path d="M14 11v6"></path></svg></button>
      </div>
      <div>
        <div style="display:flex;align-items:center;gap:4px;">
          <button class="dt-btn-sub-cart" onclick="dtCartStepSl('${p.ma}', -1)"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"/></svg></button>
          <input type="text" inputmode="numeric" value="${item.sl}"
            style="width:45px;padding:6px 4px;border:1px solid #e0e0e0;border-radius:6px;font-size:13px;text-align:center;outline:none;"
            oninput="fmtInput(this);dtUpdateCart('${p.ma}','sl',this.value)" />
          <button onclick="dtCartStepSl('${p.ma}', 1)" style="width:28px;height:28px;background:#4CAF50;color:#fff;border:none;border-radius:50%;font-size:16px;cursor:pointer;line-height:1;display:flex;align-items:center;justify-content:center;flex-shrink:0;padding:0;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></button>
          <span style="font-size:12px;color:#aaa;">×</span>
          <div style="position:relative;flex:1;">
            <input type="text" inputmode="numeric" value="${giaFmt}"
              placeholder="${giaPlaceholder}"
              style="width:100%;padding:5px 22px 5px 7px;border:1px solid #e0e0e0;border-radius:6px;font-size:13px;outline:none;box-sizing:border-box;"
              data-kd="${p.gia > 0 ? Math.floor(p.gia/1000) : ''}"
              oninput="fmtInputK(this);dtUpdateCart('${p.ma}','gia',this.value);ixShow(this)" />
            <button class="ix" tabindex="-1" onclick="ixClear(this.previousElementSibling)" style="display:${giaFmt ? 'inline-block' : 'none'};position:absolute;right:3px;top:50%;transform:translateY(-50%);background:none;border:none;padding:2px 3px;cursor:pointer;color:#bbb;font-size:11px;line-height:1;">✕</button>
          </div>
          <span style="font-size:12px;color:#aaa;">=</span>
          <span id="dt-sub-${safeId}" style="font-size:12px;font-weight:600;color:#4CAF50;min-width:55px;text-align:right;">
            ${sub > 0 ? fmt(sub) + ' đ' : '—'}
          </span>
        </div>
        <div style="margin-top:3px;display:flex;gap:8px;">
          <div id="dt-warn-sl-${safeId}" style="display:${showWarnSl?'block':'none'};font-size:10px;color:#f44336;">${showWarnSl?`❌ Vượt tồn (còn ${fmt(tonkho)})`:''}
          </div>
          <div id="dt-warn-gia-${safeId}" style="display:${showWarnGia?'block':'none'};font-size:10px;color:#e65100;">${showWarnGia?'⚠️ Thấp hơn giá sỉ':''}</div>
        </div>
      </div>
    </div>`;
  }).join('');
}

function dtCartStepSl(ma, delta) {
  const idx = dtCart.findIndex(i => i.product.ma === ma);
  const item = idx >= 0 ? dtCart[idx] : null;
  if (!item) return;
  const newSl = item.sl + delta;
  if (newSl < 1) {
    dtCart.splice(idx, 1);
  } else {
    item.sl = newSl;
  }
  dtRenderCart();
  dtRenderProducts();
  saveCart();
}

function dtSetMode(mode) {
  dtMode = mode;
  const bx = document.getElementById('dt-btn-xuat');
  const bn = document.getElementById('dt-btn-nhap');
  if (mode === 'Xuất') {
    bx.className = 'toggle-btn active-xuat';
    bn.className = 'toggle-btn';
    const _dpktRow = document.getElementById('dt-row-phikhachtra');
    if (_dpktRow) _dpktRow.style.display = 'block';
    const _dxgRow = document.getElementById('dt-row-xuatghichu');
    if (_dxgRow) _dxgRow.style.display = 'block';
    const _dknRow = document.getElementById('dt-row-khachno');
    if (_dknRow) _dknRow.style.display = 'block';
    const _dnnRow = document.getElementById('dt-row-noncc');
    if (_dnnRow) _dnnRow.style.display = 'none';
    const _dnnIn = document.getElementById('dt-noncc');
    if (_dnnIn) _dnnIn.value = '';
  } else {
    bn.className = 'toggle-btn active-nhap';
    bx.className = 'toggle-btn';
    document.getElementById('dt-phichanh').value = '';
    const _dpktRow = document.getElementById('dt-row-phikhachtra');
    if (_dpktRow) _dpktRow.style.display = 'none';
    const _dpktIn = document.getElementById('dt-phikhachtra');
    if (_dpktIn) _dpktIn.value = '';
    const _dxgRow = document.getElementById('dt-row-xuatghichu');
    if (_dxgRow) _dxgRow.style.display = 'none';
    const _dxgIn = document.getElementById('dt-xuatghichu');
    if (_dxgIn) _dxgIn.value = '';
    const _dknRow = document.getElementById('dt-row-khachno');
    if (_dknRow) _dknRow.style.display = 'none';
    const _dknIn = document.getElementById('dt-khachno');
    if (_dknIn) _dknIn.value = '';
    const _dnnRow = document.getElementById('dt-row-noncc');
    if (_dnnRow) _dnnRow.style.display = 'block';
  }
  document.getElementById('dt-row-phichanh').style.display = 'block';
  document.getElementById('dt-confirm-hint').textContent = `Mỗi SP ghi 1 dòng vào sheet ${mode}`;
  const dgLbl = document.getElementById('dt-ghichu-label');
  if (dgLbl) {
    if (mode === 'Xuất') dgLbl.innerHTML = 'Tên khách <span style="color:#f44336;">*</span>';
    else dgLbl.textContent = 'Ghi chú (không bắt buộc)';
  }
  dtRenderCart();
  const btn = document.getElementById('dt-btn-confirm');
  if (btn) {
    btn.className = 'btn-confirm' + (mode === 'Xuất' ? ' xuat' : '');
    btn.innerHTML = `<svg width="16" height="18" viewBox="0 0 24 26" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:6px;"><path d="M20 6L9 17l-5-5"/></svg> Xác nhận ${mode} — ${dtCart.length} SP`;
  }
  const draftBtn = document.getElementById('dt-btn-draft');
  if (draftBtn) draftBtn.style.display = mode === 'Xuất' ? 'block' : 'none';
}

async function dtSubmit() {
  if (dtCart.length === 0) { showInfoModal('Giỏ trống!', 'Thêm ít nhất 1 sản phẩm.'); return; }
  const giaodich = document.getElementById('dt-giaodich').value;
  const ghichu = document.getElementById('dt-ghichu').value.trim();
  const xuatGhiChu = dtMode === 'Xuất' ? (document.getElementById('dt-xuatghichu')?.value || '').trim() : '';
  const phiChanh = parseInt((document.getElementById('dt-phichanh').value || '').replace(/[^0-9]/g,'')) || 0;
  const phiKhachTra = dtMode === 'Xuất' ? (parseInt((document.getElementById('dt-phikhachtra').value || '').replace(/[^0-9]/g,'')) || 0) : 0;
  const khachNo = dtMode === 'Xuất' ? (parseInt((document.getElementById('dt-khachno')?.value || '').replace(/[^0-9]/g,'')) || 0) : 0;
  const noNCC   = dtMode === 'Nhập' ? (parseInt((document.getElementById('dt-noncc')?.value || '').replace(/[^0-9]/g,'')) || 0) : 0;
  if (dtMode === 'Xuất' && !ghichu) { showInfoModal('Thiếu thông tin!', 'Vui lòng nhập Tên khách.'); return; }

  for (const item of dtCart) {
    if (!item.sl || item.sl <= 0) { showInfoModal('Thiếu SL!', 'Vui lòng nhập số lượng cho: ' + item.product.ten); return; }
    // Giá mặc định nếu để trống
    if (!item.gia || item.gia <= 0) {
      item.gia = dtMode === 'Xuất' ? (Number(item.product.giasi) || 0) : (Number(item.product.giavon) || 0);
    }
    if (!item.gia || item.gia <= 0) { showInfoModal('Thiếu giá!', (dtMode === 'Xuất' ? 'Giá bán' : 'Giá nhập') + ' cho: ' + item.product.ten); return; }
  }
  if (!giaodich) { showInfoModal('Thiếu thông tin!', 'Vui lòng chọn hình thức Giao dịch.'); return; }

  if (dtMode === 'Xuất') {
    const overItems = dtCart.filter(i => {
      const tk = Number(i.product.tonkho) || 0;
      return tk <= 0 || i.sl > tk;
    });
    if (overItems.length > 0) {
      const warnLines = overItems.map(i => {
        const p = i.product; const tk = Number(p.tonkho) || 0;
        const extra = p.kichthuoc || '';
        const label = [p.ncc, p.ma, p.ten].filter(Boolean).join('-') + (extra ? ' - ' + extra : '');
        return label + ' (tồn: ' + fmt(tk) + ', xuất: ' + fmt(i.sl) + ')';
      });
      const subHtml = '<div style="border:1.5px solid #f44336;border-radius:8px;padding:8px 12px;text-align:left;font-size:13px;line-height:1.7;word-break:break-word;">' + warnLines.join('<br>') + '</div>';
      const warnMas = overItems.map(i => i.product.ma);
      showInfoModal('Vượt tồn kho!', subHtml, warnMas);
      return;
    }
  }

  if (dtMode === 'Xuất' && currentRole === 'owner') {
    const dtLow = dtCart.filter(i => { const gv = parseNum(i.product.giavon); const gs = parseNum(i.product.giasi); return (gv > 0 && i.gia < gv) || (gs > 0 && i.gia < gs); });
    if (dtLow.length > 0) {
      const warnLines = dtLow.map(i => {
        const p = i.product;
        const extra = p.kichthuoc || '';
        return [p.ncc, p.ma, p.ten].filter(Boolean).join('-') + (extra ? ' - ' + extra : '');
      });
      const subHtml = '<div style="border:1.5px solid #f44336;border-radius:8px;padding:8px 12px;text-align:left;font-size:13px;line-height:1.7;word-break:break-word;">' + warnLines.join('<br>') + '</div>';
      const warnMas = dtLow.map(i => i.product.ma);
      showModal('Giá bán thấp hơn giá vốn!', subHtml, () => _doDtSubmit(giaodich, ghichu, phiChanh, phiKhachTra, xuatGhiChu, khachNo, noNCC), warnMas);
      return;
    }
  }

  _doDtSubmit(giaodich, ghichu, phiChanh, phiKhachTra, xuatGhiChu, khachNo, noNCC);
}

async function _doDtSubmit(giaodich, ghichu, phiChanh, phiKhachTra, xuatGhiChu, khachNo, noNCC) {
  const btn = document.getElementById('dt-btn-confirm');
  btn.disabled = true;
  btn.textContent = '⏳ Đang ghi...';

  const now = new Date();
  const thoiGian = fmtTime(now);
  const cols = dtMode === 'Xuất' ? CONFIG.export_columns : CONFIG.import_columns;

  const rows = dtCart.map((item, idx) => {
    return cols.map(col => {
      if (col.value === 'auto_timestamp')   return thoiGian;
      if (col.value === 'form.soluong')     return item.sl;
      if (col.value === 'form.gia')         return item.gia;
      if (col.value === 'form.giaodich')    return giaodich;
      if (col.value === 'form.phichanh')    return idx === 0 ? (phiChanh ? (dtMode === 'Xuất' ? -phiChanh : phiChanh) : '') : '';
      if (col.value === 'form.phikhachtra') return idx === 0 && dtMode === 'Xuất' ? (phiKhachTra || '') : '';
      if (col.value === 'form.khachno')     return idx === 0 && dtMode === 'Xuất' ? (khachNo || '') : '';
      if (col.value === 'form.noncc')       return idx === 0 && dtMode === 'Nhập' ? (noNCC || '') : '';
      if (col.value === 'form.ghichu')      return ghichu;
      if (col.value === 'form.xuatghichu')  return dtMode === 'Xuất' ? (xuatGhiChu || '') : '';
      if (col.value.startsWith('product.')) return item.product[col.value.replace('product.','')] || '';
      return '';
    });
  });

  fetch(SCRIPT_URL + '?token=inox2026xK9m', {
    method: 'POST', mode: 'no-cors',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sheet: dtMode, rows, token: 'inox2026xK9m' ,user_name: currentUserName })
  }).catch(() => { showToast('⚠️ Lỗi kết nối, vui lòng kiểm tra mạng.'); });

  const count = dtCart.length;
  const totalQty = dtCart.reduce((s, i) => s + (i.sl || 0), 0);
  const totalAmount = dtCart.reduce((s, i) => s + i.sl * i.gia, 0);
  const modeLabel = dtMode;
  const isXuat = dtMode === 'Xuất';
  dtCart = [];
  document.getElementById('dt-giaodich').value = '';
  document.getElementById('dt-phichanh').value = '';
  document.getElementById('dt-phikhachtra').value = '';
  const _dtknClr = document.getElementById('dt-khachno'); if (_dtknClr) _dtknClr.value = '';
  const _dtnClr  = document.getElementById('dt-noncc');   if (_dtnClr)  _dtnClr.value  = '';
  document.getElementById('dt-ghichu').value = '';
  document.getElementById('dt-xuatghichu').value = '';
  saveCart();

  btn.disabled = false;
  dtSetMode(dtMode);
  dtRenderCart();
  dtFilterProducts();
  fetchProductsFromServer().then(() => dtFilterProducts());

  // Hiện success overlay
  document.getElementById('dt-success-title').innerHTML = isXuat ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:6px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Xuất hàng thành công!' : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:6px;"><path d="M21 9V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v4"/><polyline points="17 14 12 9 7 14"/><line x1="12" y1="9" x2="12" y2="21"/></svg> Nhập hàng thành công!';
  document.getElementById('dt-success-sub').textContent = thoiGian;
  document.getElementById('dt-success-detail').innerHTML = `
    <div class="info-row"><span class="info-label">Sản phẩm</span><span class="info-value">${count}</span></div>
    <div class="info-row"><span class="info-label">Tổng số lượng</span><span class="info-value">${totalQty}</span></div>
    <div class="info-row"><span class="info-label">Tổng tiền</span><span class="info-value green">${fmt(totalAmount)} đ</span></div>
    <div class="info-row"><span class="info-label">Giao dịch</span><span class="info-value">${giaodich}</span></div>
    ${phiChanh > 0 ? `<div class="info-row"><span class="info-label">Phí vận chuyển</span><span class="info-value">${fmt(phiChanh)} đ</span></div>` : ''}
    ${phiKhachTra > 0 && isXuat ? `<div class="info-row"><span class="info-label">Phí KH trả</span><span class="info-value">${fmt(phiKhachTra)} đ</span></div>` : ''}
    ${ghichu ? `<div class="info-row"><span class="info-label">${isXuat ? 'Tên khách' : 'Ghi chú'}</span><span class="info-value">${ghichu}</span></div>` : ''}
    ${xuatGhiChu && isXuat ? `<div class="info-row"><span class="info-label">Ghi chú</span><span class="info-value">${xuatGhiChu}</span></div>` : ''}
  `;
  document.getElementById('dt-success-overlay').style.display = 'flex';
}

function closeDtSuccess() {
  document.getElementById('dt-success-overlay').style.display = 'none';
}

function stopScan() {
  scanning = false;
  if (html5QrCodeObj) {
    html5QrCodeObj.stop().then(() => {
      html5QrCodeObj.clear();
      html5QrCodeObj = null;
    }).catch(() => { html5QrCodeObj = null; });
  }
  document.getElementById('video-container').style.display = 'none';
  document.getElementById('scan-hint').style.display = 'none';
  const btn = document.getElementById('btn-scan-main');
  if (btn) btn.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3M14 17h3M17 14v3"/></svg> Quét mã QR';
}

// ===== HISTORY =====
let _historyData = [];
let _historyFilter = 'all';
let histSearchField = 'all';
let reportSearchField = 'all';
let _historyTimeFilter = 'today';
let _histDateFrom = null;
let _histDateTo   = null;
let _historyGroups = [];
let _histSortMode = 'newest';
let _reportTypeFilter = 'all';
let _rptDetailData = [];
let _rptDetailOrderData = [];
let _rptCurrentDetailIdx = -1;
let _rptDetailView = '';
let _reportTimeFilter = 'today';
let _reportDateFrom = null;
let _reportDateTo   = null;
let _reportSortMode = 'newest';
const _DEFAULT_DAYS = 3;
const _HISTORY_CACHE_KEY = 'history_cache_v2';

function _markHistoryStale() {
  _historyStale = true;
  setTimeout(function() {
    const currentRange = _getCurrentFilterRange();
    _fetchHistoryData(true, currentRange).then(function() {
      if (document.getElementById('screen-history').classList.contains('active')) _renderHistory();
      if (document.getElementById('screen-report').classList.contains('active')) renderReport();
    }).catch(function() {});
  }, 2000);
}

function _saveHistoryCache() {
  try { localStorage.setItem(_HISTORY_CACHE_KEY, JSON.stringify({ data: _historyData, ts: Date.now(), range: _loadedRange })); } catch(e) {}
}

async function _fetchHistoryData(force = false, customRange = null) {
  if (!force && _historyData.length && !_historyStale) return _historyData;

  const range = customRange || (function() {
    const now = new Date();
    return { from: new Date(now.getTime() - _DEFAULT_DAYS * 86400000), to: new Date(now.getTime() + 86400000) };
  })();

  const fromISO = range.from.toISOString();
  const toISO = range.to.toISOString();

  const _histFetch = async () => {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 25000);
    try {
      const r = await fetch(SCRIPT_URL + '?action=history&token=inox2026xK9m&fromDate=' + fromISO + '&toDate=' + toISO, { signal: controller.signal, cache: 'no-store' });
      clearTimeout(tid); return r;
    } catch(e) { clearTimeout(tid); throw e; }
  };
  let res;
  try { res = await _histFetch(); }
  catch(e) { await new Promise(r => setTimeout(r, 2000)); res = await _histFetch(); }

  const data = await res.json();
  const xuat  = (data.xuat  || []).map(r => _mapHistRow(r, 'Xuất'));
  const nhap  = (data.nhap  || []).map(r => _mapHistRow(r, 'Nhập'));
  const draft = (data.draft || []).map(r => _mapHistRow(r, 'Nháp'));
  _historyData = [...xuat, ...nhap, ...draft].sort((a, b) => b.thoigian_raw - a.thoigian_raw);
  _loadedRange = { from: range.from.getTime(), to: range.to.getTime() };
  _historyStale = false;
  _saveHistoryCache();
  return _historyData;
}

function _getCurrentFilterRange() {
  const isReport = document.getElementById('screen-report').classList.contains('active')
                || document.getElementById('screen-report-detail').classList.contains('active');
  const tf = isReport ? _reportTimeFilter : _historyTimeFilter;
  const df = isReport ? _reportDateFrom   : _histDateFrom;
  const dt = isReport ? _reportDateTo     : _histDateTo;
  const now = new Date();
  let from, to;
  if (tf === 'all') {
    return { from: new Date(0), to: new Date(now.getTime() + 86400000) };
  } else if (tf === 'today') {
    from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    to   = new Date(from.getTime() + 86400000);
  } else if (tf === 'yesterday') {
    to   = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    from = new Date(to.getTime() - 86400000);
  } else if (tf === 'week') {
    const dow = now.getDay() === 0 ? 6 : now.getDay() - 1;
    from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dow);
    to   = new Date(from.getTime() + 7 * 86400000);
  } else if (tf === 'month') {
    from = new Date(now.getFullYear(), now.getMonth(), 1);
    to   = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  } else if (tf === 'year') {
    from = new Date(now.getFullYear(), 0, 1);
    to   = new Date(now.getFullYear() + 1, 0, 1);
  } else if (tf === 'custom') {
    from = df || new Date(now.getTime() - _DEFAULT_DAYS * 86400000);
    to   = dt ? new Date(dt.getTime() + 86400000) : new Date(now.getTime() + 86400000);
  } else {
    from = new Date(now.getTime() - _DEFAULT_DAYS * 86400000);
    to   = new Date(now.getTime() + 86400000);
  }
  return { from, to };
}

async function _ensureHistoryDataForFilter() {
  const needed    = _getCurrentFilterRange();
  const neededFrom = needed.from.getTime();
  const neededTo   = needed.to.getTime();
  if (_historyStale) {
    await _fetchHistoryData(true, needed);
    return;
  }
  if (!_loadedRange) {
    await _fetchHistoryData(true, needed);
    return;
  }
  if (neededFrom >= _loadedRange.from && neededTo <= _loadedRange.to) {
    return;
  }
  const unionRange = {
    from: new Date(Math.min(neededFrom, _loadedRange.from)),
    to:   new Date(Math.max(neededTo,   _loadedRange.to))
  };
  await _fetchHistoryData(true, unionRange);
}

async function showHistory() {
  showScreen('screen-history');
  _historyFilter = 'all';
  _updateHistDateLabel();
  const list = document.getElementById('history-list');

  if (!_historyData.length) {
    try {
      const cached = JSON.parse(localStorage.getItem(_HISTORY_CACHE_KEY) || 'null');
      if (cached && cached.data && cached.range && (Date.now() - cached.ts < 5 * 60 * 1000)) {
        _historyData = cached.data;
        _loadedRange = cached.range;
        _historyStale = true;
      }
    } catch(e) {}
  }

  const _cnBtn = document.getElementById('hist-congno-btn');
  if (_cnBtn) _cnBtn.style.display = currentRole === 'owner' ? 'inline-flex' : 'none';

  if (_historyData.length) {
    histFilter('all');
    _fetchHistoryData(true, _getCurrentFilterRange()).then(() => {
      if (document.getElementById('screen-history').classList.contains('active')) histFilter('all');
    }).catch(() => {});
    return;
  }

  if (list) list.innerHTML = '<div style="text-align:center;padding:40px;color:#aaa;">Đang tải...</div>';

  try {
    await _ensureHistoryDataForFilter();
    histFilter('all');
  } catch(e) {
    if (list) list.innerHTML = '<div style="text-align:center;padding:40px;color:#f44336;">Không tải được lịch sử.</div>';
  }
}

let _congNoTab = 'nhap';
let _congNoAllData = [];
let _congNoDetailKey = null;

async function showCongNo() {
  const m = document.getElementById('congno-modal');
  if (!m) return;
  _congNoDetailKey = null;
  const tabs = document.getElementById('congno-tabs');
  if (tabs) tabs.style.display = 'flex';
  m.style.display = 'flex';
  _congNoTab = 'nhap';
  // Show cached data immediately if available, otherwise show loading
  if (_congNoAllData.length > 0) {
    _computeCongNo();
    _renderCongNoTab();
  } else {
    document.getElementById('congno-body').innerHTML = '<div style="text-align:center;padding:24px;color:#aaa;font-size:13px;">Đang tải...</div>';
  }
  // Always fetch fresh data in background
  try {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 25000);
    const from = new Date(0).toISOString();
    const to = new Date(Date.now() + 86400000).toISOString();
    const res = await fetch(SCRIPT_URL + '?action=history&token=inox2026xK9m&fromDate=' + from + '&toDate=' + to, { signal: controller.signal, cache: 'no-store' });
    clearTimeout(tid);
    const dat = await res.json();
    const xuat  = (dat.xuat  || []).map(r => _mapHistRow(r, 'Xuất'));
    const nhap  = (dat.nhap  || []).map(r => _mapHistRow(r, 'Nhập'));
    const draft = (dat.draft || []).map(r => _mapHistRow(r, 'Nháp'));
    _congNoAllData = [...xuat, ...nhap, ...draft];
    // Only re-render if modal is still open and not in detail view
    if (m.style.display !== 'none' && !_congNoDetailKey) {
      _computeCongNo();
      _renderCongNoTab();
    }
  } catch(e) {
    // Fetch failed — keep cached data; if nothing cached show error
    if (_congNoAllData.length === 0) {
      const body = document.getElementById('congno-body');
      if (body) body.innerHTML = '<div style="text-align:center;padding:24px;color:#f44336;font-size:13px;">Không tải được dữ liệu, vui lòng thử lại.</div>';
    }
  }
}

async function _refreshCongNo() {
  _setRefreshLoading('congno-refresh-btn', true);
  _congNoAllData = [];
  _congNoDetailKey = null;
  const backBtn = document.getElementById('congno-back-btn');
  if (backBtn) backBtn.style.visibility = 'hidden';
  const titleEl = document.getElementById('congno-title-text');
  if (titleEl) titleEl.textContent = 'Công nợ';
  const tabs = document.getElementById('congno-tabs');
  if (tabs) tabs.style.display = 'flex';
  document.getElementById('congno-body').innerHTML = '<div style="text-align:center;padding:24px;color:#aaa;font-size:13px;">Đang tải...</div>';
  try {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 25000);
    const from = new Date(0).toISOString();
    const to = new Date(Date.now() + 86400000).toISOString();
    const res = await fetch(SCRIPT_URL + '?action=history&token=inox2026xK9m&fromDate=' + from + '&toDate=' + to, { signal: controller.signal, cache: 'no-store' });
    clearTimeout(tid);
    const dat = await res.json();
    const xuat  = (dat.xuat  || []).map(r => _mapHistRow(r, 'Xuất'));
    const nhap  = (dat.nhap  || []).map(r => _mapHistRow(r, 'Nhập'));
    const draft = (dat.draft || []).map(r => _mapHistRow(r, 'Nháp'));
    _congNoAllData = [...xuat, ...nhap, ...draft];
    _computeCongNo();
    _renderCongNoTab();
  } catch(e) {
    document.getElementById('congno-body').innerHTML = '<div style="text-align:center;padding:24px;color:#f44336;font-size:13px;">Không tải được dữ liệu, vui lòng thử lại.</div>';
  } finally {
    _setRefreshLoading('congno-refresh-btn', false);
  }
}

function _computeCongNo() {
  const m = document.getElementById('congno-modal');
  if (!m) return;
  const nccDebt = {}, khachDebt = {};
  for (const g of _congNoAllData) {
    if (g.loai === 'Nhập') {
      const ncc = (g.ncc || '').trim();
      const val = Number(g.noncc) || 0;
      if (ncc && val > 0) nccDebt[ncc] = (nccDebt[ncc] || 0) + val;
    } else if (g.loai === 'Xuất') {
      const khach = (g.tenkhach || '').trim();
      const val = Number(g.khachno) || 0;
      if (khach && val > 0) khachDebt[khach] = (khachDebt[khach] || 0) + val;
    }
  }
  m._nccDebt = nccDebt;
  m._khachDebt = khachDebt;
}

function closeCongNoModal() {
  const m = document.getElementById('congno-modal');
  if (m) m.style.display = 'none';
  _congNoDetailKey = null;
  const tabs = document.getElementById('congno-tabs');
  if (tabs) tabs.style.display = 'flex';
  const backBtn = document.getElementById('congno-back-btn');
  if (backBtn) backBtn.style.visibility = 'hidden';
  const titleEl = document.getElementById('congno-title-text');
  if (titleEl) titleEl.textContent = 'Công nợ';
}

function setCongNoTab(tab) {
  _congNoTab = tab;
  _congNoDetailKey = null;
  const tabs = document.getElementById('congno-tabs');
  if (tabs) tabs.style.display = 'flex';
  _renderCongNoTab();
}

function _renderCongNoTab() {
  const m = document.getElementById('congno-modal');
  if (!m) return;
  const tabNhap = document.getElementById('congno-tab-nhap');
  const tabXuat = document.getElementById('congno-tab-xuat');
  const body = document.getElementById('congno-body');
  if (!body) return;

  const isNhap = _congNoTab === 'nhap';
  if (tabNhap) {
    tabNhap.style.border = isNhap ? '1.5px solid #1976d2' : '1.5px solid #e0e0e0';
    tabNhap.style.background = isNhap ? '#e3f2fd' : '#f5f5f5';
    tabNhap.style.color = isNhap ? '#1976d2' : '#888';
  }
  if (tabXuat) {
    tabXuat.style.border = !isNhap ? '1.5px solid #c62828' : '1.5px solid #e0e0e0';
    tabXuat.style.background = !isNhap ? '#ffebee' : '#f5f5f5';
    tabXuat.style.color = !isNhap ? '#c62828' : '#888';
  }

  const data = isNhap ? (m._nccDebt || {}) : (m._khachDebt || {});
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  if (!entries.length) {
    body.innerHTML = `<div style="text-align:center;padding:24px;color:#aaa;font-size:13px;">${isNhap ? 'Không có nợ NCC nào.' : 'Không có khách nào nợ.'}</div>`;
    return;
  }
  window._congNoNameList = entries.map(([n]) => n);
  const total = entries.reduce((s, e) => s + e[1], 0);
  const rows = entries.map(([name, amt], i) =>
    `<div onclick="_showCongNoDetail(${i})" style="display:flex;justify-content:space-between;align-items:center;padding:9px 6px;border-bottom:1px solid #f0f0f0;cursor:pointer;border-radius:8px;" onmouseover="this.style.background='#f9f9f9'" onmouseout="this.style.background=''">
      <span style="font-size:14px;color:#333;font-weight:500;">${name}</span>
      <div style="display:flex;align-items:center;gap:6px;">
        <span style="font-size:14px;font-weight:700;color:${isNhap ? '#1976d2' : '#c62828'};">${amt.toLocaleString('en-US')} đ</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#bbb" stroke-width="2.5" stroke-linecap="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
      </div>
    </div>`
  ).join('');
  body.innerHTML = rows +
    `<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 4px;margin-top:4px;border-top:2px solid #e0e0e0;">
      <span style="font-size:15px;font-weight:700;color:#555;margin-left: 3px;">Tổng cộng</span>
      <span style="font-size:15px;font-weight:800;margin-right: 17px;color:${isNhap ? '#1565c0' : '#b71c1c'};">${total.toLocaleString('en-US')} đ</span>
    </div>`;
}

function _showCongNoDetail(nameIdx) {
  const name = (window._congNoNameList || [])[nameIdx];
  if (!name) return;
  _congNoDetailKey = name;
  const tabs = document.getElementById('congno-tabs');
  if (tabs) tabs.style.display = 'none';
  const backBtn = document.getElementById('congno-back-btn');
  if (backBtn) backBtn.style.visibility = 'visible';
  const titleEl = document.getElementById('congno-title-text');
  if (titleEl) titleEl.textContent = name;
  const isNhap = _congNoTab === 'nhap';
  const rows = _congNoAllData.filter(g => {
    if (isNhap) return g.loai === 'Nhập' && (g.ncc || '').trim() === name && Number(g.noncc) > 0;
    return g.loai === 'Xuất' && (g.tenkhach || '').trim() === name && Number(g.khachno) > 0;
  }).sort((a, b) => a.thoigian_raw - b.thoigian_raw);
  window._congNoDetailRows = rows;
  _renderCongNoDetail(name, isNhap);
}

function _renderCongNoDetail(name, isNhap) {
  const body = document.getElementById('congno-body');
  if (!body) return;
  const rows = window._congNoDetailRows || [];
  if (!rows.length) {
    body.innerHTML = `<div style="text-align:center;padding:20px;color:#aaa;font-size:13px;">Đã trả hết nợ!</div>`;
    return;
  }
  const total = rows.reduce((s, r) => s + (isNhap ? Number(r.noncc) : Number(r.khachno)), 0);
  const rowsHtml = rows.map((r, i) => {
    const amt = isNhap ? Number(r.noncc) : Number(r.khachno);
    return `<div id="cnd-row-${i}" style="display:flex;justify-content:space-between;align-items:center;padding:10px 4px;border-bottom:1px solid #f0f0f0;gap:8px;">
      <div style="flex:1;min-width:0;">
        <div style="font-size:12px;color:#888;">${r.thoigian}</div>
        <div style="font-size:14px;font-weight:700;color:${isNhap ? '#1976d2' : '#c62828'};">${amt.toLocaleString('en-US')} đ</div>
      </div>
      <button onclick="_daTra(${i})" style="padding:6px 14px;border-radius:20px;border:1.5px solid #43a047;background:#e8f5e9;color:#2e7d32;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;flex-shrink:0;">Đã trả</button>
    </div>`;
  }).join('');
  body.innerHTML = rowsHtml +
    `<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 4px;margin-top:4px;border-top:2px solid #e0e0e0;">
      <span style="font-size:14px;font-weight:700;color:#555;">Tổng còn nợ</span>
      <span style="font-size:15px;font-weight:800;color:${isNhap ? '#1565c0' : '#b71c1c'};">${total.toLocaleString('en-US')} đ</span>
    </div>`;
}

function _congNoBack() {
  _congNoDetailKey = null;
  const tabs = document.getElementById('congno-tabs');
  if (tabs) tabs.style.display = 'flex';
  const backBtn = document.getElementById('congno-back-btn');
  if (backBtn) backBtn.style.visibility = 'hidden';
  const titleEl = document.getElementById('congno-title-text');
  if (titleEl) titleEl.textContent = 'Công nợ';
  _renderCongNoTab();
}

async function _daTra(rowIdx) {
  const rows = window._congNoDetailRows || [];
  const r = rows[rowIdx];
  if (!r) return;
  const isNhap = r.loai === 'Nhập';
  const amt = isNhap ? Number(r.noncc) : Number(r.khachno);
  if (!confirm('Xác nhận đã trả nợ?\n' + r.thoigian + ' · ' + amt.toLocaleString('en-US') + ' đ\nHành động này không thể hoàn tác!')) return;
  const btn = document.querySelector('#cnd-row-' + rowIdx + ' button');
  if (btn) { btn.disabled = true; btn.textContent = '⏳'; }
  fetch(SCRIPT_URL + '?token=inox2026xK9m', {
    method: 'POST', mode: 'no-cors',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'clearDebtRow', sheet: r.loai, thoigian_key: r.thoigian, ma: r.ma, token: 'inox2026xK9m' })
  }).catch(() => {});
  // Optimistic update
  const dataIdx = _congNoAllData.findIndex(g =>
    g.loai === r.loai && g.thoigian === r.thoigian && g.ma === r.ma &&
    (isNhap ? Number(g.noncc) > 0 : Number(g.khachno) > 0)
  );
  if (dataIdx >= 0) {
    if (isNhap) _congNoAllData[dataIdx].noncc = 0;
    else _congNoAllData[dataIdx].khachno = 0;
  }
  _computeCongNo();
  const name = _congNoDetailKey;
  const isNhapTab = _congNoTab === 'nhap';
  const updated = _congNoAllData.filter(g => {
    if (isNhapTab) return g.loai === 'Nhập' && (g.ncc || '').trim() === name && Number(g.noncc) > 0;
    return g.loai === 'Xuất' && (g.tenkhach || '').trim() === name && Number(g.khachno) > 0;
  }).sort((a, b) => a.thoigian_raw - b.thoigian_raw);
  window._congNoDetailRows = updated;
  if (updated.length === 0) {
    _congNoBack();
    showToast('Đã trả hết nợ cho ' + name + '!');
    return;
  }
  _renderCongNoDetail(name, isNhapTab);
  showToast('Đã xóa nợ!');
}

function _setRefreshLoading(btnId, loading) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  btn.classList.toggle('refresh-spin', loading);
  btn.style.pointerEvents = loading ? 'none' : '';
  btn.style.opacity = loading ? '0.7' : '';
}

async function refreshHistoryData() {
  const list = document.getElementById('history-list');
  if (list) list.innerHTML = '<div style="text-align:center;padding:40px;color:#aaa;">Đang tải...</div>';
  _setRefreshLoading('hist-refresh-btn', true);
  try {
    const currentRange = _getCurrentFilterRange();
    // Refresh song song: lịch sử + danh sách khách hàng (để lấy địa chỉ mới thêm vào sheet "Khách hàng")
    await Promise.all([
      _fetchHistoryData(true, currentRange),
      fetchCustomerData(true)
    ]);
    _renderHistory();
    showToast('Đã làm mới lịch sử');
  } catch (e) {
    if (list) list.innerHTML = '<div style="text-align:center;padding:40px;color:#f44336;">Không tải được lịch sử.</div>';
    showToast('Không thể làm mới lịch sử');
  } finally {
    _setRefreshLoading('hist-refresh-btn', false);
  }
}

function _mapHistRow(r, loai) {
  const isXuat = loai === 'Xuất' || loai === 'Nháp';
  const raw = r[1];
  const t = parseAppDateTime(raw);
  const timeKey = t ? fmtTime(t) : (raw ? raw.toString() : '');
  return {
    loai,
    ma:           (r[0] || '').toString().trim(),
    thoigian:     timeKey,
    thoigian_raw: t ? t.getTime() : 0,
    ncc:          (r[2] || '').toString(),
    hanghoa:      (r[3] || '').toString(),
    kichthuoc:    (r[4] || '').toString(),
    dvt:          (r[5] || '').toString(),
    soluong:      Number(r[6]) || 0,
    gia:          Number(r[7]) || 0,
    giaodich:     (r[8] || '').toString(),
    phichanh:     Number(r[9]) || 0,
    phikhachtra:  isXuat ? (Number(r[10]) || 0) : 0,
    noncc:        !isXuat ? (Number(r[10]) || 0) : 0,
    khachno:      isXuat ? (Number(r[11]) || 0) : 0,
    ghichu:       isXuat ? (r[14] || '').toString() : (r[12] || '').toString(),
    tenkhach:     isXuat ? (r[13] || '').toString() : '',
    nguoighi:     (r[15] || '').toString(),
  };
}

const _histFilterLabels = { all: 'Tất cả', nhap: 'Nhập', xuat: 'Xuất', draft: 'Nháp' };
function histFilter(f) {
  _historyFilter = f;

  // 1. Định nghĩa bộ Icon SVG cho từng loại
  const filterIcons = {
    'all': `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>`,
    'nhap': `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg>`,
    'xuat': `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>`,
    'draft': `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`
  };

  // 2. Cập nhật màu sắc cho các nút bấm trong Panel (giữ nguyên logic cũ của anh)
  ['all', 'xuat', 'nhap', 'draft'].forEach(k => {
    const btn = document.getElementById('hist-btn-' + k);
    if (btn) {
      const active = f === k;
      btn.style.background  = active ? '#fff3e0' : '#f5f5f5';
      btn.style.color       = active ? '#e65100'    : '#888';
      btn.style.borderColor = active ? '#f57c00' : '#e0e0e0';
    }
    const hfBtn = document.getElementById('hf-' + k);
    if (hfBtn) hfBtn.classList.toggle('active', f === k);
  });

  // 3. Cập nhật Label hiển thị (Kèm Icon + Chữ)
  const lbl = document.getElementById('hist-filter-dd-label');
  if (lbl) {
    const iconSvg = filterIcons[f] || filterIcons['all'];
    const textLabel = _histFilterLabels[f] || (f === 'all' ? 'Tất cả' : f);

    lbl.innerHTML = `
      <span style="display:inline-flex; align-items:center; gap:5px;">
        <span style="display:inline-flex; vertical-align:middle;">${iconSvg}</span>
        <span>${textLabel}</span>
      </span>
    `;
  }

  _renderHistory();
}

function toggleHistFilterPanel(e) {
  if (e) e.stopPropagation();
  const p = document.getElementById('hist-filter-panel');
  const arrow = document.getElementById('hist-filter-dd-arrow');
  if (!p) return;
  const open = p.style.display === 'none' || p.style.display === '';
  _closeHistDatePanel(); _closeHistSortPanel();
  p.style.display = open ? 'block' : 'none';
  if (arrow) arrow.style.transform = open ? 'rotate(180deg)' : '';
}
function _closeHistFilterPanel() {
  const p = document.getElementById('hist-filter-panel');
  const arrow = document.getElementById('hist-filter-dd-arrow');
  if (p) p.style.display = 'none';
  if (arrow) arrow.style.transform = '';
}

function toggleHistDatePanel(e) {
  if (e) e.stopPropagation();
  const panel = document.getElementById('hist-date-panel');
  const arrow = document.getElementById('hist-date-arrow');
  if (!panel) return;

  const open = panel.style.display === 'none' || panel.style.display === '';
  _closeHistFilterPanel(); _closeHistSortPanel();
  panel.style.display = open ? 'block' : 'none';

  // Dùng backtick (`) để chèn mã SVG và lật 180 độ khi mở
  if (arrow) {
    arrow.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="transition:transform 0.2s; ${open ? 'transform: rotate(180deg);' : ''}"><polyline points="6 9 12 15 18 9"></polyline></svg>`;
  }

  // BỔ SUNG LỆNH HIGHLIGHT NÚT KHI MỞ PANEL
  if (open) {
    // Khai báo danh sách các ID nút và giá trị tương ứng
    const btnIds = {
      'all': 'hist-t-all',
      'yesterday': 'hist-t-yesterday',
      'today': 'hist-t-today',
      'week': 'hist-t-week',
      'month': 'hist-t-month',
      'year': 'hist-t-year'
    };

    // Quét qua từng nút để tô màu
    Object.keys(btnIds).forEach(key => {
      const btn = document.getElementById(btnIds[key]);
      if (btn) {
        if (_historyTimeFilter === key) {
          // Nút đang được chọn: Bôi xanh
          btn.style.background = '#1976d2';
          btn.style.color = '#fff';
          btn.style.borderColor = '#1976d2';
        } else {
          // Nút không được chọn: Về màu xám
          btn.style.background = '#f5f5f5';
          btn.style.color = '#888';
          btn.style.borderColor = '#e0e0e0';
        }
      }
    });
  }
}

function _closeHistDatePanel() {
  const panel = document.getElementById('hist-date-panel');
  const arrow = document.getElementById('hist-date-arrow');
  if (panel) panel.style.display = 'none';

  // Trả mũi tên về trạng thái úp xuống mặc định
  if (arrow) {
    arrow.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="transition:transform 0.2s;"><polyline points="6 9 12 15 18 9"></polyline></svg>`;
  }
}

function _updateHistDateLabel() {
  const label  = document.getElementById('hist-date-label');
  const toggle = document.getElementById('hist-date-toggle');
  const labels = { all:'Tất cả', yesterday:'Hôm qua', today:'Hôm nay', week:'Tuần này', month:'Tháng này', year:'Năm nay' };
  let text;
  if (_historyTimeFilter === 'custom') {
    const fd = d => d ? d.getDate()+'/'+(d.getMonth()+1)+'/'+d.getFullYear() : '?';
    text = fd(_histDateFrom) + ' \u2192 ' + fd(_histDateTo);
  } else {
    text = labels[_historyTimeFilter] || labels.all;
  }
  if (label) label.textContent = text;
  if (toggle) {
    toggle.style.background   = '#e3f2fd';
    toggle.style.color        = '#1976d2';
    toggle.style.borderColor  = '#1976d2';
  }
}

async function histTimeFilter(f) {
  _historyTimeFilter = f;
  _histDateFrom = null;
  _histDateTo   = null;
  ['all','yesterday','today','week','month','year'].forEach(k => {
    const btn = document.getElementById('hist-t-' + k);
    if (!btn) return;
    const active = f === k;
    btn.style.background  = active ? '#1976d2' : '#f5f5f5';
    btn.style.color       = active ? '#fff'    : '#888';
    btn.style.borderColor = active ? '#1976d2' : '#e0e0e0';
  });
  _updateHistDateLabel();
  _closeHistDatePanel();
  const list = document.getElementById('history-list');
  if (list && (_historyStale || !_loadedRange)) {
    list.innerHTML = '<div style="text-align:center;padding:40px;color:#aaa;">Đang tải...</div>';
  }
  try { await _ensureHistoryDataForFilter(); } catch(e) {}
  _renderHistory();
}

async function histApplyDateRange() {
  const fromVal = document.getElementById('hist-from-date')?.value;
  const toVal   = document.getElementById('hist-to-date')?.value;
  if (!fromVal && !toVal) { histTimeFilter('all'); return; }
  _histDateFrom = fromVal ? new Date(fromVal) : null;
  _histDateTo   = toVal   ? new Date(toVal)   : null;
  _historyTimeFilter = 'custom';
  ['all','yesterday','today','week','month','year'].forEach(k => {
    const btn = document.getElementById('hist-t-' + k);
    if (!btn) return;
    btn.style.background  = '#f5f5f5';
    btn.style.color       = '#888';
    btn.style.borderColor = '#e0e0e0';
  });
  _updateHistDateLabel();
  _closeHistDatePanel();
  const list = document.getElementById('history-list');
  if (list) list.innerHTML = '<div style="text-align:center;padding:40px;color:#aaa;">Đang tải...</div>';
  try { await _ensureHistoryDataForFilter(); } catch(e) {}
  _renderHistory();
}

function _getTimeRange(filter, fromDate, toDate) {
  if (filter === 'all') return {};
  const now = new Date();
  let startTs, endTs;
  if (filter === 'today') {
    startTs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    endTs   = startTs + 86400000;
  } else if (filter === 'yesterday') {
    endTs   = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    startTs = endTs - 86400000;
  } else if (filter === 'week') {
    const dow = now.getDay() === 0 ? 6 : now.getDay() - 1;
    startTs = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dow).getTime();
    endTs   = startTs + 7 * 86400000;
  } else if (filter === 'month') {
    startTs = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    endTs   = new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime();
  } else if (filter === 'year') {
    startTs = new Date(now.getFullYear(), 0, 1).getTime();
    endTs   = new Date(now.getFullYear() + 1, 0, 1).getTime();
  } else if (filter === 'custom') {
    if (fromDate) startTs = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate()).getTime();
    if (toDate)   endTs   = new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate() + 1).getTime();
  }
  return { startTs, endTs };
}

async function showReport() {
  if (currentRole !== 'owner') { showToast('Không có quyền truy cập.'); return; }
  showScreen('screen-report');
  _reportTypeFilter = 'all';
  _reportSortMode = 'newest';
  ['report-search'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const _sl = document.getElementById('report-sort-label'); if (_sl) _sl.textContent = 'Mới';
  ['newest','oldest','az','za'].forEach(k => { const b = document.getElementById('rs-'+k); if (b) b.classList.toggle('active', k === 'newest'); });
  _syncReportTypeButtons();
  _syncReportTimeButtons();
  _updateReportDateLabel();

  if (!_historyData.length) {
    try {
      const cached = JSON.parse(localStorage.getItem(_HISTORY_CACHE_KEY) || 'null');
      if (cached && cached.data && cached.range && (Date.now() - cached.ts < 5 * 60 * 1000)) {
        _historyData = cached.data;
        _loadedRange = cached.range;
        _historyStale = false;
      }
    } catch(e) {}
  }

  const list = document.getElementById('report-list');
  const summary = document.getElementById('report-summary');

  if (_historyStale && _historyData.length) {
    renderReport();
    _fetchHistoryData(true, _getCurrentFilterRange()).then(() => {
      if (document.getElementById('screen-report').classList.contains('active')) renderReport();
    }).catch(() => {});
    return;
  }

  if (!_historyData.length) {
    if (list) list.innerHTML = '<div style="text-align:center;padding:40px;color:#aaa;">Đang tải...</div>';
    if (summary) summary.innerHTML = '';
  }

  try {
    await _ensureHistoryDataForFilter();
    renderReport();
  } catch(e) {
    if (list) list.innerHTML = '<div style="text-align:center;padding:40px;color:#f44336;">Không tải được báo cáo.</div>';
  }
}

async function refreshReportData() {
  const list = document.getElementById('report-list');
  const summary = document.getElementById('report-summary');
  if (list) list.innerHTML = '<div style="text-align:center;padding:40px;color:#aaa;">Đang tải...</div>';
  if (summary) summary.innerHTML = '';
  _setRefreshLoading('report-refresh-btn', true);
  try {
    const currentRange = _getCurrentFilterRange();
    await _fetchHistoryData(true, currentRange);
    renderReport();
    showToast('Đã làm mới báo cáo');
  } catch (e) {
    if (list) list.innerHTML = '<div style="text-align:center;padding:40px;color:#f44336;">Không tải được báo cáo.</div>';
    showToast('Không thể làm mới báo cáo');
  } finally {
    _setRefreshLoading('report-refresh-btn', false);
  }
}

function reportTypeFilter(type) {
  _reportTypeFilter = type;
  _syncReportTypeButtons();
  renderReport();
}

function _syncReportTypeButtons() {
  const filterIcons = {
    'all':  `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>`,
    'nhap': `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg>`,
    'xuat': `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>`
  };
  const filterLabels = { 'all': 'Tất cả', 'nhap': 'Nhập', 'xuat': 'Xuất' };
  ['all', 'nhap', 'xuat'].forEach(k => {
    const btn = document.getElementById('report-type-' + k);
    if (btn) {
      const active = _reportTypeFilter === k;
      btn.style.background = active ? '#fff3e0' : '#f5f5f5';
      btn.style.color = active ? '#e65100' : '#888';
      btn.style.borderColor = active ? '#f57c00' : '#e0e0e0';
    }
    const panelBtn = document.getElementById('rtype-' + k);
    if (panelBtn) panelBtn.classList.toggle('active', _reportTypeFilter === k);
  });
  const lbl = document.getElementById('report-type-dd-label');
  if (lbl) {
    const icon = filterIcons[_reportTypeFilter] || filterIcons['all'];
    const text = filterLabels[_reportTypeFilter] || 'Tất cả';
    lbl.innerHTML = `<span style="display:inline-flex;align-items:center;gap:6px;"><span style="display:inline-flex;vertical-align:middle;">${icon}</span><span>${text}</span></span>`;
  }
}

function toggleReportTypePanel(e) {
  if (e) e.stopPropagation();
  const p = document.getElementById('report-type-panel');
  const arrow = document.getElementById('report-type-dd-arrow');
  if (!p) return;
  const open = p.style.display === 'none' || p.style.display === '';
  _closeReportDatePanel(); _closeReportSortPanel();
  p.style.display = open ? 'block' : 'none';
  if (arrow) arrow.style.transform = open ? 'rotate(180deg)' : '';
}

function _closeReportTypePanel() {
  const p = document.getElementById('report-type-panel');
  const arrow = document.getElementById('report-type-dd-arrow');
  if (p) p.style.display = 'none';
  if (arrow) arrow.style.transform = '';
}

let _reportCollapsed = false;
function toggleReportCollapse() {
  _reportCollapsed = !_reportCollapsed;
  const el = document.getElementById('report-collapsible');
  const arrow = document.getElementById('report-collapse-arrow');
  if (el) el.style.display = _reportCollapsed ? 'none' : '';
  if (arrow) arrow.style.transform = _reportCollapsed ? 'rotate(180deg)' : 'rotate(0deg)';
}

function toggleReportDatePanel(e) {
  if (e) e.stopPropagation();
  const panel = document.getElementById('report-date-panel');
  const arrow = document.getElementById('report-date-arrow');
  if (!panel) return;

  const open = panel.style.display === 'none' || panel.style.display === '';
  _closeReportTypePanel(); _closeReportSortPanel();
  panel.style.display = open ? 'block' : 'none';

  if (arrow) {
    // Dùng innerHTML và điều khiển xoay bằng rotate để có hiệu ứng transition
    arrow.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="transition:transform 0.2s; ${open ? 'transform: rotate(180deg);' : ''}"><polyline points="6 9 12 15 18 9"></polyline></svg>`;
  }
}

function _closeReportDatePanel() {
  const panel = document.getElementById('report-date-panel');
  const arrow = document.getElementById('report-date-arrow');
  if (panel) panel.style.display = 'none';

  if (arrow) {
    // Trả mũi tên về trạng thái úp xuống mặc định khi đóng panel
    arrow.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="transition:transform 0.2s;"><polyline points="6 9 12 15 18 9"></polyline></svg>`;
  }
}

function _updateReportDateLabel() {
  const label = document.getElementById('report-date-label');
  const toggle = document.getElementById('report-date-toggle');
  const labels = { all:'Tất cả', yesterday:'Hôm qua', today:'Hôm nay', week:'Tuần này', month:'Tháng này', year:'Năm nay' };
  let text;
  if (_reportTimeFilter === 'custom') {
    const fd = d => d ? d.getDate() + '/' + (d.getMonth() + 1) + '/' + d.getFullYear() : '?';
    text = fd(_reportDateFrom) + ' → ' + fd(_reportDateTo);
  } else {
    text = labels[_reportTimeFilter] || labels.all;
  }
  if (label) label.textContent = text;
  if (toggle) {
    toggle.style.background  = '#e3f2fd';
    toggle.style.color       = '#1976d2';
    toggle.style.borderColor = '#1976d2';
  }
}

function _syncReportTimeButtons() {
  ['all', 'yesterday', 'today', 'week', 'month', 'year'].forEach(k => {
    const btn = document.getElementById('report-t-' + k);
    if (!btn) return;
    const active = _reportTimeFilter === k;
    btn.style.background = active ? '#1976d2' : '#f5f5f5';
    btn.style.color = active ? '#fff' : '#888';
    btn.style.borderColor = active ? '#1976d2' : '#e0e0e0';
  });
}

async function reportTimeFilter(filter) {
  _reportTimeFilter = filter;
  _reportDateFrom = null;
  _reportDateTo = null;
  const fromEl = document.getElementById('report-from-date');
  const toEl = document.getElementById('report-to-date');
  if (fromEl) fromEl.value = '';
  if (toEl) toEl.value = '';
  _syncReportTimeButtons();
  _updateReportDateLabel();
  _closeReportDatePanel();
  const list = document.getElementById('report-list');
  if (list && (_historyStale || !_loadedRange)) {
    list.innerHTML = '<div style="text-align:center;padding:40px;color:#aaa;">Đang tải...</div>';
  }
  try { await _ensureHistoryDataForFilter(); } catch(e) {}
  renderReport();
}

async function reportApplyDateRange() {
  const fromVal = document.getElementById('report-from-date')?.value;
  const toVal = document.getElementById('report-to-date')?.value;
  if (!fromVal && !toVal) { reportTimeFilter('all'); return; }
  _reportDateFrom = fromVal ? new Date(fromVal) : null;
  _reportDateTo = toVal ? new Date(toVal) : null;
  _reportTimeFilter = 'custom';
  _syncReportTimeButtons();
  ['all', 'yesterday', 'today', 'week', 'month', 'year'].forEach(k => {
    const btn = document.getElementById('report-t-' + k);
    if (!btn) return;
    btn.style.background = '#f5f5f5';
    btn.style.color = '#888';
    btn.style.borderColor = '#e0e0e0';
  });
  _updateReportDateLabel();
  _closeReportDatePanel();
  const list = document.getElementById('report-list');
  if (list) list.innerHTML = '<div style="text-align:center;padding:40px;color:#aaa;">Đang tải...</div>';
  try { await _ensureHistoryDataForFilter(); } catch(e) {}
  renderReport();
}

function clearReportFilters() {
  ['report-search', 'report-from-date', 'report-to-date'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  _reportTypeFilter = 'all';
  _reportTimeFilter = 'all';
  _reportDateFrom = null;
  _reportDateTo = null;
  _syncReportTypeButtons();
  _syncReportTimeButtons();
  _updateReportDateLabel();
  reportUpdateFilterClearBtn();
  renderReport();
}

function reportUpdateFilterClearBtn() {
  const val = (document.getElementById('report-search') || {}).value || '';
  const btn = document.getElementById('report-btn-filter-clear');
  if (btn) btn.style.display = val ? 'inline-block' : 'none';
}
function reportClearFilterInput() {
  const el = document.getElementById('report-search');
  if (el) { el.value = ''; el.focus(); }
  reportUpdateFilterClearBtn();
  renderReport();
  const dd = document.getElementById('report-search-history-dropdown');
  if (dd) dd.style.display = 'none';
}
function reportSaveSearchHistory() {
  const val = ((document.getElementById('report-search') || {}).value || '').trim();
  if (!val) return;
  let hist = [];
  try { hist = JSON.parse(localStorage.getItem('searchHistory_report') || '[]'); } catch(e) {}
  hist = hist.filter(function(x) { return x !== val; });
  hist.unshift(val);
  localStorage.setItem('searchHistory_report', JSON.stringify(hist.slice(0, 5)));
}
function reportToggleSearchHistory(e) {
  if (e) { e.preventDefault(); e.stopPropagation(); }
  const dd = document.getElementById('report-search-history-dropdown');
  if (!dd) return;
  if (dd.style.display !== 'none') { dd.style.display = 'none'; return; }
  let hist = [];
  try { hist = JSON.parse(localStorage.getItem('searchHistory_report') || '[]'); } catch(e) {}
  if (!hist.length) return;
  dd.innerHTML = hist.map(function(h) {
    const esc = h.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/'/g,"\\'");
    return `<div onclick="reportApplySearchHistory('${esc}')" style="padding:9px 14px;font-size:13px;cursor:pointer;border-bottom:1px solid #f5f5f5;color:#333;background:#fff;">${h.replace(/&/g,'&amp;').replace(/</g,'&lt;')}</div>`;
  }).join('');
  dd.style.display = 'block';
  setTimeout(function() {
    function closeHist(ev) {
      if (!dd.contains(ev.target) && ev.target.id !== 'report-btn-filter-history') { dd.style.display = 'none'; document.removeEventListener('click', closeHist); }
    }
    document.addEventListener('click', closeHist);
  }, 0);
}
function reportApplySearchHistory(val) {
  const el = document.getElementById('report-search');
  if (el) { el.value = val; el.focus(); }
  const dd = document.getElementById('report-search-history-dropdown');
  if (dd) dd.style.display = 'none';
  reportUpdateFilterClearBtn();
  renderReport();
}

const HIST_SF_LABELS = { all: 'Tất cả', ma: 'Mã SP', ncc: 'NCC', tenkhach: 'Tên khách', hanghoa: 'Tên SP' };
const HIST_SF_PLACEHOLDERS = { all: 'Tìm tên SP, mã, NCC, khách hàng...', ma: 'Tìm theo mã SP...', ncc: 'Tìm theo nhà cung cấp...', tenkhach: 'Tìm theo tên khách...', hanghoa: 'Tìm theo tên SP...' };
const RPT_SF_PLACEHOLDERS = { all: 'Tìm chung (tên SP, mã, NCC, khách...)', ma: 'Tìm theo mã SP...', ncc: 'Tìm theo nhà cung cấp...', tenkhach: 'Tìm theo tên khách...', hanghoa: 'Tìm theo tên SP...' };

function _sfPanelToggle(panelId, btnSelector, e) {
  if (e) { e.preventDefault(); e.stopPropagation(); }
  const panel = document.getElementById(panelId);
  if (!panel) return;
  if (panel.style.display !== 'none') { panel.style.display = 'none'; return; }
  panel.style.display = 'block';
  setTimeout(function() {
    function close(ev) {
      if (!panel.contains(ev.target) && !ev.target.closest(btnSelector)) {
        panel.style.display = 'none';
        document.removeEventListener('click', close, true);
      }
    }
    document.addEventListener('click', close, true);
  }, 0);
}

function _sfSetActive(prefix, field, keys) {
  keys.forEach(function(k) {
    const el = document.getElementById(prefix + k);
    if (el) {
      if (k === field) { el.style.background = '#e8f5e9'; el.style.color = '#2e7d32'; el.style.fontWeight = '700'; }
      else { el.style.background = ''; el.style.color = '#555'; el.style.fontWeight = ''; }
    }
  });
}

function toggleHistSfPanel(e) { _sfPanelToggle('hist-sf-panel', '#hist-sf-btn', e); }
function toggleRptSfPanel(e)  { _sfPanelToggle('rpt-sf-panel',  '#rpt-sf-btn',  e); }

function setHistSearchField(field) {
  histSearchField = field;
  const label = document.getElementById('hist-sf-label');
  if (label) label.textContent = HIST_SF_LABELS[field] || 'Tất cả';
  _sfSetActive('hist-sf-opt-', field, ['all','ma','ncc','tenkhach','hanghoa']);
  const panel = document.getElementById('hist-sf-panel');
  if (panel) panel.style.display = 'none';
  const inp = document.getElementById('hist-search');
  if (inp) inp.placeholder = HIST_SF_PLACEHOLDERS[field] || HIST_SF_PLACEHOLDERS.all;
  _renderHistory();
}

function setRptSearchField(field) {
  reportSearchField = field;
  const label = document.getElementById('rpt-sf-label');
  if (label) label.textContent = HIST_SF_LABELS[field] || 'Tất cả';
  _sfSetActive('rpt-sf-opt-', field, ['all','ma','ncc','tenkhach','hanghoa']);
  const panel = document.getElementById('rpt-sf-panel');
  if (panel) panel.style.display = 'none';
  const inp = document.getElementById('report-search');
  if (inp) inp.placeholder = RPT_SF_PLACEHOLDERS[field] || RPT_SF_PLACEHOLDERS.all;
  renderReport();
}

function _reportFilterRows() {
  let rows = _historyData.filter(r => r.loai !== 'Nháp');
  if (_reportTypeFilter === 'nhap') rows = rows.filter(r => r.loai === 'Nhập');
  else if (_reportTypeFilter === 'xuat') rows = rows.filter(r => r.loai === 'Xuất');

  const { startTs, endTs } = _getTimeRange(_reportTimeFilter, _reportDateFrom, _reportDateTo);
  if (startTs !== undefined || endTs !== undefined) {
    rows = rows.filter(r => (startTs === undefined || r.thoigian_raw >= startTs) && (endTs === undefined || r.thoigian_raw < endTs));
  }

  const rawReportQ = ((document.getElementById('report-search') || {}).value || '').trim();
  const reportQ = removeDiacritics(rawReportQ);
  if (reportQ) {
    const keywords = reportQ.split(/\s+/);
    const rsf = reportSearchField || 'all';
    rows = rows.filter(r => {
      let rowText;
      if (rsf === 'ma') rowText = removeDiacritics(r.ma || '');
      else if (rsf === 'ncc') rowText = removeDiacritics(r.ncc || '');
      else if (rsf === 'tenkhach') rowText = removeDiacritics(r.tenkhach || '');
      else if (rsf === 'hanghoa') rowText = removeDiacritics(r.hanghoa || '');
      else rowText = removeDiacritics([
        r.hanghoa || '', r.ma || '', r.ncc || '', r.tenkhach || '',
        r.kichthuoc || '', r.giaodich || '', r.loai || ''
      ].join(' '));
      return keywords.every(kw => rowText.includes(kw));
    });
  }
  return rows;
}

function _orderPartyName(r) {
  return (r.tenkhach || r.ncc || '').toString().trim();
}

function _orderKey(r) {
  const t = historyTimeKey(r.thoigian || r.thoigian_raw);
  const party = _orderPartyName(r).toLowerCase();
  const loai = (r.loai || '').toString().trim();
  return `${t}||${party}||${loai}`;
}

function _countOrders(rows) {
  return new Set((rows || []).map(_orderKey)).size;
}

function _groupReportEntries(rows, keyBuilder, nameBuilder, rowFilter = null) {
  const map = new Map();
  rows.forEach(r => {
    if (rowFilter && !rowFilter(r)) return;
    const key = keyBuilder(r);
    if (!key) return;
    if (!map.has(key)) {
      map.set(key, { key, name: nameBuilder(r), qty: 0, amount: 0, count: 0, orderSet: new Set(), extra: '', latestTs: 0 });
    }
    const item = map.get(key);
    item.qty += Number(r.soluong) || 0;
    item.amount += (Number(r.soluong) || 0) * (Number(r.gia) || 0);
    item.orderSet.add(_orderKey(r));
    item.count = item.orderSet.size;
    if ((r.thoigian_raw || 0) > item.latestTs) item.latestTs = r.thoigian_raw || 0;
  });
  return [...map.values()].sort((a, b) => b.amount - a.amount || b.qty - a.qty || a.name.localeCompare(b.name, 'vi'));
}

function _renderReportSection(title, color, items, emptyText, type, kw) {
  if (!items.length) {
    return `<div class="report-detail-section"><div style="font-size:13px;font-weight:700;color:${color};margin-bottom:8px;">${title}</div><div style="font-size:13px;color:#999;padding:6px 0;">${emptyText}</div></div>`;
  }
  return `<div class="report-detail-section">
    <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:6px;">
      <div style="font-size:13px;font-weight:700;color:${color};">${title}</div>
      <div style="font-size:11px;color:#999;">${items.length} mục</div>
    </div>
    <div class="report-detail-list">
      ${items.map(item => {
        const idx = _rptDetailData.push({ type, key: item.key, name: item.name }) - 1;
        const _rptTypeField = type === 'ncc' ? 'ncc' : 'tenkhach';
        return `<div class="report-detail-item" onclick="showReportDetail(${idx})" style="cursor:pointer;">
          <div style="min-width:0;">
            <div class="report-detail-name">${hlField(item.name, kw, _rptTypeField, reportSearchField)}</div>
            <div class="report-detail-meta">${item.extra || (item.count + ' đơn')}</div>
          </div>
          <div class="report-detail-value">
            <div class="report-detail-qty">${fmt(item.qty)} SL</div>
            <div class="report-detail-amount">${fmt(item.amount)} đ</div>
          </div>
        </div>`;
      }).join('')}
    </div>
  </div>`;
}

function _renderProductReportSection(rows, kw) {
  const map = new Map();
  rows.forEach(r => {
    const key = [r.ma, r.hanghoa, r.kichthuoc].join('||');
    if (!r.ma && !r.hanghoa) return;
    if (!map.has(key)) {
      map.set(key, { key, name: r.hanghoa || r.ma || 'Không tên', ma: r.ma, kichthuoc: r.kichthuoc, ncc: r.ncc || '',
        nhapQty: 0, nhapAmount: 0, xuatQty: 0, xuatAmount: 0, latestTs: 0 });
    }
    const item = map.get(key);
    if (!item.ncc && r.ncc) item.ncc = r.ncc;
    if (r.loai === 'Nhập') { item.nhapQty += r.soluong; item.nhapAmount += r.soluong * r.gia; }
    else                   { item.xuatQty += r.soluong; item.xuatAmount += r.soluong * r.gia; }
    if ((r.thoigian_raw || 0) > item.latestTs) item.latestTs = r.thoigian_raw || 0;
  });
  const items = _sortReportItems([...map.values()]);
  if (!items.length) {
    return `<div class="report-detail-section"><div style="font-size:13px;font-weight:700;color:#2e7d32;margin-bottom:8px;">Sản phẩm</div><div style="font-size:13px;color:#999;padding:6px 0;">Không có dữ liệu sản phẩm trong bộ lọc này.</div></div>`;
  }
  return `<div class="report-detail-section">
    <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:6px;">
      <div style="font-size:13px;font-weight:700;color:#2e7d32;">Sản phẩm</div>
      <div style="font-size:11px;color:#999;">${items.length} mục</div>
    </div>
    <div class="report-detail-list">
      ${items.map(item => {
        const _rsf = reportSearchField || 'all';
        const metaHtml = [
          item.ma ? hlField(item.ma, kw, 'ma', _rsf) : '',
          item.kichthuoc ? (_rsf === 'all' ? highlightText(item.kichthuoc, kw) : item.kichthuoc) : ''
        ].filter(Boolean).join(' · ');
        const nhapLine = item.nhapQty > 0 ? `<div style="font-size:13px;color:#388e3c;white-space:nowrap;">Nhập: ${fmt(item.nhapQty)} | ${fmt(item.nhapAmount)}đ</div>` : '';
        const xuatLine = item.xuatQty > 0 ? `<div style="font-size:13px;color:#c62828;white-space:nowrap;">Xuất: ${fmt(item.xuatQty)} | ${fmt(item.xuatAmount)}đ</div>` : '';
        const idx = _rptDetailData.push({ type: 'sp', key: item.key, name: item.name, ma: item.ma, ncc: item.ncc, kichthuoc: item.kichthuoc }) - 1;
        return `<div class="report-detail-item" onclick="showReportDetail(${idx})" style="cursor:pointer;">
          <div style="min-width:0;flex:1;">
            <div class="report-detail-name">${hlField(item.name, kw, 'hanghoa', _rsf)}${item.ncc ? ` <span style="color:#1565c0;font-weight:500;">· ${hlField(item.ncc, kw, 'ncc', _rsf)}</span>` : ''}</div>
            ${metaHtml ? `<div class="report-detail-meta">${metaHtml}</div>` : ''}
          </div>
          <div style="text-align:right;flex-shrink:0;">${nhapLine}${xuatLine}</div>
        </div>`;
      }).join('')}
    </div>
  </div>`;
}

function _buildReportOrderGroups(rows) {
  const map = new Map();
  rows.forEach(r => {
    const key = _orderKey(r);
    if (!map.has(key)) {
      map.set(key, {
        key,
        rows: [],
        thoigian: r.thoigian,
        thoigian_raw: r.thoigian_raw,
        loai: r.loai,
        ncc: r.ncc || '',
        tenkhach: r.tenkhach || '',
        giaodich: r.giaodich || ''
      });
    }
    const g = map.get(key);
    g.rows.push(r);
    if (!g.ncc && r.ncc) g.ncc = r.ncc;
    if (!g.tenkhach && r.tenkhach) g.tenkhach = r.tenkhach;
    if (!g.giaodich && r.giaodich) g.giaodich = r.giaodich;
  });
  return [...map.values()].sort((a, b) => {
    if (_reportSortMode === 'oldest') return a.thoigian_raw - b.thoigian_raw;
    return b.thoigian_raw - a.thoigian_raw;
  });
}

function _calcReportOrderTotals(g) {
  const rows = g.rows || [];
  const hang = rows.reduce((s, r) => s + (Number(r.soluong) || 0) * (Number(r.gia) || 0), 0);
  const qty = rows.reduce((s, r) => s + (Number(r.soluong) || 0), 0);
  const phiVC = Math.abs(Number(rows[0]?.phichanh) || 0);
  const phiKT = Number(rows[0]?.phikhachtra) || 0;
  const total = g.loai === 'Nhập' ? (hang + phiVC) : (hang - (phiVC - phiKT));
  return { hang, qty, phiVC, phiKT, total };
}

function _renderReportOrderDetail(g) {
  const list = document.getElementById('rpt-detail-list');
  if (!list || !g) return;

  const isNhap = g.loai === 'Nhập';
  const color = isNhap ? '#1976d2' : '#c62828';
  const totals = _calcReportOrderTotals(g);
  const partyLines = [
    isNhap && g.ncc ? `<div class="info-row"><span class="info-label">Nhà cung cấp</span><span class="info-value">${g.ncc}</span></div>` : '',
    g.tenkhach ? `<div class="info-row"><span class="info-label">Khách hàng</span><span class="info-value">${g.tenkhach}</span></div>` : ''
  ].join('');

  list.innerHTML = `<div class="report-detail-section">
    <div style="background:#fafafa;border:1px solid #eee;border-radius:12px;padding:10px;margin-bottom:10px;">
      <div class="info-row"><span class="info-label">Thời gian</span><span class="info-value">${formatHistoryTimeText(g)}</span></div>
      <div class="info-row"><span class="info-label">Loại</span><span class="info-value" style="color:${color};font-weight:700;">${g.loai}</span></div>
      ${partyLines}
      ${g.giaodich ? `<div class="info-row"><span class="info-label">Giao dịch</span><span class="info-value">${g.giaodich}</span></div>` : ''}
      <div class="info-row"><span class="info-label">Tổng tiền</span><span class="info-value" style="font-weight:700;color:#333;">${fmt(totals.total)} đ</span></div>
      ${totals.phiVC > 0 ? `<div class="info-row"><span class="info-label">Phí vận chuyển</span><span class="info-value" style="font-weight:600;color:#d32f2f;">${isNhap ? '+' : '-'} ${fmt(totals.phiVC)} đ</span></div>` : ''}
      ${totals.phiKT > 0 ? `<div class="info-row"><span class="info-label">Phí KT</span><span class="info-value" style="font-weight:600;color:#2e7d32;">+ ${fmt(totals.phiKT)} đ</span></div>` : ''}
    </div>
    <div class="report-detail-list">
      ${g.rows.map(function(r, i) {
        const sub = (Number(r.soluong) || 0) * (Number(r.gia) || 0);
        const meta = [r.ncc, r.ma, r.kichthuoc].filter(Boolean).join(' · ');
        return `<div class="report-detail-item" style="cursor:default;">
          <div style="min-width:0;flex:1;">
            <div style="font-size:11px;color:#999;font-weight:600;margin-bottom:3px;">SP #${i + 1}</div>
            <div class="report-detail-name">${r.hanghoa || '—'}</div>
            ${meta ? `<div class="report-detail-meta">${meta}</div>` : ''}
          </div>
          <div style="text-align:right;flex-shrink:0;">
            <div style="font-size:11px;color:#666;">${fmt(r.soluong)} × ${fmt(r.gia)}đ</div>
            <div style="font-size:13px;font-weight:600;color:${isNhap ? '#0d47a1' : '#e65100'};">${fmt(sub)}đ</div>
          </div>
        </div>`;
      }).join('')}
    </div>
  </div>`;
}

function showReportOrderDetail(idx) {
  const g = _rptDetailOrderData[idx];
  if (!g) return;
  _rptDetailView = 'order';
  sessionStorage.setItem('rptDetailView', 'order');
  sessionStorage.setItem('rptDetailOrderKey', g.key || '');
  _renderReportOrderDetail(g);
}

function reportDetailBack() {
  if (_rptDetailView === 'order' && _rptCurrentDetailIdx >= 0 && _rptDetailOrderData.length > 1) {
    showReportDetail(_rptCurrentDetailIdx);
    return;
  }
  _rptDetailView = '';
  _rptCurrentDetailIdx = -1;
  showReport();
}

function _restoreReportDetailAfterReload(item) {
  const savedView = sessionStorage.getItem('rptDetailView') || '';
  const savedOrderKey = sessionStorage.getItem('rptDetailOrderKey') || '';
  _rptDetailData = [item];
  showReportDetail(0);
  if (savedView === 'order' && savedOrderKey) {
    const idx = _rptDetailOrderData.findIndex(g => g.key === savedOrderKey);
    if (idx >= 0) showReportOrderDetail(idx);
  }
}

function showReportDetail(idx) {
  const item = _rptDetailData[idx];
  if (!item) return;
  _rptCurrentDetailIdx = idx;

  const titleEl = document.getElementById('rpt-detail-title');
  if (titleEl) {
    if (item.type === 'sp') {
      const sub = [item.ncc, item.ma, item.kichthuoc].filter(Boolean).join(' · ');
      titleEl.innerHTML = `<div style="font-size:15px;font-weight:700;color:#333;">${item.name}</div>`
        + (sub ? `<div style="font-size:11px;font-weight:400;color:#777;margin-top:3px;">${sub}</div>` : '');
    } else {
      titleEl.textContent = item.name;
    }
  }

  const rows = _reportFilterRows().filter(function(r) {
    if (item.type === 'ncc')   return r.loai === 'Nhập' && r.ncc.trim() === item.key;
    if (item.type === 'khach') return r.loai === 'Xuất' && r.tenkhach.trim() === item.key;
    if (item.type === 'sp')    return [r.ma, r.hanghoa, r.kichthuoc].join('||') === item.key;
    return false;
  }).sort(function(a, b) {
    if (_reportSortMode === 'oldest') return a.thoigian_raw - b.thoigian_raw;
    if (_reportSortMode === 'az') return (a.hanghoa||'').localeCompare(b.hanghoa||'', 'vi');
    if (_reportSortMode === 'za') return (b.hanghoa||'').localeCompare(a.hanghoa||'', 'vi');
    return b.thoigian_raw - a.thoigian_raw;
  });

  const list = document.getElementById('rpt-detail-list');
  if (!list) return;

  if (!rows.length) {
    _rptDetailView = 'empty';
    sessionStorage.setItem('rptDetailView', 'empty');
    sessionStorage.removeItem('rptDetailOrderKey');
    list.innerHTML = '<div style="text-align:center;padding:40px;color:#999;">Không có dữ liệu.</div>';
  } else if (item.type === 'ncc' || item.type === 'khach') {
    const groups = _buildReportOrderGroups(rows);
    _rptDetailOrderData = groups;
    if (groups.length === 1) {
      _rptDetailView = 'order';
      sessionStorage.setItem('rptDetailView', 'order');
      sessionStorage.setItem('rptDetailOrderKey', groups[0].key || '');
      _renderReportOrderDetail(groups[0]);
    } else {
      _rptDetailView = 'orders';
      sessionStorage.setItem('rptDetailView', 'orders');
      sessionStorage.removeItem('rptDetailOrderKey');
      const typeColor = item.type === 'ncc' ? '#1976d2' : '#8e24aa';
      let html = '<div class="report-detail-section"><div class="report-detail-list">';
      html += groups.map(function(g, i) {
        const totals = _calcReportOrderTotals(g);
        const partyMeta = item.type === 'khach'
          ? (g.tenkhach || '')
          : (g.ncc || '');
        const feeLine = [
          totals.phiVC > 0 ? `Phí vận chuyển: ${g.loai === 'Nhập' ? '+' : '-'}${fmt(totals.phiVC)} đ` : '',
          totals.phiKT > 0 ? `Phí KT: +${fmt(totals.phiKT)} đ` : ''
        ].filter(Boolean).join(' · ');
        return `<div class="report-detail-item" onclick="showReportOrderDetail(${i})" style="cursor:pointer;">
          <div style="min-width:0;flex:1;">
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:2px;">
              <span style="font-size:10px;font-weight:700;padding:2px 7px;border-radius:20px;background:${g.loai === 'Nhập' ? '#e8f5e9' : '#ffebee'};color:${g.loai === 'Nhập' ? '#2e7d32' : '#c62828'};">${g.loai}</span>
              <span style="font-size:11px;color:#999;">${formatHistoryTimeText(g)}</span>
            </div>
            ${partyMeta ? `<div class="report-detail-name">${partyMeta}</div>` : ''}
          </div>
          <div class="report-detail-value">
            <div class="report-detail-qty">${fmt(totals.qty)} SL</div>
            <div class="report-detail-amount" style="font-weight:700;color:${typeColor};">${fmt(totals.total)} đ</div>
            ${feeLine ? `<div class="report-detail-meta" style="font-size:11px;color:#e53935;text-align:right;margin-top:3px;">${feeLine}</div>` : ''}
          </div>
        </div>`;
      }).join('');
      html += '</div></div>';
      list.innerHTML = html;
    }
  } else {
    _rptDetailView = 'product';
    sessionStorage.setItem('rptDetailView', 'product');
    sessionStorage.removeItem('rptDetailOrderKey');
    // VẪN TÍNH TOÁN TỔNG CHI TIẾT ĐỂ HIỆN Ở DƯỚI
    let sumQty = 0, sumHang = 0, sumPhiVC = 0, sumPhiKT = 0;
    rows.forEach(r => {
      sumQty += r.soluong;
      sumHang += r.soluong * r.gia;
      sumPhiVC += Math.abs(r.phichanh || 0);
      sumPhiKT += (r.phikhachtra || 0);
    });

    let html = '<div class="report-detail-section"><div class="report-detail-list">';

    // RENDER TỪNG DÒNG (ĐÃ XÓA PHÍ VẬN CHUYỂN VÀ PHÍ KHÁCH TRẢ)
    html += rows.map(function(r) {
      const isNhap = r.loai === 'Nhập';
      const totalHangRow = r.soluong * r.gia;
      const badge = `<span style="font-size:10px;font-weight:700;padding:2px 7px;border-radius:20px;background:${isNhap?'#e8f5e9':'#ffebee'};color:${isNhap?'#2e7d32':'#c62828'};">${r.loai}</span>`;
      let subLabel = '', subMeta = '';
      if (item.type === 'sp') {
        subLabel = isNhap ? (r.ncc || '—') : (r.tenkhach || '—');
      } else if (item.type === 'ncc') {
        subLabel = r.hanghoa || '—';
        subMeta = [r.ma, r.kichthuoc].filter(Boolean).join(' · ');
      } else if (item.type === 'khach') {
        subLabel = r.hanghoa || '—';
        subMeta = [r.ncc, r.ma, r.kichthuoc].filter(Boolean).join(' · ');
      }

      return `<div class="report-detail-item" style="cursor:default;">
        <div style="min-width:0;flex:1;">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:2px;">${badge}<span style="font-size:11px;color:#999;">${r.thoigian||''}</span></div>
          <div class="report-detail-name">${subLabel||'—'}</div>
          ${subMeta ? `<div class="report-detail-meta">${subMeta}</div>` : ''}
        </div>
        <div style="text-align:right;flex-shrink:0;">
          <div style="font-size:11px;color:#666;">${fmt(r.soluong)} × ${fmt(r.gia)}đ</div>
          <div style="font-size:13px;font-weight:600;color:${isNhap?'#0d47a1':'#e65100'};">${fmt(totalHangRow)}đ</div>
          </div>
      </div>`;
    }).join('');

    html += '</div>'; // Đóng report-detail-list

    // PHẦN TỔNG CHI TIẾT Ở CUỐI (GIỮ NGUYÊN ĐỂ XEM TỔNG PHÍ)
    html += `
      <div style="margin-top:12px;padding-top:10px;border-top:1.5px solid #eee;font-size:14px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px;color:#666;font-weight:700;">
          <span>Tổng hàng (${fmt(sumQty)} SL):</span>
          <span style="font-weight:700;color:#333;">${fmt(sumHang)} đ</span>
        </div>
        ${sumPhiVC > 0 ? `<div style="display:flex;justify-content:space-between;margin-bottom:4px;color:#666;font-weight:700;">
          <span>Tổng Phí vận chuyển:</span>
          <span style="font-weight:700;color:#d32f2f;">- ${fmt(sumPhiVC)} đ</span>
        </div>` : ''}
        ${sumPhiKT > 0 ? `<div style="display:flex;justify-content:space-between;margin-bottom:4px;color:#666;font-weight:700;">
          <span>Tổng Phí khách trả:</span>
          <span style="font-weight:700;color:#2e7d32;">+ ${fmt(sumPhiKT)} đ</span>
        </div>` : ''}
      </div>`;

    html += '</div>'; // Đóng report-detail-section
    list.innerHTML = html;
  }

  sessionStorage.setItem('rptDetailItem', JSON.stringify({ type: item.type, key: item.key, name: item.name, ma: item.ma||'', ncc: item.ncc||'', kichthuoc: item.kichthuoc||'' }));
  showScreen('screen-report-detail');
}

let _rptNhapRows = [], _rptXuatRows = [];
let _pfHide = { nhapVC: false, xuatVC: false, xuatKT: false };
let _gdHide = { nhap_vc: false, xuat_vc: false, xuat_kt: false };
let _rptSecOpen = { ncc: true, khach: true, sp: true };

function showRptGdDetail(loai) {
  const rows = loai === 'nhap' ? _rptNhapRows : _rptXuatRows;
  const title = loai === 'nhap' ? 'Chi tiết Nhập theo giao dịch' : 'Chi tiết Xuất theo giao dịch';
  const hideVC = loai === 'nhap' ? _gdHide.nhap_vc : _gdHide.xuat_vc;
  const hideKT = loai === 'xuat' && _gdHide.xuat_kt;
  const gdMap = {};
  const total = { qty: 0, count: 0, amount: 0 };
  const totalOrderSet = new Set();
  rows.forEach(r => {
    const qty = Number(r.soluong) || 0;
    const amount = qty * (Number(r.gia) || 0);
    const phiVC = Math.abs(Number(r.phichanh) || 0);
    const phiKT = Math.abs(Number(r.phikhachtra) || 0);
    const effVC = hideVC ? 0 : phiVC;
    const effKT = hideKT ? 0 : phiKT;
    const amountWithFee = loai === 'nhap' ? (amount + effVC) : (amount - (effVC - effKT));
    const gd = (r.giaodich || '').trim() || 'Không rõ';
    if (!gdMap[gd]) gdMap[gd] = { qty: 0, count: 0, amount: 0, phiVC: 0, phiKT: 0, phiVCDon: 0, phiKTDon: 0, orderSet: new Set() };
    gdMap[gd].qty += qty;
    gdMap[gd].amount += amountWithFee;
    gdMap[gd].phiVC += phiVC;
    gdMap[gd].phiKT += phiKT;
    if (phiVC > 0) gdMap[gd].phiVCDon += 1;
    if (phiKT > 0) gdMap[gd].phiKTDon += 1;
    const ok = _orderKey(r);
    gdMap[gd].orderSet.add(ok);
    totalOrderSet.add(ok);
    total.qty += qty;
    total.amount += amountWithFee;
  });
  total.count = totalOrderSet.size;
  Object.values(gdMap).forEach(v => { v.count = v.orderSet.size; delete v.orderSet; });
  const color = loai === 'nhap' ? '#2e7d32' : '#e53935';
  const entries = Object.entries(gdMap).sort((a, b) => b[1].amount - a[1].amount);
  const _eOpen = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
  const _eOff = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;
  const vcAct = loai === 'nhap' ? `_gdHide.nhap_vc=!_gdHide.nhap_vc;showRptGdDetail('nhap')` : `_gdHide.xuat_vc=!_gdHide.xuat_vc;showRptGdDetail('xuat')`;
  const ktAct = `_gdHide.xuat_kt=!_gdHide.xuat_kt;showRptGdDetail('xuat')`;
  const eyeVC = `<button onclick="${vcAct}" style="background:none;border:none;cursor:pointer;padding:0 0 0 7px;display:inline-flex;align-items:center;color:${hideVC ? '#bbb' : '#aaa'};">${hideVC ? _eOff : _eOpen}</button>`;
  const eyeKT = `<button onclick="${ktAct}" style="background:none;border:none;cursor:pointer;padding:0 0 0 7px;display:inline-flex;align-items:center;color:${hideKT ? '#bbb' : '#aaa'};">${hideKT ? _eOff : _eOpen}</button>`;
  const html = '<div style="display:flex;flex-direction:column;margin-top:10px;text-align:left;">' +
    entries.map(([gd, v]) =>
      `<div style="display:flex;justify-content:space-between;align-items:flex-start;padding:10px 0;border-bottom:1px solid #f0f0f0;gap:6px;">
        <div style="min-width:0;flex:1;">
          <div style="font-size:clamp(11px,3.35vw,13px);font-weight:600;color:#333;white-space:nowrap;">${_esc(gd)} (${fmt(v.qty)} SL · ${v.count} đơn)</div>
          ${v.phiVC > 0 ? `<div style="font-size:12px;color:${hideVC ? '#bbb' : '#666'};line-height:1.35;margin-top:2px;display:flex;align-items:center;">Phí vận chuyển | ${v.phiVCDon} đơn${eyeVC}</div>` : ''}
          ${v.phiKT > 0 ? `<div style="font-size:12px;color:${hideKT ? '#bbb' : '#666'};line-height:1.35;display:flex;align-items:center;">Phí khách trả | ${v.phiKTDon} đơn${eyeKT}</div>` : ''}
        </div>
        <div style="text-align:right;flex-shrink:0;">
          <div style="font-size:12px;font-weight:600;color:${color};white-space:nowrap;">${fmt(v.amount)} đ</div>
          ${v.phiVC > 0 ? `<div style="font-size:12px;color:${hideVC ? '#bbb' : color};line-height:1.35;margin-top:2px;white-space:nowrap;${hideVC ? 'text-decoration:line-through;' : ''}">${loai === 'xuat' ? '-' : '+'}${fmt(v.phiVC)} đ</div>` : ''}
          ${v.phiKT > 0 ? `<div style="font-size:12px;color:${hideKT ? '#bbb' : color};line-height:1.35;white-space:nowrap;${hideKT ? 'text-decoration:line-through;' : ''}">+${fmt(v.phiKT)} đ</div>` : ''}
        </div>
      </div>`
    ).join('') +
    (entries.length ? `<div style="display:flex;justify-content:space-between;align-items:center;padding:11px 0 12px;background:#fff;border-top:1px solid #e0e0e0;margin-top:0;gap:6px;">
        <div style="font-size:14px;font-weight:700;color:#333;flex:1;min-width:0;">Tổng (${fmt(total.qty)} SL · ${total.count} đơn)</div>
        <div style="font-size:14px;font-weight:700;color:${color};white-space:nowrap;text-align:right;flex-shrink:0;">${fmt(total.amount)} đ</div>
      </div>` : '') + '</div>';
  showInfoModal(title, entries.length ? html : '<div style="color:#999;font-size:13px;">Không có dữ liệu.</div>', ['_']);
}

function showProfitDetail() {
  const nhap = _rptNhapRows || [];
  const xuat = _rptXuatRows || [];

  const sum = (arr, fn) => arr.reduce((s, r) => s + fn(r), 0);

  // ===== NHẬP =====
  const nhapQty = sum(nhap, r => Number(r.soluong) || 0);
  const nhapDon = _countOrders(nhap);
  const nhapPhi = sum(nhap, r => Math.abs(Number(r.phichanh)||0));
  const nhapPhiDon = nhap.filter(r => Math.abs(Number(r.phichanh) || 0) > 0).length;
  const nhapTienHang = sum(nhap, r => (Number(r.soluong)||0)*(Number(r.gia)||0));
  const nhapPhiEff = _pfHide.nhapVC ? 0 : nhapPhi;
  const nhapTien = nhapTienHang + nhapPhiEff;
  const nhapTM = sum(nhap, r => r.giaodich === 'Tiền mặt' ? (Number(r.soluong)||0)*(Number(r.gia)||0) : 0);
  const nhapCK = sum(nhap, r => r.giaodich === 'Chuyển khoản' ? (Number(r.soluong)||0)*(Number(r.gia)||0) : 0);
  const nhapBoth = sum(nhap, r => r.giaodich?.includes('Tiền mặt + Chuyển khoản') ? (Number(r.soluong)||0)*(Number(r.gia)||0) : 0);
  const nhapKhac = nhapTienHang - nhapTM - nhapCK - nhapBoth;

  const nhapTMQty = sum(nhap, r => r.giaodich === 'Tiền mặt' ? Number(r.soluong)||0 : 0);
  const nhapTMDon = _countOrders(nhap.filter(r => r.giaodich === 'Tiền mặt'));
  const nhapCKQty = sum(nhap, r => r.giaodich === 'Chuyển khoản' ? Number(r.soluong)||0 : 0);
  const nhapCKDon = _countOrders(nhap.filter(r => r.giaodich === 'Chuyển khoản'));
  const nhapBothQty = sum(nhap, r => r.giaodich?.includes('Tiền mặt + Chuyển khoản') ? Number(r.soluong)||0 : 0);
  const nhapBothDon = _countOrders(nhap.filter(r => r.giaodich?.includes('Tiền mặt + Chuyển khoản')));
  const nhapKhacQty = nhapQty - nhapTMQty - nhapCKQty - nhapBothQty;
  const nhapKhacDon = nhapDon - nhapTMDon - nhapCKDon - nhapBothDon;

  // ===== XUẤT =====
  const xuatQty = sum(xuat, r => Number(r.soluong) || 0);
  const xuatDon = _countOrders(xuat);
  const xuatTienHang = sum(xuat, r => (Number(r.soluong)||0)*(Number(r.gia)||0));
  const xuatPhiVC = sum(xuat, r => Math.abs(Number(r.phichanh)||0));
  const xuatPhiKT = sum(xuat, r => Number(r.phikhachtra)||0);
  const xuatPhiVCDon = xuat.filter(r => Math.abs(Number(r.phichanh) || 0) > 0).length;
  const xuatPhiKTDon = xuat.filter(r => Math.abs(Number(r.phikhachtra) || 0) > 0).length;
  const xuatPhiVCEff = _pfHide.xuatVC ? 0 : xuatPhiVC;
  const xuatPhiKTEff = _pfHide.xuatKT ? 0 : xuatPhiKT;
  const xuatPhi = xuatPhiVCEff - xuatPhiKTEff;
  const xuatTien = xuatTienHang - xuatPhi;
  const xuatTM = sum(xuat, r => r.giaodich === 'Tiền mặt' ? (Number(r.soluong)||0)*(Number(r.gia)||0) : 0);
  const xuatCK = sum(xuat, r => r.giaodich === 'Chuyển khoản' ? (Number(r.soluong)||0)*(Number(r.gia)||0) : 0);
  const xuatBoth = sum(xuat, r => r.giaodich?.includes('Tiền mặt + Chuyển khoản') ? (Number(r.soluong)||0)*(Number(r.gia)||0) : 0);
  const xuatKhac = xuatTienHang - xuatTM - xuatCK - xuatBoth;

  const xuatTMQty = sum(xuat, r => r.giaodich === 'Tiền mặt' ? Number(r.soluong)||0 : 0);
  const xuatTMDon = _countOrders(xuat.filter(r => r.giaodich === 'Tiền mặt'));
  const xuatCKQty = sum(xuat, r => r.giaodich === 'Chuyển khoản' ? Number(r.soluong)||0 : 0);
  const xuatCKDon = _countOrders(xuat.filter(r => r.giaodich === 'Chuyển khoản'));
  const xuatBothQty = sum(xuat, r => r.giaodich?.includes('Tiền mặt + Chuyển khoản') ? Number(r.soluong)||0 : 0);
  const xuatBothDon = _countOrders(xuat.filter(r => r.giaodich?.includes('Tiền mặt + Chuyển khoản')));
  const xuatKhacQty = xuatQty - xuatTMQty - xuatCKQty - xuatBothQty;
  const xuatKhacDon = xuatDon - xuatTMDon - xuatCKDon - xuatBothDon;

  const totalProfit = xuatTien - nhapTien;

  // ===== BUILD HTML (chỉ hiện cái có dữ liệu) =====
  const hasData = (...vals) => vals.some(v => Math.abs(Number(v) || 0) > 0.000001);
  const _eOpen = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
  const _eOff = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;
  const row = (label, val, bold=false, ...dataVals) => hasData(val, ...dataVals) ? `<div style="display:flex;justify-content:space-between;padding:2px 0;"><span style="${bold?'font-size:12.5px;font-weight:700;color:#555;':'color:#888;'}">${label}</span><span style="${bold?'font-size:12.5px;font-weight:700;color:#555;':(val<0?'color:#e53935;font-weight:600;':'color:#666;font-weight:600;')}">${fmt(val)} đ</span></div>` : '';
  const feeRow = (label, rawVal, hidden, act, ...dataVals) => {
    if (!hasData(rawVal, ...dataVals)) return '';
    const eye = `<button onclick="${act}" style="background:none;border:none;cursor:pointer;padding:0 0 0 7px;display:inline-flex;align-items:center;color:${hidden ? '#bbb' : '#aaa'};">${hidden ? _eOff : _eOpen}</button>`;
    const lStyle = `color:${hidden ? '#bbb' : '#888'};display:flex;align-items:center;`;
    const vStyle = hidden ? 'color:#bbb;font-weight:600;text-decoration:line-through;' : (rawVal < 0 ? 'color:#e53935;font-weight:600;' : 'color:#666;font-weight:600;');
    return `<div style="display:flex;justify-content:space-between;align-items:center;padding:2px 0;"><span style="${lStyle}">${label}${eye}</span><span style="${vStyle}">${fmt(rawVal)} đ</span></div>`;
  };
  const nhapRowsHtml = [
    row(`Tổng nhập (${fmt(nhapQty)} SL · ${nhapDon} đơn)`, nhapTien, true, nhapQty, nhapDon),
    feeRow(`Phí vận chuyển | ${nhapPhiDon} đơn`, nhapPhi, _pfHide.nhapVC, "_pfHide.nhapVC=!_pfHide.nhapVC;showProfitDetail()", nhapPhiDon),
    row(`Tiền mặt | ${fmt(nhapTMQty)} SL · ${nhapTMDon} đơn`, nhapTM, false, nhapTMQty, nhapTMDon),
    row(`Chuyển khoản | ${fmt(nhapCKQty)} SL · ${nhapCKDon} đơn`, nhapCK, false, nhapCKQty, nhapCKDon),
    row(`TM + CK | ${fmt(nhapBothQty)} SL · ${nhapBothDon} đơn`, nhapBoth, false, nhapBothQty, nhapBothDon),
    row(`Không rõ | ${fmt(nhapKhacQty)} SL · ${nhapKhacDon} đơn`, nhapKhac, false, nhapKhacQty, nhapKhacDon)
  ].join('');
  const xuatRowsHtml = [
    row(`Tổng xuất (${fmt(xuatQty)} SL · ${xuatDon} đơn)`, xuatTien, true, xuatQty, xuatDon),
    feeRow(`Phí vận chuyển | ${xuatPhiVCDon} đơn`, -xuatPhiVC, _pfHide.xuatVC, "_pfHide.xuatVC=!_pfHide.xuatVC;showProfitDetail()", xuatPhiVC, xuatPhiVCDon),
    feeRow(`Phí khách trả | ${xuatPhiKTDon} đơn`, xuatPhiKT, _pfHide.xuatKT, "_pfHide.xuatKT=!_pfHide.xuatKT;showProfitDetail()", xuatPhiKT, xuatPhiKTDon),
    row(`Tiền mặt | ${fmt(xuatTMQty)} SL · ${xuatTMDon} đơn`, xuatTM, false, xuatTMQty, xuatTMDon),
    row(`Chuyển khoản | ${fmt(xuatCKQty)} SL · ${xuatCKDon} đơn`, xuatCK, false, xuatCKQty, xuatCKDon),
    row(`TM + CK | ${fmt(xuatBothQty)} SL · ${xuatBothDon} đơn`, xuatBoth, false, xuatBothQty, xuatBothDon),
    row(`Không rõ | ${fmt(xuatKhacQty)} SL · ${xuatKhacDon} đơn`, xuatKhac, false, xuatKhacQty, xuatKhacDon)
  ].join('');

    const html = `
    <div style="display:flex;flex-direction:column;gap:14px;text-align:left;">

    <!-- NHẬP -->
    ${nhapRowsHtml ? `<div>
        <div style="border-top:1px solid #eee;padding-top:8px;margin-top:1px;padding-top:10px;margin-bottom:6px;font-size:15px;font-weight:700;color:#2e7d32;margin-bottom:4px;">NHẬP</div>
        <div style="display:flex;flex-direction:column;gap:4px;">
        ${nhapRowsHtml}
     </div>
    </div>` : ''}

    <!-- XUẤT -->
    ${xuatRowsHtml ? `<div>
        <div style="border-top:1px solid #eee;padding-top:8px;margin-top:4px;padding-top:10px;margin-bottom:6px;font-size:15px;font-weight:700;color:#c62828;margin-bottom:4px;">XUẤT</div>
        <div style="display:flex;flex-direction:column;gap:4px;">
        ${xuatRowsHtml}
     </div>
    </div>` : ''}

    <!-- LỢI NHUẬN -->
    <div style="border-top:1px solid #eee;padding-top:8px;margin-top:4px;">
        <div style="display:flex;font-size:16px;justify-content:space-between;font-weight:700;color:#1D4ED8;"><span>Lợi nhuận</span><span>${fmt(totalProfit)} đ</span>
        </div>
    </div>

    </div>
    `;

  showInfoModal('Chi tiết lợi nhuận', html, ['_']);
}

function _toggleRptSec(id) {
  _rptSecOpen[id] = !_rptSecOpen[id];
  const body = document.getElementById('rpt-sec-body-' + id);
  const arrow = document.getElementById('rpt-sec-arrow-' + id);
  if (body) body.style.display = _rptSecOpen[id] ? 'block' : 'none';
  if (arrow) arrow.style.transform = _rptSecOpen[id] ? 'rotate(0deg)' : 'rotate(-90deg)';
}

function _rptSecBlock(id, title, color, count, bodyHtml) {
  const open = _rptSecOpen[id] !== false;
  const arrowSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;transition:transform .25s;transform:${open ? 'rotate(0deg)' : 'rotate(-90deg)'}" id="rpt-sec-arrow-${id}"><polyline points="6 9 12 15 18 9"/></svg>`;
  return `<div style="margin-bottom:10px;">
    <div onclick="_toggleRptSec('${id}')" style="position:sticky;top:0;z-index:5;width:100%;display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:#fff;border:1px solid #e0e0e0;border-radius:12px;cursor:pointer;user-select:none;box-sizing:border-box;">
      <span style="font-size:14px;font-weight:700;color:${color};">${title}</span>
      <div style="display:flex;align-items:center;gap:6px;">
        <span id="rpt-sec-cnt-${id}" style="font-size:12px;color:#999;font-weight:400;">${count} mục</span>
        <span style="color:#aaa;">${arrowSvg}</span>
      </div>
    </div>
    <div id="rpt-sec-body-${id}" style="display:${open ? 'block' : 'none'};">
      <div class="report-detail-section" style="margin-top:6px;margin-bottom:0;">
        ${bodyHtml}
      </div>
    </div>
  </div>`;
}

function renderReport() {
  _rptDetailData = [];
  _rptDetailOrderData = [];
  _rptCurrentDetailIdx = -1;
  _rptDetailView = '';
  const list = document.getElementById('report-list');
  const summary = document.getElementById('report-summary');
  if (!list || !summary) return;

  const rows = _reportFilterRows();
  const nhapRows = rows.filter(r => r.loai === 'Nhập');
  const xuatRows = rows.filter(r => r.loai === 'Xuất');
  const totalNhapQty = nhapRows.reduce((s, r) => s + (Number(r.soluong) || 0), 0);
  const totalXuatQty = xuatRows.reduce((s, r) => s + (Number(r.soluong) || 0), 0);
  const nhapPhiVC  = nhapRows.reduce((s, r) => s + Math.abs(Number(r.phichanh) || 0), 0);
  const nhapPhiChanh = nhapPhiVC; // Nhập không có phiKT
  const xuatPhiVC  = xuatRows.reduce((s, r) => s + Math.abs(Number(r.phichanh) || 0), 0);
  const xuatPhiKT  = xuatRows.reduce((s, r) => s + (Number(r.phikhachtra) || 0), 0);
  const xuatPhiChanh = xuatPhiVC - xuatPhiKT; // Phí net = |phiVC| - phiKT (KT là khách bù)
  const totalNhapAmount = nhapRows.reduce((s, r) => s + (Number(r.soluong) || 0) * (Number(r.gia) || 0), 0) + nhapPhiVC;
  const totalXuatAmount = xuatRows.reduce((s, r) => s + (Number(r.soluong) || 0) * (Number(r.gia) || 0), 0) - xuatPhiChanh;
  const totalProfit = totalXuatAmount - totalNhapAmount;

  _rptNhapRows = nhapRows;
  _rptXuatRows = xuatRows;

 // Giữ nguyên các biến tính toán phí của bạn
 summary.innerHTML = `
    <div class="report-summary-card" onclick="showRptGdDetail('nhap')" style="background:linear-gradient(135deg,#e8f5e9,#c8e6c9);cursor:pointer;position:relative;border:none;box-shadow:0 2px 8px rgba(0,0,0,0.05);">
      <div style="font-size:10px;color:#2e7d32;font-weight:700;margin-bottom:5px;">Tổng Nhập &nbsp;<span style="font-weight:400;color:#388e3c;">${fmt(totalNhapQty)} SL · ${_countOrders(nhapRows)} đơn</span></div>
      <div style="font-size:15px;font-weight:700;color:#388e3c;">${fmt(totalNhapAmount)} đ</div>
      ${nhapPhiChanh > 0 ? `<div style="font-size:10px;color:#388e3c;margin-top:3px;">Phí vận chuyển: +${fmt(nhapPhiChanh)} đ</div>` : ''}
      <div style="position:absolute;bottom:8px;right:10px;font-size:10px;color:#388e3c;">chi tiết ›</div>
    </div>

    <div class="report-summary-card" onclick="showRptGdDetail('xuat')" style="background:#fff5f5;cursor:pointer;position:relative;border:none;box-shadow:0 2px 8px rgba(0,0,0,0.05);">
      <div style="font-size:10px;color:#c62828;font-weight:700;margin-bottom:5px;">Tổng Xuất &nbsp;<span style="font-weight:400;color:#c62828;">${fmt(totalXuatQty)} SL · ${_countOrders(xuatRows)} đơn</span></div>
      <div style="font-size:15px;font-weight:700;color:#c62828;">${fmt(totalXuatAmount)} đ</div>
      ${(xuatPhiVC > 0 || xuatPhiKT > 0) ? `<div style="font-size:10px;color:#e53935;margin-top:3px;">${xuatPhiVC > 0 ? `Phí vận chuyển: -${fmt(xuatPhiVC)} đ` : ''}${xuatPhiVC > 0 && xuatPhiKT > 0 ? `<span class="report-fee-mobile-break"></span><span class="report-fee-sep"> | </span>` : ''}${xuatPhiKT > 0 ? `Phí KT: +${fmt(xuatPhiKT)} đ` : ''}</div>` : ''}
      <div style="position:absolute;bottom:8px;right:10px;font-size:10px;color:#e53935;">chi tiết ›</div>
    </div>

    <div onclick="showProfitDetail()" style="grid-column: span 2; position:relative; background: #EFF6FF; border-radius: 12px; padding: 10px 20px; border: 1px solid #FFF7ED; margin-top: 5px; box-shadow: 0 2px 6px rgba(0,0,0,0.04); display: flex; align-items: center; justify-content: space-between;margin-top: -3px; cursor:pointer;">
        <div style="font-size:14px; font-weight:700; color: #1D4ED8; letter-spacing: 0.5px; line-height: 1;">Lợi Nhuận </div>
        <div style="font-size:14px; font-weight:700; color: #1D4ED8; line-height: 1;margin-right:40px;">${totalProfit >= 0 ? '+' : ''}${fmt(totalProfit)} đ</div>
        <div style="position:absolute;bottom:8px;right:10px;font-size:10px;color:#1D4ED8;">chi tiết ›</div>
    </div>
  `;

  if (!rows.length) {
    list.innerHTML = '<div style="text-align:center;padding:40px;color:#999;background:#fff;border:1px solid #e8e8e8;border-radius:14px;">Không có dữ liệu phù hợp với bộ lọc.</div>';
    return;
  }

  const suppliers = _sortReportItems(_groupReportEntries(rows, r => r.ncc.trim(), r => r.ncc.trim(), r => r.loai === 'Nhập' && r.ncc.trim()).map(item => ({ ...item, extra: item.count + ' đơn nhập' })));
  const customers = _sortReportItems(_groupReportEntries(rows, r => r.tenkhach.trim(), r => r.tenkhach.trim(), r => r.loai === 'Xuất' && r.tenkhach.trim()).map(item => ({ ...item, extra: item.count + ' đơn xuất' })));
  const rawReportQ = ((document.getElementById('report-search') || {}).value || '').trim();

  const nccBodyHtml = suppliers.length
    ? `<div class="report-detail-list">${suppliers.map(item => { const idx = _rptDetailData.push({ type: 'ncc', key: item.key, name: item.name }) - 1; return `<div class="report-detail-item" onclick="showReportDetail(${idx})" style="cursor:pointer;"><div style="min-width:0;"><div class="report-detail-name">${hlField(item.name, rawReportQ, 'ncc', reportSearchField)}</div><div class="report-detail-meta">${item.extra || (item.count + ' đơn')}</div></div><div class="report-detail-value"><div class="report-detail-qty">${fmt(item.qty)} SL</div><div class="report-detail-amount">${fmt(item.amount)} đ</div></div></div>`; }).join('')}</div>`
    : `<div style="font-size:13px;color:#999;padding:6px 0;">Không có dữ liệu nhà cung cấp trong bộ lọc này.</div>`;

  const khachBodyHtml = customers.length
    ? `<div class="report-detail-list">${customers.map(item => { const idx = _rptDetailData.push({ type: 'khach', key: item.key, name: item.name }) - 1; return `<div class="report-detail-item" onclick="showReportDetail(${idx})" style="cursor:pointer;"><div style="min-width:0;"><div class="report-detail-name">${hlField(item.name, rawReportQ, 'tenkhach', reportSearchField)}</div><div class="report-detail-meta">${item.extra || (item.count + ' đơn')}</div></div><div class="report-detail-value"><div class="report-detail-qty">${fmt(item.qty)} SL</div><div class="report-detail-amount">${fmt(item.amount)} đ</div></div></div>`; }).join('')}</div>`
    : `<div style="font-size:13px;color:#999;padding:6px 0;">Không có dữ liệu khách hàng trong bộ lọc này.</div>`;

  const spBodyHtml = (() => {
    const spMap = new Map();
    rows.forEach(r => {
      const key = [r.ma, r.hanghoa, r.kichthuoc].join('||');
      if (!r.ma && !r.hanghoa) return;
      if (!spMap.has(key)) spMap.set(key, { key, name: r.hanghoa || r.ma || 'Không tên', ma: r.ma, kichthuoc: r.kichthuoc, ncc: r.ncc || '', nhapQty: 0, nhapAmount: 0, xuatQty: 0, xuatAmount: 0, latestTs: 0 });
      const item = spMap.get(key);
      if (!item.ncc && r.ncc) item.ncc = r.ncc;
      if (r.loai === 'Nhập') { item.nhapQty += r.soluong; item.nhapAmount += r.soluong * r.gia; }
      else                   { item.xuatQty += r.soluong; item.xuatAmount += r.soluong * r.gia; }
      if ((r.thoigian_raw || 0) > item.latestTs) item.latestTs = r.thoigian_raw || 0;
    });
    const spItems = _sortReportItems([...spMap.values()]);
    if (!spItems.length) return `<div style="font-size:13px;color:#999;padding:6px 0;">Không có dữ liệu sản phẩm trong bộ lọc này.</div>`;
    return `<div class="report-detail-list">${spItems.map(item => {
      const _rsf = reportSearchField || 'all';
      const metaHtml = [item.ma ? hlField(item.ma, rawReportQ, 'ma', _rsf) : '', item.kichthuoc ? (_rsf === 'all' ? highlightText(item.kichthuoc, rawReportQ) : item.kichthuoc) : ''].filter(Boolean).join(' · ');
      const nhapLine = item.nhapQty > 0 ? `<div style="font-size:13px;color:#388e3c;white-space:nowrap;">Nhập: ${fmt(item.nhapQty)} | ${fmt(item.nhapAmount)}đ</div>` : '';
      const xuatLine = item.xuatQty > 0 ? `<div style="font-size:13px;color:#c62828;white-space:nowrap;">Xuất: ${fmt(item.xuatQty)} | ${fmt(item.xuatAmount)}đ</div>` : '';
      const idx = _rptDetailData.push({ type: 'sp', key: item.key, name: item.name, ma: item.ma, ncc: item.ncc, kichthuoc: item.kichthuoc }) - 1;
      return `<div class="report-detail-item" onclick="showReportDetail(${idx})" style="cursor:pointer;"><div style="min-width:0;flex:1;"><div class="report-detail-name">${hlField(item.name, rawReportQ, 'hanghoa', _rsf)}${item.ncc ? ` <span style="color:#1565c0;font-weight:500;">· ${hlField(item.ncc, rawReportQ, 'ncc', _rsf)}</span>` : ''}</div>${metaHtml ? `<div class="report-detail-meta">${metaHtml}</div>` : ''}</div><div style="text-align:right;flex-shrink:0;">${nhapLine}${xuatLine}</div></div>`;
    }).join('')}</div>`;
  })();

  list.innerHTML = [
    _rptSecBlock('ncc', 'Nhà cung cấp', '#1976d2', suppliers.length, nccBodyHtml),
    _rptSecBlock('khach', 'Khách hàng', '#8e24aa', customers.length, khachBodyHtml),
    _rptSecBlock('sp', 'Sản phẩm', '#2e7d32', (() => { const m = new Map(); rows.forEach(r => { if (r.ma || r.hanghoa) m.set([r.ma, r.hanghoa, r.kichthuoc].join('||'), 1); }); return m.size; })(), spBodyHtml)
  ].join('');
}

function toggleReportSortPanel(e) {
  if (e) e.stopPropagation();
  const p = document.getElementById('report-sort-panel');
  if (!p) return;
  const open = p.style.display === 'none' || p.style.display === '';
  _closeReportTypePanel(); _closeReportDatePanel();
  p.style.display = open ? 'block' : 'none';
}
function _closeReportSortPanel() {
  const p = document.getElementById('report-sort-panel');
  if (p) p.style.display = 'none';
}
const _rptSortLabels = { newest: 'Mới', oldest: 'Cũ', az: 'A-Z', za: 'Z-A' };
function setReportSort(mode) {
  _reportSortMode = mode;
  const lbl = document.getElementById('report-sort-label');
  if (lbl) lbl.textContent = _rptSortLabels[mode] || '';
  ['newest','oldest','az','za'].forEach(k => {
    const b = document.getElementById('rs-' + k);
    if (b) b.classList.toggle('active', k === mode);
  });
  _closeReportSortPanel();
  renderReport();
}
function _sortReportItems(items) {
  const c = [...items];
  if (_reportSortMode === 'az')     return c.sort((a,b) => (a.name||'').localeCompare(b.name||'', 'vi'));
  if (_reportSortMode === 'za')     return c.sort((a,b) => (b.name||'').localeCompare(a.name||'', 'vi'));
  if (_reportSortMode === 'oldest') return c.sort((a,b) => (a.latestTs||0) - (b.latestTs||0));
  return c.sort((a,b) => (b.latestTs||0) - (a.latestTs||0));
}

function toggleHistSortPanel(e) {
  if (e) e.stopPropagation();
  const p = document.getElementById('hist-sort-panel');
  if (!p) return;
  const open = p.style.display === 'none' || p.style.display === '';
  _closeHistFilterPanel(); _closeHistDatePanel();
  p.style.display = open ? 'block' : 'none';
}
function _closeHistSortPanel() {
  const p = document.getElementById('hist-sort-panel');
  if (p) p.style.display = 'none';
}
const _histSortLabels = { newest: 'Mới', oldest: 'Cũ', az: 'A-Z', za: 'Z-A' };
function setHistSort(mode) {
  _histSortMode = mode;
  const lbl = document.getElementById('hist-sort-label');
  if (lbl) lbl.textContent = _histSortLabels[mode] || '';
  ['newest','oldest','az','za'].forEach(k => {
    const b = document.getElementById('hs-' + k);
    if (b) b.classList.toggle('active', k === mode);
  });
  _closeHistSortPanel();
  _renderHistory();
}

// Đóng panel khi click ra ngoài
document.addEventListener('click', () => {
  _closeHistDatePanel();
  _closeHistSortPanel();
  _closeHistFilterPanel();
  _closeReportDatePanel();
  _closeReportSortPanel();
  _closeReportTypePanel();
});

function _renderHistory() {
  const list = document.getElementById('history-list');
  if (!list) return;
  let filtered = _historyData;
  // Bước 1: Lọc theo Quyền (Staff chỉ thấy Xuất và Nháp)
  if (currentRole !== 'owner') {
    filtered = filtered.filter(r => r.loai === 'Xuất' || r.loai === 'Nháp');
  }
  // Bước 2: Lọc theo nút Tab (áp dụng chung cho mọi quyền)
  if (_historyFilter === 'xuat') {
    filtered = filtered.filter(r => r.loai === 'Xuất');
  } else if (_historyFilter === 'nhap') {
    filtered = filtered.filter(r => r.loai === 'Nhập');
  } else if (_historyFilter === 'draft') {
    filtered = filtered.filter(r => r.loai === 'Nháp');
  }

  // Lọc theo thời gian
  if (_historyTimeFilter !== 'all') {
    const now = new Date();
    let startTs, endTs;
    if (_historyTimeFilter === 'today') {
      startTs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      endTs   = startTs + 86400000;
    } else if (_historyTimeFilter === 'yesterday') {
      endTs   = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      startTs = endTs - 86400000;
    } else if (_historyTimeFilter === 'week') {
      const dow  = now.getDay() === 0 ? 6 : now.getDay() - 1; // Mon=0
      startTs = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dow).getTime();
      endTs   = startTs + 7 * 86400000;
    } else if (_historyTimeFilter === 'month') {
      startTs = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      endTs   = new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime();
    } else if (_historyTimeFilter === 'year') {
      startTs = new Date(now.getFullYear(), 0, 1).getTime();
      endTs   = new Date(now.getFullYear() + 1, 0, 1).getTime();
    } else if (_historyTimeFilter === 'custom') {
      if (_histDateFrom) startTs = new Date(_histDateFrom.getFullYear(), _histDateFrom.getMonth(), _histDateFrom.getDate()).getTime();
      if (_histDateTo)   endTs   = new Date(_histDateTo.getFullYear(),   _histDateTo.getMonth(),   _histDateTo.getDate() + 1).getTime();
    }
    if (startTs !== undefined || endTs !== undefined) {
      filtered = filtered.filter(r =>
        (startTs === undefined || r.thoigian_raw >= startTs) &&
        (endTs   === undefined || r.thoigian_raw <  endTs)
      );
    }
  }

  // Lọc theo text search thông minh (hỗ trợ nhiều từ khóa)
  const histQ = removeDiacritics(((document.getElementById('hist-search') || {}).value || '').trim());
  if (histQ) {
    const keywords = histQ.split(/\s+/);
    const hsf = histSearchField || 'all';
    filtered = filtered.filter(r => {
      let rowText;
      if (hsf === 'ma') rowText = removeDiacritics(r.ma || '');
      else if (hsf === 'ncc') rowText = removeDiacritics(r.ncc || '');
      else if (hsf === 'tenkhach') rowText = removeDiacritics(r.tenkhach || '');
      else if (hsf === 'hanghoa') rowText = removeDiacritics(r.hanghoa || '');
      else rowText = removeDiacritics([
        r.hanghoa || '', r.ma || '', r.ncc || '', r.tenkhach || '',
        r.kichthuoc || '', r.giaodich || '', r.loai || ''
      ].join(' '));
      return keywords.every(kw => rowText.includes(kw));
    });
  }

  // Gom nhóm theo thoigian + (tenkhach|ncc) + loai: cùng thời gian + cùng khách/NCC = 1 đơn
  const groupMap = new Map();
  filtered.forEach(r => {
    const key = _orderKey(r);
    if (!groupMap.has(key)) {
      groupMap.set(key, { rows: [], thoigian: r.thoigian, thoigian_raw: r.thoigian_raw, tenkhach: '', loai: r.loai, giaodich: r.giaodich });
    }
    const g = groupMap.get(key);
    g.rows.push(r);
    if (!g.tenkhach && r.tenkhach) g.tenkhach = r.tenkhach;
  });
  _historyGroups = [...groupMap.values()].sort((a, b) => {
    if (_histSortMode === 'oldest') return a.thoigian_raw - b.thoigian_raw;
    if (_histSortMode === 'az' || _histSortMode === 'za') {
      const na = a.tenkhach || (a.rows[0] && (a.rows[0].ncc || a.rows[0].hanghoa)) || '';
      const nb = b.tenkhach || (b.rows[0] && (b.rows[0].ncc || b.rows[0].hanghoa)) || '';
      return _histSortMode === 'az' ? na.localeCompare(nb, 'vi') : nb.localeCompare(na, 'vi');
    }
    return b.thoigian_raw - a.thoigian_raw;
  });

  // Cập nhật thanh tổng kết
  let _nhapSL = 0, _nhapDon = 0, _nhapTien = 0, _xuatSL = 0, _xuatDon = 0, _xuatTien = 0;
  let _nhapPhi = 0, _xuatPhiVC = 0, _xuatPhiKT = 0;
  const _nhapOrderSet = new Set();
  const _xuatOrderSet = new Set();
  _historyGroups.forEach(g => {
    if (g.loai === 'Nháp') return;
    const tot = g.rows.reduce((s, r) => s + r.soluong * r.gia, 0);
    if (g.loai === 'Nhập') {
      _nhapSL += g.rows.reduce((s, r) => s + (Number(r.soluong) || 0), 0);
      _nhapOrderSet.add(_orderKey(g.rows[0] || g));
      _nhapTien += tot;
      _nhapPhi += g.rows.reduce((s, r) => s + Math.abs(Number(r.phichanh) || 0), 0);
    } else if (g.loai === 'Xuất') {
      _xuatSL += g.rows.reduce((s, r) => s + (Number(r.soluong) || 0), 0);
      _xuatOrderSet.add(_orderKey(g.rows[0] || g));
      _xuatTien += tot;
      _xuatPhiVC += g.rows.reduce((s, r) => s + Math.abs(Number(r.phichanh) || 0), 0);
      _xuatPhiKT += g.rows.reduce((s, r) => s + (Number(r.phikhachtra) || 0), 0);
    }
  });
  _nhapDon = _nhapOrderSet.size;
  _xuatDon = _xuatOrderSet.size;
  const _xuatPhiNet = _xuatPhiVC - _xuatPhiKT;
  const _se = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  const _seh = (id, v) => { const el = document.getElementById(id); if (el) el.innerHTML = v; };
  const _sd = (id, v) => { const el = document.getElementById(id); if (el) el.style.display = v; };

  // Tính toán lại Tổng theo logic trang Báo cáo:
  // Nhập = Tiền hàng + Phí chành
  // Xuất = Tiền hàng - Phí net (Phí net = Phí chành - Phí khách trả)
  const finalNhapTotal = _nhapTien + _nhapPhi;
  const finalXuatTotal = _xuatTien - _xuatPhiNet;

  _se('hist-sum-nhap-sp',   `${fmt(_nhapSL)} SL · ${_nhapDon} đơn`);
  _se('hist-sum-nhap-tien', finalNhapTotal.toLocaleString('en-US') + ' \u0111');
  _se('hist-sum-xuat-sp',   `${fmt(_xuatSL)} SL · ${_xuatDon} đơn`);
  _se('hist-sum-xuat-tien', finalXuatTotal.toLocaleString('en-US') + ' \u0111');

  if (_nhapPhi > 0) {
    _se('hist-sum-nhap-phi', '+ ' + _nhapPhi.toLocaleString('en-US') + ' \u0111');
    _sd('hist-sum-nhap-phi-wrap', 'block');
  } else { _sd('hist-sum-nhap-phi-wrap', 'none'); }

  if (_xuatPhiVC > 0 || _xuatPhiKT > 0) {
    _seh('hist-sum-xuat-phi', `${_xuatPhiVC > 0 ? `Phí vận chuyển: -${_xuatPhiVC.toLocaleString('en-US')} \u0111` : ''}${_xuatPhiVC > 0 && _xuatPhiKT > 0 ? `<span class="report-fee-mobile-break"></span><span class="report-fee-sep"> | </span>` : ''}${_xuatPhiKT > 0 ? `Phí KT: +${_xuatPhiKT.toLocaleString('en-US')} \u0111` : ''}`);
    _sd('hist-sum-xuat-phi-wrap', 'block');
  } else { _sd('hist-sum-xuat-phi-wrap', 'none'); }

  if (_historyGroups.length === 0) {
    list.innerHTML = '<div style="text-align:center;padding:40px;color:#aaa;">Ch\u01B0a c\u00F3 d\u1EEF li\u1EC7u.</div>';
    return;
  }
  const rawHistQ = ((document.getElementById('hist-search') || {}).value || '').trim();
  const _hsf = histSearchField || 'all';

  list.innerHTML = _historyGroups.map((g, i) => {
    const total = g.rows.reduce((s, r) => s + r.soluong * r.gia, 0);
    const isXuat  = g.loai === 'Xuất';
    const isDraft = g.loai === 'Nháp';
    const loaiColor = isXuat ? '#e53935' : isDraft ? '#7b1fa2' : '#1976d2';
    const loaiBg    = isXuat ? '#ffebee' : isDraft ? '#f3e5f5' : '#e3f2fd';
    const invoiceBtn = isXuat
      ? `<button onclick="event.stopPropagation();showInvoice(${i})" class="history-invoice-btn">Hóa đơn</button>`
      : isDraft
      ? `<button onclick="event.stopPropagation();confirmDraftToXuat(${i})" class="history-invoice-btn" style="width: 68.5px;border-color:#4CAF50;color:#2e7d32;background:#e8f5e9;">Xuất</button>`
      : '';
    return `<div class="history-card" onclick="showHistoryDetail(${i})" style="cursor:pointer;">
      <div class="history-card-row">
        <div class="history-card-main">
          <div class="history-card-time">${formatHistoryTimeText(g)}</div>
            <div class="history-card-meta">
            <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
              <span style="font-size:12px;padding:2px 8px;border-radius:10px;background:${loaiBg};color:${loaiColor};font-weight:600;">${_hsf === 'all' ? highlightText(g.loai, rawHistQ) : g.loai}</span>
              <span style="font-size:13px;color:#555;">${g.rows.length} SP</span>
              <span style="font-size:13px;font-weight:600;color:#1a1a1a;">${total.toLocaleString('en-US')} đ</span>
              ${g.giaodich ? `<span style="font-size:12px;color:#888;">· ${_hsf === 'all' ? highlightText(g.giaodich.replace('Tiền mặt + Chuyển khoản','TM + CK'), rawHistQ) : g.giaodich.replace('Tiền mặt + Chuyển khoản','TM + CK')}</span>` : ''}
            </div>
            ${(g.tenkhach || (g.loai === 'Nhập' && g.rows[0]?.ncc)) ? `<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
              ${g.tenkhach ? `<span style="font-size:12px;color:#555;">· ${hlField(g.tenkhach, rawHistQ, 'tenkhach', _hsf)}</span>` : ''}
              ${g.loai === 'Nhập' && g.rows[0]?.ncc ? `<span style="font-size:12px;color:#1976d2;">· ${hlField(g.rows[0].ncc, rawHistQ, 'ncc', _hsf)}</span>` : ''}
            </div>` : ''}
          </div>
        </div>
        <div class="history-card-actions">
          ${invoiceBtn}
          ${currentRole === 'owner' ? `<div class="history-card-tools">
            <button onclick="event.stopPropagation();histEditGroup(${i})" title="Sửa" class="history-action-btn edit"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"></path></svg></button>
            <button onclick="event.stopPropagation();histDeleteGroup(${i})" title="Xóa" class="history-action-btn delete"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M8 6V4h8v2"></path><path d="M6 6l1 14h10l1-14"></path><path d="M10 11v6"></path><path d="M14 11v6"></path></svg></button>
          </div>` : ''}
        </div>
      </div>
    </div>`;
  }).join('');
}

let _histDetailIdx = -1;

function showHistoryDetail(idx) {
  const g = _historyGroups[idx];
  if (!g) return;
  _histDetailIdx = idx;

  const isXuat  = g.loai === 'Xuất';
  const isDraft = g.loai === 'Nháp';
  const total = g.rows.reduce((s, r) => s + r.soluong * r.gia, 0);

  const badge = document.getElementById('hd-badge');
  badge.textContent = g.loai;
  badge.style.background = isXuat ? '#ffebee' : isDraft ? '#f3e5f5' : '#e3f2fd';
  badge.style.color = isXuat ? '#c62828' : isDraft ? '#7b1fa2' : '#1976d2';

  const hdConfirmBtn = document.getElementById('hd-btn-confirm-draft');
  if (hdConfirmBtn) hdConfirmBtn.style.display = isDraft ? 'flex' : 'none';

  const tStr = formatHistoryTimeText(g);
  const nguoighi = g.rows[0].nguoighi || "";

  let infoHtml = '';
  if (nguoighi) {infoHtml += `<div class="info-row"><span class="info-label">Người ghi</span><span class="info-value">${nguoighi}</span></div>`;}
  infoHtml += `<div class="info-row"><span class="info-label">Thời gian</span><span class="info-value">${tStr}</span></div>`;
  infoHtml += `<div class="info-row"><span class="info-label">Loại</span><span class="info-value" style="color:${isXuat ? '#c62828' : '#1976d2'};">${g.loai}</span></div>`;
  if (g.giaodich) infoHtml += `<div class="info-row"><span class="info-label">Giao dịch</span><span class="info-value">${g.giaodich}</span></div>`;
  if ((isXuat || isDraft) && g.tenkhach) infoHtml += `<div class="info-row"><span class="info-label">Khách</span><span class="info-value">${g.tenkhach}</span></div>`;
  if (g.loai === 'Nhập' && g.rows[0]?.ncc) infoHtml += `<div class="info-row"><span class="info-label">NCC</span><span class="info-value">${g.rows[0].ncc}</span></div>`;
  const phiVC = Math.abs(Number(g.rows[0]?.phichanh) || 0);
  const phiKT = Number(g.rows[0]?.phikhachtra) || 0;

  infoHtml += `<div class="info-row"><span class="info-label">Tổng SP</span><span class="info-value">${g.rows.length}</span></div>`;
  infoHtml += `<div class="info-row"><span class="info-label">Tổng hàng</span><span class="info-value" style="font-weight:700;color:#333;">${total.toLocaleString('en-US')} đ</span></div>`;

  if (phiVC > 0) {
    infoHtml += `<div class="info-row"><span class="info-label">Phí vận chuyển</span><span class="info-value" style="font-weight:600;color:#d32f2f;">${g.loai === 'Nhập' ? '+' : '-'} ${phiVC.toLocaleString('en-US')} đ</span></div>`;
  }
  if (phiKT > 0) {
    infoHtml += `<div class="info-row"><span class="info-label">Phí (KT)</span><span class="info-value" style="font-weight:600;color:#2e7d32;">+ ${phiKT.toLocaleString('en-US')} đ</span></div>`;
  }
  const noNCC_val = !isXuat ? g.rows.reduce((s, r) => s + (Number(r.noncc) || 0), 0) : 0;
  const khachNo_val = (isXuat || isDraft) ? g.rows.reduce((s, r) => s + (Number(r.khachno) || 0), 0) : 0;
  if (noNCC_val > 0) {
    infoHtml += `<div class="info-row"><span class="info-label">Nợ NCC</span><span class="info-value" style="font-weight:600;color:#e65100;">${noNCC_val.toLocaleString('en-US')} đ</span></div>`;
  }
  if (khachNo_val > 0) {
    infoHtml += `<div class="info-row"><span class="info-label">Khách Nợ</span><span class="info-value" style="font-weight:600;color:#6a1b9a;">${khachNo_val.toLocaleString('en-US')} đ</span></div>`;
  }

  document.getElementById('hd-info-card').innerHTML = infoHtml;

  document.getElementById('hd-rows').innerHTML = g.rows.map((r, i) => {
    const sub = r.soluong * r.gia;
    return `<div class="card" style="margin-bottom:8px;">
      <div style="font-size:11px;color:#aaa;font-weight:600;margin-bottom:4px;">SP #${i+1} · ${r.ma}</div>
      <div style="font-size:15px;font-weight:600;margin-bottom:2px;">${r.hanghoa}</div>
      ${r.kichthuoc ? `<div style="font-size:12px;color:#888;">${r.kichthuoc}</div>` : ''}
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;padding-top:8px;border-top:1px dashed #eee;">
        <span style="font-size:13px;color:#555;">${r.soluong} ${r.dvt || ''} × ${r.gia.toLocaleString('en-US')} đ</span>
        <span style="font-size:14px;font-weight:600;color:#4CAF50;">${sub.toLocaleString('en-US')} đ</span>
      </div>
    </div>`;
  }).join('');

 const hdBtns = document.getElementById('hd-action-btns');
  if (hdBtns) {
    if (currentRole === 'owner') {
      hdBtns.style.display = 'flex';
      if (hdBtns.children[1]) hdBtns.children[1].style.display = 'flex'; // Hiện nút Sửa
      if (hdBtns.children[2]) hdBtns.children[2].style.display = 'flex'; // Hiện nút Xóa
    } else if (isDraft) {
      // Nếu là Staff và đang xem đơn Nháp -> Hiện khung nút nhưng ẩn Sửa, Xóa (chỉ giữ nút Xuất)
      hdBtns.style.display = 'flex';
      if (hdBtns.children[1]) hdBtns.children[1].style.display = 'none';
      if (hdBtns.children[2]) hdBtns.children[2].style.display = 'none';
    } else {
      // Nếu là Staff và xem đơn Xuất -> Ẩn toàn bộ nút
      hdBtns.style.display = 'none';
    }
  }
  sessionStorage.setItem('histDetailThoigian', g.thoigian);
  sessionStorage.setItem('histDetailLoai', g.loai);
  showScreen('screen-history-detail');
}

function histDetailEdit() {
  if (_histDetailIdx < 0) return;
  histEditGroup(_histDetailIdx);
}

async function histDetailDelete() {
  if (_histDetailIdx < 0) return;
  const idx = _histDetailIdx;
  await histDeleteGroup(idx);
  if (document.getElementById('screen-history-detail').classList.contains('active')) {
    showHistory();
  }
}

let _invoicePickerIdx = -1;

function showInvoice(idx) {
  _invoicePickerIdx = idx;
  const fullCb = document.getElementById('inv-pick-full');
  const noPriceCb = document.getElementById('inv-pick-noprice');
  if (fullCb) fullCb.checked = true;
  if (noPriceCb) noPriceCb.checked = false;
  const picker = document.getElementById('invoice-picker-modal');
  picker.style.display = 'flex';
}

async function _doShowInvoice() {
  const showFull = document.getElementById('inv-pick-full').checked;
  const showNoPrice = document.getElementById('inv-pick-noprice').checked;
  if (!showFull && !showNoPrice) return;
  const g = _historyGroups[_invoicePickerIdx];
  if (!g) return;
  const xemInBtn = document.getElementById('inv-xem-in-btn');
  if (xemInBtn) { xemInBtn.disabled = true; xemInBtn.textContent = 'Đang tải...'; }
  await new Promise(r => setTimeout(r, 10));
  // Luôn fetch khách hàng để lấy địa chỉ/SĐT mới (tôn trọng cache 10 phút bên trong)
  await fetchCustomerData();
  const invOpts = _lookupCustomer(g.tenkhach);
  const fullHtml = showFull ? _buildInvoiceHTML(g, false, invOpts, true) : '';
  const noPriceHtml = showNoPrice ? _buildInvoiceHTML(g, true, invOpts, !showFull) : '';
  let screenHtml = '', printHtml = '';
  if (showFull && showNoPrice) {
    screenHtml = fullHtml + '<div style="border-top:2px dashed #ccc;margin:8mm 0;"></div>' + noPriceHtml;
    printHtml = '<div class="inv-print-page">' + fullHtml + '</div><div class="inv-print-page">' + noPriceHtml + '</div>';
  } else if (showFull) {
    screenHtml = fullHtml;
    printHtml = '<div class="inv-print-page">' + fullHtml + '</div>';
  } else {
    screenHtml = noPriceHtml;
    printHtml = '<div class="inv-print-page">' + noPriceHtml + '</div>';
  }
  document.getElementById('inv-content').innerHTML = screenHtml;
  document.getElementById('inv-print-root').innerHTML = printHtml;
  document.getElementById('invoice-picker-modal').style.display = 'none';
  if (xemInBtn) { xemInBtn.disabled = false; xemInBtn.textContent = 'Xem & In'; }
  document.getElementById('invoice-modal').style.display = 'flex';
}

function _buildInvoicePageHTML(g, hidePrice, pageRows, pageIndex, totalPages, isLastPage, invOpts, isFirstPage) {
  const fmtInvMoney = function(v) {
    return Math.round(Number(v) || 0).toLocaleString('vi-VN', { maximumFractionDigits: 0 });
  };
  const d = parseHistoryDateParts(g.thoigian);
  const dateStr = d ? `Ngày ${d.day} tháng ${String(d.month).padStart(2,'0')} năm ${d.year}` : '';
  const allRows = g.rows;
  const total = allRows.reduce((s, r) => s + r.soluong * r.gia, 0);
  const phiKT = Number((allRows[0] && allRows[0].phikhachtra) || 0);
  const tenkhach = g.tenkhach || '';
  const _io = invOpts || {};
  const _addresses = Array.isArray(_io.addresses) ? _io.addresses : [];
  const _sdts = Array.isArray(_io.sdts) ? _io.sdts : [];
  const B = 'border:1px solid #d73c3c;';
  const thS = B + 'padding:1.6mm 1mm;text-align:center;font-size:3.9mm;font-weight:600;'; // chỉnh kích thước Hóa đơn các dòng đầu tiên
  const tdBase = 'border-left:1px solid #d73c3c;border-right:1px solid #d73c3c;border-bottom:1px dotted #d73c3c;height:6mm;font-size:3.9mm;'; // chỉnh kích thước Hóa đơn các dòng
  const paddedRows = Array.from({ length: 13 }, (_, i) => pageRows[i] || null); // chỉnh Hóa đơn các dòng
  const rowOffset = pageIndex * 13; // chỉnh Hóa đơn các dòng

  const headerHTML = hidePrice
    ? `<th style="${thS}width:6%;">TT</th><th style="${thS}width:60%;">Tên Hàng</th><th style="${thS}width:13%;">ĐVT</th><th style="${thS}width:23%;">SL</th>`
    : `<th style="${thS}width:6%;">TT</th><th style="${thS}width:50%;">Tên Hàng</th><th style="${thS}width:9.5%;">ĐVT</th><th style="${thS}width:6.5%;">SL</th><th style="${thS}width:16%;">Đơn Giá</th><th style="${thS}width:21%;">Thành Tiền</th>`;

  const bodyHTML = paddedRows.map((r, i) => {
    const name = r ? (r.hanghoa || '') + (r.kichthuoc ? ' - ' + r.kichthuoc : '') : '';
    const dvt = r ? (r.dvt || '') : '';
    const qty = r ? r.soluong : '';
    const price = r ? fmtInvMoney(r.gia) : '';
    const amount = r ? fmtInvMoney(r.soluong * r.gia) : '';
    const rowNum = r ? (rowOffset + i + 1) : '';
    if (hidePrice) {
      return `<tr><td style="${tdBase}padding:0 1mm;text-align:center;font-weight:600;">${rowNum}</td><td style="${tdBase}padding:0 2mm;">${name}</td><td style="${tdBase}padding:0 1mm;text-align:center;">${dvt}</td><td style="${tdBase}padding:0 1mm;text-align:center;">${qty}</td></tr>`;
    }
    return `<tr><td style="${tdBase}padding:0 1mm;text-align:center;font-weight:600;">${rowNum}</td><td style="${tdBase}padding:0 2mm;">${name}</td><td style="${tdBase}padding:0 1mm;text-align:center;">${dvt}</td><td style="${tdBase}padding:0 1mm;text-align:center;">${qty}</td><td style="${tdBase}padding:0 1.5mm;text-align:right;">${price}</td><td style="${tdBase}padding:0 1.5mm;text-align:right;">${amount}</td></tr>`;
  }).join('');

  let footerHTML;
  if (isLastPage) {
    const grandTotal = total + phiKT;
    const giaodichLabel = g.giaodich ? ` · ${g.giaodich}` : '';
    const phiKTRow = phiKT > 0 && !hidePrice
      ? `<tr><td colspan="5" style="${B}padding:1.6mm 1mm;text-align:right;font-size:3.2mm;font-weight:700;">Phí chành khách trả</td><td style="${B}padding:1.6mm 1mm;text-align:right;font-size:3.2mm;font-weight:700;">+ ${fmtInvMoney(phiKT)} đ</td></tr>`
      : '';
    // Chỉ lấy ghi chú nhập tay: lấy phần trước ' | ' rồi lọc bỏ nếu là chuỗi hệ thống (luôn chứa '→').
    const _rawNote = !hidePrice && g.loai === 'Xuất'
      ? String((allRows[0] && allRows[0].ghichu) || '').split(' | ')[0].trim()
      : '';
    const noteText = _rawNote && !_rawNote.includes('→') ? _rawNote : '';
    const noteRow = noteText
      ? `<tr><td colspan="6" style="${B}padding:1.6mm 2mm;text-align:left;font-size:3.5mm;font-weight:600;">Ghi chú: ${_esc(noteText)}</td></tr>`
      : '';
    if (hidePrice) {
      footerHTML = `<tfoot><tr><td colspan="3" style="${B}padding:1.6mm 1mm;text-align:center;font-size:4.5mm;font-weight:700;">Tổng Cộng${giaodichLabel}</td><td style="${B}padding:1.6mm 1mm;text-align:right;font-size:4.5mm;font-weight:700;">${fmtInvMoney(grandTotal)} đ</td></tr></tfoot>`;
    } else {
      footerHTML = `<tfoot>${phiKTRow}${noteRow}<tr><td colspan="5" style="${B}padding:1.6mm 1mm;text-align:center;font-size:4.5mm;font-weight:700;">Tổng Cộng${giaodichLabel}</td><td style="${B}padding:1.6mm 1mm;text-align:right;font-size:4.5mm;font-weight:700;">${fmtInvMoney(grandTotal)} đ</td></tr></tfoot>`;
    }
  } else {
    const cs = hidePrice ? 4 : 6;
    footerHTML = `<tfoot><tr><td colspan="${cs}" style="border-top:1px solid #d73c3c;padding:1.6mm 1.2mm;font-style:italic;font-size:3.2mm;font-weight:600;text-align:right ;color:#d32f2f;">Xem tiếp trang sau -&gt;</td></tr></tfoot>`;
  }

  const pageLabel = totalPages > 1 ? `<span style="margin-left:3mm;font-size:2.8mm;font-style:italic;color:#d32f2f;">Trang ${pageIndex + 1}/${totalPages}</span>` : '';

  return `<div style="text-align:center;margin-bottom:2mm;">
    <div style="font-size:5.0mm;font-weight:700;letter-spacing:0.6px;line-height:1;text-transform:uppercase;">HỘ KINH DOANH HÀNG GIA DỤNG</div>
    <div style="font-size:3.2mm;line-height:1.15;margin-top:1.2mm;">
      <div>&#127968; Địa chỉ: 49 Lê Quang Sung, P. Bình Tây, TP.HCM</div>
      <div>&#128222; SĐT-Zalo: 090.6265.980, 0937.359.789</div>
      <div>&#9993; Email: hkd.hanggiadung88@gmail.com</div>
    </div>
    <div style="font-size:2.8mm;font-weight:700;line-height:1.18;margin-top:1.2mm;">Chuyên Sỉ Lẻ Hàng Inox Đồ Gia Dụng, Thiết Bị Nhà Bếp, Phòng Tắm, Bàn Ghế, Kệ, Sườn Võng, Giường Xếp, Thang Inox Vv...</div>
    <div style="font-size:4.5mm;font-weight:700;line-height:1;margin-top:1.6mm;text-transform:uppercase;">HÓA ĐƠN BÁN HÀNG</div>
  </div>
  <div style="font-size:3.6mm;margin-bottom:1mm;display:flex;align-items:flex-end;margin-top:-2mm;">
    <span style="white-space:nowrap;">Khách Hàng:</span>
    <span style="flex:1;border-bottom:1px dotted #d32f2f;height:6mm;padding-left:2mm;display:flex;align-items:flex-end;font-weight:700;">${tenkhach}</span>
    <span style="white-space:nowrap;margin-left:2mm;">ĐT:</span>
    ${isFirstPage
      ? (_sdts.length > 0
        ? `<select class="inv-sdt-select" onchange="syncInvSdtSelect(this)" style="width:36mm;border:none;border-bottom:1px dotted #d32f2f;border-radius:0;height:6mm;font-size:3.2mm;font-weight:700;background:transparent;outline:none;padding:1.3mm 1mm 0;color:#d32f2f;font-family:inherit;"><option value=""></option>${_sdts.map(function(s){return '<option>'+_esc(s)+'</option>';}).join('')}</select>`
        : '<span style="width:36mm;display:inline-block;border-bottom:1px dotted #d32f2f;height:6mm;"></span>')
      : '<span class="inv-sdt-follower" style="width:36mm;display:inline-block;border-bottom:1px dotted #d32f2f;height:6mm;font-size:3.2mm;font-weight:700;color:#d32f2f;padding:1.3mm 1mm 0;box-sizing:border-box;"></span>'}
  </div>
  <div style="font-size:3.6mm;margin-bottom:1.8mm;display:flex;align-items:flex-end;">
    <span style="white-space:nowrap;">Địa chỉ:</span>
    ${isFirstPage
      ? (_addresses.length > 0
        ? `<select class="inv-addr-select" onchange="syncInvAddrSelect(this)" style="flex:1;border:none;border-bottom:1px dotted #d32f2f;border-radius:0;height:6mm;font-size:3.9mm;font-weight:600;background:transparent;outline:none;padding:1.3mm 1mm 0;color:#d32f2f;font-family:inherit;"><option value=""></option>${_addresses.map(function(a){return '<option>'+_esc(a)+'</option>';}).join('')}</select>`
        : '<span style="flex:1;display:inline-block;border-bottom:1px dotted #d32f2f;height:6mm;"></span>')
      : '<span class="inv-addr-follower" style="flex:1;display:inline-block;border-bottom:1px dotted #d32f2f;height:6mm;font-size:3.9mm;font-weight:600;color:#d32f2f;padding:1.3mm 1mm 0;box-sizing:border-box;"></span>'}
  </div>
  <table style="width:100%;border-collapse:collapse;table-layout:fixed;color:#d32f2f;">
    <thead><tr>${headerHTML}</tr></thead>
    <tbody>${bodyHTML}</tbody>
    ${footerHTML}
  </table>
  <div style="display:flex;gap:5mm;align-items:flex-start;margin-top:2.6mm;">
    <div style="width:34mm;text-align:center;flex-shrink:0;">
      <img src="qr-zalo.png" width="95mm" height="95mm" style="display:block;margin:0 auto 1mm;" />
      <div style="font-size:2.5mm;font-weight:700;line-height:1;">GIA DỤNG LÊ QUANG SUNG</div>
    </div>
    <div style="width:24mm;height:28mm;text-align:center;flex-shrink:0;display:flex;flex-direction:column;justify-content:center;margin-top: 6px;">
      <img src="lucky-cat.png" width="82mm" height="82mm" style="background:#fff;display:block; margin:0 auto 1mm; background:transparent;" />
      <div style="font-size:3.5mm;font-style:italic;font-weight:700;line-height:1;margin-bottom:1.4mm;">Thank You !</div>
    </div>
    <div style="flex:1;">
      <div style="text-align:right;font-size:3.2mm;font-style:italic;margin-bottom:2mm;">${dateStr}${pageLabel}</div>
      <div style="display:flex;justify-content:space-between;text-align:center;font-size:3.2mm;font-weight:700;padding:0 2mm;">
        <div style="width:50%;"><div>Khách Hàng</div></div>
        <div style="width:50%;"><div>Người Viết Hóa Đơn</div></div>
      </div>
    </div>
  </div>`;
}

function _buildInvoiceHTML(g, hidePrice, invOpts, isFirstVariant) {
  const rows = g.rows;
  const chunks = [];
  if (rows.length === 0) {
    chunks.push([]);
  } else {
    for (let i = 0; i < rows.length; i += 13) chunks.push(rows.slice(i, i + 13)); // chỉnh Hóa đơn các dòng
  }
  const totalPages = chunks.length;
  return chunks.map(function(pageRows, pageIndex) {
    const isLastPage = pageIndex === totalPages - 1;
    const isFirstPage = !!isFirstVariant && pageIndex === 0;
    return '<div class="inv-print-page">' + _buildInvoicePageHTML(g, hidePrice, pageRows, pageIndex, totalPages, isLastPage, invOpts, isFirstPage) + '</div>';
  }).join('');
}


// ===== HISTORY EDIT / DELETE =====
let _histEditIdx = -1;
let _histEditRows = [];
let _afterHistSaveFn = null;
function _esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function _heditDisplayHtml(p, fallbackR) {
  if (p) {
    // 1. Lấy số lượng gốc của dòng này từ lịch sử (Cố định, không đổi khi anh gõ số mới)
    var origSl = (fallbackR && fallbackR.ma === p.ma) ? (parseFloat(fallbackR.soluong) || 0) : 0;

    // 2. Tồn kho thực tế hiện tại (Số lượng đang có trên kệ, đã trừ đơn này rồi)
    var realTk = parseFloat(p.tonkho) || 0;

    // 3. Khả dụng (Hạn mức tối đa) = Tồn hiện tại + Số lượng cũ của đơn
    // Đây là con số được "khóa lại" để anh biết mình không được phép sửa vượt quá mốc này
    var maxLimit = realTk + origSl;

    var kdColor = maxLimit <= 0 ? '#f44336' : '#2196F3';
    var tkColor = realTk <= 0 ? '#f44336' : '#4CAF50'; // Dùng màu xanh dương cho tồn kho thực tế để dễ nhìn
    var dvtStr = p.dvt ? ' ' + _esc(p.dvt) : '';
    var name = (p.ncc ? _esc(p.ncc) + ' - ' : '') + _esc(p.ten);

    // Hiển thị rõ ràng: Khả dụng (Hạn mức tổng) và Kho còn (Thực tế trên kệ)
    var tonHtml = ' | <span style="color:' + kdColor + ';font-size:12px;">Khả dụng: ' + fmt(maxLimit) + '</span>';

    if (origSl > 0) {
      // Hiện thêm số tồn thực tế trong ngoặc để anh đối chiếu
      tonHtml += ' · <span style="color:' + tkColor + ';font-size:12px;">Tồn: ' + fmt(realTk) + dvtStr + '</span>';
    }

    return name + tonHtml;
  }
  var r = fallbackR;
  return _esc(r.hanghoa) + (r.kichthuoc ? ' - ' + _esc(r.kichthuoc) : '') + (r.dvt ? ' | ' + _esc(r.dvt) : '');
}

function heditMaChange(el, idx) {
  var ma = el.value.trim();
  var p = products.find(function(x) { return x.ma === ma; });
  var hnEl = document.getElementById('hedit-hn-' + idx);
  if (!hnEl) return;

  if (p) {
    el.style.borderColor = '#4CAF50';
    hnEl.innerHTML = _heditDisplayHtml(p, null);

    var g = _historyGroups[_histEditIdx] || {};
    var isXuat = (g.loai === 'Xuất' || g.loai === 'Nháp');
    var defaultGia = isXuat ? parseNum(p.giasi) : parseNum(p.giavon);
    var giaEl = document.getElementById('hedit-gia-' + idx);

    if (giaEl) {
      giaEl.dataset.defaultGia = defaultGia > 0 ? String(defaultGia) : '';

      // TỰ ĐỘNG HIỆN CHỮ MỜ KHI GÕ XONG MÃ SP
      var labelGoiY = isXuat ? "Giá sỉ" : "Giá vốn";
      giaEl.placeholder = defaultGia > 0 ? (labelGoiY + ": " + defaultGia.toLocaleString('vi-VN') + "đ") : "Nhập đơn giá";

      if (!_histEditRows[idx] || ma !== _histEditRows[idx].ma) {
        giaEl.dataset.kd = '';
        giaEl.value = '';
        ixShow(giaEl);
      }
    }
  } else {
    var giaEl2 = document.getElementById('hedit-gia-' + idx);
    if (giaEl2) {
      giaEl2.dataset.defaultGia = '';
      giaEl2.placeholder = "Nhập đơn giá"; // Trả về mặc định nếu sai mã
    }
    el.style.borderColor = ma ? '#f44336' : '#e0e0e0';
    if (!ma) hnEl.innerHTML = '';
  }
}

function _heditBlankRow() {
  const g = _historyGroups[_histEditIdx] || {};
  return {
    ma: '', thoigian: g.thoigian || '', ncc: '', hanghoa: '', kichthuoc: '', dvt: '',
    soluong: 1, gia: 0, giaodich: g.giaodich || '', phichanh: 0, phikhachtra: 0,
    ghichu: '', tenkhach: g.tenkhach || '', nguoighi: '',
    _origMa: '', _origSl: 0, _origGia: 0
  };
}

function _heditSyncRows() {
  _histEditRows = _histEditRows.map(function(r, i) {
    return {
      ...r,
      ma: ((document.getElementById('hedit-ma-' + i)?.value) ?? r.ma).trim(),
      soluong: parseFloat(document.getElementById('hedit-sl-' + i)?.value) || r.soluong,
      gia: parseNum(document.getElementById('hedit-gia-' + i)?.value) || 0
    };
  });
}

function _renderHistEditRows() {
  const group = _historyGroups[_histEditIdx] || {};
  const isXuat = group.loai === 'Xuất' || group.loai === 'Nháp';
  const labelGoiY = isXuat ? "Giá sỉ" : "Giá vốn";

  document.getElementById('hedit-rows').innerHTML = _histEditRows.map((r, i) => {
    const p = products.find(x => x.ma === r.ma) || null;

    // Dùng parseNum để ép kiểu số tuyệt đối an toàn
    let giaGoiYVal = 0;
    if (p) {
        giaGoiYVal = isXuat ? parseNum(p.giasi) : parseNum(p.giavon);
    }

    const displayGoiY = giaGoiYVal > 0 ? `${labelGoiY}: ${giaGoiYVal.toLocaleString('vi-VN')}đ` : `Nhập đơn giá`;

    const total = r.gia > 0 && r.soluong > 0 ? Number(r.gia * r.soluong).toLocaleString('en-US') + 'đ' : '';
    return `
    <div id="hedit-row-${i}" style="border:1px solid #e8e8e8;border-radius:10px;padding:8px 10px;margin-bottom:12px;background: rgba(245, 250, 246, 0.5);margin-top: -3px;">
      <div class="hedit-row-top" style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
        <span style="font-size:11px;color:#aaa;font-weight:600;white-space:nowrap;">#${r._num || (i+1)}</span>
        <input type="text" id="hedit-ma-${i}" value="${_esc(r.ma)}" placeholder="Mã SP" oninput="heditMaChange(this,${i})"
          style="width:75px;padding:6px 5px;border:1px solid #e8e8e8;border-radius:5px;font-size:13px;outline:none;background:#fafafa;text-align:center;box-sizing:border-box;flex-shrink:0;">
        <div id="hedit-hn-${i}" class="hedit-hn">
          ${_heditDisplayHtml(p, r)}
        </div>
        <button onclick="heditRemoveRow(${i})" title="Xóa sản phẩm" class="hedit-trash" style="background:none;border:none;color:#f44336;cursor:pointer;padding:0 2px;line-height:1;flex-shrink:0;">
          <svg width="14" height="14" viewBox="0 0 24 22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M8 6V4h8v2"></path><path d="M6 6l1 14h10l1-14"></path><path d="M10 11v6"></path><path d="M14 11v6"></path></svg>
        </button>
      </div>
      <div style="display:flex;align-items:center;gap:6px;">
        <input type="number" id="hedit-sl-${i}" value="${r.soluong}" placeholder="SL"
          style="width:70px;padding:6px;border:1px solid #e0e0e0;border-radius:8px;font-size:13px;outline:none;text-align:center;" min="0">
        <span style="color:#bbb;font-size:14px;">×</span>
        <div style="position:relative;flex:1;">
          <input type="text" inputmode="numeric" id="hedit-gia-${i}"
            value="${r.gia > 0 ? Number(r.gia).toLocaleString('en-US') : ''}"
            placeholder="${displayGoiY}"
            data-kd="${r.gia > 0 ? Math.floor(r.gia/1000) : ''}"
            style="width:100%;padding:6px 22px 6px 10px;border:1px solid #e0e0e0;border-radius:8px;font-size:13px;outline:none;box-sizing:border-box;"
            oninput="fmtInputK(this);ixShow(this)">
          <button class="ix" tabindex="-1" onclick="ixClear(this.previousElementSibling)"
            style="display:${r.gia > 0 ? 'inline-block' : 'none'};position:absolute;right:4px;top:50%;transform:translateY(-50%);background:none;border:none;padding:2px 3px;cursor:pointer;color:#bbb;font-size:11px;line-height:1;">✕</button>
        </div>
        <span style="color:#bbb;font-size:14px;">=</span>
        <span style="font-size:13px;font-weight:600;color:#2e7d32;white-space:nowrap;min-width:72px;text-align:right;">${total}</span>
      </div>
    </div>`;
  }).join('');
}

function heditAddRow() {
  _heditSyncRows();
  const blank = _heditBlankRow();
  blank._num = _histEditRows.length + 1;
  _histEditRows.unshift(blank);
  _renderHistEditRows();
}

function heditRemoveRow(idx) {
  _heditSyncRows();
  _histEditRows.splice(idx, 1);
  _renderHistEditRows();
}

function histEditGroup(idx) {
  const g = _historyGroups[idx];
  if (!g) return;
  _histEditIdx = idx;
  const isXuat = g.loai === 'Xuất' || g.loai === 'Nháp';

  const xuatBtn = document.getElementById('hedit-xuat-btn');
  if (xuatBtn) { xuatBtn.style.display = g.loai === 'Nháp' ? 'flex' : 'none'; }

  document.getElementById('hedit-info').textContent = g.loai + ' · ' + formatHistoryTimeText(g);

  const tw = document.getElementById('hedit-tenkhach-wrap');
  tw.style.display = isXuat ? 'block' : 'none';
  if (isXuat) document.getElementById('hedit-tenkhach').value = g.tenkhach || '';

  document.getElementById('hedit-giaodich').value = g.giaodich || '';

  const _hpc = document.getElementById('hedit-phichanh');
  if (_hpc) {
    const absVal = Math.abs((g.rows[0] && g.rows[0].phichanh) || 0);
    const kd = absVal > 0 ? Math.floor(absVal / 1000) : 0;
    _hpc.dataset.kd = kd > 0 ? String(kd) : '';
    _hpc.value = kd > 0 ? (kd * 1000).toLocaleString('en-US') : '';
    ixShow(_hpc);
  }

  const _hpktWrap = document.getElementById('hedit-phikhachtra-wrap');
  if (_hpktWrap) {
    _hpktWrap.style.display = isXuat ? 'block' : 'none';
    if (isXuat) {
      const _hpkt = document.getElementById('hedit-phikhachtra');
      if (_hpkt) {
        const v = g.rows[0] ? (Number(g.rows[0].phikhachtra) || 0) : 0;
        const kd2 = v > 0 ? Math.floor(v / 1000) : 0;
        _hpkt.dataset.kd = kd2 > 0 ? String(kd2) : '';
        _hpkt.value = kd2 > 0 ? (kd2 * 1000).toLocaleString('en-US') : '';
        ixShow(_hpkt);
      }
    }
  }

  const _hknWrap = document.getElementById('hedit-khachno-wrap');
  if (_hknWrap) {
    _hknWrap.style.display = isXuat ? 'block' : 'none';
    if (isXuat) {
      const _hkn = document.getElementById('hedit-khachno');
      if (_hkn) {
        const v = g.rows.reduce((s, r) => s + (Number(r.khachno) || 0), 0);
        const kd = v > 0 ? Math.floor(v / 1000) : 0;
        _hkn.dataset.kd = kd > 0 ? String(kd) : '';
        _hkn.value = kd > 0 ? (kd * 1000).toLocaleString('en-US') : '';
        ixShow(_hkn);
      }
    }
  }

  const _hnnWrap = document.getElementById('hedit-noncc-wrap');
  if (_hnnWrap) {
    _hnnWrap.style.display = !isXuat ? 'block' : 'none';
    if (!isXuat) {
      const _hnn = document.getElementById('hedit-noncc');
      if (_hnn) {
        const v = g.rows.reduce((s, r) => s + (Number(r.noncc) || 0), 0);
        const kd = v > 0 ? Math.floor(v / 1000) : 0;
        _hnn.dataset.kd = kd > 0 ? String(kd) : '';
        _hnn.value = kd > 0 ? (kd * 1000).toLocaleString('en-US') : '';
        ixShow(_hnn);
      }
    }
  }

  const ghichuEl = document.getElementById('hedit-ghichu');
  if (ghichuEl) {
    ghichuEl.value = (g.rows[0] && g.rows[0].ghichu) ? g.rows[0].ghichu : '';
    ixShow(ghichuEl);
  }

  _histEditRows = g.rows.map((r, i) => ({
    ...r,
    _num: i + 1,
    _origMa: r.ma || '',
    _origSl: Number(r.soluong) || 0,
    _origGia: Number(r.gia) || 0
  }));
  _renderHistEditRows();

  const saveBtn = document.getElementById('hedit-save-btn');
  if (saveBtn) { saveBtn.disabled = false; saveBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:6px;"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> Lưu'; }

  const m = document.getElementById('hist-edit-modal');
  m.style.display = 'flex';
}

async function histSaveEdit() {
  const g = _historyGroups[_histEditIdx];
  if (!g) return;
  const isXuat  = g.loai === 'Xuất';
  const isDraft = g.loai === 'Nháp';

  const newTenkhach = (isXuat || isDraft) ? (document.getElementById('hedit-tenkhach').value || '').trim() : '';
  const newGiaodich = document.getElementById('hedit-giaodich').value || '';
  const newPhiChanh = parseNum(document.getElementById('hedit-phichanh')?.value) || 0;
  const newPhiKhachTra = (isXuat || isDraft) ? (parseNum(document.getElementById('hedit-phikhachtra')?.value) || 0) : 0;
  const newKhachNo = (isXuat || isDraft) ? (parseNum(document.getElementById('hedit-khachno')?.value) || 0) : 0;
  const newNoNCC = (!isXuat && !isDraft) ? (parseNum(document.getElementById('hedit-noncc')?.value) || 0) : 0;

  // BƯỚC 1: KIỂM TRA LỖI TỒN KHO TRƯỚC (Quét trực tiếp từ giao diện, CHƯA ghi vào bộ nhớ tạm)
  if (isXuat || isDraft) { // Bổ sung kiểm tra cả phiếu Nháp để tránh giữ hàng lố
    const overItems = [];
    const overIndices = [];
    const overMas = [];

    _histEditRows.forEach(function(r, i) {
      const ma = ((document.getElementById('hedit-ma-' + i)?.value) ?? r.ma).trim() || r.ma;
      const p = products.find(function(x) { return x.ma === ma; });
      const sl = parseFloat(document.getElementById('hedit-sl-' + i)?.value) || r.soluong;

      if (p) {
        // Ưu tiên kiểm tra với Khả dụng (nếu có), không có mới dùng Tồn kho
        const baseStock = parseFloat(p.khadung !== undefined ? p.khadung : p.tonkho) || 0;
        const origSl = (ma === r._origMa) ? (parseFloat(r._origSl) || 0) : 0;

        const effectiveTk = baseStock + origSl;

        if (sl > effectiveTk) {
          const label = (p.ncc ? p.ncc + ' - ' : '') + p.ten + (p.kichthuoc ? ' - ' + p.kichthuoc : '');
          overItems.push(label + ' | Cho phép: ' + fmt(effectiveTk) + (p.dvt ? ' ' + p.dvt : '') + ', Đang nhập: ' + fmt(sl));
          overIndices.push(i);
          overMas.push(ma);
        }
      }
    });

    if (overItems.length > 0) {
      overIndices.forEach(function(i) {
        var rowEl = document.getElementById('hedit-row-' + i);
        if (rowEl) rowEl.classList.add('cart-warn');
      });
      const saveBtn2 = document.getElementById('hedit-save-btn');
      if (saveBtn2) { saveBtn2.disabled = false; saveBtn2.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:6px;"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> Lưu'; }
      showInfoModal('Vượt số lượng cho phép!', '<div style="border:1.5px solid #f44336;border-radius:8px;padding:8px 12px;text-align:left;font-size:13px;line-height:1.7;word-break:break-word;">' + overItems.join('<br>') + '</div>', overMas);
      return; // Chặn đứng ngay lập tức, bộ nhớ App vẫn giữ số lượng gốc đúng chuẩn
    }
  }

  // BƯỚC 2: VƯỢT QUA HẾT LỖI MỚI CHO PHÉP ĐỒNG BỘ VÀO BỘ NHỚ
  _heditSyncRows();

  if (_histEditRows.length === 0) {
    showInfoModal('Thiếu sản phẩm!', 'Vui lòng giữ ít nhất 1 sản phẩm trong giao dịch.');
    return;
  }
  const emptyMaIdx = _histEditRows.findIndex(r => !r.ma);
  if (emptyMaIdx >= 0) {
    showInfoModal('Thiếu mã SP!', 'Vui lòng nhập mã sản phẩm cho SP #' + (emptyMaIdx + 1) + '.');
    return;
  }

  // BƯỚC 3: KIỂM TRA CẢNH BÁO GIÁ
  if (isXuat) {
    const lowGiaRows = _histEditRows.filter(function(r, i) {
      const p = products.find(function(x) { return x.ma === r.ma; });
      const giaNhap = parseNum(document.getElementById('hedit-gia-' + i)?.value);
      const giaSi = p ? parseNum(p.giasi) : 0;
      return giaNhap > 0 && giaNhap !== (Number(r._origGia) || 0) && giaSi > 0 && giaNhap < giaSi;
    });
    if (lowGiaRows.length > 0) {
      const warnLines = lowGiaRows.map(function(r) {
        const p = products.find(function(x) { return x.ma === r.ma; }) || r;
        const extra = p.kichthuoc || '';
        return [p.ncc, p.ma, p.ten || p.hanghoa].filter(Boolean).join('-') + (extra ? ' - ' + extra : '');
      });
      const subHtml = '<div style="border:1.5px solid #f44336;border-radius:8px;padding:8px 12px;text-align:left;font-size:13px;line-height:1.7;word-break:break-word;">' + warnLines.join('<br>') + '</div>';
      const warnMas = lowGiaRows.map(function(r) { return r.ma; });
      showModal('Giá bán thấp hơn giá sỉ!', subHtml, _doHistSaveEdit, warnMas);
      return;
    }
  }

  // BƯỚC 4: LƯU LÊN GOOGLE SHEET
  _doHistSaveEdit();
}

async function _doHistSaveEdit() {
  const g = _historyGroups[_histEditIdx];
  if (!g) return;
  const editTimeKey = historyTimeKey(g.thoigian || g.thoigian_raw);
  const isXuat  = g.loai === 'Xuất';
  const isDraft = g.loai === 'Nháp';
  const newTenkhach = (isXuat || isDraft) ? (document.getElementById('hedit-tenkhach').value || '').trim() : '';
  const newGiaodich = document.getElementById('hedit-giaodich').value || '';
  const newPhiChanh = parseNum(document.getElementById('hedit-phichanh')?.value) || 0;
  const newPhiKhachTra = (isXuat || isDraft) ? (parseNum(document.getElementById('hedit-phikhachtra')?.value) || 0) : 0;

  const newKhachNo = (isXuat || isDraft) ? (parseNum(document.getElementById('hedit-khachno')?.value) || 0) : 0;
  const newNoNCC = (!isXuat && !isDraft) ? (parseNum(document.getElementById('hedit-noncc')?.value) || 0) : 0;
  const newGhichu = (document.getElementById('hedit-ghichu')?.value || '').trim();
  const updatedRows = [];
  const notes = [];
  const today = new Date();
  const dateStr = today.getDate().toString().padStart(2,'0') + '/' + (today.getMonth()+1).toString().padStart(2,'0') + '/' + today.getFullYear();

  _histEditRows.forEach((r, i) => {
    const newMa   = ((document.getElementById('hedit-ma-' + i)?.value) ?? r.ma).trim() || r.ma;
    const foundP  = products.find(function(x) { return x.ma === newMa; });
    const hanghoa = foundP ? foundP.ten : r.hanghoa;
    const dvt     = foundP ? (foundP.dvt || '') : r.dvt;
    const ncc     = foundP ? (foundP.ncc || '') : r.ncc;
    const kichthuoc = foundP ? (foundP.kichthuoc || '') : r.kichthuoc;
    const soluong = parseFloat(document.getElementById('hedit-sl-' + i)?.value) || r.soluong;
    const giaEl   = document.getElementById('hedit-gia-' + i);
    const giaNhap = parseNum(giaEl?.value);
    const giaMacDinh = parseNum(giaEl?.dataset.defaultGia) || (foundP ? ((isXuat || isDraft) ? parseNum(foundP.giasi) : parseNum(foundP.giavon)) : 0);
    const gia     = giaNhap > 0 ? giaNhap : (giaMacDinh || r.gia);

    const changes = [];
    if (newMa !== r._origMa)             changes.push('Mã: ' + (r._origMa || '') + '→' + newMa);
    if (soluong !== r._origSl)           changes.push('SL: ' + (r._origSl || 0) + '→' + soluong);
    if (gia !== r._origGia)              changes.push('Giá: ' + (r._origGia || 0) + '→' + gia);
    if (newGiaodich !== r.giaodich)      changes.push('GD: ' + r.giaodich + '→' + newGiaodich);
    if (isXuat && newTenkhach !== (r.tenkhach || '')) changes.push('Khách: ' + (r.tenkhach||'') + '→' + newTenkhach);
    if (i === 0) {
      const oldPhi = Math.abs(r.phichanh || 0);
      if (newPhiChanh !== oldPhi) changes.push('Phí VC: ' + oldPhi + '→' + newPhiChanh);
      if (isXuat || isDraft) {
        const oldPkt = Number(r.phikhachtra) || 0;
        if (newPhiKhachTra !== oldPkt) changes.push('Phí KT: ' + oldPkt + '→' + newPhiKhachTra);
        const oldKN = Number(r.khachno) || 0;
        if (newKhachNo !== oldKN) changes.push('Khách Nợ: ' + oldKN + '→' + newKhachNo);
      } else {
        const oldNN = Number(r.noncc) || 0;
        if (newNoNCC !== oldNN) changes.push('Nợ NCC: ' + oldNN + '→' + newNoNCC);
      }
    }

    const changeNote = changes.length > 0 ? changes.join('; ') + '; ' + dateStr : '';
    notes.push('');
    const storedPhi = i === 0 ? (newPhiChanh ? ((isXuat || isDraft) ? -newPhiChanh : newPhiChanh) : '') : '';
    const storedPkt = i === 0 && (isXuat || isDraft) ? (newPhiKhachTra || '') : '';
    const storedKN  = i === 0 && (isXuat || isDraft) ? (newKhachNo || '') : '';
    const storedNN  = i === 0 && (!isXuat && !isDraft) ? (newNoNCC || '') : '';
    const ghichuStr = changeNote ? (newGhichu ? newGhichu + ' | ' + changeNote : changeNote) : newGhichu;
    const nguoiGhiStr = r.nguoighi || currentUserName;
    if (isXuat || isDraft) {
      updatedRows.push([newMa, editTimeKey, ncc, hanghoa, kichthuoc, dvt, soluong, gia, newGiaodich, storedPhi, storedPkt, storedKN, '', newTenkhach, ghichuStr, nguoiGhiStr]);
    } else {
      updatedRows.push([newMa, editTimeKey, ncc, hanghoa, kichthuoc, dvt, soluong, gia, newGiaodich, storedPhi, storedNN, '', ghichuStr]);
    }
  });

  const saveBtn = document.getElementById('hedit-save-btn');
  if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = '\u0110ang l\u01B0u...'; }
  const requestId = 'upd_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);

  fetch(SCRIPT_URL + '?token=inox2026xK9m', {
    method: 'POST', mode: 'no-cors',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sheet: g.loai, action: 'updateHistoryRows', thoigian: g.thoigian, thoigian_key: editTimeKey, rows: updatedRows, matchRows: buildHistoryMatchRows(g.rows), notes, request_id: requestId, token: 'inox2026xK9m' })
  }).catch(function() {
    showToast('⚠️ Lỗi kết nối, dữ liệu có thể chưa được lưu.');
  });

  // Cập nhật _historyData local
  const targetOrderKey = _orderKey((g.rows && g.rows[0]) ? g.rows[0] : g);
  _historyData = _historyData.filter(r => _orderKey(r) !== targetOrderKey);
  updatedRows.forEach(row => _historyData.push(_mapHistRow(row, g.loai)));
  _saveHistoryCache();

  document.getElementById('hist-edit-modal').style.display = 'none';
  _renderHistory();
  showToast('\u2705 \u0110\u00E3 l\u01B0u thay \u0111\u1ED5i.');
  _historyStale = true;
  if (document.getElementById('screen-history-detail').classList.contains('active') && _histDetailIdx >= 0) {
    const g = _historyGroups[_histDetailIdx];
    if (g) { showHistoryDetail(_histDetailIdx); } else { showHistory(); }
  }
  if (_afterHistSaveFn) { const fn = _afterHistSaveFn; _afterHistSaveFn = null; fn(); }
}

async function histDeleteGroup(idx) {
  const g = _historyGroups[idx];
  if (!g) return;
  const deleteTimeKey = historyTimeKey(g.thoigian || g.thoigian_raw);
  const total = g.rows.reduce((s, r) => s + r.soluong * r.gia, 0);
  if (!confirm('X\u00F3a giao d\u1ECBch ' + g.loai + ' \u2013 ' + g.rows.length + ' SP \u2013 ' + total.toLocaleString('en-US') + ' \u0111?\nH\u00E0nh \u0111\u1ED9ng n\u00E0y kh\u00F4ng th\u1EC3 ho\u00E0n t\u00E1c!')) return;

  const requestId = 'del_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
  fetch(SCRIPT_URL + '?token=inox2026xK9m', {
    method: 'POST', mode: 'no-cors',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sheet: g.loai, action: 'deleteHistoryRows', thoigian: g.thoigian, thoigian_key: deleteTimeKey, matchRows: buildHistoryMatchRows(g.rows), request_id: requestId, token: 'inox2026xK9m' })
  }).catch(() => { showToast('⚠️ Lỗi kết nối, dữ liệu có thể chưa được lưu.'); });

  const targetOrderKey = _orderKey((g.rows && g.rows[0]) ? g.rows[0] : g);
  _historyData = _historyData.filter(r => _orderKey(r) !== targetOrderKey);
  _saveHistoryCache();
  _renderHistory();
  showToast('🗑︎ Đã xóa giao dịch.');
  _historyStale = true;
}

// ===== NHÁP =====
async function dtSaveDraft() {
  if (dtCart.length === 0) { showInfoModal('Giỏ trống!', 'Thêm ít nhất 1 sản phẩm.'); return; }
  for (const item of dtCart) {
    if (!item.sl || item.sl <= 0) { showInfoModal('Thiếu thông tin!', 'Vui lòng nhập số lượng cho: ' + item.product.ten); return; }
    if (!item.gia || item.gia <= 0) item.gia = Number(item.product.giasi) || 0;
  }
  if (!(document.getElementById('dt-ghichu')?.value || '').trim()) { showInfoModal('Thiếu tên khách!', 'Vui lòng nhập tên khách trước khi lưu nháp.'); return; }
  const draftBtn = document.getElementById('dt-btn-draft');
  if (draftBtn) { draftBtn.disabled = true; draftBtn.innerHTML = '⏳ Đang lưu...'; }
  const now = new Date();
  const thoiGian = fmtTime(now);
  const giaodich = document.getElementById('dt-giaodich')?.value || '';
  const ghichu   = (document.getElementById('dt-ghichu')?.value || '').trim();
  const xuatGhiChu = (document.getElementById('dt-xuatghichu')?.value || '').trim();
  const phiChanh = parseInt((document.getElementById('dt-phichanh')?.value || '').replace(/[^0-9]/g,'')) || 0;
  const phiKhachTra = parseInt((document.getElementById('dt-phikhachtra')?.value || '').replace(/[^0-9]/g,'')) || 0;
  const khachNo = parseInt((document.getElementById('dt-khachno')?.value || '').replace(/[^0-9]/g,'')) || 0;
  const cols = CONFIG.export_columns;
  const rows = dtCart.map((item, idx) => cols.map(col => {
    if (col.value === 'auto_timestamp')   return thoiGian;
    if (col.value === 'form.soluong')     return item.sl;
    if (col.value === 'form.gia')         return item.gia;
    if (col.value === 'form.giaodich')    return giaodich;
    if (col.value === 'form.phichanh')    return idx === 0 ? (phiChanh ? -phiChanh : '') : '';
    if (col.value === 'form.phikhachtra') return idx === 0 ? (phiKhachTra || '') : '';
    if (col.value === 'form.khachno')     return idx === 0 ? (khachNo || '') : '';
    if (col.value === 'form.ghichu')      return ghichu;
    if (col.value === 'form.xuatghichu')  return xuatGhiChu || '';
    if (col.value.startsWith('product.')) return item.product[col.value.replace('product.','')] || '';
    return '';
  }));
  fetch(SCRIPT_URL + '?token=inox2026xK9m', {
    method: 'POST', mode: 'no-cors',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sheet: 'Nháp', rows, token: 'inox2026xK9m' ,user_name: currentUserName })
  }).catch(() => { showToast('⚠️ Lỗi kết nối, vui lòng kiểm tra mạng.'); });
  const totalItems = dtCart.length;
  const totalQty = dtCart.reduce((s, x) => s + (Number(x.sl) || 0), 0);
  const totalAmount = dtCart.reduce((s, x) => s + (Number(x.sl) || 0) * (Number(x.gia) || 0), 0);
  rows.forEach(row => _historyData.push(_mapHistRow(row, 'Nháp')));
  _historyStale = true;
  _saveHistoryCache();
  dtCart = [];
  document.getElementById('dt-giaodich').value = '';
  document.getElementById('dt-phichanh').value = '';
  document.getElementById('dt-phikhachtra').value = '';
  const _dtknClr = document.getElementById('dt-khachno'); if (_dtknClr) _dtknClr.value = '';
  const _dtnClr = document.getElementById('dt-noncc'); if (_dtnClr) _dtnClr.value = '';
  document.getElementById('dt-ghichu').value = '';
  document.getElementById('dt-xuatghichu').value = '';
  saveCart();
  if (draftBtn) { draftBtn.disabled = false; draftBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="9" y="2" width="6" height="4" rx="1"/><path d="M9 4H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2"/></svg> Lưu nháp'; }
  dtSetMode(dtMode);
  dtRenderCart();
  dtFilterProducts();
  document.getElementById('dt-success-title').innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" "><rect x="9" y="2" width="6" height="4" rx="1"/><path d="M9 4H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2"/></svg>Lưu nháp thành công!';
  document.getElementById('dt-success-sub').textContent = thoiGian;
  document.getElementById('dt-success-detail').innerHTML = `
    <div class="info-row"><span class="info-label">Sản phẩm</span><span class="info-value">${totalItems}</span></div>
    <div class="info-row"><span class="info-label">Tổng số lượng</span><span class="info-value">${totalQty}</span></div>
    <div class="info-row"><span class="info-label">Tổng tiền</span><span class="info-value green">${fmt(totalAmount)} đ</span></div>
    <div class="info-row"><span class="info-label">Giao dịch</span><span class="info-value">${giaodich}</span></div>
    ${phiChanh > 0 ? `<div class="info-row"><span class="info-label">Phí vận chuyển</span><span class="info-value">${fmt(phiChanh)} đ</span></div>` : ''}
    ${phiKhachTra > 0 ? `<div class="info-row"><span class="info-label">Phí KH trả</span><span class="info-value">${fmt(phiKhachTra)} đ</span></div>` : ''}
    ${ghichu ? `<div class="info-row"><span class="info-label">Tên khách</span><span class="info-value">${ghichu}</span></div>` : ''}
  `;
  document.getElementById('dt-success-overlay').style.display = 'flex';
}

async function saveDraft() {
  if (cart.length === 0) return;
  for (const item of cart) {
    if (!item.sl || item.sl <= 0) { showInfoModal('Thiếu thông tin!', 'Vui lòng nhập số lượng cho: ' + item.product.ten); return; }
    if (!item.gia || item.gia <= 0) item.gia = Number(item.product.giasi) || 0;
  }
  if (!(document.getElementById('cart-ghichu')?.value || '').trim()) { showInfoModal('Thiếu tên khách!', 'Vui lòng nhập tên khách trước khi lưu nháp.'); return; }
  const draftBtn = document.getElementById('btn-cart-draft');
  if (draftBtn) { draftBtn.disabled = true; draftBtn.innerHTML = '⏳ Đang lưu...'; }
  const now = new Date();
  const thoiGian = fmtTime(now);
  const giaodich = document.getElementById('cart-giaodich')?.value || '';
  const ghichu   = (document.getElementById('cart-ghichu')?.value || '').trim();
  const xuatGhiChu = (document.getElementById('cart-xuatghichu')?.value || '').trim();
  const phiChanh = getInputNum('cart-phichanh');
  const phiKhachTra = getInputNum('cart-phikhachtra');
  const khachNo = getInputNum('cart-khachno');
  const cols = CONFIG.export_columns;
  const rows = cart.map((item, idx) => cols.map(col => {
    if (col.value === 'auto_timestamp')   return thoiGian;
    if (col.value === 'form.soluong')     return item.sl;
    if (col.value === 'form.gia')         return item.gia;
    if (col.value === 'form.giaodich')    return giaodich;
    if (col.value === 'form.phichanh')    return idx === 0 ? (phiChanh ? -phiChanh : '') : '';
    if (col.value === 'form.phikhachtra') return idx === 0 ? (phiKhachTra || '') : '';
    if (col.value === 'form.khachno')     return idx === 0 ? (khachNo || '') : '';
    if (col.value === 'form.ghichu')      return ghichu;
    if (col.value === 'form.xuatghichu')  return xuatGhiChu || '';
    if (col.value.startsWith('product.')) return item.product[col.value.replace('product.','')] || '';
    return '';
  }));
  fetch(SCRIPT_URL + '?token=inox2026xK9m', {
    method: 'POST', mode: 'no-cors',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sheet: 'Nháp', rows, token: 'inox2026xK9m' ,user_name: currentUserName })
  }).catch(() => { showToast('⚠️ Lỗi kết nối, vui lòng kiểm tra mạng.'); });
  const totalItems = cart.length;
  const totalQty = cart.reduce((s, x) => s + (Number(x.sl) || 0), 0);
  const totalAmount = cart.reduce((s, x) => s + (Number(x.sl) || 0) * (Number(x.gia) || 0), 0);
  rows.forEach(row => _historyData.push(_mapHistRow(row, 'Nháp')));
  _historyStale = true;
  _saveHistoryCache();
  cart = []; cartGiaodich = '';
  document.getElementById('cart-ghichu').value = '';
  document.getElementById('cart-xuatghichu').value = '';
  document.getElementById('cart-phichanh').value = '';
  document.getElementById('cart-phikhachtra').value = '';
  const _cknClr2 = document.getElementById('cart-khachno'); if (_cknClr2) _cknClr2.value = '';
  const _gdt = document.getElementById('cart-giaodich');
  if (_gdt) _gdt.value = '';
  updateCartBadge(); saveCart();
  filterProductList();
  if (draftBtn) { draftBtn.disabled = false; draftBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="9" y="2" width="6" height="4" rx="1"/><path d="M9 4H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2"/></svg> Lưu nháp'; }
  document.getElementById('success-title').innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" "><rect x="9" y="2" width="6" height="4" rx="1"/><path d="M9 4H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2"/></svg>Lưu nháp thành công!';
  document.getElementById('success-sub').textContent = thoiGian;
  document.getElementById('success-detail').innerHTML = `
    <div class="info-row"><span class="info-label">Sản phẩm</span><span class="info-value">${totalItems}</span></div>
    <div class="info-row"><span class="info-label">Tổng số lượng</span><span class="info-value">${totalQty}</span></div>
    <div class="info-row"><span class="info-label">Tổng tiền</span><span class="info-value green">${fmt(totalAmount)} đ</span></div>
    <div class="info-row"><span class="info-label">Giao dịch</span><span class="info-value">${giaodich}</span></div>
    ${phiChanh > 0 ? `<div class="info-row"><span class="info-label">Phí vận chuyển</span><span class="info-value">${fmt(phiChanh)} đ</span></div>` : ''}
    ${phiKhachTra > 0 ? `<div class="info-row"><span class="info-label">Phí KH trả</span><span class="info-value">${fmt(phiKhachTra)} đ</span></div>` : ''}
    ${ghichu ? `<div class="info-row"><span class="info-label">Tên khách</span><span class="info-value">${ghichu}</span></div>` : ''}
  `;
  showScreen('screen-success');
}

function _heditXuatDraft() {
  const g = _historyGroups[_histEditIdx];
  if (!g || g.loai !== 'Nháp') return;
  const sp = _histEditRows.length;
  const total = _histEditRows.reduce((s, r) => s + (parseFloat(r.soluong) || 0) * (parseFloat(r.gia) || 0), 0);
  if (!confirm('Xác nhận Xuất đơn nháp này?\n' + sp + ' SP · ' + total.toLocaleString('en-US') + ' đ')) return;
  _afterHistSaveFn = function() { _doDraftConfirmSkip(_histEditIdx); };
  histSaveEdit();
}

async function _doDraftConfirmSkip(idx) {
  const g = _historyGroups[idx];
  if (!g || g.loai !== 'Nháp') return;
  const giaodich = (g.rows[0] && g.rows[0].giaodich) || '';
  const draftTimeKey = historyTimeKey(g.thoigian || g.thoigian_raw);
  const _nowTs = fmtTime(new Date());
  const rows = g.rows.map(r => [r.ma, _nowTs, r.ncc, r.hanghoa, r.kichthuoc, r.dvt, r.soluong, r.gia, giaodich || r.giaodich, r.phichanh || '', r.phikhachtra || '', r.khachno || '', '', r.tenkhach || '', r.ghichu || '', currentUserName]);
  const targetOrderKey = _orderKey((g.rows && g.rows[0]) ? g.rows[0] : g);
  _historyData = _historyData.filter(r => _orderKey(r) !== targetOrderKey);
  rows.forEach(row => _historyData.push(_mapHistRow(row, 'Xuất')));
  _saveHistoryCache();
  _renderHistory();
  showToast('<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>Đã xác nhận Xuất.');
  if (document.getElementById('screen-history-detail').classList.contains('active')) showHistory();
  const requestIdDraftDelete = 'del_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
  fetch(SCRIPT_URL + '?token=inox2026xK9m', {
    method: 'POST', mode: 'no-cors',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({sheet:'Nháp', action:'deleteHistoryRows', thoigian:g.thoigian, thoigian_key:draftTimeKey, matchRows: buildHistoryMatchRows(g.rows), request_id: requestIdDraftDelete, token:'inox2026xK9m', user_name: currentUserName})
  }).catch(e => console.log(e));
  fetch(SCRIPT_URL + '?token=inox2026xK9m', {
    method: 'POST', mode: 'no-cors',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({sheet:'Xuất', rows, token:'inox2026xK9m', user_name: currentUserName})
  }).catch(e => console.log(e));
}

async function confirmDraftToXuat(idx) {
  const g = _historyGroups[idx];
  if (!g || g.loai !== 'Nháp') return;
  // Kiểm tra tồn kho
  const overItems = [];
  g.rows.forEach(r => {
    const p = products.find(x => x.ma === r.ma);
    const tk = p ? (Number(p.tonkho) || 0) : 0;
    if (p && r.soluong > tk) overItems.push((p.ncc ? p.ncc + ' - ' : '') + p.ten + ' | Tồn: ' + fmt(tk) + (p.dvt ? ' ' + p.dvt : '') + ', Xuất: ' + fmt(r.soluong));
  });
  if (overItems.length > 0) {
    const subHtml = '<div style="border:1.5px solid #f44336;border-radius:8px;padding:8px 12px;text-align:left;font-size:13px;line-height:1.7;">' + overItems.join('<br>') + '</div>';
    showInfoModal('Vượt tồn kho!', subHtml, overItems.map(x => x.split('|')[0].trim()));
    return;
  }
  const existingGd = (g.rows[0] && g.rows[0].giaodich) || '';
  if (!existingGd) {
    const subHtml = '<div style="display:flex;flex-direction:column;gap:8px;margin-top:8px;">' +
      ['Tiền mặt', 'Chuyển khoản', 'Tiền mặt + Chuyển khoản'].map(function(gd) {
        return '<button onclick="document.getElementById(\'modal-overlay\').style.display=\'none\';_doDraftConfirm(' + idx + ',\'' + gd + '\')" style="padding:10px 16px;border:1.5px solid #e0e0e0;border-radius:10px;background:#fafafa;font-size:14px;font-weight:500;cursor:pointer;">' + gd + '</button>';
      }).join('') + '</div>';
    showInfoModal('Chọn hình thức giao dịch', subHtml, ['_']);
    return;
  }
  _doDraftConfirm(idx, existingGd);
}

async function _doDraftConfirm(idx, giaodich) {
  const g = _historyGroups[idx];
  if (!g || g.loai !== 'Nháp') return;
  if (!confirm('Xác nhận Xuất đơn nháp này?\n' + g.rows.length + ' SP · ' + g.rows.reduce((s,r)=>s+r.soluong*r.gia,0).toLocaleString('en-US') + ' đ')) return;

  const draftTimeKey = historyTimeKey(g.thoigian || g.thoigian_raw);
  const _nowTs = fmtTime(new Date());
  const rows = g.rows.map(r => [r.ma, _nowTs, r.ncc, r.hanghoa, r.kichthuoc, r.dvt, r.soluong, r.gia, giaodich || r.giaodich, r.phichanh || '', r.phikhachtra || '', r.khachno || '', '', r.tenkhach || '', r.ghichu || '', currentUserName]);

  // 1. CẬP NHẬT GIAO DIỆN NGAY LẬP TỨC (Không chờ server)
  const targetOrderKey = _orderKey((g.rows && g.rows[0]) ? g.rows[0] : g);
  _historyData = _historyData.filter(r => _orderKey(r) !== targetOrderKey);
  rows.forEach(row => _historyData.push(_mapHistRow(row, 'Xuất')));
  _saveHistoryCache();
  _renderHistory();
  showToast('<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>Đã xác nhận Xuất.');
  _historyStale = true;
  if (document.getElementById('screen-history-detail').classList.contains('active')) showHistory();

  // 2. ÂM THẦM XỬ LÝ TRÊN GOOGLE SHEET Ở BACKGROUND (Đã xóa chữ await)
  // Lệnh xóa Nháp
  const requestIdDraftDelete = 'del_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
  fetch(SCRIPT_URL + '?token=inox2026xK9m', {
    method: 'POST', mode: 'no-cors',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({sheet:'Nháp', action:'deleteHistoryRows', thoigian:g.thoigian, thoigian_key:draftTimeKey, matchRows: buildHistoryMatchRows(g.rows), request_id: requestIdDraftDelete, token:'inox2026xK9m' ,user_name: currentUserName})
  }).catch(e => console.log(e));

  // Lệnh ghi Xuất
  fetch(SCRIPT_URL + '?token=inox2026xK9m', {
    method: 'POST', mode: 'no-cors',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({sheet:'Xuất', rows, token:'inox2026xK9m' ,user_name: currentUserName})
  }).catch(e => console.log(e));
}

function histDetailConfirmDraft() {
  if (_histDetailIdx < 0) return;
  confirmDraftToXuat(_histDetailIdx);
}

(function _syncSearchArrows() {
  const map = {
    'search-history-dropdown'       : 'btn-filter-history',
    'dt-search-history-dropdown'    : 'dt-btn-filter-history',
    'mng-search-history-dropdown'   : 'mng-btn-filter-history',
    'hist-search-history-dropdown'  : 'hist-btn-filter-history',
    'report-search-history-dropdown': 'report-btn-filter-history',
  };
  Object.entries(map).forEach(([ddId, btnId]) => {
    const dd  = document.getElementById(ddId);
    const btn = document.getElementById(btnId);
    if (!dd || !btn) return;
    new MutationObserver(() => {
      btn.classList.toggle('sh-open', dd.style.display !== 'none');
    }).observe(dd, { attributes: true, attributeFilter: ['style'] });
  });
})();

(function _wrapAllSelects() {
  document.querySelectorAll('select').forEach(sel => {
    if (sel.closest('.select-wrap')) return;
    const wrap = document.createElement('div');
    wrap.className = 'select-wrap';
    // Chuyển margin-bottom từ select sang wrapper để ::after căn đúng
    if (sel.style.marginBottom) {
      wrap.style.marginBottom = sel.style.marginBottom;
      sel.style.marginBottom = '0';
    }
    sel.parentNode.insertBefore(wrap, sel);
    wrap.appendChild(sel);
    // Toggle arrow bằng JS (CSS :focus không detect được click đóng dropdown)//
    let _open = false;
    sel.addEventListener('mousedown', function() {
      if (document.activeElement === this) {
        _open = !_open;
        wrap.classList.toggle('s-open', _open);
      }
    });
    sel.addEventListener('focus', function() { _open = true; wrap.classList.add('s-open'); });
    sel.addEventListener('blur',  function() { _open = false; wrap.classList.remove('s-open'); });
    sel.addEventListener('change',function() { _open = false; wrap.classList.remove('s-open'); });
  });
})();

// ===== PHÂN TÍCH CHI TIẾT =====
let _analyticsOpen = false;
function toggleReportAnalytics() {
  _analyticsOpen = !_analyticsOpen;
  const body = document.getElementById('report-analytics-body');
  const arrow = document.getElementById('report-analytics-arrow');
  if (body) body.style.display = _analyticsOpen ? 'flex' : 'none';
  if (arrow) arrow.style.transform = _analyticsOpen ? 'rotate(180deg)' : 'rotate(0deg)';
}

function showAnalyticsModal(type) {
  let overlay = document.getElementById('analytics-modal-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'analytics-modal-overlay';
    overlay.className = 'analytics-modal-overlay';
    overlay.innerHTML = `
      <div class="analytics-modal-box">
        <div class="analytics-modal-header">
          <div class="analytics-modal-title" id="analytics-modal-title"></div>
          <button class="analytics-modal-close" onclick="closeAnalyticsModal()">✕</button>
        </div>
        <div class="analytics-modal-body" id="analytics-modal-body"></div>
      </div>`;
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) closeAnalyticsModal();
    });
    document.body.appendChild(overlay);
  }
  const titleEl = document.getElementById('analytics-modal-title');
  const bodyEl  = document.getElementById('analytics-modal-body');
  let title = '', html = '';
  if (type === 'chart7') {
    title = '📅 Biểu đồ Nhập / Xuất';
    html  = _buildChart7Html('week');
  } else if (type === 'topsp') {
    title = '📦 Sản phẩm bán chạy nhất';
    html  = _buildTopSpHtml();
  } else if (type === 'topln') {
    title = '💰 Sản phẩm lợi nhuận cao nhất';
    html  = _buildTopLnHtml();
  } else if (type === 'topkhach') {
    title = '👤 Khách hàng mua nhiều nhất';
    html  = _buildTopKhachHtml();
  }
  if (titleEl) titleEl.textContent = title;
  if (bodyEl)  bodyEl.innerHTML    = html;
  overlay.classList.add('active');
}

function closeAnalyticsModal() {
  const overlay = document.getElementById('analytics-modal-overlay');
  if (overlay) overlay.classList.remove('active');
}

function _showChartTT(e, label, nhap, xuat) {
  let tt = document.getElementById('chart-tooltip');
  if (!tt) return;
  const fmtV = v => v > 0 ? (v >= 1000000 ? (v/1000000).toFixed(2) + 'M đ' : fmt(v) + ' đ') : '—';
  document.getElementById('chart-tt-label').textContent = label;
  document.getElementById('chart-tt-nhap').textContent  = fmtV(nhap);
  document.getElementById('chart-tt-xuat').textContent  = fmtV(xuat);
  tt.style.display = 'block';
  const x = e.clientX + 14, y = e.clientY - 10;
  tt.style.left = Math.min(x, window.innerWidth  - tt.offsetWidth  - 8) + 'px';
  tt.style.top  = Math.min(y, window.innerHeight - tt.offsetHeight - 8) + 'px';
}
function _hideChartTT() {
  const tt = document.getElementById('chart-tooltip');
  if (tt) tt.style.display = 'none';
}

function _reRenderChart(period) {
  const bodyEl = document.getElementById('analytics-modal-body');
  if (bodyEl) bodyEl.innerHTML = _buildChart7Html(period);
}

function _getChartDateRange(period) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
  if (period === 'week') {
    const off = today.getDay() === 0 ? 6 : today.getDay() - 1;
    return { from: new Date(today.getFullYear(), today.getMonth(), today.getDate() - off), to: endOfDay };
  } else if (period === 'lastweek') {
    const off = today.getDay() === 0 ? 6 : today.getDay() - 1;
    const thisMon = new Date(today.getFullYear(), today.getMonth(), today.getDate() - off);
    const lastMon = new Date(thisMon.getFullYear(), thisMon.getMonth(), thisMon.getDate() - 7);
    const lastSun = new Date(thisMon.getFullYear(), thisMon.getMonth(), thisMon.getDate() - 1, 23, 59, 59);
    return { from: lastMon, to: lastSun };
  } else if (period === 'month') {
    return { from: new Date(today.getFullYear(), today.getMonth(), 1), to: endOfDay };
  } else if (period === 'lastmonth') {
    const from = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const to   = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59);
    return { from, to };
  } else {
    return { from: new Date(today.getFullYear(), 0, 1), to: endOfDay };
  }
}

async function _refreshChartData(period) {
  _setRefreshLoading('chart-refresh-btn', true);
  try {
    await _fetchHistoryData(true, _getChartDateRange(period));
    _reRenderChart(period);
    showToast('Đã làm mới biểu đồ');
  } catch(e) {
    showToast('⚠️ Không thể làm mới dữ liệu');
  } finally {
    _setRefreshLoading('chart-refresh-btn', false);
  }
}

function _buildChart7Html(period) {
  period = period || 'week';
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  let days = [], groupBy = 'day', periodLabel = '', dateRangeLabel = '';

  if (period === 'week') {
    const dow = today.getDay();
    const mondayOffset = dow === 0 ? 6 : dow - 1;
    const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - mondayOffset);
    for (let d = new Date(monday); d <= today; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) days.push(new Date(d));
    periodLabel = 'Tuần này';
    dateRangeLabel = `${monday.getDate()}/${monday.getMonth()+1} – ${today.getDate()}/${today.getMonth()+1}`;
  } else if (period === 'lastweek') {
    const dow = today.getDay();
    const mondayOffset = dow === 0 ? 6 : dow - 1;
    const thisMonday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - mondayOffset);
    const lastMonday = new Date(thisMonday.getFullYear(), thisMonday.getMonth(), thisMonday.getDate() - 7);
    for (let i = 0; i < 7; i++) days.push(new Date(lastMonday.getFullYear(), lastMonday.getMonth(), lastMonday.getDate() + i));
    const lastSun = days[6];
    periodLabel = 'Tuần trước';
    dateRangeLabel = `${lastMonday.getDate()}/${lastMonday.getMonth()+1} – ${lastSun.getDate()}/${lastSun.getMonth()+1}`;
  } else if (period === 'month') {
    for (let i = 1; i <= today.getDate(); i++) days.push(new Date(today.getFullYear(), today.getMonth(), i));
    periodLabel = `Tháng ${today.getMonth()+1}`;
    dateRangeLabel = `1/${today.getMonth()+1} – ${today.getDate()}/${today.getMonth()+1}`;
  } else if (period === 'lastmonth') {
    const lastMonthDays = new Date(today.getFullYear(), today.getMonth(), 0).getDate();
    for (let i = 1; i <= lastMonthDays; i++) days.push(new Date(today.getFullYear(), today.getMonth() - 1, i));
    const lm = today.getMonth() === 0 ? 12 : today.getMonth();
    periodLabel = `Tháng ${lm}`;
    dateRangeLabel = `1/${lm} – ${lastMonthDays}/${lm}`;
  } else if (period === 'year') {
    groupBy = 'month';
    for (let m = 0; m <= today.getMonth(); m++) days.push(new Date(today.getFullYear(), m, 1));
    periodLabel = `Năm ${today.getFullYear()}`;
    dateRangeLabel = `T1 – T${today.getMonth()+1}/${today.getFullYear()}`;
  }

  const getKey = d => groupBy === 'month'
    ? d.getFullYear() + '-' + d.getMonth()
    : d.toDateString();

  const nhapByKey = {}, xuatByKey = {};
  days.forEach(d => { const k = getKey(d); nhapByKey[k] = 0; xuatByKey[k] = 0; });
  (_historyData || []).forEach(r => {
    if (!r.thoigian_raw) return;
    const d = new Date(r.thoigian_raw);
    const k = getKey(d);
    if (!(k in nhapByKey)) return;
    if (r.loai === 'Nhập') nhapByKey[k] += (Number(r.soluong)||0) * (Number(r.gia)||0);
    else if (r.loai === 'Xuất') xuatByKey[k] += (Number(r.soluong)||0) * (Number(r.gia)||0);
  });

  const nhapVals = days.map(d => nhapByKey[getKey(d)]);
  const xuatVals = days.map(d => xuatByKey[getKey(d)]);
  const xLabels  = days.map(d => groupBy === 'month' ? `T${d.getMonth()+1}` : `${d.getDate()}/${d.getMonth()+1}`);
  const maxVal   = Math.max(...nhapVals, ...xuatVals, 1);

  const W = 640, H = 220, padL = 60, padR = 16, padT = 16, padB = 40;
  const chartW = W - padL - padR, chartH = H - padT - padB;
  const colW = chartW / days.length;
  const barW = Math.max(4, Math.min(Math.floor(colW * 0.28), 24));
  const gap  = 4;
  const scaleY = v => padT + chartH - (v / maxVal) * chartH;
  const labelFontSize = days.length > 14 ? 8 : 10;
  const showLabel = i => days.length <= 14 || i === 0 || i === days.length - 1 || (i + 1) % 5 === 0;

  let yLines = '';
  for (let i = 0; i <= 4; i++) {
    const v = (maxVal / 4) * i;
    const y = scaleY(v);
    const label = v >= 1000000 ? (v/1000000).toFixed(1) + 'M' : v >= 1000 ? (v/1000).toFixed(0) + 'K' : v.toFixed(0);
    yLines += `<line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="#f0f0f0" stroke-width="1"/>`;
    yLines += `<text x="${padL - 6}" y="${y + 4}" font-size="10" fill="#aaa" text-anchor="end">${label}</text>`;
  }

  let bars = '';
  days.forEach((d, i) => {
    const x  = padL + i * colW + colW / 2;
    const nH = nhapVals[i] > 0 ? Math.max(2, (nhapVals[i] / maxVal) * chartH) : 0;
    const xH = xuatVals[i] > 0 ? Math.max(2, (xuatVals[i] / maxVal) * chartH) : 0;
    const lbl = xLabels[i];
    const nv  = nhapVals[i], xv = xuatVals[i];
    bars += `<g onmousemove="_showChartTT(event,'${lbl}',${nv},${xv})" onmouseleave="_hideChartTT()" onclick="_showChartTT(event,'${lbl}',${nv},${xv})" style="cursor:pointer;">`;
    bars += `<rect x="${padL + i * colW}" y="${padT}" width="${colW}" height="${chartH}" fill="transparent"/>`;
    bars += `<rect x="${x - barW - gap/2}" y="${padT + chartH - nH}" width="${barW}" height="${nH}" fill="#4CAF50" rx="3" opacity="0.85"/>`;
    bars += `<rect x="${x + gap/2}" y="${padT + chartH - xH}" width="${barW}" height="${xH}" fill="#f44336" rx="3" opacity="0.85"/>`;
    if (showLabel(i)) bars += `<text x="${x}" y="${H - padB + 14}" font-size="${labelFontSize}" fill="#888" text-anchor="middle">${lbl}</text>`;
    bars += `</g>`;
  });

  const legend = `<g transform="translate(${padL}, ${H - 8})"><rect x="0" y="-8" width="10" height="10" fill="#4CAF50" rx="2"/><text x="13" y="1" font-size="11" fill="#555">Nhập</text><rect x="52" y="-8" width="10" height="10" fill="#f44336" rx="2"/><text x="65" y="1" font-size="11" fill="#555">Xuất</text></g>`;
  const svg = `<svg width="100%" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="display:block;max-width:100%;">
    ${yLines}
    <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${padT + chartH}" stroke="#e0e0e0" stroke-width="1"/>
    <line x1="${padL}" y1="${padT + chartH}" x2="${W - padR}" y2="${padT + chartH}" stroke="#e0e0e0" stroke-width="1"/>
    ${bars}${legend}
  </svg>`;

  const totalNhap = nhapVals.reduce((a,b)=>a+b,0);
  const totalXuat = xuatVals.reduce((a,b)=>a+b,0);
  const fmtM = v => v >= 1000000 ? (v/1000000).toFixed(2) + 'M đ' : fmt(v) + ' đ';

  const periodOpts = [
    { key: 'week',      label: 'Tuần này' },
    { key: 'lastweek',  label: 'Tuần trước' },
    { key: 'month',     label: 'Tháng này' },
    { key: 'lastmonth', label: 'Tháng trước' },
    { key: 'year',      label: 'Năm nay' },
  ];
  const selectorHtml = `<div style="display:flex;gap:6px;margin-bottom:10px;flex-wrap:wrap;align-items:center;">
    ${periodOpts.map(p => {
      const active = p.key === period;
      return `<button onclick="_reRenderChart('${p.key}')" style="padding:5px 13px;border-radius:20px;border:1.5px solid ${active ? '#1976d2' : '#e0e0e0'};background:${active ? '#e3f2fd' : '#fafafa'};color:${active ? '#1565c0' : '#666'};font-size:12px;font-weight:${active ? '700' : '500'};cursor:pointer;">${p.label}</button>`;
    }).join('')}
    <button id="chart-refresh-btn" onclick="_refreshChartData('${period}')" title="Làm mới dữ liệu" style="margin-left:auto;background:none;border:1px solid #e0e0e0;border-radius:8px;padding:5px 7px;color:#4CAF50;cursor:pointer;display:flex;align-items:center;justify-content:center;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/></svg></button>
  </div>`;

  return `${selectorHtml}
    <div style="margin-bottom:4px;font-size:12px;color:#888;">${periodLabel} (${dateRangeLabel})</div>
    ${svg}
    <div style="display:flex;gap:12px;margin-top:12px;">
      <div style="flex:1;background:#e8f5e9;border-radius:10px;padding:10px 14px;">
        <div style="font-size:11px;color:#2e7d32;font-weight:700;">Tổng Nhập ${periodLabel}</div>
        <div style="font-size:15px;font-weight:700;color:#2e7d32;margin-top:3px;">${fmtM(totalNhap)}</div>
      </div>
      <div style="flex:1;background:#ffebee;border-radius:10px;padding:10px 14px;">
        <div style="font-size:11px;color:#c62828;font-weight:700;">Tổng Xuất ${periodLabel}</div>
        <div style="font-size:15px;font-weight:700;color:#c62828;margin-top:3px;">${fmtM(totalXuat)}</div>
      </div>
    </div>
    <div style="font-size:11px;color:#bbb;margin-top:10px;text-align:center;">* Dữ liệu từ cache hiện tại. Nếu thiếu hãy bấm 🔄 Làm mới ở bộ lọc "Tất cả".</div>
    <div id="chart-tooltip" style="display:none;position:fixed;background:#1a1a1a;color:#fff;border-radius:10px;padding:10px 14px;font-size:12px;pointer-events:none;z-index:9999;min-width:150px;box-shadow:0 4px 16px rgba(0,0,0,0.3);">
      <div id="chart-tt-label" style="font-weight:700;font-size:13px;margin-bottom:7px;padding-bottom:5px;border-bottom:1px solid rgba(255,255,255,0.15);"></div>
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;"><span style="width:8px;height:8px;background:#4CAF50;border-radius:2px;flex-shrink:0;display:inline-block;"></span><span style="color:#ccc;">Nhập:</span><span id="chart-tt-nhap" style="font-weight:700;color:#81C784;margin-left:auto;padding-left:8px;"></span></div>
      <div style="display:flex;align-items:center;gap:6px;"><span style="width:8px;height:8px;background:#f44336;border-radius:2px;flex-shrink:0;display:inline-block;"></span><span style="color:#ccc;">Xuất:</span><span id="chart-tt-xuat" style="font-weight:700;color:#ef9a9a;margin-left:auto;padding-left:8px;"></span></div>
    </div>`;
}

function _buildTopSpHtml(showAll) {
  const xuatRows = _reportFilterRows().filter(r => r.loai === 'Xuất');
  if (!xuatRows.length) return '<div style="text-align:center;padding:32px;color:#aaa;">Không có dữ liệu xuất trong khoảng thời gian này.</div>';
  const map = new Map();
  xuatRows.forEach(r => {
    const rawMa = (r.ma || '').trim();
    const validMa = rawMa && !rawMa.startsWith('#') ? rawMa : '';
    const key = validMa || (r.hanghoa || '').trim();
    if (!key) return;
    if (!map.has(key)) map.set(key, { ma: validMa, ten: r.hanghoa, kichthuoc: r.kichthuoc, sl: 0, amount: 0, orders: new Set() });
    const item = map.get(key);
    item.sl     += Number(r.soluong) || 0;
    item.amount += (Number(r.soluong)||0) * (Number(r.gia)||0);
    item.orders.add(_orderKey(r));
  });
  let list = [...map.values()].sort((a, b) => b.sl - a.sl || b.amount - a.amount);
  const total = list.length;
  if (!showAll) list = list.slice(0, 5);
  const rows = list.map((item, i) => {
    const prod = (products || []).find(p => p.ma === item.ma);
    const giavon = prod ? (Number(prod.giavon) || 0) : 0;
    const avgGia = item.sl > 0 ? item.amount / item.sl : 0;
    const ln = giavon > 0 ? (avgGia - giavon) * item.sl : null;
    const rankClass = i === 0 ? 'r1' : i === 1 ? 'r2' : i === 2 ? 'r3' : '';
    return `<tr>
      <td><span class="analytics-rank ${rankClass}">${i+1}</span></td>
      <td><div style="font-size:13px;font-weight:600;">${item.ten || '—'}</div><div style="font-size:11px;color:#aaa;">${item.ma}${item.kichthuoc ? ' · ' + item.kichthuoc : ''}</div></td>
      <td style="text-align:right;font-weight:600;color:#1976d2;">${fmt(item.sl)}</td>
      <td style="text-align:right;font-weight:600;">${fmt(item.amount)} đ</td>
      <td style="text-align:right;font-size:12px;color:${ln === null ? '#ccc' : ln >= 0 ? '#4CAF50' : '#f44336'};">${ln === null ? '—' : (ln >= 0 ? '+' : '') + fmt(ln) + ' đ'}</td>
      <td style="text-align:right;font-size:12px;color:#888;">${item.orders.size} đơn</td>
    </tr>`;
  }).join('');
  const showMoreBtn = (!showAll && total > 5)
    ? `<button class="analytics-showmore" onclick="document.getElementById('analytics-modal-body').innerHTML=_buildTopSpHtml(true)">Xem thêm (${total} sản phẩm)</button>`
    : '';
  return `<table class="analytics-table"><thead><tr><th>#</th><th>Sản phẩm</th><th style="text-align:right;">SL bán</th><th style="text-align:right;">Doanh thu</th><th style="text-align:right;">Lợi nhuận</th><th style="text-align:right;">Đơn</th></tr></thead><tbody>${rows}</tbody></table>${showMoreBtn}
  <div style="font-size:11px;color:#bbb;margin-top:8px;">* Lợi nhuận = (giá bán TB - giá vốn hiện tại) × SL. Cột LN hiển thị "—" nếu chưa có giá vốn.</div>`;
}

function _buildTopLnHtml(showAll) {
  const xuatRows = _reportFilterRows().filter(r => r.loai === 'Xuất');
  if (!xuatRows.length) return '<div style="text-align:center;padding:32px;color:#aaa;">Không có dữ liệu xuất trong khoảng thời gian này.</div>';
  const map = new Map();
  xuatRows.forEach(r => {
    const rawMa = (r.ma || '').trim();
    const validMa = rawMa && !rawMa.startsWith('#') ? rawMa : '';
    const key = validMa || (r.hanghoa || '').trim();
    if (!key) return;
    const prod = (products || []).find(p => p.ma === validMa);
    const giavon = prod ? (Number(prod.giavon) || 0) : 0;
    if (!map.has(key)) map.set(key, { ma: validMa, ten: r.hanghoa, kichthuoc: r.kichthuoc, sl: 0, amount: 0, giavon });
    const item = map.get(key);
    item.sl     += Number(r.soluong) || 0;
    item.amount += (Number(r.soluong)||0) * (Number(r.gia)||0);
  });
  let list = [...map.values()].map(item => {
    const avgGia = item.sl > 0 ? item.amount / item.sl : 0;
    const ln = item.giavon > 0 ? (avgGia - item.giavon) * item.sl : null;
    const bien = (item.giavon > 0 && item.amount > 0) ? ((avgGia - item.giavon) / avgGia * 100) : null;
    return { ...item, ln, bien };
  }).filter(item => item.ln !== null).sort((a, b) => b.ln - a.ln);
  if (!list.length) return '<div style="text-align:center;padding:32px;color:#aaa;">Không đủ dữ liệu giá vốn để tính lợi nhuận.</div>';
  const total = list.length;
  if (!showAll) list = list.slice(0, 5);
  const rows = list.map((item, i) => {
    const rankClass = i === 0 ? 'r1' : i === 1 ? 'r2' : i === 2 ? 'r3' : '';
    const lnColor = item.ln >= 0 ? '#4CAF50' : '#f44336';
    const bienColor = item.bien !== null ? (item.bien >= 0 ? '#4CAF50' : '#f44336') : '#ccc';
    return `<tr>
      <td><span class="analytics-rank ${rankClass}">${i+1}</span></td>
      <td><div style="font-size:13px;font-weight:600;">${item.ten || '—'}</div><div style="font-size:11px;color:#aaa;">${item.ma}${item.kichthuoc ? ' · ' + item.kichthuoc : ''}</div></td>
      <td style="text-align:right;font-weight:700;color:${lnColor};">${item.ln >= 0 ? '+' : ''}${fmt(item.ln)} đ</td>
      <td style="text-align:right;font-weight:600;color:${bienColor};">${item.bien !== null ? item.bien.toFixed(1) + '%' : '—'}</td>
      <td style="text-align:right;font-size:12px;color:#888;">${fmt(item.sl)}</td>
    </tr>`;
  }).join('');
  const showMoreBtn = (!showAll && total > 5)
    ? `<button class="analytics-showmore" onclick="document.getElementById('analytics-modal-body').innerHTML=_buildTopLnHtml(true)">Xem thêm (${total} sản phẩm)</button>`
    : '';
  return `<table class="analytics-table"><thead><tr><th>#</th><th>Sản phẩm</th><th style="text-align:right;">Lợi nhuận</th><th style="text-align:right;">Biên LN</th><th style="text-align:right;">SL bán</th></tr></thead><tbody>${rows}</tbody></table>${showMoreBtn}
  <div style="font-size:11px;color:#bbb;margin-top:8px;">* Biên LN = (Giá bán TB - Giá vốn) / Giá bán TB × 100%</div>`;
}

function _buildTopKhachHtml(showAll) {
  const xuatRows = _reportFilterRows().filter(r => r.loai === 'Xuất' && (r.tenkhach || '').trim());
  if (!xuatRows.length) return '<div style="text-align:center;padding:32px;color:#aaa;">Không có dữ liệu khách hàng trong khoảng thời gian này.</div>';
  const KHACH_LE_KEY = '__khach_le__';
  const map = new Map();
  xuatRows.forEach(r => {
    const norm = removeDiacritics(r.tenkhach.trim()).toLowerCase();
    if (!norm) return;
    const isKhachLe = norm === 'khach le' || norm.startsWith('khach le ');
    const key = isKhachLe ? KHACH_LE_KEY : norm;
    if (!map.has(key)) map.set(key, { ten: isKhachLe ? 'Khách lẻ' : r.tenkhach.trim(), sl: 0, amount: 0, orders: new Set(), spCount: new Map() });
    const item = map.get(key);
    item.sl     += Number(r.soluong) || 0;
    item.amount += (Number(r.soluong)||0) * (Number(r.gia)||0);
    item.orders.add(_orderKey(r));
    const rawSpMa = (r.ma || '').trim();
    const spKey = (rawSpMa && !rawSpMa.startsWith('#')) ? rawSpMa : (r.hanghoa || '').trim();
    if (spKey) item.spCount.set(spKey, (item.spCount.get(spKey) || 0) + (Number(r.soluong)||0));
  });
  let list = [...map.values()].map(item => {
    let topSp = '—';
    if (item.spCount.size) {
      const maxKey = [...item.spCount.entries()].sort((a,b)=>b[1]-a[1])[0][0];
      const prod = (products || []).find(p => p.ma === maxKey);
      topSp = prod ? prod.ten : maxKey;
    }
    return { ...item, donSo: item.orders.size, topSp };
  }).sort((a, b) => b.amount - a.amount || b.donSo - a.donSo);
  const total = list.length;
  if (!showAll) list = list.slice(0, 5);
  const rows = list.map((item, i) => {
    const rankClass = i === 0 ? 'r1' : i === 1 ? 'r2' : i === 2 ? 'r3' : '';
    const isKL = item.ten === 'Khách lẻ';
    return `<tr>
      <td><span class="analytics-rank ${rankClass}">${i+1}</span></td>
      <td style="font-size:13px;font-weight:600;color:${isKL?'#888':'inherit'};">${item.ten}${isKL ? ' <span style="font-size:11px;font-weight:400;color:#bbb;">(tổng hợp)</span>' : ''}</td>
      <td style="text-align:right;font-weight:600;color:#1976d2;">${item.donSo} đơn</td>
      <td style="text-align:right;font-weight:600;">${fmt(item.amount)} đ</td>
      <td style="font-size:12px;color:#555;">${item.topSp}</td>
    </tr>`;
  }).join('');
  const showMoreBtn = (!showAll && total > 5)
    ? `<button class="analytics-showmore" onclick="document.getElementById('analytics-modal-body').innerHTML=_buildTopKhachHtml(true)">Xem thêm (${total} khách)</button>`
    : '';
  return `<table class="analytics-table"><thead><tr><th>#</th><th>Khách hàng</th><th style="text-align:right;">Số đơn</th><th style="text-align:right;">Doanh thu</th><th>SP hay mua nhất</th></tr></thead><tbody>${rows}</tbody></table>${showMoreBtn}
  <div style="font-size:11px;color:#bbb;margin-top:8px;">* "Khách lẻ", "Khách lẻ 1", "Khách lẻ 2"... được gộp thành 1 dòng.</div>`;
}

(function() {
  var _acEl = null;
  var _acFocusIdx = -1;

  function _acMatch(nameNormTokens, qTokens) {
    return qTokens.every(function(qt) {
      return nameNormTokens.some(function(nt) { return nt.indexOf(qt) === 0; });
    });
  }

  function _acRender(el, q) {
    var dd = document.getElementById('customer-ac-dropdown');
    var qTokens = removeDiacritics(q).split(/[\s.]+/).filter(Boolean);
    if (!qTokens.length) { dd.style.display = 'none'; _acEl = null; return; }
    var names = [];
    var seen = {};
    customerData.forEach(function(r) {
      var name = (r[0] || '').trim();
      if (!name || seen[name]) return;
      var nameNormTokens = removeDiacritics(name).split(/[\s.]+/).filter(Boolean);
      if (_acMatch(nameNormTokens, qTokens)) { names.push(name); seen[name] = true; }
    });
    if (!names.length || el.value.trim() !== q) { dd.style.display = 'none'; _acEl = null; return; }
    _acEl = el;
    _acFocusIdx = -1;
    dd.innerHTML = '';
    names.slice(0, 8).forEach(function(name) {
      var item = document.createElement('div');
      item.className = 'customer-ac-item';
      item.textContent = name;
      item.addEventListener('mousedown', function(e) {
        e.preventDefault();
        el.value = name;
        el.dispatchEvent(new Event('input', {bubbles: true}));
        dd.style.display = 'none';
        _acEl = null;
        _acFocusIdx = -1;
        el.focus();
      });
      dd.appendChild(item);
    });
    var rect = el.getBoundingClientRect();
    // Trên mobile, bàn phím ảo làm lệch visual viewport so với layout viewport
    // position:fixed định vị theo layout viewport nên cần bù thêm visualViewport.offsetTop
    var vvTop = (window.innerWidth <= 768 && window.visualViewport) ? window.visualViewport.offsetTop : 0;
    dd.style.left = rect.left + 'px';
    dd.style.top = (rect.bottom + 2 + vvTop) + 'px';
    dd.style.width = rect.width + 'px';
    dd.style.display = 'block';
  }

  window._customerAC = function(el, mode) {
    ixShow(el);
    var dd = document.getElementById('customer-ac-dropdown');
    if (mode !== 'Xuất') { dd.style.display = 'none'; _acEl = null; return; }
    var q = el.value.trim();
    if (!q) { dd.style.display = 'none'; _acEl = null; return; }
    if (!customerData.length) {
      fetchCustomerData().then(function() { _acRender(el, q); });
      return;
    }
    _acRender(el, q);
  };

  window._customerACKeydown = function(e) {
    var dd = document.getElementById('customer-ac-dropdown');
    if (!dd || dd.style.display === 'none') return;
    var items = dd.querySelectorAll('.customer-ac-item');
    if (!items.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      _acFocusIdx = Math.min(_acFocusIdx + 1, items.length - 1);
      items.forEach(function(it, i) { it.classList.toggle('ac-focus', i === _acFocusIdx); });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      _acFocusIdx = Math.max(_acFocusIdx - 1, 0);
      items.forEach(function(it, i) { it.classList.toggle('ac-focus', i === _acFocusIdx); });
    } else if (e.key === 'Enter' && _acFocusIdx >= 0 && items[_acFocusIdx]) {
      e.preventDefault();
      items[_acFocusIdx].dispatchEvent(new MouseEvent('mousedown'));
    } else if (e.key === 'Escape') {
      dd.style.display = 'none'; _acEl = null; _acFocusIdx = -1;
    }
  };

  document.addEventListener('click', function(e) {
    var dd = document.getElementById('customer-ac-dropdown');
    if (dd && e.target !== _acEl && !dd.contains(e.target)) {
      dd.style.display = 'none'; _acEl = null; _acFocusIdx = -1;
    }
  });
})();

(function() {
  var _pfEl = null, _pfFocusIdx = -1;

  function _pfACHide() {
    var dd = document.getElementById('pf-ac-dropdown');
    if (dd) dd.style.display = 'none';
    _pfEl = null; _pfFocusIdx = -1;
  }

  function _pfGetUnique(field) {
    var seen = {}, vals = [];
    (typeof products !== 'undefined' ? products : []).forEach(function(p) {
      var v = (p[field] || '').toString().trim();
      if (v && !seen[v]) { seen[v] = true; vals.push(v); }
    });
    return vals;
  }

  function _pfACRender(el, field) {
    var dd = document.getElementById('pf-ac-dropdown');
    if (!dd) return;
    var q = removeDiacritics(el.value.trim());
    if (!q) { _pfACHide(); return; }
    var matched = _pfGetUnique(field).filter(function(v) {
      return removeDiacritics(v).indexOf(q) !== -1;
    });
    if (!matched.length) { _pfACHide(); return; }
    _pfEl = el; _pfFocusIdx = -1;
    dd.innerHTML = '';
    matched.slice(0, 8).forEach(function(v) {
      var item = document.createElement('div');
      item.className = 'customer-ac-item';
      item.textContent = v;
      item.addEventListener('mousedown', function(e) {
        e.preventDefault();
        el.value = v;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        _pfACHide();
        el.focus();
      });
      dd.appendChild(item);
    });
    var rect = el.getBoundingClientRect();
    var vvTop = (window.innerWidth <= 768 && window.visualViewport) ? window.visualViewport.offsetTop : 0;
    dd.style.left = rect.left + 'px';
    dd.style.top = (rect.bottom + 2 + vvTop) + 'px';
    dd.style.width = rect.width + 'px';
    dd.style.display = 'block';
  }

  window._pfACAttach = function() {
    ['ncc', 'ten', 'dvt'].forEach(function(field) {
      var el = document.getElementById('pf_' + field);
      if (!el) return;
      el.setAttribute('autocomplete', 'off');
      el.addEventListener('input', function() { _pfACRender(el, field); });
      el.addEventListener('keydown', function(e) {
        var dd = document.getElementById('pf-ac-dropdown');
        if (!dd || dd.style.display === 'none') return;
        var items = dd.querySelectorAll('.customer-ac-item');
        if (!items.length) return;
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          _pfFocusIdx = Math.min(_pfFocusIdx + 1, items.length - 1);
          items.forEach(function(it, i) { it.classList.toggle('ac-focus', i === _pfFocusIdx); });
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          _pfFocusIdx = Math.max(_pfFocusIdx - 1, 0);
          items.forEach(function(it, i) { it.classList.toggle('ac-focus', i === _pfFocusIdx); });
        } else if (e.key === 'Enter' && _pfFocusIdx >= 0 && items[_pfFocusIdx]) {
          e.preventDefault();
          items[_pfFocusIdx].dispatchEvent(new MouseEvent('mousedown'));
        } else if (e.key === 'Escape') {
          _pfACHide();
        }
      });
      el.addEventListener('blur', function() { setTimeout(_pfACHide, 150); });
    });
  };

  document.addEventListener('click', function(e) {
    var dd = document.getElementById('pf-ac-dropdown');
    if (dd && e.target !== _pfEl && !dd.contains(e.target)) _pfACHide();
  });
})();

// ===== SỔ DOANH THU EXPORT =====
function openSoDoanThuModal() {
  var namEl = document.getElementById('sdt-nam');
  if (namEl) {
    var currentYear = new Date().getFullYear();
    namEl.innerHTML = '';
    for (var y = currentYear; y >= 2024; y--) {
      var opt = document.createElement('option');
      opt.value = y;
      opt.textContent = y;
      if (y === currentYear) opt.selected = true;
      namEl.appendChild(opt);
    }
  }
  var overlay = document.getElementById('sdt-modal-overlay');
  if (overlay) overlay.style.display = 'flex';
}

function closeSoDoanThuModal() {
  var overlay = document.getElementById('sdt-modal-overlay');
  if (overlay) overlay.style.display = 'none';
}

async function exportSoDoanThu() {
  if (typeof XLSX === 'undefined') { showToast('Đang tải thư viện, vui lòng thử lại.'); return; }
  var quy = document.getElementById('sdt-quy').value;
  var nam = parseInt(document.getElementById('sdt-nam').value);

  var fromDate, toDate;
  if (quy === 'all') {
    fromDate = new Date(nam, 0, 1);
    toDate   = new Date(nam + 1, 0, 1);
  } else {
    var q = parseInt(quy);
    fromDate = new Date(nam, (q - 1) * 3, 1);
    toDate   = new Date(nam, q * 3, 1);
  }

  var taiBtn = document.getElementById('sdt-tai-btn');
  if (taiBtn) { taiBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="animation:spin 1s linear infinite"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg><span>Đang tải...</span>'; taiBtn.disabled = true; }

  var xuatRows = [];
  try {
    var rFrom = fromDate.getTime();
    var rTo   = toDate.getTime();
    var covered = _loadedRange && _loadedRange.from <= rFrom && _loadedRange.to >= rTo;
    if (covered && _historyData.length) {
      xuatRows = _historyData.filter(function(r) { return r.loai === 'Xuất'; });
    } else {
      var res = await fetch(
        SCRIPT_URL + '?action=history&token=inox2026xK9m&fromDate=' + fromDate.toISOString() + '&toDate=' + toDate.toISOString(),
        { cache: 'no-store' }
      );
      var data = await res.json();
      xuatRows = (data.xuat || []).map(function(r) { return _mapHistRow(r, 'Xuất'); });
    }
  } catch(e) {
    if (taiBtn) { taiBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 1H4a2 2 0 00-2 2v12a2 2 0 002 2h11a2 2 0 002-2V6z" fill="#fff" stroke="#fff" stroke-width="1.5"/><path d="M12 1v5h5" stroke="#217346" stroke-width="1.5" stroke-linejoin="round"/><text x="5" y="13" fill="#217346" font-size="5" font-weight="700" font-family="Arial,sans-serif">XLS</text><line x1="11" y1="17" x2="11" y2="21" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/><path d="M8.5 19 11 21.5 13.5 19" fill="none" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg><span>Tải Excel</span>'; taiBtn.disabled = false; }
    showToast('Không tải được dữ liệu. Vui lòng thử lại.');
    return;
  }

  xuatRows = xuatRows.filter(function(r) {
    var d = new Date(r.thoigian_raw);
    if (d.getFullYear() !== nam) return false;
    if (quy !== 'all') {
      var month = d.getMonth() + 1;
      var q2 = parseInt(quy);
      if (month < (q2 - 1) * 3 + 1 || month > q2 * 3) return false;
    }
    return true;
  });
  xuatRows = xuatRows.slice().sort(function(a, b) { return a.thoigian_raw - b.thoigian_raw; });

  var kyLabel  = quy === 'all' ? ('Cả năm ' + nam) : ('Quý ' + quy + ' năm ' + nam);
  var filename = 'SoDoanThu_' + (quy === 'all' ? 'CaNam' : 'Q' + quy) + '_' + nam + '.xlsx';

  // ===== BUILD FORMATTED WORKSHEET =====
  var wb = XLSX.utils.book_new();
  var ws = {};

  var BDR = {
    top:    { style: 'thin',   color: { rgb: '000000' } },
    bottom: { style: 'thin',   color: { rgb: '000000' } },
    left:   { style: 'thin',   color: { rgb: '000000' } },
    right:  { style: 'thin',   color: { rgb: '000000' } }
  };
  var BDR_MED = {
    top:    { style: 'medium', color: { rgb: '000000' } },
    bottom: { style: 'medium', color: { rgb: '000000' } },
    left:   { style: 'medium', color: { rgb: '000000' } },
    right:  { style: 'medium', color: { rgb: '000000' } }
  };

  // Helper: write cell
  function sc(r, c, v, s, numFmt, formula) {
    var addr = XLSX.utils.encode_cell({ r: r, c: c });
    var isNum = typeof v === 'number';
    ws[addr] = { v: (v === null || v === undefined) ? '' : v, t: isNum ? 'n' : 's', s: s || {} };
    if (isNum && numFmt) ws[addr].z = numFmt;
    if (formula) ws[addr].f = formula;
  }

  // --- Style definitions ---
  var S_INFO = { font: { sz: 10, name: 'Times New Roman' } };
  var S_TITLE = {
    font: { bold: true, sz: 12, name: 'Times New Roman' },
    alignment: { horizontal: 'center', vertical: 'center' }
  };
  var S_SUBTITLE = {
    font: { sz: 11, name: 'Times New Roman' },
    alignment: { horizontal: 'center', vertical: 'center' }
  };
  var S_UNIT_LABEL = {
    font: { italic: true, sz: 10, name: 'Times New Roman' },
    alignment: { horizontal: 'right', vertical: 'bottom' }
  };
  var S_HDR = {
    font: { bold: true, sz: 11, name: 'Times New Roman' },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: BDR,
    fill: { patternType: 'solid', fgColor: { rgb: 'EEEEEE' } }
  };
  var S_IDX = {
    font: { italic: true, sz: 9, name: 'Times New Roman' },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: BDR,
    fill: { patternType: 'solid', fgColor: { rgb: 'EEEEEE' } }
  };
  var S_DATA_TEXT = {
    font: { sz: 11, name: 'Times New Roman' },
    alignment: { vertical: 'center', wrapText: true },
    border: BDR
  };
  var S_DATA_CTR = {
    font: { sz: 11, name: 'Times New Roman' },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: BDR
  };
  var S_DATA_NUM = {
    font: { sz: 11, name: 'Times New Roman' },
    alignment: { horizontal: 'right', vertical: 'center' },
    border: BDR
  };
  var S_TOTAL_LBL = {
    font: { bold: true, sz: 10, name: 'Times New Roman' },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: BDR_MED,
    fill: { patternType: 'solid', fgColor: { rgb: 'DDDDDD' } }
  };
  var S_TOTAL_NUM = {
    font: { bold: true, sz: 10, name: 'Times New Roman' },
    alignment: { horizontal: 'right', vertical: 'center' },
    border: BDR_MED,
    fill: { patternType: 'solid', fgColor: { rgb: 'DDDDDD' } }
  };
  var S_MAU_SO = {
    font: { italic: true, sz: 8, name: 'Times New Roman' },
    alignment: { horizontal: 'center', vertical: 'top', wrapText: true }
  };

  // --- Info rows (0-6) ---
  sc(0, 0, 'HỘ, CÁ NHÂN KINH DOANH: Hộ Kinh Doanh Hàng Gia Dụng', S_INFO);
  sc(1, 0, 'Địa chỉ: 49 Lê Quang Sung, Phường Bình Tây, TPHCM',    S_INFO);
  sc(2, 0, 'Mã số thuế: ',                                           S_INFO);
  sc(0, 3, 'Mẫu số S2a-HKD\n(Kèm theo Thông tư số 152/2025/TT-BTC\nngày 31 tháng 12 năm 2025 của Bộ trưởng\nBộ Tài chính)', S_MAU_SO);
  // row 3: empty
  sc(4, 0, 'SỔ DOANH THU BÁN HÀNG HÓA, DỊCH VỤ',                   S_TITLE);
  sc(5, 0, 'Địa điểm kinh doanh: 49 Lê Quang Sung, Phường Bình Tây, TPHCM', S_SUBTITLE);
  sc(6, 0, 'Kỳ kê khai: ' + kyLabel,                                S_SUBTITLE);
  // row 7: empty

  // --- "Đơn vị tính" label (row 8, col 5 = F) ---
  sc(8, 5, 'Đơn vị tính: đồng', S_UNIT_LABEL);

  // --- Table header row 1 (row 9) ---
  sc(9, 0, 'Chứng từ',       S_HDR);
  sc(9, 1, '',                S_HDR);
  sc(9, 2, 'Diễn giải',      S_HDR);
  sc(9, 3, 'Số lượng',       S_HDR);
  sc(9, 4, 'Đơn giá',        S_HDR);
  sc(9, 5, 'Thành tiền',     S_HDR);
  sc(9, 6, 'Giao dịch',      S_HDR);
  sc(9, 7, 'Tên khách hàng', S_HDR);

  // --- Table header row 2 (row 10) ---
  sc(10, 0, 'Số hiệu',     S_HDR);
  sc(10, 1, 'Ngày, tháng', S_HDR);
  sc(10, 2, '',             S_HDR);
  sc(10, 3, '',             S_HDR);
  sc(10, 4, '',             S_HDR);
  sc(10, 5, '',             S_HDR);
  sc(10, 6, '',             S_HDR);
  sc(10, 7, '',             S_HDR);

  //  --- Column reference row (row 11) ---
  sc(11, 0, 'A', S_IDX);
  sc(11, 1, 'B', S_IDX);
  sc(11, 2, 'C', S_IDX);
  sc(11, 3, 'D', S_IDX);
  sc(11, 4, '1', S_IDX);
  sc(11, 5, '2', S_IDX);

  // --- Data rows ---
  var DR = 12;
  ws['!rows'] = [];
  xuatRows.forEach(function(r, i) {
    var row    = DR + i;
    var dt     = new Date(r.thoigian_raw);
    var ngay   = String(dt.getDate()).padStart(2,'0') + '/' +
                 String(dt.getMonth()+1).padStart(2,'0') + '/' + dt.getFullYear();
    var ten    = (r.hanghoa || '').trim();
    var dg     = ten;
    var sl     = Number(r.soluong) || 0;
    var dongia = Number(r.gia) || 0;
    var tien   = sl * dongia;
    var wLines = Math.max(1, Math.ceil(dg.length / 40));
    ws['!rows'][row] = { hpx: wLines * 14 + 2 };
    sc(row, 0, '',               S_DATA_CTR);
    sc(row, 1, ngay,             S_DATA_CTR);
    sc(row, 2, dg,               S_DATA_TEXT);
    sc(row, 3, sl,               S_DATA_NUM, '#,##0');
    sc(row, 4, dongia,           S_DATA_NUM, '#,##0');
    sc(row, 5, tien,             S_DATA_NUM, '#,##0', 'D' + (row + 1) + '*E' + (row + 1));
    sc(row, 6, r.giaodich  || '', S_DATA_CTR);
    sc(row, 7, r.tenkhach  || '', S_DATA_TEXT);
  });

  // --- Total row ---
  var TR    = DR + xuatRows.length;
  var total = xuatRows.reduce(function(s, r) { return s + (Number(r.soluong)||0)*(Number(r.gia)||0); }, 0);
  sc(TR, 0, 'TỔNG CỘNG', S_TOTAL_LBL);
  sc(TR, 1, '',           S_TOTAL_LBL);
  sc(TR, 2, '',           S_TOTAL_LBL);
  sc(TR, 3, '',           S_TOTAL_LBL);
  sc(TR, 4, '',           S_TOTAL_LBL);
  sc(TR, 5, total,        S_TOTAL_NUM, '#,##0', 'SUM(F' + (DR + 1) + ':F' + TR + ')');

  // --- Merges ---
  ws['!merges'] = [
    { s:{r:0,c:0},  e:{r:0,c:2}  },
    { s:{r:1,c:0},  e:{r:1,c:2}  },
    { s:{r:2,c:0},  e:{r:2,c:2}  },
    { s:{r:0,c:3},  e:{r:3,c:5}  },   // Mẫu số S2a-HKD (D-F)
    { s:{r:4,c:0},  e:{r:4,c:5}  },   // Tiêu đề (A-F)
    { s:{r:5,c:0},  e:{r:5,c:5}  },   // Địa điểm KD (A-F)
    { s:{r:6,c:0},  e:{r:6,c:5}  },   // Kỳ kê khai (A-F)
    { s:{r:9,c:0},  e:{r:9,c:1}  },   // "Chứng từ" gộp 2 cột
    { s:{r:9,c:2},  e:{r:10,c:2} },   // "Diễn giải" gộp 2 hàng
    { s:{r:9,c:3},  e:{r:10,c:3} },   // "Số lượng" gộp 2 hàng
    { s:{r:9,c:4},  e:{r:10,c:4} },   // "Đơn giá" gộp 2 hàng
    { s:{r:9,c:5},  e:{r:10,c:5} },   // "Số tiền" gộp 2 hàng
    { s:{r:9,c:6},  e:{r:10,c:6} },   // "Giao dịch" gộp 2 hàng
    { s:{r:9,c:7},  e:{r:10,c:7} },   // "Tên khách hàng" gộp 2 hàng
    { s:{r:TR,c:0}, e:{r:TR,c:4} },   // "TỔNG CỘNG" gộp 5 cột (A-E)
  ];

  // --- Column widths & row heights ---
  ws['!cols'] = [
  { wch: 8 }, /* Số hiệu */
  { wch: 11 }, /* Ngày, tháng */
  { wch: 38 }, /* Diễn giải */
  { wch: 6 }, /* Số lượng */
  { wch: 10 }, /* Đơn giá */
  { wch: 11 }, /* Số tiền */
  { wch: 12 }, /* Giao dịch */
  { wch: 22 }];  /* Tên khách hàng */
  ws['!rows'][4]  = { hpx: 30 };
  ws['!rows'][9]  = { hpx: 30 };
  ws['!rows'][10] = { hpx: 15 };
  ws['!rows'][11] = { hpx: 15 };

  ws['!margins']   = { left: 0.59, right: 0.59, top: 0.79, bottom: 0.79, header: 0.31, footer: 0.31 };
  ws['!pageSetup'] = { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
  ws['!ref'] = XLSX.utils.encode_range({ s:{r:0,c:0}, e:{r:TR,c:7} });

  // In A4 từ cột A tới F (G, H không in)
  wb.Workbook = { Names: [{ Name: '_xlnm.Print_Area', Ref: "'Sổ Doanh Thu'!$A$1:$F$" + (TR + 1), Sheet: 0 }] };

  XLSX.utils.book_append_sheet(wb, ws, 'Sổ Doanh Thu');

  // ===== SHEET 2+: TỔNG THEO NGÀY – mỗi cụm 3 tháng = 1 sheet riêng =====
  // Xây dựng map ngày → tổng tiền
  var dayMap = {};
  xuatRows.forEach(function(rx) {
    var dx  = new Date(rx.thoigian_raw);
    var key = dx.getFullYear() + '-' + (dx.getMonth()+1) + '-' + dx.getDate();
    dayMap[key] = (dayMap[key] || 0) + (Number(rx.soluong)||0) * (Number(rx.gia)||0);
  });

  var allMonths;
  if (quy === 'all') {
    allMonths = [1,2,3,4,5,6,7,8,9,10,11,12];
  } else {
    var qn = parseInt(quy);
    var m0 = (qn - 1) * 3 + 1;
    allMonths = [m0, m0+1, m0+2];
  }

  var S_HDR2  = { font:{bold:true,sz:10,name:'Times New Roman'}, alignment:{horizontal:'center',vertical:'center',wrapText:true}, border:BDR, fill:{patternType:'solid',fgColor:{rgb:'EEEEEE'}} };
  var S_DATE2 = { font:{sz:10,name:'Times New Roman'}, alignment:{horizontal:'center',vertical:'center'}, border:BDR };
  var S_NUM2  = { font:{sz:10,name:'Times New Roman'}, alignment:{horizontal:'right',vertical:'center'}, border:BDR };
  var S_TLBL2 = { font:{bold:true,sz:10,name:'Times New Roman'}, alignment:{horizontal:'center',vertical:'center'}, border:BDR_MED, fill:{patternType:'solid',fgColor:{rgb:'DDDDDD'}} };
  var S_TNUM2 = { font:{bold:true,sz:10,name:'Times New Roman'}, alignment:{horizontal:'right',vertical:'center'}, border:BDR_MED, fill:{patternType:'solid',fgColor:{rgb:'DDDDDD'}} };

  var colBases2   = [0, 3, 6];
  var groupCount2 = Math.ceil(allMonths.length / 3);
  var grandTotal2 = 0;

  for (var g2 = 0; g2 < groupCount2; g2++) {
    var ws2 = {};
    var gMonths = allMonths.slice(g2 * 3, g2 * 3 + 3);
    var curRow2 = 0;
    var monthTotalAddrs = [];

    // Hàm ghi cell gắn với sheet này
    var _sc2 = (function(sheet) {
      return function(r2, c2, v2, s2, nf2, formula2) {
        var addr2 = XLSX.utils.encode_cell({ r: r2, c: c2 });
        var isNum2 = typeof v2 === 'number';
        sheet[addr2] = { v: (v2 === null || v2 === undefined) ? '' : v2, t: isNum2 ? 'n' : 's', s: s2 || {} };
        if (isNum2 && nf2) sheet[addr2].z = nf2;
        if (formula2) sheet[addr2].f = formula2;
      };
    }(ws2));

    // Header
    gMonths.forEach(function(m2, mi) {
      var cb = colBases2[mi];
      _sc2(curRow2, cb,   'Ngày, tháng', S_HDR2);
      _sc2(curRow2, cb+1, 'Tổng',        S_HDR2);
    });
    curRow2++;

    // Số ngày tối đa trong nhóm
    var maxDays2 = 0;
    gMonths.forEach(function(m2) {
      var d2 = new Date(nam, m2, 0).getDate();
      if (d2 > maxDays2) maxDays2 = d2;
    });

    // Hàng dữ liệu: từng ngày
    var monthTotals2 = [0, 0, 0];
    for (var day2 = 1; day2 <= maxDays2; day2++) {
      gMonths.forEach(function(m2, mi) {
        if (day2 > new Date(nam, m2, 0).getDate()) return;
        var cb       = colBases2[mi];
        var dateStr2 = String(day2).padStart(2,'0') + '/' + String(m2).padStart(2,'0') + '/' + nam;
        var key2     = nam + '-' + m2 + '-' + day2;
        var dayTot   = dayMap[key2] || 0;
        monthTotals2[mi] += dayTot;
        _sc2(curRow2, cb, dateStr2, S_DATE2);
        var dateCellRef2 = XLSX.utils.encode_col(cb) + (curRow2 + 1);
        _sc2(curRow2, cb+1, dayTot, S_NUM2, '#,##0',
            "SUMIFS('Sổ Doanh Thu'!$F:$F,'Sổ Doanh Thu'!$B:$B," + dateCellRef2 + ")");
      });
      curRow2++;
    }

    // Hàng tổng từng tháng
    gMonths.forEach(function(m2, mi) {
      var cb = colBases2[mi];
      grandTotal2 += monthTotals2[mi];
      var sumCol      = XLSX.utils.encode_col(cb + 1);
      var firstExcel  = curRow2 - maxDays2 + 1;
      var lastExcel   = curRow2;
      var sumFormula2 = 'SUM(' + sumCol + firstExcel + ':' + sumCol + lastExcel + ')';
      _sc2(curRow2, cb,   'Tháng ' + m2,    S_TLBL2);
      _sc2(curRow2, cb+1, monthTotals2[mi], S_TNUM2, '#,##0', sumFormula2);
      monthTotalAddrs.push(sumCol + (curRow2 + 1));
    });
    curRow2++;

    // Cụm cuối: thêm TỔNG CỘNG (tham chiếu thẳng từ sheet Sổ Doanh Thu)
    if (g2 === groupCount2 - 1) {
      _sc2(curRow2, 0, 'TỔNG CỘNG', S_TLBL2);
      _sc2(curRow2, 1, grandTotal2,  S_TNUM2, '#,##0',
          "SUM('Sổ Doanh Thu'!F" + (DR + 1) + ":F" + TR + ")");
    }

    // 1 cụm duy nhất → giữ tên "Tổng theo ngày"; nhiều cụm → đặt tên theo tháng
    var sheetName2 = groupCount2 === 1
      ? 'Tổng theo ngày'
      : 'Tháng ' + gMonths[0] + '-' + gMonths[gMonths.length - 1];

    ws2['!cols']     = [{ wch:12 },{ wch:14 },{ wch:2 },{ wch:12 },{ wch:14 },{ wch:2 },{ wch:12 },{ wch:14 }];
    ws2['!ref']      = XLSX.utils.encode_range({ s:{r:0,c:0}, e:{r:curRow2,c:7} });
    ws2['!margins']  = { left: 0.59, right: 0.59, top: 0.79, bottom: 0.79, header: 0.31, footer: 0.31 };
    ws2['!pageSetup']= { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0 };

    XLSX.utils.book_append_sheet(wb, ws2, sheetName2);
  }

  XLSX.writeFile(wb, filename);

  if (taiBtn) { taiBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 1H4a2 2 0 00-2 2v12a2 2 0 002 2h11a2 2 0 002-2V6z" fill="#fff" stroke="#fff" stroke-width="1.5"/><path d="M12 1v5h5" stroke="#217346" stroke-width="1.5" stroke-linejoin="round"/><text x="5" y="13" fill="#217346" font-size="5" font-weight="700" font-family="Arial,sans-serif">XLS</text><line x1="11" y1="17" x2="11" y2="21" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/><path d="M8.5 19 11 21.5 13.5 19" fill="none" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg><span>Tải Excel</span>'; taiBtn.disabled = false; }
  closeSoDoanThuModal();
  showToast('Đã xuất ' + filename);
}

// Expose inline HTML handlers after moving scripts out of index.html.
if (typeof _congNoBack !== 'undefined') window._congNoBack = _congNoBack;
if (typeof _customerAC !== 'undefined') window._customerAC = _customerAC;
if (typeof _customerACKeydown !== 'undefined') window._customerACKeydown = _customerACKeydown;
if (typeof _daTra !== 'undefined') window._daTra = _daTra;
if (typeof _doShowInvoice !== 'undefined') window._doShowInvoice = _doShowInvoice;
if (typeof _heditXuatDraft !== 'undefined') window._heditXuatDraft = _heditXuatDraft;
if (typeof _hideChartTT !== 'undefined') window._hideChartTT = _hideChartTT;
if (typeof _lnOnPassInput !== 'undefined') window._lnOnPassInput = _lnOnPassInput;
if (typeof _refreshChartData !== 'undefined') window._refreshChartData = _refreshChartData;
if (typeof _refreshCongNo !== 'undefined') window._refreshCongNo = _refreshCongNo;
if (typeof _renderHistory !== 'undefined') window._renderHistory = _renderHistory;
if (typeof _reRenderChart !== 'undefined') window._reRenderChart = _reRenderChart;
if (typeof _showChartTT !== 'undefined') window._showChartTT = _showChartTT;
if (typeof _showCongNoDetail !== 'undefined') window._showCongNoDetail = _showCongNoDetail;
if (typeof _toggleRptSec !== 'undefined') window._toggleRptSec = _toggleRptSec;
if (typeof addPlusMobile !== 'undefined') window.addPlusMobile = addPlusMobile;
if (typeof applySearchHistory !== 'undefined') window.applySearchHistory = applySearchHistory;
if (typeof cartStepSl !== 'undefined') window.cartStepSl = cartStepSl;
if (typeof clearFilterInput !== 'undefined') window.clearFilterInput = clearFilterInput;
if (typeof closeAnalyticsModal !== 'undefined') window.closeAnalyticsModal = closeAnalyticsModal;
if (typeof closeCongNoModal !== 'undefined') window.closeCongNoModal = closeCongNoModal;
if (typeof closeDtSuccess !== 'undefined') window.closeDtSuccess = closeDtSuccess;
if (typeof closeSoDoanThuModal !== 'undefined') window.closeSoDoanThuModal = closeSoDoanThuModal;
if (typeof confirmDeleteProduct !== 'undefined') window.confirmDeleteProduct = confirmDeleteProduct;
if (typeof confirmDraftToXuat !== 'undefined') window.confirmDraftToXuat = confirmDraftToXuat;
if (typeof cycleDtTonSort !== 'undefined') window.cycleDtTonSort = cycleDtTonSort;
if (typeof cycleMobTonSort !== 'undefined') window.cycleMobTonSort = cycleMobTonSort;
if (typeof deleteSettingsUser !== 'undefined') window.deleteSettingsUser = deleteSettingsUser;
if (typeof doLogin !== 'undefined') window.doLogin = doLogin;
if (typeof doLogout !== 'undefined') window.doLogout = doLogout;
if (typeof doRefreshProducts !== 'undefined') window.doRefreshProducts = doRefreshProducts;
if (typeof dtAddPlus !== 'undefined') window.dtAddPlus = dtAddPlus;
if (typeof dtApplySearchHistory !== 'undefined') window.dtApplySearchHistory = dtApplySearchHistory;
if (typeof dtCartStepSl !== 'undefined') window.dtCartStepSl = dtCartStepSl;
if (typeof dtClearFilterInput !== 'undefined') window.dtClearFilterInput = dtClearFilterInput;
if (typeof dtFilterProducts !== 'undefined') window.dtFilterProducts = dtFilterProducts;
if (typeof dtRemoveFromCart !== 'undefined') window.dtRemoveFromCart = dtRemoveFromCart;
if (typeof dtSaveDraft !== 'undefined') window.dtSaveDraft = dtSaveDraft;
if (typeof dtSaveSearchHistory !== 'undefined') window.dtSaveSearchHistory = dtSaveSearchHistory;
if (typeof dtSetMode !== 'undefined') window.dtSetMode = dtSetMode;
if (typeof dtSubFromCart !== 'undefined') window.dtSubFromCart = dtSubFromCart;
if (typeof dtSubmit !== 'undefined') window.dtSubmit = dtSubmit;
if (typeof dtToggleSearchHistory !== 'undefined') window.dtToggleSearchHistory = dtToggleSearchHistory;
if (typeof dtUpdateCart !== 'undefined') window.dtUpdateCart = dtUpdateCart;
if (typeof dtUpdateFilterClearBtn !== 'undefined') window.dtUpdateFilterClearBtn = dtUpdateFilterClearBtn;
if (typeof exportSoDoanThu !== 'undefined') window.exportSoDoanThu = exportSoDoanThu;
if (typeof fetchCustomerData !== 'undefined') window.fetchCustomerData = fetchCustomerData;
if (typeof filterManageProducts !== 'undefined') window.filterManageProducts = filterManageProducts;
if (typeof filterProductList !== 'undefined') window.filterProductList = filterProductList;
if (typeof fmtInput !== 'undefined') window.fmtInput = fmtInput;
if (typeof fmtInputK !== 'undefined') window.fmtInputK = fmtInputK;
if (typeof goBack !== 'undefined') window.goBack = goBack;
if (typeof goCart !== 'undefined') window.goCart = goCart;
if (typeof goHome !== 'undefined') window.goHome = goHome;
if (typeof goMain !== 'undefined') window.goMain = goMain;
if (typeof heditAddRow !== 'undefined') window.heditAddRow = heditAddRow;
if (typeof heditMaChange !== 'undefined') window.heditMaChange = heditMaChange;
if (typeof heditRemoveRow !== 'undefined') window.heditRemoveRow = heditRemoveRow;
if (typeof histApplyDateRange !== 'undefined') window.histApplyDateRange = histApplyDateRange;
if (typeof histApplySearchHistory !== 'undefined') window.histApplySearchHistory = histApplySearchHistory;
if (typeof histClearFilterInput !== 'undefined') window.histClearFilterInput = histClearFilterInput;
if (typeof histDeleteGroup !== 'undefined') window.histDeleteGroup = histDeleteGroup;
if (typeof histDetailConfirmDraft !== 'undefined') window.histDetailConfirmDraft = histDetailConfirmDraft;
if (typeof histDetailDelete !== 'undefined') window.histDetailDelete = histDetailDelete;
if (typeof histDetailEdit !== 'undefined') window.histDetailEdit = histDetailEdit;
if (typeof histEditGroup !== 'undefined') window.histEditGroup = histEditGroup;
if (typeof histFilter !== 'undefined') window.histFilter = histFilter;
if (typeof histSaveEdit !== 'undefined') window.histSaveEdit = histSaveEdit;
if (typeof histSaveSearchHistory !== 'undefined') window.histSaveSearchHistory = histSaveSearchHistory;
if (typeof histTimeFilter !== 'undefined') window.histTimeFilter = histTimeFilter;
if (typeof histToggleSearchHistory !== 'undefined') window.histToggleSearchHistory = histToggleSearchHistory;
if (typeof histUpdateFilterClearBtn !== 'undefined') window.histUpdateFilterClearBtn = histUpdateFilterClearBtn;
if (typeof ixClear !== 'undefined') window.ixClear = ixClear;
if (typeof ixShow !== 'undefined') window.ixShow = ixShow;
if (typeof liveQtyInput !== 'undefined') window.liveQtyInput = liveQtyInput;
if (typeof liveQtyInputDt !== 'undefined') window.liveQtyInputDt = liveQtyInputDt;
if (typeof mngApplySearchHistory !== 'undefined') window.mngApplySearchHistory = mngApplySearchHistory;
if (typeof mngClearFilterInput !== 'undefined') window.mngClearFilterInput = mngClearFilterInput;
if (typeof mngSaveSearchHistory !== 'undefined') window.mngSaveSearchHistory = mngSaveSearchHistory;
if (typeof mngToggleSearchHistory !== 'undefined') window.mngToggleSearchHistory = mngToggleSearchHistory;
if (typeof mngUpdateFilterClearBtn !== 'undefined') window.mngUpdateFilterClearBtn = mngUpdateFilterClearBtn;
if (typeof onDtTonkhoInput !== 'undefined') window.onDtTonkhoInput = onDtTonkhoInput;
if (typeof onManageTonkhoInput !== 'undefined') window.onManageTonkhoInput = onManageTonkhoInput;
if (typeof onMobTonkhoInput !== 'undefined') window.onMobTonkhoInput = onMobTonkhoInput;
if (typeof openProductForm !== 'undefined') window.openProductForm = openProductForm;
if (typeof openSoDoanThuModal !== 'undefined') window.openSoDoanThuModal = openSoDoanThuModal;
if (typeof openUserModal !== 'undefined') window.openUserModal = openUserModal;
if (typeof refreshCartData !== 'undefined') window.refreshCartData = refreshCartData;
if (typeof refreshHistoryData !== 'undefined') window.refreshHistoryData = refreshHistoryData;
if (typeof refreshReportData !== 'undefined') window.refreshReportData = refreshReportData;
if (typeof removeFromCart !== 'undefined') window.removeFromCart = removeFromCart;
if (typeof renderReport !== 'undefined') window.renderReport = renderReport;
if (typeof reportApplyDateRange !== 'undefined') window.reportApplyDateRange = reportApplyDateRange;
if (typeof reportApplySearchHistory !== 'undefined') window.reportApplySearchHistory = reportApplySearchHistory;
if (typeof reportClearFilterInput !== 'undefined') window.reportClearFilterInput = reportClearFilterInput;
if (typeof reportDetailBack !== 'undefined') window.reportDetailBack = reportDetailBack;
if (typeof reportSaveSearchHistory !== 'undefined') window.reportSaveSearchHistory = reportSaveSearchHistory;
if (typeof reportTimeFilter !== 'undefined') window.reportTimeFilter = reportTimeFilter;
if (typeof reportToggleSearchHistory !== 'undefined') window.reportToggleSearchHistory = reportToggleSearchHistory;
if (typeof reportTypeFilter !== 'undefined') window.reportTypeFilter = reportTypeFilter;
if (typeof reportUpdateFilterClearBtn !== 'undefined') window.reportUpdateFilterClearBtn = reportUpdateFilterClearBtn;
if (typeof sanitizeQty !== 'undefined') window.sanitizeQty = sanitizeQty;
if (typeof saveDraft !== 'undefined') window.saveDraft = saveDraft;
if (typeof saveSearchHistory !== 'undefined') window.saveSearchHistory = saveSearchHistory;
if (typeof saveUserModal !== 'undefined') window.saveUserModal = saveUserModal;
if (typeof setCartMode !== 'undefined') window.setCartMode = setCartMode;
if (typeof setCongNoTab !== 'undefined') window.setCongNoTab = setCongNoTab;
if (typeof setDtFilter !== 'undefined') window.setDtFilter = setDtFilter;
if (typeof setDtSearchField !== 'undefined') window.setDtSearchField = setDtSearchField;
if (typeof setGiaodich !== 'undefined') window.setGiaodich = setGiaodich;
if (typeof setHistSearchField !== 'undefined') window.setHistSearchField = setHistSearchField;
if (typeof setHistSort !== 'undefined') window.setHistSort = setHistSort;
if (typeof setManageFilter !== 'undefined') window.setManageFilter = setManageFilter;
if (typeof setMngSearchField !== 'undefined') window.setMngSearchField = setMngSearchField;
if (typeof setMobileFilter !== 'undefined') window.setMobileFilter = setMobileFilter;
if (typeof setMobSearchField !== 'undefined') window.setMobSearchField = setMobSearchField;
if (typeof setReportSort !== 'undefined') window.setReportSort = setReportSort;
if (typeof setRptSearchField !== 'undefined') window.setRptSearchField = setRptSearchField;
if (typeof showAnalyticsModal !== 'undefined') window.showAnalyticsModal = showAnalyticsModal;
if (typeof showCongNo !== 'undefined') window.showCongNo = showCongNo;
if (typeof showForm !== 'undefined') window.showForm = showForm;
if (typeof showHistory !== 'undefined') window.showHistory = showHistory;
if (typeof showHistoryDetail !== 'undefined') window.showHistoryDetail = showHistoryDetail;
if (typeof showInvoice !== 'undefined') window.showInvoice = showInvoice;
if (typeof showManageProducts !== 'undefined') window.showManageProducts = showManageProducts;
if (typeof showProfitDetail !== 'undefined') window.showProfitDetail = showProfitDetail;
if (typeof showReport !== 'undefined') window.showReport = showReport;
if (typeof showReportDetail !== 'undefined') window.showReportDetail = showReportDetail;
if (typeof showReportOrderDetail !== 'undefined') window.showReportOrderDetail = showReportOrderDetail;
if (typeof showRptGdDetail !== 'undefined') window.showRptGdDetail = showRptGdDetail;
if (typeof showScreen !== 'undefined') window.showScreen = showScreen;
if (typeof showSettings !== 'undefined') window.showSettings = showSettings;
if (typeof subFromCartMobile !== 'undefined') window.subFromCartMobile = subFromCartMobile;
if (typeof submitCart !== 'undefined') window.submitCart = submitCart;
if (typeof submitProductForm !== 'undefined') window.submitProductForm = submitProductForm;
if (typeof syncInvAddrSelect !== 'undefined') window.syncInvAddrSelect = syncInvAddrSelect;
if (typeof syncInvSdtSelect !== 'undefined') window.syncInvSdtSelect = syncInvSdtSelect;
if (typeof toggleDtSfPanel !== 'undefined') window.toggleDtSfPanel = toggleDtSfPanel;
if (typeof toggleHideProduct !== 'undefined') window.toggleHideProduct = toggleHideProduct;
if (typeof toggleHistDatePanel !== 'undefined') window.toggleHistDatePanel = toggleHistDatePanel;
if (typeof toggleHistFilterPanel !== 'undefined') window.toggleHistFilterPanel = toggleHistFilterPanel;
if (typeof toggleHistSfPanel !== 'undefined') window.toggleHistSfPanel = toggleHistSfPanel;
if (typeof toggleHistSortPanel !== 'undefined') window.toggleHistSortPanel = toggleHistSortPanel;
if (typeof toggleMngSfPanel !== 'undefined') window.toggleMngSfPanel = toggleMngSfPanel;
if (typeof toggleMobSfPanel !== 'undefined') window.toggleMobSfPanel = toggleMobSfPanel;
if (typeof togglePassVis !== 'undefined') window.togglePassVis = togglePassVis;
if (typeof toggleReportAnalytics !== 'undefined') window.toggleReportAnalytics = toggleReportAnalytics;
if (typeof toggleReportCollapse !== 'undefined') window.toggleReportCollapse = toggleReportCollapse;
if (typeof toggleReportDatePanel !== 'undefined') window.toggleReportDatePanel = toggleReportDatePanel;
if (typeof toggleReportSortPanel !== 'undefined') window.toggleReportSortPanel = toggleReportSortPanel;
if (typeof toggleReportTypePanel !== 'undefined') window.toggleReportTypePanel = toggleReportTypePanel;
if (typeof toggleRptSfPanel !== 'undefined') window.toggleRptSfPanel = toggleRptSfPanel;
if (typeof toggleScan !== 'undefined') window.toggleScan = toggleScan;
if (typeof toggleSearchHistory !== 'undefined') window.toggleSearchHistory = toggleSearchHistory;
if (typeof tonkhoClear !== 'undefined') window.tonkhoClear = tonkhoClear;
if (typeof tonkhoUpdateClearBtn !== 'undefined') window.tonkhoUpdateClearBtn = tonkhoUpdateClearBtn;
if (typeof updateCartGia !== 'undefined') window.updateCartGia = updateCartGia;
if (typeof updateCartSl !== 'undefined') window.updateCartSl = updateCartSl;
if (typeof updateFilterClearBtn !== 'undefined') window.updateFilterClearBtn = updateFilterClearBtn;
