import { useState, useEffect } from 'react';
import { Check, X, AlertCircle, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface DiagnosticItem {
  label: string;
  status: 'ok' | 'error' | 'pending';
  value?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const DiagnosticsPanel = ({ isOpen, onClose }: Props) => {
  const [diagnostics, setDiagnostics] = useState<DiagnosticItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const runDiagnostics = async () => {
    setIsLoading(true);
    const results: DiagnosticItem[] = [];

    // Check Service Worker
    try {
      const sw = 'serviceWorker' in navigator;
      const reg = sw ? await navigator.serviceWorker.getRegistration() : null;
      results.push({
        label: 'Service Worker',
        status: reg?.active ? 'ok' : 'error',
        value: reg?.active ? 'ACTIVE' : 'INACTIVE',
      });
    } catch {
      results.push({ label: 'Service Worker', status: 'error', value: 'ERROR' });
    }

    // Check Push Permission
    try {
      const permission = Notification.permission;
      results.push({
        label: 'Push Permission',
        status: permission === 'granted' ? 'ok' : permission === 'denied' ? 'error' : 'pending',
        value: permission.toUpperCase(),
      });
    } catch {
      results.push({ label: 'Push Permission', status: 'error', value: 'ERROR' });
    }

    // Check Push Subscription
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await (reg as any).pushManager?.getSubscription?.();
      results.push({
        label: 'Push Subscription',
        status: sub ? 'ok' : 'error',
        value: sub ? 'PRESENT' : 'ABSENT',
      });
    } catch {
      results.push({ label: 'Push Subscription', status: 'error', value: 'ERROR' });
    }

    // Check Backend Reachability
    try {
      const { error } = await supabase.from('flights').select('id').limit(1);
      results.push({
        label: 'Backend Reachable',
        status: error ? 'error' : 'ok',
        value: error ? 'UNREACHABLE' : 'CONNECTED',
      });
    } catch {
      results.push({ label: 'Backend Reachable', status: 'error', value: 'ERROR' });
    }

    // Check Online Status
    results.push({
      label: 'Network Status',
      status: navigator.onLine ? 'ok' : 'error',
      value: navigator.onLine ? 'ONLINE' : 'OFFLINE',
    });

    // Check IndexedDB
    try {
      const dbRequest = indexedDB.open('arrivamv-test');
      await new Promise((resolve, reject) => {
        dbRequest.onsuccess = resolve;
        dbRequest.onerror = reject;
      });
      indexedDB.deleteDatabase('arrivamv-test');
      results.push({
        label: 'IndexedDB',
        status: 'ok',
        value: 'AVAILABLE',
      });
    } catch {
      results.push({ label: 'IndexedDB', status: 'error', value: 'UNAVAILABLE' });
    }

    // Check Weather API
    try {
      const { error } = await supabase.functions.invoke('get-weather', {
        body: { lat: 4.1918, lon: 73.5291 },
      });
      results.push({
        label: 'Weather API',
        status: error ? 'error' : 'ok',
        value: error ? 'ERROR' : 'WORKING',
      });
    } catch {
      results.push({ label: 'Weather API', status: 'error', value: 'ERROR' });
    }

    setDiagnostics(results);
    setIsLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      runDiagnostics();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-background/95 border border-border rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-foreground">System Diagnostics</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3">
          {diagnostics.map((item, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-border/50">
              <span className="text-sm text-muted-foreground">{item.label}</span>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-medium ${
                  item.status === 'ok' ? 'text-green-400' :
                  item.status === 'error' ? 'text-red-400' :
                  'text-yellow-400'
                }`}>
                  {item.value}
                </span>
                {item.status === 'ok' ? (
                  <Check className="w-4 h-4 text-green-400" />
                ) : item.status === 'error' ? (
                  <X className="w-4 h-4 text-red-400" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-yellow-400" />
                )}
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={runDiagnostics}
          disabled={isLoading}
          className="mt-6 w-full flex items-center justify-center gap-2 py-3 bg-primary/20 hover:bg-primary/30 rounded-lg transition-colors text-primary font-medium"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          {isLoading ? 'Running...' : 'Re-run Diagnostics'}
        </button>

        <p className="mt-4 text-xs text-muted-foreground text-center">
          Last checked: {new Date().toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
};

export default DiagnosticsPanel;
