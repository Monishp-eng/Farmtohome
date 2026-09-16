import React, { useState } from 'react';

const Avatar = ({
  src,
  alt = 'Avatar',
  name = '',
  size = 'md',
  isOnline,
  className = ''
}) => {
  const [hasError, setHasError] = useState(false);

  const sizes = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg',
  };

  const badgeSizes = {
    xs: 'w-1.5 h-1.5',
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
    lg: 'w-3 h-3',
    xl: 'w-3.5 h-3.5',
  };

  const getInitials = (n) => {
    if (!n) return '?';
    const parts = n.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return n.slice(0, 2).toUpperCase();
  };

  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 ${className}`}>
      <div
        className={`
          ${sizes[size] || sizes.md} rounded-full overflow-hidden flex items-center justify-center
          bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-black
          ring-2 ring-white dark:ring-slate-900 shadow-xs
        `}
      >
        {src && !hasError ? (
          <img
            src={src}
            alt={alt}
            onError={() => setHasError(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <span>{getInitials(name)}</span>
        )}
      </div>

      {isOnline !== undefined && (
        <span
          className={`
            absolute bottom-0 right-0 rounded-full ring-2 ring-white dark:ring-slate-900
            ${badgeSizes[size] || badgeSizes.md}
            ${isOnline ? 'bg-green-500' : 'bg-gray-400'}
          `}
          title={isOnline ? 'Online' : 'Offline'}
        />
      )}
    </div>
  );
};

export default Avatar;
