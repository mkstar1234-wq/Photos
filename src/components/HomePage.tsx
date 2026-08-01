import React, { useRef, useState } from 'react';
import { Camera, Image, FolderOpen, Plus, Zap, LayoutGrid, List, Bookmark } from 'lucide-react';
import { FolderItem, ImageRecord } from '../types';
import { compressReceiptImage } from '../utils/imageCompressor';
import { uploadReceiptImage } from '../services/firebaseService';
import { applyFolderFavicon } from '../utils/iconGenerator';

interface HomePageProps {
  folders: FolderItem[];
  onFolderCreateClick: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onUploadSuccess: (record: ImageRecord) => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  folders,
  onFolderCreateClick,
  showToast,
  onUploadSuccess,
}) => {
  const [selectedFolder, setSelectedFolder] = useState<FolderItem | null>(null);
  const selectedFolderRef = useRef<FolderItem | null>(null);

  const [layoutMode, setLayoutMode] = useState<'grid' | 'list'>(() => {
    return (localStorage.getItem('home_layout_preference') as 'grid' | 'list') || 'grid';
  });

  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);

  const handleLayoutChange = (mode: 'grid' | 'list') => {
    setLayoutMode(mode);
    localStorage.setItem('home_layout_preference', mode);
  };

  // Trigger camera capture input
  const handleCameraClick = (folder: FolderItem, e?: React.MouseEvent) => {
    e?.stopPropagation();
    selectedFolderRef.current = folder;
    setSelectedFolder(folder);
    if (cameraInputRef.current) {
      cameraInputRef.current.value = '';
      cameraInputRef.current.click();
    }
  };

  // Generate 512x512 Canvas icon, update favicon in <head>, and show delayed notification
  const handleShortcutClick = (folderName: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    // 1 & 2 & 3. Generate 512x512 Canvas icon and instantly replace favicons in <head>
    applyFolderFavicon(folderName);
    // 4. Show delayed toast notification ONLY after DOM update
    showToast("Icon ready! Use your browser's 'Add to Home Screen' option now.", "success");
  };

  // Trigger gallery file picker input
  const handleGalleryClick = (folder: FolderItem, e?: React.MouseEvent) => {
    e?.stopPropagation();
    selectedFolderRef.current = folder;
    setSelectedFolder(folder);
    if (galleryInputRef.current) {
      galleryInputRef.current.value = '';
      galleryInputRef.current.click();
    }
  };

  // Handle image capture or selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const targetFolder = selectedFolder || selectedFolderRef.current || (folders.length > 0 ? folders[0] : null);
    if (!file || !targetFolder) return;

    // Read global quality preference from localStorage (default to 'ultralow')
    const rawPref = localStorage.getItem('app_upload_quality');
    const qualityPref = (rawPref === 'verylow' || rawPref === 'low' || rawPref === 'ultralow') ? rawPref : 'ultralow';

    let quality = 0.20;
    let maxWidth = 360;
    let maxHeight = 360;

    if (qualityPref === 'verylow') {
      quality = 0.25;
      maxWidth = 480;
      maxHeight = 480;
    } else if (qualityPref === 'low') {
      quality = 0.35;
      maxWidth = 640;
      maxHeight = 480;
    }

    try {
      showToast(`Processing photo for "${targetFolder.name}"...`, 'info');

      // Fast canvas compression based on global setting
      const result = await compressReceiptImage(file, quality, maxWidth, maxHeight);
      const originalKb = Math.round(result.originalSize / 1024);
      const compressedKb = Math.round(result.compressedSize / 1024);

      // Instant local queue write + background Firebase upload
      const record = await uploadReceiptImage({
        folderName: targetFolder.name,
        blob: result.blob,
        dataUrl: result.dataUrl,
        originalSizeKb: originalKb,
        compressedSizeKb: compressedKb,
        fileName: file.name,
      });

      showToast(`Photo saved to "${targetFolder.name}" (${compressedKb} KB)! Syncing in background.`, 'success');
      onUploadSuccess(record);
    } catch (err: any) {
      console.error('Capture processing error:', err);
      const errMsg = err?.message || (typeof err === 'string' ? err : 'Image processing failed');
      showToast('Photo capture error: ' + errMsg, 'error');
    } finally {
      setSelectedFolder(null);
      selectedFolderRef.current = null;
      if (cameraInputRef.current) cameraInputRef.current.value = '';
      if (galleryInputRef.current) galleryInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Hidden file input strictly for Camera Capture */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
        id="camera-file-input"
      />

      {/* Hidden file input strictly for Gallery Selection */}
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
        id="gallery-file-input"
      />

      {/* Intro Status Banner: Direct Capture & Upload */}
      <div className="bg-[#D0E4FF]/5 border border-[#D0E4FF]/10 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
        <div className="p-2.5 bg-[#D0E4FF]/10 rounded-xl text-[#D0E4FF]">
          <Zap className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-xs font-semibold text-[#D0E4FF] tracking-tight">
            Instant Zero-Lag Capture
          </h2>
          <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">
            Snap via Camera or choose from Gallery. Images save instantly and sync to Firebase in the background.
          </p>
        </div>
      </div>

      {/* Grid of Folders with Camera & Gallery buttons */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <span>Active Folders</span>
              <span className="text-xs text-[#D0E4FF] px-2.5 py-0.5 bg-[#D0E4FF]/10 rounded-full border border-[#D0E4FF]/20 font-normal">
                {folders.length} Folders
              </span>
            </h2>
          </div>

          <div className="flex items-center space-x-2">
            {/* Grid vs List View Layout Toggle */}
            <div className="bg-[#1A1C1E] border border-white/5 rounded-xl p-1 flex items-center space-x-1">
              <button
                onClick={() => handleLayoutChange('grid')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center space-x-1 transition ${
                  layoutMode === 'grid'
                    ? 'bg-[#D0E4FF] text-[#00315B] shadow'
                    : 'text-gray-400 hover:text-white'
                }`}
                title="Grid View (Block Type)"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Grid</span>
              </button>

              <button
                onClick={() => handleLayoutChange('list')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center space-x-1 transition ${
                  layoutMode === 'list'
                    ? 'bg-[#D0E4FF] text-[#00315B] shadow'
                    : 'text-gray-400 hover:text-white'
                }`}
                title="List View (Line Type)"
              >
                <List className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">List</span>
              </button>
            </div>

            <button
              onClick={onFolderCreateClick}
              className="text-xs font-semibold text-[#D0E4FF] hover:text-white flex items-center space-x-1 bg-[#D0E4FF]/10 px-3 py-1.5 rounded-xl border border-[#D0E4FF]/20 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Folder</span>
            </button>
          </div>
        </div>

        {folders.length === 0 ? (
          <div className="text-center py-12 px-4 bg-[#1A1C1E] rounded-[24px] border border-white/5 space-y-3">
            <Camera className="w-12 h-12 text-gray-600 mx-auto" />
            <h3 className="text-sm font-medium text-[#E2E2E6]">No Folders Created Yet</h3>
            <p className="text-xs text-gray-400 max-w-xs mx-auto">
              Create your first folder to organize receipt photos in Firebase Storage.
            </p>
            <button
              onClick={onFolderCreateClick}
              className="mt-2 px-5 py-2.5 bg-[#D0E4FF] text-[#00315B] font-bold text-xs rounded-xl shadow hover:bg-white transition"
            >
              + Create First Folder
            </button>
          </div>
        ) : layoutMode === 'grid' ? (
          /* Grid View (Block Type Layout) */
          <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {folders.map((folder) => (
              <div
                key={folder.id}
                className="group relative flex flex-col justify-between p-4 bg-[#1A1C1E] border border-white/5 hover:border-[#D0E4FF]/40 rounded-[24px] transition-all duration-200 hover:shadow-xl text-center min-h-[160px]"
              >
                {/* Shortcut/Link Button in Top Right */}
                <button
                  type="button"
                  id={`folder-shortcut-btn-${folder.id}`}
                  onClick={(e) => handleShortcutClick(folder.name, e)}
                  className="absolute top-3 right-3 p-1.5 rounded-xl bg-[#2D2F31] hover:bg-[#D0E4FF] text-gray-400 hover:text-[#00315B] transition shadow touch-manipulation z-10"
                  title="Prepare custom shortcut icon for Add to Home Screen"
                >
                  <Bookmark className="w-3.5 h-3.5" />
                </button>

                {/* Folder Header & Name */}
                <div className="w-full flex-1 flex flex-col items-center justify-center mb-3 pt-2">
                  <div className="w-10 h-10 bg-[#2D2F31] group-hover:bg-[#D0E4FF]/10 text-[#D0E4FF] rounded-xl flex items-center justify-center mb-2 transition-colors">
                    <FolderOpen className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-semibold text-[#E2E2E6] group-hover:text-[#D0E4FF] transition-colors line-clamp-2 px-1">
                    {folder.name}
                  </span>
                </div>

                {/* Dual Action Buttons: Gallery on LEFT, Camera on RIGHT side-by-side */}
                <div className="w-full grid grid-cols-2 gap-2 pt-2 border-t border-white/5">
                  <button
                    type="button"
                    id={`folder-gallery-btn-${folder.id}`}
                    onClick={(e) => handleGalleryClick(folder, e)}
                    className="flex items-center justify-center space-x-1.5 py-2 px-2 bg-[#2D2F31] hover:bg-[#D0E4FF] text-[#D0E4FF] hover:text-[#00315B] rounded-xl text-xs font-bold transition shadow touch-manipulation"
                    title="Choose photo from Gallery"
                  >
                    <Image className="w-4 h-4 flex-shrink-0" />
                    <span className="text-[11px]">Gallery</span>
                  </button>

                  <button
                    type="button"
                    id={`folder-camera-btn-${folder.id}`}
                    onClick={(e) => handleCameraClick(folder, e)}
                    className="flex items-center justify-center space-x-1.5 py-2 px-2 bg-[#2D2F31] hover:bg-[#D0E4FF] text-[#D0E4FF] hover:text-[#00315B] rounded-xl text-xs font-bold transition shadow touch-manipulation"
                    title="Snap photo directly with Camera"
                  >
                    <Camera className="w-4 h-4 flex-shrink-0" />
                    <span className="text-[11px]">Camera</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* List View (Line Type Layout) */
          <div className="flex flex-col space-y-3">
            {folders.map((folder) => (
              <div
                key={folder.id}
                id={`folder-item-list-${folder.id}`}
                className="group flex flex-col xs:flex-row xs:items-center justify-between p-4 bg-[#1A1C1E] border border-white/5 hover:border-[#D0E4FF]/40 rounded-2xl transition-all duration-200 gap-3"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="w-10 h-10 bg-[#2D2F31] text-[#D0E4FF] rounded-xl flex items-center justify-center flex-shrink-0">
                    <FolderOpen className="w-5 h-5" />
                  </div>
                  <div className="truncate">
                    <h3 className="text-sm font-semibold text-[#E2E2E6] truncate">
                      {folder.name}
                    </h3>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider">
                      Pick from gallery or snap photo
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 flex-shrink-0">
                  <button
                    type="button"
                    onClick={(e) => handleGalleryClick(folder, e)}
                    className="px-3.5 py-2 bg-[#D0E4FF]/10 hover:bg-[#D0E4FF] text-[#D0E4FF] hover:text-[#00315B] rounded-xl text-xs font-bold transition flex items-center space-x-1.5 touch-manipulation"
                    title="Choose photo from Gallery"
                  >
                    <Image className="w-4 h-4" />
                    <span>Gallery</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => handleCameraClick(folder, e)}
                    className="px-3.5 py-2 bg-[#D0E4FF]/10 hover:bg-[#D0E4FF] text-[#D0E4FF] hover:text-[#00315B] rounded-xl text-xs font-bold transition flex items-center space-x-1.5 touch-manipulation"
                    title="Snap photo directly with Camera"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Camera</span>
                  </button>

                  <button
                    type="button"
                    id={`folder-shortcut-list-btn-${folder.id}`}
                    onClick={(e) => handleShortcutClick(folder.name, e)}
                    className="p-2 bg-[#D0E4FF]/10 hover:bg-[#D0E4FF] text-[#D0E4FF] hover:text-[#00315B] rounded-xl text-xs font-bold transition flex items-center justify-center touch-manipulation"
                    title="Prepare custom shortcut icon for Add to Home Screen"
                  >
                    <Bookmark className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
