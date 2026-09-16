import React from 'react';

const Tabs = ({
  tabs = [], // [{ id, label, icon, badge }]
  activeTab,
  onChange,
  className = '',
  variant = 'pills' // 'pills' | 'underline'
}) => {
  const handleKeyDown = (e, index) => {
    let nextIndex = null;
    if (e.key === 'ArrowRight') {
      nextIndex = (index + 1) % tabs.length;
    } else if (e.key === 'ArrowLeft') {
      nextIndex = (index - 1 + tabs.length) % tabs.length;
    }

    if (nextIndex !== null) {
      e.preventDefault();
      onChange(tabs[nextIndex].id);
      const nextTabElement = document.getElementById(`tab-${tabs[nextIndex].id}`);
      if (nextTabElement) nextTabElement.focus();
    }
  };

  return (
    <div
      role="tablist"
      aria-label="Navigation Tabs"
      className={`flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full ${className}`}
    >
      {tabs.map((tab, idx) => {
        const isActive = activeTab === tab.id;

        if (variant === 'underline') {
          return (
            <button
              key={tab.id}
              id={`tab-${tab.id}`}
              role="tab"
              aria-selected={isActive}
              aria-controls={`panel-${tab.id}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => onChange(tab.id)}
              onKeyDown={(e) => handleKeyDown(e, idx)}
              className={`
                flex items-center gap-2 py-3 px-4 font-bold text-xs whitespace-nowrap border-b-2 transition-all cursor-pointer
                ${isActive
                  ? 'border-primary text-primary dark:text-emerald-400 dark:border-emerald-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }
              `}
            >
              {tab.icon && <span aria-hidden="true">{tab.icon}</span>}
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 font-black">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        }

        return (
          <button
            key={tab.id}
            id={`tab-${tab.id}`}
            role="tab"
            aria-selected={isActive}
            aria-controls={`panel-${tab.id}`}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
            className={`
              flex items-center gap-2 py-2 px-3.5 rounded-xl font-extrabold text-xs whitespace-nowrap transition-all cursor-pointer
              ${isActive
                ? 'bg-emerald-900 dark:bg-emerald-600 text-white shadow-md ring-2 ring-emerald-400/30 dark:ring-emerald-400/60'
                : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700'
              }
            `}
          >
            {tab.icon && <span aria-hidden="true">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${isActive ? 'bg-amber-400 text-slate-950' : 'bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300'}`}>
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default Tabs;
