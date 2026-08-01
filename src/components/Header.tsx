import React from 'react';
import { Camera, Settings, Database, CheckCircle2, AlertCircle } from 'lucide-react';
import { ActiveTab } from '../types';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  isFirebaseConnected: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  isFirebaseConnected,
}) => {
  const getTitle = () => {
    switch (activeTab) {
      case 'home':
        return 'Receipt Camera Upload';
      case 'folders':
        return 'Manage Folders';
      case 'search':
        return 'Search & Manage Receipts';
      case 'cleanup':
        return 'Instant Quick Clean Up';
      case 'settings':
        return 'Firebase Configuration';
      default:
        return 'Receipt Organizer';
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-[#1A1C1E] text-[#E2E2E6] border-b border-white/5 shadow-lg">
      {/* Top Status Bar indicator */}
      <div className="flex justify-between items-center px-4 py-1 text-[11px] font-medium text-gray-500 bg-[#0E1116] border-b border-white/5">
        <span>9:41</span>
        <div className="flex gap-2 items-center text-gray-400">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21L1 10h22L12 21z"/></svg>
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M15.67 4H14V2h-4v2H8.33C7.6 4 7 4.6 7 5.33v15.33C7 21.4 7.6 22 8.33 22h7.33c.74 0 1.34-.6 1.34-1.33V5.33C17 4.6 16.4 4 15.67 4z"/></svg>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-3.5 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-[#D0E4FF] flex items-center justify-center text-[#00315B] font-bold shadow-md">
            <Camera className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-semibold text-lg leading-tight tracking-tight text-[#E2E2E6]">
              {getTitle()}
            </h1>
            <div className="flex items-center space-x-1.5 text-[11px] font-medium mt-0.5">
              {isFirebaseConnected ? (
                <span className="flex items-center text-[#D0E4FF] space-x-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="uppercase tracking-widest text-[10px] font-bold">Firebase Storage Active</span>
                </span>
              ) : (
                <span className="flex items-center text-amber-300 space-x-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Local Demo Mode (Tap Settings to configure)</span>
                </span>
              )}
            </div>
          </div>
        </div>

        <button
          id="header-settings-btn"
          onClick={() => setActiveTab('settings')}
          className={`p-2.5 rounded-xl transition-all flex items-center justify-center ${
            activeTab === 'settings'
              ? 'bg-[#D0E4FF] text-[#00315B] font-bold shadow'
              : 'bg-[#2D2F31] text-[#E2E2E6] hover:bg-white/10 border border-white/5'
          }`}
          title="Firebase Settings"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
};
