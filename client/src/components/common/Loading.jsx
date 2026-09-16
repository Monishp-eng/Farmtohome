import React from 'react';

const Loading = ({ message = 'Loading farm data...', size = 'md' }) => {
  const sizes = {
    sm: 'h-6 w-6 border-2',
    md: 'h-10 w-10 border-3',
    lg: 'h-14 w-14 border-4',
  };

  return (
    <div 
      role="status" 
      aria-live="polite" 
      className="flex flex-col items-center justify-center py-12 px-4 select-none"
    >
      <div 
        className={`animate-spin rounded-full border-primary border-t-transparent ${sizes[size] || sizes.md}`}
        aria-hidden="true"
      />
      <p className="mt-4 text-sm font-bold text-gray-600 dark:text-gray-300 animate-pulse">
        {message}
      </p>
      <span className="sr-only">{message}</span>
    </div>
  );
};

export default Loading;

