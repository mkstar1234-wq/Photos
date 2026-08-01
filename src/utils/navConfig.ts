export interface NavItemConfig {
  id: 'home' | 'folders' | 'search' | 'cleanup' | 'settings';
  label: string;
  desc?: string;
  visible: boolean;
  order: number;
}

export const DEFAULT_NAV_CONFIG: NavItemConfig[] = [
  { id: 'home', label: 'CAMERA', desc: 'Direct camera capture & folder dashboard', visible: true, order: 0 },
  { id: 'folders', label: 'FOLDERS', desc: 'Create and organize custom photo folders', visible: true, order: 1 },
  { id: 'search', label: 'SEARCH', desc: 'Search and inspect uploaded photos', visible: true, order: 2 },
  { id: 'cleanup', label: 'CLEANUP', desc: 'Fast batch selection and deletion', visible: true, order: 3 },
  { id: 'settings', label: 'SETTINGS', desc: 'Firebase database config & global options', visible: true, order: 4 },
];

export function loadNavConfig(): NavItemConfig[] {
  try {
    const stored = localStorage.getItem('app_nav_config');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Ensure all default items exist in case new ones were added
        const loadedIds = new Set(parsed.map((p: NavItemConfig) => p.id));
        const missing = DEFAULT_NAV_CONFIG.filter(item => !loadedIds.has(item.id));
        const merged = [...parsed, ...missing];
        return merged.map((item, idx) => ({
          ...item,
          order: typeof item.order === 'number' ? item.order : idx,
        })).sort((a, b) => a.order - b.order);
      }
    }
    const legacyVis = localStorage.getItem('app_nav_visibility');
    if (legacyVis) {
      const parsedVis = JSON.parse(legacyVis);
      return DEFAULT_NAV_CONFIG.map((item) => ({
        ...item,
        visible: item.id === 'settings' ? true : parsedVis[item.id] !== false,
      }));
    }
  } catch (err) {
    console.error('Failed reading nav config from localStorage:', err);
  }
  return DEFAULT_NAV_CONFIG;
}

export function saveNavConfig(items: NavItemConfig[]): NavItemConfig[] {
  const normalized = items.map((item, index) => ({
    ...item,
    order: index,
  }));
  localStorage.setItem('app_nav_config', JSON.stringify(normalized));

  const visMap: Record<string, boolean> = {};
  normalized.forEach((item) => {
    visMap[item.id] = item.visible;
  });
  localStorage.setItem('app_nav_visibility', JSON.stringify(visMap));

  window.dispatchEvent(new Event('nav_config_changed'));
  window.dispatchEvent(new Event('nav_visibility_changed'));
  return normalized;
}
