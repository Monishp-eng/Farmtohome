import React, { forwardRef } from 'react';

const Input = forwardRef(({
  label,
  id,
  type = 'text',
  error,
  helperText,
  iconLeft,
  iconRight,
  className = '',
  required = false,
  disabled = false,
  ...props
}, ref) => {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
  const errorId = error ? `${inputId}-error` : undefined;
  const helperId = helperText ? `${inputId}-helper` : undefined;
  const describedBy = [errorId, helperId].filter(Boolean).join(' ') || undefined;

  return (
    <div className="w-full flex flex-col gap-1.5 text-left">
      {label && (
        <label
          htmlFor={inputId}
          className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center justify-between"
        >
          <span>
            {label}
            {required && <span className="text-red-500 ml-1" aria-hidden="true">*</span>}
          </span>
        </label>
      )}

      <div className="relative flex items-center">
        {iconLeft && (
          <div className="absolute left-3 text-gray-400 dark:text-gray-500 pointer-events-none flex items-center">
            {iconLeft}
          </div>
        )}

        <input
          ref={ref}
          id={inputId}
          type={type}
          disabled={disabled}
          required={required}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          className={`
            w-full py-2 text-sm rounded-xl transition-all font-medium
            bg-white dark:bg-slate-900 
            text-gray-900 dark:text-gray-100
            border ${error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-slate-700 focus:border-primary-500 focus:ring-primary-500'}
            focus:outline-none focus:ring-2 focus:ring-opacity-50
            disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-gray-100 dark:disabled:bg-slate-800
            ${iconLeft ? 'pl-10' : 'pl-3.5'}
            ${iconRight ? 'pr-10' : 'pr-3.5'}
            ${className}
          `}
          {...props}
        />

        {iconRight && (
          <div className="absolute right-3 text-gray-400 dark:text-gray-500 flex items-center">
            {iconRight}
          </div>
        )}
      </div>

      {error ? (
        <p id={errorId} role="alert" className="text-xs font-semibold text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : helperText ? (
        <p id={helperId} className="text-xs text-gray-500 dark:text-gray-400">
          {helperText}
        </p>
      ) : null}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;
