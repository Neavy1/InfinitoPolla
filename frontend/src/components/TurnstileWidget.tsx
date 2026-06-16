import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: { sitekey: string; callback: (token: string) => void; 'expired-callback': () => void }) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

interface Props {
  onVerify: (token: string) => void;
  onExpire?: () => void;
}

export function TurnstileWidget({ onVerify, onExpire }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY ?? '';

  useEffect(() => {
    if (!siteKey) {
      onVerify('dev-bypass');
      return;
    }

    const render = () => {
      if (!ref.current || !window.turnstile) return;
      if (widgetId.current) window.turnstile.remove(widgetId.current);
      widgetId.current = window.turnstile.render(ref.current, {
        sitekey: siteKey,
        callback: onVerify,
        'expired-callback': () => onExpire?.(),
      });
    };

    if (window.turnstile) render();
    else {
      const interval = setInterval(() => {
        if (window.turnstile) {
          clearInterval(interval);
          render();
        }
      }, 200);
      return () => clearInterval(interval);
    }
  }, [siteKey, onVerify, onExpire]);

  if (!siteKey) return null;
  return <div ref={ref} className="my-4" />;
}
