import React, { useState, useEffect } from 'react';
import { Camera, FolderPlus, Search, Trash2, Settings } from 'lucide-react';
import { ActiveTab } from '../types';
import { loadNavConfig, NavItemConfig } from '../utils/navConfig';

interface BottomNavProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
}

const ICON_MAP: Record<string, React.ElementType> = {
  home: Camera,
  folders: FolderPlus,
  search: Search,
  cleanup: Trash2,
  settings: Settings,
};

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, setActiveTab }) => {
  const [navItems, setNavItems] = useState<NavItemConfig[]>(() => loadNavConfig());

  useEffect(() => {
    const handleNavConfigChange = () => {
      setNavItems(loadNavConfig());
    };

    window.addEventListener('nav_config_changed', handleNavConfigChange);
    window.addEventListener('nav_visibility_changed', handleNavConfigChange);
    return () => {
      window.removeEventListener('nav_config_changed', handleNavConfigChange);
      window.removeEventListener('nav_visibility_changed', handleNavConfigChange);
    };
  }, []);

  return (
    <nav className="fixed bottom-0 left-0 right-0 w-full z-[9999] bg-[#1A1C1E] border-t border-white/10 shadow-2xl pb-[env(safe-area-inset-bottom,0px)]">
      <div className="max-w-4xl mx-auto flex items-center justify-around px-2 pt-2 pb-1">
        {navItems.map((item) => {
          const Icon = ICON_MAP[item.id] || Camera;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              id={`nav-tab-${item.id}`}
              onClick={() => setActiveTab(item.id as ActiveTab)}
              style={{
                order: item.order,
                display: item.visible ? 'flex' : 'none',
              }}
              className="flex-col items-center justify-center py-1 px-2 min-w-[64px] rounded-2xl transition-all duration-200 touch-manipulation"
            >
              <div
                className={`flex items-center justify-center px-4 py-1.5 rounded-full transition-all ${
                  isActive
                    ? 'bg-[#D0E4FF] text-[#00315B] font-bold shadow-sm scale-105'
                    : 'text-gray-400 hover:text-[#E2E2E6] hover:bg-white/5'
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span
                className={`text-[10px] font-bold mt-1 tracking-wider ${
                  isActive ? 'text-[#D0E4FF]' : 'text-gray-500'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
      {/* Bottom Android Gesture Bar */}
      <div className="h-3 w-full flex justify-center items-center bg-[#1A1C1E] pb-1">
        <div className="w-28 h-1 bg-white/20 rounded-full"></div>
      </div>
    </nav>
  );
};

