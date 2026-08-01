import { initializeApp, getApps, deleteApp, FirebaseApp } from 'firebase/app';
import {
  getDatabase,
  ref as dbRef,
  set,
  push,
  onValue,
  remove,
  get,
  Database
} from 'firebase/database';
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  listAll,
  getMetadata,
  StorageReference,
  FirebaseStorage
} from 'firebase/storage';
import { FirebaseConfig, FolderItem, ImageRecord } from '../types';
import { formatBytes } from '../utils/imageCompressor';
import {
  saveImageToOfflineQueue,
  getOfflineQueueImages,
  removeImageFromOfflineQueue,
  getOfflineQueueCount,
  OfflineQueueItem
} from './indexedDBQueueService';

const CONFIG_STORAGE_KEY = 'receipt_app_firebase_config';
const LOCAL_FOLDERS_KEY = 'receipt_app_local_folders';
const LOCAL_IMAGES_KEY = 'receipt_app_local_images';

let appInstance: FirebaseApp | null = null;
let dbInstance: Database | null = null;
let storageInstance: FirebaseStorage | null = null;

/**
 * Utility to wrap any Promise with a strict timeout to avoid silent hangs on mobile/unstable connections
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs = 8000, errorMessage = 'Operation timed out'): Promise<T> {
  let timer: any;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(errorMessage));
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

// Initialize default sample folders if local mode is used initially
const DEFAULT_SAMPLE_FOLDERS: FolderItem[] = [
  { id: 'f_grocery', name: 'Grocery Receipts', createdAt: Date.now() - 86400000 * 10 },
  { id: 'f_fuel', name: 'Fuel & Gas', createdAt: Date.now() - 86400000 * 5 },
  { id: 'f_medical', name: 'Medical & Pharmacy', createdAt: Date.now() - 86400000 * 2 },
  { id: 'f_office', name: 'Office Supplies', createdAt: Date.now() },
];

/**
 * Retrieve stored Firebase config from localStorage
 */
export function getStoredConfig(): FirebaseConfig | null {
  try {
    const json = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (!json) return null;
    const cfg = JSON.parse(json);
    if (cfg && (cfg.databaseURL || cfg.projectId || cfg.apiKey)) {
      return cfg;
    }
    return null;
  } catch (err) {
    console.error('Error reading firebase config from localStorage:', err);
    return null;
  }
}

/**
 * Parses Firebase configuration from raw pasted text (JSON or JavaScript object format)
 */
export function parseFirebaseConfigInput(input: string): FirebaseConfig | null {
  if (!input || !input.trim()) return null;

  const text = input.trim();

  // Try standard JSON.parse first
  try {
    const obj = JSON.parse(text);
    if (obj && typeof obj === 'object') {
      const config: FirebaseConfig = {
        apiKey: String(obj.apiKey || obj.api_key || '').trim(),
        authDomain: String(obj.authDomain || obj.auth_domain || '').trim(),
        databaseURL: String(obj.databaseURL || obj.databaseUrl || obj.database_url || '').trim(),
        projectId: String(obj.projectId || obj.project_id || '').trim(),
        storageBucket: String(obj.storageBucket || obj.storage_bucket || '').trim(),
        messagingSenderId: String(obj.messagingSenderId || obj.messaging_sender_id || '').trim(),
        appId: String(obj.appId || obj.app_id || '').trim(),
      };
      if (config.apiKey || config.databaseURL || config.projectId) {
        return config;
      }
    }
  } catch {
    // Continue to JS object syntax regex parser
  }

  // Regex extraction for JS object syntax
  const extractVal = (keyNames: string[]): string => {
    for (const key of keyNames) {
      const regex = new RegExp(
        `['"]?${key}['"]?\\s*:\\s*(?:["'\`])([^"'\`\\n]+)(?:["'\`])|['"]?${key}['"]?\\s*:\\s*([^\\s,}\n]+)`,
        'i'
      );
      const match = text.match(regex);
      if (match) {
        const val = (match[1] || match[2] || '').trim();
        if (val) return val;
      }
    }
    return '';
  };

  const config: FirebaseConfig = {
    apiKey: extractVal(['apiKey', 'api_key']),
    authDomain: extractVal(['authDomain', 'auth_domain']),
    databaseURL: extractVal(['databaseURL', 'databaseUrl', 'database_url']),
    projectId: extractVal(['projectId', 'project_id']),
    storageBucket: extractVal(['storageBucket', 'storage_bucket']),
    messagingSenderId: extractVal(['messagingSenderId', 'messaging_sender_id']),
    appId: extractVal(['appId', 'app_id']),
  };

  if (config.apiKey || config.databaseURL || config.projectId) {
    return config;
  }

  return null;
}

/**
 * Generate shareable Magic Link containing encoded config parameter
 */
export function generateMagicLink(config?: FirebaseConfig): string {
  const cfg = config || getStoredConfig();
  if (!cfg) return '';
  const jsonStr = JSON.stringify(cfg);
  const encodedStr = btoa(jsonStr);
  const baseUrl = window.location.protocol + '//' + window.location.host + window.location.pathname;
  return `${baseUrl}?config=${encodeURIComponent(encodedStr)}`;
}

/**
 * Checks URL for `?config=` parameter, decodes and saves it to localStorage if present,
 * and clears the URL parameter from the browser history for security.
 */
export function checkAndLoadMagicLinkConfig(): { config: FirebaseConfig | null; loadedFromUrl: boolean } {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const encodedConfig = urlParams.get('config');

    if (encodedConfig) {
      let jsonStr = '';
      try {
        jsonStr = atob(decodeURIComponent(encodedConfig));
      } catch {
        try {
          jsonStr = atob(encodedConfig);
        } catch {
          jsonStr = decodeURIComponent(encodedConfig);
        }
      }

      const parsedConfig = parseFirebaseConfigInput(jsonStr);
      if (parsedConfig && (parsedConfig.apiKey || parsedConfig.databaseURL || parsedConfig.projectId)) {
        saveStoredConfig(parsedConfig);

        // Security step: Remove ?config= parameter from URL bar immediately
        const cleanUrl = window.location.protocol + '//' + window.location.host + window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);

        return { config: parsedConfig, loadedFromUrl: true };
      }
    }
  } catch (err) {
    console.error('Failed to parse magic link config from URL:', err);
  }
  return { config: null, loadedFromUrl: false };
}

/**
 * Save Firebase configuration to localStorage and initialize Firebase
 */
export function saveStoredConfig(config: FirebaseConfig): boolean {
  try {
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
    return initFirebase(config);
  } catch (err) {
    console.error('Failed to save config:', err);
    return false;
  }
}

/**
 * Clear stored Firebase config
 */
export function clearStoredConfig(): void {
  localStorage.removeItem(CONFIG_STORAGE_KEY);
  try {
    const apps = getApps();
    apps.forEach((app) => {
      try {
        deleteApp(app);
      } catch {
        // ignore
      }
    });
  } catch {
    // ignore
  }
  appInstance = null;
  dbInstance = null;
  storageInstance = null;
}

/**
 * Initialize Firebase dynamically with given credentials
 */
export function initFirebase(config?: FirebaseConfig | null): boolean {
  const cfg = config || getStoredConfig();
  if (!cfg || !cfg.apiKey || !cfg.databaseURL) {
    appInstance = null;
    dbInstance = null;
    storageInstance = null;
    return false;
  }

  try {
    // Delete existing app if present
    const existingApps = getApps();
    if (existingApps.length > 0) {
      existingApps.forEach((existingApp) => {
        try {
          deleteApp(existingApp);
        } catch {
          // ignore
        }
      });
    }

    appInstance = initializeApp(cfg);
    dbInstance = getDatabase(appInstance);
    
    // Ensure storageBucket format is clean
    let bucket = cfg.storageBucket || '';
    if (bucket && !bucket.includes('://')) {
      bucket = bucket.replace(/^gs:\/\//, '');
    }
    
    storageInstance = getStorage(appInstance, bucket ? `gs://${bucket}` : undefined);
    console.log('Firebase initialized successfully with dynamic credentials!');
    return true;
  } catch (err) {
    console.error('Failed to initialize Firebase with dynamic credentials:', err);
    appInstance = null;
    dbInstance = null;
    storageInstance = null;
    return false;
  }
}

export function isFirebaseConfigured(): boolean {
  return dbInstance !== null && storageInstance !== null;
}

// Ensure init is run on load if config exists
initFirebase();

/* ==========================================
 * FOLDER OPERATIONS
 * ========================================== */

/**
 * Subscribe to folders from Realtime Database `folders/`
 * Fallbacks to localStorage if Firebase is not yet configured.
 */
export function subscribeFolders(onUpdate: (folders: FolderItem[]) => void): () => void {
  if (dbInstance) {
    const foldersRef = dbRef(dbInstance, 'folders');
    const unsubscribe = onValue(foldersRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        onUpdate([]);
        return;
      }
      const list: FolderItem[] = [];
      Object.keys(data).forEach((key) => {
        list.push({
          id: key,
          name: data[key].name || key,
          createdAt: data[key].createdAt || Date.now(),
        });
      });
      // Sort alphabetically
      list.sort((a, b) => a.name.localeCompare(b.name));
      onUpdate(list);
    }, (error) => {
      console.error('Error fetching folders from Firebase:', error);
      // Fallback
      onUpdate(getLocalFolders());
    });

    return () => unsubscribe();
  } else {
    // Local state subscription
    const local = getLocalFolders();
    onUpdate(local);

    // Watch storage changes
    const handler = () => onUpdate(getLocalFolders());
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }
}

function getLocalFolders(): FolderItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_FOLDERS_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_FOLDERS_KEY, JSON.stringify(DEFAULT_SAMPLE_FOLDERS));
      return DEFAULT_SAMPLE_FOLDERS;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_SAMPLE_FOLDERS;
  }
}

/**
 * Create a new Folder under `folders/` in Realtime Database
 */
export async function createFolder(folderName: string): Promise<FolderItem> {
  const cleanName = folderName.trim();
  if (!cleanName) throw new Error('Folder name cannot be empty');

  if (dbInstance) {
    const foldersRef = dbRef(dbInstance, 'folders');
    const newFolderRef = push(foldersRef);
    const newId = newFolderRef.key || `f_${Date.now()}`;
    const folderData: FolderItem = {
      id: newId,
      name: cleanName,
      createdAt: Date.now(),
    };
    await withTimeout(set(newFolderRef, folderData), 6000, 'Firebase create folder timed out');
    return folderData;
  } else {
    // Local Storage mode
    const current = getLocalFolders();
    const exists = current.some((f) => f.name.toLowerCase() === cleanName.toLowerCase());
    if (exists) {
      throw new Error(`Folder "${cleanName}" already exists.`);
    }
    const newFolder: FolderItem = {
      id: `f_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: cleanName,
      createdAt: Date.now(),
    };
    const updated = [...current, newFolder];
    localStorage.setItem(LOCAL_FOLDERS_KEY, JSON.stringify(updated));
    // Trigger custom event for UI updates in local mode
    window.dispatchEvent(new Event('local_folders_updated'));
    return newFolder;
  }
}

/* ==========================================
 * IMAGE UPLOAD & METADATA OPERATIONS
 * ========================================== */

/**
 * Upload compressed image blob to Firebase Storage & save metadata in Realtime Database.
 * If Firebase is not configured or device is offline, saves to IndexedDB offline queue.
 */
export async function uploadReceiptImage(params: {
  folderName: string;
  blob: Blob;
  dataUrl: string; // for local fallback preview if offline
  originalSizeKb: number;
  compressedSizeKb: number;
  fileName?: string;
}): Promise<ImageRecord> {
  const { folderName, blob, dataUrl, originalSizeKb, compressedSizeKb, fileName } = params;
  const timestamp = Date.now();
  const safeFolderName = folderName.replace(/[^a-zA-Z0-9_\-\s]/g, '_').trim();
  const sanitizedFileName = (fileName || `receipt_${timestamp}.jpg`).replace(/[^a-zA-Z0-9._\-]/g, '_');

  const dateObj = new Date(timestamp);
  const monthYear = dateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // 1. Instant local write to IndexedDB queue (<10ms transaction time)
  let offlineId: number | undefined = undefined;
  try {
    offlineId = await saveImageToOfflineQueue({
      folderName: safeFolderName,
      blob,
      dataUrl,
      originalSizeKb,
      compressedSizeKb,
      fileName: sanitizedFileName,
      timestamp,
    });
  } catch (idbErr) {
    console.warn('IndexedDB write warning (continuing with memory record):', idbErr);
  }

  const optimisticRecord: ImageRecord = {
    id: `offline_${offlineId || timestamp}`,
    folderName: safeFolderName,
    downloadUrl: dataUrl,
    storagePath: '',
    uploadDate: timestamp,
    formattedDate: dateObj.toLocaleString(),
    monthYear,
    originalSizeKb,
    compressedSizeKb,
    fileName: sanitizedFileName,
    isPendingSync: true,
    offlineId,
  };

  // 2. Dispatch event so UI components immediately render the optimistic photo
  window.dispatchEvent(new Event('offline_images_synced'));

  // 3. Asynchronously trigger background upload to Firebase (non-blocking)
  if (dbInstance && navigator.onLine) {
    setTimeout(() => {
      autoSyncOfflineImages().catch((err) => {
        console.warn('Background auto-sync notification:', err);
      });
    }, 100);
  }

  return optimisticRecord;
}

/**
 * AUTO-SYNC FUNCTION:
 * Automatically checks IndexedDB for pending images.
 * As soon as Firebase is linked and device is online, uploads all pending images
 * to Firebase Storage & Realtime Database, and deletes them from IndexedDB.
 */
export async function autoSyncOfflineImages(
  showToast?: (message: string, type: 'info' | 'success' | 'error') => void
): Promise<number> {
  if (!dbInstance || !navigator.onLine) {
    return 0;
  }

  let queue: OfflineQueueItem[] = [];
  try {
    queue = await getOfflineQueueImages();
  } catch (err) {
    console.error('Error reading offline image queue:', err);
    return 0;
  }

  if (!queue || queue.length === 0) return 0;

  if (showToast) {
    showToast('Syncing offline photos...', 'info');
  }

  let syncedCount = 0;
  for (const item of queue) {
    try {
      const safeFolderName = item.folderName.replace(/[^a-zA-Z0-9_\-\s]/g, '_').trim();
      const sanitizedFileName = (item.fileName || `receipt_${item.timestamp}.jpg`).replace(/[^a-zA-Z0-9._\-]/g, '_');
      
      const dateObj = new Date(item.timestamp);
      const monthYear = dateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      const safeMonthYear = monthYear.replace(/[^a-zA-Z0-9_\-\s]/g, '_').trim();
      const path = `uploads/${safeFolderName}/${safeMonthYear}/${item.timestamp}_${sanitizedFileName}`;

      let downloadUrl = '';
      let storagePath = '';

      // Try uploading to Firebase Storage if storageInstance is available
      if (storageInstance) {
        try {
          const fileRef = storageRef(storageInstance, path);
          const uploadResult = await withTimeout(
            uploadBytes(fileRef, item.blob, {
              contentType: 'image/jpeg',
              customMetadata: {
                folderName: item.folderName,
                monthYear,
                uploadDate: new Date(item.timestamp).toISOString(),
              },
            }),
            15000,
            'Sync upload timed out'
          );

          downloadUrl = await withTimeout(
            getDownloadURL(uploadResult.ref),
            7000,
            'Sync download URL timed out'
          );
          storagePath = path;
        } catch (storageErr) {
          console.warn(`Storage upload for item ${item.id} timed out or failed. Falling back to dataUrl in Realtime DB:`, storageErr);
          downloadUrl = item.dataUrl;
          storagePath = '';
        }
      } else {
        downloadUrl = item.dataUrl;
      }

      // Save metadata & image record to Realtime Database
      const imagesRef = dbRef(dbInstance, 'images');
      const newImageRef = push(imagesRef);
      const imageId = newImageRef.key || `img_${item.timestamp}`;

      const record: ImageRecord = {
        id: imageId,
        folderName: item.folderName,
        downloadUrl,
        storagePath,
        uploadDate: item.timestamp,
        formattedDate: dateObj.toLocaleString(),
        monthYear,
        originalSizeKb: item.originalSizeKb,
        compressedSizeKb: item.compressedSizeKb,
        fileName: sanitizedFileName,
      };

      await withTimeout(set(newImageRef, record), 8000, 'Sync DB save timed out');

      if (item.id !== undefined) {
        await removeImageFromOfflineQueue(item.id);
      }

      syncedCount++;
      // Notify UI after each item syncs so badges turn to green checkmarks in real time
      window.dispatchEvent(new Event('offline_images_synced'));
    } catch (err) {
      console.error(`Failed auto-syncing item ID ${item.id}:`, err);
    }
  }

  if (syncedCount > 0) {
    if (showToast) {
      showToast('All photos synced successfully!', 'success');
    }
    // Dispatch custom event so UI components automatically refresh and remove pending badges
    window.dispatchEvent(new Event('offline_images_synced'));
  }

  return syncedCount;
}

export async function getPendingOfflineCount(): Promise<number> {
  try {
    return await getOfflineQueueCount();
  } catch {
    return 0;
  }
}

/* ==========================================
 * SEARCH & FETCH OPERATIONS
 * ========================================== */

/**
 * Fetch all image records from Realtime Database `images/`
 */
export async function getAllImages(): Promise<ImageRecord[]> {
  if (dbInstance) {
    try {
      const imagesRef = dbRef(dbInstance, 'images');
      const snapshot = await withTimeout(get(imagesRef), 7000, 'Firebase read images timed out');
      const val = snapshot.val();
      if (!val) return [];

      const list: ImageRecord[] = [];
      Object.keys(val).forEach((key) => {
        const item = val[key];
        list.push({
          id: key,
          folderName: item.folderName || 'Uncategorized',
          downloadUrl: item.downloadUrl || '',
          storagePath: item.storagePath || '',
          uploadDate: Number(item.uploadDate) || Date.now(),
          formattedDate: item.formattedDate || new Date(Number(item.uploadDate) || Date.now()).toLocaleString(),
          originalSizeKb: item.originalSizeKb || 0,
          compressedSizeKb: item.compressedSizeKb || 0,
          fileName: item.fileName || 'receipt.jpg',
        });
      });

      // Sort descending by uploadDate (newest first)
      list.sort((a, b) => b.uploadDate - a.uploadDate);
      return list;
    } catch (err) {
      console.warn('getAllImages failed or timed out, returning local storage fallback:', err);
      return getLocalImages().sort((a, b) => b.uploadDate - a.uploadDate);
    }
  } else {
    return getLocalImages().sort((a, b) => b.uploadDate - a.uploadDate);
  }
}

/**
 * Filter images based on From Date, To Date, and Folder Name
 */
export async function searchImages(params: {
  fromDate?: string; // YYYY-MM-DD
  toDate?: string;   // YYYY-MM-DD
  folderName?: string;
}): Promise<ImageRecord[]> {
  const all = await getAllImages();
  const { fromDate, toDate, folderName } = params;

  let fromMs = 0;
  if (fromDate) {
    const d = new Date(fromDate);
    d.setHours(0, 0, 0, 0);
    fromMs = d.getTime();
  }

  let toMs = Infinity;
  if (toDate) {
    const d = new Date(toDate);
    d.setHours(23, 59, 59, 999);
    toMs = d.getTime();
  }

  return all.filter((item) => {
    // Check Folder match
    if (folderName && folderName !== 'ALL' && folderName !== '') {
      if (item.folderName !== folderName) return false;
    }

    // Check Date Range match
    if (item.uploadDate < fromMs || item.uploadDate > toMs) {
      return false;
    }

    return true;
  });
}

/* ==========================================
 * DELETE OPERATIONS (SINGLE & BULK)
 * ========================================== */

/**
 * Delete a single image from BOTH Firebase Storage & Realtime Database
 */
export async function deleteSingleImage(record: ImageRecord): Promise<void> {
  // 1. Delete from Firebase Storage if configured
  if (storageInstance && record.storagePath) {
    try {
      const fileRef = storageRef(storageInstance, record.storagePath);
      await withTimeout(deleteObject(fileRef), 6000, 'Storage delete object timed out');
    } catch (err: any) {
      // If object doesn't exist or already removed, log warning but continue DB cleanup
      console.warn(`Storage delete notice for ${record.storagePath}:`, err.message || err);
    }
  }

  // 2. Delete from Realtime Database
  if (dbInstance && record.id) {
    const imgRef = dbRef(dbInstance, `images/${record.id}`);
    await withTimeout(remove(imgRef), 6000, 'DB delete image timed out');
  } else {
    // Local fallback
    const current = getLocalImages();
    const filtered = current.filter((img) => img.id !== record.id);
    saveLocalImages(filtered);
  }
}

/**
 * Delete multiple images in bulk from BOTH Firebase Storage and Realtime Database
 */
export async function deleteBulkImages(records: ImageRecord[]): Promise<{ count: number; freedKb: number }> {
  let count = 0;
  let freedKb = 0;

  for (const record of records) {
    try {
      await deleteSingleImage(record);
      count++;
      freedKb += record.compressedSizeKb || 0;
    } catch (err) {
      console.error(`Error deleting image ID ${record.id}:`, err);
    }
  }

  return { count, freedKb };
}

/**
 * INSTANT QUICK BULK DELETE:
 * Deletes all images in `folderName` (or all folders) older than specified timeframe (3 months, 6 months, 1 year)
 * instantly from BOTH Firebase Storage and Realtime Database without needing to preview/search them first.
 */
export async function quickBulkDeleteByAge(
  folderName: string,
  timeframe: '3months' | '6months' | '1year'
): Promise<{ count: number; freedKb: number }> {
  const now = Date.now();
  let days = 90; // default 3 months ~ 90 days

  if (timeframe === '6months') days = 180;
  if (timeframe === '1year') days = 365;

  const thresholdTimestamp = now - days * 24 * 60 * 60 * 1000;

  // 1. Fetch all images
  const all = await getAllImages();

  // 2. Filter images matching folder & older than thresholdTimestamp
  const matches = all.filter((item) => {
    const matchesFolder = !folderName || folderName === 'ALL' || item.folderName === folderName;
    const isOlder = item.uploadDate < thresholdTimestamp;
    return matchesFolder && isOlder;
  });

  if (matches.length === 0) {
    return { count: 0, freedKb: 0 };
  }

  // 3. Perform bulk deletion from Storage and Database
  return await deleteBulkImages(matches);
}

/* ==========================================
 * LOCAL FALLBACK HELPERS
 * ========================================== */

function getLocalImages(): ImageRecord[] {
  try {
    const raw = localStorage.getItem(LOCAL_IMAGES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalImages(records: ImageRecord[]): void {
  try {
    localStorage.setItem(LOCAL_IMAGES_KEY, JSON.stringify(records));
    window.dispatchEvent(new Event('local_images_updated'));
  } catch (err) {
    console.error('Failed to save local images:', err);
  }
}

/**
 * Recursively list all files and subfolders in a Firebase Storage directory
 * and sum up their file sizes via getMetadata().
 */
async function calculateRefSize(directoryRef: StorageReference, depth = 0): Promise<{ totalBytes: number; fileCount: number }> {
  if (depth > 5) return { totalBytes: 0, fileCount: 0 };

  let totalBytes = 0;
  let fileCount = 0;

  const res = await withTimeout(listAll(directoryRef), 4000, 'Storage listing timed out');

  // Fetch metadata for files in current folder in parallel
  if (res.items.length > 0) {
    const metadataPromises = res.items.map((itemRef) =>
      withTimeout(getMetadata(itemRef), 3000, 'Metadata fetch timed out').catch((err) => {
        console.warn('Failed to fetch metadata for item:', itemRef.fullPath, err);
        return null;
      })
    );
    const metadatas = await Promise.all(metadataPromises);
    for (const meta of metadatas) {
      if (meta && typeof meta.size === 'number') {
        totalBytes += meta.size;
        fileCount += 1;
      }
    }
  }

  // Recursively process all subfolders (prefixes)
  if (res.prefixes.length > 0) {
    const subfolderPromises = res.prefixes.map((prefixRef) => calculateRefSize(prefixRef, depth + 1));
    const subfolderResults = await Promise.all(subfolderPromises);
    for (const sub of subfolderResults) {
      totalBytes += sub.totalBytes;
      fileCount += sub.fileCount;
    }
  }

  return { totalBytes, fileCount };
}

/**
 * On-Demand Firebase Storage Usage Calculation
 * Attempts direct Firebase Storage scan via listAll() and getMetadata().
 * If Storage listing times out or fails (e.g., due to bucket list permissions),
 * gracefully falls back to aggregating Realtime Database image metadata.
 */
export async function calculateServerStorageUsage(): Promise<{
  totalBytes: number;
  formattedSize: string;
  fileCount: number;
  isLocalFallback: boolean;
  sourceLabel: string;
}> {
  // 1. Try direct Firebase Storage listAll + getMetadata scan
  if (storageInstance) {
    try {
      // Try scanning 'uploads' folder first (or root '/' as fallback)
      let targetRef = storageRef(storageInstance, 'uploads');
      let result: { totalBytes: number; fileCount: number };
      try {
        result = await calculateRefSize(targetRef);
      } catch {
        targetRef = storageRef(storageInstance, '/');
        result = await calculateRefSize(targetRef);
      }

      return {
        totalBytes: result.totalBytes,
        formattedSize: formatBytes(result.totalBytes),
        fileCount: result.fileCount,
        isLocalFallback: false,
        sourceLabel: 'Firebase Storage Bucket (Direct Scan)',
      };
    } catch (storageErr) {
      console.warn('Firebase Storage direct listAll scan timed out or failed. Falling back to database records:', storageErr);
    }
  }

  // 2. Fallback: Aggregate from Realtime Database image records if available
  if (dbInstance) {
    try {
      const serverImages = await getAllImages();
      let totalBytes = 0;
      let count = 0;
      serverImages.forEach((img) => {
        const sizeKb = img.compressedSizeKb || img.originalSizeKb || 0;
        totalBytes += Math.round(sizeKb * 1024);
        count++;
      });

      return {
        totalBytes,
        formattedSize: formatBytes(totalBytes),
        fileCount: count,
        isLocalFallback: false,
        sourceLabel: 'Firebase Database Metadata Index',
      };
    } catch (dbErr) {
      console.warn('Database image records fallback failed:', dbErr);
    }
  }

  // 3. Fallback: Local Storage cache
  const localImages = getLocalImages();
  let totalBytes = 0;
  localImages.forEach((img) => {
    totalBytes += Math.round((img.compressedSizeKb || 0) * 1024);
  });

  return {
    totalBytes,
    formattedSize: formatBytes(totalBytes),
    fileCount: localImages.length,
    isLocalFallback: true,
    sourceLabel: 'Local Storage Cache',
  };
}

