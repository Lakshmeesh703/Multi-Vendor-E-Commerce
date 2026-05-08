// ========================================
// 📁 ecommerce/frontend/src/components/admin/Cards/StatsCard.jsx
// ========================================

import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { COLORS } from '../../../utils/constants';

const IconComponents = {
  TrendingUp: () => <TrendingUp size={24} />,
  ShoppingCart: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
  Users: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-2a6 6 0 0112 0v2zm0 0h6v-2a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>,
  Store: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>,
};

// Mini Sparkline Chart
const Sparkline = ({ data, color = 'primary' }) => {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min;

  const points = data.map((val, idx) => {
    const x = (idx / (data.length - 1)) * 100;
    const y = 100 - ((val - min) / range) * 100;
    return `${x},${y}`;
  });

  const colorMap = {
    primary: '#6366F1',
    secondary: '#8B5CF6',
    accent: '#EC4899',
    success: '#22C55E',
    warning: '#F59E0B',
  };

  return (
    <svg width="100%" height="30" viewBox="0 0 100 30" className="mt-2">
      <polyline
        fill="none"
        stroke={colorMap[color]}
        strokeWidth="1.5"
        points={points.join(' ')}
      />
    </svg>
  );
};

export default function StatsCard({
  label,
  value,
  trend,
  isPositive = true,
  icon = 'TrendingUp',
  color = 'primary',
  sparklineData = [12, 19, 3, 5, 2, 3, 8],
}) {
  const colorMap = {
    primary: { bg: 'from-[#6366F1]', light: 'bg-blue-50', text: 'text-[#6366F1]' },
    secondary: { bg: 'from-[#8B5CF6]', light: 'bg-purple-50', text: 'text-[#8B5CF6]' },
    accent: { bg: 'from-[#EC4899]', light: 'bg-pink-50', text: 'text-[#EC4899]' },
    success: { bg: 'from-[#22C55E]', light: 'bg-green-50', text: 'text-[#22C55E]' },
    warning: { bg: 'from-[#F59E0B]', light: 'bg-amber-50', text: 'text-[#F59E0B]' },
  };

  const colors = colorMap[color];
  const Icon = IconComponents[icon];

  return (
    <motion.div
      whileHover={{ y: -4, boxShadow: '0 20px 40px rgba(99, 102, 241, 0.2)' }}
      transition={{ duration: 0.3 }}
      className="bg-gradient-to-br from-white/95 to-white/50 backdrop-blur-xl rounded-2xl p-6 border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden relative group"
    >
      {/* Gradient Background Blob */}
      <div className="absolute -right-8 -top-8 w-32 h-32 bg-gradient-to-br from-[#6366F1]/10 to-[#EC4899]/10 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-300" />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-600">{label}</h3>
          <div className={`${colors.light} p-3 rounded-xl`}>
            <div className={colors.text}>
              <Icon />
            </div>
          </div>
        </div>

        {/* Value */}
        <div className="mb-4">
          <p className="text-3xl font-bold text-gray-900">{value}</p>
        </div>

        {/* Trend */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1">
            {isPositive ? (
              <>
                <TrendingUp size={16} className="text-green-500" />
                <span className="text-sm font-medium text-green-600">{trend}</span>
              </>
            ) : (
              <>
                <TrendingDown size={16} className="text-red-500" />
                <span className="text-sm font-medium text-red-600">{trend}</span>
              </>
            )}
          </div>
          <span className="text-xs text-gray-500">vs last month</span>
        </div>

        {/* Sparkline */}
        <Sparkline data={sparklineData} color={color} />
      </div>
    </motion.div>
  );
}
