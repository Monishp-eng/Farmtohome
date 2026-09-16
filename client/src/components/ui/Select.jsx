import React, { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';

const Select = forwardRef(({
  label,
  id,
  options = [],
  error,
  helperText,
  iconLeft,
  className = '',
  required = false,
  disabled = false,
  children,
  ...props
}, ref) => {
  const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;
  const errorId = error ? `${selectId}-error` : undefined;

  return (
    <div className="w-full flex flex-col gap-1.5 text-left">
      {label && (
        <label
          htmlFor={selectId}
          className="text-xs font-bold text-gray-700 dark:text-gray-300"
        >
          {label}
          {required && <span className="text-red-500 ml-1" aria-hidden="true">*</span>}
        </label>
      )}

      <div className="relative flex items-center">
        {iconLeft && (
          <div className="absolute left-3 text-gray-400 dark:text-gray-500 pointer-events-none flex items-center">
            {iconLeft}
          </div>
        )}

        <select
          ref={ref}
          id={selectId}
          disabled={disabled}
          required={required}
          aria-invalid={!!error}
          className={`
            w-full py-2 pr-10 text-sm rounded-xl appearance-none transition-all font-medium cursor-pointer
            bg-white dark:bg-slate-900 
            text-gray-900 dark:text-gray-100
            border ${error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-slate-700 focus:border-primary-500 focus:ring-primary-500'}
            focus:outline-none focus:ring-2 focus:ring-opacity-50
            disabled:opacity-60 disabled:cursor-not-allowed
            ${iconLeft ? 'pl-10' : 'pl-3.5'}
            ${className}
          `}
          {...props}
        >
          {children || options.map((opt) => (
            <option key={opt.value} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </option>
          ))}
        </select>

        <div className="absolute right-3 pointer-events-none text-gray-400 dark:text-gray-500">
          <ChevronDown size={16} />
        </div>
      </div>

      {error && (
        <p id={errorId} role="alert" className="text-xs font-semibold text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
});

Select.displayName = 'Select';

export default Select;
