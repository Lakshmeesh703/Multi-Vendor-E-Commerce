// ========================================
// 📁 ecommerce/frontend/src/components/admin/Layout/TopNav.jsx
// ========================================

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Menu, X, Moon, Sun, Bell, User, LogOut } from 'lucide-react';

export default function TopNav({ onMenuClick, mobileMenuOpen }) {
  const [isDark, setIsDark] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const notifications = [
    { id: 1, title: 'New vendor approval', message: 'ElectroMart awaiting approval', time: '2m ago', read: false },
    { id: 2, title: 'Order shipped', message: 'Order #ORD-2089 shipped to Rahul Kumar', time: '1h ago', read: false },
    { id: 3, title: 'Payment received', message: '₹45,000 received from Fashion Hub', time: '3h ago', read: true },
  ];

  return (
    <div className="sticky top-0 z-20 bg-white/70 backdrop-blur-xl border-b border-gray-200 shadow-sm">
      <div className="h-20 px-4 md:px-6 lg:px-8 flex items-center justify-between">
        {/* Left Section */}
        <div className="flex items-center gap-4">
          {/* Mobile Menu Button */}
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          {/* Search Bar */}
          <div className="hidden sm:flex items-center gap-3 px-4 py-2 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors flex-1 max-w-sm">
            <Search size={18} className="text-gray-400" />
            <input
              type="text"
              placeholder="Search orders, vendors, users..."
              className="bg-transparent outline-none text-sm text-gray-700 placeholder:text-gray-400 flex-1"
            />
            <kbd className="hidden md:inline px-2 py-1 text-xs font-medium bg-white border border-gray-300 rounded text-gray-600">
              ⌘K
            </kbd>
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2 md:gap-4">
          {/* Theme Toggle */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsDark(!isDark)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors relative"
          >
            <motion.div
              initial={false}
              animate={{ rotate: isDark ? 180 : 0 }}
              transition={{ duration: 0.3 }}
            >
              {isDark ? <Sun size={20} /> : <Moon size={20} />}
            </motion.div>
          </motion.button>

          {/* Notifications */}
          <div className="relative">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors relative"
            >
              <Bell size={20} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </motion.button>

            {/* Notifications Dropdown */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: showNotifications ? 1 : 0, y: showNotifications ? 0 : -10 }}
              transition={{ duration: 0.2 }}
              className={`absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden ${
                showNotifications ? 'block' : 'hidden pointer-events-none'
              }`}
            >
              <div className="p-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900">Notifications</h3>
              </div>

              <div className="max-h-96 overflow-y-auto">
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`px-4 py-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors last:border-0 ${
                      !notif.read ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex gap-3">
                      <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                        !notif.read ? 'bg-blue-500' : 'bg-gray-300'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{notif.title}</p>
                        <p className="text-sm text-gray-600 mt-0.5">{notif.message}</p>
                        <p className="text-xs text-gray-400 mt-1">{notif.time}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 text-center">
                <button className="text-sm font-medium text-blue-600 hover:text-blue-700">
                  View all notifications
                </button>
              </div>
            </motion.div>
          </div>

          {/* Profile Menu */}
          <div className="relative">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowProfile(!showProfile)}
              className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#6366F1] to-[#EC4899] flex items-center justify-center text-white text-sm font-bold">
                A
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium text-gray-900">Admin</p>
                <p className="text-xs text-gray-500">admin@vendorhub.com</p>
              </div>
            </motion.button>

            {/* Profile Dropdown */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: showProfile ? 1 : 0, y: showProfile ? 0 : -10 }}
              transition={{ duration: 0.2 }}
              className={`absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden ${
                showProfile ? 'block' : 'hidden pointer-events-none'
              }`}
            >
              <div className="p-4 border-b border-gray-100 space-y-1">
                <p className="text-sm font-medium text-gray-900">Admin User</p>
                <p className="text-xs text-gray-500">admin@vendorhub.com</p>
              </div>

              <div className="p-2 space-y-1">
                <button className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors flex items-center gap-2">
                  <User size={16} />
                  Profile Settings
                </button>
                <button className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 rounded transition-colors flex items-center gap-2">
                  <LogOut size={16} />
                  Logout
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
