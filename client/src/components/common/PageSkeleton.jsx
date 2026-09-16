import React from 'react';
import { Skeleton, CardSkeleton } from '../ui/Skeleton';

const PageSkeleton = ({ type = 'marketplace' }) => {
  if (type === 'dashboard') {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
        {/* Header bar skeleton */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm mb-6 flex justify-between items-center animate-pulse">
          <div className="space-y-2 w-1/3">
            <div className="h-7 bg-gray-200 dark:bg-slate-800 rounded-lg w-3/4" />
            <div className="h-4 bg-gray-200 dark:bg-slate-800 rounded w-1/2" />
          </div>
          <div className="h-10 bg-gray-200 dark:bg-slate-800 rounded-xl w-32" />
        </div>

        {/* Stats 4-grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-xs animate-pulse">
              <div className="h-4 bg-gray-200 dark:bg-slate-800 rounded w-1/2 mb-3" />
              <div className="h-8 bg-gray-200 dark:bg-slate-800 rounded-lg w-2/3 mb-2" />
              <div className="h-3 bg-gray-200 dark:bg-slate-800 rounded w-1/3" />
            </div>
          ))}
        </div>

        {/* Main content split */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-100 dark:border-slate-800 h-80 animate-pulse">
            <div className="h-5 bg-gray-200 dark:bg-slate-800 rounded w-1/4 mb-4" />
            <div className="h-60 bg-gray-100 dark:bg-slate-800/60 rounded-2xl" />
          </div>
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-100 dark:border-slate-800 h-80 animate-pulse">
            <div className="h-5 bg-gray-200 dark:bg-slate-800 rounded w-1/3 mb-4" />
            <div className="space-y-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-12 bg-gray-100 dark:bg-slate-800/60 rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      {/* Banner Skeleton */}
      <div className="bg-emerald-950/20 dark:bg-slate-900 h-44 rounded-3xl p-8 mb-6 border border-emerald-900/20 dark:border-slate-800 animate-pulse flex flex-col justify-center">
        <div className="h-4 bg-emerald-700/20 dark:bg-slate-800 rounded-full w-48 mb-3" />
        <div className="h-8 bg-emerald-700/30 dark:bg-slate-800 rounded-xl w-3/4 mb-2" />
        <div className="h-4 bg-emerald-700/20 dark:bg-slate-800 rounded w-1/2" />
      </div>

      {/* Filter toolbar skeleton */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-xs mb-6 flex justify-between gap-4 animate-pulse">
        <div className="h-10 bg-gray-200 dark:bg-slate-800 rounded-xl w-full sm:w-96" />
        <div className="h-10 bg-gray-200 dark:bg-slate-800 rounded-xl w-40 hidden sm:block" />
      </div>

      {/* Cards grid */}
      <CardSkeleton count={8} />
    </div>
  );
};

export default PageSkeleton;
