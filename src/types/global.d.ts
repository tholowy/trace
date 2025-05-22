interface ToastMethods {
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
}

// Extender la interfaz Window para añadir la propiedad toast
declare global {
  interface Window {
    toast?: ToastMethods;
  }
}
export {};