import React from 'react';

const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  loading = false, 
  disabled = false, 
  onClick, 
  className = '', 
  type = 'button',
  ariaLabel,
  ...props
}) => {
  
  const baseStyles = 'inline-flex items-center justify-center font-bold transition-all duration-150 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 select-none cursor-pointer';
  
  const variants = {
    primary: 'bg-primary hover:bg-primary-dark text-white shadow-xs hover:shadow-md active:scale-[0.98]',
    secondary: 'bg-white hover:bg-gray-50 text-gray-800 border border-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-gray-100 dark:border-slate-700 active:scale-[0.98]',
    danger: 'bg-red-600 hover:bg-red-700 text-white shadow-xs active:scale-[0.98]',
    outline: 'border-2 border-primary text-primary hover:bg-primary hover:text-white dark:border-emerald-500 dark:text-emerald-400 dark:hover:bg-emerald-600 dark:hover:text-white active:scale-[0.98]',
    ghost: 'bg-transparent text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 active:scale-[0.98]',
    link: 'bg-transparent text-primary dark:text-emerald-400 hover:underline p-0 h-auto'
  };
  
  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-2.5 text-base',
    icon: 'p-2'
  };

  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      aria-label={ariaLabel}
      aria-busy={loading}
      aria-disabled={isDisabled}
      className={`${baseStyles} ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${isDisabled ? 'opacity-50 cursor-not-allowed pointer-events-none active:scale-100' : ''} ${className}`}
      onClick={onClick}
      disabled={isDisabled}
      {...props}
    >
      {loading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {children}
    </button>
  );
};

export default Button;

