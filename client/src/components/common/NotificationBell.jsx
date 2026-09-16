import React, { useRef, useEffect } from 'react';
import { Bell, Check, Trash2, ExternalLink } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';

const NotificationBell = () => {
  const { notifications, unreadCount, isOpen, setIsOpen, markAsRead, markAllAsRead, clearAll } = useNotifications();
  const dropdownRef = useRef(null);

  // Close dropdown on outside click or Escape
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, setIsOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        aria-label={`Notifications, ${unreadCount} unread`}
        aria-haspopup="true"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full text-white/90 hover:text-amber-300 hover:bg-white/10 transition-colors cursor-pointer"
      >
        <Bell size={20} aria-hidden="true" />
        {unreadCount > 0 && (
          <span 
            className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-[10px] font-black text-slate-950 shadow-sm animate-pulse"
            aria-live="polite"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          role="region"
          aria-label="Notification center"
          className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-slate-800 py-3 z-50 text-gray-900 dark:text-gray-100 animate-slide-up"
        >
          <div className="px-4 pb-2.5 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-black text-sm">Notifications</span>
              {unreadCount > 0 && (
                <span className="bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="text-[11px] text-primary dark:text-emerald-400 hover:underline font-bold cursor-pointer"
                >
                  Mark all read
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={clearAll}
                  aria-label="Clear all notifications"
                  className="text-gray-400 hover:text-red-500 transition-colors p-1"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-gray-100 dark:divide-slate-800/60">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-400 dark:text-gray-500">
                No notifications right now
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => markAsRead(n.id)}
                  className={`p-3.5 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer flex gap-3 items-start ${
                    !n.read ? 'bg-emerald-50/40 dark:bg-emerald-950/20' : ''
                  }`}
                >
                  <div className="w-2 h-2 rounded-full mt-1.5 shrink-0 bg-primary" style={{ opacity: n.read ? 0 : 1 }} />
                  <div className="flex-1 text-left">
                    <div className="flex justify-between items-start gap-1">
                      <p className="text-xs font-bold text-gray-900 dark:text-gray-100">
                        {n.title}
                      </p>
                      <span className="text-[10px] text-gray-400 whitespace-nowrap">
                        {n.time}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">
                      {n.body}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="px-4 pt-2 border-t border-gray-100 dark:border-slate-800 text-center">
            <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">
              🔔 Real-Time Kisan Network Alerts Active
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
