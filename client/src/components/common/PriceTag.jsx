import React from 'react';

const PriceTag = ({ price, originalPrice = null }) => {
  const formatPrice = (p) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(p);
  };

  let savingsPercent = 0;
  if (originalPrice && originalPrice > price) {
    savingsPercent = Math.round(((originalPrice - price) / originalPrice) * 100);
  }

  return (
    <div className="flex items-baseline flex-wrap gap-2">
      <span className="text-xl font-bold text-gray-900">{formatPrice(price)}</span>
      
      {originalPrice && originalPrice > price && (
        <>
          <span className="text-sm text-gray-500 line-through">{formatPrice(originalPrice)}</span>
          <span className="text-xs font-semibold text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
            {savingsPercent}% OFF
          </span>
        </>
      )}
    </div>
  );
};

export default PriceTag;
