import React from 'react';

const Card = ({ children, header, footer, hover = false, padding = 'p-6', className = '' }) => {
  return (
    <div className={`bg-white rounded-lg shadow-md overflow-hidden ${hover ? 'hover:shadow-xl transition-shadow duration-300' : ''} ${className}`}>
      {header && (
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
          {header}
        </div>
      )}
      <div className={padding}>
        {children}
      </div>
      {footer && (
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
          {footer}
        </div>
      )}
    </div>
  );
};

export default Card;
