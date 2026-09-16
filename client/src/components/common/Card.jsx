import React from 'react';

const Card = ({ 
  children, 
  header, 
  footer, 
  hover = false, 
  padding = 'p-6', 
  variant = 'default', // 'default' | 'flat' | 'outline' | 'glass'
  className = '',
  role,
  ariaLabel
}) => {
  const variantStyles = {
    default: 'bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 shadow-sm',
    flat: 'bg-gray-50 dark:bg-slate-900/50 border border-gray-200/80 dark:border-slate-800',
    outline: 'bg-transparent border border-gray-200 dark:border-slate-800',
    glass: 'bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-white/20 dark:border-slate-800/50 shadow-lg'
  };

  return (
    <div 
      role={role}
      aria-label={ariaLabel}
      className={`
        rounded-2xl sm:rounded-3xl overflow-hidden transition-all duration-200
        text-gray-900 dark:text-gray-100
        ${variantStyles[variant] || variantStyles.default}
        ${hover ? 'hover:shadow-xl hover:-translate-y-0.5' : ''} 
        ${className}
      `}
    >
      {header && (
        <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50/70 dark:bg-slate-800/40">
          {header}
        </div>
      )}
      <div className={padding}>
        {children}
      </div>
      {footer && (
        <div className="px-6 py-4 border-t border-gray-100 dark:border-slate-800 bg-gray-50/70 dark:bg-slate-800/40">
          {footer}
        </div>
      )}
    </div>
  );
};

export default Card;

