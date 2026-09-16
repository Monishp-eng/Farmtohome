import React from 'react';

const SkipLink = ({ targetId = 'main-content', label = 'Skip to main content' }) => {
  return (
    <a
      href={`#${targetId}`}
      className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-emerald-700 focus:text-white focus:font-black focus:rounded-xl focus:shadow-2xl focus:ring-4 focus:ring-amber-400"
    >
      {label}
    </a>
  );
};

export default SkipLink;
