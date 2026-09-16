import React from 'react';
import Button from '../common/Button';

const EmptyState = ({
  icon = '🌾',
  title = 'No items found',
  description = 'Try adjusting your filters or search terms to find what you are looking for.',
  actionLabel,
  onAction,
  className = ''
}) => {
  return (
    <div
      role="region"
      aria-label={title}
      className={`
        w-full bg-white dark:bg-slate-900 border border-dashed border-gray-300 dark:border-slate-800
        rounded-3xl p-8 sm:p-12 text-center flex flex-col items-center justify-center gap-3
        transition-colors ${className}
      `}
    >
      <div className="text-4xl sm:text-5xl mb-1 select-none animate-bounce-soft">
        {icon}
      </div>
      <h3 className="text-base sm:text-lg font-black text-gray-900 dark:text-gray-100">
        {title}
      </h3>
      <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 max-w-md leading-relaxed">
        {description}
      </p>
      {actionLabel && onAction && (
        <div className="mt-3">
          <Button size="sm" onClick={onAction} variant="primary">
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
};

export default EmptyState;
