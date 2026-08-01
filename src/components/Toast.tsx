import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface ToastProps {
  toast: ToastMessage | null;
  onDismiss: () => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toast, onDismiss }) => {
  if (!toast) return null;

  const getStyle = () => {
    switch (toast.type) {
      case 'success':
        return 'bg-emerald-900/95 border-emerald-500 text-emerald-100 shadow-emerald-950/50';
      case 'error':
        return 'bg-red-600 border-red-400 text-white shadow-red-950/60 font-semibold';
      default:
        return 'bg-[#1A1C1E]/95 border-[#D0E4FF]/40 text-[#E2E2E6] shadow-black/60';
    }
  };

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-emerald-300 flex-shrink-0" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-white flex-shrink-0" />;
      default:
        return <Info className="w-5 h-5 text-[#D0E4FF] flex-shrink-0" />;
    }
  };

  return (
    <div className="fixed top-4 left-0 right-0 z-[10000] pointer-events-none px-4 flex justify-center">
      <div
        key={toast.id}
        className={`pointer-events-auto max-w-md w-full border rounded-2xl p-3.5 shadow-2xl backdrop-blur-md flex items-center justify-between space-x-3 transition-all duration-200 animate-slide-down ${getStyle()}`}
      >
        <div className="flex items-center space-x-3 min-w-0">
          {getIcon()}
          <span className="text-xs sm:text-sm font-medium leading-snug break-words">{toast.message}</span>
        </div>
        <button
          onClick={onDismiss}
          className="p-1 rounded-full hover:bg-black/20 text-white/80 hover:text-white transition flex-shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
