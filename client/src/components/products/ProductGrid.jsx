import React from 'react';
import ProductCard from './ProductCard';
import Loading from '../common/Loading';

const ProductGrid = ({ products = [], loading = false, emptyMessage = 'No products found.' }) => {
  if (loading) {
    return (
      <div className="py-12">
        <Loading message="Loading marketplace..." />
      </div>
    );
  }

  if (!products || products.length === 0) {
    return (
      <div className="py-16 text-center bg-gray-50 rounded-lg border border-gray-100">
        <div className="text-4xl mb-4">🌾</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Nothing here yet</h3>
        <p className="text-gray-500">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {products.map((product) => (
        <ProductCard key={product.id || product._id || Math.random()} product={product} />
      ))}
    </div>
  );
};

export default ProductGrid;
