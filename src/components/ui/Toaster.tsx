import { useState, useEffect, type FC } from 'react';
import { X } from 'lucide-react';

interface ToastProps {
  message: string;
  type?: 'default' | 'success' | 'error' | 'warning' | 'info';
  onClose: () => void;
  duration?: number;
}

interface Toast {
  id: string;
  message: string;
  type: 'default' | 'success' | 'error' | 'warning' | 'info';
  duration: number;
}

export const Toast: FC<ToastProps> = ({ message, type = 'default', onClose, duration = 5000 }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    
    return () => clearTimeout(timer);
  }, [duration, onClose]);
  
  // Determinar estilo del toast según el tipo
  const getToastStyle = () => {
    switch (type) {
      case 'success':
        return 'bg-green-500 dark:bg-green-600';
      case 'error':
        return 'bg-red-500 dark:bg-red-600';
      case 'warning':
        return 'bg-amber-500 dark:bg-amber-600';
      case 'info':
      default:
        return 'bg-blue-500 dark:bg-blue-600';
    }
  };
  
  return (
    <div className={`${getToastStyle()} text-white p-4 rounded-md shadow-lg flex justify-between items-center`}>
      <span>{message}</span>
      <button 
        onClick={onClose}
        className="ml-4 text-white hover:text-gray-200"
      >
        <X size={18} />
      </button>
    </div>
  );
};

export const Toaster: FC = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  
  // Agregar un nuevo toast
  const addToast = (message: string, type: ToastProps['type'] = 'default', duration = 5000) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type, duration }]);
  };
  
  // Eliminar un toast
  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };
  
  // Exponer métodos globalmente
  useEffect(() => {
    window.toast = {
      success: (message, duration) => addToast(message, 'success', duration),
      error: (message, duration) => addToast(message, 'error', duration),
      warning: (message, duration) => addToast(message, 'warning', duration),
      info: (message, duration) => addToast(message, 'info', duration),
    };
    
    return () => {
      delete window.toast;
    };
  }, []);
  
  if (toasts.length === 0) return null;
  
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col space-y-2">
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
};