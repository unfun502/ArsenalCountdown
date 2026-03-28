declare global {
  interface Window {
    umami?: {
      track: (name: string, data?: Record<string, string | number>) => void;
    };
  }
}

export function track(name: string, data?: Record<string, string | number>) {
  window.umami?.track(name, data);
}
