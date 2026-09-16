import React from 'react';

const Toggle = ({
  checked = false,
  onChange,
  label,
  description,
  disabled = false,
  id,
  className = '',
  size = 'md'
}) => {
  const toggleId = id || `toggle-${Math.random().toString(36).substr(2, 9)}`;

  const sizes = {
    sm: { track: 'w-8 h-4', thumb: 'h-3 w-3', translate: 'translate-x-4' },
    md: { track: 'w-11 h-6', thumb: 'h-5 w-5', translate: 'translate-x-5' },
    lg: { track: 'w-14 h-7', thumb: 'h-6 w-6', translate: 'translate-x-7' }
  };

  const currentSize = sizes[size] || sizes.md;

  const handleKeyDown = (e) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      if (!disabled && onChange) onChange(!checked);
    }
  };

  return (
    <label
      htmlFor={toggleId}
      className={`inline-flex items-center gap-3 cursor-pointer select-none ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    >
      <div className="relative">
        <input
          id={toggleId}
          type="checkbox"
          checked={checked}
          onChange={(e) => !disabled && onChange && onChange(e.target.checked)}
          disabled={disabled}
          className="sr-only"
        />
        <div
          role="switch"
          aria-checked={checked}
          tabIndex={disabled ? -1 : 0}
          onKeyDown={handleKeyDown}
          className={`
            ${currentSize.track} rounded-full transition-colors duration-200 ease-in-out p-0.5
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2
            ${checked ? 'bg-primary' : 'bg-gray-300 dark:bg-slate-700'}
          `}
        >
          <div
            className={`
              ${currentSize.thumb} bg-white rounded-full shadow-md transform transition-transform duration-200 ease-in-out
              ${checked ? currentSize.translate : 'translate-x-0'}
            `}
          />
        </div>
      </div>

      {(label || description) && (
        <div className="flex flex-col text-left">
          {label && (
            <span className="text-xs font-bold text-gray-900 dark:text-gray-100">
              {label}
            </span>
          )}
          {description && (
            <span className="text-[11px] text-gray-500 dark:text-gray-400">
              {description}
            </span>
          )}
        </div>
      )}
    </label>
  );
};

export default Toggle;
