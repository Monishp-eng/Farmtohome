import React from 'react';
import { WifiOff, Wifi, RefreshCw } from 'lucide-react';
import useOnlineStatus from '../../hooks/useOnlineStatus';

const OfflineBanner = () => {
  const { isOnline, wasOffline } = useOnlineStatus();

  if (isOnline && !wasOffline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`
        w-full py-2 px-4 text-xs font-bold text-center flex items-center justify-center gap-2 transition-all duration-300 z-40
        ${!isOnline 
          ? 'bg-amber-500 text-slate-950 shadow-md' 
          : 'bg-emerald-600 text-white shadow-md'
        }
      `}
    >
      {!isOnline ? (
        <>
          <WifiOff size={15} className="shrink-0 animate-pulse" aria-hidden="true" />
          <span>You are currently offline. Product catalog & cart are running in offline-first mode. Changes will automatically sync when reconnected!</span>
        </>
      ) : (
        <>
          <Wifi size={15} className="shrink-0" aria-hidden="true" />
          <span>You are back online! Changes synchronized with KisanSetu network.</span>
        </>
      )}
    </div>
  );
};

export default OfflineBanner;
