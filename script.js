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
    var stack = error && error.stack ? error.stack : '';
    showErrorOverlay('JavaScript Error', msg, source, lineno, colno, stack);
    return false;
  };

  window.addEventListener('unhandledrejection', function (event) {
    var reason = event.reason;
    var msg = reason ? reason.message || String(reason) : 'Unhandled Promise Rejection';
    var stack = reason && reason.stack ? reason.stack : '';
    showErrorOverlay('Unhandled Rejection', msg, '', '', '', stack);
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
  { id: 'home', label: 'Home', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6', visible: true },
  { id: 'folders', label: 'Folders', icon: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z', visible: true },
  { id: 'search', label: 'Search', icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z', visible: true },
  { id: 'cleanup', label: 'Cleanup', icon: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16', visible: true },
  { id: 'settings', label: 'Settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z', visible: true }
];

let appState = {
  activeTab: 'home',
  folders: [],
  receipts: [],
  navItems: DEFAULT_NAV_ITEMS,
  firebaseConnected: false,
  qualityPreference: 'ultralow', // strictly 'ultralow' (360px) or 'low' (640px)
  layoutPreference: 'grid', // 'grid' or 'list'
  totalAccumulatedBytes: 0,
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
        appState.folders = Object.values(val);
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
    appState.folders = rawF ? JSON.parse(rawF) : DEFAULT_FOLDERS;

    const rawR = localStorage.getItem('app_receipts');
    appState.receipts = rawR ? JSON.parse(rawR) : [];

    const rawNav = localStorage.getItem('app_nav_config');
    appState.navItems = rawNav ? JSON.parse(rawNav) : DEFAULT_NAV_ITEMS;

    const rawBytes = localStorage.getItem('app_accumulated_bytes');
    appState.totalAccumulatedBytes = rawBytes ? parseInt(rawBytes, 10) : 0;

    const savedQuality = localStorage.getItem('app_quality_preference');
    appState.qualityPreference = (savedQuality === 'low') ? 'low' : 'ultralow';
  } catch (e) {
    appState.folders = DEFAULT_FOLDERS;
    appState.receipts = [];
    appState.navItems = DEFAULT_NAV_ITEMS;
  }
}

function saveLocalData() {
  try {
    localStorage.setItem('app_folders', JSON.stringify(appState.folders));
    localStorage.setItem('app_receipts', JSON.stringify(appState.receipts));
    localStorage.setItem('app_nav_config', JSON.stringify(appState.navItems));
    localStorage.setItem('app_accumulated_bytes', appState.totalAccumulatedBytes.toString());
    localStorage.setItem('app_quality_preference', appState.qualityPreference);
  } catch (e) {}
}

// Ensure dynamic Month folder exists
function ensureAutoMonthFolderExists() {
  const currentMonthFolder = getAutoMonthFolderName();
  const exists = appState.folders.some(
    (f) => f.name.toLowerCase() === currentMonthFolder.toLowerCase()
  );

  if (!exists) {
    const newMonthFolder = {
      id: 'f_month_' + Date.now(),
      name: currentMonthFolder,
      color: '#10b981'
    };
    appState.folders.unshift(newMonthFolder);
    if (appState.firebaseConnected && dbRef) {
      dbRef.child('folders').child(newMonthFolder.id).set(newMonthFolder);
    }
    saveLocalData();
  }
  return currentMonthFolder;
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
  } else if (appState.openAccordionId === 'storage-tracker') {
    renderStorageTrackerUI();
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

  container.innerHTML = appState.navItems
    .map((item, idx) => {
      const isFirst = idx === 0;
      const isLast = idx === appState.navItems.length - 1;

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
  appState.activeTab = tabId;

  ['home', 'folders', 'search', 'cleanup', 'settings'].forEach((t) => {
    const el = document.getElementById('tab-' + t);
    if (el) {
      if (t === tabId) {
        el.classList.remove('hidden');
        el.classList.add('animate-fadeIn');
      } else {
        el.classList.add('hidden');
      }
    }
  });

  renderBottomNav();
  renderAllViews();
}

function renderBottomNav() {
  const container = document.getElementById('bottom-nav-container');
  if (!container) return;

  const visibleTabs = appState.navItems.filter((item) => item.visible);

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
  renderHomeReceipts();
  renderFoldersManagement();
  renderSearchResults();
  renderCleanupView();
  renderQualityUI();
  renderStorageTrackerUI();
}

function populateFolderDropdowns() {
  const uploadSelect = document.getElementById('upload-folder-select');
  const searchFilter = document.getElementById('search-folder-filter');
  const currentMonthFolder = getAutoMonthFolderName();

  if (uploadSelect) {
    const optionsHtml =
      `<option value="${currentMonthFolder}">⭐ Auto-Month (${currentMonthFolder})</option>` +
      appState.folders
        .filter((f) => f.name !== currentMonthFolder)
        .map((f) => `<option value="${f.name}">${f.name}</option>`)
        .join('');

    uploadSelect.innerHTML = optionsHtml;
  }

  if (searchFilter) {
    const currentVal = searchFilter.value || 'ALL';
    searchFilter.innerHTML =
      '<option value="ALL">All Folders</option>' +
      appState.folders.map((f) => `<option value="${f.name}">${f.name}</option>`).join('');
    searchFilter.value = currentVal;
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

function renderFoldersManagement() {
  const container = document.getElementById('folders-management-list');
  if (!container) return;

  container.innerHTML = appState.folders
    .map(
      (f) => `<div class="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between">
      <div class="flex items-center space-x-3">
        <div class="w-3 h-3 rounded-full" style="background-color: ${f.color || '#10b981'}"></div>
        <span class="text-xs font-bold text-slate-200">${f.name}</span>
      </div>
      <button type="button" onclick="deleteFolder('${f.id}')" class="p-1.5 text-slate-500 hover:text-red-400 transition cursor-pointer">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
      </button>
    </div>`
    )
    .join('');
}

function renderSearchResults() {
  const container = document.getElementById('search-results-list');
  if (!container) return;

  const query = (document.getElementById('search-query-input')?.value || '').toLowerCase();
  const folder = document.getElementById('search-folder-filter')?.value || 'ALL';

  const filtered = appState.receipts.filter((item) => {
    const matchesFolder = folder === 'ALL' || item.folderName === folder;
    const matchesQuery =
      !query ||
      (item.title && item.title.toLowerCase().includes(query)) ||
      (item.folderName && item.folderName.toLowerCase().includes(query));
    return matchesFolder && matchesQuery;
  });

  if (!filtered.length) {
    container.className = 'col-span-full py-8 text-center text-slate-500 text-xs';
    container.innerHTML = 'No receipts match search criteria.';
    return;
  }

  container.className = 'grid grid-cols-1 sm:grid-cols-2 gap-3';
  container.innerHTML = filtered
    .map(
      (item) => `<div onclick="openModal('${item.id}')" class="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between cursor-pointer hover:border-emerald-500/50 transition">
      <div class="flex items-center space-x-3 min-w-0">
        <img src="${item.imageUrl}" class="w-12 h-12 object-cover rounded-lg bg-slate-950 flex-shrink-0" alt="Receipt" />
        <div class="min-w-0">
          <h4 class="text-xs font-bold text-slate-200 truncate">${item.title || 'Untitled Receipt'}</h4>
          <span class="text-[10px] text-emerald-400 font-mono">${item.folderName}</span>
        </div>
      </div>
    </div>`
    )
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

function renderStorageTrackerUI() {
  const accumValEl = document.getElementById('tracker-accumulated-value');
  const activeCountEl = document.getElementById('tracker-active-count');

  if (accumValEl) {
    accumValEl.textContent = formatByteSize(appState.totalAccumulatedBytes);
  }
  if (activeCountEl) {
    activeCountEl.textContent = appState.receipts.length + ' receipts';
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
  if (appState.firebaseConnected && dbRef) {
    dbRef.child('receipts').child(id).remove();
  }
  appState.receipts = appState.receipts.filter((r) => r.id !== id);
  saveLocalData();
  renderAllViews();
  showToast('Receipt deleted successfully', 'success');
}

function deleteFolder(id) {
  appState.folders = appState.folders.filter((f) => f.id !== id);
  if (appState.firebaseConnected && dbRef) {
    dbRef.child('folders').child(id).remove();
  }
  saveLocalData();
  renderAllViews();
  showToast('Folder deleted', 'info');
}

// ============================================================================
// 9. EVENT BINDINGS & INITIALIZATION
// ============================================================================
document.addEventListener('DOMContentLoaded', function () {
  checkMagicLink();
  loadLocalData();
  initFirebase();
  renderBottomNav();
  renderAllViews();

  // File Upload Preview Handler
  const fileInput = document.getElementById('upload-file-input');
  fileInput?.addEventListener('change', async function (e) {
    const file = e.target.files[0];
    if (!file) return;

    const targetWidth = appState.qualityPreference === 'ultralow' ? 360 : 640;

    try {
      const compressedUrl = await compressImage(file, targetWidth);
      appState.previewImageFile = file;
      appState.previewImageDataUrl = compressedUrl;

      document.getElementById('image-preview-filename').textContent = file.name;
      document.getElementById('image-preview-filesize').textContent =
        `Compressed ~${Math.round(compressedUrl.length / 1024)} KB`;
      document.getElementById('image-preview-thumbnail').src = compressedUrl;
      document.getElementById('image-preview-thumbnail-container').classList.remove('hidden');
    } catch (err) {
      showToast('Error processing image file', 'error');
    }
  });

  // Remove preview button
  document.getElementById('btn-remove-preview-file')?.addEventListener('click', function () {
    if (fileInput) fileInput.value = '';
    appState.previewImageFile = null;
    appState.previewImageDataUrl = null;
    document.getElementById('image-preview-thumbnail-container').classList.add('hidden');
  });

  // Upload Form Submit (Auto-Sorts into Month Folder)
  document.getElementById('upload-form')?.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!appState.previewImageDataUrl) {
      showToast('Please select a receipt image file', 'error');
      return;
    }

    // Auto-Sort Month Folder logic
    const monthFolder = ensureAutoMonthFolderExists();
    let selectedFolder = document.getElementById('upload-folder-select').value;
    if (!selectedFolder) selectedFolder = monthFolder;

    const title = document.getElementById('upload-title-input').value.trim() || 'Untitled Receipt';
    const recId = 'rec_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);

    const imageSizeBytes = appState.previewImageDataUrl.length;

    const newRecord = {
      id: recId,
      title: title,
      folderName: selectedFolder,
      monthFolder: monthFolder, // Dynamic "August 2026" folder tag
      imageUrl: appState.previewImageDataUrl,
      timestamp: Date.now(),
      sizeBytes: imageSizeBytes
    };

    // Firebase Storage upload if storageRef is configured
    if (appState.firebaseConnected && storageRef && appState.previewImageFile) {
      try {
        const fileRef = storageRef.child(`receipts/${monthFolder}/${recId}_${appState.previewImageFile.name}`);
        fileRef.putString(appState.previewImageDataUrl, 'data_url').then((snapshot) => {
          snapshot.ref.getDownloadURL().then((downloadURL) => {
            newRecord.imageUrl = downloadURL;
            if (dbRef) dbRef.child('receipts').child(newRecord.id).set(newRecord);
          });
        }).catch((err) => {
          console.warn('Storage upload fallback to base64 DB record:', err);
          if (dbRef) dbRef.child('receipts').child(newRecord.id).set(newRecord);
        });
      } catch (err) {
        if (dbRef) dbRef.child('receipts').child(newRecord.id).set(newRecord);
      }
    } else if (appState.firebaseConnected && dbRef) {
      dbRef.child('receipts').child(newRecord.id).set(newRecord);
    }

    // Storage Tracker Increment
    appState.totalAccumulatedBytes += imageSizeBytes;

    appState.receipts.unshift(newRecord);
    saveLocalData();
    renderAllViews();

    // Reset form
    e.target.reset();
    appState.previewImageFile = null;
    appState.previewImageDataUrl = null;
    document.getElementById('image-preview-thumbnail-container').classList.add('hidden');

    showToast(`Receipt auto-sorted to "${selectedFolder}"!`, 'success');
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

  // Search input & filter event listeners
  document.getElementById('search-query-input')?.addEventListener('input', renderSearchResults);
  document.getElementById('search-folder-filter')?.addEventListener('change', renderSearchResults);

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

  // Storage Tracker Calculator & Reset
  document.getElementById('btn-calculate-storage')?.addEventListener('click', function () {
    const calcBox = document.getElementById('storage-calc-result');
    calcBox.classList.remove('hidden');

    let totalBytes = appState.receipts.reduce(
      (acc, r) => acc + (r.imageUrl ? r.imageUrl.length : 0),
      0
    );

    document.getElementById('calc-total-size').textContent = formatByteSize(totalBytes);
    document.getElementById('calc-file-count').textContent = appState.receipts.length + ' receipts';
    showToast('Active storage calculation complete', 'success');
  });

  document.getElementById('btn-reset-tracker')?.addEventListener('click', function () {
    appState.totalAccumulatedBytes = 0;
    saveLocalData();
    renderStorageTrackerUI();
    showToast('Accumulated storage tracker reset', 'info');
  });
});
