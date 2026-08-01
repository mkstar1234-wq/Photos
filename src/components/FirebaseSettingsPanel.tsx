import React, { useState, useEffect } from 'react';
import {
  Settings,
  Database,
  Key,
  Globe,
  Server,
  Trash2,
  ShieldCheck,
  Share2,
  FileCode,
  Sparkles,
  CheckCircle2,
  Sliders,
  ArrowUp,
  ArrowDown,
  HardDrive,
  RefreshCw,
  Calculator,
  AlertCircle,
  Clock,
  ChevronDown,
  Layout
} from 'lucide-react';
import { FirebaseConfig } from '../types';
import { loadNavConfig, saveNavConfig, NavItemConfig } from '../utils/navConfig';
import {
  getStoredConfig,
  saveStoredConfig,
  clearStoredConfig,
  isFirebaseConfigured,
  parseFirebaseConfigInput,
  generateMagicLink,
  autoSyncOfflineImages,
  calculateServerStorageUsage,
} from '../services/firebaseService';

interface FirebaseSettingsPanelProps {
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onConfigChanged: () => void;
}

interface AccordionItemProps {
  id: string;
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  badge?: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

const AccordionItem: React.FC<AccordionItemProps> = ({
  id,
  title,
  subtitle,
  icon,
  badge,
  isOpen,
  onToggle,
  children,
}) => {
  return (
    <div className={`bg-[#1A1C1E] border rounded-[20px] overflow-hidden transition-all duration-200 shadow-sm ${
      isOpen ? 'border-[#D0E4FF]/30 ring-1 ring-[#D0E4FF]/20' : 'border-white/5 hover:border-white/10'
    }`}>
      <button
        type="button"
        id={`accordion-toggle-${id}`}
        onClick={onToggle}
        className="w-full p-4.5 sm:p-5 flex items-center justify-between text-left transition-colors touch-manipulation cursor-pointer select-none active:bg-white/5"
        aria-expanded={isOpen}
      >
        <div className="flex items-center space-x-3.5 min-w-0 pr-2">
          <div className={`p-2.5 rounded-xl flex-shrink-0 transition-colors ${
            isOpen ? 'bg-[#D0E4FF]/15 text-[#D0E4FF]' : 'bg-[#0E1116] text-gray-400'
          }`}>
            {icon}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-sm text-[#E2E2E6] truncate">{title}</h3>
            {subtitle && (
              <p className="text-[11px] text-gray-400 truncate mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2.5 flex-shrink-0">
          {badge}
          <div className={`p-1.5 rounded-lg text-gray-400 bg-[#0E1116] border border-white/5 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-[#D0E4FF] bg-[#D0E4FF]/10 border-[#D0E4FF]/20' : 'rotate-0'
          }`}>
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>
      </button>

      {isOpen && (
        <div className="px-4 pb-5 pt-3 border-t border-white/5 space-y-4 animate-fadeIn">
          {children}
        </div>
      )}
    </div>
  );
};

export const FirebaseSettingsPanel: React.FC<FirebaseSettingsPanelProps> = ({
  showToast,
  onConfigChanged,
}) => {
  // Accordion Mutually Exclusive State (Default: all closed = null)
  const [openSectionId, setOpenSectionId] = useState<string | null>(null);

  const toggleSection = (sectionId: string) => {
    setOpenSectionId((prev) => (prev === sectionId ? null : sectionId));
  };

  const [apiKey, setApiKey] = useState('');
  const [authDomain, setAuthDomain] = useState('');
  const [databaseURL, setDatabaseURL] = useState('');
  const [projectId, setProjectId] = useState('');
  const [storageBucket, setStorageBucket] = useState('');
  const [messagingSenderId, setMessagingSenderId] = useState('');
  const [appId, setAppId] = useState('');

  // Single Box JSON Config State
  const [rawJsonInput, setRawJsonInput] = useState('');

  const [isConnected, setIsConnected] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    const cfg = getStoredConfig();
    if (cfg) {
      setApiKey(cfg.apiKey || '');
      setAuthDomain(cfg.authDomain || '');
      setDatabaseURL(cfg.databaseURL || '');
      setProjectId(cfg.projectId || '');
      setStorageBucket(cfg.storageBucket || '');
      setMessagingSenderId(cfg.messagingSenderId || '');
      setAppId(cfg.appId || '');

      setRawJsonInput(JSON.stringify(cfg, null, 2));
    }
    setIsConnected(isFirebaseConfigured());
  }, []);

  const handleSaveIndividualConfig = (e: React.FormEvent) => {
    e.preventDefault();

    if (!apiKey.trim() || !databaseURL.trim() || !projectId.trim()) {
      showToast('Please fill in at least API Key, Realtime Database URL, and Project ID.', 'error');
      return;
    }

    const config: FirebaseConfig = {
      apiKey: apiKey.trim(),
      authDomain: authDomain.trim(),
      databaseURL: databaseURL.trim(),
      projectId: projectId.trim(),
      storageBucket: storageBucket.trim(),
      messagingSenderId: messagingSenderId.trim(),
      appId: appId.trim(),
    };

    const success = saveStoredConfig(config);
    if (success) {
      setIsConnected(true);
      setRawJsonInput(JSON.stringify(config, null, 2));
      showToast('Firebase configuration saved! Realtime Database & Storage connected dynamically.', 'success');
      onConfigChanged();
      autoSyncOfflineImages(showToast);
    } else {
      setIsConnected(false);
      showToast('Failed to initialize Firebase with provided credentials. Please check your config.', 'error');
    }
  };

  const handleParseAndSaveJson = () => {
    if (!rawJsonInput.trim()) {
      showToast('Please paste your Firebase configuration object or JSON into the box.', 'error');
      return;
    }

    const parsedConfig = parseFirebaseConfigInput(rawJsonInput);
    if (!parsedConfig) {
      showToast('Invalid JSON or Firebase config string. Could not parse credentials.', 'error');
      return;
    }

    setApiKey(parsedConfig.apiKey || '');
    setAuthDomain(parsedConfig.authDomain || '');
    setDatabaseURL(parsedConfig.databaseURL || '');
    setProjectId(parsedConfig.projectId || '');
    setStorageBucket(parsedConfig.storageBucket || '');
    setMessagingSenderId(parsedConfig.messagingSenderId || '');
    setAppId(parsedConfig.appId || '');

    const success = saveStoredConfig(parsedConfig);
    if (success) {
      setIsConnected(true);
      showToast('Single Box JSON config parsed & saved successfully! Firebase connected.', 'success');
      onConfigChanged();
      autoSyncOfflineImages(showToast);
    } else {
      setIsConnected(false);
      showToast('Failed to connect to Firebase with parsed configuration.', 'error');
    }
  };

  const handleShareMagicLink = async () => {
    const config: FirebaseConfig = {
      apiKey: apiKey.trim(),
      authDomain: authDomain.trim(),
      databaseURL: databaseURL.trim(),
      projectId: projectId.trim(),
      storageBucket: storageBucket.trim(),
      messagingSenderId: messagingSenderId.trim(),
      appId: appId.trim(),
    };

    if (!config.apiKey && !config.databaseURL && !config.projectId) {
      showToast('No active Firebase configuration found. Please save a configuration first!', 'error');
      return;
    }

    const magicLink = generateMagicLink(config);
    if (!magicLink) {
      showToast('Failed to generate Magic Link.', 'error');
      return;
    }

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Firebase Receipt App Config',
          text: 'Open this Magic Link to load Firebase credentials automatically into the app:',
          url: magicLink,
        });
        showToast('Magic Link shared successfully!', 'success');
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return;
      }
    }

    try {
      await navigator.clipboard.writeText(magicLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);
      showToast('Magic Link created & copied to clipboard!', 'success');
    } catch {
      showToast('Magic Link generated: ' + magicLink, 'info');
    }
  };

  const handleClearConfig = () => {
    localStorage.clear();
    clearStoredConfig();
    setApiKey('');
    setAuthDomain('');
    setDatabaseURL('');
    setProjectId('');
    setStorageBucket('');
    setMessagingSenderId('');
    setAppId('');
    setRawJsonInput('');
    setIsConnected(false);
    alert('Credentials Cleared');
    window.location.reload();
  };

  const [layoutPreference, setLayoutPreference] = useState<'grid' | 'list'>(() => {
    return (localStorage.getItem('home_layout_preference') as 'grid' | 'list') || 'grid';
  });

  const [uploadQualityPreference, setUploadQualityPreference] = useState<'ultralow' | 'verylow' | 'low'>(() => {
    const saved = localStorage.getItem('app_upload_quality');
    if (saved === 'verylow' || saved === 'low' || saved === 'ultralow') {
      return saved;
    }
    return 'ultralow';
  });

  const [navItems, setNavItems] = useState<NavItemConfig[]>(() => loadNavConfig());

  const handleNavToggle = (id: string) => {
    if (id === 'settings') return;
    const updated = navItems.map((item) =>
      item.id === id ? { ...item, visible: !item.visible } : item
    );
    const saved = saveNavConfig(updated);
    setNavItems(saved);
    showToast(`Navigation bar layout updated`, 'success');
  };

  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    const updated = [...navItems];
    const temp = updated[index];
    updated[index] = updated[index - 1];
    updated[index - 1] = temp;
    const saved = saveNavConfig(updated);
    setNavItems(saved);
    showToast(`Reordered "${updated[index - 1].label}" up`, 'info');
  };

  const handleMoveDown = (index: number) => {
    if (index >= navItems.length - 1) return;
    const updated = [...navItems];
    const temp = updated[index];
    updated[index] = updated[index + 1];
    updated[index + 1] = temp;
    const saved = saveNavConfig(updated);
    setNavItems(saved);
    showToast(`Reordered "${updated[index + 1].label}" down`, 'info');
  };

  const handleLayoutToggle = (mode: 'grid' | 'list') => {
    setLayoutPreference(mode);
    localStorage.setItem('home_layout_preference', mode);
    showToast(`Home page layout set to ${mode === 'grid' ? 'Grid View' : 'List View'}`, 'success');
  };

  const handleQualityChange = (level: 'ultralow' | 'verylow' | 'low') => {
    setUploadQualityPreference(level);
    localStorage.setItem('app_upload_quality', level);
    const labels = {
      ultralow: 'Ultra-Low (360px, ~15 KB)',
      verylow: 'Very Low (480px, ~30 KB)',
      low: 'Low (640px, ~50 KB)'
    };
    showToast(`Global upload quality set to ${labels[level]}`, 'success');
  };

  const [toastTimeoutPreference, setToastTimeoutPreference] = useState<2 | 3 | 4 | 5>(() => {
    const saved = localStorage.getItem('app_toast_timeout');
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (parsed === 2 || parsed === 3 || parsed === 4 || parsed === 5) {
        return parsed as 2 | 3 | 4 | 5;
      }
    }
    return 3;
  });

  const handleToastTimeoutChange = (sec: 2 | 3 | 4 | 5) => {
    setToastTimeoutPreference(sec);
    localStorage.setItem('app_toast_timeout', sec.toString());
    showToast(`Toast container timeout set to ${sec} seconds`, 'success');
  };

  // On-Demand Storage Calculator State & Handler
  const [isCalculatingStorage, setIsCalculatingStorage] = useState<boolean>(false);
  const [storageCalcResult, setStorageCalcResult] = useState<{
    totalBytes: number;
    formattedSize: string;
    fileCount: number;
    isLocalFallback: boolean;
    sourceLabel?: string;
    calculatedAt: Date;
  } | null>(null);
  const [storageCalcError, setStorageCalcError] = useState<string | null>(null);

  const handleCalculateStorage = async () => {
    setIsCalculatingStorage(true);
    setStorageCalcError(null);
    try {
      const res = await calculateServerStorageUsage();
      setStorageCalcResult({
        ...res,
        calculatedAt: new Date(),
      });
      showToast(`Storage calculated: ${res.formattedSize} across ${res.fileCount} files`, 'success');
    } catch (err: any) {
      console.error('Storage calculation error:', err);
      setStorageCalcError(err?.message || 'Failed to calculate storage from Firebase Storage');
      showToast('Failed to calculate storage usage', 'error');
    } finally {
      setIsCalculatingStorage(false);
    }
  };

  const visibleTabsCount = navItems.filter((i) => i.visible).length;

  return (
    <div className="space-y-4 pb-24 max-w-2xl mx-auto">
      {/* Header Connection Badge */}
      <div className={`p-4 sm:p-5 rounded-[20px] border ${
        isConnected
          ? 'bg-[#1A1C1E] border-emerald-500/30 text-[#E2E2E6]'
          : 'bg-[#1A1C1E] border-amber-500/30 text-[#E2E2E6]'
      }`}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className={`p-2.5 rounded-xl ${isConnected ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-semibold text-xs sm:text-sm text-[#E2E2E6]">
                {isConnected ? 'Firebase Realtime DB & Storage Active' : 'Local Demo Mode Active'}
              </h2>
              <p className="text-[11px] text-gray-400 mt-0.5">
                {isConnected
                  ? 'App synced with live Firebase backend credentials.'
                  : 'No custom credentials. Tap below to configure.'}
              </p>
            </div>
          </div>
          <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border flex-shrink-0 ${
            isConnected
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
          }`}>
            {isConnected ? 'Connected' : 'Local Mode'}
          </span>
        </div>
      </div>

      {/* MUTUALLY EXCLUSIVE ACCORDION LIST */}
      <div className="space-y-3">
        {/* 1. SINGLE BOX JSON CONFIG */}
        <AccordionItem
          id="json-config"
          title="Single Box JSON Config"
          subtitle="Paste raw Firebase config object or JS snippet"
          icon={<FileCode className="w-5 h-5" />}
          badge={
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#D0E4FF] bg-[#D0E4FF]/10 px-2 py-0.5 rounded-full border border-[#D0E4FF]/20">
              Fast Setup
            </span>
          }
          isOpen={openSectionId === 'json-config'}
          onToggle={() => toggleSection('json-config')}
        >
          <p className="text-xs text-gray-400 leading-relaxed">
            Paste your complete Firebase config object (JSON or JS snippet from Firebase Console) directly below. The app will extract all key credentials automatically.
          </p>

          <div className="space-y-2.5 pt-1">
            <textarea
              id="firebase-json-textarea"
              rows={5}
              value={rawJsonInput}
              onChange={(e) => setRawJsonInput(e.target.value)}
              placeholder={`{\n  "apiKey": "AIzaSy...",\n  "authDomain": "my-app.firebaseapp.com",\n  "databaseURL": "https://my-app-default-rtdb.firebaseio.com",\n  "projectId": "my-app",\n  "storageBucket": "my-app.firebasestorage.app"\n}`}
              className="w-full bg-[#0E1116] border border-white/5 rounded-xl p-3 text-xs font-mono text-gray-200 outline-none focus:border-[#D0E4FF]/50 transition placeholder:text-gray-600 resize-none"
            />

            <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-1">
              <button
                type="button"
                onClick={handleParseAndSaveJson}
                className="w-full sm:w-auto py-2.5 px-4 bg-[#D0E4FF] hover:bg-white text-[#00315B] rounded-xl text-xs font-bold uppercase tracking-wider transition flex items-center justify-center space-x-2 shadow touch-manipulation cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Parse & Save JSON</span>
              </button>

              <button
                type="button"
                onClick={handleShareMagicLink}
                disabled={!isConnected && !apiKey && !databaseURL}
                className={`w-full sm:w-auto py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition flex items-center justify-center space-x-2 border touch-manipulation ${
                  isConnected || apiKey || databaseURL
                    ? 'bg-[#0E1116] hover:bg-white/10 text-[#D0E4FF] border-[#D0E4FF]/30 cursor-pointer'
                    : 'bg-[#0E1116]/50 text-gray-600 border-white/5 cursor-not-allowed'
                }`}
              >
                {copiedLink ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
                <span>{copiedLink ? 'Magic Link Copied!' : 'Share Magic Link'}</span>
              </button>
            </div>
          </div>
        </AccordionItem>

        {/* 2. INDIVIDUAL PROJECT FIELDS */}
        <AccordionItem
          id="individual-fields"
          title="Individual Project Fields"
          subtitle="View or edit individual Firebase credentials"
          icon={<Settings className="w-5 h-5" />}
          badge={
            <span className="text-[10px] font-mono text-gray-400 bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
              Manual
            </span>
          }
          isOpen={openSectionId === 'individual-fields'}
          onToggle={() => toggleSection('individual-fields')}
        >
          <form onSubmit={handleSaveIndividualConfig} className="space-y-3.5 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* API Key */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 flex items-center space-x-1">
                  <Key className="w-3 h-3 text-[#D0E4FF]" />
                  <span>API Key *</span>
                </label>
                <input
                  id="firebase-api-key"
                  type="text"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  required
                  className="w-full bg-[#0E1116] border border-white/5 rounded-lg px-3 py-2 text-xs font-mono text-gray-300 outline-none focus:border-[#D0E4FF]/40"
                />
              </div>

              {/* Realtime Database URL */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 flex items-center space-x-1">
                  <Server className="w-3 h-3 text-[#D0E4FF]" />
                  <span>Realtime DB URL *</span>
                </label>
                <input
                  id="firebase-db-url"
                  type="text"
                  value={databaseURL}
                  onChange={(e) => setDatabaseURL(e.target.value)}
                  placeholder="https://your-project-default-rtdb.firebaseio.com"
                  required
                  className="w-full bg-[#0E1116] border border-white/5 rounded-lg px-3 py-2 text-xs font-mono text-gray-300 outline-none focus:border-[#D0E4FF]/40"
                />
              </div>

              {/* Project ID */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 flex items-center space-x-1">
                  <Globe className="w-3 h-3 text-[#D0E4FF]" />
                  <span>Project ID *</span>
                </label>
                <input
                  id="firebase-project-id"
                  type="text"
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  placeholder="my-receipt-app"
                  required
                  className="w-full bg-[#0E1116] border border-white/5 rounded-lg px-3 py-2 text-xs font-mono text-gray-300 outline-none focus:border-[#D0E4FF]/40"
                />
              </div>

              {/* Storage Bucket */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 flex items-center space-x-1">
                  <Database className="w-3 h-3 text-[#D0E4FF]" />
                  <span>Storage Bucket</span>
                </label>
                <input
                  id="firebase-storage-bucket"
                  type="text"
                  value={storageBucket}
                  onChange={(e) => setStorageBucket(e.target.value)}
                  placeholder="my-receipt-app.firebasestorage.app"
                  className="w-full bg-[#0E1116] border border-white/5 rounded-lg px-3 py-2 text-xs font-mono text-gray-300 outline-none focus:border-[#D0E4FF]/40"
                />
              </div>

              {/* Auth Domain */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Auth Domain</label>
                <input
                  id="firebase-auth-domain"
                  type="text"
                  value={authDomain}
                  onChange={(e) => setAuthDomain(e.target.value)}
                  placeholder="my-receipt-app.firebaseapp.com"
                  className="w-full bg-[#0E1116] border border-white/5 rounded-lg px-3 py-2 text-xs font-mono text-gray-300 outline-none focus:border-[#D0E4FF]/40"
                />
              </div>

              {/* Messaging Sender ID */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Messaging Sender ID</label>
                <input
                  id="firebase-sender-id"
                  type="text"
                  value={messagingSenderId}
                  onChange={(e) => setMessagingSenderId(e.target.value)}
                  placeholder="123456789012"
                  className="w-full bg-[#0E1116] border border-white/5 rounded-lg px-3 py-2 text-xs font-mono text-gray-300 outline-none focus:border-[#D0E4FF]/40"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-2.5 border-t border-white/5">
              <button
                type="button"
                onClick={handleClearConfig}
                className="w-full sm:w-auto px-3.5 py-2 bg-[#0E1116] hover:bg-white/5 text-red-400 hover:text-red-300 font-bold text-xs rounded-lg border border-white/5 transition flex items-center justify-center space-x-1.5 touch-manipulation cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Credentials</span>
              </button>

              <button
                id="save-firebase-config-btn"
                type="submit"
                className="w-full sm:w-auto py-2.5 px-5 bg-[#D0E4FF] hover:bg-white text-[#00315B] rounded-lg text-xs font-bold uppercase tracking-wider transition flex items-center justify-center space-x-1.5 shadow touch-manipulation cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Update Config</span>
              </button>
            </div>
          </form>
        </AccordionItem>

        {/* 3. CUSTOMIZE NAVIGATION BAR */}
        <AccordionItem
          id="navigation-bar"
          title="Customize Navigation Bar"
          subtitle="Toggle tab visibility and reorder navigation buttons"
          icon={<Sliders className="w-5 h-5" />}
          badge={
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#D0E4FF] bg-[#D0E4FF]/10 px-2 py-0.5 rounded-full border border-[#D0E4FF]/20">
              {visibleTabsCount} Tabs
            </span>
          }
          isOpen={openSectionId === 'navigation-bar'}
          onToggle={() => toggleSection('navigation-bar')}
        >
          <p className="text-xs text-gray-400 leading-relaxed">
            Reorder tab sequence using ↑ and ↓. Toggle visibility off to hide tabs from the bottom nav bar.
          </p>

          <div className="space-y-2 pt-1">
            {navItems.map((item, index) => {
              const isLocked = item.id === 'settings';
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 bg-[#0E1116] border border-white/5 rounded-xl hover:border-white/10 transition gap-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-[#E2E2E6]">{item.label}</span>
                      {isLocked && (
                        <span className="text-[9px] bg-[#D0E4FF]/10 text-[#D0E4FF] font-semibold px-1.5 py-0.5 rounded-full border border-[#D0E4FF]/20">
                          Required
                        </span>
                      )}
                    </div>
                    {item.desc && (
                      <span className="text-[10px] text-gray-400 block mt-0.5 truncate">{item.desc}</span>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 flex-shrink-0">
                    <div className="flex items-center space-x-1 bg-[#1A1C1E] border border-white/5 rounded-lg p-1">
                      <button
                        type="button"
                        id={`nav-move-up-${item.id}`}
                        disabled={index === 0}
                        onClick={() => handleMoveUp(index)}
                        className="p-1 rounded text-gray-400 hover:text-[#D0E4FF] hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition touch-manipulation cursor-pointer"
                        title="Move Up"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        id={`nav-move-down-${item.id}`}
                        disabled={index === navItems.length - 1}
                        onClick={() => handleMoveDown(index)}
                        className="p-1 rounded text-gray-400 hover:text-[#D0E4FF] hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition touch-manipulation cursor-pointer"
                        title="Move Down"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <button
                      type="button"
                      id={`toggle-nav-${item.id}`}
                      disabled={isLocked}
                      onClick={() => handleNavToggle(item.id)}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        item.visible ? 'bg-[#D0E4FF]' : 'bg-gray-700'
                      } ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                      role="switch"
                      aria-checked={item.visible}
                    >
                      <span
                        aria-hidden="true"
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-[#00315B] shadow ring-0 transition duration-200 ease-in-out ${
                          item.visible ? 'translate-x-5' : 'translate-x-0 bg-gray-400'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </AccordionItem>

        {/* 4. SERVER STORAGE CALCULATOR */}
        <AccordionItem
          id="storage-calculator"
          title="Server Storage Usage Calculator"
          subtitle="Scan bucket total size on-demand without slowing app load"
          icon={<HardDrive className="w-5 h-5" />}
          badge={
            <span className="text-[10px] font-mono text-[#D0E4FF] bg-[#D0E4FF]/10 px-2 py-0.5 rounded-full border border-[#D0E4FF]/20">
              {storageCalcResult ? storageCalcResult.formattedSize : 'On-Demand'}
            </span>
          }
          isOpen={openSectionId === 'storage-calculator'}
          onToggle={() => toggleSection('storage-calculator')}
        >
          <p className="text-xs text-gray-400 leading-relaxed">
            Calculate the exact total storage space used in your Firebase Storage bucket (scans recursively across all subfolders via <code className="text-[#D0E4FF]">listAll()</code> and <code className="text-[#D0E4FF]">getMetadata()</code>). This operation is strictly user-triggered.
          </p>

          <div className="pt-1 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            <button
              type="button"
              id="btn-calculate-storage"
              disabled={isCalculatingStorage}
              onClick={handleCalculateStorage}
              className="px-4 py-2.5 bg-[#D0E4FF] hover:bg-white text-[#00315B] rounded-xl text-xs font-bold uppercase tracking-wider transition flex items-center justify-center space-x-2 shadow disabled:opacity-50 touch-manipulation cursor-pointer"
            >
              {isCalculatingStorage ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-[#00315B]" />
                  <span>Calculating Server Storage...</span>
                </>
              ) : (
                <>
                  <Calculator className="w-4 h-4 text-[#00315B]" />
                  <span>Calculate Server Storage</span>
                </>
              )}
            </button>

            {storageCalcResult && (
              <div className="text-[11px] text-gray-400 font-mono self-center">
                Last run: {storageCalcResult.calculatedAt.toLocaleTimeString()}
              </div>
            )}
          </div>

          {storageCalcResult && (
            <div className="mt-3 p-3.5 bg-[#0E1116] border border-white/10 rounded-xl space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-2.5">
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider block">
                    Exact Total Storage Used
                  </span>
                  <div className="text-xl font-extrabold text-[#D0E4FF] font-mono mt-0.5">
                    {storageCalcResult.formattedSize}
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider block">
                    Total Files Scanned
                  </span>
                  <div className="text-base font-bold text-white font-mono mt-0.5">
                    {storageCalcResult.fileCount} {storageCalcResult.fileCount === 1 ? 'file' : 'files'}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono text-gray-400">
                <div className="flex items-center justify-between bg-[#1A1C1E] p-2 rounded-lg border border-white/5">
                  <span>Exact Size:</span>
                  <span className="text-gray-200 font-bold">{storageCalcResult.totalBytes.toLocaleString()} B</span>
                </div>
                <div className="flex items-center justify-between bg-[#1A1C1E] p-2 rounded-lg border border-white/5">
                  <span>Storage Target:</span>
                  <span className={`font-bold ${storageCalcResult.isLocalFallback ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {storageCalcResult.sourceLabel || (storageCalcResult.isLocalFallback ? 'Local Fallback' : 'Firebase Storage Bucket')}
                  </span>
                </div>
              </div>
            </div>
          )}

          {storageCalcError && (
            <div className="p-2.5 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center space-x-2 text-xs text-red-300">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
              <span>{storageCalcError}</span>
            </div>
          )}
        </AccordionItem>

        {/* 5. TOAST NOTIFICATION TIMEOUT */}
        <AccordionItem
          id="toast-timeout"
          title="Toast Notification Timeout"
          subtitle="Configure auto-dismiss duration for popup toasts"
          icon={<Clock className="w-5 h-5" />}
          badge={
            <span className="text-[10px] font-extrabold font-mono text-[#D0E4FF] bg-[#D0E4FF]/10 px-2 py-0.5 rounded-full border border-[#D0E4FF]/20">
              {toastTimeoutPreference}s
            </span>
          }
          isOpen={openSectionId === 'toast-timeout'}
          onToggle={() => toggleSection('toast-timeout')}
        >
          <p className="text-xs text-gray-400 leading-relaxed">
            Select how long toast notification banners remain on screen before auto-dismissing.
          </p>

          <div className="grid grid-cols-4 gap-2 pt-1">
            {([2, 3, 4, 5] as const).map((sec) => (
              <button
                key={sec}
                type="button"
                id={`toast-timeout-btn-${sec}s`}
                onClick={() => handleToastTimeoutChange(sec)}
                className={`p-2.5 rounded-xl border flex flex-col items-center justify-center space-y-0.5 transition touch-manipulation cursor-pointer ${
                  toastTimeoutPreference === sec
                    ? 'bg-[#D0E4FF]/15 border-[#D0E4FF] text-[#D0E4FF]'
                    : 'bg-[#0E1116] border-white/5 text-gray-400 hover:border-white/20'
                }`}
              >
                <span className="text-xs font-extrabold font-mono">{sec}s</span>
                <span className="text-[9px] opacity-75">
                  {sec === 3 ? 'Default' : `${sec} Sec`}
                </span>
              </button>
            ))}
          </div>
        </AccordionItem>

        {/* 6. GLOBAL UPLOAD QUALITY */}
        <AccordionItem
          id="upload-quality"
          title="Upload Quality & Speed"
          subtitle="Configure default image compression for zero-lag mobile captures"
          icon={<Sparkles className="w-5 h-5" />}
          badge={
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#D0E4FF] bg-[#D0E4FF]/10 px-2 py-0.5 rounded-full border border-[#D0E4FF]/20">
              {uploadQualityPreference === 'ultralow' ? '360px' : uploadQualityPreference === 'verylow' ? '480px' : '640px'}
            </span>
          }
          isOpen={openSectionId === 'upload-quality'}
          onToggle={() => toggleSection('upload-quality')}
        >
          <p className="text-xs text-gray-400 leading-relaxed">
            Set default image resolution for captures. Lower quality ensures fast background uploads over weak mobile data.
          </p>

          <div className="grid grid-cols-3 gap-2 pt-1">
            <button
              type="button"
              id="quality-btn-ultralow"
              onClick={() => handleQualityChange('ultralow')}
              className={`p-2.5 rounded-xl border flex flex-col items-center justify-center space-y-0.5 transition touch-manipulation cursor-pointer ${
                uploadQualityPreference === 'ultralow'
                  ? 'bg-[#D0E4FF]/15 border-[#D0E4FF] text-[#D0E4FF]'
                  : 'bg-[#0E1116] border-white/5 text-gray-400 hover:border-white/20'
              }`}
            >
              <span className="text-[11px] font-bold uppercase tracking-wider">Ultra-Low</span>
              <span className="text-[9px] opacity-80">360px (~15KB)</span>
              <span className="text-[9px] text-emerald-400 font-semibold">Default</span>
            </button>

            <button
              type="button"
              id="quality-btn-verylow"
              onClick={() => handleQualityChange('verylow')}
              className={`p-2.5 rounded-xl border flex flex-col items-center justify-center space-y-0.5 transition touch-manipulation cursor-pointer ${
                uploadQualityPreference === 'verylow'
                  ? 'bg-[#D0E4FF]/15 border-[#D0E4FF] text-[#D0E4FF]'
                  : 'bg-[#0E1116] border-white/5 text-gray-400 hover:border-white/20'
              }`}
            >
              <span className="text-[11px] font-bold uppercase tracking-wider">Very Low</span>
              <span className="text-[9px] opacity-80">480px (~30KB)</span>
              <span className="text-[9px] text-sky-400 font-semibold font-mono">Small</span>
            </button>

            <button
              type="button"
              id="quality-btn-low"
              onClick={() => handleQualityChange('low')}
              className={`p-2.5 rounded-xl border flex flex-col items-center justify-center space-y-0.5 transition touch-manipulation cursor-pointer ${
                uploadQualityPreference === 'low'
                  ? 'bg-[#D0E4FF]/15 border-[#D0E4FF] text-[#D0E4FF]'
                  : 'bg-[#0E1116] border-white/5 text-gray-400 hover:border-white/20'
              }`}
            >
              <span className="text-[11px] font-bold uppercase tracking-wider">Low</span>
              <span className="text-[9px] opacity-80">640px (~50KB)</span>
              <span className="text-[9px] text-amber-400 font-semibold">Standard</span>
            </button>
          </div>
        </AccordionItem>

        {/* 7. HOME PAGE LAYOUT PREFERENCE */}
        <AccordionItem
          id="home-layout"
          title="Home Page Layout Preference"
          subtitle="Choose between Grid View or List View on the main screen"
          icon={<Layout className="w-5 h-5" />}
          badge={
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#D0E4FF] bg-[#D0E4FF]/10 px-2 py-0.5 rounded-full border border-[#D0E4FF]/20">
              {layoutPreference === 'grid' ? 'Grid' : 'List'}
            </span>
          }
          isOpen={openSectionId === 'home-layout'}
          onToggle={() => toggleSection('home-layout')}
        >
          <p className="text-xs text-gray-400 leading-relaxed">
            Choose whether folders display in a multi-column block grid or a full-width line list on the home screen.
          </p>

          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => handleLayoutToggle('grid')}
              className={`p-3 rounded-xl border flex flex-col items-center justify-center space-y-1 transition touch-manipulation cursor-pointer ${
                layoutPreference === 'grid'
                  ? 'bg-[#D0E4FF]/15 border-[#D0E4FF] text-[#D0E4FF]'
                  : 'bg-[#0E1116] border-white/5 text-gray-400 hover:border-white/20'
              }`}
            >
              <span className="text-xs font-bold uppercase tracking-wider">Grid View (Block)</span>
              <span className="text-[10px] opacity-70">Camera icon blocks in columns</span>
            </button>

            <button
              type="button"
              onClick={() => handleLayoutToggle('list')}
              className={`p-3 rounded-xl border flex flex-col items-center justify-center space-y-1 transition touch-manipulation cursor-pointer ${
                layoutPreference === 'list'
                  ? 'bg-[#D0E4FF]/15 border-[#D0E4FF] text-[#D0E4FF]'
                  : 'bg-[#0E1116] border-white/5 text-gray-400 hover:border-white/20'
              }`}
            >
              <span className="text-xs font-bold uppercase tracking-wider">List View (Line)</span>
              <span className="text-[10px] opacity-70">Horizontal list with snap buttons</span>
            </button>
          </div>
        </AccordionItem>
      </div>
    </div>
  );
};
