import React, { useState } from 'react';
import { Trash2, ShieldAlert, Zap, Clock, CheckCircle2, Filter, AlertTriangle } from 'lucide-react';
import { FolderItem } from '../types';
import { quickBulkDeleteByAge } from '../services/firebaseService';
import { formatBytes } from '../utils/imageCompressor';

interface QuickCleanupPanelProps {
  folders: FolderItem[];
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onCleanupCompleted?: () => void;
}

export const QuickCleanupPanel: React.FC<QuickCleanupPanelProps> = ({
  folders,
  showToast,
  onCleanupCompleted,
}) => {
  const [selectedFolder, setSelectedFolder] = useState<string>('ALL');
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [activeTimeframe, setActiveTimeframe] = useState<string | null>(null);

  const [lastResult, setLastResult] = useState<{
    count: number;
    freedKb: number;
    folderName: string;
    timeframeLabel: string;
  } | null>(null);

  const handleQuickDelete = async (
    timeframe: '3months' | '6months' | '1year',
    label: string
  ) => {
    const targetFolder = selectedFolder === 'ALL' ? 'All Folders' : `Folder "${selectedFolder}"`;

    if (
      !window.confirm(
        `INSTANT QUICK CLEANUP CONFIRMATION:\n\nAre you sure you want to permanently delete ALL receipt photos in ${targetFolder} older than ${label}?\n\nThis will instantly remove files from BOTH Firebase Storage and Realtime Database in the background.`
      )
    ) {
      return;
    }

    setIsDeleting(true);
    setActiveTimeframe(timeframe);
    setLastResult(null);

    try {
      const { count, freedKb } = await quickBulkDeleteByAge(selectedFolder, timeframe);

      setLastResult({
        count,
        freedKb,
        folderName: targetFolder,
        timeframeLabel: label,
      });

      if (count > 0) {
        showToast(
          `Instant Cleanup Complete! Deleted ${count} photos older than ${label}, freeing ${formatBytes(freedKb * 1024)}.`,
          'success'
        );
      } else {
        showToast(`No receipt photos found older than ${label} in ${targetFolder}.`, 'info');
      }

      if (onCleanupCompleted) {
        onCleanupCompleted();
      }
    } catch (err: any) {
      console.error('Quick cleanup error:', err);
      showToast('Quick cleanup failed: ' + (err.message || 'Error'), 'error');
    } finally {
      setIsDeleting(false);
      setActiveTimeframe(null);
    }
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Header Info Banner */}
      <div className="bg-[#1A1C1E] border border-white/5 rounded-[24px] p-6 shadow-md space-y-3">
        <div className="flex items-center space-x-2 text-red-400 font-bold text-sm tracking-wide">
          <Zap className="w-5 h-5 fill-red-500/20" />
          <h2>Instant Quick Bulk Cleanup</h2>
        </div>
        <p className="text-xs text-gray-400 leading-relaxed">
          Instantly purge outdated receipt photos directly from <strong className="text-[#E2E2E6]">Firebase Storage & Realtime Database</strong> without needing to manually search or select them first.
        </p>
      </div>

      {/* Main Cleanup Form Card */}
      <div className="bg-[#1A1C1E] border border-white/5 rounded-[24px] p-6 shadow-md space-y-6">
        {/* Step 1: Select Folder Dropdown */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-widest text-gray-400 flex items-center space-x-1.5">
            <Filter className="w-4 h-4 text-[#D0E4FF]" />
            <span>1. Select Target Folder</span>
          </label>
          <select
            id="quick-cleanup-folder-select"
            value={selectedFolder}
            onChange={(e) => setSelectedFolder(e.target.value)}
            className="w-full bg-[#0E1116] border border-white/5 rounded-xl px-4 py-3 text-xs text-[#E2E2E6] font-medium focus:outline-none focus:border-[#D0E4FF]/40"
          >
            <option value="ALL">📁 All Folders (Global Cleanup)</option>
            {folders.map((f) => (
              <option key={f.id} value={f.name}>
                📁 {f.name}
              </option>
            ))}
          </select>
        </div>

        {/* Step 2: Three Distinct Age-Based Buttons */}
        <div className="space-y-3 pt-3 border-t border-white/5">
          <label className="text-xs font-bold uppercase tracking-widest text-gray-400 flex items-center space-x-1.5">
            <Clock className="w-4 h-4 text-red-400" />
            <span>2. Bulk delete files older than</span>
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Button 1: Delete 3 Months Old */}
            <button
              id="cleanup-3-months-btn"
              onClick={() => handleQuickDelete('3months', '3 Months')}
              disabled={isDeleting}
              className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 p-4 rounded-xl flex flex-col items-center justify-center transition-all duration-200 active:scale-95 disabled:opacity-50"
            >
              <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center mb-2">
                <Clock className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider">
                3 MONTHS
              </span>
              <span className="text-[10px] text-gray-500 mt-1">Older than 90 days</span>
            </button>

            {/* Button 2: Delete 6 Months Old */}
            <button
              id="cleanup-6-months-btn"
              onClick={() => handleQuickDelete('6months', '6 Months')}
              disabled={isDeleting}
              className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 p-4 rounded-xl flex flex-col items-center justify-center transition-all duration-200 active:scale-95 disabled:opacity-50"
            >
              <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center mb-2">
                <Trash2 className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider">
                6 MONTHS
              </span>
              <span className="text-[10px] text-gray-500 mt-1">Older than 180 days</span>
            </button>

            {/* Button 3: Delete 1 Year Old */}
            <button
              id="cleanup-1-year-btn"
              onClick={() => handleQuickDelete('1year', '1 Year')}
              disabled={isDeleting}
              className="bg-red-500 text-white p-4 rounded-xl flex flex-col items-center justify-center transition-all duration-200 active:scale-95 shadow-md hover:bg-red-600 disabled:opacity-50"
            >
              <div className="w-10 h-10 rounded-xl bg-white/20 text-white flex items-center justify-center mb-2">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider">
                1 YEAR
              </span>
              <span className="text-[10px] text-white/80 mt-1">Older than 365 days</span>
            </button>
          </div>
        </div>

        {/* Loading overlay indicator */}
        {isDeleting && (
          <div className="p-4 bg-[#0E1116] rounded-xl border border-red-500/30 flex items-center space-x-3 animate-pulse">
            <div className="w-5 h-5 border-2 border-red-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
            <div className="text-xs text-red-300 font-medium">
              Calculating thresholds and deleting matching files from Firebase Storage & Realtime Database...
            </div>
          </div>
        )}

        {/* Success Alert Card */}
        {lastResult && (
          <div className="p-4 bg-[#0E1116] border border-emerald-500/40 rounded-2xl space-y-2">
            <div className="flex items-center space-x-2 text-emerald-400 font-bold text-sm">
              <CheckCircle2 className="w-5 h-5" />
              <span>Instant Quick Cleanup Complete!</span>
            </div>
            <div className="text-xs text-[#E2E2E6] space-y-1">
              <p>
                <strong>Target:</strong> {lastResult.folderName} (Older than {lastResult.timeframeLabel})
              </p>
              <p>
                <strong>Photos Purged:</strong> {lastResult.count} receipt records removed
              </p>
              <p>
                <strong>Storage Recovered:</strong> {formatBytes(lastResult.freedKb * 1024)} freed from Firebase Storage & Database
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
