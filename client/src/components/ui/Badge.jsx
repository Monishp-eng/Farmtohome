import React from 'react';

const Badge = ({
  children,
  variant = 'default',
  size = 'md',
  icon = null,
  className = '',
  role = 'status',
  ariaLabel
}) => {
  const baseClasses = 'inline-flex items-center font-bold transition-colors rounded-full leading-none tracking-tight';

  const sizes = {
    sm: 'text-[10px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3 py-1.5 gap-2',
  };

  const variants = {
    default: 'bg-gray-100 text-gray-800 dark:bg-slate-800 dark:text-gray-200 border border-gray-200 dark:border-slate-700',
    primary: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-200 border border-emerald-300/50 dark:border-emerald-800/60',
    success: 'bg-green-100 text-green-900 dark:bg-green-950/70 dark:text-green-300 border border-green-300/50 dark:border-green-800',
    warning: 'bg-amber-100 text-amber-950 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300/50 dark:border-amber-800',
    danger: 'bg-rose-100 text-rose-900 dark:bg-rose-950/70 dark:text-rose-300 border border-rose-300/50 dark:border-rose-800',
    info: 'bg-blue-100 text-blue-900 dark:bg-blue-950/70 dark:text-blue-300 border border-blue-300/50 dark:border-blue-800',
    purple: 'bg-purple-100 text-purple-900 dark:bg-purple-950/70 dark:text-purple-300 border border-purple-300/50 dark:border-purple-800',
    outline: 'bg-transparent text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-slate-700'
  };

  return (
    <span
      role={role}
      aria-label={ariaLabel || (typeof children === 'string' ? children : undefined)}
      className={`${baseClasses} ${sizes[size]} ${variants[variant]} ${className}`}
    >
      {icon && <span className="shrink-0" aria-hidden="true">{icon}</span>}
      <span>{children}</span>
    </span>
  );
};

export default Badge;
