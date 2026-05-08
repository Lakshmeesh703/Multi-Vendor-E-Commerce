// ========================================
// 📁 ecommerce/frontend/src/pages/admin/Dashboard.jsx
// ========================================

import React from 'react';
import { motion } from 'framer-motion';
import AdminLayout from '../../components/admin/Layout/AdminLayout';
import StatsCard from '../../components/admin/Cards/StatsCard';
import DataTable from '../../components/admin/Tables/DataTable';
import { MOCK_STATS, MOCK_RECENT_ORDERS, MOCK_TOP_VENDORS } from '../../utils/constants';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Mock Chart Data
const revenueData = [
  { date: 'Mon', revenue: 4000 },
  { date: 'Tue', revenue: 3000 },
  { date: 'Wed', revenue: 5000 },
  { date: 'Thu', revenue: 4500 },
  { date: 'Fri', revenue: 6000 },
  { date: 'Sat', revenue: 5500 },
  { date: 'Sun', revenue: 7000 },
];

export default function Dashboard() {
  const orderColumns = [
    { key: 'id', label: 'Order ID', sortable: true },
    { key: 'customer', label: 'Customer', sortable: true },
    { key: 'vendor', label: 'Vendor', sortable: true },
    { key: 'amount', label: 'Amount', sortable: true },
    { key: 'status', label: 'Status', type: 'status' },
    { key: 'date', label: 'Date', sortable: true },
  ];

  const vendorColumns = [
    { key: 'rank', label: 'Rank' },
    { key: 'name', label: 'Vendor Name', sortable: true },
    { key: 'revenue', label: 'Revenue', sortable: true },
    { key: 'orders', label: 'Orders', sortable: true },
    { key: 'growth', label: 'Growth', sortable: true },
  ];

  const handleRowClick = (row) => {
    console.log('Row clicked:', row);
  };

  return (
    <AdminLayout>
      <div className=\"space-y-8\">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <h1 className=\"text-4xl font-bold text-gray-900\">Dashboard</h1>
          <p className=\"text-gray-600 mt-2\">Welcome back! Here's what's happening with your marketplace today.</p>
        </motion.div>

        {/* Stats Cards Grid */}
        <div className=\"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6\">
          {MOCK_STATS.map((stat, idx) => (
            <motion.div
              key={stat.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.1 }}
            >
              <StatsCard
                label={stat.label}
                value={stat.value}
                trend={stat.trend}
                isPositive={stat.isPositive}
                icon={stat.icon}
                color={stat.color}
                sparklineData={[12, 19, 3, 5, 2, 3, stat.isPositive ? 8 : 2]}
              />
            </motion.div>
          ))}
        </div>

        {/* Charts Section */}
        <div className=\"grid grid-cols-1 lg:grid-cols-3 gap-6\">
          {/* Revenue Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className=\"lg:col-span-2 bg-white/70 backdrop-blur-xl rounded-2xl p-6 border border-white/20 shadow-lg\"
          >
            <h3 className=\"text-lg font-bold text-gray-900 mb-4\">Revenue Trend</h3>
            <ResponsiveContainer width=\"100%\" height={300}>
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray=\"3 3\" stroke=\"#E5E7EB\" />
                <XAxis dataKey=\"date\" stroke=\"#9CA3AF\" />
                <YAxis stroke=\"#9CA3AF\" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                  }}
                />
                <Line
                  type=\"monotone\"
                  dataKey=\"revenue\"
                  stroke=\"#6366F1\"
                  strokeWidth={3}
                  dot={{ fill: '#6366F1', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Summary Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
            className=\"bg-gradient-to-br from-[#6366F1]/10 to-[#EC4899]/10 rounded-2xl p-6 border border-white/20 backdrop-blur-xl\"
          >
            <h3 className=\"text-lg font-bold text-gray-900 mb-4\">Quick Stats</h3>
            <div className=\"space-y-3\">
              <div className=\"flex justify-between items-center\">
                <span className=\"text-gray-600\">Total Transactions</span>
                <span className=\"text-xl font-bold text-[#6366F1]\">2,456</span>
              </div>
              <div className=\"w-full h-1 bg-gray-200 rounded-full overflow-hidden\">
                <div className=\"w-3/4 h-full bg-gradient-to-r from-[#6366F1] to-[#EC4899]\" />
              </div>
              <div className=\"flex justify-between items-center pt-4 border-t border-white/20\">
                <span className=\"text-gray-600\">Pending Approvals</span>
                <span className=\"text-xl font-bold text-[#F59E0B]\">12</span>
              </div>
              <div className=\"flex justify-between items-center\">
                <span className=\"text-gray-600\">Active Users</span>
                <span className=\"text-xl font-bold text-[#22C55E]\">1,234</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Tables Section */}
        <div className=\"grid grid-cols-1 lg:grid-cols-3 gap-6\">
          {/* Recent Orders */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.4 }}
            className=\"lg:col-span-2\"
          >
            <DataTable
              title=\"Recent Orders\"
              columns={orderColumns}
              data={MOCK_RECENT_ORDERS}
              searchPlaceholder=\"Search by order ID or customer...\"
              onRowClick={handleRowClick}
              actions={[
                {
                  label: 'View',
                  className: 'bg-blue-50 text-blue-600 hover:bg-blue-100',
                  onClick: (row) => console.log('View', row),
                },
                {
                  label: 'Edit',
                  className: 'bg-purple-50 text-purple-600 hover:bg-purple-100',
                  onClick: (row) => console.log('Edit', row),
                },
              ]}
            />
          </motion.div>

          {/* Top Vendors */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.5 }}
            className=\"bg-white/70 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg p-6\"
          >
            <h3 className=\"text-lg font-bold text-gray-900 mb-4\">Top Vendors</h3>
            <div className=\"space-y-4\">
              {MOCK_TOP_VENDORS.map((vendor, idx) => (
                <motion.div
                  key={vendor.rank}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.5 + idx * 0.1 }}
                  className=\"flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer\"
                >
                  <div className=\"w-10 h-10 rounded-lg bg-gradient-to-br from-[#6366F1] to-[#EC4899] flex items-center justify-center text-white font-bold text-sm\">
                    {vendor.rank}
                  </div>
                  <div className=\"flex-1 min-w-0\">
                    <p className=\"text-sm font-semibold text-gray-900 truncate\">{vendor.name}</p>
                    <p className=\"text-xs text-gray-500\">{vendor.revenue}</p>
                  </div>
                  <div className=\"text-right\">
                    <p className=\"text-sm font-semibold text-gray-900\">{vendor.orders}</p>
                    <p className=\"text-xs text-green-600 font-medium\">{vendor.growth}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </AdminLayout>
  );
}
