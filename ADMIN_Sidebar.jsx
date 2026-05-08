// ========================================
// 📁 ecommerce/frontend/src/components/admin/Layout/Sidebar.jsx
// ========================================

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, ShoppingCart, Store, Users, Package,
  BarChart3, CreditCard, Settings, ChevronRight, LogOut
} from 'lucide-react';
import { SIDEBAR_ITEMS } from '../../../utils/constants';

const ICON_MAP = {
  LayoutDashboard, ShoppingCart, Store, Users, Package,
  BarChart3, CreditCard, Settings,
};

export default function Sidebar({ isOpen, setIsOpen, isMobile = false }) {
  const location = useLocation();

  return (
    <motion.div
      initial={false}
      animate={{ width: isOpen ? 256 : 80 }}
      transition={{ duration: 0.3, type: 'spring', stiffness: 300 }}
      className="h-full bg-gradient-to-b from-[#0F172A] to-[#1A1F3A] backdrop-blur-xl border-r border-white/10 flex flex-col overflow-hidden shadow-2xl"
    >
      {/* Logo Section */}
      <div className="h-20 flex items-center justify-between px-6 border-b border-white/10">
        <motion.div
          animate={{ opacity: isOpen ? 1 : 0, width: isOpen ? 'auto' : 0 }}
          transition={{ duration: 0.3 }}
          className="overflow-hidden"
        >
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#6366F1] to-[#EC4899] flex items-center justify-center">
              <span className="text-white font-bold">V</span>
            </div>
            <div className="hidden group-hover:block">
              <p className="text-white font-bold text-sm">VendorHub</p>
              <p className="text-gray-400 text-xs">Admin</p>
            </div>
          </div>
        </motion.div>

        {!isMobile && (
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-1 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ChevronRight
              size={18}
              className={`text-white/60 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
            />
          </button>
        )}
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-2">
        {SIDEBAR_ITEMS.map((item) => {
          const Icon = ICON_MAP[item.icon];
          const isActive = location.pathname === item.path;

          return (
            <Link
              key={item.id}
              to={item.path}
              className="relative group"
            >
              <motion.div
                animate={{
                  backgroundColor: isActive
                    ? 'rgba(99, 102, 241, 0.1)'
                    : 'transparent',
                }}
                whileHover={{ backgroundColor: 'rgba(99, 102, 241, 0.05)' }}
                className="px-4 py-3 rounded-xl flex items-center gap-3 transition-all duration-300 relative overflow-hidden"
              >
                {/* Animated gradient background for active */}
                {isActive && (
                  <motion.div
                    layoutId="activeBackground"
                    className="absolute inset-0 bg-gradient-to-r from-[#6366F1]/20 to-[#EC4899]/20"
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}

                {/* Glow effect on hover */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl blur-lg bg-gradient-to-r from-[#6366F1] to-[#EC4899]" />

                {/* Content */}
                <div className="relative flex items-center gap-3 w-full">
                  <motion.div
                    animate={{
                      scale: isActive ? 1.1 : 1,
                      color: isActive ? '#6366F1' : '#94A3B8',
                    }}
                  >
                    <Icon size={20} />
                  </motion.div>

                  <motion.div
                    animate={{ opacity: isOpen ? 1 : 0, width: isOpen ? 'auto' : 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden flex-1"
                  >
                    <p className={`text-sm font-medium transition-colors ${
                      isActive ? 'text-[#6366F1]' : 'text-gray-300 group-hover:text-white'
                    }`}>
                      {item.label}
                    </p>
                  </motion.div>

                  {/* Badge */}
                  {item.badge && isOpen && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="px-2 py-1 bg-[#EC4899] text-white text-xs font-bold rounded-full"
                    >
                      {item.badge}
                    </motion.span>
                  )}
                </div>
              </motion.div>
            </Link>
          );
        })}
      </nav>

      {/* Bottom Section - Admin Profile */}
      <div className="border-t border-white/10 p-4 space-y-4">
        {/* Theme & Notifications Quick Access */}
        <div className="grid grid-cols-2 gap-2">
          <button className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors flex items-center justify-center text-gray-400 hover:text-white">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1m-16 0H1m15.364 1.636l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </button>
          <button className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors flex items-center justify-center text-gray-400 hover:text-white">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </button>
        </div>

        {/* Admin Profile Card */}
        <motion.div
          whileHover={{ y: -2 }}
          className="p-3 rounded-lg bg-gradient-to-br from-[#6366F1]/20 to-[#EC4899]/20 border border-white/10 hover:border-white/20 transition-all cursor-pointer"
        >
          {isOpen && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#6366F1] to-[#EC4899] flex items-center justify-center text-white font-bold flex-shrink-0">
                A
              </div>
              <div className="min-w-0">
                <p className="text-white text-sm font-medium truncate">Admin User</p>
                <p className="text-gray-400 text-xs truncate">admin@vendorhub.com</p>
              </div>
            </div>
          )}
        </motion.div>

        {/* Logout Button */}
        <button className="w-full px-4 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors flex items-center justify-center gap-2 text-sm font-medium">
          <LogOut size={16} />
          {isOpen && <span>Logout</span>}
        </button>
      </div>
    </motion.div>
  );
}
