import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { HomePage } from './components/HomePage';
import { FoldersPanel } from './components/FoldersPanel';
import { SearchManagePanel } from './components/SearchManagePanel';
import { QuickCleanupPanel } from './components/QuickCleanupPanel';
import { FirebaseSettingsPanel } from './components/FirebaseSettingsPanel';
import { ImagePreviewModal } from './components/ImagePreviewModal';
import { ToastContainer, ToastMessage } from './components/Toast';

import { ActiveTab, FolderItem, ImageRecord } from './types';
import {
  subscribeFolders,
  isFirebaseConfigured,
  deleteSingleImage,
  autoSyncOfflineImages,
  checkAndLoadMagicLinkConfig
} from './services/firebaseService';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [isFirebaseConnected, setIsFirebaseConnected] = useState<boolean>(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const toastTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const [previewImage, setPreviewImage] = useState<ImageRecord | null>(null);
  const [selectedFolderForSearch, setSelectedFolderForSearch] = useState<string>('ALL');

  // Trigger Auto-Sync when app mounts, Firebase connects, or device comes online
  const triggerAutoSync = async () => {
    if (isFirebaseConfigured() && navigator.onLine) {
      try {
        await autoSyncOfflineImages(showToast);
      } catch (err) {
        console.error('Auto-sync error:', err);
      }
    }
  };

  // Check connection status and subscribe to folders from Firebase Realtime DB
  useEffect(() => {
    // Check if magic link config is present in URL
    const { loadedFromUrl } = checkAndLoadMagicLinkConfig();
    if (loadedFromUrl) {
      showToast('Configuration loaded from Magic Link!', 'success');
    }

    setIsFirebaseConnected(isFirebaseConfigured());
    triggerAutoSync();

    const handleOnline = () => {
      triggerAutoSync();
    };

    window.addEventListener('online', handleOnline);

    const unsubscribe = subscribeFolders((updatedFolders) => {
      setFolders(updatedFolders);
    });

    // Global Error Logger & Toast Handler
    window.onerror = (message, source, lineno, colno, error) => {
      console.error('Global window.onerror caught:', error || message);
      const msg = typeof message === 'string' ? message : (error?.message || 'JavaScript execution error');
      showToast(`Error: ${msg}`, 'error');
      return false;
    };

    const handleGlobalError = (event: ErrorEvent) => {
      console.error('Global Error caught:', event.error || event.message);
      const msg = event.error?.message || event.message || 'An unexpected error occurred';
      showToast(`Error: ${msg}`, 'error');
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled Rejection caught:', event.reason);
      const msg = event.reason?.message || (typeof event.reason === 'string' ? event.reason : 'Async operation failed');
      showToast(`Error: ${msg}`, 'error');
    };

    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.onerror = null;
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    setToast({ id, message, type });

    // Read user-configured timeout in seconds (2, 3, 4, or 5). Default to 3 seconds.
    const savedTimeout = localStorage.getItem('app_toast_timeout');
    let timeoutSec = savedTimeout ? parseInt(savedTimeout, 10) : 3;
    if (![2, 3, 4, 5].includes(timeoutSec)) {
      timeoutSec = 3;
    }

    toastTimerRef.current = setTimeout(() => {
      setToast(null);
    }, timeoutSec * 1000);
  };

  const dismissToast = () => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setToast(null);
  };

  const handleConfigChanged = () => {
    const configured = isFirebaseConfigured();
    setIsFirebaseConnected(configured);
    if (configured) {
      triggerAutoSync();
    }
  };

  const handleSelectFolderForSearch = (folderName: string) => {
    setSelectedFolderForSearch(folderName);
    setActiveTab('search');
  };

  const handleDeletePreviewImage = async (img: ImageRecord) => {
    try {
      await deleteSingleImage(img);
      showToast('Receipt image deleted from Storage & Realtime DB', 'success');
      setPreviewImage(null);
    } catch (err: any) {
      showToast('Failed to delete image: ' + (err.message || 'Error'), 'error');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased selection:bg-emerald-500 selection:text-slate-950 flex flex-col">
      {/* Top Android App Bar Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isFirebaseConnected={isFirebaseConnected}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 pt-5 pb-28 sm:pb-32">
        {activeTab === 'home' && (
          <HomePage
            folders={folders}
            onFolderCreateClick={() => setActiveTab('folders')}
            showToast={showToast}
            onUploadSuccess={(record) => {
              // Optionally transition or stay on home
            }}
          />
        )}

        {activeTab === 'folders' && (
          <FoldersPanel
            folders={folders}
            showToast={showToast}
            onSelectFolderForSearch={handleSelectFolderForSearch}
          />
        )}

        {activeTab === 'search' && (
          <SearchManagePanel
            folders={folders}
            initialFolder={selectedFolderForSearch}
            showToast={showToast}
            onPreviewImage={(img) => setPreviewImage(img)}
          />
        )}

        {activeTab === 'cleanup' && (
          <QuickCleanupPanel
            folders={folders}
            showToast={showToast}
            onCleanupCompleted={() => {
              // Refresh or trigger updates if needed
            }}
          />
        )}

        {activeTab === 'settings' && (
          <FirebaseSettingsPanel
            showToast={showToast}
            onConfigChanged={handleConfigChanged}
          />
        )}
      </main>

      {/* Bottom Android Navigation Bar */}
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Full Image Preview Modal */}
      <ImagePreviewModal
        image={previewImage}
        onClose={() => setPreviewImage(null)}
        onDelete={handleDeletePreviewImage}
      />

      {/* Toast Snackbar Container */}
      <ToastContainer toast={toast} onDismiss={dismissToast} />
    </div>
  );
}
