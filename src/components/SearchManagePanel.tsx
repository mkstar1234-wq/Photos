import React, { useState, useEffect } from 'react';
import {
  Search,
  Calendar,
  Filter,
  Trash2,
  CheckSquare,
  Square,
  Eye,
  HardDrive,
  RefreshCw,
  Clock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { FolderItem, ImageRecord } from '../types';
import { searchImages, deleteSingleImage, deleteBulkImages } from '../services/firebaseService';
import { getOfflineQueueImages, removeImageFromOfflineQueue } from '../services/indexedDBQueueService';
import { formatBytes } from '../utils/imageCompressor';

interface SearchManagePanelProps {
  folders: FolderItem[];
  initialFolder?: string;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onPreviewImage: (image: ImageRecord) => void;
}

const ITEMS_PER_PAGE = 12;

export const SearchManagePanel: React.FC<SearchManagePanelProps> = ({
  folders,
  initialFolder = '',
  showToast,
  onPreviewImage,
}) => {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedFolder, setSelectedFolder] = useState(initialFolder || 'ALL');

  const [images, setImages] = useState<ImageRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  // Perform Search query & fetch from BOTH Firebase and IndexedDB
  const handleSearch = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch online images from Firebase
      let onlineResults: ImageRecord[] = [];
      try {
        onlineResults = await searchImages({
          fromDate,
          toDate,
          folderName: selectedFolder,
        });
      } catch (fbErr) {
        console.warn('Firebase search failed or offline:', fbErr);
      }

      // 2. Fetch offline pending images from IndexedDB
      let offlineResults: ImageRecord[] = [];
      try {
        const rawOffline = await getOfflineQueueImages();

        // Filter offline items by selected folder
        let filtered = rawOffline;
        if (selectedFolder && selectedFolder !== 'ALL') {
          filtered = filtered.filter((item) => item.folderName === selectedFolder);
        }

        // Filter offline items by date range
        if (fromDate) {
          const fromTs = new Date(fromDate + 'T00:00:00').getTime();
          filtered = filtered.filter((item) => item.timestamp >= fromTs);
        }
        if (toDate) {
          const toTs = new Date(toDate + 'T23:59:59').getTime();
          filtered = filtered.filter((item) => item.timestamp <= toTs);
        }

        // Convert offline queue items to ImageRecord format with pending flag
        offlineResults = filtered.map((item) => ({
          id: `offline_${item.id ?? item.timestamp}`,
          folderName: item.folderName,
          downloadUrl: item.dataUrl,
          storagePath: '',
          uploadDate: item.timestamp,
          formattedDate: new Date(item.timestamp).toLocaleString(),
          originalSizeKb: item.originalSizeKb,
          compressedSizeKb: item.compressedSizeKb,
          fileName: item.fileName,
          isPendingSync: true,
          offlineId: item.id,
        }));
      } catch (idbErr) {
        console.warn('IndexedDB fetch failed:', idbErr);
      }

      // 3. Merge & sort (newest uploadDate first)
      const merged = [...offlineResults, ...onlineResults];
      merged.sort((a, b) => b.uploadDate - a.uploadDate);

      setImages(merged);
      setSelectedIds(new Set());
      setCurrentPage(1); // Reset to page 1 on new search
    } catch (err: any) {
      console.error('Search error:', err);
      showToast('Error searching receipt records: ' + (err.message || 'Error'), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    handleSearch();

    const handleSynced = () => {
      handleSearch();
    };

    window.addEventListener('offline_images_synced', handleSynced);
    return () => {
      window.removeEventListener('offline_images_synced', handleSynced);
    };
  }, [fromDate, toDate, selectedFolder]);

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(images.length / ITEMS_PER_PAGE));

  // Auto-adjust page if current page exceeds totalPages after deletions
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [images.length, totalPages, currentPage]);

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedImages = images.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Group images by Month and Year for dynamic subfolder headers
  const groupedImages = React.useMemo(() => {
    const groupsMap = new Map<string, ImageRecord[]>();
    paginatedImages.forEach((img) => {
      let my = img.monthYear;
      if (!my) {
        my = img.uploadDate
          ? new Date(img.uploadDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
          : 'Unknown Date';
      }
      if (!groupsMap.has(my)) {
        groupsMap.set(my, []);
      }
      groupsMap.get(my)!.push(img);
    });

    const result: { monthYear: string; items: ImageRecord[] }[] = [];
    groupsMap.forEach((items, monthYear) => {
      result.push({ monthYear, items });
    });
    return result;
  }, [paginatedImages]);

  // Handle individual checkbox toggle
  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  // Handle Select All
  const handleSelectAll = () => {
    if (selectedIds.size === images.length && images.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(images.map((img) => img.id)));
    }
  };

  // Handle Single Image Delete (indexedDB vs Firebase)
  const handleDeleteSingle = async (img: ImageRecord, e: React.MouseEvent) => {
    e.stopPropagation();

    const confirmMsg = img.isPendingSync
      ? `Delete pending offline receipt "${img.fileName || 'photo'}"?`
      : `Delete receipt photo from "${img.folderName}"? This permanently removes it from both Firebase Storage and Realtime Database.`;

    if (!window.confirm(confirmMsg)) {
      return;
    }

    try {
      if (img.isPendingSync && img.offlineId !== undefined) {
        await removeImageFromOfflineQueue(img.offlineId);
        showToast('Pending offline receipt deleted from local storage', 'info');
      } else {
        await deleteSingleImage(img);
        showToast('Receipt deleted permanently from Storage & Database', 'success');
      }

      setImages((prev) => prev.filter((i) => i.id !== img.id));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(img.id);
        return next;
      });
    } catch (err: any) {
      console.error('Delete error:', err);
      showToast('Failed to delete image: ' + (err.message || 'Error'), 'error');
    }
  };

  // Handle Bulk Delete (IndexedDB + Firebase)
  const handleBulkDelete = async () => {
    const toDelete = images.filter((img) => selectedIds.has(img.id));
    if (toDelete.length === 0) return;

    if (!window.confirm(`Are you sure you want to BULK DELETE ${toDelete.length} receipt photos?`)) {
      return;
    }

    setIsDeleting(true);
    try {
      const offlineToDelete = toDelete.filter((img) => img.isPendingSync && img.offlineId !== undefined);
      const onlineToDelete = toDelete.filter((img) => !img.isPendingSync);

      let freedKb = 0;
      let count = 0;

      // Delete offline items from IndexedDB
      for (const offImg of offlineToDelete) {
        if (offImg.offlineId !== undefined) {
          await removeImageFromOfflineQueue(offImg.offlineId);
          freedKb += offImg.compressedSizeKb || 0;
          count++;
        }
      }

      // Delete online items from Firebase
      if (onlineToDelete.length > 0) {
        const res = await deleteBulkImages(onlineToDelete);
        freedKb += res.freedKb;
        count += res.count;
      }

      showToast(`Bulk Deleted ${count} receipts! Freed ${formatBytes(freedKb * 1024)} storage.`, 'success');
      setImages((prev) => prev.filter((i) => !selectedIds.has(i.id)));
      setSelectedIds(new Set());
    } catch (err: any) {
      console.error('Bulk delete error:', err);
      showToast('Bulk delete failed: ' + (err.message || 'Error'), 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const isAllSelected = images.length > 0 && selectedIds.size === images.length;

  return (
    <div className="space-y-6 pb-24">
      {/* SEARCH CONTROLS CARD */}
      <div className="bg-[#1A1C1E] border border-white/5 rounded-[24px] p-6 shadow-md space-y-4">
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <div className="flex items-center space-x-2 text-[#D0E4FF] font-semibold text-base">
            <Search className="w-5 h-5" />
            <h2>Search & Manage Receipts</h2>
          </div>
          <button
            onClick={handleSearch}
            className="p-1.5 rounded-lg bg-[#0E1116] hover:bg-white/10 text-gray-300 transition border border-white/5"
            title="Refresh search results"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Filter Inputs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* From Date */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest flex items-center space-x-1">
              <Calendar className="w-3.5 h-3.5 text-[#D0E4FF]" />
              <span>From Date</span>
            </label>
            <input
              id="search-from-date"
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full bg-[#0E1116] border border-white/5 rounded-xl px-3 py-2 text-xs text-[#E2E2E6] focus:outline-none focus:border-[#D0E4FF]/40"
            />
          </div>

          {/* To Date */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest flex items-center space-x-1">
              <Calendar className="w-3.5 h-3.5 text-[#D0E4FF]" />
              <span>To Date</span>
            </label>
            <input
              id="search-to-date"
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full bg-[#0E1116] border border-white/5 rounded-xl px-3 py-2 text-xs text-[#E2E2E6] focus:outline-none focus:border-[#D0E4FF]/40"
            />
          </div>

          {/* Folder Name Dropdown */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest flex items-center space-x-1">
              <Filter className="w-3.5 h-3.5 text-[#D0E4FF]" />
              <span>Folder Name</span>
            </label>
            <select
              id="search-folder-select"
              value={selectedFolder}
              onChange={(e) => setSelectedFolder(e.target.value)}
              className="w-full bg-[#0E1116] border border-white/5 rounded-xl px-3 py-2 text-xs text-[#E2E2E6] focus:outline-none focus:border-[#D0E4FF]/40"
            >
              <option value="ALL">📁 All Folders</option>
              {folders.map((f) => (
                <option key={f.id} value={f.name}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* BULK ACTIONS & RESULTS BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#1A1C1E] p-4 rounded-2xl border border-white/5">
        <div className="flex items-center space-x-3">
          {/* Select All Checkbox */}
          <button
            id="select-all-checkbox"
            onClick={handleSelectAll}
            disabled={images.length === 0}
            className="flex items-center space-x-2 text-xs font-semibold text-[#E2E2E6] hover:text-white transition disabled:opacity-40"
          >
            {isAllSelected ? (
              <CheckSquare className="w-5 h-5 text-[#D0E4FF]" />
            ) : (
              <Square className="w-5 h-5 text-gray-500" />
            )}
            <span>
              Select All ({images.length})
            </span>
          </button>

          {selectedIds.size > 0 && (
            <span className="text-xs text-[#D0E4FF] bg-[#D0E4FF]/10 px-2.5 py-0.5 rounded-full font-medium border border-[#D0E4FF]/20">
              {selectedIds.size} Selected
            </span>
          )}
        </div>

        {/* Bulk Delete Button */}
        {selectedIds.size > 0 && (
          <button
            id="bulk-delete-btn"
            onClick={handleBulkDelete}
            disabled={isDeleting}
            className="py-2 px-4 bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/30 font-bold text-xs rounded-xl shadow transition flex items-center justify-center space-x-1.5 disabled:opacity-50"
          >
            {isDeleting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                <span>Bulk Delete ({selectedIds.size})</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* IMAGES GRID GROUPED BY MONTH & YEAR */}
      {isLoading ? (
        <div className="text-center py-12 space-y-2">
          <div className="w-8 h-8 border-3 border-[#D0E4FF] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-gray-400">Fetching receipt records from Firebase & Local Queue...</p>
        </div>
      ) : images.length === 0 ? (
        <div className="text-center py-12 px-4 bg-[#1A1C1E] rounded-[24px] border border-white/5">
          <HardDrive className="w-10 h-10 text-gray-600 mx-auto mb-2" />
          <h3 className="text-sm font-medium text-[#E2E2E6]">No Receipt Photos Found</h3>
          <p className="text-xs text-gray-400 mt-1">
            Try adjusting your date range or folder selection.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {groupedImages.map((group) => (
            <div key={group.monthYear} className="space-y-3">
              {/* Elegant Month & Year Subfolder Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-2.5 px-1">
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 rounded-lg bg-[#D0E4FF]/10 text-[#D0E4FF] flex items-center justify-center">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-[#E2E2E6] tracking-wide">
                    {group.monthYear}
                  </h3>
                  <span className="text-[10px] bg-[#D0E4FF]/15 text-[#D0E4FF] font-semibold px-2.5 py-0.5 rounded-full border border-[#D0E4FF]/20">
                    {group.items.length} {group.items.length === 1 ? 'photo' : 'photos'}
                  </span>
                </div>
                <span className="text-[11px] font-mono text-gray-400 hidden sm:inline">
                  Subfolder: /{group.monthYear.replace(/[^a-zA-Z0-9_\-\s]/g, '_').trim()}
                </span>
              </div>

              {/* Photo Grid for this Month & Year */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {group.items.map((img) => {
                  const isSelected = selectedIds.has(img.id);
                  return (
                    <div
                      key={img.id}
                      onClick={() => toggleSelect(img.id)}
                      className={`relative group bg-[#1A1C1E] border rounded-[24px] overflow-hidden shadow-sm transition-all duration-200 cursor-pointer ${
                        isSelected
                          ? 'border-[#D0E4FF] ring-2 ring-[#D0E4FF]/30'
                          : 'border-white/5 hover:border-white/20'
                      }`}
                    >
                      {/* Select Checkbox Overlay */}
                      <div className="absolute top-2 left-2 z-10">
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSelect(img.id);
                          }}
                          className={`w-6 h-6 rounded-lg flex items-center justify-center transition shadow-md ${
                            isSelected
                              ? 'bg-[#D0E4FF] text-[#00315B] font-bold'
                              : 'bg-[#0E1116]/80 text-gray-400 hover:text-white border border-white/10'
                          }`}
                        >
                          {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                        </div>
                      </div>

                      {/* Individual Delete Button */}
                      <button
                        id={`delete-single-btn-${img.id}`}
                        onClick={(e) => handleDeleteSingle(img, e)}
                        className="absolute top-2 right-2 z-10 p-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/40 border border-red-500/30 transition shadow-md"
                        title={img.isPendingSync ? 'Delete from local pending queue' : 'Delete from Storage & Realtime DB'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      {/* Image Thumbnail */}
                      <div className="relative h-36 bg-[#0E1116] flex items-center justify-center overflow-hidden">
                        <img
                          src={img.downloadUrl}
                          alt={img.fileName || 'Receipt'}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />

                        {/* SUBTLE SYNC STATUS INDICATOR */}
                        {img.isPendingSync ? (
                          <div className="absolute bottom-2 left-2 z-10 bg-amber-500/90 text-slate-950 px-2 py-0.5 rounded-full text-[10px] font-bold border border-amber-300/80 shadow-md flex items-center space-x-1 backdrop-blur-sm">
                            <RefreshCw className="w-3 h-3 text-slate-950 animate-spin" />
                            <span>Syncing...</span>
                          </div>
                        ) : (
                          <div className="absolute bottom-2 left-2 z-10 bg-emerald-500/90 text-slate-950 px-2 py-0.5 rounded-full text-[10px] font-bold border border-emerald-300/80 shadow-md flex items-center space-x-1 backdrop-blur-sm">
                            <CheckCircle2 className="w-3 h-3 text-slate-950" />
                            <span>Synced</span>
                          </div>
                        )}

                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            onPreviewImage(img);
                          }}
                          className="absolute inset-0 bg-[#0E1116]/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                        >
                          <span className="text-xs bg-[#1A1C1E]/90 text-[#E2E2E6] font-semibold px-3 py-1.5 rounded-full border border-white/10 flex items-center space-x-1 shadow">
                            <Eye className="w-3.5 h-3.5 text-[#D0E4FF]" />
                            <span>Preview</span>
                          </span>
                        </div>
                      </div>

                      {/* Card Info Footer */}
                      <div className="p-3 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-[#D0E4FF] bg-[#D0E4FF]/10 px-2 py-0.5 rounded-md uppercase tracking-wider truncate max-w-[100px]">
                            {img.folderName}
                          </span>
                          <span className="text-[10px] font-mono text-gray-400">
                            {img.compressedSizeKb ? `${img.compressedSizeKb} KB` : ''}
                          </span>
                        </div>

                        <p className="text-[11px] text-[#E2E2E6] font-medium truncate mt-1">
                          {img.fileName || 'Receipt Photo'}
                        </p>

                        <p className="text-[10px] text-gray-500 flex items-center space-x-1 font-mono">
                          <span>{img.formattedDate || new Date(img.uploadDate).toLocaleDateString()}</span>
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* PAGINATION CONTROLS */}
      {images.length > 0 && totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#1A1C1E] p-4 rounded-2xl border border-white/5 mt-4">
          <div className="text-xs text-gray-400">
            Showing <span className="font-semibold text-[#E2E2E6]">{startIndex + 1}</span> to{' '}
            <span className="font-semibold text-[#E2E2E6]">
              {Math.min(startIndex + ITEMS_PER_PAGE, images.length)}
            </span>{' '}
            of <span className="font-semibold text-[#E2E2E6]">{images.length}</span> receipts
          </div>

          <div className="flex items-center space-x-2">
            <button
              id="pagination-prev-btn"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="py-1.5 px-3 bg-[#0E1116] hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-[#0E1116] text-[#E2E2E6] text-xs font-medium rounded-xl border border-white/5 transition flex items-center space-x-1"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>

            <span className="text-xs text-[#D0E4FF] font-semibold bg-[#D0E4FF]/10 px-3 py-1.5 rounded-xl border border-[#D0E4FF]/20">
              Page {currentPage} of {totalPages}
            </span>

            <button
              id="pagination-next-btn"
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="py-1.5 px-3 bg-[#0E1116] hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-[#0E1116] text-[#E2E2E6] text-xs font-medium rounded-xl border border-white/5 transition flex items-center space-x-1"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

