import React, { useState } from 'react';
import { FolderPlus, Folder, Calendar, Check, AlertCircle, Bookmark } from 'lucide-react';
import { FolderItem } from '../types';
import { createFolder } from '../services/firebaseService';
import { applyFolderFavicon } from '../utils/iconGenerator';

interface FoldersPanelProps {
  folders: FolderItem[];
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onSelectFolderForSearch?: (folderName: string) => void;
}

export const FoldersPanel: React.FC<FoldersPanelProps> = ({
  folders,
  showToast,
  onSelectFolderForSearch,
}) => {
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleShortcutClick = (folderName: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    // 1 & 2 & 3. Generate 512x512 Canvas icon and replace favicons in <head>
    applyFolderFavicon(folderName);
    // 4. Delayed Toast only AFTER DOM update
    showToast("Icon ready! Use your browser's 'Add to Home Screen' option now.", 'success');
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newFolderName.trim();
    if (!trimmed) {
      showToast('Please enter a folder name', 'error');
      return;
    }

    setIsCreating(true);
    try {
      await createFolder(trimmed);
      showToast(`Folder "${trimmed}" created and saved to Firebase Realtime Database!`, 'success');
      setNewFolderName('');
    } catch (err: any) {
      console.error('Folder creation error:', err);
      showToast(err.message || 'Failed to create folder', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Create New Folder Card */}
      <div className="bg-[#1A1C1E] border border-white/5 rounded-[24px] p-6 shadow-md space-y-4">
        <div className="flex items-center space-x-2.5 text-[#D0E4FF] font-semibold text-base">
          <FolderPlus className="w-5 h-5" />
          <h2>Create New Receipt Folder</h2>
        </div>
        <p className="text-xs text-gray-400">
          Folders organize receipt photos under <code className="text-[#D0E4FF] font-mono bg-[#0E1116] px-1.5 py-0.5 rounded border border-white/5">folders/</code> in Firebase Realtime Database.
        </p>

        <form onSubmit={handleCreateFolder} className="flex flex-col sm:flex-row gap-3 pt-1">
          <div className="relative flex-1">
            <input
              id="new-folder-name-input"
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="e.g. Travel Receipts, Office Supplies, Tax Year 2024..."
              className="w-full bg-[#0E1116] border border-white/5 rounded-xl px-4 py-2.5 text-xs text-[#E2E2E6] placeholder-gray-500 focus:outline-none focus:border-[#D0E4FF]/40 transition"
            />
          </div>
          <button
            id="create-folder-btn"
            type="submit"
            disabled={isCreating}
            className="px-5 py-2.5 bg-[#D0E4FF] hover:bg-white text-[#00315B] font-bold text-xs rounded-xl shadow transition flex items-center justify-center space-x-1.5 disabled:opacity-50"
          >
            {isCreating ? (
              <>
                <div className="w-4 h-4 border-2 border-[#00315B] border-t-transparent rounded-full animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <FolderPlus className="w-4 h-4" />
                <span>Create Folder</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Existing Folders List */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 flex items-center justify-between">
          <span>Active Folders</span>
          <span className="text-xs text-[#D0E4FF] bg-[#D0E4FF]/10 px-2.5 py-0.5 rounded-full border border-[#D0E4FF]/20 font-mono">
            {folders.length} Total
          </span>
        </h3>

        {folders.length === 0 ? (
          <div className="text-center py-10 px-4 bg-[#1A1C1E] rounded-[24px] border border-white/5">
            <Folder className="w-10 h-10 text-gray-600 mx-auto mb-2" />
            <p className="text-xs text-gray-400">No folders created yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {folders.map((folder) => (
              <div
                key={folder.id}
                className="bg-[#1A1C1E] border border-white/5 rounded-2xl p-4 flex items-center justify-between hover:border-white/10 transition"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-[#2D2F31] text-[#D0E4FF] flex items-center justify-center flex-shrink-0">
                    <Folder className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-medium text-[#E2E2E6] truncate">
                      {folder.name}
                    </h4>
                    <span className="text-[10px] text-gray-500 flex items-center space-x-1 mt-0.5 font-mono">
                      <Calendar className="w-3 h-3" />
                      <span>{new Date(folder.createdAt).toLocaleDateString()}</span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2 flex-shrink-0">
                  <button
                    type="button"
                    id={`folders-panel-shortcut-btn-${folder.id}`}
                    onClick={(e) => handleShortcutClick(folder.name, e)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-[#D0E4FF] bg-[#0E1116] border border-white/5 hover:border-white/20 transition touch-manipulation"
                    title="Prepare custom shortcut icon for Add to Home Screen"
                  >
                    <Bookmark className="w-4 h-4" />
                  </button>

                  {onSelectFolderForSearch && (
                    <button
                      onClick={() => onSelectFolderForSearch(folder.name)}
                      className="text-xs font-bold text-[#D0E4FF] hover:text-white bg-[#0E1116] px-3 py-1.5 rounded-lg border border-white/5 transition"
                    >
                      View Receipts
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
