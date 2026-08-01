// Helper to toggle Eruda visibility
function setErudaVisibility(visible) {
  if (typeof eruda !== 'undefined') {
    try {
      if (eruda.get && eruda.get('entry')) {
        if (visible) {
          eruda.get('entry').show();
        } else {
          eruda.get('entry').hide();
        }
      }
      const el = document.getElementById('eruda');
      if (el) {
        el.style.display = visible ? 'block' : 'none';
      }
    } catch (e) {}
  }
}

// ============================================================================
// 1. ON-SCREEN ERROR RENDERER (MOBILE DEBUGGING)
// ============================================================================
(function () {
  function showErrorOverlay(title, msg, source, lineno, colno, stack) {
    function render() {
      var container = document.getElementById('mobile-debug-error-overlay');
      if (!container) {
        container = document.createElement('div');
        container.id = 'mobile-debug-error-overlay';
        container.style.cssText =
          'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.92);color:#ff4d4d;z-index:999999;padding:16px;box-sizing:border-box;overflow:auto;font-family:monospace;font-size:14px;word-break:break-word;';
        if (document.body) {
          document.body.appendChild(container);
        } else {
          document.addEventListener('DOMContentLoaded', function () {
            document.body.appendChild(container);
          });
        }
      }
      var errorCard = document.createElement('div');
      errorCard.style.cssText =
        'margin-bottom:16px;padding:12px;border:2px solid #ff4d4d;background:#1a0000;border-radius:8px;';
      errorCard.innerHTML =
        '<h3 style="margin:0 0 8px 0;font-size:16px;color:#ff6666;font-weight:bold;">' +
        (title || 'RUNTIME ERROR') +
        '</h3>' +
        '<div style="font-weight:bold;margin-bottom:6px;font-size:15px;color:#ffffff;">' +
        (msg || 'Unknown Error') +
        '</div>' +
        (source
          ? '<div style="color:#ffb3b3;font-size:12px;margin-bottom:4px;">At: ' +
            source +
            (lineno ? ':' + lineno + (colno ? ':' + colno : '') : '') +
            '</div>'
          : '') +
        (stack
          ? '<pre style="margin:8px 0 0 0;white-space:pre-wrap;font-size:11px;color:#ffcccc;max-height:200px;overflow:auto;">' +
            stack +
            '</pre>'
          : '');
      container.appendChild(errorCard);
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', render);
    } else {
      render();
    }
  }

  window.onerror = function (msg, source, lineno, colno, error) {
    var errorString = String(msg || '');
    if (errorString === 'Script error.' || errorString === 'Script error') {
      console.warn('Cross-origin Script error suppressed:', msg);
      return true;
    }
    var stack = error && error.stack ? error.stack : '';
    showErrorOverlay('JavaScript Error', msg, source, lineno, colno, stack);
    setErudaVisibility(true);
    localStorage.setItem('app_debug_mode', 'true');
    var toggle = document.getElementById('setting-debug-toggle');
    if (toggle) toggle.checked = true;
    return false;
  };

  window.addEventListener('unhandledrejection', function (event) {
    var reason = event.reason;
    var msg = reason ? reason.message || String(reason) : 'Unhandled Promise Rejection';
    if (msg === 'Script error.' || msg === 'Script error') {
      console.warn('Cross-origin Script error in promise rejection suppressed:', msg);
      return;
    }
    var stack = reason && reason.stack ? reason.stack : '';
    showErrorOverlay('Unhandled Rejection', msg, '', '', '', stack);
    setErudaVisibility(true);
    localStorage.setItem('app_debug_mode', 'true');
    var toggle = document.getElementById('setting-debug-toggle');
    if (toggle) toggle.checked = true;
  });
})();

// ============================================================================
// 2. STATE MANAGEMENT & DEFAULT CONSTANTS
// ============================================================================
const DEFAULT_FOLDERS = [
  { id: 'f_general', name: 'General', color: '#10b981' },
  { id: 'f_tax', name: 'Tax Receipts', color: '#3b82f6' },
  { id: 'f_groceries', name: 'Groceries', color: '#f59e0b' },
  { id: 'f_utilities', name: 'Utilities', color: '#8b5cf6' },
  { id: 'f_medical', name: 'Medical', color: '#ef4444' }
];

const DEFAULT_NAV_ITEMS = [
  { id: 'folders', label: 'Folders', icon: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z', visible: true },
  { id: 'search', label: 'Search', icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z', visible: true },
  { id: 'cleanup', label: 'Cleanup', icon: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16', visible: true },
  { id: 'settings', label: 'Settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z', visible: true }
];

let appState = {
  activeTab: 'folders',
  folders: [],
  receipts: [],
  navItems: DEFAULT_NAV_ITEMS,
  firebaseConnected: false,
  qualityPreference: 'ultralow', // strictly 'ultralow' (360px) or 'low' (640px)
  layoutPreference: 'grid', // 'grid' or 'list'
  openAccordionId: null, // Exclusive accordion: null means all closed
  previewImageFile: null,
  previewImageDataUrl: null,
  selectedModalReceipt: null,
  modalZoomScale: 1.0 // Scale for image preview zoom
};

let dbRef = null;
let storageRef = null;

// Helper to format byte count
function formatByteSize(bytes) {
  if (bytes === 0) return '0 KB';
  const kb = bytes / 1024;
  if (kb < 1000) return kb.toFixed(1) + ' KB';
  const mb = kb / 1024;
  return mb.toFixed(2) + ' MB';
}

// Get current month folder name (e.g., "August 2026")
function getAutoMonthFolderName() {
  const now = new Date();
  return now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

// ============================================================================
// 3. FIREBASE HELPER SERVICES & LOCALSTORAGE FALLBACK
// ============================================================================
function getStoredConfig() {
  try {
    const raw = localStorage.getItem('firebase_receipt_config');
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function saveStoredConfig(cfg) {
  try {
    localStorage.setItem('firebase_receipt_config', JSON.stringify(cfg));
    initFirebase();
    return true;
  } catch (e) {
    return false;
  }
}

function clearStoredConfig() {
  localStorage.removeItem('firebase_receipt_config');
  appState.firebaseConnected = false;
  updateConnectionBadge();
}

function parseFirebaseConfigInput(str) {
  if (!str) return null;
  try {
    const parsed = JSON.parse(str);
    if (parsed && typeof parsed === 'object') {
      return {
        apiKey: parsed.apiKey || '',
        databaseURL: parsed.databaseURL || '',
        projectId: parsed.projectId || '',
        storageBucket: parsed.storageBucket || ''
      };
    }
  } catch (e) {
    try {
      const matchKey = str.match(/apiKey\s*:\s*["']([^"']+)["']/);
      const matchDb = str.match(/databaseURL\s*:\s*["']([^"']+)["']/);
      const matchProj = str.match(/projectId\s*:\s*["']([^"']+)["']/);
      const matchBucket = str.match(/storageBucket\s*:\s*["']([^"']+)["']/);

      if (matchKey && matchDb && matchProj) {
        return {
          apiKey: matchKey[1],
          databaseURL: matchDb[1],
          projectId: matchProj[1],
          storageBucket: matchBucket ? matchBucket[1] : ''
        };
      }
    } catch (e2) {}
  }
  return null;
}

function initFirebase() {
  const cfg = getStoredConfig();
  if (cfg && cfg.apiKey && cfg.databaseURL && window.firebase) {
    try {
      if (!firebase.apps.length) {
        firebase.initializeApp(cfg);
      }
      dbRef = firebase.database().ref();
      if (cfg.storageBucket) {
        storageRef = firebase.storage().ref();
      }
      appState.firebaseConnected = true;
      setupDatabaseListeners();
    } catch (e) {
      console.warn('Firebase init fallback to local:', e);
      appState.firebaseConnected = false;
    }
  } else {
    appState.firebaseConnected = false;
  }
  updateConnectionBadge();
}

function updateConnectionBadge() {
  const badge = document.getElementById('connection-badge');
  const badgeText = document.getElementById('connection-badge-text');
  const subtitle = document.getElementById('header-status-subtitle');

  if (!badge || !badgeText || !subtitle) return;

  if (appState.firebaseConnected) {
    badge.className =
      'px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border bg-emerald-500/10 text-emerald-400 border-emerald-500/20 flex items-center space-x-1.5';
    badgeText.textContent = 'Firebase Active';
    subtitle.textContent = 'Synced with Firebase Realtime DB & Storage';
  } else {
    badge.className =
      'px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border bg-amber-500/10 text-amber-400 border-amber-500/20 flex items-center space-x-1.5';
    badgeText.textContent = 'Local Mode';
    subtitle.textContent = 'Local browser storage mode active';
  }
}

// Check Magic Link parameters on startup
function checkMagicLink() {
  const params = new URLSearchParams(window.location.search);
  const cfgParam = params.get('fb_config');
  if (cfgParam) {
    try {
      const decoded = JSON.parse(atob(cfgParam));
      if (decoded && decoded.apiKey && decoded.databaseURL) {
        saveStoredConfig(decoded);
        showToast('Firebase configuration loaded from Magic Link!', 'success');
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    } catch (e) {
      console.error('Failed to parse magic link:', e);
    }
  }
}

// Realtime Database Listeners
function setupDatabaseListeners() {
  if (appState.firebaseConnected && dbRef) {
    dbRef.child('folders').on('value', (snapshot) => {
      const val = snapshot.val();
      if (val) {
        appState.folders = Object.values(val).filter(
          (f) => f && f.name && !f.id.startsWith('f_month_')
        );
      } else {
        appState.folders = DEFAULT_FOLDERS;
        dbRef.child('folders').set(
          DEFAULT_FOLDERS.reduce((acc, f) => {
            acc[f.id] = f;
            return acc;
          }, {})
        );
      }
      saveLocalData();
      renderAllViews();
    });

    dbRef.child('receipts').on('value', (snapshot) => {
      const val = snapshot.val();
      appState.receipts = val ? Object.values(val) : [];
      saveLocalData();
      renderAllViews();
    });
  }
}

function loadLocalData() {
  try {
    const rawF = localStorage.getItem('app_folders');
    const loadedF = rawF ? JSON.parse(rawF) : DEFAULT_FOLDERS;
    appState.folders = loadedF.filter(
      (f) => f && f.name && !f.id.startsWith('f_month_')
    );

    const rawR = localStorage.getItem('app_receipts');
    appState.receipts = rawR ? JSON.parse(rawR) : [];

    const rawNav = localStorage.getItem('app_nav_config');
    const loadedNav = rawNav ? JSON.parse(rawNav) : DEFAULT_NAV_ITEMS;
    appState.navItems = loadedNav.filter(
      (item) => item.id !== 'home' && item.id !== 'camera' && item.id !== 'upload' && (item.label || '').toLowerCase() !== 'camera' && (item.label || '').toLowerCase() !== 'home'
    );
    if (!appState.navItems.length) {
      appState.navItems = JSON.parse(JSON.stringify(DEFAULT_NAV_ITEMS));
    }

    const savedQuality = localStorage.getItem('app_quality_preference');
    appState.qualityPreference = (savedQuality === 'low') ? 'low' : 'ultralow';
  } catch (e) {
    appState.folders = DEFAULT_FOLDERS;
    appState.receipts = [];
    appState.navItems = JSON.parse(JSON.stringify(DEFAULT_NAV_ITEMS));
  }
}

function saveLocalData() {
  try {
    localStorage.setItem('app_folders', JSON.stringify(appState.folders));
    localStorage.setItem('app_receipts', JSON.stringify(appState.receipts));
    localStorage.setItem('app_nav_config', JSON.stringify(appState.navItems));
    localStorage.setItem('app_quality_preference', appState.qualityPreference);
  } catch (e) {}
}

// Get current auto-month string without creating root folder cards
function ensureAutoMonthFolderExists() {
  return getAutoMonthFolderName();
}

// ============================================================================
// 4. IMAGE COMPRESSION UTILITY (ULTRA-LOW vs LOW ONLY)
// ============================================================================
function compressImage(file, targetWidth) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = function (e) {
      const img = new Image();
      img.onload = function () {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > targetWidth) {
          height = Math.round((height * targetWidth) / width);
          width = targetWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Quality: 0.55 for ultra-low, 0.70 for low
        const quality = targetWidth <= 360 ? 0.55 : 0.70;
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ============================================================================
// 5. EXCLUSIVE ACCORDION CONTROLLER
// ============================================================================
function toggleAccordion(sectionId) {
  if (appState.openAccordionId === sectionId) {
    appState.openAccordionId = null; // Close current if open
  } else {
    appState.openAccordionId = sectionId; // Open this and close all others
  }
  renderAccordionUI();
}

function closeAllAccordions() {
  appState.openAccordionId = null;
  renderAccordionUI();
}

function renderAccordionUI() {
  const sectionIds = [
    'json-config',
    'individual-fields',
    'nav-customizer',
    'upload-quality',
    'storage-tracker'
  ];

  sectionIds.forEach((sid) => {
    const bodyEl = document.getElementById('accordion-' + sid);
    const chevronEl = document.getElementById('chevron-' + sid);

    if (bodyEl && chevronEl) {
      if (appState.openAccordionId === sid) {
        bodyEl.classList.remove('hidden');
        chevronEl.classList.add('open');
      } else {
        bodyEl.classList.add('hidden');
        chevronEl.classList.remove('open');
      }
    }
  });

  if (appState.openAccordionId === 'nav-customizer') {
    renderNavConfigUI();
  }
}

// ============================================================================
// 6. BOTTOM NAVIGATION MANAGER & VISIBILITY TOGGLES
// ============================================================================
function moveNavItemUp(id) {
  const index = appState.navItems.findIndex((item) => item.id === id);
  if (index > 0) {
    const temp = appState.navItems[index];
    appState.navItems[index] = appState.navItems[index - 1];
    appState.navItems[index - 1] = temp;
    saveLocalData();
    renderBottomNav();
    renderNavConfigUI();
  }
}

function moveNavItemDown(id) {
  const index = appState.navItems.findIndex((item) => item.id === id);
  if (index >= 0 && index < appState.navItems.length - 1) {
    const temp = appState.navItems[index];
    appState.navItems[index] = appState.navItems[index + 1];
    appState.navItems[index + 1] = temp;
    saveLocalData();
    renderBottomNav();
    renderNavConfigUI();
  }
}

function toggleNavItemVisibility(id) {
  const item = appState.navItems.find((i) => i.id === id);
  if (item) {
    item.visible = !item.visible;
    saveLocalData();
    renderBottomNav();
    renderNavConfigUI();
  }
}

function resetNavItems() {
  appState.navItems = JSON.parse(JSON.stringify(DEFAULT_NAV_ITEMS));
  saveLocalData();
  renderBottomNav();
  renderNavConfigUI();
  showToast('Navigation bar reset to default', 'info');
}

function renderNavConfigUI() {
  const container = document.getElementById('nav-items-manager-list');
  if (!container) return;

  const validItems = appState.navItems.filter(
    (item) => item.id !== 'home' && item.id !== 'camera' && item.id !== 'upload' && (item.label || '').toLowerCase() !== 'camera' && (item.label || '').toLowerCase() !== 'home'
  );

  container.innerHTML = validItems
    .map((item, idx) => {
      const isFirst = idx === 0;
      const isLast = idx === validItems.length - 1;

      return `<div class="p-2.5 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
        <div class="flex items-center space-x-3">
          <svg class="w-4 h-4 ${item.visible ? 'text-emerald-400' : 'text-slate-600'}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${item.icon}"></path></svg>
          <span class="text-xs font-bold ${item.visible ? 'text-slate-200' : 'text-slate-500 line-through'}">${item.label}</span>
        </div>

        <div class="flex items-center space-x-2">
          <!-- Visibility toggle button -->
          <button type="button" onclick="toggleNavItemVisibility('${item.id}')" class="px-2 py-1 text-[10px] font-bold uppercase rounded border transition ${
            item.visible
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
              : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-300'
          }">
            ${item.visible ? 'Visible' : 'Hidden'}
          </button>

          <!-- Reorder up / down buttons -->
          <div class="flex items-center space-x-1">
            <button type="button" onclick="moveNavItemUp('${item.id}')" ${isFirst ? 'disabled' : ''} class="p-1 rounded bg-slate-900 border border-slate-800 text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed">
              ↑
            </button>
            <button type="button" onclick="moveNavItemDown('${item.id}')" ${isLast ? 'disabled' : ''} class="p-1 rounded bg-slate-900 border border-slate-800 text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed">
              ↓
            </button>
          </div>
        </div>
      </div>`;
    })
    .join('');
}

// ============================================================================
// 7. RENDERERS & VIEW CONTROLLERS
// ============================================================================
function switchTab(tabId) {
  if (!tabId || tabId === 'home' || tabId === 'camera') {
    tabId = 'folders';
  }
  appState.activeTab = tabId;

  ['folders', 'search', 'cleanup', 'settings'].forEach((t) => {
    const el = document.getElementById('tab-' + t);
    if (el) {
      if (t === appState.activeTab) {
        el.classList.remove('hidden');
        el.style.display = 'block';
        el.classList.add('animate-fadeIn');
      } else {
        el.classList.add('hidden');
        el.style.display = 'none';
      }
    }
  });

  renderBottomNav();
  renderAllViews();
}

function renderBottomNav() {
  const container = document.getElementById('bottom-nav-container');
  if (!container) return;

  const visibleTabs = appState.navItems.filter(
    (item) => item.visible && item.id !== 'home' && item.id !== 'camera' && item.id !== 'upload' && (item.label || '').toLowerCase() !== 'camera' && (item.label || '').toLowerCase() !== 'home'
  );

  if (!visibleTabs.length) {
    container.innerHTML = '<span class="text-xs text-slate-500 py-1">No visible navigation tabs</span>';
    return;
  }

  container.innerHTML = visibleTabs
    .map((tab) => {
      const isActive = appState.activeTab === tab.id;
      return `<button type="button" onclick="switchTab('${tab.id}')" class="flex-1 flex flex-col items-center py-1 px-2 rounded-xl transition ${
        isActive ? 'text-emerald-400 font-bold bg-emerald-500/10' : 'text-slate-400 hover:text-slate-200'
      }">
        <svg class="w-5 h-5 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${tab.icon}"></path></svg>
        <span class="text-[10px] tracking-tight">${tab.label}</span>
      </button>`;
    })
    .join('');
}

function renderAllViews() {
  populateFolderDropdowns();
  renderFoldersManagement();
  renderSearchResults();
  renderCleanupView();
  renderQualityUI();
}

function populateFolderDropdowns() {
  const uploadSelect = document.getElementById('upload-folder-select');
  const searchFilter = document.getElementById('search-folder-filter');
  const searchMonthFilter = document.getElementById('search-month-filter');
  const currentMonthFolder = getAutoMonthFolderName();

  if (uploadSelect) {
    const optionsHtml = appState.folders
      .map((f) => `<option value="${f.name}">${f.name}</option>`)
      .join('');
    uploadSelect.innerHTML = optionsHtml || '<option value="General">General</option>';
  }

  if (searchFilter) {
    const currentVal = searchFilter.value || 'ALL';
    searchFilter.innerHTML =
      '<option value="ALL">All Categories</option>' +
      appState.folders.map((f) => `<option value="${f.name}">${f.name}</option>`).join('');
    searchFilter.value = currentVal;
  }

  if (searchMonthFilter) {
    const currentVal = searchMonthFilter.value || 'ALL';

    const monthsSet = new Set();
    monthsSet.add(currentMonthFolder);

    appState.receipts.forEach((r) => {
      if (r.monthFolder) monthsSet.add(r.monthFolder);
      if (r.timestamp) {
        const d = new Date(r.timestamp);
        if (!isNaN(d.getTime())) {
          const monthName = d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
          monthsSet.add(monthName);
        }
      }
    });

    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const m = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStr = m.toLocaleString('en-US', { month: 'long', year: 'numeric' });
      monthsSet.add(monthStr);
    }

    const sortedMonths = Array.from(monthsSet);

    searchMonthFilter.innerHTML =
      '<option value="ALL">All Month Sub-Folders</option>' +
      sortedMonths.map((m) => `<option value="${m}">${m}</option>`).join('');

    searchMonthFilter.value = currentVal;
  }
}

function renderHomeReceipts() {
  const list = document.getElementById('home-receipts-list');
  if (!list) return;

  if (!appState.receipts.length) {
    list.className = 'col-span-full py-8 text-center text-slate-500 text-xs';
    list.innerHTML = 'No receipts saved yet. Capture or upload your first receipt above!';
    return;
  }

  list.className =
    appState.layoutPreference === 'grid'
      ? 'grid grid-cols-2 sm:grid-cols-3 gap-3'
      : 'flex flex-col space-y-2';

  list.innerHTML = appState.receipts
    .map((item) => {
      if (appState.layoutPreference === 'grid') {
        return `<div onclick="openModal('${item.id}')" class="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden cursor-pointer hover:border-emerald-500/50 transition p-2 flex flex-col space-y-2">
          <div class="h-28 bg-slate-950 rounded-lg overflow-hidden flex items-center justify-center">
            <img src="${item.imageUrl}" class="w-full h-full object-cover" alt="Receipt" />
          </div>
          <div>
            <h4 class="text-xs font-bold text-slate-200 truncate">${item.title || 'Untitled Receipt'}</h4>
            <span class="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded font-mono">${item.folderName}</span>
          </div>
        </div>`;
      } else {
        return `<div onclick="openModal('${item.id}')" class="bg-slate-900 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between cursor-pointer hover:border-emerald-500/50 transition">
          <div class="flex items-center space-x-3 min-w-0">
            <img src="${item.imageUrl}" class="w-10 h-10 object-cover rounded-lg bg-slate-950 flex-shrink-0" alt="Receipt" />
            <div class="min-w-0">
              <h4 class="text-xs font-bold text-slate-200 truncate">${item.title || 'Untitled Receipt'}</h4>
              <p class="text-[10px] text-slate-400">${item.folderName} • ${new Date(item.timestamp).toLocaleDateString()}</p>
            </div>
          </div>
        </div>`;
      }
    })
    .join('');
}

let activeUploadFolder = null;

function triggerFolderGalleryUpload(folderName) {
  activeUploadFolder = folderName;
  const fileInput = document.getElementById('upload-file-input');
  if (fileInput) {
    fileInput.removeAttribute('capture');
    fileInput.value = '';
    fileInput.click();
  }
}

function triggerFolderCameraUpload(folderName) {
  activeUploadFolder = folderName;
  const fileInput = document.getElementById('upload-file-input');
  if (fileInput) {
    fileInput.setAttribute('capture', 'environment');
    fileInput.value = '';
    fileInput.click();
  }
}

// Dynamic HTML5 Canvas App Icon Generator for Home Screen Shortcuts
function generateFolderAppIcon(folderName) {
  const canvas = document.createElement('canvas');
  canvas.width = 192;
  canvas.height = 192;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Dark slate background with rounded corners
  const grad = ctx.createLinearGradient(0, 0, 192, 192);
  grad.addColorStop(0, '#0f172a');
  grad.addColorStop(1, '#020617');

  const radius = 38;
  ctx.beginPath();
  ctx.moveTo(radius, 0);
  ctx.lineTo(192 - radius, 0);
  ctx.quadraticCurveTo(192, 0, 192, radius);
  ctx.lineTo(192, 192 - radius);
  ctx.quadraticCurveTo(192, 192, 192 - radius, 192);
  ctx.lineTo(radius, 192);
  ctx.quadraticCurveTo(0, 192, 0, 192 - radius);
  ctx.lineTo(0, radius);
  ctx.quadraticCurveTo(0, 0, radius, 0);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  // Emerald accent border
  ctx.lineWidth = 6;
  ctx.strokeStyle = '#10b981';
  ctx.stroke();

  // Center badge circle
  ctx.fillStyle = '#059669';
  ctx.beginPath();
  ctx.arc(96, 68, 28, 0, Math.PI * 2);
  ctx.fill();

  // Folder emoji/icon
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('📁', 96, 68);

  // Extract Initials
  let initials = folderName
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
  if (initials.length > 3) initials = initials.substring(0, 3);
  if (!initials) initials = folderName.substring(0, 3).toUpperCase();

  // Initials Text
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 36px sans-serif';
  ctx.fillText(initials, 96, 126);

  // Folder Name Subtext
  ctx.fillStyle = '#34d399';
  ctx.font = '600 15px sans-serif';
  let displayName = folderName;
  if (displayName.length > 14) displayName = displayName.substring(0, 12) + '..';
  ctx.fillText(displayName, 96, 160);

  return canvas.toDataURL('image/png');
}

let currentAthFolder = '';
let currentAthIconUrl = '';
let deferredInstallPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  const pwaBtn = document.getElementById('btn-modal-pwa-install');
  if (pwaBtn) pwaBtn.classList.remove('hidden');
});

function openAddToHomeScreenModal(folderName) {
  currentAthFolder = folderName;
  const iconDataUrl = generateFolderAppIcon(folderName);
  currentAthIconUrl = iconDataUrl;

  const previewImg = document.getElementById('ath-preview-icon');
  if (previewImg) previewImg.src = iconDataUrl;

  const folderNameEl = document.getElementById('ath-folder-name');
  if (folderNameEl) folderNameEl.textContent = folderName;

  const targetUrl = new URL(window.location.origin + window.location.pathname);
  targetUrl.searchParams.set('targetFolder', folderName);
  targetUrl.searchParams.set('action', 'autoCamera');

  const urlPreviewEl = document.getElementById('ath-folder-url-preview');
  if (urlPreviewEl) urlPreviewEl.textContent = targetUrl.search;

  // Set dynamic apple-touch-icon in head
  let appleIcon = document.querySelector('link[rel="apple-touch-icon"]');
  if (!appleIcon) {
    appleIcon = document.createElement('link');
    appleIcon.rel = 'apple-touch-icon';
    document.head.appendChild(appleIcon);
  }
  appleIcon.href = iconDataUrl;

  const pwaBtn = document.getElementById('btn-modal-pwa-install');
  if (pwaBtn) {
    if (deferredInstallPrompt) {
      pwaBtn.classList.remove('hidden');
    } else {
      pwaBtn.classList.add('hidden');
    }
  }

  const modal = document.getElementById('add-to-home-modal');
  if (modal) modal.classList.remove('hidden');
}

function closeAddToHomeScreenModal() {
  const modal = document.getElementById('add-to-home-modal');
  if (modal) modal.classList.add('hidden');
}

function checkFolderShortcutQuery() {
  const urlParams = new URLSearchParams(window.location.search);
  const targetFolder = urlParams.get('targetFolder') || urlParams.get('folder');
  const action = urlParams.get('action');

  if (targetFolder) {
    if (action === 'autoCamera') {
      // 2. STARTUP INTERCEPT (BYPASS UI)
      switchTab('folders');
      activeUploadFolder = targetFolder;

      // Clean up URL parameters immediately so browser reload won't re-trigger loop
      window.history.replaceState({}, document.title, window.location.pathname);

      showToast(`Deep Link: Triggering camera for "${targetFolder}"...`, 'info');

      // 3. INSTANT CAMERA TRIGGER
      setTimeout(() => {
        triggerFolderCameraUpload(targetFolder);
      }, 200);
    } else {
      // Fallback: If shortcut opened without autoCamera action parameter
      switchTab('folders');
      showToast(`Folder shortcut loaded: "${targetFolder}"`, 'info');
      window.history.replaceState({}, document.title, window.location.pathname);
      setTimeout(() => {
        const folderCards = document.querySelectorAll('#folders-management-list > div');
        folderCards.forEach((card) => {
          if (card.textContent && card.textContent.includes(targetFolder)) {
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
            card.classList.add('ring-2', 'ring-emerald-400');
          }
        });
      }, 250);
    }
  }
}

function renderFoldersManagement() {
  const container = document.getElementById('folders-management-list');
  if (!container) return;

  const manualFolders = appState.folders.filter(
    (f) => f && f.name && !f.id.startsWith('f_month_')
  );

  if (!manualFolders.length) {
    container.innerHTML = `<div class="py-8 text-center text-slate-500 text-xs">No folders created yet. Create one above!</div>`;
    return;
  }

  container.innerHTML = manualFolders
    .map((folderObj) => {
      const fName = folderObj.name;
      const folderReceipts = appState.receipts.filter(
        (r) => r.folderName === fName || (r.folderName && r.folderName.toLowerCase() === fName.toLowerCase())
      );

      let itemsGridHtml = '';
      if (folderReceipts.length === 0) {
        itemsGridHtml = `<div class="col-span-2 py-4 text-center text-slate-500 text-[11px] bg-slate-950/40 rounded-xl border border-dashed border-slate-800/80">
          No receipts in ${fName} yet. Tap Gallery or Camera above to add.
        </div>`;
      } else {
        itemsGridHtml = folderReceipts
          .map(
            (item) => `<div onclick="openModal('${item.id}')" class="bg-slate-950 border border-slate-800/80 hover:border-emerald-500/50 rounded-xl p-2 flex flex-col space-y-1.5 cursor-pointer transition">
            <div class="h-24 bg-slate-900 rounded-lg overflow-hidden flex items-center justify-center">
              <img src="${item.imageUrl}" class="w-full h-full object-cover" alt="Receipt" />
            </div>
            <div class="min-w-0">
              <h5 class="text-[11px] font-bold text-slate-200 truncate">${item.title || 'Receipt'}</h5>
              <div class="flex items-center justify-between text-[9px] text-slate-400 font-mono mt-0.5">
                <span class="text-emerald-400 truncate max-w-[80px]">${item.monthFolder || ''}</span>
                <span>${item.timestamp ? new Date(item.timestamp).toLocaleDateString() : ''}</span>
              </div>
            </div>
          </div>`
          )
          .join('');
      }

      const safeFName = fName.replace(/'/g, "\\'");

      return `<div class="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-md">
        <!-- Folder Header with Add to Home & Delete Buttons -->
        <div class="flex items-center justify-between pb-1 border-b border-slate-800/60">
          <div class="flex items-center space-x-2">
            <div class="w-2.5 h-2.5 rounded-full bg-emerald-400 flex-shrink-0"></div>
            <h3 class="text-xs font-bold text-slate-100 truncate max-w-[120px] sm:max-w-[200px]">${fName}</h3>
            <span class="text-[10px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded-full border border-slate-800 flex-shrink-0">
              ${folderReceipts.length} ${folderReceipts.length === 1 ? 'item' : 'items'}
            </span>
          </div>

          <div class="flex items-center space-x-1.5 flex-shrink-0">
            <button type="button" onclick="openAddToHomeScreenModal('${safeFName}')" title="Add Folder to Home Screen" class="px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-[10px] font-bold flex items-center space-x-1 transition cursor-pointer">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
              <span>+Home</span>
            </button>
            <button type="button" onclick="deleteFolder('${folderObj.id}')" title="Delete Folder" class="p-1.5 text-slate-500 hover:text-red-400 transition cursor-pointer">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
            </button>
          </div>
        </div>

        <!-- 2x2 Grid Upload Section: LEFT (Gallery), RIGHT (Camera) -->
        <div class="grid grid-cols-2 gap-2.5">
          <button type="button" onclick="triggerFolderGalleryUpload('${safeFName}')" class="p-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl flex items-center justify-center space-x-2 text-slate-200 hover:border-blue-500/40 transition cursor-pointer font-bold text-xs shadow-sm">
            <svg class="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
            <span>Gallery</span>
          </button>

          <button type="button" onclick="triggerFolderCameraUpload('${safeFName}')" class="p-3 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-xl flex items-center justify-center space-x-2 transition cursor-pointer font-bold text-xs shadow-sm">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
            <span>Camera</span>
          </button>
        </div>

        <!-- 2x2 CSS Grid Layout for Folder Items -->
        <div class="grid grid-cols-2 gap-2.5 pt-1">
          ${itemsGridHtml}
        </div>
      </div>`;
    })
    .join('');
}

function renderSearchResults() {
  const container = document.getElementById('search-results-list');
  if (!container) return;

  const query = (document.getElementById('search-query-input')?.value || '').trim().toLowerCase();
  const folder = document.getElementById('search-folder-filter')?.value || 'ALL';
  const monthFilter = document.getElementById('search-month-filter')?.value || 'ALL';
  const dateFromVal = document.getElementById('search-date-from')?.value;
  const dateToVal = document.getElementById('search-date-to')?.value;

  const fromMs = dateFromVal ? new Date(dateFromVal + 'T00:00:00').getTime() : null;
  const toMs = dateToVal ? new Date(dateToVal + 'T23:59:59').getTime() : null;

  const filtered = appState.receipts.filter((item) => {
    // Category folder match
    const matchesFolder = folder === 'ALL' || item.folderName === folder;

    // Month-wise direct folder mapping match
    let itemMonthStr = item.monthFolder;
    if (!itemMonthStr && item.timestamp) {
      const d = new Date(item.timestamp);
      if (!isNaN(d.getTime())) {
        itemMonthStr = d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
      }
    }
    const matchesMonth =
      monthFilter === 'ALL' ||
      item.monthFolder === monthFilter ||
      item.folderName === monthFilter ||
      itemMonthStr === monthFilter;

    // Keyword query match
    const matchesQuery =
      !query ||
      (item.title && item.title.toLowerCase().includes(query)) ||
      (item.folderName && item.folderName.toLowerCase().includes(query)) ||
      (itemMonthStr && itemMonthStr.toLowerCase().includes(query));

    // Date range match
    const matchesFromDate = fromMs === null || (item.timestamp && item.timestamp >= fromMs);
    const matchesToDate = toMs === null || (item.timestamp && item.timestamp <= toMs);

    return matchesFolder && matchesMonth && matchesQuery && matchesFromDate && matchesToDate;
  });

  if (!filtered.length) {
    container.className = 'col-span-full py-8 text-center text-slate-500 text-xs';
    container.innerHTML = 'No receipts match search criteria.';
    return;
  }

  container.className = 'grid grid-cols-1 sm:grid-cols-2 gap-3';
  container.innerHTML = filtered
    .map((item) => {
      const displayDate = item.timestamp ? new Date(item.timestamp).toLocaleDateString() : '';
      const monthTag =
        item.monthFolder ||
        (item.timestamp
          ? new Date(item.timestamp).toLocaleString('en-US', { month: 'short', year: 'numeric' })
          : '');
      return `<div onclick="openModal('${item.id}')" class="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between cursor-pointer hover:border-emerald-500/50 transition">
      <div class="flex items-center space-x-3 min-w-0">
        <img src="${item.imageUrl}" class="w-12 h-12 object-cover rounded-lg bg-slate-950 flex-shrink-0" alt="Receipt" />
        <div class="min-w-0">
          <h4 class="text-xs font-bold text-slate-200 truncate">${item.title || 'Untitled Receipt'}</h4>
          <div class="flex items-center space-x-1.5 mt-0.5">
            <span class="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded font-mono">${item.folderName}</span>
            ${monthTag ? `<span class="text-[10px] text-slate-400 font-mono">${monthTag}</span>` : ''}
          </div>
          ${displayDate ? `<p class="text-[10px] text-slate-500 mt-0.5">${displayDate}</p>` : ''}
        </div>
      </div>
    </div>`;
    })
    .join('');
}

function renderCleanupView() {
  const countEl = document.getElementById('cleanup-total-count');
  if (countEl) {
    countEl.textContent = appState.receipts.length + ' receipts';
  }
}

function renderQualityUI() {
  const badge = document.getElementById('home-quality-badge');
  const btnUltra = document.getElementById('quality-ultralow');
  const btnLow = document.getElementById('quality-low');

  if (badge) {
    badge.textContent =
      appState.qualityPreference === 'ultralow'
        ? 'Ultra-Low (360px ~15KB)'
        : 'Low (640px ~50KB)';
  }

  if (btnUltra && btnLow) {
    if (appState.qualityPreference === 'ultralow') {
      btnUltra.className =
        'p-3 rounded-xl border border-emerald-500 bg-emerald-500/10 text-emerald-400 text-center cursor-pointer transition';
      btnLow.className =
        'p-3 rounded-xl border border-slate-800 bg-slate-950 text-slate-400 text-center cursor-pointer transition';
    } else {
      btnUltra.className =
        'p-3 rounded-xl border border-slate-800 bg-slate-950 text-slate-400 text-center cursor-pointer transition';
      btnLow.className =
        'p-3 rounded-xl border border-emerald-500 bg-emerald-500/10 text-emerald-400 text-center cursor-pointer transition';
    }
  }
}

// Recursively list all files in Firebase Storage starting from a storage ref
async function listAllFilesRecursively(dirRef) {
  let files = [];
  try {
    const listResult = await dirRef.listAll();
    files = files.concat(listResult.items);

    for (const prefixRef of listResult.prefixes) {
      const subFiles = await listAllFilesRecursively(prefixRef);
      files = files.concat(subFiles);
    }
  } catch (err) {
    console.warn('Error listing files at path:', dirRef.fullPath, err);
  }
  return files;
}

// Asynchronously calculate total server storage size via Firebase SDK metadata
async function calculateFirebaseStorageUsage() {
  const resultEl = document.getElementById('firebase-storage-result');
  const fileCountEl = document.getElementById('firebase-storage-file-count');
  const btn = document.getElementById('btn-calculate-firebase-storage');

  if (!appState.firebaseConnected || !storageRef) {
    showToast('Firebase Storage is not connected. Please save valid credentials with a storageBucket.', 'error');
    if (resultEl) resultEl.textContent = 'Firebase Storage Disconnected';
    if (fileCountEl) fileCountEl.textContent = '0 files';
    return;
  }

  try {
    if (btn) {
      btn.disabled = true;
      btn.classList.add('opacity-50', 'cursor-not-allowed');
    }
    if (resultEl) resultEl.textContent = 'Scanning server files...';
    if (fileCountEl) fileCountEl.textContent = 'Calculating...';

    // 1. Recursively list all files on the Firebase server using listAll()
    const fileRefs = await listAllFilesRecursively(storageRef);

    if (fileRefs.length === 0) {
      if (resultEl) resultEl.textContent = 'Total Server Size: 0 KB';
      if (fileCountEl) fileCountEl.textContent = '0 files';
      showToast('Firebase Storage bucket is empty.', 'info');
      return;
    }

    if (resultEl) resultEl.textContent = `Fetching metadata for ${fileRefs.length} file(s)...`;

    // 2. Fetch metadata for every file using getMetadata() to get exact size in bytes
    const metadataPromises = fileRefs.map((fileRef) =>
      fileRef.getMetadata().catch((err) => {
        console.warn('Metadata fetch error for:', fileRef.fullPath, err);
        return null;
      })
    );

    const metadatas = await Promise.all(metadataPromises);

    let totalSizeBytes = 0;
    let successfulCount = 0;

    for (const meta of metadatas) {
      if (meta && typeof meta.size === 'number') {
        totalSizeBytes += meta.size;
        successfulCount++;
      }
    }

    // 3. Display live calculated size directly from server
    const formattedSize = formatByteSize(totalSizeBytes);
    if (resultEl) resultEl.textContent = `Total Server Size: ${formattedSize}`;
    if (fileCountEl) fileCountEl.textContent = `${successfulCount} file(s) on server (${totalSizeBytes.toLocaleString()} bytes)`;

    showToast(`Firebase storage calculated: ${formattedSize}`, 'success');
  } catch (error) {
    console.error('Error fetching Firebase Storage usage:', error);
    showToast('Error listing Firebase storage: ' + (error.message || String(error)), 'error');
    if (resultEl) resultEl.textContent = 'Error calculating server size';
    if (fileCountEl) fileCountEl.textContent = 'Error';
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.classList.remove('opacity-50', 'cursor-not-allowed');
    }
  }
}

// ============================================================================
// 8. IMAGE ZOOM SAFE MODAL & CONTROLLERS
// ============================================================================
function openModal(receiptId) {
  const receipt = appState.receipts.find((r) => r.id === receiptId);
  if (!receipt) return;

  appState.selectedModalReceipt = receipt;
  appState.modalZoomScale = 1.0;

  document.getElementById('modal-image-title').textContent = receipt.title || 'Untitled Receipt';
  
  const imgEl = document.getElementById('modal-image-element');
  imgEl.src = receipt.imageUrl;
  updateModalZoomTransform();

  document.getElementById('modal-image-date').textContent = new Date(receipt.timestamp).toLocaleString();
  document.getElementById('image-modal').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('image-modal').classList.add('hidden');
  appState.selectedModalReceipt = null;
  appState.modalZoomScale = 1.0;
  updateModalZoomTransform();
}

function zoomInModal() {
  if (appState.modalZoomScale < 2.5) { // Safe scale boundary to prevent GPU canvas black screen
    appState.modalZoomScale = Math.min(2.5, appState.modalZoomScale + 0.25);
    updateModalZoomTransform();
  }
}

function zoomOutModal() {
  if (appState.modalZoomScale > 0.5) {
    appState.modalZoomScale = Math.max(0.5, appState.modalZoomScale - 0.25);
    updateModalZoomTransform();
  }
}

function resetZoomModal() {
  appState.modalZoomScale = 1.0;
  updateModalZoomTransform();
}

function updateModalZoomTransform() {
  const imgEl = document.getElementById('modal-image-element');
  const levelEl = document.getElementById('modal-zoom-level');

  if (imgEl) {
    // Hardware acceleration + scale boundary prevents mobile black screen
    imgEl.style.transform = `translateZ(0) scale(${appState.modalZoomScale})`;
  }
  if (levelEl) {
    levelEl.textContent = Math.round(appState.modalZoomScale * 100) + '%';
  }
}

// Toast System
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  const bgColor =
    type === 'success'
      ? 'bg-emerald-950/90 border-emerald-500 text-emerald-200'
      : type === 'error'
      ? 'bg-red-950/90 border-red-500 text-red-200'
      : 'bg-slate-900/90 border-slate-700 text-slate-200';

  toast.className = `p-3 rounded-xl border text-xs shadow-xl backdrop-blur-md transition-all duration-300 transform translate-y-0 ${bgColor}`;
  toast.textContent = message;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Delete actions
function deleteReceipt(id) {
  const receiptObj = appState.receipts.find((r) => r.id === id);
  if (appState.firebaseConnected && dbRef) {
    dbRef.child('receipts').child(id).remove();
  }
  if (appState.firebaseConnected && storageRef && receiptObj && receiptObj.storagePath) {
    storageRef.child(receiptObj.storagePath).delete().catch((err) => console.warn(err));
  }
  appState.receipts = appState.receipts.filter((r) => r.id !== id);
  saveLocalData();
  renderAllViews();
  if (appState.selectedModalReceipt && appState.selectedModalReceipt.id === id) {
    closeModal();
  }
  showToast('Receipt deleted successfully', 'success');
}

async function listAllFilesRecursively(ref) {
  let files = [];
  try {
    const res = await ref.listAll();
    if (res.items) {
      files = files.concat(res.items);
    }
    if (res.prefixes) {
      for (const prefixRef of res.prefixes) {
        const subFiles = await listAllFilesRecursively(prefixRef);
        files = files.concat(subFiles);
      }
    }
  } catch (err) {
    console.warn('listAllFilesRecursively error:', err);
  }
  return files;
}

async function deleteFolder(id) {
  const folderObj = appState.folders.find((f) => f.id === id);
  if (!folderObj) return;

  const fName = folderObj.name;
  if (!confirm(`Are you sure you want to delete folder "${fName}" and all its contents?`)) {
    return;
  }

  showToast(`Deleting folder "${fName}" and cleaning storage...`, 'info');

  const folderReceipts = appState.receipts.filter(
    (r) => r.folderName === fName || (r.folderName && r.folderName.toLowerCase() === fName.toLowerCase())
  );

  // 1. Delete all images from Firebase Storage
  if (appState.firebaseConnected && storageRef) {
    folderReceipts.forEach((r) => {
      if (r.storagePath) {
        storageRef.child(r.storagePath).delete().catch((err) => console.warn('Storage item delete error:', err));
      }
    });

    try {
      const folderStorageRef = storageRef.child(`receipts/${fName}`);
      const filesInFolder = await listAllFilesRecursively(folderStorageRef);
      filesInFolder.forEach((fileRef) => {
        fileRef.delete().catch((err) => console.warn('Storage folder file delete error:', err));
      });
    } catch (err) {
      console.warn('Storage delete folder error:', fName, err);
    }
  }

  // 2. Delete from Realtime DB
  if (appState.firebaseConnected && dbRef) {
    dbRef.child('folders').child(id).remove();
    folderReceipts.forEach((r) => {
      dbRef.child('receipts').child(r.id).remove();
    });
  }

  // 3. Update local state
  const receiptIdsToDelete = new Set(folderReceipts.map((r) => r.id));
  appState.folders = appState.folders.filter((f) => f.id !== id);
  appState.receipts = appState.receipts.filter((r) => !receiptIdsToDelete.has(r.id));

  saveLocalData();
  renderAllViews();
  showToast(`Folder "${fName}" and all nested sub-folders/images deleted!`, 'success');
}

// ============================================================================
// 9. EVENT BINDINGS & INITIALIZATION
// ============================================================================
document.addEventListener('DOMContentLoaded', function () {
  checkMagicLink();
  loadLocalData();
  initFirebase();
  switchTab('folders');
  checkFolderShortcutQuery();

  // File Upload Direct Handler (Auto-uploads on selecting image from Gallery or Camera)
  const fileInput = document.getElementById('upload-file-input');
  fileInput?.addEventListener('change', async function (e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const monthFolder = getAutoMonthFolderName();
    const folderSelect = document.getElementById('upload-folder-select');
    const defaultFolderName = appState.folders[0]?.name || 'General';
    const selectedFolder = activeUploadFolder || (folderSelect ? folderSelect.value : defaultFolderName) || defaultFolderName;

    showToast(`Uploading to "${selectedFolder}"...`, 'info');

    const targetWidth = appState.qualityPreference === 'ultralow' ? 360 : 640;

    try {
      const compressedUrl = await compressImage(file, targetWidth);
      const recId = 'rec_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
      const now = new Date();
      const formattedDate = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const title = `Receipt ${formattedDate}`;
      const imageSizeBytes = Math.round((compressedUrl.length * 3) / 4);

      // Save automatically inside internal sub-folder: [ManualFolderName]/[Month Year]/[filename]
      const storagePath = `receipts/${selectedFolder}/${monthFolder}/${recId}_${file.name}`;

      const newRecord = {
        id: recId,
        title: title,
        folderName: selectedFolder,
        monthFolder: monthFolder,
        storagePath: storagePath,
        imageUrl: compressedUrl,
        timestamp: Date.now(),
        sizeBytes: imageSizeBytes
      };

      // Firebase Storage & Realtime DB sync
      if (appState.firebaseConnected && storageRef) {
        try {
          const fileRef = storageRef.child(storagePath);
          fileRef.putString(compressedUrl, 'data_url').then((snapshot) => {
            snapshot.ref.getDownloadURL().then((downloadURL) => {
              newRecord.imageUrl = downloadURL;
              if (dbRef) dbRef.child('receipts').child(newRecord.id).set(newRecord);
            });
          }).catch((err) => {
            console.warn('Storage upload fallback:', err);
            if (dbRef) dbRef.child('receipts').child(newRecord.id).set(newRecord);
          });
        } catch (err) {
          if (dbRef) dbRef.child('receipts').child(newRecord.id).set(newRecord);
        }
      } else if (appState.firebaseConnected && dbRef) {
        dbRef.child('receipts').child(newRecord.id).set(newRecord);
      }

      appState.receipts.unshift(newRecord);
      saveLocalData();
      renderAllViews();
      showToast(`Receipt saved to "${selectedFolder}" / "${monthFolder}"!`, 'success');
    } catch (err) {
      console.error('Error uploading receipt:', err);
      showToast('Error processing image', 'error');
    } finally {
      activeUploadFolder = null;
      if (fileInput) fileInput.value = '';
    }
  });

  // Home Quick Gallery & Camera buttons
  document.getElementById('btn-quick-gallery')?.addEventListener('click', function () {
    activeUploadFolder = null;
    const input = document.getElementById('upload-file-input');
    if (input) {
      input.removeAttribute('capture');
      input.value = '';
      input.click();
    }
  });

  document.getElementById('btn-quick-camera')?.addEventListener('click', function () {
    activeUploadFolder = null;
    const input = document.getElementById('upload-file-input');
    if (input) {
      input.setAttribute('capture', 'environment');
      input.value = '';
      input.click();
    }
  });

  // Folder creation
  document.getElementById('create-folder-form')?.addEventListener('submit', function (e) {
    e.preventDefault();
    const input = document.getElementById('new-folder-name');
    const name = input.value.trim();
    if (!name) return;

    const newFolder = {
      id: 'f_' + Date.now(),
      name: name,
      color: '#' + Math.floor(Math.random() * 16777215).toString(16)
    };

    appState.folders.push(newFolder);
    if (appState.firebaseConnected && dbRef) {
      dbRef.child('folders').child(newFolder.id).set(newFolder);
    }
    saveLocalData();
    renderAllViews();
    input.value = '';
    showToast(`Folder "${name}" created!`, 'success');
  });

  // Quick Camera photo upload button
  document.getElementById('btn-quick-camera')?.addEventListener('click', function () {
    const fileInput = document.getElementById('upload-file-input');
    if (fileInput) {
      fileInput.setAttribute('capture', 'environment');
      fileInput.setAttribute('accept', 'image/*');
      fileInput.click();
    }
  });

  // Quick Gallery pick upload button
  document.getElementById('btn-quick-gallery')?.addEventListener('click', function () {
    const fileInput = document.getElementById('upload-file-input');
    if (fileInput) {
      fileInput.removeAttribute('capture');
      fileInput.setAttribute('accept', 'image/*');
      fileInput.click();
    }
  });

  // Search input & filter event listeners
  document.getElementById('search-query-input')?.addEventListener('input', renderSearchResults);
  document.getElementById('search-folder-filter')?.addEventListener('change', renderSearchResults);
  document.getElementById('search-month-filter')?.addEventListener('change', renderSearchResults);
  document.getElementById('search-date-from')?.addEventListener('change', renderSearchResults);
  document.getElementById('search-date-to')?.addEventListener('change', renderSearchResults);
  document.getElementById('search-date-from')?.addEventListener('input', renderSearchResults);
  document.getElementById('search-date-to')?.addEventListener('input', renderSearchResults);

  // Clear / Reset search filters
  document.getElementById('btn-clear-search-filters')?.addEventListener('click', function () {
    const qInput = document.getElementById('search-query-input');
    const fFilter = document.getElementById('search-folder-filter');
    const mFilter = document.getElementById('search-month-filter');
    const dFrom = document.getElementById('search-date-from');
    const dTo = document.getElementById('search-date-to');

    if (qInput) qInput.value = '';
    if (fFilter) fFilter.value = 'ALL';
    if (mFilter) mFilter.value = 'ALL';
    if (dFrom) dFrom.value = '';
    if (dTo) dTo.value = '';

    renderSearchResults();
    showToast('Search filters reset', 'info');
  });

  // Bulk Delete
  document.getElementById('btn-bulk-delete-all')?.addEventListener('click', function () {
    if (confirm('Are you sure you want to delete ALL receipts?')) {
      if (appState.firebaseConnected && dbRef) {
        dbRef.child('receipts').remove();
      }
      appState.receipts = [];
      saveLocalData();
      renderAllViews();
      showToast('All receipts cleared!', 'success');
    }
  });

  // Modal actions & Zoom
  document.getElementById('btn-close-modal')?.addEventListener('click', closeModal);
  document.getElementById('btn-zoom-in')?.addEventListener('click', zoomInModal);
  document.getElementById('btn-zoom-out')?.addEventListener('click', zoomOutModal);
  document.getElementById('btn-zoom-reset')?.addEventListener('click', resetZoomModal);

  document.getElementById('btn-delete-modal-image')?.addEventListener('click', function () {
    if (appState.selectedModalReceipt) {
      deleteReceipt(appState.selectedModalReceipt.id);
      closeModal();
    }
  });

  // Layout preference buttons
  document.getElementById('btn-layout-grid')?.addEventListener('click', function () {
    appState.layoutPreference = 'grid';
    renderHomeReceipts();
  });
  document.getElementById('btn-layout-list')?.addEventListener('click', function () {
    appState.layoutPreference = 'list';
    renderHomeReceipts();
  });

  // Settings: Single Box JSON
  document.getElementById('btn-parse-json-config')?.addEventListener('click', function () {
    const raw = document.getElementById('json-config-textarea').value;
    const parsed = parseFirebaseConfigInput(raw);
    if (parsed) {
      saveStoredConfig(parsed);
      showToast('Firebase configuration saved successfully!', 'success');
    } else {
      showToast('Invalid JSON or Firebase config string', 'error');
    }
  });

  // Settings: Share Magic Link
  document.getElementById('btn-share-magic-link')?.addEventListener('click', function () {
    const cfg = getStoredConfig();
    if (!cfg) {
      showToast('No active configuration found to share', 'error');
      return;
    }
    const link =
      window.location.origin + window.location.pathname + '?fb_config=' + btoa(JSON.stringify(cfg));
    navigator.clipboard.writeText(link);
    showToast('Magic link copied to clipboard!', 'success');
  });

  // Settings: Individual Fields Form
  document.getElementById('individual-config-form')?.addEventListener('submit', function (e) {
    e.preventDefault();
    const cfg = {
      apiKey: document.getElementById('field-api-key').value.trim(),
      databaseURL: document.getElementById('field-db-url').value.trim(),
      projectId: document.getElementById('field-project-id').value.trim(),
      storageBucket: document.getElementById('field-storage-bucket').value.trim()
    };
    saveStoredConfig(cfg);
    showToast('Configuration updated!', 'success');
  });

  // Settings: Clear credentials
  document.getElementById('btn-clear-credentials')?.addEventListener('click', function () {
    clearStoredConfig();
    showToast('Credentials cleared', 'info');
  });

  // Quality preference buttons (strictly Ultra-Low vs Low)
  document.getElementById('quality-ultralow')?.addEventListener('click', function () {
    appState.qualityPreference = 'ultralow';
    saveLocalData();
    renderQualityUI();
    showToast('Upload quality set to ULTRA-LOW (360px)', 'success');
  });

  document.getElementById('quality-low')?.addEventListener('click', function () {
    appState.qualityPreference = 'low';
    saveLocalData();
    renderQualityUI();
    showToast('Upload quality set to LOW (640px)', 'success');
  });

  // Calculate Firebase Storage usage directly from server
  document.getElementById('btn-calculate-firebase-storage')?.addEventListener('click', calculateFirebaseStorageUsage);

  // Add to Home Screen Modal listeners
  document.getElementById('btn-close-ath-modal')?.addEventListener('click', closeAddToHomeScreenModal);

  document.getElementById('btn-copy-folder-shortcut')?.addEventListener('click', function () {
    if (!currentAthFolder) return;
    const link =
      window.location.origin +
      window.location.pathname +
      '?targetFolder=' +
      encodeURIComponent(currentAthFolder) +
      '&action=autoCamera';
    navigator.clipboard.writeText(link);
    showToast(`Deep Link Camera Shortcut copied for "${currentAthFolder}"!`, 'success');
  });

  document.getElementById('btn-download-folder-icon')?.addEventListener('click', function () {
    if (!currentAthIconUrl) return;
    const a = document.createElement('a');
    a.href = currentAthIconUrl;
    a.download = `${currentAthFolder.replace(/[^a-zA-Z0-9]/g, '_')}_icon.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast('Folder launcher icon downloaded!', 'success');
  });

  document.getElementById('btn-modal-pwa-install')?.addEventListener('click', async function () {
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      const { outcome } = await deferredInstallPrompt.userChoice;
      if (outcome === 'accepted') {
        showToast('App shortcut pinned to Home Screen!', 'success');
      }
      deferredInstallPrompt = null;
      document.getElementById('btn-modal-pwa-install')?.classList.add('hidden');
    }
  });

  // Developer / Debug Mode toggle listener
  const debugToggle = document.getElementById('setting-debug-toggle');
  if (debugToggle) {
    const isDebugActive = localStorage.getItem('app_debug_mode') === 'true';
    debugToggle.checked = isDebugActive;
    setErudaVisibility(isDebugActive);
    debugToggle.addEventListener('change', function (e) {
      const isChecked = e.target.checked;
      localStorage.setItem('app_debug_mode', isChecked ? 'true' : 'false');
      setErudaVisibility(isChecked);
      showToast(`Developer Debug Mode ${isChecked ? 'Enabled' : 'Disabled'}`, 'info');
    });
  }
});
