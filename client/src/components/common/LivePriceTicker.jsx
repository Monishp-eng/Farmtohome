import React, { useState } from 'react';
import { TrendingUp, TrendingDown, Radio, Activity } from 'lucide-react';
import useMarketPriceStream from '../../hooks/useSSE';

const LivePriceTicker = () => {
  const { prices, isLive } = useMarketPriceStream();
  const [isPaused, setIsPaused] = useState(false);

  return (
    <div 
      role="region"
      aria-label="Live Mandi Price Ticker"
      className="w-full bg-slate-900 text-white py-2 px-3 sm:px-4 rounded-2xl border border-emerald-800/40 shadow-md mb-6 overflow-hidden flex items-center gap-3"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Live Badge */}
      <div className="flex items-center gap-1.5 shrink-0 bg-emerald-600/30 text-emerald-400 border border-emerald-500/40 px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider uppercase">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span>Mandi Ticker</span>
      </div>

      {/* Ticker Stream */}
      <div className="flex-1 overflow-x-auto no-scrollbar flex items-center gap-6 py-0.5">
        <div className={`flex items-center gap-6 whitespace-nowrap text-xs font-semibold ${isPaused ? '' : 'animate-fade-in'}`}>
          {prices.map((item, idx) => {
            const isUp = item.change >= 0;
            return (
              <div 
                key={`${item.name}-${idx}`} 
                className="inline-flex items-center gap-2 bg-white/5 hover:bg-white/10 px-3 py-1 rounded-xl transition-colors border border-white/5"
              >
                <span className="text-gray-300 font-bold">{item.name}</span>
                <span className="text-[11px] text-gray-400 font-medium">({item.mandi})</span>
                <span className="text-white font-black">₹{item.price}/kg</span>
                <span 
                  className={`inline-flex items-center text-[10px] font-black ${
                    isUp ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {isUp ? <TrendingUp size={12} className="mr-0.5" /> : <TrendingDown size={12} className="mr-0.5" />}
                  {isUp ? `+${item.change}%` : `${item.change}%`}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default LivePriceTicker;
