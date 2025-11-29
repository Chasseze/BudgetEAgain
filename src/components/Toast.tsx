import React, { useEffect } from 'react';
import { X, Undo2 } from 'lucide-react';

interface ToastProps {
  message: string;
  onUndo?: () => void;
  onClose: () => void;
  darkMode: boolean;
}

const Toast: React.FC<ToastProps> = ({ message, onUndo, onClose, darkMode }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      className={`fixed bottom-20 md:bottom-6 left-1/2 transform -translate-x-1/2 z-50
        ${darkMode ? 'bg-gray-800' : 'bg-gray-900'}
        text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3
        animate-slide-up`}
    >
      <span className="text-sm md:text-base">{message}</span>

      {onUndo && (
        <button
          onClick={onUndo}
          className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300
            font-medium transition-colors text-sm"
        >
          <Undo2 className="w-4 h-4" />
          Undo
        </button>
      )}

      <button
        onClick={onClose}
        className="text-gray-400 hover:text-white transition-colors ml-1"
        aria-label="Close notification"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export default Toast;
