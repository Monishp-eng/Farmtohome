import React, { useState } from 'react';

const Tooltip = ({
  children,
  content,
  position = 'top', // 'top' | 'bottom' | 'left' | 'right'
  className = ''
}) => {
  const [isVisible, setIsVisible] = useState(false);

  const positions = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <div
      className={`relative inline-flex ${className}`}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
    >
      {children}
      {isVisible && content && (
        <div
          role="tooltip"
          className={`
            absolute z-50 px-2.5 py-1 text-[11px] font-semibold text-white bg-gray-900/95 dark:bg-slate-800/95
            rounded-lg shadow-lg border border-white/10 whitespace-nowrap pointer-events-none
            animate-fade-in ${positions[position] || positions.top}
          `}
        >
          {content}
        </div>
      )}
    </div>
  );
};

export default Tooltip;
