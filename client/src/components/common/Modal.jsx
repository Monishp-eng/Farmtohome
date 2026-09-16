import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

const Modal = ({ isOpen, onClose, title, children, size = 'md' }) => {
  const modalRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
      // Focus the modal when opened
      setTimeout(() => {
        if (modalRef.current) {
          const focusable = modalRef.current.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
          if (focusable.length > 0) {
            focusable[0].focus();
          }
        }
      }, 50);
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-6xl'
  };

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs transition-opacity" 
          aria-hidden="true"
          onClick={onClose}
        />

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        {/* Modal Window */}
        <div 
          ref={modalRef}
          className={`
            inline-block align-bottom bg-white dark:bg-slate-900 rounded-3xl text-left overflow-hidden 
            shadow-2xl border border-gray-100 dark:border-slate-800 transform transition-all 
            sm:my-8 sm:align-middle sm:w-full animate-slide-up ${sizes[size] || sizes.md}
          `}
        >
          <div className="px-5 pt-5 pb-4 sm:p-6">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-100 dark:border-slate-800">
              <h3 className="text-lg font-black text-gray-900 dark:text-gray-100" id="modal-title">
                {title}
              </h3>
              <button 
                type="button" 
                aria-label="Close modal"
                className="p-1.5 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                onClick={onClose}
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>
            <div className="mt-2 text-gray-800 dark:text-gray-200">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Modal;

