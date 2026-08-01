export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  databaseURL: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId?: string;
  appId?: string;
}

export interface FolderItem {
  id: string;
  name: string;
  createdAt: number;
}

export interface ImageRecord {
  id: string;
  folderName: string;
  downloadUrl: string;
  storagePath: string;
  uploadDate: number; // timestamp ms
  formattedDate?: string;
  monthYear?: string;
  originalSizeKb?: number;
  compressedSizeKb?: number;
  fileName?: string;
  isPendingSync?: boolean;
  offlineId?: number;
}

export interface CompressionResult {
  blob: Blob;
  dataUrl: string;
  originalSize: number;
  compressedSize: number;
  width: number;
  height: number;
  ratio: number;
}

export type ActiveTab = 'home' | 'folders' | 'search' | 'cleanup' | 'settings';
