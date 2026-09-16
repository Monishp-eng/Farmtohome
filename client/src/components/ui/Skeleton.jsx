import React from 'react';

export const Skeleton = ({
  variant = 'text', // 'text' | 'circular' | 'rectangular' | 'card'
  width,
  height,
  className = '',
  count = 1,
  ariaLabel = 'Loading...'
}) => {
  const baseClasses = 'relative overflow-hidden bg-gray-200 dark:bg-slate-800 rounded-lg animate-pulse';

  const getVariantStyles = () => {
    switch (variant) {
      case 'circular':
        return 'rounded-full';
      case 'rectangular':
        return 'rounded-xl';
      case 'card':
        return 'rounded-2xl h-64 w-full';
      case 'text':
      default:
        return 'h-4 w-full rounded-md';
    }
  };

  const style = {
    width: width || undefined,
    height: height || undefined,
  };

  const items = Array.from({ length: count });

  return (
    <div
      role="status"
      aria-label={ariaLabel}
      aria-live="polite"
      className="w-full flex flex-col gap-2"
    >
      <span className="sr-only">{ariaLabel}</span>
      {items.map((_, i) => (
        <div
          key={i}
          style={style}
          className={`${baseClasses} ${getVariantStyles()} ${className}`}
        >
          {/* Shimmer sweep effect */}
          <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent animate-shimmer" />
        </div>
      ))}
    </div>
  );
};

export const CardSkeleton = ({ count = 4 }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 w-full">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-3xl p-4 shadow-sm flex flex-col gap-3 animate-pulse"
        >
          <div className="bg-gray-200 dark:bg-slate-800 h-44 rounded-2xl w-full" />
          <div className="flex justify-between items-center mt-1">
            <div className="h-4 bg-gray-200 dark:bg-slate-800 rounded w-1/3" />
            <div className="h-4 bg-gray-200 dark:bg-slate-800 rounded w-1/4" />
          </div>
          <div className="h-5 bg-gray-200 dark:bg-slate-800 rounded w-3/4" />
          <div className="h-4 bg-gray-200 dark:bg-slate-800 rounded w-1/2" />
          <div className="flex justify-between items-center pt-2 mt-auto border-t border-gray-100 dark:border-slate-800">
            <div className="h-6 bg-gray-200 dark:bg-slate-800 rounded w-1/3" />
            <div className="h-8 bg-gray-200 dark:bg-slate-800 rounded-xl w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
};

export const TableSkeleton = ({ rows = 5, cols = 5 }) => {
  return (
    <div className="w-full bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-4 animate-pulse">
      <div className="h-10 bg-gray-100 dark:bg-slate-800 rounded-xl mb-4 w-full" />
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex gap-4">
            {Array.from({ length: cols }).map((_, c) => (
              <div key={c} className="h-8 bg-gray-100 dark:bg-slate-800/60 rounded-lg flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Skeleton;
